const fs = require("fs")
const p = "src/lib/render/nature/shorePaint.ts"
let t = fs.readFileSync(p, "utf8")
const nl = "\r\n"
function replaceOnce(label, from, to) {
  if (!t.includes(from)) { console.error("MISS " + label); return false }
  t = t.replace(from, to)
  console.log("OK " + label)
  return true
}
replaceOnce(
  "shoreField edgePush",
  "const edgePush =" + nl +
  "    fbm2(wx * 0.5 + 9.1, wy * 0.5 - 3.4, 4, 2.1, 0.55) * 0.95 +" + nl +
  "    simplex2(wx * 1.45 + 2.2, wy * 1.45 - 7.7) * 0.65 +" + nl +
  "    simplex2(wx * 2.9 - 4.4, wy * 2.9 + 1.3) * 0.38" + nl +
  "  const base = smoothstep(-1.65, 1.55, shoreSdf(terrain, worldW, wx, wy) + edgePush)",
  "const edgePush =" + nl +
  "    fbm2(wx * 0.48 + 9.1, wy * 0.48 - 3.4, 4, 2.1, 0.55) * 1.45 +" + nl +
  "    simplex2(wx * 1.35 + 2.2, wy * 1.35 - 7.7) * 0.95 +" + nl +
  "    simplex2(wx * 2.7 - 4.4, wy * 2.7 + 1.3) * 0.55" + nl +
  "  const base = smoothstep(-1.85, 1.75, shoreSdf(terrain, worldW, wx, wy) + edgePush)"
)
replaceOnce(
  "shoreAlpha thresh",
  "const thresh =" + nl +
  "    0.5 +" + nl +
  "    simplex2(wx * 1.7 + 3.3, wy * 1.7 - 2.1) * 0.28 +" + nl +
  "    simplex2(wx * 4.1 - 5.5, wy * 4.1 + 1.4) * 0.16 +" + nl +
  "    fbm2(wx * 0.55 + 8.2, wy * 0.55 - 4.7, 3, 2.05, 0.5) * 0.12" + nl +
  "  return f >= thresh ? 1 : 0",
  "const thresh =" + nl +
  "    0.5 +" + nl +
  "    simplex2(wx * 1.55 + 3.3, wy * 1.55 - 2.1) * 0.38 +" + nl +
  "    simplex2(wx * 3.7 - 5.5, wy * 3.7 + 1.4) * 0.24 +" + nl +
  "    fbm2(wx * 0.48 + 8.2, wy * 0.48 - 4.7, 3, 2.05, 0.5) * 0.18" + nl +
  "  return f >= thresh ? 1 : 0"
)
replaceOnce(
  "dirtAlpha thresh",
  "const thresh =" + nl +
  "    0.5 +" + nl +
  "    simplex2(wx * 1.55 + 7.1, wy * 1.55 - 3.3) * 0.3 +" + nl +
  "    simplex2(wx * 3.8 - 2.2, wy * 3.8 + 5.5) * 0.18 +" + nl +
  "    fbm2(wx * 0.48 + 2.4, wy * 0.48 - 9.1, 3, 2.05, 0.5) * 0.14" + nl +
  "  return f >= thresh ? 1 : 0",
  "const thresh =" + nl +
  "    0.5 +" + nl +
  "    simplex2(wx * 1.4 + 7.1, wy * 1.4 - 3.3) * 0.4 +" + nl +
  "    simplex2(wx * 3.4 - 2.2, wy * 3.4 + 5.5) * 0.24 +" + nl +
  "    fbm2(wx * 0.42 + 2.4, wy * 0.42 - 9.1, 3, 2.05, 0.5) * 0.18" + nl +
  "  return f >= thresh ? 1 : 0"
)
replaceOnce(
  "shoreFieldFast edgePush",
  "const edgePush =" + nl +
  "    fbm2(wx * 0.5 + 9.1, wy * 0.5 - 3.4, 3, 2.1, 0.55) * 0.7 +" + nl +
  "    simplex2(wx * 1.45 + 2.2, wy * 1.45 - 7.7) * 0.45" + nl +
  "  const base = smoothstep(-0.3, 1.25, bil + shoreWarp(sx * 0.9, sy * 0.9) * 0.55 + edgePush * 0.35)",
  "const edgePush =" + nl +
  "    fbm2(wx * 0.48 + 9.1, wy * 0.48 - 3.4, 3, 2.1, 0.55) * 1.1 +" + nl +
  "    simplex2(wx * 1.35 + 2.2, wy * 1.35 - 7.7) * 0.7" + nl +
  "  const base = smoothstep(-0.45, 1.4, bil + shoreWarp(sx * 0.9, sy * 0.9) * 0.7 + edgePush * 0.95)"
)
const open = (t.match(/\{/g) || []).length
const close = (t.match(/\}/g) || []).length
console.log("braces", open, close, "2.75", t.includes("* 2.75"), "1.45 edge", t.includes("* 1.45 +"))
if (open !== close) process.exit(3)
fs.writeFileSync(p, t, "utf8")
console.log("wrote", t.length)