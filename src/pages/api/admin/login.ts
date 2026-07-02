import type { APIRoute } from 'astro'
import { signSession, cookieHeader, clearCookieHeader, timingSafeEqualStr } from '~/utils/admin-auth'
import { checkRateLimit, clientIp, tooManyRequests } from '~/lib/rate-limit'

// POST /api/admin/login { password } -> pose un cookie de session signe (8h).
// DELETE /api/admin/login -> deconnexion (efface le cookie).
// Non gardé par le middleware (c'est le point d'entree de l'auth).

export const prerender = false

const json = (body: unknown, status: number, extraHeaders: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...extraHeaders },
  })

export const POST: APIRoute = async ({ request, locals }) => {
  const env = (locals as any).runtime?.env
  const secret = env?.ADMIN_SESSION_SECRET
  const adminPwd = env?.ADMIN_PASSWORD
  if (!secret || !adminPwd) {
    return json({ error: 'Auth non configurée (secrets manquants)' }, 500)
  }

  // Anti-brute-force : 10 tentatives / 15 min / IP.
  if (!(await checkRateLimit(env?.TRACKING_DB, `login:${clientIp(request)}`, 10, 900))) {
    return tooManyRequests()
  }

  let password = ''
  try {
    const body = (await request.json()) as { password?: string }
    password = body?.password ?? ''
  } catch {
    return json({ error: 'Requête invalide' }, 400)
  }

  if (!timingSafeEqualStr(password, adminPwd)) {
    return json({ error: 'Mot de passe incorrect' }, 401)
  }

  const token = await signSession(secret)
  const secure = new URL(request.url).protocol === 'https:'
  return json({ ok: true }, 200, { 'Set-Cookie': cookieHeader(token, secure) })
}

export const DELETE: APIRoute = async ({ request }) => {
  const secure = new URL(request.url).protocol === 'https:'
  return json({ ok: true }, 200, { 'Set-Cookie': clearCookieHeader(secure) })
}
