/**
 * Familles & lignées émergentes — pas de maisons nobles prédéfinies.
 * Individus → familles (foyer) → lignées (mémoire historique) → (populations plus tard).
 *
 * Pedigree : parentIds + lineageId sur le villageois ; stubs légers dans state.genealogy
 * pour reconstruire à la demande sans garder les morts complets.
 */

import { estimateWealth } from './ecology'
import { householdSleepCapacity } from './furniture'
import { addToInventory, countOf, edibleValue, removeFromInventory, type ResourceType } from './inventory'
import { logCause, politicsOf } from './politics'
import {
  generateGivenName,
  generateFounderSurname,
  formChildSurname,
  type SurnameOrigin,
  type TraditionTag,
} from './personality'
import { logEvent, relationWith } from './social'
import type { Profession, SimState, Villager } from './types'
import { noteHelpEvent } from './causalityMetrics'

export type { SurnameOrigin, TraditionTag }

export const PEDIGREE_DEPTH = 4
export const MAX_KNOWN_ANCESTORS = 8
export const MAX_LINEAGE_MEMBERS = 48
export const MAX_FAMILY_MEMBERS = 16
export const MAX_GENEALOGY_ENTRIES = 280
export const MAX_TRADITIONS = 6

export type FamousReason = 'leader' | 'rich' | 'chronicled' | 'founder'

export interface GenealogyEntry {
  id: number
  givenName: string
  surname: string
  parentIds: number[]
  lineageId: number | null
  birthTick: number
  deathTick: number | null
  fame: number
  fameReason: FamousReason | null
}

export interface KnownAncestor {
  id: number
  name: string
  surname: string
  reason: FamousReason
  fame: number
  tick: number
}

export interface Lineage {
  id: number
  surname: string
  surnameOrigin: SurnameOrigin
  founderId: number
  /** Living + recently attached member ids (capped). */
  memberIds: number[]
  livingCount: number
  deadCount: number
  reputation: number
  wealthEstimate: number
  traditions: TraditionTag[]
  knownAncestors: KnownAncestor[]
  /** Parent lineages after split/merge. */
  parentLineageIds: number[]
  faded: boolean
  renamedFrom: string | null
  villageId: number | null
  foundedTick: number
  /** Soft nobility — wealth + reputation + generations (sim §61). */
  isDynasty?: boolean
  /** Approximate generation depth from founders / deaths. */
  generations?: number
}

/** Current household / co-resident kin — distinct from historical lineage. */
export interface Family {
  id: number
  homeOwnerId: number | null
  memberIds: number[]
  /** Primary lineage of the household head. */
  lineageId: number | null
  livingCount: number
  wealthAggregate: number
  reputation: number
  traditions: TraditionTag[]
}

export interface PedigreeNode {
  id: number
  givenName: string
  surname: string
  alive: boolean
  parentIds: number[]
  depth: number
}

export interface FamilySummary {
  surname: string
  lineageName: string | null
  lineageReputation: number
  familySize: number
  livingKin: number
  parents: { id: number; name: string }[]
  siblings: { id: number; name: string }[]
  spouse: { id: number; name: string } | null
  children: { id: number; name: string }[]
  famousAncestors: { name: string; reason: FamousReason; fame: number }[]
  traditions: string[]
  ancestorMemory: number
  pedigree: PedigreeNode[]
}

/** Optional genetics bridge — parallel module can register breedGenome here. */
export type FamilyGeneticsHook = (
  mother: Villager,
  father: Villager,
  child: Villager,
  rng: () => number,
) => void

let geneticsHook: FamilyGeneticsHook | null = null

export function setFamilyGeneticsHook(fn: FamilyGeneticsHook | null) {
  geneticsHook = fn
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v))
}

function displayName(given: string, surname: string): string {
  return surname ? `${given} ${surname}` : given
}

export function fullNameOf(v: Pick<Villager, 'name' | 'surname'>): string {
  return displayName(v.name, v.surname)
}

function pushUnique(ids: number[], id: number, cap: number) {
  if (ids.includes(id)) return
  ids.push(id)
  while (ids.length > cap) ids.shift()
}

function pushTradition(list: TraditionTag[], tag: TraditionTag) {
  if (list.includes(tag)) return
  list.push(tag)
  while (list.length > MAX_TRADITIONS) list.shift()
}

export function findLineage(state: SimState, id: number | null): Lineage | null {
  if (id === null) return null
  for (const L of state.lineages) if (L.id === id) return L
  return null
}

export function findFamily(state: SimState, id: number | null): Family | null {
  if (id === null) return null
  for (const f of state.families) if (f.id === id) return f
  return null
}

/** Household record for a villager (co-residence foyer) — null if unattached. */
export function familyOf(state: SimState, v: Pick<Villager, 'familyId'>): Family | null {
  return findFamily(state, v.familyId)
}

/** True when both share a non-null familyId (foyer), not mere kinship. */
export function sameFamily(
  a: Pick<Villager, 'familyId'>,
  b: Pick<Villager, 'familyId'>,
): boolean {
  return a.familyId !== null && a.familyId === b.familyId
}

