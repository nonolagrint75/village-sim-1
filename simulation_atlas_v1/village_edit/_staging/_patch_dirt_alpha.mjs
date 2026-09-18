import fs from "fs"
const path = "src/lib/render/nature/shorePaint.ts"
let t = fs.readFileSync(path, "utf8")

const start = t.indexOf("export function paintViewportDirtStrip")
if (start < 0) { console.error("no dirt strip"); process.exit(1) }
const block = t.slice(start)
const i = block.indexOf("const f = dirtField")
const j = block.indexOf("const sctx = stripCanvas", i)
console.log("---BEFORE---")
console.log(block.slice(i, j))

const old = block.slice(i, j)
// Match whatever is there
const newLoop = `const f = dirtField(terrain, worldW, wx, wy)
      // Soft SDF alpha only — no land↔beige color mix (Manhattan rim was the mid lerp).
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
  `

// old includes up to but not including sctx — need to keep closing braces from original
// Safer: replace from dirtField through alpha assignment line by line
const re = /const f = dirtField\(terrain, worldW, wx, wy\)[\s\S]*?data\[o \+ 3\] = [^\n]+\n/
if (!re.test(t)) {
  console.error("dirt re fail")
  process.exit(1)
}
t = t.replace(re, `const f = dirtField(terrain, worldW, wx, wy)
      const a = smoothstep(0.22, 0.42, f)
      if (a <= 0.02) continue
      const sf = shoreField(terrain, worldW, wx, wy)
      const c1 = sf > 0.18 && f > 0.15 ? sand : cover
      const o = (j * pw + i) * 4
      data[o] = c1[0]
      data[o + 1] = c1[1]
      data[o + 2] = c1[2]
      data[o + 3] = (a * 255) | 0
`)

// Shore strip: clear ImageData to 0 alpha before fill (createImageData is already 0)
// Ensure drawImage composites correctly — ctx should not be forced opaque

// Also fix stripCanvas reuse: when putting partial alpha, must clear previous opaque pixels
// createImageData already zeros — OK

// Verify shore loop
const sh = t.match(/const f = shoreField\(terrain, worldW, wx, wy\)[\s\S]{0,280}/)
console.log("---shore loop---")
console.log(sh && sh[0])

fs.writeFileSync(path, t, "utf8")
console.log("dirt alpha done", t.includes("no land↔beige") || t.includes("smoothstep(0.22, 0.42, f)"))