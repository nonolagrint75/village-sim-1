/**
 * Generative technology — invention as mechanism, not a scripted tech tree.
 *
 * Knowledge bits are structured recipes {inputs, process, outputs, purposes}.
 * Novel techniques emerge when skilled/curious villagers repeatedly face problems
 * AND hold ingredient/process knowledge — then mutate/combine into new bits.
 * Diffusion: socialise, circle, parent→child, trade contact.
 */

import { countOf, removeFromInventory, type ResourceType } from './inventory'
import { mindOf } from './cognition'
import { logEvent } from './social'
import type { SimState, Village, Villager } from './types'

// ── Primitives ───────────────────────────────────────────────────────────────

export type MaterialKind =
  | 'wood'
  | 'stone'
  | 'iron'
  | 'charcoal'
  | 'sulfurish'
  | 'nitrate'
  | 'hide'
  | 'clay'

export type ProcessKind =
  | 'heat'
  | 'grind'
  | 'mix'
  | 'stack_high'
  | 'arch'
  | 'slit'
  | 'blast'
  | 'temper'
  | 'ferment'

export type PurposeTag =
  | 'defense'
  | 'hunting'
  | 'mining'
  | 'shelter'
  | 'craft'
  | 'weapon'
  | 'fortify'
  | 'experiment'
  | 'construction'

/** Structured discovery — never just a string name. */
export type KnowledgeBit = {
  id: string
  inputs: MaterialKind[]
  process: ProcessKind[]
  outputs: string[]
  purposes: PurposeTag[]
  confidence: number
  discoveredTick: number
  labelFr: string
}

const MAX_VILLAGER_KNOWLEDGE = 14
const MAX_VILLAGE_KNOWLEDGE = 20
const MAX_CIRCLE_TECH = 10

/** Soft LOD: invention checks on a rotating slice of agents. */
const INVENTION_PERIOD = 47
const INVENTION_SLICE = 8
const RESEARCH_COST_WOOD = 1
const RESEARCH_COST_STONE = 1

type ProblemKind = 'defense' | 'hunting' | 'mining' | 'siege_fear' | 'leisure'

type RecipeTemplate = {
  id: string
  labelFr: string
  inputs: MaterialKind[]
  process: ProcessKind[]
  outputs: string[]
  purposes: PurposeTag[]
  /** All of these bit ids (or material awareness via bit) must be known. */
  requires: string[]
  /** Soft problems that bias invention (any match helps). */
  problems: ProblemKind[]
  /** Minimum craft/build/mine skill (0–1) on inventor. */
  minSkill: number
  /** Base chance once prerequisites met (then × curiosity × surplus). */
  baseChance: number
}

/**
 * Candidate space for combination/mutation — not unlocked by year.
 * Chains are multi-step; gunpowder-like and castle-like emerge late.
 */
