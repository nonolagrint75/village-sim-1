/**
 * Butterfly / multi-seed determinism probe.
 * npx tsx scripts/_probe_atlas_butterfly.ts
 */
import { createSimulation, stepSimulation, computeStats } from '../src/lib/sim/engine'
import { firmsSummary } from '../src/lib/sim/economy/business'
import { warsSummary } from '../src/lib/sim/war'

const DAYS = 12
const TPD = 72
const ticks = DAYS * TPD

function fingerprint(seed: number) {
  const state = createSimulation(seed)
  for (let i = 0; i < ticks; i++) stepSimulation(state)
  const st = computeStats(state)
  const firms = firmsSummary(state)
  const wars = warsSummary(state)
  const mines = state.villages.filter((v) => v.hasMine).length
  return {
    seed,
    pop: st.villagers,
    villages: st.villages,
    roads: st.roadTiles,
    markets: st.markets,
    mines,
    sells: firms.sells,
    produces: firms.produces,
    bandits: state.bandits.filter((b) => b.alive).length,
    coups: wars.coups,
    battles: wars.battles,
    deaths: st.deaths,
    logLen: state.log.length,
  }
}

function key(fp: ReturnType<typeof fingerprint>) {
  return `${fp.pop}|${fp.villages}|${fp.roads}|${fp.markets}|${fp.mines}|${fp.sells}|${fp.bandits}|${fp.coups}|${fp.battles}|${fp.deaths}|${fp.logLen}`
}

const a1 = fingerprint(7)
const a2 = fingerprint(7)
const b = fingerprint(1)
const c = fingerprint(3)

const sameSeedMatch = key(a1) === key(a2)
const multiDiverge = key(a1) !== key(b) && key(a1) !== key(c) && key(b) !== key(c)

const report = {
  days: DAYS,
  sameSeed: { a1, a2, match: sameSeedMatch },
  multiSeed: { s7: a1, s1: b, s3: c, diverge: multiDiverge },
  verdict: {
    determinism: sameSeedMatch ? 'PASS' : 'FAIL',
    butterfly: multiDiverge ? 'PASS' : 'WEAK',
  },
}
console.log(JSON.stringify(report, null, 2))
if (!sameSeedMatch) process.exit(1)
