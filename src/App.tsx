import { useState, useEffect, useCallback } from 'react';
import { useCinematicExperience } from './experience/CinematicExperienceOrchestrator';
import { CinematicUI } from './experience/CinematicUI';
import { CinematicUICSS } from './experience/CinematicUI';
import { ThreeNuclearScene } from './components/ThreeNuclearScene';
import { HoloLensHandRig } from './components/HoloLensHandRig';
import { AuraAIAssistant } from './components/AuraAIAssistant';
import { ScramEmergencyModal } from './components/ScramEmergencyModal';
import { LoadingScreen } from './components/LoadingScreen';
import { assetManager, initializeAssetManager } from './assets/AssetManager';
import { ZoneId, RenderShaderMode, TelemetryState, Hotspot3D, OperationalMode, RadiationVisualizationMode } from './types/nuclear';
import { AI_ZONE_NARRATIVES } from './data/nuclearData';
import { spatialAudio } from './audio/spatialAudio';
import { DesktopNavigationMode } from './scene/CinematicNavigationSystem';

export default function App() {
const {
    isLoading,
    loadProgress: cinematicLoadProgress,
    uiState,
    scene1Assets,
    currentVisibleGroups,
  } = useCinematicExperience();

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

  const [renderMode, setRenderMode] = useState<RenderShaderMode>('pbr');
  const [handRigEnabled] = useState(true);
  const [isAuraOpen] = useState(false);
  const [isScramModalOpen] = useState(false);
  const [isXRActive, setIsXRActive] = useState(false);
  const [navigationMode] = useState<DesktopNavigationMode>('orbit');

  const [selectedHotspot, setSelectedHotspot] = useState<Hotspot3D | null>(null);
  const [radiationMode] = useState<RadiationVisualizationMode>('none');

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

    manager.loadAssets(['nuclear_plant', 'industrial_sunset']).catch((err) => {
      setLoadError(err.message);
    });

    return () => {
      unsubscribeProgress();
      unsubscribeComplete();
      unsubscribeError();
    };
  }, []);

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
        return {
          ...prev,
          thermalPowerMW: 3450.0 * ((100 - prev.controlRodDepthPct) / 72) + (Math.random() - 0.5) * 4.0,
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

  useEffect(() => {
    spatialAudio.startContinuousHum();
    return () => spatialAudio.stopContinuousHum();
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

  const handleRetryLoad = useCallback(() => {
    setLoadError(null);
    setShowLoading(true);
    assetManager.loadAssets(['nuclear_plant', 'industrial_sunset']).catch((err) => {
      setLoadError(err.message);
    });
  }, []);

  const handleSelectHotspot = useCallback((hotspot: Hotspot3D) => {
    setSelectedHotspot(hotspot);
  }, []);

  const handleHotspotScreenPositionsUpdate = useCallback(() => {}, []);

  const handleXRSessionStart = useCallback(() => {
    setIsXRActive(true);
    spatialAudio.playSuccessChime();
  }, []);

  const handleXRSessionEnd = useCallback(() => {
    setIsXRActive(false);
  }, []);

  const handleTriggerScram = useCallback(() => {
    setTelemetry((prev) => ({
      ...prev,
      scramActive: true,
      controlRodDepthPct: 100,
      operationalMode: 'emergency' as OperationalMode,
    }));
  }, []);

  const currentZone = 'smr';

  const displayProgress = isLoading ? loadProgress : cinematicLoadProgress;

  return (
    <div className={`app-shell text-slate-100 font-sans select-none ${isXRActive ? 'xr-session-active' : ''}`}>
      <style dangerouslySetInnerHTML={{ __html: CinematicUICSS }} />

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
            currentZone={currentZone as ZoneId}
            onChangeZone={() => {}}
            renderMode={renderMode}
            onChangeRenderMode={setRenderMode}
            navigationMode={navigationMode}
            presentationRunId={0}
            controlRodDepthPct={telemetry.controlRodDepthPct}
            turbineRpm={telemetry.turbineRpm}
            scramActive={telemetry.scramActive}
            onSelectHotspot={handleSelectHotspot}
            selectedHotspotId={selectedHotspot ? selectedHotspot.id : null}
            onHotspotScreenPositionsUpdate={handleHotspotScreenPositionsUpdate}
            onXRSessionStart={handleXRSessionStart}
            onXRSessionEnd={handleXRSessionEnd}
            onPresentationHotspot={() => {}}
            radiationMode={radiationMode}
            scene1Assets={scene1Assets}
            scene1Loading={false}
            scene1LoadError={null}
            scene1Progress={displayProgress}
            scene1VisibleGroups={currentVisibleGroups}
          />

          <HoloLensHandRig enabled={handRigEnabled} onCalibrate={() => spatialAudio.playSuccessChime()} />

          <CinematicUI
            sceneTitle={uiState.sceneTitle}
            narration={uiState.narration}
            instruction={uiState.instruction}
            progress={displayProgress}
            showSkip={uiState.showSkip}
            onSkip={uiState.onSkip}
            isLoading={isLoading}
          />

          {isAuraOpen && (
            <div className="app-floating-panel app-floating-aura">
              <AuraAIAssistant
                currentZone="smr"
                zoneNarrative={AI_ZONE_NARRATIVES.smr || AI_ZONE_NARRATIVES.overview}
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