# PHASE 4 — Validation causalite (re-mesure CP5)

**Workspace :** `village_edit`  
**Date :** 2026-09-17  
**Canal :** EMERGENCE (naturel — aucune famine / profession / CREATE_* induite)  
**Checkpoint :** **CP5 DONE** (re-soak + rapport)  
**Verdict global :** **NON DECLARE** — **aucun GLOBAL PASS / aucun EMERGENCE PASS agrege**

Preuves : `_phase4_soak_s{1,3,7}.json`, `_phase4_soak_summary.json`, `_phase4_soak_run.txt`, script `scripts/_probe_phase4_causality_soak.ts`.

---

## 1. Parametres exacts

| Parametre | Valeur |
|-----------|--------|
| Commande | `npx tsx scripts/_probe_phase4_causality_soak.ts 60 1,3,7` |
| Seeds | **1, 3, 7** (>=3) |
| Jours | **60** (>=60) |
| Config | `createSimulation(seed, { initialVillagers: 100, maxPopulation: 250, preset: 'standard', worldSize: 1000 })` |
| Pop depart (mesuree) | **100** / seed |
| Peak pop | **119** (seed 1) |
| Systemes | `stepSimulation` seul — path naturel |
| Decisions | **Exact** = ledger CP1 `decisionExact` (`chooseTask`/`HARD`/`setTask`/`other` via `noteChosenAction`) ; **PROXY** = deltas `task.kind` (ignore pour PASS) |
| Mesures CP5 | causalityCounters (CP2) ; attributionCounters (CP3) ; foodStock type/count + edibleTotal (INC-01) ; grindByProfession / millerPeak (INC-02) ; help cats (INC-03) ; leaves/foundCamps (INC-04) |
| Duree run | ~6,1 min (seed1 130s, seed3 123s, seed7 108s) ; NODE `--max-old-space-size=8192` |
| Crashes / OOM | **aucun** (3/3 ok) |

### scalePolicy (confirme avant soak)

| Tier | Statut | Chiffres |
|------|--------|----------|
| Individuel START@100 | **READY** | floor 100 ; resolved initial=100 maxPop=250 ; clamp `initialVillagers` **4..120** |
| Social START@300 | **BLOCKED capacite** | demande **300** → clampe **120** ; clamp max=**120** ; **≠ FAIL emergence** ; **ne pas relever le clamp** |

---

## 2. Resultats par systeme (seuils mission §§20–38)

Legende : **PASS** seulement avec preuve aux seuils ; sinon PARTIAL / NOT_TESTED / FAIL / BLOCKED / CONNECTION_NOT_PROVEN. **Aucun CODE-ONLY → PASS.** PROXY ≠ exact.

