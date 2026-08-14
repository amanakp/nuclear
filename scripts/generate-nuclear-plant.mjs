import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';

if (typeof globalThis.FileReader === 'undefined') {
  globalThis.FileReader = class FileReader {
    result = null;
    onload = null;
    onloadend = null;
    onerror = null;

    readAsArrayBuffer(blob) {
      blob.arrayBuffer()
        .then((result) => {
          this.result = result;
          this.onload?.({ target: this });
          this.onloadend?.({ target: this });
        })
        .catch((error) => this.onerror?.(error));
    }

    readAsDataURL(blob) {
      blob.arrayBuffer()
        .then((result) => {
          this.result = `data:${blob.type};base64,${Buffer.from(result).toString('base64')}`;
          this.onload?.({ target: this });
          this.onloadend?.({ target: this });
        })
        .catch((error) => this.onerror?.(error));
    }
  };
}

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const outputDirectory = path.resolve(scriptDirectory, '../public/models');
const outputFile = path.join(outputDirectory, 'nuclear_plant.glb');

const scene = new THREE.Scene();
scene.name = 'Nuclear Power Plant Exterior';

const plant = new THREE.Group();
plant.name = 'Nuclear Plant Campus';
scene.add(plant);

const materials = {
  siteConcrete: new THREE.MeshStandardMaterial({
    name: 'site-concrete',
    color: 0xa8a79f,
    roughness: 0.94,
    metalness: 0,
  }),
  coolingConcrete: new THREE.MeshStandardMaterial({
    name: 'cooling-tower-concrete',
    color: 0xc5c5be,
    roughness: 0.9,
    metalness: 0,
  }),
  coolingWeathering: new THREE.MeshStandardMaterial({
    name: 'cooling-tower-weathering',
    color: 0x9fa59f,
    roughness: 0.98,
    metalness: 0,
  }),
  containmentConcrete: new THREE.MeshStandardMaterial({
    name: 'containment-concrete',
    color: 0xb6b9b7,
    roughness: 0.82,
    metalness: 0.02,
  }),
  containmentBand: new THREE.MeshStandardMaterial({
    name: 'containment-band',
    color: 0x7f898d,
    roughness: 0.74,
    metalness: 0.12,
  }),
  buildingConcrete: new THREE.MeshStandardMaterial({
    name: 'building-concrete',
    color: 0xd0d2ce,
    roughness: 0.84,
    metalness: 0.01,
  }),
  roofMetal: new THREE.MeshStandardMaterial({
    name: 'roof-metal',
    color: 0x65737a,
    roughness: 0.48,
    metalness: 0.58,
  }),
  darkMetal: new THREE.MeshStandardMaterial({
    name: 'dark-industrial-metal',
    color: 0x38454b,
    roughness: 0.5,
    metalness: 0.68,
  }),
  galvanized: new THREE.MeshStandardMaterial({
    name: 'galvanized-metal',
    color: 0x9ca8ab,
    roughness: 0.4,
    metalness: 0.72,
  }),
  pipeBlue: new THREE.MeshStandardMaterial({
    name: 'cooling-water-pipe',
    color: 0x3d7892,
    roughness: 0.38,
    metalness: 0.56,
  }),
  pipeRed: new THREE.MeshStandardMaterial({
    name: 'thermal-pipe',
    color: 0xa34f43,
    roughness: 0.42,
    metalness: 0.48,
  }),
  asphalt: new THREE.MeshStandardMaterial({
    name: 'asphalt-road',
    color: 0x3c4140,
    roughness: 1,
    metalness: 0,
  }),
  roadMarking: new THREE.MeshStandardMaterial({
    name: 'road-marking',
    color: 0xe6dfb9,
    roughness: 0.9,
    metalness: 0,
  }),
  glass: new THREE.MeshStandardMaterial({
    name: 'industrial-glass',
    color: 0x7fa5b4,
    roughness: 0.18,
    metalness: 0.18,
    transparent: true,
    opacity: 0.68,
    depthWrite: false,
  }),
  transformer: new THREE.MeshStandardMaterial({
    name: 'transformer-generation-equipment',
    color: 0x64745d,
    roughness: 0.54,
    metalness: 0.5,
  }),
  copper: new THREE.MeshStandardMaterial({
    name: 'transformer-copper',
    color: 0x9b653f,
    roughness: 0.34,
    metalness: 0.78,
  }),
  insulator: new THREE.MeshStandardMaterial({
    name: 'switchyard-insulator',
    color: 0x6f4239,
    roughness: 0.28,
    metalness: 0.04,
  }),
  ventDark: new THREE.MeshStandardMaterial({
    name: 'cooling-tower-interior',
    color: 0x1f292a,
    roughness: 0.98,
    metalness: 0,
  }),
  safetyYellow: new THREE.MeshStandardMaterial({
    name: 'safety-marking',
    color: 0xd7a91f,
    roughness: 0.56,
    metalness: 0.18,
  }),
};