const RECIPE_TEMPLATES: RecipeTemplate[] = [
  {
    id: 'heat_wood',
    labelFr: 'chauffer le bois',
    inputs: ['wood'],
    process: ['heat'],
    outputs: ['ember_know'],
    purposes: ['craft', 'experiment'],
    requires: [],
    problems: ['leisure'],
    minSkill: 0.08,
    baseChance: 0.04,
  },
  {
    id: 'charcoal_burn',
    labelFr: 'charbon de bois',
    inputs: ['wood'],
    process: ['heat'],
    outputs: ['charcoal'],
    purposes: ['craft', 'experiment'],
    requires: ['heat_wood'],
    problems: ['leisure'],
    minSkill: 0.18,
    baseChance: 0.028,
  },
  {
    id: 'grind_stone',
    labelFr: 'broyer la pierre',
    inputs: ['stone'],
    process: ['grind'],
    outputs: ['powder_stone'],
    purposes: ['craft', 'mining', 'experiment'],
    requires: [],
    problems: ['mining', 'leisure'],
    minSkill: 0.12,
    baseChance: 0.035,
  },
  {
    id: 'sulfurish_mineral',
    labelFr: 'minéral sulfureux',
    inputs: ['stone'],
    process: ['grind'],
    outputs: ['sulfurish'],
    purposes: ['mining', 'experiment'],
    requires: ['grind_stone'],
    problems: ['mining'],
    minSkill: 0.22,
    baseChance: 0.022,
  },
  {
    id: 'nitrate_soil',
    labelFr: 'nitrate du sol et des déchets',
    inputs: ['clay'],
    process: ['ferment', 'grind'],
    outputs: ['nitrate'],
    purposes: ['experiment', 'craft'],
    requires: [],
    problems: ['leisure'],
    minSkill: 0.15,
    baseChance: 0.02,
  },
  {
    id: 'mix_powders',
    labelFr: 'mélanger les poudres',
    inputs: ['charcoal', 'sulfurish'],
    process: ['mix', 'grind'],
    outputs: ['mixed_dust'],
    purposes: ['experiment', 'craft'],
    requires: ['charcoal_burn', 'sulfurish_mineral'],
    problems: ['mining', 'leisure'],
    minSkill: 0.28,
    baseChance: 0.018,
  },
  {
    id: 'explosive_mix',
    labelFr: 'mélange explosif',
    inputs: ['charcoal', 'sulfurish', 'nitrate'],
    process: ['mix', 'grind', 'heat'],
    outputs: ['explosive_mix'],
    purposes: ['mining', 'weapon', 'experiment'],
    requires: ['mix_powders', 'nitrate_soil', 'charcoal_burn'],
    problems: ['mining', 'defense', 'hunting'],
    minSkill: 0.38,
    baseChance: 0.012,
  },
  {
    id: 'blast_mining',
    labelFr: 'souffle de mine',
    inputs: ['charcoal', 'sulfurish', 'nitrate'],
    process: ['blast', 'heat'],
    outputs: ['tunnel_blast'],
    purposes: ['mining'],
    requires: ['explosive_mix'],
    problems: ['mining'],
    minSkill: 0.4,
    baseChance: 0.02,
  },
  {
    id: 'stack_stone_high',
    labelFr: 'empiler la pierre en hauteur',
    inputs: ['stone'],
    process: ['stack_high'],
    outputs: ['tall_masonry'],
    purposes: ['construction', 'fortify', 'defense'],
    requires: [],
    problems: ['defense', 'siege_fear'],
    minSkill: 0.2,
    baseChance: 0.03,
  },
  {
    id: 'high_stone_keep',
    labelFr: 'donjon de pierre élevée',
    inputs: ['stone'],
    process: ['stack_high', 'arch'],
    outputs: ['keep_form'],
    purposes: ['fortify', 'defense', 'construction'],
    requires: ['stack_stone_high'],
    problems: ['defense', 'siege_fear'],
    minSkill: 0.32,
    baseChance: 0.016,
  },
  {
    id: 'arrow_slit',
    labelFr: 'meurtrière',
    inputs: ['stone'],
    process: ['slit', 'arch'],
    outputs: ['slit_opening'],
    purposes: ['fortify', 'defense', 'weapon'],
    requires: ['high_stone_keep'],
    problems: ['defense', 'hunting', 'siege_fear'],
    minSkill: 0.35,
    baseChance: 0.014,
  },
  {
    id: 'temper_iron',
    labelFr: 'trempe du fer',
    inputs: ['iron', 'charcoal'],
    process: ['heat', 'temper'],
    outputs: ['hardened_iron'],
    purposes: ['craft', 'weapon'],
    requires: ['charcoal_burn'],
    problems: ['hunting', 'defense', 'mining'],
    minSkill: 0.3,
    baseChance: 0.02,
  },
]

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v))
}

export function emptyKnowledge(): KnowledgeBit[] {
  return []
}

export function hasKnowledge(bits: KnowledgeBit[] | undefined, id: string, minConf = 0.25): boolean {
  if (!bits) return false
  const b = bits.find((k) => k.id === id)
  return !!b && b.confidence >= minConf
}

export function knowledgeCount(bits: KnowledgeBit[] | undefined): number {
  return bits?.length ?? 0
}

