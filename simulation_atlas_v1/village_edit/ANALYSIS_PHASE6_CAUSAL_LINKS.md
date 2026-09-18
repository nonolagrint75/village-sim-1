# ANALYSIS PHASE 6 — STEP1 AUDIT ONLY (Priorities 2–7)

**Workspace:** `C:\Users\kamel\village-sim-1\_wt_rhythm\village_edit`  
**Date:** 2026-09-17  
**Mode:** AUDIT ONLY — **no code changes**, **no implement**  
**Scope:** Priorities **2–7** = memory / emotion / personality / relation-help / family / learning  
**Question:** what is **LIVE** vs **PARTIAL** vs **missing link** on decide / social / family / help paths?  
**Constraint:** propose **measure-first connections only** (instrumentation / probes / CF). Do not propose gameplay cheats or metric renames for PASS.

---

## Logs utilisateur

| Source | Contenu |
|--------|---------|
| Terminal `619470.txt` | Soak Phase5 STEP6 headless: `npx tsx scripts/_probe_phase5_causality_soak.ts 60 1,3,7` — **succeeded**; alive/deaths/leaves progress per seed |
| Dumps | `_phase5_soak_summary.json`, `_phase5_soak_s{1,3,7}.json`, `_phase5_soak_run.txt` |
| Validation | `PHASE5_CAUSALITY_VALIDATION.md` (GLOBAL NON DECLARE, PASS 1/20) |
| Live app | **Aucun log Chronique / `npm run app` / Vite console utile** pour ce tour. Port 5174 inspecte (Listen/TimeWait) mais **pas de sortie sim utilisateur** exploitable pour morts/AFK/metiers. |
| Verdict logs | Preuves = **soak headless Phase5** (+ code paths). Pas de contradiction live a corriger avant mesure. |

---

## Legend (Phase 6)

| Label | Meaning |
|-------|---------|
| **LIVE** | Mechanism wired + natural soak counter > 0 with identifiable chain stages |
| **PARTIAL** | Wired / volume OK, but link is attribution, proxy, incomplete stages, or acceptance never PASS |
| **MISSING** | Expected causal edge absent (no counter, no ablation, or catalogue path bypasses decide factors) |

**Golden rule (carry from Phase 5):** `*Attributed` / volume / floor OK ≠ causality. Causality needs **counterfactual flip** or a **true event→skill→later-use** receipt. Sec.22 labels stay **PARTIAL** by design until multi-seed acceptance (never auto-PASS).

**Phase5 soak baseline (3 seeds × 60d, natural):** exact decisions **665091**; memCF **1731**; emoCF **5432**; persCF **2181**; teachTrue **223**; helpTotal **36239** (cats **6**); familyDecisionUses **660 / 46 / 358**; births **93**.

---

## Scorecard priorities 2–7

| Pri | Axis | Sec.22 id | Soak signal | Link status (honest) |
|-----|------|-----------|-------------|----------------------|
| **2** | Memory → decision | `memory_decision` | CF flips 1731; attr ~19k | **LIVE** mechanism + CF; acceptance **PARTIAL** |
| **3** | Emotion → decision | `emotion_decision` | CF flips 5432; attr ~116k | **LIVE** mechanism + CF; acceptance **PARTIAL** |
| **4** | Personality → behavior | `personality_decision` | CF 2181; pairReady 2886; divergent 1686 | **LIVE** CF + pairs; acceptance **PARTIAL** |
| **5** | Relation → help | `relationship_help` | help 36k; defend 18; labor 17; npcs OK | **PARTIAL** (volume LIVE; relation→choice CF **MISSING**) |
| **6** | Family → decision | `family_decision` | fam uses 1064 total; samples kin=0.7 | **PARTIAL** (tag LIVE; family CF **MISSING**) |
| **7** | Learning → future use | `learning_future` | teachTrue 223; proxy 1132; starts 44k | **PARTIAL** (true chain LIVE thin; progress% **MISSING**) |

