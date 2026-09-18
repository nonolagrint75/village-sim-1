import fs from "fs"

const p = "src/lib/render/nature/shorePaint.ts"
let t = fs.readFileSync(p, "utf8")

t = t.replace(
  "const warpY = shoreWarp(wy * 0.45 + 6.1, wx * 0.45) * 2.15",
  "const warpY = shoreWarp(wy * 0.45 + 6.1, wx * 0.45) * 3.1",
)
t = t.replace("Math.min(360, Math.round(pw / 2.5))", "Math.min(200, Math.round(pw / 4))")
t = t.replace("Math.min(360, Math.round(ph / 2.5))", "Math.min(200, Math.round(ph / 4))")
// in case already partially updated
t = t.replace("Math.min(200, Math.round(pw / 4))", "Math.min(200, Math.round(pw / 4))")
t = t.replace("Math.min(280, Math.round(pw / 3))", "Math.min(160, Math.round(pw / 4.5))")
t = t.replace("Math.min(280, Math.round(ph / 3))", "Math.min(160, Math.round(ph / 4.5))")

if (!t.includes("shoreFieldFast")) {
  const marker = "return smoothstep(-1.25, 1.15, shoreSdf(terrain, worldW, wx, wy))\n}"
  const idx = t.indexOf(marker)
  if (idx < 0) throw new Error("shoreField marker missing")
  const insert =
    marker +
    `

/** Fast shore field for strip paint: warp + bilinear only (no 7x7 SDF hunt). */
function shoreFieldFast(terrain: Uint8Array, worldW: number, wx: number, wy: number): number {
  const warp = shoreWarp(wx * 0.45, wy * 0.45) * 3.1
  const warpY = shoreWarp(wy * 0.45 + 6.1, wx * 0.45) * 3.1
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
  return smoothstep(-0.15, 1.05, bil + shoreWarp(sx * 0.9, sy * 0.9) * 0.35)
}
`
  t = t.slice(0, idx) + insert + t.slice(idx + marker.length)
}

t = t.replace(/const f = shoreField\(terrain, worldW, wx, wy\)/g, "const f = shoreFieldFast(terrain, worldW, wx, wy)")

fs.writeFileSync(p, t, "utf8")
const o = fs.readFileSync(p, "utf8")
console.log({
  fast: o.includes("shoreFieldFast"),
  usesFast: (o.match(/shoreFieldFast\(/g) || []).length,
  cap: o.includes("pw / 4"),
  warpY31: o.includes("warpY = shoreWarp(wy * 0.45 + 6.1, wx * 0.45) * 3.1"),
})
