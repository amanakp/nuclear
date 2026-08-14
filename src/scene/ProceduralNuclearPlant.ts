import * as THREE from 'three';
import { RenderShaderMode } from '../types/nuclear';
import { createInteriorFlowSystem, InteriorFlowSystem } from './InteriorFlowSystem';

export type WalkthroughChamber = 'reactor' | 'turbine';

interface MaterialSnapshot {
  material: THREE.MeshStandardMaterial;
  color: THREE.Color;
  emissive: THREE.Color;
  emissiveIntensity: number;
  opacity: number;
  transparent: boolean;
  depthWrite: boolean;
  wireframe: boolean;
  side: THREE.Side;
}

export interface ReactorAnimationRig {
  controlRodAssembly: THREE.Group;
  controlRodMaterial: THREE.MeshStandardMaterial;
  coreMaterials: THREE.MeshStandardMaterial[];
  coreLight: THREE.PointLight;
}

export interface TurbineAnimationRig {
  rotor: THREE.Group;
  glowMaterials: THREE.MeshStandardMaterial[];
  energyLight: THREE.PointLight;
}

export interface ProceduralNuclearPlant {
  group: THREE.Group;
  exteriorShells: THREE.Mesh[];
  shellMaterials: MaterialSnapshot[];
  reactor: ReactorAnimationRig;
  turbine: TurbineAnimationRig;
  flow: InteriorFlowSystem;
  hitTargets: THREE.Group;
}

const XRAY_OPACITY = 0.15;

function markInterior<T extends THREE.Object3D>(object: T): T {
  object.userData.isProceduralInterior = true;
  return object;
}

function configureMesh<T extends THREE.Mesh>(
  mesh: T,
  {
    castShadow = true,
    receiveShadow = true,
    interior = false,
  }: {
    castShadow?: boolean;
    receiveShadow?: boolean;
    interior?: boolean;
  } = {},
): T {
  mesh.castShadow = castShadow;
  mesh.receiveShadow = receiveShadow;
  if (interior) markInterior(mesh);
  return mesh;
}

function addInteriorMesh(
  parent: THREE.Object3D,
  geometry: THREE.BufferGeometry,
  material: THREE.Material,
  name: string,
  position: [number, number, number],
  rotation: [number, number, number] = [0, 0, 0],
): THREE.Mesh {
  const mesh = configureMesh(new THREE.Mesh(geometry, material), { interior: true });
  mesh.name = name;
  mesh.position.set(...position);
  mesh.rotation.set(...rotation);
  parent.add(mesh);
  return mesh;
}

function addShellMesh(
  parent: THREE.Object3D,
  exteriorShells: THREE.Mesh[],
  geometry: THREE.BufferGeometry,
  material: THREE.MeshStandardMaterial,
  name: string,
  position: [number, number, number],
  rotation: [number, number, number] = [0, 0, 0],
): THREE.Mesh {
  const mesh = configureMesh(new THREE.Mesh(geometry, material));
  mesh.name = name;
  mesh.position.set(...position);
  mesh.rotation.set(...rotation);
  mesh.userData.isExteriorShell = true;
  parent.add(mesh);
  exteriorShells.push(mesh);
  return mesh;
}

function createCampusGround(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'Dark Industrial Campus Ground and Roads';

  const ground = configureMesh(
    new THREE.Mesh(
      new THREE.PlaneGeometry(620, 620),
      new THREE.MeshStandardMaterial({
        name: 'campus-ground-matte',
        color: 0x1a2332,
        roughness: 0.98,
        metalness: 0,
      }),
    ),
    { castShadow: false },
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.18;
  ground.name = 'Campus Ground Plane';
  group.add(ground);

  const grid = new THREE.GridHelper(260, 52, 0x3b5872, 0x2a3c50);
  grid.name = 'Campus Engineering Grid';
  grid.position.y = -0.08;
  const gridMaterials = Array.isArray(grid.material) ? grid.material : [grid.material];
  gridMaterials.forEach((material) => {
    material.transparent = true;
    material.opacity = 0.22;
    material.depthWrite = false;
  });
  group.add(grid);

  const asphalt = new THREE.MeshStandardMaterial({
    name: 'procedural-campus-asphalt',
    color: 0x111820,
    roughness: 0.9,
    metalness: 0.04,
  });
  const laneMaterial = new THREE.MeshBasicMaterial({
    name: 'procedural-road-marking',
    color: 0x73869a,
    transparent: true,
    opacity: 0.42,
    depthWrite: false,
    toneMapped: false,
  });

  const roadDefinitions: Array<{
    position: [number, number, number];
    size: [number, number];
  }> = [
    { position: [0, -0.04, 53], size: [188, 13] },
    { position: [0, -0.04, -52], size: [188, 11] },
    { position: [-72, -0.03, 0], size: [12, 118] },
    { position: [76, -0.03, 0], size: [12, 118] },
    { position: [13, -0.02, 10], size: [12, 86] },
  ];

  roadDefinitions.forEach(({ position, size }, index) => {
    const road = configureMesh(
      new THREE.Mesh(new THREE.BoxGeometry(size[0], 0.16, size[1]), asphalt),
      { castShadow: false },
    );
    road.name = `Procedural Campus Road ${index + 1}`;
    road.position.set(...position);
    group.add(road);
  });

  for (let x = -86; x <= 86; x += 9) {
    const lane = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 0.14), laneMaterial);
    lane.name = 'Road Center Marking';
    lane.rotation.x = -Math.PI / 2;
    lane.position.set(x, 0.055, 53);
    group.add(lane);
  }

  for (let z = -47; z <= 47; z += 8) {
    const lane = new THREE.Mesh(new THREE.PlaneGeometry(0.14, 4.2), laneMaterial);
    lane.name = 'Road Center Marking';
    lane.rotation.x = -Math.PI / 2;
    lane.position.set(76, 0.055, z);
    group.add(lane);
  }

  return group;
}

