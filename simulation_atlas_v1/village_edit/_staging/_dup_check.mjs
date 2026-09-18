import fs from "fs"
const s = fs.readFileSync("src/lib/render/nature/shorePaint.ts","utf8")
const names = [...s.matchAll(/export function (\w+)/g)].map(m=>m[1])
const counts = {}
for (const n of names) counts[n]=(counts[n]||0)+1
console.log(counts)
const dups = Object.entries(counts).filter(([,c])=>c>1)
console.log("dups", dups)