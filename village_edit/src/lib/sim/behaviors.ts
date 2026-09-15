import {
  biomeSuitability,
  boatCurrentSpeedMul,
  coldStress01,
  cropTempFactor,
  fishingCurrentBonus,
  heatStress01,
  sampleBiome,
  sampleMoisture,
  sampleRain,
  sampleTempC,
} from './climate'
import { BiomeId, biomeColdBias, biomeGatherChanceScale, livelihoodMul } from './biomes'
import {
  designHouse,
  freshStyle,
  furnitureSlots,
  houseFootprint,
  pickShape,
  reinforceStyle,
  type HouseFootprint,
} from './architecture'
import {
  applyFurnitureBuilt,
  canAffordFurniture,
  eatSpot,
  FURNITURE_DEFS,
  furnitureLabelFr,
  hasHomeFurniture,
  homeDineMul,
  homeWarmthClo,
  homeWashCare,
  homeWeaveMul,
  householdSleepCapacity,
  markFurnitureDone,
  missingFurnitureResource,
  nextFurnitureJob,
  planFurnitureJobs,
  restSleepBonus,
  sleepSpot,
  spendFurnitureRecipe,
  storeSpot,
  woodCostOf,
  type FurnitureKind,
} from './furniture'
import {
  buildHouseLayout,
  describeLayoutFr,
  expandRoomKinds,
  findRoomAt,
  findRoomByKind,
  ROOM_LABEL_FR,
  roomCountToSpan,
  type HouseLayout,
} from './rooms'
import { getSimConfig } from './simConfig'
import {
  applyConstructionStep,
  findProject,
  nextConstructionStep,
  nextWallTarget,
  pickProjectForVillager,
  projectTaskUrge,
} from './construction'
import { computePerimeter, occupiedTiles } from './defence'
import { conductTrade, findTradeOpportunity, portEligible, priceOf, targetPerCapita, tickVillageEconomy, TRADE_COOLDOWN, villageBirthBias } from './commerce'
import { nearbyVillagers } from './kernels'
import { HORSE_CARRY_BONUS, tickHorse, tickHorseBreeding, tryTame } from './horses'
import {
  addToInventory,
  bestEdibleIn,
  carriedMass,
  carryCapacityOf,
  countOf,
  createInventory,
  edibleValue,
  freeSlotSpace,
  inventoryNearlyFull,
  ITEM_MASS,
  removeFromInventory,
  STOREABLE_RESOURCES,
  transferAll,
  NUTRITION,
  type ResourceType,
} from './inventory'
import {
  CRAFT_RECIPES,
  cropDef,
  EDIBLE_PRIORITY,
  isEdible,
  MILL_GRAINS,
  pickCropId,
  recipeCraftable,
  rollGatherExtras,
  spendRecipeInputs,
} from './resources'
import {
  craftAndEquipGear,
  createEmptyEquipment,
  equipmentEffectsOf,
  equipFromToolTier,
  GEAR_DEFS,
  pickGearCraftTarget,
  tryEquipFromClothingCraft,
} from './equipment'
import {
  bodyMassKgFromPhenotype,
  boatCargoCapacityKg,
  clothingClo,
  heightMetersFromPhenotype,
  hungerDrainFromBmr,
  hungerRestoreFromFood,
  staminaCostForStep,
  thermalBurnMultiplier,
  tilesPerTickFromMps,
  walkSpeedMps,
} from './physicsScale'
import {
  creditRescue,
  doConfront,
  doCounsel,
  doEntertain,
  doGiveFood,
  doSocialise,
  doSteal,
  doTeachCraft,
  onDeath,
  onWolfKill,
  SOCIAL_RANGE,
  tickSocialUpkeep,
} from './interactions'
import {
  canPracticeCraft,
  ironToolCostFor,
  livelihoodTaskBonus,
  noteActivityPractice,
  serviceUrge,
  tickLivelihood,
} from './livelihood'
import {
  gatherPressurePenalty,
} from './ecology'
import {
  applyGeneticPersonalityBias,
  birthGenetics,
  diseasePressure,
  fertilityModifier,
  kinshipCoefficient,
  physicalAptitudeModifiers,
} from './genetics'
import { TICKS_PER_YEAR } from './calendar'
import { seedEthnosFromParents, cultureSimilarity, ensureCultureState, ethnosSocialBias, homophilyBias } from './ethnos'
import { fullNameOf, registerBirth } from './family'
import { bondedPartner, isMarriageAge, pedigreeLookup } from './marriage'
import { generateName, inheritPersonality } from './personality'
import { chebyshev, LAND_PROFILE, landWalkable, findLaneBlocker, layCorridor, navigate, nudgeToward, seedTradeCorridor, type PathProfile } from './pathfinding'
import { bestCrossing, isWornRoad, markTraffic, nearestPaveable, stampPlaza, tryPave } from './roads'
import { isShore, type ResourceKind } from './resourceIndex'
import {
  depositSpoil,
  digGoldYield,
  digHpPerHit,
  digIronYield,
  digStaminaCost,
  digStoneYield,
  DIG_HITS_PER_SESSION,
  DIG_TILES_PER_SESSION,
  ensureMountainDigHp,
  finalizeTunnelCell,
  findMineEntranceSite,
  nextCorridorTip,
  pickDigTarget,
} from './mining'
import {
  applyExperiment,
  experimentUrge,
  inheritKnowledge,
  knowsBlastMining,
  knowsTemperIron,
  noteMiningInsight,
  techCombatBonus,
} from './technology'
import {
  cautionFactor,
  dangerSpotsForPath,
  inheritLaborPreferences,
  isChild,
  mindOf,
  nearestTacticalThreat,
  noteChosenAction,
  noteMasterworkCraft,
  noteWolfDanger,
  onCognitiveEvent,
  pickSafetyTarget,
  pickTaskByPolicy,
  professionSkillPrefScore,
  recordTaskOutcome,
  replanAfterFailure,
  restoreInterruptedTask,
  rollCraftQuality,
  seedCultureFromParents,
  senseResource,
  shouldDeepThink,
  shouldEngageThreat,
  skillBonus,
  skillSpeedBonus,
  skillYieldBonus,
  spotMemoryBias,
  stashInterruptedTask,
  tickCognition,
} from './cognition'
import { isGatheringHour, logEvent, lonelinessPressure, pickAmbition, relationWith, remember } from './social'
import {
  activeNormsFor,
  circlesOf,
  lifeRoleOf,
  logCause,
  onPoliticalFamine,
  onPoliticalTradeWindfall,
  onPoliticalWolfAttack,
  politicsOf,
  professionLockInBonus,
  villageCohesion,
} from './politics'
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
  PATH,
  PLANK,
  PORT,
  ROAD,
  SAND,
  STONE,
  TABLE,
  TRAIL,
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
import { TICKS_PER_DAY, TICKS_PER_SEASON } from './calendar'
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
  findOpenWater,
  getClaim,
  getTerrain,
  inBounds,
  isBlockingWall,
  isBuildableGround,
  isNight,
  isWoodPile,
  needsClearing,
  resourceDensity,
  setClaim,
  setTerrain,
  singleDoorWallCells,
  stampPort,
  adjacentWater,
  touchesWater,
  type WorldGrid,
} from './world'

const HUNGER_MAX = 4
/** Aligné sur `HUNGER_DECAY_PLAY` (physicsScale) : ~3 jours-sim plein→vide. */
const HUNGER_DECAY = 4 / (TICKS_PER_DAY * 3)
/** ~2 sim-days after hunger hits 0 before death. */
const STARVE_DEATH_TICKS = Math.round(TICKS_PER_DAY * 2)
const HEAL_TICKS = 120
const HEAL_HUNGER_THRESHOLD = 3
const VILLAGER_HEALTH_MAX = 4
const ANIMAL_HEALTH_MAX = 2
const HUNGRY_THRESHOLD = 2
const FOOD_TARGET = 4
const WINTER_STOCK_TARGET = 10

/** Embodied endurance — depleted by travel/labor, restored by rest/shelter. */
export const STAMINA_MAX = 4
const STAMINA_LABOR = 0.09
const STAMINA_FIGHT = 0.07
const STAMINA_REST_HOME = 0.085
const STAMINA_REST_BED = 0.12
const STAMINA_IDLE = 0.025
const STAMINA_EXHAUSTED = 1.0
const STAMINA_TIRED = 2.0

const TOOL_WEAR_MAX = 28

const SPEAR_WOOD_COST = 3
const STONE_SPEAR_COST = 3
const IRON_TOOL_COST = 4
const WORKBENCH_COST = 4
const CHEST_COST = 5
const BED_COST = 3
const TABLE_COST = 4
const TILE_COST = 1
const WALL_SEGMENT_COST = 1
const BRIDGE_COST = 2
const MILL_WOOD_COST = 6
const MILL_STONE_COST = 4
const CART_WOOD_COST = 5
const CART_STONE_COST = 2
/** Early skiff — low so docked homes can launch under survival wood pressure (~1–2 pack wood). */
const BOAT_FISH_WOOD_COST = 2
const BOAT_CARGO_WOOD_COST = 4
const BOAT_CARGO_STONE_COST = 2
const PORT_WOOD_COST = 6
const PORT_STONE_COST = 4
const WHEAT_PER_FLOUR = 2
const BREAD_PER_FLOUR = 2
const WOOL_PER_CLOTH = 3
const CLOTH_PER_CLOTHING = 2
const WOOL_YIELD_COOLDOWN = 260
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
const MAX_POPULATION_DEFAULT = 250

function maxPopulationCap(): number {
  return getSimConfig().maxPopulation || MAX_POPULATION_DEFAULT
}
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

const WOLF_HUNT_RADIUS = 16
const WOLF_GIVE_UP_RADIUS = 20
const FLEE_RADIUS = 15
const DANGER_RADIUS = 100
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
 * search, so it can afford to look further than the short resource radar — but not so far the herder
 * abandons their pen and chest on a days-long chase; 260 caused exactly that. */
const SHEEP_HUNT_RADIUS = 110
const SOCIAL_STAGGER = 8
const THINK_COOLDOWN = 3
const FISH_RADIUS = 18
const OPEN_WATER_RADIUS = 22
const MEMORY_SPOT_RADIUS = 12
const MEMORY_SPOT_WEIGHT = 22
const PROFESSION_REVIEW = TICKS_PER_SEASON * 2
/** Local perceive before blind search (non-omniscient radar). */
const LOCAL_SENSE_R = 24
const SHORT_BLIND_R = 38

function noteMilestone(state: SimState, key: keyof SimState['milestones'], text: string) {
  if (state.milestones[key]) return
  state.milestones[key] = true
  logEvent(state, text)
}

