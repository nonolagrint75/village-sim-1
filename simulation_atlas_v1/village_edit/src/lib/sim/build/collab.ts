/**
 * Collaborative / social home construction.
 * Helpers take tasks from another villager's buildQueue or haul materials —
 * does not replace the dynamic planner path (planHomeSpatial / emitBuildQueue).
 */
import { estimateWealth } from '../ecology'
import { addToInventory, countOf, removeFromInventory, type ResourceType } from '../inventory'
import {
  adjustRelation,
  recordRelHistory,
  relationWith,
  remember,
  type RelEventKind,
} from '../social'
import { CHILD_AGE } from '../ages'
import type { SimState, TaskKind, Villager } from '../types'
import { distance } from '../world'
import { materialCost, placeBuildBlock } from './chunks'
import { markBlockDone, nextBuildBlock, structuralBlocksRemaining } from './tasks'
import type { BuildBlock, BuildBlockKind } from './types'

function ownerQueue(owner: Villager): BuildBlock[] {
  return owner.buildQueue ?? []
}

/** Soft search radius for open home chantiers. */
export const COLLAB_SITE_RADIUS = 48
/** Cap concurrent helpers on a poor family's site. */
export const MAX_HELPERS_POOR = 1
/** Default helper cap. */
export const MAX_HELPERS_MID = 2
/** Rich household can hire a crew. */
export const MAX_HELPERS_RICH = 4
/** Wealth thresholds (estimateWealth units). */
export const WEALTH_POOR = 4
export const WEALTH_RICH = 14
/** Kids haul at most one timber. */
export const CHILD_HAUL_WOOD = 1
export const ADULT_HAUL_WOOD = 2
export const ADULT_HAUL_STONE = 1

const HEAVY_BLOCK: ReadonlySet<BuildBlockKind> = new Set(['wall', 'partition', 'window', 'door'])

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
  /** Owner is wood/stone starved relative to next block. */
  materialGap: boolean
  canHire: boolean
}

export function isActiveHomeSite(owner: Villager): boolean {
  if (!owner.alive) return false
  if (owner.homeX < 0 || !owner.house) return false
  if (owner.hasHome && owner.homeOwnerId !== owner.id) return false
  return ownerQueue(owner).some((b) => !b.done)
}

export function siteMaxHelpers(wealth: number): number {
  if (wealth >= WEALTH_RICH) return MAX_HELPERS_RICH
  if (wealth <= WEALTH_POOR) return MAX_HELPERS_POOR
  return MAX_HELPERS_MID
}

/** Count villagers currently assigned to help this owner. */
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

function ownerMaterialNeed(owner: Villager, next: BuildBlock | null): { wood: number; stone: number } {
  if (!next) return { wood: 1, stone: 0 }
  return materialCost(next)
}

/**
 * Open home build sites a helper could join (same village or nearby).
 * Skips owners who are starving — survival first.
 */
export function listOpenBuildSites(state: SimState, helper: Villager, maxDist = COLLAB_SITE_RADIUS): OpenBuildSite[] {
  const out: OpenBuildSite[] = []
  for (const owner of state.villagers) {
    if (owner.id === helper.id) continue
    if (!isActiveHomeSite(owner)) continue
    if (owner.hunger < 1.1) continue
    if (owner.starveTimer > 6) continue
    // Village affinity: prefer same village; allow kin/neighbors without village yet.
    if (
      helper.villageId !== null &&
      owner.villageId !== null &&
      helper.villageId !== owner.villageId
    ) {
      const rel = helper.relations.get(owner.id)
      if (!rel || (rel.kinship < 0.35 && rel.affinity < 0.35)) continue
    }
    const dist = distance(helper.x, helper.y, owner.homeX, owner.homeY)
    if (dist > maxDist) continue
    const wealth = estimateWealth(owner)
    const helperCount = countActiveHelpers(state, owner.id)
    const maxHelpers = siteMaxHelpers(wealth)
    if (helperCount >= maxHelpers) continue
    const next = nextBuildBlock(ownerQueue(owner), state.grid)
    const need = ownerMaterialNeed(owner, next)
    const haveW = countOf(owner.inventory, 'wood')
    const haveS = countOf(owner.inventory, 'stone')
    const materialGap =
      (need.wood > 0 && haveW < need.wood) || (need.stone > 0 && haveS < need.stone)
    const coins = countOf(owner.inventory, 'coin')
    out.push({
      owner,
      next,
      needWood: need.wood,
      needStone: need.stone,
      wealth,
      helperCount,
      maxHelpers,
      dist,
      materialGap,
      canHire: wealth >= WEALTH_RICH || coins >= 2,
    })
  }
  out.sort((a, b) => a.dist - b.dist)
  return out
}

