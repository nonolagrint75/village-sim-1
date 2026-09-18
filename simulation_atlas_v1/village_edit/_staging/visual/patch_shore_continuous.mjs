import fs from "fs"

const p = "src/lib/render/nature/shorePaint.ts"
let t = fs.readFileSync(p, "utf8")

// Stronger domain warp so SDF zero-set is not locked to cell stairs.
t = t.replace(
  `function shoreWarp(wx: number, wy: number): number {
  return (
    fbm2(wx * 0.32, wy * 0.32, 4, 2.05, 0.52) * 0.85 +
    simplex2(wx * 1.15 + 8.3, wy * 1.15) * 0.45 +
    simplex2(wx * 2.6 - 3.1, wy * 2.6 + 1.7) * 0.22
  )
}`,
  `function shoreWarp(wx: number, wy: number): number {
  return (
    fbm2(wx * 0.22, wy * 0.22, 5, 2.1, 0.55) * 1.55 +
    simplex2(wx * 0.85 + 8.3, wy * 0.85) * 0.85 +
    simplex2(wx * 1.9 - 3.1, wy * 1.9 + 1.7) * 0.45 +
    simplex2(wx * 3.4 + 2.2, wy * 3.4 - 1.1) * 0.22
  )
}`,
)

t = t.replace(
  "const warp = shoreWarp(wx * 0.55, wy * 0.55) * 1.45\n  const warpY = shoreWarp(wy * 0.55 + 6.1, wx * 0.55) * 1.45",
  "const warp = shoreWarp(wx * 0.45, wy * 0.45) * 2.15\n  const warpY = shoreWarp(wy * 0.45 + 6.1, wx * 0.45) * 2.15",
)

t = t.replace(
  "return smoothstep(-0.85, 0.95, shoreSdf(terrain, worldW, wx, wy))",
  "return smoothstep(-1.25, 1.15, shoreSdf(terrain, worldW, wx, wy))",
)

const a = t.indexOf("export function paintViewportShoreStrip")
if (a < 0) throw new Error("no shore strip")

