// Rate limiting applicatif sur D1 (TRACKING_DB, table rate_limits).
// Fenetre fixe par cle (ex: "form:1.2.3.4"). Fail-open si la DB est absente
// (on ne bloque pas un vrai lead pour un souci d'infra), fail-closed sur le
// depassement. Une ecriture D1 par requete : negligeable a notre echelle.

export function clientIp(request: Request): string {
  return (
    request.headers.get('cf-connecting-ip') ||
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    'unknown'
  )
}

/** True si la requete est SOUS la limite (et incremente le compteur). */
export async function checkRateLimit(
  db: { prepare: (q: string) => any } | undefined,
  key: string,
  max: number,
  windowSeconds: number,
): Promise<boolean> {
  if (!db) return true
  try {
    const now = Math.floor(Date.now() / 1000)
    const row = await db
      .prepare('SELECT count, reset_at FROM rate_limits WHERE key = ?')
      .bind(key).first() as { count: number; reset_at: number } | null

    if (!row || row.reset_at <= now) {
      await db
        .prepare(
          `INSERT INTO rate_limits (key, count, reset_at) VALUES (?, 1, ?)
           ON CONFLICT(key) DO UPDATE SET count = 1, reset_at = excluded.reset_at`,
        )
        .bind(key, now + windowSeconds).run()
      return true
    }
    if (row.count >= max) return false
    await db.prepare('UPDATE rate_limits SET count = count + 1 WHERE key = ?').bind(key).run()
    return true
  } catch (e) {
    console.error('[rate-limit] error (fail-open):', e)
    return true
  }
}

export function tooManyRequests(): Response {
  return new Response(JSON.stringify({ error: 'Trop de requêtes, réessaie dans un moment.' }), {
    status: 429, headers: { 'Content-Type': 'application/json' },
  })
}
