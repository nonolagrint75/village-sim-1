/**
 * Medieval brigand bands — outcasts / desperate folk who camp in the woods,
 * raid villages for food, and fight. No fantasy; emerges after founding settles.
 *
 * Emergence: prefer converting existing villagers (grievance, poverty, exile…) into
 * outlaws who walk to a fixed wilderness camp. Vagabond spawn is a rare fallback,
 * always outside settlement clear radius. Camp position is a stable world anchor.
 */
import { TICKS_PER_DAY } from './calendar'
import { countLifeEventKinds, hasLifeEventKind } from './cognition/memory'
import { peekMind } from './cognition/mindPool'
import { feelFamine, villagerFeelsFamine } from './ecology'
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
import { politicsOf } from './politics'
import { logEvent } from './social'
import { noteBanditUnlock, noteConflict } from './societyMetrics'
import {
  LOOT,
  TREE,
  WALL_STONE,
  WALL_WOOD,
  type Band,
  type Bandit,
  type SimState,
  type Villager,
  type WorldGrid,
} from './types'
import { distance, getTerrain, inBounds, isBlockingWall, isBuildableGround, setTerrain } from './world'

/**
 * Soft founding horizon (docs / probe label). Not a hard cliff alone —
 * pressure/outcasts may unlock after BANDIT_CALENDAR_FLOOR_DAY (WP10 anti-script).
 */
/** Soft horizon — calendar path only; pressure can unlock earlier. */
export const BANDIT_START_DAY = 28
/** Soft floor — poverty / weak control may unlock after ~day 5 (no pure day-gate). */
export const BANDIT_CALENDAR_FLOOR_DAY = 5
const BANDIT_START_TICK = TICKS_PER_DAY * BANDIT_START_DAY
const BANDIT_FLOOR_TICK = TICKS_PER_DAY * BANDIT_CALENDAR_FLOOR_DAY
/** Severe early window — outcasts + poverty can unlock from ~day 3. */
const BANDIT_PRESSURE_EARLY_TICK = TICKS_PER_DAY * 3

/** Shared pressure signal used for formation chance + early unlock. */
function bandPressure(state: SimState): number {
  let poverty = 0
  let weakControl = 0
  for (const vg of state.villages) {
    const prosp = vg.prosperity ?? 35
    if (prosp < 28) poverty += 0.12
    else if (prosp < 38) poverty += 0.06
    const sec = vg.security ?? 0.5
    const wall =
      vg.wallTier === 'stone' ? 0.55 : vg.wallTier === 'wood' ? 0.3 : vg.perimeter.length > 0 ? 0.12 : 0
    if (sec < 0.35 || wall < 0.12) weakControl += 0.1
    else if (sec < 0.48) weakControl += 0.05
  }
  return (
    (state.villages.some((vg) => feelFamine(state, vg)) ? 0.38 : 0) +
    (state.thefts > 4 ? 0.12 : 0) +
    (state.thefts > 10 ? 0.1 : 0) +
    Math.min(0.3, poverty) +
    Math.min(0.25, weakControl) +
    Math.min(0.15, state.tradeRoutes.size * 0.03)
  )
}

/**
 * Prefer condition (famine/theft/outcast/poverty/weak control) over calendar.
 * Soft day-28 is fallback only — never a forever gate.
 */
export function bandFormationUnlock(
  state: SimState,
): { ok: boolean; path: 'calendar' | 'pressure' | null } {
  const pressure = bandPressure(state)
  const hasOutcast = state.villagers.some((v) => isOutcastCandidate(state, v))
  const pressureOk =
    pressure >= 0.32 ||
    (hasOutcast && pressure >= 0.16) ||
    state.thefts > 8 ||
    (hasOutcast &&
      state.villages.some((vg) => (vg.prosperity ?? 35) < 30 || (vg.security ?? 0.5) < 0.38))
  const severeEarly =
    state.tick >= BANDIT_PRESSURE_EARLY_TICK &&
    (pressure >= 0.42 ||
      (hasOutcast && pressure >= 0.22) ||
      state.thefts > 10 ||
      (hasOutcast &&
        state.villages.some(
          (vg) =>
            feelFamine(state, vg) ||
            (vg.prosperity ?? 35) < 26 ||
            ((vg.security ?? 0.5) < 0.32 && (vg.wallTier === 'none' || vg.perimeter.length === 0)),
        )))

  if (state.tick < BANDIT_FLOOR_TICK) {
    if (severeEarly) return { ok: true, path: 'pressure' }
    return { ok: false, path: null }
  }
  if (pressureOk || severeEarly) return { ok: true, path: 'pressure' }
  if (state.tick >= BANDIT_START_TICK) return { ok: true, path: 'calendar' }
  return { ok: false, path: null }
}

