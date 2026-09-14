import { designHouse, freshStyle, houseFootprint, furnitureSlots, pickShape, reinforceStyle, type HouseFootprint } from './architecture'
import { computePerimeter, occupiedTiles } from './defence'
import { conductTrade, findTradeOpportunity, portEligible, priceOf, targetPerCapita, tickVillageEconomy, TRADE_COOLDOWN } from './commerce'
import { HORSE_SPEED_BONUS, tickHorse, tickHorseBreeding, tryTame } from './horses'
import { addToInventory, countOf, createInventory, edibleValue, removeFromInventory, transferAll, type ResourceType } from './inventory'
import { creditRescue, doConfront, doGiveFood, doSocialise, doSteal, onDeath, tickSocialUpkeep } from './interactions'
import { generateName, inheritPersonality } from './personality'
import { bestCrossing, markCrossingDemand, markTraffic, surfaceSpeedBonus } from './roads'
import { isShore, type ResourceKind } from './resourceIndex'
import { logEvent, pickAmbition, relationWith, remember } from './social'
import {
  BED,
  BRIDGE,
  BUSH,
  CHEST,
  CLAIM_FIELD,
  CLAIM_HOUSE,
  CLAIM_MILL,
  CLAIM_NONE,
  CLAIM_PEN,
  DIRT,
  FENCE,
  GOLD,
  GRASS,
  HOUSE,
  IRON,
  LOOT,
  MILL,
  MOUNTAIN,
  PLANK,
  PORT,
  SAND,
  STONE,
  TREE,
  TUNNEL,
  WALL_STONE,
  WALL_WOOD,
  WATER,
  WHEAT,
  WORKBENCH,
  type Horse,
  type Profession,
  type Season,
  type SimState,
  type Sheep,
  type TaskKind,
  type Villager,
  type Village,
  type Wolf,
} from './types'
import {
  bridgeNearby,
  claimArea,
  claimCells,
  clamp,
  distance,
  fieldCells,
  findBestHousePlot,
  findBuildSite,
  findMillSite,
  findNearbyShore,
  findNearbyTerrain,
  findNearest,
  getClaim,
  getTerrain,
  inBounds,
  isBlockingWall,
  isBuildableGround,
  isWater,
  nearestResource,
  resourceDensity,
  setClaim,
  setTerrain,
  singleDoorWallCells,
  stepToward,
  touchesWater,
  type WorldGrid,
} from './world'

const HUNGER_MAX = 4
const HUNGER_DECAY = 1 / 200
const STARVE_DEATH_TICKS = 260
const HEAL_TICKS = 120
const HEAL_HUNGER_THRESHOLD = 3
const VILLAGER_HEALTH_MAX = 4
const ANIMAL_HEALTH_MAX = 2
const HUNGRY_THRESHOLD = 2
const FOOD_TARGET = 4
const WINTER_STOCK_TARGET = 10

const SPEAR_WOOD_COST = 3
const STONE_SPEAR_COST = 3
const IRON_TOOL_COST = 4
const WORKBENCH_COST = 4
const CHEST_COST = 5
const BED_COST = 3
const TILE_COST = 1
const WALL_SEGMENT_COST = 1
const BRIDGE_COST = 2
const MILL_WOOD_COST = 6
const MILL_STONE_COST = 4
const CART_WOOD_COST = 5
const CART_STONE_COST = 2
const BOAT_FISH_WOOD_COST = 4
const BOAT_CARGO_WOOD_COST = 6
const BOAT_CARGO_STONE_COST = 3
const PORT_WOOD_COST = 10
const PORT_STONE_COST = 8
const WHEAT_PER_FLOUR = 2
const BREAD_PER_FLOUR = 2
const WOOL_PER_CLOTH = 3
const CLOTH_PER_CLOTHING = 2
const WOOL_YIELD_COOLDOWN = 260
const MINE_STONE_YIELD = 2
const MINE_IRON_YIELD = 2
const MINE_GOLD_YIELD = 1
const CHILD_STARTER_COINS = 2
const WALL_HEALTH_PER_CELL = 3
const NUGGETS_PER_COIN = 2
const COINS_PER_NUGGET_BATCH = 3

const COMBAT_RADIUS = 1.5
const BASE_HIT_CHANCE = 0.34
const BASE_DAMAGE_CHANCE = 0.42
const GROUP_BONUS = 0.09
const STONE_TOOL_BONUS = 0.15
const IRON_TOOL_BONUS = 0.28

const REPRO_HUNGER_THRESHOLD = 3
const REPRO_FOOD_STOCK = 2
const REPRO_COOLDOWN = 420
const MAX_POPULATION = 250
const WILD_SHEEP_BREED_COOLDOWN = 400
const CAPTURED_SHEEP_BREED_COOLDOWN = 250
const MAX_WILD_SHEEP = 100
const WOLF_BREED_COOLDOWN = 500
const MAX_WOLVES = 10

const PEN_RADIUS = 3
const FIELD_RADIUS = 2
export const WHEAT_RIPE = 300
const WHEAT_SPROUT = 100
const WHEAT_GREEN = 200
const VILLAGE_JOIN_RADIUS = 140
const PERIMETER_REFRESH = 1200
const BRIDGE_DEMAND = 25

const WOLF_HUNT_RADIUS = 14
const WOLF_GIVE_UP_RADIUS = 17
const FLEE_RADIUS = 15
const SEARCH_RADIUS = 70
const DANGER_RADIUS = 90
const VILLAGER_SPEED = 2
const FLEE_SPEED = 3
const WOLF_SPEED = 2
const SHELTER_RADIUS = 3.5
const STUCK_LIMIT = 10
const TASK_MAX_AGE = 600
const TRADE_TASK_MAX_AGE = 4000
const SPREAD_NEIGHBOURS_NEEDED = 3
const SOCIAL_SIGHT = 22
const MATERIAL_TRADE_RADIUS = 90
/** Hunting for a wild sheep is a cheap linear scan over the (small) sheep list, not a terrain
 * search, so it can afford to look further than SEARCH_RADIUS — but not so far the herder
 * abandons their pen and chest on a days-long chase; 260 caused exactly that. */
const SHEEP_HUNT_RADIUS = 110
const SOCIAL_STAGGER = 8
const THINK_COOLDOWN = 3
const FISH_RADIUS = 18
const OPEN_WATER_RADIUS = 22
const MEMORY_SPOT_RADIUS = 12
const MEMORY_SPOT_WEIGHT = 25

function berriesRipeIn(season: Season): boolean {
  return season !== 'winter'
}
function sowingSeason(season: Season): boolean {
  return season === 'spring' || season === 'summer'
}
function growthRate(season: Season): number {
  if (season === 'spring') return 1
  if (season === 'summer') return 1.4
  if (season === 'autumn') return 0.8
  return 0
}

interface Needs {
  hunger: number
  starveTimer: number
  health: number
  healTimer: number
}

function tickNeeds(entity: Needs, healthMax: number, season: Season, winterMultiplier = 1.25): boolean {
  const decay = season === 'winter' ? HUNGER_DECAY * winterMultiplier : HUNGER_DECAY
  entity.hunger = entity.hunger - decay
  if (entity.hunger < 0) entity.hunger = 0
  if (entity.hunger <= 0) {
    entity.starveTimer += 1
    if (entity.starveTimer >= STARVE_DEATH_TICKS) return true
  } else {
    entity.starveTimer = 0
  }
  if (entity.hunger >= HEAL_HUNGER_THRESHOLD && entity.health < healthMax) {
    entity.healTimer += 1
    if (entity.healTimer >= HEAL_TICKS) {
      entity.health += 1
      entity.healTimer = 0
    }
  } else {
    entity.healTimer = 0
  }
  return false
}

/** Leather keeps the cold out better than plain cloth clothing; owning either helps in winter. */
function warmthMultiplier(v: Villager): number {
  if (countOf(v.inventory, 'leather') > 0) return 0.85
  if (countOf(v.inventory, 'clothing') > 0) return 1.0
  return 1.25
}

function dropCarriedGold(state: SimState, v: Villager) {
  const carried = countOf(v.inventory, 'gold')
  if (carried > 0 && isBuildableGround(state.grid, v.x, v.y)) setTerrain(state.grid, v.x, v.y, LOOT, carried)
}

function homeFootprint(v: Villager): HouseFootprint | null {
  if (!v.house || v.homeX < 0) return null
  return houseFootprint(v.house, v.homeX, v.homeY)
}

function canStep(grid: WorldGrid, x: number, y: number, allowWater: boolean): boolean {
  if (allowWater && isWater(grid, x, y)) return true
  return !isBlockingWall(grid, x, y)
}

/**
 * Like stepToward, but when the direct step and a worn neighbour make the same progress, the
 * worn one wins. Enough travellers doing this and independent trips stop each carving their own
 * faint line a tile or two apart — they converge onto one line, which is what actually lets a
 * path build up enough traffic to promote instead of staying dispersed grass forever. Only used
 * when wear > 0 (an actual travelling task), so sheep and wolves are unaffected.
 */
function wornStepToward(grid: WorldGrid, cx: number, cy: number, tx: number, ty: number, allowWater: boolean): { x: number; y: number } {
  const base = stepToward(cx, cy, tx, ty)
  const candidates: { x: number; y: number }[] = [base]
  if (base.x !== cx && base.y !== cy) {
    candidates.push({ x: base.x, y: cy })
    candidates.push({ x: cx, y: base.y })
  }
  let best = base
  let bestTraffic = -1
  for (const c of candidates) {
    const nx = clamp(c.x, 0, grid.width - 1)
    const ny = clamp(c.y, 0, grid.height - 1)
    if (!canStep(grid, nx, ny, allowWater)) continue
    const t = grid.traffic[ny * grid.width + nx]
    if (t > bestTraffic) {
      bestTraffic = t
      best = { x: nx, y: ny }
    }
  }
  return bestTraffic >= 0 ? best : base
}

function moveToward(v: { x: number; y: number }, tx: number, ty: number, speed: number, grid: WorldGrid, wear = 0, allowWater = false): boolean {
  const startX = v.x
  const startY = v.y
  let cx = v.x
  let cy = v.y
  for (let s = 0; s < speed; s++) {
    const next = wear > 0 ? wornStepToward(grid, cx, cy, tx, ty, allowWater) : stepToward(cx, cy, tx, ty)
    const nx = clamp(next.x, 0, grid.width - 1)
    const ny = clamp(next.y, 0, grid.height - 1)
    if (canStep(grid, nx, ny, allowWater)) {
      cx = nx
      cy = ny
      if (wear) markTraffic(grid, cx, cy, wear)
      continue
    }
    if (wear && getTerrain(grid, nx, ny) === WATER) markCrossingDemand(grid, nx, ny)
    const slideX = clamp(cx + Math.sign(tx - cx), 0, grid.width - 1)
    if (slideX !== cx && canStep(grid, slideX, cy, allowWater)) {
      cx = slideX
      if (wear) markTraffic(grid, cx, cy, wear)
      continue
    }
    const slideY = clamp(cy + Math.sign(ty - cy), 0, grid.height - 1)
    if (slideY !== cy && canStep(grid, cx, slideY, allowWater)) {
      cy = slideY
      if (wear) markTraffic(grid, cx, cy, wear)
      continue
    }
    break
  }
  v.x = cx
  v.y = cy
  return cx !== startX || cy !== startY
}

function moveRandom(v: { x: number; y: number }, rng: () => number, grid: WorldGrid, range = 1) {
  for (let attempt = 0; attempt < 6; attempt++) {
    const nx = clamp(v.x + Math.floor(rng() * (2 * range + 1)) - range, 0, grid.width - 1)
    const ny = clamp(v.y + Math.floor(rng() * (2 * range + 1)) - range, 0, grid.height - 1)
    if (!isBlockingWall(grid, nx, ny)) {
      v.x = nx
      v.y = ny
      return
    }
  }
}

function nearestAlive<T extends { x: number; y: number; alive: boolean }>(
  list: T[],
  x: number,
  y: number,
  maxDist: number,
  filter?: (t: T) => boolean,
): T | null {
  let best: T | null = null
  let bestD = maxDist * maxDist
  for (let i = 0; i < list.length; i++) {
    const item = list[i]
    if (!item.alive) continue
    if (filter && !filter(item)) continue
    const dx = item.x - x
    const dy = item.y - y
    const d = dx * dx + dy * dy
    if (d <= bestD) {
      bestD = d
      best = item
    }
  }
  return best
}

function setTask(v: Villager, kind: TaskKind, targetX: number, targetY: number, targetId: number | null = null, resource: ResourceType | null = null) {
  v.task = { kind, targetX, targetY, targetId, resource, stuckTicks: 0, ageTicks: 0 }
}

function curiosityRadius(v: Villager, base: number): number {
  return Math.round(base * (0.7 + 0.6 * v.personality.curiosity))
}

