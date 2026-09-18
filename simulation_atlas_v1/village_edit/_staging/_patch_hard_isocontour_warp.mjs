import fs from "fs"
const path = "src/lib/render/nature/shorePaint.ts"
let t = fs.readFileSync(path, "utf8")

const newDomain = `function domainWarp(wx: number, wy: number): [number, number] {
  // Stronger mass meander (~1.6-2.4 cells) - hard f>=0.5 must leave tile mid-edges.
  const lx =
    fbm2(wx * 0.09, wy * 0.09, 5, 2.05, 0.52) * 1.85 +
    simplex2(wx * 0.24 + 11.3, wy * 0.24 - 4.7) * 0.85
  const ly =
    fbm2(wx * 0.09 + 37.1, wy * 0.09 - 19.4, 5, 2.05, 0.52) * 1.85 +
    simplex2(wx * 0.24 - 8.2, wy * 0.24 + 15.6) * 0.85
  const mx =
    simplex2(wx * 0.62 + 3.1, wy * 0.62) * 1.05 +
    simplex2(wx * 1.2 - 6.4, wy * 1.2 + 2.8) * 0.55
  const my =
    simplex2(wx * 0.62 - 12.5, wy * 0.62 + 9.1) * 1.05 +
    simplex2(wx * 1.2 + 4.2, wy * 1.2 - 7.7) * 0.55
  const hx =
    simplex2(wx * 2.8 + 1.7, wy * 2.8) * 0.62 +
    simplex2(wx * 6.6 - 4.1, wy * 6.6 + 2.2) * 0.35 +
    simplex2(wx * 12.4 + 8.8, wy * 12.4 - 3.3) * 0.18
  const hy =
    simplex2(wx * 2.8 - 2.9, wy * 2.8 + 5.4) * 0.62 +
    simplex2(wx * 6.6 + 9.0, wy * 6.6 - 1.6) * 0.35 +
    simplex2(wx * 12.4 - 5.5, wy * 12.4 + 6.1) * 0.18
  return [wx + lx + mx + hx, wy + ly + my + hy]
}`

const m1 = t.match(/function domainWarp\(wx: number, wy: number\): \[number, number\] \{[\s\S]*?\n\}/)
if (!m1) { console.error("domainWarp missing"); process.exit(1) }
t = t.replace(m1[0], newDomain)

const shoreSdfNew = `export function shoreSdf(terrain: Uint8Array, worldW: number, wx: number, wy: number): number {
  // HARD f>=0.5 isocontour: vector warp + low bilinear (bil locks to tile corners).
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
  const fine = (bil - 0.5) * 0.55
  const signed = hereWater ? Math.max(0.02, best) : -Math.max(0.02, best)
  return signed * 0.78 + fine * 0.28 + shoreWarp(sx * 0.85, sy * 0.85) * 0.7
}`
t = t.replace(/export function shoreSdf\([\s\S]*?\n\}/, shoreSdfNew)

const shoreFieldNew = `export function shoreField(terrain: Uint8Array, worldW: number, wx: number, wy: number): number {
  // Displace SDF before smoothstep so HARD f>=0.5 contour meanders off tile mid-edges.
  const edgePush =
    fbm2(wx * 0.5 + 9.1, wy * 0.5 - 3.4, 4, 2.1, 0.55) * 0.95 +
    simplex2(wx * 1.45 + 2.2, wy * 1.45 - 7.7) * 0.65 +
    simplex2(wx * 2.9 - 4.4, wy * 2.9 + 1.3) * 0.38
  const base = smoothstep(-1.65, 1.55, shoreSdf(terrain, worldW, wx, wy) + edgePush)
  const mid = Math.max(0, 1 - Math.abs(base - 0.5) * 2.15)
  const carve =
    simplex2(wx * 1.55 + 4.4, wy * 1.55 - 2.8) * 0.7 * mid +
    simplex2(wx * 3.6 - 1.2, wy * 3.6 + 3.1) * 0.52 * mid +
    fbm2(wx * 0.65 + 1.7, wy * 0.65 - 0.9, 4, 2.1, 0.52) * 0.45 * mid +
    simplex2(wx * 8.8 + 2.2, wy * 8.8 - 6.1) * 0.28 * mid
  return Math.max(0, Math.min(1, base + carve))
}`
t = t.replace(/export function shoreField\([\s\S]*?\n\}/, shoreFieldNew)

const fastNew = `/**
 * Fast shore approx - same domainWarp family as shoreField (naturePixel32 / probes).
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
  const edgePush =
    fbm2(wx * 0.5 + 9.1, wy * 0.5 - 3.4, 3, 2.1, 0.55) * 0.7 +
    simplex2(wx * 1.45 + 2.2, wy * 1.45 - 7.7) * 0.45
  const base = smoothstep(-0.3, 1.25, bil + shoreWarp(sx * 0.9, sy * 0.9) * 0.55 + edgePush * 0.35)
  const mid = Math.max(0, 1 - Math.abs(base - 0.5) * 2)
  const carve =
    simplex2(wx * 1.55 + 4.4, wy * 1.55 - 2.8) * 0.55 * mid +
    simplex2(wx * 3.6 - 1.2, wy * 3.6 + 3.1) * 0.38 * mid
  return Math.max(0, Math.min(1, base + carve))
}`
t = t.replace(/(?:\/\*\*[\s\S]*?\*\/\s*)?export function shoreFieldFast\([\s\S]*?\n\}/, fastNew)

fs.writeFileSync(path, t, "utf8")
console.log("ok", {
  size: fs.statSync(path).size,
  stronger: t.includes("* 1.85") && t.includes("edgePush"),
  lowBil: t.includes("(bil - 0.5) * 0.55"),
  displace: t.includes("Displace SDF before smoothstep"),
  imports: t.includes("import { DIRT"),
})
