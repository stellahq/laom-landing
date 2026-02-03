/**
 * Module Photothèque
 * 
 * Gestion des photos sources organisées par dossiers thématiques
 * - CRUD dossiers
 * - Upload / déplacement / suppression photos
 */

import { Router } from 'express'
import multer from 'multer'
import { promises as fs } from 'fs'
import { join, extname, basename } from 'path'

const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.gif']

/**
 * Configure les routes de la photothèque
 */
export function setupPhotothequeRoutes(app, config) {
  const router = Router()
  const { photothequeDir } = config

  // Configuration multer pour upload
  const storage = multer.diskStorage({
    destination: async (req, file, cb) => {
      const folder = req.body.folder || 'non-classe'
      const destDir = join(photothequeDir, folder)
      
      try {
        await fs.mkdir(destDir, { recursive: true })
        cb(null, destDir)
      } catch (err) {
        cb(err)
      }
    },
    filename: (req, file, cb) => {
      // Garder le nom original, nettoyer les caractères spéciaux
      const cleanName = file.originalname
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9.-]/g, '-')
        .replace(/-+/g, '-')
        .toLowerCase()
      cb(null, cleanName)
    }
  })

  const upload = multer({
    storage,
    fileFilter: (req, file, cb) => {
      const ext = extname(file.originalname).toLowerCase()
      if (ALLOWED_EXTENSIONS.includes(ext)) {
        cb(null, true)
      } else {
        cb(new Error(`Extension non supportée: ${ext}`))
      }
    },
    limits: {
      fileSize: 50 * 1024 * 1024 // 50 Mo max
    }
  })

  /**
   * GET /api/phototheque
   * Liste tous les dossiers et leurs photos
   */
  router.get('/', async (req, res) => {
    try {
      const folders = await listFolders(photothequeDir)
      res.json({ folders })
    } catch (err) {
      console.error('Erreur listage photothèque:', err)
      res.status(500).json({ error: err.message })
    }
  })

  /**
   * POST /api/phototheque/folders
   * Créer un nouveau dossier
   */
  router.post('/folders', async (req, res) => {
    try {
      const { name } = req.body
      if (!name) {
        return res.status(400).json({ error: 'Nom de dossier requis' })
      }

      const safeName = sanitizeFolderName(name)
      const folderPath = join(photothequeDir, safeName)

      // Vérifier si existe déjà
      try {
        await fs.access(folderPath)
        return res.status(409).json({ error: 'Ce dossier existe déjà' })
      } catch {
        // N'existe pas, on peut créer
      }

      await fs.mkdir(folderPath, { recursive: true })
      res.json({ success: true, name: safeName })
    } catch (err) {
      console.error('Erreur création dossier:', err)
      res.status(500).json({ error: err.message })
    }
  })

  /**
   * PUT /api/phototheque/folders/:name
   * Renommer un dossier
   */
  router.put('/folders/:name', async (req, res) => {
    try {
      const { name: oldName } = req.params
      const { newName } = req.body

      if (!newName) {
        return res.status(400).json({ error: 'Nouveau nom requis' })
      }

      const safeNewName = sanitizeFolderName(newName)
      const oldPath = join(photothequeDir, oldName)
      const newPath = join(photothequeDir, safeNewName)

      // Vérifier que l'ancien existe
      try {
        await fs.access(oldPath)
      } catch {
        return res.status(404).json({ error: 'Dossier non trouvé' })
      }

      // Vérifier que le nouveau n'existe pas
      try {
        await fs.access(newPath)
        return res.status(409).json({ error: 'Un dossier avec ce nom existe déjà' })
      } catch {
        // OK
      }

      await fs.rename(oldPath, newPath)
      res.json({ success: true, name: safeNewName })
    } catch (err) {
      console.error('Erreur renommage dossier:', err)
      res.status(500).json({ error: err.message })
    }
  })

  /**
   * DELETE /api/phototheque/folders/:name
   * Supprimer un dossier (seulement si vide)
   */
  router.delete('/folders/:name', async (req, res) => {
    try {
      const { name } = req.params
      const folderPath = join(photothequeDir, name)

      // Vérifier que le dossier existe et est vide
      const files = await fs.readdir(folderPath)
      const realFiles = files.filter(f => !f.startsWith('.'))
      
      if (realFiles.length > 0) {
        return res.status(400).json({ 
          error: 'Le dossier n\'est pas vide',
          count: realFiles.length
        })
      }

      await fs.rmdir(folderPath)
      res.json({ success: true })
    } catch (err) {
      if (err.code === 'ENOENT') {
        return res.status(404).json({ error: 'Dossier non trouvé' })
      }
      console.error('Erreur suppression dossier:', err)
      res.status(500).json({ error: err.message })
    }
  })

  /**
   * POST /api/phototheque/upload
   * Upload une ou plusieurs photos
   */
  router.post('/upload', upload.array('photos', 20), async (req, res) => {
    try {
      const uploaded = req.files.map(f => ({
        name: f.filename,
        folder: req.body.folder || 'non-classe',
        size: f.size,
        path: f.path
      }))
      res.json({ success: true, uploaded })
    } catch (err) {
      console.error('Erreur upload:', err)
      res.status(500).json({ error: err.message })
    }
  })

  /**
   * POST /api/phototheque/move
   * Déplacer une photo vers un autre dossier
   */
  router.post('/move', async (req, res) => {
    try {
      const { photo, fromFolder, toFolder } = req.body

      if (!photo || !fromFolder || !toFolder) {
        return res.status(400).json({ error: 'Paramètres manquants' })
      }

      const srcPath = join(photothequeDir, fromFolder, photo)
      const destDir = join(photothequeDir, toFolder)
      const destPath = join(destDir, photo)

      // Vérifier source
      try {
        await fs.access(srcPath)
      } catch {
        return res.status(404).json({ error: 'Photo non trouvée' })
      }

      // Créer dossier destination si nécessaire
      await fs.mkdir(destDir, { recursive: true })

      // Déplacer
      await fs.rename(srcPath, destPath)
      res.json({ success: true, newPath: destPath })
    } catch (err) {
      console.error('Erreur déplacement:', err)
      res.status(500).json({ error: err.message })
    }
  })

  /**
   * DELETE /api/phototheque/photo
   * Supprimer une photo
   */
  router.delete('/photo', async (req, res) => {
    try {
      const { photo, folder } = req.body

      if (!photo || !folder) {
        return res.status(400).json({ error: 'Paramètres manquants' })
      }

      const photoPath = join(photothequeDir, folder, photo)
      await fs.unlink(photoPath)
      res.json({ success: true })
    } catch (err) {
      if (err.code === 'ENOENT') {
        return res.status(404).json({ error: 'Photo non trouvée' })
      }
      console.error('Erreur suppression photo:', err)
      res.status(500).json({ error: err.message })
    }
  })

  /**
   * GET /api/phototheque/photo/:folder/:photo
   * Récupérer une photo (pour affichage)
   */
  router.get('/photo/:folder/:photo', async (req, res) => {
    try {
      const { folder, photo } = req.params
      const photoPath = join(photothequeDir, folder, photo)
      res.sendFile(photoPath)
    } catch (err) {
      res.status(404).json({ error: 'Photo non trouvée' })
    }
  })

  app.use('/api/phototheque', router)
}