| Systeme | Seuil cle | Observe (3 seeds) | Verdict |
|---------|-----------|-------------------|---------|
| §20 echelle indiv. | 100 / 60j / 3 seeds / **10k decisions exactes** | 100 / 60 / 3 ; **exact=650 960** (PROXY=200 240 ignore) | **PARTIAL** (floors atteints ; PASS agrege refuse) |
| Survie | pop vivante fin | aliveEnd 118 / 65 / 53 ; deaths 11 / 11 / 28 | **PARTIAL** (tous vivants ; attrition s3/s7) |
| §22 connexions A→B | ≥20/15/5/3 NPC/3 seeds | sec22Status=**PARTIAL** ×3 ; food/teach/price/help PARTIAL ; creed **CONNECTION_NOT_PROVEN** ×3 ; migrate PARTIAL s3 / **CONNECTION_NOT_PROVEN** s1+s7 | **PARTIAL** (instrumentation + volume ; **pas** acceptance PASS mission) |
| §23 diversite | ≥5 TaskKinds | 30 / 30 / 30 kinds | **PARTIAL** |
| §24 personnalite | ≥30 paires | personalityPairSamples **192** (64/seed) ; pairReady 2366 | **PARTIAL** (samples ≥30 ; paires appariees completes non prouvees) |
| §25 memoire | ≥20 decisions causales | memoryAttributed **20 942** (npcs max 103) | **PARTIAL** (tags attribution ; preuve causale complete PENDING) |
| §26 emotions | ≥15 attributions | emotionAttributed **107 680** | **PARTIAL** (idem) |
| §27 apprentissage | teach≥30 + progres/usage | teachCraft starts **40 052** ; teachLaterUses causality 214+235+224 | **PARTIAL** (volume + laterUses>0 ; %progres absent) |
| §28 metiers | ≥20 chgt, ≥10 NPC, ≥4 metiers, 3 seeds | **726** chgt ; metiers none/farmer/forager/lumberjack/miner/builder(+fisher/trader s7) | **PASS** (seuils volume harness) — explainabilite multi-facteur ≥70% **toujours NOT_TESTED** |
| §29 familles | ≥30 fam, ≥20 naissances | fam 31/32/19 ; births **60+10+13=83** | **PARTIAL** (s7 fam<30) |
| §30 entraide | ≥50 aides, ≥3 categories | helpTotal **32 494** ; cats **4**/seed (teach/build/haul/food) | **PARTIAL** (seuils volume+cats atteints ; helpers/helped non mesures) |
| §31 construction | ≥30 builds | houses 65+16+18 ; mills 2+2+4 | **PARTIAL** (proxy houses+mills) |
| §32 economie | tx/prix/chaines choc | harvest **2498**, grind **835**, bake **173** ; edibleSum **2123** ; chaines choc **non prouvees** | **PARTIAL** / chaines choc **NOT_TESTED** |
| §33 migration | ≥20 leaves | leaves **22** (4+8+10) ; rejoins 20 ; foundCamps **2** (s3) | **PASS** (leaves≥20) — leave→camp encore rare |
| §34 groupes | ≥20 formes | circlesFormed **168** | **PARTIAL** |
| §35 institutions | ≥10 / ≥5 @30j | inst30d 47/40/38 | **PARTIAL** |
| §36 creed/culture | Δcroyances≥10 ; 2 gen | creedChanges **907** ; **0 preuve 2 gen** | **PARTIAL** / gen **NOT_TESTED** |
| §37 conflits | ≥20 ; ≥5 causes | conflicts **922** | **PARTIAL** |
| §38 multi-seed | ≥10 seeds | **3** seeds | **NOT_TESTED** |
| Social §20 | 300×120×10 | **BLOCKED capacite** 300→120 | **BLOCKED** (≠ FAIL) |

---

## 3. Connexions A→B

Chiffres reels (somme / labels par seed) :

| Chaine | Compteurs (totaux approx.) | Labels s1 / s3 / s7 | Verdict |
|--------|----------------------------|---------------------|---------|
| food harvest→grind/bake→eat | harvestProd 1185+323+761 ; grind 44+112+144 ; bake 41+86+134 ; eat 2555+1992+1700 ; npcs 144/109/110 | PARTIAL ×3 | **PARTIAL** (pas PASS seuils mission formats ≥20/15/5 formalises hors probe) |
| teach→skill→laterUse | events 10976+14549+6723 ; skill 1050+770+645 ; later 214+235+224 | PARTIAL ×3 | **PARTIAL** |
| creed→followup | followups presents mais ratio incomplet au bar | CONNECTION_NOT_PROVEN ×3 | **CONNECTION_NOT_PROVEN** |
| migrate urge→leave→foundCamp | leaves 4+8+10 ; foundCamps **0+2+0** | CNP / PARTIAL / CNP | **CONNECTION_NOT_PROVEN** (sauf s3 PARTIAL avec 2 camps) |
| priceΔ→task/prof shift | price PARTIAL ×3 | PARTIAL ×3 | **PARTIAL** |
| help→outcome | help events/outcomes live ; cats 4 | PARTIAL ×3 | **PARTIAL** |

