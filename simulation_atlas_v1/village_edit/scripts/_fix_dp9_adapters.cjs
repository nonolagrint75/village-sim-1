const fs = require('fs')
let t = fs.readFileSync('scripts/harness/adapters.ts', 'utf8')
const bad = `      proposed: 'NOT_TESTED',
      expected: 'shock->decision->supply/demand->price (controlled probe only)',`
const good = `      result: 'NOT_TESTED',
      expected: 'shock->decision->supply/demand->price (controlled probe only)',`
if (!t.includes(bad)) {
  if (t.includes("test: 'phase3.sec32_controlled_shock'") && t.includes("result: 'NOT_TESTED'")) {
    console.log('already fixed')
    process.exit(0)
  }
  throw new Error('bad block not found')
}
t = t.replace(bad, good)
fs.writeFileSync('scripts/harness/adapters.ts', t, 'utf8')
console.log('fixed proposed->result')