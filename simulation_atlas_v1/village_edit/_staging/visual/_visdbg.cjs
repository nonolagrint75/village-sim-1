const fs = require("fs")
let t = fs.readFileSync("src/lib/render/nature/shorePaint.ts", "utf8")
const si = t.indexOf("export function paintViewportShoreStrip")
const di = t.indexOf("export function paintViewportDirtStrip")
let part = t.slice(si, di)
if (part.includes("STRIP_VIS_DEBUG")) { console.log("already"); process.exit(0) }
const oldLand = 'const land = rgbFromPacked(atlas.color32("grass"), [58, 90, 38])'
if (!part.includes(oldLand)) { console.log("land line missing"); process.exit(1) }
part = part.replace(oldLand, oldLand + "\r\n  // STRIP_VIS_DEBUG\r\n  const landDbg = [255, 0, 180] as [number, number, number]\r\n  const waterDbg = [0, 255, 255] as [number, number, number]")
part = part.replace(
  "data[o] = land[0]\r\n            data[o + 1] = land[1]\r\n            data[o + 2] = land[2]",
  "data[o] = landDbg[0]\r\n            data[o + 1] = landDbg[1]\r\n            data[o + 2] = landDbg[2]"
)
part = part.replace(
  "const [r, g, b] = shoreHardRgb(f, water, deep)\r\n            data[o] = r\r\n            data[o + 1] = g\r\n            data[o + 2] = b",
  "const [r, g, b] = waterDbg\r\n            data[o] = r\r\n            data[o + 1] = g\r\n            data[o + 2] = b"
)
if (!part.includes("landDbg")) { console.log("replace failed"); process.exit(2) }
t = t.slice(0, si) + part + t.slice(di)
fs.writeFileSync("src/lib/render/nature/shorePaint.ts", t, "utf8")
console.log("ok vis debug")