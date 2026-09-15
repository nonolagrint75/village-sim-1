import type { TaskKind, Villager } from '../types'
import type { CognitiveGoal, CognitiveGoalId, CognitiveState, NeedPressures, PlanStub, ValueWeights } from './types'
import { selfModelGoalBias } from './selfModel'

const GOAL_LABELS_FR: Record<CognitiveGoalId, string> = {
  survive: 'survivre',
  rest: 'se reposer',
  home: 'avoir un toit',
  wealth: 's’enrichir',
  family: 'protéger les siens',
  mate: 'trouver un compagnon',
  status: 'gagner du prestige',
  community: 'appartenir au groupe',
  explore: 'explorer',
  security: 'se mettre à l’abri',
  craft: 'fabriquer',
  revenge: 'se venger',
  migrate: 'partir ailleurs',
}

export function goalLabelFr(id: CognitiveGoalId): string {
  return GOAL_LABELS_FR[id]
}

export function defaultGoal(v: Villager): CognitiveGoal {
  return {
    id: 'survive',
    score: 1,
    commitment: 10,
    targetId: null,
    targetX: v.x,
    targetY: v.y,
  }
}

/** Map goal → short chain of existing tasks (HTN stub, 2–3 steps). */
export function planForGoal(id: CognitiveGoalId): PlanStub | null {
  const chains: Partial<Record<CognitiveGoalId, TaskKind[]>> = {
    home: ['gatherWood', 'clearLand', 'buildHouse'],
    survive: ['gatherFood', 'eat', 'buildChest'],
    rest: ['rest'],
    wealth: ['mineGold', 'mintCoins', 'tradeRun'],
    security: ['gatherWood', 'clearLand', 'buildProject'],
    craft: ['gatherWood', 'buildWorkbench', 'craftIronTool'],
    family: ['gatherFood', 'giveFood', 'buildBed'],
    mate: ['socialise', 'giveFood', 'buildBed'],
    community: ['gatherWood', 'clearLand', 'buildProject'],
    revenge: ['confront'],
    explore: ['idle', 'fish'],
    migrate: ['idle', 'gatherWood', 'buildHouse'],
    status: ['gatherWood', 'clearLand', 'buildProject'],
  }
  const steps = chains[id]
  if (!steps) return null
  return { goalId: id, steps: [...steps], stepI: 0 }
}

export function scoreGoals(
  needs: NeedPressures,
  values: ValueWeights,
  v: Villager,
  extras: { migrateUrge: number; stress: number; loneliness: number },
  rng: () => number,
): CognitiveGoal[] {
  const noise = () => 0.85 + rng() * 0.3
  const scored: CognitiveGoal[] = [
    {
      id: 'survive',
      score: (needs.hunger * 3.2 + (v.health < 2.2 ? 1.8 : 0) + extras.stress * 0.8) * noise(),
      commitment: 0,
      targetId: null,
      targetX: v.x,
      targetY: v.y,
    },
    {
      id: 'rest',
      score: (needs.fatigue * 2.4 + (v.stamina < 1.2 ? 1.5 : 0)) * noise(),
      commitment: 0,
      targetId: null,
      targetX: v.x,
      targetY: v.y,
    },
    {
      id: 'home',
      score: (needs.shelter * 2.8 + values.security * 0.6) * noise(),
      commitment: 0,
      targetId: null,
      targetX: v.x,
      targetY: v.y,
    },
    {
      id: 'security',
      score: (needs.safety * 2.6 + values.security * 0.9) * noise(),
      commitment: 0,
      targetId: null,
      targetX: v.x,
      targetY: v.y,
    },
    {
      id: 'family',
      score: (needs.social * 0.6 + values.family * 1.4 + (v.hasHome ? 0.3 : 0) + (v.spouseId !== null ? 0.35 : 0)) * noise(),
      commitment: 0,
      targetId: null,
      targetX: v.x,
      targetY: v.y,
    },
    {
      id: 'mate',
      score:
        v.spouseId === null && !v.refusesMarriage && v.age >= 220
          ? (values.family * 1.1 + needs.social * 0.7 + (v.ambition === 'family' ? 0.55 : 0) - values.freedom * 0.4) *
            noise()
          : 0,
      commitment: 0,
      targetId: null,
      targetX: v.x,
      targetY: v.y,
    },
    {
      id: 'community',
      score: (needs.social * 1.5 + extras.loneliness * 1.2 + values.family * 0.3) * noise(),
      commitment: 0,
      targetId: null,
      targetX: v.x,
      targetY: v.y,
    },
    {
      id: 'wealth',
      score: (values.wealth * 1.8 + needs.status * 0.5 + (v.ambition === 'wealth' ? 0.9 : 0)) * noise(),
      commitment: 0,
      targetId: null,
      targetX: v.x,
      targetY: v.y,
    },
    {
      id: 'status',
      score: (needs.status * 1.6 + values.status * 1.2) * noise(),
      commitment: 0,
      targetId: null,
      targetX: v.x,
      targetY: v.y,
    },
    {
      id: 'explore',
      score: (values.freedom * 1.5 + needs.purpose * 0.6 + (v.ambition === 'explorer' ? 1 : 0) - needs.fatigue * 0.8) * noise(),
      commitment: 0,
      targetId: null,
      targetX: v.x,
      targetY: v.y,
    },
    {
      id: 'craft',
      score: (needs.purpose * 1.1 + values.status * 0.4 + (v.hasWorkbench ? 0.4 : 0.2)) * noise(),
      commitment: 0,
      targetId: null,
      targetX: v.x,
      targetY: v.y,
    },
    {
      id: 'revenge',
      score: (v.grudgeTarget !== null ? 2.6 + values.honor * 0.8 : 0) * noise(),
      commitment: 0,
      targetId: v.grudgeTarget,
      targetX: v.x,
      targetY: v.y,
    },
    {
      id: 'migrate',
      score: (extras.migrateUrge * 2.2 + values.freedom * 0.5 - values.family * 0.4) * noise(),
      commitment: 0,
      targetId: null,
      targetX: v.x,
      targetY: v.y,
    },
  ]
  scored.sort((a, b) => b.score - a.score)
  return scored
}

