/**
 * Phase 7 WAVE 3 - business / firms registry + live hire/fail tick.
 * Firms emerge from mills, markets, smiths, bakers — hire nearby labor or fail.
 */

import { addToInventory, countOf, removeFromInventory } from '../inventory'
import { tryFoundMarket } from '../commerce'
import { logCause } from '../politics'
import type { ResourceType } from '../inventory'
import { CRAFT_RECIPES, recipeCraftable } from '../resources'
import type { Profession, SimState, Villager } from '../types'
import { distance } from '../world'
import { wrapInventory } from './inventoryBridge'
import { applyConsumeGoods } from './consumption'
import { demandFromVillager } from './needsDemand'
import {
  applyCraft,
  findProductionRecipe,
  FOOD_CHAIN_RECIPES,
  productionRecipeFromCraft,
} from './productionRecipes'

export type BusinessKind =
  | 'farm'
  | 'mill'
  | 'forge'
  | 'bakery'
  | 'workshop'
  | 'trade'
  | 'other'

export interface BusinessWorkplace {
  x: number
  y: number
}

export interface BusinessRecord {
  id: string
  ownerId: number
  kind: BusinessKind
  workplace?: BusinessWorkplace
  workerIds: number[]
  stockHint?: Partial<Record<ResourceType, number>>
  idleTicks?: number
  failed?: boolean
}

export type EconomyBusinessesBag = BusinessRecord[]

export function ensureBusinessBag(state: SimState): BusinessRecord[] {
  if (state.economyBusinesses) return state.economyBusinesses
  const bag: BusinessRecord[] = []
  state.economyBusinesses = bag
  return bag
}

export function registerBusiness(state: SimState, record: BusinessRecord): BusinessRecord {
  const bag = ensureBusinessBag(state)
  const idx = bag.findIndex((b) => b.id === record.id)
  if (idx >= 0) bag[idx] = record
  else bag.push(record)
  return record
}

export function findBusinessesByOwner(state: SimState, ownerId: number): BusinessRecord[] {
  return ensureBusinessBag(state).filter((b) => b.ownerId === ownerId)
}

export function findBusiness(state: SimState, businessId: string): BusinessRecord | undefined {
  return ensureBusinessBag(state).find((b) => b.id === businessId)
}

function coinWealth(v: Villager): number {
  return countOf(v.inventory, 'coin') + (v.chestInventory ? countOf(v.chestInventory, 'coin') : 0)
}

function kindForProfession(p: Profession): BusinessKind | null {
  if (p === 'miller') return 'mill'
  if (p === 'blacksmith' || p === 'miner') return 'forge'
  if (p === 'farmer') return 'farm'
  if (p === 'trader') return 'trade'
  if (p === 'builder' || p === 'mason' || p === 'weaver') return 'workshop'
  if (p === 'herder') return 'other'
  return null
}

function workplaceFor(state: SimState, v: Villager, kind: BusinessKind): BusinessWorkplace {
  if (kind === 'mill' && v.villageId != null) {
    const vg = state.villages.find((x) => x.id === v.villageId)
    if (vg?.hasMill) return { x: vg.millX, y: vg.millY }
  }
  if (kind === 'trade' && v.villageId != null) {
    const vg = state.villages.find((x) => x.id === v.villageId)
    if (vg?.hasMarket) return { x: vg.marketX, y: vg.marketY }
  }
  if (kind === 'forge' && v.villageId != null) {
    const vg = state.villages.find((x) => x.id === v.villageId)
    if (vg?.hasMine) return { x: vg.mineX, y: vg.mineY }
  }
  return { x: Math.round(v.x), y: Math.round(v.y) }
}