/** Living members of the villager's foyer (falls back to self alone). */
export function familyMembers(state: SimState, v: Villager): Villager[] {
  const fam = familyOf(state, v)
  if (!fam) return v.alive ? [v] : []
  const out: Villager[] = []
  for (const id of fam.memberIds) {
    const m = state.villagers.find((o) => o.id === id && o.alive)
    if (m) out.push(m)
  }
  return out.length > 0 ? out : v.alive ? [v] : []
}

/**
 * Home owner whose chest is the household pantry.
 * Prefer Family.homeOwnerId, then villager.homeOwnerId / self-owned home.
 */
export function familyHomeOwner(state: SimState, v: Villager): Villager | null {
  const fam = familyOf(state, v)
  const ownerId =
    fam?.homeOwnerId ??
    v.homeOwnerId ??
    (v.hasHome ? v.id : null)
  if (ownerId === null) return null
  return state.villagers.find((o) => o.id === ownerId && o.alive) ?? null
}

/**
 * Readable household pantry edible value (homeOwner pack + chest).
 * Reader only — does not transfer or consume (no eat/mill rewrite).
 */
export function familyEdible(state: SimState, v: Villager): number {
  const owner = familyHomeOwner(state, v)
  if (!owner) return edibleValue(v.inventory)
  let e = edibleValue(owner.inventory)
  if (owner.chestInventory) e += edibleValue(owner.chestInventory)
  return e
}

/**
 * Live foyer wealth sum; refreshes Family.wealthAggregate when a family exists.
 */
export function familyWealth(state: SimState, v: Villager): number {
  const fam = familyOf(state, v)
  const members = familyMembers(state, v)
  let w = 0
  for (const m of members) w += wealthOf(m)
  if (fam) fam.wealthAggregate = w
  return w
}

export type HelpKind = 'food' | 'teach' | 'defend' | 'build' | 'haul' | 'labor'

/** Cheap §30 instrumentation — bump one aid category on successful help. */
export function recordHelp(state: SimState, kind: HelpKind, helperId?: number): void {
  const c = state.helpCounters
  if (!c) return
  c[kind] = (c[kind] ?? 0) + 1
  noteHelpEvent(state, kind, helperId)
}

export function findGenealogy(state: SimState, id: number): GenealogyEntry | undefined {
  return state.genealogy.find((g) => g.id === id)
}

function wealthOf(v: Villager): number {
  return estimateWealth(v)
}

function personalReputation(state: SimState, v: Villager): number {
  const pol = politicsOf(v)
  let r = 0.35 + pol.legitimacy * 0.4 - pol.grievance * 0.15
  for (const c of state.circles) {
    if (!c.memberIds.includes(v.id)) continue
    r += c.reputation * 0.08
    if (c.leaderId === v.id) r += 0.2 + c.legitimacy * 0.15
  }
  r += Math.min(0.25, wealthOf(v) / 40)
  return clamp01(r)
}

/** Soft boost from remembered famous ancestors (not scripted nobility). */
export function ancestorMemoryBonus(state: SimState, v: Villager): number {
  const L = findLineage(state, v.lineageId)
  if (!L || L.knownAncestors.length === 0) return 0
  let sum = 0
  for (const a of L.knownAncestors) {
    sum += a.fame * 0.12
  }
  return clamp01(sum / Math.max(1, L.knownAncestors.length))
}

export function createLineage(
  state: SimState,
  founder: Villager,
  surname: string,
  origin: SurnameOrigin,
  tick: number,
): Lineage {
  const L: Lineage = {
    id: state.nextLineageId++,
    surname,
    surnameOrigin: origin,
    founderId: founder.id,
    memberIds: [founder.id],
    livingCount: 1,
    deadCount: 0,
    reputation: 0.4,
    wealthEstimate: wealthOf(founder),
    traditions: [],
    knownAncestors: [],
    parentLineageIds: [],
    faded: false,
    renamedFrom: null,
    villageId: founder.villageId,
    foundedTick: tick,
  }
  if (founder.profession !== 'none') pushTradition(L.traditions, `craft:${founder.profession}`)
  state.lineages.push(L)
  return L
}

export function createFamily(state: SimState, head: Villager): Family {
  const f: Family = {
    id: state.nextFamilyId++,
    homeOwnerId: head.hasHome ? head.id : head.homeOwnerId,
    memberIds: [head.id],
    lineageId: head.lineageId,
    livingCount: 1,
    wealthAggregate: wealthOf(head),
    reputation: 0.4,
    traditions: [],
  }
  state.families.push(f)
  return f
}

function upsertGenealogy(
  state: SimState,
  v: Villager,
  birthTick: number,
  deathTick: number | null = null,
) {
  let g = findGenealogy(state, v.id)
  if (!g) {
    g = {
      id: v.id,
      givenName: v.name,
      surname: v.surname,
      parentIds: [...v.parentIds],
      lineageId: v.lineageId,
      birthTick,
      deathTick,
      fame: 0,
      fameReason: null,
    }
    state.genealogy.push(g)
  } else {
    g.givenName = v.name
    g.surname = v.surname
    g.parentIds = [...v.parentIds]
    g.lineageId = v.lineageId
    if (deathTick !== null) g.deathTick = deathTick
  }
  pruneGenealogy(state)
}

