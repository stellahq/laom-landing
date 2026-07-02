// Goals DataFast server-side (analytics cookieless, complement du tracking maison).
// Le script client (prod-only) pose le cookie datafast_visitor_id ; le serveur
// rattache le goal a ce visiteur. Sans cookie (staging/dev, adblock total), on skip.

const WEBSITE_ID = '6a439c284d69b88282c01059' // laom.fr

/** Envoie un goal DataFast pour le visiteur de la requete. Non bloquant. */
export async function sendDataFastGoal(
  env: { DATAFAST_API_TOKEN?: string } | undefined,
  request: Request,
  name: string,
  metadata?: Record<string, string>,
): Promise<void> {
  const token = env?.DATAFAST_API_TOKEN
  if (!token) return
  const cookie = request.headers.get('cookie') || ''
  const m = cookie.match(/(?:^|;\s*)datafast_visitor_id=([^;]+)/)
  if (!m) return
  try {
    const res = await fetch(`https://datafa.st/api/v1/goals?websiteId=${WEBSITE_ID}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        datafast_visitor_id: decodeURIComponent(m[1]),
        name,
        ...(metadata ? { metadata } : {}),
      }),
    })
    if (!res.ok) console.error('[datafast] goal non-ok:', res.status, await res.text().catch(() => ''))
  } catch (e) {
    console.error('[datafast] goal error (non-blocking):', e)
  }
}
