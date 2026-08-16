import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { ZoneId, RenderShaderMode, Hotspot3D, RadiationVisualizationMode } from '../types/nuclear';
import { WalkthroughChamber } from '../scene/ProceduralNuclearPlant';
import { HOTSPOTS_DATA } from '../data/nuclearData';
import {
  createInteriorFlowSystem,
  InteriorFlowSystem,
  updateInteriorFlowSystem,
} from '../scene/InteriorFlowSystem';
import { WebXRManager, createWebXRManager } from '../xr/WebXRManager';
import { assetManager } from '../assets/AssetManager';
import {
  CinematicNavigationSystem,
  DesktopNavigationMode,
  ENTERPRISE_CAMERA_PRESETS,
  LocalCameraPreset,
} from '../scene/CinematicNavigationSystem';
import {
  CinematicPostProcessing,
  createCinematicPostProcessing,
  createEnterpriseLighting,
  createEnterpriseSceneRig,
  createIndustrialEnvironment,
  detectSceneQualityTier,
  EnterpriseLightingRig,
  EnterpriseSceneRig,
  IndustrialEnvironment,
  configureCampusMaterials,
} from '../scene/EnterpriseSceneSystems';
import {
  createSpatialHotspotManager,
  SpatialHotspotManager,
} from '../scene/SpatialHotspotManager';
import { Scene1AssetHandles, configureScene1Materials } from '../scene/Scene1Composition';
import { LoadProgress } from '../assets/AssetManager';

interface ThreeNuclearSceneProps {
  currentZone: ZoneId;
  onChangeZone: (zone: ZoneId) => void;
  renderMode: RenderShaderMode;
  onChangeRenderMode: (mode: RenderShaderMode) => void;
  navigationMode: DesktopNavigationMode;
  presentationRunId: number;
  controlRodDepthPct: number;
  turbineRpm: number;
  scramActive: boolean;
  onSelectHotspot: (hotspot: Hotspot3D) => void;
  selectedHotspotId: string | null;
  onHotspotScreenPositionsUpdate: (positions: {
    id: string;
    x: number;
    y: number;
    visible: boolean;
    label: string;
    code: string;
    category: string;
  }[]) => void;
  onXRSessionStart?: () => void;
  onXRSessionEnd?: () => void;
  onPresentationHotspot?: (hotspotId: string | null) => void;
  onRendererReady?: (renderer: THREE.WebGLRenderer | null) => void;
  onSceneReady?: (scene: THREE.Scene | null) => void;
  onCameraReady?: (camera: THREE.PerspectiveCamera | null) => void;
  onControlsReady?: (controls: OrbitControls | null) => void;
  onNavigationReady?: (navigation: CinematicNavigationSystem | null) => void;
  onEnterpriseRigReady?: (rig: EnterpriseSceneRig | null) => void;
  onHotspotManagerReady?: (manager: SpatialHotspotManager | null) => void;
  radiationMode?: RadiationVisualizationMode;
  scene1Assets?: Scene1AssetHandles | null;
  scene1Loading?: boolean;
  scene1LoadError?: string | null;
  scene1Progress?: LoadProgress | null;
  scene1VisibleGroups?: string[];
}

type LoadState = 'initializing' | 'loading' | 'ready' | 'error';

const NUCLEAR_PLANT_MODEL_URL = '/models/nuclear_plant.glb';
const NORMALIZED_MODEL_SIZE = 158;
const INITIAL_CAMERA_POSITION = new THREE.Vector3(178, 126, 220);
const INITIAL_CAMERA_TARGET = new THREE.Vector3(5, 20, -26);
const RECOVERY_CAMERA_POSITION = INITIAL_CAMERA_POSITION;
const RECOVERY_CONTROLS_TARGET = INITIAL_CAMERA_TARGET;

function disposeObject(root: THREE.Object3D): void {
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  const textures = new Set<THREE.Texture>();

  root.traverse((object) => {
    const renderable = object as THREE.Object3D & {
      geometry?: THREE.BufferGeometry;
      material?: THREE.Material | THREE.Material[];
    };
    if (renderable.geometry) geometries.add(renderable.geometry);
    if (!renderable.material) return;

    const objectMaterials = Array.isArray(renderable.material)
      ? renderable.material
      : [renderable.material];
    objectMaterials.forEach((material) => {
      materials.add(material);
      Object.values(material).forEach((value) => {
        if (value instanceof THREE.Texture) textures.add(value);
      });
    });
  });

  geometries.forEach((geometry) => geometry.dispose());
  textures.forEach((texture) => texture.dispose());
  materials.forEach((material) => material.dispose());
}

function setWalkthroughLighting(
  scene: THREE.Scene | null,
  chamber: WalkthroughChamber | null,
): void {
  scene?.traverse((object) => {
    if (object instanceof THREE.PointLight) {
      const name = object.name.toLowerCase();
      if (name.includes('reactor') || name.includes('core')) {
        object.intensity = chamber === 'reactor' ? 10 : 7.5;
      } else if (name.includes('turbine') || name.includes('energy')) {
        object.intensity = chamber === 'turbine' ? 8.5 : 5.5;
      }
    }
  });
}

function normalizeMeshName(name: string): string {
  return name.toLowerCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
}

const INTERIOR_MESH_NAMES = [
  'reactor core',
  'control rod',
  'fuel assembly',
  'pressure vessel',
  'coolant',
  'manifold',
  'process pipe',
  'water header',
  'water intake',
  'steam pipe',
  'turbine rotor',
  'turbine blade',
  'generator',
  'shaft',
  'stage ring',
  'casing',
  'pedestal',
  'bearing',
];

function isInteriorMesh(mesh: THREE.Mesh): boolean {
  if (mesh.userData.isProceduralInterior) return true;

  const name = normalizeMeshName(mesh.name);
  if (name.includes('pipe bridge support') || name.includes('pipe rack support')) {
    return false;
  }
  if (name.includes('pump house')) return false;
  return INTERIOR_MESH_NAMES.some((interior) => name.includes(interior));
}

function findMeshByNamePattern(
  root: THREE.Object3D | null,
  patterns: string[],
): THREE.Mesh[] {
  const results: THREE.Mesh[] = [];
  if (!root) return results;
  root.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (!(mesh instanceof THREE.Mesh)) return;
    const name = mesh.name.toLowerCase();
    if (patterns.some((p) => name.includes(p.toLowerCase()))) {
      results.push(mesh);
    }
  });
  return results;
}

function findFirstMeshByNamePattern(
  root: THREE.Object3D,
  patterns: string[],
): THREE.Mesh | null {
  const meshes = findMeshByNamePattern(root, patterns);
  return meshes[0] ?? null;
}

interface ModelFitDiagnostics {
  meshCount: number;
  originalBox: THREE.Box3;
  originalCenter: THREE.Vector3;
  originalSize: THREE.Vector3;
  normalizedBox: THREE.Box3;
  appliedScale: number;
  frustumAdjusted: boolean;
}

function computeMeshWorldBounds(
  root: THREE.Object3D,
): { box: THREE.Box3; meshCount: number } | null {
  const box = new THREE.Box3();
  const meshBox = new THREE.Box3();
  let meshCount = 0;

  root.updateMatrixWorld(true);
  root.traverse((child) => {
    child.visible = true;

    const mesh = child as THREE.Mesh;
    if (!mesh.isMesh || !mesh.geometry) return;

    mesh.visible = true;
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    const positionAttribute = mesh.geometry.getAttribute('position');
    if (!positionAttribute || positionAttribute.count === 0) return;

    if (!mesh.geometry.boundingBox) {
      mesh.geometry.computeBoundingBox();
    }
    if (!mesh.geometry.boundingBox || mesh.geometry.boundingBox.isEmpty()) return;

    meshBox.copy(mesh.geometry.boundingBox).applyMatrix4(mesh.matrixWorld);
    box.union(meshBox);
    meshCount += 1;
  });

  if (meshCount === 0 || box.isEmpty()) return null;
  return { box, meshCount };
}

function isBoxInsideCameraFrustum(
  box: THREE.Box3,
  camera: THREE.PerspectiveCamera,
): boolean {
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld(true);

  const projectionViewMatrix = new THREE.Matrix4().multiplyMatrices(
    camera.projectionMatrix,
    camera.matrixWorldInverse,
  );
  const frustum = new THREE.Frustum().setFromProjectionMatrix(projectionViewMatrix);
  const { min, max } = box;
  const corners = [
    new THREE.Vector3(min.x, min.y, min.z),
    new THREE.Vector3(min.x, min.y, max.z),
    new THREE.Vector3(min.x, max.y, min.z),
    new THREE.Vector3(min.x, max.y, max.z),
    new THREE.Vector3(max.x, min.y, min.z),
    new THREE.Vector3(max.x, min.y, max.z),
    new THREE.Vector3(max.x, max.y, min.z),
    new THREE.Vector3(max.x, max.y, max.z),
  ];

  return corners.every((corner) => frustum.containsPoint(corner));
}

