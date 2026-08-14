import * as THREE from 'three';

export interface XRController {
  index: number;
  targetRay: THREE.Group;
  grip: THREE.Group;
  hand: THREE.Group;
  inputSource: XRInputSource | null;
  isPinching: boolean;
  target: THREE.Vector3;
  direction: THREE.Vector3;
  teleportTarget: THREE.Vector3 | null;
}

export interface XRSupportState {
  vr: boolean;
  ar: boolean;
}

export interface XRSessionState {
  isPresenting: boolean;
  isAR: boolean;
  mode: XRSessionMode | null;
  referenceSpace: XRReferenceSpace | null;
  inputSources: XRInputSource[];
  controllers: Map<number, XRController>;
}

type SessionModePreference = 'immersive-vr' | 'immersive-ar';

interface ControllerConnectedEvent extends THREE.Event {
  data: XRInputSource;
}

interface XRInteractiveEventTarget {
  addEventListener(type: string, listener: (event: THREE.Event) => void): void;
}

interface HandTrackingEvent {
  index: number;
  active: boolean;
  hand: THREE.Group;
  inputSource: XRInputSource | null;
}

export class WebXRManager {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene: THREE.Scene;
  private readonly camera: THREE.PerspectiveCamera;
  private readonly playerRig = new THREE.Group();
  private readonly raycaster = new THREE.Raycaster();
  private readonly controllers = new Map<number, XRController>();
  private readonly teleportSurfaces: THREE.Object3D[] = [];
  private readonly reticles = new Map<number, THREE.Mesh>();
  private readonly desktopPosition = new THREE.Vector3();
  private readonly desktopQuaternion = new THREE.Quaternion();
  private readonly headForward = new THREE.Vector3();
  private readonly moveDirection = new THREE.Vector3();
  private readonly rightDirection = new THREE.Vector3();
  private readonly worldUp = new THREE.Vector3(0, 1, 0);

  private sessionState: XRSessionState = {
    isPresenting: false,
    isAR: false,
    mode: null,
    referenceSpace: null,
    inputSources: [],
    controllers: this.controllers,
  };

  private onSessionStartCallbacks: Array<(mode: XRSessionMode) => void> = [];
  private onSessionEndCallbacks: Array<() => void> = [];
  private onInputSourceChangeCallbacks: Array<(sources: XRInputSource[]) => void> = [];
  private onSelectStartCallbacks: Array<(controller: XRController) => void> = [];
  private onSelectEndCallbacks: Array<(controller: XRController) => void> = [];
  private onSqueezeStartCallbacks: Array<(controller: XRController) => void> = [];
  private onSqueezeEndCallbacks: Array<(controller: XRController) => void> = [];
  private onHandTrackingCallbacks: Array<(event: HandTrackingEvent) => void> = [];

  private referenceSpaceType: XRReferenceSpaceType = 'local-floor';
  private snapTurnReady = true;
  private smoothLocomotionEnabled = true;
  private teleportEnabled = true;
  private snapTurnEnabled = true;
  private moveSpeed = 3.2;
  private snapAngle = THREE.MathUtils.degToRad(30);
  private disposed = false;

  constructor(
    renderer: THREE.WebGLRenderer,
    scene: THREE.Scene,
    camera: THREE.PerspectiveCamera,
  ) {
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;

    this.playerRig.name = 'Enterprise XR Player Rig';
    this.scene.add(this.playerRig);
    this.playerRig.add(camera);

    this.renderer.xr.enabled = true;
    this.renderer.xr.cameraAutoUpdate = true;
    this.createControllerSlots();
  }

  async getSupport(): Promise<XRSupportState> {
    if (!navigator.xr) return { vr: false, ar: false };
    const [vr, ar] = await Promise.all([
      navigator.xr.isSessionSupported('immersive-vr').catch(() => false),
      navigator.xr.isSessionSupported('immersive-ar').catch(() => false),
    ]);
    return { vr, ar };
  }

  async isARSupported(): Promise<boolean> {
    return (await this.getSupport()).ar;
  }

  async isVRSupported(): Promise<boolean> {
    return (await this.getSupport()).vr;
  }

