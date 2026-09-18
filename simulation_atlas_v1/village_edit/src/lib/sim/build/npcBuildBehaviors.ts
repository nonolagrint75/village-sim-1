/**
 * Lot 3C — NPC construction helpers used by behaviors.ts.
 * Real queue/inventory mutations; no parallel economy.
 */
import { sampleTempC } from '../climate'
import { mindOf } from '../cognition/mindPool'
import { estimateWealth } from '../ecology'
import {
  addToInventory,
  countOf,
  removeFromInventory,
  type ResourceType,
} from '../inventory'
import { employerOffer, reservationWage, wageWouldClear } from '../economy/wages'
import type { SimState, TaskKind, Villager } from '../types'
import { distance, findNearbyTerrain, getTerrain } from '../world'
import { STONE, TREE } from '../types'
import { observeNeighborHomes } from './culture'
import {
  applyNextHomeBuildBlock,
  attachHomeBuild,
  ensureVillagerBuildQueue,
  finalizeHomeCompletion,
  formHomeBuild,
  type ApplyHomeBuildResult,
} from './homeBuildPipeline'
import type { HomePlannerBrief } from './homeContracts'
import { buildQueueRemaining } from './homeContracts'
import { footprintFromPlan, nextBuildBlock } from './tasks'
import { materialCost } from './chunks'
import {
  activateWorkOrder,
  cachedOpenBuildSites,
  completeWorkOrder,
  ensureOpenSiteOrder,
  failWorkOrder,
  findOpenOrderFor,
  findWorkOrder,
  reopenWorkOrder,
  reserveWorkOrder,
  scoreWorkOrderFor,
  syncWorkOrdersFromSites,
  type WorkOrder,
} from './workOrders'
import { abandonIncompleteHome } from './cleanup'
import { siteStillNeedsMaterials } from './collabContracts'
import { settleBuildHelp, settleHireAdvance } from './collab'
import {
  noteMaterialsMoved,
  noteWagePaid,
  noteWorkOrderFailed,
} from './emergenceMetrics'

export type CollabOption = {
  kind: TaskKind
  x: number
  y: number
  id: number | null
  resource: ResourceType | null
  score: number
  workOrderId: number | null
}

function briefFor(state: SimState, v: Villager, household: number): HomePlannerBrief {
  return {
    personality: v.personality,
    profession: v.profession,
    wealth: countOf(v.inventory, 'coin'),
    household,
    woodOnHand: countOf(v.inventory, 'wood'),
    stoneOnHand: countOf(v.inventory, 'stone'),
    buildSkill: mindOf(v).skills.build ?? 0.3,
    climate: {
      tempC: sampleTempC(state.climate, v.x, v.y),
      moisture: 0.45,
      stoneAccess: 0.4,
      timberAccess: 0.55,
      nearWater: false,
    },
    neighbors: observeNeighborHomes(state, v, 28),
    existing: v.house,
    mode: v.house && v.hasHome ? 'expand' : 'new',
    needFocus: v.hasHome ? ['prestige'] : ['shelter', 'sleep'],
    artisan: v.profession === 'mason' || v.profession === 'builder' || v.profession === 'blacksmith',
    merchant: v.profession === 'trader' || v.profession === 'farmer',
    stylePrior: null,
  }
}

/** After plot pick: attach progressive plan+queue (keeps existing plot coords). */
export function ensureProgressiveHomePlan(
  state: SimState,
  v: Villager,
  rng: () => number,
  household = 2,
): void {
  if (!v.house || v.homeX < 0) return
  if (v.buildQueue && v.buildQueue.length > 0 && v.homePlan) return
  if (v.house && !v.homePlan) {
    const home = formHomeBuild(briefFor(state, v, household), v.homeX, v.homeY, rng, {
      formedTick: state.tick,
      grid: state.grid,
    })
    // Keep chosen plot; swap design from planner onto villager.
    attachHomeBuild(v, home, v.homeX, v.homeY)
    return
  }
  ensureVillagerBuildQueue(v, rng, state.grid)
}

