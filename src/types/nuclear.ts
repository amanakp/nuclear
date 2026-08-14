export type ZoneId = 'core' | 'turbine' | 'gantry' | 'coolant' | 'overview';

export type RenderShaderMode = 'pbr' | 'xray' | 'thermal' | 'cherenkov' | 'flow';

export type OperationalMode = 'normal' | 'maintenance' | 'emergency';

export type RadiationVisualizationMode = 'none' | 'monitoring' | 'critical';

export interface Hotspot3D {
  id: string;
  name: string;
  code: string;
  zone: ZoneId;
  position3D: [number, number, number];
  category: 'Safety' | 'Thermal' | 'Hydro' | 'Generation' | 'Physics';
  summary: string;
  specs: { label: string; value: string }[];
  warningLevel: 'nominal' | 'elevated' | 'critical';
  details: string;
  telemetry?: EquipmentTelemetry;
  maintenanceNotes?: string;
  riskLevel?: 'low' | 'medium' | 'high';
  lastInspection?: string;
}

export interface EquipmentTelemetry {
  pressure?: { value: number; unit: string; status: 'nominal' | 'warning' | 'critical' };
  temperature?: { value: number; unit: string; status: 'nominal' | 'warning' | 'critical' };
  flowRate?: { value: number; unit: string; status: 'nominal' | 'warning' | 'critical' };
  voltage?: { value: number; unit: string; status: 'nominal' | 'warning' | 'critical' };
  current?: { value: number; unit: string; status: 'nominal' | 'warning' | 'critical' };
  rpm?: { value: number; unit: string; status: 'nominal' | 'warning' | 'critical' };
  efficiency?: { value: number; unit: string; status: 'nominal' | 'warning' | 'critical' };
  health?: { value: number; unit: string; status: 'nominal' | 'warning' | 'critical' };
  vibration?: { value: number; unit: string; status: 'nominal' | 'warning' | 'critical' };
  level?: { value: number; unit: string; status: 'nominal' | 'warning' | 'critical' };
  neutronFlux?: { value: number; unit: string; status: 'nominal' | 'warning' | 'critical' };
  vacuum?: { value: number; unit: string; status: 'nominal' | 'warning' | 'critical' };
  hydrogen?: { value: number; unit: string; status: 'nominal' | 'warning' | 'critical' };
  oilLevel?: { value: number; unit: string; status: 'nominal' | 'warning' | 'critical' };
  oilTemperature?: { value: number; unit: string; status: 'nominal' | 'warning' | 'critical' };
  gasAnalysis?: { value: string; unit: string; status: 'nominal' | 'warning' | 'critical' };
  status?: { value: string; unit: string; status: 'nominal' | 'warning' | 'critical' };
}

export interface TelemetryState {
  thermalPowerMW: number;
  nominalThermalTargetMW: number;
  electricalPowerMW: number;
  primaryPressureMPa: number;
  hotLegTempC: number;
  coldLegTempC: number;
  boronPpm: number;
  controlRodDepthPct: number;
  turbineRpm: number;
  neutronFlux: number;
  ambientRadiationMicroSv: number;
  scramActive: boolean;
  operationalMode: OperationalMode;
}

export interface Alert {
  id: string;
  type: 'warning' | 'critical' | 'info' | 'maintenance';
  title: string;
  message: string;
  zone?: ZoneId;
  hotspotId?: string;
  timestamp: number;
  acknowledged: boolean;
  autoDismiss?: boolean;
}

export interface PresentationWaypoint {
  id: string;
  name: string;
  zone: ZoneId;
  cameraPosition: [number, number, number];
  cameraTarget: [number, number, number];
  duration: number;
  focusHotspotId?: string;
  narrative: string;
  renderMode?: RenderShaderMode;
}

export interface InspectionState {
  active: boolean;
  selectedHotspotId: string | null;
  cameraTransitioning: boolean;
}

export interface HotspotScreenPosition {
  id: string;
  x: number;
  y: number;
  visible: boolean;
  label: string;
  code: string;
  category: string;
}

export interface KPIData {
  id: string;
  label: string;
  value: string | number;
  unit?: string;
  status: 'nominal' | 'warning' | 'critical';
  trend?: 'up' | 'down' | 'stable';
  icon: React.ReactNode;
  color: string;
}