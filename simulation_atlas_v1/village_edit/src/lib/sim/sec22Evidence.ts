/**
 * DP12 — Sec.22 A→B evidence upgrade.
 * Per-priority CHAIN blocks + mission floors (>=20/>=15/>=5 events, >=3 NPC, >=3 seeds).
 * Reuses DP1-11 counters. Never invents events. Never auto-PASS.
 */
import type { AttributionSnapshot } from './attributionMetrics'
import { snapshotAttribution } from './attributionMetrics'
import type {
  CausalityChainLabel,
  CausalityCounters,
  CausalityMetricsSnapshot,
} from './causalityMetrics'
import { snapshotCausalityMetrics } from './causalityMetrics'
import type { SimState } from './types'

export const SEC22_FLOOR_EVENTS_HIGH = 20
export const SEC22_FLOOR_EVENTS_MID = 15
export const SEC22_FLOOR_EVENTS_LOW = 5
export const SEC22_FLOOR_NPCS = 3
export const SEC22_FLOOR_SEEDS = 3

export type Sec22PriorityId =
  | 'memory_decision'
  | 'emotion_decision'
  | 'personality_decision'
  | 'learning_future'
  | 'family_decision'
  | 'price_profession'
  | 'belief_behavior'
  | 'relationship_help'
  | 'migration_camp'

export type Sec22StageCounts = {
  aEvent: number
  aData: number
  bReceives: number
  bUses: number
  bDecisionChanges: number
  bAction: number
  worldConsequence: number
}

export type Sec22FloorStatus = {
  events: number
  eventFloor: number
  eventsOk: boolean
  npcs: number
  npcFloor: number
  npcsOk: boolean
  seeds: number
  seedFloor: number
  seedsOk: boolean
  localOk: boolean
  missionOk: boolean
  label: string
}

export type Sec22PriorityEvidence = {
  id: Sec22PriorityId
  title: string
  chainPath: string
  stages: Sec22StageCounts
  floors: Sec22FloorStatus
  label: CausalityChainLabel
  chainBlock: string
  sampleLines: string[]
}

export type Sec22EvidenceSnapshot = {
  priorities: Sec22PriorityEvidence[]
  chainBlocks: string[]
  sec22Status: 'NOT_TESTED' | 'CONNECTION_NOT_PROVEN' | 'PARTIAL'
  allLocalFloorsMet: boolean
  missionFloorsMet: boolean
  seedCount: number
  decisionExactTotal: number
  acceptance: 'PENDING'
  note: string
}

function floorStatus(
  events: number,
  eventFloor: number,
  npcs: number,
  seeds: number,
): Sec22FloorStatus {
  const eventsOk = events >= eventFloor
  const npcsOk = npcs >= SEC22_FLOOR_NPCS
  const seedsOk = seeds >= SEC22_FLOOR_SEEDS
  const localOk = eventsOk && npcsOk
  const missionOk = localOk && seedsOk
  return {
    events,
    eventFloor,
    eventsOk,
    npcs,
    npcFloor: SEC22_FLOOR_NPCS,
    npcsOk,
    seeds,
    seedFloor: SEC22_FLOOR_SEEDS,
    seedsOk,
    localOk,
    missionOk,
    label:
      events +
      '/' +
      eventFloor +
      'evt ' +
      (eventsOk ? 'OK' : 'UNDER') +
      ' · ' +
      npcs +
      '/' +
      SEC22_FLOOR_NPCS +
      'npc ' +
      (npcsOk ? 'OK' : 'UNDER') +
      ' · ' +
      seeds +
      '/' +
      SEC22_FLOOR_SEEDS +
      'seeds ' +
      (seedsOk ? 'OK' : 'UNDER'),
  }
}

function labelFromStages(s: Sec22StageCounts): CausalityChainLabel {
  const any =
    s.aEvent +
      s.aData +
      s.bReceives +
      s.bUses +
      s.bDecisionChanges +
      s.bAction +
      s.worldConsequence >
    0
  if (!any) return 'NOT_TESTED'
  const linked =
    s.aEvent > 0 &&
    s.bReceives > 0 &&
    s.bUses > 0 &&
    s.bDecisionChanges > 0 &&
    (s.bAction > 0 || s.worldConsequence > 0)
  if (!linked) return 'CONNECTION_NOT_PROVEN'
  return 'PARTIAL'
}

function chainBlockOf(
  id: Sec22PriorityId,
  path: string,
  label: CausalityChainLabel,
  floors: Sec22FloorStatus,
): string {
  return 'CHAIN: ' + path + ' | label=' + label + ' | floors=' + floors.label + ' | id=' + id
}

