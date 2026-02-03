/**
 * Module Image Processor
 * 
 * Compression et optimisation des images
 * - Conversion en WebP
 * - Redimensionnement intelligent
 * - Génération de noms SEO-friendly
 */

import { Router } from 'express'
import sharp from 'sharp'
import { promises as fs } from 'fs'
import { join, extname, basename } from 'path'
import { generateSeoFilename } from './astro-parser.js'

// Configuration par défaut
const DEFAULT_CONFIG = {
  maxWidth: 1920,
  quality: 82,
  effort: 6
}

/**
 * Configure les routes du processeur d'images
 */
export function setupImageProcessorRoutes(app, config) {
  const router = Router()
  const { photothequeDir, publicImagesDir } = config

  /**
   * POST /api/images/process
   * Traite une image : compression + renommage + copie vers public
   */
  router.post('/process', async (req, res) => {
    try {
      const { 
        sourceFolder, 
        sourceFile, 
        context,
        pageName,
        targetSubfolder 
      } = req.body

      if (!sourceFolder || !sourceFile) {
        return res.status(400).json({ error: 'Paramètres manquants' })
      }

      // Chemin source dans la photothèque
      const sourcePath = join(photothequeDir, sourceFolder, sourceFile)
      
      // Vérifier que le fichier existe
      try {
        await fs.access(sourcePath)
      } catch {
        return res.status(404).json({ error: 'Image source non trouvée' })
      }

      // Générer le nom SEO
      const seoFilename = context 
        ? generateSeoFilename(context, pageName || sourceFolder)
        : generateBasicSeoFilename(sourceFile, sourceFolder)

      // Dossier de destination
      const targetDir = targetSubfolder 
        ? join(publicImagesDir, targetSubfolder)
        : publicImagesDir
      
      await fs.mkdir(targetDir, { recursive: true })
      
      const targetPath = join(targetDir, seoFilename)

      // Traiter l'image
      const result = await processImage(sourcePath, targetPath)

      // Chemin relatif pour utilisation dans le code
      const publicPath = '/images/laom/' + 
        (targetSubfolder ? targetSubfolder + '/' : '') + 
        seoFilename

      res.json({
        success: true,
        originalFile: sourceFile,
        processedFile: seoFilename,
        publicPath,
        savedBytes: result.savedBytes,
        savedPercent: result.savedPercent,
        dimensions: result.dimensions
      })
    } catch (err) {
      console.error('Erreur traitement image:', err)
      res.status(500).json({ error: err.message })
    }
  })

  /**
   * POST /api/images/preview
   * Génère un aperçu du nom SEO qui serait généré
   */
  router.post('/preview-name', async (req, res) => {
    try {
      const { sourceFile, sourceFolder, context, pageName } = req.body

      const seoFilename = context 
        ? generateSeoFilename(context, pageName || sourceFolder)
        : generateBasicSeoFilename(sourceFile, sourceFolder)

      res.json({ suggestedName: seoFilename })
    } catch (err) {
      res.status(500).json({ error: err.message })
    }
  })

  /**
   * GET /api/images/info/:folder/:file
   * Informations sur une image de la photothèque
   */
  router.get('/info/:folder/:file', async (req, res) => {
    try {
      const { folder, file } = req.params
      const imagePath = join(photothequeDir, folder, file)

      const stats = await fs.stat(imagePath)
      const metadata = await sharp(imagePath).metadata()

      res.json({
        file,
        folder,
        size: stats.size,
        sizeFormatted: formatBytes(stats.size),
        width: metadata.width,
        height: metadata.height,
        format: metadata.format,
        modified: stats.mtime
      })
    } catch (err) {
      if (err.code === 'ENOENT') {
        return res.status(404).json({ error: 'Image non trouvée' })
      }
      res.status(500).json({ error: err.message })
    }
  })

  app.use('/api/images', router)
}

/**
 * Traite une image : redimensionne et convertit en WebP
 */
async function processImage(sourcePath, targetPath, options = {}) {
  const config = { ...DEFAULT_CONFIG, ...options }
  
  // Lire les métadonnées
  const metadata = await sharp(sourcePath).metadata()
  const originalSize = (await fs.stat(sourcePath)).size

  // Calculer la nouvelle largeur
  const newWidth = metadata.width > config.maxWidth ? config.maxWidth : metadata.width

  // Traiter l'image
  await sharp(sourcePath)
    .resize(newWidth, null, { 
      withoutEnlargement: true,
      fit: 'inside'
    })
    .webp({ 
      quality: config.quality, 
      effort: config.effort 
    })
    .toFile(targetPath)

  // Calculer les stats
  const newSize = (await fs.stat(targetPath)).size
  const savedBytes = originalSize - newSize
  const savedPercent = Math.round((savedBytes / originalSize) * 100)

  // Nouvelles dimensions
  const newMetadata = await sharp(targetPath).metadata()

  return {
    savedBytes,
    savedPercent,
    originalSize,
    newSize,
    dimensions: {
      width: newMetadata.width,
      height: newMetadata.height
    }
  }
}

/**
 * Génère un nom de fichier SEO basique (sans contexte)
 */
function generateBasicSeoFilename(originalName, folderHint) {
  // Enlever l'extension
  const nameWithoutExt = originalName.replace(/\.[^.]+$/, '')
  
  // Nettoyer le nom
  let cleanName = nameWithoutExt
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Enlever accents
    .replace(/[^a-zA-Z0-9\s-]/g, '') // Garder alphanum, espaces, tirets
    .replace(/\s+/g, '-') // Espaces → tirets
    .replace(/-+/g, '-') // Multiple tirets → un seul
    .toLowerCase()
    .trim()

  // Ajouter le hint du dossier si le nom est trop générique
  if (cleanName.length < 5 || /^(p\d+|img|image|photo|dsc)/i.test(cleanName)) {
    const folderSlug = folderHint
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9]/g, '-')
      .toLowerCase()
    cleanName = `${folderSlug}-${cleanName}`
  }

  return cleanName + '.webp'
}

/**
 * Formate une taille en bytes
 */
function formatBytes(bytes) {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

export { processImage, generateBasicSeoFilename }
