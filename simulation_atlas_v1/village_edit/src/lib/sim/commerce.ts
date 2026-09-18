import { mindOf } from './cognition'
import { notePriceDelta } from './causalityMetrics'
import { pushPriceHistory } from './priceHistory'
import { cultureSimilarity, ensureCultureState, homophilyBias } from './ethnos'
import { feelFamine, villageCarryingPressure, villageInFamine } from './ecology'
import { addToInventory, countOf, edibleValue, ITEM_MASS, removeFromInventory } from './inventory'
import { boatCargoCapacityKg, CART_CARGO_KG, HORSE_PACK_KG } from './physicsScale'
import { politicalPriceBias, refuseTradeWith, tradeRelationModifier, logCause } from './politics'
import { isWornRoad, stampPlaza } from './roads'
import {
  BASE_PRICES,
  RESOURCE_LABELS_LOG,
  TARGET_PER_CAPITA as TARGET_STOCK,
  TRADEABLE_RESOURCES,
} from './resources'
import { logEvent } from './social'
import { diffuseVillageKnowledge } from './technology'
import { PATH, ROAD, type SimState, type Village, type Villager } from './types'
import type { ResourceType, Slot } from './inventory'
import { distance, findMillSite, findNearbyShore, getTerrain, inBounds, makeRng, resourceDensity } from './world'

export const TRADE_COOLDOWN = 420
export const MAX_TRADE_DIST = 520
/** Ports unlock after a few real trade runs — coastal access alone is not enough. */
export const PORT_TRADE_THRESHOLD = 2
/** Markets stamp after completed caravans — regional development, not task noise. */
export const MARKET_TRADE_THRESHOLD = 1
export const MARKET_ROAD_THRESHOLD = 8

/**
 * Every resource a village can hold a surplus of, be priced on the open market, and actually
 * trade away to another village. One shared list drives all three so a resource can never end up
 * priced-but-not-tradeable (or vice versa) again — the gap that let wool, cloth, iron, hide,
 * leather, clothing, wheat, flour and gold show a market price while having no real way to move
 * between villages.
 */
export const TRACKED_RESOURCES: ResourceType[] = [...TRADEABLE_RESOURCES]

const BASE_PRICE: Partial<Record<ResourceType, number>> = { ...BASE_PRICES }

/**
 * How much of each resource the population "wants" to hold per capita before it feels spare.
 * Serves three roles: the denominator for market scarcity pricing, the per-village baseline a
 * trade surplus is measured against, and the safety reserve conductTrade refuses to sell below.
 */
const TARGET_PER_CAPITA: Partial<Record<ResourceType, number>> = { ...TARGET_STOCK }

/** Soft arbitrage between villages already linked by a trade route. */
const LINKED_SURPLUS_COUPLE = 0.07

/** A trade only fires once the per-capita surplus clears this fraction of what's "wanted". */
const MIN_TRADE_GAIN_FRACTION = 0.1

function clampNum(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v))
}

function targetOf(res: ResourceType): number {
  return TARGET_PER_CAPITA[res] ?? 1
}

/** The going rate for a resource, in coins — prefers live market clearing when state is passed. */
export function priceOf(res: ResourceType, state?: SimState | null): number {
  if (state && state.prices[res] !== undefined && state.prices[res]! > 0) return state.prices[res]!
  return BASE_PRICE[res] ?? 3
}

/** The per-capita reserve a villager or village keeps before selling — exported so buyMaterial in behaviors.ts won't buy a seller down to nothing. */
export function targetPerCapita(res: ResourceType): number {
  return targetOf(res)
}

// ── Vic3-lite: consumer needs / standard of living ────────────────────────────

export type SolBand = 'crash' | 'poor' | 'fair' | 'good' | 'boom'

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v))
}

/** Soft pop needs basket — food, clothes, shelter, fuel (wood). */
export function villagerSoL(state: SimState, v: Villager): number {
  const foodStock = edibleValue(v.inventory) + (v.chestInventory ? edibleValue(v.chestInventory) * 0.35 : 0)
  // In this sim, higher hunger value = better fed.
  const satiation = clamp01(v.hunger / 6)
  const stock = clamp01(foodStock / 5)
  const foodNeed = clamp01(satiation * 0.55 + stock * 0.45)
  const clothes =
    countOf(v.inventory, 'clothing') * 1.2 +
    countOf(v.inventory, 'cloth') * 0.55 +
    countOf(v.inventory, 'wool') * 0.25 +
    countOf(v.inventory, 'leather') * 0.45 +
    countOf(v.inventory, 'hide') * 0.2 +
    (v.chestInventory
      ? countOf(v.chestInventory, 'clothing') * 0.8 +
        countOf(v.chestInventory, 'cloth') * 0.35 +
        countOf(v.chestInventory, 'wool') * 0.15
      : 0)
  const clothesNeed = clamp01(clothes * 0.55)
  const shelter = v.hasHome ? (v.bedCount > 0 ? 1 : 0.75) : v.embarked ? 0.35 : 0.05
  const wood =
    countOf(v.inventory, 'wood') + (v.chestInventory ? countOf(v.chestInventory, 'wood') * 0.5 : 0)
  const winter = state.season === 'winter' ? 1.35 : state.season === 'autumn' ? 1.1 : 0.85
  const fuel = clamp01((wood / (4 * winter)) * (v.hasHome ? 1 : 0.5))
  // Vic3-ish weighted SoL (essentials dominate).
  return clamp01(foodNeed * 0.38 + clothesNeed * 0.18 + shelter * 0.28 + fuel * 0.16)
}

