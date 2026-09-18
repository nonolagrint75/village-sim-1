const fs = require("fs");
const p = "src/lib/render/nature/shorePaint.ts";
let t = fs.readFileSync(p, "utf8");
const a = t.indexOf("STRIP_VIS_DEBUG");
if (a < 0) { console.log("no vis"); process.exit(0); }
const start = t.lastIndexOf("\n", a);
const endLand = t.indexOf("waterDbg = [0, 255, 255] as [number, number, number]");
const end = t.indexOf("\n", endLand) + 1;
t = t.slice(0, start + 1) + t.slice(end);
t = t.split("landDbg").join("land");
t = t.replace("const [r, g, b] = waterDbg", "const [r, g, b] = shoreHardRgb(f, water, deep)");
fs.writeFileSync(p, t);
console.log("done vis", t.includes("STRIP_VIS_DEBUG"), "landDbg", t.includes("landDbg"), "alpha", t.includes("shoreAlpha(f, wx, wy)"));