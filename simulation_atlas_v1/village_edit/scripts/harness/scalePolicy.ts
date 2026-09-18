/**
 * WP12 — sec20 scale capacity policy (config honesty).
 *
 * Documents simConfig clamps and whether harness tiers can START or must GROW.
 * BLOCKED capacite != FAIL emergence. Never awards EMERGENCE PASS.
 *
 * Clamps (src/lib/sim/simConfig.ts resolveSimConfig):
 *   initialVillagers: 4..120
 *   maxPopulation:    initialVillagers..500
 * Defaults: standard 26/250, anthill 55/220, vast 40/400
 */

import {
  INITIAL_VILLAGERS_MAX,
  INITIAL_VILLAGERS_MIN,
  MAX_POPULATION_HARD_CAP,
  resolveSimConfig,
  type SimConfigInput,
} from '../../src/lib/sim/simConfig.ts'
import { SEC20_FLOORS, type EvidenceResult, type SuiteId } from './types.ts'

/** Exact clamps from simConfig — single source of truth. */
export const SCALE_CLAMPS = {
  initialVillagersMin: INITIAL_VILLAGERS_MIN,
  initialVillagersMax: INITIAL_VILLAGERS_MAX,
  maxPopulationHardCap: MAX_POPULATION_HARD_CAP,
} as const

export type ScalePathKind = 'start_at_floor' | 'grow_to_floor' | 'start_blocked'

export type ScaleCapacityStatus = 'READY' | 'BLOCKED' | 'UNPROVEN_GROW'

export type ScaleTierPreset = {
  id: string
  suite: SuiteId
  label: string
  path: ScalePathKind
  /** createSimulation / resolveSimConfig input */
  config: SimConfigInput
  days: number
  seeds: number[]
  /** Raising founders above default play → TEST SETUP for EMERGENCE channel */
  raisesFounders: boolean
  note: string
}

/**
 * Individual sec20: >=100 NPC, >=60d, >=3 seeds.
 * Start@100 is inside initialVillagers clamp (<=120) → READY path.
 * Grow-to-100 from default 26 also capacity-OK; organic reach UNPROVEN.
 */
export const SEC20_INDIVIDUAL_START: ScaleTierPreset = {
  id: 'sec20_individual_start100',
  suite: 'individual',
  label: 'sec20 individual — start >=100 founders',
  path: 'start_at_floor',
  config: {
    preset: 'standard',
    worldSize: 1000,
    initialVillagers: 100,
    maxPopulation: 250,
  },
  days: 60,
  seeds: [1, 3, 7],
  raisesFounders: true,
  note:
    'TEST SETUP if used for EMERGENCE PASS claims (raised founders). Mechanism soaks OK. Does NOT grant EMERGENCE PASS alone.',
}

export const SEC20_INDIVIDUAL_GROW: ScaleTierPreset = {
  id: 'sec20_individual_grow100',
  suite: 'individual',
  label: 'sec20 individual — grow-to-100 from default founders',
  path: 'grow_to_floor',
  config: {
    preset: 'standard',
    worldSize: 1000,
    initialVillagers: 26,
    maxPopulation: 250,
  },
  days: 60,
  seeds: [1, 3, 7],
  raisesFounders: false,
  note:
    'Capacity OK (maxPopulation 250 >= 100). Organic reach to 100 living is UNPROVEN — not FAIL, not PASS.',
}

/**
 * Social sec20 wants 300 living. Cannot START at 300: initialVillagers clamp max=120.
 * Grow path needs maxPopulation >= 300 (vast preset 400).
 */
export const SEC20_SOCIAL_GROW: ScaleTierPreset = {
  id: 'sec20_social_grow300',
  suite: 'social',
  label: 'sec20 social — grow-to-300 (start blocked at 300)',
  path: 'grow_to_floor',
  config: {
    preset: 'vast',
    worldSize: 1200,
    initialVillagers: 40,
    maxPopulation: 400,
  },
  days: 120,
  seeds: [1, 3, 5, 7, 9, 11, 13, 17, 19, 23],
  raisesFounders: false,
  note:
    'START@300 BLOCKED: initialVillagers clamp 4-120. Grow capacity OK if maxPopulation>=300. Organic 300 UNPROVEN.',
}

export const ALL_SCALE_PRESETS: ScaleTierPreset[] = [
  SEC20_INDIVIDUAL_START,
  SEC20_INDIVIDUAL_GROW,
  SEC20_SOCIAL_GROW,
]

export type ScaleCapacityReport = {
  suite: SuiteId
  status: ScaleCapacityStatus
  /** Honesty label for harness — never EMERGENCE PASS */
  evidenceResult: EvidenceResult
  resolvedInitial: number
  resolvedMaxPop: number
  requestedInitial: number
  requestedMaxPop: number
  floorPop: number
  canStartAtFloor: boolean
  canGrowWithinCap: boolean
  clamps: typeof SCALE_CLAMPS
  violations: string[]
  note: string
}

