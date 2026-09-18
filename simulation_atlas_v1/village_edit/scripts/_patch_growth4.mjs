import fs from 'fs'

const p = 'src/lib/sim/behaviors.ts'
let t = fs.readFileSync(p, 'utf8')

// Mint coins beyond traders — wealth / craft / gold holders
const oldMint = "  if (v.hasWorkbench && gold >= NUGGETS_PER_COIN && v.profession === 'trader') {\r\n    add('mintCoins', v.workbenchX, v.workbenchY, (20 + (1 - p.generosity) * 40) * reach(v, v.workbenchX, v.workbenchY))\r\n  }"
const newMint = `  if (v.hasWorkbench && gold >= NUGGETS_PER_COIN) {
    const mintDrive =
      (v.profession === 'trader' ? 55 : 28) +
      (1 - p.generosity) * 35 +
      (v.ambition === 'wealth' ? 30 : 0) +
      (v.profession === 'blacksmith' ? 18 : 0) +
      Math.min(40, gold * 6)
    add('mintCoins', v.workbenchX, v.workbenchY, mintDrive * reach(v, v.workbenchX, v.workbenchY))
  }`
if (t.includes(oldMint)) t = t.replace(oldMint, newMint.replace(/\n/g, '\r\n'))
else if (t.includes(oldMint.replace(/\r\n/g, '\n'))) t = t.replace(oldMint.replace(/\r\n/g, '\n'), newMint)
else console.log('WARN mint')

// Couples can reproduce within household range (not only adjacent tiles)
t = t.replace(
  '      if (distance(a.x, a.y, b.x, b.y) > 2.5) return false',
  '      if (distance(a.x, a.y, b.x, b.y) > 5.5) return false',
)

// Ready: count chest pantry for family food stock
const oldReady = `  const ready = (v: Villager) =>
    v.alive &&
    v.hasHome &&
    isMarriageAge(v) &&
    v.reproCooldown <= 0 &&
    v.hunger >= REPRO_HUNGER_THRESHOLD &&
    edibleValue(v.inventory) >= REPRO_FOOD_STOCK`
const newReady = `  const ready = (v: Villager) =>
    v.alive &&
    v.hasHome &&
    isMarriageAge(v) &&
    v.reproCooldown <= 0 &&
    v.hunger >= REPRO_HUNGER_THRESHOLD &&
    edibleValue(v.inventory) + (v.chestInventory ? edibleValue(v.chestInventory) : 0) >= REPRO_FOOD_STOCK`
if (t.includes(oldReady.replace(/\n/g, '\r\n'))) t = t.replace(oldReady.replace(/\n/g, '\r\n'), newReady.replace(/\n/g, '\r\n'))
else if (t.includes(oldReady)) t = t.replace(oldReady, newReady)
else console.log('WARN ready')

// Soft craft specialty urge when well-fed + workbench (breaks wood monoculture)
const craftAnchor = '  if (v.hasWorkbench && v.toolTier === \'wood\') {'
if (t.includes(craftAnchor) && !t.includes('// Surplus craft specialization')) {
  const inject = `  // Surplus craft specialization — develop beyond perpetual woodcutting.
  if (v.hasWorkbench && !state.famine && v.hunger >= 2.5 && edibleValue(v.inventory) >= 2) {
    const live = mindOf(v).livelihood
    const craftPush =
      18 +
      p.curiosity * 22 +
      p.ambition * 18 +
      (live?.mix.craft ?? 0) * 40 +
      (v.ambition === 'builder' || v.ambition === 'wealth' ? 16 : 0)
    if (canPracticeCraft(v, 'wood') && wood >= 2) {
      add('craftGoods', v.workbenchX, v.workbenchY, craftPush * reach(v, v.workbenchX, v.workbenchY))
    }
    if (canPracticeCraft(v, 'weave') && (countOf(v.inventory, 'wool') > 0 || countOf(v.inventory, 'flax') > 0)) {
      add('weaveCloth', v.workbenchX, v.workbenchY, (craftPush + 8) * reach(v, v.workbenchX, v.workbenchY))
    }
  }

`
  t = t.replace(craftAnchor, inject.replace(/\n/g, '\r\n') + craftAnchor)
}

fs.writeFileSync(p, t)
console.log('wealth/family/craft boosts applied')
