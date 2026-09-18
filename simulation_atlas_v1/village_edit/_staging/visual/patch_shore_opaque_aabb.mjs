import fs from "fs"

const p = "src/lib/render/nature/shorePaint.ts"
let t = fs.readFileSync(p, "utf8")
if (!t.includes("Shore AABB only")) {
  throw new Error("unexpected shorePaint shape - abort to avoid fight")
}

const shoreHole = "        if (!on) {\n          data[o + 3] = 0\n          continue\n        }\n        const f = shoreField(terrain, worldW, wx, wy)\n        const tint = simplex2(wx * 2.05, wy * 2.05) * 4"

const shoreOpaque = [
  "        const f = shoreField(terrain, worldW, wx, wy)",
  "        const tint = simplex2(wx * 2.05, wy * 2.05) * 4",
  "        // Off-band inside AABB still opaque (covers world-buffer stairs; no alpha holes).",
  "        if (!on) {",
  "          const w1 = smoothstep(0.02, 0.5, f)",
  "          const w2 = smoothstep(0.45, 0.9, f)",
  "          const r0 = land[0] * (1 - w1) + water[0] * w1",
  "          const g0 = land[1] * (1 - w1) + water[1] * w1",
  "          const b0 = land[2] * (1 - w1) + water[2] * w1",
  "          data[o] = Math.max(0, Math.min(255, (r0 * (1 - w2) + deep[0] * w2 + tint) | 0))",
  "          data[o + 1] = Math.max(0, Math.min(255, (g0 * (1 - w2) + deep[1] * w2 + tint * 0.7) | 0))",
  "          data[o + 2] = Math.max(0, Math.min(255, (b0 * (1 - w2) + deep[2] * w2 + tint * 0.45) | 0))",
  "          data[o + 3] = 255",
  "          continue",
  "        }",
].join("\n")

if (!t.includes(shoreHole)) {
  const i = t.indexOf("if (!on)")
  console.error("shore pattern miss", JSON.stringify(t.slice(i, i + 220)))
  throw new Error("shore pattern mismatch")
}
t = t.replace(shoreHole, shoreOpaque)

const dirtHole = "        if (!on) {\n          data[o + 3] = 0\n          continue\n        }\n        const f = dirtField(terrain, worldW, wx, wy)\n        const w = smoothstep(0.05, 0.52, f)\n        if (w < 0.04) {\n          data[o + 3] = 0\n          continue\n        }"

const dirtOpaque = [
  "        const f = dirtField(terrain, worldW, wx, wy)",
  "        const w = smoothstep(0.05, 0.52, f)",
  "        // Opaque AABB overwrite - low field = opaque grass, never alpha hole.",
  "        if (!on || w < 0.04) {",
  "          const ww = !on ? 0 : w",
  "          const tint0 = simplex2(wx * 2.5, wy * 2.5) * 6",
  "          data[o] = Math.max(0, Math.min(255, (land[0] * (1 - ww) + dirtCol[0] * ww + tint0) | 0))",
  "          data[o + 1] = Math.max(0, Math.min(255, (land[1] * (1 - ww) + dirtCol[1] * ww + tint0 * 0.7) | 0))",
  "          data[o + 2] = Math.max(0, Math.min(255, (land[2] * (1 - ww) + dirtCol[2] * ww + tint0 * 0.45) | 0))",
  "          data[o + 3] = 255",
  "          continue",
  "        }",
].join("\n")

if (!t.includes(dirtHole)) {
  const i = t.lastIndexOf("if (!on)")
  console.error("dirt pattern miss", JSON.stringify(t.slice(i, i + 280)))
  throw new Error("dirt pattern mismatch")
}
t = t.replace(dirtHole, dirtOpaque)

const densOld = "const target = Math.min(280, Math.max(64, Math.round(Math.sqrt(cellsX * cellsY) * 18)))\n  const dw = Math.max(48, Math.min(target, Math.round(cellsX * 6)))\n  const dh = Math.max(48, Math.min(target, Math.round(cellsY * 6)))"
const densNew = "const target = Math.min(320, Math.max(72, Math.round(Math.sqrt(cellsX * cellsY) * 22)))\n  const dw = Math.max(56, Math.min(target, Math.round(cellsX * 8)))\n  const dh = Math.max(56, Math.min(target, Math.round(cellsY * 8)))"
if (!t.includes(densOld)) {
  console.warn("density already changed or mismatch - skip densify")
} else {
  t = t.replace(densOld, densNew)
}

fs.writeFileSync(p, t, "utf8")
console.log("ok", {
  opaqueShore: t.includes("Off-band inside AABB still opaque"),
  opaqueDirt: t.includes("Opaque AABB overwrite"),
  denser: t.includes("cellsX * 8"),
  size: fs.statSync(p).size,
})