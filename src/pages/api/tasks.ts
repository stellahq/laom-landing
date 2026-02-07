import type { APIRoute } from 'astro'

// GET /api/tasks?person=lorenzo&week=2026-W07
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
    'SELECT * FROM tasks WHERE person = ? AND week = ? ORDER BY sort_order ASC, id ASC'
  ).bind(person, week).all()

  return new Response(JSON.stringify(results), {
    headers: { 'Content-Type': 'application/json' }
  })
}

// POST /api/tasks
// Body: { person, week, content, priority?, is_daily_highlight?, sort_order? }
export const POST: APIRoute = async ({ request, locals }) => {
  const db = (locals as any).runtime?.env?.DB
  if (!db) return new Response(JSON.stringify({ error: 'Database not available' }), { status: 500 })

  const body = await request.json() as Record<string, any>
  const { person, week, content, priority = 'normal', is_daily_highlight = 0, sort_order = 0 } = body

  if (!person || !week || !content) {
    return new Response(JSON.stringify({ error: 'person, week, and content required' }), { status: 400 })
  }

  const result = await db.prepare(
    'INSERT INTO tasks (person, week, content, priority, is_daily_highlight, sort_order) VALUES (?, ?, ?, ?, ?, ?)'
  ).bind(person, week, content, priority, is_daily_highlight, sort_order).run()

  return new Response(JSON.stringify({ id: result.meta.last_row_id, success: true }), {
    status: 201,
    headers: { 'Content-Type': 'application/json' }
  })
}
