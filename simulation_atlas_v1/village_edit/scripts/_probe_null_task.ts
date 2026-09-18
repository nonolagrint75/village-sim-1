/**
 * Measure null-task % and micro-fail thrash.
 *   npx tsx scripts/_probe_null_task.ts [seed] [days]
 */
import { createSimulation, stepSimulation } from '../src/lib/sim/engine'
import { TICKS_PER_DAY } from '../src/lib/sim/calendar'
import { edibleValue } from '../src/lib/sim/inventory'
import type { TaskKind } from '../src/lib/sim/types'

const seed = Number(process.argv[2] ?? 42)
const days = Number(process.argv[3] ?? 8)
const ticks = days * TICKS_PER_DAY

const state = createSimulation(seed)
let aliveSamples = 0
let nullSamples = 0
let hungryNullWithFood = 0 // hunger<2.35, has food, task null — interrupt can't fire
let nightNull = 0
let microCompletions = 0
let leisureMicro = 0
const prev = new Map<number, { kind: TaskKind | null; age: number; work: number }>()

for (let t = 1; t <= ticks; t++) {
  stepSimulation(state)
  const night = ((state.tick % TICKS_PER_DAY) + TICKS_PER_DAY) % TICKS_PER_DAY >= TICKS_PER_DAY * 0.7 // rough; isNight preferred
  for (const v of state.villagers) {
    if (!v.alive) continue
    aliveSamples++
    const kind = v.task?.kind ?? null
    if (!kind) {
      nullSamples++
      if (v.hunger < 2.35 && edibleValue(v.inventory) > 0) hungryNullWithFood++
      // night via calendar hour would be better; count when tick in night band
      const tod = state.tick % TICKS_PER_DAY
      if (tod >= 20 * 3 || tod < 6 * 3) nightNull++ // TICKS_PER_HOUR=3 typically
    }
    const p = prev.get(v.id)
    if (p?.kind && !kind) {
      if (p.age <= 2 && p.work <= 0) {
        microCompletions++
        if (
          p.kind === 'socialise' ||
          p.kind === 'giveFood' ||
          p.kind === 'entertain' ||
          p.kind === 'counsel' ||
          p.kind === 'teachCraft'
        ) {
          leisureMicro++
        }
      }
    }
    prev.set(v.id, {
      kind,
      age: v.task?.ageTicks ?? 0,
      work: v.task?.work ?? 0,
    })
  }
}

const nullPct = (100 * nullSamples) / Math.max(1, aliveSamples)
const hungryNullPct = (100 * hungryNullWithFood) / Math.max(1, aliveSamples)
console.log(
  JSON.stringify(
    {
      seed,
      days,
      aliveSamples,
      nullSamples,
      nullPct: Number(nullPct.toFixed(2)),
      hungryNullWithFood,
      hungryNullPct: Number(hungryNullPct.toFixed(2)),
      nightNull,
      microCompletions,
      leisureMicro,
      alive: state.villagers.filter((v) => v.alive).length,
      deaths: state.stats?.deaths ?? state.villagers.filter((v) => !v.alive).length,
    },
    null,
    2,
  ),
)
