import fs from "fs"
const path = "src/lib/render/nature/shorePaint.ts"
let t = fs.readFileSync(path, "utf8")

const both = `const f = shoreField(terrain, worldW, wx, wy)
          const o = (j * pw + i) * 4
          // BOTH sides of hard 0.5: land overwrites water-cell underlay (else Manhattan water tiles remain).
          if (f < 0.5) {
            data[o] = land[0]
            data[o + 1] = land[1]
            data[o + 2] = land[2]
            data[o + 3] = 255
          } else {
            const [r, g, b] = shoreHardRgb(f, water, deep)
            data[o] = r
            data[o + 1] = g
            data[o + 2] = b
            data[o + 3] = 255
          }`

const shoreRes = [
  /const f = shoreField\(terrain, worldW, wx, wy\)\r?\n\s*const a = shoreAlpha\(f\)\r?\n\s*if \(a <= 0\.02\) continue\r?\n\s*const \[r, g, b\] = shoreHardRgb\(f, water, deep\)\r?\n\s*const o = \(j \* pw \+ i\) \* 4\r?\n\s*data\[o\] = r\r?\n\s*data\[o \+ 1\] = g\r?\n\s*data\[o \+ 2\] = b\r?\n\s*data\[o \+ 3\] = \(a \* 255\) \| 0/,
  /const f = shoreField\(terrain, worldW, wx, wy\)\r?\n\s*if \(f < 0\.5\) continue\r?\n\s*const \[r, g, b\] = shoreHardRgb\(f, water, deep\)\r?\n\s*const o = \(j \* pw \+ i\) \* 4\r?\n\s*data\[o\] = r\r?\n\s*data\[o \+ 1\] = g\r?\n\s*data\[o \+ 2\] = b\r?\n\s*data\[o \+ 3\] = 255/,
]

let shoreOk = false
for (const re of shoreRes) {
  if (re.test(t)) {
    t = t.replace(re, both)
    shoreOk = true
    break
  }
}
if (!shoreOk) {
  console.error("shore loop not matched")
  process.exit(1)
}

const dirtStart = t.indexOf("export function paintViewportDirtStrip")
const before = t.slice(0, dirtStart)
let dirtFn = t.slice(dirtStart)
const dirtRe = /const f = dirtField\(terrain, worldW, wx, wy\)\r?\n[\s\S]{0,400}?data\[o \+ 3\] = [^\n]+/
const dirtBoth = `const f = dirtField(terrain, worldW, wx, wy)
          const o = (j * pw + i) * 4
          if (f < 0.5) {
            data[o] = land[0]
            data[o + 1] = land[1]
            data[o + 2] = land[2]
            data[o + 3] = 255
          } else {
            const sf = shoreField(terrain, worldW, wx, wy)
            const c1 = sf > 0.18 ? sand : cover
            data[o] = c1[0]
            data[o + 1] = c1[1]
            data[o + 2] = c1[2]
            data[o + 3] = 255
          }`
if (!dirtRe.test(dirtFn)) {
  console.error("dirt loop not matched")
  process.exit(1)
}
dirtFn = dirtFn.replace(dirtRe, dirtBoth)
if (!/const land = rgbFromPacked\(atlas\.color32\("grass"\)/.test(dirtFn)) {
  dirtFn = dirtFn.replace(
    /const cover = rgbFromPacked/,
    'const land = rgbFromPacked(atlas.color32("grass"), [58, 90, 38])\n  const cover = rgbFromPacked',
  )
}
t = before + dirtFn
fs.writeFileSync(path, t, "utf8")
console.log("ok", {
  shore: t.includes("land overwrites water-cell underlay"),
  dirtLand: /paintViewportDirtStrip[\s\S]*?const land = rgbFromPacked/.test(t),
})