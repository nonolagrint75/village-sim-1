import { ensureLivelihood } from '../livelihood'
import { countOf, edibleValue } from '../inventory'
import { ensureCultureState, tickEthnos, type EthnosPeer } from '../ethnos'
import { politicsOf } from '../politics'
import { villagerFeelsFamine } from '../ecology'
import { getHouseholdNeeds } from '../family'
import { pickFamilyCareTarget } from '../family'
import type { Memory, Ambition } from '../social'
import { logEvent } from '../social'
import type { SimState, TaskKind, Villager } from '../types'
import { distance, isNight } from '../world'
import {
  LABOR_PREF_LABELS_FR,
  laborThoughtFr,
  preferenceTaskBias,
  reinforcePreference,
  rustUnusedSkills,
  SKILL_LABELS_FR,
  topPreferences,
} from './labor'
import { applyEmotionEvent, amygdalaTag, decayEmotions, emotionTaskBias, type EmotionEvent } from './emotions'
import { advancePlan, goalLabelFr, pickGoal, planForGoal, replanAfterFailure, skipStuckPlanStep, scoreGoals, type ReplanReason } from './goals'
import { constructionReasonFr, maybeProposeConstruction } from './buildHooks'
import {
  decayEpisodic,
  decaySemantic,
  ingestLegacyMemory,
  mirrorMindSpotsToLegacy,
  practiceSkill,
  skillBonus,
  topEpisodes,
  topSemantics,
  updateImpression,
  upsertSemantic,
} from './memory'
import { NEED_LABELS_FR, topNeeds, updateNeeds, valuesFromPersonality } from './needs'
import { formatThoughtFr, thoughtFromEmotionEvent, thoughtsFromNeeds, thoughtStressBias, topThoughts } from './thoughts'
import {
  stubStatus,
  tickCultureMutation,
  tickHabits,
  tickReligionDepth,
  tickWarEmergence,
  type CulturePeer,
} from './stubs'
import type { CognitionDepth, CognitiveGoalId, CognitiveState } from './types'
import { decayWorking, pushConcern, topConcerns } from './workingMemory'
import {
  attentionKindWeight,
  packConscienceDebug,
  updateConsciousness,
  type ConscienceDebug,
} from './consciousness'
import { competeForWorkspace, trimWorkingToCapacity, workspaceLoad } from './workspace'
import {
  computePredictionErrors,
  decayModelPredictionError,
  estimateTaskOutcome,
  recordModelPredictionError,
  storePredictedOutcome,
  topPredictionErrors,
} from './predictive'
import { resolveProcessMode, executiveStrength, processModeLabelFr } from './executive'
import { updateSelfModel, selfModelGoalBias } from './selfModel'
import { refreshTheoryOfMind } from './tom'
import { nearbyVillagers } from '../kernels'
import { allowDeepThink, cognitionBudgetHintFr, effectiveDeepPeriod, getAliveAgentCount } from './budget'
import {
  dropMind as dropMindSlot,
  getPredictedReward,
  mindOf,
  mindPoolStats,
  peekMind,
  resetCognitionCaches as resetMindPool,
  setPredictedReward,
  syncMindToPool,
} from './mindPool'
import { noteDecisionExact } from '../decisionLedger'
import {
  attributionFlagsFromWhy,
  noteAttributedDecisionBound,
  noteEmotionChangeBound,
  noteMemorableEventBound,
  notePersonalityBehaviorBound,
} from '../attributionMetrics'
import { noteBehaviorSequenceBound } from '../behaviorSequenceMetrics'

export { mindOf, mindPoolStats, peekMind }

/** Last world tick seen by cognition — stamps thoughts from async emotion events. */
let LAST_COG_TICK = 0

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v))
}

export function resetCognitionCaches(): void {
  resetMindPool()
}

export function dropMind(id: number): void {
  dropMindSlot(id)
}

/** Bridge existing remember() → episodic + optional semantic (amygdala-tagged). */
export function onRemember(v: Villager, mem: Memory): void {
  const mind = mindOf(v)
  ingestLegacyMemory(mind.episodic, mem, mem.tick, amygdalaTag(mind.emotions))
  noteMemorableEventBound()
  if (mem.kind === 'goodSpot') {
    upsertSemantic(mind.semantic, 'good_forage', 'bon coin de ressources', Math.min(1, 0.4 + mem.weight * 0.15), mem.tick, mem.x, mem.y)
  } else if (mem.kind === 'dangerSpot' || mem.kind === 'sawKill') {
    upsertSemantic(mind.semantic, 'danger_spot', 'endroit dangereux', Math.min(1, 0.45 + mem.weight * 0.12), mem.tick, mem.x, mem.y)
  }
  if (mem.subjectId !== null) {
    const dTrust = mem.emotion * 0.08
    const dFear = mem.emotion < 0 ? -mem.emotion * 0.1 : 0
    const dAff = mem.emotion * 0.1
    updateImpression(mind.socialModel, mem.subjectId, dTrust, dFear, dAff, mem.tick)
  }
}

export function onCognitiveEvent(v: Villager, event: EmotionEvent, intensity = 1): void {
  const mind = mindOf(v)
  applyEmotionEvent(mind.emotions, event, intensity)
  noteEmotionChangeBound()
  thoughtFromEmotionEvent(mind, event, LAST_COG_TICK, intensity)
}