function solBandOf(sol: number): SolBand {
  if (sol < 0.18) return 'crash'
  if (sol < 0.35) return 'poor'
  if (sol < 0.55) return 'fair'
  if (sol < 0.72) return 'good'
  return 'boom'
}

/**
 * Labor demand vs workforce (Vic3 employment soft).
 * Positive laborBalance = shortage (pulls migrants); negative = unemployment pressure.
 */
export function computeLaborBalance(state: SimState, village: Village): number {
  const members: Villager[] = []
  for (const v of state.villagers) {
    if (v.alive && v.villageId === village.id) members.push(v)
  }
  if (members.length === 0) return 0
  let workforce = 0
  let employed = 0
  let idlePressure = 0
  for (const v of members) {
    // Children soft-excluded from labor (age already used elsewhere).
    if (v.age < 220) continue
    workforce++
    const productive =
      v.profession !== 'none' ||
      (() => {
        try {
          const live = mindOf(v).livelihood
          return live && (live.patronage > 0.2 || live.recognition > 0.25 || live.titleFr !== 'sans métier clair')
        } catch {
          return false
        }
      })()
    const hasWork =
      productive &&
      (v.hasField ||
        v.hasWorkbench ||
        v.hasPen ||
        v.profession === 'guard' ||
        v.profession === 'trader' ||
        v.profession === 'fisher' ||
        v.profession === 'miller' ||
        v.profession === 'miner' ||
        v.task !== null ||
        (() => {
          try {
            const t = mindOf(v).livelihood?.roleTag
            return !!t && (t.includes('troubadour') || t.includes('gourou') || t.includes('precepteur') || t.includes('conteur') || t.includes('guerisseur') || t.includes('guide'))
          } catch {
            return false
          }
        })())
    if (hasWork) employed++
    else if (v.profession === 'none' || v.task?.kind === 'idle' || v.task === null) idlePressure++
  }
  // Demand rises with development, infra, and capital goods needing hands.
  const fields = members.filter((m) => m.hasField).length
  const pens = members.filter((m) => m.hasPen).length
  const demand =
    1.5 +
    village.development * 0.55 +
    (village.hasMill ? 1.2 : 0) +
    (village.hasPort ? 1.4 : 0) +
    (village.hasMarket ? 1.1 : 0) +
    (village.hasMine ? 1.6 : 0) +
    (village.wallTier !== 'none' ? 0.8 : 0) +
    fields * 0.35 +
    pens * 0.25 +
    Math.max(0, villageFoodSurplus(village)) * 0.15
  const supply = employed + workforce * 0.15
  const raw = demand - supply
  // Unemployment overhang when many idle.
  const slack = idlePressure * 0.45
  return clampNum(raw - slack, -8, 10)
}

/** EU-style soft development: population + infrastructure + production capacity. */
export function computeDevelopment(state: SimState, village: Village): number {
  const pop = village.memberIds.length
  if (pop === 0) return 0
  const roads = countNearbyRoadTiles(state, village.centerX, village.centerY, 18)
  const prod =
    Math.max(0, village.surplus.wood ?? 0) * 0.4 +
    Math.max(0, village.surplus.iron ?? 0) * 1.1 +
    Math.max(0, village.surplus.cloth ?? 0) * 0.9 +
    Math.max(0, village.surplus.bread ?? 0) * 0.5 +
    Math.max(0, village.surplus.stone ?? 0) * 0.35
  const infra =
    (village.hasMill ? 2.2 : 0) +
    (village.hasPort ? 2.8 : 0) +
    (village.hasMarket ? 2.4 : 0) +
    (village.hasMine ? 2.0 : 0) +
    (village.wallTier === 'stone' ? 2.2 : village.wallTier === 'wood' ? 1.1 : 0) +
    Math.min(6, roads * 0.08) +
    Math.min(4, village.tradeRuns * 0.08)
  return Math.round((Math.log1p(pop) * 3.2 + infra + prod * 0.65 + village.cohesion * 1.2) * 10) / 10
}

/** Worn road / path tiles near a settlement — proxy for transport connectivity. */
export function countNearbyRoadTiles(
  state: SimState,
  cx: number,
  cy: number,
  radius = 18,
): number {
  const grid = state.grid
  let n = 0
  const r2 = radius * radius
  // Stride-2 sample (~4× cheaper); scale counts so attractiveness stays comparable.
  const stride = radius > 12 ? 2 : 1
  for (let dy = -radius; dy <= radius; dy += stride) {
    for (let dx = -radius; dx <= radius; dx += stride) {
      if (dx * dx + dy * dy > r2) continue
      const x = cx + dx
      const y = cy + dy
      if (!inBounds(grid, x, y)) continue
      const t = getTerrain(grid, x, y)
      if (t === ROAD) n += 2
      else if (t === PATH) n += 1
      else if (isWornRoad(t)) n += 1
    }
  }
  return stride === 1 ? n : n * stride * stride
}

function villageFoodSurplus(village: Village): number {
  return (
    (village.surplus.food ?? 0) +
    (village.surplus.bread ?? 0) +
    (village.surplus.wheat ?? 0) * 0.45 +
    (village.surplus.flour ?? 0) * 0.55
  )
}

/** Local safety: walls, natural cover, fewer nearby wolves / brigands. */
function villageSafety(state: SimState, village: Village): number {
  let wolves = 0
  for (const w of state.wolves) {
    if (w.alive && distance(w.x, w.y, village.centerX, village.centerY) < 45) wolves++
  }
  let bandits = 0
  for (const b of state.bandits ?? []) {
    if (b.alive && distance(b.x, b.y, village.centerX, village.centerY) < 45) bandits++
  }
  const wall =
    village.wallTier === 'stone' ? 1 : village.wallTier === 'wood' ? 0.55 : village.perimeter.length > 0 ? 0.25 : 0
  const cover = clampNum(village.naturalCover / 24, 0, 0.45)
  const wolfHit = clampNum(wolves * 0.18, 0, 0.85)
  const banditHit = clampNum(bandits * 0.22, 0, 0.9)
  return clampNum(0.35 + wall + cover - wolfHit - banditHit + (village.wallHealth > 0 ? 0.1 : 0), 0, 1.4)
}

