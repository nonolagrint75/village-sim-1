# PHASE 5 STEP 1 — Audit Priorities 8–12 (analyse only)

**Workspace:** `village_edit`  
**Date:** 2026-09-17  
**Scope:** Priorities **P8–P12** only — **ROOT CAUSE | FIX proposal | FILES**  
**Constraint:** **no code changes** this pass; UTF-8 document only  
**Evidence base:** `PHASE4_CAUSALITY_VALIDATION.md`, `_phase4_soak_{s1,s3,s7,summary}.json`, CP5 natural soak 100x60x3  

**Also noted (out of fix scope):** **P13 clamp** — Social START@300 → `INITIAL_VILLAGERS_MAX=120` is **BLOCKED capacite**. **Document only; do not propose raising the clamp.**

**Legend:** soak numbers = Phase 4 CP5 unless marked otherwise. PARTIAL / CONNECTION_NOT_PROVEN != PASS. Induced paths = TEST SETUP / MECHANISM, never EMERGENCE PASS.

---

## Scorecard (P8–P12)

| Pri | Symptom (CP5) | Class | Audit verdict |
|-----|---------------|-------|---------------|
| **P8** | `helpEventsByKind.defend=0`, `.labor=0` (all 3 seeds) | wiring + enactment | **CONFIRMED** — labor dead branch; defend never starts |
| **P9** | shock→price→job chains **NOT_TESTED**; price A→B only PARTIAL | measure + channel honesty | **CONFIRMED** — natural price delta != controlled shock |
| **P10** | teachCraft/socialise/rest dominate starts/occupancy; anti-loop weak | catalogue + damp design | **CONFIRMED** — damp <=18%, `rest` exempt |
| **P11** | creed delta live; **0 preuve 2 gen** | missing instrumentation | **CONFIRMED** — genealogy depth unused for creed |
| **P12** | sec22Status=PARTIAL x3; creed/migrate often **CONNECTION_NOT_PROVEN** | label math + incomplete links | **CONFIRMED** — no mission PASS path in labels |
| **P13** | Social 300→120 | capacity policy | **DOCUMENT ONLY** — no raise proposal |

---

## P8 — help defend=0 / labor=0

### Observe (CP5)

| Seed | food | teach | defend | build | haul | labor |
|------|------|-------|--------|-------|------|-------|
| 1 | 6 | 10976 | **0** | 44 | 57 | **0** |
| 3 / 7 | (same pattern) | ... | **0** | >0 | >0 | **0** |

- Help cats max = **4** via teach/build/haul/food — sec30 volume OK structurally; **defend/labor still dead**.
- Seed1 `taskStartHistogram`: **no `defend` key at all**; `fight=308`, `flee=1753` — combat exists as fight/flee, not defend-help.

### ROOT CAUSE

**A. `labor` — dead code (measurement + missing path)**  
In `behaviors.ts` `case 'buildProject':`:

```ts
recordHelp(state, task.kind === 'buildProject' ? 'build' : 'labor')
```

Inside this case, `task.kind` is **always** `'buildProject'` → always records **`build`**, never **`labor`**.  
Repo-wide: **only** this site calls `recordHelp(..., 'labor')`. There is **no live labor help enactment path**.

**B. `defend` — path wired, rarely/never enacted**  
1. Catalogue adds `defend` only when: wolf in `DANGER_RADIUS` **and** rescuer `toolTier !== 'none'` **and** nearby unarmed villager within ~4 of wolf (`behaviors.ts` ~2977–3001).  
2. `recordHelp('defend')` on defend tick only if `task.ageTicks === 0 && targetId != null` (~5475–5480).  
3. Alternate wire: `creditRescue` → `recordHelp('defend')` (`interactions.ts`) when a fighter saves wolf prey (`behaviors.ts` ~6938) — rare.  
4. Softmax competitors (`flee` / `fight` / craft spear) win; soak histograms show **0 defend starts**.

So defend=0 is **not** "forgot INC-03 hook" alone — **enactment gate + competition** starve the counter. Labor=0 is a **hard wiring bug**.

### FIX proposal (do not implement this pass)

1. **Labor:** replace ternary with an explicit discriminator, e.g.  
   - `build` = contribute to another's `buildProject` (current),  
   - `labor` = contribute to another's **field/house/clear** (new `recordHelp('labor')` on `clearLand` / `buildHouse` / sow assist when owner != self), **or** count second helper on same project as labor once build already credited.  
2. **Defend:** (a) allow defend score when kin threatened even if tool=none→craftSpear first chain; (b) also `recordHelp('defend')` when `fight`/`creditRescue` protects kin (shared outcome); (c) optional probe assert `defend|labor > 0` on crisis soak — **MECHANISM** label if wolf density forced.  
3. Keep cats>=3 via existing teach/build/haul/food; do **not** fake defend by renaming teach.

