import * as THREE from 'three';

export interface PipelineHandle {
  group: THREE.Group;
  update: (t: number) => void;
  dispose: () => void;
}

const FACILITIES = {
  smr: { position: [-120, 0, -250] as [number, number, number] },
  desalination: { position: [-250, 0, -305] as [number, number, number] },
  dataCenter: { position: [40, 0, -240] as [number, number, number] },
  heatingStation: { position: [170, 0, -195] as [number, number, number] },
  districtZone: { position: [310, 0, -110] as [number, number, number] },
};

const GROUND_Y = 0.7;

function buildPylon(x: number, z: number, h: number, baseY: number): THREE.Group {
  const pylon = new THREE.Group();
  const steel = new THREE.MeshStandardMaterial({
    color: 0x3a3f45,
    roughness: 0.5,
    metalness: 0.6,
  });
  const legs: [number, number][] = [
    [-1.6, -1.6],
    [1.6, -1.6],
    [-1.6, 1.6],
    [1.6, 1.6],
  ];
  for (const [lx, lz] of legs) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, h, 4), steel);
    leg.position.set(lx, baseY + h / 2, lz);
    leg.castShadow = true;
    pylon.add(leg);
  }
  for (let i = 0; i < 5; i++) {
    const cross = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.4, 0.4), steel);
    cross.position.set(0, baseY + (h * (i + 1)) / 6, 0);
    cross.castShadow = true;
    pylon.add(cross);
  }
  const arm = new THREE.Mesh(new THREE.BoxGeometry(6.4, 0.5, 0.5), steel);
  arm.position.set(0, baseY + h - 0.4, 0);
  arm.castShadow = true;
  pylon.add(arm);
  pylon.position.set(x, 0, z);
  return pylon;
}

function createGlowTexture(inner: string, outer: string, size = 256): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grad.addColorStop(0, inner);
  grad.addColorStop(0.35, outer);
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function createLabelSprite(text: string, opts: { scale?: number; sub?: string } = {}): THREE.Sprite {
  const scale = opts.scale ?? 1;
  const sub = opts.sub;
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 160;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, 1024, 160);
  ctx.fillStyle = 'rgba(2, 8, 16, 0.62)';
  ctx.fillRect(0, 0, 1024, 160);
  ctx.strokeStyle = 'rgba(0, 240, 255, 0.55)';
  ctx.lineWidth = 3;
  ctx.strokeRect(1.5, 1.5, 1021, 157);
  ctx.font = 'bold 56px Rajdhani, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#e8fbff';
  ctx.fillText(text, 512, sub ? 64 : 80);
  if (sub) {
    ctx.font = '300 30px Rajdhani, sans-serif';
    ctx.fillStyle = 'rgba(120, 220, 255, 0.95)';
    ctx.fillText(sub, 512, 118);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  const material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(64 * scale, 10 * scale, 1);
  return sprite;
}

