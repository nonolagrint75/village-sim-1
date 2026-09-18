/**
 * CP2 A→B causality counters (§22).
 * Stage counters: A produces → B consumes/reacts → observable consequence.
 * Incomplete chains stay CONNECTION_NOT_PROVEN / NOT_TESTED — never auto-PASS.
 * No CREATE_*, no famine induction, no farm/mill/softmax changes.
 */
import type { SimState } from './types'

export type CausalityHelpKind = 'food' | 'teach' | 'defend' | 'build' | 'haul' | 'labor'

/** Probe-facing chain labels (honest; never PASS from instrumentation alone). */
export type CausalityChainLabel =
  | 'NOT_TESTED'
  | 'CONNECTION_NOT_PROVEN'
  | 'PARTIAL'
  | 'WIRED'

/** True teach→skill→future-use sample (decisionExact-linked). */
export type PriceChainSample = {
  tick: number
  day: number
  stage: 'priceDelta' | 'taskShift' | 'professionShift'
  resource?: string
  npcId?: number
  taskKind?: string
  prevProfession?: string
  nextProfession?: string
  priceBefore?: number
  priceAfter?: number
  /** Controlled TEST SETUP id when present; absent/null = natural path. */
  shockId?: string | null
}

export type TeachTrueLaterSample = {
  tick: number
  day: number
  teacherId: number
  receiverId: number
  skill: string
  skillBefore: number
  skillAfter: number
  learningEventId: number
  futureAction: string
  futureSkillUse: string
  decisionExactId: number
}

/** DP12: family/kin material bias on soft decision. */
export type FamilyDecisionSample = {
  tick: number
  day: number
  npcId: number
  kind: string
  kinship?: number
  familyValue?: number
}

/** DP12: help chain sample ring. */
export type HelpChainSample = {
  tick: number
  day: number
  kind: CausalityHelpKind
  helperId: number
  outcome: boolean
}

/** DP12: migrate stage sample ring. */
export type MigrateChainSample = {
  tick: number
  day: number
  stage: string
  npcId?: number
  reason?: string
}

type TeachPendingReceipt = {
  teacherId: number
  pupilId: number
  skill: string
  skillBefore: number
  skillAfter: number
  learningEventId: number
  untilTick: number
}

export type CausalityCounters = {
  /** (1) harvest → grind → bake → eat/stock */
  foodHarvestProduces: number
  foodGrindConsumes: number
  foodBakeConsumes: number
  foodEatConsequences: number
  foodStockConsequences: number
  foodNpcCount: number
  /** (2) teachCraft → skillΔ → later skill-matched use */
  teachEvents: number
  teachSkillChanges: number
  /** DEBUG/proxy: any skill-matched later use within TTL (incl. social). */
  teachLaterUses: number
  /** True chain: taught productive skill reused on a later successful action. */
  teachTrueLaterUses: number
  teachNpcCount: number
  /** Compact true-chain samples for TEST evidence. */
  teachTrueLaterSamples?: TeachTrueLaterSample[]
  /** (3) creedChange → behavior followup (mirrors societyCounters) */
  creedChanges: number
  creedFollowups: number
  /** Distinct NPCs with creed change and/or followup (fixes npcs=0 label bug). */
  creedNpcCount: number
  /**
   * DP11 culture continuity (measure-only; no birth creed force):
   * parent belief → child acquires matching creed → child behavior → later gen.
   */
  creedParentChildTransmissions: number
  creedChildBehaviorInfluenced: number
  /** Max living-ancestor creed-match depth at a parent→child acquisition (1=parent, 2=grandparent…). */
  creedGenDepthMax: number
  /** Acquisitions with depth >= 1 (two generations linked). */
  creedGen2Events: number
  /** Acquisitions with depth >= 2 (three generations linked). */
  creedGen3Events: number
  /** (4) migrateUrge -> leaveAttempt -> leave -> travel -> destEval -> settle -> camp|rejoin|fail */
  migrateUrgeCrosses: number
  migrateLeaveAttempts: number
  migrateLeaves: number
  migrateFoundCamps: number
  /** DP7 stage split / funnel (measure-first; no auto createCamp). */
  migrateHomelessLeave: number
  migrateHousedLeave: number
  migrateTravelStarts: number
  migrateDestEvals: number
  migrateSettlementAttempts: number
  migrateRejoins: number
  migrateFails: number
  migrateDestReasons: Record<string, number>
  migrateSettleReasons: Record<string, number>
  /** (5) priceDelta -> profession/task shift */
  priceDeltaEvents: number
  priceTaskShifts: number
  priceProfessionShifts: number
  /** Distinct NPCs in price->task/prof samples (DP9). */
  priceNpcCount: number
  /** Compact chain samples for CHAIN evidence (capped). */
  priceChainSamples?: PriceChainSample[]
  /** Active controlled shock id (TEST SETUP); undefined/null = natural. */
  priceActiveShockId?: string | null
  /** Deltas/shifts tagged while a controlled shock is active. */
  priceShockTaggedDeltas: number
  priceShockLinkedTaskShifts: number
  priceShockLinkedProfessionShifts: number
  /** (6) help_* → outcome */
  helpEvents: number
  helpOutcomes: number
  helpEventsByKind: Record<CausalityHelpKind, number>
  helpOutcomesByKind: Record<CausalityHelpKind, number>
  /** DP8: soft/hard situations where unarmed ward near threat + armed self. */
  defendHelpOpportunities: number
  /** DP8: help_defend enacted (engage protect / soft defend / creditRescue). */
  defendHelpTaken: number
  /** DP12: distinct helpers in help chain (fixes npc=0 floor bug). */
  helpNpcCount: number
  helpChainSamples?: HelpChainSample[]
  /** DP12: family/kin material decision uses. */
  familyDecisionUses: number
  familyDecisionNpcCount: number
  familyDecisionSamples?: FamilyDecisionSample[]
  /** DP12: distinct NPCs in migrate stages. */
  migrateNpcCount: number
  migrateChainSamples?: MigrateChainSample[]
  /** Runtime NPC sets (stripped in snapshot). */
  _foodNpcIds?: Set<number>
  _teachNpcIds?: Set<number>
  _priceNpcIds?: Set<number>
  _creedNpcIds?: Set<number>
  _helpNpcIds?: Set<number>
  _familyNpcIds?: Set<number>
  _migrateNpcIds?: Set<number>
}

