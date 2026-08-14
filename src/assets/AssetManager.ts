import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { KTX2Loader } from 'three/examples/jsm/loaders/KTX2Loader.js';
import { HDRLoader } from 'three/examples/jsm/loaders/HDRLoader.js';
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';

export interface AssetManifest {
  models: Record<string, AssetEntry>;
  textures: Record<string, AssetEntry>;
  environments: Record<string, AssetEntry>;
}

export interface AssetEntry {
  path: string;
  type: 'model' | 'texture' | 'environment';
  priority: 'critical' | 'high' | 'normal' | 'low';
  metadata?: Record<string, unknown>;
}

export interface LoadProgress {
  total: number;
  loaded: number;
  currentAsset: string;
  percentage: number;
  bytesLoaded: number;
  bytesTotal: number;
}

export interface LoadedAsset<T = unknown> {
  key: string;
  data: T;
  size: number;
  loadTime: number;
}

type ProgressCallback = (progress: LoadProgress) => void;
type CompleteCallback = (assets: Map<string, LoadedAsset>) => void;
type ErrorCallback = (error: Error, assetKey: string) => void;

class AssetManager {
  private static instance: AssetManager;
  private loader: GLTFLoader;
  private dracoLoader: DRACOLoader;
  private ktx2Loader: KTX2Loader;
  private textureLoader: THREE.TextureLoader;
  private assets: Map<string, LoadedAsset> = new Map();
  private loadingPromises: Map<string, Promise<LoadedAsset>> = new Map();
  private progressCallbacks: Set<ProgressCallback> = new Set();
  private completeCallbacks: Set<CompleteCallback> = new Set();
  private errorCallbacks: Set<ErrorCallback> = new Set();
  private manifest: AssetManifest | null = null;
  private totalAssets = 0;
  private loadedAssets = 0;
  private totalBytes = 0;
  private loadedBytes = 0;
  private isLoading = false;

  private constructor() {
    this.loader = new GLTFLoader();
    this.dracoLoader = new DRACOLoader();
    this.dracoLoader.setDecoderPath('/draco/');
    this.loader.setDRACOLoader(this.dracoLoader);

    this.ktx2Loader = new KTX2Loader();
    this.ktx2Loader.setTranscoderPath('/draco/');
    // KTX2 support detection will be initialized when renderer is available
    this.loader.setKTX2Loader(this.ktx2Loader);

    this.textureLoader = new THREE.TextureLoader();
  }

  static getInstance(): AssetManager {
    if (!AssetManager.instance) {
      AssetManager.instance = new AssetManager();
    }
    return AssetManager.instance;
  }

  setManifest(manifest: AssetManifest): void {
    this.manifest = manifest;
    this.totalAssets = Object.keys(manifest.models).length +
                       Object.keys(manifest.textures).length +
                       Object.keys(manifest.environments).length;
  }

  getManifest(): AssetManifest | null {
    return this.manifest;
  }

  async loadAll(progressCb?: ProgressCallback): Promise<Map<string, LoadedAsset>> {
    if (!this.manifest) {
      throw new Error('No asset manifest set');
    }

    if (progressCb) this.onProgress(progressCb);

    this.isLoading = true;
    this.loadedAssets = 0;
    this.loadedBytes = 0;
    this.totalBytes = 0;

    const allAssets = {
      ...this.manifest.models,
      ...this.manifest.textures,
      ...this.manifest.environments,
    };

    const sortedAssets = Object.entries(allAssets).sort((a, b) => {
      const priorityOrder = { critical: 0, high: 1, normal: 2, low: 3 };
      return priorityOrder[a[1].priority] - priorityOrder[b[1].priority];
    });

    const loadPromises = sortedAssets.map(([key, entry]) => this.loadAsset(key, entry));
    const results = await Promise.allSettled(loadPromises);

    results.forEach((result, index) => {
      const [key] = sortedAssets[index];
      if (result.status === 'fulfilled') {
        this.assets.set(key, result.value);
      } else {
        console.error(`Failed to load asset: ${key}`, result.reason);
        this.errorCallbacks.forEach(cb => cb(result.reason, key));
      }
    });

    this.isLoading = false;
    this.completeCallbacks.forEach(cb => cb(this.assets));

    return this.assets;
  }

