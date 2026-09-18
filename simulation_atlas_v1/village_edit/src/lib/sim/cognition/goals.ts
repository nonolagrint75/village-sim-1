import type { TaskKind, Villager } from '../types'
import type { CognitiveGoal, CognitiveGoalId, CognitiveState, NeedPressures, PlanStub, ValueWeights } from './types'
import { selfModelGoalBias } from './selfModel'
import type { HouseholdNeeds } from '../family'

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
    home: ['gatherWood', 'clearLand', 'buildHouse', 'buildBed', 'buildTable', 'sowField', 'buildChest'],
    survive: ['eat', 'gatherFood', 'sowField', 'harvestWheat', 'takeFromChest', 'buildChest'],
    rest: ['eat', 'tendHearth', 'placeCandle', 'rest'],
    wealth: ['mineGold', 'mintCoins', 'tradeRun'],
    security: ['lightTorch', 'gatherFuel', 'gatherWood', 'clearLand', 'buildProject'],
    craft: ['gatherWood', 'buildWorkbench', 'craftLight', 'experiment', 'craftIronTool'],
    family: ['eat', 'gatherFood', 'sowField', 'giveFood', 'tendHearth', 'buildBed'],
    mate: ['socialise', 'giveFood', 'buildBed'],
    community: ['gatherWood', 'clearLand', 'sowField', 'buildProject'],
    revenge: ['confront'],
    explore: ['idle', 'fish'],
    migrate: ['idle', 'gatherWood', 'buildHouse'],
    status: ['gatherWood', 'clearLand', 'sowField', 'buildProject'],
  }
  const steps = chains[id]
  if (!steps) return null
  return { goalId: id, steps: [...steps], stepI: 0 }
}

