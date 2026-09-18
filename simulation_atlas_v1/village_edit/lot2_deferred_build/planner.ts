/**
 * Dynamic home planner — NEEDS → spatial plan (rng + personality).
 * Same inputs can yield different footprints; never `if houseType === large`.
 */

import {
  designHouse,
  freshStyle,
  pickShape,
  type FloorMaterial,
  type HouseDesign,
  type HouseShape,
  type StyleWeights,
  type WallMaterial,
} from '../architecture'
import { expandRoomKinds, planRoomKinds, roomCountToSpan, type RoomKind } from '../rooms'
import { buildSkillScaleBias, cultureTagsFromContext, imitateStyleBias } from './culture'
import type {
  DoorSide,
  HomeNeedFocus,
  HomePlannerBrief,
  PlotClimateHint,
  SpatialHomePlan,
} from './types'

const DOOR_SIDES: DoorSide[] = ['S', 'E', 'W', 'N']

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v))
}

function pickDoorSide(personality: HomePlannerBrief['personality'], climate: PlotClimateHint, rng: () => number): DoorSide {
  // Cold → prefer south/east sun; curiosity → random facing.
  const weights = DOOR_SIDES.map((side) => {
    let w = 0.4 + rng() * (0.35 + personality.curiosity)
    if (climate.tempC < 8) {
      if (side === 'S') w += 1.2
      if (side === 'N') w -= 0.6
    }
    if (climate.nearWater && side === 'S') w += 0.25
    if (personality.sociability > 0.6 && side === 'S') w += 0.35
    return w
  })
  let best = 0
  for (let i = 1; i < weights.length; i++) if (weights[i]! > weights[best]!) best = i
  return DOOR_SIDES[best]!
}

function pickWallMaterial(brief: HomePlannerBrief, rng: () => number): WallMaterial {
  // Never plan stone walls without stone on hand — otherwise shells stall forever.
  if (brief.stoneOnHand < 2) {
    if (brief.buildSkill > 0.55 && rng() > 0.55) return 'timber'
    return 'wood'
  }
  const stonePull =
    brief.stoneOnHand * 0.12 +
    brief.climate.stoneAccess * 1.4 +
    (brief.profession === 'mason' ? 0.9 : 0) +
    (brief.neighbors.filter((n) => n.wallMaterial === 'stone').length > 0 ? 0.35 : 0)
  const woodPull =
    brief.woodOnHand * 0.08 +
    brief.climate.timberAccess * 1.1 +
    (brief.profession === 'lumberjack' ? 0.5 : 0) +
    0.4
  const whim = rng()
  if (stonePull > woodPull + 0.35 + whim * 0.4) return 'stone'
  if (brief.buildSkill > 0.55 && whim > 0.55) return 'timber'
  return 'wood'
}

function pickFloorMaterial(brief: HomePlannerBrief, wall: WallMaterial, rng: () => number): FloorMaterial {
  // Starter homes always get plank — grass interiors fail livability / smoke.
  if (brief.mode === 'new') return 'plank'
  if (brief.climate.moisture > 0.62 || brief.climate.nearWater) return 'plank'
  if (brief.wealth > 10 || brief.household >= 3) return 'plank'
  if (wall === 'stone' && rng() < 0.55) return 'dirt'
  if (brief.woodOnHand < 3 && rng() < 0.5) return 'plank'
  return rng() < 0.65 ? 'plank' : 'dirt'
}

function focusRooms(focus: HomeNeedFocus[], base: RoomKind[], rng: () => number): RoomKind[] {
  const rooms = [...base]
  const push = (k: RoomKind) => {
    if (!rooms.includes(k) || k === 'chambre') rooms.push(k)
  }
  for (const f of focus) {
    if (f === 'sleep') push('chambre')
    if (f === 'workshop') push('atelier')
    if (f === 'storage') push('reserve')
    if (f === 'kitchen') {
      push('cuisine')
      if (rng() < 0.55) push('salle_a_manger')
    }
    if (f === 'warmth' && rng() < 0.7) push('cuisine')
    if (f === 'prestige' && rng() < 0.5) push('hall')
  }
  return rooms
}

