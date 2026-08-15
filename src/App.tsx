import { useState, useEffect, useCallback, useRef } from 'react';
import { ThreeNuclearScene } from './components/ThreeNuclearScene';
import { SpatialHolographicHUD } from './components/SpatialHolographicHUD';
import { HoloLensHandRig } from './components/HoloLensHandRig';
import { AuraAIAssistant } from './components/AuraAIAssistant';
import { ScramEmergencyModal } from './components/ScramEmergencyModal';
import { LoadingScreen } from './components/LoadingScreen';
import { assetManager, initializeAssetManager } from './assets/AssetManager';
import { loadScene1Assets, Scene1AssetHandles } from './scene/Scene1Composition';
import { SCENE1_ASSET_MANIFEST, SCENE1_ASSET_KEYS } from './data/scene1Manifest';
import { ZoneId, RenderShaderMode, TelemetryState, Hotspot3D, OperationalMode, RadiationVisualizationMode, HotspotScreenPosition } from './types/nuclear';
import { AI_ZONE_NARRATIVES, HOTSPOTS_DATA } from './data/nuclearData';
import { spatialAudio } from './audio/spatialAudio';
import { DesktopNavigationMode } from './scene/CinematicNavigationSystem';

interface PresentationStep {
  time: number;
  telemetryTargets: Partial<TelemetryState>;
  hotspotId?: string | null;
}

const PRESENTATION_SCRIPT: PresentationStep[] = [
  { time: 0, telemetryTargets: { thermalPowerMW: 3450, electricalPowerMW: 1180, hotLegTempC: 325.8, primaryPressureMPa: 15.51, ambientRadiationMicroSv: 0.12, turbineRpm: 1800, controlRodDepthPct: 28 }, hotspotId: null },
  { time: 10, telemetryTargets: { thermalPowerMW: 3450, electricalPowerMW: 1180, hotLegTempC: 326, primaryPressureMPa: 15.51, ambientRadiationMicroSv: 0.12, turbineRpm: 1800, controlRodDepthPct: 28 }, hotspotId: 'containment-building' },
  { time: 20, telemetryTargets: { thermalPowerMW: 3480, electricalPowerMW: 1190, hotLegTempC: 328, primaryPressureMPa: 15.53, ambientRadiationMicroSv: 0.14, turbineRpm: 1800, controlRodDepthPct: 26 }, hotspotId: 'reactor-vessel' },
  { time: 30, telemetryTargets: { thermalPowerMW: 3510, electricalPowerMW: 1200, hotLegTempC: 330, primaryPressureMPa: 15.55, ambientRadiationMicroSv: 0.18, turbineRpm: 1800, controlRodDepthPct: 24 }, hotspotId: 'reactor-vessel' },
  { time: 40, telemetryTargets: { thermalPowerMW: 3520, electricalPowerMW: 1205, hotLegTempC: 331, primaryPressureMPa: 15.56, ambientRadiationMicroSv: 0.18, turbineRpm: 1820, controlRodDepthPct: 24 }, hotspotId: 'turbine-hall' },
  { time: 50, telemetryTargets: { thermalPowerMW: 3520, electricalPowerMW: 1210, hotLegTempC: 331, primaryPressureMPa: 15.56, ambientRadiationMicroSv: 0.18, turbineRpm: 1830, controlRodDepthPct: 23 }, hotspotId: 'condenser' },
  { time: 58, telemetryTargets: { thermalPowerMW: 3490, electricalPowerMW: 1195, hotLegTempC: 329, primaryPressureMPa: 15.54, ambientRadiationMicroSv: 0.16, turbineRpm: 1810, controlRodDepthPct: 25 }, hotspotId: 'main-transformers' },
  { time: 66, telemetryTargets: { thermalPowerMW: 3460, electricalPowerMW: 1185, hotLegTempC: 327, primaryPressureMPa: 15.52, ambientRadiationMicroSv: 0.14, turbineRpm: 1800, controlRodDepthPct: 27 }, hotspotId: 'north-cooling-tower' },
  { time: 74, telemetryTargets: { thermalPowerMW: 3480, electricalPowerMW: 1190, hotLegTempC: 332, primaryPressureMPa: 15.55, ambientRadiationMicroSv: 0.22, turbineRpm: 1800, controlRodDepthPct: 26 }, hotspotId: 'reactor-vessel' },
  { time: 78, telemetryTargets: { thermalPowerMW: 3510, electricalPowerMW: 1200, hotLegTempC: 338, primaryPressureMPa: 15.58, ambientRadiationMicroSv: 0.45, turbineRpm: 1795, controlRodDepthPct: 28 }, hotspotId: 'reactor-vessel' },
  { time: 82, telemetryTargets: { thermalPowerMW: 3550, electricalPowerMW: 1210, hotLegTempC: 344, primaryPressureMPa: 15.62, ambientRadiationMicroSv: 0.85, turbineRpm: 1790, controlRodDepthPct: 30 }, hotspotId: 'reactor-vessel' },
  { time: 86, telemetryTargets: { thermalPowerMW: 3420, electricalPowerMW: 1170, hotLegTempC: 340, primaryPressureMPa: 15.58, ambientRadiationMicroSv: 0.70, turbineRpm: 1795, controlRodDepthPct: 50 }, hotspotId: 'reactor-vessel' },
  { time: 90, telemetryTargets: { thermalPowerMW: 3460, electricalPowerMW: 1185, hotLegTempC: 334, primaryPressureMPa: 15.54, ambientRadiationMicroSv: 0.40, turbineRpm: 1800, controlRodDepthPct: 60 }, hotspotId: null },
  { time: 96, telemetryTargets: { thermalPowerMW: 3450, electricalPowerMW: 1180, hotLegTempC: 328, primaryPressureMPa: 15.52, ambientRadiationMicroSv: 0.20, turbineRpm: 1800, controlRodDepthPct: 35 }, hotspotId: null },
  { time: 106, telemetryTargets: { thermalPowerMW: 3450, electricalPowerMW: 1180, hotLegTempC: 325.8, primaryPressureMPa: 15.51, ambientRadiationMicroSv: 0.12, turbineRpm: 1800, controlRodDepthPct: 28 }, hotspotId: null },
];

