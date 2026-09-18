/**
 * Lot 3B — collab *interfaces* only for helpBuild / haulForBuild.
 * No NPC decision wiring (Lot 3C). behaviors.ts must not import apply helpers yet.
 */
import { estimateWealth } from '../ecology'
import { countOf } from '../inventory'
import type { SimState, Villager } from '../types'
import { distance } from '../world'
import { materialCost } from './chunks'
import { nextBuildBlock, structuralBlocksRemaining } from './tasks'
import type { BuildBlock } from './homeContracts'

export const COLLAB_SITE_RADIUS = 48
export const MAX_HELPERS_POOR = 1
export const MAX_HELPERS_MID = 2
export const MAX_HELPERS_RICH = 4
export const WEALTH_POOR = 4
export const WEALTH_RICH = 14

/** Churn taxonomy (audit / failReason strings) — soft reopen vs terminal. */
export const WO_SOFT_REOPEN_REASONS = [
  'helper_missing_materials',
  'no_source_nearby',
  'source_mismatch',
  'source_empty',
  'empty_hands',
  'no_material_source',
  'no_hire_candidate',
  'no_help_order',
  'no_wood_for_tools',
  'assignee_released',
  'assignee_dead',
  'reserve_expired',
] as const

export const WO_TERMINAL_FAIL_REASONS = [
  'stalled',
  'site_inactive',
  'owner_gone',
  'place_failed',
  'missing_wood',
  'missing_stone',
  'out_of_bounds',
] as const

export type CollabPayKind = 'coin' | 'food' | 'favor' | 'none'

export interface OpenBuildSite {
  owner: Villager
  next: BuildBlock | null
  needWood: number
  needStone: number
  wealth: number
  helperCount: number
  maxHelpers: number
  dist: number
  materialGap: boolean
  canHire: boolean
}

export function isActiveHomeSite(owner: Villager): boolean {
  if (!owner.alive) return false
  if (owner.homeX < 0 || !owner.house) return false
  if (owner.hasHome && owner.homeOwnerId !== owner.id) return false
  const q = owner.buildQueue
  if (!q || q.length === 0) return false
  return q.some((b) => !b.done)
}

function ownerMatStock(owner: Villager, type: 'wood' | 'stone'): number {
  return countOf(owner.inventory, type) + (owner.chestInventory ? countOf(owner.chestInventory, type) : 0)
}

/** True while next block still needs wood/stone the owner does not hold (bag + chest = site stock). */
export function siteStillNeedsMaterials(owner: Villager, state: SimState): boolean {
  const next = nextBuildBlock(owner.buildQueue ?? [], state.grid)
  if (!next) return false
  const cost = materialCost(next)
  if (cost.wood > 0 && ownerMatStock(owner, 'wood') < cost.wood) return true
  if (cost.stone > 0 && ownerMatStock(owner, 'stone') < cost.stone) return true
  return false
}

export function siteMaxHelpers(wealth: number): number {
  if (wealth >= WEALTH_RICH) return MAX_HELPERS_RICH
  if (wealth <= WEALTH_POOR) return MAX_HELPERS_POOR
  return MAX_HELPERS_MID
}

/** Count villagers currently assigned to help this owner (TaskKind already on types). */
export function countActiveHelpers(state: SimState, ownerId: number): number {
  let n = 0
  for (const o of state.villagers) {
    if (!o.alive || o.id === ownerId) continue
    const k = o.task?.kind
    if (
      (k === 'helpBuild' || k === 'haulForBuild' || k === 'assistCraftTools' || k === 'hireBuilder') &&
      o.task?.targetId === ownerId
    ) {
      n++
    }
  }
  return n
}

/**
 * Open chantiers a helper could join — read-only listing for Lot 3C behaviors.
 * Does not assign tasks or mutate inventories.
 */
export function listOpenBuildSites(
  state: SimState,
  helper: Villager,
  maxDist = COLLAB_SITE_RADIUS,
): OpenBuildSite[] {
  const out: OpenBuildSite[] = []
  for (const owner of state.villagers) {
    if (owner.id === helper.id) continue
    if (!isActiveHomeSite(owner)) continue
    // Soften gate slightly: starving owners still list sites so haul can unblock them,
    // but helpers remain hunger-gated in proposeCollabOptions.
    if (owner.hunger < 0.85) continue
    if (owner.starveTimer > 8) continue
    const dist = distance(helper.x, helper.y, owner.homeX, owner.homeY)
    if (dist > maxDist) continue
    const next = nextBuildBlock(owner.buildQueue ?? [], state.grid)
    const cost = next ? materialCost(next) : { wood: 1, stone: 0 }
    const wealth = estimateWealth(owner)
    const helperCount = countActiveHelpers(state, owner.id)
    const maxHelpers = siteMaxHelpers(wealth)
    const materialGap =
      next != null &&
      ((cost.wood > 0 && countOf(owner.inventory, 'wood') < cost.wood) ||
        (cost.stone > 0 && countOf(owner.inventory, 'stone') < cost.stone))
    out.push({
      owner,
      next,
      needWood: cost.wood,
      needStone: cost.stone,
      wealth,
      helperCount,
      maxHelpers,
      dist,
      materialGap,
      canHire: wealth >= WEALTH_RICH && helperCount < maxHelpers,
    })
  }
  out.sort((a, b) => a.dist - b.dist)
  return out
}

/** Shell progress for UI / Lot 3C urge scoring. */
export function siteShellRemaining(owner: Villager): number {
  return structuralBlocksRemaining(owner.buildQueue ?? [])
}
