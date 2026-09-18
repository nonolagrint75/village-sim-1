# Food chain fix

Causal integration for **sow → harvest → mill → flour → bread**. No free-food cheats / yield buffs.

## Status (closed)

| Link | State |
|------|--------|
| Mill bootstrap | **FIXED** — pre-mill build no longer multiplies by flour/bread `priceUrge` (chicken-egg). Wake-from-rest uses wheat/fields, not flour price ≥ 1.15. |
| grindFlour / bakeBread | **LIVE** — A6 evidence: mills built (`hasMill` / mill terrain), flour stock, bread baked. Grind market mul floored; bake allowed at workbench or home. |
| Realistic fields | **DONE** — see `REALISTIC_FIELDS.md`. Farmer-gated claims, village field cap, crafts drop personal plots. |
| Flee-bag starve | **FIXED (A3)** — combat flee no longer blocks eat when holding food / empty-bag crisis. |
| Mid-run harvest | **Works when fields exist**; seed-fragile if farmers scarce or plot sites hard to find. |

## Root causes addressed

1. **Mill bootstrap `priceUrge` chicken-egg** — Without a mill, flour/bread prices never signal scarcity usefully; multiplying `buildMill` / wake gates by `priceUrge('flour')` blocked the first mill forever.
2. **Grind damp** — Post-mill `priceUrge(flour) * priceUrge(bread)` bottoms ~0.30 and starved grind vs rest/craft; floored / averaged so wheat≥2 + mill still wins.
3. **Bake stranded** — Flour piled while bake required workbench-only and lost to grind; bake scores raised, hearth/home bake allowed, wake prefers bake when flour≥2.
4. **Field swarm / wrong owners** — Every homeowner claimed a mini-plot (including blacksmiths). Now profession-gated + capped (`fields.ts` + claim crystallization to farmer).
5. **Plot site search** — `FIELD_RADIUS=4` footprints often found **zero** `findBuildSite` hits in the forest ring. Claim search uses `spotR=min(3,FIELD_RADIUS)` with wider radius/veg tolerance; stamp still uses full `FIELD_RADIUS`.

## Probe notes (seed 7 / A6)

Typical healthy mid-run signals (exact ticks vary by seed):

- `mills` ≥ 1–2, `millTerrain` matches built mills (visible `MILL` tile art)
- `flour` > 0, intermittent `bread` > 0
- `fieldOwners` small (≤ cap), `nonFarmFields` ≈ 0, `profField` farmer-only
- `harvest` / `sow` tick counts > 0 when plots land
- Deaths d42–60 far below the old hunger-cliff wipe (pop 6–10)

Seeds **1 / 3** historically showed mill/flour/bread from starting wheat even when field claims lagged; with the `spotR` search nudge, farmer plots should land when climate allows.

## Remaining risks

- **Harvest seed-fragile** if farmers stay scarce or claim sites stay blocked (dense claims / walls). `farmerProfessionPressure` + forager bootstrap when `farmers===0` mitigate; not a guarantee on every seed.
- **Bake can lag grind** if flour sits on villagers who never rethink near a hearth/bench — wake path covers the common rest case.
- **Do not** “fix” hunger by buffing berry/wheat yields — keep fixing task selection and gates.

## Key files

- `src/lib/sim/behaviors.ts` — mill urge, grind/bake scores, wake mill/grind/bake, field claim search, farmer lock while holding a plot
- `src/lib/sim/fields.ts` — `canClaimNewField`, `canSowPersonalField`, `shouldReleaseField`, `farmerProfessionPressure`, caps
- `REALISTIC_FIELDS.md` — ownership rules
- `scripts/_probe_food_chain.ts` — day probes for sow/harvest/mill/flour/bread/fields

## Related agents

- **A6** — mill visible + flour/bread live
- **A3** — flee-bag / empty-bag survival interrupts
- **Realistic fields** — profession gate + village-scale plots

## Harvest orphan fix (seed 7, 2026-09-16)

**Root cause:** career métier churn released personal fields (eleaseFieldClaim → ieldX=-1) while sown WHEAT stayed on the map. 	ickFields only grew wheat inside owned FIELD_RADIUS, so orphaned crops froze (~amount 42) and never hit WHEAT_RIPE. Farmers then claimed *new empty* plots → probe wheatTiles≈0, harvestWheat=0. Not clearLand, not UTF-16 logic bugs (though ields.ts briefly went UTF-16 on disk).

**Fix (causal):**
1. armerLockedToField / pplyProfessionChange — refuse leaving farmer while holding a farmable plot unless 	ryHandoffField succeeds.
2. eleaseFieldClaim — hand off to a fieldless co-villager; otherwise keep CLAIM_FIELD (do not pave-orphan).
3. indOrphanWheatPlot — claim search prefers existing wheat clusters before indBuildSite.
4. 	ickFields — grow **all** WHEAT tiles (Uint16-safe +1 floor) so orphans still ripen.
5. Politics stick maxed while farmer holds a farmable plot.

**After (seed 7, 30d probe):** harvest ticks live by d5; ripe tiles > 0 mid-run (e.g. d15 ripe=12); wheatTiles stay on owned plots. No free-food cheat.