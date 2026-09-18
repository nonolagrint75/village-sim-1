import fs from "fs"
const t = fs.readFileSync("src/lib/render/nature/draw.ts", "utf8")
const i = t.indexOf('shorePaint')
console.log("---import---")
console.log(t.slice(Math.max(0, i - 350), i + 40))
console.log("---pixel---")
const j = t.indexOf("export function naturePixel32")
console.log(t.slice(j, j + 1200))