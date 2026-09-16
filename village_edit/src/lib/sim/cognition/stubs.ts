/**
 * Emergent Phase 5–8 mechanisms (habits, culture, rites, soft conflict).
 * Local rules only — no scripted quests, religions, or wars.
 */

import { cultureSimilarity, deriveCultureTag, ensureCultureState, seedCultureFeaturesFromParents } from '../ethnos'
import { circlesOf, politicsOf } from '../politics'
import { distance } from '../world'
import type { SimState, TaskKind, Villager } from '../types'
import { upsertSemantic } from './memory'
import type { CognitiveState } from './types'

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v))
}

const MAX_RECENT = 8
const MAX_HABIT_KEYS = 6

/** Compact culture labels — emerge from livelihood + circle, mutate by imitation. */
const CULTURE_FROM_PROF: Partial<Record<Villager['profession'], string>> = {
  lumberjack: 'bois',
  farmer: 'blé',
  miller: 'blé',
  miner: 'fer',
  blacksmith: 'fer',
  mason: 'pierre',
  builder: 'pierre',
  trader: 'sel',
  fisher: 'voile',
  guard: 'sang',
  herder: 'laine',
  weaver: 'laine',
  forager: 'brousse',
}

const CULTURE_FROM_CIRCLE: Record<string, string> = {
  hunger: 'pain',
  faith: 'pierre',
  threat: 'sang',
  trade: 'sel',
  elder: 'pierre',
  craft: 'fer',
  kin: 'sang',
  village: 'blé',
}

const HABIT_FRIENDS: Partial<Record<TaskKind, TaskKind[]>> = {
  gatherWood: ['clearLand', 'buildHouse', 'buildWorkbench', 'buildBench'],
  gatherFood: ['eat', 'giveFood', 'storeChest', 'fish'],
  harvestWheat: ['grindFlour', 'bakeBread', 'sowField'],
  mineGold: ['mintCoins', 'tradeRun'],
  tradeRun: ['buyMaterial', 'buildCart', 'buildPort'],
  craftIronTool: ['gatherIron', 'buildWorkbench'],
  socialise: ['giveFood', 'rest', 'entertain'],
  fight: ['defend', 'craftSpear', 'buildWall'],
  flee: ['rest', 'tendHearth', 'buildPlazaFire'],
  fish: ['buildBoat', 'buildPort'],
  drink: ['gatherFood', 'rest'],
  buildBed: ['buildCradle', 'buildHearth', 'buildTable'],
  buildChest: ['buildShelf', 'buildCupboard', 'storeChest'],
  buildWorkbench: ['buildLoom', 'craftIronTool'],
  tendHearth: ['gatherFuel', 'rest', 'placeCandle'],
  buildPlazaFire: ['tendPlazaFire', 'gatherFuel'],
  experiment: ['craftGoods', 'teachCraft'],
  useMedicine: ['rest', 'gatherFood'],
  entertain: ['socialise', 'rest'],
  teachCraft: ['craftGoods', 'socialise'],
  makeCharcoal: ['gatherWood', 'craftGoods'],
  craftGoods: ['storeChest', 'tradeRun'],
  feedHorse: ['mount', 'tameHorse'],
  buildPen: ['captureSheep', 'feedPen'],
}

export type CulturePeer = {
  tag: string | null
  weight: number
  trust: number
  sameCircle: boolean
  features?: number[] | null
  contact?: number
}

function encodeHabitId(kind: TaskKind): number {
  let h = 2166136261
  for (let i = 0; i < kind.length; i++) {
    h ^= kind.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function refreshHabitIds(mind: CognitiveState): void {
  const ranked = Object.entries(mind.habits)
    .filter(([, s]) => (s ?? 0) > 0.18)
    .sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0))
    .slice(0, MAX_HABIT_KEYS)
  mind.habitIds = ranked.map(([k]) => encodeHabitId(k as TaskKind))
}

