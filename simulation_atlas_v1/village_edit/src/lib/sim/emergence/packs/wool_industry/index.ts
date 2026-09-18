/**
 * `_staging/wool_industry` — Yara life-type module (isolated).
 * Do not import from World / canvas / index. Wire later via hooks in README.
 */

export { BASE_PRICES, YARA_LIFE_TYPE } from './types'
export type {
  ActorFirm,
  BoomBustState,
  CommodityId,
  CommodityPrices,
  CommodityStock,
  MarketPhase,
  SettlementStageHint,
  SettlementWoolView,
  TextileRole,
  TradeRoadLink,
  WoolEvent,
  WoolEventKind,
  WoolIndustryState,
} from './types'

export {
  clamp01,
  convertChainForRole,
  emptyStock,
  ensureStock,
  expandHerd,
  exportCommodityChainSnapshot,
  inheritSheep,
  maybeDifferentiateRole,
  produceWool,
  repriceFromStocks,
  sellWool,
  spawnCopycat,
  tryHire,
} from './commodityChain'

export {
  applyQualitySpecialization,
  createBoomBustState,
  desiredStage,
  ensureTradeRoad,
  exportBoomBustSnapshot,
  firmSurvivesCrash,
  measureSupplyDemand,
  strengthenTradeRoads,
  tickBoomBust,
  tickSettlementStages,
} from './boomBust'

export {
  createWoolIndustryState,
  exportSettlementWoolView,
  seedYaraInheritance,
  tickWoolIndustry,
  woolIndustrySnapshot,
} from './tick'
export type { WoolTickSignals } from './tick'