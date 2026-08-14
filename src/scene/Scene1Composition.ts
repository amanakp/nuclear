import * as THREE from 'three';
import { assetManager } from '../assets/AssetManager';

export interface Scene1AssetHandles {
  smr: THREE.Group;
  city: THREE.Group;
  facilities: THREE.Group;
  dispose: () => void;
}

export interface SMRComponentConfig {
  assetKey: string;
  position: [number, number, number];
  rotation: [number, number, number];
  scale: number;
  role: string;
}

export const SMR_WORLD_POS = new THREE.Vector3(-120, 0, -250);

export const SMR_COMPONENT_CONFIGS: SMRComponentConfig[] = [
  {
    assetKey: 'smr_containment_dome',
    position: [-4, 15.0, -2],
    rotation: [0, 0, 0],
    scale: 30.6,
    role: 'containment dome - campus heart',
  },
  {
    assetKey: 'smr_center_building',
    position: [-35, 6.94, 2],
    rotation: [0, -Math.PI / 2, 0],
    scale: 27.45,
    role: 'auxiliary/control building (west flank)',
  },
  {
    assetKey: 'smr_rooftop_hvac',
    position: [-35, 14.67, 2],
    rotation: [0, 0, 0],
    scale: 6.1,
    role: 'rooftop HVAC on auxiliary building',
  },
  {
    assetKey: 'smr_central_unit_block',
    position: [-4, 7.35, 22],
    rotation: [0, 0, 0],
    scale: 15,
    role: 'reactor annex behind containment dome',
  },
  {
    assetKey: 'smr_turbine_building',
    position: [26, 5.96, 16],
    rotation: [0, 0, 0],
    scale: 30.8,
    role: 'turbine building (east of dome)',
  },
  {
    assetKey: 'smr_exhaust_stack',
    position: [36, 17.0, 30],
    rotation: [0, 0, 0],
    scale: 34.7,
    role: 'exhaust stack beside turbine hall',
  },
  {
    assetKey: 'smr_central_substation',
    position: [56, 2.59, 12],
    rotation: [0, 0, 0],
    scale: 18,
    role: 'electrical substation - power export',
  },
  {
    assetKey: 'smr_perimeter_wall',
    position: [0, 2.44, -44],
    rotation: [0, -Math.PI / 2, 0],
    scale: 40,
    role: 'sea-side perimeter wall',
  },
  {
    assetKey: 'smr_perimeter_wall',
    position: [0, 2.44, 46],
    rotation: [0, -Math.PI / 2, 0],
    scale: 40,
    role: 'land-side perimeter wall',
  },
  {
    assetKey: 'smr_mechanical_pumps',
    position: [-38, 2.99, -40],
    rotation: [0, 0, 0],
    scale: 6.1,
    role: 'mechanical pumps/intake skids',
  },
  {
    assetKey: 'smr_pipe_loop_segment',
    position: [-42, 1.4, -48],
    rotation: [0, 0, 0],
    scale: 9.3,
    role: 'seawater intake pipe to sea',
  },
  {
    assetKey: 'smr_solar_panel_array',
    position: [76, 3.3, 6],
    rotation: [0, 0, 0],
    scale: 22,
    role: 'campus solar array A',
  },
  {
    assetKey: 'smr_solar_panel_array',
    position: [76, 3.3, 36],
    rotation: [0, 0, 0],
    scale: 22,
    role: 'campus solar array B',
  },
  // --- FBX-derived SMR Components ---
  {
    assetKey: 'smr_nuclear_reactor',
    position: [-4, 12.0, -2],
    rotation: [0, 0, 0],
    scale: 1.0,
    role: 'nuclear reactor core from FBX',
  },
  {
    assetKey: 'smr_nuclear_reactor_container',
    position: [-4, 0, -2],
    rotation: [0, 0, 0],
    scale: 1.0,
    role: 'nuclear reactor containment from FBX',
  },
  {
    assetKey: 'smr_steam_tower',
    position: [36, 30, 30],
    rotation: [0, 0, 0],
    scale: 1.0,
    role: 'steam cooling tower from FBX',
  },
  {
    assetKey: 'smr_steam_tower_base',
    position: [36, 0, 30],
    rotation: [0, 0, 0],
    scale: 1.0,
    role: 'steam cooling tower base from FBX',
  },
  {
    assetKey: 'smr_turbine',
    position: [26, 0, 16],
    rotation: [0, 0, 0],
    scale: 1.0,
    role: 'turbine machinery from FBX',
  },
  {
    assetKey: 'smr_turbine_building_fbx',
    position: [26, 0, 16],
    rotation: [0, 0, 0],
    scale: 1.0,
    role: 'turbine building from FBX',
  },
  {
    assetKey: 'smr_turbine_container',
    position: [26, 0, 20],
    rotation: [0, 0, 0],
    scale: 1.0,
    role: 'turbine container from FBX',
  },
  {
    assetKey: 'smr_turbine_container_floor',
    position: [26, 0, 20],
    rotation: [0, 0, 0],
    scale: 1.0,
    role: 'turbine container floor from FBX',
  },
  {
    assetKey: 'smr_turbine_generator',
    position: [26, 5, 16],
    rotation: [0, 0, 0],
    scale: 1.0,
    role: 'turbine generator from FBX',
  },
  {
    assetKey: 'smr_turbine_wall',
    position: [26, 5, 16],
    rotation: [0, 0, 0],
    scale: 1.0,
    role: 'turbine wall from FBX',
  },
];