function berriesRipeIn(season: Season, tempC = 12): boolean {
  if (tempC < 3) return false
  return season !== 'winter' || tempC > 9
}
function sowingSeason(season: Season, tempC = 12): boolean {
  if (cropTempFactor(tempC) < 0.35) return false
  return season === 'spring' || season === 'summer' || (season === 'autumn' && tempC > 14)
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

function tickNeeds(entity: Needs, healthMax: number, decayPerTick: number): boolean {
  entity.hunger = entity.hunger - decayPerTick
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

function animalHungerDecay(season: Season): number {
  return season === 'winter' ? HUNGER_DECAY * 1.25 : HUNGER_DECAY
}

/** Drain faim villageois : BMR Harris–Benedict soft × MET activité × thermique. */
function villagerHungerDrain(state: SimState, v: Villager): number {
  const massKg = bodyMassKgFromPhenotype(v.phenotype)
  const heightM = heightMetersFromPhenotype(v.phenotype)
  let activityMet = 1.05
  if (v.task) {
    const k = v.task.kind
    if (
      k === 'gatherWood' ||
      k === 'gatherStone' ||
      k === 'gatherIron' ||
      k === 'mineTunnel' ||
      k === 'mineGold' ||
      k === 'clearLand' ||
      k.startsWith('build') ||
      k.startsWith('craft')
    ) {
      activityMet = 3.2
    } else if (k === 'flee' || k === 'fight') {
      activityMet = 4.5
    } else if (k === 'rest' || k === 'eat') {
      activityMet = 0.95
    } else {
      activityMet = 1.55
    }
  } else if (atHomeShelter(v)) {
    activityMet = 1.0
  }
  return hungerDrainFromBmr({
    massKg,
    heightM,
    ageTicks: v.age,
    metabolism01: v.phenotype.metabolism,
    activityMet,
    warmthMul: warmthMultiplier(v, state),
  })
}

function atHomeShelter(v: Villager): boolean {
  return v.hasHome && distance(v.x, v.y, v.homeX, v.homeY) <= SHELTER_RADIUS
}

/** Clothing/leather + hearth vs local air temperature (°C) — clo × surface corporelle. */
function warmthMultiplier(v: Villager, state: SimState): number {
  const temp = sampleTempC(state.climate, v.x, v.y)
  const biomeCold = biomeColdBias(sampleBiome(state.climate, v.x, v.y))
  // Only layer biome chill when air is already cool — otherwise temperate forests
  // with residual coldBias burn calories like tundra at 20 °C.
  const airCold = coldStress01(temp)
  const cold = Math.min(1, airCold + (atHomeShelter(v) || airCold < 0.08 ? 0 : biomeCold * 0.55))
  const heat = heatStress01(temp)
  const rain = !atHomeShelter(v) ? sampleRain(state.climate, v.x, v.y) : 0
  const massKg = bodyMassKgFromPhenotype(v.phenotype)
  const heightM = heightMetersFromPhenotype(v.phenotype)
  const gear = equipmentEffectsOf(v)
  let homeClo = 0
  if (atHomeShelter(v)) {
    const head =
      v.homeOwnerId === v.id
        ? v
        : v.homeOwnerId !== null
          ? state.villagers.find((o) => o.id === v.homeOwnerId && o.alive)
          : v
    if (head) homeClo = homeWarmthClo(head)
  }
  return thermalBurnMultiplier({
    cold01: cold,
    heat01: heat,
    rain01: rain,
    night: isNight(state.tick),
    sheltered: atHomeShelter(v),
    clo: clothingClo(countOf(v.inventory, 'leather') > 0, countOf(v.inventory, 'clothing') > 0, gear.clo) + homeClo,
    massKg,
    heightM,
  })
}

function carryCapacity(v: Villager): number {
  return (
    carryCapacityOf({
      hasCart: v.hasCart,
      mounted: v.mounted,
      horseBonus: HORSE_CARRY_BONUS,
      bodyMassKg: bodyMassKgFromPhenotype(v.phenotype),
      strength01: v.phenotype.strengthBias,
    }) + equipmentEffectsOf(v).carryKg
  )
}

function encumbranceRatio(v: Villager): number {
  return carriedMass(v.inventory) / Math.max(1, carryCapacity(v))
}

/** True if adding `amount` of `type` would exceed mass capacity (slots may still have room). */
function canLift(v: Villager, type: ResourceType, amount: number, state?: SimState): boolean {
  if (amount <= 0) return true
  if (freeSlotSpace(v.inventory, type) <= 0) return false
  const next = carriedMass(v.inventory) + ITEM_MASS[type] * amount
  let cap = carryCapacity(v)
  // Embarqué : limite aussi par déplacement / cale du bateau.
  if (state && v.embarked && v.boatId != null) {
    const boat = boatOf(state, v)
    if (boat) {
      const hold = boatCargoCapacityKg(boat.kind)
      cap = Math.min(cap, hold)
    }
  }
  return next <= cap + 0.05
}

function spendStamina(v: Villager, amount: number) {
  const next = v.stamina - amount
  v.stamina = Number.isFinite(next) ? Math.max(0, next) : 0
}

function recoverStamina(v: Villager, amount: number) {
  const next = v.stamina + amount
  v.stamina = Number.isFinite(next) ? Math.min(STAMINA_MAX, next) : STAMINA_MAX
}

function wearTool(v: Villager, hits = 1) {
  if (v.toolTier === 'none') return
  v.toolWear += hits
  if (v.toolWear < TOOL_WEAR_MAX) return
  v.toolWear = 0
  if (v.toolTier === 'iron') v.toolTier = 'stone'
  else if (v.toolTier === 'stone') v.toolTier = 'wood'
  else v.toolTier = 'none'
}

/** Chance to finish one labor tick (chop/mine/craft). Bare hands struggle; tools matter. */
function laborSuccessChance(v: Villager, kind: TaskKind): number {
  let base = 0.28
  if (kind === 'gatherWood' || kind === 'clearLand') {
    if (v.toolTier === 'none') base = 0.18
    else if (v.toolTier === 'wood') base = 0.4
    else if (v.toolTier === 'stone') base = 0.58
    else base = 0.78
    if (v.profession === 'lumberjack') base += 0.12
  } else if (kind === 'gatherStone' || kind === 'gatherIron' || kind === 'mineTunnel' || kind === 'mineGold') {
    if (v.toolTier === 'none') base = 0.08
    else if (v.toolTier === 'wood') base = 0.22
    else if (v.toolTier === 'stone') base = 0.48
    else base = 0.72
    if (v.profession === 'miner' || v.profession === 'mason') base += 0.1
  } else if (kind === 'buildHouse' || kind === 'buildWall' || kind === 'buildBridge' || kind === 'buildPen' || kind === 'buildProject') {
    base = v.toolTier === 'none' ? 0.45 : v.toolTier === 'wood' ? 0.62 : v.toolTier === 'stone' ? 0.75 : 0.88
    if (v.profession === 'builder') base += 0.1
  } else if (
    kind === 'buildWorkbench' ||
    kind === 'buildChest' ||
    kind === 'buildBed' ||
    kind === 'buildTable' ||
    kind === 'buildCart' ||
    kind === 'buildBoat' ||
    kind === 'craftSpear' ||
    kind === 'craftStoneSpear' ||
    kind === 'craftIronTool' ||
    kind === 'makeCharcoal' ||
    kind === 'craftGoods' ||
    kind === 'craftGear'
  ) {
    base = 0.35 + (v.toolTier === 'none' ? 0 : v.toolTier === 'wood' ? 0.15 : v.toolTier === 'stone' ? 0.25 : 0.35)
  }
  if (v.stamina < STAMINA_EXHAUSTED) base *= 0.45
  else if (v.stamina < STAMINA_TIRED) base *= 0.72
  if (v.hunger < 1) base *= 0.75
  base *= skillBonus(mindOf(v).skills, kind)
  // Gants / outils équipés accélèrent le labeur (travail, pas combat).
  const gearWork = equipmentEffectsOf(v).work
  if (gearWork !== 0 && (kind.startsWith('gather') || kind.startsWith('craft') || kind.startsWith('build') || kind === 'mineTunnel' || kind === 'clearLand')) {
    base *= 1 + gearWork
  }
  const apt = physicalAptitudeModifiers(v.phenotype)
  if (kind === 'gatherWood' || kind === 'clearLand' || kind === 'mineTunnel' || kind.startsWith('build')) {
    base *= 0.92 + apt.strength * 0.1
  } else if (kind === 'fish' || kind === 'craftIronTool' || kind === 'craftSpear') {
    base *= 0.92 + apt.agility * 0.1
  } else {
    base *= 0.94 + apt.endurance * 0.08
  }
  return clamp(base, 0.05, 0.95)
}

function laborWorkNeeded(kind: TaskKind): number {
  if (kind === 'buildWorkbench' || kind === 'buildChest' || kind === 'buildBed' || kind === 'buildTable') return 2.2
  if (kind === 'buildCart' || kind === 'buildBoat') return 3.5
  if (kind === 'craftSpear' || kind === 'craftStoneSpear') return 1.6
  if (kind === 'craftIronTool' || kind === 'craftGear') return 2.8
  if (kind === 'makeCharcoal') return 2.0
  if (kind === 'craftGoods') return 2.2
  if (kind === 'experiment') return 2.4
  if (kind === 'buildPort' || kind === 'buildMill') return 4
  return 1
}

function dropCarriedGold(state: SimState, v: Villager) {
  const carried = countOf(v.inventory, 'gold')
  if (carried > 0 && isBuildableGround(state.grid, v.x, v.y)) setTerrain(state.grid, v.x, v.y, LOOT, carried)
}

function homeFootprint(v: Villager): HouseFootprint | null {
  if (!v.house || v.homeX < 0) return null
  return houseFootprint(v.house, v.homeX, v.homeY)
}

function ensureHomeLayout(v: Villager): HouseLayout | null {
  if (!v.house || v.homeX < 0) return null
  if (v.homeLayout && v.homeLayout.rooms.length > 0) return v.homeLayout
  const fp = homeFootprint(v)
  if (!fp) return null
  v.homeLayout = buildHouseLayout(v.house, fp)
  return v.homeLayout
}

function seedFurnitureQueue(v: Villager, layout: HouseLayout) {
  if (v.furnitureQueue.length > 0) return
  v.furnitureQueue = planFurnitureJobs(layout, {
    beds: v.house?.bedSlots ?? 1,
    wantWorkshop: !!v.house?.hasWorkshop || layout.rooms.some((r) => r.kind === 'atelier'),
    wantStore: !!v.house?.hasStoreroom || layout.rooms.some((r) => r.kind === 'reserve'),
    household: Math.max(1, v.house?.bedSlots ?? 1),
  })
}

function taskForFurniture(kind: FurnitureKind): TaskKind {
  return FURNITURE_DEFS[kind].buildTask
}

function woodNeededForFurniture(kind: FurnitureKind): number {
  if (kind === 'bed') return BED_COST
  if (kind === 'chest' || kind === 'cupboard' || kind === 'shelf' || kind === 'tub') return CHEST_COST
  if (kind === 'workbench' || kind === 'loom' || kind === 'hearth') return WORKBENCH_COST
  if (kind === 'table' || kind === 'bench' || kind === 'stool') return TABLE_COST
  return woodCostOf(kind)
}

function householdSize(state: SimState, owner: Villager): number {
  let n = 1
  for (const o of state.villagers) {
    if (!o.alive || o.id === owner.id) continue
    if (o.homeOwnerId === owner.id) n++
    else if (o.parentIds.includes(owner.id) || owner.parentIds.includes(o.id)) n++
  }
  return n
}

/** Expand rooms when wealth / family outgrow the current plan. */
function maybeExpandHome(state: SimState, v: Villager, rng: () => number): boolean {
  if (!v.hasHome || v.homeOwnerId !== v.id || !v.house) return false
  const wealth = countOf(v.inventory, 'coin') + (v.chestInventory ? countOf(v.chestInventory, 'coin') : 0)
  const hh = householdSize(state, v)
  const current = v.house.roomKinds ?? []
  const expanded = expandRoomKinds(current, {
    household: hh,
    wealth,
    artisan: v.profession === 'mason' || v.profession === 'builder' || v.profession === 'blacksmith' || v.house.hasWorkshop,
  })
  if (!expanded) return false
  // Only expand occasionally to avoid thrash.
  if (rng() > 0.35 && wealth < 12 && hh <= (v.house.bedSlots ?? 1)) return false

  const sized = roomCountToSpan(expanded.length, v.house.rx, v.house.ry)
  const grew = sized.rx > v.house.rx || sized.ry > v.house.ry
  v.house = {
    ...v.house,
    roomKinds: expanded,
    rx: sized.rx,
    ry: sized.ry,
    bedSlots: Math.max(v.house.bedSlots, expanded.filter((k) => k === 'chambre').length),
    hasWorkshop: v.house.hasWorkshop || expanded.includes('atelier'),
    hasStoreroom: v.house.hasStoreroom || expanded.includes('reserve'),
  }
  const fp = houseFootprint(v.house, v.homeX, v.homeY)
  claimCells(state.grid, fp.walls, CLAIM_HOUSE)
  claimCells(state.grid, fp.interior, CLAIM_HOUSE)
  claimCells(state.grid, fp.open, CLAIM_HOUSE)
  v.homeLayout = buildHouseLayout(v.house, fp)
  // Append new furniture jobs for rooms that lack them.
  const fresh = planFurnitureJobs(v.homeLayout, {
    beds: v.house.bedSlots,
    wantWorkshop: v.house.hasWorkshop,
    wantStore: v.house.hasStoreroom,
    household: hh,
  })
  const existingKeys = new Set(v.furnitureQueue.map((j) => `${j.kind}@${j.roomKind}`))
  for (const j of fresh) {
    if (!existingKeys.has(`${j.kind}@${j.roomKind}`)) v.furnitureQueue.push(j)
  }
  const roomsFr = expanded.map((k) => ROOM_LABEL_FR[k]).join(', ')
  logEvent(
    state,
    grew
      ? `${v.name} agrandit sa demeure (${roomsFr})`
      : `${v.name} aménage de nouvelles pièces : ${roomsFr}`,
  )
  return true
}

function moveToward(v: { x: number; y: number }, tx: number, ty: number, speed: number, grid: WorldGrid, wear = 0): boolean {
  return nudgeToward(grid, v, tx, ty, speed, LAND_PROFILE, wear)
}

function boatOf(state: SimState, v: Villager) {
  if (v.boatId === null) return undefined
  const id = v.boatId
  for (let i = 0; i < state.boats.length; i++) {
    const b = state.boats[i]
    if (b.id === id && b.alive) return b
  }
  return undefined
}

function dockBesideBoat(grid: WorldGrid, boat: { x: number; y: number }): { x: number; y: number } {
  if (landWalkable(getTerrain(grid, boat.x, boat.y))) return { x: boat.x, y: boat.y }
  const dirs = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
    [1, 1],
    [1, -1],
    [-1, 1],
    [-1, -1],
  ] as const
  for (const [dx, dy] of dirs) {
    const x = boat.x + dx
    const y = boat.y + dy
    if (inBounds(grid, x, y) && landWalkable(getTerrain(grid, x, y))) return { x, y }
  }
  return { x: boat.x, y: boat.y }
}

/**
 * Board a boat that is either already afloat or docked on a port/shore tile.
 * Docked boats must launch into adjacent water — otherwise villagers freeze beside the hull.
 */
function tryEmbarkBoat(
  state: SimState,
  v: Villager,
  boat: { x: number; y: number; alive: boolean },
): boolean {
  if (v.embarked || !boat.alive) return false
  if (chebyshev(v.x, v.y, boat.x, boat.y) > 1) return false
  const grid = state.grid
  const boatT = getTerrain(grid, boat.x, boat.y)
  const fromX = v.x
  const fromY = v.y
  if (boatT === WATER) {
    v.x = boat.x
    v.y = boat.y
    onVillagerStep(state, v, boat.x, boat.y, fromX, fromY)
    return v.embarked
  }
  const water = adjacentWater(grid, boat.x, boat.y)
  if (!water) return false
  boat.x = water.x
  boat.y = water.y
  v.x = water.x
  v.y = water.y
  onVillagerStep(state, v, water.x, water.y, fromX, fromY)
  return v.embarked
}

function pathProfileFor(state: SimState, v: Villager, task: { kind: TaskKind; targetId: number | null }): PathProfile {
  const boat = boatOf(state, v)
  const cargo = boat?.kind === 'cargo'
  const onWater = getTerrain(state.grid, v.x, v.y) === WATER
  let destHasPort = false
  if (task.kind === 'tradeRun' && task.targetId !== null && task.targetId >= 0) {
    const dest = state.villages.find((vg) => vg.id === task.targetId)
    destHasPort = !!dest?.hasPort
  }
  const homeHasPort = v.villageId !== null && state.villages.some((vg) => vg.id === v.villageId && vg.hasPort)
  const returning = task.kind === 'tradeRun' && task.targetId === -1
  const useBoat =
    !!boat &&
    !v.hasCart &&
    (v.embarked ||
      onWater ||
      task.kind === 'fish' ||
      (task.kind === 'tradeRun' && !!cargo && (destHasPort || homeHasPort || returning)))
  const mind = mindOf(v)
  const fleeing = task.kind === 'flee' || task.kind === 'fight'
  return {
    amphibious: onWater || useBoat,
    // Returning traders may beach without a home port rather than strand offshore.
    cargo: !!cargo && !returning,
    cart: v.hasCart,
    boatX: boat ? boat.x : -1,
    boatY: boat ? boat.y : -1,
    // Path around remembered wolf tiles; courage / age modulate (budgets unchanged).
    dangerSpots: fleeing && v.personality.courage > 0.75 && !isChild(v) ? undefined : dangerSpotsForPath(mind, v.memories, 6),
    dangerCourage: v.personality.courage * (isChild(v) ? 0.55 : 1),
  }
}

function travelSpeedFor(state: SimState, v: Villager): number {
  const t = getTerrain(state.grid, v.x, v.y)
  const boat = v.embarked ? boatOf(state, v) : undefined
  let currentMul = 1
  if (v.embarked && v.task) {
    currentMul = boatCurrentSpeedMul(state.climate, v.x, v.y, v.task.targetX, v.task.targetY)
  }
  const air = sampleTempC(state.climate, v.x, v.y)
  const mps = walkSpeedMps({
    embarked: v.embarked,
    boatKind: boat?.kind,
    currentMul,
    hasCart: v.hasCart,
    mounted: v.mounted,
    terrain: t,
    loadRatio: encumbranceRatio(v),
    stamina01: v.stamina / STAMINA_MAX,
    night: isNight(state.tick),
    cold01: coldStress01(air),
    heat01: heatStress01(air),
    storm: state.climate.weather === 'storm',
    sheltered: atHomeShelter(v),
    endurance01: v.phenotype.enduranceBias,
  })
  return tilesPerTickFromMps(mps)
}

function wearFor(v: Villager, kind: TaskKind): number {
  if (kind === 'tradeRun') return v.hasCart || v.mounted ? 8 : 5
  if (v.hasCart) return 6
  if (v.mounted) return 4
  return 2
}

function chopYield(v: Villager): number {
  let n = 1
  if (v.toolTier === 'wood') n = 1
  else if (v.toolTier === 'stone') n = 2
  else if (v.toolTier === 'iron') n = 3
  else n = 1
  if (v.toolTier === 'none') n = 1
  if (v.profession === 'lumberjack') n += 1
  // Cart helps haul, not fell trees faster.
  return n
}

function woodCap(v: Villager): number {
  const massLeft = Math.max(0, carryCapacity(v) - carriedMass(v.inventory))
  const byMass = Math.floor(massLeft / ITEM_MASS.wood)
  // Soft count caps — kg capacity already limits; keep haul batches playable.
  const soft = v.hasCart && v.mounted ? 14 : v.hasCart || v.mounted ? 9 : 5
  return Math.max(0, Math.min(soft, byMass))
}

/** Pack + household chest — communal timber for boats without a village store. */
function householdStock(v: Villager, type: ResourceType): number {
  return countOf(v.inventory, type) + (v.chestInventory ? countOf(v.chestInventory, type) : 0)
}

function consumeHousehold(v: Villager, type: ResourceType, amount: number): boolean {
  if (amount <= 0) return true
  if (householdStock(v, type) < amount) return false
  const fromInv = Math.min(amount, countOf(v.inventory, type))
  if (fromInv > 0) removeFromInventory(v.inventory, type, fromInv)
  const rest = amount - fromInv
  if (rest > 0 && v.chestInventory) removeFromInventory(v.chestInventory, type, rest)
  return true
}

/**
 * Pull a resource off a tile into inventory. Leftover that does not fit stays on the tile —
 * never converted away with amount 0 while discarding material.
 */
function takeFromTile(
  grid: WorldGrid,
  x: number,
  y: number,
  v: Villager,
  resource: ResourceType,
  yieldAmt: number,
  keepTerrain: number,
  emptyTerrain: number,
  state?: SimState,
): { gained: number; remaining: number } {
  const i = y * grid.width + x
  const available = grid.amount[i]
  if (available <= 0) {
    setTerrain(grid, x, y, emptyTerrain, 0)
    return { gained: 0, remaining: 0 }
  }
  let potential = Math.min(yieldAmt, available)
  // Encumbrance: only pick up what the body/cart can still carry — leftover stays on the tile.
  while (potential > 0 && !canLift(v, resource, potential, state)) potential -= 1
  if (potential <= 0) return { gained: 0, remaining: available }
  const leftover = addToInventory(v.inventory, resource, potential)
  const gained = potential - leftover
  const remaining = available - gained
  if (remaining <= 0) setTerrain(grid, x, y, emptyTerrain, 0)
  else setTerrain(grid, x, y, keepTerrain, remaining)
  return { gained, remaining }
}

function packTrailIfConnected(grid: WorldGrid, x: number, y: number) {
  if (!isBuildableGround(grid, x, y)) return
  let worn = 0
  for (const [dx, dy] of [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ] as const) {
    const nx = x + dx
    const ny = y + dy
    if (inBounds(grid, nx, ny) && isWornRoad(getTerrain(grid, nx, ny))) worn++
  }
  markTraffic(grid, x, y, 8)
  if (worn >= 1) tryPave(grid, x, y, 0)
}

/** Move leftover wood off a plot/lane cell onto a neighbour so construction can proceed — never delete it. */
function relocateWoodPile(grid: WorldGrid, fromX: number, fromY: number, amount: number): number {
  if (amount <= 0) return 0
  const dirs = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
    [1, 1],
    [1, -1],
    [-1, 1],
    [-1, -1],
  ] as const
  for (const [dx, dy] of dirs) {
    const x = fromX + dx
    const y = fromY + dy
    if (!inBounds(grid, x, y)) continue
    const t = getTerrain(grid, x, y)
    if (t === TREE || t === BUSH || t === WATER || t === HOUSE || t === FENCE || t === WALL_WOOD || t === WALL_STONE) continue
    if (t === GRASS || t === DIRT || t === SAND || t === TRAIL || isWoodPile(grid, x, y)) {
      const cur = isWoodPile(grid, x, y) ? grid.amount[y * grid.width + x] : 0
      setTerrain(grid, x, y, DIRT, cur + amount)
      return 0
    }
  }
  return amount
}

function firstPlotVegetation(grid: WorldGrid, fp: HouseFootprint): { x: number; y: number } | null {
  for (const c of [...fp.walls, ...fp.interior, ...fp.open, fp.door]) {
    if (needsClearing(grid, c.x, c.y)) return c
  }
  return null
}

function stampHouseFloors(grid: WorldGrid, fp: HouseFootprint) {
  for (const c of fp.interior) {
    if (!inBounds(grid, c.x, c.y)) continue
    const t = getTerrain(grid, c.x, c.y)
    if (t === BED || t === CHEST || t === WORKBENCH || t === TABLE || t === HOUSE || t === WALL_WOOD || t === WALL_STONE) continue
    setTerrain(grid, c.x, c.y, PLANK)
  }
  for (const c of fp.open) {
    if (!inBounds(grid, c.x, c.y)) continue
    const t = getTerrain(grid, c.x, c.y)
    if (t === BED || t === CHEST || t === WORKBENCH || t === TABLE || t === HOUSE || t === WALL_WOOD || t === WALL_STONE) continue
    setTerrain(grid, c.x, c.y, DIRT)
  }
}

function alreadyClearing(state: SimState, x: number, y: number, selfId: number): boolean {
  for (const o of state.villagers) {
    if (!o.alive || o.id === selfId || !o.task) continue
    if (o.task.kind === 'clearLand' && o.task.targetX === x && o.task.targetY === y) return true
  }
  return false
}

function linkToHub(grid: WorldGrid, fromX: number, fromY: number, toX: number, toY: number, grade: 0 | 1 | 2) {
  const start = nearestPaveable(grid, fromX, fromY, 3) ?? { x: fromX, y: fromY }
  const end = nearestPaveable(grid, toX, toY, 3) ?? { x: toX, y: toY }
  layCorridor(grid, start.x, start.y, end.x, end.y, grade === 0 ? 22 : 48, grade)
}

function onVillagerStep(state: SimState, v: Villager, nx: number, ny: number, fromX: number, fromY: number) {
  const fromWater = getTerrain(state.grid, fromX, fromY) === WATER
  const toT = getTerrain(state.grid, nx, ny)
  const toWater = toT === WATER
  const boat = boatOf(state, v)
  if (fromWater && !toWater) {
    v.embarked = false
    if (boat) {
      if (toT === PORT) {
        boat.x = nx
        boat.y = ny
      } else {
        boat.x = fromX
        boat.y = fromY
      }
    }
  } else if (!fromWater && toWater) {
    v.embarked = true
    noteMilestone(state, 'firstBoatVoyage', `${v.name} prend la mer`)
    if (v.mounted) {
      v.mounted = false
      if (v.horseId !== null) {
        const hid = v.horseId
        for (let i = 0; i < state.horses.length; i++) {
          const h = state.horses[i]
          if (h.id === hid) {
            h.riderId = null
            break
          }
        }
      }
    }
    if (boat) {
      boat.x = nx
      boat.y = ny
    }
  } else if (v.embarked && boat) {
    boat.x = nx
    boat.y = ny
  }
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
  v.task = {
    kind,
    targetX,
    targetY,
    targetId,
    resource,
    stuckTicks: 0,
    ageTicks: 0,
    work: 0,
    path: null,
    pathI: 0,
    pathTx: targetX,
    pathTy: targetY,
    pathTick: -999,
  }
}

