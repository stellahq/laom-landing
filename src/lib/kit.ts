// Abonnement Kit (ConvertKit) cote serveur, API v3 (secret = KIT_API_SECRET sur le worker).
// On passe par un TAG (pas le form 8987350) : pas d'email de double opt-in envoye au
// candidat, et le tag declenche l'automation de nurture dans Kit.

const KIT_API = 'https://api.convertkit.com/v3'

/** Abonne un contact a Kit sous un tag (cree le tag s'il n'existe pas). Non bloquant. */
export async function subscribeWithTag(
  apiSecret: string | undefined,
  email: string,
  firstName: string | undefined,
  tagName: string,
): Promise<boolean> {
  if (!apiSecret) {
    console.error('[kit] KIT_API_SECRET manquant — abonnement ignoré')
    return false
  }
  try {
    const listRes = await fetch(`${KIT_API}/tags?api_secret=${encodeURIComponent(apiSecret)}`)
    const list = (await listRes.json().catch(() => ({}))) as { tags?: Array<{ id: number; name: string }> }
    let tag = (list.tags || []).find((t) => t.name === tagName)

    if (!tag) {
      const createRes = await fetch(`${KIT_API}/tags`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ api_secret: apiSecret, tag: { name: tagName } }),
      })
      tag = (await createRes.json().catch(() => null)) as { id: number; name: string } | undefined
    }
    if (!tag?.id) {
      console.error('[kit] tag introuvable/non créé:', tagName)
      return false
    }

    const res = await fetch(`${KIT_API}/tags/${tag.id}/subscribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ api_secret: apiSecret, email, first_name: firstName || undefined }),
    })
    if (!res.ok) console.error('[kit] subscribe non-ok:', res.status)
    return res.ok
  } catch (e) {
    console.error('[kit] subscribe error (non-blocking):', e)
    return false
  }
}
