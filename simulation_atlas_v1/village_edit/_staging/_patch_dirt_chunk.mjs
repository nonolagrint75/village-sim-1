import fs from "fs"
const path = "src/lib/render/nature/shorePaint.ts"
let t = fs.readFileSync(path, "utf8")
const start = t.indexOf("export function paintViewportDirtStrip")
if (start < 0) { console.error("missing dirt"); process.exit(1) }
console.log("replacing from", start, "len", t.length - start)
const fn = `export function paintViewportDirtStrip(
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
  const cells: { gx: number; gy: number }[] = []
  for (let gy = y0; gy <= y1; gy++) {
    for (let gx = x0; gx <= x1; gx++) {
      if (cellTouchesDirt(terrain, worldW, gx, gy, 1)) cells.push({ gx, gy })
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

  const cover = rgbFromPacked(atlas.color32("grass_grazed"), [118, 92, 52])
  const sand = rgbFromPacked(atlas.color32("sand"), [210, 186, 118])
  const CHUNK = 18
  const step = 1
  const prevSmooth = ctx.imageSmoothingEnabled
  ctx.imageSmoothingEnabled = true
  for (let cy0 = minY; cy0 <= maxY; cy0 += CHUNK) {
    for (let cx0 = minX; cx0 <= maxX; cx0 += CHUNK) {
      const cx1 = Math.min(maxX, cx0 + CHUNK - 1)
      const cy1 = Math.min(maxY, cy0 + CHUNK - 1)
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
          const f = dirtField(terrain, worldW, wx, wy)
          const a = smoothstep(0.22, 0.42, f)
          if (a <= 0.02) continue
          const sf = shoreField(terrain, worldW, wx, wy)
          const c1 = sf > 0.18 && f > 0.15 ? sand : cover
          const o = (j * pw + i) * 4
          data[o] = c1[0]
          data[o + 1] = c1[1]
          data[o + 2] = c1[2]
          data[o + 3] = (a * 255) | 0
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
t = t.slice(0, start) + fn + "\n"
fs.writeFileSync(path, t, "utf8")
console.log("ok", fs.statSync(path).size, "has022", t.includes("smoothstep(0.22, 0.42, f)"))