/** Soft security (0–1): Bannerlord — walls vs wolves, theft, recent deaths. */
export function villageSecurity(state: SimState, village: Village): number {
  const base = villageSafety(state, village) / 1.4
  const deathHit = clampNum((village.recentDeaths ?? 0) * 0.08, 0, 0.45)
  const theftHit = clampNum((village.recentThefts ?? 0) * 0.06, 0, 0.35)
  return clampNum(base - deathHit - theftHit + (village.wallTier === 'stone' ? 0.08 : 0), 0, 1)
}

/** Manor Lords regional specialty from local comparative advantage. */
export function detectVillageSpecialty(state: SimState, village: Village): Village['specialty'] {
  const grid = state.grid
  const ox = village.centerX
  const oy = village.centerY
  const wood = resourceDensity(grid, ox, oy, 'tree', 16)
  const mountain = resourceDensity(grid, ox, oy, 'mountain', 28)
  const iron = resourceDensity(grid, ox, oy, 'iron', 16)
  const shore = findNearbyShore(grid, ox, oy, 18) !== null
  let fields = 0
  for (const v of state.villagers) {
    if (!v.alive || v.villageId !== village.id) continue
    if (v.hasField || v.fieldX >= 0) fields++
  }
  const scores: { kind: Village['specialty']; s: number }[] = [
    { kind: 'forest', s: wood * 1.1 },
    { kind: 'grain', s: fields * 14 + (village.hasMill ? 20 : 0) + (village.surplus.wheat ?? 0) * 8 },
    { kind: 'shore', s: shore ? 38 + (village.hasPort ? 18 : 0) : -10 },
    { kind: 'mine', s: mountain * 1.15 + iron * 2.2 + (village.hasMine ? 25 : 0) },
  ]
  scores.sort((a, b) => b.s - a.s)
  const best = scores[0]
  const second = scores[1]
  if (!best || best.s < 12) return 'mixed'
  if (second && best.s < second.s * 1.25) return 'mixed'
  return best.kind
}

/**
 * Soft specialty nudge on surplus scores (wood / ore / craft).
 * WP7: food-chain phantoms (wheat/flour/bread/food) are gated — free surplus without
 * inventory was a false signal for feelFamine, career foodNeed, and caravan gain.
 * Non-food specialty stays soft so early trade discovery still works.
 */
function applyRegionalProduction(state: SimState, village: Village) {
  const boost = (res: ResourceType, amt: number) => {
    village.surplus[res] = (village.surplus[res] ?? 0) + amt
  }
  /** Only amplify food surplus that already exists physically (no free lunch). */
  const amplifyIfPositive = (res: ResourceType, frac: number, cap: number) => {
    const phys = village.surplus[res] ?? 0
    if (phys <= 0) return
    boost(res, Math.min(cap, phys * frac))
  }
  const spec = village.specialty ?? 'mixed'
  if (spec === 'forest') {
    boost('wood', 0.55)
    boost('hide', 0.12)
  } else if (spec === 'grain') {
    // No phantom flour/bread — mill chain must earn those stocks.
    amplifyIfPositive('wheat', 0.08, 0.12)
  } else if (spec === 'shore') {
    amplifyIfPositive('food', 0.1, 0.15)
  } else if (spec === 'mine') {
    boost('iron', 0.4)
    boost('stone', 0.35)
    boost('gold', 0.08)
  }
  let weavers = 0
  let smiths = 0
  for (const v of state.villagers) {
    if (!v.alive || v.villageId !== village.id) continue
    if (v.profession === 'weaver') weavers++
    if (v.profession === 'blacksmith') smiths++
  }
  if (weavers > 0) {
    boost('cloth', 0.18 * weavers)
    boost('clothing', 0.08 * weavers)
  }
  if (smiths > 0) boost('iron', 0.12 * smiths)
}

/**
 * Bannerlord settlement prosperity (0–100): food, trade, roads, walls, pop, security hits.
 */
export function computeVillageProsperity(state: SimState, village: Village): number {
  if (village.memberIds.length === 0) return 0
  const food = villageFoodSurplus(village)
  const roads = countNearbyRoadTiles(state, village.centerX, village.centerY, 18)
  const security = village.security > 0 ? village.security : villageSecurity(state, village)
  const pop = village.memberIds.length
  let links = 0
  for (const key of state.tradeRoutes) {
    const [a, b] = key.split('-').map(Number)
    if (a === village.id || b === village.id) links++
  }
  const wallPts =
    village.wallTier === 'stone' ? 14 : village.wallTier === 'wood' ? 8 : village.perimeter.length > 4 ? 3 : 0
  let score =
    28 +
    clampNum(food * 9, -18, 28) +
    Math.min(22, village.tradeRuns * 0.4) +
    Math.min(16, roads * 0.35) +
    wallPts +
    Math.log1p(pop) * 7 +
    security * 22 +
    links * 3.5 +
    (village.hasMill ? 6 : 0) +
    (village.hasPort ? 8 : 0) +
    (village.hasMarket ? 7 : 0) +
    (village.hasMine ? 5 : 0) -
    (village.recentDeaths ?? 0) * 4.5 -
    (village.recentThefts ?? 0) * 3.2 -
    (feelFamine(state, village) ? 12 : 0) -
    (state.season === 'winter' && food < 0 ? 8 : 0) +
    (village.development ?? 0) * 1.1 +
    (village.standardOfLiving ?? 0.35) * 10
  return clampNum(score, 0, 100)
}

