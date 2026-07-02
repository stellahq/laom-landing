import type { APIRoute } from 'astro'
import { sendMetaEvents } from '~/lib/meta-capi'

// POST /api/admin/lead-status { id, status }
// Met a jour le statut d'un lead (lead -> call -> match -> paid / no_show / lost)
// ET renvoie l'etape a Meta (CAPI) : l'algo apprend la QUALITE des leads (qui va
// au call, qui matche, qui paie, qui no-show) — pas juste le remplissage du form.
// Auth assuree par le middleware (cookie de session signe).

export const prerender = false

const ALLOWED = ['lead', 'call_booked', 'call_done', 'no_show', 'match', 'paid', 'lost']

// Statut -> evenement custom envoye au dataset Meta ('lead' = retour arriere, pas d'event).
const STAGE_EVENTS: Record<string, string> = {
  call_booked: 'CallBooked',
  call_done: 'CallDone',
  no_show: 'NoShow',
  match: 'Match',
  paid: 'Paid',
  lost: 'Disqualified',
}

export const POST: APIRoute = async ({ request, locals }) => {
  const env = (locals as any).runtime?.env
  const tdb = env?.TRACKING_DB
  if (!tdb) {
    return new Response(JSON.stringify({ error: 'TRACKING_DB not configured' }), { status: 500 })
  }

  let body: { id?: number | string; status?: string }
  try {
    body = await request.json()
  } catch {
    return new Response(JSON.stringify({ error: 'Requête invalide' }), { status: 400 })
  }

  const id = Number(body.id)
  const status = String(body.status || '')
  if (!id || !ALLOWED.includes(status)) {
    return new Response(JSON.stringify({ error: 'id ou statut invalide' }), { status: 400 })
  }

  try {
    const res = await tdb.prepare("UPDATE leads SET status = ?, updated_at = datetime('now') WHERE id = ?")
      .bind(status, id).run()
    if (!res?.meta?.changes) {
      return new Response(JSON.stringify({ error: 'Lead introuvable' }), { status: 404 })
    }
  } catch (e) {
    console.error('[lead-status] error:', e)
    return new Response(JSON.stringify({ error: 'Update failed' }), { status: 500 })
  }

  // Feedback qualite vers Meta. Non bloquant : le statut est deja sauve.
  let capi: boolean | null = null
  const eventName = STAGE_EVENTS[status]
  if (eventName) {
    try {
      const lead = await tdb.prepare(
        `SELECT l.email, l.phone, l.first_name, l.visitor_id, va.fbc, va.user_agent
         FROM leads l LEFT JOIN visitor_attribution va ON va.visitor_id = l.visitor_id
         WHERE l.id = ?`,
      ).bind(id).first() as { email: string; phone: string | null; first_name: string | null; visitor_id: string | null; fbc: string | null; user_agent: string | null } | null
      if (lead?.email) {
        const res = await sendMetaEvents(
          [{
            event_name: eventName,
            // Idempotent : re-cliquer le meme statut ne cree pas de doublon cote Meta.
            event_id: `lead-${id}-${status}`,
            event_source_url: 'https://laom.fr/coliving-aout/',
            custom_data: { content_category: 'coliving_lead_stage', content_name: status },
            user_data: {
              em: lead.email,
              ph: lead.phone || undefined,
              fn: lead.first_name || undefined,
              external_id: lead.visitor_id || lead.email,
            },
          }],
          // Pas d'IP admin (mauvais signal), mais le user-agent D'ORIGINE du lead
          // (stocké dans visitor_attribution) : requis par Meta pour action_source
          // website, et c'est bien celui du navigateur qui a converti.
          {
            accessToken: env?.META_CAPI_TOKEN || '',
            fbc: lead.fbc || undefined,
            userAgent: lead.user_agent || undefined,
          },
        )
        capi = res.ok
        if (!res.ok) console.error('[lead-status] CAPI stage error:', JSON.stringify(res.result))
      }
    } catch (e) {
      console.error('[lead-status] CAPI error (non-blocking):', e)
      capi = false
    }
  }

  return new Response(JSON.stringify({ ok: true, capi }), {
    status: 200, headers: { 'Content-Type': 'application/json' },
  })
}