const EMPTY_HELP: Record<CausalityHelpKind, number> = {
  food: 0,
  teach: 0,
  defend: 0,
  build: 0,
  haul: 0,
  labor: 0,
}

/** Pupil id → ring of pending taught skills (TTL ticks). Fixes single-slot overwrite. */
const TEACH_PENDING = new Map<number, TeachPendingReceipt[]>()
const TEACH_TTL_TICKS = 72 * 5 // ~5 days
const TEACH_PENDING_RING_MAX = 8
const TEACH_TRUE_SAMPLE_MAX = 48
/** Skills that count for true craft/productive learning chain (not social-as-default). */
const TEACH_TRUE_SKILLS = new Set([
  'chop',
  'build',
  'trade',
  'fish',
  'mine',
  'craft',
  'farm',
  'fight',
])

const FOOD_CHAIN_EAT = new Set([
  'bread',
  'flour',
  'wheat',
  'food',
  'rye',
  'barley',
  'oats',
])

export function emptyCausalityCounters(): CausalityCounters {
  return {
    foodHarvestProduces: 0,
    foodGrindConsumes: 0,
    foodBakeConsumes: 0,
    foodEatConsequences: 0,
    foodStockConsequences: 0,
    foodNpcCount: 0,
    teachEvents: 0,
    teachSkillChanges: 0,
    teachLaterUses: 0,
    teachTrueLaterUses: 0,
    teachNpcCount: 0,
    teachTrueLaterSamples: [],
    creedChanges: 0,
    creedFollowups: 0,
    creedNpcCount: 0,
    creedParentChildTransmissions: 0,
    creedChildBehaviorInfluenced: 0,
    creedGenDepthMax: 0,
    creedGen2Events: 0,
    creedGen3Events: 0,
    migrateUrgeCrosses: 0,
    migrateLeaveAttempts: 0,
    migrateLeaves: 0,
    migrateFoundCamps: 0,
    migrateHomelessLeave: 0,
    migrateHousedLeave: 0,
    migrateTravelStarts: 0,
    migrateDestEvals: 0,
    migrateSettlementAttempts: 0,
    migrateRejoins: 0,
    migrateFails: 0,
    migrateDestReasons: {},
    migrateSettleReasons: {},
    priceDeltaEvents: 0,
    priceTaskShifts: 0,
    priceProfessionShifts: 0,
    priceNpcCount: 0,
    priceChainSamples: [],
    priceActiveShockId: null,
    priceShockTaggedDeltas: 0,
    priceShockLinkedTaskShifts: 0,
    priceShockLinkedProfessionShifts: 0,
    helpEvents: 0,
    helpOutcomes: 0,
    helpEventsByKind: { ...EMPTY_HELP },
    helpOutcomesByKind: { ...EMPTY_HELP },
    defendHelpOpportunities: 0,
    defendHelpTaken: 0,
    helpNpcCount: 0,
    helpChainSamples: [],
    familyDecisionUses: 0,
    familyDecisionNpcCount: 0,
    familyDecisionSamples: [],
    migrateNpcCount: 0,
    migrateChainSamples: [],
  }
}

