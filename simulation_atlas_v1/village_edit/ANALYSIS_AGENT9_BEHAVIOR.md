# ANALYSIS_AGENT9_BEHAVIOR — Qualité comportementale (pas FPS)

**Agent:** 9 — PERFORMANCE SIMULATION / qualité comportementale  
**Workspace:** `village_edit`  
**Mode:** ANALYSIS ONLY (aucun changement de gameplay)  
**Date:** 2026-09-17  
**Critères mission:** §§23 (diversité des décisions) · §40 (anti-loop) · résidu §18 LOD cognition  

---

## SYSTEMS_ANALYZED

| Système | Fichiers | Rôle pour la qualité comportementale |
|---|---|---|
| Sélection de tâche | `behaviors.ts` `chooseTask` | Catalogue d'options + portes HARD + anti-AFK |
| Politique soft | `cognition/decide.ts` `pickTaskByPolicy` | 9 facteurs × softmax (+ imagination 1-step) |
| Survie / rythme | `tryAssignSurvivalTask`, `forceBiologicalRhythm`, mid-tick interrupts | Must-fires qui court-circuitent le soft |
| Repos / AFK | rest scoring, `softAfkStreak`, wake daytime, rest commute | Anti-plaza-nap + stamina economy |
| Exécution / stuck | `executeTask` navigation, `stuckTicks`, `STUCK_LIMIT` | Déblocage pathfinding / timeout |
| Cognition LOD | `cognition/tick.ts`, `perfBudget.ts` / `budget.ts` | fast vs deep, `allowDeepThink` |
| Perception LOD | `cognition/sensing.ts` | Local → mémoire → blind court |
| Apprentissage | `recordTaskOutcome`, habits/prefs/skills | Feedback sur succès / stuck |
| Ambition duale | `ambitionBonus` + `mind.goal` / `goalTaskModifier` | Deux leviers d'intention |
| Preuves live | `scripts/probe-afk.ts`, audits A2/A13, `BRAIN_CYCLE_REPORT.md` | Tick-share, AFK, stuck |

---

## CURRENT_ARCHITECTURE

### Boucle agent (réelle)

```
tickVillager
  mid-tick interrupts (eat / chest / empty-bag / ripe / day-wake / cold / night shelter)
  if !task:
    forceBiologicalRhythm  → HARD survival / homeless freeze
    else tickCognition(fast|deep) + chooseTask
  executeTask
    stuckTicks / ageTicks / rest-commute abort
  on end: recordTaskOutcome → rethink (pas d'auto-idle perpétuel)
```

### Soft path (`chooseTask`)

1. Construit un **catalogue authored** via `add(kind, …)` (env, famine locale `feelFamine`, sense LOD, rest gated).
2. HARD empty-bag avant softmax (`tryAssignFoodSeek`).
3. `pickTaskByPolicy` = `baseScore × product(9 facteurs)` + top-3 imagination + softmax température.
4. **Anti-AFK:** si `idle|rest` streak ≥ `SOFT_AFK_HARD_AFTER` (3) → food / ripe / sinon re-softmax **sans** idle/rest (jour, non épuisé).

### Rest / AFK (état actuel)

- **Jour:** `restScore = 0` si non tired et pas d'exposition réelle (`dayEnvRest`); sinon dampers forts.
- **Nuit:** restNeed élevé → repos légitime (~93–95 % night rest).
- **Commute rest:** abort outdoor walk-home de jour si pas d'exposition réelle ; stuck≥5 → pause dehors courte.
- **Wake:** rest diurne + stamina ≥ tired → null/rethink ou assign mill/craft (script soft).

### Cognition LOD

| Profondeur | Quand | Contenu |
|---|---|---|
| **fast** | chaque think si pas deep | needs, émotions light, WM/GWT, conscience compacte, `perceiveLocal` |
| **deep** | `shouldDeepThink` | goals/plan, ToM, memory decay, ethnos/culture stubs, selfModel, habits rust |

