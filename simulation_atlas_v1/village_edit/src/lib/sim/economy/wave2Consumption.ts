/**
 * Phase 7 WAVE 2 - thin re-exports for consumption helpers.
 *
 * INTEGRATION NOTE (orchestrator): merge into economy/index.ts once:
 *   export type { BasketLine, NeedBasketPreview, ConsumeFoodResult } from './wave2Consumption'
 *   export { consumeNeedBasket, applyConsumeFood } from './wave2Consumption'
 */
export type { BasketLine, NeedBasketPreview, ConsumeFoodResult, ConsumeGoodsResult } from './consumption'
export { consumeNeedBasket, applyConsumeFood, applyConsumeGoods } from './consumption'
