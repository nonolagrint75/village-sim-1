import fs from "fs"
const path = "src/lib/render/nature/shorePaint.ts"
let t = fs.readFileSync(path, "utf8")
// ensure carve amps are strong
t = t.replace(/\* 0\.38 \* mid \+/g, "* 0.45 * mid +")
t = t.replace(/\* 0\.28 \* mid \+/g, "* 0.45 * mid +")
t = t.replace(/\* 0\.26 \* mid \+/g, "* 0.32 * mid +")
t = t.replace(/\* 0\.18 \* mid \+/g, "* 0.32 * mid +")
t = t.replace(/\* 0\.22 \* mid\n/g, "* 0.28 * mid\n")
t = t.replace(/\* 0\.16 \* mid\n/g, "* 0.28 * mid\n")
fs.writeFileSync(path, t, "utf8")
const a = t.indexOf("export function shoreField")
console.log(t.slice(a, a+450))