function driftPersonality(v: Villager, mind: CognitiveState): void {
  const e = mind.emotions
  const p = v.personality
  // Small rates only — strong episodic emotion resists forgetting but slowly reshapes traits.
  if (e.anger > 0.7) p.generosity = clamp01(p.generosity - 0.002)
  if (e.fear > 0.7) p.courage = clamp01(p.courage - 0.0025)
  if (e.affection > 0.65) p.sociability = clamp01(p.sociability + 0.002)
  if (e.pride > 0.7) p.ambition = clamp01(p.ambition + 0.002)
  // Betrayal-like episodic: robbed / harmed recently
  for (const ep of mind.episodic) {
    if ((ep.kind === 'robbed' || ep.kind === 'harmed') && ep.importance > 1.4) {
      p.curiosity = clamp01(p.curiosity - 0.001)
      // refresh values slowly from drifted personality
      mind.values = valuesFromPersonality(v)
      break
    }
  }
}

function fillWorking(state: SimState, v: Villager, mind: CognitiveState): void {
  const tick = state.tick
  if (mind.needs.hunger > 0.35) pushConcern(mind.working, 'need_food', 'besoin de manger', mind.needs.hunger, tick, null, v.x, v.y)
  if (mind.needs.fatigue > 0.4) pushConcern(mind.working, 'need_rest', 'besoin de repos', mind.needs.fatigue, tick)
  if (mind.needs.shelter > 0.4) pushConcern(mind.working, 'need_shelter', 'besoin d’un abri', mind.needs.shelter, tick)
  if (mind.needs.light > 0.35) pushConcern(mind.working, 'need_light', 'besoin de lumière', mind.needs.light, tick, null, v.x, v.y)
  if (mind.needs.warmth > 0.35) pushConcern(mind.working, 'need_warmth', 'besoin de chaleur', mind.needs.warmth, tick, null, v.x, v.y)
  if (mind.needs.safety > 0.35) pushConcern(mind.working, 'threat', 'menace ressentie', mind.needs.safety, tick, null, v.x, v.y)
  if (v.grudgeTarget !== null) pushConcern(mind.working, 'grudge', 'compte à régler', 0.7 + mind.emotions.anger * 0.3, tick, v.grudgeTarget)
  if (mind.needs.social > 0.45 || mind.needs.belonging > 0.5) {
    pushConcern(mind.working, 'kin', 'besoin de compagnie', Math.max(mind.needs.social, mind.needs.belonging), tick)
  }
  for (const [oid, rel] of v.relations) {
    if (rel.debt > 1.2) {
      pushConcern(mind.working, 'debt', 'dette / faveur', Math.min(1, rel.debt * 0.25), tick, oid)
      break
    }
  }
  for (const [oid, rel] of v.relations) {
    if ((rel.respect ?? 0) > 0.65) {
      pushConcern(mind.working, 'status', 'admiration d’un modèle', 0.35 + rel.respect * 0.4, tick, oid)
      break
    }
  }
  if (edibleValue(v.inventory) < 2 && countOf(v.inventory, 'flour') === 0) {
    pushConcern(mind.working, 'resource', 'manque de farine / vivres', 0.45 + mind.needs.hunger * 0.3, tick)
  }
  if (v.activeProjectId !== null || mind.buildProjectId !== null) {
    const pid = v.activeProjectId ?? mind.buildProjectId
    const proj = state.projects.find((p) => p.id === pid && p.phase !== 'done')
    if (proj) {
      pushConcern(mind.working, 'build', `chantier : ${proj.label}`, 0.5 + proj.intent.scale * 0.3, tick, null, proj.cx, proj.cy)
    }
  }
  // Curiosity / boredom → live kinds idle|experiment via workspace + consciousAccessBias('build').
  // WP9: slightly lower bar when survival stable so secondary motives can surface (no AFK invent).
  const safeForSecondary =
    mind.needs.hunger < 0.38 && mind.needs.safety < 0.42 && mind.emotions.stress < 0.5
  const boreBar = safeForSecondary ? 0.34 : 0.4
  const creatBar = safeForSecondary ? 0.36 : 0.42
  if (
    mind.needs.hunger < 0.42 &&
    mind.needs.safety < 0.45 &&
    (mind.needs.boredom > boreBar || mind.needs.creative > creatBar)
  ) {
    const creative = mind.needs.creative >= mind.needs.boredom
    pushConcern(
      mind.working,
      'build',
      creative ? 'envie d’inventer' : 'envie d’errer',
      Math.max(mind.needs.boredom, mind.needs.creative) * (safeForSecondary ? 0.95 : 0.85),
      tick,
      null,
      v.x,
      v.y,
    )
  }
  if (v.spouseId === null && !v.refusesMarriage && v.age >= 220 && mind.values.family > 0.4) {
    pushConcern(mind.working, 'kin', 'désir de foyer', 0.35 + mind.values.family * 0.4 + mind.needs.social * 0.2, tick)
  }
}