function discoverFirms(state: SimState) {
  const bag = ensureBusinessBag(state)
  for (const v of state.villagers) {
    if (!v.alive) continue
    const kind = kindForProfession(v.profession)
    if (!kind) continue
    if (kind === 'farm' && coinWealth(v) < 2) continue
    if (kind === 'workshop' && coinWealth(v) < 2) continue
    const id = `firm-${kind}-${v.id}`
    if (bag.some((b) => b.id === id && !b.failed)) continue
    if (bag.some((b) => b.ownerId === v.id && !b.failed)) continue
    registerBusiness(state, {
      id,
      ownerId: v.id,
      kind,
      workplace: workplaceFor(state, v, kind),
      workerIds: [],
      idleTicks: 0,
      failed: false,
    })
    logCause(state, `metier ${v.profession} de ${v.name}`, `atelier / firme ${kind} fonde`)
  }
}

function tryHire(state: SimState, firm: BusinessRecord) {
  if (firm.failed) return
  if (firm.workerIds.length >= 3) return
  const owner = state.villagers.find((v) => v.id === firm.ownerId && v.alive)
  if (!owner) return
  const wp = firm.workplace ?? { x: owner.x, y: owner.y }
  let best: Villager | null = null
  let bestD = 28
  for (const v of state.villagers) {
    if (!v.alive || v.id === owner.id) continue
    if (firm.workerIds.includes(v.id)) continue
    if (v.profession === 'guard') continue
    const d = distance(v.x, v.y, wp.x, wp.y)
    if (d >= bestD) continue
    const match =
      (firm.kind === 'mill' && v.profession === 'miller') ||
      (firm.kind === 'forge' && (v.profession === 'blacksmith' || v.profession === 'miner')) ||
      (firm.kind === 'farm' && v.profession === 'farmer') ||
      (firm.kind === 'trade' && v.profession === 'trader') ||
      (firm.kind === 'workshop' && (v.profession === 'builder' || v.profession === 'mason' || v.profession === 'weaver')) ||
      v.profession === 'none' ||
      v.profession === 'forager' ||
      v.task?.kind === 'idle'
    if (!match && d > 12) continue
    best = v
    bestD = d
  }
  if (!best) return
  firm.workerIds.push(best.id)
  state.firmHireCount = (state.firmHireCount ?? 0) + 1
  if (countOf(owner.inventory, 'coin') >= 1) {
    removeFromInventory(owner.inventory, 'coin', 1)
    addToInventory(best.inventory, 'coin', 1)
  }
  logCause(
    state,
    `besoin de main-d'oeuvre chez ${owner.name}`,
    `${best.name} est embauche dans la firme ${firm.kind}`,
  )
}

function tryFail(state: SimState, firm: BusinessRecord) {
  if (firm.failed) return
  const owner = state.villagers.find((v) => v.id === firm.ownerId && v.alive)
  if (!owner) {
    firm.failed = true
    state.firmFailCount = (state.firmFailCount ?? 0) + 1
    logCause(state, 'mort ou disparition du patron', `faillite de la firme ${firm.kind}`)
    return
  }
  if (firm.workerIds.length === 0) firm.idleTicks = (firm.idleTicks ?? 0) + 1
  else firm.idleTicks = 0

  const broke = coinWealth(owner) < 1 && (firm.idleTicks ?? 0) >= 4
  const vg = owner.villageId != null ? state.villages.find((x) => x.id === owner.villageId) : null
  const crash = vg != null && (vg.prosperity ?? 40) < 12 && (firm.idleTicks ?? 0) >= 2
  if (broke || crash) {
    firm.failed = true
    firm.workerIds = []
    state.firmFailCount = (state.firmFailCount ?? 0) + 1
    logCause(
      state,
      broke ? `caisse vide de ${owner.name}` : 'effondrement local (prosperite basse)',
      `faillite de la firme ${firm.kind} — consequences sociales`,
    )
    for (const v of state.villagers) {
      if (!v.alive) continue
      if (distance(v.x, v.y, owner.x, owner.y) > 24) continue
      v.hunger = Math.min(1, v.hunger + 0.02)
    }
  }
}

