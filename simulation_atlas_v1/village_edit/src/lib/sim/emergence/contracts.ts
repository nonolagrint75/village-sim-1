/**
 * Phase A/B — stable cross-layer facades for the emergent world stack.
 * Prefer extending these over inventing parallel APIs in later phases.
 *
 * Layers: cognition <-> relations <-> families <-> groups/careers <-> (stubs) economy/politics
 */
import type { Family, HouseholdNeeds } from '../family'
import { familyOf, findFamily, getHouseholdNeeds as householdNeedsOf } from '../family'
import type { RelEventKind, Relation } from '../social'
import {
  adjustRelation,
  recordRelHistory,
  relationWith,
  remember,
  type MemoryKind,
} from '../social'
import type { SimState, TaskKind, Villager } from '../types'
import { localPrice } from '../economy/marketView'
import type { ResourceType } from '../inventory'
import { relationDecisionBias as relationBiasOf } from '../cognition/decide'
import {
  evaluateCareerChange as evaluateCareerChangeOf,
  getCurrentOccupation as getCurrentOccupationOf,
  getJobOpportunities as getJobOpportunitiesOf,
  type CareerChangeEval,
  type JobOpportunity,
} from './mobility'
import {
  getGroupState as getGroupStateOf,
  getGroups as getGroupsOf,
  groupMetricsSnapshot,
  type GroupRef,
  type GroupState,
} from './groups'

// --- Cognition / Social / Family (Phase A — live) ---

export function getRelation(a: Villager, bId: number): Relation {
  return relationWith(a, bId)
}

export type InteractionKind = RelEventKind | 'talk' | 'trade' | 'work'

const INTERACTION_TO_REL: Partial<Record<InteractionKind, RelEventKind>> = {
  talk: 'gossip',
  trade: 'gift',
  work: 'helped',
  met: 'met',
  gift: 'gift',
  helped: 'helped',
  theft: 'theft',
  fight: 'fight',
  gossip: 'gossip',
  grief: 'grief',
  forgave: 'forgave',
  admire: 'admire',
  kinDeath: 'kinDeath',
  wolf: 'wolf',
}

/** Bidirectional soft bond update + capped history (budget-safe). */
export function recordInteraction(
  state: SimState,
  a: Villager,
  b: Villager,
  kind: InteractionKind,
  opts?: { dAffinity?: number; dTrust?: number; memory?: MemoryKind },
): void {
  if (a.id === b.id) return
  const tick = state.tick
  const relKind = INTERACTION_TO_REL[kind] ?? 'gossip'
  const dA = opts?.dAffinity ?? (kind === 'fight' || kind === 'theft' ? -0.08 : 0.04)
  const dT = opts?.dTrust ?? (kind === 'fight' || kind === 'theft' ? -0.05 : 0.03)
  adjustRelation(a, b.id, dA, dT, tick)
  adjustRelation(b, a.id, dA * 0.85, dT * 0.85, tick)
  recordRelHistory(a, b.id, relKind, tick)
  recordRelHistory(b, a.id, relKind, tick)
  if (opts?.memory) {
    remember(a, {
      kind: opts.memory,
      subjectId: b.id,
      x: b.x,
      y: b.y,
      tick,
      weight: 0.45,
      emotion: kind === 'fight' || kind === 'theft' ? -0.4 : 0.25,
    })
  }
}

export function getHousehold(state: SimState, npc: Villager): Family | null {
  return familyOf(state, npc) ?? (npc.familyId != null ? findFamily(state, npc.familyId) : null)
}

export function getHouseholdNeeds(state: SimState, npc: Villager): HouseholdNeeds {
  return householdNeedsOf(state, npc)
}

/** Thin wrapper — do not fork kinship/affinity scoring in later phases. */
export function relationDecisionBias(
  state: SimState,
  npc: Villager,
  otherId: number | null,
  kind: TaskKind,
): number {
  return relationBiasOf(state, npc, otherId, kind)
}

// --- Careers / Groups (Phase B — live over careers + Circles) ---

export type JobOpportunityStub = JobOpportunity
export type GroupRefStub = GroupRef
export type { JobOpportunity, CareerChangeEval, GroupRef, GroupState }

export function getJobOpportunities(state: SimState, npc: Villager, max = 8): JobOpportunity[] {
  return getJobOpportunitiesOf(state, npc, max)
}

export function getCurrentOccupation(npc: Villager) {
  return getCurrentOccupationOf(npc)
}

export function evaluateCareerChange(
  state: SimState,
  npc: Villager,
  opportunity?: JobOpportunity | null,
): CareerChangeEval {
  return evaluateCareerChangeOf(state, npc, opportunity)
}

export function getGroups(state: SimState, npc: Villager): GroupRef[] {
  return getGroupsOf(state, npc)
}

export function getGroupState(state: SimState, groupId: number): GroupState | null {
  return getGroupStateOf(state, groupId)
}

export { groupMetricsSnapshot }
export { careerMetricsSnapshot } from './mobility'

// --- Forward contracts (Phase C+ — thin live facades) ---

export type MarketStateStub = { resource: string; price: number; stock: number } | null
export type PoliticalContextStub = { regionId: number; factionCount: number } | null

/** Aggregate live per-capita surplus for a resource across villages (commerce clearing). */
function liveSurplusStock(state: SimState, resource: ResourceType): number {
  let sum = 0
  for (const vg of state.villages) {
    sum += vg.surplus[resource] ?? 0
  }
  return sum
}

export function getMarketState(state: SimState, resource: string): MarketStateStub {
  const res = resource as ResourceType
  const price = localPrice(state, res)
  return { resource, price, stock: liveSurplusStock(state, res) }
}

export function getPrice(state: SimState, resource: string): number {
  return localPrice(state, resource as ResourceType)
}

export function getPoliticalContext(_state: SimState, _regionId: number): PoliticalContextStub {
  return null
}

export function getFactions(_state: SimState, _regionId: number): GroupRefStub[] {
  return []
}