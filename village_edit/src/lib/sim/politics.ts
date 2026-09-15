/**
 * Emergent social / political / historical substrate (v1).
 *
 * Mechanisms only — no preset factions, religions, monarchies or scripted wars.
 * Pipeline: individuals → relations → circles → institutions → pressures → chronicle.
 *
 * Deferred (extension points below): civil wars / territories, international war,
 * espionage, propaganda media, elections UI, polygon borders.
 */

import { addToInventory, countOf, edibleValue, removeFromInventory } from './inventory'
import { equipmentEffectsOf, gearPrestige01 } from './equipment'
import { cropTempFactor, sampleTempC } from './climate'
import { villageAttractiveness, villagerSoL } from './commerce'
import { villageCarryingPressure } from './ecology'
import { onEthnosMigrateIn, onEthnosMigrateOut } from './ethnos'
import { getSimPerfBudget } from './perfBudget'
import { adjustRelation, logEvent, relationWith, remember } from './social'
import { knowledgeCount } from './technology'
import { mindOf } from './cognition/mindPool'
import { ensureLivelihood, GUILD_MIN_PRACTITIONERS, noteRecognition } from './livelihood'
import type { Personality, Profession, SimState, TaskKind, Village, Villager } from './types'
import { distance } from './world'
import { enqueueBuildProject, intentFromReasons, type StructurePurpose } from './construction'

// ── Beliefs & power ──────────────────────────────────────────────────────────

export interface Beliefs {
  /** Preference for equal treatment / sharing. */
  fairness: number
  /** Soft spiritual / ritual inclination (not a canned religion). */
  piety: number
  /** Appetite for accumulation. */
  greed: number
  /** Stickiness to kin / circle / village. */
  loyalty: number
  /** High = keep ways; low = favour change. */
  tradition: number
}

export interface PowerScores {
  wealth: number
  military: number
  social_influence: number
  religious_authority: number
  knowledge: number
  land: number
  trade_control: number
  reputation: number
  family: number
}

export type NormId =
  | 'share_famine'
  | 'punish_theft'
  | 'favor_traders'
  | 'protect_all'
  | 'hoard_wealth'
  | 'maintain_commons'
  | 'reciprocate'
  /** Guilde : exclure les tire-au-flanc. */
  | 'exclude_shirkers'
  /** Guilde : transmettre le métier aux jeunes. */
  | 'teach_apprentice'
  /** Guilde : tenir un standard de qualité. */
  | 'craft_quality'

export type CircleKind = 'kin' | 'craft' | 'village' | 'threat' | 'hunger' | 'trade' | 'faith' | 'elder'

/** Weber-lite authority basis — emergent, never a mandatory monarchy. */
export type AuthorityBasis = 'tradition' | 'charisma' | 'competence' | 'fear'

export type LifeRole = 'child' | 'adult' | 'elder'

export interface Circle {
  id: number
  name: string
  kind: CircleKind
  memberIds: number[]
  values: Beliefs
  reputation: number
  leaderId: number | null
  legitimacy: number
  formedTick: number
  lastActiveTick: number
  problemCount: number
  isInstitution: boolean
  originStory: string | null
  memory: string[]
  pooledFood: number
  norms: NormId[]
  creed: string | null
  villageId: number | null
  /** Circle-level cohesion (asabiya soft). */
  cohesion: number
  /** Monitoring / sanction capacity (Ostrom-lite) — rises when institutionalised. */
  enforcement: number
  /** Dominant legitimacy style of current leadership. */
  authorityBasis: AuthorityBasis
  /** Shared technique ids circulating in the circle (generative tech). */
  techIds: string[]
  /**
   * Guilde émergente : cercle de métier institutionnalisé (≥N praticiens).
   * Normes, apprentissage, prestige de chef-d’œuvre.
   */
  isGuild: boolean
  /** Seuil soft de skill craft attendu (0–1). */
  qualityBar: number
}

export type RumorKind =
  | 'theft'
  | 'death'
  | 'windfall'
  | 'wolf'
  | 'famine'
  | 'succession'
  | 'generosity'
  | 'shirk'
  | 'unreliable'
  | 'exclusion'

export interface Rumor {
  id: number
  kind: RumorKind
  subjectId: number | null
  aboutId: number | null
  text: string
  x: number
  y: number
  tick: number
  intensity: number
  distortion: number
  knownBy: number[]
}

/** Soft crystallised grievance / aspiration label (French short id). */
export type CreedId =
  | 'partage'
  | 'ordre'
  | 'commerce_libre'
  | 'protection'
  | 'piete'
  | 'vengeance'
  | 'tradition'
  | 'changement'

export interface PoliticalState {
  beliefs: Beliefs
  creed: CreedId | null
  creedWeight: number
  /** Soft urge to leave village / wander (0–1). */
  migrationUrge: number
  /** Cached personal legitimacy contribution. */
  legitimacy: number
  grievance: number
  /** Follow norms even without a watcher (socialisation in circles). */
  normInternalization: number
  /** Reputation for returning favours / gifts (Mauss soft). */
  reliability: number
  /** Preferred obedience cue when choosing whom to follow. */
  authorityPreference: AuthorityBasis
}

// ── Soft caches (keep Villager lean; same pattern as emergent minds) ─────────

const POLITICS = new Map<number, PoliticalState>()
const POWER_CACHE = new Map<number, { tick: number; scores: PowerScores; total: number }>()

export const CIRCLE_TICK = 90
export const BELIEF_TICK = 48
export const RUMOR_TICK = 30
/** ~1 season of persistence before a circle can harden into an institution. */
export const INSTITUTION_AGE = 900
export const INSTITUTION_PROBLEMS = 2
export const MAX_CIRCLES = 48
export const MAX_RUMORS = 40
export const MAX_CIRCLE_MEMBERS = 12
export const MAX_CIRCLE_MEMORY = 5

const KIND_FR: Record<CircleKind, string> = {
  kin: 'cercle de parenté',
  craft: 'cercle de métier',
  village: 'cercle du village',
  threat: 'cercle de garde',
  hunger: 'cercle de partage',
  trade: 'cercle marchand',
  faith: 'cercle pieux',
  elder: 'cercle des aînés',
}

const CREED_FR: Record<CreedId, string> = {
  partage: 'le partage avant tout',
  ordre: "l'ordre contre le vol",
  commerce_libre: 'le commerce libre',
  protection: 'protéger les foyers',
  piete: 'honorer le sacré',
  vengeance: 'rendre justice soi-même',
  tradition: 'garder les usages',
  changement: 'changer les règles',
}

const NORM_FR: Record<NormId, string> = {
  share_famine: 'partager en famine',
  punish_theft: 'punir le vol',
  favor_traders: 'favoriser les marchands',
  protect_all: 'protéger chacun',
  hoard_wealth: 'garder ses réserves',
  maintain_commons: 'entretenir le commun',
  reciprocate: 'rendre les faveurs',
  exclude_shirkers: 'exclure les oisifs',
  teach_apprentice: 'former les apprentis',
  craft_quality: 'tenir la qualité',
}

const AUTHORITY_FR: Record<AuthorityBasis, string> = {
  tradition: 'tradition',
  charisma: 'charisme',
  competence: 'compétence',
  fear: 'crainte',
}

export const CHILD_AGE = 220
export const ELDER_AGE = 800
export const COHESION_DECAY_PEACE = 0.012
export const COHESION_THREAT_GAIN = 0.04

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v))
}

function avgBeliefs(list: Beliefs[]): Beliefs {
  if (list.length === 0) {
    return { fairness: 0.5, piety: 0.5, greed: 0.5, loyalty: 0.5, tradition: 0.5 }
  }
  const n = list.length
  const sum = list.reduce(
    (a, b) => ({
      fairness: a.fairness + b.fairness,
      piety: a.piety + b.piety,
      greed: a.greed + b.greed,
      loyalty: a.loyalty + b.loyalty,
      tradition: a.tradition + b.tradition,
    }),
    { fairness: 0, piety: 0, greed: 0, loyalty: 0, tradition: 0 },
  )
  return {
    fairness: sum.fairness / n,
    piety: sum.piety / n,
    greed: sum.greed / n,
    loyalty: sum.loyalty / n,
    tradition: sum.tradition / n,
  }
}

export function beliefsFromPersonality(p: Personality): Beliefs {
  return {
    fairness: clamp01(p.generosity * 0.7 + (1 - p.ambition) * 0.3),
    piety: clamp01((1 - p.curiosity) * 0.35 + p.generosity * 0.25 + 0.2),
    greed: clamp01((1 - p.generosity) * 0.65 + p.ambition * 0.45),
    loyalty: clamp01(p.sociability * 0.45 + p.generosity * 0.35 + 0.15),
    tradition: clamp01((1 - p.curiosity) * 0.7 + p.courage * 0.15),
  }
}

export function politicsOf(v: Villager): PoliticalState {
  let pol = POLITICS.get(v.id)
  if (!pol) {
    const p = v.personality
    const authorityPreference: AuthorityBasis =
      p.ambition > 0.55 && p.courage > 0.5
        ? 'fear'
        : p.curiosity > 0.55
          ? 'competence'
          : p.sociability > 0.55
            ? 'charisma'
            : 'tradition'
    pol = {
      beliefs: beliefsFromPersonality(p),
      creed: null,
      creedWeight: 0,
      migrationUrge: 0,
      legitimacy: 0,
      grievance: 0,
      normInternalization: clamp01(0.15 + p.sociability * 0.2 + (1 - p.curiosity) * 0.15),
      reliability: clamp01(0.45 + p.generosity * 0.35),
      authorityPreference,
    }
    POLITICS.set(v.id, pol)
  }
  // Backward-compat soft fields if cache was created mid-session.
  if (pol.normInternalization === undefined) pol.normInternalization = 0.3
  if (pol.reliability === undefined) pol.reliability = 0.5
  if (!pol.authorityPreference) pol.authorityPreference = 'tradition'
  return pol
}

export function lifeRoleOf(v: Villager): LifeRole {
  if (v.age < CHILD_AGE) return 'child'
  if (v.age >= ELDER_AGE) return 'elder'
  return 'adult'
}

export function villageOf(state: SimState, villageId: number | null): Village | null {
  if (villageId === null) return null
  return state.villages.find((g) => g.id === villageId) ?? null
}

export function villageCohesion(state: SimState, villageId: number | null): number {
  const vg = villageOf(state, villageId)
  return vg?.cohesion ?? 0.35
}

/** Soft wealth proxy for inequality (coins + edible stock). */
function wealthProxy(v: Villager): number {
  const coins = countOf(v.inventory, 'coin') + (v.chestInventory ? countOf(v.chestInventory, 'coin') : 0)
  return coins + edibleValue(v.inventory) * 0.35 + (v.hasCart ? 2 : 0) + (v.hasHome && v.homeOwnerId === v.id ? 1.5 : 0)
}

function villageMembers(state: SimState, villageId: number): Villager[] {
  const out: Villager[] = []
  for (const v of state.villagers) {
    if (v.alive && v.villageId === villageId) out.push(v)
  }
  return out
}

/** Coefficient of variation of wealth — elite overproduction / inequality soft stress. */
export function villageInequality(state: SimState, villageId: number): number {
  const members = villageMembers(state, villageId)
  if (members.length < 3) return 0
  const w = members.map(wealthProxy)
  const mean = w.reduce((a, b) => a + b, 0) / w.length
  if (mean < 0.4) return 0
  let varSum = 0
  for (const x of w) varSum += (x - mean) * (x - mean)
  const sd = Math.sqrt(varSum / w.length)
  return clamp01(sd / (mean + 0.5))
}

function pickAuthorityBasis(state: SimState, leader: Villager, c: Circle): AuthorityBasis {
  const { scores } = computePower(state, leader)
  const pol = politicsOf(leader)
  const tradition = pol.beliefs.tradition * 0.5 + scores.family * 0.5
  const charisma = scores.social_influence * 0.6 + leader.personality.sociability * 0.4
  const competence = scores.knowledge * 0.45 + scores.land * 0.25 + scores.trade_control * 0.3
  const fear = scores.military * 0.55 + pol.grievance * 0.25 + (1 - pol.beliefs.fairness) * 0.2
  // Kind soft bias without hardcoding monarchy.
  let t = tradition
  let ch = charisma
  let co = competence
  let f = fear
  if (c.kind === 'elder' || c.kind === 'kin') t += 0.2
  if (c.kind === 'faith') ch += 0.15
  if (c.kind === 'craft' || c.kind === 'trade') co += 0.2
  if (c.kind === 'threat') f += 0.2
  const best = Math.max(t, ch, co, f)
  if (best === f) return 'fear'
  if (best === co) return 'competence'
  if (best === ch) return 'charisma'
  return 'tradition'
}