/** Goods a firm will wholesale at the plaza (includes forge/workshop outputs). */
const FIRM_TRADEABLES: ReadonlyArray<{ res: ResourceType; reserve: number }> = [
  // Reserve 0 — firm wholesale must clear stock; households keep personal bags separately.
  { res: 'bread', reserve: 0 },
  { res: 'flour', reserve: 0 },
  { res: 'cheese', reserve: 0 },
  { res: 'ale', reserve: 0 },
  { res: 'wine', reserve: 0 },
  { res: 'preserved', reserve: 0 },
  { res: 'cloth', reserve: 0 },
  { res: 'clothing', reserve: 0 },
  { res: 'linen', reserve: 0 },
  { res: 'rope', reserve: 0 },
  { res: 'medicine', reserve: 0 },
  { res: 'bronze', reserve: 0 },
  { res: 'mortar', reserve: 0 },
  { res: 'brick', reserve: 0 },
  { res: 'soap', reserve: 0 },
  { res: 'candle', reserve: 0 },
  { res: 'basket', reserve: 0 },
  { res: 'torch', reserve: 0 },
  { res: 'wood', reserve: 0 },
  { res: 'stone', reserve: 0 },
  { res: 'iron', reserve: 0 },
  { res: 'copper', reserve: 0 },
  { res: 'coal', reserve: 0 },
  { res: 'wheat', reserve: 0 },
  { res: 'food', reserve: 0 },
  { res: 'fish', reserve: 0 },
  { res: 'game', reserve: 0 },
  { res: 'wool', reserve: 0 },
  { res: 'hide', reserve: 0 },
  { res: 'milk', reserve: 0 },
  { res: 'charcoal', reserve: 0 },
]

function bumpStockHint(firm: BusinessRecord, res: ResourceType, delta: number) {
  firm.stockHint = {
    ...(firm.stockHint ?? {}),
    [res]: Math.max(0, (firm.stockHint?.[res] ?? 0) + delta),
  }
}

/** Firm craft pulse — workers/owner convert stock via production facade (not hire-only). */
function tryProduce(state: SimState, firm: BusinessRecord) {
  if (firm.failed) return
  if (state.tick % 24 !== firm.ownerId % 24) return
  const owner = state.villagers.find((v) => v.id === firm.ownerId && v.alive)
  if (!owner) return
  const worker =
    firm.workerIds
      .map((id) => state.villagers.find((v) => v.id === id && v.alive))
      .find((v) => v != null) ?? owner
  if (!worker) return

  const prefer: string[] =
    firm.kind === 'forge'
      ? ['bronze', 'mortar', 'nail']
      : firm.kind === 'bakery' || firm.kind === 'mill'
        ? ['food_chain_grind_wheat', 'food_chain_bake_bread', 'cheese', 'ale', 'preserve_fish']
        : firm.kind === 'workshop'
          ? ['cloth', 'linen', 'rope', 'brick']
          : firm.kind === 'farm'
            ? ['cheese', 'preserve_game']
            : ['cloth', 'rope', 'medicine', 'ale']

  // Prefer documented food-chain for mills (wheat→flour→bread), else CRAFT_RECIPES.
  if (firm.kind === 'mill' || firm.kind === 'bakery') {
    for (const fr of FOOD_CHAIN_RECIPES) {
      const view = wrapInventory(worker.inventory)
      const made = applyCraft(fr, view, 0.6)
      if (!made) continue
      firm.idleTicks = 0
      state.firmProduceCount = (state.firmProduceCount ?? 0) + 1
      for (const line of made.outputs) bumpStockHint(firm, line.resource as ResourceType, line.amount)
      if (state.firmProduceCount % 5 === 1) {
        logCause(state, `moulin/four de ${owner.name}`, `chaine ${fr.labelFr ?? fr.id} (firme)`)
      }
      trySellAtMarket(state, firm, owner, worker)
      return
    }
  }

  let recipe = CRAFT_RECIPES.find(
    (r) => prefer.includes(r.output) || prefer.includes(r.id),
  )
  if (!recipe || !recipeCraftable(recipe, (t) => countOf(worker.inventory, t))) {
    recipe = CRAFT_RECIPES.find((r) => recipeCraftable(r, (t) => countOf(worker.inventory, t)))
  }
  if (!recipe) return
  const prod = findProductionRecipe(recipe.id) ?? productionRecipeFromCraft(recipe)
  const made = applyCraft(prod, wrapInventory(worker.inventory), 0.55)
  if (!made) return
  firm.idleTicks = 0
  state.firmProduceCount = (state.firmProduceCount ?? 0) + 1
  for (const line of made.outputs) bumpStockHint(firm, line.resource as ResourceType, line.amount)
  if (state.firmProduceCount % 7 === 1) {
    logCause(
      state,
      `atelier ${firm.kind} de ${owner.name}`,
      `production ${recipe.labelFr ?? recipe.output} (firme)`,
    )
  }
  trySellAtMarket(state, firm, owner, worker)
}

