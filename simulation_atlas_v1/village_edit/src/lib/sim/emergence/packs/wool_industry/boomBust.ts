/**
 * Boom / bust + trade-road + settlement upstage + quality specialization.
 */

import { clamp01, ensureStock } from './commodityChain'
import type {
  ActorFirm,
  BoomBustState,
  MarketPhase,
  SettlementStageHint,
  TradeRoadLink,
  WoolEvent,
  WoolIndustryState,
} from './types'

const PHASE_ORDER: MarketPhase[] = [
  'nascent',
  'expansion',
  'boom',
  'glut',
  'crash',
  'specialize',
]

function pushEvent(
  state: WoolIndustryState,
  kind: WoolEvent['kind'],
  extra: Partial<WoolEvent> = {},
): void {
  state.events.push({ tick: state.tick, kind, ...extra })
  if (state.events.length > 240) state.events.splice(0, state.events.length - 240)
}

export function createBoomBustState(): BoomBustState {
  return {
    phase: 'nascent',
    demand: 0.35,
    supply: 0.1,
    priceIndex: 1,
    overproduction: 0,
    crashSeverity: 0,
    specializationPressure: 0,
    ticksInPhase: 0,
  }
}

export function measureSupplyDemand(state: WoolIndustryState): {
  supply: number
  demand: number
} {
  let wool = 0
  let cloth = 0
  for (const s of Object.values(state.stocksBySettlement)) {
    wool += s.wool
    cloth += s.cloth + s.dyedCloth
  }
  const herd = state.firms.reduce((n, f) => n + f.herdSize, 0)
  const supply = clamp01((wool + cloth * 1.4 + herd * 0.15) / 40)
  // Demand rises with merchants + roads + settlement stage, falls after crash hangover.
  const merchants = state.firms.filter((f) => f.role === 'merchant').length
  const road = state.roads.reduce((s, r) => s + r.strength, 0)
  const townBoost = Object.values(state.settlementStage).filter(
    (st) => st === 'town' || st === 'city',
  ).length
  let demand = clamp01(0.25 + merchants * 0.08 + road * 0.05 + townBoost * 0.1)
  demand = clamp01(demand - state.boomBust.crashSeverity * 0.35)
  return { supply, demand }
}

function setPhase(state: WoolIndustryState, phase: MarketPhase, detail?: string): void {
  if (state.boomBust.phase === phase) return
  state.boomBust.phase = phase
  state.boomBust.ticksInPhase = 0
  if (phase === 'crash') {
    pushEvent(state, 'market_crash', { detail: detail ?? `sev=${state.boomBust.crashSeverity.toFixed(2)}` })
  } else if (phase === 'glut') {
    pushEvent(state, 'overproduction_detected', {
      detail: `over=${state.boomBust.overproduction.toFixed(2)}`,
    })
  }
}

