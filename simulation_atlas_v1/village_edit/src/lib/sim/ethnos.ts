/**
 * Culture vectorielle (Axelrod) + ethnogenèse / langues — séparées de la génétique.
 *
 * Règles dures :
 * - Pas d'ethnies prédéfinies (pas de Français/Arabe/etc.).
 * - Génétique ≠ culture : phénotype/génome n'alimentent jamais l'identité.
 * - Ethnie = identité sociale-historique émergente.
 * - Discrimination uniquement via griefs / rivalités / compétition déjà présents.
 */

import { feelFamine, villagerFeelsFamine } from './ecology'
import { politicsOf, logCause } from './politics'
import { logEvent } from './social'
import type { CognitiveState } from './cognition/types'
import type { SimState, Villager } from './types'
import { distance } from './world'
import { circlesOf } from './politics'

// ── Axelrod culture features (on CognitiveState) ─────────────────────────────

export const CULTURE_FEATURE_COUNT = 5
/** Traits discrets par feature (0..q-1). */
export const CULTURE_TRAIT_Q = 8

export type EthnosPeer = {
  features: number[]
  tag: string | null
  weight: number
  trust: number
  sameCircle: boolean
  contact: number
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v))
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v))
}

function pushCap<T>(arr: T[], item: T, cap: number): void {
  arr.push(item)
  while (arr.length > cap) arr.shift()
}

function pushUnique(arr: string[], tag: string, cap: number): void {
  if (!tag || arr.includes(tag)) return
  arr.push(tag)
  while (arr.length > cap) arr.shift()
}

const NAME_ONSETS = ['k', 'm', 'r', 't', 'b', 'n', 's', 'l', 'v', 'd', 'g', 'p', 'z', 'h', 'w']
const NAME_NUCLEI = ['a', 'e', 'i', 'o', 'u', 'ai', 'eo', 'ua']
const NAME_CODAS = ['', 'n', 'r', 'l', 's', 'th', 'm', 'k']

function genSyllable(rng: () => number): string {
  return (
    NAME_ONSETS[Math.floor(rng() * NAME_ONSETS.length)] +
    NAME_NUCLEI[Math.floor(rng() * NAME_NUCLEI.length)] +
    NAME_CODAS[Math.floor(rng() * NAME_CODAS.length)]
  )
}

export function generateAbstractName(rng: () => number, parts = 2): string {
  const syls: string[] = []
  for (let i = 0; i < Math.max(1, Math.min(3, parts)); i++) syls.push(genSyllable(rng))
  const raw = syls.join('')
  return raw.charAt(0).toUpperCase() + raw.slice(1)
}

export function randomCultureFeatures(rng: () => number): number[] {
  const f: number[] = []
  for (let i = 0; i < CULTURE_FEATURE_COUNT; i++) {
    f.push(Math.floor(rng() * CULTURE_TRAIT_Q))
  }
  return f
}

/** Soft tag from feature vector — generated syllables, never a real ethnonym. */
export function deriveCultureTag(features: number[]): string {
  if (!features.length) return generateAbstractName(() => 0.37, 1)
  let h = 2166136261
  for (let i = 0; i < features.length; i++) {
    h ^= (features[i] + 1) * (i + 3)
    h = Math.imul(h, 16777619)
  }
  h >>>= 0
  const rng = () => {
    h ^= h << 13
    h ^= h >>> 17
    h ^= h << 5
    h >>>= 0
    return h / 4294967296
  }
  return generateAbstractName(rng, 2)
}

export function cultureSimilarity(a: number[] | null | undefined, b: number[] | null | undefined): number {
  if (!a?.length || !b?.length) return 0.35
  const n = Math.min(a.length, b.length, CULTURE_FEATURE_COUNT)
  if (n === 0) return 0.35
  let match = 0
  for (let i = 0; i < n; i++) if (a[i] === b[i]) match++
  return match / n
}

/**
 * Homophilie soft — similarité culturelle module socialise / don / commerce / confiance.
 * Pas une table de haine de groupe.
 */
export function homophilyBias(
  similarity: number,
  kind: 'trust' | 'socialise' | 'giveFood' | 'trade' | 'marry',
): number {
  const s = clamp01(similarity)
  switch (kind) {
    case 'trust':
      return 0.75 + s * 0.45
    case 'socialise':
      return 0.7 + s * 0.55
    case 'giveFood':
      return 0.8 + s * 0.35
    case 'trade':
      return 0.85 + s * 0.3
    case 'marry':
      return 0.55 + s * 0.7
  }
}

