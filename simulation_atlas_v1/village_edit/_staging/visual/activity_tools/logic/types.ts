/**
 * Activity tools (§20) — staging types for visible work arcs.
 * Aligned with live Task.work, toolTier, task.kind, targetX/Y — no core imports.
 */

export type ToolTier = 'none' | 'wood' | 'stone' | 'iron'

/** Soft life tag — never a day-timer biography. */
export type ActivityLifeTag = 'Soare' | 'generic'

/**
 * Work families readable on the map without opening the panel.
 * Maps many TaskKind strings into a few visual arcs.
 */
export type WorkFamily = 'farm' | 'smith' | 'chop' | 'mine' | 'craft' | 'build' | 'haul' | 'other'

export type WorkArcPhase = 'approach' | 'active' | 'recover' | 'complete'

export type ActivityVisualEventKind =
  | 'arc_started'
  | 'arc_progress'
  | 'arc_complete'
  | 'tool_swung'
  | 'target_hit'
  | 'arc_cancelled'

export interface CellRef {
  x: number
  y: number
}

/**
 * One visible work arc: agent + held tool + target + progress.
 * Progress 0..1 from task.work / laborWorkNeeded (integrator supplies needed).
 */
export interface WorkArc {
  id: string
  actorId: number
  villageId: number | null
  family: WorkFamily
  /** Live task.kind string (gatherWood, mineTunnel, craftIronTool…). */
  taskKind: string
  toolTier: ToolTier
  /** Optional gear.mainHand id if present. */
  mainHand: string | null
  targetX: number
  targetY: number
  targetId: number | null
  /** Accumulated labor (mirrors Task.work). */
  work: number
  /** Required labor for complete (from laborWorkNeeded). */
  workNeeded: number
  /** Derived 0..1. */
  progress: number
  phase: WorkArcPhase
  startedTick: number
  lastSwingTick: number
  lifeTag: ActivityLifeTag
}

export interface ActivityVisualEvent {
  kind: ActivityVisualEventKind
  tick: number
  arcId?: string
  actorId: number
  family?: WorkFamily
  taskKind?: string
  toolTier?: ToolTier
  x: number
  y: number
  targetX?: number
  targetY?: number
  progress?: number
  intensity?: number
  note?: string
}

export interface ActivityToolsBag {
  arcs: WorkArc[]
  events: ActivityVisualEvent[]
  nextId: number
}

export function createActivityToolsBag(): ActivityToolsBag {
  return { arcs: [], events: [], nextId: 1 }
}

/** TaskKind → family (substring / exact style, staging). */
export function familyFromTaskKind(taskKind: string): WorkFamily {
  const t = taskKind || ''
  if (/sow|harvest|tend|grind|bake|field|wheat|farm/.test(t)) return 'farm'
  if (/smith|craftIron|mint|makeCharcoal|forge/.test(t)) return 'smith'
  if (/gatherWood|clearLand|chop|gatherFuel/.test(t)) return 'chop'
  if (/mine|gatherStone|gatherIron|mineGold|mineTunnel/.test(t)) return 'mine'
  if (/craft|weave|sew|tan|cook|craftGoods|craftSpear|craftGear|craftLight|assistCraft/.test(t))
    return 'craft'
  if (/build|scaffold|helpBuild|hireBuilder/.test(t)) return 'build'
  if (/haul|storeChest|takeFromChest|tradeRun|buyMaterial/.test(t)) return 'haul'
  return 'other'
}

export function progressOf(work: number, workNeeded: number): number {
  const need = Math.max(0.001, workNeeded)
  return Math.max(0, Math.min(1, work / need))
}