const FORM_CHECK = TICKS_PER_DAY // once per day
const MAX_BANDS = 5
const MAX_BANDITS = 20
const BAND_MIN = 2
const BAND_MAX = 4
const RAID_RANGE = 38
const STEAL_RANGE = 1.6
const FIGHT_RANGE = 1.8
const CAMP_WANDER = 10
/** Never place or keep a camp inside this radius of a village center. */
const SETTLEMENT_CLEAR = 28
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

function tooCloseToSettlement(state: SimState, x: number, y: number, clear = SETTLEMENT_CLEAR): boolean {
  for (const vg of state.villages) {
    if (distance(x, y, vg.centerX, vg.centerY) < clear) return true
  }
  return false
}

function pickCampNearVillage(
  state: SimState,
  cx: number,
  cy: number,
  rng: () => number,
): { x: number; y: number } | null {
  const grid = state.grid
  for (let attempt = 0; attempt < 48; attempt++) {
    const angle = rng() * Math.PI * 2
    // Wilderness fringe — never plaza / courtyard spawn.
    const dist = SETTLEMENT_CLEAR + 6 + Math.floor(rng() * 36)
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
    if (trees < 2 && attempt < 32) continue
    if (tooCloseToSettlement(state, x, y)) continue
    return { x, y }
  }
  return null
}

function bandName(rng: () => number): string {
  const epithet = BAND_EPITHETS[Math.floor(rng() * BAND_EPITHETS.length)] ?? 'des bois'
  return `bande ${epithet}`
}

function spillBanditGroundLoot(state: SimState, b: Bandit): number {
  let total = 0
  for (const kind of FOOD_KINDS) {
    const n = countOf(b.loot, kind)
    if (n <= 0) continue
    total += removeFromInventory(b.loot, kind, n)
  }
  if (total <= 0) return 0
  const grid = state.grid
  const spots: Array<[number, number]> = [
    [0, 0],
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ]
  let rem = total
  for (const [dx, dy] of spots) {
    if (rem <= 0) break
    const x = (b.x | 0) + dx
    const y = (b.y | 0) + dy
    if (!inBounds(grid, x, y)) continue
    if (!isBuildableGround(grid, x, y) && getTerrain(grid, x, y) !== LOOT) continue
    const pile = Math.min(rem, Math.max(1, Math.ceil(rem / 2)))
    const i = y * grid.width + x
    const prev = grid.terrain[i] === LOOT ? grid.amount[i] ?? 0 : 0
    setTerrain(grid, x, y, LOOT, Math.min(20, prev + pile))
    rem -= pile
  }
  return total - rem
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
  // Desertion is not a counted death (no deaths++), but family/home/gear must not
  // become ghost refs — surviving spouses kept spouseId → dead deserter (A13).
  state.deserters = (state.deserters ?? 0) + 1
  v.task = null
  v.alive = false
  onDeath(state, v, null)
  if (v.villageId !== null) {
    const vg = state.villages.find((x) => x.id === v.villageId)
    if (vg) vg.memberIds = vg.memberIds.filter((id) => id !== v.id)
    v.villageId = null
  }
}

function hasKinNearby(state: SimState, v: Villager): boolean {
  if (v.spouseId !== null) {
    const s = state.villagers.find((x) => x.id === v.spouseId && x.alive)
    if (s) return true
  }
  for (const id of v.parentIds) {
    if (state.villagers.some((x) => x.id === id && x.alive)) return true
  }
  for (const r of v.relations.values()) {
    if (r.kinship > 0.35) return true
  }
  return false
}