export function scoreGoals(
  needs: NeedPressures,
  values: ValueWeights,
  v: Villager,
  extras: {
    migrateUrge: number
    stress: number
    loneliness: number
    household?: HouseholdNeeds | null
    /** Hungry kin / spouse for family goal targeting (Phase A audit). */
    familyTargetId?: number | null
  },
  rng: () => number,
): CognitiveGoal[] {
  const noise = () => 0.85 + rng() * 0.3
  const hh = extras.household
  const hhFood = hh?.food ?? 0
  const hhShelter = hh?.shelter ?? 0
  const familyTarget = extras.familyTargetId ?? null
  const scored: CognitiveGoal[] = [
    {
      id: 'survive',
      score:
        (needs.hunger * 4.2 +
          (v.health < 2.2 ? 1.8 : 0) +
          extras.stress * 0.8 +
          (v.hunger < 2 ? 1.2 : 0) +
          hhFood * 1.1) *
        noise(),
      commitment: 0,
      targetId: null,
      targetX: v.x,
      targetY: v.y,
    },
    {
      id: 'rest',
      // When housed, shelter pressure means "go home / sleep", not build another house.
      // Soften rest while hungry so survive/farm goals can win.
      score:
        (needs.fatigue * 2.4 +
          (v.stamina < 1.2 ? 1.5 : 0) +
          (v.hasHome ? needs.shelter * 1.5 : 0) +
          needs.warmth * 1.1) *
        (v.hunger < 1.8 ? 0.45 : 1) *
        noise(),
      commitment: 0,
      targetId: null,
      targetX: v.hasHome ? v.homeX : v.x,
      targetY: v.hasHome ? v.homeY : v.y,
    },
    {
      id: 'home',
      score:
        ((!v.hasHome ? needs.shelter * 2.8 : needs.shelter * 0.35) +
          values.security * 0.6 +
          hhShelter * 1.1) *
        noise(),
      commitment: 0,
      targetId: null,
      targetX: v.x,
      targetY: v.y,
    },
    {
      id: 'security',
      score: (needs.safety * 2.6 + needs.light * 1.8 + needs.warmth * 0.9 + values.security * 0.9) * noise(),
      commitment: 0,
      targetId: null,
      targetX: v.x,
      targetY: v.y,
    },
    {
      id: 'family',
      score:
        (needs.social * 0.6 +
          values.family * 1.4 +
          (v.hasHome ? 0.3 : 0) +
          (v.spouseId !== null ? 0.35 : 0) +
          hhFood * 1.35 +
          hhShelter * 0.55) *
        noise(),
      commitment: 0,
      targetId: familyTarget,
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
      score:
        (needs.purpose * 1.1 +
          needs.creative * 0.45 +
          needs.boredom * 0.25 +
          values.status * 0.4 +
          (v.hasWorkbench ? 0.4 : 0.2)) *
        noise(),
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
  // WP9: when survival stable, nudge secondary goals so survive isn't the only sticky id.
  // Reweights existing scores only — no fake entropy / new TaskKinds; anti-AFK untouched.
  const survivalStable =
    needs.hunger < 0.38 && extras.stress < 0.48 && v.hunger >= 2.6 && v.health >= 2.4
  if (survivalStable) {
    for (const c of scored) {
      if (c.id === 'survive') {
        if (needs.hunger < 0.25) c.score *= 0.85
        continue
      }
      if (
        c.id === 'craft' ||
        c.id === 'explore' ||
        c.id === 'community' ||
        c.id === 'wealth' ||
        c.id === 'status' ||
        c.id === 'family' ||
        c.id === 'home'
      ) {
        c.score *= 1.12
      }
    }
  }
  // Agent 9 — soft rest-goal damp when productive (fed + stamina OK) and not night-boosted.
  // Proxy (no tick in scoreGoals): nightFatigue in needs.ts adds ≥0.22 → fatigue > base+0.15.
  // Thresholds: hunger need <0.38, v.hunger ≥2.6, stamina ≥2.0, fatigue <0.5, !nightish → ×0.68.
  {
    const baseFatigue = Math.max(0, (4 - v.stamina) / 4)
    const nightishFatigue = needs.fatigue > baseFatigue + 0.15
    if (
      needs.hunger < 0.38 &&
      v.hunger >= 2.6 &&
      v.stamina >= 2.0 &&
      needs.fatigue < 0.5 &&
      !nightishFatigue
    ) {
      for (const c of scored) {
        if (c.id === 'rest') c.score *= 0.68
      }
    }
  }
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
  'lightTorch',
  'tendHearth',
  'placeCandle',
])

/** Task multipliers from active goal + values — plan steps gate strongly (not cosmetic). */
export function goalTaskModifier(mind: CognitiveState, kind: TaskKind, targetId: number | null): number {
  let mult = 1
  const table: Record<CognitiveGoalId, Partial<Record<TaskKind, number>>> = {
    survive: {
      eat: 3.4,
      gatherFood: 2.5,
      fish: 1.9,
      sowField: 2.3,
      harvestWheat: 2.1,
      clearLand: 2.2,
      takeFromChest: 2.3,
      rest: 0.85,
      buildChest: 1.5,
      lightTorch: 1.5,
      tendHearth: 1.4,
      gatherFuel: 1.35,
    },
    rest: { eat: 2.4, rest: 2.6, tendHearth: 2.2, placeCandle: 1.8, takeFromChest: 1.5, socialise: 0.45 },
    home: {
      buildHouse: 3.0,
      gatherWood: 1.5,
      clearLand: 2.8,
      sowField: 1.8,
      harvestWheat: 1.4,
      buildBed: 1.4,
      buildChest: 1.2,
      buildTable: 1.3,
      buildHearth: 1.6,
      eat: 1.6,
      rest: 1.5,
    },
    wealth: { tradeRun: 2.2, mineGold: 2.0, mintCoins: 1.8, buyMaterial: 1.4, buildCart: 1.4, buildPort: 1.3, mineTunnel: 1.35 },
    family: {
      buildHouse: 1.8,
      buildBed: 2.0,
      buildTable: 1.35,
      gatherFood: 1.5,
      sowField: 1.9,
      harvestWheat: 1.6,
      eat: 2.0,
      giveFood: 1.5,
      socialise: 1.4,
      tendHearth: 1.5,
      placeCandle: 1.3,
    },
    mate: { socialise: 2.4, giveFood: 1.6, buildBed: 1.3, buildHouse: 1.2, buildTable: 1.15, eat: 1.3 },
    status: {
      buildHouse: 1.5,
      buildProject: 1.9,
      buildWall: 1.5,
      buildPort: 1.35,
      buildMill: 1.3,
      craftIronTool: 1.5,
      gatherWood: 1.35,
      clearLand: 1.4,
      sowField: 1.55,
      harvestWheat: 1.35,
      buildTable: 1.2,
      eat: 1.25,
    },
    community: {
      socialise: 2.0,
      giveFood: 1.8,
      defend: 1.8,
      buildWall: 1.6,
      buildProject: 1.55,
      buildMill: 1.35,
      buildBridge: 1.3,
      clearLand: 1.35,
      sowField: 1.6,
      harvestWheat: 1.4,
      gatherWood: 1.3,
      eat: 1.3,
    },
    explore: { idle: 1.5, tameHorse: 1.4, fish: 1.15, tradeRun: 1.25, mineTunnel: 1.2, eat: 1.2, lightTorch: 1.35 },
    security: {
      flee: 2.5,
      fight: 1.8,
      defend: 2.1,
      buildWall: 2.0,
      buildProject: 1.7,
      craftSpear: 1.5,
      craftStoneSpear: 1.6,
      craftIronTool: 1.7,
      rest: 1.1,
      gatherWood: 1.4,
      clearLand: 1.45,
      eat: 1.35,
      lightTorch: 2.4,
      placeCandle: 2.0,
      tendHearth: 2.1,
      gatherFuel: 1.9,
      craftLight: 1.85,
    },
    craft: {
      buildWorkbench: 2,
      buildTable: 1.25,
      craftSpear: 1.5,
      craftStoneSpear: 1.6,
      craftIronTool: 1.8,
      craftGear: 1.85,
      craftLight: 2.1,
      experiment: 2.4,
      weaveCloth: 1.7,
      sewClothing: 1.5,
      tanHide: 1.5,
      grindFlour: 1.4,
      bakeBread: 1.4,
      mineTunnel: 1.4,
      sowField: 1.25,
      eat: 1.3,
    },
    revenge: { confront: 3.0, steal: 1.3, fight: 1.4, socialise: 0.75, eat: 1.2 },
    migrate: {
      idle: 2.2,
      tradeRun: 1.8,
      tameHorse: 1.5,
      buildHouse: 1.6,
      gatherWood: 1.4,
      clearLand: 1.35,
      buildProject: 1.45,
      eat: 1.25,
      lightTorch: 1.4,
    },
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
    // Repeated failures on the current step → loosen gate so livelihood alternatives can win.
    const stuckStep = mind.failures >= 2
    const crisis = mind.needs.hunger > 0.55 || mind.needs.safety > 0.55 || mind.emotions.fear > 0.7
    if (step === kind) {
      // Active plan step dominates utility AI — stronger when safe so goals aren't cosmetic.
      const stepBoost = crisis ? 2.4 + commit * 1.2 : 2.75 + commit * 1.45
      mult *= stuckStep ? 1.35 : stepBoost
    } else if (PLAN_INTERRUPTS.has(kind)) {
      mult *= crisis ? 1.05 : 1.12
    } else if (inPlan) {
      // Later steps of the same plan stay attractive but yield to current step.
      mult *= stuckStep ? 1.05 : crisis ? 0.85 : 0.95
    } else {
      // Off-plan work is suppressed while committed — but not crushed (was ~0.38 → perpetual gatherFood lock).
      // Outside crisis, leave more room for goal-aligned livelihood vs pure habit.
      const floor = stuckStep ? 0.72 : crisis ? 0.55 : 0.64
      mult *= floor + (1 - commit) * (crisis ? 0.35 : 0.28)
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

/** Skip a plan step that keeps failing so agents leave gatherFood/idle locks. */
export function skipStuckPlanStep(mind: CognitiveState, failedKind: TaskKind): void {
  if (!mind.plan || mind.plan.goalId !== mind.goal.id) return
  if (mind.plan.steps[mind.plan.stepI] !== failedKind) return
  if (mind.failures < 2) return
  mind.plan.stepI += 1
  if (mind.plan.stepI >= mind.plan.steps.length) {
    mind.plan = planForGoal(mind.goal.id)
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
