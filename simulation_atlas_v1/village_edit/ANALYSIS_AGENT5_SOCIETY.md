# ANALYSIS AGENT 5 — SOCIÉTÉ

**Workspace:** `C:\Users\kamel\village-sim-1\_wt_rhythm\village_edit`  
**Date:** 2026-09-17  
**Mode:** ANALYSIS ONLY — no code changes  
**Scope:** politics, guilds, religion, culture, bandits, conflicts, institutions  
**User criteria:** §§13–15 (qualitative) + §§34–37 (quantitative minima)  
**Prior audits (history, not gospel):** `AUDIT_A810_SOC.md`, `EMERGENCE_NOTE.md`, `INTERCONNECT_*`, `SECOND_AUDIT_*`

---

## Verdict (executive)

| Layer | Claim | Verdict vs NEW bar |
|-------|--------|-------------------|
| Mechanism | Individus → cercles → institutions / guildes / polities / creeds / bandits | **LIVE (code)** — no `CREATE_X` spawners |
| Decision wiring | Creed / norms / culture / faith bias tasks | **LIVE** via `politicalTaskBias` + stubs biases in `decide.ts` |
| Conflict causes | Bandits / grudges / rivalry / polity claims — not `random()→war` | **LIVE for bandits + soft rivalry**; full wars **deferred** |
| §13–15 qualitative | Emergent society / culture-religion influence / caused conflicts | **PROVISIONAL PASS (code + old probes)** |
| §34–37 quantitative | Groups / institutions / creed chains / conflicts at new minima × 3 seeds | **NOT TESTED** — prior PASS ≠ these thresholds |

**Bottom line:** Society is one of the strongest *mechanism* stacks in the sim (A8–10 + interconnect mind-event fixes). It does **not** yet prove the **new mission minima** (§34–37). Prior probes count end-state circles/institutions and teach/bandit fire-rates; they do **not** measure group longevity, size/activity churn, belief→behavior chains across 2 generations, or conflict-cause taxonomy at scale.

---

## SYSTEMS_ANALYZED

| System | Primary files | Engine hook | Role |
|--------|---------------|-------------|------|
| Circles / norms / institutions / guilds | `src/lib/sim/politics.ts` | `tickPolitics` | Shared-problem groups → harden → enforce |
| Polities (camp→village→chiefdom→kingdom) | `politics.ts` | `tickPolities` inside politics cadence | Soft states, claims, succession, absorption |
| Creeds / beliefs / task bias | `politics.ts` (`politicalTaskBias`, `pickDominantCreed`) | `decide.ts` → `politicalFactor` | Ideology → action multipliers |
| Religion world (shrines, rites, schism, priests) | `src/lib/sim/religion.ts` | `tickReligionWorld` from politics belief cadence | Sacred sites + conversions |
| Religion depth (mind sacred) | `cognition/stubs.ts` `tickReligionDepth` | `cognition/tick.ts` | Per-agent sacredConf / soft creed |
| Culture vectors / tags | `ethnos.ts` + `stubs.tickCultureMutation` | mind tick + `cultureTaskBias` | Homophily, Axelrod-ish borrow |
| Ethnos / language | `ethnos.ts` | `tickEthnosWorld` in `engine.ts` | Dialect drift, ethnogenesis, social bias |
| Bandits / outlaws | `bandits.ts` | `tickBandits` | Outcast → band → raid (day ≥40) |
| Soft war / rivalry | `stubs.tickWarEmergence` + polity rivals | mind tick + politics | Anger/grudge/rivalId; no army war |
| Social confront / feud | `behaviors.ts` + `social.ts` + norms | `chooseTask` / policy | Confront biased by theft rumors, vengeance |
| Teach / craft diffusion | `behaviors` / `interactions` / `technology` + guild norm | tasks | Social learning fire-rate (proven dense) |
| Career culture overlay | `careers.ts` (`isCulturalTitleOverlay`) | profession UI / sacred roles | prêtre / gourou overlay |

**Explicitly out of scope but adjacent:** family/kin (Agent 4), food→price→job (Agent 3), brain softmax authority (Agent 2/7).

---

## CURRENT_ARCHITECTURE

### Emergence pipeline (intended)

