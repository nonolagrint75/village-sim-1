/**
 * Wool industry — isolated staging types (Yara life-type chain).
 * Self-contained: no imports from src/lib. Naming mirrors sim conventions.
 */

export type TextileRole =
  | 'herder'
  | 'spinner'
  | 'weaver'
  | 'dyer'
  | 'merchant'
  | 'copycat_herder'

export type CommodityId = 'sheep' | 'wool' | 'yarn' | 'cloth' | 'dyed_cloth'

export type MarketPhase = 'nascent' | 'expansion' | 'boom' | 'glut' | 'crash' | 'specialize'

export type SettlementStageHint = 'camp' | 'hamlet' | 'village' | 'town' | 'city'

export interface CommodityStock {
  sheep: number
  wool: number
  yarn: number
  cloth: number
  dyedCloth: number
}

export interface CommodityPrices {
  sheep: number
  wool: number
  yarn: number
  cloth: number
  dyedCloth: number
}

export interface ActorFirm {
  id: string
  ownerName: string
  role: TextileRole
  settlementId: number
  herdSize: number
  workers: number
  quality: number
  capital: number
  specialized: boolean
  specialty?: 'fine_wool' | 'dyed_luxury' | 'bulk_cloth'
  foundedTick: number
}

export interface TradeRoadLink {
  id: string
  fromSettlementId: number
  toSettlementId: number
  strength: number
  woolThroughput: number
}

export interface BoomBustState {
  phase: MarketPhase
  demand: number
  supply: number
  priceIndex: number
  overproduction: number
  crashSeverity: number
  specializationPressure: number
  ticksInPhase: number
}

export interface SettlementWoolView {
  settlementId: number
  stageHint: SettlementStageHint
  stocks: CommodityStock
  prices: CommodityPrices
  firms: ActorFirm[]
  roadStrength: number
  boomBust: BoomBustState
}

export interface WoolIndustryState {
  tick: number
  nextFirmId: number
  firms: ActorFirm[]
  stocksBySettlement: Record<number, CommodityStock>
  prices: CommodityPrices
  boomBust: BoomBustState
  roads: TradeRoadLink[]
  settlementStage: Record<number, SettlementStageHint>
  events: WoolEvent[]
}

export type WoolEventKind =
  | 'sheep_inherited'
  | 'wool_sold'
  | 'demand_spike'
  | 'herd_expanded'
  | 'worker_hired'
  | 'copycat_entered'
  | 'role_differentiated'
  | 'trade_road_strengthened'
  | 'settlement_upstaged'
  | 'overproduction_detected'
  | 'market_crash'
  | 'quality_specialization'

export interface WoolEvent {
  tick: number
  kind: WoolEventKind
  firmId?: string
  settlementId?: number
  detail?: string
}

export const YARA_LIFE_TYPE = 'yara' as const

export const BASE_PRICES: CommodityPrices = {
  sheep: 8,
  wool: 3,
  yarn: 5,
  cloth: 9,
  dyedCloth: 14,
}