// Attribution first-party server-side.
// Le middleware pose un cookie laom_vid (Set-Cookie serveur -> survit a Safari/ITP,
// contrairement a un cookie pose en JS) et persiste l'attribution first-touch dans
// la base de tracking dediee. visitor_id devient la verite, reliee aux leads.

export interface Attribution {
  utm_source: string | null
  utm_medium: string | null
  utm_campaign: string | null
  utm_content: string | null
  utm_term: string | null
  fbclid: string | null
  gclid: string | null
  fbc: string | null
  referrer: string | null
  landing_page: string
  user_agent: string | null
}

/** Extrait les UTM + click ids depuis l'URL et les headers de la requete. */
export function parseAttribution(request: Request, url: URL): Attribution {
  const q = url.searchParams
  const get = (k: string) => q.get(k) || null
  const fbclid = get('fbclid')
  // fbc deterministe depuis fbclid (format Meta : fb.1.<ts>.<fbclid>) -> dispo
  // cote serveur meme si le pixel navigateur est bloque.
  const fbc = fbclid ? `fb.1.${Math.floor(Date.now() / 1000)}.${fbclid}` : null
  return {
    utm_source: get('utm_source'),
    utm_medium: get('utm_medium'),
    utm_campaign: get('utm_campaign'),
    utm_content: get('utm_content'),
    utm_term: get('utm_term'),
    fbclid,
    gclid: get('gclid'),
    fbc,
    referrer: request.headers.get('referer'),
    landing_page: url.pathname,
    user_agent: request.headers.get('user-agent'),
  }
}

/** Insere l'attribution first-touch (1 ligne / visiteur). Non bloquant. */
export async function persistAttribution(
  db: { prepare: (q: string) => any } | undefined,
  visitorId: string,
  a: Attribution,
): Promise<void> {
  if (!db) return
  try {
    await db
      .prepare(
        `INSERT OR IGNORE INTO visitor_attribution
         (visitor_id, utm_source, utm_medium, utm_campaign, utm_content, utm_term,
          fbclid, gclid, fbc, referrer, landing_page, user_agent)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        visitorId, a.utm_source, a.utm_medium, a.utm_campaign, a.utm_content, a.utm_term,
        a.fbclid, a.gclid, a.fbc, a.referrer, a.landing_page, a.user_agent,
      )
      .run()
  } catch (e) {
    console.error('attribution persist error (non-blocking):', e)
  }
}

/** Recupere l'attribution stockee d'un visiteur (pour rattacher un lead). */
export async function getAttribution(
  db: { prepare: (q: string) => any } | undefined,
  visitorId: string | undefined,
): Promise<Partial<Attribution> | null> {
  if (!db || !visitorId) return null
  try {
    return await db.prepare('SELECT * FROM visitor_attribution WHERE visitor_id = ?').bind(visitorId).first()
  } catch {
    return null
  }
}
