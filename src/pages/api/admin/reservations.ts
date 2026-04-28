import type { APIRoute } from 'astro'

/**
 * GET /api/admin/reservations/
 *
 * Liste toutes les réservations payées (Chillworking + School + autres),
 * enrichies avec les metadata Mollie (prénom, nom, email, téléphone, etc.).
 *
 * Query params :
 *   - password: string (protection basique)
 *   - product?: filtre par produit (ex: 'chillworking', 'school-online')
 */

const ADMIN_PASSWORD = 'laom2026'

interface Reservation {
  payment_id: string
  product: string
  status: string
  amount: string
  created_at: string
  // Metadata depuis Mollie
  firstName: string | null
  lastName: string | null
  email: string | null
  phone: string | null
  session: string | null
  arrivalDate: string | null
  nights: number | null
  coupon: string | null
  description: string | null
}

export const GET: APIRoute = async ({ request, locals }) => {
  const env = (locals as any).runtime?.env
  const db = env?.DB
  const mollieKey = env?.MOLLIE_API_KEY
  const url = new URL(request.url)

  const password = url.searchParams.get('password')
  if (password !== ADMIN_PASSWORD) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  if (!db) {
    return new Response(JSON.stringify({ error: 'DB not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const productFilter = url.searchParams.get('product')

  try {
    let query = `SELECT payment_id, product, email, amount, status, created_at
                 FROM mollie_payments
                 WHERE status = 'paid'`
    const params: any[] = []
    if (productFilter) {
      query += ` AND product LIKE ?`
      params.push(`${productFilter}%`)
    }
    query += ` ORDER BY created_at DESC LIMIT 200`

    const stmt = params.length ? db.prepare(query).bind(...params) : db.prepare(query)
    const result = await stmt.all()
    const rows = (result?.results || []) as any[]

    // Enrichir chaque réservation avec metadata Mollie
    const reservations: Reservation[] = await Promise.all(
      rows.map(async (row): Promise<Reservation> => {
        const base: Reservation = {
          payment_id: row.payment_id,
          product: row.product,
          status: row.status,
          amount: row.amount,
          created_at: row.created_at,
          firstName: null,
          lastName: null,
          email: row.email,
          phone: null,
          session: null,
          arrivalDate: null,
          nights: null,
          coupon: null,
          description: null,
        }

        if (!mollieKey) return base

        try {
          const res = await fetch(`https://api.mollie.com/v2/payments/${row.payment_id}`, {
            headers: { Authorization: `Bearer ${mollieKey}` },
          })
          if (!res.ok) return base
          const payment = (await res.json()) as any
          const md = payment.metadata || {}
          return {
            ...base,
            firstName: md.firstName || null,
            lastName: md.lastName || null,
            email: md.email || row.email,
            phone: md.phone || null,
            session: md.session || null,
            arrivalDate: md.arrivalDate || null,
            nights: md.nights ? Number(md.nights) : null,
            coupon: md.coupon || null,
            description: payment.description || null,
          }
        } catch {
          return base
        }
      }),
    )

    // Group by product for summary
    const byProduct: Record<string, { count: number; total: number }> = {}
    for (const r of reservations) {
      const key = (r.product || 'unknown').replace(/-juin.*|-aout.*|-\d+n.*/g, '')
      if (!byProduct[key]) byProduct[key] = { count: 0, total: 0 }
      byProduct[key].count += 1
      byProduct[key].total += parseFloat(r.amount || '0')
    }

    return new Response(
      JSON.stringify({
        reservations,
        summary: {
          total_count: reservations.length,
          total_revenue: reservations.reduce(
            (s, r) => s + parseFloat(r.amount || '0'),
            0,
          ),
          by_product: byProduct,
        },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    )
  } catch (err: any) {
    console.error('admin/reservations error:', err)
    return new Response(
      JSON.stringify({ error: 'Internal error', detail: err?.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    )
  }
}
