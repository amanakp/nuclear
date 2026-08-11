#!/usr/bin/env node
/**
 * check_smr_assembly.mjs — NUCLEUS SMR assembly validator (temporary tooling).
 *
 * Usage:
 *   node pipeline/check_smr_assembly.mjs
 *
 * Applies the tuned SMR_COMPONENT_CONFIG transforms (from
 * src/scene1/assetLoader.ts) to each component's measured raw bbox and
 * reports the assembled layout: ground gaps, pairwise overlaps, footprint,
 * and deltas vs the blockout targets (assets/blender/SMR/..._blockout.py).
 *
 * Reads only — never modifies GLBs.
 */
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { parseGLBBuffer, computeWorldBounds } from './lib/glb.js';
import * as THREE from 'three';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const TARGETS = {
  SMR_ContainmentDome: { label: 'Containment dome', blockout: 'h=30 d~27 @(-4,-2)', pos: [-4, 0, -2] },
  SMR_CenterBuilding: { label: 'Aux/control building', blockout: '26.9x13.9x20.4 @(-35,2)', pos: [-35, 0, 2] },
  SMR_RooftopHVAC: { label: 'Rooftop HVAC', blockout: 'on aux roof', pos: [-35, 14, 2] },
  SMR_CentralUnitBlock: { label: 'Central unit / reactor annex', blockout: '9x14.7x12.8 @(-4,22)', pos: [-4, 0, 22] },
  SMR_TurbineBuilding: { label: 'Turbine hall', blockout: '30.2x12x22.2 @(26,16)', pos: [26, 0, 16] },
  SMR_ExhaustStack: { label: 'Exhaust stack', blockout: 'h=34 @(36,30)', pos: [36, 0, 30] },
  SMR_CentralSubstation: { label: 'Substation / switchyard', blockout: '17.6x5.2x13.7 @(56,12)', pos: [56, 0, 12] },
  SMR_MechanicalPumps: { label: 'Mechanical pumps', blockout: 'intake area', pos: [-38, 0, -40] },
  SMR_PipeLoopSegment: { label: 'Pipe loop', blockout: 'intake pipes @(-42,-48)', pos: [-42, 0, -48] },
  SMR_PerimeterWall_Sea: { label: 'Sea-side security wall', blockout: 'sea edge z=-44', pos: [0, 0, -44] },
  SMR_PerimeterWall_Land: { label: 'Inland security wall', blockout: 'inland edge z=+46', pos: [0, 0, 46] },
  SMR_SolarArray_A: { label: 'Campus solar farm A', blockout: 'east utility field', pos: [76, 0, 6] },
  SMR_SolarArray_B: { label: 'Campus solar farm B', blockout: 'east utility field', pos: [76, 0, 36] },
};

// Import config from the TS loader (Node 24 native type stripping).
const { SMR_COMPONENT_CONFIG } = await import('../src/scene1/assetLoader.ts');

const placed = [];
for (const cfg of SMR_COMPONENT_CONFIG) {
  // Public path /assets/scene1/SMR/X.glb <-> production assets/production_glb/SMR/X.glb (byte-identical).
  const rel = cfg.path.replace(/^\/assets\/scene1\//, 'assets/production_glb/');
  const raw = readFileSync(ROOT + rel);
  const json = parseGLBBuffer(raw);
  const results = computeWorldBounds(json);
  if (!results.length) {
    console.log(`!! ${cfg.id}: no mesh bounds found`);
    continue;
  }
  // Bounding box of the WHOLE component in model space.
  const m = new THREE.Matrix4().compose(
    new THREE.Vector3(...cfg.position),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(...cfg.rotation)),
    new THREE.Vector3(cfg.scale, cfg.scale, cfg.scale)
  );
  let min = new THREE.Vector3(Infinity, Infinity, Infinity);
  let max = new THREE.Vector3(-Infinity, -Infinity, -Infinity);
  for (const r of results) {
    for (const c of [[0, 0, 0], [1, 0, 0], [0, 1, 0], [0, 0, 1], [1, 1, 0], [1, 0, 1], [0, 1, 1], [1, 1, 1]]) {
      const p = new THREE.Vector3(
        c[0] ? r.max[0] : r.min[0],
        c[1] ? r.max[1] : r.min[1],
        c[2] ? r.max[2] : r.min[2]
      ).applyMatrix4(m);
      min.min(p);
      max.max(p);
    }
  }
  const size = new THREE.Vector3().subVectors(max, min);
  placed.push({ id: cfg.id, min: min.toArray(), max: max.toArray(), size: size.toArray(), gap: min.y });
}

