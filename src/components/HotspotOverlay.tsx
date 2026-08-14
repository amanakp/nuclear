import React, { useMemo } from 'react';
import { Hotspot3D, HotspotScreenPosition } from '../types/nuclear';
import { GlassPanel, GlassChip, GlassButton } from '../design/GlassComponents';
import { X, Calendar, Activity, ExternalLink } from 'lucide-react';

const categoryColors: Record<string, { main: string; glow: string }> = {
  Safety: { main: '#22d3a8', glow: 'rgba(34, 211, 168, 0.4)' },
  Thermal: { main: '#ff4400', glow: 'rgba(255, 68, 0, 0.4)' },
  Hydro: { main: '#0088ff', glow: 'rgba(0, 136, 255, 0.4)' },
  Generation: { main: '#f5b800', glow: 'rgba(245, 184, 0, 0.4)' },
  Physics: { main: '#00f0ff', glow: 'rgba(0, 240, 255, 0.4)' },
};

const warningColors: Record<string, string> = {
  nominal: '#22d3a8',
  elevated: '#f5b800',
  critical: '#ff6b6b',
};

export const HotspotOverlay: React.FC<{
  hotspots: Hotspot3D[];
  screenPositions: HotspotScreenPosition[];
  selectedHotspotId: string | null;
  onSelectHotspot: (hotspot: Hotspot3D) => void;
}> = ({ hotspots, screenPositions, selectedHotspotId, onSelectHotspot }) => {
  const positionsById = useMemo(
    () => new Map(screenPositions.map((p) => [p.id, p])),
    [screenPositions]
  );

  return (
    <div className="hotspot-layer" aria-label="Plant asset hotspots" style={{ pointerEvents: 'none' }}>
      {hotspots.map((hotspot) => {
        const position = positionsById.get(hotspot.id);
        if (!position?.visible) return null;

        const colors = categoryColors[hotspot.category] ?? { main: '#64b4ff', glow: 'rgba(100, 180, 255, 0.4)' };
        const selected = hotspot.id === selectedHotspotId;

        return (
          <div
            key={hotspot.id}
            className="hotspot-marker"
            style={{
              left: position.x,
              top: position.y,
              pointerEvents: 'auto',
              transform: 'translate(-50%, -50%)',
              zIndex: selected ? 100 : 10,
            }}
          >
            {/* Pulse ring */}
            <div
              className={`pulse-ring ${selected ? 'active' : ''}`}
              style={{
                backgroundColor: colors.main,
                animationDuration: '2s',
              }}
            />
            {/* Core dot */}
            <div
              className="core-dot"
              style={{
                backgroundColor: colors.main,
                boxShadow: `0 0 12px ${colors.glow}`,
                borderColor: colors.main,
              }}
            >
              {selected && <Activity className="w-3 h-3 text-white" />}
            </div>
            
            {/* Tooltip label */}
            <div
              className={`hotspot-label ${selected ? 'visible' : ''}`}
              style={{
                borderColor: `${colors.main}80`,
              }}
            >
              <span className="font-mono text-[10px] text-white flex items-center gap-1">
                <span style={{ color: colors.main }}>{hotspot.code}</span>
                <span>|</span>
                <span>{hotspot.name}</span>
              </span>
              <span className="ml-2 px-1.5 py-0.5 rounded text-[9px] font-mono" 
                style={{ 
                  backgroundColor: warningColors[hotspot.warningLevel] + '20',
                  color: warningColors[hotspot.warningLevel],
                  border: `1px solid ${warningColors[hotspot.warningLevel]}40`
                }}>
                {hotspot.warningLevel.toUpperCase()}
              </span>
            </div>
            
            {/* Selection ring */}
            {selected && (
              <div className="selection-ring" style={{ borderColor: colors.main }} />
            )}
            
            {/* Interactive button */}
            <button
              type="button"
              className="hotspot-hit-area"
              style={{ 
                position: 'absolute',
                inset: -8,
                borderRadius: '50%',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
              }}
              onClick={() => onSelectHotspot(hotspot)}
              aria-label={`Inspect ${hotspot.name}`}
            />
          </div>
        );
      })}
    </div>
  );
};