function socialPull(helper: Villager, owner: Villager): number {
  const rel = relationWith(helper, owner.id)
  let s =
    rel.affinity * 42 +
    rel.trust * 28 +
    rel.kinship * 55 +
    rel.respect * 18 +
    Math.max(0, rel.debt) * 22
  if (helper.spouseId === owner.id || owner.spouseId === helper.id) s += 40
  if (helper.familyId !== null && helper.familyId === owner.familyId) s += 22
  if (helper.parentIds.includes(owner.id) || owner.parentIds.includes(helper.id)) s += 30
  return s
}

function builderBonus(helper: Villager): number {
  let b = 0
  if (helper.profession === 'builder') b += 38
  else if (helper.profession === 'mason') b += 28
  else if (helper.ambition === 'builder') b += 18
  else if (helper.profession === 'lumberjack') b += 8
  return b
}

/** Survival gate — don't steal helper's life for a chantier. */
export function helperSurvivalOk(helper: Villager): boolean {
  if (helper.hunger < 1.35) return false
  if (helper.starveTimer > 4) return false
  if (helper.stamina < 1.4) return false
  if (helper.health < 2) return false
  return true
}

/**
 * Score urge for `helpBuild` (place a block on owner's queue).
 * Builders / masons prefer walls; others still may help lightly.
 */
export function scoreHelpBuild(
  helper: Villager,
  site: OpenBuildSite,
  opts: { idleBonus?: number; buildSkill?: number } = {},
): number {
  if (!helperSurvivalOk(helper)) return 0
  if (!site.next) return 0
  // Kids / dependents never place heavy walls — scoring side (tactics also gates).
  if (helper.age < 14 && HEAVY_BLOCK.has(site.next.kind)) return 0
  const cost = materialCost(site.next)
  const canPaySelf =
    (cost.wood <= 0 || countOf(helper.inventory, 'wood') >= cost.wood) &&
    (cost.stone <= 0 || countOf(helper.inventory, 'stone') >= cost.stone)
  const ownerCanPay =
    (cost.wood <= 0 || countOf(site.owner.inventory, 'wood') >= cost.wood) &&
    (cost.stone <= 0 || countOf(site.owner.inventory, 'stone') >= cost.stone)
  if (!canPaySelf && !ownerCanPay) return 0

  const p = helper.personality
  let urge =
    18 +
    socialPull(helper, site.owner) +
    builderBonus(helper) +
    p.generosity * 28 +
    p.sociability * 16 +
    (opts.buildSkill ?? 0) * 35 +
    (opts.idleBonus ?? 0)

  // Village solidarity for poor progressive builds.
  if (site.wealth <= WEALTH_POOR) urge += 22 + p.generosity * 18
  // Hired crew: rich pay → builders show up.
  if (site.canHire && (helper.profession === 'builder' || helper.profession === 'mason')) {
    urge += 32 + Math.min(24, site.wealth)
  }
  // Technical door/wall work — specialists preferred.
  if (HEAVY_BLOCK.has(site.next.kind)) {
    if (helper.profession === 'builder' || helper.profession === 'mason') urge += 20
    else if (helper.profession === 'weaver' || helper.profession === 'farmer') urge *= 0.55
  }
  // Don't abandon own unfinished shell when desperate for shelter.
  if (!helper.hasHome && helper.house && ownerQueue(helper).some((b) => !b.done)) {
    urge *= 0.35
  }
  // Reach falloff.
  urge *= Math.max(0.25, 1 - site.dist / (COLLAB_SITE_RADIUS + 8))
  return Math.max(0, urge)
}

