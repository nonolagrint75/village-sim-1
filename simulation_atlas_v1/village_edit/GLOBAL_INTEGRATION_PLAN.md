# GLOBAL INTEGRATION PLAN

**Owner :** AGENT 1 — ORCHESTRATEUR  
**Workspace :** `village_edit`  
**Date :** 2026-09-17  
**Statut :** **PHASE 2 PLAN READY** — aucune implémentation gameplay dans ce document  
**Réf. mission :** `EMERGENCE_MISSION_MASTER.md` + analyses A2–A10

---

## Logs utilisateur (snapshot plan)

| Source | Mtime | Lecture |
|--------|-------|---------|
| `_second_audit_s{1,7}.txt` | 17/09 ~00:03–00:04 | Émergence 40d / pop~26 / famine+métier **induced** → ne pas importer comme PASS mission |
| `_food_chain_s1_final.txt` / `_food_shortage_s7_final.txt` | ~00:04–00:05 | Chaîne food + wire famine/career |
| `_food_chain_s7_harvest_fix.txt` | 16/09 ~23:43 | Harvest seed7 LIVE (mécanisme) |
| Terminaux IDE | probes `tsx` | **Pas** de Vite/Electron live |

Preuves Phase 1 = dumps + analyses. **Aucun soak §20** (100 PNJ / 60j / 3+ seeds) n’existe encore.

---

## 1. Verdict honnête Phase 1

**PAS DE GLOBAL PASS.**

Les audits SECOND_* ont **corrigé de vrais bugs** (sow∥clear, orphan wheat, `buildHouse`→`applyProfessionChange`, helpers mind life-events) et produit des dumps **mécanisme utiles**. Sous la barre mission (§§20–43) :

- Échantillon typique **~26 fondateurs × 40 jours × 2 seeds** → **sous tous les planchers §20**.
- Sous-tests famine / profession souvent **induced** (TEST SETUP) — **≠ émergence**.
- Probe `OVERALL PASS (no FAIL)` peut coexister avec PARTIAL / induced → **inflation de PASS** (A10).
- Systèmes critiques (§21) : majoritairement **CODE-ONLY / PARTIAL (legacy) / NOT TESTED**.

**Statut global honnête :** `NON DÉCLARÉ / NOT TESTED` (mission).  
Prior « PASS » = **PASS (legacy ≤26/40/2)** ou **NOT TESTED (mission §20)** — jamais GLOBAL PASS.

---

## 2. Source-of-truth map (cible Phase 2)

| Domaine | Autorité cible | Miroirs / legacy | État Phase 1 |
|---------|----------------|------------------|--------------|
| **Mémoire épisodique / lieux** | Mind (`mindPool` / `memory.ts`) + helpers `forEachLifeEvent*` | `v.memories` (cap 12) | Hot paths mind-first ; **`gossip()` mind-safe (WP2)** |
| **Profession** | `v.profession` via **`applyProfessionChange`** | — | Fermé (maison + carrières) |
| **Livelihood / titre** | Overlay depuis profession (+ cultural sacred) | Soft titles practice | Sync OK ; **softProfession sans gate demand** |
| **Famine** | `feelFamine` / `villagerFeelsFamine` (lecture) ; `tickFamine` (écriture) | `state.famine` flag | PASS mécanisme ; restes lecteurs société |
| **Intention (goals)** | `mind.goal` + `goalTaskModifier` | `v.ambition` / `ambitionBonus` (label / goal-alias) | **WP3 CODE wired** — ambitionBonus lit `mind.goal` ; label sync fast+deep |
| **Croyances / creed** | Un seul writer (`religion.maybeCrystallizeFaithCreed` + beliefs/sacredConf **read**) | stubs sacredConf ; politics creedWeight / `trySpreadCreed` | **WP4 CODE wired** |
| **Valeurs cognitives** | `mind.values` | `pol.beliefs.*` parallèle | **Pas de pont SoT** |
| **Richesse / foyer** | À définir : stock foyer (`homeOwner` pantry) + helpers family | `wealthAggregate` UI / refresh | **Famille ≠ système économique** (A4) |
| **Prix / commerce** | `state.prices` / caravanes | `tickTrade` barter local | **WP7:** duals documented + price barter wire ; phantom food surplus gated |
| **Métiers demand** | `computeCareerDemand` → `assignProfession` | softProfession (damp foodNeed) ; `laborBalance` attractivité/migration | **WP5:** one métier policy ; laborBalance **not** in demand |