function authorityMatchBonus(follower: Villager, basis: AuthorityBasis): number {
  const pref = politicsOf(follower).authorityPreference
  if (pref === basis) return 0.18
  if ((pref === 'tradition' && basis === 'charisma') || (pref === 'charisma' && basis === 'tradition')) return 0.05
  if ((pref === 'competence' && basis === 'fear') || (pref === 'fear' && basis === 'competence')) return 0.04
  return 0
}

export function creedLabel(id: CreedId | null): string {
  return id ? CREED_FR[id] : 'aucune'
}

export function circleKindLabel(kind: CircleKind): string {
  return KIND_FR[kind]
}

export function resetPoliticsCaches() {
  POLITICS.clear()
  POWER_CACHE.clear()
}

// ── Power (computed, lightly cached) ─────────────────────────────────────────

export function computePower(state: SimState, v: Villager): { scores: PowerScores; total: number } {
  const cached = POWER_CACHE.get(v.id)
  if (cached && state.tick - cached.tick < 40) return { scores: cached.scores, total: cached.total }

  const coins = countOf(v.inventory, 'coin') + (v.chestInventory ? countOf(v.chestInventory, 'coin') : 0)
  let friends = 0
  let enemies = 0
  let trustSum = 0
  for (const rel of v.relations.values()) {
    if (rel.affinity > 0.4) friends++
    if (rel.affinity < -0.4) enemies++
    trustSum += rel.trust
  }
  const kinCount = v.parentIds.length + state.villagers.filter((o) => o.alive && o.parentIds.includes(v.id)).length
  const land =
    (v.hasHome && v.homeOwnerId === v.id ? 0.35 : 0) +
    (v.hasField ? 0.25 : 0) +
    (v.hasPen ? 0.15 : 0) +
    (v.hasWorkbench ? 0.1 : 0)
  const gear = equipmentEffectsOf(v)
  const dress = gearPrestige01(v)
  const military =
    (v.toolTier === 'iron' ? 0.55 : v.toolTier === 'stone' ? 0.35 : v.toolTier === 'wood' ? 0.2 : 0) +
    (v.profession === 'guard' ? 0.35 : 0) +
    v.personality.courage * 0.2 +
    gear.combat * 0.35 +
    gear.protect * 0.25
  const trade =
    (v.profession === 'trader' ? 0.4 : 0) +
    (v.hasCart ? 0.15 : 0) +
    (v.boatId !== null ? 0.15 : 0) +
    Math.min(0.3, coins / 40) +
    Math.min(0.12, gear.carryKg / 80)
  const knowledge =
    (v.profession === 'miller' || v.profession === 'blacksmith' || v.profession === 'miner' ? 0.28 : 0) +
    v.personality.curiosity * 0.28 +
    (v.toolTier === 'iron' ? 0.12 : 0) +
    Math.min(0.42, knowledgeCount(v.knowledge) * 0.055)
  const pol = politicsOf(v)
  const religious = pol.beliefs.piety * 0.5 + (pol.creed === 'piete' ? 0.35 : 0)
  const social = clamp01(
    friends * 0.08 + trustSum * 0.04 + v.personality.sociability * 0.35 + v.personality.ambition * 0.2 + dress * 0.15,
  )
  const reputation = clamp01(
    0.4 + friends * 0.05 - enemies * 0.08 + pol.legitimacy * 0.3 - pol.grievance * 0.2 + dress * 0.2,
  )
  const family = clamp01(kinCount * 0.12 + (v.ambition === 'family' ? 0.2 : 0))

  const scores: PowerScores = {
    wealth: clamp01(coins / 25 + (v.hasCart ? 0.1 : 0) + dress * 0.35 + gear.wealthDisplay * 0.2),
    military: clamp01(military),
    social_influence: social,
    religious_authority: clamp01(religious),
    knowledge: clamp01(knowledge),
    land: clamp01(land),
    trade_control: clamp01(trade),
    reputation,
    family,
  }
  const total =
    scores.wealth * 0.14 +
    scores.military * 0.12 +
    scores.social_influence * 0.18 +
    scores.religious_authority * 0.06 +
    scores.knowledge * 0.08 +
    scores.land * 0.1 +
    scores.trade_control * 0.1 +
    scores.reputation * 0.14 +
    scores.family * 0.08

  POWER_CACHE.set(v.id, { tick: state.tick, scores, total })
  return { scores, total }
}

function influenceScore(state: SimState, v: Villager): number {
  const { scores, total } = computePower(state, v)
  const p = v.personality
  return (
    total +
    p.ambition * 0.25 +
    p.sociability * 0.2 +
    (1 - p.generosity) * 0.05 +
    (v.profession === 'guard' ? 0.12 : 0) +
    scores.wealth * 0.1
  )
}

// ── Init / kinship on relations ──────────────────────────────────────────────

export function ensureKinship(state: SimState, v: Villager) {
  for (const pid of v.parentIds) {
    const rel = relationWith(v, pid)
    rel.kinship = Math.max(rel.kinship, 0.85)
    const parent = state.villagers.find((o) => o.id === pid && o.alive)
    if (parent) {
      const back = relationWith(parent, v.id)
      back.kinship = Math.max(back.kinship, 0.85)
    }
  }
  for (const o of state.villagers) {
    if (!o.alive || o.id === v.id) continue
    if (o.parentIds.some((p) => v.parentIds.includes(p)) && v.parentIds.length > 0) {
      const rel = relationWith(v, o.id)
      rel.kinship = Math.max(rel.kinship, 0.55)
    }
  }
}

// ── Causal chronicle helper ──────────────────────────────────────────────────

export function logCause(state: SimState, cause: string, effect: string) {
  logEvent(state, `${cause} → ${effect}`)
}

// ── Rumors ───────────────────────────────────────────────────────────────────

function pushRumor(state: SimState, rumor: Omit<Rumor, 'id'>) {
  const full: Rumor = { ...rumor, id: state.nextRumorId++ }
  state.rumors.push(full)
  if (state.rumors.length > MAX_RUMORS) state.rumors.shift()
  return full
}

export function spawnRumor(
  state: SimState,
  kind: RumorKind,
  actor: Villager,
  about: Villager | null,
  intensity: number,
  text: string,
) {
  const knownBy = [actor.id]
  for (const w of state.villagers) {
    if (!w.alive || w.id === actor.id) continue
    const dx = w.x - actor.x
    const dy = w.y - actor.y
    if (dx * dx + dy * dy > 12 * 12) continue
    knownBy.push(w.id)
  }
  pushRumor(state, {
    kind,
    subjectId: actor.id,
    aboutId: about?.id ?? null,
    text,
    x: actor.x,
    y: actor.y,
    tick: state.tick,
    intensity,
    distortion: 0,
    knownBy,
  })
}

function tickRumors(state: SimState) {
  for (let i = state.rumors.length - 1; i >= 0; i--) {
    const r = state.rumors[i]
    r.intensity *= 0.992
    if (r.intensity < 0.08 || state.tick - r.tick > 900) {
      state.rumors.splice(i, 1)
      continue
    }
    // Propagate along a few carriers' relations (O(carriers × relations), capped).
    const carriers = r.knownBy.slice(0, 8)
    for (const cid of carriers) {
      const carrier = state.villagers.find((v) => v.id === cid && v.alive)
      if (!carrier) continue
      let hops = 0
      for (const [oid, rel] of carrier.relations) {
        if (hops >= 2) break
        if (r.knownBy.includes(oid)) continue
        if (rel.trust < 0.2 && rel.affinity < 0.15) continue
        const other = state.villagers.find((v) => v.id === oid && v.alive)
        if (!other) continue
        hops++
        r.knownBy.push(oid)
        if (r.knownBy.length > 28) r.knownBy.shift()
        r.distortion = Math.min(1, r.distortion + 0.08 * (1 - rel.trust))
        const heard = r.intensity * (0.4 + rel.trust * 0.5) * (1 - r.distortion * 0.35)
        if (r.aboutId !== null && (r.kind === 'theft' || r.kind === 'death')) {
          adjustRelation(other, r.aboutId, -0.04 * heard, -0.03 * heard, state.tick)
        }
        if (r.kind === 'generosity' && r.subjectId !== null) {
          adjustRelation(other, r.subjectId, 0.03 * heard, 0.02 * heard, state.tick)
        }
        // Gossip as social control: theft / shirk / unreliable → exclusion pressure.
        if (r.aboutId !== null && (r.kind === 'theft' || r.kind === 'shirk' || r.kind === 'unreliable' || r.kind === 'exclusion')) {
          const about = state.villagers.find((v) => v.id === r.aboutId && v.alive)
          if (about) {
            const polAbout = politicsOf(about)
            polAbout.reliability = clamp01(polAbout.reliability - 0.02 * heard)
            polAbout.grievance = clamp01(polAbout.grievance + 0.008 * heard)
            if (r.kind === 'theft' && heard > 0.35) {
              adjustRelation(other, r.aboutId, -0.05 * heard, -0.04 * heard, state.tick)
            }
          }
        }
        if (r.kind === 'wolf' || r.kind === 'famine') {
          const pol = politicsOf(other)
          pol.grievance = clamp01(pol.grievance + 0.01 * heard)
        }
      }
    }
  }
}

// ── Circles ──────────────────────────────────────────────────────────────────

function livingMembers(state: SimState, c: Circle): Villager[] {
  const out: Villager[] = []
  for (const id of c.memberIds) {
    const v = state.villagers.find((o) => o.id === id && o.alive)
    if (v) out.push(v)
  }
  return out
}

function refreshLeader(state: SimState, c: Circle) {
  const members = livingMembers(state, c)
  if (members.length === 0) {
    c.leaderId = null
    return
  }
  let best = members[0]
  let bestScore = -Infinity
  for (const m of members) {
    const role = lifeRoleOf(m)
    let s = influenceScore(state, m)
    // Soft obedience to preferred authority style + life-cycle (elders favoured in elder circles).
    s += authorityMatchBonus(m, c.authorityBasis) * 0.4
    if (c.kind === 'elder' && role === 'elder') s += 0.25
    if (role === 'child') s -= 0.35
    if (c.kind === 'threat' && m.profession === 'guard') s += 0.15
    if (s > bestScore) {
      bestScore = s
      best = m
    }
  }
  const prev = c.leaderId
  c.leaderId = best.id
  c.authorityBasis = pickAuthorityBasis(state, best, c)
  if (prev !== null && prev !== best.id) {
    logCause(
      state,
      `influence de ${best.name} (${AUTHORITY_FR[c.authorityBasis]})`,
      `${best.name} mène le ${c.name}`,
    )
  }
}

function refreshValues(state: SimState, c: Circle) {
  const members = livingMembers(state, c)
  c.values = avgBeliefs(members.map((m) => politicsOf(m).beliefs))
  // Soft drift of members toward circle mean.
  for (const m of members) {
    const pol = politicsOf(m)
    const pull = 0.02 * pol.beliefs.loyalty
    pol.beliefs.fairness = clamp01(pol.beliefs.fairness + (c.values.fairness - pol.beliefs.fairness) * pull)
    pol.beliefs.piety = clamp01(pol.beliefs.piety + (c.values.piety - pol.beliefs.piety) * pull)
    pol.beliefs.greed = clamp01(pol.beliefs.greed + (c.values.greed - pol.beliefs.greed) * pull)
    pol.beliefs.loyalty = clamp01(pol.beliefs.loyalty + (c.values.loyalty - pol.beliefs.loyalty) * pull)
    pol.beliefs.tradition = clamp01(pol.beliefs.tradition + (c.values.tradition - pol.beliefs.tradition) * pull)
  }
}

function rememberCircle(c: Circle, text: string) {
  c.memory.push(text)
  if (c.memory.length > MAX_CIRCLE_MEMORY) c.memory.shift()
}

function nameCircle(kind: CircleKind, seedName: string): string {
  if (kind === 'craft' && seedName) return `cercle des ${seedName}`
  return KIND_FR[kind]
}

function professionGroupLabel(prof: Profession): string | null {
  switch (prof) {
    case 'guard':
      return 'gardes'
    case 'trader':
      return 'marchands'
    case 'miller':
      return 'meuniers'
    case 'farmer':
      return 'fermiers'
    case 'fisher':
      return 'pêcheurs'
    case 'builder':
    case 'mason':
      return 'bâtisseurs'
    case 'herder':
      return 'éleveurs'
    case 'blacksmith':
      return 'forgerons'
    case 'weaver':
      return 'tisserands'
    case 'miner':
      return 'mineurs'
    default:
      return null
  }
}

