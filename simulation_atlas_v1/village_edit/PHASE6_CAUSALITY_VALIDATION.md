# PHASE 6 — CAUSALITY CONSOLIDATION

**Date:** 2026-09-17  
**Workspace:** `_wt_rhythm/village_edit`  
**Soak:** `npx tsx scripts/_probe_phase5_causality_soak.ts 60 1,3,7` (exit 0, ~13.3 min)  
**GLOBAL:** **NON DECLARE** (evidence-only; no metric cheat)

## Logs utilisateur
- Soak headless Phase6: `_phase6_soak_run.txt` + `_phase5_soak_summary.json` / `_phase5_soak_s{1,3,7}.json`
- Aucun log live Chronique/`npm run app` utile ce tour

---

## Scorecard

| Bloc | Verdict | Preuve (60d × seeds 1,3,7) |
|------|---------|----------------------------|
| Migration | **PARTIAL** | leaves=**14** (P5:16; CP5:22); camps=**3**=housedLeave; migrateNpc=**5/15/3** (P5:0 wiring bug FIXED); floors events still UNDER on s1/s7 |
| Memory → Decision | **PARTIAL** | memCF **2202** (P5:1731) LIVE CF |
| Emotion → Decision | **PARTIAL** | emoCF **3861** (P5:5432) LIVE CF |
| Personality → Decision | **PARTIAL** | persCF **1639** (P5:2181); pairDivergent **1730** |
| Family → Decision | **PARTIAL** | **NEW** famCF **53+5+53=111**; uses 642/58/1249; s3 floors evt UNDER (5/15) |
| Relationship → Help | **PARTIAL** | **NEW** relCF **4348+3473+2758=10579**; helpTotal 27459; cats 6 |
| Learning → Future | **PARTIAL** | teachTrue **174** (P5:223); teachProgressPct ~5–10%; trueConversion ~8% |
| Profession | **PASS** | MF share **1.0** (579/579); unchanged PASS block |
| Groups | **PARTIAL** | circlesFormed **192** (P5:167) |
| Institutions | **PARTIAL** | present (inst path); no new CF |
| Belief → Behavior | **PARTIAL** | creed gen2 **102**; parentChild **102** (P5:46) |
| Conflict | **PARTIAL** | conflicts **866** (P5:843) |
| Multi-seed | **PARTIAL** | 3/3 seeds OK; outcomes differ; harness §38 still NOT_TESTED |
| Performance | **PARTIAL** | 60d×3 completed; anti-loop variation≥0.87 stuck14d≤0.09 |

---

## Phase 5 → Phase 6 comparison

| Metric | P5 | P6 | Note |
|--------|----|----|------|
| decisionsExact | 665091 | **735423** | + |
| leaves | 16 | **14** | volume still soft (no leave buff) |
| foundCamps | 3 | **3** | = housedLeave (design hasHome) |
| migrateNpcCount | 0 | **5/15/3** | wiring FIXED |
| memoryCausalFlips | 1731 | **2202** | |
| emotionCausalFlips | 5432 | **3861** | volume ↓, still LIVE |
| personalityCausalFlips | 2181 | **1639** | |
| familyCausalFlips | — | **111** | NEW channel |
| relationCausalFlips | — | **10579** | NEW channel |
| teachTrueLaterUses | 223 | **174** | |
| profession MF | 1.0 | **1.0** | preserved |
| births | 93 | **91** | |
| helpTotal | 36239 | **27459** | |
| circles | 167 | **192** | |
| creed gen2 | 46 | **102** | |
| conflicts | 843 | **866** | |
| food H/G/B | 2794/850/174 | **2894/888/216** | chain intact |

---

## What Phase 6 connected (not rewritten)

1. **WP1a** — pass `villagerId` into migrate causality (measure-only)
2. **M6.1** — `AblationChannel: family` → famCF
3. **M6.2** — teachCraft kinship family tag
4. **M5.1** — `AblationChannel: relation` + catalogue help damp → relCF
5. **M7.1** — `teachProgressPct` / `teachTrueConversion` on causality snapshot

## Migration residual (honest)

- Camp path still **hearth-only** (`hasHome`); 11/14 leaves homeless → travel/rejoin (design, not CREATE_CAMP)
- Leaves 14 < sec33 floor 20 — prosperity/elder retention; **not** buffed for PASS
- `migration_camp` npc floor now **OK** on all seeds; event floor still UNDER when leaves < 5

## Forbidden (respected)

No CREATE_CAMP / leave buff / floor cheat / clamp raise / TS rewrite for Bevy / Phase 7 auto-start

## Harness

PASS 1/20 (§28 profession only) · GLOBAL **NON_DECLARED** · social 300 **BLOCKED** (clamp 120)

---

## STOP

Phase 6 consolidation **complete for this pass**. Awaiting instructions. **No Phase 7.**