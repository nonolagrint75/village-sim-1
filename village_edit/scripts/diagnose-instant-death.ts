/**
 * Headless instant-death repro — multi-seed death cause/hour/task/food probe.
 *
 *   npx tsx scripts/diagnose-instant-death.ts [days=10] [seeds=1,2,3,7,42,99,256,512]
 */
import { createSimulation, stepSimulation, computeStats } from '../src/lib/sim/engine'
import { TICKS_PER_DAY, hourOfDay } from '../src/lib/sim/calendar'
import { countOf, edibleValue } from '../src/lib/sim/inventory'
import type { SimState, TaskKind, Villager } from '../src/lib/sim/types'

const days = Math.max(1, Math.min(30, Number(process.argv[2] ?? 10)))
const seeds = (process.argv[3] ?? '1,2,3,7,42,99,256,512')
  .split(',')
  .map((s) => Number(s.trim()))
  .filter((n) => Number.isFinite(n))

type Cause =
  | 'starve'
  | 'cold'
  | 'disease'
  | 'wolf'
  | 'wolf_fight'
  | 'murder'
  | 'unknown'

interface DeathRec {
  seed: number
  day: number
  hour: number
  tick: number
  name: string
  cause: Cause
  task: TaskKind | 'none'
  hunger: number
  health: number
  starveTimer: number
  bagEdible: number
  bagFood: number
  bagMeat: number
  bagBread: number
  bagFish: number
  chestEdible: number
  stamina: number
}

function classifyCause(line: string, name: string): Cause | null {
  if (!line.includes(name)) return null
  const l = line.toLowerCase()
  if (l.includes('mort de faim')) return 'starve'
  if (l.includes('meurt de froid')) return 'cold'
  if (l.includes('succombe à la maladie') || l.includes('succombe a la maladie')) return 'disease'
  if (l.includes('tué par un loup') || l.includes('tue par un loup')) return 'wolf'
  if (l.includes('tombé face à un loup') || l.includes('tombe face a un loup')) return 'wolf_fight'
  if (l.includes(' a tué ') || l.includes(' a tue ') || l.includes('en se défendant') || l.includes('en se defendant'))
    return 'murder'
  if (/\best mort\b|meurt|succombe|tué|tue /.test(l)) return 'unknown'
  return null
}

function snap(v: Villager) {
  return {
    hunger: v.hunger,
    health: v.health,
    starveTimer: v.starveTimer,
    stamina: v.stamina,
    task: (v.task?.kind ?? 'none') as TaskKind | 'none',
    bagEdible: edibleValue(v.inventory),
    bagFood: countOf(v.inventory, 'food'),
    bagMeat: countOf(v.inventory, 'meat'),
    bagBread: countOf(v.inventory, 'bread'),
    bagFish: countOf(v.inventory, 'fish'),
    chestEdible: v.chestInventory ? edibleValue(v.chestInventory) : 0,
  }
}

function bump(map: Record<string, number>, key: string, n = 1) {
  map[key] = (map[key] ?? 0) + n
}