export function knowledgeLabelsFr(bits: KnowledgeBit[] | undefined, limit = 6): string[] {
  if (!bits || bits.length === 0) return []
  return [...bits]
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, limit)
    .map((k) => k.labelFr)
}

function ensureVillagerKnowledge(v: Villager): KnowledgeBit[] {
  if (!v.knowledge) v.knowledge = []
  return v.knowledge
}

function ensureVillageKnowledge(vg: Village): KnowledgeBit[] {
  if (!vg.knowledge) vg.knowledge = []
  return vg.knowledge
}

function bitKnown(bits: KnowledgeBit[], id: string): boolean {
  return bits.some((k) => k.id === id && k.confidence >= 0.2)
}

function materialAware(bits: KnowledgeBit[], mat: MaterialKind): boolean {
  if (mat === 'wood' || mat === 'stone' || mat === 'iron' || mat === 'hide') return true
  if (mat === 'charcoal') return bitKnown(bits, 'charcoal_burn') || bits.some((k) => k.outputs.includes('charcoal'))
  if (mat === 'sulfurish') return bitKnown(bits, 'sulfurish_mineral') || bits.some((k) => k.outputs.includes('sulfurish'))
  if (mat === 'nitrate') return bitKnown(bits, 'nitrate_soil') || bits.some((k) => k.outputs.includes('nitrate'))
  if (mat === 'clay') return true
  return false
}

function addOrReinforce(
  bits: KnowledgeBit[],
  template: RecipeTemplate,
  tick: number,
  confidence: number,
  max: number,
): { bit: KnowledgeBit; isNew: boolean } {
  const existing = bits.find((k) => k.id === template.id)
  if (existing) {
    existing.confidence = clamp01(existing.confidence + confidence * 0.35)
    return { bit: existing, isNew: false }
  }
  const bit: KnowledgeBit = {
    id: template.id,
    inputs: [...template.inputs],
    process: [...template.process],
    outputs: [...template.outputs],
    purposes: [...template.purposes],
    confidence: clamp01(confidence),
    discoveredTick: tick,
    labelFr: template.labelFr,
  }
  bits.push(bit)
  if (bits.length > max) {
    bits.sort((a, b) => a.confidence - b.confidence)
    bits.shift()
  }
  return { bit, isNew: true }
}

function copyBit(src: KnowledgeBit, tick: number, confScale: number): KnowledgeBit {
  return {
    id: src.id,
    inputs: [...src.inputs],
    process: [...src.process],
    outputs: [...src.outputs],
    purposes: [...src.purposes],
    confidence: clamp01(src.confidence * confScale),
    discoveredTick: tick,
    labelFr: src.labelFr,
  }
}

function mergeBitInto(target: KnowledgeBit[], src: KnowledgeBit, tick: number, max: number): boolean {
  const existing = target.find((k) => k.id === src.id)
  if (existing) {
    const before = existing.confidence
    existing.confidence = clamp01(Math.max(existing.confidence, src.confidence * 0.85) + 0.04)
    return existing.confidence > before + 0.02
  }
  target.push(copyBit(src, tick, 0.75))
  if (target.length > max) {
    target.sort((a, b) => a.confidence - b.confidence)
    target.shift()
  }
  return true
}

function inventorSkill(v: Villager): number {
  const mind = mindOf(v)
  return Math.max(mind.skills.craft, mind.skills.build, mind.skills.mine) * 0.7 + mind.skills.craft * 0.3
}

function villageSurplusLeisure(vg: Village | undefined): number {
  if (!vg) return 0.15
  const food = (vg.surplus.food ?? 0) + (vg.surplus.bread ?? 0) * 0.5
  const wood = vg.surplus.wood ?? 0
  const stone = vg.surplus.stone ?? 0
  const sol = vg.standardOfLiving ?? 0.3
  return clamp01(0.1 + food * 0.08 + wood * 0.04 + stone * 0.04 + sol * 0.35 + (vg.prosperity ?? 35) * 0.004)
}

