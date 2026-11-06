import type { APIRoute } from 'astro'
import { checkRateLimit, clientIp, tooManyRequests } from '~/lib/rate-limit'

// POST /api/form/moms-kids
// Formulaire « Envie d'être de l'aventure ? » de /coliving-moms-kids (FR et EN).
// Même circuit que amandineblue.com : on relaie côté serveur vers ses routes
// /api/contact (mail à Amandine) et /api/kit (compte Kit Amandine Blue, tags
// france + langue). Le lead est aussi gardé en D1 (type 'moms-kids').

export const prerender = false

const SITE_PERSO = 'https://amandineblue.com'
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
const champ = (v: unknown, max = 200) => (typeof v === 'string' ? v.trim().slice(0, max) : '')

export const POST: APIRoute = async ({ request, locals }) => {
  const env = (locals as any).runtime?.env
  const db = env?.TRACKING_DB

  if (db && !(await checkRateLimit(db, `momskids:${clientIp(request)}`, 5, 3600))) {
    return tooManyRequests()
  }

  let d: Record<string, unknown>
  try {
    d = await request.json()
  } catch {
    return json({ ok: false }, 400)
  }
  if (d.botcheck) return json({ ok: true })

  const langue = d.langue === 'en' ? 'en' : 'fr'
  const data = {
    prenom: champ(d.prenom, 100),
    nom: champ(d.nom, 100),
    email: champ(d.email, 254),
    telephone: champ(d.telephone, 40),
    age_enfants: champ(d.age_enfants),
    message: champ(d.message, 5000),
  }
  if (!data.prenom || !data.message || !EMAIL_RE.test(data.email)) return json({ ok: false }, 400)

  // 1. Mail à Amandine (bloquant : c'est ce que la personne attend).
  try {
    const r = await fetch(`${SITE_PERSO}/api/contact`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, source: `Co-living France (laom.fr${langue === 'en' ? ', EN' : ''})` }),
    })
    const j: any = await r.json().catch(() => ({}))
    if (!r.ok || !j.ok) throw new Error(`contact ${r.status}`)
  } catch (e) {
    console.error('[form/moms-kids] relais contact:', e)
    return json({ ok: false }, 502)
  }

  // 2. Kit Amandine Blue (tags france + langue). Non bloquant.
  try {
    await fetch(`${SITE_PERSO}/api/kit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, interet: 'france', langue }),
    })
  } catch (e) {
    console.error('[form/moms-kids] relais Kit (non-blocking):', e)
  }

  // 3. Trace en D1 pour l'admin. Non bloquant.
  if (db) {
    try {
      await db
        .prepare(`INSERT INTO leads (type, status, first_name, last_name, email, phone, answers, consent) VALUES ('moms-kids', 'lead', ?, ?, ?, ?, ?, ?)`)
        .bind(data.prenom, data.nom || null, data.email, data.telephone || null,
          JSON.stringify({ age_enfants: data.age_enfants, message: data.message, langue }),
          JSON.stringify({ newsletter: true, at: new Date().toISOString() }))
        .run()
    } catch (e) {
      console.error('[form/moms-kids] D1 (non-blocking):', e)
    }
  }

  return json({ ok: true })
}
