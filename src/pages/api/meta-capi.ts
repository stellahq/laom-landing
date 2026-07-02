import type { APIRoute } from 'astro'
import { sendMetaEvents, extractRequestContext } from '~/lib/meta-capi'
import { checkRateLimit, clientIp, tooManyRequests } from '~/lib/rate-limit'

// Relais client -> Meta Conversions API. La logique vit dans src/lib/meta-capi.ts
// (reutilisee par les endpoints serveur form/webhook). Dedup via event_id partage.
// VERROUILLE (audit 2/07/2026) : liste blanche d'evenements, origine laom.fr
// obligatoire, 10 evenements max, rate limit — sinon n'importe qui pouvait
// injecter des fausses conversions dans le dataset de campagne.

export const prerender = false

// Seuls les evenements que le site emet reellement cote client.
const ALLOWED_EVENTS = new Set(['PageView', 'Lead', 'QuizLead', 'ViewContent', 'Contact'])

export const POST: APIRoute = async ({ request, locals }) => {
  const env = (locals as any).runtime?.env
  if (!env?.META_CAPI_TOKEN) {
    return new Response(JSON.stringify({ error: 'META_CAPI_TOKEN not configured' }), { status: 500 })
  }

  // Origine : uniquement le site lui-meme (fetch/sendBeacon envoient Origin).
  const origin = request.headers.get('origin') || ''
  const allowedOrigins = ['https://laom.fr', 'https://staging.laom.fr', 'http://localhost:3000', 'http://localhost:3001']
  if (!allowedOrigins.includes(origin)) {
    return new Response(JSON.stringify({ error: 'Origin non autorisée' }), { status: 403 })
  }

  // Rate limit : 60 evenements relayes / heure / IP.
  if (!(await checkRateLimit(env?.TRACKING_DB, `capi:${clientIp(request)}`, 60, 3600))) {
    return tooManyRequests()
  }

  let body: { events: any[]; fbp?: string; fbc?: string }
  try {
    body = await request.json()
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400 })
  }
  if (!Array.isArray(body.events) || !body.events.length || body.events.length > 10) {
    return new Response(JSON.stringify({ error: 'events invalide (1 à 10)' }), { status: 400 })
  }
  for (const evt of body.events) {
    if (!ALLOWED_EVENTS.has(String(evt?.event_name))) {
      return new Response(JSON.stringify({ error: `event_name non autorisé: ${String(evt?.event_name).slice(0, 40)}` }), { status: 400 })
    }
  }

  const ctx = extractRequestContext(request, env)
  ctx.fbp = typeof body.fbp === 'string' ? body.fbp.slice(0, 128) : undefined
  ctx.fbc = typeof body.fbc === 'string' ? body.fbc.slice(0, 256) : undefined

  const { ok, result } = await sendMetaEvents(body.events, ctx)
  if (!ok) {
    return new Response(JSON.stringify({ error: 'Meta API error', details: result }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    })
  }
  return new Response(
    JSON.stringify({ success: true, events_received: result.events_received, fbtrace_id: result.fbtrace_id }),
    { headers: { 'Content-Type': 'application/json' } },
  )
}
