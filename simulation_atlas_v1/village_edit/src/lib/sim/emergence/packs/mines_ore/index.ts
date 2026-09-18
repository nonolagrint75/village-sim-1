/**
 * Public API - mines / ore causal logic (staging, self-contained).
 *
 * Chain: prospect (richness) -> sticky mouth -> extract stocks -> forge demand -> visual events.
 */

export type {
  CellRef,
  DepositSample,
  ExtractionResult,
  ForgeDemandSignal,
  KnownMineMouth,
  MineLifeTag,
  MineVisualEvent,
  MineVisualEventKind,
  MinesOreBag,
  MouthStatus,
  OreAmounts,
  OreKind,
  ToolTier,
  VeinKnowledge,
  VeinKnowledgeStatus,
} from './types'

export {
  METAL_ORE_KINDS,
  addOreAmounts,
  canMineRock,
  cloneOreAmounts,
  createMinesOreBag,
  emptyOreAmounts,
  sumOre,
} from './types'

export {
  DEPLETED_METAL_FLOOR,
  DIG_HITS_PER_SESSION,
  DIG_STAMINA_MULT,
  DIG_TILES_PER_SESSION,
  FORGE_DEMAND_RADIUS,
  FORGE_STOCK_THRESHOLD,
  MAX_PENDING_EVENTS,
  MOUNTAIN_DIG_HP_MAX,
  MOUNTAIN_DIG_HP_MIN,
  MOUTH_STICKY,
  PROSPECT_BASE_CHANCE,
  PROSPECT_RADIUS,
  PROSPECT_RICHNESS_FLOOR,
  RICHNESS_WEIGHTS,
  TUNNEL_ENTRANCE_AMOUNT,
} from './constants'

export {
  aggregateVeinNear,
  localOreRichness,
  pickRichestSample,
  primaryOreOf,
  sampleRichness,
  tryProspectVein,
} from './richness'
export type { ProspectOpts } from './richness'

export {
  actorKnowsMouth,
  claimMineMouth,
  findMouthById,
  findMouthNear,
  knownMouthsFor,
  markMouthActive,
  openMineMouth,
  refreshDepletion,
  rememberMouth,
  setMouthStatus,
  villageMineFields,
  villageMouth,
} from './mouths'
export type { ClaimMouthOpts } from './mouths'

export {
  digGoldYield,
  digHpPerHit,
  digIronYield,
  digSideOreYield,
  digStaminaCost,
  digStoneYield,
  extractAtMouth,
  mouthOreStock,
  mouthVeinRemaining,
  takeFromStockpile,
} from './extraction'
export type { DigAtMouthOpts } from './extraction'

export {
  forgeNeedDelta,
  refreshForgeDemand,
  suggestForgeSite,
} from './forgeSignal'
export type { ForgeSiteHint, RefreshForgeOpts } from './forgeSignal'

export { drainEvents, eventsSince, peekEvents, pushEvent } from './events'

export {
  TERRAIN_MOUNTAIN,
  TERRAIN_TUNNEL,
  applyVillageMineSync,
  samplesFromGrid,
} from './adapters'
export type { GridOreView, SampleGridOpts, VillageMineSync } from './adapters'

export {
  MinesOreLogic,
  digKnownMouth,
  ensureBag,
  prospectAndMaybeClaim,
  tickMinesOre,
} from './tick'
export type { MinesOreTickContext, ProspectAndClaimOpts } from './tick'