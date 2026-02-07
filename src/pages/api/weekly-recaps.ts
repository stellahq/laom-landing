import type { APIRoute } from 'astro'

// GET /api/weekly-recaps?person=amandine&week=2026-W07
export const GET: APIRoute = async ({ request, locals }) => {
  const db = (locals as any).runtime?.env?.DB
  if (!db) return new Response(JSON.stringify({ error: 'Database not available' }), { status: 500 })

  const url = new URL(request.url)
  const person = url.searchParams.get('person')
  const week = url.searchParams.get('week')

  if (!person || !week) {
    return new Response(JSON.stringify({ error: 'person and week required' }), { status: 400 })
  }

  const result = await db.prepare(
    'SELECT * FROM weekly_recaps WHERE person = ? AND week = ? ORDER BY created_at DESC LIMIT 1'
  ).bind(person, week).first()

  return new Response(JSON.stringify(result || null), {
    headers: { 'Content-Type': 'application/json' }
  })
}

// POST /api/weekly-recaps
// Body: { person, week, what_done, suggestions }
export const POST: APIRoute = async ({ request, locals }) => {
  const db = (locals as any).runtime?.env?.DB
  if (!db) return new Response(JSON.stringify({ error: 'Database not available' }), { status: 500 })

  const body = await request.json() as Record<string, any>
  const { person, week, what_done, suggestions } = body

  if (!person || !week) {
    return new Response(JSON.stringify({ error: 'person and week required' }), { status: 400 })
  }

  // Upsert: delete existing then insert
  await db.prepare('DELETE FROM weekly_recaps WHERE person = ? AND week = ?').bind(person, week).run()

  const result = await db.prepare(
    'INSERT INTO weekly_recaps (person, week, what_done, suggestions) VALUES (?, ?, ?, ?)'
  ).bind(person, week, what_done || '', suggestions || '').run()

  return new Response(JSON.stringify({ id: result.meta.last_row_id, success: true }), {
    status: 201,
    headers: { 'Content-Type': 'application/json' }
  })
}
