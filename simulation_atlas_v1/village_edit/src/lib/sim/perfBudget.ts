/**
 * Adaptive sim performance budget — single-writer (sim worker).
 * Shrinks hot-path work when TPS drops; expands when headroom returns.
 * Cognition deep-share lives here too so LOD stays coherent.
 *
 * Target (Simulation Atlas v1 final): ~100 ticks/sec on Max path.
 * LOD may thin distant/non-crisis agents — never replace NPCs with fake aggregates.
 */

export type SimPerfBudget = {
  /** Base deep cognition period (higher = fewer deep thinks). */
  deepPeriod: number
  popScale: number
  deepShare: number
  lastTps: number
  /** 0–1 spare CPU. */
  headroom: number
  preferGpu: boolean
  /** Multiplier on A* node/search budgets (0.55–1.25). */
  pathScale: number
  /** Multiplier on climate refresh periods (1–3). */
  climatePeriodMul: number
  /** Multiplier on commerce tick spacing (1–2). */
  commercePeriodMul: number
  /** When true, politics skips half of circle soft work. */
  politicsStagger: boolean
  /** When true, UI skips lineages/cultures this pack. */
  uiLight: boolean
  /** Suggested UI pack interval ms. */
  uiIntervalMs: number
  /** Suggested main-thread draw interval ms. */
  drawIntervalMs: number
  /** Extra ticks on THINK_COOLDOWN under load (0–4). */
  thinkCooldownExtra: number
}

/** Set once per tick in stepSimulation — avoids O(n²) alive recount in cognition LOD. */
let aliveAgentCount = 40

/**
 * WP9: when famine/crisis pressure is on, floor deepShare so LOD thinning
 * does not freeze goals/plans for the whole population (still ≪ 1).
 */
let crisisDeepPressure = false
const DEEP_SHARE_CRISIS_FLOOR = 0.3

export function setAliveAgentCount(n: number): void {
  aliveAgentCount = Math.max(1, n)
}

export function getAliveAgentCount(): number {
  return aliveAgentCount
}

/** Engine / famine tick — enables crisis deepShare floor (not deepShare=1). */
export function setCrisisDeepPressure(on: boolean): void {
  crisisDeepPressure = on
}

export function getCrisisDeepPressure(): boolean {
  return crisisDeepPressure
}

function effectiveDeepShare(): number {
  const share = budget.deepShare
  if (crisisDeepPressure && share < DEEP_SHARE_CRISIS_FLOOR) return DEEP_SHARE_CRISIS_FLOOR
  return share
}

const budget: SimPerfBudget = {
  deepPeriod: 10,
  popScale: 1,
  deepShare: 0.48,
  lastTps: 8,
  headroom: 0.5,
  preferGpu: true,
  pathScale: 0.95,
  climatePeriodMul: 1.15,
  commercePeriodMul: 1.1,
  politicsStagger: false,
  uiLight: false,
  uiIntervalMs: 400,
  drawIntervalMs: 16,
  thinkCooldownExtra: 0,
}

/** Field growth scan stride — rises under Max load (still covers all cells over STRIDE ticks). */
export function fieldGrowthStride(): number {
  if (budget.lastTps > 0 && budget.lastTps < 70) return 12
  if (budget.lastTps > 0 && budget.lastTps < 90) return 8
  if (budget.headroom < 0.35) return 6
  return 4
}

/** Final Max-speed target (worker also has TARGET_TPS = 100). */
export const TARGET_SIM_TPS = 100
/** Below this → aggressive LOD (still causal agents). */
const TPS_LOW = 45
/** Comfortable Max path. */
const TPS_OK = 80
/** At/above target — restore depth. */
const TPS_HIGH = 100

let uiLightFlip = false
/** EMA of measured TPS — LOD decisions use this to kill 1s slice thrash. */
let smoothedTps = 8

/**
 * Called from sim.worker each second with measured ticks/sec.
 */
