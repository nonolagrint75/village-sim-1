/**
 * Activity tools (§20) — sync work arcs from agent task state (staging).
 * Visible chain: tool + target + progress. No biography day scripts.
 */

import {
  createActivityToolsBag,
  familyFromTaskKind,
  progressOf,
  type ActivityToolsBag,
  type ActivityVisualEvent,
  type ToolTier,
  type WorkArc,
  type WorkArcPhase,
  type WorkFamily,
} from './types'

function pushEvent(bag: ActivityToolsBag, ev: ActivityVisualEvent) {
  bag.events.push(ev)
  if (bag.events.length > 96) bag.events.splice(0, bag.events.length - 96)
}

function allocId(bag: ActivityToolsBag): string {
  const id = `wa_${bag.nextId}`
  bag.nextId += 1
  return id
}

const ACTIVE_RE =
  /gather|mine|build|chop|harvest|fish|haul|craft|smith|trade|sow|tend|cook|weave|clear|dig|grind|bake|mint|makeCharcoal|assistCraft|helpBuild/

export function isWorkingTask(taskKind: string | null | undefined): boolean {
  if (!taskKind || taskKind === 'idle' || taskKind === 'sleep' || taskKind === 'rest') return false
  return ACTIVE_RE.test(taskKind)
}

function phaseFromProgress(p: number, atTarget: boolean): WorkArcPhase {
  if (p >= 1) return 'complete'
  if (!atTarget) return 'approach'
  if (p < 0.08) return 'recover'
  return 'active'
}

export interface ActorWorkSample {
  actorId: number
  villageId?: number | null
  taskKind: string | null
  toolTier: ToolTier
  mainHand?: string | null
  x: number
  y: number
  targetX: number
  targetY: number
  targetId?: number | null
  work: number
  workNeeded: number
}

/**
 * Upsert arcs from current actor samples (call each tick for working agents).
 * Cancels arcs whose actors left working tasks.
 */
export function syncWorkArcs(
  bag: ActivityToolsBag,
  tick: number,
  samples: ActorWorkSample[],
): void {
  const seen = new Set<number>()

  for (const s of samples) {
    if (!isWorkingTask(s.taskKind)) continue
    seen.add(s.actorId)
    const family = familyFromTaskKind(s.taskKind!)
    const progress = progressOf(s.work, s.workNeeded)
    const atTarget = Math.abs(s.x - s.targetX) + Math.abs(s.y - s.targetY) <= 1
    const phase = phaseFromProgress(progress, atTarget)

    let arc = bag.arcs.find((a) => a.actorId === s.actorId)
    if (!arc) {
      arc = {
        id: allocId(bag),
        actorId: s.actorId,
        villageId: s.villageId ?? null,
        family,
        taskKind: s.taskKind!,
        toolTier: s.toolTier,
        mainHand: s.mainHand ?? null,
        targetX: s.targetX,
        targetY: s.targetY,
        targetId: s.targetId ?? null,
        work: s.work,
        workNeeded: s.workNeeded,
        progress,
        phase,
        startedTick: tick,
        lastSwingTick: tick,
        lifeTag: 'generic',
      }
      bag.arcs.push(arc)
      pushEvent(bag, {
        kind: 'arc_started',
        tick,
        arcId: arc.id,
        actorId: s.actorId,
        family,
        taskKind: s.taskKind!,
        toolTier: s.toolTier,
        x: s.x,
        y: s.y,
        targetX: s.targetX,
        targetY: s.targetY,
        progress,
        intensity: 0.4,
      })
      continue
    }

    const prevProgress = arc.progress
    const prevPhase = arc.phase
    arc.family = family
    arc.taskKind = s.taskKind!
    arc.toolTier = s.toolTier
    arc.mainHand = s.mainHand ?? null
    arc.targetX = s.targetX
    arc.targetY = s.targetY
    arc.targetId = s.targetId ?? null
    arc.work = s.work
    arc.workNeeded = s.workNeeded
    arc.progress = progress
    arc.phase = phase

    if (phase === 'active' && progress > prevProgress + 0.02) {
      arc.lastSwingTick = tick
      pushEvent(bag, {
        kind: 'tool_swung',
        tick,
        arcId: arc.id,
        actorId: s.actorId,
        family,
        toolTier: s.toolTier,
        x: s.x,
        y: s.y,
        targetX: s.targetX,
        targetY: s.targetY,
        progress,
        intensity: 0.35 + 0.5 * progress,
      })
      if (atTarget) {
        pushEvent(bag, {
          kind: 'target_hit',
          tick,
          arcId: arc.id,
          actorId: s.actorId,
          family,
          x: s.targetX,
          y: s.targetY,
          progress,
          intensity: 0.25 + 0.55 * progress,
        })
      }
    }

    if (progress - prevProgress >= 0.15 || phase !== prevPhase) {
      pushEvent(bag, {
        kind: progress >= 1 ? 'arc_complete' : 'arc_progress',
        tick,
        arcId: arc.id,
        actorId: s.actorId,
        family,
        taskKind: s.taskKind!,
        toolTier: s.toolTier,
        x: s.x,
        y: s.y,
        targetX: s.targetX,
        targetY: s.targetY,
        progress,
        intensity: progress,
      })
    }
  }

  // Cancel arcs for agents no longer working
  const remain: WorkArc[] = []
  for (const arc of bag.arcs) {
    if (seen.has(arc.actorId)) {
      remain.push(arc)
      continue
    }
    pushEvent(bag, {
      kind: arc.progress >= 1 ? 'arc_complete' : 'arc_cancelled',
      tick,
      arcId: arc.id,
      actorId: arc.actorId,
      family: arc.family,
      taskKind: arc.taskKind,
      toolTier: arc.toolTier,
      x: arc.targetX,
      y: arc.targetY,
      progress: arc.progress,
      intensity: arc.progress,
    })
  }
  bag.arcs = remain.filter((a) => a.phase !== 'complete')
}

/** Snapshot export for entityArt / canvas overlays. */
export function exportActivityActors(bag: ActivityToolsBag): Array<{
  actorId: number
  family: WorkFamily
  taskKind: string
  toolTier: ToolTier
  mainHand: string | null
  targetX: number
  targetY: number
  progress: number
  phase: WorkArcPhase
}> {
  return bag.arcs.map((a) => ({
    actorId: a.actorId,
    family: a.family,
    taskKind: a.taskKind,
    toolTier: a.toolTier,
    mainHand: a.mainHand,
    targetX: a.targetX,
    targetY: a.targetY,
    progress: a.progress,
    phase: a.phase,
  }))
}

export { createActivityToolsBag }