All six sec22 priority labels = **PARTIAL ×3 seeds**. `missionFloorsMet=false` is driven by **migration** (priority #1, out of scope here) — not by floors on 2–7.

---

## Shared pipeline (decide / social / family / help)

```
behaviors.chooseTask catalogue
  → soft options {kind,x,y,id,baseScore,jobMult,ambitionMult}
  → pickTaskByPolicy (decide.ts)
       fillFactorProduct × N options
         needs · values · emotions · stress · prefs/skill · socialTom(+kin) · political · job · placeMemory
       CF ablations: memory | emotion | personality  (NOT family, NOT help-willingness)
       softmax (+ imagination top-3)
       whyFactors tags: mem:place | emo:bias | pers:social_tom | fam:kin
  → enact in behaviors / interactions
       recordHelp / noteHelpOutcome / noteTeachLaterUse / noteFamilyDecisionUse
```

**Split brain to remember:** catalogue `baseScore` (kinship, sameFamily, generosity, courage) often encodes social/family/help **before** `fillFactorProduct`. Ablating only decide-channel factors **under-measures** relation-help and family pull that lives in `behaviors.ts` `add()` scores.

---

## Priority 2 — Memory → decision

### Chain expected
`mem_event → encode → retrieve → placeMemoryFactor use → kind_flip|stable → action → world`

### LIVE
- `placeMemoryFactor` in `decide.ts` (danger/good spots + `reinforceRecall`).
- Attribution: `mem:place` + `memoryAttributed*`.
- Counterfactual: ablate spots → argmax Before/After → `memoryCausalFlips=1731` (s1 1114 / s3 154 / s7 463).
- Sec22 floors events/NPC local OK on soak; label stays PARTIAL.

### PARTIAL
- CF = **deterministic argmax**, not the softmax sample that actually plays.
- `reinforceRecall` during scoring **mutates** episodic state while comparing options (measurement contamination).
- HARD flee/fight / orphan `setTask` often skip soft mem tags → under-count survival memory use.
- Burrow/religion share the place factor slot — spot bias mixed with non-memory terms.

### MISSING links
- Memory → **help target** / **kin rescue** choice (no mem spot on defend/giveFood menu measured as causal).
- Memory → family home / foyer destination bias as named chain.
- Per-spot episode id that flipped the choice.
- Freeze-read scoring (no reinforce until after pick).

### Measure-first connections (do not implement here)

| ID | Proposal | Files | Proves |
|----|----------|-------|--------|
| M2.1 | Report `flipRate = flips / (flips+materialNoFlip)`; gate PARTIAL→candidate only if flipRate ≥ documented bar | `attributionMetrics.ts`, soak probe | material ≠ passenger |
| M2.2 | Optional second CF: ablate + **fixed-RNG softmax** vs live sample (log flip/stable) | `decide.ts` pickTaskByPolicy | matches enacted policy |
| M2.3 | Defer `reinforceRecall` until after choice (measure mode flag) | `decide.ts`, `memory.ts` | clean Before/After |
| M2.4 | Sample when dangerSpot near ward changes defend/flee ranking (read-only CF on combat menu) | probe + decide | mem↔help bridge |

**Regression risk:** none if measure-only; do not script flee-on-dangerSpot for PASS.

---

## Priority 3 — Emotion → decision

### Chain expected
`emotion_event → bias_data → soft_receive → emotionsFactor use → kind_flip|stable → action → world`

### LIVE
- `emotionsFactor` → `emotionTaskBias` in `fillFactorProduct` (`decide.ts`).
- Tag `emo:bias` when |mult−1| ≥ 0.08.
- CF: ablate emotions→1 → `emotionCausalFlips=5432` (largest of the three CF channels).
- `emotionChanges` / `emotionUses` high volume on soak.

### PARTIAL
- High attribution rate (~16%+ of decisions tagged) — many passenger multipliers.
- Affection also appears inside `socialTomFactor` / giveFood path — **not** cleared by emotion ablation alone when it rides relation terms.
- Catalogue social scores ignore live emotion vector (emotion only in decide mult).

### MISSING links
- Emotion → **help willingness** (fear/affection → defend/giveFood) as CF on catalogue or decide.
- Emotion → kinship help outcome (did anger block giveFood?).
- No `emotion→relation.affinity` writeback measured as causal for later help.

### Measure-first connections

| ID | Proposal | Files | Proves |
|----|----------|-------|--------|
| M3.1 | Same flipRate report as memory for emotion CF | `attributionMetrics.ts` | quality not just volume |
| M3.2 | On help-kind options only, dual-score with emotions ablated; count flips defend/giveFood/socialise | `decide.ts` or probe | emo↔help |
| M3.3 | Ring samples: emotion snapshot at `noteHelpOutcome` (fear/affection/anger) | `causalityMetrics.ts` | correlational bridge before CF |

**Regression risk:** keep HARD survival floors; never script fear→flee for acceptance.

---

## Priority 4 — Personality → behavior

### Chain expected
`trait_context → pair_or_prior → soft_receive → pers factor use → kind_flip|pair_delta → action → hist_delta`

### LIVE
- Trait priors in `socialTomFactor` (sociability/generosity/ambition/courage) + courage/curiosity in `placeMemoryFactor` / temperature.
- CF ablation personality → `personalityCausalFlips=2181`.
- Natural pairs: `personalityPairReady=2886`, `personalityPairDivergent=1686` (trait-distant, measurable behavior Δ).

### PARTIAL
- Pair divergent ≠ proof that **traits caused** the Δ (environment confounds).
- `decisionTemperature(courage, curiosity)` affects softmax but is **untagged** / not in CF channel.
- Catalogue already bakes personality into `baseScore` (courage×defend, generosity×share) — CF on factors under-counts that path.

### MISSING links
- Personality → help enactment CF on **catalogue** scores (`willingToDefend` / share thresholds).
- Matched-pair **counterfactual**: same world, swap traits, re-score (MECHANISM only, not EMERGENCE PASS).

### Measure-first connections

| ID | Proposal | Files | Proves |
|----|----------|-------|--------|
| M4.1 | Tag temperature materiality when |T−T0| moves pick vs fixed-T argmax | `decide.ts` | missing channel |
| M4.2 | For defend/giveFood candidates, CF ablate personality **inside catalogue formula** (shadow score) | probe / behaviors measure hook | catalogue causality |
| M4.3 | Keep pair divergent; add `pairFlipShare` only if MECHANISM trait-swap probe exists (separate channel) | new probe | honest EMERGENCE vs MECHANISM |

**Regression risk:** do not rewrite traits in natural soak to manufacture pairs.

---

## Priority 5 — Relation → help

### Chain expected
`need_or_threat → relation_willingness → help_receive → help_use → help_decision → help_action → outcome`

### LIVE
- Enactment + counters: `recordHelp` / `noteHelpEvent` / `noteHelpOutcome` (`family.ts`, `causalityMetrics.ts`).
- Soak `helpByKind`: teach **35847**, build **225**, haul **106**, food **26**, **defend 18**, **labor 17** → **6 categories**.
- Defend funnel: opportunities **135** / taken **18**.
- Catalogue: kinship/affinity/sameFamily boost teach, defend, giveFood (`behaviors.ts`); `willingToDefend` gate.
- Interactions: giveFood/teach/creditRescue wire help + relation bumps.

### PARTIAL
- Sec22 `relationship_help` floors **OK** (events/NPC) but stages reuse `helpEvents` for receive/use — **not** a proven willingness→decision flip.
- Teach volume swamps other help (~99% teach) — diversity LIVE but skewed.
- Defend/labor rare (post–Phase5 fix) — LIVE but fragile across seeds (labor 14/0/3).

### MISSING links
- **No relation CF:** ablate kinship/affinity/trust → different help choice / no-help.
- No stable `helpEventId` linking willingness features → decisionExact → outcome.
- Debt/trust → giveFood causal edge unmeasured.
- Relation model (`mind.socialModel` ToM) vs `v.relations` dual SoT not distinguished in help metrics.

### Measure-first connections

| ID | Proposal | Files | Proves |
|----|----------|-------|--------|
| M5.1 | Shadow-score help options with kinship/affinity forced 0; count flips vs live | `decide.ts` socialTom + catalogue shadow | relation→help causality |
| M5.2 | Per defend: log `{opp, willing, kin, affinity, taken}`; conversion rate | `behaviors.ts`, causality | opp→taken funnel |
| M5.3 | Help receipt id: event → outcome sample already partial; require decisionExact id on outcome | `causalityMetrics.ts` | A→B ledger |
| M5.4 | Report help mix entropy / non-teach share (measure, no nerf teach yet) | soak probe | skew visibility |

**What NOT to do:** rename teach→defend; force wolves; buff leave/help for PASS.

---

## Priority 6 — Family → decision

### Chain expected
`kin_or_values.family → relation_data → soft_receive → family_bias_use → decision → action → world`

### LIVE
- `SCRATCH_ATTR.family` + `fam:kin` when kinship/familyValue material on socialise / giveFood / defend (`socialTomFactor`).
- `noteFamilyDecisionUse` → soak uses **660 / 46 / 358** (npc 45 / 6 / 21).
- Genealogy / foyer: `sameFamily`, `registerBirth`, kinship 0.9 on birth (`family.ts`, `behaviors.ts`).
- Catalogue multipliers: `familyTeach` 1.3, `familyDefend` 1.35, share/kinPull for food.

### PARTIAL
- Family channel is **tag + volume only** — **no `AblationChannel: 'family'`** (unlike mem/emo/pers).
- `teachCraft` uses respect/affinity in socialTom but **does not** set `SCRATCH_ATTR.family` even when kinship high — under-count family→teach.
- Foyer (`familyId`) vs kinship coefficient conflated in narrative; metrics mostly kinship.

### MISSING links
- Family CF flips (kinPart/famVal → 0).
- `sameFamily` catalogue boost outside decide CF.
- Family → help outcome chain (kin help vs stranger help rates with matched need).
- `values.family` drift after births/deaths unlinked to later decisions.

### Measure-first connections

| ID | Proposal | Files | Proves |
|----|----------|-------|--------|
| M6.1 | Add measure-only ablation `family` (zero kinPart/famVal in socialTom; leave other rel terms) + flip counter | `decide.ts`, `attributionMetrics.ts` | true family causality |
| M6.2 | Tag family on teachCraft when kinship ≥ bar (measure parity with socialise) | `decide.ts` | close under-count |
| M6.3 | Split samples: foyer `sameFamily` vs kinship-only vs values.family | `causalityMetrics.ts` | SoT clarity |
| M6.4 | Rate: helpOutcomes where helper/receiver sameFamily vs not (conditional on need) | soak | family→help bridge |

**Regression risk:** do not force births or kinship writes for floors.

---

## Priority 7 — Learning → future use

### Chain expected
`teachCraft → skillDelta → pupil_receives → later_skill_use → true_reuse → action → world`

### LIVE
- `doTeachCraft` + `noteTeachCraftEvent` with skillBefore/After (`interactions.ts`).
- Pending ring (max 8) + TTL ~5d (`causalityMetrics.ts`).
- `teachTrueLaterUses=223` for productive skills only (`chop|build|trade|fish|mine|craft|farm|fight`) with skillΔ>0.
- Samples include teacherId, receiverId, futureAction (e.g. farm→gatherFood, chop→gatherWood), decisionExactId.
- Proxy `teachLaterUses=1132` retained as DEBUG.

### PARTIAL
- Funnel still harsh: starts **44618** → true later **223** (~0.5%).
- Master still teaches **max skill** (often social) — social excluded from true chain → many teaches never eligible.
- Sec22 stages treat trueLater as decision+action+world without proving **choice flip from skill**.
- No `teachProgressPct` / receivers-with-Δ mission metric.

### MISSING links
- SkillΔ → **argmax flip** on later soft menu (did farm skill change chosen task?).
- Curriculum intent (declared craft skill) vs max-skill — measure gap only so far.
- Family teach preference → higher trueLater rate (unmeasured cross-link to P6).

### Measure-first connections

| ID | Proposal | Files | Proves |
|----|----------|-------|--------|
| M7.1 | Add `teachProgressPct = skillChanges / teachEvents` and `trueConversion = teachTrue / skillChanges` to soak | probe, adapters | mission-shaped funnel |
| M7.2 | On trueLater fire, optional CF: rescore active menu with pupil skill ablated to pre-teach; log flip | probe / decide hook | learning→decision causality |
| M7.3 | Histogram taught skillKey (social vs productive) without changing teach policy yet | `noteTeachCraftEvent` dump | explains low true rate |
| M7.4 | Cross-tab trueLater × sameFamily(teacher,pupil) | soak | family↔learning |

**What NOT to do yet:** force productive teach curriculum for PASS; inflate TTL; count social as true.

---

## Cross-link matrix (decide × social × family × help)

| From \ To | Decide soft | Help enact | Family bias | Learning |
|-----------|-------------|------------|-------------|----------|
| Memory | **LIVE** CF | **MISSING** CF | **MISSING** | n/a |
| Emotion | **LIVE** CF | **MISSING** CF | PARTIAL (affection shared) | n/a |
| Personality | **LIVE** CF + pairs | **PARTIAL** (catalogue) | PARTIAL | PARTIAL (sociability→teach prior) |
| Relation | PARTIAL (socialTom) | **LIVE** volume / **MISSING** CF | LIVE kinship | LIVE teach-as-help |
| Family | **PARTIAL** tag | PARTIAL boosts | LIVE genealogy | PARTIAL (familyTeach score) |
| Learning | PARTIAL (skill factor) | LIVE teach help | MISSING measure | **PARTIAL** true chain |

Phase 6 consolidation should **close MISSING measure edges** (especially family CF + relation→help CF + learning→decision CF) **before** any gameplay retune. Migration remains blocker #1 for sec22 acceptance globally.

---

## Proposed Phase 6 measure order (priorities 2–7 only)

1. **M6.1** family ablation CF (symmetric to DP1–3) — closes biggest instrumentation asymmetry.  
2. **M5.1 / M5.2** relation→help shadow CF + defend funnel — society-facing.  
3. **M7.1 / M7.2** learning funnel % + optional skill ablation on later decision.  
4. **M2.1 / M3.1 / M4.1** flipRate / temperature honesty — tighten mem/emo/pers acceptance quality without new gameplay.  
5. Cross-tabs **M6.4 / M7.4** only after counters exist.

Each step: hypothesis → instrument → natural soak compare Phase5 → **then** minimal fix if link proven dead. No CREATE_*, no help/teach buffs for PASS.

---

## FILES (read map)

| Area | Files |
|------|-------|
| Decide / CF | `src/lib/sim/cognition/decide.ts`, `attributionMetrics.ts` |
| Social / help enact | `src/lib/sim/behaviors.ts`, `interactions.ts` |
| Family | `src/lib/sim/family.ts` |
| Counters / teach | `src/lib/sim/causalityMetrics.ts` |
| Sec.22 labels | `src/lib/sim/sec22Evidence.ts` |
| Evidence | `_phase5_soak_summary.json`, `PHASE5_CAUSALITY_VALIDATION.md` |

---

## Verdict

Priorities **2–4** already have **LIVE counterfactual machinery** from Phase5; remaining work is **quality gates** (flipRate, softmax CF, catalogue personality) and acceptance honesty — not greenfield wiring.  
Priorities **5–7** have **LIVE volume / thin true chains** but **missing measure links** that would connect relation/family/learning into the same CF standard as mem/emo/pers.  
**No PASS claims.** **No implement this step.**

*Fin ANALYSIS_PHASE6_CAUSAL_LINKS.md — STEP1 audit only.*