export function noteSimTps(tps: number): void {
  smoothedTps = smoothedTps * 0.6 + tps * 0.4
  budget.lastTps = smoothedTps
  const lod = smoothedTps
  if (lod < TPS_LOW) {
    budget.headroom = Math.max(0, budget.headroom - 0.1)
    budget.deepPeriod = Math.min(24, budget.deepPeriod + 1)
    budget.deepShare = Math.max(0.18, budget.deepShare - 0.05)
    budget.preferGpu = lod > 20
    budget.pathScale = Math.max(0.45, budget.pathScale - 0.08)
    budget.climatePeriodMul = Math.min(3, budget.climatePeriodMul + 0.2)
    budget.commercePeriodMul = Math.min(2, budget.commercePeriodMul + 0.12)
    budget.politicsStagger = true
    budget.uiLight = true
    budget.uiIntervalMs = Math.min(900, budget.uiIntervalMs + 60)
    budget.drawIntervalMs = Math.min(72, budget.drawIntervalMs + 4)
    budget.thinkCooldownExtra = Math.min(6, (budget.thinkCooldownExtra ?? 0) + 2)
  } else if (lod >= TPS_HIGH) {
    // At ≥300 pop: do not full-restore cognition — that re-cliffs the next second.
    if (aliveAgentCount >= 300) {
      // Hold Max@500 lean forever once at cible — restoring here re-cliffs confirm probes.
      budget.headroom = Math.min(0.7, budget.headroom + 0.03)
      budget.deepPeriod = Math.max(12, Math.min(18, budget.deepPeriod))
      budget.deepShare = Math.min(0.28, Math.max(0.2, budget.deepShare))
      budget.pathScale = Math.min(0.6, Math.max(0.5, budget.pathScale))
      budget.climatePeriodMul = Math.max(1.5, budget.climatePeriodMul)
      budget.commercePeriodMul = Math.max(1.35, budget.commercePeriodMul)
      budget.politicsStagger = true
      budget.uiLight = true
      budget.thinkCooldownExtra = Math.max(3, Math.min(5, budget.thinkCooldownExtra ?? 3))
      budget.preferGpu = true
      budget.uiIntervalMs = 600
      budget.drawIntervalMs = 44
    } else {
      budget.headroom = Math.min(1, budget.headroom + 0.1)
      budget.deepPeriod = Math.max(5, budget.deepPeriod - 1)
      budget.deepShare = Math.min(0.85, budget.deepShare + 0.04)
      budget.preferGpu = true
      budget.pathScale = Math.min(1.25, budget.pathScale + 0.05)
      budget.climatePeriodMul = Math.max(1, budget.climatePeriodMul - 0.2)
      budget.commercePeriodMul = Math.max(1, budget.commercePeriodMul - 0.1)
      budget.politicsStagger = budget.headroom < 0.35
      budget.uiLight = false
      budget.uiIntervalMs = Math.max(320, budget.uiIntervalMs - 40)
      budget.drawIntervalMs = Math.max(16, budget.drawIntervalMs - 2)
      budget.thinkCooldownExtra = Math.max(0, (budget.thinkCooldownExtra ?? 0) - 1)
    }
  } else if (lod >= TPS_OK) {
    // 80–99: chase TARGET — at ≥300 pop stay lean (no pathScale~1 restore thrash).
    budget.headroom = clamp01(0.5 + ((lod - TPS_OK) / (TPS_HIGH - TPS_OK)) * 0.3)
    if (aliveAgentCount >= 300) {
      budget.deepShare = Math.min(0.32, Math.max(0.2, budget.deepShare - 0.01))
      budget.deepPeriod = Math.min(18, budget.deepPeriod + (lod < 95 ? 1 : 0))
      budget.pathScale = Math.max(0.5, Math.min(0.65, budget.pathScale))
      budget.thinkCooldownExtra = Math.max(3, Math.min(5, budget.thinkCooldownExtra ?? 3))
      budget.climatePeriodMul = 1.75
      budget.commercePeriodMul = 1.5
      budget.politicsStagger = true
      budget.uiLight = true
      budget.uiIntervalMs = 600
      budget.drawIntervalMs = 44
    } else {
      const nearTarget = lod >= 90
      if (nearTarget) {
        budget.deepShare = Math.min(0.62, Math.max(0.42, budget.deepShare - 0.01))
        budget.deepPeriod = Math.max(6, Math.min(12, budget.deepPeriod + (lod < 95 ? 1 : 0)))
        budget.pathScale = 0.88 + budget.headroom * 0.18
        budget.thinkCooldownExtra = Math.max(0, Math.min(2, budget.thinkCooldownExtra ?? 0))
      } else {
        budget.pathScale = 0.9 + budget.headroom * 0.25
      }
      budget.climatePeriodMul = budget.headroom < 0.45 ? 1.35 : 1
      budget.commercePeriodMul = budget.headroom < 0.4 ? 1.2 : 1
      budget.politicsStagger = budget.headroom < 0.38
      budget.uiLight = budget.headroom < 0.32
      budget.uiIntervalMs = budget.headroom < 0.4 ? 480 : 380
      budget.drawIntervalMs = budget.headroom < 0.35 ? 36 : 24
    }
  } else {
    // Between LOW and OK — stay aggressive until we clear the 80 bar (no restore thrash).
    budget.headroom = clamp01(0.2 + ((lod - TPS_LOW) / (TPS_OK - TPS_LOW)) * 0.25)
    budget.deepPeriod = Math.min(22, budget.deepPeriod + 1)
    budget.deepShare = Math.max(0.18, budget.deepShare - 0.04)
    budget.pathScale = Math.max(0.4, Math.min(0.65, 0.5 + budget.headroom * 0.12))
    budget.climatePeriodMul = 2
    budget.commercePeriodMul = 1.65
    budget.politicsStagger = true
    budget.uiLight = true
    budget.uiIntervalMs = 650
    budget.drawIntervalMs = 52
    budget.thinkCooldownExtra = Math.min(6, Math.max(3, (budget.thinkCooldownExtra ?? 0) + 1))
  }
  // Sticky Max@500: never let path/cognition fully restore while stress pop is live.
  if (aliveAgentCount >= 300) {
    budget.pathScale = Math.min(budget.pathScale, 0.6)
    budget.deepShare = Math.min(budget.deepShare, 0.28)
    budget.thinkCooldownExtra = Math.max(3, budget.thinkCooldownExtra ?? 3)
    budget.politicsStagger = true
    budget.climatePeriodMul = Math.max(budget.climatePeriodMul, 1.5)
    budget.commercePeriodMul = Math.max(budget.commercePeriodMul, 1.35)
    budget.uiLight = true
  }
}