/** Farmer / neighbor hauls wood or stone to the owner's inventory. */
export function scoreHaulForBuild(
  helper: Villager,
  site: OpenBuildSite,
  opts: { childHaul?: boolean } = {},
): number {
  if (!helperSurvivalOk(helper)) return 0
  if (!site.materialGap && site.wealth > WEALTH_POOR) {
    // Still allow occasional goodwill hauls for kin.
    const rel = relationWith(helper, site.owner.id)
    if (rel.kinship < 0.4 && rel.affinity < 0.45) return 0
  }
  const wood = countOf(helper.inventory, 'wood')
  const stone = countOf(helper.inventory, 'stone')
  const wantWood = site.needWood > 0 && wood >= (opts.childHaul ? CHILD_HAUL_WOOD : 1)
  const wantStone = site.needStone > 0 && stone >= 1 && !opts.childHaul
  if (!wantWood && !wantStone) return 0

  const p = helper.personality
  let urge =
    24 +
    socialPull(helper, site.owner) * 0.85 +
    p.generosity * 32 +
    (helper.profession === 'farmer' || helper.profession === 'lumberjack' ? 26 : 0) +
    (helper.profession === 'miner' || helper.profession === 'mason' ? 14 : 0) +
    (helper.profession === 'weaver' ? 10 : 0) +
    (site.materialGap ? 28 : 8) +
    (site.wealth <= WEALTH_POOR ? 20 : 0)

  if (opts.childHaul) urge *= 0.7
  urge *= Math.max(0.25, 1 - site.dist / (COLLAB_SITE_RADIUS + 8))
  return Math.max(0, urge)
}

/** Merchant / rich neighbour funds the site (coin or wood gift). */
export function scoreFundBuild(helper: Villager, site: OpenBuildSite): number {
  if (!helperSurvivalOk(helper)) return 0
  const coins = countOf(helper.inventory, 'coin')
  const wood = countOf(helper.inventory, 'wood')
  if (coins < 1 && wood < 2) return 0
  if (site.wealth >= WEALTH_RICH && site.materialGap === false) return 0
  const p = helper.personality
  let urge =
    12 +
    socialPull(helper, site.owner) * 0.6 +
    p.generosity * 40 +
    (helper.profession === 'trader' ? 30 : 0) +
    (site.wealth <= WEALTH_POOR ? 26 : 0)
  urge *= Math.max(0.2, 1 - site.dist / COLLAB_SITE_RADIUS)
  return Math.max(0, urge)
}

/** Smith crafts / upgrades tools for the chantier owner. */
export function scoreAssistCraftTools(helper: Villager, site: OpenBuildSite): number {
  if (!helperSurvivalOk(helper)) return 0
  if (helper.profession !== 'blacksmith' && helper.ambition !== 'builder') return 0
  if (site.owner.toolTier === 'iron') return 0
  const iron = countOf(helper.inventory, 'iron')
  const stone = countOf(helper.inventory, 'stone')
  if (iron < 1 && stone < 1 && helper.toolTier === 'none') return 0
  const p = helper.personality
  let urge =
    16 +
    socialPull(helper, site.owner) * 0.7 +
    p.generosity * 20 +
    (helper.profession === 'blacksmith' ? 36 : 10) +
    (site.owner.toolTier === 'none' ? 22 : 8)
  urge *= Math.max(0.25, 1 - site.dist / COLLAB_SITE_RADIUS)
  return Math.max(0, urge)
}

/**
 * Owner-side: seek a nearby builder to hire (walk + pay advance).
 * `targetId` = builder id; site is the owner's own chantier.
 */
