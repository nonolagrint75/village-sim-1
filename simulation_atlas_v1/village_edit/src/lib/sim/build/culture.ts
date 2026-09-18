/**
 * Culture / imitation hooks for construction AI.
 * Deep imitation learning is stubbed; neighbor observation + skill bias are real.
 *
 * Causal couple (culture → architecture): observeNeighborHomes (ethnos-weighted)
 * → imitateStyleBias → StyleWeights consumed by planner.pickShape.
 */

import type { HouseShape, StyleWeights, WallMaterial } from '../architecture'
import { HOUSE_SHAPES, reinforceStyle } from '../architecture'
import { ethnosOf } from '../ethnos'
import type { SimState, Villager } from '../types'
import { getTerrain, inBounds } from '../world'
import { HOUSE, WALL_STONE, WALL_WOOD } from '../types'
import type { NeighborBuildingMemory } from './homeContracts'

const MAX_NEIGHBOR_MEMORIES = 8

/** Dominant local shape share that counts as vernacular lock-in. */
export const VERNACULAR_SHARE_THRESHOLD = 0.42

/**
 * Imitation pull floors / coeffs (documented — planner calls this as-is).
 * Floor 0.14: even low-soc builders get a soft vernacular nudge when neighbors exist.
 * Soc 0.78 / curios 0.30: conformity tracks local forms harder than before (0.55 / 0.35).
 * Cap 0.72: leaves room for profession / climate priors in planner.
 */
export const IMITATE_PULL_FLOOR = 0.14
export const IMITATE_PULL_SOC = 0.78
export const IMITATE_PULL_CURIOSITY = 0.3
export const IMITATE_PULL_CAP = 0.72

/** Extra reinforce when one neighbor shape clears VERNACULAR_SHARE_THRESHOLD. */
export const VERNACULAR_LOCK_BONUS = 0.22

function ethnosAffinity(self: Villager, other: Villager): number {
  const ea = ethnosOf(self)
  const eb = ethnosOf(other)
  let a = 1
  if (ea.ethnieId !== null && eb.ethnieId === ea.ethnieId) a += 0.85
  let shared = 0
  for (const t of ea.selfTags) {
    if (eb.selfTags.includes(t)) shared++
  }
  if (shared > 0) a += Math.min(0.55, shared * 0.22)
  return a
}

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
  }
  // Ethnos-close homes sort first so the soft memory window is culturally biased.
  out.sort((a, b) => {
    const oa = state.villagers.find((x) => x.id === a.ownerId)
    const ob = state.villagers.find((x) => x.id === b.ownerId)
    const affA = oa ? ethnosAffinity(v, oa) : 1
    const affB = ob ? ethnosAffinity(v, ob) : 1
    if (affB !== affA) return affB - affA
    return a.dist - b.dist
  })
  return out.slice(0, MAX_NEIGHBOR_MEMORIES)
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
 * Neighbor list is already ethnos-biased by observeNeighborHomes.
 */
export function imitateStyleBias(
  base: StyleWeights,
  neighbors: NeighborBuildingMemory[],
  sociability: number,
  curiosity: number,
): StyleWeights {
  const out = { ...base } as StyleWeights
  if (neighbors.length === 0) return out
  const raw = sociability * IMITATE_PULL_SOC - curiosity * IMITATE_PULL_CURIOSITY
  const pull = Math.min(IMITATE_PULL_CAP, Math.max(IMITATE_PULL_FLOOR, raw))
  const counts = {} as Record<HouseShape, number>
  for (const s of HOUSE_SHAPES) counts[s] = 0
  for (const n of neighbors) {
    const w = 1 / (1 + n.dist * 0.08)
    counts[n.shape] += w
  }
  let sum = 0
  for (const s of HOUSE_SHAPES) sum += counts[s]
  if (sum <= 0) return out
  let topShape: HouseShape = HOUSE_SHAPES[0]
  let topShare = 0
  for (const s of HOUSE_SHAPES) {
    const share = counts[s] / sum
    out[s] += (share - out[s] * 0.1) * pull
    if (share > topShare) {
      topShare = share
      topShape = s
    }
  }
  // Vernacular lock-in: clear local majority → extra style bias toward that form.
  if (topShare >= VERNACULAR_SHARE_THRESHOLD) {
    out[topShape] += pull * VERNACULAR_LOCK_BONUS * (topShare - VERNACULAR_SHARE_THRESHOLD + 0.2)
  }
  return out
}

/** Skill bias: stronger builders attempt slightly larger / more articulated plans. */
export function buildSkillScaleBias(buildSkill: number): number {
  return 0.85 + Math.max(0, Math.min(1, buildSkill)) * 0.45
}

const SHAPE_TAG: Partial<Record<HouseShape, string>> = {
  longhouse: 'longère_vue',
  courtyard: 'cour_vue',
  ell: 'équerre_vue',
  round: 'ronde_vue',
  square: 'carré_vue',
  rect: 'rectangle_vue',
}

/**
 * Culture tags from profession / neighbor vernacular (feeds SpatialHomePlan.cultureTags
 * and ethnos selfTags via absorbHomeVernacularTags). Not random creeds.
 *
 * Thresholds:
 * - Vernacular tag when one shape share ≥ VERNACULAR_SHARE_THRESHOLD (0.42)
 * - Material tag when ≥ 2 stone (or wood) neighbor shells
 * - Soft whim only if no vernacular lock AND rng < 0.1 (was 0.22 ungated)
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

  const shapeW = {} as Record<HouseShape, number>
  for (const s of HOUSE_SHAPES) shapeW[s] = 0
  let stoneN = 0
  let woodN = 0
  for (const n of neighbors) {
    const w = 1 / (1 + n.dist * 0.08)
    shapeW[n.shape] += w
    if (n.wallMaterial === 'stone') stoneN++
    if (n.wallMaterial === 'wood' || n.wallMaterial === 'timber') woodN++
  }
  let sum = 0
  for (const s of HOUSE_SHAPES) sum += shapeW[s]
  let dominant: HouseShape | null = null
  let topShare = 0
  if (sum > 0) {
    for (const s of HOUSE_SHAPES) {
      const share = shapeW[s] / sum
      if (share > topShare) {
        topShare = share
        dominant = s
      }
    }
  }
  const hasVernacular = dominant !== null && topShare >= VERNACULAR_SHARE_THRESHOLD
  if (hasVernacular && dominant) {
    const tag = SHAPE_TAG[dominant]
    if (tag) tags.push(tag)
    tags.push('vernaculaire')
  } else {
    // Sparse sighting tags when no clear majority
    if (neighbors.some((n) => n.shape === 'longhouse')) tags.push('longère_vue')
    if (neighbors.some((n) => n.shape === 'courtyard')) tags.push('cour_vue')
  }
  if (stoneN >= 2) tags.push('pierre_vue')
  else if (neighbors.some((n) => n.wallMaterial === 'stone')) tags.push('pierre_vue')
  if (woodN >= 3 && !tags.includes('bois_ouvré')) tags.push('bois_voisin')

  // Soft whim — only when local form is unsettled (no vernacular lock-in).
  if (!hasVernacular && rng() < 0.1) tags.push('fantaisie_locale')
  return tags
}

/** Tags safe to absorb into ethnos self identity (skip whim flourishes). */
export function isVernacularCultureTag(tag: string): boolean {
  return !!tag && !tag.startsWith('fantaisie')
}

/** Reinforce village style after a unique plan is chosen (not a template stamp). */
export function rememberBuiltShape(style: StyleWeights, shape: HouseShape) {
  reinforceStyle(style, shape)
}
