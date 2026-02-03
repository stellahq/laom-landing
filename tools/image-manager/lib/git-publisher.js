/**
 * Module Git Publisher
 * 
 * Gestion automatique des commits et push
 * - Commit automatique après ajout d'image
 * - Push vers remote
 * - Statut du repo
 */

import { Router } from 'express'
import simpleGit from 'simple-git'

/**
 * Configure les routes Git
 */
export function setupGitPublisherRoutes(app, config) {
  const router = Router()
  const { projectRoot } = config
  
  const git = simpleGit(projectRoot)

  /**
   * GET /api/git/status
   * Statut du repo Git
   */
  router.get('/status', async (req, res) => {
    try {
      const status = await git.status()
      const branch = await git.branchLocal()
      
      res.json({
        branch: branch.current,
        isClean: status.isClean(),
        staged: status.staged,
        modified: status.modified,
        created: status.created,
        deleted: status.deleted,
        conflicted: status.conflicted,
        ahead: status.ahead,
        behind: status.behind
      })
    } catch (err) {
      console.error('Erreur git status:', err)
      res.status(500).json({ error: err.message })
    }
  })

  /**
   * POST /api/git/publish
   * Commit et push les changements
   * Utilisé après ajout d'une image
   */
  router.post('/publish', async (req, res) => {
    try {
      const { 
        files, 
        message,
        imageName,
        pageName 
      } = req.body

      // Générer un message de commit si non fourni
      const commitMessage = message || generateCommitMessage(imageName, pageName)

      // Ajouter les fichiers
      if (files && files.length > 0) {
        await git.add(files)
      } else {
        // Ajouter tous les fichiers modifiés
        await git.add('.')
      }

      // Vérifier qu'il y a des changements à commiter
      const status = await git.status()
      if (status.staged.length === 0) {
        return res.json({ 
          success: true, 
          message: 'Aucun changement à publier',
          skipped: true
        })
      }

      // Commit
      const commitResult = await git.commit(commitMessage)
      
      // Push
      try {
        await git.push('origin', 'main')
      } catch (pushErr) {
        // Si le push échoue, on garde le commit local
        console.error('Erreur push (commit local conservé):', pushErr.message)
        return res.json({
          success: true,
          committed: true,
          pushed: false,
          commitHash: commitResult.commit,
          message: commitMessage,
          warning: 'Commit créé mais push échoué: ' + pushErr.message
        })
      }

      res.json({
        success: true,
        committed: true,
        pushed: true,
        commitHash: commitResult.commit,
        message: commitMessage,
        filesCommitted: status.staged
      })
    } catch (err) {
      console.error('Erreur publication:', err)
      res.status(500).json({ error: err.message })
    }
  })

  /**
   * POST /api/git/commit
   * Commit sans push (pour tests)
   */
  router.post('/commit', async (req, res) => {
    try {
      const { files, message } = req.body

      if (files && files.length > 0) {
        await git.add(files)
      }

      const status = await git.status()
      if (status.staged.length === 0) {
        return res.json({ success: true, skipped: true })
      }

      const commitResult = await git.commit(message || 'Image update via LAOM Image Manager')
      
      res.json({
        success: true,
        commitHash: commitResult.commit,
        filesCommitted: status.staged
      })
    } catch (err) {
      console.error('Erreur commit:', err)
      res.status(500).json({ error: err.message })
    }
  })

  /**
   * POST /api/git/push
   * Push vers remote
   */
  router.post('/push', async (req, res) => {
    try {
      await git.push('origin', 'main')
      res.json({ success: true })
    } catch (err) {
      console.error('Erreur push:', err)
      res.status(500).json({ error: err.message })
    }
  })

  /**
   * GET /api/git/log
   * Derniers commits
   */
  router.get('/log', async (req, res) => {
    try {
      const limit = parseInt(req.query.limit) || 10
      const log = await git.log({ maxCount: limit })
      
      res.json({
        commits: log.all.map(c => ({
          hash: c.hash.substring(0, 7),
          message: c.message,
          date: c.date,
          author: c.author_name
        }))
      })
    } catch (err) {
      console.error('Erreur git log:', err)
      res.status(500).json({ error: err.message })
    }
  })

  /**
   * POST /api/git/pull
   * Pull les dernières modifications
   */
  router.post('/pull', async (req, res) => {
    try {
      const result = await git.pull('origin', 'main')
      res.json({
        success: true,
        changes: result.summary.changes,
        insertions: result.summary.insertions,
        deletions: result.summary.deletions
      })
    } catch (err) {
      console.error('Erreur pull:', err)
      res.status(500).json({ error: err.message })
    }
  })

  app.use('/api/git', router)
}

/**
 * Génère un message de commit automatique
 */
function generateCommitMessage(imageName, pageName) {
  if (imageName && pageName) {
    return `feat(images): add ${imageName} to ${pageName}`
  } else if (imageName) {
    return `feat(images): add ${imageName}`
  } else {
    return `feat(images): update images via Image Manager`
  }
}

export { generateCommitMessage }
