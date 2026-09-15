import { houseFootprint } from './architecture'
import { noteVillageCasualty, noteVillageTheft } from './commerce'
import { dropMind, mindOf, onCognitiveEvent } from './cognition'
import {
  borrowOnContact,
  cultureSimilarity,
  dropEthnos,
  ensureCultureState,
  homophilyBias,
  onEthnosContact,
} from './ethnos'
import { inheritOnDeath } from './family'
import { addToInventory, bestEdibleIn, countOf, edibleValue, removeFromInventory, type ResourceType } from './inventory'
import { tryRomanceBond } from './marriage'
import { gearPrestige01 } from './equipment'
import {
  circlesOf,
  handlePoliticalDeath,
  onPoliticalGenerosity,
  onPoliticalTheft,
  politicsOf,
  trySpreadCreed,
} from './politics'
import {
  adjustRelation,
  broadcastWitness,
  bumpRespect,
  decayMemories,
  escalateGrudge,
  gossip,
  isGatheringHour,
  logEvent,
  recordRelHistory,
  relationWith,
  remember,
  shareFamilyTrauma,
  softenGrudge,
  strongestGrudge,
} from './social'
import { CLAIM_NONE, type SimState, type Villager } from './types'
import { teachKnowledge } from './technology'
import { noteActivityPractice, notePatronage, noteRecognition } from './livelihood'
import { claimArea, claimCells, distance } from './world'

const WITNESS_RADIUS = 14
const SOCIAL_RANGE = 2.5
const BRAWL_HIT_CHANCE = 0.35
const FIELD_CLAIM_RADIUS = 2
const PEN_CLAIM_RADIUS = 3
const PLAZA_RADIUS = 7

function skillPrestige(other: Villager): number {
  try {
    const skills = mindOf(other).skills
    let best = 0
    for (const k of Object.keys(skills) as (keyof typeof skills)[]) {
      if (skills[k] > best) best = skills[k]
    }
    return best
  } catch {
    return 0
  }
}

function wealthSignal(other: Villager): number {
  const coins = countOf(other.inventory, 'coin')
  const chest = other.chestInventory ? edibleValue(other.chestInventory) : 0
  const gear = gearPrestige01(other)
  return Math.min(
    1,
    coins * 0.08 + chest * 0.04 + (other.hasHome ? 0.1 : 0) + (other.hasCart ? 0.05 : 0) + gear * 0.45,
  )
}

function isCircleLeader(state: SimState, other: Villager): boolean {
  for (const c of circlesOf(state, other)) {
    if (c.leaderId === other.id) return true
  }
  return false
}

/** Refresh admiration toward skilled / wealthy / circle leaders nearby. */
export function refreshAdmiration(state: SimState, v: Villager) {
  for (const other of state.villagers) {
    if (!other.alive || other.id === v.id) continue
    if (distance(v.x, v.y, other.x, other.y) > 28) continue
    const skill = skillPrestige(other)
    const wealth = wealthSignal(other)
    const leader = isCircleLeader(state, other)
    const prestige = skill * 0.55 + wealth * 0.35 + (leader ? 0.35 : 0) + (other.ambition === 'leader' ? 0.1 : 0)
    if (prestige < 0.28) continue
    const delta = (prestige - 0.25) * 0.04 * (0.6 + v.personality.ambition * 0.4)
    bumpRespect(v, other.id, delta, state.tick)
    // Mild affinity pull toward admired people (not automatic friendship).
    if (prestige > 0.55) adjustRelation(v, other.id, 0.008, 0.004, state.tick)
  }
}

