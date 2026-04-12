import type { APIRoute } from 'astro'

/**
 * POST /api/kit/webhook/
 *
 * Recoit les webhooks Kit (ex-ConvertKit) :
 * - subscriber.form_subscribe (form 8987350 = inscription newsletter/webinar)
 * - subscriber.subscriber_activate
 * - subscriber.tag_add (quand un tag est applique)
 *
 * Stocke dans D1 tunnel_events pour le dashboard.
 *
 * Configuration dans Kit :
 *   Automations > Rules > Webhook URL : https://laom.fr/api/kit/webhook/
 *   Event : subscriber.form_subscribe, form_id: 8987350
 *
 * Payload Kit webhook (POST JSON) :
 * {
 *   "subscriber": {
 *     "id": 123,
 *     "first_name": "...",
 *     "email_address": "...",
 *     "state": "active",
 *     "created_at": "...",
 *     "fields": {...}
 *   }
 * }
 */

export const POST: APIRoute = async ({ request, locals }) => {
  const env = (locals as any).runtime?.env
  const db = env?.DB

  if (!db) {
    console.error('kit/webhook: DB not configured')
    return new Response('OK', { status: 200 }) // Always return 200 to Kit
  }

  let body: Record<string, any>
  try {
    body = await request.json()
  } catch {
    console.error('kit/webhook: invalid JSON')
    return new Response('OK', { status: 200 })
  }

  const subscriber = body.subscriber
  if (!subscriber) {
    console.error('kit/webhook: no subscriber in payload')
    return new Response('OK', { status: 200 })
  }

  const email = subscriber.email_address
  const firstName = subscriber.first_name || null

  // Determiner le type d'evenement
  // Kit n'envoie pas le type d'event dans le body -- on le deduit du contexte
  // Pour l'instant on log tout comme "kit_subscribed" et on raffine plus tard
  // quand on aura configure des webhooks separes par event type
  const eventType = 'kit_subscribed'

  console.log(`kit/webhook: ${eventType} — ${email}`)

  try {
    await db
      .prepare(
        `INSERT INTO tunnel_events (event_type, page, source, session_id, email, meta, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        eventType,
        '/talk/', // Default -- les inscriptions viennent du form /talk/
        'kit',
        `kit_${subscriber.id}`, // Pas de session_id cote serveur, on utilise l'ID Kit
        email,
        JSON.stringify({ first_name: firstName, kit_id: subscriber.id }),
        new Date().toISOString(),
      )
      .run()
  } catch (err) {
    console.error('kit/webhook D1 error (non-blocking):', err)
  }

  // Kit attend toujours un 200
  return new Response('OK', { status: 200 })
}
