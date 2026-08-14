/**
 * smr_assembly.ts — temporary NUCLEUS SMR assembly debug view (Phase 3).
 *
 * Served by `npx vite` at http://localhost:5173/pipeline/debug/smr_assembly.html
 * Loads the assembled modular SMR (same code path as the production loader),
 * renders it with orbit controls, per-component bbox wireframes and a HUD
 * reporting per-component load status and placed bounds.
 *
 * NOT part of the app bundle — temporary validation tooling.
 */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { SMR_COMPONENT_CONFIG, loadSMRReactorBuilding } from '../../src/scene1/assetLoader';

const hud = document.getElementById('hud') as HTMLDivElement;
const hint = document.getElementById('hint') as HTMLDivElement;
const STATIC = new URLSearchParams(location.search).has('static');

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color('#cfe3ee');
scene.fog = new THREE.Fog(0xe8e4d4, 600, 1600);

const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.5, 4000);
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(-120, 12, -250);

scene.add(new THREE.HemisphereLight(0xbfe3ff, 0x4c6b52, 0.9));
const sun = new THREE.DirectionalLight(0xfff1d0, 2.2);
sun.position.set(-120 + 300, 300, -250 + 200);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.near = 10;
sun.shadow.camera.far = 1600;
sun.shadow.camera.left = -200;
sun.shadow.camera.right = 200;
sun.shadow.camera.top = 200;
sun.shadow.camera.bottom = -200;
scene.add(sun);

// Reference ground plane + grid at y = 0 (sea-level ground of Scene 1).
const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(600, 600),
  new THREE.MeshStandardMaterial({ color: 0x8a9386, roughness: 1, transparent: true, opacity: 0.55 })
);
ground.rotation.x = -Math.PI / 2;
ground.position.set(-120, -0.05, -250);
ground.receiveShadow = true;
scene.add(ground);

const grid = new THREE.GridHelper(400, 40, 0xffffff, 0x9fb0a0);
grid.position.set(-120, 0.02, -250);
scene.add(grid);

scene.add(new THREE.AxesHelper(30).translateX(-120).translateY(0.5).translateZ(-250));

// Facility anchor marker.
const anchor = new THREE.Mesh(
  new THREE.SphereGeometry(0.8, 12, 8),
  new THREE.MeshBasicMaterial({ color: 0xff4444 })
);
anchor.position.set(-120, 0.5, -250);
scene.add(anchor);

const wireframes: THREE.LineSegments[] = [];

async function main() {
  const result = await loadSMRReactorBuilding();
  if (!result) {
    hud.innerHTML = '<span class="err">FAILED: no SMR component loaded (procedural fallback applies in-app).</span>';
    return;
  }
  scene.add(result.lod);

  const assembly = result.lod.children.find((c) => c.name === 'SMR_ReactorBuilding');
  const placed: { id: string; box: THREE.Box3 }[] = [];
  if (assembly) {
    for (const child of assembly.children) {
      const box = new THREE.Box3().setFromObject(child);
      placed.push({ id: child.name, box });
      const wire = new THREE.LineSegments(
        new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 1, 1)),
        new THREE.LineBasicMaterial({ color: 0x34e3ff, transparent: true, opacity: 0.55 })
      );
      box.getCenter(wire.position);
      wire.scale.copy(box.getSize(new THREE.Vector3()));
      wire.name = `bbox_${child.name}`;
      wireframes.push(wire);
      scene.add(wire);
    }
  }

  const overall = new THREE.Box3().setFromObject(result.lod);
  const size = overall.getSize(new THREE.Vector3());
  const center = overall.getCenter(new THREE.Vector3());

  const lines: string[] = [];
  lines.push(`SMR modular assembly — ${placed.length}/${SMR_COMPONENT_CONFIG.length} components`);
  lines.push(`facility bounds: ${size.x.toFixed(1)} x ${size.y.toFixed(1)} x ${size.z.toFixed(1)} m`);
  lines.push(`anchor: [-120, 0, -250]   base y = 0   F: toggle wireframes`);
  lines.push('─'.repeat(44));
  for (const cfg of SMR_COMPONENT_CONFIG) {
    const p = placed.find((q) => q.id === cfg.id);
    if (p) {
      const s = p.box.getSize(new THREE.Vector3());
      const min = p.box.min;
      lines.push(`  ${p.id}  size(${s.x.toFixed(1)},${s.y.toFixed(1)},${s.z.toFixed(1)})  baseY=${min.y.toFixed(2)}`);
    } else {
      lines.push(`  <span class="err">${cfg.id}  NOT LOADED</span>`);
    }
  }
  hud.innerHTML = lines.join('\n');

  // Frame camera.
  const radius = Math.max(size.x, size.z, size.y) * 1.6;
  camera.position.set(center.x + radius * 0.8, center.y + radius * 0.6, center.z + radius);
  camera.lookAt(center);
  controls.target.copy(center);
  controls.update();

  let showWire = true;
  window.addEventListener('keydown', (e) => {
    if (e.key.toLowerCase() !== 'f') return;
    showWire = !showWire;
    wireframes.forEach((w) => (w.visible = showWire));
    hint.textContent = showWire ? 'wireframes ON' : 'wireframes OFF';
  });

  const marker = document.createElement('div');
  marker.id = 'status-marker';
  marker.style.display = 'none';
  marker.textContent = `FRAME_RENDERED ${placed.length}/${SMR_COMPONENT_CONFIG.length} loaded`;
  document.body.appendChild(marker);

  if (STATIC) {
    controls.update();
    renderer.render(scene, camera);
    marker.style.display = 'block';
    hint.textContent = 'STATIC MODE — single frame rendered';
    return;
  }

  renderer.setAnimationLoop(() => {
    controls.update();
    renderer.render(scene, camera);
  });
}

main().catch((err) => {
  hud.innerHTML = `<span class="err">ERROR: ${err?.message ?? err}</span>`;
});

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