Budget (`perfBudget.ts`): `deepPeriod` 5–22, `deepShare` 0.18–0.85 selon TPS ; `allowDeepThink(id,tick)` hash ; leaders/grievance plus fréquents.

### Mapping §23 / §40 (ce que le code mesure déjà vs manquant)

| Métrique mission | Instrumenté aujourd'hui ? | Proxy disponible |
|---|---|---|
| `unique_task_types` | Non (pas de compteur run) | `probe-afk` tick-share / top starts |
| `task_entropy` | Non | Estimable depuis byKind |
| `average_tasks_per_npc` / switches | Partiel (`starts` dans probe-afk) | — |
| `repeated_sequence_count` (§40) | **Absent** | À instrumenter |
| Soft-AFK streak | Oui (module Map) | Anti-loop local idle/rest |
| stuckTicks | Oui | Anti-stuck path |

---

## PROBLEMS

Classés par les six axes Agent 9 + seuils §§23/40.

### P1 — Boucles répétitives (soft + scripts)

1. **Rest ↔ labor fatigue loop** — travail intense (`buildProject`) → tired → rest → wake → même chantier. Légitime stamina, mais domine le tick-share (rest ~46 %, buildProject ~10–13 % sur 8j). Risque §23 « tâche non urgente >70 % » **non atteint** au global, mais **rest+buildProject** ≈ 55–60 % du temps total (nuit incluse) → trajectoire monocorde pour beaucoup d'agents.
2. **Anti-AFK = filet script** — après 3 idle/rest, re-pick sans facteurs « why » de crise ; utile, mais ce n'est pas une variation de but (§40 objectif secondaire).
3. **Wake mill/craft hard-assign** — sortie de rest diurne peut **sauter** softmax et forcer moulin/pierre/bois ; boucle infrastructure scriptée.

### P2 — PNJ bloqués

4. **Path stuck** — `STUCK_LIMIT` ~10 ; A13: maxStuck 7–9, long≥14 = 0. **Pas de lock critique** observé.
5. **Rest outdoor AFK** — largement mitigé (A2/A13) ; probe 2026-09-17: day idle ≤1.5 %, day work 63–69 %.
6. **Null-task cooldown** — volontairement pas d'idle auto ; brief hold possible si `nextThinkTick` futur et non-crise → micro-trous (rare), pas plaza lock.

### P3 — Informations ignorées

7. **HARD survival sans `whyFactors`** — eat / chest / torch / freeze `setTask` direct ; `noteChosenAction` texte libre seulement → UI « pourquoi » incomplet (§18 résidu).
8. **`v.ambition` vs `mind.goal`** — `ambitionBonus` lit encore l'ambition legacy ; goals deep-only. Sous LOD low-TPS, goals stagnent → facteurs `values_plan` faibles / périmés pendant que ambitionBonus tire autrement.
9. **Catalogue authored** — le cerveau ne peut pas inventer un TaskKind absent du menu `add(...)` ; info sociale/éco n'ouvre pas d'actions hors catalogue.
10. **Omniscience crise** — `tryAssignFoodSeek` / wake mill utilisent parfois `findNearest` / rayons larges hors `senseResource` LOD.

### P4 — Cognition inactive

11. **Deep rare sous charge** — `deepShare` peut tomber à ~0.18 et `deepPeriod` monter à 22 + popScale → beaucoup d'agents restent en **fast forever** : pas de re-pickGoal, ToM, plan rebuild. Needs/emotions avancent ; **buts et apprentissage profond ralentissent**.
12. **Fast path coupe goals** — `tickCognition` fast return avant `pickGoal` ; seul damp commitment hunger/stress.
13. **Learn partial on HARD** — `recordTaskOutcome` tourne à la fin d'execute ; HARD mid-tick change de tâche peut tronquer l'outcome de la tâche stashed (selon chemin).