function recoverCameraFrustum(
  box: THREE.Box3,
  camera: THREE.PerspectiveCamera,
  controls: OrbitControls,
): boolean {
  if (isBoxInsideCameraFrustum(box, camera)) return false;

  const sphere = box.getBoundingSphere(new THREE.Sphere());
  const verticalHalfFov = THREE.MathUtils.degToRad(camera.fov * 0.5);
  const horizontalHalfFov = Math.atan(Math.tan(verticalHalfFov) * camera.aspect);
  const limitingHalfFov = Math.max(
    Math.min(verticalHalfFov, horizontalHalfFov),
    THREE.MathUtils.degToRad(5),
  );
  const targetOffset = sphere.center.distanceTo(controls.target);
  const safeRadius = sphere.radius + targetOffset;
  let safeDistance = (safeRadius / Math.sin(limitingHalfFov)) * 1.12;
  const viewDirection = new THREE.Vector3()
    .subVectors(camera.position, controls.target);
  if (viewDirection.lengthSq() <= Number.EPSILON) {
    viewDirection.copy(RECOVERY_CAMERA_POSITION).sub(RECOVERY_CONTROLS_TARGET);
  }
  viewDirection.normalize();

  for (let attempt = 0; attempt < 12; attempt += 1) {
    controls.maxDistance = Math.max(controls.maxDistance, safeDistance * 1.1);
    camera.position.copy(controls.target).addScaledVector(viewDirection, safeDistance);
    camera.far = Math.max(1000, safeDistance + sphere.radius * 2);
    camera.lookAt(controls.target);
    camera.updateProjectionMatrix();
    controls.update();
    if (isBoxInsideCameraFrustum(box, camera)) return true;
    safeDistance *= 1.25;
  }

  return true;
}

function centerScaleAndFrameObject(
  loadedObject: THREE.Object3D,
  camera: THREE.PerspectiveCamera,
  controls: OrbitControls,
  sourceLabel: string,
): ModelFitDiagnostics | null {
  loadedObject.position.set(0, 0, 0);
  loadedObject.scale.set(1, 1, 1);
  loadedObject.updateMatrixWorld(true);

  const originalBounds = computeMeshWorldBounds(loadedObject);
  if (!originalBounds) {
    console.warn('No valid meshes detected. Rendering fallback reactor.');
    return null;
  }

  const { box, meshCount } = originalBounds;
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z);

  if (!Number.isFinite(maxDim) || maxDim <= Number.EPSILON) {
    console.warn('No valid meshes detected. Rendering fallback reactor.');
    return null;
  }

  const appliedScale = NORMALIZED_MODEL_SIZE / maxDim;
  loadedObject.scale.set(appliedScale, appliedScale, appliedScale);
  loadedObject.position.set(
    -center.x * appliedScale,
    -box.min.y * appliedScale,
    -center.z * appliedScale,
  );
  loadedObject.updateMatrixWorld(true);

  const normalizedBounds = computeMeshWorldBounds(loadedObject);
  if (!normalizedBounds) {
    console.warn('No valid meshes detected. Rendering fallback reactor.');
    return null;
  }
  const normalizedBox = normalizedBounds.box;
  camera.near = 0.1;
  camera.far = 1000;
  camera.position.copy(RECOVERY_CAMERA_POSITION);
  camera.lookAt(RECOVERY_CONTROLS_TARGET);
  camera.updateProjectionMatrix();
  controls.target.copy(RECOVERY_CONTROLS_TARGET);
  controls.update();

  const frustumAdjusted = recoverCameraFrustum(normalizedBox, camera, controls);

  console.info(sourceLabel);
  console.info('Mesh Count', meshCount);
  console.info('Bounding Box', {
    min: box.min.toArray(),
    max: box.max.toArray(),
  });
  console.info('Center', center.toArray());
  console.info('Size', size.toArray());
  console.info('Applied Scale', appliedScale);
  console.info('Camera Position', camera.position.toArray());
  console.info('Controls Target', controls.target.toArray());

  return {
    meshCount,
    originalBox: box.clone(),
    originalCenter: center.clone(),
    originalSize: size.clone(),
    normalizedBox,
    appliedScale,
    frustumAdjusted,
  };
}

function transformCameraPreset(
  preset: LocalCameraPreset,
  loadedObject: THREE.Object3D | null,
): LocalCameraPreset {
  if (!loadedObject) return preset;
  loadedObject.updateMatrixWorld(true);
  return {
    position: preset.position.clone().applyMatrix4(loadedObject.matrixWorld),
    target: preset.target.clone().applyMatrix4(loadedObject.matrixWorld),
    fov: preset.fov,
  };
}

