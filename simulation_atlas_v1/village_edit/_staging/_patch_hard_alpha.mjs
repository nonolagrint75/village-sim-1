import fs from "fs"

// ========== shorePaint.ts ==========
{
  const path = "src/lib/render/nature/shorePaint.ts"
  let t = fs.readFileSync(path, "utf8")

  // Replace shoreRgbAt with hard water/deep + soft alpha helper
  const oldRgb = t.match(/export function shoreRgbAt\([\s\S]*?\n\}/)
  if (!oldRgb) { console.error("shoreRgbAt missing"); process.exit(1) }

  const newHelpers = `/**
 * HARD water/deep pick — never land↔water color mix (that mix WAS the light-blue stair rim).
 * Softness is alpha only, from continuous SDF field.
 */
export function shoreHardRgb(
  f: number,
  water: [number, number, number],
  deep: [number, number, number],
): [number, number, number] {
  const deepW = smoothstep(0.62, 0.88, f)
  return [
    Math.max(0, Math.min(255, (water[0] * (1 - deepW) + deep[0] * deepW) | 0)),
    Math.max(0, Math.min(255, (water[1] * (1 - deepW) + deep[1] * deepW) | 0)),
    Math.max(0, Math.min(255, (water[2] * (1 - deepW) + deep[2] * deepW) | 0)),
  ]
}

/** Soft SDF alpha: 0 = show land underlay, 1 = opaque water. No cyan mid-band. */
export function shoreAlpha(f: number): number {
  return smoothstep(0.38, 0.58, f)
}

/** @deprecated kept for call sites — returns hard water (no land mix). */
export function shoreRgbAt(
  f: number,
  _land: [number, number, number],
  water: [number, number, number],
  deep: [number, number, number],
): [number, number, number] {
  return shoreHardRgb(f, water, deep)
}`

  t = t.replace(oldRgb[0], newHelpers)

  // Rewrite shore strip pixel write to use hard rgb + soft alpha
  // Find the inner loop that calls shoreRgbAt / shoreField
  const loopRe = /const f = shoreField\(terrain, worldW, wx, wy\)\n\s*const \[r, g, b\] = shoreRgbAt\(f, land, water, deep\)\n\s*const o = \(j \* pw \+ i\) \* 4\n\s*data\[o\] = r\n\s*data\[o \+ 1\] = g\n\s*data\[o \+ 2\] = b\n\s*data\[o \+ 3\] = 255/

  if (!loopRe.test(t)) {
    // try broader
    const i = t.indexOf("const f = shoreField(terrain, worldW, wx, wy)")
    console.log("shore loop at", i, t.slice(i, i+350))
  } else {
    t = t.replace(
      loopRe,
      `const f = shoreField(terrain, worldW, wx, wy)
          const a = shoreAlpha(f)
          if (a <= 0.02) continue
          const [r, g, b] = shoreHardRgb(f, water, deep)
          const o = (j * pw + i) * 4
          data[o] = r
          data[o + 1] = g
          data[o + 2] = b
          data[o + 3] = (a * 255) | 0`,
    )
    console.log("shore strip → hard+alpha")
  }

  // Remove unused land in strip if still declared — keep land for nothing, or leave (unused ok)

  // Dirt strip: hard cover + soft alpha, no beige mid lerp
  const dirtOld = `      const f = dirtField(terrain, worldW, wx, wy)
      if (f <= 0.03) continue
      const w = smoothstep(0.03, 0.36, f)
      const sf = shoreField(terrain, worldW, wx, wy)
      const useSand = sf > 0.18 && f > 0.15
      const c1 = useSand ? sand : cover
      const o = (j * pw + i) * 4
      data[o] = Math.max(0, Math.min(255, (land[0] * (1 - w) + c1[0] * w) | 0))
      data[o + 1] = Math.max(0, Math.min(255, (land[1] * (1 - w) + c1[1] * w + w * 2) | 0))
      data[o + 2] = Math.max(0, Math.min(255, (land[2] * (1 - w) + c1[2] * w) | 0))
      data[o + 3] = f > 0.07 ? 255 : (smoothstep(0.02, 0.07, f) * 255) | 0`

  const dirtNew = `      const f = dirtField(terrain, worldW, wx, wy)
      // Soft SDF alpha only — no land↔beige color mix (that mix WAS the Manhattan rim).
      const a = smoothstep(0.22, 0.42, f)
      if (a <= 0.02) continue
      const sf = shoreField(terrain, worldW, wx, wy)
      const c1 = sf > 0.18 && f > 0.15 ? sand : cover
      const o = (j * pw + i) * 4
      data[o] = c1[0]
      data[o + 1] = c1[1]
      data[o + 2] = c1[2]
      data[o + 3] = (a * 255) | 0`

  if (!t.includes(dirtOld)) {
    const i = t.indexOf("const f = dirtField")
    console.log("dirt loop:", t.slice(i, i+500))
  } else {
    t = t.replace(dirtOld, dirtNew)
    console.log("dirt strip → hard+alpha")
  }

  // Chunk dirt strip similarly if still monolithic — check for early return
  if (t.includes("export function paintViewportDirtStrip") && !t.includes("CHUNK") || (t.indexOf("CHUNK") > 0 && t.indexOf("CHUNK") < t.indexOf("paintViewportDirtStrip"))) {
    // dirt may still be single AABB — leave for now if small
  }

  fs.writeFileSync(path, t, "utf8")
  console.log("shorePaint written", fs.statSync(path).size)
}