### P5 — Comportements trop uniformes (§23 / §40)

14. **Seeds 1/7/42 convergent** sur le même cocktail: rest nuit + buildProject + gather* + (mill/harvest selon seed). Diversité TaskKinds **oui** (≥5 kinds) ; trajectoires distinctes **partielles** (seed42 harvest/buildHouse plus fort ; seed1 tradeRun visible).
15. **Pas de mesure séquence** — impossible de dire si ≥80 % répètent la même séquence >7j (§23 FAIL) ou si <50 % bloqués même boucle >14j (§40) sans nouvel instrument.
16. **Objectif secondaire stable (§40 ≥20 %)** — non prouvé ; survival + buildProject monopolisent l'attention ; leisure gated famine/hunger.

### Verdict provisoire §§23 / §40 (CODE + probe court, pas 30j multi-NPC sequences)

| Critère | Lecture | Statut |
|---|---|---|
| §23 ≥5 TaskKinds utilisés | probe: rest, build*, gather*, harvest, sow, grind, experiment, … | **PASS (proxy)** |
| §23 ≥3 trajectoires | seeds divergent un peu (harvest vs trade vs house) | **PARTIAL** |
| §23 ≥30 % changent si variable change | non testé A/B ce pass | **NOT TESTED** |
| §23 aucune non-urgente >70 % | rest global ~46 % mais nuit ; day work ~65 % | **PASS soft / PARTIAL nuit** |
| §23 ≥80 % même séquence >7j | non mesuré | **NOT TESTED** |
| §40 ≥30 % variation / 30j | non mesuré (8j only) | **NOT TESTED** |
| §40 <50 % même boucle >14j | stuck path OK ; boucle fatigue non séquencée | **PARTIAL (stuck) / NOT TESTED (sequences)** |
| §40 ≥20 % objectif secondaire si survie stable | non mesuré | **NOT TESTED** |

---

## ISOLATED_SYSTEMS

| Item | Pourquoi « isolé » pour la qualité comportementale |
|---|---|
| Métriques §23/§40 | Aucun compteur `repeated_sequence` / entropy dans engine ou probes |
| Soft-AFK Map module | État hors `SimState` — non snapshoté / non auditable multi-run |
| WebGPU softmax label | Backend tagué ; chemin réel CPU (`batchSoftmaxSelect`) — vanity perf, pas qualité |
| ToM depth ≥2 | Absent — social factor mince → uniformité sociale |
| Imagination 1-step | Présente mais lite ; n'ouvre pas de nouvelles boucles de vie |

---

## MISSING_CONNECTIONS

1. **Goal deep → ambitionBonus** — sync existe (`syncAmbitionAndGoal`) mais scoring catalogue utilise encore `v.ambition` en parallèle ; sous LOD fast-only, décalage.
2. **HARD assigns → factor why / consciousAccess** — survival n'écrit pas `lastFactorWhy` structuré.
3. **LOD deepShare → diversity gates** — quand TPS chute, deep tombe : exactement quand la population a besoin de replan (crise) les buts se figent.
4. **Probe-afk → §40 sequences** — probe compte kinds/starts, pas n-grammes de séquences par NPC sur 14–30j.
5. **Secondary goals when safe** — needs boredom/creative poussent `build` concern, mais catalogue + survival dampers limitent émergence d'objectifs secondaires mesurables.

---

## DUPLICATES

| Doublon | Effet comportemental |
|---|---|
| `v.ambition` + `mind.goal` | Deux intentions ; risque d'uniformité métier legacy |
| Legacy `v.memories` + mind semantic/episodic | Sensing préfère mind ; legacy fallback — OK mais dual |
| Soft harvest factor + mid-tick `tryAssignRipeHarvest` | Double chemin anti-loop moisson (voulu) |
| Night rest soft (chooseTask) + HARD assignRestTask storm/cold | Chevauchement abri |
| `jobBonus` métier + `livelihoodTaskBonus` | Overlay OK ; peut homogeniser si livelihood converge |

