/**
 * Emergent social / political / historical substrate (v1).
 *
 * Mechanisms only — no preset factions, religions, monarchies or scripted wars.
 * Pipeline: individuals → relations → circles → institutions → polities (village →
 * chiefdom → kingdom) → territory claims / rivalries → pressures → chronicle.
 *
 * Wars: rivalry/scarcity/raids escalate via war.ts (skirmish -> open -> consequences).
 * Still deferred: full army pathfinding, espionage, propaganda media, elections UI, polygon borders.
 */

import { addToInventory, countOf, edibleValue, removeFromInventory } from './inventory'
import { TICKS_PER_DAY } from './calendar'
import { equipmentEffectsOf, gearPrestige01 } from './equipment'
import { cropTempFactor, sampleBiome, sampleTempC } from './climate'
import { biomeSettlementScore } from './biomes'
import { villageAttractiveness, villagerSoL } from './commerce'
import { feelFamine, localFoodSupply, villageCarryingPressure, villageInFamine, villagerFeelsFamine } from './ecology'
import { onEthnosMigrateIn, onEthnosMigrateOut } from './ethnos'
import { getSimPerfBudget } from './perfBudget'
import { adjustRelation, logEvent, relationWith, remember } from './social'
import { knowledgeCount } from './technology'
import { primarySkillsForProfession } from './cognition/labor'
import { forEachLifeEvent, hasLifeEventKind } from './cognition/memory'
import { mindOf, peekMind } from './cognition/mindPool'
import { ensureLivelihood, GUILD_MIN_PRACTITIONERS, noteRecognition } from './livelihood'
import type { Personality, Profession, SimState, TaskKind, Village, Villager } from './types'
import { distance, makeRng } from './world'
import {
  enqueueBuildProject,
  fortifyIsBuilt,
  foundMigrateCamp,
  intentFromReasons,
  type StructurePurpose,
} from './construction'
import { tickReligionWorld } from './religion'
import { noteInformalLend } from './emergence/atlasLifeSystems'
import { CHILD_AGE as AGES_CHILD, ELDER_AGE as AGES_ELDER } from './ages'
import {
  noteCircleDissolved,
  noteCircleDrop,
  noteCircleFormed,
  noteCircleJoin,
  noteConflict,
  noteCreedBehaviorFollowup,
  noteCreedChange,
  noteCreedChildBehaviorInfluenced,
  noteCreedParentChildTransmission,
  noteInstitutionFormed,
} from './societyMetrics'
import { tickPolityWars, tryRecordCoup, warsSummary } from './war'
import {
  noteMigrateBlocked,
  noteMigrateDestEval,
  noteMigrateFound,
  noteMigrateLeave,
  noteMigrateLeaveAttempt,
  noteMigrateRejoin,
  noteMigrateSettleBlocked,
  noteMigrateSettlementAttempt,
  noteMigrateTravelStart,
  noteMigrateUrgeSample,
  topMigrateStageReason,
  type MigrateLeaveCause,
  type MigrateStageReason,
} from './migrationMetrics'

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

/** Soft polity scale — crystallises from village institutions, never preset kingdoms. */
export type PolityTier = 'camp' | 'village' | 'chiefdom' | 'kingdom'

export interface Polity {
  id: number
  name: string
  tier: PolityTier
  /** Settlements under this polity's claim (capital first). */
  villageIds: number[]
  capitalVillageId: number
  rulerId: number | null
  legitimacy: number
  /** Soft territorial reach in world units (grows with tier / institutions). */
  claimRadius: number
  /** Contested strength 0–1 (rises with enforcement & prosperity). */
  claimStrength: number
  rivalPolityIds: number[]
  formedTick: number
  lastRulerChangeTick: number
  lastTierChangeTick: number
  authorityBasis: AuthorityBasis
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
  | 'territory'
  | 'rivalry'

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
  /** WP10: tick of last creed assign/change (−1 = never). */
  lastCreedChangeTick: number
  /** WP10: followup already attributed for current creed change. */
  creedFollowupDone: boolean
  /**
   * DP11: current creed matches ≥1 living parent/ancestor at acquisition
   * (natural spread/crystallize/shrine — never forced at birth).
   */
  creedFromParent: boolean
  /** Living-ancestor match depth when creedFromParent was set (0 = none). */
  creedLineageDepth: number
}

// ── Soft caches (keep Villager lean; same pattern as emergent minds) ─────────

const POLITICS = new Map<number, PoliticalState>()
const POWER_CACHE = new Map<number, { tick: number; scores: PowerScores; total: number }>()

export const CIRCLE_TICK = 90
export const BELIEF_TICK = 48
export const RUMOR_TICK = 30
/**
 * Persistence before a circle hardens into an institution.
 * Softened — craft/trade circles harden mid-soak (guild soak target).
 */
export const INSTITUTION_AGE = 200
export const INSTITUTION_PROBLEMS = 1
/** Soft early guild size (full craft identity can wait for apprentices). */
const GUILD_EARLY_PRACTITIONERS = 1
export const MAX_CIRCLES = 48
export const MAX_RUMORS = 40
export const MAX_CIRCLE_MEMBERS = 12
export const MAX_CIRCLE_MEMORY = 5
/** Polity / claim / succession cadence (aligned with circle work). */
export const POLITY_TICK = CIRCLE_TICK * 2
export const MAX_POLITIES = 24

const KIND_FR: Record<CircleKind, string> = {
  kin: 'cercle de parenté',
  craft: 'cercle de métier',
  village: 'assemblée du village',
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

const TIER_FR: Record<PolityTier, string> = {
  camp: 'campement',
  village: 'village',
  chiefdom: 'chefferie',
  kingdom: 'royaume',
}

const TIER_TITLE_FR: Record<PolityTier, string> = {
  camp: 'guide',
  village: 'doyen',
  /** Chief of a chefferie. */
  chiefdom: 'chef',
  /** Lord of a realm (chief → seigneur when a royaume crystallises). */
  kingdom: 'seigneur',
}

const TIER_RANK: Record<PolityTier, number> = {
  camp: 0,
  village: 1,
  chiefdom: 2,
  kingdom: 3,
}

/** Seuils d’âge unifiés via `ages.ts` (boucle famille ↔ politique ↔ apparence). */
export const CHILD_AGE = AGES_CHILD
export const ELDER_AGE = AGES_ELDER
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
      lastCreedChangeTick: -1,
      creedFollowupDone: false,
      creedFromParent: false,
      creedLineageDepth: 0,
    }
    POLITICS.set(v.id, pol)
  }
  // Backward-compat soft fields if cache was created mid-session.
  if (pol.normInternalization === undefined) pol.normInternalization = 0.3
  if (pol.reliability === undefined) pol.reliability = 0.5
  if (!pol.authorityPreference) pol.authorityPreference = 'tradition'
  if (pol.lastCreedChangeTick === undefined) pol.lastCreedChangeTick = -1
  if (pol.creedFollowupDone === undefined) pol.creedFollowupDone = false
  if (pol.creedFromParent === undefined) pol.creedFromParent = false
  if (pol.creedLineageDepth === undefined) pol.creedLineageDepth = 0
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