function createCampusTrees(treeCount = 132): THREE.Group {
  const group = new THREE.Group();
  group.name = 'Instanced Low Poly Perimeter Trees';

  const trunks = configureMesh(
    new THREE.InstancedMesh(
      new THREE.CylinderGeometry(0.42, 0.64, 3.8, 6),
      new THREE.MeshStandardMaterial({
        name: 'tree-trunk-bark',
        color: 0x4a3528,
        roughness: 1,
        metalness: 0,
      }),
      treeCount,
    ),
  );
  const foliage = configureMesh(
    new THREE.InstancedMesh(
      new THREE.ConeGeometry(2.35, 6.8, 7),
      new THREE.MeshStandardMaterial({
        name: 'tree-low-poly-foliage',
        color: 0x173d32,
        roughness: 0.96,
        metalness: 0,
      }),
      treeCount,
    ),
  );
  trunks.name = 'Instanced Tree Trunks';
  foliage.name = 'Instanced Tree Crowns';
  trunks.instanceMatrix.setUsage(THREE.StaticDrawUsage);
  foliage.instanceMatrix.setUsage(THREE.StaticDrawUsage);

  let randomState = 0x92d68ca2;
  const random = () => {
    randomState = (randomState * 1664525 + 1013904223) >>> 0;
    return randomState / 0x100000000;
  };
  const dummy = new THREE.Object3D();
  const color = new THREE.Color();

  for (let index = 0; index < treeCount; index += 1) {
    let x = 0;
    let z = 0;
    do {
      x = THREE.MathUtils.lerp(-152, 152, random());
      z = THREE.MathUtils.lerp(-118, 118, random());
    } while (Math.abs(x) < 90 && Math.abs(z) < 69);

    const scale = 0.7 + random() * 0.68;
    const rotation = random() * Math.PI * 2;

    dummy.position.set(x, scale * 1.9 - 0.1, z);
    dummy.rotation.set(0, rotation, 0);
    dummy.scale.set(scale, scale, scale);
    dummy.updateMatrix();
    trunks.setMatrixAt(index, dummy.matrix);

    dummy.position.set(x, scale * 6.35 - 0.1, z);
    dummy.rotation.set(0, rotation, 0);
    dummy.scale.set(scale, scale, scale);
    dummy.updateMatrix();
    foliage.setMatrixAt(index, dummy.matrix);

    color.setHSL(
      0.42 + (random() - 0.5) * 0.045,
      0.32 + random() * 0.15,
      0.13 + random() * 0.065,
    );
    foliage.setColorAt(index, color);
  }

  trunks.instanceMatrix.needsUpdate = true;
  foliage.instanceMatrix.needsUpdate = true;
  if (foliage.instanceColor) foliage.instanceColor.needsUpdate = true;
  group.add(trunks, foliage);
  return group;
}

interface FenceSegment {
  x: number;
  z: number;
  length: number;
  rotation: number;
}

function createIndustrialFence(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'Instanced Industrial Security Fence';

  const segments: FenceSegment[] = [];
  const horizontalCount = 36;
  const verticalCount = 28;
  const horizontalLength = 208 / horizontalCount;
  const verticalLength = 156 / verticalCount;

  for (let index = 0; index < horizontalCount; index += 1) {
    const x = -104 + horizontalLength * (index + 0.5);
    segments.push({ x, z: -78, length: horizontalLength, rotation: 0 });
    segments.push({ x, z: 78, length: horizontalLength, rotation: 0 });
  }
  for (let index = 0; index < verticalCount; index += 1) {
    const z = -78 + verticalLength * (index + 0.5);
    segments.push({ x: -104, z, length: verticalLength, rotation: Math.PI / 2 });
    segments.push({ x: 104, z, length: verticalLength, rotation: Math.PI / 2 });
  }

  const postMaterial = new THREE.MeshStandardMaterial({
    name: 'security-fence-galvanized-post',
    color: 0x657481,
    metalness: 0.88,
    roughness: 0.36,
  });
  const railMaterial = new THREE.MeshStandardMaterial({
    name: 'security-fence-galvanized-rail',
    color: 0x4e5e69,
    metalness: 0.82,
    roughness: 0.4,
  });
  const meshMaterial = new THREE.MeshBasicMaterial({
    name: 'security-fence-wire-mesh',
    color: 0x7d909d,
    transparent: true,
    opacity: 0.34,
    wireframe: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  });

  const posts = configureMesh(
    new THREE.InstancedMesh(
      new THREE.BoxGeometry(0.22, 3.4, 0.22),
      postMaterial,
      segments.length,
    ),
  );
  const rails = configureMesh(
    new THREE.InstancedMesh(
      new THREE.BoxGeometry(1, 1, 1),
      railMaterial,
      segments.length * 2,
    ),
  );
  const panels = configureMesh(
    new THREE.InstancedMesh(
      new THREE.PlaneGeometry(1, 1, 5, 3),
      meshMaterial,
      segments.length,
    ),
    { castShadow: false },
  );
  posts.name = 'Instanced Fence Posts';
  rails.name = 'Instanced Fence Rails';
  panels.name = 'Instanced Fence Mesh Panels';
  posts.instanceMatrix.setUsage(THREE.StaticDrawUsage);
  rails.instanceMatrix.setUsage(THREE.StaticDrawUsage);
  panels.instanceMatrix.setUsage(THREE.StaticDrawUsage);

  const dummy = new THREE.Object3D();
  segments.forEach((segment, index) => {
    dummy.position.set(segment.x, 1.7, segment.z);
    dummy.rotation.set(0, segment.rotation, 0);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    posts.setMatrixAt(index, dummy.matrix);

    for (let railIndex = 0; railIndex < 2; railIndex += 1) {
      dummy.position.set(segment.x, railIndex === 0 ? 0.75 : 2.55, segment.z);
      dummy.rotation.set(0, segment.rotation, 0);
      dummy.scale.set(segment.length, 0.09, 0.1);
      dummy.updateMatrix();
      rails.setMatrixAt(index * 2 + railIndex, dummy.matrix);
    }

    dummy.position.set(segment.x, 1.65, segment.z);
    dummy.rotation.set(0, segment.rotation, 0);
    dummy.scale.set(segment.length, 2.6, 1);
    dummy.updateMatrix();
    panels.setMatrixAt(index, dummy.matrix);
  });

  posts.instanceMatrix.needsUpdate = true;
  rails.instanceMatrix.needsUpdate = true;
  panels.instanceMatrix.needsUpdate = true;
  group.add(posts, rails, panels);
  return group;
}