function findOrCreateVillage(state: SimState, x: number, y: number, joinRadius: number, rng: () => number): Village {
  let nearest: Village | null = null
  let bestD = joinRadius
  for (const village of state.villages) {
    const d = distance(x, y, village.centerX, village.centerY)
    if (d <= bestD) {
      bestD = d
      nearest = village
    }
  }
  if (nearest) return nearest
  const village: Village = {
    id: state.nextVillageId++,
    centerX: x,
    centerY: y,
    memberIds: [],
    wallTier: 'none',
    wallHealth: 0,
    perimeter: [],
    gates: [],
    naturalCover: 0,
    perimeterTick: -PERIMETER_REFRESH,
    hasMill: false,
    millX: -1,
    millY: -1,
    hasPort: false,
    portX: -1,
    portY: -1,
    tradeRuns: 0,
    surplus: {},
    style: freshStyle(rng),
  }
  state.villages.push(village)
  return village
}

function recalcVillageCentre(state: SimState, village: Village) {
  let sx = 0
  let sy = 0
  let n = 0
  for (const v of state.villagers) {
    if (!v.alive || v.villageId !== village.id || !v.hasHome) continue
    sx += v.homeX
    sy += v.homeY
    n++
  }
  if (n === 0) return
  village.centerX = Math.round(sx / n)
  village.centerY = Math.round(sy / n)
}

function refreshPerimeter(state: SimState, village: Village) {
  if (state.tick - village.perimeterTick < PERIMETER_REFRESH) return
  village.perimeterTick = state.tick
  recalcVillageCentre(state, village)
  const result = computePerimeter(state.grid, village, occupiedTiles(state.villagers, village))
  if (!result) {
    village.perimeter = []
    village.gates = []
    village.naturalCover = 0
    return
  }
  const wasEmpty = village.perimeter.length === 0
  village.perimeter = result.cells
  village.gates = result.gates
  village.naturalCover = result.naturalCover
  if (wasEmpty && result.naturalCover > 8) {
    logEvent(state, `Le village s'appuie sur l'eau pour ${result.naturalCover} cases de défense`)
  }
}

function tradeResource(profession: Profession): ResourceKind | null {
  if (profession === 'lumberjack') return 'tree'
  if (profession === 'mason') return 'stone'
  if (profession === 'forager') return 'bush'
  if (profession === 'blacksmith') return 'iron'
  return null
}

function assignProfession(state: SimState, v: Villager): Profession {
  const p = v.personality
  const grid = state.grid
  const jobCount: Partial<Record<Profession, number>> = {}
  for (const o of state.villagers) {
    if (!o.alive || o.villageId !== v.villageId || o.id === v.id) continue
    jobCount[o.profession] = (jobCount[o.profession] ?? 0) + 1
  }
  const countJob = (job: Profession) => jobCount[job] ?? 0
  const village = state.villages.find((vg) => vg.id === v.villageId)

  const woodNear = resourceDensity(grid, v.x, v.y, 'tree', 14)
  const stoneNear = resourceDensity(grid, v.x, v.y, 'stone', 14)
  const berriesNear = resourceDensity(grid, v.x, v.y, 'bush', 14)
  const ironNear = resourceDensity(grid, v.x, v.y, 'iron', 14)
  let wolvesNear = 0
  for (const w of state.wolves) if (w.alive && distance(w.x, w.y, v.x, v.y) < 40) wolvesNear++
  const water = findNearbyShore(grid, v.x, v.y, 16) !== null
  let pensInVillage = 0
  for (const o of state.villagers) if (o.alive && o.villageId === v.villageId && o.hasPen) pensInVillage++

  const scores: Record<Profession, number> = {
    none: 0,
    forager: berriesNear * 1.4 + p.curiosity * 20 - countJob('forager') * 12,
    farmer: (24 - Math.min(berriesNear, 24)) * 1.5 + p.ambition * 14 - countJob('farmer') * 8,
    fisher: (water ? 34 : -50) + p.curiosity * 12 - countJob('fisher') * 10,
    miller: (village?.hasMill ? 40 : 6) + p.ambition * 12 - countJob('miller') * 30,
    lumberjack: woodNear * 0.7 + p.ambition * 18 - countJob('lumberjack') * 12,
    mason: stoneNear * 1.1 + p.ambition * 15 - countJob('mason') * 12,
    guard: wolvesNear * 14 + p.courage * 34 - countJob('guard') * 14,
    builder: p.ambition * 26 + p.sociability * 16 - countJob('builder') * 12,
    herder: (20 - Math.min(berriesNear, 20)) * 1.1 + p.generosity * 16 - countJob('herder') * 12,
    trader: (1 - p.generosity) * 30 + p.sociability * 20 - countJob('trader') * 14,
    weaver: (pensInVillage > 0 ? 35 : 8) + p.sociability * 18 + p.curiosity * 10 - countJob('weaver') * 12,
    blacksmith: ironNear * 1.2 + p.ambition * 20 - countJob('blacksmith') * 14,
    miner: resourceDensity(grid, v.x, v.y, 'mountain', 28) * 0.9 + p.ambition * 24 + p.courage * 12 - countJob('miner') * 16,
  }

  let best: Profession = 'forager'
  let bestScore = -Infinity
  for (const key of Object.keys(scores) as Profession[]) {
    if (key === 'none') continue
    if (scores[key] > bestScore) {
      bestScore = scores[key]
      best = key
    }
  }
  return best
}

function jobBonus(v: Villager, kind: TaskKind): number {
  switch (v.profession) {
    case 'forager':
      return kind === 'gatherFood' ? 1.7 : 1
    case 'farmer':
      return kind === 'sowField' || kind === 'harvestWheat' ? 2 : 1
    case 'fisher':
      return kind === 'fish' || kind === 'buildBoat' ? 2.2 : 1
    case 'miller':
      return kind === 'buildMill' ? 2.4 : kind === 'grindFlour' || kind === 'bakeBread' ? 2.2 : 1
    case 'lumberjack':
      return kind === 'gatherWood' ? 1.8 : 1
    case 'mason':
      return kind === 'gatherStone' || kind === 'buildWall' || kind === 'mineTunnel' ? 1.7 : 1
    case 'guard':
      return kind === 'craftSpear' || kind === 'craftStoneSpear' || kind === 'buildWall' ? 1.6 : 1
    case 'builder':
      return kind === 'buildHouse' || kind === 'buildWall' || kind === 'buildBridge' || kind === 'buildMill' || kind === 'buildPort' ? 1.8 : 1
    case 'herder':
      return kind === 'captureSheep' || kind === 'feedPen' || kind === 'buildPen' || kind === 'tameHorse' || kind === 'tanHide' ? 1.9 : 1
    case 'trader':
      return kind === 'mineGold' || kind === 'mintCoins' || kind === 'buildBridge' || kind === 'tameHorse' || kind === 'tradeRun' || kind === 'buildCart' || kind === 'buildBoat'
        ? 1.8
        : 1
    case 'weaver':
      return kind === 'weaveCloth' || kind === 'sewClothing' ? 2.2 : 1
    case 'blacksmith':
      return kind === 'gatherIron' || kind === 'craftIronTool' || kind === 'mineTunnel' ? 2.2 : 1
    default:
      return 1
  }
}

function ambitionBonus(v: Villager, kind: TaskKind): number {
  switch (v.ambition) {
    case 'wealth':
      return kind === 'mineGold' || kind === 'mintCoins' || kind === 'tradeRun' ? 1.7 : kind === 'steal' ? 1.5 : 1
    case 'family':
      return kind === 'buildBed' || kind === 'buildHouse' || kind === 'giveFood' ? 1.5 : 1
    case 'protector':
      return kind === 'buildWall' || kind === 'craftStoneSpear' || kind === 'defend' || kind === 'fight' ? 1.6 : 1
    case 'builder':
      return kind.startsWith('build') ? 1.5 : 1
    case 'explorer':
      return kind === 'idle' ? 2.4 : kind === 'tameHorse' || kind === 'tradeRun' ? 2 : 1
    case 'revenge':
      return kind === 'confront' ? 3.5 : 1
    case 'leader':
      return kind === 'socialise' || kind === 'buildWall' || kind === 'giveFood' || kind === 'buildMill' || kind === 'buildPort' ? 1.5 : 1
    default:
      return 1
  }
}

interface Option {
  kind: TaskKind
  x: number
  y: number
  id: number | null
  resource: ResourceType | null
  score: number
}

function reach(v: Villager, tx: number, ty: number): number {
  const d = distance(v.x, v.y, tx, ty)
  const tolerance = (18 + v.personality.curiosity * 45) * (v.mounted ? 2.2 : 1)
  return 1 / (1 + d / tolerance)
}

function bestEdible(v: Villager): ResourceType | null {
  if (countOf(v.inventory, 'bread') > 0) return 'bread'
  if (countOf(v.inventory, 'food') > 0) return 'food'
  if (countOf(v.inventory, 'wheat') > 0) return 'wheat'
  return null
}

function planHouse(state: SimState, v: Villager, village: Village | undefined, rng: () => number) {
  const grid = state.grid
  const kin: { x: number; y: number }[] = []
  let household = 1
  for (const o of state.villagers) {
    if (!o.alive) continue
    if (o.parentIds.includes(v.id)) household++
    if (!o.hasHome) continue
    if (v.parentIds.includes(o.id) || o.parentIds.includes(v.id) || (v.relations.get(o.id)?.affinity ?? 0) > 0.4) {
      kin.push({ x: o.homeX, y: o.homeY })
    }
  }

  const artisan = v.profession === 'mason' || v.profession === 'builder' || v.profession === 'miller'
  const merchant = v.profession === 'trader' || v.profession === 'farmer'
  const style = village ? village.style : freshStyle(rng)
  const shape = pickShape(style, v.personality, rng)
  const design = designHouse({ personality: v.personality, wealth: countOf(v.inventory, 'coin'), household, artisan, merchant }, shape)

  const baseX = village ? village.centerX : v.x
  const baseY = village ? village.centerY : v.y
  const span = Math.max(design.rx, design.ry)
  const plot =
    findBestHousePlot(grid, baseX, baseY, 44, {
      radius: span,
      centreX: baseX,
      centreY: baseY,
      kin,
      wantsKind: tradeResource(v.profession),
      sociability: v.personality.sociability,
      caution: 1 - v.personality.courage,
    }) ?? findBuildSite(grid, v.x, v.y, span, 40)

  if (!plot) return
  v.house = design
  v.homeX = plot.x
  v.homeY = plot.y
  const fp = houseFootprint(design, plot.x, plot.y)
  claimCells(grid, fp.walls, CLAIM_HOUSE)
  claimCells(grid, fp.interior, CLAIM_HOUSE)
  claimCells(grid, fp.open, CLAIM_HOUSE)
}


/**
 * Emergent long-horizon mind. This deliberately lives outside Villager so the existing save/data
 * shape stays compatible. It is a utility/needs layer, not an LLM: the same simulation rules can
 * produce very different lives because every person has different history, relationships and
 * pressures.
 */
type MindGoal = 'survive' | 'home' | 'wealth' | 'family' | 'status' | 'community' | 'explore' | 'security' | 'craft' | 'revenge'
interface EmergentMind {
  goal: MindGoal
  goalX: number
  goalY: number
  goalId: number | null
  commitment: number
  stress: number
  loneliness: number
  security: number
  status: number
  wealth: number
  family: number
  curiosity: number
  lastKind: TaskKind | null
  lastChange: number
  failures: number
  successes: number
}
const MINDS = new Map<number, EmergentMind>()

function mindOf(v: Villager): EmergentMind {
  let m = MINDS.get(v.id)
  if (!m) {
    m = { goal: 'survive', goalX: v.x, goalY: v.y, goalId: null, commitment: 0, stress: 0, loneliness: 0, security: 0, status: 0, wealth: 0, family: 0, curiosity: 0, lastKind: null, lastChange: 0, failures: 0, successes: 0 }
    MINDS.set(v.id, m)
  }
  return m
}