function addMesh(parent, geometry, material, name, position, rotation = [0, 0, 0], scale = [1, 1, 1]) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = name;
  mesh.position.set(...position);
  mesh.rotation.set(...rotation);
  mesh.scale.set(...scale);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function addBox(parent, name, size, position, material, rotation = [0, 0, 0]) {
  return addMesh(
    parent,
    new THREE.BoxGeometry(...size),
    material,
    name,
    position,
    rotation,
  );
}

function addCylinder(parent, name, radiusTop, radiusBottom, height, position, material, radialSegments = 32, rotation = [0, 0, 0]) {
  return addMesh(
    parent,
    new THREE.CylinderGeometry(radiusTop, radiusBottom, height, radialSegments),
    material,
    name,
    position,
    rotation,
  );
}

function addCoolingTower(x, z, label) {
  const tower = new THREE.Group();
  tower.name = `${label} Cooling Tower`;
  tower.position.set(x, 0, z);
  plant.add(tower);

  const profile = [
    new THREE.Vector2(17.8, 0),
    new THREE.Vector2(17.5, 3),
    new THREE.Vector2(15.4, 12),
    new THREE.Vector2(12.2, 26),
    new THREE.Vector2(9.8, 42),
    new THREE.Vector2(9.6, 51),
    new THREE.Vector2(11.4, 62),
  ];

  addMesh(
    tower,
    new THREE.LatheGeometry(profile, 72),
    materials.coolingConcrete,
    `${label} Hyperbolic Concrete Shell`,
    [0, 0, 0],
  );

  addMesh(
    tower,
    new THREE.CircleGeometry(10.9, 72),
    materials.ventDark,
    `${label} Tower Opening`,
    [0, 61.9, 0],
    [-Math.PI / 2, 0, 0],
  );

  [1.2, 13, 27, 42, 51, 61.6].forEach((height, index) => {
    const radius = [17.7, 15.2, 12, 9.8, 9.6, 11.35][index];
    addMesh(
      tower,
      new THREE.TorusGeometry(radius, index === 0 ? 0.34 : 0.18, 10, 72),
      index % 2 === 0 ? materials.coolingWeathering : materials.coolingConcrete,
      `${label} Structural Ring ${index + 1}`,
      [0, height, 0],
      [Math.PI / 2, 0, 0],
    );
  });

  for (let index = 0; index < 18; index += 1) {
    const angle = (index / 18) * Math.PI * 2;
    addCylinder(
      tower,
      `${label} Base Column ${index + 1}`,
      0.35,
      0.42,
      4.2,
      [Math.cos(angle) * 16.8, 2.1, Math.sin(angle) * 16.8],
      materials.coolingWeathering,
      12,
    );
  }

}

function addContainmentBuilding() {
  const group = new THREE.Group();
  group.name = 'Unit 2 Containment Complex';
  group.position.set(-10, 0, 0);
  plant.add(group);

  addCylinder(group, 'Containment Reinforced Concrete Wall', 16, 16.7, 26, [0, 13, 0], materials.containmentConcrete, 72);
  addMesh(
    group,
    new THREE.SphereGeometry(16, 72, 32, 0, Math.PI * 2, 0, Math.PI / 2),
    materials.containmentConcrete,
    'Containment Concrete Dome',
    [0, 26, 0],
  );

  [2, 9, 18, 25.6].forEach((height, index) => {
    addMesh(
      group,
      new THREE.TorusGeometry(index === 3 ? 15.7 : 16.15, 0.24, 10, 72),
      materials.containmentBand,
      `Containment Seismic Band ${index + 1}`,
      [0, height, 0],
      [Math.PI / 2, 0, 0],
    );
  });

  addBox(group, 'Containment Equipment Airlock', [7, 7, 5], [0, 5, 17.2], materials.darkMetal);
  addBox(group, 'Containment Airlock Door', [4.8, 4.8, 0.4], [0, 5, 19.85], materials.safetyYellow);
  addCylinder(group, 'Containment Vent Stack', 1.3, 1.7, 20, [11, 25, -3], materials.galvanized, 32);
  addCylinder(group, 'Containment Vent Cap', 1.65, 1.65, 0.8, [11, 35.1, -3], materials.darkMetal, 32);

  const annex = new THREE.Group();
  annex.name = 'Containment Auxiliary Annex';
  group.add(annex);
  addBox(annex, 'Annex Main Structure', [27, 13, 16], [-14, 6.5, 14], materials.buildingConcrete);
  addBox(annex, 'Annex Roof', [28, 1.2, 17], [-14, 13.5, 14], materials.roofMetal);
  for (let index = 0; index < 6; index += 1) {
    addBox(
      annex,
      `Annex Window Bank ${index + 1}`,
      [2.8, 2.1, 0.25],
      [-24 + index * 4, 8.2, 22.1],
      materials.glass,
    );
  }
}

