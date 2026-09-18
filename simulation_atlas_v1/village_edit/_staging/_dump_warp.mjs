import fs from "fs"
const s = fs.readFileSync("src/lib/render/nature/shorePaint.ts","utf8")
for (const name of ["shoreWarp","shoreSdf","shoreField","dirtSdf","dirtField","shoreFieldFast"]) {
  const i = s.indexOf("function " + name) >= 0 ? s.indexOf("function " + name) : s.indexOf("export function " + name)
  console.log("\n==== "+name+" @"+i+" ====")
  console.log(s.slice(i, i+700))
}