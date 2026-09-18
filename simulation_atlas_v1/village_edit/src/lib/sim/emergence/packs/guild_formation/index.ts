/**
 * Public API - guild_formation staging pack (Eren commercial, Mira weavers, Lysa art).
 */

export type {
  ActorId,
  VillageId,
  CircleId,
  GuildPadId,
  GuildLifeTag,
  GuildKind,
  GuildPhase,
  GuildEventKind,
  GuildEvent,
  PractitionerHint,
  InterestThreatHint,
  GuildReadinessHint,
  GuildPad,
  GuildTickContext,
} from './types'

export { clamp01, pushEvent, suggestedGuildName } from './util'

export {
  scoreInterestThreat,
  scoreGuildReadiness,
  preferredKindFromTags,
} from './readiness'

export {
  createGuildPadId,
  tryFormCraftCircle,
  noteInterestThreat,
  tryDefendInterests,
  tryPromoteInstitution,
  tryPromoteGuild,
} from './form'

export { tickGuildPad, guildStats } from './tick'