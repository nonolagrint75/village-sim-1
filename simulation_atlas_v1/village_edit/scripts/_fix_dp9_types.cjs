const fs = require('fs')
let t = fs.readFileSync('src/lib/sim/types.ts', 'utf8')
const old = `    priceNpcCount?: number
    priceChainSamples?: Array<{
      tick: number
      day: number
      stage: 'priceDelta' | 'taskShift' | 'professionShift'
      resource?: string
      npcId?: number
      taskKind?: string
      prevProfession?: string
      nextProfession?: string
      priceBefore?: number
      priceAfter?: number
      shockId?: string | null
    }>
    priceActiveShockId?: string | null
    priceShockTaggedDeltas?: number
    priceShockLinkedTaskShifts?: number
    priceShockLinkedProfessionShifts?: number`
const neu = `    priceNpcCount: number
    priceChainSamples?: Array<{
      tick: number
      day: number
      stage: 'priceDelta' | 'taskShift' | 'professionShift'
      resource?: string
      npcId?: number
      taskKind?: string
      prevProfession?: string
      nextProfession?: string
      priceBefore?: number
      priceAfter?: number
      shockId?: string | null
    }>
    priceActiveShockId?: string | null
    priceShockTaggedDeltas: number
    priceShockLinkedTaskShifts: number
    priceShockLinkedProfessionShifts: number`
if (!t.includes(old)) throw new Error('types optional block missing')
t = t.replace(old, neu)
fs.writeFileSync('src/lib/sim/types.ts', t, 'utf8')
console.log('types required fields ok')