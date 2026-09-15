import { LAND_PROFILE, nudgeToward } from './pathfinding'
import { countOf, removeFromInventory } from './inventory'
import { logEvent } from './social'
import { DIRT, GRASS, type Horse, type SimState, type Villager } from './types'
import { clamp, distance, getTerrain, isBlockingWall, setTerrain } from './world'

const HORSE_HEALTH_MAX = 3
const HUNGER_MAX = 4
const HORSE_HUNGER_DECAY = 1 / 260
const HORSE_STARVE_TICKS = 300
const HORSE_BREED_COOLDOWN = 700
export const MAX_WILD_HORSES = 22
export const HORSE_SPEED_BONUS = 2
/** Capacité pack cheval (kg) — alignée physicsScale.HORSE_PACK_KG. */
export const HORSE_CARRY_BONUS = 35
const FLEE_RADIUS = 12

export function makeHorse(id: number, x: number, y: number, hunger = 3): Horse {
  return {
    id,
    x,
    y,
    health: HORSE_HEALTH_MAX,
    hunger,
    starveTimer: 0,
    healTimer: 0,
    tamed: false,
    ownerId: null,
    riderId: null,
    breedCooldown: 0,
    alive: true,
  }
}

export function tameChance(v: Villager, hasTreat: boolean): number {
  const patience = v.personality.generosity * 0.3 + (1 - v.personality.ambition) * 0.2
  return clamp(0.05 + patience * 0.35 + (hasTreat ? 0.35 : 0) + v.personality.courage * 0.15, 0.03, 0.85)
}

export function tryTame(state: SimState, v: Villager, horse: Horse, rng: () => number): boolean {
  const hasTreat = countOf(v.inventory, 'wheat') > 0
  if (rng() >= tameChance(v, hasTreat)) {
    horse.x = clamp(horse.x + (horse.x - v.x) * 3, 0, state.grid.width - 1)
    horse.y = clamp(horse.y + (horse.y - v.y) * 3, 0, state.grid.height - 1)
    return false
  }
  if (hasTreat) removeFromInventory(v.inventory, 'wheat', 1)
  horse.tamed = true
  horse.ownerId = v.id
  v.horseId = horse.id
  logEvent(state, `${v.name} a dressé un cheval`)
  return true
}

export function tickHorse(state: SimState, h: Horse, rng: () => number) {
  if (h.breedCooldown > 0) h.breedCooldown -= 1

  if (h.riderId !== null) {
    const rider = state.villagers.find((v) => v.id === h.riderId && v.alive)
    if (!rider) {
      h.riderId = null
    } else {
      h.x = rider.x
      h.y = rider.y
    }
  }

  const decay = state.season === 'winter' ? HORSE_HUNGER_DECAY * 1.3 : HORSE_HUNGER_DECAY
  h.hunger = Math.max(0, h.hunger - decay)
  if (h.hunger <= 0) {
    h.starveTimer += 1
    if (h.starveTimer >= HORSE_STARVE_TICKS) {
      h.alive = false
      const owner = h.ownerId !== null ? state.villagers.find((v) => v.id === h.ownerId) : undefined
      if (owner) {
        owner.horseId = null
        owner.mounted = false
        logEvent(state, `Le cheval de ${owner.name} est mort de faim`)
      }
      return
    }
  } else {
    h.starveTimer = 0
  }

  if (h.riderId !== null) return

  if (h.hunger <= 2 && state.season !== 'winter') {
    if (getTerrain(state.grid, h.x, h.y) === GRASS) {
      setTerrain(state.grid, h.x, h.y, DIRT)
      h.hunger = Math.min(HUNGER_MAX, h.hunger + 1)
      return
    }
  }

  if (!h.tamed) {
    let threatX = 0
    let threatY = 0
    let threatened = false
    for (const w of state.wolves) {
      if (!w.alive) continue
      if (distance(w.x, w.y, h.x, h.y) < FLEE_RADIUS) {
        threatX += h.x - w.x
        threatY += h.y - w.y
        threatened = true
      }
    }
    if (threatened) {
      nudgeToward(state.grid, h, h.x + Math.sign(threatX) * 8, h.y + Math.sign(threatY) * 8, 3, LAND_PROFILE)
      return
    }

    let mateX = 0
    let mateY = 0
    let mates = 0
    for (const o of state.horses) {
      if (!o.alive || o.tamed || o.id === h.id) continue
      if (distance(o.x, o.y, h.x, h.y) > 20) continue
      mateX += o.x
      mateY += o.y
      mates++
    }
    if (mates > 0) {
      const cx = mateX / mates
      const cy = mateY / mates
      if (distance(cx, cy, h.x, h.y) > 5) {
        nudgeToward(state.grid, h, Math.round(cx), Math.round(cy), 2, LAND_PROFILE)
        return
      }
    }
  }

  const range = h.tamed ? 1 : 2
  const nx = clamp(h.x + Math.floor(rng() * (2 * range + 1)) - range, 0, state.grid.width - 1)
  const ny = clamp(h.y + Math.floor(rng() * (2 * range + 1)) - range, 0, state.grid.height - 1)
  if (!isBlockingWall(state.grid, nx, ny)) {
    h.x = nx
    h.y = ny
  }
}

export function tickHorseBreeding(state: SimState) {
  let wild = 0
  for (const h of state.horses) if (h.alive && !h.tamed) wild++
  if (wild >= MAX_WILD_HORSES || state.season === 'winter') return

  for (const a of state.horses) {
    if (!a.alive || a.breedCooldown > 0 || a.hunger < 3) continue
    for (const b of state.horses) {
      if (b.id === a.id || !b.alive || b.breedCooldown > 0 || b.hunger < 3) continue
      if (a.tamed !== b.tamed) continue
      if (distance(a.x, a.y, b.x, b.y) > 2) continue
      a.breedCooldown = HORSE_BREED_COOLDOWN
      b.breedCooldown = HORSE_BREED_COOLDOWN
      const foal = makeHorse(state.nextId++, a.x, a.y, 2)
      if (a.tamed) {
        foal.tamed = true
        foal.ownerId = a.ownerId
      }
      foal.breedCooldown = HORSE_BREED_COOLDOWN
      state.horses.push(foal)
      return
    }
  }
}
