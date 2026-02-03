/**
 * LAOM Image Manager v3 - Squarespace-style UX
 * 
 * Fullscreen site view + modal phototheque on image click
 */

// State
const state = {
  currentPath: '/',
  currentPageFile: null,
  selectedImage: null,
  selectedPhoto: null, // Photo chosen from phototheque
  folders: [],
  currentFolder: 'all',
  photos: []
}

// DOM Elements
const elements = {
  iframe: document.getElementById('site-iframe'),
  iframeLoading: document.getElementById('iframe-loading'),
  currentPage: document.getElementById('current-page'),
  gitStatus: document.getElementById('git-status'),
  
  // Modal
  modal: document.getElementById('modal-phototheque'),
  modalTitleText: document.getElementById('modal-title-text'),
  modalSubtitle: document.getElementById('modal-subtitle'),
  currentImageSection: document.getElementById('current-image-section'),
  currentImagePreview: document.getElementById('current-image-preview'),
  folderTabs: document.getElementById('folder-tabs'),
  photosGrid: document.getElementById('photos-grid'),
  uploadZone: document.getElementById('upload-zone'),
  fileInput: document.getElementById('file-input'),
  btnClose: document.getElementById('btn-close-modal'),
  btnCancel: document.getElementById('btn-cancel'),
  btnReplace: document.getElementById('btn-replace'),
  
  // Other
  toastContainer: document.getElementById('toast-container'),
  processingOverlay: document.getElementById('processing-overlay'),
  processingMessage: document.getElementById('processing-message')
}

// Initialize
document.addEventListener('DOMContentLoaded', init)

async function init() {
  setupIframeListener()
  setupEventListeners()
  
  await Promise.all([
    loadPhototheque(),
    loadGitStatus()
  ])
  
  // Hide loading once iframe loads
  elements.iframe.addEventListener('load', () => {
    elements.iframeLoading.classList.add('hidden')
  })
}