/** Reinforce frequent successful acts into soft habits (plasticity, not scripts). */
export function tickHabits(mind: CognitiveState, v: Villager): void {
  const kind = mind.lastKind ?? v.task?.kind ?? null
  if (!kind || kind === 'idle' || kind === 'flee') {
    for (const k of Object.keys(mind.habits) as TaskKind[]) {
      mind.habits[k] = clamp01((mind.habits[k] ?? 0) * 0.992)
      if ((mind.habits[k] ?? 0) < 0.04) delete mind.habits[k]
    }
    refreshHabitIds(mind)
    return
  }

  mind.recentActs.push(kind)
  if (mind.recentActs.length > MAX_RECENT) mind.recentActs.shift()

  const count = mind.recentActs.filter((k) => k === kind).length
  const base = 0.04 + count * 0.035 + mind.successes * 0.001
  mind.habits[kind] = clamp01((mind.habits[kind] ?? 0.08) + base)

  if (mind.recentActs.length >= 2) {
    const prev = mind.recentActs[mind.recentActs.length - 2]
    const friends = HABIT_FRIENDS[prev]
    if (friends?.includes(kind)) {
      mind.habits[kind] = clamp01((mind.habits[kind] ?? 0) + 0.025)
    }
  }

  const keys = Object.keys(mind.habits) as TaskKind[]
  if (keys.length > MAX_HABIT_KEYS) {
    keys.sort((a, b) => (mind.habits[a] ?? 0) - (mind.habits[b] ?? 0))
    for (let i = 0; i < keys.length - MAX_HABIT_KEYS; i++) delete mind.habits[keys[i]]
  }
  refreshHabitIds(mind)
}

/**
 * Culture tags + soft livelihood accent — deepened by Axelrod feature imitation in ethnos.ts.
 * Tag flips remain possible among similar peers (similarity gates adoption).
 */
export function tickCultureMutation(
  state: SimState,
  mind: CognitiveState,
  v: Villager,
  peers: CulturePeer[],
  rng: () => number,
): void {
  ensureCultureState(mind, v, rng)

  // Soft livelihood / circle accent only seeds empty weight — never overwrites a strong vector tag.
  if (mind.cultureWeight < 0.12) {
    const fromProf = CULTURE_FROM_PROF[v.profession]
    if (fromProf && rng() < 0.35) {
      mind.cultureWeight = 0.15 + v.personality.sociability * 0.1
    } else {
      for (const c of circlesOf(state, v)) {
        const tag = CULTURE_FROM_CIRCLE[c.kind]
        if (tag) {
          mind.cultureWeight = 0.12 + c.legitimacy * 0.12
          break
        }
      }
    }
  }

  const pol = politicsOf(v)
  const stick = 0.55 + pol.beliefs.tradition * 0.35 - v.personality.curiosity * 0.25
  mind.cultureWeight = clamp01(mind.cultureWeight * (0.97 + stick * 0.03))

  for (const peer of peers) {
    if (!peer.tag) continue
    const featSim = peer.features ? cultureSimilarity(mind.cultureFeatures, peer.features) : 0.35
    const open =
      (1 - pol.beliefs.tradition) * 0.35 + peer.trust * 0.3 + (peer.sameCircle ? 0.2 : 0) + featSim * 0.35
    if (peer.tag === mind.cultureTag) {
      mind.cultureWeight = clamp01(mind.cultureWeight + 0.04 * (0.4 + peer.trust) * (0.5 + featSim * 0.5))
    } else if (featSim >= 0.4 && open > 0.48 && peer.weight > mind.cultureWeight * 0.8 && rng() < open * 0.28) {
      // Adoption only among culturally similar peers (Axelrod interaction gate).
      mind.cultureTag = peer.tag
      mind.cultureWeight = 0.2 + peer.weight * 0.25
      break
    } else if (v.personality.curiosity > 0.75 && featSim > 0.25 && rng() < 0.025) {
      mind.cultureTag = deriveCultureTag(mind.cultureFeatures)
      mind.cultureWeight = 0.18
      break
    }
  }

  // Keep derived tag aligned with vector when weight is soft.
  if (mind.cultureWeight < 0.3 && mind.cultureFeatures.length) {
    mind.cultureTag = deriveCultureTag(mind.cultureFeatures)
  }
}

