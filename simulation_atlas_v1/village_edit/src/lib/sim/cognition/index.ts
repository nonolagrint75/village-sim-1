export type {
  CognitionDepth,
  CognitiveGoal,
  CognitiveGoalId,
  CognitiveState,
  ConsciousMode,
  ConsciousState,
  EmotionState,
  EpisodicMemory,
  NeedPressures,
  PlanStub,
  PredictedOutcome,
  PredictionError,
  ProcessMode,
  ProceduralSkills,
  SelfModel,
  SemanticFact,
  SocialImpression,
  ValueWeights,
  WorkingConcern,
} from './types'

export {
  pickTaskByPolicy,
  scoreWithFactors,
  scoreOptionProduct,
  decisionTemperature,
  cognitiveTaskModifier,
  cognitiveFactorProduct,
  relationDecisionBias,
  FACTOR_IDS,
  type SoftmaxPick,
  type AblationChannel,
} from './decide'

export {
  setDecisionTraceEnabled,
  isDecisionTraceEnabled,
  noteDecisionTrace,
  drainDecisionTrace,
  peekDecisionTrace,
  clearDecisionTrace,
  summarizeDecisionTrace,
  type DecisionTraceSample,
} from './decisionTrace'

export {
  dropMind,
  mindOf,
  mindPoolStats,
  peekMind,
  noteChosenAction,
  noteMasterworkCraft,
  onCognitiveEvent,
  onRemember,
  packCognitionDebug,
  recordTaskOutcome,
  resetCognitionCaches,
  shouldDeepThink,
  tickCognition,
  consolidateOnRest,
  type CognitionDebug,
} from './tick'

export {
  attentionKindWeight,
  consciousAccessBias,
  emptyConsciousness,
  packConscienceDebug,
  updateConsciousness,
  type ConscienceDebug,
} from './consciousness'

export { noteSimTps, getCognitionBudget, cognitionBudgetHintFr } from './budget'
export { getSimPerfBudget } from '../perfBudget'

export {
  skillBonus,
  skillSpeedBonus,
  skillYieldBonus,
  knownSpots,
  mirrorMindSpotsToLegacy,
  forEachLifeEvent,
  hasLifeEventKind,
  countLifeEventKinds,
  GOSSIP_TELLABLE_KINDS,
  pickBestTellableLifeEvent,
  hasMatchingLifeEvent,
  type EpisodicMemoryPeek,
} from './memory'
export {
  professionSkillPrefScore,
  primarySkillsForProfession,
  rollCraftQuality,
  QUALITY_LABELS_FR,
  seedLaborPreferences,
  inheritLaborPreferences,
  preferenceTaskBias,
} from './labor'
export { goalLabelFr, replanAfterFailure, type ReplanReason } from './goals'
export {
  BURROW_RADIUS,
  CHILD_AGE,
  CRITICAL_TASKS,
  burrowTaskMultiplier,
  cautionFactor,
  clearSavedTask,
  dangerSpotsForPath,
  isChild,
  isGuardRole,
  nearestTacticalThreat,
  noteWolfDanger,
  noteBanditDanger,
  pickSafetyTarget,
  restoreInterruptedTask,
  shouldEngageThreat,
  stashInterruptedTask,
} from './tactics'
export { NEED_LABELS_FR } from './needs'
export { senseResource, spotMemoryBias, bestRememberedRichSpot, LOCAL_PERCEIVE_R, SHORT_SEARCH_R } from './sensing'
export { seedCultureFromParents } from './stubs'
export {
  proposeStructureFromReasons,
  maybeProposeConstruction,
  constructionReasonFr,
  intentFromReasons,
  enqueueBuildProject,
  describeIntent,
  type StructureIntent,
  type StructurePurpose,
} from './buildHooks'
