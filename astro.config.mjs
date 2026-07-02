import sitemap from '@astrojs/sitemap'
import tailwindcss from '@tailwindcss/vite'
import cloudflare from '@astrojs/cloudflare'
import { defineConfig } from 'astro/config'
import { glob } from 'glob'
import { statSync } from 'node:fs'

const site = process.env.SITE_URL ?? 'https://laom.fr'

// Build a map of page paths to their lastmod dates for sitemap
function getPageLastModDates() {
  const lastModMap = new Map()

  // Get static page dates from file modification time
  const pageFiles = glob.sync('src/pages/**/*.astro')
  for (const file of pageFiles) {
    const stat = statSync(file)
    // Convert file path to URL path
    let urlPath = file
      .replace('src/pages', '')
      .replace('/index.astro', '/')
      .replace('.astro', '/')
    if (!urlPath.endsWith('/')) urlPath += '/'
    if (!lastModMap.has(urlPath)) {
      lastModMap.set(urlPath, stat.mtime)
    }
  }

  return lastModMap
}

const pageLastModDates = getPageLastModDates()

export default defineConfig({
  output: 'server',
  // Anciennes routes "labo" (espace de travail staging) promues en URLs propres.
  redirects: {
    '/accueil': '/', // ancienne home (doublon de contenu avec la nouvelle)
    '/accueil-labo': '/',
    '/le-lieu-labo': '/le-lieu',
    '/coliving-labo': '/coliving',
    '/notre-histoire-labo': '/notre-histoire',
    '/newsletter-labo': '/newsletter',
    '/coliving-aout-labo': '/coliving-aout',
    '/coliving-aout-labo-b': '/coliving-aout',
    '/candidater-labo': '/candidater',
    '/liens-labo': '/liens',
    '/quiz-labo': '/quiz',
  },
  security: {
    checkOrigin: false,
  },
  i18n: {
    defaultLocale: 'fr',
    locales: ['fr', 'en'],
    routing: {
      prefixDefaultLocale: false,
    },
  },
  server: {
    open: true,
    port: 3000,
    host: '0.0.0.0',
  },
  adapter: cloudflare(),
  vite: {
    plugins: [
      tailwindcss(),
    ],
  },
  integrations: [
    sitemap({
      // Pages noindex (internes, tunnels, outils) : exclues du sitemap.
      filter: (page) => {
        const path = new URL(page).pathname
        const excluded = [
          '/cockpit', '/lorenzo', '/khaldoun', '/amandine', '/magali',
          '/camp-nomade', '/chantier-2026', '/chauffage-comparatif',
          '/ferme-jardin-guinguette', '/strategie-2026', '/previsionnel-2026',
          '/valorisation-fdv', '/perspectives-table', '/la-margue-est',
          '/devis-voda', '/tarifs-location-pdf', '/admin',
          '/candidater', '/quiz', '/liens', '/coliving-aout',
          '/ds2', '/styleguide', '/planification', '/presentation',
        ]
        const clean = path.replace(/^\/en/, '') // couvre aussi les variantes /en/*
        return !excluded.some((p) => clean === p + '/' || clean === p || clean.startsWith(p + '/'))
      },
      i18n: {
        defaultLocale: 'fr',
        locales: {
          fr: 'fr-FR',
          en: 'en-US',
        },
      },
      changefreq: 'weekly',
      priority: 0.7,
      lastmod: new Date(),
      serialize(item) {
        // Check if this URL matches a page with a known lastmod date
        const urlPath = new URL(item.url).pathname
        const lastmod = pageLastModDates.get(urlPath)
        if (lastmod) {
          item.lastmod = lastmod.toISOString()
        }
        return item
      },
    }),
  ],
  site,
})
