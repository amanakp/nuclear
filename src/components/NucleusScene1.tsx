import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { VRButton } from 'three/addons/webxr/VRButton.js';
import type { Hotspot3D, Scene1ZoneId, ScreenPosition } from '../types/scene1';
import { CAMERA_PRESETS, HOTSPOTS } from '../data/scene1Data';
import type { ProbeHandle } from './RuntimeProbe';
import { createSky } from '../scene1/sky';
import { createOcean } from '../scene1/ocean';
import { createTerrain } from '../scene1/terrain';
import { createCity } from '../scene1/city';
import { createNuwardPlant } from '../scene1/nuwardPlant';
import { createFacilities } from '../scene1/facilities';
import { createPipelines } from '../scene1/pipelines';
import {
  loadSMRReactorBuilding,
  loadSceneHeroAssets,
  type LoadedAsset,
  type HeroAssetHandle,
} from '../scene1/assetLoader';

interface NucleusScene1Props {
  currentZone: Scene1ZoneId;
  selectedHotspotId: string | null;
  onSelectHotspot: (hotspot: Hotspot3D) => void;
  onScreenPositions: (positions: ScreenPosition[]) => void;
}

interface EngineHandle {
  flyTo: (zone: Scene1ZoneId) => void;
  setSelected: (id: string | null) => void;
}

interface HotspotMarker {
  hotspot: Hotspot3D;
  ring: THREE.Mesh;
  pillar: THREE.Mesh;
  core: THREE.Mesh;
  hit: THREE.Mesh;
}

const SEED = 20260808;

/** Camera framing presets for ?focus=<id> views (presentation close-ups). */
const FOCUS_PRESETS: Record<string, { position: [number, number, number]; target: [number, number, number] }> = {
  overview: { position: [10, 190, -580], target: [70, 14, -40] },
  smr: { position: [-120, 40, -110], target: [-120, 6, -250] },
  des: { position: [-200, 45, -220], target: [-260, 8, -285] },
  dtc: { position: [95, 45, -175], target: [40, 8, -240] },
  hst: { position: [230, 40, -130], target: [170, 8, -195] },
  dst: { position: [240, 50, -40], target: [310, 12, -110] },
  city: { position: [330, 115, 330], target: [200, 18, 60] },
  sea: { position: [-60, 45, -560], target: [-80, 3, -320] },
};

