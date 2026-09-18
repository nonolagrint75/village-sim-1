import fs from "fs"
const path = "src/lib/render/nature/shorePaint.ts"
const body = fs.readFileSync(path, "utf8")
// Drop leading orphaned shoreFieldFast doc if body starts mid-file — keep from first real content
// body currently starts with shoreFieldFast which needs helpers above it

const header = `/**
 * Continuous shore + dirt paint — multi-cell shared SDF strip.
 * Hard opaque water/dirt via SDF (no cyan mid-band color lerp).
 * Aggressive vector domain-warp so hard 0.5 isocontour leaves tile mid-edges.
 */
import { DIRT, SAND, WATER } from "@/lib/sim/types"
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

/** Multi-octave vector domain-warp — hard 0.5 isocontour must leave tile mid-edges. */
function domainWarp(wx: number, wy: number): [number, number] {
  // Low-freq mass meander (~0.9–1.4 cells)
  const lx =
    fbm2(wx * 0.1, wy * 0.1, 5, 2.05, 0.52) * 1.25 +
    simplex2(wx * 0.28 + 11.3, wy * 0.28 - 4.7) * 0.55
  const ly =
    fbm2(wx * 0.1 + 37.1, wy * 0.1 - 19.4, 5, 2.05, 0.52) * 1.25 +
    simplex2(wx * 0.28 - 8.2, wy * 0.28 + 15.6) * 0.55
  // Mid-freq coastline snakes
  const mx =
    simplex2(wx * 0.72 + 3.1, wy * 0.72) * 0.72 +
    simplex2(wx * 1.35 - 6.4, wy * 1.35 + 2.8) * 0.38
  const my =
    simplex2(wx * 0.72 - 12.5, wy * 0.72 + 9.1) * 0.72 +
    simplex2(wx * 1.35 + 4.2, wy * 1.35 - 7.7) * 0.38
  // High-freq edge jitter — breaks straight Manhattan segments at z14
  const hx =
    simplex2(wx * 3.1 + 1.7, wy * 3.1) * 0.42 +
    simplex2(wx * 7.4 - 4.1, wy * 7.4 + 2.2) * 0.22 +
    simplex2(wx * 13.2 + 8.8, wy * 13.2 - 3.3) * 0.11
  const hy =
    simplex2(wx * 3.1 - 2.9, wy * 3.1 + 5.4) * 0.42 +
    simplex2(wx * 7.4 + 9.0, wy * 7.4 - 1.6) * 0.22 +
    simplex2(wx * 13.2 - 5.5, wy * 13.2 + 6.1) * 0.11
  return [wx + lx + mx + hx, wy + ly + my + hy]
}

/** Scalar residual kept for residual jig on fields. */
function shoreWarp(wx: number, wy: number): number {
  return (
    fbm2(wx * 0.22, wy * 0.22, 5, 2.1, 0.55) * 1.1 +
    simplex2(wx * 0.85 + 8.3, wy * 0.85) * 0.65 +
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
  // Aggressive vector domain-warp — hard 0.5 contour must leave tile mid-edges (shape FAIL).
  const [sx, sy] = domainWarp(wx, wy)
  const ix = Math.floor(sx)
  const iy = Math.floor(sy)
  const fx = sx - ix
  const fy = sy - iy
  const hereWater = isWaterCell(terrain, worldW, ix, iy)
  let best = 6
  for (let dy = -5; dy <= 5; dy++) {
    for (let dx = -5; dx <= 5; dx++) {
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
  const fine = (bil - 0.5) * 1.25
  const signed = hereWater ? Math.max(0.02, best) : -Math.max(0.02, best)
  return signed * 0.68 + fine * 0.5 + shoreWarp(sx * 0.9, sy * 0.9) * 0.55
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

/** Soft SDF alpha: near-hard gate (no blue@alpha over grass). */
export function shoreAlpha(f: number): number {
  return f >= 0.5 ? 1 : 0
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
  // Mid-band carve + high-freq jig so hard 0.5 gate snakes off tile mid-edges.
  const base = smoothstep(-1.55, 1.45, shoreSdf(terrain, worldW, wx, wy))
  const mid = Math.max(0, 1 - Math.abs(base - 0.5) * 2)
  const carve =
    simplex2(wx * 1.85 + 4.4, wy * 1.85 - 2.8) * 0.55 * mid +
    simplex2(wx * 4.2 - 1.2, wy * 4.2 + 3.1) * 0.4 * mid +
    fbm2(wx * 0.75 + 1.7, wy * 0.75 - 0.9, 4, 2.1, 0.5) * 0.35 * mid +
    simplex2(wx * 9.5 + 2.2, wy * 9.5 - 6.1) * 0.18 * mid
  const jig =
    simplex2(wx * 3.4 + 2.2, wy * 3.4 - 1.7) * 0.2 +
    simplex2(wx * 7.1, wy * 7.1) * 0.12 +
    simplex2(wx * 14.3 - 5.5, wy * 14.3 + 2.4) * 0.08 * mid
  return Math.max(0, Math.min(1, base + carve + jig))
}

`

// Ensure body starts at shoreFieldFast (strip orphaned partial if needed)
let rest = body
if (!rest.trimStart().startsWith("/**") && !rest.includes("export function shoreFieldFast")) {
  console.error("unexpected body")
  process.exit(1)
}
// If dirtSdf still uses old shoreWarp*5.2 without domainWarp, the patched dirtSdf should be in body
if (!rest.includes("domainWarp(wx + 17.3") && !rest.includes("domainWarp(wx, wy)")) {
  console.warn("dirtSdf may lack domainWarp — check")
}

const out = header + rest
fs.writeFileSync(path, out, "utf8")
console.log("rebuilt", fs.statSync(path).size)
console.log({
  domainWarp: out.includes("function domainWarp"),
  shoreSdf: out.includes("export function shoreSdf"),
  shoreField: out.includes("export function shoreField"),
  imports: out.includes('from "@/lib/sim/types"'),
  strip: out.includes("paintViewportShoreStrip"),
})