function createCampusLightPoles(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'Instanced Campus Light Poles';
  const positions: Array<[number, number]> = [];

  for (let x = -72; x <= 72; x += 18) positions.push([x, 45], [x, 61]);
  for (let z = -42; z <= 42; z += 17) positions.push([68, z], [84, z]);

  const poles = configureMesh(
    new THREE.InstancedMesh(
      new THREE.CylinderGeometry(0.11, 0.16, 7.5, 8),
      new THREE.MeshStandardMaterial({
        name: 'campus-light-pole-metal',
        color: 0x303d49,
        metalness: 0.86,
        roughness: 0.38,
      }),
      positions.length,
    ),
  );
  const lamps = configureMesh(
    new THREE.InstancedMesh(
      new THREE.BoxGeometry(0.8, 0.28, 0.42),
      new THREE.MeshStandardMaterial({
        name: 'campus-light-emissive-head',
        color: 0xb9d8e6,
        emissive: 0x7fd9ff,
        emissiveIntensity: 1.5,
        roughness: 0.28,
        metalness: 0.22,
      }),
      positions.length,
    ),
    { castShadow: false },
  );
  poles.name = 'Instanced Campus Lamp Posts';
  lamps.name = 'Instanced Campus Lamp Heads';

  const dummy = new THREE.Object3D();
  positions.forEach(([x, z], index) => {
    dummy.position.set(x, 3.75, z);
    dummy.rotation.set(0, 0, 0);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    poles.setMatrixAt(index, dummy.matrix);

    dummy.position.set(x, 7.55, z);
    dummy.updateMatrix();
    lamps.setMatrixAt(index, dummy.matrix);
  });

  poles.instanceMatrix.needsUpdate = true;
  lamps.instanceMatrix.needsUpdate = true;
  group.add(poles, lamps);
  return group;
}

