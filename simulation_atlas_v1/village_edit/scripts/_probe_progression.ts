/**
 * Day 1 vs day 45 human-development metrics (skills, titles, kids, homes, wealth).
 *   npx tsx scripts/_probe_progression.ts [seed]
 */
import { createSimulation, stepSimulation } from '../src/lib/sim/engine'
import { mindOf } from '../src/lib/sim/cognition/mindPool'
import { countOf } from '../src/lib/sim/inventory'
import { TICKS_PER_DAY } from '../src/lib/sim/calendar'
import { ensureLivelihood } from '../src/lib/sim/livelihood'
import { gearPrestige01 } from '../src/lib/sim/equipment'

type AnyState = ReturnType<typeof createSimulation>

function metrics(state: AnyState, label: string) {
  const alive = state.villagers.filter((v) => v.alive)
  let skillsSum = 0
  let skillMax = 0
  let titled = 0
  let specialized = 0
  let coins = 0
  let wealthMax = 0
  let beds = 0
  let rooms = 0
  let homes = 0
  let spouses = 0
  let kids = 0
  let prestige = 0
  let recognition = 0
  let projects = 0
  let projectsDone = 0
  const titles: Record<string, number> = {}
  const professions: Record<string, number> = {}
  for (const v of alive) {
    const m = mindOf(v)
    const sk = Object.values(m.skills) as number[]
    const avg = sk.reduce((a, b) => a + b, 0) / Math.max(1, sk.length)
    skillsSum += avg
    for (const s of sk) skillMax = Math.max(skillMax, s)
    const live = ensureLivelihood(m)
    if (live.titleFr && live.titleFr !== 'sans métier clair') {
      titled++
      titles[live.titleFr] = (titles[live.titleFr] || 0) + 1
    }
    const mixVals = Object.values(live.mix) as number[]
    const dom = mixVals.length ? Math.max(...mixVals) : 0
    if (dom >= 0.25) specialized++
    recognition += live.recognition
    const w = countOf(v.inventory, 'coin') + (v.chestInventory ? countOf(v.chestInventory, 'coin') : 0)
    coins += w
    wealthMax = Math.max(wealthMax, w)
    if (v.hasHome && v.homeOwnerId === v.id) {
      homes++
      beds += v.house?.bedSlots ?? v.bedCount ?? 0
      rooms += v.house?.roomKinds?.length ?? 0
    }
    if (v.spouseId !== null) spouses++
    if (v.age < 220) kids++
    prestige += gearPrestige01(v)
    professions[v.profession] = (professions[v.profession] || 0) + 1
  }
  const buildProjects = state.projects ?? []
  for (const p of buildProjects) {
    projects++
    if (p.phase === 'done') projectsDone++
  }
  const n = Math.max(1, alive.length)
  const row = {
    label,
    day: +(state.tick / TICKS_PER_DAY).toFixed(1),
    tick: state.tick,
    pop: alive.length,
    births: state.births,
    deaths: state.deaths,
    avgSkill: +(skillsSum / n).toFixed(3),
    maxSkill: +skillMax.toFixed(3),
    titled,
    specialized,
    topTitles: Object.entries(titles)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6),
    coins,
    wealthMax,
    avgPrestige: +(prestige / n).toFixed(3),
    avgRecognition: +(recognition / n).toFixed(3),
    homes,
    beds,
    rooms,
    couples: Math.floor(spouses / 2),
    kids,
    projects,
    projectsDone,
    professions,
  }
  console.log(JSON.stringify(row, null, 2))
  return row
}

const seed = Number(process.argv[2] ?? 42)
const state = createSimulation(seed)
console.log(`seed=${seed} TICKS_PER_DAY=${TICKS_PER_DAY}`)
metrics(state, 'day0')
const d1 = TICKS_PER_DAY
const d45 = TICKS_PER_DAY * 45
const t0 = Date.now()
for (let t = 1; t <= d45; t++) {
  stepSimulation(state)
  if (t === d1) metrics(state, 'day1')
}
metrics(state, 'day45')
console.log(`elapsed=${((Date.now() - t0) / 1000).toFixed(1)}s`)
