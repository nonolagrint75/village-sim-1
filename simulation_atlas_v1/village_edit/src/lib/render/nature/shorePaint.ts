/**
 * Continuous shore + dirt paint — multi-cell shared SDF strip.
 * HARD f>=0.5 + WARP_V6_COASTAL domain-warp bilin isocontour (leaves tile mid-edges).
 */
import { DIRT, SAND, WATER } from "@/lib/sim/types"
import { fbm2, simplex2 } from "../noise"

/** Live-verify marker — strip owns rim + morph open/close occupancy (no cyan mid-band). */
export const SHORE_WARP_BUILD = 'WARP_V9_STRIP_OWN'

export type AtlasColor = { color32: (key: string) => number | null }

function smoothstep(e0: number, e1: number, x: number): number {
  if (e1 <= e0) return x >= e1 ? 1 : 0
  const t = Math.max(0, Math.min(1, (x - e0) / (e1 - e0)))
  return t * t * (3 - 2 * t)
}

export function rgbFromPacked(
  c: number | null,
  fallback: [number, number, number],
): [number, number, number] {
  if (c == null) return fallback
  return [c & 255, (c >>> 8) & 255, (c >>> 16) & 255]
}

/** Raw multi-octave warp offsets (cells). Scaled by coastal proximity in shoreField. */
function warpOffsets(wx: number, wy: number): [number, number] {
  // WARP_V6_COASTAL: strong rim meander; amp gated so deep water/land stay stable.
  const lx =
    fbm2(wx * 0.065, wy * 0.065, 5, 2.05, 0.52) * 3.4 +
    fbm2(wx * 0.15 + 19.7, wy * 0.15 - 8.3, 4, 2.1, 0.52) * 1.7 +
    simplex2(wx * 0.34 + 11.3, wy * 0.34 - 4.7) * 1.15
  const ly =
    fbm2(wx * 0.065 + 37.1, wy * 0.065 - 19.4, 5, 2.05, 0.52) * 3.4 +
    fbm2(wx * 0.15 - 22.4, wy * 0.15 + 14.6, 4, 2.1, 0.52) * 1.7 +
    simplex2(wx * 0.34 - 8.2, wy * 0.34 + 15.6) * 1.15
  const mx =
    simplex2(wx * 0.52 + 3.1, wy * 0.52) * 1.7 +
    simplex2(wx * 1.1 - 6.4, wy * 1.1 + 2.8) * 0.95
  const my =
    simplex2(wx * 0.52 - 12.5, wy * 0.52 + 9.1) * 1.7 +
    simplex2(wx * 1.1 + 4.2, wy * 1.1 - 7.7) * 0.95
  const hx =
    simplex2(wx * 2.4 + 1.7, wy * 2.4) * 0.75 +
    simplex2(wx * 5.2 - 4.1, wy * 5.2 + 2.2) * 0.4 +
    simplex2(wx * 10.5 + 8.8, wy * 10.5 - 3.3) * 0.22
  const hy =
    simplex2(wx * 2.4 - 2.9, wy * 2.4 + 5.4) * 0.75 +
    simplex2(wx * 5.2 + 9.0, wy * 5.2 - 1.6) * 0.4 +
    simplex2(wx * 10.5 - 5.5, wy * 10.5 + 6.1) * 0.22
  return [lx + mx + hx, ly + my + hy]
}

/** Full warp (dirt / SDF helpers). */
function domainWarp(wx: number, wy: number): [number, number] {
  const [dx, dy] = warpOffsets(wx, wy)
  return [wx + dx, wy + dy]
}

/** Unwarped water occupancy for coastal amp gating (no land stamps in deep ocean). */
function roughWaterOcc(terrain: Uint8Array, worldW: number, wx: number, wy: number): number {
  const ix = Math.floor(wx)
  const iy = Math.floor(wy)
  const fx = wx - ix
  const fy = wy - iy
  const samp = (x: number, y: number) => (isWaterCell(terrain, worldW, x, y) ? 1 : 0)
  return (
    samp(ix, iy) * (1 - fx) * (1 - fy) +
    samp(ix + 1, iy) * fx * (1 - fy) +
    samp(ix, iy + 1) * (1 - fx) * fy +
    samp(ix + 1, iy + 1) * fx * fy
  )
}

/** Max near-shore factor in a small neighborhood — expands meander across stair steps. */
function coastalNear(terrain: Uint8Array, worldW: number, wx: number, wy: number): number {
  let best = 0
  for (let dy = -2; dy <= 2; dy++) {
    for (let dx = -2; dx <= 2; dx++) {
      const r = roughWaterOcc(terrain, worldW, wx + dx * 0.55, wy + dy * 0.55)
      const n = Math.max(0, 1 - Math.abs(r - 0.5) * 1.45)
      if (n > best) best = n
    }
  }
  return best
}