export function doSocialise(state: SimState, a: Villager, b: Villager) {
  const ma = mindOf(a)
  const mb = mindOf(b)
  const rngA = mulberry(a.seed ^ (state.tick * 2654435761))
  const rngB = mulberry(b.seed ^ (state.tick * 2246822519))
  ensureCultureState(ma, a, rngA)
  ensureCultureState(mb, b, rngB)
  const sim = cultureSimilarity(ma.cultureFeatures, mb.cultureFeatures)
  const trustMul = homophilyBias(sim, 'trust')

  const relA = relationWith(a, b.id)
  const relB = relationWith(b, a.id)
  const kinBoost = Math.max(relA.kinship, relB.kinship) * 0.05
  const spouseBoost = a.spouseId === b.id || b.spouseId === a.id ? 0.04 : 0
  const friendMaint = relA.affinity > 0.35 ? 0.025 : 0
  const warmth =
    (0.06 +
      (a.personality.sociability + b.personality.sociability) * 0.035 +
      kinBoost +
      spouseBoost +
      friendMaint +
      relA.respect * 0.02) *
    (0.7 + sim * 0.45)

  adjustRelation(a, b.id, warmth, (0.035 + kinBoost * 0.5) * trustMul, state.tick)
  adjustRelation(b, a.id, warmth, (0.035 + kinBoost * 0.5) * trustMul, state.tick)
  softenGrudge(a, b.id, 0.04 + a.personality.generosity * 0.03, state.tick)
  softenGrudge(b, a.id, 0.04 + b.personality.generosity * 0.03, state.tick)
  onCognitiveEvent(a, 'social', 0.75)
  onCognitiveEvent(b, 'social', 0.75)

  // Ritual / gathering hour near village centre → belonging (DF social soft).
  if (isGatheringHour(state.tick) && a.villageId !== null && a.villageId === b.villageId) {
    const vg = state.villages.find((g) => g.id === a.villageId)
    if (vg && distance(a.x, a.y, vg.centerX, vg.centerY) < PLAZA_RADIUS + 4) {
      onCognitiveEvent(a, 'ritual', 0.55)
      onCognitiveEvent(b, 'ritual', 0.55)
      onCognitiveEvent(a, 'belonging_warm', 0.4)
      onCognitiveEvent(b, 'belonging_warm', 0.4)
      politicsOf(a).beliefs.loyalty = Math.min(1, politicsOf(a).beliefs.loyalty + 0.01)
      politicsOf(b).beliefs.loyalty = Math.min(1, politicsOf(b).beliefs.loyalty + 0.01)
    }
  }

  const contact = 0.35 + sim * 0.4 + Math.max(relA.trust, relB.trust) * 0.25
  if (borrowOnContact(ma.cultureFeatures, mb.cultureFeatures, contact, rngA)) {
    ma.cultureWeight = Math.min(1, ma.cultureWeight + 0.015)
  }
  if (borrowOnContact(mb.cultureFeatures, ma.cultureFeatures, contact, rngB)) {
    mb.cultureWeight = Math.min(1, mb.cultureWeight + 0.015)
  }
  onEthnosContact(state, a, b, rngA, ma.cultureTag, mb.cultureTag, 1)

  // Occasional soft "insult" when already hostile — deepens grudges without a scripted insult system.
  if (relA.affinity < -0.35 && a.personality.courage > 0.55 && (state.tick + a.id * 3 + b.id) % 11 === 0) {
    remember(b, {
      kind: 'insulted',
      subjectId: a.id,
      x: a.x,
      y: a.y,
      tick: state.tick,
      weight: 1.3,
      emotion: -0.85,
    })
    escalateGrudge(b, a.id, 0.12, state.tick)
    adjustRelation(b, a.id, -0.12, -0.08, state.tick)
    recordRelHistory(b, a.id, 'fight', state.tick)
    onCognitiveEvent(b, 'betrayal', 0.35)
  }

  const story = gossip(a, b, state.tick)
  if (story && story.subjectId !== null && story.weight > 1.1) {
    const subject = state.villagers.find((v) => v.id === story.subjectId)
    if (subject && (story.kind === 'sawTheft' || story.kind === 'sawKill' || story.kind === 'kinSlain')) {
      logEvent(state, `${a.name} raconte à ${b.name} ce que ${subject.name} a fait`)
    }
  }

  trySpreadCreed(state, a, b)

  // Technique teaching — social transmission of generative knowledge.
  teachKnowledge(state, a, b, rngA)
  teachKnowledge(state, b, a, rngB)

  // Mutual respect nudge when one is skilled / leading / better dressed.
  const aSkill = skillPrestige(a)
  const bSkill = skillPrestige(b)
  if (bSkill > aSkill + 0.15) bumpRespect(a, b.id, 0.03, state.tick)
  if (aSkill > bSkill + 0.15) bumpRespect(b, a.id, 0.03, state.tick)
  if (isCircleLeader(state, b)) bumpRespect(a, b.id, 0.025, state.tick)
  if (isCircleLeader(state, a)) bumpRespect(b, a.id, 0.025, state.tick)
  const dressGap = gearPrestige01(b) - gearPrestige01(a)
  if (dressGap > 0.18) bumpRespect(a, b.id, 0.02 + dressGap * 0.04, state.tick)
  if (dressGap < -0.18) bumpRespect(b, a.id, 0.02 - dressGap * 0.04, state.tick)

  if (relA.affinity > 0.55 && relA.affinity - warmth <= 0.55) {
    logEvent(state, `${a.name} et ${b.name} sont devenus proches`)
    recordRelHistory(a, b.id, 'met', state.tick)
    recordRelHistory(b, a.id, 'met', state.tick)
  } else if (relA.affinity < 0.28 && (state.tick + a.id + b.id) % 70 === 0) {
    logEvent(state, `${a.name} discute avec ${b.name}`)
    recordRelHistory(a, b.id, 'met', state.tick)
  }

  // Romance pathway (affinity/trust gates live in tryRomanceBond).
  tryRomanceBond(state, a, b, rngA)
  tryRomanceBond(state, b, a, rngB)

  // Soft communal gathering: many idle folk near plaza → belonging boost.
  const village = state.villages.find((vg) => vg.id === a.villageId)
  if (village && isGatheringHour(state.tick)) {
    const nearPlaza =
      distance(a.x, a.y, village.centerX, village.centerY) <= PLAZA_RADIUS &&
      distance(b.x, b.y, village.centerX, village.centerY) <= PLAZA_RADIUS
    if (nearPlaza) {
      let crowd = 0
      for (const o of state.villagers) {
        if (!o.alive || o.villageId !== village.id) continue
        if (distance(o.x, o.y, village.centerX, village.centerY) <= PLAZA_RADIUS) crowd++
      }
        if (crowd >= 3) {
        onCognitiveEvent(a, 'social', 0.55)
        onCognitiveEvent(b, 'social', 0.55)
        onCognitiveEvent(a, 'belonging_warm', 0.7)
        onCognitiveEvent(b, 'belonging_warm', 0.7)
        adjustRelation(a, b.id, 0.03, 0.02, state.tick)
        adjustRelation(b, a.id, 0.03, 0.02, state.tick)
        if (crowd >= 5 && (state.tick + village.id) % 37 === 0) {
          logEvent(state, `Des villageois se retrouvent sur la place`)
        }
      }
    }
  }
}