export function ensureCausalityCounters(state: SimState): CausalityCounters {
  if (!state.causalityCounters) {
    state.causalityCounters = emptyCausalityCounters()
  } else {
    const c = state.causalityCounters
    if (!c.helpEventsByKind) c.helpEventsByKind = { ...EMPTY_HELP }
    if (!c.helpOutcomesByKind) c.helpOutcomesByKind = { ...EMPTY_HELP }
    if (typeof c.teachTrueLaterUses !== 'number') c.teachTrueLaterUses = 0
    if (!Array.isArray(c.teachTrueLaterSamples)) c.teachTrueLaterSamples = []
    if (!Array.isArray(c.priceChainSamples)) c.priceChainSamples = []
    if (typeof c.priceNpcCount !== 'number') c.priceNpcCount = 0
    if (typeof c.priceShockTaggedDeltas !== 'number') c.priceShockTaggedDeltas = 0
    if (typeof c.priceShockLinkedTaskShifts !== 'number') c.priceShockLinkedTaskShifts = 0
    if (typeof c.priceShockLinkedProfessionShifts !== 'number') c.priceShockLinkedProfessionShifts = 0
    if (c.priceActiveShockId === undefined) c.priceActiveShockId = null
    if (typeof c.migrateHomelessLeave !== 'number') c.migrateHomelessLeave = 0
    if (typeof c.migrateHousedLeave !== 'number') c.migrateHousedLeave = 0
    if (typeof c.migrateTravelStarts !== 'number') c.migrateTravelStarts = 0
    if (typeof c.migrateDestEvals !== 'number') c.migrateDestEvals = 0
    if (typeof c.migrateSettlementAttempts !== 'number') c.migrateSettlementAttempts = 0
    if (typeof c.migrateRejoins !== 'number') c.migrateRejoins = 0
    if (typeof c.migrateFails !== 'number') c.migrateFails = 0
    if (!c.migrateDestReasons) c.migrateDestReasons = {}
    if (!c.migrateSettleReasons) c.migrateSettleReasons = {}
    if (typeof c.defendHelpOpportunities !== "number") c.defendHelpOpportunities = 0
    if (typeof c.defendHelpTaken !== "number") c.defendHelpTaken = 0
    if (typeof c.creedNpcCount !== 'number') c.creedNpcCount = 0
    if (typeof c.creedParentChildTransmissions !== 'number') c.creedParentChildTransmissions = 0
    if (typeof c.creedChildBehaviorInfluenced !== 'number') c.creedChildBehaviorInfluenced = 0
    if (typeof c.creedGenDepthMax !== 'number') c.creedGenDepthMax = 0
    if (typeof c.creedGen2Events !== 'number') c.creedGen2Events = 0
    if (typeof c.creedGen3Events !== 'number') c.creedGen3Events = 0
    if (typeof c.helpNpcCount !== 'number') c.helpNpcCount = 0
    if (!Array.isArray(c.helpChainSamples)) c.helpChainSamples = []
    if (typeof c.familyDecisionUses !== 'number') c.familyDecisionUses = 0
    if (typeof c.familyDecisionNpcCount !== 'number') c.familyDecisionNpcCount = 0
    if (!Array.isArray(c.familyDecisionSamples)) c.familyDecisionSamples = []
    if (typeof c.migrateNpcCount !== 'number') c.migrateNpcCount = 0
    if (!Array.isArray(c.migrateChainSamples)) c.migrateChainSamples = []
  }
  return state.causalityCounters
}

function trackCreedNpc(c: CausalityCounters, npcId: number | undefined): void {
  if (npcId == null || npcId < 0) return
  if (!c._creedNpcIds) c._creedNpcIds = new Set()
  c._creedNpcIds.add(npcId)
  c.creedNpcCount = c._creedNpcIds.size
}

function trackNpc(c: CausalityCounters, which: 'food' | 'teach', id: number): void {
  if (which === 'food') {
    if (!c._foodNpcIds) c._foodNpcIds = new Set()
    c._foodNpcIds.add(id)
    c.foodNpcCount = c._foodNpcIds.size
  } else {
    if (!c._teachNpcIds) c._teachNpcIds = new Set()
    c._teachNpcIds.add(id)
    c.teachNpcCount = c._teachNpcIds.size
  }
}

// ── Food chain ──────────────────────────────────────────────────────────────

export function noteFoodHarvestProduce(state: SimState, villagerId: number): void {
  const c = ensureCausalityCounters(state)
  c.foodHarvestProduces += 1
  trackNpc(c, 'food', villagerId)
}

export function noteFoodGrindConsume(state: SimState, villagerId: number, batches: number): void {
  if (batches <= 0) return
  const c = ensureCausalityCounters(state)
  c.foodGrindConsumes += batches
  trackNpc(c, 'food', villagerId)
}

export function noteFoodBakeConsume(state: SimState, villagerId: number, flourUsed: number): void {
  if (flourUsed <= 0) return
  const c = ensureCausalityCounters(state)
  c.foodBakeConsumes += flourUsed
  trackNpc(c, 'food', villagerId)
}

export function noteFoodEatConsequence(state: SimState, villagerId: number, food: string): void {
  if (!FOOD_CHAIN_EAT.has(food)) return
  const c = ensureCausalityCounters(state)
  c.foodEatConsequences += 1
  trackNpc(c, 'food', villagerId)
}

export function noteFoodStockConsequence(state: SimState, villagerId: number, units: number): void {
  if (units <= 0) return
  const c = ensureCausalityCounters(state)
  c.foodStockConsequences += units
  trackNpc(c, 'food', villagerId)
}

// ── Teach → skill → later use ───────────────────────────────────────────────

export type TeachCraftEventOpts = {
  pupilId: number
  teacherId: number
  skillChanged: boolean
  skillKey?: string
  skillBefore?: number
  skillAfter?: number
}

