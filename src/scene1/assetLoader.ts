import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import type { GLTF } from 'three/addons/loaders/GLTFLoader.js';
import { createGlowTexture, createLabelSprite } from './utilities';

/**
 * assetLoader.ts
 * NUCLEUS Scene 1 — Production GLB Asset Loader
 *
 * Handles:
 *  - GLTFLoader + Draco decompression
 *  - LOD object construction (THREE.LOD)
 *  - Modular SMR facility composition (no physical GLB merging)
 *  - City / offshore hero asset placement
 *  - Path-keyed GLB cache (same file never loaded twice; instances share
 *    geometry/materials/textures via clone)
 *  - Quest 3 memory budget: textures capped to 1024px at load time
 *  - Asset manifest integration
 *
 * NOTE ON SMR ASSETS:
 *  The SMR facility is NOT a single GLB. It is assembled at runtime from
 *  the component GLBs registered in SMR_COMPONENT_CONFIG below
 *  (see pipeline/asset_manifest.json — parent "SMR_ReactorBuilding").
 *  Transforms are DERIVED FROM MEASUREMENTS (pipeline/inspect_glb.mjs):
 *  each tripo3d.ai export is ~1 unit, centered at origin, so every entry
 *  is scaled to its intended architectural size (1 unit = 1 m) and raised
 *  by half its height so the base sits on y = 0.
 *
 * LOD distances (per approved plan):
 *  LOD0:  0 – 80 m   (full detail)
 *  LOD1:  80 – 200 m (40% tris)
 *  LOD2:  200 – 500 m (15% tris)
 *  Culled: > 500 m
 */

// ── Draco loader (shared singleton) ─────────────────────────────────────────
const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');

const gltfLoader = new GLTFLoader();
gltfLoader.setDRACOLoader(dracoLoader);

// ── Types ────────────────────────────────────────────────────────────────────
export interface AssetLODConfig {
  lod0Path: string;
  lod1Path?: string;
  lod2Path?: string;
}

export interface LoadedAsset {
  lod: THREE.LOD;
  dispose: () => void;
  /** Optional per-frame animation (steam plume). */
  update?: (t: number) => void;
}

export interface SMRComponentConfig {
  id: string;
  path: string;
  /** World-space offset within the SMR facility (anchor-relative). */
  position: [number, number, number];
  rotation: [number, number, number];
  scale: number;
  /** Architectural role this component plays in the SMR campus. */
  intendedRole: string;
}

export interface HeroAssetHandle {
  group: THREE.Group;
  dispose: () => void;
}

// ── LOD distances (metres) ───────────────────────────────────────────────────
const LOD_DISTANCES = {
  LOD0: 0,
  LOD1: 80,
  LOD2: 200,
  CULL: 500,
} as const;

// ── Quest 3 memory budget ────────────────────────────────────────────────────
// tripo3d exports embed 4096x4096 JPEGs (Color/ORM/Normal per component).
// Capping to 1K cuts texture GPU memory ~16x with negligible visual cost on
// XR displays and is what keeps the 13-component campus inside the Quest 3
// browser tab budget (previously ~1920 MiB of texture uploads at startup).
// The cap is applied ONLY on XR headsets: desktop gets the native 4096
// textures so the GLB facades keep full tripo3d detail (capped facades read
// as "noisy/checkerboard" once the 4096² window grid is downsampled 16x).
const MAX_TEXTURE_SIZE = 1024;
const XR_UA = /OculusBrowser|Quest/i.test(typeof navigator !== 'undefined' ? navigator.userAgent : '');

// ── Core loader ──────────────────────────────────────────────────────────────
function loadGLB(path: string): Promise<GLTF> {
  return new Promise((resolve, reject) => {
    gltfLoader.load(path, resolve, undefined, reject);
  });
}

/**
 * Path-keyed GLB cache with in-flight deduplication.
 * The same file is never fetched/decoded twice: SolarArray_A/B and the two
 * perimeter-wall segments share one load, and StrictMode dev double-mounts
 * reuse the same in-flight promise. Texture capping runs once per file.
 */
