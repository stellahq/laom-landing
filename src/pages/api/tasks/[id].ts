import type { APIRoute } from 'astro'

// POST /api/tasks/:id/toggle — Toggle task completion
export const POST: APIRoute = async ({ params, locals }) => {
  const db = (locals as any).runtime?.env?.DB
  if (!db) return new Response(JSON.stringify({ error: 'Database not available' }), { status: 500 })

  const id = params.id
  if (!id) return new Response(JSON.stringify({ error: 'Task ID required' }), { status: 400 })

  // Get current state
  const task = await db.prepare('SELECT completed FROM tasks WHERE id = ?').bind(id).first()
  if (!task) return new Response(JSON.stringify({ error: 'Task not found' }), { status: 404 })

  const newCompleted = task.completed ? 0 : 1
  const completedAt = newCompleted ? new Date().toISOString() : null

  await db.prepare(
    'UPDATE tasks SET completed = ?, completed_at = ? WHERE id = ?'
  ).bind(newCompleted, completedAt, id).run()

  return new Response(JSON.stringify({ id, completed: newCompleted, success: true }), {
    headers: { 'Content-Type': 'application/json' }
  })
}

// DELETE /api/tasks/:id
export const DELETE: APIRoute = async ({ params, locals }) => {
  const db = (locals as any).runtime?.env?.DB
  if (!db) return new Response(JSON.stringify({ error: 'Database not available' }), { status: 500 })

  const id = params.id
  if (!id) return new Response(JSON.stringify({ error: 'Task ID required' }), { status: 400 })

  await db.prepare('DELETE FROM tasks WHERE id = ?').bind(id).run()

  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json' }
  })
}