/** Soft wealth proxy for inequality (coins + edible stock + trade capital). */
function wealthProxy(v: Villager): number {
  const coins = countOf(v.inventory, 'coin') + (v.chestInventory ? countOf(v.chestInventory, 'coin') : 0)
  return (
    coins * 1.15 +
    edibleValue(v.inventory) * 0.35 +
    (v.hasCart ? 2.5 : 0) +
    (v.boatId !== null ? 2 : 0) +
    (v.hasHome && v.homeOwnerId === v.id ? 1.5 : 0) +
    (v.profession === 'trader' ? 1.2 : 0)
  )
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
  // WP10 conflict taxonomy — rumor kinds that are conflict-like.
  if (kind === 'rivalry') noteConflict(state, 'rivalry')
  else if (kind === 'succession') noteConflict(state, 'succession')
  else if (kind === 'territory') noteConflict(state, 'territory_absorb')
  else if (kind === 'exclusion') noteConflict(state, 'exclusion')
  else if (kind === 'theft' && intensity >= 0.8) noteConflict(state, 'theft_feud')
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
  if (!Array.isArray(c.memory)) c.memory = []
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
  noteCircleFormed(state)
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
      // Phase B: craft/trade groups need observable social reason (not same-job alone).
      const bonded = candidates.filter((a) =>
        candidates.some((b) => {
          if (a.id === b.id) return false
          const r = a.relations.get(b.id)
          if (!r) return false
          const cooperated = r.history.some(
            (h) => h.kind === 'helped' || h.kind === 'gift' || h.kind === 'met' || h.kind === 'gossip',
          )
          return (
            r.trust > 0.18 ||
            r.affinity > 0.12 ||
            r.kinship > 0.3 ||
            cooperated ||
            (distance(a.x, a.y, b.x, b.y) < 18 && (r.affinity > 0.05 || r.trust > 0.08))
          )
        }),
      )
      // Threat circles may crystallize from proximity under danger; craft needs bonds.
      const pool =
        kind === 'threat'
          ? bonded.length >= 2
            ? bonded
            : candidates.length >= 2
              ? candidates
              : []
          : bonded.length >= 2
            ? bonded
            : []
      if (pool.length >= 2) {
        const origin =
          kind === 'threat'
            ? 'protection contre les loups'
            : kind === 'trade'
              ? 'routes et échanges'
              : `métier partagé (${label})`
        createCircle(state, kind, pool.slice(0, 5), pool[0].villageId, label, origin)
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
    if (sample.some((v) => villagerFeelsFamine(state, v))) {
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

    // Common enemy / wolf fear via mind episodic (+ legacy memories)
    const fearful = sample.filter((v) =>
      hasLifeEventKind(peekMind(v.id)?.episodic, v.memories, ['dangerSpot', 'grief', 'saved'], {
        tick: state.tick,
        maxAge: 800,
      }),
    )
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

    // Soft faith circle — belief cluster (no canned religion / not always « piété »)
    const pious = sample.filter((v) => {
      const pol = politicsOf(v)
      return (
        pol.beliefs.piety > 0.42 ||
        pol.creedWeight > 0.28 ||
        (pol.creed !== null && pol.creedWeight > 0.2) ||
        pol.beliefs.tradition > 0.55 ||
        (pol.beliefs.fairness > 0.55 && pol.grievance > 0.25)
      )
    })
    if (pious.length >= 2) {
      const close = pious.filter((a) => pious.some((b) => a.id !== b.id && distance(a.x, a.y, b.x, b.y) < 28))
      if (close.length >= 2) {
        const core = close.slice(0, 4)
        const c = createCircle(state, 'faith', core, core[0].villageId, '', 'recueillement partagé')
        if (c) {
          // Inherit majority member creed, else competitive axis — never hardcode piété.
          const tally = new Map<CreedId, number>()
          for (const m of core) {
            const cr = politicsOf(m).creed
            if (cr) tally.set(cr, (tally.get(cr) ?? 0) + 1)
          }
          let inherited: CreedId | null = null
          let bestN = 0
          for (const [id, n] of tally) {
            if (n > bestN) {
              bestN = n
              inherited = id
            }
          }
          const leadPol = politicsOf(core[0]!)
          c.creed = inherited ?? pickDominantCreed(leadPol, 0.45) ?? 'piete'
          for (const m of core) {
            const pol = politicsOf(m)
            if (c.creed === 'piete') pol.beliefs.piety = clamp01(pol.beliefs.piety + 0.04)
            else if (c.creed === 'partage') pol.beliefs.fairness = clamp01(pol.beliefs.fairness + 0.03)
            else if (c.creed === 'tradition') pol.beliefs.tradition = clamp01(pol.beliefs.tradition + 0.03)
            else if (c.creed === 'commerce_libre') pol.beliefs.greed = clamp01(pol.beliefs.greed + 0.03)
            else if (c.creed === 'protection' || c.creed === 'ordre') {
              pol.beliefs.loyalty = clamp01(pol.beliefs.loyalty + 0.02)
              pol.grievance = clamp01(pol.grievance + 0.015)
            }
            pol.creedWeight = clamp01(pol.creedWeight + 0.06)
          }
        }
      }
    }

    // Elders / notables settling disputes — founders reach this within ~1–2 weeks.
    const elders = sample.filter(
      (v) => v.age > ELDER_AGE * 0.72 && politicsOf(v).beliefs.fairness > 0.38,
    )
    if (elders.length >= 2) {
      const trusted = elders.filter((e) => {
        let t = 0
        for (const r of e.relations.values()) if (r.trust > 0.32) t++
        return t >= 1
      })
      const pool = trusted.length >= 2 ? trusted : elders
      if (pool.length >= 2) {
        const c = createCircle(state, 'elder', pool.slice(0, 4), pool[0].villageId, '', 'arbitrage des conflits')
        if (c && !c.norms.includes('punish_theft')) c.norms.push('punish_theft')
      }
    }

    // Village assembly — soft council of neighbours (feeds polity / laws).
    if (sample.length >= 4) {
      const notables = [...sample]
        .sort((a, b) => influenceScore(state, b) - influenceScore(state, a))
        .slice(0, 5)
      if (notables.length >= 3) {
        const c = createCircle(
          state,
          'village',
          notables,
          notables[0].villageId,
          '',
          'assemblée des voisins',
        )
        if (c) {
          if (!c.norms.includes('maintain_commons')) c.norms.push('maintain_commons')
          if (!c.norms.includes('reciprocate')) c.norms.push('reciprocate')
        }
      }
    }
  }
}

function adoptNorms(state: SimState, c: Circle) {
  if (c.kind === 'trade' && !c.norms.includes('favor_traders') && c.problemCount >= 1) {
    c.norms.push('favor_traders')
    logCause(state, 'pression marchande', `${c.name} favorise le commerce`)
  }
  if (c.kind === 'hunger' && feelFamine(state, villageOf(state, c.villageId)) && !c.norms.includes('share_famine')) {
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
  const acute =
    c.problemCount >= INSTITUTION_PROBLEMS + 2 ||
    (feelFamine(state, villageOf(state, c.villageId)) && c.kind === 'hunger') ||
    (state.thefts > 5 && (c.kind === 'elder' || c.kind === 'village')) ||
    c.kind === 'village' ||
    c.kind === 'elder'
  const needProblems =
    acute || c.kind === 'craft' || c.kind === 'trade'
      ? 1
      : members >= 3 && age >= INSTITUTION_AGE
        ? 1
        : INSTITUTION_PROBLEMS
  const needAge =
    acute || c.kind === 'craft' || c.kind === 'trade' || c.kind === 'village'
      ? INSTITUTION_AGE * 0.45
      : INSTITUTION_AGE
  if (age < needAge || c.problemCount < needProblems) return
  c.isInstitution = true
  noteInstitutionFormed(state)
  c.enforcement = clamp01(c.enforcement + 0.35)
  const story = c.originStory ?? `persistance du ${c.name}`
  c.originStory = story
  // Craft / trade circles with enough practitioners harden into guilds.
  if (c.kind === 'craft' || c.kind === 'trade') {
    const practitioners = livingMembers(state, c).filter((m) => hasCraftIdentityFor(state, m, c)).length
    const needGuild = Math.min(GUILD_EARLY_PRACTITIONERS, GUILD_MIN_PRACTITIONERS)
    if (practitioners >= needGuild || members >= needGuild) {
      promoteToGuild(state, c)
    } else {
      logCause(state, story, `${c.name} devient une institution (application des normes)`)
    }
  } else if (c.kind === 'elder' || c.kind === 'village') {
    promoteToCouncil(state, c, story)
  } else {
    logCause(state, story, `${c.name} devient une institution (application des normes)`)
  }
  rememberCircle(c, `institutionnalisé : ${story}`)
}

/** Elder / village institutions crystallise as named councils with laws. */
function promoteToCouncil(state: SimState, c: Circle, story: string) {
  if (c.kind === 'elder' && !c.name.startsWith('conseil')) {
    c.name = 'conseil des aînés'
  } else if (c.kind === 'village' && !c.name.startsWith('conseil')) {
    c.name = 'conseil du village'
  }
  if (!c.norms.includes('punish_theft') && (c.kind === 'elder' || state.thefts > 0)) {
    c.norms.push('punish_theft')
  }
  if (!c.norms.includes('maintain_commons')) c.norms.push('maintain_commons')
  c.enforcement = clamp01(c.enforcement + 0.15)
  const laws = c.norms.map((n) => NORM_FR[n] ?? n).slice(0, 3).join(', ')
  logCause(
    state,
    story,
    `${c.name} s'institue — lois : ${laws || 'usages communs'}`,
  )
  rememberCircle(c, `conseil formé · ${laws}`)
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
  const earlyNeed = Math.min(GUILD_EARLY_PRACTITIONERS, GUILD_MIN_PRACTITIONERS)
  if (
    !c.isGuild &&
    !((c.kind === 'craft' || c.kind === 'trade') && c.isInstitution && livingMembers(state, c).length >= earlyNeed)
  ) {
    return
  }
  if (!c.isGuild && (c.kind === 'craft' || c.kind === 'trade') && c.isInstitution) promoteToGuild(state, c)
  if (!c.isGuild) return
  if ((state.tick + c.id * 3) % (CIRCLE_TICK * 2) !== 0) return

  const members = livingMembers(state, c)
  if (members.length < 2) return

  // Quality bar drifts up with masterworks / craft skill.
  let skillSum = 0
  let master = members[0]
  let masterSkill = -1
  const guildJobHint = circleCraftProfession(state, c)
  for (const m of members) {
    const skMind = mindOf(m)
    const jobKeys = primarySkillsForProfession(
      guildJobHint && guildJobHint !== 'none'
        ? guildJobHint
        : m.profession !== 'none'
          ? m.profession
          : 'blacksmith',
    )
    const jobSkill = Math.max(...jobKeys.map((k) => skMind.skills[k]), skMind.skills.craft)
    const sk = jobSkill + skMind.skills.social * 0.2
    skillSum += sk
    if (sk > masterSkill) {
      masterSkill = sk
      master = m
    }
    if (skMind.masterworkCount > 0) noteRecognition(m, 0.02)
  }
  c.qualityBar = clamp01(0.3 + skillSum / members.length * 0.5)

  // Apprenticeship: master drips métier skills (not only generic craft).
  if (c.norms.includes('teach_apprentice')) {
    const guildJob = circleCraftProfession(state, c) ?? master.profession
    const jobSkills = primarySkillsForProfession(guildJob === 'none' ? 'blacksmith' : guildJob)
    const apprentice = members.find((m) => {
      if (m.id === master.id) return false
      const sk = mindOf(m).skills
      const weak =
        jobSkills.some((k) => sk[k] < c.qualityBar * 0.7) || sk.craft < c.qualityBar * 0.7
      return m.age < CHILD_AGE * 1.4 || weak
    })
    if (apprentice) {
      const am = mindOf(apprentice)
      const mm = mindOf(master)
      const leadSkill = jobSkills[0] ?? 'craft'
      const masterLead = Math.max(mm.skills[leadSkill], mm.skills.craft, masterSkill)
      if (masterLead > am.skills[leadSkill] + 0.08) {
        const drip = 0.012 + mm.skills.social * 0.01
        for (const k of jobSkills) {
          if (mm.skills[k] > am.skills[k] + 0.05) {
            am.skills[k] = clamp01(am.skills[k] + drip)
          }
        }
        // Soft secondary: craft + social always tick up a little (guild pedagogy).
        am.skills.craft = clamp01(am.skills.craft + drip * 0.55)
        am.skills.social = clamp01(am.skills.social + drip * 0.4)
        ensureLivelihood(mm)
        ensureLivelihood(am)
        mm.livelihood.mix.teach = clamp01(mm.livelihood.mix.teach + 0.04)
        am.livelihood.mix.craft = clamp01(am.livelihood.mix.craft + 0.03)
        if (guildJob === 'trader') am.livelihood.mix.trade = clamp01(am.livelihood.mix.trade + 0.03)
        if (guildJob === 'miner' || guildJob === 'mason') am.livelihood.mix.mine = clamp01(am.livelihood.mix.mine + 0.03)
        if (guildJob === 'builder' || guildJob === 'mason') am.livelihood.mix.build = clamp01(am.livelihood.mix.build + 0.03)
        if (guildJob === 'farmer' || guildJob === 'miller' || guildJob === 'herder') {
          am.livelihood.mix.farm = clamp01(am.livelihood.mix.farm + 0.03)
        }
        noteRecognition(master, 0.015)
        if ((state.tick + c.id) % 400 < CIRCLE_TICK) {
          logEvent(state, `${master.name} forme ${apprentice.name} dans la ${c.name}`)
        }
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
  const famineFeel = feelFamine(state, villageOf(state, c.villageId))
  if (!famineFeel) delta += 0.008
  else delta -= 0.02
  const recentDeaths = members.some((m) =>
    hasLifeEventKind(peekMind(m.id)?.episodic, m.memories, ['grief'], { tick: state.tick, maxAge: 200 }),
  )
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
      noteCircleJoin(state)
      rememberCircle(c, `${o.name} rejoint`)
      if (c.memberIds.length >= 3) break
    }
  }
}

function pruneCircles(state: SimState) {
  for (let i = state.circles.length - 1; i >= 0; i--) {
    const c = state.circles[i]
    const before = c.memberIds.length
    c.memberIds = c.memberIds.filter((id) => state.villagers.some((v) => v.id === id && v.alive))
    if (c.memberIds.length < before) noteCircleDrop(state)
    if (c.memberIds.length < 2) {
      if (c.isInstitution) logEvent(state, `L'institution ${c.name} se dissout`)
      noteCircleDissolved(state, { formedTick: c.formedTick, isInstitution: c.isInstitution })
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

  handlePolityDeath(state, victim)

  POLITICS.delete(victim.id)
  POWER_CACHE.delete(victim.id)
}

// ── Beliefs / creeds / migration ─────────────────────────────────────────────

/** Competitive creed pick — piety must not monopolize every crystallisation. */
export function creedAxes(pol: PoliticalState): { id: CreedId; w: number }[] {
  return [
    { id: 'piete', w: pol.beliefs.piety * 0.92 + pol.creedWeight * 0.08 },
    { id: 'partage', w: pol.beliefs.fairness * 1.05 + pol.grievance * 0.4 },
    { id: 'commerce_libre', w: pol.beliefs.greed * 1.15 },
    { id: 'protection', w: pol.beliefs.loyalty * 0.65 + pol.grievance * 0.5 },
    { id: 'vengeance', w: pol.grievance * (1.2 - pol.beliefs.fairness * 0.9) },
    { id: 'ordre', w: pol.beliefs.fairness * 0.5 + pol.grievance * 0.65 + pol.beliefs.loyalty * 0.15 },
    { id: 'tradition', w: pol.beliefs.tradition * 1.12 },
    { id: 'changement', w: (1 - pol.beliefs.tradition) * 1.05 + pol.beliefs.greed * 0.2 },
  ]
}

export function pickDominantCreed(pol: PoliticalState, minW = 0.52): CreedId | null {
  const axes = creedAxes(pol).sort((a, b) => b.w - a.w)
  const top = axes[0]
  if (!top || top.w < minW) return null
  // Soft second-place: break piete monoculture when another axis is competitive.
  const second = axes[1]
  if (second && top.id === 'piete' && second.w >= top.w - 0.14 && second.w >= minW - 0.08) {
    return second.id
  }
  // Near-ties among non-piete axes: slight preference for the runner-up diversifies seeds.
  if (second && top.id !== 'piete' && second.w >= top.w - 0.06 && second.w >= minW - 0.05) {
    if ((pol.creedWeight * 17 + pol.grievance * 13) % 1 > 0.55) return second.id
  }
  return top.id
}

function tickIndividualPolitics(state: SimState, v: Villager) {
  const pol = politicsOf(v)
  ensureKinship(state, v)
  const role = lifeRoleOf(v)

  // Life events nudge beliefs (mind episodic authority; legacy fills cold mind)
  forEachLifeEvent(peekMind(v.id)?.episodic, v.memories, { tick: state.tick, maxAge: 400 }, (kind) => {
    if (kind === 'robbed' || kind === 'sawTheft') {
      pol.beliefs.fairness = clamp01(pol.beliefs.fairness + 0.01)
      pol.grievance = clamp01(pol.grievance + 0.02)
    }
    if (kind === 'helped' || kind === 'saved') {
      pol.beliefs.loyalty = clamp01(pol.beliefs.loyalty + 0.008)
      pol.beliefs.piety = clamp01(pol.beliefs.piety + 0.004)
      pol.reliability = clamp01(pol.reliability + 0.01)
    }
    if (kind === 'grief' || kind === 'harmed') {
      pol.grievance = clamp01(pol.grievance + 0.015)
      pol.beliefs.piety = clamp01(pol.beliefs.piety + 0.01)
    }
    if (kind === 'dangerSpot') {
      pol.beliefs.loyalty = clamp01(pol.beliefs.loyalty + 0.005)
    }
  })

  const vg = villageOf(state, v.villageId)
  const famineFeel = feelFamine(state, vg)
  if (famineFeel) {
    pol.grievance = clamp01(pol.grievance + 0.01)
    pol.beliefs.fairness = clamp01(pol.beliefs.fairness + (1 - pol.beliefs.greed) * 0.008)
    pol.migrationUrge = clamp01(pol.migrationUrge + 0.012 * (1 - pol.beliefs.loyalty))
  } else {
    pol.migrationUrge = clamp01(pol.migrationUrge - 0.008)
    pol.grievance = clamp01(pol.grievance - 0.004)
  }

  // Inequality stress: poor gain grievance; rich elites overproduced → rivalry soft.
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
    pol.migrationUrge = clamp01(pol.migrationUrge + (youth ? 0.012 : 0.006) * (1 - pol.beliefs.loyalty))
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

  // WP4: beliefs / creedWeight accumulate here; creed crystallize is religion.ts only.
  // trySpreadCreed remains the social conversion path (existing creed → peer).
  if (pol.creed) {
    pol.creedWeight = clamp01(pol.creedWeight + 0.01)
  } else if (pol.beliefs.piety > 0.48 || pol.grievance > 0.4) {
    pol.creedWeight = clamp01(
      pol.creedWeight + 0.018 * Math.max(pol.beliefs.piety, pol.grievance * 0.85),
    )
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

  // Rich lend coin to trusted poor (credit emergence — not a bank script).
  // Hunger is satiety 0..HUNGER_MAX(~6): low = hungry. Never use 0..1 thresholds here.
  if ((state.tick + v.id * 11) % 32 !== 0) return
  const coins = countOf(v.inventory, 'coin')
  if (coins < 2) return
  if (v.hunger < 1.6) return
  let best: Villager | null = null
  let bestNeed = 0
  for (const [oid, rel] of v.relations) {
    if (rel.trust < 0.12 && rel.affinity < 0.08) continue
    const other = state.villagers.find((o) => o.id === oid && o.alive)
    if (!other) continue
    const otherCoins = countOf(other.inventory, 'coin')
    const need =
      (other.hunger < 2.4 ? 0.4 : 0) +
      (otherCoins < 2 ? 0.45 : 0) +
      (1 - villagerSoL(state, other)) * 0.35
    if (need < 0.32) continue
    if (need > bestNeed) {
      bestNeed = need
      best = other
    }
  }
  // Soft fallback: co-villager in need (still causal wealth→credit, not omniscient).
  if (!best && v.villageId != null && coins >= 2) {
    for (const other of state.villagers) {
      if (!other.alive || other.id === v.id || other.villageId !== v.villageId) continue
      if (countOf(other.inventory, 'coin') >= 2) continue
      // Skip well-fed comfortable peers — lend only when need is real.
      if (other.hunger >= 2.8 && villagerSoL(state, other) > 0.42) continue
      const d = distance(v.x, v.y, other.x, other.y)
      if (d > 28) continue
      const need = (1 - Math.min(1, other.hunger / 6)) * 0.5 + (1 - villagerSoL(state, other)) * 0.45 + (countOf(other.inventory, 'coin') < 1 ? 0.25 : 0.1)
      if (need > bestNeed && need >= 0.28) {
        bestNeed = need
        best = other
      }
    }
  }
  if (!best) return
  removeFromInventory(v.inventory, 'coin', 1)
  addToInventory(best.inventory, 'coin', 1)
  const owe = relationWith(best, v.id)
  owe.debt = Math.min(3, owe.debt + 0.7)
  adjustRelation(best, v.id, 0.04, 0.05, state.tick)
  state.informalLendCount = (state.informalLendCount ?? 0) + 1
  // Dual chronicle: accented FR + ASCII probe-safe (S20 soak detection).
  logCause(state, `aisance de ${v.name}`, `${v.name} prête de l'argent à ${best.name}`)
  logEvent(state, `${v.name} prete de l'argent a ${best.name}`)
  noteInformalLend(state, v, best, 1)
}

export function trySpreadCreed(state: SimState, a: Villager, b: Villager) {
  const pa = politicsOf(a)
  const pb = politicsOf(b)
  if (!pa.creed || pa.creedWeight < 0.28) return
  const rel = relationWith(b, a.id)
  if (rel.trust < 0.22) return
  if (pb.creed === pa.creed) {
    pb.creedWeight = clamp01(pb.creedWeight + 0.05)
    return
  }
  const open =
    (1 - pb.beliefs.tradition) * 0.35 +
    rel.affinity * 0.3 +
    a.personality.sociability * 0.2 +
    pa.beliefs.piety * 0.12 +
    // Non-piete creeds spread at least as easily — avoids monoculture conversion.
    (pa.creed === 'piete' ? 0.02 : 0.06)
  if (open > 0.4 && pa.creedWeight > pb.creedWeight * 0.85) {
    const prev = pb.creed
    pb.creed = pa.creed
    pb.creedWeight = 0.28
    markCreedChange(state, b)
    if (prev) {
      logCause(state, `${a.name} convertit ${b.name}`, `« ${CREED_FR[pa.creed]} » remplace l'ancienne voie`)
    } else {
      logCause(state, `${a.name} convainc ${b.name}`, `« ${CREED_FR[pa.creed]} » se répand`)
    }
  }
}

/** Longest living-ancestor chain sharing `creed` (1 = parent match). Caps at 8. */
function matchingCreedAncestorDepth(
  state: SimState,
  v: Villager,
  creed: CreedId,
  seen: Set<number> = new Set(),
): number {
  if (seen.has(v.id) || seen.size > 8) return 0
  seen.add(v.id)
  let best = 0
  const parentIds = [...v.parentIds, ...(v.adoptiveParentIds ?? [])]
  for (const pid of parentIds) {
    const p = state.villagers.find((o) => o.id === pid && o.alive)
    if (!p) continue
    if (politicsOf(p).creed !== creed) continue
    best = Math.max(best, 1 + matchingCreedAncestorDepth(state, p, creed, seen))
  }
  return best
}

/** WP10 + DP11: stamp creed-change counter, NPC set, optional parent→child culture link. */
export function markCreedChange(state: SimState, v: Villager): void {
  const pol = politicsOf(v)
  pol.lastCreedChangeTick = state.tick
  pol.creedFollowupDone = false
  noteCreedChange(state, v.id)
  if (pol.creed) {
    const depth = matchingCreedAncestorDepth(state, v, pol.creed)
    if (depth >= 1) {
      pol.creedFromParent = true
      pol.creedLineageDepth = depth
      noteCreedParentChildTransmission(state, v.id, depth)
    } else {
      pol.creedFromParent = false
      pol.creedLineageDepth = 0
    }
  } else {
    pol.creedFromParent = false
    pol.creedLineageDepth = 0
  }
}

/** Creed id → task kinds that count as behavior followup (scoring attribution). */
function creedMatchesTaskKind(creed: CreedId, kind: TaskKind): boolean {
  switch (creed) {
    case 'partage':
      return kind === 'giveFood'
    case 'ordre':
      return kind === 'steal' || kind === 'confront'
    case 'vengeance':
      return kind === 'confront'
    case 'protection':
      return kind === 'defend' || kind === 'fight' || kind === 'buildWall'
    case 'commerce_libre':
      return kind === 'tradeRun' || kind === 'mintCoins' || kind === 'mineGold'
    case 'piete':
      return kind === 'ritual' || kind === 'counsel'
    case 'tradition':
      return kind === 'teachCraft' || kind === 'ritual' || kind === 'buildProject'
    case 'changement':
      return kind === 'experiment' || kind === 'clearLand' || kind === 'buildHouse'
    default:
      return false
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
  // Hard gate: norms must not pull troubadours while hungry / under famine.
  if (
    (kind === 'socialise' || kind === 'entertain' || kind === 'counsel' || kind === 'ritual' || kind === 'teachCraft') &&
    (villagerFeelsFamine(state, v) || v.hunger < (kind === 'teachCraft' ? 2.05 : 2.35))
  ) {
    return 0
  }
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
    if (norms.includes('share_famine') && villagerFeelsFamine(state, v)) mult *= 2.1
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
    if (targetId !== null) {
      const trust = v.relations.get(targetId)?.trust ?? 0.25
      mult *= 0.55 + trust * 0.9
    }
    if (role === 'elder') mult *= 1.2
    if (targetId !== null && norms.includes('punish_theft') && isKnownThief(state, v, targetId)) mult *= 0.15
    if (targetId !== null && isSociallyExcluded(state, v, targetId)) mult *= 0.2
  }
  if (kind === 'steal') {
    if (norms.includes('punish_theft')) mult *= 0.22
    if (norms.includes('share_famine') && villagerFeelsFamine(state, v)) mult *= 0.45
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
        // Rival polities with overlapping claims.
        if (outgroup && rival.villageId !== null && v.villageId !== null) {
          const pa = polityOfVillage(state, v.villageId)
          const pb = polityOfVillage(state, rival.villageId)
          if (pa && pb && pa.id !== pb.id && pa.rivalPolityIds.includes(pb.id)) mult *= 1.4
        }
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
    if (pol.creed === 'piete') mult *= 1.25
    if (pol.creed === 'tradition') mult *= 1.15
  }
  if (kind === 'ritual') {
    mult *= 1 + pol.beliefs.piety * 0.45
    if (circles.some((c) => c.kind === 'faith')) mult *= 1.4
    if (pol.creed === 'piete') mult *= 1.4 + pol.creedWeight * 0.25
    if (pol.creed === 'tradition') mult *= 1.2
    const vg = villageOf(state, v.villageId)
    if (vg?.hasShrine) mult *= 1.25
    if (vg?.sacredTier === 'chapel' || vg?.sacredTier === 'temple') mult *= 1.15
  }
  if (kind === 'teachCraft') {
    if (circles.some((c) => c.isGuild || c.norms.includes('teach_apprentice'))) mult *= 1.45
    if (pol.creed === 'tradition') mult *= 1.2
    if (pol.creed === 'changement') mult *= 1.15
  }
  if (kind === 'experiment') {
    if (pol.creed === 'changement') mult *= 1.35
    if (pol.creed === 'tradition') mult *= 0.7
  }
  if (kind === 'clearLand' || kind === 'buildHouse' || kind === 'buildBridge') {
    if (pol.creed === 'changement') mult *= 1.18
  }
  if ((kind === 'buildWall' || kind === 'buildProject') && pol.creed === 'tradition' && norms.includes('maintain_commons')) {
    mult *= 1.2
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
  // WP10: one followup per creed change when a creed-matching kind is scored (attribution lite).
  if (
    pol.creed &&
    !pol.creedFollowupDone &&
    pol.lastCreedChangeTick >= 0 &&
    state.tick - pol.lastCreedChangeTick < TICKS_PER_DAY * 5 &&
    creedMatchesTaskKind(pol.creed, kind)
  ) {
    pol.creedFollowupDone = true
    noteCreedBehaviorFollowup(state, v.id)
    // DP11: same followup on parent-sourced creed = child behavior influenced.
    if (pol.creedFromParent) noteCreedChildBehaviorInfluenced(state, v.id)
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

/** Profession lock-in: soft stickiness only — midlife switches must stay possible. */
export function professionLockInBonus(state: SimState, v: Villager, current: Profession, candidate: Profession): number {
  if (current === 'none' || current === candidate) return 0
  const vg = villageOf(state, v.villageId)
  const pop = vg?.memberIds.length ?? 1
  const surplusFood = (vg?.surplus?.food ?? 0) + (vg?.surplus?.bread ?? 0) + (vg?.surplus?.wheat ?? 0)
  const specialization = clamp01((pop - 4) / 16 + surplusFood * 0.08)
  const craftCircle = circlesOf(state, v).some((c) => c.kind === 'craft' || c.kind === 'trade' || c.kind === 'threat' || c.isGuild)
  const pol = politicsOf(v)
  // Softened vs old Durkheim lock (was ~0.45/0.2/0.18) so demand + practice can win midlife.
  let stick = specialization * 0.22 + (craftCircle ? 0.1 : 0) + pol.beliefs.tradition * 0.1
  if (lifeRoleOf(v) === 'elder') stick += 0.08
  if (lifeRoleOf(v) === 'child') stick -= 0.28
  stick -= v.personality.curiosity * 0.12 + v.personality.ambition * 0.05
  // Livelihood drift: if practice no longer matches current label, easier to leave.
  try {
    const live = ensureLivelihood(mindOf(v))
    const tag = live.roleTag ?? ''
    if (!tag.startsWith('legacy_') && live.titleFr) {
      if (live.roleTag && !live.roleTag.includes(current) && !tag.startsWith('legacy_')) {
        stick -= 0.22 + v.personality.curiosity * 0.18
      }
    }
    if (live.unemployedStreak > 40) stick -= 0.22
    if (live.unemployedStreak > 80) stick -= 0.15
    const since = state.tick - (live.lastCareerChangeTick ?? -9999)
    if (since >= 0 && since < 72 * 3) stick += 0.12 // brief cooldown after a switch
  } catch {
    /* mind not ready */
  }
  // Sterile climate: do not lock farmers into endless tundra ploughing.
  if (current === 'farmer' || current === 'miller') {
    const t = sampleTempC(state.climate, v.x, v.y)
    if (cropTempFactor(t) < 0.28) stick -= 0.4
  }
  // Holding a farmable plot: hard stick so sow→ripe→harvest is not orphaned by métier churn.
  if (current === 'farmer' && v.fieldX >= 0) {
    const t = sampleTempC(state.climate, v.fieldX, v.fieldY)
    if (cropTempFactor(t) >= 0.28) stick = 0.55
  }
  // Fauna→métier: abundant nearby sheep + food stores → allow farmer→herder mobility.
  if (current === 'farmer' && (candidate === 'herder' || candidate === 'weaver')) {
    const vg = villageOf(state, v.villageId)
    const foodOk =
      !villagerFeelsFamine(state, v) &&
      ((vg?.surplus?.food ?? 0) + (vg?.surplus?.bread ?? 0) + (vg?.surplus?.wheat ?? 0) > 0.8 ||
        (vg?.memberIds.length ?? 0) >= 5)
    let sheepNear = 0
    const ox = v.homeX >= 0 ? v.homeX : v.x
    const oy = v.homeY >= 0 ? v.homeY : v.y
    for (const s of state.sheep ?? []) {
      if (!s.alive) continue
      if (distance(s.x, s.y, ox, oy) < 48) sheepNear++
    }
    if (foodOk && sheepNear >= 4) stick -= 0.28 + Math.min(0.18, sheepNear * 0.01)
    if (candidate === 'weaver' && ((vg?.surplus?.wool ?? 0) > 0.5 || sheepNear >= 6)) stick -= 0.12
  }
  // Famine: easier to leave luxury crafts toward food work (local OR global)
  if (villagerFeelsFamine(state, v) && (current === 'weaver' || current === 'trader' || current === 'blacksmith')) {
    stick -= 0.2
  }
  // Textile roles stick while sheep/wool opportunity persists (S9/S10/S45).
  if ((current === 'herder' || current === 'weaver') && candidate !== current) {
    let sheepNear = 0
    const ox = v.homeX >= 0 ? v.homeX : v.x
    const oy = v.homeY >= 0 ? v.homeY : v.y
    for (const s of state.sheep ?? []) {
      if (s.alive && distance(s.x, s.y, ox, oy) < 56) sheepNear++
    }
    if (sheepNear >= 4 && !villagerFeelsFamine(state, v)) stick += 0.22
  }
  return Math.max(0, Math.min(0.55, stick))
}

/** Soft commerce pressure + institution price levers. */
export function politicalPriceBias(state: SimState, villageId: number): number {
  let bias = 1
  const vg = state.villages.find((g) => g.id === villageId)
  const famine = feelFamine(state, vg)
  for (const c of state.circles) {
    if (c.villageId !== villageId) continue
    if (c.norms.includes('favor_traders')) bias *= 0.88
    if (c.isInstitution && c.kind === 'trade') bias *= 0.9
    if (c.kind === 'hunger' && famine) bias *= 1.14
    if (c.isInstitution && (c.kind === 'hunger' || c.norms.includes('share_famine')) && famine) bias *= 1.12
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

/** Deal quality modifier from debts / grudges / trust toward destination members. */
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
    // Trust is willingness, not garnish — cold partners damp caravans hard.
    if (rel.trust > 0.5) mod *= 1.12
    else if (rel.trust > 0.35) mod *= 1.05
    else if (rel.trust < 0.18) mod *= 0.72
    else if (rel.trust < 0.28) mod *= 0.88
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
  spawnRumor(state, 'windfall', trader, null, 0.55, `${trader.name} revient chargé de marchandises`)
  const pol = politicsOf(trader)
  pol.legitimacy = clamp01(pol.legitimacy + 0.05)
  pol.beliefs.greed = clamp01(pol.beliefs.greed + 0.02)
  for (const c of circlesOf(state, trader)) {
    if (c.kind === 'trade') {
      c.legitimacy = clamp01(c.legitimacy + 0.06)
      c.problemCount += 1
      c.lastActiveTick = state.tick
    }
  }
  // Windfall coins → envy among poorer villagers (Seshat inequality → politics).
  const vg = villageOf(state, trader.villageId)
  if (!vg) return
  const traderWealth = wealthProxy(trader)
  let n = 0
  for (const o of state.villagers) {
    if (!o.alive || o.villageId !== vg.id || o.id === trader.id) continue
    const ow = wealthProxy(o)
    if (ow < traderWealth * 0.55) {
      const peer = politicsOf(o)
      peer.grievance = clamp01(peer.grievance + 0.035)
      peer.migrationUrge = clamp01(peer.migrationUrge + 0.015 * (1 - peer.beliefs.loyalty))
      n++
      if (n >= 4) break
    }
  }
  if (n > 0) {
    vg.inequalityStress = clamp01((vg.inequalityStress ?? 0) + 0.05 + n * 0.015)
    if ((state.tick + vg.id) % 220 < 12) {
      logCause(state, `fortune marchande de ${trader.name}`, 'jalousie et tensions au village')
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

/** Dominant tagged cause for a leave act (telemetry / §33 identifiable cause). */
function inferMigrateLeaveCause(state: SimState, v: Villager, village: Village): MigrateLeaveCause {
  const pol = politicsOf(v)
  const scores: Array<{ id: MigrateLeaveCause; w: number }> = []
  if (villagerFeelsFamine(state, v) || villageInFamine(state, village)) scores.push({ id: 'famine', w: 3 })
  const sol = villagerSoL(state, v)
  if (sol < 0.32) scores.push({ id: 'low_sol', w: 2.5 })
  const jobless =
    v.profession === 'none' ||
    (!v.hasField && !v.hasWorkbench && !v.hasPen && v.profession !== 'guard' && v.profession !== 'trader')
  if (jobless && lifeRoleOf(v) !== 'child') scores.push({ id: 'unemployment', w: 2.2 })
  const carry = villageCarryingPressure(state, village)
  if (carry > 0.4) scores.push({ id: 'crowding', w: 1.8 + carry })
  if ((village.cohesion ?? 1) < 0.28) scores.push({ id: 'cohesion', w: 2 })
  const localInst = state.circles.find(
    (c) => c.isInstitution && c.memberIds.includes(v.id) && c.legitimacy < 0.3,
  )
  if (localInst) scores.push({ id: 'oppression', w: 2.1 })
  const villageSol = village.standardOfLiving ?? sol
  if (villageSol < 0.4) {
    for (const other of state.villages) {
      if (other.id === village.id || other.memberIds.length < 2) continue
      if ((other.standardOfLiving ?? 0) > villageSol + 0.18) {
        scores.push({ id: 'pull_elsewhere', w: 1.6 })
        break
      }
    }
  }
  if (pol.grievance > 0.45) scores.push({ id: 'grievance', w: 1.4 + pol.grievance })
  scores.sort((a, b) => b.w - a.w)
  if (scores.length === 0) return 'mixed'
  if (scores.length >= 2 && scores[0]!.w - scores[1]!.w < 0.35) return 'mixed'
  return scores[0]!.id
}

function tickMigration(state: SimState, v: Villager) {
  const pol = politicsOf(v)
  noteMigrateUrgeSample(state, v.id, pol.migrationUrge)

  // Homeless wanderer with high urge: travel + destination eval -> rejoin|fail.
  if (v.villageId === null && pol.migrationUrge > 0.35) {
    let best: { id: number; score: number; reason: MigrateStageReason } | null = null
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
      const destBiome = sampleBiome(state.climate, vg.centerX, vg.centerY)
      const biomePull = biomeSettlementScore(destBiome) * 0.12
      const foodLandscape = localFoodSupply(state.grid, vg.centerX, vg.centerY, 32, state.climate)
      const foodPull = Math.min(0.22, foodLandscape * 0.007)
      const crowding = villageCarryingPressure(state, vg)
      const faminePenalty = villageInFamine(state, vg) ? 0.42 : 0
      const relationsPull = n > 0 ? affinity / n : 0
      const distPull = (90 - d) * 0.008
      const loyaltyPull = pol.beliefs.loyalty * 0.15
      const attractPull = attract * 0.012
      const colonyPull = (vg.isRegionalHub ? 0.25 : 0) + Math.log1p(vg.memberIds.length) * 0.08
      // Score arithmetic unchanged (measure-only factor tags below).
      const score =
        relationsPull +
        distPull +
        loyaltyPull +
        attractPull +
        colonyPull +
        solPull +
        laborPull +
        devPull +
        prosperPull +
        biomePull +
        foodPull -
        crowding * 0.18 -
        faminePenalty
      const reason = topMigrateStageReason([
        { id: 'relations', w: relationsPull },
        { id: 'group', w: loyaltyPull + attractPull },
        { id: 'distance', w: distPull },
        { id: 'colony', w: colonyPull },
        { id: 'needs', w: solPull + laborPull + prosperPull },
        { id: 'resources', w: foodPull + biomePull + devPull },
        { id: 'space', w: Math.max(0, 0.2 - crowding) },
        { id: 'safety', w: Math.max(0, 0.2 - faminePenalty) },
      ])
      if (!best || score > best.score) best = { id: vg.id, score, reason }
    }
    if (best && best.score > 0.35) {
      const vg = state.villages.find((x) => x.id === best!.id)
      if (vg && !vg.memberIds.includes(v.id)) {
        vg.memberIds.push(v.id)
        v.villageId = vg.id
        pol.migrationUrge = clamp01(pol.migrationUrge * 0.4)
        onEthnosMigrateIn(state, v, vg.id)
        noteMigrateDestEval(state, 'rejoin', best.reason, v.id)
        noteMigrateRejoin(state, vg.id, v.id)
        logCause(state, `errance de ${v.name}`, `${v.name} rejoint le village n°${vg.id}`)
      } else {
        noteMigrateDestEval(state, 'fail', best.reason === 'mixed' ? 'score_low' : best.reason, v.id)
      }
    } else {
      noteMigrateDestEval(state, 'fail', best ? 'score_low' : 'no_candidate', v.id)
    }
    return
  }

  if (v.villageId === null) return
  const village = state.villages.find((vg) => vg.id === v.villageId)
  if (!village) return
  const pop = village.memberIds.length
  // Critical-mass retention — still sticky, but high urge / curiosity can found camps.
  const leaveThreshold = pop >= 5 ? 0.86 : pop >= 3 ? 0.78 : 0.7
  // WP11: when urge saturates (~0.94+), retention softens so leave can enact as a *decision*.
  // House/loyalty/elder still hold below saturation — no mass exodus / no CREATE_MIGRATE.
  const saturated = pol.migrationUrge >= 0.94

  if (pol.migrationUrge < leaveThreshold) return
  noteMigrateLeaveAttempt(state, v.id)

  if (v.hasHome && pol.beliefs.loyalty > 0.48 && pol.migrationUrge < leaveThreshold + 0.05 && !saturated) {
    noteMigrateBlocked(state, 'home_loyalty')
    return
  }
  if (lifeRoleOf(v) === 'elder' && pol.migrationUrge < (saturated ? 0.97 : 0.9)) {
    noteMigrateBlocked(state, 'elder')
    return
  }
  // Pre-WP11: absolute curiosity×loyalty gate blocked leave even at urge=1.0 — override at saturation.
  if (!saturated && v.personality.curiosity < 0.38 && pol.beliefs.loyalty > 0.52) {
    noteMigrateBlocked(state, 'low_curiosity')
    return
  }
  // Soft job stickiness: field holders stay unless urge saturates (house/kin/job can keep people).
  if (
    !saturated &&
    v.hasField &&
    (v.profession === 'farmer' || v.profession === 'miller') &&
    pol.migrationUrge < leaveThreshold + 0.08
  ) {
    noteMigrateBlocked(state, 'job_field')
    return
  }

  const cause = inferMigrateLeaveCause(state, v, village)
  const housed = v.hasHome && (v.homeX >= 0 || v.homeY >= 0)
  village.memberIds = village.memberIds.filter((id) => id !== v.id)
  v.villageId = null
  // Housed leavers: keep founding bias (buildHouse soft >0.55). Homeless wanderers
  // also need urge above rejoin floor so leave->camp can enact before rejoin.
  pol.migrationUrge = housed ? 0.62 : 0.55
  onEthnosMigrateOut(state, v)
  noteMigrateLeave(state, cause, { housed, villagerId: v.id })
  // INC-04: leave->foundCamp — secede hearth into a new camp (housed only; design, not bug).
  if (housed) {
    noteMigrateSettlementAttempt(state, 'hasHome', v.id)
    const camp = foundMigrateCamp(state, v, makeRng(((state.tick * 1009 + v.id * 9176) >>> 0) || 1))
    onEthnosMigrateIn(state, v, camp.id)
    noteMigrateFound(state, camp.id, v.id)
    pol.migrationUrge = clamp01(pol.migrationUrge * 0.55)
    logCause(
      state,
      `misère, chômage ou oppression ressentie par ${v.name} [${cause}]`,
      `${v.name} quitte son village et fonde un camp`,
    )
  } else {
    // Intended: homeless leave -> travel -> dest eval -> rejoin|fail (no auto createCamp).
    noteMigrateTravelStart(state, v.id)
    noteMigrateSettleBlocked(state, 'no_home')
    logCause(
      state,
      `misère, chômage ou oppression ressentie par ${v.name} [${cause}]`,
      `${v.name} quitte son village`,
    )
  }
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
    if ((c.kind === 'threat' || c.norms.includes('protect_all')) && village) {
      const hasFort = state.projects.some(
        (p) => p.villageId === village.id && p.phase === 'done' && p.intent.purposes.includes('fortify') && p.footprint.walls.length > 0 && p.intent.scale >= 0.25,
      )
      if (!hasFort || village.wallTier === 'none') {
        reasons = [`institution ${c.name} (gardes)`, 'fortification']
        purposes = ['fortify']
        wood = village.wallTier === 'none' ? 0.62 : 0.25
        stone = village.wallTier === 'wood' ? 0.85 : 0.4
      }
    } else if (
      village &&
      village.memberIds.length >= 4 &&
      ((village.prosperity ?? 0) >= 45 || (village.surplus.stone ?? 0) >= 0.75) &&
      (c.kind === 'elder' || c.norms.includes('maintain_commons') || c.isInstitution)
    ) {
      const hasOpen = state.projects.some(
        (p) => p.villageId === village.id && p.intent.purposes.includes('fortify') && p.phase !== 'done',
      )
      const hasStoneKeep = state.projects.some(
        (p) =>
          p.villageId === village.id &&
          p.phase === 'done' &&
          p.intent.purposes.includes('fortify') &&
          p.params.wallMaterial === 'stone' &&
          p.footprint.walls.length > 0,
      )
      if (!hasOpen && !hasStoneKeep) {
        reasons = [`institution ${c.name} (prospérité)`, 'donjon / fort']
        purposes = ['fortify']
        wood = 0.22
        stone = 0.82
      }
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
    } else if (c.kind === 'faith' || c.creed === 'piete') {
      const vgFaith = village
      const tier = vgFaith?.sacredTier ?? 'none'
      if (tier === 'temple') {
        reasons = null
      } else if (tier === 'chapel') {
        reasons = [`institution ${c.name} (foi)`, 'temple', 'sanctuaire', 'culte']
        purposes = ['temple']
        wood = 0.5
        stone = 0.85
      } else if (tier === 'shrine' || vgFaith?.hasShrine) {
        reasons = [`institution ${c.name} (foi)`, 'chapelle', 'sanctuaire', 'recueillement']
        purposes = ['chapel']
        wood = 0.5
        stone = 0.75
      } else {
        reasons = [`institution ${c.name} (foi)`, 'autel', 'sanctuaire', 'recueillement']
        purposes = ['shrine']
        wood = 0.45
        stone = 0.7
      }
    }
    if (reasons) {
      const fortScale = purposes?.includes('fortify')
        ? (stone ?? 0) >= 0.7
          ? 0.48 + c.legitimacy * 0.22
          : 0.36 + c.legitimacy * 0.14
        : 0.55 + c.legitimacy * 0.25
      const intent = intentFromReasons(reasons, {
        purposes,
        scale: fortScale,
        wood,
        stone,
      })
      const nearX = (village?.centerX ?? leader.x) + (purposes?.includes('fortify') ? 12 : 0)
      const nearY = (village?.centerY ?? leader.y) + (purposes?.includes('fortify') ? 10 : 0)
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
    let banditsNear = 0
    for (const b of state.bandits ?? []) {
      if (b.alive && b.phase === 'raid' && distance(b.x, b.y, vg.centerX, vg.centerY) < 48) banditsNear++
    }
    const externalFeud = members.some((m) => {
      if (m.grudgeTarget === null) return false
      const t = state.villagers.find((o) => o.id === m.grudgeTarget && o.alive)
      return t !== undefined && t.villageId !== vg.id
    })
    const threatened = wolvesNear > 0 || banditsNear > 0 || externalFeud || feelFamine(state, vg)

    vg.inequalityStress = clamp01(vg.inequalityStress * 0.85 + villageInequality(state, vg.id) * 0.15)

    if (threatened) {
      vg.peaceTicks = 0
      vg.cohesion = clamp01(
        vg.cohesion + COHESION_THREAT_GAIN + (wolvesNear > 1 ? 0.02 : 0) + (banditsNear > 0 ? 0.03 : 0),
      )
    } else {
      vg.peaceTicks += 1
      // Long peace + prosperity/inequality → asabiya decay.
      const peaceFactor = Math.min(1, vg.peaceTicks / 12)
      vg.cohesion = clamp01(
        vg.cohesion - COHESION_DECAY_PEACE * peaceFactor - vg.inequalityStress * 0.025 + (feelFamine(state, vg) ? 0 : -0.004),
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
        noteCircleDrop(state)
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
      hasLifeEventKind(peekMind(m.id)?.episodic, m.memories, ['helped', 'saved'], {
        tick: state.tick,
        maxAge: 300,
      }) ||
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

/** Ritual / gathering: faith & village circles reinforce belonging near plaza / shrine. */
function tickRitualGathering(state: SimState, c: Circle) {
  if (c.kind !== 'faith' && c.kind !== 'village' && c.kind !== 'kin') return
  const members = livingMembers(state, c)
  if (members.length < 2) return
  const vg = villageOf(state, c.villageId)
  if (!vg) return
  if (vg.lastRitualTick === undefined) vg.lastRitualTick = 0
  if (state.tick - vg.lastRitualTick < 180) return
  const ax = vg.hasShrine && vg.shrineX >= 0 ? vg.shrineX : vg.centerX
  const ay = vg.hasShrine && vg.shrineY >= 0 ? vg.shrineY : vg.centerY
  let near = 0
  for (const m of members) {
    if (distance(m.x, m.y, ax, ay) < 16) near++
  }
  if (near < 2) return
  if (c.values.piety < 0.35 && c.kind === 'faith') return
  vg.lastRitualTick = state.tick
  vg.cohesion = clamp01(vg.cohesion + 0.035)
  c.cohesion = clamp01(c.cohesion + 0.05)
  for (const m of members) {
    if (distance(m.x, m.y, ax, ay) >= 16) continue
    const pol = politicsOf(m)
    pol.beliefs.loyalty = clamp01(pol.beliefs.loyalty + 0.015)
    pol.beliefs.piety = clamp01(pol.beliefs.piety + 0.015)
    pol.normInternalization = clamp01(pol.normInternalization + 0.012)
    pol.grievance = clamp01(pol.grievance - 0.02)
    pol.creedWeight = clamp01(pol.creedWeight + 0.02)
  }
  rememberCircle(c, c.kind === 'faith' ? 'rite de recueillement' : 'rassemblement commun')
  if (c.kind === 'faith') {
    logCause(state, `rite du ${c.name}`, `le cercle pieux honore le sacré près de la place`)
  } else {
    logCause(state, `rassemblement du ${c.name}`, `le sentiment d'appartenance se renforce`)
  }
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

// ── Polities: village → chiefdom → kingdom (emergent) ────────────────────────

export function polityTierLabel(tier: PolityTier): string {
  return TIER_FR[tier]
}

export function polityTitleLabel(tier: PolityTier): string {
  return TIER_TITLE_FR[tier]
}

function ensurePolitiesArray(state: SimState) {
  if (!state.polities) state.polities = []
  if (state.nextPolityId === undefined || state.nextPolityId < 1) state.nextPolityId = 1
}

function polityOfVillage(state: SimState, villageId: number): Polity | null {
  ensurePolitiesArray(state)
  for (const p of state.polities) {
    if (p.villageIds.includes(villageId)) return p
  }
  return null
}

function polityCentre(state: SimState, p: Polity): { x: number; y: number } {
  const cap = villageOf(state, p.capitalVillageId)
  if (cap) return { x: cap.centerX, y: cap.centerY }
  for (const vid of p.villageIds) {
    const vg = villageOf(state, vid)
    if (vg) return { x: vg.centerX, y: vg.centerY }
  }
  return { x: 0, y: 0 }
}

function polityPop(state: SimState, p: Polity): number {
  let n = 0
  for (const vid of p.villageIds) n += villageMembers(state, vid).length
  return n
}

function polityInstitutions(state: SimState, p: Polity): Circle[] {
  return state.circles.filter((c) => c.isInstitution && c.villageId !== null && p.villageIds.includes(c.villageId))
}

function polityPower(state: SimState, p: Polity): number {
  const pop = polityPop(state, p)
  const inst = polityInstitutions(state, p).length
  const cap = villageOf(state, p.capitalVillageId)
  const walls = cap && cap.wallTier !== 'none' ? 1.2 : 1
  const dev = cap?.development ?? 0.2
  const prosp = (cap?.prosperity ?? 30) / 100
  return pop * 0.35 + inst * 1.4 + p.legitimacy * 2 + p.claimStrength * 1.5 + walls + Math.min(3, dev * 0.25) + prosp
}

function namePolity(state: SimState, tier: PolityTier, capitalId: number, ruler: Villager | null): string {
  const place = `n°${capitalId}`
  const who = ruler ? (ruler.surname ? ruler.surname : ruler.name) : place
  if (tier === 'camp') return `campement ${place}`
  if (tier === 'village') return `village de ${who}`
  if (tier === 'chiefdom') return `chefferie de ${who}`
  return `royaume de ${who}`
}

/** True when a polity capital (or any claimed village) has a stamped keep/donjon. */
function polityHasKeep(state: SimState, p: Polity): boolean {
  for (const vid of p.villageIds) {
    for (const pr of state.projects) {
      if (pr.villageId !== vid) continue
      if (!fortifyIsBuilt(state, pr)) continue
      if (pr.params.towers || pr.params.wallMaterial === 'stone' || pr.intent.scale >= 0.5) return true
    }
  }
  return false
}

function countCastles(state: SimState): number {
  let n = 0
  for (const pr of state.projects) {
    if (!fortifyIsBuilt(state, pr)) continue
    if (pr.params.towers || pr.params.wallMaterial === 'stone' || pr.intent.scale >= 0.5) n++
  }
  return n
}

/**
 * Mid-game / realm path: when pop + wealth (or chiefdom+) allow, sponsor a stone keep
 * via the generative construction continuum — no Castle enum.
 */
function maybeSponsorPolityKeep(state: SimState, p: Polity) {
  if (polityHasKeep(state, p)) return
  const cap = villageOf(state, p.capitalVillageId)
  if (!cap) return
  const pop = polityPop(state, p)
  const prosp = cap.prosperity ?? 0
  const sol = cap.standardOfLiving ?? 0
  const stoneSurplus = cap.surplus.stone ?? 0
  const wealthOk = prosp >= 28 || sol >= 0.28 || stoneSurplus >= 0.35 || pop >= 5
  const tierOk = TIER_RANK[p.tier] >= 1 && (pop >= 4 || TIER_RANK[p.tier] >= 2)
  // Soft mid-game gate: after ~day 10, or sooner if already a chiefdom.
  const midGame = state.tick >= 10 * 72 || TIER_RANK[p.tier] >= 2
  // Forced mid-game path: settled village with no keep yet still gets a donjon order.
  const forcedMid = state.tick >= 15 * 72 && pop >= 4
  if (!midGame && !forcedMid) return
  if (!wealthOk && !forcedMid) return
  if (!tierOk && !forcedMid) return
  if ((state.tick + p.id * 11) % POLITY_TICK !== 0) return

  const openFort = state.projects.some(
    (pr) => pr.villageId === cap.id && pr.phase !== 'done' && pr.intent.purposes.includes('fortify'),
  )
  if (openFort) return

  const scale =
    TIER_RANK[p.tier] >= 3
      ? 0.82
      : TIER_RANK[p.tier] >= 2
        ? 0.68
        : forcedMid && !wealthOk
          ? 0.55
          : pop >= 8
            ? 0.62
            : 0.52
  const intent = intentFromReasons(
    [
      TIER_RANK[p.tier] >= 2
        ? `autorité de ${p.name}`
        : forcedMid
          ? `essor du village n°${cap.id}`
          : `prospérité du village n°${cap.id}`,
      'keep / donjon',
      'siège du pouvoir',
    ],
    {
      purposes: ['fortify'],
      scale,
      wood: 0.2,
      stone: 0.88,
    },
  )
  const project = enqueueBuildProject(state, intent, {
    ownerId: null,
    villageId: cap.id,
    nearX: cap.centerX + 14,
    nearY: cap.centerY + 12,
    laborHint: 1.4 + p.legitimacy,
  })
  if (project) {
    logCause(
      state,
      `richesse et population sous ${p.name}`,
      `le ${TIER_TITLE_FR[p.tier]} ordonne un ${project.label}`,
    )
  }
}

function createPolityForVillage(state: SimState, vg: Village): Polity | null {
  ensurePolitiesArray(state)
  if (state.polities.length >= MAX_POLITIES) return null
  if (polityOfVillage(state, vg.id)) return null
  const members = villageMembers(state, vg.id)
  if (members.length === 0) return null
  const notable = villageNotable(state, vg.id)
  const tier: PolityTier = members.length >= 4 && (vg.development ?? 0) > 0.5 ? 'village' : 'camp'
  const p: Polity = {
    id: state.nextPolityId++,
    name: namePolity(state, tier, vg.id, notable),
    tier,
    villageIds: [vg.id],
    capitalVillageId: vg.id,
    rulerId: notable?.id ?? null,
    legitimacy: 0.32 + (notable ? politicsOf(notable).legitimacy * 0.25 : 0),
    claimRadius: tier === 'village' ? 22 : 14,
    claimStrength: 0.2,
    rivalPolityIds: [],
    formedTick: state.tick,
    lastRulerChangeTick: state.tick,
    lastTierChangeTick: state.tick,
    authorityBasis: notable
      ? pickAuthorityBasis(state, notable, {
          kind: 'village',
          authorityBasis: 'tradition',
        } as Circle)
      : 'tradition',
  }
  state.polities.push(p)
  logCause(
    state,
    `regroupement autour du village ${placeLabel(vg)}`,
    `naissance du ${TIER_FR[tier]} « ${p.name} »`,
  )
  return p
}

function placeLabel(vg: Village): string {
  return `n°${vg.id}`
}

function ensureVillagePolities(state: SimState) {
  ensurePolitiesArray(state)
  for (const vg of state.villages) {
    if (villageMembers(state, vg.id).length === 0) continue
    if (!polityOfVillage(state, vg.id)) createPolityForVillage(state, vg)
  }
  // Drop empty / orphan polities.
  for (let i = state.polities.length - 1; i >= 0; i--) {
    const p = state.polities[i]
    p.villageIds = p.villageIds.filter((vid) => state.villages.some((v) => v.id === vid))
    if (p.villageIds.length === 0 || polityPop(state, p) === 0) {
      state.polities.splice(i, 1)
      continue
    }
    if (!p.villageIds.includes(p.capitalVillageId)) p.capitalVillageId = p.villageIds[0]
  }
}

function pickPolityRuler(state: SimState, p: Polity): Villager | null {
  const inst = polityInstitutions(state, p).sort((a, b) => b.legitimacy - a.legitimacy)
  for (const c of inst) {
    if (c.leaderId === null) continue
    const leader = state.villagers.find((v) => v.id === c.leaderId && v.alive)
    if (leader && p.villageIds.includes(leader.villageId ?? -1)) return leader
  }
  let best: Villager | null = null
  let bestScore = -Infinity
  for (const vid of p.villageIds) {
    const n = villageNotable(state, vid)
    if (!n) continue
    const s = influenceScore(state, n) + politicsOf(n).legitimacy * 0.5
    if (s > bestScore) {
      bestScore = s
      best = n
    }
  }
  return best
}

function setPolityRuler(state: SimState, p: Polity, next: Villager | null, reason: string) {
  const prevId = p.rulerId
  if (next === null) {
    if (prevId !== null) {
      p.rulerId = null
      p.lastRulerChangeTick = state.tick
      logCause(state, reason, `le ${TIER_FR[p.tier]} « ${p.name} » n'a plus de ${TIER_TITLE_FR[p.tier]}`)
    }
    return
  }
  if (prevId === next.id) return
  const prev = prevId !== null ? state.villagers.find((v) => v.id === prevId) : null
  p.rulerId = next.id
  p.lastRulerChangeTick = state.tick
  p.authorityBasis = pickAuthorityBasis(state, next, {
    kind: 'village',
    authorityBasis: p.authorityBasis,
  } as Circle)
  p.name = namePolity(state, p.tier, p.capitalVillageId, next)
  p.legitimacy = clamp01(p.legitimacy * 0.7 + 0.2)
  const title = TIER_TITLE_FR[p.tier]
  if (prev && prev.alive) {
    logCause(
      state,
      reason,
      `${next.name} devient ${title} du ${TIER_FR[p.tier]} « ${p.name} » (succède à ${prev.name})`,
    )
    spawnRumor(state, 'succession', next, prev, 0.75, `${next.name} succède à ${prev.name} à la tête de ${p.name}`)
    const sameLine =
      (prev.lineageId != null && prev.lineageId === next.lineageId) ||
      (prev.familyId != null && prev.familyId === next.familyId) ||
      prev.surname === next.surname
    const martial =
      prev.profession === 'guard' ||
      next.profession === 'guard' ||
      politicsOf(prev).grievance > 0.4 ||
      TIER_RANK[p.tier] >= 2
    if (sameLine && martial) {
      logCause(
        state,
        `transmission du pouvoir militaire dans la lignée ${next.surname}`,
        `dynastie militaire : ${next.name} reprend ${prev.name}`,
      )
    }
  } else {
    logCause(state, reason, `${next.name} devient ${title} du ${TIER_FR[p.tier]} « ${p.name} »`)
    spawnRumor(state, 'succession', next, null, 0.55, `${next.name} prend la tête de ${p.name}`)
  }
}

function refreshPolityRuler(state: SimState, p: Polity) {
  const next = pickPolityRuler(state, p)
  if (!next) {
    setPolityRuler(state, p, null, 'vide de pouvoir')
    return
  }
  if (p.rulerId === null) {
    setPolityRuler(state, p, next, 'émergence d\'une figure d\'autorité')
    return
  }
  if (p.rulerId === next.id) return
  const current = state.villagers.find((v) => v.id === p.rulerId && v.alive)
  if (!current) {
    setPolityRuler(state, p, next, `disparition du ${TIER_TITLE_FR[p.tier]}`)
    return
  }
  // Soft contest: only replace if challenger clearly stronger or legitimacy collapsed.
  const curScore = influenceScore(state, current) + politicsOf(current).legitimacy
  const nextScore = influenceScore(state, next) + politicsOf(next).legitimacy
  if (p.legitimacy < 0.28 || nextScore > curScore + 0.22) {
    setPolityRuler(state, p, next, `contestation d'autorité (${AUTHORITY_FR[p.authorityBasis]})`)
  }
}

function desiredTier(state: SimState, p: Polity): PolityTier {
  const pop = polityPop(state, p)
  const inst = polityInstitutions(state, p).length
  const villages = p.villageIds.length
  const cap = villageOf(state, p.capitalVillageId)
  const coh = cap?.cohesion ?? 0.35
  const walls = cap && cap.wallTier !== 'none'
  const keep = polityHasKeep(state, p)
  const age = state.tick - p.formedTick
  const prosp = cap?.prosperity ?? 0

  // Keep + institutions crystallise a lord's realm (chief → seigneur).
  if (
    (villages >= 2 && inst >= 1 && p.legitimacy > 0.35) ||
    (keep && inst >= 1 && pop >= 6 && p.legitimacy > 0.32) ||
    (inst >= 2 && pop >= 8 && p.claimStrength > 0.4 && coh > 0.35) ||
    (inst >= 2 && pop >= 7 && walls && prosp >= 40) ||
    (inst >= 3 && pop >= 6 && walls)
  ) {
    return 'kingdom'
  }
  if (
    (inst >= 1 && pop >= 3 && p.legitimacy > 0.28) ||
    (inst >= 1 && walls && pop >= 3) ||
    (keep && pop >= 3) ||
    (pop >= 5 && age > 360 && coh > 0.35) ||
    (prosp >= 36 && pop >= 4 && inst >= 1) ||
    (inst >= 1 && age > 720 && pop >= 4)
  ) {
    return 'chiefdom'
  }
  if (pop >= 2 || (cap && (cap.development ?? 0) > 0.5) || inst >= 1) return 'village'
  return 'camp'
}

function applyTierChange(state: SimState, p: Polity, next: PolityTier) {
  if (next === p.tier) return
  const prev = p.tier
  const prevName = p.name
  // Don't thrash: one rank step at a time unless long-stable.
  if (Math.abs(TIER_RANK[next] - TIER_RANK[prev]) > 1 && state.tick - p.lastTierChangeTick < 400) {
    if (TIER_RANK[next] > TIER_RANK[prev]) {
      next = prev === 'camp' ? 'village' : prev === 'village' ? 'chiefdom' : prev === 'chiefdom' ? 'kingdom' : prev
    } else {
      next = prev === 'kingdom' ? 'chiefdom' : prev === 'chiefdom' ? 'village' : prev === 'village' ? 'camp' : prev
    }
  }
  if (next === p.tier) return
  p.tier = next
  p.lastTierChangeTick = state.tick
  const ruler = p.rulerId !== null ? state.villagers.find((v) => v.id === p.rulerId && v.alive) : null
  p.name = namePolity(state, next, p.capitalVillageId, ruler ?? null)
  if (TIER_RANK[next] > TIER_RANK[prev]) {
    p.legitimacy = clamp01(p.legitimacy + 0.08)
    p.claimStrength = clamp01(p.claimStrength + 0.1)
    logCause(
      state,
      `institutions et influence du ${TIER_FR[prev]} « ${prevName} »`,
      `le pouvoir se durcit en ${TIER_FR[next]} « ${p.name} »`,
    )
    if (
      (next === 'chiefdom' || next === 'kingdom') &&
      !state.milestones.firstRealm
    ) {
      state.milestones.firstRealm = true
      const title = TIER_TITLE_FR[next]
      logCause(
        state,
        `cristallisation d'un pouvoir territorial`,
        `premier ${TIER_FR[next]} — ${ruler ? `${title} ${ruler.name}` : p.name}`,
      )
    }
    if (next === 'kingdom' && prev === 'chiefdom' && ruler) {
      logCause(
        state,
        `la chefferie de ${ruler.name} s'affirme`,
        `${ruler.name} devient seigneur du ${p.name}`,
      )
    }
  } else {
    p.legitimacy = clamp01(p.legitimacy - 0.06)
    logCause(
      state,
      `affaiblissement du ${TIER_FR[prev]} « ${prevName} »`,
      `repli vers un ${TIER_FR[next]} « ${p.name} »`,
    )
  }
}

function refreshPolityClaims(state: SimState, p: Polity) {
  const pop = polityPop(state, p)
  const inst = polityInstitutions(state, p)
  const enf = inst.reduce((a, c) => a + c.enforcement, 0) / Math.max(1, inst.length)
  const keep = polityHasKeep(state, p)
  const base =
    p.tier === 'camp' ? 14 : p.tier === 'village' ? 22 : p.tier === 'chiefdom' ? 34 : 48
  p.claimRadius = base + Math.min(18, pop * 0.9) + enf * 10 + (keep ? 10 : 0)
  p.claimStrength = clamp01(
    0.15 +
      p.legitimacy * 0.35 +
      enf * 0.25 +
      Math.min(0.25, pop / 40) +
      (inst.length > 0 ? 0.08 : 0) +
      TIER_RANK[p.tier] * 0.06 +
      (keep ? 0.12 : 0),
  )
  // Sync polity legitimacy toward institutions / ruler.
  let instLeg = 0
  for (const c of inst) instLeg += c.legitimacy
  if (inst.length > 0) instLeg /= inst.length
  else instLeg = 0.3
  const ruler = p.rulerId !== null ? state.villagers.find((v) => v.id === p.rulerId && v.alive) : null
  const rulerLeg = ruler ? politicsOf(ruler).legitimacy : 0.25
  p.legitimacy = clamp01(p.legitimacy * 0.85 + instLeg * 0.1 + rulerLeg * 0.05)
  const famineHits = p.villageIds.filter((vid) => feelFamine(state, villageOf(state, vid))).length
  if (famineHits > 0) {
    // Famine erodes legitimacy hard — feeds revolt / coup path (Spec A).
    p.legitimacy = clamp01(p.legitimacy - (0.035 + Math.min(0.04, famineHits * 0.02)))
  }
  // Active war stress on either side of this polity.
  const wars = state.wars ?? []
  const atWar = wars.some(
    (w) =>
      (w.status === 'open' || w.status === 'skirmish') &&
      (w.aId === p.id || w.bId === p.id),
  )
  if (atWar) {
    p.legitimacy = clamp01(p.legitimacy - 0.025)
    if (ruler) politicsOf(ruler).grievance = clamp01(politicsOf(ruler).grievance + 0.02)
  }
}

function tickPolityRivals(state: SimState) {
  ensurePolitiesArray(state)
  for (const p of state.polities) p.rivalPolityIds = []
  for (let i = 0; i < state.polities.length; i++) {
    const a = state.polities[i]
    const ac = polityCentre(state, a)
    for (let j = i + 1; j < state.polities.length; j++) {
      const b = state.polities[j]
      const bc = polityCentre(state, b)
      const d = distance(ac.x, ac.y, bc.x, bc.y)
      const overlap = a.claimRadius + b.claimRadius - d
      if (overlap < 4) continue
      a.rivalPolityIds.push(b.id)
      b.rivalPolityIds.push(a.id)
      // Contested frontier pressure.
      if ((state.tick + a.id * 7 + b.id) % (POLITY_TICK * 3) < POLITY_TICK) {
        const tension = clamp01(overlap / Math.max(8, a.claimRadius + b.claimRadius))
        // Soft scarcity×rivalry nudge (no war): famine on either side amplifies
        // frontier grievance + rivalry rumor so existing confront/bandit paths fire more often.
        const scarcity =
          a.villageIds.some((vid) => feelFamine(state, villageOf(state, vid))) ||
          b.villageIds.some((vid) => feelFamine(state, villageOf(state, vid)))
        const griefNudge = tension * 0.03 * (scarcity ? 1.65 : 1)
        a.legitimacy = clamp01(a.legitimacy - tension * 0.02)
        b.legitimacy = clamp01(b.legitimacy - tension * 0.02)
        if (scarcity) {
          // Weaker claim erodes slightly under contested scarcity (feeds absorb, not armies).
          if (a.claimStrength <= b.claimStrength) {
            a.claimStrength = clamp01(a.claimStrength - tension * 0.035)
          } else {
            b.claimStrength = clamp01(b.claimStrength - tension * 0.035)
          }
        }
        for (const vid of a.villageIds.slice(0, 1)) {
          for (const v of villageMembers(state, vid).slice(0, 2)) {
            politicsOf(v).grievance = clamp01(politicsOf(v).grievance + griefNudge)
          }
        }
        for (const vid of b.villageIds.slice(0, 1)) {
          for (const v of villageMembers(state, vid).slice(0, 2)) {
            politicsOf(v).grievance = clamp01(politicsOf(v).grievance + griefNudge)
          }
        }
        logCause(
          state,
          `prétentions territoriales entre « ${a.name} » et « ${b.name} »`,
          scarcity ? 'rivalité de pouvoirs sous disette' : 'rivalité de pouvoirs voisins',
        )
        const ar = a.rulerId !== null ? state.villagers.find((v) => v.id === a.rulerId && v.alive) : null
        const br = b.rulerId !== null ? state.villagers.find((v) => v.id === b.rulerId && v.alive) : null
        if (ar && br) {
          spawnRumor(
            state,
            'rivalry',
            ar,
            br,
            0.55 + tension * 0.3 + (scarcity ? 0.12 : 0),
            `${a.name} conteste les terres de ${b.name}`,
          )
        } else if (ar) {
          spawnRumor(state, 'territory', ar, null, 0.5 + (scarcity ? 0.08 : 0), `${a.name} étend ses prétentions`)
        }
      }
    }
  }
}

function maybeAbsorbPolities(state: SimState) {
  ensurePolitiesArray(state)
  // Stronger polity may absorb a weak rival whose capital sits inside its claim.
  for (let i = state.polities.length - 1; i >= 0; i--) {
    const weak = state.polities[i]
    if (weak.tier === 'kingdom') continue
    const wc = polityCentre(state, weak)
    let absorber: Polity | null = null
    let best = -Infinity
    for (const strong of state.polities) {
      if (strong.id === weak.id) continue
      if (!strong.rivalPolityIds.includes(weak.id) && TIER_RANK[strong.tier] < 2) continue
      const sc = polityCentre(state, strong)
      const d = distance(sc.x, sc.y, wc.x, wc.y)
      if (d > strong.claimRadius * 0.85) continue
      if (weak.legitimacy > 0.42 && weak.claimStrength > strong.claimStrength * 0.7) continue
      const gap = polityPower(state, strong) - polityPower(state, weak)
      if (gap < 2.5) continue
      if (gap > best) {
        best = gap
        absorber = strong
      }
    }
    if (!absorber) continue
    if ((state.tick + weak.id * 13) % (POLITY_TICK * 4) >= POLITY_TICK) continue
    for (const vid of weak.villageIds) {
      if (!absorber.villageIds.includes(vid)) absorber.villageIds.push(vid)
    }
    absorber.claimStrength = clamp01(absorber.claimStrength + 0.08)
    absorber.legitimacy = clamp01(absorber.legitimacy + 0.04)
    logCause(
      state,
      `faiblesse de « ${weak.name} » face à « ${absorber.name} »`,
      `les villages passent sous la prétention de ${absorber.name}`,
    )
    const wr =
      weak.rulerId !== null
        ? (state.villagers.find((v) => v.id === weak.rulerId && v.alive) ?? null)
        : null
    const sr =
      absorber.rulerId !== null
        ? (state.villagers.find((v) => v.id === absorber.rulerId && v.alive) ?? null)
        : null
    if (sr) spawnRumor(state, 'territory', sr, wr, 0.7, `${absorber.name} absorbe ${weak.name}`)
    // Promote absorber if multi-village.
    if (absorber.villageIds.length >= 2 && absorber.tier === 'chiefdom') {
      applyTierChange(state, absorber, 'kingdom')
    } else if (absorber.villageIds.length >= 2 && TIER_RANK[absorber.tier] < 2) {
      applyTierChange(state, absorber, 'chiefdom')
    }
    state.polities.splice(i, 1)
  }
}

function tickSuccessionContests(state: SimState, p: Polity) {
  if (p.rulerId === null) return
  if (state.tick - p.lastRulerChangeTick < 160) return
  const ruler = state.villagers.find((v) => v.id === p.rulerId && v.alive)
  if (!ruler) return
  const famineStress = p.villageIds.some((vid) => feelFamine(state, villageOf(state, vid)))
  const wars = state.wars ?? []
  const warStress = wars.some(
    (w) =>
      (w.status === 'open' || w.status === 'skirmish') &&
      (w.aId === p.id || w.bId === p.id),
  )
  const stress = famineStress || warStress || p.legitimacy < 0.4
  // Soft contests — succession / soft coups stay visible mid-game (Spec A revolts).
  // Under famine/war/low legitimacy, contests fire even without personal grievance cliff.
  if (!stress && p.legitimacy > 0.52 && politicsOf(ruler).grievance < 0.22) return
  if (stress) {
    // Causal revolt pressure: famine/war raise challenger grievance before contest.
    for (const vid of p.villageIds.slice(0, 2)) {
      for (const m of villageMembers(state, vid).slice(0, 6)) {
        if (m.id === ruler.id) continue
        if (m.personality.ambition < 0.35) continue
        politicsOf(m).grievance = clamp01(
          politicsOf(m).grievance + (famineStress ? 0.045 : 0.025) + (warStress ? 0.03 : 0),
        )
      }
    }
    p.legitimacy = clamp01(p.legitimacy - (famineStress ? 0.03 : 0.015) - (warStress ? 0.02 : 0))
  }
  const challengers: Villager[] = []
  const ambitionFloor = stress ? 0.32 : 0.4
  for (const c of polityInstitutions(state, p)) {
    for (const m of livingMembers(state, c)) {
      if (m.id === ruler.id) continue
      if (m.personality.ambition < ambitionFloor) continue
      if (influenceScore(state, m) + (stress ? 0.12 : 0.05) < influenceScore(state, ruler)) continue
      challengers.push(m)
    }
  }
  if (challengers.length === 0) {
    // Fallback: any ambitious notable in the polity.
    for (const vid of p.villageIds) {
      for (const m of villageMembers(state, vid)) {
        if (m.id === ruler.id || m.personality.ambition < (stress ? 0.38 : 0.5)) continue
        if (influenceScore(state, m) > influenceScore(state, ruler) * (stress ? 0.78 : 0.88)) {
          challengers.push(m)
        }
      }
    }
  }
  if (challengers.length === 0) return
  challengers.sort((a, b) => influenceScore(state, b) - influenceScore(state, a))
  const ch = challengers[0]
  politicsOf(ch).grievance = clamp01(politicsOf(ch).grievance + (stress ? 0.12 : 0.08))
  politicsOf(ruler).grievance = clamp01(politicsOf(ruler).grievance + 0.05)
  adjustRelation(ch, ruler.id, -0.1, -0.06, state.tick)
  adjustRelation(ruler, ch.id, -0.1, -0.06, state.tick)
  const canTopple =
    influenceScore(state, ch) >= influenceScore(state, ruler) * (stress ? 0.92 : 1) ||
    p.legitimacy < (stress ? 0.42 : 0.32) ||
    (famineStress && politicsOf(ch).grievance >= 0.35)
  if (canTopple) {
    const prev = ruler
    const cause = famineStress
      ? `revolte de famine dans ${p.name}`
      : warStress
        ? `coup sous stress de guerre dans ${p.name}`
        : `lutte d'influence dans ${p.name}`
    setPolityRuler(state, p, ch, cause)
    if (
      politicsOf(ch).grievance >= (stress ? 0.28 : 0.4) ||
      p.legitimacy < (stress ? 0.42 : 0.32) ||
      famineStress
    ) {
      tryRecordCoup(state, p, ch, prev, cause)
    }
  } else if ((state.tick + p.id) % (POLITY_TICK * (stress ? 1 : 2)) < POLITY_TICK) {
    logCause(state, `ambition de ${ch.name}`, `tension de succession au ${TIER_FR[p.tier]} « ${p.name} »`)
    spawnRumor(state, 'succession', ch, ruler, 0.6 + (stress ? 0.15 : 0), `${ch.name} défie ${ruler.name}`)
  }
}

function tickPolities(state: SimState) {
  ensurePolitiesArray(state)
  ensureVillagePolities(state)
  for (const p of state.polities) {
    refreshPolityClaims(state, p)
    refreshPolityRuler(state, p)
    applyTierChange(state, p, desiredTier(state, p))
    maybeSponsorPolityKeep(state, p)
    tickSuccessionContests(state, p)
  }
  tickPolityRivals(state)
  tickPolityWars(state)
  maybeAbsorbPolities(state)
}

function handlePolityDeath(state: SimState, victim: Villager) {
  ensurePolitiesArray(state)
  for (const p of state.polities) {
    if (p.rulerId !== victim.id) continue
    p.legitimacy = clamp01(p.legitimacy - 0.2)
    p.claimStrength = clamp01(p.claimStrength - 0.08)
    const heir = pickPolityRuler(state, p)
    if (heir && heir.id !== victim.id) {
      setPolityRuler(state, p, heir, `mort de ${victim.name}`)
    } else {
      setPolityRuler(state, p, null, `mort de ${victim.name}`)
      logCause(state, `mort du ${TIER_TITLE_FR[p.tier]} ${victim.name}`, `crise de succession au ${TIER_FR[p.tier]} « ${p.name} »`)
    }
  }
}

// ── Main tick ────────────────────────────────────────────────────────────────

export function tickPolitics(state: SimState) {
  // WP11: per-villager BELIEF_TICK stagger (not nested with tick%BELIEF_TICK — that
  // only fired for id%48===0 and left urge spikes from ethnos/bandits unenacted).
  const perf = getSimPerfBudget()
  const highPop = state.villagers.length >= 280
  // Max@500: keep soft belief thin until sustained >=110 — unlocking at 85 re-cliffs slices.
  const beliefPeriod =
    highPop && (perf.lastTps <= 0 || perf.lastTps < 110)
      ? BELIEF_TICK * (perf.lastTps > 0 && perf.lastTps >= 95 ? 3 : 5)
      : BELIEF_TICK
  const skipSoftBelief = highPop && (perf.lastTps <= 0 || perf.lastTps < 110)
  if (!skipSoftBelief || state.tick % (BELIEF_TICK * 2) === 0) {
    for (const v of state.villagers) {
      if (!v.alive) continue
      if ((state.tick + v.id * 13) % beliefPeriod !== 0) continue
      if (!(skipSoftBelief && (state.tick + v.id) % 2 === 1)) {
        tickMigration(state, v)
      }
      tickIndividualPolitics(state, v)
    }
  }
  if (state.tick % BELIEF_TICK === 0) {
    // Soft faith drift / creed crystallisation on belief cadence.
    tickReligionWorld(state)
  }

  if (state.tick % RUMOR_TICK === 0) tickRumors(state)

  if (state.tick % CIRCLE_TICK !== 0) return

  pruneCircles(state)
  trySpawnCircles(state)
  tickVillageCohesion(state)
  tickContactZones(state)

  // Under low TPS: stagger soft circle work (rituals/commons) without dropping institutions.
  const stagger = perf.politicsStagger

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
    const skipSoft =
      stagger &&
      !c.isInstitution &&
      (highPop
        ? ((c.id + state.tick) & 3) !== 0
        : ((c.id + state.tick) & 1) === 1)
    if (!skipSoft) {
      tickPooledResources(state, c)
      tickCommonsAction(state, c)
      tickRitualGathering(state, c)
    }
    tickInstitutionEffects(state, c)
  }

  // Polities evolve on a slower cadence after circles/institutions settle.
  if (state.tick % POLITY_TICK === 0) tickPolities(state)
}

// ── UI helpers ───────────────────────────────────────────────────────────────

export type PolitySummaryRow = {
  id: number
  name: string
  tier: PolityTier
  tierLabel: string
  titleLabel: string
  rulerName: string | null
  legitimacy: number
  villages: number
  rivals: number
  claimRadius: number
  claimStrength: number
}

export function politicsSummary(state: SimState): {
  circles: number
  institutions: number
  guilds: number
  councils: number
  laws: { id: string; label: string; count: number }[]
  rumors: number
  leadingName: string | null
  leadingLegitimacy: number
  polities: number
  chiefdoms: number
  kingdoms: number
  castles: number
  camps: number
  polityRows: PolitySummaryRow[]
  wars: ReturnType<typeof warsSummary>
} {
  ensurePolitiesArray(state)
  let leadingName: string | null = null
  let leadingLegitimacy = 0
  let institutions = 0
  let guilds = 0
  let councils = 0
  const lawCounts = new Map<NormId, number>()
  for (const c of state.circles) {
    if (c.isInstitution) institutions++
    if (c.isGuild) guilds++
    if (c.isInstitution && (c.kind === 'elder' || c.kind === 'village' || c.name.startsWith('conseil'))) {
      councils++
    }
    for (const n of c.norms) lawCounts.set(n, (lawCounts.get(n) ?? 0) + 1)
    if (c.legitimacy > leadingLegitimacy && c.leaderId !== null) {
      leadingLegitimacy = c.legitimacy
      const leader = state.villagers.find((v) => v.id === c.leaderId)
      leadingName = leader ? `${leader.name} (${c.name})` : c.name
    }
  }
  const laws = [...lawCounts.entries()]
    .map(([id, count]) => ({ id, label: NORM_FR[id] ?? id, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, 'fr'))
    .slice(0, 8)

  let chiefdoms = 0
  let kingdoms = 0
  let camps = 0
  const polityRows: PolitySummaryRow[] = []
  for (const p of state.polities) {
    if (p.tier === 'chiefdom') chiefdoms++
    if (p.tier === 'kingdom') kingdoms++
    if (p.tier === 'camp') camps++
    const ruler = p.rulerId !== null ? state.villagers.find((v) => v.id === p.rulerId && v.alive) : null
    if (p.legitimacy > leadingLegitimacy && ruler) {
      leadingLegitimacy = p.legitimacy
      leadingName = `${ruler.name} — ${TIER_TITLE_FR[p.tier]} de ${p.name}`
    }
    polityRows.push({
      id: p.id,
      name: p.name,
      tier: p.tier,
      tierLabel: TIER_FR[p.tier],
      titleLabel: TIER_TITLE_FR[p.tier],
      rulerName: ruler?.name ?? null,
      legitimacy: p.legitimacy,
      villages: p.villageIds.length,
      rivals: p.rivalPolityIds.length,
      claimRadius: Math.round(p.claimRadius),
      claimStrength: p.claimStrength,
    })
  }
  polityRows.sort((a, b) => {
    if (TIER_RANK[b.tier] !== TIER_RANK[a.tier]) return TIER_RANK[b.tier] - TIER_RANK[a.tier]
    return b.legitimacy - a.legitimacy
  })

  return {
    circles: state.circles.length,
    institutions,
    guilds,
    councils,
    laws,
    rumors: state.rumors.length,
    leadingName,
    leadingLegitimacy,
    polities: state.polities.length,
    chiefdoms,
    kingdoms,
    castles: countCastles(state),
    camps,
    polityRows,
    wars: warsSummary(state),
  }
}

export { CREED_FR, NORM_FR, KIND_FR, TIER_FR }