export function computeVillageLoyalty(village: Village): number {
  const food = villageFoodSurplus(village)
  const foodFeel = clampNum(0.45 + food * 0.12, 0.05, 0.95)
  return clampNum(foodFeel * 0.55 + (village.security ?? 0.5) * 0.45, 0, 1)
}

/** Soft birth multiplier from prosperity / loyalty (1 = neutral). */
export function villageBirthBias(village: Village | undefined | null): number {
  if (!village) return 1.05
  return clampNum(0.95 + (village.prosperity ?? 35) / 110 + (village.loyalty ?? 0.5) * 0.35, 0.85, 1.75)
}

export function noteVillageCasualty(state: SimState, villageId: number | null) {
  if (villageId === null) return
  const vg = state.villages.find((v) => v.id === villageId)
  if (!vg) return
  vg.recentDeaths = Math.min(12, (vg.recentDeaths ?? 0) + 1)
}

export function noteVillageTheft(state: SimState, villageId: number | null) {
  if (villageId === null) return
  const vg = state.villages.find((v) => v.id === villageId)
  if (!vg) return
  vg.recentThefts = Math.min(12, (vg.recentThefts ?? 0) + 1)
}

/**
 * Central-place attractiveness: food, infra, roads, pop, safety,
 * SoL / development / labor, plus Bannerlord prosperity.
 */
export function villageAttractiveness(state: SimState, village: Village): number {
  if (village.memberIds.length === 0) return 0
  const pop = village.memberIds.length
  const food = villageFoodSurplus(village)
  const roads = countNearbyRoadTiles(state, village.centerX, village.centerY, 18)
  const safety = villageSafety(state, village)
  let links = 0
  for (const key of state.tradeRoutes) {
    const [a, b] = key.split('-').map(Number)
    if (a === village.id || b === village.id) links++
  }
  const sol = village.standardOfLiving ?? 0.35
  const dev = village.development ?? 1
  const laborPull = Math.max(0, village.laborBalance ?? 0) * 2.2
  const prosper = village.prosperity ?? 35
  const crowding = villageCarryingPressure(state, village)
  return (
    food * 7.5 +
    (village.hasMill ? 14 : 0) +
    (village.hasPort ? 20 : 0) +
    (village.hasMarket ? 16 : 0) +
    (village.hasMine ? 8 : 0) +
    Math.min(42, roads * 0.55) +
    Math.log1p(pop) * 16 +
    safety * 18 +
    Math.min(22, village.tradeRuns * 0.35) +
    links * 4 +
    sol * 28 +
    Math.min(24, dev * 1.4) +
    laborPull +
    prosper * 0.42 +
    (village.loyalty ?? 0.5) * 10 -
    crowding * 26
  )
}

/** How many resources show opposite surplus signs — classic complementary trade motive. */
export function complementarySurplusScore(home: Village, other: Village): number {
  let hits = 0
  for (const res of TRACKED_RESOURCES) {
    const a = home.surplus[res] ?? 0
    const b = other.surplus[res] ?? 0
    if ((a > 0.15 && b < -0.1) || (b > 0.15 && a < -0.1)) hits++
  }
  return hits
}

/**
 * Euclidean distance softened by roads and ports (effective distance / gravity model).
 * Roads and ports shrink friction; dual ports help long coastal hauls.
 */
export function effectiveTradeDistance(
  state: SimState,
  home: Village,
  other: Village,
  fromX: number,
  fromY: number,
): number {
  const raw = distance(fromX, fromY, other.centerX, other.centerY)
  const roads =
    countNearbyRoadTiles(state, home.centerX, home.centerY, 16) +
    countNearbyRoadTiles(state, other.centerX, other.centerY, 16)
  const roadEase = 1 + Math.min(0.55, roads * 0.012)
  let portEase = 1
  if (home.hasPort) portEase *= 1.22
  if (other.hasPort) portEase *= 1.18
  if (home.hasPort && other.hasPort) portEase *= 1.12
  const knownRoute = state.tradeRoutes.has(routeKey(home.id, other.id))
  const routeEase = knownRoute ? 1.15 : 1
  return raw / (roadEase * portEase * routeEase)
}

/** Soft secondary-market coupling: linked villages' surpluses drift toward each other. */
function coupleLinkedSurpluses(state: SimState) {
  for (const key of state.tradeRoutes) {
    const parts = key.split('-').map(Number)
    if (parts.length !== 2) continue
    const a = state.villages.find((vg) => vg.id === parts[0])
    const b = state.villages.find((vg) => vg.id === parts[1])
    if (!a || !b || a.memberIds.length === 0 || b.memberIds.length === 0) continue
    for (const res of TRACKED_RESOURCES) {
      const sa = a.surplus[res] ?? 0
      const sb = b.surplus[res] ?? 0
      const mid = (sa + sb) * 0.5
      a.surplus[res] = sa + (mid - sa) * LINKED_SURPLUS_COUPLE
      b.surplus[res] = sb + (mid - sb) * LINKED_SURPLUS_COUPLE
    }
  }
}