function updateMind(state: SimState, v: Villager) {
  const m = mindOf(v)
  const p = v.personality
  const food = edibleValue(v.inventory)
  const coins = countOf(v.inventory, 'coin')
  let nearbyPeople = 0, friends = 0, enemies = 0
  for (const o of state.villagers) {
    if (!o.alive || o.id === v.id) continue
    const d = distance(v.x, v.y, o.x, o.y)
    if (d <= SOCIAL_SIGHT) {
      nearbyPeople++
      const r = v.relations.get(o.id)
      const affinity = r?.affinity ?? 0
      if (affinity > 0.45) friends++
      if (affinity < -0.45) enemies++
    }
  }
  m.stress = clamp(m.stress + (v.hunger < 1 ? 0.035 : -0.012) + enemies * 0.002 - p.courage * 0.004, 0, 1)
  m.loneliness = clamp(m.loneliness + (nearbyPeople === 0 ? 0.018 : -0.012) - friends * 0.004, 0, 1)
  m.security = clamp(m.security + (state.villages.find(g => g.id === v.villageId)?.wallTier === 'none' ? 0.006 : -0.003) + enemies * 0.004, 0, 1)
  m.status = clamp(m.status + (v.ambition === 'leader' || v.ambition === 'builder' ? 0.004 : -0.001), 0, 1)
  m.wealth = clamp(m.wealth + ((coins < 3 ? 0.015 : -0.006) + p.ambition * 0.004), 0, 1)
  m.family = clamp(m.family + (v.parentIds.length ? -0.001 : p.generosity * 0.004), 0, 1)
  m.curiosity = clamp(m.curiosity + p.curiosity * 0.006 - 0.002, 0, 1)

  const urgent: [MindGoal, number][] = [
    ['survive', (1 - v.hunger / HUNGER_MAX) * 3 + (v.health < VILLAGER_HEALTH_MAX * 0.55 ? 2 : 0) + m.stress],
    ['home', (!v.hasHome ? 2.8 : 0) + (state.season === 'winter' && !v.hasHome ? 1.8 : 0)],
    ['security', m.security * 1.7],
    ['family', m.family + (v.hasHome ? 0.4 : 0)],
    ['wealth', m.wealth + (v.ambition === 'wealth' ? 0.9 : 0)],
    ['community', m.loneliness + (v.ambition === 'leader' || v.ambition === 'protector' ? 0.8 : 0)],
    ['explore', m.curiosity + (v.ambition === 'explorer' ? 1 : 0)],
    ['craft', (v.hasWorkbench ? 0.3 : 0) + p.ambition * 0.7],
    ['status', m.status],
    ['revenge', v.grudgeTarget !== null ? 2.4 : 0],
  ]
  urgent.sort((a,b)=>b[1]-a[1])
  const desired = urgent[0][0]
  // Goals have inertia. A slightly better need does not erase months of plans instantly.
  if (m.goal !== desired) {
    const pressure = urgent[0][1] - (urgent.find(x => x[0] === m.goal)?.[1] ?? 0)
    if (m.commitment <= 0 || pressure > 1.15 || m.failures >= 4) {
      m.goal = desired; m.goalX = v.x; m.goalY = v.y; m.goalId = v.grudgeTarget; m.commitment = 18 + p.ambition * 35; m.failures = 0; m.lastChange = state.tick
    }
  } else m.commitment = Math.max(0, m.commitment - 1)

  // Keep the target attached to a known relationship when revenge is active.
  if (m.goal === 'revenge' && v.grudgeTarget !== null) m.goalId = v.grudgeTarget
  void food
}

function emergentTaskModifier(state: SimState, v: Villager, kind: TaskKind, x: number, y: number, id: number | null): number {
  const m = mindOf(v)
  const p = v.personality
  let mult = 1
  const d = distance(v.x, v.y, x, y)
  const goal: Record<MindGoal, Partial<Record<TaskKind, number>>> = {
    survive: { eat: 3.2, gatherFood: 2.4, fish: 1.8, harvestWheat: 1.7, takeFromChest: 2.2, rest: 1.4 },
    home: { buildHouse: 3.0, gatherWood: 1.5, buildBed: 1.4, buildChest: 1.2 },
    wealth: { tradeRun: 2.2, mineGold: 2.0, mintCoins: 1.8, buyMaterial: 1.4, buildCart: 1.4, buildPort: 1.3 },
    family: { buildHouse: 1.8, buildBed: 2.0, gatherFood: 1.35, giveFood: 1.5, socialise: 1.4 },
    status: { buildHouse: 1.5, buildWall: 1.5, buildPort: 1.35, buildMill: 1.3, craftIronTool: 1.5 },
    community: { socialise: 2.0, giveFood: 1.8, defend: 1.8, buildWall: 1.6, buildMill: 1.35, buildBridge: 1.3 },
    explore: { idle: 1.5, tameHorse: 1.4, fish: 1.15, tradeRun: 1.25, mineTunnel: 1.2 },
    security: { flee: 2.5, fight: 1.8, defend: 2.1, buildWall: 2.0, craftSpear: 1.5, craftStoneSpear: 1.6, craftIronTool: 1.7, rest: 1.1 },
    craft: { buildWorkbench: 2, craftSpear: 1.5, craftStoneSpear: 1.6, craftIronTool: 1.8, weaveCloth: 1.7, sewClothing: 1.5, tanHide: 1.5, grindFlour: 1.4, bakeBread: 1.4 },
    revenge: { confront: 3.0, steal: 1.3, fight: 1.4, socialise: 0.75 },
  }
  const g = goal[m.goal][kind]
  if (g) mult *= g
  if (kind === 'socialise') mult *= 1 + m.loneliness * 0.8 + p.sociability * 0.4
  if (kind === 'giveFood') mult *= 1 + p.generosity * 0.7
  if (kind === 'steal') mult *= 1 + Math.max(0, m.wealth - 0.35) * (1 - p.generosity) * 0.9
  if (kind === 'confront' && id === m.goalId) mult *= 1.8
  if (d > SEARCH_RADIUS * 0.75) mult *= 0.85 - p.courage * 0.08
  // Prefer known productive places; danger memories suppress destinations.
  for (const mem of v.memories) {
    if (distance(x, y, mem.x, mem.y) > MEMORY_SPOT_RADIUS) continue
    if (mem.kind === 'dangerSpot') mult *= 1 - Math.min(0.75, mem.weight * 0.12 * (1 - p.courage))
    if (mem.kind === 'goodSpot') mult *= 1 + Math.min(0.45, mem.weight * 0.04 * (0.5 + p.curiosity))
  }
  // Traffic makes infrastructure, trade and crossings more attractive as the world develops.
  const i = y * state.grid.width + x
  const traffic = state.grid.traffic[i] ?? 0
  if (kind === 'buildBridge' || kind === 'buildPort' || kind === 'tradeRun') mult *= 1 + Math.min(1.2, traffic * 0.04)
  return mult
}