/** Sacred places + soft rites from faith circles (no canned religion). */
export function tickReligionDepth(state: SimState, mind: CognitiveState, v: Villager): void {
  const pol = politicsOf(v)
  const faith = circlesOf(state, v).filter((c) => c.kind === 'faith' || c.creed === 'piete')
  if (faith.length === 0 && pol.beliefs.piety < 0.55) {
    mind.sacredConf = clamp01(mind.sacredConf * 0.98)
    return
  }

  // Lieu figé une fois établi — plus de centroid mobile type forage.
  const locked = mind.sacredConf >= 0.32
  if (!locked) {
    let sx = mind.sacredX
    let sy = mind.sacredY
    if (faith.length > 0) {
      const c = faith[0]
      let ax = 0
      let ay = 0
      let n = 0
      // Ancrage sur foyers / positions stables des membres, pas le barycentre vivant.
      for (const id of c.memberIds) {
        const m = state.villagers.find((o) => o.id === id && o.alive)
        if (!m) continue
        if (m.hasHome) {
          ax += m.homeX
          ay += m.homeY
        } else {
          ax += m.x
          ay += m.y
        }
        n++
      }
      if (n > 0) {
        sx = Math.round(ax / n)
        sy = Math.round(ay / n)
      }
    } else if (v.hasHome) {
      sx = v.homeX
      sy = v.homeY
    } else if (v.hasWorkbench) {
      sx = v.workbenchX
      sy = v.workbenchY
    } else {
      sx = Math.round(v.x)
      sy = Math.round(v.y)
    }
    mind.sacredX = sx
    mind.sacredY = sy
  }

  const near = distance(v.x, v.y, mind.sacredX, mind.sacredY) < 10
  const rite =
    near &&
    (v.task?.kind === 'pray' ||
      v.task?.kind === 'counsel' ||
      v.task?.kind === 'socialise' ||
      v.task?.kind === 'rest')
  if (rite) {
    mind.sacredConf = clamp01(mind.sacredConf + 0.06 + pol.beliefs.piety * 0.04)
    pol.beliefs.piety = clamp01(pol.beliefs.piety + 0.008)
    mind.emotions.stress = clamp01(mind.emotions.stress - 0.04)
    mind.emotions.affection = clamp01(mind.emotions.affection + 0.03)
    upsertSemantic(
      mind.semantic,
      'sacred_site',
      'lieu sacré',
      mind.sacredConf,
      state.tick,
      mind.sacredX,
      mind.sacredY,
    )
  } else {
    mind.sacredConf = clamp01(mind.sacredConf + (near ? 0.01 : -0.01) * pol.beliefs.piety)
  }

  if (pol.beliefs.piety > 0.7 && !pol.creed && pol.grievance < 0.35) {
    pol.creedWeight = clamp01(pol.creedWeight + 0.015)
  }
}

/**
 * Soft inter-circle hostility: shared grievances + rival leaders → confront bias.
 * Not scripted civil war — local escalation only.
 */
export function tickWarEmergence(state: SimState, mind: CognitiveState, v: Villager): void {
  const pol = politicsOf(v)
  const mine = circlesOf(state, v)
  if (mine.length === 0) {
    mind.rivalId = null
    return
  }

  let bestRival: Villager | null = null
  let bestScore = 0
  for (const c of mine) {
    if (c.kind !== 'threat' && c.kind !== 'trade' && c.kind !== 'village' && !c.isInstitution) continue
    for (const other of state.circles) {
      if (other.id === c.id) continue
      const sameVillage =
        other.villageId !== null && c.villageId !== null && other.villageId === c.villageId
      if (sameVillage) {
        // Intra-village: only soft rivalry between weak/competing institutions.
        if (!(c.isInstitution && other.isInstitution)) continue
        if (c.legitimacy > 0.4 && other.legitimacy > 0.4) continue
      }
      const clash =
        Math.abs(c.values.fairness - other.values.fairness) +
        Math.abs(c.values.greed - other.values.greed) +
        Math.abs(c.values.tradition - other.values.tradition)
      if (clash < 0.55) continue
      const leader = other.leaderId !== null ? state.villagers.find((o) => o.id === other.leaderId && o.alive) : null
      if (!leader) continue
      const rel = v.relations.get(leader.id)
      const hostility = (rel ? Math.max(0, -rel.affinity) + (1 - rel.trust) * 0.4 : 0.35) + pol.grievance * 0.5
      const outgroup = leader.villageId !== v.villageId
      const coh = c.cohesion ?? 0.4
      // High cohesion vs outgroup → soft escalation (costly cooperation test).
      const asabiya = outgroup ? coh * 0.45 : (1 - coh) * 0.2
      const score =
        clash * 0.4 +
        hostility +
        asabiya +
        (state.famine ? 0.2 : 0) +
        (c.problemCount + other.problemCount) * 0.05
      if (score > bestScore) {
        bestScore = score
        bestRival = leader
      }
    }
  }

  if (!bestRival || bestScore < 0.75) {
    mind.rivalId = mind.rivalId !== null && pol.grievance < 0.25 ? null : mind.rivalId
    return
  }

  mind.rivalId = bestRival.id
  mind.emotions.anger = clamp01(mind.emotions.anger + 0.04 * Math.min(1, bestScore - 0.5))
  mind.emotions.stress = clamp01(mind.emotions.stress + 0.03)
  if (pol.grievance > 0.5 && v.personality.courage > 0.5 && (v.grudgeTarget === null || v.grudgeTarget === bestRival.id)) {
    v.grudgeTarget = bestRival.id
  }
  if (state.tick % 200 < 12) {
    for (const c of mine) {
      if (c.leaderId === v.id) c.problemCount += 1
    }
  }
}

