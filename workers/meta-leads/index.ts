/**
 * laom-meta-leads — synchronise les leads Meta Instant Forms vers la D1 leads
 * (TRACKING_DB, meme table que /api/form/candidater), pour qu'ils apparaissent
 * sur /admin/coliving comme les candidatures du site.
 *
 * Cron toutes les 10 min :
 *   1. liste les ads leadgen du compte (ACTIVE + PAUSED, 90 derniers jours)
 *   2. lit leurs leads (GET /{ad_id}/leads — exige un token avec leads_retrieval)
 *   3. dedup via meta_event_id = 'metaform:<lead_id>'
 *   4. insert type=candidature, utm_source=meta_form, utm_campaign/content = noms Meta
 *   5. meme chaine que le formulaire site : notif equipe (Resend) + confirmation
 *      candidat + tag Kit (candidature-coliving)
 *
 * Secrets : META_LEADS_TOKEN, RESEND_API_KEY, KIT_API_SECRET, RUN_SECRET
 * Vars : LEAD_NOTIFY_EMAIL (optionnel)
 * Test manuel : POST /run avec header `x-run-secret: <RUN_SECRET>`
 */

import { candidatureConfirmationEmail } from '../../src/lib/emails/candidature'

export interface Env {
  TRACKING_DB: D1Database
  META_LEADS_TOKEN: string
  RESEND_API_KEY?: string
  KIT_API_SECRET?: string
  RUN_SECRET?: string
  LEAD_NOTIFY_EMAIL?: string
  /** ISO date : les leads antérieurs (rattrapage) sont insérés + Kit, sans emails. */
  BACKFILL_BEFORE?: string
}

const G = 'https://graph.facebook.com/v25.0'
const ACT = 'act_1371175461441820'

type FieldData = { name: string; values: string[] }
type MetaLead = {
  id: string
  created_time: string
  field_data: FieldData[]
  ad_id?: string
  ad_name?: string
  campaign_name?: string
  form_id?: string
}

async function graph(env: Env, path: string, params: Record<string, string>) {
  const q = new URLSearchParams({ ...params, access_token: env.META_LEADS_TOKEN })
  const res = await fetch(`${G}/${path}?${q}`)
  const body = (await res.json()) as any
  if (!res.ok) throw new Error(`graph ${path}: ${res.status} ${JSON.stringify(body?.error?.message || body).slice(0, 200)}`)
  return body
}

const esc = (v: unknown) =>
  String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string))

/** Extrait les champs standards d'un lead Meta (les noms varient selon le formulaire). */
function parseFields(fd: FieldData[]) {
  const map: Record<string, string> = {}
  for (const f of fd) map[f.name.toLowerCase()] = (f.values || []).join(', ')
  const email = map['email'] || map['e-mail'] || ''
  const phone = map['phone_number'] || map['téléphone'] || map['telephone'] || ''
  let firstName = map['first_name'] || ''
  let lastName = map['last_name'] || ''
  if (!firstName && map['full_name']) {
    const parts = map['full_name'].split(' ')
    firstName = parts[0]
    lastName = parts.slice(1).join(' ')
  }
  return { map, email, phone, firstName, lastName }
}

async function subscribeKit(env: Env, email: string, firstName: string) {
  if (!env.KIT_API_SECRET) return
  const KIT = 'https://api.convertkit.com/v3'
  // candidature-coliving = automation de nurture ; leads-coliving-aout-26 =
  // segment campagne aout 2026 (aussi pose par le formulaire /candidater du site).
  const tagNames = ['candidature-coliving', 'leads-coliving-aout-26']
  try {
    const list = (await (await fetch(`${KIT}/tags?api_secret=${encodeURIComponent(env.KIT_API_SECRET)}`)).json()) as any
    for (const tagName of tagNames) {
      let tag = (list.tags || []).find((t: any) => t.name === tagName)
      if (!tag) {
        tag = await (await fetch(`${KIT}/tags`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ api_secret: env.KIT_API_SECRET, tag: { name: tagName } }),
        })).json()
      }
      if (!tag?.id) continue
      await fetch(`${KIT}/tags/${tag.id}/subscribe`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ api_secret: env.KIT_API_SECRET, email, first_name: firstName || undefined }),
      })
    }
  } catch (e) {
    console.error('[kit]', e)
  }
}

async function sendResend(env: Env, payload: Record<string, unknown>) {
  if (!env.RESEND_API_KEY) return
  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}

