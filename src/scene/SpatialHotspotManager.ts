import * as THREE from 'three';
import { Hotspot3D } from '../types/nuclear';

export interface Hotspot3DObject extends THREE.Group {
  userData: {
    hotspot: Hotspot3D;
    isHovered: boolean;
    isSelected: boolean;
    isOccluded: boolean;
    pulsePhase: number;
    distanceFade: number;
  };
}

export interface HotspotInteractionEvent {
  hotspot: Hotspot3D;
  point: THREE.Vector3;
  distance: number;
  intersection: THREE.Intersection;
}

interface HotspotVisuals {
  core: THREE.Mesh<THREE.SphereGeometry, THREE.MeshStandardMaterial>;
  outerGlow: THREE.Mesh<THREE.SphereGeometry, THREE.MeshBasicMaterial>;
  pulseRing: THREE.Mesh<THREE.RingGeometry, THREE.MeshBasicMaterial>;
  beam: THREE.Mesh<THREE.CylinderGeometry, THREE.MeshBasicMaterial>;
  connector: THREE.Line<THREE.BufferGeometry, THREE.LineBasicMaterial>;
  label: THREE.Sprite;
}

export class SpatialHotspotManager {
  private readonly parent: THREE.Object3D;
  private readonly camera: THREE.PerspectiveCamera;
  private readonly renderer: THREE.WebGLRenderer;
  private readonly hotspots = new Map<string, Hotspot3DObject>();
  private readonly visuals = new Map<string, HotspotVisuals>();
  private readonly raycaster = new THREE.Raycaster();
  private readonly occlusionRaycaster = new THREE.Raycaster();
  private readonly pointer = new THREE.Vector2();
  private readonly worldPosition = new THREE.Vector3();
  private readonly cameraPosition = new THREE.Vector3();
  private readonly rayDirection = new THREE.Vector3();
  private readonly occluders: THREE.Object3D[] = [];
  private hoveredHotspot: Hotspot3DObject | null = null;
  private selectedHotspot: Hotspot3DObject | null = null;
  private onHoverCallbacks: Array<(hotspot: Hotspot3DObject | null) => void> = [];
  private onSelectCallbacks: Array<(hotspot: Hotspot3DObject) => void> = [];
  private onDeselectCallbacks: Array<() => void> = [];
  private lastOcclusionUpdate = 0;

  private readonly pulseSpeed = 2.25;
  private readonly hoverScale = 1.18;
  private readonly selectScale = 1.34;
  private readonly glowIntensity = 3.1;

  constructor(
    parent: THREE.Object3D,
    camera: THREE.PerspectiveCamera,
    renderer: THREE.WebGLRenderer,
  ) {
    this.parent = parent;
    this.camera = camera;
    this.renderer = renderer;
    this.raycaster.params.Points.threshold = 0.5;
  }

  setOccluders(occluders: THREE.Object3D[]): void {
    this.occluders.length = 0;
    this.occluders.push(...occluders);
  }