/** Axelrod borrow: copy one differing trait when contact is high enough. */
export function borrowOnContact(
  self: number[],
  other: number[],
  contact: number,
  rng: () => number,
): boolean {
  if (!self.length || !other.length || contact < 0.25) return false
  const n = Math.min(self.length, other.length)
  const diffs: number[] = []
  for (let i = 0; i < n; i++) if (self[i] !== other[i]) diffs.push(i)
  if (diffs.length === 0) return false
  const sim = 1 - diffs.length / n
  // Interact only if somewhat similar (classic Axelrod gate), then copy one trait.
  if (sim < 0.15 && contact < 0.55) return false
  if (rng() > contact * (0.35 + sim * 0.5)) return false
  const i = diffs[Math.floor(rng() * diffs.length)]
  self[i] = other[i]
  return true
}

export function ensureCultureState(mind: CognitiveState, v: Villager, rng: () => number): void {
  if (!mind.cultureFeatures || mind.cultureFeatures.length !== CULTURE_FEATURE_COUNT) {
    // Seed from villager seed — independent of genome/phenotype.
    let s = (v.seed ^ 0x9e3779b9) >>> 0
    const localRng = () => {
      s ^= s << 13
      s ^= s >>> 17
      s ^= s << 5
      s >>>= 0
      return s / 4294967296
    }
    mind.cultureFeatures = randomCultureFeatures(() => localRng() * 0.85 + rng() * 0.15)
  }
  if (!mind.cultureTolerance || mind.cultureTolerance < 0.05) {
    mind.cultureTolerance = 0.35 + v.personality.sociability * 0.25 - v.personality.curiosity * 0.08
  }
  if (!mind.cultureTag) {
    mind.cultureTag = deriveCultureTag(mind.cultureFeatures)
    mind.cultureWeight = Math.max(mind.cultureWeight, 0.12)
  }
}

export function seedCultureFeaturesFromParents(
  childMind: CognitiveState,
  parentA: CognitiveState,
  parentB: CognitiveState,
  rng: () => number,
): void {
  const fa = parentA.cultureFeatures?.length === CULTURE_FEATURE_COUNT ? parentA.cultureFeatures : null
  const fb = parentB.cultureFeatures?.length === CULTURE_FEATURE_COUNT ? parentB.cultureFeatures : null
  if (!fa && !fb) {
    childMind.cultureFeatures = randomCultureFeatures(rng)
  } else {
    const out: number[] = []
    for (let i = 0; i < CULTURE_FEATURE_COUNT; i++) {
      if (rng() < 0.08) {
        out.push(Math.floor(rng() * CULTURE_TRAIT_Q))
      } else {
        const pick = rng() < 0.5 ? fa : fb
        const other = pick === fa ? fb : fa
        out.push(pick?.[i] ?? other?.[i] ?? Math.floor(rng() * CULTURE_TRAIT_Q))
      }
    }
    childMind.cultureFeatures = out
  }
  childMind.cultureTolerance = clamp01(
    ((parentA.cultureTolerance || 0.4) + (parentB.cultureTolerance || 0.4)) / 2 + (rng() - 0.5) * 0.1,
  )
  childMind.cultureTag = deriveCultureTag(childMind.cultureFeatures)
  childMind.cultureWeight =
    0.15 + Math.min(parentA.cultureWeight, parentB.cultureWeight) * 0.25 + rng() * 0.1
}

/**
 * Per-agent ethnos tick (deep cognition): Axelrod imitation + Schelling comfort.
 * Does not invent ethnicities — that is tickEthnosWorld.
 */
export function tickEthnos(
  state: SimState,
  mind: CognitiveState,
  v: Villager,
  peers: EthnosPeer[],
  _peerFeatures: (o: Villager) => number[] | null,
  rng: () => number,
): void {
  ensureCultureState(mind, v, rng)
  const eth = ethnosOf(v)

  let similarN = 0
  let peerN = 0
  for (const peer of peers) {
    peerN++
    const sim = cultureSimilarity(mind.cultureFeatures, peer.features)
    if (sim >= mind.cultureTolerance * 0.85) similarN++
    if (peer.contact > 0.28 && peer.features?.length) {
      if (borrowOnContact(mind.cultureFeatures, peer.features, peer.contact, rng)) {
        mind.cultureWeight = clamp01(mind.cultureWeight + 0.02)
        if (mind.cultureWeight < 0.35) mind.cultureTag = deriveCultureTag(mind.cultureFeatures)
      }
    }
    // Soft language contact while co-residing / chatting
    if (peer.contact > 0.4 && peer.sameCircle) {
      eth.identity.village = clamp01(eth.identity.village + 0.01)
    }
  }

  // Rare cultural drift (mutation soft)
  if (rng() < 0.015 * (0.4 + v.personality.curiosity) * (1 - politicsOf(v).beliefs.tradition * 0.5)) {
    const i = Math.floor(rng() * mind.cultureFeatures.length)
    mind.cultureFeatures[i] = Math.floor(rng() * CULTURE_TRAIT_Q)
    mind.cultureWeight = clamp01(mind.cultureWeight * 0.94)
  }

  // Schelling: discomfort when too few similar neighbours → migration urge (via politics)
  if (peerN >= 2) {
    const ratio = similarN / peerN
    if (ratio < mind.cultureTolerance * 0.55) {
      const pol = politicsOf(v)
      pol.migrationUrge = clamp01(pol.migrationUrge + 0.04 * (mind.cultureTolerance - ratio))
      mind.cultureTolerance = clamp01(mind.cultureTolerance + 0.01)
    } else {
      mind.cultureTolerance = clamp01(mind.cultureTolerance * 0.998)
    }
  }

  if (mind.cultureTag) pushUnique(eth.selfTags, mind.cultureTag, MAX_SELF_TAGS)
  // Tiny couple: house-plan vernacular tags → ethnos selfTags (feeds ethnogenesis).
  // Skip whim flourishes; culture.ts writes these tags via cultureTagsFromContext.
  const planTags = v.homePlan?.cultureTags
  if (planTags?.length) {
    for (const t of planTags) {
      if (!t || t.startsWith('fantaisie')) continue
      pushUnique(eth.selfTags, t, MAX_SELF_TAGS)
    }
  }
  void state
}

