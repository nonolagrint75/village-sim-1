import fs from "fs"
const t = fs.readFileSync("src/lib/render/nature/shorePaint.ts", "utf8")
console.log("len", t.length, "lines", t.split(/\n/).length)
console.log("---HEAD 80---")
console.log(t.split(/\n/).slice(0,80).join("\n"))
console.log("---TAIL exports---")
const lines = t.split(/\n/)
for (let i=0;i<lines.length;i++) if (/^export function|^import |^function /.test(lines[i])) console.log(i+1, lines[i])