/** Force eat / night bed / storm shelter when task is null. */
function forceBiologicalRhythm(state: SimState, v: Villager): boolean {
  if (v.hunger < 2.85 && bestEdible(v)) {
    setTask(v, 'eat', v.x, v.y)
    noteChosenAction(v, 'eat', 'faim — rythme forcé')
    return true
  }
  if (v.hunger < 1.6 && v.hasChest && v.chestInventory && edibleValue(v.chestInventory) > 0) {
    setTask(v, 'takeFromChest', v.chestX, v.chestY)
    noteChosenAction(v, 'takeFromChest', 'faim — coffre forcé')
    return true
  }
  const night = isNight(state.tick)
  const rain = sampleRain(state.climate, v.x, v.y)
  const stormy = state.climate.weather === 'storm' || rain > 0.5
  const cold = coldStress01(sampleTempC(state.climate, v.x, v.y))
  const exhausted = v.stamina < STAMINA_EXHAUSTED
  const tired = v.stamina < STAMINA_TIRED
  if (v.hasHome && (night || exhausted || (stormy && !atHomeShelter(v)) || (cold > 0.4 && !atHomeShelter(v)))) {
    const bed = sleepSpot(v.furnitureQueue, v.homeLayout)
    setTask(v, 'rest', bed?.x ?? v.homeX, bed?.y ?? v.homeY)
    noteChosenAction(v, 'rest', night ? 'nuit — lit forcé' : stormy ? 'tempête — foyer forcé' : 'fatigue — foyer forcé')
    return true
  }
  if (!v.hasHome && (night || exhausted || cold > 0.45 || stormy || tired)) {
    setTask(v, 'rest', v.x, v.y)
    noteChosenAction(v, 'rest', night ? 'nuit — abri improvisé' : 'repos forcé')
    return true
  }
  if (v.hasHome && v.homeLayout && !night) {
    const lat = findRoomByKind(v.homeLayout, 'latrines')
    if (lat && (state.tick + v.id * 19) % (TICKS_PER_DAY * 2) === 0) {
      setTask(v, 'rest', lat.centroid.x, lat.centroid.y)
      noteChosenAction(v, 'rest', 'latrines')
      return true
    }
  }
  return false
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
    hasMine: false,
    mineX: -1,
    mineY: -1,
    tradeRuns: 0,
    surplus: {},
    attractiveness: 0,
    isRegionalHub: false,
    prosperity: 35,
    loyalty: 0.5,
    security: 0.5,
    recentDeaths: 0,
    recentThefts: 0,
    specialty: 'mixed',
    lastProsperLogTick: -9999,
    cohesion: 0.4,
    peaceTicks: 0,
    inequalityStress: 0,
    lastRitualTick: 0,
    development: 0.2,
    standardOfLiving: 0.35,
    laborBalance: 0,
    solBand: null,
    style: freshStyle(rng),
    knowledge: [],
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
  const ox = village ? village.centerX : v.hasHome ? v.homeX : v.x
  const oy = village ? village.centerY : v.hasHome ? v.homeY : v.y

  const woodNear = resourceDensity(grid, ox, oy, 'tree', 14)
  const stoneNear = resourceDensity(grid, ox, oy, 'stone', 14)
  const berriesNear = resourceDensity(grid, ox, oy, 'bush', 14)
  const ironNear = resourceDensity(grid, ox, oy, 'iron', 14)
  const mountainNear = resourceDensity(grid, ox, oy, 'mountain', 28)
  let wolvesNear = 0
  for (const w of state.wolves) if (w.alive && distance(w.x, w.y, ox, oy) < 40) wolvesNear++
  const water = findNearbyShore(grid, ox, oy, 16) !== null
  let pensInVillage = 0
  let fieldsInVillage = 0
  let wheatStock = 0
  for (const o of state.villagers) {
    if (!o.alive || o.villageId !== v.villageId) continue
    if (o.hasPen) pensInVillage++
    if (o.hasField || o.fieldX >= 0) fieldsInVillage++
    wheatStock += countOf(o.inventory, 'wheat')
    if (o.chestInventory) wheatStock += countOf(o.chestInventory, 'wheat')
  }

  // Comparative advantage: boost the locally dominant resource specializations.
  const forestLead = woodNear >= Math.max(stoneNear, berriesNear, ironNear, mountainNear * 0.45) && woodNear > 6
  const shoreLead = water && woodNear < 28
  const mountainLead = mountainNear > 10 && mountainNear >= woodNear * 0.7
  const ironLead = ironNear > 4 && ironNear >= Math.max(woodNear * 0.25, stoneNear * 0.4)

  const scores: Record<Profession, number> = {
    none: 0,
    forager: berriesNear * 1.4 + p.curiosity * 20 - countJob('forager') * 12,
    farmer: (24 - Math.min(berriesNear, 24)) * 1.5 + p.ambition * 14 + fieldsInVillage * 8 - countJob('farmer') * 8,
    fisher: (water ? 48 : -50) + p.curiosity * 12 - countJob('fisher') * 10 + (shoreLead ? 28 : 0),
    miller: (village?.hasMill ? 42 : wheatStock >= 2 || fieldsInVillage > 0 ? 12 : -30) + p.ambition * 12 - countJob('miller') * 30,
    lumberjack: woodNear * 1.35 + p.ambition * 18 - countJob('lumberjack') * 12 + (forestLead ? 26 : 0),
    mason: stoneNear * 1.25 + p.ambition * 15 - countJob('mason') * 12 + (mountainLead && !ironLead ? 10 : 0),
    guard: wolvesNear * 14 + p.courage * 34 - countJob('guard') * 14,
    builder: p.ambition * 26 + p.sociability * 16 - countJob('builder') * 12,
    herder: (pensInVillage > 0 ? 28 : 10) + (20 - Math.min(berriesNear, 20)) * 1.1 + p.generosity * 16 - countJob('herder') * 12,
    trader:
      (village?.hasPort ? 22 : 0) +
      (village && village.attractiveness > 40 ? 12 : 0) +
      (1 - p.generosity) * 30 +
      p.sociability * 20 -
      countJob('trader') * 14,
    weaver: (pensInVillage > 0 ? 35 : 8) + p.sociability * 18 + p.curiosity * 10 - countJob('weaver') * 12,
    blacksmith: ironNear * 1.45 + p.ambition * 20 - countJob('blacksmith') * 14 + (ironLead ? 22 : 0),
    miner: mountainNear * 1.25 + p.ambition * 24 + p.courage * 12 - countJob('miner') * 16 + (mountainLead ? 28 : 0),
  }

  // DF-like: skill + labor preference drift the profession over time (keeps resource scores).
  const mind = mindOf(v)
  for (const key of Object.keys(scores) as Profession[]) {
    if (key === 'none') continue
    scores[key] += professionSkillPrefScore(mind.skills, mind.preferences, key)
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
  let base = 1
  switch (v.profession) {
    case 'forager':
      base =
        kind === 'gatherFood'
          ? 2.0
          : kind === 'buildBoat' || kind === 'fish'
            ? 1.65
            : 1
      break
    case 'farmer':
      base = kind === 'sowField' || kind === 'harvestWheat' ? 2.35 : 1
      break
    case 'fisher':
      base =
        kind === 'fish' || kind === 'buildBoat'
          ? 2.5
          : kind === 'gatherWood' && v.boatId === null
            ? 1.9
            : 1
      break
    case 'lumberjack':
      base =
        kind === 'gatherWood' || kind === 'clearLand'
          ? 2.15
          : kind === 'buildBoat'
            ? 1.55
            : 1
      break
    case 'mason':
      base = kind === 'gatherStone' || kind === 'buildWall' || kind === 'mineTunnel' ? 2.0 : 1
      break
    case 'guard':
      base =
        kind === 'craftSpear' || kind === 'craftStoneSpear' || kind === 'buildWall' || kind === 'defend' || kind === 'fight'
          ? 2.0
          : 1
      break
    case 'builder':
      base =
        kind === 'buildHouse' ||
        kind === 'buildProject' ||
        kind === 'buildWall' ||
        kind === 'buildBridge' ||
        kind === 'buildMill' ||
        kind === 'buildPort' ||
        kind === 'clearLand'
          ? 2.1
          : 1
      break
    case 'herder':
      base =
        kind === 'captureSheep' || kind === 'feedPen' || kind === 'buildPen' || kind === 'tameHorse' || kind === 'tanHide'
          ? 2.2
          : 1
      break
    case 'trader':
      base =
        kind === 'mineGold' ||
        kind === 'mintCoins' ||
        kind === 'buildBridge' ||
        kind === 'tameHorse' ||
        kind === 'tradeRun' ||
        kind === 'buildCart' ||
        kind === 'buildBoat'
          ? 2.25
          : 1
      break
    case 'weaver':
      base = kind === 'weaveCloth' || kind === 'sewClothing' || kind === 'craftGear' ? 2.5 : 1
      break
    case 'blacksmith':
      base = kind === 'gatherIron' || kind === 'craftIronTool' || kind === 'mineTunnel' || kind === 'makeCharcoal' || kind === 'craftGear' ? 2.5 : 1
      break
    case 'miner':
      base = kind === 'mineTunnel' || kind === 'gatherIron' || kind === 'gatherStone' ? 2.6 : 1
      break
    default:
      base = 1
  }
  // Overlay: pratique émergente pèse autant que le soft métier legacy.
  return base * (0.55 + 0.45 * livelihoodTaskBonus(v, kind))
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
      return kind.startsWith('build') || kind === 'clearLand' ? 1.5 : 1
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
  /** Situational base before factor-matrix / softmax. */
  baseScore: number
}

function reach(v: Villager, tx: number, ty: number): number {
  const d = distance(v.x, v.y, tx, ty)
  const tolerance = (18 + v.personality.curiosity * 45) * (v.mounted ? 2.2 : 1)
  return 1 / (1 + d / tolerance)
}

function bestEdible(v: Villager): ResourceType | null {
  return bestEdibleIn(v.inventory)
}

function grantGatherExtras(v: Villager, source: 'bush' | 'tree' | 'stone' | 'fish' | 'sheep' | 'hunt', rng: () => number, state?: SimState) {
  const chanceScale =
    state != null ? biomeGatherChanceScale(sampleBiome(state.climate, v.x, v.y), source) : 1
  for (const drop of rollGatherExtras(source, rng, { skipPrimary: true, chanceScale })) {
    if (state && !canLift(v, drop.resource, drop.amount, state)) continue
    addToInventory(v.inventory, drop.resource, drop.amount)
  }
}

function digSideOre(
  grid: WorldGrid,
  i: number,
  v: Villager,
  state: SimState,
  deposit: 'copperDeposit' | 'tinDeposit' | 'leadDeposit' | 'silverDeposit' | 'coalDeposit',
  resource: ResourceType,
  want: number,
) {
  if (want <= 0) return
  const available = grid[deposit][i]
  if (available <= 0) return
  const take = Math.min(want, available)
  if (!canLift(v, resource, take, state)) return
  const left = addToInventory(v.inventory, resource, take)
  const gained = take - left
  grid[deposit][i] = Math.max(0, available - gained)
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
  v.homeLayout = null
  v.furnitureQueue = []
  const fp = houseFootprint(design, plot.x, plot.y)
  claimCells(grid, fp.walls, CLAIM_HOUSE)
  claimCells(grid, fp.interior, CLAIM_HOUSE)
  claimCells(grid, fp.open, CLAIM_HOUSE)
}


/**
 * Long-horizon cognition lives in `./cognition` (Map by villager id, same pattern as politics).
 * Behaviors keep task execution; cognition biases scores, goals, memory and emotions.
 */

function chooseTask(state: SimState, v: Villager, rng: () => number) {
  const grid = state.grid
  const season = state.season
  const famine = state.famine
  const p = v.personality
  const night = isNight(state.tick)
  const tired = v.stamina < STAMINA_TIRED
  const exhausted = v.stamina < STAMINA_EXHAUSTED
  const overloaded = encumbranceRatio(v) > 0.92 || inventoryNearlyFull(v.inventory)
  const mind = mindOf(v)
  const airT = sampleTempC(state.climate, v.x, v.y)
  const cold = coldStress01(airT)
  const heat = heatStress01(airT)
  let searchR = curiosityRadius(v, SHORT_BLIND_R)
  if (night) searchR = Math.round(searchR * 0.55)
  if (exhausted) searchR = Math.round(searchR * 0.65)
  const localR = Math.min(LOCAL_SENSE_R, searchR)
  const options: Option[] = []
  const memoryBias = (x: number, y: number): number =>
    spotMemoryBias(mind, v.memories, x, y, MEMORY_SPOT_RADIUS, MEMORY_SPOT_WEIGHT)
  const add = (kind: TaskKind, x: number, y: number, score: number, id: number | null = null, resource: ResourceType | null = null) => {
    let s = score
    // Exhaustion: abandon hard outdoor labor; prioritize shelter/food/rest.
    if (exhausted && (kind === 'gatherWood' || kind === 'gatherStone' || kind === 'gatherIron' || kind === 'mineTunnel' || kind === 'mineGold' || kind === 'clearLand' || kind === 'buildWall' || kind === 'tradeRun')) {
      s *= 0.25
    } else if (tired && (kind === 'mineTunnel' || kind === 'mineGold' || kind === 'buildPort' || kind === 'buildMill')) {
      s *= 0.55
    }
    if (night && (kind === 'idle' || kind === 'tradeRun' || kind === 'mineTunnel' || kind === 'mineGold')) s *= 0.4
    if (
      night &&
      (kind === 'gatherWood' ||
        kind === 'gatherStone' ||
        kind === 'gatherIron' ||
        kind === 'gatherFood' ||
        kind === 'clearLand' ||
        kind === 'fish' ||
        kind === 'harvestWheat' ||
        kind === 'buildWall' ||
        kind === 'buildBridge' ||
        kind === 'buildPort' ||
        kind === 'buildMill' ||
        kind === 'buildProject' ||
        kind === 'buildHouse' ||
        kind === 'buildBed' ||
        kind === 'buildChest' ||
        kind === 'buildWorkbench' ||
        kind === 'buildTable' ||
        kind === 'buildCart' ||
        kind.startsWith('craft') ||
        kind === 'weaveCloth' ||
        kind === 'sewClothing' ||
        kind === 'tanHide' ||
        kind === 'makeCharcoal')
    ) {
      // Homeless may still raise shelter after dark.
      const shelterBuild =
        !v.hasHome &&
        (kind === 'buildHouse' || kind === 'clearLand' || kind === 'gatherWood' || kind === 'buildBed')
      if (!shelterBuild) s *= 0.35
    }
    if (overloaded && (kind === 'gatherWood' || kind === 'gatherStone' || kind === 'gatherIron' || kind === 'gatherFood' || kind === 'mineTunnel' || kind === 'mineGold' || kind === 'harvestWheat')) {
      s *= 0.15
    }
    // Depleted neighbourhoods are less attractive (Sugarscape-style pressure).
    if (kind === 'gatherWood' || kind === 'gatherStone') {
      s *= 0.55 + gatherPressurePenalty(grid, x, y, state.climate) * 0.45
    }
    if (kind === 'gatherWood' || kind === 'clearLand') {
      s *= livelihoodMul(sampleBiome(state.climate, x, y)).wood
    }
    if (kind === 'gatherFood') {
      s *= livelihoodMul(sampleBiome(state.climate, x, y)).forage
    }
    if (kind === 'fish') {
      s *= livelihoodMul(sampleBiome(state.climate, x, y)).fish
    }
    if (kind === 'sowField' || kind === 'harvestWheat') {
      s *= livelihoodMul(sampleBiome(state.climate, x, y)).farm
    }
    if (kind === 'captureSheep' || kind === 'feedPen') {
      s *= livelihoodMul(sampleBiome(state.climate, x, y)).hunt
    }
    // Base only — métier/ambition/cognition/politique enter via factor matrix + softmax.
    const base = s + memoryBias(x, y)
    if (base > 0) options.push({ kind, x, y, id, resource, baseScore: base })
  }
  const considerLane = (fromX: number, fromY: number, toX: number, toY: number, score: number) => {
    if (fromX < 0 || fromY < 0 || toX < 0 || toY < 0) return
    const b = findLaneBlocker(grid, fromX, fromY, toX, toY)
    if (!b || alreadyClearing(state, b.x, b.y, v.id)) return
    add('clearLand', b.x, b.y, score * reach(v, b.x, b.y))
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
  const stockTarget =
    season === 'autumn'
      ? WINTER_STOCK_TARGET + 4
      : season === 'winter'
        ? WINTER_STOCK_TARGET * 0.85
        : FOOD_TARGET
  // Village granary pressure: low food surplus → stash harder before winter.
  const villageFoodGap =
    village && season !== 'summer'
      ? Math.max(0, -(village.surplus.food ?? 0) - (village.surplus.bread ?? 0) - (village.surplus.wheat ?? 0) * 0.4)
      : 0
  const granaryPush = villageFoodGap * 28 + (season === 'autumn' ? 22 : season === 'winter' ? 18 : 0)

  // Non-omniscient radar: local perceive → semantic/episodic spots → short blind search.
  const senseOpts = { localR, shortR: searchR, allowBlind: true as const }
  const bushSense =
    berriesRipeIn(season, airT) || famine ? senseResource(grid, v, mind, 'bush', senseOpts) : null
  const treeSense = senseResource(grid, v, mind, 'tree', senseOpts)
  let bush = bushSense ? { x: bushSense.x, y: bushSense.y } : null
  let tree = treeSense ? { x: treeSense.x, y: treeSense.y } : null
  // Mild score penalty when relying on blind search (unknown territory).
  const bushKnown = bushSense?.source !== 'search'
  const woodKnowMul = treeSense?.source === 'search' ? 0.78 : 1.12
  const rock = (() => {
    const s = senseResource(grid, v, mind, 'stone', senseOpts)
    return s ? { x: s.x, y: s.y } : null
  })()
  const ironOre = v.hasWorkbench
    ? (() => {
        const s = senseResource(grid, v, mind, 'iron', senseOpts)
        return s ? { x: s.x, y: s.y } : null
      })()
    : null
  const mountainOre =
    v.hasWorkbench && v.toolTier !== 'none'
      ? (() => {
          const preferDeeper = v.profession === 'miner' || v.toolTier === 'iron'
          const anchor =
            village?.hasMine
              ? { x: village.mineX, y: village.mineY }
              : mind.semantic.find((s) => s.kind === 'mine_spot' && s.confidence > 0.3)
                ? (() => {
                    const s = mind.semantic.find((f) => f.kind === 'mine_spot')!
                    return { x: s.x, y: s.y }
                  })()
                : null
          const face = pickDigTarget(grid, v.x, v.y, {
            maxRadius: Math.round(searchR * 0.9),
            preferDeeper,
            anchorX: anchor?.x,
            anchorY: anchor?.y,
            anchorBias: village?.hasMine ? 28 : 14,
          })
          if (face) return face
          const s = senseResource(grid, v, mind, 'mountain', { ...senseOpts, shortR: Math.round(searchR * 0.85) })
          if (!s) return null
          // Sense may return buried rock — snap to a diggable face nearby.
          return pickDigTarget(grid, s.x, s.y, { maxRadius: 8, preferDeeper, anchorX: s.x, anchorY: s.y }) ?? null
        })()
      : null
  const goldSense = senseResource(grid, v, mind, 'gold', { ...senseOpts, shortR: Math.round(searchR * 0.7) })
  const goldTile = goldSense ? { x: goldSense.x, y: goldSense.y } : null

  if (bestEdible(v)) {
    // Eat urge ramps only when hunger is real — mild hunger must not drown craft/build/gather.
    const eatUrge =
      v.hunger < 1.6
        ? Math.max(starving * 280, 90 + (1.6 - v.hunger) * 130)
        : v.hunger < 2.3
          ? starving * 140 + (2.3 - v.hunger) * 45
          : starving * 55
    if (eatUrge > 8) {
      const table = eatSpot(v.furnitureQueue, v.homeLayout)
      const eatX = table && v.hasHome ? table.x : v.hasTable ? v.tableX : v.x
      const eatY = table && v.hasHome ? table.y : v.hasTable ? v.tableY : v.y
      add('eat', eatX, eatY, eatUrge * (table || v.hasTable ? reach(v, eatX, eatY) : 1))
    }
  }
  if (v.hasChest && v.chestInventory && edibleValue(v.chestInventory) > 0 && v.hunger < 2.0) {
    const store = storeSpot(v.furnitureQueue, v.homeLayout)
    const cx = store?.x ?? v.chestX
    const cy = store?.y ?? v.chestY
    add('takeFromChest', cx, cy, starving * 180 * reach(v, cx, cy))
  }
  if (overloaded && v.hasChest && v.chestInventory) {
    const store = storeSpot(v.furnitureQueue, v.homeLayout)
    const cx = store?.x ?? v.chestX
    const cy = store?.y ?? v.chestY
    add('storeChest', cx, cy, 160 * reach(v, cx, cy))
  }

  if (bush) {
    const seasonMul = berriesRipeIn(season) ? 1 : 0.35
    const pantryNeed = Math.max(0, (stockTarget - larder) / stockTarget)
    const knowMul = bushKnown ? 1.15 : 0.72
    const ecoMul = gatherPressurePenalty(grid, bush.x, bush.y, state.climate)
    add(
      'gatherFood',
      bush.x,
      bush.y,
      (starving * 320 + pantryNeed * 140 + (famine ? 80 : 0) + (larder < 2 ? 90 : 0)) *
        seasonMul *
        knowMul *
        ecoMul *
        reach(v, bush.x, bush.y),
    )
  } else if ((berriesRipeIn(season) || famine) && (starving > 0.2 || larder < stockTarget)) {
    // Short exploratory idle toward curiosity when food is unknown locally.
    const sx = clamp(v.x + Math.floor((rng() - 0.5) * searchR), 0, grid.width - 1)
    const sy = clamp(v.y + Math.floor((rng() - 0.5) * searchR), 0, grid.height - 1)
    add('idle', sx, sy, 4 + starving * 22 + p.curiosity * 12)
  }

  const fishBoat = boatOf(state, v)
  // Once a boat exists, push embark→open-water fishing even if the owner isn't a fisher.
  if (fishBoat || v.profession === 'fisher' || larder < stockTarget || season === 'winter') {
    const spot = fishBoat
      ? findOpenWater(grid, fishBoat.x, fishBoat.y, OPEN_WATER_RADIUS, 2) ??
        findNearbyTerrain(grid, fishBoat.x, fishBoat.y, OPEN_WATER_RADIUS, WATER)
      : findNearbyShore(grid, v.x, v.y, FISH_RADIUS)
    if (spot) {
      const winterBonus = season === 'winter' ? 70 : 0
      const boatBonus = fishBoat ? 70 : 0
      add('fish', spot.x, spot.y, (30 + starving * 150 + winterBonus + boatBonus) * reach(v, spot.x, spot.y))
    }
  }

  if (v.fieldX !== -1) {
    const ripe = findNearest(grid, v.fieldX, v.fieldY, FIELD_RADIUS + 1, (x, y) => getTerrain(grid, x, y) === WHEAT && grid.amount[y * grid.width + x] >= WHEAT_RIPE)
    if (ripe) add('harvestWheat', ripe.x, ripe.y, (55 + starving * 140 + (season === 'autumn' ? 95 : 0) + (famine ? 50 : 0)) * reach(v, ripe.x, ripe.y))
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
    const cartUrge = 28 + p.ambition * 28 + (v.profession === 'trader' ? 35 : 0)
    if (wood >= CART_WOOD_COST && stone >= CART_STONE_COST) add('buildCart', v.homeX, v.homeY, cartUrge * reach(v, v.homeX, v.homeY))
    else if (tree) add('gatherWood', tree.x, tree.y, cartUrge * 0.6 * woodKnowMul * reach(v, tree.x, tree.y))
  }

  // Dock search must reach nearby shores — short radius left water-adjacent homes boatless.
  // Once a dock exists, timber→boat must beat plaza/social loops (often 100–200).
  if (
    v.hasHome &&
    v.homeOwnerId === v.id &&
    v.boatId === null &&
    (v.profession === 'fisher' ||
      v.profession === 'trader' ||
      v.profession === 'forager' ||
      v.profession === 'lumberjack' ||
      p.curiosity > 0.35)
  ) {
    const dock = findMillSite(grid, v.homeX, v.homeY, 55)
    if (dock) {
      const cargo = v.profession === 'trader'
      const needWood = cargo ? BOAT_CARGO_WOOD_COST : BOAT_FISH_WOOD_COST
      const needStone = cargo ? BOAT_CARGO_STONE_COST : 0
      const poolWood = householdStock(v, 'wood')
      const poolStone = householdStock(v, 'stone')
      const boatUrge =
        120 +
        p.ambition * 30 +
        p.curiosity * 28 +
        (v.profession === 'fisher' ? 50 : 0) +
        (v.profession === 'trader' ? 40 : 0) +
        (v.profession === 'forager' ? 28 : 0) +
        (v.profession === 'lumberjack' ? 22 : 0)
      if (poolWood >= needWood && poolStone >= needStone) {
        // Ready to launch — outrank socialise/entertain soft loops.
        add('buildBoat', dock.x, dock.y, (boatUrge + 200) * reach(v, dock.x, dock.y))
      } else if (poolWood < needWood && tree) {
        add('gatherWood', tree.x, tree.y, (boatUrge + 140) * woodKnowMul * reach(v, tree.x, tree.y))
      } else if (poolStone < needStone) {
        const rock = findNearbyTerrain(grid, v.x, v.y, searchR, STONE)
        if (rock) add('gatherStone', rock.x, rock.y, (boatUrge + 90) * reach(v, rock.x, rock.y))
      }
    }
  }

  if (village && v.hasHome && v.tradeCooldown <= 0 && (v.profession === 'trader' || v.ambition === 'wealth' || (village.prosperity ?? 0) > 55)) {
    const deal = findTradeOpportunity(state, village, v.x, v.y, v)
    if (deal) {
      const travelPenalty = deal.distance * 0.08
      const cargoBonus = (v.hasCart ? 36 : 0) + (v.boatId !== null ? 24 : 0) + (v.mounted ? 8 : 0)
      const surplusPush = Math.min(48, deal.gain * 16)
      const hubBonus = deal.target.isRegionalHub ? 14 : Math.min(18, deal.target.attractiveness * 0.09)
      const prosperPush = Math.min(20, (village.prosperity ?? 35) * 0.12)
      const destX = deal.target.hasPort ? deal.target.portX : deal.target.centerX
      const destY = deal.target.hasPort ? deal.target.portY : deal.target.centerY
      add(
        'tradeRun',
        destX,
        destY,
        32 + surplusPush + p.sociability * 15 + p.ambition * 8 + cargoBonus + hubBonus + prosperPush - travelPenalty,
        deal.target.id,
      )
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
      const portUrge = 70 + p.ambition * 30 + p.sociability * 18 + (v.profession === 'builder' || v.profession === 'trader' ? 25 : 0)
      if (needsClearing(grid, village.portX, village.portY)) add('clearLand', village.portX, village.portY, portUrge * 0.85 * reach(v, village.portX, village.portY))
      else if (wood >= PORT_WOOD_COST && stone >= PORT_STONE_COST) add('buildPort', village.portX, village.portY, portUrge * reach(v, village.portX, village.portY))
      else if (wood < PORT_WOOD_COST && tree) add('gatherWood', tree.x, tree.y, portUrge * 0.5 * reach(v, tree.x, tree.y))
      else if (rock) add('gatherStone', rock.x, rock.y, portUrge * 0.5 * reach(v, rock.x, rock.y))
    }
  }

  const socialNear = nearbyVillagers(state, v.x, v.y, SOCIAL_SIGHT, v.id, 32)
  const survivalTight =
    v.hunger < 2.4 || larder < 2 || famine || (v.fieldX !== -1 && !v.hasField) || state.tick < TICKS_PER_DAY * 14
  for (let si = 0; si < socialNear.length; si++) {
    const other = socialNear[si]

    const rel = v.relations.get(other.id)
    const affinity = rel ? rel.affinity : 0
    const trust = rel ? rel.trust : 0.25
    const respect = rel?.respect ?? 0
    const kinship = rel?.kinship ?? 0
    const isSpouse = v.spouseId === other.id
    const friendPull = affinity > 0.35 ? 22 : 0
    const kinPull = kinship > 0.4 || isSpouse ? 28 : 0
    const admirePull = respect * 35
    const mind = mindOf(v)
    const om = mindOf(other)
    ensureCultureState(mind, v, () => 0.5)
    ensureCultureState(om, other, () => 0.5)
    const cultSim = cultureSimilarity(mind.cultureFeatures, om.cultureFeatures)
    const homo = homophilyBias(cultSim, 'socialise')
    const ethBias = ethnosSocialBias(state, v, other, mind.rivalId)
    const lone = lonelinessPressure(v, state.tick)
    const chatNeed = mind.needs.social * 48 + mind.needs.belonging * 28 + lone * 40 + mind.needs.boredom * 18
    // After dark, chat less unless very lonely / kin / spouse (sleep wins).
    const nightChat = night ? (isSpouse || kinship > 0.4 || mind.needs.social > 0.7 ? 0.55 : 0.22) : 1
    const chatMul = survivalTight && !(isSpouse || kinship > 0.5) ? 0.12 : survivalTight ? 0.35 : 1
    add(
      'socialise',
      other.x,
      other.y,
      (12 + p.sociability * 42 + affinity * 35 + friendPull + kinPull + admirePull + chatNeed) *
        homo *
        ethBias *
        nightChat *
        chatMul *
        reach(v, other.x, other.y),
      other.id,
    )
    if (other.hunger < HUNGRY_THRESHOLD && larder > 1) {
      const norms = activeNormsFor(state, v)
      let share = p.generosity * 55 + affinity * 45 + respect * 40 + kinship * 25 + (isSpouse ? 30 : 0)
      share *= homophilyBias(cultSim, 'giveFood')
      if (norms.includes('share_famine') && famine) share *= 1.8
      if (other.villageId === v.villageId) share *= 1.15
      // Reciprocity: repay debts first (Mauss).
      const myDebt = rel?.debt ?? 0
      if (myDebt > 0.35) share *= 1.4 + Math.min(1, myDebt) * 0.5
      if (norms.includes('reciprocate') && myDebt > 0.2) share *= 1.25
      // Don't empty your own bag chatting while starving.
      if (v.hunger < 1.8) share *= 0.25
      add('giveFood', other.x, other.y, share * reach(v, other.x, other.y), other.id)
    }
    if (affinity < -0.5 || v.grudgeTarget === other.id || (rel?.grudge ?? 0) > 0.6) {
      const nerve = p.courage * 60 + (v.toolTier !== 'none' ? 25 : 0) - (other.toolTier !== 'none' ? 20 : 0)
      const feud = (rel?.grudge ?? 0) * 48 + (rel?.debt ?? 0) * 8
      const outgroup = other.villageId !== v.villageId
      const coh = villageCohesion(state, v.villageId)
      const asabiya = outgroup && coh > 0.5 ? 25 + coh * 40 : coh < 0.28 ? 12 : 0
      add(
        'confront',
        other.x,
        other.y,
        (Math.max(0, -affinity) * 70 + nerve + feud + asabiya - 40) * reach(v, other.x, other.y),
        other.id,
      )
    }
    if (other.hasChest && other.chestInventory && edibleValue(other.chestInventory) > 0) {
      const need = larder <= 0 ? starving * 120 : 0
      const greed = (1 - p.generosity) * 35 * (v.ambition === 'wealth' ? 1.5 : 1)
      const restraint = trust * 60 + Math.max(0, affinity) * 70 + p.generosity * 30 + respect * 25
      let score = need + greed + (famine ? 45 : 0) + p.courage * 25 - restraint
      score += (rel?.debt ?? 0) * 12
      if (score > 0) add('steal', other.chestX, other.chestY, score * reach(v, other.chestX, other.chestY), other.id)
    }
  }

  if (village && isGatheringHour(state.tick) && state.season !== 'winter') {
    const cx = village.centerX
    const cy = village.centerY
    let plazaFolk = 0
    let plazaFriend: Villager | null = null
    const plazaNear = nearbyVillagers(state, cx, cy, 8, v.id, 24)
    for (let pi = 0; pi < plazaNear.length; pi++) {
      const o = plazaNear[pi]
      if (o.villageId !== village.id) continue
      plazaFolk++
      const r = v.relations.get(o.id)
      if (!plazaFriend && r && (r.affinity > 0.2 || (r.respect ?? 0) > 0.4 || (r.kinship ?? 0) > 0.3)) plazaFriend = o
    }
    const survivalTight = v.hunger < 2.4 || larder < 2 || famine || state.tick < TICKS_PER_DAY * 10
    const gatherUrge =
      (18 +
        p.sociability * 50 +
        plazaFolk * 12 +
        (v.ambition === 'leader' ? 20 : 0) +
        villageCohesion(state, village.id) * 20 +
        (lifeRoleOf(v) === 'elder' ? 15 : 0)) *
      (v.hunger > 2.0 ? 1 : 0.2) *
      (night ? 0.2 : 1) *
      (survivalTight ? 0.25 : 1) *
      reach(v, cx, cy)
    if (gatherUrge > 8) {
      if (plazaFriend) add('socialise', plazaFriend.x, plazaFriend.y, gatherUrge * 1.15, plazaFriend.id)
      else add('socialise', cx, cy, gatherUrge, null)
    }
  }

  // Services émergents : spectacle, conseil, enseignement (temps + demande sociale).
  // Hard gate: colony survival beats troubadours — entertain/counsel wiped food loops.
  {
    const survivalTight =
      v.hunger < 2.5 || larder < 2.5 || famine || (v.fieldX !== -1 && !v.hasField) || state.tick < TICKS_PER_DAY * 12
    if (!survivalTight) {
      const pol = politicsOf(v)
      const urge = serviceUrge(state, v, pol.beliefs.piety, pol.creed === 'piete', lifeRoleOf(v) === 'elder')
      let serviceTarget: Villager | null = null
      let youthTarget: Villager | null = null
      for (let si = 0; si < socialNear.length; si++) {
        const o = socialNear[si]
        if (!serviceTarget) serviceTarget = o
        if (!youthTarget && o.age < 280) youthTarget = o
      }
      if (urge.entertain > 28) {
        const t = serviceTarget
        add('entertain', t ? t.x : v.x, t ? t.y : v.y, urge.entertain * (t ? reach(v, t.x, t.y) : 1), t?.id ?? null)
      }
      if (urge.counsel > 26 && serviceTarget) {
        add('counsel', serviceTarget.x, serviceTarget.y, urge.counsel * reach(v, serviceTarget.x, serviceTarget.y), serviceTarget.id)
      }
      if (urge.teach > 24) {
        const pupil = youthTarget ?? serviceTarget
        if (pupil) add('teachCraft', pupil.x, pupil.y, urge.teach * reach(v, pupil.x, pupil.y), pupil.id)
      }
    }
  }

  const wolf = nearestAlive(state.wolves, v.x, v.y, DANGER_RADIUS)
  const danger = wolf ? clamp(1 - distance(v.x, v.y, wolf.x, wolf.y) / DANGER_RADIUS, 0, 1) : 0

  if (wolf && v.toolTier !== 'none') {
    const rescueNear = nearbyVillagers(state, wolf.x, wolf.y, 4, v.id, 12)
    for (let ri = 0; ri < rescueNear.length; ri++) {
      const o = rescueNear[ri]
      if (o.toolTier !== 'none') continue
      const bond = Math.max(0, v.relations.get(o.id)?.affinity ?? 0)
      const respect = v.relations.get(o.id)?.respect ?? 0
      const kin = v.relations.get(o.id)?.kinship ?? 0
      const guardBoost = v.profession === 'guard' || v.ambition === 'protector' ? 1.65 : 1
      add(
        'defend',
        wolf.x,
        wolf.y,
        (p.courage * 70 + bond * 60 + respect * 40 + kin * 35 + p.generosity * 25) * guardBoost * reach(v, wolf.x, wolf.y),
        o.id,
      )
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
      const veg = firstPlotVegetation(grid, fp)
      const gap = fp.walls.find((c) => getTerrain(grid, c.x, c.y) !== HOUSE)
      const gapClear = gap && !needsClearing(grid, gap.x, gap.y)
      // Prefer raising walls when wood is ready; clear only when the next cell is blocked or we lack timber.
      if (gap && wood >= TILE_COST && gapClear) add('buildHouse', gap.x, gap.y, shelterUrge * reach(v, gap.x, gap.y))
      else if (veg) add('clearLand', veg.x, veg.y, shelterUrge * 1.15 * reach(v, veg.x, veg.y))
      else if (gap && wood >= TILE_COST) add('buildHouse', gap.x, gap.y, shelterUrge * reach(v, gap.x, gap.y))
      else if (gap && tree) add('gatherWood', tree.x, tree.y, shelterUrge * 0.8 * reach(v, tree.x, tree.y))
      if (v.hasChest && wood >= woodCap(v)) {
        add('storeChest', v.chestX, v.chestY, shelterUrge * 0.5 * reach(v, v.chestX, v.chestY))
      }
    }
  }

  const isOwner = v.homeOwnerId === v.id
  const fp = isOwner ? homeFootprint(v) : null
  if (v.hasHome && isOwner && fp) {
    // Emergent: richer / larger households expand rooms.
    if ((state.tick + v.id * 13) % 47 === 0) maybeExpandHome(state, v, rng)

    const layout = ensureHomeLayout(v)
    if (layout) seedFurnitureQueue(v, layout)

    const liveFp = homeFootprint(v) ?? fp
    // Finish any new exterior/partition walls after expansion.
    const wallGap = liveFp.walls.find((c) => getTerrain(grid, c.x, c.y) !== HOUSE)
    if (wallGap) {
      const expandUrge = 40 + p.ambition * 30
      if (needsClearing(grid, wallGap.x, wallGap.y)) {
        add('clearLand', wallGap.x, wallGap.y, expandUrge * 1.1 * reach(v, wallGap.x, wallGap.y))
      } else if (wood >= TILE_COST) {
        add('buildHouse', wallGap.x, wallGap.y, expandUrge * reach(v, wallGap.x, wallGap.y))
      } else if (tree) {
        add('gatherWood', tree.x, tree.y, expandUrge * 0.75 * reach(v, tree.x, tree.y))
      }
    }

    const job = nextFurnitureJob(v.furnitureQueue)
    if (job && !wallGap) {
      const taskKind = taskForFurniture(job.kind)
      const drive = 48 + p.ambition * 35 + (job.kind === 'bed' ? 12 : job.kind === 'hearth' ? 10 : 0)
      if (canAffordFurniture(v.inventory, job.kind)) {
        add(taskKind, job.x, job.y, drive * reach(v, job.x, job.y))
      } else {
        const missing = missingFurnitureResource(v.inventory, job.kind)
        if (missing === 'wood' && tree) add('gatherWood', tree.x, tree.y, drive * 0.8 * reach(v, tree.x, tree.y))
        else if (missing === 'stone' && rock) add('gatherStone', rock.x, rock.y, drive * 0.75 * reach(v, rock.x, rock.y))
        else if (missing === 'iron' && ironOre) add('gatherIron', ironOre.x, ironOre.y, drive * 0.7 * reach(v, ironOre.x, ironOre.y))
        else if (tree && woodCostOf(job.kind) > 0) add('gatherWood', tree.x, tree.y, drive * 0.65 * reach(v, tree.x, tree.y))
      }
    } else if (!job) {
      // Legacy fallback if queue empty — keep old slot logic for partial homes.
      const slots = furnitureSlots(liveFp)
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
      } else if (!v.hasTable) {
        const eat = eatSpot(v.furnitureQueue, v.homeLayout) ?? slots.workbench
        if (wood >= TABLE_COST) add('buildTable', eat.x, eat.y, drive * 0.85 * reach(v, eat.x, eat.y))
        else if (tree) add('gatherWood', tree.x, tree.y, drive * 0.65 * reach(v, tree.x, tree.y))
      }
    }
  }

  if (v.hasWorkbench && v.toolTier === 'wood') {
    const upgrade = 72 + p.courage * 55 + danger * 40 + p.ambition * 20
    if (stone >= STONE_SPEAR_COST) add('craftStoneSpear', v.x, v.y, upgrade)
    else if (rock) add('gatherStone', rock.x, rock.y, upgrade * 1.05 * reach(v, rock.x, rock.y))
  }

  if (v.hasWorkbench && v.toolTier === 'stone' && canPracticeCraft(v, 'iron')) {
    const upgradeIron = 34 + p.ambition * 30 + danger * 20
    const vgKnow = village?.knowledge
    const ironNeed = ironToolCostFor(v, IRON_TOOL_COST, vgKnow)
    if (iron >= ironNeed) add('craftIronTool', v.x, v.y, upgradeIron)
    else if (ironOre) add('gatherIron', ironOre.x, ironOre.y, upgradeIron * 0.8 * reach(v, ironOre.x, ironOre.y))
    else if (mountainOre) add('mineTunnel', mountainOre.x, mountainOre.y, upgradeIron * 0.75 * reach(v, mountainOre.x, mountainOre.y))
  }

  if (mountainOre) {
    const minerBoost = v.profession === 'miner' ? 40 : v.profession === 'mason' || v.profession === 'blacksmith' ? 25 : 0
    const ironBoost = v.toolTier === 'iron' ? 18 : v.toolTier === 'stone' ? 8 : 0
    const woodToolPenalty = v.toolTier === 'wood' ? 0.55 : 1
    const deeperBoost = village?.hasMine ? 12 : 0
    const benchReady = v.hasWorkbench ? 1.35 : 1
    const mineUrge =
      (28 + p.ambition * 28 + p.courage * 12 + minerBoost + ironBoost + deeperBoost) * woodToolPenalty * benchReady
    add('mineTunnel', mountainOre.x, mountainOre.y, mineUrge * reach(v, mountainOre.x, mountainOre.y))
  }

  // Claim a mine mouth near the village so digs deepen into one corridor system.
  if (
    village &&
    !village.hasMine &&
    v.hasWorkbench &&
    (v.profession === 'miner' || v.profession === 'mason' || v.toolTier === 'iron') &&
    v.toolTier !== 'none' &&
    v.toolTier !== 'wood'
  ) {
    const site = findMineEntranceSite(grid, village.centerX, village.centerY, 55)
    if (site) {
      village.mineX = site.mountainX
      village.mineY = site.mountainY
      const claimUrge = 22 + p.ambition * 20 + (v.profession === 'miner' ? 30 : 0)
      add('mineTunnel', site.mountainX, site.mountainY, claimUrge * reach(v, site.mountainX, site.mountainY))
      if (wood >= 1) {
        // Soft mining_access staging pad beside the face (generative purpose).
        add('idle', site.x, site.y, 6)
      }
    }
  }

  if (v.hasWorkbench && gold >= NUGGETS_PER_COIN && v.profession === 'trader') {
    add('mintCoins', v.workbenchX, v.workbenchY, (20 + (1 - p.generosity) * 40) * reach(v, v.workbenchX, v.workbenchY))
  }

  if (v.hasHome && isOwner) {
    if (v.fieldX === -1) {
      const site = findBuildSite(grid, v.homeX - 9, v.homeY, FIELD_RADIUS, 25, 3)
      if (site) {
        v.fieldX = site.x
        v.fieldY = site.y
        claimArea(grid, site.x, site.y, FIELD_RADIUS, CLAIM_FIELD)
        linkToHub(grid, v.homeX, v.homeY, site.x, site.y, 0)
      }
    }
    if (v.fieldX !== -1 && sowingSeason(season, sampleTempC(state.climate, v.fieldX, v.fieldY))) {
      const veg = fieldCells(grid, v.fieldX, v.fieldY, FIELD_RADIUS).find((c) => needsClearing(grid, c.x, c.y))
      const bare = fieldCells(grid, v.fieldX, v.fieldY, FIELD_RADIUS).find((c) => isBuildableGround(grid, c.x, c.y))
      if (veg) add('clearLand', veg.x, veg.y, (36 + p.ambition * 12) * reach(v, veg.x, veg.y))
      else if (bare) {
        const tFac = cropTempFactor(sampleTempC(state.climate, bare.x, bare.y))
        // Stronger spring sow urge — fields were claimed but never sown under rest/social lock.
        const sowUrge =
          (120 + (season === 'spring' ? 90 : 40) + p.ambition * 25 + (famine ? 50 : 0) + starving * 60) *
          Math.max(0.5, tFac)
        add('sowField', bare.x, bare.y, sowUrge * reach(v, bare.x, bare.y))
      }
    }
    // If field plot is vegetation-blocked, clearing is survival work — score above chat.
    if (v.fieldX !== -1 && !v.hasField) {
      const veg2 = fieldCells(grid, v.fieldX, v.fieldY, FIELD_RADIUS).find((c) => needsClearing(grid, c.x, c.y))
      if (veg2) add('clearLand', veg2.x, veg2.y, (95 + p.ambition * 15 + starving * 40) * reach(v, veg2.x, veg2.y))
    }
  }

  if (village && village.memberIds.length >= 2 && !village.hasMill && v.hasHome) {
    let villageWheat = wheat
    let villageFields = v.hasField || v.fieldX >= 0 ? 1 : 0
    for (const o of state.villagers) {
      if (!o.alive || o.villageId !== village.id || o.id === v.id) continue
      villageWheat += countOf(o.inventory, 'wheat')
      if (o.chestInventory) villageWheat += countOf(o.chestInventory, 'wheat')
      if (o.hasField || o.fieldX >= 0) villageFields++
    }
    if (villageWheat >= 2 || villageFields > 0) {
      if (village.millX === -1) {
        const site = findMillSite(grid, village.centerX, village.centerY, 45)
        if (site) {
          village.millX = site.x
          village.millY = site.y
          setClaim(grid, site.x, site.y, CLAIM_MILL)
        }
      }
      if (village.millX !== -1) {
        const millUrge = 26 + p.sociability * 20 + p.ambition * 24 + (villageWheat >= 4 ? 20 : 0)
        if (needsClearing(grid, village.millX, village.millY)) add('clearLand', village.millX, village.millY, millUrge * 0.9 * reach(v, village.millX, village.millY))
        else if (wood >= MILL_WOOD_COST && stone >= MILL_STONE_COST) add('buildMill', village.millX, village.millY, millUrge * reach(v, village.millX, village.millY))
        else if (wood < MILL_WOOD_COST && tree) add('gatherWood', tree.x, tree.y, millUrge * 0.6 * reach(v, tree.x, tree.y))
        else if (rock) add('gatherStone', rock.x, rock.y, millUrge * 0.6 * reach(v, rock.x, rock.y))
      }
    }
  }

  if (village?.hasMill && (wheat >= WHEAT_PER_FLOUR || MILL_GRAINS.some((g) => countOf(v.inventory, g) >= 2))) {
    add(
      'grindFlour',
      village.millX,
      village.millY,
      (42 + starving * 80 + (famine ? 40 : 0) + (season === 'winter' ? 25 : 0)) * reach(v, village.millX, village.millY),
    )
  }
  if (v.hasWorkbench && flour > 0) {
    add('bakeBread', v.workbenchX, v.workbenchY, (40 + starving * 70) * reach(v, v.workbenchX, v.workbenchY))
  }
  if (v.hasWorkbench && wool >= WOOL_PER_CLOTH && canPracticeCraft(v, 'weave')) {
    add('weaveCloth', v.workbenchX, v.workbenchY, (30 + p.ambition * 20) * reach(v, v.workbenchX, v.workbenchY))
  }
  if (v.hasWorkbench && (cloth >= CLOTH_PER_CLOTHING || countOf(v.inventory, 'leather') >= 1) && canPracticeCraft(v, 'sew')) {
    const winterPush = season === 'winter' ? 45 : season === 'autumn' ? 20 : 5
    const coldPush = cold * 55
    add('sewClothing', v.workbenchX, v.workbenchY, (30 + winterPush + coldPush) * reach(v, v.workbenchX, v.workbenchY))
  }
  if (v.hasWorkbench && hide > 0 && canPracticeCraft(v, 'tan')) {
    add('tanHide', v.workbenchX, v.workbenchY, (25 + p.ambition * 15) * reach(v, v.workbenchX, v.workbenchY))
  }
  // Chaîne bois → charbon (si technique connue).
  if (v.hasWorkbench && wood >= 2 && canPracticeCraft(v, 'charcoal')) {
    add(
      'makeCharcoal',
      v.workbenchX,
      v.workbenchY,
      (22 + p.curiosity * 25 + mindOf(v).skills.craft * 20) * reach(v, v.workbenchX, v.workbenchY),
    )
  }

  // Kit corporel : souliers, cape, dague, parure… selon froid / métier / fortune.
  if (v.hasWorkbench) {
    const gearTarget = pickGearCraftTarget(v, {
      season,
      cold01: cold,
      canCraft: (c) => canPracticeCraft(v, c),
    })
    if (gearTarget) {
      const winterPush = season === 'winter' ? 28 : season === 'autumn' ? 14 : 4
      const rolePush = v.profession === 'guard' || v.ambition === 'wealth' || v.ambition === 'leader' ? 12 : 0
      add(
        'craftGear',
        v.workbenchX,
        v.workbenchY,
        (26 + winterPush + cold * 40 + rolePush + p.ambition * 10) * reach(v, v.workbenchX, v.workbenchY),
      )
    }
  }

  // Recettes catalogue (poix, linon, bronze, remèdes, salaisons…).
  if (v.hasWorkbench) {
    let bestRecipe: (typeof CRAFT_RECIPES)[number] | null = null
    let bestScore = 0
    for (const recipe of CRAFT_RECIPES) {
      if (recipe.station !== 'workbench') continue
      if (!recipeCraftable(recipe, (t) => countOf(v.inventory, t))) continue
      const score =
        (recipe.urge + 18 + p.ambition * 14 + mindOf(v).skills.craft * 22 + (v.hunger >= 2.2 ? 12 : 0)) *
        reach(v, v.workbenchX, v.workbenchY)
      if (score > bestScore) {
        bestScore = score
        bestRecipe = recipe
      }
    }
    if (bestRecipe) add('craftGoods', v.workbenchX, v.workbenchY, bestScore, null, bestRecipe.output)
  }
  if (village?.hasMill) {
    let bestMill: (typeof CRAFT_RECIPES)[number] | null = null
    let bestMillScore = 0
    for (const recipe of CRAFT_RECIPES) {
      if (recipe.station !== 'mill') continue
      if (!recipeCraftable(recipe, (t) => countOf(v.inventory, t))) continue
      const score = (recipe.urge + starving * 40) * reach(v, village.millX, village.millY)
      if (score > bestMillScore) {
        bestMillScore = score
        bestMill = recipe
      }
    }
    if (bestMill) add('craftGoods', village.millX, village.millY, bestMillScore, null, bestMill.output)
  }

  // Remèdes si blessé.
  if (v.health < VILLAGER_HEALTH_MAX - 0.5) {
    const hasMed =
      countOf(v.inventory, 'medicine') > 0 ||
      countOf(v.inventory, 'herbs') > 0 ||
      countOf(v.inventory, 'sage') > 0 ||
      countOf(v.inventory, 'garlic') > 0
    if (hasMed) {
      add('useMedicine', v.x, v.y, (1 - v.health / VILLAGER_HEALTH_MAX) * 120)
    }
  }

  // Soft R&D near workbench — curious / skilled villagers with surplus leisure.
  const researchUrge = experimentUrge(v, state)
  if (researchUrge > 20) {
    add('experiment', v.workbenchX, v.workbenchY, researchUrge * reach(v, v.workbenchX, v.workbenchY))
  }

  const materialNeed: { resource: ResourceType; reserve: number } | null =
    v.hasWorkbench && canPracticeCraft(v, 'weave') && wool < WOOL_PER_CLOTH
      ? { resource: 'wool', reserve: targetPerCapita('wool') }
      : v.hasWorkbench && canPracticeCraft(v, 'iron') && v.toolTier === 'stone' && iron < ironToolCostFor(v, IRON_TOOL_COST, village?.knowledge)
        ? { resource: 'iron', reserve: targetPerCapita('iron') }
        : v.hasWorkbench && canPracticeCraft(v, 'tan') && hide <= 0
          ? { resource: 'hide', reserve: targetPerCapita('hide') }
          : v.hasWorkbench && v.profession === 'trader' && gold < NUGGETS_PER_COIN
            ? { resource: 'gold', reserve: targetPerCapita('gold') }
            : null

  if (materialNeed) {
    const coinHave = countOf(v.inventory, 'coin')
    const price = priceOf(materialNeed.resource, state)
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
        const site = findBuildSite(grid, v.homeX + 10, v.homeY + 10, PEN_RADIUS, 25, 3)
        if (site) {
          v.penX = site.x
          v.penY = site.y
          claimArea(grid, site.x, site.y, PEN_RADIUS, CLAIM_PEN)
          linkToHub(grid, v.homeX, v.homeY, site.x, site.y, 0)
        }
      }
      if (v.penX !== -1) {
        const farmUrge = 25 + berryScarcity * 50 + p.ambition * 20
        const gap = singleDoorWallCells(grid, v.penX, v.penY, PEN_RADIUS).find((c) => getTerrain(grid, c.x, c.y) !== FENCE)
        if (gap && needsClearing(grid, gap.x, gap.y)) add('clearLand', gap.x, gap.y, farmUrge * 0.9 * reach(v, gap.x, gap.y))
        else if (gap && (wood >= TILE_COST || stone >= TILE_COST)) add('buildPen', gap.x, gap.y, farmUrge * reach(v, gap.x, gap.y))
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
        if (needsClearing(grid, gap.x, gap.y)) add('clearLand', gap.x, gap.y, civicUrge * 0.85 * reach(v, gap.x, gap.y))
        else if (res >= WALL_SEGMENT_COST) add('buildWall', gap.x, gap.y, civicUrge * reach(v, gap.x, gap.y))
        else {
          const src = wantCode === WALL_WOOD ? tree : rock
          if (src) add(wantCode === WALL_WOOD ? 'gatherWood' : 'gatherStone', src.x, src.y, civicUrge * 0.7 * reach(v, src.x, src.y))
        }
      }
    }
  }

  // Soft BuildProject continuum (halls / forts / manors — cognition enqueues intents).
  {
    const project = pickProjectForVillager(state, v)
    if (project) {
      const step = nextConstructionStep(grid, project, wood, stone)
      if (step) {
        v.activeProjectId = project.id
        const urge = projectTaskUrge(project, p)
        add(step.kind, step.x, step.y, urge * reach(v, step.x, step.y), step.projectId, step.resource)
      }
    }
  }

  if (wood >= BRIDGE_COST) {
    const wanted = bestCrossing(grid, v.x, v.y, 40, BRIDGE_DEMAND)
    if (wanted && !bridgeNearby(grid, wanted.x, wanted.y, 10)) {
      add('buildBridge', wanted.x, wanted.y, (18 + Math.min(60, wanted.demand * 0.8) + p.sociability * 18) * reach(v, wanted.x, wanted.y))
    }
  }

  if (v.hasHome && village) {
    const door = homeFootprint(v)?.door
    considerLane(door?.x ?? v.homeX, door?.y ?? v.homeY, village.centerX, village.centerY, 28 + p.sociability * 14)
    if (village.millX >= 0) considerLane(village.centerX, village.centerY, village.millX, village.millY, 32)
    if (village.portX >= 0) considerLane(village.centerX, village.centerY, village.portX, village.portY, 32)
  }
  if (v.hasHome && v.fieldX >= 0) considerLane(v.homeX, v.homeY, v.fieldX, v.fieldY, 22)
  if (v.hasHome && v.penX >= 0) considerLane(v.homeX, v.homeY, v.penX, v.penY, 22)

  const sellableSurplus = wool > 3 || cloth > 2 || hide > 2 || iron > 3 || gold > 2 || countOf(v.inventory, 'coin') > 6
  if (v.hasChest && (wood > 6 || stone > 6 || larder > stockTarget + 2 || sellableSurplus || granaryPush > 12)) {
    const store = storeSpot(v.furnitureQueue, v.homeLayout)
    const cx = store?.x ?? v.chestX
    const cy = store?.y ?? v.chestY
    add(
      'storeChest',
      cx,
      cy,
      (25 + p.ambition * 20 + granaryPush + (season === 'autumn' ? 30 : 0)) * reach(v, cx, cy),
    )
  }

  if (goldTile) add('mineGold', goldTile.x, goldTile.y, (12 + (1 - p.generosity) * 35) * (goldSense?.source === 'search' ? 0.75 : 1.1) * reach(v, goldTile.x, goldTile.y))

  if (v.hasHome) {
    const bed = sleepSpot(v.furnitureQueue, v.homeLayout)
    const restX = bed?.x ?? v.homeX
    const restY = bed?.y ?? v.homeY
    const restNeed =
      (season === 'winter' ? 38 : 8) +
      cold * 55 +
      heat * 28 +
      (night ? 70 : 0) +
      (exhausted ? 90 : tired ? 40 : 0) +
      (1 - v.stamina / STAMINA_MAX) * 50 +
      (!atHomeShelter(v) && cold > 0.25 ? 50 : 0) +
      (bed && v.bedCount > 0 ? 18 : 0)
    // Don't nap while carrying food and getting hungry — that was the mid-run starve path.
    const hungryWithFood = v.hunger < 2.2 && bestEdible(v)
    // Unsowable field waiting: daytime rest must yield to clear/sow.
    const fieldWaiting = !night && v.fieldX !== -1 && !v.hasField && v.homeOwnerId === v.id
    let restScore = hungryWithFood ? restNeed * 0.22 : restNeed
    if (fieldWaiting && !exhausted) restScore *= 0.08
    if (restScore > 6) add('rest', restX, restY, restScore * reach(v, restX, restY))
  } else if (exhausted || tired || cold > 0.4 || heat > 0.5) {
    // Sans foyer : s'asseoir sur place plutôt que de s'effondrer en marchant.
    add('rest', v.x, v.y, (exhausted ? 70 : 32) + (night ? 28 : 0) + cold * 40 + heat * 25)
  }

  const goodMemory = v.memories.find((m) => m.kind === 'goodSpot')
  const migrate = politicsOf(v).migrationUrge
  const wanderBase = v.ambition === 'explorer' ? 25 + Math.round(p.curiosity * 60) : 10 + Math.round(p.curiosity * 28)
  const fearStress = mind.emotions.fear + mind.emotions.stress
  const burrowPull = (night || fearStress > 0.45 || isChild(v)) && v.hasHome
  const range =
    wanderBase *
    (v.mounted ? 2 : 1) *
    (1 + migrate * 1.8) *
    (burrowPull ? 0.35 + p.courage * 0.25 : 1) *
    (isChild(v) ? 0.55 : 1)
  let idleX = goodMemory && rng() < 0.4 && !burrowPull ? goodMemory.x : clamp(v.x + Math.floor((rng() - 0.5) * range * 2), 0, grid.width - 1)
  let idleY = goodMemory && rng() < 0.4 && !burrowPull ? goodMemory.y : clamp(v.y + Math.floor((rng() - 0.5) * range * 2), 0, grid.height - 1)
  if (burrowPull) {
    const hx = v.homeX
    const hy = v.homeY
    const hub = village ?? null
    const tx = hub && rng() < 0.35 ? hub.centerX : hx
    const ty = hub && rng() < 0.35 ? hub.centerY : hy
    idleX = clamp(Math.round(tx + (rng() - 0.5) * 10), 0, grid.width - 1)
    idleY = clamp(Math.round(ty + (rng() - 0.5) * 10), 0, grid.height - 1)
  }
  // Soft migration: when oppression/famine urge is high, idle toward unfamiliar ground away from village centre.
  if (migrate > 0.4 && village) {
    const away = Math.atan2(v.y - village.centerY, v.x - village.centerX) + (rng() - 0.5) * 0.8
    const dist = 40 + migrate * 80
    idleX = clamp(Math.floor(v.x + Math.cos(away) * dist), 0, grid.width - 1)
    idleY = clamp(Math.floor(v.y + Math.sin(away) * dist), 0, grid.height - 1)
  }
  // Found elsewhere: unaffiliated migrants with high urge seek empty ground far from other centres.
  // Idle is a weak fallback — keep scores low so gather/craft/build win under softmax.
  const lastKind = mind.lastKind
  const microRepeat =
    lastKind === 'socialise' || lastKind === 'giveFood' || lastKind === 'entertain' || lastKind === 'eat'
  if (migrate > 0.5 && !village && !v.hasHome) {
    let farX = idleX
    let farY = idleY
    let bestClear = -Infinity
    for (let t = 0; t < 4; t++) {
      const cx = clamp(v.x + Math.floor((rng() - 0.5) * 120), 0, grid.width - 1)
      const cy = clamp(v.y + Math.floor((rng() - 0.5) * 120), 0, grid.height - 1)
      let minD = Infinity
      for (const vg of state.villages) {
        const d = distance(cx, cy, vg.centerX, vg.centerY)
        if (d < minD) minD = d
      }
      if (minD > bestClear) {
        bestClear = minD
        farX = cx
        farY = cy
      }
    }
    idleX = farX
    idleY = farY
    add('idle', idleX, idleY, 12 + migrate * 28 + p.curiosity * 14)
  } else {
    add('idle', idleX, idleY, 3 + p.curiosity * 8 + migrate * 14)
  }

  if (options.length === 0) {
    setTask(v, 'idle', v.x, v.y)
    noteChosenAction(v, 'idle', 'aucune option viable')
    return
  }

  const policyOpts = options.map((o) => {
    let base = o.baseScore
    // Anti-thrash: after a micro social/eat act, prefer lasting livelihood options.
    if (microRepeat && (o.kind === lastKind || o.kind === 'idle')) base *= 0.42
    if (
      microRepeat &&
      (o.kind === 'gatherWood' ||
        o.kind === 'gatherFood' ||
        o.kind === 'gatherStone' ||
        o.kind === 'clearLand' ||
        o.kind === 'sowField' ||
        o.kind === 'harvestWheat' ||
        o.kind.startsWith('build') ||
        o.kind.startsWith('craft') ||
        o.kind === 'fish' ||
        o.kind === 'mineTunnel')
    ) {
      base *= 1.35
    }
    return {
      kind: o.kind,
      x: o.x,
      y: o.y,
      id: o.id,
      resource: o.resource,
      baseScore: base,
      jobMult: jobBonus(v, o.kind),
      ambitionMult: ambitionBonus(v, o.kind),
    }
  })
  const pick = pickTaskByPolicy(state, v, policyOpts, rng)
  if (pick && pick.index >= 0) {
    const best = options[pick.index]
    setTask(v, best.kind, best.x, best.y, best.id, best.resource)
    const backend = pick.backend === 'webgpu' ? 'GPU' : 'CPU'
    noteChosenAction(
      v,
      best.kind,
      `U ${pick.utility.toFixed(1)} · T ${pick.temperature.toFixed(2)} · ${backend}`,
      pick.whyFactors,
    )
  } else {
    setTask(v, 'idle', v.x, v.y)
    noteChosenAction(v, 'idle', 'aucune option viable')
  }
}

