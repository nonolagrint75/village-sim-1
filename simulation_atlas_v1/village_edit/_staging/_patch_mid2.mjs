import fs from "fs"
const path = "src/lib/render/nature/shorePaint.ts"
let t = fs.readFileSync(path, "utf8")

t = t.replace(/\* 6\.4/g, "* 5.2")

// bump carve in shoreField only — locate unique block
const carveOld = `  const carve =
    simplex2(wx * 2.05 + 4.4, wy * 2.05 - 2.8) * 0.28 * mid +
    simplex2(wx * 4.8 - 1.2, wy * 4.8 + 3.1) * 0.18 * mid +
    fbm2(wx * 0.85 + 1.7, wy * 0.85 - 0.9, 3, 2.05, 0.5) * 0.16 * mid`
const carveNew = `  const carve =
    simplex2(wx * 2.05 + 4.4, wy * 2.05 - 2.8) * 0.38 * mid +
    simplex2(wx * 4.8 - 1.2, wy * 4.8 + 3.1) * 0.26 * mid +
    fbm2(wx * 0.85 + 1.7, wy * 0.85 - 0.9, 3, 2.05, 0.5) * 0.22 * mid`
if (t.includes(carveOld)) t = t.replace(carveOld, carveNew)
else if (t.includes("* 0.38 * mid")) console.log("carve already bumped")
else console.warn("carve block missing")

const start = t.indexOf("export function paintViewportShoreStrip")
const end = t.indexOf("export function paintViewportDirtStrip")
let block = t.slice(start, end)

const marker = "const step = tileS >= 36 ? 2 : 1"
const mi = block.indexOf(marker)
if (mi < 0) { console.error("step marker missing"); process.exit(1) }

const loopStart = block.indexOf("const step =")
const loopEnd = block.indexOf("const sctx = stripCanvas")
if (loopStart < 0 || loopEnd < 0) { console.error("loop bounds", loopStart, loopEnd); process.exit(1) }

const newLoop = `  // Always screen-res (step 1) at closeup — step 2 soft-masked Manhattan rim back in.
  const step = 1
  const pw = Math.max(1, Math.ceil((cellsW * tileS) / step))
  const ph = Math.max(1, Math.ceil((cellsH * tileS) / step))
  if (pw * ph > 280_000) return
  const land = rgbFromPacked(atlas.color32("grass"), [58, 90, 38])
  const water = rgbFromPacked(atlas.color32("water"), [36, 88, 104])
  const deep = rgbFromPacked(atlas.color32("water_deep"), [28, 68, 92])
  // Dark teal shore mid — grass↔water equal lerp was the light-blue stair rim.
  const midRgb = [
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
      let r = land[0] * (1 - toMid) + midRgb[0] * toMid
      let g = land[1] * (1 - toMid) + midRgb[1] * toMid
      let b = land[2] * (1 - toMid) + midRgb[2] * toMid
      r = r * (1 - toWater) + water[0] * toWater
      g = g * (1 - toWater) + water[1] * toWater
      b = b * (1 - toWater) + water[2] * toWater
      data[o] = Math.max(0, Math.min(255, (r * (1 - toDeep) + deep[0] * toDeep) | 0))
      data[o + 1] = Math.max(0, Math.min(255, (g * (1 - toDeep) + deep[1] * toDeep) | 0))
      data[o + 2] = Math.max(0, Math.min(255, (b * (1 - toDeep) + deep[2] * toDeep) | 0))
      data[o + 3] = 255
    }
  }
  `

block = block.slice(0, loopStart) + newLoop + block.slice(loopEnd)
t = t.slice(0, start) + block + t.slice(end)

// Align naturePixel32 shoreBlend to multi-stop via draw.ts — update bands commentally
fs.writeFileSync(path, t, "utf8")
console.log("ok", fs.statSync(path).size)
console.log("has midRgb", t.includes("midRgb"))
console.log("step=1 force", /const step = 1\n/.test(t))