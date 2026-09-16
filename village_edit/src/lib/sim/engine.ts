import { HOUSE_SHAPES } from './architecture'
import { createBlockWorld } from './build'
import {
  tickCombat,
  tickFamine,
  tickFields,
  tickHorse,
  tickHorseBreeding,
  tickRegrowth,
  tickReproduction,
  tickSheep,
  tickTrade,
  tickVillageEconomy,
  tickVillager,
  tickWolf,
  tickWolfReproduction,
  checkRoadMilestones,
} from './behaviors'
import { tickMarketPrices, tickUrbanNetwork } from './commerce'
import { makeHorse } from './horses'
import { createEmptyEquipment, seedStarterKit } from './equipment'
import { addToInventory, countOf, createInventory, edibleValue } from './inventory'
import {
  applyGeneticPersonalityBias,
  createFounderGenome,
  expressPhenotype,
} from './genetics'
import { seedFounderKin, tickAncestorMemory, tickLineages } from './family'
import { clearMarriageCaches, tickAdoption, tickMarriage } from './marriage'
import { generateName, generatePersonality } from './personality'
import { compactIndex } from './resourceIndex'
import { resetPathBudget } from './pathfinding'
import { agentHash } from './kernels'
import { tickRoadWear } from './roads'
import { pickAmbition, setRememberBridge } from './social'
import { mindOf, onRemember, resetCognitionCaches } from './cognition'
import { getSimPerfBudget } from './perfBudget'
import { seedPioneerCamps, tickBuildProjects } from './construction'
import { tickTechnology } from './technology'
import {
  resetEthnosCaches,
  seedFounderEthnos,
  tickEthnosWorld,
} from './ethnos'
import { resetPoliticsCaches, tickPolitics, politicsSummary } from './politics'
import {
  getCalendar,
  seasonFromTick,
  seasonProgressFromTick,
  yearFromTick,
} from './calendar'
import {
  WALL_STONE,
  WALL_WOOD,
  setWorldSize,
  type Horse,
  type Profession,
  type SimState,
  type SimStats,
  type Sheep,
  type Villager,
  type Wolf,
} from './types'
import { createClimate, tickClimate } from './climate'
import { applySimConfig, type SimConfigInput } from './simConfig'
import { createWorldGrid, ensureLocalBerryPatch, ensureLocalSpring, ensureLocalTimberStand, findNearbyShore, makeRng, randomWalkableTile, randomWalkableTileNear, resourceDensity } from './world'
import { FOUNDER_AGE_MIN, FOUNDER_AGE_SPAN } from './ages'

const GROUP_SPREAD = 14
const HORSE_HERDS = 3
/** Lean purse — just enough to learn coins exist; trade must earn the rest. */
const STARTER_COINS = 1
/** Mix frais + pain (se conserve) — trop de baies pourrissent vers j5 ; privilégier le pain. */
const STARTER_FOOD = 4
const STARTER_BREAD = 12
/**
 * No free construction timber — walls/floors/furniture wood must be chopped first.
 * (Stone is never gifted either.)
 */
const STARTER_WOOD = 0

function newVillagerInventory() {
  // 8 slots: food/coin + gather extras (resin, herbs…) without choking craft inputs.
  const inv = createInventory(8)
  addToInventory(inv, 'coin', STARTER_COINS)
  // Stamp spoil clocks at spawn so berries age from day 0 (not first spoil check).
  addToInventory(inv, 'food', STARTER_FOOD, 0)
  addToInventory(inv, 'bread', STARTER_BREAD, 0)
  if (STARTER_WOOD > 0) addToInventory(inv, 'wood', STARTER_WOOD)
  addToInventory(inv, 'wheat', 2, 0)
  return inv
}

const FOUNDING_SITE_CANDIDATES = 28
const FOUNDING_SITE_RADIUS = 70
/** Eau potable à portée de marche pour un camp fondateur. */
const FOUNDING_WATER_R = 26

/**
 * Camps fondateurs : eau d’abord, puis bois/pierre. Ne plus maximiser les buissons
 * (ça plaçait les groupes dans des tapis de baies loin des rivières → mort de soif).
 */
