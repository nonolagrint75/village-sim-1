from pathlib import Path

path = Path(__file__).resolve().parents[1] / "src" / "lib" / "sim" / "behaviors.ts"
text = path.read_text(encoding="utf-8")
changes = 0

def replace_once(src: str, old: str, new: str, label: str) -> str:
    global changes
    if old not in src:
        print(f"MISS {label}")
        return src
    changes += 1
    print(f"OK {label}")
    return src.replace(old, new, 1)

text = replace_once(
    text,
    """  if (
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
  }""",
    """  if (
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
  }""",
    "tryAssignSurvivalTask chest threshold",
)

text = replace_once(
    text,
    """  if (v.hasChest && v.chestInventory && edibleValue(v.chestInventory) > 0 && v.hunger < 2.0) {
    const store = storeSpot(v.furnitureQueue, v.homeLayout)
    const cx = store?.x ?? v.chestX
    const cy = store?.y ?? v.chestY
    add('takeFromChest', cx, cy, starving * 180 * reach(v, cx, cy))
  }""",
    """  if (
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
  }""",
    "chooseTask takeFromChest scoring",
)

text = replace_once(
    text,
    """    } else if (
      v.hunger < 1.45 &&
      v.hasChest &&
      v.chestInventory &&
      edibleValue(v.chestInventory) > 0
    ) {
      stashInterruptedTask(v)
      const store = storeSpot(v.furnitureQueue, v.homeLayout)
      setTask(v, 'takeFromChest', store?.x ?? v.chestX, store?.y ?? v.chestY)
      noteChosenAction(v, 'takeFromChest', 'faim — garde-manger')
    }""",
    """    } else if (
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
    }""",
    "hunger interrupt takeFromChest",
)

# Completion handler — prefer forceBiologicalRhythm variant from parallel agents.
old_completion_a = """    const wasSurvivalBite = active.kind === 'eat' || active.kind === 'takeFromChest'
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
    } else if (forceBiologicalRhythm(state, v)) {"""

new_completion_a = """    const wasLeisure =
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
    } else if (forceBiologicalRhythm(state, v)) {"""

old_completion_b = """    const wasSurvivalBite = active.kind === 'eat' || active.kind === 'takeFromChest'
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
    } else if (wasLeisure) {"""

new_completion_b = """    const wasLeisure =
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
    } else if (wasLeisure) {"""

if "après garde-manger" in text and "active.kind === 'takeFromChest' && !failed && bestEdible" in text:
    print("SKIP completion already patched")
elif old_completion_a in text:
    text = replace_once(text, old_completion_a, new_completion_a, "completion chain (forceBio)")
elif old_completion_b in text:
    text = replace_once(text, old_completion_b, new_completion_b, "completion chain (wasLeisure)")
else:
    idx = text.find("wasSurvivalBite")
    print("MISS completion")
    print(repr(text[idx : idx + 500]) if idx >= 0 else "no wasSurvivalBite")

path.write_text(text, encoding="utf-8")
print(f"wrote {changes} changes")
