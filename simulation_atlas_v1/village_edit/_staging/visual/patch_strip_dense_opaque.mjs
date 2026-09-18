import fs from "fs"

// draw.ts: skip heavy per-cell organic on DIRT/WATER — shared strip owns continuous paint
const drawPath = "src/lib/render/nature/draw.ts"
let d = fs.readFileSync(drawPath, "utf8")

d = d.replace(
  `        if (t === SAND && waterNear) {
          paintCoastalSand(ctx, atlas, terrain, worldW, gx, gy, px, py, tileS, () => {})
        } else {
          paintOrganicDirtPatch(ctx, atlas, terrain, worldW, gx, gy, px, py, tileS, () => {}, coverKey)
          if (waterNear) {
            paintLandShoreFringe(ctx, atlas, terrain, worldW, gx, gy, px, py, tileS)
          }
        }`,
  `        // Shared viewport dirt/shore strips own continuous edges (per-cell organic = stairs + FPS).
        void waterNear
        void coverKey
        void paintCoastalSand
        void paintOrganicDirtPatch
        void paintLandShoreFringe`,
)

d = d.replace(
  `          atlas.blit(ctx, landKey, px, py, tileS, tileS)
          paintOrganicShoreWater(ctx, atlas, terrain, worldW, gx, gy, px, py, tileS, () => {})`,
  `          atlas.blit(ctx, landKey, px, py, tileS, tileS)
          // Shore strip paints continuous water; skip per-cell organic.`,
)

d = d.replace(
  `        if (waterN >= 1 || waterDiag >= 1 || shoreFieldFast(terrain, worldW, gx + 0.5, gy + 0.5) > 0.14) {
          paintLandShoreFringe(ctx, atlas, terrain, worldW, gx, gy, px, py, tileS)
        }
        paintDirtBleedOnGrass(ctx, atlas, terrain, worldW, gx, gy, px, py, tileS)`,
  `        // Fringe/bleed owned by shared viewport strips.`,
)

d = d.replace(
  `  // Viewport ImageData strips are no-ops — organic coast/dirt painted in ground pass above.`,
  `  // Shared continuous strips (opaque SDF) — kill per-cell Manhattan stairs.`,
)

fs.writeFileSync(drawPath, d, "utf8")

// shorePaint: denser strip + fully opaque dirt coverage
const p = "src/lib/render/nature/shorePaint.ts"
let t = fs.readFileSync(p, "utf8")
t = t.replace(
  /const ppc = Math\.max\(5, Math\.min\(8, Math\.round\(tileS \/ 10\)\)\)/g,
  "const ppc = Math.max(8, Math.min(14, Math.round(tileS / 6)))",
)
t = t.replace(/if \(pw \* ph > 280_000\) return/g, "if (pw * ph > 420_000) return")
t = t.replace(/if \(pw \* ph > 320_000\) return/g, "if (pw * ph > 420_000) return")
// Dirt alpha: opaque sooner
t = t.replace(
  "data[o + 3] = (smoothstep(0.04, 0.18, f) * 255) | 0",
  "data[o + 3] = f > 0.08 ? 255 : (smoothstep(0.02, 0.08, f) * 255) | 0",
)
// Stronger dirt warp once more
t = t.replace(
  "const warp = shoreWarp(wx * 0.48 + 17.3, wy * 0.48 + 9.1) * 2.15\n  const warpY = shoreWarp(wy * 0.48 + 9.1, wx * 0.48 + 17.3) * 2.15",
  "const warp = shoreWarp(wx * 0.42 + 17.3, wy * 0.42 + 9.1) * 2.85\n  const warpY = shoreWarp(wy * 0.42 + 9.1, wx * 0.42 + 17.3) * 2.85",
)

fs.writeFileSync(p, t, "utf8")

const { execSync } = await import("child_process")
try {
  execSync("npx esbuild src/lib/render/nature/shorePaint.ts src/lib/render/nature/draw.ts --bundle --outfile=NUL --format=esm --log-level=error", { stdio: "pipe" })
  console.log("esbuild_ok")
} catch (e) {
  console.log("esbuild_fail", e.stderr?.toString?.().slice(0, 1500) || e.message)
}
console.log({
  ppc: t.includes("tileS / 6"),
  opaqueDirt: t.includes("f > 0.08 ? 255"),
  warp285: t.includes("* 2.85"),
  drawSkip: d.includes("Shared viewport dirt/shore strips own"),
})