function buildMemory(attr: AttributionSnapshot, seeds: number): Sec22PriorityEvidence {
  const stages: Sec22StageCounts = {
    aEvent: attr.memoryMemorableEvents,
    aData: attr.memoryMemorableEvents,
    bReceives: attr.memoryRetrievals,
    bUses: attr.memoryUses,
    bDecisionChanges: attr.memoryCausalFlips,
    bAction: attr.memoryCausalFlips + attr.memoryMaterialNoFlip,
    worldConsequence: attr.memoryCausalFlips,
  }
  const floors = floorStatus(
    attr.memoryCausalFlips,
    SEC22_FLOOR_EVENTS_HIGH,
    attr.memoryAttributedNpcs,
    seeds,
  )
  const label = labelFromStages(stages)
  const path =
    'mem_event -> encode -> retrieve -> placeMemoryFactor_use -> kind_flip -> chosen_action -> world'
  const sampleLines = attr.memoryCausalSamples
    .filter((s) => s.flipped)
    .slice(0, 6)
    .map((s) => {
      const util =
        typeof s.utilBefore === 'number' ? s.utilBefore.toFixed(2) : String(s.utilBefore)
      return (
        'mem_cf v' +
        s.villagerId +
        ' d' +
        s.day +
        ' ' +
        s.beforeKind +
        '->' +
        s.afterKind +
        ' util=' +
        util
      )
    })
  return {
    id: 'memory_decision',
    title: 'memory->decision',
    chainPath: path,
    stages,
    floors,
    label,
    chainBlock: chainBlockOf('memory_decision', path, label, floors),
    sampleLines,
  }
}

function buildEmotion(attr: AttributionSnapshot, seeds: number): Sec22PriorityEvidence {
  const stages: Sec22StageCounts = {
    aEvent: attr.emotionChanges,
    aData: attr.emotionChanges,
    bReceives: attr.emotionUses,
    bUses: attr.emotionUses,
    bDecisionChanges: attr.emotionCausalFlips,
    bAction: attr.emotionCausalFlips + attr.emotionMaterialNoFlip,
    worldConsequence: attr.emotionCausalFlips,
  }
  const floors = floorStatus(
    attr.emotionCausalFlips,
    SEC22_FLOOR_EVENTS_MID,
    attr.emotionAttributedNpcs,
    seeds,
  )
  const label = labelFromStages(stages)
  const path =
    'emotion_event -> bias_data -> soft_receive -> emotionsFactor_use -> kind_flip -> action -> world'
  const sampleLines = attr.emotionCausalSamples
    .filter((s) => s.flipped)
    .slice(0, 6)
    .map(
      (s) =>
        'emo_cf v' + s.villagerId + ' d' + s.day + ' ' + s.beforeKind + '->' + s.afterKind,
    )
  return {
    id: 'emotion_decision',
    title: 'emotion->decision',
    chainPath: path,
    stages,
    floors,
    label,
    chainBlock: chainBlockOf('emotion_decision', path, label, floors),
    sampleLines,
  }
}

function buildPersonality(attr: AttributionSnapshot, seeds: number): Sec22PriorityEvidence {
  const stages: Sec22StageCounts = {
    aEvent: attr.personalityUses,
    aData: attr.personalityPairReady,
    bReceives: attr.personalityUses,
    bUses: attr.personalityUses,
    bDecisionChanges: attr.personalityCausalFlips + attr.personalityPairDivergent,
    bAction: attr.personalityCausalFlips + attr.personalityPairDivergent,
    worldConsequence: attr.personalityPairDivergent,
  }
  const events = Math.max(attr.personalityCausalFlips, attr.personalityPairDivergent)
  const floors = floorStatus(events, SEC22_FLOOR_EVENTS_HIGH, attr.personalityAttributedNpcs, seeds)
  const label = labelFromStages(stages)
  const path =
    'trait_context -> pair_or_prior -> soft_receive -> persFactor_use -> kind_flip|pair_delta -> action -> hist_delta'
  const sampleLines = [
    ...attr.personalityCausalSamples
      .filter((s) => s.flipped)
      .slice(0, 3)
      .map((s) => 'pers_cf v' + s.villagerId + ' ' + s.beforeKind + '->' + s.afterKind),
    ...attr.personalityPairMatchSamples
      .filter((s) => s.divergent)
      .slice(0, 3)
      .map((s) => 'pers_pair ' + s.aId + '/' + s.bId + ' histDist=' + s.histDist.toFixed(2)),
  ]
  return {
    id: 'personality_decision',
    title: 'personality->decision',
    chainPath: path,
    stages,
    floors,
    label,
    chainBlock: chainBlockOf('personality_decision', path, label, floors),
    sampleLines,
  }
}

