/**
 * Phase 7 WAVE 3 - wages public re-exports.
 *
 * INTEGRATION NOTE (orchestrator): merge into economy/index.ts once:
 *   export { reservationWage, employerOffer, wageWouldClear } from './wave3Wages'
 */
export {
  reservationWage,
  employerOffer,
  employerOfferFromDecisionWealth,
  wageWouldClear,
} from './wages'