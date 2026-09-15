/**
 * Adaptive sim performance budget — single-writer (sim worker).
 * Shrinks hot-path work when TPS drops; expands when headroom returns.
 * Cognition deep-share lives here too so LOD stays coherent.
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
}

const budget: SimPerfBudget = {
  deepPeriod: 9,
  popScale: 1,
  deepShare: 0.55,
  lastTps: 8,
  headroom: 0.5,
  preferGpu: true,
  pathScale: 1,
  climatePeriodMul: 1,
  commercePeriodMul: 1,
  politicsStagger: false,
  uiLight: false,
  uiIntervalMs: 400,
  drawIntervalMs: 16,
}

const TPS_LOW = 3.5
const TPS_HIGH = 9

let uiLightFlip = false

/**
 * Called from sim.worker each second with measured ticks/sec.
 */
export function noteSimTps(tps: number): void {
  budget.lastTps = tps
  if (tps < TPS_LOW) {
    budget.headroom = Math.max(0, budget.headroom - 0.12)
    budget.deepPeriod = Math.min(22, budget.deepPeriod + 1)
    budget.deepShare = Math.max(0.18, budget.deepShare - 0.06)
    budget.preferGpu = tps > 2
    budget.pathScale = Math.max(0.55, budget.pathScale - 0.08)
    budget.climatePeriodMul = Math.min(3, budget.climatePeriodMul + 0.25)
    budget.commercePeriodMul = Math.min(2, budget.commercePeriodMul + 0.15)
    budget.politicsStagger = true
    budget.uiLight = true
    budget.uiIntervalMs = Math.min(900, budget.uiIntervalMs + 80)
    budget.drawIntervalMs = Math.min(48, budget.drawIntervalMs + 4)
  } else if (tps > TPS_HIGH) {
    budget.headroom = Math.min(1, budget.headroom + 0.08)
    budget.deepPeriod = Math.max(5, budget.deepPeriod - 1)
    budget.deepShare = Math.min(0.85, budget.deepShare + 0.04)
    budget.preferGpu = true
    budget.pathScale = Math.min(1.25, budget.pathScale + 0.05)
    budget.climatePeriodMul = Math.max(1, budget.climatePeriodMul - 0.2)
    budget.commercePeriodMul = Math.max(1, budget.commercePeriodMul - 0.1)
    budget.politicsStagger = budget.headroom < 0.4
    budget.uiLight = false
    budget.uiIntervalMs = Math.max(320, budget.uiIntervalMs - 40)
    budget.drawIntervalMs = Math.max(16, budget.drawIntervalMs - 2)
  } else {
    budget.headroom = clamp01(0.35 + ((tps - TPS_LOW) / (TPS_HIGH - TPS_LOW)) * 0.45)
    budget.pathScale = 0.85 + budget.headroom * 0.3
    budget.climatePeriodMul = budget.headroom < 0.4 ? 1.5 : 1
    budget.commercePeriodMul = budget.headroom < 0.35 ? 1.35 : 1
    budget.politicsStagger = budget.headroom < 0.32
    budget.uiLight = budget.headroom < 0.28
    budget.uiIntervalMs = budget.headroom < 0.35 ? 550 : 400
    budget.drawIntervalMs = budget.headroom < 0.3 ? 28 : 16
  }
}

export function getSimPerfBudget(): Readonly<SimPerfBudget> {
  return budget
}

/** Alias used by cognition LOD. */
export function getCognitionBudget(): Readonly<SimPerfBudget> {
  return budget
}

export function effectiveDeepPeriod(alive: number): number {
  return budget.deepPeriod + Math.min(14, ((alive / 45) | 0) * budget.popScale)
}

export function allowDeepThink(vId: number, tick: number): boolean {
  if (budget.deepShare >= 0.95) return true
  const h = ((vId * 2654435761) ^ (tick * 40503)) >>> 0
  return h / 4294967295 < budget.deepShare
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
  return `LOD ${mode} · période ${b.deepPeriod} · TPS ${Math.round(b.lastTps)}`
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v))
}