const gltfCache = new Map<string, Promise<GLTF>>();

function loadGLBCached(path: string): Promise<GLTF> {
  let pending = gltfCache.get(path);
  if (!pending) {
    pending = loadGLB(path).then((gltf) => {
      capTextureSize(gltf.scene);
      return gltf;
    });
    pending.catch(() => gltfCache.delete(path));
    gltfCache.set(path, pending);
  }
  return pending;
}

const TEXTURE_SLOTS = [
  'map',
  'normalMap',
  'roughnessMap',
  'metalnessMap',
  'aoMap',
  'emissiveMap',
  'alphaMap',
  'bumpMap',
  'displacementMap',
] as const;

type TexturedMaterial = THREE.Material & Record<(typeof TEXTURE_SLOTS)[number], THREE.Texture | null>;

/**
 * Downscale every texture larger than MAX_TEXTURE_SIZE (canvas redraw) and
 * release the original GPU texture. Runs once per unique GLB at load time;
 * shared textures are handled once and all material slots are remapped.
 */
function capTextureSize(root: THREE.Object3D): void {
  const replacements = new Map<THREE.Texture, THREE.Texture>();
  const seen = new Set<THREE.Texture>();

  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    const materials = Array.isArray(mesh.material) ? mesh.material : mesh.material ? [mesh.material] : [];
    for (const material of materials) {
      const textured = material as TexturedMaterial;
      for (const slot of TEXTURE_SLOTS) {
        const tex = textured[slot];
        if (!tex || seen.has(tex)) continue;
        seen.add(tex);
        const img = tex.image as { width?: number; height?: number; complete?: boolean } | null;
        if (!img) continue;
        // Skip if image not fully loaded (width/height 0 or complete=false)
        const w = img.width ?? 0;
        const h = img.height ?? 0;
        if (w === 0 || h === 0 || img.complete === false) continue;
        if (!XR_UA) continue; // desktop keeps native tripo3d resolution
        if (Math.max(w, h) <= MAX_TEXTURE_SIZE) continue;
        try {
          const scale = MAX_TEXTURE_SIZE / Math.max(w, h);
          const canvas = document.createElement('canvas');
          canvas.width = Math.max(1, Math.round(w * scale));
          canvas.height = Math.max(1, Math.round(h * scale));
          const ctx = canvas.getContext('2d');
          if (!ctx) continue;
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img as CanvasImageSource, 0, 0, canvas.width, canvas.height);
          const capped = new THREE.CanvasTexture(canvas);
          capped.colorSpace = tex.colorSpace;
          capped.wrapS = tex.wrapS;
          capped.wrapT = tex.wrapT;
          capped.repeat.copy(tex.repeat);
          capped.offset.copy(tex.offset);
          capped.center.copy(tex.center);
          capped.rotation = tex.rotation;
          capped.flipY = tex.flipY;
          capped.mapping = tex.mapping;
          capped.anisotropy = Math.min(4, tex.anisotropy || 4);
          replacements.set(tex, capped);
        } catch (err) {
          console.warn('[assetLoader] texture cap failed, keeping original:', err);
        }
      }
    }
  });

  if (replacements.size === 0) return;

  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    const materials = Array.isArray(mesh.material) ? mesh.material : mesh.material ? [mesh.material] : [];
    for (const material of materials) {
      const textured = material as TexturedMaterial;
      for (const slot of TEXTURE_SLOTS) {
        const old = textured[slot];
        const capped = old ? replacements.get(old) : null;
        if (capped) textured[slot] = capped;
      }
    }
  });

  replacements.forEach((_capped, old) => old.dispose());
}

function extractMesh(gltf: GLTF): THREE.Object3D {
  const root = gltf.scene;
  capTextureSize(root);
  root.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });
  return root;
}

/**
 * Instantiate a cached GLB as an independent object tree. clone(true) deep
 * copies the node hierarchy while SHARING geometry, materials and textures,
 * so repeated placements of the same file cost almost nothing extra.
 */
function instantiate(gltf: GLTF): THREE.Object3D {
  const root = gltf.scene.clone(true);
  root.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });
  return root;
}

