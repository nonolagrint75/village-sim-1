# ANALYSIS - PHASE 5 STEP1 - Priorities P1-P3 (Attribution != Causality)

**Workspace:** `village_edit`  
**Date:** 2026-09-17  
**Scope:** Audit only - **no code changes**, no PASS claims.  
**Priorities:**

| ID | Mission axis | Soak section | CP5 status |
|----|--------------|--------------|------------|
| **P1** | Memory to decision causality | sec25 | PARTIAL (tags only) |
| **P2** | Emotion to decision causality | sec26 | PARTIAL (tags only) |
| **P3** | Personality to behavior (pairs) | sec24 | PARTIAL (samples only) |

**Golden rule (Phase 5):** volume of `*AttributedDecisions` proves that a factor **touched the chosen option's score** (or was rehearsed). It does **not** prove the factor **changed which action won**. Causality requires a **counterfactual**: scores / chosen action with the channel ablated vs intact.

---

## 0. Shared measurement stack (how CP3 works today)

### 0.1 Pipeline

```
chooseTask -> pickTaskByPolicy
  -> for each option: fillFactorProduct -> SCRATCH_ATTR.{memory,emotion,personality}
  -> softmax (+ imagination top-3)
  -> re-score CHOSEN via scoreWithFactors / fillFactorProduct
  -> whyFactors tags: mem:place | emo:bias | pers:social_tom
  -> noteChosenAction(..., whyFactors)
       -> attributionFlagsFromWhy -> noteAttributedDecisionBound
            -> attributionCounters.*AttributedDecisions++
            -> (personality) optional pair ring sample
```

### 0.2 Materiality bar

`ATTRIBUTION_MATERIAL_DELTA = 0.08` (`attributionMetrics.ts`).

| Channel | When SCRATCH_ATTR flips true |
|---------|------------------------------|
| Emotion | `|emotionsFactor - 1| >= 0.08` on **this** option |
| Personality | trait prior `|persDelta| >= 0.08` in `socialTomFactor`, **or** distant-place courage damp `|dm| >= 0.08` in `placeMemoryFactor` |
| Memory | spot loop called `reinforceRecall` **or** `|m - beforeMem| >= 0.08` after danger/good spot bias |

Tags are then unshifted onto `whyFactors` of the **chosen** option only (post-softmax re-score). Counters increment if any of those tags appear in `factorWhy` at `noteChosenAction`.

### 0.3 What this explicitly does **not** measure

- Ranking of the full candidate set with vs without the channel.
- Whether ablating the channel would change `argmax` / softmax sample.
- Whether a non-chosen option's memory/emotion/personality pressure was decisive for *not* picking it.
- HARD / orphan `setTask` paths (often no soft tags -> silent under attribution).
- Temperature effects of personality (`decisionTemperature(courage, curiosity)`) - **untagged**.

### 0.4 Shared missing evidence schema (Phase 5 DP1-DP3)

For a soft decision with options `O[0..n-1]`, channel `C in {memory, emotion, personality}`:

| Field | Meaning |
|-------|---------|
| `CandidateScoreBefore[i]` | Utility of option `i` with channel **C ablated** (factor forced to 1 / spots ignored / traits neutralized - define per P) |
| `CandidateScoreAfter[i]` | Utility of option `i` with channel **C live** (current game) |
| `ChosenActionBefore` | Deterministic argmax (or fixed-RNG softmax) under Before scores |
| `ChosenActionAfter` | Same policy under After scores (actual soft pick) |
| **Causal hit** | `ChosenActionBefore != ChosenActionAfter` **or** (weaker) ranking of top-2 swaps with delta-U above bar |

Until those four exist and a causal-hit counter is gated on them, sec24-sec26 remain **attribution / infrastructure**, not causality PASS.

---

## 1. Phase 4 CP5 soak numbers (evidence baseline)

Source: `_phase4_soak_summary.json`, `_phase4_soak_s{1,3,7}.json`, `PHASE4_CAUSALITY_VALIDATION.md`.  
Run: `npx tsx scripts/_probe_phase4_causality_soak.ts 60 1,3,7` - natural, START@100, 60 days.

### 1.1 Totals (3 seeds summed)

| Counter | Total | vs exact decisions (650960) |
|---------|------:|----------------------------:|
| `memoryAttributedDecisions` | **20942** | ~3.2% |
| `emotionAttributedDecisions` | **107680** | ~16.5% |
| `personalityAttributedDecisions` | **79005** | ~12.1% |
| `personalityPairSamples` | **192** | 64 / seed (ring cap) |
| `personalityPairReady` | **2366** | trait-similar same-kind pairs in ring |

