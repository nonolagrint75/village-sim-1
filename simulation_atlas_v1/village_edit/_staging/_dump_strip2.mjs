import fs from "fs"
const s = fs.readFileSync("src/lib/render/nature/shorePaint.ts","utf8")
const a = s.indexOf("export function paintViewportShoreStrip")
const b = s.indexOf("export function paintViewportDirtStrip")
console.log(s.slice(a, b))