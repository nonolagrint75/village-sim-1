/**
 * Ground items (§57) — drop / pickup / decay helpers (staging).
 * Causal only: work leftovers, combat/raid drops, trade spills.
 * No day-calendar spawn toys.
 */

import {
  GROUND_DECAY_TICKS,
  GROUND_MERGE_CAP,
  type GroundItem,
  type GroundItemKind,
  type GroundItemsBag,
  type GroundLifeTag,
  type GroundSource,
  type GroundVisualEvent,
  type ToolTier,
} from './types'

function pushEvent(bag: GroundItemsBag, ev: GroundVisualEvent) {
  bag.events.push(ev)
  if (bag.events.length > 64) bag.events.splice(0, bag.events.length - 64)
}

function allocId(bag: GroundItemsBag): string {
  const id = `gi_${bag.nextId}`
  bag.nextId += 1
  return id
}

function sameCellKind(
  a: GroundItem,
  x: number,
  y: number,
  kind: GroundItemKind,
  resource: string,
) {
  return a.x === x && a.y === y && a.kind === kind && a.resource === resource
}

/**
 * Drop or merge into an existing pile at (x,y).
 * Wood piles should also bump live grid amount via integrator (DIRT/GRASS+amount).
 */
export function dropGroundItem(
  bag: GroundItemsBag,
  opts: {
    tick: number
    x: number
    y: number
    kind: GroundItemKind
    resource: string
    amount: number
    source: GroundSource
    actorId?: number | null
    villageId?: number | null
    toolTier?: ToolTier | null
    lifeTag?: GroundLifeTag
  },
): GroundItem | null {
  const amount = Math.max(0, Math.floor(opts.amount))
  if (amount <= 0) return null

  const existing = bag.items.find((it) =>
    sameCellKind(it, opts.x, opts.y, opts.kind, opts.resource),
  )
  const cap = GROUND_MERGE_CAP[opts.kind]

  if (existing) {
    const before = existing.amount
    existing.amount = Math.min(cap, existing.amount + amount)
    existing.lastTouchTick = opts.tick
    existing.freshness = Math.min(1, existing.freshness + 0.15)
    if (existing.amount > before) {
      pushEvent(bag, {
        kind: 'pile_grew',
        tick: opts.tick,
        itemId: existing.id,
        actorId: opts.actorId ?? undefined,
        villageId: opts.villageId ?? null,
        x: opts.x,
        y: opts.y,
        itemKind: opts.kind,
        resource: opts.resource,
        amount: existing.amount - before,
        intensity: Math.min(1, existing.amount / cap),
      })
    }
    return existing
  }

  const item: GroundItem = {
    id: allocId(bag),
    x: opts.x,
    y: opts.y,
    kind: opts.kind,
    resource: opts.resource,
    amount: Math.min(cap, amount),
    source: opts.source,
    actorId: opts.actorId ?? null,
    villageId: opts.villageId ?? null,
    droppedTick: opts.tick,
    lastTouchTick: opts.tick,
    freshness: 1,
    toolTier: opts.kind === 'tool_discard' ? (opts.toolTier ?? 'wood') : null,
    lifeTag: opts.lifeTag ?? 'generic',
  }
  bag.items.push(item)
  pushEvent(bag, {
    kind: opts.kind === 'tool_discard' ? 'tool_left' : 'item_dropped',
    tick: opts.tick,
    itemId: item.id,
    actorId: opts.actorId ?? undefined,
    villageId: opts.villageId ?? null,
    x: opts.x,
    y: opts.y,
    itemKind: item.kind,
    resource: item.resource,
    amount: item.amount,
    intensity: Math.min(1, item.amount / cap),
  })
  return item
}

export function dropFromWorkChop(
  bag: GroundItemsBag,
  tick: number,
  x: number,
  y: number,
  woodLeft: number,
  actorId: number,
  villageId: number | null,
) {
  return dropGroundItem(bag, {
    tick,
    x,
    y,
    kind: 'wood_pile',
    resource: 'wood',
    amount: woodLeft,
    source: 'work_chop',
    actorId,
    villageId,
  })
}

export function dropFromCombatDeath(
  bag: GroundItemsBag,
  tick: number,
  x: number,
  y: number,
  carried: Array<{ resource: string; amount: number }>,
  actorId: number,
  hadTool: ToolTier,
) {
  let last: GroundItem | null = null
  for (const c of carried) {
    if (c.amount <= 0) continue
    const kind: GroundItemKind =
      c.resource === 'wood'
        ? 'wood_pile'
        : c.resource === 'gold' || c.resource === 'coin'
          ? 'coin_spill'
          : /food|bread|wheat|meat|fish|berry/.test(c.resource)
            ? 'food_pile'
            : /iron|gold|ore|stone|coal/.test(c.resource)
              ? 'ore_pile'
              : 'loot_goods'
    last = dropGroundItem(bag, {
      tick,
      x,
      y,
      kind,
      resource: c.resource,
      amount: c.amount,
      source: 'combat_death',
      actorId,
      villageId: null,
    })
  }
  if (hadTool !== 'none') {
    last = dropGroundItem(bag, {
      tick,
      x,
      y,
      kind: 'tool_discard',
      resource: `tool_${hadTool}`,
      amount: 1,
      source: 'combat_death',
      actorId,
      toolTier: hadTool,
    })
  }
  return last
}

