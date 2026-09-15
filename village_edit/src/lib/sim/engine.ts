import { HOUSE_SHAPES } from './architecture'
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
import { addToInventory, countOf, createInventory, STACK_SIZE } from './inventory'
import { pickSex } from './appearance'
import {
  applyGeneticPersonalityBias,
  createFounderGenome,
  expressPhenotype,
} from './genetics'
import { seedFounderKin, tickAncestorMemory, tickLineages } from './family'
import { tickAdoption, tickMarriage } from './marriage'
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
import { coldStress01, createClimate, sampleBiome, sampleTempC, tickClimate } from './climate'
import {
  BiomeId,
  FAUNA_WEIGHT_MAX,
  faunaSpawnWeight,
  biomeColdBias,
  biomeSettlementScore,
  biomeIsFoundable,
  type FaunaKind,
} from './biomes'
import { applySimConfig, type SimConfigInput } from './simConfig'
import { createWorldGrid, makeRng, randomWalkableTile, randomWalkableTileNear, resourceDensity } from './world'

const GROUP_SPREAD = 14
const HORSE_HERDS = 3
/** A small starting purse so the coin economy (buying materials, minting, trade) isn't stuck at zero forever waiting for the first lucky gold find. */
const STARTER_COINS = 4
/**
 * Rations de fondation — un stack plein (STACK_SIZE).
 * Couvre la 1ʳᵉ semaine pendant que la cueillette / les champs s’installent ;
 * pas un buff permanent (la faim BMR reste réelle).
 */
const STARTER_FOOD = STACK_SIZE
/** Bois de départ — lance + premiers murs / établi sans bloquer sur la cueillette seule. */
const STARTER_WOOD = STACK_SIZE
/** Grain de semence — meunerie / réserve ; les champs pioneer sont pré-semés à part. */
const STARTER_WHEAT = 3
/**
 * Âge tick des fondateurs : adultes (CHILD_AGE≈220, ELDER_AGE≈800).
 * age=0 les traitait comme enfants pendant ~3 jours-sim.
 */
const FOUNDER_AGE_MIN = 280
const FOUNDER_AGE_SPAN = 420

function newVillagerInventory() {
  // 8 slots: food/coin/wood/wheat + gather extras without choking craft inputs.
  const inv = createInventory(8)
  addToInventory(inv, 'coin', STARTER_COINS)
  addToInventory(inv, 'food', STARTER_FOOD)
  addToInventory(inv, 'wood', STARTER_WOOD)
  addToInventory(inv, 'wheat', STARTER_WHEAT)
  return inv
}

const FOUNDING_SITE_CANDIDATES = 24
const FOUNDING_SITE_RADIUS = 70

/**
 * A founding village needs food and building material nearby to survive its first winters. On a
 * large map a purely random spot can land in a genuine desert far from any bush, tree or stone,
 * dooming that group before it starts — so instead of one random tile, sample a wide batch and
 * keep the one with the best combined resource density around it. Prefer hospitable (foundable)
 * biomes hard; never let alpine/tundra density spikes beat temperate farmland.
 */
