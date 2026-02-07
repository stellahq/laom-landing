import type { APIRoute } from 'astro'

// GET /api/weekly-objectives?person=lorenzo&week=2026-W07
export const GET: APIRoute = async ({ request, locals }) => {
  const db = (locals as any).runtime?.env?.DB
  if (!db) return new Response(JSON.stringify({ error: 'Database not available' }), { status: 500 })

  const url = new URL(request.url)
  const person = url.searchParams.get('person')
  const week = url.searchParams.get('week')

  if (!person || !week) {
    return new Response(JSON.stringify({ error: 'person and week required' }), { status: 400 })
  }

  const { results } = await db.prepare(
    'SELECT * FROM weekly_objectives WHERE person = ? AND week = ? ORDER BY id ASC'
  ).bind(person, week).all()

  return new Response(JSON.stringify(results), {
    headers: { 'Content-Type': 'application/json' }
  })
}

// POST /api/weekly-objectives
// Body: { person, week, content }
export const POST: APIRoute = async ({ request, locals }) => {
  const db = (locals as any).runtime?.env?.DB
  if (!db) return new Response(JSON.stringify({ error: 'Database not available' }), { status: 500 })

  const body = await request.json() as Record<string, any>
  const { person, week, content } = body

  if (!person || !week || !content) {
    return new Response(JSON.stringify({ error: 'person, week, and content required' }), { status: 400 })
  }

  const result = await db.prepare(
    'INSERT INTO weekly_objectives (person, week, content) VALUES (?, ?, ?)'
  ).bind(person, week, content).run()

  return new Response(JSON.stringify({ id: result.meta.last_row_id, success: true }), {
    status: 201,
    headers: { 'Content-Type': 'application/json' }
  })
}
