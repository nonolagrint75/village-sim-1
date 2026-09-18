/**
 * Phase 7 WAVE 3 - wealth ledger public re-exports.
 *
 * INTEGRATION NOTE (orchestrator): merge into economy/index.ts once:
 *   export type { WealthBreakdown } from './wave3Wealth'
 *   export { HOME_PROPERTY_PROXY, estimateWealth, estimateWealthBreakdown } from './wave3Wealth'
 */
export type { WealthBreakdown } from './wealthLedger'
export {
  HOME_PROPERTY_PROXY,
  estimateDecisionWealth,
  estimateWealth,
  estimateWealthBreakdown,
} from './wealthLedger'