  async loadAssets(keys: string[], progressCb?: ProgressCallback): Promise<Map<string, LoadedAsset>> {
    if (!this.manifest) {
      throw new Error('No asset manifest set');
    }

    if (progressCb) this.onProgress(progressCb);

    this.isLoading = true;
    this.loadedAssets = 0;
    this.loadedBytes = 0;
    this.totalBytes = 0;

    const allAssets = {
      ...this.manifest.models,
      ...this.manifest.textures,
      ...this.manifest.environments,
    };

    const missingKeys = keys.filter(key => !allAssets[key]);
    if (missingKeys.length > 0) {
      console.warn(`Assets not found in manifest: ${missingKeys.join(', ')}`);
    }

    const assetsToLoad = keys.filter(key => allAssets[key]);
    const sortedAssets = assetsToLoad
      .map(key => [key, allAssets[key]] as [string, AssetEntry])
      .sort((a, b) => {
        const priorityOrder = { critical: 0, high: 1, normal: 2, low: 3 };
        return priorityOrder[a[1].priority] - priorityOrder[b[1].priority];
      });

    const loadPromises = sortedAssets.map(([key, entry]) => this.loadAsset(key, entry));
    const results = await Promise.allSettled(loadPromises);

    results.forEach((result, index) => {
      const [key] = sortedAssets[index];
      if (result.status === 'fulfilled') {
        this.assets.set(key, result.value);
      } else {
        console.error(`Failed to load asset: ${key}`, result.reason);
        this.errorCallbacks.forEach(cb => cb(result.reason, key));
      }
    });

    this.isLoading = false;
    this.completeCallbacks.forEach(cb => cb(this.assets));

    return this.assets;
  }

  async loadManifest(
    manifest: AssetManifest,
    keys: string[],
    progressCb?: ProgressCallback,
  ): Promise<Map<string, LoadedAsset>> {
    if (progressCb) this.onProgress(progressCb);

    this.isLoading = true;
    this.loadedAssets = 0;
    this.loadedBytes = 0;
    this.totalBytes = 0;

    const allAssets = {
      ...manifest.models,
      ...manifest.textures,
      ...manifest.environments,
    };

    const missingKeys = keys.filter(key => !allAssets[key]);
    if (missingKeys.length > 0) {
      console.warn(`Assets not found in provided manifest: ${missingKeys.join(', ')}`);
    }

    const assetsToLoad = keys.filter(key => allAssets[key]);
    const sortedAssets = assetsToLoad
      .map(key => [key, allAssets[key]] as [string, AssetEntry])
      .sort((a, b) => {
        const priorityOrder = { critical: 0, high: 1, normal: 2, low: 3 };
        return priorityOrder[a[1].priority] - priorityOrder[b[1].priority];
      });

    const loadPromises = sortedAssets.map(([key, entry]) => this.loadAsset(key, entry));
    const results = await Promise.allSettled(loadPromises);

    results.forEach((result, index) => {
      const [key] = sortedAssets[index];
      if (result.status === 'fulfilled') {
        this.assets.set(key, result.value);
      } else {
        console.error(`Failed to load asset: ${key}`, result.reason);
        this.errorCallbacks.forEach(cb => cb(result.reason, key));
      }
    });

    this.isLoading = false;
    this.completeCallbacks.forEach(cb => cb(this.assets));

    return this.assets;
  }

  private async loadAsset(key: string, entry: AssetEntry): Promise<LoadedAsset> {
    if (this.loadingPromises.has(key)) {
      return this.loadingPromises.get(key)!;
    }

    let promise: Promise<LoadedAsset>;

    switch (entry.type) {
      case 'model':
        promise = this.loadModel(key, entry.path);
        break;
      case 'texture':
        promise = this.loadTexture(key, entry.path);
        break;
      case 'environment':
        promise = this.loadEnvironment(key, entry.path);
        break;
      default:
        throw new Error(`Unknown asset type: ${entry.type}`);
    }

    this.loadingPromises.set(key, promise);

    try {
      const asset = await promise;
      this.loadedAssets++;
      this.updateProgress(key);
      return asset;
    } finally {
      this.loadingPromises.delete(key);
    }
  }

