import React, { useState } from 'react';
import { ZoneId, RenderShaderMode, TelemetryState, Hotspot3D, Alert, RadiationVisualizationMode, HotspotScreenPosition } from '../types/nuclear';
import { spatialAudio } from '../audio/spatialAudio';
import { BottomDock } from '../ui/SpatialUILayout';
import { GlassPanel } from '../ui/GlassmorphismComponents';
import { Ruler, CheckCircle2 } from 'lucide-react';
import { DesktopNavigationMode } from '../scene/CinematicNavigationSystem';
import { ExecutiveDashboard } from './ExecutiveDashboard';
import { HotspotOverlay } from './HotspotOverlay';
import { HOTSPOTS_DATA } from '../data/nuclearData';

interface SpatialHolographicHUDProps {
  currentZone: ZoneId;
  onChangeZone: (zone: ZoneId) => void;
  renderMode: RenderShaderMode;
  onChangeRenderMode: (mode: RenderShaderMode) => void;
  telemetry: TelemetryState;
  onUpdateControlRodDepth: (depth: number) => void;
  handRigEnabled: boolean;
  onToggleHandRig: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
  selectedHotspot: Hotspot3D | null;
  onCloseHotspotModal: () => void;
  onOpenAuraAI: () => void;
  isAuraOpen: boolean;
  onOpenScramModal: () => void;
  isScramModalOpen: boolean;
  caliperActive: boolean;
  onToggleCaliper: () => void;
  navigationMode: DesktopNavigationMode;
  onChangeNavigationMode: (mode: DesktopNavigationMode) => void;
  onStartPresentation: () => void;
  alerts: Alert[];
  radiationMode: RadiationVisualizationMode;
  hotspotScreenPositions: HotspotScreenPosition[];
  onSelectHotspot: (hotspot: Hotspot3D) => void;
}

export const SpatialHolographicHUD: React.FC<SpatialHolographicHUDProps> = ({
  currentZone, onChangeZone, renderMode, onChangeRenderMode,
  telemetry, handRigEnabled, onToggleHandRig, isMuted, onToggleMute,
  selectedHotspot, onCloseHotspotModal,
  caliperActive, onToggleCaliper,
  navigationMode, onChangeNavigationMode, onStartPresentation,
  alerts, hotspotScreenPositions, onSelectHotspot,
}) => {
  const [toolsOpen, setToolsOpen] = useState(false);

  return (
    <div className="hud-layer">
      {/* EXECUTIVE DASHBOARD */}
      <ExecutiveDashboard
        telemetry={telemetry}
        operationalMode={telemetry.operationalMode}
        alerts={alerts}
        selectedHotspot={selectedHotspot}
        onCloseHotspot={onCloseHotspotModal}
      />

      {/* 2D HOTSPOT OVERLAY */}
      <HotspotOverlay
        hotspots={HOTSPOTS_DATA}
        screenPositions={hotspotScreenPositions}
        selectedHotspotId={selectedHotspot?.id ?? null}
        onSelectHotspot={onSelectHotspot}
      />

      {/* BOTTOM DOCK */}
      <div className="hud-dock">
        <BottomDock
          currentZone={currentZone}
          onChangeZone={(id) => { spatialAudio.playAirTap(); onChangeZone(id as ZoneId); }}
          onToggleTools={() => setToolsOpen(!toolsOpen)}
          toolsOpen={toolsOpen}
          handRigEnabled={handRigEnabled}
          onToggleHandRig={() => { spatialAudio.playAirTap(); onToggleHandRig(); }}
          caliperActive={caliperActive}
          onToggleCaliper={() => { spatialAudio.playAirTap(); onToggleCaliper(); }}
          renderMode={renderMode}
          onChangeRenderMode={(mode) => { spatialAudio.playAirTap(); onChangeRenderMode(mode as RenderShaderMode); }}
          isMuted={isMuted}
          onToggleMute={() => { spatialAudio.playAirTap(); onToggleMute(); }}
          navigationMode={navigationMode}
          onChangeNavigationMode={(mode) => {
            spatialAudio.playAirTap();
            onChangeNavigationMode(mode as DesktopNavigationMode);
          }}
          onStartPresentation={() => {
            spatialAudio.playSuccessChime();
            onStartPresentation();
          }}
        />
      </div>

      {/* CALIPER INDICATOR */}
      {caliperActive && (
        <div className="caliper-indicator">
          <GlassPanel className="px-3 py-1.5 flex items-center gap-2">
            <Ruler className="w-3 h-3 text-[#64b4ff]" />
            <span className="text-[10px] text-[#88aadd] font-mono">Caliper: RPV Shell ID = 4,400 mm ± 0.05 mm</span>
            <CheckCircle2 className="w-3 h-3 text-[#22d3a8]" />
          </GlassPanel>
        </div>
      )}
    </div>
  );
};
