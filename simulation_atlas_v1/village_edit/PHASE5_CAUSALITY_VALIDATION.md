# PHASE 5 — Validation causalite (STEP6–7 soak naturel)

**Workspace :** `village_edit`  
**Date :** 2026-09-17  
**Canal :** EMERGENCE (naturel — aucune famine / profession / CREATE_* induite)  
**Checkpoint :** **STEP6 DONE** (soak + rapport) ; **STEP7** = ce document  
**Verdict global :** **NON DECLARE** — **aucun GLOBAL PASS / aucun EMERGENCE PASS agrege**

Preuves : `_phase5_soak_s{1,3,7}.json`, `_phase5_soak_summary.json`, `_phase5_soak_run.txt`, script `scripts/_probe_phase5_causality_soak.ts`.  
Regression food_chain : `_phase5_food_chain_s7.txt` (seed7, 20j) — harvest/grind/bake LIVE.  
Baseline compare : `PHASE4_CAUSALITY_VALIDATION.md` (CP5).

---

## Logs utilisateur

Aucun log live Cursor (`npm run app` / Vite) consulte pour ce tour — validation = soak headless STEP6 + food_chain court. Sources lues : dumps `_phase5_soak_*`, tee `_phase5_soak_run.txt`, food_chain tee.

---

## 1. Parametres exacts

| Parametre | Valeur |
|-----------|--------|
| Commande | `npx tsx scripts/_probe_phase5_causality_soak.ts 60 1,3,7` |
| Seeds | **1, 3, 7** (>=3) |
| Jours | **60** (>=60) |
| Config | `createSimulation(seed, { initialVillagers: 100, maxPopulation: 250, preset: 'standard', worldSize: 1000 })` |
| Pop depart | **100** / seed |
| Peak pop | **140** (seed 1) |
| Systemes | `stepSimulation` seul — path naturel |
| Decisions | **Exact** = ledger `decisionExact` ; PROXY = deltas `task.kind` (ignore PASS) |
| Mesures Phase5 | CF flips mem/emo/pers ; teachTrueLaterUses ; profession multi-factor ; migrate stages ; help defend/labor ; seq anti-loop ; creed gen ; `snapshotSec22Evidence` |
| Duree run | ~35,4 min (s1 1170s, s3 445s, s7 511s) ; NODE `--max-old-space-size=8192` |
| Crashes / OOM | **aucun** (3/3 ok) |

### scalePolicy

| Tier | Statut | Chiffres |
|------|--------|----------|
| Individuel START@100 | **READY** | clamp `initialVillagers` **4..120** |
| Social START@300 | **BLOCKED capacite** | 300 → **120** ; **ne pas relever le clamp** |

---

## 2. Scorecard (honnete vs CP5)

Legende : PASS seulement avec preuve + seuil ; sinon PARTIAL / NOT_TESTED / FAIL / BLOCKED / CONNECTION_NOT_PROVEN. **Aucun CODE-ONLY → PASS.** PROXY ≠ exact. **Jamais GLOBAL PASS.**