async function processLead(env: Env, lead: MetaLead): Promise<'new' | 'dup' | 'skip'> {
  const marker = `metaform:${lead.id}`
  const seen = await env.TRACKING_DB.prepare('SELECT 1 FROM leads WHERE meta_event_id = ?').bind(marker).first()
  if (seen) return 'dup'

  const { map, email, phone, firstName, lastName } = parseFields(lead.field_data || [])
  if (!email) {
    console.error('[meta-leads] lead sans email, ignore:', lead.id)
    return 'skip'
  }

  await env.TRACKING_DB.prepare(
    `INSERT INTO leads
     (type, status, first_name, last_name, email, phone, answers,
      utm_source, utm_medium, utm_campaign, utm_content, meta_event_id, consent, created_at)
     VALUES ('candidature', 'lead', ?, ?, ?, ?, ?, 'meta_form', 'paid_social', ?, ?, ?, ?, ?)`,
  ).bind(
    firstName || null, lastName || null, email, phone || null, JSON.stringify(map),
    lead.campaign_name || null, lead.ad_name || null, marker,
    JSON.stringify({ source: 'meta_instant_form', at: new Date().toISOString() }),
    // created_at = date de soumission du form Meta (pas la date de sync)
    lead.created_time.replace('T', ' ').slice(0, 19),
  ).run()

  // Rattrapage : leads antérieurs au déploiement -> pas d'emails (une confirmation
  // "on t'appelle sous 48h" envoyée avec 2 jours de retard ferait plus de mal que de bien).
  if (env.BACKFILL_BEFORE && lead.created_time.slice(0, 19).replace('T', ' ') < env.BACKFILL_BEFORE) {
    await subscribeKit(env, email, firstName)
    return 'new'
  }

  // Notif equipe — meme esprit que /api/form/candidater
  const to = String(env.LEAD_NOTIFY_EMAIL || 'laomcoliving@gmail.com,eduardo@weble.fr')
    .split(',').map((s) => s.trim()).filter(Boolean)
  const rows = [
    ['Nom', `${firstName} ${lastName}`.trim()], ['Email', email], ['Téléphone', phone],
    ...Object.entries(map).filter(([k]) => !['email', 'phone_number', 'full_name', 'first_name', 'last_name'].includes(k)),
    ['Source', `Meta Form · ${lead.campaign_name ?? '—'} · ${lead.ad_name ?? '—'}`],
  ]
  const html = `<h2>Nouvelle candidature coliving (Meta Form) — ${esc(firstName)} ${esc(lastName)}</h2>
    <table cellpadding="6" style="border-collapse:collapse">${rows
      .map(([k, v]) => `<tr><td style="color:#888">${esc(k)}</td><td><strong>${v ? esc(v) : '—'}</strong></td></tr>`)
      .join('')}</table>`
  try {
    await sendResend(env, {
      from: 'LAOM Candidatures <hello@laom.fr>', to,
      subject: `Nouvelle candidature coliving (Meta) — ${firstName} ${lastName}`.trim(), html,
    })
    await env.TRACKING_DB.prepare("UPDATE leads SET notified_at = datetime('now') WHERE meta_event_id = ?").bind(marker).run()
  } catch (e) { console.error('[meta-leads] resend notif:', e) }

  // Confirmation candidat + plaquette : exactement le meme email que le formulaire du site
  try {
    await sendResend(env, { ...candidatureConfirmationEmail(firstName), to: [email] })
  } catch (e) { console.error('[meta-leads] resend confirmation:', e) }

  await subscribeKit(env, email, firstName)
  return 'new'
}

async function sync(env: Env): Promise<{ ads: number; scanned: number; inserted: number }> {
  // Toutes les ads leadgen recentes (ACTIVE + PAUSED : on rattrape aussi ce qui a tourne puis ete coupe)
  const ads = (await graph(env, `${ACT}/ads`, {
    fields: 'name,effective_status',
    effective_status: JSON.stringify(['ACTIVE', 'PAUSED', 'ADSET_PAUSED', 'CAMPAIGN_PAUSED']),
    limit: '50',
  })).data as Array<{ id: string; name: string }>

  let scanned = 0
  let inserted = 0
  for (const ad of ads) {
    let after: string | undefined
    do {
      let page: any
      try {
        page = await graph(env, `${ad.id}/leads`, {
          fields: 'created_time,field_data,ad_id,ad_name,campaign_name,form_id',
          limit: '100',
          ...(after ? { after } : {}),
        })
      } catch (e) {
        // ad sans form leadgen -> pas de leads : normal, on passe
        break
      }
      for (const lead of (page.data || []) as MetaLead[]) {
        scanned++
        if ((await processLead(env, lead)) === 'new') inserted++
      }
      after = page.paging?.cursors?.after && page.paging?.next ? page.paging.cursors.after : undefined
    } while (after)
  }
  return { ads: ads.length, scanned, inserted }
}

export default {
  async scheduled(_event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    ctx.waitUntil(
      sync(env).then(
        (r) => console.log('[meta-leads] sync ok', JSON.stringify(r)),
        (e) => console.error('[meta-leads] sync error', e),
      ),
    )
  },

  // Declenchement manuel (test / rattrapage) : POST /run + header x-run-secret
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url)
    if (req.method === 'POST' && url.pathname === '/run') {
      if (!env.RUN_SECRET || req.headers.get('x-run-secret') !== env.RUN_SECRET) {
        return new Response('forbidden', { status: 403 })
      }
      try {
        const r = await sync(env)
        return Response.json(r)
      } catch (e) {
        return Response.json({ error: String(e) }, { status: 500 })
      }
    }
    return new Response('laom-meta-leads', { status: 200 })
  },
}