function mulberry(seed: number): () => number {
  let s = seed >>> 0 || 1
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0
    return s / 4294967296
  }
}

export function doSteal(state: SimState, thief: Villager, victim: Villager): boolean {
  if (!victim.chestInventory) return false
  const prize: ResourceType | null =
    bestEdibleIn(victim.chestInventory) ??
    (countOf(victim.chestInventory, 'coin') > 0
      ? 'coin'
      : countOf(victim.chestInventory, 'cloth') > 0
        ? 'cloth'
        : null)
  if (!prize) return false

  const taken = Math.min(2, countOf(victim.chestInventory, prize))
  const leftover = addToInventory(thief.inventory, prize, taken)
  removeFromInventory(victim.chestInventory, prize, taken - leftover)
  if (taken - leftover <= 0) return false

  state.thefts += 1
  noteVillageTheft(state, victim.villageId)
  noteVillageTheft(state, thief.villageId)

  broadcastWitness(state, thief, 'sawTheft', -1, 1.4, WITNESS_RADIUS, victim.id)

  const ownerSaw = distance(victim.x, victim.y, thief.x, thief.y) <= WITNESS_RADIUS
  if (ownerSaw) {
    remember(victim, {
      kind: 'robbed',
      subjectId: thief.id,
      x: thief.x,
      y: thief.y,
      tick: state.tick,
      weight: 2.2,
      emotion: -1,
    })
    adjustRelation(victim, thief.id, -0.55, -0.5, state.tick)
    escalateGrudge(victim, thief.id, 0.35, state.tick)
    relationWith(victim, thief.id).debt = Math.min(3, relationWith(victim, thief.id).debt + 1.2)
    recordRelHistory(victim, thief.id, 'theft', state.tick)
    recordRelHistory(thief, victim.id, 'theft', state.tick)
    onCognitiveEvent(victim, 'theft_victim', 1)
    onCognitiveEvent(thief, 'betrayal', 0.4)
    if (relationWith(victim, thief.id).grudge > 0.55 && victim.grudgeTarget === null) {
      victim.grudgeTarget = thief.id
    }
    logEvent(state, `${thief.name} a volé ${victim.name} — et s'est fait voir`)
  } else {
    logEvent(state, `${thief.name} a dérobé des vivres chez ${victim.name}`)
  }
  onPoliticalTheft(state, thief, victim)
  // Norm internalization → shame / stress even without a watcher.
  const shame = politicsOf(thief).normInternalization
  if (shame > 0.35) {
    onCognitiveEvent(thief, 'shame', 0.4 + shame * 0.6)
  }
  return true
}

