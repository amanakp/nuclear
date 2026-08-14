import * as THREE from 'three';
import { FACILITIES } from '../data/scene1Data';
import { createGlowTexture, createLabelSprite, disposeObject } from './utilities';

export interface FacilitiesHandle {
  group: THREE.Group;
  update: (t: number) => void;
  dispose: () => void;
}

interface FacilityMats {
  concrete: THREE.MeshStandardMaterial;
  white: THREE.MeshStandardMaterial;
  steel: THREE.MeshStandardMaterial;
  panelMat: THREE.MeshStandardMaterial;
  windowMat: THREE.MeshStandardMaterial;
}

const makeMaterials = (): FacilityMats => ({
  concrete: new THREE.MeshStandardMaterial({ color: 0xb9bfc7, roughness: 0.9 }),
  white: new THREE.MeshStandardMaterial({
    color: 0xe8ecef,
    roughness: 0.35,
    metalness: 0.05,
  }),
  steel: new THREE.MeshStandardMaterial({
    color: 0x9aa2ab,
    roughness: 0.4,
    metalness: 0.6,
  }),
  panelMat: new THREE.MeshStandardMaterial({
    color: 0x14314d,
    roughness: 0.3,
    metalness: 0.15,
    emissive: 0x0a2740,
    emissiveIntensity: 0.35,
  }),
  windowMat: new THREE.MeshStandardMaterial({
    color: 0x7fb8d8,
    emissive: 0x2a5a78,
    emissiveIntensity: 0.7,
    roughness: 0.3,
  }),
});

const buildDesalination = (m: FacilityMats): { group: THREE.Group; steam: THREE.Sprite[]; anchor: THREE.Vector3 } => {
  const group = new THREE.Group();
  const [px, , pz] = FACILITIES.desalination.position;

  const pad = new THREE.Mesh(new THREE.BoxGeometry(90, 1.4, 46), m.concrete);
  pad.position.set(px, 0.7, pz);
  pad.receiveShadow = true;
  group.add(pad);

  const hallA = new THREE.Mesh(new THREE.BoxGeometry(50, 10, 20), m.white);
  hallA.position.set(px - 8, 1.4 + 5, pz - 6);
  hallA.castShadow = true;
  const hallB = new THREE.Mesh(new THREE.BoxGeometry(40, 8, 16), m.white);
  hallB.position.set(px + 18, 1.4 + 4, pz + 8);
  hallB.castShadow = true;
  group.add(hallA, hallB);
  for (let i = 0; i < 8; i++) {
    const win = new THREE.Mesh(new THREE.BoxGeometry(4.4, 2, 0.4), m.windowMat);
    win.position.set(px - 32 + i * 7, 1.4 + 6.5, pz - 16.1);
    group.add(win);
  }

  for (const [tx, tz, tr, th] of [
    [px - 22, pz + 12, 6, 11],
    [px + 2, pz + 12, 5, 9],
    [px - 30, pz - 12, 4.5, 8],
  ] as [number, number, number, number][]) {
    const tank = new THREE.Mesh(new THREE.CylinderGeometry(tr, tr, th, 14), m.steel);
    tank.position.set(tx, 1.4 + th / 2, tz);
    tank.castShadow = true;
    group.add(tank);
  }

  // Intake pipe toward the sea
  const intakePipe = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 70, 10), m.steel);
  intakePipe.rotation.x = Math.PI / 2;
  intakePipe.position.set(px - 28, 1.8, pz - 40);
  group.add(intakePipe);

  // MED vapor sprites
  const steamTexture = createGlowTexture('rgba(255,255,255,0.8)', 'rgba(255,255,255,0.2)', 256);
  const steam: THREE.Sprite[] = [];
  const anchor = new THREE.Vector3(px - 8, 1.4 + 12, pz - 6);
  for (let i = 0; i < 3; i++) {
    const mat = new THREE.SpriteMaterial({
      map: steamTexture,
      transparent: true,
      opacity: 0.2,
      depthWrite: false,
    });
    const sprite = new THREE.Sprite(mat);
    sprite.position.copy(anchor).add(new THREE.Vector3(i * 2, i * 5, i * 1.2));
    sprite.scale.set(5 + i * 4, 5 + i * 4, 1);
    sprite.userData.baseY = sprite.position.y;
    sprite.userData.phase = i * 1.7;
    steam.push(sprite);
    group.add(sprite);
  }

  const label = createLabelSprite('DESALINATION PLANT', { scale: 1.5, sub: '60,000 m³ Fresh Water / Day' });
  label.position.set(px, 1.4 + 22, pz);
  group.add(label);

  return { group, steam, anchor };
};

