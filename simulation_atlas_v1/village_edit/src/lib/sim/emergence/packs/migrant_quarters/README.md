# migrant_quarters (Elian) — staging only

Isolated life-type module: orphan/leave → city labor → trade apprentice → marry local → cultural drift kids → workshop → co-region cluster → quarter habits/food/architecture → host welcome vs suspicion → migrant association → institution → multi-decade city pop share.

**Not wired** into `World`, canvas, or app `index`. No biography day scripts.

## Public exports

| Export | Role |
|--------|------|
| `createMigrantQuartersState` / `tickMigrantQuarters` | Own bag + yearly/tick driver |
| `exportSettlementMigrantView` | Settlement/quarter identity + pop share |
| `culturalTraitsSnapshot` / `mixChildCulture` / `driftTowardPeers` | Cultural traits mixing |
| `ensureAssociation` / `tickAssociations` | Association → institution formation |
| `ELIAN_LIFE_TYPE` | Life-type tag (`'elian'`) |

## Hook points (when integrating later)

1. **Mobility / desertion** — call `spawnOrphanLeaver` when an orphan or outcast leaves a village (`detachOutcast`, famine exit). Pass `originRegionId` from village/region id.
2. **Careers / labor demand** — feed `TickSignals.laborDemandBySettlement` from job scarcity (`getJobOpportunities`, mill/market worker gaps).
3. **Marriage** — on local marriage, set `spouseLocalId` and invoke `mixChildCulture` instead of cloning parent culture only (`ethnos` / family birth path).
4. **Settlement stage** — read `SettlementMigrantView.migrantShare` + quarter `habits.architectureMotifs` into build/culture planner (`build/culture`, settlement attractiveness).
5. **Politics / circles** — when `association.stage === 'recognized_institution'`, mirror into a Circle (`kind: 'kin'|'craft'`, `isInstitution`).
6. **Host stance** — map `welcome` / `suspicion` onto relation bias / grief (`homophilyBias`, politics rivalry), not a scripted welcome event.
7. **Observability** — surface `events[]` + decade `pop_share_updated` in chronicle / panels.

## Naming alignment (`src/lib` peek only)

- `ensure*` / `tick*` / `clamp01` / feature vectors like `ethnos.ts`
- `SettlementMigrantView` parallels settlement view facades
- Association stages parallel Circle guild → institution emergence

## Smoke (headless, optional)

```ts
import { createMigrantQuartersState, tickMigrantQuarters } from './index'
const s = createMigrantQuartersState({ hostPopBySettlement: { 1: 50 } })
for (let i = 0; i < 2000; i++) tickMigrantQuarters(s, { arrivalPressure: 0.03, citySettlementIds: [1] })
```