export function dropFromTradeSpill(
  bag: GroundItemsBag,
  tick: number,
  x: number,
  y: number,
  resource: string,
  amount: number,
  actorId: number,
  villageId: number | null,
) {
  return dropGroundItem(bag, {
    tick,
    x,
    y,
    kind: amount >= 4 ? 'trade_crate' : 'bag',
    resource,
    amount,
    source: 'trade_spill',
    actorId,
    villageId,
  })
}

export function dropFromRaid(
  bag: GroundItemsBag,
  tick: number,
  x: number,
  y: number,
  resource: string,
  amount: number,
) {
  return dropGroundItem(bag, {
    tick,
    x,
    y,
    kind: 'loot_goods',
    resource,
    amount,
    source: 'raid_drop',
    actorId: null,
    villageId: null,
  })
}

export function pickupGroundItem(
  bag: GroundItemsBag,
  opts: {
    tick: number
    x: number
    y: number
    kind?: GroundItemKind
    resource?: string
    want: number
    actorId: number
  },
): { taken: number; itemId: string | null; resource: string | null } {
  const want = Math.max(0, Math.floor(opts.want))
  if (want <= 0) return { taken: 0, itemId: null, resource: null }

  const idx = bag.items.findIndex((it) => {
    if (it.x !== opts.x || it.y !== opts.y) return false
    if (opts.kind && it.kind !== opts.kind) return false
    if (opts.resource && it.resource !== opts.resource) return false
    return it.amount > 0
  })
  if (idx < 0) return { taken: 0, itemId: null, resource: null }

  const it = bag.items[idx]!
  const taken = Math.min(want, it.amount)
  it.amount -= taken
  it.lastTouchTick = opts.tick
  pushEvent(bag, {
    kind: 'item_picked',
    tick: opts.tick,
    itemId: it.id,
    actorId: opts.actorId,
    x: it.x,
    y: it.y,
    itemKind: it.kind,
    resource: it.resource,
    amount: taken,
    intensity: Math.min(1, taken / Math.max(1, GROUND_MERGE_CAP[it.kind])),
  })
  const resource = it.resource
  const itemId = it.id
  if (it.amount <= 0) bag.items.splice(idx, 1)
  return { taken, itemId, resource }
}

export function tickGroundDecay(bag: GroundItemsBag, tick: number): void {
  const keep: GroundItem[] = []
  for (const it of bag.items) {
    const half = GROUND_DECAY_TICKS[it.kind]
    const age = Math.max(0, tick - it.droppedTick)
    it.freshness = Math.max(0, 1 - age / half)

    const perish =
      it.kind === 'food_pile' || it.kind === 'bag' || it.kind === 'loot_goods'
    if (perish && age > 0 && age % Math.max(60, Math.floor(half / 20)) === 0) {
      const lost = Math.max(1, Math.floor(it.amount * 0.08))
      it.amount -= lost
      pushEvent(bag, {
        kind: 'item_decayed',
        tick,
        itemId: it.id,
        x: it.x,
        y: it.y,
        itemKind: it.kind,
        resource: it.resource,
        amount: lost,
        intensity: 1 - it.freshness,
      })
    }

    if (it.amount > 0 && it.freshness > 0.02) keep.push(it)
    else if (it.amount > 0 && !perish && it.freshness <= 0.02) {
      it.freshness = 0.02
      keep.push(it)
    } else if (it.amount <= 0) {
      pushEvent(bag, {
        kind: 'item_decayed',
        tick,
        itemId: it.id,
        x: it.x,
        y: it.y,
        itemKind: it.kind,
        resource: it.resource,
        amount: 0,
        intensity: 1,
        note: 'removed',
      })
    }
  }
  bag.items = keep
}

/** Snapshot bridge — flatten for ActorGroundItem upgrade (kind + resource). */
export function exportGroundActors(bag: GroundItemsBag): Array<{
  id: string
  x: number
  y: number
  kind: GroundItemKind
  resource: string
  amount: number
  freshness: number
  toolTier: ToolTier | null
  source: GroundSource
}> {
  return bag.items.map((it) => ({
    id: it.id,
    x: it.x,
    y: it.y,
    kind: it.kind,
    resource: it.resource,
    amount: it.amount,
    freshness: it.freshness,
    toolTier: it.toolTier,
    source: it.source,
  }))
}