export interface HeroAssetConfig {
  assetKey: string;
  position: [number, number, number];
  rotation: [number, number, number];
  scale: number;
  role: string;
}

export const HERO_ASSET_CONFIGS: HeroAssetConfig[] = [
  {
    assetKey: 'city_main_skyscraper',
    position: [160, 113.3, -120],
    rotation: [0, 0.35, 0],
    scale: 230,
    role: 'Bangkok hero skyscraper',
  },
];

export interface FacilityAssetConfig {
  assetKey: string;
  position: [number, number, number];
  rotation: [number, number, number];
  scale: number;
  role: string;
  count?: number;
}

export const FACILITY_ASSET_CONFIGS: FacilityAssetConfig[] = [
  {
    assetKey: 'facilities_ground_pavement',
    position: [0, 0, 0],
    rotation: [0, 0, 0],
    scale: 1,
    role: 'ground pavement/roads',
  },
  {
    assetKey: 'facilities_landscaping_trees',
    position: [0, 0, 0],
    rotation: [0, 0, 0],
    scale: 1,
    role: 'landscaping trees',
  },
  {
    assetKey: 'facilities_solar_panel_array',
    position: [76, 3.3, 6],
    rotation: [0, 0, 0],
    scale: 22,
    role: 'solar array at SMR campus',
  },
  {
    assetKey: 'facilities_solar_panel_array',
    position: [76, 3.3, 36],
    rotation: [0, 0, 0],
    scale: 22,
    role: 'solar array at SMR campus',
  },
  // --- FBX-derived Facilities Components ---
  {
    assetKey: 'facilities_ground_base',
    position: [0, 0, 0],
    rotation: [0, 0, 0],
    scale: 1.0,
    role: 'ground base terrain from FBX',
  },
  {
    assetKey: 'facilities_base_road',
    position: [0, 0, 0],
    rotation: [0, 0, 0],
    scale: 1.0,
    role: 'base road network from FBX',
  },
  {
    assetKey: 'facilities_grassland',
    position: [0, 0, 0],
    rotation: [0, 0, 0],
    scale: 1.0,
    role: 'grassland terrain from FBX',
  },
  {
    assetKey: 'facilities_fencing',
    position: [0, 0, 0],
    rotation: [0, 0, 0],
    scale: 1.0,
    role: 'perimeter fencing from FBX',
  },
  {
    assetKey: 'facilities_electric_generator',
    position: [-64, 0, -238],
    rotation: [0, 0, 0],
    scale: 1.0,
    role: 'electric generator at SMR substation',
  },
  {
    assetKey: 'facilities_electric_pole',
    position: [-64, 0, -238],
    rotation: [0, 0, 0],
    scale: 1.0,
    role: 'electric transmission poles',
  },
  {
    assetKey: 'facilities_electric_wire',
    position: [-64, 0, -238],
    rotation: [0, 0, 0],
    scale: 1.0,
    role: 'electric transmission wires',
  },
  {
    assetKey: 'facilities_pipeline',
    position: [-250, 0, -305],
    rotation: [0, 0, 0],
    scale: 1.0,
    role: 'pipeline from desalination plant',
  },
];