  createHotspotMesh(hotspot: Hotspot3D): Hotspot3DObject {
    const group = new THREE.Group() as Hotspot3DObject;
    group.name = `hotspot-${hotspot.id}`;
    const color = this.getCategoryColor(hotspot.category);

    const core = new THREE.Mesh(
      new THREE.SphereGeometry(0.72, 20, 16),
      new THREE.MeshStandardMaterial({
        name: `${hotspot.code} hotspot core`,
        color,
        emissive: color,
        emissiveIntensity: 1.55,
        metalness: 0.38,
        roughness: 0.22,
        transparent: true,
        opacity: 0.92,
        depthWrite: false,
        toneMapped: false,
      }),
    );
    core.name = 'core';
    core.renderOrder = 18;
    group.add(core);

    const outerGlow = new THREE.Mesh(
      new THREE.SphereGeometry(1.05, 18, 14),
      new THREE.MeshBasicMaterial({
        name: `${hotspot.code} hotspot glow`,
        color,
        transparent: true,
        opacity: 0.14,
        side: THREE.BackSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
      }),
    );
    outerGlow.name = 'outer-glow';
    outerGlow.renderOrder = 17;
    group.add(outerGlow);

    const pulseRing = new THREE.Mesh(
      new THREE.RingGeometry(0.92, 1.18, 48),
      new THREE.MeshBasicMaterial({
        name: `${hotspot.code} hotspot pulse ring`,
        color,
        transparent: true,
        opacity: 0.56,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
      }),
    );
    pulseRing.name = 'pulse-ring';
    pulseRing.renderOrder = 17;
    group.add(pulseRing);

    const beam = new THREE.Mesh(
      new THREE.CylinderGeometry(0.035, 0.095, 2.45, 12, 1, true),
      new THREE.MeshBasicMaterial({
        name: `${hotspot.code} hotspot callout beam`,
        color,
        transparent: true,
        opacity: 0.28,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        toneMapped: false,
      }),
    );
    beam.name = 'beam';
    beam.position.y = 1.25;
    beam.renderOrder = 16;
    group.add(beam);

    const connectorGeometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 1.45, 0),
      new THREE.Vector3(0, 3.0, 0),
    ]);
    const connector = new THREE.Line(
      connectorGeometry,
      new THREE.LineBasicMaterial({
        color,
        transparent: true,
        opacity: 0.42,
        depthWrite: false,
        toneMapped: false,
      }),
    );
    connector.name = 'connector';
    connector.renderOrder = 18;
    group.add(connector);

    const label = this.createLabelSprite(hotspot);
    label.name = 'label';
    label.position.set(0, 3.55, 0);
    label.renderOrder = 19;
    group.add(label);

    group.position.set(...hotspot.position3D);
    group.userData = {
      hotspot,
      isHovered: false,
      isSelected: false,
      isOccluded: false,
      pulsePhase: Math.random() * Math.PI * 2,
      distanceFade: 1,
    };

    this.hotspots.set(hotspot.id, group);
    this.visuals.set(hotspot.id, {
      core,
      outerGlow,
      pulseRing,
      beam,
      connector,
      label,
    });
    this.parent.add(group);
    return group;
  }

  createHotspots(hotspots: Hotspot3D[]): void {
    this.clearHotspots();
    hotspots.forEach((hotspot) => this.createHotspotMesh(hotspot));
  }

  clearHotspots(): void {
    this.hotspots.forEach((hotspot) => {
      this.parent.remove(hotspot);
      hotspot.traverse((object) => {
        if (
          object instanceof THREE.Mesh
          || object instanceof THREE.Line
          || object instanceof THREE.Sprite
        ) {
          if ('geometry' in object && object.geometry instanceof THREE.BufferGeometry) {
            object.geometry.dispose();
          }
          const materials = Array.isArray(object.material)
            ? object.material
            : [object.material];
          materials.forEach((material) => {
            if (material instanceof THREE.SpriteMaterial) material.map?.dispose();
            material.dispose();
          });
        }
      });
    });
    this.hotspots.clear();
    this.visuals.clear();
    this.hoveredHotspot = null;
    this.selectedHotspot = null;
  }

  updateHotspotSelection(hotspotId: string | null): void {
    this.selectedHotspot = null;
    this.hotspots.forEach((hotspot, id) => {
      hotspot.userData.isSelected = id === hotspotId;
      if (hotspot.userData.isSelected) this.selectedHotspot = hotspot;
    });
  }

  handlePointerMove(event: PointerEvent, container: HTMLElement): void {
    const rect = container.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    this.pointer.set(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1,
    );
    this.raycaster.setFromCamera(this.pointer, this.camera);

    const intersects = this.raycaster.intersectObjects(
      Array.from(this.hotspots.values()),
      true,
    );
    const nextHovered = intersects.length > 0
      ? this.findHotspotParent(intersects[0].object)
      : null;
    if (nextHovered === this.hoveredHotspot) return;

    if (this.hoveredHotspot) this.hoveredHotspot.userData.isHovered = false;
    this.hoveredHotspot = nextHovered;
    if (this.hoveredHotspot) this.hoveredHotspot.userData.isHovered = true;
    this.renderer.domElement.style.cursor = this.hoveredHotspot ? 'pointer' : '';
    this.onHoverCallbacks.forEach((callback) => callback(this.hoveredHotspot));
  }

  handlePointerDown(event: PointerEvent, container: HTMLElement): void {
    this.handlePointerMove(event, container);
    if (!this.hoveredHotspot) return;
    this.selectHotspot(this.hoveredHotspot);
  }

  handlePointerUp(): void {
    // Selection is persistent until another hotspot or the UI clears it.
  }

  handleXRSelect(controller: {
    target: THREE.Vector3;
    direction?: THREE.Vector3;
  }): Hotspot3DObject | null {
    const direction = controller.direction?.clone()
      ?? new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);
    this.raycaster.set(controller.target, direction.normalize());
    const hit = this.raycaster.intersectObjects(
      Array.from(this.hotspots.values()),
      true,
    )[0];
    const hotspot = hit ? this.findHotspotParent(hit.object) : null;
    if (hotspot) this.selectHotspot(hotspot);
    return hotspot;
  }

  handleXRSelectEnd(): void {
    // XR selection is persistent to match desktop and hand tracking behavior.
  }

  animate(deltaTime: number, elapsedTime = performance.now() / 1000): void {
    this.camera.getWorldPosition(this.cameraPosition);
    const shouldUpdateOcclusion = elapsedTime - this.lastOcclusionUpdate > 0.18;
    if (shouldUpdateOcclusion) this.lastOcclusionUpdate = elapsedTime;

    this.hotspots.forEach((hotspot, id) => {
      const visuals = this.visuals.get(id);
      if (!visuals) return;
      hotspot.userData.pulsePhase += deltaTime * this.pulseSpeed;
      hotspot.getWorldPosition(this.worldPosition);

      const distance = this.cameraPosition.distanceTo(this.worldPosition);
      const distanceFade = 1 - THREE.MathUtils.smoothstep(distance, 115, 270);
      hotspot.userData.distanceFade = distanceFade;
      if (shouldUpdateOcclusion) {
        hotspot.userData.isOccluded = this.computeOcclusion(
          this.cameraPosition,
          this.worldPosition,
          distance,
        );
      }

      const pulse = Math.sin(hotspot.userData.pulsePhase) * 0.5 + 0.5;
      const interactionScale = hotspot.userData.isSelected
        ? this.selectScale
        : hotspot.userData.isHovered
          ? this.hoverScale
          : 1;
      const distanceScale = THREE.MathUtils.clamp(distance * 0.0115, 0.82, 2.4);
      hotspot.scale.setScalar(distanceScale * interactionScale);

      const occlusionFade = hotspot.userData.isOccluded
        && !hotspot.userData.isSelected
        && !hotspot.userData.isHovered
        ? 0.1
        : 1;
      const alpha = distanceFade * occlusionFade;
      hotspot.visible = alpha > 0.015;
      visuals.pulseRing.quaternion.copy(this.camera.quaternion);
      visuals.pulseRing.scale.setScalar(1 + pulse * 0.34);
      visuals.outerGlow.scale.setScalar(1 + pulse * 0.18);
      visuals.beam.rotation.y += deltaTime * 0.24;

      visuals.pulseRing.material.opacity = alpha * (
        hotspot.userData.isSelected ? 0.88 : hotspot.userData.isHovered ? 0.72 : 0.46
      ) * (0.74 + pulse * 0.26);
      visuals.outerGlow.material.opacity = alpha * (
        hotspot.userData.isSelected ? 0.38 : hotspot.userData.isHovered ? 0.26 : 0.12
      );
      visuals.core.material.opacity = alpha * 0.94;
      visuals.core.material.emissiveIntensity = (
        hotspot.userData.isSelected
          ? this.glowIntensity
          : hotspot.userData.isHovered
            ? 2.45
            : 1.55
      ) * (0.92 + pulse * 0.12);
      visuals.beam.material.opacity = alpha * (0.2 + pulse * 0.14);
      visuals.connector.material.opacity = alpha * 0.36;

      const labelMaterial = visuals.label.material as THREE.SpriteMaterial;
      const showLabel = (
        hotspot.userData.isSelected
        || hotspot.userData.isHovered
        || distance < 78
      ) && !hotspot.userData.isOccluded;
      visuals.label.visible = showLabel && distanceFade > 0.06;
      labelMaterial.opacity = distanceFade * (
        hotspot.userData.isSelected ? 1 : hotspot.userData.isHovered ? 0.94 : 0.72
      );
      visuals.label.position.y = 3.55 + Math.sin(elapsedTime * 1.55 + hotspot.userData.pulsePhase) * 0.06;
    });
  }

  onHover(callback: (hotspot: Hotspot3DObject | null) => void): () => void {
    this.onHoverCallbacks.push(callback);
    return () => {
      this.onHoverCallbacks = this.onHoverCallbacks.filter(
        (entry) => entry !== callback,
      );
    };
  }

  onSelect(callback: (hotspot: Hotspot3DObject) => void): () => void {
    this.onSelectCallbacks.push(callback);
    return () => {
      this.onSelectCallbacks = this.onSelectCallbacks.filter(
        (entry) => entry !== callback,
      );
    };
  }

  onDeselect(callback: () => void): () => void {
    this.onDeselectCallbacks.push(callback);
    return () => {
      this.onDeselectCallbacks = this.onDeselectCallbacks.filter(
        (entry) => entry !== callback,
      );
    };
  }

  getHotspot(id: string): Hotspot3DObject | undefined {
    return this.hotspots.get(id);
  }

  getAllHotspots(): Hotspot3DObject[] {
    return Array.from(this.hotspots.values());
  }

  getSelectedHotspot(): Hotspot3DObject | null {
    return this.selectedHotspot;
  }

  getHoveredHotspot(): Hotspot3DObject | null {
    return this.hoveredHotspot;
  }

  dispose(): void {
    this.renderer.domElement.style.cursor = '';
    this.clearHotspots();
    this.onHoverCallbacks = [];
    this.onSelectCallbacks = [];
    this.onDeselectCallbacks = [];
  }

  private createLabelSprite(hotspot: Hotspot3D): THREE.Sprite {
    const canvas = document.createElement('canvas');
    canvas.width = 768;
    canvas.height = 160;
    const context = canvas.getContext('2d');
    if (!context) return new THREE.Sprite();

    const accent = this.getCategoryColorHex(hotspot.category);
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = 'rgba(7, 14, 20, 0.92)';
    context.strokeStyle = `${accent}cc`;
    context.lineWidth = 3;
    context.beginPath();
    context.roundRect(3, 3, 762, 154, 12);
    context.fill();
    context.stroke();

    context.fillStyle = accent;
    context.fillRect(3, 3, 9, 154);
    context.font = '600 30px "JetBrains Mono", Consolas, monospace';
    context.fillStyle = accent;
    context.textAlign = 'left';
    context.textBaseline = 'middle';
    context.fillText(hotspot.code, 34, 48);

    context.font = '600 34px Inter, "Segoe UI", sans-serif';
    context.fillStyle = '#f4f8fb';
    context.fillText(hotspot.name, 34, 98, 690);

    context.font = '500 21px "JetBrains Mono", Consolas, monospace';
    context.fillStyle = 'rgba(196, 214, 225, 0.72)';
    context.fillText(`${hotspot.category.toUpperCase()} SYSTEM`, 34, 132);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.generateMipmaps = true;

    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      depthTest: true,
      toneMapped: false,
    });
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(11.6, 2.42, 1);
    sprite.center.set(0.5, 0);
    return sprite;
  }

  private computeOcclusion(
    cameraPosition: THREE.Vector3,
    hotspotPosition: THREE.Vector3,
    distance: number,
  ): boolean {
    if (this.occluders.length === 0 || distance < 3) return false;
    this.rayDirection.subVectors(hotspotPosition, cameraPosition).normalize();
    this.occlusionRaycaster.set(cameraPosition, this.rayDirection);
    this.occlusionRaycaster.near = 0.2;
    this.occlusionRaycaster.far = Math.max(0, distance - 1.25);
    return this.occlusionRaycaster.intersectObjects(this.occluders, false).length > 0;
  }

  private findHotspotParent(object: THREE.Object3D): Hotspot3DObject | null {
    let current: THREE.Object3D | null = object;
    while (current) {
      if (current.name.startsWith('hotspot-')) {
        const id = current.name.slice('hotspot-'.length);
        return this.hotspots.get(id) ?? null;
      }
      current = current.parent;
    }
    return null;
  }

  private selectHotspot(hotspot: Hotspot3DObject): void {
    if (this.selectedHotspot) this.selectedHotspot.userData.isSelected = false;
    this.selectedHotspot = hotspot;
    hotspot.userData.isSelected = true;
    this.onSelectCallbacks.forEach((callback) => callback(hotspot));
  }

  private getCategoryColor(category: string): THREE.Color {
    const colors: Record<string, number> = {
      Safety: 0x22d3a8,
      Thermal: 0xff7d58,
      Hydro: 0x64b4ff,
      Generation: 0xf5b800,
      Physics: 0x72dcff,
    };
    return new THREE.Color(colors[category] ?? 0x64b4ff);
  }

  private getCategoryColorHex(category: string): string {
    const colors: Record<string, string> = {
      Safety: '#22d3a8',
      Thermal: '#ff7d58',
      Hydro: '#64b4ff',
      Generation: '#f5b800',
      Physics: '#72dcff',
    };
    return colors[category] ?? '#64b4ff';
  }
}

export function createSpatialHotspotManager(
  parent: THREE.Object3D,
  camera: THREE.PerspectiveCamera,
  renderer: THREE.WebGLRenderer,
): SpatialHotspotManager {
  return new SpatialHotspotManager(parent, camera, renderer);
}