function pruneGenealogy(state: SimState) {
  if (state.genealogy.length <= MAX_GENEALOGY_ENTRIES) return
  const living = new Set<number>()
  for (const v of state.villagers) if (v.alive) living.add(v.id)

  const keep = new Set<number>()
  for (const id of living) {
    walkPedigreeIds(state, id, PEDIGREE_DEPTH, keep)
  }
  for (const g of state.genealogy) {
    if (g.fame >= 0.45) keep.add(g.id)
  }

  state.genealogy = state.genealogy
    .filter((g) => keep.has(g.id) || g.deathTick === null)
    .sort((a, b) => b.fame - a.fame || (b.deathTick ?? 1e9) - (a.deathTick ?? 1e9))
    .slice(0, MAX_GENEALOGY_ENTRIES)
}

function walkPedigreeIds(state: SimState, id: number, depth: number, out: Set<number>) {
  if (depth < 0 || out.has(id)) return
  out.add(id)
  const g = findGenealogy(state, id)
  const parents = g?.parentIds ?? state.villagers.find((v) => v.id === id)?.parentIds ?? []
  for (const pid of parents) walkPedigreeIds(state, pid, depth - 1, out)
}

/** Founders: each gets own lineage + surname; soft family only if sharing a home later. */
export function seedFounderKin(state: SimState, villagers: Villager[], rng: () => number) {
  for (const v of villagers) {
    const surname = generateFounderSurname(v.seed, v.name, rng)
    v.surname = surname
    v.spouseId = null
    v.familyId = null
    const L = createLineage(state, v, surname, 'founder', state.tick)
    v.lineageId = L.id
    L.knownAncestors.push({
      id: v.id,
      name: v.name,
      surname,
      reason: 'founder',
      fame: 0.35,
      tick: state.tick,
    })
    upsertGenealogy(state, v, state.tick)
    const g = findGenealogy(state, v.id)
    if (g) {
      g.fame = 0.35
      g.fameReason = 'founder'
    }
  }
}

function attachToLineage(state: SimState, L: Lineage, v: Villager) {
  pushUnique(L.memberIds, v.id, MAX_LINEAGE_MEMBERS)
  v.lineageId = L.id
  let living = 0
  for (const id of L.memberIds) {
    const m = state.villagers.find((o) => o.id === id)
    if (m?.alive) living++
  }
  L.livingCount = living
}

function attachToFamily(state: SimState, f: Family, v: Villager) {
  pushUnique(f.memberIds, v.id, MAX_FAMILY_MEMBERS)
  v.familyId = f.id
  f.lineageId = f.lineageId ?? v.lineageId
  let living = 0
  for (const id of f.memberIds) {
    const m = state.villagers.find((o) => o.id === id)
    if (m?.alive) living++
  }
  f.livingCount = living
}

/** Public household attach — marriage / adoption join a foyer without inventing lineages. */
export function attachHouseholdMember(state: SimState, f: Family, v: Villager) {
  attachToFamily(state, f, v)
}

function pickPrimaryLineage(state: SimState, a: Villager, b: Villager, rng: () => number): Lineage {
  const La = findLineage(state, a.lineageId)
  const Lb = findLineage(state, b.lineageId)
  if (La && !Lb) return La
  if (Lb && !La) return Lb
  if (!La && !Lb) {
    const founder = rng() < 0.5 ? a : b
    const surname = formChildSurname(founder, null, state, rng).surname
    return createLineage(state, founder, surname, 'ancestor', state.tick)
  }
  // Prefer higher reputation / living mass — soft cultural pull, not primogeniture script.
  const score = (L: Lineage) => L.reputation * 2 + L.livingCount + L.wealthEstimate * 0.05
  if (La && Lb) {
    if (Math.abs(score(La) - score(Lb)) < 0.4) return rng() < 0.5 ? La : Lb
    return score(La) >= score(Lb) ? La : Lb
  }
  return La!
}

function linkSiblings(state: SimState, child: Villager) {
  for (const o of state.villagers) {
    if (!o.alive || o.id === child.id) continue
    const share =
      o.parentIds.length > 0 &&
      child.parentIds.length > 0 &&
      o.parentIds.some((p) => child.parentIds.includes(p))
    if (!share) continue
    relationWith(child, o.id).kinship = Math.max(relationWith(child, o.id).kinship, 0.7)
    relationWith(o, child.id).kinship = Math.max(relationWith(o, child.id).kinship, 0.7)
    relationWith(child, o.id).affinity = Math.max(relationWith(child, o.id).affinity, 0.45)
    relationWith(o, child.id).affinity = Math.max(relationWith(o, child.id).affinity, 0.45)
  }
}

/**
 * Wire a newborn into parents, siblings, family & lineage.
 * Call after the Villager object exists and has parentIds set.
 */
