import type { APIRoute } from 'astro'

/**
 * POST /api/mollie/webhook/
 *
 * Mollie envoie un POST avec { id: 'tr_xxx' } quand le statut d'un paiement change.
 * On recupere le paiement via l'API Mollie pour verifier le statut reel.
 *
 * Si le paiement est un 1er versement (installment 1of2) et qu'il est paye,
 * on programme automatiquement le 2eme versement via un paiement recurrent.
 *
 * Post-paiement :
 * - Stocke l'event dans tunnel_events (D1) pour le dashboard
 * - Tag le subscriber dans Kit (API v4) avec un tag specifique au produit
 */

// Mapping produit -> tag Kit
const PRODUCT_TAG_MAP: Record<string, string> = {
  'school-merci': 'oto-147-achete',
  'school-online': 'school-497-achete',
  'school-online-2x': 'school-497-achete', // Meme tag pour les 2 modes de paiement
}

export const POST: APIRoute = async ({ request, locals }) => {
  const env = (locals as any).runtime?.env
  const apiKey = env?.MOLLIE_API_KEY
  const apiKeyTest = env?.MOLLIE_API_KEY_TEST

  if (!apiKey && !apiKeyTest) {
    return new Response('Not configured', { status: 500 })
  }

  // Mollie envoie un form-urlencoded avec le champ "id"
  let paymentId: string | null = null
  try {
    const formData = await request.formData()
    paymentId = formData.get('id') as string
  } catch {
    // Fallback JSON (au cas ou)
    try {
      const json = (await request.json()) as any
      paymentId = json.id
    } catch {
      return new Response('Invalid payload', { status: 400 })
    }
  }

  if (!paymentId) {
    return new Response('Missing payment id', { status: 400 })
  }

  // Construire l'URL de base pour le webhook du 2eme versement
  const origin = new URL(request.url).origin

  try {
    // Essayer la clé live d'abord. Si 401/404 (paiement créé en test), retomber sur la clé test.
    const tryFetch = async (key: string) =>
      fetch(`https://api.mollie.com/v2/payments/${paymentId}`, {
        headers: { Authorization: `Bearer ${key}` },
      })
    let response: Response | null = null
    let activeApiKey: string | null = null
    if (apiKey) {
      response = await tryFetch(apiKey)
      if (response.ok) activeApiKey = apiKey
    }
    if ((!response || !response.ok) && apiKeyTest) {
      response = await tryFetch(apiKeyTest)
      if (response.ok) activeApiKey = apiKeyTest
    }
    if (!response || !response.ok || !activeApiKey) {
      console.error(`Mollie webhook: failed to fetch payment ${paymentId}`, response?.status)
      return new Response('Failed to verify payment', { status: 502 })
    }

    const payment = (await response.json()) as any
    const status = payment.status
    const metadata = payment.metadata || {}

    console.log(`Mollie webhook: payment ${paymentId} is now "${status}"`, {
      product: metadata.product,
      email: metadata.email,
      amount: payment.amount?.value,
      installment: metadata.installment,
    })

    const db = env?.DB

    // Mettre a jour en D1 (mollie_payments)
    if (db) {
      try {
        await db
          .prepare(
            `UPDATE mollie_payments SET status = ?, updated_at = ? WHERE payment_id = ?`,
          )
          .bind(status, new Date().toISOString(), paymentId)
          .run()
      } catch (dbError) {
        console.error('D1 update error (non-blocking):', dbError)
      }
    }

    // Ecrire dans tunnel_events pour le dashboard
    if (db) {
      const eventType = status === 'paid' ? 'payment_completed'
        : status === 'failed' ? 'payment_failed'
        : status === 'canceled' ? 'payment_failed'
        : status === 'expired' ? 'payment_failed'
        : null

      if (eventType) {
        try {
          await db
            .prepare(
              `INSERT INTO tunnel_events (event_type, page, source, session_id, email, product, amount, meta, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            )
            .bind(
              eventType,
              '/api/mollie/webhook/',
              'mollie',
              `mollie_${paymentId}`,
              metadata.email || null,
              metadata.product || null,
              payment.amount?.value || null,
              JSON.stringify({
                payment_id: paymentId,
                installment: metadata.installment || null,
                mollie_status: status,
              }),
              new Date().toISOString(),
            )
            .run()
        } catch (err) {
          console.error('tunnel_events insert error (non-blocking):', err)
        }
      }
    }

    // ----- Email confirmation Chillworking via Resend -----
    if (status === 'paid' && metadata.product === 'chillworking' && metadata.email) {
      const resendKey = env?.RESEND_API_KEY
      if (resendKey) {
        try {
          const sessionLabel = metadata.session === 'aout' ? 'Août 2026' : 'Juin 2026'
          const arrival = metadata.arrivalDate as string
          const nights = Number(metadata.nights || 0)
          const departure = arrival
            ? new Date(new Date(arrival + 'T00:00:00Z').getTime() + nights * 86400000)
                .toISOString()
                .slice(0, 10)
            : ''
          const total = metadata.total ?? payment.amount?.value
          const couponLine = metadata.coupon
            ? `<tr><td style="padding:6px 0;color:#666">Code promo</td><td style="padding:6px 0;text-align:right"><strong>${metadata.coupon}</strong> (-20 %)</td></tr>`
            : ''
          const firstName = metadata.firstName || ''
          const greeting = firstName ? `Bonjour ${firstName},` : 'Bonjour,'

          const html = `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8"><title>Réservation Chillworking confirmée</title></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Helvetica Neue',Helvetica,Arial,sans-serif;background:#FAF8F5;color:#2C2824">
<table width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#FAF8F5;padding:40px 20px">
<tr><td align="center">
<table width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:560px;background:#fff;border-radius:4px;padding:40px">
<tr><td>
  <p style="margin:0 0 8px;font-size:11px;letter-spacing:2.5px;text-transform:uppercase;color:#8B7A3A">Réservation confirmée</p>
  <h1 style="margin:0 0 24px;font-size:28px;font-weight:500;color:#2C2824">On t'attend à LAOM.</h1>

  <p style="font-size:16px;line-height:1.6;color:#2C2824">${greeting}</p>
  <p style="font-size:16px;line-height:1.6;color:#2C2824">Ton paiement vient d'être validé. Voici le récap de ta réservation pour la <strong>Semaine Chillworking</strong> à LAOM :</p>

  <table width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#FAF8F5;border-radius:4px;padding:20px;margin:24px 0;font-size:14px">
    <tr><td style="padding:6px 0;color:#666">Session</td><td style="padding:6px 0;text-align:right"><strong>${sessionLabel}</strong></td></tr>
    <tr><td style="padding:6px 0;color:#666">Date d'arrivée</td><td style="padding:6px 0;text-align:right"><strong>${arrival}</strong></td></tr>
    <tr><td style="padding:6px 0;color:#666">Date de départ</td><td style="padding:6px 0;text-align:right"><strong>${departure}</strong></td></tr>
    <tr><td style="padding:6px 0;color:#666">Nombre de nuits</td><td style="padding:6px 0;text-align:right"><strong>${nights}</strong></td></tr>
    ${couponLine}
    <tr><td style="padding:12px 0 0;border-top:1px solid #ddd;color:#2C2824;font-weight:600">Total payé</td><td style="padding:12px 0 0;border-top:1px solid #ddd;text-align:right;color:#2C2824;font-weight:600">${total} €</td></tr>
  </table>

  <h2 style="margin:32px 0 12px;font-size:18px;font-weight:500;color:#2C2824">Et maintenant ?</h2>
  <ul style="font-size:15px;line-height:1.7;color:#2C2824;padding-left:20px">
    <li>On revient vers toi sous <strong>quelques jours</strong> avec les <strong>infos pratiques</strong> : accès au lieu, ce qu'il faut emporter, préférences alimentaires.</li>
    <li>Si tu as une <strong>allergie</strong> ou un <strong>régime particulier</strong>, réponds à cet email pour qu'on s'organise.</li>
    <li>Pour toute question : <a href="mailto:hello@laom.fr" style="color:#C4A855">hello@laom.fr</a></li>
  </ul>

  <p style="font-size:14px;line-height:1.6;color:#666;margin-top:32px">Hâte de t'accueillir à LAOM,<br>Charly & Amandine</p>
</td></tr>
</table>
<p style="font-size:11px;color:#999;margin-top:20px">LAOM · La Margue · 12400 Saint-Félix-de-Sorgues · Aveyron</p>
</td></tr>
</table>
</body></html>`

          await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${resendKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              from: 'LAOM Chillworking <hello@laom.fr>',
              to: [metadata.email],
              bcc: ['laomcoliving@gmail.com'],
              subject: 'Ta réservation Chillworking est confirmée — LAOM',
              html,
            }),
          })
            .then(async (r) => {
              if (!r.ok) {
                const err = await r.json().catch(() => ({}))
                console.error('Resend send error:', err)
              } else {
                console.log(`Resend: confirmation email sent to ${metadata.email}`)
              }
            })
            .catch((e) => console.error('Resend fetch error (non-blocking):', e))
        } catch (mailErr) {
          console.error('Email confirmation error (non-blocking):', mailErr)
        }
      } else {
        console.warn('RESEND_API_KEY not configured, skipping confirmation email')
      }
    }
    // ----- Fin email Chillworking -----

    // ----- Email confirmation Forum Éco-Construction via Resend -----
    if (status === 'paid' && metadata.product === 'forum-eco-construction' && metadata.email) {
      const resendKey = env?.RESEND_API_KEY
      if (resendKey) {
        try {
          const total = metadata.total ?? payment.amount?.value
          const base = metadata.base ?? 60
          const mealsTotal = metadata.mealsTotal ?? 0
          const mealsLabels: string[] = Array.isArray(metadata.mealsLabels) ? metadata.mealsLabels : []
          const firstName = metadata.firstName || ''
          const greeting = firstName ? `Bonjour ${firstName},` : 'Bonjour,'
          const mealsRows = mealsLabels.length
            ? mealsLabels
                .map(
                  (label) =>
                    `<tr><td style="padding:4px 0;color:#666">${label}</td><td style="padding:4px 0;text-align:right;color:#2C2824">✓</td></tr>`,
                )
                .join('')
            : `<tr><td style="padding:6px 0;color:#666" colspan="2"><em>Aucun repas sélectionné</em></td></tr>`

          const html = `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8"><title>Réservation Forum Éco-Construction confirmée</title></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Helvetica Neue',Helvetica,Arial,sans-serif;background:#FAF8F5;color:#2C2824">
<table width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#FAF8F5;padding:40px 20px">
<tr><td align="center">
<table width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:560px;background:#fff;border-radius:4px;padding:40px">
<tr><td>
  <p style="margin:0 0 8px;font-size:11px;letter-spacing:2.5px;text-transform:uppercase;color:#8B7A3A">Réservation confirmée</p>
  <h1 style="margin:0 0 24px;font-size:28px;font-weight:500;color:#2C2824">On t'attend à LAOM.</h1>

  <p style="font-size:16px;line-height:1.6;color:#2C2824">${greeting}</p>
  <p style="font-size:16px;line-height:1.6;color:#2C2824">Ton paiement vient d'être validé. Voici le récap de ta réservation pour le <strong>Forum Éco-Construction</strong> à LAOM, du 3 au 5 juillet 2026 :</p>

  <table width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#FAF8F5;border-radius:4px;padding:20px;margin:24px 0;font-size:14px">
    <tr><td style="padding:6px 0;color:#666">Pass forum (3 jours)</td><td style="padding:6px 0;text-align:right"><strong>${base} €</strong></td></tr>
    ${mealsRows}
    <tr><td style="padding:6px 0;color:#666">Total repas</td><td style="padding:6px 0;text-align:right"><strong>${mealsTotal} €</strong></td></tr>
    <tr><td style="padding:12px 0 0;border-top:1px solid #ddd;color:#2C2824;font-weight:600">Total payé</td><td style="padding:12px 0 0;border-top:1px solid #ddd;text-align:right;color:#2C2824;font-weight:600">${total} €</td></tr>
  </table>

  <h2 style="margin:32px 0 12px;font-size:18px;font-weight:500;color:#2C2824">Et maintenant ?</h2>
  <ul style="font-size:15px;line-height:1.7;color:#2C2824;padding-left:20px">
    <li>On revient vers toi avec les <strong>infos pratiques</strong> avant le forum : accès au domaine, programme détaillé, ce qu'il faut emporter.</li>
    <li>Si tu as une <strong>allergie</strong> ou un <strong>régime particulier</strong>, réponds à cet email pour qu'on s'organise.</li>
    <li>Pour toute question : <a href="mailto:hello@laom.fr" style="color:#C4A855">hello@laom.fr</a></li>
  </ul>

  <p style="font-size:14px;line-height:1.6;color:#666;margin-top:32px">Hâte de t'accueillir à LAOM,<br>Charly & Amandine</p>
</td></tr>
</table>
<p style="font-size:11px;color:#999;margin-top:20px">LAOM · La Margue · 12400 Saint-Félix-de-Sorgues · Aveyron</p>
</td></tr>
</table>
</body></html>`

          await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${resendKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              from: 'LAOM Forum <hello@laom.fr>',
              to: [metadata.email],
              bcc: ['laomcoliving@gmail.com'],
              subject: 'Ta réservation Forum Éco-Construction est confirmée — LAOM',
              html,
            }),
          })
            .then(async (r) => {
              if (!r.ok) {
                const err = await r.json().catch(() => ({}))
                console.error('Resend send error (forum):', err)
              } else {
                console.log(`Resend: forum confirmation email sent to ${metadata.email}`)
              }
            })
            .catch((e) => console.error('Resend fetch error (forum, non-blocking):', e))
        } catch (mailErr) {
          console.error('Forum email confirmation error (non-blocking):', mailErr)
        }
      } else {
        console.warn('RESEND_API_KEY not configured, skipping forum confirmation email')
      }
    }
    // ----- Fin email Forum Éco-Construction -----

    // ----- Email confirmation En Mouvement via Resend -----
    if (status === 'paid' && metadata.product === 'en-mouvement' && metadata.email) {
      const resendKey = env?.RESEND_API_KEY
      if (resendKey) {
        try {
          const total = metadata.total ?? payment.amount?.value
          const base = metadata.base ?? 1100
          const sessionLabel = metadata.sessionLabel || 'Session'
          const sessionDates = metadata.sessionDates || ''
          const couponLine = metadata.coupon
            ? `<tr><td style="padding:6px 0;color:#666">Code promo</td><td style="padding:6px 0;text-align:right"><strong>${metadata.coupon}</strong> (-20 %)</td></tr>`
            : ''
          const firstName = metadata.firstName || ''
          const greeting = firstName ? `Bonjour ${firstName},` : 'Bonjour,'

          const html = `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8"><title>Réservation En Mouvement confirmée</title></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Helvetica Neue',Helvetica,Arial,sans-serif;background:#FAF8F5;color:#2C2824">
<table width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#FAF8F5;padding:40px 20px">
<tr><td align="center">
<table width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:560px;background:#fff;border-radius:4px;padding:40px">
<tr><td>
  <p style="margin:0 0 8px;font-size:11px;letter-spacing:2.5px;text-transform:uppercase;color:#8B7A3A">Réservation confirmée</p>
  <h1 style="margin:0 0 24px;font-size:28px;font-weight:500;color:#2C2824">On t'attend à LAOM.</h1>

  <p style="font-size:16px;line-height:1.6;color:#2C2824">${greeting}</p>
  <p style="font-size:16px;line-height:1.6;color:#2C2824">Ton paiement vient d'être validé. Voici le récap de ta réservation pour <strong>En Mouvement</strong> à LAOM :</p>

  <table width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#FAF8F5;border-radius:4px;padding:20px;margin:24px 0;font-size:14px">
    <tr><td style="padding:6px 0;color:#666">Session</td><td style="padding:6px 0;text-align:right"><strong>${sessionLabel}</strong></td></tr>
    <tr><td style="padding:6px 0;color:#666">Dates</td><td style="padding:6px 0;text-align:right"><strong>${sessionDates}</strong></td></tr>
    <tr><td style="padding:6px 0;color:#666">Tarif de base</td><td style="padding:6px 0;text-align:right">${base} €</td></tr>
    ${couponLine}
    <tr><td style="padding:12px 0 0;border-top:1px solid #ddd;color:#2C2824;font-weight:600">Total payé</td><td style="padding:12px 0 0;border-top:1px solid #ddd;text-align:right;color:#2C2824;font-weight:600">${total} €</td></tr>
  </table>

  <h2 style="margin:32px 0 12px;font-size:18px;font-weight:500;color:#2C2824">Et maintenant ?</h2>
  <ul style="font-size:15px;line-height:1.7;color:#2C2824;padding-left:20px">
    <li>On revient vers toi avec les <strong>infos pratiques</strong> avant la session : accès au lieu, ce qu'il faut emporter, préférences alimentaires.</li>
    <li>Si tu as une <strong>allergie</strong> ou un <strong>régime particulier</strong>, réponds à cet email pour qu'on s'organise.</li>
    <li>Pour toute question : <a href="mailto:hello@laom.fr" style="color:#C4A855">hello@laom.fr</a></li>
  </ul>

  <p style="font-size:14px;line-height:1.6;color:#666;margin-top:32px">Hâte de t'accueillir à LAOM,<br>Charly & Amandine</p>
</td></tr>
</table>
<p style="font-size:11px;color:#999;margin-top:20px">LAOM · La Margue · 12400 Saint-Félix-de-Sorgues · Aveyron</p>
</td></tr>
</table>
</body></html>`

          await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              from: 'LAOM En Mouvement <hello@laom.fr>',
              to: [metadata.email],
              bcc: ['laomcoliving@gmail.com'],
              subject: 'Ta réservation En Mouvement est confirmée — LAOM',
              html,
            }),
          })
            .then(async (r) => {
              if (!r.ok) {
                const err = await r.json().catch(() => ({}))
                console.error('Resend send error (en-mouvement):', err)
              } else {
                console.log(`Resend: en-mouvement confirmation email sent to ${metadata.email}`)
              }
            })
            .catch((e) => console.error('Resend fetch error (en-mouvement, non-blocking):', e))
        } catch (mailErr) {
          console.error('En-mouvement email confirmation error (non-blocking):', mailErr)
        }
      } else {
        console.warn('RESEND_API_KEY not configured, skipping en-mouvement confirmation email')
      }
    }
    // ----- Fin email En Mouvement -----

    // Si c'est le 1er versement d'un paiement en 2x et qu'il est paye,
    // creer le 2eme versement recurrent (preleve automatiquement dans 30 jours)
    if (status === 'paid' && metadata.installment === '1of2') {
      const customerId = payment.customerId
      const mandateId = payment.mandateId

      if (customerId && mandateId) {
        try {
          const secondPayment = await fetch('https://api.mollie.com/v2/payments', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${activeApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              amount: { currency: 'EUR', value: '248.50' },
              description: 'LAOM School Online — Paiement 2/2 (248,50 EUR)',
              sequenceType: 'recurring',
              customerId,
              mandateId,
              webhookUrl: `${origin}/api/mollie/webhook/`,
              metadata: {
                product: 'school-online-2x',
                email: metadata.email || null,
                installment: '2of2',
                total_amount: '497.00',
                created_at: new Date().toISOString(),
              },
              // Programmer le prelevement dans 30 jours
              dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
                .toISOString()
                .split('T')[0],
            }),
          })

          if (secondPayment.ok) {
            const secondData = (await secondPayment.json()) as any
            console.log(
              `Mollie: 2nd installment created: ${secondData.id} (due ${secondData.dueDate})`,
            )

            // Stocker le 2eme versement en D1
            if (db) {
              try {
                await db
                  .prepare(
                    `INSERT INTO mollie_payments (payment_id, product, email, amount, status, created_at)
                     VALUES (?, ?, ?, ?, ?, ?)`,
                  )
                  .bind(
                    secondData.id,
                    'school-online-2x',
                    metadata.email || null,
                    '248.50',
                    secondData.status,
                    new Date().toISOString(),
                  )
                  .run()
              } catch (dbError) {
                console.error('D1 insert 2nd installment error (non-blocking):', dbError)
              }
            }
          } else {
            const errData = (await secondPayment.json()) as any
            console.error('Mollie: failed to create 2nd installment:', errData)
          }
        } catch (err) {
          console.error('Mollie: error creating 2nd installment:', err)
        }
      } else {
        console.warn(
          `Mollie: 1st installment paid but no customerId/mandateId for recurring. Payment: ${paymentId}`,
        )
      }
    }

    // Quand un paiement est confirme, tagger le subscriber dans Kit (API v4)
    // Tag specifique au produit pour segmentation fine
    if (status === 'paid' && metadata.email && metadata.installment !== '2of2') {
      const kitApiSecret = env?.KIT_API_SECRET
      if (kitApiSecret) {
        const tagName = PRODUCT_TAG_MAP[metadata.product] || 'laom-school-online'

        try {
          // Kit API v4 : lister les tags
          const tagsRes = await fetch('https://api.kit.com/v4/tags', {
            headers: {
              'X-Kit-Api-Key': kitApiSecret,
              Accept: 'application/json',
            },
          })
          let tagId: number | null = null

          if (tagsRes.ok) {
            const tagsData = (await tagsRes.json()) as any
            const existingTag = (tagsData.tags || []).find(
              (t: any) => t.name === tagName,
            )
            if (existingTag) {
              tagId = existingTag.id
            }
          }

          // Si le tag n'existe pas encore, le creer
          if (!tagId) {
            const createTagRes = await fetch('https://api.kit.com/v4/tags', {
              method: 'POST',
              headers: {
                'X-Kit-Api-Key': kitApiSecret,
                'Content-Type': 'application/json',
                Accept: 'application/json',
              },
              body: JSON.stringify({ name: tagName }),
            })
            if (createTagRes.ok) {
              const created = (await createTagRes.json()) as any
              tagId = created.tag?.id || created.id
            }
          }

          // Tagger le subscriber par email
          if (tagId) {
            const tagSubRes = await fetch(
              `https://api.kit.com/v4/tags/${tagId}/subscribers`,
              {
                method: 'POST',
                headers: {
                  'X-Kit-Api-Key': kitApiSecret,
                  'Content-Type': 'application/json',
                  Accept: 'application/json',
                },
                body: JSON.stringify({
                  email_address: metadata.email,
                }),
              },
            )

            if (tagSubRes.ok) {
              console.log(
                `Kit v4: tagged ${metadata.email} with "${tagName}" (tag ${tagId})`,
              )
            } else {
              const errData = (await tagSubRes.json()) as any
              console.error('Kit v4: failed to tag subscriber:', errData)
            }
          } else {
            console.error(`Kit v4: could not find or create tag "${tagName}"`)
          }

          // Aussi tagger avec le tag generique "laom-school-online" pour compatibilite
          if (tagName !== 'laom-school-online') {
            try {
              // Chercher ou creer le tag generique
              let genericTagId: number | null = null
              if (tagsRes.ok) {
                const tagsData = (await tagsRes.json()) as any
                const genericTag = (tagsData.tags || []).find(
                  (t: any) => t.name === 'laom-school-online',
                )
                if (genericTag) genericTagId = genericTag.id
              }

              if (!genericTagId) {
                const createRes = await fetch('https://api.kit.com/v4/tags', {
                  method: 'POST',
                  headers: {
                    'X-Kit-Api-Key': kitApiSecret,
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                  },
                  body: JSON.stringify({ name: 'laom-school-online' }),
                })
                if (createRes.ok) {
                  const data = (await createRes.json()) as any
                  genericTagId = data.tag?.id || data.id
                }
              }

              if (genericTagId) {
                await fetch(`https://api.kit.com/v4/tags/${genericTagId}/subscribers`, {
                  method: 'POST',
                  headers: {
                    'X-Kit-Api-Key': kitApiSecret,
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                  },
                  body: JSON.stringify({ email_address: metadata.email }),
                })
              }
            } catch (e) {
              console.error('Kit v4: error tagging generic (non-blocking):', e)
            }
          }
        } catch (kitErr) {
          console.error('Kit v4: error tagging subscriber (non-blocking):', kitErr)
        }
      } else {
        console.warn('Kit: KIT_API_SECRET not configured, skipping tag')
      }
    }

    return new Response('OK', { status: 200 })
  } catch (err) {
    console.error('Mollie webhook error:', err)
    return new Response('Internal error', { status: 500 })
  }
}