  async startSession(
    preferredMode: SessionModePreference = 'immersive-vr',
  ): Promise<XRSession | null> {
    if (!navigator.xr || this.renderer.xr.isPresenting) return null;

    const support = await this.getSupport();
    const fallbackMode: SessionModePreference = preferredMode === 'immersive-vr'
      ? 'immersive-ar'
      : 'immersive-vr';
    const requestedMode = support[preferredMode === 'immersive-vr' ? 'vr' : 'ar']
      ? preferredMode
      : support[fallbackMode === 'immersive-vr' ? 'vr' : 'ar']
        ? fallbackMode
        : null;
    if (!requestedMode) return null;

    const sessionInit = this.createSessionInit(requestedMode);
    try {
      return await this.requestAndAttachSession(requestedMode, sessionInit);
    } catch (error) {
      console.warn('[WebXRManager] Retrying XR session with minimal features.', error);
      try {
        return await this.requestAndAttachSession(requestedMode, {
          optionalFeatures: ['local-floor'],
        });
      } catch (retryError) {
        console.error('[WebXRManager] Unable to start XR session.', retryError);
        return null;
      }
    }
  }

  async startARSession(): Promise<XRSession | null> {
    return this.startSession('immersive-ar');
  }

  async startVRSession(): Promise<XRSession | null> {
    return this.startSession('immersive-vr');
  }

  async endSession(): Promise<void> {
    await this.renderer.xr.getSession()?.end();
  }

  setTeleportSurfaces(surfaces: THREE.Object3D[]): void {
    this.teleportSurfaces.length = 0;
    this.teleportSurfaces.push(...surfaces);
  }

  setLocomotionOptions(options: {
    smooth?: boolean;
    teleport?: boolean;
    snapTurn?: boolean;
    moveSpeed?: number;
    snapAngleDegrees?: number;
  }): void {
    if (options.smooth !== undefined) this.smoothLocomotionEnabled = options.smooth;
    if (options.teleport !== undefined) this.teleportEnabled = options.teleport;
    if (options.snapTurn !== undefined) this.snapTurnEnabled = options.snapTurn;
    if (options.moveSpeed !== undefined) this.moveSpeed = Math.max(0.5, options.moveSpeed);
    if (options.snapAngleDegrees !== undefined) {
      this.snapAngle = THREE.MathUtils.degToRad(
        THREE.MathUtils.clamp(options.snapAngleDegrees, 15, 60),
      );
    }
  }

  update(frame: XRFrame | null, deltaTime: number): void {
    if (!frame || !this.renderer.xr.isPresenting || this.disposed) return;
    this.sessionState.referenceSpace = this.renderer.xr.getReferenceSpace();
    this.updateControllerRays();
    this.updateLocomotion(deltaTime);
  }

  getSessionState(): XRSessionState {
    return this.sessionState;
  }

  getControllers(): Map<number, XRController> {
    return this.controllers;
  }

  getPlayerRig(): THREE.Group {
    return this.playerRig;
  }

  onSessionStart(callback: (mode: XRSessionMode) => void): () => void {
    this.onSessionStartCallbacks.push(callback);
    return () => {
      this.onSessionStartCallbacks = this.onSessionStartCallbacks.filter(
        (entry) => entry !== callback,
      );
    };
  }

  onSessionEnd(callback: () => void): () => void {
    this.onSessionEndCallbacks.push(callback);
    return () => {
      this.onSessionEndCallbacks = this.onSessionEndCallbacks.filter(
        (entry) => entry !== callback,
      );
    };
  }

  onInputSourceChange(callback: (sources: XRInputSource[]) => void): () => void {
    this.onInputSourceChangeCallbacks.push(callback);
    return () => {
      this.onInputSourceChangeCallbacks = this.onInputSourceChangeCallbacks.filter(
        (entry) => entry !== callback,
      );
    };
  }

  onSelectStart(callback: (controller: XRController) => void): () => void {
    this.onSelectStartCallbacks.push(callback);
    return () => {
      this.onSelectStartCallbacks = this.onSelectStartCallbacks.filter(
        (entry) => entry !== callback,
      );
    };
  }

  onSelectEnd(callback: (controller: XRController) => void): () => void {
    this.onSelectEndCallbacks.push(callback);
    return () => {
      this.onSelectEndCallbacks = this.onSelectEndCallbacks.filter(
        (entry) => entry !== callback,
      );
    };
  }

  onSqueezeStart(callback: (controller: XRController) => void): () => void {
    this.onSqueezeStartCallbacks.push(callback);
    return () => {
      this.onSqueezeStartCallbacks = this.onSqueezeStartCallbacks.filter(
        (entry) => entry !== callback,
      );
    };
  }