/**
 * Load a production GLB asset with optional LOD levels.
 * Returns a THREE.LOD object ready to be added to the scene.
 */
export async function loadAssetWithLOD(config: AssetLODConfig): Promise<LoadedAsset> {
  const lodObject = new THREE.LOD();
  const disposables: THREE.Object3D[] = [];

  // LOD 0 (required)
  const gltf0 = await loadGLB(config.lod0Path);
  const mesh0 = extractMesh(gltf0);
  lodObject.addLevel(mesh0, LOD_DISTANCES.LOD0);
  disposables.push(mesh0);

  // LOD 1 (optional)
  if (config.lod1Path) {
    const gltf1 = await loadGLB(config.lod1Path);
    const mesh1 = extractMesh(gltf1);
    lodObject.addLevel(mesh1, LOD_DISTANCES.LOD1);
    disposables.push(mesh1);
  }

  // LOD 2 (optional)
  if (config.lod2Path) {
    const gltf2 = await loadGLB(config.lod2Path);
    const mesh2 = extractMesh(gltf2);
    lodObject.addLevel(mesh2, LOD_DISTANCES.LOD2);
    disposables.push(mesh2);
  }

  // Empty cull object beyond 500m
  const cullObj = new THREE.Object3D();
  lodObject.addLevel(cullObj, LOD_DISTANCES.CULL);

  const dispose = () => {
    disposables.forEach((obj) => {
      obj.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry?.dispose();
          if (Array.isArray(child.material)) {
            child.material.forEach((m) => m.dispose());
          } else {
            (child.material as THREE.Material)?.dispose();
          }
        }
      });
    });
  };

  return { lod: lodObject, dispose };
}

// ── SMR modular facility ─────────────────────────────────────────────────────
// World position from scene1Data.ts: FACILITIES.smr.position = [-120, 0, -250]
const SMR_WORLD_POS = new THREE.Vector3(-120, 0, -250);

/**
 * Modular SMR component registry.
 * Each entry maps a logical component ID to its production GLB under
 * /assets/scene1/SMR/.
 *
 * Transforms are DERIVED FROM MEASUREMENTS (pipeline/inspect_glb.mjs):
 *  - All tripo3d.ai exports are normalized to ~1 unit and centered at
 *    origin, so each entry scales the model to its intended architectural
 *    size (1 unit = 1 m) and raises it by half-height so its base sits on
 *    y = 0.
 *  - position = intentional campus site layout relative to the SMR anchor
 *    [-120, 0, -250]. Sea = -Z, city = +X.
 *  - rotation.y = -PI/2 re-aligns models whose long axis is Z onto world X.
 *
 * CAMPUS LAYOUT (measured, intentional):
 *   dome at heart -> reactor annex inland -> turbine hall E -> exhaust stack
 *   beside turbine hall -> substation at the power-take-off (E) edge ->
 *   seawater intake on the SW corner -> perimeter walls on the sea and
 *   inland edges -> solar farm on the east utility field.
 *
 * Validation: pipeline/check_smr_assembly.mjs + pipeline/debug/smr_assembly.html
 */
