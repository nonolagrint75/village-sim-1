# PHASE 5 — Causalite reelle (MASTER)

**Owner :** AGENT 1 — ORCHESTRATEUR  
**Workspace :** `village_edit`  
**Date :** 2026-09-17  
**Canal de reference CP5 :** EMERGENCE (naturel — aucune famine / profession / CREATE_* induite pour clam PASS)  
**Baseline :** Phase 4 CP5 — `PHASE4_CAUSALITY_VALIDATION.md`, `_phase4_soak_summary.json`  
**Verdict global :** **NON DECLARE** — aucun GLOBAL PASS / EMERGENCE PASS agrege (inchange ; Phase 5 ne le chase pas)

**Objectif unique :** transformer les **PARTIAL** (attribution, volume, instrumentation) en **preuve causale reelle** (contre-factuel / chaines A->B exigibles), **sans** baisser les seuils mission.

Ref. : `PHASE4_CAUSALITY_MASTER.md`, `PHASE4_INCOHERENCE_LOG.md`, `PHASE4_CAUSALITY_VALIDATION.md`, `EMERGENCE_MISSION_MASTER.md`.

---

## 0. Regles absolues (non negociables)

| # | Regle |
|---|--------|
| R1 | **Attribution != causalite.** Tags `mem:` / `emo:` / `pers:` + compteurs CP3 = co-occurrence materielle du facteur, **pas** preuve que le facteur a change le choix. |
| R2 | **Pas de scripting.** Interdit : `if memory -> flee`, `if leave -> createCamp` auto, buffs pour passer le seuil, hardcodes de tache. Les stages leave->camp restent **emergents** (politiques / urge / foyer), pas un teleport camp. |
| R3 | **Pas de baisse de seuils** mission Sec.20-38. PARTIAL / NOT_TESTED / BLOCKED / CONNECTION_NOT_PROVEN != PASS. |
| R4 | **Pas de relever le clamp** `initialVillagers` max=120 (P13 / INC-06). Social START@300 reste **BLOCKED capacite** != FAIL emergence. |
| R5 | **Naturel vs controle separes.** Soak EMERGENCE = path naturel. Probes MECHANISM / choc / contre-factuel = canal **TEST SETTING** documente a part ; jamais melanges dans un score PASS emergence. |
| R6 | **Mesure d abord, fix minimal ensuite.** Un DP qui touche le gameplay doit documenter l hypothese causale + regression farm/mill/brain soft **avant** merge. |
| R7 | **Preserve :** farmer lock, handoff, orphan reclaim, mill bootstrap, softmax + factures, HARD survival floors — intouchables sauf INC causal explicite + regression. |
| R8 | **CODE-ONLY / WIRED != PASS.** Instrumentation sans seuil + preuve = PARTIAL / PENDING. |
| R9 | **PROXY != exact.** PASS decisions = ledger `noteChosenAction` / `decisionExact` uniquement. |
| R10 | **Aucun claim PASS** dans ce document STEP1-2. Plan seulement. |

---

## 1. Scoreboard baseline CP5 (2/20 PASS)

Source : `PHASE4_CAUSALITY_VALIDATION.md` Sec.11 + `_phase4_soak_summary.json`.

| Parametre | Valeur |
|-----------|--------|
| Soak | `100x60x3` seeds **1,3,7** naturel |
| `decisionExact` | **650960** (>=10k) |
| PASS harness | **2/20 = 10 %** — Sec.28 metiers (volume), Sec.33 migration (leaves>=20) |
| BLOCKED | 1 — social 300->120 |
| NOT_TESTED | 1 — Sec.38 (10 seeds) |
| PARTIAL | 16 |
| GLOBAL / EMERGENCE agrege | **NON DECLARE** |