function chooseTask(state: SimState, v: Villager, rng: () => number) {
  const grid = state.grid
  const season = state.season
  const famine = state.famine
  const p = v.personality
  const searchR = curiosityRadius(v, SEARCH_RADIUS)
  const options: Option[] = []
  const memoryBias = (x: number, y: number): number => {
    let bias = 0
    for (const m of v.memories) {
      if (m.kind !== 'goodSpot' && m.kind !== 'dangerSpot') continue
      const d = distance(x, y, m.x, m.y)
      if (d > MEMORY_SPOT_RADIUS) continue
      bias += m.emotion * m.weight * (1 - d / MEMORY_SPOT_RADIUS) * MEMORY_SPOT_WEIGHT
    }
    return bias
  }
  const add = (kind: TaskKind, x: number, y: number, score: number, id: number | null = null, resource: ResourceType | null = null) => {
    const final = score * jobBonus(v, kind) * ambitionBonus(v, kind) * emergentTaskModifier(state, v, kind, x, y, id) + memoryBias(x, y)
    if (final > 0) options.push({ kind, x, y, id, resource, score: final })
  }

  const wood = countOf(v.inventory, 'wood')
  const stone = countOf(v.inventory, 'stone')
  const iron = countOf(v.inventory, 'iron')
  const gold = countOf(v.inventory, 'gold')
  const wheat = countOf(v.inventory, 'wheat')
  const flour = countOf(v.inventory, 'flour')
  const wool = countOf(v.inventory, 'wool')
  const cloth = countOf(v.inventory, 'cloth')
  const hide = countOf(v.inventory, 'hide')
  const larder = edibleValue(v.inventory)
  const starving = (1 - v.hunger / HUNGER_MAX) * (1 - v.hunger / HUNGER_MAX)
  const village = state.villages.find((vg) => vg.id === v.villageId)
  const stockTarget = season === 'autumn' ? WINTER_STOCK_TARGET : season === 'winter' ? WINTER_STOCK_TARGET * 0.6 : FOOD_TARGET

  const bush = berriesRipeIn(season) || famine ? nearestResource(grid, v.x, v.y, 'bush', searchR) : null
  const tree = nearestResource(grid, v.x, v.y, 'tree', searchR)
  const rock = v.hasWorkbench ? nearestResource(grid, v.x, v.y, 'stone', searchR) : null
  const ironOre = v.hasWorkbench ? nearestResource(grid, v.x, v.y, 'iron', searchR) : null
  const mountainOre = v.hasWorkbench && v.toolTier !== 'none' && v.toolTier !== 'wood' ? nearestResource(grid, v.x, v.y, 'mountain', searchR) : null
  const goldTile = nearestResource(grid, v.x, v.y, 'gold', Math.round(searchR * 0.6))

  if (bestEdible(v)) add('eat', v.x, v.y, starving * 260)
  if (v.hasChest && v.chestInventory && edibleValue(v.chestInventory) > 0) {
    add('takeFromChest', v.chestX, v.chestY, starving * 200 * reach(v, v.chestX, v.chestY))
  }

  if (bush) {
    const seasonMul = berriesRipeIn(season) ? 1 : 0.35
    const pantryNeed = Math.max(0, (stockTarget - larder) / stockTarget)
    add('gatherFood', bush.x, bush.y, (starving * 220 + pantryNeed * 90) * seasonMul * reach(v, bush.x, bush.y))
  }

  const hasFishBoat = v.boatId !== null && state.boats.some((b) => b.id === v.boatId && b.alive)
  if (v.profession === 'fisher' || larder < stockTarget || season === 'winter') {
    const spot = hasFishBoat
      ? findNearbyTerrain(grid, v.x, v.y, OPEN_WATER_RADIUS, WATER)
      : findNearbyShore(grid, v.x, v.y, FISH_RADIUS)
    if (spot) {
      const winterBonus = season === 'winter' ? 70 : 0
      const boatBonus = hasFishBoat ? 30 : 0
      add('fish', spot.x, spot.y, (30 + starving * 150 + winterBonus + boatBonus) * reach(v, spot.x, spot.y))
    }
  }

  if (v.fieldX !== -1) {
    const ripe = findNearest(grid, v.fieldX, v.fieldY, FIELD_RADIUS + 1, (x, y) => getTerrain(grid, x, y) === WHEAT && grid.amount[y * grid.width + x] >= WHEAT_RIPE)
    if (ripe) add('harvestWheat', ripe.x, ripe.y, (55 + starving * 140 + (season === 'autumn' ? 60 : 0)) * reach(v, ripe.x, ripe.y))
    else if (famine) {
      const green = findNearest(grid, v.fieldX, v.fieldY, FIELD_RADIUS + 1, (x, y) => getTerrain(grid, x, y) === WHEAT && grid.amount[y * grid.width + x] >= WHEAT_SPROUT)
      if (green) add('harvestWheat', green.x, green.y, starving * 120 * reach(v, green.x, green.y))
    }
  }

  if (v.hasPen) {
    let ownSheep = 0
    let firstSheepId = -1
    for (const sh of state.sheep) {
      if (sh.alive && sh.captured && sh.ownerId === v.id) {
        ownSheep++
        if (firstSheepId < 0) firstSheepId = sh.id
      }
    }
    if (ownSheep >= 3) add('feedPen', v.penX, v.penY, starving * 180 * reach(v, v.penX, v.penY), firstSheepId)
  }
  if (v.hasHome && v.health / VILLAGER_HEALTH_MAX < 0.6) {
    add('rest', v.homeX, v.homeY, (1 - v.health / VILLAGER_HEALTH_MAX) * 90 * reach(v, v.homeX, v.homeY))
  }

  if (v.horseId === null) {
    const wild = nearestAlive(state.horses, v.x, v.y, 30, (h) => !h.tamed)
    if (wild) {
      const wanderlust = p.curiosity * 45 + (v.ambition === 'explorer' ? 35 : 0)
      const means = Math.min(30, countOf(v.inventory, 'coin') * 1.2) + (wheat > 0 ? 25 : 0)
      add('tameHorse', wild.x, wild.y, (10 + wanderlust + means) * reach(v, wild.x, wild.y), wild.id)
    }
  } else {
    const mine = state.horses.find((h) => h.id === v.horseId && h.alive)
    if (mine && mine.hunger < 2 && wheat > 0) {
      add('feedHorse', mine.x, mine.y, (35 + p.generosity * 25) * reach(v, mine.x, mine.y), mine.id)
    }
  }

  if (v.hasHome && v.homeOwnerId === v.id && v.horseId !== null && !v.hasCart) {
    const cartUrge = 20 + p.ambition * 25 + (v.profession === 'trader' ? 20 : 0)
    if (wood >= CART_WOOD_COST && stone >= CART_STONE_COST) add('buildCart', v.homeX, v.homeY, cartUrge * reach(v, v.homeX, v.homeY))
    else if (tree) add('gatherWood', tree.x, tree.y, cartUrge * 0.6 * reach(v, tree.x, tree.y))
  }

  if (v.hasHome && v.homeOwnerId === v.id && v.boatId === null && (v.profession === 'fisher' || v.profession === 'trader')) {
    const dock = findMillSite(grid, v.homeX, v.homeY, 14)
    if (dock) {
      const cargo = v.profession === 'trader'
      const needWood = cargo ? BOAT_CARGO_WOOD_COST : BOAT_FISH_WOOD_COST
      const needStone = cargo ? BOAT_CARGO_STONE_COST : 0
      const boatUrge = 22 + p.ambition * 20 + p.curiosity * 12
      if (wood >= needWood && stone >= needStone) add('buildBoat', dock.x, dock.y, boatUrge * reach(v, dock.x, dock.y))
      else if (tree) add('gatherWood', tree.x, tree.y, boatUrge * 0.6 * reach(v, tree.x, tree.y))
    }
  }

  if (village && v.hasHome && v.tradeCooldown <= 0 && (v.profession === 'trader' || v.ambition === 'wealth')) {
    const deal = findTradeOpportunity(state, village, v.x, v.y)
    if (deal) {
      const travelPenalty = deal.distance * 0.1
      const cargoBonus = v.hasCart ? 12 : 0
      add('tradeRun', deal.target.centerX, deal.target.centerY, 24 + deal.gain * 9 + p.sociability * 15 + p.ambition * 8 + cargoBonus - travelPenalty, deal.target.id)
    }
  }

  if (village && v.hasHome && v.homeOwnerId === v.id && portEligible(state, village)) {
    if (village.portX === -1) {
      const site = findMillSite(grid, village.centerX, village.centerY, 24)
      if (site) {
        village.portX = site.x
        village.portY = site.y
      }
    }
    if (village.portX !== -1) {
      const portUrge = 30 + p.ambition * 25 + p.sociability * 15
      if (wood >= PORT_WOOD_COST && stone >= PORT_STONE_COST) add('buildPort', village.portX, village.portY, portUrge * reach(v, village.portX, village.portY))
      else if (wood < PORT_WOOD_COST && tree) add('gatherWood', tree.x, tree.y, portUrge * 0.5 * reach(v, tree.x, tree.y))
      else if (rock) add('gatherStone', rock.x, rock.y, portUrge * 0.5 * reach(v, rock.x, rock.y))
    }
  }

  for (const other of state.villagers) {
    if (!other.alive || other.id === v.id) continue
    const dx = other.x - v.x
    const dy = other.y - v.y
    if (dx > SOCIAL_SIGHT || dx < -SOCIAL_SIGHT || dy > SOCIAL_SIGHT || dy < -SOCIAL_SIGHT) continue

    const rel = v.relations.get(other.id)
    const affinity = rel ? rel.affinity : 0
    const trust = rel ? rel.trust : 0.25
    add('socialise', other.x, other.y, (10 + p.sociability * 40 + affinity * 30) * reach(v, other.x, other.y), other.id)
    if (other.hunger < HUNGRY_THRESHOLD && larder > 1) {
      add('giveFood', other.x, other.y, (p.generosity * 55 + affinity * 45) * reach(v, other.x, other.y), other.id)
    }
    if (affinity < -0.5 || v.grudgeTarget === other.id) {
      const nerve = p.courage * 60 + (v.toolTier !== 'none' ? 25 : 0) - (other.toolTier !== 'none' ? 20 : 0)
      add('confront', other.x, other.y, (Math.max(0, -affinity) * 70 + nerve - 40) * reach(v, other.x, other.y), other.id)
    }
    if (other.hasChest && other.chestInventory && edibleValue(other.chestInventory) > 0) {
      const need = larder <= 0 ? starving * 120 : 0
      const greed = (1 - p.generosity) * 35 * (v.ambition === 'wealth' ? 1.5 : 1)
      const restraint = trust * 60 + Math.max(0, affinity) * 70 + p.generosity * 30
      const score = need + greed + (famine ? 45 : 0) + p.courage * 25 - restraint
      if (score > 0) add('steal', other.chestX, other.chestY, score * reach(v, other.chestX, other.chestY), other.id)
    }
  }

  const wolf = nearestAlive(state.wolves, v.x, v.y, DANGER_RADIUS)
  const danger = wolf ? clamp(1 - distance(v.x, v.y, wolf.x, wolf.y) / DANGER_RADIUS, 0, 1) : 0

  if (wolf && v.toolTier !== 'none') {
    for (const o of state.villagers) {
      if (!o.alive || o.id === v.id || o.toolTier !== 'none') continue
      if (distance(o.x, o.y, wolf.x, wolf.y) >= 4) continue
      const bond = Math.max(0, v.relations.get(o.id)?.affinity ?? 0)
      add('defend', wolf.x, wolf.y, (p.courage * 70 + bond * 60 + p.generosity * 25) * reach(v, wolf.x, wolf.y), o.id)
      break
    }
  }

  if (v.toolTier === 'none') {
    const armUrge = 55 + danger * 70 + p.courage * 35
    if (wood >= SPEAR_WOOD_COST) add('craftSpear', v.x, v.y, armUrge)
    else if (tree) add('gatherWood', tree.x, tree.y, armUrge * 0.85 * reach(v, tree.x, tree.y))
  }

  if (!v.hasHome) {
    if (!v.house || v.homeX === -1) planHouse(state, v, village, rng)
    const fp = homeFootprint(v)
    if (fp) {
      const winterUrgency = season === 'autumn' ? 35 : season === 'winter' ? 55 : 0
      const shelterUrge = 60 + danger * 55 + (1 - p.courage) * 40 + p.ambition * 25 + winterUrgency
      const gap = fp.walls.find((c) => getTerrain(grid, c.x, c.y) !== HOUSE)
      if (gap && wood >= TILE_COST) add('buildHouse', gap.x, gap.y, shelterUrge * reach(v, gap.x, gap.y))
      else if (gap && tree) add('gatherWood', tree.x, tree.y, shelterUrge * 0.8 * reach(v, tree.x, tree.y))
    }
  }

  const isOwner = v.homeOwnerId === v.id
  const fp = isOwner ? homeFootprint(v) : null
  if (v.hasHome && isOwner && fp) {
    const slots = furnitureSlots(fp)
    const drive = 45 + p.ambition * 40
    const maxBeds = v.house ? v.house.bedSlots : 2
    if (!v.hasWorkbench) {
      if (wood >= WORKBENCH_COST) add('buildWorkbench', slots.workbench.x, slots.workbench.y, drive * reach(v, slots.workbench.x, slots.workbench.y))
      else if (tree) add('gatherWood', tree.x, tree.y, drive * 0.8 * reach(v, tree.x, tree.y))
    } else if (!v.hasChest) {
      if (wood >= CHEST_COST) add('buildChest', slots.chest.x, slots.chest.y, drive * 0.9 * reach(v, slots.chest.x, slots.chest.y))
      else if (tree) add('gatherWood', tree.x, tree.y, drive * 0.7 * reach(v, tree.x, tree.y))
    } else if (v.bedCount < maxBeds && slots.beds[v.bedCount]) {
      const spot = slots.beds[v.bedCount]
      const familyDrive = drive * (v.bedCount === 0 ? 1 : 0.55)
      if (wood >= BED_COST) add('buildBed', spot.x, spot.y, familyDrive * reach(v, spot.x, spot.y))
      else if (tree) add('gatherWood', tree.x, tree.y, familyDrive * 0.7 * reach(v, tree.x, tree.y))
    }
  }

  if (v.hasWorkbench && v.toolTier === 'wood') {
    const upgrade = 30 + p.courage * 45 + danger * 30
    if (stone >= STONE_SPEAR_COST) add('craftStoneSpear', v.x, v.y, upgrade)
    else if (rock) add('gatherStone', rock.x, rock.y, upgrade * 0.8 * reach(v, rock.x, rock.y))
  }

  if (v.hasWorkbench && v.toolTier === 'stone' && v.profession === 'blacksmith') {
    const upgradeIron = 34 + p.ambition * 30 + danger * 20
    if (iron >= IRON_TOOL_COST) add('craftIronTool', v.x, v.y, upgradeIron)
    else if (ironOre) add('gatherIron', ironOre.x, ironOre.y, upgradeIron * 0.8 * reach(v, ironOre.x, ironOre.y))
  }

  if (mountainOre) {
    const mineUrge = 20 + p.ambition * 25 + p.courage * 10 + (v.profession === 'mason' || v.profession === 'blacksmith' || v.profession === 'miner' ? 25 : 0)
    add('mineTunnel', mountainOre.x, mountainOre.y, mineUrge * reach(v, mountainOre.x, mountainOre.y))
  }

  if (v.hasWorkbench && gold >= NUGGETS_PER_COIN && v.profession === 'trader') {
    add('mintCoins', v.workbenchX, v.workbenchY, (20 + (1 - p.generosity) * 40) * reach(v, v.workbenchX, v.workbenchY))
  }

  if (v.hasHome && isOwner) {
    if (v.fieldX === -1) {
      const site = findBuildSite(grid, v.homeX - 9, v.homeY, FIELD_RADIUS, 25)
      if (site) {
        v.fieldX = site.x
        v.fieldY = site.y
        claimArea(grid, site.x, site.y, FIELD_RADIUS, CLAIM_FIELD)
      }
    }
    if (v.fieldX !== -1 && sowingSeason(season)) {
      const bare = fieldCells(grid, v.fieldX, v.fieldY, FIELD_RADIUS).find((c) => isBuildableGround(grid, c.x, c.y))
      if (bare) add('sowField', bare.x, bare.y, (30 + (season === 'spring' ? 45 : 20) + p.ambition * 15) * reach(v, bare.x, bare.y))
    }
  }

  if (village && village.memberIds.length >= 2 && !village.hasMill && v.hasHome) {
    if (village.millX === -1) {
      const site = findMillSite(grid, village.centerX, village.centerY, 45)
      if (site) {
        village.millX = site.x
        village.millY = site.y
        setClaim(grid, site.x, site.y, CLAIM_MILL)
      }
    }
    if (village.millX !== -1) {
      const millUrge = 26 + p.sociability * 20 + p.ambition * 24
      if (wood >= MILL_WOOD_COST && stone >= MILL_STONE_COST) add('buildMill', village.millX, village.millY, millUrge * reach(v, village.millX, village.millY))
      else if (wood < MILL_WOOD_COST && tree) add('gatherWood', tree.x, tree.y, millUrge * 0.6 * reach(v, tree.x, tree.y))
      else if (rock) add('gatherStone', rock.x, rock.y, millUrge * 0.6 * reach(v, rock.x, rock.y))
    }
  }

  if (village?.hasMill && wheat >= WHEAT_PER_FLOUR) {
    add('grindFlour', village.millX, village.millY, (34 + starving * 60) * reach(v, village.millX, village.millY))
  }
  if (v.hasWorkbench && flour > 0) {
    add('bakeBread', v.workbenchX, v.workbenchY, (40 + starving * 70) * reach(v, v.workbenchX, v.workbenchY))
  }
  if (v.hasWorkbench && wool >= WOOL_PER_CLOTH && v.profession === 'weaver') {
    add('weaveCloth', v.workbenchX, v.workbenchY, (30 + p.ambition * 20) * reach(v, v.workbenchX, v.workbenchY))
  }
  if (v.hasWorkbench && cloth >= CLOTH_PER_CLOTHING && v.profession === 'weaver') {
    const winterPush = season === 'winter' ? 45 : season === 'autumn' ? 20 : 5
    add('sewClothing', v.workbenchX, v.workbenchY, (30 + winterPush) * reach(v, v.workbenchX, v.workbenchY))
  }
  if (v.hasWorkbench && hide > 0 && v.profession === 'herder') {
    add('tanHide', v.workbenchX, v.workbenchY, (25 + p.ambition * 15) * reach(v, v.workbenchX, v.workbenchY))
  }

  const materialNeed: { resource: ResourceType; reserve: number } | null =
    v.hasWorkbench && v.profession === 'weaver' && wool < WOOL_PER_CLOTH
      ? { resource: 'wool', reserve: targetPerCapita('wool') }
      : v.hasWorkbench && v.profession === 'blacksmith' && v.toolTier === 'stone' && iron < IRON_TOOL_COST
        ? { resource: 'iron', reserve: targetPerCapita('iron') }
        : v.hasWorkbench && v.profession === 'herder' && hide <= 0
          ? { resource: 'hide', reserve: targetPerCapita('hide') }
          : v.hasWorkbench && v.profession === 'trader' && gold < NUGGETS_PER_COIN
            ? { resource: 'gold', reserve: targetPerCapita('gold') }
            : null

  if (materialNeed) {
    const coinHave = countOf(v.inventory, 'coin')
    const price = priceOf(materialNeed.resource)
    if (coinHave >= price) {
      let bestSeller: Villager | null = null
      let bestSurplus = 0
      for (const other of state.villagers) {
        if (!other.alive || other.id === v.id || !other.chestInventory) continue
        const dx = other.chestX - v.x
        const dy = other.chestY - v.y
        if (dx > MATERIAL_TRADE_RADIUS || dx < -MATERIAL_TRADE_RADIUS || dy > MATERIAL_TRADE_RADIUS || dy < -MATERIAL_TRADE_RADIUS) continue
        const surplus = countOf(other.chestInventory, materialNeed.resource) - materialNeed.reserve
        if (surplus > bestSurplus) {
          bestSurplus = surplus
          bestSeller = other
        }
      }
      if (bestSeller) {
        const urge = 35 + p.ambition * 20 + starving * 15
        add('buyMaterial', bestSeller.chestX, bestSeller.chestY, urge * reach(v, bestSeller.chestX, bestSeller.chestY), bestSeller.id, materialNeed.resource)
      }
    }
  }

  const berryScarcity = bush ? clamp(distance(v.x, v.y, bush.x, bush.y) / searchR, 0, 1) : 1

  if (v.hasHome && v.hasWorkbench && isOwner) {
    if (!v.hasPen) {
      if (v.penX === -1) {
        const site = findBuildSite(grid, v.homeX + 10, v.homeY + 10, PEN_RADIUS, 25)
        if (site) {
          v.penX = site.x
          v.penY = site.y
          claimArea(grid, site.x, site.y, PEN_RADIUS, CLAIM_PEN)
        }
      }
      if (v.penX !== -1) {
        const farmUrge = 25 + berryScarcity * 50 + p.ambition * 20
        const gap = singleDoorWallCells(grid, v.penX, v.penY, PEN_RADIUS).find((c) => getTerrain(grid, c.x, c.y) !== FENCE)
        if (gap && (wood >= TILE_COST || stone >= TILE_COST)) add('buildPen', gap.x, gap.y, farmUrge * reach(v, gap.x, gap.y))
        else if (gap && tree) add('gatherWood', tree.x, tree.y, farmUrge * 0.7 * reach(v, tree.x, tree.y))
      }
    } else {
      let owned = 0
      for (const sh of state.sheep) if (sh.alive && sh.ownerId === v.id) owned++
      const wildSheep = owned < 4 ? nearestAlive(state.sheep, v.x, v.y, SHEEP_HUNT_RADIUS, (s) => !s.captured) : null
      if (wildSheep) add('captureSheep', wildSheep.x, wildSheep.y, (30 + berryScarcity * 55) * reach(v, wildSheep.x, wildSheep.y), wildSheep.id)
      if (v.penFeed < 4 && (wheat > 0 || larder > stockTarget)) {
        add('feedPen', v.penX, v.penY, (20 + p.generosity * 30 + (season === 'winter' ? 40 : 0)) * reach(v, v.penX, v.penY))
      }
    }
  }

  if (village && village.memberIds.length >= 2 && v.hasHome) {
    refreshPerimeter(state, village)
    const wantCode = village.wallTier === 'none' ? WALL_WOOD : village.wallTier === 'wood' ? WALL_STONE : null
    if (wantCode !== null && village.perimeter.length > 0) {
      const gap = village.perimeter.find((c) => getTerrain(grid, c.x, c.y) !== wantCode)
      if (gap) {
        const civicUrge = 15 + p.sociability * 45 + p.generosity * 35 + danger * 40
        const res = wantCode === WALL_WOOD ? wood : stone
        if (res >= WALL_SEGMENT_COST) add('buildWall', gap.x, gap.y, civicUrge * reach(v, gap.x, gap.y))
        else {
          const src = wantCode === WALL_WOOD ? tree : rock
          if (src) add(wantCode === WALL_WOOD ? 'gatherWood' : 'gatherStone', src.x, src.y, civicUrge * 0.7 * reach(v, src.x, src.y))
        }
      }
    }
  }

  if (wood >= BRIDGE_COST) {
    const wanted = bestCrossing(grid, v.x, v.y, 40, BRIDGE_DEMAND)
    if (wanted && !bridgeNearby(grid, wanted.x, wanted.y, 10)) {
      add('buildBridge', wanted.x, wanted.y, (18 + Math.min(60, wanted.demand * 0.8) + p.sociability * 18) * reach(v, wanted.x, wanted.y))
    }
  }

  const sellableSurplus = wool > 3 || cloth > 2 || hide > 2 || iron > 3 || gold > 2 || countOf(v.inventory, 'coin') > 6
  if (v.hasChest && (wood > 6 || stone > 6 || larder > stockTarget + 2 || sellableSurplus)) {
    add('storeChest', v.chestX, v.chestY, (25 + p.ambition * 20) * reach(v, v.chestX, v.chestY))
  }

  if (goldTile) add('mineGold', goldTile.x, goldTile.y, (12 + (1 - p.generosity) * 35) * reach(v, goldTile.x, goldTile.y))

  if (v.hasHome) add('rest', v.homeX, v.homeY, (season === 'winter' ? 22 : 8) * reach(v, v.homeX, v.homeY))

  const goodMemory = v.memories.find((m) => m.kind === 'goodSpot')
  const range = (25 + Math.round(p.curiosity * 60)) * (v.mounted ? 2 : 1)
  const idleX = goodMemory && rng() < 0.4 ? goodMemory.x : clamp(v.x + Math.floor((rng() - 0.5) * range * 2), 0, grid.width - 1)
  const idleY = goodMemory && rng() < 0.4 ? goodMemory.y : clamp(v.y + Math.floor((rng() - 0.5) * range * 2), 0, grid.height - 1)
  add('idle', idleX, idleY, 6 + p.curiosity * 14)

  let best: Option | null = null
  let bestScore = -Infinity
  for (let i = 0; i < options.length; i++) {
    const o = options[i]
    const jittered = o.score * (0.92 + rng() * 0.16)
    if (jittered > bestScore) {
      bestScore = jittered
      best = o
    }
  }
  if (best) setTask(v, best.kind, best.x, best.y, best.id, best.resource)
  else setTask(v, 'idle', v.x, v.y)
}

