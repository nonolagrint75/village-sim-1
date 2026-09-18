const fs = require("fs");
const p = "src/lib/render/nature/shorePaint.ts";
let t = fs.readFileSync(p, "utf8");
if (t.includes("SHORE_PROBE_V1")) { console.log("already"); process.exit(0); }
const si = t.indexOf("export function paintViewportShoreStrip");
const di = t.indexOf("export function paintViewportDirtStrip");
let shore = t.slice(si, di);
const needle = "const f = shoreField(terrain, worldW, wx, wy)";
if (!shore.includes(needle)) { console.log("missing"); process.exit(1); }
const inject = [
  "const f = shoreField(terrain, worldW, wx, wy)",
  "          if ((globalThis as any).__shoreProbeOn && (i & 15) === 0 && (j & 3) === 0) {",
  "            const P = ((globalThis as any).__shoreProbe = (globalThis as any).__shoreProbe || { n: 0, ys: [] as number[] })",
  "            P.n++",
  "            if (Math.abs(f - 0.5) < 0.12 && P.ys.length < 120) P.ys.push(wy)",
  "          }",
  "          /* SHORE_PROBE_V1 */",
].join("\n");
shore = shore.replace(needle, inject);
t = t.slice(0, si) + shore + t.slice(di);
fs.writeFileSync(p, t);
console.log("ok", t.includes("SHORE_PROBE_V1"));