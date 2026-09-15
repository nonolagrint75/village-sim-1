/**
 * Headless biological/daily-rhythm audit.
 *
 * Samples N random villagers and logs task / hunger / stamina / location / room
 * across many sim days, then flags unrealisms (night labor, no sleep, hunger
 * ignored, endless craft, etc.).
 *
 *   npx tsx scripts/follow-villagers-rhythm.ts [seed] [days] [sampleN]
 */
import { hourOfDay, TICKS_PER_DAY } from '../src/lib/sim/calendar'
import { createSimulation, stepSimulation } from '../src/lib/sim/engine'
import { findRoomAt } from '../src/lib/sim/rooms'
import { coldStress01, sampleRain, sampleTempC } from '../src/lib/sim/climate'
import { distance, isNight } from '../src/lib/sim/world'
import type { SimState, Villager } from '../src/lib/sim/types'
import { edibleValue } from '../src/lib/sim/inventory'

const seed = Number(process.argv[2] ?? 42)
const days = Number(process.argv[3] ?? 12)
const sampleN = Number(process.argv[4] ?? 5)
const ticks = days * TICKS_PER_DAY
/** Log a sample every this many ticks (default: each hour). */
const LOG_EVERY = 3

type SampleRow = {
  tick: number
  day: number
  hour: number
  night: boolean
  task: string
  hunger: number
  stamina: number
  health: number
  x: number
  y: number
  home: boolean
  atHome: boolean
  room: string
  food: number
  weather: string
  cold: number
  rain: number
}

type VillagerLog = {
  id: number
  name: string
  rows: SampleRow[]
  taskHours: Map<string, number>
  nightLaborTicks: number
  nightAwayTicks: number
  dayRestTicks: number
  hungerLowTicks: number
  hungerCriticalTicks: number
  exhaustedWorkTicks: number
  stormOutdoorTicks: number
  coldOutdoorTicks: number
  longestSameTask: { kind: string; ticks: number }
  eatEvents: number
  restNightTicks: number
  restDayTicks: number
  idleWanderTicks: number
  _prevKind?: string
  _streak?: number
}

function atHome(v: Villager): boolean {
  return v.hasHome && distance(v.x, v.y, v.homeX, v.homeY) <= 4
}

function roomOf(v: Villager): string {
  if (!v.hasHome || !v.homeLayout) return '-'
  const r = findRoomAt(v.homeLayout, v.x, v.y)
  return r?.kind ?? (atHome(v) ? 'home' : '-')
}

function isLabor(kind: string): boolean {
  return (
    kind.startsWith('gather') ||
    kind.startsWith('build') ||
    kind.startsWith('craft') ||
    kind === 'clearLand' ||
    kind === 'mineTunnel' ||
    kind === 'mineGold' ||
    kind === 'harvestWheat' ||
    kind === 'sowField' ||
    kind === 'fish' ||
    kind === 'makeCharcoal' ||
    kind === 'weaveCloth' ||
    kind === 'sewClothing' ||
    kind === 'tanHide' ||
    kind === 'tradeRun' ||
    kind === 'buildProject'
  )
}

function pickSample(state: SimState, n: number, rng: () => number): Villager[] {
  const alive = state.villagers.filter((v) => v.alive)
  const shuffled = [...alive]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j]!, shuffled[i]!]
  }
  return shuffled.slice(0, Math.min(n, shuffled.length))
}

function makeLog(v: Villager): VillagerLog {
  return {
    id: v.id,
    name: v.name,
    rows: [],
    taskHours: new Map(),
    nightLaborTicks: 0,
    nightAwayTicks: 0,
    dayRestTicks: 0,
    hungerLowTicks: 0,
    hungerCriticalTicks: 0,
    exhaustedWorkTicks: 0,
    stormOutdoorTicks: 0,
    coldOutdoorTicks: 0,
    longestSameTask: { kind: 'none', ticks: 0 },
    eatEvents: 0,
    restNightTicks: 0,
    restDayTicks: 0,
    idleWanderTicks: 0,
  }
}

