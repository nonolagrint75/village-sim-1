/**
 * Lot 3C — extensible work-order board for construction collab (and future jobs).
 * Extends villager Task; does not replace chooseTask / pickTaskByPolicy.
 */
import type { ResourceType } from '../inventory'
import type { SimState, TaskKind, Villager } from '../types'
import { countOf } from '../inventory'
import { abandonIncompleteHome, clearDeadBuilderShell } from './cleanup'
import {
  COLLAB_SITE_RADIUS,
  countActiveHelpers,
  isActiveHomeSite,
  listOpenBuildSites,
  siteMaxHelpers,
  type OpenBuildSite,
} from './collabContracts'
import { materialCost } from './chunks'
import { nextBuildBlock } from './tasks'
import { estimateWealth } from '../ecology'
import { distance } from '../world'
import {
  noteWorkOrderCancelled,
  noteWorkOrderCompleted,
  noteWorkOrderCreated,
  noteWorkOrderExpired,
  noteWorkOrderFailed,
} from './emergenceMetrics'

export type WorkOrderKind =
  | 'helpBuild'
  | 'haulForBuild'
  | 'hireBuilder'
  | 'assistCraftTools'
  /** Reserved for later lots — not emitted in 3C. */
  | 'farm'
  | 'harvest'
  | 'hunt'
  | 'mine'
  | 'craft'
  | 'trade'
  | 'build'
  | 'repair'
  | 'haul'
  | 'social'

export type WorkOrderStatus = 'open' | 'reserved' | 'active' | 'completed' | 'failed' | 'cancelled'

export type WorkOrderStep =
  | 'idle'
  | 'travel_source'
  | 'collect'
  | 'travel_site'
  | 'deliver'
  | 'travel_craft'
  | 'craft'
  | 'verify_block'
  | 'build'
  | 'hire_search'
  | 'done'

export interface WorkOrder {
  id: number
  kind: WorkOrderKind
  status: WorkOrderStatus
  siteOwnerId: number
  assigneeId: number | null
  createdTick: number
  reservedUntil: number
  lastProgressTick: number
  priority: number
  targetX: number
  targetY: number
  /** Source cell for haul (wood pile / tree area proxy). */
  sourceX: number
  sourceY: number
  resource: ResourceType | null
  step: WorkOrderStep
  progress: number
  failReason?: string
}

/** Soft reservation window — short TTL + task-switch churn was the Lot 3D expire spike. */
const RESERVE_TTL = 420
const STALL_TICKS = 2400
const BOARD_CAP = 96
const SYNC_PERIOD = 30

/** Assignee still bound to this order via task link (survives rest/eat interrupt windows). */
function assigneeCommittedToOrder(state: SimState, order: WorkOrder): boolean {
  if (order.assigneeId == null) return false
  const a = state.villagers.find((v) => v.id === order.assigneeId)
  if (!a || !a.alive || !a.task) return false
  if (a.task.workOrderId === order.id) return true
  const k = a.task.kind
  if (
    (k === 'helpBuild' || k === 'haulForBuild' || k === 'assistCraftTools' || k === 'hireBuilder') &&
    a.task.targetId === order.siteOwnerId &&
    order.kind === k
  ) {
    return true
  }
  return false
}

let sitesCacheTick = -1
let sitesCache: OpenBuildSite[] = []
let sitesCacheState: SimState | null = null

export function workOrderKindToTask(kind: WorkOrderKind): TaskKind | null {
  if (
    kind === 'helpBuild' ||
    kind === 'haulForBuild' ||
    kind === 'hireBuilder' ||
    kind === 'assistCraftTools'
  ) {
    return kind
  }
  return null
}

export function ensureWorkOrders(state: SimState): WorkOrder[] {
  if (!state.workOrders) state.workOrders = []
  if (typeof state.nextWorkOrderId !== 'number') state.nextWorkOrderId = 1
  return state.workOrders
}

/** Once-per-tick open-site snapshot (no per-NPC full scan). */
export function cachedOpenBuildSites(state: SimState, helper: Villager, maxDist = COLLAB_SITE_RADIUS): OpenBuildSite[] {
  if (sitesCacheState !== state || sitesCacheTick !== state.tick) {
    sitesCacheState = state
    sitesCacheTick = state.tick
    // Rebuild from a neutral helper at origin — listOpenBuildSites filters by helper; use wide scan then filter.
    sitesCache = rebuildGlobalSites(state)
  }
  const out: OpenBuildSite[] = []
  for (const s of sitesCache) {
    if (s.owner.id === helper.id) continue
    const dist = distance(helper.x, helper.y, s.owner.homeX, s.owner.homeY)
    if (dist > maxDist) continue
    out.push({ ...s, dist })
  }
  out.sort((a, b) => a.dist - b.dist)
  return out
}

