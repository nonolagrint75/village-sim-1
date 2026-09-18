import fs from "fs"
const p = "C:/Users/kamel/village-sim-1/simulation_atlas_v1/village_edit/src/lib/render/nature/shorePaint.ts"
let c = fs.readFileSync(p, "utf8")

// Tone domainWarp: ~2.2–2.8 cell meander (4.8 erased water in strip)
const start = c.indexOf("function domainWarp")
const commentStart = c.lastIndexOf("/**", start)
let brace = 0, endFn = -1
for (let i = c.indexOf("{", start); i < c.length; i++) {
  if (c[i] === "{") brace++
  else if (c[i] === "}") { brace--; if (brace === 0) { endFn = i + 1; break } }
}
const newWarp = `/** Multi-octave vector domain-warp - hard 0.5 isocontour must leave tile mid-edges. */
function domainWarp(wx: number, wy: number): [number, number] {
  // WARP_V4_TUNED: ~2.2-2.8 cell meander (V3 4.8 painted land over water).
  const lx =
    fbm2(wx * 0.07, wy * 0.07, 5, 2.05, 0.52) * 2.35 +
    fbm2(wx * 0.16 + 19.7, wy * 0.16 - 8.3, 4, 2.1, 0.52) * 1.05 +
    simplex2(wx * 0.32 + 11.3, wy * 0.32 - 4.7) * 0.7
  const ly =
    fbm2(wx * 0.07 + 37.1, wy * 0.07 - 19.4, 5, 2.05, 0.52) * 2.35 +
    fbm2(wx * 0.16 - 22.4, wy * 0.16 + 14.6, 4, 2.1, 0.52) * 1.05 +
    simplex2(wx * 0.32 - 8.2, wy * 0.32 + 15.6) * 0.7
  const mx =
    simplex2(wx * 0.55 + 3.1, wy * 0.55) * 1.05 +
    simplex2(wx * 1.05 - 6.4, wy * 1.05 + 2.8) * 0.55
  const my =
    simplex2(wx * 0.55 - 12.5, wy * 0.55 + 9.1) * 1.05 +
    simplex2(wx * 1.05 + 4.2, wy * 1.05 - 7.7) * 0.55
  const hx =
    simplex2(wx * 2.6 + 1.7, wy * 2.6) * 0.42 +
    simplex2(wx * 5.8 - 4.1, wy * 5.8 + 2.2) * 0.22 +
    simplex2(wx * 11.2 + 8.8, wy * 11.2 - 3.3) * 0.12
  const hy =
    simplex2(wx * 2.6 - 2.9, wy * 2.6 + 5.4) * 0.42 +
    simplex2(wx * 5.8 + 9.0, wy * 5.8 - 1.6) * 0.22 +
    simplex2(wx * 11.2 - 5.5, wy * 11.2 + 6.1) * 0.12
  return [wx + lx + mx + hx, wy + ly + my + hy]
}
`
c = c.slice(0, commentStart) + newWarp + c.slice(endFn)

// shoreField: milder residual so bil dominates near edge
const sf = c.indexOf("export function shoreField")
const sfBrace = c.indexOf("{", sf)
let b = 0, sfEnd = -1
for (let i = sfBrace; i < c.length; i++) {
  if (c[i] === "{") b++
  else if (c[i] === "}") { b--; if (b === 0) { sfEnd = i + 1; break } }
}
const shoreField = `export function shoreField(terrain: Uint8Array, worldW: number, wx: number, wy: number): number {
  // WARP_V4: domain-warped water occupancy — hard 0.5 leaves tile mid-edges without erasing basins.
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
  const jig = shoreWarp(sx * 0.9, sy * 0.9) * 0.14 + simplex2(wx * 1.1 + 2.1, wy * 1.1 - 3.4) * 0.08
  const base = Math.max(0, Math.min(1, bil + jig))
  const mid = Math.max(0, 1 - Math.abs(base - 0.5) * 2.6)
  const carve =
    simplex2(wx * 1.4 + 4.4, wy * 1.4 - 2.8) * 0.2 * mid +
    simplex2(wx * 3.2 - 1.2, wy * 3.2 + 3.1) * 0.14 * mid +
    fbm2(wx * 0.55 + 1.7, wy * 0.55 - 0.9, 3, 2.1, 0.52) * 0.12 * mid
  return Math.max(0, Math.min(1, base + carve))
}`
c = c.slice(0, sf) + shoreField + c.slice(sfEnd)

c = c.replace(/WARP_V3_BILIN|WARP_V3_ISOCONTOUR|WARP_V2_AGGRESSIVE/g, "WARP_V4_TUNED")
if (!c.includes("WARP_V4_TUNED")) {
  c = c.replace(
    "HARD f>=0.5 water gate +",
    "HARD f>=0.5 water gate + WARP_V4_TUNED"
  )
}

fs.writeFileSync(p, c, "utf8")
console.log(JSON.stringify({
  v4: c.includes("WARP_V4_TUNED"),
  amp235: c.includes("* 2.35"),
  f05: c.includes("if (f < 0.5)"),
  bilin: c.includes("domain-warped water occupancy"),
}))