const fs = require('fs');
const { execSync } = require('child_process');
const path = 'village_edit/src/lib/sim/behaviors.ts';
const head = execSync('git show HEAD:village_edit/src/lib/sim/behaviors.ts', { encoding: 'utf8' });
let cur = fs.readFileSync(path, 'utf8');
const nl = cur.includes('\r\n') ? '\r\n' : '\n';

// Restore eatTarget comment + chooseTask eat block from HEAD (keep cold patches)
function extract(src, startMarker, endMarker) {
  const a = src.indexOf(startMarker);
  const b = src.indexOf(endMarker, a);
  if (a < 0 || b < 0) throw new Error('extract fail ' + startMarker);
  return src.slice(a, b);
}

// 1) comment above eatTarget
const oldComment = '/** Table only when nearby & not urgently hungry — survival meals eat in place. */';
const newComment = '/** Prefer table when housed — travel time is intentional (no teleport meals). */';
if (cur.includes(oldComment)) cur = cur.replace(oldComment, newComment);

// 2) chooseTask eat block — restore HEAD version
const headEat = extract(
  head,
  '    if (eatUrge > 8) {\n      const table = eatSpot',
  '  if (\n    !bestEdible(v) &&',
);
// try CRLF variants
let headEatBlock = null;
const markers = [
  ['    if (eatUrge > 8) {\r\n      const table = eatSpot', '  if (\r\n    !bestEdible(v) &&'],
  ['    if (eatUrge > 8) {\n      const table = eatSpot', '  if (\n    !bestEdible(v) &&'],
];
for (const [s,e] of markers) {
  const a = head.indexOf(s);
  const b = head.indexOf(e, a);
  if (a >= 0 && b >= 0) { headEatBlock = head.slice(a, b); break; }
}
if (!headEatBlock) {
  console.error('could not find head eat block');
  process.exit(1);
}
let curStart = cur.indexOf('    if (eatUrge > 8) {');
if (curStart < 0) { console.error('no cur eatUrge'); process.exit(1); }
// find end: next "  if (" after takeFromChest start - use !bestEdible pattern
let curEnd = cur.indexOf('  if (\n    !bestEdible(v) &&', curStart);
if (curEnd < 0) curEnd = cur.indexOf('  if (\r\n    !bestEdible(v) &&', curStart);
if (curEnd < 0) { console.error('no cur end'); process.exit(1); }
cur = cur.slice(0, curStart) + headEatBlock + cur.slice(curEnd);
fs.writeFileSync(path, cur);
console.log('OK stripped eat hunks');
// verify cold still present
if (!cur.includes('earlyColdGrace') || !cur.includes('airCold < 0.15')) {
  console.error('cold patches missing!');
  process.exit(1);
}
console.log('cold patches still present');