function pickFoundingSite(grid: ReturnType<typeof createWorldGrid>, rng: () => number): { x: number; y: number } {
  let best: { x: number; y: number } | null = null
  let bestScore = -Infinity
  for (let i = 0; i < FOUNDING_SITE_CANDIDATES; i++) {
    const candidate = randomWalkableTile(grid, rng)
    const shore = findNearbyShore(grid, candidate.x, candidate.y, FOUNDING_WATER_R + 8)
    const waterDist = shore
      ? Math.hypot(shore.x - candidate.x, shore.y - candidate.y)
      : FOUNDING_WATER_R + 40
    const waterScore =
      waterDist <= FOUNDING_WATER_R
        ? 18 - waterDist * 0.35
        : waterDist <= FOUNDING_WATER_R + 8
          ? 4
          : -22
    // Prefer open plains: lightly reward a few bushes, penalize berry carpets.
    // Timber is required — no free starter wood, so camps without trees softlock.
    const bushNear = resourceDensity(grid, candidate.x, candidate.y, 'bush', FOUNDING_SITE_RADIUS)
    const treeNear = resourceDensity(grid, candidate.x, candidate.y, 'tree', FOUNDING_SITE_RADIUS)
    const score =
      waterScore +
      treeNear * 2.4 +
      (treeNear < 3 ? -30 : 0) +
      resourceDensity(grid, candidate.x, candidate.y, 'stone', FOUNDING_SITE_RADIUS) * 0.55 +
      Math.min(bushNear, 4) * 0.15 -
      Math.max(0, bushNear - 5) * 1.2
    if (score > bestScore) {
      bestScore = score
      best = candidate
    }
  }
  return best ?? randomWalkableTile(grid, rng)
}