function buildReasons(mind: CognitiveState, kind: TaskKind | null, scoreNote?: string, factorWhy?: string[]): string[] {
  const reasons: string[] = []
  reasons.push(`mode : ${processModeLabelFr(mind.processMode)}`)
  if (mind.selfModel?.narrative) {
    reasons.push(`soi : ${mind.selfModel.narrative}`)
  }
  reasons.push(`but : ${goalLabelFr(mind.goal.id)}`)
  if (mind.plan) {
    const step = mind.plan.steps[mind.plan.stepI]
    reasons.push(`plan : ${mind.plan.steps.map((s, i) => (i === mind.plan!.stepI ? `[${s}]` : s)).join(' → ')}`)
    if (kind && step === kind) reasons.push(`étape du plan : ${kind}`)
  }
  if (factorWhy && factorWhy.length) {
    reasons.push(`pourquoi : ${factorWhy.join(' · ')}`)
  } else if (mind.lastFactorWhy.length) {
    reasons.push(`pourquoi : ${mind.lastFactorWhy.join(' · ')}`)
  }
  const needs = topNeeds(mind.needs, 3).filter((n) => n.value > 0.2)
  if (needs.length) reasons.push(`besoins : ${needs.map((n) => `${NEED_LABELS_FR[n.key]} ${Math.round(n.value * 100)}%`).join(', ')}`)
  const emo = mind.emotions
  const emoBits: string[] = []
  if (emo.anger > 0.25) emoBits.push(`colère ${Math.round(emo.anger * 100)}%`)
  if (emo.fear > 0.25) emoBits.push(`peur ${Math.round(emo.fear * 100)}%`)
  if (emo.stress > 0.3) emoBits.push(`stress ${Math.round(emo.stress * 100)}%`)
  if (emo.affection > 0.35) emoBits.push(`affection ${Math.round(emo.affection * 100)}%`)
  if (emo.pride > 0.35) emoBits.push(`fierté ${Math.round(emo.pride * 100)}%`)
  if (Math.abs(emo.valence) > 0.2) emoBits.push(`valence ${emo.valence >= 0 ? '+' : ''}${Math.round(emo.valence * 100)}%`)
  if (Math.abs(emo.approachAvoid) > 0.25) {
    emoBits.push(emo.approachAvoid > 0 ? `approche ${Math.round(emo.approachAvoid * 100)}%` : `évitement ${Math.round(-emo.approachAvoid * 100)}%`)
  }
  if (emoBits.length) reasons.push(`humeur : ${emoBits.join(', ')}`)
  if (mind.consciousness) {
    reasons.push(
      `conscience : ${mind.consciousness.mode}` +
        (mind.consciousness.contents[0] ? ` · ${mind.consciousness.contents[0].label}` : ''),
    )
  }
  const concerns = topConcerns(mind.broadcast.length ? mind.broadcast : mind.working, 3)
  if (concerns.length) reasons.push(`espace de travail : ${concerns.map((c) => c.label).join(', ')}`)
  const pes = topPredictionErrors(mind.predictionErrors, 3)
  if (pes.length) {
    reasons.push(
      `erreurs prédiction : ${pes.map((e) => `${e.label} ${Math.round(e.weighted * 100)}%`).join(', ')}`,
    )
  }
  if (scoreNote) reasons.push(scoreNote)
  if (kind) reasons.push(`action : ${kind}`)
  return reasons
}

/** Sleep / rest → episodic consolidation into semantic (hippocampus→neocortex lite). */
export function consolidateOnRest(mind: CognitiveState, tick: number): void {
  if (mind.episodic.length === 0) return
  const ranked = [...mind.episodic].sort(
    (a, b) => Math.abs(b.emotion) * b.importance - Math.abs(a.emotion) * a.importance,
  )
  const top = ranked.slice(0, 2)
  for (const e of top) {
    if (Math.abs(e.emotion) < 0.2 && e.importance < 0.45) continue
    if (e.kind === 'goodSpot' || e.kind === 'helped' || e.kind === 'saved') {
      upsertSemantic(
        mind.semantic,
        'good_forage',
        e.label || 'souvenir consolidé',
        Math.min(1, 0.35 + e.importance * 0.25 + Math.abs(e.emotion) * 0.2),
        tick,
        e.x,
        e.y,
        e.subjectId,
      )
    } else if (e.kind === 'dangerSpot' || e.kind === 'sawKill' || e.kind === 'wolfGrief' || e.kind === 'harmed') {
      upsertSemantic(
        mind.semantic,
        'danger_spot',
        e.label || 'danger consolidé',
        Math.min(1, 0.4 + e.importance * 0.2 + Math.abs(e.emotion) * 0.25),
        tick,
        e.x,
        e.y,
        e.subjectId,
      )
    } else if (e.subjectId !== null) {
      upsertSemantic(
        mind.semantic,
        'person_trait',
        e.label || 'impression consolidée',
        Math.min(1, 0.3 + e.importance * 0.2),
        tick,
        e.x,
        e.y,
        e.subjectId,
      )
    }
    e.confidence = Math.min(1, e.confidence + 0.06)
  }
  mind.emotions.stress = clamp01(mind.emotions.stress - 0.04)
}

function perceiveLocal(state: SimState, v: Villager, mind: CognitiveState): void {
  for (const w of state.wolves) {
    if (!w.alive) continue
    if (distance(v.x, v.y, w.x, w.y) < 20) {
      upsertSemantic(mind.semantic, 'wolves_near', 'loups dans les parages', 0.7, state.tick, w.x, w.y)
      applyEmotionEvent(mind.emotions, 'wolf', 0.45)
      noteEmotionChangeBound()
      break
    }
  }
  if (villagerFeelsFamine(state, v)) {
    applyEmotionEvent(mind.emotions, 'famine', 0.35)
    noteEmotionChangeBound()
  }
  const priceBread = state.prices.bread
  const priceFlour = state.prices.flour
  const dear =
    (typeof priceBread === 'number' && priceBread > 2.2 ? priceBread / 4 : 0) +
    (typeof priceFlour === 'number' && priceFlour > 4 ? priceFlour / 8 : 0)
  if (dear > 0.35) {
    upsertSemantic(mind.semantic, 'market_high', 'pain cher au marché', Math.min(1, dear), state.tick, v.x, v.y)
  }
  // Soft SoL / unemployment mood (Vic3-lite) — no player budget.
  if (v.villageId !== null) {
    const vg = state.villages.find((g) => g.id === v.villageId)
    if (vg) {
      const sol = vg.standardOfLiving ?? 0.4
      if (sol < 0.28) {
        mind.emotions.stress = Math.min(1, mind.emotions.stress + 0.04)
        upsertSemantic(mind.semantic, 'market_low', 'vie dure au village', 0.55, state.tick, v.x, v.y)
      } else if (sol > 0.68) {
        mind.emotions.stress = Math.max(0, mind.emotions.stress - 0.03)
        mind.emotions.pride = Math.min(1, mind.emotions.pride + 0.02)
      }
      if ((vg.laborBalance ?? 0) < -2 && v.profession === 'none') {
        mind.emotions.stress = Math.min(1, mind.emotions.stress + 0.035)
        mind.emotions.anger = Math.min(1, mind.emotions.anger + 0.02)
      }
    }
  }
}

