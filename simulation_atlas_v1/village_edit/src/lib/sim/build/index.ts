/**
 * Build package — Lot 2 voxel layer + Lot 3B home plan/queue/place.
 * Collab apply helpers deferred to Lot 3C (behaviors).
 */
export {
  AIR_ID,
  BlockKind,
  CHUNK_SIZE,
  DEFAULT_WORLD_HEIGHT,
  INCOMPLETE_SHELL_RATIO,
  MAX_CONCURRENT_HOME_BUILDS,
  MIN_SHELL_WALL_CELLS,
  Material,
  OWNER_NONE,
  STRAY_CLEANUP_PERIOD,
  chunkKey,
  chunkVolume,
  localIndex,
  unpackChunkKey,
  type BlockDef,
  type BlockView,
  type ChunkCoord,
  type ChunkKey,
  type ChunkSoa,
  type PlaceOptions,
  type WorldBuildDims,
} from './buildTypes'

export {
  BLOCK_DEFS,
  defIdFromKey,
  defIdFromTerrain,
  getBlockDef,
  isSolidDef,
  terrainFromDefId,
} from './defs'

export { chunkByteSize, createEmptyChunk, isChunkEmpty } from './chunk'

export {
  ChunkStore,
  createBlockWorld,
  getBlock,
  markChunkDirty,
  placeBlock,
  placeBlockByKey,
  removeBlock,
  type BlockWorld,
  type PlaceResult,
} from './blockWorld'

export {
  createStoreFromTerrain,
  defIdToTerrainCode,
  syncFromTerrain,
  syncToTerrain,
  terrainCodeToDefId,
  type SyncStats,
} from './bridge'

export { BuildAssertError, assert, assertEq, assertOk } from './assert'

export type {
  BuildBlock,
  BuildBlockKind,
  BuildMaterial,
  HomeBuildState,
  HomeNeedFocus,
  HomePlannerBrief,
  NeighborBuildingMemory,
  PlotClimateHint,
  SpatialHomePlan,
} from './homeContracts'
export {
  buildQueueComplete,
  buildQueueRemaining,
  emptyBuildQueue,
} from './homeContracts'

export { ensureBlockWorld } from './stateBridge'
export { planHomeSpatial, fallbackLeanPlan } from './planner'
export {
  emitBuildQueue,
  nextBuildBlock,
  markBlockDone,
  structuralBlocksRemaining,
  shellClosed,
  footprintFromPlan,
  rebuildQueueFromDesign,
  applyDoorSide,
  orderShellFromDoor,
  allFootprintWalls,
} from './tasks'
export {
  placeBuildBlock,
  blockNeedsWork,
  materialCost,
  terrainForBlock,
  wallTerrainCode,
  floorTerrainCode,
  mirrorTerrainToBlocks,
  defaultMaterialForKind,
  isStructuralKind,
} from './chunks'
export {
  observeNeighborHomes,
  imitateStyleBias,
  buildSkillScaleBias,
  cultureTagsFromContext,
  rememberBuiltShape,
} from './culture'
export {
  formHomeBuild,
  attachHomeBuild,
  applyNextHomeBuildBlock,
  ensureVillagerBuildQueue,
  finalizeHomeCompletion,
  spatialPlanFromLegacyHouse,
  villagerPlanFootprint,
  MATERIAL_INVENTORY_HOOK,
  type ApplyHomeBuildOpts,
  type ApplyHomeBuildResult,
} from './homeBuildPipeline'
export {
  listOpenBuildSites,
  isActiveHomeSite,
  countActiveHelpers,
  siteMaxHelpers,
  siteShellRemaining,
  siteStillNeedsMaterials,
  COLLAB_SITE_RADIUS,
  WO_SOFT_REOPEN_REASONS,
  WO_TERMINAL_FAIL_REASONS,
  type OpenBuildSite,
  type CollabPayKind,
} from './collabContracts'
export {
  listOpenBuildSites as listOpenBuildSitesFull,
  placeBlockForOwner,
  haulMaterialsToOwner,
  settleBuildHelp,
  settleHireAdvance,
  scoreHelpBuild,
  scoreHaulForBuild,
  collabHelpLabelFr,
} from './collab'
export {
  abandonIncompleteHome,
  clearDeadBuilderShell,
  reclaimIncompleteHome,
  pruneCompletedBuildQueue,
  clearAbandonedBuildState,
  incompleteShellShouldReclaim,
  countPlacedShellWalls,
  clearHomeFootprintTerrain,
} from './cleanup'
export {
  tickWorkOrders,
  syncWorkOrdersFromSites,
  cachedOpenBuildSites,
  reserveWorkOrder,
  scoreWorkOrderFor,
  reopenWorkOrder,
  ensureOpenSiteOrder,
  type WorkOrder,
  type WorkOrderKind,
  type WorkOrderStatus,
} from './workOrders'
export {
  proposeCollabOptions,
  executeHelpBuild,
  executeHaulForBuild,
  ensureProgressiveHomePlan,
} from './npcBuildBehaviors'
export {
  snapshotEmergence,
  ensureEmergenceMetrics,
  bindEmergenceState,
  emptyEmergenceMetrics,
  coreEmergenceCounters,
  fingerprintEmergence,
  baselineRowFromSnap,
  formatEmergenceBaselineTable,
  compareEmergenceRepro,
  type EmergenceSnapshot,
  type EmergenceMetrics,
  type EmergenceCoreCounters,
  type EmergenceBaselineRow,
  type EmergenceReproResult,
} from './emergenceMetrics'
