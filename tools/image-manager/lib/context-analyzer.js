/**
 * Module Context Analyzer
 * 
 * Analyse le contexte HTML autour d'une image pour generer
 * une description intelligente de placeholder
 */

import { Router } from 'express'
import { promises as fs } from 'fs'
import { join } from 'path'

/**
 * Configure les routes du context analyzer
 */
export function setupContextAnalyzerRoutes(app, config) {
  const router = Router()
  const { srcPagesDir } = config

  /**
   * POST /api/context/analyze
   * Analyse le contexte d'une image et genere une description
   */
  router.post('/analyze', async (req, res) => {
    try {
      const { pagePath, imageSrc, imageAlt } = req.body

      if (!pagePath) {
        return res.status(400).json({ error: 'pagePath requis' })
      }

      const fullPath = join(srcPagesDir, pagePath)
      const content = await fs.readFile(fullPath, 'utf-8')
      
      const description = generatePlaceholderDescription(content, imageSrc, imageAlt)
      
      res.json({ description })
    } catch (err) {
      console.error('Erreur analyse contexte:', err)
      res.status(500).json({ error: err.message })
    }
  })

  /**
   * POST /api/context/generate-placeholder
   * Genere le code HTML complet d'un placeholder
   */
  router.post('/generate-placeholder', async (req, res) => {
    try {
      const { pagePath, imageSrc, imageAlt, aspectRatio } = req.body

      if (!pagePath) {
        return res.status(400).json({ error: 'pagePath requis' })
      }

      const fullPath = join(srcPagesDir, pagePath)
      const content = await fs.readFile(fullPath, 'utf-8')
      
      const description = generatePlaceholderDescription(content, imageSrc, imageAlt)
      const placeholderHtml = generatePlaceholderHtml(description, aspectRatio)
      
      res.json({ description, html: placeholderHtml })
    } catch (err) {
      console.error('Erreur generation placeholder:', err)
      res.status(500).json({ error: err.message })
    }
  })

  app.use('/api/context', router)
}

/**
 * Genere une description intelligente pour un placeholder
 */
function generatePlaceholderDescription(pageContent, imageSrc, imageAlt) {
  const hints = []
  
  // 1. Analyser le nom de l'ancienne image
  if (imageSrc) {
    const imageHints = extractImageNameHints(imageSrc)
    if (imageHints) hints.push(imageHints)
  }
  
  // 2. Utiliser l'alt text existant
  if (imageAlt && imageAlt.length > 5) {
    hints.push(`Sujet : ${imageAlt}`)
  }
  
  // 3. Trouver le contexte dans la page
  if (imageSrc && pageContent) {
    const contextHints = extractContextFromPage(pageContent, imageSrc)
    if (contextHints) hints.push(contextHints)
  }
  
  // 4. Generer la description finale
  if (hints.length === 0) {
    return "Photo a definir selon le contexte de la section"
  }
  
  return formatDescription(hints)
}

/**
 * Extrait des indices du nom de fichier image
 */