/** Resolve config through simConfig clamps; report capacity vs sec20 floor. */
export function assessScaleCapacity(
  suite: SuiteId,
  input?: SimConfigInput,
): ScaleCapacityReport {
  const floor = SEC20_FLOORS[suite]
  const floorPop = floor.minPopulation
  const requestedInitial = input?.initialVillagers ?? 26
  const requestedMaxPop = input?.maxPopulation ?? 250
  const resolved = resolveSimConfig(input ?? { preset: 'standard' })
  const violations: string[] = []

  const canStartAtFloor = floorPop <= 0 || resolved.initialVillagers >= floorPop
  const canGrowWithinCap = floorPop <= 0 || resolved.maxPopulation >= floorPop

  if (floorPop > 0 && requestedInitial >= floorPop && resolved.initialVillagers < floorPop) {
    violations.push(
      `initialVillagers requested ${requestedInitial} clamped to ${resolved.initialVillagers} (max ${SCALE_CLAMPS.initialVillagersMax}) — cannot START at floor ${floorPop}`,
    )
  }
  if (floorPop > 0 && requestedInitial > SCALE_CLAMPS.initialVillagersMax) {
    violations.push(
      `START@${requestedInitial} BLOCKED capacite: initialVillagers clamp max=${SCALE_CLAMPS.initialVillagersMax}`,
    )
  }
  if (floorPop > 0 && !canGrowWithinCap) {
    violations.push(
      `maxPopulation ${resolved.maxPopulation} < floor ${floorPop} — grow path BLOCKED capacite`,
    )
  }

  let status: ScaleCapacityStatus
  let evidenceResult: EvidenceResult
  let note: string

  if (floorPop <= 0) {
    status = 'READY'
    evidenceResult = 'NOT_TESTED'
    note = `${suite}: no population floor; duration/seeds still gate EMERGENCE`
  } else if (canStartAtFloor) {
    status = 'READY'
    evidenceResult = 'NOT_TESTED'
    note = `${suite}: START@${resolved.initialVillagers} meets floor ${floorPop} (within clamp). Soak not run — NOT_TESTED, not PASS.`
  } else if (canGrowWithinCap) {
    status = 'UNPROVEN_GROW'
    const startBlockedByClamp = requestedInitial > SCALE_CLAMPS.initialVillagersMax
    evidenceResult = startBlockedByClamp ? 'BLOCKED' : 'NOT_TESTED'
    note = startBlockedByClamp
      ? `${suite}: BLOCKED capacite START@${requestedInitial} (initialVillagers clamp max=${SCALE_CLAMPS.initialVillagersMax} -> resolved ${resolved.initialVillagers}). Grow cap ${resolved.maxPopulation}>=${floorPop} OK but organic reach UNPROVEN. != FAIL emergence.`
      : `${suite}: cannot START at ${floorPop} (initial=${resolved.initialVillagers}, clamp max=${SCALE_CLAMPS.initialVillagersMax}); grow cap ${resolved.maxPopulation}>=${floorPop} — capacity OK, organic reach UNPROVEN. != FAIL emergence.`
  } else {
    status = 'BLOCKED'
    evidenceResult = 'BLOCKED'
    note = `${suite}: BLOCKED capacite — cannot start (${resolved.initialVillagers}<${floorPop}) and maxPopulation ${resolved.maxPopulation}<${floorPop}. != FAIL emergence.`
  }

  return {
    suite,
    status,
    evidenceResult,
    resolvedInitial: resolved.initialVillagers,
    resolvedMaxPop: resolved.maxPopulation,
    requestedInitial,
    requestedMaxPop,
    floorPop,
    canStartAtFloor,
    canGrowWithinCap,
    clamps: SCALE_CLAMPS,
    violations,
    note,
  }
}

/** Assess built-in WP12 presets. */
export function assessAllScalePresets(): Array<{
  preset: ScaleTierPreset
  capacity: ScaleCapacityReport
}> {
  return ALL_SCALE_PRESETS.map((preset) => ({
    preset,
    capacity: assessScaleCapacity(preset.suite, preset.config),
  }))
}

/** Social start@300 explicit BLOCKED check with exact clamp numbers. */
export function assessSocialStart300Blocked(): ScaleCapacityReport {
  return assessScaleCapacity('social', {
    preset: 'vast',
    initialVillagers: 300,
    maxPopulation: 400,
    worldSize: 1200,
  })
}

export function formatScaleCapacityReport(r: ScaleCapacityReport): string {
  const lines = [
    `suite=${r.suite} status=${r.status} evidence=${r.evidenceResult}`,
    `  floorPop=${r.floorPop} resolved initial=${r.resolvedInitial} maxPop=${r.resolvedMaxPop}`,
    `  requested initial=${r.requestedInitial} maxPop=${r.requestedMaxPop}`,
    `  canStartAtFloor=${r.canStartAtFloor} canGrowWithinCap=${r.canGrowWithinCap}`,
    `  clamps initialVillagers ${r.clamps.initialVillagersMin}..${r.clamps.initialVillagersMax}; maxPopulation <=${r.clamps.maxPopulationHardCap}`,
    `  note: ${r.note}`,
  ]
  if (r.violations.length) {
    for (const v of r.violations) lines.push(`  violation: ${v}`)
  }
  return lines.join('\n')
}