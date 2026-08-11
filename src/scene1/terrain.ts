import * as THREE from 'three';
import { FACILITIES, WORLD } from '../data/scene1Data';
import { fbm, makeValueNoise2D, smoothstep } from './utilities';

export interface TerrainHandle {
  mesh: THREE.Mesh;
  dispose: () => void;
}

/** City grid bounds (terrain is flattened to the city floor inside). */
const CITY = { x0: 40, x1: 520, z0: -265, z1: 270, floor: 0.62 };
const CANAL_X = 250;

const heightAt = (x: number, z: number, noise: (x: number, y: number) => number): number => {
  // Base rolling hills
  let h = fbm(noise, x * 0.006, z * 0.006, 4) * 9.0 - 2.5;

  // Beach slope from the shoreline inward
  if (z < WORLD.shoreZ + 60) {
    const t = smoothstep(WORLD.shoreZ, WORLD.shoreZ + 60, z);
    h = THREE.MathUtils.lerp(h, 0.15 + fbm(noise, x * 0.02, z * 0.02, 2) * 0.2, t);
  }

  // Flatten the facility pads (SMR campus is 130m x 113m -> wider pad)
  for (const facility of Object.values(FACILITIES)) {
    const [fx, , fz] = facility.position;
    const radius = facility.name === 'NUWARD SMR Plant' ? 90 : 42;
    const d = Math.hypot(x - fx, z - fz);
    if (d < radius) h = THREE.MathUtils.lerp(h, 0.4, 1 - smoothstep(radius * 0.45, radius, d));
  }

  // Flatten the city grid
  if (x > CITY.x0 && x < CITY.x1 && z > CITY.z0 && z < CITY.z1) {
    const edge = Math.min(
      smoothstep(CITY.x0, CITY.x0 + 50, x),
      smoothstep(CITY.x1 - 50, CITY.x1, x),
      smoothstep(CITY.z0, CITY.z0 + 50, z),
      smoothstep(CITY.z1 - 50, CITY.z1, z)
    );
    h = THREE.MathUtils.lerp(h, CITY.floor, edge);
  }

  // Canal bed carved through the city toward the sea
  const canalEdge = Math.abs(x - CANAL_X);
  if (canalEdge < 14 && z > WORLD.shoreZ && z < 300) {
    const t = smoothstep(10, 3, canalEdge);
    h = THREE.MathUtils.lerp(h, -2.4, t);
  }

  // Rocky headland west of the SMR for coastal drama
  if (x > -430 && x < -180 && z > WORLD.shoreZ - 40 && z < -110) {
    const rocky = fbm(noise, x * 0.02 + 40, z * 0.02 + 40, 3);
    const t = smoothstep(-430, -380, x) * smoothstep(-180, -230, x) * smoothstep(-110, -150, z);
    h = THREE.MathUtils.lerp(h, 3.2 + rocky * 7.0, t);
  }

  return h;
};

const colorAt = (
  x: number,
  z: number,
  h: number,
  noise: (x: number, y: number) => number
): THREE.Color => {
  const color = new THREE.Color();
  // Sand near the shore
  if (z < WORLD.shoreZ + 40 || (z < WORLD.shoreZ + 90 && h < 0.8)) {
    return color.setRGB(0.93, 0.84, 0.63);
  }
  // Rocky headland
  if (x > -430 && x < -180 && z > WORLD.shoreZ - 40 && z < -110) {
    return color.setRGB(0.48 + 0.06 * fbm(noise, x * 0.05, z * 0.05, 2), 0.45, 0.4);
  }
  // City grid concrete
  if (x > CITY.x0 && x < CITY.x1 && z > CITY.z0 && z < CITY.z1) {
    return color.setRGB(0.31, 0.33, 0.36);
  }
  // Grass with organic variation
  const v = fbm(noise, x * 0.05 + 90, z * 0.05 + 90, 3);
  const g = 0.5 + v * 0.25;
  return color.setRGB(0.32 * g, 0.52 * g, 0.26 * g);
};

/**
 * Procedural terrain: rolling hills, sandy beach, flattened city grid,
 * canal bed and a rocky coastal headland. Uses vertex colors.
 */
export const createTerrain = (seed: number): TerrainHandle => {
  const noise = makeValueNoise2D(seed);
  const width = 1250;
  const height = 1000;
  const segmentsW = 170;
  const segmentsH = 130;
  const centerX = 60;
  const centerZ = 20;

  const geometry = new THREE.PlaneGeometry(width, height, segmentsW, segmentsH);
  geometry.rotateX(-Math.PI / 2);
  geometry.translate(centerX, 0, centerZ);

  const positions = geometry.attributes.position as THREE.BufferAttribute;
  const colors = new Float32Array(positions.count * 3);

  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i);
    const z = positions.getZ(i);
    const y = heightAt(x, z, noise);
    positions.setY(i, y);
    const color = colorAt(x, z, y, noise);
    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;
  }

  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.computeVertexNormals();

  const material = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 1,
    metalness: 0,
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = 'Terrain';
  mesh.receiveShadow = true;

  const dispose = () => {
    geometry.dispose();
    material.dispose();
  };

  return { mesh, dispose };
};