export function registerBirth(
  state: SimState,
  child: Villager,
  parentA: Villager,
  parentB: Villager,
  rng: () => number,
) {
  const naming = formChildSurname(parentA, parentB, state, rng)
  child.surname = naming.surname
  // Keep given name if already set; else generate.
  if (!child.name) child.name = generateGivenName(child.seed)

  const L = pickPrimaryLineage(state, parentA, parentB, rng)
  // Surname may diverge from lineage label over time (migration / craft); lineage can rename later.
  if (!L.surname) L.surname = child.surname
  attachToLineage(state, L, child)

  if (naming.origin === 'craft' && parentA.profession !== 'none') {
    pushTradition(L.traditions, `craft:${parentA.profession}`)
  } else if (naming.origin === 'craft' && parentB.profession !== 'none') {
    pushTradition(L.traditions, `craft:${parentB.profession}`)
  }
  if (naming.origin === 'place') pushTradition(L.traditions, naming.tradition ?? 'place:migrant')
  if (naming.origin === 'nickname' && naming.tradition) pushTradition(L.traditions, naming.tradition)

  // Soft pair bond for inheritance when reproduction precedes formal marriage.
  // Causal: child birth crystallizes the couple → marriage/alliance chronicle (S4).
  if (
    !parentA.refusesMarriage &&
    !parentB.refusesMarriage &&
    (parentA.spouseId === null || parentA.spouseId === parentB.id) &&
    (parentB.spouseId === null || parentB.spouseId === parentA.id)
  ) {
    const wasNew =
      parentA.spouseId !== parentB.id || parentB.spouseId !== parentA.id
    const famA = parentA.familyId
    const famB = parentB.familyId
    const La = findLineage(state, parentA.lineageId)
    const Lb = findLineage(state, parentB.lineageId)
    parentA.spouseId = parentB.id
    parentB.spouseId = parentA.id
    if (parentA.marriageKind === null) parentA.marriageKind = 'romance'
    if (parentB.marriageKind === null) parentB.marriageKind = 'romance'
    if (parentA.marriedTick === 0) parentA.marriedTick = state.tick
    if (parentB.marriedTick === 0) parentB.marriedTick = state.tick
    if (wasNew) {
      state.marriageFormedCount = (state.marriageFormedCount ?? 0) + 1
      logCause(
        state,
        `naissance commune — foyer de ${fullNameOf(parentA)} et ${fullNameOf(parentB)}`,
        `${fullNameOf(parentA)} et ${fullNameOf(parentB)} s'unissent par amour`,
      )
      if (
        (famA != null && famB != null && famA !== famB) ||
        (La && Lb && La.id !== Lb.id) ||
        famA == null ||
        famB == null
      ) {
        logCause(
          state,
          `mariage entre foyers (${fullNameOf(parentA)} × ${fullNameOf(parentB)})`,
          'alliance de deux familles',
        )
        state.familyAllianceCount = (state.familyAllianceCount ?? 0) + 1
      }
      if (!state.milestones.firstMarriage) {
        state.milestones.firstMarriage = true
        logEvent(state, `Premier mariage`)
      }
    }
  }

  let fam: Family | null = findFamily(state, parentA.familyId) ?? findFamily(state, parentB.familyId)
  if (!fam) {
    const head = parentA.hasHome || parentA.homeOwnerId !== null ? parentA : parentB
    fam = createFamily(state, head)
    attachToFamily(state, fam, parentA)
    attachToFamily(state, fam, parentB)
  }
  attachToFamily(state, fam, child)

  // Share home when room — already handled by caller; kinship links:
  relationWith(child, parentA.id).kinship = 0.9
  relationWith(child, parentB.id).kinship = 0.9
  relationWith(parentA, child.id).kinship = 0.9
  relationWith(parentB, child.id).kinship = 0.9
  linkSiblings(state, child)

  upsertGenealogy(state, child, state.tick)
  upsertGenealogy(state, parentA, findGenealogy(state, parentA.id)?.birthTick ?? state.tick)
  upsertGenealogy(state, parentB, findGenealogy(state, parentB.id)?.birthTick ?? state.tick)

  // Soft reputation inheritance from famous ancestors of the lineage.
  const mem = ancestorMemoryBonus(state, child)
  if (mem > 0.05) {
    const pol = politicsOf(child)
    pol.legitimacy = clamp01(pol.legitimacy + mem * 0.08)
  }

  if (geneticsHook) geneticsHook(parentA, parentB, child, rng)

  if (naming.evolved) {
    logEvent(state, `La lignée ${L.surname} prend le nom ${child.surname}`)
  }
}

function isNotable(state: SimState, v: Villager): { reason: FamousReason; fame: number } | null {
  let fame = 0
  let reason: FamousReason | null = null
  for (const c of state.circles) {
    if (c.leaderId === v.id) {
      const f = 0.45 + c.legitimacy * 0.4 + (c.isInstitution ? 0.15 : 0)
      if (f > fame) {
        fame = f
        reason = 'leader'
      }
    }
  }
  const w = wealthOf(v)
  if (w >= 18) {
    const f = clamp01(0.35 + w / 50)
    if (f > fame) {
      fame = f
      reason = 'rich'
    }
  }
  const chronicled = state.log.some((line) => line.includes(v.name) && /institution|cercle|hérite|venge|sauvé|légitimité|norme|creed|première/i.test(line))
  if (chronicled) {
    const f = 0.4
    if (f > fame) {
      fame = f
      reason = 'chronicled'
    }
  }
  if (!reason || fame < 0.35) return null
  return { reason, fame }
}

