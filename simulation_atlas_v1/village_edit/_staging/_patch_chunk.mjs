import fs from "fs"
const path = "src/lib/render/nature/shorePaint.ts"
let t = fs.readFileSync(path, "utf8")

const start = t.indexOf("export function paintViewportShoreStrip")
const end = t.indexOf("export function paintViewportDirtStrip")
if (start < 0 || end < 0) { console.error("bounds"); process.exit(1) }

const fn = `export function paintViewportShoreStrip(
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
  // True edge only (r=1) — r=3 AABB at z14 blew the pixel budget and early-returned (light-blue Manhattan underlay).
  const cells: { gx: number; gy: number }[] = []
  for (let gy = y0; gy <= y1; gy++) {
    for (let gx = x0; gx <= x1; gx++) {
      if (cellTouchesShore(terrain, worldW, gx, gy, 1)) cells.push({ gx, gy })
    }
  }
  if (!cells.length) return
  let minX = cells[0]!.gx, maxX = minX, minY = cells[0]!.gy, maxY = minY
  for (const c of cells) {
    if (c.gx < minX) minX = c.gx
    if (c.gy < minY) minY = c.gy
    if (c.gx > maxX) maxX = c.gx
    if (c.gy > maxY) maxY = c.gy
  }
  minX = Math.max(x0, minX - 1)
  minY = Math.max(y0, minY - 1)
  maxX = Math.min(x1, maxX + 1)
  maxY = Math.min(y1, maxY + 1)

  const land = rgbFromPacked(atlas.color32("grass"), [58, 90, 38])
  const water = rgbFromPacked(atlas.color32("water"), [36, 88, 104])
  const deep = rgbFromPacked(atlas.color32("water_deep"), [28, 68, 92])

  // Chunk AABB so z14 screen-res never hits the early-return that left Manhattan water.
  const CHUNK = 18
  const step = 1
  const prevSmooth = ctx.imageSmoothingEnabled
  ctx.imageSmoothingEnabled = true
  for (let cy0 = minY; cy0 <= maxY; cy0 += CHUNK) {
    for (let cx0 = minX; cx0 <= maxX; cx0 += CHUNK) {
      const cx1 = Math.min(maxX, cx0 + CHUNK - 1)
      const cy1 = Math.min(maxY, cy0 + CHUNK - 1)
      // Skip chunks with no shore-touch cell
      let hit = false
      for (const c of cells) {
        if (c.gx >= cx0 - 1 && c.gx <= cx1 + 1 && c.gy >= cy0 - 1 && c.gy <= cy1 + 1) {
          hit = true
          break
        }
      }
      if (!hit) continue
      const cellsW = cx1 - cx0 + 1
      const cellsH = cy1 - cy0 + 1
      const pw = Math.max(1, Math.ceil((cellsW * tileS) / step))
      const ph = Math.max(1, Math.ceil((cellsH * tileS) / step))
      if (pw * ph > 200_000) continue
      const img = stripCanvas(pw, ph).createImageData(pw, ph)
      const data = img.data
      const inv = step / tileS
      for (let j = 0; j < ph; j++) {
        for (let i = 0; i < pw; i++) {
          const wx = cx0 + (i + 0.5) * inv
          const wy = cy0 + (j + 0.5) * inv
          const f = shoreField(terrain, worldW, wx, wy)
          const [r, g, b] = shoreRgbAt(f, land, water, deep)
          const o = (j * pw + i) * 4
          data[o] = r
          data[o + 1] = g
          data[o + 2] = b
          data[o + 3] = 255
        }
      }
      const sctx = stripCanvas(pw, ph)
      sctx.putImageData(img, 0, 0)
      const dx = (cx0 * tilePx - camX) * zoom
      const dy = (cy0 * tilePx - camY) * zoom
      ctx.drawImage(sctx.canvas, 0, 0, pw, ph, dx, dy, cellsW * tileS, cellsH * tileS)
    }
  }
  ctx.imageSmoothingEnabled = prevSmooth
}

`

t = t.slice(0, start) + fn + t.slice(end)
fs.writeFileSync(path, t, "utf8")
console.log("chunked shore strip", fs.statSync(path).size)