/**
 * Branch outcomes after decades: ruin / rich / dead / institution control.
 * Boring kinship networks → unequal historical residue.
 */

import { citiesForLineage, livingMembers } from './kinshipGraph'
import type {
  BranchOutcome,
  BranchOutcomeKind,
  KinshipGraph,
  LineageId,
  PoliticalCrisis,
} from './types'

export interface BranchScoreInput {
  lineageId: LineageId
  tick: number
  crisis?: PoliticalCrisis | null
  institutionControlScore?: number
  institutionRef?: string | null
}

export function evaluateBranchOutcome(
  graph: KinshipGraph,
  input: BranchScoreInput,
): BranchOutcome {
  const living = livingMembers(graph, input.lineageId)
  const all = [...graph.nodes.values()].filter((n) => n.lineageId === input.lineageId)
  const dead = all.filter((n) => !n.alive)
  const wealth = living.reduce((s, n) => s + n.wealth, 0)
  const avgWealth = living.length ? wealth / living.length : 0
  const cities = citiesForLineage(graph, input.lineageId)
  const inst = clamp01(input.institutionControlScore ?? maxInstitutionHint(living))

  let kind: BranchOutcomeKind = 'neutral'
  if (living.length === 0 && dead.length > 0) kind = 'dead'
  else if (inst >= 0.65 && living.length > 0) kind = 'institution_control'
  else if (avgWealth >= 55 || (wealth >= 120 && cities.length >= 2)) kind = 'rich'
  else if (avgWealth <= 6 || (living.length <= 1 && wealth < 15)) kind = 'ruin'
  else if (cities.length >= 2 && living.length >= 3) kind = 'scattered'

  if (input.crisis && kind === 'rich') {
    const enmity = countEdgeKind(graph, input.lineageId, 'enmity')
    const aid = countEdgeKind(graph, input.lineageId, 'secret_aid')
    if (enmity > aid + 2 && avgWealth < 80) kind = 'ruin'
  }

  const branchHeadId =
    living.slice().sort((a, b) => b.wealth - a.wealth || a.id - b.id)[0]?.id ?? null

  return {
    lineageId: input.lineageId,
    branchHeadId,
    kind,
    institutionRef:
      kind === 'institution_control' ? input.institutionRef ?? 'institution:local' : null,
    wealthShare: wealth,
    livingCount: living.length,
    tick: input.tick,
    note: summarize(kind, living.length, cities.length, avgWealth),
  }
}

export function evaluateAllRootBranches(
  graph: KinshipGraph,
  tick: number,
  crisis?: PoliticalCrisis | null,
): BranchOutcome[] {
  return graph.rootLineageIds.map((lineageId) =>
    evaluateBranchOutcome(graph, { lineageId, tick, crisis }),
  )
}

function maxInstitutionHint(
  living: { track: string; wealth: number; firmIds: string[] }[],
): number {
  let s = 0
  for (const n of living) {
    if (n.track === 'religion' || n.track === 'guild' || n.track === 'merchant') s = Math.max(s, 0.4)
    if (n.firmIds.length >= 2) s = Math.max(s, 0.55)
    if (n.wealth >= 70 && n.track === 'merchant') s = Math.max(s, 0.7)
  }
  return s
}

function countEdgeKind(graph: KinshipGraph, lineageId: LineageId, kind: string): number {
  let n = 0
  for (const e of graph.edges) {
    if (e.kind !== kind) continue
    const a = graph.nodes.get(e.a)
    const b = graph.nodes.get(e.b)
    if (a?.lineageId === lineageId || b?.lineageId === lineageId) n++
  }
  return n
}

function summarize(
  kind: BranchOutcomeKind,
  living: number,
  cities: number,
  avgWealth: number,
): string {
  return `${kind}: living=${living} cities=${cities} avgWealth=${avgWealth.toFixed(1)}`
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n))
}