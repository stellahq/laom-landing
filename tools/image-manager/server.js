/**
 * LAOM Image Manager v2 - Serveur principal
 * 
 * Outil de gestion des images pour le site LAOM
 * - Navigation libre dans le site via iframe (direct vers Astro)
 * - Modification de toute image (existante ou placeholder)
 * - Compression auto + renommage SEO contextuel
 * - Publication automatique (git commit + push)
 */

import express from 'express'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { spawn } from 'child_process'
import open from 'open'
import { promises as fs } from 'fs'

// Modules locaux
import { setupPhotothequeRoutes } from './lib/phototheque.js'
import { setupAstroParserRoutes } from './lib/astro-parser.js'
import { setupImageProcessorRoutes } from './lib/image-processor.js'
import { setupGitPublisherRoutes } from './lib/git-publisher.js'
import { setupSeoAuditorRoutes } from './lib/seo-auditor.js'
import { setupContextAnalyzerRoutes } from './lib/context-analyzer.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PROJECT_ROOT = join(__dirname, '..', '..')
const PHOTOTHEQUE_DIR = join(PROJECT_ROOT, 'phototheque')
const PUBLIC_IMAGES_DIR = join(PROJECT_ROOT, 'public', 'images', 'laom')
const SRC_PAGES_DIR = join(PROJECT_ROOT, 'src', 'pages')

const PORT = 3001
const ASTRO_PORT = 3000

const app = express()

// CORS pour permettre la communication cross-origin avec l'iframe Astro
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', `http://localhost:${ASTRO_PORT}`)
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  res.header('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200)
  }
  next()
})

// Middleware
app.use(express.json())

// Config partagee pour tous les modules
const config = {
  projectRoot: PROJECT_ROOT,
  photothequeDir: PHOTOTHEQUE_DIR,
  publicImagesDir: PUBLIC_IMAGES_DIR,
  srcPagesDir: SRC_PAGES_DIR,
  astroPort: ASTRO_PORT
}

// Routes API (avant le proxy et les fichiers statiques)
setupPhotothequeRoutes(app, config)
setupAstroParserRoutes(app, config)
setupImageProcessorRoutes(app, config)
setupGitPublisherRoutes(app, config)
setupSeoAuditorRoutes(app, config)
setupContextAnalyzerRoutes(app, config)

// Route de sante
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', config })
})

// Servir les fichiers statiques (interface)
app.use(express.static(join(__dirname, 'public')))

// Servir le script bridge avec CORS pour l'injection depuis Astro
app.get('/bridge.js', (req, res) => {
  res.sendFile(join(__dirname, 'public', 'iframe-bridge.js'))
})

// Demarrage du serveur Astro en parallele
let astroProcess = null

function startAstroServer() {
  return new Promise((resolve) => {
    console.log('🚀 Demarrage du serveur Astro...')
    
    astroProcess = spawn('npm', ['run', 'dev'], {
      cwd: PROJECT_ROOT,
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: true
    })

    let started = false

    astroProcess.stdout.on('data', (data) => {
      const output = data.toString()
      if (output.includes('localhost:') || output.includes('ready') || output.includes('Local')) {
        if (!started) {
          started = true
          console.log('✅ Serveur Astro demarre sur http://localhost:' + ASTRO_PORT)
          resolve()
        }
      }
    })

    astroProcess.stderr.on('data', (data) => {
      const output = data.toString()
      // Ignorer les warnings, afficher les erreurs critiques
      if (output.toLowerCase().includes('error') && !output.includes('DeprecationWarning')) {
        console.error('   Astro:', output.trim())
      }
    })

    astroProcess.on('error', (err) => {
      console.error('❌ Erreur demarrage Astro:', err)
      resolve() // Continue anyway
    })

    // Timeout si Astro ne demarre pas
    setTimeout(() => {
      if (!started) {
        console.log('⚠️  Astro prend du temps, on continue...')
        resolve()
      }
    }, 20000)
  })
}

// Nettoyage a l'arret
function cleanup() {
  if (astroProcess) {
    console.log('\n🛑 Arret du serveur Astro...')
    astroProcess.kill()
  }
  process.exit(0)
}

process.on('SIGINT', cleanup)
process.on('SIGTERM', cleanup)

// Demarrage
async function start() {
  try {
    // Creer les dossiers de la phototheque s'ils n'existent pas
    const defaultFolders = ['grand-shambala', 'petit-shambala', 'salle-pratique', 'domaine', 'portraits', 'non-classe']
    for (const folder of defaultFolders) {
      await fs.mkdir(join(PHOTOTHEQUE_DIR, folder), { recursive: true })
    }
    
    // Demarrer Astro en arriere-plan
    startAstroServer()
    
    // Demarrer Image Manager
    app.listen(PORT, () => {
      console.log(`\n📸 LAOM Image Manager v2`)
      console.log(`   Interface: http://localhost:${PORT}`)
      console.log(`   Site Astro: http://localhost:${ASTRO_PORT}`)
      console.log(`\n   Phototheque: ${PHOTOTHEQUE_DIR}`)
      console.log(`   Images site: ${PUBLIC_IMAGES_DIR}\n`)
      
      // Ouvrir le navigateur
      setTimeout(() => {
        open(`http://localhost:${PORT}`)
      }, 3000)
    })
  } catch (err) {
    console.error('❌ Erreur demarrage:', err)
    process.exit(1)
  }
}

start()
