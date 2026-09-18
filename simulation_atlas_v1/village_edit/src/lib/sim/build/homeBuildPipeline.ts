/**
 * Lot 3B — progressive home build: plan → queue → place BuildBlock.
 * Extends canon without replacing BuildProject / construction.ts civic path.
 * Materials use existing inventory wood/stone only (no Phase 7 economy).
 */
import type { HouseDesign } from '../architecture'
import { findFamily } from '../family'
import { countOf, removeFromInventory, type ResourceType } from '../inventory'
import type { SimState, Villager, WorldGrid } from '../types'
import { inBounds } from '../world'
import {
  buildQueueRemaining,
  type HomeBuildState,
  type HomePlannerBrief,
  type SpatialHomePlan,
} from './homeContracts'
import { ensureBlockWorld } from './stateBridge'
import { planHomeSpatial } from './planner'
import {
  emitBuildQueue,
  footprintFromPlan,
  markBlockDone,
  nextBuildBlock,
  rebuildQueueFromDesign,
  structuralBlocksRemaining,
} from './tasks'
import { materialCost, placeBuildBlock } from './chunks'
import { noteBlockBuilt, noteHomeCompleted, noteHomeStarted } from './emergenceMetrics'

export type ApplyHomeBuildOpts = {
  /** Deduct wood/stone from villager inventory (default true). */
  spendMaterials?: boolean
  /** Lazily create/mirror state.blocks only when placing (default false). */
  mirrorBlocks?: boolean
  /** Queue/plan owner when builder is a helper (defaults to spender). */
  queueOwner?: Villager
}

export type ApplyHomeBuildResult = {
  ok: boolean
  reason?:
    | 'no_queue'
    | 'queue_complete'
    | 'out_of_bounds'
    | 'missing_wood'
    | 'missing_stone'
    | 'place_failed'
    | 'already_done'
  block?: HomeBuildState['queue'][number]
  remaining: number
  doneCount: number
}

function doneCount(queue: HomeBuildState['queue']): number {
  let n = 0
  for (const b of queue) if (b.done) n++
  return n
}

/** Legacy HouseDesign → SpatialHomePlan with Lot 3A defaults. */
export function spatialPlanFromLegacyHouse(design: HouseDesign): SpatialHomePlan {
  return {
    design,
    doorSide: design.doorSide ?? 'S',
    wallMaterial: design.wallMaterial ?? 'wood',
    floorMaterial: design.floorMaterial ?? 'plank',
    windowCount: 0,
    reasons: ['legacy'],
    mode: 'new',
    cultureTags: [],
  }
}

/**
 * Planner → HomeBuildState (queue of real BuildBlocks).
 * Does not allocate block world.
 */
export function formHomeBuild(
  brief: HomePlannerBrief,
  cx: number,
  cy: number,
  rng: () => number,
  opts?: { onlyMissing?: boolean; grid?: WorldGrid; formedTick?: number },
): HomeBuildState {
  const plan = planHomeSpatial(brief, rng)
  const queue = emitBuildQueue(plan, cx, cy, rng, {
    onlyMissing: opts?.onlyMissing,
    grid: opts?.grid,
  })
  return {
    plan,
    queue,
    formedTick: opts?.formedTick ?? 0,
  }
}

/** Attach plan+queue to villager; syncs house design + plot coords. */
export function attachHomeBuild(
  v: Villager,
  home: HomeBuildState,
  cx: number,
  cy: number,
): void {
  v.homePlan = home.plan
  v.buildQueue = home.queue
  v.house = home.plan.design
  v.homeX = cx
  v.homeY = cy
}

/**
 * Repair / migrate: emit queue from existing house (legacy-safe defaults).
 * Does not create block world.
 */
export function ensureVillagerBuildQueue(
  v: Villager,
  rng: () => number,
  grid?: WorldGrid,
): HomeBuildState['queue'] {
  if (v.buildQueue && v.buildQueue.length > 0) return v.buildQueue
  if (!v.house || v.homeX < 0) {
    v.buildQueue = []
    return v.buildQueue
  }
  if (v.homePlan) {
    v.buildQueue = emitBuildQueue(v.homePlan, v.homeX, v.homeY, rng, {
      onlyMissing: true,
      grid,
    })
  } else {
    v.buildQueue = rebuildQueueFromDesign(v.house, v.homeX, v.homeY, rng, grid)
    v.homePlan = spatialPlanFromLegacyHouse(v.house)
  }
  return v.buildQueue
}

function stockOf(v: Villager, type: ResourceType): number {
  return countOf(v.inventory, type) + (v.chestInventory ? countOf(v.chestInventory, type) : 0)
}

/** Spend site materials from bag first, then household chest (haul→storeChest was stranding timber). */
function trySpend(
  v: Villager,
  wood: number,
  stone: number,
): 'ok' | 'missing_wood' | 'missing_stone' {
  if (wood > 0 && stockOf(v, 'wood') < wood) return 'missing_wood'
  if (stone > 0 && stockOf(v, 'stone') < stone) return 'missing_stone'
  const pull = (type: ResourceType, amount: number) => {
    if (amount <= 0) return
    const fromBag = Math.min(amount, countOf(v.inventory, type))
    if (fromBag > 0) removeFromInventory(v.inventory, type, fromBag)
    const rest = amount - fromBag
    if (rest > 0 && v.chestInventory) removeFromInventory(v.chestInventory, type, rest)
  }
  pull('wood', wood)
  pull('stone', stone)
  return 'ok'
}

