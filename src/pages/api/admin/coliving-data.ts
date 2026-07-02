import type { APIRoute } from 'astro'

// GET /api/admin/coliving-data?period=7d&type=
// Agrege les leads (TRACKING_DB) + revenue coliving (mollie_payments dans DB).
// Auth assuree par le middleware (cookie de session signe).

export const prerender = false

const STATUSES = ['lead', 'call_booked', 'call_done', 'no_show', 'match', 'paid', 'lost'] as const

function periodStart(period: string): string | null {
  const now = Date.now()
  const day = 86400000
  if (period === 'today') {
    const midnight = new Date()
    midnight.setUTCHours(0, 0, 0, 0) // created_at est en UTC (datetime('now'))
    return midnight.toISOString()
  }
  if (period === '7d') return new Date(now - 7 * day).toISOString()
  if (period === '30d') return new Date(now - 30 * day).toISOString()
  return null // 'all'
}

export const GET: APIRoute = async ({ request, locals }) => {
  const env = (locals as any).runtime?.env
  const tdb = env?.TRACKING_DB
  const db = env?.DB
  const url = new URL(request.url)
  const period = url.searchParams.get('period') || '7d'
  const typeFilter = url.searchParams.get('type') || ''
  const from = periodStart(period)

  if (!tdb) {
    return new Response(JSON.stringify({ error: 'TRACKING_DB not configured' }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    })
  }

  const where: string[] = []
  const args: any[] = []
  if (from) { where.push('created_at >= ?'); args.push(from.replace('T', ' ').slice(0, 19)) }
  if (typeFilter) { where.push('type = ?'); args.push(typeFilter) }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : ''

  try {
    // KPIs par statut
    const statusRows = (await tdb.prepare(
      `SELECT status, COUNT(*) as n FROM leads ${whereSql} GROUP BY status`,
    ).bind(...args).all()).results as Array<{ status: string; n: number }>
    const byStatus: Record<string, number> = {}
    for (const s of STATUSES) byStatus[s] = 0
    let totalLeads = 0
    for (const r of statusRows) { byStatus[r.status] = r.n; totalLeads += r.n }

    // Funnel cumulatif (descendant) — no_show a atteint l'etape Call (RDV pris)
    const reachedCall = byStatus.call_booked + byStatus.call_done + byStatus.no_show + byStatus.match + byStatus.paid
    const reachedMatch = byStatus.match + byStatus.paid
    const reachedPaid = byStatus.paid
    const activeLeads = totalLeads - byStatus.lost
    const pct = (n: number, d: number) => (d > 0 ? Math.round((n / d) * 1000) / 10 : 0)
    const funnel = [
      { step: 'Leads', count: activeLeads, conversion_rate: 100, leak_rate: 0 },
      { step: 'Call', count: reachedCall, conversion_rate: pct(reachedCall, activeLeads), leak_rate: pct(activeLeads - reachedCall, activeLeads) },
      { step: 'Match', count: reachedMatch, conversion_rate: pct(reachedMatch, reachedCall), leak_rate: pct(reachedCall - reachedMatch, reachedCall) },
      { step: 'Payé', count: reachedPaid, conversion_rate: pct(reachedPaid, reachedMatch), leak_rate: pct(reachedMatch - reachedPaid, reachedMatch) },
    ]

    // Funnel segmente par source (entonnoir avec composition par source a chaque etape)
    const srcStatusRows = (await tdb.prepare(
      `SELECT COALESCE(utm_source,'(directe)') as source, status, COUNT(*) as n
       FROM leads ${whereSql} GROUP BY source, status`,
    ).bind(...args).all()).results as Array<{ source: string; status: string; n: number }>
    const perSource: Record<string, Record<string, number>> = {}
    for (const r of srcStatusRows) {
      perSource[r.source] = perSource[r.source] || {}
      perSource[r.source][r.status] = r.n
    }
    const stageCounts = (m: Record<string, number>): Record<string, number> => {
      const g = (k: string) => m[k] || 0
      return {
        Leads: g('lead') + g('call_booked') + g('call_done') + g('no_show') + g('match') + g('paid'), // actifs (hors lost)
        Call: g('call_booked') + g('call_done') + g('no_show') + g('match') + g('paid'),
        Match: g('match') + g('paid'),
        'Payé': g('paid'),
      }
    }
    const sourceNames = Object.keys(perSource)
    const funnelSegmented = ['Leads', 'Call', 'Match', 'Payé'].map((step) => {
      const segments = sourceNames
        .map((s) => ({ source: s, count: stageCounts(perSource[s])[step] }))
        .filter((seg) => seg.count > 0)
        .sort((a, b) => b.count - a.count)
      return { step, total: segments.reduce((acc, s) => acc + s.count, 0), segments }
    })

    // Sources (par utm_source / campaign)
    const sourceRows = (await tdb.prepare(
      `SELECT COALESCE(utm_source,'(directe)') as source, COALESCE(utm_campaign,'—') as campaign, COUNT(*) as n
       FROM leads ${whereSql} GROUP BY source, campaign ORDER BY n DESC`,
    ).bind(...args).all()).results as Array<{ source: string; campaign: string; n: number }>
    const sources = sourceRows.map((r) => ({
      source: r.source, campaign: r.campaign, count: r.n,
      percentage: pct(r.n, totalLeads),
    }))

    // Liste des leads (PII servie uniquement derriere l'auth)
    const leads = (await tdb.prepare(
      `SELECT id, created_at, type, status, first_name, last_name, email, phone,
              utm_source, utm_campaign, utm_content, answers
       FROM leads ${whereSql} ORDER BY created_at DESC LIMIT 500`,
    ).bind(...args).all()).results

    // Revenue coliving (mollie_payments dans la base applicative)
    let revenue = { count: 0, total: 0 }
    if (db) {
      try {
        const rev = await db.prepare(
          `SELECT COUNT(*) as count, COALESCE(SUM(CAST(amount AS REAL)),0) as total
           FROM mollie_payments WHERE status='paid' AND product LIKE 'coliving%'`,
        ).first() as { count: number; total: number }
        revenue = { count: rev?.count || 0, total: rev?.total || 0 }
      } catch { /* table/colonne absente : ignore */ }
    }

    return new Response(JSON.stringify({
      kpis: {
        leads: totalLeads,
        // Cumulatif (comme le funnel) : un lead passé à match/paid a bien eu son call.
        calls: reachedCall,
        matchs: byStatus.match,
        paid: byStatus.paid,
        lost: byStatus.lost,
        conversion_lead_paid: pct(byStatus.paid, activeLeads),
      },
      funnel,
      funnel_segmented: funnelSegmented,
      sources,
      leads,
      revenue,
      meta: { period, type: typeFilter || 'all', from, total: totalLeads },
    }), { headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' } })
  } catch (e) {
    console.error('[coliving-data] error:', e)
    return new Response(JSON.stringify({ error: 'Query failed' }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    })
  }
}
