/**
 * Real multi-tile mountain tunnels — dig helpers for AI miners.
 * TUNNEL is landWalkable; corridors grow inward from mountain faces.
 * Dig budget + stamina caps prevent infinite caves per tick session.
 */

import { landWalkable } from './pathfinding'
import {
  DIRT,
  GRASS,
  MOUNTAIN,
  PLANK,
  SAND,
  TRAIL,
  TUNNEL,
  type ToolTier,
  type Village,
  type WorldGrid,
} from './types'
import { getTerrain, inBounds, isBuildableGround, setTerrain } from './world'

/** Dig HP baked into mountain `amount` at world gen. */
export const MOUNTAIN_DIG_HP_MIN = 5
export const MOUNTAIN_DIG_HP_MAX = 14

/** Max successful rock hits before a mineTunnel task ends (session budget). */
export const DIG_HITS_PER_SESSION = 3

/** Max corridor cells a single villager may open per session (safety). */
export const DIG_TILES_PER_SESSION = 2

/** Stamina multiplier vs normal labor. */
export const DIG_STAMINA_MULT = 1.35

/** Soft marker: TUNNEL amount ≥ this reads as entrance / shaft mouth. */
export const TUNNEL_ENTRANCE_AMOUNT = 1

const ORTHO = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
] as const

/** Real mining needs stone or iron — bare hands / wood spears chip nothing useful. */
export function canMineRock(tier: ToolTier): boolean {
  return tier === 'stone' || tier === 'iron'
}

export function digHpPerHit(tier: ToolTier): number {
  if (tier === 'iron') return 3
  if (tier === 'stone') return 2
  return 0
}

export function digStoneYield(tier: ToolTier): number {
  if (tier === 'iron') return 3
  if (tier === 'stone') return 2
  return 0
}

export function digIronYield(tier: ToolTier): number {
  if (tier === 'iron') return 3
  if (tier === 'stone') return 2
  return 0
}

export function digGoldYield(tier: ToolTier): number {
  if (tier === 'iron') return 2
  if (tier === 'stone') return 1
  return 0
}

/** Sum of local mountain/tunnel deposits — profession / dig targeting. */
export function localOreRichness(grid: WorldGrid, cx: number, cy: number, radius: number): number {
  let sum = 0
  const r2 = radius * radius
  const w = grid.width
  const h = grid.height
  for (let y = cy - radius; y <= cy + radius; y++) {
    if (y < 0 || y >= h) continue
    const row = y * w
    const dy = y - cy
    for (let x = cx - radius; x <= cx + radius; x++) {
      if (x < 0 || x >= w) continue
      const dx = x - cx
      if (dx * dx + dy * dy > r2) continue
      const i = row + x
      const t = grid.terrain[i]
      if (t !== MOUNTAIN && t !== TUNNEL) continue
      sum +=
        grid.ironDeposit[i] +
        grid.goldDeposit[i] * 2.2 +
        grid.copperDeposit[i] * 0.7 +
        grid.tinDeposit[i] * 0.9 +
        grid.silverDeposit[i] * 1.8 +
        grid.coalDeposit[i] * 0.5 +
        grid.leadDeposit[i] * 0.4
    }
  }
  return sum
}

export function digStaminaCost(tier: ToolTier): number {
  // Iron tools waste less stamina per hit.
  const base = 0.09 * DIG_STAMINA_MULT
  if (tier === 'iron') return base * 0.85
  if (tier === 'stone') return base
  return base * 1.15
}

/** True if this mountain cell touches walkable land or an existing tunnel (diggable face). */
export function isMountainFace(grid: WorldGrid, x: number, y: number): boolean {
  if (!inBounds(grid, x, y) || getTerrain(grid, x, y) !== MOUNTAIN) return false
  for (const [dx, dy] of ORTHO) {
    const nx = x + dx
    const ny = y + dy
    if (!inBounds(grid, nx, ny)) continue
    const t = getTerrain(grid, nx, ny)
    if (t === TUNNEL || landWalkable(t)) return true
  }
  return false
}

/** Prefer deepening: mountain adjacent to TUNNEL (corridor tip). */
export function isTunnelTip(grid: WorldGrid, x: number, y: number): boolean {
  if (!inBounds(grid, x, y) || getTerrain(grid, x, y) !== MOUNTAIN) return false
  for (const [dx, dy] of ORTHO) {
    const nx = x + dx
    const ny = y + dy
    if (inBounds(grid, nx, ny) && getTerrain(grid, nx, ny) === TUNNEL) return true
  }
  return false
}

