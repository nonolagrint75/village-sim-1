import fs from "fs"
const p = "src/lib/render/nature/shorePaint.ts"
let t = fs.readFileSync(p, "utf8")

// Replace paintViewportShoreStrip body with screen-res edge band
const shoreStart = t.indexOf("export function paintViewportShoreStrip")
const dirtStart = t.indexOf("export function paintViewportDirtStrip")
if (shoreStart < 0 || dirtStart < 0) throw new Error("strip exports missing")
// Find end of shore function: next export after shoreStart that is dirt... actually dirt comes after shore in file?
// Order in file: dirt strip then shore strip OR shore then dirt?
console.log("shore", shoreStart, "dirt", dirtStart)

const newShore = `export function paintViewportShoreStrip(
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
      if (cellTouchesShore(terrain, worldW, gx, gy, 3)) cells.push({ gx, gy })
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
  const cellsW = maxX - minX + 1
  const cellsH = maxY - minY + 1
  // Screen-res edge band (step 1–2) — upscaled low-ppc was soft-mask over Manhattan.
  const step = tileS >= 36 ? 2 : 1
  const pw = Math.max(1, Math.ceil((cellsW * tileS) / step))
  const ph = Math.max(1, Math.ceil((cellsH * tileS) / step))
  if (pw * ph > 220_000) return
  const land = rgbFromPacked(atlas.color32("grass"), [58, 90, 38])
  const water = rgbFromPacked(atlas.color32("water"), [36, 88, 104])
  const deep = rgbFromPacked(atlas.color32("water_deep"), [28, 68, 92])
  const img = stripCanvas(pw, ph).createImageData(pw, ph)
  const data = img.data
  const inv = step / tileS
  for (let j = 0; j < ph; j++) {
    for (let i = 0; i < pw; i++) {
      const wx = minX + (i + 0.5) * inv
      const wy = minY + (j + 0.5) * inv
      const f = shoreField(terrain, worldW, wx, wy)
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
  const dx = (minX * tilePx - camX) * zoom
  const dy = (minY * tilePx - camY) * zoom
  ctx.save()
  ctx.imageSmoothingEnabled = true
  ctx.drawImage(sctx.canvas, 0, 0, pw, ph, dx, dy, cellsW * tileS, cellsH * tileS)
  ctx.restore()
}
`

const newDirt = `export function paintViewportDirtStrip(
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
      if (cellTouchesDirt(terrain, worldW, gx, gy, 2)) cells.push({ gx, gy })
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
  const cellsW = maxX - minX + 1
  const cellsH = maxY - minY + 1
  const step = tileS >= 36 ? 2 : 1
  const pw = Math.max(1, Math.ceil((cellsW * tileS) / step))
  const ph = Math.max(1, Math.ceil((cellsH * tileS) / step))
  if (pw * ph > 220_000) return
  const land = rgbFromPacked(atlas.color32("grass"), [58, 90, 38])
  const cover = rgbFromPacked(atlas.color32("grass_grazed"), [118, 92, 52])
  const sand = rgbFromPacked(atlas.color32("sand"), [210, 186, 118])
  const img = stripCanvas(pw, ph).createImageData(pw, ph)
  const data = img.data
  const inv = step / tileS
  for (let j = 0; j < ph; j++) {
    for (let i = 0; i < pw; i++) {
      const wx = minX + (i + 0.5) * inv
      const wy = minY + (j + 0.5) * inv
      const f = dirtField(terrain, worldW, wx, wy)
      if (f <= 0.03) continue
      const w = smoothstep(0.03, 0.36, f)
      const sf = shoreField(terrain, worldW, wx, wy)
      const useSand = sf > 0.18 && f > 0.15
      const c1 = useSand ? sand : cover
      const o = (j * pw + i) * 4
      data[o] = Math.max(0, Math.min(255, (land[0] * (1 - w) + c1[0] * w) | 0))
      data[o + 1] = Math.max(0, Math.min(255, (land[1] * (1 - w) + c1[1] * w + w * 2) | 0))
      data[o + 2] = Math.max(0, Math.min(255, (land[2] * (1 - w) + c1[2] * w) | 0))
      data[o + 3] = f > 0.07 ? 255 : (smoothstep(0.02, 0.07, f) * 255) | 0
    }
  }
  const sctx = stripCanvas(pw, ph)
  sctx.putImageData(img, 0, 0)
  const dx = (minX * tilePx - camX) * zoom
  const dy = (minY * tilePx - camY) * zoom
  ctx.save()
  ctx.imageSmoothingEnabled = true
  ctx.drawImage(sctx.canvas, 0, 0, pw, ph, dx, dy, cellsW * tileS, cellsH * tileS)
  ctx.restore()
}
`

// Replace from first of the two exports through end of second
const first = Math.min(shoreStart, dirtStart)
const afterDirt = t.indexOf("\nexport ", dirtStart + 10)
const afterShore = t.indexOf("\nexport ", shoreStart + 10)
// The second strip function ends before the next export that isn't the other strip
let end = Math.max(
  afterDirt > 0 ? afterDirt : t.length,
  afterShore > 0 ? afterShore : t.length,
)
// Actually find the end of the later function
const laterStart = Math.max(shoreStart, dirtStart)
let brace = 0
let i = t.indexOf("{", laterStart)
let endFn = laterStart
for (; i < t.length; i++) {
  if (t[i] === "{") brace++
  else if (t[i] === "}") {
    brace--
    if (brace === 0) { endFn = i + 1; break }
  }
}
const earlierStart = Math.min(shoreStart, dirtStart)
t = t.slice(0, earlierStart) + newShore + "\n\n" + newDirt + "\n" + t.slice(endFn)
fs.writeFileSync(p, t, "utf8")

const { execSync } = await import("child_process")
try {
  execSync("npx esbuild src/lib/render/nature/shorePaint.ts --bundle --outfile=NUL --format=esm --log-level=error", { stdio: "pipe" })
  console.log("esbuild_ok")
} catch (e) {
  console.log("FAIL", e.stderr?.toString?.().slice(0, 1500) || e.message)
}
const out = fs.readFileSync(p, "utf8")
console.log({
  screenRes: out.includes("Screen-res edge band"),
  step2: out.includes("tileS >= 36 ? 2"),
  camFormula: out.includes("(minX * tilePx - camX) * zoom"),
  shoreFieldSand: out.includes("shoreField(terrain, worldW, wx, wy)"),
})
