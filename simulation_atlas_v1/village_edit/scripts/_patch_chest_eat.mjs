const fs = require('fs')
const path = require('path')

const file = path.join(__dirname, '..', 'src', 'lib', 'sim', 'behaviors.ts')
let text = fs.readFileSync(file, 'utf8')
const nl = text.includes('\r\n') ? '\r\n' : '\n'
let changes = 0

function norm(s) {
  return s.replace(/\r?\n/g, nl)
}

function replaceOnce(oldStr, newStr, label) {
  const o = norm(oldStr)
  const n = norm(newStr)
  if (!text.includes(o)) {
    console.log('MISS', label)
    return false
  }
  text = text.replace(o, n)
  changes++
  console.log('OK', label)
  return true
}

replaceOnce(
  `  if (
    v.hunger < 1.45 &&
    !bestEdible(v) &&
    v.hasChest &&
    v.chestInventory &&
    edibleValue(v.chestInventory) > 0
  ) {
    const store = storeSpot(v.furnitureQueue, v.homeLayout)
    setTask(v, 'takeFromChest', store?.x ?? v.chestX, store?.y ?? v.chestY)
    noteChosenAction(v, 'takeFromChest', 'survie — garde-manger')
    return true
  }`,
  `  if (
    v.hunger < 2.35 &&
    !bestEdible(v) &&
    v.hasChest &&
    v.chestInventory &&
    edibleValue(v.chestInventory) > 0
  ) {
    const store = storeSpot(v.furnitureQueue, v.homeLayout)
    setTask(v, 'takeFromChest', store?.x ?? v.chestX, store?.y ?? v.chestY)
    noteChosenAction(v, 'takeFromChest', 'survie — garde-manger')
    return true
  }`,
  'tryAssignSurvivalTask chest threshold',
)

replaceOnce(
  `  if (v.hasChest && v.chestInventory && edibleValue(v.chestInventory) > 0 && v.hunger < 2.0) {
    const store = storeSpot(v.furnitureQueue, v.homeLayout)
    const cx = store?.x ?? v.chestX
    const cy = store?.y ?? v.chestY
    add('takeFromChest', cx, cy, starving * 180 * reach(v, cx, cy))
  }`,
  `  if (
    !bestEdible(v) &&
    v.hasChest &&
    v.chestInventory &&
    edibleValue(v.chestInventory) > 0 &&
    v.hunger < 2.35
  ) {
    const store = storeSpot(v.furnitureQueue, v.homeLayout)
    const cx = store?.x ?? v.chestX
    const cy = store?.y ?? v.chestY
    // Match eat urgency — empty bag + larder food must beat forage thrash.
    const chestUrge =
      v.hunger < 1.6
        ? Math.max(starving * 280, 90 + (1.6 - v.hunger) * 130)
        : starving * 160 + (2.35 - v.hunger) * 50
    add('takeFromChest', cx, cy, chestUrge * reach(v, cx, cy))
  }`,
  'chooseTask takeFromChest scoring',
)

replaceOnce(
  `    } else if (
      v.hunger < 1.45 &&
      v.hasChest &&
      v.chestInventory &&
      edibleValue(v.chestInventory) > 0
    ) {
      stashInterruptedTask(v)
      const store = storeSpot(v.furnitureQueue, v.homeLayout)
      setTask(v, 'takeFromChest', store?.x ?? v.chestX, store?.y ?? v.chestY)
      noteChosenAction(v, 'takeFromChest', 'faim — garde-manger')
    }`,
  `    } else if (
      v.hunger < 2.35 &&
      !bestEdible(v) &&
      v.hasChest &&
      v.chestInventory &&
      edibleValue(v.chestInventory) > 0
    ) {
      stashInterruptedTask(v)
      const store = storeSpot(v.furnitureQueue, v.homeLayout)
      setTask(v, 'takeFromChest', store?.x ?? v.chestX, store?.y ?? v.chestY)
      noteChosenAction(v, 'takeFromChest', 'faim — garde-manger')
    }`,
  'hunger interrupt takeFromChest',
)