// API helper
async function api(endpoint, options = {}) {
  const response = await fetch(`/api${endpoint}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
    body: options.body ? JSON.stringify(options.body) : undefined
  })
  return response.json()
}

// Setup iframe message listener
function setupIframeListener() {
  window.addEventListener('message', (event) => {
    if (event.origin !== 'http://localhost:3000') return
    
    const { type, ...data } = event.data
    
    switch (type) {
      case 'PAGE_CHANGE':
        handlePageChange(data)
        break
      case 'IMAGE_SELECTED':
        handleImageSelected(data)
        break
    }
  })
}

// Handle page change from iframe
async function handlePageChange(data) {
  state.currentPath = data.path
  elements.currentPage.textContent = data.path
  state.currentPageFile = await findPageFile(data.path)
}

// Find .astro file for URL path
async function findPageFile(urlPath) {
  try {
    const data = await api('/pages')
    const page = data.pages?.find(p => p.url === urlPath || p.url === urlPath.replace(/\/$/, ''))
    return page?.path || null
  } catch (err) {
    console.error('Error finding page file:', err)
    return null
  }
}

// Handle image selection from iframe → open modal
function handleImageSelected(data) {
  state.selectedImage = data
  state.selectedPhoto = null
  
  // Update modal content
  if (data.isPlaceholder) {
    elements.modalTitleText.textContent = 'Ajouter une image'
    elements.modalSubtitle.textContent = data.description || 'Placeholder'
    elements.currentImagePreview.innerHTML = `
      <div class="placeholder-preview">➕</div>
      <div class="current-image-info">
        <div class="filename">Placeholder</div>
        <div class="dimensions">${truncate(data.description, 50)}</div>
      </div>
    `
  } else {
    const filename = getFilename(data.src)
    elements.modalTitleText.textContent = 'Remplacer l\'image'
    elements.modalSubtitle.textContent = filename
    elements.currentImagePreview.innerHTML = `
      <img src="${data.src}" alt="">
      <div class="current-image-info">
        <div class="filename">${filename}</div>
        <div class="dimensions">${data.width || '?'} x ${data.height || '?'}</div>
      </div>
    `
  }
  
  // Reset selection state
  elements.btnReplace.disabled = true
  document.querySelectorAll('.photo-item.selected').forEach(el => el.classList.remove('selected'))
  
  // Show modal
  openModal()
}

// Open modal
function openModal() {
  elements.modal.classList.remove('hidden')
  document.body.style.overflow = 'hidden'
}

// Close modal
function closeModal() {
  elements.modal.classList.add('hidden')
  document.body.style.overflow = ''
  
  // Deselect in iframe
  elements.iframe.contentWindow?.postMessage({ type: 'DESELECT' }, 'http://localhost:3000')
  
  // Reset state
  state.selectedImage = null
  state.selectedPhoto = null
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
  
  if (photosToShow.length === 0) {
    elements.photosGrid.innerHTML = '<p class="empty-state">Aucune photo dans ce dossier</p>'
    return
  }
  
  elements.photosGrid.innerHTML = photosToShow.map(photo => `
    <div class="photo-item" 
         data-folder="${photo.folder}" 
         data-name="${photo.name}">
      <img src="/api/phototheque/photo/${encodeURIComponent(photo.folder)}/${encodeURIComponent(photo.name)}" 
           alt="${photo.name}"
           loading="lazy">
      <span class="photo-name">${photo.name}</span>
    </div>
  `).join('')
  
  // Add click handlers
  setupPhotoClickListeners()
}

// Setup photo click listeners
function setupPhotoClickListeners() {
  document.querySelectorAll('.photo-item').forEach(item => {
    item.addEventListener('click', () => {
      // Deselect previous
      document.querySelectorAll('.photo-item.selected').forEach(el => el.classList.remove('selected'))
      
      // Select this one
      item.classList.add('selected')
      state.selectedPhoto = {
        folder: item.dataset.folder,
        name: item.dataset.name
      }
      
      // Enable replace button
      elements.btnReplace.disabled = false
    })
  })
}

// Load git status
async function loadGitStatus() {
  try {
    const data = await api('/git/status')
    if (data.isClean) {
      elements.gitStatus.textContent = 'Synced'
      elements.gitStatus.className = 'git-status synced'
    } else {
      elements.gitStatus.textContent = `${data.modified?.length || 0} changes`
      elements.gitStatus.className = 'git-status pending'
    }
  } catch (err) {
    elements.gitStatus.textContent = ''
    elements.gitStatus.className = 'git-status'
  }
}

// Setup event listeners
function setupEventListeners() {
  // Modal close buttons
  elements.btnClose.addEventListener('click', closeModal)
  elements.btnCancel.addEventListener('click', closeModal)
  
  // Backdrop click to close
  elements.modal.querySelector('.modal-backdrop').addEventListener('click', closeModal)
  
  // Escape key to close
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !elements.modal.classList.contains('hidden')) {
      closeModal()
    }
  })
  
  // Replace button
  elements.btnReplace.addEventListener('click', executeReplacement)
  
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
}

// Handle file drop
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
      
      // Auto-select the first uploaded photo
      if (data.uploaded.length > 0) {
        const uploadedPhoto = data.uploaded[0]
        state.selectedPhoto = {
          folder: uploadedPhoto.folder || folder,
          name: uploadedPhoto.name
        }
        elements.btnReplace.disabled = false
        
        // Highlight in grid
        setTimeout(() => {
          const item = document.querySelector(`.photo-item[data-name="${uploadedPhoto.name}"]`)
          if (item) {
            document.querySelectorAll('.photo-item.selected').forEach(el => el.classList.remove('selected'))
            item.classList.add('selected')
            item.scrollIntoView({ behavior: 'smooth', block: 'center' })
          }
        }, 100)
      }
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

// Execute image replacement
async function executeReplacement() {
  if (!state.selectedImage || !state.selectedPhoto || !state.currentPageFile) {
    toast('Selection incomplete', 'error')
    return
  }
  
  showProcessing('Traitement de l\'image...')
  
  try {
    // 1. Process image (compress + rename + copy to public)
    const processResult = await api('/images/process', {
      method: 'POST',
      body: {
        sourceFolder: state.selectedPhoto.folder,
        sourceFile: state.selectedPhoto.name,
        context: state.selectedImage.isPlaceholder ? null : { 
          nearestTitle: null,
          paragraphs: [],
          sectionHint: inferSection(state.selectedImage.src)
        },
        pageName: state.currentPageFile.replace('.astro', ''),
        targetSubfolder: inferTargetSubfolder(state.currentPath)
      }
    })
    
    if (!processResult.success) {
      throw new Error(processResult.error || 'Erreur traitement image')
    }
    
    showProcessing('Mise a jour du code...')
    
    // 2. Replace in code
    if (state.selectedImage.isPlaceholder) {
      // Replace placeholder with image
      await api('/pages/replace-placeholder', {
        method: 'POST',
        body: {
          pagePath: state.currentPageFile,
          placeholderId: state.selectedImage.xpath,
          imagePath: processResult.publicPath,
          imageAlt: state.selectedImage.description?.substring(0, 100) || 'Image'
        }
      })
    } else {
      // Replace existing image src
      await api('/pages/replace-image-src', {
        method: 'POST',
        body: {
          pagePath: state.currentPageFile,
          oldSrc: state.selectedImage.src,
          newSrc: processResult.publicPath
        }
      })
    }
    
    showProcessing('Publication en cours...')
    
    // 3. Git commit + push
    const publishResult = await api('/git/publish', {
      method: 'POST',
      body: {
        imageName: processResult.processedFile,
        pageName: state.currentPageFile.replace('.astro', '')
      }
    })
    
    if (publishResult.pushed) {
      toast(`Image publiee !`, 'success')
    } else if (publishResult.committed) {
      toast(`Image commitee`, 'success')
    }
    
    // Close modal
    closeModal()
    
    // Refresh
    await loadGitStatus()
    
    // Refresh iframe after a short delay
    setTimeout(() => {
      elements.iframe.contentWindow?.postMessage({ type: 'REFRESH' }, 'http://localhost:3000')
    }, 500)
    
  } catch (err) {
    console.error('Erreur replacement:', err)
    toast('Erreur: ' + err.message, 'error')
  } finally {
    hideProcessing()
  }
}

// Utilities
function showProcessing(message = 'Traitement...') {
  elements.processingMessage.textContent = message
  elements.processingOverlay.classList.remove('hidden')
}

function hideProcessing() {
  elements.processingOverlay.classList.add('hidden')
}

function toast(message, type = 'success') {
  const toastEl = document.createElement('div')
  toastEl.className = `toast ${type}`
  toastEl.textContent = message
  elements.toastContainer.appendChild(toastEl)
  
  setTimeout(() => toastEl.remove(), 4000)
}

function truncate(str, len) {
  if (!str) return ''
  return str.length > len ? str.substring(0, len) + '...' : str
}

function getFilename(path) {
  if (!path) return ''
  return path.split('/').pop()
}

function inferSection(src) {
  if (!src) return null
  const lower = src.toLowerCase()
  if (lower.includes('facade')) return 'facade'
  if (lower.includes('interieur')) return 'interieur'
  if (lower.includes('charpente')) return 'charpente'
  if (lower.includes('paille')) return 'paille'
  return null
}

function inferTargetSubfolder(path) {
  if (!path) return null
  const lower = path.toLowerCase()
  if (lower.includes('grand-shambala')) return 'grand-shambala'
  if (lower.includes('petit-shambala')) return 'petit-shambala'
  if (lower.includes('salle') || lower.includes('pratique')) return 'salle-pratique'
  return null
}
