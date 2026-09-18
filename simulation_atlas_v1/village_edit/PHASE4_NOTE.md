# PHASE 4 — Note de transition (master)

**Date :** 2026-09-17  
**Statut phase :** **PHASE 4 — CAUSALITY** — CP1+CP2+CP3 **DONE (CODE wired)** ; CP3 acceptance PENDING ; GLOBAL **NON DÉCLARÉ**

Le fichier `EMERGENCE_MISSION_MASTER.md` n'a pas été muté automatiquement dans cette session (garde documentation partagée). Appliquer manuellement ou via commit dédié :

```text
PHASE 4 — CAUSALITY (plan ready; measure→prove→fix→remeasure; GLOBAL NON DECLARED)
```

| Phase | Statut |
|-------|--------|
| 2 | CLOSED (mécanisme WP1–12) — `EMERGENCE_MISSION_REPORT.md` |
| 3 | **EXECUTED** — soak 100×60×3 ; PASS_RATE **0 %** ; `PHASE3_EMERGENCE_VALIDATION.md` |
| 4 | **CP5 DONE** — GLOBAL **NON DECLARE** — `PHASE4_CAUSALITY_MASTER.md` ; log `PHASE4_INCOHERENCE_LOG.md` ; **aucun PASS** |
| 5 | BLOCKED (attente preuves causales P4) |

## Objectif Phase 4

MESURER → PROUVER CAUSALITÉ → TROUVER INCOHÉRENCES → FIX (doc-before-fix) → RE-MESURER.  
**Pas** de nouveaux systèmes. **Pas** de fake GLOBAL/EMERGENCE PASS.

## Ordre CP

1. **CP1** — ledger décisions exactes (`chooseTask` / `setTask` / `noteChosenAction`)
2. **CP2** — compteurs A→B §22
3. **CP3** — probes attribution mémoire / émotion / personnalité
4. **CP4** — incohérences (migration enactment, help cats, miller/stock si causal) — **doc puis fix**
5. **CP5** — re-soak 100×60×3 + `PHASE4_CAUSALITY_VALIDATION.md`

## Faits P3 qui restent vrais

- PROXY 197 869 ≠ exact ; §22 NOT_TESTED
- leaves 13≪20 ; foundCamps 0 ; help cats 1–2 ; miller 0 ; stock fin 0
- Social START@300 **BLOCKED** (300→120) — **ne pas relever le clamp**
- Gate : pas d'EMERGENCE PASS sans décisions exactes + seuils

## Logs frais (snapshot)

| Fichier | Mtime approx. |
|---------|----------------|
| `_phase3_soak_s1.json` | 17/09 ~02:13 |
| `_phase3_soak_s3.json` | 17/09 ~02:15 |
| `_phase3_soak_s7.json` / summary / run | 17/09 ~02:17 |
| `PHASE3_EMERGENCE_VALIDATION.md` | 17/09 ~02:19 |


## CP1 status

**DONE (CODE wired)** — counters on SimState.decisionExact; hooks noteChosenAction + orphan setTask flush; harness PASS gate uses decisionExactTotal only (PROXY ignored).

Smoke seed=1 days=5: decisionExactTotal=3982 (chooseTask=1928 HARD=148 other=1906 setTask=0); setTaskAssigns=3213; orphanSetTask=0; noteChosen>setTask due to reprises.

Residual: night home-rest setTask without noteChosenAction (orphan path); any future setTask skipping note; task.kind mutations in executeTask that skip setTask/note entirely.

No EMERGENCE/GLOBAL PASS claimed.

## CP2 status

**DONE (CODE wired)** — causalityCounters on SimState; hooks food/teach/creed/migrate/price/help; snapshotCausalityMetrics.

Smoke seed=1 days=5: food harvest=29 grind=18 bake=9 eat=82 stock=0 npcs=89; creed changes=6 followups=1; price delta=89 task=6 prof=7; teach/migrate/help=0; decisionExactTotal=3982. Chains: food PARTIAL, price PARTIAL, creed CONNECTION_NOT_PROVEN, others NOT_TESTED. sec22Status=PARTIAL (instrumentation only — NOT acceptance PASS).

No EMERGENCE/GLOBAL PASS claimed. Acceptance PENDING (>=20/15/5/3NPC/3seeds).


## CP3 status
**DONE (CODE wired)** — attributionCounters on SimState; tags `mem:place` / `emo:bias` / `pers:social_tom` from fillFactorProduct material deltas; counted at noteChosenAction; personality pair ring infrastructure (no sec24 PASS claimed).

Smoke seed=1 days=5: memoryAttributedDecisions=296 npcs=3; emotionAttributedDecisions=1005 npcs=77; personalityAttributedDecisions=94 npcs=29; personalityPairSamples=29 personalityPairReady=130; decisionExactTotal=3982; status=WIRED.

Acceptance **PENDING** (NOT_TESTED until soak thresholds). No forced personality drift. No softmax rewrite. No CP4 INC. No EMERGENCE/GLOBAL PASS.
## Prochaine action

CP3 CODE wired; acceptance PENDING. CP5 DONE. GLOBAL / EMERGENCE agrege NON DECLARE.

---

## CP5 status

**DONE (re-mesure + validation)** — `scripts/_probe_phase4_causality_soak.ts` naturel 100 NPC × 60j × seeds 1,3,7.

Key totals: decisionExactTotal=650960 ; leaves=22 ; foundCamps=2 ; edibleSum=2123 ; helpCatsMax=4 ; sec22 PARTIAL×3 (creed/migrate often CONNECTION_NOT_PROVEN).

Harness: EMERGENCE PASS locaux §28 metiers + §33 migration ; PASS_RATE 10% (2/20). finalizeLabel refuse PASS si exact<10000 ou floors fail.

**GLOBAL / EMERGENCE agrege : NON DECLARE.** Social 300 BLOCKED (300→120). Evidence: `PHASE4_CAUSALITY_VALIDATION.md`, `_phase4_soak_*.json`.