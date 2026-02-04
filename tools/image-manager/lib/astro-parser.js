/**
 * Module Astro Parser
 * 
 * Détection et manipulation des placeholders dans les fichiers .astro
 * - Liste des pages avec leurs placeholders
 * - Extraction du contexte SEO (titres, paragraphes)
 * - Remplacement des placeholders par des images
 */

import { Router } from 'express'
import { promises as fs } from 'fs'
import { join, relative, basename } from 'path'

/**
 * Patterns de détection des placeholders
 * Basés sur l'analyse du projet LAOM
 */
const PLACEHOLDER_PATTERNS = [
  // Pattern 1: Div placeholder avec bg-[#E8E3D8]
  {
    name: 'visual-box',
    regex: /<div[^>]*class="[^"]*bg-\[#E8E3D8\][^"]*"[^>]*>[\s\S]*?<p[^>]*>Placeholder[^<]*<\/p>[\s\S]*?<p[^>]*>([^<]+)<\/p>[\s\S]*?<\/div>/gi,
    extractDescription: (match) => match[1]?.trim()
  },
  // Pattern 2: Commentaire HTML avec PLACEHOLDER
  {
    name: 'comment-spec',
    regex: /<!--[\s\S]*?📸\s*PLACEHOLDER\s*—\s*([^\n]+)[\s\S]*?-->/gi,
    extractDescription: (match) => match[1]?.trim()
  },
  // Pattern 3: Texte inline "Placeholder —" ou "Photo a prendre"
  {
    name: 'inline-text',
    regex: /<p[^>]*>[^<]*(Placeholder\s*[—-]\s*[^<]+|Photo\s+a\s+prendre\s*:\s*[^<]+)<\/p>/gi,
    extractDescription: (match) => match[1]?.replace(/^(Placeholder\s*[—-]\s*|Photo\s+a\s+prendre\s*:\s*)/i, '').trim()
  },
  // Pattern 4: Data object avec placeholder key
  {
    name: 'data-object',
    regex: /placeholder:\s*['"]([^'"]+)['"]/gi,
    extractDescription: (match) => match[1]?.replace(/^Photo\s+a\s+prendre\s*:\s*/i, '').trim()
  },
  // Pattern 5: Div avec classe aspect-* et contenu placeholder
  {
    name: 'aspect-box',
    regex: /<div[^>]*class="[^"]*aspect-\[[^\]]+\][^"]*bg-\[#E8E3D8\][^"]*"[^>]*>[\s\S]*?<\/div>/gi,
    extractDescription: (match) => {
      // Essayer d'extraire la description depuis le contenu
      const descMatch = match[0].match(/<p[^>]*>([^<]+)<\/p>/i)
      return descMatch ? descMatch[1].trim() : 'Placeholder image'
    }
  }
]

/**
 * Configure les routes du parser Astro
 */
