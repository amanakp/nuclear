import { useState, useEffect, useRef, useCallback } from 'react';
import * as THREE from 'three';
import { assetManager, LoadProgress } from '../assets/AssetManager';
import { CinematicSceneId, CinematicSceneConfig, CinematicContext } from './CinematicExperienceTypes';
import { SCENE1_ASSET_MANIFEST } from '../data/scene1Manifest';
import { loadScene1Assets } from '../scene/Scene1Composition';

const requireNavigation = (ctx: CinematicContext) => {
  const navigation = ctx.navigationSystem;
  if (!navigation) {
    throw new Error(
      '[CinematicExperience] navigationSystem is not wired. ' +
        'ThreeNuclearScene must publish it via onNavigationReady before any scene onEnter runs.',
    );
  }
  return navigation;
};

const CINEMATIC_SCENES: Record<CinematicSceneId, CinematicSceneConfig> = {
  initialization: {
    id: 'initialization',
    title: 'INITIALIZATION',
    narration: 'Welcome to the NUCLEUS VR Exhibition. Initializing Bangkok Green City experience...',
    requiredAssets: [],
    environment: { lighting: 'dawn' },
    visibleGroups: [],
    transition: { type: 'fade', duration: 3000, nextScene: 'bangkok_today' },
    onEnter: (_ctx) => {
      // Environment is already loaded by App.tsx before ThreeNuclearScene mounts.
      // Do NOT call loadAssets here — it would reset the singleton counters,
      // create a competing load, and cause the "1/1 assets" stuck loading screen.
    },
    interaction: { type: 'auto', onComplete: () => {} },
  },
  bangkok_today: {
    id: 'bangkok_today',
    title: 'BANGKOK TODAY',
    narration: 'Bangkok. A city of 11 million people. Growing. Demanding. Energy-hungry.',
    requiredAssets: ['city_main_skyscraper', 'facilities_ground_pavement', 'facilities_landscaping_trees', 'facilities_base_road', 'facilities_electric_pole', 'facilities_electric_wire', 'facilities_electric_generator'],
    cameraPreset: { position: new THREE.Vector3(330, 115, 330), target: new THREE.Vector3(28, 65, -185), fov: 38 },
    environment: { lighting: 'day', effects: ['city_lights', 'traffic'] },
    visibleGroups: ['city', 'facilities'],
    interaction: { type: 'auto', onComplete: () => {} },
    transition: { type: 'fly', duration: 5000, nextScene: 'energy_pressure' },
    onEnter: async (ctx) => {
      ctx.setLoading(true);
      try {
        await ctx.assetManager.loadManifest(SCENE1_ASSET_MANIFEST, CINEMATIC_SCENES.bangkok_today.requiredAssets, (p: LoadProgress) => ctx.setLoading(true, p));
        if (!ctx.scene1Assets) {
          ctx.scene1Assets = await loadScene1Assets();
        }
      } finally {
        ctx.setLoading(false);
      }
    },
  },
  energy_pressure: {
    id: 'energy_pressure',
    title: 'ENERGY PRESSURE',
    narration: 'Every day, the demand grows. The grid strains. The city needs a new source.',
    requiredAssets: [],
    cameraPreset: { position: new THREE.Vector3(330, 115, 330), target: new THREE.Vector3(28, 65, -185), fov: 38 },
    environment: { lighting: 'storm', effects: ['grid_strain', 'pulse_red', 'flicker_lights'] },
    visibleGroups: ['city', 'facilities'],
    interaction: { type: 'auto', onComplete: () => {} },
    transition: { type: 'fly', duration: 8000, nextScene: 'journey_to_source' },
    onEnter: async (ctx) => {
      requireNavigation(ctx).transitionToPreset({
        position: new THREE.Vector3(330, 115, 330),
        target: new THREE.Vector3(28, 65, -185),
        fov: 38,
      });
    },
    onUpdate: (delta, ctx) => {
      if (ctx.enterpriseRig) {
        ctx.enterpriseRig.update(Date.now() / 1000, delta, 'city', false);
      }
    },
  },
  journey_to_source: {
    id: 'journey_to_source',
    title: 'JOURNEY TO THE SOURCE',
    narration: 'Follow the energy pathway. From the city, to the coast, to the source.',
    requiredAssets: ['facilities_pipeline', 'facilities_electric_wire', 'smr_pipe_loop_segment'],
    cameraPreset: { position: new THREE.Vector3(10, 75, 30), target: new THREE.Vector3(-40, 8, -250), fov: 42 },
    environment: { lighting: 'dusk', effects: ['energy_pathway', 'animated_particles'] },
    visibleGroups: ['city', 'facilities', 'smr'],
    interaction: { type: 'auto', onComplete: () => {} },
    transition: { type: 'fly', duration: 10000, nextScene: 'smr_arrival' },
    onEnter: async (ctx) => {
      await ctx.assetManager.loadManifest(SCENE1_ASSET_MANIFEST, CINEMATIC_SCENES.journey_to_source.requiredAssets);
      ctx.scene1Assets = await loadScene1Assets();
      requireNavigation(ctx).transitionToPreset({
        position: new THREE.Vector3(10, 75, 30),
        target: new THREE.Vector3(-40, 8, -250),
        fov: 42,
      });
    },
  },
  smr_arrival: {
    id: 'smr_arrival',
    title: 'ARRIVAL AT SMR FACILITY',
    narration: 'The NUWARD SMR. Compact. Safe. Factory-built. Clean baseload power.',
    requiredAssets: [
      'smr_containment_dome', 'smr_center_building', 'smr_central_unit_block',
      'smr_turbine_building', 'smr_exhaust_stack', 'smr_central_substation',
      'smr_perimeter_wall', 'smr_mechanical_pumps', 'smr_steam_tower',
      'smr_nuclear_reactor', 'smr_nuclear_reactor_container', 'smr_turbine',
      'smr_turbine_generator', 'smr_steam_tower', 'smr_steam_tower_base',
      'smr_rooftop_hvac', 'smr_solar_panel_array', 'smr_pipe_loop_segment',
    ],
    cameraPreset: { position: new THREE.Vector3(-120, 40, -110), target: new THREE.Vector3(-120, 6, -250), fov: 40 },
    environment: { lighting: 'dawn', effects: ['facility_reveal', 'steam_plume', 'solar_glint'] },
    visibleGroups: ['smr', 'facilities'],
    interaction: { type: 'click', target: 'activation_point', onComplete: () => {} },
    transition: { type: 'fade', duration: 2000, nextScene: 'activation' },
    onEnter: async (ctx) => {
      await ctx.assetManager.loadManifest(SCENE1_ASSET_MANIFEST, CINEMATIC_SCENES.smr_arrival.requiredAssets);
      ctx.scene1Assets = await loadScene1Assets();
      requireNavigation(ctx).transitionToPreset({
        position: new THREE.Vector3(-120, 40, -110),
        target: new THREE.Vector3(-120, 6, -250),
        fov: 40,
      });
    },
  },
  activation: {
    id: 'activation',
    title: 'ACTIVATION',
    narration: 'Initiate startup sequence. Reactor. Turbine. Generator. Grid.',
    requiredAssets: [],
    cameraPreset: { position: new THREE.Vector3(-120, 40, -110), target: new THREE.Vector3(-120, 6, -250), fov: 40 },
    environment: { lighting: 'green', effects: ['startup_sequence', 'energy_flow', 'grid_sync'] },
    visibleGroups: ['smr', 'facilities'],
    interaction: { type: 'click', target: 'activation_control', onComplete: () => {} },
    transition: { type: 'fade', duration: 3000, nextScene: 'enter_smr' },
    onEnter: async (ctx) => {
      requireNavigation(ctx).transitionToPreset({
        position: new THREE.Vector3(-120, 40, -110),
        target: new THREE.Vector3(-120, 6, -250),
        fov: 40,
      });
    },
    onUpdate: (delta, ctx) => {
      if (ctx.enterpriseRig) {
        ctx.enterpriseRig.update(Date.now() / 1000, delta, 'smr', false);
      }
    },
  },
  enter_smr: {
    id: 'enter_smr',
    title: 'ENTER THE SMR',
    narration: 'Step inside. See how clean energy is born.',
    requiredAssets: ['smr_nuclear_reactor', 'smr_nuclear_reactor_container', 'smr_turbine', 'smr_turbine_generator', 'smr_steam_tower'],
    cameraPreset: { position: new THREE.Vector3(-120, 15, -250), target: new THREE.Vector3(-120, 6, -250), fov: 48 },
    environment: { lighting: 'green', effects: ['interior_transition', 'reactor_glow'] },
    visibleGroups: ['smr'],
    interaction: { type: 'auto', onComplete: () => {} },
    transition: { type: 'fade', duration: 4000, nextScene: 'inside_smr' },
    onEnter: async (ctx) => {
      requireNavigation(ctx).transitionToPreset({
        position: new THREE.Vector3(-120, 15, -250),
        target: new THREE.Vector3(-120, 6, -250),
        fov: 48,
      });
    },
  },
  inside_smr: {
    id: 'inside_smr',
    title: 'INSIDE THE SMR',
    narration: 'Reactor core. Primary coolant. Steam generator. Turbine. Generator. Clean electricity.',
    requiredAssets: [],
    cameraPreset: { position: new THREE.Vector3(-124, 12, -252), target: new THREE.Vector3(-130, 10.5, -250), fov: 48 },
    environment: { lighting: 'green', effects: ['core_pulse', 'coolant_flow', 'steam_animation', 'turbine_spin'] },
    visibleGroups: ['smr'],
    interaction: { type: 'auto', onComplete: () => {} },
    transition: { type: 'fade', duration: 3000, nextScene: 'energy_door' },
    onEnter: async (ctx) => {
      requireNavigation(ctx).transitionToPreset({
        position: new THREE.Vector3(-124, 12, -252),
        target: new THREE.Vector3(-130, 10.5, -250),
        fov: 48,
      });
    },
    onUpdate: (delta, ctx) => {
      if (ctx.enterpriseRig) {
        ctx.enterpriseRig.update(Date.now() / 1000, delta, 'smr', false);
      }
    },
  },
  energy_door: {
    id: 'energy_door',
    title: 'THE ENERGY DOOR',
    narration: 'Clean energy flows back. From source to city. The circuit completes.',
    requiredAssets: ['facilities_electric_wire', 'facilities_pipeline', 'smr_pipe_loop_segment'],
    cameraPreset: { position: new THREE.Vector3(-60, 45, -560), target: new THREE.Vector3(-80, 3, -320), fov: 44 },
    environment: { lighting: 'dawn', effects: ['energy_beam', 'particle_flow', 'portal_transition'] },
    visibleGroups: ['smr', 'facilities', 'city'],
    interaction: { type: 'auto', onComplete: () => {} },
    transition: { type: 'fly', duration: 8000, nextScene: 'bangkok_tomorrow' },
    onEnter: async (ctx) => {
      requireNavigation(ctx).transitionToPreset({
        position: new THREE.Vector3(-60, 45, -560),
        target: new THREE.Vector3(-80, 3, -320),
        fov: 44,
      });
    },
  },
  bangkok_tomorrow: {
    id: 'bangkok_tomorrow',
    title: 'BANGKOK TOMORROW',
    narration: 'Clean energy. Smart mobility. Connected homes. Healthy community. Sustainable industry. This is the future.',
    requiredAssets: ['city_main_skyscraper', 'facilities_ground_pavement', 'facilities_landscaping_trees', 'facilities_solar_panel_array', 'smr_solar_panel_array'],
    cameraPreset: { position: new THREE.Vector3(330, 115, 330), target: new THREE.Vector3(28, 65, -185), fov: 38 },
    environment: { lighting: 'green', effects: ['green_city', 'ev_charging', 'solar_rooftops', 'canal_ferries', 'urban_parks'] },
    visibleGroups: ['city', 'facilities', 'smr'],
    interaction: { type: 'auto', onComplete: () => {} },
    onEnter: async (ctx) => {
      requireNavigation(ctx).transitionToPreset({
        position: new THREE.Vector3(330, 115, 330),
        target: new THREE.Vector3(28, 65, -185),
        fov: 38,
      });
    },
  },
};