function hasSimilarCircle(state: SimState, kind: CircleKind, memberIds: number[], villageId: number | null): boolean {
  for (const c of state.circles) {
    if (c.kind !== kind) continue
    if (villageId !== null && c.villageId !== villageId) continue
    let overlap = 0
    for (const id of memberIds) if (c.memberIds.includes(id)) overlap++
    if (overlap >= 2) return true
  }
  return false
}

function createCircle(
  state: SimState,
  kind: CircleKind,
  members: Villager[],
  villageId: number | null,
  seedLabel: string,
  originHint: string | null,
): Circle | null {
  if (state.circles.length >= MAX_CIRCLES || members.length < 2) return null
  const ids = members.map((m) => m.id)
  if (hasSimilarCircle(state, kind, ids, villageId)) return null
  const circle: Circle = {
    id: state.nextCircleId++,
    name: nameCircle(kind, seedLabel),
    kind,
    memberIds: ids,
    values: avgBeliefs(members.map((m) => politicsOf(m).beliefs)),
    reputation: 0.4,
    leaderId: null,
    legitimacy: 0.35,
    formedTick: state.tick,
    lastActiveTick: state.tick,
    problemCount: originHint ? 1 : 0,
    isInstitution: false,
    originStory: originHint,
    memory: originHint ? [originHint] : [],
    pooledFood: 0,
    norms: [],
    creed: null,
    villageId,
    cohesion: 0.4,
    enforcement: 0.15,
    authorityBasis: 'tradition',
    techIds: [],
    isGuild: false,
    qualityBar: 0.35,
  }
  refreshLeader(state, circle)
  state.circles.push(circle)
  const names = members.map((m) => m.name).slice(0, 3).join(', ')
  logCause(state, originHint ?? `affinités partagées (${names})`, `naissance du ${circle.name}`)
  return circle
}

function trySpawnCircles(state: SimState) {
  const alive = state.villagers.filter((v) => v.alive)
  if (alive.length < 2) return

  // Sample pairs within villages / proximity — avoid full N².
  const byVillage = new Map<number | 'lone', Villager[]>()
  for (const v of alive) {
    const key = v.villageId ?? 'lone'
    let list = byVillage.get(key)
    if (!list) {
      list = []
      byVillage.set(key, list)
    }
    list.push(v)
  }

  for (const [, group] of byVillage) {
    if (group.length < 2) continue
    const sample = group.length <= 14 ? group : group.filter((_, i) => (state.tick + i * 7) % 3 === 0).slice(0, 14)

    // Profession clusters
    const byProf = new Map<Profession, Villager[]>()
    for (const v of sample) {
      if (v.profession === 'none') continue
      let list = byProf.get(v.profession)
      if (!list) {
        list = []
        byProf.set(v.profession, list)
      }
      list.push(v)
    }
    for (const [prof, list] of byProf) {
      if (list.length < 2) continue
      const label = professionGroupLabel(prof)
      if (!label) continue
      const kind: CircleKind = prof === 'guard' ? 'threat' : prof === 'trader' ? 'trade' : 'craft'
      const candidates = list.slice(0, 4)
      if (hasSimilarCircle(state, kind, candidates.map((c) => c.id), candidates[0].villageId)) continue
      const bonded = candidates.filter((a) =>
        candidates.some((b) => {
          if (a.id === b.id) return false
          const r = a.relations.get(b.id)
          return r && (r.trust > 0.3 || r.affinity > 0.25 || r.kinship > 0.4)
        }),
      )
      if (bonded.length >= 2) {
        const origin =
          kind === 'threat'
            ? 'protection contre les loups'
            : kind === 'trade'
              ? 'routes et échanges'
              : `métier partagé (${label})`
        createCircle(state, kind, bonded.slice(0, 5), bonded[0].villageId, label, origin)
      }
    }

    // Kin pairs
    for (let i = 0; i < sample.length; i++) {
      const a = sample[i]
      for (let j = i + 1; j < sample.length; j++) {
        const b = sample[j]
        const ra = a.relations.get(b.id)
        if (!ra || ra.kinship < 0.5) continue
        if (ra.affinity < 0.2) continue
        const third = sample.find((c) => {
          if (c.id === a.id || c.id === b.id) return false
          const r1 = c.relations.get(a.id)
          const r2 = c.relations.get(b.id)
          return (r1?.kinship ?? 0) > 0.45 || (r2?.kinship ?? 0) > 0.45
        })
        const kinMembers = third ? [a, b, third] : [a, b]
        createCircle(state, 'kin', kinMembers, a.villageId, '', 'liens de parenté')
        break
      }
    }

    // Shared hunger trauma / famine solidarity
    if (state.famine) {
      const hungry = sample.filter((v) => v.hunger < 1.2 || politicsOf(v).beliefs.fairness > 0.55)
      if (hungry.length >= 3) {
        const core = hungry.slice(0, 4)
        const c = createCircle(state, 'hunger', core, core[0].villageId, '', 'famine partagée')
        if (c && !c.norms.includes('share_famine')) {
          c.norms.push('share_famine')
          logCause(state, 'famine', `${c.name} adopte la norme « ${NORM_FR.share_famine} »`)
        }
      }
    }

    // Common enemy / wolf fear via memories
    const fearful = sample.filter((v) => v.memories.some((m) => m.kind === 'dangerSpot' || m.kind === 'grief' || m.kind === 'saved'))
    if (fearful.length >= 2) {
      const guards = fearful.filter((v) => v.profession === 'guard' || v.ambition === 'protector' || v.personality.courage > 0.55)
      const pool = guards.length >= 2 ? guards : fearful
      if (pool.length >= 2) {
        const c = createCircle(state, 'threat', pool.slice(0, 4), pool[0].villageId, 'gardes', 'peur des loups')
        if (c && !c.norms.includes('protect_all')) {
          c.norms.push('protect_all')
        }
      }
    }

    // Soft faith circle — only if several high-piety people cluster (no canned religion)
    const pious = sample.filter((v) => politicsOf(v).beliefs.piety > 0.62)
    if (pious.length >= 3) {
      const close = pious.filter((a) => pious.some((b) => a.id !== b.id && distance(a.x, a.y, b.x, b.y) < 20))
      if (close.length >= 3) {
        const c = createCircle(state, 'faith', close.slice(0, 4), close[0].villageId, '', 'recueillement partagé')
        if (c) c.creed = 'piete'
      }
    }

    // Elders settling disputes — older + high trust network
    const elders = sample.filter((v) => v.age > 800 && politicsOf(v).beliefs.fairness > 0.45)
    if (elders.length >= 2) {
      const trusted = elders.filter((e) => {
        let t = 0
        for (const r of e.relations.values()) if (r.trust > 0.45) t++
        return t >= 2
      })
      if (trusted.length >= 2) {
        const c = createCircle(state, 'elder', trusted.slice(0, 3), trusted[0].villageId, '', 'arbitrage des conflits')
        if (c && !c.norms.includes('punish_theft')) c.norms.push('punish_theft')
      }
    }
  }
}

function adoptNorms(state: SimState, c: Circle) {
  if (c.kind === 'trade' && !c.norms.includes('favor_traders') && c.problemCount >= 1) {
    c.norms.push('favor_traders')
    logCause(state, 'pression marchande', `${c.name} favorise le commerce`)
  }
  if (c.kind === 'hunger' && state.famine && !c.norms.includes('share_famine')) {
    c.norms.push('share_famine')
    logCause(state, 'famine', `${c.name} impose le partage`)
  }
  if (c.values.greed > 0.65 && !c.norms.includes('hoard_wealth') && c.kind === 'trade') {
    c.norms.push('hoard_wealth')
  }
  // Theft spike → punish norm (faster for institutions / elders).
  if (state.thefts > 0 && state.tick % 400 < CIRCLE_TICK && (c.kind === 'elder' || c.kind === 'village') && !c.norms.includes('punish_theft')) {
    c.norms.push('punish_theft')
    logCause(state, 'vols répétés', `${c.name} durcit la norme contre le vol`)
  }
  // Inequality → fairness / punish / elder arbitration.
  if (c.villageId !== null) {
    const ineq = villageOf(state, c.villageId)?.inequalityStress ?? 0
    if (ineq > 0.45 && c.kind === 'elder' && !c.norms.includes('punish_theft')) {
      c.norms.push('punish_theft')
      c.problemCount += 1
      logCause(state, 'écarts de fortune', `${c.name} arbitre contre les abus`)
    }
    if (ineq > 0.55 && c.kind === 'hunger' && !c.norms.includes('share_famine')) {
      c.norms.push('share_famine')
      logCause(state, 'inégalité alimentaire', `${c.name} impose le partage`)
    }
  }
  // Commons: walls / roads / pool need monitoring norms.
  if (
    (c.kind === 'village' || c.kind === 'threat' || c.kind === 'elder' || c.isInstitution) &&
    !c.norms.includes('maintain_commons') &&
    (c.problemCount >= 2 || c.isInstitution)
  ) {
    c.norms.push('maintain_commons')
    logCause(state, 'usure du commun', `${c.name} adopte « ${NORM_FR.maintain_commons} »`)
  }
  if ((c.kind === 'kin' || c.kind === 'hunger' || c.kind === 'faith') && !c.norms.includes('reciprocate') && c.problemCount >= 1) {
    c.norms.push('reciprocate')
  }

  // Estate-like pressure (EU soft): merchants / farmers / guards push competing norms by weight.
  tickEstatePressure(state, c)
}

/** Merchants vs producers vs guards — circle "estates" pressuring norms (no player estates UI). */
function tickEstatePressure(state: SimState, c: Circle) {
  if (c.villageId === null) return
  const members = livingMembers(state, c)
  if (members.length < 2) return
  let merchants = 0
  let farmers = 0
  let guards = 0
  let artisans = 0
  for (const m of members) {
    if (m.profession === 'trader') merchants++
    else if (m.profession === 'farmer' || m.profession === 'herder' || m.profession === 'fisher') farmers++
    else if (m.profession === 'guard') guards++
    else if (
      m.profession === 'miller' ||
      m.profession === 'blacksmith' ||
      m.profession === 'weaver' ||
      m.profession === 'mason' ||
      m.profession === 'builder' ||
      m.profession === 'miner'
    ) {
      artisans++
    }
  }
  const n = members.length
  const vg = villageOf(state, c.villageId)
  const sol = vg?.standardOfLiving ?? 0.4
  const labor = vg?.laborBalance ?? 0

  if (c.kind === 'trade' && merchants / n >= 0.35) {
    if (!c.norms.includes('favor_traders')) {
      c.norms.push('favor_traders')
      logCause(state, 'pression des marchands', `${c.name} impose des privilèges commerciaux`)
    }
    if (sol > 0.55 && !c.norms.includes('hoard_wealth') && c.values.greed > 0.5) {
      c.norms.push('hoard_wealth')
      logCause(state, 'prospérité marchande', `${c.name} défend l'accumulation`)
    }
    c.problemCount = Math.min(c.problemCount + 1, INSTITUTION_PROBLEMS + 3)
  }
  if ((c.kind === 'hunger' || c.kind === 'village' || c.kind === 'craft') && farmers / n >= 0.4) {
    if (sol < 0.4 && !c.norms.includes('share_famine')) {
      c.norms.push('share_famine')
      logCause(state, 'pression des cultivateurs', `${c.name} exige le partage des vivres`)
    }
    if (labor < -1 && !c.norms.includes('maintain_commons')) {
      c.norms.push('maintain_commons')
    }
  }
  if ((c.kind === 'threat' || c.kind === 'elder') && guards / n >= 0.3) {
    if (!c.norms.includes('protect_all')) {
      c.norms.push('protect_all')
      logCause(state, 'pression des gardes', `${c.name} priorise la défense`)
    }
    if ((vg?.development ?? 0) > 4 && !c.norms.includes('punish_theft')) {
      c.norms.push('punish_theft')
    }
  }
  if (c.kind === 'craft' && artisans / n >= 0.4 && (vg?.development ?? 0) > 5) {
    c.legitimacy = clamp01(c.legitimacy + 0.01)
    if (!c.norms.includes('maintain_commons') && c.isInstitution) c.norms.push('maintain_commons')
  }
}

