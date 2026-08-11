import * as THREE from 'three';
import { FACILITIES } from '../data/scene1Data';
import {
  createBuildingTextures,
  createLabelSprite,
  disposeObject,
  mulberry32,
} from './utilities';

export interface CityHandle {
  group: THREE.Group;
  update: (t: number, dt: number) => void;
  dispose: () => void;
}

const AVENUE_Z = -180;
const CANAL_X = 250;
const FLOOR = 0.62;

/**
 * Procedural stylized Bangkok Green City: instanced glass skyline, golden
 * chedi, parks, palm trees, EV boulevard, canal bridges and solar arrays.
 * (Offshore wind is provided by the real-scale GLB turbines in the sea.)
 */
export const createCity = (seed: number): CityHandle => {
  const rand = mulberry32(seed);
  const group = new THREE.Group();
  group.name = 'BangkokCity';

  const baseMat = new THREE.MeshStandardMaterial({ color: 0x4a5058, roughness: 1 });
  const asphaltMat = new THREE.MeshStandardMaterial({ color: 0x33383f, roughness: 0.96 });
  const grassMat = new THREE.MeshStandardMaterial({ color: 0x5f9c50, roughness: 1 });
  const concreteMat = new THREE.MeshStandardMaterial({ color: 0x9aa2ab, roughness: 0.9 });

  const ground = new THREE.Mesh(new THREE.PlaneGeometry(560, 520), baseMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(270, FLOOR - 0.04, 5);
  ground.receiveShadow = true;
  group.add(ground);

  const avenue = new THREE.Mesh(new THREE.PlaneGeometry(800, 11), asphaltMat);
  avenue.rotation.x = -Math.PI / 2;
  avenue.position.set(180, FLOOR + 0.02, AVENUE_Z);
  avenue.receiveShadow = true;
  group.add(avenue);

  for (const z of [-140, -90, -40, 10, 60, 110, 160, 210]) {
    const street = new THREE.Mesh(new THREE.PlaneGeometry(400, 7), asphaltMat);
    street.rotation.x = -Math.PI / 2;
    street.position.set(270, FLOOR + 0.02, z);
    street.receiveShadow = true;
    group.add(street);
  }

  const parks: [number, number, number][] = [
    [130, 140, 34],
    [300, -160, 30],
    [420, 60, 28],
    [90, -60, 24],
  ];
  for (const [px, pz, pr] of parks) {
    const p = new THREE.Mesh(new THREE.CircleGeometry(pr, 28), grassMat);
    p.rotation.x = -Math.PI / 2;
    p.position.set(px, FLOOR + 0.06, pz);
    p.receiveShadow = true;
    group.add(p);
  }

  const pondMat = new THREE.MeshStandardMaterial({ color: 0x0d5a7a, roughness: 0.15, metalness: 0.4 });
  const pond = new THREE.Mesh(new THREE.CircleGeometry(10, 24), pondMat);
  pond.rotation.x = -Math.PI / 2;
  pond.position.set(122, FLOOR + 0.08, 150);
  group.add(pond);

  // Golden chedi (Bangkok cultural accent) inside park 1
  const goldMat = new THREE.MeshStandardMaterial({
    color: 0xe0b44c,
    roughness: 0.35,
    metalness: 0.7,
    emissive: 0x6b4d00,
    emissiveIntensity: 0.15,
  });
  const chediBase = new THREE.Mesh(new THREE.CylinderGeometry(10, 12, 3, 16), goldMat);
  chediBase.position.set(150, FLOOR + 1.5, 160);
  const chediCone = new THREE.Mesh(new THREE.ConeGeometry(9, 20, 16), goldMat);
  chediCone.position.set(150, FLOOR + 4, 160);
  const chediTop = new THREE.Mesh(new THREE.SphereGeometry(3.4, 12, 10), goldMat);
  chediTop.position.set(150, FLOOR + 24, 160);
  chediBase.castShadow = true;
  group.add(chediBase, chediCone, chediTop);

  // ---- Instanced glass tower skyline ----
  const { map, emissive } = createBuildingTextures(seed ^ 0x77);
  const towerGeo = new THREE.BoxGeometry(1, 1, 1);
  const towerMat = new THREE.MeshStandardMaterial({
    map,
    emissiveMap: emissive,
    emissive: 0xffffff,
    emissiveIntensity: 0.9,
    roughness: 0.45,
    metalness: 0.25,
  });
  const TOWER_COUNT = 230;
  const towers = new THREE.InstancedMesh(towerGeo, towerMat, TOWER_COUNT);
  towers.castShadow = true;
  towers.receiveShadow = true;

  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const pos = new THREE.Vector3();
  const s = new THREE.Vector3();
  const tint = new THREE.Color();

  let placed = 0;
  let guard = 0;
  while (placed < TOWER_COUNT && guard < 30000) {
    guard++;
    const x = 60 + rand() * 420;
    const z = -230 + rand() * 460;
    if (Math.abs(x - CANAL_X) < 17) continue;
    if (Math.abs(z - AVENUE_Z) < 10) continue;
    if (Math.hypot(x - 130, z - 140) < 34) continue;
    if (Math.hypot(x - 300, z + 160) < 30) continue;
    if (Math.hypot(x - 420, z - 60) < 28) continue;
    if (Math.hypot(x - 90, z + 60) < 24) continue;
    if (Math.hypot(x - 195, z - 55) < 26) continue;
    if (Math.hypot(x - 288, z - 18) < 20 || Math.hypot(x - 288, z - 92) < 20) continue;
    if (Math.hypot(x - 330, z + 60) < 18) continue;
    if (Math.hypot(x - 410, z - 120) < 30) continue;
    if (Math.hypot(x - 310, z + 110) < 28) continue;
    const h = 16 + Math.pow(rand(), 2.4) * 130;
    const w = 13 + rand() * 9;
    const d = 12 + rand() * 7;
    pos.set(x, FLOOR + h / 2, z);
    s.set(w, h, d);
    q.identity();
    m4.compose(pos, q, s);
    towers.setMatrixAt(placed, m4);
    tint.setRGB(0.72 + rand() * 0.28, 0.72 + rand() * 0.28, 0.76 + rand() * 0.24);
    towers.setColorAt(placed, tint);
    placed++;
  }
  towers.count = placed;
  towers.instanceMatrix.needsUpdate = true;
  if (towers.instanceColor) towers.instanceColor.needsUpdate = true;
  group.add(towers);

  // ---- Landmarks ----
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x8fb4c9,
    roughness: 0.25,
    metalness: 0.35,
    emissive: 0x1a3a52,
    emissiveIntensity: 0.25,
  });

  const spireMat = new THREE.MeshStandardMaterial({
    color: 0x2f8f5c,
    roughness: 0.3,
    metalness: 0.1,
    emissive: 0x0a3d24,
    emissiveIntensity: 0.35,
  });
  const spire = new THREE.Mesh(new THREE.CylinderGeometry(5.5, 10, 150, 8), spireMat);
  spire.position.set(195, FLOOR + 75, 55);
  spire.castShadow = true;
  const spireCrown = new THREE.Mesh(
    new THREE.BoxGeometry(8, 4, 8),
    new THREE.MeshStandardMaterial({
      color: 0x0e2f1e,
      emissive: 0x34ff9c,
      emissiveIntensity: 1.6,
      roughness: 0.4,
    })
  );
  spireCrown.position.set(195, FLOOR + 152, 55);
  group.add(spire, spireCrown);

  for (const [tz, scale] of [
    [-18, 1],
    [92, 0.82],
  ] as [number, number][]) {
    const twin = new THREE.Mesh(new THREE.BoxGeometry(26 * scale, 115 * scale, 26 * scale), glassMat);
    twin.position.set(288, FLOOR + (115 * scale) / 2, tz);
    twin.castShadow = true;
    group.add(twin);
  }

  const obs = new THREE.Mesh(new THREE.CylinderGeometry(13, 15, 90, 12), glassMat);
  obs.position.set(330, FLOOR + 45, -60);
  obs.castShadow = true;
  group.add(obs);

  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(26, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2),
    new THREE.MeshStandardMaterial({ color: 0xd8dde2, roughness: 0.35, metalness: 0.2 })
  );
  dome.position.set(410, FLOOR, 120);
  dome.castShadow = true;
  group.add(dome);

  // ---- Palm trees (instanced) ----
  const trunkGeo = new THREE.CylinderGeometry(0.32, 0.5, 6, 6);
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x6d4a2f, roughness: 1 });
  const foliageGeo = new THREE.IcosahedronGeometry(3.1, 1);
  const foliageMat = new THREE.MeshStandardMaterial({ roughness: 1, flatShading: true });

  const treeSpots: [number, number][] = [];
  for (let x = -200; x <= 560; x += 16) {
    treeSpots.push([x, AVENUE_Z - 10], [x + 8, AVENUE_Z + 10]);
  }
  for (let z = -260; z <= 260; z += 26) {
    treeSpots.push([CANAL_X - 9, z], [CANAL_X + 9, z + 13]);
  }
  for (const [px, pz, pr] of parks) {
    for (let i = 0; i < 20; i++) {
      const a = rand() * Math.PI * 2;
      const r = rand() * (pr - 6);
      treeSpots.push([px + Math.cos(a) * r, pz + Math.sin(a) * r]);
    }
  }
  for (let i = 0; i < 12; i++) {
    const a = rand() * Math.PI * 2;
    const r = 14 + rand() * 8;
    treeSpots.push([310 + Math.cos(a) * r, -110 + Math.sin(a) * r]);
  }

  const trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, treeSpots.length);
  trunks.castShadow = true;
  const foliages = new THREE.InstancedMesh(foliageGeo, foliageMat, treeSpots.length);
  const fcol = new THREE.Color();
  treeSpots.forEach(([tx, tz], i) => {
    const scale = 0.8 + rand() * 0.7;
    pos.set(tx, FLOOR + 3 * scale, tz);
    s.set(scale, scale, scale);
    q.identity();
    m4.compose(pos, q, s);
    trunks.setMatrixAt(i, m4);
    pos.set(tx, FLOOR + 3 * scale + 3.1 * scale * 0.75, tz);
    s.set(scale, scale * 0.75, scale);
    m4.compose(pos, q, s);
    foliages.setMatrixAt(i, m4);
    const g = 0.6 + rand() * 0.4;
    fcol.setRGB(0.22 * g, 0.62 * g, 0.24 * g);
    foliages.setColorAt(i, fcol);
  });
  trunks.instanceMatrix.needsUpdate = true;
  foliages.instanceMatrix.needsUpdate = true;
  if (foliages.instanceColor) foliages.instanceColor.needsUpdate = true;
  group.add(trunks, foliages);

  // ---- Street lights (instanced) ----
  const poleGeo = new THREE.CylinderGeometry(0.14, 0.2, 7.5, 6);
  const poleMat = new THREE.MeshStandardMaterial({ color: 0x2b3038, roughness: 0.7, metalness: 0.5 });
  const lampGeo = new THREE.BoxGeometry(0.7, 0.35, 1.4);
  const lampMat = new THREE.MeshStandardMaterial({
    color: 0xd9e4ec,
    emissive: 0xffedc0,
    emissiveIntensity: 1.3,
    roughness: 0.5,
  });
  const lightSpots: [number, number][] = [];
  for (let x = -200; x <= 560; x += 40) {
    lightSpots.push([x, AVENUE_Z - 10.5], [x, AVENUE_Z + 10.5]);
  }
  for (let z = -240; z <= 240; z += 60) {
    lightSpots.push([CANAL_X - 11, z], [CANAL_X + 11, z + 30]);
  }
  const poles = new THREE.InstancedMesh(poleGeo, poleMat, lightSpots.length);
  const lamps = new THREE.InstancedMesh(lampGeo, lampMat, lightSpots.length);
  lightSpots.forEach(([lx, lz], i) => {
    pos.set(lx, FLOOR + 3.75, lz);
    s.set(1, 1, 1);
    q.identity();
    m4.compose(pos, q, s);
    poles.setMatrixAt(i, m4);
    pos.set(lx, FLOOR + 7.6, lz);
    m4.compose(pos, q, s);
    lamps.setMatrixAt(i, m4);
  });
  poles.instanceMatrix.needsUpdate = true;
  lamps.instanceMatrix.needsUpdate = true;
  group.add(poles, lamps);

  // ---- EV traffic (instanced cars driving the boulevard) ----
  const carBodyGeo = new THREE.BoxGeometry(2.1, 0.7, 4.3);
  const carRoofGeo = new THREE.BoxGeometry(1.7, 0.55, 2.2);
  const carMat = new THREE.MeshStandardMaterial({ roughness: 0.25, metalness: 0.55 });
  const carCount = 16;
  const bodies = new THREE.InstancedMesh(carBodyGeo, carMat, carCount);
  const roofs = new THREE.InstancedMesh(carRoofGeo, carMat, carCount);
  const cars: { start: number; dir: number; speed: number }[] = [];
  const carTint = new THREE.Color();
  for (let i = 0; i < carCount; i++) {
    const start = -190 + rand() * 740;
    const lane = rand() < 0.5 ? -2.4 : 2.4;
    cars.push({ start, dir: rand() < 0.5 ? 1 : -1, speed: 3.5 + rand() * 5 });
    pos.set(start, FLOOR + 0.95, AVENUE_Z + lane);
    q.identity();
    m4.compose(pos, q, new THREE.Vector3(1, 1, 1));
    bodies.setMatrixAt(i, m4);
    roofs.setMatrixAt(i, m4);
    carTint.setRGB(0.35 + rand() * 0.65, 0.35 + rand() * 0.65, 0.4 + rand() * 0.6);
    bodies.setColorAt(i, carTint);
    roofs.setColorAt(i, carTint);
  }
  bodies.instanceMatrix.needsUpdate = true;
  roofs.instanceMatrix.needsUpdate = true;
  if (bodies.instanceColor) bodies.instanceColor.needsUpdate = true;
  if (roofs.instanceColor) roofs.instanceColor.needsUpdate = true;
  group.add(bodies, roofs);

  // ---- Solar arrays ----
  const panelGeo = new THREE.BoxGeometry(3.4, 0.12, 2.3);
  const panelMat = new THREE.MeshStandardMaterial({
    color: 0x14314d,
    roughness: 0.3,
    metalness: 0.15,
    emissive: 0x0a2740,
    emissiveIntensity: 0.35,
  });
  const solarSpots: { x: number; z: number; yaw: number }[] = [];
  for (const [ax, az] of [
    [312, -148],
    [428, 50],
    [78, -72],
  ] as [number, number][]) {
    for (let gx = 0; gx < 3; gx++) {
      for (let gz = 0; gz < 2; gz++) {
        solarSpots.push({ x: ax + gx * 4.4, z: az + gz * 3.2, yaw: 0.15 });
      }
    }
  }
  for (let gx = 0; gx < 2; gx++) {
    solarSpots.push({ x: 302 + gx * 3.8, z: -110, yaw: 0 });
  }
  const panels = new THREE.InstancedMesh(panelGeo, panelMat, solarSpots.length);
  const tilt = -0.35;
  solarSpots.forEach(({ x, z, yaw }, i) => {
    pos.set(x, FLOOR + 1.6, z);
    q.setFromEuler(new THREE.Euler(tilt, 0, yaw));
    m4.compose(pos, q, new THREE.Vector3(1, 1, 1));
    panels.setMatrixAt(i, m4);
  });
  panels.instanceMatrix.needsUpdate = true;
  group.add(panels);

  // ---- Canal + bridges ----
  const canalMat = new THREE.MeshStandardMaterial({
    color: 0x0b4a66,
    roughness: 0.15,
    metalness: 0.35,
    emissive: 0x0a3f5c,
    emissiveIntensity: 0.35,
  });
  const canal = new THREE.Mesh(new THREE.PlaneGeometry(14, 600), canalMat);
  canal.rotation.x = -Math.PI / 2;
  canal.position.set(CANAL_X, FLOOR - 1.6, 0);
  group.add(canal);

  const bankMat = new THREE.MeshStandardMaterial({ color: 0x7c8189, roughness: 0.95 });
  for (const side of [-1, 1]) {
    const bank = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.6, 600), bankMat);
    bank.position.set(CANAL_X + side * 7.8, FLOOR - 0.15, 0);
    group.add(bank);
  }

  for (const bz of [-180, 90]) {
    const deck = new THREE.Mesh(new THREE.BoxGeometry(22, 1.2, 16), concreteMat);
    deck.position.set(CANAL_X, FLOOR + 1.9, bz);
    deck.castShadow = true;
    group.add(deck);
    for (const side of [-1, 1]) {
      const pylon = new THREE.Mesh(new THREE.BoxGeometry(2, 7, 2), concreteMat);
      pylon.position.set(CANAL_X + side * 8.5, FLOOR + 3.5, bz);
      group.add(pylon);
      const rail = new THREE.Mesh(new THREE.BoxGeometry(22, 0.5, 0.25), concreteMat);
      rail.position.set(CANAL_X, FLOOR + 2.7, bz + side * 7.5);
      group.add(rail);
    }
  }

  // ---- District Zone (plaza + mid-rises with green roofs) ----
  const [dzx, , dzz] = FACILITIES.districtZone.position;
  const plaza = new THREE.Mesh(new THREE.CircleGeometry(24, 30), concreteMat);
  plaza.rotation.x = -Math.PI / 2;
  plaza.position.set(dzx, FLOOR + 0.06, dzz);
  plaza.receiveShadow = true;
  group.add(plaza);

  const creamMat = new THREE.MeshStandardMaterial({ color: 0xe8e0d0, roughness: 0.85 });
  const greenRoofMat = new THREE.MeshStandardMaterial({ color: 0x3f7d4a, roughness: 1 });
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const r = 15;
    const h = 13 + rand() * 12;
    const bw = 11 + rand() * 6;
    const bd = 10 + rand() * 5;
    const bx = dzx + Math.cos(a) * r;
    const bz = dzz + Math.sin(a) * r;
    const b = new THREE.Mesh(new THREE.BoxGeometry(bw, h, bd), creamMat);
    b.position.set(bx, FLOOR + h / 2, bz);
    b.castShadow = true;
    group.add(b);
    const roof = new THREE.Mesh(
      new THREE.BoxGeometry(bw * 0.7, 0.5, bd * 0.7),
      greenRoofMat
    );
    roof.position.set(bx, FLOOR + h + 0.25, bz);
    group.add(roof);
  }

  // ---- City label ----
  const cityLabel = createLabelSprite('BANGKOK GREEN CITY', { scale: 2.4, sub: 'Powered by NUWARD SMR' });
  cityLabel.position.set(210, 205, 60);
  group.add(cityLabel);

  // ---- Animation ----
  const update = (t: number, _dt: number) => {
    for (let i = 0; i < cars.length; i++) {
      const car = cars[i];
      const range = 740;
      const nx = (((car.start + car.dir * (t * car.speed)) - -190) % range + range) % range - 190;
      pos.set(nx, FLOOR + 0.95, AVENUE_Z + (car.dir > 0 ? -2.4 : 2.4));
      q.identity();
      m4.compose(pos, q, new THREE.Vector3(1, 1, 1));
      bodies.setMatrixAt(i, m4);
      roofs.setMatrixAt(i, m4);
    }
    bodies.instanceMatrix.needsUpdate = true;
    roofs.instanceMatrix.needsUpdate = true;
    canalMat.emissiveIntensity = 0.3 + Math.sin(t * 0.7) * 0.1;
  };

  const dispose = () => {
    disposeObject(group);
  };

  return { group, update, dispose };
};
