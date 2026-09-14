import { houseFootprint } from './architecture'
import { addToInventory, countOf, edibleValue, removeFromInventory, type ResourceType, type Slot } from './inventory'
import {
  adjustRelation,
  broadcastWitness,
  decayMemories,
  gossip,
  logEvent,
  relationWith,
  remember,
  strongestGrudge,
} from './social'
import { CLAIM_NONE, type SimState, type Villager } from './types'
import { claimArea, claimCells, distance } from './world'

const WITNESS_RADIUS = 14
const SOCIAL_RANGE = 2.5
const BRAWL_HIT_CHANCE = 0.35
const FIELD_CLAIM_RADIUS = 2
const PEN_CLAIM_RADIUS = 3

export function doSocialise(state: SimState, a: Villager, b: Villager) {
  const warmth = 0.05 + (a.personality.sociability + b.personality.sociability) * 0.03
  adjustRelation(a, b.id, warmth, 0.03, state.tick)
  adjustRelation(b, a.id, warmth, 0.03, state.tick)

  const story = gossip(a, b, state.tick)
  if (story && story.subjectId !== null && story.weight > 1.1) {
    const subject = state.villagers.find((v) => v.id === story.subjectId)
    if (subject && (story.kind === 'sawTheft' || story.kind === 'sawKill')) {
      logEvent(state, `${a.name} raconte à ${b.name} ce que ${subject.name} a fait`)
    }
  }

  const rel = relationWith(a, b.id)
  if (rel.affinity > 0.6 && rel.affinity - warmth <= 0.6) {
    logEvent(state, `${a.name} et ${b.name} sont devenus proches`)
  }
}

export function doSteal(state: SimState, thief: Villager, victim: Villager): boolean {
  if (!victim.chestInventory) return false
  const prize: ResourceType | null =
    countOf(victim.chestInventory, 'bread') > 0 ? 'bread' : countOf(victim.chestInventory, 'food') > 0 ? 'food' : countOf(victim.chestInventory, 'wheat') > 0 ? 'wheat' : null
  if (!prize) return false

  const taken = Math.min(2, countOf(victim.chestInventory, prize))
  const leftover = addToInventory(thief.inventory, prize, taken)
  removeFromInventory(victim.chestInventory, prize, taken - leftover)
  if (taken - leftover <= 0) return false

  state.thefts += 1

  broadcastWitness(state, thief, 'sawTheft', -1, 1.4, WITNESS_RADIUS, victim.id)

  const ownerSaw = distance(victim.x, victim.y, thief.x, thief.y) <= WITNESS_RADIUS
  if (ownerSaw) {
    remember(victim, { kind: 'robbed', subjectId: thief.id, x: thief.x, y: thief.y, tick: state.tick, weight: 2.2, emotion: -1 })
    adjustRelation(victim, thief.id, -0.55, -0.5, state.tick)
    logEvent(state, `${thief.name} a volé ${victim.name} — et s'est fait voir`)
  } else {
    logEvent(state, `${thief.name} a dérobé des vivres chez ${victim.name}`)
  }
  return true
}

export function doGiveFood(state: SimState, giver: Villager, receiver: Villager): boolean {
  const give: ResourceType | null = countOf(giver.inventory, 'bread') > 1 ? 'bread' : countOf(giver.inventory, 'food') > 1 ? 'food' : null
  if (!give) return false
  removeFromInventory(giver.inventory, give, 1)
  addToInventory(receiver.inventory, give, 1)

  remember(receiver, { kind: 'helped', subjectId: giver.id, x: giver.x, y: giver.y, tick: state.tick, weight: 1.5, emotion: 1 })
  adjustRelation(receiver, giver.id, 0.35, 0.3, state.tick)
  adjustRelation(giver, receiver.id, 0.15, 0.1, state.tick)
  broadcastWitness(state, giver, 'helped', 1, 0.6, 8, receiver.id)
  return true
}

export function doConfront(state: SimState, aggressor: Villager, target: Villager, rng: () => number) {
  const rel = relationWith(aggressor, target.id)
  const armedEdge = aggressor.toolTier === 'stone' ? 0.2 : aggressor.toolTier === 'wood' ? 0.1 : 0
  const hit = BRAWL_HIT_CHANCE + aggressor.personality.courage * 0.2 + armedEdge

  state.brawls += 1

  if (rng() < hit) {
    target.health -= 1
    remember(target, { kind: 'harmed', subjectId: aggressor.id, x: aggressor.x, y: aggressor.y, tick: state.tick, weight: 2.4, emotion: -1 })
    adjustRelation(target, aggressor.id, -0.6, -0.5, state.tick)
    broadcastWitness(state, aggressor, 'sawKill', -0.7, 1.2, WITNESS_RADIUS, target.id)

    if (target.health <= 0) {
      target.alive = false
      state.deaths += 1
      logEvent(state, `${aggressor.name} a tué ${target.name}`)
      onDeath(state, target, aggressor)
      if (aggressor.grudgeTarget === target.id) {
        aggressor.grudgeTarget = null
        if (aggressor.ambition === 'revenge') aggressor.ambition = 'survive'
      }
      return
    }
    logEvent(state, `${aggressor.name} s'en est pris à ${target.name}`)
  }

  if (target.alive && rng() < 0.3 + target.personality.courage * 0.25) {
    aggressor.health -= 1
    remember(aggressor, { kind: 'harmed', subjectId: target.id, x: target.x, y: target.y, tick: state.tick, weight: 1.6, emotion: -1 })
    adjustRelation(aggressor, target.id, -0.2, -0.2, state.tick)
    if (aggressor.health <= 0) {
      aggressor.alive = false
      state.deaths += 1
      logEvent(state, `${target.name} a tué ${aggressor.name} en se défendant`)
      onDeath(state, aggressor, target)
    }
  }

  if (rel.affinity < -0.3) adjustRelation(aggressor, target.id, 0.15, 0, state.tick)
}