function maybeInstitutionalize(state: SimState, c: Circle) {
  if (c.isInstitution) return
  const age = state.tick - c.formedTick
  const members = livingMembers(state, c).length
  if (members < 2) return
  // Acute collective problems institutionalize faster (theft waves, famine, raids).
  const acute = c.problemCount >= INSTITUTION_PROBLEMS + 2 || (state.famine && c.kind === 'hunger') || (state.thefts > 8 && c.kind === 'elder')
  const needProblems = acute ? 1 : members >= 4 && age >= INSTITUTION_AGE * 1.5 ? 1 : INSTITUTION_PROBLEMS
  const needAge = acute ? INSTITUTION_AGE * 0.55 : INSTITUTION_AGE
  if (age < needAge || c.problemCount < needProblems) return
  c.isInstitution = true
  c.enforcement = clamp01(c.enforcement + 0.35)
  const story = c.originStory ?? `persistance du ${c.name}`
  c.originStory = story
  // Craft / trade circles with enough practitioners harden into guilds.
  if ((c.kind === 'craft' || c.kind === 'trade') && members >= GUILD_MIN_PRACTITIONERS) {
    const practitioners = livingMembers(state, c).filter((m) => hasCraftIdentityFor(state, m, c)).length
    if (practitioners >= GUILD_MIN_PRACTITIONERS) {
      promoteToGuild(state, c)
    } else {
      logCause(state, story, `${c.name} devient une institution (application des normes)`)
    }
  } else {
    logCause(state, story, `${c.name} devient une institution (application des normes)`)
  }
  rememberCircle(c, `institutionnalisé : ${story}`)
}

function promoteToGuild(state: SimState, c: Circle) {
  if (c.isGuild) return
  c.isGuild = true
  c.enforcement = clamp01(c.enforcement + 0.2)
  c.qualityBar = Math.max(c.qualityBar || 0.3, 0.4)
  if (!c.norms.includes('craft_quality')) c.norms.push('craft_quality')
  if (!c.norms.includes('teach_apprentice')) c.norms.push('teach_apprentice')
  if (!c.norms.includes('exclude_shirkers')) c.norms.push('exclude_shirkers')
  // Rename cercle → guilde when still a craft circle label.
  if (c.name.startsWith('cercle des ')) {
    c.name = c.name.replace(/^cercle des /, 'guilde des ')
  } else if (!c.name.startsWith('guilde')) {
    c.name = `guilde — ${c.name}`
  }
  logCause(state, c.originStory ?? 'métier partagé', `${c.name} se forme (normes, apprentis, qualité)`)
  rememberCircle(c, 'naissance de la guilde')
}

/** Apprentissage + exclusion des oisifs + prestige maître — LOD stagger. */
function tickGuildLife(state: SimState, c: Circle) {
  if (!c.isGuild && !(c.kind === 'craft' && c.isInstitution && livingMembers(state, c).length >= GUILD_MIN_PRACTITIONERS)) {
    return
  }
  if (!c.isGuild && c.kind === 'craft' && c.isInstitution) promoteToGuild(state, c)
  if (!c.isGuild) return
  if ((state.tick + c.id * 3) % (CIRCLE_TICK * 2) !== 0) return

  const members = livingMembers(state, c)
  if (members.length < 2) return

  // Quality bar drifts up with masterworks / craft skill.
  let skillSum = 0
  let master = members[0]
  let masterSkill = -1
  for (const m of members) {
    const sk = mindOf(m).skills.craft + mindOf(m).skills.social * 0.2
    skillSum += sk
    if (sk > masterSkill) {
      masterSkill = sk
      master = m
    }
    if (mindOf(m).masterworkCount > 0) noteRecognition(m, 0.02)
  }
  c.qualityBar = clamp01(0.3 + skillSum / members.length * 0.5)

  // Apprenticeship: master teaches a youth / low-skill member (skill drip).
  if (c.norms.includes('teach_apprentice')) {
    const apprentice = members.find(
      (m) => m.id !== master.id && (m.age < CHILD_AGE * 1.4 || mindOf(m).skills.craft < c.qualityBar * 0.7),
    )
    if (apprentice && masterSkill > mindOf(apprentice).skills.craft + 0.08) {
      const am = mindOf(apprentice)
      const mm = mindOf(master)
      const drip = 0.012 + mm.skills.social * 0.01
      am.skills.craft = clamp01(am.skills.craft + drip)
      am.skills.social = clamp01(am.skills.social + drip * 0.4)
      ensureLivelihood(mm)
      ensureLivelihood(am)
      mm.livelihood.mix.teach = clamp01(mm.livelihood.mix.teach + 0.04)
      am.livelihood.mix.craft = clamp01(am.livelihood.mix.craft + 0.03)
      noteRecognition(master, 0.015)
      if ((state.tick + c.id) % 400 < CIRCLE_TICK) {
        logEvent(state, `${master.name} forme ${apprentice.name} dans la ${c.name}`)
      }
    }
  }

  // Exclude free-riders: low craft mix + low skill → shirk rumor / drop.
  if (c.norms.includes('exclude_shirkers') && c.enforcement > 0.35) {
    for (const m of members) {
      if (m.id === c.leaderId) continue
      const live = ensureLivelihood(mindOf(m))
      const craftPractice = live.mix.craft + live.mix.mine + live.mix.build + live.mix.teach
      const sk = mindOf(m).skills.craft
      if (craftPractice < 0.08 && sk < c.qualityBar * 0.45 && m.age > CHILD_AGE) {
        // Soft exclusion: remove from circle + rumor.
        c.memberIds = c.memberIds.filter((id) => id !== m.id)
        spawnRumorSoft(state, 'shirk', m, `${m.name} néglige le métier de la ${c.name}`)
        live.recognition = clamp01(live.recognition - 0.08)
        if ((state.tick + m.id) % 500 < CIRCLE_TICK) {
          logEvent(state, `${m.name} est écarté de la ${c.name} (oisiveté)`)
        }
        break
      }
    }
  }
  // No hive mind: drop guild members without craft identity.
  if (c.isGuild) {
    for (const m of members) {
      if (m.id === c.leaderId) continue
      if (hasCraftIdentityFor(state, m, c)) continue
      c.memberIds = c.memberIds.filter((id) => id !== m.id)
      rememberCircle(c, `${m.name} quitte (hors metier)`)
      break
    }
  }

}

function spawnRumorSoft(state: SimState, kind: RumorKind, about: Villager, text: string) {
  pushRumor(state, {
    kind,
    subjectId: null,
    aboutId: about.id,
    text,
    x: about.x,
    y: about.y,
    tick: state.tick,
    intensity: 0.45,
    distortion: 0.1,
    knownBy: [about.id],
  })
}

function updateLegitimacy(state: SimState, c: Circle) {
  const members = livingMembers(state, c)
  if (members.length === 0) return
  let delta = 0
  if (!state.famine) delta += 0.008
  else delta -= 0.02
  const recentDeaths = members.some((m) => m.memories.some((mem) => mem.kind === 'grief' && state.tick - mem.tick < 200))
  if (recentDeaths) delta -= 0.015
  if (c.kind === 'threat') {
    const village = c.villageId !== null ? state.villages.find((vg) => vg.id === c.villageId) : null
    if (village && village.wallTier !== 'none') delta += 0.012
  }
  if (c.kind === 'trade' && members.some((m) => m.profession === 'trader' && m.tradeCooldown > 0)) delta += 0.01
  // Enforcement success: institutions that punish theft / keep commons gain legitimacy.
  if (c.isInstitution && c.enforcement > 0.4) delta += 0.01 * c.enforcement
  if (c.cohesion > 0.6) delta += 0.006
  else if (c.cohesion < 0.25) delta -= 0.01
  c.legitimacy = clamp01(c.legitimacy + delta)
  c.reputation = clamp01(c.reputation + delta * 0.5)
  c.enforcement = clamp01(c.enforcement * (c.isInstitution ? 0.998 : 0.995) + (c.isInstitution ? 0.008 : 0.002))
  for (const m of members) {
    const pol = politicsOf(m)
    const obey = 0.02 + authorityMatchBonus(m, c.authorityBasis)
    if (m.id === c.leaderId) pol.legitimacy = clamp01(pol.legitimacy * 0.85 + c.legitimacy * 0.15)
    else pol.legitimacy = clamp01(pol.legitimacy * 0.95 + c.legitimacy * (0.03 + obey * 0.15))
    // Norm internalization grows with time in circles (even without watcher).
    pol.normInternalization = clamp01(
      pol.normInternalization + 0.004 * pol.beliefs.loyalty + (c.isInstitution ? 0.006 : 0.002) * c.enforcement,
    )
  }
}

function joinWillingness(state: SimState, v: Villager, c: Circle): number {
  const pol = politicsOf(v)
  let score = 0.15 + pol.beliefs.loyalty * 0.25
  if (c.leaderId !== null) {
    const rel = v.relations.get(c.leaderId)
    if (rel) score += rel.trust * 0.35 + rel.affinity * 0.25 + (rel.respect ?? 0) * 0.3
  }
  // Rumors about circle members
  for (const r of state.rumors) {
    if (!r.knownBy.includes(v.id)) continue
    if (r.aboutId !== null && c.memberIds.includes(r.aboutId) && (r.kind === 'theft' || r.kind === 'death')) {
      score -= r.intensity * 0.2
    }
  }
  const dFair = 1 - Math.abs(pol.beliefs.fairness - c.values.fairness)
  score += dFair * 0.15
  return score
}

function circleCraftProfession(state: SimState, c: Circle): Profession | null {
  const counts = new Map<Profession, number>()
  for (const m of livingMembers(state, c)) {
    if (m.profession === 'none') continue
    counts.set(m.profession, (counts.get(m.profession) ?? 0) + 1)
  }
  let best: Profession | null = null
  let bestN = 0
  for (const [p, n] of counts) {
    if (n > bestN) {
      bestN = n
      best = p
    }
  }
  return best
}

function hasCraftIdentityFor(state: SimState, v: Villager, c: Circle): boolean {
  if (!(c.isGuild || c.kind === 'craft' || c.kind === 'trade')) return true
  if (v.profession === 'none') {
    if (c.isGuild) return false
    try {
      return mindOf(v).skills.craft > 0.35
    } catch {
      return false
    }
  }
  if (c.kind === 'trade') return v.profession === 'trader'
  const dominant = circleCraftProfession(state, c)
  if (!dominant) return true
  return v.profession === dominant
}

function maybeRecruit(state: SimState, c: Circle) {
  if (c.memberIds.length >= MAX_CIRCLE_MEMBERS) return
  const members = livingMembers(state, c)
  if (members.length === 0) return
  const anchor = members[0]
  for (const o of state.villagers) {
    if (!o.alive || c.memberIds.includes(o.id)) continue
    if (c.villageId !== null && o.villageId !== c.villageId && c.kind !== 'trade') continue
    if (distance(o.x, o.y, anchor.x, anchor.y) > 28) continue
    if (!hasCraftIdentityFor(state, o, c)) continue
    if (joinWillingness(state, o, c) > 0.55) {
      c.memberIds.push(o.id)
      c.lastActiveTick = state.tick
      rememberCircle(c, `${o.name} rejoint`)
      if (c.memberIds.length >= 3) break
    }
  }
}

function pruneCircles(state: SimState) {
  for (let i = state.circles.length - 1; i >= 0; i--) {
    const c = state.circles[i]
    c.memberIds = c.memberIds.filter((id) => state.villagers.some((v) => v.id === id && v.alive))
    if (c.memberIds.length < 2) {
      if (c.isInstitution) logEvent(state, `L'institution ${c.name} se dissout`)
      state.circles.splice(i, 1)
    }
  }
}

// ── Succession / power vacuum ────────────────────────────────────────────────

function villageNotable(state: SimState, villageId: number): Villager | null {
  const circles = state.circles
    .filter((c) => c.villageId === villageId)
    .sort((a, b) => b.memberIds.length - a.memberIds.length || b.legitimacy - a.legitimacy)
  if (circles.length > 0 && circles[0].leaderId !== null) {
    const leader = state.villagers.find((v) => v.id === circles[0].leaderId && v.alive)
    if (leader) return leader
  }
  let best: Villager | null = null
  let bestScore = -Infinity
  for (const v of state.villagers) {
    if (!v.alive || v.villageId !== villageId) continue
    const s = influenceScore(state, v) + politicsOf(v).legitimacy
    if (s > bestScore) {
      bestScore = s
      best = v
    }
  }
  return best
}