function rebuildGlobalSites(state: SimState): OpenBuildSite[] {
  const out: OpenBuildSite[] = []
  for (const owner of state.villagers) {
    if (!isActiveHomeSite(owner)) continue
    if (owner.hunger < 0.85) continue
    if (owner.starveTimer > 8) continue
    const next = nextBuildBlock(owner.buildQueue ?? [], state.grid)
    const cost = next ? materialCost(next) : { wood: 1, stone: 0 }
    const wealth = estimateWealth(owner)
    const helperCount = countActiveHelpers(state, owner.id)
    const maxHelpers = siteMaxHelpers(wealth)
    const ownWood = countOf(owner.inventory, 'wood')
    const ownStone = countOf(owner.inventory, 'stone')
    const materialGap =
      next != null && ((cost.wood > 0 && ownWood < cost.wood) || (cost.stone > 0 && ownStone < cost.stone))
    out.push({
      owner,
      next,
      needWood: cost.wood,
      needStone: cost.stone,
      wealth,
      helperCount,
      maxHelpers,
      dist: 0,
      materialGap,
      canHire: wealth >= 14 && helperCount < maxHelpers,
    })
  }
  return out
}

function hasOpenKind(orders: WorkOrder[], ownerId: number, kind: WorkOrderKind): boolean {
  return orders.some(
    (o) =>
      o.siteOwnerId === ownerId &&
      o.kind === kind &&
      (o.status === 'open' || o.status === 'reserved' || o.status === 'active'),
  )
}

function pushOrder(state: SimState, partial: Omit<WorkOrder, 'id'>): WorkOrder {
  const orders = ensureWorkOrders(state)
  const id = state.nextWorkOrderId!++
  const order: WorkOrder = { id, ...partial }
  orders.push(order)
  noteWorkOrderCreated(state, order.kind, order.siteOwnerId)
  if (orders.length > BOARD_CAP) {
    state.workOrders = orders.filter((o) => o.status === 'open' || o.status === 'reserved' || o.status === 'active').slice(-BOARD_CAP)
  }
  return order
}

/** Emit at most one help / haul / hire / tools order per active site when needed. */
export function syncWorkOrdersFromSites(state: SimState): void {
  if (state.tick % SYNC_PERIOD !== 0) return
  const orders = ensureWorkOrders(state)
  const sites = rebuildGlobalSites(state)
  sitesCache = sites
  sitesCacheTick = state.tick
  sitesCacheState = state

  for (const site of sites) {
    const owner = site.owner
    if (site.helperCount >= site.maxHelpers) continue
    const next = site.next
    if (!next) continue

    if (site.materialGap) {
      const needStone = site.needStone > 0 && countOf(owner.inventory, 'stone') < site.needStone
      const res: ResourceType = needStone ? 'stone' : 'wood'
      if (!hasOpenKind(orders, owner.id, 'haulForBuild')) {
        pushOrder(state, {
          kind: 'haulForBuild',
          status: 'open',
          siteOwnerId: owner.id,
          assigneeId: null,
          createdTick: state.tick,
          reservedUntil: 0,
          lastProgressTick: state.tick,
          priority: 40 + site.needWood + site.needStone * 2,
          targetX: owner.homeX,
          targetY: owner.homeY,
          sourceX: owner.homeX,
          sourceY: owner.homeY,
          resource: res,
          step: 'travel_source',
          progress: 0,
        })
      }
    } else if (!hasOpenKind(orders, owner.id, 'helpBuild')) {
      pushOrder(state, {
        kind: 'helpBuild',
        status: 'open',
        siteOwnerId: owner.id,
        assigneeId: null,
        createdTick: state.tick,
        reservedUntil: 0,
        lastProgressTick: state.tick,
        priority: 35 + (site.canHire ? 10 : 0),
        targetX: next.x,
        targetY: next.y,
        sourceX: next.x,
        sourceY: next.y,
        resource: null,
        step: 'travel_site',
        progress: 0,
      })
    }

    if (site.canHire && !hasOpenKind(orders, owner.id, 'hireBuilder')) {
      pushOrder(state, {
        kind: 'hireBuilder',
        status: 'open',
        siteOwnerId: owner.id,
        assigneeId: null,
        createdTick: state.tick,
        reservedUntil: 0,
        lastProgressTick: state.tick,
        priority: 28,
        targetX: owner.homeX,
        targetY: owner.homeY,
        sourceX: owner.homeX,
        sourceY: owner.homeY,
        resource: 'coin',
        step: 'hire_search',
        progress: 0,
      })
    }

    if (owner.toolTier === 'none' && !hasOpenKind(orders, owner.id, 'assistCraftTools')) {
      pushOrder(state, {
        kind: 'assistCraftTools',
        status: 'open',
        siteOwnerId: owner.id,
        assigneeId: null,
        createdTick: state.tick,
        reservedUntil: 0,
        lastProgressTick: state.tick,
        priority: 32,
        targetX: owner.hasWorkbench ? owner.workbenchX : owner.homeX,
        targetY: owner.hasWorkbench ? owner.workbenchY : owner.homeY,
        sourceX: owner.homeX,
        sourceY: owner.homeY,
        resource: 'wood',
        step: 'travel_craft',
        progress: 0,
      })
    }
  }
}

