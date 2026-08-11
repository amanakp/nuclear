/**
 * lib/glb.js — shared GLB inspection helpers for the NUCLEUS asset pipeline.
 * Reads the GLB binary container and computes world-space bounds WITHOUT
 * decoding mesh buffers (uses the POSITION accessor min/max, which glTF
 * requires, transformed through the node hierarchy).
 *
 * Temporary pipeline tooling — not part of the shipped app.
 */
import { readFileSync } from 'fs';
import * as THREE from 'three';

/** Parse a GLB file into its JSON (glTF) payload. */
export function readGLB(path) {
  const buf = readFileSync(path);
  return parseGLBBuffer(buf);
}

/** Parse a GLB ArrayBuffer/Buffer into the embedded glTF JSON. */
export function parseGLBBuffer(buf) {
  const bytes = new Uint8Array(buf);
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  const magic = String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3]);
  if (magic !== 'glTF') throw new Error(`Not a GLB file (magic: ${magic})`);
  const totalLen = dv.getUint32(8, true);
  let offset = 12;
  let json = null;
  while (offset < totalLen) {
    const chunkLen = dv.getUint32(offset, true);
    const chunkType = dv.getUint32(offset + 4, true);
    const data = bytes.subarray(offset + 8, offset + 8 + chunkLen);
    if (chunkType === 0x4e4f534a) {
      json = JSON.parse(new TextDecoder().decode(data));
    }
    offset += 8 + chunkLen;
  }
  if (!json) throw new Error('No JSON chunk found in GLB');
  return json;
}

/** Resolve a node's local matrix (from `matrix` or TRS). glTF quaternions are XYZW. */
export function nodeMatrix(node) {
  const m = new THREE.Matrix4();
  if (node.matrix) {
    m.fromArray(node.matrix);
  } else {
    m.compose(
      new THREE.Vector3(...(node.translation ?? [0, 0, 0])),
      new THREE.Quaternion().fromArray(node.rotation ?? [0, 0, 0, 1]),
      new THREE.Vector3(...(node.scale ?? [1, 1, 1]))
    );
  }
  return m;
}

/** Compute world-space bounding boxes for every node that references a mesh. */
export function computeWorldBounds(json) {
  const nodes = json.nodes ?? [];
  const meshes = json.meshes ?? [];
  const accessors = json.accessors ?? [];

  const worldMatrices = new Array(nodes.length).fill(null);
  const stack = (json.scenes?.[0]?.nodes ?? []).map((idx) => [idx, new THREE.Matrix4()]);
  while (stack.length) {
    const [idx, parentWorld] = stack.pop();
    const local = nodeMatrix(nodes[idx]);
    const world = new THREE.Matrix4().multiplyMatrices(parentWorld, local);
    worldMatrices[idx] = world;
    for (const child of nodes[idx].children ?? []) {
      stack.push([child, world]);
    }
  }

  const results = [];
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    if (node.mesh === undefined) continue;
    const mesh = meshes[node.mesh];
    if (!mesh) continue;
    const world = worldMatrices[i];
    let min = null;
    let max = null;
    let verts = 0;
    let tris = 0;
    for (const prim of mesh.primitives ?? []) {
      const posAcc = accessors[prim.attributes?.POSITION];
      if (!posAcc || !posAcc.min || !posAcc.max) continue;
      const cornerMin = new THREE.Vector3(...posAcc.min);
      const cornerMax = new THREE.Vector3(...posAcc.max);
      for (let c = 0; c < 8; c++) {
        const p = new THREE.Vector3(
          (c & 1 ? cornerMax.x : cornerMin.x),
          (c & 2 ? cornerMax.y : cornerMin.y),
          (c & 4 ? cornerMax.z : cornerMin.z)
        ).applyMatrix4(world);
        if (!min) { min = p.clone(); max = p.clone(); }
        min.min(p); max.max(p);
      }
      verts += posAcc.count ?? 0;
      const idxAcc = prim.indices !== undefined ? accessors[prim.indices] : null;
      tris += Math.floor((idxAcc ? idxAcc.count : posAcc.count ?? 0) / 3);
    }
    if (min && max) {
      results.push({
        nodeName: node.name ?? `node_${i}`,
        meshName: mesh.name ?? `mesh_${node.mesh}`,
        min: min.toArray(),
        max: max.toArray(),
        size: new THREE.Vector3().subVectors(max, min).toArray(),
        center: new THREE.Vector3().addVectors(min, max).multiplyScalar(0.5).toArray(),
        verts,
        tris,
      });
    }
  }
  return results;
}