function executeTask(state: SimState, v: Villager, rng: () => number): boolean {
  const grid = state.grid
  const task = v.task
  if (!task) return false
  task.ageTicks += 1
  const maxAge = task.kind === 'tradeRun' ? TRADE_TASK_MAX_AGE : TASK_MAX_AGE
  if (task.ageTicks > maxAge) return false

  const arrived = distance(v.x, v.y, task.targetX, task.targetY) <= 1.5

  if (task.kind === 'eat') {
    const food = bestEdible(v)
    if (!food) return false
    removeFromInventory(v.inventory, food, 1)
    v.hunger = Math.min(HUNGER_MAX, v.hunger + (food === 'bread' ? 2 : food === 'food' ? 1 : 0.5))
    return false
  }
  if (task.kind === 'craftSpear') {
    if (countOf(v.inventory, 'wood') < SPEAR_WOOD_COST) return false
    removeFromInventory(v.inventory, 'wood', SPEAR_WOOD_COST)
    v.toolTier = 'wood'
    return false
  }
  if (task.kind === 'craftStoneSpear') {
    if (countOf(v.inventory, 'stone') < STONE_SPEAR_COST) return false
    removeFromInventory(v.inventory, 'stone', STONE_SPEAR_COST)
    v.toolTier = 'stone'
    return false
  }
  if (task.kind === 'craftIronTool') {
    if (countOf(v.inventory, 'iron') < IRON_TOOL_COST) return false
    removeFromInventory(v.inventory, 'iron', IRON_TOOL_COST)
    v.toolTier = 'iron'
    return false
  }

  if (!arrived) {
    if (task.targetId !== null) {
      if (task.kind === 'captureSheep') {
        const sheep = state.sheep.find((sh) => sh.id === task.targetId && sh.alive && !sh.captured)
        if (!sheep) return false
        task.targetX = sheep.x
        task.targetY = sheep.y
      } else if (task.kind === 'tameHorse' || task.kind === 'feedHorse') {
        const horse = state.horses.find((h) => h.id === task.targetId && h.alive)
        if (!horse) return false
        task.targetX = horse.x
        task.targetY = horse.y
      } else if (task.kind === 'socialise' || task.kind === 'giveFood' || task.kind === 'confront') {
        const other = state.villagers.find((o) => o.id === task.targetId && o.alive)
        if (!other) return false
        task.targetX = other.x
        task.targetY = other.y
      }
    }
    const allowWater = task.kind === 'fish' && v.boatId !== null
    const cartDrag = v.mounted && v.hasCart ? -1 : 0
    const speed = VILLAGER_SPEED + surfaceSpeedBonus(grid, v.x, v.y) + (v.mounted ? HORSE_SPEED_BONUS + cartDrag : 0)
    const wear = v.mounted ? 2 : 1
    const moved = moveToward(v, task.targetX, task.targetY, Math.max(1, Math.round(speed)), grid, wear, allowWater)
    if (!moved) {
      task.stuckTicks += 1
      moveRandom(v, rng, grid, 2)
      if (task.stuckTicks >= STUCK_LIMIT) return false
    } else {
      task.stuckTicks = 0
    }
    return true
  }

  switch (task.kind) {
    case 'fish': {
      const onBoat = v.boatId !== null
      if (!onBoat && !isShore(grid, task.targetX, task.targetY)) return false
      if (onBoat && getTerrain(grid, task.targetX, task.targetY) !== WATER) return false
      const catchChance = 0.32 + (v.profession === 'fisher' ? 0.25 : 0) + (onBoat ? 0.15 : 0)
      if (rng() < catchChance) addToInventory(v.inventory, 'food', onBoat ? 3 : 2)
      return edibleValue(v.inventory) < FOOD_TARGET && task.ageTicks < 70
    }
    case 'tameHorse': {
      const horse = state.horses.find((h) => h.id === task.targetId && h.alive && !h.tamed)
      if (!horse) return false
      tryTame(state, v, horse, rng)
      return false
    }
    case 'feedHorse': {
      const horse = state.horses.find((h) => h.id === task.targetId && h.alive)
      if (!horse) return false
      const grain = countOf(v.inventory, 'wheat')
      if (grain <= 0) return false
      removeFromInventory(v.inventory, 'wheat', 1)
      horse.hunger = Math.min(HUNGER_MAX, horse.hunger + 2)
      return false
    }
    case 'buildCart': {
      if (countOf(v.inventory, 'wood') < CART_WOOD_COST || countOf(v.inventory, 'stone') < CART_STONE_COST) return false
      removeFromInventory(v.inventory, 'wood', CART_WOOD_COST)
      removeFromInventory(v.inventory, 'stone', CART_STONE_COST)
      v.hasCart = true
      logEvent(state, `${v.name} a construit une charrette`)
      return false
    }
    case 'buildBoat': {
      const cargo = v.profession === 'trader'
      const needWood = cargo ? BOAT_CARGO_WOOD_COST : BOAT_FISH_WOOD_COST
      const needStone = cargo ? BOAT_CARGO_STONE_COST : 0
      if (countOf(v.inventory, 'wood') < needWood || countOf(v.inventory, 'stone') < needStone) return false
      removeFromInventory(v.inventory, 'wood', needWood)
      if (needStone > 0) removeFromInventory(v.inventory, 'stone', needStone)
      const boat = { id: state.nextId++, x: task.targetX, y: task.targetY, kind: cargo ? ('cargo' as const) : ('fishing' as const), ownerId: v.id, villageId: v.villageId, alive: true }
      state.boats.push(boat)
      v.boatId = boat.id
      logEvent(state, `${v.name} a mis à l'eau ${cargo ? 'un chaland' : 'une barque'}`)
      return false
    }
    case 'buildPort': {
      const village = state.villages.find((vg) => vg.id === v.villageId)
      if (!village || village.hasPort) return false
      if (countOf(v.inventory, 'wood') < PORT_WOOD_COST || countOf(v.inventory, 'stone') < PORT_STONE_COST) return false
      setTerrain(grid, task.targetX, task.targetY, PORT)
      removeFromInventory(v.inventory, 'wood', PORT_WOOD_COST)
      removeFromInventory(v.inventory, 'stone', PORT_STONE_COST)
      village.hasPort = true
      village.portX = task.targetX
      village.portY = task.targetY
      logEvent(state, `${v.name} a achevé le port du village`)
      return false
    }
    case 'tradeRun': {
      if (task.targetId !== null && task.targetId >= 0) {
        const destVillage = state.villages.find((vg) => vg.id === task.targetId)
        const homeVillage = state.villages.find((vg) => vg.id === v.villageId)
        if (!destVillage || !homeVillage) return false
        const deal = findTradeOpportunity(state, homeVillage, v.x, v.y)
        const resource = deal && deal.target.id === destVillage.id ? deal.resource : 'wood'
        const gain = deal && deal.target.id === destVillage.id ? deal.gain : 3
        conductTrade(state, v, destVillage, resource, gain)
        v.tradeCooldown = TRADE_COOLDOWN
        task.targetX = v.homeX
        task.targetY = v.homeY
        task.targetId = -1
        return v.homeX !== -1
      }
      return false
    }
    case 'gatherFood': {
      if (getTerrain(grid, task.targetX, task.targetY) !== BUSH) return false
      const i = task.targetY * grid.width + task.targetX
      const potential = Math.min(berriesRipeIn(state.season) ? 2 : 1, grid.amount[i])
      const leftover = addToInventory(v.inventory, 'food', potential)
      const gained = potential - leftover
      const remaining = Math.max(0, grid.amount[i] - gained)
      setTerrain(grid, task.targetX, task.targetY, remaining <= 0 ? GRASS : BUSH, remaining)
      if (gained <= 0) return false
      if (rng() < 0.08) {
        remember(v, { kind: 'goodSpot', subjectId: null, x: task.targetX, y: task.targetY, tick: state.tick, weight: 0.6, emotion: 0.4 })
      }
      return edibleValue(v.inventory) < FOOD_TARGET
    }
    case 'gatherWood':
    case 'gatherStone':
    case 'gatherIron': {
      const wantTerrain = task.kind === 'gatherWood' ? TREE : task.kind === 'gatherIron' ? IRON : STONE
      const res = task.kind === 'gatherWood' ? 'wood' : task.kind === 'gatherIron' ? 'iron' : 'stone'
      if (getTerrain(grid, task.targetX, task.targetY) !== wantTerrain) return false
      const i = task.targetY * grid.width + task.targetX
      const potential = Math.min(2, grid.amount[i])
      const leftover = addToInventory(v.inventory, res, potential)
      const gained = potential - leftover
      const remaining = Math.max(0, grid.amount[i] - gained)
      setTerrain(grid, task.targetX, task.targetY, remaining <= 0 ? GRASS : wantTerrain, remaining)
      const cap = v.hasCart && v.mounted ? 20 : v.mounted ? 14 : 8
      return gained > 0 && countOf(v.inventory, res) < cap
    }
    case 'mineTunnel': {
      if (getTerrain(grid, task.targetX, task.targetY) !== MOUNTAIN) return false
      const i = task.targetY * grid.width + task.targetX
      const potential = Math.min(MINE_STONE_YIELD, grid.amount[i])
      const leftover = addToInventory(v.inventory, 'stone', potential)
      const gained = potential - leftover
      const remaining = Math.max(0, grid.amount[i] - gained)
      if (gained > 0) {
        // Digging exposes the actual geological deposit. Iron/gold are never placed on the surface.
        const iron = Math.min(MINE_IRON_YIELD, grid.ironDeposit[i])
        const gold = Math.min(MINE_GOLD_YIELD, grid.goldDeposit[i])
        if (iron > 0) {
          const leftIron = addToInventory(v.inventory, 'iron', iron)
          grid.ironDeposit[i] = iron - (iron - leftIron)
        }
        if (gold > 0) {
          const leftGold = addToInventory(v.inventory, 'gold', gold)
          grid.goldDeposit[i] = gold - (gold - leftGold)
        }
      }
      setTerrain(grid, task.targetX, task.targetY, remaining <= 0 ? TUNNEL : MOUNTAIN, remaining)
      const cap2 = v.hasCart && v.mounted ? 20 : v.mounted ? 14 : 8
      return gained > 0 && countOf(v.inventory, 'stone') < cap2
    }
    case 'weaveCloth': {
      const woolHave = countOf(v.inventory, 'wool')
      if (woolHave < WOOL_PER_CLOTH) return false
      const batches = Math.floor(woolHave / WOOL_PER_CLOTH)
      removeFromInventory(v.inventory, 'wool', batches * WOOL_PER_CLOTH)
      addToInventory(v.inventory, 'cloth', batches)
      return false
    }
    case 'sewClothing': {
      const clothHave = countOf(v.inventory, 'cloth')
      if (clothHave < CLOTH_PER_CLOTHING) return false
      const batches = Math.floor(clothHave / CLOTH_PER_CLOTHING)
      removeFromInventory(v.inventory, 'cloth', batches * CLOTH_PER_CLOTHING)
      addToInventory(v.inventory, 'clothing', batches)
      return false
    }
    case 'tanHide': {
      const hideHave = countOf(v.inventory, 'hide')
      if (hideHave <= 0) return false
      removeFromInventory(v.inventory, 'hide', hideHave)
      addToInventory(v.inventory, 'leather', Math.max(1, Math.floor(hideHave / 2)))
      return false
    }
    case 'mineGold': {
      const t = getTerrain(grid, task.targetX, task.targetY)
      if (t !== GOLD && t !== LOOT) return false
      const i = task.targetY * grid.width + task.targetX
      const potential = Math.min(2, grid.amount[i])
      const leftover = addToInventory(v.inventory, 'gold', potential)
      const remaining = Math.max(0, grid.amount[i] - (potential - leftover))
      setTerrain(grid, task.targetX, task.targetY, remaining <= 0 ? GRASS : t, remaining)
      return false
    }
    case 'mintCoins': {
      const nuggets = countOf(v.inventory, 'gold')
      if (nuggets < NUGGETS_PER_COIN) return false
      const batches = Math.floor(nuggets / NUGGETS_PER_COIN)
      removeFromInventory(v.inventory, 'gold', batches * NUGGETS_PER_COIN)
      addToInventory(v.inventory, 'coin', batches * COINS_PER_NUGGET_BATCH)
      return false
    }
    case 'sowField': {
      if (!isBuildableGround(grid, task.targetX, task.targetY)) return false
      setTerrain(grid, task.targetX, task.targetY, WHEAT, 1)
      v.hasField = true
      const next = fieldCells(grid, v.fieldX, v.fieldY, FIELD_RADIUS).find((c) => isBuildableGround(grid, c.x, c.y))
      if (!next) return false
      task.targetX = next.x
      task.targetY = next.y
      return true
    }
    case 'harvestWheat': {
      const i = task.targetY * grid.width + task.targetX
      if (getTerrain(grid, task.targetX, task.targetY) !== WHEAT) return false
      const ripeness = grid.amount[i]
      if (ripeness < WHEAT_SPROUT) return false
      addToInventory(v.inventory, 'wheat', ripeness >= WHEAT_RIPE ? 3 : 1)
      setTerrain(grid, task.targetX, task.targetY, DIRT)
      return false
    }
    case 'grindFlour': {
      const village = state.villages.find((vg) => vg.id === v.villageId)
      if (!village?.hasMill) return false
      const wheat = countOf(v.inventory, 'wheat')
      if (wheat < WHEAT_PER_FLOUR) return false
      const batches = Math.floor(wheat / WHEAT_PER_FLOUR)
      removeFromInventory(v.inventory, 'wheat', batches * WHEAT_PER_FLOUR)
      addToInventory(v.inventory, 'flour', batches)
      return false
    }
    case 'bakeBread': {
      const flour = countOf(v.inventory, 'flour')
      if (flour <= 0) return false
      removeFromInventory(v.inventory, 'flour', flour)
      addToInventory(v.inventory, 'bread', flour * BREAD_PER_FLOUR)
      return false
    }
    case 'buildMill': {
      const village = state.villages.find((vg) => vg.id === v.villageId)
      if (!village || village.hasMill) return false
      if (countOf(v.inventory, 'wood') < MILL_WOOD_COST || countOf(v.inventory, 'stone') < MILL_STONE_COST) return false
      setTerrain(grid, task.targetX, task.targetY, MILL)
      removeFromInventory(v.inventory, 'wood', MILL_WOOD_COST)
      removeFromInventory(v.inventory, 'stone', MILL_STONE_COST)
      village.hasMill = true
      village.millX = task.targetX
      village.millY = task.targetY
      logEvent(state, `${v.name} a achevé le moulin`)
      return false
    }
    case 'buildHouse': {
      if (countOf(v.inventory, 'wood') < TILE_COST) return false
      const fp = homeFootprint(v)
      if (!fp) return false
      if (getTerrain(grid, task.targetX, task.targetY) !== HOUSE) {
        setTerrain(grid, task.targetX, task.targetY, HOUSE)
        removeFromInventory(v.inventory, 'wood', TILE_COST)
      }
      const nextGap = fp.walls.find((c) => getTerrain(grid, c.x, c.y) !== HOUSE)
      if (!nextGap) {
        for (const c of fp.interior) if (inBounds(grid, c.x, c.y)) setTerrain(grid, c.x, c.y, PLANK)
        for (const c of fp.open) if (inBounds(grid, c.x, c.y)) setTerrain(grid, c.x, c.y, DIRT)
        v.hasHome = true
        v.homeOwnerId = v.id
        const joinRadius = VILLAGE_JOIN_RADIUS * (0.5 + v.personality.sociability)
        const village = findOrCreateVillage(state, v.homeX, v.homeY, joinRadius, rng)
        village.memberIds.push(v.id)
        v.villageId = village.id
        if (v.house) reinforceStyle(village.style, v.house.shape)
        recalcVillageCentre(state, village)
        village.perimeterTick = -PERIMETER_REFRESH
        if (v.profession === 'none') v.profession = assignProfession(state, v)
        logEvent(state, `${v.name} a bâti une maison ${SHAPE_FR[v.house?.shape ?? 'square']}`)
        return false
      }
      if (countOf(v.inventory, 'wood') < TILE_COST) return false
      task.targetX = nextGap.x
      task.targetY = nextGap.y
      return true
    }
    case 'buildPen': {
      const haveWood = countOf(v.inventory, 'wood') >= TILE_COST
      const haveStone = countOf(v.inventory, 'stone') >= TILE_COST
      if (!haveWood && !haveStone) return false
      if (getTerrain(grid, task.targetX, task.targetY) !== FENCE) {
        setTerrain(grid, task.targetX, task.targetY, FENCE)
        removeFromInventory(v.inventory, haveStone ? 'stone' : 'wood', TILE_COST)
      }
      const nextGap = singleDoorWallCells(grid, v.penX, v.penY, PEN_RADIUS).find((c) => getTerrain(grid, c.x, c.y) !== FENCE)
      if (!nextGap) {
        v.hasPen = true
        return false
      }
      task.targetX = nextGap.x
      task.targetY = nextGap.y
      return countOf(v.inventory, 'wood') >= TILE_COST || countOf(v.inventory, 'stone') >= TILE_COST
    }
    case 'buildBridge': {
      if (countOf(v.inventory, 'wood') < BRIDGE_COST) return false
      if (getTerrain(grid, task.targetX, task.targetY) === WATER) {
        setTerrain(grid, task.targetX, task.targetY, BRIDGE)
        removeFromInventory(v.inventory, 'wood', BRIDGE_COST)
        grid.crossing.delete(task.targetY * grid.width + task.targetX)
        state.bridges += 1
      }
      for (const [dx, dy] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ] as const) {
        const nx = task.targetX + dx
        const ny = task.targetY + dy
        if (inBounds(grid, nx, ny) && getTerrain(grid, nx, ny) === WATER) {
          task.targetX = nx
          task.targetY = ny
          return countOf(v.inventory, 'wood') >= BRIDGE_COST
        }
      }
      logEvent(state, `${v.name} a jeté un pont sur l'eau`)
      return false
    }
    case 'buildWorkbench': {
      if (countOf(v.inventory, 'wood') < WORKBENCH_COST) return false
      setTerrain(grid, task.targetX, task.targetY, WORKBENCH)
      removeFromInventory(v.inventory, 'wood', WORKBENCH_COST)
      v.hasWorkbench = true
      v.workbenchX = task.targetX
      v.workbenchY = task.targetY
      return false
    }
    case 'buildChest': {
      if (countOf(v.inventory, 'wood') < CHEST_COST) return false
      setTerrain(grid, task.targetX, task.targetY, CHEST)
      removeFromInventory(v.inventory, 'wood', CHEST_COST)
      v.hasChest = true
      v.chestX = task.targetX
      v.chestY = task.targetY
      v.chestInventory = createInventory(20)
      return false
    }
    case 'buildBed': {
      if (countOf(v.inventory, 'wood') < BED_COST) return false
      setTerrain(grid, task.targetX, task.targetY, BED)
      removeFromInventory(v.inventory, 'wood', BED_COST)
      v.bedCount += 1
      return false
    }
    case 'buildWall': {
      const village = state.villages.find((vg) => vg.id === v.villageId)
      if (!village) return false
      const wantCode = village.wallTier === 'none' ? WALL_WOOD : village.wallTier === 'wood' ? WALL_STONE : null
      if (wantCode === null) return false
      const res = wantCode === WALL_WOOD ? 'wood' : 'stone'
      if (countOf(v.inventory, res) < WALL_SEGMENT_COST) return false
      if (getTerrain(grid, task.targetX, task.targetY) !== wantCode) {
        setTerrain(grid, task.targetX, task.targetY, wantCode)
        removeFromInventory(v.inventory, res, WALL_SEGMENT_COST)
      }
      const nextGap = village.perimeter.find((c) => getTerrain(grid, c.x, c.y) !== wantCode)
      if (!nextGap) {
        if (wantCode === WALL_WOOD) {
          village.wallTier = 'wood'
          village.wallHealth = village.perimeter.length * WALL_HEALTH_PER_CELL
          logEvent(state, `Enceinte fermée : ${village.perimeter.length} cases bâties, ${village.naturalCover} couvertes par l'eau`)
        } else {
          village.wallTier = 'stone'
          logEvent(state, `Le village a son rempart de pierre`)
        }
        return false
      }
      task.targetX = nextGap.x
      task.targetY = nextGap.y
      return countOf(v.inventory, res) >= WALL_SEGMENT_COST
    }
    case 'captureSheep': {
      const sheep = state.sheep.find((sh) => sh.id === task.targetId && sh.alive && !sh.captured)
      if (!sheep || !v.hasPen) return false
      sheep.captured = true
      sheep.ownerId = v.id
      sheep.x = v.penX
      sheep.y = v.penY
      sheep.breedCooldown = 150
      return false
    }
    case 'feedPen': {
      if (task.targetId !== null && task.targetId >= 0) {
        const victim = state.sheep.find((sh) => sh.id === task.targetId && sh.alive)
        if (victim) {
          victim.alive = false
          v.hunger = HUNGER_MAX
          v.health = Math.min(VILLAGER_HEALTH_MAX, v.health + 1)
          addToInventory(v.inventory, 'hide', 1)
        }
        return false
      }
      const grain = countOf(v.inventory, 'wheat')
      if (grain > 0) {
        v.penFeed += removeFromInventory(v.inventory, 'wheat', grain)
        return false
      }
      const spare = Math.max(0, countOf(v.inventory, 'food') - 1)
      if (spare <= 0) return false
      v.penFeed += removeFromInventory(v.inventory, 'food', spare)
      return false
    }
    case 'storeChest': {
      if (!v.chestInventory) return false
      for (const res of ['wood', 'stone', 'iron', 'gold', 'flour', 'wool', 'cloth', 'hide', 'leather', 'coin'] as ResourceType[]) transferAll(v.inventory, v.chestInventory, res)
      if (edibleValue(v.inventory) - FOOD_TARGET > 0) {
        for (const res of ['wheat', 'food', 'bread'] as ResourceType[]) {
          const have = countOf(v.inventory, res)
          if (have <= 1) continue
          const give = have - 1
          const leftover = addToInventory(v.chestInventory, res, give)
          removeFromInventory(v.inventory, res, give - leftover)
        }
      }
      return false
    }
    case 'takeFromChest': {
      if (!v.chestInventory) return false
      for (const res of ['bread', 'food', 'wheat'] as ResourceType[]) {
        const have = countOf(v.chestInventory, res)
        if (have <= 0) continue
        const want = Math.min(4, have)
        const leftover = addToInventory(v.inventory, res, want)
        removeFromInventory(v.chestInventory, res, want - leftover)
        break
      }
      return false
    }
    case 'buyMaterial': {
      const resource = task.resource
      const seller = state.villagers.find((o) => o.id === task.targetId && o.alive)
      if (!resource || !seller || !seller.chestInventory) return false
      const price = priceOf(resource)
      const coinHave = countOf(v.inventory, 'coin')
      if (coinHave < price) return false
      const reserve = targetPerCapita(resource)
      const available = countOf(seller.chestInventory, resource)
      const affordable = Math.floor(coinHave / price)
      const batch = Math.min(4, available - reserve, affordable)
      if (batch <= 0) return false
      removeFromInventory(seller.chestInventory, resource, batch)
      addToInventory(v.inventory, resource, batch)
      removeFromInventory(v.inventory, 'coin', batch * price)
      addToInventory(seller.inventory, 'coin', batch * price)
      return false
    }
    case 'rest':
      return task.ageTicks < 40
    case 'idle':
      return false
    default:
      return false
  }
}

