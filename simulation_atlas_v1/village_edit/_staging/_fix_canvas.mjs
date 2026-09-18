import fs from "fs"
const path = "src/lib/render/nature/shorePaint.ts"
let t = fs.readFileSync(path, "utf8")

// Exact-size strip canvas — oversized reuse caused horizontal tear/stride artifacts
t = t.replace(
  /function stripCanvas\(w: number, h: number\): CanvasRenderingContext2D \{[\s\S]*?\n\}/,
  `function stripCanvas(w: number, h: number): CanvasRenderingContext2D {
  const ww = Math.max(1, w | 0)
  const hh = Math.max(1, h | 0)
  if (!_stripTmp || _stripTmp.width !== ww || _stripTmp.height !== hh) {
    _stripTmp = document.createElement("canvas")
    _stripTmp.width = ww
    _stripTmp.height = hh
  }
  return _stripTmp.getContext("2d")!
}`,
)

// Force hard gate in shore loop whatever form it's in
t = t.replace(
  /const f = shoreField\(terrain, worldW, wx, wy\)\n[\s\S]{0,220}?data\[o \+ 3\] = [^\n]+/,
  `const f = shoreField(terrain, worldW, wx, wy)
          if (f < 0.5) continue
          const [r, g, b] = shoreHardRgb(f, water, deep)
          const o = (j * pw + i) * 4
          data[o] = r
          data[o + 1] = g
          data[o + 2] = b
          data[o + 3] = 255`,
)

fs.writeFileSync(path, t, "utf8")
console.log("fixed", {
  exactCanvas: t.includes("_stripTmp.width !== ww"),
  hard: t.includes("if (f < 0.5) continue"),
})