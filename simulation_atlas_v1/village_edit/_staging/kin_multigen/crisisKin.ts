/**
 * Political crisis splits multi-city descendants across factions.
 * Cross-faction kin: secret aid vs enmity (Ayan arc).
 */

import { ensureEdge, livingMembers, neighbors } from './kinshipGraph'
import type {
  CrossFactionKinLink,
  FactionId,
  KinPersonNode,
  KinshipGraph,
  LineageId,
  PoliticalCrisis,
  KinTickContext,
} from './types'

export function createCrisis(opts: {
  id: string
  label: string
  tick: number
  factionA: FactionId
  factionB: FactionId
  lineageIds: LineageId[]
}): PoliticalCrisis {
  return {
    id: opts.id,
    label: opts.label,
    startTick: opts.tick,
    phase: 'rising',
    factionA: opts.factionA,
    factionB: opts.factionB,
    lineageIds: opts.lineageIds,
    allegiances: new Map(),
  }
}

/**
 * Assign living lineage members to factions.
 * Uses city, profession track, wealth, and roll — not scripted bios.
 */
export function splitDescendantsAcrossFactions(
  graph: KinshipGraph,
  crisis: PoliticalCrisis,
  ctx: KinTickContext,
): PoliticalCrisis {
  const members: KinPersonNode[] = []
  for (const lid of crisis.lineageIds) members.push(...livingMembers(graph, lid))

  for (let i = 0; i < members.length; i++) {
    const m = members[i]!
    const roll = fract(ctx.roll + i * 0.137 + m.id * 0.001)
    let leanA = 0.5
    if (m.track === 'soldier' || m.track === 'merchant') leanA += 0.2
    if (m.track === 'farmer' || m.track === 'religion') leanA -= 0.2
    if (m.wealth > 40) leanA += 0.1
    if (m.wealth < 8) leanA -= 0.05
    if (i % 2 === 1) leanA += (roll - 0.5) * 0.25
    const faction = leanA + (roll - 0.5) * 0.2 >= 0.5 ? crisis.factionA : crisis.factionB
    crisis.allegiances.set(m.id, faction)
    m.factionId = faction
  }
  crisis.phase = 'split'
  return crisis
}

/** Build cross-faction kin links among close relatives. */
export function collectCrossFactionKin(
  graph: KinshipGraph,
  crisis: PoliticalCrisis,
): CrossFactionKinLink[] {
  const links: CrossFactionKinLink[] = []
  const seen = new Set<string>()

  for (const [pid, faction] of crisis.allegiances) {
    for (const { otherId, edge } of neighbors(graph, pid, [
      'sibling',
      'parent',
      'child',
      'spouse',
      'cousin',
      'affine',
    ])) {
      const otherFaction = crisis.allegiances.get(otherId)
      if (!otherFaction || otherFaction === faction) continue
      const key = [Math.min(pid, otherId), Math.max(pid, otherId)].join('-')
      if (seen.has(key)) continue
      seen.add(key)

      const kinship = edge.weight
      const aidPressure =
        kinship * 0.6 + (edge.kind === 'sibling' || edge.kind === 'spouse' ? 0.25 : 0.1)
      const hatePressure =
        (1 - kinship) * 0.35 +
        (edge.kind === 'affine' ? 0.15 : 0) +
        (crisis.phase === 'open_enmity' ? 0.2 : 0)

      let stance: CrossFactionKinLink['stance'] = 'neutral'
      if (aidPressure >= 0.55 && aidPressure >= hatePressure) stance = 'secret_aid'
      else if (hatePressure >= 0.5 && hatePressure > aidPressure) stance = 'enmity'
      else if (kinship < 0.35) stance = 'estranged'

      links.push({
        personA: pid,
        personB: otherId,
        factionA: faction,
        factionB: otherFaction,
        kinship,
        stance,
        aidPressure: clamp01(aidPressure),
        hatePressure: clamp01(hatePressure),
      })
    }
  }
  return links
}

/**
 * Apply secret aid or enmity edges onto the graph; advance crisis phase.
 * Integrator should also call `adjustRelation` / transfer food-coin.
 */
export function resolveCrossFactionStances(
  graph: KinshipGraph,
  crisis: PoliticalCrisis,
  links: CrossFactionKinLink[],
  tick: number,
): PoliticalCrisis {
  let aid = 0
  let hate = 0
  for (const link of links) {
    if (link.stance === 'secret_aid') {
      ensureEdge(graph, link.personA, link.personB, 'secret_aid', link.aidPressure, tick)
      aid++
    } else if (link.stance === 'enmity') {
      ensureEdge(graph, link.personA, link.personB, 'enmity', link.hatePressure, tick)
      hate++
    }
  }
  if (aid > hate && aid > 0) crisis.phase = 'secret_aid'
  else if (hate > 0) crisis.phase = 'open_enmity'
  else if (crisis.phase === 'split') crisis.phase = 'resolved'
  return crisis
}

/** Soft resource transfer suggestion for secret aid (integrator executes). */
export function secretAidTransferHint(
  link: CrossFactionKinLink,
  donorWealth: number,
  recipientNeed: number,
): { amount: number; risk: number } | null {
  if (link.stance !== 'secret_aid') return null
  const amount =
    Math.min(donorWealth * 0.15, Math.max(1, recipientNeed * 0.4)) * link.aidPressure
  if (amount < 0.5) return null
  const risk = clamp01(0.2 + link.hatePressure * 0.5 + (1 - link.kinship) * 0.2)
  return { amount, risk }
}

export function factionBalance(crisis: PoliticalCrisis): { a: number; b: number } {
  let a = 0
  let b = 0
  for (const f of crisis.allegiances.values()) {
    if (f === crisis.factionA) a++
    else if (f === crisis.factionB) b++
  }
  return { a, b }
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n))
}

function fract(n: number): number {
  return n - Math.floor(n)
}