// ── Languages & ethnogenesis (world layer) ───────────────────────────────────

export const ETHNOS_WORLD_TICK = 180
export const DIALECT_TICK = 420
export const MAX_LANGUAGES = 48
export const MAX_ETHNIES = 36
export const MAX_SELF_TAGS = 5
export const MAX_PERCEIVED = 8

export function regionKey(x: number, y: number): string {
  return `${Math.floor(x / 48)}:${Math.floor(y / 48)}`
}

export interface Language {
  id: number
  name: string
  parentId: number | null
  tone: number
  rhythm: number
  cluster: number
  speakers: number
  bornTick: number
  faded: boolean
}

export interface Ethnie {
  id: number
  name: string
  languageId: number
  cultureTags: string[]
  homeRegion: string
  villageId: number | null
  memberIds: number[]
  cohesion: number
  sharedMemory: string[]
  formedTick: number
  renamedFrom: string | null
  faded: boolean
}

export interface IdentityWeights {
  village: number
  family: number
  creed: number
  people: number
}

export interface PerceivedIdentity {
  subjectId: number
  ethnieId: number
  confidence: number
}

export interface EthnosSelf {
  languageId: number
  dialect: number
  selfTags: string[]
  ethnieId: number | null
  hybridOf: number[]
  identity: IdentityWeights
  perceived: PerceivedIdentity[]
  birthRegion: string
  homelandLanguageId: number
  diasporaAge: number
}

const ETHNOS = new Map<number, EthnosSelf>()

export function resetEthnosCaches(): void {
  ETHNOS.clear()
}

export function emptyIdentity(): IdentityWeights {
  return { village: 0.25, family: 0.35, creed: 0.1, people: 0.05 }
}

export function emptyEthnos(birthRegion: string, languageId: number): EthnosSelf {
  return {
    languageId,
    dialect: 0,
    selfTags: [],
    ethnieId: null,
    hybridOf: [],
    identity: emptyIdentity(),
    perceived: [],
    birthRegion,
    homelandLanguageId: languageId,
    diasporaAge: 0,
  }
}

export function ethnosOf(v: Villager): EthnosSelf {
  let e = ETHNOS.get(v.id)
  if (!e) {
    e = emptyEthnos(regionKey(v.x, v.y), 0)
    ETHNOS.set(v.id, e)
  }
  return e
}

export function dropEthnos(id: number): void {
  ETHNOS.delete(id)
}

export function findLanguage(state: SimState, id: number | null | undefined): Language | null {
  if (id == null) return null
  for (const L of state.languages) if (L.id === id) return L
  return null
}

export function findEthnie(state: SimState, id: number | null | undefined): Ethnie | null {
  if (id == null) return null
  for (const e of state.ethnies) if (e.id === id) return e
  return null
}

export function languageDistance(a: Language, b: Language): number {
  return (
    Math.abs(a.tone - b.tone) * 0.4 +
    Math.abs(a.rhythm - b.rhythm) * 0.35 +
    Math.abs(a.cluster - b.cluster) * 0.25
  )
}

export function intelligibility(
  state: SimState,
  langA: number,
  dialectA: number,
  langB: number,
  dialectB: number,
): number {
  if (langA === langB) return clamp01(1 - Math.abs(dialectA - dialectB) * 0.55)
  const A = findLanguage(state, langA)
  const B = findLanguage(state, langB)
  if (!A || !B) return 0.15
  const sameFamily =
    A.parentId !== null && (A.parentId === B.id || B.parentId === A.id || A.parentId === B.parentId)
  const base = 1 - languageDistance(A, B)
  return clamp01(base * (sameFamily ? 0.85 : 0.55) - Math.abs(dialectA - dialectB) * 0.2)
}