/** Multi-cell Gaussian occupancy — rounds Manhattan stairs into organic isocontours (Stardew/Puny). */
/** Multi-cell Gaussian occupancy — rounds Manhattan stairs into organic isocontours (Stardew/Puny). */
/** Morphological land-open then land-close — kills 1-cell stair juts/notches before blur. */
function morphWaterCell(terrain: Uint8Array, worldW: number, x: number, y: number): number {
  const land = (lx: number, ly: number) => (isWaterCell(terrain, worldW, lx, ly) ? 0 : 1)
  // Erode land (center land only if 3×3 all land).
  const erodeLand = (lx: number, ly: number) => {
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (!land(lx + dx, ly + dy)) return 0
      }
    }
    return 1
  }
  // Dilate eroded land → land-open (removes thin land juts into water).
  const openLand = (lx: number, ly: number) => {
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (erodeLand(lx + dx, ly + dy)) return 1
      }
    }
    return 0
  }
  // Dilate opened land.
  const dilateOpen = (lx: number, ly: number) => {
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (openLand(lx + dx, ly + dy)) return 1
      }
    }
    return 0
  }
  // Erode dilated → land-close (fills thin water notches into land).
  const closeLand = (lx: number, ly: number) => {
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (!dilateOpen(lx + dx, ly + dy)) return 0
      }
    }
    return 1
  }
  return 1 - closeLand(x, y)
}
function blurredWaterOcc(terrain: Uint8Array, worldW: number, sx: number, sy: number): number {
  // 7×7 cell centers; radius ~2.5 — L-corners and 2-cell stairs leave the grid.
  const cx = Math.floor(sx)
  const cy = Math.floor(sy)
  const fx = sx - cx - 0.5
  const fy = sy - cy - 0.5
  let sum = 0
  let wsum = 0
  for (let j = -3; j <= 3; j++) {
    for (let i = -3; i <= 3; i++) {
      const dx = fx - i
      const dy = fy - j
      const d2 = dx * dx + dy * dy
      if (d2 > 12.5) continue
      // sigma≈1.15 — round multi-cell stairs; deep clamps still protect basins.
      const w = Math.exp(-d2 * 0.38)
      sum += w * morphWaterCell(terrain, worldW, cx + i, cy + j)
      wsum += w
    }
  }
  return wsum > 1e-6 ? sum / wsum : 0
}

function blurredWaterOccFast(terrain: Uint8Array, worldW: number, sx: number, sy: number): number {
  const cx = Math.floor(sx)
  const cy = Math.floor(sy)
  const fx = sx - cx - 0.5
  const fy = sy - cy - 0.5
  let sum = 0
  let wsum = 0
  for (let j = -2; j <= 2; j++) {
    for (let i = -2; i <= 2; i++) {
      const dx = fx - i
      const dy = fy - j
      const d2 = dx * dx + dy * dy
      if (d2 > 8.5) continue
      const w = Math.exp(-d2 * 0.55)
      sum += w * morphWaterCell(terrain, worldW, cx + i, cy + j)
      wsum += w
    }
  }
  return wsum > 1e-6 ? sum / wsum : 0
}
function blurredDirtOcc(terrain: Uint8Array, worldW: number, sx: number, sy: number): number {
  const cx = Math.floor(sx)
  const cy = Math.floor(sy)
  const fx = sx - cx - 0.5
  const fy = sy - cy - 0.5
  let sum = 0
  let wsum = 0
  for (let j = -2; j <= 2; j++) {
    for (let i = -2; i <= 2; i++) {
      const dx = fx - i
      const dy = fy - j
      const w = Math.exp(-(dx * dx + dy * dy) * 0.75)
      const x = cx + i
      const y = cy + j
      let v = 0
      if (x >= 0 && y >= 0 && x < worldW && y < worldW) {
        v = isDirtOrSand(terrain[y * worldW + x]) ? 1 : 0
      }
      sum += w * v
      wsum += w
    }
  }
  return wsum > 1e-6 ? sum / wsum : 0
}
/** Scalar residual kept for residual jig on fields. */
function shoreWarp(wx: number, wy: number): number {
  return (
    fbm2(wx * 0.22, wy * 0.22, 5, 2.1, 0.55) * 1.1 +
    simplex2(wx * 1.0 + 8.3, wy * 1.0) * 0.65 +
    simplex2(wx * 1.9 - 3.1, wy * 1.9 + 1.7) * 0.35 +
    simplex2(wx * 3.4 + 2.2, wy * 3.4 - 1.1) * 0.18 +
    simplex2(wx * 8.2 - 1.4, wy * 8.2 + 4.7) * 0.1
  )
}

function isWaterCell(terrain: Uint8Array, worldW: number, x: number, y: number): boolean {
  if (x < 0 || y < 0 || x >= worldW || y >= worldW) return true
  return terrain[y * worldW + x] === WATER
}

function isDirtOrSand(c: number): boolean {
  return c === DIRT || c === SAND
}

