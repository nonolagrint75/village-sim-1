import fs from "fs"
const path = "src/lib/render/nature/shorePaint.ts"
let t = fs.readFileSync(path, "utf8")

const shoreRe = /const f = shoreField\(terrain, worldW, wx, wy\)\r?\n\s*const a = shoreAlpha\(f\)\r?\n\s*if \(a <= 0\.02\) continue\r?\n\s*const \[r, g, b\] = shoreHardRgb\(f, water, deep\)\r?\n\s*const o = \(j \* pw \+ i\) \* 4\r?\n\s*data\[o\] = r\r?\n\s*data\[o \+ 1\] = g\r?\n\s*data\[o \+ 2\] = b\r?\n\s*data\[o \+ 3\] = \(a \* 255\) \| 0/

if (!shoreRe.test(t)) {
  // try hard gate variant
  const shoreRe2 = /const f = shoreField\(terrain, worldW, wx, wy\)\r?\n\s*if \(f < 0\.5\) continue\r?\n\s*const \[r, g, b\] = shoreHardRgb\(f, water, deep\)\r?\n\s*const o = \(j \* pw \+ i\) \* 4\r?\n\s*data\[o\] = r\r?\n\s*data\[o \+ 1\] = g\r?\n\s*data\[o \+ 2\] = b\r?\n\s*data\[o \+ 3\] = 255/
  if (!shoreRe2.test(t)) {
    console.error("no shore loop")
    process.exit(1)
  }
  t = t.replace(shoreRe2, BOTH)
} else {
  t = t.replace(shoreRe, BOTH)
}

const BOTH = `const f = shoreField(terrain, worldW, wx, wy)
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

// rewrite properly without TDZ
t = fs.readFileSync(path, "utf8")
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

let ok = false
for (const re of [
  /const f = shoreField\(terrain, worldW, wx, wy\)\r?\n\s*const a = shoreAlpha\(f\)\r?\n\s*if \(a <= 0\.02\) continue\r?\n\s*const \[r, g, b\] = shoreHardRgb\(f, water, deep\)\r?\n\s*const o = \(j \* pw \+ i\) \* 4\r?\n\s*data\[o\] = r\r?\n\s*data\[o \+ 1\] = g\r?\n\s*data\[o \+ 2\] = b\r?\n\s*data\[o \+ 3\] = \(a \* 255\) \| 0/,
  /const f = shoreField\(terrain, worldW, wx, wy\)\r?\n\s*if \(f < 0\.5\) continue\r?\n\s*const \[r, g, b\] = shoreHardRgb\(f, water, deep\)\r?\n\s*const o = \(j \* pw \+ i\) \* 4\r?\n\s*data\[o\] = r\r?\n\s*data\[o \+ 1\] = g\r?\n\s*data\[o \+ 2\] = b\r?\n\s*data\[o \+ 3\] = 255/,
]) {
  if (re.test(t)) {
    t = t.replace(re, both)
    ok = true
    break
  }
}
if (!ok) { console.error("shore fail"); process.exit(1) }

// dirt both sides
const dirtRe = /const f = dirtField\(terrain, worldW, wx, wy\)\r?\n[\s\S]{0,350}?data\[o \+ 3\] = [^\n]+/
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

const dirtStart = t.indexOf("export function paintViewportDirtStrip")
const before = t.slice(0, dirtStart)
let dirtFn = t.slice(dirtStart)
if (!dirtRe.test(dirtFn)) {
  console.error("dirt loop missing")
} else {
  dirtFn = dirtFn.replace(dirtRe, dirtBoth)
  console.log("dirt both-sides")
}
if (!/const land = rgbFromPacked\(atlas\.color32\("grass"\)/.test(dirtFn)) {
  dirtFn = dirtFn.replace(
    /const cover = rgbFromPacked/,
    'const land = rgbFromPacked(atlas.color32("grass"), [58, 90, 38])\n  const cover = rgbFromPacked',
  )
  console.log("land added to dirt")
}
t = before + dirtFn

fs.writeFileSync(path, t, "utf8")
console.log("shore both-sides", t.includes("land overwrites water-cell underlay"))