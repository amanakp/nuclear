const fs = require('fs');
const path = require('path');

const DEST_ROOT = 'dist/scene1';

const modelPaths = [
  '/scene1/models/scene1/SMR/SMR_ContainmentDome_LOD0.glb',
  '/scene1/models/scene1/SMR/SMR_CenterBuilding_LOD0.glb',
  '/scene1/models/scene1/SMR/SMR_RooftopHVAC_LOD0.glb',
  '/scene1/models/scene1/SMR/SMR_CentralUnitBlock_LOD0.glb',
  '/scene1/models/scene1/SMR/SMR_TurbineBuilding_LOD0.glb',
  '/scene1/models/scene1/SMR/SMR_ExhaustStack_LOD0.glb',
  '/scene1/models/scene1/SMR/SMR_CentralSubstation_LOD0.glb',
  '/scene1/models/scene1/SMR/SMR_PerimeterWall_LOD0.glb',
  '/scene1/models/scene1/SMR/SMR_MechanicalPumps_LOD0.glb',
  '/scene1/models/scene1/SMR/SMR_PipeLoopSegment_LOD0.glb',
  '/scene1/models/scene1/SMR/SMR_SolarPanelArray_LOD0.glb',
  '/scene1/models/scene1/SMR/NuclearReactor_LOD0.glb',
  '/scene1/models/scene1/SMR/NuclearReactorContainer_LOD0.glb',
  '/scene1/models/scene1/SMR/SteamTower_LOD0.glb',
  '/scene1/models/scene1/SMR/SteamTowerBase_LOD0.glb',
  '/scene1/models/scene1/SMR/Turbine_LOD0.glb',
  '/scene1/models/scene1/SMR/TurbineBuilding_LOD0.glb',
  '/scene1/models/scene1/SMR/TurbineContainer_LOD0.glb',
  '/scene1/models/scene1/SMR/TurbineContainerFloor_LOD0.glb',
  '/scene1/models/scene1/SMR/TurbineGenerator_LOD0.glb',
  '/scene1/models/scene1/SMR/TurbineWall_LOD0.glb',
  '/scene1/models/scene1/City/MainSkyscraper_LOD0.glb',
  '/scene1/models/scene1/Facilities/GroundPavement_LOD0.glb',
  '/scene1/models/scene1/Facilities/LandscapingTrees_LOD0.glb',
  '/scene1/models/scene1/Facilities/SolarPanelArray_LOD0.glb',
  '/scene1/models/scene1/Facilities/GroundBase_LOD0.glb',
  '/scene1/models/scene1/Facilities/BaseRoad_LOD0.glb',
  '/scene1/models/scene1/Facilities/Grassland_LOD0.glb',
  '/scene1/models/scene1/Facilities/Fencing_LOD0.glb',
  '/scene1/models/scene1/Facilities/ElectricGenerator_LOD0.glb',
  '/scene1/models/scene1/Facilities/ElectricPole_LOD0.glb',
  '/scene1/models/scene1/Facilities/ElectricWire_LOD0.glb',
  '/scene1/models/scene1/Facilities/Pipeline_LOD0.glb',
];

const envPaths = [
  '/scene1/textures/environment/industrial_sunset_02_puresky_2k.hdr',
];

let allExist = true;
for (const p of modelPaths) {
  const filePath = path.join(DEST_ROOT, p.replace(/^\/scene1\//, ''));
  if (!fs.existsSync(filePath)) {
    allExist = false;
    console.log('MISSING:', p);
  }
}
for (const p of envPaths) {
  const filePath = path.join(DEST_ROOT, p.replace(/^\/scene1\//, ''));
  if (!fs.existsSync(filePath)) {
    allExist = false;
    console.log('MISSING:', p);
  }
}

if (allExist) {
  console.log('ALL MANIFEST ASSETS EXIST IN dist/scene1/');
}