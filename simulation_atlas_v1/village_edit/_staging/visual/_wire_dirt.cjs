const fs = require("fs")
const p = "src/lib/render/nature/draw.ts"
let t = fs.readFileSync(p, "utf8")
if (!t.includes("dirtAlpha")) {
  t = t.replace("  shoreAlpha,\r\n} from \"./shorePaint\"", "  shoreAlpha,\r\n  dirtAlpha,\r\n} from \"./shorePaint\"")
  if (!t.includes("dirtAlpha")) {
    t = t.replace("  shoreAlpha,\n} from \"./shorePaint\"", "  shoreAlpha,\n  dirtAlpha,\n} from \"./shorePaint\"")
  }
}
const old1 = "const dirtBlend = (f: number, sf: number, land: number, cover: number, _sand: number) => {\r\n      // Hard pick — soft edge owned by dirt strip. Never sand near shore (beige rim).\r\n      if (f < 0.5) return land"
const new1 = "const dirtBlend = (f: number, sf: number, land: number, cover: number, _sand: number) => {\r\n      // Hard pick — soft edge owned by dirt strip. Never sand near shore (beige rim).\r\n      if (dirtAlpha(f, x, y) < 1) return land"
const old2 = old1.replace(/\r\n/g, "\n")
const new2 = new1.replace(/\r\n/g, "\n")
if (t.includes(old1)) { t = t.replace(old1, new1); console.log("OK CRLF dirtBlend") }
else if (t.includes(old2)) { t = t.replace(old2, new2); console.log("OK LF dirtBlend") }
else if (t.includes("dirtAlpha(f, x, y)")) { console.log("already dirtAlpha in dirtBlend") }
else { console.error("MISS dirtBlend"); process.exit(1) }
fs.writeFileSync(p, t, "utf8")
console.log("draw dirtAlpha wired", t.includes("dirtAlpha"))