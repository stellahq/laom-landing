// Auth admin par cookie de session signe (HMAC-SHA256, Web Crypto).
// Remplace le mot de passe en dur (`laom2026`) + l'auth par ?password= en query
// (qui fuit dans les logs/historique). Compatible Cloudflare Workers (crypto.subtle)
// et dev Node 22. Cloudflare Access reste une couche edge complementaire (defense
// en profondeur) : ce gate applicatif protege les endpoints /api/admin/* meme si
// Access n'est pas (encore) actif ou en dev local.

const COOKIE_NAME = 'laom_admin'
const DEFAULT_TTL = 60 * 60 * 8 // 8h

function b64urlEncode(bytes: Uint8Array): string {
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function b64urlDecode(str: string): Uint8Array {
  const b64 = str.replace(/-/g, '+').replace(/_/g, '/')
  const bin = atob(b64)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return bytes
}

async function hmac(secret: string, data: string): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  )
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data))
  return new Uint8Array(sig)
}

function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i]
  return diff === 0
}

/** Compare deux chaines en temps constant (longueur incluse). */
export function timingSafeEqualStr(a: string, b: string): boolean {
  return timingSafeEqual(new TextEncoder().encode(a), new TextEncoder().encode(b))
}

/** Genere un token de session signe `payload.signature` (base64url). */
export async function signSession(secret: string, ttlSeconds = DEFAULT_TTL): Promise<string> {
  const exp = Math.floor(Date.now() / 1000) + ttlSeconds
  const payload = b64urlEncode(new TextEncoder().encode(JSON.stringify({ exp })))
  const sig = b64urlEncode(await hmac(secret, payload))
  return `${payload}.${sig}`
}

/** Verifie la signature ET l'expiration d'un token de session. */
export async function verifySession(token: string | undefined, secret: string | undefined): Promise<boolean> {
  if (!token || !secret) return false
  const [payload, sig] = token.split('.')
  if (!payload || !sig) return false
  try {
    const expected = await hmac(secret, payload)
    if (!timingSafeEqual(b64urlDecode(sig), expected)) return false
    const { exp } = JSON.parse(new TextDecoder().decode(b64urlDecode(payload)))
    return typeof exp === 'number' && exp > Math.floor(Date.now() / 1000)
  } catch {
    // Cookie malformé (base64 invalide...) = non authentifié, pas une 500.
    return false
  }
}

function readCookie(request: Request, name: string): string | undefined {
  const header = request.headers.get('cookie')
  if (!header) return undefined
  for (const part of header.split(';')) {
    const eq = part.indexOf('=')
    if (eq === -1) continue
    if (part.slice(0, eq).trim() === name) return decodeURIComponent(part.slice(eq + 1).trim())
  }
  return undefined
}

/** True si la requete porte un cookie de session admin valide. */
export async function isAuthenticated(request: Request, env: { ADMIN_SESSION_SECRET?: string } | undefined): Promise<boolean> {
  const token = readCookie(request, COOKIE_NAME)
  return verifySession(token, env?.ADMIN_SESSION_SECRET)
}

export function cookieHeader(token: string, secure = true, ttlSeconds = DEFAULT_TTL): string {
  const attrs = [
    `${COOKIE_NAME}=${encodeURIComponent(token)}`,
    'Path=/', 'HttpOnly', 'SameSite=Lax', `Max-Age=${ttlSeconds}`,
  ]
  if (secure) attrs.push('Secure')
  return attrs.join('; ')
}

export function clearCookieHeader(secure = true): string {
  const attrs = [`${COOKIE_NAME}=`, 'Path=/', 'HttpOnly', 'SameSite=Lax', 'Max-Age=0']
  if (secure) attrs.push('Secure')
  return attrs.join('; ')
}

export function unauthorized(): Response {
  return new Response(JSON.stringify({ error: 'Unauthorized' }), {
    status: 401,
    headers: { 'Content-Type': 'application/json' },
  })
}