export function useCinematicExperience() {
  const [currentSceneId, setCurrentSceneId] = useState<CinematicSceneId>('initialization');
  const [isLoading, setIsLoading] = useState(false);
  const [loadProgress, setLoadProgress] = useState<LoadProgress | null>(null);
  const [uiState, setUiState] = useState<{
    sceneTitle?: string;
    narration?: string;
    instruction?: string;
    progress?: LoadProgress | null;
    showSkip?: boolean;
    onSkip?: () => void;
  }>({});
  const [scene1Assets, setScene1Assets] = useState<any>(null);

  const contextRef = useRef<CinematicContext>({
    currentScene: 'initialization',
    previousScene: null,
    sceneStartTime: Date.now(),
    renderer: null,
    scene: null,
    camera: null,
    controls: null,
    navigationSystem: null,
    assetManager,
    scene1Assets: null,
    enterpriseRig: null,
    hotspotManager: null,
    setCurrentScene: (s) => {
      setCurrentSceneId(s);
      contextRef.current.currentScene = s;
      contextRef.current.sceneStartTime = Date.now();
    },
    setLoading: (loading, progress) => {
      setIsLoading(loading);
      if (progress) setLoadProgress(progress);
    },
    showUI: (ui) => setUiState(ui),
    hideUI: () => setUiState({}),
  });

  const currentScene = CINEMATIC_SCENES[currentSceneId];
  const isLastScene = currentSceneId === 'bangkok_tomorrow';

  const advanceScene = useCallback(() => {
    if (currentScene?.transition?.nextScene) {
      contextRef.current.setCurrentScene(currentScene.transition.nextScene);
    }
  }, [currentScene]);

  const skipScene = useCallback(() => {
    advanceScene();
  }, [advanceScene]);

  useEffect(() => {
    const scene = CINEMATIC_SCENES[currentSceneId];
    if (!scene) return;

    setUiState({
      sceneTitle: scene.title,
      narration: scene.narration,
      instruction: scene.interaction?.type === 'click' ? 'Click to continue' : undefined,
      progress: isLoading ? loadProgress : null,
      showSkip: !isLastScene,
      onSkip: skipScene,
    });

    const runOnEnter = async () => {
      if (scene.onEnter) {
        await scene.onEnter(contextRef.current);
      }
      if (contextRef.current.scene1Assets) {
        setScene1Assets(contextRef.current.scene1Assets);
      }
    };

    runOnEnter().catch((err: Error) => {
      console.error(`Scene ${currentSceneId} onEnter error:`, err);
    });

    if (scene.transition?.nextScene && scene.interaction?.type === 'auto') {
      const timer = setTimeout(() => {
        advanceScene();
      }, scene.transition.duration);
      return () => clearTimeout(timer);
    }

    return () => {
      if (scene.onExit) {
        scene.onExit(contextRef.current);
      }
    };
  }, [currentSceneId, isLastScene, advanceScene]);

  useEffect(() => {
    setUiState(prev => ({
      ...prev,
      progress: isLoading ? loadProgress : null,
    }));
  }, [isLoading, loadProgress]);

  useEffect(() => {
    if (!currentScene) return;

    const interval = setInterval(() => {
      if (currentScene.onUpdate) {
        currentScene.onUpdate(1/60, contextRef.current);
      }
    }, 1000/60);

    return () => clearInterval(interval);
  }, [currentSceneId]);

  return {
    currentSceneId,
    isLoading,
    loadProgress,
    uiState,
    scene1Assets,
    currentVisibleGroups: currentScene?.visibleGroups ?? [],
    advanceScene,
    skipScene,
    context: contextRef.current,
    setScene1Assets,
    setRenderer: (r: any) => { contextRef.current.renderer = r; },
    setThreeScene: (s: any) => { contextRef.current.scene = s; },
    setCamera: (c: any) => { contextRef.current.camera = c; },
    setControls: (c: any) => { contextRef.current.controls = c; },
    setNavigationSystem: (n: any) => { contextRef.current.navigationSystem = n; },
    setEnterpriseRig: (e: any) => { contextRef.current.enterpriseRig = e; },
    setHotspotManager: (h: any) => { contextRef.current.hotspotManager = h; },
  };
}

export { CINEMATIC_SCENES };