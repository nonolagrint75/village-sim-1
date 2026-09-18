# EMERGENCE MISSION REPORT — Phase 2 (clôture)

**Rôle :** Orchestrateur scribe (après intégration WP12)  
**Workspace :** `village_edit`  
**Date :** 2026-09-17  
**Verdict global :** **NON DÉCLARÉ** — **aucun GLOBAL PASS / aucun EMERGENCE PASS**

Réf. : `EMERGENCE_MISSION_MASTER.md`, `GLOBAL_INTEGRATION_PLAN.md`, dumps `_second_audit_s{1,7}.txt`, `_food_*_final.txt` (mtime ~17/09 00:03–00:05).

---

## A. Tests effectués (tailles honnêtes)

| Preuve | Pop | Jours | Seeds | Canal | Verdict honnête |
|--------|-----|-------|-------|-------|-----------------|
| Second audit émergence | ~26→32 | 40 | 1, 7 | MECHANISM (+ induced) | PASS mécanisme / **NOT TESTED** émergence §20 |
| Food chain / harvest seed7 | ~26 | 20–40 | 7 (1 fragile) | MECHANISM | LIVE harvest/grind/bake (legacy) |
| Food shortage / careers wire | ~26 | 30 | 7 | MECHANISM | PASS wire **induced** famine |
| Migration natural (WP11) | ~26 | 25 | 1,3,7 | MECHANISM | leaves=1, rejoins=1 — **§33 NOT TESTED** |
| Harness honesty (WP1/WP12) | n/a | n/a | n/a | gates | Refuse PASS sous-échelle ; scale policy READY/BLOCKED |
| Soak §20 individuel (≥100 / 60j / 3 seeds) | — | — | — | EMERGENCE | **NON EXÉCUTÉ** |
| Soak §20 social (≥300 / 120j / 10 seeds) | — | — | — | EMERGENCE | **NON EXÉCUTÉ** ; START@300 **BLOCKED capacité** |

Échantillon campagne typique : **~26 fondateurs × 40j × 2 seeds** — sous tous les planchers §20.

---

## B. Scorecard (§49) — pas de faux GLOBAL PASS

Légende : CODE-ONLY / PARTIAL / NOT TESTED / FAIL / PASS (legacy mécanisme uniquement).

| Système | Statut | Seuil | Preuve |
|---------|--------|-------|--------|
| Survie | PARTIAL (legacy) | §20 indiv | aliveEnd OK court ; NOT TESTED §20 |
| Besoins | CODE-ONLY | §22 | needsFactor live ; pas soak |
| Mémoire | PARTIAL | §25 | mind-first + gossip WP2 CODE ; §22 ACCEPTANCE PENDING |
| Émotions | CODE-ONLY | §26 | wiring |
| Personnalité | CODE-ONLY | §24 | social_tom ; pas 30 paires |
| Objectifs | PARTIAL (CODE WP3) | §23 | mind.goal SoT ; diversity PENDING |
| Métiers | NOT TESTED (§20) / CODE sync | §28 | sync PASS mécanisme ; adaptation NOT TESTED |
| Apprentissage | PARTIAL volume | §27 | teachCraft densé ≠ preuve |
| Familles | PARTIAL / NOT TESTED | §29–30 | WP6 helpers+counters CODE ; soak PENDING |
| Construction | PARTIAL (legacy) | §31 | mills built short |
| Économie | PARTIAL | §32 | food→prix nudge WP7 CODE ; chaînes choc PENDING |
| Commerce | PARTIAL | §32 | dual barter/caravan documenté |
| Migration | CODE wired / NOT TESTED | §33 | WP11 : 1 leave / 1 rejoin ; ≪20 |
| Groupes | NOT TESTED | §34 | WP10 counters |
| Institutions | NOT TESTED | §35 | WP10 counters |
| Religion / creed | CODE-ONLY / NOT TESTED | §36 | WP4 sole writer ; soak PENDING |
| Culture | CODE-ONLY | §36 | ethnos/stubs |
| Politique | CODE-ONLY / NOT TESTED | §37 | mind helpers |
| Conflits | NOT TESTED / SCRIPT bandits | §37 | floor day22 + soft 40 |
| Transmission | PARTIAL | §27 | skill samples |
| Émergence | PARTIAL / NOT TESTED | §20–39 | A6/A10 ; pas soak §20 |
| Multi-seed | NOT TESTED | §38 | 2≪10 |
| **GLOBAL (§21)** | **NON DÉCLARÉ** | ≥90 % PASS §20 | **aucun PASS inventé** |

