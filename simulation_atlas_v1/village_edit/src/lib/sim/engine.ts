import { tickBandits } from './bandits'
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
import { tickSettlementStages, settlementStageCounts } from './settlements'
import { tickFirms, firmsSummary } from './economy/business'
import {
  countKnownDeposits,
  countMigrating,
  countMines,
  countTradeRoutes,
  packCausalReadouts,
  packCrisisCounts,
  packFirmRows,
  packSettlementRows,
} from './panelTruth'
import { packPriceHistoryRows } from './priceHistory'
import {
  packAgriRows,
  packEmergenceProofs,
  packFaithSchismRows,
  packGuildEmergenceRows,
  packKinDynastyRows,
  packLaborRows,
  packLifeCausal,
  packMarriageAllianceRows,
  packMerchantRows,
  packMilitaryDynastyRows,
  packMigrantRows,
  packSuccessionRows,
  packWarDiplomacyRows,
  packWoolRows,
} from './panelLifePacks'
import {
  creditSummary,
  packCreditBanditCausal,
  packCreditBookRows,
  packParallelGangRows,
  parallelBanditSummary,
} from './panelCreditBandit'
import { crystallizeVillageMines, rememberMineMouth } from './mining'
import { warsSummary } from './war'
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
import type { ResourceType } from './inventory'
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
import { bindDecisionLedger, emptyDecisionExactCounters } from './decisionLedger'
import { emptyCausalityCounters } from './causalityMetrics'
import { emptyMigrationCounters } from './migrationMetrics'
import { bindBehaviorSeqMetrics, emptyBehaviorSeqCounters } from './behaviorSequenceMetrics'
import { bindAttributionMetrics, emptyAttributionCounters } from './attributionMetrics'
import { createWorldGrid, makeRng, randomWalkableTile, randomWalkableTileNear, resourceDensity } from './world'
import { FOUNDER_AGE_MIN, FOUNDER_AGE_SPAN } from './ages'
import { ensureEconomyDeposits } from './economy/deposits'
import { generateName, generatePersonality } from './personality'
import { compactIndex } from './resourceIndex'
import { resetPathBudget } from './pathfinding'
import { agentHash } from './kernels'
import { tickRoadWear } from './roads'
import { pickAmbition, setRememberBridge, setEpisodicPeekBridge } from './social'
import { mindOf, onRemember, resetCognitionCaches, peekMind } from './cognition'
import { feelFamine } from './ecology'
import {
  getSimPerfBudget,
  noteSimTps,
  resetSimPerfBudgetForStress,
  setAliveAgentCount,
  setCrisisDeepPressure,
  villagerLodStride,
  villagerLightSamplePeriod,
} from './perfBudget'
import { seedPioneerCamps, tickBuildProjects } from './construction'
import { tickWorkOrders } from './build/workOrders'
import { bindEmergenceState } from './build/emergenceMetrics'
import { tickAtlasLifeSystems } from './emergence/atlasLifeSystems'
import { tickTechnology } from './technology'
import {
  resetEthnosCaches,
  seedFounderEthnos,
  tickEthnosWorld,
} from './ethnos'
import { resetPoliticsCaches, tickPolitics, politicsSummary } from './politics'
import { tickSocietyCycle } from './societyCycle'

const GROUP_SPREAD = 14
const HORSE_HERDS = 3
/** A small starting purse so the coin economy (buying materials, minting, trade) isn't stuck at zero forever waiting for the first lucky gold find. */
const STARTER_COINS = 4
/**
 * Rations de fondation â€” un stack plein (STACK_SIZE).
 * Couvre la 1Ê³áµ‰ semaine pendant que la cueillette / les champs sâ€™installent ;
 * pas un buff permanent (la faim BMR reste rÃ©elle).
 */
const STARTER_FOOD = STACK_SIZE
/** Bois de dÃ©part â€” lance + premiers murs / Ã©tabli sans bloquer sur la cueillette seule. */
const STARTER_WOOD = STACK_SIZE
/** Grain de semence â€” meunerie / rÃ©serve ; les champs pioneer sont prÃ©-semÃ©s Ã  part. */
const STARTER_WHEAT = 3
/** Ã‚ges fondateurs â€” source unique `ages.ts` (boucle famille / politique / apparence). */

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
 * dooming that group before it starts â€” so instead of one random tile, sample a wide batch and
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

