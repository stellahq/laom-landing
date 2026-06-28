import { createHash, randomUUID } from 'node:crypto'

// Logique d'envoi Meta Conversions API, reutilisable cote serveur.
// Appelee par la route /api/meta-capi (relais du client) ET directement par les
// endpoints serveur (form, webhook) -> les conversions critiques (Lead, Purchase)
// partent du serveur, non bloquables par adblock. Dedup via event_id partage.

const PIXEL_ID = '1274109067570116'
const API_VERSION = 'v25.0'

function sha256(value: string): string {
  return createHash('sha256').update(value.trim().toLowerCase()).digest('hex')
}

export interface MetaUserData {
  em?: string; ph?: string; fn?: string; ln?: string; external_id?: string
}

export interface MetaEventInput {
  event_name: string
  event_id?: string
  event_source_url?: string
  custom_data?: Record<string, unknown>
  user_data?: MetaUserData
}

export interface MetaContext {
  accessToken: string
  clientIp?: string
  userAgent?: string
  fbp?: string
  fbc?: string
  defaultSourceUrl?: string
}

/** Construit le contexte (IP, UA, token) depuis la requete entrante. */
export function extractRequestContext(request: Request, env: { META_CAPI_TOKEN?: string } | undefined): MetaContext {
  const clientIp =
    request.headers.get('cf-connecting-ip') ||
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    ''
  return {
    accessToken: env?.META_CAPI_TOKEN || '',
    clientIp,
    userAgent: request.headers.get('user-agent') || '',
    defaultSourceUrl: request.headers.get('referer') || 'https://laom.fr',
  }
}

/** Envoie une liste d'evenements a la Conversions API (PII hashees SHA-256). */
export async function sendMetaEvents(
  events: MetaEventInput[],
  ctx: MetaContext,
): Promise<{ ok: boolean; status: number; result: any }> {
  if (!ctx.accessToken) return { ok: false, status: 500, result: { error: 'META_CAPI_TOKEN missing' } }

  const data = events.map((evt) => {
    const userData: Record<string, unknown> = {
      client_ip_address: ctx.clientIp || undefined,
      client_user_agent: ctx.userAgent || undefined,
    }
    if (ctx.fbp) userData.fbp = ctx.fbp
    if (ctx.fbc) userData.fbc = ctx.fbc
    if (evt.user_data?.em) userData.em = [sha256(evt.user_data.em)]
    if (evt.user_data?.ph) userData.ph = [sha256(evt.user_data.ph)]
    if (evt.user_data?.fn) userData.fn = [sha256(evt.user_data.fn)]
    if (evt.user_data?.ln) userData.ln = [sha256(evt.user_data.ln)]
    if (evt.user_data?.external_id) userData.external_id = [sha256(evt.user_data.external_id)]
    return {
      event_name: evt.event_name,
      event_time: Math.floor(Date.now() / 1000),
      event_id: evt.event_id || randomUUID(),
      event_source_url: evt.event_source_url || ctx.defaultSourceUrl || 'https://laom.fr',
      action_source: 'website' as const,
      user_data: userData,
      ...(evt.custom_data ? { custom_data: evt.custom_data } : {}),
    }
  })

  try {
    const response = await fetch(`https://graph.facebook.com/${API_VERSION}/${PIXEL_ID}/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data, access_token: ctx.accessToken }),
    })
    const result = await response.json().catch(() => ({}))
    if (!response.ok) console.error('[CAPI] Meta API error:', JSON.stringify(result))
    return { ok: response.ok, status: response.status, result }
  } catch (err) {
    console.error('[CAPI] Fetch error:', err)
    return { ok: false, status: 502, result: { error: 'fetch failed' } }
  }
}
