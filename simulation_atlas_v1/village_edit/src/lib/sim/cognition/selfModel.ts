/**
 * Soft self-model / identity narrative.
 * Biases long-term goals — not a scripted character sheet.
 */

import { creedLabel, politicsOf } from '../politics'
import type { Villager } from '../types'
import type { CognitiveGoalId, CognitiveState, SelfModel } from './types'

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v))
}

export function emptySelfModel(): SelfModel {
  return {
    name: '',
    lineage: null,
    creed: null,
    livelihood: null,
    narrative: '',
    strength: 0.2,
  }
}

/** Refresh identity narrative from current life facts (cheap). */
export function updateSelfModel(v: Villager, mind: CognitiveState): void {
  const pol = politicsOf(v)
  const creed = creedLabel(pol.creed)
  const lineage = v.surname?.trim() || null
  const livelihood =
    v.profession !== 'none'
      ? v.profession
      : mind.cultureTag
        ? `culture ${mind.cultureTag}`
        : null
  const bits: string[] = [v.name]
  if (lineage) bits.push(`des ${lineage}`)
  if (livelihood) bits.push(livelihood)
  if (creed && creed !== 'aucune') bits.push(creed)
  const narrative = bits.join(' · ')
  const strength = clamp01(
    0.2 +
      (lineage ? 0.15 : 0) +
      (livelihood ? 0.2 : 0) +
      (pol.creedWeight > 0.35 ? 0.15 : 0) +
      mind.cultureWeight * 0.25 +
      (v.hasHome ? 0.08 : 0),
  )
  mind.selfModel = {
    name: v.name,
    lineage,
    creed: pol.creed ? creed : null,
    livelihood,
    narrative,
    strength,
  }
}

/** Soft prior on long-horizon goals from who I take myself to be. */
export function selfModelGoalBias(mind: CognitiveState, goalId: CognitiveGoalId): number {
  const s = mind.selfModel
  if (!s || s.strength < 0.15) return 1
  const w = s.strength
  let m = 1
  const live = s.livelihood ?? ''
  if (goalId === 'family' || goalId === 'mate') m *= 1 + (s.lineage ? 0.2 : 0) * w
  if (goalId === 'community') m *= 1 + (s.creed || mind.cultureTag ? 0.18 : 0) * w
  if (goalId === 'craft' || goalId === 'wealth') {
    if (/fer|bois|blé|trade|trader|blacksmith|lumberjack|farmer|miner/.test(live)) m *= 1 + 0.22 * w
  }
  if (goalId === 'security' || goalId === 'revenge') {
    if (/sang|guard|ordre|vengeance|protection/.test(`${live} ${s.creed ?? ''}`)) m *= 1 + 0.2 * w
  }
  if (goalId === 'migrate') m *= 1 - (s.lineage ? 0.12 : 0) * w
  return m
}

export function selfModelTaskBias(mind: CognitiveState, kind: string): number {
  const s = mind.selfModel
  if (!s || s.strength < 0.2) return 1
  const w = s.strength * 0.35
  const live = s.livelihood ?? ''
  let m = 1
  if (/lumberjack|bois/.test(live) && (kind === 'gatherWood' || kind === 'clearLand')) m *= 1 + w
  if (/farmer|blé|miller/.test(live) && (kind === 'sowField' || kind === 'harvestWheat')) m *= 1 + w
  if (/trader|sel/.test(live) && (kind === 'tradeRun' || kind === 'mintCoins')) m *= 1 + w
  if (/guard|sang/.test(live) && (kind === 'defend' || kind === 'fight' || kind === 'buildWall')) m *= 1 + w
  if (/fisher|voile/.test(live) && (kind === 'fish' || kind === 'buildBoat')) m *= 1 + w
  if (s.creed && (kind === 'socialise' || kind === 'giveFood' || kind === 'rest')) m *= 1 + w * 0.5
  return m
}
