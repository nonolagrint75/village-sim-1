import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const out = path.resolve(__dirname, "../../src/lib/render/nature/shorePaint.ts")
const at = String.fromCharCode(64)

const src = `/**
 * Continuous shore + dirt paint — multi-cell shared SDF strip.
 * Opaque land/cover color-lerp; neighbor overspill so coasts do not seam
 * on the tile grid (Stardew/Puny continuous water).
 */
import { DIRT, SAND, WATER } from "${at}/lib/sim/types"
import { fbm2, simplex2 } from "../noise"

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

function shoreWarp(wx: number, wy: number): number {
  return (
    fbm2(wx * 0.32, wy * 0.32, 4, 2.05, 0.52) * 0.85 +
    simplex2(wx * 1.15 + 8.3, wy * 1.15) * 0.45 +
    simplex2(wx * 2.6 - 3.1, wy * 2.6 + 1.7) * 0.22
  )
}

function isWaterCell(terrain: Uint8Array, worldW: number, x: number, y: number): boolean {
  if (x < 0 || y < 0 || x >= worldW || y >= worldW) return true
  return terrain[y * worldW + x] === WATER
}

function isDirtOrSand(c: number): boolean {
  return c === DIRT || c === SAND
}

/**
 * Multi-cell continuous shore SDF (world units).
 * Positive = water side, negative = land side, 0 ≈ coast.
 */
export function shoreSdf(terrain: Uint8Array, worldW: number, wx: number, wy: number): number {
  const warp = shoreWarp(wx * 0.55, wy * 0.55) * 1.45
  const warpY = shoreWarp(wy * 0.55 + 6.1, wx * 0.55) * 1.45
  const sx = wx + warp
  const sy = wy + warpY
  const ix = Math.floor(sx)
  const iy = Math.floor(sy)
  const fx = sx - ix
  const fy = sy - iy
  const hereWater = isWaterCell(terrain, worldW, ix, iy)
  let best = 4
  for (let dy = -3; dy <= 3; dy++) {
    for (let dx = -3; dx <= 3; dx++) {
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
  const fine = (bil - 0.5) * 1.15
  const signed = hereWater ? Math.max(0.02, best) : -Math.max(0.02, best)
  return signed * 0.72 + fine * 0.55 + shoreWarp(sx * 0.95, sy * 0.95) * 0.38
}

export function shoreField(terrain: Uint8Array, worldW: number, wx: number, wy: number): number {
  return smoothstep(-0.85, 0.95, shoreSdf(terrain, worldW, wx, wy))
}

function dirtBlob(wx: number, wy: number): number {
  return (
    0.5 +
    fbm2(wx * 0.24 + 41.2, wy * 0.24 + 17.8, 5, 2.0, 0.5) * 0.48 +
    simplex2(wx * 0.75 + 3.7, wy * 0.75 + 11.2) * 0.28
  )
}

export function dirtSdf(terrain: Uint8Array, worldW: number, wx: number, wy: number): number {
  const warp = shoreWarp(wx * 0.6 + 17.3, wy * 0.6 + 9.1) * 1.25
  const warpY = shoreWarp(wy * 0.6 + 9.1, wx * 0.6 + 17.3) * 1.25
  const sx = wx + warp
  const sy = wy + warpY
  const ix = Math.floor(sx)
  const iy = Math.floor(sy)
  const fx = sx - ix
  const fy = sy - iy
  const samp = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= worldW || y >= worldW) return 0
    return isDirtOrSand(terrain[y * worldW + x]!) ? 1 : 0
  }
  const here = samp(ix, iy) > 0
  let best = 4
  for (let dy = -3; dy <= 3; dy++) {
    for (let dx = -3; dx <= 3; dx++) {
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
  const signed = here ? Math.max(0.02, best) : -Math.max(0.02, best)
  return signed * 0.65 + (bil - 0.5) * 0.5 + (blob - 0.5) * 0.55 + shoreWarp(sx + 2.4, sy + 1.1) * 0.28
}

export function dirtField(terrain: Uint8Array, worldW: number, wx: number, wy: number): number {
  return smoothstep(-0.7, 0.85, dirtSdf(terrain, worldW, wx, wy))
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
) {
  const span = 1 + pad * 2
  const n = Math.max(24, Math.min(56, Math.round(tileS * span * 1.15)))
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
      if (w <= 0.008 && (maskLo == null || f < lo)) continue
      const tint = tintFn ? tintFn(wx, wy) : 0
      const r = Math.max(0, Math.min(255, (land[0] * (1 - w) + cover[0] * w + tint) | 0))
      const g = Math.max(0, Math.min(255, (land[1] * (1 - w) + cover[1] * w + tint * 0.7) | 0))
      const b = Math.max(0, Math.min(255, (land[2] * (1 - w) + cover[2] * w + tint * 0.45) | 0))
      ctx.fillStyle = "rgb(" + r + "," + g + "," + b + ")"
      ctx.fillRect(ox + i * cell - 0.35, oy + j * cell - 0.35, cell + 0.75, cell + 0.75)
    }
  }
}

const SHORE_PAD = 0.92
const DIRT_PAD = 0.88

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
  paintOpaqueLerpStrip(ctx, field, gx, gy, px, py, tileS, land, water, 0.12, 0.52, SHORE_PAD, (wx, wy) => simplex2(wx * 2.2, wy * 2.2) * 5, 0.02, 0.98)
  paintOpaqueLerpStrip(ctx, field, gx, gy, px, py, tileS, water, deep, 0.48, 0.92, SHORE_PAD, undefined, 0.35, 1.01)
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
    gx, gy, px, py, tileS, land, water, 0.08, 0.55, SHORE_PAD, undefined, 0.04, 0.72,
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
    gx, gy, px, py, tileS, land, cover, 0.12, 0.55, DIRT_PAD,
    (wx, wy) => simplex2(wx * 2.8, wy * 2.8) * 7, 0.02, 0.98,
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
    gx, gy, px, py, tileS, land, grazed, 0.18, 0.62, DIRT_PAD, undefined, 0.08, 0.95,
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
  const field = (wx: number, wy: number) => shoreField(terrain, worldW, wx, wy)
  paintOpaqueLerpStrip(ctx, field, gx, gy, px, py, tileS, land, sand, 0.1, 0.45, SHORE_PAD, undefined, 0.02, 0.7)
  paintOpaqueLerpStrip(ctx, field, gx, gy, px, py, tileS, sand, water, 0.3, 0.78, SHORE_PAD, undefined, 0.15, 0.95)
}

/**
 * Viewport shore strip: continuous coast across near-shore cells.
 * Call AFTER ground underlays, BEFORE props.
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
  const land = rgbFromPacked(atlas.color32("grass"), [58, 90, 38])
  const water = rgbFromPacked(atlas.color32("water"), [36, 88, 104])
  const deep = rgbFromPacked(atlas.color32("water_deep"), [28, 68, 92])
  const field = (wx: number, wy: number) => shoreField(terrain, worldW, wx, wy)

  const nearCoast = (gx: number, gy: number): boolean => {
    const t = terrain[gy * worldW + gx]!
    let waterN = 0
    let landN = 0
    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        if (dx === 0 && dy === 0) continue
        const x = gx + dx
        const y = gy + dy
        if (x < 0 || y < 0 || x >= worldW || y >= worldW) continue
        if (terrain[y * worldW + x] === WATER) waterN++
        else landN++
      }
    }
    if (t === WATER) return landN >= 1
    return waterN >= 1
  }

  for (let gy = y0; gy < y1; gy++) {
    for (let gx = x0; gx < x1; gx++) {
      if (((gx + gy) & 1) !== 0) continue
      if (!nearCoast(gx, gy)) continue
      const px = (gx * tilePx - camX) * zoom
      const py = (gy * tilePx - camY) * zoom
      const t = terrain[gy * worldW + gx]!
      if (t === WATER) {
        paintOpaqueLerpStrip(
          ctx, field, gx, gy, px, py, tileS, land, water, 0.1, 0.5, 1.05,
          (wx, wy) => simplex2(wx * 2.2, wy * 2.2) * 4, 0.02, 0.98,
        )
        paintOpaqueLerpStrip(ctx, field, gx, gy, px, py, tileS, water, deep, 0.45, 0.9, 1.05, undefined, 0.32, 1.01)
      } else {
        paintOpaqueLerpStrip(ctx, field, gx, gy, px, py, tileS, land, water, 0.06, 0.52, 1.05, undefined, 0.03, 0.68)
      }
    }
  }
}

/** Viewport dirt strip: continuous dirt/sand blobs across cell boundaries. */
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
  const land = rgbFromPacked(atlas.color32("grass"), [58, 90, 38])
  const dirt = rgbFromPacked(atlas.color32("grass_grazed"), [118, 92, 52])
  const sand = rgbFromPacked(atlas.color32("sand"), [210, 186, 118])
  const field = (wx: number, wy: number) => dirtField(terrain, worldW, wx, wy)

  const nearDirt = (gx: number, gy: number): boolean => {
    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        const x = gx + dx
        const y = gy + dy
        if (x < 0 || y < 0 || x >= worldW || y >= worldW) continue
        if (isDirtOrSand(terrain[y * worldW + x]!)) return true
      }
    }
    return false
  }

  for (let gy = y0; gy < y1; gy++) {
    for (let gx = x0; gx < x1; gx++) {
      if (((gx + gy) & 1) !== 0) continue
      if (!nearDirt(gx, gy)) continue
      const px = (gx * tilePx - camX) * zoom
      const py = (gy * tilePx - camY) * zoom
      const t = terrain[gy * worldW + gx]!
      const cover = t === SAND ? sand : dirt
      paintOpaqueLerpStrip(
        ctx, field, gx, gy, px, py, tileS, land, cover, 0.12, 0.58, 1.0,
        (wx, wy) => simplex2(wx * 2.8, wy * 2.8) * 6, 0.04, 0.98,
      )
    }
  }
}
`

fs.writeFileSync(out, src, "utf8")
const b = fs.readFileSync(out)
console.log("wrote", out, "bytes", b.length, "bom", b[0], b[1])