function instantiateModel(gltf: THREE.Group): THREE.Group {
  const instance = gltf.clone(true);
  instance.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });
  return instance;
}

interface SteamSpritesResult {
  sprites: THREE.Sprite[];
  texture: THREE.Texture;
}

function createSteamSprites(anchor: THREE.Vector3, count: number = 3): SteamSpritesResult {
  const sprites: THREE.Sprite[] = [];
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  grad.addColorStop(0, 'rgba(255,255,255,0.85)');
  grad.addColorStop(0.35, 'rgba(255,255,255,0.25)');
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 256);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;

  for (let i = 0; i < count; i++) {
    const mat = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      opacity: 0.28,
      depthWrite: false,
    });
    const sprite = new THREE.Sprite(mat);
    sprite.position.copy(anchor).add(new THREE.Vector3(i * 2.5, i * 6, i * 1.5));
    sprite.scale.set(6 + i * 5, 6 + i * 5, 1);
    sprite.userData.baseY = sprite.position.y;
    sprite.userData.phase = i * 2.1;
    sprites.push(sprite);
  }
  return { sprites, texture };
}

export async function loadScene1Assets(): Promise<Scene1AssetHandles> {
  const smrGroup = new THREE.Group();
  smrGroup.name = 'SMR_Campus';
  smrGroup.position.copy(SMR_WORLD_POS);

  const cityGroup = new THREE.Group();
  cityGroup.name = 'Bangkok_City';

  const facilitiesGroup = new THREE.Group();
  facilitiesGroup.name = 'Green_Facilities';

  const disposables: { geometry?: THREE.BufferGeometry; material?: THREE.Material; texture?: THREE.Texture }[] = [];
  const steamSprites: THREE.Sprite[] = [];
  let steamTexture: THREE.Texture | null = null;

  // --- Load SMR Campus Components ---
  console.info('[Scene1] Loading SMR campus components...');
  for (const config of SMR_COMPONENT_CONFIGS) {
    try {
      const asset = assetManager.getModel(config.assetKey);
      if (!asset) {
        console.warn(`[Scene1] SMR component ${config.assetKey} not loaded in AssetManager`);
        continue;
      }
      const instance = instantiateModel(asset.scene);
      instance.name = config.assetKey;
      instance.position.fromArray(config.position);
      instance.rotation.fromArray(config.rotation);
      instance.scale.setScalar(config.scale);
      smrGroup.add(instance);
      disposables.push(...extractDisposables(instance));
      console.info(`[Scene1] Loaded SMR: ${config.assetKey} (${config.role})`);
    } catch (error) {
      console.error(`[Scene1] Failed to load SMR component ${config.assetKey}:`, error);
    }
  }

  // Steam plume on exhaust stack
  const steamAnchor = new THREE.Vector3(36, 36, 30);
  const steamResult = createSteamSprites(steamAnchor, 3);
  steamSprites.push(...steamResult.sprites);
  steamTexture = steamResult.texture;
  steamSprites.forEach((sprite) => smrGroup.add(sprite));

  // Facility label
  const labelCanvas = document.createElement('canvas');
  labelCanvas.width = 1024;
  labelCanvas.height = 160;
  const labelCtx = labelCanvas.getContext('2d')!;
  labelCtx.clearRect(0, 0, 1024, 160);
  labelCtx.fillStyle = 'rgba(2, 8, 16, 0.62)';
  labelCtx.fillRect(0, 0, 1024, 160);
  labelCtx.strokeStyle = 'rgba(0, 240, 255, 0.55)';
  labelCtx.lineWidth = 3;
  labelCtx.strokeRect(1.5, 1.5, 1021, 157);
  labelCtx.font = 'bold 56px Rajdhani, sans-serif';
  labelCtx.textAlign = 'center';
  labelCtx.textBaseline = 'middle';
  labelCtx.fillStyle = '#e8fbff';
  labelCtx.fillText('NUWARD SMR PLANT', 512, 64);
  labelCtx.font = '300 30px Rajdhani, sans-serif';
  labelCtx.fillStyle = 'rgba(120, 220, 255, 0.95)';
  labelCtx.fillText('340 MWe Clean Baseload', 512, 118);
  const labelTexture = new THREE.CanvasTexture(labelCanvas);
  labelTexture.colorSpace = THREE.SRGBColorSpace;
  const labelMaterial = new THREE.SpriteMaterial({ map: labelTexture, transparent: true, depthWrite: false });
  const labelSprite = new THREE.Sprite(labelMaterial);
  labelSprite.scale.set(122, 19, 1);
  labelSprite.position.set(-4, 58, -2);
  smrGroup.add(labelSprite);
  disposables.push({ texture: labelTexture, material: labelMaterial });

  // --- Load Hero Assets (City Skyscraper) ---
  console.info('[Scene1] Loading hero assets...');
  for (const config of HERO_ASSET_CONFIGS) {
    try {
      const asset = assetManager.getModel(config.assetKey);
      if (!asset) {
        console.warn(`[Scene1] Hero asset ${config.assetKey} not loaded`);
        continue;
      }
      const instance = instantiateModel(asset.scene);
      instance.name = config.assetKey;
      instance.position.fromArray(config.position);
      instance.rotation.fromArray(config.rotation);
      instance.scale.setScalar(config.scale);
      cityGroup.add(instance);
      disposables.push(...extractDisposables(instance));
      console.info(`[Scene1] Loaded hero: ${config.assetKey} (${config.role})`);
    } catch (error) {
      console.error(`[Scene1] Failed to load hero asset ${config.assetKey}:`, error);
    }
  }

  // --- Load Facilities Assets ---
  console.info('[Scene1] Loading facilities assets...');
  for (const config of FACILITY_ASSET_CONFIGS) {
    try {
      const asset = assetManager.getModel(config.assetKey);
      if (!asset) {
        console.warn(`[Scene1] Facility asset ${config.assetKey} not loaded`);
        continue;
      }
      const instance = instantiateModel(asset.scene);
      instance.name = config.assetKey;
      instance.position.fromArray(config.position);
      instance.rotation.fromArray(config.rotation);
      instance.scale.setScalar(config.scale);
      facilitiesGroup.add(instance);
      disposables.push(...extractDisposables(instance));
      console.info(`[Scene1] Loaded facility: ${config.assetKey} (${config.role})`);
    } catch (error) {
      console.error(`[Scene1] Failed to load facility asset ${config.assetKey}:`, error);
    }
  }

  const dispose = () => {
    steamTexture?.dispose();
    steamSprites.forEach((s) => {
      (s.material as THREE.Material).dispose();
    });
    disposables.forEach((d) => {
      d.geometry?.dispose();
      d.material?.dispose();
      d.texture?.dispose();
    });
    smrGroup.clear();
    cityGroup.clear();
    facilitiesGroup.clear();
  };

  // Store steam sprites globally for animation
  (globalThis as any).__SCENE1_STEAM_SPRITES__ = steamSprites;

  return { smr: smrGroup, city: cityGroup, facilities: facilitiesGroup, dispose };
}