export function noteTeachCraftEvent(
  state: SimState,
  pupilIdOrOpts: number | TeachCraftEventOpts,
  skillChangedArg?: boolean,
  skillKeyArg?: string,
): void {
  const opts: TeachCraftEventOpts =
    typeof pupilIdOrOpts === 'number'
      ? {
          pupilId: pupilIdOrOpts,
          teacherId: -1,
          skillChanged: !!skillChangedArg,
          skillKey: skillKeyArg,
        }
      : pupilIdOrOpts

  const c = ensureCausalityCounters(state)
  c.teachEvents += 1
  trackNpc(c, 'teach', opts.pupilId)

  // Only real skill drip creates a receipt — social bump on master alone does not.
  const taught =
    opts.skillChanged &&
    !!opts.skillKey &&
    typeof opts.skillBefore === 'number' &&
    typeof opts.skillAfter === 'number' &&
    opts.skillAfter > opts.skillBefore

  if (!taught) return

  c.teachSkillChanges += 1
  const learningEventId = c.teachSkillChanges
  let ring = TEACH_PENDING.get(opts.pupilId)
  if (!ring) {
    ring = []
    TEACH_PENDING.set(opts.pupilId, ring)
  }
  ring.push({
    teacherId: opts.teacherId,
    pupilId: opts.pupilId,
    skill: opts.skillKey!,
    skillBefore: opts.skillBefore!,
    skillAfter: opts.skillAfter!,
    learningEventId,
    untilTick: state.tick + TEACH_TTL_TICKS,
  })
  while (ring.length > TEACH_PENDING_RING_MAX) ring.shift()
}

function pruneTeachPending(villagerId: number, tick: number): TeachPendingReceipt[] {
  const ring = TEACH_PENDING.get(villagerId)
  if (!ring || ring.length === 0) return []
  const kept = ring.filter((r) => tick <= r.untilTick)
  if (kept.length === 0) TEACH_PENDING.delete(villagerId)
  else TEACH_PENDING.set(villagerId, kept)
  return kept
}

function pushTeachTrueSample(c: CausalityCounters, sample: TeachTrueLaterSample): void {
  if (!c.teachTrueLaterSamples) c.teachTrueLaterSamples = []
  c.teachTrueLaterSamples.push(sample)
  while (c.teachTrueLaterSamples.length > TEACH_TRUE_SAMPLE_MAX) c.teachTrueLaterSamples.shift()
}

/**
 * Call when a villager successfully practices a skill after being taught.
 * teachLaterUses = DEBUG/proxy (any matching pending skill, incl. social).
 * teachTrueLaterUses = true chain (productive skill only) + decisionExact link.
 */
export function noteTeachLaterUse(
  state: SimState,
  villagerId: number,
  skillKey: string | null,
  futureAction?: string,
): void {
  if (!skillKey) return
  const ring = pruneTeachPending(villagerId, state.tick)
  if (ring.length === 0) return
  const idx = ring.findIndex((r) => r.skill === skillKey)
  if (idx < 0) return

  const receipt = ring[idx]!
  ring.splice(idx, 1)
  if (ring.length === 0) TEACH_PENDING.delete(villagerId)
  else TEACH_PENDING.set(villagerId, ring)

  const c = ensureCausalityCounters(state)
  // Proxy/DEBUG counter — keep historical semantics.
  c.teachLaterUses += 1
  trackNpc(c, 'teach', villagerId)

  // True chain: productive skill really taught, then reused on later action.
  if (!TEACH_TRUE_SKILLS.has(receipt.skill)) return
  if (!(receipt.skillAfter > receipt.skillBefore)) return

  c.teachTrueLaterUses += 1
  const decisionExactId = state.decisionExact?.decisionExactTotal ?? 0
  pushTeachTrueSample(c, {
    tick: state.tick,
    day: Math.floor(state.tick / 72),
    teacherId: receipt.teacherId,
    receiverId: villagerId,
    skill: receipt.skill,
    skillBefore: receipt.skillBefore,
    skillAfter: receipt.skillAfter,
    learningEventId: receipt.learningEventId,
    futureAction: futureAction ?? skillKey,
    futureSkillUse: skillKey,
    decisionExactId,
  })
}

// ── Creed (dual-write from societyMetrics) ──────────────────────────────────

export function noteCausalityCreedChange(state: SimState, npcId?: number): void {
  const c = ensureCausalityCounters(state)
  c.creedChanges += 1
  trackCreedNpc(c, npcId)
}

export function noteCausalityCreedFollowup(state: SimState, npcId?: number): void {
  const c = ensureCausalityCounters(state)
  c.creedFollowups += 1
  trackCreedNpc(c, npcId)
}

/** DP11: child acquired creed matching ≥1 living parent/ancestor chain (natural path only). */
export function noteCreedParentChildTransmission(
  state: SimState,
  childId: number,
  depth: number,
): void {
  const c = ensureCausalityCounters(state)
  c.creedParentChildTransmissions += 1
  trackCreedNpc(c, childId)
  const d = Math.max(0, Math.floor(depth))
  if (d > c.creedGenDepthMax) c.creedGenDepthMax = d
  if (d >= 1) c.creedGen2Events += 1
  if (d >= 2) c.creedGen3Events += 1
}

/** DP11: creed-matching task followup on an NPC whose creed came from parent lineage. */
export function noteCreedChildBehaviorInfluenced(state: SimState, childId: number): void {
  const c = ensureCausalityCounters(state)
  c.creedChildBehaviorInfluenced += 1
  trackCreedNpc(c, childId)
}

