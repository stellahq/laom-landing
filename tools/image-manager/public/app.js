/**
 * LAOM Image Manager - Application Frontend
 */

// State
const state = {
  pages: [],
  currentPage: null,
  placeholders: [],
  folders: [],
  currentFolder: 'all',
  photos: [],
  draggedPhoto: null,
  auditResults: null
}

// DOM Elements
const elements = {
  pagesList: document.getElementById('pages-list'),
  totalPlaceholders: document.getElementById('total-placeholders'),
  previewTitle: document.getElementById('preview-title'),
  previewContainer: document.getElementById('preview-container'),
  placeholdersPanel: document.getElementById('placeholders-panel'),
  placeholdersList: document.getElementById('placeholders-list'),
  placeholdersCount: document.getElementById('placeholders-count'),
  folderTabs: document.querySelector('.folder-tabs'),
  photosGrid: document.getElementById('photos-grid'),
  uploadZone: document.getElementById('upload-zone'),
  fileInput: document.getElementById('file-input'),
  gitStatus: document.getElementById('git-status'),
  toastContainer: document.getElementById('toast-container'),
  processingOverlay: document.getElementById('processing-overlay'),
  processingMessage: document.getElementById('processing-message')
}

// Initialize
document.addEventListener('DOMContentLoaded', init)

async function init() {
  await Promise.all([
    loadPages(),
    loadPhototheque(),
    loadGitStatus()
  ])
  
  setupEventListeners()
}