function createLanguage(
  state: SimState,
  rng: () => number,
  seed: { tone: number; rhythm: number; cluster: number; parentId?: number | null },
): Language {
  const L: Language = {
    id: state.nextLanguageId++,
    name: generateAbstractName(rng, 2),
    parentId: seed.parentId ?? null,
    tone: clamp01(seed.tone),
    rhythm: clamp01(seed.rhythm),
    cluster: clamp01(seed.cluster),
    speakers: 0,
    bornTick: state.tick,
    faded: false,
  }
  state.languages.push(L)
  while (state.languages.length > MAX_LANGUAGES) {
    const faded = state.languages.find((x) => x.faded && x.speakers === 0)
    if (faded) state.languages = state.languages.filter((x) => x.id !== faded.id)
    else break
  }
  return L
}

export function seedFounderEthnos(state: SimState, villagers: Villager[], rng: () => number): void {
  const byRegion = new Map<string, Villager[]>()
  for (const v of villagers) {
    const key = regionKey(v.x, v.y)
    const list = byRegion.get(key) ?? []
    list.push(v)
    byRegion.set(key, list)
  }
  for (const [, group] of byRegion) {
    const proto = createLanguage(state, rng, { tone: rng(), rhythm: rng(), cluster: rng() })
    for (const v of group) {
      const eth = ethnosOf(v)
      eth.languageId = proto.id
      eth.homelandLanguageId = proto.id
      eth.dialect = (rng() - 0.5) * 0.12
      eth.birthRegion = regionKey(v.x, v.y)
      eth.identity.village = 0.2
      eth.identity.family = 0.4
      eth.identity.people = 0.02
    }
  }
  refreshLanguageSpeakers(state)
}

function refreshLanguageSpeakers(state: SimState): void {
  const counts = new Map<number, number>()
  for (const v of state.villagers) {
    if (!v.alive) continue
    const eth = ETHNOS.get(v.id)
    if (!eth) continue
    counts.set(eth.languageId, (counts.get(eth.languageId) ?? 0) + 1)
  }
  for (const L of state.languages) {
    L.speakers = counts.get(L.id) ?? 0
    if (L.speakers === 0 && state.tick - L.bornTick > 800) L.faded = true
  }
}

export function seedEthnosFromParents(
  state: SimState,
  child: Villager,
  parentA: Villager,
  parentB: Villager,
  cultureTag: string | null,
  rng: () => number,
): void {
  const ea = ethnosOf(parentA)
  const eb = ethnosOf(parentB)
  const childEth = ethnosOf(child)

  const pickLang = rng() < 0.5 + (ea.identity.people - eb.identity.people) * 0.2 ? ea : eb
  childEth.languageId = pickLang.languageId
  childEth.homelandLanguageId = pickLang.languageId
  childEth.dialect = (ea.dialect + eb.dialect) / 2 + (rng() - 0.5) * 0.08
  childEth.birthRegion = regionKey(child.x, child.y)
  childEth.selfTags = []
  for (const t of [...ea.selfTags, ...eb.selfTags]) pushUnique(childEth.selfTags, t, MAX_SELF_TAGS)
  if (cultureTag) pushUnique(childEth.selfTags, cultureTag, MAX_SELF_TAGS)

  const idA = ea.ethnieId
  const idB = eb.ethnieId
  childEth.hybridOf = []
  if (idA !== null && idA === idB) {
    if (rng() > 0.12) {
      childEth.ethnieId = idA
      childEth.identity.people = 0.15 + rng() * 0.2
    } else {
      childEth.ethnieId = null
      childEth.identity.people = 0.05
    }
  } else if (idA !== null && idB !== null && idA !== idB) {
    const roll = rng()
    if (roll < 0.35) {
      childEth.ethnieId = null
      childEth.hybridOf = [idA, idB]
      childEth.identity.people = 0.08 + rng() * 0.12
    } else if (roll < 0.7) {
      childEth.ethnieId = rng() < 0.5 ? idA : idB
      childEth.hybridOf = [idA, idB]
      childEth.identity.people = 0.12 + rng() * 0.15
    } else {
      childEth.ethnieId = null
      childEth.identity.people = 0.04
    }
  } else {
    const only = idA ?? idB
    if (only !== null && rng() < 0.55) {
      childEth.ethnieId = only
      childEth.identity.people = 0.1 + rng() * 0.15
    } else {
      childEth.ethnieId = null
      childEth.identity.people = 0.05
    }
  }

  childEth.identity.family = 0.45 + rng() * 0.2
  childEth.identity.village = child.villageId !== null ? 0.25 : 0.1
  childEth.identity.creed = 0.05
  childEth.diasporaAge = 0

  if (childEth.ethnieId !== null) {
    const E = findEthnie(state, childEth.ethnieId)
    if (E && !E.memberIds.includes(child.id)) pushCap(E.memberIds, child.id, 64)
  }
}