// Premium Hotspot Detail Panel
interface HotspotDetailPanelProps {
  hotspot: Hotspot3D | null;
  onClose: () => void;
  onInspect?: () => void;
}

export const HotspotDetailPanel: React.FC<HotspotDetailPanelProps> = ({ 
  hotspot, 
  onClose, 
  onInspect,
}) => {
  if (!hotspot) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm pointer-events-auto">
      <GlassPanel variant="intense" className="p-5 w-full max-w-lg max-h-[85vh] overflow-y-auto animate-fadeIn">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-white/5 pb-3 mb-4">
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-mono text-[#64b4ff] font-semibold bg-white/5 px-2 py-0.5 rounded">
              {hotspot.code}
            </span>
            <div>
              <h3 className="text-sm font-semibold text-white">{hotspot.name}</h3>
              <span className="text-[10px] text-[#5a6d8a]">{hotspot.category} System</span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Close panel"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Summary */}
        <p className="text-xs text-white/70 leading-relaxed mb-4">{hotspot.details}</p>

        {/* Warning Level Badge */}
        <div className="flex items-center gap-2 mb-4">
          <GlassChip
            label={hotspot.warningLevel.toUpperCase()}
            variant={hotspot.warningLevel === 'nominal' ? 'success' : hotspot.warningLevel === 'elevated' ? 'warning' : 'danger'}
            size="xs"
          />
          <GlassChip
            label={`RISK: ${hotspot.riskLevel?.toUpperCase() ?? 'LOW'}`}
            variant={hotspot.riskLevel === 'high' ? 'danger' : hotspot.riskLevel === 'medium' ? 'warning' : 'success'}
            size="xs"
          />
        </div>

        {/* Live Telemetry */}
        {hotspot.telemetry && (
          <div className="mb-4">
            <div className="text-label text-xs mb-2">LIVE TELEMETRY</div>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(hotspot.telemetry).map(([key, value]) => 
                value && (
                  <GlassPanel key={key} variant="light" className="p-2">
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
                  </GlassPanel>
              ))}
            </div>
          </div>
        )}

        {/* Maintenance Notes */}
        {hotspot.maintenanceNotes && (
          <div className="mb-4 p-3 bg-white/[0.03] border border-white/[0.06] rounded-lg">
            <div className="text-label text-xs mb-1">MAINTENANCE NOTES</div>
            <p className="text-xs text-white/70">{hotspot.maintenanceNotes}</p>
          </div>
        )}

        {/* Last Inspection */}
        {hotspot.lastInspection && (
          <div className="mb-4 flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5 text-[#5a6d8a]" />
            <span className="text-[10px] text-[#5a6d8a] font-mono">Last: {hotspot.lastInspection}</span>
          </div>
        )}

        {/* Risk Level */}
        {hotspot.riskLevel && (
          <div className="mb-4 flex items-center gap-2">
            <GlassChip
              label={`RISK: ${hotspot.riskLevel.toUpperCase()}`}
              variant={hotspot.riskLevel === 'high' ? 'danger' : hotspot.riskLevel === 'medium' ? 'warning' : 'success'}
              size="xs"
            />
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-2 border-t border-white/5">
          {onInspect && (
            <GlassButton
              variant="primary"
              className="flex-1"
              onClick={onInspect}
            >
              <ExternalLink className="w-3.5 h-3.5 mr-1" />
              Inspect
            </GlassButton>
          )}
          <GlassButton
            variant="ghost"
            className="flex-1"
            onClick={onClose}
          >
            Dismiss
          </GlassButton>
        </div>
      </GlassPanel>
    </div>
  );
};