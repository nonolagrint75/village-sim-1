/**
 * Settlement stage emergence: camp -> hamlet -> village -> town -> city.
 * Driven by population, houses, markets, mills, roads, walls — not level caps.
 * Soft thresholds only; never a single `if pop>N createTown` spawn.
 */
import { logCause } from './politics'
import type { SettlementStage, SimState, Village } from './types'

const STAGE_RANK: Record<SettlementStage, number> = {
  camp: 0,
  hamlet: 1,
  village: 2,
  town: 3,
  city: 4,
}

export const SETTLEMENT_STAGE_FR: Record<SettlementStage, string> = {
  camp: 'campement',
  hamlet: 'hameau',
  village: 'village',
  town: 'bourg',
  city: 'ville',
}

function houseCount(state: SimState, vg: Village): number {
  let n = 0
  for (const id of vg.memberIds) {
    const v = state.villagers.find((x) => x.id === id && x.alive)
    if (v?.hasHome) n++
  }
  return n
}

function roadNear(vg: Village): number {
  return Math.min(40, (vg.tradeRuns ?? 0) + Math.round((vg.attractiveness ?? 0) / 4))
}

export function desiredSettlementStage(state: SimState, vg: Village): SettlementStage {
  const pop = vg.memberIds.filter((id) => state.villagers.some((v) => v.id === id && v.alive)).length
  const houses = houseCount(state, vg)
  const infra =
    (vg.hasMill ? 1 : 0) +
    (vg.hasMarket ? 1 : 0) +
    (vg.hasPort ? 1 : 0) +
    (vg.hasMine ? 1 : 0) +
    (vg.wallTier !== 'none' ? 1 : 0) +
    (vg.hasShrine ? 0.5 : 0)
  const roads = roadNear(vg)
  const prosp = vg.prosperity ?? 30

  if (pop >= 28 && houses >= 14 && infra >= 3 && prosp >= 55 && (roads >= 8 || vg.isRegionalHub)) {
    return 'city'
  }
  if (pop >= 16 && houses >= 8 && infra >= 2 && prosp >= 42) return 'town'
  if (pop >= 8 && houses >= 3 && (infra >= 1 || prosp >= 32 || roads >= 3)) return 'village'
  if (pop >= 4 && houses >= 1) return 'hamlet'
  if (pop >= 3) return 'hamlet'
  return 'camp'
}

export function ensureSettlementStage(vg: Village): SettlementStage {
  if (!vg.settlementStage) vg.settlementStage = 'camp'
  return vg.settlementStage
}

export function tickSettlementStages(state: SimState) {
  for (const vg of state.villages) {
    const prev = ensureSettlementStage(vg)
    const next = desiredSettlementStage(state, vg)
    if (STAGE_RANK[next] === STAGE_RANK[prev]) continue
    let step: SettlementStage = prev
    const order: SettlementStage[] = ['camp', 'hamlet', 'village', 'town', 'city']
    if (STAGE_RANK[next] > STAGE_RANK[prev]) {
      step = order[Math.min(order.length - 1, STAGE_RANK[prev] + 1)]
    } else if (STAGE_RANK[next] < STAGE_RANK[prev] - 1) {
      step = order[Math.max(0, STAGE_RANK[prev] - 1)]
    } else {
      step = next
    }
    if (step === prev) continue
    vg.settlementStage = step
    logCause(
      state,
      `population ${vg.memberIds.length}, maisons et infrastructures`,
      `${SETTLEMENT_STAGE_FR[prev]} devient ${SETTLEMENT_STAGE_FR[step]} (foyer #${vg.id})`,
    )
  }
}

export function settlementStageCounts(state: SimState): Record<string, number> {
  const out: Record<string, number> = { camp: 0, hamlet: 0, village: 0, town: 0, city: 0 }
  for (const vg of state.villages) {
    const st = ensureSettlementStage(vg)
    out[st] = (out[st] ?? 0) + 1
  }
  return out
}
