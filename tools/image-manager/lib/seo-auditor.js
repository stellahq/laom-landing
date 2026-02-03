/**
 * Module SEO Auditor
 * 
 * Audit des noms d'images existantes
 * - Analyse du contexte d'utilisation
 * - Suggestion de noms optimisés
 * - Application des renommages
 */

import { Router } from 'express'
import { promises as fs } from 'fs'
import { join, basename, dirname, extname } from 'path'
import { generateSeoFilename } from './astro-parser.js'

/**
 * Configure les routes de l'auditeur SEO
 */
export function setupSeoAuditorRoutes(app, config) {
  const router = Router()
  const { srcPagesDir, publicImagesDir, projectRoot } = config

  /**
   * GET /api/seo/audit
   * Lance un audit complet des images du site
   */
  router.get('/audit', async (req, res) => {
    try {
      const audit = await performAudit(srcPagesDir, publicImagesDir)
      res.json(audit)
    } catch (err) {
      console.error('Erreur audit SEO:', err)
      res.status(500).json({ error: err.message })
    }
  })

  /**
   * POST /api/seo/rename
   * Applique un renommage suggéré
   */
  router.post('/rename', async (req, res) => {
    try {
      const { currentPath, newName } = req.body

      if (!currentPath || !newName) {
        return res.status(400).json({ error: 'Paramètres manquants' })
      }

      // Sécurité : vérifier que le chemin est dans public/images
      const fullCurrentPath = join(projectRoot, 'public', currentPath.replace(/^\//, ''))
      if (!fullCurrentPath.startsWith(join(projectRoot, 'public', 'images'))) {
        return res.status(403).json({ error: 'Chemin non autorisé' })
      }

      // Nouveau chemin
      const dir = dirname(fullCurrentPath)
      const newPath = join(dir, newName)

      // Renommer le fichier
      await fs.rename(fullCurrentPath, newPath)

      // Mettre à jour les références dans les fichiers .astro
      const oldRef = currentPath
      const newRef = '/images/' + newPath.split('/images/')[1]
      
      const updatedFiles = await updateReferences(srcPagesDir, oldRef, newRef)

      res.json({
        success: true,
        oldPath: currentPath,
        newPath: newRef,
        updatedFiles
      })
    } catch (err) {
      console.error('Erreur renommage:', err)
      res.status(500).json({ error: err.message })
    }
  })

  /**
   * POST /api/seo/rename-all
   * Applique tous les renommages suggérés
   */
  router.post('/rename-all', async (req, res) => {
    try {
      const { suggestions } = req.body

      if (!suggestions || !Array.isArray(suggestions)) {
        return res.status(400).json({ error: 'Liste de suggestions requise' })
      }

      const results = []
      for (const suggestion of suggestions) {
        try {
          const fullCurrentPath = join(projectRoot, 'public', suggestion.currentPath.replace(/^\//, ''))
          const dir = dirname(fullCurrentPath)
          const newPath = join(dir, suggestion.suggestedName)

          await fs.rename(fullCurrentPath, newPath)

          const oldRef = suggestion.currentPath
          const newRef = '/images/' + newPath.split('/images/')[1]
          const updatedFiles = await updateReferences(srcPagesDir, oldRef, newRef)

          results.push({
            success: true,
            oldPath: suggestion.currentPath,
            newPath: newRef,
            updatedFiles
          })
        } catch (err) {
          results.push({
            success: false,
            oldPath: suggestion.currentPath,
            error: err.message
          })
        }
      }

      res.json({
        success: true,
        results,
        successCount: results.filter(r => r.success).length,
        errorCount: results.filter(r => !r.success).length
      })
    } catch (err) {
      console.error('Erreur renommage batch:', err)
      res.status(500).json({ error: err.message })
    }
  })

  app.use('/api/seo', router)
}

/**
 * Effectue un audit complet des images
 */
async function performAudit(srcPagesDir, publicImagesDir) {
  const issues = []
  const stats = {
    totalImages: 0,
    goodNames: 0,
    toImprove: 0
  }

  // Scanner tous les fichiers .astro pour trouver les images utilisées
  const imageUsages = await scanImageUsages(srcPagesDir)
  stats.totalImages = Object.keys(imageUsages).length

  // Analyser chaque image
  for (const [imagePath, usages] of Object.entries(imageUsages)) {
    const filename = basename(imagePath)
    const analysis = analyzeImageName(filename, usages)

    if (analysis.needsImprovement) {
      stats.toImprove++
      issues.push({
        currentPath: imagePath,
        currentName: filename,
        suggestedName: analysis.suggestedName,
        reason: analysis.reason,
        context: analysis.context,
        usages: usages.map(u => ({
          file: u.file,
          line: u.line
        }))
      })
    } else {
      stats.goodNames++
    }
  }

  // Trier par importance
  issues.sort((a, b) => {
    // Prioriser les images avec noms génériques
    if (a.reason.includes('générique') && !b.reason.includes('générique')) return -1
    if (!a.reason.includes('générique') && b.reason.includes('générique')) return 1
    return 0
  })

  return {
    stats,
    issues,
    summary: `${stats.toImprove} images sur ${stats.totalImages} peuvent être améliorées`
  }
}

/**
 * Scanne les fichiers .astro pour trouver les usages d'images
 */
async function scanImageUsages(dir, basePath = '') {
  const usages = {}

  const entries = await fs.readdir(dir, { withFileTypes: true })

  for (const entry of entries) {
    const fullPath = join(dir, entry.name)
    const relativePath = join(basePath, entry.name)

    if (entry.isDirectory()) {
      const subUsages = await scanImageUsages(fullPath, relativePath)
      // Merger les usages
      for (const [img, uses] of Object.entries(subUsages)) {
        if (!usages[img]) usages[img] = []
        usages[img].push(...uses)
      }
    } else if (entry.name.endsWith('.astro') || entry.name.endsWith('.md')) {
      const content = await fs.readFile(fullPath, 'utf-8')
      const lines = content.split('\n')

      // Chercher les références d'images
      const imageRegex = /["'](\/images\/[^"']+\.(?:webp|jpg|jpeg|png|gif))["']/gi
      let match

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i]
        imageRegex.lastIndex = 0
        
        while ((match = imageRegex.exec(line)) !== null) {
          const imagePath = match[1]
          if (!usages[imagePath]) usages[imagePath] = []
          
          // Extraire le contexte
          const context = extractLineContext(lines, i)
          
          usages[imagePath].push({
            file: relativePath,
            line: i + 1,
            context
          })
        }
      }
    }
  }

  return usages
}

/**
 * Extrait le contexte autour d'une ligne
 */
function extractLineContext(lines, lineIndex) {
  const contextLines = []
  
  // 5 lignes avant
  for (let i = Math.max(0, lineIndex - 5); i < lineIndex; i++) {
    contextLines.push(lines[i])
  }
  
  // Ligne courante
  contextLines.push(lines[lineIndex])
  
  // 3 lignes après
  for (let i = lineIndex + 1; i <= Math.min(lines.length - 1, lineIndex + 3); i++) {
    contextLines.push(lines[i])
  }

  // Extraire les titres et textes significatifs
  const allText = contextLines.join('\n')
  const titleMatch = allText.match(/<h[1-3][^>]*>([^<]+)<\/h[1-3]>/i)
  const textMatch = allText.match(/<p[^>]*>([^<]{10,})<\/p>/i)

  return {
    nearestTitle: titleMatch ? titleMatch[1].trim() : null,
    nearestText: textMatch ? textMatch[1].trim().substring(0, 100) : null
  }
}

/**
 * Analyse si un nom d'image est optimisé pour le SEO
 */
function analyzeImageName(filename, usages) {
  const nameWithoutExt = filename.replace(/\.[^.]+$/, '')
  const reasons = []

  // Patterns de noms génériques à éviter
  const genericPatterns = [
    /^p\d+$/i,           // p1, p2, p3...
    /^img[-_]?\d+$/i,    // img1, img_1...
    /^image[-_]?\d+$/i,  // image1...
    /^photo[-_]?\d+$/i,  // photo1...
    /^dsc\d+$/i,         // DSC00123
    /^screenshot/i,      // screenshot...
    /^[a-f0-9]{8,}$/i    // hash: a1b2c3d4...
  ]

  // Vérifier si nom générique
  for (const pattern of genericPatterns) {
    if (pattern.test(nameWithoutExt)) {
      reasons.push('Nom générique non descriptif')
      break
    }
  }

  // Vérifier si trop court
  if (nameWithoutExt.length < 5) {
    reasons.push('Nom trop court')
  }

  // Vérifier si contient que des chiffres
  if (/^\d+$/.test(nameWithoutExt)) {
    reasons.push('Nom composé uniquement de chiffres')
  }

  // Vérifier si manque de tirets (mots non séparés)
  if (nameWithoutExt.length > 10 && !nameWithoutExt.includes('-') && !nameWithoutExt.includes('_')) {
    reasons.push('Mots non séparés par des tirets')
  }

  // Si problèmes détectés, suggérer un meilleur nom
  if (reasons.length > 0) {
    // Utiliser le contexte pour générer un meilleur nom
    const primaryUsage = usages[0]
    const context = {
      nearestTitle: primaryUsage?.context?.nearestTitle,
      paragraphs: primaryUsage?.context?.nearestText ? [primaryUsage.context.nearestText] : [],
      sectionHint: null
    }

    // Extraire le nom de la page depuis le fichier
    const pageName = primaryUsage?.file?.replace(/\.astro$/, '') || 'image'

    const suggestedName = generateSeoFilename(context, pageName)

    return {
      needsImprovement: true,
      suggestedName,
      reason: reasons.join(', '),
      context: primaryUsage?.context || null
    }
  }

  return {
    needsImprovement: false,
    reason: null
  }
}

/**
 * Met à jour les références d'une image dans tous les fichiers
 */
async function updateReferences(dir, oldRef, newRef) {
  const updatedFiles = []

  async function processDir(currentDir) {
    const entries = await fs.readdir(currentDir, { withFileTypes: true })

    for (const entry of entries) {
      const fullPath = join(currentDir, entry.name)

      if (entry.isDirectory()) {
        await processDir(fullPath)
      } else if (entry.name.endsWith('.astro') || entry.name.endsWith('.md')) {
        let content = await fs.readFile(fullPath, 'utf-8')
        
        if (content.includes(oldRef)) {
          content = content.split(oldRef).join(newRef)
          await fs.writeFile(fullPath, content, 'utf-8')
          updatedFiles.push(fullPath)
        }
      }
    }
  }

  await processDir(dir)
  return updatedFiles
}

export { performAudit, analyzeImageName }