export function scoreHireBuilder(owner: Villager, builder: Villager, wealth: number): number {
  if (!isActiveHomeSite(owner)) return 0
  if (!helperSurvivalOk(owner)) return 0
  if (builder.id === owner.id || !builder.alive) return 0
  if (builder.profession !== 'builder' && builder.profession !== 'mason' && builder.ambition !== 'builder') {
    return 0
  }
  if (countOf(owner.inventory, 'coin') < 1 && wealth < WEALTH_RICH) return 0
  // Already hired / helping this owner.
  const bk = builder.task?.kind
  if (
    (bk === 'helpBuild' || bk === 'haulForBuild' || bk === 'assistCraftTools') &&
    builder.task?.targetId === owner.id
  ) {
    return 0
  }
  const dist = distance(owner.x, owner.y, builder.x, builder.y)
  if (dist > COLLAB_SITE_RADIUS) return 0
  let urge =
    20 +
    wealth * 1.2 +
    owner.personality.ambition * 24 +
    (builder.profession === 'builder' ? 28 : 14) -
    dist * 0.35
  if (wealth < WEALTH_RICH && countOf(owner.inventory, 'coin') < 2) urge *= 0.4
  return Math.max(0, urge)
}

export function preferredHaulResource(
  helper: Villager,
  site: OpenBuildSite,
  childHaul: boolean,
): ResourceType | null {
  const wood = countOf(helper.inventory, 'wood')
  const stone = countOf(helper.inventory, 'stone')
  if (site.needStone > 0 && stone >= 1 && !childHaul) return 'stone'
  if (site.needWood > 0 && wood >= (childHaul ? CHILD_HAUL_WOOD : 1)) return 'wood'
  if (wood >= 1) return 'wood'
  if (stone >= 1 && !childHaul) return 'stone'
  return null
}

/**
 * Place one block on the owner's queue using helper materials first, else owner's.
 * Does not run home-completion ceremony — caller handles shell close.
 */
export function placeBlockForOwner(
  state: SimState,
  helper: Villager,
  owner: Villager,
  targetX: number,
  targetY: number,
): { ok: boolean; block: BuildBlock | null; structLeft: number } {
  const queue = ownerQueue(owner)
  let block =
    queue.find((b) => !b.done && b.x === targetX && b.y === targetY) ??
    nextBuildBlock(queue, state.grid) ??
    null
  if (!block) return { ok: false, block: null, structLeft: structuralBlocksRemaining(queue) }

  // Age gate: children never place heavy structure (ticks via ages.ts).
  if (helper.age < CHILD_AGE && HEAVY_BLOCK.has(block.kind)) {
    return { ok: false, block, structLeft: structuralBlocksRemaining(queue) }
  }

  const cost = materialCost(block)
  const payFromHelper =
    (cost.wood <= 0 || countOf(helper.inventory, 'wood') >= cost.wood) &&
    (cost.stone <= 0 || countOf(helper.inventory, 'stone') >= cost.stone)
  const payFromOwner =
    (cost.wood <= 0 || countOf(owner.inventory, 'wood') >= cost.wood) &&
    (cost.stone <= 0 || countOf(owner.inventory, 'stone') >= cost.stone)
  if (!payFromHelper && !payFromOwner) {
    return { ok: false, block, structLeft: structuralBlocksRemaining(queue) }
  }

  if (!placeBuildBlock(state.grid, block, state.blocks)) {
    return { ok: false, block, structLeft: structuralBlocksRemaining(queue) }
  }

  const purse = payFromHelper ? helper.inventory : owner.inventory
  if (cost.wood > 0) removeFromInventory(purse, 'wood', cost.wood)
  if (cost.stone > 0) removeFromInventory(purse, 'stone', cost.stone)
  markBlockDone(queue, block.x, block.y, block.kind)
  owner.buildQueue = queue

  return {
    ok: true,
    block,
    structLeft: structuralBlocksRemaining(queue),
  }
}