function rememberFamousAncestor(state: SimState, v: Villager, reason: FamousReason, fame: number) {
  const L = findLineage(state, v.lineageId)
  if (!L) return
  const existing = L.knownAncestors.find((a) => a.id === v.id)
  if (existing) {
    existing.fame = Math.max(existing.fame, fame)
    existing.reason = reason
    existing.tick = state.tick
  } else {
    L.knownAncestors.push({
      id: v.id,
      name: v.name,
      surname: v.surname,
      reason,
      fame,
      tick: state.tick,
    })
    while (L.knownAncestors.length > MAX_KNOWN_ANCESTORS) {
      L.knownAncestors.sort((a, b) => a.fame - b.fame)
      L.knownAncestors.shift()
    }
  }
  // Soft memory to living descendants
  for (const o of state.villagers) {
    if (!o.alive || o.lineageId !== L.id || o.id === v.id) continue
    const pol = politicsOf(o)
    pol.legitimacy = clamp01(pol.legitimacy + fame * 0.04)
    relationWith(o, v.id).kinship = Math.max(relationWith(o, v.id).kinship, 0.35)
  }
}

function heirsOf(state: SimState, victim: Villager): Villager[] {
  const heirs: Villager[] = []
  const push = (v: Villager | undefined | null) => {
    if (v && v.alive && v.id !== victim.id && !heirs.includes(v)) heirs.push(v)
  }
  if (victim.spouseId !== null) push(state.villagers.find((o) => o.id === victim.spouseId))
  for (const o of state.villagers) {
    if (o.alive && o.parentIds.includes(victim.id)) push(o)
  }
  // Co-resident kin / family members
  const fam = findFamily(state, victim.familyId)
  if (fam) {
    for (const id of fam.memberIds) {
      const o = state.villagers.find((x) => x.id === id)
      if (o && (o.parentIds.includes(victim.id) || victim.parentIds.includes(o.id) || o.spouseId === victim.id)) {
        push(o)
      }
    }
  }
  return heirs
}

const INHERIT_TYPES: ResourceType[] = [
  'coin',
  'bread',
  'food',
  'wheat',
  'flour',
  'berries',
  'meat',
  'fish',
  'cloth',
  'clothing',
  'iron',
  'gold',
  'leather',
  'silver',
  'bronze',
  'medicine',
  'cheese',
  'wine',
  'preserved',
]

function transferPersonalGoods(from: Villager, to: Villager, share: number) {
  for (const type of INHERIT_TYPES) {
    const n = countOf(from.inventory, type)
    if (n <= 0) continue
    const take = Math.max(type === 'coin' ? 1 : 0, Math.floor(n * share))
    if (take <= 0) continue
    removeFromInventory(from.inventory, type, take)
    addToInventory(to.inventory, type, take)
  }
}

/**
 * Cultural inheritance: spouse → children → co-resident kin.
 * Soft / evolvable — house transfer remains in interactions.onDeath.
 */
export function inheritOnDeath(state: SimState, victim: Villager) {
  const L = findLineage(state, victim.lineageId)
  if (L) {
    L.deadCount += 1
    L.livingCount = Math.max(0, L.livingCount - 1)
    L.wealthEstimate = Math.max(0, L.wealthEstimate * 0.92)
  }

  const notable = isNotable(state, victim)
  const g = findGenealogy(state, victim.id)
  if (g) {
    g.deathTick = state.tick
    g.surname = victim.surname
    g.givenName = victim.name
  } else {
    upsertGenealogy(state, victim, state.tick, state.tick)
  }
  if (notable) {
    rememberFamousAncestor(state, victim, notable.reason, notable.fame)
    const ge = findGenealogy(state, victim.id)
    if (ge) {
      ge.fame = Math.max(ge.fame, notable.fame)
      ge.fameReason = notable.reason
    }
    logEvent(
      state,
      `Mémoire de ${fullNameOf(victim)} (${notable.reason === 'leader' ? 'chef' : notable.reason === 'rich' ? 'fortune' : 'chronique'})`,
    )
  }

  const heirs = heirsOf(state, victim)
  if (heirs.length === 0) {
    if (victim.familyId !== null) {
      const f = findFamily(state, victim.familyId)
      if (f) f.memberIds = f.memberIds.filter((id) => id !== victim.id)
    }
    return
  }

  // Spouse takes larger share; children split the rest.
  const spouse = victim.spouseId !== null ? heirs.find((h) => h.id === victim.spouseId) : undefined
  if (spouse) {
    transferPersonalGoods(victim, spouse, 0.5)
    const pol = politicsOf(spouse)
    pol.legitimacy = clamp01(pol.legitimacy + 0.03 + ancestorMemoryBonus(state, spouse) * 0.05)
    relationWith(spouse, victim.id).kinship = Math.max(relationWith(spouse, victim.id).kinship, 0.85)
  }
  const others = heirs.filter((h) => h !== spouse)
  if (others.length > 0) {
    const each = (spouse ? 0.4 : 0.7) / others.length
    for (const h of others) {
      transferPersonalGoods(victim, h, each)
      const pol = politicsOf(h)
      pol.legitimacy = clamp01(pol.legitimacy + 0.02)
      relationWith(h, victim.id).kinship = Math.max(relationWith(h, victim.id).kinship, 0.8)
    }
    if (others.length === 1 && !spouse) {
      logEvent(state, `${fullNameOf(others[0])} hérite des biens de ${fullNameOf(victim)}`)
    } else if (spouse && others.length > 0) {
      logEvent(state, `${fullNameOf(spouse)} et les enfants se partagent l'héritage de ${fullNameOf(victim)}`)
    } else if (spouse) {
      logEvent(state, `${fullNameOf(spouse)} hérite des biens de ${fullNameOf(victim)}`)
    }
  } else if (spouse) {
    logEvent(state, `${fullNameOf(spouse)} hérite des biens de ${fullNameOf(victim)}`)
  }

  if (victim.familyId !== null) {
    const f = findFamily(state, victim.familyId)
    if (f) {
      f.memberIds = f.memberIds.filter((id) => id !== victim.id)
      if (f.homeOwnerId === victim.id && heirs[0]) f.homeOwnerId = heirs[0].id
    }
  }

  // Break surviving partner's bond after inheritance priority is resolved
  if (victim.spouseId !== null) {
    const widowed = state.villagers.find((o) => o.id === victim.spouseId)
    if (widowed && widowed.spouseId === victim.id) {
      widowed.spouseId = null
      widowed.marriageKind = null
    }
    victim.spouseId = null
    victim.marriageKind = null
  }
}