export const SMR_COMPONENT_CONFIG: SMRComponentConfig[] = [
  {
    // bbox 0.88 x 0.98 x 0.87 (h/d 1.11). Target: h=30 m, d~27 m.
    id: 'SMR_ContainmentDome',
    path: '/assets/scene1/SMR/SMR_ContainmentDome_LOD0.glb',
    position: [-4, 15.0, -2],
    rotation: [0, 0, 0],
    scale: 30.6,
    intendedRole: 'hero containment dome — campus heart, slightly seaward of centre',
  },
  {
    // bbox 0.74 x 0.51 x 0.98, long axis Z -> yaw -90 to align with X.
    // 26.9 m (X) x 20.4 m (Z) x 13.9 m tall — aux/control building west of the dome.
    id: 'SMR_CenterBuilding',
    path: '/assets/scene1/SMR/SMR_CenterBuilding_LOD0.glb',
    position: [-35, 6.94, 2],
    rotation: [0, -Math.PI / 2, 0],
    scale: 27.45,
    intendedRole: 'central auxiliary / control building (west flank of campus)',
  },
  {
    // bbox 0.98 x 0.22 x 0.92, low rooftop units. Sits on aux roof (top y=13.9).
    id: 'SMR_RooftopHVAC',
    path: '/assets/scene1/SMR/SMR_RooftopHVAC_LOD0.glb',
    position: [-35, 14.67, 2],
    rotation: [0, 0, 0],
    scale: 6.1,
    intendedRole: 'rooftop mechanical units on the aux building roof',
  },
  {
    // bbox 0.60 x 0.98 x 0.85, tall block. Reactor annex directly inland of
    // the dome (dome z-edge 11.3, annex z-start 15.6 -> 4.3 m clearance).
    id: 'SMR_CentralUnitBlock',
    path: '/assets/scene1/SMR/SMR_CentralUnitBlock_LOD0.glb',
    position: [-4, 7.35, 22],
    rotation: [0, 0, 0],
    scale: 15,
    intendedRole: 'central unit / reactor annex building behind the containment dome',
  },
  {
    // bbox 0.98 x 0.39 x 0.72, long axis X. 30.2 m x 12.0 m x 22.2 m turbine hall,
    // east-southeast of the dome toward the substation.
    id: 'SMR_TurbineBuilding',
    path: '/assets/scene1/SMR/SMR_TurbineBuilding_LOD0.glb',
    position: [26, 5.96, 16],
    rotation: [0, 0, 0],
    scale: 30.8,
    intendedRole: 'turbine building — power island, east of the dome',
  },
  {
    // bbox 0.28 x 0.98 x 0.28. 34 m tall stack (h/d 3.5), dominating the
    // turbine hall corner so it reads as the plant stack, not a pipe stub.
    id: 'SMR_ExhaustStack',
    path: '/assets/scene1/SMR/SMR_ExhaustStack_LOD0.glb',
    position: [36, 17.0, 30],
    rotation: [0, 0, 0],
    scale: 34.7,
    intendedRole: 'exhaust stack — vertical landmark beside the turbine hall',
  },
  {
    // bbox 0.98 x 0.29 x 0.76. 17.6 m x 5.2 m x 13.7 m switchyard at the east
    // edge of the campus — the electric take-off toward the Data Center.
    id: 'SMR_CentralSubstation',
    path: '/assets/scene1/SMR/SMR_CentralSubstation_LOD0.glb',
    position: [56, 2.59, 12],
    rotation: [0, 0, 0],
    scale: 18,
    intendedRole: 'electrical substation / switchyard — power export to the city grid',
  },
  {
    // bbox 0.58 x 0.12 x 0.98, long axis Z -> yaw -90 runs it along X.
    // Sea-side security wall at world z = -294 (beach, above the waterline).
    id: 'SMR_PerimeterWall_Sea',
    path: '/assets/scene1/SMR/SMR_PerimeterWall_LOD0.glb',
    position: [0, 2.44, -44],
    rotation: [0, -Math.PI / 2, 0],
    scale: 40,
    intendedRole: 'sea-side perimeter / security wall',
  },
  {
    // Second wall segment mirroring the sea wall on the inland edge
    // (world z = -204) so the campus reads as an enclosed facility.
    id: 'SMR_PerimeterWall_Land',
    path: '/assets/scene1/SMR/SMR_PerimeterWall_LOD0.glb',
    position: [0, 2.44, 46],
    rotation: [0, -Math.PI / 2, 0],
    scale: 40,
    intendedRole: 'inland perimeter / security wall',
  },
  {
    // bbox 0.39 x 0.98 x 0.92, tall pump skid. Intake pump bay on the sea side.
    id: 'SMR_MechanicalPumps',
    path: '/assets/scene1/SMR/SMR_MechanicalPumps_LOD0.glb',
    position: [-38, 2.99, -40],
    rotation: [0, 0, 0],
    scale: 6.1,
    intendedRole: 'mechanical pump / intake skids feeding the cooling system',
  },
  {
    // bbox 0.30 x 0.30 x 0.98, long axis Z. 2.8 m dia intake pipe running from
    // the pump bay toward the sea; seaward tip reaches world z ~ -302
    // (the waterline) so the seawater intake story is explicit.
    id: 'SMR_PipeLoopSegment',
    path: '/assets/scene1/SMR/SMR_PipeLoopSegment_LOD0.glb',
    position: [-42, 1.4, -48],
    rotation: [0, 0, 0],
    scale: 9.3,
    intendedRole: 'seawater intake pipe run toward the Gulf of Thailand',
  },
  {
    // bbox 0.50 x 0.30 x 0.98. 11 m x 6.6 m x 21.6 m solar rows on the east
    // utility field beyond the substation.
    id: 'SMR_SolarArray_A',
    path: '/assets/scene1/Facilities/SolarPanelArray_LOD0.glb',
    position: [76, 3.3, 6],
    rotation: [0, 0, 0],
    scale: 22,
    intendedRole: 'campus solar infrastructure (row A)',
  },
  {
    id: 'SMR_SolarArray_B',
    path: '/assets/scene1/Facilities/SolarPanelArray_LOD0.glb',
    position: [76, 3.3, 36],
    rotation: [0, 0, 0],
    scale: 22,
    intendedRole: 'campus solar infrastructure (row B)',
  },
];

