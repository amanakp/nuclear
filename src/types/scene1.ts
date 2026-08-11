export type Scene1ZoneId = 'overview' | 'smr' | 'facilities' | 'city' | 'sea';

export type HotspotCategory =
  | 'Safety'
  | 'Thermal'
  | 'Hydro'
  | 'Generation'
  | 'Physics'
  | 'Environment';

export interface Hotspot3D {
  id: string;
  name: string;
  code: string;
  zone: Scene1ZoneId;
  position3D: [number, number, number]; // Three.js world space
  category: HotspotCategory;
  summary: string;
  specs: { label: string; value: string }[];
  warningLevel: 'nominal' | 'elevated' | 'critical';
  details: string;
}

export interface ScreenPosition {
  id: string;
  x: number;
  y: number;
  visible: boolean;
  label: string;
  code: string;
  category: string;
}

export interface CameraPreset {
  zone: Scene1ZoneId;
  label: string;
  position: [number, number, number];
  target: [number, number, number];
}
