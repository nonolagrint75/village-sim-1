import {
  biomeSuitability,
  boatCurrentSpeedMul,
  coldStress01,
  cropTempFactor,
  fishingCurrentBonus,
  heatStress01,
  sampleMoisture,
  sampleRain,
  sampleTempC,
} from './climate'
import {
  freshStyle,
  furnitureSlots,
  houseFootprint,
  reinforceStyle,
  type HouseFootprint,
} from './architecture'
import {
  emitBuildQueue,
  fallbackLeanPlan,
  footprintFromPlan,
  markBlockDone,
  materialCost,
  nextBuildBlock,
  observeNeighborHomes,
  placeBuildBlock,
  planHomeSpatial,
  rebuildQueueFromDesign,
  rememberBuiltShape,
  structuralBlocksRemaining,
  mirrorTerrainToBlocks,
  allFootprintWalls,
  reclaimIncompleteHome,
  MAX_CONCURRENT_HOME_BUILDS,
  ADULT_HAUL_STONE,
  ADULT_HAUL_WOOD,
  CHILD_HAUL_WOOD,
  assistOwnerTools,
  collabHelpLabelFr,
  fundOwnerBuild,
  haulMaterialsToOwner,
  isActiveHomeSite,
  listOpenBuildSites,
  placeBlockForOwner,
  preferredHaulResource,
  scoreAssistCraftTools,
  scoreFundBuild,
  scoreHaulForBuild,
  scoreHelpBuild,
  scoreHireBuilder,
  settleBuildHelp,
  settleHireAdvance,
  type ChunkStore,
  type HomeNeedFocus,
  type HomePlannerBrief,
  type PlotClimateHint,
  type SpatialHomePlan,
} from './build'
import {
  eatSpot,
  FURNITURE_DEFS,
  furnitureLabelFr,
  hearthSpot,
  markFurnitureDone,
  nextFurnitureJob,
  planFurnitureJobs,
  sleepSpot,
  storeSpot,
  woodCostOf,
  type FurnitureJob,
  type FurnitureKind,
} from './furniture'
import {
  buildHouseLayout,
  describeLayoutFr,
  findRoomAt,
  ROOM_LABEL_FR,
  type HouseLayout,
} from './rooms'
import { getSimConfig } from './simConfig'
import {
  bestCraftableLight,
  bestFuelIn,
  CANDLE_BURN_TICKS,
  cloakWarmth01,
  darknessPressure,
  fuelCount,
  hasHearthPlaced,
  hasUnlitLightItem,
  hearthAnchor,
  hearthIsLit,
  hearthSleepBonus,
  hearthWarmthClo,
  HEARTH_BURN_TICKS,
  homeIsLit,
  homeKeeper,
  isOutdoorsAtNight,
  nightActivityMul,
  personalLight,
  torchIsLit,
  TORCH_BURN_TICKS,
  warmthPressure,
} from './lightWarmth'
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
  soonestSpoilEdibleIn,
  STOREABLE_RESOURCES,
  transferAll,
  tickFoodSpoil,
  NUTRITION,
  type ResourceType,
} from './inventory'
import {
  CRAFT_RECIPES,
  cropDef,
  EDIBLE_PRIORITY,
  isEdible,
  isCookedFood,
  isRiskyRawFood,
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
  doPray,
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
  estimateWealth,
} from './ecology'
import {
  applyGeneticPersonalityBias,
  birthGenetics,
  diseasePressure,
  fertilityModifier,
  kinshipCoefficient,
  oldAgeMortalityChance,
  physicalAptitudeModifiers,
} from './genetics'
import { seedEthnosFromParents, cultureSimilarity, ensureCultureState, ethnosSocialBias, homophilyBias } from './ethnos'
import { fullNameOf, registerBirth } from './family'
import { bondedPartner, isMarriageAge, pedigreeLookup } from './marriage'
import { generateName, inheritPersonality } from './personality'
import { chebyshev, LAND_PROFILE, landWalkable, findLaneBlocker, layCorridor, navigate, nudgeToward, seedTradeCorridor, type PathProfile } from './pathfinding'
import { bestCrossing, isWornRoad, markTraffic, nearestPaveable, stampPlaza, tryPave } from './roads'
import { isShore, type ResourceKind } from './resourceIndex'
import {
  canMineRock,
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
  localOreRichness,
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
  isDependentChild,
  isParentOf,
  childTaskMultiplier,
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
  advanceHomePlanPastShell,
  restoreInterruptedTask,
  clearSavedTask,
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
  upsertSemantic,
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
  CLAIM_WELL,
  CLAIM_PLAZA_FIRE,
  DIRT,
  FENCE,
  GOLD,
  GRASS,
  HOUSE,
  IRON,
  HEARTH,
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
  WELL,
  PLAZA_FIRE,
  WHEAT,
  WORKBENCH,
  type Horse,
  type IllnessKind,
  type Pregnancy,
  type Profession,
  type Season,
  type SimState,
  type Sheep,
  type TaskKind,
  type Villager,
  type Village,
  type Wolf,
} from './types'
import { TICKS_PER_DAY, TICKS_PER_SEASON, TICKS_PER_YEAR } from './calendar'
import { CHILD_AGE, LIFESPAN_SOFT } from './ages'
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
  findWellSite,
  findNearbyShore,
  findNearbyTerrain,
  findNearest,
  findOpenWater,
  ensureLocalSpring,
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
/** Aligné sur `HUNGER_DECAY_PLAY` (physicsScale) : ~6 jours-sim plein→vide. */
const HUNGER_DECAY = 4 / (TICKS_PER_DAY * 6)
/** ~3.5 sim-days after hunger hits 0 before death. */
const STARVE_DEATH_TICKS = Math.round(TICKS_PER_DAY * 3.5)
/** Hydratation 0–4 ; drain ~6 jours-sim plein→vide. */
const THIRST_MAX = 4
const THIRST_DECAY = 4 / (TICKS_PER_DAY * 6)
/** ~3.5 jours-sim à soif nulle avant mort. */
const THIRST_DEATH_TICKS = Math.round(TICKS_PER_DAY * 3.5)
const DRINK_SEARCH_R = 64
/** Accumulation d’exposition avant −1 HP (froid / chaleur). */
const EXPOSURE_HURT = 28
const HEAL_TICKS = 120
const HEAL_HUNGER_THRESHOLD = 3
const VILLAGER_HEALTH_MAX = 6
const ANIMAL_HEALTH_MAX = 2
const HUNGRY_THRESHOLD = 2
const FOOD_TARGET = 5
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
/** Dette de sommeil 0–4 (échelle stamina). */
const SLEEP_DEBT_MAX = 4
/** Accumulation nuit éveillé (par tick). */
const SLEEP_DEBT_NIGHT_AWAKE = 0.055
/** Accumulation jour si déjà endetté (léger). */
const SLEEP_DEBT_DAY_CARRY = 0.008
/** Remboursement repos nuit au lit. */
const SLEEP_DEBT_REST_BED = 0.14
const SLEEP_DEBT_REST_HOME = 0.09
const SLEEP_DEBT_REST_OPEN = 0.04

const TOOL_WEAR_MAX = 28

const SPEAR_WOOD_COST = 3
const STONE_SPEAR_COST = 2
const IRON_TOOL_COST = 4
const WORKBENCH_COST = 4
const CHEST_COST = 5
const BED_COST = 2
const TABLE_COST = 4
const TILE_COST = 1
const WALL_SEGMENT_COST = 1
const BRIDGE_COST = 2
const MILL_WOOD_COST = 4
const MILL_STONE_COST = 2
/** Puits : pierre de cuvelage + bois (margelle). Coûts bas pour que le mandat commun aboutisse. */
const WELL_WOOD_COST = 1
const WELL_STONE_COST = 2
/** Feu de place : bois + pierre de foyer. */
const PLAZA_FIRE_WOOD_COST = 3
const PLAZA_FIRE_STONE_COST = 1
/** Durée d’allumage du feu de place (ticks). */
const PLAZA_FIRE_BURN = Math.round(TICKS_PER_DAY * 0.55)
const CART_WOOD_COST = 5
const CART_STONE_COST = 2
const BOAT_FISH_WOOD_COST = 4
const BOAT_CARGO_WOOD_COST = 6
const BOAT_CARGO_STONE_COST = 3
const PORT_WOOD_COST = 6
const PORT_STONE_COST = 4
const WHEAT_PER_FLOUR = 2
const BREAD_PER_FLOUR = 3
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

const REPRO_HUNGER_THRESHOLD = 2.2
const REPRO_FOOD_STOCK = 1.5
/** Récupération post-partum ≈ 1 mois-sim. */
const REPRO_COOLDOWN = Math.round(TICKS_PER_YEAR / 12)
/** Gestation ≈ 9 mois biologiques (fraction d'année-sim). */
const GESTATION_TICKS = Math.round(TICKS_PER_YEAR * (3 / 12))
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
export const WHEAT_RIPE = 180
const WHEAT_SPROUT = 60
const WHEAT_GREEN = 120
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
const MATERIAL_TRADE_RADIUS = 14
/** Seller must be known locally (village / relation / face-à-face) — no chest radar. */
function canSeeLocalSellerOffer(buyer: Villager, seller: Villager): boolean {
  if (!seller.alive || seller.id === buyer.id || !seller.hasChest || !seller.chestInventory) return false
  const sameVillage = buyer.villageId !== null && buyer.villageId === seller.villageId
  const rel = buyer.relations.get(seller.id)
  const acquainted =
    !!rel &&
    (rel.affinity > 0.12 || rel.respect > 0.2 || (rel.kinship ?? 0) > 0.15 || (rel.debt ?? 0) > 0.1)
  const faceToFace = distance(buyer.x, buyer.y, seller.x, seller.y) <= SOCIAL_RANGE + 3
  if (!sameVillage && !acquainted && !faceToFace) return false
  const dPerson = distance(buyer.x, buyer.y, seller.x, seller.y)
  const dChest = distance(buyer.x, buyer.y, seller.chestX, seller.chestY)
  return Math.min(dPerson, dChest) <= MATERIAL_TRADE_RADIUS
}
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
  // Cold snaps reduce yield via seasonMul; still allow sensing/foraging above freezing.
  if (tempC < -1) return false
  return season !== 'winter' || tempC > 6
}
function sowingSeason(season: Season, tempC = 12): boolean {
  // Aligned with claim threshold — was 0.35 while claim used 0.22 → claimed fields never sowed.
  if (cropTempFactor(tempC) < 0.25) return false
  return season === 'spring' || season === 'summer' || (season === 'autumn' && tempC > 12)
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
      // Build used to burn ~3.2 MET and starve pioneers mid-shell; keep labour costly but survivable.
      activityMet = k.startsWith('build') || k === 'clearLand' ? 2.35 : 2.9
    } else if (k === 'flee' || k === 'fight') {
      activityMet = 4.5
    } else if (k === 'rest' || k === 'eat' || k === 'drink') {
      activityMet = 0.95
    } else if (k === 'gatherFood' || k === 'fish' || k === 'harvestWheat') {
      activityMet = 1.85
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

/** Drain soif : base + chaleur + activité (sueur). */
function villagerThirstDrain(state: SimState, v: Villager): number {
  const air = sampleTempC(state.climate, v.x, v.y)
  const heat = heatStress01(air)
  let mul = 1 + heat * 0.85
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
      mul += 0.35
    } else if (k === 'flee' || k === 'fight') {
      mul += 0.55
    } else if (k === 'rest' || k === 'eat' || k === 'drink') {
      mul *= 0.85
    }
  } else if (atHomeShelter(v)) {
    mul *= 0.9
  }
  return THIRST_DECAY * mul
}

function tickThirst(v: Villager, decayPerTick: number): boolean {
  v.thirst = (Number.isFinite(v.thirst) ? v.thirst : THIRST_MAX * 0.5) - decayPerTick
  if (v.thirst < 0) v.thirst = 0
  if (!Number.isFinite(v.thirstTimer)) v.thirstTimer = 0
  if (v.thirst <= 0) {
    v.thirstTimer += 1
    if (v.thirstTimer >= THIRST_DEATH_TICKS) return true
  } else {
    v.thirstTimer = 0
  }
  return false
}

function infectIllness(v: Villager, kind: IllnessKind, severity: number, durationTicks: number): void {
  // Gut from raw food is miserable, not lethal — never stack it into HP-tick territory.
  const rawCap = kind === 'gut' ? 0.48 : 1
  const sev = Math.max(0.15, Math.min(rawCap, severity))
  const dur = Math.max(18, Math.round(durationTicks))
  if (v.illness && v.illness.remaining > 0) {
    if (kind === 'gut' && v.illness.kind !== 'gut') {
      // Don't overwrite a fever/chill with a tummy ache.
      v.illness.remaining = Math.max(v.illness.remaining, Math.round(dur * 0.5))
      return
    }
    v.illness.severity = Math.min(rawCap, Math.max(v.illness.severity, sev))
    v.illness.remaining = Math.max(v.illness.remaining, dur)
    if (sev >= v.illness.severity) v.illness.kind = kind
    return
  }
  v.illness = { kind, remaining: dur, severity: sev }
}

/** Tick maladie : fatigue + rare −HP si sévère ; guérison naturelle. Retourne true si mort. */
function tickIllness(state: SimState, v: Villager): boolean {
  if (!v.illness || v.illness.remaining <= 0) {
    v.illness = null
    return false
  }
  const ill = v.illness
  ill.remaining -= 1
  spendStamina(v, 0.012 + ill.severity * 0.028)
  // Drain soif/faim un peu plus fort (fièvre).
  if (ill.kind === 'fever' || ill.kind === 'chill') {
    v.thirst = Math.max(0, (Number.isFinite(v.thirst) ? v.thirst : THIRST_MAX) - THIRST_DECAY * 0.35 * ill.severity)
  }
  // Gut = nausea only. HP ticks only for severe fever/chill.
  if (
    (ill.kind === 'fever' || ill.kind === 'chill') &&
    ill.severity > 0.7 &&
    ill.remaining > 0 &&
    ill.remaining % Math.max(40, Math.round(70 - ill.severity * 25)) === 0
  ) {
    v.health -= 1
    if (v.health <= 0) {
      v.alive = false
      state.deaths += 1
      logEvent(state, `${v.name} succombe à la maladie`)
      onDeath(state, v, null)
      return true
    }
  }
  if (ill.remaining <= 0) {
    v.illness = null
    if (v.health < VILLAGER_HEALTH_MAX && (state.tick + v.id) % 5 === 0) {
      v.health = Math.min(VILLAGER_HEALTH_MAX, v.health + 1)
    }
    if ((state.tick + v.id) % 11 === 0) logEvent(state, `${v.name} se rétablit`)
  }
  return false
}

function atHomeShelter(v: Villager): boolean {
  return v.hasHome && distance(v.x, v.y, v.homeX, v.homeY) <= SHELTER_RADIUS
}

/** Isolation thermique : clo du kit porté + âtre vs air local (°C). */
function warmthMultiplier(v: Villager, state: SimState): number {
  const temp = sampleTempC(state.climate, v.x, v.y)
  const cold = coldStress01(temp)
  const heat = heatStress01(temp)
  const rain = !atHomeShelter(v) ? sampleRain(state.climate, v.x, v.y) : 0
  const massKg = bodyMassKgFromPhenotype(v.phenotype)
  const heightM = heightMetersFromPhenotype(v.phenotype)
  const gear = equipmentEffectsOf(v)
  const hearthClo = hearthWarmthClo(state, v)
  return thermalBurnMultiplier({
    cold01: cold,
    heat01: heat,
    rain01: rain,
    night: isNight(state.tick),
    sheltered: atHomeShelter(v) || nearWarmFireLocal(state, v),
    // Clo = kit porté + âtre ; textiles dans le sac ne chauffent pas.
    clo: clothingClo(false, false, gear.clo + hearthClo),
    massKg,
    heightM,
  })
}

function nearWarmFireLocal(state: SimState, v: Villager): boolean {
  if (torchIsLit(v, state.tick)) return true
  const village = state.villages.find((vg) => vg.id === v.villageId)
  if (village?.hasPlazaFire && village.plazaFireLitUntil > state.tick) {
    if (distance(v.x, v.y, village.plazaFireX, village.plazaFireY) <= 6) return true
  }
  if (!v.hasHome) return false
  const keeper = homeKeeper(state, v)
  if (!hearthIsLit(keeper, state.tick)) return false
  const a = hearthAnchor(keeper)
  return distance(v.x, v.y, a.x, a.y) <= 5
}

/** Deux voisins assoiffés / frileux → mandat communal (sans puits/feu perso). */
function maybeCommunityInfraVotes(state: SimState, village: Village) {
  // Compte aussi les voisins proches pas encore enregistrés comme membres.
  const near: Villager[] = []
  for (const o of state.villagers) {
    if (!o.alive) continue
    if (o.villageId === village.id) {
      near.push(o)
      continue
    }
    if (o.villageId === null && distance(o.x, o.y, village.centerX, village.centerY) <= 36) {
      near.push(o)
      if (!village.memberIds.includes(o.id)) village.memberIds.push(o.id)
      o.villageId = village.id
    }
  }
  if (near.length < 2) return
  if (!village.wellAgreed) {
    const thirsty = near.filter((m) => (Number.isFinite(m.thirst) ? m.thirst : 4) < 2.55 || (m.thirstTimer ?? 0) > 0)
    // Early camp: agree well as soon as two people are drying out (was 2.05 — too late).
    if (
      thirsty.length >= 2 ||
      (near.length >= 3 && state.tick > TICKS_PER_DAY && thirsty.length >= 1) ||
      (near.length >= 4 && state.tick > TICKS_PER_DAY * 2 && thirsty.length >= 1)
    ) {
      village.wellAgreed = true
      logEvent(state, `le village décide ensemble de creuser un puits (${thirsty.length} assoiffés)`)
    }
  }
  if (!village.plazaFireAgreed) {
    const homelessN = near.filter((m) => !m.hasHome).length
    const cold = near.filter(
      (m) => !m.hasHome || (m.coldExposure ?? 0) > 1.2 || (isNight(state.tick) && !atHomeShelter(m)),
    )
    // Seed7 cold die early — agree plaza fire from day 0 once 2+ homeless / chilly.
    if (
      cold.length >= 2 ||
      homelessN >= 2 ||
      (homelessN >= 1 && isNight(state.tick)) ||
      (near.filter((m) => !m.hasHome).length >= 3 && state.tick > TICKS_PER_DAY)
    ) {
      village.plazaFireAgreed = true
      logEvent(state, `le village décide ensemble d’un feu sur la place (${cold.length} frileux)`)
    }
  }
}

/** Site encore utilisable pour un chantier civique (pas maison / mur / meuble). */
function civicSiteStillOpen(grid: WorldGrid, x: number, y: number): boolean {
  if (!inBounds(grid, x, y)) return false
  const t = getTerrain(grid, x, y)
  if (t === HOUSE || t === WALL_WOOD || t === WALL_STONE || t === FENCE || t === MILL || t === PORT) return false
  if (t === BED || t === CHEST || t === TABLE || t === HEARTH || t === WORKBENCH) return false
  if (t === WATER || t === MOUNTAIN) return false
  return true
}

function syncWellIfPresent(state: SimState, village: Village) {
  if (village.hasWell) return
  if (village.wellX >= 0 && getTerrain(state.grid, village.wellX, village.wellY) === WELL) {
    village.hasWell = true
    setClaim(state.grid, village.wellX, village.wellY, CLAIM_WELL)
    return
  }
  // Orphan WELL near centre (legacy / interrupted build).
  const found = findNearest(
    state.grid,
    village.centerX,
    village.centerY,
    48,
    (x, y) => getTerrain(state.grid, x, y) === WELL,
  )
  if (found) {
    village.hasWell = true
    village.wellX = found.x
    village.wellY = found.y
    village.wellAgreed = true
    setClaim(state.grid, found.x, found.y, CLAIM_WELL)
  }
}

function syncPlazaFireIfPresent(state: SimState, village: Village) {
  if (village.hasPlazaFire) return
  if (village.plazaFireX >= 0 && getTerrain(state.grid, village.plazaFireX, village.plazaFireY) === PLAZA_FIRE) {
    village.hasPlazaFire = true
    setClaim(state.grid, village.plazaFireX, village.plazaFireY, CLAIM_PLAZA_FIRE)
    return
  }
  const found = findNearest(
    state.grid,
    village.centerX,
    village.centerY,
    48,
    (x, y) => getTerrain(state.grid, x, y) === PLAZA_FIRE,
  )
  if (found) {
    village.hasPlazaFire = true
    village.plazaFireX = found.x
    village.plazaFireY = found.y
    village.plazaFireAgreed = true
    setClaim(state.grid, found.x, found.y, CLAIM_PLAZA_FIRE)
  }
}

function ensureVillageWellSite(state: SimState, village: Village): boolean {
  syncWellIfPresent(state, village)
  if (village.hasWell || !village.wellAgreed) return village.hasWell
  if (village.wellX >= 0) {
    if (getTerrain(state.grid, village.wellX, village.wellY) === WELL) {
      village.hasWell = true
      return true
    }
    if (civicSiteStillOpen(state.grid, village.wellX, village.wellY)) {
      setClaim(state.grid, village.wellX, village.wellY, CLAIM_WELL)
      return false
    }
    // Ancien emplacement écrasé — on libère et on rechoisit.
    if (getClaim(state.grid, village.wellX, village.wellY) === CLAIM_WELL) {
      setClaim(state.grid, village.wellX, village.wellY, CLAIM_NONE)
    }
    village.wellX = -1
    village.wellY = -1
  }
  const site =
    findWellSite(state.grid, village.centerX, village.centerY, 40) ??
    findWellSite(state.grid, village.centerX, village.centerY, 64)
  if (!site) return false
  village.wellX = site.x
  village.wellY = site.y
  setClaim(state.grid, site.x, site.y, CLAIM_WELL)
  return false
}