/** Deliver wood/stone into the owner's inventory at the site. */
export function haulMaterialsToOwner(
  helper: Villager,
  owner: Villager,
  resource: ResourceType,
  amount: number,
): boolean {
  if (resource !== 'wood' && resource !== 'stone') return false
  const have = countOf(helper.inventory, resource)
  const n = Math.min(amount, have)
  if (n <= 0) return false
  removeFromInventory(helper.inventory, resource, n)
  const left = addToInventory(owner.inventory, resource, n)
  if (left > 0) {
    // Bounce overflow back so nothing vanishes.
    addToInventory(helper.inventory, resource, left)
  }
  return n - left > 0
}

/** Merchant fund: gift coin or wood toward the build. */
export function fundOwnerBuild(helper: Villager, owner: Villager): CollabPayKind {
  if (countOf(helper.inventory, 'coin') >= 1) {
    removeFromInventory(helper.inventory, 'coin', 1)
    addToInventory(owner.inventory, 'coin', 1)
    return 'coin'
  }
  if (countOf(helper.inventory, 'wood') >= 2) {
    removeFromInventory(helper.inventory, 'wood', 2)
    addToInventory(owner.inventory, 'wood', 2)
    return 'coin' // treated as material gift; social still applies
  }
  return 'none'
}

/** Upgrade owner's tools for the chantier (smith assist). */
export function assistOwnerTools(helper: Villager, owner: Villager): boolean {
  const tiers = ['none', 'wood', 'stone', 'iron'] as const
  const ownerI = tiers.indexOf(owner.toolTier)
  if (ownerI >= 3) return false

  if (countOf(helper.inventory, 'iron') >= 1 && owner.toolTier !== 'iron') {
    removeFromInventory(helper.inventory, 'iron', 1)
    owner.toolTier = 'iron'
    owner.toolWear = 0
    return true
  }
  if (countOf(helper.inventory, 'stone') >= 1 && ownerI < 2) {
    removeFromInventory(helper.inventory, 'stone', 1)
    owner.toolTier = 'stone'
    owner.toolWear = 0
    return true
  }
  // Hand off a better personal tool temporarily as "loan".
  if (tiers.indexOf(helper.toolTier) > ownerI && helper.toolTier !== 'none') {
    owner.toolTier = helper.toolTier === 'iron' ? 'stone' : helper.toolTier
    owner.toolWear = 0
    return true
  }
  return false
}

function pickPayment(owner: Villager, helper: Villager, hired: boolean): CollabPayKind {
  const rel = relationWith(owner, helper.id)
  if (hired || estimateWealth(owner) >= WEALTH_RICH) {
    if (countOf(owner.inventory, 'coin') >= 1) return 'coin'
    if (countOf(owner.inventory, 'bread') > 1 || countOf(owner.inventory, 'food') > 1) return 'food'
    return 'favor'
  }
  if (rel.kinship > 0.45 || rel.affinity > 0.55) return 'favor'
  if (estimateWealth(owner) <= WEALTH_POOR) {
    if (countOf(owner.inventory, 'food') > 1 || countOf(owner.inventory, 'bread') > 1) return 'food'
    return 'favor'
  }
  if (countOf(owner.inventory, 'coin') >= 1 && helper.profession === 'builder') return 'coin'
  if (countOf(owner.inventory, 'bread') > 1 || countOf(owner.inventory, 'food') > 1) return 'food'
  return 'favor'
}

function transferFood(from: Villager, to: Villager): boolean {
  const kind: ResourceType | null =
    countOf(from.inventory, 'bread') > 1
      ? 'bread'
      : countOf(from.inventory, 'food') > 1
        ? 'food'
        : null
  if (!kind) return false
  removeFromInventory(from.inventory, kind, 1)
  addToInventory(to.inventory, kind, 1)
  return true
}

/**
 * Social + payment aftermath after a successful help act.
 * Raises affinity/trust, favor debt, builder reputation (semantic).
 */
