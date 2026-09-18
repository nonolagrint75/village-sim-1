/**
 * Cognition LOD budget — re-exports sim-wide adaptive perf budget.
 * Deep-think gates stay here for cognition imports; path/climate use perfBudget.
 */

export {
  noteSimTps,
  getCognitionBudget,
  getSimPerfBudget,
  effectiveDeepPeriod,
  allowDeepThink,
  getAliveAgentCount,
  setAliveAgentCount,
  setCrisisDeepPressure,
  getCrisisDeepPressure,
  cognitionBudgetHintFr,
  takeUiLightGate,
  type SimPerfBudget as CognitionBudget,
} from '../perfBudget'