function detectProblems(state: SimState, v: Villager): ProblemKind[] {
  const out: ProblemKind[] = []
  const mind = mindOf(v)
  if (mind.emotions.fear > 0.4 || mind.needs.safety > 0.45 || mind.semantic.some((s) => s.kind === 'wolves_near' && s.confidence > 0.35)) {
    out.push('defense')
  }
  if (v.ambition === 'protector' || v.profession === 'guard') out.push('defense')
  if (mind.semantic.some((s) => s.kind === 'wolves_near') || v.toolTier !== 'none') out.push('hunting')
  if (
    v.profession === 'miner' ||
    mind.skills.mine > 0.25 ||
    mind.semantic.some((s) => s.kind === 'mine_spot' && s.confidence > 0.3)
  ) {
    out.push('mining')
  }
  const vg = v.villageId !== null ? state.villages.find((g) => g.id === v.villageId) : undefined
  if (vg && vg.recentDeaths > 0.5 && vg.wallTier !== 'stone') out.push('siege_fear')
  if (vg && (vg.security ?? 0.5) < 0.4) out.push('siege_fear')
  if (villageSurplusLeisure(vg) > 0.45 && mind.needs.boredom > 0.25) out.push('leisure')
  if (v.personality.curiosity > 0.55 && mind.needs.creative > 0.2) out.push('leisure')
  return out
}

function prerequisitesMet(bits: KnowledgeBit[], template: RecipeTemplate): boolean {
  for (const req of template.requires) {
    if (!bitKnown(bits, req)) return false
  }
  for (const mat of template.inputs) {
    if (!materialAware(bits, mat)) return false
  }
  return true
}

function groupInventorBonus(state: SimState, v: Villager): number {
  if (v.villageId === null) return 1
  const vg = state.villages.find((g) => g.id === v.villageId)
  if (!vg) return 1
  const n = vg.memberIds.length
  return 1 + Math.min(0.45, (n - 4) * 0.03)
}

/**
 * Attempt one invention roll for a villager. Returns new bit id if chronicled discovery.
 */
export function tryInvent(
  state: SimState,
  v: Villager,
  rng: () => number,
  opts: { researchBoost?: number } = {},
): KnowledgeBit | null {
  const bits = ensureVillagerKnowledge(v)
  const skill = inventorSkill(v)
  const curiosity = v.personality.curiosity
  const problems = detectProblems(state, v)
  const vg = v.villageId !== null ? state.villages.find((g) => g.id === v.villageId) : undefined
  const leisure = villageSurplusLeisure(vg)
  const researchBoost = opts.researchBoost ?? 1

  // Intelligence soft proxy: curiosity + craft/build/mine + phenotype agility/endurance bias
  const intel =
    curiosity * 0.45 +
    skill * 0.35 +
    (v.phenotype?.agilityBias ?? 0.5) * 0.1 +
    (v.phenotype?.enduranceBias ?? 0.5) * 0.1

  let best: { template: RecipeTemplate; score: number } | null = null
  for (const template of RECIPE_TEMPLATES) {
    if (bitKnown(bits, template.id)) continue
    if (!prerequisitesMet(bits, template)) continue
    if (skill < template.minSkill * 0.85) continue
    const problemHit = template.problems.some((p) => problems.includes(p))
    if (!problemHit && template.problems.length > 0 && template.requires.length > 0) {
      // Advanced recipes need a real driver unless pure leisure experiment
      if (!problems.includes('leisure')) continue
    }
    let score = template.baseChance * researchBoost
    score *= 0.4 + intel * 1.4
    score *= 0.5 + leisure
    score *= groupInventorBonus(state, v)
    if (problemHit) score *= 1.55
    if (v.profession === 'blacksmith' || v.profession === 'miner' || v.profession === 'mason' || v.profession === 'builder') {
      score *= 1.2
    }
    if (v.age < 40) score *= 0.55 // children invent less
    if (!best || score > best.score) best = { template, score }
  }

  if (!best) return null
  if (rng() > Math.min(0.22, best.score)) return null

  const { bit, isNew } = addOrReinforce(bits, best.template, state.tick, 0.45 + curiosity * 0.25, MAX_VILLAGER_KNOWLEDGE)
  if (!isNew) return null

  if (vg) {
    mergeBitInto(ensureVillageKnowledge(vg), bit, state.tick, MAX_VILLAGE_KNOWLEDGE)
  }
  // Soft circle memory of discovery
  for (const c of state.circles) {
    if (!c.memberIds.includes(v.id)) continue
    if (!c.techIds) c.techIds = []
    if (!c.techIds.includes(bit.id)) {
      c.techIds.push(bit.id)
      if (c.techIds.length > MAX_CIRCLE_TECH) c.techIds.shift()
    }
    c.memory.push(`découverte : ${bit.labelFr}`)
    if (c.memory.length > 12) c.memory.shift()
  }

  logEvent(state, `${v.name} a découvert ${bit.labelFr}`)
  return bit
}

