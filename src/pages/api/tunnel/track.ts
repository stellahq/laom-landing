import type { APIRoute } from 'astro'

/**
 * POST /api/tunnel/track/
 *
 * Collecte les evenements du tunnel cote client.
 * Stocke dans D1 tunnel_events.
 * Pas de dependance Meta/GA4 -- tracking maison first-party.
 *
 * Body JSON :
 *   - event_type: string (page_view, form_submit, vsl_start, vsl_25, vsl_50, vsl_75, vsl_complete, cta_click, exit_intent_shown, exit_intent_clicked, timer_expired, checkout_initiated, telegram_click, scroll_depth)
 *   - page: string (/talk/, /school/merci/, etc.)
 *   - session_id: string (identifiant anonyme genere cote client)
 *   - source?: string (utm_source)
 *   - medium?: string (utm_medium)
 *   - campaign?: string (utm_campaign)
 *   - email?: string (si disponible)
 *   - product?: string (school-merci, school-online, etc.)
 *   - meta?: object (donnees supplementaires libres)
 *   - referrer?: string
 */

const VALID_EVENTS = new Set([
  'page_view',
  'form_submit',
  'vsl_start',
  'vsl_25',
  'vsl_50',
  'vsl_75',
  'vsl_complete',
  'cta_click',
  'exit_intent_shown',
  'exit_intent_clicked',
  'timer_expired',
  'checkout_initiated',
  'telegram_click',
  'scroll_depth',
])

export const POST: APIRoute = async ({ request, locals }) => {
  const env = (locals as any).runtime?.env
  const db = env?.DB

  if (!db) {
    return new Response('DB not configured', { status: 500 })
  }

  let body: Record<string, any>
  try {
    body = await request.json()
  } catch {
    return new Response('Invalid JSON', { status: 400 })
  }

  const { event_type, page, session_id, source, medium, campaign, email, product, meta, referrer } = body

  if (!event_type || !page || !session_id) {
    return new Response('Missing required fields: event_type, page, session_id', { status: 400 })
  }

  if (!VALID_EVENTS.has(event_type)) {
    return new Response(`Invalid event_type: ${event_type}`, { status: 400 })
  }

  // Tronquer le user-agent pour economiser de l'espace
  const userAgent = request.headers.get('user-agent')?.slice(0, 200) || null

  try {
    await db
      .prepare(
        `INSERT INTO tunnel_events (event_type, page, source, medium, campaign, session_id, email, product, amount, meta, referrer, user_agent, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        event_type,
        page,
        source || null,
        medium || null,
        campaign || null,
        session_id,
        email || null,
        product || null,
        null, // amount -- set by server-side events (Mollie)
        meta ? JSON.stringify(meta) : null,
        referrer || null,
        userAgent,
        new Date().toISOString(),
      )
      .run()

    return new Response('OK', { status: 200 })
  } catch (err) {
    console.error('tunnel/track D1 error:', err)
    return new Response('Storage error', { status: 500 })
  }
}
