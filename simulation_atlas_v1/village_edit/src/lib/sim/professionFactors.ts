/**
 * DP5 - profession multi-factor explainability (measure-only).
 * Decomposes assignProfession score layers without changing the decision path.
 * Factors that exist in live scoring: foodNeed, demand, skills, personality,
 * location, previousExperience (livelihood mix). No family/relations/needs tags
 * (those are not in assignProfession).
 */
import { sampleTempC, cropTempFactor } from './climate'
import { mindOf } from './cognition/mindPool'
import { professionSkillPrefScore } from './cognition/labor'
import {
  applyPersonalDemandNudge,
  computeCareerDemand,
  type CareerDemandVector,
} from './careers'
import { farmerProfessionPressure } from './fields'
import { countOf } from './inventory'
import { localOreRichness } from './mining'
import type { Profession, SimState, Villager } from './types'
import { distance, findNearbyShore, resourceDensity } from './world'

/** Score-point materiality for a factor tag (honest measure; not a PASS gate). */
export const PROFESSION_FACTOR_MATERIAL = 8

/** Mission explainability target - measure share; do not force score rewrites. */
export const PROFESSION_MULTIFACTOR_TARGET = 0.7

export type ProfessionFactorName =
  | 'foodNeed'
  | 'demand'
  | 'skills'
  | 'personality'
  | 'location'
  | 'previousExperience'

export type ProfessionFactorHit = {
  name: ProfessionFactorName
  delta: number
}

export type ProfessionChoiceExplain = {
  profession: Profession
  scores: Record<Profession, number>
  factors: ProfessionFactorHit[]
  demand: CareerDemandVector
}

const JOBS: Profession[] = [
  'forager',
  'farmer',
  'fisher',
  'miller',
  'lumberjack',
  'mason',
  'guard',
  'builder',
  'herder',
  'trader',
  'weaver',
  'blacksmith',
  'miner',
]

function emptyScores(): Record<Profession, number> {
  return {
    none: 0,
    forager: 0,
    farmer: 0,
    miller: 0,
    lumberjack: 0,
    mason: 0,
    guard: 0,
    builder: 0,
    herder: 0,
    trader: 0,
    fisher: 0,
    weaver: 0,
    blacksmith: 0,
    miner: 0,
  }
}

function cloneScores(s: Record<Profession, number>): Record<Profession, number> {
  return { ...s }
}

function addFoodDemandOnly(scores: Record<Profession, number>, demand: CareerDemandVector): void {
  const food = demand.foodNeed * 46
  scores.farmer += food
  scores.forager += food * 0.42
  scores.fisher += food * 0.32
  scores.herder += food * 0.38
  scores.miller += food * 0.52
}

function addNonFoodDemand(scores: Record<Profession, number>, demand: CareerDemandVector): void {
  const forge = demand.forgeNeed * 40
  scores.blacksmith += forge
  scores.miner += forge * 0.72
  scores.lumberjack += forge * 0.38
  scores.mason += forge * 0.32
  scores.trader += demand.tradeNeed * 36
  scores.guard += demand.guardNeed * 42
  const culture = demand.cultureNeed * 30
  scores.weaver += culture * 0.68
  scores.builder += culture * 0.5
  scores.mason += culture * 0.22
  // Textile demand was computed in careers but never applied here — herder/weaver stayed 0.
  const textile = demand.textileNeed * 52
  scores.herder += textile * 1.15
  scores.weaver += textile * 1.25
  if (demand.textileNeed > 0.2) {
    scores.herder += 18
    scores.weaver += 12
  }
}

function pickBest(scores: Record<Profession, number>): { best: Profession; bestScore: number } {
  let best: Profession = 'forager'
  let bestScore = -Infinity
  for (const key of JOBS) {
    if (scores[key] > bestScore) {
      bestScore = scores[key]
      best = key
    }
  }
  return { best, bestScore }
}

function hitsForFocus(
  focus: Profession,
  location: Record<Profession, number>,
  withPers: Record<Profession, number>,
  withFood: Record<Profession, number>,
  withDemand: Record<Profession, number>,
  withSkills: Record<Profession, number>,
  withMix: Record<Profession, number>,
): ProfessionFactorHit[] {
  const material = PROFESSION_FACTOR_MATERIAL
  const deltas: ProfessionFactorHit[] = [
    { name: 'location', delta: location[focus] },
    { name: 'personality', delta: withPers[focus] - location[focus] },
    { name: 'foodNeed', delta: withFood[focus] - withPers[focus] },
    { name: 'demand', delta: withDemand[focus] - withFood[focus] },
    { name: 'skills', delta: withSkills[focus] - withDemand[focus] },
    { name: 'previousExperience', delta: withMix[focus] - withSkills[focus] },
  ]
  return deltas
    .filter((d) => Math.abs(d.delta) >= material)
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
}