```text
individuals (needs, personality, relations, memories)
  → shared problem / bond detection (trySpawnCircles)
  → Circle {kind, members, originStory, norms, values}
  → persistence (INSTITUTION_AGE / problemCount)
  → Institution (+ optional Guild / Council)
  → effects (pooledFood, commons builds, enforcement, teach bias)
  → Polity tier climb from village institutions
  → Creed crystallisation from beliefs + sites + counsel
  → Bandits from grievance/exile (after BANDIT_START_DAY)
  → chronicle / logCause (cause → effect strings)
```

### Decision pipeline (society → action)

```text
chooseTask (options catalogue)
  → pickTaskByPolicy / scoreWithFactors (decide.ts)
  → politicalFactor → politicalTaskBias(state, v, kind, target)
  → cultureTaskBias / religionTaskBias / warTaskBias (stubs)
  → executeTask
```

**Norms that gate behavior (examples):** `share_famine`↑`giveFood`, `punish_theft`↓`steal`↑`confront`, `protect_all`↑`defend`/`buildWall`, `favor_traders`↑`tradeRun`, `teach_apprentice`↑`teachCraft` (×1.45 for guilds).

**Creed branches in `politicalTaskBias` (live):** `partage`, `ordre`, `vengeance`, `protection`, `commerce_libre`, `piete`, `tradition`, `changement` — ritual / counsel / trade / steal / teach / experiment / builds.

### Circle spawn causes (emergent, not CREATE)

| Kind | Trigger (code) |
|------|----------------|
| craft / trade / threat | Co-profession clusters + soft bonds |
| kin | kinship + affinity + optional third |
| hunger | `villagerFeelsFamine` + fairness/hunger pool |
| threat | life-event kinds danger/grief/saved (mind-first helpers) |
| faith | shared piety / sacred / creed lean |
| elder | age + conflict-arbitration role |
| village | commons / settlement cohesion |

**No `CREATE_GUILD` / `CREATE_RELIGION` / `CREATE_WAR`.** Religion schism comment explicitly: peel minority creed into new faith circle.

### Conflict architecture

| Channel | Cause model | Scripted? |
|---------|-------------|-----------|
| Bandit formation | grievance, legitimacy collapse, ambition=revenge, inequalityStress, hunger+poverty, crime memory; prefer `outcasts`; vagabond fallback | Timing gate `BANDIT_START_DAY=40`; early wilderness boost if no band |
| Bandit raid | hunger of band / cooldown / villageRaidScore | Rule-based, not RNG war |
| Confront | rumors of theft, creed vengeance, grievance, outgroup polity rivals | Task option; often rare in short runs |
| Soft rivalry | circle value clash → `mind.rivalId` / grudge | No army / civil war (commented deferred) |
| Polity absorption | claim strength + weak rival capital in claim | Soft territory, not kinetic war |
| Succession tension | ambitious challenger vs ruler | Rumors + legitimacy, rare |

### Culture / religion dual stack

1. **World religion** (`religion.ts`): shrines→chapel→temple, rites, priest recognition, schism, `maybeCrystallizeFaithCreed` / shrine creed inheritance.  
2. **Mind religion** (`stubs.tickReligionDepth`): sacredXY/conf, soft creed pick, overlaps crystallisation.  
3. **Culture:** feature vectors + tags (`ethnos` / mind) → `cultureTaskBias` profession-accent tables; contact borrow; parent seeding.

---

## §§13–15 — Qualitative criteria

### §13 SOCIÉTÉ ÉMERGENTE — `individus → familles → groupes → institutions → sociétés → histoire`

| Check | Status | Evidence |
|-------|--------|----------|
| Groups not arbitrary CREATE | **PASS** | `trySpawnCircles` from shared problems/relations; `noCreateX: true` in society probe |
| Institutions from persistence | **PASS (code)** | `maybeInstitutionalize` age+problems; acute famine/theft shortcuts |
| Societies / polities | **PASS (code + probe)** | camp→…→kingdom; seed7/1 show chiefdoms/kingdoms |
| History written ahead | **Mostly PASS** | Outcomes diverge by seed; **authored** kind/creed enums + thresholds remain |
| Chain depth to “histoire” | **PARTIAL** | Chronicle + logCause exist; multi-gen societal transformation thin in ≤50d windows |

**Caveat (honest):** Space of possible group *kinds* and creed *ids* is authored. Emergence = which ones form, when, and how they bias action — not free invention of novel institution types.

