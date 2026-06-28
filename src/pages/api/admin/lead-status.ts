import type { APIRoute } from 'astro'

// POST /api/admin/lead-status { id, status }
// Met a jour le statut d'un lead (suivi lead -> call -> match -> paid).
// Auth assuree par le middleware (cookie de session signe).

export const prerender = false

const ALLOWED = ['lead', 'call_booked', 'call_done', 'match', 'paid', 'lost']

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
    await tdb.prepare("UPDATE leads SET status = ?, updated_at = datetime('now') WHERE id = ?")
      .bind(status, id).run()
    return new Response(JSON.stringify({ ok: true }), {
      status: 200, headers: { 'Content-Type': 'application/json' },
    })
  } catch (e) {
    console.error('[lead-status] error:', e)
    return new Response(JSON.stringify({ error: 'Update failed' }), { status: 500 })
  }
}