export function settleBuildHelp(
  state: SimState,
  helper: Villager,
  owner: Villager,
  kind: TaskKind,
  opts: { hired?: boolean; buildSkill?: number } = {},
): CollabPayKind {
  const pay = pickPayment(owner, helper, opts.hired === true)
  if (pay === 'coin' && countOf(owner.inventory, 'coin') >= 1) {
    removeFromInventory(owner.inventory, 'coin', 1)
    addToInventory(helper.inventory, 'coin', 1)
  } else if (pay === 'food') {
    if (!transferFood(owner, helper)) {
      // Fall through to favor.
    }
  }

  const affinityBoost = kind === 'helpBuild' ? 0.12 : kind === 'haulForBuild' ? 0.08 : 0.06
  const trustBoost = kind === 'helpBuild' ? 0.1 : 0.06
  adjustRelation(owner, helper.id, affinityBoost, trustBoost, state.tick)
  adjustRelation(helper, owner.id, affinityBoost * 0.7, trustBoost * 0.7, state.tick)

  // Owner owes helper a favour (or settles if hired cash).
  const owe = relationWith(owner, helper.id)
  if (pay === 'favor' || pay === 'none') {
    owe.debt = Math.min(3, owe.debt + (kind === 'helpBuild' ? 0.35 : 0.2))
  } else {
    owe.debt = Math.max(0, owe.debt - 0.15)
  }

  remember(owner, {
    kind: 'helped',
    subjectId: helper.id,
    x: helper.x,
    y: helper.y,
    tick: state.tick,
    weight: kind === 'helpBuild' ? 1.4 : 1.0,
    emotion: 0.9,
  })
  const hist: RelEventKind = pay === 'coin' || pay === 'food' ? 'gift' : 'helped'
  recordRelHistory(owner, helper.id, hist, state.tick)
  recordRelHistory(helper, owner.id, 'helped', state.tick)

  // Builder reputation drip.
  if (
    helper.profession === 'builder' ||
    helper.profession === 'mason' ||
    (opts.buildSkill ?? 0) > 0.55
  ) {
    const relH = relationWith(owner, helper.id)
    relH.respect = Math.min(1, relH.respect + 0.05)
  }

  return pay === 'food' && countOf(helper.inventory, 'bread') + countOf(helper.inventory, 'food') === 0
    ? 'favor'
    : pay
}

/** Hire handshake: owner pays advance; builder gains respect + soft obligation to help. */
export function settleHireAdvance(state: SimState, owner: Villager, builder: Villager): boolean {
  let paid = false
  if (countOf(owner.inventory, 'coin') >= 1) {
    removeFromInventory(owner.inventory, 'coin', 1)
    addToInventory(builder.inventory, 'coin', 1)
    paid = true
  } else if (transferFood(owner, builder)) {
    paid = true
  }
  adjustRelation(builder, owner.id, 0.1, 0.12, state.tick)
  adjustRelation(owner, builder.id, 0.06, 0.08, state.tick)
  // Positive debt on owner→builder: owner already prepaid; builder affinity rises to show up.
  relationWith(owner, builder.id).debt = Math.min(3, relationWith(owner, builder.id).debt + 0.25)
  relationWith(builder, owner.id).respect = Math.min(
    1,
    relationWith(builder, owner.id).respect + 0.06,
  )
  // Soft affinity pull so scoreHelpBuild rises next ticks.
  relationWith(builder, owner.id).affinity = Math.min(
    1,
    relationWith(builder, owner.id).affinity + 0.12,
  )
  recordRelHistory(builder, owner.id, paid ? 'gift' : 'helped', state.tick)
  recordRelHistory(owner, builder.id, 'helped', state.tick)
  remember(builder, {
    kind: 'helped',
    subjectId: owner.id,
    x: owner.x,
    y: owner.y,
    tick: state.tick,
    weight: 1.1,
    emotion: 0.6,
  })
  return paid
}

/** French one-liner for events / UI. */
export function collabHelpLabelFr(kind: TaskKind, ownerName: string): string {
  switch (kind) {
    case 'helpBuild':
      return `aide ${ownerName} sur le chantier`
    case 'haulForBuild':
      return `apporte des matériaux à ${ownerName}`
    case 'assistCraftTools':
      return `prépare des outils pour ${ownerName}`
    case 'hireBuilder':
      return `embauche un bâtisseur`
    default:
      return `soutient le chantier de ${ownerName}`
  }
}