export function reconstructPedigree(state: SimState, rootId: number, maxDepth = PEDIGREE_DEPTH): PedigreeNode[] {
  const out: PedigreeNode[] = []
  const seen = new Set<number>()

  const visit = (id: number, depth: number) => {
    if (depth > maxDepth || seen.has(id)) return
    seen.add(id)
    const living = state.villagers.find((v) => v.id === id)
    const g = findGenealogy(state, id)
    const givenName = living?.name ?? g?.givenName ?? '?'
    const surname = living?.surname ?? g?.surname ?? ''
    const parentIds = living?.parentIds ?? g?.parentIds ?? []
    out.push({
      id,
      givenName,
      surname,
      alive: living?.alive ?? false,
      parentIds: [...parentIds],
      depth,
    })
    for (const pid of parentIds) visit(pid, depth + 1)
  }
  visit(rootId, 0)
  return out
}

export function packFamilySummary(state: SimState, v: Villager): FamilySummary {
  const L = findLineage(state, v.lineageId)
  const parents: { id: number; name: string }[] = []
  for (const pid of v.parentIds) {
    const p = state.villagers.find((o) => o.id === pid)
    const g = findGenealogy(state, pid)
    const name = p ? fullNameOf(p) : g ? displayName(g.givenName, g.surname) : `#${pid}`
    parents.push({ id: pid, name })
  }
  const siblings: { id: number; name: string }[] = []
  const children: { id: number; name: string }[] = []
  for (const o of state.villagers) {
    if (!o.alive || o.id === v.id) continue
    if (o.parentIds.includes(v.id)) children.push({ id: o.id, name: fullNameOf(o) })
    if (
      v.parentIds.length > 0 &&
      o.parentIds.some((p) => v.parentIds.includes(p))
    ) {
      siblings.push({ id: o.id, name: fullNameOf(o) })
    }
  }
  let spouse: { id: number; name: string } | null = null
  if (v.spouseId !== null) {
    const s = state.villagers.find((o) => o.id === v.spouseId && o.alive)
    if (s) spouse = { id: s.id, name: fullNameOf(s) }
  }
  const fam = findFamily(state, v.familyId)
  return {
    surname: v.surname,
    lineageName: L && !L.faded ? L.surname : null,
    lineageReputation: L?.reputation ?? 0,
    familySize: fam?.livingCount ?? 1,
    livingKin: siblings.length + children.length + parents.filter((p) => state.villagers.some((o) => o.id === p.id && o.alive)).length + (spouse ? 1 : 0),
    parents: parents.slice(0, 2),
    siblings: siblings.slice(0, 6),
    spouse,
    children: children.slice(0, 8),
    famousAncestors: (L?.knownAncestors ?? [])
      .slice()
      .sort((a, b) => b.fame - a.fame)
      .slice(0, 4)
      .map((a) => ({ name: displayName(a.name, a.surname), reason: a.reason, fame: a.fame })),
    traditions: L?.traditions.slice(-4) ?? [],
    ancestorMemory: ancestorMemoryBonus(state, v),
    pedigree: reconstructPedigree(state, v.id),
  }
}

function refreshLineageAggregates(state: SimState, L: Lineage) {
  let living = 0
  let wealth = 0
  let rep = 0
  const aliveMembers: Villager[] = []
  for (const id of L.memberIds) {
    const v = state.villagers.find((o) => o.id === id && o.alive)
    if (!v) continue
    living++
    wealth += wealthOf(v)
    rep += personalReputation(state, v)
    aliveMembers.push(v)
  }
  L.livingCount = living
  L.wealthEstimate = wealth
  L.reputation = clamp01(living > 0 ? rep / living : L.reputation * 0.98)
  if (aliveMembers.length > 0) {
    L.villageId = aliveMembers[0].villageId
    // Tradition drift from dominant craft
    const crafts = new Map<Profession, number>()
    for (const v of aliveMembers) {
      if (v.profession === 'none') continue
      crafts.set(v.profession, (crafts.get(v.profession) ?? 0) + 1)
    }
    let best: Profession | null = null
    let bestN = 0
    for (const [p, n] of crafts) {
      if (n > bestN) {
        bestN = n
        best = p
      }
    }
    if (best && bestN >= 2) pushTradition(L.traditions, `craft:${best}`)
  }
}

