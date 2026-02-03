/**
 * LAOM Image Manager - Iframe Bridge v4
 * 
 * Script injecte dans l'iframe Astro pour permettre l'interaction avec les images.
 * 
 * v4 Changes:
 * - Fix placeholder detection: traverse children to find "Photo a prendre" text
 * - Fix hero image: higher z-index, better pointer-events handling
 * - Simplified overlay system
 */

(function() {
  'use strict';
  
  const PARENT_ORIGIN = 'http://localhost:3001';
  const OVERLAY_CLASS = 'laom-img-overlay';
  const SELECTED_CLASS = 'laom-img-selected';
  
  // State
  let selectedElement = null;
  let overlays = [];
  
  // Styles injectes
  const styles = `
    /* ========================================
       WRAPPER (pour images normales)
       ======================================== */
    .laom-wrapper {
      position: relative;
      display: inline-block;
    }
    
    .laom-wrapper-block {
      position: relative;
      display: block;
    }
    
    /* ========================================
       OVERLAY (ne bloque pas les clics)
       ======================================== */
    .${OVERLAY_CLASS} {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      pointer-events: none;
      z-index: 9990;
      transition: all 0.2s ease;
      box-sizing: border-box;
    }
    
    /* Bordure au survol */
    .laom-wrapper:hover .${OVERLAY_CLASS},
    .laom-wrapper-block:hover .${OVERLAY_CLASS} {
      border: 3px solid #C4A855;
      background: rgba(196, 168, 85, 0.1);
    }
    
    /* ========================================
       BOUTON MODIFIER
       ======================================== */
    .laom-edit-btn {
      position: absolute;
      top: 8px;
      right: 8px;
      width: 40px;
      height: 40px;
      background: #C4A855;
      color: #1a1a1a;
      border: none;
      border-radius: 8px;
      font-size: 18px;
      cursor: pointer;
      pointer-events: auto;
      opacity: 0;
      transform: scale(0.8);
      transition: all 0.2s ease;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      z-index: 9999;
    }
    
    .laom-edit-btn:hover {
      background: #d4b865;
      transform: scale(1.05);
    }
    
    /* Afficher le bouton au survol */
    .laom-wrapper:hover .laom-edit-btn,
    .laom-wrapper-block:hover .laom-edit-btn {
      opacity: 1;
      transform: scale(1);
    }
    
    /* ========================================
       HERO IMAGES (position absolute)
       ======================================== */
    .laom-hero-btn {
      position: absolute !important;
      top: 50% !important;
      left: 50% !important;
      transform: translate(-50%, -50%) scale(0.8);
      width: 56px;
      height: 56px;
      background: #C4A855;
      color: #1a1a1a;
      border: none;
      border-radius: 12px;
      font-size: 24px;
      cursor: pointer;
      pointer-events: auto;
      opacity: 0;
      transition: all 0.2s ease;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 20px rgba(0,0,0,0.4);
      z-index: 9999 !important;
    }
    
    .laom-hero-btn:hover {
      background: #d4b865;
      transform: translate(-50%, -50%) scale(1.1);
    }
    
    .laom-hero-container {
      position: absolute !important;
      inset: 0 !important;
      pointer-events: none;
      z-index: 9998 !important;
      transition: all 0.2s ease;
    }
    
    .laom-hero-container:hover {
      background: rgba(196, 168, 85, 0.15);
      border: 3px solid #C4A855;
    }
    
    .laom-hero-container:hover .laom-hero-btn {
      opacity: 1;
      transform: translate(-50%, -50%) scale(1);
    }
    
    .laom-hero-container .laom-hero-btn {
      pointer-events: auto;
    }
    
    /* ========================================
       PLACEHOLDERS
       ======================================== */
    .laom-placeholder-overlay {
      background: rgba(196, 168, 85, 0.15) !important;
      border: 2px dashed #C4A855 !important;
    }
    
    .laom-placeholder-overlay .laom-edit-btn {
      background: #2C2824;
      color: #C4A855;
      opacity: 1;
      transform: scale(1);
      top: 50%;
      left: 50%;
      right: auto;
      transform: translate(-50%, -50%);
    }
    
    .laom-placeholder-overlay .laom-edit-btn:hover {
      background: #3d3830;
    }
    
    .laom-wrapper:hover .laom-placeholder-overlay .laom-edit-btn,
    .laom-wrapper-block:hover .laom-placeholder-overlay .laom-edit-btn {
      transform: translate(-50%, -50%) scale(1.05);
    }
    
    /* ========================================
       SELECTION
       ======================================== */
    .${SELECTED_CLASS} {
      outline: 3px solid #C4A855 !important;
      outline-offset: 2px;
    }
  `;
  
  // Injecter les styles
  function injectStyles() {
    if (document.getElementById('laom-bridge-styles')) return;
    const styleEl = document.createElement('style');
    styleEl.id = 'laom-bridge-styles';
    styleEl.textContent = styles;
    document.head.appendChild(styleEl);
  }
  
  // Verifier si c'est un placeholder (cherche dans les enfants aussi)
  function isPlaceholder(el) {
    const textContent = (el.textContent || '').toLowerCase();
    const placeholderPhrases = [
      'placeholder',
      'photo a prendre',
      'photo à prendre',
      'image a ajouter',
      'image à ajouter',
      'photo à venir',
      'image à venir'
    ];
    
    return placeholderPhrases.some(phrase => textContent.includes(phrase));
  }
  
  // Verifier si un element est un conteneur placeholder (div avec bg beige)
  function isPlaceholderContainer(el) {
    if (!el || el.tagName === 'SCRIPT' || el.tagName === 'STYLE') return false;
    
    const className = el.className || '';
    const hasBeigeBg = className.includes('bg-[#E8E3D8]') || 
                       className.includes('E8E3D8') ||
                       className.includes('bg-neutral-200') ||
                       className.includes('bg-gray-200');
    
    if (!hasBeigeBg) return false;
    
    // Verifier si l'element ou ses enfants contiennent du texte placeholder
    return isPlaceholder(el);
  }
  
  // Verifier si une image est en position absolute (hero image)
  function isHeroImage(img) {
    const style = window.getComputedStyle(img);
    const position = style.position;
    const classList = img.className || '';
    
    // Position absolute ou fixed
    if (position === 'absolute' || position === 'fixed') {
      // Verifier si c'est une grande image (pas une icone)
      const rect = img.getBoundingClientRect();
      if (rect.width > 200 && rect.height > 200) {
        return true;
      }
    }
    
    // Classes Tailwind pour absolute
    if ((classList.includes('absolute') || classList.includes('fixed')) && 
        (classList.includes('inset-0') || classList.includes('inset-'))) {
      return true;
    }
    
    return false;
  }
  
  // Trouver le container positionne d'une image hero
  function findPositionedParent(img) {
    let parent = img.parentElement;
    let depth = 0;
    while (parent && parent !== document.body && depth < 10) {
      const style = window.getComputedStyle(parent);
      const pClass = parent.className || '';
      if (style.position === 'relative' || 
          style.position === 'absolute' || 
          style.position === 'fixed' ||
          pClass.includes('relative')) {
        return parent;
      }
      parent = parent.parentElement;
      depth++;
    }
    return img.parentElement;
  }
  
  // Creer le bouton d'edition
  function createEditButton(onClick, isPlaceholder = false, isHero = false) {
    const btn = document.createElement('button');
    btn.className = isHero ? 'laom-hero-btn' : 'laom-edit-btn';
    btn.innerHTML = isPlaceholder ? '➕' : '✏️';
    btn.title = isPlaceholder ? 'Ajouter une image' : 'Modifier cette image';
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      onClick();
    });
    return btn;
  }
  
  // Creer un overlay pour une image hero
  function createHeroOverlay(img) {
    if (img.dataset.laomProcessed) return;
    img.dataset.laomProcessed = 'true';
    
    const container = findPositionedParent(img);
    if (!container) return;
    if (container.querySelector('.laom-hero-container')) return;
    
    // Container pour le hover
    const hoverContainer = document.createElement('div');
    hoverContainer.className = 'laom-hero-container';
    
    // Bouton d'edition
    const btn = createEditButton(() => selectElement(img, false), false, true);
    hoverContainer.appendChild(btn);
    
    container.appendChild(hoverContainer);
    
    overlays.push({ element: img, overlay: hoverContainer, isHero: true });
  }
  
  // Creer un overlay pour une image normale ou placeholder
  function createNormalOverlay(element, isPlaceholderEl = false) {
    if (element.dataset.laomProcessed) return;
    element.dataset.laomProcessed = 'true';
    
    // Wrapper
    const wrapper = document.createElement('div');
    const isBlockLevel = element.tagName === 'DIV' || 
                         element.tagName === 'SECTION' || 
                         window.getComputedStyle(element).display === 'block' ||
                         window.getComputedStyle(element).display === 'flex';
    wrapper.className = isBlockLevel ? 'laom-wrapper-block' : 'laom-wrapper';
    
    // Overlay
    const overlay = document.createElement('div');
    overlay.className = OVERLAY_CLASS + (isPlaceholderEl ? ' laom-placeholder-overlay' : '');
    
    // Bouton
    const btn = createEditButton(() => selectElement(element, isPlaceholderEl), isPlaceholderEl);
    overlay.appendChild(btn);
    
    // Inserer
    element.parentNode.insertBefore(wrapper, element);
    wrapper.appendChild(element);
    wrapper.appendChild(overlay);
    
    overlays.push({ element, overlay, wrapper, isPlaceholder: isPlaceholderEl });
  }
  
  // Selectionner un element
  function selectElement(element, isPlaceholderEl) {
    // Deselectionner l'ancien
    if (selectedElement) {
      selectedElement.classList.remove(SELECTED_CLASS);
    }
    
    // Selectionner le nouveau
    selectedElement = element;
    element.classList.add(SELECTED_CLASS);
    
    // Construire les donnees
    const data = {
      type: 'IMAGE_SELECTED',
      isPlaceholder: isPlaceholderEl
    };
    
    if (isPlaceholderEl) {
      // Pour les placeholders, extraire la description du texte
      const text = element.textContent?.trim() || '';
      // Nettoyer le texte (enlever "Photo a prendre :" etc)
      const cleanText = text
        .replace(/^photo\s*(à|a)\s*prendre\s*:?\s*/i, '')
        .replace(/^image\s*(à|a)\s*(ajouter|venir)\s*:?\s*/i, '')
        .replace(/^placeholder\s*:?\s*/i, '')
        .trim();
      data.description = cleanText || text;
      data.html = element.outerHTML;
    } else {
      data.src = element.src;
      data.alt = element.alt || '';
      data.width = element.naturalWidth || element.width;
      data.height = element.naturalHeight || element.height;
    }
    
    data.xpath = getXPath(element);
    data.path = window.location.pathname;
    
    window.parent.postMessage(data, PARENT_ORIGIN);
  }
  
  // Notifier le parent d'un changement de page
  function notifyPageChange() {
    window.parent.postMessage({
      type: 'PAGE_CHANGE',
      path: window.location.pathname,
      images: getPageImages()
    }, PARENT_ORIGIN);
  }
  
  // Recuperer toutes les images de la page
  function getPageImages() {
    const images = [];
    
    // Images classiques
    document.querySelectorAll('img').forEach((img, index) => {
      if (img.closest('.laom-hero-container') || img.closest('.' + OVERLAY_CLASS)) return;
      
      const width = img.naturalWidth || img.width || img.getBoundingClientRect().width;
      const height = img.naturalHeight || img.height || img.getBoundingClientRect().height;
      if (width < 40 || height < 40) return;
      
      images.push({
        id: `img-${index}`,
        type: 'image',
        src: img.src,
        alt: img.alt || '',
        width,
        height,
        isHero: isHeroImage(img)
      });
    });
    
    // Placeholders
    document.querySelectorAll('div, section').forEach((el, index) => {
      if (el.dataset.laomProcessed) return;
      if (isPlaceholderContainer(el)) {
        images.push({
          id: `placeholder-${index}`,
          type: 'placeholder',
          description: el.textContent?.trim().substring(0, 200) || ''
        });
      }
    });
    
    return images;
  }
  
  // XPath
  function getXPath(element) {
    if (!element) return '';
    if (element.id) return `//*[@id="${element.id}"]`;
    
    const parts = [];
    let el = element;
    while (el && el.nodeType === Node.ELEMENT_NODE) {
      let index = 1;
      let sibling = el.previousElementSibling;
      while (sibling) {
        if (sibling.tagName === el.tagName) index++;
        sibling = sibling.previousElementSibling;
      }
      parts.unshift(`${el.tagName.toLowerCase()}[${index}]`);
      el = el.parentElement;
    }
    return '/' + parts.join('/');
  }
  
  // Scanner et ajouter les overlays
  function scanAndAddOverlays() {
    // 1. Images
    document.querySelectorAll('img').forEach(img => {
      if (img.dataset.laomProcessed) return;
      if (img.closest('.laom-hero-container') || img.closest('.' + OVERLAY_CLASS)) return;
      
      const width = img.naturalWidth || img.width || img.getBoundingClientRect().width;
      const height = img.naturalHeight || img.height || img.getBoundingClientRect().height;
      if (width < 40 || height < 40) return;
      
      if (isHeroImage(img)) {
        createHeroOverlay(img);
      } else {
        createNormalOverlay(img, false);
      }
    });
    
    // 2. Placeholders - chercher les divs avec bg beige qui contiennent "Photo a prendre"
    document.querySelectorAll('div, section').forEach(el => {
      if (el.dataset.laomProcessed) return;
      if (el.closest('.laom-wrapper') || el.closest('.laom-wrapper-block')) return;
      if (isPlaceholderContainer(el)) {
        createNormalOverlay(el, true);
      }
    });
  }
  
  // Ecouter les messages du parent
  window.addEventListener('message', (event) => {
    if (event.origin !== PARENT_ORIGIN) return;
    
    const { type, data } = event.data;
    
    switch (type) {
      case 'DESELECT':
        if (selectedElement) {
          selectedElement.classList.remove(SELECTED_CLASS);
          selectedElement = null;
        }
        break;
        
      case 'HIGHLIGHT':
        if (data && data.xpath) {
          try {
            const el = document.evaluate(
              data.xpath, 
              document, 
              null, 
              XPathResult.FIRST_ORDERED_NODE_TYPE, 
              null
            ).singleNodeValue;
            
            if (el) {
              el.scrollIntoView({ behavior: 'smooth', block: 'center' });
              el.classList.add(SELECTED_CLASS);
              setTimeout(() => el.classList.remove(SELECTED_CLASS), 2000);
            }
          } catch (e) {
            console.warn('[LAOM] Invalid xpath:', data.xpath);
          }
        }
        break;
        
      case 'REFRESH':
        // Nettoyer et rescanner
        overlays.forEach(o => {
          if (o.wrapper) {
            const el = o.element;
            o.wrapper.parentNode.insertBefore(el, o.wrapper);
            o.wrapper.remove();
            delete el.dataset.laomProcessed;
          } else if (o.overlay) {
            o.overlay.remove();
            delete o.element.dataset.laomProcessed;
          }
        });
        overlays = [];
        setTimeout(() => {
          scanAndAddOverlays();
          notifyPageChange();
        }, 100);
        break;
    }
  });
  
  // Observer les changements DOM
  const observer = new MutationObserver((mutations) => {
    let shouldScan = false;
    mutations.forEach(mutation => {
      if (mutation.addedNodes.length > 0) {
        shouldScan = true;
      }
    });
    if (shouldScan) {
      setTimeout(scanAndAddOverlays, 300);
    }
  });
  
  // Navigation
  function setupNavigationListener() {
    window.addEventListener('popstate', () => {
      setTimeout(() => {
        scanAndAddOverlays();
        notifyPageChange();
      }, 400);
    });
    
    document.addEventListener('click', (e) => {
      const link = e.target.closest('a');
      if (link && link.href && !link.href.startsWith('mailto:') && !link.href.startsWith('tel:')) {
        setTimeout(() => {
          scanAndAddOverlays();
          notifyPageChange();
        }, 600);
      }
    });
  }
  
  // Init
  function init() {
    console.log('[LAOM] Initializing iframe bridge v4...');
    
    injectStyles();
    
    const startScan = () => {
      setTimeout(() => {
        scanAndAddOverlays();
        notifyPageChange();
        setupNavigationListener();
        observer.observe(document.body, { childList: true, subtree: true });
        console.log('[LAOM] Bridge v4 ready');
      }, 400);
    };
    
    if (document.readyState === 'complete') {
      startScan();
    } else {
      window.addEventListener('load', startScan);
    }
  }
  
  init();
})();
