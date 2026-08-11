import React from 'react';
import { Hotspot3D } from '../types/scene1';
import { spatialAudio } from '../audio/spatialAudio';
import { Activity, ShieldCheck, Zap, Thermometer, Radio } from 'lucide-react';

interface HotspotOverlayProps {
  hotspots: Hotspot3D[];
  screenPositions: { id: string; x: number; y: number; visible: boolean; label: string; code: string; category: string }[];
  selectedHotspotId: string | null;
  onSelectHotspot: (hotspot: Hotspot3D) => void;
}

export const HotspotOverlay: React.FC<HotspotOverlayProps> = ({
  hotspots,
  screenPositions,
  selectedHotspotId,
  onSelectHotspot
}) => {
  return (
    <div className="pointer-events-none absolute inset-0 z-20 overflow-hidden select-none">
      {screenPositions.map((pos) => {
        if (!pos.visible) return null;
        const hotspot = hotspots.find((h) => h.id === pos.id);
        if (!hotspot) return null;

        const isSelected = selectedHotspotId === pos.id;

        const getCategoryIcon = () => {
          switch (hotspot.category) {
            case 'Safety':
              return <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />;
            case 'Generation':
              return <Zap className="w-3.5 h-3.5 text-amber-400" />;
            case 'Thermal':
              return <Thermometer className="w-3.5 h-3.5 text-rose-400" />;
            case 'Physics':
              return <Radio className="w-3.5 h-3.5 text-cyan-400" />;
            default:
              return <Activity className="w-3.5 h-3.5 text-cyan-400" />;
          }
        };

        return (
          <div
            key={pos.id}
            className="pointer-events-auto absolute transition-transform duration-100 ease-out -translate-x-1/2 -translate-y-1/2 cursor-pointer group"
            style={{ left: pos.x, top: pos.y }}
            onClick={() => {
              spatialAudio.playAirTap();
              onSelectHotspot(hotspot);
            }}
            onMouseEnter={() => spatialAudio.playHoverPing()}
          >
            {/* Holographic Target Beacon Pin */}
            <div className="relative flex items-center justify-center">
              {/* Outer pulsing ring */}
              <div
                className={`absolute rounded-full transition-all duration-300 ${
                  isSelected
                    ? 'w-12 h-12 border-2 border-cyan-300 bg-cyan-500/20 animate-ping'
                    : 'w-8 h-8 border border-cyan-400/40 bg-cyan-900/20 group-hover:w-10 group-hover:h-10 group-hover:border-cyan-300'
                }`}
              />

              {/* Core Node Marker */}
              <div
                className={`relative z-10 flex items-center justify-center rounded-full transition-transform duration-200 ${
                  isSelected
                    ? 'w-7 h-7 bg-cyan-400 text-black shadow-[0_0_20px_#00f0ff] scale-110'
                    : 'w-6 h-6 bg-black/80 border border-cyan-400/80 text-cyan-300 group-hover:scale-110 shadow-[0_0_10px_rgba(0,240,255,0.4)]'
                }`}
              >
                {getCategoryIcon()}
              </div>

              {/* Holographic Attached Callout Tag */}
              <div
                className={`absolute left-8 top-1/2 -translate-y-1/2 flex items-center space-x-2 px-2.5 py-1 rounded-md transition-all duration-200 ${
                  isSelected
                    ? 'glass-panel scale-105 border-cyan-300'
                    : 'glass-panel opacity-85 group-hover:opacity-100 group-hover:scale-105'
                }`}
              >
                <span className="text-[10px] font-mono font-bold tracking-wider px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-400/30">
                  {pos.code}
                </span>
                <span className="text-xs font-semibold tracking-wide text-slate-100 whitespace-nowrap">
                  {pos.label}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
