/**
 * A14 probe: generation depth + death cause spikes for seeds 1,3,5,7,9 @ 90d.
 */
import { writeFileSync } from "node:fs"
import { createSimulation, stepSimulation, computeStats } from "../src/lib/sim/engine"
import { TICKS_PER_DAY, TICKS_PER_YEAR } from "../src/lib/sim/calendar"
import type { Villager } from "../src/lib/sim/types"

const seeds = [1, 3, 5, 7, 9]
const days = 90

function genDepth(
  v: Villager,
  byId: Map<number, Villager>,
  memo: Map<number, number>,
  visiting: Set<number>,
): number {
  if (memo.has(v.id)) return memo.get(v.id)!
  if (visiting.has(v.id)) return 0
  visiting.add(v.id)
  const parents = v.parentIds.map((id) => byId.get(id)).filter(Boolean) as Villager[]
  const d = parents.length === 0 ? 0 : 1 + Math.max(...parents.map((p) => genDepth(p, byId, memo, visiting)))
  visiting.delete(v.id)
  memo.set(v.id, d)
  return d
}

type DayRow = {
  day: number
  pop: number
  births: number
  deaths: number
  dDelta: number
  banditDelta: number
  wolfDelta: number
  bands: number
  bandits: number
  guilds: number
}

const out: unknown[] = []

for (const seed of seeds) {
  const state = createSimulation(seed, { worldSize: 600, seed })
  const ticks = days * TICKS_PER_DAY
  let lastDeaths = 0
  let lastBandit = 0
  let lastWolf = 0
  const curve: DayRow[] = []
  const deathSpikes: DayRow[] = []

  for (let t = 1; t <= ticks; t++) {
    stepSimulation(state)
    if (t % TICKS_PER_DAY !== 0) continue
    const s = computeStats(state)
    const day = t / TICKS_PER_DAY
    const row: DayRow = {
      day,
      pop: s.villagers,
      births: s.births,
      deaths: s.deaths,
      dDelta: s.deaths - lastDeaths,
      banditDelta: s.deathsByBandit - lastBandit,
      wolfDelta: (s.deathsByWolf ?? 0) - lastWolf,
      bands: state.bands?.length ?? 0,
      bandits: s.bandits,
      guilds: state.circles.filter((c) => c.isGuild).length,
    }
    lastDeaths = s.deaths
    lastBandit = s.deathsByBandit
    lastWolf = s.deathsByWolf ?? 0
    if (day === 30 || day === 60 || day === 90) curve.push(row)
    if (row.dDelta >= 2) deathSpikes.push(row)
  }

  const byId = new Map(state.villagers.map((v) => [v.id, v]))
  const memo = new Map<number, number>()
  const alive = state.villagers.filter((v) => v.alive)
  const histAlive: Record<number, number> = {}
  const histAll: Record<number, number> = {}
  let maxAlive = 0
  let maxAll = 0
  let bornAlive = 0
  let bornAll = 0
  for (const v of alive) {
    const g = genDepth(v, byId, memo, new Set())
    maxAlive = Math.max(maxAlive, g)
    histAlive[g] = (histAlive[g] ?? 0) + 1
    if (v.parentIds.length) bornAlive++
  }
  for (const v of state.villagers) {
    const g = genDepth(v, byId, memo, new Set())
    maxAll = Math.max(maxAll, g)
    histAll[g] = (histAll[g] ?? 0) + 1
    if (v.parentIds.length) bornAll++
  }
  const s = computeStats(state)
  const ages = alive.map((v) => v.age / TICKS_PER_YEAR)
  const meanAge = ages.reduce((a, b) => a + b, 0) / Math.max(1, ages.length)

  const deathRe = new RegExp("meurt|mort|tue|famine|faim|loup|bandit|vieill", "i")
  const deathLines = state.log.filter((l) => deathRe.test(l)).slice(-40)

  const row = {
    seed,
    end: {
      pop: s.villagers,
      births: s.births,
      deaths: s.deaths,
      deathsByBandit: s.deathsByBandit,
      deathsByWolf: s.deathsByWolf ?? 0,
      guilds: state.circles.filter((c) => c.isGuild).length,
      villages: s.villages,
    },
    gen: { maxAlive, maxAll, histAlive, histAll, bornAlive, bornAll },
    meanAgeYears: +meanAge.toFixed(2),
    checkpoints: curve,
    deathSpikes: deathSpikes.slice(0, 25),
    deathLinesSample: deathLines.slice(0, 15),
  }
  out.push(row)
  console.log(
    "seed " + seed + " pop=" + s.villagers + " births=" + s.births + " deaths=" + s.deaths +
    " banditD=" + s.deathsByBandit + " wolfD=" + (s.deathsByWolf ?? 0) +
    " maxGen=" + maxAll + " born=" + bornAll + " guilds=" + row.end.guilds,
  )
  console.log(
    "  spikes: " + deathSpikes.map((d) => "d" + d.day + ":" + d.dDelta + "(b" + d.banditDelta + "/w" + d.wolfDelta + ")").join(" "),
  )
}

writeFileSync("scripts/_probe_a14_gens.json", JSON.stringify(out, null, 2), "utf8")
console.log("Wrote scripts/_probe_a14_gens.json")