Règle : **un writer, N readers** ; miroirs = projection, jamais décision solo.

---

## 3. Matrice de conflits (propositions agents)

| Conflit | Parties | Risque | Arbitrage orchestrateur |
|---------|---------|--------|-------------------------|
| Softening night HARD rest | A2 vs survie / farm nuit | Morts froid / harvest night mort | **Différé** — gameplay call ; ne pas toucher Phase 2 early |
| Cap crisis `findNearest` | A2 vs empty-bag mortality | Starvation | Seulement après instrumentation mortalité |
| Drift personnalité ↑ | A2 vs génétique / ethnos | Bruit lignées | P2+ ; bandes faibles |
| softProfession × demand gate | A3/A7 vs farmer lock famine | Unlock farmer lock | **WP5 DONE** — dampen foodNeed ; **jamais** bypass farmer lock / handoff |
| laborBalance → assignProfession | A3 vs softProfession | Deux writers métier | **WP5 décision:** laborBalance reste attractivité/migration ; **pas** branché demand |
| Creed single writer | A5/A7 vs politics bias / shrines | Double crystallize | **WP4 DONE (CODE)** — religion write ; politics/stubs read+sacredConf |
| Ambition ≡ goal | A2/A7/A9 | Sync races revenge/sticky | `mind.goal` SoT runtime ; ambition = label |
| Family pantry / giveFood | A4 vs mill costs / inventaire perso | Casse food chain | Après WP1 ; tests régression farm/mill |
| Migration leave ↑ | A6 vs stickiness polity | Polities fragiles | Télémetrie d’abord ; pas buff leave |
| BANDIT_START_DAY soften | A5/A6/A10 vs design narratif | Calendrier script | Documenter ou diversifier ; pas `CREATE_WAR` |
| Pop 100–300 vs LOD cold | A8/A9/A10 | Faux « brain PASS » | Collector sampling + deep sous crise **avant** claim cognition |
| Induced probes en CI | A8/A10 vs §42 | Green ≠ PASS mission | Split MECHANISM / EMERGENCE |
| Edits parallèles `behaviors.ts` | A2/A3/A4/A6/A7/A9 | Merge thrash | **Un intégrateur à la fois** |
| Clamp 120 vs social §20=300 | Config vs mission | BLOCKED capacité | Politique explicite (grow-to-300) — pas fake PASS |

---

## 4. Work packages prioritaires (WP1…WP12)

### Ordre global (résumé)

```text
WP1 instrumentation + honesty probes
  → WP2 SoT mémoire/gossip (serial)
  → WP3 SoT intention ambition/goal (serial)
  → WP4 SoT creed (serial)
  → WP5 métiers softProfession×demand (+ laborBalance décision)
  → WP6 famille/entraide (après WP1 ; régression food)
  → WP7 économie trade/title / food→prix→job preuve
  → WP8 whyFactors HARD + anti-loop soft (auditabilité)
  → WP9 LOD crise / diversity behaviour
  → WP10 société métriques + anti-script bandits (mesure)
  → WP11 émergence natural soaks (migration / multi-seed / gens)
  → WP12 scale config policy §20
```

**NEVER** : deux agents touchent le même fichier chaud sans lock orchestrateur.

---

### WP1 — Instrumentation & honesty (P0 — FIRST)

| | |
|--|--|
| **Goal** | Pouvoir mesurer §§20–43 ; interdire PASS sous-échelle / induced mélangé |
| **Files** | `scripts/harness/**` (nouveau), `scripts/_probe_second_audit_emergence.ts`, probes A8 ; éventuellement `probe-behavior-diversity.ts` (A9) |
| **Deps** | Aucune mod gameplay |
| **Risque farm/mill/brain soft** | **Nul** (scripts only) |
| **Acceptance (A8)** | Gate §20 refuse PASS si pop/days/seeds/décisions sous plancher ; sortie `MECHANISM` vs `EMERGENCE` séparée ; template §43 ; compteurs décisions / entropy / whyFactors retention stubs |

