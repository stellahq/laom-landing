import type { APIRoute } from 'astro'
import { sendMetaEvents, extractRequestContext } from '~/lib/meta-capi'
import { getAttribution } from '~/lib/attribution'
import { subscribeWithTag } from '~/lib/kit'
import { sendDataFastGoal } from '~/lib/datafast'

// POST /api/form/candidater
// Source de verite : ecrit le lead en D1 (TRACKING_DB), PUIS declenche la
// conversion Lead server-side (CAPI) avec l'event_id partage par le client (dedup),
// PUIS notifie l'equipe (Resend). Le lead existe meme si le pixel client est bloque.

export const prerender = false

const json = (body: unknown, status: number) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export const POST: APIRoute = async ({ request, locals, cookies }) => {
  const env = (locals as any).runtime?.env
  const db = env?.TRACKING_DB

  let body: Record<string, any>
  try {
    body = await request.json()
  } catch {
    return json({ error: 'Requête invalide' }, 400)
  }

  const nom = String(body.nom || '').trim()
  const email = String(body.email || '').trim()
  const tel = String(body.tel || '').trim()
  if (!nom || !EMAIL_RE.test(email) || !tel) {
    return json({ error: 'Champs requis manquants ou email invalide' }, 400)
  }
  if (body.rgpd !== true && body.rgpd !== 'true' && body.rgpd !== 'on') {
    return json({ error: 'Consentement requis' }, 400)
  }

  const firstName = nom.split(' ')[0]
  const lastName = nom.split(' ').slice(1).join(' ') || null
  const visitorId = cookies.get('laom_vid')?.value || null
  const eventId = String(body.event_id || '') || crypto.randomUUID()

  const answers = {
    activite: body.activite ?? null,
    anciennete: body.anciennete ?? null,
    equipe: body.equipe ?? null,
    experience: body.experience ?? null,
    attentes: Array.isArray(body.attentes) ? body.attentes : (body.attentes ? [body.attentes] : []),
    semaine: body.semaine ?? null,
    message: body.message ?? null,
  }

  // Attribution resolue cote serveur (verite), pas ce que le client pretend.
  const attr = (await getAttribution(db, visitorId || undefined)) || {}

  // 1. Ecrire le lead (source de verite). Bloquant : si la DB echoue, on le signale.
  if (db) {
    try {
      await db
        .prepare(
          `INSERT INTO leads
           (visitor_id, type, status, first_name, last_name, email, phone, answers,
            utm_source, utm_medium, utm_campaign, utm_content, utm_term, fbclid, gclid,
            landing_page, referrer, meta_event_id, consent)
           VALUES (?, 'candidature', 'lead', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .bind(
          visitorId, firstName, lastName, email, tel, JSON.stringify(answers),
          (attr as any).utm_source ?? null, (attr as any).utm_medium ?? null,
          (attr as any).utm_campaign ?? null, (attr as any).utm_content ?? null,
          (attr as any).utm_term ?? null, (attr as any).fbclid ?? null, (attr as any).gclid ?? null,
          (attr as any).landing_page ?? null, (attr as any).referrer ?? null,
          eventId, JSON.stringify({ rgpd: true, at: new Date().toISOString() }),
        )
        .run()
    } catch (e) {
      console.error('[form/candidater] D1 insert error:', e)
      return json({ error: 'Erreur enregistrement' }, 500)
    }
  }

  // 2. Conversion Lead server-side (dedup avec le client via event_id). Non bloquant.
  try {
    const ctx = extractRequestContext(request, env)
    ctx.fbc = (attr as any).fbc ?? undefined
    await sendMetaEvents(
      [{
        event_name: 'Lead',
        event_id: eventId,
        custom_data: { content_name: 'candidature-coliving', content_category: 'coliving_candidature' },
        user_data: { em: email, ph: tel, fn: firstName, external_id: visitorId || email },
      }],
      ctx,
    )
  } catch (e) {
    console.error('[form/candidater] CAPI error (non-blocking):', e)
  }

  // 3. Notifier l'equipe (Resend). Non bloquant.
  try {
    const resendKey = env?.RESEND_API_KEY
    // Destinataires de la notif equipe (liste separee par des virgules, surchargeables
    // via la var LEAD_NOTIFY_EMAIL sur le worker).
    const to = String(env?.LEAD_NOTIFY_EMAIL || 'laomcoliving@gmail.com,eduardo@weble.fr')
      .split(',').map((s: string) => s.trim()).filter(Boolean)
    if (resendKey) {
      const utmLine = (attr as any).utm_source
        ? `${(attr as any).utm_source} / ${(attr as any).utm_campaign ?? '—'} / ${(attr as any).utm_content ?? '—'}`
        : 'directe / inconnue'
      const rows = [
        ['Nom', nom], ['Email', email], ['Téléphone', tel],
        ['Activité', answers.activite], ['Ancienneté', answers.anciennete],
        ['Équipe', answers.equipe], ['Déjà fait', answers.experience],
        ['Attentes', answers.attentes.join(' · ')], ['Semaine', answers.semaine],
        ['Message', answers.message], ['Source', utmLine],
      ]
      const html = `<h2>Nouvelle candidature coliving — ${nom}</h2><table cellpadding="6" style="border-collapse:collapse">${
        rows.map(([k, v]) => `<tr><td style="color:#888">${k}</td><td><strong>${v ?? '—'}</strong></td></tr>`).join('')
      }</table>`
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'LAOM Candidatures <hello@laom.fr>',
          to,
          subject: `Nouvelle candidature coliving — ${nom}`,
          html,
        }),
      })
      if (db && visitorId) {
        try {
          await db.prepare('UPDATE leads SET notified_at = datetime(\'now\') WHERE meta_event_id = ?').bind(eventId).run()
        } catch { /* non-blocking */ }
      }
    }
  } catch (e) {
    console.error('[form/candidater] Resend error (non-blocking):', e)
  }

  // 4. Email de confirmation au candidat (la page de merci le promet). Non bloquant.
  try {
    const resendKey = env?.RESEND_API_KEY
    if (resendKey) {
      const html = `
        <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#1D1B18;line-height:1.6">
          <p>Salut ${firstName},</p>
          <p><strong>Ta candidature pour le coliving d'août est bien reçue.</strong></p>
          <p>On t'appelle dans les 48h pour un échange de 15 minutes. Pas de pitch, pas de pression —
          juste une conversation pour voir si LAOM est fait pour toi.</p>
          <p>D'ici là, si tu veux te projeter :</p>
          <p>→ <a href="https://laom.fr/le-lieu/" style="color:#9A3922">Le lieu</a> — les 21 hectares, le shala, les tipis, la rivière<br/>
          → <a href="https://laom.fr/notre-histoire/" style="color:#9A3922">Notre histoire</a> — pourquoi on a construit cet endroit</p>
          <p>À très vite,<br/>Charly &amp; Amandine — LAOM</p>
        </div>`
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'Charly de LAOM <hello@laom.fr>',
          to: [email],
          reply_to: 'laomcoliving@gmail.com',
          subject: 'Ta candidature est bien reçue — Coliving LAOM août 2026',
          html,
        }),
      })
    }
  } catch (e) {
    console.error('[form/candidater] confirmation email error (non-blocking):', e)
  }

  // 5. Entrée dans Kit (tag candidature-coliving -> automation de nurture). Non bloquant.
  //    Base légale : case RGPD du formulaire ("me recontacter et m'envoyer des informations").
  try {
    await subscribeWithTag(env?.KIT_API_SECRET, email, firstName, 'candidature-coliving')
  } catch (e) {
    console.error('[form/candidater] Kit error (non-blocking):', e)
  }

  // 6. Goal DataFast "candidature" (funnels analytics). Non bloquant.
  await sendDataFastGoal(env, request, 'candidature', {
    source: (attr as any).utm_source || 'directe',
  })

  return json({ ok: true }, 200)
}
