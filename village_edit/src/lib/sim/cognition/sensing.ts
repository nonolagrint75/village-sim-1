/**
 * Non-omniscient resource sensing: local perceive → known spots → short search.
 * Keeps LOD budgets by capping blind radius scans.
 */

import type { Memory } from '../social'
import type { ResourceKind } from '../resourceIndex'
import { BUSH, TREE, type Villager } from '../types'
import { distance, getTerrain, isWoodPile, nearestResource, type WorldGrid } from '../world'
import { knownSpots } from './memory'
import type { CognitiveState } from './types'

/** How far an agent "sees" resources without prior knowledge. */
export const LOCAL_PERCEIVE_R = 22
/** Blind scan when nothing known — still much shorter than legacy SEARCH_RADIUS 70. */
export const SHORT_SEARCH_R = 36
/** Wander toward a remembered region when local scan fails. */
export const MEMORY_SEEK_R = 90

export function senseResource(
  grid: WorldGrid,
  v: Villager,
  mind: CognitiveState,
  kind: ResourceKind,
  opts: {
    localR?: number
    shortR?: number
    allowBlind?: boolean
    legacy?: Memory[] | null
  } = {},
): { x: number; y: number; source: 'local' | 'memory' | 'search' } | null {
  const localR = opts.localR ?? LOCAL_PERCEIVE_R
  const shortR = opts.shortR ?? SHORT_SEARCH_R
  const allowBlind = opts.allowBlind !== false

  const local = nearestResource(grid, v.x, v.y, kind, localR)
  if (local) return { ...local, source: 'local' }

  const spots = knownSpots(mind.semantic, mind.episodic, opts.legacy ?? v.memories, 'good')
  let bestMem: { x: number; y: number; d: number } | null = null
  for (const s of spots) {
    const d = distance(v.x, v.y, s.x, s.y)
    if (d > MEMORY_SEEK_R) continue
    const t = getTerrain(grid, s.x, s.y)
    const ok =
      (kind === 'bush' && t === BUSH) ||
      (kind === 'tree' && (t === TREE || isWoodPile(grid, s.x, s.y))) ||
      (kind !== 'bush' && kind !== 'tree' && nearestResource(grid, s.x, s.y, kind, 6) !== null)
    if (!ok) continue
    if (!bestMem || d < bestMem.d) bestMem = { x: s.x, y: s.y, d }
  }
  if (bestMem) {
    if (kind === 'bush' || kind === 'tree') return { x: bestMem.x, y: bestMem.y, source: 'memory' }
    const near = nearestResource(grid, bestMem.x, bestMem.y, kind, 8)
    if (near) return { ...near, source: 'memory' }
  }

  if (!allowBlind) return null
  const found = nearestResource(grid, v.x, v.y, kind, shortR)
  return found ? { ...found, source: 'search' } : null
}

export function spotMemoryBias(
  mind: CognitiveState,
  legacy: Memory[],
  x: number,
  y: number,
  radius = 12,
  weight = 22,
): number {
  let bias = 0
  for (const s of knownSpots(mind.semantic, mind.episodic, legacy, 'good')) {
    const d = distance(x, y, s.x, s.y)
    if (d > radius) continue
    bias += s.emotion * s.weight * (1 - d / radius) * weight
  }
  for (const s of knownSpots(mind.semantic, mind.episodic, legacy, 'danger')) {
    const d = distance(x, y, s.x, s.y)
    if (d > radius) continue
    bias += s.emotion * s.weight * (1 - d / radius) * weight
  }
  // Scarcity memory: avoid known depleted patches (Sugarscape-style gradient away from poor tiles).
  for (const s of knownSpots(mind.semantic, mind.episodic, legacy, 'poor')) {
    const d = distance(x, y, s.x, s.y)
    if (d > radius) continue
    bias -= s.weight * (1 - d / radius) * weight * 0.85
  }
  return bias
}

/** Best remembered rich forage region within seek radius (for migration / explore). */
export function bestRememberedRichSpot(
  mind: CognitiveState,
  legacy: Memory[],
  fromX: number,
  fromY: number,
  maxR = MEMORY_SEEK_R,
): { x: number; y: number; weight: number } | null {
  let best: { x: number; y: number; weight: number; score: number } | null = null
  for (const s of knownSpots(mind.semantic, mind.episodic, legacy, 'good')) {
    const d = distance(fromX, fromY, s.x, s.y)
    if (d > maxR || d < 6) continue
    const score = s.weight * (0.55 + Math.min(1, d / 40))
    if (!best || score > best.score) best = { x: s.x, y: s.y, weight: s.weight, score }
  }
  return best ? { x: best.x, y: best.y, weight: best.weight } : null
}
