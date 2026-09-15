/**
 * Medieval brigand bands — outcasts / desperate folk who camp in the woods,
 * raid villages for food, and fight. No fantasy; emerges after founding settles.
 */
import { TICKS_PER_DAY } from './calendar'
import { onDeath } from './interactions'
import {
  addToInventory,
  countOf,
  createInventory,
  edibleValue,
  removeFromInventory,
  type ResourceType,
} from './inventory'
import { generateName } from './personality'
import { LAND_PROFILE, nudgeToward } from './pathfinding'
import { logEvent } from './social'
import {
  TREE,
  WALL_STONE,
  WALL_WOOD,
  type Band,
  type Bandit,
  type SimState,
  type Villager,
  type WorldGrid,
} from './types'
import { distance, getTerrain, inBounds, isBlockingWall } from './world'

/** Soft gate: no brigands during founding weeks — leave time for palisades. */
export const BANDIT_START_DAY = 48
const BANDIT_START_TICK = TICKS_PER_DAY * BANDIT_START_DAY

const FORM_CHECK = TICKS_PER_DAY // once per day
const MAX_BANDS = 6
const MAX_BANDITS = 28
const BAND_MIN = 3
const BAND_MAX = 7
const RAID_RANGE = 55
const STEAL_RANGE = 1.6
const FIGHT_RANGE = 1.8
const CAMP_WANDER = 10
const BANDIT_SPEED = 2
const BANDIT_HUNGER_DECAY = 0.012
const BANDIT_HEALTH_MAX = 5
const CAMP_HEALTH_MAX = 12
const TRADE_AMBUSH_RANGE = 18

const BAND_EPITHETS = [
  'du ravin',
  'de la lisière',
  'des marais',
  'du chemin creux',
  'des haies',
  'de la lande',
  'des taillis',
  'du gué',
]

const FOOD_KINDS: ResourceType[] = ['bread', 'food', 'wheat', 'flour']

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n))
}

function aliveBandits(state: SimState): Bandit[] {
  return state.bandits.filter((b) => b.alive)
}

function bandMembers(state: SimState, band: Band): Bandit[] {
  const out: Bandit[] = []
  for (const id of band.memberIds) {
    const b = state.bandits.find((x) => x.id === id && x.alive)
    if (b) out.push(b)
  }
  return out
}

function moveToward(entity: { x: number; y: number }, tx: number, ty: number, speed: number, grid: WorldGrid) {
  nudgeToward(grid, entity, tx, ty, speed, LAND_PROFILE, 0)
}

function moveRandom(entity: { x: number; y: number }, rng: () => number, grid: WorldGrid, range = 1) {
  for (let attempt = 0; attempt < 6; attempt++) {
    const nx = clamp(entity.x + Math.floor(rng() * (2 * range + 1)) - range, 0, grid.width - 1)
    const ny = clamp(entity.y + Math.floor(rng() * (2 * range + 1)) - range, 0, grid.height - 1)
    if (!isBlockingWall(grid, nx, ny)) {
      entity.x = nx
      entity.y = ny
      return
    }
  }
}

function tickBanditNeeds(b: Bandit): boolean {
  b.hunger = Math.max(0, b.hunger - BANDIT_HUNGER_DECAY)
  if (b.hunger <= 0) {
    b.starveTimer += 1
    if (b.starveTimer > 80) {
      b.health -= 1
      b.starveTimer = 40
    }
  } else {
    b.starveTimer = Math.max(0, b.starveTimer - 1)
  }
  if (b.health < BANDIT_HEALTH_MAX) {
    b.healTimer += 1
    if (b.healTimer > 120 && b.hunger > 1.2) {
      b.health += 1
      b.healTimer = 0
    }
  }
  if (b.health <= 0) {
    b.alive = false
    return true
  }
  return false
}

function eatStolen(b: Bandit) {
  for (const kind of FOOD_KINDS) {
    if (countOf(b.loot, kind) <= 0) continue
    if (removeFromInventory(b.loot, kind, 1) < 1) continue
    b.hunger = Math.min(5, b.hunger + (kind === 'bread' ? 2.2 : kind === 'food' ? 1.8 : 1.2))
    return
  }
}

