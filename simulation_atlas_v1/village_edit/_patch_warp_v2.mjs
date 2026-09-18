import fs from "fs"
const p = "C:/Users/kamel/village-sim-1/simulation_atlas_v1/village_edit/src/lib/render/nature/shorePaint.ts"
const log = "C:/Users/kamel/village-sim-1/simulation_atlas_v1/village_edit/_patch_log.txt"
let c = fs.readFileSync(p, "utf8")
const out = []
out.push("len=" + c.length)
const start = c.indexOf("function domainWarp")
if (start < 0) { fs.writeFileSync(log, "no domainWarp"); process.exit(1) }
const commentStart = c.lastIndexOf("/**", start)
let brace = 0
let endFn = -1
for (let i = c.indexOf("{", start); i < c.length; i++) {
  if (c[i] === "{") brace++
  else if (c[i] === "}") {
    brace--
    if (brace === 0) { endFn = i + 1; break }
  }
}
out.push("commentStart=" + commentStart + " endFn=" + endFn)
const newWarp = [
  "/** Multi-octave vector domain-warp - hard 0.5 isocontour must leave tile mid-edges. */",
  "function domainWarp(wx: number, wy: number): [number, number] {",
  "  // WARP_V2_AGGRESSIVE: mass meander (~3.5-5 cells) + mid/high octaves for jagged shore.",
  "  const lx =",
  "    fbm2(wx * 0.055, wy * 0.055, 6, 2.05, 0.55) * 3.4 +",
  "    fbm2(wx * 0.12 + 19.7, wy * 0.12 - 8.3, 5, 2.1, 0.52) * 1.65 +",
  "    simplex2(wx * 0.28 + 11.3, wy * 0.28 - 4.7) * 1.15",
  "  const ly =",
  "    fbm2(wx * 0.055 + 37.1, wy * 0.055 - 19.4, 6, 2.05, 0.55) * 3.4 +",
  "    fbm2(wx * 0.12 - 22.4, wy * 0.12 + 14.6, 5, 2.1, 0.52) * 1.65 +",
  "    simplex2(wx * 0.28 - 8.2, wy * 0.28 + 15.6) * 1.15",
  "  const mx =",
  "    simplex2(wx * 0.48 + 3.1, wy * 0.48) * 1.55 +",
  "    simplex2(wx * 0.95 - 6.4, wy * 0.95 + 2.8) * 0.95 +",
  "    simplex2(wx * 1.7 + 2.2, wy * 1.7 - 5.1) * 0.55",
  "  const my =",
  "    simplex2(wx * 0.48 - 12.5, wy * 0.48 + 9.1) * 1.55 +",
  "    simplex2(wx * 0.95 + 4.2, wy * 0.95 - 7.7) * 0.95 +",
  "    simplex2(wx * 1.7 - 3.8, wy * 1.7 + 6.4) * 0.55",
  "  const hx =",
  "    simplex2(wx * 2.4 + 1.7, wy * 2.4) * 0.85 +",
  "    simplex2(wx * 5.2 - 4.1, wy * 5.2 + 2.2) * 0.48 +",
  "    simplex2(wx * 9.8 + 8.8, wy * 9.8 - 3.3) * 0.28 +",
  "    simplex2(wx * 18.5 - 2.1, wy * 18.5 + 7.4) * 0.14",
  "  const hy =",
  "    simplex2(wx * 2.4 - 2.9, wy * 2.4 + 5.4) * 0.85 +",
  "    simplex2(wx * 5.2 + 9.0, wy * 5.2 - 1.6) * 0.48 +",
  "    simplex2(wx * 9.8 - 5.5, wy * 9.8 + 6.1) * 0.28 +",
  "    simplex2(wx * 18.5 + 4.7, wy * 18.5 - 3.2) * 0.14",
  "  return [wx + lx + mx + hx, wy + ly + my + hy]",
  "}",
  "",
].join("\n")
c = c.slice(0, commentStart) + newWarp + c.slice(endFn)
const reps = [
  ["if (cellTouchesShore(terrain, worldW, gx, gy, 2)) cells.push({ gx, gy })", "if (cellTouchesShore(terrain, worldW, gx, gy, 4)) cells.push({ gx, gy })"],
  ["if (cellTouchesDirt(terrain, worldW, gx, gy, 2)) cells.push({ gx, gy })", "if (cellTouchesDirt(terrain, worldW, gx, gy, 4)) cells.push({ gx, gy })"],
  ["minX - 1)", "minX - 3)"],
  ["minY - 1)", "minY - 3)"],
  ["maxX + 1)", "maxX + 3)"],
  ["maxY + 1)", "maxY + 3)"],
  ["return signed * 0.78 + fine * 0.28 + shoreWarp(sx * 0.85, sy * 0.85) * 0.7", "return signed * 0.62 + fine * 0.18 + shoreWarp(sx * 0.75, sy * 0.75) * 1.15"],
  ["for (let dy = -5; dy <= 5; dy++)", "for (let dy = -7; dy <= 7; dy++)"],
  ["for (let dx = -5; dx <= 5; dx++)", "for (let dx = -7; dx <= 7; dx++)"],
  ["if (shoreAlpha(f, wx, wy) < 1)", "if (f < 0.5)"],
  ["HARD f>=0.5 water gate + strong vector domain-warp so isocontour leaves tile mid-edges.", "HARD f>=0.5 water gate + WARP_V2_AGGRESSIVE multi-octave domain-warp so isocontour leaves tile mid-edges."],
  ["fbm2(wx * 0.5 + 9.1, wy * 0.5 - 3.4, 4, 2.1, 0.55) * 0.95", "fbm2(wx * 0.42 + 9.1, wy * 0.42 - 3.4, 5, 2.1, 0.55) * 1.45"],
  ["simplex2(wx * 1.45 + 2.2, wy * 1.45 - 7.7) * 0.65", "simplex2(wx * 1.15 + 2.2, wy * 1.15 - 7.7) * 0.95"],
  ["simplex2(wx * 2.9 - 4.4, wy * 2.9 + 1.3) * 0.38", "simplex2(wx * 2.4 - 4.4, wy * 2.4 + 1.3) * 0.55"],
  ["simplex2(wx * 1.55 + 4.4, wy * 1.55 - 2.8) * 0.7 * mid", "simplex2(wx * 1.35 + 4.4, wy * 1.35 - 2.8) * 0.95 * mid"],
  ["simplex2(wx * 3.6 - 1.2, wy * 3.6 + 3.1) * 0.52 * mid", "simplex2(wx * 3.1 - 1.2, wy * 3.1 + 3.1) * 0.72 * mid"],
  ["fbm2(wx * 0.65 + 1.7, wy * 0.65 - 0.9, 4, 2.1, 0.52) * 0.45 * mid", "fbm2(wx * 0.55 + 1.7, wy * 0.55 - 0.9, 5, 2.1, 0.52) * 0.65 * mid"],
  ["simplex2(wx * 8.8 + 2.2, wy * 8.8 - 6.1) * 0.28 * mid", "simplex2(wx * 7.2 + 2.2, wy * 7.2 - 6.1) * 0.38 * mid"],
  ["simplex2(wx * 1.95 + 3.3, wy * 1.95 - 1.8) * 0.5 * mid", "simplex2(wx * 1.55 + 3.3, wy * 1.55 - 1.8) * 0.75 * mid"],
  ["shoreWarp(sx + 2.4, sy + 1.1) * 0.95 * edge", "shoreWarp(sx + 2.4, sy + 1.1) * 1.35 * edge"],
]
for (const [a, b] of reps) {
  const n = c.split(a).length - 1
  out.push("rep " + n + ": " + a.slice(0, 48))
  c = c.split(a).join(b)
}
fs.writeFileSync(p, c, "utf8")
out.push("WARP_V2=" + c.includes("WARP_V2_AGGRESSIVE"))
out.push("amp=" + c.includes("* 3.4"))
out.push("f05=" + c.includes("if (f < 0.5)"))
out.push("pad3=" + (c.split("minX - 3").length - 1))
out.push("touch4=" + (c.split("gy, 4)").length - 1))
fs.writeFileSync(log, out.join("\n"))