export function onEthnosContact(
  state: SimState,
  a: Villager,
  b: Villager,
  rng: () => number,
  cultureTagA: string | null,
  cultureTagB: string | null,
  strength = 1,
): void {
  const ea = ethnosOf(a)
  const eb = ethnosOf(b)
  const intel = intelligibility(state, ea.languageId, ea.dialect, eb.languageId, eb.dialect)
  if (intel < 0.2) return

  const trust = a.relations.get(b.id)?.trust ?? 0.2
  const open =
    (1 - politicsOf(a).beliefs.tradition) * 0.35 +
    a.personality.curiosity * 0.25 +
    trust * 0.3 +
    strength * 0.1

  if (ea.languageId === eb.languageId) {
    const mid = (ea.dialect + eb.dialect) / 2
    ea.dialect += (mid - ea.dialect) * 0.08 * strength
    eb.dialect += (mid - eb.dialect) * 0.08 * strength
  } else if (open > 0.45 && intel > 0.4 && rng() < open * 0.12 * strength) {
    if (ea.diasporaAge > 40 || a.villageId === b.villageId) {
      ea.languageId = eb.languageId
      ea.dialect = eb.dialect + (rng() - 0.5) * 0.1
    }
  }

  if (cultureTagB && open > 0.4 && rng() < 0.1 * strength) pushUnique(ea.selfTags, cultureTagB, MAX_SELF_TAGS)
  if (cultureTagA && open > 0.4 && rng() < 0.1 * strength) pushUnique(eb.selfTags, cultureTagA, MAX_SELF_TAGS)

  if (eb.ethnieId !== null && trust > 0.25) upsertPerceived(ea, b.id, eb.ethnieId, 0.25 + trust * 0.4)
  if (ea.ethnieId !== null && trust > 0.25) upsertPerceived(eb, a.id, ea.ethnieId, 0.25 + trust * 0.4)
}

function upsertPerceived(eth: EthnosSelf, subjectId: number, ethnieId: number, confidence: number): void {
  const existing = eth.perceived.find((p) => p.subjectId === subjectId)
  if (existing) {
    existing.ethnieId = ethnieId
    existing.confidence = clamp01(existing.confidence * 0.7 + confidence * 0.3)
  } else {
    pushCap(eth.perceived, { subjectId, ethnieId, confidence: clamp01(confidence) }, MAX_PERCEIVED)
  }
}

export function onEthnosMigrateOut(_state: SimState, v: Villager): void {
  const eth = ethnosOf(v)
  eth.diasporaAge = Math.max(eth.diasporaAge, 1)
  eth.identity.village = clamp01(eth.identity.village * 0.55)
}

export function onEthnosMigrateIn(state: SimState, v: Villager, _villageId: number): void {
  const eth = ethnosOf(v)
  eth.identity.village = clamp01(eth.identity.village + 0.12)
  let majorityLang: number | null = null
  let best = 0
  const counts = new Map<number, number>()
  for (const o of state.villagers) {
    if (!o.alive || o.villageId !== v.villageId || o.id === v.id) continue
    const oe = ETHNOS.get(o.id)
    if (!oe) continue
    const n = (counts.get(oe.languageId) ?? 0) + 1
    counts.set(oe.languageId, n)
    if (n > best) {
      best = n
      majorityLang = oe.languageId
    }
  }
  if (majorityLang !== null && majorityLang !== eth.languageId && best >= 3) {
    eth.identity.people = clamp01(eth.identity.people * 0.92)
  }
}

function threatKeysFor(state: SimState, v: Villager, rivalId: number | null): string[] {
  const keys: string[] = []
  if (villagerFeelsFamine(state, v)) keys.push('famine')
  if (v.grudgeTarget !== null) keys.push(`grudge:${v.grudgeTarget}`)
  if (rivalId !== null) keys.push(`rival:${rivalId}`)
  for (const c of circlesOf(state, v)) {
    if (c.kind === 'threat' || c.problemCount > 2) keys.push(`circle:${c.kind}`)
  }
  for (let i = state.log.length - 1; i >= Math.max(0, state.log.length - 8); i--) {
    const line = state.log[i]
    if (/famine/i.test(line)) keys.push('mem:famine')
    if (/loup/i.test(line)) keys.push('mem:loups')
    if (/vol/i.test(line)) keys.push('mem:vols')
  }
  return keys
}

