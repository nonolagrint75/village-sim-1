/**
 * Theory of mind lite — models of others’ goals / trust used in social acts.
 * Not full recursive ToM; soft inferred goals from observable cues.
 */

import type { SimState, Villager } from '../types'
import type { CognitiveGoalId, SocialImpression } from './types'
import { impressionOf } from './memory'

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v))
}

const TASK_TO_GOAL: Partial<Record<string, CognitiveGoalId>> = {
  eat: 'survive',
  gatherFood: 'survive',
  fish: 'survive',
  harvestWheat: 'survive',
  rest: 'rest',
  buildHouse: 'home',
  buildBed: 'home',
  clearLand: 'home',
  tradeRun: 'wealth',
  mintCoins: 'wealth',
  mineGold: 'wealth',
  socialise: 'community',
  giveFood: 'family',
  defend: 'security',
  fight: 'security',
  flee: 'security',
  buildWall: 'security',
  confront: 'revenge',
  craftIronTool: 'craft',
  buildWorkbench: 'craft',
}

/** Infer other’s likely goal from task + hunger/stamina cues. */
export function inferOtherGoal(other: Villager): { goal: CognitiveGoalId; conf: number } {
  const task = other.task?.kind
  if (task && TASK_TO_GOAL[task]) {
    return { goal: TASK_TO_GOAL[task]!, conf: 0.55 + (other.hunger < 1.5 ? 0.15 : 0) }
  }
  if (other.hunger < 1.4) return { goal: 'survive', conf: 0.7 }
  if (other.stamina < 1.2) return { goal: 'rest', conf: 0.55 }
  if (!other.hasHome) return { goal: 'home', conf: 0.4 }
  if (other.grudgeTarget !== null) return { goal: 'revenge', conf: 0.45 }
  return { goal: 'community', conf: 0.25 }
}

/** Update ToM impressions for nearby others (deep path / social acts). */
export function refreshTheoryOfMind(
  state: SimState,
  v: Villager,
  model: SocialImpression[],
  nearby: Villager[],
  tick: number,
): void {
  for (const o of nearby) {
    const imp = impressionOf(model, o.id)
    const inferred = inferOtherGoal(o)
    // Soft blend — don’t thrash every tick.
    if (!imp.inferredGoal || inferred.conf >= imp.goalConf * 0.85) {
      imp.inferredGoal = inferred.goal
      imp.goalConf = clamp01(imp.goalConf * 0.6 + inferred.conf * 0.4)
    } else {
      imp.goalConf = clamp01(imp.goalConf * 0.97)
    }
    // Trust drift from reliability of their acts toward us.
    const rel = v.relations.get(o.id)
    if (rel) {
      imp.trust = clamp01(imp.trust * 0.98 + (rel.trust ?? 0.25) * 0.02)
      imp.affection = clamp01(imp.affection * 0.985 + Math.max(0, rel.affinity) * 0.015)
      if ((rel.grudge ?? 0) > 0.4) imp.fear = clamp01(imp.fear + 0.02)
    }
    imp.lastTick = tick
  }
  void state
}

/**
 * Action bias from believing what the other wants.
 * socialise/trade with trusted allies; confront/steal when trust low / goals clash.
 */
export function tomActionBias(
  imp: SocialImpression | undefined,
  kind: string,
): number {
  if (!imp) return 1
  let m = 1
  const g = imp.inferredGoal
  const conf = imp.goalConf
  if (kind === 'socialise') {
    m *= 1 + imp.affection * 0.3 + imp.trust * 0.25 - imp.fear * 0.35
    if (g === 'community' || g === 'family' || g === 'mate') m *= 1 + conf * 0.2
    if (g === 'revenge') m *= 1 - conf * 0.35
  }
  if (kind === 'giveFood') {
    m *= 1 + imp.affection * 0.25 + imp.trust * 0.2
    if (g === 'survive' || g === 'family') m *= 1 + conf * 0.35
  }
  if (kind === 'tradeRun' || kind === 'buyMaterial') {
    m *= 1 + imp.trust * 0.3 - imp.fear * 0.2
    if (g === 'wealth') m *= 1 + conf * 0.15
  }
  if (kind === 'confront' || kind === 'steal') {
    m *= 1 + (1 - imp.trust) * 0.4 + imp.fear * 0.12
    if (g === 'revenge') m *= 1 + conf * 0.25
    if (g === 'survive' && kind === 'steal') m *= 1 - conf * 0.2 // less steal from starving ally
  }
  if (kind === 'defend' && (g === 'security' || g === 'family')) {
    m *= 1 + conf * 0.2 + imp.affection * 0.15
  }
  return m
}
