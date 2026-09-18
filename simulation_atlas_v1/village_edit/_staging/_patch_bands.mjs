import fs from "fs"
const path = "src/lib/render/nature/draw.ts"
let t = fs.readFileSync(path, "utf8")

// Ensure smoothstep helper exists locally if not imported
if (!t.includes("function smoothstep") && !/import \{[^}]*smoothstep/.test(t)) {
  // naturePixel32 already uses smoothstep — find definition
  console.log("smoothstep usage:", (t.match(/smoothstep/g) || []).length)
}

const old = `    const shoreBlend = (f: number, land: number, water: number, deep: number) => {
      const w = smoothstep(0.02, 0.55, f)
      const deepW = smoothstep(0.45, 0.92, f)
      return lerpPack(lerpPack(land, water, w), deep, deepW)
    }`

const next = `    const shoreBlend = (f: number, land: number, water: number, deep: number) => {
      // Must match paintViewportShoreStrip after mid-band carve.
      const w = smoothstep(0.12, 0.48, f)
      const deepW = smoothstep(0.52, 0.94, f)
      return lerpPack(lerpPack(land, water, w), deep, deepW)
    }`

if (!t.includes(old)) {
  console.error("shoreBlend block not found")
  process.exit(1)
}
t = t.replace(old, next)

// Check smoothstep is defined in draw.ts
if (!/\bfunction smoothstep\b/.test(t) && !/const smoothstep\b/.test(t)) {
  // inject local helper before naturePixel32
  const helper = `function smoothstep(e0: number, e1: number, x: number): number {
  if (e1 <= e0) return x >= e1 ? 1 : 0
  const t = Math.max(0, Math.min(1, (x - e0) / (e1 - e0)))
  return t * t * (3 - 2 * t)
}

`
  if (!t.includes(helper.trim().slice(0, 30))) {
    t = t.replace("export function naturePixel32(", helper + "export function naturePixel32(")
    console.log("injected smoothstep helper")
  }
}

fs.writeFileSync(path, t, "utf8")
console.log("bands aligned")