function buildLearning(c: CausalityCounters, seeds: number): Sec22PriorityEvidence {
  const trueLater = c.teachTrueLaterUses ?? 0
  const stages: Sec22StageCounts = {
    aEvent: c.teachEvents,
    aData: c.teachSkillChanges,
    bReceives: c.teachSkillChanges,
    bUses: c.teachLaterUses,
    bDecisionChanges: trueLater,
    bAction: trueLater,
    worldConsequence: trueLater,
  }
  const floors = floorStatus(trueLater, SEC22_FLOOR_EVENTS_HIGH, c.teachNpcCount, seeds)
  const label = labelFromStages(stages)
  const path =
    'teachCraft -> skillDelta -> pupil_receives -> later_skill_use -> true_reuse -> action -> world'
  const sampleLines = (c.teachTrueLaterSamples ?? []).slice(0, 6).map((s) => {
    return (
      'teach_true t' +
      s.teacherId +
      '->r' +
      s.receiverId +
      ' ' +
      s.skill +
      ' ' +
      s.skillBefore +
      '->' +
      s.skillAfter +
      ' act=' +
      s.futureAction +
      ' de=#' +
      s.decisionExactId
    )
  })
  return {
    id: 'learning_future',
    title: 'learning->future',
    chainPath: path,
    stages,
    floors,
    label,
    chainBlock: chainBlockOf('learning_future', path, label, floors),
    sampleLines,
  }
}

function buildFamily(
  c: CausalityCounters,
  attr: AttributionSnapshot,
  seeds: number,
): Sec22PriorityEvidence {
  const uses = c.familyDecisionUses ?? 0
  const flips = attr.familyCausalFlips ?? 0
  const npcs = Math.max(c.familyDecisionNpcCount ?? 0, attr.familyAttributedNpcs ?? 0)
  // Prefer CF flips for decision-change stage (honest causality); keep uses as receive/use volume.
  const stages: Sec22StageCounts = {
    aEvent: uses,
    aData: uses,
    bReceives: uses,
    bUses: Math.max(uses, attr.familyUses ?? 0),
    bDecisionChanges: flips,
    bAction: flips + (attr.familyMaterialNoFlip ?? 0),
    worldConsequence: flips,
  }
  const floorEvents = Math.max(flips, uses > 0 && flips === 0 ? 0 : flips)
  const floors = floorStatus(floorEvents, SEC22_FLOOR_EVENTS_MID, npcs, seeds)
  const label = labelFromStages(stages)
  const path =
    'kin_or_values_family -> relation_data -> soft_receive -> family_bias_use -> kind_flip -> action -> world'
  const cfLines = (attr.familyCausalSamples ?? [])
    .filter((s) => s.flipped)
    .slice(0, 4)
    .map(
      (s) =>
        'family_cf v' +
        s.villagerId +
        ' d' +
        s.day +
        ' ' +
        s.beforeKind +
        '->' +
        s.afterKind +
        ' kin=' +
        s.kinship.toFixed(2),
    )
  const useLines = (c.familyDecisionSamples ?? []).slice(0, 3).map((s) => {
    const kin = s.kinship
    const kinStr = typeof kin === 'number' ? kin.toFixed(2) : String(kin ?? '?')
    return 'family_dec v' + s.npcId + ' d' + s.day + ' kind=' + s.kind + ' kin=' + kinStr
  })
  const sampleLines = [...cfLines, ...useLines]
  return {
    id: 'family_decision',
    title: 'family->decision',
    chainPath: path,
    stages,
    floors,
    label,
    chainBlock: chainBlockOf('family_decision', path, label, floors),
    sampleLines,
  }
}