### §14 CULTURE / RELIGION — beliefs influence decisions; experience changes beliefs; generations transmit

| Check | Status | Evidence |
|-------|--------|----------|
| Beliefs → decisions | **PASS (code + bias samples)** | `politicalTaskBias`: piete ritual≈4.3 vs commerce≈2.1; commerce trade 1.4 vs piete 1.12 (`_audit_a810_soc_s7.txt`) |
| Experience → beliefs | **PASS (code)** | rites, counsel, theft/famine hooks, shrine proximity, grievance |
| Transmission | **PASS volume (teach)** | Second audit: teachStarts 2362 (s1) / 1552 (s7) @40d |
| Creed diversification | **PASS multi-seed** | s7 `commerce_libre`+`piete`; s1 `partage`/`tradition`/`piete` (civ audit) |
| Ritual **task** path | **WEAK** | `ritualStarts: 0` in society probe while rite **logs** fire heavily — rite ≠ `TaskKind.ritual` |
| 2+ generations transform | **NOT PROVEN** at mission bar | Short soaks; lineage/ethnos exist but §36 gen gate unmet |

### §15 POLITIQUE / CONFLITS — conflicts have causes; avoid `random()→war`

| Check | Status | Evidence |
|-------|--------|----------|
| Bandit causes | **PASS** | Outcast filters; origins `outcasts` in probes; raids after day 40 |
| Resource / inequality causes | **PASS (code)** | famine circles, inequality norms, labor/SoL theft multipliers |
| Territory / power | **SOFT PASS** | polity rivals, absorption, succession rumors |
| Religion conflicts | **PARTIAL** | faith schism exists; rare as kinetic conflict |
| Vengeance / relations | **PASS (code)** | creed vengeance, grudges, confront rumor bias |
| `random()→war` | **ABSENT** | No war lottery; full war deferred |
| Confront observable | **THIN** | civ s1: `confront=0`, `fight=30`, logHits.war=38 (mostly soft/log) |

---

## §§34–37 — Quantitative minima (NEW bar)

### §34 GROUPES

**Required:** ≥20 groups; ≥10 surviving ≥20 days; ≥5 size changes; ≥5 activity changes; 3 seeds; ≥50% identifiable emergent cause.

| Metric | Prior evidence | Verdict |
|--------|----------------|---------|
| Count ≥20 | s7 d50 circles=21; s1 d50 circles=24 | **CODE-ONLY count PASS on 1–2 seeds** |
| Survive ≥20d | **not instrumented** | **NOT TESTED** |
| Size / activity changes | **not instrumented** | **NOT TESTED** |
| 3 seeds | society probe mostly seed 7; emergence seeds 1+7 only | **INCOMPLETE** |
| ≥50% emergent cause | originStory always set on create; % not audited | **LIKELY true in code; NOT MEASURED** |

### §35 INSTITUTIONS

**Required:** ≥10 institutions; ≥5 survive ≥30d; ≥3 types; demonstrate `origine → membres → activité → ressources → évolution`.

| Stage | Status | Notes |
|-------|--------|-------|
| origine | **LIVE** | `originStory` + `logCause` |
| membres | **LIVE** | `memberIds`, recruit/prune |
| activité | **LIVE** | commons, rites, guild teach drip, enforcement |
| ressources | **PARTIAL** | `pooledFood` soft quota; no full treasury/ledger |
| évolution | **PARTIAL** | guild/council promote, polity climb; longevity unmeasured |
| Count ≥10 | **PASS** s7 inst=20 @d50 | End-state count only |
| Survive ≥30d / 3 types | **NOT TESTED** | Need typed lifetime histogram |

### §36 CULTURE / RELIGION

**Required:** ≥20 transmissions; ≥10 belief changes; ≥10 influenced behaviors; 2 generations; 3 seeds; ≥10 complete chains `croyance→transmission→acquisition→comportement`.

| Metric | Prior | Verdict |
|--------|-------|---------|
| Transmissions | teachStarts ≫20 | **PASS volume (teach)** — not full creed-chain counter |
| Belief changes | creedLog=98 s7; creed switches logged | **PARTIAL** — log ≠ structured change counter |
| Influenced behaviors | bias samples + task mults | **CODE PASS**; runtime attribution sparse |
| 2 generations | short runs | **NOT TESTED** |
| 3 seeds + 10 full chains | no probe | **NOT TESTED** |
| Ritual task as behavior proof | ritualStarts=0 | **GAP** — use rite/counsel/trade biases instead |

