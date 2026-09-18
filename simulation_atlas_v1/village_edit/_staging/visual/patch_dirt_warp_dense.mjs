import fs from "fs"

const p = "src/lib/render/nature/shorePaint.ts"
let t = fs.readFileSync(p, "utf8")

t = t.replace(
  `function dirtBlob(wx: number, wy: number): number {
  return (
    0.5 +
    fbm2(wx * 0.24 + 41.2, wy * 0.24 + 17.8, 5, 2.0, 0.5) * 0.48 +
    simplex2(wx * 0.75 + 3.7, wy * 0.75 + 11.2) * 0.28
  )
}`,
  `function dirtBlob(wx: number, wy: number): number {
  return (
    0.5 +
    fbm2(wx * 0.18 + 41.2, wy * 0.18 + 17.8, 6, 2.05, 0.52) * 0.58 +
    simplex2(wx * 0.55 + 3.7, wy * 0.55 + 11.2) * 0.34 +
    simplex2(wx * 1.35 - 2.4, wy * 1.35 + 8.1) * 0.18
  )
}`,
)

t = t.replace(
  `  const warp = shoreWarp(wx * 0.6 + 17.3, wy * 0.6 + 9.1) * 1.25
  const warpY = shoreWarp(wy * 0.6 + 9.1, wx * 0.6 + 17.3) * 1.25`,
  `  const warp = shoreWarp(wx * 0.48 + 17.3, wy * 0.48 + 9.1) * 2.15
  const warpY = shoreWarp(wy * 0.48 + 9.1, wx * 0.48 + 17.3) * 2.15`,
)

t = t.replace(
  `  const signed = here ? Math.max(0.02, best) : -Math.max(0.02, best)
  return signed * 0.5 + (bil - 0.5) * 0.3 + (blob - 0.5) * 1.2 + shoreWarp(sx + 2.4, sy + 1.1) * 0.5`,
  `  const signed = here ? Math.max(0.015, best) : -Math.max(0.015, best)
  return signed * 0.42 + (bil - 0.5) * 0.22 + (blob - 0.5) * 1.55 + shoreWarp(sx + 2.4, sy + 1.1) * 0.72`,
)

t = t.replace(
  `  return smoothstep(-0.7, 0.85, dirtSdf(terrain, worldW, wx, wy))`,
  `  return smoothstep(-0.95, 0.95, dirtSdf(terrain, worldW, wx, wy))`,
)

t = t.replace(`const DIRT_PAD = 0.85`, `const DIRT_PAD = 1.15`)
t = t.replace(`const SHORE_PAD = 1.05`, `const SHORE_PAD = 1.2`)
t = t.replace(
  `const n = Math.max(16, Math.min(36, Math.round(tileS * span * 0.85)))`,
  `const n = Math.max(20, Math.min(44, Math.round(tileS * span * 1.05)))`,
)

t = t.replace(
  `tileS, land, cover, 0.12, 0.55, DIRT_PAD,`,
  `tileS, land, cover, 0.06, 0.62, DIRT_PAD,`,
)
t = t.replace(
  `tileS, land, grazed, 0.18, 0.62, DIRT_PAD, undefined, 0.08, 0.95,`,
  `tileS, land, grazed, 0.10, 0.72, DIRT_PAD, undefined, 0.04, 0.98,`,
)

// Also widen organic dirt tint if present
t = t.replace(
  `(wx, wy) => simplex2(wx * 2.8, wy * 2.8) * 7, 0.02, 0.98,`,
  `(wx, wy) => simplex2(wx * 2.4, wy * 2.4) * 9,`,
)
t = t.replace(
  `(wx, wy) => simplex2(wx * 2.8, wy * 2.8) * 7,`,
  `(wx, wy) => simplex2(wx * 2.4, wy * 2.4) * 9,`,
)

t = t.replaceAll("* 3.1", "* 4.6")
t = t.replace(
  `return bil + shoreWarp(sx * 0.9, sy * 0.9) * 0.35`,
  `return bil + shoreWarp(sx * 0.9, sy * 0.9) * 0.55`,
)

fs.writeFileSync(p, t, "utf8")
const out = fs.readFileSync(p, "utf8")
console.log(JSON.stringify({
  dirtPad: /DIRT_PAD = 1\.15/.test(out),
  shorePad: /SHORE_PAD = 1\.2/.test(out),
  warpDirt: out.includes("* 2.15"),
  denserN: out.includes("Math.min(44"),
  fieldSoft: out.includes("smoothstep(-0.95, 0.95"),
  warp46: (out.match(/\* 4\.6/g) || []).length,
  dirtLoHi: out.includes("0.06, 0.62, DIRT_PAD"),
  bleed: out.includes("0.10, 0.72, DIRT_PAD"),
  blobOctave: out.includes("1.35 - 2.4"),
}, null, 2))