export function createSimulation(seed = 1, configInput?: SimConfigInput): SimState {
  const cfg = applySimConfig({ ...configInput, seed })
  setWorldSize(cfg.worldSize)
  resetPoliticsCaches()
  resetCognitionCaches()
  resetEthnosCaches()
  clearMarriageCaches()
  setRememberBridge(onRemember)
  const grid = createWorldGrid(seed)
  const climate = createClimate(grid, seed)
  const rng = makeRng(seed + 1)
  let nextId = 1

  const foundingGroups = Math.max(2, Math.min(8, Math.ceil(cfg.initialVillagers / 8)))
  const groupSpread = Math.max(10, Math.round(GROUP_SPREAD * (cfg.worldSize / 1000)))

  const groupCenters = Array.from({ length: foundingGroups }, () => pickFoundingSite(grid, rng))
  // Guarantee drinkable shore, forage, and timber (wood is farmed — never gifted).
  for (const c of groupCenters) {
    ensureLocalSpring(grid, c.x, c.y, FOUNDING_WATER_R)
    ensureLocalBerryPatch(grid, c.x, c.y, rng, 7)
    ensureLocalTimberStand(grid, c.x, c.y, rng, 12)
  }

  const villagers: Villager[] = []
  for (let i = 0; i < cfg.initialVillagers; i++) {
    const base = groupCenters[i % foundingGroups]
    const spot = randomWalkableTileNear(grid, rng, base.x, base.y, groupSpread)
    const personSeed = Math.floor(rng() * 4294967296)
    const genome = createFounderGenome(rng)
    const phenotype = expressPhenotype(genome, rng)
    const personality = applyGeneticPersonalityBias(generatePersonality(personSeed), genome, rng)
    villagers.push({
      id: nextId++,
      seed: personSeed,
      name: generateName(personSeed),
      surname: '',
      lineageId: null,
      familyId: null,
      spouseId: null,
      marriageKind: null,
      marriedTick: 0,
      mourningUntilTick: 0,
      refusesMarriage: false,
      adoptiveParentIds: [],
      personality,
      profession: 'none',
      ambition: pickAmbition(personality, rng),
      grudgeTarget: null,
      parentIds: [],
      motherId: null,
      fatherId: null,
      genome,
      phenotype,
      x: spot.x,
      y: spot.y,
      health: 6,
      hunger: 4,
      thirst: 4,
      stamina: 4,
      starveTimer: 0,
      thirstTimer: 0,
      coldExposure: 0,
      heatExposure: 0,
      healTimer: 0,
      illness: null,
      sleepDebt: 0,
      inventory: newVillagerInventory(),
      task: null,
      savedTask: null,
      nextThinkTick: 0,
      toolTier: 'none',
      toolWear: 0,
      equipment: createEmptyEquipment(),
      memories: [],
      relations: new Map(),
      house: null,
      homeLayout: null,
      furnitureQueue: [],
      homePlan: null,
      buildQueue: [],
      horseId: null,
      mounted: false,
      hasCart: false,
      boatId: null,
      embarked: false,
      tradeCooldown: 0,
      hasWorkbench: false,
      workbenchX: -1,
      workbenchY: -1,
      hasHome: false,
      homeX: -1,
      homeY: -1,
      homeOwnerId: null,
      bedCount: 0,
      hasTable: false,
      tableX: -1,
      tableY: -1,
      hasPen: false,
      penX: -1,
      penY: -1,
      penFeed: 0,
      hasField: false,
      fieldX: -1,
      fieldY: -1,
      hasChest: false,
      chestX: -1,
      chestY: -1,
      chestInventory: null,
      homeFurniture: [],
      cupboardInventory: null,
      torchLitUntil: 0,
      homeLightUntil: 0,
      hearthLitUntil: 0,
      villageId: null,
      hue: phenotype.hue,
      alive: true,
      age: FOUNDER_AGE_MIN + Math.floor(rng() * FOUNDER_AGE_SPAN),
      reproCooldown: 0,
      pregnancy: null,
      activeProjectId: null,
      knowledge: [],
    })
  }

  for (const v of villagers) {
    seedStarterKit(v, 0.04 + rng() * 0.16, v.profession, rng)
    // Soft heat_wood seed so charcoal / bronze chains aren't knowledge-locked forever.
    if (rng() < 0.18) {
      v.knowledge.push({
        id: 'heat_wood',
        labelFr: 'chauffer le bois',
        confidence: 0.4 + rng() * 0.25,
        discoveredTick: 0,
        inputs: ['wood'],
        process: ['heat'],
        outputs: ['ember_know'],
        purposes: ['craft'],
      })
    }
  }

  const sheep: Sheep[] = []
  for (let i = 0; i < cfg.sheepCount; i++) {
    const spot = randomWalkableTile(grid, rng)
    sheep.push({
      id: nextId++,
      x: spot.x,
      y: spot.y,
      health: 2,
      hunger: 3 + rng(),
      starveTimer: 0,
      healTimer: 0,
      captured: false,
      ownerId: null,
      breedCooldown: 0,
      woolCooldown: 0,
      alive: true,
    })
  }

  const horses: Horse[] = []
  const herdCentres = Array.from({ length: HORSE_HERDS }, () => randomWalkableTile(grid, rng))
  for (let i = 0; i < cfg.horseCount; i++) {
    const base = herdCentres[i % HORSE_HERDS]
    const spot = randomWalkableTileNear(grid, rng, base.x, base.y, 10)
    horses.push(makeHorse(nextId++, spot.x, spot.y, 3 + rng()))
  }

  const wolves: Wolf[] = []
  for (let i = 0; i < cfg.wolfCount; i++) {
    // Keep packs away from founding camps — day-1 wolf ambushes wiped pioneers.
    let spot = randomWalkableTile(grid, rng)
    for (let attempt = 0; attempt < 40; attempt++) {
      const candidate = randomWalkableTile(grid, rng)
      let nearCamp = false
      for (const c of groupCenters) {
        if (Math.hypot(candidate.x - c.x, candidate.y - c.y) < 70) {
          nearCamp = true
          break
        }
      }
      if (!nearCamp) {
        spot = candidate
        break
      }
    }
    wolves.push({
      id: nextId++,
      x: spot.x,
      y: spot.y,
      health: 2,
      hunger: 3 + rng(),
      starveTimer: 0,
      healTimer: 0,
      breedCooldown: 0,
      targetId: null,
      targetKind: null,
      alive: true,
    })
  }

  const state: SimState = {
    tick: 0,
    season: 'spring',
    year: 1,
    famine: false,
    climate,
    grid,
    villagers,
    sheep,
    horses,
    boats: [],
    wolves,
    villages: [],
    nextId,
    nextVillageId: 1,
    births: 0,
    deaths: 0,
    bridges: 0,
    thefts: 0,
    brawls: 0,
    compactCursor: 0,
    tradeRoutes: new Set<string>(),
    log: [],
    prices: {},
    milestones: {
      firstHouse: false,
      firstPath: false,
      firstRoad: false,
      firstMill: false,
      firstWell: false,
      firstPlazaFire: false,
      firstPort: false,
      firstBoatVoyage: false,
      firstBirth: false,
      firstMarriage: false,
      firstAdoption: false,
      firstFamine: false,
      firstRegionalHub: false,
      firstStorm: false,
      firstMasterwork: false,
    },
    circles: [],
    nextCircleId: 1,
    rumors: [],
    nextRumorId: 1,
    projects: [],
    nextProjectId: 1,
    families: [],
    nextFamilyId: 1,
    lineages: [],
    nextLineageId: 1,
    genealogy: [],
    languages: [],
    nextLanguageId: 1,
    ethnies: [],
    nextEthnieId: 1,
    blocks: createBlockWorld(grid.width, grid.height),
  }
  seedFounderKin(state, villagers, rng)
  seedFounderEthnos(state, villagers, rng)
  seedPioneerCamps(state, groupCenters, villagers, foundingGroups, rng)
  return state
}