export function pickGoal(mind: CognitiveState, candidates: CognitiveGoal[], personalityAmbition: number): void {
  if (candidates.length === 0) return
  // Identity narrative softly reweights long-horizon goals before commitment.
  for (const c of candidates) {
    c.score *= selfModelGoalBias(mind, c.id)
  }
  candidates.sort((a, b) => b.score - a.score)
  const desired = candidates[0]
  if (!desired) return
  if (mind.goal.id !== desired.id) {
    const currentScore = candidates.find((c) => c.id === mind.goal.id)?.score ?? 0
    const pressure = desired.score - currentScore
    if (mind.goal.commitment <= 0 || pressure > 1.35 || mind.failures >= 5) {
      mind.goal = {
        ...desired,
        commitment: 20 + personalityAmbition * 36,
      }
      mind.plan = planForGoal(desired.id)
      mind.failures = 0
    }
  } else {
    mind.goal.commitment = Math.max(0, mind.goal.commitment - 1)
    mind.goal.score = desired.score
    if (desired.targetId !== null) mind.goal.targetId = desired.targetId
  }
  if (mind.goal.id === 'revenge' && mind.goal.targetId !== null) {
    /* keep target */
  }
}

/** Survival / interrupt tasks that may break a plan without counting as failure. */
const PLAN_INTERRUPTS: ReadonlySet<TaskKind> = new Set([
  'eat',
  'flee',
  'fight',
  'defend',
  'rest',
  'takeFromChest',
])