### §37 CONFLITS

**Required:** ≥20 conflicts; ≥10 participants; ≥5 distinct causes; 3 seeds; ≥70% identifiable cause; **FAIL** if >20% essentially random.

| Metric | Prior | Verdict |
|--------|-------|---------|
| Cause model | Bandit/outcast/grievance/theft/rivalry | **PASS design** (not random war) |
| Volume ≥20 × 3 seeds | band raids few (4 @60d s7); confront often 0 | **NOT MET / NOT TESTED at bar** |
| Cause taxonomy ≥5 | code supports many; probe doesn’t classify | **NOT TESTED** |
| Random share | no lottery war | **Unlikely FAIL on randomness**; may FAIL on **volume/rarity** |

---

## PROBLEMS

1. **New thresholds unmeasured** — `_probe_society.ts` / second-audit emergence do not track group lifetime, size/activity deltas, creed-chain completeness, or conflict-cause histograms.  
2. **Ritual task vs rite path split** — shrine/circle rites fire; `TaskKind.ritual` starts stay ~0 → weak proof that creed biases the *chosen* ritual task.  
3. **Dual creed crystallisation** — `religion.ts` + `stubs.tickReligionDepth` both assign creeds; race/ownership documented as soft risk in interconnect audits.  
4. **Conflict kinetic thin** — rivalry/war mostly mind + logs; confront rare; civil/international war deferred in `politics.ts` header.  
5. **Bandit start day hard gate** — emergence *of people* is causal, but *when* bands appear is scripted (`BANDIT_START_DAY=40`) + early wilderness fallback.  
6. **Institution resources shallow** — `pooledFood` is a soft signal/transfer, not a durable institutional economy.  
7. **Culture tags vs ethnos** — `cultureTaskBias` uses coarse tags (`blé`,`bois`,…); ethnos identity weight slower; teach→ethnos identity still thin (interconnect).  
8. **Prior A810 PASS over-claim risk** under §34–37 — end-state counts ≠ longevity / multi-seed / chain completeness.  
9. **Pop crash after bandits** — s7 society d50 pop 16; survival coupling (Agent 3) can starve society observation windows.  
10. **`feelFamine` residual** — some politics/bandit/ethnos paths historically read global `state.famine`; interconnect notes leftover raw reads (verify before claiming crisis-coherent society).

---

## ISOLATED_SYSTEMS

| Item | Isolation type | Impact |
|------|----------------|--------|
| Full civil / international war | Deferred stubs | §15/§37 “politics→war” incomplete |
| `TaskKind.ritual` fire-rate | Parallel to rite logs | Belief→ritual-task chain weak |
| Ethnos ethnogenesis ↔ guilds | Weak coupling | Culture change slow vs institutions fast |
| Gossip legacy-only | Social rumor path | Society memory dual (note from second audit) |
| `careerDemandForProfession` export | Dead export | Irrelevant to society live path |
| Web/UI group panel | Observability only | Does not affect emergence |

**Not isolated (good):** guild `teach_apprentice` → skills; creed → `politicalTaskBias`; bandits ← grievance; hunger circles ← famine feel; polities ← institutions.

---

## MISSING_CONNECTIONS

1. Instrumentation: circle `formedTick`→death, membership deltas, `lastActiveTick` churn → §34 harness.  
2. Creed change events → subsequent task choice attribution → §36 chain counter.  
3. Conflict event bus (confront/raid/succession/schism/absorption) with cause enum → §37.  
4. Stronger religion→politics (schism → polity rivalry / exile) beyond soft peel.  
5. Institution treasury ↔ commerce prices (beyond soft `politicalPriceBias`).  
6. Unify rite practice into decision catalogue (or count rite as influenced behavior).  
7. Generation-aware creed inheritance metrics (parent creed → child behavior @age).  
8. Complete remaining `state.famine` → `feelFamine(village)` in society-adjacent readers.

---

## DUPLICATES

