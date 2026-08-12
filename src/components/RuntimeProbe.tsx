import React, { useEffect, useState } from 'react';
import * as THREE from 'three';
import { FACILITIES, ZONE_LABELS } from '../data/scene1Data';
import type { Scene1ZoneId } from '../types/scene1';

export interface ProbeHandle {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
}

declare global {
  interface Window {
    __NUCLEUS__?: ProbeHandle;
  }
}

const facilityProbePoints: { key: string; name: string; position: [number, number, number] }[] = [
  { key: 'SMR', name: 'NUWARD SMR Plant', position: FACILITIES.smr.position },
  { key: 'DES', name: 'Desalination Plant', position: FACILITIES.desalination.position },
  { key: 'DTC', name: 'Data Center', position: FACILITIES.dataCenter.position },
  { key: 'HST', name: 'Heating Station', position: FACILITIES.heatingStation.position },
  { key: 'DST', name: 'District Zone', position: FACILITIES.districtZone.position },
  { key: 'BKK', name: 'Bangkok City (towers)', position: [200, 30, 60] },
  { key: 'SEA', name: 'Thailand Sea', position: [0, 0, -500] },
  { key: 'PIPE-W', name: 'Water Pipeline', position: [-110, 5, -237] },
  { key: 'PIPE-E', name: 'Electric Link', position: [-40, 16, -236] },
];

/** Points sampled from the actual rendered framebuffer, with expected color family. */
const pixelSamples: { key: string; name: string; p: [number, number, number]; expect: [number, number, number] }[] = [
  { key: 'OCEAN', name: 'Thailand Sea surface', p: [0, 0, -520], expect: [40, 130, 195] },
  { key: 'SAND', name: 'Beach sand', p: [-200, 0.4, -292], expect: [205, 185, 135] },
  { key: 'PARK', name: 'Park grass', p: [130, 0.7, 140], expect: [80, 145, 70] },
  { key: 'FLOOR', name: 'City concrete', p: [270, 0.62, 5], expect: [85, 90, 95] },
  { key: 'SPIRE', name: 'Green Spire tower', p: [195, 78, 55], expect: [60, 135, 85] },
  { key: 'DOME', name: 'SMR containment dome', p: [-120, 26, -256], expect: [215, 220, 225] },
  { key: 'RBAND', name: 'Dome red safety band', p: [-120, 9, -239.9], expect: [185, 62, 45] },
  { key: 'DES', name: 'Desalination hall', p: [-268, 8.5, -241], expect: [215, 220, 225] },
  { key: 'DTC', name: 'Data Center hall', p: [40, 9, -240], expect: [215, 220, 225] },
  { key: 'HST', name: 'Heating Station hall', p: [168, 7, -195], expect: [215, 220, 225] },
  { key: 'DST', name: 'District Zone building', p: [320.6, 16, -99.4], expect: [210, 200, 180] },
  { key: 'PIPEW', name: 'Water pipeline tube', p: [-110, 3.9, -237], expect: [60, 125, 200] },
  { key: 'CABLE', name: 'Electric cable', p: [-40, 19, -236], expect: [58, 62, 68] },
];