export function getSimPerfBudget(): Readonly<SimPerfBudget> {
  return budget
}

/** Alias used by cognition LOD. */
export function getCognitionBudget(): Readonly<SimPerfBudget> {
  return budget
}

/** Hard reset for stress worlds / probe isolation (module budget must not leak across runs). */
export function resetSimPerfBudgetForStress(seedTps = 55, aliveHint = 500): void {
  // Full module reset — aliveAgentCount must be armed or sticky Max@500 never applies.
  smoothedTps = seedTps
  aliveAgentCount = Math.max(300, aliveHint)
  crisisDeepPressure = false
  budget.deepPeriod = 16
  budget.popScale = 1
  budget.deepShare = 0.22
  budget.lastTps = seedTps
  budget.headroom = 0.25
  budget.preferGpu = true
  budget.pathScale = 0.55
  budget.climatePeriodMul = 1.75
  budget.commercePeriodMul = 1.5
  budget.politicsStagger = true
  budget.uiLight = true
  budget.uiIntervalMs = 650
  budget.drawIntervalMs = 48
  budget.thinkCooldownExtra = 4
  // Apply sticky floors immediately so first ticks are Max@500-safe.
  budget.pathScale = Math.min(budget.pathScale, 0.65)
  budget.deepShare = Math.min(budget.deepShare, 0.28)
}

export function effectiveDeepPeriod(alive: number): number {
  return budget.deepPeriod + Math.min(14, ((alive / 45) | 0) * budget.popScale)
}

/**
 * Hash gate for deep cognition under LOD budget.
 * `priority` (WP9 crisis / high PE / high stress): bypass thin deepShare —
 * callers must still stagger so this is not deepShare=1.
 */
export function allowDeepThink(vId: number, tick: number, priority = false): boolean {
  if (priority) return true
  const share = effectiveDeepShare()
  if (share >= 0.95) return true
  const h = ((vId * 2654435761) ^ (tick * 40503)) >>> 0
  return h / 4294967295 < share
}

/** Flip-flop for light UI packs under load (still refresh selected often). */
export function takeUiLightGate(): boolean {
  if (!budget.uiLight) return false
  uiLightFlip = !uiLightFlip
  return uiLightFlip
}

export function cognitionBudgetHintFr(): string {
  const b = budget
  const mode = b.headroom > 0.65 ? 'profonde' : b.headroom < 0.3 ? 'économe' : 'équilibrée'
  return `LOD ${mode} · période ${b.deepPeriod} · TPS ${Math.round(b.lastTps)} / ${TARGET_SIM_TPS}`
}

/**
 * Villager full-tick stride under Max load / high pop.
 * Crisis agents always take a full tick (caller gates). Others rotate: stride 1 = all full.
 * Light slots: cheap metabolism + greedy task step (not full choose/threat/A*).
 * Target: ≤8–16 full agency ticks @500 so Max can chase ≥80 / 100 TPS.
 */
export function villagerLodStride(aliveAgents: number): number {
  const a = Math.max(1, aliveAgents)
  const tps = budget.lastTps
  if (a < 100) return 1
  if (a < 180) {
    if (tps > 0 && tps < 70) return 2
    return 1
  }
  if (a < 280) {
    if (tps > 0 && tps < 55) return 5
    if (tps > 0 && tps < 85) return 4
    return 2
  }
  // Stress pop (≥280): always aggressive — do not restore on high TPS (confirm cliffs).
  if (tps <= 0 || tps < 90) return Math.max(80, Math.ceil(a / 5))
  if (tps < 120) return Math.max(48, Math.ceil(a / 8))
  return Math.max(28, Math.ceil(a / 12))
}

/**
 * How often light (non-crisis) agents run metabolism under Max@high-pop.
 * Higher = thinner; crisis/urgent callers must bypass this gate.
 */
export function villagerLightSamplePeriod(aliveAgents: number): number {
  const a = Math.max(1, aliveAgents)
  const tps = budget.lastTps
  if (a < 280) return 1
  // Stress pop: stay thin even when lod notes are floored/high — recovery + hold.
  if (tps <= 0 || tps < 90) return a >= 400 ? 72 : 56
  if (tps < 120) return a >= 400 ? 56 : 40
  return 32
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v))
}
