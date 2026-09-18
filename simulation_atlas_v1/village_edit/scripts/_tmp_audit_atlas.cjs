const fs = require('fs')
const a = fs.readFileSync('src/lib/sim/emergence/atlasLifeSystems.ts', 'utf8')
const needles = [
  'schism.split',
  'lent.principal',
  'loyalty:',
  "status === 'seized'",
  "status === 'blocked'",
  'regions:',
  'interest:',
  'traffic:',
  'formedTick',
  "noteLifeHit(state, 'herd",
  'discovery,',
  'v.ambition ===',
]
for (const n of needles) {
  if (a.includes(n)) console.log('HIT', n)
}
console.log('lines', a.split(/\n/).length)
console.log('engine call', fs.readFileSync('src/lib/sim/engine.ts', 'utf8').includes('tickAtlasLifeSystems'))