| Systeme | Verdict CP5 | Note Phase 5 |
|---------|-------------|--------------|
| Sec.20 indiv. | PARTIAL | floors OK ; pas PASS agrege |
| Sec.22 A->B | PARTIAL / CNP | coeur Phase 5 |
| Sec.24 perso | PARTIAL | pairs samples != paires prouvees |
| Sec.25 mem | PARTIAL | tags != causalite |
| Sec.26 emo | PARTIAL | idem |
| Sec.27 learn | PARTIAL | laterUses>0 ; %progres NT |
| Sec.28 metiers | **PASS volume** | explainabilite multi-facteur **NOT_TESTED** |
| Sec.30 help | PARTIAL | cats=4 ; defend/labor=0 |
| Sec.32 eco | PARTIAL | choc **NOT_TESTED** |
| Sec.33 mig | **PASS leaves** | leave->camp rare (2) |
| Sec.36 creed | PARTIAL | 2 gen **NOT_TESTED** |
| Anti-loop | NOT_TESTED | |
| Social Sec.20 | BLOCKED capacite | ne pas relever clamp |

---

## 2. STEP1 AUDIT — priorites P1-P13

Legende CURRENT : etat apres CP5. GAP : ecart vs preuve causale exigee. ROOT_CAUSE : hypothese (a falsifier en STEP3). EVIDENCE : pointeurs.

| Pri | Systeme / Sec. | CURRENT (CP5) | GAP | ROOT_CAUSE (hypothese) | EVIDENCE |
|-----|-------------|---------------|-----|------------------------|----------|
| **P1** | Memoire Sec.25 | `memoryAttributed` **20942** ; tags `mem:place` via `SCRATCH_ATTR` + `noteChosenAction` | Volume attribution OK ; **0 contre-factuel** (score avec/sans mem) ; >=20 decisions **causales** non prouvees | Attribution flagge delta materiel / recall, mais le choix soft peut rester identique sans mem -> tag != Delta choix | `decide.ts` `placeMemoryFactor` + tags ~L781 ; `tick.ts` `noteChosenAction` ; soak `attribution.memoryAttributed*` ; VALIDATION Sec.25 |
| **P2** | Emotions Sec.26 | `emotionAttributed` **107680** ; tag `emo:bias` | Idem — pas de contre-factuel emotion -> decision | `emotionsFactor` pose flag si |mult-1|>=Delta ; pas de re-score a emotion gelee | `decide.ts` fillFactorProduct mults[2] ; soak emotionAttributed* ; VALIDATION Sec.26 |
| **P3** | Personnalite Sec.24 | pairSamples **192** ; pairReady **2366** | Samples/ring OK ; **paires appariees completes** (meme kind, traits distants, Delta comportement) non formalisees au bar >=30 | `countPairReady` compte distances traits sur ring ; pas de preuve decisionnelle appariee naturelle | `attributionMetrics.ts` pushPairSample / countPairReady ; soak personalityPair* ; VALIDATION Sec.24 |
| **P4** | Apprentissage Sec.27 | teachCraft starts **40052** ; laterUses 214+235+224 ; skillDelta>0 | Chaine teach->skill->**usage futur** partielle ; **%progres** / NPC distincts au format mission absents | Compteurs causality live ; acceptance format >=30 teach + progres/usage non fermee | soak causality teach* ; VALIDATION Sec.27 / Sec.22 teach PARTIAL x3 |
| **P5** | Metiers Sec.28 explain | **PASS volume** 726 chgt / >=4 metiers / 3 seeds | Explainabilite multi-facteur **>=70% NOT_TESTED** | Ledger whyFactors / profession change n agrege pas pourquoi multi-facteur pour PASS explain | VALIDATION Sec.28 note ; `behaviors` scores metiers ; pas de probe explain>=70% |
| **P6** | Miller coherence INC-02 | grind **835** ; millerPeakAlive **0** ; grindByProfession = farmer/none/forager/... | Alignement metier<->tache opaque ; opaque != forcement bug | **(a)** grind accessible hors profession miller (CONFIRME mesure) ; (b) miller rarement assigne ; (c) flip fin de jour | INC-02 FIXED mesure ; soak grindByProfession s1 ; **ne pas force-spawn miller** |
| **P7** | Migration leave->camp Sec.22/Sec.33 | leaves **22** PASS ; foundCamps **2** (s3 seul) ; migrate CNP s1+s7 | Chaine urge->leave->**foundCamp** multi-seed fragile ; rejoin~leaves | foundCamp seulement si `hasHome`+coords (`politics` leave) ; homeless leave sans camp ; pas de auto-createCamp scripting | `politics.ts` leave+foundMigrateCamp ; `construction.ts` foundMigrateCamp ; INC-04 ; soak migrate* |
| **P8** | Help defend/labor Sec.30 | helpTotal **32494** ; cats **4** (teach/build/haul/food) ; **defend=0 labor=0** x3 | Categories defend/labor mortes malgre wiring INC-03 | defend : record seulement `ageTicks===0 && targetId!=null` ; labor : branchee sur non-`buildProject` aide tiers (chemin rare) | `behaviors.ts` case defend ~5475 ; buildProject help ~4993 ; soak helpEventsByKind |
| **P9** | Economie choc Sec.32 | food chain LIVE ; priceDelta events eleves ; **chaines choc NOT_TESTED** | Choc->decision->offre/demande->prix multi-seed absent | Jamais isole en probe controlee ; soak naturel != test choc | VALIDATION Sec.32 ; sec22 price PARTIAL |
| **P10** | Anti-loop | teachCraft dominant (~40k) ; kinds=30 | Sequences >7j / anti-loop **NOT_TESTED** | Catalogue scores + absence metrique sequence | INC-05 WONTFIX_DOC ; VALIDATION Sec.6 boucles |
| **P11** | Creed / culture 2 gen Sec.36 | creedChanges **907** ; creed followups partiels ; **0 preuve 2 gen** | Instrument + soak long manquants | Followups ratio incomplet ; horizon 60j insuffisant pour 2 gen robuste | sec22 creed CNP x3 ; VALIDATION Sec.36 |
| **P12** | A->B Sec.22 upgrade | sec22Status PARTIAL x3 ; food/teach/price/help PARTIAL ; creed/migrate souvent CNP | Seuils mission formats >=20/15/5/3 NPC/3 seeds **non fermes** en acceptance | Instrumentation+volume != formats exacts ; plusieurs maillons CNP | VALIDATION Sec.3 ; soak causalitySec22BySeed |
| **P13** | Clamp social 120 | START@300 -> **120** BLOCKED | Tier social non demarrable au floor 300 | Capacite config volontaire | INC-06 DOCUMENTÉ ; **SKIP fix** — ne pas relever |

