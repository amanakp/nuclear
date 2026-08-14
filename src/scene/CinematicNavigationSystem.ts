import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';
import { RenderShaderMode, ZoneId } from '../types/nuclear';
import { EnterpriseModelRole } from './EnterpriseSceneSystems';
import { WalkthroughChamber } from './ProceduralNuclearPlant';

export type DesktopNavigationMode = 'orbit' | 'walk' | 'fly' | 'first-person';

export interface LocalCameraPreset {
  position: THREE.Vector3;
  target: THREE.Vector3;
  fov?: number;
}

interface CameraTransition {
  active: boolean;
  startedAt: number;
  durationMs: number;
  positionCurve: THREE.CatmullRomCurve3;
  targetCurve: THREE.CatmullRomCurve3;
  fromFov: number;
  toFov: number;
  onComplete?: () => void;
}

interface TourWaypoint {
  time: number;
  position: THREE.Vector3;
  target: THREE.Vector3;
  fov: number;
  zone: ZoneId;
  renderMode: RenderShaderMode;
  focus: EnterpriseModelRole | null;
  hotspotId?: string | null;
}

interface CinematicTour {
  active: boolean;
  startedAt: number;
  durationMs: number;
  positionCurve: THREE.CatmullRomCurve3;
  targetCurve: THREE.CatmullRomCurve3;
  waypoints: TourWaypoint[];
  lastMarkerIndex: number;
  kind: 'intro' | 'presentation';
}

interface NavigationCallbacks {
  onChangeZone: (zone: ZoneId) => void;
  onChangeRenderMode: (mode: RenderShaderMode) => void;
  onPresentationFocus: (role: EnterpriseModelRole | null) => void;
  onPresentationHotspot?: (hotspotId: string | null) => void;
  onCinematicStateChange?: (active: boolean, kind: 'intro' | 'presentation' | null) => void;
}

export const ENTERPRISE_CAMERA_PRESETS: Record<ZoneId, LocalCameraPreset> = {
  overview: {
    position: new THREE.Vector3(148, 82, 185),
    target: new THREE.Vector3(-3, 18, -20),
    fov: 38,
  },
  core: {
    position: new THREE.Vector3(37, 31, 48),
    target: new THREE.Vector3(-10, 14, 0),
    fov: 40,
  },
  turbine: {
    position: new THREE.Vector3(82, 36, 87),
    target: new THREE.Vector3(25, 10, 29),
    fov: 41,
  },
  coolant: {
    position: new THREE.Vector3(-112, 68, 92),
    target: new THREE.Vector3(-42, 26, -28),
    fov: 43,
  },
  gantry: {
    position: new THREE.Vector3(108, 42, 65),
    target: new THREE.Vector3(55, 9, 4),
    fov: 40,
  },
  smr: {
    position: new THREE.Vector3(-120, 40, -110),
    target: new THREE.Vector3(-120, 6, -250),
    fov: 40,
  },
  facilities: {
    position: new THREE.Vector3(10, 75, 30),
    target: new THREE.Vector3(-40, 8, -250),
    fov: 42,
  },
  city: {
    position: new THREE.Vector3(330, 115, 330),
    target: new THREE.Vector3(200, 18, 60),
    fov: 38,
  },
  sea: {
    position: new THREE.Vector3(-60, 45, -560),
    target: new THREE.Vector3(-80, 3, -320),
    fov: 44,
  },
};

export const WALKTHROUGH_CAMERA_PRESETS: Record<WalkthroughChamber, LocalCameraPreset> = {
  reactor: {
    position: new THREE.Vector3(-1.5, 13.8, 13.5),
    target: new THREE.Vector3(-10, 10.5, 0),
    fov: 48,
  },
  turbine: {
    position: new THREE.Vector3(-1, 12.5, 35),
    target: new THREE.Vector3(26, 9.5, 29),
    fov: 49,
  },
};

const WALK_START_PRESET: LocalCameraPreset = {
  position: new THREE.Vector3(-5, 2.2, 50),
  target: new THREE.Vector3(-5, 2.2, 33),
  fov: 58,
};

function easeOutExpo(progress: number): number {
  return progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
}