function pickFoundingSite(
  grid: ReturnType<typeof createWorldGrid>,
  climate: NonNullable<SimState['climate']>,
  rng: () => number,
): { x: number; y: number } {
  let bestSoft: { x: number; y: number } | null = null
  let bestSoftScore = -Infinity
  let bestFoundable: { x: number; y: number } | null = null
  let bestFoundableScore = -Infinity
  const attempts = FOUNDING_SITE_CANDIDATES * 12
  for (let i = 0; i < attempts; i++) {
    const candidate = randomWalkableTile(grid, rng)
    const biome = sampleBiome(climate, candidate.x, candidate.y)
    if (biome === BiomeId.ocean) continue
    const biomeMul = biomeSettlementScore(biome)
    const resources =
      resourceDensity(grid, candidate.x, candidate.y, 'bush', FOUNDING_SITE_RADIUS) * 2 +
      resourceDensity(grid, candidate.x, candidate.y, 'tree', FOUNDING_SITE_RADIUS) +
      resourceDensity(grid, candidate.x, candidate.y, 'stone', FOUNDING_SITE_RADIUS) * 0.5
    const score = resources * biomeMul
    if (biomeIsFoundable(biome) && score > bestFoundableScore) {
      bestFoundableScore = score
      bestFoundable = candidate
    }
    // Soft fallback still crushes hostile biomes so we don't settle alpine/tundra.
    const soft = score * (biomeMul >= 0.75 ? 1 : 0.08)
    if (soft > bestSoftScore) {
      bestSoftScore = soft
      bestSoft = candidate
    }
  }
  if (bestFoundable) return bestFoundable
  if (bestSoft && biomeSettlementScore(sampleBiome(climate, bestSoft.x, bestSoft.y)) >= 0.75) {
    return bestSoft
  }
  // Last resort: rejection-sample any foundable tile on the map.
  for (let i = 0; i < 400; i++) {
    const candidate = randomWalkableTile(grid, rng)
    if (biomeIsFoundable(sampleBiome(climate, candidate.x, candidate.y))) return candidate
  }
  return bestSoft ?? randomWalkableTile(grid, rng)
}

/** Keep founding members on hospitable tiles near the cluster center (avoid taïga/alpin bleed). */
function pickFoundingMemberTile(
  grid: ReturnType<typeof createWorldGrid>,
  climate: NonNullable<SimState['climate']>,
  rng: () => number,
  baseX: number,
  baseY: number,
  spread: number,
): { x: number; y: number } {
  for (let attempt = 0; attempt < 64; attempt++) {
    const spot = randomWalkableTileNear(grid, rng, baseX, baseY, spread)
    if (biomeIsFoundable(sampleBiome(climate, spot.x, spot.y))) return spot
  }
  for (let attempt = 0; attempt < 80; attempt++) {
    const spot = randomWalkableTileNear(grid, rng, baseX, baseY, spread * 3)
    if (biomeIsFoundable(sampleBiome(climate, spot.x, spot.y))) return spot
  }
  // Center itself should already be foundable from pickFoundingSite.
  return { x: baseX, y: baseY }
}

/**
 * Rejection-sample a walkable tile weighted by biome fauna density
 * (wolves denser in boreal, horses on grassland/savanna, scarce desert game).
 */
function pickFaunaSpawnTile(
  grid: ReturnType<typeof createWorldGrid>,
  climate: NonNullable<SimState['climate']>,
  rng: () => number,
  kind: FaunaKind,
): { x: number; y: number } {
  const maxW = FAUNA_WEIGHT_MAX[kind]
  for (let attempt = 0; attempt < 120; attempt++) {
    const spot = randomWalkableTile(grid, rng)
    const biome = sampleBiome(climate, spot.x, spot.y)
    if (biome === BiomeId.ocean) continue
    const w = faunaSpawnWeight(biome, kind)
    if (rng() * maxW <= w) return spot
  }
  for (let attempt = 0; attempt < 80; attempt++) {
    const spot = randomWalkableTile(grid, rng)
    if (sampleBiome(climate, spot.x, spot.y) !== BiomeId.ocean) return spot
  }
  return randomWalkableTile(grid, rng)
}

function pickFaunaNear(
  grid: ReturnType<typeof createWorldGrid>,
  climate: NonNullable<SimState['climate']>,
  rng: () => number,
  kind: FaunaKind,
  nearX: number,
  nearY: number,
  radius: number,
): { x: number; y: number } {
  for (let attempt = 0; attempt < 40; attempt++) {
    const spot = randomWalkableTileNear(grid, rng, nearX, nearY, radius)
    if (sampleBiome(climate, spot.x, spot.y) !== BiomeId.ocean) return spot
  }
  return pickFaunaSpawnTile(grid, climate, rng, kind)
}