export function handlePoliticalDeath(state: SimState, victim: Villager) {
  const led = state.circles.filter((c) => c.leaderId === victim.id)
  for (const c of led) {
    c.legitimacy = clamp01(c.legitimacy - 0.25)
    c.problemCount += 1
    rememberCircle(c, `mort de ${victim.name}`)
    logCause(state, `mort de ${victim.name}`, `vide de pouvoir dans le ${c.name}`)

    const members = livingMembers(state, c).filter((m) => m.id !== victim.id)
    if (members.length === 0) {
      c.leaderId = null
      continue
    }

    // Strong family bond may soft-inherit leadership (tradition authority).
    let heir: Villager | null = null
    for (const m of members) {
      const rel = m.relations.get(victim.id)
      if (rel && rel.kinship > 0.7 && rel.affinity > 0.35 && m.personality.ambition > 0.4) {
        heir = m
        break
      }
    }
    // Competence / charisma contest when tradition heir weak.
    if (!heir && c.authorityBasis === 'competence') {
      members.sort((a, b) => computePower(state, b).scores.knowledge - computePower(state, a).scores.knowledge)
      heir = members[0] ?? null
    } else if (!heir && c.authorityBasis === 'charisma') {
      members.sort((a, b) => b.personality.sociability - a.personality.sociability)
      heir = members[0] ?? null
    } else if (!heir && c.authorityBasis === 'fear') {
      members.sort((a, b) => computePower(state, b).scores.military - computePower(state, a).scores.military)
      heir = members[0] ?? null
    }
    if (heir) {
      c.leaderId = heir.id
      c.authorityBasis = pickAuthorityBasis(state, heir, c)
      logCause(state, `autorité par ${AUTHORITY_FR[c.authorityBasis]}`, `${heir.name} reprend le ${c.name}`)
      spawnRumor(state, 'succession', heir, victim, 0.7, `${heir.name} succède à ${victim.name}`)
    } else {
      // Contest: top two by influence — raise confront/social pressure via grievance
      members.sort((a, b) => influenceScore(state, b) - influenceScore(state, a))
      const a = members[0]
      const b = members[1] ?? null
      c.leaderId = a.id
      politicsOf(a).grievance = clamp01(politicsOf(a).grievance + 0.15)
      if (b) {
        politicsOf(b).grievance = clamp01(politicsOf(b).grievance + 0.2)
        adjustRelation(a, b.id, -0.12, -0.05, state.tick)
        adjustRelation(b, a.id, -0.12, -0.05, state.tick)
        logCause(state, `vide laissé par ${victim.name}`, `rivalité entre ${a.name} et ${b.name}`)
        spawnRumor(state, 'succession', a, b, 0.8, `lutte d'influence : ${a.name} contre ${b.name}`)
        // Soft confront bias — not auto civil war (deferred)
        if (a.personality.courage > 0.55 && b.personality.courage > 0.5 && influenceScore(state, a) - influenceScore(state, b) < 0.15) {
          a.grudgeTarget = a.grudgeTarget ?? b.id
          remember(a, {
            kind: 'harmed',
            subjectId: b.id,
            x: b.x,
            y: b.y,
            tick: state.tick,
            weight: 1.1,
            emotion: -0.6,
          })
        }
      } else {
        logCause(state, `influence`, `${a.name} prend la tête du ${c.name}`)
      }
    }
  }

  // Village-level notable death
  if (victim.villageId !== null) {
    const notable = villageNotable(state, victim.villageId)
    if (!notable || notable.id === victim.id) {
      logCause(state, `disparition d'une figure du village`, `les cercles se disputent l'ascendant`)
    }
  }

  POLITICS.delete(victim.id)
  POWER_CACHE.delete(victim.id)
}

// ── Beliefs / creeds / migration ─────────────────────────────────────────────

function crystallizeCreed(pol: PoliticalState): CreedId | null {
  if (pol.grievance < 0.45 && pol.creedWeight < 0.5) return null
  if (pol.beliefs.fairness > 0.65 && pol.grievance > 0.3) return 'partage'
  if (pol.beliefs.greed > 0.6) return 'commerce_libre'
  if (pol.beliefs.piety > 0.65) return 'piete'
  if (pol.beliefs.tradition > 0.65) return 'tradition'
  if (pol.beliefs.tradition < 0.35) return 'changement'
  if (pol.grievance > 0.6) return 'ordre'
  return pol.creed
}

function tickIndividualPolitics(state: SimState, v: Villager) {
  const pol = politicsOf(v)
  ensureKinship(state, v)
  const role = lifeRoleOf(v)

  // Life events nudge beliefs
  for (const m of v.memories) {
    if (state.tick - m.tick > 400) continue
    if (m.kind === 'robbed' || m.kind === 'sawTheft') {
      pol.beliefs.fairness = clamp01(pol.beliefs.fairness + 0.01)
      pol.grievance = clamp01(pol.grievance + 0.02)
    }
    if (m.kind === 'helped' || m.kind === 'saved') {
      pol.beliefs.loyalty = clamp01(pol.beliefs.loyalty + 0.008)
      pol.beliefs.piety = clamp01(pol.beliefs.piety + 0.004)
      pol.reliability = clamp01(pol.reliability + 0.01)
    }
    if (m.kind === 'grief' || m.kind === 'harmed') {
      pol.grievance = clamp01(pol.grievance + 0.015)
      pol.beliefs.piety = clamp01(pol.beliefs.piety + 0.01)
    }
    if (m.kind === 'dangerSpot') {
      pol.beliefs.loyalty = clamp01(pol.beliefs.loyalty + 0.005)
    }
  }

  if (state.famine) {
    pol.grievance = clamp01(pol.grievance + 0.01)
    pol.beliefs.fairness = clamp01(pol.beliefs.fairness + (1 - pol.beliefs.greed) * 0.008)
    pol.migrationUrge = clamp01(pol.migrationUrge + 0.012 * (1 - pol.beliefs.loyalty))
  } else {
    pol.migrationUrge = clamp01(pol.migrationUrge - 0.008)
    pol.grievance = clamp01(pol.grievance - 0.004)
  }

  // Inequality stress: poor gain grievance; rich elites overproduced → rivalry soft.
  const vg = villageOf(state, v.villageId)
  if (vg && vg.inequalityStress > 0.35) {
    const wealth = wealthProxy(v)
    const members = villageMembers(state, vg.id)
    const mean = members.reduce((a, m) => a + wealthProxy(m), 0) / Math.max(1, members.length)
    if (wealth < mean * 0.65) {
      pol.grievance = clamp01(pol.grievance + 0.012 * vg.inequalityStress)
      pol.migrationUrge = clamp01(pol.migrationUrge + 0.008 * (1 - pol.beliefs.loyalty) * vg.inequalityStress)
    } else if (wealth > mean * 1.6 && v.personality.ambition > 0.5) {
      pol.grievance = clamp01(pol.grievance + 0.006 * vg.inequalityStress)
    }
  }

  // Low cohesion → fragmentation / migration (youth especially).
  if (vg && vg.cohesion < 0.28) {
    const youth = role === 'child' || (role === 'adult' && v.age < ELDER_AGE * 0.45)
    pol.migrationUrge = clamp01(pol.migrationUrge + (youth ? 0.02 : 0.01) * (1 - pol.beliefs.loyalty))
  }

  // Vic3-lite SoL + labor: low living standards / unemployment → unrest & migrate.
  if (vg) {
    const carry = villageCarryingPressure(state, vg)
    if (carry > 0.4) {
      pol.migrationUrge = clamp01(pol.migrationUrge + carry * 0.028 * (1 - pol.beliefs.loyalty))
      pol.grievance = clamp01(pol.grievance + carry * 0.02)
    }
    const sol = villagerSoL(state, v)
    const villageSol = vg.standardOfLiving ?? sol
    if (sol < 0.32) {
      pol.grievance = clamp01(pol.grievance + (0.32 - sol) * 0.05)
      pol.migrationUrge = clamp01(pol.migrationUrge + (0.32 - sol) * 0.04 * (1 - pol.beliefs.loyalty))
    } else if (sol > 0.65) {
      pol.migrationUrge = clamp01(pol.migrationUrge - 0.01)
      pol.grievance = clamp01(pol.grievance - 0.006)
    }
    if ((vg.laborBalance ?? 0) < -1.5) {
      // Local unemployment overhang.
      const jobless =
        v.profession === 'none' ||
        (!v.hasField && !v.hasWorkbench && !v.hasPen && v.profession !== 'guard' && v.profession !== 'trader')
      if (jobless && role !== 'child') {
        pol.grievance = clamp01(pol.grievance + 0.015)
        pol.migrationUrge = clamp01(pol.migrationUrge + 0.018 * (1 - pol.beliefs.loyalty))
      }
    }
    // Pull awareness: better SoL elsewhere soft-raises urge when local is poor.
    if (villageSol < 0.4 && role !== 'elder') {
      for (const other of state.villages) {
        if (other.id === vg.id || other.memberIds.length < 2) continue
        if ((other.standardOfLiving ?? 0) > villageSol + 0.18) {
          pol.migrationUrge = clamp01(pol.migrationUrge + 0.01)
          break
        }
      }
    }
  }

  // Oppression feel: low legitimacy of local institution + high grievance
  const localInst = state.circles.find((c) => c.isInstitution && c.memberIds.includes(v.id) && c.legitimacy < 0.3)
  if (localInst) pol.migrationUrge = clamp01(pol.migrationUrge + 0.015)

  // Unpaid debts → obligation pressure / unreliability rumors.
  tickPersonalDebts(state, v)

  // Elders arbitrate soft; children stick to kin.
  if (role === 'elder') {
    pol.beliefs.fairness = clamp01(pol.beliefs.fairness + 0.004)
    pol.migrationUrge = clamp01(pol.migrationUrge * 0.92)
  } else if (role === 'child') {
    pol.normInternalization = clamp01(pol.normInternalization + 0.008)
  }

  const next = crystallizeCreed(pol)
  if (next && next !== pol.creed) {
    pol.creed = next
    pol.creedWeight = 0.4
    if (pol.grievance > 0.5) {
      logCause(state, `griefs répétés de ${v.name}`, `creed : « ${CREED_FR[next]} »`)
    }
  } else if (pol.creed) {
    pol.creedWeight = clamp01(pol.creedWeight + 0.01)
  }
}

function tickPersonalDebts(state: SimState, v: Villager) {
  const pol = politicsOf(v)
  const norms = activeNormsFor(state, v)
  for (const [oid, rel] of v.relations) {
    if (rel.debt < 1.1) continue
    // I am owed — other should reciprocate.
    const other = state.villagers.find((o) => o.id === oid && o.alive)
    if (!other) continue
    const otherPol = politicsOf(other)
    if (otherPol.reliability < 0.4 && norms.includes('reciprocate') && (state.tick + v.id) % 120 === 0) {
      pol.grievance = clamp01(pol.grievance + 0.03)
      adjustRelation(v, oid, -0.04, -0.03, state.tick)
      spawnRumor(state, 'unreliable', v, other, 0.5, `${other.name} tarde à rendre une faveur`)
      logCause(state, `dette non rendue envers ${v.name}`, `réputation de ${other.name} souffre`)
    }
  }
}

export function trySpreadCreed(state: SimState, a: Villager, b: Villager) {
  const pa = politicsOf(a)
  const pb = politicsOf(b)
  if (!pa.creed || pa.creedWeight < 0.35) return
  const rel = relationWith(b, a.id)
  if (rel.trust < 0.3) return
  if (pb.creed === pa.creed) {
    pb.creedWeight = clamp01(pb.creedWeight + 0.05)
    return
  }
  const open = (1 - pb.beliefs.tradition) * 0.4 + rel.affinity * 0.3 + a.personality.sociability * 0.2
  if (open > 0.45 && pa.creedWeight > pb.creedWeight) {
    pb.creed = pa.creed
    pb.creedWeight = 0.25
    logCause(state, `${a.name} convainc ${b.name}`, `« ${CREED_FR[pa.creed]} » se répand`)
  }
}

// ── Task / interaction biases (exported for behaviors) ───────────────────────

export function circlesOf(state: SimState, v: Villager): Circle[] {
  return state.circles.filter((c) => c.memberIds.includes(v.id))
}

export function activeNormsFor(state: SimState, v: Villager): NormId[] {
  const norms = new Set<NormId>()
  for (const c of circlesOf(state, v)) {
    for (const n of c.norms) norms.add(n)
  }
  return [...norms]
}

