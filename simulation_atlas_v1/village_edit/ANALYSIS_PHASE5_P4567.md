# ANALYSIS PHASE 5 — STEP1 AUDIT ONLY (Priorities 4–7)

**Workspace:** `C:\Users\kamel\village-sim-1\_wt_rhythm\village_edit`  
**Date:** 2026-09-17  
**Mode:** AUDIT ONLY — **no code changes** in this step  
**Evidence base:** Phase 4 CP5 soak (`_phase4_soak_summary.json`, `_phase4_soak_s{1,3,7}.json`), `PHASE4_CAUSALITY_VALIDATION.md`, `PHASE4_INCOHERENCE_LOG.md` (INC-02/04), plus live code paths cited below  

**Verdict preview:** P4–P7 are all **instrumentation / design-gap** issues, not soak crashes. Volume gates for §28/§33 already PASS; causal depth and explainability remain open.

---

## Soak reference (CP5 natural, seeds 1/3/7 × 60d)

| Metric | Seed 1 | Seed 3 | Seed 7 | Total |
|--------|--------|--------|--------|-------|
| teachCraftStarts | 14157 | 17301 | 8594 | **40052** |
| teachEvents / skillChanges / laterUses | 10976 / 1050 / **214** | 14549 / 770 / **235** | 6723 / 645 / **224** | ~32k / ~2.5k / **673** |
| teach chain label | PARTIAL | PARTIAL | PARTIAL | — |
| professionChanges | 404 | 144 | 178 | **726** |
| professionsEnd.miller | **0** | **0** | **0** | — |
| millerPeakAlive | **0** | **0** | **0** | max **0** |
| grindStarts | 215 | 250 | 370 | **835** |
| leaves / foundCamps | 4 / **0** | 8 / **2** | 10 / **0** | **22 / 2** |
| migrate chain | CONNECTION_NOT_PROVEN | PARTIAL | CONNECTION_NOT_PROVEN | — |

---

## Priority 4 — Learning: teach → skill → future use

### Observe

- Harness §27 stays **PARTIAL** / notes *"future use NOT TESTED"* even though causality counters now show `teachLaterUses > 0` (`scripts/harness/adapters.ts` still labels future use unmeasured).
- Causality teach chain is **PARTIAL ×3** (never PASS from instrumentation alone — `stageChainLabel` caps at PARTIAL).
- Conversion funnel (sum 3 seeds):  
  **teachEvents ≈ 32248 → skillChanges ≈ 2465 (~7.6%) → laterUses ≈ 673 (~2.1% of events, ~27% of skillChanges)**.
- Mission bar (§27 / Agent8): teach≥30, receivers, **progress %**, **future uses ≥10**. Volume OK; progress % absent; "future use" counter exists but is a **proxy**, not a true chain.

### ROOT CAUSE

1. **Proxy ≠ true chain.** `noteTeachLaterUse` fires on *any* successful task whose `skillForTask(kind)` matches the pending taught skill within TTL (~5 days). It does **not** prove "this pupil applied knowledge from *that* teach event to a craft/build outcome."
2. **Teach transfers master's strongest skill**, not a craft curriculum (`doTeachCraft` scans `mm.skills` for max). Masters who teach also get `social += 0.006`, so pending skill is often **`social`**. Later use then only matches socialise / giveFood / entertain / counsel / ritual / teachCraft — not grind/build/craft.
3. **Single-slot overwrite.** `TEACH_PENDING` is `Map<pupilId → one {skill, untilTick}>`. Repeated teaches overwrite; first laterUse deletes the slot (one-shot). High teachCraft volume (40k starts) destroys provenance.
4. **No progress %.** Skill drip is tiny (`+0.02 + social*0.01`) and only when `master > pupil + 0.05`. There is no harness metric for "% receivers who progressed."
5. **Harness lag.** Adapters ignore `teachLaterUses` for §27 PASS gating → report still says future use unmeasured.

### FIX proposal (do not implement here)