function createReactorContainment(
  plant: THREE.Group,
  exteriorShells: THREE.Mesh[],
): ReactorAnimationRig {
  const shellGroup = new THREE.Group();
  shellGroup.name = 'Reactor Containment Exterior Shell';
  shellGroup.position.set(-10, 0, 0);
  plant.add(shellGroup);

  const concrete = new THREE.MeshStandardMaterial({
    name: 'reactor-containment-concrete-shell',
    color: 0x8d9aa3,
    roughness: 0.72,
    metalness: 0.08,
  });
  const darkConcrete = new THREE.MeshStandardMaterial({
    name: 'reactor-containment-seismic-bands',
    color: 0x596771,
    roughness: 0.68,
    metalness: 0.12,
  });
  const doorMaterial = new THREE.MeshStandardMaterial({
    name: 'reactor-equipment-airlock-shell',
    color: 0x314454,
    metalness: 0.72,
    roughness: 0.34,
  });

  addShellMesh(
    shellGroup,
    exteriorShells,
    new THREE.CylinderGeometry(20.5, 20.5, 2.2, 64),
    darkConcrete,
    'Reactor Containment Foundation Shell',
    [0, 1.1, 0],
  );
  addShellMesh(
    shellGroup,
    exteriorShells,
    new THREE.CylinderGeometry(18, 18.6, 25, 64),
    concrete,
    'Reactor Containment Reinforced Concrete Wall',
    [0, 14.2, 0],
  );
  addShellMesh(
    shellGroup,
    exteriorShells,
    new THREE.SphereGeometry(18, 64, 28, 0, Math.PI * 2, 0, Math.PI / 2),
    concrete,
    'Reactor Containment Concrete Dome',
    [0, 26.7, 0],
  );

  [4.6, 15.8, 25.8].forEach((height, index) => {
    addShellMesh(
      shellGroup,
      exteriorShells,
      new THREE.TorusGeometry(18.55 - index * 0.2, 0.42, 12, 64),
      darkConcrete,
      `Reactor Containment Seismic Band ${index + 1}`,
      [0, height, 0],
      [Math.PI / 2, 0, 0],
    );
  });
  addShellMesh(
    shellGroup,
    exteriorShells,
    new THREE.CylinderGeometry(3.8, 3.8, 5.5, 32),
    doorMaterial,
    'Reactor Equipment Airlock Shell',
    [0, 6.1, 19.1],
    [Math.PI / 2, 0, 0],
  );
  addShellMesh(
    shellGroup,
    exteriorShells,
    new THREE.CylinderGeometry(1.35, 1.55, 15, 24),
    doorMaterial,
    'Reactor Ventilation Stack Shell',
    [-12.5, 33, -8],
  );

  const interior = markInterior(new THREE.Group());
  interior.name = 'Procedural Reactor Machinery';
  interior.position.set(-10, 0, 0);
  plant.add(interior);

  const structuralMaterial = new THREE.MeshStandardMaterial({
    name: 'reactor-pressure-vessel-structure',
    color: 0x273844,
    metalness: 0.88,
    roughness: 0.28,
  });
  const coreOuterMaterial = new THREE.MeshStandardMaterial({
    name: 'reactor-core-cyan-outer-layer',
    color: 0x0d6b7a,
    emissive: 0x00d9ff,
    emissiveIntensity: 1.25,
    metalness: 0.38,
    roughness: 0.22,
  });
  const coreCenterMaterial = new THREE.MeshStandardMaterial({
    name: 'reactor-core-bright-cyan-center',
    color: 0xbffaff,
    emissive: 0x2feaff,
    emissiveIntensity: 2.8,
    metalness: 0.08,
    roughness: 0.16,
  });
  const controlRodMaterial = new THREE.MeshStandardMaterial({
    name: 'reactor-control-rod-glow',
    color: 0x77efff,
    emissive: 0x26dfff,
    emissiveIntensity: 1.7,
    metalness: 0.55,
    roughness: 0.2,
  });

  addInteriorMesh(
    interior,
    new THREE.CylinderGeometry(10.2, 10.2, 21, 48, 1, true, Math.PI * 0.2, Math.PI * 1.58),
    structuralMaterial,
    'Cutaway Reactor Pressure Vessel',
    [0, 14.3, 0],
  );
  [5, 9.5, 14, 18.5, 23].forEach((height, index) => {
    addInteriorMesh(
      interior,
      new THREE.TorusGeometry(10.35, index === 0 || index === 4 ? 0.38 : 0.24, 10, 48),
      structuralMaterial,
      `Reactor Vessel Reinforcement Ring ${index + 1}`,
      [0, height, 0],
      [Math.PI / 2, 0, 0],
    );
  });
  addInteriorMesh(
    interior,
    new THREE.CylinderGeometry(6.6, 6.6, 15, 40, 1, true),
    new THREE.MeshStandardMaterial({
      name: 'reactor-core-barrel-wireframe',
      color: 0x58717d,
      emissive: 0x16323f,
      emissiveIntensity: 0.45,
      metalness: 0.9,
      roughness: 0.25,
      wireframe: true,
    }),
    'Reactor Core Barrel Lattice',
    [0, 13.2, 0],
  );
  addInteriorMesh(
    interior,
    new THREE.CylinderGeometry(4.8, 5.4, 13.2, 48),
    coreOuterMaterial,
    'Glowing Multi Layer Reactor Core',
    [0, 12.8, 0],
  );
  addInteriorMesh(
    interior,
    new THREE.CylinderGeometry(2.15, 2.5, 15.6, 40),
    coreCenterMaterial,
    'Bright Cyan Pulsing Core Center',
    [0, 13.2, 0],
  );

  [6.4, 12.8, 19.2].forEach((height, index) => {
    addInteriorMesh(
      interior,
      new THREE.TorusGeometry(5.55, 0.32, 12, 48),
      coreCenterMaterial,
      `Reactor Core Glowing Layer Ring ${index + 1}`,
      [0, height, 0],
      [Math.PI / 2, 0, 0],
    );
  });

  const fuelPositions: Array<[number, number]> = [];
  for (let x = -4.2; x <= 4.2; x += 1.05) {
    for (let z = -4.2; z <= 4.2; z += 1.05) {
      if (x * x + z * z <= 21) fuelPositions.push([x, z]);
    }
  }
  const fuelAssemblies = configureMesh(
    new THREE.InstancedMesh(
      new THREE.BoxGeometry(0.42, 10.6, 0.42),
      new THREE.MeshStandardMaterial({
        name: 'reactor-fuel-assembly-metal',
        color: 0x9eaeb2,
        emissive: 0x164150,
        emissiveIntensity: 0.35,
        metalness: 0.82,
        roughness: 0.3,
      }),
      fuelPositions.length,
    ),
    { interior: true },
  );
  fuelAssemblies.name = 'Instanced Reactor Fuel Assemblies';
  const fuelDummy = new THREE.Object3D();
  fuelPositions.forEach(([x, z], index) => {
    fuelDummy.position.set(x, 12.5, z);
    fuelDummy.updateMatrix();
    fuelAssemblies.setMatrixAt(index, fuelDummy.matrix);
  });
  fuelAssemblies.instanceMatrix.needsUpdate = true;
  interior.add(fuelAssemblies);

  const controlRodPositions: Array<[number, number]> = [];
  for (let index = 0; index < 20; index += 1) {
    const angle = (index / 20) * Math.PI * 2;
    controlRodPositions.push([Math.cos(angle) * 4.55, Math.sin(angle) * 4.55]);
  }
  for (const x of [-2.2, 0, 2.2]) {
    for (const z of [-2.2, 0, 2.2]) controlRodPositions.push([x, z]);
  }

  const controlRodAssembly = markInterior(new THREE.Group());
  controlRodAssembly.name = 'Animated Reactor Control Rod Assembly';
  const controlRods = configureMesh(
    new THREE.InstancedMesh(
      new THREE.BoxGeometry(0.3, 15.5, 0.3),
      controlRodMaterial,
      controlRodPositions.length,
    ),
    { interior: true },
  );
  controlRods.name = 'Instanced Glowing Control Rods';
  const rodDummy = new THREE.Object3D();
  controlRodPositions.forEach(([x, z], index) => {
    rodDummy.position.set(x, 17, z);
    rodDummy.updateMatrix();
    controlRods.setMatrixAt(index, rodDummy.matrix);
  });
  controlRods.instanceMatrix.needsUpdate = true;
  controlRodAssembly.add(controlRods);
  interior.add(controlRodAssembly);

  addInteriorMesh(
    interior,
    new THREE.CylinderGeometry(12.8, 12.8, 0.9, 56),
    structuralMaterial,
    'Reactor Service Platform',
    [0, 2.2, 0],
  );
  [8.8, 20.5].forEach((height, index) => {
    addInteriorMesh(
      interior,
      new THREE.TorusGeometry(8.2, 0.58, 12, 56),
      new THREE.MeshStandardMaterial({
        name: `reactor-primary-coolant-manifold-${index + 1}`,
        color: 0x165a70,
        emissive: 0x0796b8,
        emissiveIntensity: 0.5,
        metalness: 0.78,
        roughness: 0.25,
      }),
      `Primary Coolant Manifold ${index + 1}`,
      [0, height, 0],
      [Math.PI / 2, 0, 0],
    );
  });

  const coreLight = new THREE.PointLight(0x2fe8ff, 7.5, 38, 1.65);
  coreLight.name = 'Reactor Core Cyan Light';
  coreLight.position.set(0, 13, 0);
  markInterior(coreLight);
  interior.add(coreLight);

  return {
    controlRodAssembly,
    controlRodMaterial,
    coreMaterials: [coreOuterMaterial, coreCenterMaterial],
    coreLight,
  };
}

