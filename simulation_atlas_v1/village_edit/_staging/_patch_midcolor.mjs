import fs from "fs"

const path = "src/lib/render/nature/shorePaint.ts"
let t = fs.readFileSync(path, "utf8")

// 1) Dial global warp back slightly (6.4 sprayed inland); keep mid-band carve strong
t = t.replace(
  /const warp = shoreWarp\(wx \* 0\.45, wy \* 0\.45\) \* 6\.4/g,
  "const warp = shoreWarp(wx * 0.45, wy * 0.45) * 5.2",
)
t = t.replace(
  /const warpY = shoreWarp\(wy \* 0\.45 \+ 6\.1, wx \* 0\.45\) \* 6\.4/g,
  "const warpY = shoreWarp(wy * 0.45 + 6.1, wx * 0.45) * 5.2",
)

// 2) Stronger mid-band carve amplitudes
t = t.replace(
  `    simplex2(wx * 2.05 + 4.4, wy * 2.05 - 2.8) * 0.28 * mid +
    simplex2(wx * 4.8 - 1.2, wy * 4.8 + 3.1) * 0.18 * mid +
    fbm2(wx * 0.85 + 1.7, wy * 0.85 - 0.9, 3, 2.05, 0.5) * 0.16 * mid`,
  `    simplex2(wx * 2.05 + 4.4, wy * 2.05 - 2.8) * 0.38 * mid +
    simplex2(wx * 4.8 - 1.2, wy * 4.8 + 3.1) * 0.26 * mid +
    fbm2(wx * 0.85 + 1.7, wy * 0.85 - 0.9, 3, 2.05, 0.5) * 0.22 * mid`,
)

// 3) Replace shore strip pixel loop with dark-teal mid (no pale cyan) + step=1
const oldLoop = `  // Screen-res edge band (step 1–2) — upscaled low-ppc was soft-mask over Manhattan.
  const step = tileS >= 36 ? 2 : 1
  const pw = Math.max(1, Math.ceil((cellsW * tileS) / step))
  const ph = Math.max(1, Math.ceil((cellsH * tileS) / step))
  if (pw * ph > 220_000) return
  const land = rgbFromPacked(atlas.color32("grass"), [58, 90, 38])
  const water = rgbFromPacked(atlas.color32("water"), [36, 88, 104])
  const deep = rgbFromPacked(atlas.color32("water_deep"), [28, 68, 92])
  const img = stripCanvas(pw, ph).createImageData(pw, ph)
  const data = img.data
  const inv = step / tileS
  for (let j = 0; j < ph; j++) {
    for (let i = 0; i < pw; i++) {
      const wx = minX + (i + 0.5) * inv
      const wy = minY + (j + 0.5) * inv
      const f = shoreField(terrain, worldW, wx, wy)
      // Narrower mid lerp after carve — less pale cyan stair ribbon at z14.
      const w = smoothstep(0.12, 0.48, f)
      const deepW = smoothstep(0.52, 0.94, f)
      const o = (j * pw + i) * 4
      const r0 = land[0] * (1 - w) + water[0] * w
      const g0 = land[1] * (1 - w) + water[1] * w
      const b0 = land[2] * (1 - w) + water[2] * w
      data[o] = Math.max(0, Math.min(255, (r0 * (1 - deepW) + deep[0] * deepW) | 0))
      data[o + 1] = Math.max(0, Math.min(255, (g0 * (1 - deepW) + deep[1] * deepW) | 0))
      data[o + 2] = Math.max(0, Math.min(255, (b0 * (1 - deepW) + deep[2] * deepW) | 0))
      data[o + 3] = 255
    }
  }`

const newLoop = `  // Always screen-res (step 1) at closeup — step 2 soft-masked Manhattan rim back in.
  const step = 1
  const pw = Math.max(1, Math.ceil((cellsW * tileS) / step))
  const ph = Math.max(1, Math.ceil((cellsH * tileS) / step))
  if (pw * ph > 280_000) return
  const land = rgbFromPacked(atlas.color32("grass"), [58, 90, 38])
  const water = rgbFromPacked(atlas.color32("water"), [36, 88, 104])
  const deep = rgbFromPacked(atlas.color32("water_deep"), [28, 68, 92])
  // Dark teal shore mid — grass↔water equal lerp was the light-blue stair rim.
  const mid = [
    Math.max(0, Math.min(255, (water[0] * 0.55 + land[0] * 0.12 + deep[0] * 0.2) | 0)),
    Math.max(0, Math.min(255, (water[1] * 0.6 + land[1] * 0.15 + deep[1] * 0.15) | 0)),
    Math.max(0, Math.min(255, (water[2] * 0.72 + deep[2] * 0.22) | 0)),
  ]
  const img = stripCanvas(pw, ph).createImageData(pw, ph)
  const data = img.data
  const inv = step / tileS
  for (let j = 0; j < ph; j++) {
    for (let i = 0; i < pw; i++) {
      const wx = minX + (i + 0.5) * inv
      const wy = minY + (j + 0.5) * inv
      const f = shoreField(terrain, worldW, wx, wy)
      const toMid = smoothstep(0.08, 0.42, f)
      const toWater = smoothstep(0.38, 0.62, f)
      const toDeep = smoothstep(0.58, 0.94, f)
      const o = (j * pw + i) * 4
      let r = land[0] * (1 - toMid) + mid[0] * toMid
      let g = land[1] * (1 - toMid) + mid[1] * toMid
      let b = land[2] * (1 - toMid) + mid[2] * toMid
      r = r * (1 - toWater) + water[0] * toWater
      g = g * (1 - toWater) + water[1] * toWater
      b = b * (1 - toWater) + water[2] * toWater
      data[o] = Math.max(0, Math.min(255, (r * (1 - toDeep) + deep[0] * toDeep) | 0))
      data[o + 1] = Math.max(0, Math.min(255, (g * (1 - toDeep) + deep[1] * toDeep) | 0))
      data[o + 2] = Math.max(0, Math.min(255, (b * (1 - toDeep) + deep[2] * toDeep) | 0))
      data[o + 3] = 255
    }
  }`

if (!t.includes(oldLoop)) {
  console.error("shore strip loop not found")
  // show nearby
  const i = t.indexOf("Screen-res edge band")
  console.log(t.slice(i, i + 500))
  process.exit(1)
}
t = t.replace(oldLoop, newLoop)

fs.writeFileSync(path, t, "utf8")
console.log("midcolor patched", fs.statSync(path).size)