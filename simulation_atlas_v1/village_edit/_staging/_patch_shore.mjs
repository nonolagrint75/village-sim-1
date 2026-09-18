import fs from "fs"

const path = "src/lib/render/nature/shorePaint.ts"
let t = fs.readFileSync(path, "utf8")

const shoreSdfNew = `export function shoreSdf(terrain: Uint8Array, worldW: number, wx: number, wy: number): number {
  // Stronger domain warp — mid-band isocontour must leave tile mid-edges (z14 light-blue stairs).
  const warp = shoreWarp(wx * 0.45, wy * 0.45) * 6.4
  const warpY = shoreWarp(wy * 0.45 + 6.1, wx * 0.45) * 6.4
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
  return signed * 0.72 + fine * 0.55 + shoreWarp(sx * 0.95, sy * 0.95) * 0.48
}`

const shoreFieldNew = `export function shoreField(terrain: Uint8Array, worldW: number, wx: number, wy: number): number {
  // Mid-band carve: push the 0.5 isocontour off Manhattan tile edges (Visuel z14 FAIL).
  const base = smoothstep(-1.45, 1.35, shoreSdf(terrain, worldW, wx, wy))
  const mid = Math.max(0, 1 - Math.abs(base - 0.5) * 2)
  const carve =
    simplex2(wx * 2.05 + 4.4, wy * 2.05 - 2.8) * 0.28 * mid +
    simplex2(wx * 4.8 - 1.2, wy * 4.8 + 3.1) * 0.18 * mid +
    fbm2(wx * 0.85 + 1.7, wy * 0.85 - 0.9, 3, 2.05, 0.5) * 0.16 * mid
  const jig =
    simplex2(wx * 3.4 + 2.2, wy * 3.4 - 1.7) * 0.16 +
    simplex2(wx * 7.1, wy * 7.1) * 0.1 +
    simplex2(wx * 11.3 - 5.5, wy * 11.3 + 2.4) * 0.06 * mid
  return Math.max(0, Math.min(1, base + carve + jig))
}`

const shoreFieldFastNew = `/**
 * Fast shore approx — warp + bilinear only.
 * Mid-band carve kept close to shoreField (probes / naturePixel32 fallback).
 */
export function shoreFieldFast(terrain: Uint8Array, worldW: number, wx: number, wy: number): number {
  const warp = shoreWarp(wx * 0.45, wy * 0.45) * 6.4
  const warpY = shoreWarp(wy * 0.45 + 6.1, wx * 0.45) * 6.4
  const sx = wx + warp
  const sy = wy + warpY
  const ix = Math.floor(sx)
  const iy = Math.floor(sy)
  const fx = sx - ix
  const fy = sy - iy
  const samp = (x: number, y: number) => (isWaterCell(terrain, worldW, x, y) ? 1 : 0)
  const bil =
    samp(ix, iy) * (1 - fx) * (1 - fy) +
    samp(ix + 1, iy) * fx * (1 - fy) +
    samp(ix, iy + 1) * (1 - fx) * fy +
    samp(ix + 1, iy + 1) * fx * fy
  const base = smoothstep(-0.2, 1.15, bil + shoreWarp(sx * 0.9, sy * 0.9) * 0.45)
  const mid = Math.max(0, 1 - Math.abs(base - 0.5) * 2)
  const carve =
    simplex2(wx * 2.05 + 4.4, wy * 2.05 - 2.8) * 0.22 * mid +
    simplex2(wx * 4.8 - 1.2, wy * 4.8 + 3.1) * 0.14 * mid
  return Math.max(0, Math.min(1, base + carve))
}`

function replaceFn(src, name, next) {
  const re = new RegExp(
    "(?:\\/\\*\\*[\\s\\S]*?\\*\\/\\s*)?export function " + name + "\\([\\s\\S]*?\\n\\}",
    "m",
  )
  if (!re.test(src)) {
    console.error("missing", name)
    process.exit(1)
  }
  return src.replace(re, next)
}

t = replaceFn(t, "shoreSdf", shoreSdfNew)
t = replaceFn(t, "shoreField", shoreFieldNew)
t = replaceFn(t, "shoreFieldFast", shoreFieldFastNew)

const oldLerp = "      const f = shoreField(terrain, worldW, wx, wy)\n      const w = smoothstep(0.02, 0.55, f)\n      const deepW = smoothstep(0.45, 0.92, f)"
const newLerp = "      const f = shoreField(terrain, worldW, wx, wy)\n      // Narrower mid lerp after carve — less pale cyan stair ribbon at z14.\n      const w = smoothstep(0.12, 0.48, f)\n      const deepW = smoothstep(0.52, 0.94, f)"
if (!t.includes(oldLerp)) {
  console.error("strip lerp not found")
  process.exit(1)
}
t = t.replace(oldLerp, newLerp)

fs.writeFileSync(path, t, "utf8")
console.log("ok", fs.statSync(path).size)