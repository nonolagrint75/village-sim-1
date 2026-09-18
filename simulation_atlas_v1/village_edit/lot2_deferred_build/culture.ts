/**
 * Culture / imitation hooks for construction AI.
 * Deep imitation learning is stubbed; neighbor observation + skill bias are real.
 */

import type { HouseShape, StyleWeights, WallMaterial } from '../architecture'
import { HOUSE_SHAPES, reinforceStyle } from '../architecture'
import type { SimState, Villager } from '../types'
import { getTerrain, inBounds } from '../world'
import { HOUSE, WALL_STONE, WALL_WOOD } from '../types'
import type { NeighborBuildingMemory } from './types'

const MAX_NEIGHBOR_MEMORIES = 8

/** Scan nearby finished homes and return soft impressions (imitation prior). */
export function observeNeighborHomes(
  state: SimState,
  v: Villager,
  radius = 28,
): NeighborBuildingMemory[] {
  const out: NeighborBuildingMemory[] = []
  for (const o of state.villagers) {
    if (!o.alive || o.id === v.id || !o.hasHome || !o.house || o.homeX < 0) continue
    const dist = Math.hypot(o.homeX - v.x, o.homeY - v.y)
    if (dist > radius) continue
    const wallMaterial = inferWallMaterial(state, o)
    out.push({
      ownerId: o.id,
      shape: o.house.shape,
      rx: o.house.rx,
      ry: o.house.ry,
      roomKinds: o.house.roomKinds ?? [],
      wallMaterial,
      dist,
      tick: state.tick,
    })
    if (out.length >= MAX_NEIGHBOR_MEMORIES) break
  }
  out.sort((a, b) => a.dist - b.dist)
  return out
}

function inferWallMaterial(state: SimState, o: Villager): WallMaterial {
  if (o.house?.wallMaterial) return o.house.wallMaterial
  const grid = state.grid
  let wood = 0
  let stone = 0
  let timber = 0
  for (let dy = -2; dy <= 2; dy++) {
    for (let dx = -2; dx <= 2; dx++) {
      const x = o.homeX + dx
      const y = o.homeY + dy
      if (!inBounds(grid, x, y)) continue
      const t = getTerrain(grid, x, y)
      if (t === WALL_STONE) stone++
      else if (t === WALL_WOOD) wood++
      else if (t === HOUSE) timber++
    }
  }
  if (stone >= wood && stone >= timber && stone > 0) return 'stone'
  if (wood > timber) return 'wood'
  return 'timber'
}

/**
 * Blend village style with neighbor impressions.
 * Conformity follows sociability; curiosity resists the crowd.
 */
export function imitateStyleBias(
  base: StyleWeights,
  neighbors: NeighborBuildingMemory[],
  sociability: number,
  curiosity: number,
): StyleWeights {
  const out = { ...base } as StyleWeights
  if (neighbors.length === 0) return out
  const pull = Math.max(0.05, sociability * 0.55 - curiosity * 0.35)
  const counts = {} as Record<HouseShape, number>
  for (const s of HOUSE_SHAPES) counts[s] = 0
  for (const n of neighbors) {
    const w = 1 / (1 + n.dist * 0.08)
    counts[n.shape] += w
  }
  let sum = 0
  for (const s of HOUSE_SHAPES) sum += counts[s]
  if (sum <= 0) return out
  for (const s of HOUSE_SHAPES) {
    const share = counts[s] / sum
    out[s] += (share - out[s] * 0.15) * pull
  }
  return out
}

/** Skill bias: stronger builders attempt slightly larger / more articulated plans. */
export function buildSkillScaleBias(buildSkill: number): number {
  return 0.85 + Math.max(0, Math.min(1, buildSkill)) * 0.45
}

/**
 * Stub: culture tag from profession / neighbors (future imitation learning feature).
 * Wired so planners can log / soft-tag without a trained model.
 */
export function cultureTagsFromContext(
  profession: string,
  neighbors: NeighborBuildingMemory[],
  rng: () => number,
): string[] {
  const tags: string[] = []
  if (profession === 'mason' || profession === 'builder') tags.push('maçonnerie')
  if (profession === 'lumberjack' || profession === 'carpenter') tags.push('bois_ouvré')
  if (profession === 'trader' || profession === 'farmer') tags.push('grenier')
  if (neighbors.some((n) => n.shape === 'longhouse')) tags.push('longère_vue')
  if (neighbors.some((n) => n.shape === 'courtyard')) tags.push('cour_vue')
  if (neighbors.some((n) => n.wallMaterial === 'stone')) tags.push('pierre_vue')
  // Soft whim tag — non-deterministic cultural flourish.
  if (rng() < 0.22) tags.push('fantaisie_locale')
  return tags
}

/** Reinforce village style after a unique plan is chosen (not a template stamp). */
export function rememberBuiltShape(style: StyleWeights, shape: HouseShape) {
  reinforceStyle(style, shape)
}