/** Keep founding members on hospitable tiles near the cluster center (avoid taÃ¯ga/alpin bleed). */
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
  setEpisodicPeekBridge((id) => peekMind(id)?.episodic ?? null)
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
    const airCold = coldStress01(air)
    const biomeCold = biomeColdBias(sampleBiome(climate, v.x, v.y))
    // Match outdoorCold01 gating â€” warm temperate air must not inflate starter clo need.
    const cold01 = Math.min(1, airCold + (airCold < 0.15 ? 0 : biomeCold * 0.4))
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
    bandits: [],
    bands: [],
    villages: [],
    nextId,
    nextVillageId: 1,
    nextBandId: 1,
    births: 0,
    deaths: 0,
    deathsByWolf: 0,
    deathsByBandit: 0,
    deserters: 0,
    bridges: 0,
    thefts: 0,
    brawls: 0,
    helpCounters: { food: 0, teach: 0, defend: 0, build: 0, haul: 0, labor: 0 },
    societyCounters: {
      circlesFormed: 0,
      circlesDissolved: 0,
      circlePeakAgeTicks: 0,
      institutionsFormed: 0,
      institutionsDissolved: 0,
      institutionPeakAgeTicks: 0,
      institutionsLived30d: 0,
      circleJoins: 0,
      circleDrops: 0,
      creedChanges: 0,
      creedBehaviorFollowups: 0,
      conflictsTotal: 0,
      conflictsByCause: {
        raid: 0,
        confront: 0,
        theft_feud: 0,
        succession: 0,
        rivalry: 0,
        territory_absorb: 0,
        schism: 0,
        exclusion: 0,
        war: 0,
        war_battle: 0,
        war_end: 0,
        coup: 0,
      },
      banditUnlockCalendar: 0,
      banditUnlockPressure: 0,
    },
    migrationCounters: emptyMigrationCounters(),
    behaviorSeqCounters: emptyBehaviorSeqCounters(),
    decisionExact: emptyDecisionExactCounters(),
    causalityCounters: emptyCausalityCounters(),
    attributionCounters: emptyAttributionCounters(),
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
      firstMarket: false,
      firstBoatVoyage: false,
      firstBirth: false,
      firstMarriage: false,
      firstAdoption: false,
      firstFamine: false,
      firstRegionalHub: false,
      firstStorm: false,
      firstMasterwork: false,
      firstCreed: false,
      firstShrine: false,
      firstRitual: false,
      firstChapel: false,
      firstTemple: false,
      firstBandits: false,
      firstKeep: false,
      firstRealm: false,
    },
    circles: [],
    nextCircleId: 1,
    rumors: [],
    nextRumorId: 1,
    polities: [],
    nextPolityId: 1,
    wars: [],
    nextWarId: 1,
    coups: [],
    firmHireCount: 0,
    firmFailCount: 0,
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
  ensureEconomyDeposits(state)
  bindDecisionLedger(state)
  bindAttributionMetrics(state)
  bindBehaviorSeqMetrics(state)
  stepRngByState.set(state, makeRng(((cfg.seed * 10007 + 42) >>> 0) || 42))
  // Pre-arm Max LOD when the world is sized for stress (â‰¥300 cap) â€” stay in TPS_LOW path.
  if ((cfg.maxPopulation ?? 0) >= 300) resetSimPerfBudgetForStress(55, cfg.maxPopulation ?? 500)
  return state
}

