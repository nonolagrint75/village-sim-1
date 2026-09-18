/**
 * Phase 7 WAVE 2 - occupation bridge over live Profession / professionFactors.
 * READ-ONLY data helpers. Does NOT call applyProfessionChange / careers writers.
 *
 * INTEGRATION NOTE (orchestrator): re-export from economy/index.ts once via
 *   export ... from './wave2Occupations'
 * Do not dual-edit index while production WAVE2 also touches it.
 */
import { mindOf } from '../cognition/mindPool'
import type { ProceduralSkill } from '../cognition/types'
import { computeProfessionChoice, factorsForProfession } from '../professionFactors'
import type { Profession, SimState, Villager } from '../types'
import { demandFromVillager, topDemand, type DemandTag, type DemandUrgency } from './needsDemand'

/** Alias of live Profession - not a parallel EconomicProfession type. */
export type OccupationId = Profession

const SKILL_KEYS: readonly ProceduralSkill[] = [
  'chop',
  'build',
  'trade',
  'fish',
  'mine',
  'craft',
  'farm',
  'fight',
  'social',
]

const SHIFT_JOBS: readonly Profession[] = [
  'forager',
  'farmer',
  'fisher',
  'miller',
  'lumberjack',
  'mason',
  'guard',
  'builder',
  'herder',
  'trader',
  'weaver',
  'blacksmith',
  'miner',
]

/** Current occupation (live v.profession). */
export function occupationOf(v: Villager): OccupationId {
  return v.profession
}

/** Compact motive stamp: demand tags + notable skills + current job. */
export type EconomicMotiveTag =
  | `demand:${DemandTag}`
  | `skill:${ProceduralSkill}`
  | `job:${Profession}`

export interface EconomicMotives {
  occupation: OccupationId
  demand: DemandUrgency
  topDemand: DemandTag | null
  /** Skills at or above 0.2, highest first. */
  skillHighlights: Array<{ skill: ProceduralSkill; level: number }>
  tags: EconomicMotiveTag[]
}

/**
 * Read-only motives from profession + mind.skills + demandFromVillager.
 * Pure observation - no career mutation.
 */
export function economicMotiveTags(v: Villager): EconomicMotives {
  const occupation = occupationOf(v)
  const demand = demandFromVillager(v)
  const dominant = topDemand(demand)
  const skills = mindOf(v).skills

  const skillHighlights = SKILL_KEYS.map((skill) => ({ skill, level: skills[skill] }))
    .filter((s) => s.level >= 0.2)
    .sort((a, b) => b.level - a.level)

  const tags: EconomicMotiveTag[] = []
  if (occupation !== 'none') tags.push(`job:${occupation}`)
  for (const tag of Object.keys(demand) as DemandTag[]) {
    if (demand[tag] >= 0.25) tags.push(`demand:${tag}`)
  }
  for (const s of skillHighlights.slice(0, 4)) {
    tags.push(`skill:${s.skill}`)
  }

  return { occupation, demand, topDemand: dominant, skillHighlights, tags }
}

/** Scored alternative occupation - DATA ONLY. */
export interface OccupationShiftSuggestion {
  profession: Profession
  score: number
  /** score - currentProfessionScore (negative if worse than current). */
  deltaVsCurrent: number
  isCurrent: boolean
  /** Factor hits for this profession (read-only professionFactors). */
  factors: ReturnType<typeof factorsForProfession>['factors']
}

/**
 * Suggest occupation alternatives using the same score stack as DP5 explainability
 * (computeProfessionChoice / professionFactors) - READ-ONLY.
 *
 * Does NOT call applyProfessionChange. Returns ranked DATA only.
 * Integrator: after applyCareerDemandToScores, also call careers.applyPersonalDemandNudge,
 * then optionally prefer topOccupationShift when deltaVsCurrent clears a threshold.
 */
export function suggestOccupationShift(v: Villager, state: SimState): OccupationShiftSuggestion[] {
  const choice = computeProfessionChoice(state, v)
  const current = occupationOf(v)
  const currentScore = choice.scores[current] ?? 0

  const out: OccupationShiftSuggestion[] = []
  for (const profession of SHIFT_JOBS) {
    const score = choice.scores[profession] ?? 0
    const { factors } = factorsForProfession(state, v, profession)
    out.push({
      profession,
      score,
      deltaVsCurrent: score - currentScore,
      isCurrent: profession === current,
      factors,
    })
  }

  out.sort((a, b) => b.score - a.score || a.profession.localeCompare(b.profession))
  return out
}

/**
 * Best non-current occupation with positive delta, or null.
 * Convenience for decision wiring — still DATA only (no applyProfessionChange).
 */
export function topOccupationShift(
  v: Villager,
  state: SimState,
  minDelta = 4,
): OccupationShiftSuggestion | null {
  const ranked = suggestOccupationShift(v, state)
  for (const row of ranked) {
    if (row.isCurrent) continue
    if (row.deltaVsCurrent >= minDelta) return row
  }
  return null
}