/** Rename / split / merge / fade — soft historical dynamics, no scripted dynasties. */
export function tickLineages(state: SimState, rng: () => number) {
  if (state.tick % 120 !== 0) return

  for (const L of state.lineages) {
    if (L.faded) continue
    refreshLineageAggregates(state, L)

    // Fade: no living members for a long stretch
    if (L.livingCount === 0) {
      L.reputation *= 0.9
      if (L.reputation < 0.08 && L.deadCount > 0) {
        L.faded = true
        logEvent(state, `La lignée ${L.surname} s'éteint dans les mémoires`)
      }
      continue
    }

    // Rename when living majority uses a different surname (migration / craft evolution)
    const surnameCounts = new Map<string, number>()
    for (const id of L.memberIds) {
      const v = state.villagers.find((o) => o.id === id && o.alive)
      if (!v || !v.surname) continue
      surnameCounts.set(v.surname, (surnameCounts.get(v.surname) ?? 0) + 1)
    }
    let topName = L.surname
    let topN = 0
    for (const [name, n] of surnameCounts) {
      if (n > topN) {
        topN = n
        topName = name
      }
    }
    if (topName !== L.surname && topN >= Math.max(2, Math.ceil(L.livingCount * 0.6))) {
      L.renamedFrom = L.surname
      L.surname = topName
      L.surnameOrigin = 'merged'
      logEvent(state, `La lignée ${L.renamedFrom} devient ${L.surname}`)
    }

    // Split: two distant village clusters under same lineage with weak reputation
    if (L.livingCount >= 6 && rng() < 0.04) {
      const byVillage = new Map<number | null, Villager[]>()
      for (const id of L.memberIds) {
        const v = state.villagers.find((o) => o.id === id && o.alive)
        if (!v) continue
        const list = byVillage.get(v.villageId) ?? []
        list.push(v)
        byVillage.set(v.villageId, list)
      }
      const clusters = [...byVillage.values()].filter((c) => c.length >= 2)
      if (clusters.length >= 2) {
        clusters.sort((a, b) => b.length - a.length)
        const splinter = clusters[1]
        const head = splinter[0]
        const newSurname =
          formChildSurname(head, null, state, rng).surname || `${head.surname}`
        const neo = createLineage(state, head, newSurname, 'ancestor', state.tick)
        neo.parentLineageIds = [L.id]
        neo.traditions = L.traditions.slice(-3)
        for (const v of splinter) {
          L.memberIds = L.memberIds.filter((id) => id !== v.id)
          attachToLineage(state, neo, v)
          v.surname = neo.surname
        }
        refreshLineageAggregates(state, L)
        refreshLineageAggregates(state, neo)
        logEvent(state, `La lignée ${neo.surname} se détache de ${L.surname}`)
      }
    }
  }

  // Merge tiny allied lineages that share village + high intermarriage
  if (rng() < 0.08) {
    const active = state.lineages.filter((L) => !L.faded && L.livingCount > 0 && L.livingCount <= 3)
    for (let i = 0; i < active.length; i++) {
      for (let j = i + 1; j < active.length; j++) {
        const A = active[i]
        const B = active[j]
        if (A.villageId === null || A.villageId !== B.villageId) continue
        let bonds = 0
        for (const id of A.memberIds) {
          const v = state.villagers.find((o) => o.id === id && o.alive)
          if (!v?.spouseId) continue
          if (B.memberIds.includes(v.spouseId)) bonds++
        }
        if (bonds < 1) continue
        const keep = A.reputation >= B.reputation ? A : B
        const drop = keep === A ? B : A
        for (const id of drop.memberIds) {
          const v = state.villagers.find((o) => o.id === id)
          if (!v) continue
          attachToLineage(state, keep, v)
        }
        keep.parentLineageIds.push(drop.id)
        if (!keep.renamedFrom) keep.renamedFrom = drop.surname
        drop.faded = true
        drop.livingCount = 0
        logEvent(state, `Les lignées ${keep.surname} et ${drop.surname} se rejoignent`)
        return
      }
    }
  }

  // Refresh household families from co-residence
  if (state.tick % 240 === 0) refreshHouseholds(state)
  shelterHomelessKin(state)
}

/**
 * Seat homeless offspring (and young adoptees) into a living parent's household.
 * Bed capacity gated births used to leave children permanently homeless, which
 * blocked marriage/reproduction (ready requires hasHome) and erased multi-gen lineage.
 */