export function shoreSdf(terrain: Uint8Array, worldW: number, wx: number, wy: number): number {
  // HARD f>=0.5 isocontour: vector warp + low bilinear (bil locks to tile corners).
  const [sx, sy] = domainWarp(wx, wy)
  const ix = Math.floor(sx)
  const iy = Math.floor(sy)
  const fx = sx - ix
  const fy = sy - iy
  const hereWater = isWaterCell(terrain, worldW, ix, iy)
  let best = 6
  for (let dy = -9; dy <= 9; dy++) {
    for (let dx = -9; dx <= 9; dx++) {
      const ox = ix + dx
      const oy = iy + dy
      if (isWaterCell(terrain, worldW, ox, oy) === hereWater) continue
      const d = Math.hypot(sx - (ox + 0.5), sy - (oy + 0.5)) - 0.5
      if (d < best) best = d
    }
  }
  const samp = (x: number, y: number) => (isWaterCell(terrain, worldW, x, y) ? 1 : 0)
  const bil =
    samp(ix, iy) * (1 - fx) * (1 - fy) +
    samp(ix + 1, iy) * fx * (1 - fy) +
    samp(ix, iy + 1) * (1 - fx) * fy +
    samp(ix + 1, iy + 1) * fx * fy
  const fine = (bil - 0.5) * 0.55
  const signed = hereWater ? Math.max(0.02, best) : -Math.max(0.02, best)
  return signed * 0.45 + fine * 0.12 + shoreWarp(sx * 0.7, sy * 0.7) * 1.55
}

export function shoreLerpWeights(f: number): { w: number; deepW: number } {
  return { w: smoothstep(0.08, 0.42, f), deepW: smoothstep(0.58, 0.94, f) }
}

/**
 * HARD water/deep pick — never land↔water color mix (cyan rim).
 */
export function shoreHardRgb(
  f: number,
  water: [number, number, number],
  deep: [number, number, number],
): [number, number, number] {
  const deepW = smoothstep(0.5, 0.72, f)
  return [
    Math.max(0, Math.min(255, (water[0] * (1 - deepW) + deep[0] * deepW) | 0)),
    Math.max(0, Math.min(255, (water[1] * (1 - deepW) + deep[1] * deepW) | 0)),
    Math.max(0, Math.min(255, (water[2] * (1 - deepW) + deep[2] * deepW) | 0)),
  ]
}

/** Short SDF soft fringe — AA only (~0.05 field). Land/water colors, no wide cyan mid-band. */
export function shoreSoftRgb(
  f: number,
  land: [number, number, number],
  water: [number, number, number],
  deep: [number, number, number],
): [number, number, number] {
  // Half-width in field units: ~sub-cell at z12 — breaks binary stairs without a thick cyan rim.
  const half = 0.16
  const waterW = smoothstep(0.5 - half, 0.5 + half, f)
  if (waterW <= 0.02) return [land[0], land[1], land[2]]
  if (waterW >= 0.98) return shoreHardRgb(f, water, deep)
  // Fringe mixes land with shallow water only (not deep) — keeps rim readable vs Stardew/Puny.
  const edge = water
  return [
    Math.max(0, Math.min(255, (land[0] * (1 - waterW) + edge[0] * waterW) | 0)),
    Math.max(0, Math.min(255, (land[1] * (1 - waterW) + edge[1] * waterW) | 0)),
    Math.max(0, Math.min(255, (land[2] * (1 - waterW) + edge[2] * waterW) | 0)),
  ]
}
/** Near-hard gate (no blue@alpha over grass). */
export function shoreAlpha(f: number, wx = 0, wy = 0): number {
  // Warp the HARD threshold itself so silhouette leaves tile mid-edges.
  const thresh =
    0.5 +
    simplex2(wx * 1.55 + 3.3, wy * 1.55 - 2.1) * 0.38 +
    simplex2(wx * 3.7 - 5.5, wy * 3.7 + 1.4) * 0.24 +
    fbm2(wx * 0.48 + 8.2, wy * 0.48 - 4.7, 3, 2.05, 0.5) * 0.18
  return f >= thresh ? 1 : 0
}

/** Warped hard gate for dirt silhouette (beige Manhattan). */
export function dirtAlpha(f: number, wx = 0, wy = 0): number {
  const thresh =
    0.5 +
    simplex2(wx * 1.4 + 7.1, wy * 1.4 - 3.3) * 0.4 +
    simplex2(wx * 3.4 - 2.2, wy * 3.4 + 5.5) * 0.24 +
    fbm2(wx * 0.42 + 2.4, wy * 0.42 - 9.1, 3, 2.05, 0.5) * 0.18
  return f >= thresh ? 1 : 0
}

/** @deprecated — hard water only. */
export function shoreRgbAt(
  f: number,
  _land: [number, number, number],
  water: [number, number, number],
  deep: [number, number, number],
): [number, number, number] {
  return shoreHardRgb(f, water, deep)
}