export function isTunnelEntrance(grid: WorldGrid, x: number, y: number): boolean {
  if (!inBounds(grid, x, y) || getTerrain(grid, x, y) !== TUNNEL) return false
  const i = y * grid.width + x
  if (grid.amount[i] >= TUNNEL_ENTRANCE_AMOUNT) return true
  for (const [dx, dy] of ORTHO) {
    const nx = x + dx
    const ny = y + dy
    if (!inBounds(grid, nx, ny)) continue
    const t = getTerrain(grid, nx, ny)
    if (t !== MOUNTAIN && t !== TUNNEL && landWalkable(t)) return true
  }
  return false
}

function scoreDigCell(
  grid: WorldGrid,
  x: number,
  y: number,
  fromX: number,
  fromY: number,
  preferDeeper: boolean,
): number {
  const i = y * grid.width + x
  let score = 40
  if (isTunnelTip(grid, x, y)) score += preferDeeper ? 55 : 30
  else if (isMountainFace(grid, x, y)) score += 20
  else return -Infinity
  score += Math.min(24, grid.ironDeposit[i] * 1.2)
  score += Math.min(18, grid.goldDeposit[i] * 2.5)
  score += Math.min(16, grid.copperDeposit[i] * 1.0)
  score += Math.min(12, grid.tinDeposit[i] * 1.4)
  score += Math.min(10, grid.leadDeposit[i] * 0.9)
  score += Math.min(14, grid.silverDeposit[i] * 2.0)
  score += Math.min(12, grid.coalDeposit[i] * 0.8)
  const dist = Math.abs(x - fromX) + Math.abs(y - fromY)
  score -= dist * 0.55
  return score
}

export type DigTargetOpts = {
  maxRadius?: number
  preferDeeper?: boolean
  /** Bias toward a known mine mouth / project site. */
  anchorX?: number
  anchorY?: number
  anchorBias?: number
}

/**
 * Pick a diggable mountain cell: tunnel tips first (corridors), then outer faces.
 * Never returns buried mountain with no walkable/tunnel neighbour.
 */
export function pickDigTarget(
  grid: WorldGrid,
  fromX: number,
  fromY: number,
  opts: DigTargetOpts = {},
): { x: number; y: number } | null {
  const maxR = opts.maxRadius ?? 28
  const preferDeeper = opts.preferDeeper !== false
  let best: { x: number; y: number } | null = null
  let bestScore = -Infinity

  for (let r = 0; r <= maxR; r++) {
    const minX = fromX - r
    const maxX = fromX + r
    const minY = fromY - r
    const maxY = fromY + r
    for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= maxY; y++) {
        if (r > 0 && x !== minX && x !== maxX && y !== minY && y !== maxY) continue
        if (!inBounds(grid, x, y) || getTerrain(grid, x, y) !== MOUNTAIN) continue
        if (!isMountainFace(grid, x, y)) continue
        let score = scoreDigCell(grid, x, y, fromX, fromY, preferDeeper)
        if (opts.anchorX !== undefined && opts.anchorY !== undefined) {
          const ad = Math.abs(x - opts.anchorX) + Math.abs(y - opts.anchorY)
          score += (opts.anchorBias ?? 18) - ad * 0.8
        }
        if (score > bestScore) {
          bestScore = score
          best = { x, y }
        }
      }
    }
    // Early exit once we have a strong nearby tip
    const tip = best
    if (tip !== null && preferDeeper && isTunnelTip(grid, tip.x, tip.y) && r >= 4) break
  }
  return best
}

/** Mountain edge next to open ground — good place to open a shaft. */
export function findMineEntranceSite(
  grid: WorldGrid,
  baseX: number,
  baseY: number,
  maxRadius: number,
): { x: number; y: number; mountainX: number; mountainY: number } | null {
  let best: { x: number; y: number; mountainX: number; mountainY: number } | null = null
  let bestScore = -Infinity
  for (let r = 1; r <= maxRadius; r++) {
    const minX = baseX - r
    const maxX = baseX + r
    const minY = baseY - r
    const maxY = baseY + r
    for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= maxY; y++) {
        if (r > 0 && x !== minX && x !== maxX && y !== minY && y !== maxY) continue
        if (!inBounds(grid, x, y)) continue
        if (!isBuildableGround(grid, x, y) && getTerrain(grid, x, y) !== TRAIL) continue
        for (const [dx, dy] of ORTHO) {
          const mx = x + dx
          const my = y + dy
          if (!inBounds(grid, mx, my) || getTerrain(grid, mx, my) !== MOUNTAIN) continue
          const i = my * grid.width + mx
          let score = 30 - r * 0.6
          score += Math.min(20, grid.ironDeposit[i])
          score += Math.min(12, grid.goldDeposit[i] * 2)
          score += Math.min(14, grid.copperDeposit[i])
          score += Math.min(10, grid.tinDeposit[i] * 1.5)
          score += Math.min(10, grid.silverDeposit[i] * 2)
          score += Math.min(10, grid.coalDeposit[i])
          if (score > bestScore) {
            bestScore = score
            best = { x, y, mountainX: mx, mountainY: my }
          }
        }
      }
    }
  }
  return best
}

