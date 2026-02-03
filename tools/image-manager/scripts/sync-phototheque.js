#!/usr/bin/env node
/**
 * Sync Phototheque Script
 * 
 * Copies images from /public/images/ to /phototheque/
 * Organizes them into semantic folders for easy browsing
 * 
 * Usage: node sync-phototheque.js [--dry-run]
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SITE_ROOT = path.resolve(__dirname, '../../..');

const SOURCE_DIR = path.join(SITE_ROOT, 'public/images');
const DEST_DIR = path.join(SITE_ROOT, 'phototheque');

const DRY_RUN = process.argv.includes('--dry-run');
const VERBOSE = process.argv.includes('--verbose') || process.argv.includes('-v');

// Image extensions to process
const IMAGE_EXTENSIONS = ['.webp', '.jpg', '.jpeg', '.png', '.gif', '.svg'];

// Folder mapping rules
// Priority: explicit source folder > filename pattern > fallback
const FOLDER_RULES = {
  // Direct source folder mappings
  sourceFolders: {
    'laom/grand-shambala': 'grand-shambala',
    'laom/coliving': 'coliving',
    'laom/laomfest': 'evenements',
    'laom/qui-sommes-nous': 'portraits',
    'laom/presentation': 'presentation',
    'laom/financement-participatif': 'financement',
    'laom/manifeste': 'manifeste',
    'laom/planification': 'planification',
    'laom/newsletter': 'newsletter',
  },
  
  // Filename pattern mappings (applied if no source folder match)
  filenamePatterns: [
    { pattern: /petit-shambala/i, folder: 'petit-shambala' },
    { pattern: /salle|pratique/i, folder: 'salle-pratique' },
    { pattern: /potager|jardin|ferme/i, folder: 'jardin-potager' },
    { pattern: /hero|background|bg/i, folder: 'hero-backgrounds' },
    { pattern: /vue-aerien|aerial|drone/i, folder: 'domaine' },
    { pattern: /logo/i, folder: 'logos' },
    { pattern: /event-|evenement/i, folder: 'evenements' },
    { pattern: /charly|samuel|colette|david|claire/i, folder: 'portraits' },
    { pattern: /tipi|camping/i, folder: 'hebergements' },
    { pattern: /immersion|mouvement|danse/i, folder: 'activites' },
  ],
  
  // Default folder for unmatched files
  defaultFolder: 'non-classe'
};

// Stats tracking
const stats = {
  total: 0,
  copied: 0,
  skipped: 0,
  errors: 0,
  byFolder: {}
};

/**
 * Get all image files recursively from a directory
 */
function getImageFiles(dir, baseDir = dir) {
  const files = [];
  
  if (!fs.existsSync(dir)) {
    return files;
  }
  
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    
    if (entry.isDirectory()) {
      files.push(...getImageFiles(fullPath, baseDir));
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase();
      if (IMAGE_EXTENSIONS.includes(ext)) {
        const relativePath = path.relative(baseDir, fullPath);
        files.push({
          fullPath,
          relativePath,
          filename: entry.name,
          ext
        });
      }
    }
  }
  
  return files;
}

/**
 * Determine destination folder for an image
 */
function getDestinationFolder(imageInfo) {
  const { relativePath, filename } = imageInfo;
  const relativeDir = path.dirname(relativePath);
  
  // 1. Check source folder mappings
  for (const [sourceFolder, destFolder] of Object.entries(FOLDER_RULES.sourceFolders)) {
    if (relativeDir.startsWith(sourceFolder) || relativeDir === sourceFolder) {
      return destFolder;
    }
  }
  
  // 2. Check filename patterns
  for (const { pattern, folder } of FOLDER_RULES.filenamePatterns) {
    if (pattern.test(filename)) {
      return folder;
    }
  }
  
  // 3. Default folder
  return FOLDER_RULES.defaultFolder;
}

/**
 * Check if we should skip this file (e.g., duplicate jpg when webp exists)
 */
function shouldSkipFile(imageInfo, allFiles) {
  const { filename, ext, fullPath } = imageInfo;
  
  // Skip non-webp if webp version exists
  if (ext !== '.webp') {
    const baseName = filename.replace(ext, '');
    const webpExists = allFiles.some(f => 
      f.filename === `${baseName}.webp` && 
      path.dirname(f.fullPath) === path.dirname(fullPath)
    );
    if (webpExists) {
      return { skip: true, reason: 'webp version exists' };
    }
  }
  
  // Skip .DS_Store and other system files
  if (filename.startsWith('.')) {
    return { skip: true, reason: 'hidden file' };
  }
  
  return { skip: false };
}

/**
 * Copy a file to destination
 */
function copyFile(src, dest) {
  if (DRY_RUN) {
    return true;
  }
  
  try {
    // Ensure destination directory exists
    const destDir = path.dirname(dest);
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }
    
    // Copy file
    fs.copyFileSync(src, dest);
    return true;
  } catch (error) {
    console.error(`Error copying ${src}: ${error.message}`);
    return false;
  }
}

/**
 * Main sync function
 */
function syncPhototheque() {
  console.log('='.repeat(60));
  console.log('LAOM Phototheque Sync');
  console.log('='.repeat(60));
  console.log(`Source: ${SOURCE_DIR}`);
  console.log(`Destination: ${DEST_DIR}`);
  if (DRY_RUN) {
    console.log('\n>>> DRY RUN MODE - No files will be copied <<<\n');
  }
  console.log('');
  
  // Get all image files
  const allFiles = getImageFiles(SOURCE_DIR);
  stats.total = allFiles.length;
  
  console.log(`Found ${allFiles.length} image files to process\n`);
  
  // Process each file
  for (const imageInfo of allFiles) {
    // Check if should skip
    const skipCheck = shouldSkipFile(imageInfo, allFiles);
    if (skipCheck.skip) {
      if (VERBOSE) {
        console.log(`SKIP: ${imageInfo.relativePath} (${skipCheck.reason})`);
      }
      stats.skipped++;
      continue;
    }
    
    // Determine destination folder
    const destFolder = getDestinationFolder(imageInfo);
    const destPath = path.join(DEST_DIR, destFolder, imageInfo.filename);
    
    // Check if already exists
    if (fs.existsSync(destPath) && !DRY_RUN) {
      if (VERBOSE) {
        console.log(`EXISTS: ${destFolder}/${imageInfo.filename}`);
      }
      stats.skipped++;
      continue;
    }
    
    // Copy file
    if (VERBOSE || DRY_RUN) {
      console.log(`COPY: ${imageInfo.relativePath} -> ${destFolder}/${imageInfo.filename}`);
    }
    
    if (copyFile(imageInfo.fullPath, destPath)) {
      stats.copied++;
      stats.byFolder[destFolder] = (stats.byFolder[destFolder] || 0) + 1;
    } else {
      stats.errors++;
    }
  }
  
  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total files found: ${stats.total}`);
  console.log(`Files copied: ${stats.copied}`);
  console.log(`Files skipped: ${stats.skipped}`);
  console.log(`Errors: ${stats.errors}`);
  console.log('\nFiles per folder:');
  
  const sortedFolders = Object.entries(stats.byFolder).sort((a, b) => b[1] - a[1]);
  for (const [folder, count] of sortedFolders) {
    console.log(`  ${folder}: ${count}`);
  }
  
  if (DRY_RUN) {
    console.log('\n>>> This was a dry run. Run without --dry-run to actually copy files. <<<');
  }
}

// Run
syncPhototheque();
