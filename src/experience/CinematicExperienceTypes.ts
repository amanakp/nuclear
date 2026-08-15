import * as THREE from 'three';
import { LoadProgress } from '../assets/AssetManager';

export type CinematicSceneId =
  | 'initialization'
  | 'bangkok_today'
  | 'energy_pressure'
  | 'journey_to_source'
  | 'smr_arrival'
  | 'activation'
  | 'enter_smr'
  | 'inside_smr'
  | 'energy_door'
  | 'bangkok_tomorrow';

export interface CinematicSceneConfig {
  id: CinematicSceneId;
  title: string;
  narration?: string;
  requiredAssets: string[];
  cameraPreset?: {
    position: THREE.Vector3;
    target: THREE.Vector3;
    fov?: number;
  };
  environment?: {
    skybox?: string;
    lighting?: 'dawn' | 'day' | 'dusk' | 'night' | 'storm' | 'green';
    effects?: string[];
  };
  visibleGroups: string[];
  interaction?: {
    type: 'auto' | 'click' | 'gaze' | 'approach';
    target?: string;
    onComplete: () => void;
  };
  transition?: {
    type: 'cut' | 'fly' | 'fade' | 'portal';
    duration: number;
    nextScene: CinematicSceneId;
  };
  onEnter?: (context: CinematicContext) => Promise<void> | void;
  onExit?: (context: CinematicContext) => Promise<void> | void;
  onUpdate?: (deltaTime: number, context: CinematicContext) => void;
}

export interface CinematicContext {
  currentScene: CinematicSceneId;
  previousScene: CinematicSceneId | null;
  sceneStartTime: number;
  renderer: THREE.WebGLRenderer | null;
  scene: THREE.Scene | null;
  camera: THREE.PerspectiveCamera | null;
  controls: any;
  navigationSystem: any;
  assetManager: any;
  scene1Assets: any;
  enterpriseRig: any;
  hotspotManager: any;
  setCurrentScene: (scene: CinematicSceneId) => void;
  setLoading: (loading: boolean, progress?: LoadProgress) => void;
  showUI: (ui: CinematicUIState) => void;
  hideUI: () => void;
}

export interface CinematicUIState {
  sceneTitle?: string;
  narration?: string;
  instruction?: string;
  progress?: LoadProgress | null;
  showSkip?: boolean;
  onSkip?: () => void;
}

export interface StagedLoadPlan {
  scene: CinematicSceneId;
  assets: string[];
  priority: 'immediate' | 'next' | 'later';
}

export interface Scene1AssetHandles {
  smr: THREE.Group;
  city: THREE.Group;
  facilities: THREE.Group;
  dispose: () => void;
}