#!/usr/bin/env node
/**
 * Convertit les photos partenaires (JPEG/JPG) en WebP et les copie dans public/images/laom/partenaires/
 */
import sharp from 'sharp'
import { mkdir, writeFile } from 'fs/promises'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const SOURCE_DIR = join(__dirname, '../../Photos LAOM/Photos partenaires - LAOM')
const OUT_DIR = join(__dirname, '../public/images/laom/partenaires')

// Fichiers convertis tels quels (qualité 85)
const FILES = [
  'Stage-guerison-blessures-partenaire-LAOM.jpg',
  'retraite-silence-amawe-partenaire-LAOM.jpeg',
  'Energie-illimitee-amawe-stage-partenaire-LAOM.jpeg',
  'Aime-Etre-retraite-partenaire-LAOM.jpeg',
  'au-coeur-de-tes-desirs-colette-partenaire-laom.jpg',
  'freres-d-ame-retraite-partenaire-LAOM.jpeg',
]

// Format paysage 4:3 pour la section événements partenaires (cover centré)
const LANDSCAPE_4_3 = { file: 'summer-camp-amawe-partenaire-LAOM.jpeg', width: 1200, height: 900 }

await mkdir(OUT_DIR, { recursive: true })

for (const file of FILES) {
  const base = file.replace(/\.(jpe?g|png)$/i, '')
  const src = join(SOURCE_DIR, file)
  const dest = join(OUT_DIR, `${base}.webp`)
  try {
    const buf = await sharp(src)
      .webp({ quality: 85 })
      .toBuffer()
    await writeFile(dest, buf)
    console.log(`✓ ${file} → ${base}.webp`)
  } catch (err) {
    console.error(`✗ ${file}:`, err.message)
  }
}

// Summer Camp : recadrage paysage 4:3
const { file: landscapeFile, width, height } = LANDSCAPE_4_3
const landscapeSrc = join(SOURCE_DIR, landscapeFile)
const landscapeBase = landscapeFile.replace(/\.(jpe?g|png)$/i, '')
const landscapeDest = join(OUT_DIR, `${landscapeBase}.webp`)
try {
  const buf = await sharp(landscapeSrc)
    .resize(width, height, { fit: 'cover', position: 'center' })
    .webp({ quality: 88 })
    .toBuffer()
  await writeFile(landscapeDest, buf)
  console.log(`✓ ${landscapeFile} → ${landscapeBase}.webp (paysage 4:3 ${width}×${height})`)
} catch (err) {
  console.error(`✗ ${landscapeFile}:`, err.message)
}

// Fyneo logo (PNG → WebP, nom sans espace pour URL)
const fyneoSrc = join(SOURCE_DIR, 'fyneo-logo-F-vert-texte-vert copie.png')
const fyneoDest = join(OUT_DIR, 'fyneo-logo-F-vert-texte-vert-copie.webp')
try {
  const buf = await sharp(fyneoSrc)
    .webp({ quality: 90 })
    .toBuffer()
  await writeFile(fyneoDest, buf)
  console.log('✓ fyneo-logo-F-vert-texte-vert copie.png → fyneo-logo-F-vert-texte-vert-copie.webp')
} catch (err) {
  console.error('✗ fyneo-logo-F-vert-texte-vert copie.png:', err.message)
}

console.log('Done.')
