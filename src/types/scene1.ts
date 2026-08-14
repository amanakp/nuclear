import { Hotspot3D } from './nuclear';

export type Scene1ZoneId = 'overview' | 'smr' | 'facilities' | 'city' | 'sea';

export type Scene1RenderShaderMode = 'pbr' | 'xray' | 'thermal' | 'flow';

export interface Scene1Hotspot3D extends Hotspot3D {
  zone: Scene1ZoneId;
}

export const SCENE1_ZONE_LABELS: Record<Scene1ZoneId, string> = {
  overview: 'City Overview',
  smr: 'NUWARD SMR',
  facilities: 'Green Facilities',
  city: 'Bangkok City',
  sea: 'Thailand Sea',
};

export const SCENE1_ZONE_IDS: Scene1ZoneId[] = ['overview', 'smr', 'facilities', 'city', 'sea'];

export const SCENE1_CAMERA_PRESETS: Record<Scene1ZoneId, { position: [number, number, number]; target: [number, number, number]; fov?: number }> = {
  overview: { position: [10, 190, -580], target: [70, 14, -40], fov: 38 },
  smr: { position: [-120, 40, -110], target: [-120, 6, -250], fov: 40 },
  facilities: { position: [10, 75, 30], target: [-40, 8, -250], fov: 42 },
  city: { position: [330, 115, 330], target: [200, 18, 60], fov: 38 },
  sea: { position: [-60, 45, -560], target: [-80, 3, -320], fov: 44 },
};

export interface Scene1FacilityPosition {
  name: string;
  position: [number, number, number];
}

export const SCENE1_FACILITIES: Record<string, Scene1FacilityPosition> = {
  smr: { name: 'NUWARD SMR Plant', position: [-120, 0, -250] },
  desalination: { name: 'Desalination Plant', position: [-250, 0, -305] },
  dataCenter: { name: 'Data Center', position: [40, 0, -240] },
  heatingStation: { name: 'Heating Station', position: [170, 0, -195] },
  districtZone: { name: 'District Zone', position: [310, 0, -110] },
};

export const WORLD_CONSTANTS = {
  seaLevel: 0,
  shoreZ: -300,
  beachOuter: -330,
  beachInner: -280,
  sunDirection: [0.32, 0.55, 0.78] as [number, number, number],
  desalinationIntakeReach: 120,
};