const fs = require('fs');
const p = 'src/lib/render/nature/shorePaint.ts';
let t = fs.readFileSync(p, 'utf8');
const i = t.indexOf('function domainWarp');
let depth = 0, started = false, k = i;
for (; k < t.length; k++) {
  if (t[k] === '{') { depth++; started = true; }
  else if (t[k] === '}') { depth--; if (started && depth === 0) { k++; break; } }
}
const newWarp = [
'function domainWarp(wx: number, wy: number): [number, number] {',
'  const lx =',
'    fbm2(wx * 0.055, wy * 0.055, 6, 2.05, 0.55) * 3.4 +',
'    fbm2(wx * 0.12 + 19.7, wy * 0.12 - 8.3, 5, 2.1, 0.52) * 1.65 +',
'    simplex2(wx * 0.28 + 11.3, wy * 0.28 - 4.7) * 1.15',
'  const ly =',
'    fbm2(wx * 0.055 + 37.1, wy * 0.055 - 19.4, 6, 2.05, 0.55) * 3.4 +',
'    fbm2(wx * 0.12 - 22.4, wy * 0.12 + 14.6, 5, 2.1, 0.52) * 1.65 +',
'    simplex2(wx * 0.28 - 8.2, wy * 0.28 + 15.6) * 1.15',
'  const mx =',
'    simplex2(wx * 0.48 + 3.1, wy * 0.48) * 1.55 +',
'    simplex2(wx * 0.95 - 6.4, wy * 0.95 + 2.8) * 0.95 +',
'    simplex2(wx * 1.7 + 2.2, wy * 1.7 - 5.1) * 0.55',
'  const my =',
'    simplex2(wx * 0.48 - 12.5, wy * 0.48 + 9.1) * 1.55 +',
'    simplex2(wx * 0.95 + 4.2, wy * 0.95 - 7.3) * 0.95 +',
'    simplex2(wx * 1.7 - 3.8, wy * 1.7 + 6.4) * 0.55',
'  const hx =',
'    simplex2(wx * 2.4 + 1.7, wy * 2.4) * 0.95 +',
'    simplex2(wx * 5.2 - 4.1, wy * 5.2 + 2.2) * 0.55 +',
'    simplex2(wx * 10.5 + 8.8, wy * 10.5 - 3.3) * 0.32',
'  const hy =',
'    simplex2(wx * 2.4 - 2.9, wy * 2.4 + 5.4) * 0.95 +',
'    simplex2(wx * 5.2 + 9.0, wy * 5.2 - 1.6) * 0.55 +',
'    simplex2(wx * 10.5 - 5.5, wy * 10.5 + 6.7) * 0.32',
'  return [wx + lx + mx + hx, wy + ly + my + hy]',
'}'
].join('\n');
t = t.slice(0, i) + newWarp + t.slice(k);
const si = t.indexOf('export function paintViewportShoreStrip');
const di = t.indexOf('export function paintViewportDirtStrip');
let shore = t.slice(si, di);
shore = shore.replace('if (f < 0.5) {', 'if (shoreAlpha(f, wx, wy) < 1) {');
t = t.slice(0, si) + shore + t.slice(di);
const di2 = t.indexOf('export function paintViewportDirtStrip');
let dirt = t.slice(di2);
if (dirt.includes('if (f < 0.5) {') && !dirt.includes('dirtAlpha(f, wx, wy)')) {
  dirt = dirt.replace('if (f < 0.5) {', 'if (dirtAlpha(f, wx, wy) < 1) {');
  t = t.slice(0, di2) + dirt;
}
const open = (t.match(/\{/g) || []).length;
const close = (t.match(/\}/g) || []).length;
console.log('braces', open, close, 'amp', t.includes('* 3.4'), 'sAlpha', t.includes('shoreAlpha(f, wx, wy) < 1'), 'dAlpha', t.includes('dirtAlpha(f, wx, wy) < 1'));
if (open !== close) process.exit(3);
fs.writeFileSync(p, t);