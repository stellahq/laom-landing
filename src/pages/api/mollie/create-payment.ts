import type { APIRoute } from 'astro'

/**
 * POST /api/mollie/create-payment/
 *
 * Body JSON :
 *   - product: 'school-online' | 'school-online-2x' | 'school-merci' | 'chillworking' | 'forum-eco-construction'
 *   - email?: string (optionnel, pour metadata)
 *
 *   Pour 'chillworking', ajouter :
 *   - session: 'juin' | 'aout'
 *   - nights: number (5..14)
 *   - arrivalDate: 'YYYY-MM-DD'
 *   - coupon?: string (ex: 'TRIBULAOM' pour -20%)
 *   - name: string
 *
 *   Pour 'forum-eco-construction', ajouter :
 *   - email: string
 *   - firstName?: string
 *   - meals: string[]  (IDs parmi : ven-diner, sam-pdej, sam-dej, sam-diner, dim-pdej, dim-dej)
 */

interface ProductConfig {
  amount: string
  description: string
  installments?: number
  installmentAmount?: string
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
  'school-live': {
    amount: '297.00',
    description: 'LAOM School Online — Offre live exclusive (297 EUR)',
  },
  'school-live-2x': {
    amount: '148.50',
    description: 'LAOM School Online — Offre live, paiement 1/2 (148,50 EUR)',
    installments: 2,
    installmentAmount: '148.50',
  },
}

// Sessions Chillworking 2026
const CHILLWORKING_SESSIONS: Record<string, { start: string; end: string; label: string }> = {
  juin: { start: '2026-06-15', end: '2026-06-28', label: 'Juin 2026' },
  aout: { start: '2026-08-06', end: '2026-08-20', label: 'Août 2026' },
}

const CHILLWORKING_COUPONS: Record<string, number> = {
  TRIBULAOM: 0.2, // -20%
}

interface ChillworkingPricing {
  base: number
  discount: number
  total: number
  description: string
  coupon: string | null
}

