import fs from "fs"
const p = "C:/Users/kamel/village-sim-1/simulation_atlas_v1/village_edit/src/lib/render/nature/shorePaint.ts"
let c = fs.readFileSync(p, "utf8")
const out = []

function extract(name) {
  const key = "export function " + name
  const i = c.indexOf(key)
  if (i < 0) return "MISSING " + name
  let brace = 0, started = false, end = -1
  for (let k = i; k < c.length; k++) {
    if (c[k] === "{") { brace++; started = true }
    else if (c[k] === "}") { brace--; if (started && brace === 0) { end = k + 1; break } }
  }
  return c.slice(i, end)
}

fs.writeFileSync(
  "C:/Users/kamel/village-sim-1/simulation_atlas_v1/village_edit/_dump_shore.txt",
  ["====shoreSdf====", extract("shoreSdf"), "====shoreField====", extract("shoreField"), "====shoreAlpha====", extract("shoreAlpha")].join("\n\n")
)

// 1) Hard gate f < 0.5 (not shoreAlpha) in shore strip
const n1 = c.split("if (shoreAlpha(f, wx, wy) < 1)").length - 1
c = c.split("if (shoreAlpha(f, wx, wy) < 1)").join("if (f < 0.5)")
out.push("gate_replaced=" + n1)

// 2) Hard gate f < 0.5 in dirt strip too if using dirtAlpha similarly - check
const nDirt = c.split("if (dirtAlpha(f, wx, wy) < 1)").length - 1
c = c.split("if (dirtAlpha(f, wx, wy) < 1)").join("if (f < 0.5)")
out.push("dirt_gate=" + nDirt)

// 3) Raise BUDGET so chunks never skip at z14 (9*42)^2=142884 ok, but be safer)
c = c.split("const BUDGET = 160_000").join("const BUDGET = 280_000")
out.push("budget280=" + c.includes("280_000"))

// 4) Force step=1 always for strip fidelity at closeup
c = c.split("const step = tileS >= 48 ? 2 : 1").join("const step = tileS >= 64 ? 2 : 1")
out.push("step64=" + (c.split("tileS >= 64").length - 1))

// 5) Stronger shoreField: replace smoothstep range to be tighter around warped SDF so mid-band carve wins
// And boost residual in shoreSdf further
if (c.includes("return signed * 0.62 + fine * 0.18 + shoreWarp(sx * 0.75, sy * 0.75) * 1.15")) {
  c = c.replace(
    "return signed * 0.62 + fine * 0.18 + shoreWarp(sx * 0.75, sy * 0.75) * 1.15",
    "return signed * 0.45 + fine * 0.12 + shoreWarp(sx * 0.7, sy * 0.7) * 1.55"
  )
  out.push("sdf_boost=1")
} else if (c.includes("return signed * 0.78 + fine * 0.28 + shoreWarp(sx * 0.85, sy * 0.85) * 0.7")) {
  c = c.replace(
    "return signed * 0.78 + fine * 0.28 + shoreWarp(sx * 0.85, sy * 0.85) * 0.7",
    "return signed * 0.45 + fine * 0.12 + shoreWarp(sx * 0.7, sy * 0.7) * 1.55"
  )
  out.push("sdf_boost=2")
} else {
  out.push("sdf_boost=0")
}

// 6) Amplify domainWarp further (V3) - scale existing 3.4 -> 4.8
c = c.replace("WARP_V2_AGGRESSIVE", "WARP_V3_ISOCONTOUR")
c = c.replaceAll("fbm2(wx * 0.055, wy * 0.055, 6, 2.05, 0.55) * 3.4", "fbm2(wx * 0.048, wy * 0.048, 6, 2.05, 0.55) * 4.8")
c = c.replaceAll("fbm2(wx * 0.055 + 37.1, wy * 0.055 - 19.4, 6, 2.05, 0.55) * 3.4", "fbm2(wx * 0.048 + 37.1, wy * 0.048 - 19.4, 6, 2.05, 0.55) * 4.8")
c = c.replaceAll("fbm2(wx * 0.12 + 19.7, wy * 0.12 - 8.3, 5, 2.1, 0.52) * 1.65", "fbm2(wx * 0.11 + 19.7, wy * 0.11 - 8.3, 5, 2.1, 0.52) * 2.2")
c = c.replaceAll("fbm2(wx * 0.12 - 22.4, wy * 0.12 + 14.6, 5, 2.1, 0.52) * 1.65", "fbm2(wx * 0.11 - 22.4, wy * 0.11 + 14.6, 5, 2.1, 0.52) * 2.2")
out.push("v3=" + c.includes("WARP_V3_ISOCONTOUR"))
out.push("amp48=" + c.includes("* 4.8"))

// 7) Expand SDF hunt for larger warp
c = c.replaceAll("for (let dy = -7; dy <= 7; dy++)", "for (let dy = -9; dy <= 9; dy++)")
c = c.replaceAll("for (let dx = -7; dx <= 7; dx++)", "for (let dx = -9; dx <= 9; dx++)")

// 8) Pad ±4 for strip AABB
c = c.replaceAll("minX - 3)", "minX - 4)")
c = c.replaceAll("minY - 3)", "minY - 4)")
c = c.replaceAll("maxX + 3)", "maxX + 4)")
c = c.replaceAll("maxY + 3)", "maxY + 4)")

// 9) Header marker
c = c.replace("WARP_V2_AGGRESSIVE multi-octave", "WARP_V3_ISOCONTOUR multi-octave")

fs.writeFileSync(p, c, "utf8")
out.push("f05=" + c.includes("if (f < 0.5)"))
out.push("shoreAlpha_gate=" + c.includes("if (shoreAlpha(f, wx, wy) < 1)"))
fs.writeFileSync("C:/Users/kamel/village-sim-1/simulation_atlas_v1/village_edit/_patch_log.txt", out.join("\n"))