> **Status WP1 :** **DONE** (2026-09-17) — paths: `scripts/harness/**` (`run.ts`, `gates.ts`, `collectors.ts`, `evidence.ts`, `channels.ts`, `adapters.ts`, `types.ts`, `index.ts`); adapter branché dans `scripts/_probe_second_audit_emergence.ts`. Scaffold: `scripts/_harness_agent8_scaffold.ts`. Smoke: `npx tsx scripts/harness/run.ts`. **Pas de GLOBAL PASS / EMERGENCE PASS.**


### WP2 — SoT mémoire : gossip mind-safe

| | |
|--|--|
| **Goal** | `gossip` lit/écrit tellables mind-first (plus legacy-only) |
| **Files** | `social.ts`, helper `cognition/memory.ts` (éviter cycle import) |
| **Deps** | WP1 (pour prouver usage mémoire→décision §25) |
| **Risque** | Faible si helper only ; **ne pas** toucher farm |
| **Acceptance** | ≥20 événements gossip mind-sourced ; ≥15 consommés ; 3 seeds (seuil §22 lite) — sinon CONNECTION NOT PROVEN |

> **Status WP2 :** **DONE (CODE wired)** (2026-09-17) — `pickBestTellableLifeEvent` / `hasMatchingLifeEvent` in `cognition/memory.ts` ; `gossip()` mind-first via `setEpisodicPeekBridge` (engine←`peekMind`, no social↔mindPool cycle) ; write path still `remember()`→mind bridge. Smoke: `tsc --noEmit` OK + targeted mind-only tellable runtime check. **§22 CONNECTION PROVEN : ACCEPTANCE PENDING** (multi-seed probe counts not run this pass).

### WP3 — SoT intention : mind.goal > ambitionBonus

| | |
|--|--|
| **Goal** | Un levier d’intention runtime ; ambition = alias/label post-sync |
| **Files** | `cognition/decide.ts`, `cognition/tick.ts`, éventuellement `behaviors.ts` (scores catalogue) |
| **Deps** | WP1 |
| **Risque brain soft** | Moyen — ne pas casser 9 facteurs ; **pas** de rewrite softmax |
| **Acceptance** | Probe diversity : goal id hors survive quand safe ; pas de régression harvest/mill (suite régression WP1) |

> **Status WP3 :** **DONE (CODE wired)** (2026-09-17) — `ambitionBonus` keyed off `mind.goal.id` (not `v.ambition`) ; `projectAmbitionLabelFromGoal` on fast+deep ; `syncAmbitionAndGoal` soft-ambition→goal then label mirror. Smoke: `tsc --noEmit` OK. **Diversity acceptance PENDING** (no secondary-goal / §23 probe this pass). Softmax 9-factor untouched ; HARD survival untouched ; no farm/mill/careers edits beyond ambitionBonus.

### WP4 — SoT creed : un writer

| | |
|--|--|
| **Goal** | Crystallize creed unique (religion + beliefs) ; stubs = sacredConf only |
| **Files** | `religion.ts`, `politics.ts`, `cognition/stubs.ts` |
| **Deps** | WP1 ; alignement A5 |
| **Risque** | Faible sur farm ; moyen sur bias politique |
| **Acceptance** | Histogramme creed-change + tâche post-change (probe society A5/A8) ; pas de double-assign sur soak 3 seeds |

> **Status WP4 :** **DONE (CODE wired)** (2026-09-17) — sole crystallize writer `religion.maybeCrystallizeFaithCreed` (reads `pol.beliefs` + `mind.sacredConf` ; absorbs ex-politics grievance gate) ; `stubs.tickReligionDepth` = sacredConf/piety/creedWeight only ; `politics.tickIndividualPolitics` accumulates creedWeight, no `pol.creed` assign ; `trySpreadCreed` kept as conversion. Smoke: `tsc --noEmit` OK. **Society probe acceptance PENDING** (no 3-seed creed-change histogram this pass). No CREATE_X ; no farm/mill/brain soft edits.