/**
 * Load the modular SMR facility (parent "SMR_ReactorBuilding") by loading
 * every registered component GLB and grouping them into a single THREE.LOD
 * positioned at the SMR world coordinates.
 *
 * The loader is per-component tolerant: a failing component is skipped with
 * a warning; only if EVERY component fails does the loader return null,
 * which lets the caller keep the procedural fallback (createNuwardPlant).
 */
export async function loadSMRReactorBuilding(): Promise<LoadedAsset | null> {
  const disposables: THREE.Object3D[] = [];
  const failed: string[] = [];

  for (const cfg of SMR_COMPONENT_CONFIG) {
    try {
      const gltf = await loadGLBCached(cfg.path);
      const component = instantiate(gltf);
      component.name = cfg.id;
      component.position.fromArray(cfg.position);
      component.rotation.fromArray(cfg.rotation);
      component.scale.setScalar(cfg.scale);
      disposables.push(component);
    } catch (err) {
      failed.push(cfg.id);
      console.warn(`[assetLoader] SMR component "${cfg.id}" failed to load:`, err);
    }
  }

  if (disposables.length === 0) {
    console.warn('[assetLoader] No SMR modular GLB loaded — using procedural fallback.');
    return null;
  }

  if (failed.length > 0) {
    console.warn(
      `[assetLoader] ${failed.length}/${SMR_COMPONENT_CONFIG.length} SMR components missing: ${failed.join(', ')}`
    );
  }

  const group = new THREE.Group();
  group.name = 'SMR_ReactorBuilding';
  disposables.forEach((component) => group.add(component));

  // LOD root must live at the facility site: THREE.LOD picks its level from
  // the distance to the LOD object itself. With the LOD at the origin the
  // camera distance was measured from (0,0,0), so the 500 m cull level hid
  // the whole campus at any overview framing (origin distance > 500 m).

  // Steam plume over the exhaust stack top (stack centre [36, 17, 30], h=34).
  const steamTexture = createGlowTexture('rgba(255,255,255,0.85)', 'rgba(255,255,255,0.25)', 256);
  const steamSprites: THREE.Sprite[] = [];
  const steamAnchor = new THREE.Vector3(36, 36, 30);
  for (let i = 0; i < 3; i++) {
    const mat = new THREE.SpriteMaterial({
      map: steamTexture,
      transparent: true,
      opacity: 0.28,
      depthWrite: false,
    });
    const sprite = new THREE.Sprite(mat);
    sprite.position.copy(steamAnchor).add(new THREE.Vector3(i * 2.5, i * 6, i * 1.5));
    sprite.scale.set(6 + i * 5, 6 + i * 5, 1);
    sprite.userData.baseY = sprite.position.y;
    sprite.userData.phase = i * 2.1;
    steamSprites.push(sprite);
    group.add(sprite);
  }

  // Facility label sprite (consistent with the other procedural facilities).
  const plantLabel = createLabelSprite('NUWARD SMR PLANT', { scale: 1.9, sub: '340 MWe Clean Baseload' });
  plantLabel.position.set(-4, 58, -2);
  group.add(plantLabel);

  const update = (t: number) => {
    steamSprites.forEach((sprite, i) => {
      const mat = sprite.material as THREE.SpriteMaterial;
      mat.opacity = 0.2 + 0.1 * Math.sin(t * 1.1 + sprite.userData.phase);
      sprite.position.y =
        (sprite.userData.baseY as number) + Math.sin(t * 0.8 + sprite.userData.phase) * 1.2;
      sprite.position.x = steamAnchor.x + Math.sin(t * 0.4 + sprite.userData.phase) * 2.2 + i * 2.5;
    });
  };

  const lod = new THREE.LOD();
  lod.position.copy(SMR_WORLD_POS);
  lod.addLevel(group, LOD_DISTANCES.LOD0);
  // Empty cull object beyond 500m
  lod.addLevel(new THREE.Object3D(), LOD_DISTANCES.CULL);

  const dispose = () => {
    steamTexture.dispose();
    disposables.forEach((obj) => {
      obj.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry?.dispose();
          if (Array.isArray(child.material)) {
            child.material.forEach((m) => m.dispose());
          } else {
            (child.material as THREE.Material)?.dispose();
          }
        }
      });
    });
  };

  return { lod, dispose, update };
}