### FILES

| File | Role |
|------|------|
| `src/lib/sim/behaviors.ts` | defend catalogue; buildProject labor ternary; creditRescue call site |
| `src/lib/sim/interactions.ts` | `creditRescue` → `recordHelp('defend')` |
| `src/lib/sim/family.ts` | `recordHelp` / `HelpKind` |
| `src/lib/sim/causalityMetrics.ts` | `helpEventsByKind` |
| `scripts/_probe_phase4_causality_soak.ts` | soak dump of help cats |

---

## P9 — Economy shock → price → job (natural vs controlled)

### Observe (CP5)

- Food chain LIVE (harvest/grind/bake); edibleSum **2123**.  
- Per seed ~**900** `priceDeltaEvents`, ~**40** `priceTaskShifts`, ~**300** `priceProfessionShifts` → chain label **price=PARTIAL**.  
- Harness sec32: harvest/grind/bake proxy **PARTIAL**; note **Full shock->price chains NOT TESTED** (`adapters.ts`).  
- No dedicated multi-seed **induced scarcity → price delta → profession/task** causal bar on natural soak.

### ROOT CAUSE

**1. Natural path already emits price noise, not "shock".**  
`tickMarketPrices` (`commerce.ts`) smooth-clears basket every tick window; `notePriceDelta` if `|delta|/base >= 5%`. Continuous clearing → hundreds of deltas without a named shock event.

**2. Job/task attribution is correlational, not shock-gated.**  
- `notePriceTaskShift` only on grind/bake completion when `priceUrge(flour|bread) > 1.15` (`behaviors.ts`).  
- `notePriceProfessionShift` on **any** `applyProfessionChange` while food basket scarce (`careers.ts`) — co-occurrence with scarcity, **not** "this price delta caused this switch".  
- No counter: `shockId → priceDelta → npcId → newProfession/task`.

**3. Controlled vs natural not separated in sec32 acceptance.**  
Induced famine / CREATE_* = TEST SETUP (WP1 honesty). Natural soak never injects a controlled shock, so **shock chain stays NOT_TESTED** while organic price PARTIAL looks "alive". Mixing them would fake EMERGENCE PASS.

### FIX proposal (do not implement this pass)

| Channel | Purpose | Label |
|---------|---------|-------|
| **NATURAL** | Keep CP5-style soak: organic `priceDelta` + task/prof shifts → stay **PARTIAL** until linked NPC/time windows prove order | EMERGENCE candidate only if A→B→C timed |
| **CONTROLLED** | Separate MECHANISM probe: inject **local** stock drain / price spike on one village; measure price delta then task/prof within N days on >=3 NPC x >=3 seeds | **TEST SETUP** — never scores EMERGENCE PASS |

Concrete measure upgrades (audit only):  
1. Tag each `notePriceDelta` with resource + village + tick; require task/prof shift **after** delta within window for same NPC.  
2. Harness: `sec32_natural_price` vs `sec32_controlled_shock` rows — refuse aggregating controlled into EMERGENCE.  
3. Do **not** retune mill bootstrap `priceUrge` or farmer locks for "more shifts".

### FILES

| File | Role |
|------|------|
| `src/lib/sim/commerce.ts` | `tickMarketPrices`, `notePriceDelta` |
| `src/lib/sim/behaviors.ts` | `priceUrge`, grind/bake `notePriceTaskShift` |
| `src/lib/sim/careers.ts` | `applyProfessionChange` → `notePriceProfessionShift` |
| `src/lib/sim/causalityMetrics.ts` | `priceChainLabel` (PARTIAL only) |
| `scripts/harness/adapters.ts` | sec32 NOT_TESTED shock note |
| `ANALYSIS_AGENT3_ECONOMY.md` | prior food→price→job PARTIAL |

---

## P10 — Anti-loop teachCraft / socialise / rest

### Observe (CP5)

Seed1 starts: **teachCraft 14157**, **socialise 13664**, **rest 8059**; occupancy: **rest ~140k**, **flee ~140k**, teachCraft occupancy **47150**.  
Totals: teachCraftStarts **40052** / 3 seeds. Entropy starts ~2.85 — kinds diverse, **time share** still leisure/rest-heavy.  
INC-05 Phase 4: dominance teach/social — **WONTFIX_DOC** (measure != nerf yield). Phase 5 needs a **causal anti-loop** plan beyond doc.

### ROOT CAUSE

**1. Catalogue bias.**  
`teachCraft` score ≈ `(urge.teach + 36 + craft*28 + social*12) * family * reach` once `urge.teach > 10` and pupil found (~2947–2972). Floor **+36** makes teach competitive vs most productive work. Socialise similarly dense (kin + plaza paths).

