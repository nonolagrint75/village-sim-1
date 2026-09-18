# PHASE 4 — Causalité (MASTER)

**Owner :** AGENT 1 — ORCHESTRATEUR  
**Workspace :** `village_edit`  
**Date :** 2026-09-17  
**Canal :** EMERGENCE (naturel — aucune famine / profession / CREATE_* induite pour claim PASS)  
**Verdict global :** **NON DÉCLARÉ** — **aucun GLOBAL PASS / aucun EMERGENCE PASS**

**Objectif unique :**  
**MESURER → PROUVER LA CAUSALITÉ → TROUVER LES INCOHÉRENCES → CORRIGER → RE-MESURER.**  
**PAS** d'ajout de nouveaux systèmes. **PAS** de faux GLOBAL PASS.

Réf. : `PHASE3_EMERGENCE_VALIDATION.md`, `_phase3_soak_summary.json`, `GLOBAL_INTEGRATION_PLAN.md`, analyses A2/A6/A8/A10, `EMERGENCE_MISSION_MASTER.md`.

---

## 0. Règles absolues (non négociables)

| # | Règle |
|---|--------|
| R1 | **CODE-ONLY ≠ PASS** — wiring sans soak aux seuils = CODE-ONLY / NOT_TESTED. |
| R2 | **PROXY ≠ décision exacte** — deltas `task.kind` / présence `lastFactorWhy` ≠ ledger `chooseTask`/`setTask`/`noteChosenAction`. |
| R3 | **Corrélation ≠ causalité** — starts co-occurrents (ex. teach↔help) ≠ chaîne A→B prouvée. |
| R4 | **Induced ≠ émergence** — toute induction = canal MECHANISM / TEST SETUP ; jamais score EMERGENCE. |
| R5 | **Volume ≠ intelligence** — teachCraft 40k / help 31k / PROXY 197k ≠ PASS §20–27. |
| R6 | **Ne jamais baisser les seuils** mission §§20–43. |
| R7 | **Ne jamais supprimer / masquer** un compteur qui « fait moche ». |
| R8 | **Instrumenter avant de « fixer le gameplay »** — sauf bug bloquant crash/OOM (aucun en P3). |
| R9 | **Documenter avant de corriger** toute incohérence → `PHASE4_INCOHERENCE_LOG.md`. |
| R10 | **Préserve farm / mill / brain soft** — farmer lock, handoff, orphan reclaim, mill bootstrap, softmax 9 facteurs, HARD survival floors : intouchables sauf CP explicite + régression. |
| R11 | **Clamp social 120** — START@300 reste **BLOCKED capacité** ; **ne pas relever** le clamp. |
| R12 | **Gate PASS émergence** : aucun EMERGENCE PASS / GLOBAL PASS sans **décisions exactes ≥10 000** + planchers pop/jours/seeds + preuves aux seuils. PROXY seul → PASS refusé. |

---

## 1. Faits Phase 3 qui pilotent le plan

Preuves fraîches (mtime ~2026-09-17 02:13–02:19) : `_phase3_soak_s{1,3,7}.json`, `_phase3_soak_summary.json`, `_phase3_soak_run.txt`, `PHASE3_EMERGENCE_VALIDATION.md`.