/**
 * Two-speed cognition.
 * fast: needs + light emotion decay + working concerns (every think).
 * deep: memory decay, goals, personality drift, stubs — fraction of agents / major events.
 */
export function tickCognition(state: SimState, v: Villager, rng: () => number, depth: CognitionDepth): void {
  const mind = mindOf(v)
  LAST_COG_TICK = state.tick
  decayEmotions(mind.emotions, depth === 'deep' ? 0.014 : 0.006)
  updateNeeds(state, v, mind.needs)
  decayModelPredictionError(mind)
  mind.predictionErrors = computePredictionErrors(mind.needs, mind.modelPredictionError)
  fillWorking(state, v, mind)
  decayWorking(mind.working, state.tick)
  trimWorkingToCapacity(mind.working)
  const prevKinds = mind.broadcast.map((c) => c.kind)
  // Compétition d’attention individuelle (seed + personnalité) — pas de hive mind.
  mind.broadcast = competeForWorkspace(mind.working, prevKinds, (kind) => attentionKindWeight(v, kind))
  // Attention load raises stress when workspace is crowded with urgent items.
  mind.emotions.stress = clamp01(mind.emotions.stress + workspaceLoad(mind.broadcast) * 0.04)
  mind.processMode = resolveProcessMode(mind, depth)
  thoughtsFromNeeds(mind, state.tick, depth === 'fast')
  // Interoception + affect → stress aggregate (homeostatic).
  mind.emotions.stress = clamp01(mind.emotions.stress * 0.92 + thoughtStressBias(mind) * 0.35)
  // Flux conscient privé : stream complet en deep, drapeaux compacts en fast.
  updateConsciousness(state.tick, v, mind, depth === 'deep')
  syncMindToPool(v.id, mind)

  // Perceive every think (fast + deep) so affect/semantics stay fresh for decide.
  // Deep still owns memory decay / goals / culture; fast only needs local sensing.
  perceiveLocal(state, v, mind)

  // Fast path: homeostatic only — dual-process System 1.
  if (depth === 'fast') {
    if (mind.needs.hunger > 0.75 && mind.goal.id !== 'survive') {
      mind.goal.commitment = Math.min(mind.goal.commitment, 4)
    }
    if (mind.emotions.stress > 0.78) {
      mind.goal.commitment = Math.min(mind.goal.commitment, 6)
    }
    // WP9: under crisis / high PE, light goal refresh so LOD thin ≠ frozen intention.
    // Cheap: no ToM / culture / stubs — pickGoal only, staggered.
    if (
      agentNeedsCrisisDeep(state, v, mind) &&
      mind.goal.commitment <= 8 &&
      (v.id + state.tick) % 5 === 0
    ) {
      const polFast = politicsOf(v)
      const candidates = scoreGoals(
        mind.needs,
        mind.values,
        v,
        {
          migrateUrge: polFast.migrationUrge + (mind.emotions.stress > 0.82 ? 0.1 : 0),
          stress: mind.emotions.stress,
          loneliness: 0.25,
          household: getHouseholdNeeds(state, v),
          familyTargetId: pickFamilyCareTarget(state, v),
        },
        rng,
      )
      for (const c of candidates) {
        c.score *= selfModelGoalBias(mind, c.id)
      }
      candidates.sort((a, b) => b.score - a.score)
      pickGoal(mind, candidates, v.personality.ambition)
    }
    // WP3: keep ambition label mirrored from goal SoT (no competing scorer on fast).
    projectAmbitionLabelFromGoal(v, mind)
    // Light sleep consolidation when resting at night (cheap).
    if (v.task?.kind === 'rest' && isNight(state.tick) && (v.id + state.tick) % 5 === 0) {
      consolidateOnRest(mind, state.tick)
      updateConsciousness(state.tick, v, mind, false)
    }
    mind.lastReasons = buildReasons(mind, v.task?.kind ?? null)
    return
  }
  updateSelfModel(v, mind)
  decayEpisodic(mind.episodic, state.tick)
  decaySemantic(mind.semantic)
  // A4: mind spots → legacy mirror (decision authority stays mind-first in knownSpots).
  mirrorMindSpotsToLegacy(v, mind.semantic, mind.episodic, state.tick)

  // Deep rest → stronger consolidation (System 2 offline processing).
  if (v.task?.kind === 'rest' || (isNight(state.tick) && v.hasHome && distance(v.x, v.y, v.homeX, v.homeY) < 5)) {
    consolidateOnRest(mind, state.tick)
    updateConsciousness(state.tick, v, mind, true)
  }

  let nearby = 0
  let friends = 0
  const nearList = nearbyVillagers(state, v.x, v.y, 18, v.id, 10)
  refreshTheoryOfMind(state, v, mind.socialModel, nearList, state.tick)
  for (let i = 0; i < nearList.length; i++) {
    const o = nearList[i]
    nearby++
    const r = v.relations.get(o.id)
    if (r && r.affinity > 0.4) friends++
  }
  const loneliness = nearby === 0 ? 0.7 : friends === 0 ? 0.35 : 0.05
  const pol = politicsOf(v)
  const candidates = scoreGoals(mind.needs, mind.values, v, {
    migrateUrge: pol.migrationUrge + (mind.emotions.stress > 0.82 ? 0.1 : 0),
    stress: mind.emotions.stress,
    loneliness,
    household: getHouseholdNeeds(state, v),
    familyTargetId: pickFamilyCareTarget(state, v),
  }, rng)
  for (const c of candidates) {
    c.score *= selfModelGoalBias(mind, c.id)
  }
  candidates.sort((a, b) => b.score - a.score)
  pickGoal(mind, candidates, v.personality.ambition)
  driftAmbitionFromExperience(v, mind)
  syncAmbitionAndGoal(v, mind)
  syncProfessionLivelihood(v, mind)
  driftPersonality(v, mind)

  tickHabits(mind, v)
  ensureCultureState(mind, v, rng)

  const culturePeers: CulturePeer[] = []
  const ethnosPeers: EthnosPeer[] = []
  const peerList = nearbyVillagers(state, v.x, v.y, 16, v.id, 8)
  for (let i = 0; i < peerList.length; i++) {
    const o = peerList[i]
    const om = mindOf(o)
    ensureCultureState(om, o, rng)
    const rel = v.relations.get(o.id)
    const trust = rel?.trust ?? 0.2
    const contact = clamp01((rel?.affinity ?? 0) * 0.5 + trust * 0.5 + (rel?.kinship ?? 0) * 0.2)
    const sameCircle = state.circles.some((c) => c.memberIds.includes(v.id) && c.memberIds.includes(o.id))
    culturePeers.push({
      tag: om.cultureTag,
      weight: om.cultureWeight,
      trust,
      sameCircle,
      features: om.cultureFeatures,
      contact,
    })
    ethnosPeers.push({
      features: om.cultureFeatures,
      tag: om.cultureTag,
      weight: om.cultureWeight,
      trust,
      sameCircle,
      contact,
    })
    if (culturePeers.length >= 6) break
  }
  tickEthnos(state, mind, v, ethnosPeers, (o) => {
    const om = peekMind(o.id)
    return om?.cultureFeatures?.length ? om.cultureFeatures : null
  }, rng)
  tickCultureMutation(state, mind, v, culturePeers, rng)
  tickReligionDepth(state, mind, v)
  tickWarEmergence(state, mind, v)

  rustUnusedSkills(mind.skills, mind.lastPracticedSkill, 0.001)

  maybeProposeConstruction(state, v, mind, rng)

  mind.lastDeepTick = state.tick
  syncMindToPool(v.id, mind)
  const chantier = constructionReasonFr(state, v)
  const laborHint = mind.laborThoughts[0]
  mind.lastReasons = buildReasons(mind, v.task?.kind ?? null, laborHint ?? chantier ?? stubStatus(mind))
}

