import { defineMiddleware } from 'astro:middleware'
import { isAuthenticated, unauthorized } from './utils/admin-auth'

// 1) Gate des endpoints admin (PII / data live) : auth par cookie de session
//    signe, requise cote serveur. Seul /api/admin/login est ouvert (point d'entree).
//    Cloudflare Access (edge) reste une couche complementaire en amont.
// 2) Empeche l'indexation de staging.laom.fr. La prod (laom.fr) n'est jamais
//    affectee — aucun header ajoute sur les autres domaines.
export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname } = context.url

  if (pathname.startsWith('/api/admin/') && !pathname.startsWith('/api/admin/login')) {
    const env = (context.locals as any).runtime?.env
    if (!(await isAuthenticated(context.request, env))) {
      return unauthorized()
    }
  }

  const response = await next()
  if (context.url.hostname === 'staging.laom.fr') {
    response.headers.set('X-Robots-Tag', 'noindex, nofollow')
  }
  return response
})