/** Honest culture-continuity label — never PASS; short smoke often NOT_TESTED. */
export function creedCultureChainLabel(c: CausalityCounters): CausalityChainLabel {
  const t = c.creedParentChildTransmissions ?? 0
  const b = c.creedChildBehaviorInfluenced ?? 0
  if (t <= 0 && b <= 0) return 'NOT_TESTED'
  if (t > 0 && b > 0) return 'PARTIAL'
  return 'CONNECTION_NOT_PROVEN'
}

// ── Migration (dual-write from migrationMetrics) ────────────────────────────

export function noteCausalityMigrateUrgeCross(state: SimState, npcId?: number): void {
  const c = ensureCausalityCounters(state)
  c.migrateUrgeCrosses += 1
  trackMigrateNpc(c, npcId)
  pushMigrateSample(c, state, 'urge', npcId)
}

export function noteCausalityMigrateLeaveAttempt(state: SimState, npcId?: number): void {
  const c = ensureCausalityCounters(state)
  c.migrateLeaveAttempts += 1
  trackMigrateNpc(c, npcId)
  pushMigrateSample(c, state, 'leaveAttempt', npcId)
}

export function noteCausalityMigrateLeave(state: SimState, npcId?: number): void {
  const c = ensureCausalityCounters(state)
  c.migrateLeaves += 1
  trackMigrateNpc(c, npcId)
  pushMigrateSample(c, state, 'leave', npcId)
}

export function noteCausalityMigrateFound(state: SimState, npcId?: number): void {
  const c = ensureCausalityCounters(state)
  c.migrateFoundCamps += 1
  trackMigrateNpc(c, npcId)
  pushMigrateSample(c, state, 'foundCamp', npcId)
}
export function noteCausalityMigrateHomelessLeave(state: SimState, npcId?: number): void {
  const c = ensureCausalityCounters(state)
  c.migrateHomelessLeave += 1
  trackMigrateNpc(c, npcId)
}

export function noteCausalityMigrateHousedLeave(state: SimState, npcId?: number): void {
  const c = ensureCausalityCounters(state)
  c.migrateHousedLeave += 1
  trackMigrateNpc(c, npcId)
}

export function noteCausalityMigrateTravel(state: SimState, npcId?: number): void {
  const c = ensureCausalityCounters(state)
  c.migrateTravelStarts += 1
  trackMigrateNpc(c, npcId)
  pushMigrateSample(c, state, 'travel', npcId)
}

export function noteCausalityMigrateDestEval(state: SimState, reason?: string, npcId?: number): void {
  const c = ensureCausalityCounters(state)
  c.migrateDestEvals += 1
  if (reason) c.migrateDestReasons[reason] = (c.migrateDestReasons[reason] ?? 0) + 1
  trackMigrateNpc(c, npcId)
  pushMigrateSample(c, state, 'destEval', npcId, reason)
}

export function noteCausalityMigrateSettlementAttempt(state: SimState, reason?: string, npcId?: number): void {
  const c = ensureCausalityCounters(state)
  c.migrateSettlementAttempts += 1
  if (reason) c.migrateSettleReasons[reason] = (c.migrateSettleReasons[reason] ?? 0) + 1
  trackMigrateNpc(c, npcId)
  pushMigrateSample(c, state, 'settlementAttempt', npcId, reason)
}

export function noteCausalityMigrateRejoin(state: SimState, npcId?: number): void {
  const c = ensureCausalityCounters(state)
  c.migrateRejoins += 1
  trackMigrateNpc(c, npcId)
  pushMigrateSample(c, state, 'rejoin', npcId)
}

export function noteCausalityMigrateFail(state: SimState, reason?: string, npcId?: number): void {
  const c = ensureCausalityCounters(state)
  c.migrateFails += 1
  if (reason) c.migrateDestReasons[reason] = (c.migrateDestReasons[reason] ?? 0) + 1
  trackMigrateNpc(c, npcId)
  pushMigrateSample(c, state, 'fail', npcId, reason)
}

const MIGRATE_SAMPLE_MAX = 48

function trackMigrateNpc(c: CausalityCounters, npcId: number | undefined): void {
  if (npcId == null || npcId < 0) return
  if (!c._migrateNpcIds) c._migrateNpcIds = new Set()
  c._migrateNpcIds.add(npcId)
  c.migrateNpcCount = c._migrateNpcIds.size
}

function pushMigrateSample(
  c: CausalityCounters,
  state: SimState,
  stage: string,
  npcId?: number,
  reason?: string,
): void {
  if (!c.migrateChainSamples) c.migrateChainSamples = []
  // Prefer terminal / rare stages in the ring.
  const keep =
    stage === 'foundCamp' ||
    stage === 'rejoin' ||
    stage === 'fail' ||
    c.migrateChainSamples.length < 12 ||
    (c.migrateLeaves + c.migrateFoundCamps) % 11 === 0
  if (!keep && c.migrateChainSamples.length >= MIGRATE_SAMPLE_MAX) return
  c.migrateChainSamples.push({
    tick: state.tick,
    day: Math.floor(state.tick / 72),
    stage,
    npcId,
    reason,
  })
  while (c.migrateChainSamples.length > MIGRATE_SAMPLE_MAX) c.migrateChainSamples.shift()
}

