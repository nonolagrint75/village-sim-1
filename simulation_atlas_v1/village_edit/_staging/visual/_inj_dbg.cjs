const fs = require("fs")
const p = "src/lib/render/nature/shorePaint.ts"
let t = fs.readFileSync(p, "utf8")
if (!t.includes("WARP_STRIP_DEBUG")) {
  // Inject after cells collected
  const needle = "if (!cells.length) return"
  const idx = t.indexOf(needle)
  if (idx < 0) { console.error("no needle"); process.exit(1) }
  // only first occurrence (shore strip)
  const inj = "if (!cells.length) {\n    ;(globalThis as any).__shoreStripDbg = { empty: true }\n    return\n  }\n  ;(globalThis as any).__shoreStripDbg = { n: cells.length, minX, maxX, minY, maxY, tileS }"
  // wait minX not defined yet - inject after AABB computed
}
// Find after maxY clamp in shore strip only
const marker = "maxY = Math.min(y1, maxY + 1)"
const i = t.indexOf(marker)
if (i < 0) { console.error("no maxY marker"); process.exit(1) }
// shore strip first occurrence
if (!t.includes("WARP_STRIP_DEBUG")) {
  const insertAt = i + marker.length
  const dbg = "\r\n  // WARP_STRIP_DEBUG\r\n  ;(globalThis as any).__shoreStripDbg = { n: cells.length, minX, maxX, minY, maxY, tileS, x0, y0, x1, y1 }"
  t = t.slice(0, insertAt) + dbg + t.slice(insertAt)
  // also fix shore gate to shoreAlpha
  t = t.replace(
    "          // BOTH sides of hard 0.5: land overwrites water-cell underlay (else Manhattan water tiles remain).\r\n          if (f < 0.5) {",
    "          // BOTH sides of hard 0.5: land overwrites water-cell underlay (else Manhattan water tiles remain).\r\n          if (shoreAlpha(f, wx, wy) < 1) {"
  )
  fs.writeFileSync(p, t, "utf8")
  console.log("injected debug + shoreAlpha gate")
} else {
  console.log("already injected")
}
console.log("shoreAlpha in strip", t.includes("shoreAlpha(f, wx, wy)"))