export function shoreField(terrain: Uint8Array, worldW: number, wx: number, wy: number): number {
  // WARP_V9_STRIP_OWN: Gaussian multi-cell occupancy — silhouette leaves tile grid (Stardew/Puny).
  const rough = roughWaterOcc(terrain, worldW, wx, wy)
  const near = coastalNear(terrain, worldW, wx, wy)
  // Mild warp only — blur owns stair kill; high amp shredded land (V7E).
  const amp = 0.4 + near * 0.95
  const [odx, ody] = warpOffsets(wx, wy)
  const sx = wx + odx * amp
  const sy = wy + ody * amp
  const bil = blurredWaterOcc(terrain, worldW, sx, sy)
  // Light rim jig on blurred field — organic meander without cyan mid-band.
  const mid = Math.max(0, 1 - Math.abs(bil - 0.5) * 2.0) * Math.max(near, 0.35)
  let f =
    bil +
    mid *
      (shoreWarp(sx * 0.85, sy * 0.85) * 0.12 +
        simplex2(wx * 0.9 + 2.1, wy * 0.9 - 3.4) * 0.1 +
        simplex2(wx * 2.2 - 1.2, wy * 2.2 + 3.1) * 0.07)
  f = Math.max(0, Math.min(1, f))
  // Soft deep clamps — no land stamps in open ocean, no water holes inland.
  if (rough > 0.88 && near < 0.2) f = Math.max(f, 0.7)
  if (rough < 0.12 && near < 0.2) f = Math.min(f, 0.3)
  return Math.max(0, Math.min(1, f))
}

export function shoreFieldFast(terrain: Uint8Array, worldW: number, wx: number, wy: number): number {
  const rough = roughWaterOcc(terrain, worldW, wx, wy)
  const near = coastalNear(terrain, worldW, wx, wy)
  const amp = 0.4 + near * 0.95
  const [odx, ody] = warpOffsets(wx, wy)
  const sx = wx + odx * amp
  const sy = wy + ody * amp
  let f = Math.max(0, Math.min(1, blurredWaterOccFast(terrain, worldW, sx, sy) + shoreWarp(sx * 0.9, sy * 0.9) * 0.1 * near))
  const mid = Math.max(0, 1 - Math.abs(f - 0.5) * 2) * Math.max(near, 0.4)
  f += simplex2(wx * 1.5 + 4.4, wy * 1.5 - 2.2) * 0.08 * mid
  f = Math.max(0, Math.min(1, f))
  if (rough > 0.88 && near < 0.2) f = Math.max(f, 0.7)
  if (rough < 0.12 && near < 0.2) f = Math.min(f, 0.3)
  return Math.max(0, Math.min(1, f))
}
function dirtBlob(wx: number, wy: number): number {
  return (
    0.5 +
    fbm2(wx * 0.18 + 41.2, wy * 0.18 + 17.8, 6, 2.05, 0.52) * 0.58 +
    simplex2(wx * 0.55 + 3.7, wy * 0.55 + 11.2) * 0.34 +
    simplex2(wx * 1.35 - 2.4, wy * 1.55 + 8.1) * 0.18
  )
}

export function dirtSdf(terrain: Uint8Array, worldW: number, wx: number, wy: number): number {
  // Aggressive vector warp — beige Manhattan edges must leave tile mid-edges.
  const [sx0, sy0] = domainWarp(wx + 17.3, wy + 9.1)
  const sx = sx0 - 17.3
  const sy = sy0 - 9.1
  const ix = Math.floor(sx)
  const iy = Math.floor(sy)
  const fx = sx - ix
  const fy = sy - iy
  const samp = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= worldW || y >= worldW) return 0
    return isDirtOrSand(terrain[y * worldW + x]!) ? 1 : 0
  }
  const here = samp(ix, iy) > 0
  let best = 6
  for (let dy = -9; dy <= 9; dy++) {
    for (let dx = -9; dx <= 9; dx++) {
      const ox = ix + dx
      const oy = iy + dy
      if ((samp(ox, oy) > 0) === here) continue
      const d = Math.hypot(sx - (ox + 0.5), sy - (oy + 0.5)) - 0.5
      if (d < best) best = d
    }
  }
  const bil =
    samp(ix, iy) * (1 - fx) * (1 - fy) +
    samp(ix + 1, iy) * fx * (1 - fy) +
    samp(ix, iy + 1) * (1 - fx) * fy +
    samp(ix + 1, iy + 1) * fx * fy
  const blob = dirtBlob(wx, wy)
  const signed = here ? Math.max(0.015, best) : -Math.max(0.015, best)
  const edge = Math.max(0, 1 - Math.abs(signed) * 1.2)
  return (
    signed * 0.5 +
    (bil - 0.5) * 0.28 +
    (blob - 0.5) * 0.42 * edge +
    shoreWarp(sx + 2.4, sy + 1.1) * 1.35 * edge
  )
}

export function dirtField(terrain: Uint8Array, worldW: number, wx: number, wy: number): number {
  // WARP_V8 dirt: blurred multi-cell occupancy — beige leaves tile mid-edges.
  const [sx0, sy0] = domainWarp(wx + 17.3, wy + 9.1)
  const sx = sx0 - 17.3
  const sy = sy0 - 9.1
  const bil = blurredDirtOcc(terrain, worldW, sx, sy)
  const base = Math.max(0, Math.min(1, bil + shoreWarp(sx + 2.4, sy + 1.1) * 0.16))
  const mid = Math.max(0, 1 - Math.abs(base - 0.5) * 2)
  const carve =
    simplex2(wx * 1.55 + 3.3, wy * 1.55 - 1.8) * 0.22 * mid +
    fbm2(wx * 0.8 + 2.1, wy * 0.8 - 1.4, 4, 2.05, 0.5) * 0.14 * mid
  return Math.max(0, Math.min(1, base + carve))
}

