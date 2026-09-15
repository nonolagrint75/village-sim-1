import { countOf, edibleValue } from '../inventory'
import { ensureCultureState, tickEthnos, type EthnosPeer } from '../ethnos'
import { politicsOf } from '../politics'
import type { Memory } from '../social'
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
import { advancePlan, goalLabelFr, pickGoal, replanAfterFailure, skipStuckPlanStep, scoreGoals, type ReplanReason } from './goals'
import { constructionReasonFr, maybeProposeConstruction } from './buildHooks'
import {
  decayEpisodic,
  decaySemantic,
  ingestLegacyMemory,
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
import type { CognitionDepth, CognitiveState } from './types'
import { decayWorking, pushConcern, topConcerns } from './workingMemory'
import {
  attentionKindWeight,
  packConscienceDebug,
  updateConsciousness,
  type ConscienceDebug,
} from './consciousness'
import { competeForWorkspace, trimWorkingToCapacity, workspaceLoad } from './workspace'
import { computePredictionErrors, topPredictionErrors } from './predictive'
import { resolveProcessMode, executiveStrength, processModeLabelFr } from './executive'
import { updateSelfModel, selfModelGoalBias } from './selfModel'
import { refreshTheoryOfMind } from './tom'
import { nearbyVillagers } from '../kernels'
import { allowDeepThink, cognitionBudgetHintFr, effectiveDeepPeriod } from './budget'
import { cognitiveFactorProduct } from './decide'
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
      break
    }
  }
  if (state.famine) applyEmotionEvent(mind.emotions, 'famine', 0.35)
  const priceBread = state.prices.bread
  if (typeof priceBread === 'number' && priceBread > 2.2) {
    upsertSemantic(mind.semantic, 'market_high', 'pain cher au marché', Math.min(1, priceBread / 4), state.tick, v.x, v.y)
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
  mind.predictionErrors = computePredictionErrors(mind.needs)
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

  // Fast path: homeostatic only — dual-process System 1.
  if (depth === 'fast') {
    if (mind.needs.hunger > 0.75 && mind.goal.id !== 'survive') {
      mind.goal.commitment = Math.min(mind.goal.commitment, 4)
    }
    if (mind.emotions.stress > 0.78) {
      mind.goal.commitment = Math.min(mind.goal.commitment, 6)
    }
    // Light sleep consolidation when resting at night (cheap).
    if (v.task?.kind === 'rest' && isNight(state.tick) && (v.id + state.tick) % 5 === 0) {
      consolidateOnRest(mind, state.tick)
      updateConsciousness(state.tick, v, mind, false)
    }
    mind.lastReasons = buildReasons(mind, v.task?.kind ?? null)
    return
  }

  perceiveLocal(state, v, mind)
  updateSelfModel(v, mind)
  decayEpisodic(mind.episodic, state.tick)
  decaySemantic(mind.semantic)

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
    migrateUrge: pol.migrationUrge + (mind.emotions.stress > 0.82 ? 0.25 : 0),
    stress: mind.emotions.stress,
    loneliness,
  }, rng)
  for (const c of candidates) {
    c.score *= selfModelGoalBias(mind, c.id)
  }
  candidates.sort((a, b) => b.score - a.score)
  pickGoal(mind, candidates, v.personality.ambition)
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

export function shouldDeepThink(state: SimState, v: Villager, majorEvent = false): boolean {
  if (majorEvent) return true
  const mind = mindOf(v)
  let alive = 0
  for (let i = 0; i < state.villagers.length; i++) if (state.villagers[i].alive) alive++
  const period = effectiveDeepPeriod(alive)
  if (state.tick - mind.lastDeepTick >= period * 3) return allowDeepThink(v.id, state.tick)
  if ((v.id + state.tick) % period === 0) return allowDeepThink(v.id, state.tick)
  if (v.ambition === 'leader' && (v.id + state.tick) % Math.max(3, period - 2) === 0) {
    return allowDeepThink(v.id, state.tick)
  }
  if (politicsOf(v).grievance > 0.55 && (state.tick + v.id) % 5 === 0) return allowDeepThink(v.id, state.tick)
  return false
}

/** Factor-product utility wrapper — chooseTask uses full softmax path; flee/etc. still need a mult. */
export function cognitiveTaskModifier(
  state: SimState,
  v: Villager,
  kind: TaskKind,
  x: number,
  y: number,
  id: number | null,
): number {
  return cognitiveFactorProduct(state, v, kind, x, y, id)
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

  // Reward prediction error (RPE): δ = outcome − predicted → plasticity.
  const predicted = getPredictedReward(v.id)
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
  const mind = mindOf(v)
  if (factorWhy && factorWhy.length) mind.lastFactorWhy = factorWhy.slice(0, 6)
  mind.lastReasons = buildReasons(mind, kind, whyExtra, factorWhy)
  // Store soft prediction for next RPE (habit strength as prior).
  const prior = 0.35 + (mind.habits[kind] ?? 0) * 0.4 + Math.min(0.2, mind.goal.commitment / 80)
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

export { emotionTaskBias, skillBonus, goalLabelFr }