function createTurbineHall(
  plant: THREE.Group,
  exteriorShells: THREE.Mesh[],
): TurbineAnimationRig {
  const shellGroup = new THREE.Group();
  shellGroup.name = 'Turbine Hall Exterior Shell';
  shellGroup.position.set(25, 0, 29);
  plant.add(shellGroup);

  const hallMaterial = new THREE.MeshStandardMaterial({
    name: 'turbine-hall-concrete-shell',
    color: 0x62717c,
    roughness: 0.66,
    metalness: 0.16,
  });
  const roofMaterial = new THREE.MeshStandardMaterial({
    name: 'turbine-hall-metal-roof-shell',
    color: 0x334653,
    roughness: 0.42,
    metalness: 0.72,
  });
  const glassMaterial = new THREE.MeshStandardMaterial({
    name: 'turbine-hall-clerestory-shell',
    color: 0x5ca7ba,
    emissive: 0x134a5c,
    emissiveIntensity: 0.45,
    roughness: 0.26,
    metalness: 0.34,
    transparent: true,
    opacity: 0.72,
  });

  addShellMesh(
    shellGroup,
    exteriorShells,
    new THREE.BoxGeometry(68, 2.2, 28),
    roofMaterial,
    'Turbine Hall Concrete Base Shell',
    [0, 1.1, 0],
  );
  addShellMesh(
    shellGroup,
    exteriorShells,
    new THREE.BoxGeometry(66, 19.5, 26),
    hallMaterial,
    'Turbine Hall Main Volume Shell',
    [0, 11.8, 0],
  );
  addShellMesh(
    shellGroup,
    exteriorShells,
    new THREE.BoxGeometry(68, 2, 28),
    roofMaterial,
    'Turbine Hall Metal Roof Shell',
    [0, 22.5, 0],
  );
  addShellMesh(
    shellGroup,
    exteriorShells,
    new THREE.BoxGeometry(53, 3.2, 1),
    glassMaterial,
    'Turbine Hall Clerestory Window Shell',
    [0, 17.5, 13.25],
  );

  const interior = markInterior(new THREE.Group());
  interior.name = 'Procedural Turbine Generator Machinery';
  interior.position.set(25, 0, 29);
  plant.add(interior);

  const foundationMaterial = new THREE.MeshStandardMaterial({
    name: 'turbine-machinery-foundation',
    color: 0x2b333b,
    roughness: 0.88,
    metalness: 0.08,
  });
  const casingMaterial = new THREE.MeshStandardMaterial({
    name: 'turbine-machinery-casing',
    color: 0x63717b,
    metalness: 0.86,
    roughness: 0.28,
  });
  const rotorMaterial = new THREE.MeshStandardMaterial({
    name: 'turbine-rotor-energy-metal',
    color: 0x9cb3ba,
    emissive: 0xff7b26,
    emissiveIntensity: 0.78,
    metalness: 0.92,
    roughness: 0.2,
  });
  const cyanStageMaterial = new THREE.MeshStandardMaterial({
    name: 'turbine-cyan-stage-glow',
    color: 0x63eaff,
    emissive: 0x22dfff,
    emissiveIntensity: 1.55,
    metalness: 0.52,
    roughness: 0.18,
  });
  const orangeStageMaterial = new THREE.MeshStandardMaterial({
    name: 'turbine-orange-stage-glow',
    color: 0xffb36b,
    emissive: 0xff7024,
    emissiveIntensity: 1.7,
    metalness: 0.48,
    roughness: 0.18,
  });

  addInteriorMesh(
    interior,
    new THREE.BoxGeometry(60, 1.4, 12),
    foundationMaterial,
    'Turbine Generator Foundation',
    [0, 1.4, 0],
  );
  [-20, -7, 7, 22].forEach((x, index) => {
    addInteriorMesh(
      interior,
      new THREE.BoxGeometry(index === 3 ? 10 : 8, 4.2, 7.8),
      foundationMaterial,
      `Turbine Bearing Pedestal ${index + 1}`,
      [x, 4, 0],
    );
  });

  const rotor = markInterior(new THREE.Group());
  rotor.name = 'Animated Turbine Rotor';
  rotor.position.set(0, 10.2, 0);
  interior.add(rotor);
  addInteriorMesh(
    rotor,
    new THREE.CylinderGeometry(0.7, 0.7, 59, 24),
    rotorMaterial,
    'Turbine Generator Main Shaft',
    [0, 0, 0],
    [0, 0, Math.PI / 2],
  );

  const stageXs = [-25, -21, -16, -10, -4, 3, 10, 16, 24, 30];
  stageXs.forEach((x, index) => {
    addInteriorMesh(
      rotor,
      new THREE.TorusGeometry(index < 2 ? 2.8 : index > 7 ? 4.7 : 4.1, 0.22, 10, 40),
      index % 2 === 0 ? cyanStageMaterial : orangeStageMaterial,
      `Turbine Rotor Stage Ring ${index + 1}`,
      [x, 0, 0],
      [0, Math.PI / 2, 0],
    );
  });

  const bladeCount = stageXs.length * 10;
  const blades = configureMesh(
    new THREE.InstancedMesh(
      new THREE.BoxGeometry(0.16, 2.8, 0.38),
      rotorMaterial,
      bladeCount,
    ),
    { interior: true },
  );
  blades.name = 'Instanced Turbine Rotor Blades';
  const bladeDummy = new THREE.Object3D();
  let bladeIndex = 0;
  stageXs.forEach((x, stageIndex) => {
    const radius = stageIndex < 2 ? 2.1 : stageIndex > 7 ? 4 : 3.35;
    for (let radialIndex = 0; radialIndex < 10; radialIndex += 1) {
      const angle = (radialIndex / 10) * Math.PI * 2;
      bladeDummy.position.set(x, Math.cos(angle) * radius, Math.sin(angle) * radius);
      bladeDummy.rotation.set(angle, 0, Math.PI / 2);
      bladeDummy.updateMatrix();
      blades.setMatrixAt(bladeIndex, bladeDummy.matrix);
      bladeIndex += 1;
    }
  });
  blades.instanceMatrix.needsUpdate = true;
  rotor.add(blades);

  [
    { x: -22, radius: 3.35, length: 10 },
    { x: -8, radius: 4.65, length: 16 },
    { x: 8, radius: 4.65, length: 16 },
  ].forEach(({ x, radius, length }, index) => {
    addInteriorMesh(
      interior,
      new THREE.CylinderGeometry(radius, radius, length, 40, 1, true),
      new THREE.MeshStandardMaterial({
        name: `turbine-cutaway-casing-${index + 1}`,
        color: 0x596873,
        emissive: 0x142630,
        emissiveIntensity: 0.35,
        metalness: 0.84,
        roughness: 0.3,
        wireframe: true,
      }),
      `Turbine Cutaway Casing ${index + 1}`,
      [x, 10.2, 0],
      [0, 0, Math.PI / 2],
    );
  });
  addInteriorMesh(
    interior,
    new THREE.CylinderGeometry(4.8, 4.8, 16, 48),
    casingMaterial,
    'Main Electrical Generator',
    [23, 10.2, 0],
    [0, 0, Math.PI / 2],
  );
  addInteriorMesh(
    interior,
    new THREE.TorusGeometry(4.9, 0.34, 12, 48),
    orangeStageMaterial,
    'Generator Energy Ring',
    [31, 10.2, 0],
    [0, Math.PI / 2, 0],
  );

  const energyLight = new THREE.PointLight(0xff8d3d, 5.5, 34, 1.7);
  energyLight.name = 'Turbine Hall Energy Light';
  energyLight.position.set(4, 11, 0);
  markInterior(energyLight);
  interior.add(energyLight);

  return {
    rotor,
    glowMaterials: [rotorMaterial, cyanStageMaterial, orangeStageMaterial],
    energyLight,
  };
}

