import type { APIRoute } from 'astro'
import { sendMetaEvents, extractRequestContext } from '~/lib/meta-capi'
import { getAttribution } from '~/lib/attribution'

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
    const to = env?.LEAD_NOTIFY_EMAIL || 'laomcoliving@gmail.com'
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
          to: [to],
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

  return json({ ok: true }, 200)
}
