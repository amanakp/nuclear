#!/usr/bin/env node
/**
 * inspect_glb.mjs — NUCLEUS asset inspection CLI (temporary tooling).
 *
 * Usage:
 *   node pipeline/inspect_glb.mjs <file.glb> [--json out.json]
 *
 * Reports per-mesh-node world bounding boxes, triangle/vertex counts,
 * materials, embedded texture dimensions, extensions and generator.
 * Reads only — never modifies the GLB.
 */
import { readFileSync, writeFileSync, statSync } from 'fs';
import { parseGLBBuffer, computeWorldBounds, overallBounds, imageInfo, materialSummary } from './lib/glb.js';

const args = process.argv.slice(2);
if (!args.length) {
  console.error('Usage: node pipeline/inspect_glb.mjs <file.glb> [--json out.json]');
  process.exit(1);
}
const input = args[0];
const jsonOut = args.indexOf('--json') !== -1 ? args[args.indexOf('--json') + 1] : null;

const raw = readFileSync(input);
const json = parseGLBBuffer(raw);
const results = computeWorldBounds(json);
const overall = overallBounds(results);

const fmt = (a) => (a ?? []).map((v) => (v === null ? 'null' : Number(v).toFixed(2))).join(',');

console.log(`\n=== ${input} (${Math.round(statSync(input).size / 1024)} KB) ===`);
console.log(`generator: ${json.asset?.generator ?? null}  glTF ${json.asset?.version ?? null}`);
console.log(`extensions: ${JSON.stringify(json.extensionsUsed ?? [])}  required: ${JSON.stringify(json.extensionsRequired ?? [])}`);
console.log(`counts: nodes=${json.nodes?.length ?? 0} meshes=${json.meshes?.length ?? 0} materials=${json.materials?.length ?? 0} textures=${json.textures?.length ?? 0} images=${json.images?.length ?? 0} animations=${json.animations?.length ?? 0}`);
if (overall) {
  console.log(`OVERALL bbox: min(${fmt(overall.min)}) max(${fmt(overall.max)}) size(${fmt(overall.size)}) center(${fmt(overall.center)})`);
}
for (const m of results) {
  console.log(`  mesh "${m.nodeName}" | size(${fmt(m.size)}) min(${fmt(m.min)}) | tris=${m.tris} verts=${m.verts}`);
}
const images = imageInfo(json, raw);
if (images?.length) {
  for (const im of images) {
    const dim = im.dim ? `${im.dim.format} ${im.dim.width}x${im.dim.height} ${im.sizeKB ?? '?'}KB` : `uri:${im.uri ?? '?'}`;
    console.log(`  img "${im.name}": ${dim}`);
  }
}
for (const m of materialSummary(json)) {
  console.log(`  mat "${m.name}": alpha=${m.alpha} ds=${m.doubleSided} base=${m.hasBaseColor} normal=${m.hasNormal} orm=${m.hasORM} emissive=${m.emissive} ext=${JSON.stringify(m.extensions)}`);
}

if (jsonOut) {
  const report = {
    file: input,
    sizeKB: Math.round(statSync(input).size / 1024),
    generator: json.asset?.generator ?? null,
    gltfVersion: json.asset?.version ?? null,
    extensionsUsed: json.extensionsUsed ?? [],
    extensionsRequired: json.extensionsRequired ?? [],
    counts: {
      nodes: json.nodes?.length ?? 0,
      meshes: json.meshes?.length ?? 0,
      materials: json.materials?.length ?? 0,
      textures: json.textures?.length ?? 0,
      images: json.images?.length ?? 0,
      animations: json.animations?.length ?? 0,
    },
    overall,
    meshes: results,
    images,
  };
  writeFileSync(jsonOut, JSON.stringify(report, null, 2));
  console.log(`\nJSON report written: ${jsonOut}`);
}