function detectRegionalHub(state: SimState) {
  const active = state.villages.filter((vg) => vg.memberIds.length >= 3)
  if (active.length < 2) return
  const scores = active.map((vg) => vg.attractiveness).sort((x, y) => x - y)
  const median = scores[Math.floor(scores.length / 2)] ?? 0
  let best: Village | null = null
  for (const vg of active) {
    if (vg.isRegionalHub) continue
    let links = 0
    for (const key of state.tradeRoutes) {
      const [a, b] = key.split('-').map(Number)
      if (a === vg.id || b === vg.id) links++
    }
    if (vg.tradeRuns < 3 && links < 1) continue
    if (vg.attractiveness < median * 1.35 && vg.attractiveness < median + 18) continue
    if (!best || vg.attractiveness > best.attractiveness) best = vg
  }
  if (!best) return
  best.isRegionalHub = true
  const solPct = ((best.standardOfLiving ?? 0.35) * 100).toFixed(0)
  if (!state.milestones.firstRegionalHub) {
    state.milestones.firstRegionalHub = true
    logEvent(
      state,
      `Le village n°${best.id} devient un carrefour régional (attractivité ${best.attractiveness.toFixed(0)}, dév. ${(best.development ?? 0).toFixed(1)}, SoL ${solPct}%)`,
    )
  } else {
    logEvent(
      state,
      `Le village n°${best.id} s'impose comme pôle commercial (SoL ${solPct}%, dév. ${(best.development ?? 0).toFixed(1)})`,
    )
  }
}

/**
 * After surplus accounting: refresh SoL, development, labor, Bannerlord prosperity,
 * couple secondary markets, chronicle hubs / SoL / prosperity shocks.
 * Call after tickVillageEconomy, before tickMarketPrices.
 */
export function tickUrbanNetwork(state: SimState) {
  coupleLinkedSurpluses(state)
  for (const village of state.villages) {
    if (village.development === undefined) village.development = 1
    if (village.standardOfLiving === undefined) village.standardOfLiving = 0.35
    if (village.laborBalance === undefined) village.laborBalance = 0
    if (village.solBand === undefined) village.solBand = null
    if (village.prosperity === undefined) village.prosperity = 35
    if (village.loyalty === undefined) village.loyalty = 0.5
    if (village.security === undefined) village.security = 0.5
    if (village.recentDeaths === undefined) village.recentDeaths = 0
    if (village.recentThefts === undefined) village.recentThefts = 0
    if (village.specialty === undefined) village.specialty = 'mixed'
    if (village.lastProsperLogTick === undefined) village.lastProsperLogTick = -9999
    if (village.hasMarket === undefined) village.hasMarket = false
    if (village.marketX === undefined) village.marketX = -1
    if (village.marketY === undefined) village.marketY = -1

    // Decay crime / casualty pressure (recovery when peaceful).
    village.recentDeaths = Math.max(0, village.recentDeaths * 0.88 - 0.08)
    village.recentThefts = Math.max(0, village.recentThefts * 0.9 - 0.06)

    village.specialty = detectVillageSpecialty(state, village)
    village.security = villageSecurity(state, village)
    tryFoundMarket(state, village)
    village.development = computeDevelopment(state, village)
    village.laborBalance = computeLaborBalance(state, village)

    let solSum = 0
    let n = 0
    for (const v of state.villagers) {
      if (!v.alive || v.villageId !== village.id) continue
      solSum += villagerSoL(state, v)
      n++
    }
    const nextSol = n > 0 ? solSum / n : 0.2
    village.standardOfLiving = village.standardOfLiving * 0.65 + nextSol * 0.35

    const prevProsper = village.prosperity
    village.prosperity = computeVillageProsperity(state, village)
    village.loyalty = computeVillageLoyalty(village)

    const band = solBandOf(village.standardOfLiving)
    if (village.solBand !== null && village.solBand !== band) {
      if (band === 'crash' || (band === 'poor' && (village.solBand === 'good' || village.solBand === 'boom'))) {
        logEvent(
          state,
          `Niveau de vie en chute au village n°${village.id} (${village.solBand} → ${band}, SoL ${(village.standardOfLiving * 100).toFixed(0)}%)`,
        )
      } else if (band === 'boom' || (band === 'good' && (village.solBand === 'crash' || village.solBand === 'poor'))) {
        logEvent(
          state,
          `Essor du niveau de vie au village n°${village.id} (${village.solBand} → ${band}, SoL ${(village.standardOfLiving * 100).toFixed(0)}%, dév. ${village.development.toFixed(1)})`,
        )
      }
    }
    village.solBand = band

    // Rare Bannerlord-style prosperity chronicle (throttled).
    if (state.tick - village.lastProsperLogTick > 1800) {
      if (village.prosperity >= 72 && prevProsper < 65) {
        village.lastProsperLogTick = state.tick
        const specFr =
          village.specialty === 'forest'
            ? 'bois'
            : village.specialty === 'grain'
              ? 'céréales'
              : village.specialty === 'shore'
                ? 'pêche'
                : village.specialty === 'mine'
                  ? 'minerais'
                  : 'échanges'
        logCause(
          state,
          `sécurité et ${specFr} au village n°${village.id}`,
          `prospérité montante (${village.prosperity.toFixed(0)}) — les marchés s'animent`,
        )
      } else if (village.prosperity <= 22 && prevProsper > 30) {
        village.lastProsperLogTick = state.tick
        logCause(
          state,
          `loups, vols ou disette au village n°${village.id}`,
          `prospérité en berne (${village.prosperity.toFixed(0)}) — loyauté fragilisée`,
        )
      }
    }

    village.attractiveness = villageAttractiveness(state, village)
  }
  detectRegionalHub(state)
}