### WP5 — Métiers : softProfession × demand (+ laborBalance)

| | |
|--|--|
| **Goal** | Practice softProfession ne combat plus famine/foodNeed ; décider si laborBalance entre dans demand |
| **Files** | `livelihood.ts`, `careers.ts`, éventuellement `commerce.ts` |
| **Deps** | WP1 ; **préserve farmer lock / handoff** |
| **Risque farm** | **ÉLEVÉ** si mal gated → WP5 après régression harvest seed1+7 |
| **Acceptance** | Careers verify multi-seed ; foodNeed haut ⇒ pas de flip hors food métiers ; harvest cum seed7 non régressé |

> **Status WP5 :** **DONE (CODE wired)** (2026-09-17) — Policy: **one métier writer stack** — primary `computeCareerDemand`→`assignProfession`→`applyProfessionChange` ; secondary softProfession practice dampened by `foodNeed` / `villagerFeelsFamine` (block non-food soft when foodNeed≥0.75 or famine feel ; raise mix bar when ≥0.55). **`laborBalance` NOT folded into demand** (stays attractiveness/migration). Farmer lock / handoff / orphan reclaim untouched. Smoke: `tsc --noEmit` OK ; `_probe_food_chain.ts` seed7×20d harvest LIVE (cum.harvest 3642 @d20, nonFarmFields=0) — **no harvest regress**. **Careers multi-seed / foodNeed flip acceptance PENDING**. No WP6+ ; no GLOBAL PASS.

### WP6 — Famille / entraide (système, pas décor)

| | |
|--|--|
| **Goal** | Helpers foyer (familyOf, pantry, wealth) ; bonus familyId entraide ; compteurs help_* |
| **Files** | `family.ts`, `behaviors.ts`, `interactions.ts` |
| **Deps** | WP1 ; idéalement WP5 stable |
| **Risque farm/mill** | Moyen (pantry/eat/giveFood) — **régression food-chain obligatoire** |
| **Acceptance** | giveFoodUnderFamine >0 sur fenêtre naturelle ou induced **documentée** ; catégories ≥3 instrumentées ; **pas** de cheat yields |

> **Status WP6 :** **DONE (CODE wired)** (2026-09-17) — Helpers `familyOf` / `familyMembers` / `familyHomeOwner` / `familyEdible` / `familyWealth` / `sameFamily` / `recordHelp` in `family.ts` (pantry-wealth **readers only** — no eat/mill consume rewrite). Scoring bias `sameFamily` on giveFood / socialise / teachCraft / defend in `behaviors.ts`. `helpCounters` {food,teach,defend,build,haul,labor} on `SimState` ; food/teach/defend bumped in `interactions` (doGiveFood / doTeachCraft / creditRescue). No co-build; no yield cheat; farmer locks untouched. Smoke: `tsc --noEmit` OK ; `_probe_food_chain.ts` seed7×20d harvest LIVE (cum.harvest 3660 @d20, nonFarmFields=0, grind/bake LIVE). **§29/§30 probe acceptance PENDING** (no dedicated family-aid soak). No WP7+ ; no GLOBAL PASS.

### WP7 — Économie : food→prix→job + canaux trade

| | |
|--|--|
| **Goal** | Fermer / prouver boucle prix ; clarifier barter vs caravane |
| **Files** | `commerce.ts`, `behaviors.ts` (trade tasks), careers demand |
| **Deps** | WP1, WP5 |
| **Risque mill** | Moyen (grind/bake scores) — **ne pas** retoucher bootstrap mill priceUrge sans besoin |
| **Acceptance** | ≥5 chaînes choc→décision→action→offre/demande→prix (A3/A8 §32) sur ≥3 seeds |