export function setupAstroParserRoutes(app, config) {
  const router = Router()
  const { srcPagesDir } = config

  /**
   * GET /api/pages
   * Liste toutes les pages avec leur nombre de placeholders
   */
  router.get('/', async (req, res) => {
    try {
      const pages = await listPages(srcPagesDir)
      res.json({ pages })
    } catch (err) {
      console.error('Erreur listage pages:', err)
      res.status(500).json({ error: err.message })
    }
  })

  /**
   * GET /api/pages/:pagePath
   * Détail d'une page avec tous ses placeholders
   */
  router.get('/:pagePath(*)', async (req, res) => {
    try {
      const pagePath = req.params.pagePath
      const fullPath = join(srcPagesDir, pagePath)
      
      // Vérifier que le fichier existe et est dans srcPagesDir
      if (!fullPath.startsWith(srcPagesDir)) {
        return res.status(403).json({ error: 'Chemin non autorisé' })
      }

      const content = await fs.readFile(fullPath, 'utf-8')
      const placeholders = extractPlaceholders(content, pagePath)
      const pageUrl = pagePathToUrl(pagePath)

      res.json({ 
        path: pagePath,
        url: pageUrl,
        placeholders,
        placeholderCount: placeholders.length
      })
    } catch (err) {
      if (err.code === 'ENOENT') {
        return res.status(404).json({ error: 'Page non trouvée' })
      }
      console.error('Erreur lecture page:', err)
      res.status(500).json({ error: err.message })
    }
  })

  /**
   * POST /api/pages/replace-image-src
   * Remplace le src d'une image existante par une nouvelle image
   */
  router.post('/replace-image-src', async (req, res) => {
    try {
      const { pagePath, oldSrc, newSrc, newAlt } = req.body

      console.log('[replace-image-src] Request:', { pagePath, oldSrc, newSrc })

      if (!pagePath || !oldSrc || !newSrc) {
        return res.status(400).json({ error: 'Paramètres manquants: pagePath, oldSrc, newSrc requis' })
      }

      const fullPath = join(srcPagesDir, pagePath)
      console.log('[replace-image-src] Full path:', fullPath)
      
      // Vérifier sécurité
      if (!fullPath.startsWith(srcPagesDir)) {
        return res.status(403).json({ error: 'Chemin non autorisé' })
      }

      let content = await fs.readFile(fullPath, 'utf-8')
      console.log('[replace-image-src] File loaded, length:', content.length)
      
      // Chercher l'image avec l'ancien src
      // Pattern: src="oldSrc" ou src='oldSrc' ou src={oldSrc}
      const srcPatterns = [
        new RegExp(`src="${escapeRegex(oldSrc)}"`, 'g'),
        new RegExp(`src='${escapeRegex(oldSrc)}'`, 'g'),
        new RegExp(`src=\{['"]${escapeRegex(oldSrc)}['"]\}`, 'g')
      ]

      // Debug: check if oldSrc exists anywhere in content
      console.log('[replace-image-src] Looking for oldSrc:', oldSrc)
      console.log('[replace-image-src] Content includes oldSrc?', content.includes(oldSrc))

      let replaced = false
      for (const pattern of srcPatterns) {
        console.log('[replace-image-src] Testing pattern:', pattern.source)
        if (pattern.test(content)) {
          // Reset lastIndex for global regex
          pattern.lastIndex = 0
          content = content.replace(pattern, `src="${newSrc}"`)
          replaced = true
          console.log('[replace-image-src] Pattern matched! Replaced.')
          break
        }
      }

      if (!replaced) {
        console.log('[replace-image-src] NOT FOUND! Dumping first occurrences of "speaker" in content:')
        const speakerMatches = content.match(/src="[^"]*speaker[^"]*"/g)
        console.log('[replace-image-src] Speaker src matches:', speakerMatches)
        return res.status(404).json({ error: 'Image source non trouvée dans la page' })
      }

      // Optionnel: mettre à jour l'alt si fourni
      if (newAlt) {
        // Chercher l'alt de l'image (proche du src remplacé)
        const imgTagRegex = new RegExp(`(<img[^>]*src="${escapeRegex(newSrc)}"[^>]*)alt="[^"]*"`, 'g')
        content = content.replace(imgTagRegex, `$1alt="${escapeHtml(newAlt)}"`)
      }

      // Sauvegarder
      await fs.writeFile(fullPath, content, 'utf-8')

      res.json({ 
        success: true, 
        oldSrc,
        newSrc,
        pagePath
      })
    } catch (err) {
      if (err.code === 'ENOENT') {
        return res.status(404).json({ error: 'Page non trouvée' })
      }
      console.error('Erreur remplacement image src:', err)
      res.status(500).json({ error: err.message })
    }
  })

  /**
   * POST /api/pages/replace-image-with-placeholder
   * Supprime une image et la remplace par un placeholder HTML
   */
  router.post('/replace-image-with-placeholder', async (req, res) => {
    try {
      const { pagePath, imageSrc, placeholderHtml } = req.body

      if (!pagePath || !imageSrc || !placeholderHtml) {
        return res.status(400).json({ error: 'Paramètres manquants: pagePath, imageSrc, placeholderHtml requis' })
      }

      const fullPath = join(srcPagesDir, pagePath)
      
      // Vérifier sécurité
      if (!fullPath.startsWith(srcPagesDir)) {
        return res.status(403).json({ error: 'Chemin non autorisé' })
      }

      let content = await fs.readFile(fullPath, 'utf-8')
      
      // Chercher la balise <img> complète contenant ce src
      // Patterns possibles:
      // <img src="..." ... />
      // <img ... src="..." />
      // <img ... src="...">
      const imgPatterns = [
        // Self-closing avec src au début
        new RegExp(`<img\\s+src=["']${escapeRegex(imageSrc)}["'][^>]*/?>`, 'gi'),
        // Self-closing avec src ailleurs
        new RegExp(`<img\\s+[^>]*src=["']${escapeRegex(imageSrc)}["'][^>]*/?>`, 'gi'),
        // Import Astro style: <Image src={import(...)} />
        new RegExp(`<Image\\s+[^>]*src=["']${escapeRegex(imageSrc)}["'][^>]*/?>`, 'gi')
      ]

      let replaced = false
      for (const pattern of imgPatterns) {
        if (pattern.test(content)) {
          content = content.replace(pattern, placeholderHtml)
          replaced = true
          break
        }
      }

      if (!replaced) {
        return res.status(404).json({ error: 'Balise image non trouvée dans la page' })
      }

      // Sauvegarder
      await fs.writeFile(fullPath, content, 'utf-8')

      res.json({ 
        success: true, 
        imageSrc,
        pagePath,
        message: 'Image remplacée par placeholder'
      })
    } catch (err) {
      if (err.code === 'ENOENT') {
        return res.status(404).json({ error: 'Page non trouvée' })
      }
      console.error('Erreur remplacement image par placeholder:', err)
      res.status(500).json({ error: err.message })
    }
  })

  /**
   * POST /api/pages/replace-placeholder
   * Remplace un placeholder par une balise image
   */
  router.post('/replace-placeholder', async (req, res) => {
    try {
      const { pagePath, placeholderId, imagePath, imageAlt } = req.body

      if (!pagePath || !placeholderId || !imagePath) {
        return res.status(400).json({ error: 'Paramètres manquants' })
      }

      const fullPath = join(srcPagesDir, pagePath)
      
      // Vérifier sécurité
      if (!fullPath.startsWith(srcPagesDir)) {
        return res.status(403).json({ error: 'Chemin non autorisé' })
      }

      const content = await fs.readFile(fullPath, 'utf-8')
      const placeholders = extractPlaceholders(content, pagePath)
      
      // Trouver le placeholder par ID
      const placeholder = placeholders.find(p => p.id === placeholderId)
      if (!placeholder) {
        return res.status(404).json({ error: 'Placeholder non trouvé' })
      }

      // Générer le nouveau code image
      const alt = imageAlt || placeholder.description || 'Image'
      const newImageCode = generateImageCode(imagePath, alt, placeholder.pattern)

      // Remplacer dans le contenu
      const newContent = content.slice(0, placeholder.startIndex) + 
                        newImageCode + 
                        content.slice(placeholder.endIndex)

      // Sauvegarder
      await fs.writeFile(fullPath, newContent, 'utf-8')

      res.json({ 
        success: true, 
        imagePath,
        replacedPlaceholder: placeholder.description
      })
    } catch (err) {
      console.error('Erreur remplacement placeholder:', err)
      res.status(500).json({ error: err.message })
    }
  })

  app.use('/api/pages', router)
}