  private async loadModel(key: string, path: string): Promise<LoadedAsset> {
    return new Promise((resolve, reject) => {
      this.loader.load(
        path,
        (gltf) => {
          const loadTime = performance.now();
          const size = this.estimateGLTFSize(gltf);
          resolve({ key, data: gltf, size, loadTime });
        },
        (progress) => {
          this.loadedBytes = progress.loaded;
          this.totalBytes = progress.total;
          this.updateProgress(key);
        },
        (error) => {
          reject(error);
        }
      );
    });
  }

  private async loadTexture(key: string, path: string): Promise<LoadedAsset> {
    return new Promise((resolve, reject) => {
      this.textureLoader.load(
        path,
        (texture) => {
          texture.colorSpace = THREE.SRGBColorSpace;
          const loadTime = performance.now();
          resolve({ key, data: texture, size: 0, loadTime });
        },
        undefined,
        (error) => reject(error)
      );
    });
  }

  private async loadEnvironment(key: string, path: string): Promise<LoadedAsset> {
    return new Promise((resolve, reject) => {
      const hdrLoader = new HDRLoader();
      hdrLoader.load(
        path,
        (texture) => {
          texture.mapping = THREE.EquirectangularReflectionMapping;
          texture.colorSpace = THREE.LinearSRGBColorSpace;
          const loadTime = performance.now();
          resolve({ key, data: texture, size: 0, loadTime });
        },
        undefined,
        (error) => reject(error)
      );
    });
  }

  private estimateGLTFSize(gltf: GLTF): number {
    let size = 0;
    gltf.scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        const geom = obj.geometry;
        if (geom.attributes.position) {
          size += geom.attributes.position.array.byteLength;
        }
        if (geom.index) {
          size += geom.index.array.byteLength;
        }
      }
    });
    return size;
  }

  private updateProgress(currentAsset: string): void {
    const percentage = this.totalAssets > 0 ? (this.loadedAssets / this.totalAssets) * 100 : 0;

    const progress: LoadProgress = {
      total: this.totalAssets,
      loaded: this.loadedAssets,
      currentAsset,
      percentage,
      bytesLoaded: this.loadedBytes,
      bytesTotal: this.totalBytes,
    };

    this.progressCallbacks.forEach(cb => cb(progress));
  }

  onProgress(callback: ProgressCallback): () => void {
    this.progressCallbacks.add(callback);
    return () => this.progressCallbacks.delete(callback);
  }

  onComplete(callback: CompleteCallback): () => void {
    this.completeCallbacks.add(callback);
    return () => this.completeCallbacks.delete(callback);
  }

  onError(callback: ErrorCallback): () => void {
    this.errorCallbacks.add(callback);
    return () => this.errorCallbacks.delete(callback);
  }

  getAsset<T>(key: string): LoadedAsset<T> | undefined {
    return this.assets.get(key) as LoadedAsset<T> | undefined;
  }

  getModel(key: string): GLTF | undefined {
    const asset = this.assets.get(key);
    return asset?.data as GLTF | undefined;
  }

  configureRenderer(renderer: THREE.WebGLRenderer): void {
    this.ktx2Loader.detectSupport(renderer);
  }

  createModelInstance(key: string): THREE.Group | undefined {
    const source = this.getModel(key)?.scene;
    if (!source) return undefined;

    const instance = source.clone(true);
    const sourceMeshes: THREE.Mesh[] = [];
    const instanceMeshes: THREE.Mesh[] = [];

    source.traverse((object) => {
      if (object instanceof THREE.Mesh) sourceMeshes.push(object);
    });
    instance.traverse((object) => {
      if (object instanceof THREE.Mesh) instanceMeshes.push(object);
    });

    instanceMeshes.forEach((mesh, index) => {
      const sourceMesh = sourceMeshes[index];
      if (!sourceMesh) return;
      const sourceMaterials = Array.isArray(sourceMesh.material)
        ? sourceMesh.material
        : [sourceMesh.material];
      const instanceMaterials = sourceMaterials.map((material) => {
        const clone = material.clone();
        clone.userData.assetInstanceMaterial = true;
        return clone;
      });
      mesh.material = Array.isArray(sourceMesh.material)
        ? instanceMaterials
        : instanceMaterials[0];
    });

    instance.userData.assetManagerKey = key;
    instance.userData.assetManagerInstance = true;
    return instance;
  }

  disposeModelInstance(instance: THREE.Object3D): void {
    instance.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      const materials = Array.isArray(object.material)
        ? object.material
        : [object.material];
      materials.forEach((material) => {
        if (material.userData.assetInstanceMaterial) material.dispose();
      });
    });
  }

  getTexture(key: string): THREE.Texture | undefined {
    const asset = this.assets.get(key);
    return asset?.data as THREE.Texture | undefined;
  }

  getEnvironment(key: string): THREE.Texture | undefined {
    const asset = this.assets.get(key);
    return asset?.data as THREE.Texture | undefined;
  }

  hasAsset(key: string): boolean {
    return this.assets.has(key);
  }

  disposeAsset(key: string): void {
    const asset = this.assets.get(key);
    if (asset) {
      this.disposeAssetData(asset.data);
      this.assets.delete(key);
    }
  }

  private disposeAssetData(data: unknown): void {
    if (data && typeof data === 'object' && 'scene' in data) {
      const gltf = data as GLTF;
      gltf.scene.traverse((obj: THREE.Object3D) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose();
          if (Array.isArray(obj.material)) {
            obj.material.forEach(m => m.dispose());
          } else {
            obj.material?.dispose();
          }
        }
      });
    } else if (data instanceof THREE.Texture) {
      data.dispose();
    }
  }

  disposeAll(): void {
    this.assets.forEach((asset) => this.disposeAssetData(asset.data));
    this.assets.clear();
    this.loadingPromises.clear();
  }

  getLoadingState(): { isLoading: boolean; progress: LoadProgress } {
    return {
      isLoading: this.isLoading,
      progress: {
        total: this.totalAssets,
        loaded: this.loadedAssets,
        currentAsset: '',
        percentage: this.totalAssets > 0 ? (this.loadedAssets / this.totalAssets) * 100 : 0,
        bytesLoaded: this.loadedBytes,
        bytesTotal: this.totalBytes,
      },
    };
  }
}