const stepRng = makeRng(42)

function tickBoats(state: SimState) {
  for (const b of state.boats) {
    if (!b.alive || b.ownerId === null) continue
    let owner = null as (typeof state.villagers)[0] | null
    const oid = b.ownerId
    for (let i = 0; i < state.villagers.length; i++) {
      const v = state.villagers[i]
      if (v.id === oid && v.alive) {
        owner = v
        break
      }
    }
    if (owner?.embarked) {
      b.x = owner.x
      b.y = owner.y
    }
  }
}

export function stepSimulation(state: SimState): SimState {
  state.tick += 1
  let aliveAgents = 0
  for (let i = 0; i < state.villagers.length; i++) {
    if (state.villagers[i].alive) aliveAgents++
  }
  resetPathBudget(aliveAgents)
  agentHash.rebuild(state)

  state.season = seasonFromTick(state.tick)
  state.year = yearFromTick(state.tick)

  tickClimate(state, stepRng)

  if (state.tick % 40 === 0) tickFamine(state)
  const commerceEvery = Math.max(200, Math.round(300 * getSimPerfBudget().commercePeriodMul))
  if (state.tick % commerceEvery === 0) {
    tickVillageEconomy(state)
    tickUrbanNetwork(state)
    tickMarketPrices(state)
  }

  for (let vi = 0; vi < state.villagers.length; vi++) {
    const v = state.villagers[vi]
    if (v.alive) tickVillager(state, v, stepRng)
  }
  tickTrade(state)
  tickMarriage(state, stepRng)
  tickReproduction(state, stepRng)
  tickAdoption(state, stepRng)
  tickFields(state)
  for (let si = 0; si < state.sheep.length; si++) {
    const s = state.sheep[si]
    if (s.alive && ((state.tick + s.id) & 1) === 0) tickSheep(state, s, stepRng)
  }
  if (state.tick % 2 === 0) {
    for (let hi = 0; hi < state.horses.length; hi++) {
      const h = state.horses[hi]
      if (h.alive) tickHorse(state, h, stepRng)
    }
  }
  tickBoats(state)
  for (let wi = 0; wi < state.wolves.length; wi++) {
    const w = state.wolves[wi]
    if (w.alive) tickWolf(state, w, stepRng)
  }
  tickCombat(state, stepRng)
  if (state.tick % 3 === 0) {
    tickWolfReproduction(state)
    tickHorseBreeding(state)
  }
  tickRegrowth(state, stepRng)
  if (state.tick % 4 === 0) tickRoadWear(state.grid, state.tick)
  if (state.tick % 60 === 0) checkRoadMilestones(state)
  if (state.tick % 4 === 0) state.compactCursor = compactIndex(state.grid.index, state.grid, state.compactCursor)

  tickPolitics(state)
  tickBuildProjects(state)
  tickTechnology(state, stepRng)
  tickLineages(state, stepRng)
  tickAncestorMemory(state)
  tickEthnosWorld(state, stepRng, (v) => {
    const mind = mindOf(v)
    return { cultureTag: mind.cultureTag, rivalId: mind.rivalId }
  })

  if (state.tick % 200 === 0) {
    state.villagers = state.villagers.filter((v) => v.alive)
    state.sheep = state.sheep.filter((s) => s.alive)
    state.horses = state.horses.filter((h) => h.alive)
    state.wolves = state.wolves.filter((w) => w.alive)
    state.boats = state.boats.filter((b) => b.alive)
    const aliveIds = new Set<number>()
    for (let i = 0; i < state.villagers.length; i++) aliveIds.add(state.villagers[i].id)
    for (const village of state.villages) {
      village.memberIds = village.memberIds.filter((id) => aliveIds.has(id))
    }
    state.villages = state.villages.filter((vg) => vg.memberIds.length > 0)
    for (const c of state.circles) {
      c.memberIds = c.memberIds.filter((id) => aliveIds.has(id))
    }
    state.circles = state.circles.filter((c) => c.memberIds.length >= 2)
  }

  return state
}