function buildPrice(c: CausalityCounters, seeds: number): Sec22PriorityEvidence {
  const shifts = c.priceTaskShifts + c.priceProfessionShifts
  const stages: Sec22StageCounts = {
    aEvent: c.priceDeltaEvents,
    aData: c.priceDeltaEvents,
    bReceives: shifts,
    bUses: shifts,
    bDecisionChanges: c.priceProfessionShifts,
    bAction: c.priceTaskShifts + c.priceProfessionShifts,
    worldConsequence: c.priceProfessionShifts,
  }
  const floors = floorStatus(
    Math.max(c.priceProfessionShifts, shifts),
    SEC22_FLOOR_EVENTS_LOW,
    c.priceNpcCount ?? 0,
    seeds,
  )
  const label = labelFromStages(stages)
  const path =
    'priceDelta -> market_data -> npc_perceives -> score_use -> profession|task_shift -> action -> supply'
  const sampleLines = (c.priceChainSamples ?? [])
    .filter((s) => s.stage !== 'priceDelta')
    .slice(0, 6)
    .map((s) => {
      if (s.stage === 'professionShift') {
        return (
          'price_prof v' +
          s.npcId +
          ' ' +
          s.prevProfession +
          '->' +
          s.nextProfession +
          (s.shockId ? ' shock=' + s.shockId : '')
        )
      }
      return (
        'price_task v' + s.npcId + ' ' + s.taskKind + (s.shockId ? ' shock=' + s.shockId : '')
      )
    })
  return {
    id: 'price_profession',
    title: 'price->profession',
    chainPath: path,
    stages,
    floors,
    label,
    chainBlock: chainBlockOf('price_profession', path, label, floors),
    sampleLines,
  }
}

function buildBelief(c: CausalityCounters, seeds: number): Sec22PriorityEvidence {
  const peerFollow = c.creedFollowups
  const cultureBeh = c.creedChildBehaviorInfluenced ?? 0
  const stages: Sec22StageCounts = {
    aEvent: c.creedChanges,
    aData: c.creedChanges,
    bReceives: c.creedChanges,
    bUses: peerFollow + (c.creedParentChildTransmissions ?? 0),
    bDecisionChanges: peerFollow + cultureBeh,
    bAction: peerFollow + cultureBeh,
    worldConsequence: peerFollow + cultureBeh,
  }
  const floors = floorStatus(peerFollow, SEC22_FLOOR_EVENTS_LOW, c.creedNpcCount ?? 0, seeds)
  const label = labelFromStages(stages)
  const path =
    'creed_change -> belief_data -> peer|child_receives -> followup_use -> behavior_change -> action -> world'
  const sampleLines = [
    'creed_peer changes=' +
      c.creedChanges +
      ' followups=' +
      peerFollow +
      ' npcs=' +
      (c.creedNpcCount ?? 0),
    'creed_culture tx=' +
      (c.creedParentChildTransmissions ?? 0) +
      ' childBeh=' +
      cultureBeh +
      ' genMax=' +
      (c.creedGenDepthMax ?? 0),
  ]
  return {
    id: 'belief_behavior',
    title: 'belief->behavior',
    chainPath: path,
    stages,
    floors,
    label,
    chainBlock: chainBlockOf('belief_behavior', path, label, floors),
    sampleLines,
  }
}

function buildHelp(c: CausalityCounters, attr: AttributionSnapshot, seeds: number): Sec22PriorityEvidence {
  const relFlips = attr.relationCausalFlips ?? 0
  const stages: Sec22StageCounts = {
    aEvent: c.helpEvents,
    aData: c.helpEvents,
    bReceives: c.helpEvents,
    bUses: Math.max(c.helpEvents, attr.relationUses ?? 0),
    bDecisionChanges: Math.max(c.helpOutcomes, relFlips),
    bAction: c.helpOutcomes + relFlips,
    worldConsequence: c.helpOutcomes + (c.defendHelpTaken ?? 0),
  }
  const floors = floorStatus(c.helpEvents, SEC22_FLOOR_EVENTS_HIGH, c.helpNpcCount ?? 0, seeds)
  const label = labelFromStages(stages)
  const path =
    'need_or_threat -> relation_willingness -> help_receive -> help_use -> help_decision -> help_action -> outcome'
  const byKind = c.helpEventsByKind ?? {}
  const sampleLines = [
    'help_byKind ' + JSON.stringify(byKind),
    'defend opp=' +
      (c.defendHelpOpportunities ?? 0) +
      ' taken=' +
      (c.defendHelpTaken ?? 0),
    ...(c.helpChainSamples ?? [])
      .slice(0, 4)
      .map(
        (s) =>
          'help ' + s.kind + ' helper=' + s.helperId + ' d' + s.day + ' outcome=' + s.outcome,
      ),
  ]
  return {
    id: 'relationship_help',
    title: 'relationship->help',
    chainPath: path,
    stages,
    floors,
    label,
    chainBlock: chainBlockOf('relationship_help', path, label, floors),
    sampleLines,
  }
}