---

## 3. STEP2 PROPOSALS — P1-P12 (P13 skip)

Format : ROOT CAUSE | FIX | FILES | DEPENDENCIES | REGRESSION | TEST

### P1 — Memoire contre-factuelle
- **ROOT CAUSE :** tags `mem:*` comptent contribution materielle, pas Delta argmax/softmax du choix.
- **FIX :** probe MECHANISM : pour N decisions exactes taguees mem, re-score **avec** mem vs **mem gelee / spots ignores** ; compter flips de kind. Fix gameplay **seulement** si contre-factuel montre wiring mort non intentionnel.
- **FILES :** `scripts/_probe_phase5_memory_cf.ts` ; `decide.ts` / `placeMemoryFactor` ; `PHASE5_EVIDENCE_LOG.md`.
- **DEPENDENCIES :** ledger exact CP1 ; pas de dependance P2.
- **REGRESSION :** farm/mill/brain soft inchanges ; pas de forcer flee sur dangerSpot.
- **TEST :** `TEST: P1-mem-cf` / `CHAIN: mem_spot -> DeltaU -> kind_flip|stable` — MECHANISM.

### P2 — Emotion contre-factuelle
- **ROOT CAUSE :** idem pour `emo:bias` / `emotionsFactor`.
- **FIX :** meme patron CF : emotions gelees vs live ; flips >= seuil doc.
- **FILES :** `scripts/_probe_phase5_emotion_cf.ts` ; `decide.ts` emotionsFactor.
- **DEPENDENCIES :** P1 patron reutilisable.
- **REGRESSION :** softmax / HARD floors intacts ; pas de script fear->flee.
- **TEST :** `TEST: P2-emo-cf` / `CHAIN: emotion -> DeltaU -> kind_flip|stable`.

