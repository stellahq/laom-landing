import type { APIRoute } from 'astro'

// GET /api/observations?person=lorenzo&date=2026-02-10
// or GET /api/observations?person=lorenzo (all observations for person)
export const GET: APIRoute = async ({ request, locals }) => {
  const db = (locals as any).runtime?.env?.DB
  if (!db) return new Response(JSON.stringify({ error: 'Database not available' }), { status: 500 })

  const url = new URL(request.url)
  const person = url.searchParams.get('person')
  const date = url.searchParams.get('date')

  if (!person) {
    return new Response(JSON.stringify({ error: 'person required' }), { status: 400 })
  }

  let results
  if (date) {
    const res = await db.prepare(
      'SELECT * FROM observations WHERE person = ? AND date = ? ORDER BY created_at DESC'
    ).bind(person, date).all()
    results = res.results
  } else {
    const res = await db.prepare(
      'SELECT * FROM observations WHERE person = ? ORDER BY date DESC, created_at DESC LIMIT 50'
    ).bind(person).all()
    results = res.results
  }

  return new Response(JSON.stringify(results), {
    headers: { 'Content-Type': 'application/json' }
  })
}

// POST /api/observations
// Body: { person, content, date }
export const POST: APIRoute = async ({ request, locals }) => {
  const db = (locals as any).runtime?.env?.DB
  if (!db) return new Response(JSON.stringify({ error: 'Database not available' }), { status: 500 })

  const body = await request.json() as Record<string, any>
  const { person, content, date } = body

  if (!person || !content || !date) {
    return new Response(JSON.stringify({ error: 'person, content, and date required' }), { status: 400 })
  }

  const result = await db.prepare(
    'INSERT INTO observations (person, content, date) VALUES (?, ?, ?)'
  ).bind(person, content, date).run()

  return new Response(JSON.stringify({ id: result.meta.last_row_id, success: true }), {
    status: 201,
    headers: { 'Content-Type': 'application/json' }
  })
}