export function proposeCollabOptions(state: SimState, v: Villager): CollabOption[] {
  // Survival gate — construction must not override hunger.
  if (v.hunger < 1.6 || v.starveTimer > 2) return []
  syncWorkOrdersFromSites(state)
  const out: CollabOption[] = []
  const skillsBuild = mindOf(v).skills.build ?? 0.25
  const orders = state.workOrders ?? []

  for (const order of orders) {
    if (order.status !== 'open') continue
    if (order.siteOwnerId === v.id && order.kind !== 'hireBuilder') continue
    // hireBuilder is typically the owner; helpers take help/haul/tools
    if (order.kind === 'hireBuilder' && order.siteOwnerId !== v.id) continue
    if (order.kind !== 'hireBuilder' && order.siteOwnerId === v.id) continue

    const score = scoreWorkOrderFor(state, v, order, skillsBuild)
    if (score < 10) continue
    const taskKind = order.kind as TaskKind
    out.push({
      kind: taskKind,
      x: order.targetX,
      y: order.targetY,
      id: order.siteOwnerId,
      resource: order.resource,
      score,
      workOrderId: order.id,
    })
  }

  // Also surface sites as helpBuild if board empty but sites exist (bootstrap).
  if (out.length === 0) {
    const sites = cachedOpenBuildSites(state, v)
    for (const site of sites.slice(0, 3)) {
      if (site.helperCount >= site.maxHelpers) continue
      const next = site.next
      if (!next) continue
      const order =
        findOpenOrderFor(state, site.materialGap ? 'haulForBuild' : 'helpBuild', site.owner.id) ??
        null
      const kind: TaskKind = site.materialGap ? 'haulForBuild' : 'helpBuild'
      const distPen = site.dist * 1.05
      const bond = (v.relations.get(site.owner.id)?.affinity ?? 0) * 30
      const score =
        30 +
        skillsBuild * 35 +
        bond +
        (v.profession === 'builder' ? 25 : 0) +
        v.personality.generosity * 20 -
        distPen -
        (v.hunger < 2 ? 40 : 0)
      if (score < 12) continue
      out.push({
        kind,
        x: next.x,
        y: next.y,
        id: site.owner.id,
        resource: site.materialGap ? (site.needStone > 0 ? 'stone' : 'wood') : null,
        score,
        workOrderId: order?.id ?? null,
      })
    }
  }
  return out
}

export function tryReserveCollabTask(
  state: SimState,
  v: Villager,
  kind: TaskKind,
  siteOwnerId: number | null,
  workOrderId: number | null,
): number | null {
  if (!siteOwnerId) return null
  let order: WorkOrder | null = workOrderId != null ? findWorkOrder(state, workOrderId) : null
  if (!order) {
    order = findOpenOrderFor(state, kind as WorkOrder['kind'], siteOwnerId)
  }
  if (!order) return null
  if (!reserveWorkOrder(state, order, v)) return null
  return order.id
}

function ownerOf(state: SimState, id: number | null): Villager | null {
  if (id === null) return null
  return state.villagers.find((o) => o.id === id && o.alive) ?? null
}

function payHelper(state: SimState, owner: Villager, helper: Villager): boolean {
  const res = reservationWage(helper)
  const offer = employerOffer(0.8 + (mindOf(helper).skills.build ?? 0), estimateWealth(owner) * 0.05)
  if (!wageWouldClear(res, offer)) return false
  if (countOf(owner.inventory, 'coin') < 1) return false
  removeFromInventory(owner.inventory, 'coin', 1)
  addToInventory(helper.inventory, 'coin', 1)
  noteWagePaid(state, 1, owner.id, helper.id)
  return true
}

/** Soft-fail: put WO back on the board instead of burning a fail counter. */
function softAbandonOrder(wo: WorkOrder | null, reason: string): void {
  if (!wo) return
  if (wo.status === 'open' || wo.status === 'reserved' || wo.status === 'active') {
    reopenWorkOrder(wo, reason)
  }
}

/** Owner self-build via BuildQueue. Returns keepGoing like other execute cases. */
export function executeProgressiveBuildHouse(
  state: SimState,
  v: Villager,
  rng: () => number,
): boolean {
  ensureProgressiveHomePlan(state, v, rng)
  const queue = v.buildQueue
  if (!queue || queue.length === 0) return false
  const next = nextBuildBlock(queue, state.grid)
  if (!next) {
    // Shell complete / grid already satisfied — ownership + metrics via finalize only.
    const rem = buildQueueRemaining(queue)
    if (rem === 0) {
      finalizeHomeCompletion(state, v)
      return false
    }
    return false
  }
  if (v.task) {
    v.task.targetX = next.x
    v.task.targetY = next.y
  }
  if (distance(v.x, v.y, next.x, next.y) > 1.6) return true
  const r = applyNextHomeBuildBlock(state, v, { spendMaterials: true, mirrorBlocks: false })
  if (!r.ok) {
    if (r.reason === 'missing_wood' || r.reason === 'missing_stone') return false
    if (r.reason === 'out_of_bounds' || r.reason === 'place_failed') return false
    return false
  }
  const rem = buildQueueRemaining(v.buildQueue ?? [])
  if (rem === 0) {
    // applyNextHomeBuildBlock already finalizes on last place; idempotent note.
    finalizeHomeCompletion(state, v)
    return false
  }
  const n2 = nextBuildBlock(v.buildQueue ?? [], state.grid)
  if (n2 && v.task) {
    v.task.targetX = n2.x
    v.task.targetY = n2.y
    return true
  }
  return rem > 0
}

