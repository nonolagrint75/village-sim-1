# Staging: `agri_invention`

**Life type:** Lio (farm tool invent -> agri boost -> regional enrich -> firm hire)
**Status:** isolated pack — integrator wires; no core imports.

## Causal chain

field practice + curiosity -> tool invention -> local yield boost -> neighbors copy -> regional enrich -> workshop firm hire

## Exports

| Symbol | Role |
|--------|------|
| `tryInventFarmTool` | Soft invention from practice hints |
| `applyLocalAgriBoost` | Yield mul on inventor village |
| `tryDiffuseInvention` | Neighbor adoption |
| `tryRegionalEnrich` | Multi-village wealth pulse |
| `tryInventionFirmHire` | Workshop hire after diffusion |
| `tickAgriInvention` | Maintenance |
| `agriInventionStats` | Probe snapshot |

## Integrator hook points

1. **Fields** — after harvest / tool use in fields/livelihood: `tryInventFarmTool` (Lio tag).
2. **Yield** — farming tick: `applyLocalAgriBoost` into growth/harvest multipliers.
3. **Diffusion** — neighboring villages: `tryDiffuseInvention`.
4. **Wealth** — regional surplus: `tryRegionalEnrich`.
5. **Firms** — `tryInventionFirmHire` -> business hire counter.
6. Tick beside fields / livelihood.

## Name map (peek-only)

- fields / harvest growth
- `economy/business.ts` hire
- tech / invent chronicle lines if any

## Out of scope

No `src/` edits, no day scripts, no UI.