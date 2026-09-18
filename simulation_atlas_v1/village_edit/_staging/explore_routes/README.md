# Staging: `explore_routes`

**Life types:** Ema (storm divert -> trade -> crafts -> migrants -> integration), Boran (war-blocked -> alternate path -> followers -> trade town)
**Status:** isolated pack — integrator wires; no core imports.
**Note:** `types.ts` kept for shared shapes; `index.ts` implements pure helpers.

## Causal chain

discovery (storm/scout/war detour) -> merchant interest -> route open -> price shock / foreign goods -> craft inspiration -> migrants follow -> region integrate OR war block -> reroute -> town nucleation

## Exports

Re-exports types from `./types` plus:

| Symbol | Role |
|--------|------|
| `createExploreState` | Empty bag |
| `tryDiscoverRoute` | Ema/Boran discovery |
| `applyMerchantInterest` | Surplus + merchants open interest |
| `tryOpenRoute` | Status -> open |
| `applyPriceShock` | New goods price mul |
| `applyCraftInspiration` | Foreign good -> craft tag |
| `applyMigrantsFollow` | Followers along route |
| `tryWarBlock` / `tryReroute` | Boran path |
| `tryNucleateTradeTown` | Traffic -> town seed |
| `tickExploreRoutes` | Maintenance |
| `exploreStats` | Probe snapshot |

## Integrator hook points

1. **Storm / voyage** — weather / fisher voyage: `tryDiscoverRoute` with `storm_divert` (Ema).
2. **War block** — polity war on road: `tryWarBlock` then `tryReroute` (Boran).
3. **Commerce** — surplus / traders: `applyMerchantInterest`, `tryOpenRoute`, `applyPriceShock`.
4. **Culture** — foreign goods: `applyCraftInspiration` -> culture copy bias.
5. **Migration** — `applyMigrantsFollow` into destination village.
6. **Settlement** — high traffic: `tryNucleateTradeTown` -> planner seed.
7. Tick bag beside trade / war pulses.

## Name map (peek-only)

- trade / commerce price helpers
- `war.ts` road / territory pressure
- migration / village join
- settlement planner nucleation

## Out of scope

No `src/` edits, no day scripts, no UI.