const already =
  text.includes('après garde-manger') &&
  text.includes("active.kind === 'takeFromChest' && !failed && bestEdible")

if (already) {
  console.log('SKIP completion already patched')
} else {
  const a = replaceOnce(
    `    const wasSurvivalBite = active.kind === 'eat' || active.kind === 'takeFromChest'
    const wasLeisure =
      active.kind === 'socialise' ||
      active.kind === 'giveFood' ||
      active.kind === 'entertain' ||
      active.kind === 'counsel' ||
      active.kind === 'teachCraft'
    const micro = active.ageTicks <= 2 && active.work <= 0
    v.task = null
    if (wasSurvivalBite && restoreInterruptedTask(v)) {
      noteChosenAction(v, v.task!.kind, 'reprise après repas')
      v.nextThinkTick = state.tick + 1
    } else if (forceBiologicalRhythm(state, v)) {`,
    `    const wasLeisure =
      active.kind === 'socialise' ||
      active.kind === 'giveFood' ||
      active.kind === 'entertain' ||
      active.kind === 'counsel' ||
      active.kind === 'teachCraft'
    const micro = active.ageTicks <= 2 && active.work <= 0
    v.task = null
    // takeFromChest is not a meal — eat before resuming work. Restoring gatherFood/fish
    // here skipped the hunger interrupt (those kinds are excluded) and left bread unused.
    if (active.kind === 'takeFromChest' && !failed && bestEdible(v) && v.hunger < 2.35) {
      const t = eatTarget(v)
      setTask(v, 'eat', t.x, t.y)
      noteChosenAction(v, 'eat', 'après garde-manger')
      v.nextThinkTick = state.tick
    } else if (active.kind === 'eat' && restoreInterruptedTask(v)) {
      noteChosenAction(v, v.task!.kind, 'reprise après repas')
      v.nextThinkTick = state.tick + 1
    } else if (active.kind === 'takeFromChest' && restoreInterruptedTask(v)) {
      noteChosenAction(v, v.task!.kind, 'reprise après garde-manger')
      v.nextThinkTick = state.tick + 1
    } else if (forceBiologicalRhythm(state, v)) {`,
    'completion chain (forceBio)',
  )
  if (!a) {
    replaceOnce(
      `    const wasSurvivalBite = active.kind === 'eat' || active.kind === 'takeFromChest'
    const wasLeisure =
      active.kind === 'socialise' ||
      active.kind === 'giveFood' ||
      active.kind === 'entertain' ||
      active.kind === 'counsel' ||
      active.kind === 'teachCraft'
    v.task = null
    if (wasSurvivalBite && restoreInterruptedTask(v)) {
      noteChosenAction(v, v.task!.kind, 'reprise après repas')
      v.nextThinkTick = state.tick + 1
    } else if (wasLeisure) {`,
      `    const wasLeisure =
      active.kind === 'socialise' ||
      active.kind === 'giveFood' ||
      active.kind === 'entertain' ||
      active.kind === 'counsel' ||
      active.kind === 'teachCraft'
    v.task = null
    // takeFromChest is not a meal — eat before resuming work.
    if (active.kind === 'takeFromChest' && !failed && bestEdible(v) && v.hunger < 2.35) {
      const t = eatTarget(v)
      setTask(v, 'eat', t.x, t.y)
      noteChosenAction(v, 'eat', 'après garde-manger')
      v.nextThinkTick = state.tick
    } else if (active.kind === 'eat' && restoreInterruptedTask(v)) {
      noteChosenAction(v, v.task!.kind, 'reprise après repas')
      v.nextThinkTick = state.tick + 1
    } else if (active.kind === 'takeFromChest' && restoreInterruptedTask(v)) {
      noteChosenAction(v, v.task!.kind, 'reprise après garde-manger')
      v.nextThinkTick = state.tick + 1
    } else if (wasLeisure) {`,
      'completion chain (wasLeisure)',
    )
  }
}

fs.writeFileSync(file, text)
console.log('wrote', changes, 'changes')
