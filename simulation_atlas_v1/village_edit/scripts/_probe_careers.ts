/**
 * Profession distribution shift + midlife switches (seed 7, ~50 days).
 *   npx tsx scripts/_probe_careers.ts [seed=7] [days=50]
 */
import { createSimulation, stepSimulation } from '../src/lib/sim/engine'
import { TICKS_PER_DAY } from '../src/lib/sim/calendar'
import type { Profession } from '../src/lib/sim/types'

const seed = Number(process.argv[2] ?? 7)
const days = Number(process.argv[3] ?? 50)
const ticks = days * TICKS_PER_DAY

const state = createSimulation(seed)
const earlyDay = 8
const midDay = Math.floor(days / 2)

function counts(): Record<string, number> {
  const c: Record<string, number> = {}
  for (const v of state.villagers) {
    if (!v.alive) continue
    c[v.profession] = (c[v.profession] ?? 0) + 1
  }
  return c
}

function snap(label: string) {
  const c = counts()
  const fields = state.villagers.filter((v) => v.alive && v.fieldX >= 0).length
  const farmersWithField = state.villagers.filter((v) => v.alive && v.profession === 'farmer' && v.fieldX >= 0).length
  const craftWithField = state.villagers.filter(
    (v) => v.alive && v.fieldX >= 0 && v.profession !== 'farmer' && v.profession !== 'none',
  ).length
  console.log(JSON.stringify({ label, day: +(state.tick / TICKS_PER_DAY).toFixed(1), pop: state.villagers.filter((v) => v.alive).length, professions: c, fields, farmersWithField, craftWithField }, null, 2))
  return c
}

const switches: string[] = []
let lastLog = 0
const early = { c: null as Record<string, number> | null }
const mid = { c: null as Record<string, number> | null }

console.log(`seed=${seed} days=${days} TICKS_PER_DAY=${TICKS_PER_DAY}`)
for (let t = 1; t <= ticks; t++) {
  stepSimulation(state)
  const day = state.tick / TICKS_PER_DAY
  if (Math.floor(day) === earlyDay && !early.c) early.c = snap(`day${earlyDay}`)
  if (Math.floor(day) === midDay && !mid.c) mid.c = snap(`day${midDay}`)
  for (let i = lastLog; i < state.log.length; i++) {
    const line = state.log[i]
    if (/devient |abandonne le m/.test(line)) switches.push(line)
  }
  lastLog = state.log.length
}
const late = snap(`day${days}`)

const foodish = (c: Record<string, number>) =>
  (c.farmer ?? 0) + (c.forager ?? 0) + (c.fisher ?? 0) + (c.herder ?? 0)
const specialized = (c: Record<string, number>) =>
  (c.blacksmith ?? 0) + (c.miner ?? 0) + (c.trader ?? 0) + (c.guard ?? 0) + (c.weaver ?? 0) + (c.builder ?? 0) + (c.mason ?? 0) + (c.lumberjack ?? 0) + (c.miller ?? 0)

const e = early.c ?? {}
const l = late
const shifted = JSON.stringify(e) !== JSON.stringify(l)
const notAllForager = Object.keys(l).filter((k) => k !== 'forager' && k !== 'none' && (l[k] ?? 0) > 0).length >= 2
const midlife = switches.length >= 1
const fieldOk = state.villagers.every(
  (v) => !v.alive || v.fieldX < 0 || v.profession === 'farmer' || v.profession === 'herder' || v.profession === 'none' || v.profession === 'forager' || v.profession === 'builder',
)

console.log(JSON.stringify({
  switchesSample: switches.slice(0, 12),
  switchCount: switches.length,
  foodEarly: foodish(e),
  foodLate: foodish(l),
  specEarly: specialized(e),
  specLate: specialized(l),
  shifted,
  notAllForager,
  midlife,
  fieldOk,
}, null, 2))

const pass = shifted && notAllForager && midlife && fieldOk
console.log(pass ? 'PASS — careers dynamic' : 'FAIL — careers stuck or no switches')
process.exit(pass ? 0 : 1)