/**
 * Phase 7 WAVE 1 - skill practice hooks over existing mind.skills.
 * Does NOT rewrite teach / noteTeachCraftEvent; reuses ProceduralSkills in place.
 *
 * Hook (integrator later): after a successful economy practice bump, call
 *   noteTeachLaterUse(state, v.id, practicedSkill, contextKind)
 * so teachTrueLaterUses continues to count true teach->reuse chains
 * (see causalityMetrics.noteTeachLaterUse - productive skills only).
 * Do not invent a parallel EconomicSkill type.
 */
import { practiceSkill as practiceSkillByTask, skillForTask } from '../cognition/memory'
import { mindOf } from '../cognition/mindPool'
import type { ProceduralSkill, ProceduralSkills } from '../cognition/types'
import type { Villager } from '../types'

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

function isProceduralSkill(key: string): key is ProceduralSkill {
  return (SKILL_KEYS as readonly string[]).includes(key)
}

/** Resolve a skill key or task kind to a ProceduralSkill, or null if unknown. */
export function resolveSkillKey(skillKey: string): ProceduralSkill | null {
  if (isProceduralSkill(skillKey)) return skillKey
  return skillForTask(skillKey)
}

/**
 * Bump an existing mind.skills channel by amount (clamped to [0, 1]).
 *
 * skillKey may be a ProceduralSkill id (craft, farm, ...) or a task kind
 * that skillForTask already maps (same path as cognition practice).
 *
 * For boolean success/fail ticks that mirror labor outcomes, prefer
 * practiceSkillFromTask which delegates to cognition practiceSkill.
 *
 * @returns the skill that was practiced, or null if unmapped.
 */
export function practiceSkill(
  v: Villager,
  skillKey: string,
  amount: number,
): ProceduralSkill | null {
  const sk = resolveSkillKey(skillKey)
  if (!sk) return null
  const skills: ProceduralSkills = mindOf(v).skills
  const delta = Number.isFinite(amount) ? amount : 0
  if (delta === 0) return sk
  skills[sk] = Math.max(0, Math.min(1, skills[sk] + delta))
  // HOOK teachTrueLaterUses: when wired from a SimState tick, call
  // noteTeachLaterUse(state, v.id, sk, skillKey) after a positive productive bump.
  return sk
}

/**
 * Thin alias of cognition practiceSkill(skills, taskKind, success) via the villager mind.
 * Keeps labor / teach outcome semantics identical to the existing teach path.
 */
export function practiceSkillFromTask(
  v: Villager,
  taskKind: string,
  success: boolean,
): ProceduralSkill | null {
  return practiceSkillByTask(mindOf(v).skills, taskKind, success)
}

/** Read current skill level (0-1), or 0 if key/task is unknown. */
export function skillLevel(v: Villager, skillKey: string): number {
  const sk = resolveSkillKey(skillKey)
  if (!sk) return 0
  return mindOf(v).skills[sk]
}