/** Multiplier applied in chooseTask scoring. */
export function politicalTaskBias(state: SimState, v: Villager, kind: TaskKind, targetId: number | null): number {
  let mult = 1
  const pol = politicsOf(v)
  const norms = activeNormsFor(state, v)
  const circles = circlesOf(state, v)
  const institutions = circles.filter((c) => c.isInstitution)
  const role = lifeRoleOf(v)
  const vgCoh = villageCohesion(state, v.villageId)
  const circleCoh = circles.reduce((a, c) => a + c.cohesion, 0) / Math.max(1, circles.length)
  const enforcement = institutions.reduce((a, c) => Math.max(a, c.enforcement), 0)

  if (kind === 'giveFood') {
    if (norms.includes('share_famine') && state.famine) mult *= 2.1
    if (circles.some((c) => c.kind === 'hunger' && c.pooledFood > 0.5)) mult *= 1.45
    mult *= 1 + pol.beliefs.fairness * 0.45
    if (pol.creed === 'partage') mult *= 1.35
    if (norms.includes('reciprocate') && targetId !== null) {
      const oweThem = relationWith(v, targetId).debt
      const other = state.villagers.find((o) => o.id === targetId)
      const theyOwe = other?.relations.get(v.id)?.debt ?? 0
      // Repay obligation first (Mauss); also favour reliable partners.
      if (oweThem > 0.35) mult *= 1.55 + Math.min(1, oweThem) * 0.4
      if (other && theyOwe > 1.2 && politicsOf(other).reliability < 0.35) mult *= 0.55
    }
    if (role === 'elder') mult *= 1.2
    if (targetId !== null && norms.includes('punish_theft') && isKnownThief(state, v, targetId)) mult *= 0.15
    if (targetId !== null && isSociallyExcluded(state, v, targetId)) mult *= 0.2
  }
  if (kind === 'steal') {
    if (norms.includes('punish_theft')) mult *= 0.22
    if (norms.includes('share_famine') && state.famine) mult *= 0.45
    if (norms.includes('hoard_wealth')) mult *= 1.2
    mult *= 1 + pol.beliefs.greed * 0.4 - pol.beliefs.fairness * 0.45
    if (pol.creed === 'ordre') mult *= 0.4
    if (institutions.some((c) => c.norms.includes('punish_theft'))) mult *= 0.55
    // Internalized norms: follow even without watcher.
    mult *= 1 - pol.normInternalization * 0.55
    if (enforcement > 0.45) mult *= 1 - enforcement * 0.35
    if (role === 'child') mult *= 0.4
    // Unemployment / low SoL → desperation theft (Vic3 unrest soft).
    const vg = villageOf(state, v.villageId)
    if (vg && (vg.laborBalance ?? 0) < -1.2 && (v.profession === 'none' || !v.hasField)) mult *= 1.35
    if (vg && (vg.standardOfLiving ?? 0.4) < 0.28) mult *= 1.25
  }
  if (kind === 'confront') {
    if (norms.includes('punish_theft') && targetId !== null) {
      const aboutTheft = state.rumors.some(
        (r) =>
          (r.kind === 'theft' || r.kind === 'shirk' || r.kind === 'unreliable') &&
          r.aboutId === targetId &&
          r.knownBy.includes(v.id) &&
          r.intensity > 0.25,
      )
      if (aboutTheft) mult *= 1.85 + enforcement * 0.5
    }
    if (pol.creed === 'vengeance' || pol.grievance > 0.55) mult *= 1.25
    if (role === 'elder' && norms.includes('punish_theft')) mult *= 1.15
    if (role === 'child') mult *= 0.35
    if (targetId !== null) {
      const rival = state.villagers.find((o) => o.id === targetId && o.alive)
      if (rival) {
        const outgroup = rival.villageId !== v.villageId || !circles.some((c) => c.memberIds.includes(rival.id))
        // High cohesion + outgroup rival → cooperative confront (asabiya).
        if (outgroup && (vgCoh > 0.55 || circleCoh > 0.55)) mult *= 1.35 + vgCoh * 0.45
        // Low cohesion → fragmentation: less collective confront, more personal feud only.
        if (!outgroup && vgCoh < 0.3) mult *= 1.15 + pol.grievance * 0.2
        if (politicsOf(rival).grievance > 0.3) {
          for (const c of circles) {
            if (c.memberIds.includes(rival.id) && (c.leaderId === v.id || c.leaderId === rival.id)) {
              mult *= 1.3
              break
            }
          }
        }
      }
    }
  }
  if (kind === 'defend' || kind === 'fight') {
    if (norms.includes('protect_all') || circles.some((c) => c.kind === 'threat')) mult *= 1.55
    if (pol.creed === 'protection') mult *= 1.3
    if (institutions.some((c) => c.kind === 'threat' || c.norms.includes('protect_all'))) mult *= 1.35
    if (v.profession === 'guard') mult *= 1.25
    if (vgCoh > 0.5) mult *= 1.15 + vgCoh * 0.35
    if (role === 'child') mult *= 0.25
    if (role === 'elder') mult *= 0.75
  }
  if (kind === 'buildWall' || kind === 'buildProject' || kind === 'buildBridge' || kind === 'buildMill' || kind === 'buildPort') {
    if (norms.includes('protect_all') || circles.some((c) => c.kind === 'threat')) mult *= 1.55
    if (norms.includes('maintain_commons')) mult *= 1.45 + enforcement * 0.35
    if (institutions.some((c) => c.kind === 'threat' || c.norms.includes('protect_all') || c.norms.includes('maintain_commons'))) {
      mult *= 1.35
    }
    if (v.profession === 'guard' || v.profession === 'builder' || v.profession === 'mason') mult *= 1.2
    if (role === 'adult') mult *= 1.05
    if (role === 'child') mult *= 0.4
    // EU development: richer infra ambition when development high + labor available.
    const vg = villageOf(state, v.villageId)
    if (vg && (vg.development ?? 0) > 5) mult *= 1.15 + Math.min(0.35, (vg.development ?? 0) * 0.02)
    if (vg && (vg.laborBalance ?? 0) > 1.5) mult *= 0.85 // shortage: less spare labor for vanity builds
    if (vg && (vg.laborBalance ?? 0) < -1) mult *= 1.12 // idle hands → public works soft
  }
  if (kind === 'tradeRun' || kind === 'mintCoins' || kind === 'mineGold' || kind === 'buildPort' || kind === 'buildCart' || kind === 'buildProject') {
    if (norms.includes('favor_traders') || circles.some((c) => c.kind === 'trade')) mult *= 1.45
    if (pol.creed === 'commerce_libre') mult *= 1.25
    if (institutions.some((c) => c.kind === 'trade')) mult *= 1.3
    const vgTrade = villageOf(state, v.villageId)
    if (vgTrade && (vgTrade.development ?? 0) > 6) mult *= 1.12
  }
  if (kind === 'buildMill' || kind === 'grindFlour' || kind === 'bakeBread') {
    if (institutions.some((c) => c.kind === 'hunger' || c.norms.includes('share_famine'))) mult *= 1.4
  }
  if (kind === 'socialise') {
    mult *= 1 + pol.beliefs.loyalty * 0.15
    if (v.ambition === 'leader' || circles.some((c) => c.leaderId === v.id)) mult *= 1.2
    if (role === 'elder') mult *= 1.25
    if (targetId !== null && norms.includes('punish_theft') && isKnownThief(state, v, targetId)) mult *= 0.35
    if (targetId !== null && isSociallyExcluded(state, v, targetId)) mult *= 0.25
    // Ritual / gathering near high-piety or faith circles.
    if (circles.some((c) => c.kind === 'faith' || c.kind === 'village')) mult *= 1.1 + pol.beliefs.piety * 0.15
  }
  if (kind === 'entertain') {
    mult *= 1.1 + pol.beliefs.loyalty * 0.1
    if (circles.some((c) => c.kind === 'village' || c.kind === 'faith')) mult *= 1.15
  }
  if (kind === 'counsel') {
    mult *= 1 + pol.beliefs.piety * 0.35
    if (circles.some((c) => c.kind === 'faith')) mult *= 1.35
  }
  if (kind === 'teachCraft') {
    if (circles.some((c) => c.isGuild || c.norms.includes('teach_apprentice'))) mult *= 1.45
  }
  if (kind === 'makeCharcoal' && circles.some((c) => c.isGuild || c.kind === 'craft')) mult *= 1.2
  if (kind === 'idle' && pol.migrationUrge > 0.45) {
    mult *= 1.6 + pol.migrationUrge
  }
  if (kind === 'idle') {
    const vgLabor = villageOf(state, v.villageId)
    if (vgLabor && (vgLabor.laborBalance ?? 0) < -1.5 && v.profession === 'none') mult *= 1.4
  }
  if (kind === 'buildHouse' && pol.migrationUrge > 0.55 && v.villageId === null) {
    mult *= 1.5 + pol.migrationUrge
  }
  // Low cohesion → youth / discontent migrate.
  if ((kind === 'idle' || kind === 'buildHouse') && vgCoh < 0.28 && role !== 'elder') {
    mult *= 1.25 + pol.migrationUrge
  }
  return mult
}

function isKnownThief(state: SimState, v: Villager, aboutId: number): boolean {
  return state.rumors.some(
    (r) => r.kind === 'theft' && r.aboutId === aboutId && r.knownBy.includes(v.id) && r.intensity > 0.3,
  )
}

function isSociallyExcluded(state: SimState, v: Villager, aboutId: number): boolean {
  return state.rumors.some(
    (r) =>
      (r.kind === 'exclusion' || r.kind === 'shirk' || r.kind === 'unreliable') &&
      r.aboutId === aboutId &&
      r.knownBy.includes(v.id) &&
      r.intensity > 0.35,
  )
}

/** Profession lock-in: craft circles + surplus + village size deepen specialization (Durkheim/Smith soft). */
export function professionLockInBonus(state: SimState, v: Villager, current: Profession, candidate: Profession): number {
  if (current === 'none' || current === candidate) return 0
  const vg = villageOf(state, v.villageId)
  const pop = vg?.memberIds.length ?? 1
  const surplusFood = (vg?.surplus?.food ?? 0) + (vg?.surplus?.bread ?? 0) + (vg?.surplus?.wheat ?? 0)
  const specialization = clamp01((pop - 4) / 16 + surplusFood * 0.08)
  const craftCircle = circlesOf(state, v).some((c) => c.kind === 'craft' || c.kind === 'trade' || c.kind === 'threat' || c.isGuild)
  const pol = politicsOf(v)
  let stick = specialization * 0.45 + (craftCircle ? 0.2 : 0) + pol.beliefs.tradition * 0.18
  if (lifeRoleOf(v) === 'elder') stick += 0.12
  if (lifeRoleOf(v) === 'child') stick -= 0.22
  // Livelihood drift: if practice no longer matches current label, easier to leave.
  try {
    const live = ensureLivelihood(mindOf(v))
    const tag = live.roleTag ?? ''
    if (!tag.startsWith('legacy_') && live.titleFr) {
      // Soft mismatch when emergent title diverges from soft profession hint.
      if (live.roleTag && !live.roleTag.includes(current) && !tag.startsWith('legacy_')) {
        stick -= 0.18 + v.personality.curiosity * 0.15
      }
    }
    if (live.unemployedStreak > 50) stick -= 0.25
  } catch {
    /* mind not ready */
  }
  // Sterile climate: do not lock farmers into endless tundra ploughing.
  if (current === 'farmer' || current === 'miller') {
    const t = sampleTempC(state.climate, v.x, v.y)
    if (cropTempFactor(t) < 0.28) stick -= 0.35
  }
  return stick
}

/** Soft commerce pressure + institution price levers. */
export function politicalPriceBias(state: SimState, villageId: number): number {
  let bias = 1
  for (const c of state.circles) {
    if (c.villageId !== villageId) continue
    if (c.norms.includes('favor_traders')) bias *= 0.88
    if (c.isInstitution && c.kind === 'trade') bias *= 0.9
    if (c.kind === 'hunger' && state.famine) bias *= 1.14
    if (c.isInstitution && (c.kind === 'hunger' || c.norms.includes('share_famine')) && state.famine) bias *= 1.12
  }
  return bias
}

/** Refuse trade with a destination when norms / grudges say so. */
export function refuseTradeWith(state: SimState, trader: Villager, destVillageId: number): boolean {
  const norms = activeNormsFor(state, trader)
  if (!norms.includes('punish_theft') && politicsOf(trader).creed !== 'ordre') return false
  for (const o of state.villagers) {
    if (!o.alive || o.villageId !== destVillageId) continue
    if (isKnownThief(state, trader, o.id)) return true
    const rel = trader.relations.get(o.id)
    if (rel && rel.grudge > 0.55) return true
  }
  return false
}

/** Deal quality modifier from debts / grudges toward destination members. */
export function tradeRelationModifier(trader: Villager, destVillageId: number, state: SimState): number {
  let mod = 1
  let samples = 0
  for (const o of state.villagers) {
    if (!o.alive || o.villageId !== destVillageId) continue
    const rel = trader.relations.get(o.id)
    if (!rel) continue
    samples++
    if (rel.debt > 0.8) mod *= 1.08
    if (rel.grudge > 0.4) mod *= 0.82
    if (rel.affinity > 0.45) mod *= 1.06
    if (samples >= 4) break
  }
  return mod
}