/** Opaque land/cover lerp with neighbor overspill (pad in world cells). */
function paintOpaqueLerpStrip(
  ctx: CanvasRenderingContext2D,
  fieldAt: (wx: number, wy: number) => number,
  gx: number,
  gy: number,
  px: number,
  py: number,
  tileS: number,
  land: [number, number, number],
  cover: [number, number, number],
  lo: number,
  hi: number,
  pad: number,
  tintFn?: (wx: number, wy: number) => number,
  maskLo?: number,
  maskHi?: number,
  densityScale = 1,
) {
  const span = 1 + pad * 2
  const n = Math.max(10, Math.min(22, Math.round(tileS * span * 0.55 * densityScale)))
  const cell = (tileS * span) / n
  const ox = px - pad * tileS
  const oy = py - pad * tileS
  ctx.globalAlpha = 1
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      const u = (i + 0.5) / n
      const v = (j + 0.5) / n
      const wx = gx - pad + u * span
      const wy = gy - pad + v * span
      const f = fieldAt(wx, wy)
      if (maskLo != null && f < maskLo) continue
      if (maskHi != null && f > maskHi) continue
      const w = smoothstep(lo, hi, f)
      // Always paint — opaque cover must not leave world-buffer holes.
      const tint = tintFn ? tintFn(wx, wy) : 0
      const r = Math.max(0, Math.min(255, (land[0] * (1 - w) + cover[0] * w + tint) | 0))
      const g = Math.max(0, Math.min(255, (land[1] * (1 - w) + cover[1] * w + tint * 0.7) | 0))
      const b = Math.max(0, Math.min(255, (land[2] * (1 - w) + cover[2] * w + tint * 0.45) | 0))
      ctx.fillStyle = "rgb(" + r + "," + g + "," + b + ")"
      ctx.fillRect(ox + i * cell - 0.35, oy + j * cell - 0.35, cell + 0.75, cell + 0.75)
    }
  }
}

const SHORE_PAD = 0.42
const DIRT_PAD = 0.4

export function paintOrganicShoreWater(
  ctx: CanvasRenderingContext2D,
  atlas: AtlasColor,
  terrain: Uint8Array,
  worldW: number,
  gx: number,
  gy: number,
  px: number,
  py: number,
  tileS: number,
  blitLand: () => void,
) {
  void blitLand
  const land = rgbFromPacked(atlas.color32("grass"), [58, 90, 38])
  const water = rgbFromPacked(atlas.color32("water"), [36, 88, 104])
  const deep = rgbFromPacked(atlas.color32("water_deep"), [28, 68, 92])
  const field = (wx: number, wy: number) => shoreField(terrain, worldW, wx, wy)
  paintOpaqueLerpStrip(ctx, field, gx, gy, px, py, tileS, land, water, 0.02, 0.58, SHORE_PAD, (wx, wy) => simplex2(wx * 2.2, wy * 2.2) * 5, undefined, undefined, 1.15)
  paintOpaqueLerpStrip(ctx, field, gx, gy, px, py, tileS, water, deep, 0.38, 0.92, SHORE_PAD, undefined, undefined, undefined, 1.0)
}

export function paintLandShoreFringe(
  ctx: CanvasRenderingContext2D,
  atlas: AtlasColor,
  terrain: Uint8Array,
  worldW: number,
  gx: number,
  gy: number,
  px: number,
  py: number,
  tileS: number,
) {
  const land = rgbFromPacked(atlas.color32("grass"), [58, 90, 38])
  const water = rgbFromPacked(atlas.color32("water"), [36, 88, 104])
  paintOpaqueLerpStrip(
    ctx,
    (wx, wy) => shoreField(terrain, worldW, wx, wy),
    gx, gy, px, py, tileS, land, water, 0.02, 0.62, SHORE_PAD,
    undefined, undefined, undefined, 1.15,
  )
}

export function paintOrganicDirtPatch(
  ctx: CanvasRenderingContext2D,
  atlas: AtlasColor,
  terrain: Uint8Array,
  worldW: number,
  gx: number,
  gy: number,
  px: number,
  py: number,
  tileS: number,
  blitGrass: () => void,
  coverKey: string,
) {
  void blitGrass
  const land = rgbFromPacked(atlas.color32("grass"), [58, 90, 38])
  const cover = rgbFromPacked(
    atlas.color32(coverKey) ?? atlas.color32("grass_grazed"),
    coverKey === "sand" ? [210, 186, 118] : [118, 92, 52],
  )
  paintOpaqueLerpStrip(
    ctx,
    (wx, wy) => dirtField(terrain, worldW, wx, wy),
    gx, gy, px, py, tileS, land, cover, 0.02, 0.42, DIRT_PAD,
    (wx, wy) => simplex2(wx * 2.4, wy * 2.4) * 6,
    undefined,
    undefined,
    1.35,
  )
}