const SHAPE_FR: Record<string, string> = {
  square: 'carrée',
  rect: 'rectangulaire',
  round: 'ronde',
  ell: 'en L',
  courtyard: 'à cour',
  longhouse: 'longue',
}

export function tickVillager(state: SimState, v: Villager, rng: () => number) {
  const grid = state.grid
  v.age++
  if (v.reproCooldown > 0) v.reproCooldown -= 1
  if (v.tradeCooldown > 0) v.tradeCooldown -= 1
  if (tickNeeds(v, VILLAGER_HEALTH_MAX, state.season, warmthMultiplier(v))) {
    v.alive = false
    state.deaths += 1
    logEvent(state, `${v.name} est mort de faim`)
    onDeath(state, v, null)
    return
  }
  if (v.profession === 'none' && v.hasHome) v.profession = assignProfession(state, v)
  if ((state.tick + v.id) % SOCIAL_STAGGER === 0) tickSocialUpkeep(state, v)

  if (v.horseId !== null) {
    let horse: Horse | undefined
    const hid = v.horseId
    for (let i = 0; i < state.horses.length; i++) {
      const h = state.horses[i]
      if (h.id === hid && h.alive) {
        horse = h
        break
      }
    }
    if (!horse) {
      v.horseId = null
      v.mounted = false
    } else if (!v.mounted && distance(horse.x, horse.y, v.x, v.y) <= 2) {
      v.mounted = true
      horse.riderId = v.id
    }
  } else {
    v.mounted = false
  }

  const desperate = v.hunger < 0.6
  const effectiveFleeRadius = FLEE_RADIUS * (1.4 - v.personality.courage * 0.8) * (desperate ? 0.5 : 1)
  const threat = nearestAlive(state.wolves, v.x, v.y, effectiveFleeRadius)
  if (threat) {
    if (v.toolTier !== 'none') {
      setTask(v, 'fight', threat.x, threat.y, threat.id)
      moveToward(v, threat.x, threat.y, VILLAGER_SPEED, grid, 1)
    } else {
      setTask(v, 'flee', threat.x, threat.y, threat.id)
      const cartDrag = v.mounted && v.hasCart ? -1 : 0
      const speed = FLEE_SPEED + (v.mounted ? HORSE_SPEED_BONUS + cartDrag : 0)
      const fp = homeFootprint(v)
      if (fp) moveToward(v, fp.door.x, fp.door.y, speed, grid, 1)
      else moveToward(v, v.x + (v.x - threat.x) * 5, v.y + (v.y - threat.y) * 5, speed, grid, 1)
    }
    v.task = null
    return
  }

  if (!v.task) {
    if (state.tick < v.nextThinkTick) return
    updateMind(state, v)
    chooseTask(state, v, rng)
    v.nextThinkTick = state.tick + THINK_COOLDOWN
  }
  const active = v.task
  const continued = executeTask(state, v, rng)
  if (active) {
    const m = mindOf(v)
    m.lastKind = active.kind
    if (continued) m.successes += 1
    else if (active.ageTicks > 20) { m.failures += 1; m.commitment = Math.max(0, m.commitment - 3) }
    else m.successes += 1
  }
  if (!continued) v.task = null
}

