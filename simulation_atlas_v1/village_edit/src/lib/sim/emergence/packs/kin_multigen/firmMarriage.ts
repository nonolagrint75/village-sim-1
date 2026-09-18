/**
 * Marriage merges firms — Eren/Mira / merchant-artisan branches.
 * Pure scoring + merge proposal; integrator mutates `BusinessRecord` bags.
 */

import { ensureEdge } from './kinshipGraph'
import type {
  FirmId,
  FirmMergeProposal,
  FirmMergeResult,
  KinshipGraph,
  PersonId,
  VillageId,
} from './types'

export interface FirmSnapshot {
  id: FirmId
  ownerIds: PersonId[]
  villageId: VillageId | null
  wealth: number
  kindHint: string
  workerCount: number
  failed?: boolean
}

/**
 * Score whether two spouses should merge firms (trade houses, workshops).
 */
export function scoreFirmMarriageMerge(
  firmA: FirmSnapshot,
  firmB: FirmSnapshot,
  spouseA: PersonId,
  spouseB: PersonId,
  opts: {
    tick: number
    relationTrust: number
    sameCityBonus?: number
  },
): FirmMergeProposal | null {
  if (firmA.failed || firmB.failed) return null
  if (firmA.id === firmB.id) return null
  const aOwns = firmA.ownerIds.includes(spouseA)
  const bOwns = firmB.ownerIds.includes(spouseB)
  if (!aOwns || !bOwns) return null

  let score = 0.2
  score += clamp01(opts.relationTrust) * 0.35
  const wealthSynergy =
    1 - Math.abs(firmA.wealth - firmB.wealth) / Math.max(1, firmA.wealth + firmB.wealth)
  score += wealthSynergy * 0.2
  if (firmA.villageId != null && firmA.villageId === firmB.villageId) {
    score += opts.sameCityBonus ?? 0.2
  } else {
    score += 0.08
  }
  if (firmA.kindHint !== firmB.kindHint) score += 0.12
  score += Math.min(0.1, (firmA.workerCount + firmB.workerCount) * 0.02)

  return {
    firmA: firmA.id,
    firmB: firmB.id,
    spouseA,
    spouseB,
    score: clamp01(score),
    tick: opts.tick,
  }
}

/** Accept merge when score ≥ threshold (default 0.55). */
export function shouldMergeFirms(proposal: FirmMergeProposal, threshold = 0.55): boolean {
  return proposal.score >= threshold
}

/**
 * Produce a merge result descriptor. Does not touch core business bag.
 * Also adds `firm_partner` edges on the kinship graph when provided.
 */
export function applyFirmMergeLocal(
  proposal: FirmMergeProposal,
  firms: FirmSnapshot[],
  graph: KinshipGraph | null,
  tick: number,
): FirmMergeResult | null {
  if (!shouldMergeFirms(proposal)) return null
  const a = firms.find((f) => f.id === proposal.firmA)
  const b = firms.find((f) => f.id === proposal.firmB)
  if (!a || !b) return null

  const mergedFirmId = `merged:${a.id}+${b.id}@${tick}`
  const ownerIds = unique([...a.ownerIds, ...b.ownerIds])
  const villageId = a.villageId ?? b.villageId ?? null

  if (graph) {
    ensureEdge(
      graph,
      proposal.spouseA,
      proposal.spouseB,
      'firm_partner',
      0.8,
      tick,
      villageId != null ? [villageId] : [],
    )
    const na = graph.nodes.get(proposal.spouseA)
    const nb = graph.nodes.get(proposal.spouseB)
    if (na) {
      na.firmIds = unique([...na.firmIds.filter((id) => id !== a.id && id !== b.id), mergedFirmId])
    }
    if (nb) {
      nb.firmIds = unique([...nb.firmIds.filter((id) => id !== a.id && id !== b.id), mergedFirmId])
    }
  }

  return {
    mergedFirmId,
    retiredFirmIds: [a.id, b.id],
    ownerIds,
    villageId,
    tick,
  }
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n))
}

function unique<T>(arr: T[]): T[] {
  return [...new Set(arr)]
}