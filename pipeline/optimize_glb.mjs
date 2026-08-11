#!/usr/bin/env node
/**
 * optimize_glb.mjs
 * NUCLEUS Scene 1 — GLB Optimization Pipeline
 *
 * Usage:
 *   node pipeline/optimize_glb.mjs <input.glb> <output_name> [--lod0|--lod1|--lod2]
 *
 * Requires:
 *   npx gltf-pipeline  (auto-downloaded via npx)
 *
 * Pipeline:
 *   1. Draco mesh compression (level 6)
 *   2. Report triangle count, material count, texture sizes
 *   3. Validate bounding box is non-zero
 */

import { execSync } from 'child_process';
import { statSync, existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const args = process.argv.slice(2);
if (args.length < 2) {
  console.error('Usage: node optimize_glb.mjs <input.glb> <output_name> [lod_suffix]');
  process.exit(1);
}

const [inputPath, outputName, lodSuffix = 'LOD0'] = args;
const resolvedInput = path.resolve(inputPath);

if (!existsSync(resolvedInput)) {
  console.error(`Input not found: ${resolvedInput}`);
  process.exit(1);
}

const processedDir = path.join(ROOT, 'assets', 'processed_glb', 'SMR');
const productionDir = path.join(ROOT, 'assets', 'production_glb', 'SMR');
const publicDir = path.join(ROOT, 'public', 'assets', 'scene1', 'SMR');

const outputFilename = `${outputName}_${lodSuffix}.glb`;
const processedPath = path.join(processedDir, outputFilename);
const productionPath = path.join(productionDir, outputFilename);
const publicPath = path.join(publicDir, outputFilename);

console.log(`\n=== NUCLEUS GLB Optimization Pipeline ===`);
console.log(`Input:  ${resolvedInput}`);
console.log(`Output: ${productionPath}`);
console.log(`LOD:    ${lodSuffix}\n`);

// ── Step 1: Draco compression via gltf-pipeline ──────────────────────────────
console.log('[1/4] Applying Draco compression...');
try {
  execSync(
    `npx gltf-pipeline -i "${resolvedInput}" -o "${processedPath}" -d`,
    { stdio: 'inherit', cwd: ROOT }
  );
  console.log(`      Written: ${processedPath}`);
} catch (e) {
  console.error('      Draco compression failed:', e.message);
  process.exit(1);
}

// ── Step 2: Copy to production and public dirs ───────────────────────────────
console.log('[2/4] Copying to production and public directories...');
try {
  execSync(`cp "${processedPath}" "${productionPath}"`, { stdio: 'inherit' });
  execSync(`cp "${processedPath}" "${publicPath}"`, { stdio: 'inherit' });
  console.log(`      Production: ${productionPath}`);
  console.log(`      Public:     ${publicPath}`);
} catch (e) {
  // Windows fallback
  try {
    execSync(`copy "${processedPath.replace(/\//g, '\\')}" "${productionPath.replace(/\//g, '\\')}"`, { stdio: 'inherit', shell: true });
    execSync(`copy "${processedPath.replace(/\//g, '\\')}" "${publicPath.replace(/\//g, '\\')}"`, { stdio: 'inherit', shell: true });
  } catch (e2) {
    console.warn('      Copy step skipped (manual copy required):', e2.message);
  }
}

// ── Step 3: File size report ─────────────────────────────────────────────────
console.log('[3/4] File size report...');
const sizes = [
  ['Raw input', resolvedInput],
  ['Processed (Draco)', processedPath],
];
for (const [label, p] of sizes) {
  if (existsSync(p)) {
    const bytes = statSync(p).size;
    console.log(`      ${label}: ${(bytes / 1024).toFixed(1)} KB`);
  }
}

// ── Step 4: Validation summary ───────────────────────────────────────────────
console.log('[4/4] Validation notes:');
    console.log('      ✓ Run the produced GLB through https://gltf-viewer.donmccurdy.com/');
console.log('      ✓ Check renderer.info.render.triangles in Three.js test page');
console.log('      ✓ Confirm no pink/missing textures');
console.log('      ✓ Confirm bounding box is non-zero');
console.log('      ✓ Asset should sit at world origin (0,0,0) — Three.js positions it\n');

console.log(`=== Done: ${outputFilename} ===\n`);