/** Local wholesale at plaza — firm output → coin + market emergence (caravan alternative). */
function trySellAtMarket(
  state: SimState,
  firm: BusinessRecord,
  owner: Villager,
  worker: Villager,
) {
  const vg =
    (owner.villageId != null
      ? state.villages.find((x) => x.id === owner.villageId)
      : undefined) ??
    (worker.villageId != null
      ? state.villages.find((x) => x.id === worker.villageId)
      : undefined)

  // Sell from worker first, then owner — stock must leave bags and become coin.
  const bags = worker.id === owner.id ? [worker.inventory] : [worker.inventory, owner.inventory]
  let sold = 0
  for (const bag of bags) {
    for (const { res, reserve } of FIRM_TRADEABLES) {
      const have = countOf(bag, res)
      const surplus = have - reserve
      if (surplus < 1) continue
      const qty = Math.min(6, surplus)
      const taken = removeFromInventory(bag, res, qty)
      if (taken <= 0) continue
      const coin = Math.max(1, taken)
      addToInventory(owner.inventory, 'coin', coin)
      sold += taken
      bumpStockHint(firm, res, -taken)
    }
  }
  if (sold <= 0) return
  if (vg) {
    vg.tradeRuns = (vg.tradeRuns ?? 0) + 1
    vg.prosperity = Math.min(100, (vg.prosperity ?? 35) + 0.15 + sold * 0.03)
    vg.development = (vg.development ?? 0) + 0.05
    tryFoundMarket(state, vg)
  }
  state.firmSellCount = (state.firmSellCount ?? 0) + 1
  if (firm.kind === 'trade' || sold >= 2 || (state.firmSellCount ?? 0) % 4 === 1) {
    logCause(
      state,
      `surplus de l'atelier ${firm.kind}`,
      vg ? `vente locale au village n°${vg.id}` : `vente locale (hors village)`,
    )
  }
}

/** Household spend of firm-crafted goods — clothing/medicine/fuel/luxury. */
function tryConsumeGoods(state: SimState, firm: BusinessRecord) {
  if (firm.failed) return
  if (state.tick % 36 !== firm.ownerId % 36) return
  const people = [firm.ownerId, ...firm.workerIds]
  for (const id of people) {
    const v = state.villagers.find((x) => x.id === id && x.alive)
    if (!v) continue
    const demand = demandFromVillager(v)
    // Injury / fatigue raise urgency so consume is causal, not calendar.
    if (typeof v.health === 'number' && v.health < 4.5) {
      demand.medicine = Math.max(demand.medicine, 0.55)
    }
    if (typeof v.stamina === 'number' && v.stamina < 2.2) {
      demand.fuel = Math.max(demand.fuel, 0.4)
    }
    demand.clothing = Math.max(demand.clothing, countOf(v.inventory, 'clothing') > 0 ? 0.42 : 0.36)
    const result = applyConsumeGoods(wrapInventory(v.inventory), demand)
    if (result.removed.length === 0) continue
    state.firmConsumeCount = (state.firmConsumeCount ?? 0) + 1
    if (result.warmed) v.health = Math.min(6, v.health + 0.05)
    if (result.healed) v.health = Math.min(6, v.health + 0.25)
    if (result.socialized) {
      const vg = v.villageId != null ? state.villages.find((x) => x.id === v.villageId) : null
      if (vg) vg.prosperity = Math.min(100, (vg.prosperity ?? 35) + 0.05)
    }
  }
}