function pickCampNearVillage(
  state: SimState,
  cx: number,
  cy: number,
  rng: () => number,
): { x: number; y: number } | null {
  const grid = state.grid
  for (let attempt = 0; attempt < 40; attempt++) {
    const angle = rng() * Math.PI * 2
    const dist = 22 + Math.floor(rng() * 28)
    const x = Math.round(cx + Math.cos(angle) * dist)
    const y = Math.round(cy + Math.sin(angle) * dist)
    if (!inBounds(grid, x, y) || isBlockingWall(grid, x, y)) continue
    // Prefer wooded fringe — medieval road-cutters / forest brigands.
    let trees = 0
    for (let dy = -3; dy <= 3; dy++) {
      for (let dx = -3; dx <= 3; dx++) {
        if (!inBounds(grid, x + dx, y + dy)) continue
        if (getTerrain(grid, x + dx, y + dy) === TREE) trees++
      }
    }
    if (trees < 2 && attempt < 28) continue
    let tooClose = false
    for (const vg of state.villages) {
      if (distance(x, y, vg.centerX, vg.centerY) < 16) {
        tooClose = true
        break
      }
    }
    if (tooClose) continue
    return { x, y }
  }
  return null
}

function bandName(rng: () => number): string {
  const epithet = BAND_EPITHETS[Math.floor(rng() * BAND_EPITHETS.length)] ?? 'des bois'
  return `bande ${epithet}`
}

function makeBandit(
  state: SimState,
  bandId: number,
  x: number,
  y: number,
  rng: () => number,
  origin: Villager | null,
): Bandit {
  const id = state.nextId++
  const name = origin?.name ?? generateName(id * 9973 + (state.tick | 0))
  return {
    id,
    bandId,
    name,
    x,
    y,
    health: origin ? Math.max(2, Math.min(BANDIT_HEALTH_MAX, origin.health)) : 3 + (rng() < 0.4 ? 1 : 0),
    hunger: origin ? Math.max(0.4, Math.min(4, origin.hunger)) : 1.5 + rng() * 1.5,
    starveTimer: 0,
    healTimer: 0,
    courage: origin ? origin.personality.courage : 0.35 + rng() * 0.45,
    targetVillageId: null,
    targetVillagerId: null,
    phase: 'camp',
    loot: createInventory(6),
    foodStolen: 0,
    originVillagerId: origin?.id ?? null,
    alive: true,
  }
}

function detachOutcast(state: SimState, v: Villager) {
  if (v.villageId !== null) {
    const vg = state.villages.find((x) => x.id === v.villageId)
    if (vg) vg.memberIds = vg.memberIds.filter((id) => id !== v.id)
    v.villageId = null
  }
  v.alive = false
  // Not a normal death — desertion into the woods.
}

function isOutcastCandidate(state: SimState, v: Villager): boolean {
  if (!v.alive || v.age < TICKS_PER_DAY * 16) return false
  const hungry = v.hunger < 1.1 || edibleValue(v.inventory) < 1
  const homeless = !v.hasHome || v.villageId === null
  const excluded =
    v.memories.some((m) => m.kind === 'harmed' || m.kind === 'insulted' || m.kind === 'robbed') ||
    [...v.relations.values()].filter((r) => r.affinity < -0.35).length >= 2
  const unemployedLong = v.profession === 'none' && hungry
  const faminePush = state.famine && hungry
  return (homeless && hungry) || (excluded && hungry) || (unemployedLong && v.villageId === null) || faminePush
}

function villageRaidScore(state: SimState, villageId: number): number {
  const vg = state.villages.find((v) => v.id === villageId)
  if (!vg || vg.memberIds.length === 0) return -1
  const food =
    (vg.surplus.food ?? 0) + (vg.surplus.bread ?? 0) + (vg.surplus.wheat ?? 0) * 0.5 + (vg.surplus.flour ?? 0) * 0.5
  const security = vg.security ?? 0.5
  const wall =
    vg.wallTier === 'stone' ? 0.55 : vg.wallTier === 'wood' ? 0.3 : vg.perimeter.length > 0 ? 0.12 : 0
  return food * 1.4 + vg.memberIds.length * 0.15 - security * 2.2 - wall * 2.5 + (vg.prosperity ?? 30) * 0.02
}