/**
 * Liste récursive des pages .astro
 */
async function listPages(dir, basePath = '') {
  const pages = []
  
  const entries = await fs.readdir(dir, { withFileTypes: true })
  
  for (const entry of entries) {
    const entryPath = join(basePath, entry.name)
    const fullPath = join(dir, entry.name)
    
    if (entry.isDirectory()) {
      // Récursion dans les sous-dossiers
      const subPages = await listPages(fullPath, entryPath)
      pages.push(...subPages)
    } else if (entry.name.endsWith('.astro')) {
      // Lire le fichier pour compter les placeholders
      const content = await fs.readFile(fullPath, 'utf-8')
      const placeholders = extractPlaceholders(content, entryPath)
      
      pages.push({
        path: entryPath,
        name: entry.name.replace('.astro', ''),
        url: pagePathToUrl(entryPath),
        placeholderCount: placeholders.length
      })
    }
  }
  
  // Trier par nombre de placeholders (décroissant)
  pages.sort((a, b) => b.placeholderCount - a.placeholderCount)
  
  return pages
}

/**
 * Extrait tous les placeholders d'un contenu
 */
function extractPlaceholders(content, pagePath) {
  const placeholders = []
  let idCounter = 0

  for (const pattern of PLACEHOLDER_PATTERNS) {
    const regex = new RegExp(pattern.regex.source, pattern.regex.flags)
    let match

    while ((match = regex.exec(content)) !== null) {
      const description = pattern.extractDescription(match) || 'Placeholder'
      const startIndex = match.index
      const endIndex = match.index + match[0].length
      
      // Extraire le contexte (lignes avant/après)
      const context = extractContext(content, startIndex, endIndex)
      
      placeholders.push({
        id: `${pagePath}-${idCounter++}`,
        pattern: pattern.name,
        description,
        context,
        startIndex,
        endIndex,
        matchedText: match[0].substring(0, 200) + (match[0].length > 200 ? '...' : '')
      })
    }
  }

  // Dédupliquer (certains patterns peuvent matcher la même zone)
  return deduplicatePlaceholders(placeholders)
}

/**
 * Extrait le contexte autour d'un placeholder
 */
