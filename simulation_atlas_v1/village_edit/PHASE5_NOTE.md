# PHASE5_NOTE

**Phase :** 5 — Causalite reelle
**Owner :** AGENT 1 — ORCHESTRATEUR / STEP6–7 integrator
**Date :** 2026-09-17
**Statut :** **STEP6 DONE** (soak naturel 100×60×3) ; **STEP7 DONE** (`PHASE5_CAUSALITY_VALIDATION.md`) ; **GLOBAL NON DECLARE**

## Resume

- Baseline CP5 : `100x60x3`, decisionExact=650960, PASS_RATE 10% (2/20 = Sec.28+Sec.33), GLOBAL **NON DECLARE**.
- DP1–DP12 **DONE CODE** (DP6 DESIGN_DOCUMENTED).
- **STEP6 soak** : `scripts/_probe_phase5_causality_soak.ts` — dumps `_phase5_soak_s{1,3,7}.json` + `_phase5_soak_summary.json` + `_phase5_soak_run.txt`.
- **STEP7 rapport** : `PHASE5_CAUSALITY_VALIDATION.md` vs CP5.
- Totaux cles soak : decisionExact=**665091** ; memCF=**1731** emoCF=**5432** persCF=**2181** ; teachTrue=**223** ; profMF share=**1.0** ; leaves=**16** foundCamps=**3** ; help cats=**6** (defend+labor LIVE) ; creedGen2=**46** ; PASS_RATE harness=**5 %** (1/20 = §28 seul) ; §33 **PARTIAL** (regression vs CP5 PASS).
- food_chain seed7 20j : harvest/grind/bake **LIVE**.
- Clamp social 120 : **INCHANGE**. P13 SKIP.
- **GLOBAL / EMERGENCE PASS : NON DECLARE** — ne pas chase.

## DP1–DP12

Voir sections DP1–DP12 ci-dessous (CODE DONE ; acceptance via STEP6 soak / VALIDATION). Acceptance individuelle : **PENDING** sauf DP6 DESIGN_DOCUMENTED ; aucun PASS invente hors harness §28 volume.

## DP1

- Counters PASS-gate: `memoryCausalFlips` (floor smoke >=10 / soak later >=20)
- Soak 100×60×3 : flips=**1731**
- Files: `decide.ts`, `attributionMetrics.ts`, `tick.ts`, `scripts/_probe_phase5_memory_cf.ts`

## DP2

- Counters PASS-gate: `emotionCausalFlips` (floor >=15)
- Soak : flips=**5432**
- Files: `decide.ts`, `attributionMetrics.ts`, `tick.ts`, `scripts/_probe_phase5_emotion_cf.ts`

## DP3

- Counters: personalityCausalFlips + personalityPairDivergent/Ready
- Soak : flips=**2181** ; pairReady=2886 ; divergent=1686
- Files: decide.ts, attributionMetrics.ts, tick.ts, scripts/_probe_phase5_personality_cf.ts

## DP4

- Counters: teachTrueLaterUses (candidate) ; teachLaterUses = DEBUG/proxy
- Soak : teachTrue=**223** ; proxy=1132
- Files: causalityMetrics.ts, interactions.ts, behaviors.ts, scripts/_probe_phase5_teach_cf.ts

## DP5

- Counters: professionChangesMultiFactor ; share target >=70%
- Soak : share=**1.0** (684/684)
- Files: professionFactors.ts, careers.applyProfessionChange, attributionMetrics, scripts/_probe_phase5_profession_cf.ts

## DP6

- Verdict: **INTENTIONAL open task** — grindLabel=`GRIND_OPEN_TASK`
- Soak : millerAlivePeakMax=**1** ; grind sans gate miller
- Acceptance: **DESIGN_DOCUMENTED** / WONTFIX_DESIGN

## DP7

- Stages migrate : urge→leave→travel→dest→settle→camp|rejoin|fail
- Soak : leaves=16 ; foundCamps=3 ; housedLeave=3 homeless=13 ; mission migrate npc UNDER
- Files: politics.ts, migrationMetrics.ts, causalityMetrics.ts, scripts/_probe_phase5_migrate_stages.ts

## DP8

- Help cats defend+labor LIVE
- Soak : defend=18 labor=17 ; opp=135 taken=18 ; cats max=6
- Files: behaviors.ts, interactions.ts, causalityMetrics.ts, scripts/_probe_phase5_help_defend_labor.ts

## DP9

- Controlled MECHANISM only — natural §32 PARTIAL ; choc NOT_TESTED in EMERGENCE soak
- Files: `_probe_phase5_eco_shock.ts`

## DP10

- Soak : variationPct min **0.88** ; stuck14d max **0.09** ; secondary min **0.89**
- Files: behaviorSequenceMetrics.ts, cognition/tick.ts, decide.ts, scripts/_probe_phase5_antiloop.ts

## DP11

- Soak : creedGen2=**46** ; parentChild=46 ; genDepthMax=2 (s1) ; gen3=1
- Files: causalityMetrics.ts, politics.ts, religion.ts, scripts/_probe_phase5_creed_2gen.ts

## DP12

- Soak : sec22Status=PARTIAL ×3 ; priority PARTIAL ×9 ; missionFloorsMet=**false** (migration_camp npc UNDER)
- Files: sec22Evidence.ts, causalityMetrics.ts, scripts/_probe_phase5_sec22_formats.ts

## Livrables

| Fichier | Role |
|---------|------|
| `PHASE5_CAUSALITY_MASTER.md` | Regles, scoreboard, audit, DP1-DP12 |
| `PHASE5_CAUSALITY_VALIDATION.md` | STEP6–7 soak vs CP5 |
| `PHASE5_EVIDENCE_LOG.md` | Blocs `TEST:` / `CHAIN:` |
| `PHASE5_NOTE.md` | Status transition |
| `PHASE5_PAUSE.md` | Checkpoint reprise |
| `scripts/_probe_phase5_causality_soak.ts` | Soak naturel Phase5 |

## Next

STEP6–7 **DONE**. GLOBAL **NON DECLARE**. Ne pas relever clamp 120. Priorite restante : migration npc samples / leaves volume (§33 + sec22 migration_camp floors).
