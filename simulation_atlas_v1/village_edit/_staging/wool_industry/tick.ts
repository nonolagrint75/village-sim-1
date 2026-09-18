/**
 * Yara life-type tick — sheep inherit → sell → demand → expand → hire →
 * copycats → textile roles → trade road → village→town → crash → specialize.
 * No biography day scripts.
 */

import {
  applyQualitySpecialization,
  createBoomBustState,
  exportBoomBustSnapshot,
  strengthenTradeRoads,
  tickBoomBust,
  tickSettlementStages,
} from './boomBust'
import {
  convertChainForRole,
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
import type { SettlementWoolView, WoolIndustryState } from './types'
import { BASE_PRICES, YARA_LIFE_TYPE } from './types'

export interface WoolTickSignals {
  /** External cloth/wool demand 0..1 (from regional SoL / trade). */
  regionalDemand?: number
  /** Soft labor availability 0..1. */
  laborPoolBySettlement?: Record<number, number>
  /** Chance to seed a Yara inheritance event. */
  inheritPressure?: number
  settlementIds?: number[]
  rng?: () => number
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function createWoolIndustryState(opts?: {
  settlementIds?: number[]
}): WoolIndustryState {
  const ids = opts?.settlementIds ?? [1]
  const stocksBySettlement: WoolIndustryState['stocksBySettlement'] = {}
  const settlementStage: WoolIndustryState['settlementStage'] = {}
  for (const id of ids) {
    stocksBySettlement[id] = { sheep: 0, wool: 0, yarn: 0, cloth: 0, dyedCloth: 0 }
    settlementStage[id] = 'hamlet'
  }
  return {
    tick: 0,
    nextFirmId: 1,
    firms: [],
    stocksBySettlement,
    prices: { ...BASE_PRICES },
    boomBust: createBoomBustState(),
    roads: [],
    settlementStage,
    events: [],
  }
}

export function seedYaraInheritance(
  state: WoolIndustryState,
  settlementId: number,
  rng: () => number,
  sheepCount?: number,
) {
  return inheritSheep(
    state,
    settlementId,
    `Yara-${state.nextFirmId}`,
    sheepCount ?? 4 + Math.floor(rng() * 5),
  )
}

export function exportSettlementWoolView(
  state: WoolIndustryState,
  settlementId: number,
): SettlementWoolView {
  const stock = state.stocksBySettlement[settlementId] ?? {
    sheep: 0,
    wool: 0,
    yarn: 0,
    cloth: 0,
    dyedCloth: 0,
  }
  const roadStrength = state.roads
    .filter((r) => r.fromSettlementId === settlementId || r.toSettlementId === settlementId)
    .reduce((s, r) => s + r.strength, 0)
  return {
    settlementId,
    stageHint: state.settlementStage[settlementId] ?? 'camp',
    stocks: { ...stock },
    prices: { ...state.prices },
    firms: state.firms.filter((f) => f.settlementId === settlementId).map((f) => ({ ...f })),
    roadStrength,
    boomBust: { ...state.boomBust },
  }
}

export function tickWoolIndustry(
  state: WoolIndustryState,
  signals: WoolTickSignals = {},
): SettlementWoolView[] {
  state.tick += 1
  const rng = signals.rng ?? mulberry32(state.tick * 7919 + state.firms.length * 17)
  const demand = signals.regionalDemand ?? 0.4
  const settlements =
    signals.settlementIds ??
    Object.keys(state.stocksBySettlement).map(Number)
  const inheritPressure = signals.inheritPressure ?? 0.015

  if (settlements.length && state.firms.length === 0 && rng() < Math.max(inheritPressure, 0.2)) {
    seedYaraInheritance(state, settlements[0]!, rng)
  } else if (settlements.length && rng() < inheritPressure) {
    const sid = settlements[Math.floor(rng() * settlements.length)]!
    seedYaraInheritance(state, sid, rng)
  }

  // Demand spike signal when regional demand jumps during expansion.
  if (demand > 0.65 && state.boomBust.phase === 'expansion') {
    state.events.push({
      tick: state.tick,
      kind: 'demand_spike',
      detail: `demand=${demand.toFixed(2)}`,
    })
  }

  for (const firm of state.firms) {
    const labor = signals.laborPoolBySettlement?.[firm.settlementId] ?? 0.5
    produceWool(state, firm)
    const sellAmt =
      (firm.role === 'herder' || firm.role === 'copycat_herder') && demand > 0.3
        ? 1.5 + demand * 2
        : 0
    if (sellAmt > 0) sellWool(state, firm, sellAmt, demand)
    convertChainForRole(state, firm)
    expandHerd(state, firm, demand)
    tryHire(state, firm, labor)
    spawnCopycat(state, firm, rng)
    maybeDifferentiateRole(state, firm, rng)

    // Crash capital drain for non-specialists.
    if (state.boomBust.phase === 'crash' && !firm.specialized) {
      firm.capital = Math.max(0, firm.capital - state.boomBust.crashSeverity * 1.5)
    }
  }

  repriceFromStocks(state, demand)
  tickBoomBust(state, demand)
  strengthenTradeRoads(state)
  tickSettlementStages(state)
  applyQualitySpecialization(state, rng)

  return settlements.map((id) => exportSettlementWoolView(state, id))
}

export function woolIndustrySnapshot(state: WoolIndustryState) {
  return {
    lifeType: YARA_LIFE_TYPE,
    tick: state.tick,
    chain: exportCommodityChainSnapshot(state),
    boomBust: exportBoomBustSnapshot(state),
  }
}