> **Status WP7 :** **DONE (CODE wired)** (2026-09-17) — Dual channels documented: `tickTrade` = proximity food barter (priceOf-aware coin); `tradeRun`/`conductTrade` = caravan surplus+prices; `buyMaterial` = local chest retail. Phantom food surplus gated in `applyRegionalProduction` (no free wheat/flour/bread/food). Causal wire: live food-basket prices nudge `computeCareerDemand.foodNeed`. Bake: oven-first grind gate + score beat harvest + communal mill oven; flour no longer piles (seed7×20d flour=0 bread=95). `buyMaterial` urge × `priceUrge` when seller surplus>0. Mill bootstrap priceUrge untouched; farmer locks / WP5 damp preserved. Smoke: `tsc --noEmit` OK ; `_probe_food_chain.ts` seed7×20d harvest LIVE (cum.harvest 3561 @d20, nonFarmFields=0, grind/bake LIVE, bread rising). **§32 acceptance PENDING** (no full multi-seed choc→prix chains). No WP8+ ; no GLOBAL PASS.

### WP8 — Auditabilité HARD + anti-loop soft

| | |
|--|--|
| **Goal** | whyFactors sur HARD survival (expliquer, pas soft-maxer) ; damp habits anti-loop |
| **Files** | `behaviors.ts`, `cognition/decide.ts` |
| **Deps** | WP1, WP3 |
| **Risque brain soft** | Faible si whyFactors only ; moyen si anti-loop trop fort |
| **Acceptance** | HARD events comptés dans décisions §20 ; entropy / sequences (A9 probe) sans wipe AFK |

> **Status WP8 :** **DONE (CODE wired)** (2026-09-17) — HARD survival assigns (`eat`, empty-bag/`tryAssignFoodSeek`, freeze, torch, threat fight/flee) pass structured `whyFactors` `['HARD','survive',…]` into `noteChosenAction` → `lastFactorWhy` (explain only; floors untouched). Light anti-loop: `habitAntiLoopDamp` in `stressHabitFactor` when same non-urgent kind dominates `recentActs`+habit (≥50% of last 5, habit≥0.32) — max ~18% damp; **exempt** harvest/sow/clear/grind/bake/eat/rest/hearth/torch/threat/food-seek. Softmax 9-factor rewrite **not** done; farmer lock / mill untouched. Smoke: `tsc --noEmit` OK. **Acceptance PENDING** (no diversity/entropy probe this pass). No WP9+ ; no GLOBAL PASS.

### WP9 — LOD crise & diversité comportementale

| | |
|--|--|
| **Goal** | Deep think sous famine/crise ; mesurer §23/§40 |
| **Files** | `cognition/tick.ts`, `perfBudget.ts` / `budget.ts`, probe diversity |
| **Deps** | WP1 |
| **Risque** | Perf wall-clock ; faux cold mind à 100+ PNJ |
| **Acceptance** | % deep sous feelFamine ↑ ; unique TaskKinds ≥5 ; pas 80% même séquence >7j |

> **Status WP9 :** **DONE (CODE wired)** (2026-09-17) — Crisis deep priority: `shouldDeepThink` bypasses thin `deepShare` for empty-bag / `villagerFeelsFamine` / stress>0.72 / high negative PE (stagger %3, not deepShare=1); `allowDeepThink(..., priority)` + famine `deepShare` floor 0.30 via `setCrisisDeepPressure` (engine↔tickFamine). Fast-path light `pickGoal` when crisis commitment crushed. Secondary goals: survival-stable nudge in `scoreGoals` + lower boredom/creative concern bar (no fake entropy; anti-AFK untouched). HARD floors / farm / mill / WP3 goal SoT / WP8 whyFactors preserved. Smoke: `tsc --noEmit` OK. **§23/§40 acceptance PENDING** (no diversity soak this pass). No WP10+ ; no GLOBAL PASS.

### WP10 — Société : métriques §§34–37 + anti-script bandits

| | |
|--|--|
| **Goal** | Lifetime cercles/institutions, taxonomy conflits, creed→comportement ; documenter/diversifier BANDIT_START_DAY |
| **Files** | `scripts/_probe_society*.ts`, `politics.ts`, `bandits.ts` (tags only si besoin) |
| **Deps** | WP1, WP4 |
| **Risque** | Faible si mesure first |
| **Acceptance** | Seuils A5/A8 documentés ; **pas** CREATE_INSTITUTION |

