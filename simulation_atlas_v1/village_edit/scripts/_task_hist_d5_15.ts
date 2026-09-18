/**
 * Task histogram for sim days 5–15 (inclusive).
 *   npx tsx scripts/_task_hist_d5_15.ts [seed]
 */
import { createSimulation, stepSimulation, computeStats } from '../src/lib/sim/engine'
import { TICKS_PER_DAY } from '../src/lib/sim/calendar'
import type { TaskKind } from '../src/lib/sim/types'

const seed = Number(process.argv[2] ?? 42)
const startTick = 5 * TICKS_PER_DAY
const endTick = 15 * TICKS_PER_DAY

const state = createSimulation(seed)
const taskStarts: Record<string, number> = {}
const taskTicks: Record<string, number> = {}
const leisureHungry: Record<string, number> = {}
const prevKind = new Map<number, TaskKind | null>()
const t0 = Date.now()

for (let t = 1; t <= endTick; t++) {
  stepSimulation(state)
  if (t < startTick) continue
  for (const v of state.villagers) {
    if (!v.alive) continue
    const kind = v.task?.kind ?? null
    const prev = prevKind.get(v.id) ?? null
    if (kind) taskTicks[kind] = (taskTicks[kind] ?? 0) + 1
    if (kind && kind !== prev) {
      taskStarts[kind] = (taskStarts[kind] ?? 0) + 1
      if (
        (kind === 'socialise' || kind === 'entertain' || kind === 'counsel' || kind === 'teachCraft') &&
        (state.famine || v.hunger < 2.35)
      ) {
        leisureHungry[kind] = (leisureHungry[kind] ?? 0) + 1
      }
    }
    prevKind.set(v.id, kind)
  }
}

const s = computeStats(state)
const elapsed = ((Date.now() - t0) / 1000).toFixed(1)
const top = Object.entries(taskStarts)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 20)
  .map(([k, n]) => `${k}:${n}`)
  .join(', ')

console.log(`task-hist seed=${seed} days=5–15 ticks=${startTick + 1}..${endTick}`)
console.log(`[day 15] alive=${s.villagers} deaths=${s.deaths} famine=${s.famine}`)
console.log(`Top starts: ${top}`)
for (const k of ['socialise', 'entertain', 'counsel', 'teachCraft', 'gatherFood', 'eat', 'sowField', 'rest'] as const) {
  console.log(
    `  ${k.padEnd(12)} starts=${(taskStarts[k] ?? 0).toString().padStart(5)} ticks=${(taskTicks[k] ?? 0).toString().padStart(7)} hungryStarts=${leisureHungry[k] ?? 0}`,
  )
}
console.log(`Elapsed ${elapsed}s`)