export function findWorkOrder(state: SimState, id: number): WorkOrder | null {
  const orders = state.workOrders
  if (!orders) return null
  return orders.find((o) => o.id === id) ?? null
}

export function findOpenOrderFor(
  state: SimState,
  kind: WorkOrderKind,
  siteOwnerId: number,
): WorkOrder | null {
  const orders = state.workOrders
  if (!orders) return null
  return (
    orders.find(
      (o) =>
        o.kind === kind &&
        o.siteOwnerId === siteOwnerId &&
        (o.status === 'open' || (o.status === 'reserved' && o.assigneeId === null)),
    ) ?? null
  )
}

export function reserveWorkOrder(state: SimState, order: WorkOrder, assignee: Villager): boolean {
  if (order.status !== 'open' && !(order.status === 'reserved' && order.assigneeId === assignee.id)) {
    return false
  }
  if (order.assigneeId !== null && order.assigneeId !== assignee.id) return false
  order.status = 'reserved'
  order.assigneeId = assignee.id
  order.reservedUntil = state.tick + RESERVE_TTL
  order.lastProgressTick = state.tick
  return true
}

export function activateWorkOrder(state: SimState, order: WorkOrder): void {
  if (order.status === 'reserved' || order.status === 'open') {
    order.status = 'active'
    order.lastProgressTick = state.tick
  }
}

export function completeWorkOrder(state: SimState, order: WorkOrder): void {
  if (order.status === 'completed') return
  order.status = 'completed'
  order.step = 'done'
  const ownerId = order.siteOwnerId
  order.assigneeId = null
  noteWorkOrderCompleted(state, order.kind, ownerId)
}

export function failWorkOrder(order: WorkOrder, reason: string): void {
  order.status = 'failed'
  order.failReason = reason
  order.assigneeId = null
}

export function cancelWorkOrder(order: WorkOrder, reason: string): void {
  order.status = 'cancelled'
  order.failReason = reason
  order.assigneeId = null
}

/** Soft abort: return board slot to open without burning a fail/cancel counter. */
export function reopenWorkOrder(order: WorkOrder, reason?: string): void {
  if (order.status === 'completed' || order.status === 'failed' || order.status === 'cancelled') return
  order.status = 'open'
  order.assigneeId = null
  order.reservedUntil = 0
  if (reason) order.failReason = reason
  order.step =
    order.kind === 'haulForBuild'
      ? 'travel_source'
      : order.kind === 'assistCraftTools'
        ? 'travel_craft'
        : order.kind === 'hireBuilder'
          ? 'hire_search'
          : 'travel_site'
}

export function releaseAssigneeOrders(state: SimState, villagerId: number): void {
  const orders = state.workOrders
  if (!orders) return
  for (const o of orders) {
    if (o.assigneeId !== villagerId) continue
    if (o.status === 'reserved' || o.status === 'active') {
      reopenWorkOrder(o, 'assignee_released')
    }
  }
}

/** Ensure an open help/haul order exists for a site (hire handoff). */
export function ensureOpenSiteOrder(
  state: SimState,
  owner: Villager,
  kind: 'helpBuild' | 'haulForBuild',
): WorkOrder | null {
  const existing = findOpenOrderFor(state, kind, owner.id)
  if (existing) return existing
  if (!isActiveHomeSite(owner)) return null
  const next = nextBuildBlock(owner.buildQueue ?? [], state.grid)
  if (!next && kind === 'helpBuild') return null
  const cost = next ? materialCost(next) : { wood: 1, stone: 0 }
  if (kind === 'haulForBuild') {
    const needStone = cost.stone > 0 && countOf(owner.inventory, 'stone') < cost.stone
    const res: ResourceType = needStone ? 'stone' : 'wood'
    return pushOrder(state, {
      kind: 'haulForBuild',
      status: 'open',
      siteOwnerId: owner.id,
      assigneeId: null,
      createdTick: state.tick,
      reservedUntil: 0,
      lastProgressTick: state.tick,
      priority: 40 + cost.wood + cost.stone * 2,
      targetX: owner.homeX,
      targetY: owner.homeY,
      sourceX: owner.homeX,
      sourceY: owner.homeY,
      resource: res,
      step: 'travel_source',
      progress: 0,
    })
  }
  return pushOrder(state, {
    kind: 'helpBuild',
    status: 'open',
    siteOwnerId: owner.id,
    assigneeId: null,
    createdTick: state.tick,
    reservedUntil: 0,
    lastProgressTick: state.tick,
    priority: 45,
    targetX: next!.x,
    targetY: next!.y,
    sourceX: next!.x,
    sourceY: next!.y,
    resource: null,
    step: 'travel_site',
    progress: 0,
  })
}