function easeInOutCubic(progress: number): number {
  return progress < 0.5
    ? 4 * progress * progress * progress
    : 1 - Math.pow(-2 * progress + 2, 3) / 2;
}

function createTransitionCurve(
  start: THREE.Vector3,
  end: THREE.Vector3,
  lift: number,
): THREE.CatmullRomCurve3 {
  const direction = new THREE.Vector3().subVectors(end, start);
  const firstControl = start.clone().addScaledVector(direction, 0.32);
  const secondControl = start.clone().addScaledVector(direction, 0.72);
  const lateral = new THREE.Vector3(-direction.z, 0, direction.x);
  if (lateral.lengthSq() > Number.EPSILON) lateral.normalize();

  firstControl.y += lift;
  secondControl.y += lift * 0.55;
  firstControl.addScaledVector(lateral, Math.min(12, direction.length() * 0.035));
  secondControl.addScaledVector(lateral, -Math.min(8, direction.length() * 0.02));

  return new THREE.CatmullRomCurve3(
    [start.clone(), firstControl, secondControl, end.clone()],
    false,
    'centripetal',
    0.42,
  );
}

function isEditableTarget(target: EventTarget | null): boolean {
  return target instanceof HTMLInputElement
    || target instanceof HTMLTextAreaElement
    || target instanceof HTMLSelectElement
    || (target instanceof HTMLElement && target.isContentEditable);
}

export class CinematicNavigationSystem {
  private readonly camera: THREE.PerspectiveCamera;
  private readonly orbitControls: OrbitControls;
  private readonly pointerLockControls: PointerLockControls;
  private readonly domElement: HTMLElement;
  private readonly callbacks: NavigationCallbacks;
  private modelRoot: THREE.Object3D | null = null;
  private mode: DesktopNavigationMode = 'orbit';
  private transition: CameraTransition | null = null;
  private tour: CinematicTour | null = null;
  private keys = new Set<string>();
  private floorHeight = 1.82;
  private disposed = false;

  private readonly worldPosition = new THREE.Vector3();
  private readonly worldTarget = new THREE.Vector3();
  private readonly movement = new THREE.Vector3();
  private readonly forward = new THREE.Vector3();
  private readonly right = new THREE.Vector3();
  private readonly up = new THREE.Vector3(0, 1, 0);

  private readonly handleKeyDown = (event: KeyboardEvent) => {
    if (isEditableTarget(event.target)) return;
    const movementKey = [
      'KeyW',
      'KeyA',
      'KeyS',
      'KeyD',
      'KeyQ',
      'KeyE',
      'Space',
      'ShiftLeft',
      'ShiftRight',
      'ControlLeft',
      'ControlRight',
    ].includes(event.code);
    if (!movementKey) return;
    if (this.mode !== 'orbit') event.preventDefault();
    this.keys.add(event.code);
  };

  private readonly handleKeyUp = (event: KeyboardEvent) => {
    this.keys.delete(event.code);
  };

  private readonly handleCanvasClick = () => {
    if (this.mode === 'first-person' && !this.pointerLockControls.isLocked) {
      this.pointerLockControls.lock();
    }
  };

  constructor(
    camera: THREE.PerspectiveCamera,
    orbitControls: OrbitControls,
    domElement: HTMLElement,
    callbacks: NavigationCallbacks,
  ) {
    this.camera = camera;
    this.orbitControls = orbitControls;
    this.domElement = domElement;
    this.callbacks = callbacks;
    this.pointerLockControls = new PointerLockControls(camera, domElement);

    window.addEventListener('keydown', this.handleKeyDown, { passive: false });
    window.addEventListener('keyup', this.handleKeyUp);
    domElement.addEventListener('click', this.handleCanvasClick);
  }

  setModelRoot(root: THREE.Object3D): void {
    this.modelRoot = root;
    root.updateMatrixWorld(true);
    this.floorHeight = new THREE.Vector3(0, 1.82, 0)
      .applyMatrix4(root.matrixWorld)
      .y;
  }

  getMode(): DesktopNavigationMode {
    return this.mode;
  }

  isCinematicActive(): boolean {
    return Boolean(this.tour?.active || this.transition?.active);
  }

