# EMERGENCE MISSION MASTER

**Role :** AGENT 1 — ORCHESTRATEUR (autorite architecture unique)  
**Workspace :** `C:\Users\kamel\village-sim-1\_wt_rhythm\village_edit`  
**Cree :** 2026-09-17  
**Phase :** **PHASE 2 CODE COMPLETE** (WP1–WP12 CODE wired ; acceptances émergence PENDING)  
**Verdict global :** **NON DÉCLARÉ** — Phase 2 WPs CODE complete ; rapport `EMERGENCE_MISSION_REPORT.md` ; pas de GLOBAL PASS

---

## Mission goal

Transformer le projet en **une seule simulation emergente coherente** — pas dix silos qui cohabitent.

Les PNJ (corps + cerveau), l'economie, les familles, les metiers, les groupes, les institutions et l'environnement doivent **s'influencer reellement** (cause -> perception -> decision -> action -> consequence -> nouvelle decision).

Ce n'est **pas** une mission "ajouter des features". C'est verifier, unifier, cabler, prouver.

---

## Absolute rules

1. **Pas d'edits paralleles non coordonnes** — Phase 1 = analyse uniquement. Toute mod gameplay passe par l'orchestrateur apres le plan d'integration unifie.
2. **Une seule source de verite (SoT)** par domaine (memoire mind-first, profession<->livelihood via `applyProfessionChange`, famine via `feelFamine` / `tickFamine`, etc.).
3. **Pas de faux PASS** — `CODE-ONLY != PASS` ; PASS exige preuve (probe / dump / metriques) aux **nouveaux seuils** (mission §20+). Anciens PASS (~26 PNJ / 40j / 2 seeds) = historique a reclasser honnetement.
4. **Preserver ce qui marche** — farm / mill / brain soft / careers / livelihood sync / life-events mind / emergence seed1+7 (preuve anterieure). Ne pas reecrire inutilement.
5. **Pas de cheat nourriture / yields** — correctifs causaux seulement.
6. **Orchestrateur = autorite finale** — agents 2-10 proposent ; l'integration et les conflits d'API/SoT sont tranches ici.
7. **Ne pas revendiquer GLOBAL PASS** tant que scorecard + seuils §21 ne sont pas remplis sous preuve fraiche.

---

## Logs utilisateur

*Snapshot orchestrateur — 2026-09-17 ~00:16 (UTC+2).*

### App live

- **Pas de Vite/Electron live** dans les terminaux IDE au moment du snapshot.
- Terminaux recents = probes `tsx` / `node` (food-chain, verify, etc.), pas un soak UI.

### Dumps `_*.txt` les plus frais (mtime)

| Fichier | Heure (locale) | Note |
|---------|----------------|------|
| `_food_shortage_s7_final.txt` | 17/09 ~00:05 | famine/career wire -> PASS (induced) |
| `_food_chain_s1_final.txt` | 17/09 ~00:04 | sow/harvest/grind/bake seed1 post-sowfix |
| `_second_audit_s7.txt` | 17/09 ~00:04 | emergence 40d seed7 — sous-tests PASS |
| `_second_audit_s1.txt` | 17/09 ~00:03 | emergence 40d seed1 — sous-tests PASS |
| `_food_chain_s1_after_sowfix.txt` | 17/09 ~00:02 | apres fix sow/clear |
| `_food_chain_s7_harvest_fix.txt` | 16/09 ~23:43 | harvest cum=4665 @d30 seed7 |

### Terminaux IDE (echantillon recent)

| Terminal | Titre / commande | Statut |
|----------|------------------|--------|
| `158265.txt` | Re-probe food chain seed7 30d -> `_food_chain_s7_harvest_fix.txt` | succeeded |
| Autres recents | probes careers / econ / food verify | anterieurs aux dumps emergence 00:03 |

**Conclusion logs :** preuves emergence = **fichiers dump** ; le soak seed1+7 40d n'a pas laisse de terminal IDE dedie au merge.

---

## Architecture entry points (skim Phase 1)

Pipeline observe (a confirmer / enrichir par agents 2-10) :

