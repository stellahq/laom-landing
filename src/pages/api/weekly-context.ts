import type { APIRoute } from 'astro'

// GET /api/weekly-context?week=2026-W07
export const GET: APIRoute = async ({ request, locals }) => {
  const db = (locals as any).runtime?.env?.DB
  if (!db) return new Response(JSON.stringify({ error: 'Database not available' }), { status: 500 })

  const url = new URL(request.url)
  const week = url.searchParams.get('week')

  if (!week) {
    return new Response(JSON.stringify({ error: 'week required' }), { status: 400 })
  }

  const result = await db.prepare(
    'SELECT * FROM weekly_context WHERE week = ? ORDER BY created_at DESC LIMIT 1'
  ).bind(week).first()

  return new Response(JSON.stringify(result || null), {
    headers: { 'Content-Type': 'application/json' }
  })
}

// POST /api/weekly-context
// Body: { week, charly_focus, enjeux }
export const POST: APIRoute = async ({ request, locals }) => {
  const db = (locals as any).runtime?.env?.DB
  if (!db) return new Response(JSON.stringify({ error: 'Database not available' }), { status: 500 })

  const body = await request.json() as Record<string, any>
  const { week, charly_focus, enjeux } = body

  if (!week) {
    return new Response(JSON.stringify({ error: 'week required' }), { status: 400 })
  }

  // Upsert
  await db.prepare('DELETE FROM weekly_context WHERE week = ?').bind(week).run()

  const result = await db.prepare(
    'INSERT INTO weekly_context (week, charly_focus, enjeux) VALUES (?, ?, ?)'
  ).bind(week, charly_focus || '', enjeux || '').run()

  return new Response(JSON.stringify({ id: result.meta.last_row_id, success: true }), {
    status: 201,
    headers: { 'Content-Type': 'application/json' }
  })
}
