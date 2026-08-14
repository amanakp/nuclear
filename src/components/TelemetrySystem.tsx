import { TelemetryState, Alert, Hotspot3D } from '../types/nuclear';
import { GlassPanel, GlassRadialProgress, GlassChip } from '../design/GlassComponents';


interface TelemetryWidgetProps {
  telemetry: TelemetryState;
  alerts: Alert[];
  selectedHotspot: Hotspot3D | null;
  className?: string;
}

export function TelemetrySystem({ 
  telemetry, 
  alerts, 
  selectedHotspot, 
  className = '' 
}: TelemetryWidgetProps) {

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Primary Power Row */}
      <GlassPanel variant="intense" className="p-4 space-y-4">
        <div className="flex items-center justify-between border-b border-white/5 pb-2">
          <span className="text-label text-xs">PRIMARY POWER</span>
          <span className="text-[9px] text-[#5a6d8a] font-mono">LIVE</span>
        </div>
        
        <div className="flex items-center justify-center gap-6 py-2">
          <div className="text-center">
            <div className="text-label text-[10px] mb-1">ELECTRICAL OUTPUT</div>
            <div className="flex items-center justify-center gap-4">
              <GlassRadialProgress
                value={telemetry.electricalPowerMW}
                max={1200}
                color="#22d3a8"
                size={72}
                animated
              >
                <div className="text-[18px] font-semibold text-white font-mono">
                  {telemetry.electricalPowerMW.toFixed(0)}
                </div>
                <div className="text-[8px] text-[#5a6d8a]">MWe</div>
              </GlassRadialProgress>
              <GlassRadialProgress
                value={telemetry.thermalPowerMW}
                max={3450}
                color="#f5b800"
                size={72}
                animated
              >
                <div className="text-[18px] font-semibold text-white font-mono">
                  {(telemetry.thermalPowerMW / 1000).toFixed(1)}
                </div>
                <div className="text-[8px] text-[#5a6d8a]">GWth</div>
              </GlassRadialProgress>
            </div>
            <div className="text-value-sm text-[#22d3a8] font-mono">
              {telemetry.electricalPowerMW.toFixed(1)} MWe
            </div>
          </div>
        </div>
      </GlassPanel>

      {/* Core Parameters Grid */}
      <div className="grid grid-cols-2 gap-2">
        <GlassPanel variant="light" className="p-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-label text-[10px]">CORE OUTLET TEMP</span>
            <span className="text-value-sm text-[#64b4ff]">{telemetry.hotLegTempC.toFixed(1)}°C</span>
          </div>
          <div className="relative h-2 bg-white/5 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-600 ease-out"
              style={{
                width: `${Math.min(100, (telemetry.hotLegTempC / 350) * 100)}%`,
                backgroundColor: telemetry.hotLegTempC > 330 ? '#f5b800' : '#64b4ff',
              }}
            />
          </div>
        </GlassPanel>
        
        <GlassPanel variant="light" className="p-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-label text-[10px]">COOLANT PRESSURE</span>
            <span className="text-value-sm text-[#64b4ff]">{telemetry.primaryPressureMPa.toFixed(2)} MPa</span>
          </div>
          <div className="relative h-2 bg-white/5 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-600 ease-out"
              style={{
                width: `${Math.min(100, (telemetry.primaryPressureMPa / 16.5) * 100)}%`,
                backgroundColor: '#64b4ff',
              }}
            />
          </div>
        </GlassPanel>
      </div>

      {/* Radiation & Neutron Flux */}
      <div className="space-y-3">
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-label text-[10px]">RADIATION FIELD</span>
            <span className="text-value-sm text-[#22d3a8]">{telemetry.ambientRadiationMicroSv.toFixed(2)} µSv/h</span>
          </div>
          <div className="relative h-2 bg-white/5 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-600 ease-out"
              style={{
                width: `${Math.min(100, (telemetry.ambientRadiationMicroSv / 1) * 100)}%`,
                background: 'linear-gradient(90deg, #22d3a8 0%, #f5b800 50%, #ff6b6b 100%)',
              }}
            />
          </div>
        </div>

        <div className="flex items-center justify-between pt-1 border-t border-white/5">
          <div className="p-2 flex-1 mr-1 bg-white/5 rounded-lg">
            <div className="text-label text-[10px]">NEUTRON FLUX</div>
            <div className="flex items-baseline gap-1">
              <span className="text-value-sm text-[#f5b800] font-mono">2.44</span>
              <span className="text-[9px] text-[#5a6d8a]">×10¹³ n/cm²·s</span>
            </div>
          </div>
          <div className="p-2 flex-1 ml-1 bg-white/5 rounded-lg">
            <div className="text-label text-[10px]">ROD POSITION</div>
            <div className="text-value-sm font-mono">{telemetry.controlRodDepthPct}%</div>
          </div>
        </div>

        <div className="flex items-center justify-between pt-1 border-t border-white/5">
          <div className="text-xs text-[#5a6d8a]">Turbine: {telemetry.turbineRpm} RPM</div>
          <div className="text-xs text-[#5a6d8a]">Boron: {telemetry.boronPpm.toFixed(1)} ppm</div>
        </div>
      </div>

      {/* Hotspot Detail Telemetry */}
      {(() => {
        if (!selectedHotspot || !selectedHotspot.telemetry) return null;
        return (
          <GlassPanel variant="intense" className="p-4 space-y-3">
        <div className="flex items-center justify-between border-b border-white/5 pb-2 mb-2">
          <span className="text-label text-xs">EQUIPMENT TELEMETRY</span>
          <span className="text-[9px] text-[#5a6d8a] font-mono">LIVE</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {Object.entries(selectedHotspot.telemetry).map(([key, value]) => 
            value && (
              <div key={key} className="p-2 bg-white/5 rounded-lg">
                <span className="text-[9px] text-[#5a6d8a] block mb-0.5">{key.toUpperCase()}</span>
                <div className="flex items-baseline gap-1">
                  <span className="text-xs font-mono text-white font-semibold">
                    {typeof value.value === 'number' ? value.value.toFixed(1) : value.value}
                  </span>
                  <span className="text-[9px] text-[#5a6d8a]">{value.unit}</span>
                </div>
                <GlassChip
                  label={value.status.toUpperCase()}
                  size="xs"
                  variant={value.status === 'nominal' ? 'success' : value.status === 'warning' ? 'warning' : 'danger'}
                />
</div>
            ))}
          </div>
        </GlassPanel>
      )
    })()}

    {/* Alerts Panel */}
    {alerts.length > 0 && (
      <GlassPanel variant="intense" className="p-4 space-y-2">
        <div className="flex items-center justify-between border-b border-white/5 pb-2 mb-2">
          <span className="text-label text-xs">ACTIVE ALERTS</span>
          <span className="text-[9px] text-[#5a6d8a] font-mono">{alerts.length}</span>
        </div>
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {alerts.slice(0, 5).map(alert => (
            <div 
              key={alert.id} 
              className="flex items-start gap-2 p-3 bg-white/5 rounded-lg border border-white/10"
              style={{ 
                borderLeftColor: alert.type === 'critical' ? '#ff6b6b' : 
                              alert.type === 'warning' ? '#f5b800' : '#64b4ff',
                borderLeftWidth: '3px' 
              }}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span 
                    className="text-xs font-semibold text-white px-2 py-0.5 rounded"
                    style={{ 
                      backgroundColor: alert.type === 'critical' ? 'rgba(255,107,107,0.2)' :
                                    alert.type === 'warning' ? 'rgba(245,184,0,0.2)' : 
                                    alert.type === 'info' ? 'rgba(100,180,255,0.2)' : 'rgba(34,211,168,0.2)',
                      color: alert.type === 'critical' ? '#ff6b6b' : 
                            alert.type === 'warning' ? '#f5b800' :
                            alert.type === 'info' ? '#64b4ff' : '#22d3a8'
                    }}
                  >
                    {alert.type.toUpperCase()}
                  </span>
                  <span className="text-xs text-[#5a6d8a] font-mono">
                    {new Date(alert.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <h4 className="text-xs font-semibold text-white mb-0.5">{alert.title}</h4>
                <p className="text-[10px] text-white/70">{alert.message}</p>
              </div>
              <button className="p-1 text-white/40 hover:text-white transition-colors">✕</button>
            </div>
))}
        </div>
      </GlassPanel>
    )}
    </div>
  );
}

export default TelemetrySystem;