function jitterSpan(
  rx: number,
  ry: number,
  brief: HomePlannerBrief,
  rng: () => number,
): { rx: number; ry: number } {
  const skill = buildSkillScaleBias(brief.buildSkill)
  const coldShrink = brief.climate.tempC < 6 ? 0.85 : 1
  const wealthPush = 1 + Math.min(0.35, brief.wealth / 40)
  const matCap = brief.woodOnHand + brief.stoneOnHand * 1.2 < 4 ? 0.9 : 1
  const whimX = 0.85 + rng() * 0.35
  const whimY = 0.85 + rng() * 0.35
  let outRx = Math.round(clamp(rx * skill * coldShrink * wealthPush * matCap * whimX, 2, 8))
  let outRy = Math.round(clamp(ry * skill * coldShrink * wealthPush * matCap * whimY, 2, 7))
  // Ambition elongates; thrift (generosity + low ambition) compacts.
  if (brief.personality.ambition > 0.65 && rng() < 0.55) outRx = Math.min(8, outRx + 1)
  if (brief.personality.ambition < 0.35 && brief.personality.generosity > 0.5 && rng() < 0.5) {
    outRx = Math.max(2, outRx - 1)
    outRy = Math.max(2, outRy - 1)
  }
  return { rx: outRx, ry: outRy }
}

function styleFromBrief(brief: HomePlannerBrief, rng: () => number): StyleWeights {
  let style = freshStyle(rng)
  if (brief.stylePrior) {
    for (const s of Object.keys(brief.stylePrior) as HouseShape[]) {
      const v = brief.stylePrior[s]
      if (typeof v === 'number') style[s] = (style[s] ?? 0.5) * 0.5 + v * 0.5
    }
  }
  style = imitateStyleBias(
    style,
    brief.neighbors,
    brief.personality.sociability,
    brief.personality.curiosity,
  )
  // Profession soft priors — never hard template branches.
  if (brief.profession === 'farmer' && rng() < 0.45) style.longhouse += 0.8
  if (brief.profession === 'trader' && rng() < 0.4) style.courtyard += 0.55
  if (brief.artisan && rng() < 0.5) style.ell += 0.65
  if (brief.climate.tempC < 5) style.square += 0.4
  return style
}

/**
 * Generate a unique spatial plan for a new home or an expansion.
 * Uses rng on every structural choice — identical briefs diverge.
 */
