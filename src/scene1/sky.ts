import * as THREE from 'three';
import { WORLD } from '../data/scene1Data';
import { createCloudTexture, createGlowTexture, mulberry32 } from './utilities';

export interface SkyHandle {
  group: THREE.Group;
  sunDirection: THREE.Vector3;
  update: (dt: number) => void;
  dispose: () => void;
}

/**
 * Cinematic HDR-style sky dome with gradient shader, sun disc and
 * drifting cloud sprites. Produces warm golden-hour light from the city side.
 */
export const createSky = (seed: number): SkyHandle => {
  const group = new THREE.Group();
  group.name = 'Sky';

  const sunDir = new THREE.Vector3(...WORLD.sunDirection).normalize();

  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(3000, 40, 20),
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: {
        uZenith: { value: new THREE.Color('#0e5cae') },
        uMid: { value: new THREE.Color('#6db8e8') },
        uHorizon: { value: new THREE.Color('#f4e2c2') },
        uSunDir: { value: sunDir },
        uSunColor: { value: new THREE.Color('#ffd9a0') },
      },
      vertexShader: /* glsl */ `
        varying vec3 vDir;
        void main() {
          vec4 wp = modelMatrix * vec4(position, 1.0);
          vDir = normalize(wp.xyz - cameraPosition);
          gl_Position = projectionMatrix * viewMatrix * wp;
        }
      `,
      fragmentShader: /* glsl */ `
        uniform vec3 uZenith;
        uniform vec3 uMid;
        uniform vec3 uHorizon;
        uniform vec3 uSunDir;
        uniform vec3 uSunColor;
        varying vec3 vDir;
        void main() {
          float h = clamp(vDir.y, 0.0, 1.0);
          vec3 col = mix(uHorizon, uMid, smoothstep(0.0, 0.25, h));
          col = mix(col, uZenith, smoothstep(0.15, 0.9, h));
          float s = max(dot(vDir, uSunDir), 0.0);
          col += uSunColor * pow(s, 350.0) * 1.5;
          col += vec3(1.0, 0.82, 0.55) * pow(s, 10.0) * 0.28;
          if (vDir.y < 0.0) col = uHorizon;
          gl_FragColor = vec4(col, 1.0);
        }
      `,
    })
  );
  group.add(dome);

  // Sun glow sprite (additive)
  const sunTexture = createGlowTexture('#fffbe8', 'rgba(255, 200, 120, 0.55)', 256);
  const sun = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: sunTexture,
      blending: THREE.AdditiveBlending,
      transparent: true,
      depthWrite: false,
      fog: false,
    })
  );
  sun.position.copy(sunDir).multiplyScalar(2600);
  sun.scale.set(900, 900, 1);
  group.add(sun);

  // Cloud sprites
  const cloudTexture = createCloudTexture();
  const rand = mulberry32(seed ^ 0x51c1);
  const cloudCount = 16;
  const cloudMaterials: THREE.SpriteMaterial[] = [];
  for (let i = 0; i < cloudCount; i++) {
    const angle = rand() * Math.PI * 2;
    const radius = 700 + rand() * 1100;
    const material = new THREE.SpriteMaterial({
      map: cloudTexture,
      transparent: true,
      opacity: 0.16 + rand() * 0.2,
      depthWrite: false,
      fog: false,
    });
    cloudMaterials.push(material);
    const cloud = new THREE.Sprite(material);
    cloud.position.set(Math.cos(angle) * radius, 320 + rand() * 430, Math.sin(angle) * radius);
    const s = 240 + rand() * 380;
    cloud.scale.set(s, s * 0.5, 1);
    cloud.userData.drift = rand() * 0.6 + 0.2;
    group.add(cloud);
  }

  // Gentle cloud drift
  let elapsed = 0;
  const update = (dt: number) => {
    elapsed += dt;
    group.children.forEach((child) => {
      if (child.userData.drift !== undefined) {
        child.position.x += Math.sin(elapsed * 0.05) * dt * child.userData.drift;
      }
    });
  };

  const dispose = () => {
    sunTexture.dispose();
    cloudTexture.dispose();
    cloudMaterials.forEach((m) => m.dispose());
    (dome.material as THREE.Material).dispose();
    dome.geometry.dispose();
  };

  return { group, sunDirection: sunDir, update, dispose };
};