/**
 * Liste tous les dossiers et leurs photos
 */
async function listFolders(baseDir) {
  const folders = []
  
  try {
    const entries = await fs.readdir(baseDir, { withFileTypes: true })
    
    for (const entry of entries) {
      if (entry.isDirectory() && !entry.name.startsWith('.')) {
        const folderPath = join(baseDir, entry.name)
        const photos = await listPhotos(folderPath)
        folders.push({
          name: entry.name,
          photos,
          count: photos.length
        })
      }
    }
  } catch (err) {
    // Dossier n'existe pas encore, retourner liste vide
    if (err.code !== 'ENOENT') throw err
  }

  // Trier par nom
  folders.sort((a, b) => a.name.localeCompare(b.name))
  
  return folders
}

/**
 * Liste les photos d'un dossier
 */
async function listPhotos(folderPath) {
  const photos = []
  
  try {
    const files = await fs.readdir(folderPath)
    
    for (const file of files) {
      const ext = extname(file).toLowerCase()
      if (ALLOWED_EXTENSIONS.includes(ext)) {
        const filePath = join(folderPath, file)
        const stats = await fs.stat(filePath)
        photos.push({
          name: file,
          size: stats.size,
          modified: stats.mtime
        })
      }
    }
  } catch (err) {
    if (err.code !== 'ENOENT') throw err
  }

  // Trier par date de modification (plus récent en premier)
  photos.sort((a, b) => new Date(b.modified) - new Date(a.modified))
  
  return photos
}

/**
 * Nettoie un nom de dossier
 */
function sanitizeFolderName(name) {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Enlever accents
    .replace(/[^a-zA-Z0-9-_ ]/g, '') // Garder que alphanum, tirets, underscores, espaces
    .replace(/\s+/g, '-') // Espaces → tirets
    .replace(/-+/g, '-') // Multiples tirets → un seul
    .toLowerCase()
    .trim()
}