export const assetManager = AssetManager.getInstance();

export const NUCLEAR_ASSET_MANIFEST: AssetManifest = {
  models: {
    // --- SMR Campus Components (Nuward SMR) ---
    smr_containment_dome: {
      path: '/models/scene1/SMR/SMR_ContainmentDome_LOD0.glb',
      type: 'model',
      priority: 'critical',
      metadata: { description: 'SMR containment dome - campus heart', category: 'smr', role: 'containment' },
    },
    smr_center_building: {
      path: '/models/scene1/SMR/SMR_CenterBuilding_LOD0.glb',
      type: 'model',
      priority: 'critical',
      metadata: { description: 'SMR central auxiliary/control building', category: 'smr', role: 'auxiliary' },
    },
    smr_rooftop_hvac: {
      path: '/models/scene1/SMR/SMR_RooftopHVAC_LOD0.glb',
      type: 'model',
      priority: 'high',
      metadata: { description: 'SMR rooftop HVAC units on auxiliary building', category: 'smr', role: 'hvac' },
    },
    smr_central_unit_block: {
      path: '/models/scene1/SMR/SMR_CentralUnitBlock_LOD0.glb',
      type: 'model',
      priority: 'critical',
      metadata: { description: 'SMR central unit/reactor annex building', category: 'smr', role: 'reactor_annex' },
    },
    smr_turbine_building: {
      path: '/models/scene1/SMR/SMR_TurbineBuilding_LOD0.glb',
      type: 'model',
      priority: 'critical',
      metadata: { description: 'SMR turbine building - power island', category: 'smr', role: 'turbine_hall' },
    },
    smr_exhaust_stack: {
      path: '/models/scene1/SMR/SMR_ExhaustStack_LOD0.glb',
      type: 'model',
      priority: 'critical',
      metadata: { description: 'SMR exhaust stack - vertical landmark', category: 'smr', role: 'stack' },
    },
    smr_central_substation: {
      path: '/models/scene1/SMR/SMR_CentralSubstation_LOD0.glb',
      type: 'model',
      priority: 'critical',
      metadata: { description: 'SMR electrical substation/switchyard - power export', category: 'smr', role: 'substation' },
    },
    smr_perimeter_wall: {
      path: '/models/scene1/SMR/SMR_PerimeterWall_LOD0.glb',
      type: 'model',
      priority: 'high',
      metadata: { description: 'SMR perimeter/security wall (used for sea and land sides)', category: 'smr', role: 'wall' },
    },
    smr_mechanical_pumps: {
      path: '/models/scene1/SMR/SMR_MechanicalPumps_LOD0.glb',
      type: 'model',
      priority: 'high',
      metadata: { description: 'SMR mechanical pump/intake skids for cooling system', category: 'smr', role: 'pumps' },
    },
    smr_pipe_loop_segment: {
      path: '/models/scene1/SMR/SMR_PipeLoopSegment_LOD0.glb',
      type: 'model',
      priority: 'high',
      metadata: { description: 'SMR seawater intake pipe segment', category: 'smr', role: 'intake_pipe' },
    },
    smr_solar_panel_array: {
      path: '/models/scene1/SMR/SMR_SolarPanelArray_LOD0.glb',
      type: 'model',
      priority: 'normal',
      metadata: { description: 'SMR campus solar panel array', category: 'smr', role: 'solar' },
    },
    // --- FBX-derived SMR Components (Nuward SMR) ---
    smr_nuclear_reactor: {
      path: '/models/scene1/SMR/NuclearReactor_LOD0.glb',
      type: 'model',
      priority: 'critical',
      metadata: { description: 'Nuclear reactor core from FBX', category: 'smr', role: 'reactor_core' },
    },
    smr_nuclear_reactor_container: {
      path: '/models/scene1/SMR/NuclearReactorContainer_LOD0.glb',
      type: 'model',
      priority: 'critical',
      metadata: { description: 'Nuclear reactor containment from FBX', category: 'smr', role: 'containment' },
    },
    smr_steam_tower: {
      path: '/models/scene1/SMR/SteamTower_LOD0.glb',
      type: 'model',
      priority: 'high',
      metadata: { description: 'Steam cooling tower from FBX', category: 'smr', role: 'steam_tower' },
    },
    smr_steam_tower_base: {
      path: '/models/scene1/SMR/SteamTowerBase_LOD0.glb',
      type: 'model',
      priority: 'high',
      metadata: { description: 'Steam cooling tower base from FBX', category: 'smr', role: 'steam_tower_base' },
    },
    smr_turbine: {
      path: '/models/scene1/SMR/Turbine_LOD0.glb',
      type: 'model',
      priority: 'critical',
      metadata: { description: 'Turbine machinery from FBX', category: 'smr', role: 'turbine' },
    },
    smr_turbine_building_fbx: {
      path: '/models/scene1/SMR/TurbineBuilding_LOD0.glb',
      type: 'model',
      priority: 'critical',
      metadata: { description: 'Turbine building from FBX', category: 'smr', role: 'turbine_building' },
    },
    smr_turbine_container: {
      path: '/models/scene1/SMR/TurbineContainer_LOD0.glb',
      type: 'model',
      priority: 'high',
      metadata: { description: 'Turbine container from FBX', category: 'smr', role: 'turbine_container' },
    },
    smr_turbine_container_floor: {
      path: '/models/scene1/SMR/TurbineContainerFloor_LOD0.glb',
      type: 'model',
      priority: 'high',
      metadata: { description: 'Turbine container floor from FBX', category: 'smr', role: 'turbine_container_floor' },
    },
    smr_turbine_generator: {
      path: '/models/scene1/SMR/TurbineGenerator_LOD0.glb',
      type: 'model',
      priority: 'critical',
      metadata: { description: 'Turbine generator from FBX', category: 'smr', role: 'generator' },
    },
    smr_turbine_wall: {
      path: '/models/scene1/SMR/TurbineWall_LOD0.glb',
      type: 'model',
      priority: 'normal',
      metadata: { description: 'Turbine wall from FBX', category: 'smr', role: 'turbine_wall' },
    },
    // --- City Components ---
    city_main_skyscraper: {
      path: '/models/scene1/City/MainSkyscraper_LOD0.glb',
      type: 'model',
      priority: 'critical',
      metadata: { description: 'Bangkok hero skyscraper tower', category: 'city', role: 'skyscraper' },
    },
    // --- Facilities Components ---
    facilities_ground_pavement: {
      path: '/models/scene1/Facilities/GroundPavement_LOD0.glb',
      type: 'model',
      priority: 'high',
      metadata: { description: 'Ground pavement/roads for campus', category: 'facilities', role: 'pavement' },
    },
    facilities_landscaping_trees: {
      path: '/models/scene1/Facilities/LandscapingTrees_LOD0.glb',
      type: 'model',
      priority: 'high',
      metadata: { description: 'Landscaping trees for campus', category: 'facilities', role: 'trees' },
    },
    facilities_solar_panel_array: {
      path: '/models/scene1/Facilities/SolarPanelArray_LOD0.glb',
      type: 'model',
      priority: 'normal',
      metadata: { description: 'Solar panel array for green energy facilities', category: 'facilities', role: 'solar' },
    },
    // --- FBX-derived Facilities Components ---
    facilities_ground_base: {
      path: '/models/scene1/Facilities/GroundBase_LOD0.glb',
      type: 'model',
      priority: 'high',
      metadata: { description: 'Ground base terrain from FBX', category: 'facilities', role: 'ground_base' },
    },
    facilities_base_road: {
      path: '/models/scene1/Facilities/BaseRoad_LOD0.glb',
      type: 'model',
      priority: 'high',
      metadata: { description: 'Base road network from FBX', category: 'facilities', role: 'road' },
    },
    facilities_grassland: {
      path: '/models/scene1/Facilities/Grassland_LOD0.glb',
      type: 'model',
      priority: 'normal',
      metadata: { description: 'Grassland terrain from FBX', category: 'facilities', role: 'grassland' },
    },
    facilities_fencing: {
      path: '/models/scene1/Facilities/Fencing_LOD0.glb',
      type: 'model',
      priority: 'high',
      metadata: { description: 'Perimeter fencing from FBX', category: 'facilities', role: 'fencing' },
    },
    facilities_electric_generator: {
      path: '/models/scene1/Facilities/ElectricGenerator_LOD0.glb',
      type: 'model',
      priority: 'high',
      metadata: { description: 'Electric generator from FBX', category: 'facilities', role: 'electric_generator' },
    },
    facilities_electric_pole: {
      path: '/models/scene1/Facilities/ElectricPole_LOD0.glb',
      type: 'model',
      priority: 'high',
      metadata: { description: 'Electric transmission poles from FBX', category: 'facilities', role: 'electric_pole' },
    },
    facilities_electric_wire: {
      path: '/models/scene1/Facilities/ElectricWire_LOD0.glb',
      type: 'model',
      priority: 'normal',
      metadata: { description: 'Electric transmission wires from FBX', category: 'facilities', role: 'electric_wire' },
    },
    facilities_pipeline: {
      path: '/models/scene1/Facilities/Pipeline_LOD0.glb',
      type: 'model',
      priority: 'high',
      metadata: { description: 'Pipeline infrastructure from FBX', category: 'facilities', role: 'pipeline' },
    },
    // --- Legacy models (kept for compatibility) ---
    nuclear_plant: {
      path: '/models/nuclear_plant.glb',
      type: 'model',
      priority: 'low',
      metadata: { description: 'Legacy procedural nuclear plant campus' },
    },
    reactor_building: {
      path: '/models/Meshy_AI_Industrial_Machinery__0724113112_texture.glb',
      type: 'model',
      priority: 'low',
      metadata: { description: 'Legacy industrial machinery - reactor building detail' },
    },
    industrial_vehicle: {
      path: '/models/Meshy_AI_Massive_Industrial_Ve_0724112147_texture.glb',
      type: 'model',
      priority: 'low',
      metadata: { description: 'Legacy massive industrial vehicle' },
    },
    fusion_core: {
      path: '/models/Meshy_AI_Neon_Core_Fusion_Blue_0724113320_texture.glb',
      type: 'model',
      priority: 'low',
      metadata: { description: 'Legacy neon fusion core - reactor visualization' },
    },
    riverside_plant: {
      path: '/models/Meshy_AI_Riverside_Nuclear_Pow_0724180730_texture.glb',
      type: 'model',
      priority: 'low',
      metadata: { description: 'Legacy riverside nuclear plant variant' },
    },
  },
  textures: {},
  environments: {
    industrial_sunset: {
      path: '/textures/environment/industrial_sunset_02_puresky_2k.hdr',
      type: 'environment',
      priority: 'critical',
      metadata: { description: 'Industrial sunset HDR environment' },
    },
  },
};

export function initializeAssetManager(): AssetManager {
  const manager = AssetManager.getInstance();
  manager.setManifest(NUCLEAR_ASSET_MANIFEST);
  return manager;
}