function createEthnie(
  state: SimState,
  rng: () => number,
  seed: {
    languageId: number
    tags: string[]
    region: string
    villageId: number | null
    members: Villager[]
    memory: string[]
  },
): Ethnie {
  const E: Ethnie = {
    id: state.nextEthnieId++,
    name: generateAbstractName(rng, rng() < 0.4 ? 3 : 2),
    languageId: seed.languageId,
    cultureTags: seed.tags.slice(0, MAX_SELF_TAGS),
    homeRegion: seed.region,
    villageId: seed.villageId,
    memberIds: seed.members.map((m) => m.id),
    cohesion: 0.35,
    sharedMemory: seed.memory.slice(0, 6),
    formedTick: state.tick,
    renamedFrom: null,
    faded: false,
  }
  state.ethnies.push(E)
  while (state.ethnies.length > MAX_ETHNIES) {
    const faded = state.ethnies.find((x) => x.faded)
    if (faded) state.ethnies = state.ethnies.filter((x) => x.id !== faded.id)
    else break
  }
  return E
}

type CultureLookup = (v: Villager) => { cultureTag: string | null; rivalId: number | null }

function tryEthnogenesis(state: SimState, rng: () => number, cultureOf: CultureLookup): void {
  const clusters = new Map<string, Villager[]>()
  for (const v of state.villagers) {
    if (!v.alive || v.villageId === null) continue
    const eth = ethnosOf(v)
    const key = `${v.villageId}|${eth.languageId}`
    const list = clusters.get(key) ?? []
    list.push(v)
    clusters.set(key, list)
  }

  for (const members of clusters.values()) {
    if (members.length < 4) continue
    const ethnieCounts = new Map<number, number>()
    for (const v of members) {
      const id = ethnosOf(v).ethnieId
      if (id !== null) ethnieCounts.set(id, (ethnieCounts.get(id) ?? 0) + 1)
    }
    let domN = 0
    for (const n of ethnieCounts.values()) if (n > domN) domN = n
    if (domN >= members.length * 0.7) continue

    const tagFreq = new Map<string, number>()
    for (const v of members) {
      const eth = ethnosOf(v)
      for (const t of eth.selfTags) tagFreq.set(t, (tagFreq.get(t) ?? 0) + 1)
      const tag = cultureOf(v).cultureTag
      if (tag) tagFreq.set(tag, (tagFreq.get(tag) ?? 0) + 1)
    }
    const sharedTags = [...tagFreq.entries()]
      .filter(([, n]) => n >= Math.max(2, Math.ceil(members.length * 0.4)))
      .map(([t]) => t)
    if (sharedTags.length === 0) continue

    const memFreq = new Map<string, number>()
    for (const v of members) {
      for (const k of threatKeysFor(state, v, cultureOf(v).rivalId)) {
        memFreq.set(k, (memFreq.get(k) ?? 0) + 1)
      }
    }
    const sharedMem = [...memFreq.entries()]
      .filter(([, n]) => n >= Math.max(2, Math.ceil(members.length * 0.35)))
      .map(([k]) => k)
    const clusterVg =
      members[0].villageId != null ? state.villages.find((g) => g.id === members[0].villageId) : null
    if (sharedMem.length < 1 && !feelFamine(state, clusterVg)) continue

    let cohesion = 0
    for (const v of members) {
      const eth = ethnosOf(v)
      cohesion +=
        clamp01(v.age / 800) * 0.4 + eth.identity.village * 0.3 + (1 - clamp01(eth.diasporaAge / 200)) * 0.3
    }
    cohesion /= members.length
    if (cohesion < 0.42 || rng() > 0.35) continue

    const head = members[0]
    const headEth = ethnosOf(head)
    const E = createEthnie(state, rng, {
      languageId: headEth.languageId,
      tags: sharedTags,
      region: headEth.birthRegion,
      villageId: head.villageId,
      members,
      memory: sharedMem,
    })
    for (const v of members) {
      const eth = ethnosOf(v)
      if (eth.ethnieId === null || eth.hybridOf.length > 0 || rng() < 0.75) {
        eth.ethnieId = E.id
        eth.identity.people = clamp01(eth.identity.people + 0.2)
        for (const t of sharedTags) pushUnique(eth.selfTags, t, MAX_SELF_TAGS)
      }
    }
    logCause(state, `mémoire partagée (${sharedMem.slice(0, 2).join(', ') || 'foyer'})`, `émergence du peuple ${E.name}`)
    logEvent(state, `Un peuple se nomme : ${E.name}`)
    return
  }
}