export function tickFields(state: SimState) {
  const rate = growthRate(state.season)
  if (rate <= 0) return
  const grid = state.grid
  const r = FIELD_RADIUS
  const w = grid.width
  for (const v of state.villagers) {
    if (!v.alive || v.fieldX === -1) continue
    const x0 = v.fieldX - r
    const y0 = v.fieldY - r
    const x1 = v.fieldX + r
    const y1 = v.fieldY + r
    for (let y = y0; y <= y1; y++) {
      if (y < 0 || y >= grid.height) continue
      const row = y * w
      for (let x = x0; x <= x1; x++) {
        if (x < 0 || x >= w) continue
        const i = row + x
        if (grid.terrain[i] !== WHEAT) continue
        if (grid.amount[i] < WHEAT_RIPE) {
          const before = grid.amount[i]
          grid.amount[i] = Math.min(WHEAT_RIPE, before + rate)
          if (
            (before < WHEAT_SPROUT && grid.amount[i] >= WHEAT_SPROUT) ||
            (before < WHEAT_GREEN && grid.amount[i] >= WHEAT_GREEN) ||
            (before < WHEAT_RIPE && grid.amount[i] >= WHEAT_RIPE)
          ) {
            grid.dirty.push(i)
          }
        }
      }
    }
  }
}

export function tickFamine(state: SimState) {
  let alive = 0
  let hungry = 0
  let stores = 0
  for (const v of state.villagers) {
    if (!v.alive) continue
    alive++
    if (v.hunger < HUNGRY_THRESHOLD) hungry++
    stores += edibleValue(v.inventory)
    if (v.chestInventory) stores += edibleValue(v.chestInventory)
  }
  if (alive === 0) {
    state.famine = false
    return
  }
  const was = state.famine
  state.famine = hungry / alive > 0.4 || stores < alive
  if (state.famine && !was) logEvent(state, `La famine s'installe`)
  if (!state.famine && was) logEvent(state, `La famine est passée`)
}

export function tickReproduction(state: SimState, rng: () => number) {
  if (state.tick % 6 !== 0) return
  if (state.famine || state.season === 'winter') return
  let alive = 0
  for (const v of state.villagers) if (v.alive) alive++
  if (alive >= MAX_POPULATION) return

  const ready = (v: Villager) =>
    v.alive && v.hasHome && v.reproCooldown <= 0 && v.hunger >= REPRO_HUNGER_THRESHOLD && edibleValue(v.inventory) >= REPRO_FOOD_STOCK

  for (const a of state.villagers) {
    if (!ready(a)) continue
    for (const b of state.villagers) {
      if (b.id === a.id || !ready(b)) continue
      if (distance(a.x, a.y, b.x, b.y) > 2.5) continue
      const rel = a.relations.get(b.id)
      if (rel && rel.affinity < 0.1) continue

      const homeOwner = a.homeOwnerId !== null ? state.villagers.find((o) => o.id === a.homeOwnerId && o.alive) : undefined
      let residents = 0
      if (homeOwner) {
        const hid = homeOwner.id
        for (const o of state.villagers) if (o.alive && o.homeOwnerId === hid) residents++
      }
      const hasRoom = homeOwner ? residents < homeOwner.bedCount : false

      for (const parent of [a, b]) {
        if (countOf(parent.inventory, 'bread') > 0) removeFromInventory(parent.inventory, 'bread', 1)
        else removeFromInventory(parent.inventory, 'food', 2)
      }
      a.reproCooldown = REPRO_COOLDOWN
      b.reproCooldown = REPRO_COOLDOWN

      const seed = Math.floor(rng() * 4294967296)
      const personality = inheritPersonality(a.personality, b.personality, rng)
      const childInventory = createInventory(5)
      addToInventory(childInventory, 'coin', CHILD_STARTER_COINS)
      const child: Villager = {
        id: state.nextId++,
        seed,
        name: generateName(seed),
        personality,
        profession: 'none',
        ambition: pickAmbition(personality, rng),
        grudgeTarget: null,
        parentIds: [a.id, b.id],
        x: a.x,
        y: a.y,
        health: VILLAGER_HEALTH_MAX,
        hunger: HUNGER_MAX,
        starveTimer: 0,
        healTimer: 0,
        inventory: childInventory,
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
        hasHome: hasRoom,
        homeX: hasRoom && homeOwner ? homeOwner.homeX : -1,
        homeY: hasRoom && homeOwner ? homeOwner.homeY : -1,
        homeOwnerId: hasRoom && homeOwner ? homeOwner.id : null,
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
        villageId: a.villageId,
        hue: Math.floor((a.hue + b.hue) / 2),
        alive: true,
        age: 0,
        reproCooldown: REPRO_COOLDOWN,
      }
      relationWith(child, a.id).affinity = 0.8
      relationWith(child, b.id).affinity = 0.8
      relationWith(a, child.id).affinity = 0.8
      relationWith(b, child.id).affinity = 0.8
      state.villagers.push(child)
      state.births += 1
      logEvent(state, `${child.name} est né de ${a.name} et ${b.name}`)
      return
    }
  }
}

export function tickSheep(state: SimState, s: Sheep, rng: () => number) {
  if (s.breedCooldown > 0) s.breedCooldown -= 1
  if (s.woolCooldown > 0) s.woolCooldown -= 1
  if (tickNeeds(s, ANIMAL_HEALTH_MAX, state.season)) {
    s.alive = false
    return
  }

  if (!s.captured) {
    if (s.breedCooldown <= 0 && s.hunger >= 3 && state.season !== 'winter') {
      let wild = 0
      for (const o of state.sheep) if (o.alive) wild++
      if (wild < MAX_WILD_SHEEP) {
        const mate = state.sheep.find(
          (o) => o.alive && !o.captured && o.id !== s.id && o.breedCooldown <= 0 && o.hunger >= 3 && distance(s.x, s.y, o.x, o.y) <= 1.5,
        )
        if (mate) {
          s.breedCooldown = WILD_SHEEP_BREED_COOLDOWN
          mate.breedCooldown = WILD_SHEEP_BREED_COOLDOWN
          state.sheep.push({
            id: state.nextId++,
            x: s.x,
            y: s.y,
            health: ANIMAL_HEALTH_MAX,
            hunger: 2,
            starveTimer: 0,
            healTimer: 0,
            captured: false,
            ownerId: null,
            breedCooldown: WILD_SHEEP_BREED_COOLDOWN,
            woolCooldown: 0,
            alive: true,
          })
          return
        }
      }
    }
    if (s.hunger <= HUNGRY_THRESHOLD) {
      const grass = findNearbyTerrain(state.grid, s.x, s.y, 4, GRASS)
      if (grass) {
        if (distance(s.x, s.y, grass.x, grass.y) <= 1.5) {
          setTerrain(state.grid, grass.x, grass.y, DIRT)
          s.hunger = Math.min(HUNGER_MAX, s.hunger + 1)
        } else {
          moveToward(s, grass.x, grass.y, 1, state.grid)
        }
        return
      }
    }
    const flockMate = nearestAlive(state.sheep, s.x, s.y, 18, (o) => !o.captured && o.id !== s.id)
    if (flockMate && distance(s.x, s.y, flockMate.x, flockMate.y) > 3 && rng() < 0.6) {
      moveToward(s, flockMate.x, flockMate.y, 1, state.grid)
      return
    }
    moveRandom(s, rng, state.grid)
    return
  }

  const owner = state.villagers.find((v) => v.id === s.ownerId)
  const penX = owner ? owner.penX : s.x
  const penY = owner ? owner.penY : s.y
  moveRandom(s, rng, state.grid)
  s.x = clamp(s.x, penX - (PEN_RADIUS - 1), penX + (PEN_RADIUS - 1))
  s.y = clamp(s.y, penY - (PEN_RADIUS - 1), penY + (PEN_RADIUS - 1))

  if (owner && owner.penFeed > 0) {
    owner.penFeed -= 0.05
    s.hunger = Math.min(HUNGER_MAX, s.hunger + HUNGER_DECAY * 2)
  } else if (s.hunger <= HUNGRY_THRESHOLD && state.season !== 'winter') {
    const grass = findNearbyTerrain(state.grid, s.x, s.y, 3, GRASS)
    if (grass) setTerrain(state.grid, grass.x, grass.y, DIRT)
    s.hunger = Math.min(HUNGER_MAX, s.hunger + 1)
  }

  if (owner && s.woolCooldown <= 0 && s.hunger >= 2.5) {
    addToInventory(owner.inventory, 'wool', 1)
    s.woolCooldown = WOOL_YIELD_COOLDOWN
  }

  if (owner && s.breedCooldown <= 0 && s.hunger >= 3 && state.season !== 'winter') {
    const mate = state.sheep.find((o) => o.alive && o.id !== s.id && o.ownerId === s.ownerId && o.breedCooldown <= 0 && o.hunger >= 3)
    if (mate) {
      s.breedCooldown = CAPTURED_SHEEP_BREED_COOLDOWN
      mate.breedCooldown = CAPTURED_SHEEP_BREED_COOLDOWN
      state.sheep.push({
        id: state.nextId++,
        x: penX,
        y: penY,
        health: ANIMAL_HEALTH_MAX,
        hunger: 2,
        starveTimer: 0,
        healTimer: 0,
        captured: true,
        ownerId: s.ownerId,
        breedCooldown: 300,
        woolCooldown: 0,
        alive: true,
      })
    }
  }
}