// API helpers
async function api(endpoint, options = {}) {
  const response = await fetch(`/api${endpoint}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
    body: options.body ? JSON.stringify(options.body) : undefined
  })
  return response.json()
}

// Load pages
async function loadPages() {
  try {
    const data = await api('/pages')
    state.pages = data.pages || []
    renderPages()
    
    const total = state.pages.reduce((sum, p) => sum + p.placeholderCount, 0)
    elements.totalPlaceholders.textContent = total
  } catch (err) {
    console.error('Erreur chargement pages:', err)
    toast('Erreur chargement pages', 'error')
  }
}

// Render pages list
function renderPages() {
  elements.pagesList.innerHTML = state.pages
    .filter(p => p.placeholderCount > 0 || state.currentPage?.path === p.path)
    .map(page => `
      <li data-path="${page.path}" class="${state.currentPage?.path === page.path ? 'active' : ''}">
        <span class="page-name">${page.name}</span>
        <span class="badge ${page.placeholderCount === 0 ? 'empty' : ''}">${page.placeholderCount}</span>
      </li>
    `).join('')
}

// Select a page
async function selectPage(pagePath) {
  try {
    const data = await api(`/pages/${encodeURIComponent(pagePath)}`)
    state.currentPage = data
    state.placeholders = data.placeholders || []
    
    // Update UI
    elements.previewTitle.textContent = pagePath.replace('.astro', '')
    document.getElementById('btn-open-page').disabled = false
    
    // Load iframe with the page
    const pageUrl = data.url || '/'
    elements.previewContainer.innerHTML = `
      <iframe src="http://localhost:3000${pageUrl}" id="preview-iframe"></iframe>
    `
    
    // Show placeholders panel
    if (state.placeholders.length > 0) {
      elements.placeholdersPanel.classList.remove('hidden')
      elements.placeholdersCount.textContent = state.placeholders.length
      renderPlaceholders()
    } else {
      elements.placeholdersPanel.classList.add('hidden')
    }
    
    renderPages()
  } catch (err) {
    console.error('Erreur chargement page:', err)
    toast('Erreur chargement page', 'error')
  }
}

// Render placeholders list
function renderPlaceholders() {
  elements.placeholdersList.innerHTML = state.placeholders.map((ph, index) => `
    <li data-id="${ph.id}" data-index="${index}">
      <div class="placeholder-desc">${ph.description || 'Placeholder'}</div>
      <div class="placeholder-context">
        ${ph.context?.nearestTitle ? `<strong>${ph.context.nearestTitle}</strong>` : ''}
        ${ph.context?.sectionHint ? ` - ${ph.context.sectionHint}` : ''}
      </div>
    </li>
  `).join('')
}

// Load phototheque
async function loadPhototheque() {
  try {
    const data = await api('/phototheque')
    state.folders = data.folders || []
    
    // Aggregate all photos
    state.photos = []
    for (const folder of state.folders) {
      for (const photo of folder.photos) {
        state.photos.push({ ...photo, folder: folder.name })
      }
    }
    
    renderFolderTabs()
    renderPhotos()
  } catch (err) {
    console.error('Erreur chargement phototheque:', err)
    toast('Erreur chargement phototheque', 'error')
  }
}

// Render folder tabs
function renderFolderTabs() {
  const defaultTab = '<button class="folder-tab active" data-folder="all">Tous</button>'
  const folderTabs = state.folders.map(f => 
    `<button class="folder-tab" data-folder="${f.name}">${f.name} (${f.count})</button>`
  ).join('')
  
  elements.folderTabs.innerHTML = defaultTab + folderTabs
}

// Render photos grid
function renderPhotos() {
  let photosToShow = state.photos
  
  if (state.currentFolder !== 'all') {
    photosToShow = state.photos.filter(p => p.folder === state.currentFolder)
  }
  
  elements.photosGrid.innerHTML = photosToShow.map(photo => `
    <div class="photo-item" 
         draggable="true" 
         data-folder="${photo.folder}" 
         data-name="${photo.name}">
      <img src="/api/phototheque/photo/${encodeURIComponent(photo.folder)}/${encodeURIComponent(photo.name)}" 
           alt="${photo.name}"
           loading="lazy">
      <span class="photo-name">${photo.name}</span>
      <div class="photo-actions">
        <button class="photo-action-btn" data-action="delete" title="Supprimer">x</button>
      </div>
    </div>
  `).join('')
  
  // Add drag event listeners
  document.querySelectorAll('.photo-item').forEach(item => {
    item.addEventListener('dragstart', handlePhotoDragStart)
    item.addEventListener('dragend', handlePhotoDragEnd)
  })
}

// Load git status
async function loadGitStatus() {
  try {
    const data = await api('/git/status')
    elements.gitStatus.textContent = data.isClean ? 'clean' : `${data.modified.length} modifies`
    elements.gitStatus.className = `git-status ${data.isClean ? 'clean' : 'dirty'}`
  } catch (err) {
    elements.gitStatus.textContent = 'git error'
    elements.gitStatus.className = 'git-status'
  }
}

// Setup event listeners
function setupEventListeners() {
  // Pages list click
  elements.pagesList.addEventListener('click', (e) => {
    const li = e.target.closest('li')
    if (li) {
      selectPage(li.dataset.path)
    }
  })
  
  // Folder tabs click
  elements.folderTabs.addEventListener('click', (e) => {
    if (e.target.classList.contains('folder-tab')) {
      document.querySelectorAll('.folder-tab').forEach(t => t.classList.remove('active'))
      e.target.classList.add('active')
      state.currentFolder = e.target.dataset.folder
      renderPhotos()
    }
  })
  
  // Upload zone
  elements.uploadZone.addEventListener('dragover', (e) => {
    e.preventDefault()
    elements.uploadZone.classList.add('dragover')
  })
  
  elements.uploadZone.addEventListener('dragleave', () => {
    elements.uploadZone.classList.remove('dragover')
  })
  
  elements.uploadZone.addEventListener('drop', handleFileDrop)
  
  elements.fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
      uploadFiles(e.target.files)
    }
  })
  
  // Placeholders drop zone
  elements.placeholdersList.addEventListener('dragover', (e) => {
    e.preventDefault()
    const li = e.target.closest('li')
    if (li) {
      document.querySelectorAll('.placeholders-list li').forEach(item => 
        item.classList.remove('drop-target')
      )
      li.classList.add('drop-target')
    }
  })
  
  elements.placeholdersList.addEventListener('dragleave', (e) => {
    const li = e.target.closest('li')
    if (li) li.classList.remove('drop-target')
  })
  
  elements.placeholdersList.addEventListener('drop', handlePlaceholderDrop)
  
  // New folder button
  document.getElementById('btn-new-folder').addEventListener('click', showNewFolderModal)
  
  // New folder modal actions
  document.getElementById('modal-new-folder').addEventListener('click', (e) => {
    const action = e.target.dataset.action
    if (action === 'cancel') {
      hideModal('modal-new-folder')
    } else if (action === 'create') {
      createFolder()
    }
  })
  
  // Audit button
  document.getElementById('btn-audit').addEventListener('click', showAuditModal)
  
  // Audit modal actions
  document.getElementById('modal-audit').addEventListener('click', (e) => {
    const action = e.target.dataset.action
    if (action === 'close') {
      hideModal('modal-audit')
    }
  })
  
  document.getElementById('btn-apply-all').addEventListener('click', applyAllRenames)
  
  // Place modal actions
  document.getElementById('modal-place').addEventListener('click', (e) => {
    const action = e.target.dataset.action
    if (action === 'cancel') {
      hideModal('modal-place')
    } else if (action === 'place') {
      executePlacement()
    }
  })
  
  // Refresh button
  document.getElementById('btn-refresh').addEventListener('click', async () => {
    await Promise.all([loadPages(), loadPhototheque(), loadGitStatus()])
    toast('Actualise', 'success')
  })
  
  // Open page button
  document.getElementById('btn-open-page').addEventListener('click', () => {
    if (state.currentPage) {
      window.open(`http://localhost:3000${state.currentPage.url}`, '_blank')
    }
  })
  
  // Photos actions (delete)
  elements.photosGrid.addEventListener('click', async (e) => {
    const btn = e.target.closest('.photo-action-btn')
    if (btn && btn.dataset.action === 'delete') {
      const item = btn.closest('.photo-item')
      if (confirm(`Supprimer ${item.dataset.name} ?`)) {
        await deletePhoto(item.dataset.folder, item.dataset.name)
      }
    }
  })
}

