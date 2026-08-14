import React from 'react';
import { TelemetryState, Hotspot3D } from '../types/nuclear';
import { GlassPanel, StatCard, RadialProgress, ProgressBar, DataRow, SimpleButton, Chip, Pill } from './GlassmorphismComponents';
import { Thermometer, Gauge, Radio, Activity, Search, Layers, Compass, Play } from 'lucide-react';

/* ─── Top-Left Minimal Header ─── */
export interface MinimalHeaderProps {
  scramActive?: boolean;
  onOpenAura?: () => void;
  isAuraOpen?: boolean;
}
export const MinimalHeader: React.FC<MinimalHeaderProps> = ({ scramActive, onOpenAura, isAuraOpen }) => (
  <GlassPanel className="pointer-events-auto w-full px-4 py-3 flex items-center gap-4 overflow-hidden">
    <div className="flex items-center gap-2.5">
      <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center">
        <Radio className="w-3.5 h-3.5 text-[#64b4ff]" />
      </div>
      <div>
        <div className="text-sm font-semibold text-white tracking-wide">NUCLEUS</div>
        <div className="text-[10px] text-[#5a6d8a] font-medium tracking-wide">INFRASTRUCTURE XR</div>
      </div>
    </div>
    <div className="hud-header-divider w-px h-6 bg-white/6" />
    <div className="hud-header-summary flex-1 min-w-0">
      <div className="text-[10px] text-[#88aadd] font-medium">Exterior campus - containment, cooling, generation, and switchyard</div>
    </div>
    <div className="flex items-center gap-2">
      <Chip label={scramActive ? 'SCRAM' : 'BASELOAD'} color={scramActive ? '#ff6b6b' : '#22d3a8'} dot={scramActive ? '#ff6b6b' : '#22d3a8'} />
      <SimpleButton variant="ghost" size="sm" onClick={onOpenAura}>
        {isAuraOpen ? 'AURA ▲' : 'AURA ▼'}
      </SimpleButton>
    </div>
  </GlassPanel>
);

/* ─── Bottom-Left Asset Focus ─── */
export interface AssetFocusPanelProps {
  telemetry: TelemetryState;
  selectedHotspot: Hotspot3D | null;
  onInspect: () => void;
}
export const AssetFocusPanel: React.FC<AssetFocusPanelProps> = ({ selectedHotspot, onInspect }) => {
  return (
    <GlassPanel strong className="pointer-events-auto p-4 w-full max-h-full overflow-y-auto space-y-3">
      <div className="flex items-center justify-between border-b border-white/5 pb-2">
        <span className="text-label text-xs">ASSET FOCUS</span>
        <Chip label={selectedHotspot?.code || 'CNT-02'} />
      </div>
      {selectedHotspot ? (
        <>
          <p className="text-xs text-white/70 leading-relaxed">{selectedHotspot.summary}</p>
          <div className="space-y-2">
            {selectedHotspot.specs.map((s, i) => (
              <DataRow key={i} label={s.label} value={s.value} />
            ))}
          </div>
          <SimpleButton variant="primary" className="w-full" onClick={onInspect}>
            <Search className="w-3.5 h-3.5" /> Inspect Exterior
          </SimpleButton>
        </>
      ) : (
        <>
          <StatCard label="Shell Temperature" value={318.4} unit="°C" progress={{ value: 318.4, max: 350, color: '#22d3a8' }} accent />
          <StatCard label="System Pressure" value={15.52} unit="MPa" progress={{ value: 15.52, max: 17, color: '#64b4ff' }} accent />
          <StatCard label="Structural Integrity" value="99.2" unit="%" progress={{ value: 99.2, max: 100, color: '#22d3a8' }} />
          <SimpleButton variant="primary" className="w-full" onClick={onInspect}>
            <Search className="w-3.5 h-3.5" /> Inspect Exterior
          </SimpleButton>
        </>
      )}
    </GlassPanel>
  );
};