/**
 * Same score stack as behaviors.assignProfession, with layer deltas for explainability.
 * Does not mutate villager / profession.
 */
export function computeProfessionChoice(state: SimState, v: Villager): ProfessionChoiceExplain {
  const layers = buildScoreLayers(state, v)
  const { best } = pickBest(layers.withMix)
  const factors = hitsForFocus(
    best,
    layers.location,
    layers.withPers,
    layers.withFood,
    layers.withDemand,
    layers.withSkills,
    layers.withMix,
  )
  return {
    profession: best,
    scores: layers.withMix,
    factors,
    demand: layers.demand,
  }
}

/** Factor hits supporting a specific metier (softProfession / forced apply path). */
export function factorsForProfession(
  state: SimState,
  v: Villager,
  focus: Profession,
): { factors: ProfessionFactorHit[]; demand: CareerDemandVector } {
  if (focus === 'none') {
    return { factors: [], demand: computeCareerDemand(state, state.villages.find((vg) => vg.id === v.villageId)) }
  }
  const layers = buildScoreLayers(state, v)
  return {
    factors: hitsForFocus(
      focus,
      layers.location,
      layers.withPers,
      layers.withFood,
      layers.withDemand,
      layers.withSkills,
      layers.withMix,
    ),
    demand: layers.demand,
  }
}

type ScoreLayers = {
  location: Record<Profession, number>
  withPers: Record<Profession, number>
  withFood: Record<Profession, number>
  withDemand: Record<Profession, number>
  withSkills: Record<Profession, number>
  withMix: Record<Profession, number>
  demand: CareerDemandVector
}

