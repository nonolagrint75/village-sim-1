/**
 * Phase B — career mobility facades over live careers / professionFactors / livelihood.
 * Does NOT create a second decision engine: scores come from computeProfessionChoice.
 */
import { relationDecisionBias } from '../cognition/decide'
import type { ProceduralSkill } from '../cognition/types'
import { mindOf } from '../cognition/mindPool'
import { getHouseholdNeeds } from '../family'
import {
  occupationOf,
  suggestOccupationShift,
  type OccupationId,
  type OccupationShiftSuggestion,
} from '../economy/occupationBridge'
import { professionLockInBonus } from '../politics'
import type { Profession, SimState, Villager } from '../types'
import { distance } from '../world'

const PROF_SKILLS: Partial<Record<Profession, ProceduralSkill[]>> = {
  farmer: ['farm'],
  forager: ['farm'],
  fisher: ['fish'],
  miller: ['craft'],
  lumberjack: ['chop'],
  mason: ['build'],
  builder: ['build'],
  blacksmith: ['craft'],
  miner: ['mine'],
  weaver: ['craft'],
  trader: ['trade'],
  guard: ['fight'],
  herder: ['farm'],
}

const FOOD_JOBS: ReadonlySet<Profession> = new Set([
  'farmer',
  'forager',
  'fisher',
  'miller',
  'herder',
])

export interface JobOpportunity {
  jobType: Profession
  employer: number | null
  location: { x: number; y: number }
  /** Soft wage proxy from profession score (not a parallel currency). */
  wage: number
  distance: number
  requiredSkills: ProceduralSkill[]
  risk: number
  prestige: number
  availability: number
  score: number
  deltaVsCurrent: number
  /** Relation bias if a nearby practitioner referred the role (1 = neutral). */
  relationBias: number
}

export function getCurrentOccupation(npc: Villager): OccupationId {
  return occupationOf(npc)
}

function findNearbyPractitioner(
  state: SimState,
  npc: Villager,
  job: Profession,
): { id: number; dist: number; x: number; y: number } | null {
  let best: { id: number; dist: number; x: number; y: number } | null = null
  let scanned = 0
  for (let i = 0; i < state.villagers.length; i++) {
    const o = state.villagers[i]
    if (!o || !o.alive || o.id === npc.id) continue
    if (o.villageId !== npc.villageId && npc.villageId != null) continue
    if (o.profession !== job) continue
    const d = distance(npc.x, npc.y, o.x, o.y)
    if (d > 36) continue
    scanned++
    if (scanned > 16) break
    if (!best || d < best.dist) best = { id: o.id, dist: d, x: o.x, y: o.y }
  }
  return best
}

function skillGap(npc: Villager, job: Profession): number {
  const keys = PROF_SKILLS[job]
  if (!keys || keys.length === 0) return 0.25
  try {
    const skills = mindOf(npc).skills
    let sum = 0
    for (const k of keys) sum += skills[k] ?? 0
    return Math.max(0, 1 - sum / keys.length)
  } catch {
    return 0.35
  }
}

/**
 * Ranked local job opportunities from the existing profession score stack.
 * Cap <=16 candidates (performance budget).
 */