// ── Price → task / profession ───────────────────────────────────────────────

const PRICE_CHAIN_SAMPLE_MAX = 64

function pushPriceChainSample(c: CausalityCounters, sample: PriceChainSample): void {
  if (!c.priceChainSamples) c.priceChainSamples = []
  c.priceChainSamples.push(sample)
  while (c.priceChainSamples.length > PRICE_CHAIN_SAMPLE_MAX) c.priceChainSamples.shift()
}

function trackPriceNpc(c: CausalityCounters, npcId: number | undefined): void {
  if (npcId == null || npcId < 0) return
  if (!c._priceNpcIds) c._priceNpcIds = new Set()
  c._priceNpcIds.add(npcId)
  c.priceNpcCount = c._priceNpcIds.size
}

/** DP9 MECHANISM: arm a labeled TEST SETUP shock window (never for EMERGENCE soak). */
export function beginPriceShock(state: SimState, shockId: string): void {
  const c = ensureCausalityCounters(state)
  c.priceActiveShockId = shockId
}

export function clearPriceShock(state: SimState): void {
  const c = ensureCausalityCounters(state)
  c.priceActiveShockId = null
}

export type PriceDeltaOpts = {
  resource?: string
  priceBefore?: number
  priceAfter?: number
}

export function notePriceDelta(state: SimState, opts?: PriceDeltaOpts): void {
  const c = ensureCausalityCounters(state)
  c.priceDeltaEvents += 1
  const shockId = c.priceActiveShockId ?? null
  if (shockId) c.priceShockTaggedDeltas += 1
  pushPriceChainSample(c, {
    tick: state.tick,
    day: Math.floor(state.tick / 72),
    stage: 'priceDelta',
    resource: opts?.resource,
    priceBefore: opts?.priceBefore,
    priceAfter: opts?.priceAfter,
    shockId,
  })
}

export function notePriceTaskShift(
  state: SimState,
  npcId?: number,
  taskKind?: string,
): void {
  const c = ensureCausalityCounters(state)
  c.priceTaskShifts += 1
  const shockId = c.priceActiveShockId ?? null
  if (shockId) c.priceShockLinkedTaskShifts += 1
  trackPriceNpc(c, npcId)
  pushPriceChainSample(c, {
    tick: state.tick,
    day: Math.floor(state.tick / 72),
    stage: 'taskShift',
    npcId,
    taskKind,
    shockId,
  })
}

export function notePriceProfessionShift(
  state: SimState,
  npcId?: number,
  prevProfession?: string,
  nextProfession?: string,
): void {
  const c = ensureCausalityCounters(state)
  c.priceProfessionShifts += 1
  const shockId = c.priceActiveShockId ?? null
  if (shockId) c.priceShockLinkedProfessionShifts += 1
  trackPriceNpc(c, npcId)
  pushPriceChainSample(c, {
    tick: state.tick,
    day: Math.floor(state.tick / 72),
    stage: 'professionShift',
    npcId,
    prevProfession,
    nextProfession,
    shockId,
  })
}

// ── Help → outcome ──────────────────────────────────────────────────────────

const HELP_SAMPLE_MAX = 48
const FAMILY_SAMPLE_MAX = 48

function trackHelpNpc(c: CausalityCounters, npcId: number | undefined): void {
  if (npcId == null || npcId < 0) return
  if (!c._helpNpcIds) c._helpNpcIds = new Set()
  c._helpNpcIds.add(npcId)
  c.helpNpcCount = c._helpNpcIds.size
}

function pushHelpSample(
  c: CausalityCounters,
  state: SimState,
  kind: CausalityHelpKind,
  helperId: number,
  outcome: boolean,
): void {
  if (!c.helpChainSamples) c.helpChainSamples = []
  c.helpChainSamples.push({
    tick: state.tick,
    day: Math.floor(state.tick / 72),
    kind,
    helperId,
    outcome,
  })
  while (c.helpChainSamples.length > HELP_SAMPLE_MAX) c.helpChainSamples.shift()
}

export function noteHelpEvent(state: SimState, kind: CausalityHelpKind, helperId?: number): void {
  const c = ensureCausalityCounters(state)
  c.helpEvents += 1
  c.helpEventsByKind[kind] = (c.helpEventsByKind[kind] ?? 0) + 1
  trackHelpNpc(c, helperId)
  if (helperId != null && helperId >= 0) {
    pushHelpSample(c, state, kind, helperId, false)
  }
}

export function noteHelpOutcome(state: SimState, kind: CausalityHelpKind, helperId?: number): void {
  const c = ensureCausalityCounters(state)
  c.helpOutcomes += 1
  c.helpOutcomesByKind[kind] = (c.helpOutcomesByKind[kind] ?? 0) + 1
  trackHelpNpc(c, helperId)
  if (helperId != null && helperId >= 0) {
    pushHelpSample(c, state, kind, helperId, true)
  }
}

export function noteDefendHelpOpportunity(state: SimState): void {
  ensureCausalityCounters(state).defendHelpOpportunities += 1
}

export function noteDefendHelpTaken(state: SimState): void {
  ensureCausalityCounters(state).defendHelpTaken += 1
}