function executeTask(state: SimState, v: Villager, rng: () => number): boolean {
  const grid = state.grid
  const task = v.task
  if (!task) return false
  task.ageTicks += 1
  const maxAge = task.kind === 'tradeRun' ? TRADE_TASK_MAX_AGE : TASK_MAX_AGE
  if (task.ageTicks > maxAge) return false

  const boat = boatOf(state, v)
  const arrived =
    task.kind === 'fish' && boat
      ? v.embarked && getTerrain(grid, v.x, v.y) === WATER && distance(v.x, v.y, task.targetX, task.targetY) <= 2.2
      : distance(v.x, v.y, task.targetX, task.targetY) <= 1.5

  if (task.kind === 'eat') {
    const food = bestEdible(v)
    if (!food) return false
    removeFromInventory(v.inventory, food, 1)
    const fromKcal = hungerRestoreFromFood(food)
    const legacy = NUTRITION[food] ?? 0.5
    const homeOwner =
      v.homeOwnerId === v.id
        ? v
        : v.homeOwnerId !== null
          ? state.villagers.find((o) => o.id === v.homeOwnerId && o.alive)
          : null
    const tableX = v.hasTable ? v.tableX : homeOwner?.hasTable ? homeOwner.tableX : -1
    const tableY = v.hasTable ? v.tableY : homeOwner?.hasTable ? homeOwner.tableY : -1
    const atTable = tableX >= 0 && atHomeShelter(v) && distance(v.x, v.y, tableX, tableY) <= 2.2
    const dineMul = atTable && homeOwner ? homeDineMul(homeOwner) : atTable && v.hasTable ? homeDineMul(v) : 1
    v.hunger = Math.min(HUNGER_MAX, v.hunger + Math.max(legacy, fromKcal) * dineMul)
    recoverStamina(v, 0.15 * (atTable ? 1.1 : 1))
    onCognitiveEvent(v, 'good_meal', ((NUTRITION[food] ?? 0.5) >= 1.4 ? 1 : 0.75) * (atTable ? 1.15 : 1))
    return false
  }

  /** Multi-tick craft/build: accumulate `work` until threshold; materials only spent on finish. */
  const accumulateLabor = (kind: TaskKind): 'abort' | 'continue' | 'complete' => {
    if (v.stamina <= 0.15) {
      v.nextThinkTick = state.tick + THINK_COOLDOWN + 8
      return 'abort'
    }
    spendStamina(v, STAMINA_LABOR)
    if (rng() >= laborSuccessChance(v, kind)) return 'continue'
    task.work += skillSpeedBonus(mindOf(v).skills, kind)
    wearTool(v, 0.35)
    return task.work < laborWorkNeeded(kind) ? 'continue' : 'complete'
  }
  const exhaustedAbort = (): boolean => {
    if (v.stamina > 0.15) return false
    v.nextThinkTick = state.tick + THINK_COOLDOWN + 8
    return true
  }

  if (task.kind === 'craftSpear') {
    if (countOf(v.inventory, 'wood') < SPEAR_WOOD_COST) return false
    const labor = accumulateLabor('craftSpear')
    if (labor === 'abort') return false
    if (labor === 'continue') return true
    removeFromInventory(v.inventory, 'wood', SPEAR_WOOD_COST)
    v.toolTier = 'wood'
    equipFromToolTier(v, 'wood')
    const q = rollCraftQuality(mindOf(v).skills.craft, rng)
    v.toolWear = q === 'masterwork' ? -TOOL_WEAR_MAX * 0.35 : q === 'fine' ? -8 : 0
    if (q === 'masterwork') noteMasterworkCraft(state, v, 'lance de bois')
    return false
  }
  if (task.kind === 'craftStoneSpear') {
    if (countOf(v.inventory, 'stone') < STONE_SPEAR_COST) return false
    const labor = accumulateLabor('craftStoneSpear')
    if (labor === 'abort') return false
    if (labor === 'continue') return true
    removeFromInventory(v.inventory, 'stone', STONE_SPEAR_COST)
    v.toolTier = 'stone'
    equipFromToolTier(v, 'stone')
    const q = rollCraftQuality(mindOf(v).skills.craft, rng)
    v.toolWear = q === 'masterwork' ? -TOOL_WEAR_MAX * 0.35 : q === 'fine' ? -8 : 0
    if (q === 'masterwork') noteMasterworkCraft(state, v, 'lance de pierre')
    return false
  }
  if (task.kind === 'craftIronTool') {
    const homeVg = v.villageId !== null ? state.villages.find((vg) => vg.id === v.villageId) : undefined
    const ironNeed = ironToolCostFor(v, IRON_TOOL_COST, homeVg?.knowledge)
    const haveIron = countOf(v.inventory, 'iron')
    const haveCharcoal = countOf(v.inventory, 'charcoal')
    // Charbon connu / en stock : moins de fer consommé.
    const cost = haveCharcoal > 0 ? Math.max(2, ironNeed - 1) : ironNeed
    if (haveIron < cost) return false
    const labor = accumulateLabor('craftIronTool')
    if (labor === 'abort') return false
    if (labor === 'continue') return true
    removeFromInventory(v.inventory, 'iron', cost)
    if (haveCharcoal > 0) removeFromInventory(v.inventory, 'charcoal', 1)
    v.toolTier = 'iron'
    equipFromToolTier(v, 'iron')
    const q = rollCraftQuality(mindOf(v).skills.craft, rng)
    // Trempe connue → usure plus lente (knowsTemperIron était orphelin).
    const temper = knowsTemperIron(v, homeVg)
    v.toolWear = q === 'masterwork' ? -TOOL_WEAR_MAX * 0.4 : q === 'fine' ? -10 : temper ? -6 : 0
    if (q === 'masterwork') noteMasterworkCraft(state, v, 'outil de fer')
    else if (q === 'fine') onCognitiveEvent(v, 'craft_joy', 0.8)
    return false
  }
  if (task.kind === 'craftGear') {
    const cold = coldStress01(sampleTempC(state.climate, v.x, v.y))
    const target = pickGearCraftTarget(v, {
      season: state.season,
      cold01: cold,
      canCraft: (c) => canPracticeCraft(v, c),
    })
    if (!target) return false
    const labor = accumulateLabor('craftGear')
    if (labor === 'abort') return false
    if (labor === 'continue') return true
    if (!craftAndEquipGear(v, target)) return false
    const q = rollCraftQuality(mindOf(v).skills.craft, rng)
    if (q === 'masterwork') noteMasterworkCraft(state, v, GEAR_DEFS[target].labelFr)
    else if (q === 'fine') onCognitiveEvent(v, 'craft_joy', 0.7)
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
    // Too exhausted to keep marching toward non-survival goals — drop task and rethink.
    if (v.stamina < 0.2 && task.kind !== 'flee' && task.kind !== 'rest' && task.kind !== 'takeFromChest') {
      v.nextThinkTick = state.tick + 2
      return false
    }
    const profile = pathProfileFor(state, v, task)
    const speed = travelSpeedFor(state, v)
    const wear = wearFor(v, task.kind)
    let destX = task.targetX
    let destY = task.targetY
    if (profile.amphibious && boat && !v.embarked) {
      const beside = chebyshev(v.x, v.y, boat.x, boat.y) <= 1
      if (!beside) {
        const dock = dockBesideBoat(grid, boat)
        destX = dock.x
        destY = dock.y
      } else if (tryEmbarkBoat(state, v, boat)) {
        task.stuckTicks = 0
        return true
      }
    }
    const fromX = v.x
    const fromY = v.y
    const moved = navigate(grid, state.tick, v, task, destX, destY, speed, profile, wear, (nx, ny, fx, fy) =>
      onVillagerStep(state, v, nx, ny, fx, fy),
    )
    if (moved && (v.x !== fromX || v.y !== fromY)) {
      const terr = getTerrain(grid, v.x, v.y)
      const walkCost = staminaCostForStep({
        embarked: v.embarked,
        mounted: v.mounted,
        hasCart: v.hasCart,
        loadRatio: encumbranceRatio(v),
        terrain: terr,
        bodyMassKg: bodyMassKgFromPhenotype(v.phenotype),
        onRoad: isWornRoad(terr),
      })
      spendStamina(v, walkCost)
    }
    if (!moved) {
      task.stuckTicks += 1
      // Mid-stuck: drop cached path so next navigate can replan around danger / obstacles.
      if (task.stuckTicks === 4 || task.stuckTicks === 7) {
        task.path = null
        task.pathI = 0
        task.pathTick = -999
      }
      // Delay random nudge — early nudges walk away from the work target and amplify fails.
      const productive =
        task.kind.startsWith('gather') ||
        task.kind.startsWith('build') ||
        task.kind === 'clearLand' ||
        task.kind === 'mineTunnel' ||
        task.kind === 'harvestWheat' ||
        task.kind === 'sowField'
      const stuckCap = productive ? STUCK_LIMIT + 6 : STUCK_LIMIT
      if (task.stuckTicks >= 6 && !(profile.amphibious && boat && chebyshev(v.x, v.y, boat.x, boat.y) <= 1)) {
        moveRandom(v, rng, grid, 2)
      }
      if (task.stuckTicks >= stuckCap) {
        v.nextThinkTick = state.tick + THINK_COOLDOWN + 4
        return false
      }
    } else {
      task.stuckTicks = 0
    }
    return true
  }

  switch (task.kind) {
    case 'fish': {
      const onBoat = v.embarked && getTerrain(grid, v.x, v.y) === WATER
      if (!onBoat && !isShore(grid, task.targetX, task.targetY)) return false
      if (v.boatId !== null && !onBoat) return true
      if (onBoat && getTerrain(grid, task.targetX, task.targetY) !== WATER) return false
      const catchChance =
        (0.32 +
          (v.profession === 'fisher' ? 0.25 : 0) +
          (onBoat ? 0.15 : 0) +
          fishingCurrentBonus(state.climate, task.targetX, task.targetY) * 0.22) *
        skillYieldBonus(mindOf(v).skills, 'fish') *
        livelihoodMul(sampleBiome(state.climate, task.targetX, task.targetY)).fish
      const freeze = sampleTempC(state.climate, task.targetX, task.targetY) < -1 ? 0.4 : 1
      if (rng() < Math.min(0.92, catchChance * freeze)) {
        const haul = onBoat ? 3 : 2
        const bonus = skillYieldBonus(mindOf(v).skills, 'fish') > 1.25 && rng() < 0.35 ? 1 : 0
        const primary = rng() < 0.82 ? 'fish' : 'food'
        addToInventory(v.inventory, primary, haul + bonus)
        grantGatherExtras(v, 'fish', rng, state)
      }
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
      const grainTypes: ResourceType[] = ['wheat', 'oats', 'barley', 'rye']
      const grain = grainTypes.find((g) => countOf(v.inventory, g) > 0)
      if (!grain) return false
      removeFromInventory(v.inventory, grain, 1)
      horse.hunger = Math.min(HUNGER_MAX, horse.hunger + 2)
      return false
    }
    case 'buildCart': {
      if (countOf(v.inventory, 'wood') < CART_WOOD_COST || countOf(v.inventory, 'stone') < CART_STONE_COST) return false
      const labor = accumulateLabor('buildCart')
      if (labor === 'abort') return false
      if (labor === 'continue') return true
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
      // Household chest counts as communal timber so pack wood under survival pressure can still launch.
      if (householdStock(v, 'wood') < needWood || householdStock(v, 'stone') < needStone) return false
      const labor = accumulateLabor('buildBoat')
      if (labor === 'abort') return false
      if (labor === 'continue') return true
      if (!consumeHousehold(v, 'wood', needWood)) return false
      if (needStone > 0 && !consumeHousehold(v, 'stone', needStone)) return false
      // Poix / corde : calfatage et gréement (bonus de solidité soft via cargo).
      if (countOf(v.inventory, 'pitch') > 0) removeFromInventory(v.inventory, 'pitch', 1)
      if (countOf(v.inventory, 'rope') > 0) removeFromInventory(v.inventory, 'rope', 1)
      const water = adjacentWater(grid, task.targetX, task.targetY) ?? findNearbyTerrain(grid, task.targetX, task.targetY, 3, WATER) ?? { x: task.targetX, y: task.targetY }
      const boat = { id: state.nextId++, x: water.x, y: water.y, kind: cargo ? ('cargo' as const) : ('fishing' as const), ownerId: v.id, villageId: v.villageId, alive: true }
      state.boats.push(boat)
      v.boatId = boat.id
      logEvent(state, `${v.name} a mis à l'eau ${cargo ? 'un chaland' : 'une barque'}`)
      return false
    }
    case 'buildPort': {
      const village = state.villages.find((vg) => vg.id === v.villageId)
      if (!village || village.hasPort) return false
      if (needsClearing(grid, task.targetX, task.targetY)) return false
      if (countOf(v.inventory, 'wood') < PORT_WOOD_COST || countOf(v.inventory, 'stone') < PORT_STONE_COST) return false
      stampPort(grid, task.targetX, task.targetY)
      removeFromInventory(v.inventory, 'wood', PORT_WOOD_COST)
      removeFromInventory(v.inventory, 'stone', PORT_STONE_COST)
      village.hasPort = true
      village.portX = task.targetX
      village.portY = task.targetY
      stampPlaza(grid, village.centerX, village.centerY)
      linkToHub(grid, village.centerX, village.centerY, task.targetX, task.targetY, 1)
      logEvent(state, `${v.name} a achevé le port du village`)
      noteMilestone(state, 'firstPort', `Premier port achevé`)
      return false
    }
    case 'tradeRun': {
      if (task.targetId !== null && task.targetId >= 0) {
        const destVillage = state.villages.find((vg) => vg.id === task.targetId)
        const homeVillage = state.villages.find((vg) => vg.id === v.villageId)
        if (!destVillage || !homeVillage) return false
        const routeKey = homeVillage.id < destVillage.id ? `${homeVillage.id}-${destVillage.id}` : `${destVillage.id}-${homeVillage.id}`
        const newRoute = !state.tradeRoutes.has(routeKey)
        const deal = findTradeOpportunity(state, homeVillage, v.x, v.y, v)
        const resource = deal && deal.target.id === destVillage.id ? deal.resource : 'wood'
        const gain = deal && deal.target.id === destVillage.id ? deal.gain : 3
        conductTrade(state, v, destVillage, resource, gain)
        if (newRoute) seedTradeCorridor(grid, homeVillage.centerX, homeVillage.centerY, destVillage.centerX, destVillage.centerY)
        onPoliticalTradeWindfall(state, v)
        v.tradeCooldown = TRADE_COOLDOWN
        task.targetX = v.homeX
        task.targetY = v.homeY
        task.targetId = -1
        task.path = null
        task.pathI = 0
        task.pathTick = -999
        return v.homeX !== -1
      }
      return false
    }
    case 'gatherFood': {
      if (getTerrain(grid, task.targetX, task.targetY) !== BUSH) return false
      const yieldAmt = berriesRipeIn(state.season) ? 2 : 1
      const { gained, remaining } = takeFromTile(grid, task.targetX, task.targetY, v, 'food', yieldAmt, BUSH, GRASS, state)
      if (gained <= 0 && remaining <= 0) return false
      if (gained <= 0) return false
      grantGatherExtras(v, 'bush', rng, state)
      if (rng() < 0.08) {
        remember(v, { kind: 'goodSpot', subjectId: null, x: task.targetX, y: task.targetY, tick: state.tick, weight: 0.6, emotion: 0.4 })
      }
      return edibleValue(v.inventory) < FOOD_TARGET
    }
    case 'clearLand': {
      const tx = task.targetX
      const ty = task.targetY
      const t = getTerrain(grid, tx, ty)
      if (t === TREE || isWoodPile(grid, tx, ty)) {
        if (exhaustedAbort()) return false
        spendStamina(v, STAMINA_LABOR)
        if (rng() >= laborSuccessChance(v, 'clearLand')) return true
        wearTool(v)
        const keep = t === TREE ? TREE : DIRT
        const beforeAmt = grid.amount[ty * grid.width + tx]
        const { gained, remaining } = takeFromTile(grid, tx, ty, v, 'wood', chopYield(v), keep, DIRT, state)
        if (remaining <= 0) {
          packTrailIfConnected(grid, tx, ty)
          return false
        }
        // Inventory full or overload: shove leftover logs beside the cell so plots/roads can open — never delete.
        const left = relocateWoodPile(grid, tx, ty, remaining)
        if (left <= 0) {
          setTerrain(grid, tx, ty, DIRT, 0)
          packTrailIfConnected(grid, tx, ty)
          return false
        }
        // Could not relocate — keep the pile on this cell (physical wood, not vanished).
        setTerrain(grid, tx, ty, DIRT, left)
        if (gained <= 0 && left >= beforeAmt) {
          v.nextThinkTick = state.tick + 6
          return false
        }
        return true
      }
      if (t === BUSH) {
        const yieldAmt = berriesRipeIn(state.season) ? 2 : 1
        const { gained, remaining } = takeFromTile(grid, tx, ty, v, 'food', yieldAmt, BUSH, DIRT, state)
        if (gained > 0) grantGatherExtras(v, 'bush', rng, state)
        if (remaining > 0) return gained > 0
        packTrailIfConnected(grid, tx, ty)
        return false
      }
      return false
    }
    case 'gatherWood':
    case 'gatherStone':
    case 'gatherIron': {
      const wantTerrain = task.kind === 'gatherWood' ? TREE : task.kind === 'gatherIron' ? IRON : STONE
      const res = task.kind === 'gatherWood' ? 'wood' : task.kind === 'gatherIron' ? 'iron' : 'stone'
      const t = getTerrain(grid, task.targetX, task.targetY)
      if (exhaustedAbort()) return false
      spendStamina(v, STAMINA_LABOR)
      if (rng() >= laborSuccessChance(v, task.kind)) return true
      wearTool(v)
      if (task.kind === 'gatherWood') {
        if (t !== TREE && !isWoodPile(grid, task.targetX, task.targetY)) return false
        const keep = t === TREE ? TREE : DIRT
        const { gained, remaining } = takeFromTile(grid, task.targetX, task.targetY, v, 'wood', chopYield(v), keep, DIRT, state)
        if (gained > 0 && t === TREE) grantGatherExtras(v, 'tree', rng, state)
        if (remaining <= 0 && t === TREE) packTrailIfConnected(grid, task.targetX, task.targetY)
        if (gained > 0 && rng() < 0.12) {
          remember(v, { kind: 'goodSpot', subjectId: null, x: task.targetX, y: task.targetY, tick: state.tick, weight: 0.5, emotion: 0.3 })
        }
        return gained > 0 && remaining > 0 && countOf(v.inventory, 'wood') < woodCap(v)
      }
      // Surface iron may be gone after resource expansion — snap to a diggable mountain face.
      if (task.kind === 'gatherIron' && t !== IRON) {
        const tip = pickDigTarget(grid, task.targetX, task.targetY, { maxRadius: 12, preferDeeper: true })
        if (!tip) return false
        task.kind = 'mineTunnel'
        task.targetX = tip.x
        task.targetY = tip.y
        task.path = null
        return true
      }
      if (t !== wantTerrain) return false
      const { gained } = takeFromTile(grid, task.targetX, task.targetY, v, res, v.toolTier === 'iron' ? 2 : 1, wantTerrain, GRASS, state)
      if (gained > 0 && task.kind === 'gatherStone') grantGatherExtras(v, 'stone', rng, state)
      return gained > 0 && countOf(v.inventory, res) < woodCap(v)
    }
    case 'mineTunnel': {
      const village = v.villageId !== null ? state.villages.find((vg) => vg.id === v.villageId) : undefined
      if (getTerrain(grid, task.targetX, task.targetY) !== MOUNTAIN) {
        // Retarget to the next corridor tip if this cell already opened.
        const tip = nextCorridorTip(grid, task.targetX, task.targetY) ?? pickDigTarget(grid, v.x, v.y, { maxRadius: 10, preferDeeper: true })
        if (!tip) return false
        task.targetX = tip.x
        task.targetY = tip.y
        task.path = null
        return true
      }
      if (exhaustedAbort()) return false
      ensureMountainDigHp(grid, task.targetX, task.targetY)
      spendStamina(v, digStaminaCost(v.toolTier))
      if (rng() >= laborSuccessChance(v, 'mineTunnel')) return true
      wearTool(v, v.toolTier === 'iron' ? 1.1 : 1.5)

      const i = task.targetY * grid.width + task.targetX
      const blast = knowsBlastMining(v, village)
      const hit = digHpPerHit(v.toolTier) + (blast ? 2 : 0)
      const stoneWant = digStoneYield(v.toolTier) + (blast ? 1 : 0)
      let take = Math.min(stoneWant, Math.max(1, Math.min(hit, grid.amount[i])))
      while (take > 0 && !canLift(v, 'stone', take, state)) take -= 1

      let spoil = 0
      let gained = 0
      if (take > 0) {
        const leftover = addToInventory(v.inventory, 'stone', take)
        gained = take - leftover
        spoil = leftover
      } else if (grid.amount[i] > 0) {
        // Inventory full of stone — still chip rock, dump spoil outside.
        spoil = Math.min(stoneWant, grid.amount[i])
        gained = spoil
      }

      if (gained <= 0 && spoil <= 0) {
        v.nextThinkTick = state.tick + 6
        return false
      }

      const remaining = Math.max(0, grid.amount[i] - Math.max(gained, spoil, hit))
      const towardX = village ? village.centerX : v.homeX >= 0 ? v.homeX : v.x
      const towardY = village ? village.centerY : v.homeY >= 0 ? v.homeY : v.y
      if (spoil > 0) depositSpoil(grid, task.targetX, task.targetY, spoil, towardX, towardY)

      // Ore to inventory — fix remaining deposit math (previous code wiped veins).
      const ironWant = Math.min(digIronYield(v.toolTier), grid.ironDeposit[i])
      if (ironWant > 0 && canLift(v, 'iron', ironWant, state)) {
        const leftIron = addToInventory(v.inventory, 'iron', ironWant)
        const ironGained = ironWant - leftIron
        grid.ironDeposit[i] = Math.max(0, grid.ironDeposit[i] - ironGained)
      }
      const goldWant = Math.min(digGoldYield(v.toolTier), grid.goldDeposit[i])
      if (goldWant > 0 && canLift(v, 'gold', goldWant, state)) {
        const leftGold = addToInventory(v.inventory, 'gold', goldWant)
        const goldGained = goldWant - leftGold
        grid.goldDeposit[i] = Math.max(0, grid.goldDeposit[i] - goldGained)
      }
      const sideWant = v.toolTier === 'iron' ? 2 : 1
      digSideOre(grid, i, v, state, 'copperDeposit', 'copper', sideWant)
      digSideOre(grid, i, v, state, 'tinDeposit', 'tin', sideWant)
      digSideOre(grid, i, v, state, 'leadDeposit', 'lead', sideWant)
      digSideOre(grid, i, v, state, 'silverDeposit', 'silver', Math.min(1, sideWant))
      digSideOre(grid, i, v, state, 'coalDeposit', 'coal', sideWant)

      task.work += 1
      let opened = false
      if (remaining <= 0) {
        const { isEntrance } = finalizeTunnelCell(grid, task.targetX, task.targetY, village, { placeAccess: true })
        opened = true
        if (isEntrance && village) {
          linkToHub(grid, village.centerX, village.centerY, task.targetX, task.targetY, 0)
        }
        remember(v, {
          kind: 'goodSpot',
          subjectId: null,
          x: task.targetX,
          y: task.targetY,
          tick: state.tick,
          weight: isEntrance ? 0.75 : 0.55,
          emotion: 0.35,
        })
        const mind = mindOf(v)
        const existing = mind.semantic.find((s) => s.kind === 'mine_spot' && Math.abs(s.x - task.targetX) + Math.abs(s.y - task.targetY) < 10)
        if (existing) {
          existing.confidence = Math.min(1, existing.confidence + 0.15)
          existing.tick = state.tick
          existing.x = task.targetX
          existing.y = task.targetY
          existing.label = isEntrance ? 'entrée de mine' : 'galerie minière'
        } else {
          mind.semantic.push({
            kind: 'mine_spot',
            subjectId: null,
            x: task.targetX,
            y: task.targetY,
            confidence: isEntrance ? 0.7 : 0.5,
            tick: state.tick,
            label: isEntrance ? 'entrée de mine' : 'galerie minière',
          })
          if (mind.semantic.length > 24) mind.semantic.shift()
        }
      } else {
        setTerrain(grid, task.targetX, task.targetY, MOUNTAIN, remaining)
      }

      noteMiningInsight(state, v, rng)

      // Session budget: stop before infinite caves; iron / miner get slightly longer digs.
      const hitBudget = DIG_HITS_PER_SESSION + (v.toolTier === 'iron' ? 1 : 0) + (v.profession === 'miner' ? 1 : 0)
      if (task.work >= hitBudget) return false

      if (opened) {
        // Cap corridor growth per session (not 1000-tile caves).
        const opensSoFar = Math.ceil(task.work / 2)
        if (opensSoFar >= DIG_TILES_PER_SESSION + (v.toolTier === 'iron' ? 1 : 0)) return false
        const tip = nextCorridorTip(grid, task.targetX, task.targetY)
        if (!tip) return false
        task.targetX = tip.x
        task.targetY = tip.y
        task.path = null
      }

      const cap2 = v.hasCart && v.mounted ? 20 : v.mounted ? 14 : 8
      return countOf(v.inventory, 'stone') < cap2 && v.stamina > STAMINA_EXHAUSTED * 0.6
    }
    case 'weaveCloth': {
      const woolHave = countOf(v.inventory, 'wool')
      if (woolHave < WOOL_PER_CLOTH) return false
      const homeOwner =
        v.homeOwnerId === v.id
          ? v
          : v.homeOwnerId !== null
            ? state.villagers.find((o) => o.id === v.homeOwnerId && o.alive)
            : v
      const weaveMul = homeOwner ? homeWeaveMul(homeOwner) : 1
      const batches = Math.floor(woolHave / WOOL_PER_CLOTH)
      removeFromInventory(v.inventory, 'wool', batches * WOOL_PER_CLOTH)
      const bonus = weaveMul > 1 && rng() < 0.4 ? 1 : 0
      addToInventory(v.inventory, 'cloth', batches + bonus)
      const q = rollCraftQuality(mindOf(v).skills.craft, rng)
      if (q === 'masterwork') noteMasterworkCraft(state, v, 'toile')
      else if (q === 'fine') onCognitiveEvent(v, 'craft_joy', 0.55)
      return false
    }
    case 'sewClothing': {
      const clothHave = countOf(v.inventory, 'cloth')
      const leatherHave = countOf(v.inventory, 'leather')
      if (clothHave >= CLOTH_PER_CLOTHING) {
        const batches = Math.floor(clothHave / CLOTH_PER_CLOTHING)
        removeFromInventory(v.inventory, 'cloth', batches * CLOTH_PER_CLOTHING)
        addToInventory(v.inventory, 'clothing', batches)
        tryEquipFromClothingCraft(v, 'cloth')
        return false
      }
      // Chaîne cuir → vêtement (sans métier tisserand obligatoire).
      if (leatherHave >= 1) {
        removeFromInventory(v.inventory, 'leather', 1)
        addToInventory(v.inventory, 'clothing', 1)
        tryEquipFromClothingCraft(v, 'leather')
        return false
      }
      return false
    }
    case 'makeCharcoal': {
      if (countOf(v.inventory, 'wood') < 2) return false
      const labor = accumulateLabor('makeCharcoal')
      if (labor === 'abort') return false
      if (labor === 'continue') return true
      removeFromInventory(v.inventory, 'wood', 2)
      addToInventory(v.inventory, 'charcoal', 1)
      onCognitiveEvent(v, 'craft_joy', 0.35)
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
      if (needsClearing(grid, task.targetX, task.targetY)) return false
      if (!isBuildableGround(grid, task.targetX, task.targetY)) return false
      const cropId = pickCropId(rng, sampleBiome(state.climate, task.targetX, task.targetY))
      setTerrain(grid, task.targetX, task.targetY, WHEAT, 1)
      grid.cropType[task.targetY * grid.width + task.targetX] = cropId
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
      let yieldN = ripeness >= WHEAT_RIPE ? 3 : 1
      const fy = skillYieldBonus(mindOf(v).skills, 'harvestWheat')
      if (fy > 1.2 && ripeness >= WHEAT_RIPE) yieldN += 1
      if (fy > 1.35 && rng() < 0.4) yieldN += 1
      const crop = cropDef(grid.cropType[i] ?? 0)
      yieldN = Math.max(1, Math.round(yieldN * crop.yieldMul))
      addToInventory(v.inventory, crop.resource, yieldN)
      // Verger / vignoble : chance de fruits secondaires proches
      if (crop.resource === 'apple' && rng() < 0.25) addToInventory(v.inventory, 'pear', 1)
      if (crop.resource === 'grape' && rng() < 0.2) addToInventory(v.inventory, 'plum', 1)
      setTerrain(grid, task.targetX, task.targetY, DIRT)
      grid.cropType[i] = 0
      return false
    }
    case 'grindFlour': {
      const village = state.villages.find((vg) => vg.id === v.villageId)
      if (!village?.hasMill) return false
      const wheat = countOf(v.inventory, 'wheat')
      if (wheat >= WHEAT_PER_FLOUR) {
        const batches = Math.floor(wheat / WHEAT_PER_FLOUR)
        removeFromInventory(v.inventory, 'wheat', batches * WHEAT_PER_FLOUR)
        addToInventory(v.inventory, 'flour', batches)
        return false
      }
      for (const grain of MILL_GRAINS) {
        const have = countOf(v.inventory, grain)
        if (have < 2) continue
        const batches = Math.floor(have / 2)
        removeFromInventory(v.inventory, grain, batches * 2)
        addToInventory(v.inventory, 'flour', batches)
        return false
      }
      return false
    }
    case 'craftGoods': {
      const recipeId = task.resource
      const recipe = CRAFT_RECIPES.find((r) => r.output === recipeId || r.id === recipeId) ?? CRAFT_RECIPES.find((r) => recipeCraftable(r, (t) => countOf(v.inventory, t)))
      if (!recipe) return false
      if (recipe.station === 'workbench' && !v.hasWorkbench) return false
      if (recipe.station === 'mill') {
        const village = state.villages.find((vg) => vg.id === v.villageId)
        if (!village?.hasMill) return false
      }
      if (!recipeCraftable(recipe, (t) => countOf(v.inventory, t))) return false
      const labor = accumulateLabor('craftGoods')
      if (labor === 'abort') return false
      if (labor === 'continue') return true
      spendRecipeInputs(recipe, (t, n) => {
        removeFromInventory(v.inventory, t, n)
      })
      addToInventory(v.inventory, recipe.output, recipe.outputCount)
      onCognitiveEvent(v, 'craft_joy', 0.4)
      return false
    }
    case 'useMedicine': {
      const dose =
        countOf(v.inventory, 'medicine') > 0
          ? 'medicine'
          : countOf(v.inventory, 'herbs') > 0
            ? 'herbs'
            : countOf(v.inventory, 'sage') > 0
              ? 'sage'
              : countOf(v.inventory, 'garlic') > 0
                ? 'garlic'
                : null
      if (!dose) return false
      removeFromInventory(v.inventory, dose, 1)
      const heal = dose === 'medicine' ? 2 : 1
      v.health = Math.min(VILLAGER_HEALTH_MAX, v.health + heal)
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
      if (needsClearing(grid, task.targetX, task.targetY)) return false
      if (countOf(v.inventory, 'wood') < MILL_WOOD_COST || countOf(v.inventory, 'stone') < MILL_STONE_COST) return false
      setTerrain(grid, task.targetX, task.targetY, MILL)
      removeFromInventory(v.inventory, 'wood', MILL_WOOD_COST)
      removeFromInventory(v.inventory, 'stone', MILL_STONE_COST)
      village.hasMill = true
      village.millX = task.targetX
      village.millY = task.targetY
      stampPlaza(grid, village.centerX, village.centerY)
      linkToHub(grid, village.centerX, village.centerY, task.targetX, task.targetY, 1)
      logEvent(state, `${v.name} a achevé le moulin`)
      noteMilestone(state, 'firstMill', `Premier moulin achevé`)
      return false
    }
    case 'buildHouse': {
      if (countOf(v.inventory, 'wood') < TILE_COST) return false
      const fp = homeFootprint(v)
      if (!fp) return false
      if (needsClearing(grid, task.targetX, task.targetY)) return false
      if (exhaustedAbort()) return false
      spendStamina(v, STAMINA_LABOR * 0.8)
      if (rng() >= laborSuccessChance(v, 'buildHouse')) return true
      if (getTerrain(grid, task.targetX, task.targetY) !== HOUSE) {
        setTerrain(grid, task.targetX, task.targetY, HOUSE)
        removeFromInventory(v.inventory, 'wood', TILE_COST)
      }
      const nextGap = fp.walls.find((c) => getTerrain(grid, c.x, c.y) !== HOUSE)
      if (!nextGap) {
        if (firstPlotVegetation(grid, fp)) return false
        stampHouseFloors(grid, fp)
        const wasNew = !v.hasHome
        v.hasHome = true
        v.homeOwnerId = v.id
        const layout = ensureHomeLayout(v)
        if (layout) seedFurnitureQueue(v, layout)
        if (!wasNew) {
          if (layout) logEvent(state, `${v.name} referme les murs — ${describeLayoutFr(layout)}`)
          return false
        }
        if (layout) {
          logEvent(state, `${v.name} a bâti une maison ${SHAPE_FR[v.house?.shape ?? 'square']} — ${describeLayoutFr(layout)}`)
        } else {
          logEvent(state, `${v.name} a bâti une maison ${SHAPE_FR[v.house?.shape ?? 'square']}`)
        }
        const joinRadius = VILLAGE_JOIN_RADIUS * (0.5 + v.personality.sociability)
        const village = findOrCreateVillage(state, v.homeX, v.homeY, joinRadius, rng)
        if (!village.memberIds.includes(v.id)) village.memberIds.push(v.id)
        v.villageId = village.id
        if (v.house) reinforceStyle(village.style, v.house.shape)
        recalcVillageCentre(state, village)
        stampPlaza(grid, village.centerX, village.centerY)
        const door = fp.door
        linkToHub(grid, door.x, door.y, village.centerX, village.centerY, village.memberIds.length >= 4 ? 1 : 0)
        village.perimeterTick = -PERIMETER_REFRESH
        if (v.profession === 'none') v.profession = assignProfession(state, v)
        noteMilestone(state, 'firstHouse', `Première maison fondée`)
        onCognitiveEvent(v, 'new_home', 1)
        if (village.memberIds.length === 2) {
          logEvent(state, `Un sentier relie les foyers au centre`)
        }
        return false
      }
      if (countOf(v.inventory, 'wood') < TILE_COST) return false
      task.targetX = nextGap.x
      task.targetY = nextGap.y
      return true
    }
    case 'buildProject': {
      const projectId = task.targetId ?? v.activeProjectId
      if (projectId === null) return false
      const project = findProject(state, projectId)
      if (!project || (project.phase as string) === 'done') {
        v.activeProjectId = null
        return false
      }
      if (exhaustedAbort()) return false
      spendStamina(v, STAMINA_LABOR * 0.85)
      if (rng() >= laborSuccessChance(v, 'buildProject')) return true
      v.activeProjectId = project.id
      const keepGoing = applyConstructionStep(state, v, project, task.targetX, task.targetY, (res, n) => {
        if (countOf(v.inventory, res) < n) return false
        removeFromInventory(v.inventory, res, n)
        return true
      })
      if ((project.phase as string) === 'done') {
        logEvent(state, `${v.name} a achevé ${project.label}`)
        v.activeProjectId = null
        return false
      }
      if (!keepGoing) return false
      const next = nextWallTarget(grid, project)
      if (!next) return false
      task.targetX = next.x
      task.targetY = next.y
      task.targetId = project.id
      return true
    }
    case 'buildPen': {
      const haveWood = countOf(v.inventory, 'wood') >= TILE_COST
      const haveStone = countOf(v.inventory, 'stone') >= TILE_COST
      if (!haveWood && !haveStone) return false
      if (needsClearing(grid, task.targetX, task.targetY)) return false
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
    case 'buildWorkbench':
    case 'buildChest':
    case 'buildBed':
    case 'buildTable':
    case 'buildBench':
    case 'buildStool':
    case 'buildShelf':
    case 'buildCupboard':
    case 'buildCradle':
    case 'buildLoom':
    case 'buildHearth':
    case 'buildWashingTub': {
      const kindMap: Partial<Record<TaskKind, FurnitureKind>> = {
        buildWorkbench: 'workbench',
        buildChest: 'chest',
        buildBed: 'bed',
        buildTable: 'table',
        buildBench: 'bench',
        buildStool: 'stool',
        buildShelf: 'shelf',
        buildCupboard: 'cupboard',
        buildCradle: 'cradle',
        buildLoom: 'loom',
        buildHearth: 'hearth',
        buildWashingTub: 'tub',
      }
      const kind = kindMap[task.kind]
      if (!kind) return false
      if (!canAffordFurniture(v.inventory, kind)) return false
      const labor = accumulateLabor(task.kind)
      if (labor === 'abort') return false
      if (labor === 'continue') return true
      if (!spendFurnitureRecipe(v.inventory, kind)) return false
      const def = FURNITURE_DEFS[kind]
      setTerrain(grid, task.targetX, task.targetY, def.terrain)
      const done = applyFurnitureBuilt(v, kind, task.targetX, task.targetY)
      const roomFr = done ? ROOM_LABEL_FR[done.roomKind] : ROOM_LABEL_FR[def.room]
      logEvent(state, `${v.name} installe ${furnitureLabelFr(kind)} dans ${roomFr}`)
      return false
    }
    case 'buildWall': {
      const village = state.villages.find((vg) => vg.id === v.villageId)
      if (!village) return false
      const wantCode = village.wallTier === 'none' ? WALL_WOOD : village.wallTier === 'wood' ? WALL_STONE : null
      if (wantCode === null) return false
      const res = wantCode === WALL_WOOD ? 'wood' : 'stone'
      if (countOf(v.inventory, res) < WALL_SEGMENT_COST) return false
      if (needsClearing(grid, task.targetX, task.targetY)) return false
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
          grantGatherExtras(v, 'hunt', rng, state)
        }
        return false
      }
      const grainTypes: ResourceType[] = ['wheat', 'oats', 'barley', 'rye']
      for (const g of grainTypes) {
        const grain = countOf(v.inventory, g)
        if (grain > 0) {
          v.penFeed += removeFromInventory(v.inventory, g, grain)
          return false
        }
      }
      const spareFood = Math.max(0, countOf(v.inventory, 'food') - 1)
      if (spareFood > 0) {
        v.penFeed += removeFromInventory(v.inventory, 'food', spareFood)
        return false
      }
      const spareTurnip = countOf(v.inventory, 'turnip')
      if (spareTurnip > 0) {
        v.penFeed += removeFromInventory(v.inventory, 'turnip', spareTurnip)
        return false
      }
      return false
    }
    case 'storeChest': {
      if (!v.chestInventory) return false
      for (const res of STOREABLE_RESOURCES) {
        if (isEdible(res)) continue
        transferAll(v.inventory, v.chestInventory, res)
      }
      if (edibleValue(v.inventory) - FOOD_TARGET > 0) {
        for (const res of EDIBLE_PRIORITY) {
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
      for (const res of EDIBLE_PRIORITY) {
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
      const rel = v.relations.get(seller.id)
      if (rel && rel.grudge > 0.5) return false
      const price = Math.max(1, Math.round(priceOf(resource, state) * (rel && rel.debt > 0.5 ? 0.85 : 1)))
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
    case 'rest': {
      const sheltered = atHomeShelter(v)
      const inChambre = v.homeLayout ? findRoomAt(v.homeLayout, v.x, v.y)?.kind === 'chambre' : false
      const bedBonus = v.bedCount > 0 && sheltered ? STAMINA_REST_BED : sheltered ? STAMINA_REST_HOME : STAMINA_IDLE * 1.6
      recoverStamina(v, bedBonus * (inChambre ? 1.15 : 1))
      // Nibble while resting if genuinely hungry — avoids rest→starve with food in the bag.
      if (v.hunger < 1.8) {
        const snack = bestEdible(v)
        if (snack) {
          removeFromInventory(v.inventory, snack, 1)
          const fromKcal = hungerRestoreFromFood(snack)
          const legacy = NUTRITION[snack] ?? 0.5
          v.hunger = Math.min(HUNGER_MAX, v.hunger + Math.max(legacy, fromKcal) * 0.85)
        }
      }
      if (sheltered && v.hunger > 0.5) {
        // Quiet recovery near the hearth — slight hunger cost of resting idle.
        if (state.season === 'winter') recoverStamina(v, 0.02)
      }
      if (isNight(state.tick)) {
        if (v.hunger < 1.6 && bestEdible(v) && task.ageTicks >= 10) return false
        return task.ageTicks < 28
      }
      const need = v.stamina < STAMINA_EXHAUSTED ? 28 : v.stamina < STAMINA_TIRED ? 16 : 8
      if (v.hunger < 1.6 && bestEdible(v) && task.ageTicks >= 8) return false
      if (
        v.fieldX !== -1 &&
        !v.hasField &&
        v.homeOwnerId === v.id &&
        v.stamina > STAMINA_EXHAUSTED &&
        task.ageTicks >= 6
      ) {
        return false
      }
      return task.ageTicks < need && v.stamina < STAMINA_MAX - 0.15
    }
    case 'socialise': {
      if (task.targetId !== null) {
        const other = state.villagers.find((o) => o.id === task.targetId && o.alive)
        if (!other) return false
        if (distance(v.x, v.y, other.x, other.y) > SOCIAL_RANGE) return true
        doSocialise(state, v, other)
        return false
      }
      let buddy: Villager | null = null
      for (const o of state.villagers) {
        if (!o.alive || o.id === v.id) continue
        if (distance(v.x, v.y, o.x, o.y) > SOCIAL_RANGE) continue
        buddy = o
        break
      }
      if (buddy) doSocialise(state, v, buddy)
      else recoverStamina(v, STAMINA_IDLE)
      return task.ageTicks < 12
    }
    case 'experiment': {
      if (!v.hasWorkbench) return false
      if (distance(v.x, v.y, v.workbenchX, v.workbenchY) > 1.8) return true
      const labor = accumulateLabor('experiment')
      if (labor === 'abort') return false
      if (labor === 'continue') return true
      const { continue: keep, insight } = applyExperiment(state, v, rng)
      void insight
      return keep && task.ageTicks < 28
    }
    case 'giveFood': {
      const other = state.villagers.find((o) => o.id === task.targetId && o.alive)
      if (!other) return false
      if (distance(v.x, v.y, other.x, other.y) > SOCIAL_RANGE) return true
      doGiveFood(state, v, other)
      return false
    }
    case 'entertain': {
      let audience: Villager | null = null
      if (task.targetId !== null) {
        audience = state.villagers.find((o) => o.id === task.targetId && o.alive) ?? null
        if (audience && distance(v.x, v.y, audience.x, audience.y) > SOCIAL_RANGE + 2) return true
      }
      doEntertain(state, v, audience)
      return task.ageTicks < 14
    }
    case 'counsel': {
      const other = state.villagers.find((o) => o.id === task.targetId && o.alive)
      if (!other) return false
      if (distance(v.x, v.y, other.x, other.y) > SOCIAL_RANGE) return true
      doCounsel(state, v, other)
      return false
    }
    case 'teachCraft': {
      const other = state.villagers.find((o) => o.id === task.targetId && o.alive)
      if (!other) return false
      if (distance(v.x, v.y, other.x, other.y) > SOCIAL_RANGE) return true
      doTeachCraft(state, v, other)
      return false
    }
    case 'steal': {
      const other = state.villagers.find((o) => o.id === task.targetId && o.alive)
      if (!other) return false
      doSteal(state, v, other)
      return false
    }
    case 'confront': {
      const other = state.villagers.find((o) => o.id === task.targetId && o.alive)
      if (!other) return false
      if (distance(v.x, v.y, other.x, other.y) > SOCIAL_RANGE) return true
      doConfront(state, v, other, rng)
      return false
    }
    case 'defend': {
      recoverStamina(v, STAMINA_IDLE * 0.5)
      return task.ageTicks < 8
    }
    case 'idle':
      recoverStamina(v, STAMINA_IDLE)
      return task.ageTicks < (isNight(state.tick) ? 6 : 10)
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

export function checkRoadMilestones(state: SimState) {
  if (state.milestones.firstPath && state.milestones.firstRoad) return
  const grid = state.grid
  const list = grid.walkedList
  const n = list.length
  if (n === 0) return
  const start = Math.max(0, n - 400)
  for (let i = start; i < n; i++) {
    const t = grid.terrain[list[i]]
    if (!state.milestones.firstPath && (t === PATH || t === ROAD)) {
      noteMilestone(state, 'firstPath', `Les sentiers deviennent des chemins`)
      // Pride wires into emotion → task bias (road_pride was defined but never fired).
      const idx = list[i]
      const rx = idx % grid.width
      const ry = Math.floor(idx / grid.width)
      for (const v of state.villagers) {
        if (!v.alive) continue
        if (chebyshev(v.x, v.y, rx, ry) <= 18) onCognitiveEvent(v, 'road_pride', 0.7)
      }
    }
    if (!state.milestones.firstRoad && t === ROAD) {
      noteMilestone(state, 'firstRoad', `Une vraie route apparaît`)
      const idx = list[i]
      const rx = idx % grid.width
      const ry = Math.floor(idx / grid.width)
      for (const v of state.villagers) {
        if (!v.alive) continue
        if (chebyshev(v.x, v.y, rx, ry) <= 22) onCognitiveEvent(v, 'road_pride', 0.95)
      }
      return
    }
  }
}

export function tickVillager(state: SimState, v: Villager, rng: () => number) {
  const grid = state.grid
  v.age++
  if (v.reproCooldown > 0) v.reproCooldown -= 1
  if (v.tradeCooldown > 0) v.tradeCooldown -= 1
  if (tickNeeds(v, VILLAGER_HEALTH_MAX, villagerHungerDrain(state, v))) {
    v.alive = false
    state.deaths += 1
    logEvent(state, `${v.name} est mort de faim`)
    onDeath(state, v, null)
    return
  }
  // Soft disease pressure (prédisposition × âge × famine) — jamais une mort certaine.
  if ((state.tick + v.id * 13) % 53 === 0 && v.health > 0) {
    const ageNorm = Math.min(1, v.age / (TICKS_PER_YEAR * 55))
    const pressure = diseasePressure(
      v.phenotype,
      ageNorm,
      state.famine,
      livelihoodMul(sampleBiome(state.climate, v.x, v.y)).disease,
    )
    if (pressure > 0.5 && rng() < pressure * 0.035 * (v.hunger < 1.5 ? 1.4 : 1)) {
      v.health -= 1
      if (v.health <= 0) {
        v.alive = false
        state.deaths += 1
        logEvent(state, `${v.name} succombe à la maladie`)
        onDeath(state, v, null)
        return
      }
    }
  }
  // Cold / heat / wet outdoors drain stamina; hearth recovers a little even without a rest task.
  {
    const air = sampleTempC(state.climate, v.x, v.y)
    const biome = sampleBiome(state.climate, v.x, v.y)
    const cold = Math.min(1, coldStress01(air) + (atHomeShelter(v) ? 0 : biomeColdBias(biome) * 0.85))
    const heat = heatStress01(air)
    const rain = sampleRain(state.climate, v.x, v.y)
    if (!atHomeShelter(v) && !v.embarked && (cold > 0.05 || heat > 0.05 || rain > 0.4)) {
      spendStamina(v, cold * (isNight(state.tick) ? 0.022 : 0.01) + heat * 0.014 + rain * 0.008)
    } else if (atHomeShelter(v) && !v.task) {
      recoverStamina(v, 0.028)
    } else if (!v.task && v.stamina < STAMINA_TIRED) {
      recoverStamina(v, 0.01)
    }
  }
  if (!Number.isFinite(v.hunger)) v.hunger = HUNGER_MAX * 0.5
  if (!Number.isFinite(v.stamina)) v.stamina = STAMINA_MAX * 0.5
  if (!Number.isFinite(v.health)) v.health = 1
  if (v.profession === 'none' && v.hasHome) v.profession = assignProfession(state, v)
  else if (v.hasHome && (state.tick + v.id * 17) % PROFESSION_REVIEW === 0) {
    const next = assignProfession(state, v)
    if (next !== v.profession) {
      const lock = professionLockInBonus(state, v, v.profession, next)
      // Stick to craft when surplus + size deepen division of labor (social expectation).
      // Curiosity + chômage soft abaissent le seuil (dérive de carrière).
      const liveMix = (() => {
        try {
          return mindOf(v).livelihood?.unemployedStreak ?? 0
        } catch {
          return 0
        }
      })()
      const threshold = 0.38 + v.personality.curiosity * 0.22 - Math.min(0.2, liveMix * 0.002)
      if (lock < threshold) {
        const prev = v.profession
        v.profession = next
        if (prev !== 'none' && next !== prev) {
          logEvent(state, `${v.name} oriente son labeur vers un autre craft (${prev} → ${next})`)
        }
      }
    }
    // Soft abandon: chômage prolongé + pas de pratique → sans métier (stress SoL ailleurs).
    try {
      const live = mindOf(v).livelihood
      if (live && live.unemployedStreak > 90 && live.titleFr === 'sans métier clair' && v.profession !== 'none') {
        if (v.personality.curiosity > 0.35 || live.unemployedStreak > 140) {
          logEvent(state, `${v.name} n’a plus de métier stable`)
          v.profession = 'none'
        }
      }
    } catch {
      /* ignore */
    }
  }
  // Métiers émergents — LOD stagger inside tickLivelihood.
  {
    const pol = politicsOf(v)
    const g = circlesOf(state, v).find((c) => c.isGuild || (c.kind === 'craft' && c.isInstitution))
    tickLivelihood(state, v, pol.beliefs.piety, g?.id ?? null)
  }
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
    } else if (!v.mounted && !v.embarked && distance(horse.x, horse.y, v.x, v.y) <= 2) {
      v.mounted = true
      horse.riderId = v.id
    }
  } else {
    v.mounted = false
  }

  if (v.boatId !== null && !boatOf(state, v)) {
    v.boatId = null
    v.embarked = false
  }

  const desperate = v.hunger < 0.6
  const exhausted = v.stamina < STAMINA_EXHAUSTED
  const caution = cautionFactor(v)
  const effectiveFleeRadius =
    FLEE_RADIUS * (1.4 - v.personality.courage * 0.8) * caution * (desperate ? 0.55 : 1)
  const threat = nearestTacticalThreat(state, v, effectiveFleeRadius)
  if (threat) {
    onCognitiveEvent(v, 'wolf', 0.85)
    const mind = mindOf(v)
    // Remember danger tiles (semantic map) — paths and tasks will avoid them.
    if (!v.task || (v.task.kind !== 'flee' && v.task.kind !== 'fight') || (state.tick + v.id) % 7 === 0) {
      noteWolfDanger(mind, threat, state.tick, 1)
      remember(v, {
        kind: 'dangerSpot',
        subjectId: null,
        x: threat.x,
        y: threat.y,
        tick: state.tick,
        weight: 1.05,
        emotion: -0.75,
      })
    }

    const engage = shouldEngageThreat(state, v, { exhausted, hunger: v.hunger })
    const fleeProfile = pathProfileFor(state, v, {
      kind: engage ? 'fight' : 'flee',
      targetId: threat.id,
    })

    if (engage) {
      stashInterruptedTask(v)
      setTask(v, 'fight', threat.x, threat.y, threat.id)
      noteChosenAction(v, 'fight', 'garde — engage le loup')
      spendStamina(v, STAMINA_FIGHT * 0.4)
      nudgeToward(
        grid,
        v,
        threat.x,
        threat.y,
        Math.max(1, travelSpeedFor(state, v) - 1),
        fleeProfile,
        1,
        (nx, ny, fx, fy) => onVillagerStep(state, v, nx, ny, fx, fy),
      )
    } else {
      stashInterruptedTask(v)
      const door = homeFootprint(v)?.door ?? null
      const safety = pickSafetyTarget(state, v, threat, door)
      setTask(v, 'flee', safety.x, safety.y, threat.id)
      noteChosenAction(v, 'flee', `menace — vers ${safety.label}`)
      const speed = Math.max(1, Math.min(FLEE_SPEED, travelSpeedFor(state, v) + (exhausted ? 0 : 1)))
      spendStamina(
        v,
        staminaCostForStep({
          embarked: false,
          mounted: v.mounted,
          hasCart: v.hasCart,
          loadRatio: encumbranceRatio(v),
          terrain: getTerrain(grid, v.x, v.y),
          bodyMassKg: bodyMassKgFromPhenotype(v.phenotype),
          onRoad: isWornRoad(getTerrain(grid, v.x, v.y)),
        }) * 1.5,
      )
      nudgeToward(
        grid,
        v,
        safety.x,
        safety.y,
        speed,
        fleeProfile,
        1,
        (nx, ny, fx, fy) => onVillagerStep(state, v, nx, ny, fx, fy),
      )
    }
    return
  }

  // Threat cleared: restore interrupted job (repath with danger costs) or rethink.
  if (v.task && (v.task.kind === 'flee' || v.task.kind === 'fight')) {
    const wasKind = v.task.kind
    v.task = null
    onCognitiveEvent(v, 'wolf_survived', wasKind === 'fight' ? 0.9 : 0.7)
    if (restoreInterruptedTask(v)) {
      replanAfterFailure(mindOf(v), 'threat')
      noteChosenAction(v, v.task!.kind, `reprise après ${wasKind}`)
      v.nextThinkTick = state.tick + 1
    } else {
      replanAfterFailure(mindOf(v), 'threat')
    }
  }

  // Survie : n'interrompre le travail que quand la faim est réelle
  // (seuil 2.2 annulait craft/build en boucle dès que le sac avait de la nourriture).
  if (
    v.task &&
    v.task.kind !== 'eat' &&
    v.task.kind !== 'flee' &&
    v.task.kind !== 'fight' &&
    v.task.kind !== 'takeFromChest' &&
    v.task.kind !== 'gatherFood' &&
    v.task.kind !== 'fish' &&
    v.task.kind !== 'harvestWheat' &&
    v.task.kind !== 'sowField' &&
    v.task.kind !== 'clearLand'
  ) {
    if (v.hunger < 2.35 && bestEdible(v)) {
      stashInterruptedTask(v)
      setTask(v, 'eat', v.x, v.y)
      noteChosenAction(v, 'eat', 'faim — interruption')
    } else if (
      v.hunger < 1.45 &&
      v.hasChest &&
      v.chestInventory &&
      edibleValue(v.chestInventory) > 0
    ) {
      stashInterruptedTask(v)
      setTask(v, 'takeFromChest', v.chestX, v.chestY)
      noteChosenAction(v, 'takeFromChest', 'faim — garde-manger')
    } else if (v.hunger < 0.85 || v.starveTimer > 8) {
      // Forcer un replan vers cueillette / pêche avant le timer de mort.
      stashInterruptedTask(v)
      v.task = null
      v.nextThinkTick = state.tick
    } else if (
      !isNight(state.tick) &&
      v.task.kind === 'rest' &&
      v.homeOwnerId === v.id &&
      v.fieldX !== -1 &&
      !v.hasField &&
      v.stamina > STAMINA_EXHAUSTED &&
      sowingSeason(state.season, sampleTempC(state.climate, v.fieldX, v.fieldY))
    ) {
      // Break perpetual rest so spring sowing can start.
      stashInterruptedTask(v)
      v.task = null
      v.nextThinkTick = state.tick
    }
  }

  // Nuit / tempête / épuisement : rentrer dormir (lit si connu).
  if (
    v.task &&
    v.task.kind !== 'rest' &&
    v.task.kind !== 'flee' &&
    v.task.kind !== 'fight' &&
    v.task.kind !== 'eat' &&
    v.task.kind !== 'takeFromChest'
  ) {
    const rainNow = sampleRain(state.climate, v.x, v.y)
    const stormy = state.climate.weather === 'storm' || rainNow > 0.55
    const coldNow = coldStress01(sampleTempC(state.climate, v.x, v.y))
    const night = isNight(state.tick)
    const starvingNow = v.hunger < 1.2 && !bestEdible(v)
    const leisure =
      v.task.kind === 'socialise' ||
      v.task.kind === 'giveFood' ||
      v.task.kind === 'entertain' ||
      v.task.kind === 'idle' ||
      v.task.kind === 'counsel' ||
      v.task.kind === 'teachCraft'
    const hardLabor =
      v.task.kind.startsWith('gather') ||
      v.task.kind.startsWith('build') ||
      v.task.kind.startsWith('craft') ||
      v.task.kind === 'clearLand' ||
      v.task.kind === 'mineTunnel' ||
      v.task.kind === 'mineGold' ||
      v.task.kind === 'tradeRun' ||
      v.task.kind === 'fish'
    const wantShelter =
      (!starvingNow && night) ||
      (!starvingNow && stormy && (leisure || hardLabor || !atHomeShelter(v))) ||
      (!starvingNow && v.hasHome && !atHomeShelter(v) && coldNow > 0.4) ||
      (v.stamina < STAMINA_EXHAUSTED && !starvingNow)
    if (wantShelter && (leisure || night || stormy || coldNow > 0.4 || v.stamina < STAMINA_EXHAUSTED || hardLabor)) {
      stashInterruptedTask(v)
      if (v.hasHome) {
        const bed = sleepSpot(v.furnitureQueue, v.homeLayout)
        setTask(v, 'rest', bed?.x ?? v.homeX, bed?.y ?? v.homeY)
        noteChosenAction(v, 'rest', night ? 'nuit — lit' : stormy ? 'tempête — foyer' : 'abri — foyer')
      } else {
        setTask(v, 'rest', v.x, v.y)
        noteChosenAction(v, 'rest', night ? 'nuit — abri improvisé' : stormy ? 'tempête — abri' : 'épuisement')
      }
    }
  }

  if (!v.task) {
    const forced = forceBiologicalRhythm(state, v)
    if (!forced) {
      if (state.tick < v.nextThinkTick) return
      const depth = shouldDeepThink(state, v) ? 'deep' : 'fast'
      tickCognition(state, v, rng, depth)
      chooseTask(state, v, rng)
    }
  }
  const active = v.task
  const continued = executeTask(state, v, rng)
  if (active && !continued) {
    const productive =
      active.kind.startsWith('gather') ||
      active.kind.startsWith('build') ||
      active.kind === 'clearLand' ||
      active.kind === 'mineTunnel' ||
      active.kind === 'harvestWheat' ||
      active.kind === 'sowField' ||
      active.kind === 'craftGoods' ||
      active.kind === 'craftGear'
    const stuckCap = productive ? STUCK_LIMIT + 6 : STUCK_LIMIT
    const stuck = active.stuckTicks >= stuckCap
    const timedOut = active.ageTicks > (active.kind === 'tradeRun' ? TRADE_TASK_MAX_AGE : TASK_MAX_AGE)
    const failed = stuck || timedOut
    recordTaskOutcome(v, active.kind, !failed, stuck ? 'stuck' : 'generic')
    if (!failed) noteActivityPractice(v, active.kind, 1)
    else if (active.work > 0 || active.ageTicks > 12) noteActivityPractice(v, active.kind, 0.35)

    const wasSurvivalBite = active.kind === 'eat' || active.kind === 'takeFromChest'
    v.task = null
    if (wasSurvivalBite && restoreInterruptedTask(v)) {
      noteChosenAction(v, v.task!.kind, 'reprise après repas')
      v.nextThinkTick = state.tick + 1
    } else {
      const micro = active.ageTicks <= 2 && active.work <= 0
      if (micro && forceBiologicalRhythm(state, v)) {
        v.nextThinkTick = state.tick
      } else if (micro && (active.kind.startsWith('craft') || active.kind.startsWith('build') || active.kind === 'experiment')) {
        setTask(v, 'idle', v.x, v.y)
        noteChosenAction(v, 'idle', 'pause après ' + active.kind)
        v.nextThinkTick = state.tick + THINK_COOLDOWN
      } else if (micro) {
        v.nextThinkTick = state.tick + (v.hunger < 2.2 ? 0 : 1)
      } else {
        v.nextThinkTick = state.tick + THINK_COOLDOWN
      }
    }
  } else if (!continued) {
    v.task = null
  }
}

export function tickFields(state: SimState) {
  const base = growthRate(state.season)
  if (base <= 0 && state.season === 'winter') {
    // Allow residual growth only where local T still supports crops.
  }
  const grid = state.grid
  const r = FIELD_RADIUS
  const w = grid.width
  for (const v of state.villagers) {
    if (!v.alive || v.fieldX === -1) continue
    const fieldT = sampleTempC(state.climate, v.fieldX, v.fieldY)
    const rain = sampleRain(state.climate, v.fieldX, v.fieldY)
    const farmMul = livelihoodMul(sampleBiome(state.climate, v.fieldX, v.fieldY)).farm
    const rate = Math.max(0, base * cropTempFactor(fieldT) * (0.75 + rain * 0.55) * farmMul)
    if (rate <= 0.02) continue
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
  // Ne pas déclarer famine sur le stock global dès le tick 40 : un monde neuf
  // part avec peu de garde-manger et ça déclenchait un cascade politique / stress.
  const stockCrisis = state.tick >= TICKS_PER_DAY && stores < alive * 0.45
  state.famine = hungry / alive > 0.5 || stockCrisis
  if (state.famine && !was) {
    logEvent(state, `La famine s'installe`)
    noteMilestone(state, 'firstFamine', `Première famine`)
    onPoliticalFamine(state)
  }
  if (!state.famine && was) logEvent(state, `La famine est passée`)
}

export function tickReproduction(state: SimState, rng: () => number) {
  if (state.tick % 6 !== 0) return
  if (state.famine || state.season === 'winter') return
  let alive = 0
  for (const v of state.villagers) if (v.alive) alive++
  if (alive >= maxPopulationCap()) return

  const ready = (v: Villager) =>
    v.alive &&
    v.hasHome &&
    isMarriageAge(v) &&
    v.reproCooldown <= 0 &&
    v.hunger >= REPRO_HUNGER_THRESHOLD &&
    edibleValue(v.inventory) >= REPRO_FOOD_STOCK

  const lookup = pedigreeLookup(state)

  const tryCouple = (a: Villager, b: Villager): boolean => {
      if (!ready(a) || !ready(b) || a.id === b.id) return false
      if (distance(a.x, a.y, b.x, b.y) > 2.5) return false
      const bonded =
        (a.spouseId === b.id && b.spouseId === a.id) || (a.spouseId === null && b.spouseId === null)
      if (!bonded) return false
      const rel = a.relations.get(b.id)
      if (a.spouseId !== b.id) {
        if (rel && rel.affinity < 0.15) return false
      } else if (rel && rel.affinity < -0.05) return false
      const F = kinshipCoefficient(a.id, b.id, lookup)
      if (F >= 0.2) return false
      if (
        a.parentIds.includes(b.id) ||
        b.parentIds.includes(a.id) ||
        (a.parentIds.length > 0 && b.parentIds.some((p) => a.parentIds.includes(p)))
      ) {
        return false
      }

      const homeOwner = a.homeOwnerId !== null ? state.villagers.find((o) => o.id === a.homeOwnerId && o.alive) : undefined
      let residents = 0
      if (homeOwner) {
        const hid = homeOwner.id
        for (const o of state.villagers) if (o.alive && o.homeOwnerId === hid) residents++
      }
      const hasRoom = homeOwner ? residents < householdSleepCapacity(homeOwner) : false

      // Soft gate fertilité génétique (prédisposition ≠ certitude)
      const fertChance = (fertilityModifier(a.phenotype) + fertilityModifier(b.phenotype)) * 0.5
      const bondBonus = a.spouseId === b.id ? 0.08 : 0
      const homeVg = a.villageId !== null ? state.villages.find((vg) => vg.id === a.villageId) : undefined
      const prosperMul = villageBirthBias(homeVg)
      if (rng() > Math.min(0.98, fertChance * prosperMul + bondBonus)) return false

      for (const parent of [a, b]) {
        if (countOf(parent.inventory, 'bread') > 0) removeFromInventory(parent.inventory, 'bread', 1)
        else removeFromInventory(parent.inventory, 'food', 2)
      }
      a.reproCooldown = REPRO_COOLDOWN
      b.reproCooldown = REPRO_COOLDOWN

      const seed = Math.floor(rng() * 4294967296)
      const { genome, phenotype, motherId, fatherId, sex } = birthGenetics(a, b, rng)
      const personality = applyGeneticPersonalityBias(
        inheritPersonality(a.personality, b.personality, rng),
        genome,
        rng,
      )
      const childInventory = createInventory(5)
      addToInventory(childInventory, 'coin', CHILD_STARTER_COINS)
      const child: Villager = {
        id: state.nextId++,
        seed,
        sex,
        name: generateName(seed),
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
        parentIds: [motherId, fatherId],
        motherId,
        fatherId,
        genome,
        phenotype,
        x: a.x,
        y: a.y,
        health: VILLAGER_HEALTH_MAX,
        hunger: HUNGER_MAX,
        stamina: STAMINA_MAX,
        starveTimer: 0,
        healTimer: 0,
        inventory: childInventory,
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
        hasHome: hasRoom,
        homeX: hasRoom && homeOwner ? homeOwner.homeX : -1,
        homeY: hasRoom && homeOwner ? homeOwner.homeY : -1,
        homeOwnerId: hasRoom && homeOwner ? homeOwner.id : null,
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
        villageId: a.villageId,
        hue: phenotype.hue,
        alive: true,
        age: 0,
        reproCooldown: REPRO_COOLDOWN,
        activeProjectId: null,
        knowledge: [],
      }
      relationWith(child, a.id).affinity = 0.8
      relationWith(child, b.id).affinity = 0.8
      relationWith(a, child.id).affinity = 0.8
      relationWith(b, child.id).affinity = 0.8
      relationWith(child, a.id).kinship = 0.9
      relationWith(child, b.id).kinship = 0.9
      relationWith(a, child.id).kinship = 0.9
      relationWith(b, child.id).kinship = 0.9
      state.villagers.push(child)
      registerBirth(state, child, a, b, rng)
      state.births += 1
      seedCultureFromParents(mindOf(child), mindOf(a), mindOf(b), rng)
      mindOf(child).preferences = inheritLaborPreferences(
        mindOf(a).preferences,
        mindOf(b).preferences,
        personality,
        rng,
      )
      seedEthnosFromParents(state, child, a, b, mindOf(child).cultureTag, rng)
      inheritKnowledge(child, a, b, state.tick, rng)
      if (a.spouseId === b.id && rng() < 0.45) {
        logCause(
          state,
          `foyer de ${fullNameOf(a)} et ${fullNameOf(b)}`,
          `${fullNameOf(child)} naît de l'union`,
        )
      } else {
        logEvent(state, `${fullNameOf(child)} est né de ${fullNameOf(a)} et ${fullNameOf(b)}`)
      }
      noteMilestone(state, 'firstBirth', `Première naissance`)
      return true
  }

  // Pass 1: bonded couples preferred
  for (const a of state.villagers) {
    if (!ready(a) || a.spouseId === null) continue
    const spouse = bondedPartner(state, a)
    if (!spouse || spouse.id < a.id) continue
    if (tryCouple(a, spouse)) return
  }

  // Pass 2: rare opportunistic among unmarried
  if (rng() > 0.35) return
  for (const a of state.villagers) {
    if (!ready(a) || a.spouseId !== null) continue
    for (const b of state.villagers) {
      if (b.id <= a.id || !ready(b) || b.spouseId !== null) continue
      if (tryCouple(a, b)) return
    }
  }
}

export function tickSheep(state: SimState, s: Sheep, rng: () => number) {
  if (s.breedCooldown > 0) s.breedCooldown -= 1
  if (s.woolCooldown > 0) s.woolCooldown -= 1
  if (tickNeeds(s, ANIMAL_HEALTH_MAX, animalHungerDecay(state.season))) {
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
    if (rng() < 0.35) addToInventory(owner.inventory, 'milk', 1)
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
  if (tickNeeds(w, ANIMAL_HEALTH_MAX, animalHungerDecay(state.season))) {
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
    const huntRadius = state.season === 'winter' ? WOLF_HUNT_RADIUS * 1.65 : state.season === 'autumn' ? WOLF_HUNT_RADIUS * 1.2 : WOLF_HUNT_RADIUS
    const villagerCandidate = nearestAlive(state.villagers, w.x, w.y, huntRadius)
    const sheepCandidate = nearestAlive(state.sheep, w.x, w.y, huntRadius, (s) => !s.captured)
    const horseCandidate = nearestAlive(state.horses, w.x, w.y, huntRadius, (h) => h.riderId === null)
    const dv = villagerCandidate ? distance(w.x, w.y, villagerCandidate.x, villagerCandidate.y) : Infinity
    const ds = sheepCandidate ? distance(w.x, w.y, sheepCandidate.x, sheepCandidate.y) : Infinity
    const dh = horseCandidate ? distance(w.x, w.y, horseCandidate.x, horseCandidate.y) : Infinity
    // Prefer livestock heavily — early human hunts wipe founding groups before spears/fields.
    const earlyColony = state.tick < TICKS_PER_DAY * 40
    const hungryWolf = w.hunger < 1.8
    if (sheepCandidate && (ds <= dv * 2.4 || earlyColony || !hungryWolf)) {
      targetSheep = sheepCandidate
      w.targetId = sheepCandidate.id
      w.targetKind = 'sheep'
    } else if (horseCandidate && (dh <= dv * 2.0 || earlyColony)) {
      targetHorse = horseCandidate
      w.targetId = horseCandidate.id
      w.targetKind = 'horse'
    } else if (villagerCandidate && hungryWolf && !earlyColony) {
      targetVillager = villagerCandidate
      w.targetId = villagerCandidate.id
      w.targetKind = 'villager'
    } else if (villagerCandidate && w.hunger < 0.9) {
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
  if (distance(w.x, w.y, target.x, target.y) > (state.season === 'winter' ? WOLF_GIVE_UP_RADIUS * 1.25 : WOLF_GIVE_UP_RADIUS)) {
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
    onPoliticalWolfAttack(state, targetVillager)
    if (targetVillager.health <= 0) {
      targetVillager.alive = false
      state.deaths += 1
      dropCarriedGold(state, targetVillager)
      logEvent(state, `${targetVillager.name} a été tué par un loup`)
      onWolfKill(state, targetVillager)
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
    const nearby = nearbyVillagers(state, w.x, w.y, Math.ceil(COMBAT_RADIUS) + 1, null, 24)
    let groupSize = 0
    for (let i = 0; i < nearby.length; i++) {
      if (nearby[i]!.toolTier !== 'none') groupSize++
    }
    if (groupSize === 0) continue
    const preyId = w.targetKind === 'villager' ? w.targetId : null
    const hitChance = Math.min(0.92, BASE_HIT_CHANCE + GROUP_BONUS * (groupSize - 1))
    const dmgChance = Math.max(0.04, BASE_DAMAGE_CHANCE - GROUP_BONUS * (groupSize - 1))

    for (let i = 0; i < nearby.length; i++) {
      const attacker = nearby[i]!
      if (!w.alive) break
      if (attacker.toolTier === 'none') continue
      if (distance(attacker.x, attacker.y, w.x, w.y) > COMBAT_RADIUS) continue
      const toolBonus = attacker.toolTier === 'iron' ? IRON_TOOL_BONUS : attacker.toolTier === 'stone' ? STONE_TOOL_BONUS : 0
      const gear = equipmentEffectsOf(attacker)
      const courageBonus = (attacker.personality.courage - 0.5) * 0.12
      const guardBonus = attacker.profession === 'guard' ? 0.1 : 0
      const inventBonus = techCombatBonus(attacker)
      if (rng() < Math.min(0.95, hitChance + toolBonus + courageBonus + guardBonus + inventBonus + gear.combat * 0.35)) {
        w.health -= 1
        if (w.health <= 0) {
          w.alive = false
          addToInventory(attacker.inventory, 'fur', 1 + (rng() < 0.45 ? 1 : 0))
          if (rng() < 0.55) addToInventory(attacker.inventory, 'hide', 1)
          const prey =
            preyId !== null
              ? state.villagers.find((o) => o.id === preyId && o.alive && o.id !== attacker.id)
              : undefined
          if (prey) creditRescue(state, prey, attacker)
        }
      }
      if (rng() < Math.max(0.04, dmgChance - toolBonus - courageBonus - guardBonus - gear.protect * 0.45)) {
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
  const grid = state.grid
  // Cold hard stop only where local T is freezing — not a global season gate alone.
  const vigourBase = state.season === 'summer' ? 4 : state.season === 'winter' ? 1 : 3
  const rainBoost = state.climate.weather === 'rain' || state.climate.weather === 'storm' ? 1 : 0
  const vigour = vigourBase + rainBoost
  for (let i = 0; i < vigour; i++) {
    const source = findRandomTile(grid, rng, TREE)
    if (source) {
      const tC = sampleTempC(state.climate, source.x, source.y)
      if (tC < -2) continue
      const moist = sampleMoisture(state.climate, source.x, source.y) + sampleRain(state.climate, source.x, source.y) * 0.35
      const suit = biomeSuitability(tC, moist)
      if (suit.tree < 0.28) continue
      if (resourceDensity(grid, source.x, source.y, 'tree', 3) >= SPREAD_NEIGHBOURS_NEEDED) {
        tryGrowAdjacent(grid, source.x, source.y, TREE, 12, rng)
      }
    }
    const bushSource = findRandomTile(grid, rng, BUSH)
    if (bushSource) {
      const tC = sampleTempC(state.climate, bushSource.x, bushSource.y)
      const biome = sampleBiome(state.climate, bushSource.x, bushSource.y)
      // Hardy tundra / alpine shrubs can creep in the cold; elsewhere freeze still bites.
      const coldOk =
        tC >= 0 || biome === BiomeId.tundra || biome === BiomeId.alpine || biome === BiomeId.boreal
      if (!coldOk) continue
      const moist = sampleMoisture(state.climate, bushSource.x, bushSource.y) + sampleRain(state.climate, bushSource.x, bushSource.y) * 0.35
      const suit = biomeSuitability(tC, moist)
      const bushFloor = biome === BiomeId.tundra || biome === BiomeId.alpine ? 0.12 : 0.25
      if (suit.bush < bushFloor) continue
      if (resourceDensity(grid, bushSource.x, bushSource.y, 'bush', 3) >= SPREAD_NEIGHBOURS_NEEDED) {
        const amt = biome === BiomeId.tundra || biome === BiomeId.desert ? 5 : 8
        tryGrowAdjacent(grid, bushSource.x, bushSource.y, BUSH, amt, rng)
      }
    }
  }
  if (rng() < 0.7) {
    const dirt = findRandomTile(grid, rng, DIRT)
    if (dirt && getClaim(grid, dirt.x, dirt.y) === CLAIM_NONE && grid.amount[dirt.y * grid.width + dirt.x] === 0 && grid.traffic[dirt.y * grid.width + dirt.x] < 20) {
      const tC = sampleTempC(state.climate, dirt.x, dirt.y)
      const moist = sampleMoisture(state.climate, dirt.x, dirt.y)
      const suit = biomeSuitability(tC, moist)
      if (suit.sand > 0.55 && suit.grass < 0.35) {
        setTerrain(grid, dirt.x, dirt.y, SAND)
      } else if (suit.grass > 0.25 && tC > 2) {
        setTerrain(grid, dirt.x, dirt.y, GRASS)
      }
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