/** Periodic: expire reservations, stall, dead owners, finished queues. */
export function tickWorkOrders(state: SimState): void {
  syncWorkOrdersFromSites(state)
  const orders = ensureWorkOrders(state)
  for (const o of orders) {
    if (o.status === 'completed' || o.status === 'failed' || o.status === 'cancelled') continue
    const owner = state.villagers.find((v) => v.id === o.siteOwnerId)
    if (!owner || !owner.alive) {
      { cancelWorkOrder(o, 'owner_dead'); noteWorkOrderCancelled(state, o.kind, 'owner_dead') }
      continue
    }
    if (!isActiveHomeSite(owner) && o.kind !== 'hireBuilder') {
      // Finished or wiped
      if (owner.hasHome) {
        completeWorkOrder(state, o)
      } else {
        cancelWorkOrder(o, 'site_gone')
        noteWorkOrderCancelled(state, o.kind, 'site_gone')
      }
      continue
    }
    if (o.status === 'reserved' && state.tick > o.reservedUntil) {
      // Fragile-reservation fix: do not churn-expire while assignee still on this job.
      if (assigneeCommittedToOrder(state, o)) {
        o.reservedUntil = state.tick + RESERVE_TTL
        continue
      }
      reopenWorkOrder(o, 'reserve_expired')
      noteWorkOrderExpired(state, o.kind)
      continue
    }
    if (
      (o.status === 'reserved' || o.status === 'active') &&
      o.assigneeId !== null
    ) {
      const a = state.villagers.find((v) => v.id === o.assigneeId)
      if (!a || !a.alive) {
        reopenWorkOrder(o, 'assignee_dead')
        continue
      }
      // Refresh TTL while actively progressing.
      if (o.status === 'active' && assigneeCommittedToOrder(state, o)) {
        o.reservedUntil = Math.max(o.reservedUntil, state.tick + RESERVE_TTL)
      }
      if (state.tick - o.lastProgressTick > STALL_TICKS) {
        failWorkOrder(o, 'stalled')
        noteWorkOrderFailed(state, o.kind, 'stalled')
        if (a.task && a.task.targetId === o.siteOwnerId) a.task = null
      }
    }
  }
  // Prune terminal orders occasionally
  if (state.tick % 120 === 0 && orders.length > 48) {
    state.workOrders = orders.filter(
      (o) => o.status === 'open' || o.status === 'reserved' || o.status === 'active',
    ).concat(orders.filter((o) => o.status === 'completed' || o.status === 'failed' || o.status === 'cancelled').slice(-16))
  }
}

export function onBuilderDeathCleanup(state: SimState, v: Villager): void {
  releaseAssigneeOrders(state, v.id)
  if (!v.hasHome) clearDeadBuilderShell(state, v)
  else if (!v.alive) {
    // owner death with unfinished shell handled by clearDead if never closed
    void abandonIncompleteHome
  }
}

/** Score a work order for a candidate NPC (uses existing personality / skills / relations). */
export function scoreWorkOrderFor(
  state: SimState,
  v: Villager,
  order: WorkOrder,
  skillsBuild: number,
): number {
  const owner = state.villagers.find((o) => o.id === order.siteOwnerId && o.alive)
  if (!owner) return -1
  const dist = distance(v.x, v.y, order.targetX, order.targetY)
  const rel = v.relations.get(owner.id)
  const bond = (rel?.affinity ?? 0) + (rel?.kinship ?? 0) * 0.8
  const prof =
    v.profession === 'builder' || v.profession === 'mason'
      ? 28
      : v.profession === 'lumberjack' && order.kind === 'haulForBuild'
        ? 18
        : v.profession === 'blacksmith' && order.kind === 'assistCraftTools'
          ? 22
          : 0
  const pay =
    order.kind === 'hireBuilder' || order.resource === 'coin'
      ? Math.min(20, countOf(owner.inventory, 'coin') * 2)
      : 0
  const hungerPenalty = v.hunger < 1.8 ? 80 : v.hunger < 2.2 ? 28 : 0
  const urge = order.priority + prof + skillsBuild * 40 + bond * 35 + pay + v.personality.generosity * 15
  return urge - dist * 1.05 - hungerPenalty
}

export { listOpenBuildSites }