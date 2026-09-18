const fs = require('fs');
const p = 'src/lib/render/nature/shorePaint.ts';
let t = fs.readFileSync(p, 'utf8');
t = t.replace(
  'const land: [number, number, number] = [255, 20, 147] /* VISPROBE */\r\n  const water: [number, number, number] = [0, 255, 255]\r\n  const deep: [number, number, number] = [0, 200, 255]',
  'const land = rgbFromPacked(atlas.color32(\"grass\"), [58, 90, 38])\r\n  const water = rgbFromPacked(atlas.color32(\"water\"), [36, 88, 104])\r\n  const deep = rgbFromPacked(atlas.color32(\"water_deep\"), [28, 68, 92])'
);
t = t.replace(
  'const land: [number, number, number] = [255, 20, 147] /* VISPROBE */\n  const water: [number, number, number] = [0, 255, 255]\n  const deep: [number, number, number] = [0, 200, 255]',
  'const land = rgbFromPacked(atlas.color32(\"grass\"), [58, 90, 38])\n  const water = rgbFromPacked(atlas.color32(\"water\"), [36, 88, 104])\n  const deep = rgbFromPacked(atlas.color32(\"water_deep\"), [28, 68, 92])'
);
fs.writeFileSync(p, t);
console.log('VISPROBE', t.includes('VISPROBE'), '3.4', t.includes('* 3.4'), 'sAlpha', t.includes('shoreAlpha(f, wx, wy) < 1'));