import type { APIRoute } from 'astro'
import { createHash, randomUUID } from 'node:crypto'

// Meta Conversions API endpoint
// Receives events from the client-side pixel helper and forwards them server-side
// This gives better match rates and survives adblockers

const PIXEL_ID = '1274109067570116'
const API_VERSION = 'v25.0'

// Access token is injected via Cloudflare Worker secret (META_CAPI_TOKEN)
// Fallback: hardcoded for initial deploy, then migrate to secrets

function sha256(value: string): string {
  return createHash('sha256').update(value.trim().toLowerCase()).digest('hex')
}

interface CAPIEvent {
  event_name: string
  event_time: number
  event_id: string
  event_source_url: string
  action_source: 'website'
  user_data: {
    client_ip_address?: string
    client_user_agent?: string
    fbc?: string
    fbp?: string
    em?: string[]
    ph?: string[]
    fn?: string[]
    ln?: string[]
    external_id?: string[]
  }
  custom_data?: Record<string, unknown>
}

export const POST: APIRoute = async ({ request, locals }) => {
  const runtime = (locals as any).runtime?.env
  const accessToken = runtime?.META_CAPI_TOKEN
  if (!accessToken) {
    return new Response(JSON.stringify({ error: 'META_CAPI_TOKEN not configured' }), { status: 500 })
  }

  let body: {
    events: Array<{
      event_name: string
      event_id?: string
      event_source_url?: string
      custom_data?: Record<string, unknown>
      user_data?: {
        em?: string
        ph?: string
        fn?: string
        ln?: string
        external_id?: string
      }
    }>
    fbp?: string
    fbc?: string
  }

  try {
    body = await request.json()
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400 })
  }

  if (!body.events?.length) {
    return new Response(JSON.stringify({ error: 'No events provided' }), { status: 400 })
  }

  const clientIP = request.headers.get('cf-connecting-ip')
    || request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || ''
  const userAgent = request.headers.get('user-agent') || ''

  const capiEvents: CAPIEvent[] = body.events.map((evt) => {
    const eventId = evt.event_id || randomUUID()
    const userData: CAPIEvent['user_data'] = {
      client_ip_address: clientIP,
      client_user_agent: userAgent,
    }

    // Pass cookie identifiers for deduplication with browser pixel
    if (body.fbp) userData.fbp = body.fbp
    if (body.fbc) userData.fbc = body.fbc

    // Hash PII if provided (CAPI requires SHA-256 hashed values)
    if (evt.user_data?.em) userData.em = [sha256(evt.user_data.em)]
    if (evt.user_data?.ph) userData.ph = [sha256(evt.user_data.ph)]
    if (evt.user_data?.fn) userData.fn = [sha256(evt.user_data.fn)]
    if (evt.user_data?.ln) userData.ln = [sha256(evt.user_data.ln)]
    if (evt.user_data?.external_id) userData.external_id = [sha256(evt.user_data.external_id)]

    return {
      event_name: evt.event_name,
      event_time: Math.floor(Date.now() / 1000),
      event_id: eventId,
      event_source_url: evt.event_source_url || request.headers.get('referer') || 'https://laom.fr',
      action_source: 'website' as const,
      user_data: userData,
      ...(evt.custom_data ? { custom_data: evt.custom_data } : {}),
    }
  })

  // Send to Meta Conversions API
  try {
    const response = await fetch(
      `https://graph.facebook.com/${API_VERSION}/${PIXEL_ID}/events`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data: capiEvents,
          access_token: accessToken,
        }),
      }
    )

    const result = await response.json() as { events_received?: number; fbtrace_id?: string }

    if (!response.ok) {
      console.error('[CAPI] Meta API error:', JSON.stringify(result))
      return new Response(JSON.stringify({ error: 'Meta API error', details: result }), {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({
      success: true,
      events_received: result.events_received,
      fbtrace_id: result.fbtrace_id,
    }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('[CAPI] Fetch error:', err)
    return new Response(JSON.stringify({ error: 'Failed to send to Meta' }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