  setMode(mode: DesktopNavigationMode): void {
    if (this.mode === mode) return;
    this.cancelCinematic();
    this.mode = mode;
    this.keys.clear();

    if (mode === 'first-person') {
      this.orbitControls.enabled = false;
      this.moveToWalkStartIfNeeded();
    } else {
      if (this.pointerLockControls.isLocked) this.pointerLockControls.unlock();
      this.orbitControls.enabled = true;
      this.orbitControls.enablePan = mode === 'orbit';
      this.orbitControls.enableZoom = true;
      this.orbitControls.minDistance = mode === 'orbit' ? 8 : 2.2;
      this.orbitControls.maxDistance = mode === 'orbit' ? 360 : 90;
      this.orbitControls.maxPolarAngle = mode === 'orbit'
        ? Math.PI * 0.49
        : Math.PI * 0.72;
      if (mode === 'walk') this.moveToWalkStartIfNeeded();
    }
  }

  transitionToPreset(preset: LocalCameraPreset, durationMs = 1200): void {
    const position = this.localToWorld(preset.position, this.worldPosition);
    const target = this.localToWorld(preset.target, this.worldTarget);
    this.transitionToWorld(position, target, durationMs, preset.fov ?? this.camera.fov);
  }

  transitionToZone(zone: ZoneId, durationMs = 1300): void {
    this.transitionToPreset(ENTERPRISE_CAMERA_PRESETS[zone], durationMs);
  }

  transitionToWalkthrough(chamber: WalkthroughChamber): void {
    this.transitionToPreset(WALKTHROUGH_CAMERA_PRESETS[chamber], 1100);
  }

  focusOnWorldPosition(
    worldPosition: THREE.Vector3,
    worldTarget: THREE.Vector3,
    durationMs = 1200,
    fov = 42,
  ): void {
    this.transitionToWorld(worldPosition, worldTarget, durationMs, fov);
  }

  startIntro(): void {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      this.transitionToZone('overview', 900);
      return;
    }