export function tickBoomBust(state: WoolIndustryState, externalDemand = 0.4): BoomBustState {
  const bb = state.boomBust
  bb.ticksInPhase += 1
  const { supply, demand } = measureSupplyDemand(state)
  bb.supply = supply
  bb.demand = clamp01(demand * 0.7 + externalDemand * 0.3)
  bb.priceIndex = clamp01(0.2 + (bb.demand + 0.05) / (bb.supply + 0.2))
  bb.overproduction = clamp01(bb.supply - bb.demand)

  // Phase machine — thresholds only; no scripted calendar.
  switch (bb.phase) {
    case 'nascent':
      if (state.firms.length >= 1 && bb.supply > 0.08) setPhase(state, 'expansion')
      break
    case 'expansion':
      if (bb.demand > 0.45 && bb.supply > 0.25) setPhase(state, 'boom')
      break
    case 'boom':
      if (bb.overproduction > 0.22 && bb.ticksInPhase > 8) setPhase(state, 'glut')
      break
    case 'glut':
      if (bb.overproduction > 0.35) {
        bb.crashSeverity = clamp01(0.4 + bb.overproduction)
        setPhase(state, 'crash')
      } else if (bb.overproduction < 0.12) setPhase(state, 'boom')
      break
    case 'crash':
      // Prices collapse; herds/stocks shed; survivors specialize.
      bb.crashSeverity = clamp01(bb.crashSeverity * 0.97)
      // Soft supply destruction — glut clears even if absolute stocks stay high.
      bb.supply = clamp01(bb.supply * 0.92)
      bb.specializationPressure = clamp01(
        bb.specializationPressure + 0.04 + (1 - bb.crashSeverity) * 0.02,
      )
      if (bb.ticksInPhase > 10 && (bb.supply < bb.demand + 0.15 || bb.ticksInPhase > 40)) {
        setPhase(state, 'specialize')
      }
      break
    case 'specialize':
      if (bb.specializationPressure > 0.55 && bb.ticksInPhase > 10) {
        // New cycle if demand recovers without glut.
        if (bb.demand > 0.4 && bb.overproduction < 0.15) setPhase(state, 'expansion')
      }
      break
  }

  // Apply crash to prices.
  if (bb.phase === 'crash' || bb.phase === 'glut') {
    const crush = bb.phase === 'crash' ? 0.55 : 0.8
    state.prices.wool *= crush
    state.prices.yarn *= crush
    state.prices.cloth *= crush
    state.prices.dyedCloth *= 0.7 + (1 - crush) * 0.3 // quality goods resist more
  }

  return bb
}

export function ensureTradeRoad(
  state: WoolIndustryState,
  fromSettlementId: number,
  toSettlementId: number,
): TradeRoadLink {
  let road = state.roads.find(
    (r) =>
      (r.fromSettlementId === fromSettlementId && r.toSettlementId === toSettlementId) ||
      (r.fromSettlementId === toSettlementId && r.toSettlementId === fromSettlementId),
  )
  if (!road) {
    road = {
      id: `road:${fromSettlementId}-${toSettlementId}`,
      fromSettlementId,
      toSettlementId,
      strength: 0.1,
      woolThroughput: 0,
    }
    state.roads.push(road)
  }
  return road
}

export function strengthenTradeRoads(state: WoolIndustryState): void {
  const merchants = state.firms.filter((f) => f.role === 'merchant')
  const hubs = [...new Set(state.firms.map((f) => f.settlementId))]
  if (hubs.length < 2) {
    // Intra-settlement path still marks road potential once surplus moves.
    for (const f of merchants) {
      const road = ensureTradeRoad(state, f.settlementId, f.settlementId + 1000)
      road.strength = clamp01(road.strength + 0.03)
      road.woolThroughput += 0.5
      pushEvent(state, 'trade_road_strengthened', {
        settlementId: f.settlementId,
        detail: road.id,
      })
    }
    return
  }
  for (let i = 0; i < hubs.length; i++) {
    for (let j = i + 1; j < hubs.length; j++) {
      const a = hubs[i]!
      const b = hubs[j]!
      const tradePressure =
        (ensureStock(state, a).wool + ensureStock(state, b).cloth) * 0.02 +
        merchants.filter((m) => m.settlementId === a || m.settlementId === b).length * 0.05
      if (tradePressure < 0.08) continue
      const road = ensureTradeRoad(state, a, b)
      road.strength = clamp01(road.strength + tradePressure * 0.1)
      road.woolThroughput += tradePressure
      pushEvent(state, 'trade_road_strengthened', {
        settlementId: a,
        detail: `${road.id} str=${road.strength.toFixed(2)}`,
      })
    }
  }
}

const STAGE_RANK: Record<SettlementStageHint, number> = {
  camp: 0,
  hamlet: 1,
  village: 2,
  town: 3,
  city: 4,
}

