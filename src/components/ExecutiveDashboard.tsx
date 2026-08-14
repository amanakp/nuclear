import React from 'react';
import { KPIData, TelemetryState, Hotspot3D, OperationalMode } from '../types/nuclear';
import { GlassPanel, GlassProgressBar, GlassRadialProgress, GlassChip } from '../design/GlassComponents';
import { cn } from '../utils/cn';
import {
  Activity,
  Shield,
  Thermometer,
  Gauge,
  RotateCcw,
  Power,
  Zap as ZapIcon,
  Radio,
  TrendingUp,
  TrendingDown,
  Minus,
} from 'lucide-react';

interface KPICardProps {
  kpi: KPIData;
  animated?: boolean;
}

const statusToVariant = (status: 'nominal' | 'warning' | 'critical') => {
  switch (status) {
    case 'nominal': return 'success';
    case 'warning': return 'warning';
    case 'critical': return 'danger';
    default: return 'default';
  }
};

const riskToVariant = (risk: 'low' | 'medium' | 'high') => {
  switch (risk) {
    case 'low': return 'success';
    case 'medium': return 'warning';
    case 'high': return 'danger';
    default: return 'default';
  }
};

const trendToIcon = (trend?: 'up' | 'down' | 'stable') => {
  switch (trend) {
    case 'up': return <TrendingUp className="w-3 h-3 text-[#22d3a8]" />;
    case 'down': return <TrendingDown className="w-3 h-3 text-[#ff6b6b]" />;
    default: return <Minus className="w-3 h-3 text-[#88aadd]" />;
  }
};

interface KPICardProps {
  kpi: KPIData;
  animated?: boolean;
}

export const KPICard: React.FC<KPICardProps> = ({ kpi, animated = true }) => {
  const statusColors = {
    nominal: { bg: 'rgba(34, 211, 168, 0.12)', border: 'rgba(34, 211, 168, 0.3)', text: '#22d3a8', icon: '#22d3a8' },
    warning: { bg: 'rgba(245, 184, 0, 0.12)', border: 'rgba(245, 184, 0, 0.3)', text: '#f5b800', icon: '#f5b800' },
    critical: { bg: 'rgba(255, 107, 107, 0.12)', border: 'rgba(255, 107, 107, 0.3)', text: '#ff6b6b', icon: '#ff6b6b' },
  };

  const colors = statusColors[kpi.status];

  return (
    <GlassPanel
      variant="strong"
      className={cn(
        'p-4 flex flex-col gap-3 transition-all duration-300',
        animated && 'hover:bg-white/[0.06] hover:border-white/15'
      )}
      style={{
        background: colors.bg,
        borderColor: colors.border,
        boxShadow: `0 4px 24px ${colors.bg.replace('0.12', '0.4')}`,
      }}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: colors.bg.replace('0.12', '0.25'), border: `1px solid ${colors.border}` }}
          >
            <span style={{ color: colors.icon }}>{kpi.icon}</span>
          </div>
          <div>
            <div className="text-label text-[10px] text-[#88aadd]">{kpi.label}</div>
            <GlassChip
              label={kpi.status.toUpperCase()}
              size="xs"
              variant={statusToVariant(kpi.status)}
            />
          </div>
        </div>
        <div className="flex items-center gap-1 text-[10px] font-mono" style={{ color: colors.text }}>
          {trendToIcon(kpi.trend)}
        </div>
      </div>

      <div className="flex items-baseline justify-between">
        <div className="flex items-baseline gap-1.5">
          <span className="text-value font-mono font-semibold" style={{ color: colors.text, fontSize: '28px' }}>
            {kpi.value}
          </span>
          {kpi.unit && <span className="text-mono" style={{ color: '#5a6d8a' }}>{kpi.unit}</span>}
        </div>
        <GlassRadialProgress
          value={typeof kpi.value === 'number' ? kpi.value : parseFloat(String(kpi.value).replace(/[^\d.]/g, '')) || 0}
          max={100}
          size={48}
          strokeWidth={3}
          color={colors.text}
          trailColor="rgba(255,255,255,0.06)"
          animated={animated}
        >
          <span className="text-[11px] font-mono font-semibold" style={{ color: colors.text }}>
            {typeof kpi.value === 'number' ? kpi.value.toFixed(0) : String(kpi.value).replace(/[^\d.]/g, '')}
          </span>
        </GlassRadialProgress>
      </div>

      {kpi.trend !== undefined && (
        <div className="flex items-center gap-1.5 pt-1" style={{ borderTop: `1px solid ${colors.border}` }}>
          <GlassChip
            label={kpi.trend === 'up' ? 'IMPROVING' : kpi.trend === 'down' ? 'DEGRADING' : 'STABLE'}
            size="xs"
            variant={kpi.trend === 'up' ? 'success' : kpi.trend === 'down' ? 'danger' : 'default'}
          />
        </div>
      )}
    </GlassPanel>
  );
};