function addTurbineHall() {
  const group = new THREE.Group();
  group.name = 'Turbine Generator Hall';
  group.position.set(25, 0, 29);
  plant.add(group);

  addBox(group, 'Turbine Hall Concrete Base', [66, 4, 26], [0, 2, 0], materials.buildingConcrete);
  addBox(group, 'Turbine Hall Main Volume', [64, 15, 24], [0, 11.5, 0], materials.buildingConcrete);
  addBox(group, 'Turbine Hall Metal Roof', [66, 1.8, 26], [0, 20, 0], materials.roofMetal);

  for (let index = 0; index < 17; index += 1) {
    addBox(
      group,
      `Turbine Hall Roof Rib ${index + 1}`,
      [0.35, 0.5, 26.6],
      [-32 + index * 4, 21.1, 0],
      materials.galvanized,
    );
  }

  for (let index = 0; index < 12; index += 1) {
    const x = -28 + index * 5.1;
    addBox(group, `Turbine Hall Clerestory ${index + 1}`, [3.4, 2.3, 0.25], [x, 15, 12.15], materials.glass);
  }

  addBox(group, 'Turbine Hall Rollup Door A', [8, 8, 0.35], [-21, 6, 12.2], materials.darkMetal);
  addBox(group, 'Turbine Hall Rollup Door B', [8, 8, 0.35], [21, 6, 12.2], materials.darkMetal);

  addCylinder(group, 'Turbine Hall Exhaust Stack A', 1.1, 1.45, 16, [-20, 29, -5], materials.galvanized, 32);
  addCylinder(group, 'Turbine Hall Exhaust Stack B', 1.1, 1.45, 16, [20, 29, -5], materials.galvanized, 32);
}

function addCoolingWaterInfrastructure() {
  const group = new THREE.Group();
  group.name = 'Cooling Water Infrastructure';
  group.position.set(-35, 0, 25);
  plant.add(group);

  addBox(group, 'Cooling Water Pump House', [25, 10, 17], [0, 5, 0], materials.buildingConcrete);
  addBox(group, 'Pump House Roof', [26, 1, 18], [0, 10.5, 0], materials.roofMetal);

  for (let index = 0; index < 4; index += 1) {
    addCylinder(
      group,
      `Circulating Water Intake ${index + 1}`,
      1.2,
      1.2,
      12,
      [-8 + index * 5.4, 3.2, 13],
      materials.pipeBlue,
      28,
      [Math.PI / 2, 0, 0],
    );
  }

  [-4.2, 4.2].forEach((offset, index) => {
    addCylinder(
      group,
      `Cooling Water Header ${index + 1}`,
      0.85,
      0.85,
      53,
      [offset, 7.5, -25],
      materials.pipeBlue,
      24,
      [Math.PI / 2, 0, 0],
    );
  });

  for (let index = 0; index < 7; index += 1) {
    addBox(
      group,
      `Pipe Rack Support ${index + 1}`,
      [0.6, 7.8, 6],
      [-12 + index * 4, 4, -10],
      materials.galvanized,
    );
  }

  addCylinder(group, 'Emergency Service Water Tank', 6, 6.4, 11, [-19, 5.5, -5], materials.galvanized, 48);
  addMesh(
    group,
    new THREE.SphereGeometry(6, 48, 20, 0, Math.PI * 2, 0, Math.PI / 2),
    materials.galvanized,
    'Emergency Water Tank Dome',
    [-19, 11, -5],
  );
}