function record(state: SimState, log: VillagerLog, v: Villager) {
  const night = isNight(state.tick)
  const hour = hourOfDay(state.tick)
  const task = v.task?.kind ?? 'null'
  const home = atHome(v)
  const temp = sampleTempC(state.climate, v.x, v.y)
  const cold = coldStress01(temp)
  const rain = sampleRain(state.climate, v.x, v.y)
  const weather = state.climate.weather

  const row: SampleRow = {
    tick: state.tick,
    day: Math.floor(state.tick / TICKS_PER_DAY),
    hour,
    night,
    task,
    hunger: +v.hunger.toFixed(2),
    stamina: +v.stamina.toFixed(2),
    health: +v.health.toFixed(2),
    x: Math.round(v.x),
    y: Math.round(v.y),
    home: v.hasHome,
    atHome: home,
    room: roomOf(v),
    food: edibleValue(v.inventory),
    weather,
    cold: +cold.toFixed(2),
    rain: +rain.toFixed(2),
  }
  log.rows.push(row)
  log.taskHours.set(task, (log.taskHours.get(task) ?? 0) + LOG_EVERY)

  if (night && isLabor(task)) log.nightLaborTicks += LOG_EVERY
  if (night && v.hasHome && !home && task !== 'flee' && task !== 'fight') log.nightAwayTicks += LOG_EVERY
  if (!night && task === 'rest') log.dayRestTicks += LOG_EVERY
  if (v.hunger < 1.5) log.hungerLowTicks += LOG_EVERY
  if (v.hunger < 0.6) log.hungerCriticalTicks += LOG_EVERY
  if (v.stamina < 1.0 && isLabor(task)) log.exhaustedWorkTicks += LOG_EVERY
  if (!home && (weather === 'storm' || rain > 0.55) && isLabor(task)) log.stormOutdoorTicks += LOG_EVERY
  if (!home && cold > 0.45 && isLabor(task)) log.coldOutdoorTicks += LOG_EVERY
  if (task === 'eat') log.eatEvents += 1
  if (task === 'rest' && night) log.restNightTicks += LOG_EVERY
  if (task === 'rest' && !night) log.restDayTicks += LOG_EVERY
  if (task === 'idle' && !home) log.idleWanderTicks += LOG_EVERY
}

function finishLongest(log: VillagerLog, v: Villager) {
  const kind = v.task?.kind ?? 'null'
  const prev = log._prevKind
  let streak = log._streak ?? 0
  if (kind === prev) streak++
  else streak = 1
  log._prevKind = kind
  log._streak = streak
  if (streak > log.longestSameTask.ticks) {
    log.longestSameTask = { kind, ticks: streak }
  }
}

function analyze(log: VillagerLog): string[] {
  const issues: string[] = []
  const nightSamples = log.rows.filter((r) => r.night).length
  const restNightShare = nightSamples > 0 ? log.restNightTicks / (nightSamples * LOG_EVERY) : 0
  if (restNightShare < 0.35 && log.rows.some((r) => r.home)) {
    issues.push(`low night rest (${(restNightShare * 100).toFixed(0)}% of night samples resting)`)
  }
  if (log.nightLaborTicks > TICKS_PER_DAY * 0.5) {
    issues.push(`night labor ${log.nightLaborTicks} ticks`)
  }
  if (log.nightAwayTicks > TICKS_PER_DAY) {
    issues.push(`housed but away at night ${log.nightAwayTicks} ticks`)
  }
  if (log.exhaustedWorkTicks > TICKS_PER_DAY * 0.4) {
    issues.push(`worked while exhausted ${log.exhaustedWorkTicks} ticks`)
  }
  if (log.hungerCriticalTicks > TICKS_PER_DAY && log.eatEvents < days) {
    issues.push(`critical hunger ${log.hungerCriticalTicks}t with only ${log.eatEvents} eat samples`)
  }
  if (log.longestSameTask.ticks > TICKS_PER_DAY * 1.5 && isLabor(log.longestSameTask.kind)) {
    issues.push(
      `marathon ${log.longestSameTask.kind} for ${log.longestSameTask.ticks} ticks (~${(log.longestSameTask.ticks / TICKS_PER_DAY).toFixed(1)}d)`,
    )
  }
  if (log.stormOutdoorTicks > TICKS_PER_DAY * 0.3) {
    issues.push(`labor in storm/rain outdoors ${log.stormOutdoorTicks} ticks`)
  }
  if (log.coldOutdoorTicks > TICKS_PER_DAY * 0.4) {
    issues.push(`labor in lethal cold outdoors ${log.coldOutdoorTicks} ticks`)
  }
  if (log.idleWanderTicks > TICKS_PER_DAY * 3) {
    issues.push(`aimless idle wander ${log.idleWanderTicks} ticks`)
  }
  return issues
}

