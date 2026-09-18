/**
 * AGENT 11 -- baseline perf probe (measure-only).
 *   npx tsx scripts/_probe_perf_a11.ts
 *
 * Does NOT edit gameplay. Phase sample uses a local instrumented mirror of
 * engine.stepSimulation (timers in this script only).
 */
import { performance } from 'node:perf_hooks'
import { createSimulation, stepSimulation } from '../src/lib/sim/engine'
import {
  tickCombat,
  tickFamine,
  tickFields,
  tickHorse,
  tickHorseBreeding,
  tickRegrowth,
  tickReproduction,
  tickSheep,
  tickTrade,
  tickVillageEconomy,
  tickVillager,
  tickWolf,
  tickWolfReproduction,
  checkRoadMilestones,
} from '../src/lib/sim/behaviors'
import { tickMarketPrices, tickUrbanNetwork } from '../src/lib/sim/commerce'
import { tickAncestorMemory, tickLineages } from '../src/lib/sim/family'
import { tickAdoption, tickMarriage } from '../src/lib/sim/marriage'
import { tickBuildProjects } from '../src/lib/sim/construction'
import { tickWorkOrders } from '../src/lib/sim/build/workOrders'
import { tickTechnology } from '../src/lib/sim/technology'
import { tickEthnosWorld } from '../src/lib/sim/ethnos'
import { tickPolitics } from '../src/lib/sim/politics'
import { tickBandits } from '../src/lib/sim/bandits'
import { tickClimate } from '../src/lib/sim/climate'
import { tickRoadWear } from '../src/lib/sim/roads'
import { compactIndex } from '../src/lib/sim/resourceIndex'
import { resetPathBudget } from '../src/lib/sim/pathfinding'
import { agentHash } from '../src/lib/sim/kernels'
import { getSimPerfBudget, setAliveAgentCount, setCrisisDeepPressure } from '../src/lib/sim/perfBudget'
import { feelFamine } from '../src/lib/sim/ecology'
import { mindOf } from '../src/lib/sim/cognition'
import { seasonFromTick, yearFromTick } from '../src/lib/sim/calendar'
import { bindEmergenceState } from '../src/lib/sim/build/emergenceMetrics'
import { bindDecisionLedger } from '../src/lib/sim/decisionLedger'
import { bindAttributionMetrics } from '../src/lib/sim/attributionMetrics'
import { bindBehaviorSeqMetrics } from '../src/lib/sim/behaviorSequenceMetrics'
import { makeRng } from '../src/lib/sim/world'
import {
  getSimConfig,
  INITIAL_VILLAGERS_MAX,
  resolveSimConfig,
  type SimConfigInput,
} from '../src/lib/sim/simConfig'
import type { SimState } from '../src/lib/sim/types'

const SEED = 7

type PhaseKey =
  | 'bind_hash'
  | 'climate_famine'
  | 'commerce'
  | 'villagers'
  | 'trade_family'
  | 'fields'
  | 'fauna_boats'
  | 'combat_bandits'
  | 'regrowth_roads'
  | 'politics'
  | 'build_orders'
  | 'tech_lineage_ethnos'
  | 'compact_sweep'

const PHASE_KEYS: PhaseKey[] = [
  'bind_hash',
  'climate_famine',
  'commerce',
  'villagers',
  'trade_family',
  'fields',
  'fauna_boats',
  'combat_bandits',
  'regrowth_roads',
  'politics',
  'build_orders',
  'tech_lineage_ethnos',
  'compact_sweep',
]

function now(): number {
  return performance.now()
}

function fmt(n: number, d = 3): string {
  return n.toFixed(d)
}

/** Same WeakMap pattern as engine.stepRngFor (probe-local copy). */
const stepRngByState = new WeakMap<SimState, () => number>()
function stepRngFor(state: SimState): () => number {
  let r = stepRngByState.get(state)
  if (!r) {
    r = makeRng(42)
    stepRngByState.set(state, r)
  }
  return r
}

function tickBoatsLocal(state: SimState): void {
  for (const b of state.boats) {
    if (!b.alive || b.ownerId === null) continue
    let owner = null as (typeof state.villagers)[0] | null
    const oid = b.ownerId
    for (let i = 0; i < state.villagers.length; i++) {
      const v = state.villagers[i]
      if (v.id === oid && v.alive) {
        owner = v
        break
      }
    }
    if (owner?.embarked) {
      b.x = owner.x
      b.y = owner.y
    }
  }
}

function emptyPhases(): Record<PhaseKey, number> {
  const o = {} as Record<PhaseKey, number>
  for (const k of PHASE_KEYS) o[k] = 0
  return o
}