export default function App() {
  const [currentZone, setCurrentZone] = useState<ZoneId>('smr');
  const [renderMode, setRenderMode] = useState<RenderShaderMode>('pbr');
  const [handRigEnabled, setHandRigEnabled] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [isAuraOpen, setIsAuraOpen] = useState(false);
  const [isScramModalOpen, setIsScramModalOpen] = useState(false);
  const [caliperActive, setCaliperActive] = useState(false);
  const [isXRActive, setIsXRActive] = useState(false);
  const [navigationMode, setNavigationMode] = useState<DesktopNavigationMode>('orbit');
  const [presentationRunId, setPresentationRunId] = useState(0);

  const [selectedHotspot, setSelectedHotspot] = useState<Hotspot3D | null>(null);

  const [showLoading, setShowLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadProgress, setLoadProgress] = useState<{
    total: number;
    loaded: number;
    currentAsset: string;
    percentage: number;
    bytesLoaded: number;
    bytesTotal: number;
  } | null>(null);

  // Scene 1 lazy loading state
  const [scene1Assets, setScene1Assets] = useState<Scene1AssetHandles | null>(null);
  const [scene1Loading, setScene1Loading] = useState(false);
  const [scene1LoadError, setScene1LoadError] = useState<string | null>(null);
  const [scene1Progress, setScene1Progress] = useState<{
    total: number;
    loaded: number;
    currentAsset: string;
    percentage: number;
    bytesLoaded: number;
    bytesTotal: number;
  } | null>(null);
  const scene1LoadedRef = useRef(false);

  const [radiationMode] = useState<RadiationVisualizationMode>('none');
  const [hotspotScreenPositions, setHotspotScreenPositions] = useState<HotspotScreenPosition[]>([]);

  const presentationTargetRef = useRef<Partial<TelemetryState> | null>(null);
  const scriptTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  // Initialize asset manager
  useEffect(() => {
    const manager = initializeAssetManager();

    const unsubscribeProgress = manager.onProgress((progress) => {
      setLoadProgress(progress);
    });

    const unsubscribeComplete = manager.onComplete(() => {
      setShowLoading(false);
    });

    const unsubscribeError = manager.onError((error) => {
      console.error('Asset load error:', error);
      setLoadError(error.message);
    });

    // Load base assets: legacy nuclear_plant (base scene for ThreeNuclearScene)
    // and industrial_sunset HDR (environment for both legacy and Scene 1)
    manager.loadAssets(['nuclear_plant', 'industrial_sunset']).catch((err) => {
      setLoadError(err.message);
    });

    // Pre-load Scene 1 assets at startup since default zone is now a Scene 1 zone
    const loadScene1AtStartup = async () => {
      setScene1Loading(true);
      setScene1LoadError(null);
      setScene1Progress(null);
      try {
        console.info('[App] Loading Scene 1 manifest at startup...');
        await assetManager.loadManifest(SCENE1_ASSET_MANIFEST, SCENE1_ASSET_KEYS, (progress) => {
          setScene1Progress(progress);
        });
        console.info('[App] Scene 1 manifest loaded, creating composition...');
        const handles = await loadScene1Assets();
        setScene1Assets(handles);
        scene1LoadedRef.current = true;
        console.info('[App] Scene 1 composition ready at startup');
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        console.error('[App] Scene 1 startup load failed:', err);
        setScene1LoadError(message);
      } finally {
        setScene1Loading(false);
        setScene1Progress(null);
      }
    };

    loadScene1AtStartup();

    return () => {
      unsubscribeProgress();
      unsubscribeComplete();
      unsubscribeError();
    };
  }, []);

// Live Nuclear Physics & Telemetry State
  const [telemetry, setTelemetry] = useState<TelemetryState>({
    thermalPowerMW: 3450.0,
    nominalThermalTargetMW: 3450.0,
    electricalPowerMW: 1180.4,
    primaryPressureMPa: 15.51,
    hotLegTempC: 325.8,
    coldLegTempC: 291.2,
    boronPpm: 842.0,
    controlRodDepthPct: 28,
    turbineRpm: 1800,
    neutronFlux: 2.44,
    ambientRadiationMicroSv: 0.12,
    scramActive: false,
    operationalMode: 'normal',
  });

  // Dynamic Telemetry Update Cycle — smooth lerp during presentation, random jitter otherwise
  useEffect(() => {
    const interval = setInterval(() => {
      setTelemetry((prev) => {
        if (prev.scramActive) {
          const decayedThermal = Math.max(120.0, prev.thermalPowerMW * 0.92);
          return {
            ...prev,
            thermalPowerMW: decayedThermal,
            electricalPowerMW: Math.max(0.0, prev.electricalPowerMW * 0.88),
            primaryPressureMPa: Math.max(12.2, prev.primaryPressureMPa - 0.05),
            hotLegTempC: Math.max(180.0, prev.hotLegTempC - 0.8),
            ambientRadiationMicroSv: 0.08,
            controlRodDepthPct: 100,
            operationalMode: 'emergency',
          };
        }

        const target = presentationTargetRef.current;
        if (target) {
          const lerp = (current: number, desired: number, rate: number) =>
            current + (desired - current) * rate;
          return {
            ...prev,
            thermalPowerMW: target.thermalPowerMW !== undefined
              ? lerp(prev.thermalPowerMW, target.thermalPowerMW, 0.12) + (Math.random() - 0.5) * 1.0
              : prev.thermalPowerMW,
            electricalPowerMW: target.electricalPowerMW !== undefined
              ? lerp(prev.electricalPowerMW, target.electricalPowerMW, 0.12)
              : prev.electricalPowerMW,
            hotLegTempC: target.hotLegTempC !== undefined
              ? lerp(prev.hotLegTempC, target.hotLegTempC, 0.10)
              : prev.hotLegTempC,
            primaryPressureMPa: target.primaryPressureMPa !== undefined
              ? lerp(prev.primaryPressureMPa, target.primaryPressureMPa, 0.10)
              : prev.primaryPressureMPa,
            ambientRadiationMicroSv: target.ambientRadiationMicroSv !== undefined
              ? lerp(prev.ambientRadiationMicroSv, target.ambientRadiationMicroSv, 0.08)
              : prev.ambientRadiationMicroSv,
            turbineRpm: target.turbineRpm !== undefined
              ? lerp(prev.turbineRpm, target.turbineRpm, 0.10)
              : prev.turbineRpm,
            controlRodDepthPct: target.controlRodDepthPct !== undefined
              ? lerp(prev.controlRodDepthPct, target.controlRodDepthPct, 0.08)
              : prev.controlRodDepthPct,
          };
        }

        const powerFactor = (100 - prev.controlRodDepthPct) / 72;
        return {
          ...prev,
          thermalPowerMW: 3450.0 * powerFactor + (Math.random() - 0.5) * 4.0,
          electricalPowerMW: prev.thermalPowerMW * 0.3421,
          primaryPressureMPa: 15.51 + (Math.random() - 0.5) * 0.04,
          hotLegTempC: 325.8 + (Math.random() - 0.5) * 0.3,
          ambientRadiationMicroSv: 0.12 + Math.random() * 0.02,
          operationalMode: 'normal',
        };
      });
    }, 300);

    return () => clearInterval(interval);
  }, []);

  // Presentation script orchestrator — fires at each waypoint
  const startPresentationScript = useCallback(() => {
    scriptTimersRef.current.forEach(clearTimeout);
    scriptTimersRef.current = [];

    PRESENTATION_SCRIPT.forEach((step) => {
      const timer = setTimeout(() => {
        presentationTargetRef.current = step.telemetryTargets;
        spatialAudio.playAirTap();
      }, step.time * 1000);
      scriptTimersRef.current.push(timer);
    });

    const endTimer = setTimeout(() => {
      presentationTargetRef.current = null;
    }, (PRESENTATION_SCRIPT[PRESENTATION_SCRIPT.length - 1].time + 4) * 1000);
    scriptTimersRef.current.push(endTimer);
  }, []);

  // Start presentation when presentationRunId changes
  useEffect(() => {
    if (presentationRunId > 0) {
      startPresentationScript();
    }
    return () => {
      scriptTimersRef.current.forEach(clearTimeout);
      scriptTimersRef.current = [];
      presentationTargetRef.current = null;
    };
  }, [presentationRunId, startPresentationScript]);

  // Spatial Audio continuous generator hum
  useEffect(() => {
    spatialAudio.startContinuousHum();
    return () => spatialAudio.stopContinuousHum();
  }, []);

  const handleUpdateControlRodDepth = useCallback((depth: number) => {
    setTelemetry((prev) => ({ ...prev, controlRodDepthPct: depth }));
  }, []);

  const handleTriggerScram = useCallback(() => {
    setTelemetry((prev) => ({
      ...prev,
      scramActive: true,
      controlRodDepthPct: 100,
      operationalMode: 'emergency' as OperationalMode,
    }));
  }, []);

  const handleResetScram = useCallback(() => {
    setTelemetry((prev) => ({
      ...prev,
      scramActive: false,
      thermalPowerMW: 3450.0,
      electricalPowerMW: 1180.4,
      primaryPressureMPa: 15.51,
      hotLegTempC: 325.8,
      controlRodDepthPct: 28,
      operationalMode: 'normal' as OperationalMode,
    }));
  }, []);

  const handleToggleMute = useCallback(() => {
    const nextMute = !isMuted;
    setIsMuted(nextMute);
    spatialAudio.setMuted(nextMute);
  }, [isMuted]);

  const handleXRSessionStart = useCallback(() => {
    setIsXRActive(true);
    spatialAudio.playSuccessChime();
  }, []);

  const handleXRSessionEnd = useCallback(() => {
    setIsXRActive(false);
  }, []);

  const handleRetryLoad = useCallback(() => {
    setLoadError(null);
    setShowLoading(true);
    assetManager.loadAssets(['nuclear_plant', 'industrial_sunset']).catch((err) => {
      setLoadError(err.message);
    });
    // Also retry Scene 1 loading since default zone is Scene 1
    scene1LoadedRef.current = false;
    setScene1Assets(null);
    setScene1LoadError(null);
    const loadScene1 = async () => {
      setScene1Loading(true);
      setScene1Progress(null);
      try {
        await assetManager.loadManifest(SCENE1_ASSET_MANIFEST, SCENE1_ASSET_KEYS, (progress) => {
          setScene1Progress(progress);
        });
        const handles = await loadScene1Assets();
        setScene1Assets(handles);
        scene1LoadedRef.current = true;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        setScene1LoadError(message);
      } finally {
        setScene1Loading(false);
        setScene1Progress(null);
      }
    };
    loadScene1();
  }, []);

  const handleSelectHotspot = useCallback((hotspot: Hotspot3D) => {
    setSelectedHotspot(hotspot);
    setCurrentZone((zone) => zone === hotspot.zone ? zone : hotspot.zone);
  }, []);

  const handleHotspotScreenPositionsUpdate = useCallback((positions: {
    id: string; x: number; y: number; visible: boolean;
    label: string; code: string; category: string;
  }[]) => {
    setHotspotScreenPositions(positions);
  }, []);

  const handleStartPresentation = useCallback(() => {
    setPresentationRunId((runId) => runId + 1);
  }, []);

  const handlePresentationHotspot = useCallback((hotspotId: string | null) => {
    if (hotspotId) {
      const hotspot = HOTSPOTS_DATA.find(h => h.id === hotspotId);
      if (hotspot) setSelectedHotspot(hotspot);
    } else {
      setSelectedHotspot(null);
    }
  }, []);

  return (
    <div className={`app-shell text-slate-100 font-sans select-none ${isXRActive ? 'xr-session-active' : ''}`}>
      {showLoading && (
        <LoadingScreen
          progress={loadProgress}
          error={loadError || undefined}
          onRetry={handleRetryLoad}
        />
      )}

      {!showLoading && !loadError && (
        <div className="animate-fadeIn" style={{ width: '100%', height: '100%' }}>
          <ThreeNuclearScene
            currentZone={currentZone}
            onChangeZone={setCurrentZone}
            renderMode={renderMode}
            onChangeRenderMode={setRenderMode}
            navigationMode={navigationMode}
            presentationRunId={presentationRunId}
            controlRodDepthPct={telemetry.controlRodDepthPct}
            turbineRpm={telemetry.turbineRpm}
            scramActive={telemetry.scramActive}
            onSelectHotspot={handleSelectHotspot}
            selectedHotspotId={selectedHotspot ? selectedHotspot.id : null}
            onHotspotScreenPositionsUpdate={handleHotspotScreenPositionsUpdate}
            onXRSessionStart={handleXRSessionStart}
            onXRSessionEnd={handleXRSessionEnd}
            onPresentationHotspot={handlePresentationHotspot}
            radiationMode={radiationMode}
            scene1Assets={scene1Assets}
            scene1Loading={scene1Loading}
            scene1LoadError={scene1LoadError}
            scene1Progress={scene1Progress}
          />

          <HoloLensHandRig enabled={handRigEnabled} onCalibrate={() => spatialAudio.playSuccessChime()} />

          <SpatialHolographicHUD
            currentZone={currentZone}
            onChangeZone={setCurrentZone}
            renderMode={renderMode}
            onChangeRenderMode={setRenderMode}
            onUpdateControlRodDepth={handleUpdateControlRodDepth}
            handRigEnabled={handRigEnabled}
            onToggleHandRig={() => setHandRigEnabled(!handRigEnabled)}
            isMuted={isMuted}
            onToggleMute={handleToggleMute}
            selectedHotspot={selectedHotspot}
            onOpenAuraAI={() => setIsAuraOpen(!isAuraOpen)}
            isAuraOpen={isAuraOpen}
            onOpenScramModal={() => setIsScramModalOpen(!isScramModalOpen)}
            isScramModalOpen={isScramModalOpen}
            caliperActive={caliperActive}
            onToggleCaliper={() => setCaliperActive(!caliperActive)}
            navigationMode={navigationMode}
            onChangeNavigationMode={setNavigationMode}
            onStartPresentation={handleStartPresentation}
            radiationMode={radiationMode}
            hotspotScreenPositions={hotspotScreenPositions}
            onSelectHotspot={handleSelectHotspot}
          />

          {isAuraOpen && (
            <div className="app-floating-panel app-floating-aura">
              <AuraAIAssistant
                currentZone={currentZone}
                zoneNarrative={AI_ZONE_NARRATIVES[currentZone] || AI_ZONE_NARRATIVES.overview}
              />
            </div>
          )}

          {isScramModalOpen && (
            <ScramEmergencyModal
              scramActive={telemetry.scramActive}
              onTriggerScram={handleTriggerScram}
              onResetScram={handleResetScram}
              thermalPowerMW={telemetry.thermalPowerMW}
            />
          )}
        </div>
      )}
    </div>
  );
}