function buildScoreLayers(state: SimState, v: Villager): ScoreLayers {
  const p = v.personality
  const grid = state.grid
  const jobCount: Partial<Record<Profession, number>> = {}
  for (const o of state.villagers) {
    if (!o.alive || o.villageId !== v.villageId || o.id === v.id) continue
    jobCount[o.profession] = (jobCount[o.profession] ?? 0) + 1
  }
  const countJob = (job: Profession) => jobCount[job] ?? 0
  const village = state.villages.find((vg) => vg.id === v.villageId)
  const ox = village ? village.centerX : v.hasHome ? v.homeX : v.x
  const oy = village ? village.centerY : v.hasHome ? v.homeY : v.y

  const woodNear = resourceDensity(grid, ox, oy, 'tree', 14)
  const stoneNear = resourceDensity(grid, ox, oy, 'stone', 14)
  const berriesNear = resourceDensity(grid, ox, oy, 'bush', 14)
  const ironNear = resourceDensity(grid, ox, oy, 'iron', 14)
  const mountainNear = resourceDensity(grid, ox, oy, 'mountain', 28)
  const oreRich = localOreRichness(grid, ox, oy, 26)
  const localT = sampleTempC(state.climate, ox, oy)
  const farmClimate = cropTempFactor(localT)
  const coldPasture = localT < 7 || farmClimate < 0.3
  let wolvesNear = 0
  for (const w of state.wolves) if (w.alive && distance(w.x, w.y, ox, oy) < 40) wolvesNear++
  let banditsNear = 0
  for (const b of state.bandits ?? []) if (b.alive && distance(b.x, b.y, ox, oy) < 40) banditsNear++
  const water = findNearbyShore(grid, ox, oy, 16) !== null
  let pensInVillage = 0
  let fieldsInVillage = 0
  let wheatStock = 0
  let sheepNear = 0
  for (const o of state.villagers) {
    if (!o.alive || o.villageId !== v.villageId) continue
    if (o.hasPen) pensInVillage++
    if (o.hasField || o.fieldX >= 0) fieldsInVillage++
    wheatStock += countOf(o.inventory, 'wheat')
    if (o.chestInventory) wheatStock += countOf(o.chestInventory, 'wheat')
  }
  for (const s of state.sheep ?? []) {
    if (s.alive && distance(s.x, s.y, ox, oy) < 40) sheepNear++
  }

  const forestLead = woodNear >= Math.max(stoneNear, berriesNear, ironNear, mountainNear * 0.45) && woodNear > 6
  const shoreLead = water && woodNear < 28
  const mountainLead = mountainNear > 10 && mountainNear >= woodNear * 0.7 && oreRich > 8
  const ironLead = (ironNear > 4 || oreRich > 40) && ironNear + oreRich * 0.08 >= Math.max(woodNear * 0.25, stoneNear * 0.4)

  const location = emptyScores()
  location.forager = berriesNear * 1.4 - countJob('forager') * 12 + (coldPasture ? 18 : 0)
  location.farmer =
    ((24 - Math.min(berriesNear, 24)) * 1.5 +
      (fieldsInVillage > 0 ? 12 : 0) +
      (v.fieldX >= 0 ? 90 : 0) +
      farmerProfessionPressure(state, v.villageId, farmClimate) +
      (wheatStock >= 2 ? 16 : 0) -
      countJob('farmer') * 10) *
      (0.2 + farmClimate) -
    (farmClimate < 0.25 ? 45 : 0)
  location.fisher =
    (water ? 48 : -50) - countJob('fisher') * 10 + (shoreLead ? 28 : 0) + (coldPasture && water ? 22 : 0)
  location.miller =
    (village?.hasMill ? 42 : wheatStock >= 2 || fieldsInVillage > 0 ? 12 : -30) * (0.35 + farmClimate * 0.65) -
    countJob('miller') * 30 -
    (farmClimate < 0.25 && wheatStock < 4 ? 35 : 0)
  location.lumberjack =
    woodNear * 1.35 - countJob('lumberjack') * 12 + (forestLead ? 26 : 0) + (coldPasture && woodNear > 8 ? 14 : 0)
  location.mason = stoneNear * 1.25 - countJob('mason') * 12 + (mountainLead && !ironLead ? 10 : 0)
  location.guard = wolvesNear * 14 + banditsNear * 18 - countJob('guard') * 14
  location.builder = -countJob('builder') * 12
  location.herder =
    (pensInVillage > 0 ? 28 : 10) +
    (20 - Math.min(berriesNear, 20)) * 1.1 -
    countJob('herder') * 12 +
    (coldPasture ? 24 : 0) +
    Math.min(72, sheepNear * 3.2) +
    (sheepNear >= 6 ? 28 : 0)
  location.trader =
    (village?.hasPort ? 22 : 0) +
    (village && village.attractiveness > 40 ? 12 : 0) +
    (village && (village.tradeRuns ?? 0) > 0 ? 28 : 0) +
    (village && (village.hasMarket || (village.prosperity ?? 0) > 55) ? 18 : 0) -
    countJob('trader') * 14 +
    (coldPasture ? 10 : 0)
  location.weaver =
    (pensInVillage > 0 ? 35 : 8) -
    countJob('weaver') * 12 +
    Math.min(40, sheepNear * 1.6) +
    (sheepNear >= 6 ? 22 : 0) +
    (countJob('herder') > 0 ? 18 : 0)
  location.blacksmith =
    ironNear * 1.45 +
    oreRich * 0.12 -
    countJob('blacksmith') * 14 +
    (ironLead ? 22 : 0) +
    (village?.hasMine ? 26 : 0)
  location.miner =
    mountainNear * 0.55 +
    oreRich * 0.35 -
    countJob('miner') * 16 +
    (mountainLead ? 28 : 0) -
    (oreRich < 6 ? 40 : 0)

  const withPers = cloneScores(location)
  withPers.forager += p.curiosity * 20
  withPers.farmer += p.ambition * 14 * (0.2 + farmClimate)
  withPers.fisher += p.curiosity * 12
  withPers.miller += p.ambition * 12
  withPers.lumberjack += p.ambition * 18
  withPers.mason += p.ambition * 15
  withPers.guard += p.courage * 34
  withPers.builder += p.ambition * 26 + p.sociability * 16
  withPers.herder += p.generosity * 16
  withPers.trader += (1 - p.generosity) * 30 + p.sociability * 20 + p.ambition * 10
  withPers.weaver += p.sociability * 18 + p.curiosity * 10
  withPers.blacksmith += p.ambition * 20
  withPers.miner += p.ambition * 24 + p.courage * 12

  const demand = computeCareerDemand(state, village)

  const withFood = cloneScores(withPers)
  addFoodDemandOnly(withFood, demand)

  const withDemand = cloneScores(withFood)
  addNonFoodDemand(withDemand, demand)
  // Agent C: personal need-basket demand nudges métier scores (no dual applyProfession).
  applyPersonalDemandNudge(withDemand, v)

  const withSkills = cloneScores(withDemand)
  const mind = mindOf(v)
  for (const key of JOBS) {
    withSkills[key] += professionSkillPrefScore(mind.skills, mind.preferences, key)
  }

  const withMix = cloneScores(withSkills)
  const mix = mind.livelihood?.mix
  if (mix) {
    withMix.lumberjack += mix.gather * 28 + mix.build * 8
    withMix.farmer += mix.farm * 42
    withMix.fisher += mix.fish * 42
    withMix.builder += mix.build * 40 + mix.craft * 8
    withMix.mason += mix.mine * 18 + mix.build * 22
    withMix.miner += mix.mine * 45
    withMix.blacksmith += mix.craft * 36 + mix.mine * 12
    withMix.weaver += mix.craft * 28 + mix.farm * 10
    withMix.trader += mix.trade * 48 + mix.social * 10
    withMix.guard += mix.fight * 42
    withMix.herder += mix.farm * 16 + mix.care * 18
    withMix.miller += mix.farm * 14 + mix.craft * 10
    withMix.forager += mix.gather * 12
  }

  return { location, withPers, withFood, withDemand, withSkills, withMix, demand }
}