interface ExecutiveDashboardProps {
  telemetry: TelemetryState;
  operationalMode: OperationalMode;
  alerts: any[];
  selectedHotspot: Hotspot3D | null;
  onCloseHotspot?: () => void;
}

export const ExecutiveDashboard: React.FC<ExecutiveDashboardProps> = ({
  telemetry,
  operationalMode,
  alerts,
  selectedHotspot,
  onCloseHotspot,
}) => {
  const getStatus = (value: number, thresholds: { warning: number; critical: number; inverse?: boolean }) => {
    if (thresholds.inverse) {
      if (value <= thresholds.critical) return 'critical' as const;
      if (value <= thresholds.warning) return 'warning' as const;
      return 'nominal' as const;
    }
    if (value >= thresholds.critical) return 'critical' as const;
    if (value >= thresholds.warning) return 'warning' as const;
    return 'nominal' as const;
  };

  const kpis: KPIData[] = [
    {
      id: 'thermal-power',
      label: 'THERMAL POWER',
      value: telemetry.thermalPowerMW.toFixed(1),
      unit: 'MW',
      status: getStatus(telemetry.thermalPowerMW, { warning: 3200, critical: 3600 }),
      trend: telemetry.thermalPowerMW > 3400 ? 'up' : 'stable',
      icon: <ZapIcon className="w-4 h-4" />,
      color: '#f5b800',
    },
    {
      id: 'electrical-output',
      label: 'ELECTRICAL OUTPUT',
      value: telemetry.electricalPowerMW.toFixed(1),
      unit: 'MWe',
      status: getStatus(telemetry.electricalPowerMW, { warning: 1100, critical: 1000, inverse: true }),
      trend: telemetry.electricalPowerMW > 1150 ? 'up' : 'stable',
      icon: <Power className="w-4 h-4" />,
      color: '#22d3a8',
    },
    {
      id: 'reactor-health',
      label: 'REACTOR HEALTH',
      value: '99.2',
      unit: '%',
      status: 'nominal',
      trend: 'stable',
      icon: <Shield className="w-4 h-4" />,
      color: '#22d3a8',
    },
    {
      id: 'primary-pressure',
      label: 'PRIMARY PRESSURE',
      value: telemetry.primaryPressureMPa.toFixed(2),
      unit: 'MPa',
      status: getStatus(telemetry.primaryPressureMPa, { warning: 15.8, critical: 16.2 }),
      trend: 'stable',
      icon: <Gauge className="w-4 h-4" />,
      color: '#64b4ff',
    },
    {
      id: 'core-temperature',
      label: 'CORE OUTLET TEMP',
      value: telemetry.hotLegTempC.toFixed(1),
      unit: '°C',
      status: getStatus(telemetry.hotLegTempC, { warning: 335, critical: 345 }),
      trend: 'stable',
      icon: <Thermometer className="w-4 h-4" />,
      color: telemetry.hotLegTempC > 330 ? '#f5b800' : '#64b4ff',
    },
    {
      id: 'radiation-level',
      label: 'RADIATION FIELD',
      value: telemetry.ambientRadiationMicroSv.toFixed(2),
      unit: 'µSv/h',
      status: getStatus(telemetry.ambientRadiationMicroSv, { warning: 0.5, critical: 1.0 }),
      trend: 'stable',
      icon: <Activity className="w-4 h-4" />,
      color: '#22d3a8',
    },
    {
      id: 'control-rods',
      label: 'CONTROL ROD POSITION',
      value: `${telemetry.controlRodDepthPct}%`,
      unit: '',
      status: telemetry.controlRodDepthPct > 80 ? 'warning' : 'nominal',
      trend: 'stable',
      icon: <RotateCcw className="w-4 h-4" />,
      color: telemetry.controlRodDepthPct > 80 ? '#f5b800' : '#22d3a8',
    },
    {
      id: 'turbine-speed',
      label: 'TURBINE SPEED',
      value: `${telemetry.turbineRpm}`,
      unit: 'RPM',
      status: getStatus(telemetry.turbineRpm, { warning: 1795, critical: 1790, inverse: true }),
      trend: 'stable',
      icon: <RotateCcw className="w-4 h-4" />,
      color: '#64b4ff',
    },
  ];

  const criticalAlerts = alerts.filter(a => a.type === 'critical' && !a.acknowledged).length;
  const warningAlerts = alerts.filter(a => a.type === 'warning' && !a.acknowledged).length;

  return (
    <div className="hud-layer pointer-events-auto">
      {/* TOP BAR - FACILITY STATUS */}
      <div className="hud-header">
        <GlassPanel variant="strong" className="px-5 py-3.5 flex items-center justify-between w-full">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
              <Radio className="w-4 h-4 text-[#64b4ff]" />
            </div>
            <div>
              <div className="text-sm font-semibold text-white tracking-wide">NUCLEUS</div>
              <div className="text-[10px] text-[#5a6d8a] font-medium tracking-wide">EXECUTIVE COMMAND CENTER</div>
            </div>
          </div>
          <div className="hud-header-divider w-px h-7 bg-white/6" />
          <div className="hud-header-summary flex-1 min-w-0">
            <div className="text-[10px] text-[#88aadd] font-medium">
              {operationalMode === 'emergency'
                ? '⚠ EMERGENCY MODE ACTIVE - Full SCRAM initiated'
                : operationalMode === 'maintenance'
                  ? '🔧 MAINTENANCE MODE - Limited operations'
                  : 'Exterior campus - containment, cooling, generation, and switchyard'}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <GlassChip
              label={operationalMode.toUpperCase()}
              size="xs"
              variant={
                operationalMode === 'emergency' ? 'danger' :
                operationalMode === 'maintenance' ? 'warning' : 'success'
              }
            />
            <span className="text-[10px] text-[#5a6d8a] font-mono">
              {criticalAlerts > 0 && <span className="text-[#ff6b6b]">● {criticalAlerts} CRITICAL</span>}
              {warningAlerts > 0 && <span className="text-[#f5b800] ml-2">● {warningAlerts} WARNING</span>}
              {criticalAlerts === 0 && warningAlerts === 0 && <span className="text-[#22d3a8]">● ALL SYSTEMS NOMINAL</span>}
            </span>
          </div>
        </GlassPanel>
      </div>

      {/* KPI GRID */}
      <div className="hud-panel hud-panel-left" style={{ top: '88px', left: '16px', width: '420px', maxHeight: 'calc(100vh - 200px)' }}>
        <GlassPanel variant="intense" className="p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-white/5 pb-2">
            <span className="text-label text-xs">FACILITY KPIs</span>
            <GlassChip label={operationalMode.toUpperCase()} size="xs" variant={operationalMode === 'emergency' ? 'danger' : operationalMode === 'maintenance' ? 'warning' : 'success'} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            {kpis.map((kpi) => (
              <KPICard key={kpi.id} kpi={kpi} />
            ))}
          </div>
        </GlassPanel>
      </div>

      {/* TELEMETRY PANEL - RIGHT */}
      <div className="hud-panel hud-panel-right" style={{ top: '16px', right: '16px', width: '380px' }}>
        <GlassPanel variant="intense" className="p-4 space-y-4 max-h-[calc(100vh-100px)] overflow-y-auto">
          <div className="flex items-center justify-between border-b border-white/5 pb-2">
            <span className="text-label text-xs">LIVE TELEMETRY</span>
            <span className="text-[9px] text-[#5a6d8a] font-mono">LIVE</span>
          </div>

          <div className="space-y-4">
            {/* Primary Power */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-label text-[10px]">ELECTRICAL OUTPUT</span>
                <span className="text-value-sm text-[#22d3a8]">{telemetry.electricalPowerMW.toFixed(1)} MWe</span>
              </div>
              <div className="flex items-center justify-center gap-6 py-2">
                <GlassRadialProgress
                  value={telemetry.electricalPowerMW}
                  max={1200}
                  color="#22d3a8"
                  size={72}
                >
                  <div className="text-[16px] font-semibold text-white font-mono">{telemetry.electricalPowerMW.toFixed(0)}</div>
                  <div className="text-[8px] text-[#5a6d8a]">MWe</div>
                </GlassRadialProgress>
                <GlassRadialProgress
                  value={telemetry.thermalPowerMW}
                  max={3450}
                  color="#f5b800"
                  size={72}
                >
                  <div className="text-[16px] font-semibold text-white font-mono">{(telemetry.thermalPowerMW / 1000).toFixed(1)}</div>
                  <div className="text-[8px] text-[#5a6d8a]">GWth</div>
                </GlassRadialProgress>
              </div>
            </div>

            {/* Core Parameters */}
            <div className="grid grid-cols-2 gap-2">
              <GlassPanel variant="light" className="p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-label text-[10px]">CORE OUTLET TEMP</span>
                  <span className="text-value-sm text-[#64b4ff]">{telemetry.hotLegTempC.toFixed(1)}°C</span>
                </div>
                <GlassProgressBar value={telemetry.hotLegTempC} max={350} color="#64b4ff" height={3} />
              </GlassPanel>
              <GlassPanel variant="light" className="p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-label text-[10px]">COOLANT PRESSURE</span>
                  <span className="text-value-sm text-[#64b4ff]">{telemetry.primaryPressureMPa.toFixed(2)} MPa</span>
                </div>
                <GlassProgressBar value={telemetry.primaryPressureMPa} max={16.5} color="#64b4ff" height={3} />
              </GlassPanel>
            </div>

            {/* Radiation & Neutron Flux */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-label text-[10px]">RADIATION FIELD</span>
                <span className="text-value-sm text-[#22d3a8]">{telemetry.ambientRadiationMicroSv.toFixed(2)} µSv/h</span>
              </div>
              <GlassProgressBar
                value={telemetry.ambientRadiationMicroSv}
                max={1}
                color="linear-gradient(90deg, #22d3a8 0%, #f5b800 50%, #ff6b6b 100%)"
              />
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-white/5">
              <GlassPanel variant="light" className="p-2 flex-1 mr-1">
                <div className="text-label text-[10px]">NEUTRON FLUX</div>
                <div className="text-value-sm text-[#f5b800] font-mono">2.44</div>
                <div className="text-mono text-[#5a6d8a]">×10¹³ n/cm²·s</div>
              </GlassPanel>
              <GlassPanel variant="light" className="p-2 flex-1 ml-1">
                <div className="text-label text-[10px]">ROD POSITION</div>
                <div className="text-value-sm font-mono">{telemetry.controlRodDepthPct}%</div>
              </GlassPanel>
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-white/5">
              <div className="text-xs text-[#5a6d8a]">Turbine: {telemetry.turbineRpm} RPM</div>
              <div className="text-xs text-[#5a6d8a]">Boron: {telemetry.boronPpm.toFixed(1)} ppm</div>
            </div>
          </div>
        </GlassPanel>
      </div>

      {/* SELECTED HOTSPOT DETAIL PANEL */}
      {selectedHotspot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm pointer-events-auto">
          <GlassPanel variant="intense" className="p-5 w-full max-w-md max-h-[80vh] overflow-y-auto animate-fadeIn">
            <div className="flex items-start justify-between border-b border-white/5 pb-3 mb-3">
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-mono text-[#64b4ff] font-semibold bg-white/5 px-2 py-0.5 rounded">{selectedHotspot.code}</span>
                <div>
                  <h3 className="text-sm font-semibold text-white">{selectedHotspot.name}</h3>
                  <span className="text-[10px] text-[#5a6d8a]">{selectedHotspot.category} System</span>
                </div>
              </div>
              <button
                onClick={onCloseHotspot}
                className="p-1.5 rounded-full bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/10 transition-colors"
              >✕</button>
            </div>
            <p className="text-xs text-white/70 leading-relaxed mb-4">{selectedHotspot.details}</p>
            
            {selectedHotspot.telemetry && (
              <div className="mb-4">
                <div className="text-label text-xs mb-2">LIVE TELEMETRY</div>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(selectedHotspot.telemetry).map(([key, value]) => (
                    value && (
                      <GlassPanel key={key} variant="light" className="p-2">
                        <span className="text-[9px] text-[#5a6d8a] block mb-0.5">{key.toUpperCase()}</span>
                        <div className="flex items-baseline gap-1">
                          <span className="text-xs font-mono text-white font-semibold">{typeof value.value === 'number' ? value.value.toFixed(1) : value.value}</span>
                          <span className="text-[9px] text-[#5a6d8a]">{value.unit}</span>
                        </div>
                        <GlassChip
                          label={value.status.toUpperCase()}
                          size="xs"
                          variant={value.status === 'nominal' ? 'success' : value.status === 'warning' ? 'warning' : 'danger'}
                        />
                      </GlassPanel>
                    ))
                  )}
                </div>
              </div>
            )}
            
            {selectedHotspot.maintenanceNotes && (
              <div className="mb-4 p-3 bg-white/[0.03] border border-white/[0.06] rounded-lg">
                <div className="text-label text-xs mb-1">MAINTENANCE NOTES</div>
                <p className="text-xs text-white/70">{selectedHotspot.maintenanceNotes}</p>
              </div>
            )}

            {selectedHotspot.riskLevel && (
              <div className="mb-4 flex items-center gap-2">
                <GlassChip
                  label={`RISK: ${selectedHotspot.riskLevel.toUpperCase()}`}
                  variant={riskToVariant(selectedHotspot.riskLevel)}
                />
                {selectedHotspot.lastInspection && (
                  <span className="text-[10px] text-[#5a6d8a] font-mono">Last: {selectedHotspot.lastInspection}</span>
                )}
              </div>
            )}

            <button
              onClick={onCloseHotspot}
              className="w-full py-2 px-4 bg-white/10 border border-white/20 rounded-lg text-white font-medium hover:bg-white/20 transition-colors"
            >
              Dismiss
            </button>
          </GlassPanel>
        </div>
      )}
    </div>
  );
};

export default ExecutiveDashboard;