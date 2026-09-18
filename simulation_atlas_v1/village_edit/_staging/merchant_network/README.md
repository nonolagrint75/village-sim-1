# Staging: `merchant_network`

**Life type:** **Eren** (farmer -> trader -> horse/grain arbitrage -> firm hire -> merchant marriage -> firm succession -> trade guild -> multi-town network). Soft ~39y probe tag — not a day-timer biography.
**Status:** isolated pack READY — integrator wires; no core imports.
**Cross-links:** `guild_formation`, `kin_multigen`, `explore_routes`, `credit_bank`

## Causal chain

farm surplus -> trade switch -> horse ownership -> grain arbitrage -> hire workers -> merchant marriage merge -> firm succession -> trade guild node -> regular multi-town network -> child career diverge

## Exports

| Symbol | Role |
|--------|------|
| `tryFarmerToTrader` | Livelihood pivot when surplus + curiosity |
| `noteHorseOwned` | Mobility unlock for arbitrage |
| `tryGrainArbitrage` / `reinforceEdge` | Price gap -> profit + recurring network edge |
| `tryFirmHire` | Expand merchant firm |
| `tryMerchantMarriage` | Merge firms / kin link |
| `tryFirmSuccession` | Heir takes firm |
| `tryJoinOrFormTradeGuild` | Link to guild_formation |
| `noteChildCareerDiverge` | Child track diverge event |
| `tickMerchantNetwork` | Phase / edge maintenance |
| `merchantNetworkStats` | Probe snapshot |

## Integrator hook points

1. **Career** — `computeProfessionChoice` / livelihood: `tryFarmerToTrader`.
2. **Assets** — livestock / inventory horse: `noteHorseOwned`.
3. **Prices** — commerce / surplus gaps between villages: `tryGrainArbitrage` then `reinforceEdge` on repeat.
4. **Firms** — `tickFirms` / `findBusinessesByOwner`: `tryFirmHire`, succession on death.
5. **Marriage** — `formBond` when both trade-tagged: `tryMerchantMarriage` (+ `kin_multigen.firmMarriage`).
6. **Guild** — craft/trade circle harden: `tryJoinOrFormTradeGuild` -> `guild_formation`.
7. Store `MerchantNetworkState` on integrator bag; tick after firms.

## Files

- `types.ts`, `util.ts`, `career.ts`, `trade.ts`, `firm.ts`, `guild.ts`, `tick.ts`, `index.ts`

## Out of scope

No `src/` edits, no day scripts, no UI, no commit.