export function paintDirtBleedOnGrass(
  ctx: CanvasRenderingContext2D,
  atlas: AtlasColor,
  terrain: Uint8Array,
  worldW: number,
  gx: number,
  gy: number,
  px: number,
  py: number,
  tileS: number,
) {
  const land = rgbFromPacked(atlas.color32("grass"), [58, 90, 38])
  const grazed = rgbFromPacked(atlas.color32("grass_grazed"), [118, 92, 52])
  paintOpaqueLerpStrip(
    ctx,
    (wx, wy) => dirtField(terrain, worldW, wx, wy),
    gx, gy, px, py, tileS, land, grazed, 0.08, 0.55, DIRT_PAD, undefined, 0.06, 0.92,
    1.2,
  
  )
}

export function paintCoastalSand(
  ctx: CanvasRenderingContext2D,
  atlas: AtlasColor,
  terrain: Uint8Array,
  worldW: number,
  gx: number,
  gy: number,
  px: number,
  py: number,
  tileS: number,
  blitGrass: () => void,
) {
  void blitGrass
  const land = rgbFromPacked(atlas.color32("grass"), [58, 90, 38])
  const sand = rgbFromPacked(atlas.color32("sand"), [210, 186, 118])
  const water = rgbFromPacked(atlas.color32("water"), [36, 88, 104])
  const field = (wx: number, wy: number) => shoreFieldFast(terrain, worldW, wx, wy)
  paintOpaqueLerpStrip(ctx, field, gx, gy, px, py, tileS, land, sand, 0.08, 0.42, SHORE_PAD)
  paintOpaqueLerpStrip(ctx, field, gx, gy, px, py, tileS, sand, water, 0.28, 0.75, SHORE_PAD)
}

/**
 * Viewport shore strip: continuous coast across near-shore cells.
 * Call AFTER ground underlays, BEFORE props.
 */
let _shoreTmp: HTMLCanvasElement | null = null
function shoreTmpCanvas(w: number, h: number): CanvasRenderingContext2D {
  if (!_shoreTmp || _shoreTmp.width < w || _shoreTmp.height < h) {
    _shoreTmp = document.createElement("canvas")
    _shoreTmp.width = Math.max(w, 64)
    _shoreTmp.height = Math.max(h, 64)
  } else if (_shoreTmp.width < w || _shoreTmp.height < h) {
    _shoreTmp.width = w
    _shoreTmp.height = h
  }
  return _shoreTmp.getContext("2d")!
}

function cellTouchesOpposite(
  terrain: Uint8Array,
  worldW: number,
  gx: number,
  gy: number,
  wantWater: boolean,
  r: number,
): boolean {
  for (let dy = -r; dy <= r; dy++) {
    for (let dx = -r; dx <= r; dx++) {
      if (dx === 0 && dy === 0) continue
      const x = gx + dx
      const y = gy + dy
      if (x < 0 || y < 0 || x >= worldW || y >= worldW) continue
      if ((terrain[y * worldW + x] === WATER) === wantWater) return true
    }
  }
  return false
}

let _stripTmp: HTMLCanvasElement | null = null
function stripCanvas(w: number, h: number): CanvasRenderingContext2D {
  const ww = Math.max(1, w | 0)
  const hh = Math.max(1, h | 0)
  if (!_stripTmp || _stripTmp.width !== ww || _stripTmp.height !== hh) {
    _stripTmp = document.createElement("canvas")
    _stripTmp.width = ww
    _stripTmp.height = hh
  }
  return _stripTmp.getContext("2d")!
}

function cellTouchesDirt(terrain: Uint8Array, worldW: number, gx: number, gy: number, r = 2): boolean {
  for (let dy = -r; dy <= r; dy++) {
    for (let dx = -r; dx <= r; dx++) {
      const x = gx + dx
      const y = gy + dy
      if (x < 0 || y < 0 || x >= worldW || y >= worldW) continue
      if (isDirtOrSand(terrain[y * worldW + x]!)) return true
    }
  }
  return false
}

export function cellTouchesShore(terrain: Uint8Array, worldW: number, gx: number, gy: number, r = 3): boolean {
  const here = isWaterCell(terrain, worldW, gx, gy)
  for (let dy = -r; dy <= r; dy++) {
    for (let dx = -r; dx <= r; dx++) {
      if (dx === 0 && dy === 0) continue
      if (isWaterCell(terrain, worldW, gx + dx, gy + dy) !== here) return true
    }
  }
  return false
}

/**
 * Continuous opaque dirt strip across near-dirt AABB (one ImageData — no per-cell stairs).
 */