| Step | Proposal |
|------|----------|
| A | Instrument **true chain**: teachEventId → pupilId → skillKey → skillΔ → laterTaskKind within window; require productive kinds (craft/build/farm/grind…), not only social. |
| B | Optionally teach a **declared craft skill** (or top N non-social skills) instead of raw max skill. |
| C | Multi-pending queue (or ring buffer) per pupil; stop overwrite; report conversion rates. |
| D | Add `teachProgressPct` / receivers-with-Δ to soak + harness; allow §27 PARTIAL→PASS only when progress% + true laterUses meet bar. |
| E | Update `adapters.ts` to consume causality teach counters (still no auto-PASS without thresholds). |

### FILES

- `src/lib/sim/causalityMetrics.ts` — `noteTeachCraftEvent`, `noteTeachLaterUse`, `TEACH_PENDING`, `TEACH_TTL_TICKS`, `stageChainLabel`
- `src/lib/sim/interactions.ts` — `doTeachCraft` (strongest-skill transfer)
- `src/lib/sim/behaviors.ts` — call site `noteTeachLaterUse(..., skillForTask(active.kind))`
- `src/lib/sim/cognition/memory.ts` — `skillForTask` mapping
- `scripts/harness/adapters.ts` — §27 still "future use NOT TESTED"
- `_phase4_soak_summary.json` / `s{1,3,7}.json` — counters

**Status:** DP4 **DONE CODE** / proxy laterUses retained as DEBUG / true chain instrumented (`teachTrueLaterUses`) / acceptance **PENDING** / progress% still ABSENT / short smoke teach=0

---

## Priority 5 — Profession multi-factor explainability (≥70%)

### Observe

- §28 volume **PASS** on harness: 726 changes, ≥10 NPCs/seed, ≥4 professions, 3 seeds.
- Explainability multi-factor **≥70%** remains **NOT_TESTED** (`PHASE4_CAUSALITY_VALIDATION.md`, Agent8 §28 table).
- `assignProfession` already blends many factors (resources, climate, personality, job counts, `computeCareerDemand`, skill/preference scores, livelihood mix) but **never records why** the winner won.
- `applyProfessionChange` logs French title only; no factor vector / top-k reasons.

### ROOT CAUSE

1. **Scoring without attribution.** Winner = `argmax(scores)` with no snapshot of contributing factor groups (demand vs local resources vs mix vs personality vs lock).
2. **No soak metric** for "share of changes with ≥2 identifiable factor tags" → cannot evaluate 70% bar.
3. Volume PASS was correctly awarded for churn; mission **adaptation / explainability** layer was never instrumented (INC-02 opacity is a symptom of the same gap).

### FIX proposal (do not implement here)

| Step | Proposal |
|------|----------|
| A | On each accepted `applyProfessionChange`, record structured reason: `{prev, next, topFactors[{name,delta}], demandSnapshot, lockBlocked?}`. |
| B | Probe: `explainableShare = changesWith≥2Factors / changes`; gate §28 explainability separately from volume PASS. |
| C | Keep farmer lock / handoff / softProfession damp intact — explainability is telemetry, not score rewrite. |

### FILES

- `src/lib/sim/behaviors.ts` — `assignProfession`, profession review / lock threshold
- `src/lib/sim/careers.ts` — `computeCareerDemand`, `applyCareerDemandToScores`, `applyProfessionChange`
- `src/lib/sim/livelihood.ts` — softProfession secondary path (no miller recipe)
- `scripts/_probe_phase4_causality_soak.ts` / `scripts/harness/adapters.ts` — volume only today
- `ANALYSIS_AGENT8_TESTS.md` — §28 multi-factor ≥70% requirement

**Status:** DP5 **DONE CODE** / explainability instrumented (`professionChanges` / `professionChangesMultiFactor`) / acceptance **PENDING** / no PASS claim

---

## Priority 6 — millerPeak=0 vs grind high (task vs profession)

### Observe

- grindStarts **835** total; millerPeakAlive **0**; professionsEnd.miller **0** on all 3 seeds.
- grindByProfession (examples): farmer / none / forager / lumberjack dominate — **never miller**.
  - s1: none80 farmer72 forager40 lumberjack23  
  - s3: none105 farmer70 forager43 lumberjack23 miner9  
  - s7: none119 farmer112 forager101 lumberjack36 builder2  
