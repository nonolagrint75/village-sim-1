import fs from "fs"
const path = "src/lib/render/nature/shorePaint.ts"
let t = fs.readFileSync(path, "utf8")

const newWarp = `/** Multi-octave vector domain-warp — hard 0.5 isocontour must leave tile mid-edges. */
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
`

// Replace old shoreWarp function
const oldWarp = t.match(/function shoreWarp\(wx: number, wy: number\): number \{[\s\S]*?\n\}/)
if (!oldWarp) { console.error("shoreWarp missing"); process.exit(1) }
t = t.replace(oldWarp[0], newWarp)

// Replace shoreSdf with domainWarp + wider hunt
const shoreSdfNew = `export function shoreSdf(terrain: Uint8Array, worldW: number, wx: number, wy: number): number {
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
  // Extra residual warp along contour
  return signed * 0.68 + fine * 0.5 + shoreWarp(sx * 0.9, sy * 0.9) * 0.55
}`

t = t.replace(/export function shoreSdf\([\s\S]*?\n\}/, shoreSdfNew)

// Stronger shoreField mid carve
const shoreFieldNew = `export function shoreField(terrain: Uint8Array, worldW: number, wx: number, wy: number): number {
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
}`

t = t.replace(/export function shoreField\([\s\S]*?\n\}/, shoreFieldNew)

// shoreFieldFast: use domainWarp too (keep visually close)
const fastNew = `/**
 * Fast shore approx — same domainWarp family as shoreField (naturePixel32 / probes).
 */
export function shoreFieldFast(terrain: Uint8Array, worldW: number, wx: number, wy: number): number {
  const [sx, sy] = domainWarp(wx, wy)
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
  const base = smoothstep(-0.25, 1.2, bil + shoreWarp(sx * 0.9, sy * 0.9) * 0.5)
  const mid = Math.max(0, 1 - Math.abs(base - 0.5) * 2)
  const carve =
    simplex2(wx * 1.85 + 4.4, wy * 1.85 - 2.8) * 0.4 * mid +
    simplex2(wx * 4.2 - 1.2, wy * 4.2 + 3.1) * 0.28 * mid
  return Math.max(0, Math.min(1, base + carve))
}`

t = t.replace(/(?:\/\*\*[\s\S]*?\*\/\s*)?export function shoreFieldFast\([\s\S]*?\n\}/, fastNew)

// dirtSdf with domainWarp + wider hunt
const dirtSdfNew = `export function dirtSdf(terrain: Uint8Array, worldW: number, wx: number, wy: number): number {
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
  for (let dy = -5; dy <= 5; dy++) {
    for (let dx = -5; dx <= 5; dx++) {
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
    shoreWarp(sx + 2.4, sy + 1.1) * 0.95 * edge
  )
}`

t = t.replace(/export function dirtSdf\([\s\S]*?\n\}/, dirtSdfNew)

// dirtField stronger carve
const dirtFieldNew = `export function dirtField(terrain: Uint8Array, worldW: number, wx: number, wy: number): number {
  const base = smoothstep(-1.25, 0.75, dirtSdf(terrain, worldW, wx, wy))
  const mid = Math.max(0, 1 - Math.abs(base - 0.5) * 2)
  const carve =
    simplex2(wx * 1.95 + 3.3, wy * 1.95 - 1.8) * 0.5 * mid +
    simplex2(wx * 4.6 - 2.4, wy * 4.6 + 4.2) * 0.35 * mid +
    fbm2(wx * 0.8 + 2.1, wy * 0.8 - 1.4, 4, 2.05, 0.5) * 0.28 * mid +
    simplex2(wx * 10.2 + 1.1, wy * 10.2 - 2.6) * 0.14 * mid
  const jig =
    simplex2(wx * 2.9 + 5.1, wy * 2.9 - 3.3) * 0.16 +
    simplex2(wx * 6.4, wy * 6.4) * 0.1
  return Math.max(0, Math.min(1, base + carve + jig))
}`

t = t.replace(/export function dirtField\([\s\S]*?\n\}/, dirtFieldNew)

fs.writeFileSync(path, t, "utf8")
console.log("aggressive warp written", fs.statSync(path).size)
console.log({
  domainWarp: t.includes("function domainWarp"),
  shoreHunt5: t.includes("dy = -5"),
  dirtHunt5: (t.match(/dy = -5/g)||[]).length >= 2,
})