### P3 — Personnalite paires naturelles
- **ROOT CAUSE :** pairReady = distance traits sur ring samples, pas preuve comportementale appariee.
- **FIX :** export paires (meme kind, Delta traits>=bar) + Delta taux choix sur soak **naturel** ; viser >=30 paires documentees.
- **FILES :** harness attribution / probe pair-diff ; `attributionMetrics.ts` (mesure only d abord).
- **DEPENDENCIES :** soak naturel ou dumps CP5.
- **REGRESSION :** ne pas forcer traits / taches pour fabriquer des paires.
- **TEST :** `TEST: P3-pers-pairs-natural` / `CHAIN: trait_dist -> same_kind_rate_delta` — EMERGENCE.

### P4 — Learning teach->skill->future use
- **ROOT CAUSE :** laterUses>0 insuffisant pour acceptance (progres %, NPC, temporalite).
- **FIX :** enrichir compteurs skillDelta post-teach + reuse kind apres delai ; rapport format mission. Fix teach seulement si chaine cassee.
- **FILES :** `causalityMetrics.ts` / probe soak ; event. `interactions` teach.
- **DEPENDENCIES :** P12 formats ; evite faux negatifs INC-07.
- **REGRESSION :** giveFood / mill costs ; farmer lock.
- **TEST :** `TEST: P4-teach-skill-reuse` / `CHAIN: teachCraft -> skillDelta -> laterUse(kind)`.

### P5 — Profession multi-facteur why
- **ROOT CAUSE :** PASS volume Sec.28 sans agregat explain >=70%.
- **FIX :** logger why au changement de profession ; metrique %changements avec >=2 facteurs. Pas de spawn metiers.
- **FILES :** path profession update (`behaviors` / livelihood / politics) + probe.
- **DEPENDENCIES :** ledger whyFactors ; lien P6.
- **REGRESSION :** farmer lock / miller non force.
- **TEST :** `TEST: P5-prof-explain` / `CHAIN: score_vector -> profession_change -> why>=2factors`.

### P6 — Miller coherence (analyse -> fix si non intentionnel)
- **ROOT CAUSE :** grind hors miller est **mesure** ; design possible ou fuite identite metier.
- **FIX :** mesure-first grindStarts x profession x mills x priceUrge. **CONFIRMED INTENTIONAL** -> **WONTFIX_DESIGN** / GRIND_OPEN_TASK. Do **not** force-assign miller.
- **FILES :** analyse script ; event. `behaviors.ts` miller/grind scoring.
- **DEPENDENCIES :** preserve farm/mill ; P5 why utile.
- **REGRESSION :** `_probe_food_chain` seed7 ; harvest/grind/bake LIVE ; farmer lock.
- **TEST :** `TEST: P6-miller-coherence` / `CHAIN: mill_present -> grind_by_prof -> miller_alive?`.

### P7 — Migration leave->camp (stages, no auto createCamp)
- **ROOT CAUSE :** foundCamp gated `hasHome` ; homeless leave -> wander/rejoin ; camp=2.
- **FIX :** analyser stages urge->attempt->leave->(camp|rejoin|wander). Renforcer conditions emergentes si trou non intentionnel ; **interdit** `if leave: createCamp` systematique.
- **FILES :** `politics.ts` leave ; `construction.ts` foundMigrateCamp ; causality migrate.
- **DEPENDENCIES :** telemetrie CP2 ; pas buff leave aveugle.
- **REGRESSION :** rejoins ; pas explosion camps ; stickiness polity.
- **TEST :** `TEST: P7-leave-camp-stages` / `CHAIN: urge->leaveAttempt->leave->foundCamp|rejoin`.

