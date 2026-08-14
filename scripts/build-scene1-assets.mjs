import fs from 'fs';
import path from 'path';

const SRC_ROOT = path.resolve('source-assets/models/scene1');
const PUBLIC_ROOT = path.resolve('public');
const DEST_ROOT = path.resolve('dist/scene1');

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
      copyFile(srcPath, path.join(destDir, file));
    }
  }
}

console.log('Building Scene 1 assets...');

// Clean destination
if (fs.existsSync(DEST_ROOT)) {
  fs.rmSync(DEST_ROOT, { recursive: true, force: true });
}

for (const item of FILES_TO_COPY) {
  if (fs.statSync(item.src).isDirectory()) {
    copyDir(item.src, item.dest, item.filter);
  } else {
    copyFile(item.src, item.dest);
  }
}

console.log('Scene 1 assets built successfully.');