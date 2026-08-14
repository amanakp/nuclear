import * as THREE from 'three';
import { FACILITIES } from '../data/scene1Data';
import { createGlowTexture, createLabelSprite, disposeObject } from './utilities';

export interface PlantHandle {
  group: THREE.Group;
  update: (t: number) => void;
  dispose: () => void;
}

/**
 * Visual-hero NUWARD SMR plant beside the sea: containment dome, reactor
 * auxiliary building, turbine hall, seawater intake and steam plume.
 */
export const createNuwardPlant = (): PlantHandle => {
  const group = new THREE.Group();
  group.name = 'NuwardSMR';
  const [px, , pz] = FACILITIES.smr.position;

  const concrete = new THREE.MeshStandardMaterial({ color: 0xb9bfc7, roughness: 0.9 });
  const white = new THREE.MeshStandardMaterial({
    color: 0xe8ecef,
    roughness: 0.35,
    metalness: 0.05,
  });
  const steel = new THREE.MeshStandardMaterial({
    color: 0x9aa2ab,
    roughness: 0.4,
    metalness: 0.6,
  });
  const windowMat = new THREE.MeshStandardMaterial({
    color: 0x7fb8d8,
    emissive: 0x2a5a78,
    emissiveIntensity: 0.7,
    roughness: 0.3,
  });
  const redMat = new THREE.MeshStandardMaterial({ color: 0xd6402f, roughness: 0.5 });

  // Platform
  const platform = new THREE.Mesh(new THREE.BoxGeometry(112, 2, 84), concrete);
  platform.position.set(px, 1, pz);
  platform.receiveShadow = true;
  group.add(platform);

  // Containment dome
  const domeGroup = new THREE.Group();
  domeGroup.position.set(px, 2, pz - 6);
  const domeBase = new THREE.Mesh(new THREE.CylinderGeometry(16, 16, 8, 24), white);
  domeBase.position.y = 4;
  domeBase.castShadow = true;
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(16, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2),
    white
  );
  dome.position.y = 8;
  dome.castShadow = true;
  const redBand = new THREE.Mesh(new THREE.TorusGeometry(16.1, 0.7, 8, 32), redMat);
  redBand.rotation.x = Math.PI / 2;
  redBand.position.y = 7;
  domeGroup.add(domeBase, dome, redBand);
  group.add(domeGroup);

  // Reactor auxiliary building
  const aux = new THREE.Mesh(new THREE.BoxGeometry(26, 14, 20), white);
  aux.position.set(px - 24, 2 + 7, pz + 8);
  aux.castShadow = true;
  const auxStripe = new THREE.Mesh(new THREE.BoxGeometry(1.2, 10, 20.4), windowMat);
  auxStripe.position.set(px - 33.5, 2 + 7, pz + 8);
  group.add(aux, auxStripe);

  // Turbine hall
  const turbine = new THREE.Mesh(new THREE.BoxGeometry(46, 12, 18), white);
  turbine.position.set(px + 26, 2 + 6, pz + 12);
  turbine.castShadow = true;
  const turbineRoof = new THREE.Mesh(new THREE.BoxGeometry(50, 2.5, 11), steel);
  turbineRoof.position.set(px + 26, 2 + 12.5, pz + 8);
  group.add(turbine, turbineRoof);
  for (let i = 0; i < 6; i++) {
    const win = new THREE.Mesh(new THREE.BoxGeometry(5, 2.4, 0.4), windowMat);
    win.position.set(px + 10 + i * 6.5, 2 + 7.5, pz + 21.1);
    group.add(win);
  }

  // Ancillary buildings
  const warehouse = new THREE.Mesh(new THREE.BoxGeometry(20, 7, 14), concrete);
  warehouse.position.set(px + 42, 2 + 3.5, pz - 6);
  warehouse.castShadow = true;
  const workshop = new THREE.Mesh(new THREE.BoxGeometry(14, 6, 10), concrete);
  workshop.position.set(px + 36, 2 + 3, pz + 20);
  group.add(warehouse, workshop);

  // Chimney with red bands
  const chimneyMat = new THREE.MeshStandardMaterial({ color: 0xdfe3e8, roughness: 0.6 });
  const chimney = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 2, 24, 10), chimneyMat);
  chimney.position.set(px + 14, 2 + 12, pz + 26);
  group.add(chimney);
  for (let i = 0; i < 3; i++) {
    const band = new THREE.Mesh(new THREE.CylinderGeometry(1.62, 1.62, 1.4, 10), redMat);
    band.position.set(px + 14, 2 + 6 + i * 5, pz + 26);
    group.add(band);
  }

  // Seawater intake pier + pipes
  const intake = new THREE.Mesh(new THREE.BoxGeometry(14, 1.4, 40), concrete);
  intake.position.set(px - 34, 0.7, pz - 42);
  intake.receiveShadow = true;
  const screenHouse = new THREE.Mesh(new THREE.BoxGeometry(12, 6, 9), concrete);
  screenHouse.position.set(px - 34, 1.4 + 3, pz - 62);
  group.add(intake, screenHouse);
  for (const side of [-1, 1]) {
    const pipe = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.4, 26, 10), steel);
    pipe.rotation.x = Math.PI / 2;
    pipe.position.set(px - 34 + side * 4, 2.2, pz - 40);
    group.add(pipe);
  }

  // Steam plume sprites (animated)
  const steamTexture = createGlowTexture('rgba(255,255,255,0.85)', 'rgba(255,255,255,0.25)', 256);
  const steamSprites: THREE.Sprite[] = [];
  const steamAnchor = new THREE.Vector3(px + 14, 2 + 26, pz + 26);
  for (let i = 0; i < 3; i++) {
    const mat = new THREE.SpriteMaterial({
      map: steamTexture,
      transparent: true,
      opacity: 0.3,
      depthWrite: false,
    });
    const sprite = new THREE.Sprite(mat);
    sprite.position.copy(steamAnchor).add(new THREE.Vector3(i * 2.5, i * 7, i * 1.5));
    sprite.scale.set(6 + i * 5, 6 + i * 5, 1);
    sprite.userData.baseY = sprite.position.y;
    sprite.userData.phase = i * 2.1;
    steamSprites.push(sprite);
    group.add(sprite);
  }

  // Fence + gate
  const fenceMat = new THREE.MeshStandardMaterial({
    color: 0x2c3e50,
    roughness: 0.6,
    metalness: 0.4,
  });
  for (let i = 0; i < 4; i++) {
    const seg = new THREE.Mesh(new THREE.BoxGeometry(110, 1.6, 0.3), fenceMat);
    seg.position.set(px, 1.8, pz - 42 + i * 84);
    group.add(seg);
  }
  for (let i = 0; i < 2; i++) {
    const seg = new THREE.Mesh(new THREE.BoxGeometry(0.3, 1.6, 84), fenceMat);
    seg.position.set(px - 55 + i * 110, 1.8, pz);
    group.add(seg);
  }

  // Labels
  const plantLabel = createLabelSprite('NUWARD SMR PLANT', { scale: 1.9, sub: '340 MWe Clean Baseload' });
  plantLabel.position.set(px, 2 + 62, pz - 6);
  group.add(plantLabel);
  const intakeLabel = createLabelSprite('SEAWATER INTAKE', { scale: 1.1 });
  intakeLabel.position.set(px - 34, 1.4 + 14, pz - 62);
  group.add(intakeLabel);

  // Animation
  const update = (t: number) => {
    steamSprites.forEach((sprite, i) => {
      const mat = sprite.material as THREE.SpriteMaterial;
      mat.opacity = 0.22 + 0.12 * Math.sin(t * 1.1 + sprite.userData.phase);
      sprite.position.y = (sprite.userData.baseY as number) + Math.sin(t * 0.8 + sprite.userData.phase) * 1.2;
      sprite.position.x = steamAnchor.x + Math.sin(t * 0.4 + sprite.userData.phase) * 2.2 + i * 2.5;
    });
  };

  const dispose = () => {
    steamTexture.dispose();
    disposeObject(group);
  };

  return { group, update, dispose };
};
