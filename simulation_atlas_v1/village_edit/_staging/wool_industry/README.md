# wool_industry (Yara) — staging only

Isolated life-type module: sheep inherit → wool sell → demand → herd expand → hire → copycats → spinners/weavers/dyers/merchants → trade road → village→town → overproduction crash → quality specialization.

**Not wired** into `World`, canvas, or app `index`. No biography day scripts.

## Public exports

| Export | Role |
|--------|------|
| `createWoolIndustryState` / `tickWoolIndustry` | Own bag + tick driver |
| `exportCommodityChainSnapshot` / chain helpers | Commodity chain sheep→…→dyed cloth |
| `tickBoomBust` / `exportBoomBustSnapshot` | Boom / glut / crash / specialize |
| `exportSettlementWoolView` | Per-settlement stocks, firms, stage hint |
| `YARA_LIFE_TYPE` | Life-type tag (`'yara'`) |

## Hook points (when integrating later)

1. **Livestock / inheritance** — on herd inheritance or pen founding, call `inheritSheep` / `seedYaraInheritance` (livestock pens, family inheritance).
2. **Market prices** — merge `state.prices.wool|cloth` into `priceOf` / `getMarketState` scarcity; feed `WoolTickSignals.regionalDemand` from SoL / clothing need (`commerce` SolBand, careers textile pull).
3. **Careers** — map `TextileRole` onto professions `herder` / `weaver` / `trader`; hiring via `tryHire` ↔ business workplace workers (`economy/business`).
4. **Roads / trade** — when `TradeRoadLink.strength` rises, stamp worn road / trade run (`roads`, `commerce` caravan thresholds).
5. **Settlement stage** — feed `stageHint` town/city pressure into `desiredSettlementStage` (markets + cloth surplus + roads).
6. **Boom/bust** — on `market_crash`, depress textile prices and fail low-capital firms (`BusinessRecord.failed`); on `quality_specialization`, bias craft quality / luxury demand.
7. **Observability** — chronicle `events[]` (copycat_entered, settlement_upstaged, market_crash).

## Naming alignment (`src/lib` peek only)

- Resource ids align with `wool` / `cloth` in `resources` / careers textile need
- `tickSettlementStages` mirrors settlements soft thresholds
- Firm hire/fail echoes `economy/business.ts`

## Smoke (headless, optional)

```ts
import { createWoolIndustryState, tickWoolIndustry, woolIndustrySnapshot } from './index'
const s = createWoolIndustryState({ settlementIds: [1, 2] })
for (let i = 0; i < 400; i++) tickWoolIndustry(s, { regionalDemand: 0.55 + (i % 80) / 200 })
console.log(woolIndustrySnapshot(s))
```