function ensureVillagePlazaFireSite(state: SimState, village: Village): boolean {
  syncPlazaFireIfPresent(state, village)
  if (village.hasPlazaFire) return true
  if (!village.plazaFireAgreed) return false
  if (village.plazaFireX >= 0) {
    if (getTerrain(state.grid, village.plazaFireX, village.plazaFireY) === PLAZA_FIRE) {
      village.hasPlazaFire = true
      return true
    }
    if (civicSiteStillOpen(state.grid, village.plazaFireX, village.plazaFireY)) {
      setClaim(state.grid, village.plazaFireX, village.plazaFireY, CLAIM_PLAZA_FIRE)
      return false
    }
    if (getClaim(state.grid, village.plazaFireX, village.plazaFireY) === CLAIM_PLAZA_FIRE) {
      setClaim(state.grid, village.plazaFireX, village.plazaFireY, CLAIM_NONE)
    }
    village.plazaFireX = -1
    village.plazaFireY = -1
  }
  const site =
    findNearest(
      state.grid,
      village.centerX,
      village.centerY,
      12,
      (x, y) =>
        getClaim(state.grid, x, y) === CLAIM_NONE &&
        (isBuildableGround(state.grid, x, y) ||
          getTerrain(state.grid, x, y) === PATH ||
          getTerrain(state.grid, x, y) === ROAD ||
          getTerrain(state.grid, x, y) === TRAIL ||
          getTerrain(state.grid, x, y) === DIRT ||
          getTerrain(state.grid, x, y) === GRASS),
    ) ?? findWellSite(state.grid, village.centerX, village.centerY, 16)
  if (!site) return false
  village.plazaFireX = site.x
  village.plazaFireY = site.y
  setClaim(state.grid, site.x, site.y, CLAIM_PLAZA_FIRE)
  return false
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

function ensureSleepDebt(v: Villager): number {
  if (!Number.isFinite(v.sleepDebt)) v.sleepDebt = 0
  return v.sleepDebt
}

function addSleepDebt(v: Villager, amount: number) {
  v.sleepDebt = Math.min(SLEEP_DEBT_MAX, ensureSleepDebt(v) + amount)
}

function paySleepDebt(v: Villager, amount: number) {
  v.sleepDebt = Math.max(0, ensureSleepDebt(v) - amount)
}

/**
 * Dette de sommeil : monte la nuit sans `rest`, baisse en dormant.
 * À appeler chaque tick villageois (hors tâche rest — rest paie via executeTask).
 */
function tickSleepDebt(state: SimState, v: Villager) {
  const resting = v.task?.kind === 'rest'
  const night = isNight(state.tick)
  if (resting) return // remboursé dans case 'rest'
  if (night) {
    // Travail / veille nocturne → dette forte ; dehors encore plus.
    const outdoor = !atHomeShelter(v)
    addSleepDebt(v, SLEEP_DEBT_NIGHT_AWAKE * (outdoor ? 1.35 : 1) * (v.task && v.task.kind !== 'idle' ? 1.15 : 1))
  } else if (ensureSleepDebt(v) > 1.2) {
    // Carryover diurne soft — pas de remise à zéro magique au matin.
    addSleepDebt(v, SLEEP_DEBT_DAY_CARRY)
  }
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
  } else if (kind === 'gatherStone') {
    // Surface cobbles — hand-gatherable; not the same gate as mountain dig.
    if (v.toolTier === 'none') base = 0.32
    else if (v.toolTier === 'wood') base = 0.48
    else if (v.toolTier === 'stone') base = 0.62
    else base = 0.78
    if (v.profession === 'mason' || v.profession === 'miner') base += 0.1
  } else if (kind === 'gatherIron' || kind === 'mineTunnel' || kind === 'mineGold') {
    if (v.toolTier === 'none') base = 0.08
    else if (v.toolTier === 'wood') base = 0.22
    else if (v.toolTier === 'stone') base = 0.48
    else base = 0.72
    if (v.profession === 'miner' || v.profession === 'mason') base += 0.1
  } else if (kind === 'buildHouse' || kind === 'helpBuild' || kind === 'buildWall' || kind === 'buildBridge' || kind === 'buildPen' || kind === 'buildProject') {
    base = v.toolTier === 'none' ? 0.45 : v.toolTier === 'wood' ? 0.62 : v.toolTier === 'stone' ? 0.75 : 0.88
    if (v.profession === 'builder') base += 0.18
    else if (v.profession === 'mason') base += 0.12
    else if (v.ambition === 'builder') base += 0.08
    // Practiced builders place faster / more reliably.
    base += mindOf(v).skills.build * 0.12
  } else if (kind === 'haulForBuild') {
    base = 0.72
    if (v.profession === 'farmer' || v.profession === 'lumberjack') base += 0.08
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
  if ((Number.isFinite(v.thirst) ? v.thirst : THIRST_MAX) < 1) base *= 0.72
  if (v.illness && v.illness.remaining > 0) {
    base *= Math.max(0.28, 0.72 - v.illness.severity * 0.4)
  }
  const debt = ensureSleepDebt(v)
  if (debt > 2.2) base *= Math.max(0.35, 1 - (debt - 2.2) * 0.22)
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
  if (
    kind === 'buildWorkbench' ||
    kind === 'buildChest' ||
    kind === 'buildBed' ||
    kind === 'buildTable' ||
    kind === 'buildBench' ||
    kind === 'buildStool' ||
    kind === 'buildShelf' ||
    kind === 'buildCupboard' ||
    kind === 'buildCradle' ||
    kind === 'buildLoom' ||
    kind === 'buildWashingTub'
  )
    return 2.2
  if (kind === 'buildCart' || kind === 'buildBoat') return 3.5
  if (kind === 'craftSpear' || kind === 'craftStoneSpear') return 1.6
  if (kind === 'craftIronTool' || kind === 'craftGear') return 2.8
  if (kind === 'makeCharcoal') return 2.0
  if (kind === 'craftGoods') return 2.2
  if (kind === 'weaveCloth' || kind === 'sewClothing' || kind === 'tanHide') return 2.0
  if (kind === 'grindFlour') return 1.8
  if (kind === 'bakeBread') return 2.0
  if (kind === 'mintCoins') return 2.4
  if (kind === 'eat') return 2.0
  if (kind === 'experiment') return 2.4
  if (kind === 'buildPort' || kind === 'buildMill' || kind === 'buildWell' || kind === 'buildPlazaFire') return 4
  return 1
}

function dropCarriedGold(state: SimState, v: Villager) {
  const carried = countOf(v.inventory, 'gold')
  if (carried > 0 && isBuildableGround(state.grid, v.x, v.y)) setTerrain(state.grid, v.x, v.y, LOOT, carried)
}

function homeFootprint(v: Villager): HouseFootprint | null {
  if (!v.house || v.homeX < 0) return null
  if (v.homePlan) return footprintFromPlan(v.homePlan, v.homeX, v.homeY)
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

/** Sync villager flags when starter / crafted furniture lands on the grid. */
function applyFurnitureOwnership(v: Villager, job: FurnitureJob) {
  if (job.kind === 'bed') {
    v.bedCount = Math.max(
      v.bedCount,
      v.furnitureQueue.filter((j) => j.kind === 'bed' && j.done).length,
    )
  } else if (job.kind === 'chest') {
    v.hasChest = true
    v.chestX = job.x
    v.chestY = job.y
    if (!v.chestInventory) v.chestInventory = createInventory(20)
  } else if (job.kind === 'table') {
    v.hasTable = true
    v.tableX = job.x
    v.tableY = job.y
  } else if (job.kind === 'hearth') {
    if (!v.homeFurniture.some((f) => f.id === 'hearth')) {
      v.homeFurniture.push({ id: 'hearth', x: job.x, y: job.y })
    }
  } else if (job.kind === 'workbench') {
    v.hasWorkbench = true
    v.workbenchX = job.x
    v.workbenchY = job.y
  }
}

/** After exterior walls are fully placed: queue furniture jobs for villagers to craft (never stamp). */
function queueFurnitureAfterShell(v: Villager, layout: HouseLayout) {
  seedFurnitureQueue(v, layout)
}

/**
 * Exterior walls 100% placed → livable shell (hasHome).
 * Floors stay in the build queue (block-by-block). Furniture is crafted via furnitureQueue — never auto-stamped.
 */
function tryCloseHomeShell(state: SimState, v: Villager): boolean {
  if (v.hasHome || !v.house || v.homeX < 0) return false
  const grid = state.grid
  const fp = homeFootprint(v)
  if (!fp || fp.walls.length === 0) return false
  ensureBuildQueue(v, grid, () => 0.5)
  if (structuralBlocksRemaining(v.buildQueue) > 0) return false
  // All planned exterior walls must actually be on the grid (no free seal / stamp).
  const exteriorPlaced = fp.walls.filter((c) => {
    const t = getTerrain(grid, c.x, c.y)
    return t === HOUSE || t === WALL_WOOD || t === WALL_STONE
  }).length
  if (exteriorPlaced < fp.walls.length) return false

  for (const c of [...allFootprintWalls(fp), ...fp.interior, ...fp.open, fp.door]) {
    if (!needsClearing(grid, c.x, c.y)) continue
    const t = getTerrain(grid, c.x, c.y)
    if (t === TREE || t === BUSH) setTerrain(grid, c.x, c.y, DIRT, 0)
  }
  v.hasHome = true
  v.homeOwnerId = v.id
  const layout = ensureHomeLayout(v)
  if (layout) queueFurnitureAfterShell(v, layout)
  advanceHomePlanPastShell(mindOf(v))
  return true
}

/** Village join + milestones after a shell first becomes livable (owner or helper). */
function celebrateFirstHome(state: SimState, v: Villager, rng: () => number) {
  const fp = homeFootprint(v)
  if (!fp || !v.hasHome) return
  const grid = state.grid
  const layout = v.homeLayout
  const shapeFr: Record<string, string> = {
    square: 'carrée',
    rect: 'rectangulaire',
    round: 'ronde',
    ell: 'en L',
    courtyard: 'à cour',
    longhouse: 'longue',
  }
  if (layout) {
    const tag = v.homePlan?.cultureTags[0] ? ` [${v.homePlan.cultureTags[0]}]` : ''
    logEvent(
      state,
      `${v.name} a bâti une maison ${shapeFr[v.house?.shape ?? 'square'] ?? 'carrée'} — ${describeLayoutFr(layout)}${tag}`,
    )
  } else {
    logEvent(state, `${v.name} a bâti une maison ${shapeFr[v.house?.shape ?? 'square'] ?? 'carrée'}`)
  }
  const joinRadius = VILLAGE_JOIN_RADIUS * (0.5 + v.personality.sociability)
  const village = findOrCreateVillage(state, v.homeX, v.homeY, joinRadius, rng)
  if (!village.memberIds.includes(v.id)) village.memberIds.push(v.id)
  v.villageId = village.id
  if (v.house) {
    reinforceStyle(village.style, v.house.shape)
    rememberBuiltShape(village.style, v.house.shape)
  }
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
}

function taskForFurniture(kind: FurnitureKind): TaskKind {
  return FURNITURE_DEFS[kind].buildTask
}

function woodNeededForFurniture(kind: FurnitureKind): number {
  if (kind === 'bed') return BED_COST
  if (kind === 'chest' || kind === 'cupboard' || kind === 'shelf' || kind === 'tub') return CHEST_COST
  if (kind === 'workbench' || kind === 'loom') return WORKBENCH_COST
  if (kind === 'hearth') return woodCostOf('hearth')
  if (kind === 'table' || kind === 'bench' || kind === 'stool') return TABLE_COST
  return woodCostOf(kind)
}

/** True when a housed owner still needs to craft the first bed. */
function needsFirstBed(v: Villager): boolean {
  if (!v.hasHome) return false
  if (v.furnitureQueue.some((j) => j.kind === 'bed' && j.done)) return false
  if (v.bedCount > 0) return false
  return v.furnitureQueue.some((j) => j.kind === 'bed' && !j.done)
}

/**
 * Free pack space for timber — never throw away meals.
 * Only shed non-edible ballast (resin/herbs/extra wheat).
 */
function freePackForWood(v: Villager, need: number): void {
  const have = countOf(v.inventory, 'wood')
  if (have >= need) return
  if (freeSlotSpace(v.inventory, 'wood') >= need - have) return
  const dumpOrder: ResourceType[] = ['resin', 'herbs', 'sage', 'garlic', 'hide', 'wool']
  for (const typ of dumpOrder) {
    if (freeSlotSpace(v.inventory, 'wood') >= need - countOf(v.inventory, 'wood')) return
    const n = countOf(v.inventory, typ)
    if (n > 0) removeFromInventory(v.inventory, typ, Math.min(n, 2))
  }
  // Last resort: spare wheat only if we keep seeds + food meals intact.
  const wheat = countOf(v.inventory, 'wheat')
  if (wheat > 2 && freeSlotSpace(v.inventory, 'wood') < need - countOf(v.inventory, 'wood')) {
    removeFromInventory(v.inventory, 'wheat', Math.min(wheat - 2, 2))
  }
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

function samplePlotClimate(state: SimState, x: number, y: number): PlotClimateHint {
  const climate = state.climate
  const tempC = sampleTempC(climate, x, y)
  const moisture = sampleMoisture(climate, x, y)
  const grid = state.grid
  const r = 8
  let cells = 0
  let stone = 0
  let timber = 0
  let water = false
  for (let yy = y - r; yy <= y + r; yy++) {
    for (let xx = x - r; xx <= x + r; xx++) {
      if (!inBounds(grid, xx, yy)) continue
      cells++
      const t = getTerrain(grid, xx, yy)
      if (t === STONE) stone++
      if (t === TREE || t === BUSH) timber++
      if (t === WATER) water = true
    }
  }
  const denom = Math.max(1, cells)
  return {
    tempC,
    moisture,
    stoneAccess: stone / denom,
    timberAccess: timber / denom,
    nearWater: water,
  }
}

function inferNeedFocus(state: SimState, v: Villager, mode: 'new' | 'expand'): HomeNeedFocus[] {
  const focus: HomeNeedFocus[] = mode === 'new' ? ['shelter'] : []
  const hh = householdSize(state, v)
  if (v.sleepDebt > 1.2 || hh >= 3) focus.push('sleep')
  if (v.profession === 'blacksmith' || v.profession === 'builder' || v.profession === 'mason' || v.ambition === 'builder') {
    focus.push('workshop')
  }
  if (v.profession === 'trader' || v.profession === 'farmer' || countOf(v.inventory, 'coin') > 12) {
    focus.push('storage')
  }
  if (hh >= 2 || v.personality.sociability > 0.55) focus.push('kitchen')
  if (v.personality.ambition > 0.7) focus.push('prestige')
  if (coldStress01(sampleTempC(state.climate, v.x, v.y)) > 0.35) focus.push('warmth')
  return focus
}

function makePlannerBrief(
  state: SimState,
  v: Villager,
  mode: 'new' | 'expand',
  nearX: number,
  nearY: number,
): HomePlannerBrief {
  const artisan =
    v.profession === 'mason' ||
    v.profession === 'builder' ||
    v.profession === 'blacksmith' ||
    v.profession === 'miller'
  const merchant = v.profession === 'trader' || v.profession === 'farmer'
  const village = state.villages.find((g) => g.id === v.villageId)
  return {
    personality: v.personality,
    profession: v.profession,
    wealth: countOf(v.inventory, 'coin') + (v.chestInventory ? countOf(v.chestInventory, 'coin') : 0),
    household: householdSize(state, v),
    woodOnHand: countOf(v.inventory, 'wood'),
    stoneOnHand: countOf(v.inventory, 'stone'),
    buildSkill: mindOf(v).skills.build,
    climate: samplePlotClimate(state, nearX, nearY),
    neighbors: observeNeighborHomes(state, v),
    existing: mode === 'expand' ? v.house : null,
    mode,
    needFocus: inferNeedFocus(state, v, mode),
    artisan,
    merchant,
    stylePrior: village ? village.style : null,
  }
}

function ensureBuildQueue(v: Villager, grid: WorldGrid, rng: () => number): void {
  if (!v.house || v.homeX < 0) return
  if (v.buildQueue.length > 0) return
  if (v.homePlan) {
    v.buildQueue = emitBuildQueue(v.homePlan, v.homeX, v.homeY, rng, { onlyMissing: true, grid })
    return
  }
  v.buildQueue = rebuildQueueFromDesign(v.house, v.homeX, v.homeY, rng, grid)
}

/** Expand rooms when wealth / family outgrow the current plan — dynamic planner, not a larger template. */
function maybeExpandHome(state: SimState, v: Villager, rng: () => number): boolean {
  if (!v.hasHome || v.homeOwnerId !== v.id || !v.house) return false
  ensureBuildQueue(v, state.grid, rng)
  if (structuralBlocksRemaining(v.buildQueue) > 0) return false

  const wood = countOf(v.inventory, 'wood')
  const stone = countOf(v.inventory, 'stone')
  if (wood + stone < TILE_COST) return false

  const brief = makePlannerBrief(state, v, 'expand', v.homeX, v.homeY)
  // Occasional skip to avoid thrash.
  if (rng() > 0.4 && brief.wealth < 12 && brief.household <= (v.house.bedSlots ?? 1) && !brief.needFocus.includes('workshop')) {
    return false
  }

  const prevFp = houseFootprint(v.house, v.homeX, v.homeY)
  const prevKeys = new Set(allFootprintWalls(prevFp).map((c) => `${c.x},${c.y}`))
  const plan = planHomeSpatial(brief, rng)
  const grew = plan.design.rx > v.house.rx || plan.design.ry > v.house.ry
  const fp = footprintFromPlan(plan, v.homeX, v.homeY)
  const queue = emitBuildQueue(plan, v.homeX, v.homeY, rng, {
    onlyMissing: true,
    grid: state.grid,
    previousWalls: prevKeys,
  })
  const pending = queue.filter((b) => !b.done)
  if (pending.length === 0 && plan.design.roomKinds.join() === (v.house.roomKinds ?? []).join()) {
    return false
  }

  if (pending.length === 0) {
    removeFromInventory(v.inventory, 'wood', TILE_COST)
  }

  v.house = plan.design
  v.homePlan = plan
  v.buildQueue = queue
  claimCells(state.grid, allFootprintWalls(fp), CLAIM_HOUSE)
  claimCells(state.grid, fp.interior, CLAIM_HOUSE)
  claimCells(state.grid, fp.open, CLAIM_HOUSE)

  const roomsFr = plan.design.roomKinds.map((k) => ROOM_LABEL_FR[k]).join(', ')
  if (pending.length > 0) {
    v.homeLayout = null
    logEvent(
      state,
      grew
        ? `${v.name} entreprend d'agrandir (${pending.length} blocs, ${roomsFr})`
        : `${v.name} entreprend d'aménager : ${roomsFr} (${pending.length} blocs)`,
    )
    return true
  }

  v.homeLayout = buildHouseLayout(plan.design, fp)
  const fresh = planFurnitureJobs(v.homeLayout, {
    beds: plan.design.bedSlots,
    wantWorkshop: plan.design.hasWorkshop,
    wantStore: plan.design.hasStoreroom,
    household: brief.household,
  })
  const existingKeys = new Set(v.furnitureQueue.map((j) => `${j.kind}@${j.roomKind}`))
  for (const j of fresh) {
    if (!existingKeys.has(`${j.kind}@${j.roomKind}`)) v.furnitureQueue.push(j)
  }
  logEvent(state, `${v.name} aménage de nouvelles pièces : ${roomsFr}`)
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
  const lit = personalLight(v, state.tick)
  let mps = walkSpeedMps({
    embarked: v.embarked,
    boatKind: boat?.kind,
    currentMul,
    hasCart: v.hasCart,
    mounted: v.mounted,
    terrain: t,
    loadRatio: encumbranceRatio(v),
    stamina01: v.stamina / STAMINA_MAX,
    night: isNight(state.tick) && !lit,
    cold01: coldStress01(air),
    heat01: heatStress01(air),
    storm: state.climate.weather === 'storm',
    sheltered: atHomeShelter(v) || nearWarmFireLocal(state, v),
    endurance01: v.phenotype.enduranceBias,
  })
  // Lit torch softens residual night drag even when night flag stays for ambience.
  if (isNight(state.tick) && lit && !v.mounted && !v.embarked) mps *= 1.08
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
  for (const c of [...allFootprintWalls(fp), ...fp.interior, ...fp.open, fp.door]) {
    if (needsClearing(grid, c.x, c.y)) return c
  }
  return null
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
    hasWell: false,
    wellX: -1,
    wellY: -1,
    wellAgreed: false,
    hasPlazaFire: false,
    plazaFireX: -1,
    plazaFireY: -1,
    plazaFireAgreed: false,
    plazaFireLitUntil: 0,
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
  syncWellIfPresent(state, village)
  syncPlazaFireIfPresent(state, village)
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
  const oreRich = localOreRichness(grid, ox, oy, 26)
  const localT = sampleTempC(state.climate, ox, oy)
  const farmClimate = cropTempFactor(localT)
  const coldPasture = localT < 7 || farmClimate < 0.3
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
  const mountainLead = mountainNear > 10 && mountainNear >= woodNear * 0.7 && oreRich > 8
  const ironLead = (ironNear > 4 || oreRich > 40) && ironNear + oreRich * 0.08 >= Math.max(woodNear * 0.25, stoneNear * 0.4)

  const scores: Record<Profession, number> = {
    none: 0,
    forager: berriesNear * 1.4 + p.curiosity * 20 - countJob('forager') * 12 + (coldPasture ? 18 : 0),
    // No forever-farmers on tundra: climate multiplies plough jobs hard.
    farmer:
      ((24 - Math.min(berriesNear, 24)) * 1.5 + p.ambition * 14 + fieldsInVillage * 8 - countJob('farmer') * 8) *
        (0.15 + farmClimate) -
      (farmClimate < 0.25 ? 45 : 0),
    fisher: (water ? 48 : -50) + p.curiosity * 12 - countJob('fisher') * 10 + (shoreLead ? 28 : 0) + (coldPasture && water ? 22 : 0),
    miller:
      (village?.hasMill ? 42 : wheatStock >= 2 || fieldsInVillage > 0 ? 12 : -30) * (0.35 + farmClimate * 0.65) +
      p.ambition * 12 -
      countJob('miller') * 30 -
      (farmClimate < 0.25 && wheatStock < 4 ? 35 : 0),
    lumberjack: woodNear * 1.35 + p.ambition * 18 - countJob('lumberjack') * 12 + (forestLead ? 26 : 0) + (coldPasture && woodNear > 8 ? 14 : 0),
    mason: stoneNear * 1.25 + p.ambition * 15 - countJob('mason') * 12 + (mountainLead && !ironLead ? 10 : 0),
    guard: wolvesNear * 14 + p.courage * 34 - countJob('guard') * 14,
    builder: p.ambition * 28 + p.sociability * 18 - countJob('builder') * 10,
    herder:
      (pensInVillage > 0 ? 28 : 10) +
      (20 - Math.min(berriesNear, 20)) * 1.1 +
      p.generosity * 16 -
      countJob('herder') * 12 +
      (coldPasture ? 24 : 0),
    trader:
      (village?.hasPort ? 22 : 0) +
      (village && village.attractiveness > 40 ? 12 : 0) +
      (1 - p.generosity) * 30 +
      p.sociability * 20 -
      countJob('trader') * 14 +
      (coldPasture ? 10 : 0),
    weaver: (pensInVillage > 0 ? 35 : 8) + p.sociability * 18 + p.curiosity * 10 - countJob('weaver') * 12,
    blacksmith: ironNear * 1.45 + oreRich * 0.12 + p.ambition * 20 - countJob('blacksmith') * 14 + (ironLead ? 22 : 0),
    // Miners need real ore — bare rock without veins is quarry/mason work.
    miner:
      mountainNear * 0.55 +
      oreRich * 0.35 +
      p.ambition * 24 +
      p.courage * 12 -
      countJob('miner') * 16 +
      (mountainLead ? 28 : 0) -
      (oreRich < 6 ? 40 : 0),
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
      base = kind === 'gatherFood' ? 2.0 : 1
      break
    case 'farmer':
      base =
        kind === 'sowField' || kind === 'harvestWheat'
          ? 2.35
          : kind === 'haulForBuild'
            ? 1.65
            : kind === 'gatherFood'
              ? 1.35
              : 1
      break
    case 'fisher':
      base = kind === 'fish' || kind === 'buildBoat' ? 2.5 : 1
      break
    case 'miller':
      base = kind === 'buildMill' ? 2.6 : kind === 'grindFlour' || kind === 'bakeBread' ? 2.5 : 1
      break
    case 'lumberjack':
      base =
        kind === 'gatherWood' || kind === 'clearLand'
          ? 2.15
          : kind === 'haulForBuild'
            ? 1.7
            : 1
      break
    case 'mason':
      base =
        kind === 'gatherStone' ||
        kind === 'buildWall' ||
        kind === 'mineTunnel' ||
        kind === 'buildHouse' ||
        kind === 'helpBuild' ||
        kind === 'buildProject' ||
        kind === 'buildWell' ||
        kind === 'buildPlazaFire'
          ? kind === 'helpBuild' || kind === 'buildHouse'
            ? 2.15
            : 2.0
          : 1
      break
    case 'guard':
      base =
        kind === 'craftSpear' ||
        kind === 'craftStoneSpear' ||
        kind === 'gatherStone' ||
        kind === 'buildWall' ||
        kind === 'defend' ||
        kind === 'fight'
          ? 2.0
          : 1
      break
    case 'builder':
      base =
        kind === 'buildHouse' ||
        kind === 'helpBuild' ||
        kind === 'haulForBuild' ||
        kind === 'hireBuilder' ||
        kind === 'assistCraftTools' ||
        kind === 'buildProject' ||
        kind === 'buildWall' ||
        kind === 'buildBridge' ||
        kind === 'buildMill' ||
        kind === 'buildPort' ||
        kind === 'buildWell' ||
        kind === 'buildPlazaFire' ||
        kind === 'clearLand' ||
        kind === 'gatherStone' ||
        kind === 'buildWorkbench'
          ? 2.1
          : 1
      break
    case 'weaver':
      base =
        kind === 'weaveCloth' || kind === 'sewClothing' || kind === 'craftGear'
          ? 2.5
          : kind === 'helpBuild' || kind === 'haulForBuild'
            ? 1.35
            : 1
      break
    case 'blacksmith':
      base =
        kind === 'gatherIron' || kind === 'craftIronTool' || kind === 'mineTunnel' || kind === 'makeCharcoal' || kind === 'craftGear'
          ? 2.5
          : kind === 'assistCraftTools' || kind === 'helpBuild'
            ? 1.7
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
          : kind === 'haulForBuild' || kind === 'hireBuilder'
            ? 1.55
            : 1
      break
    case 'miner':
      base =
        kind === 'mineTunnel' || kind === 'gatherIron' || kind === 'gatherStone'
          ? 2.6
          : kind === 'helpBuild' || kind === 'haulForBuild'
            ? 1.4
            : 1
      break
    case 'herder':
      base =
        kind === 'captureSheep' || kind === 'feedPen' || kind === 'buildPen' || kind === 'tameHorse' || kind === 'tanHide'
          ? 2.2
          : 1
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
      return kind === 'buildBed' || kind === 'buildHouse' || kind === 'helpBuild' || kind === 'haulForBuild' || kind === 'giveFood'
        ? 1.5
        : 1
    case 'protector':
      return kind === 'buildWall' || kind === 'craftStoneSpear' || kind === 'defend' || kind === 'fight' ? 1.6 : 1
    case 'builder':
      return kind.startsWith('build') || kind === 'helpBuild' || kind === 'haulForBuild' || kind === 'assistCraftTools' || kind === 'clearLand'
        ? 1.5
        : 1
    case 'explorer':
      return kind === 'idle' ? 2.4 : kind === 'tameHorse' || kind === 'tradeRun' ? 2 : 1
    case 'revenge':
      return kind === 'confront' ? 3.5 : 1
    case 'leader':
      return kind === 'socialise' ||
        kind === 'buildWall' ||
        kind === 'giveFood' ||
        kind === 'helpBuild' ||
        kind === 'hireBuilder' ||
        kind === 'buildMill' ||
        kind === 'buildPort'
        ? 1.5
        : 1
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

function bestEdible(v: Villager, tick?: number): ResourceType | null {
  // Prefer perishables first so starter bread isn't burned while berries spoil.
  // Always fall back to any edible (grain/wheat) — spoil-only pick starved pioneers on wheat.
  if (tick != null) return soonestSpoilEdibleIn(v.inventory, tick) ?? bestEdibleIn(v.inventory)
  return soonestSpoilEdibleIn(v.inventory, 0) ?? bestEdibleIn(v.inventory)
}

/** Prefer table when housed — travel time is intentional (no teleport meals). */
function eatTarget(v: Villager): { x: number; y: number } {
  // Critical hunger: eat where you stand — walking to a distant table kills pioneers.
  if (v.hunger < 1.55 || v.starveTimer > 0) {
    return { x: Math.round(v.x), y: Math.round(v.y) }
  }
  const table = eatSpot(v.furnitureQueue, v.homeLayout)
  if (table && v.hasHome && v.hasTable) return table
  if (v.hasTable) return { x: v.tableX, y: v.tableY }
  return { x: Math.round(v.x), y: Math.round(v.y) }
}

/** Rive / cuve / puits / eau sous les pieds — source d’hydratation. */
function drinkTarget(state: SimState, v: Villager): { x: number; y: number } | null {
  const grid = state.grid
  if (v.embarked || getTerrain(grid, v.x, v.y) === WATER) {
    return { x: Math.round(v.x), y: Math.round(v.y) }
  }
  // Village well first when present (shared, close to camp).
  const village = state.villages.find((vg) => vg.id === v.villageId)
  if (village?.hasWell && village.wellX >= 0) {
    return { x: village.wellX, y: village.wellY }
  }
  // Any dug well in range (personal / neighbour).
  const well = findNearest(grid, v.x, v.y, DRINK_SEARCH_R, (x, y) => getTerrain(grid, x, y) === WELL)
  if (well) return well
  if (v.hasHome) {
    // Only a *placed* tub counts — planned furniture sent people to dry tiles to "drink".
    const tubPlace = v.homeFurniture.find((f) => f.id === 'tub')
    if (tubPlace) return { x: tubPlace.x, y: tubPlace.y }
    const tubJob = v.furnitureQueue.find((j) => j.kind === 'tub' && j.done)
    if (tubJob) return { x: tubJob.x, y: tubJob.y }
  }
  const shore = findNearbyShore(grid, v.x, v.y, DRINK_SEARCH_R)
  if (shore) return shore
  // Fallback : case terre adjacente à l’eau si shore raté.
  const nearWater = findNearest(
    grid,
    v.x,
    v.y,
    DRINK_SEARCH_R,
    (x, y) => getTerrain(grid, x, y) !== WATER && touchesWater(grid, x, y),
  )
  if (nearWater) return nearWater
  // Last resort: dig a tiny spring so pioneers don't die of thirst next to dry plains.
  return ensureLocalSpring(grid, Math.round(v.x), Math.round(v.y), DRINK_SEARCH_R)
}

function canDrinkAt(state: SimState, v: Villager, x: number, y: number): boolean {
  const grid = state.grid
  const xi = Math.round(x)
  const yi = Math.round(y)
  if (getTerrain(grid, xi, yi) === WATER || getTerrain(grid, xi, yi) === WELL || touchesWater(grid, xi, yi)) return true
  // Arrive adjacent to shore / well / spring even if path snapped one tile off.
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (dx === 0 && dy === 0) continue
      const t = getTerrain(grid, xi + dx, yi + dy)
      if (t === WATER || t === WELL || touchesWater(grid, xi + dx, yi + dy)) return true
    }
  }
  if (v.hasHome) {
    const tubPlace = v.homeFurniture.find((f) => f.id === 'tub')
    if (tubPlace && distance(x, y, tubPlace.x, tubPlace.y) <= 2.2) return true
    const tubJob = v.furnitureQueue.find((j) => j.kind === 'tub' && j.done)
    if (tubJob && distance(x, y, tubJob.x, tubJob.y) <= 2.2) return true
  }
  return false
}

/** Prefer bed / chambre when housed; plaza fire when homeless and cold. */
function restTarget(state: SimState, v: Villager): { x: number; y: number } {
  if (!v.hasHome) {
    const village = state.villages.find((vg) => vg.id === v.villageId)
    if (
      village?.hasPlazaFire &&
      village.plazaFireLitUntil > state.tick &&
      village.plazaFireX >= 0
    ) {
      return { x: village.plazaFireX, y: village.plazaFireY }
    }
    return { x: Math.round(v.x), y: Math.round(v.y) }
  }
  const bed = sleepSpot(v.furnitureQueue, v.homeLayout)
  return bed ?? { x: v.homeX, y: v.homeY }
}

/**
 * Hard survival when task is null — micro social/giveFood thrash used to clear the
 * task each tick so hunger/night interrupts (which require an active task) never fired.
 */
function tryAssignSurvivalTask(state: SimState, v: Villager): boolean {
  const night = isNight(state.tick)
  const thirstNow = Number.isFinite(v.thirst) ? v.thirst : THIRST_MAX * 0.5
  const larder = edibleValue(v.inventory)
  const air = sampleTempC(state.climate, v.x, v.y)
  const cold = coldStress01(air)
  const shellPending =
    !v.hasHome && !!homeFootprint(v) && v.buildQueue.some((b) => !b.done && b.kind === 'wall')
  // Restock before collapse — waiting for larder<1.2 let avgEd fall 32→3 by day 10.
  const needFood =
    larder < FOOD_TARGET ||
    (larder < FOOD_TARGET * 1.75 && v.hunger < 2.85) ||
    v.hunger < 2.15 ||
    v.starveTimer > 0

  // Drink BEFORE forage — empty-pack forage was stranding the parched next to shore.
  if (thirstNow < 2.35 || v.thirstTimer > 0) {
    const water = drinkTarget(state, v)
    if (water) {
      setTask(v, 'drink', water.x, water.y)
      noteChosenAction(v, 'drink', 'survie — boire')
      return true
    }
    // Juicy meal as last hydration if no shore in range.
    if (thirstNow < 1.5 && bestEdible(v, state.tick)) {
      const t = eatTarget(v)
      setTask(v, 'eat', t.x, t.y)
      noteChosenAction(v, 'eat', 'survie — soif → manger')
      return true
    }
  }

  // Eating: allow mid-build meals — shell gate used to binge-starve builders at H≈1.3.
  const eatHungerGate = shellPending ? 1.65 : 2.05
  if (v.hunger < eatHungerGate && bestEdible(v, state.tick)) {
    // Only cook first when not critically hungry and raw stock is present.
    const rawFish = countOf(v.inventory, 'fish')
    const rawGame = countOf(v.inventory, 'game')
    if (v.hasHome && v.hunger >= 1.15 && (rawFish > 0 || rawGame > 0)) {
      const out = rawFish > 0 ? 'cooked_fish' : 'cooked_game'
      setTask(v, 'craftGoods', v.homeX, v.homeY, null, out)
      noteChosenAction(v, 'craftGoods', 'survie — cuire')
      return true
    }
    const t = eatTarget(v)
    setTask(v, 'eat', t.x, t.y)
    noteChosenAction(v, 'eat', 'survie — manger')
    return true
  }

  // Warmth BEFORE forage when cold — seed7 died of froid with berries in pack.
  if (cold > 0.32 && !nearWarmFireLocal(state, v)) {
    const village = state.villages.find((vg) => vg.id === v.villageId)
    if (!v.hasHome) {
      if (village?.hasPlazaFire && village.plazaFireLitUntil > state.tick && village.plazaFireX >= 0) {
        setTask(v, 'rest', village.plazaFireX, village.plazaFireY)
        noteChosenAction(v, 'rest', 'survie — feu de place')
        return true
      }
      if (village && cold > 0.4 && (v.hunger >= 1.25 || larder >= 1) && thirstNow >= 1.1) {
        maybeCommunityInfraVotes(state, village)
        const woodN = countOf(v.inventory, 'wood')
        const stoneN = countOf(v.inventory, 'stone')
        if (village.plazaFireAgreed && !ensureVillagePlazaFireSite(state, village) && village.plazaFireX >= 0) {
          if (needsClearing(state.grid, village.plazaFireX, village.plazaFireY)) {
            setTask(v, 'clearLand', village.plazaFireX, village.plazaFireY)
            noteChosenAction(v, 'clearLand', 'survie — site du feu')
            return true
          }
          if (woodN >= PLAZA_FIRE_WOOD_COST && stoneN >= PLAZA_FIRE_STONE_COST) {
            setTask(v, 'buildPlazaFire', village.plazaFireX, village.plazaFireY)
            noteChosenAction(v, 'buildPlazaFire', 'survie — feu de place')
            return true
          }
          if (woodN < PLAZA_FIRE_WOOD_COST) {
            const tree = findNearest(state.grid, v.x, v.y, 56, (x, y) => getTerrain(state.grid, x, y) === TREE)
            if (tree) {
              setTask(v, 'gatherWood', tree.x, tree.y)
              noteChosenAction(v, 'gatherWood', 'survie — bois pour le feu')
              return true
            }
          }
        }
        if (village.hasPlazaFire && village.plazaFireLitUntil <= state.tick && fuelCount(v.inventory) > 0) {
          setTask(v, 'tendPlazaFire', village.plazaFireX, village.plazaFireY)
          noteChosenAction(v, 'tendPlazaFire', 'survie — raviver le feu')
          return true
        }
        if (fuelCount(v.inventory) <= 0) {
          const fuelTree = findNearest(state.grid, v.x, v.y, 48, (x, y) => getTerrain(state.grid, x, y) === TREE)
          if (fuelTree) {
            setTask(v, 'gatherFuel', fuelTree.x, fuelTree.y)
            noteChosenAction(v, 'gatherFuel', 'survie — combustible')
            return true
          }
        }
      }
    } else if (!atHomeShelter(v) && cold > 0.38 && larder >= 0.4 && v.hunger >= 1.25 && thirstNow >= 1.1) {
      const keeper = homeKeeper(state, v)
      if (fuelCount(v.inventory) > 0 || hearthIsLit(keeper, state.tick)) {
        const ha = hearthAnchor(keeper)
        setTask(v, hearthIsLit(keeper, state.tick) ? 'rest' : 'tendHearth', ha.x, ha.y)
        noteChosenAction(v, hearthIsLit(keeper, state.tick) ? 'rest' : 'tendHearth', 'survie — froid')
        return true
      }
      const t = restTarget(state, v)
      setTask(v, 'rest', t.x, t.y)
      noteChosenAction(v, 'rest', 'survie — rentrer du froid')
      return true
    }
  }

  // Forage BEFORE shell labour when pantry/hunger is thin — buildHouse was starving camps.
  if (needFood && !bestEdible(v, state.tick)) {
    const mind = mindOf(v)
    const ripe = findNearest(
      state.grid,
      v.x,
      v.y,
      28,
      (x, y) => getTerrain(state.grid, x, y) === WHEAT && state.grid.amount[y * state.grid.width + x] >= WHEAT_RIPE,
    )
    if (ripe) {
      setTask(v, 'harvestWheat', ripe.x, ripe.y)
      noteChosenAction(v, 'harvestWheat', 'survie — moisson')
      return true
    }
    let bush = senseResource(state.grid, v, mind, 'bush', {
      localR: 48,
      shortR: 90,
      allowBlind: true,
    })
    if (!bush) {
      const raw = findNearest(state.grid, v.x, v.y, 110, (x, y) => getTerrain(state.grid, x, y) === BUSH)
      if (raw) bush = { x: raw.x, y: raw.y, source: 'search' as const }
    }
    const shore =
      findNearbyShore(state.grid, v.x, v.y, 72) ??
      findNearest(state.grid, v.x, v.y, 110, (x, y) => getTerrain(state.grid, x, y) === WATER)
    // Prefer closer food source — empty bush belts stranded seed42 next to water.
    const bushDist = bush ? distance(v.x, v.y, bush.x, bush.y) : 999
    const shoreDist = shore ? distance(v.x, v.y, shore.x, shore.y) : 999
    if (shore && shoreDist + 8 < bushDist) {
      setTask(v, 'fish', shore.x, shore.y)
      noteChosenAction(v, 'fish', 'survie — pêcher (proche)')
      return true
    }
    if (bush) {
      setTask(v, 'gatherFood', bush.x, bush.y)
      noteChosenAction(v, 'gatherFood', 'survie — cueillir')
      return true
    }
    if (shore) {
      setTask(v, 'fish', shore.x, shore.y)
      noteChosenAction(v, 'fish', 'survie — pêcher')
      return true
    }
  } else if (needFood && larder < FOOD_TARGET * 1.25 && v.hunger < 3.0) {
    // Soft restock even with some leftovers — prevent the day-10 pantry cliff.
    const mind = mindOf(v)
    let bush = senseResource(state.grid, v, mind, 'bush', {
      localR: 40,
      shortR: 80,
      allowBlind: true,
    })
    if (!bush) {
      const raw = findNearest(state.grid, v.x, v.y, 96, (x, y) => getTerrain(state.grid, x, y) === BUSH)
      if (raw) bush = { x: raw.x, y: raw.y, source: 'search' as const }
    }
    const shore =
      findNearbyShore(state.grid, v.x, v.y, 64) ??
      findNearest(state.grid, v.x, v.y, 96, (x, y) => getTerrain(state.grid, x, y) === WATER)
    if (bush) {
      setTask(v, 'gatherFood', bush.x, bush.y)
      noteChosenAction(v, 'gatherFood', 'survie — réassort')
      return true
    }
    if (shore && larder < FOOD_TARGET * 0.75) {
      setTask(v, 'fish', shore.x, shore.y)
      noteChosenAction(v, 'fish', 'survie — réassort pêche')
      return true
    }
  }

  // Mandats communaux (puits / feu) — cold fire can precede personal shell.
  {
    const village = state.villages.find((vg) => vg.id === v.villageId)
    if (village && thirstNow >= 0.95 && v.hunger >= 1.05) {
      maybeCommunityInfraVotes(state, village)
      const woodN = countOf(v.inventory, 'wood')
      const stoneN = countOf(v.inventory, 'stone')
      const coldPush = cold > 0.3 || night || !v.hasHome
      // Plaza fire first when cold / homeless — must appear in task stream.
      if (
        coldPush &&
        village.plazaFireAgreed &&
        !ensureVillagePlazaFireSite(state, village) &&
        village.plazaFireX >= 0
      ) {
        if (needsClearing(state.grid, village.plazaFireX, village.plazaFireY)) {
          setTask(v, 'clearLand', village.plazaFireX, village.plazaFireY)
          noteChosenAction(v, 'clearLand', 'commun — site du feu')
          return true
        }
        if (woodN >= PLAZA_FIRE_WOOD_COST && stoneN >= PLAZA_FIRE_STONE_COST) {
          setTask(v, 'buildPlazaFire', village.plazaFireX, village.plazaFireY)
          noteChosenAction(v, 'buildPlazaFire', 'commun — feu de place')
          return true
        }
        if (woodN < PLAZA_FIRE_WOOD_COST) {
          const tree = findNearest(state.grid, v.x, v.y, 56, (x, y) => getTerrain(state.grid, x, y) === TREE)
          if (tree) {
            setTask(v, 'gatherWood', tree.x, tree.y)
            noteChosenAction(v, 'gatherWood', 'commun — bois pour le feu')
            return true
          }
        }
        if (stoneN < PLAZA_FIRE_STONE_COST) {
          const rock = findNearest(state.grid, v.x, v.y, 64, (x, y) => getTerrain(state.grid, x, y) === STONE)
          if (rock) {
            setTask(v, 'gatherStone', rock.x, rock.y)
            noteChosenAction(v, 'gatherStone', 'commun — pierre pour le feu')
            return true
          }
        }
      }
      if (village.hasPlazaFire && village.plazaFireLitUntil <= state.tick && fuelCount(v.inventory) > 0) {
        setTask(v, 'tendPlazaFire', village.plazaFireX, village.plazaFireY)
        noteChosenAction(v, 'tendPlazaFire', 'commun — raviver le feu')
        return true
      }
      // Well: anyone fed enough — don't require personal home footprint.
      if (village.wellAgreed && !ensureVillageWellSite(state, village) && village.wellX >= 0) {
        if (needsClearing(state.grid, village.wellX, village.wellY)) {
          setTask(v, 'clearLand', village.wellX, village.wellY)
          noteChosenAction(v, 'clearLand', 'commun — site du puits')
          return true
        }
        if (woodN >= WELL_WOOD_COST && stoneN >= WELL_STONE_COST) {
          setTask(v, 'buildWell', village.wellX, village.wellY)
          noteChosenAction(v, 'buildWell', 'commun — creuser le puits')
          return true
        }
        if (stoneN < WELL_STONE_COST) {
          const rock = findNearest(
            state.grid,
            v.x,
            v.y,
            64,
            (x, y) => getTerrain(state.grid, x, y) === STONE,
          )
          if (rock) {
            setTask(v, 'gatherStone', rock.x, rock.y)
            noteChosenAction(v, 'gatherStone', 'commun — pierre pour le puits')
            return true
          }
        }
        if (woodN < WELL_WOOD_COST) {
          const tree = findNearest(state.grid, v.x, v.y, 56, (x, y) => getTerrain(state.grid, x, y) === TREE)
          if (tree) {
            setTask(v, 'gatherWood', tree.x, tree.y)
            noteChosenAction(v, 'gatherWood', 'commun — bois pour le puits')
            return true
          }
        }
      }
    }
  }

  // Homeless builders: finish the shell only when fed/hydrated enough to work.
  // Critically spent: rest first — stamina~0 abort loops softlocked every shell.
  if (
    !v.hasHome &&
    homeFootprint(v) &&
    v.stamina < STAMINA_EXHAUSTED &&
    v.hunger >= 1.35 &&
    thirstNow >= 1.25 &&
    larder >= 0.8
  ) {
    const t = restTarget(state, v)
    setTask(v, 'rest', t.x, t.y)
    noteChosenAction(v, 'rest', 'survie — reprise de souffle (chantier)')
    return true
  }
  if (!v.hasHome && homeFootprint(v) && v.hunger >= 1.45 && thirstNow >= 1.2 && larder >= 0.6) {
    const woodN = countOf(v.inventory, 'wood')
    const fp = homeFootprint(v)!
    const gap = fp.walls.find((c) => {
      const t = getTerrain(state.grid, c.x, c.y)
      return t !== HOUSE && t !== WALL_WOOD && t !== WALL_STONE
    })
    if (gap && woodN >= TILE_COST && !needsClearing(state.grid, gap.x, gap.y)) {
      setTask(v, 'buildHouse', gap.x, gap.y)
      noteChosenAction(v, 'buildHouse', 'survie — abri')
      return true
    }
    if (gap && needsClearing(state.grid, gap.x, gap.y)) {
      setTask(v, 'clearLand', gap.x, gap.y)
      noteChosenAction(v, 'clearLand', 'survie — chantier')
      return true
    }
    if (woodN < 4) {
      const tree = findNearest(state.grid, v.x, v.y, 96, (x, y) => getTerrain(state.grid, x, y) === TREE)
      if (tree) {
        setTask(v, 'gatherWood', tree.x, tree.y)
        noteChosenAction(v, 'gatherWood', 'survie — bois pour abri')
        return true
      }
    }
  }
  if (
    v.hunger < 1.55 &&
    !bestEdible(v, state.tick) &&
    v.hasChest &&
    v.chestInventory &&
    edibleValue(v.chestInventory) > 0
  ) {
    const store = storeSpot(v.furnitureQueue, v.homeLayout)
    setTask(v, 'takeFromChest', store?.x ?? v.chestX, store?.y ?? v.chestY)
    noteChosenAction(v, 'takeFromChest', 'survie — garde-manger')
    return true
  }

  // Night: sleep when reasonably fed; empty pack / hunger still defers to forage above.
  if (
    night &&
    v.hasHome &&
    v.hunger >= 1.55 &&
    thirstNow >= 1.25 &&
    (larder >= 0.8 || v.hunger >= 2.3)
  ) {
    const pending = nextFurnitureJob(v.furnitureQueue)
    const canFurnIndoor =
      pending &&
      (pending.kind === 'bed' || pending.kind === 'hearth' || pending.kind === 'table' || pending.kind === 'chest') &&
      countOf(v.inventory, 'wood') >= woodNeededForFurniture(pending.kind)
    if (canFurnIndoor) {
      // Indoor craft at night — don't force rest while the shell still needs furniture.
      return false
    }
    const keeper = homeKeeper(state, v)
    if (!hearthIsLit(keeper, state.tick) && fuelCount(v.inventory) > 0) {
      const ha = hearthAnchor(keeper)
      setTask(v, 'tendHearth', ha.x, ha.y)
      noteChosenAction(v, 'tendHearth', 'survie — feu')
      return true
    }
    if (isOutdoorsAtNight(v, state.tick) && countOf(v.inventory, 'torch') > 0 && !torchIsLit(v, state.tick)) {
      setTask(v, 'lightTorch', v.x, v.y)
      noteChosenAction(v, 'lightTorch', 'survie — torche')
      return true
    }
    const t = restTarget(state, v)
    setTask(v, 'rest', t.x, t.y)
    noteChosenAction(v, 'rest', 'survie — nuit')
    return true
  }
  if (v.stamina < STAMINA_EXHAUSTED && v.hasHome) {
    // Allow first bed/hearth craft when wood is ready — don't softlock on rest forever.
    const pending = nextFurnitureJob(v.furnitureQueue)
    const canFurn =
      pending &&
      (pending.kind === 'bed' || pending.kind === 'hearth') &&
      countOf(v.inventory, 'wood') >= woodNeededForFurniture(pending.kind)
    // Exhausted but empty pack / thirsty: forage/drink via earlier branches, don't nap to death.
    if (!canFurn && larder >= 1 && v.hunger >= 1.6 && thirstNow >= 1.3) {
      const t = restTarget(state, v)
      setTask(v, 'rest', t.x, t.y)
      noteChosenAction(v, 'rest', 'survie — épuisement')
      return true
    }
  }
  if (ensureSleepDebt(v) > 2.6 && v.hasHome) {
    const pending = nextFurnitureJob(v.furnitureQueue)
    const canFurn =
      pending &&
      (pending.kind === 'bed' || pending.kind === 'hearth') &&
      countOf(v.inventory, 'wood') >= woodNeededForFurniture(pending.kind)
    // Don't sleep through starvation — empty pack forces forage first.
    if (!canFurn && larder >= 1 && v.hunger >= 1.5 && thirstNow >= 1.3) {
      const t = restTarget(state, v)
      setTask(v, 'rest', t.x, t.y)
      noteChosenAction(v, 'rest', 'survie — dette de sommeil')
      return true
    }
  }
  if (
    v.hasHome &&
    !atHomeShelter(v) &&
    cold > 0.38 &&
    larder >= 0.5 &&
    v.hunger >= 1.4 &&
    thirstNow >= 1.2
  ) {
    const keeper = homeKeeper(state, v)
    if (fuelCount(v.inventory) > 0 || hearthIsLit(keeper, state.tick)) {
      const ha = hearthAnchor(keeper)
      setTask(v, hearthIsLit(keeper, state.tick) ? 'rest' : 'tendHearth', ha.x, ha.y)
      noteChosenAction(v, hearthIsLit(keeper, state.tick) ? 'rest' : 'tendHearth', 'survie — froid')
      return true
    }
    const t = restTarget(state, v)
    setTask(v, 'rest', t.x, t.y)
    noteChosenAction(v, 'rest', 'survie — froid')
    return true
  }
  // Homeless cold without plaza fire yet: rest only if exhausted (else keep building).
  if (!v.hasHome && cold > 0.48 && v.stamina < STAMINA_TIRED && larder >= 0.5 && thirstNow >= 1.2) {
    const t = restTarget(state, v)
    setTask(v, 'rest', t.x, t.y)
    noteChosenAction(v, 'rest', 'survie — froid sans abri')
    return true
  }
  return false
}

function grantGatherExtras(v: Villager, source: 'bush' | 'tree' | 'stone' | 'fish' | 'sheep' | 'hunt', rng: () => number, state?: SimState) {
  for (const drop of rollGatherExtras(source, rng, { skipPrimary: true })) {
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
  for (const o of state.villagers) {
    if (!o.alive) continue
    if (!o.hasHome) continue
    if (v.parentIds.includes(o.id) || o.parentIds.includes(v.id) || (v.relations.get(o.id)?.affinity ?? 0) > 0.4) {
      kin.push({ x: o.homeX, y: o.homeY })
    }
  }

  const baseX = village ? village.centerX : v.x
  const baseY = village ? village.centerY : v.y
  // Probe climate near intended site before committing span.
  const probeBrief = makePlannerBrief(state, v, 'new', baseX, baseY)
  let plan: SpatialHomePlan
  try {
    plan = planHomeSpatial(probeBrief, rng)
  } catch {
    plan = fallbackLeanPlan(probeBrief, rng)
  }

  const design = plan.design
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

  // Re-sample climate on the chosen plot and lightly replan once (still non-deterministic).
  const brief = makePlannerBrief(state, v, 'new', plot.x, plot.y)
  plan = planHomeSpatial(brief, rng)
  const fp = footprintFromPlan(plan, plot.x, plot.y)

  v.house = plan.design
  v.homePlan = plan
  v.homeX = plot.x
  v.homeY = plot.y
  v.homeLayout = null
  v.furnitureQueue = []
  v.buildQueue = emitBuildQueue(plan, plot.x, plot.y, rng)

  for (const c of [...allFootprintWalls(fp), ...fp.interior, ...fp.open, fp.door]) {
    if (!inBounds(grid, c.x, c.y)) continue
    if (needsClearing(grid, c.x, c.y)) setTerrain(grid, c.x, c.y, GRASS)
  }
  claimCells(grid, allFootprintWalls(fp), CLAIM_HOUSE)
  claimCells(grid, fp.interior, CLAIM_HOUSE)
  claimCells(grid, fp.open, CLAIM_HOUSE)

  const why = plan.reasons[0] ? ` — ${plan.reasons[0]}` : ''
  logEvent(state, `${v.name} trace un plan unique (${plan.design.shape}, ${plan.design.roomKinds.length} pièces)${why}`)
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
    // Enfance dépendante : labeur lourd bloqué / fortement réduit.
    s *= childTaskMultiplier(v, kind)
    if (s <= 0) return
    // Exhaustion: abandon hard outdoor labor; prioritize shelter/food/rest.
    if (exhausted && (kind === 'gatherWood' || kind === 'gatherStone' || kind === 'gatherIron' || kind === 'mineTunnel' || kind === 'mineGold' || kind === 'clearLand' || kind === 'buildWall' || kind === 'helpBuild' || kind === 'tradeRun')) {
      s *= 0.25
    } else if (tired && (kind === 'mineTunnel' || kind === 'mineGold' || kind === 'buildPort' || kind === 'buildMill' || kind === 'helpBuild')) {
      s *= 0.55
    }
    if (night) {
      const lit = personalLight(v, state.tick) || homeIsLit(homeKeeper(state, v), state.tick)
      const lightDuty =
        kind === 'lightTorch' ||
        kind === 'placeCandle' ||
        kind === 'tendHearth' ||
        kind === 'gatherFuel' ||
        kind === 'craftLight' ||
        kind === 'rest' ||
        kind === 'eat' ||
        kind === 'drink'
      const shelterBuild =
        (!v.hasHome &&
          (kind === 'buildHouse' || kind === 'clearLand' || kind === 'gatherWood' || kind === 'buildBed')) ||
        // Indoor furniture craft after shell — allowed at night (cutaway / indoor labor).
        (v.hasHome &&
          (kind === 'buildBed' ||
            kind === 'buildHearth' ||
            kind === 'buildTable' ||
            kind === 'buildChest' ||
            kind === 'buildWorkbench' ||
            (kind === 'gatherWood' && needsFirstBed(v))))
      const survivalUrgency =
        v.hunger < 1.25 ||
        v.thirst < 1.1 ||
        v.starveTimer > 8 ||
        v.thirstTimer > 6 ||
        (state.famine && (kind === 'gatherFood' || kind === 'harvestWheat' || kind === 'fish' || kind === 'takeFromChest')) ||
        cold > 0.6 ||
        kind === 'defend' ||
        kind === 'flee' ||
        kind === 'fight'
      const heavyNight =
        kind === 'idle' ||
        kind === 'tradeRun' ||
        kind === 'mineTunnel' ||
        kind === 'mineGold' ||
        kind === 'gatherWood' ||
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
        kind === 'helpBuild' ||
        kind === 'hireBuilder' ||
        kind === 'assistCraftTools' ||
        kind === 'buildBed' ||
        kind === 'buildChest' ||
        kind === 'buildWorkbench' ||
        kind === 'buildHearth' ||
        kind === 'buildTable' ||
        kind === 'buildCart' ||
        kind === 'buildPen' ||
        kind === 'buildBoat' ||
        (kind.startsWith('craft') && kind !== 'craftLight') ||
        kind === 'weaveCloth' ||
        kind === 'sewClothing' ||
        kind === 'tanHide' ||
        kind === 'makeCharcoal' ||
        kind === 'sowField' ||
        kind === 'grindFlour' ||
        kind === 'bakeBread'
      if (heavyNight && !lightDuty) {
        if (shelterBuild || survivalUrgency) {
          s *= Math.max(0.45, nightActivityMul(state, v, true))
        } else if (lit) {
          // Torch / foyer: allowed but slower.
          s *= 0.42 * nightActivityMul(state, v, true)
        } else {
          // Soft-ban: almost never choose heavy outdoor labor in the dark.
          s *= 0.05
        }
      }
    }
    if (overloaded && (kind === 'gatherWood' || kind === 'gatherStone' || kind === 'gatherIron' || kind === 'mineTunnel' || kind === 'mineGold')) {
      s *= 0.15
    }
    // Hungry packs still forage even when laden — overload used to mute gatherFood into idle.
    if (overloaded && (kind === 'gatherFood' || kind === 'harvestWheat')) {
      s *= v.hunger < 2.4 || edibleValue(v.inventory) < FOOD_TARGET ? 0.7 : 0.25
    }
    // Depleted neighbourhoods are less attractive (Sugarscape-style pressure).
    if (kind === 'gatherWood' || kind === 'gatherStone') {
      s *= 0.55 + gatherPressurePenalty(grid, x, y) * 0.45
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
  const thirstVal = Number.isFinite(v.thirst) ? v.thirst : THIRST_MAX * 0.5
  const parched = (1 - thirstVal / THIRST_MAX) * (1 - thirstVal / THIRST_MAX)
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

  // Non-omniscient radar: always look for bushes when the pantry is thin (cold only cuts yield).
  const senseOpts = { localR, shortR: searchR, allowBlind: true as const }
  const needForage = famine || larder < stockTarget || starving > 0.15 || v.hunger < 2.4
  const bushSense = needForage ? senseResource(grid, v, mind, 'bush', senseOpts) : null
  // Wood-starved builders scan farther — timber is farmed, never gifted at spawn.
  const needTimber =
    countOf(v.inventory, 'wood') < 3 &&
    (!v.hasHome || v.buildQueue.some((b) => !b.done) || v.furnitureQueue.some((j) => !j.done))
  const treeOpts = needTimber
    ? { localR: Math.max(localR, 32), shortR: Math.max(searchR, 72), allowBlind: true as const }
    : senseOpts
  const treeSense = senseResource(grid, v, mind, 'tree', treeOpts)
  let bush = bushSense ? { x: bushSense.x, y: bushSense.y } : null
  let tree = treeSense ? { x: treeSense.x, y: treeSense.y } : null
  // Local clearcut: blind long-range scan so unfinished shells don't softlock at wood=0.
  if (!tree && needTimber) {
    const far = findNearest(grid, v.x, v.y, 96, (x, y) => getTerrain(grid, x, y) === TREE)
    if (far) tree = { x: far.x, y: far.y }
  }
  // Mild score penalty when relying on blind search (unknown territory).
  const bushKnown = bushSense?.source !== 'search'
  const woodKnowMul = treeSense?.source === 'search' ? 0.78 : 1.12
  const rock = (() => {
    // Tool-chain villagers scan farther for surface stone (often near ridges, not camp).
    const needLong =
      v.toolTier === 'wood' ||
      v.toolTier === 'none' ||
      v.profession === 'mason' ||
      v.profession === 'miner' ||
      v.profession === 'builder'
    const stoneOpts = needLong
      ? { localR: Math.max(localR, 28), shortR: Math.max(searchR, 56), allowBlind: true as const }
      : senseOpts
    const s = senseResource(grid, v, mind, 'stone', stoneOpts)
    return s ? { x: s.x, y: s.y } : null
  })()
  const ironOre = (() => {
    const s = senseResource(grid, v, mind, 'iron', senseOpts)
    return s ? { x: s.x, y: s.y } : null
  })()
  // Digging rock needs stone/iron tools — not a workbench, not bare hands / wood spears.
  const mountainOre = canMineRock(v.toolTier)
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

  if (bestEdible(v, state.tick)) {
    // Eat urge ramps only when hunger is real — mild hunger must not drown craft/build/gather.
    const eatUrge =
      v.hunger < 1.35
        ? Math.max(starving * 260, 70 + (1.35 - v.hunger) * 110)
        : v.hunger < 2.1
          ? starving * 120 + (2.1 - v.hunger) * 35
          : starving * 55
    if (eatUrge > 8) {
      const table = eatSpot(v.furnitureQueue, v.homeLayout)
      const eatX = table && v.hasHome ? table.x : v.hasTable ? v.tableX : v.x
      const eatY = table && v.hasHome ? table.y : v.hasTable ? v.tableY : v.y
      add('eat', eatX, eatY, eatUrge * (table || v.hasTable ? reach(v, eatX, eatY) : 1))
    }
  }
  {
    const water = drinkTarget(state, v)
    if (water) {
      const drinkUrge =
        thirstVal < 1.2
          ? Math.max(parched * 280, 80 + (1.2 - thirstVal) * 120)
          : thirstVal < 2.0
            ? parched * 140 + (2.0 - thirstVal) * 40
            : parched * 50
      if (drinkUrge > 8) {
        add('drink', water.x, water.y, drinkUrge * reach(v, water.x, water.y))
      }
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
    const pantryNeed = Math.max(0, (stockTarget - larder) / Math.max(1, stockTarget))
    const knowMul = bushKnown ? 1.15 : 0.72
    const ecoMul = gatherPressurePenalty(grid, bush.x, bush.y)
    // Softlock fix: once a field is claimed in sowing season, don't let berries monopolize labor.
    const farmDefer =
      v.fieldX !== -1 && sowingSeason(season, sampleTempC(state.climate, v.fieldX, v.fieldY)) && v.hunger >= 1.8
        ? 0.55
        : 1
    // Empty pack / thinning pantry must beat rest — was letting villagers starve while resting.
    const emptyPack = larder < 0.4 ? 200 : larder < 1.2 ? 130 : larder < 2.5 ? 70 : larder < stockTarget ? 40 : 12
    add(
      'gatherFood',
      bush.x,
      bush.y,
      (starving * 260 + pantryNeed * 120 + emptyPack) * seasonMul * knowMul * ecoMul * farmDefer * reach(v, bush.x, bush.y),
    )
  } else if ((berriesRipeIn(season) || famine || larder < stockTarget || v.hunger < 2.4) && (starving > 0.12 || larder < stockTarget * 1.4)) {
    // Short exploratory idle toward curiosity when food is unknown locally.
    const sx = clamp(v.x + Math.floor((rng() - 0.5) * searchR), 0, grid.width - 1)
    const sy = clamp(v.y + Math.floor((rng() - 0.5) * searchR), 0, grid.height - 1)
    add('idle', sx, sy, 4 + starving * 28 + p.curiosity * 12)
  }

  const fishBoat = boatOf(state, v)
  {
    const spot = fishBoat
      ? findOpenWater(grid, fishBoat.x, fishBoat.y, OPEN_WATER_RADIUS, 2) ??
        findNearbyTerrain(grid, fishBoat.x, fishBoat.y, OPEN_WATER_RADIUS, WATER)
      : findNearbyShore(grid, v.x, v.y, FISH_RADIUS)
    if (spot) {
      const winterBonus = season === 'winter' ? 80 : 0
      const boatBonus = fishBoat ? 35 : 0
      const need = v.profession === 'fisher' || larder < stockTarget || famine || season === 'winter'
      const base = need ? 70 : 28
      add('fish', spot.x, spot.y, (base + starving * 240 + winterBonus + boatBonus + (famine ? 50 : 0)) * reach(v, spot.x, spot.y))
    }
  }

  if (v.fieldX !== -1 || famine || starving > 0.2) {
    const ox = v.fieldX !== -1 ? v.fieldX : v.x
    const oy = v.fieldY !== -1 ? v.fieldY : v.y
    const ripe =
      findNearest(grid, v.x, v.y, 14, (x, y) => getTerrain(grid, x, y) === WHEAT && grid.amount[y * grid.width + x] >= WHEAT_RIPE) ??
      findNearest(grid, ox, oy, FIELD_RADIUS + 2, (x, y) => getTerrain(grid, x, y) === WHEAT && grid.amount[y * grid.width + x] >= WHEAT_RIPE)
    const berryTrap = countOf(v.inventory, 'food') >= 2 && wheat < 2 ? 55 : 0
    if (ripe) {
      add(
        'harvestWheat',
        ripe.x,
        ripe.y,
        (120 + starving * 200 + (season === 'autumn' ? 95 : 0) + (famine ? 80 : 0) + berryTrap) * reach(v, ripe.x, ripe.y),
      )
    } else if (famine || starving > 0.35) {
      const green = findNearest(grid, ox, oy, FIELD_RADIUS + 4, (x, y) => getTerrain(grid, x, y) === WHEAT && grid.amount[y * grid.width + x] >= WHEAT_SPROUT)
      if (green) add('harvestWheat', green.x, green.y, (starving * 160 + 40) * reach(v, green.x, green.y))
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
    if (mine && !v.mounted && distance(v.x, v.y, mine.x, mine.y) <= 3.5) {
      add('mount', mine.x, mine.y, (18 + p.curiosity * 20) * reach(v, mine.x, mine.y), mine.id)
    }
  }

  if (v.hasHome && v.homeOwnerId === v.id && v.horseId !== null && !v.hasCart) {
    const cartUrge = 28 + p.ambition * 28 + (v.profession === 'trader' ? 35 : 0)
    if (wood >= CART_WOOD_COST && stone >= CART_STONE_COST) add('buildCart', v.homeX, v.homeY, cartUrge * reach(v, v.homeX, v.homeY))
    else if (tree) add('gatherWood', tree.x, tree.y, cartUrge * 0.6 * woodKnowMul * reach(v, tree.x, tree.y))
  }

  if (v.hasHome && v.homeOwnerId === v.id && v.boatId === null && (v.profession === 'fisher' || v.profession === 'trader' || p.curiosity > 0.55)) {
    const dock = findMillSite(grid, v.homeX, v.homeY, 18)
    if (dock) {
      const cargo = v.profession === 'trader'
      const needWood = cargo ? BOAT_CARGO_WOOD_COST : BOAT_FISH_WOOD_COST
      const needStone = cargo ? BOAT_CARGO_STONE_COST : 0
      const boatUrge = 55 + p.ambition * 24 + p.curiosity * 20 + (v.profession === 'fisher' ? 35 : 0) + (v.profession === 'trader' ? 30 : 0)
      if (wood >= needWood && stone >= needStone) add('buildBoat', dock.x, dock.y, boatUrge * reach(v, dock.x, dock.y))
      else if (tree) add('gatherWood', tree.x, tree.y, boatUrge * 0.7 * woodKnowMul * reach(v, tree.x, tree.y))
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
    // After dark, chat almost never — sleep wins (spouse/kin get a faint whisper).
    const nightChat = night ? (isSpouse || kinship > 0.4 ? 0.18 : 0.05) : 1
    const survivalChat =
      (v.hunger >= 2.4 && larder >= FOOD_TARGET ? 1 : 0.08) * (famine && v.hunger < 2.5 ? 0.1 : 1)
    add(
      'socialise',
      other.x,
      other.y,
      (12 + p.sociability * 42 + affinity * 35 + friendPull + kinPull + admirePull + chatNeed) *
        homo *
        ethBias *
        nightChat *
        survivalChat *
        reach(v, other.x, other.y),
      other.id,
    )
    // Share only from a real personal surplus — never gift the pantry down to zero.
    // Own children: lower bar — parental care beats self-surplus etiquette.
    const ownChild = isParentOf(v, other) && isChild(other)
    const childHungry = ownChild && other.hunger < HUNGRY_THRESHOLD + 0.4
    const canShare =
      childHungry
        ? edibleValue(v.inventory) > 1.5 && v.hunger >= 1.4
        : other.hunger < HUNGRY_THRESHOLD + 0.35 && larder > FOOD_TARGET * 2 && v.hunger >= 2.4
    if (canShare) {
      const norms = activeNormsFor(state, v)
      let share = p.generosity * 70 + affinity * 50 + respect * 40 + kinship * 30 + (isSpouse ? 40 : 0)
      if (childHungry) {
        share = Math.max(share, 95 + (isDependentChild(other) ? 55 : 25) + (1 - other.hunger / HUNGER_MAX) * 80)
      }
      if (other.hunger < 1.0) share += 70
      if (famine || other.starveTimer > 4) share += 55
      share *= homophilyBias(cultSim, 'giveFood')
      if (norms.includes('share_famine') && famine) share *= 1.8
      if (other.villageId === v.villageId) share *= 1.25
      // Reciprocity: repay debts first (Mauss).
      const myDebt = rel?.debt ?? 0
      if (myDebt > 0.35) share *= 1.4 + Math.min(1, myDebt) * 0.5
      if (norms.includes('reciprocate') && myDebt > 0.2) share *= 1.25
      add('giveFood', other.x, other.y, share * survivalChat * reach(v, other.x, other.y), other.id)
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
    const gatherUrge =
      (18 +
        p.sociability * 50 +
        plazaFolk * 12 +
        (v.ambition === 'leader' ? 20 : 0) +
        villageCohesion(state, village.id) * 20 +
        (lifeRoleOf(v) === 'elder' ? 15 : 0)) *
      (v.hunger > 1.2 ? 1 : 0.35) *
      (night ? 0.2 : 1) *
      reach(v, cx, cy)
    if (gatherUrge > 8) {
      if (plazaFriend) add('socialise', plazaFriend.x, plazaFriend.y, gatherUrge * 1.15, plazaFriend.id)
      else add('socialise', cx, cy, gatherUrge, null)
    }
  }

  // Services émergents : spectacle, conseil, enseignement (temps + demande sociale).
  {
    const pol = politicsOf(v)
    const urge = serviceUrge(state, v, pol.beliefs.piety, pol.creed === 'piete', lifeRoleOf(v) === 'elder')
    // Hard gate: no troubadour/counsel loops while starving, under famine, or after dark.
    const canServe = !famine && !night && v.hunger >= 2.35 && larder >= 2
    let serviceTarget: Villager | null = null
    let youthTarget: Villager | null = null
    for (let si = 0; si < socialNear.length; si++) {
      const o = socialNear[si]
      if (!serviceTarget) serviceTarget = o
      if (!youthTarget && o.age < CHILD_AGE * 1.3) youthTarget = o
    }
    if (canServe && urge.entertain > 28) {
      const t = serviceTarget
      add('entertain', t ? t.x : v.x, t ? t.y : v.y, urge.entertain * (t ? reach(v, t.x, t.y) : 1), t?.id ?? null)
    }
    if (canServe && urge.counsel > 26 && serviceTarget) {
      add('counsel', serviceTarget.x, serviceTarget.y, urge.counsel * reach(v, serviceTarget.x, serviceTarget.y), serviceTarget.id)
    }
    if (canServe && urge.teach > 24) {
      const pupil = youthTarget ?? serviceTarget
      if (pupil) add('teachCraft', pupil.x, pupil.y, urge.teach * reach(v, pupil.x, pupil.y), pupil.id)
    }
  }

  // Prière / rite vers un lieu sacré ancré (pas barycentre de forage).
  {
    const mind = mindOf(v)
    const pol = politicsOf(v)
    const pietyNeed = mind.needs.piety * 0.7 + pol.beliefs.piety * 0.5
    const canPray = !famine && !night && v.hunger >= 1.8 && pietyNeed > 0.42
    if (canPray && (mind.sacredConf > 0.12 || pol.creed === 'piete' || pol.beliefs.piety > 0.58)) {
      const sx = mind.sacredConf > 0.12 ? mind.sacredX : v.hasHome ? v.homeX : Math.round(v.x)
      const sy = mind.sacredConf > 0.12 ? mind.sacredY : v.hasHome ? v.homeY : Math.round(v.y)
      const urge =
        (18 + pietyNeed * 55 + mind.sacredConf * 35 + (pol.creed === 'piete' ? 22 : 0) + (lifeRoleOf(v) === 'elder' ? 12 : 0)) *
        reach(v, sx, sy)
      if (urge > 22) add('pray', sx, sy, urge)
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

  // Lance après abri / lit : ne pas brûler le bois réservé au premier lit.
  if (v.toolTier === 'none') {
    const armUrge = 55 + danger * 70 + p.courage * 35
    const shelterReserve = needsFirstBed(v) ? BED_COST : v.hasHome ? 0 : 5
    if (wood >= SPEAR_WOOD_COST + shelterReserve) add('craftSpear', v.x, v.y, armUrge * (v.hasHome ? 1 : 0.35))
    else if ((v.hasHome || needsFirstBed(v)) && tree) add('gatherWood', tree.x, tree.y, armUrge * 0.85 * reach(v, tree.x, tree.y))
  }

  // Autonomous stone stockpile — unlocks wood→stone→mine without waiting for mill/port side-effects.
  // Surface stone is gatherable bare-handed; mountain dig still needs canMineRock.
  if (rock && !exhausted && stone < STONE_SPEAR_COST + 2) {
    const upgradePath = v.toolTier === 'wood' || (v.toolTier === 'none' && wood >= SPEAR_WOOD_COST)
    const trade = v.profession === 'mason' || v.profession === 'miner' || v.profession === 'builder'
    const gap = Math.max(0, STONE_SPEAR_COST - stone)
    if (upgradePath || trade) {
      // Free pack space before a stone trip — wood/food mass was blocking canLift(stone).
      if (v.hasChest && v.chestInventory && (wood >= 4 || encumbranceRatio(v) > 0.55)) {
        const store = storeSpot(v.furnitureQueue, v.homeLayout)
        const cx = store?.x ?? v.chestX
        const cy = store?.y ?? v.chestY
        add('storeChest', cx, cy, (55 + gap * 12 + wood * 4) * reach(v, cx, cy))
      }
      // Must beat gatherWood (~drive 40–80) once wood-armed; hunger only softens, never kills.
      const stoneUrge =
        (38 +
          gap * 18 +
          (v.toolTier === 'wood' ? 48 : 0) +
          (v.hasWorkbench && v.toolTier === 'wood' ? 22 : 0) +
          (trade ? 32 : 0) +
          p.ambition * 20 +
          p.curiosity * 10 +
          danger * 12) *
        (v.hunger >= 1.4 ? 1 : 0.55) *
        gatherPressurePenalty(grid, rock.x, rock.y)
      if (stoneUrge > 8) add('gatherStone', rock.x, rock.y, stoneUrge * reach(v, rock.x, rock.y))
    }
  }

  // Also downsize already-planned mega shells that stall pioneers (0 starter wood).
  if (!v.hasHome && v.house && (v.house.rx > 2 || v.house.ry > 2) && countOf(v.inventory, 'wood') < 8) {
    const fpScrap = homeFootprint(v)
    const placed = fpScrap
      ? fpScrap.walls.filter((c) => {
          const t = getTerrain(grid, c.x, c.y)
          return t === HOUSE || t === WALL_WOOD || t === WALL_STONE
        }).length
      : 0
    // Only scrap if still early in the shell — don't wipe nearly-done cabins.
    if (placed < 6) {
      reclaimIncompleteHome(state, v, true)
      v.house = null
      v.homePlan = null
      v.buildQueue = []
      v.homeX = -1
      v.homeY = -1
      v.homeLayout = null
      v.furnitureQueue = []
    }
  }
  if (!v.hasHome) {
    // Keep starter ≤5×5+ (rx/ry≤4). Only scrap unfinished mega-shells that stall pioneers.
    // Soft-close needs time — don't wipe mid-build scaffolds that are already mostly up.
    if (v.house && (v.house.rx > 4 || v.house.ry > 4)) {
      const fpScrap = homeFootprint(v)
      const placed = fpScrap
        ? fpScrap.walls.filter((c) => {
            const t = getTerrain(grid, c.x, c.y)
            return t === HOUSE || t === WALL_WOOD || t === WALL_STONE
          }).length
        : 0
      if (placed < 8) {
        reclaimIncompleteHome(state, v, true)
        v.house = null
        v.homePlan = null
        v.buildQueue = []
        v.homeX = -1
        v.homeY = -1
        v.homeLayout = null
        v.furnitureQueue = []
      }
    } else if (v.house && (v.house.rx < 1 || v.house.ry < 1)) {
      // Only scrap degenerate 0-span stubs — keep compact lean cabins (rx/ry=1–2).
      reclaimIncompleteHome(state, v, true)
      v.house = null
      v.homePlan = null
      v.buildQueue = []
      v.homeX = -1
      v.homeY = -1
      v.homeLayout = null
      v.furnitureQueue = []
    }
    // Cap concurrent unfinished shells — otherwise every villager burns starter wood into 1×1 stubs.
    const unfinishedBuilders = state.villagers.filter(
      (o) => o.alive && !o.hasHome && o.house && o.homeX >= 0 && o.buildQueue.some((b) => !b.done && b.kind === 'wall'),
    ).length
    const mayStartHome = unfinishedBuilders < MAX_CONCURRENT_HOME_BUILDS || (v.house != null && v.homeX >= 0)
    if (mayStartHome && (!v.house || v.homeX === -1)) planHouse(state, v, village, rng)
    const fp = homeFootprint(v)
    if (fp) {
      ensureBuildQueue(v, grid, rng)
      // Close shell only when every exterior wall block is actually placed (no % soft-close).
      if (tryCloseHomeShell(state, v)) {
        celebrateFirstHome(state, v, rng)
      } else {
      const winterUrgency = season === 'autumn' ? 45 : season === 'winter' ? 70 : 10
      const earlyPush = state.tick < TICKS_PER_DAY * 25 ? 160 : state.tick < TICKS_PER_DAY * 50 ? 80 : 15
      const block = nextBuildBlock(v.buildQueue, grid)
      const wallsDone = fp.walls.filter((c) => {
        const t = getTerrain(grid, c.x, c.y)
        return t === HOUSE || t === WALL_WOOD || t === WALL_STONE
      }).length
      const shelterUrge =
        175 +
        danger * 55 +
        (1 - p.courage) * 40 +
        p.ambition * 25 +
        winterUrgency +
        earlyPush +
        (wallsDone > 0 ? 55 : 20)
      const veg = firstPlotVegetation(grid, fp)
      const gap = block
        ? { x: block.x, y: block.y }
        : fp.walls.find((c) => {
            const t = getTerrain(grid, c.x, c.y)
            return t !== HOUSE && t !== WALL_WOOD && t !== WALL_STONE
          })
      const cost = block ? materialCost(block) : { wood: TILE_COST, stone: 0 }
      const canPay =
        (cost.wood <= 0 || wood >= cost.wood) && (cost.stone <= 0 || stone >= cost.stone)
      const gapClear = gap && !needsClearing(grid, gap.x, gap.y)
      if (gap && canPay && gapClear) add('buildHouse', gap.x, gap.y, shelterUrge * reach(v, gap.x, gap.y))
      else if (veg) add('clearLand', veg.x, veg.y, shelterUrge * 1.05 * reach(v, veg.x, veg.y))
      else if (gap && canPay) add('buildHouse', gap.x, gap.y, shelterUrge * reach(v, gap.x, gap.y))
      else if (gap && cost.stone > 0 && stone < cost.stone && rock) {
        add('gatherStone', rock.x, rock.y, shelterUrge * 0.95 * reach(v, rock.x, rock.y))
      } else if (gap && tree) {
        // Wood-starved shell: farm timber before placing — no free starter wood.
        const woodGap = Math.max(1, cost.wood - wood)
        add(
          'gatherWood',
          tree.x,
          tree.y,
          shelterUrge * (1.25 + woodGap * 0.15) * woodKnowMul * reach(v, tree.x, tree.y),
        )
      } else if (!gap && !v.hasHome && wood < 4 && tree) {
        // Stockpile a few logs before siting walls.
        add('gatherWood', tree.x, tree.y, shelterUrge * 1.05 * woodKnowMul * reach(v, tree.x, tree.y))
      }
      if (v.hasChest && wood >= woodCap(v)) {
        add('storeChest', v.chestX, v.chestY, shelterUrge * 0.5 * reach(v, v.chestX, v.chestY))
      }
      }
    }
  }

  const isOwner = v.homeOwnerId === v.id
  const fp = isOwner ? homeFootprint(v) : null
  if (v.hasHome && isOwner && fp) {
    // Emergent: richer / larger households expand rooms via dynamic planner.
    if ((state.tick + v.id * 13) % 47 === 0) maybeExpandHome(state, v, rng)

    // Shell closed → HTN must leave buildHouse so beds/hearth become the active plan step.
    advanceHomePlanPastShell(mindOf(v))

    ensureBuildQueue(v, grid, rng)
    const liveFp = homeFootprint(v) ?? fp
    const nextBlock = nextBuildBlock(v.buildQueue, grid)
    const wallGap = nextBlock
      ? { x: nextBlock.x, y: nextBlock.y }
      : liveFp.walls.find((c) => {
          const t = getTerrain(grid, c.x, c.y)
          return t !== HOUSE && t !== WALL_WOOD && t !== WALL_STONE
        })
    // Layout / furniture queue once the structural shell is closed (craft, don't stamp).
    if (!wallGap || (nextBlock && nextBlock.kind === 'floor')) {
      const structLeft = structuralBlocksRemaining(v.buildQueue)
      if (structLeft === 0) {
        const layout = ensureHomeLayout(v)
        if (layout) queueFurnitureAfterShell(v, layout)
      }
    }

    const job = nextFurnitureJob(v.furnitureQueue)
    const furnCost = job ? woodNeededForFurniture(job.kind) : 0
    const firstBedNeeded = needsFirstBed(v)
    const hearthNeeded = !hasHearthPlaced(v) && v.furnitureQueue.some((j) => j.kind === 'hearth' && !j.done)
    // Reserve timber for first bed (+ hearth) — don't drain it all on leftover floors.
    const woodReserve =
      (firstBedNeeded ? BED_COST : 0) + (hearthNeeded && !firstBedNeeded ? woodNeededForFurniture('hearth') : 0)
    // First bed (and hearth) beat leftover floors; after that, floors resume before extra props.
    const prioritizeFurn =
      !!job &&
      structuralBlocksRemaining(v.buildQueue) === 0 &&
      wood >= furnCost &&
      ((job.kind === 'bed' && firstBedNeeded) || (job.kind === 'hearth' && hearthNeeded))

    if (wallGap && (!prioritizeFurn || nextBlock?.kind === 'door')) {
      const isFloor = nextBlock?.kind === 'floor'
      const expandUrge =
        nextBlock?.kind === 'door' ? 130 : isFloor ? 95 + p.ambition * 25 : 40 + p.ambition * 30
      const cost = nextBlock ? materialCost(nextBlock) : { wood: TILE_COST, stone: 0 }
      // Hold floors while reserving wood for the first bed.
      const floorBlocked =
        isFloor && woodReserve > 0 && wood - cost.wood < woodReserve && firstBedNeeded
      const canPay =
        !floorBlocked &&
        (cost.wood <= 0 || wood >= cost.wood) &&
        (cost.stone <= 0 || stone >= cost.stone)
      if (needsClearing(grid, wallGap.x, wallGap.y)) {
        add('clearLand', wallGap.x, wallGap.y, expandUrge * 1.1 * reach(v, wallGap.x, wallGap.y))
      } else if (canPay) {
        add('buildHouse', wallGap.x, wallGap.y, expandUrge * reach(v, wallGap.x, wallGap.y))
      } else if (cost.stone > 0 && stone < cost.stone && rock) {
        add('gatherStone', rock.x, rock.y, expandUrge * 0.8 * reach(v, rock.x, rock.y))
      } else if (tree) {
        const woodUrge = firstBedNeeded ? expandUrge * 1.35 : expandUrge * 0.75
        add('gatherWood', tree.x, tree.y, woodUrge * reach(v, tree.x, tree.y))
      }
    }

    // Craft after exterior walls — floors may still be in progress (placeBuildBlock won't clobber props).
    if (job && structuralBlocksRemaining(v.buildQueue) === 0) {
      const cost = woodNeededForFurniture(job.kind)
      const taskKind = taskForFurniture(job.kind)
      // Workbench unlocks stone tools — prioritize once wood spear exists.
      const toolChainBoost =
        job.kind === 'workbench' && (v.toolTier === 'wood' || v.toolTier === 'none') ? 36 : 0
      const floorsLeft = v.buildQueue.filter((b) => !b.done && b.kind === 'floor').length
      const coreBoost =
        (job.kind === 'bed' && firstBedNeeded) || (job.kind === 'hearth' && hearthNeeded)
          ? 100
          : floorsLeft > 0
            ? -40
            : 0
      const drive =
        160 +
        p.ambition * 35 +
        (job.kind === 'bed' ? 55 : 0) +
        (job.kind === 'hearth' ? 42 : 0) +
        (job.kind === 'table' ? 36 : 0) +
        (job.kind === 'chest' ? 30 : 0) +
        (job.kind === 'bench' || job.kind === 'stool' ? 18 : 0) +
        (job.kind === 'shelf' || job.kind === 'cupboard' ? 16 : 0) +
        (job.kind === 'cradle' ? 22 : 0) +
        (job.kind === 'loom' ? 20 : 0) +
        (job.kind === 'tub' ? 12 : 0) +
        toolChainBoost +
        coreBoost
      if (wood >= cost) {
        add(taskKind, job.x, job.y, drive * reach(v, job.x, job.y))
      } else if (tree) {
        if (firstBedNeeded) freePackForWood(v, cost)
        add('gatherWood', tree.x, tree.y, drive * 1.25 * reach(v, tree.x, tree.y))
      }
    } else if (!job) {
      // Legacy fallback if queue empty — keep old slot logic for partial homes.
      const slots = furnitureSlots(liveFp)
      const drive = 45 + p.ambition * 40
      const maxBeds = v.house ? v.house.bedSlots : 2
      if (!v.hasWorkbench) {
        const wbDrive = drive + (v.toolTier === 'wood' || v.toolTier === 'none' ? 36 : 0)
        if (wood >= WORKBENCH_COST) add('buildWorkbench', slots.workbench.x, slots.workbench.y, wbDrive * reach(v, slots.workbench.x, slots.workbench.y))
        else if (tree) add('gatherWood', tree.x, tree.y, wbDrive * 0.8 * reach(v, tree.x, tree.y))
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

  if (v.toolTier === 'wood') {
    // Stone knapping does not require a personal bench — bench still helps iron later.
    const upgrade =
      90 + p.courage * 50 + danger * 35 + p.ambition * 28 + (v.hasWorkbench ? 18 : 0)
    if (stone >= STONE_SPEAR_COST) add('craftStoneSpear', v.x, v.y, upgrade)
    else if (rock) add('gatherStone', rock.x, rock.y, upgrade * 0.95 * reach(v, rock.x, rock.y))
    if (!v.hasWorkbench && v.hasHome && isOwner) {
      // Soft pull: bench still unlocks iron / goods after stone tools.
      const fpBench = homeFootprint(v)
      if (fpBench) {
        const slots = furnitureSlots(fpBench)
        const pull = 55 + p.ambition * 24 + danger * 14
        if (wood >= WORKBENCH_COST) {
          add('buildWorkbench', slots.workbench.x, slots.workbench.y, pull * reach(v, slots.workbench.x, slots.workbench.y))
        } else if (tree) {
          add('gatherWood', tree.x, tree.y, pull * 0.75 * woodKnowMul * reach(v, tree.x, tree.y))
        }
      }
    }
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
    const deeperBoost = village?.hasMine ? 12 : 0
    const mineUrge = 20 + p.ambition * 25 + p.courage * 10 + minerBoost + ironBoost + deeperBoost
    add('mineTunnel', mountainOre.x, mountainOre.y, mineUrge * reach(v, mountainOre.x, mountainOre.y))
  }

  // Claim a mine mouth near the village so digs deepen into one corridor system.
  if (
    village &&
    !village.hasMine &&
    canMineRock(v.toolTier) &&
    (v.profession === 'miner' || v.profession === 'mason' || v.toolTier === 'iron')
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
    const claimT = sampleTempC(state.climate, v.homeX >= 0 ? v.homeX : v.x, v.homeY >= 0 ? v.homeY : v.y)
    // Only claim when sowing is actually possible this season — avoids dead fields.
    const farmableHere = sowingSeason(season, claimT)
    if (v.fieldX === -1 && farmableHere) {
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
      if (veg) add('clearLand', veg.x, veg.y, (48 + p.ambition * 16) * reach(v, veg.x, veg.y))
      else if (bare) {
        const tFac = Math.max(0.55, cropTempFactor(sampleTempC(state.climate, bare.x, bare.y)))
        // Beat berry pantry once a field is claimed (was ~50–75 vs gatherFood 90–220).
        const berryCompetition = bush && berriesRipeIn(season) && larder < stockTarget ? 28 : 0
        const sowUrge =
          (55 + (season === 'spring' ? 55 : season === 'summer' ? 35 : 18) + p.ambition * 22 + berryCompetition) *
          tFac *
          // Don't abandon the field when hungry — empty plots after harvest caused mid-spring collapses.
          (v.hunger < 1.2 ? 0.45 : 1) *
          tFac *
          (v.profession === 'farmer' ? 1.35 : 1) *
          (v.hunger >= 1.5 ? 1 : 0.55)
        add('sowField', bare.x, bare.y, sowUrge * reach(v, bare.x, bare.y))
      }
    }
  }

  // Mill as soon as the village farms — don't wait for every member to finish a house.
  if (village && village.memberIds.length >= 2 && !village.hasMill) {
    let villageWheat = wheat
    let villageFields = v.hasField || v.fieldX >= 0 ? 1 : 0
    for (const o of state.villagers) {
      if (!o.alive || o.villageId !== village.id || o.id === v.id) continue
      villageWheat += countOf(o.inventory, 'wheat')
      if (o.chestInventory) villageWheat += countOf(o.chestInventory, 'wheat')
      if (o.hasField || o.fieldX >= 0) villageFields++
    }
    if (villageWheat >= 1 || villageFields > 0 || v.hunger < 2.2) {
      if (village.millX === -1) {
        const site = findMillSite(grid, village.centerX, village.centerY, 45)
        if (site) {
          village.millX = site.x
          village.millY = site.y
          setClaim(grid, site.x, site.y, CLAIM_MILL)
        }
      }
      if (village.millX !== -1) {
        const millUrge = 70 + p.sociability * 24 + p.ambition * 28 + (villageWheat >= 3 ? 40 : 0) + (v.hasHome ? 12 : 0)
        if (needsClearing(grid, village.millX, village.millY)) add('clearLand', village.millX, village.millY, millUrge * 0.95 * reach(v, village.millX, village.millY))
        else if (wood >= MILL_WOOD_COST && stone >= MILL_STONE_COST) add('buildMill', village.millX, village.millY, millUrge * 1.15 * reach(v, village.millX, village.millY))
        else if (wood < MILL_WOOD_COST && tree) add('gatherWood', tree.x, tree.y, millUrge * 0.9 * reach(v, tree.x, tree.y))
        else if (rock) add('gatherStone', rock.x, rock.y, millUrge * 0.9 * reach(v, rock.x, rock.y))
      }
    }
  }

  // Puits communal uniquement — mandat village/cercle, jamais de puits perso.
  if (village && !village.hasWell) {
    maybeCommunityInfraVotes(state, village)
    // Sync circle norms → village mandate.
    if (!village.wellAgreed) {
      for (const c of state.circles) {
        if (!c.norms.includes('dig_well')) continue
        if (c.villageId === village.id || c.memberIds.some((id) => village.memberIds.includes(id))) {
          village.wellAgreed = true
          break
        }
      }
    }
    if (village.wellAgreed && !ensureVillageWellSite(state, village) && village.wellX >= 0) {
      const thirstNow = Number.isFinite(v.thirst) ? v.thirst : THIRST_MAX * 0.5
      const wellUrge =
        200 +
        parched * 220 +
        (thirstNow < 2.0 ? 90 : 40) +
        p.ambition * 20 +
        p.sociability * 28 +
        (v.profession === 'mason' || v.profession === 'builder' ? 50 : 0)
      if (needsClearing(grid, village.wellX, village.wellY)) {
        add('clearLand', village.wellX, village.wellY, wellUrge * reach(v, village.wellX, village.wellY))
      } else if (wood >= WELL_WOOD_COST && stone >= WELL_STONE_COST) {
        add('buildWell', village.wellX, village.wellY, wellUrge * 1.4 * reach(v, village.wellX, village.wellY))
      } else if (stone < WELL_STONE_COST && rock) {
        add('gatherStone', rock.x, rock.y, (wellUrge + 60) * reach(v, rock.x, rock.y))
      } else if (wood < WELL_WOOD_COST && tree) {
        add('gatherWood', tree.x, tree.y, wellUrge * reach(v, tree.x, tree.y))
      }
    }
  }

  // Feu de place communal — mandat village, réchauffe tout le monde.
  if (village) {
    maybeCommunityInfraVotes(state, village)
    if (!village.plazaFireAgreed) {
      for (const c of state.circles) {
        if (!c.norms.includes('plaza_fire')) continue
        if (c.villageId === village.id || c.memberIds.some((id) => village.memberIds.includes(id))) {
          village.plazaFireAgreed = true
          break
        }
      }
    }
    if (village.plazaFireAgreed && !ensureVillagePlazaFireSite(state, village) && village.plazaFireX >= 0) {
      const cold = coldStress01(sampleTempC(state.climate, v.x, v.y))
      const fireUrge =
        160 +
        cold * 120 +
        (night ? 70 : 20) +
        p.sociability * 30 +
        (v.hasHome ? 10 : 55)
      if (needsClearing(grid, village.plazaFireX, village.plazaFireY)) {
        add('clearLand', village.plazaFireX, village.plazaFireY, fireUrge * reach(v, village.plazaFireX, village.plazaFireY))
      } else if (wood >= PLAZA_FIRE_WOOD_COST && stone >= PLAZA_FIRE_STONE_COST) {
        add(
          'buildPlazaFire',
          village.plazaFireX,
          village.plazaFireY,
          fireUrge * 1.3 * reach(v, village.plazaFireX, village.plazaFireY),
        )
      } else if (wood < PLAZA_FIRE_WOOD_COST && tree) {
        add('gatherWood', tree.x, tree.y, (fireUrge + 40) * reach(v, tree.x, tree.y))
      } else if (stone < PLAZA_FIRE_STONE_COST && rock) {
        add('gatherStone', rock.x, rock.y, fireUrge * reach(v, rock.x, rock.y))
      }
    } else if (village.hasPlazaFire) {
      const lit = village.plazaFireLitUntil > state.tick
      const cold = coldStress01(sampleTempC(state.climate, v.x, v.y))
      if (!lit && (cold > 0.15 || night || !v.hasHome) && (fuelCount(v.inventory) > 0 || countOf(v.inventory, 'wood') > 0)) {
        add(
          'tendPlazaFire',
          village.plazaFireX,
          village.plazaFireY,
          (110 + cold * 120 + (night ? 60 : 0) + (v.hasHome ? 0 : 40)) * reach(v, village.plazaFireX, village.plazaFireY),
        )
      } else if (lit && (cold > 0.2 || (night && !atHomeShelter(v)) || (!v.hasHome && cold > 0.12))) {
        add(
          'rest',
          village.plazaFireX,
          village.plazaFireY,
          (85 + cold * 95 + (night ? 45 : 0) + (v.hasHome ? 0 : 35)) * reach(v, village.plazaFireX, village.plazaFireY),
        )
      }
    }
  }

  if (village?.hasMill && (wheat >= WHEAT_PER_FLOUR || MILL_GRAINS.some((g) => countOf(v.inventory, g) >= 2))) {
    const grainPush = countOf(v.inventory, 'food') > flour ? 45 : 20
    add(
      'grindFlour',
      village.millX,
      village.millY,
      (120 + starving * 140 + (famine ? 60 : 0) + (season === 'winter' ? 35 : 0) + grainPush) * reach(v, village.millX, village.millY),
    )
  } else if (!village?.hasMill && v.hasHome && wheat >= WHEAT_PER_FLOUR) {
    // Keep a wheat ration in the bag when already hungry — flour alone used to strand people.
    const keepSeed = v.hunger < 1.6 ? 1 : 0
    if (wheat - keepSeed >= WHEAT_PER_FLOUR) {
      add('grindFlour', v.homeX, v.homeY, (130 + starving * 120 + wheat * 8) * reach(v, v.homeX, v.homeY))
    }
  }
  if (flour > 0 && (v.hasWorkbench || v.hasHome)) {
    const breadPush = countOf(v.inventory, 'bread') < 2 ? 80 : 25
    const bx = v.hasWorkbench ? v.workbenchX : v.homeX
    const by = v.hasWorkbench ? v.workbenchY : v.homeY
    // Prefer baking over snacking on raw flour unless critically hungry.
    const bakeMul = v.hunger < 1.2 ? 0.7 : 1.35
    add('bakeBread', bx, by, (160 + starving * 100 + breadPush) * bakeMul * reach(v, bx, by))
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
      if (recipe.station !== 'workbench' && recipe.station !== 'any') continue
      if (!recipeCraftable(recipe, (t) => countOf(v.inventory, t))) continue
      const score = (recipe.urge + p.ambition * 12 + mindOf(v).skills.craft * 18) * reach(v, v.workbenchX, v.workbenchY)
      if (score > bestScore) {
        bestScore = score
        bestRecipe = recipe
      }
    }
    if (bestRecipe) add('craftGoods', v.workbenchX, v.workbenchY, bestScore, null, bestRecipe.output)
  }
  // Âtre : cuisson poisson/gibier, huile, chandelles…
  if (v.hasHome) {
    let bestHearth: (typeof CRAFT_RECIPES)[number] | null = null
    let bestHearthScore = 0
    const rawFish = countOf(v.inventory, 'fish')
    const rawGame = countOf(v.inventory, 'game')
    for (const recipe of CRAFT_RECIPES) {
      if (recipe.station !== 'hearth' && !(recipe.station === 'any' && !v.hasWorkbench)) continue
      if (!recipeCraftable(recipe, (t) => countOf(v.inventory, t))) continue
      let cookPush = 0
      if (recipe.output === 'cooked_fish' && rawFish > 0) cookPush = 140 + starving * 160 + rawFish * 35
      if (recipe.output === 'cooked_game' && rawGame > 0) cookPush = 150 + starving * 170 + rawGame * 35
      const score =
        (recipe.urge + cookPush + p.ambition * 10 + mindOf(v).skills.craft * 14) * reach(v, v.homeX, v.homeY)
      if (score > bestHearthScore) {
        bestHearthScore = score
        bestHearth = recipe
      }
    }
    if (bestHearth) add('craftGoods', v.homeX, v.homeY, bestHearthScore, null, bestHearth.output)
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

  // Remèdes si blessé ou malade.
  {
    const sick = !!(v.illness && v.illness.remaining > 0)
    if (v.health < VILLAGER_HEALTH_MAX - 0.5 || sick) {
      const hasMed =
        countOf(v.inventory, 'medicine') > 0 ||
        countOf(v.inventory, 'herbs') > 0 ||
        countOf(v.inventory, 'sage') > 0 ||
        countOf(v.inventory, 'garlic') > 0
      if (hasMed) {
        const hurt = 1 - v.health / VILLAGER_HEALTH_MAX
        const illnessUrge = sick ? 70 + v.illness!.severity * 90 : 0
        add('useMedicine', v.x, v.y, hurt * 120 + illnessUrge)
      }
    }
  }

  // Soft R&D near workbench — curious / skilled villagers with surplus leisure.
  // Don't burn the last cobbles needed for a stone spear.
  const researchUrge = experimentUrge(v, state)
  if (researchUrge > 20 && !(v.toolTier === 'wood' && stone < STONE_SPEAR_COST + 1)) {
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
      // Offres locales / face-à-face — pas de scan omniscient des coffres à rayon 90.
      for (const other of state.villagers) {
        if (!canSeeLocalSellerOffer(v, other)) continue
        const surplus = countOf(other.chestInventory!, materialNeed.resource) - materialNeed.reserve
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
      if (v.penFeed < 4 && wheat > 3 && larder > stockTarget + 2) {
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
    const hearth = hearthSpot(v.furnitureQueue, v.homeLayout)
    const restX = bed?.x ?? v.homeX
    const restY = bed?.y ?? v.homeY
    const keeper = homeKeeper(state, v)
    const fireWarm = hearthIsLit(keeper, state.tick)
    const restNeed =
      (season === 'winter' ? 38 : 8) +
      cold * 55 +
      heat * 28 +
      (night ? 70 : 0) +
      (exhausted ? 90 : tired ? 40 : 0) +
      (1 - v.stamina / STAMINA_MAX) * 50 +
      ensureSleepDebt(v) * 38 +
      (!atHomeShelter(v) && cold > 0.25 ? 50 : 0) +
      (bed && v.bedCount > 0 ? 18 : 0) +
      (fireWarm ? 22 : warmthPressure(state, v) * 55)
    // Hungry / empty pack: soften rest so forage/eat can win (don't zero it — sleep debt kills too).
    const restFoodGate =
      larder < 0.8 && v.hunger < 2.2
        ? 0.12
        : larder < 1.5 && v.hunger < 2.4
          ? 0.28
          : larder < FOOD_TARGET && v.hunger < 2.6
            ? 0.45
            : v.hunger < 1.5
              ? 0.4
              : v.hunger < 1.9
                ? 0.7
                : 1
    add('rest', restX, restY, restNeed * restFoodGate * reach(v, restX, restY))
    // Prefer drifting toward warm âtre when cold.
    if (hearth && (cold > 0.25 || warmthPressure(state, v) > 0.35) && !fireWarm) {
      add('tendHearth', hearth.x, hearth.y, (48 + cold * 70 + warmthPressure(state, v) * 80) * reach(v, hearth.x, hearth.y))
    } else if (hearth && fireWarm && cold > 0.2) {
      add('rest', hearth.x, hearth.y, (restNeed + 18) * restFoodGate * reach(v, hearth.x, hearth.y))
    }
  } else if (
    exhausted ||
    (tired &&
      wood >= 2 &&
      v.hunger >= 1.7 &&
      (Number.isFinite(v.thirst) ? v.thirst : THIRST_MAX) >= 1.5 &&
      larder >= 1.0)
  ) {
    // Sans foyer : rest only when spent AND not starving/parched — forage/build first.
    const plaza =
      village?.hasPlazaFire && village.plazaFireLitUntil > state.tick
        ? { x: village.plazaFireX, y: village.plazaFireY }
        : { x: v.x, y: v.y }
    add(
      'rest',
      plaza.x,
      plaza.y,
      ((exhausted ? 55 : 18) + (night ? 8 : 0) + cold * 28 + heat * 20 + ensureSleepDebt(v) * 14) *
        (larder < 1.2 ? 0.35 : 1) *
        reach(v, plaza.x, plaza.y),
    )
  }

  // Nuit / froid : lumière & combustible (torche, chandelle, âtre, fagots).
  {
    const dark = darknessPressure(state, v)
    const coldUrge = warmthPressure(state, v)
    const outdoorNight = isOutdoorsAtNight(v, state.tick)
    if (countOf(v.inventory, 'torch') > 0 && outdoorNight && !torchIsLit(v, state.tick)) {
      add('lightTorch', v.x, v.y, 55 + dark * 90 + (1 - p.courage) * 25)
    }
    if (v.hasHome && (countOf(v.inventory, 'candle') > 0 || countOf(v.inventory, 'oil_lamp') > 0)) {
      const keeper = homeKeeper(state, v)
      if (night && !homeIsLit(keeper, state.tick)) {
        const hx = hearthSpot(v.furnitureQueue, v.homeLayout)?.x ?? v.homeX
        const hy = hearthSpot(v.furnitureQueue, v.homeLayout)?.y ?? v.homeY
        add('placeCandle', hx, hy, (42 + dark * 75) * reach(v, hx, hy))
      }
    }
    if (v.hasHome && (hasHearthPlaced(v) || v.furnitureQueue.some((j) => j.kind === 'hearth'))) {
      const ha = hearthAnchor(homeKeeper(state, v))
      const fuels = fuelCount(v.inventory) + (v.chestInventory ? fuelCount(v.chestInventory) : 0)
      if ((coldUrge > 0.25 || night) && !hearthIsLit(homeKeeper(state, v), state.tick) && fuels > 0) {
        add('tendHearth', ha.x, ha.y, (50 + coldUrge * 85 + dark * 30) * reach(v, ha.x, ha.y))
      }
    }
    // Fuel gathering burns construction timber into firewood — only after a shell exists,
    // or when critically cold. Homeless builders must keep raw wood for walls.
    const buildingShell = !v.hasHome && v.buildQueue.some((b) => !b.done && b.kind === 'wall')
    const homelessNeedTimber = !v.hasHome
    if (
      fuelCount(v.inventory) < 2 &&
      (coldUrge > 0.2 || night || season === 'winter') &&
      !homelessNeedTimber &&
      (!buildingShell || coldUrge > 0.7)
    ) {
      const fuelTree = findNearest(grid, v.x, v.y, searchR, (x, y) => getTerrain(grid, x, y) === TREE)
      if (fuelTree) add('gatherFuel', fuelTree.x, fuelTree.y, (38 + coldUrge * 50 + dark * 35) * reach(v, fuelTree.x, fuelTree.y))
    } else if (homelessNeedTimber && coldUrge > 0.72 && fuelCount(v.inventory) < 1) {
      // Critical cold only: one fagot run without abandoning the roof race.
      const fuelTree = findNearest(grid, v.x, v.y, searchR, (x, y) => getTerrain(grid, x, y) === TREE)
      if (fuelTree) add('gatherFuel', fuelTree.x, fuelTree.y, (28 + coldUrge * 40) * reach(v, fuelTree.x, fuelTree.y))
    }
    const wantLight = bestCraftableLight(v.inventory)
    if (wantLight && (dark > 0.25 || !hasUnlitLightItem(v)) && (v.hasWorkbench || v.hasHome)) {
      const tx = v.hasWorkbench ? v.workbenchX : v.homeX
      const ty = v.hasWorkbench ? v.workbenchY : v.homeY
      add('craftLight', tx, ty, (40 + dark * 70 + coldUrge * 25) * reach(v, tx, ty), null, wantLight)
    }
  }

  // Collaborative construction: help / haul / hire / smith-assist on open home sites.
  {
    const sites = listOpenBuildSites(state, v)
    const childHaul = isChild(v)
    const idleBonus = exhausted || tired ? 0 : 12 + (1 - mind.needs.purpose) * 10
    const buildSk = mind.skills.build
    for (const site of sites.slice(0, 5)) {
      const tx = site.next?.x ?? site.owner.homeX
      const ty = site.next?.y ?? site.owner.homeY
      const help = scoreHelpBuild(v, site, { idleBonus, buildSkill: buildSk })
      // Camp phase: helpers close roofs faster when few homes exist.
      const earlyHelp = state.tick < TICKS_PER_DAY * 40 && !v.hasHome ? 1.55 : 1
      if (help > 8) add('helpBuild', tx, ty, help * earlyHelp * reach(v, tx, ty), site.owner.id)
      const haul = scoreHaulForBuild(v, site, { childHaul })
      if (haul > 8) {
        const res = preferredHaulResource(v, site, childHaul)
        if (res) add('haulForBuild', site.owner.homeX, site.owner.homeY, haul * reach(v, site.owner.homeX, site.owner.homeY), site.owner.id, res)
      }
      const fund = scoreFundBuild(v, site)
      if (fund > 10) {
        const res = countOf(v.inventory, 'coin') >= 1 ? ('coin' as const) : ('wood' as const)
        add('haulForBuild', site.owner.homeX, site.owner.homeY, fund * reach(v, site.owner.homeX, site.owner.homeY), site.owner.id, res)
      }
      const craft = scoreAssistCraftTools(v, site)
      if (craft > 8) add('assistCraftTools', site.owner.homeX, site.owner.homeY, craft * reach(v, site.owner.homeX, site.owner.homeY), site.owner.id)
    }
    // Rich owner with open chantier: hire a nearby builder.
    if (isActiveHomeSite(v) && (estimateWealth(v) >= 10 || countOf(v.inventory, 'coin') >= 2)) {
      const wealth = estimateWealth(v)
      for (const o of state.villagers) {
        if (!o.alive || o.id === v.id) continue
        const hire = scoreHireBuilder(v, o, wealth)
        if (hire > 12) add('hireBuilder', o.x, o.y, hire * reach(v, o.x, o.y), o.id)
      }
    }
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
    // Homeless / thin pantry: idle must lose to livelihood — was 70%+ idle while starving.
    const idleMul =
      !v.hasHome || larder < 1.5 || v.hunger < 2.0 || famine
        ? 0.15
        : night
          ? 0.45
          : 1
    add('idle', idleX, idleY, (3 + p.curiosity * 8 + migrate * 14) * idleMul)
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
        o.kind === 'helpBuild' ||
        o.kind === 'haulForBuild' ||
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
    // Walk to table/target first — no teleport meals from mid-field.
    if (!arrived) {
      /* fall through to movement */
    } else {
      // Repas multi-ticks : on choisit l’aliment au début, on consomme à la fin.
      let food = task.resource
      if (!food || countOf(v.inventory, food) <= 0) {
        food = bestEdible(v, state.tick)
        if (!food) return false
        task.resource = food
      }
      // Eating must work even when exhausted — stamina gate was a starvation softlock.
      if (v.stamina > 0.12) spendStamina(v, STAMINA_LABOR * 0.15)
      const rush = v.hunger < 1.2 || v.starveTimer > 0 ? 1.35 : 1
      task.work += (0.7 + skillSpeedBonus(mindOf(v).skills, 'eat') * 0.15) * rush
      if (task.work < laborWorkNeeded('eat')) return true

      removeFromInventory(v.inventory, food, 1)
      const fromKcal = hungerRestoreFromFood(food)
      const legacy = NUTRITION[food] ?? 0.5
      const atTable =
        v.hasHome &&
        ((v.hasTable && distance(v.x, v.y, v.tableX, v.tableY) <= 2.2) ||
          distance(v.x, v.y, task.targetX, task.targetY) <= 2.2)
      const dineMul = atTable && (v.hasTable || eatSpot(v.furnitureQueue, v.homeLayout)) ? 1.15 : 1
      const cookedMul = isCookedFood(food) ? 1.12 : isRiskyRawFood(food) ? 0.82 : 0.92
      const gain = Math.max(legacy, fromKcal) * dineMul * cookedMul
      v.hunger = Math.min(HUNGER_MAX, v.hunger + gain)
      v.starveTimer = 0
      // Aliments juteux / liquides : petite hydratation.
      const juicy =
        food === 'food' ||
        food === 'fish' ||
        food === 'cooked_fish' ||
        food === 'milk' ||
        food === 'apple' ||
        food === 'pear' ||
        food === 'plum' ||
        food === 'grape' ||
        food === 'ale' ||
        food === 'wine'
          ? 0.45
          : food === 'cabbage' || food === 'turnip' || food === 'carrot' || food === 'mushrooms'
            ? 0.25
            : food === 'bread' || food === 'cheese' || food === 'preserved' || food === 'cooked_game'
              ? 0.06
              : 0.12
      v.thirst = Math.min(THIRST_MAX, (Number.isFinite(v.thirst) ? v.thirst : THIRST_MAX * 0.5) + juicy * dineMul)
      recoverStamina(v, 0.2 * (dineMul > 1 ? 1.1 : 1) * (isCookedFood(food) ? 1.15 : 0.9))
      // Cru risqué : malaise digestif (gut), jamais létal — et rare.
      if (isRiskyRawFood(food) && rng() < 0.1) {
        infectIllness(v, 'gut', 0.25 + rng() * 0.2, TICKS_PER_DAY * (0.6 + rng() * 0.5))
        onCognitiveEvent(v, 'famine', 0.2)
        if ((state.tick + v.id) % 7 === 0) logEvent(state, `${v.name} a mal au ventre (cru)`)
      }
      onCognitiveEvent(
        v,
        'good_meal',
        ((NUTRITION[food] ?? 0.5) >= 1.4 ? 1 : 0.75) * (dineMul > 1 ? 1.1 : 1) * (isCookedFood(food) ? 1.15 : 0.85),
      )
      return false
    }
  }

  if (task.kind === 'drink') {
    if (!arrived) {
      /* fall through to movement */
    } else if (!canDrinkAt(state, v, v.x, v.y) && !canDrinkAt(state, v, task.targetX, task.targetY)) {
      return false
    } else {
      v.thirst = THIRST_MAX
      v.thirstTimer = 0
      recoverStamina(v, 0.08)
      onCognitiveEvent(v, 'good_meal', 0.45)
      return false
    }
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
    if (!v.hasWorkbench) return false
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
    if (!v.hasWorkbench) return false
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
    // Drink/eat/forage/warmth must NEVER abort here — builders were dying of thirst 8 tiles from shore.
    if (
      v.stamina < 0.2 &&
      task.kind !== 'flee' &&
      task.kind !== 'fight' &&
      task.kind !== 'rest' &&
      task.kind !== 'eat' &&
      task.kind !== 'drink' &&
      task.kind !== 'gatherFood' &&
      task.kind !== 'fish' &&
      task.kind !== 'harvestWheat' &&
      task.kind !== 'takeFromChest' &&
      task.kind !== 'lightTorch' &&
      task.kind !== 'tendHearth' &&
      task.kind !== 'placeCandle' &&
      task.kind !== 'tendPlazaFire' &&
      task.kind !== 'buildPlazaFire' &&
      task.kind !== 'gatherFuel'
    ) {
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
        (0.42 +
          (v.profession === 'fisher' ? 0.28 : 0) +
          (onBoat ? 0.18 : 0) +
          fishingCurrentBonus(state.climate, task.targetX, task.targetY) * 0.22) *
        skillYieldBonus(mindOf(v).skills, 'fish')
      const freeze = sampleTempC(state.climate, task.targetX, task.targetY) < -1 ? 0.45 : 1
      if (rng() < catchChance * freeze) {
        const haul = onBoat ? 4 : 3
        const bonus = skillYieldBonus(mindOf(v).skills, 'fish') > 1.25 && rng() < 0.4 ? 1 : 0
        const primary = rng() < 0.88 ? 'fish' : 'food'
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
      if (countOf(v.inventory, 'wood') < needWood || countOf(v.inventory, 'stone') < needStone) return false
      const labor = accumulateLabor('buildBoat')
      if (labor === 'abort') return false
      if (labor === 'continue') return true
      removeFromInventory(v.inventory, 'wood', needWood)
      if (needStone > 0) removeFromInventory(v.inventory, 'stone', needStone)
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
      const yieldAmt = berriesRipeIn(state.season) ? 4 : 2
      const { gained, remaining } = takeFromTile(grid, task.targetX, task.targetY, v, 'food', yieldAmt, BUSH, GRASS, state)
      if (gained <= 0 && remaining <= 0) return false
      if (gained <= 0) return false
      grantGatherExtras(v, 'bush', rng, state)
      if (rng() < 0.08) {
        remember(v, { kind: 'goodSpot', subjectId: null, x: task.targetX, y: task.targetY, tick: state.tick, weight: 0.6, emotion: 0.4 })
      }
      // Keep foraging until a real day-buffer — FOOD_TARGET alone left camps at cliff-edge.
      return edibleValue(v.inventory) < FOOD_TARGET * 1.6
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
        // Match gatherFood yields — half-yield wipe was a silent food sink under house clears.
        const yieldAmt = berriesRipeIn(state.season) ? 4 : 2
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
      if (task.kind === 'gatherWood' && needsFirstBed(v)) freePackForWood(v, BED_COST)
      spendStamina(v, STAMINA_LABOR)
      if (rng() >= laborSuccessChance(v, task.kind)) return true
      // Surface cobbles are hand-gathered — don't grind wood spears down before stone upgrade.
      if (task.kind !== 'gatherStone') wearTool(v)
      if (task.kind === 'gatherWood') {
        if (t !== TREE && !isWoodPile(grid, task.targetX, task.targetY)) return false
        const keep = t === TREE ? TREE : DIRT
        const { gained, remaining } = takeFromTile(grid, task.targetX, task.targetY, v, 'wood', chopYield(v), keep, DIRT, state)
        if (gained > 0 && t === TREE) grantGatherExtras(v, 'tree', rng, state)
        if (remaining <= 0 && t === TREE) packTrailIfConnected(grid, task.targetX, task.targetY)
        if (gained > 0 && rng() < 0.12) {
          remember(v, { kind: 'goodSpot', subjectId: null, x: task.targetX, y: task.targetY, tick: state.tick, weight: 0.5, emotion: 0.3 })
        }
        // Stop once the first bed can be crafted — don't grind forever.
        if (needsFirstBed(v) && countOf(v.inventory, 'wood') >= BED_COST) return false
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
      if (!canMineRock(v.toolTier)) return false
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
      if (!v.hasWorkbench) return false
      if (countOf(v.inventory, 'wool') < WOOL_PER_CLOTH) return false
      const labor = accumulateLabor('weaveCloth')
      if (labor === 'abort') return false
      if (labor === 'continue') return true
      removeFromInventory(v.inventory, 'wool', WOOL_PER_CLOTH)
      addToInventory(v.inventory, 'cloth', 1)
      const q = rollCraftQuality(mindOf(v).skills.craft, rng)
      if (q === 'masterwork') noteMasterworkCraft(state, v, 'toile')
      else if (q === 'fine') onCognitiveEvent(v, 'craft_joy', 0.55)
      return false
    }
    case 'sewClothing': {
      if (!v.hasWorkbench) return false
      const clothHave = countOf(v.inventory, 'cloth')
      const leatherHave = countOf(v.inventory, 'leather')
      if (clothHave < CLOTH_PER_CLOTHING && leatherHave < 1) return false
      const labor = accumulateLabor('sewClothing')
      if (labor === 'abort') return false
      if (labor === 'continue') return true
      if (clothHave >= CLOTH_PER_CLOTHING) {
        removeFromInventory(v.inventory, 'cloth', CLOTH_PER_CLOTHING)
        addToInventory(v.inventory, 'clothing', 1)
        tryEquipFromClothingCraft(v, 'cloth')
        return false
      }
      removeFromInventory(v.inventory, 'leather', 1)
      addToInventory(v.inventory, 'clothing', 1)
      tryEquipFromClothingCraft(v, 'leather')
      return false
    }
    case 'makeCharcoal': {
      if (!v.hasWorkbench) return false
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
      if (!v.hasWorkbench) return false
      if (countOf(v.inventory, 'hide') <= 0) return false
      const labor = accumulateLabor('tanHide')
      if (labor === 'abort') return false
      if (labor === 'continue') return true
      removeFromInventory(v.inventory, 'hide', 1)
      addToInventory(v.inventory, 'leather', 1)
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
      if (!v.hasWorkbench) return false
      if (countOf(v.inventory, 'gold') < NUGGETS_PER_COIN) return false
      const labor = accumulateLabor('mintCoins')
      if (labor === 'abort') return false
      if (labor === 'continue') return true
      removeFromInventory(v.inventory, 'gold', NUGGETS_PER_COIN)
      addToInventory(v.inventory, 'coin', COINS_PER_NUGGET_BATCH)
      return false
    }
    case 'sowField': {
      if (needsClearing(grid, task.targetX, task.targetY)) return false
      if (!isBuildableGround(grid, task.targetX, task.targetY)) return false
      const sowT = sampleTempC(state.climate, task.targetX, task.targetY)
      if (!sowingSeason(state.season, sowT)) return false
      const cropId = pickCropId(rng)
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
      let yieldN = ripeness >= WHEAT_RIPE ? 7 : 3
      const fy = skillYieldBonus(mindOf(v).skills, 'harvestWheat')
      if (fy > 1.2 && ripeness >= WHEAT_RIPE) yieldN += 1
      if (fy > 1.35 && rng() < 0.45) yieldN += 1
      const crop = cropDef(grid.cropType[i] ?? 0)
      yieldN = Math.max(3, Math.round(yieldN * crop.yieldMul))
      addToInventory(v.inventory, crop.resource, yieldN)
      // Verger / vignoble : chance de fruits secondaires proches
      if (crop.resource === 'apple' && rng() < 0.25) addToInventory(v.inventory, 'pear', 1)
      if (crop.resource === 'grape' && rng() < 0.2) addToInventory(v.inventory, 'plum', 1)
      // Resow in-place during sowing season so fields don't go fallow mid-spring.
      const sowT = sampleTempC(state.climate, task.targetX, task.targetY)
      if (sowingSeason(state.season, sowT) && rng() < 0.85) {
        setTerrain(grid, task.targetX, task.targetY, WHEAT, 1)
        // Keep same crop type on the plot.
      } else {
        setTerrain(grid, task.targetX, task.targetY, DIRT)
        grid.cropType[i] = 0
      }
      return false
    }
    case 'grindFlour': {
      const village = state.villages.find((vg) => vg.id === v.villageId)
      const atMill = !!village?.hasMill
      const handGrind = !atMill && v.hasHome
      if (!atMill && !handGrind) return false
      const wheat = countOf(v.inventory, 'wheat')
      const need = WHEAT_PER_FLOUR
      let grainKind: ResourceType | null = wheat >= need ? 'wheat' : null
      let grainNeed = need
      if (!grainKind && atMill) {
        for (const grain of MILL_GRAINS) {
          if (countOf(v.inventory, grain) >= 2) {
            grainKind = grain
            grainNeed = 2
            break
          }
        }
      }
      if (!grainKind) return false
      const labor = accumulateLabor('grindFlour')
      if (labor === 'abort') return false
      if (labor === 'continue') return true
      removeFromInventory(v.inventory, grainKind, grainNeed)
      addToInventory(v.inventory, 'flour', 1)
      return false
    }
    case 'craftGoods': {
      const recipeId = task.resource
      const recipe = CRAFT_RECIPES.find((r) => r.output === recipeId || r.id === recipeId) ?? CRAFT_RECIPES.find((r) => recipeCraftable(r, (t) => countOf(v.inventory, t)))
      if (!recipe) return false
      if (recipe.station === 'workbench' && !v.hasWorkbench) return false
      if (recipe.station === 'hearth' && !v.hasHome) return false
      if (recipe.station === 'any' && !v.hasWorkbench && !v.hasHome) return false
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
      if (v.illness && v.illness.remaining > 0) {
        const cut = dose === 'medicine' ? 0.25 : 0.45
        v.illness.remaining = Math.floor(v.illness.remaining * cut)
        v.illness.severity = Math.max(0.1, v.illness.severity * (dose === 'medicine' ? 0.4 : 0.65))
        if (v.illness.remaining < 10) {
          v.illness = null
          logEvent(state, `${v.name} guérit grâce à un remède`)
        }
      }
      return false
    }
    case 'bakeBread': {
      // Hearth or workbench — flatbread on the fire is fine without a bench.
      if (!v.hasWorkbench && !v.hasHome) return false
      if (countOf(v.inventory, 'flour') <= 0) return false
      const labor = accumulateLabor('bakeBread')
      if (labor === 'abort') return false
      if (labor === 'continue') return true
      removeFromInventory(v.inventory, 'flour', 1)
      addToInventory(v.inventory, 'bread', BREAD_PER_FLOUR)
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
    case 'buildWell': {
      const village = state.villages.find((vg) => vg.id === v.villageId)
      if (!village || !village.wellAgreed || village.hasWell) return false
      if (needsClearing(grid, task.targetX, task.targetY)) return false
      if (getTerrain(grid, task.targetX, task.targetY) === WELL) {
        village.hasWell = true
        village.wellX = task.targetX
        village.wellY = task.targetY
        setClaim(grid, task.targetX, task.targetY, CLAIM_WELL)
        return false
      }
      if (countOf(v.inventory, 'wood') < WELL_WOOD_COST || countOf(v.inventory, 'stone') < WELL_STONE_COST) return false
      setTerrain(grid, task.targetX, task.targetY, WELL)
      removeFromInventory(v.inventory, 'wood', WELL_WOOD_COST)
      removeFromInventory(v.inventory, 'stone', WELL_STONE_COST)
      village.hasWell = true
      village.wellX = task.targetX
      village.wellY = task.targetY
      setClaim(grid, task.targetX, task.targetY, CLAIM_WELL)
      stampPlaza(grid, village.centerX, village.centerY)
      linkToHub(grid, village.centerX, village.centerY, task.targetX, task.targetY, 1)
      logEvent(state, `${v.name} a creusé le puits communal`)
      noteMilestone(state, 'firstWell', `Premier puits communal`)
      onCognitiveEvent(v, 'good_meal', 0.55)
      return false
    }
    case 'buildPlazaFire': {
      const village = state.villages.find((vg) => vg.id === v.villageId)
      if (!village || !village.plazaFireAgreed || village.hasPlazaFire) return false
      if (needsClearing(grid, task.targetX, task.targetY)) return false
      if (getTerrain(grid, task.targetX, task.targetY) === PLAZA_FIRE) {
        village.hasPlazaFire = true
        village.plazaFireX = task.targetX
        village.plazaFireY = task.targetY
        setClaim(grid, task.targetX, task.targetY, CLAIM_PLAZA_FIRE)
        if (village.plazaFireLitUntil < state.tick) village.plazaFireLitUntil = state.tick + PLAZA_FIRE_BURN
        return false
      }
      if (countOf(v.inventory, 'wood') < PLAZA_FIRE_WOOD_COST || countOf(v.inventory, 'stone') < PLAZA_FIRE_STONE_COST)
        return false
      setTerrain(grid, task.targetX, task.targetY, PLAZA_FIRE)
      removeFromInventory(v.inventory, 'wood', PLAZA_FIRE_WOOD_COST)
      removeFromInventory(v.inventory, 'stone', PLAZA_FIRE_STONE_COST)
      village.hasPlazaFire = true
      village.plazaFireX = task.targetX
      village.plazaFireY = task.targetY
      village.plazaFireLitUntil = state.tick + PLAZA_FIRE_BURN
      setClaim(grid, task.targetX, task.targetY, CLAIM_PLAZA_FIRE)
      stampPlaza(grid, village.centerX, village.centerY)
      linkToHub(grid, village.centerX, village.centerY, task.targetX, task.targetY, 1)
      logEvent(state, `${v.name} allume le feu de la place`)
      noteMilestone(state, 'firstPlazaFire', `Premier feu de place`)
      onCognitiveEvent(v, 'hearth_warm', 0.7)
      return false
    }
    case 'tendPlazaFire': {
      const village = state.villages.find((vg) => vg.id === v.villageId)
      if (!village?.hasPlazaFire) return false
      if (distance(v.x, v.y, task.targetX, task.targetY) > 2.2) return true
      const fuel = fuelCount(v.inventory)
      if (fuel <= 0) return false
      // Burn one wood / fagot equivalent from inventory.
      if (countOf(v.inventory, 'wood') > 0) removeFromInventory(v.inventory, 'wood', 1)
      else if (countOf(v.inventory, 'charcoal') > 0) removeFromInventory(v.inventory, 'charcoal', 1)
      else return false
      village.plazaFireLitUntil = state.tick + PLAZA_FIRE_BURN
      logEvent(state, `${v.name} ravive le feu de la place`)
      onCognitiveEvent(v, 'hearth_warm', 0.5)
      return false
    }
    case 'buildHouse': {
      ensureBuildQueue(v, grid, rng)
      const fp = homeFootprint(v)
      if (!fp) return false
      if (needsClearing(grid, task.targetX, task.targetY)) return false
      if (exhaustedAbort()) return false
      spendStamina(v, STAMINA_LABOR * 0.8)
      if (rng() >= laborSuccessChance(v, 'buildHouse')) return true

      let block = v.buildQueue.find((b) => !b.done && b.x === task.targetX && b.y === task.targetY)
      if (!block) block = nextBuildBlock(v.buildQueue, grid) ?? undefined
      if (!block) {
        // Thin fallback: legacy wall stamp while migrating old homes without a queue.
        if (countOf(v.inventory, 'wood') < TILE_COST) return false
        const t = getTerrain(grid, task.targetX, task.targetY)
        if (t !== HOUSE && t !== WALL_WOOD && t !== WALL_STONE) {
          setTerrain(grid, task.targetX, task.targetY, HOUSE)
          mirrorTerrainToBlocks(state.blocks, task.targetX, task.targetY, HOUSE, 1)
          removeFromInventory(v.inventory, 'wood', TILE_COST)
        }
      } else {
        const cost = materialCost(block)
        if (cost.wood > 0 && countOf(v.inventory, 'wood') < cost.wood) return false
        if (cost.stone > 0 && countOf(v.inventory, 'stone') < cost.stone) return false
        // Don't spend reserved timber on floors while the first bed is still missing.
        if (
          block.kind === 'floor' &&
          cost.wood > 0 &&
          needsFirstBed(v) &&
          countOf(v.inventory, 'wood') - cost.wood < BED_COST
        ) {
          return false
        }
        if (!placeBuildBlock(grid, block, state.blocks)) return false
        if (cost.wood > 0) removeFromInventory(v.inventory, 'wood', cost.wood)
        if (cost.stone > 0) removeFromInventory(v.inventory, 'stone', cost.stone)
        markBlockDone(v.buildQueue, block.x, block.y, block.kind)
      }

      const next = nextBuildBlock(v.buildQueue, grid)
      const structLeft = structuralBlocksRemaining(v.buildQueue)
      // Shell complete only when every wall block was placed — never auto-seal at 70%.
      if (structLeft === 0 && !v.hasHome) {
        if (tryCloseHomeShell(state, v)) {
          celebrateFirstHome(state, v, rng)
        }
        // Always finish the door threshold before yielding to furniture craft.
        const after = nextBuildBlock(v.buildQueue, grid)
        if (after && after.kind === 'door') {
          task.targetX = after.x
          task.targetY = after.y
          return true
        }
        return false
      }
      // Yield for first bed only when the door is already placed.
      if (
        v.hasHome &&
        needsFirstBed(v) &&
        nextFurnitureJob(v.furnitureQueue)?.kind === 'bed' &&
        countOf(v.inventory, 'wood') >= BED_COST
      ) {
        const after = nextBuildBlock(v.buildQueue, grid)
        if (!after || after.kind !== 'door') return false
      }
      if (next) {
        task.targetX = next.x
        task.targetY = next.y
        return true
      }
      return false
    }
    case 'helpBuild': {
      const owner = state.villagers.find((o) => o.id === task.targetId && o.alive)
      if (!owner || !isActiveHomeSite(owner)) return false
      if (distance(v.x, v.y, task.targetX, task.targetY) > 1.6) return true
      if (exhaustedAbort()) return false
      spendStamina(v, STAMINA_LABOR * 0.75)
      if (rng() >= laborSuccessChance(v, 'helpBuild')) return true
      const wasNew = !owner.hasHome
      const placed = placeBlockForOwner(state, v, owner, task.targetX, task.targetY)
      if (!placed.ok) return false
      const pay = settleBuildHelp(state, v, owner, 'helpBuild', {
        hired: estimateWealth(owner) >= 14,
        buildSkill: mindOf(v).skills.build,
      })
      void pay
      upsertSemantic(
        mindOf(owner).semantic,
        'person_trait',
        `${v.name} aide au chantier`,
        0.55 + mindOf(v).skills.build * 0.3,
        state.tick,
        owner.homeX,
        owner.homeY,
        v.id,
      )
      if (v.profession === 'builder' || mindOf(v).skills.build > 0.5) {
        upsertSemantic(
          mindOf(v).semantic,
          'person_trait',
          'bon bâtisseur',
          0.45 + mindOf(v).skills.build * 0.4,
          state.tick,
          v.x,
          v.y,
          v.id,
        )
      }
      if ((state.tick + v.id) % 70 === 0) {
        logEvent(state, `${v.name} ${collabHelpLabelFr('helpBuild', owner.name)}`)
      }
      if (!owner.hasHome && (placed.structLeft === 0 || tryCloseHomeShell(state, owner))) {
        if (wasNew && owner.hasHome) celebrateFirstHome(state, owner, rng)
      }
      return false
    }
    case 'haulForBuild': {
      const owner = state.villagers.find((o) => o.id === task.targetId && o.alive)
      if (!owner || !isActiveHomeSite(owner)) return false
      if (distance(v.x, v.y, owner.homeX, owner.homeY) > 2.2) return true
      if (exhaustedAbort()) return false
      spendStamina(v, STAMINA_LABOR * 0.45)
      // Merchant / neighbour fund: gift coin (or wood via fundOwnerBuild).
      if (task.resource === 'coin') {
        if (fundOwnerBuild(v, owner) === 'none') return false
        settleBuildHelp(state, v, owner, 'haulForBuild')
        if ((state.tick + v.id) % 80 === 0) {
          logEvent(state, `${v.name} finance le chantier de ${owner.name}`)
        }
        return false
      }
      const childHaul = isChild(v)
      const siteStub = {
        owner,
        next: nextBuildBlock(owner.buildQueue, grid),
        needWood: 1,
        needStone: 1,
        wealth: estimateWealth(owner),
        helperCount: 0,
        maxHelpers: 2,
        dist: 0,
        materialGap: true,
        canHire: false,
      }
      const res =
        task.resource === 'wood' || task.resource === 'stone'
          ? task.resource
          : preferredHaulResource(v, siteStub, childHaul)
      if (!res) return false
      const amt =
        res === 'wood' ? (childHaul ? CHILD_HAUL_WOOD : ADULT_HAUL_WOOD) : ADULT_HAUL_STONE
      if (!haulMaterialsToOwner(v, owner, res, amt)) return false
      settleBuildHelp(state, v, owner, 'haulForBuild')
      if ((state.tick + v.id) % 75 === 0) {
        logEvent(state, `${v.name} ${collabHelpLabelFr('haulForBuild', owner.name)}`)
      }
      return false
    }
    case 'hireBuilder': {
      const builder = state.villagers.find((o) => o.id === task.targetId && o.alive)
      if (!builder) return false
      if (distance(v.x, v.y, builder.x, builder.y) > SOCIAL_RANGE) return true
      if (!isActiveHomeSite(v)) return false
      settleHireAdvance(state, v, builder)
      logEvent(state, `${v.name} embauche ${builder.name} pour le chantier`)
      upsertSemantic(
        mindOf(builder).semantic,
        'person_trait',
        `embauché par ${v.name}`,
        0.5,
        state.tick,
        v.homeX,
        v.homeY,
        v.id,
      )
      return false
    }
    case 'assistCraftTools': {
      const owner = state.villagers.find((o) => o.id === task.targetId && o.alive)
      if (!owner || !isActiveHomeSite(owner)) return false
      if (distance(v.x, v.y, owner.homeX, owner.homeY) > 2.4) return true
      if (exhaustedAbort()) return false
      spendStamina(v, STAMINA_LABOR * 0.6)
      if (!assistOwnerTools(v, owner)) return false
      settleBuildHelp(state, v, owner, 'assistCraftTools')
      logEvent(state, `${v.name} ${collabHelpLabelFr('assistCraftTools', owner.name)}`)
      return false
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
    case 'buildWorkbench': {
      if (countOf(v.inventory, 'wood') < WORKBENCH_COST) return false
      const labor = accumulateLabor('buildWorkbench')
      if (labor === 'abort') return false
      if (labor === 'continue') return true
      setTerrain(grid, task.targetX, task.targetY, WORKBENCH)
      mirrorTerrainToBlocks(state.blocks, task.targetX, task.targetY, WORKBENCH, 0)
      removeFromInventory(v.inventory, 'wood', WORKBENCH_COST)
      v.hasWorkbench = true
      v.workbenchX = task.targetX
      v.workbenchY = task.targetY
      const done = markFurnitureDone(v.furnitureQueue, task.targetX, task.targetY)
      const roomFr = done ? ROOM_LABEL_FR[done.roomKind] : 'atelier'
      logEvent(state, `${v.name} installe un ${furnitureLabelFr(done?.kind ?? 'workbench')} dans ${roomFr}`)
      return false
    }
    case 'buildChest': {
      if (countOf(v.inventory, 'wood') < CHEST_COST) return false
      const labor = accumulateLabor('buildChest')
      if (labor === 'abort') return false
      if (labor === 'continue') return true
      setTerrain(grid, task.targetX, task.targetY, CHEST)
      mirrorTerrainToBlocks(state.blocks, task.targetX, task.targetY, CHEST, 0)
      removeFromInventory(v.inventory, 'wood', CHEST_COST)
      v.hasChest = true
      v.chestX = task.targetX
      v.chestY = task.targetY
      if (!v.chestInventory) v.chestInventory = createInventory(20)
      const done = markFurnitureDone(v.furnitureQueue, task.targetX, task.targetY)
      const roomFr = done ? ROOM_LABEL_FR[done.roomKind] : 'réserve'
      logEvent(state, `${v.name} place un ${furnitureLabelFr(done?.kind ?? 'chest')} dans ${roomFr}`)
      return false
    }
    case 'buildBed': {
      freePackForWood(v, BED_COST)
      if (countOf(v.inventory, 'wood') < BED_COST) return false
      const labor = accumulateLabor('buildBed')
      if (labor === 'abort') return false
      if (labor === 'continue') return true
      setTerrain(grid, task.targetX, task.targetY, BED)
      mirrorTerrainToBlocks(state.blocks, task.targetX, task.targetY, BED, 0)
      removeFromInventory(v.inventory, 'wood', BED_COST)
      v.bedCount += 1
      const done = markFurnitureDone(v.furnitureQueue, task.targetX, task.targetY)
      const roomFr = done ? ROOM_LABEL_FR[done.roomKind] : 'chambre'
      logEvent(state, `${v.name} fabrique un ${furnitureLabelFr(done?.kind ?? 'bed')} dans ${roomFr}`)
      return false
    }
    case 'buildTable': {
      if (countOf(v.inventory, 'wood') < TABLE_COST) return false
      const labor = accumulateLabor('buildTable')
      if (labor === 'abort') return false
      if (labor === 'continue') return true
      setTerrain(grid, task.targetX, task.targetY, TABLE)
      mirrorTerrainToBlocks(state.blocks, task.targetX, task.targetY, TABLE, 0)
      removeFromInventory(v.inventory, 'wood', TABLE_COST)
      v.hasTable = true
      v.tableX = task.targetX
      v.tableY = task.targetY
      const done = markFurnitureDone(v.furnitureQueue, task.targetX, task.targetY)
      const roomFr = done ? ROOM_LABEL_FR[done.roomKind] : 'salle à manger'
      logEvent(state, `${v.name} dresse une table dans ${roomFr}`)
      return false
    }
    case 'buildHearth': {
      const hearthWood = woodNeededForFurniture('hearth')
      if (countOf(v.inventory, 'wood') < hearthWood && countOf(v.inventory, 'stone') < 2) return false
      const labor = accumulateLabor('buildHearth')
      if (labor === 'abort') return false
      if (labor === 'continue') return true
      if (countOf(v.inventory, 'stone') >= 2) removeFromInventory(v.inventory, 'stone', 2)
      else removeFromInventory(v.inventory, 'wood', hearthWood)
      setTerrain(grid, task.targetX, task.targetY, HEARTH)
      mirrorTerrainToBlocks(state.blocks, task.targetX, task.targetY, HEARTH, 0)
      const done = markFurnitureDone(v.furnitureQueue, task.targetX, task.targetY)
      if (!v.homeFurniture.some((f) => f.id === 'hearth')) {
        v.homeFurniture.push({ id: 'hearth', x: task.targetX, y: task.targetY })
      }
      const roomFr = done ? ROOM_LABEL_FR[done.roomKind] : 'cuisine'
      logEvent(state, `${v.name} maçonne un âtre dans ${roomFr}`)
      return false
    }
    case 'buildBench':
    case 'buildStool':
    case 'buildShelf':
    case 'buildCupboard':
    case 'buildCradle':
    case 'buildLoom':
    case 'buildWashingTub': {
      const softKind =
        task.kind === 'buildBench'
          ? 'bench'
          : task.kind === 'buildStool'
            ? 'stool'
            : task.kind === 'buildShelf'
              ? 'shelf'
              : task.kind === 'buildCupboard'
                ? 'cupboard'
                : task.kind === 'buildCradle'
                  ? 'cradle'
                  : task.kind === 'buildLoom'
                    ? 'loom'
                    : 'tub'
      const softWood = woodNeededForFurniture(softKind)
      if (countOf(v.inventory, 'wood') < softWood) return false
      const labor = accumulateLabor(task.kind)
      if (labor === 'abort') return false
      if (labor === 'continue') return true
      removeFromInventory(v.inventory, 'wood', softWood)
      const done = markFurnitureDone(v.furnitureQueue, task.targetX, task.targetY)
      const placeId = softKind as Exclude<FurnitureKind, 'workbench' | 'chest' | 'bed' | 'table'>
      if (!v.homeFurniture.some((f) => f.id === placeId && f.x === task.targetX && f.y === task.targetY)) {
        v.homeFurniture.push({ id: placeId, x: task.targetX, y: task.targetY })
      }
      const roomFr = done ? ROOM_LABEL_FR[done.roomKind] : 'maison'
      logEvent(state, `${v.name} fabrique un ${furnitureLabelFr(softKind)} dans ${roomFr}`)
      return false
    }
    case 'lightTorch': {
      if (torchIsLit(v, state.tick)) return false
      if (countOf(v.inventory, 'torch') <= 0) return false
      removeFromInventory(v.inventory, 'torch', 1)
      v.torchLitUntil = state.tick + TORCH_BURN_TICKS
      onCognitiveEvent(v, 'hearth_warm', 0.35)
      logEvent(state, `${v.name} allume une torche`)
      return false
    }
    case 'placeCandle': {
      const keeper = homeKeeper(state, v)
      if (homeIsLit(keeper, state.tick)) return false
      const useLamp = countOf(v.inventory, 'oil_lamp') > 0
      const useCandle = countOf(v.inventory, 'candle') > 0
      if (!useLamp && !useCandle) return false
      if (distance(v.x, v.y, task.targetX, task.targetY) > 2.2) return true
      if (useCandle) removeFromInventory(v.inventory, 'candle', 1)
      else removeFromInventory(v.inventory, 'oil_lamp', 1)
      keeper.homeLightUntil = state.tick + CANDLE_BURN_TICKS
      onCognitiveEvent(v, 'hearth_warm', 0.4)
      logEvent(state, `${v.name} pose une ${useCandle ? 'chandelle' : 'lampe'} au foyer`)
      return false
    }
    case 'tendHearth': {
      const keeper = homeKeeper(state, v)
      if (distance(v.x, v.y, task.targetX, task.targetY) > 2.2) return true
      let fuel = bestFuelIn(v.inventory)
      if (!fuel && v.chestInventory) {
        fuel = bestFuelIn(v.chestInventory)
        if (fuel) {
          removeFromInventory(v.chestInventory, fuel, 1)
          addToInventory(v.inventory, fuel, 1)
        }
      }
      if (!fuel) return false
      removeFromInventory(v.inventory, fuel, 1)
      keeper.hearthLitUntil = state.tick + HEARTH_BURN_TICKS
      // Fagots last a bit longer; wood/peat shorter.
      if (fuel === 'firewood' || fuel === 'charcoal') keeper.hearthLitUntil += 40
      onCognitiveEvent(v, 'hearth_warm', 0.7)
      recoverStamina(v, 0.04)
      logEvent(state, `${v.name} attise l’âtre`)
      return false
    }
    case 'gatherFuel': {
      // Same labor as woodcutting — fuel for the hearth.
      const t = getTerrain(grid, task.targetX, task.targetY)
      if (exhaustedAbort()) return false
      spendStamina(v, STAMINA_LABOR)
      if (rng() >= laborSuccessChance(v, 'gatherWood')) return true
      wearTool(v)
      if (t !== TREE && !isWoodPile(grid, task.targetX, task.targetY)) return false
      const keep = t === TREE ? TREE : DIRT
      const { gained, remaining } = takeFromTile(grid, task.targetX, task.targetY, v, 'wood', chopYield(v), keep, DIRT, state)
      if (gained > 0) {
        // Keep raw timber for unfinished shells — only bundle surplus into firewood.
        const woodHave = countOf(v.inventory, 'wood')
        const reserve = v.buildQueue.some((b) => !b.done && (b.kind === 'wall' || b.kind === 'floor'))
          ? Math.max(6, structuralBlocksRemaining(v.buildQueue) + 2)
          : 2
        if (woodHave > reserve) {
          const bundles = Math.min(2, Math.floor((woodHave - reserve) / 2))
          if (bundles > 0) {
            removeFromInventory(v.inventory, 'wood', bundles * 2)
            addToInventory(v.inventory, 'firewood', bundles * 3)
          }
        }
        if (t === TREE) grantGatherExtras(v, 'tree', rng, state)
      }
      if (remaining <= 0 && t === TREE) packTrailIfConnected(grid, task.targetX, task.targetY)
      return gained > 0 && remaining > 0 && fuelCount(v.inventory) < 8
    }
    case 'craftLight': {
      const want = task.resource
      const lightRecipes = CRAFT_RECIPES.filter(
        (r) =>
          (r.output === 'torch' || r.output === 'candle' || r.output === 'oil_lamp' || r.output === 'lantern' || r.output === 'firewood') &&
          (want == null || r.output === want) &&
          recipeCraftable(r, (t) => countOf(v.inventory, t)),
      )
      const recipe =
        lightRecipes.find((r) => r.output === want) ??
        lightRecipes.sort((a, b) => b.urge - a.urge)[0] ??
        null
      if (!recipe) return false
      if (recipe.station === 'workbench' && !v.hasWorkbench) return false
      if (recipe.station === 'hearth' && !v.hasHome) return false
      const labor = accumulateLabor('craftLight')
      if (labor === 'abort') return false
      if (labor === 'continue') return true
      spendRecipeInputs(recipe, (t, n) => {
        removeFromInventory(v.inventory, t, n)
      })
      addToInventory(v.inventory, recipe.output, recipe.outputCount)
      onCognitiveEvent(v, 'craft_joy', 0.35)
      logEvent(state, `${v.name} fabrique ${recipe.labelFr}`)
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
      // Never dump human meals into the pen — grain surplus only.
      const grainTypes: ResourceType[] = ['wheat', 'oats', 'barley', 'rye']
      for (const g of grainTypes) {
        const grain = countOf(v.inventory, g)
        const spare = Math.max(0, grain - 2)
        if (spare > 0) {
          v.penFeed += removeFromInventory(v.inventory, g, Math.min(spare, 3))
          return false
        }
      }
      const spareTurnip = Math.max(0, countOf(v.inventory, 'turnip') - 1)
      if (spareTurnip > 0 && edibleValue(v.inventory) > FOOD_TARGET * 2) {
        v.penFeed += removeFromInventory(v.inventory, 'turnip', Math.min(spareTurnip, 2))
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
      // Wake for food/water — sleeping through hunger with bread in the pack was a death spiral.
      const thirstWake = Number.isFinite(v.thirst) ? v.thirst : THIRST_MAX * 0.5
      // Allow stamina recovery when spent — don't wake mid-nap for mild pantry dips.
      if (
        v.stamina < STAMINA_TIRED &&
        thirstWake >= 1.45 &&
        v.hunger >= 1.55 &&
        v.starveTimer < 2 &&
        v.thirstTimer < 2
      ) {
        /* keep resting to recover */
      } else if (
        v.hunger < 1.65 ||
        thirstWake < 1.55 ||
        v.starveTimer > 0 ||
        v.thirstTimer > 0 ||
        (edibleValue(v.inventory) < 1.0 && v.hunger < 2.2)
      ) {
        return false
      }
      const sheltered = atHomeShelter(v)
      const inChambre = v.homeLayout ? findRoomAt(v.homeLayout, v.x, v.y)?.kind === 'chambre' : false
      const bedBonus = v.bedCount > 0 && sheltered ? STAMINA_REST_BED : sheltered ? STAMINA_REST_HOME : STAMINA_IDLE * 1.6
      const fireBonus = hearthSleepBonus(state, v)
      recoverStamina(v, bedBonus * (inChambre ? 1.15 : 1) + fireBonus)
      // Rembourse la dette de sommeil (lit/nuit >> sieste dehors).
      const night = isNight(state.tick)
      const debtPay =
        v.bedCount > 0 && sheltered
          ? SLEEP_DEBT_REST_BED
          : sheltered
            ? SLEEP_DEBT_REST_HOME
            : SLEEP_DEBT_REST_OPEN
      paySleepDebt(v, debtPay * (night ? 1.25 : 0.7) * (inChambre ? 1.1 : 1) * (fireBonus > 0 ? 1.08 : 1))
      if (sheltered && v.hunger > 0.5) {
        // Quiet recovery near the hearth — slight hunger cost of resting idle.
        if (state.season === 'winter') recoverStamina(v, 0.02)
      }
      if (fireBonus > 0 && task.ageTicks === 0) onCognitiveEvent(v, 'hearth_warm', 0.45)
      const debt = ensureSleepDebt(v)
      const need =
        (night ? (fireBonus > 0 ? 36 : 30) : v.stamina < STAMINA_TIRED ? 50 : 40) +
        (debt > 1.5 ? Math.round(debt * 8) : 0)
      // Continuer à dormir tant que la dette n’est pas soldée, même si stamina pleine.
      return task.ageTicks < need && (v.stamina < STAMINA_MAX - 0.05 || debt > 0.35)
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
    case 'pray': {
      if (distance(v.x, v.y, task.targetX, task.targetY) > 2.2) return true
      doPray(state, v)
      return task.ageTicks < 10
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
      const wolf = nearestAlive(state.wolves, v.x, v.y, DANGER_RADIUS)
      if (!wolf) {
        recoverStamina(v, STAMINA_IDLE * 0.5)
        return task.ageTicks < 6
      }
      // Real guard duty: close and hold — tickCombat applies hits when in range.
      task.targetX = wolf.x
      task.targetY = wolf.y
      task.targetId = wolf.id
      spendStamina(v, STAMINA_FIGHT * 0.35)
      if (distance(v.x, v.y, wolf.x, wolf.y) > COMBAT_RADIUS) {
        nudgeToward(
          grid,
          v,
          wolf.x,
          wolf.y,
          Math.max(1, travelSpeedFor(state, v) - 1),
          pathProfileFor(state, v, task),
          1,
          (nx, ny, fx, fy) => onVillagerStep(state, v, nx, ny, fx, fy),
        )
      }
      return wolf.alive && task.ageTicks < 28
    }
    case 'flee': {
      // Primary flee path runs before executeTask; keep stale flee from softlocking.
      recoverStamina(v, STAMINA_IDLE * 0.2)
      return task.ageTicks < 3
    }
    case 'fight': {
      const wolf =
        task.targetId !== null
          ? state.wolves.find((w) => w.id === task.targetId && w.alive)
          : nearestAlive(state.wolves, v.x, v.y, DANGER_RADIUS)
      if (!wolf) return false
      task.targetX = wolf.x
      task.targetY = wolf.y
      spendStamina(v, STAMINA_FIGHT * 0.35)
      if (distance(v.x, v.y, wolf.x, wolf.y) > COMBAT_RADIUS) {
        nudgeToward(
          grid,
          v,
          wolf.x,
          wolf.y,
          Math.max(1, travelSpeedFor(state, v) - 1),
          pathProfileFor(state, v, task),
          1,
          (nx, ny, fx, fy) => onVillagerStep(state, v, nx, ny, fx, fy),
        )
      }
      return wolf.alive && task.ageTicks < 36
    }
    case 'mount': {
      const horse = state.horses.find(
        (h) => h.alive && (h.ownerId === v.id || h.ownerId === null) && distance(v.x, v.y, h.x, h.y) <= 2.2,
      )
      if (!horse) return false
      v.mounted = true
      v.horseId = horse.id
      horse.riderId = v.id
      horse.ownerId = horse.ownerId ?? v.id
      logEvent(state, `${v.name} monte à cheval`)
      return false
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

function maybeFeedDependentChildren(state: SimState, parent: Villager) {
  if (edibleValue(parent.inventory) < 1 || parent.hunger < 1.2) return
  for (const child of state.villagers) {
    if (!child.alive || !isDependentChild(child)) continue
    if (!isParentOf(parent, child)) continue
    if (child.hunger >= HUNGRY_THRESHOLD + 0.35) continue
    if (distance(parent.x, parent.y, child.x, child.y) > 3.5) continue
    if (doGiveFood(state, parent, child)) {
      // After gift, child may still need to eat — nudge hunger if they hold food.
      const bite =
        countOf(child.inventory, 'bread') > 0
          ? 'bread'
          : countOf(child.inventory, 'food') > 0
            ? 'food'
            : null
      if (bite && child.hunger < HUNGER_MAX - 0.2) {
        removeFromInventory(child.inventory, bite, 1)
        child.hunger = Math.min(HUNGER_MAX, child.hunger + (bite === 'bread' ? 1.4 : 1.0))
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
  if (tickThirst(v, villagerThirstDrain(state, v))) {
    v.alive = false
    state.deaths += 1
    logEvent(state, `${v.name} meurt de soif`)
    onDeath(state, v, null)
    return
  }
  tickSleepDebt(state, v)
  // Privé de sommeil extrême → micro-drain stamina (pas mort directe).
  {
    const debt = ensureSleepDebt(v)
    if (debt > 3.2 && (state.tick + v.id) % 9 === 0) {
      spendStamina(v, 0.04 + (debt - 3.2) * 0.05)
    }
  }
  // Spoilage vivres (stagger) — grain / salaison / miel / fromage / vin exempts.
  if ((state.tick + v.id * 7) % 18 === 0) {
    const lostBag = tickFoodSpoil(v.inventory, state.tick, rng)
    let lostChest = 0
    if (v.chestInventory) lostChest += tickFoodSpoil(v.chestInventory, state.tick, rng)
    if (v.cupboardInventory) lostChest += tickFoodSpoil(v.cupboardInventory, state.tick, rng)
    const lost = lostBag + lostChest
    if (lost > 0 && (state.tick + v.id) % 23 === 0) {
      logEvent(state, `${v.name} perd ${lost} ration${lost > 1 ? 's' : ''} avariée${lost > 1 ? 's' : ''}`)
    }
  }
  if (tickIllness(state, v)) return
  // Soins parentaux : transfert direct si enfant dépendant affamé à proximité.
  if (!isChild(v) && (state.tick + v.id) % 12 === 0) {
    maybeFeedDependentChildren(state, v)
  }
  // Contagion / déclenchement maladie = état (durée), pas −HP immédiat.
  if ((state.tick + v.id * 13) % 53 === 0 && v.health > 0) {
    const ageNorm = Math.min(1, v.age / LIFESPAN_SOFT)
    const pressure = diseasePressure(v.phenotype, ageNorm, state.famine)
    // Early pioneers: lower outbreak rate so the first month isn't a plague wipe.
    const pioneerGrace = state.tick < TICKS_PER_DAY * 40 ? 0.35 : 1
    if (pressure > 0.55 && rng() < pressure * 0.02 * pioneerGrace * (v.hunger < 1.5 ? 1.25 : 1) * (v.thirst < 1.2 ? 1.15 : 1)) {
      const sev = Math.min(0.75, 0.3 + pressure * 0.4)
      const kind: IllnessKind = state.season === 'winter' ? 'chill' : 'fever'
      infectIllness(v, kind, sev, TICKS_PER_DAY * (1.0 + sev * 1.6))
      logEvent(state, `${v.name} tombe malade (${kind === 'chill' ? 'frissons' : 'fièvre'})`)
      onCognitiveEvent(v, 'famine', 0.2 + sev * 0.25)
    }
  }
  // Mortalité de vieillesse (courbe + agingRateBias) — dégâts puis mort.
  if ((state.tick + v.id * 17) % 71 === 0 && v.health > 0) {
    const p = oldAgeMortalityChance(v.phenotype, v.age)
    if (p > 0 && rng() < p) {
      v.health -= 1
      if (v.health <= 0) {
        v.alive = false
        state.deaths += 1
        logEvent(state, `${fullNameOf(v)} meurt de vieillesse`)
        onDeath(state, v, null)
        return
      }
    }
  }
  // Cold / heat / wet outdoors drain stamina; hearth recovers a little even without a rest task.
  // Severe exposure accumulates → health damage (hypothermie / coup de chaleur) puis mort.
  {
    const air = sampleTempC(state.climate, v.x, v.y)
    const cold = coldStress01(air)
    const heat = heatStress01(air)
    const rain = sampleRain(state.climate, v.x, v.y)
    const byFire = nearWarmFireLocal(state, v)
    const sheltered = atHomeShelter(v)
    if (!sheltered && !v.embarked && !byFire && (cold > 0.05 || heat > 0.05 || rain > 0.4)) {
      spendStamina(v, cold * (isNight(state.tick) ? 0.022 : 0.01) + heat * 0.014 + rain * 0.008)
    } else if ((sheltered || byFire) && !v.task) {
      recoverStamina(v, byFire ? 0.04 : 0.028)
    } else if (!v.task && v.stamina < STAMINA_TIRED) {
      recoverStamina(v, 0.01)
    }

    if (!Number.isFinite(v.coldExposure)) v.coldExposure = 0
    if (!Number.isFinite(v.heatExposure)) v.heatExposure = 0

    const cloak = cloakWarmth01(v)
    let coldEff = cold
    if (byFire) coldEff *= 0.08
    else if (sheltered) coldEff *= 0.32
    coldEff *= Math.max(0.05, 1 - cloak * 0.9)
    if (isNight(state.tick) && !sheltered) coldEff *= 1.2
    if (rain > 0.45 && !sheltered) coldEff *= 1.25

    let heatEff = heat
    if (sheltered) heatEff *= 0.5
    if (v.embarked || getTerrain(grid, v.x, v.y) === WATER || touchesWater(grid, v.x, v.y)) heatEff *= 0.55
    const thirstNow = Number.isFinite(v.thirst) ? v.thirst : THIRST_MAX * 0.5
    if (thirstNow < 1.4) heatEff *= 1.35
    else if (thirstNow < 2.2) heatEff *= 1.12

    if (coldEff > 0.28) {
      // First two months outdoors: damp exposure so founders can finish a shell before hypothermia wipe.
      const buildingWarmth =
        v.task?.kind === 'buildHouse' ||
        v.task?.kind === 'buildPlazaFire' ||
        v.task?.kind === 'tendPlazaFire' ||
        v.task?.kind === 'gatherFuel' ||
        v.task?.kind === 'clearLand'
          ? 0.7
          : 1
      const pioneerCold = state.tick < TICKS_PER_DAY * 55 ? 0.32 : 1
      v.coldExposure += coldEff * pioneerCold * buildingWarmth
      if (v.coldExposure >= EXPOSURE_HURT) {
        v.coldExposure = 0
        v.health -= 1
        onCognitiveEvent(v, 'dark_fear', 0.4 + coldEff * 0.4)
        if (v.health <= 0) {
          v.alive = false
          state.deaths += 1
          logEvent(state, `${v.name} meurt de froid`)
          onDeath(state, v, null)
          return
        }
        if ((state.tick + v.id) % 11 === 0) logEvent(state, `${v.name} souffre d’hypothermie`)
      }
    } else {
      v.coldExposure = Math.max(0, v.coldExposure - (sheltered || byFire ? 0.55 : 0.25))
    }

    if (heatEff > 0.28) {
      v.heatExposure += heatEff
      if (v.heatExposure >= EXPOSURE_HURT) {
        v.heatExposure = 0
        v.health -= 1
        // Heat also burns through water reserves.
        v.thirst = Math.max(0, thirstNow - 0.35)
        onCognitiveEvent(v, 'famine', 0.25 + heatEff * 0.3)
        if (v.health <= 0) {
          v.alive = false
          state.deaths += 1
          logEvent(state, `${v.name} succombe à la chaleur`)
          onDeath(state, v, null)
          return
        }
        if ((state.tick + v.id) % 11 === 0) logEvent(state, `${v.name} a un coup de chaleur`)
      }
    } else {
      v.heatExposure = Math.max(0, v.heatExposure - (sheltered ? 0.5 : 0.22))
    }

    // Obscurité nocturne dehors → peur soft (médiéval).
    if (isOutdoorsAtNight(v, state.tick) && !personalLight(v, state.tick) && (state.tick + v.id) % 17 === 0) {
      onCognitiveEvent(v, 'dark_fear', 0.55 + (1 - v.personality.courage) * 0.35)
    }
  }
  if (!Number.isFinite(v.hunger)) v.hunger = HUNGER_MAX * 0.5
  if (!Number.isFinite(v.thirst)) v.thirst = THIRST_MAX * 0.5
  if (!Number.isFinite(v.thirstTimer)) v.thirstTimer = 0
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

  // Survie : n'interrompre le travail que quand la faim / soif est réelle
  // (seuil 2.2 annulait craft/build en boucle dès que le sac avait de la nourriture).
  if (
    v.task &&
    v.task.kind !== 'eat' &&
    v.task.kind !== 'drink' &&
    v.task.kind !== 'flee' &&
    v.task.kind !== 'fight' &&
    v.task.kind !== 'takeFromChest'
  ) {
    const leisure =
      v.task.kind === 'entertain' ||
      v.task.kind === 'socialise' ||
      v.task.kind === 'counsel' ||
      v.task.kind === 'pray' ||
      v.task.kind === 'teachCraft' ||
      v.task.kind === 'giveFood'
    const thirstNow = Number.isFinite(v.thirst) ? v.thirst : THIRST_MAX * 0.5
    const foraging = v.task.kind === 'gatherFood' || v.task.kind === 'fish' || v.task.kind === 'harvestWheat'
    const buildingShelter =
      !v.hasHome &&
      (v.task.kind === 'buildHouse' || v.task.kind === 'clearLand' || v.task.kind === 'gatherWood')
    // Drink first — never skip hydration for forage/build.
    if (thirstNow < 2.35 || v.thirstTimer > 0) {
      const water = drinkTarget(state, v)
      if (water) {
        stashInterruptedTask(v)
        setTask(v, 'drink', water.x, water.y)
        noteChosenAction(v, 'drink', 'soif — interruption')
      } else {
        // Still abort labour so survival assign can dig a spring / rethink.
        stashInterruptedTask(v)
        v.task = null
        v.nextThinkTick = state.tick
      }
    } else if (
      !foraging &&
      !(v.task.kind === 'harvestWheat' && v.hunger >= 1.55 && v.starveTimer < 4) &&
      // Always break for real hunger — shelter exemption only when still comfortably fed.
      !(buildingShelter && v.hunger >= 1.9 && v.starveTimer === 0 && edibleValue(v.inventory) >= 2.0) &&
      (v.hunger < 2.15 || v.starveTimer > 0) &&
      bestEdible(v, state.tick)
    ) {
      const rawFish = countOf(v.inventory, 'fish')
      const rawGame = countOf(v.inventory, 'game')
      if (v.hasHome && v.hunger >= 1.15 && (rawFish > 0 || rawGame > 0)) {
        stashInterruptedTask(v)
        const out = rawFish > 0 ? 'cooked_fish' : 'cooked_game'
        setTask(v, 'craftGoods', v.homeX, v.homeY, null, out)
        noteChosenAction(v, 'craftGoods', 'faim — cuire')
      } else {
        stashInterruptedTask(v)
        const t = eatTarget(v)
        setTask(v, 'eat', t.x, t.y)
        noteChosenAction(v, 'eat', 'faim — interruption')
      }
    } else if (
      v.hunger < 1.55 &&
      v.hasChest &&
      v.chestInventory &&
      edibleValue(v.chestInventory) > 0
    ) {
      stashInterruptedTask(v)
      const store = storeSpot(v.furnitureQueue, v.homeLayout)
      setTask(v, 'takeFromChest', store?.x ?? v.chestX, store?.y ?? v.chestY)
      noteChosenAction(v, 'takeFromChest', 'faim — garde-manger')
    } else if (leisure && (v.hunger < 2.25 || thirstNow < 2.15 || state.famine)) {
      stashInterruptedTask(v)
      v.task = null
      v.nextThinkTick = state.tick
    } else if (
      // Abort idle/rest when hungry/thirsty — pantry full must NOT block waking to eat.
      (v.task.kind === 'rest' || v.task.kind === 'idle' || v.task.kind === 'gatherFuel') &&
      (v.hunger < 1.85 ||
        thirstNow < 1.85 ||
        v.starveTimer > 0 ||
        v.thirstTimer > 0 ||
        (edibleValue(v.inventory) < 2.0 && v.hunger < 2.5))
    ) {
      stashInterruptedTask(v)
      v.task = null
      v.nextThinkTick = state.tick
    } else if (
      (v.task.kind === 'buildHouse' ||
        v.task.kind === 'clearLand' ||
        v.task.kind === 'gatherWood' ||
        v.task.kind === 'gatherStone' ||
        v.task.kind === 'buildWell' ||
        v.task.kind === 'buildPlazaFire' ||
        v.task.kind === 'tendPlazaFire') &&
      (v.starveTimer > 4 ||
        v.thirstTimer > 3 ||
        thirstNow < 1.2 ||
        v.hunger < 1.15 ||
        (edibleValue(v.inventory) < 0.4 && v.hunger < 1.7))
    ) {
      stashInterruptedTask(v)
      v.task = null
      v.nextThinkTick = state.tick
    } else if (v.hunger < 0.85 || v.starveTimer > 8 || thirstNow < 0.65 || v.thirstTimer > 6) {
      stashInterruptedTask(v)
      v.task = null
      v.nextThinkTick = state.tick
    } else if (
      // Cold interrupt — don't keep chopping while hypothermic outdoors.
      coldStress01(sampleTempC(state.climate, v.x, v.y)) > 0.42 &&
      !nearWarmFireLocal(state, v) &&
      !atHomeShelter(v) &&
      v.task.kind !== 'rest' &&
      v.task.kind !== 'tendHearth' &&
      v.task.kind !== 'tendPlazaFire' &&
      v.task.kind !== 'buildPlazaFire' &&
      v.task.kind !== 'gatherFuel' &&
      v.task.kind !== 'buildHouse' &&
      v.task.kind !== 'gatherFood' &&
      v.task.kind !== 'fish' &&
      (v.hunger >= 1.2 || edibleValue(v.inventory) >= 0.8)
    ) {
      stashInterruptedTask(v)
      v.task = null
      v.nextThinkTick = state.tick
    }
  }

  // Nuit : rentrer dormir — social loops no longer exempt (sleep wins).
  // Sans toit : laisser buildHouse / clearLand / gatherWood continuer (softlock T12).
  // Ne pas forcer le repos si faim/soif/sac vide — la survie gagne.
  if (
    isNight(state.tick) &&
    v.task &&
    v.task.kind !== 'rest' &&
    v.task.kind !== 'flee' &&
    v.task.kind !== 'fight' &&
    v.task.kind !== 'eat' &&
    v.task.kind !== 'drink' &&
    v.task.kind !== 'takeFromChest' &&
    v.task.kind !== 'lightTorch' &&
    v.task.kind !== 'placeCandle' &&
    v.task.kind !== 'tendHearth' &&
    v.task.kind !== 'tendPlazaFire' &&
    v.task.kind !== 'gatherFuel' &&
    v.task.kind !== 'craftLight' &&
    !(
      !v.hasHome &&
      (v.task.kind === 'buildHouse' ||
        v.task.kind === 'clearLand' ||
        v.task.kind === 'gatherWood' ||
        v.task.kind === 'haulForBuild' ||
        v.task.kind === 'helpBuild' ||
        v.task.kind === 'buildWell' ||
        v.task.kind === 'buildPlazaFire')
    )
  ) {
    const thirstCrit = (Number.isFinite(v.thirst) ? v.thirst : THIRST_MAX * 0.5) < 1.35
    const needMeal = v.hunger < 1.85 && !!bestEdible(v, state.tick)
    const emptyCrisis = edibleValue(v.inventory) < 1.0 && v.hunger < 2.4
    const starvingNow = (v.hunger < 1.35 && !bestEdible(v, state.tick)) || thirstCrit || needMeal || emptyCrisis
    if (!starvingNow) {
      if (v.hasHome) {
        stashInterruptedTask(v)
        const t = restTarget(state, v)
        setTask(v, 'rest', t.x, t.y)
        noteChosenAction(v, 'rest', 'nuit — foyer')
      } else if (v.stamina < STAMINA_EXHAUSTED) {
        // Homeless: only collapse when spent — otherwise keep chopping/building.
        stashInterruptedTask(v)
        const t = restTarget(state, v)
        setTask(v, 'rest', t.x, t.y)
        noteChosenAction(v, 'rest', 'nuit — abri improvisé')
      }
    }
  }

  if (!v.task) {
    // Survival overrides think cooldown — otherwise 1-tick social thrash strands agents as null.
    if (tryAssignSurvivalTask(state, v)) {
      /* execute below */
    } else if (
      state.tick < v.nextThinkTick &&
      // Unfinished shell: never idle through the cooldown — keep chopping/building.
      !(
        !v.hasHome &&
        homeFootprint(v) &&
        v.buildQueue.some((b) => !b.done && b.kind === 'wall') &&
        v.stamina >= STAMINA_EXHAUSTED
      )
    ) {
      const thirstCd = Number.isFinite(v.thirst) ? v.thirst : THIRST_MAX * 0.5
      const larderCd = edibleValue(v.inventory)
      // Crisis: NEVER filler-idle — force a real chooseTask (was stranding camps as idle/none).
      const crisis =
        thirstCd < 2.0 ||
        v.thirstTimer > 0 ||
        v.hunger < 2.2 ||
        v.starveTimer > 0 ||
        larderCd < FOOD_TARGET ||
        (larderCd < FOOD_TARGET * 1.5 && v.hunger < 2.8)
      if (crisis) {
        v.nextThinkTick = state.tick
        const depth = shouldDeepThink(state, v) ? 'deep' : 'fast'
        tickCognition(state, v, rng, depth)
        chooseTask(state, v, rng)
      } else if (v.stamina < STAMINA_TIRED) {
        const t = restTarget(state, v)
        setTask(v, 'rest', t.x, t.y)
      } else {
        setTask(v, 'idle', Math.round(v.x), Math.round(v.y))
      }
    } else {
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

    const wasSurvivalBite = active.kind === 'eat' || active.kind === 'drink' || active.kind === 'takeFromChest'
    const wasLeisure =
      active.kind === 'socialise' ||
      active.kind === 'giveFood' ||
      active.kind === 'entertain' ||
      active.kind === 'counsel' ||
      active.kind === 'teachCraft'
    v.task = null
    // Only resume the shelved job if the bite actually helped — failed drink used to
    // restore buildHouse every tick while thirstTimer climbed to death.
    const biteOk =
      (active.kind === 'drink' && (Number.isFinite(v.thirst) ? v.thirst : 0) >= THIRST_MAX * 0.9) ||
      (active.kind === 'eat' && v.hunger > 0.4 && v.starveTimer === 0) ||
      (active.kind === 'takeFromChest' && !!bestEdible(v, state.tick))
    if (wasSurvivalBite && biteOk && restoreInterruptedTask(v)) {
      noteChosenAction(v, v.task!.kind, 'reprise après repas')
      v.nextThinkTick = state.tick + 1
    } else if (wasSurvivalBite && !biteOk) {
      clearSavedTask(v)
      v.nextThinkTick = state.tick
    } else if (wasLeisure) {
      v.nextThinkTick = state.tick + THINK_COOLDOWN + 5
    } else {
      const micro = active.ageTicks <= 2 && active.work <= 0
      v.nextThinkTick = state.tick + (micro ? 0 : THINK_COOLDOWN)
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
    const rate = Math.max(0, base * cropTempFactor(fieldT) * (0.75 + rain * 0.55))
    if (rate <= 0.02) continue
    // amount is Uint16 — fractional += was truncated to 0 forever (wheat never ripened).
    // Convert rate → integer ticks between +1 growth steps.
    const steps = Math.max(1, Math.round(1 / Math.max(0.08, rate)))
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
          if ((state.tick + x * 3 + y * 7) % steps !== 0) continue
          const before = grid.amount[i]
          grid.amount[i] = Math.min(WHEAT_RIPE, before + 1)
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

  // Naissances dues même en hiver / famine (conception déjà passée).
  deliverDuePregnancies(state, rng)

  if (state.famine || state.season === 'winter') return
  let alive = 0
  for (const v of state.villagers) if (v.alive) alive++
  if (alive >= maxPopulationCap()) return

  const ready = (v: Villager) =>
    v.alive &&
    v.hasHome &&
    !v.pregnancy &&
    isMarriageAge(v) &&
    v.reproCooldown <= 0 &&
    v.hunger >= REPRO_HUNGER_THRESHOLD &&
    edibleValue(v.inventory) >= REPRO_FOOD_STOCK

  const lookup = pedigreeLookup(state)

  const tryCouple = (a: Villager, b: Villager): boolean => {
    if (!ready(a) || !ready(b) || a.id === b.id) return false
    if (distance(a.x, a.y, b.x, b.y) > 2.5) return false
    // T25 : conception uniquement pour couples liés (spouseId mutuel).
    if (a.spouseId !== b.id || b.spouseId !== a.id) return false
    const rel = a.relations.get(b.id)
    if (rel && rel.affinity < -0.05) return false
    const F = kinshipCoefficient(a.id, b.id, lookup)
    if (F >= 0.2) return false
    if (
      a.parentIds.includes(b.id) ||
      b.parentIds.includes(a.id) ||
      (a.parentIds.length > 0 && b.parentIds.some((p) => a.parentIds.includes(p)))
    ) {
      return false
    }

    const fertChance = (fertilityModifier(a.phenotype) + fertilityModifier(b.phenotype)) * 0.5
    const bondBonus = 0.08
    const homeVg = a.villageId !== null ? state.villages.find((vg) => vg.id === a.villageId) : undefined
    const prosperMul = villageBirthBias(homeVg)
    if (rng() > Math.min(0.98, fertChance * prosperMul + bondBonus)) return false

    for (const parent of [a, b]) {
      if (countOf(parent.inventory, 'bread') > 0) removeFromInventory(parent.inventory, 'bread', 1)
      else removeFromInventory(parent.inventory, 'food', 2)
    }

    // Porteuse = parent A (slot motherId pedigree) — pas de sexe biologique simulé.
    const seed = Math.floor(rng() * 4294967296)
    const { genome, phenotype, motherId, fatherId } = birthGenetics(a, b, rng)
    const personality = applyGeneticPersonalityBias(
      inheritPersonality(a.personality, b.personality, rng),
      genome,
      rng,
    )
    const dueTick = state.tick + GESTATION_TICKS
    a.pregnancy = {
      partnerId: b.id,
      conceivedTick: state.tick,
      dueTick,
      childSeed: seed,
      genome,
      phenotype,
      motherId,
      fatherId,
      personality,
    }
    a.reproCooldown = GESTATION_TICKS + REPRO_COOLDOWN
    b.reproCooldown = GESTATION_TICKS + REPRO_COOLDOWN
    logEvent(state, `${fullNameOf(a)} est enceinte (naissance dans ~${Math.round(GESTATION_TICKS / TICKS_PER_DAY)} jours)`)
    return true
  }

  // Uniquement couples liés (plus de conception opportuniste célibataire).
  for (const a of state.villagers) {
    if (!ready(a) || a.spouseId === null) continue
    const spouse = bondedPartner(state, a)
    if (!spouse || spouse.id < a.id) continue
    if (tryCouple(a, spouse)) return
  }
}

function deliverDuePregnancies(state: SimState, rng: () => number) {
  let alive = 0
  for (const v of state.villagers) if (v.alive) alive++

  for (const carrier of state.villagers) {
    if (!carrier.alive || !carrier.pregnancy) continue
    if (carrier.pregnancy.dueTick > state.tick) continue
    if (alive >= maxPopulationCap()) {
      carrier.pregnancy = null
      continue
    }
    spawnChildFromPregnancy(state, carrier, carrier.pregnancy, rng)
    carrier.pregnancy = null
    carrier.reproCooldown = Math.max(carrier.reproCooldown, REPRO_COOLDOWN)
    alive++
  }
}

function spawnChildFromPregnancy(
  state: SimState,
  carrier: Villager,
  preg: Pregnancy,
  rng: () => number,
) {
  const partner =
    state.villagers.find((o) => o.id === preg.partnerId && o.alive) ??
    state.villagers.find((o) => o.id === preg.fatherId && o.id !== carrier.id) ??
    state.villagers.find((o) => o.id === preg.motherId && o.id !== carrier.id) ??
    null
  const parentB = partner ?? carrier
  const { genome, phenotype, motherId, fatherId, personality, childSeed: seed } = preg

  const homeOwner =
    carrier.homeOwnerId !== null
      ? state.villagers.find((o) => o.id === carrier.homeOwnerId && o.alive)
      : undefined
  let residents = 0
  if (homeOwner) {
    const hid = homeOwner.id
    for (const o of state.villagers) if (o.alive && o.homeOwnerId === hid) residents++
  }
  const hasRoom = homeOwner ? residents < homeOwner.bedCount : false

  const childInventory = createInventory(5)
  addToInventory(childInventory, 'coin', CHILD_STARTER_COINS)
  const child: Villager = {
    id: state.nextId++,
    seed,
    name: generateName(seed),
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
    parentIds: [motherId, fatherId],
    motherId,
    fatherId,
    genome,
    phenotype,
    x: carrier.x,
    y: carrier.y,
    health: VILLAGER_HEALTH_MAX,
    hunger: HUNGER_MAX,
    thirst: THIRST_MAX,
    stamina: STAMINA_MAX,
    starveTimer: 0,
    thirstTimer: 0,
    coldExposure: 0,
    heatExposure: 0,
    illness: null,
    healTimer: 0,
    sleepDebt: 0,
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
    torchLitUntil: 0,
    homeLightUntil: 0,
    hearthLitUntil: 0,
    villageId: carrier.villageId,
    hue: phenotype.hue,
    alive: true,
    age: 0,
    reproCooldown: REPRO_COOLDOWN,
    pregnancy: null,
    activeProjectId: null,
    knowledge: [],
  }
  relationWith(child, carrier.id).affinity = 0.8
  relationWith(carrier, child.id).affinity = 0.8
  relationWith(child, carrier.id).kinship = 0.9
  relationWith(carrier, child.id).kinship = 0.9
  if (partner && partner.id !== carrier.id) {
    relationWith(child, partner.id).affinity = 0.8
    relationWith(partner, child.id).affinity = 0.8
    relationWith(child, partner.id).kinship = 0.9
    relationWith(partner, child.id).kinship = 0.9
    partner.reproCooldown = Math.max(partner.reproCooldown, REPRO_COOLDOWN)
  }
  state.villagers.push(child)
  registerBirth(state, child, carrier, parentB, rng)
  state.births += 1
  seedCultureFromParents(mindOf(child), mindOf(carrier), mindOf(parentB), rng)
  mindOf(child).preferences = inheritLaborPreferences(
    mindOf(carrier).preferences,
    mindOf(parentB).preferences,
    personality,
    rng,
  )
  seedEthnosFromParents(state, child, carrier, parentB, mindOf(child).cultureTag, rng)
  inheritKnowledge(child, carrier, parentB, state.tick, rng)
  if (partner && carrier.spouseId === partner.id && rng() < 0.45) {
    logCause(
      state,
      `foyer de ${fullNameOf(carrier)} et ${fullNameOf(partner)}`,
      `${fullNameOf(child)} naît de l'union`,
    )
  } else {
    logEvent(
      state,
      partner
        ? `${fullNameOf(child)} est né de ${fullNameOf(carrier)} et ${fullNameOf(partner)}`
        : `${fullNameOf(child)} est né de ${fullNameOf(carrier)}`,
    )
  }
  noteMilestone(state, 'firstBirth', `Première naissance`)
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
    if (rng() < 0.55) addToInventory(owner.inventory, 'milk', 1)
    if (rng() < 0.12) addToInventory(owner.inventory, 'food', 1)
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
    // First ~2 months: packs prefer livestock. Day-1 ambushes on unarmed founders were a wipe.
    const pioneerGrace = state.tick < TICKS_PER_DAY * 55
    const huntRadius = pioneerGrace
      ? WOLF_HUNT_RADIUS * 0.55
      : state.season === 'winter'
        ? WOLF_HUNT_RADIUS * 1.65
        : state.season === 'autumn'
          ? WOLF_HUNT_RADIUS * 1.2
          : WOLF_HUNT_RADIUS
    const villagerCandidate = pioneerGrace
      ? nearestAlive(state.villagers, w.x, w.y, huntRadius * 0.65)
      : nearestAlive(state.villagers, w.x, w.y, huntRadius)
    const sheepCandidate = nearestAlive(state.sheep, w.x, w.y, huntRadius * (pioneerGrace ? 1.4 : 1), (s) => !s.captured)
    const horseCandidate = nearestAlive(state.horses, w.x, w.y, huntRadius, (h) => h.riderId === null)
    const dv = villagerCandidate ? distance(w.x, w.y, villagerCandidate.x, villagerCandidate.y) : Infinity
    const ds = sheepCandidate ? distance(w.x, w.y, sheepCandidate.x, sheepCandidate.y) : Infinity
    const dh = horseCandidate ? distance(w.x, w.y, horseCandidate.x, horseCandidate.y) : Infinity
    const sheepBias = pioneerGrace ? 3.2 : 1.5
    if (ds <= dv * sheepBias && ds <= dh && sheepCandidate) {
      targetSheep = sheepCandidate
      w.targetId = sheepCandidate.id
      w.targetKind = 'sheep'
    } else if (dh <= dv * 1.2 && horseCandidate) {
      targetHorse = horseCandidate
      w.targetId = horseCandidate.id
      w.targetKind = 'horse'
    } else if (villagerCandidate && (!pioneerGrace || rng() < 0.04)) {
      targetVillager = villagerCandidate
      w.targetId = villagerCandidate.id
      w.targetKind = 'villager'
    } else if (sheepCandidate) {
      targetSheep = sheepCandidate
      w.targetId = sheepCandidate.id
      w.targetKind = 'sheep'
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
    const homeSheltered =
      targetVillager.hasHome &&
      distance(targetVillager.x, targetVillager.y, targetVillager.homeX, targetVillager.homeY) <= SHELTER_RADIUS
    if (homeSheltered) return
    const village =
      targetVillager.villageId !== null
        ? state.villages.find((vg) => vg.id === targetVillager!.villageId)
        : undefined
    const insideWall =
      village !== undefined &&
      village.wallTier !== 'none' &&
      village.perimeter.length > 0 &&
      distance(targetVillager.x, targetVillager.y, village.centerX, village.centerY) <= 45
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
    // Tool = damage reduction / block chance — never absolute immunity.
    const gear = equipmentEffectsOf(targetVillager)
    const toolResist =
      targetVillager.toolTier === 'iron'
        ? 0.72
        : targetVillager.toolTier === 'stone'
          ? 0.55
          : targetVillager.toolTier === 'wood'
            ? 0.35
            : 0
    const courageResist = Math.max(0, (targetVillager.personality.courage - 0.45) * 0.12)
    const guardResist = targetVillager.profession === 'guard' ? 0.08 : 0
    const blockChance = Math.min(0.88, toolResist + gear.protect * 0.4 + courageResist + guardResist)
    if (blockChance > 0 && rng() < blockChance) {
      remember(targetVillager, {
        kind: 'dangerSpot',
        subjectId: null,
        x: w.x,
        y: w.y,
        tick: state.tick,
        weight: 0.7,
        emotion: -0.45,
      })
      return
    }
    targetVillager.health -= 1
    remember(targetVillager, {
      kind: 'dangerSpot',
      subjectId: null,
      x: w.x,
      y: w.y,
      tick: state.tick,
      weight: 1.2,
      emotion: -0.8,
    })
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
    // Bush spread is very rare — plains stay open grass.
    if (i % 11 === 0) {
      const bushSource = findRandomTile(grid, rng, BUSH)
      if (bushSource) {
        const tC = sampleTempC(state.climate, bushSource.x, bushSource.y)
        if (tC < 0) continue
        const moist = sampleMoisture(state.climate, bushSource.x, bushSource.y) + sampleRain(state.climate, bushSource.x, bushSource.y) * 0.35
        const suit = biomeSuitability(tC, moist)
        if (suit.bush < 0.7) continue
        if (resourceDensity(grid, bushSource.x, bushSource.y, 'bush', 3) >= SPREAD_NEIGHBOURS_NEEDED + 1) {
          tryGrowAdjacent(grid, bushSource.x, bushSource.y, BUSH, 8, rng)
        }
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
