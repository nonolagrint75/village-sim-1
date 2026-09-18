/**
 * Sticky known mine mouths (causal step 2).
 * Once claimed/opened, mouths stay in the registry (Village.hasMine / mineX / mineY).
 */

import { DEPLETED_METAL_FLOOR, MOUTH_STICKY } from './constants'
import { pushEvent } from './events'
import { aggregateVeinNear, primaryOreOf } from './richness'
import type {
  DepositSample,
  KnownMineMouth,
  MineLifeTag,
  MinesOreBag,
  MouthStatus,
} from './types'
import { cloneOreAmounts, emptyOreAmounts, sumOre } from './types'

export function mouthIdOf(bag: MinesOreBag): string {
  return `mouth:${bag.nextMouthId++}`
}

export function findMouthNear(
  bag: MinesOreBag,
  x: number,
  y: number,
  radius = 8,
): KnownMineMouth | null {
  let best: KnownMineMouth | null = null
  let bestD = Infinity
  for (const m of bag.mouths) {
    if (!MOUTH_STICKY && m.status === 'abandoned') continue
    const d = Math.abs(m.x - x) + Math.abs(m.y - y)
    if (d <= radius && d < bestD) {
      bestD = d
      best = m
    }
  }
  return best
}

export function findMouthById(bag: MinesOreBag, id: string): KnownMineMouth | null {
  return bag.mouths.find((m) => m.id === id) ?? null
}

export function villageMouth(bag: MinesOreBag, villageId: number): KnownMineMouth | null {
  return (
    bag.mouths.find(
      (m) =>
        m.villageId === villageId &&
        (m.status === 'open' || m.status === 'active' || m.status === 'claimed'),
    ) ??
    bag.mouths.find((m) => m.villageId === villageId) ??
    null
  )
}

export interface ClaimMouthOpts {
  tick: number
  actorId: number
  villageId?: number | null
  x: number
  y: number
  mountainX: number
  mountainY: number
  samples?: readonly DepositSample[]
  lifeTag?: MineLifeTag
}

/**
 * Sticky claim: miner/village remembers this mouth even before tunnel opens.
 * Compatible with behaviors claiming village.mineX/mineY before hasMine=true.
 */
export function claimMineMouth(bag: MinesOreBag, opts: ClaimMouthOpts): KnownMineMouth {
  const existing = findMouthNear(bag, opts.mountainX, opts.mountainY, 6)
  if (existing) {
    if (!existing.knownBy.includes(opts.actorId)) existing.knownBy.push(opts.actorId)
    if (existing.villageId == null && opts.villageId != null) existing.villageId = opts.villageId
    if (existing.status === 'prospect' || existing.status === 'abandoned') existing.status = 'claimed'
    return existing
  }

  const vein =
    opts.samples && opts.samples.length > 0
      ? aggregateVeinNear(opts.samples, opts.mountainX, opts.mountainY, 8)
      : emptyOreAmounts()

  const mouth: KnownMineMouth = {
    id: mouthIdOf(bag),
    villageId: opts.villageId ?? null,
    x: opts.mountainX,
    y: opts.mountainY,
    mountainX: opts.mountainX,
    mountainY: opts.mountainY,
    status: 'claimed',
    discoveredTick: opts.tick,
    openedTick: null,
    lastDigTick: null,
    knownBy: [opts.actorId],
    veinRemaining: cloneOreAmounts(vein),
    stockpile: emptyOreAmounts(),
    lifetimeExtracted: emptyOreAmounts(),
    primaryOre: primaryOreOf(vein),
    lifeTag: opts.lifeTag ?? 'generic',
  }
  bag.mouths.push(mouth)

  for (const v of bag.veins) {
    if (Math.abs(v.x - mouth.x) + Math.abs(v.y - mouth.y) <= 6) {
      if (v.status === 'rumor') v.status = 'confirmed'
      v.confidence = Math.min(1, v.confidence + 0.2)
    }
  }
  return mouth
}

