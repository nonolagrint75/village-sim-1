import fs from "fs"
const s = fs.readFileSync("src/lib/render/nature/shorePaint.ts","utf8")
const i = s.indexOf("export function shoreLerpWeights")
console.log(s.slice(i, i+400))
console.log("---STRIP---")
const j = s.indexOf("midRgb")
console.log(s.slice(j-200, j+700))