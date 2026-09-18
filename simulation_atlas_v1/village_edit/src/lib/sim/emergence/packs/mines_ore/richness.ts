/**
 * Terrain richness + prospecting discovery (causal step 1).
 * Self-contained; integrator supplies DepositSample[] from WorldGrid.
 */

import {
  PROSPECT_BASE_CHANCE,
  PROSPECT_RADIUS,
  PROSPECT_RICHNESS_FLOOR,
  RICHNESS_WEIGHTS,
} from './constants'
import { pushEvent } from './events'
import type {
  DepositSample,
  MineLifeTag,
  MinesOreBag,
  OreAmounts,
  OreKind,
  VeinKnowledge,
} from './types'
import { emptyOreAmounts, METAL_ORE_KINDS } from './types'

export function sampleRichness(amounts: OreAmounts): number {
  return (
    amounts.iron * RICHNESS_WEIGHTS.iron +
    amounts.gold * RICHNESS_WEIGHTS.gold +
    amounts.copper * RICHNESS_WEIGHTS.copper +
    amounts.tin * RICHNESS_WEIGHTS.tin +
    amounts.silver * RICHNESS_WEIGHTS.silver +
    amounts.coal * RICHNESS_WEIGHTS.coal +
    amounts.lead * RICHNESS_WEIGHTS.lead
  )
}

/** Sum richness in radius — mirrors mining.localOreRichness. */
export function localOreRichness(
  samples: readonly DepositSample[],
  cx: number,
  cy: number,
  radius: number = PROSPECT_RADIUS,
  opts?: { chebyshev?: boolean },
): number {
  const r2 = radius * radius
  let sum = 0
  for (const s of samples) {
    const dx = s.x - cx
    const dy = s.y - cy
    if (opts?.chebyshev) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) > radius) continue
    } else if (dx * dx + dy * dy > r2) continue
    sum += sampleRichness(s.amounts)
  }
  return sum
}

export function primaryOreOf(amounts: OreAmounts): OreKind {
  let best: OreKind = 'iron'
  let bestV = -1
  for (const k of METAL_ORE_KINDS) {
    const w = amounts[k] * (RICHNESS_WEIGHTS[k] || 1)
    if (w > bestV) {
      bestV = w
      best = k
    }
  }
  if (bestV <= 0 && amounts.stone > 0) return 'stone'
  return best
}

export function pickRichestSample(
  samples: readonly DepositSample[],
  cx: number,
  cy: number,
  radius: number = PROSPECT_RADIUS,
): DepositSample | null {
  const r2 = radius * radius
  let best: DepositSample | null = null
  let bestScore = -Infinity
  for (const s of samples) {
    const dx = s.x - cx
    const dy = s.y - cy
    if (dx * dx + dy * dy > r2) continue
    if (!s.diggable && sampleRichness(s.amounts) <= 0) continue
    const score = sampleRichness(s.amounts) - (Math.abs(dx) + Math.abs(dy)) * 0.35
    if (score > bestScore) {
      bestScore = score
      best = s
    }
  }
  return best
}

export interface ProspectOpts {
  tick: number
  actorId: number
  villageId?: number | null
  x: number
  y: number
  skill?: number
  profession?: string
  lifeTag?: MineLifeTag
  radius?: number
  /** Injected RNG 0..1 — deterministic preferred. */
  roll: number
}

/**
 * Causal discovery: richness + skill + roll => VeinKnowledge.
 * Does not open a mouth; sticky mouth comes from claim/openMouth.
 */
export function tryProspectVein(
  bag: MinesOreBag,
  samples: readonly DepositSample[],
  opts: ProspectOpts,
): VeinKnowledge | null {
  const radius = opts.radius ?? PROSPECT_RADIUS
  const spot = pickRichestSample(samples, opts.x, opts.y, radius)
  if (!spot) return null

  const richness = sampleRichness(spot.amounts)
  if (richness < PROSPECT_RICHNESS_FLOOR) return null

  const existing = bag.veins.find(
    (v) =>
      v.actorId === opts.actorId &&
      Math.abs(v.x - spot.x) + Math.abs(v.y - spot.y) <= 4 &&
      v.status !== 'exhausted',
  )
  if (existing) {
    existing.confidence = Math.min(1, existing.confidence + 0.08)
    existing.richness = Math.max(existing.richness, richness)
    existing.discoveredTick = opts.tick
    return existing
  }

  const skill = Math.max(0, Math.min(1, opts.skill ?? 0.35))
  const profBoost = opts.profession === 'miner' || opts.profession === 'mason' ? 0.18 : 0
  const richnessFactor = Math.min(1, richness / 40)
  const chance = Math.min(
    0.85,
    PROSPECT_BASE_CHANCE + skill * 0.35 + profBoost + richnessFactor * 0.25,
  )
  if (opts.roll > chance) return null

  const vein: VeinKnowledge = {
    id: `vein:${bag.nextVeinId++}`,
    actorId: opts.actorId,
    villageId: opts.villageId ?? null,
    x: spot.x,
    y: spot.y,
    richness,
    primaryOre: primaryOreOf(spot.amounts),
    status: richness >= PROSPECT_RICHNESS_FLOOR * 2 ? 'confirmed' : 'rumor',
    discoveredTick: opts.tick,
    confidence: 0.35 + skill * 0.4 + richnessFactor * 0.2,
    lifeTag: opts.lifeTag ?? 'generic',
  }
  bag.veins.push(vein)
  pushEvent(bag, {
    kind: 'vein_discovered',
    tick: opts.tick,
    veinId: vein.id,
    actorId: opts.actorId,
    villageId: vein.villageId,
    x: vein.x,
    y: vein.y,
    ore: vein.primaryOre,
    amount: richness,
    intensity: Math.min(1, vein.confidence),
    note: 'prospect',
  })
  return vein
}

export function aggregateVeinNear(
  samples: readonly DepositSample[],
  cx: number,
  cy: number,
  radius = 6,
): OreAmounts {
  const out = emptyOreAmounts()
  const r2 = radius * radius
  for (const s of samples) {
    const dx = s.x - cx
    const dy = s.y - cy
    if (dx * dx + dy * dy > r2) continue
    out.iron += s.amounts.iron
    out.gold += s.amounts.gold
    out.copper += s.amounts.copper
    out.tin += s.amounts.tin
    out.lead += s.amounts.lead
    out.silver += s.amounts.silver
    out.coal += s.amounts.coal
    out.stone += s.amounts.stone
  }
  return out
}