```text
engine.stepSimulation
  -> tickClimate / tickFamine (cadence)
  -> tickVillager (besoins, HARD survival, tickCognition, chooseTask / pickTaskByPolicy, executeTask)
  -> tickTrade
  -> tickMarriage / tickReproduction / tickAdoption
  -> tickFields
  -> fauna / combat / bandits
  -> tickPolitics / tickBuildProjects / tickTechnology
  -> tickLineages / tickAncestorMemory / tickEthnosWorld
  -> commerce cadence : tickVillageEconomy / tickUrbanNetwork / tickMarketPrices
```

| Domaine | Fichiers d'entree |
|---------|-------------------|
| Engine tick | `src/lib/sim/engine.ts` — `stepSimulation` |
| Comportement / taches | `src/lib/sim/behaviors.ts` — `tickVillager`, `chooseTask`, `tickFamine`, `tickTrade`, `tickFields` |
| Cognition | `src/lib/sim/cognition/tick.ts`, `decide.ts`, `memory.ts` — `tickCognition`, `pickTaskByPolicy` |
| Carrieres | `src/lib/sim/careers.ts` — `applyProfessionChange`, `computeCareerDemand` |
| Commerce | `src/lib/sim/commerce.ts` — prix / economie village / reseau urbain |
| Politique | `src/lib/sim/politics.ts` — `tickPolitics` |
| Familles | `src/lib/sim/family.ts`, `marriage.ts` — lineages, naissances, mariage |

---

## Current preserved systems checklist (from audits — history, not gospel)

Statuts = **revendications audits anterieurs** ; a re-prouver aux seuils mission (>=100 PNJ / 60j / 3+ seeds pour comportement individuel, etc.).

| Systeme | Revendication audit | Preuve historique (a reclasser) |
|---------|---------------------|----------------------------------|
| Agriculture sow -> grow -> ripe -> harvest | PASS (s1+s7 apres sow/clear + orphan fix) | `_second_audit_s*`, `_food_chain_s7_harvest_fix` |
| Mill -> grind -> flour -> bake -> bread | PASS | food-chain + emergence millChain |
| Carrieres dynamiques / metier | PASS | `_verify_careers_s7_d40.txt`, professionSwitch emergence |
| Sync profession <-> livelihood | PASS (incl. `buildHouse` -> `applyProfessionChange`) | SECOND_AUDIT_INTERCONNECT |
| Farmer lock / handoff champs | PASS | FOOD_CHAIN_FIX / harvest orphan |
| Cerveau soft (perceive->...->learn) | CONNECTED hybride CLOSED | BRAIN_CYCLE_REPORT |
| HARD survival bypass | ACCEPTE (volontaire) | BRAIN_CYCLE_REPORT §4 |
| Mind life-events -> politics/religion/bandits/interactions | PASS hot paths | helpers `forEachLifeEvent*` |
| Ghost spouses / detachOutcast | PASS (0/0 s1+s7) | `_second_audit_s*` |
| TeachCraft dense | PASS (volume) | emergence teach starts |
| Famine feel -> foodNeed / career demand | PASS (induced) | `_food_shortage_s7_final.txt` |
| Emergence multi-seed (ancien bar) | PASS seeds 1+7 x 40d | dumps second_audit — **sous-bar mission** |

---

## Residuals to verify (Phase 1+ ; ne pas "PASS" sans preuve)

| Residu | Note audit | Action Phase 1 |
|--------|------------|----------------|
| `gossip` mind-safe (WP2) | **DONE (CODE wired)** ; §22 ACCEPTANCE PENDING | peek bridge + memory helpers ; no multi-seed §22 yet |
| Dual memoire `v.memories` <-> mind | mind-first hot paths ; divergence possible | Agent 2/7 |
| `giveFood` sous `feelFamine` | PARTIAL — fenetre courte ; s7 giveFoodUnderFamine=0 | Agent 4/6 |
| Trade channels (barter vs caravanes) | PARTIAL soft | Agent 3/7 |
| food -> prix -> job pleinement ferme | PARTIAL (trade/titre) | Agent 3 |
| LOD cognition / mind cold | PARTIAL soft | Agent 2/9 |
| `whyFactors` sur HARD | absent eat/chest/torch directs | Agent 2 |
| Donnees calculees jamais lues | a chasser | Agent 7 |
| Anciennes APIs // nouvelles | a chasser | Agent 7 |

---

