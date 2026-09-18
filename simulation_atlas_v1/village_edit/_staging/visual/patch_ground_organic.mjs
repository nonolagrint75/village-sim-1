import fs from "fs"

const p = "src/lib/render/nature/shorePaint.ts"
let t = fs.readFileSync(p, "utf8")

// Export shoreFieldFast
t = t.replace(
  "function shoreFieldFast(terrain: Uint8Array, worldW: number, wx: number, wy: number): number {",
  "export function shoreFieldFast(terrain: Uint8Array, worldW: number, wx: number, wy: number): number {",
)

// Organic paints: use shoreFieldFast (cheaper) 
t = t.replace(
  /shoreField\(terrain, worldW, wx, wy\)/g,
  "shoreFieldFast(terrain, worldW, wx, wy)",
)
// Keep shoreField export itself calling shoreSdf - don't break the definition
// Fix if we accidentally replaced inside shoreField function body
t = t.replace(
  "export function shoreField(terrain: Uint8Array, worldW: number, wx: number, wy: number): number {\n  return smoothstep(-1.25, 1.15, shoreSdf(terrain, worldW, wx, wy))\n}",
  "export function shoreField(terrain: Uint8Array, worldW: number, wx: number, wy: number): number {\n  return smoothstep(-1.25, 1.15, shoreSdf(terrain, worldW, wx, wy))\n}",
)

// Soften strip cost: smaller pad defaults in SHORE_PAD / paintOpaqueLerpStrip n
t = t.replace("const SHORE_PAD = 0.92", "const SHORE_PAD = 0.62")
t = t.replace("const DIRT_PAD = 0.88", "const DIRT_PAD = 0.58")
t = t.replace(
  "const n = Math.max(24, Math.min(56, Math.round(tileS * span * 1.15)))",
  "const n = Math.max(12, Math.min(28, Math.round(tileS * span * 0.55)))",
)

// Make viewport ImageData strips no-ops for FPS — ground pass owns organic coast now.
const shoreStrip = t.indexOf("export function paintViewportShoreStrip")
const dirtStrip = t.indexOf("export function paintViewportDirtStrip")
if (shoreStrip < 0 || dirtStrip < 0) throw new Error("strip markers missing")

const noopShore = `export function paintViewportShoreStrip(
  _ctx: CanvasRenderingContext2D,
  _atlas: AtlasColor,
  _terrain: Uint8Array,
  _worldW: number,
  _x0: number,
  _y0: number,
  _x1: number,
  _y1: number,
  _camX: number,
  _camY: number,
  _zoom: number,
  _tilePx: number,
) {
  // Ground-pass organic paint owns coast now — ImageData overlay retired (FPS + double-paint).
}

`

const noopDirt = `export function paintViewportDirtStrip(
  _ctx: CanvasRenderingContext2D,
  _atlas: AtlasColor,
  _terrain: Uint8Array,
  _worldW: number,
  _x0: number,
  _y0: number,
  _x1: number,
  _y1: number,
  _camX: number,
  _camY: number,
  _zoom: number,
  _tilePx: number,
) {
  // Ground-pass organic dirt owns parcels now.
}
`

t = t.slice(0, shoreStrip) + noopShore + noopDirt

fs.writeFileSync(p, t, "utf8")
const o = fs.readFileSync(p, "utf8")
console.log({
  exportFast: o.includes("export function shoreFieldFast"),
  organicFast: o.includes("shoreFieldFast(terrain, worldW, wx, wy)"),
  noop: o.includes("Ground-pass organic paint owns coast"),
  pad: o.includes("SHORE_PAD = 0.62"),
  size: o.length,
})
