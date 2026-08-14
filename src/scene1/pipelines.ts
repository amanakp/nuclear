import * as THREE from 'three';
import { FACILITIES } from '../data/scene1Data';
import { createGlowTexture, createLabelSprite, disposeObject } from './utilities';

export interface PipelinesHandle {
  group: THREE.Group;
  update: (t: number) => void;
  dispose: () => void;
}

const buildPylon = (x: number, z: number, h: number, baseY: number): THREE.Group => {
  const pylon = new THREE.Group();
  const steel = new THREE.MeshStandardMaterial({
    color: 0x3a3f45,
    roughness: 0.5,
    metalness: 0.6,
  });
  const legs: [number, number][] = [
    [-1.4, -1.4],
    [1.4, -1.4],
    [-1.4, 1.4],
    [1.4, 1.4],
  ];
  for (const [lx, lz] of legs) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, h, 4), steel);
    leg.position.set(lx, baseY + h / 2, lz);
    pylon.add(leg);
  }
  for (let i = 0; i < 4; i++) {
    const cross = new THREE.Mesh(new THREE.BoxGeometry(2.9, 0.4, 0.4), steel);
    cross.position.set(0, baseY + (h * (i + 1)) / 5, 0);
    pylon.add(cross);
  }
  const arm = new THREE.Mesh(new THREE.BoxGeometry(5.6, 0.5, 0.5), steel);
  arm.position.set(0, baseY + h - 0.4, 0);
  pylon.add(arm);
  pylon.position.set(x, 0, z);
  return pylon;
};

/**
 * Infrastructure links: water pipeline (Desalination -> Data Center) and
 * electric connection (SMR -> Data Center). No heat pipeline per customer.
 */