## Scorecard (§49 — rempli Phase 1 ; aucun PASS §20 inventé)

**Aucun statut rempli en Phase 1.** Remplir seulement apres preuves aux seuils mission.

### A. TESTS EFFECTUES — PENDING

* nombre de PNJ :
* jours :
* seeds :
* simulations :
* evenements :
* decisions :

### B. SCORECARD

*Rempli 2026-09-17 d’après A2–A10 + dumps. **Aucun PASS inventé sous §20.**  
Légende : **legacy-PASS-under-scale** = vrai au bar ~26/40j/2 seeds seulement.*

| Système       | Statut | Échantillon | Seuil | Résultat | Preuve |
| ------------- | ------ | ----------: | ----: | -------: | ------ |
| Survie        | PARTIAL (legacy) | ~26 / 40d / 2 | §20 indiv | aliveEnd OK short | `_second_audit_s*` ; NOT TESTED §20 |
| Besoins       | CODE-ONLY | wiring | §22 | — | needsFactor live ; pas soak §20 |
| Mémoire       | PARTIAL | helpers mind + gossip WP2 | §25 | — | mind-first hot + gossip CODE wired ; §22/§25 ACCEPTANCE PENDING |
| Émotions      | CODE-ONLY | wiring | §26 | — | emotionTaskBias ; pas ≥15 décisions prouvées |
| Personnalité  | CODE-ONLY | wiring | §24 | — | social_tom ; pas 30 paires |
| Objectifs     | PARTIAL (CODE wired WP3) | mind.goal SoT ; ambition label | §21 | — | HTN stubs ; WP3 CODE wired ; diversity PENDING |
| Métiers       | NOT TESTED (§20) / CODE-ONLY sync | 1–2 seeds 40d + induced | §28 | — | sync PASS mécanisme ; adaptation NOT TESTED |
| Apprentissage | PARTIAL volume | teach starts high | §27 | — | volume ≠ progress%/usage futur |
| Familles      | PARTIAL / NOT TESTED | A45 demography | §29 | — | parenté LIVE ; famille-système absent |
| Construction  | PARTIAL (legacy) | mills built short | §31 | — | sous-échelle |
| Économie      | PARTIAL | food-chain s7 | §32 | — | food→prix→job ouvert ; A3 |
| Commerce      | PARTIAL | barter vs caravan | §32 | — | dual channels |
| Migration     | CODE wired / NOT TESTED (§33) | WP11: 1 leave / 1 rejoin on 3×25d natural; stagger+saturation fix | §33 | — | EMERGENCE NOT TESTED (need ≥20 leaves) |
| Groupes       | NOT TESTED | old probes | §34 | — | A5 |
| Institutions  | NOT TESTED | old probes | §35 | — | A5 |
| Religion      | CODE-ONLY / NOT TESTED | WP4 single crystallize writer | §36 | — | A5/A7 ; acceptance PENDING |
| Culture       | CODE-ONLY | ethnos/stubs | §36 | — | chaînes 2 gen absentes |
| Politique     | CODE-ONLY / NOT TESTED | mind events helpers | §37 | — | A5/A10 |
| Conflits      | NOT TESTED / SCRIPT bandits | day-40 gate | §37 | — | A10 |
| Transmission  | PARTIAL | teach volume | §27 | — | skillSamples vides |
| Émergence     | PARTIAL / NOT TESTED | 2×40d induced | §20–39 | — | A6/A10 |
| Multi-seed    | NOT TESTED | 2–5 short ≠ 10 | §38 | — | A6/A10 |
| **GLOBAL (§21)** | **NON DÉCLARÉ** | — | ≥90% + 0 FAIL critique | — | A10 |

### C-G (placeholders)

- **C. 10 meilleures chaines causales** — TBD apres instrumentation + soaks.
- **D. Corrections** — aucune en Phase 1 (analyse only).
- **E. Regressions** — TBD.
- **F. Systemes encore isoles** — TBD (inbox agents).
- **G. Prochain plus gros probleme** — TBD apres merge analyses.

---

## Phase status

```text
PHASE 1 COMPLETE / PHASE 2 PLAN READY
```