Smoke (seed1, 5d): mem=296, emo=1005, pers=94 - `_phase4_attribution_smoke_s1.json`.

### 1.2 Per seed

| Seed | exact | memAttr (NPCs) | emoAttr (NPCs) | persAttr (NPCs) | pairSamples | pairReady |
|------|------:|---------------:|---------------:|----------------:|------------:|----------:|
| 1 | 226496 | 6969 (103) | 37720 (149) | 28697 (118) | 64 | 817 |
| 3 | 219371 | 5509 (64) | 44013 (108) | 36037 (96) | 64 | 875 |
| 7 | 205093 | 8464 (69) | 25947 (111) | 14271 (96) | 64 | 674 |

Harness (`scripts/harness/adapters.ts`): mem>=20 / emo>=15 / pairs>=30 -> **PARTIAL** with note *full causal proof PENDING*. Mission thresholds for volume are **met**; causal acceptance is **not**.

### 1.3 Verdict on volumes

High counts are **expected** under the current tag rules (especially emotion + personality trait priors on common social/food kinds). They are evidence of **wiring + materiality-on-chosen-option**, not of **choice-changing causality**.

---

## 2. P1 - Memory causality (sec25)

### 2.1 CURRENT counters

| Metric | CP5 | Role |
|--------|-----|------|
| `memoryAttributedDecisions` | 20942 | decisions whose chosen why carried `mem:*` |
| `memoryAttributedNpcs` | max 103 (s1) | distinct NPCs ever tagged |
| Mission floor | >=20 "causal" | harness treats tag volume as PARTIAL, not PASS |

Mechanism path:

1. `placeMemoryFactor` (`decide.ts`) loads `knownSpots` (semantic + episodic + legacy `v.memories`).
2. Near danger: damp `m`; near good + gather-like kind: boost `m`; each hit calls `reinforceRecall(..., near)`.
3. `SCRATCH_ATTR.memory = recalled || |dm| >= 0.08`.
4. Chosen re-score -> `mem:place` -> counter++.

`reinforceRecall` (`memory.ts`) only bumps `lastRecall` / `importance` / `confidence` for episodic near `(x,y,r)` - rehearsal side-effect, **not** a causality proof by itself.

### 2.2 Why attribution != causality

1. **Tag = "chosen option's place factor moved"**, not "memory changed the winner." Needs+survival can still dominate; memory may be a passenger multiplier.
2. **`recalled === true` alone sets the flag** even if the numerical dm is tiny (below 0.08), as long as a spot was in range and `reinforceRecall` ran.
3. **Scoring mutates memory:** every option scored near a spot rehearses episodes **before** the choice - contamination of the world state used for later options / later ticks.
4. **Post-pick re-score only:** tags reflect the winner's place factor, not comparative delta across the menu.
5. **Burrow / religion** sit inside `placeMemoryFactor` **before** `beforeMem`; they are **not** attributed as memory, but they share the factor slot - spot bias can be mixed with non-memory place terms in the same product component after floor.
6. **Dual memory SoT:** `knownSpots` prefers mind; legacy fills only if mind empty for that kind - attribution does not distinguish which store caused the bias.
7. **HARD flee/fight** may bypass soft memory tags entirely while still using danger knowledge elsewhere - under-count of true memory-driven survival, over-count of soft gather near goodSpot.

### 2.3 ROOT CAUSE

Instrumentation equates **material contribution on the selected candidate** (and/or **rehearsal during scoring**) with **causal use in the decision**. There is no ablation pass that recomputes utilities with spot bias / episodic weights forced off and compares `ChosenAction*`.

Secondary: `reinforceRecall` during `fillFactorProduct` couples measurement to state mutation, so "memory used" is not a pure read of prior belief.

### 2.4 Missing counterfactual evidence

| Evidence | Status |
|----------|--------|
| `CandidateScoreBefore[i]` with spots ignored / `placeMemoryFactor` spot loops skipped / episodic weights->0 | **MISSING** |
| `CandidateScoreAfter[i]` live | **partial** (only final chosen utility retained loosely in why string / breakdown) |
| `ChosenActionBefore` vs `ChosenActionAfter` | **MISSING** |
| Causal counter: only increment when actions differ (or top-2 swap) | **MISSING** (today: any `mem:place` on chosen) |
| Per-spot: which episode id flipped the choice | **MISSING** |
| Freeze episodic during score (no reinforce until after pick) | **MISSING** (needed for clean Before/After) |