function extractContext(content, startIndex, endIndex) {
  // Chercher les titres (h1, h2, h3) et paragraphes avant le placeholder
  const before = content.substring(Math.max(0, startIndex - 2000), startIndex)
  const after = content.substring(endIndex, Math.min(content.length, endIndex + 500))

  // Extraire le titre le plus proche
  const titleMatch = before.match(/<h[1-3][^>]*>([^<]+)<\/h[1-3]>/gi)
  const nearestTitle = titleMatch ? titleMatch[titleMatch.length - 1].replace(/<[^>]+>/g, '').trim() : null

  // Extraire les paragraphes proches
  const paragraphs = []
  const pMatches = before.match(/<p[^>]*>([^<]+)<\/p>/gi) || []
  for (const p of pMatches.slice(-3)) {
    const text = p.replace(/<[^>]+>/g, '').trim()
    if (text.length > 10 && !text.toLowerCase().includes('placeholder')) {
      paragraphs.push(text)
    }
  }

  return {
    nearestTitle,
    paragraphs,
    sectionHint: inferSectionFromContext(nearestTitle, paragraphs)
  }
}

/**
 * Déduit le sujet de la section depuis le contexte
 */
function inferSectionFromContext(title, paragraphs) {
  const allText = [title, ...paragraphs].filter(Boolean).join(' ').toLowerCase()
  
  // Mots-clés pour détecter le sujet
  const hints = {
    'facade': ['façade', 'facade', 'extérieur', 'exterieur', 'sud', 'nord', 'est', 'ouest'],
    'enduit': ['enduit', 'chaux', 'terre', 'finition'],
    'charpente': ['charpente', 'toit', 'couverture', 'structure'],
    'paille': ['paille', 'bottes', 'isolation', 'mur'],
    'interieur': ['intérieur', 'interieur', 'salon', 'chambre', 'cuisine'],
    'equipe': ['équipe', 'equipe', 'chantier', 'bénévoles', 'benevoles'],
    'aerien': ['drone', 'aérien', 'aerien', 'vue', 'domaine'],
    'portrait': ['portrait', 'photo', 'personne', 'fondateur']
  }

  for (const [hint, keywords] of Object.entries(hints)) {
    if (keywords.some(kw => allText.includes(kw))) {
      return hint
    }
  }

  return null
}

/**
 * Déduplique les placeholders qui se chevauchent
 */
function deduplicatePlaceholders(placeholders) {
  const sorted = [...placeholders].sort((a, b) => a.startIndex - b.startIndex)
  const result = []
  
  for (const ph of sorted) {
    // Vérifier si chevauche le dernier ajouté
    const last = result[result.length - 1]
    if (!last || ph.startIndex >= last.endIndex) {
      result.push(ph)
    }
  }
  
  return result
}

/**
 * Convertit un chemin de page en URL
 */
function pagePathToUrl(pagePath) {
  return '/' + pagePath
    .replace(/\.astro$/, '')
    .replace(/\/index$/, '')
    .replace(/^index$/, '')
}

/**
 * Génère le code HTML pour une image
 */
function generateImageCode(imagePath, alt, patternType) {
  // Adapter le code généré selon le type de placeholder
  switch (patternType) {
    case 'visual-box':
    case 'aspect-box':
      return `<img 
          src="${imagePath}" 
          alt="${escapeHtml(alt)}"
          class="w-full h-full object-cover"
          loading="lazy"
        />`
    
    case 'comment-spec':
      return `<img 
          src="${imagePath}" 
          alt="${escapeHtml(alt)}"
          class="w-full"
          loading="lazy"
        />`
    
    default:
      return `<img src="${imagePath}" alt="${escapeHtml(alt)}" loading="lazy" />`
  }
}

/**
 * Échappe les caractères HTML
 */
function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/**
 * Échappe les caractères spéciaux pour RegExp
 */
function escapeRegex(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Génère un nom de fichier SEO depuis le contexte
 */
export function generateSeoFilename(context, pageName) {
  const parts = []
  
  // Ajouter le nom de la page (simplifié)
  const pageSlug = pageName
    .replace(/\.astro$/, '')
    .replace(/[^a-z0-9]/gi, '-')
    .toLowerCase()
  parts.push(pageSlug)
  
  // Ajouter le hint de section si disponible
  if (context.sectionHint) {
    parts.push(context.sectionHint)
  }
  
  // Ajouter des mots-clés du titre
  if (context.nearestTitle) {
    const titleSlug = context.nearestTitle
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s]/gi, '')
      .trim()
      .split(/\s+/)
      .slice(0, 3)
      .join('-')
      .toLowerCase()
    if (titleSlug && !parts.includes(titleSlug)) {
      parts.push(titleSlug)
    }
  }
  
  return parts.join('-') + '.webp'
}
