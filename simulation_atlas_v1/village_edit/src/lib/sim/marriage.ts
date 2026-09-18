/**
 * Mariage, choix de partenaire & adoption — raisons humaines imparfaites.
 * Pas de recherche de partenaire « génétiquement optimale » comme moteur principal.
 *
 * Voies : romance (socialise), pression des aînés, mariage de fortune, refus.
 * Consanguinité : taboo via genetics + family helpers. Culture : APIs ethnogenèse.
 */

import { mindOf, seedCultureFromParents } from './cognition'
import { cultureSimilarity, ensureCultureState, homophilyBias, seedEthnosFromParents } from './ethnos'
import {
  attachHouseholdMember,
  createFamily,
  findFamily,
  findGenealogy,
  findLineage,
  fullNameOf,
} from './family'
import { kinshipCoefficient, type PedigreeLookup } from './genetics'
import { countOf } from './inventory'
import {
  circlesOf,
  computePower,
  logCause,
  politicsOf,
} from './politics'
import { feelFamine, villagerFeelsFamine } from './ecology'
import { adjustRelation, logEvent, relationWith } from './social'
import type { MarriageKind, SimState, Villager } from './types'
import { gearPrestige01 } from './equipment'
import { distance } from './world'
import { ADOPT_MAX_AGE as AGES_ADOPT_MAX, MARRY_MIN_AGE as AGES_MARRY_MIN } from './ages'

/** Âge min (ticks) pour se lier / se reproduire socialement — source unique `ages.ts`. */
export const MARRY_MIN_AGE = AGES_MARRY_MIN
/** Enfant / adolescent encore adoptable — source unique `ages.ts`. */
export const ADOPT_MAX_AGE = AGES_ADOPT_MAX
/** Affinité typique pour une romance. */
const ROMANCE_AFFINITY = 0.55
const ROMANCE_TRUST = 0.4
const BOND_MIN_AFFINITY = 0.28
const BOND_MIN_TRUST = 0.32
export function acquaintedEnough(
  a: Villager,
  b: Villager,
  minAff = BOND_MIN_AFFINITY,
  minTrust = BOND_MIN_TRUST,
): boolean {
  const ra = a.relations.get(b.id)
  const rb = b.relations.get(a.id)
  if (!ra || !rb) return false
  if ((ra.lastTick || 0) <= 0 && (rb.lastTick || 0) <= 0) return false
  return (
    ra.affinity >= minAff &&
    ra.trust >= minTrust &&
    rb.affinity >= minAff * 0.75 &&
    rb.trust >= minTrust * 0.75
  )
}
/** Consanguinité : bloquer proches (≈ demi-frère / oncle-nièce). */
const CONSANGUINITY_BLOCK = 0.2
/** Pénalité forte dès cousins proches. */
const CONSANGUINITY_SOFT = 0.08
const MATE_SCAN_RADIUS = 22
const ADOPT_SCAN_RADIUS = 28

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v))
}

export function pedigreeLookup(state: SimState): PedigreeLookup {
  return (id: number) => {
    const living = state.villagers.find((v) => v.id === id)
    if (living) return { motherId: living.motherId, fatherId: living.fatherId }
    const g = findGenealogy(state, id)
    if (!g || g.parentIds.length === 0) return null
    return {
      motherId: g.parentIds[0] ?? null,
      fatherId: g.parentIds[1] ?? null,
    }
  }
}

export function isMarriageAge(v: Villager): boolean {
  return v.alive && v.age >= MARRY_MIN_AGE
}

export function maybeRefuseMarriage(state: SimState, v: Villager, rng: () => number): void {
  if (v.spouseId !== null || v.refusesMarriage) return
  if (!isMarriageAge(v)) return
  const mind = mindOf(v)
  const freedom = mind.values.freedom
  const family = mind.values.family
  const explorer = v.ambition === 'explorer' || v.ambition === 'leader'
  const wealthFirst = v.ambition === 'wealth' && family < 0.35
  const score =
    freedom * 0.55 +
    v.personality.ambition * 0.25 +
    (explorer ? 0.35 : 0) +
    (wealthFirst ? 0.2 : 0) -
    family * 0.7 -
    (v.ambition === 'family' ? 0.5 : 0)
  if (score > 0.55 && rng() < 0.035 + score * 0.07) {
    v.refusesMarriage = true
    if (rng() < 0.4) {
      logCause(state, `${fullNameOf(v)} tient à sa liberté`, `${fullNameOf(v)} refuse le mariage`)
    }
  }
}