const ELEVATED = new Set(['SMR_RooftopHVAC']);

console.log(`\n=== SMR ASSEMBLY CHECK (anchor [-120, 0, -250]) ===\n`);
console.log('Per-component placed bounds (relative to facility anchor):');
for (const p of placed) {
  const t = TARGETS[p.id] ?? {};
  const elevated = ELEVATED.has(p.id);
  const gapErr = !elevated && (p.gap < -0.15 || p.gap > 0.15);
  const flag = elevated ? '  (intentionally elevated)' : gapErr ? `  <-- GROUND GAP! (${p.gap.toFixed(3)}m)` : '';
  console.log(
    `  ${p.id.padEnd(22)} size(${p.size.map((v) => v.toFixed(1)).join(',')})  min(${p.min.map((v) => v.toFixed(1)).join(',')})  groundY=${p.gap.toFixed(3)}${flag}`
  );
  if (t.label) console.log(`      ${t.label} | blockout: ${t.blockout}`);
}

const overall = {
  min: placed.reduce((a, p) => (p.min[0] < a[0] ? p.min : a).slice(), placed[0].min.slice()),
};
overall.min = placed.reduce((a, p) => p.min.map((v, i) => Math.min(a[i], v)), placed[0].min.slice());
overall.max = placed.reduce((a, p) => p.max.map((v, i) => Math.max(a[i], v)), placed[0].max.slice());
overall.size = overall.max.map((v, i) => v - overall.min[i]);
console.log(`\nOverall facility bounds: min(${overall.min.map((v) => v.toFixed(1))}) max(${overall.max.map((v) => v.toFixed(1))}) size(${overall.size.map((v) => v.toFixed(1))})`);
console.log(`Footprint: ${overall.size[0].toFixed(1)}m (X) x ${overall.size[2].toFixed(1)}m (Z), max height ${overall.size[1].toFixed(1)}m`);
console.log(`Blockout reference: 112m x 84m x ~35m (excl. chimney)`);

console.log('\nPairwise AABB overlaps:');
let overlaps = 0;
for (let i = 0; i < placed.length; i++) {
  for (let j = i + 1; j < placed.length; j++) {
    const a = placed[i], b = placed[j];
    const ox = Math.min(a.max[0], b.max[0]) - Math.max(a.min[0], b.min[0]);
    const oy = Math.min(a.max[1], b.max[1]) - Math.max(a.min[1], b.min[1]);
    const oz = Math.min(a.max[2], b.max[2]) - Math.max(a.min[2], b.min[2]);
    if (ox > 0 && oy > 0 && oz > 0) {
      overlaps++;
      const vol = ox * oy * oz;
      console.log(`  OVERLAP ${a.id} <-> ${b.id}: ${ox.toFixed(1)}x${oy.toFixed(1)}x${oz.toFixed(1)}m (${vol.toFixed(0)} m3)`);
    }
  }
}
console.log(overlaps === 0 ? '  none — components do not interpenetrate (AABB check)' : `  ${overlaps} overlapping pairs (AABB check)`);

const review = [
  'SMR_CentralUnitBlock',
  'SMR_PerimeterWall',
  'SMR_ExhaustStack',
  'SMR_ContainmentDome',
];
console.log('\nComponents flagged for manual review: ' + review.join(', '));
console.log('(roles/shapes ambiguous or deviating most from blockout proportions)');