function pickRaidTarget(state: SimState, band: Band): number | null {
  let best: { id: number; score: number } | null = null
  for (const vg of state.villages) {
    if (vg.memberIds.length === 0) continue
    const d = distance(band.campX, band.campY, vg.centerX, vg.centerY)
    if (d > RAID_RANGE + 25) continue
    const score = villageRaidScore(state, vg.id) - d * 0.04
    if (!best || score > best.score) best = { id: vg.id, score }
  }
  if (!best || best.score < 0.35) return null
  return best.id
}

function stealFromVillager(state: SimState, b: Bandit, v: Villager): boolean {
  for (const kind of FOOD_KINDS) {
    if (countOf(v.inventory, kind) <= 0) continue
    if (removeFromInventory(v.inventory, kind, 1) < 1) continue
    addToInventory(b.loot, kind, 1)
    b.foodStolen += 1
    state.thefts += 1
    if (v.villageId !== null) {
      const vg = state.villages.find((x) => x.id === v.villageId)
      if (vg) vg.recentThefts = (vg.recentThefts ?? 0) + 1
    }
    return true
  }
  if (v.hasChest && v.chestInventory) {
    for (const kind of FOOD_KINDS) {
      if (countOf(v.chestInventory, kind) <= 0) continue
      if (removeFromInventory(v.chestInventory, kind, 1) < 1) continue
      addToInventory(b.loot, kind, 1)
      b.foodStolen += 1
      state.thefts += 1
      if (v.villageId !== null) {
        const vg = state.villages.find((x) => x.id === v.villageId)
        if (vg) vg.recentThefts = (vg.recentThefts ?? 0) + 1
      }
      return true
    }
  }
  return false
}

function tryFormBandFromOutcasts(state: SimState, rng: () => number): boolean {
  if (state.bands.length >= MAX_BANDS) return false
  if (aliveBandits(state).length >= MAX_BANDITS - BAND_MIN) return false

  const candidates = state.villagers.filter((v) => isOutcastCandidate(state, v))
  if (candidates.length < 2) return false

  // Prefer clustering near a village fringe.
  const anchor = state.villages[Math.floor(rng() * Math.max(1, state.villages.length))]
  const camp = pickCampNearVillage(
    state,
    anchor?.centerX ?? candidates[0]!.x,
    anchor?.centerY ?? candidates[0]!.y,
    rng,
  )
  if (!camp) return false

  const size = clamp(BAND_MIN + Math.floor(rng() * (BAND_MAX - BAND_MIN + 1)), BAND_MIN, Math.min(BAND_MAX, candidates.length))
  const pick = candidates.slice().sort((a, b) => a.hunger - b.hunger).slice(0, size)
  const bandId = state.nextBandId++
  const band: Band = {
    id: bandId,
    name: bandName(rng),
    campX: camp.x,
    campY: camp.y,
    hideoutTier: 'camp',
    campHealth: 2 + Math.floor(rng() * 3),
    memberIds: [],
    formedTick: state.tick,
    lastRaidTick: state.tick - TICKS_PER_DAY * 2,
    raids: 0,
    tradeAmbushes: 0,
    origin: 'outcasts',
  }

  for (const v of pick) {
    const b = makeBandit(state, bandId, camp.x + Math.floor(rng() * 3) - 1, camp.y + Math.floor(rng() * 3) - 1, rng, v)
    detachOutcast(state, v)
    state.bandits.push(b)
    band.memberIds.push(b.id)
  }
  state.bands.push(band)
  if (!state.milestones.firstBandits) {
    state.milestones.firstBandits = true
    logEvent(state, `Des hors-la-loi dressent un camp — la ${band.name} dans les bois`)
  } else {
    logEvent(state, `La ${band.name} se forme — affamés et exclus prennent le maquis`)
  }
  return true
}

