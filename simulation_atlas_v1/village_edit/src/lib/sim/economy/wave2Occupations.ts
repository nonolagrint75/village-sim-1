/**
 * Phase 7 WAVE 2 - thin re-exports for occupation bridge.
 *
 * INTEGRATION NOTE (orchestrator): merge into economy/index.ts once:
 *   export type { OccupationId, EconomicMotiveTag, EconomicMotives, OccupationShiftSuggestion } from './wave2Occupations'
 *   export { occupationOf, economicMotiveTags, suggestOccupationShift } from './wave2Occupations'
 */
export type {
  OccupationId,
  EconomicMotiveTag,
  EconomicMotives,
  OccupationShiftSuggestion,
} from './occupationBridge'
export { occupationOf, economicMotiveTags, suggestOccupationShift, topOccupationShift } from './occupationBridge'