---

## EVIDENCE

### Code (causal)

- Anti-AFK: `SOFT_AFK_HARD_AFTER = 3`, re-softmax sans idle/rest — `behaviors.ts` ~532–543, ~3927–3960.
- Day rest gate (anti mild-cold AFK): ~3699–3709.
- Rest commute abort: ~4158–4178.
- Daytime wake from soft rest: ~5824–5928.
- No perpetual midday idle auto-reassign: ~6178–6184.
- LOD: `shouldDeepThink` / `allowDeepThink` — `cognition/tick.ts` ~467–477 ; `perfBudget.ts` ~67–122.
- Sensing LOD: `LOCAL_PERCEIVE_R=22`, `SHORT_SEARCH_R=36` — `sensing.ts`.
- HARD without factor why: `tryAssignSurvivalTask` ~1963–2017 vs soft `pickTaskByPolicy` whyFactors ~699–705.
- Stuck handling: `stuckTicks` / `STUCK_LIMIT` — execute + tickVillager ~6113–6132.

### Probes live (ce pass, 2026-09-17)

```text
probe-afk seed=7 days=8
  tick share: rest:45.8%, buildProject:11.1%, gatherFood:7.7%, gatherStone:7.5%,
              grindFlour:6.6%, harvestWheat:6.1%, sowField:3.4%, buildMill:2.3%, …
  day rest 11.1% idle 1.4% work 64.5% | night rest 94.2%

probe-afk seed=1 days=8
  day rest 15.2% idle 1.5% work 63.5% | night rest 92.0%
  tradeRun:2.7% visible

probe-afk seed=42 days=8
  day rest 11.5% idle 0.0% work 69.3% | night rest 94.8%
  harvestWheat:9.8%, buildHouse:6.5%
```

### Audits antérieurs (cohérents)

- **A2:** fresh day AFK ~0.1–0.4 % après fix mild-cold ; soft-AFK net conservé.
- **A13:** stuck long=0 ; outdoor day-rest ~3–7 % ; pas de plaza AFK critique.
- **BRAIN_CYCLE_REPORT:** HARD bypass listés ; whyFactors manquants sur survival.

### Axes Agent 9

| Axe | Verdict court |
|---|---|
| Boucles répétitives | Fatigue↔build dominant ; anti-AFK OK pour plaza |
| Décisions inutiles | Softmax riche ; wake mill = décisions scriptées |
| PNJ bloqués | Stuck path non critique |
| Infos ignorées | HARD opaque ; ambition/goal dual ; catalogue plafond |
| Cognition inactive | Fast-only sous LOD bas → goals figés |
| Uniformité | Kinds divers ; trajectoires PARTIAL ; séquences NOT TESTED |

---

## PROPOSED_FIXES

*Propositions pour l'orchestrateur — ne pas appliquer ici.*

### F1 — Instrumenter §§23/40 (P0 mesure)

Ajouter un probe `scripts/probe-behavior-diversity.ts` :

- par NPC: n-grammes de TaskKind (fenêtre 1j), entropy, switches/jour ;
- flags: same-sequence >7j / >14j ;
- secondary-goal: `mind.goal.id` hors `survive`/`rest` quand hunger/stamina OK ;
- LOD counters: % thinks fast vs deep.

Sans ça, PASS/FAIL §23/§40 restent des conjectures.

### F2 — Unifier intention (P1)

- Scoring: préférer `mind.goal` (+ sync) ; `ambitionBonus` = alias ou personality label only.
- Sur fast ticks: micro-refresh goal commitment / skip stuck plan step déjà partiel — étendre léger `advancePlan` sans full deep.

### F3 — HARD whyFactors (P2 auditabilité)

- `noteChosenAction(..., whyFactors: ['HARD','survive',…])` pour eat/chest/freeze/torch/foodSeek.
- Ne pas soft-maxer la survie ; seulement expliquer.