export function doGiveFood(state: SimState, giver: Villager, receiver: Villager): boolean {
  const give: ResourceType | null =
    countOf(giver.inventory, 'bread') > 1 ? 'bread' : countOf(giver.inventory, 'food') > 1 ? 'food' : null
  if (!give) return false
  removeFromInventory(giver.inventory, give, 1)
  addToInventory(receiver.inventory, give, 1)

  remember(receiver, {
    kind: 'helped',
    subjectId: giver.id,
    x: giver.x,
    y: giver.y,
    tick: state.tick,
    weight: 1.5,
    emotion: 1,
  })
  adjustRelation(receiver, giver.id, 0.35, 0.3, state.tick)
  adjustRelation(giver, receiver.id, 0.15, 0.1, state.tick)
  softenGrudge(receiver, giver.id, 0.22, state.tick)
  softenGrudge(giver, receiver.id, 0.08, state.tick)
  relationWith(receiver, giver.id).debt = Math.min(3, relationWith(receiver, giver.id).debt + 0.45)
  recordRelHistory(receiver, giver.id, 'gift', state.tick)
  recordRelHistory(giver, receiver.id, 'helped', state.tick)
  bumpRespect(receiver, giver.id, 0.06, state.tick)
  onCognitiveEvent(receiver, 'gift', 1)
  onCognitiveEvent(giver, 'gift', 0.4)
  broadcastWitness(state, giver, 'helped', 1, 0.6, 8, receiver.id)
  onPoliticalGenerosity(state, giver, receiver)
  const kinShare =
    (relationWith(receiver, giver.id).kinship || 0) > 0.4 ||
    giver.spouseId === receiver.id ||
    giver.parentIds.includes(receiver.id) ||
    receiver.parentIds.includes(giver.id)
  if ((kinShare && (state.tick + giver.id) % 45 === 0) || (!kinShare && (state.tick + giver.id * 5 + receiver.id) % 55 === 0)) {
    logEvent(
      state,
      kinShare
        ? `${giver.name} partage sa nourriture avec ${receiver.name} (famille)`
        : `${giver.name} offre a manger a ${receiver.name}`,
    )
  }
  return true
}