const buildDataCenter = (m: FacilityMats): THREE.Group => {
  const group = new THREE.Group();
  const [px, , pz] = FACILITIES.dataCenter.position;

  const pad = new THREE.Mesh(new THREE.BoxGeometry(80, 1.4, 52), m.concrete);
  pad.position.set(px, 0.7, pz);
  pad.receiveShadow = true;
  group.add(pad);

  const hall = new THREE.Mesh(new THREE.BoxGeometry(60, 14, 40), m.white);
  hall.position.set(px, 1.4 + 7, pz);
  hall.castShadow = true;
  const roof = new THREE.Mesh(new THREE.BoxGeometry(62, 1.6, 42), m.steel);
  roof.position.set(px, 1.4 + 14.8, pz);
  group.add(hall, roof);
  for (let i = 0; i < 9; i++) {
    const win = new THREE.Mesh(new THREE.BoxGeometry(5, 2.4, 0.4), m.windowMat);
    win.position.set(px - 26 + i * 6.5, 1.4 + 8, pz + 20.1);
    group.add(win);
  }

  // Cooling towers
  for (const side of [-1, 1]) {
    const tower = new THREE.Mesh(new THREE.CylinderGeometry(5, 6, 13, 12), m.steel);
    tower.position.set(px + side * 22, 1.4 + 6.5, pz + 14);
    tower.castShadow = true;
    group.add(tower);
  }

  // Cooling water intake pipe from the sea
  const coolingPipe = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, 85, 10), m.steel);
  coolingPipe.rotation.x = Math.PI / 2;
  coolingPipe.position.set(px - 12, 2, pz - 32);
  group.add(coolingPipe);

  // Substation + solar canopy
  const substation = new THREE.Mesh(new THREE.BoxGeometry(14, 6, 10), m.concrete);
  substation.position.set(px + 30, 1.4 + 3, pz - 16);
  group.add(substation);
  for (let gx = 0; gx < 4; gx++) {
    const panel = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.12, 2.3), m.panelMat);
    panel.position.set(px - 18 + gx * 3.8, 1.4 + 4.6, pz - 18);
    panel.rotation.x = -0.35;
    group.add(panel);
  }

  const label = createLabelSprite('DATA CENTER', { scale: 1.5, sub: '42 MW IT Load · Seawater Cooled' });
  label.position.set(px, 1.4 + 26, pz);
  group.add(label);

  return group;
};

const buildHeatingStation = (m: FacilityMats): THREE.Group => {
  const group = new THREE.Group();
  const [px, , pz] = FACILITIES.heatingStation.position;

  const pad = new THREE.Mesh(new THREE.BoxGeometry(58, 1.4, 40), m.concrete);
  pad.position.set(px, 0.7, pz);
  pad.receiveShadow = true;
  group.add(pad);

  const hall = new THREE.Mesh(new THREE.BoxGeometry(40, 10, 22), m.white);
  hall.position.set(px - 2, 1.4 + 5, pz);
  hall.castShadow = true;
  group.add(hall);
  for (let i = 0; i < 6; i++) {
    const win = new THREE.Mesh(new THREE.BoxGeometry(5, 2, 0.4), m.windowMat);
    win.position.set(px - 22 + i * 8, 1.4 + 6, pz + 11.1);
    group.add(win);
  }

  for (const [tx, tr, th] of [
    [px + 14, 5, 12],
    [px + 25, 4, 9],
  ] as [number, number, number][]) {
    const tank = new THREE.Mesh(new THREE.CylinderGeometry(tr, tr, th, 14), m.steel);
    tank.position.set(tx, 1.4 + th / 2, pz - 6);
    tank.castShadow = true;
    group.add(tank);
  }

  const stack = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.6, 16, 8), m.steel);
  stack.position.set(px + 4, 1.4 + 8, pz + 9);
  group.add(stack);

  const label = createLabelSprite('HEATING STATION', { scale: 1.4, sub: '90 MWth District Heat Supply' });
  label.position.set(px, 1.4 + 24, pz);
  group.add(label);

  return group;
};

export const createFacilities = (): FacilitiesHandle => {
  const group = new THREE.Group();
  group.name = 'GreenFacilities';
  const mats = makeMaterials();

  const desalination = buildDesalination(mats);
  const dataCenter = buildDataCenter(mats);
  const heatingStation = buildHeatingStation(mats);

  group.add(desalination.group, dataCenter, heatingStation);

  const update = (t: number) => {
    desalination.steam.forEach((sprite) => {
      const mat = sprite.material as THREE.SpriteMaterial;
      mat.opacity = 0.14 + 0.1 * Math.sin(t * 1.1 + sprite.userData.phase);
      sprite.position.y =
        (sprite.userData.baseY as number) + Math.sin(t * 0.7 + sprite.userData.phase) * 1.0;
    });
  };

  const dispose = () => {
    disposeObject(group);
  };

  return { group, update, dispose };
};