export function habitTaskBias(mind: CognitiveState, kind: TaskKind): number {
  const h = mind.habits[kind] ?? 0
  if (h < 0.1) return 1
  return 1 + h * 0.85
}

export function cultureTaskBias(mind: CognitiveState, kind: TaskKind): number {
  if (!mind.cultureTag || mind.cultureWeight < 0.15) return 1
  const w = mind.cultureWeight
  const tag = mind.cultureTag
  const table: Record<string, Partial<Record<TaskKind, number>>> = {
    bois: { gatherWood: 1.35, clearLand: 1.2, buildHouse: 1.15 },
    blé: { sowField: 1.35, harvestWheat: 1.4, grindFlour: 1.25, bakeBread: 1.2 },
    fer: { gatherIron: 1.3, mineTunnel: 1.25, craftIronTool: 1.35, mineGold: 1.15 },
    pierre: { gatherStone: 1.3, buildWall: 1.25, buildMill: 1.15, socialise: 1.1 },
    sel: { tradeRun: 1.4, buildCart: 1.2, buildPort: 1.25, mintCoins: 1.2, buyMaterial: 1.15 },
    sang: { defend: 1.35, fight: 1.25, craftSpear: 1.2, buildWall: 1.3, confront: 1.15 },
    pain: { giveFood: 1.4, gatherFood: 1.2, bakeBread: 1.25, socialise: 1.15 },
    voile: { fish: 1.35, buildBoat: 1.3, buildPort: 1.2, tradeRun: 1.15, idle: 1.1 },
    laine: { captureSheep: 1.3, feedPen: 1.2, weaveCloth: 1.35, sewClothing: 1.25, tanHide: 1.2 },
    brousse: { gatherFood: 1.3, gatherWood: 1.15, fish: 1.15, idle: 1.1 },
  }
  const mult = table[tag]?.[kind]
  return mult ? 1 + (mult - 1) * w : 1
}

export function religionTaskBias(mind: CognitiveState, kind: TaskKind, x: number, y: number): number {
  if (mind.sacredConf < 0.2) return 1
  const d = distance(x, y, mind.sacredX, mind.sacredY)
  const near = d < 18
  if (kind === 'pray') {
    return near ? 1 + mind.sacredConf * 0.85 : 1 + mind.sacredConf * 0.15
  }
  if (kind === 'socialise' || kind === 'giveFood' || kind === 'rest' || kind === 'counsel') {
    return near ? 1 + mind.sacredConf * 0.55 : 1 + mind.sacredConf * 0.08
  }
  if (kind === 'steal' || kind === 'confront') {
    return near ? 1 - mind.sacredConf * 0.35 : 1
  }
  return 1
}

export function warTaskBias(mind: CognitiveState, kind: TaskKind, targetId: number | null): number {
  if (mind.rivalId === null) return 1
  if (kind === 'confront' && targetId === mind.rivalId) return 1.55 + mind.emotions.anger * 0.4
  if (kind === 'steal' && targetId === mind.rivalId) return 1.25
  if (kind === 'giveFood' && targetId === mind.rivalId) return 0.35
  if (kind === 'socialise' && targetId === mind.rivalId) return 0.45
  if ((kind === 'defend' || kind === 'fight' || kind === 'buildWall') && mind.emotions.anger > 0.3) {
    return 1.15 + mind.emotions.anger * 0.2
  }
  return 1
}

export function stubStatus(mind: CognitiveState): string {
  const bits: string[] = []
  if (mind.cultureTag) {
    const tol = Math.round(mind.cultureTolerance * 100)
    bits.push(`culture ${mind.cultureTag} (${Math.round(mind.cultureWeight * 100)}%, tol. ${tol}%)`)
  }
  const topHabit = (Object.entries(mind.habits) as [TaskKind, number][]).sort((a, b) => b[1] - a[1])[0]
  if (topHabit && topHabit[1] > 0.2) bits.push(`habitude ${topHabit[0]}`)
  if (mind.sacredConf > 0.25) bits.push(`lieu sacré ${Math.round(mind.sacredConf * 100)}%`)
  if (mind.rivalId !== null) bits.push(`rival #${mind.rivalId}`)
  return bits.length ? bits.join(' · ') : 'habitudes / culture en formation'
}

/** Vertical cultural transmission at birth (with rare mutation) — genetics ≠ culture. */
export function seedCultureFromParents(
  childMind: CognitiveState,
  parentA: CognitiveState,
  parentB: CognitiveState,
  rng: () => number,
): void {
  seedCultureFeaturesFromParents(childMind, parentA, parentB, rng)
}
