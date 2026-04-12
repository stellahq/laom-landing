import type { APIRoute } from 'astro'

/**
 * POST /api/mollie/webhook/
 *
 * Mollie envoie un POST avec { id: 'tr_xxx' } quand le statut d'un paiement change.
 * On récupère le paiement via l'API Mollie pour vérifier le statut réel.
 *
 * Si le paiement est un 1er versement (installment 1of2) et qu'il est payé,
 * on programme automatiquement le 2ème versement via un paiement récurrent.
 */

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
    // Fallback JSON (au cas où)
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

  // Construire l'URL de base pour le webhook du 2ème versement
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

    // Mettre à jour en D1
    const db = env?.DB
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

    // Si c'est le 1er versement d'un paiement en 2x et qu'il est payé,
    // créer le 2ème versement récurrent (prélevé automatiquement dans 30 jours)
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
              // Programmer le prélèvement dans 30 jours
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

            // Stocker le 2ème versement en D1
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

    // Quand un paiement est confirmé, tagger le subscriber dans Kit (ex-ConvertKit)
    // pour déclencher l'automation d'email de bienvenue
    if (status === 'paid' && metadata.email && metadata.installment !== '2of2') {
      const kitApiSecret = env?.KIT_API_SECRET
      if (kitApiSecret) {
        try {
          // 1. Trouver ou créer le tag "laom-school-online"
          const tagsRes = await fetch('https://api.convertkit.com/v3/tags', {
            headers: { 'Content-Type': 'application/json' },
          })
          let tagId: number | null = null

          if (tagsRes.ok) {
            const tagsData = (await tagsRes.json()) as any
            const existingTag = tagsData.tags?.find(
              (t: any) => t.name === 'laom-school-online',
            )
            if (existingTag) {
              tagId = existingTag.id
            }
          }

          // Si le tag n'existe pas encore, le créer
          if (!tagId) {
            const createTagRes = await fetch('https://api.convertkit.com/v3/tags', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                api_secret: kitApiSecret,
                tag: { name: 'laom-school-online' },
              }),
            })
            if (createTagRes.ok) {
              const created = (await createTagRes.json()) as any
              tagId = created.tag?.id || created.id
            }
          }

          // 2. Tagger le subscriber
          if (tagId) {
            const tagSubRes = await fetch(
              `https://api.convertkit.com/v3/tags/${tagId}/subscribe`,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  api_secret: kitApiSecret,
                  email: metadata.email,
                }),
              },
            )

            if (tagSubRes.ok) {
              console.log(
                `Kit: tagged ${metadata.email} with "laom-school-online" (tag ${tagId})`,
              )
            } else {
              const errData = (await tagSubRes.json()) as any
              console.error('Kit: failed to tag subscriber:', errData)
            }
          } else {
            console.error('Kit: could not find or create tag "laom-school-online"')
          }
        } catch (kitErr) {
          console.error('Kit: error tagging subscriber (non-blocking):', kitErr)
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
