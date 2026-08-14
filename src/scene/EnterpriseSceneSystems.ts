import * as THREE from 'three';
import { GroundedSkybox } from 'three/examples/jsm/objects/GroundedSkybox.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { FXAAPass } from 'three/examples/jsm/postprocessing/FXAAPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { SMAAPass } from 'three/examples/jsm/postprocessing/SMAAPass.js';
import { SSAOPass } from 'three/examples/jsm/postprocessing/SSAOPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { RectAreaLightUniformsLib } from 'three/examples/jsm/lights/RectAreaLightUniformsLib.js';
import { assetManager } from '../assets/AssetManager';
import { Hotspot3D, ZoneId, RenderShaderMode } from '../types/nuclear';

export type EnterpriseModelRole =
  | 'riverside'
  | 'machinery'
  | 'vehicle'
  | 'fusion';

export type SceneQualityTier = 'high' | 'balanced' | 'xr';

interface OwnedResource {
  dispose(): void;
}

interface AnimatedParticleEmitter {
  points: THREE.Points<THREE.BufferGeometry, THREE.ShaderMaterial>;
  material: THREE.ShaderMaterial;
  timeScale: number;
  baseOpacity: number;
}

interface FlickerLight {
  light: THREE.Light;
  baseIntensity: number;
  phase: number;
  amplitude: number;
  speed: number;
}

interface PlacedEnterpriseModel {
  role: EnterpriseModelRole;
  anchor: THREE.Group;
  model: THREE.Group;
  meshes: THREE.Mesh[];
  triangleCount: number;
}

interface RenderModeMeshSnapshot {
  material: THREE.Material | THREE.Material[];
  renderOrder: number;
}

interface TargetedRenderModeController {
  apply(mode: RenderShaderMode, zone: ZoneId, hotspot: Hotspot3D | null): void;
  update(elapsedTime: number): void;
  dispose(): void;
}

interface InspectableRenderTargetDefinition {
  campusPatterns?: string[];
  scenePatterns?: string[];
  modelRoles?: EnterpriseModelRole[];
}

export interface IndustrialEnvironment {
  group: THREE.Group;
  environmentMap: THREE.Texture | null;
  update(elapsedTime: number): void;
  dispose(): void;
}

export interface EnterpriseLightingRig {
  group: THREE.Group;
  sunlight: THREE.DirectionalLight;
  flickerLights: FlickerLight[];
  setXRActive(active: boolean): void;
  update(elapsedTime: number, scramActive: boolean): void;
  dispose(): void;
}

export interface ReactorExperienceRig {
  group: THREE.Group;
  center: THREE.Vector3;
  coreModel: THREE.Group | null;
  coreMeshes: THREE.Mesh[];
  coreMaterials: THREE.MeshStandardMaterial[];
  coreLights: THREE.PointLight[];
  update(elapsedTime: number, deltaTime: number, scramActive: boolean): void;
}

export interface EnterpriseSceneRig {
  group: THREE.Group;
  models: Map<EnterpriseModelRole, PlacedEnterpriseModel>;
  reactor: ReactorExperienceRig;
  animatedMeshes: THREE.Mesh[];
  occluders: THREE.Mesh[];
  teleportSurfaces: THREE.Object3D[];
  setZone(zone: ZoneId): void;
  setPresentationFocus(role: EnterpriseModelRole | null): void;
  setXRActive(active: boolean): void;
  setRenderMode(mode: RenderShaderMode, hotspot: Hotspot3D | null): void;
  update(
    elapsedTime: number,
    deltaTime: number,
    zone: ZoneId,
    scramActive: boolean,
  ): void;
  dispose(): void;
}

export interface CinematicPostProcessing {
  composer: EffectComposer;
  ssaoPass: SSAOPass | null;
  bloomPass: UnrealBloomPass;
  qualityTier: SceneQualityTier;
  render(deltaTime: number): void;
  setSize(width: number, height: number, pixelRatio: number): void;
  setXRActive(active: boolean): void;
  setQualityTier(tier: SceneQualityTier): void;
  dispose(): void;
}

const PARTICLE_VERTEX_SHADER = `
  attribute float aSeed;
  attribute float aRadius;

  uniform float uTime;
  uniform float uRise;
  uniform float uSpread;
  uniform float uPointSize;
  uniform float uPixelRatio;
  uniform float uSpeed;

  varying float vAlpha;

  void main() {
    float life = fract(aSeed + uTime * uSpeed);
    float angle = aSeed * 31.4159 + life * 2.6;
    vec3 animated = position;
    animated.y += life * uRise;
    animated.x += sin(angle) * uSpread * life;
    animated.z += cos(angle * 0.83) * uSpread * life;

    vec4 viewPosition = modelViewMatrix * vec4(animated, 1.0);
    float distanceScale = 92.0 / max(16.0, -viewPosition.z);
    gl_PointSize = clamp(
      uPointSize * aRadius * uPixelRatio * distanceScale,
      1.0,
      38.0
    );
    gl_Position = projectionMatrix * viewPosition;
    vAlpha = sin(life * 3.14159);
  }
`;

const PARTICLE_FRAGMENT_SHADER = `
  uniform vec3 uColor;
  uniform float uOpacity;
  uniform float uSoftness;

  varying float vAlpha;

  void main() {
    vec2 centered = gl_PointCoord - vec2(0.5);
    float radius = length(centered);
    float alpha = smoothstep(0.5, uSoftness, radius) * vAlpha * uOpacity;
    if (alpha < 0.008) discard;
    gl_FragColor = vec4(uColor, alpha);
  }
`;

const HEAT_SHIMMER_VERTEX_SHADER = `
  uniform float uTime;
  varying vec3 vNormal;
  varying vec3 vWorldPosition;

  void main() {
    vNormal = normalize(normalMatrix * normal);
    vec3 animated = position;
    float wave = sin(position.y * 1.7 + uTime * 2.2)
      * cos(position.x * 1.3 - uTime * 1.35);
    animated += normal * wave * 0.075;
    vec4 worldPosition = modelMatrix * vec4(animated, 1.0);
    vWorldPosition = worldPosition.xyz;
    gl_Position = projectionMatrix * viewMatrix * worldPosition;
  }
`;

const HEAT_SHIMMER_FRAGMENT_SHADER = `
  uniform vec3 uColor;
  uniform float uOpacity;

  varying vec3 vNormal;
  varying vec3 vWorldPosition;

  void main() {
    vec3 viewDirection = normalize(cameraPosition - vWorldPosition);
    float fresnel = pow(1.0 - abs(dot(viewDirection, normalize(vNormal))), 2.2);
    float alpha = fresnel * uOpacity;
    if (alpha < 0.008) discard;
    gl_FragColor = vec4(uColor * (0.8 + fresnel * 1.4), alpha);
  }
`;