export function onPoliticalTheft(state: SimState, thief: Villager, victim: Villager) {
  spawnRumor(state, 'theft', thief, victim, 0.85, `${thief.name} aurait volé ${victim.name}`)
  politicsOf(victim).grievance = clamp01(politicsOf(victim).grievance + 0.08)
  const thiefPol = politicsOf(thief)
  // Shame / stress proxy when norms internalized (even if unseen).
  thiefPol.grievance = clamp01(thiefPol.grievance + thiefPol.normInternalization * 0.04)
  thiefPol.reliability = clamp01(thiefPol.reliability - 0.08)
  thiefPol.normInternalization = clamp01(thiefPol.normInternalization - 0.03)
  for (const c of circlesOf(state, victim)) {
    c.problemCount += 1
    c.lastActiveTick = state.tick
    c.cohesion = clamp01(c.cohesion - 0.03)
    if (c.kind === 'elder' || c.kind === 'village' || c.isInstitution) {
      rememberCircle(c, `vol : ${thief.name}`)
      c.legitimacy = clamp01(c.legitimacy - 0.04)
      // Institutions enforce: boost enforcement and exclusion rumor.
      if (c.isInstitution && c.norms.includes('punish_theft')) {
        c.enforcement = clamp01(c.enforcement + 0.06)
        spawnRumor(state, 'exclusion', victim, thief, 0.55, `${thief.name} est tenu à l'écart après un vol`)
        logCause(state, `${c.name} applique la norme`, `exclusion soft de ${thief.name}`)
      }
    }
  }
  const debt = relationWith(victim, thief.id)
  debt.debt = Math.min(3, debt.debt + 1)
  debt.grudge = Math.min(1, debt.grudge + 0.35)
}

export function onPoliticalGenerosity(state: SimState, giver: Villager, receiver: Villager) {
  spawnRumor(state, 'generosity', giver, receiver, 0.45, `${giver.name} a nourri ${receiver.name}`)
  politicsOf(giver).legitimacy = clamp01(politicsOf(giver).legitimacy + 0.03)
  politicsOf(giver).reliability = clamp01(politicsOf(giver).reliability + 0.02)
  for (const c of circlesOf(state, giver)) {
    if (c.norms.includes('share_famine') || c.kind === 'hunger' || c.norms.includes('reciprocate')) {
      c.legitimacy = clamp01(c.legitimacy + 0.04)
      c.problemCount += 1
      c.lastActiveTick = state.tick
      c.cohesion = clamp01(c.cohesion + 0.02)
    }
  }
  // Gift → obligation: receiver owes giver (Mauss).
  const owe = relationWith(receiver, giver.id)
  owe.debt = Math.min(3, owe.debt + 0.55)
  // If receiver was repaying an existing debt to giver, clear some of giver's claim.
  const reverse = relationWith(giver, receiver.id)
  if (reverse.debt > 0.2) {
    const paid = Math.min(reverse.debt, 0.65)
    reverse.debt = Math.max(0, reverse.debt - paid)
    politicsOf(receiver).reliability = clamp01(politicsOf(receiver).reliability + 0.06)
    if (paid > 0.4) logCause(state, `dette de ${receiver.name}`, `${receiver.name} rend une faveur à ${giver.name}`)
  }
}

export function onPoliticalWolfAttack(state: SimState, near: Villager) {
  spawnRumor(state, 'wolf', near, null, 0.7, `attaque de loup près de ${near.name}`)
  const vg = villageOf(state, near.villageId)
  if (vg) {
    vg.cohesion = clamp01(vg.cohesion + COHESION_THREAT_GAIN)
    vg.peaceTicks = 0
  }
  for (const c of state.circles) {
    if (c.villageId !== near.villageId) continue
    if (c.kind === 'threat' || c.norms.includes('protect_all')) {
      c.problemCount += 1
      c.lastActiveTick = state.tick
      c.cohesion = clamp01(c.cohesion + 0.05)
      rememberCircle(c, 'attaque de loup')
    }
  }
}

export function onPoliticalFamine(state: SimState) {
  const witness = state.villagers.find((v) => v.alive)
  if (witness) spawnRumor(state, 'famine', witness, null, 0.9, 'la famine ronge le pays')
  for (const c of state.circles) {
    if (c.kind === 'hunger' || c.kind === 'village') {
      c.problemCount += 1
      adoptNorms(state, c)
    }
  }
  for (const vg of state.villages) {
    vg.cohesion = clamp01(vg.cohesion + 0.02)
  }
}

export function onPoliticalTradeWindfall(state: SimState, trader: Villager) {
  spawnRumor(state, 'windfall', trader, null, 0.5, `${trader.name} revient chargé de marchandises`)
  politicsOf(trader).legitimacy = clamp01(politicsOf(trader).legitimacy + 0.04)
  for (const c of circlesOf(state, trader)) {
    if (c.kind === 'trade') {
      c.legitimacy = clamp01(c.legitimacy + 0.05)
      c.problemCount += 1
      c.lastActiveTick = state.tick
    }
  }
}

/** Pooled sharing: soft quota + occasional redistribution toward hungry members. */
function tickPooledResources(state: SimState, c: Circle) {
  if (!c.norms.includes('share_famine') && c.kind !== 'hunger') return
  const members = livingMembers(state, c)
  let pool = 0
  for (const m of members) pool += Math.max(0, edibleValue(m.inventory) - 2)
  // Soft quota: institutions keep a larger collective reserve signal.
  const quota = c.isInstitution ? 0.18 : 0.12
  c.pooledFood = pool * quota

  if (c.pooledFood < 0.8 || members.length < 2) return
  if (state.tick % (CIRCLE_TICK * 2) !== 0) return

  const hungry = members.filter((m) => m.hunger < 1.2 || edibleValue(m.inventory) < 1)
  const donors = members.filter((m) => edibleValue(m.inventory) > 3)
  if (hungry.length === 0 || donors.length === 0) return

  // Collective pressure: one unit of food from a surplus member (prefer bread/food).
  const donor = donors[state.tick % donors.length]
  const receiver = hungry[state.tick % hungry.length]
  if (donor.id === receiver.id) return
  const kinds = ['bread', 'food', 'wheat'] as const
  for (const res of kinds) {
    if (countOf(donor.inventory, res) <= 1) continue
    if (removeFromInventory(donor.inventory, res, 1) < 1) continue
    addToInventory(receiver.inventory, res, 1)
    c.pooledFood = Math.max(0, c.pooledFood - 0.4)
    c.lastActiveTick = state.tick
    rememberCircle(c, `partage ${donor.name} → ${receiver.name}`)
    if (c.isInstitution) logCause(state, c.name, `${donor.name} cède une ration à ${receiver.name}`)
    break
  }
}

// ── Migration: leave, rejoin elsewhere, or found a new settlement urge ───────

function tickMigration(state: SimState, v: Villager) {
  const pol = politicsOf(v)

  // Homeless wanderer with high urge: try rejoin a nearby village.
  if (v.villageId === null && pol.migrationUrge > 0.35) {
    let best: { id: number; score: number } | null = null
    for (const vg of state.villages) {
      if (vg.memberIds.length === 0) continue
      const d = distance(v.x, v.y, vg.centerX, vg.centerY)
      if (d > 90) continue
      let affinity = 0
      let n = 0
      for (const mid of vg.memberIds) {
        const rel = v.relations.get(mid)
        if (rel) {
          affinity += rel.affinity + rel.trust
          n++
        }
        if (n >= 4) break
      }
      const attract = vg.attractiveness > 0 ? vg.attractiveness : villageAttractiveness(state, vg)
      // Primate / rank-size soft pull: richer, better-connected, higher-SoL places attract more migrants.
      // Worker shortages (laborBalance > 0) pull job-seekers (Vic3 migration soft).
      const solPull = (vg.standardOfLiving ?? 0.35) * 0.55
      const laborPull = Math.max(0, vg.laborBalance ?? 0) * 0.08
      const devPull = Math.min(0.35, (vg.development ?? 1) * 0.03)
      const prosperPull = (vg.prosperity ?? 35) * 0.004 + (vg.loyalty ?? 0.5) * 0.12
      const score =
        (n > 0 ? affinity / n : 0) +
        (90 - d) * 0.008 +
        pol.beliefs.loyalty * 0.15 +
        attract * 0.012 +
        (vg.isRegionalHub ? 0.25 : 0) +
        Math.log1p(vg.memberIds.length) * 0.08 +
        solPull +
        laborPull +
        devPull +
        prosperPull
      if (!best || score > best.score) best = { id: vg.id, score }
    }
    if (best && best.score > 0.35) {
      const vg = state.villages.find((x) => x.id === best!.id)
      if (vg && !vg.memberIds.includes(v.id)) {
        vg.memberIds.push(v.id)
        v.villageId = vg.id
        pol.migrationUrge = clamp01(pol.migrationUrge * 0.4)
        onEthnosMigrateIn(state, v, vg.id)
        logCause(state, `errance de ${v.name}`, `${v.name} rejoint le village n°${vg.id}`)
      }
    }
    return
  }

  if (pol.migrationUrge < 0.7 || v.villageId === null) return
  if (v.personality.curiosity < 0.4 && pol.beliefs.loyalty > 0.55) return
  const village = state.villages.find((vg) => vg.id === v.villageId)
  if (!village) return
  village.memberIds = village.memberIds.filter((id) => id !== v.id)
  v.villageId = null
  pol.migrationUrge = 0.55
  onEthnosMigrateOut(state, v)
  logCause(state, `misère, chômage ou oppression ressentie par ${v.name}`, `${v.name} quitte son village`)
}

/** Institutions bias civic works and leave a chronicle trail. */
function tickInstitutionEffects(state: SimState, c: Circle) {
  if (!c.isInstitution) return
  const members = livingMembers(state, c)
  if (members.length === 0) return
  c.lastActiveTick = state.tick

  if (c.kind === 'threat' || c.norms.includes('protect_all')) {
    // Soft guard quota: nudge a member toward guard profession pressure via memory.
    rememberCircle(c, 'veille sur les foyers')
    for (const m of members) {
      if (m.profession === 'guard' || m.ambition === 'protector') {
        politicsOf(m).legitimacy = clamp01(politicsOf(m).legitimacy + 0.01)
      }
    }
  }
  if (c.kind === 'trade' || c.norms.includes('favor_traders')) {
    rememberCircle(c, 'favorise les routes')
  }
  if (c.kind === 'hunger' || c.norms.includes('share_famine')) {
    rememberCircle(c, 'organise le partage')
  }

  // Soft civic sponsorship — soft intents, not building-type scripts.
  if (state.tick % 180 === c.id % 17) {
    const leader =
      (c.leaderId !== null ? members.find((m) => m.id === c.leaderId) : null) ?? members[0]
    const village = state.villages.find((g) => g.id === (c.villageId ?? leader.villageId))
    let reasons: string[] | null = null
    let purposes: StructurePurpose[] | undefined
    let wood: number | undefined
    let stone: number | undefined
    if ((c.kind === 'threat' || c.norms.includes('protect_all')) && village && village.wallTier !== 'stone') {
      reasons = [`institution ${c.name} (gardes)`, 'fortification']
      purposes = ['fortify']
      wood = village.wallTier === 'none' ? 0.65 : 0.3
      stone = village.wallTier === 'wood' ? 0.8 : 0.45
    } else if ((c.kind === 'trade' || c.norms.includes('favor_traders')) && village && village.memberIds.length >= 5) {
      reasons = [`institution ${c.name} (marchands)`, 'halle']
      purposes = ['gather']
      wood = 0.55
      stone = 0.55
    } else if (c.kind === 'hunger' || c.norms.includes('share_famine')) {
      reasons = [`institution ${c.name} (partage)`, 'grenier']
      purposes = ['store']
      wood = 0.75
    } else if (c.kind === 'elder' && village && village.memberIds.length >= 6) {
      reasons = [`institution ${c.name} (anciens)`, 'halle']
      purposes = ['gather']
      wood = 0.5
      stone = 0.55
    }
    if (reasons) {
      const intent = intentFromReasons(reasons, {
        purposes,
        scale: 0.55 + c.legitimacy * 0.25,
        wood,
        stone,
      })
      const nearX = village?.centerX ?? leader.x
      const nearY = village?.centerY ?? leader.y
      const project = enqueueBuildProject(state, intent, {
        ownerId: null,
        villageId: leader.villageId,
        nearX,
        nearY,
        laborHint: 1 + c.legitimacy,
        sponsorCircleId: c.id,
      })
      if (project) {
        rememberCircle(c, `parraine ${project.label}`)
        for (const m of members.slice(0, 4)) {
          if (m.activeProjectId === null) m.activeProjectId = project.id
        }
      }
    }
  }

  if (state.tick % (CIRCLE_TICK * 4) === 0 && c.legitimacy > 0.55) {
    logCause(state, `institution ${c.name}`, c.memory[c.memory.length - 1] ?? 'persiste')
  }
}

