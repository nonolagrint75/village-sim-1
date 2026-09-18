import fs from "fs"
const t = fs.readFileSync("src/lib/render/nature/shorePaint.ts", "utf8")
console.log("has header", t.includes("import { DIRT"))
console.log("warp*6.4", t.includes("* 6.4"))
console.log("mid carve", t.includes("Mid-band carve"))
console.log("narrow lerp", t.includes("smoothstep(0.12, 0.48"))
console.log("dirt mid", t.includes("beige Manhattan"))
// count shoreField occurrences
console.log("shoreField calls in strip", (t.match(/shoreField\(/g)||[]).length)