/**
 * Dump leftover stone/spoil on open ground outside the dig face
 * (toward village / open land), never deleting the resource.
 */
export function depositSpoil(
  grid: WorldGrid,
  digX: number,
  digY: number,
  amount: number,
  towardX: number,
  towardY: number,
): number {
  if (amount <= 0) return 0
  const preferDx = Math.sign(towardX - digX) || 0
  const preferDy = Math.sign(towardY - digY) || 0
  const dirs: [number, number][] = []
  if (preferDx || preferDy) dirs.push([preferDx, preferDy])
  for (const [dx, dy] of [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
    [1, 1],
    [1, -1],
    [-1, 1],
    [-1, -1],
  ] as const) {
    if (!dirs.some((d) => d[0] === dx && d[1] === dy)) dirs.push([dx, dy])
  }
  for (const [dx, dy] of dirs) {
    const x = digX + dx
    const y = digY + dy
    if (!inBounds(grid, x, y)) continue
    const t = getTerrain(grid, x, y)
    if (t === MOUNTAIN || t === TUNNEL) continue
    if (t === GRASS || t === DIRT || t === SAND || t === TRAIL) {
      const i = y * grid.width + x
      const cur = t === DIRT || (t === GRASS && grid.amount[i] > 0) ? grid.amount[i] : 0
      setTerrain(grid, x, y, DIRT, cur + amount)
      return 0
    }
  }
  return amount
}

/**
 * After a mountain cell becomes TUNNEL: mark entrance if it opens to surface,
 * place plank portal for mining_access, register village mine mouth.
 */
export function finalizeTunnelCell(
  grid: WorldGrid,
  x: number,
  y: number,
  village: Village | undefined,
  opts?: { placeAccess?: boolean },
): { isEntrance: boolean } {
  let opensOut = false
  for (const [dx, dy] of ORTHO) {
    const nx = x + dx
    const ny = y + dy
    if (!inBounds(grid, nx, ny)) continue
    const t = getTerrain(grid, nx, ny)
    if (t !== MOUNTAIN && t !== TUNNEL && landWalkable(t)) {
      opensOut = true
      break
    }
  }
  const amount = opensOut ? TUNNEL_ENTRANCE_AMOUNT : 0
  setTerrain(grid, x, y, TUNNEL, amount)

  if (opensOut && opts?.placeAccess !== false) {
    stampMiningAccess(grid, x, y)
  }

  if (opensOut && village && !village.hasMine) {
    village.hasMine = true
    village.mineX = x
    village.mineY = y
  }

  return { isEntrance: opensOut }
}

/**
 * Generative construction hook for purpose `mining_access`:
 * place a plank staging pad on the best open neighbour of a tunnel mouth.
 */
export function stampMiningAccess(grid: WorldGrid, tunnelX: number, tunnelY: number): { x: number; y: number } | null {
  let best: { x: number; y: number } | null = null
  for (const [dx, dy] of ORTHO) {
    const x = tunnelX + dx
    const y = tunnelY + dy
    if (!inBounds(grid, x, y)) continue
    const t = getTerrain(grid, x, y)
    if (t === PLANK) return { x, y }
    if (t === GRASS || t === DIRT || t === SAND || t === TRAIL) {
      if (!best) best = { x, y }
    }
  }
  if (!best) return null
  setTerrain(grid, best.x, best.y, PLANK, 0)
  return best
}

/** Ensure a mountain cell has dig HP (legacy worlds / edge cases). */
export function ensureMountainDigHp(grid: WorldGrid, x: number, y: number, rng?: () => number): void {
  if (!inBounds(grid, x, y) || getTerrain(grid, x, y) !== MOUNTAIN) return
  const i = y * grid.width + x
  if (grid.amount[i] > 0) return
  const n = rng ? rng() : ((x * 374761393 + y * 668265263) >>> 0) / 4294967296
  grid.amount[i] = MOUNTAIN_DIG_HP_MIN + Math.floor(n * (MOUNTAIN_DIG_HP_MAX - MOUNTAIN_DIG_HP_MIN + 1))
}

/** Next mountain to dig after opening a cell — continue the corridor. */
export function nextCorridorTip(grid: WorldGrid, fromX: number, fromY: number): { x: number; y: number } | null {
  return pickDigTarget(grid, fromX, fromY, { maxRadius: 6, preferDeeper: true, anchorX: fromX, anchorY: fromY, anchorBias: 30 })
}