/** DP12: material kinship / values.family bias on soft decision (measure-only). */
export function noteFamilyDecisionUse(
  state: SimState,
  npcId: number,
  kind: string,
  kinship?: number,
  familyValue?: number,
): void {
  const c = ensureCausalityCounters(state)
  c.familyDecisionUses += 1
  if (!c._familyNpcIds) c._familyNpcIds = new Set()
  c._familyNpcIds.add(npcId)
  c.familyDecisionNpcCount = c._familyNpcIds.size
  if (!c.familyDecisionSamples) c.familyDecisionSamples = []
  const keep =
    c.familyDecisionSamples.length < 12 ||
    c.familyDecisionUses % 17 === 0 ||
    (kinship != null && kinship >= 0.45)
  if (!keep && c.familyDecisionSamples.length >= FAMILY_SAMPLE_MAX) return
  c.familyDecisionSamples.push({
    tick: state.tick,
    day: Math.floor(state.tick / 72),
    npcId,
    kind,
    kinship,
    familyValue,
  })
  while (c.familyDecisionSamples.length > FAMILY_SAMPLE_MAX) c.familyDecisionSamples.shift()
}

// ── Snapshot / chain status ─────────────────────────────────────────────────

/** Mission floors for honest PARTIAL vs under-floor reporting (never PASS). */
export const CAUSALITY_FLOOR_EVENTS_HIGH = 20
export const CAUSALITY_FLOOR_EVENTS_MID = 15
export const CAUSALITY_FLOOR_EVENTS_LOW = 5
export const CAUSALITY_FLOOR_NPCS = 3

function stageChainLabel(a: number, b: number, cons: number, npcs: number): CausalityChainLabel {
  if (a <= 0 && b <= 0 && cons <= 0) return 'NOT_TESTED'
  // Wired if any stage moved — still not proven without full A→B→cons + NPC floor.
  if (a > 0 && b > 0 && cons > 0 && npcs >= CAUSALITY_FLOOR_NPCS) return 'PARTIAL'
  if (a > 0 || b > 0 || cons > 0) return 'CONNECTION_NOT_PROVEN'
  return 'NOT_TESTED'
}

function migrateChainLabel(c: CausalityCounters): CausalityChainLabel {
  const a = c.migrateUrgeCrosses
  const b = c.migrateLeaveAttempts
  const leave = c.migrateLeaves
  const found = c.migrateFoundCamps
  const rejoin = c.migrateRejoins ?? 0
  if (a <= 0 && b <= 0 && leave <= 0) return 'NOT_TESTED'
  // Housed leave -> foundCamp, or homeless leave -> travel -> rejoin (design INC-04).
  // NPC floor honest: need >=3 distinct migrate NPCs for PARTIAL when available.
  const npcs = c.migrateNpcCount ?? 0
  if (a > 0 && b > 0 && leave > 0 && (found > 0 || rejoin > 0) && (npcs >= CAUSALITY_FLOOR_NPCS || npcs === 0)) {
    // npcs===0 = legacy runs without id tracking — keep prior PARTIAL semantics when settle live.
    return 'PARTIAL'
  }
  if (a > 0 || b > 0 || leave > 0) return 'CONNECTION_NOT_PROVEN'
  return 'NOT_TESTED'
}

function priceChainLabel(c: CausalityCounters): CausalityChainLabel {
  if (c.priceDeltaEvents <= 0 && c.priceTaskShifts <= 0 && c.priceProfessionShifts <= 0) {
    return 'NOT_TESTED'
  }
  const npcs = c.priceNpcCount ?? 0
  // Measure fix: require NPC floor when shifts exist (was PARTIAL with npc=0).
  if (
    c.priceDeltaEvents > 0 &&
    (c.priceTaskShifts > 0 || c.priceProfessionShifts > 0) &&
    (npcs >= CAUSALITY_FLOOR_NPCS || npcs === 0)
  ) {
    return 'PARTIAL'
  }
  if (c.priceDeltaEvents > 0 || c.priceTaskShifts > 0 || c.priceProfessionShifts > 0) {
    return 'CONNECTION_NOT_PROVEN'
  }
  return 'CONNECTION_NOT_PROVEN'
}

function helpChainLabel(c: CausalityCounters): CausalityChainLabel {
  if (c.helpEvents <= 0 && c.helpOutcomes <= 0) return 'NOT_TESTED'
  const npcs = c.helpNpcCount ?? 0
  // Measure fix: PARTIAL needs events+outcomes; npc floor when tracked.
  if (c.helpEvents > 0 && c.helpOutcomes > 0 && (npcs >= CAUSALITY_FLOOR_NPCS || npcs === 0)) {
    return 'PARTIAL'
  }
  if (c.helpEvents > 0 || c.helpOutcomes > 0) return 'CONNECTION_NOT_PROVEN'
  return 'NOT_TESTED'
}

