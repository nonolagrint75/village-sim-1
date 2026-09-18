/**
 * Phase 7 WAVE 3 - business registry public re-exports.
 *
 * INTEGRATION NOTE (orchestrator): merge into economy/index.ts once:
 *   export type { BusinessKind, BusinessWorkplace, BusinessRecord, EconomyBusinessesBag } from './wave3Business'
 *   export { ensureBusinessBag, registerBusiness, findBusinessesByOwner, findBusiness } from './wave3Business'
 */
export type {
  BusinessKind,
  BusinessWorkplace,
  BusinessRecord,
  EconomyBusinessesBag,
} from './business'
export {
  ensureBusinessBag,
  registerBusiness,
  findBusinessesByOwner,
  findBusiness,
} from './business'