// ========== draw.ts naturePixel32 ==========
{
  const path = "src/lib/render/nature/draw.ts"
  let t = fs.readFileSync(path, "utf8")

  // Import shoreHardRgb / shoreAlpha if needed; keep shoreRgbAt
  if (!t.includes("shoreHardRgb")) {
    t = t.replace("shoreRgbAt,", "shoreRgbAt,\n  shoreHardRgb,\n  shoreAlpha,")
    if (!t.includes("shoreHardRgb")) {
      t = t.replace("shoreRgbAt", "shoreRgbAt,\n  shoreHardRgb,\n  shoreAlpha")
    }
  }

  const oldBlend = `    const shoreBlend = (f: number, land: number, water: number, deep: number) => {
      const unpack = (c: number): [number, number, number] => [c & 255, (c >>> 8) & 255, (c >>> 16) & 255]
      const [r, g, b] = shoreRgbAt(f, unpack(land), unpack(water), unpack(deep))
      return (255 << 24) | (b << 16) | (g << 8) | r
    }`

  const newBlend = `    // World-buffer: HARD pick only (no cell-average cyan mid). Strip owns soft edge at closeup.
    const shoreBlend = (f: number, land: number, water: number, deep: number) => {
      if (f < 0.48) return land
      const unpack = (c: number): [number, number, number] => [c & 255, (c >>> 8) & 255, (c >>> 16) & 255]
      const [r, g, b] = shoreHardRgb(f, unpack(water), unpack(deep))
      return (255 << 24) | (b << 16) | (g << 8) | r
    }`

  if (t.includes(oldBlend)) {
    t = t.replace(oldBlend, newBlend)
    console.log("naturePixel32 shore → hard pick")
  } else {
    const i = t.indexOf("const shoreBlend")
    console.log("shoreBlend unexpected:", t.slice(i, i+400))
  }

  // dirtBlend: hard cover, no beige mid
  const dirtBlendRe = /const dirtBlend = \(f: number, sf: number, land: number, cover: number, sand: number\) => \{[\s\S]*?\n    \}/
  const dirtBlendNew = `const dirtBlend = (f: number, sf: number, land: number, cover: number, sand: number) => {
      // Hard pick — soft beige edge owned by continuous dirt strip alpha, not cell-average.
      if (f < 0.32) return land
      return sf > 0.18 && f > 0.15 ? sand : cover
    }`

  if (dirtBlendRe.test(t)) {
    t = t.replace(dirtBlendRe, dirtBlendNew)
    console.log("naturePixel32 dirt → hard pick")
  } else {
    const i = t.indexOf("const dirtBlend")
    console.log("dirtBlend:", t.slice(i, i+350))
  }

  fs.writeFileSync(path, t, "utf8")
  console.log("draw.ts written")
}