/** Vagabonds / road cutters drawn by village stores (medieval pressure, not scripted invasion). */
function tryFormWildernessBand(state: SimState, rng: () => number): boolean {
  if (state.bands.length >= MAX_BANDS) return false
  if (aliveBandits(state).length >= MAX_BANDITS - BAND_MIN) return false
  if (state.villages.length === 0) return false

  let bestVg = state.villages[0]!
  let bestScore = -1
  for (const vg of state.villages) {
    const s = villageRaidScore(state, vg.id)
    if (s > bestScore) {
      bestScore = s
      bestVg = vg
    }
  }
  // Need something worth stealing — surplus, pop, or low security.
  // Early unlock: still form camps even on lean villages (pressure of settlement alone).
  const early = state.tick < BANDIT_START_TICK + TICKS_PER_DAY * 14
  if (bestScore < 0.8 && !state.famine && !early) return false

  const camp = pickCampNearVillage(state, bestVg.centerX, bestVg.centerY, rng)
  if (!camp) return false

  const size = BAND_MIN + Math.floor(rng() * (BAND_MAX - BAND_MIN + 1))
  const bandId = state.nextBandId++
  const band: Band = {
    id: bandId,
    name: bandName(rng),
    campX: camp.x,
    campY: camp.y,
    hideoutTier: 'camp',
    campHealth: 2 + Math.floor(rng() * 3),
    memberIds: [],
    formedTick: state.tick,
    lastRaidTick: state.tick - TICKS_PER_DAY,
    raids: 0,
    tradeAmbushes: 0,
    origin: 'vagabonds',
  }
  for (let i = 0; i < size; i++) {
    const b = makeBandit(
      state,
      bandId,
      camp.x + Math.floor(rng() * 3) - 1,
      camp.y + Math.floor(rng() * 3) - 1,
      rng,
      null,
    )
    state.bandits.push(b)
    band.memberIds.push(b.id)
  }
  state.bands.push(band)
  if (!state.milestones.firstBandits) {
    state.milestones.firstBandits = true
    logEvent(state, `Une ${band.name} de vagabonds dresse un camp près des villages`)
  } else {
    logEvent(state, `Des coupe-jarrets rejoignent la ${band.name}`)
  }
  return true
}

export function tickBandFormation(state: SimState, rng: () => number) {
  if (state.tick < BANDIT_START_TICK) return
  if (state.tick % FORM_CHECK !== 0) return

  const living = aliveBandits(state).length
  const pressure =
    (state.famine ? 0.35 : 0) +
    (state.thefts > 6 ? 0.15 : 0) +
    Math.min(0.25, state.villages.reduce((a, v) => a + Math.max(0, (v.prosperity ?? 30) - 40) * 0.004, 0)) +
    Math.min(0.2, state.tradeRoutes.size * 0.04)

  // First fortnight after unlock: one camp wave — leave room for palisades.
  const earlyWindow = state.tick < BANDIT_START_TICK + TICKS_PER_DAY * 14
  const wantBands = earlyWindow ? state.bands.length < 1 : state.bands.length < 1 + Math.floor(pressure * 3)

  if (!wantBands && living >= BAND_MIN) return

  if (tryFormBandFromOutcasts(state, rng)) return
  // Wilderness bands are the reliable camp spawn (outcasts need misery first).
  if (earlyWindow || rng() < 0.4 + pressure) {
    tryFormWildernessBand(state, rng)
  }
}

function startRaid(state: SimState, band: Band, villageId: number) {
  band.lastRaidTick = state.tick
  band.raids += 1
  const members = bandMembers(state, band)
  for (const b of members) {
    b.phase = 'raid'
    b.targetVillageId = villageId
    b.targetVillagerId = null
  }
  const vg = state.villages.find((v) => v.id === villageId)
  if (vg) {
    vg.peaceTicks = 0
    logEvent(
      state,
      `La ${band.name} fond sur le village — pillards en marche`,
    )
  }
}

/** Camped brigands mend tents → timber hideout (repaire) in the wilds. */
function repairHideout(state: SimState, band: Band, members: Bandit[], rng: () => number) {
  if (members.length === 0) return
  const atCamp = members.filter((b) => b.phase === 'camp' && distance(b.x, b.y, band.campX, band.campY) < CAMP_WANDER)
  if (atCamp.length === 0) return
  if (band.campHealth >= CAMP_HEALTH_MAX && band.hideoutTier === 'lair') return

  // One repair tick per day when idle at camp.
  if (state.tick % TICKS_PER_DAY !== (band.id * 17) % TICKS_PER_DAY) return

  band.campHealth = Math.min(CAMP_HEALTH_MAX, band.campHealth + 1 + (atCamp.length > 3 ? 1 : 0))
  if (band.hideoutTier === 'camp' && band.campHealth >= 7) {
    band.hideoutTier = 'lair'
    logEvent(state, `La ${band.name} fortifie son repaire dans les bois`)
  } else if (rng() < 0.08 && band.hideoutTier === 'camp') {
    // Soft chronicle of ongoing repairs without spam.
    if ((state.tick + band.id) % (TICKS_PER_DAY * 5) < FORM_CHECK) {
      logEvent(state, `La ${band.name} raccommode son camp`)
    }
  }
}

