/**
 * Dwarf Fortress–inspired civilian / guard tactics:
 * job interrupt → flee or engage → restore; soft burrows; caution by age/personality.
 */
import type { Memory } from '../social'
import { activeNormsFor, circlesOf } from '../politics'
import type { SimState, Task, TaskKind, Villager, Wolf } from '../types'
import { distance, isNight } from '../world'
import { knownSpots, upsertSemantic } from './memory'
import type { CognitiveState } from './types'

/** Under this age (ticks), agents are treated as children — more cautious, rarely fight. */
export const CHILD_AGE = 180

/** Soft stay-near-home radius when stressed / night. */
export const BURROW_RADIUS = 22

/** Tasks that survive a threat interrupt (survival / already tactical). */
export const CRITICAL_TASKS: ReadonlySet<TaskKind> = new Set([
  'eat',
  'flee',
  'fight',
  'defend',
  'takeFromChest',
])

export function isChild(v: Villager): boolean {
  return v.age < CHILD_AGE
}

/** Higher = more flee radius / stronger danger avoidance. */
export function cautionFactor(v: Villager): number {
  let c = 1.15 - v.personality.courage * 0.55
  if (isChild(v)) c *= 1.4
  if (v.health < 2) c *= 1.15
  return Math.max(0.55, Math.min(1.85, c))
}

export function isGuardRole(state: SimState, v: Villager): boolean {
  if (v.profession === 'guard' || v.ambition === 'protector') return true
  const norms = activeNormsFor(state, v)
  if (norms.includes('protect_all') && v.personality.courage > 0.45) return true
  for (const c of circlesOf(state, v)) {
    if (c.kind === 'threat' || c.norms.includes('protect_all')) {
      return v.personality.courage > 0.4 || v.toolTier !== 'none'
    }
  }
  return false
}

/**
 * Guards / protectors lean confront; civilians flee.
 * Personality modulates the threshold; children never engage.
 */
export function shouldEngageThreat(
  state: SimState,
  v: Villager,
  opts: { exhausted: boolean; hunger: number },
): boolean {
  if (isChild(v)) return false
  if (v.toolTier === 'none') return false
  if (opts.exhausted || opts.hunger < 0.75) return false

  const guard = isGuardRole(state, v)
  const courage = v.personality.courage

  if (guard) {
    return courage > 0.18 && opts.hunger >= 0.75
  }
  // Civilian: only the bold (and fed) stand and fight.
  return courage > 0.68 && opts.hunger >= 1.2
}

export function cloneTask(task: Task): Task {
  return {
    kind: task.kind,
    targetX: task.targetX,
    targetY: task.targetY,
    targetId: task.targetId,
    resource: task.resource,
    stuckTicks: task.stuckTicks,
    ageTicks: task.ageTicks,
    work: task.work,
    path: task.path ? task.path.slice() : null,
    pathI: task.pathI,
    pathTx: task.pathTx,
    pathTy: task.pathTy,
    pathTick: task.pathTick,
  }
}

/** Save current non-critical job before overwrite (single-depth stack). */
export function stashInterruptedTask(v: Villager): void {
  const t = v.task
  if (!t) return
  if (CRITICAL_TASKS.has(t.kind)) return
  if (t.kind === 'idle' && t.work <= 0 && t.ageTicks < 3) return
  if (!v.savedTask) v.savedTask = cloneTask(t)
}

/** Resume interrupted goal; invalidate path so A* can avoid remembered danger. */
export function restoreInterruptedTask(v: Villager): boolean {
  if (!v.savedTask) return false
  const t = v.savedTask
  v.savedTask = null
  t.path = null
  t.pathI = 0
  t.stuckTicks = 0
  t.pathTick = -999
  v.task = t
  return true
}

export function clearSavedTask(v: Villager): void {
  v.savedTask = null
}

/** Home door → village gate/wall → ally cluster → away from threat. */
export function pickSafetyTarget(
  state: SimState,
  v: Villager,
  threat: { x: number; y: number },
  homeDoor: { x: number; y: number } | null,
): { x: number; y: number; label: string } {
  if (homeDoor) return { x: homeDoor.x, y: homeDoor.y, label: 'foyer' }

  const village = state.villages.find((vg) => vg.id === v.villageId)
  if (village) {
    let bestX = village.centerX
    let bestY = village.centerY
    let hasBest = false
    let bestScore = Infinity
    const consider = (x: number, y: number, prefer: number) => {
      const toThreat = distance(x, y, threat.x, threat.y)
      const toSelf = distance(v.x, v.y, x, y)
      const score = toSelf * 1.1 - toThreat * 0.35 - prefer
      if (score < bestScore) {
        bestScore = score
        bestX = x
        bestY = y
        hasBest = true
      }
    }
    for (const g of village.gates) consider(g.x, g.y, 8)
    const per = village.perimeter
    if (per.length > 0) {
      const step = Math.max(1, (per.length / 12) | 0)
      for (let i = 0; i < per.length; i += step) consider(per[i].x, per[i].y, 4)
    }
    if (hasBest) return { x: bestX, y: bestY, label: 'rempart' }
    consider(village.centerX, village.centerY, 2)
    if (hasBest) return { x: bestX, y: bestY, label: 'village' }
  }

  if (v.hasHome && v.homeX >= 0) {
    return { x: v.homeX, y: v.homeY, label: 'maison' }
  }

  let ally: Villager | null = null
  let allyD = 28 * 28
  const selfThreat = distance(v.x, v.y, threat.x, threat.y)
  for (const o of state.villagers) {
    if (!o.alive || o.id === v.id) continue
    const dx = o.x - v.x
    const dy = o.y - v.y
    const d2 = dx * dx + dy * dy
    if (d2 > allyD || d2 < 1) continue
    if (distance(o.x, o.y, threat.x, threat.y) + 1 < selfThreat) continue
    allyD = d2
    ally = o
  }
  if (ally) return { x: ally.x, y: ally.y, label: 'groupe' }

  const awayX = Math.round(v.x + (v.x - threat.x) * 5)
  const awayY = Math.round(v.y + (v.y - threat.y) * 5)
  return {
    x: Math.max(0, Math.min(state.grid.width - 1, awayX)),
    y: Math.max(0, Math.min(state.grid.height - 1, awayY)),
    label: 'fuite',
  }
}