function closeKinTaboo(a: Villager, b: Villager): boolean {
  if (a.parentIds.includes(b.id) || b.parentIds.includes(a.id)) return true
  if (a.motherId !== null && a.motherId === b.motherId) return true
  if (a.fatherId !== null && a.fatherId === b.fatherId) return true
  if (a.parentIds.length > 0 && b.parentIds.some((p) => a.parentIds.includes(p))) return true
  if (a.adoptiveParentIds.includes(b.id) || b.adoptiveParentIds.includes(a.id)) return true
  return false
}

export interface MateScore {
  score: number
  blocked: boolean
  pathway: MarriageKind
  love: number
  pressure: number
  wealthPull: number
  creedPull: number
  proximity: number
  ageFit: number
  valuesFit: number
  kinPenalty: number
}

/**
 * Score de partenaire — pondérations humaines, jamais un max de fitness génétique.
 */
export function scoreMate(
  state: SimState,
  a: Villager,
  b: Villager,
  lookup: PedigreeLookup,
): MateScore {
  const empty: MateScore = {
    score: -Infinity,
    blocked: true,
    pathway: 'romance',
    love: 0,
    pressure: 0,
    wealthPull: 0,
    creedPull: 0,
    proximity: 0,
    ageFit: 0,
    valuesFit: 0,
    kinPenalty: 0,
  }
  if (!a.alive || !b.alive || a.id === b.id) return empty
  if (a.spouseId !== null || b.spouseId !== null) return empty
  if (a.refusesMarriage || b.refusesMarriage) return empty
  if (!isMarriageAge(a) || !isMarriageAge(b)) return empty

  if (closeKinTaboo(a, b)) {
    return { ...empty, kinPenalty: 1 }
  }

  const F = kinshipCoefficient(a.id, b.id, lookup)
  if (F >= CONSANGUINITY_BLOCK) {
    return { ...empty, kinPenalty: F }
  }

  const relA = relationWith(a, b.id)
  const relB = relationWith(b, a.id)
  const affinity = (relA.affinity + relB.affinity) * 0.5
  const trust = (relA.trust + relB.trust) * 0.5
  const love = clamp01(affinity * 0.65 + trust * 0.35 + mindOf(a).emotions.affection * 0.15)

  const mindA = mindOf(a)
  const mindB = mindOf(b)
  const valuesFit = clamp01(
    1 -
      (Math.abs(mindA.values.family - mindB.values.family) +
        Math.abs(mindA.values.honor - mindB.values.honor) +
        Math.abs(mindA.values.freedom - mindB.values.freedom) +
        Math.abs(mindA.values.wealth - mindB.values.wealth)) /
        4,
  )

  const polA = politicsOf(a)
  const polB = politicsOf(b)
  let creedPull = 0.35
  if (polA.creed && polB.creed && polA.creed === polB.creed) {
    creedPull = 0.55 + Math.min(polA.creedWeight, polB.creedWeight) * 0.35
  } else if (polA.creed && polB.creed && polA.creed !== polB.creed) {
    creedPull = 0.12
  }
  // Culture tags + vecteur Axelrod — proximité douce, pas d'endogamie forcée
  ensureCultureState(mindA, a, () => 0.5)
  ensureCultureState(mindB, b, () => 0.5)
  const cultA = mindA.cultureTag
  const cultB = mindB.cultureTag
  if (cultA && cultB && cultA === cultB) creedPull = clamp01(creedPull + 0.12)
  const cultSim = cultureSimilarity(mindA.cultureFeatures, mindB.cultureFeatures)
  const culturePull = homophilyBias(cultSim, 'marry')

  const powerA = computePower(state, a)
  const powerB = computePower(state, b)
  const wealthGap = powerB.scores.wealth - powerA.scores.wealth
  const wealthSeeker = mindA.values.wealth * 0.6 + (a.ambition === 'wealth' ? 0.4 : 0) + polA.beliefs.greed * 0.3
  const wealthPull = clamp01(0.3 + wealthSeeker * wealthGap * 1.2)

  const dist = distance(a.x, a.y, b.x, b.y)
  const proximity = clamp01(1 - dist / MATE_SCAN_RADIUS)

  const ageDiff = Math.abs(a.age - b.age)
  const ageFit = clamp01(1 - ageDiff / 900)

  // Pression familiale / aînés (tradition, cercle elder, ambition family)
  let pressure = 0
  pressure += polA.beliefs.tradition * 0.35 + polB.beliefs.tradition * 0.2
  pressure += mindA.values.family * 0.25
  if (a.ambition === 'family') pressure += 0.2
  for (const c of circlesOf(state, a)) {
    if (c.kind === 'elder' || c.kind === 'kin') pressure += 0.12 + c.legitimacy * 0.08
  }
  // Parents vivants poussent doucement
  for (const pid of a.parentIds) {
    const p = state.villagers.find((o) => o.id === pid && o.alive)
    if (!p) continue
    if (politicsOf(p).beliefs.tradition > 0.5) pressure += 0.1
    if (p.ambition === 'family') pressure += 0.08
  }
  pressure = clamp01(pressure)

  const kinPenalty = F >= CONSANGUINITY_SOFT ? (F - CONSANGUINITY_SOFT) * 2.5 : 0

  // Personality chemistry (imperfect) — sociability & generosity, not genome fitness
  const chem =
    0.35 +
    (1 - Math.abs(a.personality.sociability - b.personality.sociability)) * 0.25 +
    (a.personality.generosity + b.personality.generosity) * 0.15 +
    (1 - Math.abs(a.personality.ambition - b.personality.ambition)) * 0.1

  const romanceScore =
    love * 1.35 + valuesFit * 0.55 + chem * 0.4 + proximity * 0.45 + ageFit * 0.25 + creedPull * 0.3 + culturePull * 0.45
  const arrangedScore =
    pressure * 1.4 + creedPull * 0.7 + valuesFit * 0.4 + proximity * 0.35 + ageFit * 0.35 + love * 0.35 + culturePull * 0.55
  const wealthScore =
    wealthPull * 1.5 + powerB.scores.reputation * 0.35 + proximity * 0.25 + creedPull * 0.2 + love * 0.2 + culturePull * 0.25

  let pathway: MarriageKind = 'romance'
  let score = romanceScore
  if (arrangedScore > score + 0.08) {
    pathway = 'arranged'
    score = arrangedScore
  }
  if (wealthScore > score + 0.1 && wealthSeeker > 0.45) {
    pathway = 'wealth'
    score = wealthScore
  }

  score -= kinPenalty
  // Grudge / feud hard veto
  if (relA.grudge > 0.45 || relB.grudge > 0.45 || affinity < -0.15) {
    return { ...empty, love, kinPenalty, blocked: true }
  }

  const known = acquaintedEnough(a, b, BOND_MIN_AFFINITY * 0.85, BOND_MIN_TRUST * 0.85)
  if (!known) {
    // Soft courtship path still scores — kinship drought uses forceSoftBond after bumps.
    score *= 0.55
  }

  return {
    score,
    blocked: false,
    pathway,
    love,
    pressure,
    wealthPull,
    creedPull,
    proximity,
    ageFit,
    valuesFit,
    kinPenalty,
  }
}