export function desiredStage(
  state: WoolIndustryState,
  settlementId: number,
): SettlementStageHint {
  const firms = state.firms.filter((f) => f.settlementId === settlementId)
  const stock = ensureStock(state, settlementId)
  const road = state.roads
    .filter((r) => r.fromSettlementId === settlementId || r.toSettlementId === settlementId)
    .reduce((s, r) => s + r.strength, 0)
  const capital = firms.reduce((s, f) => s + f.capital, 0)
  const roles = new Set(firms.map((f) => f.role)).size
  if (firms.length >= 8 && roles >= 4 && road >= 0.8 && capital > 120) return 'city'
  if (firms.length >= 5 && roles >= 3 && road >= 0.4 && stock.cloth + stock.dyedCloth > 10) {
    return 'town'
  }
  if (firms.length >= 2 || stock.wool > 5) return 'village'
  if (firms.length >= 1) return 'hamlet'
  return 'camp'
}

export function tickSettlementStages(state: WoolIndustryState): void {
  const ids = new Set<number>([
    ...Object.keys(state.settlementStage).map(Number),
    ...state.firms.map((f) => f.settlementId),
  ])
  for (const id of ids) {
    const prev = state.settlementStage[id] ?? 'camp'
    const next = desiredStage(state, id)
    if (STAGE_RANK[next] > STAGE_RANK[prev]) {
      // Step at most one stage.
      const order: SettlementStageHint[] = ['camp', 'hamlet', 'village', 'town', 'city']
      const stepped = order[Math.min(order.length - 1, STAGE_RANK[prev] + 1)]!
      state.settlementStage[id] = stepped
      pushEvent(state, 'settlement_upstaged', {
        settlementId: id,
        detail: `${prev}→${stepped}`,
      })
    } else if (STAGE_RANK[next] < STAGE_RANK[prev] - 1 && state.boomBust.phase === 'crash') {
      const order: SettlementStageHint[] = ['camp', 'hamlet', 'village', 'town', 'city']
      state.settlementStage[id] = order[Math.max(0, STAGE_RANK[prev] - 1)]!
    } else {
      state.settlementStage[id] = prev
    }
  }
}

/** After crash, survivors specialize on quality niches. */
export function applyQualitySpecialization(state: WoolIndustryState, rng: () => number): void {
  if (state.boomBust.phase !== 'specialize' && state.boomBust.phase !== 'crash') return
  // Crash clears glut: dump excess raw wool so recovery is possible.
  if (state.boomBust.phase === 'crash') {
    for (const s of Object.values(state.stocksBySettlement)) {
      s.wool *= 0.94
      s.yarn *= 0.96
    }
  }
  for (const firm of state.firms) {
    if (firm.specialized) continue
    if (firm.capital < 5) {
      // Exit soft: shrink herd / workers
      firm.herdSize = Math.max(0, firm.herdSize - 1)
      firm.workers = Math.max(0, firm.workers - 1)
      continue
    }
    if (firm.quality < 0.45 && rng() > 0.1) continue
    if (rng() > 0.12 * state.boomBust.specializationPressure) continue
    firm.specialized = true
    if (firm.role === 'dyer' || firm.role === 'merchant') firm.specialty = 'dyed_luxury'
    else if (firm.role === 'weaver') firm.specialty = 'bulk_cloth'
    else firm.specialty = 'fine_wool'
    firm.quality = clamp01(firm.quality + 0.2)
    pushEvent(state, 'quality_specialization', {
      firmId: firm.id,
      settlementId: firm.settlementId,
      detail: firm.specialty,
    })
  }
}

export function exportBoomBustSnapshot(state: WoolIndustryState) {
  return {
    ...state.boomBust,
    roads: state.roads.map((r) => ({ ...r })),
    settlementStage: { ...state.settlementStage },
    specializedFirms: state.firms.filter((f) => f.specialized).length,
  }
}

export function firmSurvivesCrash(firm: ActorFirm, severity: number): boolean {
  return firm.capital > 3 + severity * 10 || firm.specialized || firm.quality > 0.6
}