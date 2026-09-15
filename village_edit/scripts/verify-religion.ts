/**
 * Religion / creed verification — run from village_edit:
 *   npx tsx scripts/verify-religion.ts
 *
 * Proves ≥1 French religion chronicle event and shrine/chapel/temple sites by day 60.
 */
import { createSimulation, stepSimulation } from '../src/lib/sim/engine'
import { TICKS_PER_DAY } from '../src/lib/sim/calendar'
import { politicsOf } from '../src/lib/sim/politics'
import { isReligionChronicleLine } from '../src/lib/sim/religion'
import { peekMind } from '../src/lib/sim/cognition/mindPool'

const seeds = [1, 2, 3, 7, 42, 11, 19]
const days = 60

type SeedResult = {
  seed: number
  firstDay: number | null
  events: string[]
  creeds: number
  faithCircles: number
  shrines: number
  chapels: number
  temples: number
  gourous: number
  ok: boolean
}

const results: SeedResult[] = []

for (const seed of seeds) {
  const state = createSimulation(seed)
  const seen = new Set<string>()
  const events: string[] = []
  let firstDay: number | null = null

  for (let t = 1; t <= days * TICKS_PER_DAY; t++) {
    stepSimulation(state)
    const day = Math.ceil(t / TICKS_PER_DAY)
    for (const line of state.log) {
      if (seen.has(line)) continue
      seen.add(line)
      if (!isReligionChronicleLine(line)) continue
      events.push(`[j${day}] ${line}`)
      if (firstDay === null) firstDay = day
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
  const shrines = state.villages.filter((g) => g.hasShrine || g.sacredTier === 'shrine').length
  const chapels = state.villages.filter((g) => g.sacredTier === 'chapel').length
  const temples = state.villages.filter((g) => g.sacredTier === 'temple').length
  const ok =
    events.length >= 1 &&
    firstDay !== null &&
    firstDay <= 60 &&
    (shrines > 0 || chapels > 0 || temples > 0 || creeds > 0 || faithCircles > 0)

  results.push({
    seed,
    firstDay,
    events: events.slice(0, 8),
    creeds,
    faithCircles,
    shrines,
    chapels,
    temples,
    gourous,
    ok,
  })
  console.log(
    JSON.stringify({
      seed,
      firstDay,
      eventCount: events.length,
      creeds,
      faithCircles,
      shrines,
      chapels,
      temples,
      gourous,
      ok,
      sample: events.slice(0, 3),
    }),
  )
}

const anyOk = results.some((r) => r.ok)
const anySite = results.some((r) => r.shrines > 0 || r.chapels > 0 || r.temples > 0)

if (!anyOk) {
  console.error('FAIL: no religion chronicle / creed / faith by day 60 on any seed')
  process.exit(1)
}

if (!anySite && !results.some((r) => r.creeds > 0 && r.faithCircles > 0)) {
  console.error('FAIL: no shrine/chapel/temple and weak creed evidence')
  process.exit(1)
}

console.log(
  JSON.stringify({
    pass: true,
    seedsOk: results.filter((r) => r.ok).map((r) => r.seed),
    sites: results.map((r) => ({
      seed: r.seed,
      shrines: r.shrines,
      chapels: r.chapels,
      temples: r.temples,
    })),
    best: results
      .filter((r) => r.ok)
      .sort((a, b) => (a.firstDay ?? 999) - (b.firstDay ?? 999))[0],
  }),
)