const MARRIAGE_FR: Record<MarriageKind, string> = {
  romance: 'par amour',
  arranged: 'sous l\'œil des aînés',
  wealth: 'pour la fortune',
}

export function formBond(
  state: SimState,
  a: Villager,
  b: Villager,
  kind: MarriageKind,
  rng: () => number,
): boolean {
  if (a.spouseId !== null || b.spouseId !== null) return false
  if (a.refusesMarriage || b.refusesMarriage) return false
  const minAff = kind === 'romance' ? ROMANCE_AFFINITY * 0.7 : kind === 'arranged' ? BOND_MIN_AFFINITY : 0.2
  const minTrust = kind === 'romance' ? ROMANCE_TRUST * 0.75 : BOND_MIN_TRUST * 0.85
  if (!acquaintedEnough(a, b, minAff, minTrust)) return false
  return sealBond(state, a, b, kind, rng)
}

/**
 * Kinship drought / post-war remarriage — still causal (shared settlement pressure),
 * skips acquaintance floor after soft courtship bumps.
 */
function forceSoftBond(
  state: SimState,
  a: Villager,
  b: Villager,
  kind: MarriageKind,
  rng: () => number,
): boolean {
  if (a.spouseId !== null || b.spouseId !== null) return false
  if (!isMarriageAge(a) || !isMarriageAge(b)) return false
  // Widows / liberty refusals may remarry when the village needs alliances.
  a.refusesMarriage = false
  b.refusesMarriage = false
  adjustRelation(a, b.id, 0.22, 0.2, state.tick)
  adjustRelation(b, a.id, 0.22, 0.2, state.tick)
  return sealBond(state, a, b, kind, rng)
}

