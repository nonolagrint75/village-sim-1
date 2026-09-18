/**
 * Staging pack: art_culture (Lysa)
 * Isolated — integrator wires into livelihood patronage, circles, build/culture, ethnos.
 */

export type {
  ActorId,
  VillageId,
  CircleId,
  StyleId,
  CircleArtId,
  ArtLifeTag,
  ArtPhase,
  ArtEventKind,
  ArtEvent,
  StyleSignature,
  ArtistProfile,
  PatronProfile,
  ArtScene,
  InheritanceHint,
  BuildStyleHint,
  ArtTickContext,
} from './types'

export {
  birthStyle,
  styleDistance,
  imitateStyle,
  isDistinctive,
  noteStyleBorn,
} from './style'

export {
  trySeedArtScene,
  applyPatronagePulse,
  tryAddImitator,
  tryFormArtCircle,
  tryOpenSalon,
  applyEliteFunding,
  onPublicBuild,
  applyInheritance,
  architectureStyleWeights,
  tickArtScene,
  sceneStyleDrift,
} from './scene'