export function paintViewportShoreStrip(
  ctx: CanvasRenderingContext2D,
  atlas: AtlasColor,
  terrain: Uint8Array,
  worldW: number,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  camX: number,
  camY: number,
  zoom: number,
  tilePx: number,
) {
  const tileS = tilePx * zoom
  if (tileS < 5.5) return
  // Edge band r=2 — need one cell of overspill so SDF mid-band isn't clipped to Manhattan.
  const cells: { gx: number; gy: number }[] = []
  for (let gy = y0; gy <= y1; gy++) {
    for (let gx = x0; gx <= x1; gx++) {
      if (cellTouchesShore(terrain, worldW, gx, gy, 5)) cells.push({ gx, gy })
    }
  }
  if (typeof window !== 'undefined') (window as unknown as { __shoreStripLive?: { build: string; cells: number } }).__shoreStripLive = { build: SHORE_WARP_BUILD, cells: cells.length }
  if (!cells.length) return
  let minX = cells[0]!.gx, maxX = minX, minY = cells[0]!.gy, maxY = minY
  for (const c of cells) {
    if (c.gx < minX) minX = c.gx
    if (c.gy < minY) minY = c.gy
    if (c.gx > maxX) maxX = c.gx
    if (c.gy > maxY) maxY = c.gy
  }
  minX = Math.max(x0, minX - 4)
  minY = Math.max(y0, minY - 4)
  maxX = Math.min(x1, maxX + 4)
  maxY = Math.min(y1, maxY + 4)

  const land = rgbFromPacked(atlas.color32("grass"), [58, 90, 38])
  const water = rgbFromPacked(atlas.color32("water"), [36, 88, 104])
  const deep = rgbFromPacked(atlas.color32("water_deep"), [28, 68, 92])

  // Adaptive chunk: at z14 tileS~42, fixed CHUNK=18 → 756² > 200k → every chunk skipped → cyan Manhattan.
  const BUDGET = 360_000
  const step = tileS >= 64 ? 2 : 1
  const maxCells = Math.max(4, Math.floor(Math.sqrt(BUDGET) / (tileS / step)))
  const CHUNK = Math.min(24, maxCells)

  const prevSmooth = ctx.imageSmoothingEnabled
  ctx.imageSmoothingEnabled = true
  for (let cy0 = minY; cy0 <= maxY; cy0 += CHUNK) {
    for (let cx0 = minX; cx0 <= maxX; cx0 += CHUNK) {
      const cx1 = Math.min(maxX, cx0 + CHUNK - 1)
      const cy1 = Math.min(maxY, cy0 + CHUNK - 1)
      let hit = false
      for (const c of cells) {
        if (c.gx >= cx0 - 1 && c.gx <= cx1 + 1 && c.gy >= cy0 - 1 && c.gy <= cy1 + 1) {
          hit = true
          break
        }
      }
      if (!hit) continue
      const cellsW = cx1 - cx0 + 1
      const cellsH = cy1 - cy0 + 1
      const pw = Math.max(1, Math.ceil((cellsW * tileS) / step))
      const ph = Math.max(1, Math.ceil((cellsH * tileS) / step))
      if (pw * ph > BUDGET) {
        if (typeof window !== 'undefined') {
          const w = window as unknown as { __shoreStripLive?: { skipped?: number } }
          if (w.__shoreStripLive) w.__shoreStripLive.skipped = (w.__shoreStripLive.skipped ?? 0) + 1
        }
        continue
      }
      if (typeof window !== 'undefined') {
        const w = window as unknown as { __shoreStripLive?: { chunks?: number } }
        if (w.__shoreStripLive) w.__shoreStripLive.chunks = (w.__shoreStripLive.chunks ?? 0) + 1
      }
      const img = stripCanvas(pw, ph).createImageData(pw, ph)
      const data = img.data
      const inv = step / tileS
      for (let j = 0; j < ph; j++) {
        for (let i = 0; i < pw; i++) {
          const wx = cx0 + (i + 0.5) * inv
          const wy = cy0 + (j + 0.5) * inv
          // WARP_V9_STRIP_OWN: strong contour meander + short land/water AA (no sand/cyan mid-band).
          const o = (j * pw + i) * 4
          const f = shoreField(terrain, worldW, wx, wy)
          const eps = Math.max(0.07, inv * 0.85)
          const gfx = shoreField(terrain, worldW, wx + eps, wy) - shoreField(terrain, worldW, wx - eps, wy)
          const gfy = shoreField(terrain, worldW, wx, wy + eps) - shoreField(terrain, worldW, wx, wy - eps)
          const grad = Math.hypot(gfx, gfy) * (0.5 / eps) + 1e-4
          // Stronger isocontour meander — silhouette must leave tile mid-edges (Stardew/Puny).
          const thresh =
            0.5 +
            simplex2(wx * 0.55 + 2.1, wy * 0.55 - 4.4) * 0.14 +
            simplex2(wx * 1.25 - 3.2, wy * 1.25 + 1.7) * 0.1 +
            fbm2(wx * 0.2 + 8.0, wy * 0.2 - 2.5, 3, 2.0, 0.5) * 0.08
          const dist = (f - thresh) / grad
          // SHORT soft AA only (~sub-cell) — breaks pixel stairs, not a visible cyan/sand mid-band.
          const half = 0.16
          const landW = 1 - smoothstep(-half, half, dist)
          if (landW >= 0.92) {
            data[o] = land[0]
            data[o + 1] = land[1]
            data[o + 2] = land[2]
            data[o + 3] = 255
          } else if (landW <= 0.08) {
            const [r, g, b] = shoreHardRgb(f, water, deep)
            data[o] = r
            data[o + 1] = g
            data[o + 2] = b
            data[o + 3] = 255
          } else {
            const w = 1 - landW
            data[o] = Math.max(0, Math.min(255, (land[0] * landW + water[0] * w) | 0))
            data[o + 1] = Math.max(0, Math.min(255, (land[1] * landW + water[1] * w) | 0))
            data[o + 2] = Math.max(0, Math.min(255, (land[2] * landW + water[2] * w) | 0))
            data[o + 3] = 255
          }
        }
      }
      const sctx = stripCanvas(pw, ph)
      sctx.putImageData(img, 0, 0)
      const dx = (cx0 * tilePx - camX) * zoom
      const dy = (cy0 * tilePx - camY) * zoom
      ctx.drawImage(sctx.canvas, 0, 0, pw, ph, dx, dy, cellsW * tileS, cellsH * tileS)
    }
  }
  ctx.imageSmoothingEnabled = prevSmooth
}