export function executeHelpBuild(state: SimState, v: Villager, rng: () => number): boolean {
  const task = v.task
  if (!task) return false
  const owner = ownerOf(state, task.targetId)
  if (!owner || !owner.buildQueue?.some((b) => !b.done)) {
    const wo = task.workOrderId != null ? findWorkOrder(state, task.workOrderId) : null
    if (wo) {
      failWorkOrder(wo, 'site_inactive')
      noteWorkOrderFailed(state, wo.kind, 'site_inactive')
    }
    return false
  }
  const wo = task.workOrderId != null ? findWorkOrder(state, task.workOrderId) : null
  if (wo) activateWorkOrder(state, wo)

  const next = nextBuildBlock(owner.buildQueue, state.grid)
  if (!next) {
    if (wo) completeWorkOrder(state, wo)
    return false
  }
  task.targetX = next.x
  task.targetY = next.y
  if (distance(v.x, v.y, next.x, next.y) > 1.6) return true

  const cost = materialCost(next)
  // Site stock = owner bag + chest (haul may be stored). Gate on owner, not helper bag.
  const ownWood = countOf(owner.inventory, 'wood') + (owner.chestInventory ? countOf(owner.chestInventory, 'wood') : 0)
  const ownStone = countOf(owner.inventory, 'stone') + (owner.chestInventory ? countOf(owner.chestInventory, 'stone') : 0)
  if ((cost.wood > 0 && ownWood < cost.wood) || (cost.stone > 0 && ownStone < cost.stone)) {
    softAbandonOrder(wo, 'helper_missing_materials')
    return false
  }

  if (rng() < 0.35 && v.toolTier === 'none') {
    // weak without tools — still can place slowly
  }

  const r: ApplyHomeBuildResult = applyNextHomeBuildBlock(state, v, {
    spendMaterials: true,
    mirrorBlocks: false,
    queueOwner: owner,
  })
  if (!r.ok) {
    if (wo) {
      failWorkOrder(wo, r.reason ?? 'place_failed')
      noteWorkOrderFailed(state, wo.kind, r.reason ?? 'place_failed')
    }
    return false
  }
  if (wo) {
    wo.lastProgressTick = state.tick
    wo.progress += 1
  }
  // Social + payment loop (relations / memory / favor) — collab.ts wired into live place.
  settleBuildHelp(state, v, owner, 'helpBuild', {
    buildSkill: mindOf(v).skills.build ?? 0,
  })
  const rem = buildQueueRemaining(owner.buildQueue)
  if (rem === 0) {
    finalizeHomeCompletion(state, owner)
    if (wo) completeWorkOrder(state, wo)
    return false
  }
  const n2 = nextBuildBlock(owner.buildQueue, state.grid)
  if (n2) {
    task.targetX = n2.x
    task.targetY = n2.y
    return true
  }
  return false
}