function createCoolingTower(
  plant: THREE.Group,
  exteriorShells: THREE.Mesh[],
  position: [number, number, number],
  name: string,
): void {
  const group = new THREE.Group();
  group.name = name;
  group.position.set(...position);
  plant.add(group);

  const shellMaterial = new THREE.MeshStandardMaterial({
    name: 'cooling-tower-hyperbolic-concrete-shell',
    color: 0x77858d,
    roughness: 0.78,
    metalness: 0.04,
    side: THREE.DoubleSide,
  });
  const rimMaterial = new THREE.MeshStandardMaterial({
    name: 'cooling-tower-structural-ring-shell',
    color: 0x465762,
    roughness: 0.62,
    metalness: 0.22,
  });
  const profile = [
    new THREE.Vector2(17.8, 0),
    new THREE.Vector2(15.2, 8),
    new THREE.Vector2(11.2, 23),
    new THREE.Vector2(9.6, 35),
    new THREE.Vector2(10.4, 48),
    new THREE.Vector2(13.1, 62),
  ];

  addShellMesh(
    group,
    exteriorShells,
    new THREE.LatheGeometry(profile, 48),
    shellMaterial,
    `${name} Hyperbolic Concrete Shell`,
    [0, 0, 0],
  );
  [0.8, 35, 61.2].forEach((height, index) => {
    const radius = index === 0 ? 17.5 : index === 1 ? 9.7 : 13;
    addShellMesh(
      group,
      exteriorShells,
      new THREE.TorusGeometry(radius, index === 1 ? 0.34 : 0.48, 10, 48),
      rimMaterial,
      `${name} Structural Ring ${index + 1}`,
      [0, height, 0],
      [Math.PI / 2, 0, 0],
    );
  });

  const columnMaterial = new THREE.MeshStandardMaterial({
    name: 'cooling-tower-base-columns',
    color: 0x52626b,
    roughness: 0.68,
    metalness: 0.18,
  });
  const columns = configureMesh(
    new THREE.InstancedMesh(
      new THREE.BoxGeometry(0.65, 5.5, 0.85),
      columnMaterial,
      16,
    ),
  );
  columns.name = `${name} Instanced Base Columns`;
  const dummy = new THREE.Object3D();
  for (let index = 0; index < 16; index += 1) {
    const angle = (index / 16) * Math.PI * 2;
    dummy.position.set(Math.cos(angle) * 14.8, 2.75, Math.sin(angle) * 14.8);
    dummy.rotation.set(0, -angle, 0);
    dummy.updateMatrix();
    columns.setMatrixAt(index, dummy.matrix);
  }
  columns.instanceMatrix.needsUpdate = true;
  group.add(columns);
}

