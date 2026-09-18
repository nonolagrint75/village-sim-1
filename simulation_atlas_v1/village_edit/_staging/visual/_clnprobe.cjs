const fs = require("fs");
const p = "src/lib/render/nature/shorePaint.ts";
let t = fs.readFileSync(p, "utf8");
const start = t.indexOf("          if ((globalThis as any).__shoreProbeOn");
if (start >= 0) {
  const end = t.indexOf("/* SHORE_PROBE_V1 */", start);
  if (end > start) {
    const lineEnd = t.indexOf("\n", end);
    t = t.slice(0, start) + t.slice(lineEnd + 1);
  }
}
fs.writeFileSync(p, t);
console.log("probe", t.includes("SHORE_PROBE_V1"), "3.4", t.includes("* 3.4"), "sAlpha", t.includes("shoreAlpha(f, wx, wy) < 1"), "dAlpha", t.includes("dirtAlpha(f, wx, wy) < 1"));