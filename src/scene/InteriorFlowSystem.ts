import * as THREE from 'three';

type FlowKind = 'coolant' | 'energy';
type FlowPoint = [number, number, number];

interface FlowPathDefinition {
  kind: FlowKind;
  color: number;
  speed: number;
  pointSize: number;
  waveAmplitude: number;
  particleCount: number;
  conduitRadius: number;
  points: FlowPoint[];
}

interface AnimatedFlowPath {
  kind: FlowKind;
  curve: THREE.CatmullRomCurve3;
  positions: Float32Array;
  offsets: Float32Array;
  points: THREE.Points<THREE.BufferGeometry, THREE.ShaderMaterial>;
  line: THREE.Line<THREE.BufferGeometry, THREE.LineBasicMaterial>;
  conduit: THREE.Mesh<THREE.TubeGeometry, THREE.MeshStandardMaterial>;
  speed: number;
  waveAmplitude: number;
  phase: number;
}

export interface InteriorFlowSystem {
  group: THREE.Group;
  paths: AnimatedFlowPath[];
  opacity: number;
}

interface InteriorFlowUpdateOptions {
  elapsedTime: number;
  deltaTime: number;
  enabled: boolean;
  coolantRate: number;
  energyRate: number;
  pixelRatio: number;
}

const COOLANT_COLOR = 0x37e7ff;
const ENERGY_COLOR = 0xff8a38;
const FLOW_POINT = new THREE.Vector3();
const FLOW_TANGENT = new THREE.Vector3();
const FLOW_SIDE = new THREE.Vector3();
const FLOW_LIFT = new THREE.Vector3();
const WORLD_UP = new THREE.Vector3(0, 1, 0);
const FALLBACK_AXIS = new THREE.Vector3(1, 0, 0);

const FLOW_VERTEX_SHADER = `
  uniform float uPixelRatio;
  uniform float uPointSize;

  varying float vDepthFade;

  void main() {
    vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
    float distanceScale = 78.0 / max(18.0, -viewPosition.z);
    gl_PointSize = clamp(uPointSize * uPixelRatio * distanceScale, 2.5, 18.0);
    gl_Position = projectionMatrix * viewPosition;
    vDepthFade = 1.0 - smoothstep(70.0, 620.0, -viewPosition.z);
  }
`;

const FLOW_FRAGMENT_SHADER = `
  uniform vec3 uColor;
  uniform float uOpacity;

  varying float vDepthFade;

  void main() {
    vec2 centered = gl_PointCoord - vec2(0.5);
    float radius = length(centered);
    float halo = smoothstep(0.5, 0.08, radius);
    float core = smoothstep(0.2, 0.0, radius);
    float alpha = (halo * 0.74 + core) * uOpacity * vDepthFade;

    if (alpha < 0.01) discard;

    vec3 color = uColor * (1.0 + core * 2.0);
    gl_FragColor = vec4(color, alpha);
  }
`;