function runSeed(seed: number, ticks: number): {
  deaths: DeathRec[]
  startPop: number
  endPop: number
  dayPops: number[]
} {
  const state = createSimulation(seed)
  const startPop = state.villagers.filter((v) => v.alive).length
  const deaths: DeathRec[] = []
  const dayPops: number[] = []
  const seenLog = new Set<string>()
  // Pre-seed seen log so createSimulation bootstrap lines don't confuse matching.
  for (const line of state.log) seenLog.add(line)

  for (let t = 1; t <= ticks; t++) {
    const before = new Map<number, ReturnType<typeof snap>>()
    for (const v of state.villagers) {
      if (!v.alive) continue
      before.set(v.id, snap(v))
    }

    stepSimulation(state)

    const newLines: string[] = []
    for (const line of state.log) {
      if (seenLog.has(line)) continue
      seenLog.add(line)
      newLines.push(line)
    }

    for (const v of state.villagers) {
      const prev = before.get(v.id)
      if (!prev) continue
      if (v.alive) continue

      let cause: Cause = 'unknown'
      for (const line of newLines) {
        const c = classifyCause(line, v.name)
        if (c) {
          cause = c
          break
        }
      }

      const hour = hourOfDay(state.tick)
      const day = Math.ceil(t / TICKS_PER_DAY)
      deaths.push({
        seed,
        day,
        hour,
        tick: state.tick,
        name: v.name,
        cause,
        task: prev.task,
        hunger: prev.hunger,
        health: prev.health,
        starveTimer: prev.starveTimer,
        bagEdible: prev.bagEdible,
        bagFood: prev.bagFood,
        bagMeat: prev.bagMeat,
        bagBread: prev.bagBread,
        bagFish: prev.bagFish,
        chestEdible: prev.chestEdible,
        stamina: prev.stamina,
      })
    }

    if (t % TICKS_PER_DAY === 0) {
      dayPops.push(computeStats(state).villagers)
    }
  }

  return {
    deaths,
    startPop,
    endPop: computeStats(state).villagers,
    dayPops,
  }
}

const ticks = days * TICKS_PER_DAY
console.log(`diagnose-instant-death days=${days} ticks=${ticks} seeds=[${seeds.join(',')}]`)
const t0 = Date.now()

const all: DeathRec[] = []
const byCause: Record<string, number> = {}
const byHour: Record<string, number> = {}
const byDay: Record<string, number> = {}
const byCauseHour: Record<string, number> = {}
const byTask: Record<string, number> = {}
const byCauseTask: Record<string, number> = {}
const foodAtDeath: number[] = []
const foodByCause: Record<string, number[]> = {}
const seedSummaries: {
  seed: number
  start: number
  end: number
  deaths: number
  day1: number
  day5: number
  wipeDay: number | null
  causes: Record<string, number>
}[] = []

for (const seed of seeds) {
  const r = runSeed(seed, ticks)
  all.push(...r.deaths)
  const causes: Record<string, number> = {}
  for (const d of r.deaths) bump(causes, d.cause)
  const day1 = r.dayPops[0] ?? r.endPop
  const day5 = r.dayPops[Math.min(4, r.dayPops.length - 1)] ?? r.endPop
  let wipeDay: number | null = null
  for (let i = 0; i < r.dayPops.length; i++) {
    if (r.dayPops[i] === 0) {
      wipeDay = i + 1
      break
    }
  }
  seedSummaries.push({
    seed,
    start: r.startPop,
    end: r.endPop,
    deaths: r.deaths.length,
    day1,
    day5,
    wipeDay,
    causes,
  })
  console.log(
    `seed ${String(seed).padStart(4)} start=${r.startPop} d1=${day1} d5=${day5} end=${r.endPop} deaths=${r.deaths.length}` +
      (wipeDay ? ` WIPE@d${wipeDay}` : '') +
      ` causes=${JSON.stringify(causes)}`,
  )
}

for (const d of all) {
  bump(byCause, d.cause)
  bump(byHour, String(d.hour).padStart(2, '0'))
  bump(byDay, `d${d.day}`)
  bump(byCauseHour, `${d.cause}@h${String(d.hour).padStart(2, '0')}`)
  bump(byTask, d.task)
  bump(byCauseTask, `${d.cause}|${d.task}`)
  foodAtDeath.push(d.bagEdible)
  if (!foodByCause[d.cause]) foodByCause[d.cause] = []
  foodByCause[d.cause]!.push(d.bagEdible)
}

function sortHist(map: Record<string, number>) {
  return Object.entries(map).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
}

function mean(xs: number[]) {
  if (xs.length === 0) return 0
  return xs.reduce((a, b) => a + b, 0) / xs.length
}

function pct(n: number, d: number) {
  return d === 0 ? '0.0%' : `${((100 * n) / d).toFixed(1)}%`
}