function extractDisposables(object: THREE.Object3D): { geometry?: THREE.BufferGeometry; material?: THREE.Material; texture?: THREE.Texture }[] {
  const results: { geometry?: THREE.BufferGeometry; material?: THREE.Material; texture?: THREE.Texture }[] = [];
  object.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      results.push({ geometry: child.geometry });
      const materials = Array.isArray(child.material) ? child.material : [child.material];
      materials.forEach((m) => {
        results.push({ material: m });
        Object.values(m).forEach((v) => {
          if (v instanceof THREE.Texture) results.push({ texture: v });
        });
      });
    }
  });
  return results;
}

export function updateScene1Animation(time: number): void {
  const sprites = (globalThis as any).__SCENE1_STEAM_SPRITES__ as THREE.Sprite[] | undefined;
  if (!sprites) return;
  sprites.forEach((sprite, i) => {
    const mat = sprite.material as THREE.SpriteMaterial;
    mat.opacity = 0.2 + 0.1 * Math.sin(time * 1.1 + sprite.userData.phase);
    sprite.position.y = (sprite.userData.baseY as number) + Math.sin(time * 0.8 + sprite.userData.phase) * 1.2;
    sprite.position.x = 36 + Math.sin(time * 0.4 + sprite.userData.phase) * 2.2 + i * 2.5;
  });
}