/**
 * WP9: agents in food crisis / famine feel / high stress / high PE need deep (or goal refresh)
 * even when deepShare is thinned under load. Mirror bagEmptyFoodCrisis without behaviors import.
 */
function agentNeedsCrisisDeep(state: SimState, v: Villager, mind: CognitiveState): boolean {
  if (edibleValue(v.inventory) < 1 && (v.hunger < 2.5 || v.starveTimer > 0)) return true
  if (villagerFeelsFamine(state, v)) return true
  if (mind.emotions.stress > 0.72) return true
  // Negative model PE (worse than expected) — replan before habit lock-in.
  if (mind.modelPredictionError < -0.28) return true
  return false
}

export function shouldDeepThink(state: SimState, v: Villager, majorEvent = false): boolean {
  if (majorEvent) return true
  const mind = mindOf(v)
  // WP9: crisis slice bypasses thin deepShare; stagger %3 so this is not deepShare=1.
  if (agentNeedsCrisisDeep(state, v, mind) && (state.tick + v.id) % 3 === 0) {
    return allowDeepThink(v.id, state.tick, true)
  }
  const period = effectiveDeepPeriod(getAliveAgentCount())
  if (state.tick - mind.lastDeepTick >= period * 3) return allowDeepThink(v.id, state.tick)
  if ((v.id + state.tick) % period === 0) return allowDeepThink(v.id, state.tick)
  if (v.ambition === 'leader' && (v.id + state.tick) % Math.max(3, period - 2) === 0) {
    return allowDeepThink(v.id, state.tick)
  }
  const grievance = politicsOf(v).grievance
  if (grievance > 0.55 && (state.tick + v.id) % 5 === 0) {
    // Grievance already had a stagger; under LOD thin, still prioritize mildly.
    return allowDeepThink(v.id, state.tick, grievance > 0.7)
  }
  return false
}