export function planHomeSpatial(brief: HomePlannerBrief, rng: () => number): SpatialHomePlan {
  if (brief.mode === 'expand' && brief.existing) {
    return planExpansion(brief, brief.existing, rng)
  }

  const style = styleFromBrief(brief, rng)
  let shape = pickShape(style, brief.personality, rng)
  // Starter / wood-poor homes: coherent rect shells only — round/ell/courtyard
  // leave jagged mid-build rings (S2) and orphan stubs (S1).
  if (brief.mode === 'new' && (brief.woodOnHand < 18 || brief.household <= 2)) {
    if (shape === 'round' || shape === 'ell' || shape === 'courtyard') {
      shape = rng() < 0.55 ? 'square' : 'rect'
    }
  }
  // Parametric sizing via legacy designHouse — NOT a named house model.
  let design = designHouse(
    {
      personality: brief.personality,
      wealth: brief.wealth,
      household: brief.household,
      artisan: brief.artisan,
      merchant: brief.merchant,
    },
    shape,
  )

  let roomKinds = focusRooms(brief.needFocus, design.roomKinds, rng)
  // Extra chambre when sleep pressure / large household (non-deterministic count).
  if (brief.needFocus.includes('sleep') && brief.household >= 3 && rng() < 0.6) {
    roomKinds = [...roomKinds, 'chambre']
  }
  if (brief.woodOnHand + brief.stoneOnHand < 3 && brief.household <= 2) {
    // Scarcity: compact but still unique — shuffle which secondary room survives.
    const core: RoomKind[] = ['hall', 'chambre']
    const extras = roomKinds.filter((k) => k !== 'hall' && k !== 'chambre')
    if (extras.length > 0 && rng() < 0.7) core.push(extras[Math.floor(rng() * extras.length)]!)
    roomKinds = core
  }
  // First homes: at most 2 rooms so exterior shell closes before wood runs out.
  if (brief.mode === 'new' && brief.woodOnHand < 14) {
    roomKinds = roomKinds.filter((k, i) => k === 'chambre' || k === 'hall' || i < 2).slice(0, 2)
    if (roomKinds.length === 0) roomKinds = ['chambre']
  }

  const sized = roomCountToSpan(roomKinds.length, design.rx, design.ry)
  let jitter = jitterSpan(sized.rx, sized.ry, brief, rng)
  // Anti-clone: nudge span so identical square cabins don't share wall hashes.
  // Pioneer scarcity: keep first shells tiny (≤2) — rx=4 stalls camps with 0 starter wood.
  const pioneerLean = brief.mode === 'new' && brief.woodOnHand < 10
  const spanCap = pioneerLean ? 2 : 4
  if (brief.mode === 'new') {
    if (!pioneerLean) {
      if (rng() < 0.45) jitter = { ...jitter, rx: Math.min(spanCap, jitter.rx + 1) }
      else if (rng() < 0.4) jitter = { ...jitter, ry: Math.min(spanCap, Math.max(2, jitter.ry + 1) ) }
      if (brief.neighbors.some((n) => n.rx === jitter.rx && n.ry === jitter.ry) && rng() < 0.75) {
        jitter = {
          rx: Math.min(spanCap, jitter.rx + 1),
          ry: Math.min(spanCap, Math.max(2, jitter.ry + (rng() < 0.5 ? 1 : 0))),
        }
      }
    }
    // Allow 1×1 cabins when timber-starved — 2×2 (~15 walls) never closed by day 60.
    const minSpan = pioneerLean && brief.woodOnHand < 4 ? 1 : 2
    jitter = {
      rx: Math.min(spanCap, Math.max(minSpan, jitter.rx)),
      ry: Math.min(spanCap, Math.max(minSpan, jitter.ry)),
    }
  }
  const wallMaterial = pickWallMaterial(brief, rng)
  const floorMaterial = pickFloorMaterial(brief, wallMaterial, rng)
  const doorSide = pickDoorSide(brief.personality, brief.climate, rng)
  const windowCount = clamp(
    Math.floor(1 + brief.personality.curiosity * 2 + rng() * 2 + (brief.wealth > 8 ? 1 : 0)),
    0,
    5,
  )

  design = {
    ...design,
    rx: jitter.rx,
    ry: jitter.ry,
    roomKinds,
    bedSlots: clamp(
      Math.max(
        roomKinds.filter((k) => k === 'chambre').length,
        Math.floor(brief.household * (0.6 + rng() * 0.5)),
      ),
      1,
      6,
    ),
    hasWorkshop: design.hasWorkshop || roomKinds.includes('atelier') || brief.needFocus.includes('workshop'),
    hasStoreroom: design.hasStoreroom || roomKinds.includes('reserve') || brief.needFocus.includes('storage'),
    doorSide,
    wallMaterial,
    floorMaterial,
  }

  const reasons: string[] = []
  if (brief.climate.tempC < 6) reasons.push('froid local → abri compact')
  if (brief.climate.nearWater) reasons.push('humidité → plancher')
  if (brief.neighbors.length > 0) reasons.push(`imitation soft (${brief.neighbors.length} voisins)`)
  if (brief.artisan) reasons.push('métier → atelier')
  if (brief.needFocus.includes('storage')) reasons.push('besoin de réserve')
  if (wallMaterial === 'stone') reasons.push('pierre à portée / maçon')
  reasons.push(`caprice ${shape}`)

  return {
    design,
    doorSide,
    wallMaterial,
    floorMaterial,
    windowCount,
    reasons: reasons.slice(0, 5),
    mode: 'new',
    cultureTags: cultureTagsFromContext(brief.profession, brief.neighbors, rng),
  }
}