  onSqueezeEnd(callback: (controller: XRController) => void): () => void {
    this.onSqueezeEndCallbacks.push(callback);
    return () => {
      this.onSqueezeEndCallbacks = this.onSqueezeEndCallbacks.filter(
        (entry) => entry !== callback,
      );
    };
  }

  onHandTrackingChange(callback: (event: HandTrackingEvent) => void): () => void {
    this.onHandTrackingCallbacks.push(callback);
    return () => {
      this.onHandTrackingCallbacks = this.onHandTrackingCallbacks.filter(
        (entry) => entry !== callback,
      );
    };
  }

  setReferenceSpaceType(type: XRReferenceSpaceType): void {
    this.referenceSpaceType = type;
    this.renderer.xr.setReferenceSpaceType(type);
  }

  dispose(): void {
    this.disposed = true;
    this.controllers.forEach((controller) => {
      controller.targetRay.clear();
      controller.grip.clear();
      controller.hand.clear();
    });
    this.reticles.forEach((reticle) => {
      this.scene.remove(reticle);
      reticle.geometry.dispose();
      const materials = Array.isArray(reticle.material)
        ? reticle.material
        : [reticle.material];
      materials.forEach((material) => material.dispose());
    });
    this.reticles.clear();
    this.controllers.clear();

    this.playerRig.remove(this.camera);
    this.scene.add(this.camera);
    this.scene.remove(this.playerRig);
    this.onSessionStartCallbacks = [];
    this.onSessionEndCallbacks = [];
    this.onInputSourceChangeCallbacks = [];
    this.onSelectStartCallbacks = [];
    this.onSelectEndCallbacks = [];
    this.onSqueezeStartCallbacks = [];
    this.onSqueezeEndCallbacks = [];
    this.onHandTrackingCallbacks = [];
  }

  private createSessionInit(mode: SessionModePreference): XRSessionInit {
    if (mode === 'immersive-vr') {
      return {
        requiredFeatures: ['local-floor'],
        optionalFeatures: ['bounded-floor', 'hand-tracking', 'layers'],
      };
    }
    return {
      optionalFeatures: [
        'local-floor',
        'hit-test',
        'hand-tracking',
        'dom-overlay',
        'depth-sensing',
      ],
      domOverlay: { root: document.body },
    };
  }

  private async requestAndAttachSession(
    mode: SessionModePreference,
    init: XRSessionInit,
  ): Promise<XRSession> {
    if (!navigator.xr) throw new Error('WebXR is unavailable.');

    this.desktopPosition.copy(this.camera.position);
    this.desktopQuaternion.copy(this.camera.quaternion);
    this.renderer.xr.setReferenceSpaceType(this.referenceSpaceType);
    this.renderer.xr.setFramebufferScaleFactor(mode === 'immersive-vr' ? 0.82 : 0.9);

    const session = await navigator.xr.requestSession(mode, init);
    this.setupSessionEventListeners(session, mode);
    await this.renderer.xr.setSession(session);

    // Meta Quest 3: fixed foveation lowers peripheral resolution inside the
    // compositor for a significant GPU win with barely visible quality loss.
    // No-op on browsers/compositors that do not support it.
    try {
      this.renderer.xr.setFoveation(mode === 'immersive-vr' ? 0.4 : 0.3);
    } catch {
      // Foveation is optional.
    }

    this.sessionState.isPresenting = true;
    this.sessionState.isAR = mode === 'immersive-ar';
    this.sessionState.mode = mode;
    this.sessionState.inputSources = Array.from(session.inputSources);
    this.playerRig.position.set(-5, 0, 50);
    this.playerRig.rotation.set(0, 0, 0);
    this.onSessionStartCallbacks.forEach((callback) => callback(mode));
    return session;
  }