/**
 * Mark ownership when the exterior shell is livable (walls + door), matching shellClosed /
 * structuralBlocksRemaining — floors/windows/partitions may continue after hasHome.
 * Full rem=0 still clears the drained queue. Syncs family seats.
 */
export function finalizeHomeCompletion(state: SimState, owner: Villager): boolean {
  const queue = owner.buildQueue
  const rem = queue && queue.length > 0 ? buildQueueRemaining(queue) : 0
  const shellOk =
    !!queue &&
    queue.length > 0 &&
    structuralBlocksRemaining(queue) === 0 &&
    !queue.some((b) => b.kind === 'door' && !b.done)
  // Need either a closed shell or a fully drained queue.
  if (queue && queue.length > 0 && rem > 0 && !shellOk) return false

  const wasNew = !owner.hasHome
  owner.hasHome = true
  owner.homeOwnerId = owner.id

  const fam = findFamily(state, owner.familyId)
  if (fam) fam.homeOwnerId = owner.id

  const seat = (m: Villager) => {
    if (m.id === owner.id) return
    // Do not steal a nest owned by someone else.
    if (m.hasHome && m.homeOwnerId !== null && m.homeOwnerId !== owner.id) return
    m.hasHome = true
    m.homeOwnerId = owner.id
    if (owner.homeX >= 0) {
      m.homeX = owner.homeX
      m.homeY = owner.homeY
    }
  }

  if (owner.spouseId !== null) {
    const spouse = state.villagers.find((o) => o.id === owner.spouseId && o.alive)
    if (spouse) seat(spouse)
  }
  if (fam) {
    for (const id of fam.memberIds) {
      const m = state.villagers.find((o) => o.id === id && o.alive)
      if (m) seat(m)
    }
  }

  if (wasNew) {
    noteHomeCompleted(state, owner.id)
  }
  // Only clear when fully drained — keep floor/window jobs after shell close.
  if (rem === 0 && queue && queue.length > 0) owner.buildQueue = []
  return wasNew
}

/**
 * Execute one unfinished BuildBlock onto terrain (+ optional blocks mirror).
 * Deterministic: same next block until marked done / placed.
 */
export function applyNextHomeBuildBlock(
  state: SimState,
  v: Villager,
  opts: ApplyHomeBuildOpts = {},
): ApplyHomeBuildResult {
  const owner = opts.queueOwner ?? v
  const queue = owner.buildQueue
  if (!queue || queue.length === 0) {
    return { ok: false, reason: 'no_queue', remaining: 0, doneCount: 0 }
  }
  const remaining0 = buildQueueRemaining(queue)
  const done0 = doneCount(queue)
  const next = nextBuildBlock(queue, state.grid)
  if (!next) {
    // Queue drained (placed or already satisfied on grid) — still finalize ownership.
    if (buildQueueRemaining(queue) === 0) {
      finalizeHomeCompletion(state, owner)
    }
    return {
      ok: false,
      reason: 'queue_complete',
      remaining: 0,
      doneCount: doneCount(queue),
    }
  }
  if (!inBounds(state.grid, next.x, next.y)) {
    return {
      ok: false,
      reason: 'out_of_bounds',
      block: next,
      remaining: remaining0,
      doneCount: done0,
    }
  }
  if (next.done) {
    return {
      ok: false,
      reason: 'already_done',
      block: next,
      remaining: remaining0,
      doneCount: done0,
    }
  }

  const spend = opts.spendMaterials !== false
  if (spend) {
    const cost = materialCost(next)
    const spent = trySpend(opts.queueOwner ?? v, cost.wood, cost.stone)
    if (spent !== 'ok') {
      return {
        ok: false,
        reason: spent,
        block: next,
        remaining: remaining0,
        doneCount: done0,
      }
    }
  }

  // Block world only when explicitly mirroring — never on every tick.
  const blocks =
    opts.mirrorBlocks === true
      ? ensureBlockWorld(state, { syncFromTerrain: false })
      : (state.blocks ?? null)

  const placed = placeBuildBlock(state.grid, next, blocks)
  if (!placed) {
    return {
      ok: false,
      reason: 'place_failed',
      block: next,
      remaining: remaining0,
      doneCount: done0,
    }
  }

  markBlockDone(queue, next.x, next.y, next.kind)
  const rem = buildQueueRemaining(queue)
  // First real place on this queue → homeStart (covers sites that never hit planHouse metric).
  if (done0 === 0) noteHomeStarted(state, owner.id)
  noteBlockBuilt(state, next.x, next.y, v.id, owner.id)
  // Shell close is livable (legacy stampHouse path); full rem=0 also finalizes/clears.
  if (rem === 0 || (structuralBlocksRemaining(queue) === 0 && !queue.some((b) => b.kind === 'door' && !b.done))) {
    finalizeHomeCompletion(state, owner)
  }
  return {
    ok: true,
    block: next,
    remaining: rem,
    doneCount: doneCount(queue),
  }
}

/** Footprint coherent with current plan (doorSide applied). */
export function villagerPlanFootprint(v: Villager) {
  if (v.homePlan && v.homeX >= 0) return footprintFromPlan(v.homePlan, v.homeX, v.homeY)
  return null
}

/**
 * Economy Phase 7 hook (Lot 3C+): map BuildMaterial → deposit / wage.
 * Currently inventory wood/stone only — do not invent a parallel economy here.
 */
export const MATERIAL_INVENTORY_HOOK = {
  wood: 'wood' as const,
  stone: 'stone' as const,
  timber: 'wood' as const,
  plank: 'wood' as const,
  dirt: null,
  none: null,
} as const