/** Paiement soft (nourriture / pièce) pour un service — alms / patronage. */
function payForService(state: SimState, patron: Villager, performer: Villager, reason: string): boolean {
  const payFood =
    countOf(patron.inventory, 'bread') > 1 ? 'bread' : countOf(patron.inventory, 'food') > 1 ? 'food' : null
  if (payFood) {
    removeFromInventory(patron.inventory, payFood, 1)
    addToInventory(performer.inventory, payFood, 1)
    notePatronage(performer, 0.35)
    noteRecognition(performer, 0.04)
    adjustRelation(patron, performer.id, 0.08, 0.12, state.tick)
    adjustRelation(performer, patron.id, 0.1, 0.08, state.tick)
    bumpRespect(patron, performer.id, 0.05, state.tick)
    onCognitiveEvent(performer, 'gift', 0.5)
    onCognitiveEvent(patron, 'belonging_warm', 0.35)
    if ((state.tick + performer.id) % 90 === 0) {
      logEvent(state, `${patron.name} offre à manger à ${performer.name} (${reason})`)
    }
    return true
  }
  if (countOf(patron.inventory, 'coin') > 0) {
    removeFromInventory(patron.inventory, 'coin', 1)
    addToInventory(performer.inventory, 'coin', 1)
    notePatronage(performer, 0.4)
    noteRecognition(performer, 0.05)
    bumpRespect(patron, performer.id, 0.06, state.tick)
    return true
  }
  // Belonging payment when poor but attentive.
  noteRecognition(performer, 0.02)
  onCognitiveEvent(performer, 'belonging_warm', 0.25)
  onCognitiveEvent(patron, 'belonging_warm', 0.2)
  adjustRelation(patron, performer.id, 0.04, 0.06, state.tick)
  return false
}

/** Divertissement / conte — métier émergent troubadour. */
export function doEntertain(state: SimState, performer: Villager, audience: Villager | null): void {
  noteActivityPractice(performer, 'entertain', 1.2)
  const mind = mindOf(performer)
  mind.skills.social = Math.min(1, mind.skills.social + 0.01)
  onCognitiveEvent(performer, 'social', 0.45)
  mind.needs.boredom = Math.max(0, mind.needs.boredom - 0.2)
  mind.needs.status = Math.max(0, mind.needs.status - 0.08)

  const listeners: Villager[] = []
  if (audience) listeners.push(audience)
  for (const o of state.villagers) {
    if (!o.alive || o.id === performer.id) continue
    if (distance(o.x, o.y, performer.x, performer.y) > 5) continue
    listeners.push(o)
    if (listeners.length >= 5) break
  }
  for (const L of listeners) {
    onCognitiveEvent(L, 'social', 0.4)
    onCognitiveEvent(L, 'belonging_warm', 0.35)
    mindOf(L).needs.boredom = Math.max(0, mindOf(L).needs.boredom - 0.15)
    adjustRelation(L, performer.id, 0.06, 0.08, state.tick)
    bumpRespect(L, performer.id, 0.04, state.tick)
    if (L.hunger > 1.2 && (countOf(L.inventory, 'food') > 1 || countOf(L.inventory, 'bread') > 1 || countOf(L.inventory, 'coin') > 0)) {
      payForService(state, L, performer, 'spectacle')
    }
  }
  noteRecognition(performer, 0.03 + listeners.length * 0.01)
  if (listeners.length >= 2 && (state.tick + performer.id) % 70 === 0) {
    logEvent(state, `${performer.name} divertit ${listeners.length} villageois`)
  }
}

/** Conseil spirituel / guérison soft — gourou. */
export function doCounsel(state: SimState, guide: Villager, seeker: Villager): void {
  noteActivityPractice(guide, 'counsel', 1.2)
  const gm = mindOf(guide)
  const sm = mindOf(seeker)
  gm.skills.social = Math.min(1, gm.skills.social + 0.008)
  sm.emotions.stress = Math.max(0, sm.emotions.stress - 0.12)
  sm.needs.piety = Math.max(0, sm.needs.piety - 0.15)
  sm.needs.belonging = Math.max(0, sm.needs.belonging - 0.1)
  onCognitiveEvent(seeker, 'piety_calm', 0.7)
  onCognitiveEvent(guide, 'piety_calm', 0.35)
  politicsOf(seeker).beliefs.piety = Math.min(1, politicsOf(seeker).beliefs.piety + 0.01)
  adjustRelation(seeker, guide.id, 0.12, 0.15, state.tick)
  bumpRespect(seeker, guide.id, 0.07, state.tick)
  payForService(state, seeker, guide, 'conseil')
  noteRecognition(guide, 0.05)
  if ((state.tick + guide.id) % 80 === 0) {
    logEvent(state, `${guide.name} console ${seeker.name}`)
  }
}