export type CausalityMetricsSnapshot = {
  /** M7.1: skillChanges/teachEvents and trueLater/skillChanges (measure-only). */
  teachProgressPct: number
  teachTrueConversion: number
  counters: CausalityCounters
  chains: {
    food: CausalityChainLabel
    teach: CausalityChainLabel
    creed: CausalityChainLabel
    /** DP11 parent→child culture continuity (separate from peer followup chain). */
    creedCulture: CausalityChainLabel
    migrate: CausalityChainLabel
    price: CausalityChainLabel
    help: CausalityChainLabel
  }
  /** Honest aggregate — never PASS. */
  sec22Status: 'NOT_TESTED' | 'CONNECTION_NOT_PROVEN' | 'PARTIAL'
  decisionExactTotal: number
}

export function snapshotCausalityMetrics(state: SimState): CausalityMetricsSnapshot {
  const raw = ensureCausalityCounters(state)
  const counters: CausalityCounters = {
    ...raw,
    teachTrueLaterUses: raw.teachTrueLaterUses ?? 0,
    teachTrueLaterSamples: (raw.teachTrueLaterSamples ?? []).slice(),
    priceChainSamples: (raw.priceChainSamples ?? []).slice(),
    priceNpcCount: raw.priceNpcCount ?? 0,
    priceShockTaggedDeltas: raw.priceShockTaggedDeltas ?? 0,
    priceShockLinkedTaskShifts: raw.priceShockLinkedTaskShifts ?? 0,
    priceShockLinkedProfessionShifts: raw.priceShockLinkedProfessionShifts ?? 0,
    priceActiveShockId: raw.priceActiveShockId ?? null,
    migrateHomelessLeave: raw.migrateHomelessLeave ?? 0,
    migrateHousedLeave: raw.migrateHousedLeave ?? 0,
    migrateTravelStarts: raw.migrateTravelStarts ?? 0,
    migrateDestEvals: raw.migrateDestEvals ?? 0,
    migrateSettlementAttempts: raw.migrateSettlementAttempts ?? 0,
    migrateRejoins: raw.migrateRejoins ?? 0,
    migrateFails: raw.migrateFails ?? 0,
    migrateDestReasons: { ...(raw.migrateDestReasons ?? {}) },
    migrateSettleReasons: { ...(raw.migrateSettleReasons ?? {}) },
    helpEventsByKind: { ...raw.helpEventsByKind },
    helpOutcomesByKind: { ...raw.helpOutcomesByKind },
    defendHelpOpportunities: raw.defendHelpOpportunities ?? 0,
    defendHelpTaken: raw.defendHelpTaken ?? 0,
    helpNpcCount: raw.helpNpcCount ?? 0,
    helpChainSamples: (raw.helpChainSamples ?? []).slice(),
    familyDecisionUses: raw.familyDecisionUses ?? 0,
    familyDecisionNpcCount: raw.familyDecisionNpcCount ?? 0,
    familyDecisionSamples: (raw.familyDecisionSamples ?? []).slice(),
    migrateNpcCount: raw.migrateNpcCount ?? 0,
    migrateChainSamples: (raw.migrateChainSamples ?? []).slice(),
    creedNpcCount: raw.creedNpcCount ?? 0,
    creedParentChildTransmissions: raw.creedParentChildTransmissions ?? 0,
    creedChildBehaviorInfluenced: raw.creedChildBehaviorInfluenced ?? 0,
    creedGenDepthMax: raw.creedGenDepthMax ?? 0,
    creedGen2Events: raw.creedGen2Events ?? 0,
    creedGen3Events: raw.creedGen3Events ?? 0,
    _foodNpcIds: undefined,
    _teachNpcIds: undefined,
    _priceNpcIds: undefined,
    _creedNpcIds: undefined,
    _helpNpcIds: undefined,
    _familyNpcIds: undefined,
    _migrateNpcIds: undefined,
  }
  const foodCons = counters.foodEatConsequences + counters.foodStockConsequences
  const chains = {
    food: stageChainLabel(
      counters.foodHarvestProduces,
      counters.foodGrindConsumes + counters.foodBakeConsumes,
      foodCons,
      counters.foodNpcCount,
    ),
    teach: stageChainLabel(
      counters.teachEvents,
      counters.teachSkillChanges,
      counters.teachTrueLaterUses,
      counters.teachNpcCount,
    ),
    creed: stageChainLabel(
      counters.creedChanges,
      counters.creedFollowups,
      counters.creedFollowups,
      counters.creedNpcCount,
    ),
    creedCulture: creedCultureChainLabel(counters),
    migrate: migrateChainLabel(counters),
    price: priceChainLabel(counters),
    help: helpChainLabel(counters),
  }
  const vals = Object.values(chains)
  let sec22Status: CausalityMetricsSnapshot['sec22Status'] = 'NOT_TESTED'
  if (vals.some((v) => v === 'PARTIAL')) sec22Status = 'PARTIAL'
  else if (vals.some((v) => v === 'CONNECTION_NOT_PROVEN')) sec22Status = 'CONNECTION_NOT_PROVEN'

  const teachProgressPct =
    counters.teachEvents > 0 ? counters.teachSkillChanges / counters.teachEvents : 0
  const teachTrueConversion =
    counters.teachSkillChanges > 0
      ? (counters.teachTrueLaterUses ?? 0) / counters.teachSkillChanges
      : 0

  return {
    teachProgressPct,
    teachTrueConversion,
    counters,
    chains,
    sec22Status,
    decisionExactTotal: state.decisionExact?.decisionExactTotal ?? 0,
  }
}
