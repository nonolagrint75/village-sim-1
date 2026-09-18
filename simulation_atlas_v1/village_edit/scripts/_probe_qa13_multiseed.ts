/**
 * QA Agent 13 — in-memory multi-seed smoke (report only).
 * Uses createSim + runTicks harness; no gameplay changes.
 */
import { computeStats } from '../src/lib/sim/engine'
import { FENCE, TUNNEL } from '../src/lib/sim/types'
import { createSim, fingerprint, runTicks } from '../src/lib/sim/test/harness'

const SEEDS = [7, 42, 100, 999]
const HORIZON = 1000
const REPRO_SEED = 7
const REPRO_TICKS = 500

function countTerrain(terrain: Uint8Array, code: number): number {
  let n = 0
  for (let i = 0; i < terrain.length; i++) if (terrain[i] === code) n++
  return n
}

function runSeed(seed: number, ticks: number) {
  const state = createSim(seed)
  runTicks(state, ticks)
  const stats = computeStats(state)
  const stoneTools = state.villagers.filter((v) => v.alive && v.toolTier === 'stone').length
  const ironTools = state.villagers.filter((v) => v.alive && v.toolTier === 'iron').length
  const fenceTiles = countTerrain(state.grid.terrain, FENCE)
  const tunnelTiles = countTerrain(state.grid.terrain, TUNNEL)
  const miners = stats.professions.miner ?? 0
  return {
    seed,
    ticks: state.tick,
    alive: stats.villagers,
    houses: stats.houses,
    pens: stats.pens,
    fenceTiles,
    stoneTools,
    ironTools,
    tunnelTiles,
    miners,
    kingdoms: stats.kingdoms,
    chiefdoms: stats.chiefdoms,
    polities: stats.polities,
    deaths: stats.deaths,
    births: stats.births,
    fingerprint: fingerprint(state),
  }
}

console.log(JSON.stringify({ agent: 13, horizon: HORIZON, seeds: SEEDS }, null, 2))

const rows = []
for (const seed of SEEDS) {
  const t0 = Date.now()
  const row = runSeed(seed, HORIZON)
  rows.push({ ...row, ms: Date.now() - t0 })
  console.log(
    `seed=${row.seed} alive=${row.alive} houses=${row.houses} pens=${row.pens} fence=${row.fenceTiles} stoneTools=${row.stoneTools} tunnels=${row.tunnelTiles} miners=${row.miners} kingdoms=${row.kingdoms} chiefdoms=${row.chiefdoms} polities=${row.polities} deaths=${row.deaths} ms=${rows[rows.length - 1].ms}`,
  )
}

const a = createSim(REPRO_SEED)
const b = createSim(REPRO_SEED)
runTicks(a, REPRO_TICKS)
runTicks(b, REPRO_TICKS)
const fpA = fingerprint(a)
const fpB = fingerprint(b)
const repro = {
  seed: REPRO_SEED,
  ticks: REPRO_TICKS,
  fpA,
  fpB,
  match: fpA === fpB,
}

console.log(JSON.stringify({ results: rows, determinism_repro_500: repro }, null, 2))