    const waypoints: TourWaypoint[] = [
      {
        time: 0,
        position: new THREE.Vector3(168, 102, 212),
        target: new THREE.Vector3(3, 18, -28),
        fov: 42,
        zone: 'overview',
        renderMode: 'pbr',
        focus: 'riverside',
      },
      {
        time: 4.2,
        position: new THREE.Vector3(120, 70, 150),
        target: new THREE.Vector3(-1, 16, -14),
        fov: 40,
        zone: 'overview',
        renderMode: 'pbr',
        focus: null,
      },
      {
        time: 8.6,
        position: new THREE.Vector3(76, 52, 96),
        target: new THREE.Vector3(-8, 15, 0),
        fov: 40,
        zone: 'core',
        renderMode: 'pbr',
        focus: 'fusion',
      },
      {
        time: 13.5,
        position: ENTERPRISE_CAMERA_PRESETS.overview.position.clone(),
        target: ENTERPRISE_CAMERA_PRESETS.overview.target.clone(),
        fov: ENTERPRISE_CAMERA_PRESETS.overview.fov ?? 38,
        zone: 'overview',
        renderMode: 'pbr',
        focus: null,
      },
    ];
    this.startTour('intro', waypoints);
  }

  startPresentation(): void {
    const waypoints: TourWaypoint[] = [
      // 1 — Facility Overview (0-10s)
      {
        time: 0,
        position: new THREE.Vector3(164, 92, 204),
        target: new THREE.Vector3(-1, 18, -19),
        fov: 39,
        zone: 'overview',
        renderMode: 'pbr',
        focus: 'riverside',
        hotspotId: null,
      },
      // 2 — Plant Status Overview (10s)
      {
        time: 10,
        position: new THREE.Vector3(120, 68, 148),
        target: new THREE.Vector3(-5, 16, -8),
        fov: 38,
        zone: 'overview',
        renderMode: 'pbr',
        focus: null,
        hotspotId: 'containment-building',
      },
      // 3 — Reactor Core Approach (20s)
      {
        time: 20,
        position: new THREE.Vector3(43, 34, 52),
        target: new THREE.Vector3(-10, 13, 0),
        fov: 40,
        zone: 'core',
        renderMode: 'xray',
        focus: 'fusion',
        hotspotId: 'reactor-vessel',
      },
      // 4 — Fusion Core Close-up (30s)
      {
        time: 30,
        position: new THREE.Vector3(0, 14, 12),
        target: new THREE.Vector3(-10, 10.5, 0),
        fov: 49,
        zone: 'core',
        renderMode: 'pbr',
        focus: 'fusion',
        hotspotId: 'reactor-vessel',
      },
      // 5 — Steam Turbine Hall (40s)
      {
        time: 40,
        position: new THREE.Vector3(73, 29, 67),
        target: new THREE.Vector3(25, 8, 29),
        fov: 43,
        zone: 'turbine',
        renderMode: 'pbr',
        focus: 'machinery',
        hotspotId: 'turbine-hall',
      },
      // 6 — Low Pressure Turbine (50s)
      {
        time: 50,
        position: new THREE.Vector3(62, 17, 28),
        target: new THREE.Vector3(22, 5, 4),
        fov: 47,
        zone: 'turbine',
        renderMode: 'pbr',
        focus: 'machinery',
        hotspotId: 'condenser',
      },
      // 7 — Electrical Switchyard (58s)
      {
        time: 58,
        position: new THREE.Vector3(-83, 38, 84),
        target: new THREE.Vector3(-38, 4, 45),
        fov: 43,
        zone: 'gantry',
        renderMode: 'pbr',
        focus: 'vehicle',
        hotspotId: 'main-transformers',
      },
      // 8 — Cooling Towers (66s)
      {
        time: 66,
        position: new THREE.Vector3(-112, 70, -46),
        target: new THREE.Vector3(2, 12, -124),
        fov: 42,
        zone: 'coolant',
        renderMode: 'pbr',
        focus: 'riverside',
        hotspotId: 'north-cooling-tower',
      },
      // 9 — Reactor Core Return (74s) — EMERGENCY BEGINS
      {
        time: 74,
        position: new THREE.Vector3(94, 54, 72),
        target: new THREE.Vector3(-10, 13, 0),
        fov: 41,
        zone: 'core',
        renderMode: 'xray',
        focus: 'fusion',
        hotspotId: 'reactor-vessel',
      },
      // 10 — Crisis Peak (84s)
      {
        time: 84,
        position: new THREE.Vector3(4, 12, 20),
        target: new THREE.Vector3(-10, 10.5, 0),
        fov: 48,
        zone: 'core',
        renderMode: 'thermal',
        focus: 'fusion',
        hotspotId: 'reactor-vessel',
      },
      // 11 — Recovery Complete (96s)
      {
        time: 96,
        position: new THREE.Vector3(37, 31, 48),
        target: new THREE.Vector3(-10, 14, 0),
        fov: 40,
        zone: 'core',
        renderMode: 'pbr',
        focus: 'fusion',
        hotspotId: null,
      },
      // 12 — Final Overview (106s)
      {
        time: 106,
        position: ENTERPRISE_CAMERA_PRESETS.overview.position.clone(),
        target: ENTERPRISE_CAMERA_PRESETS.overview.target.clone(),
        fov: ENTERPRISE_CAMERA_PRESETS.overview.fov ?? 38,
        zone: 'overview',
        renderMode: 'pbr',
        focus: null,
        hotspotId: null,
      },
    ];
    this.startTour('presentation', waypoints);
  }

  notifyUserInteraction(): void {
    if (this.tour?.active || this.transition?.active) this.cancelCinematic();
  }

  update(timestamp: number, deltaTime: number): void {
    if (this.disposed) return;

    if (this.tour?.active) {
      this.updateTour(timestamp);
      return;
    }
    if (this.transition?.active) {
      this.updateTransition(timestamp);
      return;
    }

    this.updateMovement(deltaTime);
  }

  cancelCinematic(): void {
    const wasActive = Boolean(this.tour?.active || this.transition?.active);
    this.tour = null;
    this.transition = null;
    this.callbacks.onPresentationFocus(null);
    if (wasActive) this.callbacks.onCinematicStateChange?.(false, null);
  }

  dispose(): void {
    this.disposed = true;
    this.cancelCinematic();
    if (this.pointerLockControls.isLocked) this.pointerLockControls.unlock();
    this.pointerLockControls.disconnect();
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    this.domElement.removeEventListener('click', this.handleCanvasClick);
  }

  private localToWorld(local: THREE.Vector3, target: THREE.Vector3): THREE.Vector3 {
    target.copy(local);
    if (this.modelRoot) {
      this.modelRoot.updateMatrixWorld(true);
      target.applyMatrix4(this.modelRoot.matrixWorld);
    }
    return target;
  }

  private transitionToWorld(
    position: THREE.Vector3,
    target: THREE.Vector3,
    durationMs: number,
    fov: number,
    onComplete?: () => void,
  ): void {
    this.tour = null;
    const distance = this.camera.position.distanceTo(position);
    const lift = THREE.MathUtils.clamp(distance * 0.07, 0.6, 16);
    this.transition = {
      active: true,
      startedAt: performance.now(),
      durationMs,
      positionCurve: createTransitionCurve(this.camera.position, position, lift),
      targetCurve: createTransitionCurve(this.orbitControls.target, target, lift * 0.2),
      fromFov: this.camera.fov,
      toFov: fov,
      onComplete,
    };
    this.callbacks.onCinematicStateChange?.(true, 'intro');
  }

  private startTour(kind: 'intro' | 'presentation', localWaypoints: TourWaypoint[]): void {
    this.cancelCinematic();
    this.mode = 'orbit';
    this.orbitControls.enabled = true;
    this.orbitControls.enablePan = false;

    const waypoints = localWaypoints.map((waypoint) => ({
      ...waypoint,
      position: this.localToWorld(waypoint.position, new THREE.Vector3()),
      target: this.localToWorld(waypoint.target, new THREE.Vector3()),
    }));
    const durationSeconds = waypoints.at(-1)?.time ?? 1;

    this.tour = {
      active: true,
      startedAt: performance.now(),
      durationMs: durationSeconds * 1000,
      positionCurve: new THREE.CatmullRomCurve3(
        waypoints.map((waypoint) => waypoint.position),
        false,
        'centripetal',
        0.42,
      ),
      targetCurve: new THREE.CatmullRomCurve3(
        waypoints.map((waypoint) => waypoint.target),
        false,
        'centripetal',
        0.42,
      ),
      waypoints,
      lastMarkerIndex: -1,
      kind,
    };
    this.callbacks.onCinematicStateChange?.(true, kind);
  }

  private updateTour(timestamp: number): void {
    const tour = this.tour;
    if (!tour) return;
    const progress = THREE.MathUtils.clamp(
      (timestamp - tour.startedAt) / tour.durationMs,
      0,
      1,
    );
    const easedProgress = easeOutExpo(progress);
    tour.positionCurve.getPointAt(easedProgress, this.camera.position);
    tour.targetCurve.getPointAt(easedProgress, this.orbitControls.target);

    const elapsedSeconds = progress * (tour.durationMs / 1000);
    let markerIndex = 0;
    for (let index = 0; index < tour.waypoints.length; index += 1) {
      if (tour.waypoints[index].time <= elapsedSeconds) markerIndex = index;
    }
    if (markerIndex !== tour.lastMarkerIndex) {
      tour.lastMarkerIndex = markerIndex;
      const marker = tour.waypoints[markerIndex];
      this.callbacks.onChangeZone(marker.zone);
      this.callbacks.onChangeRenderMode(marker.renderMode);
      this.callbacks.onPresentationFocus(marker.focus);
      if (marker.hotspotId !== undefined) {
        this.callbacks.onPresentationHotspot?.(marker.hotspotId);
      }
    }

    const current = tour.waypoints[markerIndex];
    const next = tour.waypoints[Math.min(markerIndex + 1, tour.waypoints.length - 1)];
    const segmentDuration = Math.max(next.time - current.time, 0.001);
    const segmentProgress = THREE.MathUtils.clamp(
      (elapsedSeconds - current.time) / segmentDuration,
      0,
      1,
    );
    const nextFov = THREE.MathUtils.lerp(
      current.fov,
      next.fov,
      easeInOutCubic(segmentProgress),
    );
    if (Math.abs(this.camera.fov - nextFov) > 0.01) {
      this.camera.fov = nextFov;
      this.camera.updateProjectionMatrix();
    }

    this.camera.lookAt(this.orbitControls.target);
    this.orbitControls.update();

    if (progress >= 1) {
      const finalWaypoint = tour.waypoints.at(-1);
      this.tour = null;
      this.callbacks.onPresentationFocus(null);
      this.callbacks.onCinematicStateChange?.(false, null);
      if (finalWaypoint) {
        this.camera.position.copy(finalWaypoint.position);
        this.orbitControls.target.copy(finalWaypoint.target);
        this.camera.fov = finalWaypoint.fov;
        this.camera.updateProjectionMatrix();
      }
      this.orbitControls.enablePan = true;
      this.orbitControls.update();
    }
  }

  private updateTransition(timestamp: number): void {
    const transition = this.transition;
    if (!transition) return;
    const progress = THREE.MathUtils.clamp(
      (timestamp - transition.startedAt) / transition.durationMs,
      0,
      1,
    );
    const easedProgress = easeOutExpo(progress);
    transition.positionCurve.getPointAt(easedProgress, this.camera.position);
    transition.targetCurve.getPointAt(easedProgress, this.orbitControls.target);
    this.camera.fov = THREE.MathUtils.lerp(
      transition.fromFov,
      transition.toFov,
      easedProgress,
    );
    this.camera.updateProjectionMatrix();
    this.camera.lookAt(this.orbitControls.target);
    this.orbitControls.update();

    if (progress >= 1) {
      const onComplete = transition.onComplete;
      this.transition = null;
      this.callbacks.onCinematicStateChange?.(false, null);
      onComplete?.();
    }
  }

  private moveToWalkStartIfNeeded(): void {
    if (this.camera.position.y <= this.floorHeight + 12) return;
    this.transitionToPreset(WALK_START_PRESET, 1600);
  }

  private updateMovement(deltaTime: number): void {
    if (this.mode === 'orbit' || this.keys.size === 0) return;
    const sprint = this.keys.has('ShiftLeft') || this.keys.has('ShiftRight');
    const baseSpeed = this.mode === 'fly' ? 23 : 12;
    const speed = baseSpeed * (sprint ? 1.8 : 1) * deltaTime;

    this.camera.getWorldDirection(this.forward);
    if (this.mode !== 'fly') {
      this.forward.y = 0;
      if (this.forward.lengthSq() <= Number.EPSILON) this.forward.set(0, 0, -1);
      this.forward.normalize();
    }
    this.right.crossVectors(this.forward, this.up).normalize();
    this.movement.set(0, 0, 0);

    if (this.keys.has('KeyW')) this.movement.add(this.forward);
    if (this.keys.has('KeyS')) this.movement.sub(this.forward);
    if (this.keys.has('KeyD')) this.movement.add(this.right);
    if (this.keys.has('KeyA')) this.movement.sub(this.right);
    if (this.mode === 'fly') {
      if (this.keys.has('Space') || this.keys.has('KeyE')) this.movement.y += 1;
      if (
        this.keys.has('ControlLeft')
        || this.keys.has('ControlRight')
        || this.keys.has('KeyQ')
      ) {
        this.movement.y -= 1;
      }
    }
    if (this.movement.lengthSq() <= Number.EPSILON) return;
    this.movement.normalize().multiplyScalar(speed);

    if (this.mode === 'first-person') {
      this.camera.position.add(this.movement);
      this.camera.position.y = this.floorHeight;
      this.clampCameraPosition();
      return;
    }

    this.camera.position.add(this.movement);
    this.orbitControls.target.add(this.movement);
    if (this.mode === 'walk') {
      const yOffset = this.floorHeight - this.camera.position.y;
      this.camera.position.y += yOffset;
      this.orbitControls.target.y += yOffset;
    }
    this.clampCameraPosition();
  }

  private clampCameraPosition(): void {
    this.camera.position.x = THREE.MathUtils.clamp(this.camera.position.x, -195, 195);
    this.camera.position.z = THREE.MathUtils.clamp(this.camera.position.z, -210, 135);
    this.camera.position.y = THREE.MathUtils.clamp(
      this.camera.position.y,
      this.floorHeight,
      170,
    );
  }
}