function nearestTradeCaravan(state: SimState, band: Band): Villager | null {
  let best: Villager | null = null
  let bestD = TRADE_AMBUSH_RANGE * TRADE_AMBUSH_RANGE
  for (const v of state.villagers) {
    if (!v.alive || v.task?.kind !== 'tradeRun') continue
    const dx = v.x - band.campX
    const dy = v.y - band.campY
    const d = dx * dx + dy * dy
    // Prefer merchants between camp and villages (road cutters).
    if (d <= bestD) {
      bestD = d
      best = v
    }
  }
  return best
}

function startTradeAmbush(state: SimState, band: Band, trader: Villager) {
  band.lastRaidTick = state.tick
  band.tradeAmbushes = (band.tradeAmbushes ?? 0) + 1
  const members = bandMembers(state, band)
  for (const b of members) {
    b.phase = 'raid'
    b.targetVillageId = trader.villageId
    b.targetVillagerId = trader.id
  }
  logEvent(state, `La ${band.name} tend une embuscade sur la route marchande`)
}

function endRaidToCamp(band: Band, members: Bandit[]) {
  for (const b of members) {
    b.phase = 'camp'
    b.targetVillageId = null
    b.targetVillagerId = null
  }
  // Soft recenter camp on survivors (keeps hideout anchored in wilds).
  if (members.length > 0) {
    let sx = 0
    let sy = 0
    for (const b of members) {
      sx += b.x
      sy += b.y
    }
    band.campX = Math.round(sx / members.length)
    band.campY = Math.round(sy / members.length)
  }
}

function tickBandAI(state: SimState, band: Band, rng: () => number) {
  if (band.hideoutTier === undefined) band.hideoutTier = 'camp'
  if (band.campHealth === undefined) band.campHealth = 3
  if (band.tradeAmbushes === undefined) band.tradeAmbushes = 0

  const members = bandMembers(state, band)
  band.memberIds = members.map((m) => m.id)
  if (members.length === 0) {
    band.memberIds = []
    return
  }

  repairHideout(state, band, members, rng)

  const raiding = members.some((m) => m.phase === 'raid')
  const cooldown = TICKS_PER_DAY * (1.0 + rng() * 1.4)

  // Trade caravans near the hideout are juicy — ambush before a village razzia.
  if (!raiding && state.tick - band.lastRaidTick > cooldown * 0.55) {
    const caravan = nearestTradeCaravan(state, band)
    if (caravan && rng() < 0.55) {
      startTradeAmbush(state, band, caravan)
      return
    }
  }

  if (!raiding && state.tick - band.lastRaidTick > cooldown) {
    const target = pickRaidTarget(state, band)
    if (target !== null) {
      startRaid(state, band, target)
      return
    }
  }

  // If raid has lasted long or bag is full, pull back.
  if (raiding) {
    const stolen = members.reduce((a, m) => a + m.foodStolen, 0)
    const duration = state.tick - band.lastRaidTick
    if (stolen >= members.length * 2 || duration > TICKS_PER_DAY * 1.5) {
      if (stolen > 0) {
        logEvent(state, `La ${band.name} regagne les bois avec le butin`)
      }
      endRaidToCamp(band, members)
      for (const m of members) m.phase = 'flee'
    }
  }
}

function nearestVillagerPrey(state: SimState, b: Bandit, radius: number): Villager | null {
  let best: Villager | null = null
  let bestD = radius * radius
  for (const v of state.villagers) {
    if (!v.alive) continue
    const dx = v.x - b.x
    const dy = v.y - b.y
    const d = dx * dx + dy * dy
    if (d <= bestD) {
      bestD = d
      best = v
    }
  }
  return best
}

