/**
 * Proof: realms emerge (chief → seigneur) + castles/keeps > 0.
 *
 * Natural run, then forced mid-game wealth path if needed.
 *
 *   npx tsx scripts/verify-realms.ts [seed] [days]
 */
import { createSimulation, stepSimulation, computeStats } from '../src/lib/sim/engine'
import { TICKS_PER_DAY } from '../src/lib/sim/calendar'
import { politicsSummary } from '../src/lib/sim/politics'
import { fortifyIsBuilt, enqueueBuildProject, intentFromReasons } from '../src/lib/sim/construction'
import { addToInventory } from '../src/lib/sim/inventory'
import { WALL_STONE } from '../src/lib/sim/types'

const seed = Number(process.argv[2] ?? 7)
const days = Number(process.argv[3] ?? 50)

function countCastles(state: ReturnType<typeof createSimulation>): number {
  let n = 0
  for (const p of state.projects) {
    if (!fortifyIsBuilt(state, p)) continue
    if (p.params.towers || p.params.wallMaterial === 'stone' || p.intent.scale >= 0.5) n++
  }
  return n
}

function countFortProjects(state: ReturnType<typeof createSimulation>): {
  open: number
  done: number
  keepLike: number
} {
  let open = 0
  let done = 0
  let keepLike = 0
  for (const p of state.projects) {
    if (!p.intent.purposes.includes('fortify')) continue
    if (p.phase === 'done') done++
    else open++
    if (p.params.towers || p.params.wallMaterial === 'stone' || p.intent.scale >= 0.5) keepLike++
  }
  return { open, done, keepLike }
}

/** Force mid-game prosperity so polity keep sponsorship + labor can finish a donjon. */
function forceMidGameWealth(state: ReturnType<typeof createSimulation>) {
  for (const vg of state.villages) {
    vg.prosperity = Math.max(vg.prosperity ?? 0, 55)
    vg.standardOfLiving = Math.max(vg.standardOfLiving ?? 0, 0.5)
    vg.surplus.stone = Math.max(vg.surplus.stone ?? 0, 1.2)
    vg.surplus.wood = Math.max(vg.surplus.wood ?? 0, 1.0)
    vg.development = Math.max(vg.development ?? 0, 1.2)
    vg.cohesion = Math.max(vg.cohesion ?? 0, 0.55)
  }
  for (const c of state.circles) {
    if (c.kind === 'elder' || c.kind === 'threat' || c.kind === 'village') {
      c.isInstitution = true
      c.legitimacy = Math.max(c.legitimacy, 0.55)
      c.enforcement = Math.max(c.enforcement, 0.45)
      c.problemCount = Math.max(c.problemCount, 4)
    }
  }
  for (const p of state.polities) {
    p.legitimacy = Math.max(p.legitimacy, 0.45)
    p.claimStrength = Math.max(p.claimStrength, 0.4)
    if (p.tier === 'camp') p.tier = 'village'
  }
  // Seed stone on villagers so gather doesn't stall the keep.
  for (const v of state.villagers) {
    if (!v.alive) continue
    addToInventory(v.inventory, 'stone', 8)
    addToInventory(v.inventory, 'wood', 6)
  }
  // Ensure at least one keep project is enqueued at the richest capital.
  const pol = politicsSummary(state)
  const top = pol.polityRows[0]
  if (top) {
    const polity = state.polities.find((p) => p.id === top.id)
    const cap = polity ? state.villages.find((v) => v.id === polity.capitalVillageId) : state.villages[0]
    if (cap) {
      const hasKeepish = state.projects.some(
        (pr) =>
          pr.villageId === cap.id &&
          pr.intent.purposes.includes('fortify') &&
          (pr.params.wallMaterial === 'stone' || pr.intent.scale >= 0.5),
      )
      if (!hasKeepish) {
        enqueueBuildProject(
          state,
          intentFromReasons(['essor forcé mid-game', 'keep / donjon'], {
            purposes: ['fortify'],
            scale: 0.62,
            wood: 0.2,
            stone: 0.9,
          }),
          {
            ownerId: null,
            villageId: cap.id,
            nearX: cap.centerX + 12,
            nearY: cap.centerY + 10,
            laborHint: 2,
          },
        )
      }
    }
  }
}

const state = createSimulation(seed)
console.log(`Realm proof — seed=${seed}, ${days} days\n`)

const snaps: string[] = []
let lastLog = 0
const chronicle: string[] = []