function tickDialectDrift(state: SimState, rng: () => number): void {
  for (const v of state.villagers) {
    if (!v.alive) continue
    if ((state.tick + v.id * 17) % DIALECT_TICK !== 0) continue
    const eth = ethnosOf(v)
    let sameLangNear = 0
    let otherNear = 0
    for (const o of state.villagers) {
      if (!o.alive || o.id === v.id) continue
      if (distance(v.x, v.y, o.x, o.y) > 22) continue
      const oe = ETHNOS.get(o.id)
      if (!oe) continue
      otherNear++
      if (oe.languageId === eth.languageId) sameLangNear++
      if (otherNear >= 8) break
    }
    const isolation = otherNear === 0 ? 1 : 1 - sameLangNear / Math.max(1, otherNear)
    eth.dialect = clamp(eth.dialect + (rng() - 0.45) * 0.04 * (0.4 + isolation), -1, 1)

    if (eth.diasporaAge > 0) {
      eth.diasporaAge += 1
      eth.identity.people = clamp01(eth.identity.people * 0.997)
      if (v.villageId !== null && isolation < 0.4 && rng() < 0.15) eth.dialect *= 0.92
      if (eth.diasporaAge > 600) eth.diasporaAge = Math.floor(eth.diasporaAge * 0.9)
    } else if (v.villageId === null) {
      eth.diasporaAge = 1
    }

    if (Math.abs(eth.dialect) > 0.72 && isolation > 0.55 && sameLangNear >= 2 && rng() < 0.08) {
      const parent = findLanguage(state, eth.languageId)
      if (!parent || parent.faded) continue
      const child = createLanguage(state, rng, {
        tone: clamp01(parent.tone + eth.dialect * 0.15),
        rhythm: clamp01(parent.rhythm + (rng() - 0.5) * 0.1),
        cluster: clamp01(parent.cluster + (rng() - 0.5) * 0.1),
        parentId: parent.id,
      })
      for (const o of state.villagers) {
        if (!o.alive) continue
        const oe = ETHNOS.get(o.id)
        if (!oe || oe.languageId !== parent.id) continue
        if (Math.abs(oe.dialect - eth.dialect) > 0.25) continue
        if (distance(v.x, v.y, o.x, o.y) > 28) continue
        oe.languageId = child.id
        oe.dialect *= 0.4
      }
      eth.languageId = child.id
      eth.dialect *= 0.35
      logCause(state, `isolement dialectal`, `la langue ${child.name} se détache de ${parent.name}`)
    }
  }

  if (rng() < 0.12) {
    const active = state.languages.filter((L) => !L.faded && L.speakers >= 2)
    for (let i = 0; i < active.length; i++) {
      for (let j = i + 1; j < active.length; j++) {
        const A = active[i]
        const B = active[j]
        if (languageDistance(A, B) > 0.18) continue
        const keep = A.speakers >= B.speakers ? A : B
        const drop = keep === A ? B : A
        for (const v of state.villagers) {
          if (!v.alive) continue
          const eth = ETHNOS.get(v.id)
          if (eth && eth.languageId === drop.id) eth.languageId = keep.id
        }
        drop.faded = true
        drop.speakers = 0
        logCause(state, `contacts répétés`, `fusion des langues ${keep.name} et ${drop.name}`)
        return
      }
    }
  }
}

function refreshEthnies(state: SimState, rng: () => number): void {
  for (const E of state.ethnies) {
    if (E.faded) continue
    const living: Villager[] = []
    for (const id of E.memberIds) {
      const v = state.villagers.find((o) => o.id === id && o.alive)
      if (!v) continue
      const eth = ETHNOS.get(v.id)
      if (!eth || eth.ethnieId !== E.id) continue
      living.push(v)
    }
    E.memberIds = living.map((v) => v.id)
    if (living.length === 0) {
      E.cohesion *= 0.9
      if (E.cohesion < 0.08) {
        E.faded = true
        logEvent(state, `Le peuple ${E.name} s'efface des mémoires`)
      }
      continue
    }
    let coh = 0
    for (const v of living) {
      const eth = ethnosOf(v)
      coh += eth.identity.people * 0.5 + eth.identity.village * 0.25 + (v.villageId === E.villageId ? 0.25 : 0.05)
    }
    E.cohesion = clamp01(coh / living.length)
    if (E.cohesion > 0.55 && rng() < 0.04) {
      const neu = generateAbstractName(rng, 2)
      if (neu !== E.name) {
        E.renamedFrom = E.name
        E.name = neu
        logEvent(state, `Le peuple ${E.renamedFrom} se dit désormais ${E.name}`)
      }
    }
  }
}

