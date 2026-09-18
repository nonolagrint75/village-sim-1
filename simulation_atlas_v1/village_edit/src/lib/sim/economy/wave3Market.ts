/**
 * Phase 7 WAVE 3 - thin re-exports for market view + pricing signals.
 *
 * INTEGRATION NOTE (orchestrator): merge into economy/index.ts once:
 *   export type { MarketPriceRow } from './wave3Market'
 *   export { localPrice, scarcitySignal, marketSnapshot } from './wave3Market'
 *   export { expectedMargin, demandPressure, demandPressureForTag } from './wave3Market'
 */
export type { MarketPriceRow } from './marketView'
export { localPrice, scarcitySignal, marketSnapshot } from './marketView'
export { expectedMargin, demandPressure, demandPressureForTag } from './pricingSignals'