export const createPipelines = (): PipelinesHandle => {
  const group = new THREE.Group();
  group.name = 'Pipelines';

  const [dx, , dz] = FACILITIES.desalination.position;
  const [cx, , cz] = FACILITIES.dataCenter.position;
  const groundY = 0.7;

  // ---- Water pipeline: Desalination -> Data Center ----
  const waterCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(dx, 3.6, dz),
    new THREE.Vector3(-150, 4.2, dz + 2),
    new THREE.Vector3(-70, 3.6, cz - 1),
    new THREE.Vector3(cx, 3.6, cz),
  ]);
  const waterTubeGeo = new THREE.TubeGeometry(waterCurve, 64, 0.55, 8, false);
  const waterTubeMat = new THREE.MeshStandardMaterial({
    color: 0x2f7fd1,
    roughness: 0.35,
    metalness: 0.5,
    emissive: 0x0a2e52,
    emissiveIntensity: 0.25,
  });
  const waterTube = new THREE.Mesh(waterTubeGeo, waterTubeMat);
  group.add(waterTube);

  // Support pylons under the water line
  for (let i = 0; i <= 5; i++) {
    const p = waterCurve.getPoint(i / 5);
    const support = new THREE.Mesh(
      new THREE.CylinderGeometry(1.3, 1.6, 3, 8),
      new THREE.MeshStandardMaterial({ color: 0x7c8189, roughness: 0.9 })
    );
    support.position.set(p.x, groundY + 1.5, p.z);
    group.add(support);
  }

  // Flowing water particles
  const waterParticleCount = 100;
  const waterPointsGeo = new THREE.BufferGeometry();
  const waterPositions = new Float32Array(waterParticleCount * 3);
  const waterSeed = new Float32Array(waterParticleCount);
  for (let i = 0; i < waterParticleCount; i++) {
    waterSeed[i] = i / waterParticleCount;
  }
  waterPointsGeo.setAttribute('position', new THREE.BufferAttribute(waterPositions, 3));
  const waterMat = new THREE.PointsMaterial({
    color: 0x7fe7ff,
    size: 1.1,
    transparent: true,
    opacity: 0.85,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const waterPoints = new THREE.Points(waterPointsGeo, waterMat);
  group.add(waterPoints);

  const waterLabel = createLabelSprite('WATER PIPELINE', { scale: 1.2, sub: 'Desalination → Data Center' });
  waterLabel.position.set(-110, 10, dz + 2);
  group.add(waterLabel);

  // ---- Electric connection: SMR substation (east campus edge) -> Data Center ----
  const cableCurve = new THREE.QuadraticBezierCurve3(
    new THREE.Vector3(-60, 16, -230),
    new THREE.Vector3(-40, 22, cz - 2),
    new THREE.Vector3(cx, 16, cz)
  );
  const cableGeo = new THREE.TubeGeometry(cableCurve, 32, 0.18, 6, false);
  const cableMat = new THREE.MeshStandardMaterial({
    color: 0x3a3f45,
    roughness: 0.35,
    metalness: 0.75,
  });
  const cable = new THREE.Mesh(cableGeo, cableMat);
  group.add(cable);

  group.add(buildPylon(-60, -230, 16, groundY));
  group.add(buildPylon(-40, cz - 2, 21, groundY));
  group.add(buildPylon(cx, cz, 16, groundY));

  // Glow line along the cable
  const cablePoints = cableCurve.getPoints(24);
  const glowGeo = new THREE.BufferGeometry().setFromPoints(cablePoints);
  const glowMat = new THREE.LineBasicMaterial({
    color: 0x7df3ff,
    transparent: true,
    opacity: 0.35,
    depthWrite: false,
  });
  const glowLine = new THREE.Line(glowGeo, glowMat);
  group.add(glowLine);

  // Pulsing energy packets traveling the cable
  const packetCount = 5;
  const packetGeo = new THREE.SphereGeometry(0.7, 8, 6);
  const packetMat = new THREE.MeshBasicMaterial({
    color: 0x9ff5ff,
    transparent: true,
    opacity: 0.9,
  });
  const packets: THREE.Mesh[] = [];
  for (let i = 0; i < packetCount; i++) {
    const packet = new THREE.Mesh(packetGeo, packetMat.clone());
    packets.push(packet);
    group.add(packet);
  }

  const glowTexture = createGlowTexture('#eafcff', 'rgba(0, 200, 255, 0.5)', 128);
  const towerBeacon = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: glowTexture,
      blending: THREE.AdditiveBlending,
      transparent: true,
      opacity: 0.5,
      depthWrite: false,
    })
  );
  towerBeacon.position.set(cx - 22, 18, cz - 1);
  towerBeacon.scale.set(8, 8, 1);
  group.add(towerBeacon);

  const electricLabel = createLabelSprite('ELECTRIC CONNECTION', { scale: 1.2, sub: 'SMR → Data Center · 230 kV' });
  electricLabel.position.set(-30, 30, cz - 4);
  group.add(electricLabel);

  // ---- Animation ----
  const tmp = new THREE.Vector3();
  const update = (t: number) => {
    // Water flow
    for (let i = 0; i < waterParticleCount; i++) {
      const u = (waterSeed[i] + t * 0.045) % 1;
      waterCurve.getPoint(u, tmp);
      waterPositions[i * 3] = tmp.x;
      waterPositions[i * 3 + 1] = tmp.y + Math.sin(t * 3 + i) * 0.15;
      waterPositions[i * 3 + 2] = tmp.z;
    }
    waterPointsGeo.attributes.position.needsUpdate = true;

    // Energy packets + glow pulse
    for (let i = 0; i < packets.length; i++) {
      const u = (i / packets.length + t * 0.11) % 1;
      cableCurve.getPoint(u, tmp);
      packets[i].position.copy(tmp);
      const s = 0.6 + Math.sin(t * 6 + i) * 0.25;
      packets[i].scale.set(s, s, s);
    }
    glowMat.opacity = 0.22 + Math.sin(t * 2.4) * 0.12;
    towerBeacon.material.opacity = 0.35 + Math.sin(t * 2.4 + 1) * 0.15;
  };

  const dispose = () => {
    glowTexture.dispose();
    disposeObject(group);
  };

  return { group, update, dispose };
};
