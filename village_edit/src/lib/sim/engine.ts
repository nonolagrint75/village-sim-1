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
} from './behaviors'
import { tickMarketPrices } from './commerce'
import { makeHorse } from './horses'
import { addToInventory, countOf, createInventory } from './inventory'
import { generateName, generatePersonality } from './personality'
import { compactIndex } from './resourceIndex'
import { tickRoadWear } from './roads'
import { pickAmbition } from './social'
import {
  SEASONS,
  TICKS_PER_SEASON,
  WALL_STONE,
  WALL_WOOD,
  type Horse,
  type Profession,
  type SimState,
  type SimStats,
  type Sheep,
  type Villager,
  type Wolf,
} from './types'
import { createWorldGrid, makeRng, randomWalkableTile, randomWalkableTileNear, resourceDensity } from './world'

const VILLAGER_COUNT = 26
const WILD_SHEEP_COUNT = 40
const WILD_HORSE_COUNT = 14
const WOLF_COUNT = 3
const FOUNDING_GROUPS = 4
const GROUP_SPREAD = 14
const HORSE_HERDS = 3
/** A small starting purse so the coin economy (buying materials, minting, trade) isn't stuck at zero forever waiting for the first lucky gold find. */
const STARTER_COINS = 4

function newVillagerInventory() {
  const inv = createInventory(5)
  addToInventory(inv, 'coin', STARTER_COINS)
  return inv
}

const FOUNDING_SITE_CANDIDATES = 18
const FOUNDING_SITE_RADIUS = 70

/**
 * A founding village needs food and building material nearby to survive its first winters. On a
 * large map a purely random spot can land in a genuine desert far from any bush, tree or stone,
 * dooming that group before it starts — so instead of one random tile, sample a wide batch and
 * keep the one with the best combined resource density around it. This only runs once per
 * founding group at world creation, so a generous candidate count costs nothing at runtime.
 */
function pickFoundingSite(grid: ReturnType<typeof createWorldGrid>, rng: () => number): { x: number; y: number } {
  let best: { x: number; y: number } | null = null
  let bestScore = -Infinity
  for (let i = 0; i < FOUNDING_SITE_CANDIDATES; i++) {
    const candidate = randomWalkableTile(grid, rng)
    const score =
      resourceDensity(grid, candidate.x, candidate.y, 'bush', FOUNDING_SITE_RADIUS) * 2 +
      resourceDensity(grid, candidate.x, candidate.y, 'tree', FOUNDING_SITE_RADIUS) +
      resourceDensity(grid, candidate.x, candidate.y, 'stone', FOUNDING_SITE_RADIUS) * 0.5
    if (score > bestScore) {
      bestScore = score
      best = candidate
    }
  }
  return best ?? randomWalkableTile(grid, rng)
}