/** Pull village surplus into firm bags so plaza sales clear real stock. */
function tryPullSurplusStock(state: SimState, firm: BusinessRecord, carrier: Villager) {
  if (carrier.villageId == null) return
  const vg = state.villages.find((x) => x.id === carrier.villageId)
  if (!vg?.surplus) return
  const want: ResourceType[] =
    firm.kind === 'mill' || firm.kind === 'bakery'
      ? ['bread', 'flour', 'cheese', 'ale', 'wood']
      : firm.kind === 'workshop'
        ? ['cloth', 'clothing', 'rope', 'linen', 'brick', 'wood', 'stone']
        : firm.kind === 'forge'
          ? ['bronze', 'mortar', 'brick', 'iron', 'copper', 'coal', 'stone']
          : firm.kind === 'trade'
            ? ['cloth', 'bread', 'rope', 'medicine', 'ale', 'wood', 'stone', 'wheat', 'food', 'fish', 'wool']
            : firm.kind === 'farm'
              ? ['cheese', 'wood', 'bread', 'flour', 'cloth', 'wheat', 'food', 'milk', 'wool', 'hide', 'game']
              : ['cloth', 'cheese', 'rope', 'medicine', 'wood', 'wheat', 'food']
  for (const res of want) {
    const sur = vg.surplus[res] ?? 0
    if (sur < 0.6) continue
    const qty = Math.min(4, Math.max(1, Math.floor(sur)))
    const left = addToInventory(carrier.inventory, res, qty)
    const got = qty - left
    if (got <= 0) continue
    vg.surplus[res] = Math.max(0, sur - got)
    bumpStockHint(firm, res, got)
  }
}

export function tickFirms(state: SimState) {
  discoverFirms(state)
  const bag = ensureBusinessBag(state)
  for (const firm of bag) {
    if (firm.failed) continue
    firm.workerIds = firm.workerIds.filter((id) => state.villagers.some((v) => v.id === id && v.alive))
    const owner = state.villagers.find((v) => v.id === firm.ownerId && v.alive)
    const worker =
      firm.workerIds
        .map((id) => state.villagers.find((v) => v.id === id && v.alive))
        .find((v) => v != null) ?? owner
    tryHire(state, firm)
    tryProduce(state, firm)
    // Sell pulse independent of craft — staggered for TPS (still mid-soak sells).
    if (owner && worker && state.tick % 18 === firm.ownerId % 18) {
      tryPullSurplusStock(state, firm, worker)
      trySellAtMarket(state, firm, owner, worker)
    }
    tryConsumeGoods(state, firm)
    tryFail(state, firm)
  }
  if (bag.length > 80) {
    state.economyBusinesses = bag
      .filter((b) => !b.failed)
      .slice(-60)
      .concat(bag.filter((b) => b.failed).slice(-20))
  }
}

export function firmsSummary(state: SimState): {
  firms: number
  hires: number
  failures: number
  produces: number
  sells: number
  consumes: number
} {
  const bag = ensureBusinessBag(state)
  return {
    firms: bag.filter((b) => !b.failed).length,
    hires: state.firmHireCount ?? 0,
    failures: state.firmFailCount ?? 0,
    produces: state.firmProduceCount ?? 0,
    sells: state.firmSellCount ?? 0,
    consumes: state.firmConsumeCount ?? 0,
  }
}