// Handle file drop on upload zone
async function handleFileDrop(e) {
  e.preventDefault()
  elements.uploadZone.classList.remove('dragover')
  
  const files = e.dataTransfer.files
  if (files.length > 0) {
    await uploadFiles(files)
  }
}

// Upload files
async function uploadFiles(files) {
  const folder = state.currentFolder === 'all' ? 'non-classe' : state.currentFolder
  
  const formData = new FormData()
  formData.append('folder', folder)
  for (const file of files) {
    formData.append('photos', file)
  }
  
  try {
    showProcessing('Upload en cours...')
    
    const response = await fetch('/api/phototheque/upload', {
      method: 'POST',
      body: formData
    })
    
    const data = await response.json()
    
    if (data.success) {
      toast(`${data.uploaded.length} photo(s) ajoutee(s)`, 'success')
      await loadPhototheque()
    } else {
      toast('Erreur upload: ' + data.error, 'error')
    }
  } catch (err) {
    console.error('Erreur upload:', err)
    toast('Erreur upload', 'error')
  } finally {
    hideProcessing()
  }
}

// Handle photo drag start
function handlePhotoDragStart(e) {
  state.draggedPhoto = {
    folder: e.target.dataset.folder,
    name: e.target.dataset.name
  }
  e.target.classList.add('dragging')
}

// Handle photo drag end
function handlePhotoDragEnd(e) {
  e.target.classList.remove('dragging')
  document.querySelectorAll('.drop-target').forEach(el => el.classList.remove('drop-target'))
}

// Handle drop on placeholder
async function handlePlaceholderDrop(e) {
  e.preventDefault()
  
  const li = e.target.closest('li')
  if (!li || !state.draggedPhoto) return
  
  li.classList.remove('drop-target')
  
  const placeholderIndex = parseInt(li.dataset.index)
  const placeholder = state.placeholders[placeholderIndex]
  
  if (!placeholder) return
  
  // Show placement modal
  showPlaceModal(state.draggedPhoto, placeholder)
}