/** Apprentissage de savoir-faire (skills) — pas seulement tech bits. */
export function doTeachCraft(state: SimState, master: Villager, pupil: Villager): void {
  noteActivityPractice(master, 'teachCraft', 1.2)
  noteActivityPractice(pupil, 'teachCraft', 0.4)
  const mm = mindOf(master)
  const pm = mindOf(pupil)
  // Transfer strongest master skill drip.
  const keys = Object.keys(mm.skills) as (keyof typeof mm.skills)[]
  let best = keys[0]!
  let bestV = -1
  for (const k of keys) {
    if (mm.skills[k] > bestV) {
      bestV = mm.skills[k]
      best = k
    }
  }
  if (bestV > pm.skills[best] + 0.05) {
    pm.skills[best] = Math.min(1, pm.skills[best] + 0.02 + mm.skills.social * 0.01)
  }
  mm.skills.social = Math.min(1, mm.skills.social + 0.006)
  teachKnowledge(state, master, pupil, () => Math.random())
  bumpRespect(pupil, master.id, 0.05, state.tick)
  adjustRelation(pupil, master.id, 0.08, 0.1, state.tick)
  payForService(state, pupil, master, 'leçon')
  noteRecognition(master, 0.04)
  if ((state.tick + master.id) % 100 === 0) {
    logEvent(state, `${master.name} enseigne à ${pupil.name}`)
  }
}