function tickSubjectiveIdentity(v: Villager, cultureTag: string | null): void {
  const eth = ethnosOf(v)
  const pol = politicsOf(v)
  eth.identity.village = clamp01(
    eth.identity.village * 0.98 + (v.villageId !== null ? 0.03 : -0.02) + (v.hasHome ? 0.01 : 0),
  )
  eth.identity.family = clamp01(
    eth.identity.family * 0.995 + (v.parentIds.length > 0 ? 0.008 : 0) + (v.spouseId !== null ? 0.01 : 0),
  )
  eth.identity.creed = clamp01(eth.identity.creed * 0.99 + (pol.creed ? pol.creedWeight * 0.04 : -0.01))
  if (eth.ethnieId !== null) eth.identity.people = clamp01(eth.identity.people * 0.997 + 0.012)
  else if (eth.hybridOf.length > 0) eth.identity.people = clamp01(eth.identity.people * 0.998 + 0.004)
  else eth.identity.people = clamp01(eth.identity.people * 0.99)
  if (cultureTag) pushUnique(eth.selfTags, cultureTag, MAX_SELF_TAGS)
}

export function ethnosSocialBias(state: SimState, self: Villager, other: Villager, rivalId: number | null): number {
  const ea = ETHNOS.get(self.id)
  const eb = ETHNOS.get(other.id)
  if (!ea || !eb) return 1
  if (ea.ethnieId === null || eb.ethnieId === null || ea.ethnieId === eb.ethnieId) return 1
  const rel = self.relations.get(other.id)
  const grudge = self.grudgeTarget === other.id || other.grudgeTarget === self.id
  const rival = rivalId === other.id
  const hostile = (rel && (rel.affinity < -0.15 || rel.grudge > 0.35)) || grudge || rival
  const resourceClash =
    villagerFeelsFamine(state, self) &&
    self.villageId !== null &&
    other.villageId !== null &&
    self.villageId !== other.villageId
  if (!hostile && !resourceClash) return 1
  const peopleGap = Math.abs(ea.identity.people - eb.identity.people) * 0.15
  return clamp(0.72 - peopleGap - (resourceClash ? 0.08 : 0), 0.55, 1)
}

export function packEthnosSummary(state: SimState, v: Villager): {
  language: string | null
  dialect: number
  ethnie: string | null
  hybrid: boolean
  identity: IdentityWeights
  birthRegion: string
  diaspora: boolean
  selfTags: string[]
} {
  const eth = ETHNOS.get(v.id)
  if (!eth) {
    return {
      language: null,
      dialect: 0,
      ethnie: null,
      hybrid: false,
      identity: emptyIdentity(),
      birthRegion: regionKey(v.x, v.y),
      diaspora: false,
      selfTags: [],
    }
  }
  const L = findLanguage(state, eth.languageId)
  const E = findEthnie(state, eth.ethnieId)
  return {
    language: L && !L.faded ? L.name : null,
    dialect: Math.round(eth.dialect * 100) / 100,
    ethnie: E && !E.faded ? E.name : null,
    hybrid: eth.hybridOf.length > 0 && eth.ethnieId === null,
    identity: { ...eth.identity },
    birthRegion: eth.birthRegion,
    diaspora: eth.diasporaAge > 8,
    selfTags: [...eth.selfTags],
  }
}

export function ethnosStatusFr(state: SimState, v: Villager): string {
  const s = packEthnosSummary(state, v)
  const bits: string[] = []
  if (s.language) bits.push(`langue ${s.language}`)
  if (s.ethnie) bits.push(`peuple ${s.ethnie}`)
  else if (s.hybrid) bits.push('identité métissée')
  if (s.diaspora) bits.push('diaspora')
  const top = (
    [
      ['village', s.identity.village],
      ['famille', s.identity.family],
      ['creed', s.identity.creed],
      ['peuple', s.identity.people],
    ] as const
  )
    .filter(([, w]) => w > 0.2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([k, w]) => `${k} ${Math.round(w * 100)}%`)
  if (top.length) bits.push(top.join(', '))
  return bits.length ? bits.join(' · ') : 'identité en formation'
}

/** World tick — langues, diaspora, ethnogenèse (rare). */
export function tickEthnosWorld(state: SimState, rng: () => number, cultureOf: CultureLookup): void {
  if (state.tick % ETHNOS_WORLD_TICK !== 0) return

  for (const v of state.villagers) {
    if (!v.alive) continue
    if ((state.tick + v.id * 11) % ETHNOS_WORLD_TICK !== 0) continue
    ethnosOf(v)
    tickSubjectiveIdentity(v, cultureOf(v).cultureTag)
  }

  tickDialectDrift(state, rng)
  if (state.tick % (ETHNOS_WORLD_TICK * 2) === 0) {
    tryEthnogenesis(state, rng, cultureOf)
    refreshEthnies(state, rng)
  }
  refreshLanguageSpeakers(state)

  if (state.tick % (ETHNOS_WORLD_TICK * 4) === 0) {
    state.languages = state.languages.filter((L) => !L.faded || L.speakers > 0)
    state.ethnies = state.ethnies.filter((E) => !E.faded || E.memberIds.length > 0)
  }
}
