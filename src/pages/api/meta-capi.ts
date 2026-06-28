import type { APIRoute } from 'astro'
import { sendMetaEvents, extractRequestContext } from '~/lib/meta-capi'

// Relais client -> Meta Conversions API. La logique vit dans src/lib/meta-capi.ts
// (reutilisee par les endpoints serveur form/webhook). Dedup via event_id partage.

export const prerender = false

export const POST: APIRoute = async ({ request, locals }) => {
  const env = (locals as any).runtime?.env
  if (!env?.META_CAPI_TOKEN) {
    return new Response(JSON.stringify({ error: 'META_CAPI_TOKEN not configured' }), { status: 500 })
  }

  let body: { events: any[]; fbp?: string; fbc?: string }
  try {
    body = await request.json()
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400 })
  }
  if (!body.events?.length) {
    return new Response(JSON.stringify({ error: 'No events provided' }), { status: 400 })
  }

  const ctx = extractRequestContext(request, env)
  ctx.fbp = body.fbp
  ctx.fbc = body.fbc

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