/** Recomputes per-capita surplus, then applies Manor Lords regional production bias. */
export function tickVillageEconomy(state: SimState) {
  for (const village of state.villages) {
    const totals: Partial<Record<ResourceType, number>> = {}
    let n = 0
    for (const v of state.villagers) {
      if (!v.alive || v.villageId !== village.id) continue
      n++
      for (const res of TRACKED_RESOURCES) {
        const have = countOf(v.inventory, res) + (v.chestInventory ? countOf(v.chestInventory, res) : 0)
        totals[res] = (totals[res] ?? 0) + have
      }
    }
    if (n === 0) continue
    for (const res of TRACKED_RESOURCES) {
      village.surplus[res] = (totals[res] ?? 0) / n - targetOf(res)
    }
    if (village.specialty === undefined) village.specialty = 'mixed'
    village.specialty = detectVillageSpecialty(state, village)
    applyRegionalProduction(state, village)
    // Development + roads can found plazas without a completed long caravan.
    tryFoundMarket(state, village)
  }
}

/**
 * Vic3-like market clearing on key goods (+ full tracked basket).
 * Pop consumer demand vs stocks → price moves with elasticity and smoothing (no player budget).
 */
export function tickMarketPrices(state: SimState) {
  let population = 0
  const totals: Partial<Record<ResourceType, number>> = {}
  let millCount = 0
  let portCount = 0
  let meanSol = 0.35
  let solN = 0
  for (const v of state.villagers) {
    if (!v.alive) continue
    population++
    for (const res of TRACKED_RESOURCES) {
      const have = countOf(v.inventory, res) + (v.chestInventory ? countOf(v.chestInventory, res) : 0)
      totals[res] = (totals[res] ?? 0) + have
    }
  }
  for (const vg of state.villages) {
    if (vg.hasMill) millCount++
    if (vg.hasPort) portCount++
    if (vg.memberIds.length > 0) {
      meanSol += vg.standardOfLiving ?? 0.35
      solN++
    }
  }
  // Manor Lords regional goods: count specialists to damp local-commodity prices.
  let forestN = 0
  let grainN = 0
  let shoreN = 0
  let mineN = 0
  for (const vg of state.villages) {
    if (vg.memberIds.length === 0) continue
    if (vg.specialty === 'forest') forestN++
    else if (vg.specialty === 'grain') grainN++
    else if (vg.specialty === 'shore') shoreN++
    else if (vg.specialty === 'mine') mineN++
  }
  if (population === 0) return
  if (solN > 0) meanSol /= solN

  let villageBias = 1
  if (state.villages.length > 0) {
    let sum = 0
    for (const vg of state.villages) sum += politicalPriceBias(state, vg.id)
    villageBias = sum / state.villages.length
  }
  const famineFood = state.villages.some((vg) => feelFamine(state, vg)) ? 1.35 : 1
  const millEase = millCount > 0 ? 1 / (1 + millCount * 0.08) : 1.12
  const portEase = portCount > 0 ? 1 / (1 + portCount * 0.05) : 1
  const linkDepth = Math.min(1, state.tradeRoutes.size / Math.max(1, state.villages.length))
  const networkDamp = 1 - linkDepth * 0.12

  // Consumer demand scales with aspiration (higher SoL → slightly more cloth/iron demand).
  const aspiration = 0.85 + meanSol * 0.45
  const KEY_CLEAR: ResourceType[] = [
    'food',
    'bread',
    'wood',
    'cloth',
    'clothing',
    'iron',
    'wool',
    'fish',
    'copper',
    'salt',
    'flour',
  ]

  for (const res of TRACKED_RESOURCES) {
    const target = targetOf(res) * population * (KEY_CLEAR.includes(res) ? aspiration : 1)
    const actual = Math.max(0.5, totals[res] ?? 0)
    // Supply/demand ratio → scarcity; Vic3 soft clearing.
    const ratio = target / actual
    const elasticity = KEY_CLEAR.includes(res) ? 0.85 : 0.65
    const scarcity = clampNum(Math.pow(ratio, elasticity), 0.28, 4.5)
    const coupled = 1 + (scarcity - 1) * networkDamp
    const base = BASE_PRICE[res] ?? 3
    const isFood = res === 'food' || res === 'bread' || res === 'wheat' || res === 'flour'
    let pol = villageBias * (isFood ? famineFood : 1)
    if (res === 'flour' || res === 'bread') pol *= millEase
    if (res === 'iron' || res === 'cloth' || res === 'gold' || res === 'clothing') pol *= portEase
    if (res === 'wood' && state.season === 'winter') pol *= 1.18
    // Regional production eases prices for specialty goods (market discovery).
    if (res === 'wood' && forestN > 0) pol *= 1 / (1 + forestN * 0.05)
    if ((res === 'wheat' || res === 'flour' || res === 'bread' || res === 'rye' || res === 'barley' || res === 'oats') && grainN > 0)
      pol *= 1 / (1 + grainN * 0.045)
    if ((res === 'food' || res === 'fish' || res === 'game') && shoreN > 0) pol *= 1 / (1 + shoreN * 0.04)
    if ((res === 'iron' || res === 'stone' || res === 'gold' || res === 'copper' || res === 'tin' || res === 'silver' || res === 'coal') && mineN > 0)
      pol *= 1 / (1 + mineN * 0.05)
    const cleared = base * coupled * pol
    const prev = state.prices[res] ?? base
    // Smooth clearing — prices don't jump every tick window.
    const smooth = KEY_CLEAR.includes(res) ? 0.35 : 0.22
    const next = Math.round((prev * (1 - smooth) + cleared * smooth) * 10) / 10
    state.prices[res] = next
    pushPriceHistory(state, res, next)
    if (base > 0 && Math.abs(next - prev) / base >= 0.05) {
      notePriceDelta(state, { resource: res, priceBefore: prev, priceAfter: next })
    }
  }
}