export function shelterHomelessKin(state: SimState) {
  if (state.tick % 36 !== 0) return
  for (const v of state.villagers) {
    if (!v.alive || v.hasHome) continue
    const parentIds = [...v.parentIds, ...v.adoptiveParentIds]
    if (parentIds.length === 0) continue
    let best: { owner: Villager; spare: number } | null = null
    for (const pid of parentIds) {
      const p = state.villagers.find((o) => o.id === pid && o.alive)
      if (!p) continue
      const owner =
        p.homeOwnerId !== null
          ? state.villagers.find((o) => o.id === p.homeOwnerId && o.alive && o.hasHome)
          : p.hasHome
            ? p
            : undefined
      if (!owner || owner.homeX < 0) continue
      let residents = 0
      for (const o of state.villagers) if (o.alive && o.homeOwnerId === owner.id) residents++
      const cap = householdSleepCapacity(owner)
      // Soft: minors may overcrowd by 2; adults only if a real bed/cradle spare exists
      // or the household has at least one bed and is only mildly full.
      const minor = v.age < 220
      const spare = cap - residents
      const allow = minor ? spare > -2 : spare > 0 || (cap >= 1 && spare > -1)
      if (!allow) continue
      if (!best || spare > best.spare) best = { owner, spare }
    }
    if (!best) continue
    v.hasHome = true
    v.homeOwnerId = best.owner.id
    v.homeX = best.owner.homeX
    v.homeY = best.owner.homeY
    if (v.villageId === null) v.villageId = best.owner.villageId
  }
}

function refreshHouseholds(state: SimState) {
  const byHome = new Map<number, Villager[]>()
  for (const v of state.villagers) {
    if (!v.alive || v.homeOwnerId === null) continue
    const list = byHome.get(v.homeOwnerId) ?? []
    list.push(v)
    byHome.set(v.homeOwnerId, list)
  }
  for (const [ownerId, members] of byHome) {
    if (members.length < 2) continue
    let fam = members.map((m) => findFamily(state, m.familyId)).find((f) => f) ?? null
    if (!fam) {
      const head = members.find((m) => m.id === ownerId) ?? members[0]
      fam = createFamily(state, head)
    }
    fam.homeOwnerId = ownerId
    fam.memberIds = []
    let wealth = 0
    let rep = 0
    for (const m of members) {
      attachToFamily(state, fam, m)
      wealth += wealthOf(m)
      rep += personalReputation(state, m)
    }
    fam.wealthAggregate = wealth
    fam.reputation = clamp01(rep / members.length)
    fam.livingCount = members.length
  }
}

/** Apply soft ancestor-memory legitimacy on living kin (cheap periodic). */
export function tickAncestorMemory(state: SimState) {
  if (state.tick % 90 !== 0) return
  for (const v of state.villagers) {
    if (!v.alive) continue
    const bonus = ancestorMemoryBonus(state, v)
    if (bonus < 0.08) continue
    const pol = politicsOf(v)
    pol.legitimacy = clamp01(pol.legitimacy * 0.995 + bonus * 0.01)
  }
}

/** Phase A — household pressures for cognition / later economy hooks (0–1 unless noted). */
export interface HouseholdNeeds {
  /** Food scarcity pressure (1 = empty pantry + hungry kin). */
  food: number
  /** Shelter pressure for household (homeless members / no home). */
  shelter: number
  /** Soft wealth (coin aggregate, not pressure). */
  wealth: number
  size: number
  homelessKin: number
  edibleStock: number
  familyId: number | null
}

export function getHouseholdNeeds(state: SimState, v: Villager): HouseholdNeeds {
  const fam = familyOf(state, v)
  const members = familyMembers(state, v)
  const size = Math.max(1, members.length)
  let homelessKin = 0
  let hungryKin = 0
  for (const m of members) {
    if (!m.hasHome) homelessKin++
    if (m.hunger < 2.2 || m.starveTimer > 0) hungryKin++
  }
  const edibleStock = familyEdible(state, v)
  const wealth = familyWealth(state, v)
  const perCapita = edibleStock / size
  const food = Math.max(
    0,
    Math.min(1, (perCapita < 1 ? 0.55 : perCapita < 2.5 ? 0.28 : 0.05) + (hungryKin / size) * 0.45),
  )
  const shelter = Math.max(
    0,
    Math.min(1, (!v.hasHome ? 0.7 : 0) + (homelessKin / size) * 0.55 + (v.hasHome && homelessKin > 0 ? 0.15 : 0)),
  )
  return {
    food,
    shelter,
    wealth,
    size,
    homelessKin,
    edibleStock,
    familyId: fam?.id ?? v.familyId,
  }
}
/** Prefer hungriest / unsheltered kin (else spouse) as family-goal target. */
export function pickFamilyCareTarget(state: SimState, v: Villager): number | null {
  const members = familyMembers(state, v)
  let bestId: number | null = null
  let bestNeed = 0
  for (const m of members) {
    if (m.id === v.id || !m.alive) continue
    const need =
      (m.hunger < 2.5 ? 2.5 - m.hunger : 0) +
      (!m.hasHome ? 0.85 : 0) +
      (v.spouseId === m.id ? 0.25 : 0) +
      ((v.relations.get(m.id)?.kinship ?? 0) * 0.2)
    if (need > bestNeed) {
      bestNeed = need
      bestId = m.id
    }
  }
  if (bestId !== null && bestNeed > 0.12) return bestId
  return v.spouseId
}