### P8 — Help defend / labor
- **ROOT CAUSE :** wiring present mais predicates d enact rares (defend targetId ; labor!=buildProject).
- **FIX :** tracer defend starts avec targetId et aides projet non-owner hors buildProject. Ajuster mesure/predicat si FN clair — sans defend scripte.
- **FILES :** `behaviors.ts` defend/buildProject ; `interactions` creditRescue ; family helpCounters.
- **DEPENDENCIES :** INC-03 ; cats>=3 a preserver.
- **REGRESSION :** teach/food/build/haul ; giveFood.
- **TEST :** `TEST: P8-help-defend-labor` / `CHAIN: defend_start->recordHelp(defend)` et `aid_project->labor|build`.

### P9 — Economie choc (controle, separe)
- **ROOT CAUSE :** jamais teste hors soak naturel.
- **FIX :** probe **MECHANISM** isole choc stock/prix -> task/prof shift -> prix. Separe du soak EMERGENCE.
- **FILES :** nouveau probe choc ; priceUrge paths `behaviors.ts`.
- **DEPENDENCIES :** food chain LIVE preservee.
- **REGRESSION :** mill bootstrap ; pas CREATE_* pour PASS emergence.
- **TEST :** `TEST: P9-eco-shock-controlled` / `CHAIN: shock->decision->supply/demand->price` — MECHANISM only.

### P10 — Anti-loop sequences
- **ROOT CAUSE :** dominance teachCraft sans metrique sequence >7j.
- **FIX :** instrumenter runs de kind ; rapport entropy. Fix catalogue seulement si loop pathologique prouvee.
- **FILES :** probe anti-loop ; event. soft anti-repeat WP8.
- **DEPENDENCIES :** diversite Sec.23 (30 kinds).
- **REGRESSION :** ne pas casser teach volume utile a P4.
- **TEST :** `TEST: P10-antiloop` / `CHAIN: kind_run_length->break_or_persist` (>7j).

### P11 — Creed 2 generations
- **ROOT CAUSE :** followups partiels ; pas d instrument parent->enfant creed ; label `npcs=0` forcant CNP.
- **FIX (DONE CODE) :** instrument parent→child a `markCreedChange` (spread/crystallize/shrine) + child behavior followup ; `creedNpcCount` pour label peer ; soak long plus tard pour gen>0.
- **FILES :** `causalityMetrics.ts`, `politics.ts`, `religion.ts`, `societyMetrics.ts`, adapters, probe.
- **DEPENDENCIES :** familles/births ; soak >60j ulterieur.
- **REGRESSION :** pas d induire creed / CREATE_CREED pour PASS.
- **TEST :** `TEST: P11-creed-2gen-instrument` / `CHAIN: parent_creed->child_acquire->child_behavior`.

### P12 — Upgrade preuves A->B Sec.22
- **ROOT CAUSE :** PARTIAL harness != formats mission (NPC/seeds/seuils).
- **FIX (DONE CODE) :** `sec22Evidence.ts` per-priority CHAIN blocks + floors ≥20/≥15/≥5/≥3NPC/≥3seeds ; help/family/migrate NPC samples ; labels honest ; jamais PASS sans soak.
- **FILES :** `sec22Evidence.ts`, `causalityMetrics.ts`, `decide.ts`, adapters, `_probe_phase5_sec22_formats.ts`.
- **DEPENDENCIES :** P1-P11 preuves.
- **REGRESSION :** ne pas relacher CONNECTION_NOT_PROVEN -> PASS.
- **TEST :** `TEST: P12-sec22-formats` / `CHAIN: per-chain floors NPC x seeds`.

