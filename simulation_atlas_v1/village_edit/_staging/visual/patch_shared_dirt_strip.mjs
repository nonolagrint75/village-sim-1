import fs from "fs"

const p = "src/lib/render/nature/shorePaint.ts"
let t = fs.readFileSync(p, "utf8")

// Slim per-cell pads — shared viewport strip owns continuous opaque dirt/shore.
t = t.replace(/const SHORE_PAD = [0-9.]+/, "const SHORE_PAD = 0.42")
t = t.replace(/const DIRT_PAD = [0-9.]+/, "const DIRT_PAD = 0.4")
t = t.replace(
  /const n = Math\.max\(18, Math\.min\(48, Math\.round\(tileS \* span \* 0\.95 \* densityScale\)\)\)/,
  "const n = Math.max(10, Math.min(22, Math.round(tileS * span * 0.55 * densityScale)))",
)

const stripImpl = `
let _stripTmp: HTMLCanvasElement | null = null
function stripCanvas(w: number, h: number): CanvasRenderingContext2D {
  if (!_stripTmp || _stripTmp.width < w || _stripTmp.height < h) {
    _stripTmp = document.createElement("canvas")
    _stripTmp.width = Math.max(w, 64)
    _stripTmp.height = Math.max(h, 64)
  } else {
    _stripTmp.width = Math.max(w, 1)
    _stripTmp.height = Math.max(h, 1)
  }
  return _stripTmp.getContext("2d")!
}

function cellTouchesDirt(terrain: Uint8Array, worldW: number, gx: number, gy: number): boolean {
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const x = gx + dx
      const y = gy + dy
      if (x < 0 || y < 0 || x >= worldW || y >= worldW) continue
      if (isDirtOrSand(terrain[y * worldW + x]!)) return true
    }
  }
  return false
}

function cellTouchesShore(terrain: Uint8Array, worldW: number, gx: number, gy: number): boolean {
  const here = isWaterCell(terrain, worldW, gx, gy)
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (dx === 0 && dy === 0) continue
      if (isWaterCell(terrain, worldW, gx + dx, gy + dy) !== here) return true
    }
  }
  return false
}

/**
 * Continuous opaque dirt strip across near-dirt AABB (one ImageData — no per-cell stairs).
 */
export function paintViewportDirtStrip(
  ctx: CanvasRenderingContext2D,
  atlas: AtlasColor,
  terrain: Uint8Array,
  worldW: number,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  camX: number,
  camY: number,
  zoom: number,
  tilePx: number,
) {
  const tileS = tilePx * zoom
  if (tileS < 5.5) return
  let minX = x1, minY = y1, maxX = x0, maxY = y0
  let any = false
  for (let gy = y0; gy <= y1; gy++) {
    for (let gx = x0; gx <= x1; gx++) {
      if (!cellTouchesDirt(terrain, worldW, gx, gy)) continue
      any = true
      if (gx < minX) minX = gx
      if (gy < minY) minY = gy
      if (gx > maxX) maxX = gx
      if (gy > maxY) maxY = gy
    }
  }
  if (!any) return
  minX = Math.max(x0, minX - 1)
  minY = Math.max(y0, minY - 1)
  maxX = Math.min(x1, maxX + 1)
  maxY = Math.min(y1, maxY + 1)
  const cellsW = maxX - minX + 1
  const cellsH = maxY - minY + 1
  // ~6 samples/cell — dense enough to kill rect stairs, cheap vs per-cell pad storm.
  const ppc = Math.max(5, Math.min(8, Math.round(tileS / 10)))
  const pw = cellsW * ppc
  const ph = cellsH * ppc
  if (pw * ph > 280_000) return
  const land = rgbFromPacked(atlas.color32("grass"), [58, 90, 38])
  const cover = rgbFromPacked(atlas.color32("grass_grazed"), [118, 92, 52])
  const sand = rgbFromPacked(atlas.color32("sand"), [210, 186, 118])
  const img = stripCanvas(pw, ph).createImageData(pw, ph)
  const data = img.data
  for (let j = 0; j < ph; j++) {
    for (let i = 0; i < pw; i++) {
      const wx = minX + (i + 0.5) / ppc
      const wy = minY + (j + 0.5) / ppc
      const f = dirtField(terrain, worldW, wx, wy)
      if (f <= 0.04) continue
      const w = smoothstep(0.04, 0.38, f)
      // Coastal sand bias near water
      const sf = shoreFieldFast(terrain, worldW, wx, wy)
      const useSand = sf > 0.22 && f > 0.2
      const c0 = land
      const c1 = useSand ? sand : cover
      const o = (j * pw + i) * 4
      data[o] = Math.max(0, Math.min(255, (c0[0] * (1 - w) + c1[0] * w) | 0))
      data[o + 1] = Math.max(0, Math.min(255, (c0[1] * (1 - w) + c1[1] * w + w * 2) | 0))
      data[o + 2] = Math.max(0, Math.min(255, (c0[2] * (1 - w) + c1[2] * w + w * 1) | 0))
      data[o + 3] = (smoothstep(0.04, 0.18, f) * 255) | 0
    }
  }
  const sctx = stripCanvas(pw, ph)
  sctx.putImageData(img, 0, 0)
  const dx = minX * tileS - camX * zoom
  const dy = minY * tileS - camY * zoom
  ctx.save()
  ctx.imageSmoothingEnabled = true
  ctx.globalAlpha = 1
  ctx.drawImage(sctx.canvas, 0, 0, pw, ph, dx, dy, cellsW * tileS, cellsH * tileS)
  ctx.restore()
}

/**
 * Continuous opaque shore strip — land/water softstep across shared AABB.
 */
export function paintViewportShoreStrip(
  ctx: CanvasRenderingContext2D,
  atlas: AtlasColor,
  terrain: Uint8Array,
  worldW: number,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  camX: number,
  camY: number,
  zoom: number,
  tilePx: number,
) {
  const tileS = tilePx * zoom
  if (tileS < 5.5) return
  let minX = x1, minY = y1, maxX = x0, maxY = y0
  let any = false
  for (let gy = y0; gy <= y1; gy++) {
    for (let gx = x0; gx <= x1; gx++) {
      if (!cellTouchesShore(terrain, worldW, gx, gy)) continue
      any = true
      if (gx < minX) minX = gx
      if (gy < minY) minY = gy
      if (gx > maxX) maxX = gx
      if (gy > maxY) maxY = gy
    }
  }
  if (!any) return
  minX = Math.max(x0, minX - 1)
  minY = Math.max(y0, minY - 1)
  maxX = Math.min(x1, maxX + 1)
  maxY = Math.min(y1, maxY + 1)
  const cellsW = maxX - minX + 1
  const cellsH = maxY - minY + 1
  const ppc = Math.max(5, Math.min(8, Math.round(tileS / 10)))
  const pw = cellsW * ppc
  const ph = cellsH * ppc
  if (pw * ph > 320_000) return
  const land = rgbFromPacked(atlas.color32("grass"), [58, 90, 38])
  const water = rgbFromPacked(atlas.color32("water"), [36, 88, 104])
  const deep = rgbFromPacked(atlas.color32("water_deep"), [28, 68, 92])
  const img = stripCanvas(pw, ph).createImageData(pw, ph)
  const data = img.data
  for (let j = 0; j < ph; j++) {
    for (let i = 0; i < pw; i++) {
      const wx = minX + (i + 0.5) / ppc
      const wy = minY + (j + 0.5) / ppc
      const f = shoreField(terrain, worldW, wx, wy)
      // Always paint near coast so world-buffer stairs cannot show through holes.
      const w = smoothstep(0.02, 0.55, f)
      const deepW = smoothstep(0.45, 0.92, f)
      const o = (j * pw + i) * 4
      const r0 = land[0] * (1 - w) + water[0] * w
      const g0 = land[1] * (1 - w) + water[1] * w
      const b0 = land[2] * (1 - w) + water[2] * w
      data[o] = Math.max(0, Math.min(255, (r0 * (1 - deepW) + deep[0] * deepW) | 0))
      data[o + 1] = Math.max(0, Math.min(255, (g0 * (1 - deepW) + deep[1] * deepW) | 0))
      data[o + 2] = Math.max(0, Math.min(255, (b0 * (1 - deepW) + deep[2] * deepW) | 0))
      data[o + 3] = 255
    }
  }
  const sctx = stripCanvas(pw, ph)
  sctx.putImageData(img, 0, 0)
  const dx = minX * tileS - camX * zoom
  const dy = minY * tileS - camY * zoom
  ctx.save()
  ctx.imageSmoothingEnabled = true
  ctx.drawImage(sctx.canvas, 0, 0, pw, ph, dx, dy, cellsW * tileS, cellsH * tileS)
  ctx.restore()
}
`

// Replace no-op exports with real implementations
t = t.replace(
  /export function paintViewportShoreStrip\([\s\S]*?\n\}\n\nexport function paintViewportDirtStrip\([\s\S]*?\n\}\n?/,
  stripImpl.trim() + "\n",
)

fs.writeFileSync(p, t, "utf8")

// Verify
const out = fs.readFileSync(p, "utf8")
const { execSync } = require("child_process")
try {
  execSync("npx esbuild src/lib/render/nature/shorePaint.ts --bundle --outfile=NUL --format=esm --log-level=error", {
    stdio: "pipe",
  })
  console.log("esbuild_ok")
} catch (e) {
  console.log("esbuild_fail", (e.stderr && e.stderr.toString().slice(0, 1000)) || e.message)
}
console.log({
  shorePad: (out.match(/SHORE_PAD = [0-9.]+/) || [])[0],
  dirtPad: (out.match(/DIRT_PAD = [0-9.]+/) || [])[0],
  hasDirtStrip: out.includes("Continuous opaque dirt strip"),
  hasShoreStrip: out.includes("Continuous opaque shore strip"),
  slimN: out.includes("Math.min(22"),
  noopGone: !out.includes("Ground-pass organic dirt owns parcels now"),
})