/** Soft burrow: when night / fear / stress, prefer work near home or village hub. */
export function burrowTaskMultiplier(
  state: SimState,
  v: Villager,
  mind: CognitiveState,
  kind: TaskKind,
  x: number,
  y: number,
): number {
  const night = isNight(state.tick)
  const fear = mind.emotions.fear
  const stress = mind.emotions.stress
  const pressure = Math.max(fear, stress, mind.needs.safety * 0.8, night ? 0.35 : 0)
  const wantBurrow = pressure > 0.3 || (v.hasHome && fear + stress > 0.2)

  if (!wantBurrow && !isChild(v)) return 1

  const village = state.villages.find((vg) => vg.id === v.villageId)
  const hx = v.hasHome ? v.homeX : village ? village.centerX : v.x
  const hy = v.hasHome ? v.homeY : village ? village.centerY : v.y
  const hubX = village ? village.centerX : hx
  const hubY = village ? village.centerY : hy
  const r = BURROW_RADIUS * (0.85 + (1 - v.personality.courage) * 0.4) * (isChild(v) ? 0.75 : 1)
  const dHome = distance(x, y, hx, hy)
  const dHub = distance(x, y, hubX, hubY)
  const d = Math.min(dHome, dHub)

  let mult = 1

  if (kind === 'rest' || kind === 'eat' || kind === 'takeFromChest') {
    mult *= 1 + pressure * 0.55
    if (dHome <= BURROW_RADIUS * 0.4) mult *= 1.25
  }
  if (kind === 'buildWall' || kind === 'defend' || kind === 'craftSpear' || kind === 'craftStoneSpear') {
    mult *= 1 + pressure * 0.35
  }

  const outdoorFar =
    kind === 'idle' ||
    kind === 'tradeRun' ||
    kind === 'mineGold' ||
    kind === 'mineTunnel' ||
    kind === 'gatherIron' ||
    kind === 'fish' ||
    kind === 'tameHorse' ||
    kind === 'gatherWood' ||
    kind === 'gatherStone' ||
    kind === 'gatherFood' ||
    kind === 'clearLand'

  if ((wantBurrow || pressure > 0.3) && outdoorFar && d > r) {
    const overshoot = (d - r) / Math.max(8, r)
    mult *= Math.max(0.18, 1 - overshoot * (0.55 + pressure * 0.35) * cautionFactor(v) * 0.5)
  }

  if (isChild(v) && outdoorFar && d > r * 0.7) {
    mult *= 0.55
  }

  return mult
}

/** Pack danger spots for pathfinding (capped — keep A* budgets stable). */
export function dangerSpotsForPath(
  mind: CognitiveState,
  memories: Memory[],
  max = 6,
): { x: number; y: number; weight: number }[] {
  const spots = knownSpots(mind.semantic, mind.episodic, memories, 'danger')
  spots.sort((a, b) => b.weight - a.weight)
  const out: { x: number; y: number; weight: number }[] = []
  for (let i = 0; i < spots.length && out.length < max; i++) {
    const s = spots[i]
    if (s.weight < 0.12) continue
    out.push({ x: Math.round(s.x), y: Math.round(s.y), weight: Math.min(1.8, s.weight) })
  }
  return out
}

export function noteWolfDanger(mind: CognitiveState, wolf: Wolf, tick: number, weight = 1): void {
  upsertSemantic(
    mind.semantic,
    'wolves_near',
    'loups dans les parages',
    Math.min(1, 0.55 + weight * 0.2),
    tick,
    wolf.x,
    wolf.y,
  )
  upsertSemantic(
    mind.semantic,
    'danger_spot',
    'endroit dangereux',
    Math.min(1, 0.4 + weight * 0.25),
    tick,
    wolf.x,
    wolf.y,
  )
}

/** Combat heat: wolf near, or allies already fighting/fleeing a known wolf. */
export function nearestTacticalThreat(state: SimState, v: Villager, radius: number): Wolf | null {
  let best: Wolf | null = null
  let bestD = radius * radius
  for (const w of state.wolves) {
    if (!w.alive) continue
    const dx = w.x - v.x
    const dy = w.y - v.y
    const d = dx * dx + dy * dy
    if (d <= bestD) {
      bestD = d
      best = w
    }
  }
  if (best) return best

  const senseR2 = radius * radius * 1.21
  for (const o of state.villagers) {
    if (!o.alive || o.id === v.id || !o.task) continue
    if (o.task.kind !== 'fight' && o.task.kind !== 'defend' && o.task.kind !== 'flee') continue
    const dx = o.x - v.x
    const dy = o.y - v.y
    if (dx * dx + dy * dy > senseR2) continue
    if (o.task.targetId === null) continue
    const w = state.wolves.find((ww) => ww.id === o.task!.targetId && ww.alive)
    if (w) return w
  }
  return null
}