function extractImageNameHints(imageSrc) {
  // Extraire le nom de fichier
  const filename = imageSrc.split('/').pop().replace(/\.[^.]+$/, '')
  
  // Nettoyer et extraire les mots-cles
  const words = filename
    .replace(/[-_]/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .toLowerCase()
    .split(/\s+/)
    .filter(w => w.length > 2 && !isGenericWord(w))
  
  if (words.length === 0) return null
  
  // Mapper vers des descriptions comprehensibles
  const mappedWords = words.map(mapWordToDescription).filter(Boolean)
  
  if (mappedWords.length > 0) {
    return `Elements : ${mappedWords.join(', ')}`
  }
  
  return null
}

/**
 * Extrait le contexte depuis le contenu de la page
 */
function extractContextFromPage(content, imageSrc) {
  // Trouver la position de l'image dans le contenu
  const imgIndex = content.indexOf(imageSrc)
  if (imgIndex === -1) return null
  
  // Extraire le contexte avant l'image (2000 caracteres)
  const before = content.substring(Math.max(0, imgIndex - 2000), imgIndex)
  
  // Chercher le titre le plus proche
  const titleMatches = before.match(/<h[1-3][^>]*>([^<]+)<\/h[1-3]>/gi)
  const nearestTitle = titleMatches 
    ? titleMatches[titleMatches.length - 1].replace(/<[^>]+>/g, '').trim()
    : null
  
  // Chercher les paragraphes proches
  const pMatches = before.match(/<p[^>]*>([^<]{20,})<\/p>/gi) || []
  const nearestParagraph = pMatches.length > 0
    ? pMatches[pMatches.length - 1].replace(/<[^>]+>/g, '').trim().substring(0, 150)
    : null
  
  const parts = []
  if (nearestTitle) parts.push(`Section : ${nearestTitle}`)
  if (nearestParagraph) parts.push(`Contexte : ${nearestParagraph}...`)
  
  return parts.length > 0 ? parts.join('. ') : null
}

/**
 * Formate la description finale
 */
function formatDescription(hints) {
  // Style LAOM : elegant, precis, evocateur
  const intro = getRandomIntro()
  const body = hints.join('. ')
  const style = getStyleGuideline(hints)
  
  return `${intro} ${body}. ${style}`
}

/**
 * Introductions variees pour les descriptions
 */
function getRandomIntro() {
  const intros = [
    "Photo suggeree :",
    "Image a capturer :",
    "Visuel recherche :",
    "Pour cette section :"
  ]
  return intros[Math.floor(Math.random() * intros.length)]
}

/**
 * Ajoute une guideline de style basee sur le contexte
 */
function getStyleGuideline(hints) {
  const allText = hints.join(' ').toLowerCase()
  
  if (allText.includes('facade') || allText.includes('exterieur')) {
    return "Privilegier une lumiere naturelle chaude, angle mettant en valeur les volumes."
  }
  if (allText.includes('interieur') || allText.includes('salon') || allText.includes('chambre')) {
    return "Atmosphere chaleureuse, lumiere naturelle, presence humaine suggeree."
  }
  if (allText.includes('chantier') || allText.includes('construction')) {
    return "Capturer l'energie du faire, mains au travail, materiaux bruts."
  }
  if (allText.includes('portrait') || allText.includes('equipe')) {
    return "Portrait naturel, regard franc, arriere-plan contextuel."
  }
  if (allText.includes('paille') || allText.includes('bois') || allText.includes('terre')) {
    return "Mettre en valeur la texture et la chaleur des materiaux naturels."
  }
  if (allText.includes('drone') || allText.includes('aerien') || allText.includes('vue')) {
    return "Vue d'ensemble revelant l'integration dans le paysage."
  }
  
  return "Style LAOM : authentique, lumineux, qui raconte une histoire."
}

/**
 * Mots generiques a ignorer
 */
function isGenericWord(word) {
  const generic = [
    'img', 'image', 'photo', 'pic', 'picture',
    'jpg', 'jpeg', 'png', 'webp', 'gif',
    'dsc', 'screenshot', 'screen',
    'new', 'final', 'copy', 'test',
    'the', 'and', 'for', 'with'
  ]
  return generic.includes(word) || /^\d+$/.test(word)
}

/**
 * Mappe un mot vers une description plus claire
 */
function mapWordToDescription(word) {
  const mapping = {
    'facade': 'facade du batiment',
    'sud': 'facade sud',
    'nord': 'facade nord',
    'exterieur': 'vue exterieure',
    'interieur': 'vue interieure',
    'charpente': 'charpente bois',
    'paille': 'construction paille',
    'enduit': 'enduits naturels',
    'chaux': 'enduit chaux',
    'terre': 'enduit terre',
    'drone': 'vue aerienne',
    'aerien': 'vue aerienne',
    'portrait': 'portrait',
    'equipe': 'equipe',
    'chantier': 'scene de chantier',
    'shambala': 'Grand Shambala',
    'grand': null, // ignore seul
    'petit': null,
    'salle': 'salle de pratique',
    'pratique': null,
    'cuisine': 'espace cuisine',
    'restaurant': 'espace restauration'
  }
  
  return mapping.hasOwnProperty(word) ? mapping[word] : word
}

/**
 * Genere le HTML complet d'un placeholder
 */
function generatePlaceholderHtml(description, aspectRatio = '16/10') {
  return `<div class="aspect-[${aspectRatio}] bg-[#E8E3D8] flex items-center justify-center border border-black/5 rounded-sm">
  <div class="text-center px-8">
    <p class="text-xs font-medium text-black/40 uppercase tracking-[0.2em] mb-2">Image a ajouter</p>
    <p class="text-sm font-light text-black/50 max-w-lg">${escapeHtml(description)}</p>
  </div>
</div>`
}

/**
 * Echappe les caracteres HTML
 */
function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export { 
  generatePlaceholderDescription, 
  generatePlaceholderHtml,
  extractContextFromPage 
}