function printTimeline(log: VillagerLog) {
  console.log(`\n=== ${log.name} (#${log.id}) ===`)
  let lastKey = ''
  const shown: string[] = []
  for (const r of log.rows) {
    const key = `${r.day}|${r.hour}|${r.task}|${r.atHome}|${r.room}`
    if (key === lastKey) continue
    lastKey = key
    const line = `d${r.day} ${String(r.hour).padStart(2, '0')}h ${r.night ? 'N' : 'D'} ${r.task.padEnd(14)} h=${r.hunger.toFixed(1)} s=${r.stamina.toFixed(1)} food=${r.food} @${r.x},${r.y} ${r.atHome ? 'HOME' : 'out '} ${r.room} ${r.weather}`
    shown.push(line)
  }
  if (shown.length <= 55) {
    for (const l of shown) console.log(l)
  } else {
    for (const l of shown.slice(0, 40)) console.log(l)
    console.log(`  … (${shown.length - 55} transitions omitted) …`)
    for (const l of shown.slice(-15)) console.log(l)
  }
  const top = [...log.taskHours.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8)
  console.log(
    'top tasks:',
    top.map(([k, t]) => `${k}:${(t / TICKS_PER_DAY).toFixed(1)}d`).join('  '),
  )
  console.log(
    `nightRest=${log.restNightTicks}t nightLabor=${log.nightLaborTicks}t nightAway=${log.nightAwayTicks}t eatSamples=${log.eatEvents} exhaustedWork=${log.exhaustedWorkTicks}t longest=${log.longestSameTask.kind}/${log.longestSameTask.ticks}t`,
  )
  const issues = analyze(log)
  if (issues.length) console.log('ISSUES:', issues.join('; '))
  else console.log('ISSUES: (none flagged)')
}

function mulberry32(a: number) {
  return function () {
    let t = (a += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

console.log(`follow-villagers-rhythm seed=${seed} days=${days} N=${sampleN}\n`)
const state = createSimulation(seed)
const rng = mulberry32(seed ^ 0x9e3779b9)

const warmup = TICKS_PER_DAY * 3
for (let i = 0; i < warmup; i++) stepSimulation(state)

const sample = pickSample(state, sampleN, rng)
const logs = new Map<number, VillagerLog>()
for (const v of sample) logs.set(v.id, makeLog(v))

console.log(
  `sample after ${warmup} warmup ticks:`,
  sample.map((v) => `${v.name}#${v.id} home=${v.hasHome} hunger=${v.hunger.toFixed(1)}`).join(', '),
)

for (let i = 0; i < ticks; i++) {
  stepSimulation(state)
  for (const id of logs.keys()) {
    const v = state.villagers.find((x) => x.id === id)
    const log = logs.get(id)!
    if (!v || !v.alive) {
      if (state.tick % LOG_EVERY === 0) {
        log.rows.push({
          tick: state.tick,
          day: Math.floor(state.tick / TICKS_PER_DAY),
          hour: hourOfDay(state.tick),
          night: isNight(state.tick),
          task: 'DEAD',
          hunger: 0,
          stamina: 0,
          health: 0,
          x: 0,
          y: 0,
          home: false,
          atHome: false,
          room: '-',
          food: 0,
          weather: state.climate.weather,
          cold: 0,
          rain: 0,
        })
      }
      continue
    }
    finishLongest(log, v)
    if (state.tick % LOG_EVERY === 0) record(state, log, v)
  }
}

const allIssues: string[] = []
for (const log of logs.values()) {
  printTimeline(log)
  for (const iss of analyze(log)) allIssues.push(`${log.name}: ${iss}`)
}

console.log('\n======== SUMMARY ========')
console.log(`alive sample: ${[...logs.values()].filter((l) => !l.rows.some((r) => r.task === 'DEAD')).length}/${logs.size}`)
if (allIssues.length === 0) console.log('No rhythm unrealisms flagged.')
else {
  console.log(`${allIssues.length} issues:`)
  for (const i of allIssues) console.log(' -', i)
}