**Verdict §22 acceptance mission : PAS DE PASS** — harness `sec22Status=PARTIAL` (instrumentation + volume). Plusieurs maillons restent **CONNECTION_NOT_PROVEN**.

---

## 4. Chaines causales reelles observees

1. Moisson → mouture → cuisson → consommation (causality food PARTIAL, 3 seeds ; edible fin >0).
2. teachCraft → skillChange → laterUse (laterUses>200/seed).
3. Naissances seed1 (60) → peak 119 → fin 118.
4. Migration : urge/attempts → leaves **22** ; **foundCamps=2** uniquement seed3 (leave→camp partiel).
5. Help multi-categorie : teach + build + haul + food (defend/labor=0).
6. Attribution mem/emo/pers tags sur decisions exactes (volumes eleves).
7. Profession churn 726 entre ≥6 metiers (millerPeakAlive toujours **0**).

**Pas** de chaine choc→decision→offre/demande→prix multi-seed prouvee au bar mission.  
**Pas** de preuve 2 generations creed/culture.

---

## 5. Differences entre seeds

| Metrique | Seed 1 | Seed 3 | Seed 7 |
|----------|--------|--------|--------|
| aliveEnd | **118** | 65 | 53 |
| peak | **119** | 103 | 101 |
| births / deaths | 60 / 11 | 10 / 11 | 13 / 28 |
| decisionsExact | 226 496 | 219 371 | 205 093 |
| leaves / foundCamps | 4 / **0** | 8 / **2** | **10** / 0 |
| edibleTotal | **1107** | 553 | 463 |
| help cats | 4 | 4 | 4 |
| houses / mills | **65** / 2 | 16 / 2 | 18 / 4 |
| harvest / grind / bake | 1028/215/43 | 441/250/55 | 1029/370/75 |
| sec22 | PARTIAL | PARTIAL | PARTIAL |
| migrate chain | CONNECTION_NOT_PROVEN | **PARTIAL** | CONNECTION_NOT_PROVEN |

Seed1 = trajectoire fertile ; 3/7 = attrition. Divergence reelle, mais **§38 exige 10 seeds**.

---

## 6. Boucles comportementales

- **teachCraft** reste dominant (starts ~40k) mais help cats hors teach (build/haul/food) maintenant visibles.
- **flee/fight** pression sur s3/s7 (deaths eleves s7) sans preuve resolution durable.
- Grind sans miller stable (millerPeak=0 ; grindByProfession = farmer/none/forager…).
- Anti-loop / sequences >7j : **NOT_TESTED**.

---

## 7. Encore isole

- Explainabilite metiers multi-facteur ≥70% (§28 reste)
- Paires personnalite appariees completes (§24)
- Preuve causale memoire/emotion au-dela des tags (§25/§26)
- Chaines eco choc→prix→job (§32)
- leave→foundCamp volume (2≪ besoin multi-seed robuste)
- Tier social 300 (§20 social) — **BLOCKED capacite**
- Matrix 10 seeds (§38)
- Culture 2 gen / politique isolee

---

## 8. Bugs trouves (nouveaux seulement — non corriges cette passe)

1. **millerPeakAlive = 0** sur 3 seeds malgre grindStarts eleves — INC-02 reporting confirme grind hors metier miller ; pas un nouveau crash.
2. **foundCamps rare** (2 total, seed3 seul) — leave encore souvent sans camp (INC-04 partiellement mitige).
3. **defend/labor help = 0** — cats≥3 OK via teach/build/haul/food ; categories defend/labor toujours mortes.
4. **Aucun crash/OOM** — pas d'INC crash cette passe.

*(Bugs Phase3 mesure stock=0 et help mono-teach : **corriges en mesure/wiring** — edible>0, cats=4 ; ne pas les re-lister comme nouveaux.)*

---

## 9. Regressions vs Phase 3