/**
 * City + offshore hero assets:
 *  - MainSkyscraper (bbox 0.22 x 0.98 x 0.23) scaled to a 225 m Bangkok hero
 *    tower on the city's west edge.
 *  - Two real-scale (225 m, Blender metres) offshore wind turbines in the
 *    Thailand Sea (rotor diameter 157.8 m; spacing 191 m avoids blade clash).
 */
export async function loadSceneHeroAssets(): Promise<HeroAssetHandle | null> {
  const group = new THREE.Group();
  group.name = 'SceneHeroAssets';
  const disposables: THREE.Object3D[] = [];
  const failed: string[] = [];

  try {
    const gltf = await loadGLBCached('/assets/scene1/City/MainSkyscraper_LOD0.glb');
    const tower = instantiate(gltf);
    tower.name = 'City_MainSkyscraper';
    tower.position.set(160, 113.3, -120);
    tower.rotation.set(0, 0.35, 0);
    tower.scale.setScalar(230);
    disposables.push(tower);
    group.add(tower);
  } catch (err) {
    failed.push('City_MainSkyscraper');
    console.warn('[assetLoader] Hero asset "City_MainSkyscraper" failed to load:', err);
  }

  const turbineSpots: [number, number][] = [
    [-520, -460],
    [-660, -590],
  ];
  for (const [i, [tx, tz]] of turbineSpots.entries()) {
    try {
      const gltf = await loadGLBCached('/assets/scene1/WindTurbines/VenwindTurbine_LOD0.glb');
      const turbine = instantiate(gltf);
      turbine.name = `WT_VenwindTurbine_${i + 1}`;
      turbine.position.set(tx, 0, tz);
      disposables.push(turbine);
      group.add(turbine);
    } catch (err) {
      failed.push(`WT_VenwindTurbine_${i + 1}`);
      console.warn(`[assetLoader] Hero asset "WT_VenwindTurbine_${i + 1}" failed to load:`, err);
    }
  }

  if (disposables.length === 0) {
    console.warn('[assetLoader] No hero assets loaded.');
    return null;
  }

  if (failed.length > 0) {
    console.warn(`[assetLoader] ${failed.length} hero asset(s) missing: ${failed.join(', ')}`);
  }

  const dispose = () => {
    disposables.forEach((obj) => {
      obj.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry?.dispose();
          if (Array.isArray(child.material)) {
            child.material.forEach((m) => m.dispose());
          } else {
            (child.material as THREE.Material)?.dispose();
          }
        }
      });
    });
  };

  return { group, dispose };
}