export interface TradeOpportunity {
  target: Village
  resource: ResourceType
  gain: number
  distance: number
}

/**
 * Best reachable village to sell to (caravan channel: surplus differential + live prices).
 * Distinct from local `tickTrade` proximity barter — see behaviors.tickTrade WP7 note.
 */
export function findTradeOpportunity(
  state: SimState,
  home: Village,
  fromX: number,
  fromY: number,
  trader?: Villager | null,
): TradeOpportunity | null {
  let best: TradeOpportunity | null = null
  let bestScore = -Infinity
  for (const other of state.villages) {
    if (other.id === home.id || other.memberIds.length === 0) continue
    if (trader && refuseTradeWith(state, trader, other.id)) continue
    const effD = effectiveTradeDistance(state, home, other, fromX, fromY)
    if (effD > MAX_TRADE_DIST) continue

    const relMod = trader ? tradeRelationModifier(trader, other.id, state) : 1
    let cultMod = 1
    if (trader) {
      const tm = mindOf(trader)
      ensureCultureState(tm, trader, () => 0.5)
      let simSum = 0
      let n = 0
      for (const o of state.villagers) {
        if (!o.alive || o.villageId !== other.id) continue
        const om = mindOf(o)
        ensureCultureState(om, o, () => 0.5)
        simSum += cultureSimilarity(tm.cultureFeatures, om.cultureFeatures)
        n++
        if (n >= 5) break
      }
      if (n > 0) cultMod = homophilyBias(simSum / n, 'trade')
    }
    const complement = complementarySurplusScore(home, other)
    const attractPull = 1 + Math.min(0.35, other.attractiveness / 120)
    const tradeWeight = 1 + Math.min(0.4, (other.development ?? 1) * 0.04) + (other.hasPort ? 0.12 : 0)
    const destHungry = villageInFamine(state, other)
    for (const resource of TRACKED_RESOURCES) {
      const isFood =
        resource === 'food' ||
        resource === 'bread' ||
        resource === 'wheat' ||
        resource === 'flour' ||
        resource === 'fish' ||
        resource === 'meat' ||
        resource === 'game'
      let gain = (home.surplus[resource] ?? 0) - (other.surplus[resource] ?? 0)
      // Absolute glut still seeks a thinner market (not only mirror-image deficits).
      if (gain < targetOf(resource) * 0.35 && (home.surplus[resource] ?? 0) > targetOf(resource) * 0.55) {
        gain = Math.max(gain, (home.surplus[resource] ?? 0) - Math.max(0, other.surplus[resource] ?? 0) * 0.55)
      }
      // Food relief: surplus home → starving destination even when gain is thin.
      if (isFood && destHungry && (home.surplus[resource] ?? 0) > targetOf(resource) * 0.2) {
        gain = Math.max(gain, (home.surplus[resource] ?? 0) * 0.45)
      }
      if (home.hasPort) gain *= 1.15
      if (other.hasPort) gain *= 1.12
      gain *= relMod * cultMod
      gain *= 1 + complement * 0.1
      gain *= attractPull * tradeWeight
      if (isFood && destHungry) gain *= 1.55
      if (isFood && feelFamine(state, other)) gain *= 1.2
      const minGain = targetOf(resource) * MIN_TRADE_GAIN_FRACTION * (isFood && destHungry ? 0.45 : 1)
      if (gain < minGain) continue
      // Gravity-style score: complementary surplus / effective distance decay.
      const priceW = 0.85 + Math.min(0.55, ((state.prices[resource] ?? BASE_PRICE[resource] ?? 3) / (BASE_PRICE[resource] ?? 3) - 1) * 0.4)
      const score = ((gain / targetOf(resource)) * priceW) / (1 + effD * 0.0035)
      if (score > bestScore) {
        bestScore = score
        best = { target: other, resource, gain, distance: effD }
      }
    }
  }
  return best
}

function routeKey(a: number, b: number): string {
  return a < b ? `${a}-${b}` : `${b}-${a}`
}

/**
 * The trader has arrived and struck the deal. This moves real goods — pulled only from home
 * village chests, never from what a villager is personally carrying — and never below the
 * village's own safety reserve (TARGET_PER_CAPITA). That reserve matters most for bread and
 * wheat: a trade moves surplus, not the larder, or "surplus" detection would starve the very
 * village it was supposed to be measuring. The coin reward is tied to the resource's market
 * price, so a load of iron or gold pays better than the same headcount of wood.
 */