console.log('\n========== DEATH CAUSE HISTOGRAM ==========')
const total = all.length
for (const [k, n] of sortHist(byCause)) {
  console.log(`  ${k.padEnd(12)} ${String(n).padStart(5)}  ${pct(n, total)}`)
}
console.log(`  ${'TOTAL'.padEnd(12)} ${String(total).padStart(5)}`)

console.log('\n========== DEATHS BY DAY ==========')
for (const [k, n] of Object.entries(byDay).sort((a, b) => Number(a[0].slice(1)) - Number(b[0].slice(1)))) {
  console.log(`  ${k.padEnd(6)} ${String(n).padStart(5)}  ${pct(n, total)}`)
}

console.log('\n========== DEATHS BY HOUR (0–23) ==========')
for (let h = 0; h < 24; h++) {
  const key = String(h).padStart(2, '0')
  const n = byHour[key] ?? 0
  if (n === 0) continue
  console.log(`  h${key}  ${String(n).padStart(5)}  ${pct(n, total)}`)
}

console.log('\n========== CAUSE × HOUR (top 24) ==========')
for (const [k, n] of sortHist(byCauseHour).slice(0, 24)) {
  console.log(`  ${k.padEnd(18)} ${String(n).padStart(5)}`)
}

console.log('\n========== TASK AT DEATH ==========')
for (const [k, n] of sortHist(byTask).slice(0, 20)) {
  console.log(`  ${k.padEnd(18)} ${String(n).padStart(5)}  ${pct(n, total)}`)
}

console.log('\n========== CAUSE × TASK (top 20) ==========')
for (const [k, n] of sortHist(byCauseTask).slice(0, 20)) {
  console.log(`  ${k.padEnd(28)} ${String(n).padStart(5)}`)
}

console.log('\n========== FOOD IN BAG AT DEATH ==========')
console.log(
  `  overall n=${foodAtDeath.length} mean=${mean(foodAtDeath).toFixed(2)} ` +
    `withFood>${0}=${foodAtDeath.filter((x) => x > 0).length} ` +
    `withFood>=1=${foodAtDeath.filter((x) => x >= 1).length}`,
)
for (const [cause, xs] of Object.entries(foodByCause).sort((a, b) => b[1].length - a[1].length)) {
  const withFood = xs.filter((x) => x > 0).length
  console.log(
    `  ${cause.padEnd(12)} n=${String(xs.length).padStart(4)} meanEdible=${mean(xs).toFixed(2).padStart(6)} ` +
      `withFood=${withFood} (${pct(withFood, xs.length)})`,
  )
}

// Starve smoking-gun: died of hunger while holding edible food
const starveWithFood = all.filter((d) => d.cause === 'starve' && d.bagEdible > 0)
const coldEarly = all.filter((d) => d.cause === 'cold' && d.day <= 3)
const starveEarly = all.filter((d) => d.cause === 'starve' && d.day <= 3)

console.log('\n========== SMOKING-GUN FLAGS ==========')
console.log(`  starve-with-bag-food: ${starveWithFood.length}/${byCause.starve ?? 0}`)
if (starveWithFood.length > 0) {
  const sample = starveWithFood.slice(0, 8)
  for (const d of sample) {
    console.log(
      `    seed=${d.seed} d${d.day}h${d.hour} ${d.name} task=${d.task} hunger=${d.hunger.toFixed(2)} ` +
        `starveT=${d.starveTimer} edible=${d.bagEdible.toFixed(1)} chest=${d.chestEdible.toFixed(1)}`,
    )
  }
}
console.log(`  cold deaths day≤3: ${coldEarly.length}`)
console.log(`  starve deaths day≤3: ${starveEarly.length}`)
console.log(
  `  first-day deaths: ${all.filter((d) => d.day === 1).length} ` +
    `(${pct(all.filter((d) => d.day === 1).length, total)})`,
)

console.log('\n========== PER-SEED ==========')
for (const s of seedSummaries) {
  console.log(JSON.stringify(s))
}

const elapsed = (Date.now() - t0) / 1000
console.log(`\nElapsed ${elapsed.toFixed(1)}s`)