### 2.5 FILES

| File | Role |
|------|------|
| `src/lib/sim/cognition/decide.ts` | `placeMemoryFactor`, `fillFactorProduct`, `pickTaskByPolicy`, `mem:place` tag |
| `src/lib/sim/cognition/memory.ts` | `reinforceRecall`, `knownSpots`, episodic/semantic |
| `src/lib/sim/cognition/sensing.ts` | other `reinforceRecall` on perceive (upstream of decide) |
| `src/lib/sim/attributionMetrics.ts` | counters, `ATTRIBUTION_MATERIAL_DELTA`, `noteAttributedDecision` |
| `src/lib/sim/cognition/tick.ts` | `noteChosenAction` -> flags from why |
| `src/lib/sim/behaviors.ts` | `chooseTask` passes `pick.whyFactors` |
| `scripts/_probe_phase4_causality_soak.ts` | soak snapshot |
| `scripts/harness/adapters.ts` | sec25 PARTIAL gate |

### 2.6 Proposed FIX shape (no implement)

**DP1 - Memory counterfactual probe (measure-first):**

1. Add optional **read-only** scoring mode: `fillFactorProduct(..., { ablating: 'memory' })` that skips danger/good spot mults and **does not** call `reinforceRecall` (defer rehearsal to post-commit).
2. In `pickTaskByPolicy` (sample rate or debug soak flag): compute full `utilsBefore` / `utilsAfter`, `chosenBefore` (argmax or same RNG stream), `chosenAfter`.
3. New counters (names illustrative): `memoryCausalFlips`, `memoryMaterialNoFlip`, keep legacy `memoryAttributedDecisions` for continuity.
4. Emit compact ring samples: `{ tick, villagerId, beforeKind, afterKind, topDeltaU, spotKind }`.
5. Harness: sec25 PASS only if `memoryCausalFlips >= 20` (or mission bar) on natural soak - **do not** PASS on attributed volume alone.
6. **No scripting** (`if dangerSpot then flee`); only prove existing soft bias can flip choice.

Regression: farm/mill/harvest urgency unchanged; farmer lock untouched; reinforce still runs once after commit.

---

## 3. P2 - Emotion causality (sec26)

### 3.1 CURRENT counters

| Metric | CP5 | Role |
|--------|-----|------|
| `emotionAttributedDecisions` | **107680** | largest attribution channel |
| `emotionAttributedNpcs` | 149 / 108 / 111 | nearly whole pop over 60d |
| Mission floor | >=15 | volume **far** above; still PARTIAL |

Mechanism:

- Factor index 2: `emotionsFactor` -> `emotionTaskBias(mind.emotions, kind)` (`emotions.ts`).
- Tag if `|m - 1| >= 0.08` -> `emo:bias` on chosen re-score.

`emotionTaskBias` applies large kind-specific mults (e.g. flee <- fear*0.9, giveFood/socialise <- affection, rest <- stress, teachCraft <- pride, idle/experiment <- approachAvoid, global stress damp on explore-like kinds, etc.).

### 3.2 Why attribution != causality

1. **Almost any mildly aroused agent** on a mapped kind crosses delta>=0.08 on the **chosen** kind - tag inflation (16%+ of all exact decisions).
2. Still **no comparison** to the same menu with emotions forced to neutral (all axes 0 / bias return 1).
3. Emotion also leaks into **other** factors (e.g. `valuesPlanFactor` crisis uses fear; `stressHabitFactor` uses stress; social giveFood mixes `mind.emotions.affection`) **without** separate emo tags - double path, single shallow counter.
4. Softmax **temperature** uses stress/fear (`decisionTemperature`) - can change sampling noise without ever setting `SCRATCH_ATTR.emotion`.
5. HARD survival assigns often carry `['HARD','survive',...]` only - emotion may matter biologically but **zero** emo attribution.
6. High volume creates false confidence: harness sees >=15 and stops at PARTIAL; humans may misread 107k as "emotions drive decisions."

### 3.3 ROOT CAUSE

Materiality is defined as **deviation of the emotion multiplier from 1.0 on the winning option**, not as **necessity of that multiplier for the win**. Given the strength of authored `emotionTaskBias` curves, deviation-from-1 is the **common case**, so attribution saturates while causal flips remain unmeasured.

### 3.4 Missing counterfactual evidence