export const NucleusScene1: React.FC<NucleusScene1Props> = ({
  currentZone,
  selectedHotspotId,
  onSelectHotspot,
  onScreenPositions,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<EngineHandle | null>(null);
  const skipFirstFlyRef = useRef(true);
  const callbacksRef = useRef({ onSelectHotspot, onScreenPositions });
  useEffect(() => {
    callbacksRef.current = { onSelectHotspot, onScreenPositions };
  }, [onSelectHotspot, onScreenPositions]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // ---------- Renderer ----------
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.domElement.style.touchAction = 'none';
    container.appendChild(renderer.domElement);

    // ---------- Scene / Camera / Lights ----------
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#cfe3ee');
    scene.fog = new THREE.Fog(0xe8e4d4, 450, 3400);

    const camera = new THREE.PerspectiveCamera(
      50,
      container.clientWidth / container.clientHeight,
      0.5,
      7000
    );

    const hemi = new THREE.HemisphereLight(0xbfe3ff, 0x4c6b52, 0.85);
    scene.add(hemi);

    const sky = createSky(SEED);
    const sun = new THREE.DirectionalLight(0xfff1d0, 2.6);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.camera.near = 10;
    sun.shadow.camera.far = 1600;
    const sunBox = 340;
    sun.shadow.camera.left = -sunBox;
    sun.shadow.camera.right = sunBox;
    sun.shadow.camera.top = sunBox;
    sun.shadow.camera.bottom = -sunBox;
    sun.shadow.bias = -0.0004;
    sun.shadow.normalBias = 0.6;
    sun.position.copy(sky.sunDirection).multiplyScalar(900);
    sun.target.position.set(60, 0, 0);
    scene.add(sky.group, sun, sun.target);

    // ---------- World ----------
    const ocean = createOcean();
    const terrain = createTerrain(SEED);
    const city = createCity(SEED);
    const facilities = createFacilities();
    const pipelines = createPipelines();
    // Instant procedural plant keeps the scene populated while the production
    // GLB campus streams in; it is replaced by the GLB assembly on success.
    const proceduralPlant = createNuwardPlant();
    scene.add(
      ocean.group,
      terrain.mesh,
      city.group,
      proceduralPlant.group,
      facilities.group,
      pipelines.group
    );

    // ---- Production GLB SMR campus (loaded first; hero assets deferred) ----
    let alive = true;
    let smrHandle: LoadedAsset | null = null;
    let heroHandle: HeroAssetHandle | null = null;
    let smrUpdate: ((t: number) => void) | null = null;

    (async () => {
      const smr = await loadSMRReactorBuilding();
      if (!alive) {
        smr?.dispose();
        return;
      }
      if (smr) {
        smr.lod.name = 'NuwardSMR';
        scene.add(smr.lod);
        scene.remove(proceduralPlant.group);
        proceduralPlant.dispose();
        smrHandle = smr;
        smrUpdate = smr.update ?? null;
      }
    })();

    // ---- Hero assets (skyscraper + offshore turbines) are deferred ----
    // They start loading only once the SMR campus is in AND the camera is
    // within range and looking at one of them — so the initial mount loads
    // a single asset stream instead of 16 GLBs at once.
    const heroAnchors: THREE.Vector3[] = [
      new THREE.Vector3(160, 0, -120),
      new THREE.Vector3(-520, 0, -460),
      new THREE.Vector3(-660, 0, -590),
    ];
    const heroLoadDistance = 900;
    let heroLoadStarted = false;
    const startHeroLoad = () => {
      heroLoadStarted = true;
      (async () => {
        const hero = await loadSceneHeroAssets();
        if (!alive) {
          hero?.dispose();
          return;
        }
        if (hero) {
          heroHandle = hero;
          scene.add(hero.group);
        }
      })();
    };
    const toHeroAnchor = new THREE.Vector3();
    const cameraDir = new THREE.Vector3();
    const maybeLoadHeroAssets = () => {
      if (heroLoadStarted || heroHandle || !smrHandle) return;
      const focusId = new URLSearchParams(window.location.search).get('focus') ?? '';
      if (focusId === 'city' || focusId === 'sea') {
        startHeroLoad();
        return;
      }
      camera.getWorldDirection(cameraDir);
      for (const anchor of heroAnchors) {
        toHeroAnchor.subVectors(anchor, camera.position);
        if (toHeroAnchor.length() <= heroLoadDistance && toHeroAnchor.normalize().dot(cameraDir) > 0) {
          startHeroLoad();
          return;
        }
      }
    };

    // ---------- Hotspot markers ----------
    const markers: HotspotMarker[] = [];
    const hitMeshes: THREE.Mesh[] = [];
    for (const hotspot of HOTSPOTS) {
      const [hx, hy, hz] = hotspot.position3D;
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(2.4, 3.0, 28),
        new THREE.MeshBasicMaterial({
          color: 0x34e3ff,
          transparent: true,
          opacity: 0.7,
          side: THREE.DoubleSide,
          depthWrite: false,
        })
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(hx, Math.max(1.0, hy * 0.3), hz);

      const pillar = new THREE.Mesh(
        new THREE.CylinderGeometry(0.12, 0.12, hy, 6),
        new THREE.MeshBasicMaterial({
          color: 0x34e3ff,
          transparent: true,
          opacity: 0.16,
          depthWrite: false,
        })
      );
      pillar.position.set(hx, Math.max(1.0, hy * 0.3) + hy / 2, hz);

      const core = new THREE.Mesh(
        new THREE.OctahedronGeometry(1.1, 0),
        new THREE.MeshBasicMaterial({ color: 0x8ff6ff })
      );
      core.position.set(hx, hy, hz);

      const hit = new THREE.Mesh(
        new THREE.SphereGeometry(7, 8, 6),
        new THREE.MeshBasicMaterial({ visible: false })
      );
      hit.position.set(hx, hy, hz);
      hit.userData.hotspotId = hotspot.id;

      scene.add(ring, pillar, core, hit);
      markers.push({ hotspot, ring, pillar, core, hit });
      hitMeshes.push(hit);
    }

    // ---------- Orbit camera ----------
    const orbit = {
      theta: 0,
      phi: 0.6,
      radius: 500,
      target: new THREE.Vector3(60, 18, -40),
    };
    const applyOrbit = () => {
      orbit.phi = THREE.MathUtils.clamp(orbit.phi, 0.12, 1.45);
      orbit.radius = THREE.MathUtils.clamp(orbit.radius, 20, 1400);
      const sp = new THREE.Spherical(orbit.radius, orbit.phi, orbit.theta);
      camera.position.copy(orbit.target).add(new THREE.Vector3().setFromSpherical(sp));
      camera.lookAt(orbit.target);
    };
    const sphericalFromCamera = () => {
      const offset = new THREE.Vector3().subVectors(camera.position, orbit.target);
      orbit.radius = offset.length();
      orbit.theta = Math.atan2(offset.x, offset.z);
      orbit.phi = Math.acos(THREE.MathUtils.clamp(offset.y / orbit.radius, -1, 1));
    };

    let flying = false;
    let flyTime = 0;
    const flyFromPos = new THREE.Vector3();
    const flyToPos = new THREE.Vector3();
    const flyFromTarget = new THREE.Vector3();
    const flyToTarget = new THREE.Vector3();
    const easeInOutCubic = (x: number) =>
      x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;

    const flyTo = (zone: Scene1ZoneId, instant = false) => {
      const preset = CAMERA_PRESETS.find((p) => p.zone === zone);
      if (!preset) return;
      flyFromPos.copy(camera.position);
      flyFromTarget.copy(orbit.target);
      flyToPos.fromArray(preset.position);
      flyToTarget.fromArray(preset.target);
      orbit.target.copy(flyToTarget);
      if (instant) {
        camera.position.copy(flyToPos);
        camera.lookAt(orbit.target);
        sphericalFromCamera();
        return;
      }
      flying = true;
      flyTime = 0;
    };

    // ---------- Raycast picking ----------
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const pickHotspot = (hitId: string | null) => {
      if (!hitId) return;
      const hotspot = HOTSPOTS.find((h) => h.id === hitId);
      if (hotspot) callbacksRef.current.onSelectHotspot(hotspot);
    };
    const pickAt = (ndcX: number, ndcY: number) => {
      pointer.set(ndcX, ndcY);
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(hitMeshes, false);
      pickHotspot(hits.length > 0 ? (hits[0].object.userData.hotspotId as string) : null);
    };

    // ---------- Pointer / touch / wheel ----------
    const pointers = new Map<number, { x: number; y: number }>();
    let movedPx = 0;
    let lastPinchDist = 0;

    const onPointerDown = (e: PointerEvent) => {
      if (flying) {
        flying = false;
        sphericalFromCamera();
      }
      renderer.domElement.setPointerCapture(e.pointerId);
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      movedPx = 0;
      if (pointers.size === 2) {
        const [a, b] = [...pointers.values()];
        lastPinchDist = Math.hypot(a.x - b.x, a.y - b.y);
      }
    };
    const onPointerMove = (e: PointerEvent) => {
      const p = pointers.get(e.pointerId);
      if (!p) return;
      const dx = e.clientX - p.x;
      const dy = e.clientY - p.y;
      movedPx += Math.abs(dx) + Math.abs(dy);
      if (pointers.size === 2) {
        const [a, b] = [...pointers.values()];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (lastPinchDist > 0) {
          orbit.radius = orbit.radius * (lastPinchDist / d);
          applyOrbit();
        }
        lastPinchDist = d;
      } else if (pointers.size === 1) {
        orbit.theta -= dx * 0.005;
        orbit.phi -= dy * 0.005;
        applyOrbit();
      }
      p.x = e.clientX;
      p.y = e.clientY;
    };
    const onPointerUp = (e: PointerEvent) => {
      pointers.delete(e.pointerId);
      if (pointers.size === 0 && movedPx <= 6) {
        const rect = renderer.domElement.getBoundingClientRect();
        pickAt(
          ((e.clientX - rect.left) / rect.width) * 2 - 1,
          -((e.clientY - rect.top) / rect.height) * 2 + 1
        );
      }
    };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      flying = false;
      orbit.radius = orbit.radius * (1 + e.deltaY * 0.001);
      applyOrbit();
    };
    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    renderer.domElement.addEventListener('pointermove', onPointerMove);
    renderer.domElement.addEventListener('pointerup', onPointerUp);
    renderer.domElement.addEventListener('wheel', onWheel, { passive: false });

    // ---------- XR (Meta Quest 3) ----------
    renderer.xr.enabled = true;
    const vrButton = VRButton.createButton(renderer);
    vrButton.style.position = 'absolute';
    vrButton.style.bottom = '16px';
    vrButton.style.right = '16px';
    container.appendChild(vrButton);

    const controller0 = renderer.xr.getController(0);
    const controller1 = renderer.xr.getController(1);
    const rayMat = new THREE.LineBasicMaterial({
      color: 0x34e3ff,
      transparent: true,
      opacity: 0.6,
    });
    const rayGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, -2),
    ]);
    controller0.add(new THREE.Line(rayGeo, rayMat));
    controller1.add(new THREE.Line(rayGeo, rayMat));
    controller0.visible = false;
    controller1.visible = false;
    scene.add(controller0, controller1);

    const raycastFromController = (controller: THREE.Object3D) => {
      raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
      raycaster.ray.direction.set(0, 0, -1).applyQuaternion(controller.quaternion);
      const hits = raycaster.intersectObjects(hitMeshes, false);
      pickHotspot(hits.length > 0 ? (hits[0].object.userData.hotspotId as string) : null);
    };
    const pick0 = () => raycastFromController(controller0);
    const pick1 = () => raycastFromController(controller1);
    controller0.addEventListener('selectstart', pick0);
    controller1.addEventListener('selectstart', pick1);

    const onSessionStart = () => {
      controller0.visible = true;
      controller1.visible = true;
      renderer.setPixelRatio(1);
    };
    const onSessionEnd = () => {
      controller0.visible = false;
      controller1.visible = false;
    };
    renderer.xr.addEventListener('sessionstart', onSessionStart);
    renderer.xr.addEventListener('sessionend', onSessionEnd);

    // ---------- Selected highlight ----------
    const setSelected = (id: string | null) => {
      for (const m of markers) {
        const selected = m.hotspot.id === id;
        (m.core.material as THREE.MeshBasicMaterial).color.setHex(selected ? 0xffd66b : 0x8ff6ff);
        m.core.scale.setScalar(selected ? 1.6 : 1);
        (m.ring.material as THREE.MeshBasicMaterial).opacity = selected ? 1 : 0.7;
      }
    };

    // ---------- Projection to screen ----------
    const tmpV = new THREE.Vector3();
    let lastProjection = '';
    let frameCounter = 0;
    const updateProjections = () => {
      frameCounter++;
      if (frameCounter % 3 !== 0) return;
      const out: ScreenPosition[] = [];
      for (const h of HOTSPOTS) {
        tmpV.fromArray(h.position3D).project(camera);
        const visible =
          tmpV.z < 1 &&
          tmpV.z > -1 &&
          tmpV.x > -1.05 &&
          tmpV.x < 1.05 &&
          tmpV.y > -1.05 &&
          tmpV.y < 1.05;
        out.push({
          id: h.id,
          x: (tmpV.x * 0.5 + 0.5) * 100,
          y: (tmpV.y * 0.5 + 0.5) * 100,
          visible,
          label: h.name,
          code: h.code,
          category: h.category,
        });
      }
      const key = out.map((p) => `${p.id}:${p.visible ? `${p.x.toFixed(1)},${p.y.toFixed(1)}` : 'x'}`).join('|');
      if (key !== lastProjection) {
        lastProjection = key;
        callbacksRef.current.onScreenPositions(out);
      }
    };

    // ---------- Adaptive quality ----------
    let fpsEma = 60;
    let lowFrames = 0;
    let highFrames = 0;
    let quality = Math.min(window.devicePixelRatio, 1.5);

    // ---------- Animation loop ----------
    const clock = new THREE.Clock();
    const animate = () => {
      const dt = Math.min(clock.getDelta(), 0.1);
      const t = clock.elapsedTime;

      const fps = 1 / Math.max(dt, 1e-4);
      fpsEma += (fps - fpsEma) * 0.05;
      if (fpsEma < 30 && ++lowFrames > 45) {
        quality = Math.max(0.6, quality * 0.75);
        renderer.setPixelRatio(quality);
        lowFrames = 0;
        highFrames = 0;
      } else if (fpsEma > 57 && ++highFrames > 120) {
        quality = Math.min(1.5, quality * 1.15);
        renderer.setPixelRatio(quality);
        lowFrames = 0;
        highFrames = 0;
      }

      sky.update(dt);
      ocean.update(t);
      city.update(t, dt);
      if (!smrHandle) proceduralPlant.update(t);
      smrUpdate?.(t);
      facilities.update(t);
      pipelines.update(t);
      maybeLoadHeroAssets();

      if (flying) {
        flyTime += dt / 1.7;
        const e = easeInOutCubic(Math.min(1, flyTime));
        camera.position.lerpVectors(flyFromPos, flyToPos, e);
        camera.lookAt(flyToTarget);
        if (flyTime >= 1) {
          flying = false;
          sphericalFromCamera();
        }
      }

      markers.forEach((m, i) => {
        (m.pillar.material as THREE.MeshBasicMaterial).opacity =
          0.1 + 0.08 * Math.sin(t * 2 + i);
        m.ring.rotation.z = t * 0.3 + i;
        m.core.rotation.y += dt * 1.5;
      });

      updateProjections();
      renderer.render(scene, camera);
    };
    renderer.setAnimationLoop(animate);

    // ---------- Resize ----------
    const resize = () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (w === 0 || h === 0) return;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    const ro = new ResizeObserver(resize);
    ro.observe(container);
    window.addEventListener('resize', resize);

    // ---------- Initial camera ----------
    const focusId = new URLSearchParams(window.location.search).get('focus') ?? '';
    const focusCam = FOCUS_PRESETS[focusId];
    if (focusCam) {
      orbit.target.fromArray(focusCam.target);
      camera.position.fromArray(focusCam.position);
    } else {
      const initialPreset = CAMERA_PRESETS.find((p) => p.zone === currentZone) ?? CAMERA_PRESETS[0];
      orbit.target.fromArray(initialPreset.target);
      camera.position.fromArray(initialPreset.position);
    }
    camera.lookAt(orbit.target);
    sphericalFromCamera();
    setSelected(null);

    engineRef.current = { flyTo: (zone) => flyTo(zone), setSelected };

    if (new URLSearchParams(window.location.search).get('probe') === '1') {
      (window as unknown as { __NUCLEUS__?: ProbeHandle }).__NUCLEUS__ = {
        renderer,
        scene,
        camera,
      };
    }

    // ---------- Cleanup ----------
    return () => {
      alive = false;
      smrHandle?.dispose();
      heroHandle?.dispose();
      ro.disconnect();
      window.removeEventListener('resize', resize);
      renderer.setAnimationLoop(null);
      renderer.xr.removeEventListener('sessionstart', onSessionStart);
      renderer.xr.removeEventListener('sessionend', onSessionEnd);
      controller0.removeEventListener('selectstart', pick0);
      controller1.removeEventListener('selectstart', pick1);
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      renderer.domElement.removeEventListener('pointermove', onPointerMove);
      renderer.domElement.removeEventListener('pointerup', onPointerUp);
      renderer.domElement.removeEventListener('wheel', onWheel);
      sky.dispose();
      ocean.dispose();
      terrain.dispose();
      city.dispose();
      proceduralPlant.dispose();
      facilities.dispose();
      pipelines.dispose();
      hitMeshes.forEach((m) => {
        m.geometry.dispose();
        (m.material as THREE.Material).dispose();
      });
      markers.forEach((m) => {
        m.ring.geometry.dispose();
        m.pillar.geometry.dispose();
        m.core.geometry.dispose();
        (m.ring.material as THREE.Material).dispose();
        (m.pillar.material as THREE.Material).dispose();
        (m.core.material as THREE.Material).dispose();
      });
      rayGeo.dispose();
      rayMat.dispose();
      vrButton.remove();
      renderer.dispose();
      container.removeChild(renderer.domElement);
      engineRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (skipFirstFlyRef.current) {
      skipFirstFlyRef.current = false;
      return;
    }
    engineRef.current?.flyTo(currentZone);
  }, [currentZone]);

  useEffect(() => {
    engineRef.current?.setSelected(selectedHotspotId);
  }, [selectedHotspotId]);

  return <div ref={containerRef} className="absolute inset-0" />;
};