// Show place modal
async function showPlaceModal(photo, placeholder) {
  document.getElementById('place-preview-img').src = 
    `/api/phototheque/photo/${encodeURIComponent(photo.folder)}/${encodeURIComponent(photo.name)}`
  
  document.getElementById('place-photo-name').textContent = `${photo.folder}/${photo.name}`
  document.getElementById('place-placeholder-desc').textContent = placeholder.description || 'Placeholder'
  
  // Get suggested SEO name
  try {
    const data = await api('/images/preview-name', {
      method: 'POST',
      body: {
        sourceFile: photo.name,
        sourceFolder: photo.folder,
        context: placeholder.context,
        pageName: state.currentPage?.path?.replace('.astro', '')
      }
    })
    document.getElementById('place-seo-name').value = data.suggestedName
  } catch (err) {
    document.getElementById('place-seo-name').value = photo.name.replace(/\.[^.]+$/, '.webp')
  }
  
  // Store placement data
  state.pendingPlacement = { photo, placeholder }
  
  showModal('modal-place')
}

// Execute placement
async function executePlacement() {
  const { photo, placeholder } = state.pendingPlacement
  const seoName = document.getElementById('place-seo-name').value
  
  hideModal('modal-place')
  showProcessing('Traitement de l\'image...')
  
  try {
    // 1. Process image (compress + rename + copy to public)
    const processResult = await api('/images/process', {
      method: 'POST',
      body: {
        sourceFolder: photo.folder,
        sourceFile: photo.name,
        context: placeholder.context,
        pageName: state.currentPage?.path?.replace('.astro', ''),
        targetSubfolder: inferTargetSubfolder(state.currentPage?.path)
      }
    })
    
    if (!processResult.success) {
      throw new Error(processResult.error || 'Erreur traitement image')
    }
    
    showProcessing('Mise a jour du code...')
    
    // 2. Replace placeholder in code
    const replaceResult = await api('/pages/replace-placeholder', {
      method: 'POST',
      body: {
        pagePath: state.currentPage.path,
        placeholderId: placeholder.id,
        imagePath: processResult.publicPath,
        imageAlt: placeholder.description
      }
    })
    
    if (!replaceResult.success) {
      throw new Error(replaceResult.error || 'Erreur remplacement placeholder')
    }
    
    showProcessing('Publication en cours...')
    
    // 3. Git commit + push
    const publishResult = await api('/git/publish', {
      method: 'POST',
      body: {
        imageName: seoName,
        pageName: state.currentPage?.path?.replace('.astro', '')
      }
    })
    
    if (publishResult.pushed) {
      toast(`Image publiee ! ${seoName}`, 'success')
    } else if (publishResult.committed) {
      toast(`Image commitee (push en attente)`, 'warning')
    } else {
      toast('Image placee (pas de changements a publier)', 'success')
    }
    
    // Refresh data
    await loadPages()
    await loadGitStatus()
    
    // Refresh current page
    if (state.currentPage) {
      await selectPage(state.currentPage.path)
    }
    
  } catch (err) {
    console.error('Erreur placement:', err)
    toast('Erreur: ' + err.message, 'error')
  } finally {
    hideProcessing()
    state.pendingPlacement = null
    state.draggedPhoto = null
  }
}

// Infer target subfolder based on page
function inferTargetSubfolder(pagePath) {
  if (!pagePath) return null
  
  const lower = pagePath.toLowerCase()
  if (lower.includes('grand-shambala')) return 'grand-shambala'
  if (lower.includes('petit-shambala')) return 'petit-shambala'
  if (lower.includes('salle') || lower.includes('pratique')) return 'salle-pratique'
  
  return null
}

// Delete photo
async function deletePhoto(folder, name) {
  try {
    const data = await api('/phototheque/photo', {
      method: 'DELETE',
      body: { folder, photo: name }
    })
    
    if (data.success) {
      toast('Photo supprimee', 'success')
      await loadPhototheque()
    } else {
      toast('Erreur: ' + data.error, 'error')
    }
  } catch (err) {
    console.error('Erreur suppression:', err)
    toast('Erreur suppression', 'error')
  }
}