| Evidence | Status |
|----------|--------|
| `CandidateScoreBefore[i]` with `emotionTaskBias -> 1` (and ideally emotion-blind temperature) | **MISSING** |
| `CandidateScoreAfter[i]` live | **MISSING** as vector |
| `ChosenActionBefore` / `ChosenActionAfter` | **MISSING** |
| Split: `emotionCausalFlips` vs `emotionMaterialNoFlip` | **MISSING** |
| Controlled affect shocks (fear spike) **separate** from natural soak | **MISSING** (Phase 5: keep natural vs controlled separated) |
| Attribution of emotion inside habit/plan factors | **MISSING** |

### 3.5 FILES

| File | Role |
|------|------|
| `src/lib/sim/cognition/emotions.ts` | `emotionTaskBias`, `applyEmotionEvent`, `amygdalaTag` |
| `src/lib/sim/cognition/decide.ts` | `emotionsFactor`, SCRATCH_ATTR.emotion, `emo:bias`, `decisionTemperature` |
| `src/lib/sim/cognition/tick.ts` | feel / decay / `noteChosenAction` |
| `src/lib/sim/attributionMetrics.ts` | emo counters |
| `scripts/harness/adapters.ts` | sec26 PARTIAL |
| Soak JSON / `PHASE4_CAUSALITY_VALIDATION.md` | observed volumes |

### 3.6 Proposed FIX shape (no implement)

**DP2 - Emotion counterfactual (parallel to DP1):**

1. Ablation mode: force `emotionsFactor = 1`; optional second mode also freeze T to courage-only / neutral affect.
2. Same Before/After score vectors + chosen actions; count **flips only**.
3. Keep `emotionAttributedDecisions` as "material on chosen" for debug; gate emergence on `emotionCausalFlips >= 15`.
4. Optional **controlled** probe (separate script): inject affect event -> expect flip on flee/rest/social - **never** mix into natural soak PASS.
5. Document temperature channel separately (`emotionTempFlips`) so noise vs multiplicative bias are not conflated.
6. No new `if fear > x then flee` scripts.

---

## 4. P3 - Personality causality (sec24)

### 4.1 CURRENT counters

| Metric | CP5 | Role |
|--------|-----|------|
| `personalityAttributedDecisions` | **79005** | `pers:*` on chosen |
| `personalityAttributedNpcs` | 118 / 96 / 96 | |
| `personalityPairSamples` | **192** (64x3) | ring length (cap 64) |
| `personalityPairReady` | **2366** | count of trait-similar same-kind pairs in ring |
| Mission | >=30 **matched pairs with delta behavior** | samples>=30 -> PARTIAL; **delta behavior not proven** |

Mechanism:

- `socialTomFactor`: trait priors
  - socialise/entertain/counsel: `persDelta = sociability * 0.35`
  - giveFood: `generosity * 0.4`
  - teachCraft: `sociability * 0.28 + ambition * 0.12`
  - confront/steal: `courage * 0.15 - generosity * 0.12`
  Flag if `|persDelta| >= 0.08` (**on the trait term**, not on full factor delta).
- `placeMemoryFactor`: if `d > 40`, `m *= 0.88 - courage*0.06`; flag if `|dm| >= 0.08` (nearly always for distant options).
- Tag label always `pers:social_tom` even for courage-distance path (naming mismatch).
- Pair ring: on personality-attributed decision with `isPairKind`, push `{villagerId, traits, kind, tick, day}`; `countPairReady` counts pairs with **same kind**, different id, L1 trait dist <= 0.35. **Does not store or compare behavior outcomes / alternate choices.**

### 4.2 Why attribution != causality

1. **Trait prior threshold is weak:** e.g. sociability >= ~0.23 => social kinds always personality-attributed when chosen - volume without flip proof.
2. **Distant courage damp** tags personality on almost every far option that wins - conflates geography with personality causality.
3. **PairReady != matched-pair experiment:** it is combinatorial proximity in a rolling buffer, not "two NPCs, comparable context, different traits, measured delta P(kind)" or "same traits, same context, same choice."
4. No `CandidateScore*` ablation with traits -> population mean / 0.5.
5. Personality also drives **temperature** (courage/curiosity) without `pers:` tags.
6. Homophily / ToM / relations in `socialTomFactor` after the trait prior are **not** separated from personality attribution.

### 4.3 ROOT CAUSE

sec24 was instrumented as **(a)** material trait prior on soft social/combat kinds + **(b)** a trait-similarity ring. The mission asks for **paired behavioral contrast**. The ring never records the counterfactual choice under swapped traits or a second villager's choice in a matched context window - so `personalityPairReady` overstates readiness for PASS.

### 4.4 Missing counterfactual evidence