**2. WP8 `habitAntiLoopDamp` too light / wrong exempts.** (`cognition/decide.ts`)  
- Triggers only if last **5** acts >=50% same kind **and** habit >=0.32; max damp **~18%**.  
- **Exempt:** harvest/sow/clear/grind/bake/eat/... **and `rest`**, flee, fight, defend.  
- So **rest loops are never dampened**; teachCraft/socialise damp is a soft haircut vs +36 catalogue floor + knowledge prior (`prefsSkillFactor` up to +55% on teachCraft).

**3. Softmax not rewritten (by design)** — damp only scales `stress_habitude` factor; other factors still push teach/social.

**4. Rest occupancy != "AFK bug" alone** — night rest + stamina economy are legitimate; sec40 still fails if non-urgent day share stays monoculture (A9: rest+build share).

### FIX proposal (do not implement this pass)

1. **Measure first:** probe sequences >7d same kind; day-only occupancy share for teach/social/rest (exclude night rest).  
2. **Damp target:** include `teachCraft` / `socialise` in stronger habit damp (e.g. up to 35–45% after streak) **without** exempting them; keep farm/food/survival exempts.  
3. **Catalogue:** soft-cap teach floor when craft gap to pupil is tiny or same pupil taught recently (anti-repeat), not a global teach nerf for PASS.  
4. **Rest:** do **not** damp night HARD rest; optionally damp **day** outdoor rest when stamina high (align A9 dayEnvRest).  
5. Refuse claiming sec23/sec40 PASS from TaskKind count alone while teach/social start share dominates.

### FILES

| File | Role |
|------|------|
| `src/lib/sim/cognition/decide.ts` | `habitAntiLoopDamp`, `stressHabitFactor`, teach knowledge prior |
| `src/lib/sim/behaviors.ts` | teachCraft/socialise/rest catalogue scores |
| `src/lib/sim/politics.ts` | famine gate on teach/social (partial) |
| `PHASE4_INCOHERENCE_LOG.md` | INC-05 |
| `ANALYSIS_AGENT9_BEHAVIOR.md` | sec23/sec40 rest loops |

---

## P11 — Creed: 2 generations absent

### Observe (CP5)

- `creedChanges` **907**; followups present (e.g. s1: 225 changes / 41 followups).  
- sec36 harness: belief delta>=10 → **PARTIAL**; note **generational chains unmeasured**.  
- Culture / 2 gen: **NOT_TESTED**. Births **83** total — pedigree exists, creed cross-gen **not proven**.

### ROOT CAUSE

**1. No creed x generation counter.**  
`family.ts` genealogy has `depth` / `parentIds`; `registerBirth` sets pedigree; `inheritOnDeath` transfers goods/legitimacy — **not creed id parent→child→grandchild**.

**2. Creed spread is peer-horizontal.**  
`trySpreadCreed` converts nearby adults (`politics.ts`); circle formation may inherit majority creed — still **same-generation / peer**, not timed 2-gen cultural continuity.

**3. Followup != culture continuity.**  
`politicalTaskBias` marks one scoring followup within 5 days of creed change (`creedFollowupDone`) — same NPC behavioral echo, **not** child adopting parent creed after birth maturation.

**4. Label pathology (feeds P12):**  
`snapshotCausalityMetrics` calls `stageChainLabel(creedChanges, creedFollowups, creedFollowups, 0)` → `npcs` hardcoded **0** → even with changes+followups, creed chain stays **CONNECTION_NOT_PROVEN** (needs `npcs >= 3` for PARTIAL).

### FIX proposal (DONE CODE — DP11; soak long later)

1. **Instrument:** on creed assign (`markCreedChange`), if child.creed matches living parent/ancestor creed → `creedParentChildTransmissions++` + gen depth; child followup → `creedChildBehaviorInfluenced`.  
2. **Probe sec36:** expose gen counters; until gen2>0 keep culture **NOT_TESTED**.  
3. Fix creed `stageChainLabel` NPC count via `creedNpcCount` — measure honesty, not fake PASS.  
4. Do **not** force creed on birth for score inflation.

### FILES

| File | Role |
|------|------|
| `src/lib/sim/family.ts` | genealogy depth, `registerBirth`, inheritance |
| `src/lib/sim/politics.ts` | `trySpreadCreed`, `markCreedChange`, followup window |
| `src/lib/sim/causalityMetrics.ts` | creed chain + `npcs=0` bug |
| `src/lib/sim/societyMetrics.ts` | `creedFollowupRate` |
| `scripts/harness/adapters.ts` | sec36 generational chains unmeasured |

---

## P12 — sec22 A→B still PARTIAL / CONNECTION_NOT_PROVEN

### Observe (CP5)