const FLOW_PATH_DEFINITIONS: FlowPathDefinition[] = [
  {
    kind: 'coolant',
    color: COOLANT_COLOR,
    speed: 0.075,
    pointSize: 8.6,
    waveAmplitude: 0.045,
    particleCount: 96,
    conduitRadius: 0.42,
    points: [
      [-10, 7.5, -4.5],
      [-14.5, 10, 0],
      [-10, 14, 4.5],
      [-5.5, 10, 0],
      [-10, 7.5, -4.5],
    ],
  },
  {
    kind: 'coolant',
    color: COOLANT_COLOR,
    speed: 0.048,
    pointSize: 7.9,
    waveAmplitude: 0.038,
    particleCount: 170,
    conduitRadius: 0.54,
    points: [
      [-10, 9, 0],
      [-2, 9, 0],
      [-2, 9, 16],
      [12, 9, 16],
      [12, 8, 29],
      [25, 8, 29],
      [41, 8, 29],
      [48, 7, 15],
      [48, 10, -17],
      [48, 18, -24],
      [48, 7, -31],
      [21, 5, -31],
      [1, 5, -21],
      [-10, 7, -10],
      [-10, 9, 0],
    ],
  },
  {
    kind: 'coolant',
    color: COOLANT_COLOR,
    speed: 0.045,
    pointSize: 7.9,
    waveAmplitude: 0.038,
    particleCount: 178,
    conduitRadius: 0.54,
    points: [
      [-10, 11, 0],
      [-19, 11, 0],
      [-19, 9, 16],
      [-10, 8, 29],
      [9, 7, 29],
      [25, 7, 29],
      [3, 5, 26],
      [-34, 5, 25],
      [-45, 7, 5],
      [-48, 18, -20],
      [-48, 8, -31],
      [-29, 5, -32],
      [-10, 7, -16],
      [-10, 11, 0],
    ],
  },
  {
    kind: 'energy',
    color: ENERGY_COLOR,
    speed: 0.09,
    pointSize: 8.8,
    waveAmplitude: 0.04,
    particleCount: 88,
    conduitRadius: 0.32,
    points: [
      [-10, 9, -3.4],
      [-13.5, 12, 0],
      [-10, 15, 3.4],
      [-6.5, 12, 0],
      [-10, 9, -3.4],
    ],
  },
  {
    kind: 'energy',
    color: ENERGY_COLOR,
    speed: 0.07,
    pointSize: 8.5,
    waveAmplitude: 0.032,
    particleCount: 152,
    conduitRadius: 0.43,
    points: [
      [-10, 15, 0],
      [-2, 15, 0],
      [-2, 14, 15],
      [12, 14, 15],
      [12, 14, 29],
      [25, 14, 29],
      [45, 14, 29],
      [55, 12, 16],
      [55, 12, 4],
      [34, 4, 4],
      [18, 3, 9],
      [-2, 4, 8],
      [-10, 8, 0],
      [-10, 15, 0],
    ],
  },
  {
    kind: 'energy',
    color: ENERGY_COLOR,
    speed: 0.058,
    pointSize: 8.4,
    waveAmplitude: 0.032,
    particleCount: 166,
    conduitRadius: 0.42,
    points: [
      [-10, 13, 0],
      [-5, 13, 0],
      [-5, 13, 13],
      [9, 13, 13],
      [9, 12, 29],
      [25, 12, 29],
      [5, 9, 27],
      [-34, 8, 25],
      [-43, 10, 5],
      [-48, 22, -20],
      [-48, 10, -29],
      [-26, 6, -28],
      [-10, 8, -13],
      [-10, 13, 0],
    ],
  },
];

function createFlowPath(definition: FlowPathDefinition, index: number): AnimatedFlowPath {
  const curve = new THREE.CatmullRomCurve3(
    definition.points.map(([x, y, z]) => new THREE.Vector3(x, y, z)),
    false,
    'centripetal',
    0.5,
  );
  const positions = new Float32Array(definition.particleCount * 3);
  const offsets = new Float32Array(definition.particleCount);

  for (let particleIndex = 0; particleIndex < definition.particleCount; particleIndex += 1) {
    offsets[particleIndex] = particleIndex / definition.particleCount;
  }

  const pointGeometry = new THREE.BufferGeometry();
  pointGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  const pointMaterial = new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color(definition.color) },
      uOpacity: { value: 0 },
      uPixelRatio: { value: 1 },
      uPointSize: { value: definition.pointSize },
    },
    vertexShader: FLOW_VERTEX_SHADER,
    fragmentShader: FLOW_FRAGMENT_SHADER,
    transparent: true,
    depthTest: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
  });

  const points = new THREE.Points(pointGeometry, pointMaterial);
  points.name = `${definition.kind} flow particles ${index + 1}`;
  points.userData.isProceduralInterior = true;
  points.frustumCulled = false;
  points.renderOrder = 14;

  const lineGeometry = new THREE.BufferGeometry().setFromPoints(curve.getPoints(220));
  const lineMaterial = new THREE.LineBasicMaterial({
    color: definition.color,
    transparent: true,
    opacity: 0,
    depthTest: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
  });
  const line = new THREE.Line(lineGeometry, lineMaterial);
  line.name = `${definition.kind} illuminated conduit centerline ${index + 1}`;
  line.userData.isProceduralInterior = true;
  line.frustumCulled = false;
  line.renderOrder = 13;

  const conduitMaterial = new THREE.MeshStandardMaterial({
    name: `${definition.kind}-flow-conduit`,
    color: definition.kind === 'coolant' ? 0x17495a : 0x5b321e,
    emissive: definition.color,
    emissiveIntensity: 0.16,
    metalness: 0.78,
    roughness: 0.3,
  });
  const conduit = new THREE.Mesh(
    new THREE.TubeGeometry(curve, 240, definition.conduitRadius, 8, false),
    conduitMaterial,
  );
  conduit.name = `${definition.kind} sealed process conduit ${index + 1}`;
  conduit.userData.isProceduralInterior = true;
  conduit.castShadow = true;
  conduit.receiveShadow = true;

  return {
    kind: definition.kind,
    curve,
    positions,
    offsets,
    points,
    line,
    conduit,
    speed: definition.speed,
    waveAmplitude: definition.waveAmplitude,
    phase: index * 1.618,
  };
}

