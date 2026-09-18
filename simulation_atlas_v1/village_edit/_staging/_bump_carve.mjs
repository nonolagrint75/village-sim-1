import fs from "fs"
const path = "src/lib/render/nature/shorePaint.ts"
let t = fs.readFileSync(path, "utf8")
t = t.replace(
  "simplex2(wx * 2.05 + 4.4, wy * 2.05 - 2.8) * 0.28 * mid +",
  "simplex2(wx * 2.05 + 4.4, wy * 2.05 - 2.8) * 0.38 * mid +",
)
t = t.replace(
  "simplex2(wx * 4.8 - 1.2, wy * 4.8 + 3.1) * 0.18 * mid +",
  "simplex2(wx * 4.8 - 1.2, wy * 4.8 + 3.1) * 0.26 * mid +",
)
t = t.replace(
  "fbm2(wx * 0.85 + 1.7, wy * 0.85 - 0.9, 3, 2.05, 0.5) * 0.16 * mid",
  "fbm2(wx * 0.85 + 1.7, wy * 0.85 - 0.9, 3, 2.05, 0.5) * 0.22 * mid",
)
fs.writeFileSync(path, t, "utf8")
console.log("carve bumped", t.includes("0.38 * mid"))