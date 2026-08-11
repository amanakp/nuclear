import type { CameraPreset, Hotspot3D, Scene1ZoneId } from '../types/scene1';

/** Global world layout constants shared by the 3D modules and HUD. */
export const WORLD = {
  seaLevel: 0,
  shoreZ: -300, // coastline: sea lives at z < shoreZ, land at z > shoreZ
  beachOuter: -330,
  beachInner: -280,
  sunDirection: [0.32, 0.55, 0.78] as [number, number, number],
};

/** Anchor positions for the five facilities (Three.js world space, y = ground). */
export const FACILITIES = {
  smr: { name: 'NUWARD SMR Plant', position: [-120, 0, -250] as [number, number, number] },
  desalination: { name: 'Desalination Plant', position: [-260, 0, -295] as [number, number, number] },
  dataCenter: { name: 'Data Center', position: [40, 0, -240] as [number, number, number] },
  heatingStation: { name: 'Heating Station', position: [170, 0, -195] as [number, number, number] },
  districtZone: { name: 'District Zone', position: [310, 0, -110] as [number, number, number] },
} as const;

/** Camera presets — the default Overview composition reads: Sea -> SMR -> Bangkok City. */
export const CAMERA_PRESETS: CameraPreset[] = [
  {
    zone: 'overview',
    label: 'City Overview',
    position: [10, 190, -580],
    target: [70, 14, -40],
  },
  {
    zone: 'smr',
    label: 'NUWARD SMR',
    position: [-120, 40, -110],
    target: [-120, 6, -250],
  },
  {
    zone: 'facilities',
    label: 'Green Facilities',
    position: [10, 75, 30],
    target: [-40, 8, -238],
  },
  {
    zone: 'city',
    label: 'Bangkok City',
    position: [330, 115, 330],
    target: [200, 18, 60],
  },
  {
    zone: 'sea',
    label: 'Thailand Sea',
    position: [-60, 45, -560],
    target: [-80, 3, -320],
  },
];

export const ZONE_LABELS: Record<Scene1ZoneId, string> = {
  overview: 'City Overview',
  smr: 'NUWARD SMR',
  facilities: 'Green Facilities',
  city: 'Bangkok City',
  sea: 'Thailand Sea',
};

export const ZONE_IDS: Scene1ZoneId[] = ['overview', 'smr', 'facilities', 'city', 'sea'];

