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

  if (!apiKey) {
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
    const response = await fetch(`https://api.mollie.com/v2/payments/${paymentId}`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    })

    if (!response.ok) {
      console.error(`Mollie webhook: failed to fetch payment ${paymentId}`, response.status)
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
              Authorization: `Bearer ${apiKey}`,
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