export function getJobOpportunities(
  state: SimState,
  npc: Villager,
  max = 8,
): JobOpportunity[] {
  const cap = Math.min(16, Math.max(1, max))
  const ranked = suggestOccupationShift(npc, state).slice(0, 16)
  const out: JobOpportunity[] = []
  for (const row of ranked) {
    if (out.length >= cap) break
    const mentor = findNearbyPractitioner(state, npc, row.profession)
    const loc = mentor
      ? { x: mentor.x, y: mentor.y }
      : { x: npc.x, y: npc.y }
    const dist = mentor?.dist ?? 0
    const gap = skillGap(npc, row.profession)
    let relationBias = 1
    if (mentor) {
      relationBias = relationDecisionBias(state, npc, mentor.id, 'socialise')
    }
    const wage = Math.max(0, row.score) * (0.85 + Math.min(0.35, relationBias * 0.15))
    const risk =
      row.profession === 'guard' || row.profession === 'miner'
        ? 0.35 + gap * 0.25
        : 0.12 + gap * 0.2
    const prestige =
      row.profession === 'blacksmith' || row.profession === 'trader' || row.profession === 'builder'
        ? 0.55
        : row.profession === 'guard'
          ? 0.4
          : 0.28
    out.push({
      jobType: row.profession,
      employer: mentor?.id ?? null,
      location: loc,
      wage,
      distance: dist,
      requiredSkills: PROF_SKILLS[row.profession] ?? [],
      risk,
      prestige,
      availability: Math.max(0.05, 1 - gap * 0.7),
      score: row.score,
      deltaVsCurrent: row.deltaVsCurrent,
      relationBias,
    })
  }
  return out
}

export interface CareerChangeEval {
  shouldChange: boolean
  lock: number
  threshold: number
  householdPull: number
  opportunity: JobOpportunity | null
  suggestion: OccupationShiftSuggestion | null
}

/**
 * Evaluate whether npc should switch toward opportunity (or best if omitted).
 * Reuses professionLockInBonus + household pressure — no parallel engine.
 */
export function evaluateCareerChange(
  state: SimState,
  npc: Villager,
  opportunity?: JobOpportunity | null,
): CareerChangeEval {
  const opps = opportunity ? [opportunity] : getJobOpportunities(state, npc, 6)
  const best =
    opps.find((o) => o.jobType !== npc.profession && o.deltaVsCurrent > 0) ?? opps[0] ?? null
  if (!best || best.jobType === npc.profession) {
    return {
      shouldChange: false,
      lock: 0,
      threshold: 1,
      householdPull: 0,
      opportunity: best,
      suggestion: null,
    }
  }

  const lock = professionLockInBonus(state, npc, npc.profession, best.jobType)
  const hh = getHouseholdNeeds(state, npc)
  let householdPull = 0
  if (hh.food > 0.4 && FOOD_JOBS.has(best.jobType)) {
    householdPull += 0.1 + hh.food * 0.12
  }
  if (hh.wealth < 3 && best.deltaVsCurrent > 3) {
    householdPull += 0.06
  }
  if (hh.size >= 3 && best.distance > 22) {
    householdPull -= 0.08
  }

  let unemployed = 0
  let specialized = false
  try {
    const live = mindOf(npc).livelihood
    unemployed = live?.unemployedStreak ?? 0
    specialized = !!(live?.roleTag && !String(live.roleTag).startsWith('legacy_'))
  } catch {
    /* cold mind */
  }

  const skillBlock = skillGap(npc, best.jobType)
  const skillInertia = skillBlock > 0.55 ? skillBlock * 0.18 : 0

  const threshold =
    0.28 +
    npc.personality.curiosity * 0.22 -
    Math.min(0.28, unemployed * 0.0025) -
    (specialized ? 0.14 : 0) +
    npc.personality.ambition * 0.06 -
    householdPull +
    skillInertia +
    Math.max(0, (best.risk - 0.2) * 0.15) -
    Math.max(0, (best.relationBias - 1) * 0.12)

  const shouldChange = lock < threshold && best.deltaVsCurrent >= 2.5 && best.availability >= 0.28

  return {
    shouldChange,
    lock,
    threshold,
    householdPull,
    opportunity: best,
    suggestion: {
      profession: best.jobType,
      score: best.score,
      deltaVsCurrent: best.deltaVsCurrent,
      isCurrent: false,
      factors: [],
    },
  }
}
/** Observability only — does not mutate simulation. */
export function careerMetricsSnapshot(state: SimState): {
  career_changes: number
  job_opportunities_sampled: number
  profession_multi_factor: number
} {
  const c = state.attributionCounters
  return {
    career_changes: c?.professionChanges ?? 0,
    job_opportunities_sampled: 0,
    profession_multi_factor: c?.professionChangesMultiFactor ?? 0,
  }
}