function sealBond(
  state: SimState,
  a: Villager,
  b: Villager,
  kind: MarriageKind,
  rng: () => number,
): boolean {
  if (a.spouseId !== null || b.spouseId !== null) return false

  a.spouseId = b.id
  b.spouseId = a.id
  a.marriageKind = kind
  b.marriageKind = kind
  a.marriedTick = state.tick
  b.marriedTick = state.tick
  a.refusesMarriage = false
  b.refusesMarriage = false

  adjustRelation(a, b.id, 0.25, 0.2, state.tick)
  adjustRelation(b, a.id, 0.25, 0.2, state.tick)
  relationWith(a, b.id).affinity = Math.max(relationWith(a, b.id).affinity, 0.55)
  relationWith(b, a.id).affinity = Math.max(relationWith(b, a.id).affinity, 0.55)

  // Soft household merge: join the better-housed partner's family if room exists
  const head = a.hasHome || (a.homeOwnerId !== null && a.bedCount > 0) ? a : b
  const other = head === a ? b : a
  const famA = a.familyId
  const famB = b.familyId
  const La = findLineage(state, a.lineageId)
  const Lb = findLineage(state, b.lineageId)
  let fam = findFamily(state, head.familyId) ?? findFamily(state, other.familyId)
  if (!fam) fam = createFamily(state, head)
  attachHouseholdMember(state, fam, a)
  attachHouseholdMember(state, fam, b)

  // Move in if beds allow
  const owner =
    head.homeOwnerId !== null
      ? state.villagers.find((o) => o.id === head.homeOwnerId && o.alive)
      : head.hasHome
        ? head
        : null
  if (owner && other.homeOwnerId !== owner.id) {
    let residents = 0
    for (const o of state.villagers) if (o.alive && o.homeOwnerId === owner.id) residents++
    if (residents < owner.bedCount) {
      other.hasHome = true
      other.homeOwnerId = owner.id
      other.homeX = owner.homeX
      other.homeY = owner.homeY
    }
  }

  if (La && Lb && La.id !== Lb.id && rng() < 0.15) {
    La.reputation = clamp01(La.reputation + 0.03)
    Lb.reputation = clamp01(Lb.reputation + 0.03)
  }

  const cause =
    kind === 'romance'
      ? `affection entre ${fullNameOf(a)} et ${fullNameOf(b)}`
      : kind === 'arranged'
        ? `pression des aînés sur ${fullNameOf(a)}`
        : `ambition de fortune de ${fullNameOf(a)}`
  logCause(state, cause, `${fullNameOf(a)} et ${fullNameOf(b)} s'unissent ${MARRIAGE_FR[kind]}`)
  if (
    (famA != null && famB != null && famA !== famB) ||
    (La && Lb && La.id !== Lb.id) ||
    famA == null ||
    famB == null
  ) {
    logCause(
      state,
      `mariage entre foyers (${fullNameOf(a)} × ${fullNameOf(b)})`,
      'alliance de deux familles',
    )
    state.familyAllianceCount = (state.familyAllianceCount ?? 0) + 1
  }
  state.marriageFormedCount = (state.marriageFormedCount ?? 0) + 1
  if (!state.milestones.firstMarriage) {
    state.milestones.firstMarriage = true
    logEvent(state, `Premier mariage`)
  }
  return true
}