export function paintViewportDirtStrip(
  ctx: CanvasRenderingContext2D,
  atlas: AtlasColor,
  terrain: Uint8Array,
  worldW: number,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  camX: number,
  camY: number,
  zoom: number,
  tilePx: number,
) {
  const tileS = tilePx * zoom
  if (tileS < 5.5) return
  const cells: { gx: number; gy: number }[] = []
  for (let gy = y0; gy <= y1; gy++) {
    for (let gx = x0; gx <= x1; gx++) {
      if (cellTouchesDirt(terrain, worldW, gx, gy, 4)) cells.push({ gx, gy })
    }
  }
  if (!cells.length) return
  let minX = cells[0]!.gx, maxX = minX, minY = cells[0]!.gy, maxY = minY
  for (const c of cells) {
    if (c.gx < minX) minX = c.gx
    if (c.gy < minY) minY = c.gy
    if (c.gx > maxX) maxX = c.gx
    if (c.gy > maxY) maxY = c.gy
  }
  minX = Math.max(x0, minX - 4)
  minY = Math.max(y0, minY - 4)
  maxX = Math.min(x1, maxX + 4)
  maxY = Math.min(y1, maxY + 4)

  const land = rgbFromPacked(atlas.color32("grass"), [58, 90, 38])
  const cover = rgbFromPacked(atlas.color32("grass_grazed"), [118, 92, 52])
  const sand = rgbFromPacked(atlas.color32("sand"), [210, 186, 118])
  // Adaptive chunk — fixed 18×tileS@z14 exceeds budget → beige Manhattan underlay.
  const BUDGET = 360_000
  const step = tileS >= 64 ? 2 : 1
  const maxCells = Math.max(4, Math.floor(Math.sqrt(BUDGET) / (tileS / step)))
  const CHUNK = Math.min(24, maxCells)
  const prevSmooth = ctx.imageSmoothingEnabled
  ctx.imageSmoothingEnabled = true
  for (let cy0 = minY; cy0 <= maxY; cy0 += CHUNK) {
    for (let cx0 = minX; cx0 <= maxX; cx0 += CHUNK) {
      const cx1 = Math.min(maxX, cx0 + CHUNK - 1)
      const cy1 = Math.min(maxY, cy0 + CHUNK - 1)
      let hit = false
      for (const c of cells) {
        if (c.gx >= cx0 - 1 && c.gx <= cx1 + 1 && c.gy >= cy0 - 1 && c.gy <= cy1 + 1) {
          hit = true
          break
        }
      }
      if (!hit) continue
      const cellsW = cx1 - cx0 + 1
      const cellsH = cy1 - cy0 + 1
      const pw = Math.max(1, Math.ceil((cellsW * tileS) / step))
      const ph = Math.max(1, Math.ceil((cellsH * tileS) / step))
      if (pw * ph > BUDGET) continue
      const img = stripCanvas(pw, ph).createImageData(pw, ph)
      const data = img.data
      const inv = step / tileS
      for (let j = 0; j < ph; j++) {
        for (let i = 0; i < pw; i++) {
          const wx = cx0 + (i + 0.5) * inv
          const wy = cy0 + (j + 0.5) * inv
          if (shoreField(terrain, worldW, wx, wy) >= 0.28) continue
          const f = dirtField(terrain, worldW, wx, wy)
          const o = (j * pw + i) * 4
          if (f < 0.5) {
            data[o] = land[0]
            data[o + 1] = land[1]
            data[o + 2] = land[2]
            data[o + 3] = 255
          } else {
            // cover only — sand-at-coast was beige Manhattan rim
            const c1 = cover
            data[o] = c1[0]
            data[o + 1] = c1[1]
            data[o + 2] = c1[2]
            data[o + 3] = 255
          }
        }
      }
      const sctx = stripCanvas(pw, ph)
      sctx.putImageData(img, 0, 0)
      const dx = (cx0 * tilePx - camX) * zoom
      const dy = (cy0 * tilePx - camY) * zoom
      ctx.drawImage(sctx.canvas, 0, 0, pw, ph, dx, dy, cellsW * tileS, cellsH * tileS)
    }
  }
  ctx.imageSmoothingEnabled = prevSmooth
}


