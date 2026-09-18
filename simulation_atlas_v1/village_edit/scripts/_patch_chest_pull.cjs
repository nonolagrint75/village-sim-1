const fs = require('fs')
const file = 'src/lib/sim/behaviors.ts'
let text = fs.readFileSync(file, 'utf8')
const nl = text.includes('\r\n') ? '\r\n' : '\n'
let n = 0
function rep(a, b, label) {
  const o = a.replace(/\r?\n/g, nl)
  const x = b.replace(/\r?\n/g, nl)
  if (!text.includes(o)) {
    console.log('MISS', label)
    return
  }
  text = text.replace(o, x)
  n++
  console.log('OK', label)
}

rep('const CHEST_PULL = 1.55', 'const CHEST_PULL = 2.35', 'CHEST_PULL value')

rep(
  `    } else if (
      v.hunger < CHEST_PULL &&
      v.hasChest &&
      v.chestInventory &&
      edibleValue(v.chestInventory) > 0
    ) {`,
  `    } else if (
      v.hunger < CHEST_PULL &&
      !bestEdible(v) &&
      v.hasChest &&
      v.chestInventory &&
      edibleValue(v.chestInventory) > 0
    ) {`,
  'interrupt !bestEdible',
)

// Prefer CHEST_PULL constant in completion + scoring hardcodes
rep(
  "if (active.kind === 'takeFromChest' && !failed && bestEdible(v) && v.hunger < 2.35) {",
  "if (active.kind === 'takeFromChest' && !failed && bestEdible(v) && v.hunger < CHEST_PULL) {",
  'completion uses CHEST_PULL',
)

rep(
  `    edibleValue(v.chestInventory) > 0 &&
    v.hunger < 2.35
  ) {
    const store = storeSpot(v.furnitureQueue, v.homeLayout)
    const cx = store?.x ?? v.chestX
    const cy = store?.y ?? v.chestY
    // Match eat urgency — empty bag + larder food must beat forage thrash.
    const chestUrge =
      v.hunger < 1.6
        ? Math.max(starving * 280, 90 + (1.6 - v.hunger) * 130)
        : starving * 160 + (2.35 - v.hunger) * 50`,
  `    edibleValue(v.chestInventory) > 0 &&
    v.hunger < CHEST_PULL
  ) {
    const store = storeSpot(v.furnitureQueue, v.homeLayout)
    const cx = store?.x ?? v.chestX
    const cy = store?.y ?? v.chestY
    // Match eat urgency — empty bag + larder food must beat forage thrash.
    const chestUrge =
      v.hunger < 1.6
        ? Math.max(starving * 280, 90 + (1.6 - v.hunger) * 130)
        : starving * 160 + (CHEST_PULL - v.hunger) * 50`,
  'scoring uses CHEST_PULL',
)

fs.writeFileSync(file, text)
console.log('wrote', n)
