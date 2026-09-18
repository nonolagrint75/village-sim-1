# PHASE 7 — EMERGENT ECONOMY (TypeScript / Macaly ONLY)

**Status:** AUDIT → contracts → WAVE 1  
**Project root:** `C:\Users\kamel\village-sim-1\_wt_rhythm\village_edit`  
**Stack:** TypeScript + Vite + React (+ Electron worker). **Not Bevy.**

## Absolute separation

- IGNORE: Rust, Cargo.toml, `sim-core`, Bevy crates, `sim_ai`, `sim_ecs`, `village_game`, `village_stress`.
- Do NOT analyze, modify, migrate, or link to Bevy for Phase 7.
- Phase 6 CLOSED · GLOBAL NON DECLARE · do not retune P6 floors/metrics.

## Live sim home

```text
village_edit/
  src/lib/sim/          ← simulation core
  scripts/              ← probes / soak
  src/… React UI
```

## Phase 6 locks (accepted)

- leaves ≈14, migration PARTIAL, camps=hasHome, social300 BLOCKED
- profession MF = 1.0 PASS — do not break
- food harvest→grind→bake — do not rewrite
- famCF / relCF / mem/emo/pers CF — keep

## Existing LIVE (reuse)

| Area | Files |
|------|--------|
| Inventory | `src/lib/sim/inventory.ts` |
| Resources | `src/lib/sim/resources.ts` |
| Commerce/prices/trade | `src/lib/sim/commerce.ts` |
| Professions | `src/lib/sim/careers.ts` |
| Food chain | fields / mill / bake in behaviors + related |
| Skills/teach | cognition + causality teachTrue |
| Family/relations | family.ts, decide CF channels |

## Dependency graph (TS)

```text
Resources catalog + deposits
  → Inventory bridge (wrap Slot[])
    → Skills practice (reuse mind.skills / teach)
      → Needs → demand tags
        → Production / recipes
          → Occupations (extend careers, no rewrite)
            → Markets / pricing (generalize commerce; no pop unlock scripts)
              → Wealth / business / wages
                → Trade / transport
                  → Property / inheritance
```

## Frozen WAVE 1 contracts (new modules under `src/lib/sim/economy/`)

```text
ResourceId / GoodId
Deposit { resource, qty, quality, x, y, regen?, underground? }
InventoryView — wraps existing Slot[] APIs
Skill practice hooks — no EconomicSkill duplicate
NeedId / demand tags — map from mind.needs where possible
```

## LOCKED (integrator only)

- `src/lib/sim/cognition/decide.ts`
- `src/lib/sim/politics.ts`
- `src/lib/sim/behaviors.ts`
- `src/lib/sim/careers.ts` (MF path)
- `src/lib/sim/commerce.ts` until WAVE 3 + integrator

## WAVE 1 (parallel, additive TS only)

| Agent | Owns |
|-------|------|
| A | `economy/resourcesCatalog.ts` + deposits |
| B | `economy/inventoryBridge.ts` |
| C | `economy/skillsPractice.ts` |
| D | `economy/needsDemand.ts` |

Then INTEGRATE → typecheck → short probe → WAVE 2.

## Forbidden

- Any Bevy/Rust work
- Scripted unlock market/currency by pop/year/tech
- CREATE_* for PASS
- Parallel EconomicFamily / EconomicProfession
- Phase 8 / politics / war
- Artificial Phase 6 metric fixes

## Audit TS ([Audit TS economy](6465945e-6e3d-40e7-951b-992156c7c921)) — DONE

LIVE to reuse: food chain, careers MF=1.0, commerce prices/trade, inventory, teachTrue, needs, workplaces (mill/fields/workbench), wealth/coins, migration economic push/pull.

MISSING (later waves): firm/wages, market agents, general barter, forge site, inventory ledger.

Wave1 = additive `src/lib/sim/economy/` facades only. No dual-edit locked cores.