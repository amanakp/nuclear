import { Component, useState, useEffect, type ReactNode } from 'react';
import { NucleusScene1 } from './components/NucleusScene1';
import { NucleusHUD } from './components/NucleusHUD';
import { HotspotOverlay } from './components/HotspotOverlay';
import { RuntimeProbe } from './components/RuntimeProbe';
import type { Hotspot3D, Scene1ZoneId, ScreenPosition } from './types/scene1';
import { HOTSPOTS, ZONE_IDS } from './data/scene1Data';
import { spatialAudio } from './audio/spatialAudio';

class SceneErrorBoundary extends Component<{ children: ReactNode }, { error: string | null }> {
  state: { error: string | null } = { error: null };

  static getDerivedStateFromError(error: unknown) {
    return { error: error instanceof Error ? error.message : String(error) };
  }

  render() {
    if (this.state.error) {
      return (
        <div className="w-screen h-screen flex items-center justify-center bg-[#020408] text-rose-300 font-mono text-sm p-8">
          <div className="text-center">
            <p className="text-lg font-bold mb-2">SCENE RENDER ERROR</p>
            <p>{this.state.error}</p>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const zoneFromUrl = (): Scene1ZoneId => {
  const raw = new URLSearchParams(window.location.search).get('zone');
  return (ZONE_IDS as string[]).includes(raw ?? '') ? (raw as Scene1ZoneId) : 'overview';
};

export default function App() {
  const [currentZone, setCurrentZone] = useState<Scene1ZoneId>(zoneFromUrl);
  const [selectedHotspot, setSelectedHotspot] = useState<Hotspot3D | null>(null);
  const [screenPositions, setScreenPositions] = useState<ScreenPosition[]>([]);
  const [isMuted, setIsMuted] = useState(false);

  // Ambient audio hum
  useEffect(() => {
    spatialAudio.startContinuousHum();
    return () => spatialAudio.stopContinuousSounds();
  }, []);

  const handleToggleMute = () => {
    const nextMute = !isMuted;
    setIsMuted(nextMute);
    spatialAudio.setMuted(nextMute);
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-black text-slate-100 font-sans select-none">
      {/* 1. Interactive Three.js WebGL Scene */}
      <SceneErrorBoundary>
        <NucleusScene1
          currentZone={currentZone}
          selectedHotspotId={selectedHotspot ? selectedHotspot.id : null}
          onSelectHotspot={setSelectedHotspot}
          onScreenPositions={setScreenPositions}
        />
      </SceneErrorBoundary>

      {/* 2. Floating 3D Spatial Hotspots */}
      <HotspotOverlay
        hotspots={HOTSPOTS}
        screenPositions={screenPositions}
        selectedHotspotId={selectedHotspot ? selectedHotspot.id : null}
        onSelectHotspot={(hotspot) => {
          setSelectedHotspot(hotspot);
          setCurrentZone(hotspot.zone);
        }}
      />

      {/* 3. NUCLEUS HUD */}
      <NucleusHUD
        currentZone={currentZone}
        onChangeZone={setCurrentZone}
        selectedHotspot={selectedHotspot}
        onCloseHotspotModal={() => setSelectedHotspot(null)}
        isMuted={isMuted}
        onToggleMute={handleToggleMute}
      />

      {/* 4. QA runtime probe (only when ?probe=1) */}
      {new URLSearchParams(window.location.search).get('probe') === '1' && <RuntimeProbe />}
    </div>
  );
}
