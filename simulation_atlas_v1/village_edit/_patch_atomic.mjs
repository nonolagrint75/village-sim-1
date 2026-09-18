import fs from "fs"
const p = "C:/Users/kamel/village-sim-1/simulation_atlas_v1/village_edit/src/lib/render/nature/shorePaint.ts"
let c = fs.readFileSync(p, "utf8")

function replaceFn(exportOrFn, name, fullText) {
  const key = exportOrFn + " " + name
  const i = c.indexOf(key)
  if (i < 0) throw new Error("missing " + key)
  let brace = 0, started = false, end = -1
  for (let k = i; k < c.length; k++) {
    if (c[k] === "{") { brace++; started = true }
    else if (c[k] === "}") { brace--; if (started && brace === 0) { end = k + 1; break } }
  }
  c = c.slice(0, i) + fullText + c.slice(end)
}

// Header
c = c.replace(/^[\s\S]*?\nimport /, `/**
 * Continuous shore + dirt paint — multi-cell shared SDF strip.
 * HARD f>=0.5 + WARP_V4_ATOMIC domain-warp bilin isocontour (leaves tile mid-edges).
 */
import `)

replaceFn("function", "domainWarp", `function domainWarp(wx: number, wy: number): [number, number] {
  // WARP_V4_ATOMIC: ~2.3-2.7 cell meander — strong enough to leave mid-edges, not erase basins.
  const lx =
    fbm2(wx * 0.07, wy * 0.07, 5, 2.05, 0.52) * 2.4 +
    fbm2(wx * 0.16 + 19.7, wy * 0.16 - 8.3, 4, 2.1, 0.52) * 1.0 +
    simplex2(wx * 0.32 + 11.3, wy * 0.32 - 4.7) * 0.65
  const ly =
    fbm2(wx * 0.07 + 37.1, wy * 0.07 - 19.4, 5, 2.05, 0.52) * 2.4 +
    fbm2(wx * 0.16 - 22.4, wy * 0.16 + 14.6, 4, 2.1, 0.52) * 1.0 +
    simplex2(wx * 0.32 - 8.2, wy * 0.32 + 15.6) * 0.65
  const mx =
    simplex2(wx * 0.55 + 3.1, wy * 0.55) * 1.0 +
    simplex2(wx * 1.05 - 6.4, wy * 1.05 + 2.8) * 0.5
  const my =
    simplex2(wx * 0.55 - 12.5, wy * 0.55 + 9.1) * 1.0 +
    simplex2(wx * 1.05 + 4.2, wy * 1.05 - 7.7) * 0.5
  const hx =
    simplex2(wx * 2.6 + 1.7, wy * 2.6) * 0.4 +
    simplex2(wx * 5.8 - 4.1, wy * 5.8 + 2.2) * 0.2 +
    simplex2(wx * 11.2 + 8.8, wy * 11.2 - 3.3) * 0.1
  const hy =
    simplex2(wx * 2.6 - 2.9, wy * 2.6 + 5.4) * 0.4 +
    simplex2(wx * 5.8 + 9.0, wy * 5.8 - 1.6) * 0.2 +
    simplex2(wx * 11.2 - 5.5, wy * 11.2 + 6.1) * 0.1
  return [wx + lx + mx + hx, wy + ly + my + hy]
}`)

replaceFn("export function", "shoreField", `export function shoreField(terrain: Uint8Array, worldW: number, wx: number, wy: number): number {
  // Domain-warped water occupancy — hard 0.5 isocontour leaves tile mid-edges.
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
}`)

replaceFn("export function", "shoreFieldFast", `export function shoreFieldFast(terrain: Uint8Array, worldW: number, wx: number, wy: number): number {
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
  const base = Math.max(0, Math.min(1, bil + shoreWarp(sx * 0.85, sy * 0.85) * 0.16))
  const mid = Math.max(0, 1 - Math.abs(base - 0.5) * 2)
  return Math.max(0, Math.min(1, base + simplex2(wx * 1.55 + 4.4, wy * 1.55 - 2.8) * 0.18 * mid))
}`)

// Force hard gates
c = c.split("if (shoreAlpha(f, wx, wy) < 1)").join("if (f < 0.5)")
c = c.split("if (dirtAlpha(f, wx, wy) < 1)").join("if (f < 0.5)")

// Budget / step
c = c.split("const BUDGET = 160_000").join("const BUDGET = 280_000")
if (!c.includes("280_000")) c = c.split("const BUDGET = 200_000").join("const BUDGET = 280_000")
c = c.split("const step = tileS >= 48 ? 2 : 1").join("const step = tileS >= 64 ? 2 : 1")

// Touch + pad
c = c.split("cellTouchesShore(terrain, worldW, gx, gy, 2)").join("cellTouchesShore(terrain, worldW, gx, gy, 4)")
c = c.split("cellTouchesDirt(terrain, worldW, gx, gy, 2)").join("cellTouchesDirt(terrain, worldW, gx, gy, 4)")
c = c.split("minX - 1)").join("minX - 3)")
c = c.split("minY - 1)").join("minY - 3)")
c = c.split("maxX + 1)").join("maxX + 3)")
c = c.split("maxY + 1)").join("maxY + 3)")
c = c.split("minX - 4)").join("minX - 3)")
c = c.split("minY - 4)").join("minY - 3)")
c = c.split("maxX + 4)").join("maxX + 3)")
c = c.split("maxY + 4)").join("maxY + 3)")

fs.writeFileSync(p, c, "utf8")
const ok = {
  atomic: c.includes("WARP_V4_ATOMIC"),
  amp24: c.includes("* 2.4"),
  f05: c.includes("if (f < 0.5)"),
  shoreAlphaGate: c.includes("if (shoreAlpha(f"),
  bilin: c.includes("Domain-warped water occupancy"),
  budget: c.includes("280_000"),
}
console.log(JSON.stringify(ok))
if (!ok.f05 || !ok.amp24 || !ok.bilin) process.exit(1)