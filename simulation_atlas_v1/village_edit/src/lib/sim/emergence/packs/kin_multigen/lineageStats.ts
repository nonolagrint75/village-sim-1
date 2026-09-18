/**
 * Long-horizon lineage stats for probes (50–100y multi-city kin graphs).
 */

import { citiesForLineage, livingMembers } from './kinshipGraph'
import { evaluateBranchOutcome } from './branchOutcomes'
import {
  DEFAULT_TICKS_PER_YEAR,
  HORIZON_YEARS_MAX,
  HORIZON_YEARS_MIN,
  type BranchOutcomeKind,
  type KinLifeTag,
  type KinProfessionTrack,
  type KinshipGraph,
  type LineageHorizonStats,
  type LineageId,
  type PoliticalCrisis,
} from './types'

export function computeLineageHorizonStats(
  graph: KinshipGraph,
  lineageId: LineageId,
  opts: {
    tick: number
    ticksPerYear?: number
    surnameHint?: string | null
    crisis?: PoliticalCrisis | null
  },
): LineageHorizonStats {
  const tpy = opts.ticksPerYear ?? DEFAULT_TICKS_PER_YEAR
  const members = [...graph.nodes.values()].filter((n) => n.lineageId === lineageId)
  const living = livingMembers(graph, lineageId)
  const dead = members.filter((n) => !n.alive)
  const villageIds = citiesForLineage(graph, lineageId)
  const generations =
    members.reduce((m, n) => Math.max(m, n.generation), 0) + (members.length ? 1 : 0)

  const trackMix: Partial<Record<KinProfessionTrack, number>> = {}
  for (const n of living) {
    trackMix[n.track] = (trackMix[n.track] ?? 0) + 1
  }

  const factions = new Set<string>()
  for (const n of living) if (n.factionId) factions.add(n.factionId)
  const factionSplit = factions.size <= 1 ? 0 : Math.min(1, (factions.size - 1) / 2)

  const firmIds = new Set<string>()
  for (const n of living) for (const f of n.firmIds) firmIds.add(f)

  const wealths = living.map((n) => n.wealth)
  const wealthTotal = wealths.reduce((a, b) => a + b, 0)
  const wealthGiniApprox = approxGini(wealths)

  let secretAidEdges = 0
  let enmityEdges = 0
  for (const e of graph.edges) {
    const a = graph.nodes.get(e.a)
    const b = graph.nodes.get(e.b)
    if (!a || !b) continue
    if (a.lineageId !== lineageId && b.lineageId !== lineageId) continue
    if (e.kind === 'secret_aid') secretAidEdges++
    if (e.kind === 'enmity') enmityEdges++
  }

  const birthTicks = members.map((n) => n.birthTick)
  const earliest = birthTicks.length ? Math.min(...birthTicks) : opts.tick
  const horizonTicks = Math.max(0, opts.tick - earliest)
  const horizonYears = tpy > 0 ? horizonTicks / tpy : null

  const lifeTagsPresent = [...new Set(members.map((n) => n.lifeTag))] as KinLifeTag[]

  const outcome = evaluateBranchOutcome(graph, {
    lineageId,
    tick: opts.tick,
    crisis: opts.crisis,
  })

  return {
    lineageId,
    surnameHint: opts.surnameHint ?? null,
    generations,
    living: living.length,
    dead: dead.length,
    citiesTouched: villageIds.length,
    villageIds,
    trackMix,
    factionSplit,
    firmCount: firmIds.size,
    wealthTotal,
    wealthGiniApprox,
    secretAidEdges,
    enmityEdges,
    branchOutcomes: [outcome.kind],
    horizonTicks,
    horizonYears,
    lifeTagsPresent,
  }
}

export function computeAllLineageStats(
  graph: KinshipGraph,
  tick: number,
  ticksPerYear?: number,
  crisis?: PoliticalCrisis | null,
): LineageHorizonStats[] {
  return graph.rootLineageIds.map((id) =>
    computeLineageHorizonStats(graph, id, { tick, ticksPerYear, crisis }),
  )
}

/** Probe gate: graph matured into multi-city multi-gen territory. */
export function meetsMultigenHorizon(
  stats: LineageHorizonStats,
  opts?: { minYears?: number; maxYears?: number; minCities?: number; minGenerations?: number },
): boolean {
  const minY = opts?.minYears ?? HORIZON_YEARS_MIN
  const maxY = opts?.maxYears ?? HORIZON_YEARS_MAX
  const minCities = opts?.minCities ?? 2
  const minGen = opts?.minGenerations ?? 3
  if (stats.horizonYears == null) return false
  if (stats.horizonYears < minY) return false
  void maxY
  if (stats.citiesTouched < minCities) return false
  if (stats.generations < minGen) return false
  return true
}

/** Aggregate probe row: boring lives still rewrote society? */
export function societyRewriteSignal(statsList: LineageHorizonStats[]): {
  ok: boolean
  multiCityLineages: number
  professionEntropyHint: number
  crisisTension: number
  outcomes: BranchOutcomeKind[]
} {
  let multiCityLineages = 0
  let entropy = 0
  let tension = 0
  const outcomes: BranchOutcomeKind[] = []
  for (const s of statsList) {
    if (s.citiesTouched >= 2 && s.generations >= 3) multiCityLineages++
    const tracks = Object.values(s.trackMix)
    const total = tracks.reduce((a, b) => a + b, 0) || 1
    const probs = tracks.map((c) => c / total)
    let h = 0
    for (const p of probs) if (p > 0) h -= p * Math.log2(p)
    entropy += h
    tension += s.factionSplit + (s.secretAidEdges + s.enmityEdges) * 0.05
    outcomes.push(...s.branchOutcomes)
  }
  const n = Math.max(1, statsList.length)
  const professionEntropyHint = entropy / n
  const crisisTension = tension / n
  const ok =
    multiCityLineages >= 1 &&
    professionEntropyHint >= 0.5 &&
    (crisisTension > 0.05 ||
      outcomes.some((o) => o === 'institution_control' || o === 'rich'))
  return { ok, multiCityLineages, professionEntropyHint, crisisTension, outcomes }
}

function approxGini(values: number[]): number {
  if (values.length < 2) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const n = sorted.length
  const mean = sorted.reduce((a, b) => a + b, 0) / n
  if (mean <= 0) return 0
  let sum = 0
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) sum += Math.abs(sorted[i]! - sorted[j]!)
  }
  return clamp01(sum / (2 * n * n * mean))
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n))
}