// Show new folder modal
function showNewFolderModal() {
  document.getElementById('new-folder-name').value = ''
  showModal('modal-new-folder')
  document.getElementById('new-folder-name').focus()
}

// Create folder
async function createFolder() {
  const name = document.getElementById('new-folder-name').value.trim()
  if (!name) {
    toast('Nom de dossier requis', 'warning')
    return
  }
  
  try {
    const data = await api('/phototheque/folders', {
      method: 'POST',
      body: { name }
    })
    
    if (data.success) {
      toast(`Dossier "${data.name}" cree`, 'success')
      hideModal('modal-new-folder')
      await loadPhototheque()
    } else {
      toast('Erreur: ' + data.error, 'error')
    }
  } catch (err) {
    console.error('Erreur creation dossier:', err)
    toast('Erreur creation dossier', 'error')
  }
}

// Show audit modal
async function showAuditModal() {
  showModal('modal-audit')
  document.getElementById('audit-content').innerHTML = '<p>Analyse en cours...</p>'
  document.getElementById('btn-apply-all').disabled = true
  
  try {
    const data = await api('/seo/audit')
    state.auditResults = data
    
    if (data.issues.length === 0) {
      document.getElementById('audit-content').innerHTML = `
        <div class="audit-summary">
          <p>Toutes les images sont bien nommees ! (${data.stats.totalImages} images analysees)</p>
        </div>
      `
    } else {
      document.getElementById('btn-apply-all').disabled = false
      
      const issuesHtml = data.issues.map(issue => `
        <div class="audit-issue">
          <div class="audit-issue-header">
            <span class="audit-issue-current">${issue.currentName}</span>
          </div>
          <div class="audit-issue-suggested">Suggere: ${issue.suggestedName}</div>
          <div class="audit-issue-reason">${issue.reason}</div>
        </div>
      `).join('')
      
      document.getElementById('audit-content').innerHTML = `
        <div class="audit-summary">
          <p>${data.summary}</p>
        </div>
        ${issuesHtml}
      `
    }
  } catch (err) {
    console.error('Erreur audit:', err)
    document.getElementById('audit-content').innerHTML = `<p>Erreur: ${err.message}</p>`
  }
}

// Apply all renames
async function applyAllRenames() {
  if (!state.auditResults?.issues?.length) return
  
  const suggestions = state.auditResults.issues.map(i => ({
    currentPath: i.currentPath,
    suggestedName: i.suggestedName
  }))
  
  hideModal('modal-audit')
  showProcessing('Application des renommages...')
  
  try {
    const data = await api('/seo/rename-all', {
      method: 'POST',
      body: { suggestions }
    })
    
    if (data.success) {
      toast(`${data.successCount} images renommees`, 'success')
      
      // Git commit
      showProcessing('Publication des changements...')
      await api('/git/publish', {
        method: 'POST',
        body: { message: `refactor(images): rename ${data.successCount} images for SEO` }
      })
      
      await loadGitStatus()
    }
  } catch (err) {
    console.error('Erreur renommages:', err)
    toast('Erreur: ' + err.message, 'error')
  } finally {
    hideProcessing()
  }
}

// Modal helpers
function showModal(id) {
  document.getElementById(id).classList.remove('hidden')
}

function hideModal(id) {
  document.getElementById(id).classList.add('hidden')
}

// Processing overlay
function showProcessing(message = 'Traitement en cours...') {
  elements.processingMessage.textContent = message
  elements.processingOverlay.classList.remove('hidden')
}

function hideProcessing() {
  elements.processingOverlay.classList.add('hidden')
}

// Toast notifications
function toast(message, type = 'success') {
  const toast = document.createElement('div')
  toast.className = `toast ${type}`
  toast.textContent = message
  elements.toastContainer.appendChild(toast)
  
  setTimeout(() => {
    toast.remove()
  }, 4000)
}