/** Overall bounding box across all mesh results. */
export function overallBounds(results) {
  if (!results.length) return null;
  const min = new THREE.Vector3(Infinity, Infinity, Infinity);
  const max = new THREE.Vector3(-Infinity, -Infinity, -Infinity);
  for (const r of results) {
    min.min(new THREE.Vector3(...r.min));
    max.max(new THREE.Vector3(...r.max));
  }
  return {
    min: min.toArray(),
    max: max.toArray(),
    size: new THREE.Vector3().subVectors(max, min).toArray(),
    center: new THREE.Vector3().addVectors(min, max).multiplyScalar(0.5).toArray(),
  };
}

/** Sniff embedded image dimensions (PNG/JPEG/WebP) from a GLB bufferView. */
export function imageInfo(json, buf) {
  const images = (json.images ?? []).map((img, i) => {
    const base = { index: i, name: img.name ?? `image_${i}` };
    if (img.uri) {
      base.uri = img.uri;
      return base;
    }
    if (img.bufferView !== undefined) {
      const bv = json.bufferViews[img.bufferView];
      const data = new Uint8Array(buf, (json.buffers[0].byteOffset ?? 0) + bv.byteOffset, bv.byteLength);
      base.sizeKB = Math.round(bv.byteLength / 1024);
      base.dim = sniffImage(data);
    }
    return base;
  });
  return images;
}

function sniffImage(data) {
  if (data.length < 24) return null;
  const u32 = (o) => (data[o] << 24) | (data[o + 1] << 16) | (data[o + 2] << 8) | data[o + 3];
  const u16 = (o) => (data[o] << 8) | data[o + 1];
  if (data[0] === 0x89 && data[1] === 0x50) {
    return { format: 'png', width: u32(16), height: u32(20) };
  }
  if (data[0] === 0xff && data[1] === 0xd8) {
    let off = 2;
    while (off + 9 < data.length) {
      if (data[off] !== 0xff) { off++; continue; }
      const marker = data[off + 1];
      if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
        return { format: 'jpeg', height: u16(off + 5), width: u16(off + 7) };
      }
      const len = u16(off + 2);
      off += 2 + len;
    }
    return { format: 'jpeg', width: null, height: null };
  }
  if (data[0] === 0x52 && data[1] === 0x49 && data[2] === 0x46 && data[3] === 0x46) {
    return { format: 'webp', width: u16(26) & 0x3fff, height: u16(28) & 0x3fff };
  }
  if (data[0] === 0xab && data[1] === 0x4b && data[2] === 0x54) {
    return { format: 'ktx2', width: null, height: null, note: 'KTX2 binary texture (dimensions in header, not parsed)' };
  }
  return { format: `unknown(${data[0].toString(16)},${data[1].toString(16)})`, width: null, height: null };
}

/** Summary of materials referenced by actual mesh primitives. */
export function materialSummary(json) {
  const materials = json.materials ?? [];
  return materials.map((m, i) => ({
    index: i,
    name: m.name ?? `material_${i}`,
    alpha: m.alphaMode ?? 'OPAQUE',
    doubleSided: m.doubleSided ?? false,
    hasBaseColor: !!m.pbrMetallicRoughness?.baseColorTexture,
    hasNormal: !!m.normalTexture,
    hasORM: !!m.pbrMetallicRoughness?.metallicRoughnessTexture,
    emissive: !!m.emissiveTexture,
    extensions: Object.keys(m.extensions ?? {}),
  }));
}
