const fs = require('fs')
let t = fs.readFileSync('PHASE5_EVIDENCE_LOG.md', 'utf8')
const old = `DELTA: priceDelta/task/prof samples with npcIds; shock-tagged counters
VERDICT_BLOC: see smoke JSON (never EMERGENCE PASS)`
const neu = `DELTA: shock wheat 415->0; decisionsAfter=9274; shockDeltas=178 task=40 prof=44; priceNpc=52; samples delta/task/prof=21/21/22
VERDICT_BLOC: PARTIAL (MECHANISM only; never EMERGENCE PASS)`
if (!t.includes(old)) {
  if (t.includes('shock wheat 415->0')) { console.log('evidence nums already'); process.exit(0) }
  throw new Error('evidence delta block missing')
}
t = t.replace(old, neu)
fs.writeFileSync('PHASE5_EVIDENCE_LOG.md', t, 'utf8')
console.log('evidence nums ok')