| Phase | Contenu | Statut |
|-------|---------|--------|
| 1 | Analyses agents 2–10 | **COMPLETE** |
| 2 | GLOBAL INTEGRATION PLAN + WP1–12 CODE | **CODE COMPLETE** (émergence NOT TESTED) | — voir `GLOBAL_INTEGRATION_PLAN.md` |
| 3 | Mods gameplay coordonnes sous orchestrateur | BLOCKED |
| 4 | Tests aux seuils mission + scorecard | **PARTIAL** — voir REPORT ; GLOBAL NON DÉCLARÉ |
| 5 | Rapport final §49 / eventuel GLOBAL PASS | BLOCKED |

**Interdit Phase 1 :** gameplay code changes ; claim GLOBAL PASS.

---

## Inbox — agents 2–10 findings

Statut : **PHASE 1 COMPLETE / PHASE 2 PLAN READY**. Plan : [`GLOBAL_INTEGRATION_PLAN.md`](./GLOBAL_INTEGRATION_PLAN.md).

**Fichiers `ANALYSIS_AGENT*.md` sur disque (exact):**  
`ANALYSIS_AGENT2_BRAIN.md`, `ANALYSIS_AGENT3_ECONOMY.md`, `ANALYSIS_AGENT4_FAMILY.md`, `ANALYSIS_AGENT5_SOCIETY.md`, `ANALYSIS_AGENT6_EMERGENCE.md`, `ANALYSIS_AGENT7_INTERCONNECT.md`, `ANALYSIS_AGENT8_TESTS.md`, `ANALYSIS_AGENT9_BEHAVIOR.md`, `ANALYSIS_AGENT10_REVIEWER.md`

| Agent | Domaine | Fichier | Statut | One-liner |
|-------|---------|---------|--------|-----------|
| 2 | Cerveau | `ANALYSIS_AGENT2_BRAIN.md` | **RECEIVED** | Soft cycle perceive→learn mappé ; HARD + dual mem / LOD / whyFactors en résidu |
| 3 | Économie | `ANALYSIS_AGENT3_ECONOMY.md` | **RECEIVED** | Chaîne food↔price↔job↔production auditée (read-only) |
| 4 | Familles / social | `ANALYSIS_AGENT4_FAMILY.md` | **RECEIVED** | Parenté solide ; famille-comme-système PARTIAL vs §§9–10/29–30 ; giveFoodUnderFamine faible |
| 5 | Société | `ANALYSIS_AGENT5_SOCIETY.md` | **RECEIVED** | Mécanismes société LIVE (code) ; §§34–37 NOT TESTED au nouveau bar |
| 6 | Émergence | `ANALYSIS_AGENT6_EMERGENCE.md` | **RECEIVED** | Prior PASS sous-échelle ; émergence PARTIAL vs seuils mission |
| 7 | Interconnexions | `ANALYSIS_AGENT7_INTERCONNECT.md` | **RECEIVED** | Farm/food CLOSED seed7 ; overall PARTIAL (ambition/goal, beliefs/values, gossip, laborBalance, softProfession, dual creed) |
| 8 | Tests | `ANALYSIS_AGENT8_TESTS.md` | **RECEIVED** | Harness/métriques §§20–43 conçus ; pas de nouveaux PASS |
| 9 | Qualité comportementale | `ANALYSIS_AGENT9_BEHAVIOR.md` | **RECEIVED** | Diversité / anti-loop / LOD cognition — analyse only |
| 10 | Reviewer | `ANALYSIS_AGENT10_REVIEWER.md` | **RECEIVED** | Adversarial: prior OVERALL PASS ≠ mission bar ; GLOBAL NON DECLARER |

### Inbox raw

```text
[AGENT 2] RECEIVED — Soft cycle perceive→learn mappé ; HARD + dual mem / LOD / whyFactors en résidu
[AGENT 3] RECEIVED — Chaîne food↔price↔job↔production auditée (read-only)
[AGENT 4] RECEIVED — Parenté solide ; famille-comme-système PARTIAL vs §§9–10/29–30 ; giveFoodUnderFamine faible
[AGENT 5] RECEIVED — Mécanismes société LIVE (code) ; §§34–37 NOT TESTED au nouveau bar
[AGENT 6] RECEIVED — Prior PASS sous-échelle ; émergence PARTIAL vs seuils mission
[AGENT 7] RECEIVED — Farm/food CLOSED seed7 ; overall PARTIAL (ambition/goal, beliefs/values, gossip, laborBalance, softProfession, dual creed)
[AGENT 8] RECEIVED — Harness/métriques §§20–43 conçus ; pas de nouveaux PASS
[AGENT 9] RECEIVED — Diversité / anti-loop / LOD cognition — analyse only
[AGENT 10] RECEIVED — Prior PASS sous-échelle/induced ; GLOBAL NON DÉCLARÉ ; voir GLOBAL_INTEGRATION_PLAN.md
```

