/**
 * Survival deep probe: deaths, births blockers, mill/stone, harvest, outlaws.
 * Usage: npx tsx scripts/a3_survival_probe.ts 7 60
 */
import { createSimulation, stepSimulation, computeStats } from '../src/lib/sim/engine'
import { TICKS_PER_DAY } from '../src/lib/sim/calendar'
import { countOf, edibleValue } from '../src/lib/sim/inventory'
import { WHEAT, STONE } from '../src/lib/sim/types'
import { getTerrain } from '../src/lib/sim/world'
import { WHEAT_RIPE } from '../src/lib/sim/behaviors'

const seed = Number(process.argv[2] ?? 7)
const days = Number(process.argv[3] ?? 60)
const state = createSimulation(seed)

const notable: string[] = []
const seenLog = new Set(state.log)
let harvestStarts = 0
let millStarts = 0
let grindStarts = 0
let stoneStarts = 0
let bakeStarts = 0
const prevKind = new Map<number, string | null>()

function isNotable(line: string): boolean {
  const l = line.toLowerCase()
  return (
    l.includes('mort de faim') ||
    l.includes('meurt de froid') ||
    l.includes('succombe') ||
    l.includes('tue') ||
    l.includes('brigand') ||
    l.includes('hors-la-loi') ||
    l.includes('desert') ||
    l.includes('nait') ||
    l.includes('moulin') ||
    l.includes('enfant')
  )
}

for (let d = 1; d <= days; d++) {
  for (let t = 0; t < TICKS_PER_DAY; t++) {
    for (const v of state.villagers) {
      if (!v.alive) continue
      prevKind.set(v.id, v.task?.kind ?? null)
    }
    stepSimulation(state)
    for (const v of state.villagers) {
      if (!v.alive) continue
      const k = v.task?.kind ?? null
      const p = prevKind.get(v.id) ?? null
      if (k && k !== p) {
        if (k === 'harvestWheat') harvestStarts++
        if (k === 'buildMill') millStarts++
        if (k === 'grindFlour') grindStarts++
        if (k === 'gatherStone') stoneStarts++
        if (k === 'bakeBread') bakeStarts++
      }
    }
    for (const line of state.log) {
      if (seenLog.has(line)) continue
      seenLog.add(line)
      if (isNotable(line)) notable.push('d' + d + ': ' + line)
    }
  }

  if (d % 15 === 0 || d === days) {
    const s = computeStats(state)
    let ripe = 0
    let wheatTiles = 0
    let rockNear = 0
    let stoneInv = 0
    let wheatInv = 0
    let readyPairs = 0
    let married = 0
    let homes = 0
    let mill = 0
    let bandits = 0
    let spousesFar = 0
    let spousesNear = 0
    for (const vg of state.villages) if (vg.hasMill) mill++
    for (const b of state.bandits ?? []) if (b.alive) bandits++
    const home = state.villagers.find((v) => v.alive && v.hasHome)
    if (home) {
      for (let y = home.homeY - 40; y <= home.homeY + 40; y++) {
        for (let x = home.homeX - 40; x <= home.homeX + 40; x++) {
          if (getTerrain(state.grid, x, y) === STONE) rockNear++
        }
      }
    }
    for (const v of state.villagers) {
      if (!v.alive) continue
      if (v.hasHome && v.homeOwnerId === v.id) homes++
      stoneInv += countOf(v.inventory, 'stone')
      wheatInv += countOf(v.inventory, 'wheat')
      if (v.spouseId != null) {
        married++
        const sp = state.villagers.find((o) => o.id === v.spouseId && o.alive)
        if (sp) {
          const dist = Math.hypot(v.x - sp.x, v.y - sp.y)
          if (dist <= 5.5) spousesNear++
          else spousesFar++
        }
      }
      if (v.fieldX >= 0) {
        for (let y = v.fieldY - 2; y <= v.fieldY + 2; y++) {
          for (let x = v.fieldX - 2; x <= v.fieldX + 2; x++) {
            if (getTerrain(state.grid, x, y) !== WHEAT) continue
            wheatTiles++
            if (state.grid.amount[y * state.grid.width + x] >= WHEAT_RIPE) ripe++
          }
        }
      }
      const stock = edibleValue(v.inventory) + (v.chestInventory ? edibleValue(v.chestInventory) : 0)
      if (v.hasHome && v.hunger >= 2.0 && stock >= 0.5 && v.reproCooldown <= 0 && v.spouseId != null) {
        readyPairs++
      }
    }
    console.log(JSON.stringify({
      d, alive: s.villagers, deaths: s.deaths, births: s.births, famine: s.famine,
      homes, married, spousesNear, spousesFar, readyPairs, mill, bandits,
      ripe, wheatTiles, wheatInv, stoneInv, rockNear,
      harvestStarts, millStarts, grindStarts, stoneStarts, bakeStarts,
      deathsByWolf: state.deathsByWolf ?? 0, deathsByBandit: state.deathsByBandit ?? 0,
    }))
  }
}

console.log('\n=== notable log ===')
for (const line of notable.slice(-100)) console.log(line)