> **Status WP10 :** **DONE (CODE wired)** (2026-09-17) — `societyMetrics.ts` counters on `SimState` (longevity peaks / dissolve ages, creedChanges + scoring followups, conflict cause taxonomy); thin hooks in `politics.ts` / `religion.ts` / `bandits.ts` / `interactions.ts`; `BANDIT_CALENDAR_FLOOR_DAY=22` hard floor + pressure/outcast unlock before soft `BANDIT_START_DAY=40` (documented, no CREATE_WAR/GUILD); harness `SocietyMetricsHook` + `adaptSocietyProbe`; probe dumps metrics. Smoke: `tsc --noEmit` OK. **§§34–37 acceptance PENDING** (no multi-seed soak this pass). WP11 follows; **no GLOBAL PASS**.

### WP11 — Émergence natural soaks (migration / multi-seed / gens)

| | |
|--|--|
| **Goal** | Preuves §33/§38/§20 gen **sans** induire PASS |
| **Files** | probes émergence, `politics.ts` (télémétrie migrate), genealogy depth |
| **Deps** | WP1 ; stabilité farm (régression) |
| **Risque** | Faible code ; coût compute élevé |
| **Acceptance** | Migration ≥20 leaves causés **ou** NOT TESTED honnête ; 10 seeds planifiés (peut rester NOT TESTED jusqu’à run) ; gens ≥500d ou 2 générations |

> **Status WP11 :** **DONE (CODE wired)** (2026-09-17) — `migrationMetrics.ts` (urge bands / leaveAttempts / blockedBy / leavesByCause / rejoin / found); `tickMigration` saturation override (≥0.94 softens home+loyalty & low-curiosity absolute gate; elder/job soft retention below saturation); **belief-tick stagger fix** (nested `tick%BELIEF_TICK` × id stagger only fired id%48===0 — root cause of urge≠leave); leave/rejoin before belief updates; `buildHouse` notes found camps; harness `adaptMigrationProbe` + `scripts/_probe_migration_natural.ts` (natural, no induction). Smoke: `tsc --noEmit` OK; natural soak seeds **1,3,7 × 25d** → leaves **0+0+1=1**, rejoins **1**, leaveAttempts **5**, blocks home_loyalty/elder/low_curiosity (seed7), urgeSamples ~1k/seed. **§33/§38/§20 EMERGENCE: NOT TESTED** (≪20 leaves / floors; never fake PASS). No WP12; **no GLOBAL PASS**.


### WP12 — Politique d’échelle §20 (config)

| | |
|--|--|
| **Goal** | Documenter / activer chemin vers ≥100 start ou grow-to-300 ; clamp explicite |
| **Files** | `simConfig.ts` + docs harness |
| **Deps** | WP1 ; perf A9 |
| **Risque** | Stress maxPopulation |
| **Acceptance** | Harness peut lancer tier individuel §20 **ou** status BLOCKED capacité (≠ FAIL émergence) |


> **Status WP12 :** **DONE (CODE wired)** (2026-09-17) — `scripts/harness/scalePolicy.ts` presets `sec20_individual_start100` (READY within clamp 4–120), `sec20_individual_grow100`, `sec20_social_grow300` ; `assessScaleCapacity` / `assessSocialStart300Blocked` ; harness `run.ts --scale`. Clamps exported: `INITIAL_VILLAGERS_MAX=120`, `MAX_POPULATION_HARD_CAP=500` in `simConfig.ts` (default play 26 unchanged). **Individual START@100 READY** ; **Social START@300 BLOCKED capacité** (requested 300 → clamped 120) ; grow-to-300 capacity OK (maxPop 400) but organic UNPROVEN. **≠ FAIL émergence ; no EMERGENCE PASS / no GLOBAL PASS.**

---


## 5. Ordre explicite : instrumentation vs correctifs causaux