/** Instrumented mirror of engine.stepSimulation -- probe-only. */
function instrumentedStep(state: SimState, acc: Record<PhaseKey, number>): void {
  const mark = (k: PhaseKey, fn: () => void) => {
    const t0 = now()
    fn()
    acc[k] += now() - t0
  }

  mark('bind_hash', () => {
    bindEmergenceState(state)
    bindDecisionLedger(state)
    bindAttributionMetrics(state)
    bindBehaviorSeqMetrics(state)
    state.tick += 1
    let aliveAgents = 0
    for (let i = 0; i < state.villagers.length; i++) {
      if (state.villagers[i].alive) aliveAgents++
    }
    resetPathBudget(aliveAgents)
    setAliveAgentCount(aliveAgents)
    agentHash.rebuild(state)
    state.season = seasonFromTick(state.tick)
    state.year = yearFromTick(state.tick)
  })

  mark('climate_famine', () => {
    tickClimate(state, stepRngFor(state))
    if (state.tick % 40 === 0) {
      tickFamine(state)
      setCrisisDeepPressure(!!state.famine || state.villages.some((vg) => feelFamine(state, vg)))
    } else if (state.famine) {
      setCrisisDeepPressure(true)
    }
  })

  mark('commerce', () => {
    const commerceEvery = Math.max(200, Math.round(300 * getSimPerfBudget().commercePeriodMul))
    if (state.tick % commerceEvery === 0) {
      tickVillageEconomy(state)
      tickUrbanNetwork(state)
      tickMarketPrices(state)
    }
  })

  mark('villagers', () => {
    for (let vi = 0; vi < state.villagers.length; vi++) {
      const v = state.villagers[vi]
      if (v.alive) tickVillager(state, v, stepRngFor(state))
    }
  })

  mark('trade_family', () => {
    tickTrade(state)
    tickMarriage(state, stepRngFor(state))
    tickReproduction(state, stepRngFor(state))
    tickAdoption(state, stepRngFor(state))
  })

  mark('fields', () => {
    tickFields(state)
  })

  mark('fauna_boats', () => {
    for (let si = 0; si < state.sheep.length; si++) {
      const s = state.sheep[si]
      if (s.alive && ((state.tick + s.id) & 1) === 0) tickSheep(state, s, stepRngFor(state))
    }
    if (state.tick % 2 === 0) {
      for (let hi = 0; hi < state.horses.length; hi++) {
        const h = state.horses[hi]
        if (h.alive) tickHorse(state, h, stepRngFor(state))
      }
    }
    tickBoatsLocal(state)
    for (let wi = 0; wi < state.wolves.length; wi++) {
      const w = state.wolves[wi]
      if (w.alive) tickWolf(state, w, stepRngFor(state))
    }
  })

  mark('combat_bandits', () => {
    tickCombat(state, stepRngFor(state))
    tickBandits(state, stepRngFor(state))
    if (state.tick % 3 === 0) {
      tickWolfReproduction(state)
      tickHorseBreeding(state)
    }
  })

  mark('regrowth_roads', () => {
    tickRegrowth(state, stepRngFor(state))
    if (state.tick % 4 === 0) tickRoadWear(state.grid, state.tick)
    if (state.tick % 60 === 0) checkRoadMilestones(state)
  })

  mark('politics', () => {
    tickPolitics(state)
  })

  mark('build_orders', () => {
    tickBuildProjects(state)
    tickWorkOrders(state)
  })

  mark('tech_lineage_ethnos', () => {
    tickTechnology(state, stepRngFor(state))
    tickLineages(state, stepRngFor(state))
    tickAncestorMemory(state)
    tickEthnosWorld(state, stepRngFor(state), (v) => {
      const mind = mindOf(v)
      return { cultureTag: mind.cultureTag, rivalId: mind.rivalId }
    })
  })

  mark('compact_sweep', () => {
    if (state.tick % 4 === 0) {
      state.compactCursor = compactIndex(state.grid.index, state.grid, state.compactCursor)
    }
    if (state.tick % 200 === 0) {
      state.villagers = state.villagers.filter((v) => v.alive)
      state.sheep = state.sheep.filter((s) => s.alive)
      state.horses = state.horses.filter((h) => h.alive)
      state.wolves = state.wolves.filter((w) => w.alive)
      state.boats = state.boats.filter((b) => b.alive)
      state.bandits = state.bandits.filter((b) => b.alive)
    }
  })
}

function runTimed(label: string, config: SimConfigInput, ticks: number, warmup = 30) {
  const resolved = resolveSimConfig({ ...config, seed: SEED })
  const tCreate0 = now()
  const state = createSimulation(SEED, config)
  const createMs = now() - tCreate0
  const aliveStart = state.villagers.filter((v) => v.alive).length
  for (let i = 0; i < warmup; i++) stepSimulation(state)
  const t0 = now()
  for (let i = 0; i < ticks; i++) stepSimulation(state)
  const totalMs = now() - t0
  const aliveEnd = state.villagers.filter((v) => v.alive).length
  return {
    label,
    requested: config,
    resolved,
    ticks,
    warmup,
    createMs,
    totalMs,
    msPerTick: totalMs / ticks,
    aliveStart,
    aliveEnd,
    finalTick: state.tick,
  }
}