export function createPipelines(): PipelineHandle {
  const group = new THREE.Group();
  group.name = 'Pipelines';

  const [dx, , dz] = FACILITIES.desalination.position;
  const [cx, , cz] = FACILITIES.dataCenter.position;

  // ---- Water pipeline: Desalination -> Data Center ----
  const waterCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(dx, 4.2, dz),
    new THREE.Vector3(-180, 5.0, dz + 8),
    new THREE.Vector3(-90, 4.2, cz - 1),
    new THREE.Vector3(cx, 4.2, cz),
  ]);
  const waterTubeGeo = new THREE.TubeGeometry(waterCurve, 80, 0.6, 10, false);
  const waterTubeMat = new THREE.MeshStandardMaterial({
    color: 0x2f7fd1,
    roughness: 0.35,
    metalness: 0.5,
    emissive: 0x0a2e52,
    emissiveIntensity: 0.25,
  });
  const waterTube = new THREE.Mesh(waterTubeGeo, waterTubeMat);
  waterTube.castShadow = true;
  waterTube.receiveShadow = true;
  group.add(waterTube);

  for (let i = 0; i <= 6; i++) {
    const p = waterCurve.getPoint(i / 6);
    const support = new THREE.Mesh(
      new THREE.CylinderGeometry(1.4, 1.7, 3.5, 10),
      new THREE.MeshStandardMaterial({ color: 0x7c8189, roughness: 0.9 })
    );
    support.position.set(p.x, GROUND_Y + 1.75, p.z);
    support.castShadow = true;
    group.add(support);
  }

  const waterParticleCount = 140;
  const waterPointsGeo = new THREE.BufferGeometry();
  const waterPositions = new Float32Array(waterParticleCount * 3);
  const waterSeed = new Float32Array(waterParticleCount);
  for (let i = 0; i < waterParticleCount; i++) {
    waterSeed[i] = i / waterParticleCount;
  }
  waterPointsGeo.setAttribute('position', new THREE.BufferAttribute(waterPositions, 3));
  const waterMat = new THREE.PointsMaterial({
    color: 0x7fe7ff,
    size: 1.2,
    transparent: true,
    opacity: 0.9,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    sizeAttenuation: true,
  });
  const waterPoints = new THREE.Points(waterPointsGeo, waterMat);
  group.add(waterPoints);

  const waterLabel = createLabelSprite('FRESHWATER PIPELINE', { scale: 1.3, sub: 'Desalination Plant → Data Center · 60,000 m³/day' });
  waterLabel.position.set(-110, 12, dz + 8);
  group.add(waterLabel);

  // ---- Electric connection: SMR substation -> Data Center ----
  // SMR substation world position: SMR_WORLD_POS + local [56, 2.59, 12] = [-64, 2.59, -238]
  const smrSubX = -64;
  const smrSubZ = -238;

  const cableCurve = new THREE.QuadraticBezierCurve3(
    new THREE.Vector3(smrSubX, 18, smrSubZ),
    new THREE.Vector3(-20, 28, cz - 2),
    new THREE.Vector3(cx, 18, cz)
  );
  const cableGeo = new THREE.TubeGeometry(cableCurve, 40, 0.22, 8, false);
  const cableMat = new THREE.MeshStandardMaterial({
    color: 0x2a2e34,
    roughness: 0.35,
    metalness: 0.8,
  });
  const cable = new THREE.Mesh(cableGeo, cableMat);
  cable.castShadow = true;
  group.add(cable);

  group.add(buildPylon(smrSubX, smrSubZ, 18, GROUND_Y));
  group.add(buildPylon(-20, cz - 2, 28, GROUND_Y));
  group.add(buildPylon(cx, cz, 18, GROUND_Y));

  const cablePoints = cableCurve.getPoints(32);
  const glowGeo = new THREE.BufferGeometry().setFromPoints(cablePoints);
  const glowMat = new THREE.LineBasicMaterial({
    color: 0x7df3ff,
    transparent: true,
    opacity: 0.4,
    depthWrite: false,
  });
  const glowLine = new THREE.Line(glowGeo, glowMat);
  group.add(glowLine);

  const packetCount = 6;
  const packetGeo = new THREE.SphereGeometry(0.8, 8, 6);
  const packetMat = new THREE.MeshBasicMaterial({
    color: 0x9ff5ff,
    transparent: true,
    opacity: 0.95,
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
      opacity: 0.55,
      depthWrite: false,
    })
  );
  towerBeacon.position.set(cx - 22, 20, cz - 1);
  towerBeacon.scale.set(10, 10, 1);
  group.add(towerBeacon);

  const electricLabel = createLabelSprite('ELECTRIC CONNECTION', { scale: 1.3, sub: 'SMR Substation → Data Center · 230 kV · 340 MWe' });
  electricLabel.position.set(-30, 34, cz - 4);
  group.add(electricLabel);

  const tmp = new THREE.Vector3();
  const update = (t: number) => {
    for (let i = 0; i < waterParticleCount; i++) {
      const u = (waterSeed[i] + t * 0.05) % 1;
      waterCurve.getPoint(u, tmp);
      waterPositions[i * 3] = tmp.x;
      waterPositions[i * 3 + 1] = tmp.y + Math.sin(t * 3.5 + i) * 0.18;
      waterPositions[i * 3 + 2] = tmp.z;
    }
    waterPointsGeo.attributes.position.needsUpdate = true;

    for (let i = 0; i < packets.length; i++) {
      const u = (i / packets.length + t * 0.13) % 1;
      cableCurve.getPoint(u, tmp);
      packets[i].position.copy(tmp);
      const s = 0.65 + Math.sin(t * 7 + i) * 0.3;
      packets[i].scale.set(s, s, s);
    }
    glowMat.opacity = 0.25 + Math.sin(t * 2.8) * 0.14;
    towerBeacon.material.opacity = 0.4 + Math.sin(t * 2.8 + 1) * 0.18;
  };

  const dispose = () => {
    glowTexture.dispose();
    group.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry?.dispose();
        if (Array.isArray(obj.material)) {
          obj.material.forEach((m) => m.dispose());
        } else {
          (obj.material as THREE.Material)?.dispose();
        }
      } else if (obj instanceof THREE.Points) {
        obj.geometry?.dispose();
        (obj.material as THREE.Material)?.dispose();
      } else if (obj instanceof THREE.Sprite) {
        (obj.material as THREE.SpriteMaterial).map?.dispose();
        (obj.material as THREE.Material)?.dispose();
      } else if (obj instanceof THREE.Line) {
        obj.geometry?.dispose();
        (obj.material as THREE.Material)?.dispose();
      }
    });
  };

  return { group, update, dispose };
}