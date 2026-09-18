import fs from "fs"
const p = "C:/Users/kamel/village-sim-1/simulation_atlas_v1/village_edit/src/lib/render/nature/shorePaint.ts"
let c = fs.readFileSync(p, "utf8")
const start = c.indexOf("export function shoreField")
const sigEnd = c.indexOf("{", start)
let brace = 0, end = -1
for (let k = sigEnd; k < c.length; k++) {
  if (c[k] === "{") brace++
  else if (c[k] === "}") { brace--; if (brace === 0) { end = k + 1; break } }
}
const body = `export function shoreField(terrain: Uint8Array, worldW: number, wx: number, wy: number): number {
  // WARP_V3: silhouette = domain-warped water occupancy (hard 0.5 leaves tile mid-edges).
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
  const base = Math.max(
    0,
    Math.min(1, bil + shoreWarp(sx * 0.8, sy * 0.8) * 0.28 + simplex2(wx * 0.9 + 2.1, wy * 0.9 - 3.4) * 0.12),
  )
  const mid = Math.max(0, 1 - Math.abs(base - 0.5) * 2.4)
  const carve =
    simplex2(wx * 1.2 + 4.4, wy * 1.2 - 2.8) * 0.32 * mid +
    simplex2(wx * 2.8 - 1.2, wy * 2.8 + 3.1) * 0.22 * mid +
    fbm2(wx * 0.5 + 1.7, wy * 0.5 - 0.9, 4, 2.1, 0.52) * 0.2 * mid
  return Math.max(0, Math.min(1, base + carve))
}`
c = c.slice(0, start) + body + c.slice(end)
fs.writeFileSync(p, c, "utf8")
console.log("cleaned", c.includes("domain-warped water occupancy"), c.includes("if (f < 0.5)"))