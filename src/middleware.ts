import { defineMiddleware } from 'astro:middleware'

// Empêche l'indexation de l'environnement staging par les moteurs de recherche.
// Conditionné STRICTEMENT au hostname staging.laom.fr : la prod (laom.fr) n'est
// jamais affectée — aucun header ajouté sur les autres domaines.
export const onRequest = defineMiddleware(async (context, next) => {
  const response = await next()
  if (context.url.hostname === 'staging.laom.fr') {
    response.headers.set('X-Robots-Tag', 'noindex, nofollow')
  }
  return response
})
