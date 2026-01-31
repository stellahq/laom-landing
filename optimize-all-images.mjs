#!/usr/bin/env node

/**
 * Optimise toutes les images du site en WebP pour SEO et rapidité.
 * Usage: bun run optimize-all-images.mjs
 *
 * - Convertit jpg/jpeg/png → WebP (même dossier, quality 82, max 1920px)
 * - Préserve le ratio, pas de recadrage
 * - Ne remplace pas les originaux (crée .webp à côté)
 */

import sharp from 'sharp';
import { readdirSync, statSync, existsSync } from 'fs';
import { join, extname } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const IMAGES_DIR = join(__dirname, 'public', 'images');
const MAX_WIDTH = 1920;
const QUALITY = 82;
const EFFORT = 6;

const EXT_IN = ['.jpg', '.jpeg', '.png'];
const EXT_OUT = '.webp';

function* walk(dir) {
  const entries = readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = join(dir, e.name);
    if (e.isDirectory()) yield* walk(full);
    else if (e.isFile() && EXT_IN.includes(extname(e.name).toLowerCase())) yield full;
  }
}

async function optimizeOne(inputPath) {
  const outPath = inputPath.replace(/\.[^.]+$/i, EXT_OUT);
  if (existsSync(outPath)) {
    const inStat = statSync(inputPath);
    const outStat = statSync(outPath);
    if (outStat.mtimeMs >= inStat.mtimeMs) {
      console.log(`⏭️  Skip (up to date): ${outPath.replace(__dirname, '')}`);
      return { skipped: true };
    }
  }

  const meta = await sharp(inputPath).metadata();
  const w = meta.width || 0;
  const h = meta.height || 0;
  const resizeW = w > MAX_WIDTH ? MAX_WIDTH : w;

  await sharp(inputPath)
    .resize(resizeW, null, { withoutEnlargement: true })
    .webp({ quality: QUALITY, effort: EFFORT })
    .toFile(outPath);

  const outStat = statSync(outPath);
  const inStat = statSync(inputPath);
  const saved = ((1 - outStat.size / inStat.size) * 100).toFixed(0);
  console.log(`✅ ${inputPath.replace(__dirname, '')} → ${outPath.replace(__dirname, '')} (-${saved}%)`);
  return { skipped: false };
}

async function main() {
  console.log('🖼️  Optimisation images (WebP, max ' + MAX_WIDTH + 'px, quality ' + QUALITY + ')\n');
  let done = 0;
  let skipped = 0;
  for (const path of walk(IMAGES_DIR)) {
    try {
      const r = await optimizeOne(path);
      if (r.skipped) skipped++;
      else done++;
    } catch (err) {
      console.error(`❌ ${path}:`, err.message);
    }
  }
  console.log(`\n📊 Terminé: ${done} converties, ${skipped} déjà à jour.`);
}

main();