function createAuxiliaryStructures(
  plant: THREE.Group,
  exteriorShells: THREE.Mesh[],
): void {
  const concrete = new THREE.MeshStandardMaterial({
    name: 'auxiliary-building-concrete-shell',
    color: 0x52616c,
    roughness: 0.72,
    metalness: 0.12,
  });
  const roof = new THREE.MeshStandardMaterial({
    name: 'auxiliary-building-metal-roof-shell',
    color: 0x263a49,
    roughness: 0.45,
    metalness: 0.68,
  });
  const hydro = new THREE.MeshStandardMaterial({
    name: 'service-water-tank-shell',
    color: 0x37697b,
    roughness: 0.38,
    metalness: 0.72,
  });

  addShellMesh(
    plant,
    exteriorShells,
    new THREE.BoxGeometry(23, 17, 20),
    concrete,
    'Containment Annex Main Structure Shell',
    [-28, 8.5, 14],
  );
  addShellMesh(
    plant,
    exteriorShells,
    new THREE.BoxGeometry(24, 1.5, 21),
    roof,
    'Containment Annex Roof Shell',
    [-28, 17.7, 14],
  );
  addShellMesh(
    plant,
    exteriorShells,
    new THREE.BoxGeometry(22, 12, 18),
    concrete,
    'Circulating Water Pump House Shell',
    [-35, 6, 25],
  );
  addShellMesh(
    plant,
    exteriorShells,
    new THREE.BoxGeometry(23, 1.2, 19),
    roof,
    'Circulating Water Pump House Roof Shell',
    [-35, 12.5, 25],
  );
  addShellMesh(
    plant,
    exteriorShells,
    new THREE.CylinderGeometry(8.2, 8.2, 12.5, 40),
    hydro,
    'Emergency Service Water Tank Shell',
    [-54, 6.25, 20],
  );
  addShellMesh(
    plant,
    exteriorShells,
    new THREE.SphereGeometry(8.2, 40, 16, 0, Math.PI * 2, 0, Math.PI / 2),
    hydro,
    'Emergency Service Water Tank Dome Shell',
    [-54, 12.5, 20],
  );
  addShellMesh(
    plant,
    exteriorShells,
    new THREE.BoxGeometry(28, 10, 18),
    concrete,
    'Administration Building Shell',
    [55, 5, 54],
  );
  addShellMesh(
    plant,
    exteriorShells,
    new THREE.BoxGeometry(29, 1, 19),
    roof,
    'Administration Building Roof Shell',
    [55, 10.5, 54],
  );
}

function createSwitchyard(plant: THREE.Group): void {
  const group = new THREE.Group();
  group.name = 'Procedural 500 kV Switchyard Machinery';
  group.position.set(55, 0, 4);
  plant.add(group);

  const steel = new THREE.MeshStandardMaterial({
    name: 'switchyard-structural-steel',
    color: 0x4d5c68,
    metalness: 0.9,
    roughness: 0.32,
  });
  const transformer = new THREE.MeshStandardMaterial({
    name: 'switchyard-transformer-metal',
    color: 0x405a53,
    metalness: 0.75,
    roughness: 0.4,
  });
  const energized = new THREE.MeshStandardMaterial({
    name: 'switchyard-energized-bus',
    color: 0xd6c48a,
    emissive: 0xff9b35,
    emissiveIntensity: 0.55,
    metalness: 0.82,
    roughness: 0.22,
  });

  [-13, 0, 13].forEach((x, index) => {
    addInteriorMesh(
      group,
      new THREE.BoxGeometry(8, 8, 7),
      transformer,
      `Main Step Up Transformer ${index + 1}`,
      [x, 4.2, 0],
    );
    for (const offset of [-2.2, 0, 2.2]) {
      addInteriorMesh(
        group,
        new THREE.CylinderGeometry(0.24, 0.42, 4.5, 12),
        energized,
        `Transformer Bushing ${index + 1}-${offset}`,
        [x + offset, 10.3, 0],
      );
    }
  });

  const gantryCount = 18;
  const gantryPosts = configureMesh(
    new THREE.InstancedMesh(
      new THREE.BoxGeometry(0.34, 13, 0.34),
      steel,
      gantryCount,
    ),
    { interior: true },
  );
  gantryPosts.name = 'Instanced Switchyard Gantry Posts';
  const dummy = new THREE.Object3D();
  for (let index = 0; index < gantryCount; index += 1) {
    const row = index < gantryCount / 2 ? -9 : 9;
    const column = index % (gantryCount / 2);
    dummy.position.set(-24 + column * 6, 6.5, row);
    dummy.updateMatrix();
    gantryPosts.setMatrixAt(index, dummy.matrix);
  }
  gantryPosts.instanceMatrix.needsUpdate = true;
  group.add(gantryPosts);

  [-9, 9].forEach((z, rowIndex) => {
    addInteriorMesh(
      group,
      new THREE.BoxGeometry(50, 0.28, 0.28),
      steel,
      `Switchyard Gantry Crossbeam ${rowIndex + 1}`,
      [0, 12.7, z],
    );
    [10.8, 12.2, 13.6].forEach((height, busIndex) => {
      addInteriorMesh(
        group,
        new THREE.CylinderGeometry(0.08, 0.08, 50, 8),
        energized,
        `Energized 500 kV Bus ${rowIndex + 1}-${busIndex + 1}`,
        [0, height, z],
        [0, 0, Math.PI / 2],
      );
    });
  });
}

