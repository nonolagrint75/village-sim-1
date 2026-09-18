# Staging: `succession_civil`

**Life type:** **Alena** (contested heir -> rival factions -> merchant alliance -> civil war -> political reward -> multigen claim memory). Soft tag — not a day-timer biography.
**Status:** isolated pack READY — integrator wires; no core imports.
**Cross-links:** `military_defection`, `kin_multigen`, `dynasty_mismanage`, `merchant_network`

## Causal chain

ruler death / weak heir -> contested succession -> rival claimants -> factions -> merchant alliance pick side -> civil war (`succession_spill`) -> winner rewards -> multigen claim memory

## Exports

| Symbol | Role |
|--------|------|
| `seedSuccessionCrisis` | Open contested heir pad |
| `registerClaimant` | Add rival with support weight |
| `formClaimantFactions` | Crystallize claimants into factions |
| `tryMerchantAlliance` | Merchants fund a claimant |
| `tryIgniteCivilWar` | Open war when support split |
| `resolveCivilWar` | Winner / loser + political rewards |
| `tickSuccessionCivil` | Pressure / faction / alliance drift |
| `successionStats` | Probe snapshot |

## Integrator hook points

1. **Death / succession** — `handlePoliticalDeath` / polity succession: `seedSuccessionCrisis`.
2. **Claimants** — ambitious kin / officers: `registerClaimant` (Alena tag on contested heir).
3. **Factions** — `formClaimantFactions` when 2+ claimants.
4. **Merchants** — trade circles / firm owners: `tryMerchantAlliance`.
5. **War** — `tryIgniteCivilWar` -> create `PolityWar` cause `succession_spill`; link `military_defection.enterCivilWarCommand`.
6. **Reward** — on war end: `resolveCivilWar` -> land / office / amnesty; chronicle via `logCause`.
7. **Multigen** — stamp claim memory onto lineage bag for `kin_multigen` crisis split.

## Files

- `types.ts`, `util.ts`, `crisis.ts`, `alliances.ts`, `war.ts`, `tick.ts`, `index.ts`

## Out of scope

No `src/` edits, no day scripts, no UI, no commit.