### P13 — Clamp (SKIP)
- **ROOT CAUSE :** capacite volontaire.
- **FIX :** **aucun.** Documenter BLOCKED.
- **TEST :** N/A

---

## 4. Work packages ordonnes DP1-DP12 (+ soak)

Ordre STEP3 (document only — **pas d implementation ce tour**) :

| DP | Contenu | Nature | Sortie attendue |
|----|---------|--------|-----------------|
| **DP1** | Memoire CF (score avant/apres mem) | MECHANISM mesure | **DONE CODE** ; acceptance **PENDING** (smoke flips>0) |
| **DP2** | Emotion CF | MECHANISM measure | **DONE CODE**; acceptance **PENDING** |
|  EVIDENCE measure | **DONE CODE**; acceptance **PENDING**
| **DP4** | teach->skill->future use | Mesure (+fix si casse) | **DONE CODE** ; acceptance **PENDING** |
| **DP5** | Profession multi-factor why log | Mesure/instrument | Evidence P5 explain |
| **DP6** | Miller coherence (GRIND_OPEN_TASK) | Doc+metrics (no miller spawn) | **DONE** / **DESIGN_DOCUMENTED** / WONTFIX_DESIGN |
| **DP7** | Migration leave->camp stages (**no** auto createCamp) | Mesure stages + design doc | **DONE CODE** ; acceptance **PENDING** |
| **DP8** | Help defend/labor chain | Labor category fix + defend opp/taken | **DONE CODE** ; acceptance **PENDING** (labor>0 smoke; defend rare) |
| **DP9** | Economy shock controlled probe | MECHANISM **separe** | **DONE CODE** ; acceptance natural §32 **PENDING** |
| **DP10** | Anti-loop sequences | Mesure + light teach/social damp | **DONE CODE** ; acceptance **PENDING** (30d soak) |
| **DP11** | Creed 2-gen instrument (soak long later) | Instrument | **DONE CODE** ; acceptance **PENDING** (short smoke gen=0 NOT_TESTED; peer npc fix → PARTIAL) |
| **DP12** | A->B evidence upgrade | Rapport/harness | **DONE CODE** ; acceptance **PENDING** (floors labeled; soak next) |
| **Soak** | Re-soak `100x60x3` compare CP5 | EMERGENCE | Delta metrics ; **pas** claim GLOBAL PASS |

Principe : **mesure / preuve causale d abord -> correctif minimal -> soak compare**.

---

## 5. Preserves farm / mill / brain soft / farmer lock

Checklist obligatoire avant tout fix DP6/P8/P7 gameplay :

- [ ] harvest / sow / grind / bake LIVE (probe food chain seed7)
- [ ] farmer lock + handoff + orphan reclaim intacts
- [ ] mill bootstrap + priceUrge non casses
- [ ] softmax + factures + HARD survival floors
- [ ] aucun CREATE_* / famine induite dans canal EMERGENCE soak
- [ ] aucun raise clamp 120

---

## 6. Statut phase & prochains pas

| Element | Statut |
|---------|--------|
| STEP1 audit | **DONE** |
| STEP2 proposals | **DONE** |
| STEP3 DP1–DP12 | **DONE CODE** (DP6 DESIGN_DOCUMENTED) ; acceptance via STEP6 |
| STEP6 soak 100×60×3 | **DONE** (`_probe_phase5_causality_soak.ts`) |
| STEP7 validation | **DONE** (`PHASE5_CAUSALITY_VALIDATION.md`) |
| PASS_RATE harness | **5 %** (1/20 = §28) — §33 **PARTIAL** (leaves 16 ; regression vs CP5 10%) |
| GLOBAL / EMERGENCE PASS | **NON DECLARE** (non chase) |

**Next :** migration_camp npc floors + leaves volume (sans raise clamp / induce) ; ne pas chase GLOBAL PASS.

---

*Fin PHASE5_CAUSALITY_MASTER.md — Orchestrateur — STEP6–7 DONE ; GLOBAL NON DECLARE.*
