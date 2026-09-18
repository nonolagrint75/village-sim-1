import fs from "fs"
const s = fs.readFileSync("src/lib/render/nature/shorePaint.ts","utf8")
const d = fs.readFileSync("src/lib/render/nature/draw.ts","utf8")
console.log({
  hardGate: (s.match(/if \(f < 0\.5\) continue/g)||[]).length,
  exactCanvas: s.includes("_stripTmp.width !== ww"),
  shoreHardRgb: s.includes("export function shoreHardRgb"),
  shoreAlphaHard: s.includes("f >= 0.5 ? 1 : 0"),
  solidDeep: d.includes('rgb(28,68,92)'),
  np32Hard: d.includes("if (f < 0.5) return land"),
  dirtCarve: s.includes("0.4 * mid") && s.includes("dirtField"),
})