| Metrique | Phase 3 | Phase 4 CP5 | Delta |
|----------|---------|-------------|-------|
| decisionsExact | **0** (PROXY only) | **650 960** | +ledger CP1 |
| leaves | 13 | **22** | +9 (≥20) |
| foundCamps | 0 | **2** | +2 |
| edibleTotal sum | 0 (mesure cassee) | **2123** | mesure INC-01 |
| help cats max | 1–2 | **4** | INC-03 |
| millerPeak | 0 | 0 | inchange |
| aliveEnd s1/s3/s7 | 106/59/52 | 118/65/53 | survie comparable / legerement mieux s1 |
| harvest/grind/bake | 2420/921/222 | 2498/835/173 | food chain LIVE (pas de regression farm/mill evidente) |
| PASS_RATE | 0 % | **10 %** (2/20 blocs harness) | metiers+migration |

---

## 10. Scorecard complet

| Systeme | Statut Phase 4 CP5 | Preuve |
|---------|-------------------|--------|
| Survie | PARTIAL | dumps s1/s3/s7 |
| Besoins | CODE-ONLY / NOT_TESTED | non isole soak |
| Memoire | PARTIAL | attr 20 942 |
| Emotions | PARTIAL | attr 107 680 |
| Personnalite | PARTIAL | pairs 192 |
| Objectifs / decision | PARTIAL | exact 650 960 (≥10k) |
| Metiers | **PASS** (volume) | 726 chgt / ≥4 metiers / 3 seeds |
| Apprentissage | PARTIAL | teach 40k + laterUses |
| Familles | PARTIAL | fam/births inegaux |
| Entraide | PARTIAL | help 32k ; cats 4 |
| Construction | PARTIAL | houses+mills |
| Economie / commerce | PARTIAL | food chain ; choc NT |
| Migration | **PASS** | leaves 22≥20 ; foundCamps 2 |
| Groupes | PARTIAL | circlesFormed 168 |
| Institutions | PARTIAL | living ≥30j |
| Religion / creed | PARTIAL | 907 Δ ; gen NT |
| Culture | NOT_TESTED | 2 gen absent |
| Politique | NOT_TESTED | non isole |
| Conflits | PARTIAL | 922 |
| Transmission | PARTIAL | teach + laterUses |
| Emergence §22 | PARTIAL | sec22 PARTIAL ; CNP creed/migrate |
| Multi-seed §38 | NOT_TESTED | 3≪10 |
| Social §20 | **BLOCKED capacite** | 300→**120** |
| **GLOBAL (§21)** | **NON DECLARE** | voir §11 |

---

## 11. Verdict honnete + PASS_RATE

**GLOBAL PASS : NON.**  
**EMERGENCE PASS (agrege) : NON.**

- Plancher pop/jours/seeds **atteint** (100 / 60 / 3).
- Plancher **decisions exactes ≥10 000 : ATTEINT** (650 960) — harness peut desormais etiquter des PASS **systemiques** merites ; **refuse** toujours un PASS agrege / GLOBAL sans preuves completes.
- **PASS systemiques merites :** §28 metiers (volume), §33 migration (leaves≥20).
- §22 reste **PARTIAL** / plusieurs **CONNECTION_NOT_PROVEN**.
- Tier social **300×120j×10 seeds** : **BLOCKED capacite** — **ne pas relever le clamp**.

### PASS_RATE

Parmi les **20** blocs harness EMERGENCE du soak :

- **PASS = 2** (§28, §33)
- **BLOCKED = 1** (social 300)
- **NOT_TESTED = 1** (§38)
- **PARTIAL = 16**
- **PASS_RATE = 2/20 = 10 %**

PARTIAL / BLOCKED / NOT_TESTED ≠ PASS. **GLOBAL reste NON DECLARE.**

**Conclusion :** CP5 a **re-mesure** le soak naturel avec ledger exact + causalite + attribution + correctifs INC-01..04. Des PASS locaux sont **gagnes** (metiers volume, migration leaves). L'autonomie emergente globale au bar mission reste **non prouvee**.

---

*Fin PHASE4_CAUSALITY_VALIDATION.md — lien master : `PHASE4_CAUSALITY_MASTER.md`.*