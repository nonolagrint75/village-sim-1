/**
 * Render package — Lot 2 selective port from manual UI.
 *
 * Active on canon canvas: BuildChunkRenderer (house cutaway overlays).
 * Dormant / optional: WorldGlRenderer (manual WebGL terrain — NOT wired;
 * canon keeps tileArt + entityArt + lighting pipeline).
 */
export {
  BuildChunkRenderer,
  BUILD_CHUNK_TILES,
  buildChunkKey,
  unpackBuildChunkKey,
  greedyMesh2D,
  isBuildCell,
  isBuildFloor,
  isBuildWall,
  type BuildChunkDirty,
  type GreedyQuad,
} from './buildChunkMesher'
export { BuildAtlas, ATLAS_SIZES } from './buildAtlas'
export { drawOrganicCloseup } from './organicCloseup'
export { seedNoise, fbm2, simplex2, hash2 } from './noise'
export { TERRAIN_RGB, paletteFloat32 } from './terrainColors'
/** Manual sprite path — canon SimulationCanvas uses entityArt instead. */
export { drawVillagerSprite } from './villagerSprites'
/** Manual WebGL terrain — not mounted; kept for reference / future opt-in. */
export { WorldGlRenderer } from './WorldGlRenderer'
export {
  drawNatureCloseup,
  isNaturalTerrain,
  isNatureReady,
  loadNatureAtlas,
  natureHandlesTerrain,
  naturePixel32,
  natureTextureKey,
} from './nature'
