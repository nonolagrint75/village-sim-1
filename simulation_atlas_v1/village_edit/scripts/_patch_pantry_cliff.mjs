import fs from 'fs'
const p = 'src/lib/sim/behaviors.ts'
let t = fs.readFileSync(p, 'utf8')
let n = 0

function rep(old, neu, label) {
  if (!t.includes(old)) {
    console.log('MISS', label)
    return
  }
  t = t.replace(old, neu)
  n++
  console.log('OK', label)
}

rep(
  `  if (day < 14) return ripe ? 4 : 2
  // Taper: day 14–28 still above peacetime so bags refill between harvests.
  if (day < 28) return ripe ? 3 : 2
  return ripe ? 2 : 1
}`,
  `  if (day < 14) return ripe ? 4 : 2
  // Through pantry-cliff window (deaths clustered d21–27).
  if (day < 40) return ripe ? 3 : 2
  return ripe ? 2 : 1
}`,
  'forage yield',
)

rep(
  `  if (day < 14) return Math.max(FOOD_TARGET + 4, 8)
  if (day < 28) return Math.max(FOOD_TARGET + 2, 6)`,
  `  if (day < 14) return Math.max(FOOD_TARGET + 4, 8)
  if (day < 40) return Math.max(FOOD_TARGET + 2, 6)`,
  'stock target',
)

rep(
  `  } else if ((berriesRipeIn(season) || famine) && (starving > 0.2 || larder < stockTarget)) {
    // Short exploratory idle toward curiosity when food is unknown locally.
    const sx = clamp(v.x + Math.floor((rng() - 0.5) * searchR), 0, grid.width - 1)
    const sy = clamp(v.y + Math.floor((rng() - 0.5) * searchR), 0, grid.height - 1)
    add('idle', sx, sy, 4 + starving * 22 + p.curiosity * 12)
  }`,
  `  } else if (starving > 0.1 || larder < stockTarget || famine) {
    const farBush = findNearest(grid, v.x, v.y, Math.max(searchR * 2, 70), (x, y) => getTerrain(grid, x, y) === BUSH)
    if (farBush) {
      add(
        'gatherFood',
        farBush.x,
        farBush.y,
        (140 + starving * 280 + (larder < 1 ? 200 : 0) + (famine ? 80 : 0)) * reach(v, farBush.x, farBush.y),
      )
    } else {
      const sx = clamp(v.x + Math.floor((rng() - 0.5) * searchR * 1.6), 0, grid.width - 1)
      const sy = clamp(v.y + Math.floor((rng() - 0.5) * searchR * 1.6), 0, grid.height - 1)
      add('idle', sx, sy, 8 + starving * 40 + p.curiosity * 12 + (larder < 1 ? 30 : 0))
    }
  }`,
  'far bush',
)

rep(
  `    const hungryWithFood = v.hunger < 2.2 && bestEdible(v)
    // Unsowable field waiting: daytime rest must yield to clear/sow.
    const fieldWaiting = !night && v.fieldX !== -1 && !v.hasField && v.homeOwnerId === v.id
    let restScore = hungryWithFood && underdressed < 0.55 ? restNeed * 0.22 : restNeed
    if (fieldWaiting && !exhausted) restScore *= 0.08`,
  `    const hungryWithFood = v.hunger < 2.2 && bestEdible(v)
    const emptyHungry = bagEmptyFoodCrisis(v)
    // Unsowable field waiting: daytime rest must yield to clear/sow.
    const fieldWaiting = !night && v.fieldX !== -1 && !v.hasField && v.homeOwnerId === v.id
    let restScore = hungryWithFood && underdressed < 0.55 ? restNeed * 0.22 : restNeed
    if (emptyHungry && !exhausted) restScore *= 0.04
    if (fieldWaiting && !exhausted) restScore *= 0.08`,
  'rest score',
)

if (t.includes('const starvingNow = v.hunger < 1.2 && !bestEdible(v)')) {
  t = t.replace('const starvingNow = v.hunger < 1.2 && !bestEdible(v)', 'const starvingNow = bagEmptyFoodCrisis(v)')
  n++
  console.log('OK starvingNow')
} else if (t.includes('const starvingNow = bagEmptyFoodCrisis(v)')) {
  console.log('OK starvingNow already')
} else console.log('MISS starvingNow')

rep(
  `      if (state.tick < v.nextThinkTick) {
        // Settle in place during cooldown — never freeze as a silent null agent.
        if (v.stamina < STAMINA_TIRED || (isNight(state.tick) && !v.hasHome)) {
          setTask(v, 'rest', Math.round(v.x), Math.round(v.y))
        } else {
          setTask(v, 'idle', Math.round(v.x), Math.round(v.y))
        }
      } else {`,
  `      if (state.tick < v.nextThinkTick) {
        if (bagEmptyFoodCrisis(v)) {
          if (!tryAssignFoodSeek(state, v)) {
            const depth = shouldDeepThink(state, v) ? 'deep' : 'fast'
            tickCognition(state, v, rng, depth)
            chooseTask(state, v, rng)
          }
        } else if (v.stamina < STAMINA_TIRED || (isNight(state.tick) && !v.hasHome)) {
          setTask(v, 'rest', Math.round(v.x), Math.round(v.y))
        } else {
          setTask(v, 'idle', Math.round(v.x), Math.round(v.y))
        }
      } else {`,
  'cooldown',
)

rep(
  `  const bush =
    findNearbyTerrain(grid, v.x, v.y, searchR, BUSH) ??
    findNearbyTerrain(grid, v.x, v.y, Math.round(searchR * 1.6), BUSH)`,
  `  const bush =
    findNearbyTerrain(grid, v.x, v.y, searchR, BUSH) ??
    findNearbyTerrain(grid, v.x, v.y, Math.round(searchR * 1.6), BUSH) ??
    findNearest(grid, v.x, v.y, 80, (x, y) => getTerrain(grid, x, y) === BUSH)`,
  'foodseek radius',
)

fs.writeFileSync(p, t)
console.log('done', n)