function planExpansion(brief: HomePlannerBrief, existing: HouseDesign, rng: () => number): SpatialHomePlan {
  const current = existing.roomKinds?.length ? existing.roomKinds : planRoomKinds({
    household: brief.household,
    wealth: brief.wealth,
    artisan: brief.artisan,
    merchant: brief.merchant,
  })
  let expanded =
    expandRoomKinds(current, {
      household: brief.household,
      wealth: brief.wealth,
      artisan: brief.artisan,
    }) ?? [...current]

  for (const f of brief.needFocus) {
    if (f === 'sleep' && expanded.filter((k) => k === 'chambre').length < Math.ceil(brief.household / 2)) {
      expanded = [...expanded, 'chambre']
    }
    if (f === 'workshop' && !expanded.includes('atelier')) expanded = [...expanded, 'atelier']
    if (f === 'storage' && !expanded.includes('reserve')) expanded = [...expanded, 'reserve']
    if (f === 'kitchen' && !expanded.includes('cuisine') && rng() < 0.75) {
      expanded = [...expanded, 'cuisine']
    }
  }

  // Non-deterministic growth direction.
  let { rx, ry } = roomCountToSpan(expanded.length, existing.rx, existing.ry)
  if (rng() < 0.5) rx = Math.min(9, Math.max(rx, existing.rx + 1))
  else ry = Math.min(7, Math.max(ry, existing.ry + 1))
  if (brief.personality.ambition > 0.7 && rng() < 0.4) rx = Math.min(9, rx + 1)

  const wallMaterial = existing.wallMaterial ?? pickWallMaterial(brief, rng)
  const floorMaterial = existing.floorMaterial ?? pickFloorMaterial(brief, wallMaterial, rng)
  const doorSide = existing.doorSide ?? pickDoorSide(brief.personality, brief.climate, rng)

  const design: HouseDesign = {
    ...existing,
    rx,
    ry,
    roomKinds: expanded,
    bedSlots: Math.max(existing.bedSlots, expanded.filter((k) => k === 'chambre').length),
    hasWorkshop: existing.hasWorkshop || expanded.includes('atelier'),
    hasStoreroom: existing.hasStoreroom || expanded.includes('reserve'),
    doorSide,
    wallMaterial,
    floorMaterial,
  }

  const windowCount = clamp(1 + Math.floor(rng() * 2) + (rx + ry > 6 ? 1 : 0), 0, 5)
  return {
    design,
    doorSide,
    wallMaterial,
    floorMaterial,
    windowCount,
    reasons: [`agrandissement (${expanded.length} pièces)`, ...brief.needFocus.slice(0, 2)],
    mode: 'expand',
    cultureTags: cultureTagsFromContext(brief.profession, brief.neighbors, rng),
  }
}

/** Thin fallback when planner context is incomplete — still parametric, not a model id. */
export function fallbackLeanPlan(brief: Pick<HomePlannerBrief, 'personality' | 'household' | 'wealth' | 'artisan' | 'merchant'>, rng: () => number): SpatialHomePlan {
  const style = freshStyle(rng)
  const shape = pickShape(style, brief.personality, rng)
  const design = designHouse(
    {
      personality: brief.personality,
      wealth: brief.wealth,
      household: brief.household,
      artisan: brief.artisan,
      merchant: brief.merchant,
    },
    shape,
  )
  const doorSide = DOOR_SIDES[Math.floor(rng() * DOOR_SIDES.length)]!
  return {
    design: { ...design, doorSide, wallMaterial: 'timber', floorMaterial: 'plank' },
    doorSide,
    wallMaterial: 'timber',
    floorMaterial: 'plank',
    windowCount: rng() < 0.5 ? 1 : 0,
    reasons: ['repli paramétrique'],
    mode: 'new',
    cultureTags: [],
  }
}