function computeChillworkingPrice(
  nights: number,
  session: string,
  arrivalDate: string,
  coupon: string | undefined,
): ChillworkingPricing | { error: string } {
  if (!Number.isInteger(nights) || nights < 5 || nights > 14) {
    return { error: 'Le nombre de nuits doit être entre 5 et 14.' }
  }

  const sess = CHILLWORKING_SESSIONS[session]
  if (!sess) return { error: 'Session invalide. Choisis "juin" ou "aout".' }

  const arrival = new Date(arrivalDate + 'T00:00:00Z')
  const sessionStart = new Date(sess.start + 'T00:00:00Z')
  const sessionEnd = new Date(sess.end + 'T00:00:00Z')

  if (Number.isNaN(arrival.getTime())) return { error: 'Date d\'arrivée invalide.' }
  if (arrival < sessionStart) {
    return { error: `Date d'arrivée trop tôt. La session ${sess.label} commence le ${sess.start}.` }
  }
  const departure = new Date(arrival.getTime() + nights * 86400000)
  if (departure > sessionEnd) {
    return { error: `Avec ${nights} nuits, le départ dépasse la fin de la session (${sess.end}).` }
  }

  // Pricing : à partir de 12 nuits, on bascule auto au forfait 2000€
  const base = nights >= 12 ? 2000 : nights * 180

  // Coupon
  let discount = 0
  let couponApplied: string | null = null
  if (coupon) {
    const couponKey = coupon.trim().toUpperCase()
    const rate = CHILLWORKING_COUPONS[couponKey]
    if (rate) {
      discount = Math.round(base * rate * 100) / 100
      couponApplied = couponKey
    } else {
      return { error: 'Code promo invalide.' }
    }
  }

  const total = base - discount
  const departureStr = departure.toISOString().slice(0, 10)
  const description = `Chillworking LAOM — ${nights} nuits du ${arrivalDate} au ${departureStr} (session ${sess.label})${
    couponApplied ? ` — coupon ${couponApplied} -20%` : ''
  }`

  return { base, discount, total, description, coupon: couponApplied }
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
  const origin = new URL(request.url).origin

  // ---- Cas spécial : Chillworking (prix dynamique server-side) ----
  if (product === 'chillworking') {
    const { session, nights, arrivalDate, coupon, name, firstName, lastName, phone } = body
    if (!email || !name) {
      return new Response(
        JSON.stringify({ error: 'Email et nom requis.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      )
    }
    const pricing = computeChillworkingPrice(Number(nights), String(session), String(arrivalDate), coupon)
    if ('error' in pricing) {
      return new Response(
        JSON.stringify({ error: pricing.error }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      )
    }

    const isLocalhost = /^https?:\/\/(localhost|127\.0\.0\.1)/i.test(origin)
    const molliePayload: Record<string, any> = {
      amount: {
        currency: 'EUR',
        value: pricing.total.toFixed(2),
      },
      description: pricing.description,
      method: 'creditcard',
      redirectUrl: `${origin}/chillworking/merci/`,
      ...(isLocalhost ? {} : { webhookUrl: `${origin}/api/mollie/webhook/` }),
      metadata: {
        product: 'chillworking',
        session,
        nights,
        arrivalDate,
        coupon: pricing.coupon,
        base: pricing.base,
        discount: pricing.discount,
        total: pricing.total,
        email,
        name,
        firstName: firstName || null,
        lastName: lastName || null,
        phone: phone || null,
        created_at: new Date().toISOString(),
      },
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
        console.error('Mollie API error (chillworking):', errorData)
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
              `chillworking-${session}-${nights}n${pricing.coupon ? '-' + pricing.coupon : ''}`,
              email,
              pricing.total.toFixed(2),
              payment.status,
              new Date().toISOString(),
            )
            .run()
        } catch (dbError) {
          console.error('D1 insert error (non-blocking):', dbError)
        }
      }

      return new Response(
        JSON.stringify({ checkoutUrl, paymentId: payment.id, total: pricing.total }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      )
    } catch (err) {
      console.error('Mollie fetch error (chillworking):', err)
      return new Response(
        JSON.stringify({ error: 'Payment service unavailable' }),
        { status: 502, headers: { 'Content-Type': 'application/json' } },
      )
    }
  }
  // ---- Fin Chillworking ----

  // ---- En Mouvement (août 2026) ----
  if (product === 'en-mouvement') {
    const EM_BASE = 1100
    const EM_SESSIONS: Record<string, { dates: string; label: string }> = {
      session1: { dates: '5 — 9 août 2026', label: 'En Mouvement' },
    }
    const EM_COUPONS: Record<string, number> = { TRIBULAOM: 0.2 }

    const { firstName, lastName, phone, session, coupon } = body
    if (!email || !firstName || !lastName) {
      return new Response(
        JSON.stringify({ error: 'Prénom, nom et email requis.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      )
    }
    const sess = EM_SESSIONS[String(session)]
    if (!sess) {
      return new Response(
        JSON.stringify({ error: 'Session invalide.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      )
    }

    let discount = 0
    let couponApplied: string | null = null
    if (coupon) {
      const couponKey = String(coupon).trim().toUpperCase()
      const rate = EM_COUPONS[couponKey]
      if (!rate) {
        return new Response(
          JSON.stringify({ error: 'Code promo invalide.' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } },
        )
      }
      discount = Math.round(EM_BASE * rate * 100) / 100
      couponApplied = couponKey
    }
    const total = EM_BASE - discount
    const description = `En Mouvement LAOM — ${sess.label} (${sess.dates})${couponApplied ? ` — coupon ${couponApplied} -20%` : ''}`

    const isLocalhost = /^https?:\/\/(localhost|127\.0\.0\.1)/i.test(origin)
    const molliePayload: Record<string, any> = {
      amount: { currency: 'EUR', value: total.toFixed(2) },
      description,
      method: 'creditcard',
      redirectUrl: `${origin}/stage-danse/merci/`,
      ...(isLocalhost ? {} : { webhookUrl: `${origin}/api/mollie/webhook/` }),
      metadata: {
        product: 'en-mouvement',
        email,
        firstName,
        lastName,
        phone: phone || null,
        session: String(session),
        sessionLabel: sess.label,
        sessionDates: sess.dates,
        base: EM_BASE,
        discount,
        coupon: couponApplied,
        total,
        created_at: new Date().toISOString(),
      },
    }

    try {
      const response = await fetch('https://api.mollie.com/v2/payments', {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(molliePayload),
      })
      if (!response.ok) {
        const errorData = (await response.json()) as any
        console.error('Mollie API error (en-mouvement):', errorData)
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
              `en-mouvement-${session}${couponApplied ? '-' + couponApplied : ''}`,
              email,
              total.toFixed(2),
              payment.status,
              new Date().toISOString(),
            )
            .run()
        } catch (dbError) {
          console.error('D1 insert error (non-blocking):', dbError)
        }
      }

      return new Response(
        JSON.stringify({ checkoutUrl, paymentId: payment.id, total }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      )
    } catch (err) {
      console.error('Mollie fetch error (en-mouvement):', err)
      return new Response(
        JSON.stringify({ error: 'Payment service unavailable' }),
        { status: 502, headers: { 'Content-Type': 'application/json' } },
      )
    }
  }
  // ---- Fin En Mouvement ----

  // ---- Forum Éco-Construction (3-5 juillet 2026) ----
  if (product === 'forum-eco-construction') {
    // Cette page tourne en mode test pendant la phase de validation :
    // utiliser MOLLIE_API_KEY_TEST si défini, sinon retomber sur la clé principale.
    const forumApiKey = env?.MOLLIE_API_KEY_TEST || apiKey
    const FORUM_BASE = 60
    const MEALS: Record<string, { price: number; label: string }> = {
      'ven-diner': { price: 20, label: 'Vendredi 3 — Dîner' },
      'sam-pdej': { price: 15, label: 'Samedi 4 — Petit-déj' },
      'sam-dej': { price: 20, label: 'Samedi 4 — Déjeuner' },
      'sam-diner': { price: 20, label: 'Samedi 4 — Dîner' },
      'dim-pdej': { price: 15, label: 'Dimanche 5 — Petit-déj' },
      'dim-dej': { price: 20, label: 'Dimanche 5 — Déjeuner' },
    }

    const { firstName, lastName, phone, meals } = body
    if (!email) {
      return new Response(
        JSON.stringify({ error: 'Email requis.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      )
    }
    if (!Array.isArray(meals)) {
      return new Response(
        JSON.stringify({ error: 'meals doit être un tableau.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      )
    }

    const selected = Array.from(new Set(meals.map(String)))
    let mealsTotal = 0
    const selectedLabels: string[] = []
    for (const id of selected) {
      const meal = MEALS[id]
      if (!meal) {
        return new Response(
          JSON.stringify({ error: `Repas inconnu : ${id}` }),
          { status: 400, headers: { 'Content-Type': 'application/json' } },
        )
      }
      mealsTotal += meal.price
      selectedLabels.push(meal.label)
    }

    const total = FORUM_BASE + mealsTotal
    const description = `Forum Éco-Construction LAOM — Pass 60 € + ${selected.length} repas (${mealsTotal} €) — Total ${total} €`

    const isLocalhost = /^https?:\/\/(localhost|127\.0\.0\.1)/i.test(origin)
    const molliePayload: Record<string, any> = {
      amount: { currency: 'EUR', value: total.toFixed(2) },
      description,
      method: 'creditcard',
      redirectUrl: `${origin}/forum-eco-construction/merci/`,
      ...(isLocalhost ? {} : { webhookUrl: `${origin}/api/mollie/webhook/` }),
      metadata: {
        product: 'forum-eco-construction',
        email,
        firstName: firstName || null,
        lastName: lastName || null,
        phone: phone || null,
        base: FORUM_BASE,
        mealsTotal,
        total,
        meals: selected,
        mealsLabels: selectedLabels,
        created_at: new Date().toISOString(),
      },
    }

    try {
      const response = await fetch('https://api.mollie.com/v2/payments', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${forumApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(molliePayload),
      })
      if (!response.ok) {
        const errorData = (await response.json()) as any
        console.error('Mollie API error (forum-eco-construction):', errorData)
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
              `forum-eco-construction-${selected.length}meals`,
              email,
              total.toFixed(2),
              payment.status,
              new Date().toISOString(),
            )
            .run()
        } catch (dbError) {
          console.error('D1 insert error (non-blocking):', dbError)
        }
      }

      return new Response(
        JSON.stringify({ checkoutUrl, paymentId: payment.id, total }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      )
    } catch (err) {
      console.error('Mollie fetch error (forum-eco-construction):', err)
      return new Response(
        JSON.stringify({ error: 'Payment service unavailable' }),
        { status: 502, headers: { 'Content-Type': 'application/json' } },
      )
    }
  }
  // ---- Fin Forum Éco-Construction ----

  const productConfig = PRODUCTS[product]

  if (!productConfig) {
    return new Response(
      JSON.stringify({
        error: 'Invalid product. Use: school-online, school-online-2x, school-merci, or chillworking',
      }),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    )
  }

  // Pour le paiement en 2 fois, on crée d'abord le 1er paiement
  // Le 2ème sera créé manuellement ou via webhook quand le 1er est payé
  const isInstallment = product === 'school-online-2x' || product === 'school-live-2x'
  const installmentTotalAmount =
    product === 'school-online-2x'
      ? '497.00'
      : product === 'school-live-2x'
      ? '297.00'
      : productConfig.amount

  const molliePayload: Record<string, any> = {
    amount: {
      currency: 'EUR',
      value: productConfig.amount,
    },
    description: productConfig.description,
    method: 'creditcard',
    redirectUrl: `${origin}/school/confirmation/?product=${product}`,
    webhookUrl: `${origin}/api/mollie/webhook/`,
    metadata: {
      product,
      email: email || null,
      installment: isInstallment ? '1of2' : null,
      total_amount: isInstallment ? installmentTotalAmount : productConfig.amount,
      created_at: new Date().toISOString(),
    },
  }

  // Pour le paiement en 2x, on crée d'abord un customer Mollie
  // puis on ajoute sequenceType pour pouvoir créer le 2ème paiement automatiquement
  if (isInstallment) {
    try {
      const customerRes = await fetch('https://api.mollie.com/v2/customers', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: email || 'Client LAOM School',
          email: email || undefined,
        }),
      })

      if (customerRes.ok) {
        const customer = (await customerRes.json()) as any
        molliePayload.customerId = customer.id
        molliePayload.sequenceType = 'first'
      } else {
        const errData = (await customerRes.json()) as any
        console.error('Mollie: failed to create customer for 2x payment:', errData)
        return new Response(
          JSON.stringify({ error: 'Failed to set up installment payment' }),
          { status: 500, headers: { 'Content-Type': 'application/json' } },
        )
      }
    } catch (err) {
      console.error('Mollie: error creating customer:', err)
      return new Response(
        JSON.stringify({ error: 'Payment service unavailable' }),
        { status: 502, headers: { 'Content-Type': 'application/json' } },
      )
    }
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