| Duplicate | Owners | Risk |
|-----------|--------|------|
| Creed crystallisation | `religion.maybeCrystallizeFaithCreed` / shrine path / `stubs.tickReligionDepth` / politics `crystallizeCreed` | Double-assign or thrash |
| Sacred site confidence | village shrine fields vs `mind.sacred*` | Drift if one path skipped |
| Rivalry | `tickWarEmergence` rivalId vs polity `rivalPolityIds` vs personal grudge | Overlapping soft wars |
| Culture identity | mind `cultureTag` vs ethnos `identity.*` vs creed | Fragmented “who I am” |
| Memory readers (fixed hot path) | legacy `v.memories` vs mind episodic | Was isolate; helpers now mind-first on politics/religion/bandits |

---

## EVIDENCE

### Code (emergence vs spawn)

- Circles: `politics.ts` `trySpawnCircles` / `createCircle` / `maybeInstitutionalize` / `promoteToGuild` / `promoteToCouncil`.  
- Grep: no `CREATE_GUILD|CREATE_RELIGION|CREATE_WAR|CREATE_FACTION` spawners; only comment “no CREATE_RELIGION”.  
- Decision: `decide.ts` `politicalFactor` → `politicalTaskBias`; also `cultureTaskBias`, `religionTaskBias`, `warTaskBias`.  
- Bandits: `isOutcastCandidate` grievance/inequality; `BANDIT_START_DAY=40`; `tickBandFormation` prefers outcasts.  
- Engine order: combat → `tickBandits` → … → `tickPolitics` → `tickEthnosWorld`.

### Probe dumps (prior, smaller bar)

| File | Signal |
|------|--------|
| `_audit_a810_soc_s7.txt` | d50: circles21 inst20 guilds2; multi-creed; teachStarts123; biasSamples; PASS; `noCreateX` |
| `_audit_a810_civ_s1.txt` | creeds partage/tradition/piete; shrines labeled by creed; polities kingdom/chiefdom; confront=0 |
| `_audit_a810_bandits2_s7.txt` | first band d40; outcasts=1; raids=4; camp TP=0 |
| `_second_audit_s1.txt` / `_s7.txt` | banditsEnd 3/2; teachStarts 2362/1552; ghost spouses 0; OVERALL PASS @40d |
| `AUDIT_A810_SOC.md` | Documents creed monoculture fix, piete bias fix, bandit day 40, teach pupil fix |

### What evidence does **not** show

- Group survival ≥20 days counts  
- Institution survival ≥30 days  
- ≥10 complete belief→behavior chains with generation depth  
- ≥20 classified conflicts × 3 seeds with cause %  
- Ritual task starts as proof of creed influence  

---

## PROPOSED_FIXES (analysis only — do not implement here)

**P0 — prove §34–37 without cheating**

1. Extend `_probe_society.ts` (or new `_probe_society_thresholds.ts`) to track:  
   - circle lifetime, peak/min members, activity (`lastActiveTick`) changes  
   - institution type histogram + age≥30d  
   - creed change events + post-change task picks (chain)  
   - conflict events {raid,confront,schism,succession,absorb,theft_feud} + cause tag  
   - run seeds {1,3,7} minimum (mission later wants 10 for §38)  
2. Attribute “influenced behavior” via delta of `politicalTaskBias` or chosen task when creed/norm present — not only biasSamples snapshots.

**P1 — causal coherence**

3. Decide single owner for creed crystallisation (prefer `religion.ts` + politics beliefs; stubs only update sacredConf).  
4. Either boost `ritual` task offers near shrines **or** formally count circle rites as ritual behavior for §36.  
5. Finish `feelFamine` conversion on remaining society readers.  
6. Soften or document `BANDIT_START_DAY` as founding-settling heuristic; keep outcast causality as primary (avoid vagabond-only stories).

**P2 — deepen institutions / conflicts**

7. Institutional resources beyond `pooledFood` (shared tools/stock) if §35 “ressources” must be visible.  
8. Escalate soft rivalry → rare confront/raid with logged cause (still no `random()→war`).  
9. Wire schism → grievance/outcast pipeline for religion-caused conflict.

**Anti-patterns (do not do)**

- `CREATE_INSTITUTION` / force creed spawn to “pass” counts  
- Buff food to keep pop high only for society probes  
- Script wars on a day timer  

---

## FILES_TO_MODIFY (if later implementing)