function tickOneBandit(state: SimState, b: Bandit, band: Band, rng: () => number) {
  if (tickBanditNeeds(b)) return
  if (b.hunger < 1.4) eatStolen(b)

  const grid = state.grid

  if (b.phase === 'flee' || b.phase === 'camp') {
    const dx = b.x - band.campX
    const dy = b.y - band.campY
    const distCamp = Math.sqrt(dx * dx + dy * dy)
    if (distCamp > CAMP_WANDER) {
      moveToward(b, band.campX, band.campY, BANDIT_SPEED, grid)
      if (b.phase === 'flee' && distCamp < 4) b.phase = 'camp'
      return
    }
    if (b.phase === 'flee') b.phase = 'camp'
    moveRandom(b, rng, grid, 2)
    return
  }

  // Raid phase
  const vg = b.targetVillageId !== null ? state.villages.find((v) => v.id === b.targetVillageId) : undefined
  if (!vg) {
    b.phase = 'camp'
    return
  }

  let prey =
    b.targetVillagerId !== null
      ? state.villagers.find((v) => v.id === b.targetVillagerId && v.alive)
      : undefined
  if (!prey) {
    prey = nearestVillagerPrey(state, b, 28) ?? undefined
    b.targetVillagerId = prey?.id ?? null
  }

  if (!prey) {
    moveToward(b, vg.centerX, vg.centerY, BANDIT_SPEED, grid)
    return
  }

  const d = distance(b.x, b.y, prey.x, prey.y)
  if (d > STEAL_RANGE) {
    moveToward(b, prey.x, prey.y, BANDIT_SPEED, grid)
    return
  }

  // Wall soft block — chip wood walls, stone stops until breached elsewhere.
  if (vg.wallTier !== 'none' && vg.perimeter.length > 0) {
    const inside = distance(prey.x, prey.y, vg.centerX, vg.centerY) <= 40
    const banditInside = distance(b.x, b.y, vg.centerX, vg.centerY) <= 40
    if (inside && !banditInside) {
      if (vg.wallTier === 'stone' && vg.wallHealth > 8) {
        moveRandom(b, rng, grid, 2)
        return
      }
      vg.wallHealth = Math.max(0, vg.wallHealth - (vg.wallTier === 'wood' ? 1.2 : 0.4))
      if (vg.wallHealth <= 0) {
        for (const cell of vg.perimeter) {
          const t = getTerrain(grid, cell.x, cell.y)
          if (t === WALL_WOOD || t === WALL_STONE) {
            // leave terrain change to wolf-style breach pattern via behaviors if needed
          }
        }
        vg.wallTier = 'none'
        vg.wallHealth = 0
        logEvent(state, `Les brigands ont forcé l'enceinte`)
      }
      return
    }
  }

  // Steal first; fight if empty-handed or prey is armed and resisting.
  const stole = stealFromVillager(state, b, prey)
  if (stole) {
    if (rng() < 0.12) {
      logEvent(state, `${b.name} dérobe des vivres à ${prey.name}`)
    }
    eatStolen(b)
    // After a successful steal, often slip away a step.
    if (rng() < 0.55) {
      moveToward(b, band.campX, band.campY, BANDIT_SPEED, grid)
    }
    return
  }

  // Brawl — unarmed theft turns violent.
  if (distance(b.x, b.y, prey.x, prey.y) <= FIGHT_RANGE) {
    const preyArmed = prey.toolTier !== 'none' || prey.profession === 'guard'
    const banditHit = 0.18 + b.courage * 0.18
    const preyHit = preyArmed ? 0.48 + prey.personality.courage * 0.22 : 0.18
    if (rng() < banditHit) {
      prey.health -= 1
      if (prey.health <= 0) {
        prey.alive = false
        state.deaths += 1
        state.deathsByBandit = (state.deathsByBandit ?? 0) + 1
        if (prey.villageId !== null) {
          const village = state.villages.find((x) => x.id === prey.villageId)
          if (village) village.recentDeaths = (village.recentDeaths ?? 0) + 1
        }
        logEvent(state, `${prey.name} a été tué par des brigands`)
        onDeath(state, prey, null)
        b.targetVillagerId = null
      }
    }
    if (rng() < preyHit) {
      b.health -= 1
      if (b.health <= 0) {
        b.alive = false
        // Spill some loot back to the fighter.
        for (const kind of FOOD_KINDS) {
          const n = countOf(b.loot, kind)
          if (n <= 0) continue
          const take = Math.min(n, 2)
          removeFromInventory(b.loot, kind, take)
          addToInventory(prey.inventory, kind, take)
        }
        if (rng() < 0.35) logEvent(state, `${prey.name} abat le brigand ${b.name}`)
      }
    }
    state.brawls += 1
  }
}