export function conductTrade(
  state: SimState,
  trader: {
    inventory: Slot[]
    villageId: number | null
    name: string
    id?: number
    hasCart?: boolean
    boatId?: number | null
    profession?: string
  },
  destVillage: Village,
  resource: ResourceType,
  gain: number,
) {
  const homeVillage = state.villages.find((vg) => vg.id === trader.villageId)
  // Logistics by cargo mass (kg) — cart / bateau cargo, not just headcount.
  const unitKg = ITEM_MASS[resource] || 1
  let massCap = 28 + (trader.hasCart ? CART_CARGO_KG : 0)
  if (trader.boatId != null) {
    const boat = state.boats.find((b) => b.id === trader.boatId && b.alive)
    massCap += boatCargoCapacityKg(boat?.kind === 'cargo' ? 'cargo' : 'fishing') * 0.55
  } else if (trader.hasCart) {
    massCap += HORSE_PACK_KG * 0.25
  }
  if (trader.profession === 'trader') massCap *= 1.12
  const byMass = Math.max(1, Math.floor(massCap / unitKg))
  const wanted = Math.max(1, Math.min(byMass, Math.round(gain * 1.15 + byMass * 0.15)))
  let sourced = 0

  if (homeVillage) {
    let members = 0
    let stored = 0
    for (const v of state.villagers) {
      if (!v.alive || v.villageId !== homeVillage.id) continue
      members++
      if (v.chestInventory) stored += countOf(v.chestInventory, resource)
      stored += countOf(v.inventory, resource)
    }
    const safeToSell = Math.max(0, stored - targetOf(resource) * members)
    let remaining = Math.min(wanted, safeToSell)

    for (const v of state.villagers) {
      if (remaining <= 0 || v.villageId !== homeVillage.id || !v.chestInventory) continue
      const take = Math.min(countOf(v.chestInventory, resource), remaining)
      if (take > 0) {
        removeFromInventory(v.chestInventory, resource, take)
        remaining -= take
        sourced += take
      }
    }
  }

  if (sourced > 0) {
    for (const v of state.villagers) {
      if (v.villageId !== destVillage.id || !v.chestInventory) continue
      addToInventory(v.chestInventory, resource, sourced)
      break
    }
  }

  const fulfilment = sourced / wanted
  const portBonus = (homeVillage?.hasPort ? 1.45 : 1) * (destVillage.hasPort ? 1.45 : 1)
  const marketBonus =
    (homeVillage?.hasMarket ? 1.18 : 1) * (destVillage.hasMarket ? 1.12 : 1)
  const millBonus =
    (resource === 'flour' || resource === 'bread' || resource === 'wheat') && homeVillage?.hasMill ? 1.2 : 1
  const market = state.prices[resource] ?? BASE_PRICE[resource] ?? 3
  const professionBonus = trader.profession === 'trader' ? 1.25 : 1
  const reward = Math.round(
    Math.max(2, Math.min(72, sourced * market * (0.55 + 0.45 * fulfilment) + 2)) *
      portBonus *
      marketBonus *
      millBonus *
      professionBonus *
      (trader.hasCart ? 1.2 : 1) *
      (trader.boatId != null ? 1.1 : 1),
  )
  addToInventory(trader.inventory, 'coin', reward)

  if (homeVillage) homeVillage.tradeRuns += 1
  destVillage.tradeRuns += 1
  // Successful caravan lightly lifts home prosperity (Bannerlord trade↔prosperity).
  if (homeVillage && sourced > 0) {
    homeVillage.prosperity = clampNum((homeVillage.prosperity ?? 35) + 0.35 + sourced * 0.04, 0, 100)
  }
  // Trade windfalls concentrate coin with the caravaner → regional inequality pressure.
  if (homeVillage && reward >= 8) {
    homeVillage.inequalityStress = clamp01((homeVillage.inequalityStress ?? 0) + 0.04 + reward * 0.0015)
  }
  if (destVillage && sourced > 0) {
    destVillage.prosperity = clampNum((destVillage.prosperity ?? 35) + 0.2 + sourced * 0.02, 0, 100)
  }

  if (homeVillage) {
    const key = routeKey(homeVillage.id, destVillage.id)
    if (!state.tradeRoutes.has(key)) {
      state.tradeRoutes.add(key)
      logEvent(state, `${trader.name} ouvre une route commerciale (${RESOURCE_LABELS_LOG[resource]})`)
    }
    diffuseVillageKnowledge(state, homeVillage, destVillage, makeRng(((state.tick * 3343 + (trader.id ?? 0) * 97) >>> 0) || 1))
    tryFoundMarket(state, homeVillage)
  }
  tryFoundMarket(state, destVillage)
}

/** Whether this village has earned a market plaza: completed caravans OR local firm exchange. */
export function marketEligible(state: SimState, village: Village): boolean {
  if (village.hasMarket) return false
  if (village.tradeRuns >= MARKET_TRADE_THRESHOLD) return true
  // Roads + development + specialty surplus → plaza without waiting on a long caravan.
  const roads = countNearbyRoadTiles(state, village.centerX, village.centerY, 10)
  const developed = (village.development ?? 0) >= 3.5 && roads >= 10
  const specialtyTrade =
    village.specialty === 'grain' ||
    village.specialty === 'shore' ||
    village.specialty === 'mine' ||
    village.specialty === 'forest'
  return developed && specialtyTrade && (village.prosperity ?? 0) >= 38
}

/** Stamp a market plaza once trade + roads justify regional development. */
export function tryFoundMarket(state: SimState, village: Village): boolean {
  if (village.hasMarket === undefined) village.hasMarket = false
  if (village.marketX === undefined) village.marketX = -1
  if (village.marketY === undefined) village.marketY = -1
  if (!marketEligible(state, village)) return false
  const mx = village.centerX
  const my = village.centerY
  stampPlaza(state.grid, mx, my)
  village.hasMarket = true
  village.marketX = mx
  village.marketY = my
  village.development = (village.development ?? 1) + 1.8
  village.prosperity = clampNum((village.prosperity ?? 35) + 4, 0, 100)
  village.attractiveness = villageAttractiveness(state, village)
  logEvent(state, `Un marché s'installe au village n°${village.id} (routes et caravanes)`)
  if (!state.milestones.firstMarket) {
    state.milestones.firstMarket = true
    logEvent(state, `Premier marché fondé`)
  }
  return true
}

/** Whether this village has earned a port: enough trade, and water close enough to build on. */
export function portEligible(state: SimState, village: Village): boolean {
  if (village.hasPort || village.tradeRuns < PORT_TRADE_THRESHOLD) return false
  // Wider water search — river hubs often sit >24 tiles from a usable bank.
  return findMillSite(state.grid, village.centerX, village.centerY, 48) !== null
}