/** Asabiya / cohesion + inequality stress per village (Seshat/Turchin soft mechanisms). */
function tickVillageCohesion(state: SimState) {
  for (const vg of state.villages) {
    if (vg.cohesion === undefined) vg.cohesion = 0.4
    if (vg.peaceTicks === undefined) vg.peaceTicks = 0
    if (vg.inequalityStress === undefined) vg.inequalityStress = 0
    if (vg.lastRitualTick === undefined) vg.lastRitualTick = 0

    const members = villageMembers(state, vg.id)
    if (members.length === 0) continue

    let wolvesNear = 0
    for (const w of state.wolves) {
      if (w.alive && distance(w.x, w.y, vg.centerX, vg.centerY) < 42) wolvesNear++
    }
    const externalFeud = members.some((m) => {
      if (m.grudgeTarget === null) return false
      const t = state.villagers.find((o) => o.id === m.grudgeTarget && o.alive)
      return t !== undefined && t.villageId !== vg.id
    })
    const threatened = wolvesNear > 0 || externalFeud || state.famine

    vg.inequalityStress = clamp01(vg.inequalityStress * 0.85 + villageInequality(state, vg.id) * 0.15)

    if (threatened) {
      vg.peaceTicks = 0
      vg.cohesion = clamp01(vg.cohesion + COHESION_THREAT_GAIN + (wolvesNear > 1 ? 0.02 : 0))
    } else {
      vg.peaceTicks += 1
      // Long peace + prosperity/inequality → asabiya decay.
      const peaceFactor = Math.min(1, vg.peaceTicks / 12)
      vg.cohesion = clamp01(
        vg.cohesion - COHESION_DECAY_PEACE * peaceFactor - vg.inequalityStress * 0.025 + (state.famine ? 0 : -0.004),
      )
    }

    // Sync circle cohesion toward village + member loyalty.
    let loyalty = 0
    for (const m of members) loyalty += politicsOf(m).beliefs.loyalty
    loyalty /= members.length
    for (const c of state.circles) {
      if (c.villageId !== vg.id) continue
      if (c.cohesion === undefined) c.cohesion = 0.4
      if (c.enforcement === undefined) c.enforcement = 0.15
      if (!c.authorityBasis) c.authorityBasis = 'tradition'
      const pull = threatened ? 0.08 : -0.02 * (vg.peaceTicks > 8 ? 1 : 0.3)
      c.cohesion = clamp01(c.cohesion * 0.9 + vg.cohesion * 0.1 + pull + loyalty * 0.02)
      // Low cohesion → soft fragmentation (drop peripheral members).
      if (c.cohesion < 0.18 && c.memberIds.length > 3 && !c.isInstitution) {
        const drop = c.memberIds[c.memberIds.length - 1]
        c.memberIds.pop()
        rememberCircle(c, `fragmentation — départ #${drop}`)
        if ((state.tick + c.id) % 400 < CIRCLE_TICK) {
          logCause(state, `cohésion faible du ${c.name}`, 'le cercle se fragmente')
        }
      }
    }

    if (vg.inequalityStress > 0.55 && (state.tick + vg.id * 9) % 360 < CIRCLE_TICK) {
      logCause(state, `écarts de fortune au village n°${vg.id}`, 'tensions et rivalités de cercle')
    }
  }
}

/** Ostrom-lite: commons monitoring, free-rider grievance, wall/pool maintenance pressure. */
function tickCommonsAction(state: SimState, c: Circle) {
  if (!c.norms.includes('maintain_commons') && !c.norms.includes('share_famine') && c.kind !== 'village') return
  const members = livingMembers(state, c)
  if (members.length < 2) return
  const vg = villageOf(state, c.villageId)
  const monitor = c.enforcement * (c.isInstitution ? 1.2 : 0.8)

  // Free-rider: high greed + low contribution signal (no wall/build/share memory).
  for (const m of members) {
    const pol = politicsOf(m)
    const contributed =
      m.memories.some((mem) => (mem.kind === 'helped' || mem.kind === 'saved') && state.tick - mem.tick < 300) ||
      m.profession === 'guard' ||
      m.profession === 'builder' ||
      (m.task?.kind === 'buildWall' || m.task?.kind === 'buildProject' || m.task?.kind === 'giveFood')
    if (!contributed && pol.beliefs.greed > 0.55 && pol.beliefs.fairness < 0.45 && monitor > 0.25) {
      if ((state.tick + m.id) % 200 !== 0) continue
      for (const peer of members) {
        if (peer.id === m.id) continue
        politicsOf(peer).grievance = clamp01(politicsOf(peer).grievance + 0.02 * monitor)
      }
      spawnRumor(state, 'shirk', members[0], m, 0.45 * monitor, `${m.name} profiterait du commun sans contribuer`)
      c.problemCount += 1
      if (c.isInstitution) {
        c.enforcement = clamp01(c.enforcement + 0.03)
        pol.reliability = clamp01(pol.reliability - 0.05)
        logCause(state, `surveillance du ${c.name}`, `grief contre le passager clandestin ${m.name}`)
      }
      break
    }
  }

  // Soft repair urge chronicle when walls damaged / missing under maintain_commons.
  if (vg && c.norms.includes('maintain_commons') && vg.wallTier === 'none' && members.length >= 4 && c.isInstitution) {
    if ((state.tick + c.id) % 500 < CIRCLE_TICK) {
      rememberCircle(c, 'appelle à fortifier le commun')
      logCause(state, `norme « ${NORM_FR.maintain_commons} »`, `${c.name} pousse à entretenir remparts et chemins`)
    }
  }
}

/** Ritual / gathering: faith & village circles reinforce belonging near plaza. */
function tickRitualGathering(state: SimState, c: Circle) {
  if (c.kind !== 'faith' && c.kind !== 'village' && c.kind !== 'kin') return
  const members = livingMembers(state, c)
  if (members.length < 3) return
  const vg = villageOf(state, c.villageId)
  if (!vg) return
  if (state.tick - vg.lastRitualTick < 220) return
  // Members clustered near centre → ritual.
  let near = 0
  for (const m of members) {
    if (distance(m.x, m.y, vg.centerX, vg.centerY) < 16) near++
  }
  if (near < 3) return
  if (c.values.piety < 0.4 && c.kind === 'faith') return
  vg.lastRitualTick = state.tick
  vg.cohesion = clamp01(vg.cohesion + 0.035)
  c.cohesion = clamp01(c.cohesion + 0.05)
  for (const m of members) {
    if (distance(m.x, m.y, vg.centerX, vg.centerY) >= 16) continue
    const pol = politicsOf(m)
    pol.beliefs.loyalty = clamp01(pol.beliefs.loyalty + 0.015)
    pol.beliefs.piety = clamp01(pol.beliefs.piety + 0.01)
    pol.normInternalization = clamp01(pol.normInternalization + 0.012)
    pol.grievance = clamp01(pol.grievance - 0.02)
  }
  rememberCircle(c, 'rassemblement commun')
  logCause(state, `rassemblement du ${c.name}`, `le sentiment d'appartenance se renforce`)
}

/**
 * Metaethnic frontier soft: contact between villages / culture clusters
 * yields craft innovation OR conflict depending on cohesion (no preset ethnicities).
 */
function tickContactZones(state: SimState) {
  if (state.villages.length < 2) return
  for (let i = 0; i < state.villages.length; i++) {
    const a = state.villages[i]
    for (let j = i + 1; j < state.villages.length; j++) {
      const b = state.villages[j]
      const d = distance(a.centerX, a.centerY, b.centerX, b.centerY)
      if (d > 55 || d < 18) continue
      const meanCoh = (a.cohesion + b.cohesion) * 0.5
      if ((state.tick + a.id * 11 + b.id) % 480 >= CIRCLE_TICK) continue
      if (meanCoh > 0.55) {
        // Conflict-prone frontier when both cohesive vs outgroup.
        a.peaceTicks = 0
        b.peaceTicks = 0
        logCause(
          state,
          `frontière de contact villages n°${a.id}/n°${b.id}`,
          'rivalité de garde et méfiance accrue',
        )
        for (const v of villageMembers(state, a.id).slice(0, 3)) {
          politicsOf(v).grievance = clamp01(politicsOf(v).grievance + 0.04)
        }
        for (const v of villageMembers(state, b.id).slice(0, 3)) {
          politicsOf(v).grievance = clamp01(politicsOf(v).grievance + 0.04)
        }
      } else {
        // Low cohesion contact → borrowing / craft curiosity (innovation soft).
        for (const v of [...villageMembers(state, a.id), ...villageMembers(state, b.id)].slice(0, 4)) {
          if (v.personality.curiosity > 0.45) {
            politicsOf(v).beliefs.tradition = clamp01(politicsOf(v).beliefs.tradition - 0.02)
            politicsOf(v).grievance = clamp01(politicsOf(v).grievance - 0.01)
          }
        }
        if ((state.tick + a.id) % 900 < CIRCLE_TICK) {
          logCause(
            state,
            `zone de contact villages n°${a.id}/n°${b.id}`,
            'échanges et emprunts de pratiques',
          )
        }
      }
    }
  }
}

// ── Main tick ────────────────────────────────────────────────────────────────

export function tickPolitics(state: SimState) {
  if (state.tick % BELIEF_TICK === 0) {
    for (const v of state.villagers) {
      if (!v.alive) continue
      if ((state.tick + v.id * 13) % BELIEF_TICK !== 0) continue
      tickIndividualPolitics(state, v)
      tickMigration(state, v)
    }
  }

  if (state.tick % RUMOR_TICK === 0) tickRumors(state)

  if (state.tick % CIRCLE_TICK !== 0) return

  pruneCircles(state)
  trySpawnCircles(state)
  tickVillageCohesion(state)
  tickContactZones(state)

  // Under low TPS: stagger soft circle work (rituals/commons) without dropping institutions.
  const stagger = getSimPerfBudget().politicsStagger

  for (const c of state.circles) {
    if (c.cohesion === undefined) c.cohesion = 0.4
    if (c.enforcement === undefined) c.enforcement = c.isInstitution ? 0.4 : 0.15
    if (!c.authorityBasis) c.authorityBasis = 'tradition'
    if (c.isGuild === undefined) c.isGuild = false
    if (c.qualityBar === undefined) c.qualityBar = 0.3
    refreshLeader(state, c)
    refreshValues(state, c)
    updateLegitimacy(state, c)
    adoptNorms(state, c)
    // Quiet persistence counts as a solved problem toward institutionalization.
    if (!c.isInstitution && state.tick - c.formedTick > INSTITUTION_AGE / 3) {
      c.problemCount = Math.min(c.problemCount + 1, INSTITUTION_PROBLEMS + 2)
    }
    // Acute raids / theft waves accelerate problem count for enforcement pipeline.
    if (state.thefts > 0 && state.tick % 200 < CIRCLE_TICK && (c.kind === 'elder' || c.kind === 'village')) {
      c.problemCount = Math.min(c.problemCount + 1, INSTITUTION_PROBLEMS + 4)
    }
    maybeInstitutionalize(state, c)
    tickGuildLife(state, c)
    maybeRecruit(state, c)
    const skipSoft = stagger && !c.isInstitution && ((c.id + state.tick) & 1) === 1
    if (!skipSoft) {
      tickPooledResources(state, c)
      tickCommonsAction(state, c)
      tickRitualGathering(state, c)
    }
    tickInstitutionEffects(state, c)
  }
}

// ── UI helpers ───────────────────────────────────────────────────────────────

export function politicsSummary(state: SimState): {
  circles: number
  institutions: number
  rumors: number
  leadingName: string | null
  leadingLegitimacy: number
} {
  let leadingName: string | null = null
  let leadingLegitimacy = 0
  let institutions = 0
  for (const c of state.circles) {
    if (c.isInstitution) institutions++
    if (c.legitimacy > leadingLegitimacy && c.leaderId !== null) {
      leadingLegitimacy = c.legitimacy
      const leader = state.villagers.find((v) => v.id === c.leaderId)
      leadingName = leader ? `${leader.name} (${c.name})` : c.name
    }
  }
  return {
    circles: state.circles.length,
    institutions,
    rumors: state.rumors.length,
    leadingName,
    leadingLegitimacy,
  }
}

export { CREED_FR, NORM_FR, KIND_FR }
