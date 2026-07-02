import type { APIRoute } from 'astro'
import { sendMetaEvents, extractRequestContext } from '~/lib/meta-capi'
import { getAttribution } from '~/lib/attribution'
import { subscribeWithTag } from '~/lib/kit'
import { sendDataFastGoal } from '~/lib/datafast'
import { piliers, diagnostics } from '~/data/quizDiagnostics'

// POST /api/form/quiz
// Lead magnet "diagnostic" : écrit le lead (type quiz) en D1, envoie le diagnostic
// par email (Resend — la page de résultat le promet), entre le contact dans Kit
// (tag quiz-diagnostic), et signale la conversion : Meta en évènement CUSTOM
// "QuizLead" (PAS "Lead" — les ad sets optimisent sur les candidatures, pas le
// quiz) + goal DataFast "quiz_lead".

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

  const prenom = String(body.prenom || '').trim()
  const email = String(body.email || '').trim()
  if (!prenom || !EMAIL_RE.test(email)) {
    return json({ error: 'Prénom ou email invalide' }, 400)
  }
  if (body.rgpd !== true) {
    return json({ error: 'Consentement requis' }, 400)
  }
  const answers: number[] = Array.isArray(body.answers) ? body.answers.map(Number) : []
  if (answers.length !== 10 || answers.some((a) => ![1, 2, 3].includes(a))) {
    return json({ error: 'Réponses invalides' }, 400)
  }

  // Diagnostic recalculé côté serveur (vérité), pas ce que le client prétend.
  const pillarScores = [0, 1, 2, 3, 4].map((p) => answers[p * 2] + answers[p * 2 + 1])
  let gap = 0
  for (let k = 1; k < pillarScores.length; k++) if (pillarScores[k] < pillarScores[gap]) gap = k
  const d = diagnostics[gap]
  const result = { pillarScores, gap, gapLabel: piliers[gap] }

  const visitorId = cookies.get('laom_vid')?.value || null
  const eventId = String(body.event_id || '') || crypto.randomUUID()
  const attr = (await getAttribution(db, visitorId || undefined)) || {}

  // 1. Lead en D1 (source de vérité). Bloquant.
  if (db) {
    try {
      await db
        .prepare(
          `INSERT INTO leads
           (visitor_id, type, status, first_name, email, answers, result,
            utm_source, utm_medium, utm_campaign, utm_content, utm_term, fbclid, gclid,
            landing_page, referrer, meta_event_id, consent)
           VALUES (?, 'quiz', 'lead', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .bind(
          visitorId, prenom, email, JSON.stringify(answers), JSON.stringify(result),
          (attr as any).utm_source ?? null, (attr as any).utm_medium ?? null,
          (attr as any).utm_campaign ?? null, (attr as any).utm_content ?? null,
          (attr as any).utm_term ?? null, (attr as any).fbclid ?? null, (attr as any).gclid ?? null,
          (attr as any).landing_page ?? null, (attr as any).referrer ?? null,
          eventId, JSON.stringify({ rgpd: true, at: new Date().toISOString() }),
        )
        .run()
    } catch (e) {
      console.error('[form/quiz] D1 insert error:', e)
      return json({ error: 'Erreur enregistrement' }, 500)
    }
  }

  // 2. Meta : évènement custom QuizLead (dédup client via event_id). Non bloquant.
  try {
    const ctx = extractRequestContext(request, env)
    ctx.fbc = (attr as any).fbc ?? undefined
    await sendMetaEvents(
      [{
        event_name: 'QuizLead',
        event_id: eventId,
        custom_data: { content_name: 'quiz-diagnostic', content_category: 'coliving_quiz', gap: piliers[gap] },
        user_data: { em: email, fn: prenom, external_id: visitorId || email },
      }],
      ctx,
    )
  } catch (e) {
    console.error('[form/quiz] CAPI error (non-blocking):', e)
  }

  // 3. Email de diagnostic (la page de résultat le promet). Non bloquant.
  try {
    const resendKey = env?.RESEND_API_KEY
    if (resendKey) {
      const bars = pillarScores.map((s, k) => {
        const low = k === gap
        return `<tr>
          <td style="padding:6px 12px 6px 0;color:${low ? '#9A3922' : '#412F1F'};font-weight:${low ? '700' : '500'}">${piliers[k]}${low ? ' · à reprendre en priorité' : ''}</td>
          <td style="padding:6px 0;color:#1D1B18;opacity:.6;white-space:nowrap">${s}/6</td>
        </tr>`
      }).join('')
      const html = `
        <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#1D1B18;line-height:1.6">
          <p>Salut ${prenom},</p>
          <p>Voilà ton diagnostic complet.</p>
          <h2 style="color:#412F1F">Ton plus gros décalage : ${d.gap}.</h2>
          <p>${d.why}</p>
          <p style="color:#9A3922;font-weight:700;margin-bottom:4px">LA BASCULE</p>
          <p>${d.bascule}</p>
          <p style="font-weight:700;color:#412F1F;margin-bottom:4px">Où tu en es, pilier par pilier :</p>
          <table cellpadding="0" cellspacing="0" style="border-collapse:collapse">${bars}</table>
          <p style="margin-top:24px">Cette bascule, on en a fait un lieu. Une semaine à LAOM en août : tu continues de travailler, mais dans un cadre qui te nourrit au lieu de t'épuiser, avec onze entrepreneurs qui vivent la même chose que toi.</p>
          <p>→ <a href="https://laom.fr/coliving/?utm_source=kit&utm_medium=email&utm_campaign=quiz-diagnostic" style="color:#9A3922">Découvrir le coliving</a><br/>
          → <a href="https://laom.fr/candidater/?utm_source=kit&utm_medium=email&utm_campaign=quiz-diagnostic" style="color:#9A3922">Candidater directement</a></p>
          <p>À bientôt,<br/>Charly &amp; Amandine — LAOM</p>
        </div>`
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'Charly de LAOM <hello@laom.fr>',
          to: [email],
          reply_to: 'laomcoliving@gmail.com',
          subject: `Ton diagnostic : ${d.gap} — LAOM`,
          html,
        }),
      })
    }
  } catch (e) {
    console.error('[form/quiz] Resend error (non-blocking):', e)
  }

  // 4. Kit : tag quiz-diagnostic (nurture dédiée possible dans Kit). Non bloquant.
  try {
    await subscribeWithTag(env?.KIT_API_SECRET, email, prenom, 'quiz-diagnostic')
  } catch (e) {
    console.error('[form/quiz] Kit error (non-blocking):', e)
  }

  // 5. Goal DataFast "quiz_lead" (funnel Quiz → Candidature). Non bloquant.
  await sendDataFastGoal(env, request, 'quiz_lead', { gap: piliers[gap] })

  return json({ ok: true, result }, 200)
}