/** Teach one random superior bit from teacher → learner. */
export function teachKnowledge(state: SimState, teacher: Villager, learner: Villager, rng: () => number): boolean {
  const from = ensureVillagerKnowledge(teacher)
  const to = ensureVillagerKnowledge(learner)
  if (from.length === 0) return false
  const candidates = from.filter((k) => k.confidence > 0.3 && !bitKnown(to, k.id))
  if (candidates.length === 0) return false
  const trust = teacher.relations.get(learner.id)?.trust ?? 0.2
  const kinship = teacher.relations.get(learner.id)?.kinship ?? 0
  const chance = 0.08 + teacher.personality.sociability * 0.12 + learner.personality.curiosity * 0.15 + trust * 0.1 + kinship * 0.12
  if (rng() > chance) return false
  const pick = candidates[Math.floor(rng() * candidates.length)]
  const learned = mergeBitInto(to, pick, state.tick, MAX_VILLAGER_KNOWLEDGE)
  if (learned && rng() < 0.12) {
    logEvent(state, `${teacher.name} enseigne « ${pick.labelFr} » à ${learner.name}`)
  }
  if (learned && learner.villageId !== null) {
    const vg = state.villages.find((g) => g.id === learner.villageId)
    if (vg) mergeBitInto(ensureVillageKnowledge(vg), pick, state.tick, MAX_VILLAGE_KNOWLEDGE)
  }
  return learned
}

/** Parent → child inheritance of a subset of techniques. */
export function inheritKnowledge(child: Villager, parentA: Villager, parentB: Villager, tick: number, rng: () => number): void {
  const dest = ensureVillagerKnowledge(child)
  const pool = [...ensureVillagerKnowledge(parentA), ...ensureVillagerKnowledge(parentB)]
  for (const bit of pool) {
    if (rng() > 0.35 + bit.confidence * 0.25) continue
    mergeBitInto(dest, bit, tick, MAX_VILLAGER_KNOWLEDGE)
  }
}

/** Villages copy techniques via trade contact. */
export function diffuseVillageKnowledge(state: SimState, from: Village, to: Village, rng: () => number): void {
  const src = ensureVillageKnowledge(from)
  const dst = ensureVillageKnowledge(to)
  if (src.length === 0) return
  const pick = src[Math.floor(rng() * src.length)]
  if (rng() > 0.35 + (from.development ?? 0.2) * 0.2) return
  if (mergeBitInto(dst, pick, state.tick, MAX_VILLAGE_KNOWLEDGE) && rng() < 0.25) {
    logEvent(state, `Par le commerce, le savoir « ${pick.labelFr} » gagne un autre village`)
  }
  // Soft: a trader at destination may learn personally
  for (const id of to.memberIds) {
    const v = state.villagers.find((o) => o.id === id && o.alive)
    if (!v || (v.profession !== 'trader' && v.personality.curiosity < 0.5)) continue
    if (rng() < 0.4) mergeBitInto(ensureVillagerKnowledge(v), pick, state.tick, MAX_VILLAGER_KNOWLEDGE)
    break
  }
}

