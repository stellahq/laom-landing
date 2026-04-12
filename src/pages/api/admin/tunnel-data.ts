import type { APIRoute } from 'astro'

/**
 * GET /api/admin/tunnel-data/
 *
 * Agrege les donnees du tunnel depuis D1 (tunnel_events + mollie_payments)
 * et optionnellement Kit API v4 pour le dashboard /admin/tunnel/.
 *
 * Query params :
 *   - period: 'today' | '7d' | '30d' | 'all' (default: '7d')
 *   - password: string (protection basique)
 *
 * Response JSON :
 *   - funnel: { step, count, unique_sessions, conversion_rate, leak_rate }[]
 *   - sources: { source, count, percentage }[]
 *   - vsl_retention: { milestone, count, rate }[]
 *   - revenue: { product, count, amount, total }[]
 *   - timeline: { date, registrations, oto_sales, school_sales }[]
 *   - exit_intents: { popup_index, shown, clicked, click_rate }[]
 *   - kit_stats: { subscribers, growth } | null
 *   - meta: { period, from, to, total_events }
 */

const ADMIN_PASSWORD = 'laom2026' // Meme mdp que strategie-2026

export const GET: APIRoute = async ({ request, locals }) => {
  const env = (locals as any).runtime?.env
  const db = env?.DB
  const url = new URL(request.url)

  // Auth basique par query param
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

  const period = url.searchParams.get('period') || '7d'
  const now = new Date()
  let fromDate: string

  switch (period) {
    case 'today':
      fromDate = now.toISOString().split('T')[0]
      break
    case '7d':
      fromDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      break
    case '30d':
      fromDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      break
    case 'all':
      fromDate = '2020-01-01'
      break
    default:
      fromDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  }

  const toDate = now.toISOString()

  try {
    // 1. Funnel steps — count par event_type
    const funnelQuery = await db
      .prepare(
        `SELECT event_type, COUNT(*) as count, COUNT(DISTINCT session_id) as unique_sessions
         FROM tunnel_events
         WHERE created_at >= ?
         GROUP BY event_type
         ORDER BY count DESC`,
      )
      .bind(fromDate)
      .all()

    // Definir l'ordre du funnel pour les taux de conversion
    const FUNNEL_ORDER = [
      { step: 'talk_page_view', event: 'page_view', page: '/talk/' },
      { step: 'talk_form_submit', event: 'form_submit', page: '/talk/' },
      { step: 'merci_page_view', event: 'page_view', page: '/school/merci/' },
      { step: 'vsl_start', event: 'vsl_start', page: null },
      { step: 'vsl_complete', event: 'vsl_complete', page: null },
      { step: 'oto_cta_click', event: 'cta_click', page: '/school/merci/' },
      { step: 'oto_checkout', event: 'checkout_initiated', page: '/school/merci/' },
      { step: 'oto_paid', event: 'payment_completed', product: 'school-merci' },
      { step: 'online_page_view', event: 'page_view', page: '/school/online/' },
      { step: 'online_checkout', event: 'checkout_initiated', page: '/school/online/' },
      { step: 'online_paid', event: 'payment_completed', product: 'school-online' },
      { step: 'confirmation_view', event: 'page_view', page: '/school/confirmation/' },
    ]

    // Requete detaillee par page pour les page_views
    const pageViewsQuery = await db
      .prepare(
        `SELECT page, event_type, COUNT(*) as count, COUNT(DISTINCT session_id) as unique_sessions
         FROM tunnel_events
         WHERE created_at >= ?
         GROUP BY page, event_type`,
      )
      .bind(fromDate)
      .all()

    // Requete paiements par produit
    const paymentsQuery = await db
      .prepare(
        `SELECT product, event_type, COUNT(*) as count
         FROM tunnel_events
         WHERE created_at >= ? AND event_type IN ('payment_completed', 'payment_failed', 'checkout_initiated')
         GROUP BY product, event_type`,
      )
      .bind(fromDate)
      .all()

    // Construire le funnel
    const pageEventMap = new Map<string, any>()
    for (const row of (pageViewsQuery.results || []) as any[]) {
      pageEventMap.set(`${row.page}|${row.event_type}`, row)
    }

    const eventMap = new Map<string, any>()
    for (const row of (funnelQuery.results || []) as any[]) {
      eventMap.set(row.event_type, row)
    }

    const paymentMap = new Map<string, any>()
    for (const row of (paymentsQuery.results || []) as any[]) {
      paymentMap.set(`${row.product}|${row.event_type}`, row)
    }

    // Phase 1: extraire les counts bruts
    const rawFunnel = FUNNEL_ORDER.map((step) => {
      let count = 0
      let uniqueSessions = 0

      if (step.page && step.event === 'page_view') {
        const data = pageEventMap.get(`${step.page}|page_view`)
        count = data?.count || 0
        uniqueSessions = data?.unique_sessions || 0
      } else if ((step as any).product) {
        const data = paymentMap.get(`${(step as any).product}|${step.event}`)
        count = data?.count || 0
      } else if (step.page) {
        const data = pageEventMap.get(`${step.page}|${step.event}`)
        count = data?.count || 0
        uniqueSessions = data?.unique_sessions || 0
      } else {
        const data = eventMap.get(step.event)
        count = data?.count || 0
        uniqueSessions = data?.unique_sessions || 0
      }

      return { step: step.step, count, unique_sessions: uniqueSessions }
    })

    // Phase 2: calculer les taux de conversion (apres que tous les counts sont connus)
    const funnel = rawFunnel.map((item, i) => {
      const prevCount: number = i > 0 ? rawFunnel[i - 1].count : item.count
      const conversionRate: number = prevCount > 0 ? ((item.count / prevCount) * 100) : 0
      const leakRate: number = prevCount > 0 ? (((prevCount - item.count) / prevCount) * 100) : 0

      return {
        ...item,
        conversion_rate: Math.round(conversionRate * 10) / 10,
        leak_rate: Math.round(leakRate * 10) / 10,
      }
    })

    // 2. Sources de trafic
    const sourcesQuery = await db
      .prepare(
        `SELECT source, COUNT(*) as count
         FROM tunnel_events
         WHERE created_at >= ? AND event_type = 'page_view' AND page = '/talk/'
         GROUP BY source
         ORDER BY count DESC`,
      )
      .bind(fromDate)
      .all()

    const totalSourceViews = (sourcesQuery.results || []).reduce(
      (sum: number, r: any) => sum + r.count, 0,
    )
    const sources = ((sourcesQuery.results || []) as any[]).map((r) => ({
      source: r.source || 'unknown',
      count: r.count,
      percentage: totalSourceViews > 0 ? Math.round((r.count / totalSourceViews) * 1000) / 10 : 0,
    }))

    // 3. VSL retention
    const vslQuery = await db
      .prepare(
        `SELECT event_type, COUNT(*) as count
         FROM tunnel_events
         WHERE created_at >= ? AND event_type IN ('vsl_start', 'vsl_25', 'vsl_50', 'vsl_75', 'vsl_complete')
         GROUP BY event_type`,
      )
      .bind(fromDate)
      .all()

    const vslMap = new Map<string, number>()
    for (const r of (vslQuery.results || []) as any[]) {
      vslMap.set(r.event_type, r.count)
    }
    const vslStart = vslMap.get('vsl_start') || 0
    const vslRetention = [
      { milestone: 'start', count: vslStart, rate: 100 },
      { milestone: '25%', count: vslMap.get('vsl_25') || 0, rate: vslStart > 0 ? Math.round(((vslMap.get('vsl_25') || 0) / vslStart) * 100) : 0 },
      { milestone: '50%', count: vslMap.get('vsl_50') || 0, rate: vslStart > 0 ? Math.round(((vslMap.get('vsl_50') || 0) / vslStart) * 100) : 0 },
      { milestone: '75%', count: vslMap.get('vsl_75') || 0, rate: vslStart > 0 ? Math.round(((vslMap.get('vsl_75') || 0) / vslStart) * 100) : 0 },
      { milestone: 'complete', count: vslMap.get('vsl_complete') || 0, rate: vslStart > 0 ? Math.round(((vslMap.get('vsl_complete') || 0) / vslStart) * 100) : 0 },
    ]

    // 4. Revenue (from mollie_payments — TUNNEL PRODUCTS ONLY)
    const TUNNEL_PRODUCTS = ['school-merci', 'school-online', 'school-online-2x']
    const revenueQuery = await db
      .prepare(
        `SELECT product, COUNT(*) as count, SUM(CAST(amount AS REAL)) as total
         FROM mollie_payments
         WHERE status = 'paid' AND created_at >= ?
           AND product IN ('school-merci', 'school-online', 'school-online-2x')
         GROUP BY product`,
      )
      .bind(fromDate)
      .all()

    const revenue = ((revenueQuery.results || []) as any[]).map((r) => ({
      product: r.product,
      count: r.count,
      amount: r.product === 'school-online-2x' ? '248.50' : r.total / r.count,
      total: r.total,
    }))

    const totalRevenue = revenue.reduce((sum, r) => sum + (r.total || 0), 0)

    // 5. Timeline (daily)
    const timelineQuery = await db
      .prepare(
        `SELECT DATE(created_at) as date, event_type, page, COUNT(*) as count
         FROM tunnel_events
         WHERE created_at >= ?
         GROUP BY DATE(created_at), event_type, page
         ORDER BY date`,
      )
      .bind(fromDate)
      .all()

    // Grouper par date
    const timelineMap = new Map<string, any>()
    for (const r of (timelineQuery.results || []) as any[]) {
      if (!timelineMap.has(r.date)) {
        timelineMap.set(r.date, { date: r.date, talk_views: 0, registrations: 0, merci_views: 0, oto_sales: 0, school_sales: 0 })
      }
      const day = timelineMap.get(r.date)!
      if (r.event_type === 'page_view' && r.page === '/talk/') day.talk_views += r.count
      if (r.event_type === 'form_submit') day.registrations += r.count
      if (r.event_type === 'page_view' && r.page === '/school/merci/') day.merci_views += r.count
      if (r.event_type === 'payment_completed') {
        // On ne peut pas distinguer ici sans le product, on met tout dans school
        day.school_sales += r.count
      }
    }
    const timeline = Array.from(timelineMap.values())

    // 6. Exit intents
    const exitQuery = await db
      .prepare(
        `SELECT event_type, meta, COUNT(*) as count
         FROM tunnel_events
         WHERE created_at >= ? AND event_type IN ('exit_intent_shown', 'exit_intent_clicked')
         GROUP BY event_type`,
      )
      .bind(fromDate)
      .all()

    const exitShown = ((exitQuery.results || []) as any[]).find(r => r.event_type === 'exit_intent_shown')?.count || 0
    const exitClicked = ((exitQuery.results || []) as any[]).find(r => r.event_type === 'exit_intent_clicked')?.count || 0

    // 7. Kit stats (si API key dispo)
    // Source de verite pour les inscrits webinar : TAG 18610902 ("webinar-laomtalk-21-avril-2026")
    // Le form 8987350 est la newsletter generale (utilise sur tout le site), PAS le webinar
    let kitStats: any = null
    const kitApiSecret = env?.KIT_API_SECRET
    const KIT_HEADERS = kitApiSecret ? { 'X-Kit-Api-Key': kitApiSecret, Accept: 'application/json' } : null

    if (KIT_HEADERS) {
      try {
        // 7a. Subscribers du TAG 18610902 = vrais inscrits webinar
        // Ce tag est ajoute uniquement via le formulaire sur /talk/
        const WEBINAR_TAG_ID = '18610902'
        let webinarSubscribers: any[] = []
        let tagCursor: string | null = null
        let tagPageCount = 0
        const MAX_PAGES = 10

        do {
          const tagUrl = new URL(`https://api.kit.com/v4/tags/${WEBINAR_TAG_ID}/subscribers`)
          tagUrl.searchParams.set('per_page', '500')
          if (tagCursor) tagUrl.searchParams.set('after', tagCursor)

          const tagRes = await fetch(tagUrl.toString(), { headers: KIT_HEADERS })
          if (!tagRes.ok) break

          const tagData = (await tagRes.json()) as any
          const subs = tagData.subscribers || []
          webinarSubscribers = webinarSubscribers.concat(subs)

          tagCursor = tagData.pagination?.has_next_page ? tagData.pagination?.end_cursor : null
          tagPageCount++
        } while (tagCursor && tagPageCount < MAX_PAGES)

        // 7b. Inscrits par jour (utiliser tagged_at = quand ils se sont inscrits au webinar)
        const subscribersByDay = new Map<string, number>()
        for (const sub of webinarSubscribers) {
          // tagged_at = quand le tag webinar a ete applique (= inscription au webinar)
          const date = (sub.tagged_at || sub.created_at || '').split('T')[0]
          if (date) {
            subscribersByDay.set(date, (subscribersByDay.get(date) || 0) + 1)
          }
        }

        kitStats = {
          webinar_subscribers: webinarSubscribers.length,
          webinar_tag_name: 'webinar-laomtalk-21-avril-2026',
          subscribers_by_day: Object.fromEntries(
            Array.from(subscribersByDay.entries()).sort((a, b) => a[0].localeCompare(b[0]))
          ),
          // Liste des inscrits pour reference
          recent_subscribers: webinarSubscribers.slice(0, 10).map((s: any) => ({
            name: s.first_name || '—',
            email: s.email_address,
            tagged_at: s.tagged_at,
          })),
        }
      } catch (e) {
        console.error('Kit API error (non-blocking):', e)
      }
    }

    // 8. Cloudflare Stream Analytics (donnees video historiques)
    let streamAnalytics: any = null
    const cfApiToken = env?.CF_API_TOKEN
    const cfAccountId = env?.CF_ACCOUNT_ID
    const STREAM_VIDEO_ID = 'be148f8016e2b02ad6e8dff65bf84afe'

    if (cfApiToken && cfAccountId) {
      try {
        // GraphQL Analytics API pour Stream
        const streamQuery = `
          query {
            viewer {
              accounts(filter: { accountTag: "${cfAccountId}" }) {
                streamMinutesViewedAdaptiveGroups(
                  filter: { date_geq: "${fromDate}", uid: "${STREAM_VIDEO_ID}" }
                  limit: 1000
                  orderBy: [date_ASC]
                ) {
                  dimensions { date }
                  sum { minutesViewed }
                  count
                }
              }
            }
          }
        `
        const streamRes = await fetch('https://api.cloudflare.com/client/v4/graphql', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${cfApiToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ query: streamQuery }),
        })

        if (streamRes.ok) {
          const streamData = (await streamRes.json()) as any
          const groups = streamData?.data?.viewer?.accounts?.[0]?.streamMinutesViewedAdaptiveGroups || []

          let totalViews = 0
          let totalMinutes = 0
          const dailyViews: { date: string; views: number; minutes: number }[] = []

          for (const g of groups) {
            totalViews += g.count || 0
            totalMinutes += g.sum?.minutesViewed || 0
            dailyViews.push({
              date: g.dimensions?.date,
              views: g.count || 0,
              minutes: Math.round((g.sum?.minutesViewed || 0) * 10) / 10,
            })
          }

          streamAnalytics = {
            video_id: STREAM_VIDEO_ID,
            total_views: totalViews,
            total_minutes: Math.round(totalMinutes * 10) / 10,
            avg_minutes_per_view: totalViews > 0 ? Math.round((totalMinutes / totalViews) * 10) / 10 : 0,
            daily: dailyViews,
          }
        }
      } catch (e) {
        console.error('Stream Analytics error (non-blocking):', e)
      }
    }

    // Workers Analytics SUPPRIME -- comptait les requetes HTTP (assets, API, bots),
    // pas les page views. Inutilisable pour le trafic du tunnel.
    // Le tracking maison (tunnel_events) est la source de verite pour les page views.

    // Total events
    const totalEventsQuery = await db
      .prepare(`SELECT COUNT(*) as total FROM tunnel_events WHERE created_at >= ?`)
      .bind(fromDate)
      .all()
    const totalEvents = ((totalEventsQuery.results || []) as any[])[0]?.total || 0

    const result = {
      funnel,
      sources,
      vsl_retention: vslRetention,
      stream_analytics: streamAnalytics,
      revenue: {
        items: revenue,
        total: Math.round(totalRevenue * 100) / 100,
        roas: null as number | null, // A calculer si budget ads renseigne
      },
      timeline,
      exit_intents: {
        shown: exitShown,
        clicked: exitClicked,
        click_rate: exitShown > 0 ? Math.round((exitClicked / exitShown) * 1000) / 10 : 0,
      },
      kit_stats: kitStats,
      meta: {
        period,
        from: fromDate,
        to: toDate,
        total_events: totalEvents,
      },
    }

    return new Response(JSON.stringify(result, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store',
      },
    })
  } catch (err) {
    console.error('tunnel-data error:', err)
    return new Response(JSON.stringify({ error: 'Internal error', detail: String(err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