const GRADE_SHADER = {
  uniforms: {
    tDiffuse: { value: null },
    uContrast: { value: 1.08 },
    uSaturation: { value: 0.92 },
    uVignette: { value: 0.22 },
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float uContrast;
    uniform float uSaturation;
    uniform float uVignette;
    varying vec2 vUv;

    void main() {
      vec4 source = texture2D(tDiffuse, vUv);
      vec3 color = (source.rgb - 0.5) * uContrast + 0.5;
      float luma = dot(color, vec3(0.2126, 0.7152, 0.0722));
      color = mix(vec3(luma), color, uSaturation);

      // Stronger warm shadow tint, cool highlight tint for industrial feel
      float shadowWeight = 1.0 - smoothstep(0.08, 0.58, luma);
      float highlightWeight = smoothstep(0.45, 0.92, luma);
      color += vec3(-0.025, 0.012, 0.035) * shadowWeight;
      color += vec3(0.025, 0.012, -0.01) * highlightWeight;

      vec2 centered = vUv - 0.5;
      float vignette = smoothstep(0.7, 0.15, dot(centered, centered));
      color *= mix(1.0 - uVignette, 1.0, vignette);
      gl_FragColor = vec4(max(color, 0.0), source.a);
    }
  `,
};

const INSPECTABLE_RENDER_TARGET_DEFINITIONS: Record<
  string,
  InspectableRenderTargetDefinition
> = {
  'containment-building': {
    campusPatterns: ['containment'],
  },
  'auxiliary-annex': {
    campusPatterns: ['annex'],
  },
  'cooling-pump-house': {
    campusPatterns: [
      'cooling water pump house',
      'pump house roof',
      'circulating water intake',
      'cooling water header',
      'pipe rack support',
    ],
  },
  'service-water-tank': {
    campusPatterns: [
      'emergency service water tank',
      'emergency water tank dome',
    ],
  },
  'north-cooling-tower': {
    campusPatterns: [
      'north hyperbolic',
      'north tower opening',
      'north structural ring',
      'north base column',
    ],
  },
  'turbine-hall': {
    campusPatterns: ['turbine hall'],
  },
  switchyard: {
    campusPatterns: [
      'switchyard gravel pad',
      'switchyard insulator',
      'switchyard busbar',
      'transmission gantry',
    ],
  },
  'main-transformers': {
    campusPatterns: [
      'transformer tank',
      'cooling fin',
      'copper bushing',
    ],
  },
  'main-control-room': {
    campusPatterns: [
      'administration building',
      'administration roof',
      'administration window',
    ],
  },
  'reactor-vessel': {
    modelRoles: ['fusion'],
  },
  'steam-generators': {
    scenePatterns: ['fusion energy containment ring'],
  },
  pressurizer: {
    scenePatterns: ['fusion core thermal refraction field'],
  },
  'reactor-coolant-pumps': {
    scenePatterns: ['coolant sealed process conduit 1'],
  },
  condenser: {
    modelRoles: ['machinery'],
  },
};

const INSPECTABLE_RENDER_TARGET_ALIASES: Record<string, string> = {
  'cooling-tower': 'north-cooling-tower',
  'electrical-building': 'auxiliary-annex',
  'fusion-core': 'reactor-vessel',
  'reactor-core': 'reactor-vessel',
  transformer: 'main-transformers',
};

const ZONE_RENDER_PATTERNS: Record<ZoneId, string[]> = {
  overview: ['containment'],
  core: ['containment'],
  turbine: ['turbine hall'],
  coolant: [
    'cooling tower',
    'cooling water',
    'pump house',
    'service water tank',
    'water tank dome',
  ],
  gantry: ['switchyard', 'transformer', 'insulator', 'busbar', 'annex'],
  smr: ['smr', 'containment', 'turbine_building', 'substation', 'exhaust', 'center_building', 'central_unit', 'perimeter', 'pumps', 'pipe_loop', 'hvac', 'solar'],
  facilities: ['desalination', 'data_center', 'heating', 'district', 'pipeline', 'electric', 'ground', 'landscaping', 'solar'],
  city: ['skyscraper', 'city', 'urban', 'tower', 'building'],
  sea: ['ocean', 'sea', 'water', 'shore', 'beach', 'wave'],
};

function normalizeRenderTargetName(name: string): string {
  return name.toLowerCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
}

function matchesRenderTargetPatterns(
  mesh: THREE.Mesh,
  patterns: string[],
): boolean {
  const name = normalizeRenderTargetName(mesh.name);
  return patterns.some((pattern) => name.includes(pattern));
}

function createInspectableRenderTargetRegistry(
  modelRoot: THREE.Group,
  campusMeshes: THREE.Mesh[],
  models: Map<EnterpriseModelRole, PlacedEnterpriseModel>,
): Map<string, THREE.Mesh[]> {
  const sceneMeshes = collectMeshes(modelRoot);
  const registry = new Map<string, THREE.Mesh[]>();

  Object.entries(INSPECTABLE_RENDER_TARGET_DEFINITIONS).forEach(
    ([hotspotId, definition]) => {
      const targetMeshes: THREE.Mesh[] = [];
      const campusPatterns = (definition.campusPatterns ?? [])
        .map(normalizeRenderTargetName);
      const scenePatterns = (definition.scenePatterns ?? [])
        .map(normalizeRenderTargetName);

      if (campusPatterns.length > 0) {
        targetMeshes.push(
          ...campusMeshes.filter((mesh) =>
            matchesRenderTargetPatterns(mesh, campusPatterns)),
        );
      }
      if (scenePatterns.length > 0) {
        targetMeshes.push(
          ...sceneMeshes.filter((mesh) =>
            matchesRenderTargetPatterns(mesh, scenePatterns)),
        );
      }
      definition.modelRoles?.forEach((role) => {
        targetMeshes.push(...(models.get(role)?.meshes ?? []));
      });

      registry.set(
        hotspotId,
        Array.from(new Set(targetMeshes)).filter(
          (mesh) => Boolean(mesh.geometry.getAttribute('position')),
        ),
      );
    },
  );

  Object.entries(INSPECTABLE_RENDER_TARGET_ALIASES).forEach(
    ([alias, targetId]) => {
      registry.set(alias, registry.get(targetId) ?? []);
    },
  );

  return registry;
}

function createXRayMaterial(): THREE.ShaderMaterial {
  const material = new THREE.ShaderMaterial({
    name: 'phase2-targeted-xray',
    uniforms: {
      uColor: { value: new THREE.Color(0x63eaff) },
      uTime: { value: 0 },
    },
    vertexShader: `
      varying vec3 vWorldNormal;
      varying vec3 vWorldPosition;

      void main() {
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPosition.xyz;
        vWorldNormal = normalize(mat3(modelMatrix) * normal);
        gl_Position = projectionMatrix * viewMatrix * worldPosition;
      }
    `,
    fragmentShader: `
      uniform vec3 uColor;
      uniform float uTime;
      varying vec3 vWorldNormal;
      varying vec3 vWorldPosition;

      void main() {
        vec3 viewDirection = normalize(cameraPosition - vWorldPosition);
        float fresnel = pow(1.0 - abs(dot(viewDirection, normalize(vWorldNormal))), 2.15);
        float scan = 0.5 + 0.5 * sin(vWorldPosition.y * 1.45 - uTime * 2.0);
        float alpha = 0.16 + fresnel * 0.52 + scan * 0.055;
        vec3 color = uColor * (0.72 + fresnel * 1.05 + scan * 0.12);
        gl_FragColor = vec4(color, clamp(alpha, 0.16, 0.78));
      }
    `,
    transparent: true,
    depthWrite: false,
    depthTest: true,
    side: THREE.DoubleSide,
    blending: THREE.NormalBlending,
    toneMapped: false,
  });
  material.forceSinglePass = true;
  material.userData.phase2RenderMode = true;
  return material;
}

function createThermalMaterial(
  bounds: THREE.Box3,
  heatCenter: THREE.Vector3,
): THREE.ShaderMaterial {
  const size = bounds.getSize(new THREE.Vector3());
  const radius = Math.max(size.x, size.y, size.z) * 0.72;
  const material = new THREE.ShaderMaterial({
    name: 'phase2-targeted-thermal',
    uniforms: {
      uTime: { value: 0 },
      uHeatCenter: { value: heatCenter.clone() },
      uHeatRadius: { value: Math.max(radius, 4) },
      uMinY: { value: bounds.min.y },
      uMaxY: { value: bounds.max.y },
    },
    vertexShader: `
      varying vec3 vWorldNormal;
      varying vec3 vWorldPosition;

      void main() {
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPosition.xyz;
        vWorldNormal = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * viewMatrix * worldPosition;
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform vec3 uHeatCenter;
      uniform float uHeatRadius;
      uniform float uMinY;
      uniform float uMaxY;
      varying vec3 vWorldNormal;
      varying vec3 vWorldPosition;

      vec3 thermalPalette(float value) {
        vec3 cold = vec3(0.015, 0.025, 0.18);
        vec3 blue = vec3(0.02, 0.28, 0.95);
        vec3 magenta = vec3(0.75, 0.03, 0.48);
        vec3 orange = vec3(1.0, 0.22, 0.015);
        vec3 yellow = vec3(1.0, 0.86, 0.08);
        vec3 whiteHot = vec3(1.0, 0.98, 0.84);

        if (value < 0.2) return mix(cold, blue, value / 0.2);
        if (value < 0.42) return mix(blue, magenta, (value - 0.2) / 0.22);
        if (value < 0.65) return mix(magenta, orange, (value - 0.42) / 0.23);
        if (value < 0.84) return mix(orange, yellow, (value - 0.65) / 0.19);
        return mix(yellow, whiteHot, (value - 0.84) / 0.16);
      }

      void main() {
        float vertical = clamp(
          (vWorldPosition.y - uMinY) / max(uMaxY - uMinY, 0.001),
          0.0,
          1.0
        );
        float radial = 1.0 - smoothstep(
          0.0,
          uHeatRadius,
          distance(vWorldPosition, uHeatCenter)
        );
        float pulse = sin(uTime * 1.35 + vWorldPosition.y * 0.18) * 0.018;
        float heat = clamp(max(vertical * 0.72, radial) + pulse, 0.0, 1.0);
        float facing = 0.78 + abs(normalize(vWorldNormal).z) * 0.22;
        gl_FragColor = vec4(thermalPalette(heat) * facing, 1.0);
      }
    `,
    transparent: false,
    depthWrite: true,
    depthTest: true,
    side: THREE.FrontSide,
    toneMapped: false,
  });
  material.userData.phase2RenderMode = true;
  return material;
}

function createTargetedRenderModeController(
  modelRoot: THREE.Group,
  renderer: THREE.WebGLRenderer,
  campusMeshes: THREE.Mesh[],
  models: Map<EnterpriseModelRole, PlacedEnterpriseModel>,
): TargetedRenderModeController {
  const snapshots = new Map<THREE.Mesh, RenderModeMeshSnapshot>();
  const effectMaterials = new Set<THREE.Material>();
  const inspectableTargets = createInspectableRenderTargetRegistry(
    modelRoot,
    campusMeshes,
    models,
  );
  let activeMaterial: THREE.ShaderMaterial | null = null;

  renderer.domElement.dataset.inspectableRenderTargets = Array.from(
    inspectableTargets.entries(),
  )
    .filter(([, meshes]) => meshes.length > 0)
    .map(([id]) => id)
    .join(',');
  renderer.domElement.dataset.inspectableRenderTargetCounts = Array.from(
    inspectableTargets.entries(),
  )
    .map(([id, meshes]) => `${id}:${meshes.length}`)
    .join(',');

  const restore = () => {
    snapshots.forEach((snapshot, mesh) => {
      mesh.material = snapshot.material;
      mesh.renderOrder = snapshot.renderOrder;
    });
    snapshots.clear();
    effectMaterials.forEach((material) => material.dispose());
    effectMaterials.clear();
    activeMaterial = null;
  };

  const getTargetMeshes = (
    zone: ZoneId,
    hotspot: Hotspot3D | null,
  ): THREE.Mesh[] => {
    if (hotspot) return inspectableTargets.get(hotspot.id) ?? [];

    const patterns = ZONE_RENDER_PATTERNS[zone];
    const normalizedPatterns = patterns.map(normalizeRenderTargetName);
    const targetMeshes = campusMeshes.filter((mesh) => {
      return matchesRenderTargetPatterns(mesh, normalizedPatterns);
    });

    const roleMeshes: THREE.Mesh[] = [];
    if (zone === 'core') {
      roleMeshes.push(...(models.get('fusion')?.meshes ?? []));
    }
    if (zone === 'turbine') {
      roleMeshes.push(...(models.get('machinery')?.meshes ?? []));
    }

    return Array.from(new Set([...targetMeshes, ...roleMeshes])).filter(
      (mesh) => Boolean(mesh.geometry.getAttribute('position')),
    );
  };

  const publishDiagnostics = (
    mode: RenderShaderMode,
    target: string,
    meshCount: number,
  ) => {
    renderer.domElement.dataset.renderModeApplied = mode;
    renderer.domElement.dataset.renderModeTarget = target;
    renderer.domElement.dataset.renderModeMeshCount = String(meshCount);
    renderer.domElement.dataset.xrayApplied = String(mode === 'xray' && meshCount > 0);
    renderer.domElement.dataset.thermalApplied = String(mode === 'thermal' && meshCount > 0);
  };

  return {
    apply(mode, zone, hotspot) {
      restore();

      if (mode !== 'xray' && mode !== 'thermal') {
        publishDiagnostics(mode, hotspot?.id ?? zone, 0);
        return;
      }

      const activeHotspot = hotspot;
      const targetMeshes = getTargetMeshes(zone, activeHotspot);
      if (targetMeshes.length === 0) {
        publishDiagnostics(mode, activeHotspot?.id ?? zone, 0);
        return;
      }

      modelRoot.updateMatrixWorld(true);
      const bounds = new THREE.Box3();
      targetMeshes.forEach((mesh) => bounds.expandByObject(mesh, true));
      const boundsCenter = bounds.getCenter(new THREE.Vector3());
      const hotspotCenter = activeHotspot
        ? new THREE.Vector3(...activeHotspot.position3D).applyMatrix4(modelRoot.matrixWorld)
        : null;
      const heatCenter = hotspotCenter && bounds.containsPoint(hotspotCenter)
        ? hotspotCenter
        : boundsCenter;
      const material = mode === 'xray'
        ? createXRayMaterial()
        : createThermalMaterial(bounds, heatCenter);
      activeMaterial = material;
      effectMaterials.add(material);

      targetMeshes.forEach((mesh) => {
        snapshots.set(mesh, {
          material: mesh.material,
          renderOrder: mesh.renderOrder,
        });
        mesh.material = material;
        mesh.renderOrder = mode === 'xray' ? 18 : 9;
      });

      publishDiagnostics(mode, activeHotspot?.id ?? zone, targetMeshes.length);
    },
    update(elapsedTime) {
      if (activeMaterial) activeMaterial.uniforms.uTime.value = elapsedTime;
    },
    dispose() {
      restore();
    },
  };
}

function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0xffffffff;
  };
}

function markOwned<T extends OwnedResource>(resource: T): T {
  (resource as unknown as { userData?: Record<string, unknown> }).userData ??= {};
  (resource as unknown as { userData: Record<string, unknown> }).userData.phase2Owned = true;
  return resource;
}

function disposeOwnedResources(root: THREE.Object3D): void {
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();

  root.traverse((object) => {
    if (object instanceof THREE.Mesh || object instanceof THREE.Points) {
      if (object.geometry.userData.phase2Owned) geometries.add(object.geometry);
      const objectMaterials = Array.isArray(object.material)
        ? object.material
        : [object.material];
      objectMaterials.forEach((material) => {
        if (material.userData.phase2Owned) materials.add(material);
      });
    }
  });

  geometries.forEach((geometry) => geometry.dispose());
  materials.forEach((material) => material.dispose());
}

function countTriangles(root: THREE.Object3D): number {
  let triangles = 0;
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    const index = object.geometry.getIndex();
    const position = object.geometry.getAttribute('position');
    triangles += index
      ? Math.floor(index.count / 3)
      : Math.floor((position?.count ?? 0) / 3);
  });
  return triangles;
}

function collectMeshes(root: THREE.Object3D): THREE.Mesh[] {
  const meshes: THREE.Mesh[] = [];
  root.traverse((object) => {
    if (object instanceof THREE.Mesh) meshes.push(object);
  });
  return meshes;
}

function configureTexture(texture: THREE.Texture | null, anisotropy: number): void {
  if (!texture) return;
  texture.anisotropy = Math.max(texture.anisotropy, anisotropy);
}

function configureEnterpriseMaterial(
  material: THREE.Material,
  role: EnterpriseModelRole | 'campus',
  anisotropy: number,
): void {
  if (!(material instanceof THREE.MeshStandardMaterial)) return;

  material.envMapIntensity = role === 'fusion' ? 1.05 : role === 'campus' ? 0.72 : 0.9;
  material.side = THREE.FrontSide;
  configureTexture(material.map, anisotropy);
  configureTexture(material.normalMap, anisotropy);
  configureTexture(material.metalnessMap, anisotropy);
  configureTexture(material.roughnessMap, anisotropy);
  if (material.normalMap) material.normalScale.setScalar(role === 'fusion' ? 0.75 : 0.58);

  const name = material.name.toLowerCase();
  if (role === 'campus') {
    if (name.includes('concrete') || name.includes('asphalt')) {
      material.metalness = Math.min(material.metalness, 0.03);
      material.roughness = Math.max(material.roughness, 0.88);
      material.envMapIntensity = 0.42;
    } else if (
      name.includes('metal')
      || name.includes('galvanized')
      || name.includes('transformer')
      || name.includes('pipe')
    ) {
      material.metalness = Math.max(material.metalness, 0.7);
      material.roughness = THREE.MathUtils.clamp(material.roughness, 0.3, 0.52);
      material.envMapIntensity = 0.9;
      if (name.includes('warm-practical')) {
        material.emissive.setHex(0xffb66e);
        material.emissiveIntensity = 2.1;
      }
    } else if (name.includes('glass')) {
      material.metalness = 0.04;
      material.roughness = 0.12;
      material.opacity = 0.54;
      material.transparent = true;
      material.depthWrite = false;
      material.envMapIntensity = 0.62;
      material.emissive.setHex(0xffa85c);
      material.emissiveIntensity = 0.34;
    } else if (name.includes('cooling') || name.includes('tower')) {
      material.metalness = Math.min(material.metalness, 0.1);
      material.roughness = Math.max(material.roughness, 0.75);
      material.envMapIntensity = 0.48;
    } else if (name.includes('dome') || name.includes('containment') || name.includes('reactor')) {
      material.metalness = Math.min(material.metalness, 0.08);
      material.roughness = Math.max(material.roughness, 0.82);
      material.envMapIntensity = 0.46;
    }
  } else if (role === 'fusion') {
    material.emissive.setHex(0x1ae6ff);
    material.emissiveMap = material.map;
    material.emissiveIntensity = 1.05;
    material.metalness = Math.min(material.metalness, 0.72);
    material.roughness = THREE.MathUtils.clamp(material.roughness, 0.22, 0.42);
  } else {
    material.metalness = THREE.MathUtils.clamp(material.metalness, 0.25, 0.82);
    material.roughness = THREE.MathUtils.clamp(material.roughness, 0.3, 0.58);
  }
  material.needsUpdate = true;
}

export function configureCampusMaterials(
  root: THREE.Object3D,
  renderer: THREE.WebGLRenderer,
): THREE.Mesh[] {
  const meshes = collectMeshes(root);
  const anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  const configured = new Set<THREE.Material>();
  const practicalMaterials = new Map<THREE.Material, THREE.Material>();

  meshes.forEach((mesh) => {
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    if (mesh.name.toLowerCase().includes('perimeter light head')) {
      const sourceMaterials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      const nextMaterials = sourceMaterials.map((sourceMaterial) => {
        const existing = practicalMaterials.get(sourceMaterial);
        if (existing) return existing;
        const practicalMaterial = sourceMaterial.clone();
        practicalMaterial.name = `${sourceMaterial.name || 'industrial-metal'}-warm-practical`;
        practicalMaterials.set(sourceMaterial, practicalMaterial);
        return practicalMaterial;
      });
      mesh.material = Array.isArray(mesh.material) ? nextMaterials : nextMaterials[0];
    }
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    materials.forEach((material) => {
      if (configured.has(material)) return;
      configured.add(material);
      configureEnterpriseMaterial(material, 'campus', anisotropy);
    });
  });
  return meshes;
}

function createPlacedModel(
  role: EnterpriseModelRole,
  assetKey: string,
  targetMaxSize: number,
  position: THREE.Vector3,
  rotationY: number,
  renderer: THREE.WebGLRenderer,
): PlacedEnterpriseModel | null {
  const model = assetManager.createModelInstance(assetKey);
  if (!model) return null;

  model.name = `${role} Meshy Asset`;
  model.rotation.y = rotationY;
  model.updateMatrixWorld(true);

  const initialBox = new THREE.Box3().setFromObject(model);
  const initialSize = initialBox.getSize(new THREE.Vector3());
  const maxDimension = Math.max(initialSize.x, initialSize.y, initialSize.z);
  if (!Number.isFinite(maxDimension) || maxDimension <= Number.EPSILON) {
    assetManager.disposeModelInstance(model);
    return null;
  }

  const scale = targetMaxSize / maxDimension;
  model.scale.setScalar(scale);
  model.updateMatrixWorld(true);

  const scaledBox = new THREE.Box3().setFromObject(model);
  const scaledCenter = scaledBox.getCenter(new THREE.Vector3());
  model.position.set(-scaledCenter.x, -scaledBox.min.y, -scaledCenter.z);

  const anchor = new THREE.Group();
  anchor.name = `${role} Asset Anchor`;
  anchor.position.copy(position);
  anchor.add(model);

  const anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  const meshes = collectMeshes(model);
  meshes.forEach((mesh) => {
    mesh.name = `${role} ${mesh.name || 'hero mesh'}`;
    mesh.castShadow = role !== 'riverside';
    mesh.receiveShadow = true;
    mesh.frustumCulled = true;
    mesh.userData.enterpriseRole = role;
    mesh.userData.skipXRayEdges = true;
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    materials.forEach((material) => configureEnterpriseMaterial(material, role, anisotropy));
  });

  return {
    role,
    anchor,
    model,
    meshes,
    triangleCount: countTriangles(model),
  };
}

function createParticleEmitter({
  name,
  count,
  color,
  opacity,
  rise,
  spread,
  pointSize,
  speed,
  softness,
  seed,
  blending = THREE.NormalBlending,
}: {
  name: string;
  count: number;
  color: number;
  opacity: number;
  rise: number;
  spread: number;
  pointSize: number;
  speed: number;
  softness: number;
  seed: number;
  blending?: THREE.Blending;
}): AnimatedParticleEmitter {
  const random = seededRandom(seed);
  const positions = new Float32Array(count * 3);
  const seeds = new Float32Array(count);
  const radii = new Float32Array(count);

  for (let index = 0; index < count; index += 1) {
    const offset = index * 3;
    const angle = random() * Math.PI * 2;
    const radius = Math.sqrt(random()) * spread;
    positions[offset] = Math.cos(angle) * radius;
    positions[offset + 1] = random() * 0.8;
    positions[offset + 2] = Math.sin(angle) * radius;
    seeds[index] = random();
    radii[index] = 0.55 + random() * 0.9;
  }

  const geometry = markOwned(new THREE.BufferGeometry());
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1));
  geometry.setAttribute('aRadius', new THREE.BufferAttribute(radii, 1));

  const material = markOwned(new THREE.ShaderMaterial({
    name: `${name} material`,
    uniforms: {
      uTime: { value: 0 },
      uRise: { value: rise },
      uSpread: { value: spread },
      uPointSize: { value: pointSize },
      uPixelRatio: { value: 1 },
      uSpeed: { value: speed },
      uColor: { value: new THREE.Color(color) },
      uOpacity: { value: opacity },
      uSoftness: { value: softness },
    },
    vertexShader: PARTICLE_VERTEX_SHADER,
    fragmentShader: PARTICLE_FRAGMENT_SHADER,
    transparent: true,
    depthWrite: false,
    depthTest: true,
    blending,
    toneMapped: false,
  }));

  const points = new THREE.Points(geometry, material);
  points.name = name;
  points.frustumCulled = false;
  points.renderOrder = 12;
  return { points, material, timeScale: 1, baseOpacity: opacity };
}

function createReactorExperience(
  coreModel: PlacedEnterpriseModel | null,
  pixelRatio: number,
): ReactorExperienceRig {
  const group = new THREE.Group();
  group.name = 'Phase 2 Fusion Core Experience';
  group.position.set(-10, 0, 0);

  const resources: THREE.Object3D[] = [];
  const coreCenter = new THREE.Vector3(0, 10.4, 0);

  const platformMaterial = markOwned(new THREE.MeshStandardMaterial({
    name: 'reactor-core-platform-steel',
    color: 0x141e22,
    metalness: 0.85,
    roughness: 0.28,
    envMapIntensity: 1.35,
  }));
  const platform = new THREE.Mesh(
    markOwned(new THREE.CylinderGeometry(7.2, 7.7, 1.1, 64)),
    platformMaterial,
  );
  platform.name = 'Fusion Core Service Plinth';
  platform.position.y = 4.5;
  platform.castShadow = true;
  platform.receiveShadow = true;
  group.add(platform);

  if (coreModel) {
    coreModel.anchor.position.set(0, 5.0, 0);
    coreModel.anchor.name = 'Fusion Core Meshy Hero Anchor';
    group.add(coreModel.anchor);
  }

  const ringMaterial = markOwned(new THREE.MeshBasicMaterial({
    name: 'fusion-energy-ring',
    color: 0x4ae6ff,
    transparent: true,
    opacity: 0.55,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
  }));
  for (let index = 0; index < 5; index += 1) {
    const ring = new THREE.Mesh(
      markOwned(new THREE.TorusGeometry(5.0 + index * 0.42, 0.04, 10, 96)),
      ringMaterial,
    );
    ring.name = `Fusion Energy Containment Ring ${index + 1}`;
    ring.position.copy(coreCenter);
    ring.position.y += (index - 2) * 1.3;
    ring.rotation.x = Math.PI / 2 + (index % 2) * 0.1;
    ring.rotation.y = index * 0.28;
    ring.renderOrder = 13;
    group.add(ring);
    resources.push(ring);
  }

  const shimmerMaterial = markOwned(new THREE.ShaderMaterial({
    name: 'fusion-core-heat-shimmer',
    uniforms: {
      uTime: { value: 0 },
      uColor: { value: new THREE.Color(0x4ae6ff) },
      uOpacity: { value: 0.2 },
    },
    vertexShader: HEAT_SHIMMER_VERTEX_SHADER,
    fragmentShader: HEAT_SHIMMER_FRAGMENT_SHADER,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
  }));
  const shimmer = new THREE.Mesh(
    markOwned(new THREE.SphereGeometry(6.5, 48, 32)),
    shimmerMaterial,
  );
  shimmer.name = 'Fusion Core Thermal Refraction Field';
  shimmer.position.copy(coreCenter);
  shimmer.scale.y = 0.8;
  shimmer.renderOrder = 12;
  group.add(shimmer);

  const energyEmitter = createParticleEmitter({
    name: 'Fusion Core Energy Particles',
    count: 420,
    color: 0x3fe4ff,
    opacity: 0.9,
    rise: 9.5,
    spread: 3.8,
    pointSize: 5.8,
    speed: 0.21,
    softness: 0.07,
    seed: 731,
    blending: THREE.AdditiveBlending,
  });
  energyEmitter.points.position.set(0, 5.8, 0);
  energyEmitter.material.uniforms.uPixelRatio.value = pixelRatio;
  group.add(energyEmitter.points);

  const emberEmitter = createParticleEmitter({
    name: 'Fusion Core Warm Energy Embers',
    count: 110,
    color: 0xff8c4a,
    opacity: 0.62,
    rise: 6.5,
    spread: 2.8,
    pointSize: 3.8,
    speed: 0.125,
    softness: 0.09,
    seed: 177,
    blending: THREE.AdditiveBlending,
  });
  emberEmitter.points.position.set(0, 6.8, 0);
  emberEmitter.material.uniforms.uPixelRatio.value = pixelRatio;
  group.add(emberEmitter.points);

  // Secondary fine particle emitter for micro-detail
  const microEmitter = createParticleEmitter({
    name: 'Fusion Core Micro Sparks',
    count: 180,
    color: 0x5ce8ff,
    opacity: 0.45,
    rise: 5.5,
    spread: 2.2,
    pointSize: 2.2,
    speed: 0.32,
    softness: 0.05,
    seed: 419,
    blending: THREE.AdditiveBlending,
  });
  microEmitter.points.position.set(0, 6.2, 0);
  microEmitter.material.uniforms.uPixelRatio.value = pixelRatio;
  group.add(microEmitter.points);

  const lightShaftMaterial = markOwned(new THREE.MeshBasicMaterial({
    name: 'fusion-core-light-shaft',
    color: 0x2ae0ff,
    transparent: true,
    opacity: 0.048,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    toneMapped: false,
  }));
  const lightShaft = new THREE.Mesh(
    markOwned(new THREE.CylinderGeometry(3.0, 7.2, 34, 48, 1, true)),
    lightShaftMaterial,
  );
  lightShaft.name = 'Fusion Core Volumetric Light Spill';
  lightShaft.position.set(0, 20.5, 0);
  lightShaft.renderOrder = 11;
  group.add(lightShaft);

  // Secondary wider light shaft for more volume
  const lightShaftOuterMaterial = markOwned(new THREE.MeshBasicMaterial({
    name: 'fusion-core-light-shaft-outer',
    color: 0x1a9fff,
    transparent: true,
    opacity: 0.022,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    toneMapped: false,
  }));
  const lightShaftOuter = new THREE.Mesh(
    markOwned(new THREE.CylinderGeometry(4.5, 9.5, 40, 48, 1, true)),
    lightShaftOuterMaterial,
  );
  lightShaftOuter.name = 'Fusion Core Outer Light Spill';
  lightShaftOuter.position.set(0, 23.0, 0);
  lightShaftOuter.renderOrder = 10;
  group.add(lightShaftOuter);

  const coreLight = new THREE.PointLight(0x3cefff, 75, 62, 1.8);
  coreLight.name = 'Phase 2 Reactor Core Key Light';
  coreLight.position.copy(coreCenter);
  const coreBounce = new THREE.PointLight(0x6aceff, 30, 90, 2.2);
  coreBounce.name = 'Phase 2 Reactor Core Ambient Spill';
  coreBounce.position.set(0, 15, 0);
  const warmCoreBounce = new THREE.PointLight(0xff9c5e, 10, 32, 2.3);
  warmCoreBounce.name = 'Phase 2 Reactor Core Warm Bounce';
  warmCoreBounce.position.set(0, 7, 0);
  group.add(coreLight, coreBounce, warmCoreBounce);

  const coreMaterials = coreModel
    ? coreModel.meshes.flatMap((mesh) => {
        const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        return materials.filter(
          (material): material is THREE.MeshStandardMaterial =>
            material instanceof THREE.MeshStandardMaterial,
        );
      })
    : [];

  return {
    group,
    center: coreCenter.clone().add(group.position),
    coreModel: coreModel?.model ?? null,
    coreMeshes: coreModel?.meshes ?? [],
    coreMaterials,
    coreLights: [coreLight, coreBounce, warmCoreBounce],
    update(elapsedTime, deltaTime, scramActive) {
      const pulse = scramActive
        ? 0.22 + Math.sin(elapsedTime * 1.25) * 0.035
        : 1 + Math.sin(elapsedTime * 1.95) * 0.15
          + Math.sin(elapsedTime * 0.65) * 0.065;
      const rotationSpeed = scramActive ? 0.022 : 0.065;
      if (coreModel) coreModel.model.rotation.y += deltaTime * rotationSpeed;

      resources.forEach((resource, index) => {
        resource.rotation.z += deltaTime * (0.042 + index * 0.01);
        const scale = 1 + Math.sin(elapsedTime * 1.5 + index) * 0.02;
        resource.scale.set(scale, scale, scale);
      });

      shimmerMaterial.uniforms.uTime.value = elapsedTime;
      shimmerMaterial.uniforms.uOpacity.value = (scramActive ? 0.07 : 0.2) * pulse;
      energyEmitter.material.uniforms.uTime.value = elapsedTime;
      energyEmitter.material.uniforms.uOpacity.value = (scramActive ? 0.25 : 0.9) * pulse;
      emberEmitter.material.uniforms.uTime.value = elapsedTime;
      emberEmitter.material.uniforms.uOpacity.value = (scramActive ? 0.15 : 0.62) * pulse;
      microEmitter.material.uniforms.uTime.value = elapsedTime;
      microEmitter.material.uniforms.uOpacity.value = (scramActive ? 0.12 : 0.45) * pulse;
      lightShaftMaterial.opacity = (scramActive ? 0.018 : 0.048) * pulse;
      lightShaftOuterMaterial.opacity = (scramActive ? 0.008 : 0.022) * pulse;

      coreMaterials.forEach((material) => {
        material.emissiveIntensity = (scramActive ? 0.26 : 1.08) * pulse;
      });
      coreLight.intensity = (scramActive ? 10 : 44) * pulse;
      coreBounce.intensity = (scramActive ? 4 : 17) * pulse;
      warmCoreBounce.intensity = (scramActive ? 1.5 : 5.5) * pulse;
    },
  };
}

function createWaterMaterial(): THREE.MeshPhysicalMaterial {
  const material = markOwned(new THREE.MeshPhysicalMaterial({
    name: 'industrial-cooling-reservoir-water',
    color: 0x214e59,
    roughness: 0.24,
    metalness: 0.04,
    transmission: 0.06,
    transparent: true,
    opacity: 0.9,
    clearcoat: 0.36,
    clearcoatRoughness: 0.22,
    envMapIntensity: 1.35,
    depthWrite: true,
  }));
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uPhase2Time = { value: 0 };
    shader.vertexShader = `uniform float uPhase2Time;\n${shader.vertexShader}`;
    shader.vertexShader = shader.vertexShader.replace(
      '#include <begin_vertex>',
      `
        vec3 transformed = vec3(position);
        transformed.z += sin(position.x * 0.055 + uPhase2Time * 0.55) * 0.11;
        transformed.z += cos(position.y * 0.07 - uPhase2Time * 0.38) * 0.07;
      `,
    );
    material.userData.phase2Shader = shader;
  };
  material.customProgramCacheKey = () => 'phase2-industrial-water-v1';
  return material;
}

function createEffectsGroup(pixelRatio: number): {
  group: THREE.Group;
  emitters: AnimatedParticleEmitter[];
  waterMaterial: THREE.MeshPhysicalMaterial;
} {
  const group = new THREE.Group();
  group.name = 'Phase 2 Industrial Atmospheric Effects';
  const emitters: AnimatedParticleEmitter[] = [];

  const groundMaterial = markOwned(new THREE.MeshStandardMaterial({
    name: 'extended-industrial-campus-ground',
    color: 0x39423f,
    roughness: 0.96,
    metalness: 0.02,
    envMapIntensity: 0.58,
  }));
  const ground = new THREE.Mesh(
    markOwned(new THREE.PlaneGeometry(520, 520, 1, 1)),
    groundMaterial,
  );
  ground.name = 'Extended Industrial Campus Ground';
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.12;
  ground.receiveShadow = true;
  group.add(ground);

  const waterMaterial = createWaterMaterial();
  const water = new THREE.Mesh(
    markOwned(new THREE.PlaneGeometry(260, 62, 80, 20)),
    waterMaterial,
  );
  water.name = 'Riverside Cooling Reservoir';
  water.rotation.x = -Math.PI / 2;
  water.position.set(0, 0.08, -86);
  water.receiveShadow = true;
  group.add(water);

  const steamLocations = [
    new THREE.Vector3(-48, 61.5, -24),
    new THREE.Vector3(48, 61.5, -24),
  ];
  steamLocations.forEach((position, index) => {
    const emitter = createParticleEmitter({
      name: `Cooling Tower Steam Plume ${index + 1}`,
      count: 150,
      color: 0xd9e6e5,
      opacity: 0.28,
      rise: 33,
      spread: 8.2,
      pointSize: 18,
      speed: 0.035,
      softness: 0.03,
      seed: 500 + index,
    });
    emitter.points.position.copy(position);
    emitter.material.uniforms.uPixelRatio.value = pixelRatio;
    group.add(emitter.points);
    emitters.push(emitter);
  });

  const smokeLocations = [
    new THREE.Vector3(5, 37.5, 24),
    new THREE.Vector3(45, 37.5, 24),
  ];
  smokeLocations.forEach((position, index) => {
    const emitter = createParticleEmitter({
      name: `Turbine Hall Exhaust Haze ${index + 1}`,
      count: 54,
      color: 0x6b7474,
      opacity: 0.14,
      rise: 17,
      spread: 3.3,
      pointSize: 12,
      speed: 0.028,
      softness: 0.025,
      seed: 610 + index,
    });
    emitter.points.position.copy(position);
    emitter.material.uniforms.uPixelRatio.value = pixelRatio;
    group.add(emitter.points);
    emitters.push(emitter);
  });

  const dust = createParticleEmitter({
    name: 'Campus Atmospheric Dust',
    count: 260,
    color: 0xd8c9aa,
    opacity: 0.085,
    rise: 16,
    spread: 115,
    pointSize: 2.1,
    speed: 0.009,
    softness: 0.04,
    seed: 991,
  });
  dust.points.position.set(0, 2, 0);
  dust.material.uniforms.uPixelRatio.value = pixelRatio;
  group.add(dust.points);
  emitters.push(dust);

  return { group, emitters, waterMaterial };
}

export function createIndustrialEnvironment(
  scene: THREE.Scene,
  renderer: THREE.WebGLRenderer,
  hdrTexture: THREE.Texture | null,
): IndustrialEnvironment {
  const group = new THREE.Group();
  group.name = 'Phase 2 Ground Projected Environment';
  scene.add(group);

  scene.background = new THREE.Color(0x07131d);
  scene.fog = new THREE.FogExp2(0x102733, 0.00255);

  let environmentMap: THREE.Texture | null = null;
  if (hdrTexture) {
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    pmremGenerator.compileEquirectangularShader();
    environmentMap = pmremGenerator.fromEquirectangular(hdrTexture).texture;
    scene.environment = environmentMap;
    scene.environmentIntensity = 0.6;

    const groundedSkybox = new GroundedSkybox(hdrTexture, 42, 680, 96);
    groundedSkybox.name = 'Industrial Sunset Ground Projected Sky';
    groundedSkybox.position.y = 39;
    group.add(groundedSkybox);
    pmremGenerator.dispose();
  } else {
    scene.environment = null;
  }

  return {
    group,
    environmentMap,
    update() {
      // Reserved for future environment probes without adding another render loop.
    },
    dispose() {
      scene.remove(group);
      group.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return;
        object.geometry.dispose();
        const materials = Array.isArray(object.material)
          ? object.material
          : [object.material];
        materials.forEach((material) => material.dispose());
      });
      if (scene.environment === environmentMap) scene.environment = null;
      environmentMap?.dispose();
    },
  };
}

export function createEnterpriseLighting(
  scene: THREE.Scene,
  qualityTier: SceneQualityTier,
): EnterpriseLightingRig {
  RectAreaLightUniformsLib.init();
  const group = new THREE.Group();
  group.name = 'Phase 2 Enterprise Lighting Rig';
  scene.add(group);

  // Cool blue-hour ambient base with enough floor lift to retain industrial detail.
  const hemisphere = new THREE.HemisphereLight(0x7198b7, 0x071015, 0.36);
  hemisphere.name = 'Cool Atmospheric Hemisphere Fill';
  group.add(hemisphere);

  const sunlight = new THREE.DirectionalLight(0xffe2bd, 2.1);
  sunlight.name = 'Industrial Blue Hour Sun';
  sunlight.position.set(-92, 138, 84);
  sunlight.castShadow = true;
  const desktopShadowSize = qualityTier === 'high' ? 2048 : 1024;
  const shadowSize = desktopShadowSize;
  sunlight.shadow.mapSize.set(shadowSize, shadowSize);
  sunlight.shadow.camera.near = 18;
  sunlight.shadow.camera.far = 360;
  sunlight.shadow.camera.left = -145;
  sunlight.shadow.camera.right = 145;
  sunlight.shadow.camera.top = 145;
  sunlight.shadow.camera.bottom = -145;
  sunlight.shadow.bias = -0.00018;
  sunlight.shadow.normalBias = 0.045;
  sunlight.shadow.radius = 3.2;
  sunlight.target.position.set(0, 10, 0);
  group.add(sunlight, sunlight.target);

  const coolFill = new THREE.DirectionalLight(0x628bb5, 0.4);
  coolFill.name = 'Cool Industrial Shadow Fill';
  coolFill.position.set(105, 58, -112);
  group.add(coolFill);

  const warmBounce = new THREE.DirectionalLight(0xffaa66, 0.22);
  warmBounce.name = 'Warm Ground Bounce';
  warmBounce.position.set(-44, 22, 126);
  group.add(warmBounce);

  // Reactor containment rim light - cyan industrial accent
  const reactorRim = new THREE.SpotLight(0x66cfff, 82, 118, 0.48, 0.52, 1.5);
  reactorRim.name = 'Reactor Containment Rim Light';
  reactorRim.position.set(-52, 58, 52);
  reactorRim.target.position.set(-10, 16, 0);
  group.add(reactorRim, reactorRim.target);

  // Machinery warm rim - adds depth to turbine/switchyard areas
  const machineryRim = new THREE.SpotLight(0xffb66f, 52, 112, 0.42, 0.55, 1.7);
  machineryRim.name = 'Industrial Machinery Warm Rim';
  machineryRim.position.set(70, 42, 10);
  machineryRim.target.position.set(22, 6, 4);
  group.add(machineryRim, machineryRim.target);

  // Control room interior area light
  const controlRoomLight = new THREE.RectAreaLight(0xffbd78, 18, 22, 5.5);
  controlRoomLight.name = 'Control Room Interior Area Light';
  controlRoomLight.position.set(-8, 7.5, 41);
  controlRoomLight.lookAt(-8, 5, 49);
  group.add(controlRoomLight);

  // Turbine service hall area light
  const turbineAreaLight = new THREE.RectAreaLight(0xffb86f, 18, 34, 7);
  turbineAreaLight.name = 'Turbine Service Hall Area Light';
  turbineAreaLight.position.set(25, 12, 15.5);
  turbineAreaLight.lookAt(25, 8, 29);
  group.add(turbineAreaLight);

  [
    { name: 'Containment Airlock Practical', position: [-10, 8, 20] as const, intensity: 12, distance: 24 },
    { name: 'Turbine Hall Entrance Practical', position: [46, 8, 42] as const, intensity: 10, distance: 25 },
    { name: 'Administration Practical', position: [-8, 7, 42] as const, intensity: 9, distance: 23 },
    { name: 'Pump House Practical', position: [-35, 7, 34] as const, intensity: 8, distance: 21 },
    { name: 'Switchyard Service Practical', position: [55, 8, 13] as const, intensity: 8, distance: 22 },
  ].forEach(({ name, position, intensity, distance }) => {
    const light = new THREE.PointLight(0xffb15f, intensity, distance, 2);
    light.name = name;
    light.position.set(position[0], position[1], position[2]);
    group.add(light);
  });

  // Emergency reactor red lights - flicker during scram
  const flickerLights: FlickerLight[] = [];
  [
    new THREE.Vector3(-17, 7.2, 10),
    new THREE.Vector3(-3, 7.2, 10),
    new THREE.Vector3(-17, 7.2, -10),
    new THREE.Vector3(-3, 7.2, -10),
  ].forEach((position, index) => {
    const light = new THREE.PointLight(0xff2d1f, 6.5, 24, 2);
    light.name = `Emergency Reactor Red Light ${index + 1}`;
    light.position.copy(position);
    group.add(light);
    flickerLights.push({
      light,
      baseIntensity: 6.5,
      phase: index * 1.7,
      amplitude: 0.18,
      speed: 7.2 + index * 0.35,
    });
  });

  return {
    group,
    sunlight,
    flickerLights,
    setXRActive(active) {
      // Quest 3: halve the sun shadow map during immersive sessions to keep
      // shadow-pass fill cheap at 72-120Hz; restore on desktop exit.
      const nextSize = active ? 1024 : desktopShadowSize;
      if (sunlight.shadow.mapSize.x !== nextSize) {
        sunlight.shadow.mapSize.set(nextSize, nextSize);
        sunlight.shadow.map?.dispose();
        sunlight.shadow.map = null;
        sunlight.shadow.needsUpdate = true;
      }
      sunlight.shadow.radius = active ? 2.4 : 3.2;
    },
    update(elapsedTime, scramActive) {
      flickerLights.forEach((entry) => {
        const normalFlicker = 1
          + Math.sin(elapsedTime * entry.speed + entry.phase) * entry.amplitude
          + Math.sin(elapsedTime * entry.speed * 2.37 + entry.phase) * 0.05;
        const emergencyPulse = scramActive
          ? 1.3 + Math.sin(elapsedTime * 9.5 + entry.phase) * 0.65
          : normalFlicker;
        entry.light.intensity = entry.baseIntensity * emergencyPulse;
      });
    },
    dispose() {
      scene.remove(group);
      group.traverse((object) => {
        if (
          (
            object instanceof THREE.DirectionalLight
            || object instanceof THREE.SpotLight
            || object instanceof THREE.PointLight
          )
          && object.shadow.map
        ) {
          object.shadow.map.dispose();
        }
      });
    },
  };
}

export function createEnterpriseSceneRig(
  modelRoot: THREE.Group,
  renderer: THREE.WebGLRenderer,
  campusMeshes: THREE.Mesh[],
): EnterpriseSceneRig {
  const group = new THREE.Group();
  group.name = 'Phase 2 Enterprise Scene Composition';
  modelRoot.add(group);

  const pixelRatio = renderer.getPixelRatio();
  const modelDefinitions: Array<{
    role: EnterpriseModelRole;
    assetKey: string;
    size: number;
    position: THREE.Vector3;
    rotationY: number;
  }> = [
    {
      role: 'riverside',
      assetKey: 'riverside_plant',
      size: 118,
      position: new THREE.Vector3(2, 0.3, -124),
      rotationY: Math.PI,
    },
    {
      role: 'machinery',
      assetKey: 'reactor_building',
      size: 28,
      position: new THREE.Vector3(22, 0.95, 4),
      rotationY: -0.08,
    },
    {
      role: 'vehicle',
      assetKey: 'industrial_vehicle',
      size: 14.5,
      position: new THREE.Vector3(-38, 0.95, 45),
      rotationY: Math.PI * 0.58,
    },
    {
      role: 'fusion',
      assetKey: 'fusion_core',
      size: 13.5,
      position: new THREE.Vector3(),
      rotationY: 0,
    },
  ];

  const models = new Map<EnterpriseModelRole, PlacedEnterpriseModel>();
  modelDefinitions.forEach((definition) => {
    const placed = createPlacedModel(
      definition.role,
      definition.assetKey,
      definition.size,
      definition.position,
      definition.rotationY,
      renderer,
    );
    if (placed) models.set(definition.role, placed);
  });

  const reactor = createReactorExperience(models.get('fusion') ?? null, pixelRatio);
  group.add(reactor.group);
  models.delete('fusion');
  const fusionPlaced = modelDefinitions[3];
  const fusionModel = reactor.coreModel
    ? {
        role: 'fusion' as const,
        anchor: reactor.group.getObjectByName('Fusion Core Meshy Hero Anchor') as THREE.Group,
        model: reactor.coreModel,
        meshes: reactor.coreMeshes,
        triangleCount: countTriangles(reactor.coreModel),
      }
    : null;
  if (fusionModel) models.set('fusion', fusionModel);
  void fusionPlaced;

  ['riverside', 'machinery', 'vehicle'].forEach((role) => {
    const placed = models.get(role as EnterpriseModelRole);
    if (placed) group.add(placed.anchor);
  });

  const effects = createEffectsGroup(pixelRatio);
  group.add(effects.group);
  const renderModeController = createTargetedRenderModeController(
    modelRoot,
    renderer,
    campusMeshes,
    models,
  );

  const animatedMeshes = [
    ...reactor.coreMeshes,
    ...(models.get('machinery')?.meshes ?? []),
  ];
  const occluders = campusMeshes.filter((mesh) => {
    const name = mesh.name.toLowerCase();
    return !name.includes('glass') && !name.includes('road mark');
  });
  const teleportSurfaces = campusMeshes.filter((mesh) => {
    const name = mesh.name.toLowerCase();
    return (
      name.includes('pad')
      || name.includes('road')
      || name.includes('floor')
      || name.includes('base')
    );
  });

  let currentZone: ZoneId = 'overview';
  let currentRenderMode: RenderShaderMode = 'pbr';
  let selectedHotspot: Hotspot3D | null = null;
  let presentationFocus: EnterpriseModelRole | null = null;
  let xrActive = false;

  const refreshVisibility = () => {
    const riverside = models.get('riverside');
    const machinery = models.get('machinery');
    const vehicle = models.get('vehicle');
    const fusion = models.get('fusion');
    const renderTargetZone = selectedHotspot?.zone ?? currentZone;
    const revealCoreForRenderMode = (
      currentRenderMode === 'xray'
      || currentRenderMode === 'thermal'
    ) && renderTargetZone === 'core';

    if (riverside) {
      riverside.anchor.visible = presentationFocus === 'riverside'
        || (!xrActive && (currentZone === 'overview' || currentZone === 'coolant'));
    }
    if (machinery) {
      machinery.anchor.visible = presentationFocus === 'machinery'
        || currentZone === 'turbine'
        || currentZone === 'gantry';
    }
    if (vehicle) {
      vehicle.anchor.visible = presentationFocus === 'vehicle'
        || (!xrActive && (currentZone === 'overview' || currentZone === 'gantry'));
    }
    if (fusion) {
      fusion.anchor.visible = presentationFocus === 'fusion'
        || currentZone === 'core'
        || revealCoreForRenderMode;
    }
    reactor.group.visible = fusion?.anchor.visible ?? true;
  };

  refreshVisibility();

  renderer.domElement.dataset.integratedAssets = Array.from(models.keys()).join(',');
  renderer.domElement.dataset.meshyTriangles = String(
    Array.from(models.values()).reduce((total, model) => total + model.triangleCount, 0),
  );

  return {
    group,
    models,
    reactor,
    animatedMeshes,
    occluders,
    teleportSurfaces,
    setZone(zone) {
      currentZone = zone;
      refreshVisibility();
      renderModeController.apply(currentRenderMode, currentZone, selectedHotspot);
    },
    setPresentationFocus(role) {
      presentationFocus = role;
      refreshVisibility();
    },
    setXRActive(active) {
      xrActive = active;
      refreshVisibility();
    },
    setRenderMode(mode, hotspot) {
      currentRenderMode = mode;
      selectedHotspot = hotspot;
      refreshVisibility();
      renderModeController.apply(mode, currentZone, hotspot);
    },
    update(elapsedTime, deltaTime, zone, scramActive) {
      currentZone = zone;
      reactor.update(elapsedTime, deltaTime, scramActive);
      renderModeController.update(elapsedTime);
      effects.emitters.forEach((emitter) => {
        emitter.material.uniforms.uTime.value = elapsedTime * emitter.timeScale;
        emitter.material.uniforms.uPixelRatio.value = renderer.getPixelRatio();
        emitter.material.uniforms.uOpacity.value = emitter.baseOpacity
          * (xrActive ? 0.58 : 1);
      });
      const waterShader = effects.waterMaterial.userData.phase2Shader as
        | { uniforms: { uPhase2Time: { value: number } } }
        | undefined;
      if (waterShader) waterShader.uniforms.uPhase2Time.value = elapsedTime;
    },
    dispose() {
      renderModeController.dispose();
      modelRoot.remove(group);
      models.forEach((model) => assetManager.disposeModelInstance(model.model));
      disposeOwnedResources(group);
    },
  };
}

function setPassEnabledForTier(
  ssaoPass: SSAOPass | null,
  antialiasPass: SMAAPass | FXAAPass,
  tier: SceneQualityTier,
): void {
  if (ssaoPass) ssaoPass.enabled = tier === 'high';
  antialiasPass.enabled = tier !== 'xr';
}

export function createCinematicPostProcessing(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.PerspectiveCamera,
  width: number,
  height: number,
  initialTier: SceneQualityTier,
): CinematicPostProcessing {
  const composer = new EffectComposer(renderer);
  composer.setPixelRatio(renderer.getPixelRatio());
  composer.setSize(width, height);

  const renderPass = new RenderPass(scene, camera);
  composer.addPass(renderPass);

  let ssaoPass: SSAOPass | null = null;
  if (renderer.capabilities.isWebGL2) {
    ssaoPass = new SSAOPass(scene, camera, width, height);
    // Tuned for industrial scale - subtle contact shadows
    ssaoPass.kernelRadius = 9;
    ssaoPass.minDistance = 0.0015;
    ssaoPass.maxDistance = 0.065;
    composer.addPass(ssaoPass);
  }

  // Bloom tuned for industrial emissive surfaces - subtle but present
  const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(width, height),
    0.22,
    0.28,
    0.96,
  );
  composer.addPass(bloomPass);

  const gradePass = new ShaderPass(GRADE_SHADER);
  composer.addPass(gradePass);

  const antialiasPass: SMAAPass | FXAAPass = initialTier === 'high'
    ? new SMAAPass()
    : new FXAAPass();
  composer.addPass(antialiasPass);
  composer.addPass(new OutputPass());
  setPassEnabledForTier(ssaoPass, antialiasPass, initialTier);

  let xrActive = false;
  let qualityTier = initialTier;

  return {
    composer,
    ssaoPass,
    bloomPass,
    get qualityTier() {
      return qualityTier;
    },
    render(deltaTime) {
      if (!xrActive) composer.render(deltaTime);
    },
    setSize(nextWidth, nextHeight, pixelRatio) {
      composer.setPixelRatio(pixelRatio);
      composer.setSize(nextWidth, nextHeight);
      ssaoPass?.setSize(nextWidth, nextHeight);
    },
    setXRActive(active) {
      xrActive = active;
    },
    setQualityTier(tier) {
      qualityTier = tier;
      setPassEnabledForTier(ssaoPass, antialiasPass, tier);
      bloomPass.strength = tier === 'high' ? 0.22 : tier === 'balanced' ? 0.15 : 0;
    },
    dispose() {
      composer.dispose();
    },
  };
}

export function detectSceneQualityTier(width: number): SceneQualityTier {
  const deviceMemory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (width < 900 || deviceMemory <= 4 || reducedMotion) return 'balanced';
  return 'high';
}