/** Mining yields soft awareness of sulfurish minerals (gradual). */
export function noteMiningInsight(state: SimState, v: Villager, rng: () => number): void {
  if (rng() > 0.04 + v.personality.curiosity * 0.06) return
  const bits = ensureVillagerKnowledge(v)
  if (!bitKnown(bits, 'grind_stone')) {
    const grind = RECIPE_TEMPLATES.find((t) => t.id === 'grind_stone')!
    addOrReinforce(bits, grind, state.tick, 0.35, MAX_VILLAGER_KNOWLEDGE)
    return
  }
  if (!bitKnown(bits, 'sulfurish_mineral') && bitKnown(bits, 'grind_stone')) {
    if (rng() < 0.35 + mindOf(v).skills.mine * 0.3) {
      const t = RECIPE_TEMPLATES.find((x) => x.id === 'sulfurish_mineral')!
      const { isNew } = addOrReinforce(bits, t, state.tick, 0.4, MAX_VILLAGER_KNOWLEDGE)
      if (isNew) logEvent(state, `${v.name} a découvert ${t.labelFr}`)
    }
  }
}

/** Pens / fields / waste → soft nitrate awareness. */
export function noteNitrateInsight(state: SimState, v: Villager, rng: () => number): void {
  if (!v.hasPen && !v.hasField) return
  if (rng() > 0.015 + v.personality.curiosity * 0.04) return
  const bits = ensureVillagerKnowledge(v)
  if (bitKnown(bits, 'nitrate_soil')) return
  const t = RECIPE_TEMPLATES.find((x) => x.id === 'nitrate_soil')!
  const { isNew } = addOrReinforce(bits, t, state.tick, 0.38, MAX_VILLAGER_KNOWLEDGE)
  if (isNew) logEvent(state, `${v.name} a découvert ${t.labelFr}`)
}

/**
 * Soft research session near workbench — consumes small resources, fails often.
 */
export function applyExperiment(
  state: SimState,
  v: Villager,
  rng: () => number,
): { continue: boolean; insight: KnowledgeBit | null } {
  const wood = countOf(v.inventory, 'wood')
  const stone = countOf(v.inventory, 'stone')
  if (wood >= RESEARCH_COST_WOOD) removeFromInventory(v.inventory, 'wood', RESEARCH_COST_WOOD)
  else if (stone >= RESEARCH_COST_STONE) removeFromInventory(v.inventory, 'stone', RESEARCH_COST_STONE)
  else return { continue: false, insight: null }

  v.stamina = Math.max(0, v.stamina - 0.06)
  const mind = mindOf(v)
  mind.needs.boredom = clamp01(mind.needs.boredom - 0.08)
  mind.needs.creative = clamp01(mind.needs.creative - 0.05)

  // Fail often
  const chance = 0.06 + v.personality.curiosity * 0.12 + inventorSkill(v) * 0.1 + villageSurplusLeisure(
    v.villageId !== null ? state.villages.find((g) => g.id === v.villageId) : undefined,
  ) * 0.08
  if (rng() > chance) return { continue: true, insight: null }

  const insight = tryInvent(state, v, rng, { researchBoost: 2.2 })
  return { continue: insight === null, insight }
}

/** Construction technique gates. */
export function knowsHighStoneKeep(v: Villager | null | undefined, vg: Village | null | undefined): boolean {
  return (
    hasKnowledge(v?.knowledge, 'high_stone_keep', 0.3) ||
    hasKnowledge(vg?.knowledge, 'high_stone_keep', 0.35)
  )
}

export function knowsArrowSlit(v: Villager | null | undefined, vg: Village | null | undefined): boolean {
  return hasKnowledge(v?.knowledge, 'arrow_slit', 0.3) || hasKnowledge(vg?.knowledge, 'arrow_slit', 0.35)
}

