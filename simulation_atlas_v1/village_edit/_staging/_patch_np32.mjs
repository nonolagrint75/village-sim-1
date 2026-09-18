import fs from "fs"
const path = "src/lib/render/nature/draw.ts"
let t = fs.readFileSync(path, "utf8")
const old = `    const shoreBlend = (f: number, land: number, water: number, deep: number) => {
      // Must match paintViewportShoreStrip after mid-band carve.
      const w = smoothstep(0.12, 0.48, f)
      const deepW = smoothstep(0.52, 0.94, f)
      return lerpPack(lerpPack(land, water, w), deep, deepW)
    }`
const next = `    const shoreBlend = (f: number, land: number, water: number, deep: number) => {
      // Match paintViewportShoreStrip: land → dark-teal mid → water → deep (no pale cyan).
      const unpack = (c: number) => [c & 255, (c >>> 8) & 255, (c >>> 16) & 255] as [number, number, number]
      const pack = (r: number, g: number, b: number) =>
        (255 << 24) | ((b | 0) << 16) | ((g | 0) << 8) | (r | 0)
      const L = unpack(land), W = unpack(water), D = unpack(deep)
      const mid: [number, number, number] = [
        Math.max(0, Math.min(255, (W[0] * 0.55 + L[0] * 0.12 + D[0] * 0.2) | 0)),
        Math.max(0, Math.min(255, (W[1] * 0.6 + L[1] * 0.15 + D[1] * 0.15) | 0)),
        Math.max(0, Math.min(255, (W[2] * 0.72 + D[2] * 0.22) | 0)),
      ]
      const toMid = smoothstep(0.08, 0.42, f)
      const toWater = smoothstep(0.38, 0.62, f)
      const toDeep = smoothstep(0.58, 0.94, f)
      let r = L[0] * (1 - toMid) + mid[0] * toMid
      let g = L[1] * (1 - toMid) + mid[1] * toMid
      let b = L[2] * (1 - toMid) + mid[2] * toMid
      r = r * (1 - toWater) + W[0] * toWater
      g = g * (1 - toWater) + W[1] * toWater
      b = b * (1 - toWater) + W[2] * toWater
      r = r * (1 - toDeep) + D[0] * toDeep
      g = g * (1 - toDeep) + D[1] * toDeep
      b = b * (1 - toDeep) + D[2] * toDeep
      return pack(r, g, b)
    }`
if (!t.includes(old)) {
  // try without comment
  const i = t.indexOf("const shoreBlend")
  console.log(t.slice(i, i+350))
  process.exit(1)
}
t = t.replace(old, next)
fs.writeFileSync(path, t, "utf8")
console.log("np32 aligned to dark-teal mid")