export function computeStats(state: SimState): SimStats {
  let sheep = 0
  let horsesWild = 0
  let horsesTamed = 0
  let riders = 0
  let carts = 0
  let boats = 0
  let ports = 0
  let tradeRunsTotal = 0
  let totalCoins = 0
  let totalBread = 0
  let houses = 0
  let pens = 0
  let fields = 0
  let mills = 0
  let friendships = 0
  let feuds = 0
  let naturalCover = 0
  let villagers = 0
  let wolves = 0
  let hungerSum = 0
  let thirstSum = 0
  let edibleSum = 0
  let homeless = 0
  let wells = 0
  let plazaFires = 0
  const professions: Record<Profession, number> = {
    none: 0,
    forager: 0,
    farmer: 0,
    fisher: 0,
    miller: 0,
    lumberjack: 0,
    mason: 0,
    guard: 0,
    builder: 0,
    herder: 0,
    trader: 0,
    weaver: 0,
    blacksmith: 0,
    miner: 0,
  }
  const shapes: Record<string, number> = {}
  for (const s of HOUSE_SHAPES) shapes[s] = 0

  for (const s of state.sheep) if (s.alive) sheep++
  for (const w of state.wolves) if (w.alive) wolves++
  for (const h of state.horses) {
    if (!h.alive) continue
    if (h.tamed) horsesTamed++
    else horsesWild++
  }
  for (const b of state.boats) if (b.alive) boats++
  for (const vg of state.villages) {
    if (vg.hasMill) mills++
    if (vg.hasPort) ports++
    if (vg.hasWell) wells++
    if (vg.hasPlazaFire) plazaFires++
    tradeRunsTotal += vg.tradeRuns
    naturalCover += vg.naturalCover
  }

  for (const v of state.villagers) {
    if (!v.alive) continue
    villagers++
    hungerSum += Number.isFinite(v.hunger) ? v.hunger : 0
    thirstSum += Number.isFinite(v.thirst) ? v.thirst : 0
    edibleSum += edibleValue(v.inventory)
    if (!v.hasHome) homeless++
    totalCoins += countOf(v.inventory, 'coin')
    totalBread += countOf(v.inventory, 'bread')
    professions[v.profession] += 1
    if (v.mounted) riders++
    if (v.hasCart) carts++
    if (v.hasHome && v.homeOwnerId === v.id) {
      houses++
      if (v.house) shapes[v.house.shape] = (shapes[v.house.shape] ?? 0) + 1
    }
    if (v.hasPen) pens++
    if (v.hasField) fields++
    if (v.chestInventory) {
      totalBread += countOf(v.chestInventory, 'bread')
      edibleSum += edibleValue(v.chestInventory)
    }
    for (const rel of v.relations.values()) {
      if (rel.affinity > 0.5) friendships++
      else if (rel.affinity < -0.5) feuds++
    }
  }

  const roadTiles = state.grid.roadTiles
  let wallTiles = 0
  for (const vg of state.villages) {
    for (const c of vg.perimeter) {
      const t = state.grid.terrain[c.y * state.grid.width + c.x]
      if (t === WALL_WOOD || t === WALL_STONE) wallTiles++
    }
  }

  const pol = politicsSummary(state)

  const calendar = getCalendar(state.tick)
  return {
    tick: state.tick,
    season: calendar.season,
    seasonProgress: seasonProgressFromTick(state.tick),
    year: calendar.year,
    calendar,
    famine: state.famine,
    villagers,
    sheep,
    horsesWild,
    horsesTamed,
    riders,
    carts,
    boats,
    ports,
    tradeRunsTotal,
    wolves,
    totalCoins,
    totalBread,
    houses,
    pens,
    fields,
    mills,
    villages: state.villages.length,
    bridges: state.bridges,
    roadTiles,
    wallTiles,
    naturalCover,
    births: state.births,
    deaths: state.deaths,
    thefts: state.thefts,
    brawls: state.brawls,
    friendships: Math.round(friendships / 2),
    feuds: Math.round(feuds / 2),
    professions,
    shapes,
    prices: state.prices,
    circles: pol.circles,
    institutions: pol.institutions,
    rumors: pol.rumors,
    leadingCircle: pol.leadingName,
    leadingLegitimacy: pol.leadingLegitimacy,
    avgHunger: villagers > 0 ? hungerSum / villagers : 0,
    avgThirst: villagers > 0 ? thirstSum / villagers : 0,
    avgEdible: villagers > 0 ? edibleSum / villagers : 0,
    homeless,
    wells,
    plazaFires,
  }
}
