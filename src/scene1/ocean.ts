import * as THREE from 'three';
import { WORLD } from '../data/scene1Data';

export interface OceanHandle {
  group: THREE.Group;
  update: (t: number) => void;
  dispose: () => void;
}

/**
 * Shader ocean for the Gulf of Thailand: layered sine waves, fresnel sky
 * reflection, sun glint, crest foam and an animated shoreline foam band.
 */
export const createOcean = (): OceanHandle => {
  const group = new THREE.Group();
  group.name = 'Ocean';

  const uniforms = {
    uTime: { value: 0 },
    uDeepColor: { value: new THREE.Color('#053a63') },
    uShallowColor: { value: new THREE.Color('#1c93c8') },
    uSkyColor: { value: new THREE.Color('#ffe9c8') },
    uSunColor: { value: new THREE.Color('#fff3d8') },
    uSunDir: { value: new THREE.Vector3(...WORLD.sunDirection).normalize() },
    uFogColor: { value: new THREE.Color('#e8e4d4') },
    uShoreZ: { value: WORLD.shoreZ },
    uFogStart: { value: 300 },
    uFogEnd: { value: 3200 },
  };

  const geometry = new THREE.PlaneGeometry(2600, 2600, 140, 140);
  geometry.rotateX(-Math.PI / 2);

  const material = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: /* glsl */ `
      uniform float uTime;
      varying vec3 vWorldPos;
      varying vec3 vNormalW;
      varying float vHeight;
      varying float vViewDist;

      float waveHeight(vec2 p, float t) {
        float h = 0.0;
        h += sin(p.x * 0.055 + t * 0.9) * 0.55;
        h += sin(p.x * 0.13 - p.y * 0.11 + t * 1.3) * 0.3;
        h += sin(p.x * 0.021 + p.y * 0.047 + t * 0.5) * 0.85;
        h += sin((p.x * 0.31 + p.y * 0.17) + t * 2.1) * 0.12;
        return h;
      }

      void main() {
        vec2 p = position.xz;
        float h = waveHeight(p, uTime);
        float e = 0.9;
        float hx = waveHeight(p + vec2(e, 0.0), uTime);
        float hz = waveHeight(p + vec2(0.0, e), uTime);
        vec3 tangent = vec3(e, hx - h, 0.0);
        vec3 bitangent = vec3(0.0, hz - h, e);
        vec3 n = normalize(cross(tangent, bitangent));
        vec4 wp = modelMatrix * vec4(position.x, h, position.z, 1.0);
        vWorldPos = wp.xyz;
        vNormalW = normalize(mat3(modelMatrix) * n);
        vHeight = h;
        vViewDist = distance(cameraPosition, wp.xyz);
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform vec3 uDeepColor;
      uniform vec3 uShallowColor;
      uniform vec3 uSkyColor;
      uniform vec3 uSunColor;
      uniform vec3 uSunDir;
      uniform vec3 uFogColor;
      uniform float uShoreZ;
      uniform float uFogStart;
      uniform float uFogEnd;
      varying vec3 vWorldPos;
      varying vec3 vNormalW;
      varying float vHeight;
      varying float vViewDist;

      void main() {
        vec3 viewDir = normalize(cameraPosition - vWorldPos);
        vec3 N = normalize(vNormalW);
        float depthF = clamp((vHeight + 0.75) / 1.9, 0.0, 1.0);
        vec3 water = mix(uDeepColor, uShallowColor, depthF);
        float fresnel = pow(1.0 - max(dot(N, viewDir), 0.0), 3.0);
        vec3 reflDir = reflect(-viewDir, N);
        float sunDot = max(dot(reflDir, uSunDir), 0.0);
        float glint = pow(sunDot, 180.0) * 1.6 + pow(sunDot, 12.0) * 0.18;
        vec3 col = water + uSkyColor * fresnel * 0.55 + uSunColor * glint;

        float crest = smoothstep(0.55, 1.05, vHeight);
        col = mix(col, vec3(0.9, 0.95, 1.0), crest * 0.55);

        float shoreDist = vWorldPos.z - uShoreZ;
        float band = 1.0 - smoothstep(4.0, 32.0, abs(shoreDist));
        float anim = 0.5 + 0.5 * sin(vWorldPos.x * 0.09 + uTime * 1.4);
        col = mix(col, vec3(0.92, 0.96, 1.0), band * anim * 0.7);

        float fogF = clamp((vViewDist - uFogStart) / (uFogEnd - uFogStart), 0.0, 1.0);
        col = mix(col, uFogColor, fogF);
        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(0, WORLD.seaLevel, 0);
  mesh.frustumCulled = false;
  group.add(mesh);

  const update = (t: number) => {
    uniforms.uTime.value = t;
  };

  const dispose = () => {
    geometry.dispose();
    material.dispose();
  };

  return { group, update, dispose };
};