| Systeme | CP5 | Phase5 STEP6 | Verdict STEP6 |
|---------|-----|--------------|---------------|
| §20 echelle indiv. | PARTIAL (exact 650960) | exact **665091** ; 100/60/3 | **PARTIAL** |
| Survie | PARTIAL | aliveEnd 139/52/80 ; deaths 1/22/10 | **PARTIAL** |
| §22 A→B | PARTIAL ; creed/migrate souvent CNP | sec22Status=**PARTIAL** ×3 ; priority labels **PARTIAL** ×9/seed ; missionFloorsMet=**false** (migrate npc UNDER) | **PARTIAL** (pas acceptance PASS) |
| §23 diversite | PARTIAL | 32/30/33 kinds | **PARTIAL** |
| §24 personnalite | PARTIAL (pairs 192) | flips **2181** ; pairReady 2886 ; divergent 1686 | **PARTIAL** (CF LIVE ; pas PASS mission) |
| §25 memoire | PARTIAL (attr tags) | **memoryCausalFlips=1731** (>=20) | **PARTIAL** |
| §26 emotions | PARTIAL (attr tags) | **emotionCausalFlips=5432** (>=15) | **PARTIAL** |
| §27 apprentissage | PARTIAL (laterUses proxy) | teachTrueLaterUses **223** ; proxy 1132 ; starts 44618 | **PARTIAL** |
| §28 metiers | **PASS** volume | **742** chgt probe / attr 684 ; MF share **1.0** ; ≥4 metiers / 3 seeds | **PASS** (volume) — multi-factor mesure OK (>=70%) |
| §29 familles | PARTIAL | fam 36/34/27 ; births **93** | **PARTIAL** (s7 fam<30) |
| §30 entraide | PARTIAL cats4 | helpTotal **36239** ; cats **6** (teach/build/haul/food/**defend**/**labor**) | **PARTIAL** |
| §31 construction | PARTIAL | houses 79+7+30 ; mills 2+2+4 | **PARTIAL** |
| §32 economie naturel | PARTIAL ; choc NT | harvest **2794** grind **850** bake **174** ; edibleSum **2277** ; choc **NOT_TESTED** (MECHANISM only) | **PARTIAL** / choc **NOT_TESTED** |
| §33 migration | **PASS** leaves22 | leaves **16** (<20) ; foundCamps **3** ; stages LIVE | **PARTIAL** (regression volume leaves vs CP5) |
| §34 groupes | PARTIAL | circlesFormed **167** | **PARTIAL** |
| §35 institutions | PARTIAL | inst30d present | **PARTIAL** |
| §36 creed/culture | PARTIAL ; gen NT | creedChanges **567** ; gen2Events **46** ; parentChild **46** ; genDepthMax **2** (s1) | **PARTIAL** (2-gen instrument LIVE ; acceptance incomplete) |
| §37 conflits | PARTIAL | conflicts **843** | **PARTIAL** |
| §38 multi-seed | NOT_TESTED | 3≪10 | **NOT_TESTED** |
| Social §20 | BLOCKED 300→120 | idem | **BLOCKED** |
| Anti-loop (DP10) | NOT_TESTED | varPct min **0.88** ; stuck14d max **0.09** ; secondary min **0.89** | **PARTIAL** (seuils volume/ratio OK ; pas PASS agrege) |
| Miller / grind | GRIND_OPEN_TASK ; peak0 | grindLabel **GRIND_OPEN_TASK** ; millerAlivePeakMax **1** | **DESIGN_DOCUMENTED** (WONTFIX_DESIGN) |
| **GLOBAL (§21)** | NON DECLARE | NON DECLARE | **NON DECLARE** |

---

## 3. Sec.22 per-priority labels

| Priorite | s1 | s3 | s7 | Notes |
|----------|----|----|----|-------|
| memory_decision | PARTIAL | PARTIAL | PARTIAL | CF flips eleves |
| emotion_decision | PARTIAL | PARTIAL | PARTIAL | |
| personality_decision | PARTIAL | PARTIAL | PARTIAL | |
| learning_future | PARTIAL | PARTIAL | PARTIAL | teachTrue>0 |
| family_decision | PARTIAL | PARTIAL | PARTIAL | |
| price_profession | PARTIAL | PARTIAL | PARTIAL | naturel only |
| belief_behavior | PARTIAL | PARTIAL | PARTIAL | |
| relationship_help | PARTIAL | PARTIAL | PARTIAL | cats incl. defend/labor |
| migration_camp | PARTIAL | PARTIAL | PARTIAL | **npc UNDER** (0/3) toutes seeds ; missionFloorsMet=false |

Chaines legacy causality : food/teach/creed/migrate/price/help = **PARTIAL** ×3 (sauf creedCulture **CONNECTION_NOT_PROVEN** seed3).

**Acceptance mission §22 : PAS DE PASS** — instrumentation PARTIAL ≠ floors mission fermes.

---

## 4. Causal flips / teach / profession / migrate / help / seq / creed