function addSwitchyard() {
  const group = new THREE.Group();
  group.name = '500 kV Switchyard';
  group.position.set(55, 0, 4);
  plant.add(group);

  addBox(group, 'Switchyard Gravel Pad', [38, 0.5, 32], [0, 0.45, 0], materials.siteConcrete);

  for (let row = 0; row < 3; row += 1) {
    for (let column = 0; column < 5; column += 1) {
      const x = -14 + column * 7;
      const z = -10 + row * 10;
      addCylinder(group, `Switchyard Insulator ${row + 1}-${column + 1}`, 0.35, 0.45, 5.5, [x, 3.2, z], materials.insulator, 16);
      addBox(group, `Switchyard Busbar ${row + 1}-${column + 1}`, [6.4, 0.24, 0.24], [x + 3.2, 6.1, z], materials.galvanized);
    }
  }

  for (let index = 0; index < 3; index += 1) {
    const transformer = new THREE.Group();
    transformer.name = `Main Transformer ${index + 1}`;
    transformer.position.set(-10 + index * 10, 0, 8);
    group.add(transformer);

    addBox(transformer, 'Transformer Tank', [7.5, 5.5, 5.5], [0, 3.2, 0], materials.transformer);
    for (let fin = 0; fin < 8; fin += 1) {
      addBox(transformer, `Cooling Fin ${fin + 1}`, [0.18, 4.7, 6.2], [-3 + fin * 0.85, 3.2, 0], materials.darkMetal);
    }
    for (let bushing = 0; bushing < 3; bushing += 1) {
      addCylinder(transformer, `Copper Bushing ${bushing + 1}`, 0.24, 0.38, 3.4, [-2 + bushing * 2, 7.1, 0], materials.copper, 16);
    }
  }

  for (const x of [-18, 18]) {
    addBox(group, `Transmission Gantry Leg ${x}`, [0.8, 18, 0.8], [x, 9, -14], materials.galvanized);
  }
  addBox(group, 'Transmission Gantry Crossbeam', [37, 0.8, 0.8], [0, 17.5, -14], materials.galvanized);
}

function addSiteDetails() {
  addBox(plant, 'Main Concrete Plant Pad', [158, 0.8, 104], [0, 0.4, 0], materials.siteConcrete);
  addBox(plant, 'East West Service Road', [154, 0.12, 11], [0, 0.86, 45], materials.asphalt);
  addBox(plant, 'North South Service Road', [10, 0.13, 92], [8, 0.87, 0], materials.asphalt);
  addBox(plant, 'Cooling Tower Access Road', [118, 0.13, 8], [0, 0.88, -48], materials.asphalt);

  for (let index = 0; index < 18; index += 1) {
    addBox(
      plant,
      `Road Center Mark ${index + 1}`,
      [4, 0.05, 0.22],
      [-68 + index * 8, 0.95, 45],
      materials.roadMarking,
    );
  }

  const admin = new THREE.Group();
  admin.name = 'Operations and Administration Building';
  admin.position.set(-8, 0, 49);
  plant.add(admin);
  addBox(admin, 'Administration Building', [34, 8, 13], [0, 4, 0], materials.buildingConcrete);
  addBox(admin, 'Administration Roof', [35, 0.9, 14], [0, 8.5, 0], materials.roofMetal);
  for (let index = 0; index < 8; index += 1) {
    addBox(admin, `Administration Window ${index + 1}`, [2.4, 1.8, 0.2], [-13 + index * 3.7, 4.8, -6.6], materials.glass);
  }

  const pipeBridge = new THREE.Group();
  pipeBridge.name = 'Elevated Process Pipe Bridge';
  plant.add(pipeBridge);
  for (let index = 0; index < 9; index += 1) {
    addBox(pipeBridge, `Pipe Bridge Support ${index + 1}`, [0.7, 8, 5], [-25 + index * 6.5, 4.5, 15], materials.galvanized);
  }
  addCylinder(pipeBridge, 'Thermal Process Pipe', 0.55, 0.55, 55, [1, 8.4, 13.5], materials.pipeRed, 24, [0, 0, Math.PI / 2]);
  addCylinder(pipeBridge, 'Cooling Process Pipe', 0.62, 0.62, 55, [1, 9.7, 16.5], materials.pipeBlue, 24, [0, 0, Math.PI / 2]);

  for (let index = 0; index < 10; index += 1) {
    const x = -68 + index * 15;
    addCylinder(plant, `Perimeter Light Pole ${index + 1}`, 0.15, 0.22, 11, [x, 6.2, 51], materials.darkMetal, 12);
    addBox(plant, `Perimeter Light Head ${index + 1}`, [1.8, 0.5, 0.8], [x, 11.7, 51], materials.galvanized);
  }
}

addSiteDetails();
addCoolingTower(-48, -24, 'North');
addCoolingTower(48, -24, 'South');
addContainmentBuilding();
addTurbineHall();
addCoolingWaterInfrastructure();
addSwitchyard();

scene.traverse((object) => {
  if (!(object instanceof THREE.Mesh)) return;
  object.geometry.computeVertexNormals();
});

await fs.mkdir(outputDirectory, { recursive: true });

const exporter = new GLTFExporter();
const result = await exporter.parseAsync(scene, {
  binary: true,
  onlyVisible: true,
  trs: false,
});

await fs.writeFile(outputFile, Buffer.from(result));
const stats = await fs.stat(outputFile);
console.log(`Generated ${outputFile} (${Math.round(stats.size / 1024)} KiB)`);