/** Dev/QA probe: renders a text report of the live scene state. Active only with ?probe=1. */
export const RuntimeProbe: React.FC = () => {
  const [report, setReport] = useState('probing…');

  useEffect(() => {
    const errors: string[] = [];
    const origError = console.error;
    console.error = (...args: unknown[]) => {
      errors.push(args.map(String).join(' '));
      origError(...args);
    };
    const onWindowError = (e: ErrorEvent) => errors.push(`window.onerror: ${e.message}`);
    window.addEventListener('error', onWindowError);

    let frames = 0;
    const start = performance.now();
    let fps = 0;
    let finished = false;
    let refreshTimer: number | undefined;

    const collect = () => {
      const lines: string[] = [];
      try {
      const zone = (new URLSearchParams(window.location.search).get('zone') ?? 'overview') as Scene1ZoneId;
      lines.push(`PROBE ZONE=${zone} (${ZONE_LABELS[zone]})`);
      lines.push(`measured fps (4s window, software renderer): ${fps.toFixed(1)}`);
      const nuc = window.__NUCLEUS__;
      if (!nuc) {
        lines.push('ERROR: window.__NUCLEUS__ missing — scene never initialized');
      } else {
        const { renderer, scene, camera } = nuc;
        lines.push(`renderer: WebGL2=${renderer.capabilities.isWebGL2} pixelRatio=${renderer.getPixelRatio().toFixed(2)}`);
        lines.push(`renderer.info: calls=${renderer.info.render.calls} triangles=${renderer.info.render.triangles} points=${renderer.info.render.points} lines=${renderer.info.render.lines}`);
        lines.push(`XR enabled=${renderer.xr.enabled} shadowMap=${renderer.shadowMap.enabled} type=${renderer.shadowMap.type}`);
        lines.push(`adaptive quality: cap=${window.devicePixelRatio > 1.5 ? '1.5' : 'devicePixelRatio'} floor=0.6`);
        lines.push(`camera: pos=(${camera.position.x.toFixed(1)}, ${camera.position.y.toFixed(1)}, ${camera.position.z.toFixed(1)})`);

        const find = (name: string) => scene.getObjectByName(name);
        const meshes = scene.children.filter((c) => c.type === 'Mesh');
        lines.push(`scene children: ${scene.children.length} (meshes: ${meshes.length})`);

        const sky = find('Sky');
        const ocean = find('Ocean');
        const terrain = find('Terrain');
        const city = find('BangkokCity');
        const plant = find('NuwardSMR');
        const facilities = find('GreenFacilities');
        const pipelines = find('Pipelines');

        lines.push(`groups: Sky=${sky ? 'OK' : 'MISSING'} Ocean=${ocean ? 'OK' : 'MISSING'} Terrain=${terrain ? 'OK' : 'MISSING'}`);
        lines.push(`groups: BangkokCity=${city ? 'OK' : 'MISSING'} NuwardSMR=${plant ? 'OK' : 'MISSING'}`);
        lines.push(`groups: GreenFacilities=${facilities ? 'OK' : 'MISSING'} Pipelines=${pipelines ? 'OK' : 'MISSING'}`);

        if (city) {
          const instanced = city.children.filter((c) => (c as THREE.InstancedMesh).isInstancedMesh) as THREE.InstancedMesh[];
          const counts = instanced.map((m) => (m as THREE.InstancedMesh).count);
          lines.push(`city instanced meshes=${instanced.length} counts=[${counts.join(',')}]`);
        }
        if (terrain) {
          const geo = (terrain as THREE.Mesh).geometry;
          const pos = geo.attributes.position;
          lines.push(`terrain verts=${pos ? pos.count : '?'} colorAttr=${geo.attributes.color ? 'yes' : 'no'}`);
        }
        if (ocean) {
          const mat = ((ocean as THREE.Group).children[0] as THREE.Mesh).material;
          lines.push(`ocean material type=${(mat as THREE.Material).type} fog=${(mat as THREE.ShaderMaterial).fog !== undefined ? 'n/a' : 'shader'}`);
        }

        // Hotspot markers
        let markerCount = 0;
        scene.traverse((o) => {
          if (o.userData.hotspotId) markerCount++;
        });
        lines.push(`hotspot hit-markers=${markerCount} (expected 9)`);

        // Visibility of required objects from the current camera
        const v = new THREE.Vector3();
        lines.push('visible-from-camera:');
        for (const p of facilityProbePoints) {
          v.fromArray(p.position).project(camera);
          const inView = v.z < 1 && v.z > -1 && v.x > -1.1 && v.x < 1.1 && v.y > -1.1 && v.y < 1.1;
          lines.push(`  ${p.key.padEnd(7)} ${p.name.padEnd(22)} ${inView ? 'IN-VIEW' : 'OFF-SCREEN'}`);
        }
      }

      const bodyText = document.body ? document.body.textContent ?? '' : '';
      const mustBeGone = ['REACTOR TELEMETRY', 'GREEN CITY OPERATIONS', 'ENERGY FLOW MAP', 'SPATIAL OVERRIDES', 'SCRAM', 'HoloLens', 'Caliper'];
      const gone = mustBeGone.filter((s) => bodyText.includes(s));
      lines.push(`old-UI remnants (should be []): ${gone.length ? gone.join(', ') : 'NONE'}`);
      const present = ['NUCLEUS //', 'SCENE 01', 'BANGKOK'];
      const missing = present.filter((s) => !bodyText.includes(s));
      lines.push(`new-UI missing (should be []): ${missing.length ? missing.join(', ') : 'NONE'}`);

      // ---- Pixel sampling of the actual rendered frame ----
      lines.push('pixel-samples (from offscreen re-render):');
      if (nuc) {
        const { renderer, scene, camera } = nuc;
        const size = new THREE.Vector2();
        renderer.getSize(size);
        const w = Math.max(2, Math.min(1024, Math.floor(size.x)));
        const h = Math.max(2, Math.min(576, Math.floor(size.y)));
        const rt = new THREE.WebGLRenderTarget(w, h, { depthBuffer: true });
        const prevRT = renderer.getRenderTarget();
        renderer.setRenderTarget(rt);
        renderer.render(scene, camera);
        renderer.setRenderTarget(prevRT);
        const buf = new Uint8Array(4);
        const v3 = new THREE.Vector3();
        for (const s of pixelSamples) {
          v3.fromArray(s.p).project(camera);
          if (v3.z >= 1 || v3.z <= -1 || v3.x < -1.05 || v3.x > 1.05 || v3.y < -1.05 || v3.y > 1.05) {
            lines.push(`  ${s.key.padEnd(7)} ${s.name.padEnd(28)} OFF-SCREEN`);
            continue;
          }
          const px = Math.round((v3.x * 0.5 + 0.5) * w);
          const py = Math.round((0.5 - v3.y * 0.5) * h);
          renderer.readRenderTargetPixels(rt, px, py, 1, 1, buf);
          const hex = `#${[buf[0], buf[1], buf[2]].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
          const delta = Math.max(
            Math.abs(buf[0] - s.expect[0]),
            Math.abs(buf[1] - s.expect[1]),
            Math.abs(buf[2] - s.expect[2])
          ) / 255;
          const verdict = delta < 0.42 ? 'PASS' : 'CHECK';
          lines.push(`  ${s.key.padEnd(7)} ${s.name.padEnd(28)} ${hex} expect~[${s.expect.join(',')}] ${verdict}`);
        }
        rt.dispose();
      }

      lines.push(`console errors (${errors.length}): ${errors.length ? errors.slice(0, 5).join(' ;; ') : 'NONE'}`);
      } catch (e) {
        lines.push(`PROBE COLLECT FAILED: ${(e as Error).message ?? String(e)}`);
      }
      const reportText = lines.join('\n');
      setReport(reportText);
      const node = document.getElementById('probe-report');
      if (node) node.textContent = reportText;
};
      const loop = () => {
        if (finished) return;
        frames++;
        const now = performance.now();
        if (now - start >= 4000) {
          finished = true;
          fps = frames / ((now - start) / 1000);
          collect();
          return;
        }
        requestAnimationFrame(loop);
      };
      requestAnimationFrame(loop);
      const delayMs = parseInt(new URLSearchParams(window.location.search).get('probeDelay') ?? '4000', 10) || 4000;
      const timeout = setTimeout(() => {
        if (!finished) {
          finished = true;
          fps = frames / ((performance.now() - start) / 1000);
        }
        collect();
        // Keep the report fresh: re-collect every 8s so headless probes can
        // sample the scene once the heavy GLB assets have finished mounting.
        refreshTimer = window.setInterval(collect, 8000);
      }, delayMs);

    return () => {
      clearTimeout(timeout);
      clearInterval(refreshTimer);
      window.removeEventListener('error', onWindowError);
      console.error = origError;
    };
  }, []);

  return (
    <>
      <div id="probe-report" className="fixed left-2 top-1 z-[60] hidden" aria-hidden="true" />
      <pre className="fixed left-2 bottom-14 z-[60] text-[10px] leading-tight font-mono text-lime-300 bg-black/85 p-2 max-w-[720px] max-h-[420px] overflow-auto whitespace-pre-wrap pointer-events-none">
        {report}
      </pre>
    </>
  );
};