---

## GLOBAL INTEGRATION PLAN

**READY** — document réel : [`GLOBAL_INTEGRATION_PLAN.md`](./GLOBAL_INTEGRATION_PLAN.md)

Phase 2 : WP orchestrateur-approuvés seulement ; instrumentation (WP1) avant correctifs causaux ; un intégrateur à la fois.

---




## Phase 2 — WP status

| WP | Statut | Note |
|----|--------|------|
| **WP1** Instrumentation & honesty | **DONE** | `scripts/harness/**` ; gate §20 ; MECHANISM/EMERGENCE ; **Pas de GLOBAL PASS.** |
| **WP2** SoT mémoire / gossip | **DONE (CODE)** | mind-first gossip ; §22 ACCEPTANCE PENDING |
| **WP3** SoT intention ambition/goal | **DONE (CODE)** | mind.goal SoT ; diversity PENDING |
| **WP4** SoT creed single writer | **DONE (CODE)** | religion crystallize ; society PENDING |
| **WP5** Métiers softProfession×demand | **DONE (CODE)** | foodNeed damp ; harvest smoke OK |
| **WP6** Famille / entraide | **DONE (CODE)** | helpers + helpCounters ; §29/30 PENDING |
| **WP7** Économie trade/prix | **DONE (CODE)** | dual channels + price→job ; §32 PENDING |
| **WP8** whyFactors HARD + anti-loop | **DONE (CODE)** | explain HARD ; entropy PENDING |
| **WP9** LOD crise / diversity | **DONE (CODE)** | crisis deep ; §23/40 PENDING |
| **WP10** Société métriques | **DONE (CODE)** | societyMetrics ; §§34–37 PENDING |
| **WP11** Migration natural soaks | **DONE (CODE)** | 1 leave / 1 rejoin short ; §33 NOT TESTED |
| **WP12** Scale §20 policy | **DONE (CODE)** | individual START@100 READY ; social START@300 **BLOCKED capacité** (clamp 120) ; grow UNPROVEN ; **no EMERGENCE PASS** |

**Rapport de clôture Phase 2 :** [`EMERGENCE_MISSION_REPORT.md`](EMERGENCE_MISSION_REPORT.md) — GLOBAL toujours **NON DÉCLARÉ**.
## History references (not gospel)

- `SECOND_AUDIT_MASTER.md`, `SECOND_AUDIT_REPORT.md`
- `SECOND_AUDIT_INTERCONNECT.md`, `SECOND_AUDIT_EMERGENCE.md`, `SECOND_AUDIT_BRAIN.md`
- `BRAIN_CYCLE_REPORT.md`
- `INTERCONNECT_MASTER.md`, `INTERCONNECT_VERIFY.md`
- `FOOD_CHAIN_FIX.md`

Prior overall "PASS" second audit = **campagne courte 2 seeds x 40d**. Sous la mission actuelle : **reclasser / re-prouver** ; ne pas importer comme GLOBAL PASS.

---



### WP11 (2026-09-17)

**DONE (CODE wired)** — migration telemetry + stagger/saturation leave fix; natural probe MECHANISM wire OK / EMERGENCE NOT_TESTED. Observed short soak: **leaves=1, rejoins=1** (seeds 1,3,7 × 25d). No GLOBAL PASS.


*Fin EMERGENCE_MISSION_MASTER — Phase 1 bootstrap orchestrateur*

### WP12 (2026-09-17)

**DONE (CODE wired)** — scalePolicy + clamps documentés. Individual §20 START@100 **READY** (clamp max 120). Social START@300 **BLOCKED capacité** (300→120). Grow-to-300 capacity OK / organic UNPROVEN. No GLOBAL PASS. Rapport : `EMERGENCE_MISSION_REPORT.md`.