| File | Why |
|------|-----|
| `scripts/_probe_society.ts` (+ new threshold probe) | §34–37 metrics |
| `src/lib/sim/politics.ts` | optional lifetime stats hooks; famine feel leftovers; rivalry→confront |
| `src/lib/sim/religion.ts` / `cognition/stubs.ts` | unify creed ownership |
| `src/lib/sim/behaviors.ts` | ritual task offer near shrine / teach already dense |
| `src/lib/sim/bandits.ts` | only if start-day / cause logging needs richer tags |
| `src/lib/sim/cognition/decide.ts` | optional why-factor tags for creed/norm (observability) |
| `AUDIT_A810_SOC.md` / master scorecards | reclassify PASS → PARTIAL/NOT TESTED under new bar |

---

## DEPENDENCIES

```text
engine.stepSimulation
  ├─ tickBandits ← politics grievance / inequality / detachOutcast
  ├─ tickPolitics
  │    ├─ tickIndividualPolitics / migration
  │    ├─ tickReligionWorld
  │    ├─ trySpawnCircles ← famine feel, life events, professions, kin
  │    ├─ institutionalize / guilds / pooledFood / commons
  │    └─ tickPolities ← institutions, claims, succession
  ├─ tickEthnosWorld ← culture tags / rivals
  └─ tickVillager → tickCognition (culture/religion/war stubs)
       └─ chooseTask → decide (political/culture/religion/war biases)
            └─ economy / careers / construction (norms & creed multipliers)
```

**Upstream:** survival (pop window), careers (craft circles), mind memory helpers.  
**Downstream:** chronicle, UI Société, tech teach counts, bandit pressure on guard careers.

---

## POSSIBLE_CONFLICTS

| Conflict | Agents / systems | Resolution note |
|----------|------------------|-----------------|
| Bandit onset vs survival PASS | Society ↔ Survival/Econ | Don’t disable bandits to pass food; measure society *and* deaths |
| Ritual boost vs famine hard gates | Society ↔ Brain/Survival | `politicalTaskBias` already zeros soft tasks under hunger/famine |
| Creed owner unification | Religion stubs ↔ religion.ts | Orchestrator picks one writer |
| Confront escalation | Society ↔ Combat balance | Keep cause-tagged; avoid slaughter loops (A3 pop cliff) |
| Threshold probes length (≥30d institutions) | Tests ↔ Perf | Stagger sampling; reuse CIRCLE_TICK cadence |
| Agent 6 emergence scale (§20 100 NPC) | Society counts scale nonlinearly | Re-run society thresholds at new pop/day bar — don’t inherit A810 PASS |

---

## Scorecard vs mission (§§13–15, 34–37)

| § | Title | Code mechanism | Old probe PASS | NEW quantitative bar |
|---|-------|----------------|----------------|----------------------|
| 13 | Société émergente | **PASS** | A810 PASS | Qualitative OK; longevity unproven |
| 14 | Culture / religion | **PASS** (bias+teach) | A810 PASS | Chains/gens **NOT TESTED** |
| 15 | Politique / conflits | **PASS** causes; war deferred | Bandits PASS | Volume/taxonomy **NOT TESTED** |
| 34 | Groupes | Counts often ≥20 | Count only | **NOT TESTED** |
| 35 | Institutions | Counts often ≥10; 3+ kinds exist | Count only | **NOT TESTED** |
| 36 | Culture/religion qty | Teach dense; creed bias live | Teach PASS | **NOT TESTED** |
| 37 | Conflits qty | Causes live; confront thin | Bandit raids few | **NOT TESTED** / likely **FAIL volume** |

---

## Logs utilisateur (this pass)

No live Vite/Electron soak for this analysis. Relied on existing dumps: `_audit_a810_soc_s7.txt`, `_audit_a810_civ_s1.txt`, `_audit_a810_bandits2_s7.txt`, `_second_audit_s1.txt`, `_second_audit_s7.txt`, plus source of `politics.ts` / `religion.ts` / `bandits.ts` / `ethnos.ts` / `cognition/stubs.ts` / `decide.ts` / `engine.ts`.

---

## Closing judgment

Society is **mechanically emergent** along `individus → groupes → institutions → polities/creeds/bandits`, with **real decision influence** (especially norms + creed task bias + guild teach). It is **not** yet proven against mission §§34–37. Treat A8–10 / second-audit society signals as **CODE + small-window PASS**, and mark §34–37 as **instrumentation + multi-seed soak debt** before any new PASS claim.
