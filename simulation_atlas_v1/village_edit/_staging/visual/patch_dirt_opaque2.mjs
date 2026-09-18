import fs from "fs"

const p = "src/lib/render/nature/shorePaint.ts"
let t = fs.readFileSync(p, "utf8")

// 1) dirtSdf: keep strong warp, stop swiss-cheese blob carve inside parcels
t = t.replace(
  `  const blob = dirtBlob(wx, wy)
  const signed = here ? Math.max(0.015, best) : -Math.max(0.015, best)
  return signed * 0.42 + (bil - 0.5) * 0.22 + (blob - 0.5) * 1.55 + shoreWarp(sx + 2.4, sy + 1.1) * 0.72`,
  `  const blob = dirtBlob(wx, wy)
  const signed = here ? Math.max(0.015, best) : -Math.max(0.015, best)
  // Edge-only blob: full interior stays opaque dirt (eye-QA FAIL was spray/holes + stair silhouette).
  const edge = Math.max(0, 1 - Math.abs(signed) * 1.35)
  return (
    signed * 0.55 +
    (bil - 0.5) * 0.28 +
    (blob - 0.5) * 0.38 * edge +
    shoreWarp(sx + 2.4, sy + 1.1) * 0.85 * edge
  )`,
)

// 2) dirtField: bias opaque inside dirt
t = t.replace(
  `export function dirtField(terrain: Uint8Array, worldW: number, wx: number, wy: number): number {
  return smoothstep(-0.95, 0.95, dirtSdf(terrain, worldW, wx, wy))
}`,
  `export function dirtField(terrain: Uint8Array, worldW: number, wx: number, wy: number): number {
  // Asymmetric: snap to cover faster inside dirt, soft falloff into grass (Puny/Stardew blob).
  return smoothstep(-1.05, 0.55, dirtSdf(terrain, worldW, wx, wy))
}`,
)

// 3) denser dirt strip via optional densityScale on paintOpaqueLerpStrip
if (!t.includes("densityScale?: number")) {
  t = t.replace(
    `  maskLo?: number,
  maskHi?: number,
) {
  const span = 1 + pad * 2
  const n = Math.max(20, Math.min(44, Math.round(tileS * span * 1.05)))`,
    `  maskLo?: number,
  maskHi?: number,
  densityScale = 1,
) {
  const span = 1 + pad * 2
  const n = Math.max(18, Math.min(48, Math.round(tileS * span * 0.95 * densityScale)))`,
  )
}

// Dirt patch: opaque-biased softstep + density 1.35
t = t.replace(
  `tileS, land, cover, 0.06, 0.62, DIRT_PAD,`,
  `tileS, land, cover, 0.02, 0.42, DIRT_PAD,`,
)
// Ensure densityScale arg on dirt patch call — read current call block
const dirtCall = `paintOpaqueLerpStrip(
    ctx,
    (wx, wy) => dirtField(terrain, worldW, wx, wy),
    gx, gy, px, py, tileS, land, cover, 0.02, 0.42, DIRT_PAD,`
if (t.includes(dirtCall) && !t.includes("0.02, 0.42, DIRT_PAD,\n    (wx, wy) => simplex2")) {
  // leave tint line as-is; append density after tint if needed below
}

// Rewrite paintOrganicDirtPatch strip invocation cleanly
t = t.replace(
  /paintOpaqueLerpStrip\(\s*ctx,\s*\(wx, wy\) => dirtField\(terrain, worldW, wx, wy\),\s*gx, gy, px, py, tileS, land, cover, 0\.02, 0\.42, DIRT_PAD,[\s\S]*?\n  \)/,
  `paintOpaqueLerpStrip(
    ctx,
    (wx, wy) => dirtField(terrain, worldW, wx, wy),
    gx, gy, px, py, tileS, land, cover, 0.02, 0.42, DIRT_PAD,
    (wx, wy) => simplex2(wx * 2.4, wy * 2.4) * 6,
    undefined,
    undefined,
    1.35,
  )`,
)

t = t.replace(
  /paintOpaqueLerpStrip\(\s*ctx,\s*\(wx, wy\) => dirtField\(terrain, worldW, wx, wy\),\s*gx, gy, px, py, tileS, land, grazed, 0\.10, 0\.72, DIRT_PAD, undefined, 0\.04, 0\.98,?/,
  `paintOpaqueLerpStrip(
    ctx,
    (wx, wy) => dirtField(terrain, worldW, wx, wy),
    gx, gy, px, py, tileS, land, grazed, 0.08, 0.55, DIRT_PAD, undefined, 0.06, 0.92,
    1.2,
  `,
)

// Shore: wider soft bands for water continuity
t = t.replace(
  `paintOpaqueLerpStrip(ctx, field, gx, gy, px, py, tileS, land, water, 0.08, 0.5, SHORE_PAD, (wx, wy) => simplex2(wx * 2.2, wy * 2.2) * 5)
  paintOpaqueLerpStrip(ctx, field, gx, gy, px, py, tileS, water, deep, 0.45, 0.9, SHORE_PAD)`,
  `paintOpaqueLerpStrip(ctx, field, gx, gy, px, py, tileS, land, water, 0.02, 0.58, SHORE_PAD, (wx, wy) => simplex2(wx * 2.2, wy * 2.2) * 5, undefined, undefined, 1.15)
  paintOpaqueLerpStrip(ctx, field, gx, gy, px, py, tileS, water, deep, 0.38, 0.92, SHORE_PAD, undefined, undefined, undefined, 1.0)`,
)

t = t.replace(
  /paintOpaqueLerpStrip\(\s*ctx,\s*\(wx, wy\) => shoreField(?:Fast)?\(terrain, worldW, wx, wy\),\s*gx, gy, px, py, tileS, land, water, 0\.06, 0\.55, SHORE_PAD,?\s*\)/,
  `paintOpaqueLerpStrip(
    ctx,
    (wx, wy) => shoreField(terrain, worldW, wx, wy),
    gx, gy, px, py, tileS, land, water, 0.02, 0.62, SHORE_PAD,
    undefined, undefined, undefined, 1.15,
  )`,
)

fs.writeFileSync(p, t, "utf8")

// Validate syntax-ish + signatures
const out = fs.readFileSync(p, "utf8")
const checks = {
  edgeBlob: out.includes("Edge-only blob"),
  fieldBias: out.includes("smoothstep(-1.05, 0.55"),
  densityParam: out.includes("densityScale = 1"),
  dirtDense: out.includes("1.35,"),
  shoreWider: out.includes("0.02, 0.58, SHORE_PAD"),
}
console.log(JSON.stringify(checks, null, 2))

// Show paintOrganicDirtPatch block
const i = out.indexOf("export function paintOrganicDirtPatch")
console.log(out.slice(i, i + 900))