- Mills exist (2+2+4); harvest/grind/bake chain is LIVE (edibleSum 2123).
- INC-02 status: **FIXED (reporting)** — documents grind-as-open-task; **did not** spawn millers.

### ROOT CAUSE (exact)

This is **not** a broken mill loop. It is **task ≠ métier**:

1. **`grindFlour` is an open task.** Anyone with wheat/grain + village mill can `add('grindFlour', …)` — no `profession === 'miller'` gate (`behaviors.ts` ~3413–3430).
2. **Farmers are rewarded to grind.** `jobBonus`: farmer gets **2.15×** on grindFlour/bake/buildMill; miller gets **2.55×**. Farmers (and none/forager) therefore execute most grinds.
3. **Miller rarely wins `assignProfession`.** Score needs mill/wheat; heavy `-countJob('miller')*30`; farmer gets field lock (+90 if `fieldX`) + farmClimate + livelihood `mix.farm*42`. Miller only gets `mix.farm*14 + mix.craft*10`.
4. **No softProfession → miller.** Livelihood recipes crystallize blacksmith/weaver/fisher/farmer/miner/trader/builder/guard/lumberjack — **no miller soft recipe**. `grindFlour` buckets to **`farm`**, reinforcing farmer, not miller.
5. Probe correctly counts millerPeakAlive = count of `profession === 'miller'` over time → stays 0 while grindStarts climb.

### FIX proposal (do not implement here)

| Option | Proposal | Risk |
|--------|----------|------|
| **Preferred (doc+metric)** | Keep open grind; treat miller as optional specialist. PASS §28/§32 on grindByProfession + food chain, not millerPeak. | None to farm/mill |
| **Light gameplay** | SoftProfession / practice bias: sustained grindFlour → miller when `hasMill` and foodNeed allows; preserve farmer lock. | Career churn |
| **Avoid** | Force-spawn miller or gate grind to miller only. | Breaks farm→mill chain; forbidden by INC-02 / preserve-farmer policy |

### FILES

- `src/lib/sim/behaviors.ts` — grind candidates; `jobBonus` farmer vs miller; `assignProfession` miller score
- `src/lib/sim/livelihood.ts` — `bucketsForTask('grindFlour')→farm`; softProfession table (no miller)
- `src/lib/sim/careers.ts` — demand boosts miller via foodNeed only
- `scripts/_probe_phase4_causality_soak.ts` — `grindByProfession`, `millerPeakAlive`
- `PHASE4_INCOHERENCE_LOG.md` — INC-02

**Status:** DP6 **DONE** / acceptance **DESIGN_DOCUMENTED** (`GRIND_OPEN_TASK` / WONTFIX_DESIGN). millerPeak=0 is **expected** under open-task design, not a grind bug. Metrics: `grindByProfession`, `millerAlivePeak`, `grindLabel=GRIND_OPEN_TASK`.

---

## Priority 7 — Migration leave → camp only 2/22

### Observe

| Seed | urgeCrosses | leaveAttempts | leaves | foundCamps | rejoins | migrate chain |
|------|-------------|---------------|--------|------------|---------|---------------|
| 1 | 15 | 6 | 4 | **0** | 5 | CONNECTION_NOT_PROVEN |
| 3 | 32 | 23 | 8 | **2** | 5 | PARTIAL |
| 7 | 36 | 29 | 10 | **0** | 10 | CONNECTION_NOT_PROVEN |
| **Σ** | — | — | **22** | **2** | **20** | — |

- §33 volume **PASS** (leaves≥20). leave→foundCamp still rare (**2/22 ≈ 9%**).
- Blocks (not the camp gap): elder 2/12/13; low_curiosity 0/3/6. leavesByCause mostly **`mixed`**.

### ROOT CAUSE (exact)

INC-04 wiring works **only for housed leavers**:

```text
noteMigrateLeave(...)
if (v.hasHome && (v.homeX >= 0 || v.homeY >= 0)) {
  foundMigrateCamp(...)  // secede hearth → new village
  noteMigrateFound(...)
} else {
  // villageId=null → wander → typically rejoin
}
```

1. **Camp path = housed leave only.** Homeless leavers never call `foundMigrateCamp`.
2. **Soak implies ~20/22 leavers were homeless** (0+2+0 camps vs 4+8+10 leaves; rejoins ≈ 20). Seed 3 alone produced the 2 camps.
3. Therefore leave→camp is **gated by housing**, not by a broken `noteMigrateFound`. Volume leave can PASS while A→B migrate stays CONNECTION_NOT_PROVEN on 2/3 seeds.
4. Secondary: leave causes tagged **`mixed`** → weak identifiable-cause story for §33 depth (separate from camp count).

### FIX proposal (do not implement here)

| Step | Proposal |
|------|----------|
| A | Telemetry first: on each leave, record `hasHome`, `foundedCamp`, block cause already present — prove homeless vs housed split in soak. |
| B | If design wants leave→camp volume: allow **homeless pioneer camp** (site search near leaver) with strict caps (no CREATE_MIGRATE mass exodus). |
| C | Or accept design: camp = secession of hearth; measure "housedLeave→camp rate" separately; do not expect camps≈leaves. |
| D | Improve `inferMigrateLeaveCause` so fewer **`mixed`** (famine/SoL/unemployment tags). |

### FILES

- `src/lib/sim/politics.ts` — leave enactment; `hasHome` gate; urge/blocks
- `src/lib/sim/construction.ts` — `foundMigrateCamp`, `emptyFoundingVillage`
- `src/lib/sim/migrationMetrics.ts` — `noteMigrateLeave` / `noteMigrateFound`
- `src/lib/sim/causalityMetrics.ts` — migrate chain label (needs urge+attempt+leave+**found>0** for PARTIAL)
- `_phase4_soak_s{1,3,7}.json` — leaves/camps/blocks
- `PHASE4_INCOHERENCE_LOG.md` — INC-04

**Status:** DP7 **DONE CODE** / stages instrumented (`migrateHomelessLeave` / `migrateHousedLeave` / `migrateTravelStarts` / `migrateDestEvals` / `migrateSettlementAttempts` / `migrateFoundCamps` / `migrateRejoins` / `migrateFails` + reason tags) / design documented: homeless leave→rejoin intended (camp = hasHome secession; no auto createCamp) / acceptance **PENDING** / short smoke urge=1 leaves=0 / no PASS claim

---

## Cross-priority matrix

| Pri | Mission link | Soak signal | Root class | Implement now? |
|-----|--------------|-------------|------------|----------------|
| 4 | §27 / §22 teach | laterUses 673 but funnel opaque | Proxy metrics + social-skill teach | **No** — audit only |
| 5 | §28 explainability ≥70% | Volume PASS; explain 0% measured | Missing attribution | **No** |
| 6 | §28 / INC-02 | grind 835, millerPeak 0 | Task open ≠ profession | **DONE** — WONTFIX_DESIGN + metrics |
| 7 | §33 / §22 migrate | camps 2/22 | Camp only if hasHome | **No** — measure housed split first |

---

## Recommended Phase 5 order (proposals only)

1. **P4 measure upgrade** — true teach chain + harness consume laterUses/progress% (before buffing teach).  
2. **P5 attribution** — profession factor tags on change (cheap, unlocks 70% bar).  
3. **P7 telemetry** — housed vs homeless leave; then decide camp design.  
4. **P6** — **DONE** WONTFIX_DESIGN / GRIND_OPEN_TASK; do not gate grind; do not force miller.

---

## Explicit non-claims

- No GLOBAL / EMERGENCE aggregate PASS from this audit.  
- No code, score, or clamp changes in STEP1.  
- millerPeak=0 is **explained**, not a crash.  
- laterUses>0 ≠ §27 PASS.

---

*End ANALYSIS_PHASE5_P4567.md — STEP1 audit only.*