| Fait | Chiffre / statut | Conséquence Phase 4 |
|------|------------------|---------------------|
| Soak naturel | 100×60×3 (seeds 1,3,7) exécuté, 0 crash | Re-soak CP5 = même barre minimale |
| PASS_RATE | **0 %** | Aucun système PASS |
| Décisions | PROXY **197 869** ; exact **0** | **CP1** bloque §20 PASS |
| §22 A→B | **NOT_TESTED** (pas d'instrument) | **CP2** |
| Personnalité / mémoire / émotion | **NOT_TESTED** causalité | **CP3** |
| leaves / foundCamps | **FIXED leave→camp** (secession) ; leaves volume ≪20 → CP5 | CP4/CP5 |
| help cats | **FIXED wiring** defend/build/haul (+food/teach existants) | CP4 |
| foodStock fin | **FIXED mesure** (Slot type/count ; edibleTotal) | CP4 |
| miller fin | **FIXED reporting** grindByProfession (grind sans miller OK) | CP4 |
| Social §20 | **BLOCKED** 300→120 | Hors scope « fake PASS » ; laisser BLOCKED |
| Survives | s1 fertile ; s3/s7 attrition | Divergence réelle ; pas PASS |

### Lacunes causalité (A2 / A6 / A8 / A10 — synthèse)

- **A8 P0 :** pas de compteur décision exacte ; whyFactors non retenus pour soak ; memory-use / emotion-influence absents.
- **A2 :** personnalité/mémoire/émotion multiplient soft path (wiring) mais **pas** de preuve counterfactual / attribution soak ; drift trop faible.
- **A6 :** urge migration ≠ leave ; leave ≠ foundCamp ; induced historiques ≠ émergence.
- **A10 :** PASS legacy / induced / volume = faux candidats ; decisions ≥10k absentes → §§23–27 fictionnels.

---

## 2. Work packages CP1…CP5 (ordre strict)

```text
CP1 exact decision ledger
  → CP2 A→B causality counters (§22)
  → CP3 memory / emotion / personality attribution probes
  → CP4 document THEN fix incoherences that break causality
  → CP5 re-soak 100×60×3 natural + PHASE4_CAUSALITY_VALIDATION.md
```

**Règle d'ordonnancement :** un CP suivant ne démarre le **fix gameplay** qu'après mesure du précédent (sauf hooks purement additifs de CP1–3).  
**Cette session orchestrateur :** plan docs only — **aucune** mutation sim jusqu'à assignation explicite d'un CP.

---

### CP1 — Ledger décisions exactes (MESURE D'ABORD)

| | |
|--|--|
| **Goal** | Remplacer PROXY par un ledger d'événements décision exacts pour débloquer le plancher §20 (≥10 000) **en mesure**, sans changer les scores. |
| **Hooks minimaux** | `behaviors.ts` : `chooseTask`, `setTask` ; `cognition/tick.ts` : `noteChosenAction` (+ chemins HARD qui appellent déjà `noteChosenAction` / assign). Compter **chaque** assignation soft **et** HARD. |
| **Payload minimal / event** | `seed`, `tick`/`day`, `villagerId`, `kind`, `source` ∈ {`chooseTask`,`HARD`,`setTask`}, `whyFactors[]` (copie courte), optionnel `prevKind`. |
| **Interdit** | Modifier softmax, floors HARD, farmer lock, yields, clamp pop. |
| **Fichiers probables** | `behaviors.ts`, `cognition/tick.ts`, collectors `scripts/harness/**` ou probe Phase 4 dédiée ; **pas** `_behaviors_full_wt.ts` (miroir). |
| **Deps** | Aucune |
| **Risque farm/mill/brain soft** | **Nul→très faible** si compteurs / ring buffer debug only |
| **Acceptance mesure** | Soak court smoke (≥1 seed, ≥5j) : `decisionsExact > 0` ; PROXY peut coexister mais **PASS n'utilise que exact**. Harness refuse PASS si `decisionsExact < 10000` sur suite §20. |
| **Statut** | **DONE (CODE wired)** |

---

### CP2 — Compteurs causalité A→B (§22)

| | |
|--|--|
| **Goal** | Instrumenter des chaînes « A produit → B consomme / réagit → conséquence » au format mission, pas de log archaeology. |
| **Format §22 (seuils Phase 3 / A8)** | Preuves multi-seed avec planchers du type **≥20 / ≥15 / ≥5** événements de chaîne selon classe, **≥3 NPC** distincts contributeurs, **≥3 seeds** — détail exact aligné `EMERGENCE_MISSION_MASTER` / catalogue A8 à reporter dans le probe. Toute chaîne incomplete = `CONNECTION_NOT_PROVEN` / NOT_TESTED, **pas** PASS. |
| **Candidats chaînes (priorité mesure)** | (1) harvest→grind→bake→eat/stock ; (2) teachCraft→skillΔ→réutilisation kind ; (3) creedChange→followup task ; (4) migrateUrge→leaveAttempt→leave→foundCamp ; (5) priceΔ→profession/task shift ; (6) help_* catégorie→outcome. |
| **Interdit** | Forcer CREATE_* / induire famine pour fabriquer les compteurs émergence. |
| **Deps** | **CP1** (décision exacte comme ancre temporelle A→B) |
| **Risque** | Faible (compteurs) ; moyen si on touche commerce/careers |
| **Acceptance** | Compteurs non-nuls **ou** zéros honnêtes documentés ; §22 reste NOT_TESTED jusqu'aux seuils. |
| **Statut** | **DONE (CODE wired)** — acceptance PENDING |

---

### CP3 — Probes attribution mémoire / émotion / personnalité

| | |
|--|--|
| **Goal** | Compter les décisions où mémoire, émotion ou personnalité **ont changé le choix** (attribution), pas seulement « champs existent ». |
| **Probes** | §25 : recall / bias mémoire appliqué → décision (ex. `reinforceRecall` / spot bias / why tag `mem:*`) ≥20 causales. §26 : modificateur émotion matériel → décision (tag `emo:*`) ≥15. §24 : ≥30 paires appariées (traits proches, contextes comparables) avec Δ comportement mesuré. |
| **Deps** | **CP1** (ledger + whyFactors retenus) ; idéal après amorçage **CP2** |
| **Risque brain soft** | Faible si tags/compteurs only ; **interdit** de renforcer artificiellement le drift pour « passer » |
| **Acceptance** | Compteurs d'attribution exposés dans dump Phase 4 ; PASS seulement aux seuils — sinon NOT_TESTED / PARTIAL. |
| **Statut** | **DONE (CODE wired)** — acceptance **PENDING** |

---

### CP4 — Incohérences : DOCUMENTER puis CORRIGER

| | |
|--|--|
| **Goal** | Traiter uniquement les bugs qui **cassent la causalité mesurable** ou rendent les seuils structurellement inatteignables — après entrée dans `PHASE4_INCOHERENCE_LOG.md`. |
| **File d'attente initiale (issus P3, non fixés)** | voir §3 ci-dessous |
| **Ordre** | (1) reproduire + documenter ; (2) hypothèse causale ; (3) fix minimal ; (4) smoke régression farm/mill ; (5) ne re-claim PASS qu'après CP5. |
| **Deps** | Au moins **CP1** live (idéalement CP2) pour savoir si le fix change vraiment les chaînes |
| **Interdit** | Buff leave « pour atteindre 20 » sans preuve d'enactment ; relever clamp 120 ; baisser seuils ; supprimer compteurs. |
| **Statut** | **PARTIAL** - INC-01/02/03/04 traites ; INC-05/07 WONTFIX_DOC ; INC-06 DOCUMENTED ; volume leaves/soak -> CP5 |

---

### CP5 — Re-soak + rapport de validation

| | |
|--|--|
| **Goal** | Rejouer **100×60×3** naturel (seeds **1,3,7** minimum) avec ledger exact + compteurs CP2/CP3 ; produire `PHASE4_CAUSALITY_VALIDATION.md`. |
| **Commande cible** | Probe Phase 4 (dérivée `_probe_phase3_emergence_soak.ts`) — mêmes floors ; champs `decisionsExact`, chaînes A→B, attributions. |
| **Livrables** | dumps `_phase4_soak_s{1,3,7}.json`, `_phase4_soak_summary.json`, run log, validation MD |
| **Verdict attendu (hypothèse orchestrateur)** | GLOBAL / EMERGENCE **toujours NON DÉCLARÉ** tant que seuils non atteints — même si exact>0. **PASS_RATE** recalculé honnêtement ; peut rester 0 %. |
| **Deps** | CP1 obligatoire ; CP2–CP4 selon avancement |
| **Statut** | **PLANNED** |

---

## 3. Backlog incohérences (entrée CP4 — doc-before-fix)

| ID | Symptôme P3 | Hypothèse | Impact causalité | Priorité |
|----|-------------|-----------|------------------|----------|
| INC-01 | `foodStock` fin de run = 0 malgré harvest/grind/bake | Snapshot probe lit mauvais agrégat (village vs bag/pantry/terrain) **ou** consommation totale | Empêche preuve stock→comportement §32 | P0 mesure |
| INC-02 | `miller` = 0 / grindStarts élevés | Grind sans profession miller (tâche ≠ métier) | Chaîne métier↔production opaque §28 | P1 |
| help cats | **FIXED wiring** defend/build/haul (+food/teach existants) | CP4 |
| INC-04 | leaves 13≪20 ; foundCamps 0 | Urge/attempt sans enactment camp | §22 migrate + §33 | P1 (télémetrie d'abord) |
| INC-05 | Dominance teachCraft / socialise | Anti-loop insuffisant / catalogue biaisé | Masque diversité §23 (mesure ≠ nerf yield) | P2 mesure |
| INC-06 | Social START@300 clampe 120 | Capacité config | BLOCKED ≠ FAIL ; **pas de fix clamp** en P4 | Documenté only |

Tout nouvel item découvert en mesure → append `PHASE4_INCOHERENCE_LOG.md` **avant** PR de fix.

---

## 4. Matrice de conflits / préserve farm–mill–brain soft

| Conflit potentiel | Parties | Risque | Arbitrage Phase 4 |
|-------------------|---------|--------|-------------------|
| Hooks dans `chooseTask`/`setTask` | CP1 vs perf 100 NPC | Coût CPU / alloc | Ring buffer borné ; agrégats ; pas de JSON par tick en prod |
| Tags whyFactors étendus | CP1–3 vs brain soft | Changer scores | **Lecture seule** des facteurs existants ; pas de rewrite softmax |
| Fix help catégories | CP4 vs family/WP6 | Régression giveFood / mill costs | Readers + `recordHelp` only ; régression `_probe_food_chain` seed7 |
| Fix migration / foundCamp | CP4 vs stickiness polity | Polities fragiles | Télémetrie CP2 d'abord ; pas buff leave aveugle |
| Fix miller sync | CP4 vs careers WP5 | Farmer lock / demand | **Préserve** farmer lock, handoff, orphan reclaim ; pas forcer miller |
| Fix stock snapshot | CP4 vs éco | Fausse famine | Corriger **mesure** avant de conclure famine |
| Édition parallèle `behaviors.ts` | agents multiples | Merge thrash | **Un intégrateur à la fois** (lock orchestrateur) |
| Softening night HARD / crisis findNearest | A2 legacy | Survie / farm nuit | **Différé** — hors P4 unless INC causale prouvée |
| Clamp 120 vs §20 social | config vs mission | Fake PASS | **BLOCKED** documenté ; ne pas relever |
| Induced probes CI | A8/A10 | Green ≠ PASS | Canaux MECHANISM / EMERGENCE séparés |

### Checklist préserve (obligatoire avant merge CP touchant fichiers chauds)

- [ ] harvest / sow / clear LIVE (seed1 + seed7 smoke)
- [ ] grind / bake LIVE ; nonFarmFields = 0 sur chaîne food
- [ ] farmer lock / handoff intacts
- [ ] mill bootstrap / priceUrge non cassés sans besoin
- [ ] HARD survival floors + softmax 9 facteurs non réécrits
- [ ] Aucun CREATE_X / induce pour claim EMERGENCE

---

## 5. Gate PASS (rappel opératoire)

```text
EMERGENCE PASS / GLOBAL PASS ⇔
  pop/jours/seeds aux planchers §20
  AND decisionsExact ≥ 10_000 (PROXY ignoré pour PASS)
  AND systèmes critiques aux seuils (pas CODE-ONLY déguisé)
  AND chaînes §22 prouvées où exigées
  AND canal naturel (induced exclu du score émergence)
  AND PASS_RATE mission ≥ barre §21
Sinon : NON DÉCLARÉ / NOT_TESTED / PARTIAL / BLOCKED / FAIL — jamais inventer PASS.
```

**Phase 4 ne vise pas un GLOBAL PASS cosmétique.** Elle vise la **preuve causale** et un rapport `PHASE4_CAUSALITY_VALIDATION.md` honnête.

---

## 6. Statut phase & prochaines assignations

| Élément | Statut |
|---------|--------|
| Plan master | **ÉCRIT** (ce fichier) |
| Log incohérences | Stub `PHASE4_INCOHERENCE_LOG.md` |
| Note transition | `PHASE4_NOTE.md` |
| Code CP1..CP5 | **CP1+CP2+CP3 DONE (CODE wired)** ; **CP4 PARTIAL** (INC fixes+doc) ; CP5 PLANNED |
| GLOBAL / EMERGENCE PASS | **NON DÉCLARÉ** |

**CP1 :** DONE (CODE wired) — ledger exact + smoke (seed1 5d decisionExactTotal=3982).

**CP2 :** DONE (CODE wired) — causalityCounters + snapshot; smoke seed1 5d food harvest/grind/bake/eat live; sec22 acceptance PENDING (NOT PASS). **CP3 :** DONE (CODE wired) — attributionCounters + mem:/emo:/pers: tags; smoke seed1 5d mem=296 emo=1005 pers=94; acceptance PENDING. **Next:** CP4 doc-only or CP3 soak.

---

*Fin PHASE4_CAUSALITY_MASTER.md — Orchestrateur AGENT 1.*

---

**CP4 PARTIAL — integrator 2026-09-17:** INC-01 mesure Slot; INC-02 grindByProfession; INC-03 recordHelp defend/build/haul; INC-04 foundMigrateCamp; INC-05/07 WONTFIX_DOC; INC-06 clamp 120 inchangé. **CP5 DONE** — voir `PHASE4_CAUSALITY_VALIDATION.md`. GLOBAL / EMERGENCE agrege toujours **NON DECLARE**.

---

## CP5 DONE — integrator 2026-09-17

**Statut CP5 :** DONE (re-soak naturel 100×60×seeds 1,3,7 + `PHASE4_CAUSALITY_VALIDATION.md`).

**Preuves :** `_phase4_soak_s{1,3,7}.json`, `_phase4_soak_summary.json`, `_phase4_soak_run.txt`, `scripts/_probe_phase4_causality_soak.ts`.

**Chiffres cles :** decisionExactTotal=**650960** ; leaves=**22** ; foundCamps=**2** ; edibleSum=**2123** ; helpCatsMax=**4** ; sec22=PARTIAL×3 ; PASS harness §28+§33 ; PASS_RATE=**10%** (2/20).

**GLOBAL / EMERGENCE PASS agrege :** **NON DECLARE** (inchangé). Social START@300 **BLOCKED** capacite (300→120) — ne pas relever le clamp.

**Gate :** `finalizeLabel` refuse EMERGENCE PASS si exact decisions <10000 ou floors sec20 fail ; PROXY ignore.