/** Per-simulation step RNG â€” module-global makeRng(42) poisoned multi-seed + leaked across runs. */
const stepRngByState = new WeakMap<SimState, () => number>()
function stepRngFor(state: SimState): () => number {
  let r = stepRngByState.get(state)
  if (!r) {
    // Recover from WeakMap miss without collapsing all worlds onto seed 42.
    const salvage = (((state.tick + 1) * 10007 + state.villagers.length * 97) >>> 0) || 7
    r = makeRng(salvage)
    stepRngByState.set(state, r)
  }
  return r
}

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
  bindEmergenceState(state)
  bindDecisionLedger(state)
  bindAttributionMetrics(state)
  bindBehaviorSeqMetrics(state)
  state.tick += 1
  let aliveAgents = 0
  for (let i = 0; i < state.villagers.length; i++) {
    if (state.villagers[i].alive) aliveAgents++
  }
  resetPathBudget(aliveAgents)
  setAliveAgentCount(aliveAgents)

  state.season = seasonFromTick(state.tick)
  state.year = yearFromTick(state.tick)

  const rng = stepRngFor(state)
  const perf = getSimPerfBudget()
  // Under load: cadence slow systems without deleting causal writers (NONO Â§Â§76â€“77).
  // HARD: keep Max@500 culls until â‰¥95 TPS â€” releasing at 60 caused restore thrash (60â†”75).
  const maxLoad = aliveAgents >= 300
  const slowCadence = maxLoad || perf.headroom < 0.48 || (perf.lastTps > 0 && perf.lastTps < 92)
  const verySlow = maxLoad || perf.headroom < 0.32 || (perf.lastTps > 0 && perf.lastTps < 60)
  const doSlow = !slowCadence || state.tick % (verySlow ? 3 : 2) === 0
  // Spatial hash: under Max load, rebuild every 2–3 ticks (queries stay approximate).
  const hashEvery = maxLoad ? 3 : verySlow ? 2 : 1
  if (state.tick % hashEvery === 0) agentHash.rebuild(state)

  tickClimate(state, rng)

  if (state.tick % 40 === 0) {
    tickFamine(state)
    setCrisisDeepPressure(!!state.famine || state.villages.some((vg) => feelFamine(state, vg)))
  } else if (state.famine) {
    setCrisisDeepPressure(true)
  }
  const commerceEvery = Math.max(120, Math.round(220 * perf.commercePeriodMul))
  if (state.tick % commerceEvery === 0) {
    tickVillageEconomy(state)
    tickUrbanNetwork(state)
    tickMarketPrices(state)
    tickSettlementStages(state)
  }
  // Firms pulse more often than full market clearing â€” craft/consume/sell loops.
  const firmEvery = Math.max(64, Math.round(110 * perf.commercePeriodMul))
  if (state.tick % firmEvery === 0) tickFirms(state)
  // Spec A Â§17: register mine mouths once TUNNEL exists near claim/centre.
  if (state.tick % 24 === 0) crystallizeVillageMines(state)

  // High-pop LOD: rotate full cognition/threat; absolute full-thinker budget for Max@500.
  const vStride = villagerLodStride(aliveAgents)
  const lightPeriod = villagerLightSamplePeriod(aliveAgents)
  const tps = perf.lastTps
  // Keep full thinkers scarce until we sustain â‰¥90 TPS (hysteresis vs thrash).
  let fullBudget =
    aliveAgents < 180
      ? aliveAgents
      : tps > 0 && tps < 100
        ? 1
        : 3
  // HARD: hungry founders used to bypass LOD as "urgent" → 100+ full ticks → TPS cliff.
  // Crisis floor: starving agents keep metabolism even when light-budget exhausted.
  let urgentBudget = aliveAgents < 180 ? aliveAgents : tps > 0 && tps < 100 ? 2 : 6
  let combatBudget = aliveAgents < 180 ? aliveAgents : tps > 0 && tps < 100 ? 1 : 3
  let crisisSkipBudget = aliveAgents < 180 ? aliveAgents : tps > 0 && tps < 100 ? 4 : 12
  const crisisLightPeriod = Math.max(12, (lightPeriod / 4) | 0)
  for (let vi = 0; vi < state.villagers.length; vi++) {
    const v = state.villagers[vi]
    if (!v.alive) continue
    const combat =
      !!v.task && (v.task.kind === "flee" || v.task.kind === "fight" || v.task.kind === "defend")
    const urgentHunger = v.hunger < 0.45 || v.starveTimer > 3
    const urgent = urgentHunger || combat
    let light = !urgent && vStride > 1 && (state.tick + v.id) % vStride !== 0
    if (combat) {
      if (combatBudget <= 0) light = true
      else combatBudget--
    } else if (urgentHunger) {
      if (urgentBudget <= 0) light = true
      else urgentBudget--
    } else if (!light) {
      if (fullBudget <= 0) light = true
      else fullBudget--
    }
    // Ultra-light sample. Combat always. Crisis hunger: small exempt pool, else thinner period.
    let skipExempt = combat
    if (!skipExempt && urgentHunger && crisisSkipBudget > 0) {
      crisisSkipBudget--
      skipExempt = true
    }
    const sampleP = skipExempt ? 1 : urgentHunger ? crisisLightPeriod : lightPeriod
    if (light && sampleP > 1 && (state.tick + v.id) % sampleP !== 0) continue
    tickVillager(state, v, rng, light)
  }
  if (!slowCadence || state.tick % (maxLoad ? 4 : 2) === 0) tickTrade(state)
  // Marriage/repro: keep causal but rare under Max@500.
  if (doSlow && !(maxLoad && state.tick % 4 !== 0)) {
    tickMarriage(state, rng)
    tickReproduction(state, rng)
    tickAdoption(state, rng)
  }
  if (!verySlow || state.tick % 3 === 0) tickFields(state)
  const animalStride = slowCadence
    ? verySlow
      ? aliveAgents >= 300
        ? 12
        : 6
      : aliveAgents >= 300
        ? 8
        : 4
    : perf.lastTps > 0 && perf.lastTps < 100
      ? aliveAgents >= 300
        ? 6
        : 3
      : 1
  // Cap animal work â€” vast maps spawn dozens of sheep that thrash findNearby.
  const sheepCap = maxLoad ? 3 : 999
  let sheepBudget = sheepCap
  for (let si = 0; si < state.sheep.length; si++) {
    const s = state.sheep[si]
    if (!s.alive) continue
    if (((state.tick + s.id) % (animalStride + 1)) !== 0) continue
    if (sheepBudget <= 0) continue
    sheepBudget--
    tickSheep(state, s, rng)
  }
  if (state.tick % (slowCadence ? (verySlow ? 6 : 4) : 3) === 0) {
    let horseBudget = maxLoad ? 2 : 999
    for (let hi = 0; hi < state.horses.length; hi++) {
      const h = state.horses[hi]
      if (!h.alive) continue
      if (horseBudget <= 0) break
      horseBudget--
      tickHorse(state, h, rng)
    }
  }
  if (!maxLoad || state.tick % 3 === 0) tickBoats(state)
  for (let wi = 0; wi < state.wolves.length; wi++) {
    const w = state.wolves[wi]
    if (w.alive && ((state.tick + w.id) % (animalStride + 1)) === 0) tickWolf(state, w, rng)
  }
  if (!verySlow || state.tick % 2 === 0) tickCombat(state, rng)
  if (!slowCadence || state.tick % 2 === 0) tickBandits(state, rng)
  if (state.tick % 3 === 0) {
    tickWolfReproduction(state)
    tickHorseBreeding(state)
  }
  if (!slowCadence || state.tick % 3 === 0) tickRegrowth(state, rng)
  const roadEvery = maxLoad ? 12 : slowCadence ? 6 : 4
  if (state.tick % roadEvery === 0) tickRoadWear(state.grid, state.tick)
  if (state.tick % 120 === 0) checkRoadMilestones(state)
  if (!maxLoad || state.tick % 8 === 0) {
    if (state.tick % 4 === 0) state.compactCursor = compactIndex(state.grid.index, state.grid, state.compactCursor)
  }

  // Politics: under Max load at high pop, cadence soft work harder (wars/coups still on CIRCLE/POLITY ticks).
  const politicsEvery = maxLoad ? 10 : verySlow ? (aliveAgents >= 300 ? 4 : 3) : slowCadence && aliveAgents >= 300 ? 3 : 1
  if (state.tick % politicsEvery === 0) tickPolitics(state)
  if (!slowCadence || state.tick % (maxLoad ? 6 : 4) === 0) {
    tickSocietyCycle(state)
  }
  // Atlas packs — under Max@500 defer heavily (bridges stay causal on cadence).
  const atlasEvery = maxLoad ? 16 : slowCadence ? 3 : 1
  if (state.tick % atlasEvery === 0) tickAtlasLifeSystems(state)
  if (!verySlow || state.tick % 2 === 0) {
    tickBuildProjects(state)
    tickWorkOrders(state)
  }
  if (doSlow) {
    tickTechnology(state, rng)
    tickLineages(state, rng)
    tickAncestorMemory(state)
    tickEthnosWorld(state, rng, (v) => {
      const mind = mindOf(v)
      return { cultureTag: mind.cultureTag, rivalId: mind.rivalId }
    })
  }
  if (state.tick % 200 === 0) {
    state.villagers = state.villagers.filter((v) => v.alive)
    state.sheep = state.sheep.filter((s) => s.alive)
    state.horses = state.horses.filter((h) => h.alive)
    state.wolves = state.wolves.filter((w) => w.alive)
    state.boats = state.boats.filter((b) => b.alive)
    state.bandits = state.bandits.filter((b) => b.alive)
    for (const band of state.bands) {
      band.memberIds = band.memberIds.filter((id) => state.bandits.some((b) => b.id === id && b.alive))
    }
    state.bands = state.bands.filter((b) => b.memberIds.length > 0)
    const aliveIds = new Set<number>()
    for (let i = 0; i < state.villagers.length; i++) aliveIds.add(state.villagers[i].id)
    for (const village of state.villages) {
      village.memberIds = village.memberIds.filter((id) => aliveIds.has(id))
    }
    // Sticky mines (Â§17): remember mouths before empty villages are swept.
    for (const vg of state.villages) {
      if (vg.memberIds.length > 0) continue
      if (vg.hasMine && vg.mineX >= 0 && vg.mineY >= 0) {
        rememberMineMouth(state, vg.mineX, vg.mineY)
      }
    }
    state.villages = state.villages.filter((vg) => vg.memberIds.length > 0)
    crystallizeVillageMines(state)
    for (const c of state.circles) {
      c.memberIds = c.memberIds.filter((id) => aliveIds.has(id))
    }
    state.circles = state.circles.filter((c) => c.memberIds.length >= 2)
    // Sweep residual ghost refs (desertion / race with compact) â€” spouse, home, grudge, mounts.
    for (const v of state.villagers) {
      if (v.spouseId != null && !aliveIds.has(v.spouseId)) {
        v.spouseId = null
        v.marriageKind = null
      }
      if (v.homeOwnerId != null && v.homeOwnerId !== v.id && !aliveIds.has(v.homeOwnerId)) {
        v.homeOwnerId = v.hasHome && v.homeX >= 0 ? v.id : null
      }
      if (v.grudgeTarget != null && !aliveIds.has(v.grudgeTarget)) {
        v.grudgeTarget = null
        if (v.ambition === 'revenge') v.ambition = 'survive'
      }
      if (v.horseId != null && !state.horses.some((h) => h.id === v.horseId && h.alive)) {
        v.horseId = null
        v.mounted = false
      }
      if (v.boatId != null && !state.boats.some((b) => b.id === v.boatId && b.alive)) {
        v.boatId = null
        v.embarked = false
      }
      if (v.task?.targetId != null && v.task.targetId >= 0) {
        const kind = v.task.kind
        if (
          (kind === 'socialise' ||
            kind === 'giveFood' ||
            kind === 'confront' ||
            kind === 'defend' ||
            kind === 'steal') &&
          !aliveIds.has(v.task.targetId)
        ) {
          v.task = null
        }
      }
    }
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
  let markets = 0
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
  let bandits = 0
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
  for (const b of state.bandits) if (b.alive) bandits++
  for (const h of state.horses) {
    if (!h.alive) continue
    if (h.tamed) horsesTamed++
    else horsesWild++
  }
  for (const b of state.boats) if (b.alive) boats++
  for (const vg of state.villages) {
    if (vg.hasMill) mills++
    if (vg.hasPort) ports++
    if (vg.hasMarket) markets++
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

  // Aggregate village technique libraries for Royaume.
  const techIds = new Set<string>()
  const techBits: { id: string; labelFr: string; confidence: number }[] = []
  for (const vg of state.villages) {
    for (const bit of vg.knowledge ?? []) {
      if (techIds.has(bit.id)) continue
      techIds.add(bit.id)
      techBits.push({ id: bit.id, labelFr: bit.labelFr, confidence: bit.confidence })
    }
  }
  techBits.sort((a, b) => b.confidence - a.confidence)
  const techLabels = techBits.slice(0, 8).map((b) => b.labelFr)

  const marketWatch: ResourceType[] = [
    'wood',
    'wheat',
    'iron',
    'wool',
    'flour',
    'stone',
    'cloth',
    'bread',
  ]
  const marketStocks: Partial<Record<ResourceType, number>> = {}
  for (const res of marketWatch) {
    let sum = 0
    for (const vg of state.villages) sum += vg.surplus[res] ?? 0
    if (sum !== 0) marketStocks[res] = Math.round(sum * 10) / 10
  }

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
    markets,
    tradeRunsTotal,
    wolves,
    bandits,
    bands: state.bands.length,
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
    deathsByBandit: state.deathsByBandit ?? 0,
    deserters: state.deserters ?? 0,
    thefts: state.thefts,
    brawls: state.brawls,
    friendships: Math.round(friendships / 2),
    feuds: Math.round(feuds / 2),
    professions,
    shapes,
    prices: state.prices,
    marketStocks,
    circles: pol.circles,
    institutions: pol.institutions,
    guilds: pol.guilds,
    councils: pol.councils,
    laws: pol.laws,
    rumors: pol.rumors,
    leadingCircle: pol.leadingName,
    leadingLegitimacy: pol.leadingLegitimacy,
    polities: pol.polities,
    chiefdoms: pol.chiefdoms,
    kingdoms: pol.kingdoms,
    camps: pol.camps,
    castles: pol.castles,
    polityRows: pol.polityRows,
    techKnown: techIds.size,
    techLabels,
    activeWars: warsSummary(state).active,
    openWars: warsSummary(state).open,
    warBattles: warsSummary(state).battles,
    coups: warsSummary(state).coups,
    warRows: warsSummary(state).rows,
    settlementStages: settlementStageCounts(state),
    firms: firmsSummary(state).firms,
    firmHires: firmsSummary(state).hires,
    firmFailures: firmsSummary(state).failures,
    tradeRoutes: countTradeRoutes(state),
    mines: countMines(state),
    depositsKnown: countKnownDeposits(state),
    migrating: countMigrating(state),
    crisisCounts: packCrisisCounts(state),
    firmRows: packFirmRows(state),
    settlementRows: packSettlementRows(state),
    causalReadouts: (() => {
      const life = packLifeCausal(state)
      const priority = life.filter(
        (r) =>
          r.chain.includes('Mariage') ||
          r.chain.includes('Menace') ||
          r.chain.includes('Guerre ->') ||
          r.chain.includes('Mine ->') ||
          r.chain.includes('Conviction') ||
          r.chain.includes('Routes ->') ||
          r.chain.includes('paix') ||
          r.chain.includes('famine'),
      )
      const restLife = life.filter((r) => !priority.includes(r))
      return [...priority, ...packCausalReadouts(state), ...packCreditBanditCausal(state), ...restLife].slice(
        0,
        18,
      )
    })(),
    priceHistoryRows: packPriceHistoryRows(state),
    laborRows: packLaborRows(state),
    migrantRows: packMigrantRows(state),
    woolRows: packWoolRows(state),
    kinDynastyRows: packKinDynastyRows(state),
    faithSchismRows: packFaithSchismRows(state),
    successionRows: packSuccessionRows(state),
    guildEmergenceRows: packGuildEmergenceRows(state),
    merchantRows: packMerchantRows(state),
    agriRows: packAgriRows(state),
    militaryDynastyRows: packMilitaryDynastyRows(state),
    marriageAllianceRows: packMarriageAllianceRows(state),
    warDiplomacyRows: packWarDiplomacyRows(state),
    emergenceProofs: packEmergenceProofs(state),
    ...(() => {
      const c = creditSummary(state)
      const p = parallelBanditSummary(state)
      return {
        creditBooks: c.books,
        creditTrustAvg: c.trustAvg,
        creditCrises: c.crises,
        creditInstitutions: c.institutions,
        informalLends: c.informalLends,
        creditWired: c.wired,
        creditRows: packCreditBookRows(state),
        parallelGangs: p.gangs,
        parallelBounties: p.bounties,
        parallelNegotiating: p.negotiating,
        parallelWired: p.wired,
        parallelGangRows: packParallelGangRows(state),
      }
    })(),
  }
}
