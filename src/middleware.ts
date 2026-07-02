import { defineMiddleware } from 'astro:middleware'
import { isAuthenticated, unauthorized } from './utils/admin-auth'
import { parseAttribution, persistAttribution, refreshLastTouch, hasClickSignal } from './lib/attribution'

// 1) Gate des endpoints admin (PII / data live) : auth par cookie de session
//    signe, requise cote serveur. Seul /api/admin/login est ouvert (point d'entree).
// 2) Attribution first-party : pose un cookie laom_vid (serveur) au 1er hit page
//    et persiste l'attribution first-touch dans TRACKING_DB.
// 3) Empeche l'indexation de staging.laom.fr (prod jamais affectee).
export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname } = context.url

  // --- 1. Gate admin ---
  if (pathname.startsWith('/api/admin/') && !pathname.startsWith('/api/admin/login')) {
    const env = (context.locals as any).runtime?.env
    if (!(await isAuthenticated(context.request, env))) {
      return unauthorized()
    }
  }

  // --- 2. Attribution first-party (requetes de page HTML uniquement) ---
  const isPage =
    context.request.method === 'GET' &&
    !pathname.startsWith('/api/') &&
    !pathname.startsWith('/_') &&
    !/\.[a-z0-9]+$/i.test(pathname)

  let newVisitor = false
  let visitorId = context.cookies.get('laom_vid')?.value
  if (isPage) {
    if (!visitorId) {
      visitorId = crypto.randomUUID()
      newVisitor = true
      context.cookies.set('laom_vid', visitorId, {
        path: '/',
        maxAge: 60 * 60 * 24 * 400, // 400 jours
        sameSite: 'lax',
        secure: context.url.protocol === 'https:',
        httpOnly: false, // relu cote client (tracking) si besoin
      })
    }
    context.locals.visitorId = visitorId
  }

  const response = await next()

  // Attribution : uniquement sur les pages qui existent (200) — les scanners de
  // vulnerabilites (/jolokia, /actuator...) generaient des lignes fantomes via
  // les 404. Non bloquant.
  if (isPage && visitorId && response.status === 200) {
    const env = (context.locals as any).runtime?.env
    const attr = parseAttribution(context.request, context.url)
    context.locals.attribution = attr as any
    if (newVisitor) {
      // First-touch : premiere visite, on fige la source d'origine.
      await persistAttribution(env?.TRACKING_DB, visitorId, attr)
    } else if (hasClickSignal(attr)) {
      // Last-touch : visiteur connu revenant via un clic tague (pub) — la
      // conversion doit etre attribuee a ce clic, pas a la venue d'origine.
      // INSERT OR IGNORE d'abord : couvre les cookies anterieurs a la base
      // (aucune ligne a mettre a jour sinon).
      await persistAttribution(env?.TRACKING_DB, visitorId, attr)
      await refreshLastTouch(env?.TRACKING_DB, visitorId, attr)
    }
  }

  if (context.url.hostname === 'staging.laom.fr') {
    response.headers.set('X-Robots-Tag', 'noindex, nofollow')
  }
  return response
})