function isOutcastCandidate(state: SimState, v: Villager): boolean {
  if (!v.alive || v.age < TICKS_PER_DAY * 16) return false
  const pol = politicsOf(v)
  const hungry = v.hunger < 1.1 || edibleValue(v.inventory) < 1
  const starving = v.hunger < 0.55
  const poor =
    countOf(v.inventory, 'coin') + (v.chestInventory ? countOf(v.chestInventory, 'coin') : 0) < 1 &&
    edibleValue(v.inventory) < 2
  const homeless = !v.hasHome || v.villageId === null
  const exiled = v.villageId === null || pol.migrationUrge > 0.48
  const grievance = pol.grievance > 0.48
  const politicalOutcast =
    pol.creed === 'vengeance' ||
    (pol.grievance > 0.55 && pol.legitimacy < 0.32) ||
    (v.ambition === 'revenge' && pol.grievance > 0.35)
  const failedAmbition =
    (v.ambition === 'leader' || v.ambition === 'wealth') &&
    pol.legitimacy < 0.25 &&
    pol.grievance > 0.35
  const mindEp = peekMind(v.id)?.episodic
  const crime =
    countLifeEventKinds(mindEp, v.memories, ['sawTheft', 'robbed'], { tick: state.tick, maxAge: 1200 }) >= 2 ||
    [...v.relations.values()].some((r) => r.history.some((h) => h.kind === 'theft') && r.affinity < -0.2)
  const excluded =
    hasLifeEventKind(mindEp, v.memories, ['harmed', 'insulted', 'robbed'], {
      tick: state.tick,
      maxAge: 1200,
    }) || [...v.relations.values()].filter((r) => r.affinity < -0.35).length >= 2
  const aloneHungry = hungry && !hasKinNearby(state, v) && edibleValue(v.inventory) < 1
  const unemployedLong = v.profession === 'none' && hungry
  const faminePush = villagerFeelsFamine(state, v) && hungry
  // Soft inequality / low SoL push — thriving worlds still produce outlaws from the bottom.
  const vg = v.villageId !== null ? state.villages.find((g) => g.id === v.villageId) : null
  const inequalityOut =
    !!vg &&
    (vg.inequalityStress ?? 0) > 0.4 &&
    pol.grievance > 0.32 &&
    (poor || hungry || pol.legitimacy < 0.35)
  // Brief hunger dips while carrying food must NOT desert — was converting mid-flee snackers.
  const destituteStarve =
    starving && (homeless || edibleValue(v.inventory) < 0.5 || v.starveTimer > Math.round(TICKS_PER_DAY * 0.5))
  return (
    grievance ||
    politicalOutcast ||
    failedAmbition ||
    inequalityOut ||
    (exiled && (hungry || poor)) ||
    (homeless && hungry) ||
    (excluded && hungry) ||
    (crime && (hungry || grievance)) ||
    aloneHungry ||
    destituteStarve ||
    (unemployedLong && (v.villageId === null || poor)) ||
    faminePush ||
    (poor && hungry && pol.grievance > 0.3)
  )
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
  const alivePop = state.villagers.filter((x) => x.alive).length
  if (alivePop >= 20 && v.hasChest && v.chestInventory) {
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

function tryRecruitIntoBand(state: SimState, v: Villager, rng: () => number): boolean {
  if (aliveBandits(state).length >= MAX_BANDITS) return false
  const open = state.bands.filter((b) => bandMembers(state, b).length < BAND_MAX)
  if (open.length === 0) return false
  // Prefer nearest camp in the wilds.
  let best: Band | null = null
  let bestD = Infinity
  for (const band of open) {
    const d = distance(v.x, v.y, band.campX, band.campY)
    if (d < bestD) {
      bestD = d
      best = band
    }
  }
  if (!best) return false
  const b = makeBandit(state, best.id, v.x, v.y, rng, v)
  b.phase = 'flee'
  detachOutcast(state, v)
  state.bandits.push(b)
  best.memberIds.push(b.id)
  logEvent(state, `${v.name} rejoint la ${best.name} — déserte pour le maquis`)
  return true
}

function tryFormBandFromOutcasts(state: SimState, rng: () => number): boolean {
  if (aliveBandits(state).length >= MAX_BANDITS) return false

  const candidates = state.villagers
    .filter((v) => isOutcastCandidate(state, v))
    .sort((a, b) => {
      const ga = politicsOf(a).grievance + (5 - a.hunger) * 0.15
      const gb = politicsOf(b).grievance + (5 - b.hunger) * 0.15
      return gb - ga
    })
  if (candidates.length === 0) return false

  // Lone deserter → join an existing band when possible.
  if (candidates.length === 1 || state.bands.length >= MAX_BANDS) {
    return tryRecruitIntoBand(state, candidates[0]!, rng)
  }

  if (state.bands.length >= MAX_BANDS) return false

  const lead = candidates[0]!
  const anchorVg =
    lead.villageId !== null
      ? state.villages.find((vg) => vg.id === lead.villageId)
      : state.villages[Math.floor(rng() * Math.max(1, state.villages.length))]
  const camp = pickCampNearVillage(
    state,
    anchorVg?.centerX ?? lead.x,
    anchorVg?.centerY ?? lead.y,
    rng,
  )
  if (!camp) return false

  const size = clamp(
    BAND_MIN + Math.floor(rng() * (BAND_MAX - BAND_MIN + 1)),
    BAND_MIN,
    Math.min(BAND_MAX, candidates.length),
  )
  const pick = candidates.slice(0, size)
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
    lastRaidTick: state.tick,
    raids: 0,
    tradeAmbushes: 0,
    origin: 'outcasts',
  }

  for (const v of pick) {
    // Stay at current tile and walk to camp — no plaza teleport massacre.
    const b = makeBandit(state, bandId, v.x, v.y, rng, v)
    b.phase = 'flee'
    detachOutcast(state, v)
    state.bandits.push(b)
    band.memberIds.push(b.id)
  }
  state.bands.push(band)
  if (!state.milestones.firstBandits) {
    state.milestones.firstBandits = true
    const unlock = bandFormationUnlock(state)
    if (unlock.path) noteBanditUnlock(state, unlock.path)
    logEvent(state, `Des hors-la-loi dressent un camp — la ${band.name} dans les bois`)
  } else {
    logEvent(state, `La ${band.name} se forme — affamés et exclus prennent le maquis`)
  }
  return true
}

/** Rare vagabonds / road cutters — wilderness only, never inside settlements. */
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
  const early = state.tick < BANDIT_START_TICK + TICKS_PER_DAY * 14
  if (bestScore < 1.2 && !feelFamine(state, bestVg) && !early) return false

  const camp = pickCampNearVillage(state, bestVg.centerX, bestVg.centerY, rng)
  if (!camp) return false

  // Small bands early — not a war party landing in the plaza.
  const size = early
    ? BAND_MIN + Math.floor(rng() * 2)
    : BAND_MIN + Math.floor(rng() * (BAND_MAX - BAND_MIN + 1))
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
    lastRaidTick: state.tick - Math.floor(TICKS_PER_DAY * 0.5),
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
    const unlock = bandFormationUnlock(state)
    if (unlock.path) noteBanditUnlock(state, unlock.path)
    logEvent(state, `Une ${band.name} de vagabonds dresse un camp près des villages`)
  } else {
    logEvent(state, `Des coupe-jarrets rejoignent la ${band.name}`)
  }
  return true
}