### F4 — Anti-loop qualité (pas seulement anti-AFK) (P1)

- Habit dampening si même kind >N jours sans besoin critique (entropy floor dans température ou penalty `stress_habitude`).
- Quand survie stable: boost consciousAccess boredom/creative / secondary goals (déjà partiellement câblé — vérifier fire-rate).

### F5 — LOD sous crise (P1)

- `allowDeepThink` force true si `bagEmptyFoodCrisis` / famine locale / grievance haute (au-delà du stagger actuel).
- Éviter deepShare 0.18 pendant famine (besoin de replan).

### F6 — Réduire wake mill script (P2)

- Remplacer hard-assign réveil moulin par boost catalogue + rethink soft (garder interrupt food/ripe).

### Non-fixes (ne pas toucher sans preuve)

- Rest nuit ~94 % — physiologie OK.
- Soft-AFK streak — garder jusqu'à preuve entropy OK.
- STUCK_LIMIT — ne pas baisser sans probe stuck regress.

---

## FILES_TO_MODIFY

| Priorité | Fichier | Changement proposé |
|---|---|---|
| P0 | `scripts/probe-behavior-diversity.ts` (nouveau) | Métriques §23/§40 |
| P1 | `behaviors.ts` | whyFactors HARD ; ambition→goal ; wake mill soft |
| P1 | `cognition/decide.ts` | entropy floor / habit anti-loop soft |
| P1 | `cognition/tick.ts` + `perfBudget.ts` | deep sous crise |
| P2 | `scripts/probe-afk.ts` | étendre entropy + outdoor day-rest |
| P2 | `cognition/goals.ts` | secondary goal quand safe |

---

## DEPENDENCIES

```text
perfBudget / LOD  →  profondeur goals/ToM  →  diversité long terme (§23/40)
chooseTask catalogue  →  plafond TaskKinds possibles
HARD survival  →  survie OK, diversity/why partiels
softAfk + day rest gates  →  anti-plaza (qualité courte)
recordTaskOutcome  →  habits  →  risque homogenisation si RPE monotone
economy/fields (mill, ripe)  →  wake scripts + harvest interrupts
Agent 7 interconnect (ambition/famine dual)  →  même surface intention
Agent 8 tests  →  doit adopter seuils §23/40 une fois instrumentés
```

---

## POSSIBLE_CONFLICTS

| Conflit | Avec qui | Mitigation |
|---|---|---|
| Forcer deep sous famine ↑ coût tick | Agent perf FPS / A12 | Cap deepShare crisis slice, pas deepShare=1 |
| Habit anti-loop ↓ spécialisation | Agent métiers / careers | Penalty seulement si besoin bas + même kind long |
| Soft-iser wake mill | Agent économie food-chain | Garder boost score fort, pas silence |
| Unifier ambition/goal | Agent cerveau / interconnect | Orchestrateur sole owner API intention |
| whyFactors HARD | Reviewer « faux soft » | Label explicite `HARD` — ne pas prétendre softmax |
| Mesures 30j lourdes | Agent tests | Sample NPCs / jours, pas full O(n×t) logs |

---

## SYNTHÈSE AGENT 9 (qualité, pas FPS)

**Ce qui marche:** anti-AFK diurne, rest gated sur fatigue/exposition, stuck path non critique, soft policy riche, ≥5 TaskKinds vivants, day work ~63–69 %.

**Ce qui limite l'autonomie comportementale:** (1) absence d'instrumentation séquences §§23/40, (2) LOD deep qui s'étiole sous charge exactement quand les buts devraient bouger, (3) dual ambition/goal + HARD opaques, (4) boucle fatigue↔buildProject encore dominante, (5) objectifs secondaires non prouvés en survie stable.

**Plus gros levier unique:** instrumenter + faire remonter deep/goal sous crise et stabilité (F1+F5+F2), avant d'ajouter de nouveaux TaskKinds.
