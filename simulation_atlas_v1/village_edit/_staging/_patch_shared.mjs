import fs from "fs"

// --- shorePaint: add shoreRgbAt + use in strip ---
{
  const path = "src/lib/render/nature/shorePaint.ts"
  let t = fs.readFileSync(path, "utf8")

  const helper = `export function shoreLerpWeights(f: number): { w: number; deepW: number } {
  // Legacy 2-stop; prefer shoreRgbAt for Visuel (dark-teal mid, no pale cyan).
  return { w: smoothstep(0.08, 0.42, f), deepW: smoothstep(0.58, 0.94, f) }
}

/** Shared land→mid→water→deep ramp used by strip + naturePixel32. */
export function shoreRgbAt(
  f: number,
  land: [number, number, number],
  water: [number, number, number],
  deep: [number, number, number],
): [number, number, number] {
  const mid: [number, number, number] = [
    Math.max(0, Math.min(255, (water[0] * 0.55 + land[0] * 0.12 + deep[0] * 0.2) | 0)),
    Math.max(0, Math.min(255, (water[1] * 0.6 + land[1] * 0.15 + deep[1] * 0.15) | 0)),
    Math.max(0, Math.min(255, (water[2] * 0.72 + deep[2] * 0.22) | 0)),
  ]
  const toMid = smoothstep(0.08, 0.42, f)
  const toWater = smoothstep(0.38, 0.62, f)
  const toDeep = smoothstep(0.58, 0.94, f)
  let r = land[0] * (1 - toMid) + mid[0] * toMid
  let g = land[1] * (1 - toMid) + mid[1] * toMid
  let b = land[2] * (1 - toMid) + mid[2] * toMid
  r = r * (1 - toWater) + water[0] * toWater
  g = g * (1 - toWater) + water[1] * toWater
  b = b * (1 - toWater) + water[2] * toWater
  r = r * (1 - toDeep) + deep[0] * toDeep
  g = g * (1 - toDeep) + deep[1] * toDeep
  b = b * (1 - toDeep) + deep[2] * toDeep
  return [
    Math.max(0, Math.min(255, r | 0)),
    Math.max(0, Math.min(255, g | 0)),
    Math.max(0, Math.min(255, b | 0)),
  ]
}
`

  const oldW = `export function shoreLerpWeights(f: number): { w: number; deepW: number } {
  return { w: smoothstep(0.12, 0.48, f), deepW: smoothstep(0.52, 0.94, f) }
}`
  if (t.includes(oldW)) t = t.replace(oldW, helper)
  else if (!t.includes("export function shoreRgbAt")) {
    t = t.replace(/export function shoreLerpWeights\([\s\S]*?\n\}/, helper.trimEnd())
  }

  // Simplify strip pixel body to call shoreRgbAt
  const re = /const midRgb = \[[\s\S]*?data\[o \+ 3\] = 255\n    \}\n  \}/
  if (!re.test(t)) {
    console.error("strip pixel body not found for shoreRgbAt rewrite")
  } else {
    t = t.replace(
      re,
      `const img = stripCanvas(pw, ph).createImageData(pw, ph)
  const data = img.data
  const inv = step / tileS
  for (let j = 0; j < ph; j++) {
    for (let i = 0; i < pw; i++) {
      const wx = minX + (i + 0.5) * inv
      const wy = minY + (j + 0.5) * inv
      const f = shoreField(terrain, worldW, wx, wy)
      const [r, g, b] = shoreRgbAt(f, land, water, deep)
      const o = (j * pw + i) * 4
      data[o] = r
      data[o + 1] = g
      data[o + 2] = b
      data[o + 3] = 255
    }
  }`,
    )
    console.log("strip uses shoreRgbAt")
  }

  fs.writeFileSync(path, t, "utf8")
}

// --- draw.ts: import shoreRgbAt and use in shoreBlend ---
{
  const path = "src/lib/render/nature/draw.ts"
  let t = fs.readFileSync(path, "utf8")
  if (!t.includes("shoreRgbAt")) {
    t = t.replace("shoreLerpWeights,", "shoreLerpWeights,\n  shoreRgbAt,")
  }
  const oldBlend = `    const shoreBlend = (f: number, land: number, water: number, deep: number) => {
      const { w, deepW } = shoreLerpWeights(f)
      return lerpPack(lerpPack(land, water, w), deep, deepW)
    }`
  const newBlend = `    const shoreBlend = (f: number, land: number, water: number, deep: number) => {
      const unpack = (c: number): [number, number, number] => [c & 255, (c >>> 8) & 255, (c >>> 16) & 255]
      const [r, g, b] = shoreRgbAt(f, unpack(land), unpack(water), unpack(deep))
      return (255 << 24) | (b << 16) | (g << 8) | r
    }`
  if (!t.includes(oldBlend)) {
    console.error("shoreBlend not found")
    const i = t.indexOf("const shoreBlend")
    console.log(t.slice(i, i + 250))
    process.exit(1)
  }
  t = t.replace(oldBlend, newBlend)
  fs.writeFileSync(path, t, "utf8")
  console.log("draw.ts shoreBlend → shoreRgbAt")
}