export function recordTaskOutcome(
  v: Villager,
  kind: TaskKind,
  success: boolean,
  reason: ReplanReason = 'generic',
): void {
  const mind = mindOf(v)
  mind.lastKind = kind
  const practiced = practiceSkill(mind.skills, kind, success)
  if (practiced) mind.lastPracticedSkill = practiced
  reinforcePreference(mind.preferences, kind, success)

  // Wave B3: model PE = lite-world-model expected − observed (not needs remap alone).
  const modelPe = recordModelPredictionError(mind, success)
  mind.predictionErrors = computePredictionErrors(mind.needs, mind.modelPredictionError)

  // Reward prediction error (RPE): δ = outcome − predicted → plasticity.
  // Prefer stored world-model expected when it matches this kind.
  const predicted =
    mind.predictedOutcome.kind === kind ? mind.predictedOutcome.expected : getPredictedReward(v.id)
  const outcome = success ? 1 : 0
  const delta = outcome - predicted
  const lr = 0.18
  setPredictedReward(v.id, predicted + lr * delta)
  if (delta > 0.15) {
    mind.habits[kind] = Math.min(1, (mind.habits[kind] ?? 0.05) + 0.04 + delta * 0.06)
  } else if (delta < -0.2) {
    mind.habits[kind] = Math.max(0, (mind.habits[kind] ?? 0) * (0.88 + delta * 0.05))
    mind.emotions.stress = clamp01(mind.emotions.stress + Math.min(0.12, -delta * 0.08))
  }
  // modelPe > 0 ⇒ expected > observed (disappointment) — extra stress if model was confident.
  if (modelPe > 0.25) {
    mind.emotions.stress = clamp01(mind.emotions.stress + Math.min(0.08, modelPe * 0.06))
  }

  const thought = laborThoughtFr(mind.preferences, kind, success)
  if (thought) {
    mind.laborThoughts.unshift(thought)
    if (mind.laborThoughts.length > 5) mind.laborThoughts.length = 5
  }
  if (success) {
    mind.successes += 1
    mind.failures = Math.max(0, mind.failures - 1)
    advancePlan(mind, kind)
    mind.habits[kind] = Math.min(1, (mind.habits[kind] ?? 0.05) + 0.03)
    if (kind.startsWith('build') || kind.startsWith('craft')) onCognitiveEvent(v, 'build_success', 0.6)
    if (kind === 'tradeRun') onCognitiveEvent(v, 'trade_success', 0.7)
    if (kind === 'rest') {
      consolidateOnRest(mind, LAST_COG_TICK)
      onCognitiveEvent(v, 'rest_ease', 0.7)
    }
    const like = preferenceTaskBias(mind.preferences, kind)
    if (like >= 1.25) {
      onCognitiveEvent(v, 'labor_liked', 0.7)
      mind.needs.purpose = Math.max(0, mind.needs.purpose - 0.12)
      mind.needs.creative = Math.max(0, mind.needs.creative - 0.08)
    } else if (like <= 0.85) {
      onCognitiveEvent(v, 'labor_forced', 0.65)
      mind.needs.purpose = Math.min(1, mind.needs.purpose + 0.1)
    }
  } else {
    mind.habits[kind] = Math.max(0, (mind.habits[kind] ?? 0) * 0.92)
    replanAfterFailure(mind, reason)
    skipStuckPlanStep(mind, kind)
    if (preferenceTaskBias(mind.preferences, kind) <= 0.85) onCognitiveEvent(v, 'labor_forced', 0.4)
  }
  syncMindToPool(v.id, mind)
}

export function noteChosenAction(v: Villager, kind: TaskKind, whyExtra?: string, factorWhy?: string[]): void {
  // CP1: exact decision ledger (soft chooseTask + HARD paths that call this).
  noteDecisionExact(v, kind, whyExtra, factorWhy)
  // CP3: count only when mem:/emo:/pers: tags prove material factor contribution.
  const flags = attributionFlagsFromWhy(factorWhy)
  const p = v.personality
  const mind = mindOf(v)
  if (flags.memory || flags.emotion || flags.personality) {
    noteAttributedDecisionBound(v.id, flags, {
      villagerId: v.id,
      courage: p.courage,
      sociability: p.sociability,
      generosity: p.generosity,
      curiosity: p.curiosity,
      ambition: p.ambition,
      kind,
      hungerN: clamp01(mind.needs.hunger),
      fatigueN: clamp01(mind.needs.fatigue),
      foodN: clamp01(edibleValue(v.inventory) / 8),
    })
  }
  // DP3 natural pairs: every soft chosen action feeds per-NPC task histograms (no trait rewrite).
  notePersonalityBehaviorBound({
    villagerId: v.id,
    courage: p.courage,
    sociability: p.sociability,
    generosity: p.generosity,
    curiosity: p.curiosity,
    ambition: p.ambition,
    kind,
    hungerN: clamp01(mind.needs.hunger),
    fatigueN: clamp01(mind.needs.fatigue),
    foodN: clamp01(edibleValue(v.inventory) / 8),
  })
  // DP10: daytime TaskKind sequences + secondary-goal samples (measure-first; farm not stuck).
  noteBehaviorSequenceBound({
    villagerId: v.id,
    kind,
    goalId: mind.goal.id,
    hungerN: clamp01(mind.needs.hunger),
    fatigueN: clamp01(mind.needs.fatigue),
    safetyN: clamp01(mind.needs.safety),
    stress: clamp01(mind.emotions.stress),
    foodN: clamp01(edibleValue(v.inventory) / 8),
    health: v.health,
    hungerAbs: v.hunger,
  })
  if (factorWhy && factorWhy.length) mind.lastFactorWhy = factorWhy.slice(0, 6)
  mind.lastReasons = buildReasons(mind, kind, whyExtra, factorWhy)
  // Wave B1: if policy didn't already store a matching forecast (hard assigns), estimate now.
  if (mind.predictedOutcome.kind !== kind) {
    const est = estimateTaskOutcome(mind, kind, v.x, v.y, v.memories)
    storePredictedOutcome(mind, est)
  }
  // Soft prediction for next RPE — world-model expected when available.
  const prior =
    mind.predictedOutcome.kind === kind
      ? mind.predictedOutcome.expected
      : 0.35 + (mind.habits[kind] ?? 0) * 0.4 + Math.min(0.2, mind.goal.commitment / 80)
  setPredictedReward(v.id, prior)
}