export const HOTSPOTS: Hotspot3D[] = [
  {
    id: 'smr-01',
    name: 'NUWARD SMR Plant',
    code: 'SMR-01',
    zone: 'smr',
    position3D: [-124, 35, -252],
    category: 'Generation',
    summary: 'Compact SMR delivering clean baseload power to Bangkok Green City.',
    specs: [
      { label: 'Electric Output', value: '340 MWe net' },
      { label: 'Reactor Units', value: '2 x 170 MWe' },
      { label: 'Fuel', value: 'Low-Enriched UO₂' },
      { label: 'Footprint', value: '0.03 km²' },
    ],
    warningLevel: 'nominal',
    details:
      'The NUWARD SMR is a small modular reactor designed for safety, simplicity and factory construction. It supplies baseload electricity to the Bangkok Green City grid and powers the Desalination Plant, Data Center and Heating Station without emitting carbon dioxide.',
  },
  {
    id: 'des-01',
    name: 'Desalination Plant',
    code: 'DES-01',
    zone: 'facilities',
    position3D: [-260, 16, -295],
    category: 'Hydro',
    summary: 'Turns Thailand seawater into fresh city water using SMR energy.',
    specs: [
      { label: 'Fresh Water Output', value: '60,000 m³/day' },
      { label: 'Technology', value: 'MED Thermal' },
      { label: 'Energy Source', value: 'SMR Steam (100%)' },
      { label: 'CO₂ Emissions', value: '0 t/yr' },
    ],
    warningLevel: 'nominal',
    details:
      'The Desalination Plant draws seawater from the Gulf of Thailand and uses waste heat and steam from the NUWARD SMR to drive a multi-effect distillation (MED) process. Produced fresh water is piped directly to the Data Center cooling loop and the District Zone.',
  },
  {
    id: 'dtc-01',
    name: 'Data Center',
    code: 'DTC-01',
    zone: 'facilities',
    position3D: [40, 16, -240],
    category: 'Generation',
    summary: 'Ultra-efficient computing hub cooled by seawater and green power.',
    specs: [
      { label: 'IT Load', value: '42 MW' },
      { label: 'Availability', value: '99.999%' },
      { label: 'Cooling', value: 'Seawater Loop' },
      { label: 'Green Power Mix', value: '100%' },
    ],
    warningLevel: 'nominal',
    details:
      'The Data Center receives a direct 340 MWe electrical connection from the NUWARD SMR and desalinated cooling water from the Desalination Plant — an integrated clean-energy infrastructure loop that makes Bangkok a regional digital hub.',
  },
  {
    id: 'hst-01',
    name: 'Heating Station',
    code: 'HST-01',
    zone: 'facilities',
    position3D: [170, 14, -195],
    category: 'Thermal',
    summary: 'District heat hub that recycles SMR thermal energy for the city.',
    specs: [
      { label: 'Heat Supply', value: '85 °C' },
      { label: 'Capacity', value: '90 MWth' },
      { label: 'Network', value: 'District Zone' },
      { label: 'CO₂ Saved', value: '48 kt/yr' },
    ],
    warningLevel: 'nominal',
    details:
      'The Heating Station converts low-pressure steam from the NUWARD SMR into hot water for the District Zone. This replaces conventional boilers, giving residents zero-carbon heating for homes and public buildings.',
  },
  {
    id: 'dst-01',
    name: 'District Zone',
    code: 'DST-01',
    zone: 'city',
    position3D: [310, 12, -110],
    category: 'Environment',
    summary: 'A model sustainable residential district heated by green energy.',
    specs: [
      { label: 'Connected Homes', value: '5,000' },
      { label: 'Green Space', value: '40%' },
      { label: 'EV-Ready Parking', value: '100%' },
      { label: 'Transit', value: 'BRT + Canal Ferries' },
    ],
    warningLevel: 'nominal',
    details:
      'The District Zone is Bangkok Green City\u2019s first carbon-neutral neighborhood. It receives district heating from the Heating Station, solar canopies, EV infrastructure and lush parkland — a living example of SMR-powered urban living.',
  },
  {
    id: 'bkk-01',
    name: 'Bangkok Green City',
    code: 'BKK-01',
    zone: 'city',
    position3D: [200, 62, 60],
    category: 'Environment',
    summary: 'Stylized modern skyline with eco-architecture, parks and EV streets.',
    specs: [
      { label: 'Skyline Towers', value: '220+' },
      { label: 'Urban Parks', value: '4' },
      { label: 'EV Boulevard', value: '5 km' },
      { label: 'Solar Arrays', value: '48 rooftop arrays' },
    ],
    warningLevel: 'nominal',
    details:
      'Bangkok Green City fuses the iconic identity of Bangkok with a net-zero smart-city grid. Glass towers, palm-lined boulevards, canal bridges and green plazas are all powered by the NUWARD SMR and renewable micro-generation.',
  },
  {
    id: 'sea-01',
    name: 'Thailand Sea',
    code: 'SEA-01',
    zone: 'sea',
    position3D: [-40, 4, -520],
    category: 'Environment',
    summary: 'Animated Gulf of Thailand coastline with beaches and offshore wind.',
    specs: [
      { label: 'Coastline', value: '12 km' },
      { label: 'Typical Waves', value: '≤ 1.2 m' },
      { label: 'Surface Temp', value: '29 °C' },
      { label: 'Marine Buffer', value: '2 km zone' },
    ],
    warningLevel: 'nominal',
    details:
      'The warm Gulf of Thailand meets the Green City along a protected coastline. The animated shader ocean, sandy beaches and offshore wind turbines complement the SMR as part of a diversified clean-energy portfolio.',
  },
  {
    id: 'h2o-01',
    name: 'Water Pipeline',
    code: 'H2O-01',
    zone: 'facilities',
    position3D: [-110, 7, -237],
    category: 'Hydro',
    summary: 'Desalination Plant -> Data Center fresh water feed line.',
    specs: [
      { label: 'Route', value: 'Desalination -> Data Center' },
      { label: 'Length', value: '300 m' },
      { label: 'Flow', value: '700 L/s' },
      { label: 'Material', value: 'Composite HDPE' },
    ],
    warningLevel: 'nominal',
    details:
      'A dedicated water pipeline carries desalinated fresh water from the Desalination Plant to the Data Center, where it drives the seawater-assisted cooling loop. The animated blue flow particles trace the water path across the facility corridor.',
  },
  {
    id: 'elc-01',
    name: 'Electric Connection',
    code: 'ELC-01',
    zone: 'smr',
    position3D: [-40, 20, -236],
    category: 'Generation',
    summary: 'Direct 340 MWe power link from NUWARD SMR to the Data Center.',
    specs: [
      { label: 'Route', value: 'SMR -> Data Center' },
      { label: 'Voltage', value: '230 kV AC' },
      { label: 'Capacity', value: '340 MWe' },
      { label: 'Line Loss', value: '0.4%' },
    ],
    warningLevel: 'nominal',
    details:
      'Overhead transmission pylons carry a dedicated 230 kV link from the NUWARD SMR substation to the Data Center. Pulsing energy packets travel along the line, visualizing electricity flowing directly from reactor to rack.',
  },
];
