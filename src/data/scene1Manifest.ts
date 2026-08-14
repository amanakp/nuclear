import { AssetManifest } from '../assets/AssetManager';

export const SCENE1_ASSET_MANIFEST: AssetManifest = {
  models: {
    // --- SMR Campus Components (Nuward SMR) ---
    smr_containment_dome: {
      path: '/scene1/models/scene1/SMR/SMR_ContainmentDome_LOD0.glb',
      type: 'model',
      priority: 'critical',
      metadata: { description: 'SMR containment dome - campus heart', category: 'smr', role: 'containment' },
    },
    smr_center_building: {
      path: '/scene1/models/scene1/SMR/SMR_CenterBuilding_LOD0.glb',
      type: 'model',
      priority: 'critical',
      metadata: { description: 'SMR central auxiliary/control building', category: 'smr', role: 'auxiliary' },
    },
    smr_rooftop_hvac: {
      path: '/scene1/models/scene1/SMR/SMR_RooftopHVAC_LOD0.glb',
      type: 'model',
      priority: 'high',
      metadata: { description: 'SMR rooftop HVAC units on auxiliary building', category: 'smr', role: 'hvac' },
    },
    smr_central_unit_block: {
      path: '/scene1/models/scene1/SMR/SMR_CentralUnitBlock_LOD0.glb',
      type: 'model',
      priority: 'critical',
      metadata: { description: 'SMR central unit/reactor annex building', category: 'smr', role: 'reactor_annex' },
    },
    smr_turbine_building: {
      path: '/scene1/models/scene1/SMR/SMR_TurbineBuilding_LOD0.glb',
      type: 'model',
      priority: 'critical',
      metadata: { description: 'SMR turbine building - power island', category: 'smr', role: 'turbine_hall' },
    },
    smr_exhaust_stack: {
      path: '/scene1/models/scene1/SMR/SMR_ExhaustStack_LOD0.glb',
      type: 'model',
      priority: 'critical',
      metadata: { description: 'SMR exhaust stack - vertical landmark', category: 'smr', role: 'stack' },
    },
    smr_central_substation: {
      path: '/scene1/models/scene1/SMR/SMR_CentralSubstation_LOD0.glb',
      type: 'model',
      priority: 'critical',
      metadata: { description: 'SMR electrical substation/switchyard - power export', category: 'smr', role: 'substation' },
    },
    smr_perimeter_wall: {
      path: '/scene1/models/scene1/SMR/SMR_PerimeterWall_LOD0.glb',
      type: 'model',
      priority: 'high',
      metadata: { description: 'SMR perimeter/security wall (used for sea and land sides)', category: 'smr', role: 'wall' },
    },
    smr_mechanical_pumps: {
      path: '/scene1/models/scene1/SMR/SMR_MechanicalPumps_LOD0.glb',
      type: 'model',
      priority: 'high',
      metadata: { description: 'SMR mechanical pump/intake skids for cooling system', category: 'smr', role: 'pumps' },
    },
    smr_pipe_loop_segment: {
      path: '/scene1/models/scene1/SMR/SMR_PipeLoopSegment_LOD0.glb',
      type: 'model',
      priority: 'high',
      metadata: { description: 'SMR seawater intake pipe segment', category: 'smr', role: 'intake_pipe' },
    },
    smr_solar_panel_array: {
      path: '/scene1/models/scene1/SMR/SMR_SolarPanelArray_LOD0.glb',
      type: 'model',
      priority: 'normal',
      metadata: { description: 'SMR campus solar panel array', category: 'smr', role: 'solar' },
    },
    // --- FBX-derived SMR Components (Nuward SMR) ---
    smr_nuclear_reactor: {
      path: '/scene1/models/scene1/SMR/NuclearReactor_LOD0.glb',
      type: 'model',
      priority: 'critical',
      metadata: { description: 'Nuclear reactor core from FBX', category: 'smr', role: 'reactor_core' },
    },
    smr_nuclear_reactor_container: {
      path: '/scene1/models/scene1/SMR/NuclearReactorContainer_LOD0.glb',
      type: 'model',
      priority: 'critical',
      metadata: { description: 'Nuclear reactor containment from FBX', category: 'smr', role: 'containment' },
    },
    smr_steam_tower: {
      path: '/scene1/models/scene1/SMR/SteamTower_LOD0.glb',
      type: 'model',
      priority: 'high',
      metadata: { description: 'Steam cooling tower from FBX', category: 'smr', role: 'steam_tower' },
    },
    smr_steam_tower_base: {
      path: '/scene1/models/scene1/SMR/SteamTowerBase_LOD0.glb',
      type: 'model',
      priority: 'high',
      metadata: { description: 'Steam cooling tower base from FBX', category: 'smr', role: 'steam_tower_base' },
    },
    smr_turbine: {
      path: '/scene1/models/scene1/SMR/Turbine_LOD0.glb',
      type: 'model',
      priority: 'critical',
      metadata: { description: 'Turbine machinery from FBX', category: 'smr', role: 'turbine' },
    },
    smr_turbine_building_fbx: {
      path: '/scene1/models/scene1/SMR/TurbineBuilding_LOD0.glb',
      type: 'model',
      priority: 'critical',
      metadata: { description: 'Turbine building from FBX', category: 'smr', role: 'turbine_building' },
    },
    smr_turbine_container: {
      path: '/scene1/models/scene1/SMR/TurbineContainer_LOD0.glb',
      type: 'model',
      priority: 'high',
      metadata: { description: 'Turbine container from FBX', category: 'smr', role: 'turbine_container' },
    },
    smr_turbine_container_floor: {
      path: '/scene1/models/scene1/SMR/TurbineContainerFloor_LOD0.glb',
      type: 'model',
      priority: 'high',
      metadata: { description: 'Turbine container floor from FBX', category: 'smr', role: 'turbine_container_floor' },
    },
    smr_turbine_generator: {
      path: '/scene1/models/scene1/SMR/TurbineGenerator_LOD0.glb',
      type: 'model',
      priority: 'critical',
      metadata: { description: 'Turbine generator from FBX', category: 'smr', role: 'generator' },
    },
    smr_turbine_wall: {
      path: '/scene1/models/scene1/SMR/TurbineWall_LOD0.glb',
      type: 'model',
      priority: 'normal',
      metadata: { description: 'Turbine wall from FBX', category: 'smr', role: 'turbine_wall' },
    },
    // --- City Components ---
    city_main_skyscraper: {
      path: '/scene1/models/scene1/City/MainSkyscraper_LOD0.glb',
      type: 'model',
      priority: 'critical',
      metadata: { description: 'Bangkok hero skyscraper tower', category: 'city', role: 'skyscraper' },
    },
    // --- Facilities Components ---
    facilities_ground_pavement: {
      path: '/scene1/models/scene1/Facilities/GroundPavement_LOD0.glb',
      type: 'model',
      priority: 'high',
      metadata: { description: 'Ground pavement/roads for campus', category: 'facilities', role: 'pavement' },
    },
    facilities_landscaping_trees: {
      path: '/scene1/models/scene1/Facilities/LandscapingTrees_LOD0.glb',
      type: 'model',
      priority: 'high',
      metadata: { description: 'Landscaping trees for campus', category: 'facilities', role: 'trees' },
    },
    facilities_solar_panel_array: {
      path: '/scene1/models/scene1/Facilities/SolarPanelArray_LOD0.glb',
      type: 'model',
      priority: 'normal',
      metadata: { description: 'Solar panel array for green energy facilities', category: 'facilities', role: 'solar' },
    },
    // --- FBX-derived Facilities Components ---
    facilities_ground_base: {
      path: '/scene1/models/scene1/Facilities/GroundBase_LOD0.glb',
      type: 'model',
      priority: 'high',
      metadata: { description: 'Ground base terrain from FBX', category: 'facilities', role: 'ground_base' },
    },
    facilities_base_road: {
      path: '/scene1/models/scene1/Facilities/BaseRoad_LOD0.glb',
      type: 'model',
      priority: 'high',
      metadata: { description: 'Base road network from FBX', category: 'facilities', role: 'road' },
    },
    facilities_grassland: {
      path: '/scene1/models/scene1/Facilities/Grassland_LOD0.glb',
      type: 'model',
      priority: 'normal',
      metadata: { description: 'Grassland terrain from FBX', category: 'facilities', role: 'grassland' },
    },
    facilities_fencing: {
      path: '/scene1/models/scene1/Facilities/Fencing_LOD0.glb',
      type: 'model',
      priority: 'high',
      metadata: { description: 'Perimeter fencing from FBX', category: 'facilities', role: 'fencing' },
    },
    facilities_electric_generator: {
      path: '/scene1/models/scene1/Facilities/ElectricGenerator_LOD0.glb',
      type: 'model',
      priority: 'high',
      metadata: { description: 'Electric generator from FBX', category: 'facilities', role: 'electric_generator' },
    },
    facilities_electric_pole: {
      path: '/scene1/models/scene1/Facilities/ElectricPole_LOD0.glb',
      type: 'model',
      priority: 'high',
      metadata: { description: 'Electric transmission poles from FBX', category: 'facilities', role: 'electric_pole' },
    },
    facilities_electric_wire: {
      path: '/scene1/models/scene1/Facilities/ElectricWire_LOD0.glb',
      type: 'model',
      priority: 'normal',
      metadata: { description: 'Electric transmission wires from FBX', category: 'facilities', role: 'electric_wire' },
    },
    facilities_pipeline: {
      path: '/scene1/models/scene1/Facilities/Pipeline_LOD0.glb',
      type: 'model',
      priority: 'high',
      metadata: { description: 'Pipeline infrastructure from FBX', category: 'facilities', role: 'pipeline' },
    },
  },
  textures: {},
  environments: {
    industrial_sunset: {
      path: '/scene1/textures/environment/industrial_sunset_02_puresky_2k.hdr',
      type: 'environment',
      priority: 'critical',
      metadata: { description: 'Industrial sunset HDR environment' },
    },
  },
};

export const SCENE1_ASSET_KEYS: string[] = Object.keys(SCENE1_ASSET_MANIFEST.models);