/** Task multipliers from active goal + values — plan steps gate strongly (not cosmetic). */
export function goalTaskModifier(mind: CognitiveState, kind: TaskKind, targetId: number | null): number {
  let mult = 1
  const table: Record<CognitiveGoalId, Partial<Record<TaskKind, number>>> = {
    survive: { eat: 3.2, gatherFood: 2.4, fish: 1.8, harvestWheat: 1.7, takeFromChest: 2.2, rest: 1.3, buildChest: 1.6 },
    rest: { rest: 3.0, takeFromChest: 1.2, eat: 1.4 },
    home: { buildHouse: 3.0, gatherWood: 1.5, clearLand: 2.4, buildBed: 1.4, buildChest: 1.2 },
    wealth: { tradeRun: 2.2, mineGold: 2.0, mintCoins: 1.8, buyMaterial: 1.4, buildCart: 1.4, buildPort: 1.3, mineTunnel: 1.35 },
    family: { buildHouse: 1.8, buildBed: 2.0, gatherFood: 1.35, giveFood: 1.5, socialise: 1.4 },
    mate: { socialise: 2.4, giveFood: 1.6, buildBed: 1.3, buildHouse: 1.2 },
    status: { buildHouse: 1.5, buildProject: 1.9, buildWall: 1.5, buildPort: 1.35, buildMill: 1.3, craftIronTool: 1.5, gatherWood: 1.35, clearLand: 1.4 },
    community: { socialise: 2.0, giveFood: 1.8, defend: 1.8, buildWall: 1.6, buildProject: 1.55, buildMill: 1.35, buildBridge: 1.3, clearLand: 1.35, gatherWood: 1.3 },
    explore: { idle: 1.5, tameHorse: 1.4, fish: 1.15, tradeRun: 1.25, mineTunnel: 1.2 },
    security: { flee: 2.5, fight: 1.8, defend: 2.1, buildWall: 2.0, buildProject: 1.7, craftSpear: 1.5, craftStoneSpear: 1.6, craftIronTool: 1.7, rest: 1.1, gatherWood: 1.4, clearLand: 1.45 },
    craft: { buildWorkbench: 2, craftSpear: 1.5, craftStoneSpear: 1.6, craftIronTool: 1.8, craftGear: 1.85, weaveCloth: 1.7, sewClothing: 1.5, tanHide: 1.5, grindFlour: 1.4, bakeBread: 1.4, mineTunnel: 1.4 },
    revenge: { confront: 3.0, steal: 1.3, fight: 1.4, socialise: 0.75 },
    migrate: { idle: 2.2, tradeRun: 1.8, tameHorse: 1.5, buildHouse: 1.6, gatherWood: 1.4, clearLand: 1.35, buildProject: 1.45 },
  }
  const g = table[mind.goal.id][kind]
  if (g) mult *= g

  const val = mind.values
  if (kind === 'giveFood') mult *= 1 + val.family * 0.35 + val.honor * 0.2
  if (kind === 'steal') mult *= 1 + val.wealth * 0.45 - val.honor * 0.5
  if (kind === 'socialise') mult *= 1 + val.family * 0.25
  if (kind === 'buildWall' || kind === 'flee' || kind === 'buildProject') mult *= 1 + val.security * 0.35
  if (kind === 'idle' || kind === 'tradeRun') mult *= 1 + val.freedom * 0.3
  if (kind === 'confront' && targetId === mind.goal.targetId) mult *= 1 + val.honor * 0.5

  const plan = mind.plan
  if (plan && plan.goalId === mind.goal.id) {
    const step = plan.steps[plan.stepI]
    const inPlan = plan.steps.includes(kind)
    const commit = Math.min(1, mind.goal.commitment / 40)
    if (step === kind) {
      // Active plan step dominates utility AI — commitment amplifies.
      mult *= 2.4 + commit * 1.2
    } else if (PLAN_INTERRUPTS.has(kind)) {
      mult *= 1.05
    } else if (inPlan) {
      // Later steps of the same plan stay attractive but yield to current step.
      mult *= 0.85
    } else {
      // Off-plan work is strongly suppressed while committed.
      mult *= 0.38 + (1 - commit) * 0.35
    }
  }
  return mult
}

export function advancePlan(mind: CognitiveState, completedKind: TaskKind): void {
  if (!mind.plan) return
  if (mind.plan.steps[mind.plan.stepI] === completedKind) {
    mind.plan.stepI += 1
    if (mind.plan.stepI >= mind.plan.steps.length) mind.plan = null
  }
}

export type ReplanReason = 'stuck' | 'threat' | 'generic'

/**
 * After stuck / flee / failure: lower commitment and rebuild the HTN stub.
 * `threat` is soft (resume interrupted work with awareness); `stuck` replans sooner.
 */
export function replanAfterFailure(mind: CognitiveState, reason: ReplanReason = 'generic'): void {
  if (reason === 'threat') {
    // Interrupted by danger — keep the goal, lightly loosen commitment, prefer security steps.
    mind.goal.commitment = Math.max(0, mind.goal.commitment - 3)
    if (mind.goal.id !== 'security' && mind.goal.commitment < 8) {
      mind.goal.commitment = Math.max(0, mind.goal.commitment - 2)
    }
    if (mind.plan && mind.plan.stepI > 0) {
      // Stay on current plan step so restored task aligns with cognition.
      return
    }
    if (!mind.plan) mind.plan = planForGoal(mind.goal.id)
    return
  }

  const drop = reason === 'stuck' ? 8 : 6
  mind.goal.commitment = Math.max(0, mind.goal.commitment - drop)
  mind.failures += 1
  const rebuildAt = reason === 'stuck' ? 2 : 3
  if (mind.failures >= rebuildAt || mind.goal.commitment <= 4) {
    mind.plan = planForGoal(mind.goal.id)
    if (mind.failures >= 5) {
      mind.goal.commitment = 0
      mind.failures = 0
    }
  } else if (mind.plan) {
    // Soft replan: rewind one step if stuck mid-plan.
    if (mind.plan.stepI > 0 && mind.failures >= (reason === 'stuck' ? 1 : 2)) {
      mind.plan.stepI = Math.max(0, mind.plan.stepI - 1)
    }
  }
}