export type CognitionDebug = {
  goal: string
  plan: string | null
  needs: { key: string; value: number }[]
  emotions: { key: string; value: number }[]
  working: string[]
  /** Global workspace broadcast (conscious). */
  workspace: string[]
  /** Dual-process mode label. */
  processMode: string
  /** Top precision-weighted prediction errors. */
  predictionErrors: string[]
  /** Soft identity narrative. */
  selfModel: string | null
  /** Factor breakdown of last selected action. */
  factorWhy: string[]
  /** Executive control strength 0–1. */
  executive: number
  /** Flux conscient privé (GWT / self). */
  conscience: ConscienceDebug | null
  memories: string[]
  beliefs: string[]
  skills: string[]
  preferences: string[]
  laborThoughts: string[]
  thoughts: string[]
  stress: number
  reasons: string[]
  depthHint: string
}

export function packCognitionDebug(v: Villager): CognitionDebug {
  const mind = mindOf(v)
  // Stream complet pour le villageois observé (panneau Cognition) — coût localisé.
  updateConsciousness(LAST_COG_TICK || 0, v, mind, true)
  const emo = mind.emotions
  const liked = topPreferences(mind.preferences, 3)
  const disliked = [...liked].length
    ? Object.entries(mind.preferences)
        .sort((a, b) => a[1] - b[1])
        .slice(0, 1)
    : []
  const pool = mindPoolStats()
  const ctrl = executiveStrength(v, mind)
  return {
    goal: `${goalLabelFr(mind.goal.id)} (${Math.round(mind.goal.score * 10) / 10}, eng. ${Math.round(mind.goal.commitment)})`,
    plan: mind.plan
      ? mind.plan.steps.map((s, i) => (i === mind.plan!.stepI ? `[${s}]` : s)).join(' → ')
      : null,
    needs: topNeeds(mind.needs, 5).map((n) => ({ key: NEED_LABELS_FR[n.key], value: n.value })),
    emotions: [
      { key: 'colère', value: emo.anger },
      { key: 'peur', value: emo.fear },
      { key: 'stress', value: emo.stress },
      { key: 'affection', value: emo.affection },
      { key: 'fierté', value: emo.pride },
      { key: 'valence', value: (emo.valence + 1) / 2 },
      { key: 'approche', value: (emo.approachAvoid + 1) / 2 },
    ].filter((e) => e.key === 'valence' || e.key === 'approche' || e.value > 0.08),
    working: topConcerns(mind.working, 4).map((c) => c.label),
    workspace: mind.broadcast.map((c) => `${c.label} (${Math.round(c.urgency * 100)}%)`),
    processMode: processModeLabelFr(mind.processMode),
    predictionErrors: topPredictionErrors(mind.predictionErrors, 4).map(
      (e) => `${e.label} · mag ${Math.round(e.magnitude * 100)}% · préc. ${Math.round(e.precision * 100)}%`,
    ),
    selfModel: mind.selfModel?.narrative || null,
    factorWhy: mind.lastFactorWhy.slice(0, 5),
    executive: ctrl,
    conscience: packConscienceDebug(mind),
    memories: topEpisodes(mind.episodic, 4).map(
      (e) => `${e.label}${e.subjectId !== null ? ` (#${e.subjectId})` : ''} · imp ${e.importance.toFixed(1)}`,
    ),
    beliefs: topSemantics(mind.semantic, 4).map((f) => `${f.label} (${Math.round(f.confidence * 100)}%)`),
    skills: (Object.entries(mind.skills) as [keyof typeof mind.skills, number][])
      .filter(([, s]) => s > 0.16)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([k, s]) => `${SKILL_LABELS_FR[k] ?? k} ${Math.round(s * 100)}%`),
    preferences: [
      ...liked.map((p) => `♥ ${LABOR_PREF_LABELS_FR[p.key]} ${Math.round(p.value * 100)}%`),
      ...disliked.map(([k, val]) => `✗ ${LABOR_PREF_LABELS_FR[k as keyof typeof LABOR_PREF_LABELS_FR] ?? k} ${Math.round(val * 100)}%`),
    ],
    laborThoughts: mind.laborThoughts.slice(0, 3),
    thoughts: topThoughts(mind.thoughts ?? [], 4).map(formatThoughtFr),
    stress: emo.stress,
    reasons: mind.lastReasons.slice(0, 10),
    depthHint:
      stubStatus(mind) +
      ` · ${cognitionBudgetHintFr()}` +
      ` · esprits SoA ${pool.slots}/${pool.cap}` +
      ` · conscience ${mind.consciousness.mode}` +
      ` · ${processModeLabelFr(mind.processMode)}` +
      (mind.masterworkCount > 0 ? ` · ${mind.masterworkCount} chef-d’œuvre` : ''),
  }
}

/** Rare craft quality → prestige thought + optional chronicle. */
export function noteMasterworkCraft(state: SimState, v: Villager, label: string): void {
  const mind = mindOf(v)
  mind.masterworkCount += 1
  mind.needs.status = Math.max(0, mind.needs.status - 0.25)
  mind.needs.purpose = Math.max(0, mind.needs.purpose - 0.15)
  onCognitiveEvent(v, 'masterwork', 1.1)
  const thought = `chef-d’œuvre : ${label}`
  mind.laborThoughts.unshift(thought)
  if (mind.laborThoughts.length > 5) mind.laborThoughts.length = 5
  logEvent(state, `${v.name} a façonné un chef-d’œuvre (${label})`)
  if (!state.milestones.firstMasterwork) {
    state.milestones.firstMasterwork = true
    logEvent(state, `Premier chef-d’œuvre du monde — ${v.name}`)
  }
}

