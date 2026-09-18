export { isGrassUnderlay, isNaturalGround, isNaturalProp, isNaturalTerrain, isWornWay } from "./kinds"
export { NatureAtlas } from "./atlas"
export { natureTextureKey, natureGroundUnderProp, natureGrassKey, type SeasonName } from "./mapping"
export {
  NATURE_TILE_PX,
  cloneTile,
  frost,
  mixTiles,
  multiplyRgb,
  overlay,
  speckle,
  type TilePx,
} from "./textureLab"
export {
  getNatureAtlas,
  isNatureReady,
  loadNatureAtlas,
  onNatureAtlasReady,
} from "./loader"
export { drawNatureCloseup, natureHandlesTerrain, naturePixel32 } from "./draw"
export { drawMineVisuals, drawMineMouth, drawDigScar, drawOrePile } from "./minesDraw"
export type { MineVisualSite, OreKind } from "./minesComposition"