const rest = [
  "export function paintViewportShoreStrip(",
  "  ctx: CanvasRenderingContext2D,",
  "  atlas: AtlasColor,",
  "  terrain: Uint8Array,",
  "  worldW: number,",
  "  x0: number,",
  "  y0: number,",
  "  x1: number,",
  "  y1: number,",
  "  camX: number,",
  "  camY: number,",
  "  zoom: number,",
  "  tilePx: number,",
  ") {",
  "  const tileS = tilePx * zoom",
  '  const land = rgbFromPacked(atlas.color32("grass"), [58, 90, 38])',
  '  const water = rgbFromPacked(atlas.color32("water"), [36, 88, 104])',
  '  const deep = rgbFromPacked(atlas.color32("water_deep"), [28, 68, 92])',
  "  // Continuous shore-band raster (world space) — not per-cell seed fills.",
  "  const step = Math.max(1.15, Math.min(3.2, tileS / 10))",
  "  const near = (gx: number, gy: number) => {",
  "    let w = 0",
  "    let l = 0",
  "    for (let dy = -2; dy <= 2; dy++) {",
  "      for (let dx = -2; dx <= 2; dx++) {",
  "        const x = gx + dx",
  "        const y = gy + dy",
  "        if (x < 0 || y < 0 || x >= worldW || y >= worldW) continue",
  "        if (terrain[y * worldW + x] === WATER) w++",
  "        else l++",
  "      }",
  "    }",
  "    return w >= 1 && l >= 1",
  "  }",
  "  ctx.globalAlpha = 1",
  "  for (let gy = y0; gy < y1; gy++) {",
  "    for (let gx = x0; gx < x1; gx++) {",
  "      if (!near(gx, gy) && terrain[gy * worldW + gx] !== WATER) {",
  "        // Still paint land cells that touch water in 3-ring.",
  "        let touch = false",
  "        for (let dy = -3; dy <= 3 && !touch; dy++) {",
  "          for (let dx = -3; dx <= 3; dx++) {",
  "            const x = gx + dx",
  "            const y = gy + dy",
  "            if (x < 0 || y < 0 || x >= worldW || y >= worldW) continue",
  "            if (terrain[y * worldW + x] === WATER) { touch = true; break }",
  "          }",
  "        }",
  "        if (!touch) continue",
  "      } else if (terrain[gy * worldW + gx] === WATER) {",
  "        let touchL = false",
  "        for (let dy = -3; dy <= 3 && !touchL; dy++) {",
  "          for (let dx = -3; dx <= 3; dx++) {",
  "            const x = gx + dx",
  "            const y = gy + dy",
  "            if (x < 0 || y < 0 || x >= worldW || y >= worldW) continue",
  "            if (terrain[y * worldW + x] !== WATER) { touchL = true; break }",
  "          }",
  "        }",
  "        if (!touchL) continue",
  "      }",
  "      const px0 = (gx * tilePx - camX) * zoom",
  "      const py0 = (gy * tilePx - camY) * zoom",
  "      for (let oy = -0.55 * tileS; oy < tileS + 0.55 * tileS; oy += step) {",
  "        for (let ox = -0.55 * tileS; ox < tileS + 0.55 * tileS; ox += step) {",
  "          const wx = gx + (ox + step * 0.5) / tileS",
  "          const wy = gy + (oy + step * 0.5) / tileS",
  "          const f = shoreField(terrain, worldW, wx, wy)",
  "          if (f < 0.02 || f > 0.985) continue",
  "          const w1 = smoothstep(0.04, 0.55, f)",
  "          const w2 = smoothstep(0.48, 0.92, f)",
  "          const r0 = land[0] * (1 - w1) + water[0] * w1",
  "          const g0 = land[1] * (1 - w1) + water[1] * w1",
  "          const b0 = land[2] * (1 - w1) + water[2] * w1",
  "          const tint = simplex2(wx * 2.1, wy * 2.1) * 4",
  "          const r = Math.max(0, Math.min(255, (r0 * (1 - w2) + deep[0] * w2 + tint) | 0))",
  "          const g = Math.max(0, Math.min(255, (g0 * (1 - w2) + deep[1] * w2 + tint * 0.7) | 0))",
  "          const b = Math.max(0, Math.min(255, (b0 * (1 - w2) + deep[2] * w2 + tint * 0.45) | 0))",
  '          ctx.fillStyle = "rgb(" + r + "," + g + "," + b + ")"',
  "          ctx.fillRect(px0 + ox - 0.2, py0 + oy - 0.2, step + 0.55, step + 0.55)",
  "        }",
  "      }",
  "    }",
  "  }",
  "}",
  "",
  "export function paintViewportDirtStrip(",
  "  ctx: CanvasRenderingContext2D,",
  "  atlas: AtlasColor,",
  "  terrain: Uint8Array,",
  "  worldW: number,",
  "  x0: number,",
  "  y0: number,",
  "  x1: number,",
  "  y1: number,",
  "  camX: number,",
  "  camY: number,",
  "  zoom: number,",
  "  tilePx: number,",
  ") {",
  "  const tileS = tilePx * zoom",
  '  const land = rgbFromPacked(atlas.color32("grass"), [58, 90, 38])',
  '  const dirtCol = rgbFromPacked(atlas.color32("grass_grazed"), [118, 92, 52])',
  '  const sand = rgbFromPacked(atlas.color32("sand"), [210, 186, 118])',
  "  const step = Math.max(1.15, Math.min(3.2, tileS / 10))",
  "  const nearDirt = (gx: number, gy: number): boolean => {",
  "    for (let dy = -3; dy <= 3; dy++) {",
  "      for (let dx = -3; dx <= 3; dx++) {",
  "        const x = gx + dx",
  "        const y = gy + dy",
  "        if (x < 0 || y < 0 || x >= worldW || y >= worldW) continue",
  "        if (isDirtOrSand(terrain[y * worldW + x]!)) return true",
  "      }",
  "    }",
  "    return false",
  "  }",
  "  ctx.globalAlpha = 1",
  "  for (let gy = y0; gy < y1; gy++) {",
  "    for (let gx = x0; gx < x1; gx++) {",
  "      if (!nearDirt(gx, gy)) continue",
  "      const px0 = (gx * tilePx - camX) * zoom",
  "      const py0 = (gy * tilePx - camY) * zoom",
  "      const cell = terrain[gy * worldW + gx]!",
  "      const cover = cell === SAND ? sand : dirtCol",
  "      for (let oy = -0.5 * tileS; oy < tileS + 0.5 * tileS; oy += step) {",
  "        for (let ox = -0.5 * tileS; ox < tileS + 0.5 * tileS; ox += step) {",
  "          const wx = gx + (ox + step * 0.5) / tileS",
  "          const wy = gy + (oy + step * 0.5) / tileS",
  "          const f = dirtField(terrain, worldW, wx, wy)",
  "          if (f < 0.04) continue",
  "          const w = smoothstep(0.06, 0.58, f)",
  "          if (w < 0.02) continue",
  "          const tint = simplex2(wx * 2.6, wy * 2.6) * 7",
  "          const r = Math.max(0, Math.min(255, (land[0] * (1 - w) + cover[0] * w + tint) | 0))",
  "          const g = Math.max(0, Math.min(255, (land[1] * (1 - w) + cover[1] * w + tint * 0.7) | 0))",
  "          const b = Math.max(0, Math.min(255, (land[2] * (1 - w) + cover[2] * w + tint * 0.45) | 0))",
  '          ctx.fillStyle = "rgb(" + r + "," + g + "," + b + ")"',
  "          ctx.fillRect(px0 + ox - 0.2, py0 + oy - 0.2, step + 0.55, step + 0.55)",
  "        }",
  "      }",
  "    }",
  "  }",
  "}",
  "",
].join("\n")

t = t.slice(0, a) + rest
fs.writeFileSync(p, t, "utf8")
const c = fs.readFileSync(p, "utf8")
console.log({
  cont: c.includes("Continuous shore-band raster"),
  warp215: c.includes("* 2.15"),
  size: c.length,
  bom: fs.readFileSync(p)[0],
})