/** Villagers with weapons near a bandit deal damage (mirrors wolf combat). */
export function tickBanditCombat(state: SimState, rng: () => number) {
  for (const b of state.bandits) {
    if (!b.alive) continue
    for (const v of state.villagers) {
      if (!v.alive || v.toolTier === 'none') continue
      if (distance(v.x, v.y, b.x, b.y) > 2.2) continue
      const fighting =
        v.task?.kind === 'fight' ||
        v.task?.kind === 'defend' ||
        v.profession === 'guard' ||
        (v.task?.kind === 'flee' && false)
      if (!fighting && v.profession !== 'guard' && rng() > 0.15) continue
      const hit = 0.45 + (v.toolTier === 'iron' ? 0.2 : v.toolTier === 'stone' ? 0.1 : 0) + (v.profession === 'guard' ? 0.1 : 0)
      if (rng() < hit) {
        b.health -= 1
        if (b.health <= 0) {
          b.alive = false
          for (const kind of FOOD_KINDS) {
            const n = countOf(b.loot, kind)
            if (n <= 0) continue
            const take = Math.min(n, 2)
            removeFromInventory(b.loot, kind, take)
            addToInventory(v.inventory, kind, take)
          }
          if (rng() < 0.4) logEvent(state, `${v.name} disperse un brigand`)
        }
      }
      // Counterblow
      if (rng() < 0.18) {
        v.health -= 1
        if (v.health <= 0) {
          v.alive = false
          state.deaths += 1
          state.deathsByBandit = (state.deathsByBandit ?? 0) + 1
          logEvent(state, `${v.name} est tombé face aux brigands`)
          onDeath(state, v, null)
        }
      }
    }
  }
}

export function tickBandits(state: SimState, rng: () => number) {
  if (state.tick < BANDIT_START_TICK && state.bands.length === 0) return

  tickBandFormation(state, rng)

  for (const band of state.bands) {
    tickBandAI(state, band, rng)
    for (const id of band.memberIds) {
      const b = state.bandits.find((x) => x.id === id && x.alive)
      if (b) tickOneBandit(state, b, band, rng)
    }
  }

  if (state.tick % 2 === 0) tickBanditCombat(state, rng)

  // Compact dead bands periodically with entity GC.
  if (state.tick % 200 === 0) {
    state.bandits = state.bandits.filter((b) => b.alive)
    for (const band of state.bands) {
      band.memberIds = band.memberIds.filter((id) => state.bandits.some((b) => b.id === id && b.alive))
    }
    state.bands = state.bands.filter((b) => b.memberIds.length > 0)
  }
}

export function nearestBanditThreat(
  state: SimState,
  x: number,
  y: number,
  radius: number,
): Bandit | null {
  let best: Bandit | null = null
  let bestD = radius * radius
  for (const b of state.bandits) {
    if (!b.alive) continue
    if (b.phase !== 'raid' && b.phase !== 'flee') {
      // Camped brigands still scare if very close.
      const dx = b.x - x
      const dy = b.y - y
      const d = dx * dx + dy * dy
      if (d > (radius * 0.55) * (radius * 0.55)) continue
      if (d <= bestD) {
        bestD = d
        best = b
      }
      continue
    }
    const dx = b.x - x
    const dy = b.y - y
    const d = dx * dx + dy * dy
    if (d <= bestD) {
      bestD = d
      best = b
    }
  }
  return best
}

export function countBanditsNear(state: SimState, x: number, y: number, radius: number): number {
  let n = 0
  const r2 = radius * radius
  for (const b of state.bandits) {
    if (!b.alive) continue
    const dx = b.x - x
    const dy = b.y - y
    if (dx * dx + dy * dy <= r2) n++
  }
  return n
}