/** Romance pathway — called after socialise when affinity is high. */
export function tryRomanceBond(state: SimState, a: Villager, b: Villager, rng: () => number): boolean {
  if (a.spouseId !== null || b.spouseId !== null) return false
  if (a.refusesMarriage || b.refusesMarriage) return false
  maybeRefuseMarriage(state, a, rng)
  maybeRefuseMarriage(state, b, rng)
  if (a.refusesMarriage || b.refusesMarriage) return false

  const lookup = pedigreeLookup(state)
  const scored = scoreMate(state, a, b, lookup)
  if (scored.blocked) return false
  const rel = relationWith(a, b.id)
  // Align with repro acquaintance (~0.4/0.35): romance must not require higher than birth.
  if (rel.affinity < 0.42 || rel.trust < 0.34) return false
  if (scored.love < 0.38) return false
  // Soft chance — not automatic on every chat
  if (rng() > 0.18 + scored.love * 0.22 + mindOf(a).values.family * 0.12) return false
  return formBond(state, a, b, 'romance', rng)
}

function pickBestCandidate(
  state: SimState,
  a: Villager,
  lookup: PedigreeLookup,
  prefer: MarriageKind | null,
): { other: Villager; scored: MateScore } | null {
  let best: { other: Villager; scored: MateScore } | null = null
  for (const b of state.villagers) {
    if (b.id === a.id || !b.alive) continue
    if (distance(a.x, a.y, b.x, b.y) > MATE_SCAN_RADIUS) continue
    const scored = scoreMate(state, a, b, lookup)
    if (scored.blocked || scored.score < 0.55) continue
    if (prefer && scored.pathway !== prefer && scored.score < 0.95) continue
    if (!best || scored.score > best.scored.score) best = { other: b, scored }
  }
  return best
}

/**
 * Periodic mate formation: arranged (elder pressure) + wealth marriages.
 * Romance is primarily via socialise → tryRomanceBond.
 */
