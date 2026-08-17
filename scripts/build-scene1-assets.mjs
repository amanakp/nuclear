import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const SRC_ROOT = path.resolve('source-assets/models/scene1');
const PUBLIC_ROOT = path.resolve('public');
const DEST_ROOT = path.resolve('dist/scene1');
const DEV_ROOT = path.resolve('public/scene1');

const FILES_TO_COPY = [
  // SMR models
  { src: path.join(SRC_ROOT, 'SMR'), dest: path.join(DEST_ROOT, 'models/scene1/SMR'), filter: (f) => f.endsWith('.glb') },
  // City models - only MainSkyscraper_LOD0.glb (exclude Buildings_LOD0.glb)
  { src: path.join(SRC_ROOT, 'City', 'MainSkyscraper_LOD0.glb'), dest: path.join(DEST_ROOT, 'models/scene1/City', 'MainSkyscraper_LOD0.glb') },
  // Facilities models
  { src: path.join(SRC_ROOT, 'Facilities'), dest: path.join(DEST_ROOT, 'models/scene1/Facilities'), filter: (f) => f.endsWith('.glb') },
  // HDR environment
  { src: path.join(PUBLIC_ROOT, 'textures/environment/industrial_sunset_02_puresky_2k.hdr'), dest: path.join(DEST_ROOT, 'textures/environment/industrial_sunset_02_puresky_2k.hdr') },
  // Draco files
  { src: path.join(PUBLIC_ROOT, 'draco'), dest: path.join(DEST_ROOT, 'draco'), filter: (f) => f.endsWith('.js') || f.endsWith('.wasm') },
];

function compressGLB(src, dest) {
  const destDir = path.dirname(dest);
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }
  const inputSize = fs.statSync(src).size;
  try {
    execSync(
      `npx gltf-transform draco "${src}" "${dest}"`,
      { stdio: 'pipe', timeout: 120000 }
    );
    const outputSize = fs.statSync(dest).size;
    const ratio = ((1 - outputSize / inputSize) * 100).toFixed(1);
    console.log(`Draco: ${path.relative(process.cwd(), src)} -> ${path.relative(process.cwd(), dest)} (${ratio}% reduction, ${inputSize} -> ${outputSize})`);
  } catch (err) {
    console.warn(`Draco compress failed for ${path.basename(src)}, copying uncompressed: ${err.message}`);
    fs.copyFileSync(src, dest);
  }
}

function copyFile(src, dest) {
  const destDir = path.dirname(dest);
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }
  fs.copyFileSync(src, dest);
  console.log(`Copied: ${path.relative(process.cwd(), src)} -> ${path.relative(process.cwd(), dest)}`);
}

function copyDir(srcDir, destDir, filter) {
  if (!fs.existsSync(srcDir)) {
    console.warn(`Source not found: ${srcDir}`);
    return;
  }
  const files = fs.readdirSync(srcDir);
  for (const file of files) {
    const srcPath = path.join(srcDir, file);
    const stat = fs.statSync(srcPath);
    if (stat.isDirectory()) {
      copyDir(srcPath, path.join(destDir, file), filter);
    } else if (!filter || filter(file)) {
      if (file.endsWith('.glb')) {
        compressGLB(srcPath, path.join(destDir, file));
      } else {
        copyFile(srcPath, path.join(destDir, file));
      }
    }
  }
}

function copyFilesToRoot(destRoot) {
  for (const item of FILES_TO_COPY) {
    const dest = item.dest.replace(DEST_ROOT, destRoot);
    if (fs.statSync(item.src).isDirectory()) {
      copyDir(item.src, dest, item.filter);
    } else {
      if (item.src.endsWith('.glb')) {
        compressGLB(item.src, dest);
      } else {
        copyFile(item.src, dest);
      }
    }
  }
}

console.log('Building Scene 1 assets (with Draco compression)...');

// Clean destination
if (fs.existsSync(DEST_ROOT)) {
  fs.rmSync(DEST_ROOT, { recursive: true, force: true });
}
copyFilesToRoot(DEST_ROOT);

console.log('Copying Scene 1 assets to public/scene1/ for dev server...');
if (fs.existsSync(DEV_ROOT)) {
  fs.rmSync(DEV_ROOT, { recursive: true, force: true });
}
copyFilesToRoot(DEV_ROOT);

// Summary
console.log('\n=== Asset size summary ===');
function walkGLBs(dir, results = []) {
  if (!fs.existsSync(dir)) return results;
  for (const f of fs.readdirSync(dir)) {
    const fp = path.join(dir, f);
    if (fs.statSync(fp).isDirectory()) walkGLBs(fp, results);
    else if (f.endsWith('.glb')) results.push({ path: fp, size: fs.statSync(fp).size });
  }
  return results;
}

const distGLBs = walkGLBs(path.join(DEST_ROOT, 'models'));
let totalBytes = 0;
for (const g of distGLBs) {
  totalBytes += g.size;
}
console.log(`Dist GLBs: ${distGLBs.length} files, ${(totalBytes / 1024 / 1024).toFixed(1)} MB total`);
for (const g of distGLBs.sort((a, b) => b.size - a.size).slice(0, 5)) {
  console.log(`  ${path.relative(DEST_ROOT, g.path)}: ${(g.size / 1024 / 1024).toFixed(1)} MB`);
}

console.log('\nScene 1 assets built successfully (dist + public).');