export function executeHaulForBuild(state: SimState, v: Villager, rng: () => number): boolean {
  void rng
  const task = v.task
  if (!task) return false
  const owner = ownerOf(state, task.targetId)
  if (!owner) {
    const wo = task.workOrderId != null ? findWorkOrder(state, task.workOrderId) : null
    if (wo) {
      failWorkOrder(wo, 'owner_gone')
      noteWorkOrderFailed(state, wo.kind, 'owner_gone')
    }
    return false
  }
  const res: ResourceType = task.resource === 'stone' ? 'stone' : 'wood'
  const wo = task.workOrderId != null ? findWorkOrder(state, task.workOrderId) : null
  if (wo) activateWorkOrder(state, wo)

  const carrying = countOf(v.inventory, res)
  if (carrying <= 0) {
    const code = res === 'stone' ? STONE : TREE
    const spot =
      findNearbyTerrain(state.grid, v.x, v.y, 36, code) ??
      findNearbyTerrain(state.grid, owner.homeX, owner.homeY, 48, code)
    if (!spot) {
      softAbandonOrder(wo, 'no_source_nearby')
      return false
    }
    task.targetX = spot.x
    task.targetY = spot.y
    if (distance(v.x, v.y, spot.x, spot.y) > 1.6) {
      if (wo) wo.step = 'travel_source'
      return true
    }
    const t = getTerrain(state.grid, spot.x, spot.y)
    if (t !== code) {
      softAbandonOrder(wo, 'source_mismatch')
      return false
    }
    const idx = spot.y * state.grid.width + spot.x
    const left = state.grid.amount[idx] ?? 0
    if (left <= 0) {
      softAbandonOrder(wo, 'source_empty')
      return false
    }
    // Real world pickup: take up to 2 from tile (not free wood — depletes grid.amount).
    const take = Math.min(2, left)
    state.grid.amount[idx] = left - take
    addToInventory(v.inventory, res, take)
    if (wo) {
      wo.step = 'collect'
      wo.lastProgressTick = state.tick
    }
    return true
  }

  // Deliver to site
  task.targetX = owner.homeX
  task.targetY = owner.homeY
  if (wo) wo.step = 'travel_site'
  if (distance(v.x, v.y, owner.homeX, owner.homeY) > 2.2) return true

  const amt = Math.min(4, countOf(v.inventory, res))
  if (amt <= 0) {
    softAbandonOrder(wo, 'empty_hands')
    return false
  }
  removeFromInventory(v.inventory, res, amt)
  // Overflow into chest when bag full — otherwise timber vanishes and rem stalls (woodGap≈rem).
  let left = addToInventory(owner.inventory, res, amt)
  if (left > 0 && owner.chestInventory) left = addToInventory(owner.chestInventory, res, left)
  if (left > 0) addToInventory(v.inventory, res, left)
  const delivered = amt - left
  if (delivered <= 0) {
    softAbandonOrder(wo, 'empty_hands')
    return false
  }
  noteMaterialsMoved(state, delivered, res, v.id, owner.id)
  if (wo) {
    wo.lastProgressTick = state.tick
    wo.progress += delivered
  }
  settleBuildHelp(state, v, owner, 'haulForBuild', {
    buildSkill: mindOf(v).skills.build ?? 0,
  })

  // Keep haul alive while the site still needs materials (Lot 3D: materialsMoved=0 + premature complete).
  if (siteStillNeedsMaterials(owner, state)) {
    if (wo) {
      wo.step = 'travel_source'
      wo.status = 'active'
    }
    return true
  }
  if (wo) completeWorkOrder(state, wo)
  return false
}

/**
 * Haul that can also gather: if empty-handed, return false so chooseTask can pick gatherWood.
 * When carrying, deliver. When gatherWood completes, player may re-pick haul.
 */
export function executeHaulForBuildWithGather(
  state: SimState,
  v: Villager,
  rng: () => number,
): boolean {
  const task = v.task
  if (!task) return false
  const res: ResourceType = task.resource === 'stone' ? 'stone' : 'wood'
  if (countOf(v.inventory, res) > 0) return executeHaulForBuild(state, v, rng)

  // Retarget: gather then we keep haul task by picking up after gather — use local chop.
  const code = res === 'stone' ? STONE : TREE
  const spot = findNearbyTerrain(state.grid, v.x, v.y, 40, code)
  if (!spot) {
    const wo = task.workOrderId != null ? findWorkOrder(state, task.workOrderId) : null
    softAbandonOrder(wo, 'no_material_source')
    return false
  }
  // Pivot task to gather* without losing work order link — behaviors gather cases don't know WO.
  // Instead: perform a micro-gather here using existing remove patterns from world amount.
  task.targetX = spot.x
  task.targetY = spot.y
  if (distance(v.x, v.y, spot.x, spot.y) > 1.6) return true

  // One unit from tile amount if present
  const idx = spot.y * state.grid.width + spot.x
  const amtArr = state.grid.amount
  if (amtArr && amtArr[idx]! > 0) {
    amtArr[idx]! -= 1
    addToInventory(v.inventory, res, 1)
    if (amtArr[idx]! <= 0) {
      // leave terrain code; gatherWood normally clears — keep simple
    }
    const wo = task.workOrderId != null ? findWorkOrder(state, task.workOrderId) : null
    if (wo) {
      wo.step = 'collect'
      wo.lastProgressTick = state.tick
    }
    return true // next tick deliver
  }
  // No amount left — cannot fabricate
  const wo = task.workOrderId != null ? findWorkOrder(state, task.workOrderId) : null
  softAbandonOrder(wo, 'source_empty')
  return false
}

