const fs = require('fs');
const p = 'src/lib/render/nature/shorePaint.ts';
let t = fs.readFileSync(p, 'utf8');
const si = t.indexOf('export function paintViewportShoreStrip');
const di = t.indexOf('export function paintViewportDirtStrip');
let shore = t.slice(si, di);
if (shore.includes('VISPROBE')) { console.log('already'); process.exit(0); }
const old = 'const land = rgbFromPacked(atlas.color32(\"grass\"), [58, 90, 38])\r\n  const water = rgbFromPacked(atlas.color32(\"water\"), [36, 88, 104])\r\n  const deep = rgbFromPacked(atlas.color32(\"water_deep\"), [28, 68, 92])';
const neu = 'const land: [number, number, number] = [255, 20, 147] /* VISPROBE */\r\n  const water: [number, number, number] = [0, 255, 255]\r\n  const deep: [number, number, number] = [0, 200, 255]';
if (!shore.includes(old)) {
  const old2 = old.replace(/\r\n/g, '\n');
  if (shore.includes(old2)) shore = shore.replace(old2, neu.replace(/\r\n/g, '\n'));
  else { console.log('color block missing'); console.log(shore.slice(shore.indexOf('const land'), shore.indexOf('const land')+250)); process.exit(1); }
} else shore = shore.replace(old, neu);
t = t.slice(0, si) + shore + t.slice(di);
fs.writeFileSync(p, t);
console.log('probe on', t.includes('VISPROBE'));