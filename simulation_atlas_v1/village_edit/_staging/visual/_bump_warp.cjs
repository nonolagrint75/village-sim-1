const fs = require("fs")
const p = "src/lib/render/nature/shorePaint.ts"
let t = fs.readFileSync(p, "utf8")

const i = t.indexOf("function domainWarp")
if (i < 0) { console.error("domainWarp not found"); process.exit(1) }
let depth = 0, started = false, k = i
for (; k < t.length; k++) {
  const c = t[k]
  if (c === "{") { depth++; started = true }
  else if (c === "}") {
    depth--
    if (started && depth === 0) { k++; break }
  }
}
const newWarp = `function domainWarp(wx: number, wy: number): [number, number] {
  // HARD isocontour meander — must leave tile mid-edges (~2.6–3.6 cells)
  const lx =
    fbm2(wx * 0.085, wy * 0.085, 5, 2.05, 0.52) * 2.75 +
    simplex2(wx * 0.22 + 11.3, wy * 0.22 - 4.7) * 1.25
  const ly =
    fbm2(wx * 0.085 + 37.1, wy * 0.085 - 19.4, 5, 2.05, 0.52) * 2.75 +
    simplex2(wx * 0.22 - 8.2, wy * 0.22 + 15.6) * 1.25
  const mx =
    simplex2(wx * 0.58 + 3.1, wy * 0.58) * 1.55 +
    simplex2(wx * 1.15 - 6.4, wy * 1.15 + 2.8) * 0.85
  const my =
    simplex2(wx * 0.58 - 12.5, wy * 0.58 + 9.1) * 1.55 +
    simplex2(wx * 1.15 + 4.2, wy * 1.15 - 7.3) * 0.85
  const hx =
    simplex2(wx * 2.6 + 1.7, wy * 2.6) * 0.88 +
    simplex2(wx * 5.8 - 4.1, wy * 5.8 + 2.2) * 0.48 +
    simplex2(wx * 11.8 + 8.8, wy * 11.8 - 3.3) * 0.26
  const hy =
    simplex2(wx * 2.6 - 2.9, wy * 2.6 + 5.4) * 0.88 +
    simplex2(wx * 5.8 + 9.0, wy * 5.8 - 1.6) * 0.48 +
    simplex2(wx * 11.8 - 5.5, wy * 11.8 + 6.7) * 0.26
  return [wx + lx + mx + hx, wy + ly + my + hy]
}`
t = t.slice(0, i) + newWarp + t.slice(k)
console.log("domainWarp replaced")

function replaceOnce(label, from, to) {
  if (!t.includes(from)) { console.error("MISS " + label); return false }
  t = t.replace(from, to)
  console.log("OK " + label)
  return true
}

replaceOnce(
  "shoreField edgePush",
  "const edgePush =\n    fbm2(wx * 0.5 + 9.1, wy * 0.5 - 3.4, 4, 2.1, 0.55) * 0.95 +\n    simplex2(wx * 1.45 + 2.2, wy * 1.45 - 7.7) * 0.65 +\n    simplex2(wx * 2.9 - 4.4, wy * 2.9 + 1.3) * 0.38\n  const base = smoothstep(-1.65, 1.55, shoreSdf(terrain, worldW, wx, wy) + edgePush)",
  "const edgePush =\n    fbm2(wx * 0.48 + 9.1, wy * 0.48 - 3.4, 4, 2.1, 0.55) * 1.45 +\n    simplex2(wx * 1.35 + 2.2, wy * 1.35 - 7.7) * 0.95 +\n    simplex2(wx * 2.7 - 4.4, wy * 2.7 + 1.3) * 0.55\n  const base = smoothstep(-1.85, 1.75, shoreSdf(terrain, worldW, wx, wy) + edgePush)"
)

replaceOnce(
  "shoreAlpha thresh",
  "const thresh =\n    0.5 +\n    simplex2(wx * 1.7 + 3.3, wy * 1.7 - 2.1) * 0.28 +\n    simplex2(wx * 4.1 - 5.5, wy * 4.1 + 1.4) * 0.16 +\n    fbm2(wx * 0.55 + 8.2, wy * 0.55 - 4.7, 3, 2.05, 0.5) * 0.12\n  return f >= thresh ? 1 : 0",
  "const thresh =\n    0.5 +\n    simplex2(wx * 1.55 + 3.3, wy * 1.55 - 2.1) * 0.38 +\n    simplex2(wx * 3.7 - 5.5, wy * 3.7 + 1.4) * 0.24 +\n    fbm2(wx * 0.48 + 8.2, wy * 0.48 - 4.7, 3, 2.05, 0.5) * 0.18\n  return f >= thresh ? 1 : 0"
)

replaceOnce(
  "dirtAlpha thresh",
  "const thresh =\n    0.5 +\n    simplex2(wx * 1.55 + 7.1, wy * 1.55 - 3.3) * 0.3 +\n    simplex2(wx * 3.8 - 2.2, wy * 3.8 + 5.5) * 0.18 +\n    fbm2(wx * 0.48 + 2.4, wy * 0.48 - 9.1, 3, 2.05, 0.5) * 0.14\n  return f >= thresh ? 1 : 0",
  "const thresh =\n    0.5 +\n    simplex2(wx * 1.4 + 7.1, wy * 1.4 - 3.3) * 0.4 +\n    simplex2(wx * 3.4 - 2.2, wy * 3.4 + 5.5) * 0.24 +\n    fbm2(wx * 0.42 + 2.4, wy * 0.42 - 9.1, 3, 2.05, 0.5) * 0.18\n  return f >= thresh ? 1 : 0"
)

replaceOnce(
  "shoreFieldFast edgePush",
  "const edgePush =\n    fbm2(wx * 0.5 + 9.1, wy * 0.5 - 3.4, 3, 2.1, 0.55) * 0.7 +\n    simplex2(wx * 1.45 + 2.2, wy * 1.45 - 7.7) * 0.45\n  const base = smoothstep(-0.3, 1.25, bil + shoreWarp(sx * 0.9, sy * 0.9) * 0.55 + edgePush * 0.35)",
  "const edgePush =\n    fbm2(wx * 0.48 + 9.1, wy * 0.48 - 3.4, 3, 2.1, 0.55) * 1.1 +\n    simplex2(wx * 1.35 + 2.2, wy * 1.35 - 7.7) * 0.7\n  const base = smoothstep(-0.45, 1.4, bil + shoreWarp(sx * 0.9, sy * 0.9) * 0.7 + edgePush * 0.95)"
)

const open = (t.match(/\{/g) || []).length
const close = (t.match(/\}/g) || []).length
console.log("braces", open, close)
if (open !== close) { console.error("BRACE MISMATCH"); process.exit(3) }
fs.writeFileSync(p, t, "utf8")
console.log("wrote len", t.length, "has2.75", t.includes("* 2.75"))