/* ─── Right Telemetry Dashboard ─── */
export interface TelemetryPanelProps {
  telemetry: TelemetryState;
}
export const TelemetryPanel: React.FC<TelemetryPanelProps> = ({ telemetry }) => (
  <GlassPanel strong className="pointer-events-auto p-4 w-full max-h-full overflow-y-auto space-y-3">
    <div className="flex items-center justify-between border-b border-white/5 pb-2">
      <span className="text-label text-xs">TELEMETRY</span>
      <span className="text-[9px] text-[#5a6d8a] font-mono">LIVE</span>
    </div>

    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-label text-[10px]">ELECTRICAL OUTPUT</span>
        <span className="text-value-sm text-[#22d3a8]">{telemetry.electricalPowerMW.toFixed(1)} MWe</span>
      </div>
      <div className="flex items-center justify-center gap-6 py-2">
        <RadialProgress value={telemetry.electricalPowerMW} max={1200} color="#22d3a8" size={80}>
          <div className="text-[18px] font-semibold text-white font-mono">{telemetry.electricalPowerMW.toFixed(0)}</div>
          <div className="text-[8px] text-[#5a6d8a]">MWe</div>
        </RadialProgress>
        <RadialProgress value={telemetry.thermalPowerMW} max={3450} color="#f5b800" size={80}>
          <div className="text-[18px] font-semibold text-white font-mono">{(telemetry.thermalPowerMW / 1000).toFixed(1)}</div>
          <div className="text-[8px] text-[#5a6d8a]">GWth</div>
        </RadialProgress>
      </div>
    </div>

    <div className="grid grid-cols-2 gap-2">
      <StatCard
        label="Core Outlet Temp"
        value={telemetry.hotLegTempC.toFixed(1)}
        unit="°C"
        progress={{ value: telemetry.hotLegTempC, max: 350, color: telemetry.hotLegTempC > 330 ? '#f5b800' : '#64b4ff' }}
      />
      <StatCard
        label="Coolant Pressure"
        value={telemetry.primaryPressureMPa.toFixed(2)}
        unit="MPa"
        progress={{ value: telemetry.primaryPressureMPa, max: 16.5, color: telemetry.primaryPressureMPa > 15.8 ? '#f5b800' : '#64b4ff' }}
      />
    </div>

    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-label text-[10px]">RADIATION FIELD</span>
        <span className="text-value-sm text-[#22d3a8]">{telemetry.ambientRadiationMicroSv.toFixed(2)} µSv/h</span>
      </div>
      <ProgressBar value={telemetry.ambientRadiationMicroSv} max={1} color="linear-gradient(90deg, #22d3a8 0%, #f5b800 50%, #ff6b6b 100%)" />
    </div>

    <div className="flex items-center justify-between pt-1 border-t border-white/5">
      <DataRow label="Neutron Flux" value={telemetry.neutronFlux.toFixed(2)} unit="×10¹³ n/cm²·s" />
      <DataRow label="Rod Position" value={`${telemetry.controlRodDepthPct}%`} />
    </div>
  </GlassPanel>
);

