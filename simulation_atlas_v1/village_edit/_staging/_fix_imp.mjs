import fs from "fs"
const path = "src/lib/render/nature/draw.ts"
let t = fs.readFileSync(path, "utf8")
t = t.replace(/shoreHardRgb,\n  shoreAlpha,\n  shoreHardRgb/g, "shoreHardRgb,\n  shoreAlpha")
t = t.replace(/shoreRgbAt,\n  shoreHardRgb,\n  shoreAlpha,\n  shoreHardRgb,\n  shoreAlpha/g, "shoreRgbAt,\n  shoreHardRgb,\n  shoreAlpha")
// collapse duplicate consecutive
while (t.includes("shoreHardRgb,\n  shoreHardRgb")) t = t.replace("shoreHardRgb,\n  shoreHardRgb", "shoreHardRgb")
fs.writeFileSync(path, t, "utf8")
const m = t.match(/shoreHardRgb/g)
console.log("shoreHardRgb count", m && m.length)