export function createInteriorFlowSystem(): InteriorFlowSystem {
  const group = new THREE.Group();
  group.name = 'Sealed Coolant and Energy Flow Network';
  group.userData.isProceduralInterior = true;

  const paths = FLOW_PATH_DEFINITIONS.map((definition, index) => {
    const path = createFlowPath(definition, index);
    group.add(path.conduit, path.line, path.points);
    return path;
  });

  return {
    group,
    paths,
    opacity: 0,
  };
}

export function updateInteriorFlowSystem(
  system: InteriorFlowSystem,
  {
    elapsedTime,
    deltaTime,
    enabled,
    coolantRate,
    energyRate,
    pixelRatio,
  }: InteriorFlowUpdateOptions,
): void {
  const targetOpacity = enabled ? 1 : 0;
  system.opacity = THREE.MathUtils.damp(system.opacity, targetOpacity, 6, deltaTime);

  system.paths.forEach((path) => {
    const rate = path.kind === 'coolant' ? coolantRate : energyRate;
    const animatedTime = elapsedTime * path.speed * rate;

    for (let particleIndex = 0; particleIndex < path.offsets.length; particleIndex += 1) {
      const pathPosition = (path.offsets[particleIndex] + animatedTime) % 1;
      path.curve.getPointAt(pathPosition, FLOW_POINT);
      path.curve.getTangentAt(pathPosition, FLOW_TANGENT);

      FLOW_SIDE.crossVectors(FLOW_TANGENT, WORLD_UP);
      if (FLOW_SIDE.lengthSq() < 0.0001) {
        FLOW_SIDE.crossVectors(FLOW_TANGENT, FALLBACK_AXIS);
      }
      FLOW_SIDE.normalize();
      FLOW_LIFT.crossVectors(FLOW_SIDE, FLOW_TANGENT).normalize();

      const wavePhase = (
        pathPosition * Math.PI * 12
        + elapsedTime * (path.kind === 'coolant' ? 2.8 : 4.2)
        + particleIndex * 0.37
        + path.phase
      );
      FLOW_POINT.addScaledVector(FLOW_SIDE, Math.sin(wavePhase) * path.waveAmplitude);
      FLOW_POINT.addScaledVector(
        FLOW_LIFT,
        Math.cos(wavePhase * 0.7) * path.waveAmplitude * 0.36,
      );

      const positionIndex = particleIndex * 3;
      path.positions[positionIndex] = FLOW_POINT.x;
      path.positions[positionIndex + 1] = FLOW_POINT.y;
      path.positions[positionIndex + 2] = FLOW_POINT.z;
    }

    const positionAttribute = path.points.geometry.getAttribute('position') as THREE.BufferAttribute;
    positionAttribute.needsUpdate = true;
    path.points.material.uniforms.uOpacity.value = system.opacity;
    path.points.material.uniforms.uPixelRatio.value = pixelRatio;
    path.line.material.opacity = system.opacity * (path.kind === 'coolant' ? 0.34 : 0.28);
    path.conduit.material.emissiveIntensity = path.conduit.userData.isXRayInteriorActive
      ? 1.5
      : 0.12 + system.opacity * 0.38;
  });
}