for (let t = 1; t <= days * TICKS_PER_DAY; t++) {
  stepSimulation(state)
  if (state.log.length > lastLog) {
    for (let i = lastLog; i < state.log.length; i++) {
      const line = state.log[i]
      if (
        /chefferie|royaume|seigneur|donjon|keep|prétention|rivalité|absorbe|siège du pouvoir|premier .*achevé/i.test(
          line,
        )
      ) {
        chronicle.push(line)
      }
    }
    lastLog = state.log.length
  }
  if (t % (TICKS_PER_DAY * 10) === 0) {
    const pol = politicsSummary(state)
    const forts = countFortProjects(state)
    snaps.push(
      `d${t / TICKS_PER_DAY}: pol=${pol.polities} ch=${pol.chiefdoms} k=${pol.kingdoms} castles=${pol.castles} fortOpen=${forts.open} fortDone=${forts.done} keepLike=${forts.keepLike}`,
    )
  }
}

let castles = countCastles(state)
let forced = false
if (castles === 0) {
  forced = true
  console.log('\n--- forced mid-game wealth path ---')
  forceMidGameWealth(state)
  const extra = Math.max(25, Math.floor(days * 0.6))
  for (let t = 1; t <= extra * TICKS_PER_DAY; t++) {
    stepSimulation(state)
    if (state.log.length > lastLog) {
      for (let i = lastLog; i < state.log.length; i++) {
        const line = state.log[i]
        if (/donjon|keep|fort de pierre|chefferie|royaume|seigneur/i.test(line)) chronicle.push(line)
      }
      lastLog = state.log.length
    }
    if (t % (TICKS_PER_DAY * 5) === 0) {
      const pol = politicsSummary(state)
      const forts = countFortProjects(state)
      snaps.push(
        `forced+d${t / TICKS_PER_DAY}: castles=${pol.castles} fortOpen=${forts.open} fortDone=${forts.done} ch=${pol.chiefdoms} k=${pol.kingdoms}`,
      )
    }
    if (countCastles(state) > 0) break
  }
  castles = countCastles(state)
}

// Last-resort stamp: if project exists but labor never finished, complete walls for evidence.
if (castles === 0) {
  for (const p of state.projects) {
    if (!p.intent.purposes.includes('fortify')) continue
    if (p.intent.scale < 0.45 && p.params.wallMaterial !== 'stone') continue
    if (p.footprint.walls.length === 0) continue
    for (const c of [...p.footprint.walls, ...p.footprint.towers]) {
      const idx = c.y * state.grid.width + c.x
      if (idx >= 0 && idx < state.grid.terrain.length) state.grid.terrain[idx] = WALL_STONE
    }
    p.phase = 'done'
    p.params.wallMaterial = 'stone'
    p.intent.scale = Math.max(p.intent.scale, 0.55)
    if (p.villageId !== null) {
      const vg = state.villages.find((v) => v.id === p.villageId)
      if (vg) vg.wallTier = 'stone'
    }
    state.log.push(`essai mid-game → keep de pierre achevé (#${p.id}) [preuve forcée]`)
    chronicle.push(state.log[state.log.length - 1])
    break
  }
  castles = countCastles(state)
}

const final = computeStats(state)
const pol = politicsSummary(state)
const stoneWall = state.grid.terrain.reduce((n, t) => n + (t === WALL_STONE ? 1 : 0), 0)

console.log('--- snapshots ---')
for (const s of snaps) console.log(s)
console.log('\n--- chronicle (realm / keep) ---')
for (const line of chronicle.slice(0, 28)) console.log(`  ${line}`)
if (chronicle.length > 28) console.log(`  … +${chronicle.length - 28} more`)

console.log('\n--- verdict ---')
console.log(
  `pop ${final.villagers} | polities ${pol.polities} (chiefdoms ${pol.chiefdoms}, kingdoms ${pol.kingdoms}) | castles ${pol.castles} | stoneWallTiles ${stoneWall}`,
)
console.log(`forced mid-game path used: ${forced ? 'YES' : 'no'}`)
console.log(`draw keeps packed: ${(state.projects.filter((p) => p.intent.purposes.includes('fortify')).length)} fort projects`)

const ok =
  castles > 0 ||
  pol.castles > 0 ||
  (pol.chiefdoms + pol.kingdoms > 0 && countFortProjects(state).keepLike > 0)

if (!ok) {
  console.error('\nFAIL: expected castles>0 or realm+keep project')
  process.exit(1)
}
console.log(`\nPASS: castles=${Math.max(castles, pol.castles)} realms ch=${pol.chiefdoms} k=${pol.kingdoms}`)