function createWalkthroughHitTargets(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'Raycast Walkthrough Hit Targets';

  const material = new THREE.MeshBasicMaterial({
    transparent: true,
    opacity: 0,
    depthWrite: false,
    colorWrite: false,
  });

  const reactor = new THREE.Mesh(new THREE.BoxGeometry(42, 48, 42), material);
  reactor.name = 'Reactor Containment Walkthrough Target';
  reactor.position.set(-10, 23, 0);
  reactor.userData.walkthroughChamber = 'reactor' satisfies WalkthroughChamber;

  const turbine = new THREE.Mesh(new THREE.BoxGeometry(70, 27, 30), material);
  turbine.name = 'Turbine Hall Walkthrough Target';
  turbine.position.set(25, 13, 29);
  turbine.userData.walkthroughChamber = 'turbine' satisfies WalkthroughChamber;

  group.add(reactor, turbine);
  return group;
}

function captureShellMaterials(exteriorShells: THREE.Mesh[]): MaterialSnapshot[] {
  const snapshots: MaterialSnapshot[] = [];
  const seen = new Set<THREE.MeshStandardMaterial>();

  exteriorShells.forEach((mesh) => {
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    materials.forEach((material) => {
      if (!(material instanceof THREE.MeshStandardMaterial) || seen.has(material)) return;
      seen.add(material);
      snapshots.push({
        material,
        color: material.color.clone(),
        emissive: material.emissive.clone(),
        emissiveIntensity: material.emissiveIntensity,
        opacity: material.opacity,
        transparent: material.transparent,
        depthWrite: material.depthWrite,
        wireframe: material.wireframe,
        side: material.side,
      });
    });
  });

  return snapshots;
}

export function applyPlantRenderMode(
  plant: ProceduralNuclearPlant,
  mode: RenderShaderMode,
  forceXRay = false,
): void {
  plant.shellMaterials.forEach((snapshot) => {
    const { material } = snapshot;
    material.color.copy(snapshot.color);
    material.emissive.copy(snapshot.emissive);
    material.emissiveIntensity = snapshot.emissiveIntensity;
    material.opacity = snapshot.opacity;
    material.transparent = snapshot.transparent;
    material.depthWrite = snapshot.depthWrite;
    material.wireframe = snapshot.wireframe;
    material.side = snapshot.side;

    if (mode === 'thermal') {
      const isHeatSource = /reactor|turbine|cooling/i.test(material.name);
      material.color.setHex(isHeatSource ? 0xff7138 : 0x245b8f);
      material.emissive.setHex(isHeatSource ? 0x8f2108 : 0x061d35);
      material.emissiveIntensity = isHeatSource ? 0.78 : 0.22;
    } else if (mode === 'cherenkov') {
      material.color.lerp(new THREE.Color(0x6ebfff), 0.42);
      material.emissive.setHex(0x0b4d86);
      material.emissiveIntensity = 0.38;
    } else if (mode === 'flow') {
      material.color.multiplyScalar(0.68);
      material.emissive.setHex(0x08283b);
      material.emissiveIntensity = 0.32;
    }
  });

  const xRayEnabled = mode === 'xray' || forceXRay;
  plant.exteriorShells.forEach((mesh) => {
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    materials.forEach((material) => {
      if (!(material instanceof THREE.MeshStandardMaterial)) return;
      if (xRayEnabled) {
        material.transparent = true;
        material.opacity = XRAY_OPACITY;
        material.depthWrite = false;
        material.side = THREE.DoubleSide;
      }
      material.needsUpdate = true;
    });
    mesh.renderOrder = xRayEnabled ? 4 : 0;
  });
}

export function createProceduralNuclearPlant(): ProceduralNuclearPlant {
  const group = new THREE.Group();
  group.name = 'Fully Procedural Nuclear Digital Twin Campus';
  const exteriorShells: THREE.Mesh[] = [];

  group.add(
    createCampusGround(),
    createCampusTrees(),
    createIndustrialFence(),
    createCampusLightPoles(),
  );

  const reactor = createReactorContainment(group, exteriorShells);
  const turbine = createTurbineHall(group, exteriorShells);
  createAuxiliaryStructures(group, exteriorShells);
  createCoolingTower(group, exteriorShells, [-48, 0, -24], 'North Cooling Tower');
  createCoolingTower(group, exteriorShells, [48, 0, -24], 'South Cooling Tower');
  createSwitchyard(group);

  const flow = createInteriorFlowSystem();
  group.add(flow.group);
  const hitTargets = createWalkthroughHitTargets();
  group.add(hitTargets);

  const plant: ProceduralNuclearPlant = {
    group,
    exteriorShells,
    shellMaterials: captureShellMaterials(exteriorShells),
    reactor,
    turbine,
    flow,
    hitTargets,
  };
  applyPlantRenderMode(plant, 'pbr');
  return plant;
}