/** Goal id → legacy ambition label (WP3: ambition is projection only). */
const AMBITION_FROM_GOAL: Partial<Record<CognitiveGoalId, Ambition>> = {
  wealth: 'wealth',
  family: 'family',
  mate: 'family',
  explore: 'explorer',
  security: 'protector',
  craft: 'builder',
  home: 'builder',
  community: 'leader',
  status: 'leader',
  revenge: 'revenge',
  migrate: 'explorer',
  survive: 'survive',
}

const GOAL_FROM_AMBITION: Partial<Record<Ambition, CognitiveGoalId>> = {
  wealth: 'wealth',
  family: 'family',
  explorer: 'explore',
  revenge: 'revenge',
  protector: 'security',
  builder: 'craft',
  leader: 'status',
  survive: 'survive',
}

/** Cheap label mirror — safe on fast ticks; scoring reads mind.goal, not v.ambition. */
function projectAmbitionLabelFromGoal(v: Villager, mind: CognitiveState): void {
  const nextAmb = AMBITION_FROM_GOAL[mind.goal.id]
  if (!nextAmb || v.ambition === nextAmb) return
  v.ambition = nextAmb
}

/**
 * WP3: mind.goal is runtime SoT; v.ambition is alias/label post-sync.
 * External ambition writers (social revenge, practice drift) may nudge soft goals only.
 */
function syncAmbitionAndGoal(v: Villager, mind: CognitiveState): void {
  // Soft commitment: let drifted/external ambition seed the goal before label projection.
  if (mind.needs.hunger <= 0.7 && mind.goal.commitment <= 18) {
    const wantGoal = GOAL_FROM_AMBITION[v.ambition]
    if (wantGoal && wantGoal !== 'survive') {
      if (mind.goal.id === wantGoal) {
        if (mind.goal.commitment < 12) mind.goal.commitment = 12
      } else {
        mind.goal = {
          id: wantGoal,
          score: mind.goal.score,
          commitment: 12 + Math.round(v.personality.ambition * 10),
          targetId: mind.goal.targetId,
          targetX: mind.goal.targetX,
          targetY: mind.goal.targetY,
        }
        mind.plan = planForGoal(wantGoal)
      }
    }
  }
  // Always: ambition is label of current goal (SoT → mirror).
  projectAmbitionLabelFromGoal(v, mind)
}

/**
 * Soft ambition drift from lived practice / migration — not birth-scripted only.
 * Skipped under hunger crisis; revenge arcs stay sticky.
 */
function driftAmbitionFromExperience(v: Villager, mind: CognitiveState): void {
  if (mind.needs.hunger > 0.55) return
  if (v.ambition === 'revenge') return
  const live = mind.livelihood
  if (!live) return
  const mix = live.mix
  const pol = politicsOf(v)
  let next: Ambition | null = null
  if (pol.migrationUrge > 0.55 && v.personality.curiosity > 0.4) next = 'explorer'
  else if (mix.teach > 0.18 && mix.craft > 0.22 && v.personality.sociability > 0.4) next = 'leader'
  else if (mix.craft > 0.34 || mix.build > 0.28) next = 'builder'
  else if (mix.trade > 0.28 || mix.gather > 0.4) next = v.personality.ambition > 0.55 ? 'wealth' : null
  else if (mix.fight > 0.22 || mind.needs.safety > 0.55) next = 'protector'
  else if (mix.counsel > 0.2 || mix.ritual > 0.18 || mix.care > 0.2) next = 'family'
  if (!next || next === v.ambition) return
  // Slow: only nudge when goal commitment is soft.
  if (mind.goal.commitment >= 22) return
  v.ambition = next
}

/**
 * Wave A5: profession ↔ livelihood align — profession is occupational identity;
 * livelihood soft title follows (cultural overlay pretre/gourou may diverge).
 */
function syncProfessionLivelihood(v: Villager, mind: CognitiveState): void {
  const live = ensureLivelihood(mind)
  const titles: Record<string, string> = {
    forager: 'cueilleur',
    farmer: 'fermier',
    fisher: 'pêcheur',
    miller: 'meunier',
    lumberjack: 'bûcheron',
    mason: 'tailleur de pierre',
    guard: 'garde',
    builder: 'bâtisseur',
    herder: 'éleveur',
    trader: 'marchand',
    weaver: 'tisserand',
    blacksmith: 'forgeron',
    miner: 'mineur',
  }
  const cultural =
    live.roleTag === 'pretre' || live.roleTag === 'gourou'
  // Profession → livelihood when empty / legacy (do not overwrite sacred overlay).
  if (v.profession !== 'none') {
    const empty = !live.roleTag || live.titleFr === 'sans métier clair' || live.roleTag.startsWith('legacy_')
    if (empty && !cultural) {
      live.titleFr = titles[v.profession] ?? live.titleFr
      live.roleTag = `legacy_${v.profession}`
    }
    if (mind.selfModel && (!mind.selfModel.livelihood || mind.selfModel.livelihood.startsWith('culture '))) {
      mind.selfModel.livelihood = cultural && live.titleFr !== 'sans métier clair'
        ? live.titleFr
        : live.titleFr !== 'sans métier clair'
          ? live.titleFr
          : v.profession
    }
  }
  // Intentionally no legacy→profession restore: `none` from applyProfessionChange must stick.
}

export { emotionTaskBias, skillBonus, goalLabelFr }
