import type { APIRoute } from 'astro'

/**
 * POST /api/mollie/create-payment/
 *
 * Body JSON :
 *   - product: 'school-online' | 'school-online-2x' | 'school-merci'
 *   - email?: string (optionnel, pour metadata)
 *
 * Crée un paiement Mollie et renvoie l'URL de checkout.
 *
 * Produits :
 *   - school-online   : LAOM School Online — 497 EUR (paiement unique)
 *   - school-online-2x: LAOM School Online — 2 x 248.50 EUR (paiement en 2 fois)
 *   - school-merci    : LAOM School Online — 147 EUR (offre inscrits webinar)
 */

interface ProductConfig {
  amount: string
  description: string
  installments?: number // nombre de versements (pour paiement en plusieurs fois)
  installmentAmount?: string // montant de chaque versement
}

const PRODUCTS: Record<string, ProductConfig> = {
  'school-online': {
    amount: '497.00',
    description: 'LAOM School Online — Formation + 12 lives (497 EUR)',
  },
  'school-online-2x': {
    amount: '248.50',
    description: 'LAOM School Online — Paiement 1/2 (248,50 EUR)',
    installments: 2,
    installmentAmount: '248.50',
  },
  'school-merci': {
    amount: '147.00',
    description: 'LAOM School Online — Offre inscrits (147 EUR)',
  },
}

export const POST: APIRoute = async ({ request, locals }) => {
  const env = (locals as any).runtime?.env
  const apiKey = env?.MOLLIE_API_KEY

  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: 'Payment service not configured' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    )
  }

  let body: Record<string, any>
  try {
    body = await request.json()
  } catch {
    return new Response(
      JSON.stringify({ error: 'Invalid JSON body' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    )
  }

  const { product, email } = body
  const productConfig = PRODUCTS[product]

  if (!productConfig) {
    return new Response(
      JSON.stringify({
        error: 'Invalid product. Use: school-online, school-online-2x, or school-merci',
      }),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    )
  }

  // Construire l'URL de base pour les redirections
  const origin = new URL(request.url).origin

  // Pour le paiement en 2 fois, on crée d'abord le 1er paiement
  // Le 2ème sera créé manuellement ou via webhook quand le 1er est payé
  const isInstallment = product === 'school-online-2x'

  const molliePayload: Record<string, any> = {
    amount: {
      currency: 'EUR',
      value: productConfig.amount,
    },
    description: productConfig.description,
    redirectUrl: `${origin}/school/confirmation/?product=${product}`,
    webhookUrl: `${origin}/api/mollie/webhook/`,
    metadata: {
      product,
      email: email || null,
      installment: isInstallment ? '1of2' : null,
      total_amount: isInstallment ? '497.00' : productConfig.amount,
      created_at: new Date().toISOString(),
    },
  }

  // Pour le paiement en 2x, on ajoute sequenceType pour pouvoir créer
  // le 2ème paiement automatiquement plus tard
  if (isInstallment) {
    molliePayload.sequenceType = 'first'
  }

  try {
    const response = await fetch('https://api.mollie.com/v2/payments', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(molliePayload),
    })

    if (!response.ok) {
      const errorData = (await response.json()) as any
      console.error('Mollie API error:', errorData)
      return new Response(
        JSON.stringify({ error: 'Payment creation failed', detail: errorData?.detail }),
        { status: response.status, headers: { 'Content-Type': 'application/json' } },
      )
    }

    const payment = (await response.json()) as any
    const checkoutUrl = payment._links?.checkout?.href

    if (!checkoutUrl) {
      return new Response(
        JSON.stringify({ error: 'No checkout URL returned' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } },
      )
    }

    // Stocker le paiement en D1 si disponible
    const db = env?.DB
    if (db) {
      try {
        await db
          .prepare(
            `INSERT INTO mollie_payments (payment_id, product, email, amount, status, created_at)
           VALUES (?, ?, ?, ?, ?, ?)`,
          )
          .bind(
            payment.id,
            product,
            email || null,
            productConfig.amount,
            payment.status,
            new Date().toISOString(),
          )
          .run()
      } catch (dbError) {
        // Log mais ne bloque pas le paiement
        console.error('D1 insert error (non-blocking):', dbError)
      }
    }

    return new Response(
      JSON.stringify({ checkoutUrl, paymentId: payment.id }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    console.error('Mollie fetch error:', err)
    return new Response(
      JSON.stringify({ error: 'Payment service unavailable' }),
      { status: 502, headers: { 'Content-Type': 'application/json' } },
    )
  }
}