export function tickWolf(state: SimState, w: Wolf, rng: () => number) {
  if (w.breedCooldown > 0) w.breedCooldown -= 1
  if (tickNeeds(w, ANIMAL_HEALTH_MAX, state.season)) {
    w.alive = false
    return
  }

  let targetVillager: Villager | undefined
  let targetSheep: Sheep | undefined
  let targetHorse: Horse | undefined
  if (w.targetId !== null) {
    if (w.targetKind === 'villager') targetVillager = state.villagers.find((v) => v.id === w.targetId && v.alive)
    else if (w.targetKind === 'sheep') targetSheep = state.sheep.find((s) => s.id === w.targetId && s.alive && !s.captured)
    else if (w.targetKind === 'horse') targetHorse = state.horses.find((h) => h.id === w.targetId && h.alive && h.riderId === null)
    if (!targetVillager && !targetSheep && !targetHorse) {
      w.targetId = null
      w.targetKind = null
    }
  }

  if (!targetVillager && !targetSheep && !targetHorse) {
    const huntRadius = state.season === 'winter' ? WOLF_HUNT_RADIUS * 1.4 : WOLF_HUNT_RADIUS
    const villagerCandidate = nearestAlive(state.villagers, w.x, w.y, huntRadius)
    const sheepCandidate = nearestAlive(state.sheep, w.x, w.y, huntRadius, (s) => !s.captured)
    const horseCandidate = nearestAlive(state.horses, w.x, w.y, huntRadius, (h) => h.riderId === null)
    const dv = villagerCandidate ? distance(w.x, w.y, villagerCandidate.x, villagerCandidate.y) : Infinity
    const ds = sheepCandidate ? distance(w.x, w.y, sheepCandidate.x, sheepCandidate.y) : Infinity
    const dh = horseCandidate ? distance(w.x, w.y, horseCandidate.x, horseCandidate.y) : Infinity
    if (ds <= dv * 1.5 && ds <= dh && sheepCandidate) {
      targetSheep = sheepCandidate
      w.targetId = sheepCandidate.id
      w.targetKind = 'sheep'
    } else if (dh <= dv * 1.2 && horseCandidate) {
      targetHorse = horseCandidate
      w.targetId = horseCandidate.id
      w.targetKind = 'horse'
    } else if (villagerCandidate) {
      targetVillager = villagerCandidate
      w.targetId = villagerCandidate.id
      w.targetKind = 'villager'
    }
  }

  const target = targetVillager ?? targetSheep ?? targetHorse
  if (!target) {
    moveRandom(w, rng, state.grid, 2)
    return
  }
  if (distance(w.x, w.y, target.x, target.y) > WOLF_GIVE_UP_RADIUS) {
    w.targetId = null
    w.targetKind = null
    moveRandom(w, rng, state.grid, 2)
    return
  }

  if (distance(w.x, w.y, target.x, target.y) > 1.5) {
    moveToward(w, target.x, target.y, WOLF_SPEED, state.grid)
    return
  }

  if (targetVillager) {
    if (targetVillager.toolTier !== 'none') return
    const homeSheltered = targetVillager.hasHome && distance(targetVillager.x, targetVillager.y, targetVillager.homeX, targetVillager.homeY) <= SHELTER_RADIUS
    if (homeSheltered) return
    const village = targetVillager.villageId !== null ? state.villages.find((vg) => vg.id === targetVillager!.villageId) : undefined
    const insideWall =
      village !== undefined && village.wallTier !== 'none' && village.perimeter.length > 0 && distance(targetVillager.x, targetVillager.y, village.centerX, village.centerY) <= 45
    if (insideWall && village) {
      if (village.wallTier === 'stone') return
      village.wallHealth -= 1
      if (village.wallHealth <= 0) {
        for (const cell of village.perimeter) setTerrain(state.grid, cell.x, cell.y, GRASS)
        village.wallTier = 'none'
        village.wallHealth = 0
        logEvent(state, `Les loups ont enfoncé l'enceinte`)
      }
      return
    }
    targetVillager.health -= 1
    remember(targetVillager, { kind: 'dangerSpot', subjectId: null, x: w.x, y: w.y, tick: state.tick, weight: 1.2, emotion: -0.8 })
    if (targetVillager.health <= 0) {
      targetVillager.alive = false
      state.deaths += 1
      dropCarriedGold(state, targetVillager)
      logEvent(state, `${targetVillager.name} a été tué par un loup`)
      onDeath(state, targetVillager, null)
      w.targetId = null
      w.targetKind = null
      w.hunger = HUNGER_MAX
    }
    return
  }

  const prey = targetSheep ?? targetHorse
  if (prey) {
    prey.health -= 1
    if (prey.health <= 0) {
      prey.alive = false
      if (targetHorse && targetHorse.ownerId !== null) {
        const owner = state.villagers.find((o) => o.id === targetHorse!.ownerId)
        if (owner) {
          owner.horseId = null
          owner.mounted = false
          logEvent(state, `Un loup a tué le cheval de ${owner.name}`)
        }
      }
      w.targetId = null
      w.targetKind = null
      w.hunger = HUNGER_MAX
    }
  }
}

export function tickWolfReproduction(state: SimState) {
  if (state.season === 'winter') return
  let count = 0
  for (const w of state.wolves) if (w.alive) count++
  if (count >= MAX_WOLVES) return
  const ready = (w: Wolf) => w.alive && w.breedCooldown <= 0 && w.hunger >= 3

  for (const a of state.wolves) {
    if (!ready(a)) continue
    for (const b of state.wolves) {
      if (b.id === a.id || !ready(b)) continue
      if (distance(a.x, a.y, b.x, b.y) > 1.5) continue
      a.breedCooldown = WOLF_BREED_COOLDOWN
      b.breedCooldown = WOLF_BREED_COOLDOWN
      state.wolves.push({
        id: state.nextId++,
        x: a.x,
        y: a.y,
        health: ANIMAL_HEALTH_MAX,
        hunger: 2,
        starveTimer: 0,
        healTimer: 0,
        breedCooldown: WOLF_BREED_COOLDOWN,
        targetId: null,
        targetKind: null,
        alive: true,
      })
      return
    }
  }
}

export function tickCombat(state: SimState, rng: () => number) {
  for (const w of state.wolves) {
    if (!w.alive) continue
    let groupSize = 0
    for (const v of state.villagers) {
      if (v.alive && v.toolTier !== 'none' && distance(v.x, v.y, w.x, w.y) <= COMBAT_RADIUS) groupSize++
    }
    if (groupSize === 0) continue
    const preyId = w.targetKind === 'villager' ? w.targetId : null
    const hitChance = Math.min(0.92, BASE_HIT_CHANCE + GROUP_BONUS * (groupSize - 1))
    const dmgChance = Math.max(0.04, BASE_DAMAGE_CHANCE - GROUP_BONUS * (groupSize - 1))

    for (const attacker of state.villagers) {
      if (!w.alive) break
      if (!attacker.alive || attacker.toolTier === 'none') continue
      if (distance(attacker.x, attacker.y, w.x, w.y) > COMBAT_RADIUS) continue
      const toolBonus = attacker.toolTier === 'iron' ? IRON_TOOL_BONUS : attacker.toolTier === 'stone' ? STONE_TOOL_BONUS : 0
      const courageBonus = (attacker.personality.courage - 0.5) * 0.12
      const guardBonus = attacker.profession === 'guard' ? 0.1 : 0
      if (rng() < Math.min(0.95, hitChance + toolBonus + courageBonus + guardBonus)) {
        w.health -= 1
        if (w.health <= 0) {
          w.alive = false
          const prey = preyId !== null ? state.villagers.find((o) => o.id === preyId && o.alive && o.id !== attacker.id) : undefined
          if (prey) creditRescue(state, prey, attacker)
        }
      }
      if (rng() < Math.max(0.04, dmgChance - toolBonus - courageBonus - guardBonus)) {
        attacker.health -= 1
        if (attacker.health <= 0) {
          attacker.alive = false
          state.deaths += 1
          dropCarriedGold(state, attacker)
          logEvent(state, `${attacker.name} est tombé face à un loup`)
          onDeath(state, attacker, null)
        }
      }
    }
  }
}

export function tickTrade(state: SimState) {
  if (state.tick % 3 !== 0) return
  for (const a of state.villagers) {
    if (!a.alive || a.hunger > HUNGRY_THRESHOLD || edibleValue(a.inventory) > 0) continue
    for (const b of state.villagers) {
      if (!b.alive || b.id === a.id) continue
      if (distance(a.x, a.y, b.x, b.y) > 2.5) continue
      const rel = b.relations.get(a.id)
      if (rel && rel.affinity < -0.3) continue
      const keep = Math.max(1, Math.round(3 - b.personality.generosity * 2))
      const give: ResourceType | null = countOf(b.inventory, 'bread') > keep ? 'bread' : countOf(b.inventory, 'food') > keep ? 'food' : null
      if (!give) continue
      removeFromInventory(b.inventory, give, 1)
      addToInventory(a.inventory, give, 1)
      if (countOf(a.inventory, 'coin') > 0) {
        removeFromInventory(a.inventory, 'coin', 1)
        addToInventory(b.inventory, 'coin', 1)
      }
      break
    }
  }
}

export function tickRegrowth(state: SimState, rng: () => number) {
  if (state.season === 'winter') return
  const grid = state.grid
  const vigour = state.season === 'summer' ? 4 : 3
  for (let i = 0; i < vigour; i++) {
    const source = findRandomTile(grid, rng, TREE)
    if (source && resourceDensity(grid, source.x, source.y, 'tree', 3) >= SPREAD_NEIGHBOURS_NEEDED) {
      tryGrowAdjacent(grid, source.x, source.y, TREE, 12, rng)
    }
    const bushSource = findRandomTile(grid, rng, BUSH)
    if (bushSource && resourceDensity(grid, bushSource.x, bushSource.y, 'bush', 3) >= SPREAD_NEIGHBOURS_NEEDED) {
      tryGrowAdjacent(grid, bushSource.x, bushSource.y, BUSH, 8, rng)
    }
  }
  if (rng() < 0.7) {
    const dirt = findRandomTile(grid, rng, DIRT)
    if (dirt && getClaim(grid, dirt.x, dirt.y) === CLAIM_NONE && grid.traffic[dirt.y * grid.width + dirt.x] < 20) {
      setTerrain(grid, dirt.x, dirt.y, GRASS)
    }
  }
}

function findRandomTile(grid: WorldGrid, rng: () => number, terrain: number) {
  for (let attempt = 0; attempt < 12; attempt++) {
    const x = Math.floor(rng() * grid.width)
    const y = Math.floor(rng() * grid.height)
    if (getTerrain(grid, x, y) === terrain) return { x, y }
  }
  return null
}

function tryGrowAdjacent(grid: WorldGrid, x: number, y: number, terrain: number, amount: number, rng: () => number) {
  const nx = x + Math.floor(rng() * 3) - 1
  const ny = y + Math.floor(rng() * 3) - 1
  if (!inBounds(grid, nx, ny)) return
  if (getClaim(grid, nx, ny) !== CLAIM_NONE) return
  if (grid.traffic[ny * grid.width + nx] > 20) return
  if (isBuildableGround(grid, nx, ny) && getTerrain(grid, nx, ny) !== SAND) setTerrain(grid, nx, ny, terrain, amount)
}

export { tickHorse, tickHorseBreeding, tickVillageEconomy }