| Evidence | Status |
|----------|--------|
| `CandidateScoreBefore[i]` traits neutralized (or set to village mean) | **MISSING** |
| `CandidateScoreAfter[i]` live traits | **MISSING** as vector |
| `ChosenActionBefore` / `ChosenActionAfter` | **MISSING** |
| Natural pairs: same day-band, same local options menu hash, trait distance, **delta chosen kind or delta P** | **MISSING** |
| `personalityCausalFlips` / `personalityMatchedDeltaSamples` | **MISSING** |
| Disambiguate courage-distance vs social_tom tags | **MISSING** (label collision) |

### 4.5 FILES

| File | Role |
|------|------|
| `src/lib/sim/cognition/decide.ts` | `socialTomFactor`, courage distance in `placeMemoryFactor`, `pers:social_tom`, temperature |
| `src/lib/sim/attributionMetrics.ts` | pair ring, `countPairReady`, pers counters, `isPairKind` |
| `src/lib/sim/cognition/tick.ts` | `noteChosenAction` + sample payload |
| `src/lib/sim/types.ts` | `attributionCounters` shape |
| `scripts/harness/adapters.ts` | sec24 PARTIAL on `personalityPairSamples >= 30` |
| Soak dumps | 192 samples / 2366 pairReady |

### 4.6 Proposed FIX shape (no implement)

**DP3 - Personality pairs + ablation:**

1. **Ablation:** same Before/After pattern as P1/P2 with traits -> neutral; count `personalityCausalFlips`.
2. **Natural pairs:** retain ring but store `menuFingerprint` (sorted kinds+coarse cell), `chosenKind`, trait vector; pairReady only when fingerprints match and either traits close **with same choice** (consistency) or traits far **with different choice** (contrast) - mission wants measured delta behavior.
3. Split tags: `pers:social_tom` vs `pers:courage_range` (honesty).
4. Optional controlled twin probe (separate from natural): clone menu, swap sociability - expect socialise rank change; **not** a natural PASS input.
5. Harness: sec24 PASS requires >=30 **contrast or consistency pairs with fingerprint match**, not raw `personalityPairSamples`.
6. Preserve soft path; no forced profession/personality scripts.

---

## 5. Cross-cutting defects (all of P1-P3)

| Defect | Impact |
|--------|--------|
| Tags from **chosen re-score only** | Cannot see if channel demoted a rival that would have won |
| Softmax stochasticity | Need fixed RNG replay for Before/After or use argmax for causal definition |
| Imagination reweight top-3 after factors | Ablation must include or exclude imagination consistently |
| Floor `max(0.02, mult)` | Tiny biases vanish; materiality checked inconsistently (emotion pre-floor; memory post-spot; personality on raw persDelta) |
| HARD / orphan setTask | Exact ledger up; attribution often 0 - different universes of proof |
| Harness PARTIAL on volume | Correct honesty today; Phase 5 must add causal counters before any PASS language |
| Label `pers:social_tom` for courage-distance | Misleading analytics |

---

## 6. Priority ordering for later STEP3 (document only)

1. **DP1 Memory counterfactual** - cleanest channel (spot loops localized); also fix score-time `reinforceRecall` mutation.
2. **DP2 Emotion counterfactual** - same scaffold; watch inflation / temperature split.
3. **DP3 Personality** - ablation + rewrite pairReady semantics; depends on same score-vector infra as DP1/DP2.

Shared infra recommendation: one `scoreOptionsWithAblation(channel)` helper used by all three - avoid three divergent probes.

---

## 7. Honest summary

| Priority | Wired? | Volume CP5 | Causal proof? | Blocker |
|----------|--------|------------|---------------|---------|
| P1 Memory | Yes (`mem:place`) | 20942 | **No** | No Before/After choice flip |
| P2 Emotion | Yes (`emo:bias`) | 107680 | **No** | Material-on-chosen >> flip proof |
| P3 Personality | Yes (tags + ring) | 79005 / 192 / 2366 | **No** | Pairs lack matched delta behavior + ablation |

**attribution != causality** is not a slogan here: it is the literal gap between `SCRATCH_ATTR` / why tags and the missing `CandidateScoreBefore/After` + `ChosenActionBefore/After` evidence.

**No implementation in this step.** Next engineering step is measure-first counterfactual instrumentation (DP1 then DP2 then DP3), then re-soak vs CP5 without lowering thresholds and without scripting.

---

*End ANALYSIS_PHASE5_P123_ATTRIBUTION.md - feeds PHASE5_CAUSALITY_MASTER.md STEP1 rows P1-P3.*
