import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const dest = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "src", "assets", "nature", "source");
fs.mkdirSync(dest, { recursive: true });
const logs = path.join(process.env.USERPROFILE, ".cursor", "browser-logs");
const files = [
  "cdp-response-Runtime.evaluate-2026-09-18T01-44-42-546Z.json",
  "cdp-response-Runtime.evaluate-2026-09-18T01-45-19-367Z.json",
  "cdp-response-Runtime.evaluate-2026-09-18T01-45-18-727Z.json",
  "cdp-response-Runtime.evaluate-2026-09-18T01-49-02-169Z.json",
];
function walk(obj, out = []) {
  if (!obj || typeof obj !== "object") return out;
  if (typeof obj.b64 === "string" && obj.ok) out.push({ b64: obj.b64, url: obj.url || "", len: obj.len });
  for (const v of Object.values(obj)) walk(v, out);
  return out;
}
function nameFor(entry, i) {
  const u = String(entry.url || "");
  if (u.includes("punyworld-overworld-tileset")) return "punyworld-overworld-tileset.png";
  if (u.includes("tilemap_11")) return "block-texture-set-tilemap.png";
  if (u.includes("preview_1185")) return "block-texture-set-preview.png";
  if (u.includes("blocks_2.zip")) return "block-texture-set.zip";
  if (u.includes("blocks_0.zip")) return "block-textures.zip";
  if (u.includes("blocks_preview")) return "block-textures-preview.png";
  const hdr = Buffer.from(entry.b64, "base64").subarray(0, 4);
  if (hdr[0] === 0x50 && hdr[1] === 0x4b) return "pack-" + i + ".zip";
  if (hdr[0] === 0x89 && hdr[1] === 0x50) return "sheet-" + i + ".png";
  return "blob-" + i + ".bin";
}
let i = 0;
for (const name of files) {
  const full = path.join(logs, name);
  if (!fs.existsSync(full)) { console.log("missing", name); continue; }
  const json = JSON.parse(fs.readFileSync(full, "utf8"));
  for (const hit of walk(json)) {
    const outName = nameFor(hit, i++);
    const buf = Buffer.from(hit.b64, "base64");
    fs.writeFileSync(path.join(dest, outName), buf);
    console.log("wrote", outName, buf.length, "expected", hit.len);
  }
}
console.log("files", fs.readdirSync(dest));