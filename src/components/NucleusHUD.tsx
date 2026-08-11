import React from 'react';
import type { Hotspot3D, Scene1ZoneId } from '../types/scene1';
import { ZONE_LABELS } from '../data/scene1Data';
import { spatialAudio } from '../audio/spatialAudio';
import { Compass, Maximize2, Radio, Volume2, VolumeX } from 'lucide-react';

interface NucleusHUDProps {
  currentZone: Scene1ZoneId;
  onChangeZone: (zone: Scene1ZoneId) => void;
  selectedHotspot: Hotspot3D | null;
  onCloseHotspotModal: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
}

const ZONES: Scene1ZoneId[] = ['overview', 'smr', 'facilities', 'city', 'sea'];

export const NucleusHUD: React.FC<NucleusHUDProps> = ({
  currentZone,
  onChangeZone,
  selectedHotspot,
  onCloseHotspotModal,
  isMuted,
  onToggleMute,
}) => {
  return (
    <div className="pointer-events-none fixed inset-0 z-30 flex flex-col justify-between p-4 md:p-6 overflow-hidden">
      {/* 1. TOP BAR */}
      <div className="pointer-events-auto flex items-center justify-between glass-panel rounded-xl px-4 py-2.5 w-full">
        <div className="flex items-center space-x-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-cyan-950/80 border border-cyan-400/50 shadow-[0_0_12px_#00f0ff]">
            <Radio className="w-4 h-4 text-cyan-300 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-orbitron font-bold text-sm tracking-wider text-white">
                NUCLEUS // NUWARD SMR GREEN ENERGY CITY
              </span>
              <span className="hidden md:inline text-[9px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-950/80 text-emerald-300 border border-emerald-500/50">
                SCENE 01
              </span>
            </div>
            <div className="flex items-center space-x-2 text-[10px] font-mono text-cyan-300/80">
              <span>BANGKOK EDITION</span>
              <span>•</span>
              <span>Desktop / Meta Quest 3</span>
            </div>
          </div>
        </div>

        <button
          onClick={() => {
            spatialAudio.playAirTap();
            onToggleMute();
          }}
          className="p-2 rounded-lg bg-black/40 text-cyan-300 border border-cyan-500/20 hover:border-cyan-400 transition-all cursor-pointer"
          title="Toggle Audio"
        >
          {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-cyan-400" />}
        </button>
      </div>

      {/* 2. BOTTOM NAVIGATION DOCK */}
      <div className="pointer-events-auto glass-panel rounded-xl p-3 flex items-center justify-between gap-3 w-full">
        <div className="flex items-center space-x-1.5 overflow-x-auto max-w-full pb-0.5">
          <span className="text-[10px] font-mono text-cyan-400/80 mr-1 hidden lg:inline flex items-center space-x-1">
            <Compass className="w-3 h-3 text-cyan-400" />
            <span>ZONES:</span>
          </span>
          {ZONES.map((z) => (
            <button
              key={z}
              onClick={() => {
                spatialAudio.playAirTap();
                onChangeZone(z);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer border ${
                currentZone === z
                  ? 'bg-cyan-500/30 text-cyan-200 border-cyan-300 shadow-[0_0_15px_#00f0ff]'
                  : 'bg-black/40 text-slate-300 border-cyan-500/20 hover:border-cyan-400/50'
              }`}
            >
              {ZONE_LABELS[z]}
            </button>
          ))}
        </div>

        <div className="hidden lg:flex items-center text-[10px] font-mono text-cyan-300/70 shrink-0">
          Drag to orbit · Scroll to zoom · Click hotspots · VR for walkthrough
        </div>
      </div>

      {/* 3. HOTSPOT INSPECTION MODAL */}
      {selectedHotspot && (
        <div className="pointer-events-auto fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="glass-panel rounded-2xl p-6 max-w-lg w-full shadow-[0_0_50px_rgba(0,240,255,0.3)] border border-cyan-400">
            <div className="flex items-center justify-between border-b border-cyan-500/30 pb-3 mb-4">
              <div className="flex items-center space-x-3">
                <span className="font-mono text-xs font-bold px-2 py-1 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-400/40">
                  {selectedHotspot.code}
                </span>
                <div>
                  <h3 className="font-orbitron font-bold text-base text-white">
                    {selectedHotspot.name}
                  </h3>
                  <span className="text-[11px] font-mono text-cyan-300/80">
                    {selectedHotspot.category} System
                  </span>
                </div>
              </div>
              <button
                onClick={() => {
                  spatialAudio.playAirTap();
                  onCloseHotspotModal();
                }}
                className="p-1.5 rounded-lg bg-black/40 text-slate-400 hover:text-white border border-cyan-500/30 cursor-pointer"
              >
                <Maximize2 className="w-4 h-4" />
              </button>
            </div>

            <p className="text-sm text-slate-200 mb-4 leading-relaxed font-sans">
              {selectedHotspot.details}
            </p>

            <div className="grid grid-cols-2 gap-2.5 mb-5">
              {selectedHotspot.specs.map((spec, i) => (
                <div key={i} className="p-2.5 rounded-lg bg-black/50 border border-cyan-500/20">
                  <span className="text-[10px] font-mono text-slate-400 block">{spec.label}</span>
                  <span className="font-mono text-xs font-bold text-cyan-300">{spec.value}</span>
                </div>
              ))}
            </div>

            <button
              onClick={() => {
                spatialAudio.playAirTap();
                onCloseHotspotModal();
              }}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-orbitron font-bold text-xs tracking-wider shadow-[0_0_20px_#00f0ff] cursor-pointer transition-all"
            >
              CLOSE INSPECTION
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