| Chain | s1 / s3 / s7 | Notes |
|-------|--------------|-------|
| food | PARTIAL x3 | harvest→grind/bake→eat live; stock consequence weak |
| teach | PARTIAL x3 | laterUses>200/seed |
| price | PARTIAL x3 | deltas+shifts; no shock bar |
| help | PARTIAL x3 | volume; cats=4 but defend/labor=0 |
| creed | **CNP x3** | followups>0 but label CNP |
| migrate | CNP / PARTIAL / CNP | foundCamps 0+2+0 |
| **sec22Status** | **PARTIAL x3** | harness acceptance **not** mission PASS |

Mission format (sec22): floors like >=20/>=15/>=5 events, >=3 NPC, >=3 seeds — **not** fully encoded; labels max out at PARTIAL / CNP. **No WIRED/PASS** in `CausalityChainLabel` union used for acceptance.

### ROOT CAUSE

**1. Label ceiling.**  
`stageChainLabel` returns at most **PARTIAL** when a,b,cons>0 and npcs>=3 — **never PASS**. Aggregator: any PARTIAL → `sec22Status=PARTIAL`. Instrumentation success != mission acceptance.

**2. Hardcoded creed NPC=0** → permanent creed **CONNECTION_NOT_PROVEN** despite live followups (see P11).

**3. Migrate requires foundCamp** for PARTIAL (`migrateChainLabel`); leaves alone → CNP. CP5 leaves=22 PASS sec33 volume, but sec22 migrate link still fragile (2 camps total).

**4. Price/help PARTIAL without causal completeness.**  
Price: co-occurrence scarcity. Help: events+outcomes without per-category completeness or helper/helped NPC floors.

**5. Mission thresholds not applied** in `snapshotCausalityMetrics` (no >=20/15/5 class floors) — so PARTIAL is "wires moved", not "bar met".

### FIX proposal (DONE CODE — DP12; soak STEP6 next)

1. **Honesty:** keep refusing sec22 / GLOBAL PASS while any required chain is CNP or below mission floors.  
2. **Fix creed NPC counting** (P11) so followups can reach PARTIAL honestly.  
3. **Per-chain mission gates** in `sec22Evidence.ts` / probe: food/teach/help/price/migrate/creed + mem/emo/pers/family each need class floors + >=3 NPC + >=3 seeds → only then candidate PASS (never auto).  
4. **Migrate:** leave→foundCamp|rejoin stages measured (INC-04 residual) without leave buff for score.  
5. **Help:** defend/labor + helpNpcCount samples (P8 + DP12).  
6. Document: `sec22Status=PARTIAL` means **instrumentation+volume**, not acceptance (preserve).

### FILES

| File | Role |
|------|------|
| `src/lib/sim/causalityMetrics.ts` | `stageChainLabel`, migrate/price/help labels, `sec22Status` |
| `scripts/_probe_phase4_causality_soak.ts` | soak aggregation |
| `scripts/harness/adapters.ts` | emergence rows; refuse fake PASS |
| `PHASE4_CAUSALITY_MASTER.md` / `VALIDATION.md` | sec22 format + verdict |

---

## P13 — Clamp (document only — do not raise)

| Item | Value |
|------|-------|
| `INITIAL_VILLAGERS_MAX` | **120** (`simConfig.ts`) |
| Individual START@100 | **READY** (within clamp) |
| Social START@300 | **BLOCKED capacite** (300→120) |
| Phase policy | BLOCKED != FAIL emergence; **ne pas relever le clamp** |

**No FIX proposal to raise 120.** Future social tier = grow-organic / separate capacity decision outside P8–P12 causality fixes.

### FILES (reference only)

- `src/lib/sim/simConfig.ts` — `INITIAL_VILLAGERS_MAX`  
- `scripts/harness/scalePolicy.ts` — `assessSocialStart300Blocked`  
- `PHASE4_CAUSALITY_VALIDATION.md` scalePolicy / INC-06  

---

## Dependency order (for later STEP 3 — not this pass)

```text
P8 labor dead-branch + defend enactment
  → P12 help chain completeness
P11 creed NPC count + gen2 counters
  → P12 creed CNP → PARTIAL (honest)
P9 natural vs controlled shock separation
  → sec32 / price chain acceptance clarity
P10 anti-loop measure + damp (no yield cheat)
  → sec23/sec40 quality (still not GLOBAL PASS)
P13 clamp: leave documented BLOCKED
```

---

## Explicit non-goals (STEP 1)

- No gameplay code edits.  
- No clamp raise.  
- No GLOBAL / EMERGENCE aggregate PASS claim.  
- No induced shock scored as natural emergence.  
- No teachCraft yield nerf solely to inflate diversity PASS.

---

*Fin `ANALYSIS_PHASE5_P8_TO_P12.md` — Phase 5 STEP 1 audit only.*