---

## C. Meilleures chaînes causales observées

Moins de 10 chaînes **réelles** documentées à l’échelle mission. Exemples **mécanisme** (pas émergence §20) :

1. Orphan wheat reclaim → farmer lock → harvest LIVE (seed7).
2. Sow ∥ clear (seed1) → ripen → harvest (fragile).
3. Grind → flour → bake → bread (mill bootstrap sans chicken-egg).
4. Induced famine → foodNeed↑ → food professions shift (TEST SETUP).
5. `buildHouse` → `applyProfessionChange` → livelihood sync.
6. Food-basket prices → `computeCareerDemand.foodNeed` nudge (WP7 wire).
7. Migration urge samples → leaveAttempts → 1 leave naturel (WP11, sous seuil).

**Aucune** chaîne choc→décision→action→offre/demande→prix multi-seed au plancher §32.

---

## D. Corrections WP1–WP12 (liste)

| WP | Contenu | Statut CODE |
|----|---------|-------------|
| WP1 | Harness gates §20, canaux MECHANISM/EMERGENCE, §43 | DONE |
| WP2 | Gossip mind-safe / peek bridge | DONE (CODE) |
| WP3 | mind.goal SoT ; ambition label | DONE (CODE) |
| WP4 | Creed single writer (religion) | DONE (CODE) |
| WP5 | softProfession × foodNeed damp ; laborBalance hors demand | DONE (CODE) |
| WP6 | family helpers + helpCounters + bias entraide | DONE (CODE) |
| WP7 | Dual trade + phantom surplus gate + price→job nudge | DONE (CODE) |
| WP8 | whyFactors HARD + anti-loop soft léger | DONE (CODE) |
| WP9 | Crisis deep priority + secondary goals nudge | DONE (CODE) |
| WP10 | societyMetrics + bandit calendar floor | DONE (CODE) |
| WP11 | migrationMetrics + stagger/saturation leave fix | DONE (CODE) |
| WP12 | scalePolicy §20 ; START@100 READY ; START@300 BLOCKED capacité | DONE (CODE) |

Acceptances émergence (§§22–38) : **majoritairement PENDING / NOT TESTED**.

---

## E. Régressions

**Aucune régression farm/mill connue** sur les smokes seed7 post-WP5–7 (harvest LIVE, nonFarmFields=0).  
Pas de nouveau soak multi-seed long exécuté en clôture Phase 2 → régression émergence **non re-mesurée** (pas inventée).

---

## F. Encore isolé

- Valeurs cognitives `mind.values` ≠ pont SoT vers `pol.beliefs`
- Softening night HARD rest (différé)
- Counterfactual / SCM / Bayes / MCTS (ABSENT)
- Institution treasury riche
- Wars / CREATE_GUILD (interdit pour PASS)
- ToM depth ≥2
- Décisions / entropy collectors non branchés en prod soak
- Croissance organique 100→300 **UNPROVEN**

---

## G. Plus gros bloqueur d’autonomie restant

**Échelle + preuve émergence naturelle :** le jeu peut **démarrer** le tier individuel §20 (100 fondateurs, clamp ≤120) mais **aucun soak §20 n’a tourné** ; le tier social **ne peut pas démarrer à 300** (`initialVillagers` max **120**) — statut **BLOCKED capacité** (≠ FAIL). Sans soaks multi-seed naturels aux planchers §20–21, l’autonomie émergente reste **NON DÉCLARÉE**.

---

*Fin EMERGENCE_MISSION_REPORT — Phase 2 close. Lien master : `EMERGENCE_MISSION_MASTER.md`.*