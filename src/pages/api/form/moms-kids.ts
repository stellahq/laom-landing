import type { APIRoute } from 'astro'
import { checkRateLimit, clientIp, tooManyRequests } from '~/lib/rate-limit'
import { getAttribution } from '~/lib/attribution'

// POST /api/form/moms-kids
// Formulaire « Envie d'être de l'aventure ? » de /coliving-moms-kids (FR et EN).
// Même circuit que amandineblue.com : on relaie côté serveur vers ses routes
// /api/contact (mail à Amandine) et /api/kit (compte Kit Amandine Blue, tags
// france + langue). En plus : copie du mail à laomcoliving@gmail.com (comme les
// candidatures coliving), mail de confirmation à la personne (FR ou EN), et trace
// en D1 (type 'moms-kids').

export const prerender = false

const SITE_PERSO = 'https://amandineblue.com'
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** Échappe une valeur pour insertion dans du HTML d'email (anti-injection). */
const esc = (v: unknown) =>
  String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string))

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
const champ = (v: unknown, max = 200) => (typeof v === 'string' ? v.trim().slice(0, max) : '')

export const POST: APIRoute = async ({ request, locals, cookies }) => {
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
    decouverte: champ(d.decouverte, 120),
  }
  if (!data.prenom || !data.message || !EMAIL_RE.test(data.email)) return json({ ok: false }, 400)

  // Provenance technique (site d'origine, première page, campagne), lue côté serveur.
  const attr: any = db ? ((await getAttribution(db, cookies.get('laom_vid')?.value || undefined).catch(() => null)) || {}) : {}
  const provenance = [
    attr.referrer ? `vient de ${attr.referrer}` : 'pas de site d’origine (accès direct, appli ou lien privé)',
    attr.landing_page ? `arrivée sur ${attr.landing_page}` : null,
    attr.utm_source ? `campagne ${attr.utm_source} / ${attr.utm_campaign ?? '—'}` : null,
  ].filter(Boolean).join(' · ')

  // 1. Mail à Amandine (bloquant : c'est ce que la personne attend).
  try {
    const r = await fetch(`${SITE_PERSO}/api/contact`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, provenance, source: `Co-living France (laom.fr${langue === 'en' ? ', EN' : ''})` }),
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

  const resendKey = env?.RESEND_API_KEY
  const en = langue === 'en'

  // 3. Copie à l'équipe LAOM, même format que les candidatures coliving. Non bloquant.
  if (resendKey) {
    try {
      const rows = [
        ['Prénom', data.prenom], ['Nom', data.nom], ['Email', data.email], ['Téléphone (WhatsApp)', data.telephone],
        ['Âge des enfants', data.age_enfants], ['Langue', en ? 'Anglais (formulaire EN)' : 'Français'], ['Message', data.message],
        ['A connu le co-living par', data.decouverte], ['Provenance', provenance],
      ]
      const html = `<h2>Demande Co-living Moms &amp; Kids — ${esc(data.prenom)} ${esc(data.nom)}</h2><table cellpadding="6" style="border-collapse:collapse">${
        rows.map(([k, v]) => `<tr><td style="color:#888">${k}</td><td><strong>${v ? esc(v) : '—'}</strong></td></tr>`).join('')
      }</table>`
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'LAOM Candidatures <hello@laom.fr>',
          to: ['laomcoliving@gmail.com'],
          reply_to: data.email,
          subject: `Moms & Kids${en ? ' [EN]' : ''} — ${data.prenom} ${data.nom}`.trim(),
          html,
        }),
      })
    } catch (e) {
      console.error('[form/moms-kids] copie équipe (non-blocking):', e)
    }

    // 4. Confirmation à la personne, dans sa langue. Non bloquant.
    try {
      const brochure = `https://laom.fr/brochure/${en ? 'co-living-moms-kids-france-en.pdf' : 'co-living-moms-kids-france.pdf'}`
      const page = `https://laom.fr${en ? '/en' : ''}/coliving-moms-kids/`
      const html = en
        ? `<div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#1D1B18;line-height:1.6">
          <p>Hi ${esc(data.prenom)},</p>
          <p><strong>Thank you for your message, I’ve got it!</strong> I’ll get back to you very soon, usually within 48 hours.</p>
          <p>In the meantime, here is the brochure for the Moms &amp; Kids co-living, June 13-27, 2027, in the south of France:<br/>
          → <a href="${brochure}" style="color:#9A3922">Download the brochure</a></p>
          <p>You can also have another look at <a href="${page}" style="color:#9A3922">the full program</a>. And if you have a question, just reply to this email.</p>
          <p>Can’t wait to meet you and your little ones,<br/>Amandine</p>
        </div>`
        : `<div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#1D1B18;line-height:1.6">
          <p>Salut ${esc(data.prenom)},</p>
          <p><strong>Merci pour ton message, je l’ai bien reçu !</strong> Je te réponds très vite, en général sous 48h.</p>
          <p>En attendant, voici la brochure du Co-living Moms &amp; Kids, du 13 au 27 juin 2027, dans le sud de la France :<br/>
          → <a href="${brochure}" style="color:#9A3922">Télécharger la brochure</a></p>
          <p>Tu peux aussi revoir <a href="${page}" style="color:#9A3922">tout le programme</a>. Et si tu as une question, réponds simplement à ce mail.</p>
          <p>J’ai trop hâte de te rencontrer, toi et tes petits,<br/>Amandine</p>
        </div>`
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'Amandine <hello@laom.fr>',
          to: [data.email],
          reply_to: 'heyamandineblue@gmail.com',
          subject: en ? 'Got your message! · Moms & Kids co-living, June 2027' : 'Bien reçu ! · Co-living Moms & Kids, juin 2027',
          html,
        }),
      })
    } catch (e) {
      console.error('[form/moms-kids] confirmation (non-blocking):', e)
    }
  }

  // 5. Trace en D1 pour l'admin. Non bloquant.
  if (db) {
    try {
      await db
        .prepare(`INSERT INTO leads (type, status, first_name, last_name, email, phone, answers, consent) VALUES ('moms-kids', 'lead', ?, ?, ?, ?, ?, ?)`)
        .bind(data.prenom, data.nom || null, data.email, data.telephone || null,
          JSON.stringify({ age_enfants: data.age_enfants, message: data.message, langue, decouverte: data.decouverte, provenance }),
          JSON.stringify({ newsletter: true, at: new Date().toISOString() }))
        .run()
    } catch (e) {
      console.error('[form/moms-kids] D1 (non-blocking):', e)
    }
  }

  return json({ ok: true })
}
