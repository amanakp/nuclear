import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { ThreeNuclearScene } from './components/ThreeNuclearScene';
import { SpatialHolographicHUD } from './components/SpatialHolographicHUD';
import { HoloLensHandRig } from './components/HoloLensHandRig';
import { AuraAIAssistant } from './components/AuraAIAssistant';
import { ScramEmergencyModal } from './components/ScramEmergencyModal';
import { LoadingScreen } from './components/LoadingScreen';
import { assetManager, initializeAssetManager } from './assets/AssetManager';
import { ZoneId, RenderShaderMode, TelemetryState, Hotspot3D, OperationalMode, Alert, RadiationVisualizationMode, HotspotScreenPosition } from './types/nuclear';
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
  const [currentZone, setCurrentZone] = useState<ZoneId>('overview');
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

    manager.loadAll().catch((err) => {
      setLoadError(err.message);
    });

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

  // Dynamic Alerts from telemetry state
  const alerts: Alert[] = useMemo(() => {
    const results: Alert[] = [];
    const now = Date.now();

    if (telemetry.scramActive) {
      results.push({
        id: `alert-scram-${now}`,
        type: 'critical',
        title: 'SCRAM Initiated',
        message: 'Emergency reactor shutdown in progress. All control rods fully inserted.',
        timestamp: now,
        hotspotId: 'reactor-vessel',
        acknowledged: false,
      });
    }

    if (telemetry.hotLegTempC > 340) {
      results.push({
        id: `alert-temp-critical-${now}`,
        type: 'critical',
        title: 'Critical Core Temperature',
        message: `Hot leg at ${telemetry.hotLegTempC.toFixed(1)}°C — immediate action required.`,
        timestamp: now,
        hotspotId: 'reactor-vessel',
        acknowledged: false,
      });
    } else if (telemetry.hotLegTempC > 335) {
      results.push({
        id: `alert-temp-${now}`,
        type: 'warning',
        title: 'Core Temperature Elevated',
        message: `Hot leg temperature at ${telemetry.hotLegTempC.toFixed(1)}°C, approaching limit.`,
        timestamp: now,
        hotspotId: 'reactor-vessel',
        acknowledged: false,
      });
    }

    if (telemetry.ambientRadiationMicroSv > 0.6) {
      results.push({
        id: `alert-rad-critical-${now}`,
        type: 'critical',
        title: 'High Radiation Alert',
        message: `Radiation at ${telemetry.ambientRadiationMicroSv.toFixed(2)} µSv/h — containment may be compromised.`,
        timestamp: now,
        hotspotId: 'reactor-vessel',
        acknowledged: false,
      });
    } else if (telemetry.ambientRadiationMicroSv > 0.5) {
      results.push({
        id: `alert-rad-${now}`,
        type: 'warning',
        title: 'Radiation Increased',
        message: `Ambient radiation at ${telemetry.ambientRadiationMicroSv.toFixed(2)} µSv/h.`,
        timestamp: now,
        hotspotId: 'reactor-vessel',
        acknowledged: false,
      });
    }

    if (telemetry.controlRodDepthPct > 75 && !telemetry.scramActive) {
      results.push({
        id: `alert-rods-${now}`,
        type: 'warning',
        title: 'Control Rod Deep Insertion',
        message: `Rods at ${telemetry.controlRodDepthPct}% — power output affected.`,
        timestamp: now,
        hotspotId: 'reactor-vessel',
        acknowledged: false,
      });
    }

    if (telemetry.operationalMode === 'emergency') {
      if (!results.some(a => a.type === 'critical')) {
        results.push({
          id: `alert-emergency-${now}`,
          type: 'critical',
          title: 'Emergency Mode Active',
          message: 'Plant operating in emergency mode. Automated safety systems engaged.',
          timestamp: now,
          acknowledged: false,
        });
      }
    }

    if (results.length === 0) {
      results.push({
        id: `alert-nominal-${now}`,
        type: 'maintenance',
        title: 'All Systems Nominal',
        message: 'All plant systems operating within normal parameters.',
        timestamp: now,
        acknowledged: false,
        autoDismiss: true,
      });
    }

    return results.slice(0, 5);
  }, [telemetry]);

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
    assetManager.loadAll().catch((err) => {
      setLoadError(err.message);
    });
  }, []);

  const handleSelectHotspot = useCallback((hotspot: Hotspot3D) => {
    setSelectedHotspot(hotspot);
    setCurrentZone((zone) => zone === hotspot.zone ? zone : hotspot.zone);
  }, []);

  const handleCloseHotspot = useCallback(() => {
    setSelectedHotspot(null);
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
          />

          <HoloLensHandRig enabled={handRigEnabled} onCalibrate={() => spatialAudio.playSuccessChime()} />

          <SpatialHolographicHUD
            currentZone={currentZone}
            onChangeZone={setCurrentZone}
            renderMode={renderMode}
            onChangeRenderMode={setRenderMode}
            telemetry={telemetry}
            onUpdateControlRodDepth={handleUpdateControlRodDepth}
            handRigEnabled={handRigEnabled}
            onToggleHandRig={() => setHandRigEnabled(!handRigEnabled)}
            isMuted={isMuted}
            onToggleMute={handleToggleMute}
            selectedHotspot={selectedHotspot}
            onCloseHotspotModal={handleCloseHotspot}
            onOpenAuraAI={() => setIsAuraOpen(!isAuraOpen)}
            isAuraOpen={isAuraOpen}
            onOpenScramModal={() => setIsScramModalOpen(!isScramModalOpen)}
            isScramModalOpen={isScramModalOpen}
            caliperActive={caliperActive}
            onToggleCaliper={() => setCaliperActive(!caliperActive)}
            navigationMode={navigationMode}
            onChangeNavigationMode={setNavigationMode}
            onStartPresentation={handleStartPresentation}
            alerts={alerts}
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
