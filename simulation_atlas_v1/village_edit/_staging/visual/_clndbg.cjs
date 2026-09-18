const fs = require('fs');
const p = 'src/lib/render/nature/shorePaint.ts';
let t = fs.readFileSync(p, 'utf8');
const markers = [
  '  let __painted = 0\r\n',
  '      __painted++\r\n',
];
for (const m of markers) t = t.split(m).join('');
while (t.includes('__shoreStripDbg')) {
  const a = t.indexOf(';(globalThis as any).__shoreStripDbg');
  if (a < 0) {
    const b = t.indexOf('(globalThis as any).__shoreStripDbg');
    if (b < 0) break;
    const lineStart = t.lastIndexOf('\n', b) + 1;
    const lineEnd = t.indexOf('\n', b);
    t = t.slice(0, lineStart) + t.slice(lineEnd + 1);
    continue;
  }
  const lineStart = t.lastIndexOf('\n', a) + 1;
  const lineEnd = t.indexOf('\n', a);
  t = t.slice(0, lineStart) + t.slice(lineEnd + 1);
}
t = t.split('  // WARP_STRIP_DEBUG\r\n').join('');
t = t.split('  // WARP_STRIP_DEBUG\n').join('');
fs.writeFileSync(p, t);
console.log('dbg left', t.includes('__shoreStripDbg'), 'painted', t.includes('__painted'), 'sAlpha', t.includes('shoreAlpha(f, wx, wy) < 1'), '3.4', t.includes('* 3.4'), 'braces', (t.match(/\{/g)||[]).length, (t.match(/\}/g)||[]).length);