import fs from "fs"
const path = "src/lib/render/nature/shorePaint.ts"
let t = fs.readFileSync(path, "utf8")

// Shore strip pixel loop: paint BOTH sides of hard isocontour
const old = `          const f = shoreField(terrain, worldW, wx, wy)
          const a = shoreAlpha(f)
          if (a <= 0.02) continue
          const [r, g, b] = shoreHardRgb(f, water, deep)
          const o = (j * pw + i) * 4
          data[o] = r
          data[o + 1] = g
          data[o + 2] = b
          data[o + 3] = (a * 255) | 0`

const next = `          const f = shoreField(terrain, worldW, wx, wy)
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

if (!t.includes(old)) {
  const i = t.indexOf("const f = shoreField(terrain, worldW, wx, wy)")
  console.log(t.slice(i, i+400))
  process.exit(1)
}
t = t.replace(old, next)

// Dirt strip: paint both sides too (grass when f<0.5 inside dirt AABB)
const dirtOld = `          const f = dirtField(terrain, worldW, wx, wy)
          const a = smoothstep(0.22, 0.42, f)
          if (a <= 0.02) continue
          const sf = shoreField(terrain, worldW, wx, wy)
          const c1 = sf > 0.18 && f > 0.15 ? sand : cover
          const o = (j * pw + i) * 4
          data[o] = c1[0]
          data[o + 1] = c1[1]
          data[o + 2] = c1[2]
          data[o + 3] = (a * 255) | 0`

// Try several dirt loop variants
let dirtPatched = false
const dirtVariants = [
  dirtOld,
  `          const f = dirtField(terrain, worldW, wx, wy)
          if (f < 0.5) continue
          const sf = shoreField(terrain, worldW, wx, wy)
          const c1 = sf > 0.18 && f > 0.15 ? sand : cover
          const o = (j * pw + i) * 4
          data[o] = c1[0]
          data[o + 1] = c1[1]
          data[o + 2] = c1[2]
          data[o + 3] = 255`,
]

const dirtNew = `          const f = dirtField(terrain, worldW, wx, wy)
          const o = (j * pw + i) * 4
          // BOTH sides: grass when f<0.5 so dirt-cell underlay doesn't keep Manhattan rects.
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

for (const v of dirtVariants) {
  if (t.includes(v)) {
    t = t.replace(v, dirtNew)
    dirtPatched = true
    break
  }
}

// Ensure dirt strip has land color in scope
if (!t.includes("const land = rgbFromPacked(atlas.color32(\"grass\")") || t.indexOf("paintViewportDirtStrip") > 0) {
  const dirtFn = t.indexOf("export function paintViewportDirtStrip")
  const coverDecl = t.indexOf("const cover = rgbFromPacked", dirtFn)
  if (coverDecl > 0 && !t.slice(dirtFn, coverDecl + 80).includes('const land = rgbFromPacked(atlas.color32("grass")')) {
    t = t.slice(0, coverDecl) + 'const land = rgbFromPacked(atlas.color32("grass"), [58, 90, 38])\n  ' + t.slice(coverDecl)
    console.log("added land to dirt strip")
  }
}

if (!dirtPatched) {
  const i = t.indexOf("const f = dirtField", t.indexOf("paintViewportDirtStrip"))
  console.log("dirt loop unpatched:", t.slice(i, i+350))
}

fs.writeFileSync(path, t, "utf8")
console.log("both-sides", t.includes("land overwrites water-cell underlay"), "dirt", dirtPatched)