export function createSimulation(seed = 1): SimState {
  const grid = createWorldGrid(seed)
  const rng = makeRng(seed + 1)
  let nextId = 1

  const groupCenters = Array.from({ length: FOUNDING_GROUPS }, () => pickFoundingSite(grid, rng))

  const villagers: Villager[] = []
  for (let i = 0; i < VILLAGER_COUNT; i++) {
    const base = groupCenters[i % FOUNDING_GROUPS]
    const spot = randomWalkableTileNear(grid, rng, base.x, base.y, GROUP_SPREAD)
    const personSeed = Math.floor(rng() * 4294967296)
    const personality = generatePersonality(personSeed)
    villagers.push({
      id: nextId++,
      seed: personSeed,
      name: generateName(personSeed),
      personality,
      profession: 'none',
      ambition: pickAmbition(personality, rng),
      grudgeTarget: null,
      parentIds: [],
      x: spot.x,
      y: spot.y,
      health: 4,
      hunger: 4,
      starveTimer: 0,
      healTimer: 0,
      inventory: newVillagerInventory(),
      task: null,
      nextThinkTick: 0,
      toolTier: 'none',
      memories: [],
      relations: new Map(),
      house: null,
      horseId: null,
      mounted: false,
      hasCart: false,
      boatId: null,
      tradeCooldown: 0,
      hasWorkbench: false,
      workbenchX: -1,
      workbenchY: -1,
      hasHome: false,
      homeX: -1,
      homeY: -1,
      homeOwnerId: null,
      bedCount: 0,
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
      villageId: null,
      hue: Math.floor(rng() * 360),
      alive: true,
      age: 0,
      reproCooldown: 0,
    })
  }

  const sheep: Sheep[] = []
  for (let i = 0; i < WILD_SHEEP_COUNT; i++) {
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
  for (let i = 0; i < WILD_HORSE_COUNT; i++) {
    const base = herdCentres[i % HORSE_HERDS]
    const spot = randomWalkableTileNear(grid, rng, base.x, base.y, 10)
    horses.push(makeHorse(nextId++, spot.x, spot.y, 3 + rng()))
  }

  const wolves: Wolf[] = []
  for (let i = 0; i < WOLF_COUNT; i++) {
    const spot = randomWalkableTile(grid, rng)
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

  return {
    tick: 0,
    season: 'spring',
    year: 1,
    famine: false,
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
  }
}

const stepRng = makeRng(42)

function tickBoats(state: SimState) {
  for (const b of state.boats) {
    if (!b.alive || b.ownerId === null) continue
    const owner = state.villagers.find((v) => v.id === b.ownerId && v.alive)
    if (owner) {
      b.x = owner.x
      b.y = owner.y
    }
  }
}

export function stepSimulation(state: SimState): SimState {
  state.tick += 1

  const seasonIndex = Math.floor(state.tick / TICKS_PER_SEASON) % SEASONS.length
  state.season = SEASONS[seasonIndex]
  state.year = 1 + Math.floor(state.tick / (TICKS_PER_SEASON * SEASONS.length))

  if (state.tick % 40 === 0) tickFamine(state)
  if (state.tick % 300 === 0) {
    tickVillageEconomy(state)
    tickMarketPrices(state)
  }

  for (const v of state.villagers) {
    if (v.alive) tickVillager(state, v, stepRng)
  }
  tickTrade(state)
  tickReproduction(state, stepRng)
  tickFields(state)
  for (const s of state.sheep) {
    if (s.alive && ((state.tick + s.id) & 1) === 0) tickSheep(state, s, stepRng)
  }
  if (state.tick % 2 === 0) {
    for (const h of state.horses) if (h.alive) tickHorse(state, h, stepRng)
  }
  tickBoats(state)
  for (const w of state.wolves) {
    if (w.alive) tickWolf(state, w, stepRng)
  }
  tickCombat(state, stepRng)
  if (state.tick % 3 === 0) {
    tickWolfReproduction(state)
    tickHorseBreeding(state)
  }
  tickRegrowth(state, stepRng)
  if (state.tick % 5 === 0) tickRoadWear(state.grid, state.tick)
  if (state.tick % 4 === 0) state.compactCursor = compactIndex(state.grid.index, state.grid, state.compactCursor)

  if (state.tick % 200 === 0) {
    state.villagers = state.villagers.filter((v) => v.alive)
    state.sheep = state.sheep.filter((s) => s.alive)
    state.horses = state.horses.filter((h) => h.alive)
    state.wolves = state.wolves.filter((w) => w.alive)
    state.boats = state.boats.filter((b) => b.alive)
    for (const village of state.villages) {
      village.memberIds = village.memberIds.filter((id) => state.villagers.some((v) => v.id === id && v.alive))
    }
    state.villages = state.villages.filter((vg) => vg.memberIds.length > 0)
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

  return {
    tick: state.tick,
    season: state.season,
    seasonProgress: (state.tick % TICKS_PER_SEASON) / TICKS_PER_SEASON,
    year: state.year,
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
  }
}