/* ─── Bottom Dock ─── */
export interface BottomDockProps {
  currentZone: string;
  onChangeZone: (id: string) => void;
  onToggleTools: () => void;
  toolsOpen: boolean;
  handRigEnabled: boolean;
  onToggleHandRig: () => void;
  caliperActive: boolean;
  onToggleCaliper: () => void;
  renderMode: string;
  onChangeRenderMode: (mode: string) => void;
  isMuted: boolean;
  onToggleMute: () => void;
  navigationMode: string;
  onChangeNavigationMode: (mode: string) => void;
  onStartPresentation: () => void;
}
export const BottomDock: React.FC<BottomDockProps> = ({
  currentZone, onChangeZone, onToggleTools, toolsOpen,
  handRigEnabled, onToggleHandRig, caliperActive, onToggleCaliper,
  renderMode, onChangeRenderMode, isMuted, onToggleMute,
  navigationMode, onChangeNavigationMode, onStartPresentation,
}) => {
  const zones = [
    { id: 'overview', label: 'Overview', icon: <Compass className="w-3.5 h-3.5" /> },
    { id: 'core', label: 'Containment', icon: <Radio className="w-3.5 h-3.5" /> },
    { id: 'turbine', label: 'Turbine Hall', icon: <Activity className="w-3.5 h-3.5" /> },
    { id: 'coolant', label: 'Cooling', icon: <Thermometer className="w-3.5 h-3.5" /> },
    { id: 'gantry', label: 'Switchyard', icon: <Gauge className="w-3.5 h-3.5" /> },
  ];

  const shaders = [
    { id: 'pbr', label: 'PBR' },
    { id: 'xray', label: 'X-Ray' },
    { id: 'thermal', label: 'Thermal' },
    { id: 'cherenkov', label: 'Cherenkov' },
    { id: 'flow', label: 'Flow' },
  ];
  const navigationModes = [
    { id: 'orbit', label: 'Orbit' },
    { id: 'walk', label: 'Walk' },
    { id: 'fly', label: 'Fly' },
    { id: 'first-person', label: 'First' },
  ];

  return (
    <GlassPanel
      className="pointer-events-auto w-full bg-slate-900/90 backdrop-blur-md border border-slate-700/60 shadow-2xl rounded-2xl px-6 py-3 flex items-center justify-center gap-1.5 overflow-x-auto scrollbar-hide"
      style={{
        background: 'rgba(15, 23, 42, 0.92)',
        borderColor: 'rgba(51, 65, 85, 0.6)',
        borderRadius: 16,
        boxShadow: '0 24px 48px rgba(0, 0, 0, 0.45)',
      }}
    >
      {zones.map((z) => (
        <Pill
          key={z.id}
          label={z.label}
          active={currentZone === z.id}
          onClick={() => onChangeZone(z.id)}
        />
      ))}
      <div className="w-px h-5 bg-white/6 mx-1" />
      <SimpleButton
        variant="ghost"
        size="sm"
        className="text-slate-200 hover:text-white font-medium"
        onClick={onStartPresentation}
        title="Start presentation tour"
        aria-label="Start presentation tour"
      >
        <Play className="w-3.5 h-3.5" />
      </SimpleButton>
      <SimpleButton
        variant="ghost"
        size="sm"
        className="text-slate-200 hover:text-white font-medium"
        onClick={onToggleTools}
      >
        <Layers className="w-3.5 h-3.5" />
      </SimpleButton>
      {toolsOpen && (
        <div className="flex items-center gap-1.5 animate-fadeIn">
          <div className="w-px h-5 bg-white/6" />
          {navigationModes.map((mode) => (
            <Pill
              key={mode.id}
              label={mode.label}
              active={navigationMode === mode.id}
              onClick={() => onChangeNavigationMode(mode.id)}
              size="xs"
            />
          ))}
          <div className="w-px h-5 bg-white/6" />
          {shaders.map((s) => (
            <Pill key={s.id} label={s.label} active={renderMode === s.id} onClick={() => onChangeRenderMode(s.id)} size="xs" />
          ))}
          <div className="w-px h-5 bg-white/6" />
          <Pill label={handRigEnabled ? 'Hands On' : 'Hands Off'} active={handRigEnabled} onClick={onToggleHandRig} size="xs" />
          <Pill label={caliperActive ? 'Caliper On' : 'Caliper'} active={caliperActive} onClick={onToggleCaliper} size="xs" />
          <SimpleButton
            variant="ghost"
            size="sm"
            className="text-slate-200 hover:text-white font-medium"
            onClick={onToggleMute}
          >
            {isMuted ? '🔇' : '🔊'}
          </SimpleButton>
        </div>
      )}
    </GlassPanel>
  );
};

/* ─── Hotspot Inspect Modal ─── */
export interface InspectModalProps {
  hotspot: Hotspot3D | null;
  onClose: () => void;
}
export const InspectModal: React.FC<InspectModalProps> = ({ hotspot, onClose }) => {
  if (!hotspot) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm pointer-events-auto">
      <GlassPanel strong className="p-5 w-full max-w-md">
        <div className="flex items-start justify-between border-b border-white/5 pb-3 mb-3">
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-mono text-[#64b4ff] font-semibold bg-white/5 px-2 py-0.5 rounded">{hotspot.code}</span>
            <div>
              <h3 className="text-sm font-semibold text-white">{hotspot.name}</h3>
              <span className="text-[10px] text-[#5a6d8a]">{hotspot.category} System</span>
            </div>
          </div>
          <SimpleButton variant="ghost" size="sm" onClick={onClose}>✕</SimpleButton>
        </div>
        <p className="text-xs text-white/70 leading-relaxed mb-4">{hotspot.details}</p>
        <div className="grid grid-cols-2 gap-2 mb-4">
          {hotspot.specs.map((s, i) => (
            <div key={i} className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-2.5">
              <span className="text-[9px] text-[#5a6d8a] block mb-0.5">{s.label}</span>
              <span className="text-xs font-mono text-white font-semibold">{s.value}</span>
            </div>
          ))}
        </div>
        <SimpleButton variant="primary" className="w-full" onClick={onClose}>Dismiss</SimpleButton>
      </GlassPanel>
    </div>
  );
};