export function doConfront(state: SimState, aggressor: Villager, target: Villager, rng: () => number) {
  const rel = relationWith(aggressor, target.id)
  const armedEdge = aggressor.toolTier === 'stone' ? 0.2 : aggressor.toolTier === 'wood' ? 0.1 : 0
  const hit = BRAWL_HIT_CHANCE + aggressor.personality.courage * 0.2 + armedEdge

  state.brawls += 1
  escalateGrudge(aggressor, target.id, 0.15, state.tick)
  escalateGrudge(target, aggressor.id, 0.22, state.tick)
  recordRelHistory(aggressor, target.id, 'fight', state.tick)
  recordRelHistory(target, aggressor.id, 'fight', state.tick)

  if (rng() < hit) {
    target.health -= 1
    remember(target, {
      kind: 'harmed',
      subjectId: aggressor.id,
      x: aggressor.x,
      y: aggressor.y,
      tick: state.tick,
      weight: 2.4,
      emotion: -1,
    })
    adjustRelation(target, aggressor.id, -0.6, -0.5, state.tick)
    onCognitiveEvent(target, 'fight_hurt', 1)
    onCognitiveEvent(aggressor, 'fight_win', 0.6)
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
    remember(aggressor, {
      kind: 'harmed',
      subjectId: target.id,
      x: target.x,
      y: target.y,
      tick: state.tick,
      weight: 1.6,
      emotion: -1,
    })
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
  noteVillageCasualty(state, victim.villageId)
  handlePoliticalDeath(state, victim)
  inheritOnDeath(state, victim)
  dropMind(victim.id)
  dropEthnos(victim.id)

  for (const w of state.villagers) {
    if (!w.alive || w.id === victim.id) continue
    const rel = w.relations.get(victim.id)
    const kin =
      w.parentIds.includes(victim.id) ||
      victim.parentIds.includes(w.id) ||
      w.spouseId === victim.id ||
      victim.spouseId === w.id ||
      (rel?.kinship ?? 0) > 0.45
    const closeness = (rel ? rel.affinity : 0) + (kin ? 0.7 : 0) + (rel?.respect ?? 0) * 0.25
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
    onCognitiveEvent(w, kin || closeness > 0.6 ? 'death_kin' : 'death_seen', closeness)
    if (rel) recordRelHistory(w, victim.id, 'grief', state.tick)
    if (kin || closeness > 0.7) {
      logEvent(state, `${w.name} est en deuil de ${victim.name}`)
    }

    if (killer && killer.alive) {
      const sawIt = distance(w.x, w.y, victim.x, victim.y) <= WITNESS_RADIUS
      const heardIt = w.memories.some((m) => m.kind === 'sawKill' && m.subjectId === killer.id)
      if (sawIt || heardIt || kin) {
        adjustRelation(w, killer.id, -0.9, -0.8, state.tick)
        escalateGrudge(w, killer.id, kin ? 0.45 : 0.25, state.tick)
        recordRelHistory(w, killer.id, 'kinDeath', state.tick)
        remember(w, {
          kind: 'kinSlain',
          subjectId: killer.id,
          x: victim.x,
          y: victim.y,
          tick: state.tick,
          weight: kin ? 2.4 : 1.4,
          emotion: -1,
        })
        const willing = closeness * 0.6 + w.personality.courage * 0.5 + (kin ? 0.2 : 0)
        if (willing > 0.65 && w.grudgeTarget === null) {
          w.grudgeTarget = killer.id
          w.ambition = 'revenge'
          logEvent(state, `${w.name} jure de venger ${victim.name}`)
        }
      }
    }
  }

  if (killer && killer.alive) {
    shareFamilyTrauma(state, victim, 'kinSlain', killer.id, 2.2)
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
      const coins = countOf(victim.inventory, 'coin')
      if (coins > 0) {
        const share = Math.max(1, Math.floor(coins * 0.6))
        removeFromInventory(victim.inventory, 'coin', share)
        addToInventory(heir.inventory, 'coin', share)
      }
      const kinBond = relationWith(heir, victim.id)
      kinBond.kinship = Math.max(kinBond.kinship, 0.9)
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

/** Family remembers a wolf attack death as lasting trauma (no human killer). */
export function onWolfKill(state: SimState, victim: Villager) {
  shareFamilyTrauma(state, victim, 'wolfGrief', null, 2.0)
  for (const w of state.villagers) {
    if (!w.alive || w.id === victim.id) continue
    const sawIt = distance(w.x, w.y, victim.x, victim.y) <= WITNESS_RADIUS
    if (!sawIt) continue
    remember(w, {
      kind: 'wolfGrief',
      subjectId: victim.id,
      x: victim.x,
      y: victim.y,
      tick: state.tick,
      weight: 1.8,
      emotion: -0.9,
    })
    onCognitiveEvent(w, 'death_seen', 0.7)
  }
  onDeath(state, victim, null)
}

export function creditRescue(state: SimState, saved: Villager, rescuer: Villager) {
  remember(saved, {
    kind: 'saved',
    subjectId: rescuer.id,
    x: rescuer.x,
    y: rescuer.y,
    tick: state.tick,
    weight: 2.6,
    emotion: 1,
  })
  adjustRelation(saved, rescuer.id, 0.6, 0.5, state.tick)
  bumpRespect(saved, rescuer.id, 0.2, state.tick)
  recordRelHistory(saved, rescuer.id, 'helped', state.tick)
  logEvent(state, `${rescuer.name} a sauvé ${saved.name} d'un loup`)
}

export function tickSocialUpkeep(state: SimState, v: Villager) {
  decayMemories(v)

  if ((state.tick + v.id) % 24 === 0) refreshAdmiration(state, v)

  // Slow natural decay of minor grudges when not reinforced; historical grudges stick longer.
  if ((state.tick + v.id) % 40 === 0) {
    for (const [id, rel] of v.relations) {
      if (rel.grudge > 0 && rel.grudge < 0.55) {
        rel.grudge = Math.max(0, rel.grudge - 0.01)
      }
      // Neglect: affinity drifts toward 0 without contact.
      const age = state.tick - (rel.lastTick || 0)
      if (age > 220 && Math.abs(rel.affinity) > 0.08 && rel.kinship < 0.4) {
        rel.affinity *= 0.985
      }
      void id
    }
  }

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

export { SOCIAL_RANGE, isGatheringHour }