  private setupSessionEventListeners(
    session: XRSession,
    mode: SessionModePreference,
  ): void {
    session.addEventListener('end', () => {
      this.sessionState.isPresenting = false;
      this.sessionState.isAR = false;
      this.sessionState.mode = null;
      this.sessionState.referenceSpace = null;
      this.sessionState.inputSources = [];
      this.playerRig.position.set(0, 0, 0);
      this.playerRig.rotation.set(0, 0, 0);
      this.camera.position.copy(this.desktopPosition);
      this.camera.quaternion.copy(this.desktopQuaternion);
      this.reticles.forEach((reticle) => {
        reticle.visible = false;
      });
      this.onSessionEndCallbacks.forEach((callback) => callback());
    });

    session.addEventListener('inputsourceschange', () => {
      this.sessionState.inputSources = Array.from(session.inputSources);
      this.onInputSourceChangeCallbacks.forEach((callback) => {
        callback(this.sessionState.inputSources);
      });
    });

    if (mode === 'immersive-ar') {
      session.requestReferenceSpace('local-floor')
        .then((space) => {
          this.sessionState.referenceSpace = space;
        })
        .catch(() => {
          this.sessionState.referenceSpace = this.renderer.xr.getReferenceSpace();
        });
    }
  }

  private createControllerSlots(): void {
    for (let index = 0; index < 2; index += 1) {
      const targetRay = this.renderer.xr.getController(index);
      const grip = this.renderer.xr.getControllerGrip(index);
      const hand = this.renderer.xr.getHand(index);
      targetRay.name = `XR Target Ray ${index + 1}`;
      grip.name = `XR Controller Grip ${index + 1}`;
      hand.name = `XR Tracked Hand ${index + 1}`;

      const controller: XRController = {
        index,
        targetRay,
        grip,
        hand,
        inputSource: null,
        isPinching: false,
        target: new THREE.Vector3(),
        direction: new THREE.Vector3(0, 0, -1),
        teleportTarget: null,
      };
      this.controllers.set(index, controller);

      this.addTargetRayVisual(targetRay);
      this.addGripVisual(grip);
      this.addHandTrackingHook(hand, controller);
      this.addControllerEvents(targetRay, controller);

      this.playerRig.add(targetRay, grip, hand);
      const reticle = this.createTeleportReticle(index);
      this.reticles.set(index, reticle);
      this.scene.add(reticle);
    }
  }