export function knowsBlastMining(v: Villager, vg: Village | null | undefined): boolean {
  return (
    hasKnowledge(v.knowledge, 'blast_mining', 0.28) ||
    hasKnowledge(v.knowledge, 'explosive_mix', 0.45) ||
    hasKnowledge(vg?.knowledge, 'blast_mining', 0.3) ||
    hasKnowledge(vg?.knowledge, 'explosive_mix', 0.5)
  )
}

export function knowsTemperIron(v: Villager | null | undefined, vg: Village | null | undefined): boolean {
  return hasKnowledge(v?.knowledge, 'temper_iron', 0.3) || hasKnowledge(vg?.knowledge, 'temper_iron', 0.35)
}

/** Soft combat bonus from temper / explosive / arrow slit — not modern guns. */
export function techCombatBonus(v: Villager): number {
  let b = 0
  if (hasKnowledge(v.knowledge, 'temper_iron', 0.35)) b += 0.06
  // Late soft: crude powder charges — never modern guns, confidence-gated.
  if (hasKnowledge(v.knowledge, 'explosive_mix', 0.55)) b += 0.04
  if (hasKnowledge(v.knowledge, 'blast_mining', 0.4)) b += 0.02
  if (hasKnowledge(v.knowledge, 'arrow_slit', 0.4) && v.profession === 'guard') b += 0.03
  return b
}

/** LOD world tick — sample inventors facing problems / leisure. */
export function tickTechnology(state: SimState, rng: () => number): void {
  if (state.tick % INVENTION_PERIOD !== 0) return
  const alive = state.villagers
  const n = alive.length
  if (n === 0) return
  const start = (Math.floor(state.tick / INVENTION_PERIOD) * INVENTION_SLICE) % n
  for (let i = 0; i < INVENTION_SLICE; i++) {
    const v = alive[(start + i) % n]
    if (!v.alive || v.age < 30) continue
    if (v.hunger < 1.2 || v.stamina < 0.8) continue
    const problems = detectProblems(state, v)
    if (problems.length === 0 && v.personality.curiosity < 0.6) continue
    tryInvent(state, v, rng)
    noteNitrateInsight(state, v, rng)
  }

  // Circle diffusion: members share one bit occasionally
  if (state.tick % (INVENTION_PERIOD * 3) === 0) {
    for (const c of state.circles) {
      if (c.memberIds.length < 2 || !c.techIds || c.techIds.length === 0) continue
      if (rng() > 0.4) continue
      const id = c.techIds[Math.floor(rng() * c.techIds.length)]
      const donors = c.memberIds
        .map((mid) => state.villagers.find((v) => v.id === mid && v.alive))
        .filter((v): v is Villager => !!v && hasKnowledge(v.knowledge, id, 0.25))
      if (donors.length === 0) continue
      const donor = donors[0]
      const learner = state.villagers.find(
        (v) => v.alive && c.memberIds.includes(v.id) && v.id !== donor.id && !hasKnowledge(v.knowledge, id, 0.2),
      )
      if (learner) teachKnowledge(state, donor, learner, rng)
    }
  }
}

export function experimentUrge(v: Villager, state: SimState): number {
  if (!v.hasWorkbench) return 0
  if (v.age < 35) return 0
  if (v.hunger < 1.5 || v.stamina < 1.2) return 0
  const wood = countOf(v.inventory, 'wood')
  const stone = countOf(v.inventory, 'stone')
  if (wood < 1 && stone < 1) return 0
  const mind = mindOf(v)
  const vg = v.villageId !== null ? state.villages.find((g) => g.id === v.villageId) : undefined
  const leisure = villageSurplusLeisure(vg)
  let urge =
    8 +
    v.personality.curiosity * 55 +
    mind.needs.boredom * 30 +
    mind.needs.creative * 25 +
    inventorSkill(v) * 20 +
    leisure * 35
  if (v.profession === 'blacksmith' || v.profession === 'mason') urge += 18
  if (v.task?.kind === 'idle') urge += 10
  return urge
}

export function spendExperimentResources(v: Villager): ResourceType | null {
  if (countOf(v.inventory, 'wood') >= 1) return 'wood'
  if (countOf(v.inventory, 'stone') >= 1) return 'stone'
  return null
}