function runPhaseSample(config: SimConfigInput, warmup: number, sampleTicks: number) {
  const state = createSimulation(SEED, config)
  for (let i = 0; i < warmup; i++) stepSimulation(state)

  const tFull0 = now()
  for (let i = 0; i < sampleTicks; i++) stepSimulation(state)
  const msPerTickFull = (now() - tFull0) / sampleTicks

  const state3 = createSimulation(SEED, config)
  for (let i = 0; i < warmup; i++) stepSimulation(state3)
  const acc = emptyPhases()
  for (let i = 0; i < sampleTicks; i++) instrumentedStep(state3, acc)
  const phaseTotal = PHASE_KEYS.reduce((s, k) => s + acc[k], 0)
  const ranked = PHASE_KEYS
    .map((k) => ({
      phase: k,
      ms: +fmt(acc[k], 2),
      pct: phaseTotal > 0 ? +fmt((100 * acc[k]) / phaseTotal, 1) : 0,
    }))
    .filter((r) => r.ms > 0)
    .sort((a, b) => b.ms - a.ms)

  return {
    warmup,
    sampleTicks,
    msPerTickFull: +fmt(msPerTickFull),
    phaseRanked: ranked.slice(0, 8),
    dominant: ranked[0] ?? null,
  }
}

console.log('=== AGENT 11 perf baseline (nono_simu_2d / village_edit) ===')
console.log(`seed=${SEED}  INITIAL_VILLAGERS_MAX=${INITIAL_VILLAGERS_MAX}`)
console.log('')

const cfg36: SimConfigInput = {
  initialVillagers: 36,
  maxPopulation: 80,
  worldSize: 600,
  preset: 'standard',
  wolfCount: 3,
}

const cfg100: SimConfigInput = {
  initialVillagers: 100,
  maxPopulation: 200,
  worldSize: 600,
  preset: 'standard',
  wolfCount: 3,
}

const a = runTimed('A_36v_500t', cfg36, 500)
console.log('--- A: seed 7, 36 villagers, 500 ticks ---')
console.log(
  JSON.stringify(
    {
      msPerTick: +fmt(a.msPerTick),
      totalMs: +fmt(a.totalMs, 1),
      createMs: +fmt(a.createMs, 1),
      ticks: a.ticks,
      warmupDiscarded: a.warmup,
      aliveStart: a.aliveStart,
      aliveEnd: a.aliveEnd,
      finalTick: a.finalTick,
      configRequested: a.requested,
      configResolved: {
        initialVillagers: a.resolved.initialVillagers,
        maxPopulation: a.resolved.maxPopulation,
        worldSize: a.resolved.worldSize,
        wolfCount: a.resolved.wolfCount,
        preset: a.resolved.preset,
      },
    },
    null,
    2,
  ),
)

const b = runTimed('B_100v_300t', cfg100, 300)
console.log('--- B: seed 7, 100 villagers (if allowed), 300 ticks ---')
console.log(
  JSON.stringify(
    {
      msPerTick: +fmt(b.msPerTick),
      totalMs: +fmt(b.totalMs, 1),
      createMs: +fmt(b.createMs, 1),
      ticks: b.ticks,
      warmupDiscarded: b.warmup,
      aliveStart: b.aliveStart,
      aliveEnd: b.aliveEnd,
      finalTick: b.finalTick,
      configRequested: b.requested,
      configResolved: {
        initialVillagers: b.resolved.initialVillagers,
        maxPopulation: b.resolved.maxPopulation,
        worldSize: b.resolved.worldSize,
        wolfCount: b.resolved.wolfCount,
        preset: b.resolved.preset,
      },
      note:
        b.resolved.initialVillagers !== 100
          ? `clamped to ${b.resolved.initialVillagers} (max ${INITIAL_VILLAGERS_MAX})`
          : '100 accepted (under INITIAL_VILLAGERS_MAX=120)',
    },
    null,
    2,
  ),
)

console.log('--- scale ---')
const ratioPop = b.aliveStart / Math.max(1, a.aliveStart)
const ratioMs = b.msPerTick / Math.max(1e-9, a.msPerTick)
console.log(
  JSON.stringify(
    {
      popRatio_B_over_A: +fmt(ratioPop, 2),
      msPerTickRatio_B_over_A: +fmt(ratioMs, 2),
      hint:
        ratioMs > ratioPop * 0.7
          ? 'ms/tick scales roughly with villager count -> per-villager loop likely dominates'
          : 'ms/tick does not scale fully with pop -> fixed world/systems cost material',
    },
    null,
    2,
  ),
)

console.log('--- phase sample (instrumented mirror, cfg36, warmup 80 + 120 ticks) ---')
const sample = runPhaseSample(cfg36, 80, 120)
console.log(JSON.stringify(sample, null, 2))

console.log('')
console.log('FILES TOUCHED: scripts/_probe_perf_a11.ts only')
console.log('GAMEPLAY EDITS: none')
console.log('activeConfig:', JSON.stringify(getSimConfig()))
