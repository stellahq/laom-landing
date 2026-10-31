// Abonnement Kit (ConvertKit) cote serveur, API v3 (secret = KIT_API_SECRET sur le worker).
// On passe par un TAG (pas le form 8987350) : pas d'email de double opt-in envoye au
// candidat, et le tag declenche l'automation de nurture dans Kit.

const KIT_API = 'https://api.convertkit.com/v3'

/** Abonne un contact a Kit sous un ou plusieurs tags (crees s'ils n'existent pas). Non bloquant. */
export async function subscribeWithTag(
  apiSecret: string | undefined,
  email: string,
  firstName: string | undefined,
  tagName: string | string[],
): Promise<boolean> {
  if (!apiSecret) {
    console.error('[kit] KIT_API_SECRET manquant — abonnement ignoré')
    return false
  }
  const tagNames = Array.isArray(tagName) ? tagName : [tagName]
  try {
    const listRes = await fetch(`${KIT_API}/tags?api_secret=${encodeURIComponent(apiSecret)}`)
    const list = (await listRes.json().catch(() => ({}))) as { tags?: Array<{ id: number; name: string }> }

    let allOk = true
    for (const name of tagNames) {
      let tag = (list.tags || []).find((t) => t.name === name)
      if (!tag) {
        const createRes = await fetch(`${KIT_API}/tags`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ api_secret: apiSecret, tag: { name } }),
        })
        tag = (await createRes.json().catch(() => null)) as { id: number; name: string } | undefined
      }
      if (!tag?.id) {
        console.error('[kit] tag introuvable/non créé:', name)
        allOk = false
        continue
      }
      const res = await fetch(`${KIT_API}/tags/${tag.id}/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ api_secret: apiSecret, email, first_name: firstName || undefined }),
      })
      if (!res.ok) { console.error('[kit] subscribe non-ok:', res.status, name); allOk = false }
    }
    return allOk
  } catch (e) {
    console.error('[kit] subscribe error (non-blocking):', e)
    return false
  }
}

// Compte Kit « Laom » du coliving entrepreneurs, API v4 (clé = KIT_COLIVING_API_KEY sur
// le worker de prod uniquement, jamais sur staging). Upsert du contact, puis tags.
const KIT_V4 = 'https://api.kit.com/v4'

/** Crée ou met à jour un contact Kit v4 et lui applique des tags (créés s'ils manquent). Non bloquant. */
export async function subscribeV4(
  apiKey: string | undefined,
  email: string,
  firstName: string | undefined,
  tagNames: string[],
  fields: Record<string, string> = {},
): Promise<boolean> {
  if (!apiKey) {
    console.error('[kit v4] KIT_COLIVING_API_KEY manquant — abonnement ignoré')
    return false
  }
  const headers = { 'X-Kit-Api-Key': apiKey, 'Content-Type': 'application/json' }
  try {
    const sub = await fetch(`${KIT_V4}/subscribers`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ email_address: email, first_name: firstName || undefined, state: 'active', fields }),
    })
    if (!sub.ok) { console.error('[kit v4] subscriber non-ok:', sub.status); return false }

    const listRes = await fetch(`${KIT_V4}/tags?per_page=500`, { headers })
    const list = (await listRes.json().catch(() => ({}))) as { tags?: Array<{ id: number; name: string }> }
    let allOk = true
    for (const name of tagNames) {
      let tag = (list.tags || []).find((t) => t.name === name)
      if (!tag) {
        const createRes = await fetch(`${KIT_V4}/tags`, { method: 'POST', headers, body: JSON.stringify({ name }) })
        tag = ((await createRes.json().catch(() => null)) as { tag?: { id: number; name: string } } | null)?.tag
      }
      if (!tag?.id) { console.error('[kit v4] tag introuvable/non créé:', name); allOk = false; continue }
      const res = await fetch(`${KIT_V4}/tags/${tag.id}/subscribers`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ email_address: email }),
      })
      if (!res.ok) { console.error('[kit v4] tag non-ok:', res.status, name); allOk = false }
    }
    return allOk
  } catch (e) {
    console.error('[kit v4] error (non-blocking):', e)
    return false
  }
}
