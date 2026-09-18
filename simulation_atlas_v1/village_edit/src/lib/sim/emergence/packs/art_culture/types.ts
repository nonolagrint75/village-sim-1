/**
 * Art / culture staging — local types only (no core imports).
 * Life focus: **Lysa** (distinctive style → patronage → circle → architecture → multi-gen).
 *
 * Causal chain:
 * distinctive style → slow patronage → imitators → art circle →
 * cross-discipline intellectuals → elite funding → public architecture style →
 * multi-gen culture component.
 */

export type ActorId = number
export type VillageId = number
export type CircleId = number
export type StyleId = string
export type CircleArtId = string

export type ArtLifeTag = 'Lysa' | 'imitator' | 'patron' | 'intellectual' | 'generic'

export type ArtPhase =
  | 'seed_style'
  | 'seeking_patronage'
  | 'patronized'
  | 'imitators'
  | 'art_circle'
  | 'salon'
  | 'elite_funding'
  | 'public_architecture'
  | 'multi_gen'
  | 'faded'

export type ArtEventKind =
  | 'style_born'
  | 'patronage_gained'
  | 'patronage_stalled'
  | 'imitator_joined'
  | 'circle_formed'
  | 'salon_opened'
  | 'elite_funded'
  | 'architecture_marked'
  | 'culture_inherited'
  | 'style_faded'

export interface ArtEvent {
  kind: ArtEventKind
  tick: number
  styleId: StyleId
  actorId?: ActorId
  amount?: number
  note?: string
}

/** Soft style vector — integrator may map onto house shapes / ethnos features / roof hue. */
export interface StyleSignature {
  id: StyleId
  /** Discrete motif slots (like culture features). */
  motifs: number[]
  /** Hue / ornament bias 0–1. */
  ornament: number
  /** Verticality / massing bias 0–1. */
  massing: number
  label: string
}

export interface ArtistProfile {
  actorId: ActorId
  villageId: VillageId | null
  lifeTag: ArtLifeTag
  /** Craft skill / recognition proxy 0–1. */
  craftSkill: number
  /** Distinctiveness vs local vernacular 0–1. */
  originality: number
  /** Livelihood patronage 0–1. */
  patronage: number
  recognition: number
  wealth: number
  /** Curiosity / sociability for salon. */
  intellectPull: number
}

export interface PatronProfile {
  actorId: ActorId
  wealth: number
  /** Willingness to fund art 0–1. */
  generosity: number
  prestigeNeed: number
}

export interface ArtScene {
  id: CircleArtId
  villageId: VillageId
  phase: ArtPhase
  formedTick: number
  founderId: ActorId
  style: StyleSignature
  /** Soft politics circle once wired. */
  circleId: CircleId | null
  artistIds: ActorId[]
  imitatorIds: ActorId[]
  intellectualIds: ActorId[]
  patronIds: ActorId[]
  patronageSlow: number
  eliteFunding: number
  /** 0–1 how much public builds use this style. */
  architectureShare: number
  /** Generation counter for multi-gen component. */
  generationDepth: number
  /** Inherited culture component id / tag for ethnos blend. */
  cultureComponentId: string | null
  events: ArtEvent[]
}

export interface InheritanceHint {
  parentId: ActorId
  childId: ActorId
  tick: number
  /** How strongly child absorbs parent style 0–1. */
  absorb: number
}

export interface BuildStyleHint {
  villageId: VillageId
  tick: number
  /** New public / elite building placed. */
  isPublic: boolean
  builderId: ActorId | null
}

export interface ArtTickContext {
  tick: number
  roll: number
  villageProsperity?: number
}