function buildMigrate(c: CausalityCounters, seeds: number): Sec22PriorityEvidence {
  const settle = (c.migrateFoundCamps ?? 0) + (c.migrateRejoins ?? 0)
  const stages: Sec22StageCounts = {
    aEvent: c.migrateUrgeCrosses,
    aData: c.migrateLeaveAttempts,
    bReceives: c.migrateLeaveAttempts,
    bUses: c.migrateLeaves,
    bDecisionChanges: c.migrateDestEvals ?? 0,
    bAction: c.migrateLeaves,
    worldConsequence: settle,
  }
  const floors = floorStatus(c.migrateLeaves, SEC22_FLOOR_EVENTS_LOW, c.migrateNpcCount ?? 0, seeds)
  const label = labelFromStages(stages)
  const path =
    'urge -> leaveAttempt -> leave -> travel|destEval -> settleAttempt -> camp|rejoin -> world'
  const sampleLines = [
    'migrate urge=' +
      c.migrateUrgeCrosses +
      ' attempts=' +
      c.migrateLeaveAttempts +
      ' leaves=' +
      c.migrateLeaves +
      ' travel=' +
      (c.migrateTravelStarts ?? 0),
    'migrate destEval=' +
      (c.migrateDestEvals ?? 0) +
      ' settle=' +
      (c.migrateSettlementAttempts ?? 0) +
      ' camps=' +
      c.migrateFoundCamps +
      ' rejoins=' +
      (c.migrateRejoins ?? 0) +
      ' fails=' +
      (c.migrateFails ?? 0),
    ...(c.migrateChainSamples ?? []).slice(0, 4).map((s) => {
      return (
        'migrate ' +
        s.stage +
        ' npc=' +
        (s.npcId ?? '?') +
        ' d' +
        s.day +
        (s.reason ? ' ' + s.reason : '')
      )
    }),
  ]
  return {
    id: 'migration_camp',
    title: 'migration->camp',
    chainPath: path,
    stages,
    floors,
    label,
    chainBlock: chainBlockOf('migration_camp', path, label, floors),
    sampleLines,
  }
}

export type SnapshotSec22Opts = {
  seedCount?: number
  causality?: CausalityMetricsSnapshot
  attribution?: AttributionSnapshot
}

export function snapshotSec22Evidence(
  state: SimState,
  opts?: SnapshotSec22Opts,
): Sec22EvidenceSnapshot {
  const seeds = Math.max(1, opts?.seedCount ?? 1)
  const causality = opts?.causality ?? snapshotCausalityMetrics(state)
  const attribution = opts?.attribution ?? snapshotAttribution(state)
  const c = causality.counters

  const priorities: Sec22PriorityEvidence[] = [
    buildMemory(attribution, seeds),
    buildEmotion(attribution, seeds),
    buildPersonality(attribution, seeds),
    buildLearning(c, seeds),
    buildFamily(c, attribution, seeds),
    buildPrice(c, seeds),
    buildBelief(c, seeds),
    buildHelp(c, attribution, seeds),
    buildMigrate(c, seeds),
  ]

  const chainBlocks = priorities.map((p) => p.chainBlock)
  const labels = priorities.map((p) => p.label)
  let sec22Status: Sec22EvidenceSnapshot['sec22Status'] = 'NOT_TESTED'
  if (labels.some((v) => v === 'PARTIAL')) sec22Status = 'PARTIAL'
  else if (labels.some((v) => v === 'CONNECTION_NOT_PROVEN')) sec22Status = 'CONNECTION_NOT_PROVEN'

  const allLocalFloorsMet = priorities.every((p) => p.floors.localOk)
  const missionFloorsMet = allLocalFloorsMet && seeds >= SEC22_FLOOR_SEEDS

  return {
    priorities,
    chainBlocks,
    sec22Status,
    allLocalFloorsMet,
    missionFloorsMet,
    seedCount: seeds,
    decisionExactTotal: causality.decisionExactTotal,
    acceptance: 'PENDING',
    note: 'DP12 Sec.22 evidence — per-priority CHAIN blocks + mission floors. Never PASS from instrumentation; multi-seed soak required for acceptance.',
  }
}

export function sec22PriorityLabels(
  snap: Sec22EvidenceSnapshot,
): Record<Sec22PriorityId, CausalityChainLabel> {
  const out = {} as Record<Sec22PriorityId, CausalityChainLabel>
  for (const p of snap.priorities) out[p.id] = p.label
  return out
}

export function sec22UnderFloors(snap: Sec22EvidenceSnapshot): string[] {
  return snap.priorities
    .filter((p) => !p.floors.localOk)
    .map((p) => p.id + ':{' + p.floors.label + '}')
}