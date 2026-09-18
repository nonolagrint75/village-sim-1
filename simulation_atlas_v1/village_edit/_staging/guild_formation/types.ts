/**
 * Guild formation staging - local types only (no core imports).
 * Life focus: **Eren** (commercial / trade guild), **Mira** (weavers / textile guild),
 * bits of **Lysa** (art circle -> guild path). Soft tags, not day-timer bios.
 *
 * Causal chain:
 * shared craft/trade practice -> circle -> apprentices -> quality norms ->
 * interest threat -> institution -> guild -> exclude shirkers -> master prestige.
 */

export type ActorId = number
export type VillageId = number
export type CircleId = number
export type GuildPadId = string

export type GuildLifeTag = 'Eren' | 'Lysa' | 'Mira' | 'generic'

export type GuildKind = 'craft' | 'trade' | 'art' | 'textile'

export type GuildPhase =
  | 'latent'
  | 'circle'
  | 'threatened'
  | 'institution'
  | 'guild'
  | 'mature'

export type GuildEventKind =
  | 'circle_formed'
  | 'apprentice_added'
  | 'interest_threat'
  | 'interest_defense'
  | 'norm_adopted'
  | 'institution'
  | 'guild_formed'
  | 'quality_raised'
  | 'shirkers_excluded'
  | 'master_prestige'

export interface GuildEvent {
  kind: GuildEventKind
  tick: number
  padId: GuildPadId
  actorId?: ActorId
  amount?: number
  note?: string
}

export interface PractitionerHint {
  actorId: ActorId
  lifeTag: GuildLifeTag
  craftSkill: number
  isApprentice: boolean
  shirking: number
  stake?: number
}

export interface InterestThreatHint {
  undercutPressure: number
  levyPressure: number
  inputSqueeze: number
  rivalCount: number
}

export interface GuildReadinessHint {
  kind: GuildKind
  memberCount: number
  practitionerCount: number
  ageTicks: number
  problemCount: number
  cohesion: number
  qualityBar: number
  interestThreat?: number
}

export interface GuildPad {
  id: GuildPadId
  villageId: VillageId
  kind: GuildKind
  phase: GuildPhase
  formedTick: number
  leaderId: ActorId | null
  memberIds: ActorId[]
  apprenticeIds: ActorId[]
  circleId: CircleId | null
  norms: string[]
  qualityBar: number
  enforcement: number
  interestDefense: number
  masterPrestige: number
  events: GuildEvent[]
}

export interface GuildTickContext {
  tick: number
  roll: number
  masterSkillHint?: number
  threat?: InterestThreatHint
}