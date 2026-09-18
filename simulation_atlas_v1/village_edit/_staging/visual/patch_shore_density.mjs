import fs from "fs"

const p = "src/lib/render/nature/shorePaint.ts"
const t = fs.readFileSync(p, "utf8")

// Fix density: screen-pixel based, not cells*6
let out = t
  .replace(
    `  const cellsX = Math.max(1, bx1 - bx0)
  const cellsY = Math.max(1, by1 - by0)
  const target = Math.min(280, Math.max(64, Math.round(Math.sqrt(cellsX * cellsY) * 18)))
  const dw = Math.max(48, Math.min(target, Math.round(cellsX * 6)))
  const dh = Math.max(48, Math.min(target, Math.round(cellsY * 6)))`,
    `  // Density tracks screen size of AABB (not cell count) — avoids blocky zoom.
  const dw = Math.max(64, Math.min(360, Math.round(pw / 2.5)))
  const dh = Math.max(64, Math.min(360, Math.round(ph / 2.5)))`,
  )
  .replace(
    `  const cellsX = Math.max(1, bx1 - bx0)
  const cellsY = Math.max(1, by1 - by0)
  const target = Math.min(240, Math.max(48, Math.round(Math.sqrt(cellsX * cellsY) * 16)))
  const dw = Math.max(40, Math.min(target, Math.round(cellsX * 5)))
  const dh = Math.max(40, Math.min(target, Math.round(cellsY * 5)))`,
    `  const dw = Math.max(48, Math.min(280, Math.round(pw / 3)))
  const dh = Math.max(48, Math.min(280, Math.round(ph / 3)))`,
  )

// Stronger warp if still 2.55
out = out.replace("* 2.55", "* 3.1")

if (!out.includes("pw / 2.5")) throw new Error("density replace failed")
fs.writeFileSync(p, out, "utf8")
console.log("ok", out.includes("pw / 2.5"), out.includes("* 3.1"), out.length)