export function tickBandFormation(state: SimState, rng: () => number) {
  const unlock = bandFormationUnlock(state)
  if (!unlock.ok) return
  if (state.tick % FORM_CHECK !== 0) return

  const living = aliveBandits(state).length
  const pressure = bandPressure(state)

  const earlyWindow = state.tick < BANDIT_START_TICK + TICKS_PER_DAY * 14
  const wantBands = earlyWindow ? state.bands.length < 1 : state.bands.length < 1 + Math.floor(pressure * 3)

  if (!wantBands && living >= BAND_MIN) {
    // Still allow lone deserters to join existing bands under misery.
    if (living < MAX_BANDITS && rng() < 0.22 + pressure) {
      const lone = state.villagers.find((v) => isOutcastCandidate(state, v))
      if (lone) tryRecruitIntoBand(state, lone, rng)
    }
    return
  }

  // Prefer human deserters / outcasts; wilderness is fallback only.
  if (tryFormBandFromOutcasts(state, rng)) return
  // Early window: if no outcasts yet, still seed road-cutters so mid-game has brigands.
  const unlockTick = unlock.path === 'pressure' ? Math.max(BANDIT_FLOOR_TICK, state.tick - TICKS_PER_DAY) : BANDIT_START_TICK
  const daysSinceStart = Math.floor((state.tick - unlockTick) / TICKS_PER_DAY)
  const noBandsYet = state.bands.length === 0
  const wildChance = earlyWindow
    ? 0.28 + pressure * 0.55 + (noBandsYet && daysSinceStart >= 1 ? 0.42 : 0)
    : 0.12 + pressure + (noBandsYet ? 0.18 : 0)
  if (rng() < wildChance) {
    tryFormWildernessBand(state, rng)
  }
}