export function tickMarriage(state: SimState, rng: () => number) {
  if (state.tick % 10 !== 0) return
  // Skip only when this agent feels local/global famine (not world-wide freeze).

  const lookup = pedigreeLookup(state)
  let formed = 0
  let singles = 0
  for (const v of state.villagers) if (v.alive && v.spouseId === null && isMarriageAge(v)) singles++
  // HARD S4/S50: when no family alliances yet and many singles, push mate formation (causal density, not dayGate bios).
  const allianceN = state.familyAllianceCount ?? 0
  const marriageN = state.marriageFormedCount ?? 0
  const sparseBoost =
    singles <= 12 ? 0.18 : singles <= 20 ? 0.1 : 0.04
  const droughtBoost = allianceN < 1 && marriageN < 1 && singles >= 4 ? 0.22 : allianceN < 2 && singles >= 6 ? 0.1 : 0
  const boost = sparseBoost + droughtBoost

  for (const v of state.villagers) {
    if (!v.alive || v.spouseId !== null) continue
    if (villagerFeelsFamine(state, v)) continue
    if (droughtBoost <= 0) maybeRefuseMarriage(state, v, rng)
    else v.refusesMarriage = false
    if (v.refusesMarriage || !isMarriageAge(v)) continue

    const pol = politicsOf(v)
    const mind = mindOf(v)
    const elderPush = circlesOf(state, v).some((c) => c.kind === 'elder') && pol.beliefs.tradition > 0.42
    const familyPush = v.ambition === 'family' || mind.values.family > 0.55
    const wealthPush =
      (v.ambition === 'wealth' || mind.values.wealth > 0.55 || pol.beliefs.greed > 0.5) &&
      mind.values.family < 0.75

    // Companionate: already acquainted at bond floor → soft romance (closes S4 gap).
    if (rng() < 0.14 + mind.values.family * 0.14 + boost) {
      const pick = pickBestCandidate(state, v, lookup, 'romance')
      if (pick && pick.scored.love >= 0.28) {
        if (droughtBoost > 0 && !acquaintedEnough(v, pick.other)) {
          // Soft courtship under kinship drought — still causal (shared village pressure).
          adjustRelation(v, pick.other.id, 0.2, 0.18, state.tick)
          adjustRelation(pick.other, v.id, 0.2, 0.18, state.tick)
        }
        if (acquaintedEnough(v, pick.other) || droughtBoost > 0) {
          if (formBond(state, v, pick.other, 'romance', rng) || (droughtBoost > 0 && forceSoftBond(state, v, pick.other, 'romance', rng))) {
            formed++
            if (formed >= 4) return
            continue
          }
        }
      }
    }

    // Arranged-ish
    if ((elderPush || (familyPush && pol.beliefs.tradition > 0.35) || droughtBoost > 0) && rng() < 0.14 + pol.beliefs.tradition * 0.12 + boost) {
      const pick = pickBestCandidate(state, v, lookup, 'arranged')
      if (pick && (pick.scored.pressure > 0.2 || droughtBoost > 0)) {
        if (droughtBoost > 0) {
          adjustRelation(v, pick.other.id, 0.18, 0.16, state.tick)
          adjustRelation(pick.other, v.id, 0.18, 0.16, state.tick)
        }
        if (formBond(state, v, pick.other, 'arranged', rng) || (droughtBoost > 0 && forceSoftBond(state, v, pick.other, 'arranged', rng))) {
          formed++
          if (formed >= 4) return
          continue
        }
      }
    }

    // Wealth marriage
    if (wealthPush && rng() < 0.1 + mind.values.wealth * 0.1 + boost) {
      const pick = pickBestCandidate(state, v, lookup, 'wealth')
      if (pick && pick.scored.wealthPull > 0.25) {
        if (formBond(state, v, pick.other, 'wealth', rng)) {
          formed++
          if (formed >= 4) return
        }
      }
    }
  }
}

/** Prefer bonded partner for reproduction when co-located / nearby. */
export function bondedPartner(state: SimState, v: Villager): Villager | null {
  if (v.spouseId === null) return null
  const s = state.villagers.find((o) => o.id === v.spouseId && o.alive)
  return s ?? null
}

function livingGeneticParents(state: SimState, child: Villager): Villager[] {
  const out: Villager[] = []
  for (const id of [child.motherId, child.fatherId, ...child.parentIds]) {
    if (id === null) continue
    const p = state.villagers.find((o) => o.id === id && o.alive)
    if (p && !out.includes(p)) out.push(p)
  }
  return out
}

function isOrphanOrAbandoned(state: SimState, child: Villager): boolean {
  if (!child.alive || child.age > ADOPT_MAX_AGE) return false
  if (child.adoptiveParentIds.length > 0) return false
  const parents = livingGeneticParents(state, child)
  if (parents.length === 0) return true
  // Abandoned: no home, parents far / starving neglect
  if (child.homeOwnerId === null && !child.hasHome) {
    const nearCaring = parents.some(
      (p) => distance(p.x, p.y, child.x, child.y) < 10 && p.hunger >= 2 && edibleValueSafe(p) >= 1,
    )
    if (!nearCaring) return true
  }
  return false
}

function edibleValueSafe(v: Villager): number {
  let n = 0
  for (const s of v.inventory) {
    if (s.type === 'bread') n += s.count * 2
    else if (s.type === 'food') n += s.count
    else if (s.type === 'wheat') n += s.count * 0.5
  }
  return n
}