| Metrique | Total 3 seeds | Detail |
|----------|---------------|--------|
| memoryCausalFlips | **1731** | s1 1114 / s3 154 / s7 463 |
| emotionCausalFlips | **5432** | 2358 / 2130 / 944 |
| personalityCausalFlips | **2181** | 916 / 878 / 387 |
| teachTrueLaterUses | **223** | 100 / 46 / 77 (proxy debug 1132) |
| profession MF share | **1.0** | 684/684 (attr) ; probe chgt 742 |
| migrate stages | urge92 → attempts49 → leaves16 ; housed3 / homeless13 ; travel13 ; destEval50 ; settle3 ; camps**3** ; rejoin14 ; fail36 | camps = housed path (INC-04) |
| helpByKind | teach 35847, build 225, haul 106, food 26, **defend 18**, **labor 17** | opp defend 135 / taken 18 |
| anti-loop | trackedMax 166 ; var≥0.88 ; stuck14d≤0.09 ; dampApps 204898 | longestSameLoopDays max 31 (farm multi-day OK) |
| creed gen | parentChild **46** ; gen2 **46** ; gen3 **1** (s1) ; depthMax **2** | plus NOT_TESTED court smoke |

---

## 5. Differences entre seeds

| Metrique | Seed 1 | Seed 3 | Seed 7 |
|----------|--------|--------|--------|
| aliveEnd / peak | **139** / 140 | 52 / 101 | 80 / 102 |
| births / deaths | 66 / 1 | 6 / 22 | 21 / 10 |
| decisionsExact | 223855 | 193876 | **247360** |
| leaves / foundCamps | 2 / 0 | 4 / 0 | **10** / **3** |
| labor / defend | 14 / (tot) | 0 | 3 |
| teachTrue | 100 | 46 | 77 |
| memCF / emoCF / persCF | 1114/2358/916 | 154/2130/878 | 463/944/387 |
| creed gen2 | 32 | 1 | 13 |
| edibleTotal | 1119 | 458 | 700 |
| millerAlivePeak | 0 | 0 | **1** |

---

## 6. Regressions vs CP5

| Metrique | CP5 | Phase5 | Delta |
|----------|-----|--------|-------|
| decisionsExact | 650960 | **665091** | +14131 |
| leaves (§33) | **22 PASS** | **16** | **-6 → perte PASS §33** |
| foundCamps | 2 | **3** | +1 |
| teachTrueLaterUses | n/a (proxy only) | **223** | nouvelle preuve |
| mem/emo/pers CF | 0 (tags only) | 1731/5432/2181 | nouvelle preuve |
| help cats | 4 | **6** | +defend+labor |
| creed gen2 | 0 / NT | **46** | instrument LIVE |
| PASS_RATE harness | **10 %** (2/20) | **5 %** (1/20) | regression §33 |
| millerAlivePeak | 0 | 1 | mineur |
| harvest/grind/bake | 2498/835/173 | 2794/850/174 | food chain LIVE (pas de regression) |
| food_chain s7 20j | — | harvest1590 grind2657 bake282 | **LIVE** |

---

## 7. PASS_RATE honnete

Parmi les **20** blocs harness EMERGENCE du soak :

- **PASS = 1** (§28 metiers volume)
- **BLOCKED = 1** (social 300→120)
- **NOT_TESTED = 1** (§38)
- **PARTIAL = 17** (dont §33 migration — etait PASS en CP5)
- **PASS_RATE = 1/20 = 5 %**

PARTIAL / BLOCKED / NOT_TESTED ≠ PASS.  
**GLOBAL reste NON DECLARE.**  
**EMERGENCE PASS agrege : NON.**

---

## 8. Plus gros blocker restant

**Migration leave→camp : floors mission non fermes** — `migration_camp` reste **npc UNDER (0/3)** sur les 3 seeds (meme quand events≥5 sur s7) ; leaves totaux **16 < 20** font perdre le PASS §33 CP5. Sans NPC samples + volume leaves multi-seed, `missionFloorsMet` reste false et §22 ne peut pas monter en acceptance.  
Secondaire structurel : tier social **300 BLOCKED** clamp **120** (ne pas relever).

---

## 9. Verdict

STEP6 soak naturel livre des **preuves causales Phase5** (CF flips, teachTrue, MF professions, help defend/labor, creed gen2, seq anti-loop) sans inventer de PASS mission hors §28 volume.  
Regression honnete : **§33 passe de PASS → PARTIAL**.  
**GLOBAL / EMERGENCE PASS : NON DECLARE.**

---

*Fin PHASE5_CAUSALITY_VALIDATION.md — lien master : `PHASE5_CAUSALITY_MASTER.md`.*