export function createSimulation(seed = 1, configInput?: SimConfigInput): SimState {
  const cfg = applySimConfig({ ...configInput, seed })
  setWorldSize(cfg.worldSize)
  resetPoliticsCaches()
  resetCognitionCaches()
  resetEthnosCaches()
  setRememberBridge(onRemember)
  const grid = createWorldGrid(seed)
  const climate = createClimate(grid, seed)
  const rng = makeRng(seed + 1)
  let nextId = 1

  const foundingGroups = Math.max(2, Math.min(8, Math.ceil(cfg.initialVillagers / 8)))
  const groupSpread = Math.max(10, Math.round(GROUP_SPREAD * (cfg.worldSize / 1000)))

  const groupCenters = Array.from({ length: foundingGroups }, () => pickFoundingSite(grid, climate, rng))

  const villagers: Villager[] = []
  for (let i = 0; i < cfg.initialVillagers; i++) {
    const base = groupCenters[i % foundingGroups]
    const spot = pickFoundingMemberTile(grid, climate, rng, base.x, base.y, groupSpread)
    const personSeed = Math.floor(rng() * 4294967296)
    const genome = createFounderGenome(rng)
    const phenotype = expressPhenotype(genome, rng)
    const personality = applyGeneticPersonalityBias(generatePersonality(personSeed), genome, rng)
    villagers.push({
      id: nextId++,
      seed: personSeed,
      sex: pickSex(rng),
      name: generateName(personSeed),
      surname: '',
      lineageId: null,
      familyId: null,
      spouseId: null,
      marriageKind: null,
      marriedTick: 0,
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
      hunger: 6,
      stamina: 4,
      starveTimer: 0,
      healTimer: 0,
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
      activeProjectId: null,
      knowledge: [],
    })
  }

  for (const v of villagers) {
    const air = sampleTempC(climate, v.x, v.y)
    const cold01 = Math.min(1, coldStress01(air) + biomeColdBias(sampleBiome(climate, v.x, v.y)) * 0.85)
    seedStarterKit(v, 0.2 + rng() * 0.35, v.profession, rng, { cold01 })
    // Soft heat_wood seed so charcoal / bronze chains aren't knowledge-locked forever.
    if (rng() < 0.55) {
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
  // Seed a share of flocks near founders so early wolves prefer livestock over people.
  const nearFounderSheep = Math.min(cfg.sheepCount, Math.max(2, Math.floor(cfg.sheepCount * 0.4)))
  for (let i = 0; i < cfg.sheepCount; i++) {
    const base = groupCenters[i % foundingGroups]
    const spot =
      i < nearFounderSheep
        ? pickFaunaNear(grid, climate, rng, 'sheep', base.x, base.y, Math.max(18, Math.round(groupSpread * 1.4)))
        : pickFaunaSpawnTile(grid, climate, rng, 'sheep')
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
  const herdCentres = Array.from({ length: HORSE_HERDS }, () => pickFaunaSpawnTile(grid, climate, rng, 'horse'))
  for (let i = 0; i < cfg.horseCount; i++) {
    const base = herdCentres[i % HORSE_HERDS]
    const spot = pickFaunaNear(grid, climate, rng, 'horse', base.x, base.y, 10)
    horses.push(makeHorse(nextId++, spot.x, spot.y, 3 + rng()))
  }

  const wolves: Wolf[] = []
  const founderSafeR = Math.max(48, Math.round(groupSpread * 3.2))
  for (let i = 0; i < cfg.wolfCount; i++) {
    let spot = pickFaunaSpawnTile(grid, climate, rng, 'wolf')
    for (let attempt = 0; attempt < 80; attempt++) {
      let tooClose = false
      for (const c of groupCenters) {
        const dx = spot.x - c.x
        const dy = spot.y - c.y
        if (dx * dx + dy * dy < founderSafeR * founderSafeR) {
          tooClose = true
          break
        }
      }
      if (!tooClose) break
      spot = pickFaunaSpawnTile(grid, climate, rng, 'wolf')
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
    deathsByWolf: 0,
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
    tradeRunsTotal += vg.tradeRuns
    naturalCover += vg.naturalCover
  }

  for (const v of state.villagers) {
    if (!v.alive) continue
    villagers++
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
    if (v.chestInventory) totalBread += countOf(v.chestInventory, 'bread')
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
    deathsByWolf: state.deathsByWolf ?? 0,
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
  }
}