export function onDeath(state: SimState, victim: Villager, killer: Villager | null) {
  for (const w of state.villagers) {
    if (!w.alive || w.id === victim.id) continue
    const rel = w.relations.get(victim.id)
    const kin = w.parentIds.includes(victim.id) || victim.parentIds.includes(w.id)
    const closeness = (rel ? rel.affinity : 0) + (kin ? 0.7 : 0)
    if (closeness <= 0.25) continue

    remember(w, {
      kind: 'grief',
      subjectId: victim.id,
      x: victim.x,
      y: victim.y,
      tick: state.tick,
      weight: 1.5 + closeness,
      emotion: -1,
    })

    if (killer && killer.alive) {
      const sawIt = distance(w.x, w.y, victim.x, victim.y) <= WITNESS_RADIUS
      const heardIt = w.memories.some((m) => m.kind === 'sawKill' && m.subjectId === killer.id)
      if (sawIt || heardIt) {
        adjustRelation(w, killer.id, -0.9, -0.8, state.tick)
        const willing = closeness * 0.6 + w.personality.courage * 0.5
        if (willing > 0.65 && w.grudgeTarget === null) {
          w.grudgeTarget = killer.id
          w.ambition = 'revenge'
          logEvent(state, `${w.name} jure de venger ${victim.name}`)
        }
      }
    }
  }

  if (victim.homeOwnerId === victim.id) {
    let heir: Villager | null = null
    for (const r of state.villagers) {
      if (r.alive && r.id !== victim.id && r.homeOwnerId === victim.id) {
        heir = r
        break
      }
    }

    if (heir) {
      heir.homeOwnerId = heir.id
      heir.bedCount = Math.max(1, victim.bedCount - 1)
      heir.hasChest = victim.hasChest
      heir.chestX = victim.chestX
      heir.chestY = victim.chestY
      heir.chestInventory = victim.chestInventory
      heir.hasWorkbench = victim.hasWorkbench
      heir.workbenchX = victim.workbenchX
      heir.workbenchY = victim.workbenchY
      heir.hasCart = heir.hasCart || victim.hasCart

      if (!heir.hasField && victim.hasField) {
        heir.hasField = true
        heir.fieldX = victim.fieldX
        heir.fieldY = victim.fieldY
      }
      if (!heir.hasPen && victim.hasPen) {
        heir.hasPen = true
        heir.penX = victim.penX
        heir.penY = victim.penY
        heir.penFeed = victim.penFeed
        for (const s of state.sheep) if (s.alive && s.ownerId === victim.id) s.ownerId = heir.id
      }
      if (heir.horseId === null && victim.horseId !== null) {
        const horse = state.horses.find((h) => h.id === victim.horseId && h.alive)
        if (horse) {
          horse.ownerId = heir.id
          heir.horseId = horse.id
        }
      }
      if (heir.boatId === null && victim.boatId !== null) {
        const boat = state.boats.find((b) => b.id === victim.boatId && b.alive)
        if (boat) {
          boat.ownerId = heir.id
          heir.boatId = boat.id
        }
      }
      logEvent(state, `${heir.name} hérite de la maison de ${victim.name}`)
    } else {
      const fp = victim.house && victim.homeX >= 0 ? houseFootprint(victim.house, victim.homeX, victim.homeY) : null
      if (fp) {
        claimCells(state.grid, fp.walls, CLAIM_NONE)
        claimCells(state.grid, fp.interior, CLAIM_NONE)
        claimCells(state.grid, fp.open, CLAIM_NONE)
      }
      if (victim.hasField && victim.fieldX >= 0) claimArea(state.grid, victim.fieldX, victim.fieldY, FIELD_CLAIM_RADIUS, CLAIM_NONE)
      if (victim.hasPen && victim.penX >= 0) {
        claimArea(state.grid, victim.penX, victim.penY, PEN_CLAIM_RADIUS, CLAIM_NONE)
        for (const s of state.sheep) {
          if (s.alive && s.ownerId === victim.id) {
            s.ownerId = null
            s.captured = false
          }
        }
      }
      if (victim.horseId !== null) {
        const horse = state.horses.find((h) => h.id === victim.horseId && h.alive)
        if (horse) {
          horse.ownerId = null
          horse.tamed = false
        }
      }
      if (victim.boatId !== null) {
        const boat = state.boats.find((b) => b.id === victim.boatId && b.alive)
        if (boat) boat.ownerId = null
      }
    }
  }
}

export function creditRescue(state: SimState, saved: Villager, rescuer: Villager) {
  remember(saved, { kind: 'saved', subjectId: rescuer.id, x: rescuer.x, y: rescuer.y, tick: state.tick, weight: 2.6, emotion: 1 })
  adjustRelation(saved, rescuer.id, 0.6, 0.5, state.tick)
  logEvent(state, `${rescuer.name} a sauvé ${saved.name} d'un loup`)
}

export function tickSocialUpkeep(state: SimState, v: Villager) {
  decayMemories(v)

  if (v.grudgeTarget !== null) {
    const target = state.villagers.find((o) => o.id === v.grudgeTarget)
    if (!target || !target.alive) {
      v.grudgeTarget = null
      if (v.ambition === 'revenge') v.ambition = 'survive'
    }
  } else {
    const grudge = strongestGrudge(v)
    if (grudge && grudge.intensity > 0.75 && v.personality.courage > 0.55) {
      v.grudgeTarget = grudge.id
    }
  }
}