function startRaid(state: SimState, band: Band, villageId: number, rng: () => number) {
  band.lastRaidTick = state.tick
  band.raids += 1
  const members = bandMembers(state, band)
  // Only a raiding party leaves camp — rest hold the hideout.
  const partySize = Math.max(1, Math.min(members.length, 1 + Math.floor(members.length * (0.4 + rng() * 0.35))))
  const sorted = members.slice().sort((a, b) => b.courage + (5 - b.hunger) * 0.1 - (a.courage + (5 - a.hunger) * 0.1))
  for (let i = 0; i < sorted.length; i++) {
    const b = sorted[i]!
    if (i < partySize) {
      b.phase = 'raid'
      b.targetVillageId = villageId
      b.targetVillagerId = null
    } else {
      b.phase = 'camp'
      b.targetVillageId = null
      b.targetVillagerId = null
    }
  }
  const vg = state.villages.find((v) => v.id === villageId)
  if (vg) {
    vg.peaceTicks = 0
    noteConflict(state, 'raid')
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
  const partySize = Math.max(1, Math.min(members.length, 1 + Math.floor(members.length * 0.5)))
  const sorted = members.slice().sort((a, b) => b.courage - a.courage)
  for (let i = 0; i < sorted.length; i++) {
    const b = sorted[i]!
    if (i < partySize) {
      b.phase = 'raid'
      b.targetVillageId = trader.villageId
      b.targetVillagerId = trader.id
    }
  }
  logEvent(state, `La ${band.name} tend une embuscade sur la route marchande`)
}

function endRaidToCamp(members: Bandit[]) {
  for (const b of members) {
    if (b.phase === 'raid' || b.phase === 'flee') {
      b.phase = 'flee'
      b.targetVillageId = null
      b.targetVillagerId = null
    }
  }
  // Camp stays put — stable wilderness anchor. Bandits pathfind back; never snap camp to raiders.
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

  // If camp somehow drifted into a settlement (legacy save / old bug), push it back out once.
  if (tooCloseToSettlement(state, band.campX, band.campY, SETTLEMENT_CLEAR - 4)) {
    const anchor = state.villages[0]
    const fixed = pickCampNearVillage(
      state,
      anchor?.centerX ?? band.campX,
      anchor?.centerY ?? band.campY,
      rng,
    )
    if (fixed) {
      band.campX = fixed.x
      band.campY = fixed.y
    }
  }

  repairHideout(state, band, members, rng)

  const raiding = members.some((m) => m.phase === 'raid')
  // Occasional risky raids — not a daily plaza slaughter.
  const cooldown = TICKS_PER_DAY * (3.6 + rng() * 3.4)

  // Trade caravans near the hideout are juicy — ambush before a village razzia.
  if (!raiding && state.tick - band.lastRaidTick > cooldown * 0.7) {
    const caravan = nearestTradeCaravan(state, band)
    if (caravan && rng() < 0.26) {
      startTradeAmbush(state, band, caravan)
      return
    }
  }

  if (!raiding && state.tick - band.lastRaidTick > cooldown) {
    const target = pickRaidTarget(state, band)
    if (target !== null && rng() < 0.45) {
      startRaid(state, band, target, rng)
      return
    }
  }

  // If raid has lasted long, bag is full, or party is hurt — pull back to the fixed camp.
  if (raiding) {
    const raiders = members.filter((m) => m.phase === 'raid')
    const stolen = raiders.reduce((a, m) => a + m.foodStolen, 0)
    const wounded = raiders.filter((m) => m.health <= 2).length
    const duration = state.tick - band.lastRaidTick
    if (
      stolen >= Math.max(1, raiders.length) ||
      wounded >= Math.ceil(raiders.length * 0.4) ||
      duration > TICKS_PER_DAY * 0.85
    ) {
      if (stolen > 0) {
        logEvent(state, `La ${band.name} regagne les bois avec le butin`)
      }
      endRaidToCamp(members)
    }
  }
}

function nearestVillagerPrey(state: SimState, b: Bandit, radius: number): Villager | null {
  let best: Villager | null = null
  let bestD = radius * radius
  for (const v of state.villagers) {
    if (!v.alive) continue
    // Prefer soft targets near the raider — not a village-wide hunt radius.
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

  // Raid phase — wounded cutthroats break for camp.
  if (b.health <= 2 && rng() < 0.35) {
    b.phase = 'flee'
    b.targetVillagerId = null
    return
  }

  const vg = b.targetVillageId !== null ? state.villages.find((v) => v.id === b.targetVillageId) : undefined
  if (!vg) {
    b.phase = 'flee'
    return
  }

  let prey =
    b.targetVillagerId !== null
      ? state.villagers.find((v) => v.id === b.targetVillagerId && v.alive)
      : undefined
  if (!prey) {
    prey = nearestVillagerPrey(state, b, 16) ?? undefined
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
    // After a successful steal, usually slip toward camp.
    if (rng() < 0.72) {
      moveToward(b, band.campX, band.campY, BANDIT_SPEED, grid)
    }
    if (b.foodStolen >= 2 && rng() < 0.45) {
      b.phase = 'flee'
      b.targetVillagerId = null
    }
    return
  }

  // Armed prey → prefer break-off over brawl unless desperate.
  const preyArmed = prey.toolTier !== 'none' || prey.profession === 'guard'
  if (preyArmed && b.hunger > 1.0 && rng() < 0.55) {
    moveToward(b, band.campX, band.campY, BANDIT_SPEED, grid)
    if (rng() < 0.25) {
      b.phase = 'flee'
      b.targetVillagerId = null
    }
    return
  }

  // Brawl — unarmed theft turns violent (rarer, less lethal).
  if (distance(b.x, b.y, prey.x, prey.y) <= FIGHT_RANGE) {
    const banditHit = 0.05 + b.courage * 0.06
    const preyHit = preyArmed ? 0.58 + prey.personality.courage * 0.22 : 0.28
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
        for (const kind of FOOD_KINDS) {
          const n = countOf(b.loot, kind)
          if (n <= 0) continue
          const take = Math.min(n, 2)
          removeFromInventory(b.loot, kind, take)
          addToInventory(prey.inventory, kind, take)
        }
        spillBanditGroundLoot(state, b)
        if (rng() < 0.35) logEvent(state, `${prey.name} abat le brigand ${b.name}`)
      } else if (b.health <= 2) {
        b.phase = 'flee'
        b.targetVillagerId = null
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
          spillBanditGroundLoot(state, b)
          if (rng() < 0.4) logEvent(state, `${v.name} disperse un brigand`)
        }
      }
      // Counterblow
      if (rng() < 0.09) {
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

function maybeRedeemOutlaw(state: SimState, b: Bandit, band: Band, rng: () => number): boolean {
  if (!b.originVillagerId || b.phase !== 'camp') return false
  const origin = state.villagers.find((v) => v.id === b.originVillagerId)
  if (!origin || origin.alive) return false
  const originVg =
    origin.villageId != null ? state.villages.find((g) => g.id === origin.villageId) : null
  if (feelFamine(state, originVg)) return false
  // Need a little success / satiety before considering a return to civilian life.
  if (b.foodStolen < 1 && edibleValue(b.loot) < 2) return false
  if (b.hunger < 1.6) return false
  // Rare — high-variance path, not a scripted amnesty.
  if (rng() > 0.012) return false

  origin.alive = true
  origin.x = b.x
  origin.y = b.y
  origin.health = Math.max(2, Math.min(origin.health, b.health))
  origin.hunger = Math.min(3.2, Math.max(1.8, b.hunger))
  origin.villageId = null
  origin.hasHome = false
  const pol = politicsOf(origin)
  pol.grievance = Math.min(1, pol.grievance * 0.55)
  pol.migrationUrge = Math.max(pol.migrationUrge, 0.55)
  // Transfer a ration so they can walk toward settlement without instant re-desertion.
  for (const kind of FOOD_KINDS) {
    if (countOf(b.loot, kind) <= 0) continue
    if (removeFromInventory(b.loot, kind, 1) < 1) continue
    addToInventory(origin.inventory, kind, 1)
    break
  }
  b.alive = false
  band.memberIds = band.memberIds.filter((id) => id !== b.id)
  logEvent(state, `${origin.name} quitte le maquis — tente de refaire sa vie`)
  return true
}

export function tickBandits(state: SimState, rng: () => number) {
  // Hard floor only — soft day-40 / pressure unlock handled inside tickBandFormation.
  if (state.tick < BANDIT_FLOOR_TICK && state.bands.length === 0) return

  tickBandFormation(state, rng)

  for (const band of state.bands) {
    tickBandAI(state, band, rng)
    for (const id of band.memberIds) {
      const b = state.bandits.find((x) => x.id === id && x.alive)
      if (!b) continue
      if (maybeRedeemOutlaw(state, b, band, rng)) continue
      tickOneBandit(state, b, band, rng)
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