  private addTargetRayVisual(targetRay: THREE.Group): void {
    const geometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, -14),
    ]);
    const material = new THREE.LineBasicMaterial({
      color: 0x74dcff,
      transparent: true,
      opacity: 0.66,
      depthWrite: false,
      toneMapped: false,
    });
    const line = new THREE.Line(geometry, material);
    line.name = 'Enterprise XR Interaction Ray';
    targetRay.add(line);
  }

  private addGripVisual(grip: THREE.Group): void {
    const body = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.025, 0.09, 4, 10),
      new THREE.MeshStandardMaterial({
        color: 0x1c2a31,
        metalness: 0.74,
        roughness: 0.32,
      }),
    );
    body.name = 'Enterprise XR Controller Body';
    body.rotation.x = Math.PI * 0.18;
    grip.add(body);
  }

  private addHandTrackingHook(hand: THREE.Group, controller: XRController): void {
    const interactiveHand = hand as unknown as XRInteractiveEventTarget;
    interactiveHand.addEventListener('connected', (event) => {
      const connected = event as ControllerConnectedEvent;
      controller.inputSource = connected.data;
      this.onHandTrackingCallbacks.forEach((callback) => {
        callback({
          index: controller.index,
          active: Boolean(connected.data.hand),
          hand,
          inputSource: connected.data,
        });
      });
    });
    interactiveHand.addEventListener('disconnected', () => {
      this.onHandTrackingCallbacks.forEach((callback) => {
        callback({
          index: controller.index,
          active: false,
          hand,
          inputSource: controller.inputSource,
        });
      });
    });
  }

  private addControllerEvents(
    targetRay: THREE.Group,
    controller: XRController,
  ): void {
    const interactiveTargetRay = targetRay as unknown as XRInteractiveEventTarget;
    interactiveTargetRay.addEventListener('connected', (event) => {
      controller.inputSource = (event as ControllerConnectedEvent).data;
    });
    interactiveTargetRay.addEventListener('disconnected', () => {
      controller.inputSource = null;
      controller.teleportTarget = null;
    });
    interactiveTargetRay.addEventListener('selectstart', () => {
      controller.isPinching = true;
      this.onSelectStartCallbacks.forEach((callback) => callback(controller));
    });
    interactiveTargetRay.addEventListener('selectend', () => {
      controller.isPinching = false;
      if (this.teleportEnabled && controller.teleportTarget) {
        this.teleportTo(controller.teleportTarget);
      }
      this.onSelectEndCallbacks.forEach((callback) => callback(controller));
    });
    interactiveTargetRay.addEventListener('squeezestart', () => {
      this.onSqueezeStartCallbacks.forEach((callback) => callback(controller));
    });
    interactiveTargetRay.addEventListener('squeezeend', () => {
      this.onSqueezeEndCallbacks.forEach((callback) => callback(controller));
    });
  }

  private createTeleportReticle(index: number): THREE.Mesh {
    const reticle = new THREE.Mesh(
      new THREE.RingGeometry(0.18, 0.24, 32),
      new THREE.MeshBasicMaterial({
        color: index === 0 ? 0x5ce8ff : 0xa8e8ff,
        transparent: true,
        opacity: 0.78,
        side: THREE.DoubleSide,
        depthWrite: false,
        toneMapped: false,
      }),
    );
    reticle.name = `XR Teleport Reticle ${index + 1}`;
    reticle.rotation.x = -Math.PI / 2;
    reticle.visible = false;
    reticle.renderOrder = 20;
    return reticle;
  }

  private updateControllerRays(): void {
    this.controllers.forEach((controller, index) => {
      controller.targetRay.getWorldPosition(controller.target);
      controller.targetRay.getWorldDirection(controller.direction);
      controller.direction.negate().normalize();

      const reticle = this.reticles.get(index);
      if (!reticle || !this.teleportEnabled || this.teleportSurfaces.length === 0) {
        if (reticle) reticle.visible = false;
        controller.teleportTarget = null;
        return;
      }

      this.raycaster.set(controller.target, controller.direction);
      this.raycaster.far = 36;
      const hit = this.raycaster.intersectObjects(this.teleportSurfaces, true)[0];
      if (!hit || hit.face?.normal.y !== undefined && hit.face.normal.y < 0.35) {
        reticle.visible = false;
        controller.teleportTarget = null;
        return;
      }

      controller.teleportTarget ??= new THREE.Vector3();
      controller.teleportTarget.copy(hit.point);
      reticle.position.copy(hit.point).addScaledVector(hit.face?.normal ?? this.worldUp, 0.025);
      reticle.visible = true;
    });
  }

  private updateLocomotion(deltaTime: number): void {
    const session = this.renderer.xr.getSession();
    if (!session) return;

    for (const inputSource of session.inputSources) {
      const gamepad = inputSource.gamepad;
      if (!gamepad || gamepad.axes.length < 2) continue;
      const horizontal = gamepad.axes.at(-2) ?? 0;
      const vertical = gamepad.axes.at(-1) ?? 0;

      if (inputSource.handedness === 'left' && this.smoothLocomotionEnabled) {
        const deadZone = 0.16;
        if (Math.abs(horizontal) < deadZone && Math.abs(vertical) < deadZone) continue;

        const xrCamera = this.renderer.xr.getCamera();
        xrCamera.getWorldDirection(this.headForward);
        this.headForward.y = 0;
        this.headForward.normalize();
        this.rightDirection.crossVectors(this.headForward, this.worldUp).normalize();
        this.moveDirection
          .copy(this.headForward)
          .multiplyScalar(-vertical)
          .addScaledVector(this.rightDirection, horizontal);
        if (this.moveDirection.lengthSq() > 1) this.moveDirection.normalize();
        this.playerRig.position.addScaledVector(
          this.moveDirection,
          this.moveSpeed * deltaTime,
        );
      }

      if (inputSource.handedness === 'right' && this.snapTurnEnabled) {
        if (Math.abs(horizontal) < 0.35) {
          this.snapTurnReady = true;
        } else if (this.snapTurnReady) {
          this.playerRig.rotateY(horizontal > 0 ? -this.snapAngle : this.snapAngle);
          this.snapTurnReady = false;
        }
      }
    }

    this.playerRig.position.x = THREE.MathUtils.clamp(this.playerRig.position.x, -185, 185);
    this.playerRig.position.z = THREE.MathUtils.clamp(this.playerRig.position.z, -200, 125);
  }

  private teleportTo(target: THREE.Vector3): void {
    const xrCamera = this.renderer.xr.getCamera();
    const headPosition = new THREE.Vector3();
    xrCamera.getWorldPosition(headPosition);
    this.playerRig.position.x += target.x - headPosition.x;
    this.playerRig.position.z += target.z - headPosition.z;
    this.playerRig.position.y += target.y - headPosition.y + 1.68;
  }
}

export function createWebXRManager(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.PerspectiveCamera,
): WebXRManager {
  return new WebXRManager(renderer, scene, camera);
}