/**
 * Mark mouth open — mirrors finalizeTunnelCell when isEntrance && village.hasMine.
 * Emits mouth_opened for visual layer.
 */
export function openMineMouth(
  bag: MinesOreBag,
  mouthId: string,
  opts: { tick: number; actorId?: number; x?: number; y?: number },
): KnownMineMouth | null {
  const mouth = findMouthById(bag, mouthId)
  if (!mouth) return null
  if (mouth.status === 'open' || mouth.status === 'active') {
    if (opts.x != null) mouth.x = opts.x
    if (opts.y != null) mouth.y = opts.y
    return mouth
  }
  mouth.status = 'open'
  mouth.openedTick = opts.tick
  if (opts.x != null) mouth.x = opts.x
  if (opts.y != null) mouth.y = opts.y
  if (opts.actorId != null && !mouth.knownBy.includes(opts.actorId)) {
    mouth.knownBy.push(opts.actorId)
  }
  pushEvent(bag, {
    kind: 'mouth_opened',
    tick: opts.tick,
    mouthId: mouth.id,
    actorId: opts.actorId,
    villageId: mouth.villageId,
    x: mouth.x,
    y: mouth.y,
    ore: mouth.primaryOre,
    intensity: 0.85,
    note: 'tunnel_entrance',
  })
  return mouth
}

export function rememberMouth(bag: MinesOreBag, mouthId: string, actorId: number): void {
  const m = findMouthById(bag, mouthId)
  if (!m) return
  if (!m.knownBy.includes(actorId)) m.knownBy.push(actorId)
}

export function actorKnowsMouth(mouth: KnownMineMouth, actorId: number): boolean {
  return mouth.knownBy.includes(actorId)
}

export function knownMouthsFor(
  bag: MinesOreBag,
  actorId: number,
  villageId?: number | null,
): KnownMineMouth[] {
  return bag.mouths.filter((m) => {
    if (m.status === 'abandoned' || m.status === 'depleted') return m.knownBy.includes(actorId)
    if (m.knownBy.includes(actorId)) return true
    if (villageId != null && m.villageId === villageId) return true
    return false
  })
}

export function markMouthActive(bag: MinesOreBag, mouthId: string, tick: number): void {
  const m = findMouthById(bag, mouthId)
  if (!m) return
  if (m.status === 'open' || m.status === 'claimed') m.status = 'active'
  m.lastDigTick = tick
}

export function refreshDepletion(bag: MinesOreBag, mouth: KnownMineMouth, tick: number): void {
  const metal = sumOre(mouth.veinRemaining, true)
  if (metal <= DEPLETED_METAL_FLOOR && mouth.status !== 'depleted' && mouth.status !== 'prospect') {
    mouth.status = 'depleted'
    for (const v of bag.veins) {
      if (Math.abs(v.x - mouth.x) + Math.abs(v.y - mouth.y) <= 8) v.status = 'exhausted'
    }
    pushEvent(bag, {
      kind: 'mouth_depleted',
      tick,
      mouthId: mouth.id,
      villageId: mouth.villageId,
      x: mouth.x,
      y: mouth.y,
      ore: mouth.primaryOre,
      amount: metal,
      intensity: 0.6,
    })
  }
}

export function setMouthStatus(mouth: KnownMineMouth, status: MouthStatus): void {
  mouth.status = status
}

/** Sync helper for Village.hasMine / mineX / mineY (sim integrator). */
export function villageMineFields(mouth: KnownMineMouth | null): {
  hasMine: boolean
  mineX: number
  mineY: number
} {
  if (!mouth || mouth.status === 'abandoned' || mouth.status === 'prospect') {
    return { hasMine: false, mineX: -1, mineY: -1 }
  }
  return {
    hasMine: mouth.openedTick != null,
    mineX: mouth.x,
    mineY: mouth.y,
  }
}