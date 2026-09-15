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
  cognitiveTaskModifier,
  dropMind,
  mindOf,
  mindPoolStats,
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

export {
  pickTaskByPolicy,
  scoreWithFactors,
  decisionTemperature,
  FACTOR_IDS,
  type SoftmaxPick,
} from './decide'

export { noteSimTps, getCognitionBudget, cognitionBudgetHintFr } from './budget'
export { getSimPerfBudget } from '../perfBudget'

export { skillBonus, skillSpeedBonus, skillYieldBonus, knownSpots } from './memory'
export {
  professionSkillPrefScore,
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