function createFallbackProceduralScene(
  scene: THREE.Scene,
  reactorCoreMeshesRef: React.MutableRefObject<THREE.Mesh[]>,
  turbineMachineryMeshesRef: React.MutableRefObject<THREE.Mesh[]>,
  reactorDomeMeshRef: React.MutableRefObject<THREE.Mesh | null>,
  turbineHallMeshRef: React.MutableRefObject<THREE.Mesh | null>,
): THREE.Group {
  const group = new THREE.Group();
  group.name = 'Fallback Procedural Nuclear Plant';
  scene.add(group);

  // Distinct materials for material contrast
  const concreteMaterial = new THREE.MeshStandardMaterial({
    name: 'Concrete - Rough Matte',
    color: 0x9aa3ac,
    metalness: 0.02,
    roughness: 0.92,
    envMapIntensity: 0.8,
  });
  const roofMaterial = new THREE.MeshStandardMaterial({
    name: 'Roof Metal - Standing Seam',
    color: 0x5a6a75,
    metalness: 0.82,
    roughness: 0.28,
    envMapIntensity: 1.15,
  });
  const coolingTowerMaterial = new THREE.MeshStandardMaterial({
    name: 'Cooling Tower - Weathered Concrete',
    color: 0x8d969f,
    metalness: 0.05,
    roughness: 0.88,
    envMapIntensity: 0.7,
  });
  const chimneyMaterial = new THREE.MeshStandardMaterial({
    name: 'Chimney - Reinforced Concrete',
    color: 0x7a8288,
    metalness: 0.03,
    roughness: 0.9,
    envMapIntensity: 0.75,
  });
  const pipeMaterial = new THREE.MeshStandardMaterial({
    name: 'Process Pipe - Carbon Steel',
    color: 0x6a7a85,
    metalness: 0.8,
    roughness: 0.3,
    envMapIntensity: 1.15,
  });

  const basePlatform = new THREE.Mesh(
    new THREE.BoxGeometry(78, 1.2, 64),
    concreteMaterial,
  );
  basePlatform.name = 'Fallback Nuclear Plant Base Platform';
  basePlatform.position.set(3, 0.6, 4);
  basePlatform.castShadow = true;
  basePlatform.receiveShadow = true;
  group.add(basePlatform);

  const reactorContainment = new THREE.Group();
  reactorContainment.name = 'Reactor_Containment';
  reactorContainment.position.set(-10, 0, 0);
  group.add(reactorContainment);

  const domeMesh = new THREE.Mesh(new THREE.SphereGeometry(18, 64, 28, 0, Math.PI * 2, 0, Math.PI / 2), concreteMaterial);
  domeMesh.name = 'Reactor Containment Concrete Dome';
  domeMesh.position.set(0, 26.7, 0);
  domeMesh.castShadow = true;
  domeMesh.receiveShadow = true;
  domeMesh.userData.walkthroughChamber = 'reactor' as WalkthroughChamber;
  reactorContainment.add(domeMesh);
  reactorDomeMeshRef.current = domeMesh;

  const wallMesh = new THREE.Mesh(new THREE.CylinderGeometry(18, 18.6, 25, 64), concreteMaterial);
  wallMesh.name = 'Reactor Containment Reinforced Concrete Wall';
  wallMesh.position.set(0, 14.2, 0);
  wallMesh.castShadow = true;
  wallMesh.receiveShadow = true;
  reactorContainment.add(wallMesh);

  const turbineHall = new THREE.Group();
  turbineHall.name = 'Turbine_Hall';
  turbineHall.position.set(25, 0, 29);
  group.add(turbineHall);

  const hallMesh = new THREE.Mesh(new THREE.BoxGeometry(66, 19.5, 26), concreteMaterial);
  hallMesh.name = 'Turbine Hall Main Volume';
  hallMesh.position.set(0, 11.8, 0);
  hallMesh.castShadow = true;
  hallMesh.receiveShadow = true;
  hallMesh.userData.walkthroughChamber = 'turbine' as WalkthroughChamber;
  turbineHall.add(hallMesh);
  turbineHallMeshRef.current = hallMesh;

  const roofMesh = new THREE.Mesh(new THREE.BoxGeometry(68, 2, 28), roofMaterial);
  roofMesh.name = 'Turbine Hall Metal Roof';
  roofMesh.position.set(0, 22.5, 0);
  roofMesh.castShadow = true;
  roofMesh.receiveShadow = true;
  turbineHall.add(roofMesh);

  const interiorReactor = new THREE.Group();
  interiorReactor.name = 'Reactor Interior Machinery';
  interiorReactor.position.set(-10, 0, 0);
  group.add(interiorReactor);

  const coreOuter = new THREE.Mesh(new THREE.CylinderGeometry(4.8, 5.4, 13.2, 48), new THREE.MeshStandardMaterial({
    color: 0x0d6b7a, emissive: 0x00d9ff, emissiveIntensity: 1.25, metalness: 0.38, roughness: 0.22
  }));
  coreOuter.name = 'Reactor Core Outer Layer';
  coreOuter.position.set(0, 12.8, 0);
  coreOuter.castShadow = true;
  coreOuter.receiveShadow = true;
  interiorReactor.add(coreOuter);
  reactorCoreMeshesRef.current.push(coreOuter);

  const coreCenter = new THREE.Mesh(new THREE.CylinderGeometry(2.15, 2.5, 15.6, 40), new THREE.MeshStandardMaterial({
    color: 0xbffaff, emissive: 0x2feaff, emissiveIntensity: 2.8, metalness: 0.08, roughness: 0.16
  }));
  coreCenter.name = 'Reactor Core Bright Center';
  coreCenter.position.set(0, 13.2, 0);
  coreCenter.castShadow = true;
  coreCenter.receiveShadow = true;
  interiorReactor.add(coreCenter);
  reactorCoreMeshesRef.current.push(coreCenter);

  const controlRodMat = new THREE.MeshStandardMaterial({
    color: 0x77efff, emissive: 0x26dfff, emissiveIntensity: 1.7, metalness: 0.55, roughness: 0.2
  });
  for (let i = 0; i < 20; i++) {
    const angle = (i / 20) * Math.PI * 2;
    const rod = new THREE.Mesh(new THREE.BoxGeometry(0.3, 15.5, 0.3), controlRodMat);
    rod.name = `Control Rod ${i + 1}`;
    rod.position.set(Math.cos(angle) * 4.55, 17, Math.sin(angle) * 4.55);
    rod.castShadow = true;
    rod.receiveShadow = true;
    interiorReactor.add(rod);
    reactorCoreMeshesRef.current.push(rod);
  }

  const interiorTurbine = new THREE.Group();
  interiorTurbine.name = 'Turbine Interior Machinery';
  interiorTurbine.position.set(25, 0, 29);
  group.add(interiorTurbine);

  const rotorGroup = new THREE.Group();
  rotorGroup.name = 'Turbine Rotor';
  rotorGroup.position.set(0, 10.2, 0);
  interiorTurbine.add(rotorGroup);

  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 59, 24), new THREE.MeshStandardMaterial({
    color: 0x9cb3ba, emissive: 0xff7b26, emissiveIntensity: 0.78, metalness: 0.92, roughness: 0.2
  }));
  shaft.name = 'Turbine Main Shaft';
  shaft.rotation.z = Math.PI / 2;
  shaft.castShadow = true;
  shaft.receiveShadow = true;
  rotorGroup.add(shaft);
  turbineMachineryMeshesRef.current.push(shaft);

  for (let i = 0; i < 10; i++) {
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.16, 2.8, 0.38), new THREE.MeshStandardMaterial({
      color: 0x9cb3ba, emissive: 0xff7b26, emissiveIntensity: 0.78, metalness: 0.92, roughness: 0.2
    }));
    blade.name = `Turbine Blade ${i + 1}`;
    blade.position.set(i * 6 - 25, 0, 0);
    blade.rotation.z = Math.PI / 2;
    blade.castShadow = true;
    blade.receiveShadow = true;
    rotorGroup.add(blade);
    turbineMachineryMeshesRef.current.push(blade);
  }

  const generator = new THREE.Mesh(new THREE.CylinderGeometry(4.8, 4.8, 16, 48), new THREE.MeshStandardMaterial({
    color: 0x63717b, metalness: 0.86, roughness: 0.28
  }));
  generator.name = 'Main Electrical Generator';
  generator.position.set(23, 10.2, 0);
  generator.rotation.z = Math.PI / 2;
  generator.castShadow = true;
  generator.receiveShadow = true;
  interiorTurbine.add(generator);
  turbineMachineryMeshesRef.current.push(generator);

  const coreLight = new THREE.PointLight(0x2fe8ff, 7.5, 38, 1.65);
  coreLight.name = 'Reactor Core Cyan Light';
  coreLight.position.set(0, 13, 0);
  interiorReactor.add(coreLight);

  const energyLight = new THREE.PointLight(0xff8d3d, 5.5, 34, 1.7);
  energyLight.name = 'Turbine Hall Energy Light';
  energyLight.position.set(4, 11, 0);
  interiorTurbine.add(energyLight);

  const coolingTowerProfile = [
    new THREE.Vector2(8.5, 0),
    new THREE.Vector2(7.2, 6),
    new THREE.Vector2(5.1, 18),
    new THREE.Vector2(4.7, 24),
    new THREE.Vector2(6.5, 34),
  ];
  [
    new THREE.Vector3(-28, 1.2, -22),
    new THREE.Vector3(28, 1.2, -22),
  ].forEach((position, index) => {
    const coolingTower = new THREE.Mesh(
      new THREE.LatheGeometry(coolingTowerProfile, 36),
      coolingTowerMaterial,
    );
    coolingTower.name = `Fallback Cooling Tower ${index + 1}`;
    coolingTower.position.copy(position);
    coolingTower.castShadow = true;
    coolingTower.receiveShadow = true;
    group.add(coolingTower);
  });

  const chimney = new THREE.Mesh(
    new THREE.CylinderGeometry(1.45, 2.1, 30, 24),
    chimneyMaterial,
  );
  chimney.name = 'Fallback Reactor Chimney';
  chimney.position.set(-31, 16.2, 10);
  chimney.castShadow = true;
  chimney.receiveShadow = true;
  group.add(chimney);

  [
    { position: new THREE.Vector3(7, 5.2, 12), length: 34 },
    { position: new THREE.Vector3(5, 8.2, 15), length: 30 },
  ].forEach(({ position, length }, index) => {
    const pipe = new THREE.Mesh(
      new THREE.CylinderGeometry(0.72, 0.72, length, 20),
      pipeMaterial,
    );
    pipe.name = `Fallback Process Pipe ${index + 1}`;
    pipe.position.copy(position);
    pipe.rotation.z = Math.PI / 2;
    pipe.castShadow = true;
    pipe.receiveShadow = true;
    group.add(pipe);
  });

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(620, 620),
    new THREE.MeshStandardMaterial({ color: 0x1a2332, roughness: 0.98, metalness: 0 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.18;
  ground.name = 'Fallback Campus Ground';
  ground.receiveShadow = true;
  scene.add(ground);
  group.userData.fallbackGround = ground;

  return group;
}

const SCENE1_ZONES: ZoneId[] = ['smr', 'facilities', 'city', 'sea'];

export const ThreeNuclearScene: React.FC<ThreeNuclearSceneProps> = ({
  currentZone,
  onChangeZone,
  renderMode,
  onChangeRenderMode,
  navigationMode,
  presentationRunId,
  controlRodDepthPct,
  turbineRpm,
  scramActive,
  onSelectHotspot,
  selectedHotspotId,
  onHotspotScreenPositionsUpdate,
  onXRSessionStart,
  onXRSessionEnd,
  onPresentationHotspot,
  onRendererReady,
  onSceneReady,
  onCameraReady,
  onControlsReady,
  onNavigationReady,
  onEnterpriseRigReady,
  onHotspotManagerReady,
  radiationMode: _radiationMode,
  scene1Assets,
  scene1Loading,
  scene1LoadError,
  scene1Progress,
  scene1VisibleGroups,
}) => {
  const canvasHostRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const gltfSceneRef = useRef<THREE.Group | null>(null);
  const baseModelInstanceRef = useRef<THREE.Group | null>(null);
  const flowSystemRef = useRef<InteriorFlowSystem | null>(null);
  const xrManagerRef = useRef<WebXRManager | null>(null);
  const navigationSystemRef = useRef<CinematicNavigationSystem | null>(null);
  const enterpriseRigRef = useRef<EnterpriseSceneRig | null>(null);
  const environmentRef = useRef<IndustrialEnvironment | null>(null);
  const lightingRef = useRef<EnterpriseLightingRig | null>(null);
  const postProcessingRef = useRef<CinematicPostProcessing | null>(null);
  const hotspotManagerRef = useRef<SpatialHotspotManager | null>(null);
  const navigationFromSceneRef = useRef<ZoneId | null>(null);
  const currentZoneRef = useRef(currentZone);
  const renderModeRef = useRef(renderMode);
  const controlRodDepthRef = useRef(controlRodDepthPct);
  const turbineRpmRef = useRef(turbineRpm);
  const scramActiveRef = useRef(scramActive);
  const onChangeZoneRef = useRef(onChangeZone);
  const onChangeRenderModeRef = useRef(onChangeRenderMode);
  const onSelectHotspotRef = useRef(onSelectHotspot);
  const hotspotUpdateCallbackRef = useRef(onHotspotScreenPositionsUpdate);
  const presentationHotspotRef = useRef(onPresentationHotspot);
  const xrStartCallbackRef = useRef(onXRSessionStart);
  const xrEndCallbackRef = useRef(onXRSessionEnd);
  const isXRayRef = useRef(renderMode === 'xray');
  const activeChamberRef = useRef<WalkthroughChamber | null>(null);

  // Scene 1 refs
  const scene1GroupsRef = useRef<THREE.Group[]>([]);
  const scene1DisposedRef = useRef(false);
  const scene1GroundRef = useRef<THREE.Mesh | null>(null);

  const [loadState, setLoadState] = useState<LoadState>('initializing');
  const [loadErrorMessage, setLoadErrorMessage] = useState<string | null>(null);
  const [activeChamber, setActiveChamber] = useState<WalkthroughChamber | null>(null);
  const [isXRPresenting, setIsXRPresenting] = useState(false);
  const [isXRSupported, setIsXRSupported] = useState(false);
  const [xrSupportChecked, setXRSupportChecked] = useState(false);

  const reactorCoreMeshesRef = useRef<THREE.Mesh[]>([]);
  const turbineMachineryMeshesRef = useRef<THREE.Mesh[]>([]);
  const reactorDomeMeshRef = useRef<THREE.Mesh | null>(null);
  const turbineHallMeshRef = useRef<THREE.Mesh | null>(null);
  const controlRodMeshesRef = useRef<THREE.Mesh[]>([]);
  const turbineRotorMeshesRef = useRef<THREE.Mesh[]>([]);

  currentZoneRef.current = currentZone;
  renderModeRef.current = renderMode;
  controlRodDepthRef.current = controlRodDepthPct;
  turbineRpmRef.current = turbineRpm;
  scramActiveRef.current = scramActive;
  onChangeZoneRef.current = onChangeZone;
  onChangeRenderModeRef.current = onChangeRenderMode;
  onSelectHotspotRef.current = onSelectHotspot;
  hotspotUpdateCallbackRef.current = onHotspotScreenPositionsUpdate;
  presentationHotspotRef.current = onPresentationHotspot;
  xrStartCallbackRef.current = onXRSessionStart;
  xrEndCallbackRef.current = onXRSessionEnd;
  isXRayRef.current = renderMode === 'xray';
  activeChamberRef.current = activeChamber;

  const enterWalkthrough = useCallback(
    (chamber: WalkthroughChamber) => {
      const controls = controlsRef.current;
      const navigation = navigationSystemRef.current;
      if (!controls || !navigation) return;

      setActiveChamber(chamber);
      controls.minDistance = 2.5;
      controls.maxDistance = chamber === 'reactor' ? 34 : 72;
      controls.maxPolarAngle = Math.PI * 0.8;
      setWalkthroughLighting(sceneRef.current!, chamber);
      navigation.transitionToWalkthrough(chamber);

      const zone: ZoneId = chamber === 'reactor' ? 'core' : 'turbine';
      if (currentZoneRef.current !== zone) {
        navigationFromSceneRef.current = zone;
        onChangeZoneRef.current(zone);
      }
    },
    [],
  );

  useEffect(() => {
    if (navigationFromSceneRef.current === currentZone) {
      navigationFromSceneRef.current = null;
      enterpriseRigRef.current?.setZone(currentZone);
      return;
    }
    navigationFromSceneRef.current = null;
    setActiveChamber(null);

    const controls = controlsRef.current;
    if (controls) {
      controls.minDistance = 8;
      controls.maxDistance = 360;
      controls.maxPolarAngle = Math.PI * 0.49;
    }

    enterpriseRigRef.current?.setZone(currentZone);
    navigationSystemRef.current?.transitionToZone(currentZone);
  }, [currentZone]);

  useEffect(() => {
    const hotspot = selectedHotspotId
      ? HOTSPOTS_DATA.find((candidate) => candidate.id === selectedHotspotId) ?? null
      : null;
    enterpriseRigRef.current?.setRenderMode(renderMode, hotspot);
  }, [renderMode, selectedHotspotId]);

  useEffect(() => {
    navigationSystemRef.current?.setMode(navigationMode);
  }, [navigationMode]);

  useEffect(() => {
    if (presentationRunId <= 0 || loadState !== 'ready') return;
    navigationSystemRef.current?.startPresentation();
  }, [presentationRunId, loadState]);

  useEffect(() => {
    hotspotManagerRef.current?.updateHotspotSelection(selectedHotspotId);
  }, [selectedHotspotId]);

  // Scene 1 asset mounting - add/remove Scene 1 groups based on cinematic scene visibility
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    const visibleGroups = scene1VisibleGroups ?? [];

    if (scene1Assets) {
      (['smr', 'city', 'facilities'] as const).forEach(key => {
        const group = scene1Assets[key];
        if (group) {
          let meshCount = 0;
          group.traverse((c: THREE.Object3D) => { if (c instanceof THREE.Mesh) meshCount++; });
          console.info(`[SCENE1-DIAG] Group "${key}": meshes=${meshCount}, children=${group.children.length}`);
        } else {
          console.warn(`[SCENE1-DIAG] Group "${key}" is UNDEFINED in scene1Assets`);
        }
      });
    }

    if (!scene1Assets || scene1DisposedRef.current) return;
    if (visibleGroups.length === 0) return;

    const groupMap: Record<string, THREE.Group> = {
      smr: scene1Assets.smr,
      city: scene1Assets.city,
      facilities: scene1Assets.facilities,
    };

    // Case-insensitive group name matching - group names may be
    // 'SMR_Campus' / 'Bangkok_City' / 'Green_Facilities' but
    // visibleGroups uses lowercase 'smr' / 'city' / 'facilities'.
    const groupMatchesVisible = (group: THREE.Group, targetGroup: string): boolean => {
      const name = group.name.toLowerCase();
      return name.includes(targetGroup.toLowerCase());
    };

    const groupMatchesAnyVisible = (group: THREE.Group, groups: string[]): boolean => {
      return groups.some(g => groupMatchesVisible(group, g));
    };

    // Remove groups that are no longer visible
    scene1GroupsRef.current.forEach((group) => {
      if (!groupMatchesAnyVisible(group, visibleGroups)) {
        scene.remove(group);
      }
    });
    scene1GroupsRef.current = scene1GroupsRef.current.filter((group) =>
      groupMatchesAnyVisible(group, visibleGroups)
    );

    // Add visible groups that are not yet in the scene
    visibleGroups.forEach((groupName: string) => {
      const group = groupMap[groupName];
      if (group && !scene1GroupsRef.current.some((g) => groupMatchesVisible(g, groupName))) {
        scene.add(group);
        scene1GroupsRef.current.push(group);
        console.info(`[SCENE1-DIAG] Mounted group "${groupName}" into scene`);
      }
    });

    // Add Scene 1 ground plane if not present
    if (!scene1GroundRef.current && scene1GroupsRef.current.length > 0) {
      const groundSize = 1200;
      const groundGeo = new THREE.PlaneGeometry(groundSize, groundSize);
      const groundMat = new THREE.MeshStandardMaterial({
        color: 0x1a2a1e,
        roughness: 0.95,
        metalness: 0.0,
        envMapIntensity: 0.3,
      });
      const ground = new THREE.Mesh(groundGeo, groundMat);
      ground.rotation.x = -Math.PI / 2;
      ground.position.y = -0.1;
      ground.name = 'Scene1 Ground Plane';
      ground.receiveShadow = true;
      scene.add(ground);
      scene1GroundRef.current = ground;
    }

    if (scene1GroupsRef.current.length > 0) {
      let totalMeshes = 0;
      scene1GroupsRef.current.forEach(g => {
        g.traverse(c => { if (c instanceof THREE.Mesh) totalMeshes++; });
      });
      console.info(`[SCENE1-DIAG] Post-mount: ${scene1GroupsRef.current.length} groups, ${totalMeshes} total meshes in scene`);

      // Normalize materials on Scene 1 assets to prevent shader compilation failures
      scene1GroupsRef.current.forEach(group => {
        configureScene1Materials(group, rendererRef.current!);
      });

      // Pre-compile shaders for newly mounted Scene 1 geometry
      try {
        rendererRef.current?.compile(sceneRef.current!, cameraRef.current!);
      } catch (error) {
        console.warn('[SCENE1-DIAG] Shader pre-compile after mount failed; continuing.', error);
      }
    }
  }, [scene1VisibleGroups, scene1Assets]);

  useEffect(() => {
    const host = canvasHostRef.current;
    if (!host) return;

    let disposed = false;
    let lastFlowDiagnosticUpdate = 0;
    let lastScreenPosUpdate = 0;
    let lastPerformanceUpdate = 0;
    let frameTimeAccumulator = 0;
    let frameSampleCount = 0;
    let previousFrameTime = 0;
    let introTimer: number | null = null;
    let fallbackScene: THREE.Group | null = null;

    let renderer: THREE.WebGLRenderer | null = null;
    let controls: OrbitControls | null = null;
    let scene: THREE.Scene | null = null;
    let camera: THREE.PerspectiveCamera | null = null;
    let resizeObserver: ResizeObserver | null = null;
    let qualityTier = detectSceneQualityTier(Math.max(host.clientWidth, 1));

    // Reusable objects to avoid allocations in render loop
    const worldPos = new THREE.Vector3();
    const hotspotScreenPositions: {
      id: string; x: number; y: number; visible: boolean;
      label: string; code: string; category: string;
    }[] = [];

    try {
      scene = new THREE.Scene();
      sceneRef.current = scene;
      onSceneReady?.(scene);

      const width = Math.max(host.clientWidth, 1);
      const height = Math.max(host.clientHeight, 1);
      camera = new THREE.PerspectiveCamera(44, width / height, 0.1, 1400);
      camera.position.copy(INITIAL_CAMERA_POSITION);
      camera.lookAt(INITIAL_CAMERA_TARGET);
      cameraRef.current = camera;
      onCameraReady?.(camera);

      renderer = new THREE.WebGLRenderer({
        canvas: undefined,
        // antialias:true requests 4x MSAA on the XR projection layer (Quest 3).
        // On desktop the EffectComposer chain bypasses the default framebuffer,
        // so this has no cost outside XR.
        antialias: true,
        powerPreference: 'high-performance',
        failIfMajorPerformanceCaveat: false,
        precision: 'highp',
        alpha: false,
      });
      const pixelRatioCap = qualityTier === 'high' ? 1.4 : 1.08;
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, pixelRatioCap));
      renderer.setSize(width, height, false);
      renderer.shadowMap.enabled = true;
      // PCFShadowMap + shadow.radius (set per-light) is the soft-shadow path in
      // three r185; PCFSoftShadowMap is deprecated and falls back to PCF anyway.
      renderer.shadowMap.type = THREE.PCFShadowMap;
      // AgX preserves highlight color while keeping practical and emissive lighting controlled.
      renderer.toneMapping = THREE.AgXToneMapping;
      renderer.toneMappingExposure = 0.72;
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.setClearColor(0x07131d, 1);
      renderer.xr.enabled = true;
      renderer.domElement.className = 'scene-canvas';
      renderer.domElement.setAttribute('aria-label', 'Interactive nuclear digital twin campus');
      rendererRef.current = renderer;
      onRendererReady?.(renderer);
      host.replaceChildren(renderer.domElement);
      assetManager.configureRenderer(renderer);

      controls = new OrbitControls(camera, renderer.domElement);
      controls.target.copy(INITIAL_CAMERA_TARGET);
      controls.update();
      controls.enableDamping = true;
      controls.dampingFactor = 0.05;
      controls.enablePan = true;
      controls.panSpeed = 0.68;
      controls.rotateSpeed = 0.42;
      controls.zoomSpeed = 0.76;
      controls.minDistance = 8;
      controls.maxDistance = 360;
      controls.minPolarAngle = 0.08;
      controls.maxPolarAngle = Math.PI * 0.49;
      controlsRef.current = controls;
      onControlsReady?.(controls);

      const handleControlStart = () => {
        navigationSystemRef.current?.notifyUserInteraction();
      };
      controls.addEventListener('start', handleControlStart);

      const navigationSystem = new CinematicNavigationSystem(
        camera,
        controls,
        renderer.domElement,
        {
          onChangeZone: (zone) => {
            navigationFromSceneRef.current = zone;
            onChangeZoneRef.current(zone);
          },
          onChangeRenderMode: (mode) => onChangeRenderModeRef.current(mode),
          onPresentationFocus: (role) => {
            enterpriseRigRef.current?.setPresentationFocus(role);
          },
          onPresentationHotspot: (hotspotId) => {
            if (presentationHotspotRef.current) {
              presentationHotspotRef.current(hotspotId);
            }
          },
          onCinematicStateChange: (active, kind) => {
            renderer!.domElement.dataset.cinematic = active ? kind ?? 'transition' : 'none';
          },
        },
      );
      navigationSystem.setMode(navigationMode);
      navigationSystemRef.current = navigationSystem;
      onNavigationReady?.(navigationSystem);

      const environment = createIndustrialEnvironment(
        scene,
        renderer,
        assetManager.getEnvironment('industrial_sunset') ?? null,
      );
      environmentRef.current = environment;

      const lighting = createEnterpriseLighting(scene, qualityTier);
      lightingRef.current = lighting;

      const postProcessing = createCinematicPostProcessing(
        renderer,
        scene,
        camera,
        width,
        height,
        qualityTier,
      );
      postProcessingRef.current = postProcessing;

      const publishModelDiagnostics = (
        diagnostics: ModelFitDiagnostics,
      ) => {
        const normalizedSize = diagnostics.normalizedBox.getSize(new THREE.Vector3());
        renderer!.domElement.dataset.modelSource = 'glb';
        renderer!.domElement.dataset.meshCount = String(diagnostics.meshCount);
        renderer!.domElement.dataset.boundingSize = diagnostics.originalSize
          .toArray()
          .map((value) => value.toFixed(4))
          .join(',');
        renderer!.domElement.dataset.modelScale = diagnostics.appliedScale.toFixed(8);
        renderer!.domElement.dataset.normalizedSize = normalizedSize
          .toArray()
          .map((value) => value.toFixed(4))
          .join(',');
        renderer!.domElement.dataset.cameraPosition = camera!.position
          .toArray()
          .map((value) => value.toFixed(4))
          .join(',');
        renderer!.domElement.dataset.controlsTarget = controls!.target
          .toArray()
          .map((value) => value.toFixed(4))
          .join(',');
        renderer!.domElement.dataset.frustumAdjusted = String(
          diagnostics.frustumAdjusted,
        );
      };

      const failActualModelLoad = (message: string, error?: unknown) => {
        console.error(
          `[ThreeNuclearScene] ${message} Model URL: ${NUCLEAR_PLANT_MODEL_URL}`,
          error,
        );
        renderer!.domElement.dataset.modelSource = 'error';
        renderer!.domElement.dataset.modelUrl = NUCLEAR_PLANT_MODEL_URL;
        renderer!.domElement.dataset.sceneReady = 'false';
        setLoadErrorMessage(`${message} (${NUCLEAR_PLANT_MODEL_URL})`);
        setLoadState('error');
      };

      // Cinematic Scene 1 experience: the legacy nuclear plant (GLB or
      // procedural fallback) is not part of this composition. App.tsx loads
      // only the cinematic environment (industrial_sunset), so when the
      // nuclear_plant asset is absent the legacy plant path must not run.
      const legacyPlantActive = assetManager.hasAsset('nuclear_plant');

      // Load model via AssetManager
      setLoadState(legacyPlantActive ? 'loading' : 'ready');
      setLoadErrorMessage(null);
      renderer.domElement.dataset.modelSource = legacyPlantActive ? 'loading' : 'scene1';
      renderer.domElement.dataset.sceneReady = String(legacyPlantActive ? false : true);
      if (legacyPlantActive) {
        renderer.domElement.dataset.modelUrl = NUCLEAR_PLANT_MODEL_URL;
        console.info(
          `[ThreeNuclearScene] Loading actual nuclear plant GLB: ${NUCLEAR_PLANT_MODEL_URL}`,
        );
      }

      const processModel = () => {
        if (disposed) return;

        // Cinematic Scene 1 composition root: keeps the navigation system
        // wired and lets the scene1VisibleGroups effect mount the city,
        // facilities and SMR groups. Camera starts at the bangkok_today
        // camera preset; the orchestrator drives subsequent transitions.
        if (!legacyPlantActive) {
          const scene1Root = new THREE.Group();
          scene1Root.name = 'Cinematic Scene 1 Root';
          scene!.add(scene1Root);
          gltfSceneRef.current = scene1Root;
          navigationSystem.setModelRoot(scene1Root);
          camera!.position.set(330, 115, 330);
          camera!.fov = 38;
          camera!.updateProjectionMatrix();
          controls!.target.set(28, 65, -185);
          controls!.update();
          renderer!.domElement.dataset.modelSource = 'scene1';
          renderer!.domElement.dataset.sceneReady = 'true';
          renderer!.domElement.dataset.navigationMode = navigationMode;
          try {
            renderer!.compile(scene!, camera!);
          } catch (error) {
            console.warn('[ThreeNuclearScene] Shader pre-compile aborted; continuing.', error);
          }
          return;
        }

        let modelWrapper: THREE.Group | null = null;
        try {
          const model = assetManager.createModelInstance('nuclear_plant');
          if (model) {
            model.name = 'Nuclear Plant GLB Model Instance';
            baseModelInstanceRef.current = model;
            modelWrapper = new THREE.Group();
            modelWrapper.name = 'Normalized Nuclear Plant Model Root';
            modelWrapper.add(model);
            scene!.add(modelWrapper);
          } else {
            fallbackScene = createFallbackProceduralScene(
              scene!,
              reactorCoreMeshesRef,
              turbineMachineryMeshesRef,
              reactorDomeMeshRef,
              turbineHallMeshRef,
            );
            modelWrapper = fallbackScene;
            renderer!.domElement.dataset.modelSource = 'procedural-fallback';
          }

          const diagnostics = centerScaleAndFrameObject(
            modelWrapper,
            camera!,
            controls!,
            'GLB Loaded',
          );
          if (!diagnostics) {
            scene!.remove(modelWrapper);
            failActualModelLoad(
              'The campus contains no valid renderable meshes.',
            );
            return;
          }

          gltfSceneRef.current = modelWrapper;
          const campusMeshes = configureCampusMaterials(modelWrapper, renderer!);

          reactorDomeMeshRef.current = findFirstMeshByNamePattern(modelWrapper, ['dome', 'containment_dome', 'reactor_dome', 'dome_roof']);
          if (!reactorDomeMeshRef.current) {
            reactorDomeMeshRef.current = findFirstMeshByNamePattern(modelWrapper, ['containment', 'reactor_wall']);
          }

          turbineHallMeshRef.current = findFirstMeshByNamePattern(modelWrapper, ['turbine_hall', 'turbine_building', 'turbine_roof', 'turbine_wall']);
          if (!turbineHallMeshRef.current) {
            turbineHallMeshRef.current = findFirstMeshByNamePattern(modelWrapper, ['turbine_hall', 'hall_roof']);
          }

          reactorCoreMeshesRef.current = findMeshByNamePattern(modelWrapper, [
            'core', 'reactor_core', 'fuel', 'control_rod', 'pressure_vessel',
            'manifold', 'coolant', 'assembly', 'barrel', 'lattice', 'rod'
          ]);

          turbineMachineryMeshesRef.current = findMeshByNamePattern(modelWrapper, [
            'turbine_rotor', 'turbine_blade', 'rotor', 'blade', 'generator',
            'shaft', 'stage_ring', 'casing', 'pedestal', 'bearing'
          ]);
          controlRodMeshesRef.current = findMeshByNamePattern(modelWrapper, [
            'control_rod',
            'controlrod',
          ]);
          turbineRotorMeshesRef.current = findMeshByNamePattern(modelWrapper, [
            'turbine_rotor',
            'turbine_blade',
          ]);

          if (reactorDomeMeshRef.current) {
            reactorDomeMeshRef.current.userData.walkthroughChamber = 'reactor' as WalkthroughChamber;
          }
          if (turbineHallMeshRef.current) {
            turbineHallMeshRef.current.userData.walkthroughChamber = 'turbine' as WalkthroughChamber;
          }

          const flowSystem = createInteriorFlowSystem();
          modelWrapper.add(flowSystem.group);
          flowSystemRef.current = flowSystem;

          const enterpriseRig = createEnterpriseSceneRig(
            modelWrapper,
            renderer!,
            campusMeshes,
          );
          enterpriseRigRef.current = enterpriseRig;
          onEnterpriseRigReady?.(enterpriseRig);
          enterpriseRig.setZone(currentZoneRef.current);
          enterpriseRig.setRenderMode(
            renderModeRef.current,
            selectedHotspotId
              ? HOTSPOTS_DATA.find((candidate) => candidate.id === selectedHotspotId) ?? null
              : null,
          );
          reactorCoreMeshesRef.current.push(...enterpriseRig.reactor.coreMeshes);

          const hotspotManager = createSpatialHotspotManager(
            modelWrapper,
            camera!,
            renderer!,
          );
          hotspotManager.setOccluders(enterpriseRig.occluders);
          hotspotManager.createHotspots(HOTSPOTS_DATA);
          hotspotManager.updateHotspotSelection(selectedHotspotId);
          hotspotManager.onSelect((hotspotObject) => {
            const hotspot = hotspotObject.userData.hotspot;
            onSelectHotspotRef.current(hotspot);
            if (currentZoneRef.current !== hotspot.zone) {
              navigationFromSceneRef.current = hotspot.zone;
              onChangeZoneRef.current(hotspot.zone);
            }
            const root = gltfSceneRef.current;
            if (root && cameraRef.current && !renderer!.xr.isPresenting) {
              root.updateMatrixWorld(true);
              const worldPos = new THREE.Vector3(...hotspot.position3D).applyMatrix4(root.matrixWorld);
              const offset = new THREE.Vector3(4, 3, 6).applyQuaternion(cameraRef.current.quaternion);
              const camPos = worldPos.clone().add(offset);
              navigationSystemRef.current?.focusOnWorldPosition(camPos, worldPos, 1500, 44);
            }
          });
          hotspotManagerRef.current = hotspotManager;
          onHotspotManagerReady?.(hotspotManager);
          hotspotUpdateCallbackRef.current([]);

          navigationSystem.setModelRoot(modelWrapper);
          const overviewPreset = transformCameraPreset(
            ENTERPRISE_CAMERA_PRESETS.overview,
            modelWrapper,
          );
          camera!.position.copy(overviewPreset.position);
          camera!.fov = overviewPreset.fov ?? 42;
          camera!.updateProjectionMatrix();
          controls!.target.copy(overviewPreset.target);
          controls!.update();

          xrManagerRef.current?.setTeleportSurfaces(enterpriseRig.teleportSurfaces);

          publishModelDiagnostics(diagnostics);
          renderer!.domElement.dataset.flowPathCount = String(flowSystem.paths.length);
          renderer!.domElement.dataset.xrayExteriorCount = '0';
          renderer!.domElement.dataset.xrayInteriorCount = '0';
          renderer!.domElement.dataset.xrayApplied = String(renderModeRef.current === 'xray');
          renderer!.domElement.dataset.thermalApplied = String(renderModeRef.current === 'thermal');
          setLoadErrorMessage(null);
          setLoadState('ready');
          renderer!.domElement.dataset.sceneReady = 'true';
          renderer!.domElement.dataset.navigationMode = navigationMode;
          // Synchronous shader warm-up. compileAsync's internal poll can race
          // material swaps (e.g. render-mode/xray materials) and throw from a
          // timer, which escapes any promise .catch(); compile() has no such
          // poll, so it cannot throw the same race and warms the same programs.
          try {
            renderer!.compile(scene!, camera!);
          } catch (error) {
            console.warn('[ThreeNuclearScene] Shader pre-compile aborted; continuing.', error);
          }
          introTimer = window.setTimeout(() => {
            if (!disposed && presentationRunId === 0) navigationSystem.startIntro();
          }, 320);
          console.info(
            `[ThreeNuclearScene] Enterprise campus composition ready from ${NUCLEAR_PLANT_MODEL_URL}`,
          );
        } catch (error) {
          if (gltfSceneRef.current === modelWrapper) {
            gltfSceneRef.current = null;
          }
          if (modelWrapper) {
            scene!.remove(modelWrapper);
          }
          failActualModelLoad(
            'The actual GLB was fetched but could not be prepared for rendering.',
            error,
          );
        }
      };

      processModel();

      const xrManager = createWebXRManager(renderer, scene, camera);
      xrManagerRef.current = xrManager;
      xrManager.setTeleportSurfaces(enterpriseRigRef.current?.teleportSurfaces ?? []);
      xrManager.onSelectStart((controller) => {
        hotspotManagerRef.current?.handleXRSelect(controller);
      });
      xrManager.onSelectEnd(() => {
        hotspotManagerRef.current?.handleXRSelectEnd();
      });
      xrManager.onSessionStart(() => {
        if (disposed) return;
        setIsXRPresenting(true);
        navigationSystem.cancelCinematic();
        enterpriseRigRef.current?.setXRActive(true);
        lightingRef.current?.setXRActive(true);
        postProcessingRef.current?.setXRActive(true);
        postProcessingRef.current?.setQualityTier('xr');
        renderer!.domElement.dataset.xrSession = 'active';
        xrStartCallbackRef.current?.();
      });
      xrManager.onSessionEnd(() => {
        if (disposed) return;
        setIsXRPresenting(false);
        enterpriseRigRef.current?.setXRActive(false);
        lightingRef.current?.setXRActive(false);
        postProcessingRef.current?.setXRActive(false);
        postProcessingRef.current?.setQualityTier(qualityTier);
        renderer!.domElement.dataset.xrSession = 'inactive';
        xrEndCallbackRef.current?.();
      });
      void xrManager.getSupport()
        .then((support) => {
          if (disposed) return;
          setIsXRSupported(support.vr || support.ar);
          setXRSupportChecked(true);
          renderer!.domElement.dataset.xrVrSupported = String(support.vr);
          renderer!.domElement.dataset.xrArSupported = String(support.ar);
        })
        .catch(() => {
          if (disposed) return;
          setIsXRSupported(false);
          setXRSupportChecked(true);
        });

      const raycaster = new THREE.Raycaster();
      const pointerNdc = new THREE.Vector2();
      const pointerDownPosition = new THREE.Vector2();
      const pointerUpPosition = new THREE.Vector2();
      let activePointerId: number | null = null;

      const handlePointerMove = (event: PointerEvent) => {
        hotspotManagerRef.current?.handlePointerMove(event, renderer!.domElement);
      };

      const handlePointerDown = (event: PointerEvent) => {
        if (event.button !== 0) return;
        activePointerId = event.pointerId;
        pointerDownPosition.set(event.clientX, event.clientY);
      };

      const handlePointerUp = (event: PointerEvent) => {
        if (activePointerId !== event.pointerId || event.button !== 0) return;
        activePointerId = null;
        pointerUpPosition.set(event.clientX, event.clientY);
        if (pointerDownPosition.distanceTo(pointerUpPosition) > 7) return;

        hotspotManagerRef.current?.handlePointerDown(event, renderer!.domElement);
        if (hotspotManagerRef.current?.getHoveredHotspot()) return;

        const bounds = renderer!.domElement.getBoundingClientRect();
        if (bounds.width <= 0 || bounds.height <= 0) return;
        pointerNdc.set(
          ((event.clientX - bounds.left) / bounds.width) * 2 - 1,
          -((event.clientY - bounds.top) / bounds.height) * 2 + 1,
        );
        raycaster.setFromCamera(pointerNdc, camera!);

        const hitTargets: THREE.Object3D[] = [];
        if (reactorDomeMeshRef.current) hitTargets.push(reactorDomeMeshRef.current);
        if (turbineHallMeshRef.current) hitTargets.push(turbineHallMeshRef.current);

        const hits = raycaster.intersectObjects(hitTargets, true);
        const hit = hits[0];
        const chamber = hit?.object.userData.walkthroughChamber as WalkthroughChamber | undefined;
        if (chamber === 'reactor' || chamber === 'turbine') {
          enterWalkthrough(chamber);
        }
      };

      const handlePointerCancel = () => {
        activePointerId = null;
      };

      renderer.domElement.addEventListener('pointermove', handlePointerMove);
      renderer.domElement.addEventListener('pointerdown', handlePointerDown);
      renderer.domElement.addEventListener('pointerup', handlePointerUp);
      renderer.domElement.addEventListener('pointercancel', handlePointerCancel);

      resizeObserver = new ResizeObserver(() => {
        const nextWidth = Math.max(host.clientWidth, 1);
        const nextHeight = Math.max(host.clientHeight, 1);
        camera!.aspect = nextWidth / nextHeight;
        camera!.updateProjectionMatrix();
        renderer!.setSize(nextWidth, nextHeight, false);
        const nextPixelRatioCap = qualityTier === 'high' ? 1.4 : 1.08;
        const nextPixelRatio = Math.min(window.devicePixelRatio, nextPixelRatioCap);
        renderer!.setPixelRatio(nextPixelRatio);
        postProcessingRef.current?.setSize(
          nextWidth,
          nextHeight,
          nextPixelRatio,
        );
      });
      resizeObserver.observe(host);

      const animate = (timestamp: number, xrFrame?: XRFrame) => {
        if (disposed) return;

        const delta = previousFrameTime === 0
          ? 1 / 60
          : Math.min((timestamp - previousFrameTime) / 1000, 0.1);
        previousFrameTime = timestamp;
        const elapsedTime = timestamp / 1000;
        frameTimeAccumulator += delta;
        frameSampleCount += 1;

        if (renderer!.xr.isPresenting) {
          xrManager.update(xrFrame ?? null, delta);
        } else {
          navigationSystem.update(timestamp, delta);
          controls!.update(delta);
        }

        const rodInsertion = THREE.MathUtils.clamp(controlRodDepthRef.current / 100, 0, 1);
        const targetRodOffset = THREE.MathUtils.lerp(2.6, -4.6, rodInsertion);
        const flowSystem = flowSystemRef.current;
        if (flowSystem) {
          const coolantRate = scramActiveRef.current
            ? 0.25
            : THREE.MathUtils.lerp(1.35, 0.72, rodInsertion);
          const energyRate = Math.max(
            0.08,
            THREE.MathUtils.clamp(turbineRpmRef.current / 1800, 0, 1.25),
          );
          updateInteriorFlowSystem(flowSystem, {
            elapsedTime,
            deltaTime: delta,
            enabled: true,
            coolantRate,
            energyRate,
            pixelRatio: renderer!.getPixelRatio(),
          });
          if (timestamp - lastFlowDiagnosticUpdate > 250) {
            lastFlowDiagnosticUpdate = timestamp;
            const sample = flowSystem.paths[0]?.positions;
            if (sample) {
              renderer!.domElement.dataset.flowSample = [
                sample[0],
                sample[1],
                sample[2],
              ].map((value) => value.toFixed(4)).join(',');
            }
            renderer!.domElement.dataset.flowTime = elapsedTime.toFixed(3);
          }
        }

        controlRodMeshesRef.current.forEach((mesh) => {
          mesh.position.y = THREE.MathUtils.damp(
            mesh.position.y,
            targetRodOffset,
            5,
            delta,
          );
        });

        const rpmFactor = THREE.MathUtils.clamp(
          turbineRpmRef.current / 1800,
          0,
          1.2,
        );
        turbineRotorMeshesRef.current.forEach((mesh) => {
          mesh.rotation.x += delta * rpmFactor * 5.6;
        });

        const reactorPulse = scramActiveRef.current
          ? 0.32 + Math.sin(elapsedTime * 1.4) * 0.06
          : 1 + Math.sin(elapsedTime * 2.4) * 0.14;
        reactorCoreMeshesRef.current.forEach((mesh) => {
          const materials = Array.isArray(mesh.material)
            ? mesh.material
            : [mesh.material];
          materials.forEach((material) => {
            if (material instanceof THREE.MeshStandardMaterial) {
              material.emissiveIntensity = (
                isXRayRef.current && isInteriorMesh(mesh)
              ) ? 1.5 : Math.max(material.emissiveIntensity, 0.9 * reactorPulse);
            }
          });
        });

        enterpriseRigRef.current?.update(
          elapsedTime,
          delta,
          currentZoneRef.current,
          scramActiveRef.current,
        );
        lightingRef.current?.update(elapsedTime, scramActiveRef.current);
        environmentRef.current?.update(elapsedTime);
        hotspotManagerRef.current?.animate(delta, elapsedTime);

        if (camera && renderer && timestamp - lastScreenPosUpdate > 100) {
          lastScreenPosUpdate = timestamp;
          const root = gltfSceneRef.current;
          const cam = camera;
          if (root && hotspotManagerRef.current) {
            // Only update matrix world if needed (not every frame)
            root.updateMatrixWorld(false);
            const width = renderer.domElement.clientWidth;
            const height = renderer.domElement.clientHeight;
            const halfWidth = width / 2;
            const halfHeight = height / 2;
            hotspotScreenPositions.length = 0; // Reuse array
            const hotspots = hotspotManagerRef.current.getAllHotspots();
            for (let i = 0; i < hotspots.length; i++) {
              const h = hotspots[i].userData.hotspot;
              worldPos.set(h.position3D[0], h.position3D[1], h.position3D[2]).applyMatrix4(root.matrixWorld);
              worldPos.project(cam);
              const x = (worldPos.x * halfWidth) + halfWidth;
              const y = -(worldPos.y * halfHeight) + halfHeight;
              const visible = worldPos.z < 1 && x >= 0 && x <= width && y >= 0 && y <= height;
              hotspotScreenPositions.push({ id: h.id, x, y, visible, label: h.name, code: h.code, category: h.category });
            }
            hotspotUpdateCallbackRef.current(hotspotScreenPositions);
          }
        }

        if (timestamp - lastPerformanceUpdate > 750) {
          const averageFrameMs = frameSampleCount > 0
            ? (frameTimeAccumulator / frameSampleCount) * 1000
            : 0;
          renderer!.domElement.dataset.averageFrameMs = averageFrameMs.toFixed(2);
          renderer!.domElement.dataset.drawCalls = String(renderer!.info.render.calls);
          renderer!.domElement.dataset.triangles = String(renderer!.info.render.triangles);
          renderer!.domElement.dataset.navigationMode = navigationSystem.getMode();
          renderer!.domElement.dataset.cameraPosition = camera!.position
            .toArray()
            .map((value) => value.toFixed(2))
            .join(',');
          // [SCENE1-DIAG] Log renderer info + scene1 group visibility
          const scene1MeshCount = scene1GroupsRef.current.reduce((sum, g) => {
            let count = 0; g.traverse(c => { if (c instanceof THREE.Mesh) count++; }); return sum + count;
          }, 0);
          console.info(`[SCENE1-DIAG] Render: calls=${renderer!.info.render.calls} tris=${renderer!.info.render.triangles} geoms=${renderer!.info.memory.geometries} textures=${renderer!.info.memory.textures} | scene1Meshes=${scene1MeshCount} | cam=${camera!.position.toArray().map(v=>+v.toFixed(0)).join(',')} target=${controls!.target.toArray().map(v=>+v.toFixed(0)).join(',')}`);
          // [SCENE1-DIAG] Check scene children hierarchy
          const sceneChildNames = scene!.children.map(c => c.name || c.type).slice(0, 15);
          console.info(`[SCENE1-DIAG] Scene children (${scene!.children.length}):`, sceneChildNames.join(', '));

          if (
            averageFrameMs > 22
            && qualityTier === 'high'
            && !renderer!.xr.isPresenting
          ) {
            qualityTier = 'balanced';
            const nextPixelRatio = Math.min(window.devicePixelRatio, 1.08);
            renderer!.setPixelRatio(nextPixelRatio);
            postProcessingRef.current?.setQualityTier('balanced');
            postProcessingRef.current?.setSize(
              Math.max(host.clientWidth, 1),
              Math.max(host.clientHeight, 1),
              nextPixelRatio,
            );
            renderer!.domElement.dataset.adaptiveQuality = 'balanced';
          }

          frameTimeAccumulator = 0;
          frameSampleCount = 0;
          lastPerformanceUpdate = timestamp;
        }

        if (renderer!.xr.isPresenting) {
          renderer!.render(scene!, camera!);
        } else {
          postProcessingRef.current?.render(delta);
        }
      }

      renderer.setAnimationLoop(animate);

      return () => {
        disposed = true;
        if (introTimer !== null) window.clearTimeout(introTimer);
        renderer?.setAnimationLoop(null);
        resizeObserver?.disconnect();
        controls?.removeEventListener('start', handleControlStart);
        renderer?.domElement.removeEventListener('pointermove', handlePointerMove);
        renderer?.domElement.removeEventListener('pointerdown', handlePointerDown);
        renderer?.domElement.removeEventListener('pointerup', handlePointerUp);
        renderer?.domElement.removeEventListener('pointercancel', handlePointerCancel);

        // Dispose Scene 1 assets
        if (scene1Assets && !scene1DisposedRef.current) {
          scene1Assets.dispose();
          scene1DisposedRef.current = true;
        }
        if (scene1GroundRef.current) {
          scene1GroundRef.current.geometry.dispose();
          (scene1GroundRef.current.material as THREE.Material).dispose();
          scene1GroundRef.current = null;
        }
        scene1GroupsRef.current = [];

        navigationSystemRef.current?.dispose();
        navigationSystemRef.current = null;
        onNavigationReady?.(null);
        hotspotManagerRef.current?.dispose();
        hotspotManagerRef.current = null;
        onHotspotManagerReady?.(null);
        onRendererReady?.(null);
        onSceneReady?.(null);
        onCameraReady?.(null);
        onControlsReady?.(null);
        onEnterpriseRigReady?.(null);
        xrManagerRef.current?.dispose();
        xrManagerRef.current = null;
        postProcessingRef.current?.dispose();
        postProcessingRef.current = null;

        controls?.dispose();
        enterpriseRigRef.current?.dispose();
        enterpriseRigRef.current = null;
        if (flowSystemRef.current) {
          flowSystemRef.current.group.parent?.remove(flowSystemRef.current.group);
          disposeObject(flowSystemRef.current.group);
        }
        flowSystemRef.current = null;
        if (baseModelInstanceRef.current) {
          assetManager.disposeModelInstance(baseModelInstanceRef.current);
          baseModelInstanceRef.current = null;
        }
        if (fallbackScene) {
          const fallbackGround = fallbackScene.userData.fallbackGround as THREE.Object3D | undefined;
          if (fallbackGround) {
            scene?.remove(fallbackGround);
            disposeObject(fallbackGround);
          }
          disposeObject(fallbackScene);
        }

        lightingRef.current?.dispose();
        lightingRef.current = null;
        environmentRef.current?.dispose();
        environmentRef.current = null;
        if (scene) {
          scene.environment = null;
          scene.background = null;
          scene.clear();
        }
        renderer?.dispose();
        renderer?.forceContextLoss();
        host.replaceChildren();
        rendererRef.current = null;
        cameraRef.current = null;
        controlsRef.current = null;
        sceneRef.current = null;
        gltfSceneRef.current = null;
        reactorCoreMeshesRef.current = [];
        turbineMachineryMeshesRef.current = [];
        controlRodMeshesRef.current = [];
        turbineRotorMeshesRef.current = [];
        reactorDomeMeshRef.current = null;
        turbineHallMeshRef.current = null;
      };
  } catch (error) {
    console.error('Unable to initialize nuclear scene', error);
    setLoadErrorMessage('WebGL initialization failed. Hardware acceleration is required.');
    setLoadState('error');
    renderer?.dispose();
    renderer?.forceContextLoss();
    controls?.dispose();
    navigationSystemRef.current?.dispose();
    navigationSystemRef.current = null;
    onNavigationReady?.(null);
    hotspotManagerRef.current?.dispose();
    hotspotManagerRef.current = null;
    onHotspotManagerReady?.(null);
    onRendererReady?.(null);
    onSceneReady?.(null);
    onCameraReady?.(null);
    onControlsReady?.(null);
    onEnterpriseRigReady?.(null);
    xrManagerRef.current?.dispose();
    xrManagerRef.current = null;
postProcessingRef.current?.dispose();
        postProcessingRef.current = null;
        enterpriseRigRef.current?.dispose();
    enterpriseRigRef.current = null;
    flowSystemRef.current = null;
    lightingRef.current?.dispose();
    lightingRef.current = null;
    environmentRef.current?.dispose();
    environmentRef.current = null;
    if (scene) {
      scene.clear();
    }
    host.replaceChildren();
  }
}, []);

  const handleEnterXR = async () => {
    await xrManagerRef.current?.startSession('immersive-vr');
  };

  const handleExitXR = async () => {
    await xrManagerRef.current?.endSession();
  };

  return (
    <div
      className="scene-root cursor-grab active:cursor-grabbing select-none"
      style={{ touchAction: 'none' }}
      data-scene-state={loadState}
      data-active-chamber={activeChamber ?? 'none'}
      data-render-mode={renderMode}
      data-xray={renderMode === 'xray' ? 'on' : 'off'}
      data-thermal={renderMode === 'thermal' ? 'on' : 'off'}
      data-navigation-mode={navigationMode}
    >
      <div ref={canvasHostRef} className="scene-canvas-host" />

      {loadState === 'initializing' && (
        <div className="scene-loading-state" role="status" aria-live="polite">
          <div className="scene-loading-card">
            <span className="scene-loading-spinner" aria-hidden="true" />
            <span className="scene-loading-copy">
              <strong>Loading digital twin</strong>
              <span>Streaming GLB assets...</span>
            </span>
          </div>
        </div>
      )}

      {loadState === 'loading' && (
        <div className="scene-loading-state" role="status" aria-live="polite">
          <div className="scene-loading-card">
            <span className="scene-loading-spinner" aria-hidden="true" />
            <span className="scene-loading-copy">
              <strong>Constructing nuclear campus</strong>
              <span>Loading high-fidelity GLB models</span>
            </span>
          </div>
        </div>
      )}

      {loadState === 'error' && (
        <div className="scene-loading-state" role="alert">
          <div className="scene-loading-card is-error">
            <span className="scene-loading-copy">
              <strong>
                {loadErrorMessage?.includes(NUCLEAR_PLANT_MODEL_URL)
                  ? 'Nuclear plant model failed to load'
                  : 'WebGL initialization failed'}
              </strong>
              <span>{loadErrorMessage ?? 'Inspect the browser console for details.'}</span>
            </span>
          </div>
        </div>
      )}

      {/* Scene 1 Loading State */}
      {scene1Loading && SCENE1_ZONES.includes(currentZone) && (
        <div className="scene-loading-state" role="status" aria-live="polite">
          <div className="scene-loading-card">
            <span className="scene-loading-spinner" aria-hidden="true" />
            <span className="scene-loading-copy">
              <strong>Loading Scene 1</strong>
              <span>
                {scene1Progress
                  ? `Streaming ${scene1Progress.currentAsset}... ${scene1Progress.loaded}/${scene1Progress.total} assets (${scene1Progress.percentage.toFixed(1)}%)`
                  : 'Streaming SMR campus, city & facilities assets...'}
              </span>
            </span>
            {scene1Progress && (
              <div className="scene-loading-progress" style={{ marginTop: 8, fontSize: '11px', color: '#88aadd', fontFamily: 'JetBrains Mono, monospace' }}>
                {(scene1Progress.bytesLoaded / 1024 / 1024).toFixed(1)} / {(scene1Progress.bytesTotal / 1024 / 1024).toFixed(1)} MB
              </div>
            )}
          </div>
        </div>
      )}

      {/* Scene 1 Error State */}
      {scene1LoadError && SCENE1_ZONES.includes(currentZone) && (
        <div className="scene-loading-state" role="alert">
          <div className="scene-loading-card is-error">
            <span className="scene-loading-copy">
              <strong>Scene 1 failed to load</strong>
              <span>{scene1LoadError}</span>
            </span>
          </div>
        </div>
      )}

      {isXRSupported && !isXRPresenting && (
        <div className="xr-control xr-control-bottom">
          <button
            type="button"
            onClick={handleEnterXR}
            className="px-5 py-2 rounded-lg bg-black/50 border border-white/30 text-white text-sm font-medium hover:bg-black/65 transition-colors backdrop-blur-md cursor-pointer"
          >
            Enter Immersive XR
          </button>
        </div>
      )}

      {isXRPresenting && (
        <div className="xr-control xr-control-top">
          <button
            type="button"
            onClick={handleExitXR}
            className="px-3 py-1.5 rounded-lg bg-black/50 border border-white/25 text-white/80 text-xs hover:bg-black/65 transition-colors cursor-pointer"
          >
            Exit XR
          </button>
        </div>
      )}

      {xrSupportChecked && !isXRSupported && !isXRPresenting && (
        <div className="xr-control xr-control-bottom xr-desktop-status">
          <div className="px-3 py-1.5 rounded-lg bg-black/45 border border-white/20 text-white/75 text-[10px] backdrop-blur-md">
            WebXR unavailable - Desktop mode
          </div>
        </div>
      )}
    </div>
  );
};
