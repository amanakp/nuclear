import * as THREE from 'three';

/** Deterministic PRNG (mulberry32). */
export const mulberry32 = (seed: number) => () => {
  let t = (seed += 0x6d2b79f5);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

/** Smooth 2D value noise. */
export const makeValueNoise2D = (seed: number) => {
  const rand = mulberry32(seed);
  const grid: number[] = [];
  const g = (x: number, y: number) => {
    const key = ((x & 255) + (y & 255) * 256) & 65535;
    if (grid[key] === undefined) grid[key] = rand();
    return grid[key];
  };
  const fade = (t: number) => t * t * (3 - 2 * t);
  return (x: number, y: number) => {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    const xf = x - xi;
    const yf = y - yi;
    const a = g(xi, yi);
    const b = g(xi + 1, yi);
    const c = g(xi, yi + 1);
    const d = g(xi + 1, yi + 1);
    const u = fade(xf);
    const v = fade(yf);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  };
};

/** Fractal Brownian motion over a base noise function, normalized to [0, 1]. */
export const fbm = (
  noise: (x: number, y: number) => number,
  x: number,
  y: number,
  octaves: number
): number => {
  let amp = 0.5;
  let freq = 1;
  let sum = 0;
  let norm = 0;
  for (let i = 0; i < octaves; i++) {
    sum += amp * noise(x * freq, y * freq);
    norm += amp;
    amp *= 0.5;
    freq *= 2;
  }
  return sum / norm;
};

/** Smoothly blend from value `a` to `b` over the given window. */
export const smoothstep = (edge0: number, edge1: number, x: number): number => {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
};

/** Creates a CanvasTexture from a draw callback. */
export const createCanvasTexture = (
  width: number,
  height: number,
  draw: (ctx: CanvasRenderingContext2D) => void
): THREE.CanvasTexture => {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable');
  draw(ctx);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
};

/** Soft radial glow texture used for sprites (sun, steam, lights). */
export const createGlowTexture = (
  inner: string,
  outer: string,
  size = 256
): THREE.CanvasTexture =>
  createCanvasTexture(size, size, (ctx) => {
    const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    grad.addColorStop(0, inner);
    grad.addColorStop(0.35, outer);
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
  });

/** Soft multi-blob cloud texture. */
export const createCloudTexture = (): THREE.CanvasTexture =>
  createCanvasTexture(512, 256, (ctx) => {
    ctx.clearRect(0, 0, 512, 256);
    const blobs: [number, number, number][] = [
      [160, 128, 90],
      [256, 110, 120],
      [350, 135, 80],
      [220, 155, 70],
      [300, 150, 60],
    ];
    for (const [x, y, r] of blobs) {
      const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
      grad.addColorStop(0, 'rgba(255,255,255,0.9)');
      grad.addColorStop(0.6, 'rgba(255,255,255,0.35)');
      grad.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = grad;
      ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }
  });

/** Procedural skyscraper glass-and-window texture (+ matching emissive map). */
export const createBuildingTextures = (seed: number) => {
  const rand = mulberry32(seed);
  const cols = 16;
  const rows = 32;
  const w = 64;
  const h = 128;
  const map = createCanvasTexture(w, h, (ctx) => {
    ctx.fillStyle = '#121a24';
    ctx.fillRect(0, 0, w, h);
    const cw = w / cols;
    const ch = h / rows;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const roll = rand();
        if (roll < 0.3) {
          ctx.fillStyle = '#ffd98a';
        } else if (roll < 0.45) {
          ctx.fillStyle = '#d8ecff';
        } else {
          ctx.fillStyle = '#223140';
        }
        ctx.fillRect(c * cw + 1, r * ch + 1, cw - 2, ch - 2);
      }
    }
  });
  const emissive = createCanvasTexture(w, h, (ctx) => {
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, w, h);
    const cw = w / cols;
    const ch = h / rows;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const roll = rand();
        if (roll < 0.3) {
          ctx.fillStyle = 'rgba(255, 214, 150, 1)';
        } else if (roll < 0.45) {
          ctx.fillStyle = 'rgba(190, 230, 255, 1)';
        } else {
          continue;
        }
        ctx.fillRect(c * cw + 1, r * ch + 1, cw - 2, ch - 2);
      }
    }
  });
  map.wrapS = THREE.RepeatWrapping;
  map.wrapT = THREE.RepeatWrapping;
  emissive.wrapS = THREE.RepeatWrapping;
  emissive.wrapT = THREE.RepeatWrapping;
  return { map, emissive };
};

/** Holographic-style floating label sprite. */
export const createLabelSprite = (
  text: string,
  opts: { scale?: number; sub?: string } = {}
): THREE.Sprite => {
  const scale = opts.scale ?? 1;
  const sub = opts.sub;
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 160;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable');
  ctx.clearRect(0, 0, 1024, 160);
  ctx.font = 'bold 56px Rajdhani, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(2, 8, 16, 0.62)';
  ctx.fillRect(0, 0, 1024, 160);
  ctx.strokeStyle = 'rgba(0, 240, 255, 0.55)';
  ctx.lineWidth = 3;
  ctx.strokeRect(1.5, 1.5, 1021, 157);
  ctx.fillStyle = '#e8fbff';
  ctx.fillText(text, 512, sub ? 64 : 80);
  if (sub) {
    ctx.font = '300 30px Rajdhani, sans-serif';
    ctx.fillStyle = 'rgba(120, 220, 255, 0.95)';
    ctx.fillText(sub, 512, 118);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthWrite: false,
  });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(64 * scale, 10 * scale, 1);
  return sprite;
};

/** Disposes geometry, materials and their textures recursively. */
export const disposeObject = (root: THREE.Object3D): void => {
  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (mesh.geometry) mesh.geometry.dispose();
    const materials = Array.isArray(mesh.material) ? mesh.material : mesh.material ? [mesh.material] : [];
    for (const material of materials) {
      const m = material as THREE.Material & {
        map?: THREE.Texture | null;
        emissiveMap?: THREE.Texture | null;
        alphaMap?: THREE.Texture | null;
        uniforms?: Record<string, { value: unknown }>;
      };
      m.map?.dispose();
      m.emissiveMap?.dispose();
      m.alphaMap?.dispose();
      if (m.uniforms) {
        for (const key of Object.keys(m.uniforms)) {
          const v = m.uniforms[key].value;
          if (v instanceof THREE.Texture) v.dispose();
        }
      }
      m.dispose();
    }
  });
};
