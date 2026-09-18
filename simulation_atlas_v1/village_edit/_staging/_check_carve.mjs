import fs from "fs"
const s = fs.readFileSync("src/lib/render/nature/shorePaint.ts","utf8")
const a = s.indexOf("export function shoreField")
const b = s.indexOf("export function shoreFieldFast")
console.log(s.slice(a,b))
console.log("---warp---", (s.match(/\* 5\.2/g)||[]).length, (s.match(/\* 6\.4/g)||[]).length)