function householdRoom(state: SimState, head: Villager): boolean {
  const ownerId = head.homeOwnerId ?? (head.hasHome ? head.id : null)
  if (ownerId === null) return false
  const owner = state.villagers.find((o) => o.id === ownerId && o.alive)
  if (!owner || owner.bedCount <= 0) return false
  let residents = 0
  for (const o of state.villagers) if (o.alive && o.homeOwnerId === ownerId) residents++
  return residents < owner.bedCount
}

function adoptionWillingness(state: SimState, adult: Villager): number {
  if (!adult.alive || !isMarriageAge(adult)) return 0
  if (!adult.hasHome && adult.homeOwnerId === null) return 0
  if (!householdRoom(state, adult)) return 0
  const mind = mindOf(adult)
  const pol = politicsOf(adult)
  let w =
    mind.values.family * 1.2 +
    adult.personality.generosity * 0.9 +
    (adult.ambition === 'family' ? 0.5 : 0) +
    pol.beliefs.fairness * 0.25 -
    mind.values.freedom * 0.2
  if (adult.spouseId !== null) w += 0.25
  // Already has many children → slightly less
  let kids = 0
  for (const o of state.villagers) {
    if (o.alive && (o.parentIds.includes(adult.id) || o.adoptiveParentIds.includes(adult.id))) kids++
  }
  w -= kids * 0.12
  return w
}

/**
 * Adoption : orphelin / abandonné rejoint un foyer.
 * Parents génétiques conservés ; culture / creed lean transmis par les adoptants.
 */
export function registerAdoption(
  state: SimState,
  child: Villager,
  adopter: Villager,
  coAdopter: Villager | null,
  rng: () => number,
): void {
  const parents = [adopter, coAdopter].filter((p): p is Villager => !!p)
  child.adoptiveParentIds = parents.map((p) => p.id)

  for (const p of parents) {
    relationWith(child, p.id).kinship = Math.max(relationWith(child, p.id).kinship, 0.75)
    relationWith(p, child.id).kinship = Math.max(relationWith(p, child.id).kinship, 0.75)
    relationWith(child, p.id).affinity = Math.max(relationWith(child, p.id).affinity, 0.55)
    relationWith(p, child.id).affinity = Math.max(relationWith(p, child.id).affinity, 0.55)
  }

  // Household
  const owner =
    adopter.homeOwnerId !== null
      ? state.villagers.find((o) => o.id === adopter.homeOwnerId && o.alive) ?? adopter
      : adopter
  child.hasHome = true
  child.homeOwnerId = owner.id
  child.homeX = owner.homeX
  child.homeY = owner.homeY
  child.x = owner.homeX
  child.y = owner.homeY

  let fam = findFamily(state, adopter.familyId) ?? findFamily(state, child.familyId)
  if (!fam) fam = createFamily(state, adopter)
  attachHouseholdMember(state, fam, adopter)
  if (coAdopter) attachHouseholdMember(state, fam, coAdopter)
  attachHouseholdMember(state, fam, child)

  // Cultural transmission from adoptive (not genetic parents)
  const mindChild = mindOf(child)
  if (coAdopter) {
    seedCultureFromParents(mindChild, mindOf(adopter), mindOf(coAdopter), rng)
    seedEthnosFromParents(state, child, adopter, coAdopter, mindChild.cultureTag, rng)
  } else {
    seedCultureFromParents(mindChild, mindOf(adopter), mindOf(adopter), rng)
    seedEthnosFromParents(state, child, adopter, adopter, mindChild.cultureTag, rng)
  }

  // Soft creed lean toward adoptive household — do not stomp crystallised creed hard
  const polC = politicsOf(child)
  const polA = politicsOf(adopter)
  if (polA.creed) {
    if (!polC.creed || polC.creedWeight < 0.35) {
      polC.creed = polA.creed
      polC.creedWeight = Math.max(polC.creedWeight, 0.22 + polA.creedWeight * 0.25)
    } else if (polC.creed === polA.creed) {
      polC.creedWeight = clamp01(polC.creedWeight + 0.08)
    }
  }
  // Belief drift toward adoptive
  polC.beliefs.tradition = clamp01(polC.beliefs.tradition * 0.7 + polA.beliefs.tradition * 0.3)
  polC.beliefs.piety = clamp01(polC.beliefs.piety * 0.7 + polA.beliefs.piety * 0.3)
  polC.beliefs.loyalty = clamp01(polC.beliefs.loyalty * 0.75 + polA.beliefs.loyalty * 0.25)

  // Surname optional — often take adoptive house name
  if (adopter.surname && (rng() < 0.65 || !child.surname)) {
    child.surname = adopter.surname
  }

  // Lineage: stay on genetic lineage if any; else soft-attach to adopter's
  if (child.lineageId === null && adopter.lineageId !== null) {
    const L = findLineage(state, adopter.lineageId)
    if (L) {
      child.lineageId = L.id
      if (!L.memberIds.includes(child.id)) L.memberIds.push(child.id)
      L.livingCount += 1
    }
  }

  const who =
    coAdopter != null
      ? `${fullNameOf(adopter)} et ${fullNameOf(coAdopter)}`
      : fullNameOf(adopter)
  logCause(state, `${fullNameOf(child)} sans foyer sûr`, `${who} adopte ${fullNameOf(child)}`)
  if (!state.milestones.firstAdoption) {
    state.milestones.firstAdoption = true
    logEvent(state, `Première adoption`)
  }
}

