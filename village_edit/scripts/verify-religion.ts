/**
 * Religion / creed verification — run from village_edit:
 *   npx tsx scripts/verify-religion.ts
 *
 * Proves ≥1 French religion chronicle event by day 30–60 on at least one seed.
 */
import { createSimulation, stepSimulation } from '../src/lib/sim/engine'
import { TICKS_PER_DAY } from '../src/lib/sim/calendar'
import { politicsOf } from '../src/lib/sim/politics'
import { isReligionChronicleLine } from '../src/lib/sim/religion'
import { peekMind } from '../src/lib/sim/cognition/mindPool'

const seeds = [1, 2, 3, 7, 42]
const days = 60

type SeedResult = {
  seed: number
  firstDay: number | null
  lateEvents: number
  eventCount: number
  creeds: number
  faithCircles: number
  shrines: number
  gourous: number
  ok: boolean
  sample: string[]
}

const results: SeedResult[] = []

for (const seed of seeds) {
  const state = createSimulation(seed)
  const seen = new Set<string>()
  const events: string[] = []
  let firstDay: number | null = null
  let lateEvents = 0

  for (let t = 1; t <= days * TICKS_PER_DAY; t++) {
    stepSimulation(state)
    const day = Math.ceil(t / TICKS_PER_DAY)
    // Log is capped (~120): length may stay flat while new lines shift in.
    for (const line of state.log) {
      if (seen.has(line)) continue
      seen.add(line)
      if (!isReligionChronicleLine(line)) continue
      events.push(`[j${day}] ${line}`)
      if (firstDay === null) firstDay = day
      if (day >= 30 && day <= 60) lateEvents++
    }
  }

  let creeds = 0
  let gourous = 0
  for (const v of state.villagers) {
    if (!v.alive) continue
    if (politicsOf(v).creed) creeds++
    const mind = peekMind(v.id)
    if (mind?.livelihood?.roleTag === 'gourou' || mind?.livelihood?.roleTag === 'pretre') gourous++
  }
  const faithCircles = state.circles.filter((c) => c.kind === 'faith').length
  const shrines = state.villages.filter((g) => g.hasShrine).length
  const ok =
    firstDay !== null &&
    firstDay <= 60 &&
    (lateEvents > 0 || creeds > 0 || faithCircles > 0 || shrines > 0)

  const row: SeedResult = {
    seed,
    firstDay,
    lateEvents,
    eventCount: events.length,
    creeds,
    faithCircles,
    shrines,
    gourous,
    ok,
    sample: events.filter((e) => /^\[j(3[0-9]|[4-5][0-9]|60)\]/.test(e)).slice(0, 3).length
      ? events.filter((e) => /^\[j(3[0-9]|[4-5][0-9]|60)\]/.test(e)).slice(0, 3)
      : events.slice(0, 3),
  }
  results.push(row)
  console.log(JSON.stringify(row))
}

const pass = results.some((r) => r.ok && r.lateEvents > 0)
if (!pass) {
  console.error('FAIL: no religion chronicle event in day 30–60 window on any seed')
  process.exit(1)
}

console.log(
  JSON.stringify({
    pass: true,
    seedsOk: results.filter((r) => r.ok && r.lateEvents > 0).map((r) => r.seed),
    best: results
      .filter((r) => r.ok && r.lateEvents > 0)
      .sort((a, b) => b.lateEvents - a.lateEvents)[0],
  }),
)