1. **Toujours WP1 d’abord** (et probes diversity/society en parallèle **scripts-only**).
2. **Ensuite** SoT causaux **un WP à la fois**, fichiers chauds sérialisés :
   - `behaviors.ts` : lock orchestrateur (A2/A3/A4/A6/A9)
   - `decide.ts` / `tick.ts` : lock A2/A9
   - `careers.ts` / `livelihood.ts` : lock A3/A7
   - `religion.ts` / `politics.ts` : lock A5/A7
3. **Régression farm/mill/careers** après tout WP touchant `behaviors.ts` / `fields.ts` / `careers.ts` (suite A8 : sow, harvest, grind, bake, profession sync).
4. **Soaks émergence (WP11)** seulement après stabilité mécanisme + harness honesty.
5. **Interdit :** édits parallèles non coordonnés ; buff nourriture/yields ; script `CREATE_*` pour PASS.

---

## 6. À PRÉSERVER (ne pas réécrire)

- Chaîne agricole fermée seed7 (orphan reclaim, farmer lock, `tickFields` grow all WHEAT)
- Fix **sow ∥ clear** (seed1 harvest fragile — ne pas revenir à exclusivité)
- Mill bootstrap **sans** chicken-egg priceUrge flour
- grind / bake LIVE
- `applyProfessionChange` (y compris `buildHouse`)
- Cerveau soft hybride 9 facteurs × softmax (pas de FSM survie pure)
- HARD survival volontaire (eat / empty-bag / freeze / torch / threat) — **expliquer**, pas supprimer
- Mind life-event helpers politics/religion/bandits/interactions
- Ghost spouse hygiene / detachOutcast
- TeachCraft câblé (volume ≠ preuve §27, mais ne pas casser)

---

## 7. Résidus différés (hors Phase 2 early)

| Résidu | Pourquoi différé |
|--------|------------------|
| Counterfactual / SCM / Bayes / MCTS | ABSENT ; vanity interdite sans feed decide |
| Softening night HARD blanket | Gameplay call ; risque farm/froid |
| WebGPU softmax réel | Label only ; honesty CPU suffit |
| Institution treasury riche | Après métriques §35 de base |
| Wars scriptées / CREATE_GUILD | Anti-§39 |
| ToM depth ≥2 | Non bloquant SoT |
| UTF-16 docs SECOND_AUDIT_EMERGENCE | Prefer dumps ; re-encode doc optionnel |
| Social tier 300 si clamp bloque | BLOCKED capacité jusqu’à WP12 |

---

## 8. Gate → Phase 2 (implémentation)

Phase 2 **ouverte uniquement si** :

1. Ce plan est la **seule** feuille de route (agents proposent, n’exécutent pas hors WP approuvé).
2. **Un intégrateur à la fois** sur fichiers listés du WP actif.
3. WP actif = **approuvé explicitement** par l’orchestrateur (ce document + message de go).
4. WP1 (instrumentation + split MECHANISM/EMERGENCE) **terminé ou en cours** avant tout claim PASS mission.
5. Toute PR/mod : checklist régression farm/mill/brain soft/careers si fichiers chauds touchés.
6. **Aucun GLOBAL PASS** tant que scorecard §49 n’a pas ≥90 % PASS aux seuils §20–21 avec preuves fraîches.

```text
PHASE 2 RULE:
No WP without orchestrator GO.
No parallel edits to the same hot file.
No PASS without harness gate.
```

---

## Index des analyses

| Agent | Fichier |
|------:|---------|
| 2 | `ANALYSIS_AGENT2_BRAIN.md` |
| 3 | `ANALYSIS_AGENT3_ECONOMY.md` |
| 4 | `ANALYSIS_AGENT4_FAMILY.md` |
| 5 | `ANALYSIS_AGENT5_SOCIETY.md` |
| 6 | `ANALYSIS_AGENT6_EMERGENCE.md` |
| 7 | `ANALYSIS_AGENT7_INTERCONNECT.md` |
| 8 | `ANALYSIS_AGENT8_TESTS.md` |
| 9 | `ANALYSIS_AGENT9_BEHAVIOR.md` |
| 10 | `ANALYSIS_AGENT10_REVIEWER.md` |

---

*Fin GLOBAL_INTEGRATION_PLAN — orchestrateur Phase 1→2*
