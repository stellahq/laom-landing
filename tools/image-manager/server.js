/**
 * LAOM Image Manager - Serveur principal
 * 
 * Outil de gestion des images pour le site LAOM
 * - Photothèque organisée par dossiers thématiques
 * - Aperçu des pages avec placeholders
 * - Compression auto + renommage SEO contextuel
 * - Publication automatique (git commit + push)
 */

import express from 'express'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { spawn } from 'child_process'
import open from 'open'

// Modules locaux
import { setupPhotothequeRoutes } from './lib/phototheque.js'
import { setupAstroParserRoutes } from './lib/astro-parser.js'
import { setupImageProcessorRoutes } from './lib/image-processor.js'
import { setupGitPublisherRoutes } from './lib/git-publisher.js'
import { setupSeoAuditorRoutes } from './lib/seo-auditor.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PROJECT_ROOT = join(__dirname, '..', '..')
const PHOTOTHEQUE_DIR = join(PROJECT_ROOT, 'phototheque')
const PUBLIC_IMAGES_DIR = join(PROJECT_ROOT, 'public', 'images', 'laom')
const SRC_PAGES_DIR = join(PROJECT_ROOT, 'src', 'pages')

const PORT = 3001
const ASTRO_PORT = 3000

const app = express()

// Middleware
app.use(express.json())
app.use(express.static(join(__dirname, 'public')))

// Config partagée pour tous les modules
const config = {
  projectRoot: PROJECT_ROOT,
  photothequeDir: PHOTOTHEQUE_DIR,
  publicImagesDir: PUBLIC_IMAGES_DIR,
  srcPagesDir: SRC_PAGES_DIR,
  astroPort: ASTRO_PORT
}

// Routes API
setupPhotothequeRoutes(app, config)
setupAstroParserRoutes(app, config)
setupImageProcessorRoutes(app, config)
setupGitPublisherRoutes(app, config)
setupSeoAuditorRoutes(app, config)

// Route de santé
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', config })
})

// Démarrage du serveur Astro en parallèle
let astroProcess = null

function startAstroServer() {
  return new Promise((resolve, reject) => {
    console.log('🚀 Démarrage du serveur Astro...')
    
    astroProcess = spawn('npm', ['run', 'dev'], {
      cwd: PROJECT_ROOT,
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: true
    })

    let started = false

    astroProcess.stdout.on('data', (data) => {
      const output = data.toString()
      if (!started && output.includes('localhost:')) {
        started = true
        console.log('✅ Serveur Astro démarré sur http://localhost:' + ASTRO_PORT)
        resolve()
      }
    })

    astroProcess.stderr.on('data', (data) => {
      // Astro envoie certains logs sur stderr, on les ignore sauf erreurs critiques
      const output = data.toString()
      if (output.includes('error') || output.includes('Error')) {
        console.error('❌ Astro:', output)
      }
    })

    astroProcess.on('error', (err) => {
      console.error('❌ Erreur démarrage Astro:', err)
      reject(err)
    })

    // Timeout si Astro ne démarre pas
    setTimeout(() => {
      if (!started) {
        console.log('⚠️  Astro prend du temps à démarrer, on continue...')
        resolve()
      }
    }, 15000)
  })
}

// Nettoyage à l'arrêt
function cleanup() {
  if (astroProcess) {
    console.log('\n🛑 Arrêt du serveur Astro...')
    astroProcess.kill()
  }
  process.exit(0)
}

process.on('SIGINT', cleanup)
process.on('SIGTERM', cleanup)

// Démarrage
async function start() {
  try {
    // Démarrer Astro en arrière-plan
    startAstroServer()
    
    // Démarrer Image Manager
    app.listen(PORT, () => {
      console.log(`\n📸 LAOM Image Manager`)
      console.log(`   Interface: http://localhost:${PORT}`)
      console.log(`   Astro dev: http://localhost:${ASTRO_PORT}`)
      console.log(`\n   Photothèque: ${PHOTOTHEQUE_DIR}`)
      console.log(`   Images site: ${PUBLIC_IMAGES_DIR}\n`)
      
      // Ouvrir le navigateur
      setTimeout(() => {
        open(`http://localhost:${PORT}`)
      }, 2000)
    })
  } catch (err) {
    console.error('❌ Erreur démarrage:', err)
    process.exit(1)
  }
}

start()