export function executeHireBuilder(state: SimState, v: Villager, rng: () => number): boolean {
  void rng
  const task = v.task
  if (!task) return false
  // Owner hires: find best nearby builder and seed a reserved helpBuild for them.
  if (!isOwnerSite(v)) return false
  const wo = task.workOrderId != null ? findWorkOrder(state, task.workOrderId) : null
  if (wo) activateWorkOrder(state, wo)

  let best: Villager | null = null
  let bestScore = -1
  for (const o of state.villagers) {
    if (!o.alive || o.id === v.id) continue
    if (o.hunger < 1.7) continue
    if (o.task && (o.task.kind === 'flee' || o.task.kind === 'fight' || o.task.kind === 'eat')) continue
    const d = distance(v.x, v.y, o.x, o.y)
    if (d > 40) continue
    const build = mindOf(o).skills.build ?? 0
    const prof = o.profession === 'builder' || o.profession === 'mason' ? 1 : 0
    const rel = v.relations.get(o.id)
    const s = build * 50 + prof * 30 + (rel?.affinity ?? 0) * 20 + (rel?.respect ?? 0) * 15 - d
    const resW = reservationWage(o)
    const offer = employerOffer(0.7 + build, estimateWealth(v) * 0.08)
    if (!wageWouldClear(resW, offer) && countOf(v.inventory, 'coin') < 1) continue
    if (s > bestScore) {
      bestScore = s
      best = o
    }
  }
  if (!best) {
    softAbandonOrder(wo, 'no_hire_candidate')
    return false
  }
  // Retainer + social obligation (collab settleHireAdvance writes relations/debt).
  settleHireAdvance(state, v, best)
  noteWagePaid(state, 1, v.id, best.id)

  const needsMat = siteStillNeedsMaterials(v, state)
  const helpKind = needsMat ? 'haulForBuild' : 'helpBuild'
  const helpWo = ensureOpenSiteOrder(state, v, helpKind)
  if (!helpWo) {
    softAbandonOrder(wo, 'no_help_order')
    return false
  }
  reserveWorkOrder(state, helpWo, best)

  const next = nextBuildBlock(v.buildQueue ?? [], state.grid)
  const nextCost = next ? materialCost(next) : { wood: 1, stone: 0 }
  const resType: ResourceType | null = needsMat
    ? countOf(v.inventory, 'stone') < nextCost.stone
      ? 'stone'
      : 'wood'
    : null
  best.task = {
    kind: helpKind,
    targetX: next?.x ?? v.homeX,
    targetY: next?.y ?? v.homeY,
    targetId: v.id,
    resource: resType,
    stuckTicks: 0,
    ageTicks: 0,
    work: 0,
    path: null,
    pathI: 0,
    pathTx: next?.x ?? v.homeX,
    pathTy: next?.y ?? v.homeY,
    pathTick: -999,
    workOrderId: helpWo.id,
  }
  if (wo) completeWorkOrder(state, wo)
  return false
}

function isOwnerSite(v: Villager): boolean {
  return !!v.house && v.homeX >= 0 && (!v.hasHome || v.homeOwnerId === v.id) && !!v.buildQueue?.some((b) => !b.done)
}

export function executeAssistCraftTools(state: SimState, v: Villager, rng: () => number): boolean {
  void rng
  const task = v.task
  if (!task) return false
  const owner = ownerOf(state, task.targetId) ?? v
  const wo = task.workOrderId != null ? findWorkOrder(state, task.workOrderId) : null
  if (owner.toolTier !== 'none') {
    if (wo) completeWorkOrder(state, wo)
    return false // tools already ok
  }
  if (wo) activateWorkOrder(state, wo)

  const craftX = owner.hasWorkbench ? owner.workbenchX : owner.x
  const craftY = owner.hasWorkbench ? owner.workbenchY : owner.y
  task.targetX = craftX
  task.targetY = craftY
  if (distance(v.x, v.y, craftX, craftY) > 1.6) {
    if (wo) wo.step = 'travel_craft'
    return true
  }

  // Need wood for spear — no free tools
  if (countOf(v.inventory, 'wood') < 2 && countOf(owner.inventory, 'wood') < 2) {
    softAbandonOrder(wo, 'no_wood_for_tools')
    return false
  }
  const payer = countOf(v.inventory, 'wood') >= 2 ? v : owner
  removeFromInventory(payer.inventory, 'wood', 2)
  // Equip wood tool on owner (construction site needs)
  owner.toolTier = 'wood'
  owner.toolWear = 0
  if (wo) {
    wo.lastProgressTick = state.tick
    completeWorkOrder(state, wo)
  }
  return false
}

export function cleanupDeadBuilder(state: SimState, v: Villager): void {
  if (!v.hasHome) abandonIncompleteHome(state, v)
}