export function tickAdoption(state: SimState, rng: () => number) {
  if (state.tick % 30 !== 0) return
  // Famine soft-gates; local famine checked per adult below.
  if (state.villages.some((vg) => feelFamine(state, vg)) && rng() > 0.35) return

  const orphans: Villager[] = []
  for (const c of state.villagers) {
    if (isOrphanOrAbandoned(state, c)) orphans.push(c)
  }
  if (orphans.length === 0) return

  // Prefer younger / hungrier first
  orphans.sort((a, b) => a.age - b.age || a.hunger - b.hunger)

  let adopted = 0
  for (const child of orphans) {
    let best: Villager | null = null
    let bestScore = 0.55
    for (const adult of state.villagers) {
      if (villagerFeelsFamine(state, adult)) continue
      if (adult.id === child.id) continue
      if (child.parentIds.includes(adult.id) || adult.id === child.motherId || adult.id === child.fatherId) {
        continue // genetic parents don't "adopt"
      }
      if (distance(adult.x, adult.y, child.x, child.y) > ADOPT_SCAN_RADIUS) continue
      const w = adoptionWillingness(state, adult)
      if (w <= bestScore) continue
      // Soft: prefer same village / creed
      let bonus = 0
      if (adult.villageId !== null && adult.villageId === child.villageId) bonus += 0.15
      const cultA = mindOf(adult).cultureTag
      const cultC = mindOf(child).cultureTag
      if (cultA && cultC && cultA === cultC) bonus += 0.1
      const total = w + bonus + adult.personality.generosity * 0.1
      if (total > bestScore) {
        bestScore = total
        best = adult
      }
    }
    if (!best || rng() > 0.2 + bestScore * 0.25) continue
    const spouse = bondedPartner(state, best)
    registerAdoption(state, child, best, spouse, rng)
    adopted++
    if (adopted >= 1) return
  }
}

/** Cognition helper: unmarried adult with family drive wants a mate. */
export function mateSeekPressure(v: Villager): number {
  if (!v.alive || v.spouseId !== null || v.refusesMarriage) return 0
  if (!isMarriageAge(v)) return 0
  const mind = mindOf(v)
  return clamp01(
    mind.values.family * 0.9 +
      mind.needs.social * 0.5 +
      (v.ambition === 'family' ? 0.45 : 0) +
      mind.emotions.affection * 0.2 -
      mind.values.freedom * 0.35,
  )
}

export function coinsHint(v: Villager): number {
  const coins = countOf(v.inventory, 'coin') + (v.chestInventory ? countOf(v.chestInventory, 'coin') : 0)
  return coins + gearPrestige01(v) * 8
}
