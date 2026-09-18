import fs from "fs"
const p = "C:/Users/kamel/village-sim-1/simulation_atlas_v1/village_edit/src/lib/render/nature/shorePaint.ts"
let c = fs.readFileSync(p, "utf8")

function replaceFn(name, body) {
  const key = "export function " + name
  const i = c.indexOf(key)
  if (i < 0) throw new Error("missing " + name)
  let brace = 0, started = false, end = -1
  for (let k = i; k < c.length; k++) {
    if (c[k] === "{") { brace++; started = true }
    else if (c[k] === "}") { brace--; if (started && brace === 0) { end = k + 1; break } }
  }
  // keep signature line through first {
  const sigEnd = c.indexOf("{", i)
  c = c.slice(0, sigEnd) + " {\n" + body + "\n}" + c.slice(end)
}

// shoreField: warped bilinear is the silhouette (guarantees mid-edge escape), plus mid carve.
replaceFn("shoreField", `  // WARP_V3: silhouette = domain-warped water occupancy (hard 0.5 leaves tile mid-edges).
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
  // Residual SDF + scalar warp so contour is jagged, not just bilinear diamond.
  const sdf = shoreSdf(terrain, worldW, wx, wy)
  const mix = bil * 0.72 + (sdf > 0 ? 1 : 0) * 0.08 + Math.max(-0.35, Math.min(0.35, sdf * 0.12))
  const edgePush =
    fbm2(wx * 0.42 + 9.1, wy * 0.42 - 3.4, 5, 2.1, 0.55) * 0.55 +
    simplex2(wx * 1.15 + 2.2, wy * 1.15 - 7.7) * 0.35
  const base = Math.max(0, Math.min(1, mix + edgePush * 0.25 + 0.5 * (bil - 0.5) * 0.15 + 0.5))
  // Remap: center isocontour on warped bil
  const base2 = Math.max(0, Math.min(1, bil + edgePush * 0.4 + shoreWarp(sx * 0.8, sy * 0.8) * 0.22))
  const mid = Math.max(0, 1 - Math.abs(base2 - 0.5) * 2.4)
  const carve =
    simplex2(wx * 1.2 + 4.4, wy * 1.2 - 2.8) * 0.28 * mid +
    simplex2(wx * 2.8 - 1.2, wy * 2.8 + 3.1) * 0.2 * mid +
    fbm2(wx * 0.5 + 1.7, wy * 0.5 - 0.9, 4, 2.1, 0.52) * 0.18 * mid
  return Math.max(0, Math.min(1, base2 + carve))`)

// shoreFieldFast: same family, lighter
replaceFn("shoreFieldFast", `  const [sx, sy] = domainWarp(wx, wy)
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
  const base = Math.max(0, Math.min(1, bil + shoreWarp(sx * 0.85, sy * 0.85) * 0.2))
  const mid = Math.max(0, 1 - Math.abs(base - 0.5) * 2)
  const carve = simplex2(wx * 1.55 + 4.4, wy * 1.55 - 2.8) * 0.22 * mid
  return Math.max(0, Math.min(1, base + carve))`)

// dirtField: ensure domain-warped bil dominates dirt silhouette similarly
{
  const key = "export function dirtField"
  const i = c.indexOf(key)
  if (i >= 0) {
    let brace = 0, started = false, end = -1
    for (let k = i; k < c.length; k++) {
      if (c[k] === "{") { brace++; started = true }
      else if (c[k] === "}") { brace--; if (started && brace === 0) { end = k + 1; break } }
    }
    const sigEnd = c.indexOf("{", i)
    const body = `  // WARP_V3 dirt: warped occupancy + edge carve (beige must leave tile mid-edges).
  const [sx0, sy0] = domainWarp(wx + 17.3, wy + 9.1)
  const sx = sx0 - 17.3
  const sy = sy0 - 9.1
  const ix = Math.floor(sx)
  const iy = Math.floor(sy)
  const fx = sx - ix
  const fy = sy - iy
  const samp = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= worldW || y >= worldW) return 0
    const t = terrain[y * worldW + x]
    return t === 12 || t === 17 ? 1 : 0
  }
  const bil =
    samp(ix, iy) * (1 - fx) * (1 - fy) +
    samp(ix + 1, iy) * fx * (1 - fy) +
    samp(ix, iy + 1) * (1 - fx) * fy +
    samp(ix + 1, iy + 1) * fx * fy
  const base = Math.max(0, Math.min(1, bil + shoreWarp(sx + 2.4, sy + 1.1) * 0.28))
  const mid = Math.max(0, 1 - Math.abs(base - 0.5) * 2)
  const carve =
    simplex2(wx * 1.55 + 3.3, wy * 1.55 - 1.8) * 0.32 * mid +
    fbm2(wx * 0.8 + 2.1, wy * 0.8 - 1.4, 4, 2.05, 0.5) * 0.22 * mid
  return Math.max(0, Math.min(1, base + carve))`
    // Use DIRT/SAND constants - fix samp to use isDirtOrSand
    const body2 = body.replace(
      "return t === 12 || t === 17 ? 1 : 0",
      "return isDirtOrSand(terrain[y * worldW + x]) ? 1 : 0"
    ).replace(
      "const t = terrain[y * worldW + x]\n    return isDirtOrSand(terrain[y * worldW + x]) ? 1 : 0",
      "return isDirtOrSand(terrain[y * worldW + x]) ? 1 : 0"
    )
    c = c.slice(0, sigEnd) + " {\n" + body2 + "\n}" + c.slice(end)
  }
}

c = c.replace("WARP_V3_ISOCONTOUR multi-octave", "WARP_V3_BILIN multi-octave")
if (!c.includes("WARP_V3_BILIN")) {
  c = c.replace("WARP_V3_ISOCONTOUR", "WARP_V3_BILIN")
}

fs.writeFileSync(p, c, "utf8")
const checks = {
  bilin: c.includes("silhouette = domain-warped water occupancy"),
  f05: c.includes("if (f < 0.5)"),
  amp: c.includes("* 4.8"),
  fast: c.includes("export function shoreFieldFast"),
}
fs.writeFileSync("C:/Users/kamel/village-sim-1/simulation_atlas_v1/village_edit/_patch_log.txt", JSON.stringify(checks, null, 2))
console.log(checks)