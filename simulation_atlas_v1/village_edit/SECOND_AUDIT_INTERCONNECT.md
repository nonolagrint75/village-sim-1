# SECOND AUDIT — INTERCONNECT

## Verdict
**PARTIAL PASS** — farm/food chain **PASS** on seed 7 after harvest orphan fix; live-code r뿯½audit **DONE** with **2 causal fixes** (`buildHouse`뿯↽`applyProfessionChange`; mind life-event helpers). Trade/title nuance still PARTIAL. Full 25-criteria "one sim" still limited by missing fresh multi-seed emergence soak (T-B).

## Method
- Probes: `_food_chain_s7_harvest_fix.txt` (freshest, 2026-09-16 ~23:43)
- Live r뿯½audit agent: 30bda76c (engine 뿯↽ tickVillager 뿯↽ cognition 뿯↽ chooseTask 뿯↽ execute 뿯↽ commerce/politics/careers/ecology/fields/religion)
- Docs: `INTERCONNECT_VERIFY.md`, `FOOD_CHAIN_FIX.md`, `INTERCONNECT_MASTER.md`, `_verify_careers_s7_d40.txt`, `_verify_econ_s7_d40.txt` (pre-harvest — `harvestWheat` starts=0 there must **not** override harvest_fix)
- Terminals: probe runs only; **no live Vite/Electron** at merge time

## System map delta
Reconnect tracks (map, memory, famine feel, profession identity, society-econ) claimed DONE in `INTERCONNECT_MASTER.md`. Harvest blocker closed: career churn orphaned wheat; `tickFields` grows all WHEAT; farmer lock + orphan reclaim.

R뿯½audit additions:
1. `buildHouse` now calls `applyProfessionChange` (was raw `v.profession = …`).
2. politics / religion / bandits / interactions read mind episodic via `forEachLifeEvent` / `hasLifeEventKind` / `countLifeEventKinds` (+ legacy fallback).

## Dual state recheck (P0/P1/P2)
| Dual | Prior verdict | Second verdict | Evidence |
|------|---------------|----------------|----------|
| Famine feel vs `state.famine` | claimed fixed | PASS (feel helpers) | r뿯½audit grep: writer-only `tickFamine` |
| Profession / livelihood | claimed fixed | **PASS** (incl. maison) | careers verify + buildHouse fix |
| Field ownership / wheat growth | FAIL (orphan) | **PASS** | harvest_fix cum.harvest |
| Memory mind vs legacy reads | PARTIAL | **PASS** hot paths / PARTIAL gossip | helpers + residual `gossip()` |

## Pipe recheck
| From 뿯↽ To | Prior | Second | Evidence |
|-----------|-------|--------|----------|
| sow 뿯↽ grow 뿯↽ ripe 뿯↽ harvest | BROKEN | **LIVE** | d5 harvest=306; d15 ripe=12; d30 harvest=4665 |
| harvest 뿯↽ mill 뿯↽ flour 뿯↽ bread | LIVE | LIVE | flour/bread mid-run; grind/bake USED |
| famine 뿯↽ career demand 뿯↽ m뿯½tier | LIVE | LIVE | `_verify_careers_s7_d40.txt` PASS |
| food 뿯↽ price 뿯↽ job 뿯↽ behavior | PARTIAL | PARTIAL | trade/title nuance (verify gate) |
| house 뿯↽ profession 뿯↽ livelihood | FAIL | **LIVE** | `applyProfessionChange` in buildHouse |
| life events 뿯↽ politics/religion/bandits | legacy-only | **LIVE** mind-first | `forEachLifeEvent` helpers |

## TOP 8 / R11 harvest status
| # | Repair | Result | Evidence |
|---|--------|--------|----------|
| Harvest orphan / farmer lock | **PASS** | `_food_chain_s7_harvest_fix.txt` seed7 30d |
| grindFlour / bakeBread | **PASS** | same + INTERCONNECT_VERIFY |
| Careers dynamic | **PASS** | `_verify_careers_s7_d40.txt` |
| Profession sync on house | **PASS** | behaviors.ts buildHouse |
| Mind life-event readers | **PASS** | politics/religion/bandits/interactions |
| food뿯↽price뿯↽job fully closed | **PARTIAL** | verify note |

## Remaining breaks (ordered)
1. Trade/title nuance (food뿯↽price뿯↽job not fully closed) — PARTIAL
2. Fresh multi-seed emergence not re-run under SECOND_AUDIT (T-B pending)
3. Econ probe `_verify_econ_s7_d40.txt` predates harvest fix — stale for harvest claim
4. `gossip()` still legacy-only (import-cycle constraint) — PARTIAL soft

## Suggested fixes (causal only, no features)
None required for harvest / profession / mind hot paths. Optional: re-run `_probe_econ_chain.ts` post-fix; run T-B emergence seeds; mind-safe gossip without cycle.

## Track verdict
**DONE** (interconnect farm half + prior reconnects + r뿯½audit fixes) with overall campaign **PARTIAL** until T-B / trade nuance.
