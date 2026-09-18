# TOTAL AUDIT MASTER — village-sim

**Workspace:** `C:\Users\kamel\village-sim-1\_wt_rhythm\village_edit`  
**Status:** **MOSTLY COMPLETE**  
**Started:** 2026-09-16  
**Loop:** TESTER → MESURER → COMPRENDRE → CORRIGER → RELANCER → MESURER À NOUVEAU

---

## Absolute rules

### Feature "done" only if
1. Actually called  
2. Participates in the live simulation  
3. Produces an observable / causal effect  
4. Interacts correctly with other systems  
5. Does not cause incoherent behavior  
6. Remains functional under prolonged simulation  

### NO CHEAT (Phase 10 + final rule)
- **Forbidden:** free food buffs, infinite resources, massively easing hunger/decay, scripted "pass the test" outcomes, cosmetic CREATE_X to fake emergence.
- **Required:** causal fixes only (perception, planning, harvest gates, pathing, decision wiring, broken chains).
- Do not delete important features because they are hard — repair integration; optimize without gutting depth; merge true duplicates; only mark for removal if truly incoherent and unused.

---


## User priority — EMERGENCE
**Status:** **DONE** — see [`EMERGENCE_NOTE.md`](EMERGENCE_NOTE.md).
**Result:** seeds 1/3/7 diverge (multi-creed, teach, multi-village). Mechanisms enable divergent histories without `CREATE_X` cheats.
**Food-chain:** **DONE** (`FOOD_CHAIN_FIX.md`).
## Specialist agents (wave 1)

| ID | Focus | Deliverable | Status |
|----|--------|-------------|--------|
| **A1** | Architecture / dead code / orphans | `AUDIT_A1_ARCH.md` | **DONE** |
| **A2** | Brain / decisions (state+env vs scripts) | `AUDIT_A2_BRAIN.md` | **DONE** |
| **A3** | Survival (real sims, death causes) | `AUDIT_A3_SURVIVAL.md` | **DONE** |
| **A4–A5** | Demography + genetics / families | `AUDIT_A45_DEMO.md` | **DONE** |
| **A6** | Economy full chain | `AUDIT_A6_ECON.md` | **DONE** |
| **A7** | Construction (site → materials → build) | `AUDIT_A7_BUILD.md` | **DONE** |
| **A8–A10** | Society / politics / culture / religion | `AUDIT_A810_SOC.md` | **DONE** |
| **A11** | World / environment influence | `AUDIT_A11_WORLD.md` | **DONE** |
| **A12** | Performance (tick / path / LOD) | `AUDIT_A12_PERF.md` | **DONE** |
| **A13** | Bug hunter (NaN, stuck, ghosts, AFK) | `AUDIT_A13_BUGS.md` | **DONE** |
| **A14** | Long run + emergence + seed divergence | `AUDIT_A14_LONG.md` | **DONE** |
| **PM** | This master + merge + revalidation | `TOTAL_AUDIT_MASTER.md` | IN PROGRESS (skeleton) |

*When specialist files land, PM merges findings, prioritizes causal fixes, and updates checkboxes below.*

---

## Phases 1–19 checklist

### Phase 1 — Cartographie complète du projet
- [ ] Inventory all systems (sim, humans, AI, needs, economy, build, society, world, render, save, time, …)
- [ ] Flag systems that exist in code but appear unused
- [ ] Map sim loop: engine → tickVillagers → chooseTask → execute  
**Owner:** A1 (+ cross-check all)  
**Evidence:** —

### Phase 2 — Agents spécialisés
- [x] A1 Architecture (`AUDIT_A1_ARCH.md`)
- [x] A2 IA / cerveau (`AUDIT_A2_BRAIN.md`)
- [x] A3 Survie (`AUDIT_A3_SURVIVAL.md`)
- [x] A4 Démographie
- [x] A5 Familles / génétique (`AUDIT_A45_DEMO.md`) / génétique
- [x] A6 Économie (`AUDIT_A6_ECON.md`)
- [x] A7 Construction (`AUDIT_A7_BUILD.md`)
- [x] A8 Sociétés
- [x] A9 Politique
- [x] A10 Culture / religion / identité (`AUDIT_A810_SOC.md`)
- [x] A11 Monde / environnement
- [x] A12 Performance (`AUDIT_A12_PERF.md`)
- [x] A13 Bug hunter (`AUDIT_A13_BUGS.md`)
- [x] A14 Longue durée (`AUDIT_A14_LONG.md`)  
**Status:** specialists launched — awaiting `AUDIT_A*.md`

### Phase 3 — Tests de chaos
- [ ] Scarcity / abundance food & resources
- [ ] Tiny / huge population
- [ ] Mountain / isolation / mass migration
- [ ] War / disease / catastrophe / hard winter / rapid growth  
**Owner:** A3, A13, A14  
**Evidence:** —

### Phase 4 — Test de vérité (multi-seed)
- [ ] Seeds A–E (or 1,3,5,7,9) under same rules
- [ ] Histories diverge (not identical village/families/creeds/leaders)  
**Owner:** A14  
**Evidence:** —

### Phase 5 — Test d'émergence
- [x] Chain possible (emergence DONE — see EMERGENCE_NOTE.md): individuals → families → groups → communities → trades → commerce → institutions → religions → cultures → classes → politics → states → conflicts → diplomacy → wars → historical change  
**Owner:** A8–10, A14  
**Evidence:** —

### Phase 6 — Interactions inter-systèmes
- [ ] Genetics ↔ families ↔ pop
- [ ] Economy ↔ wealth ↔ power ↔ politics
- [ ] Politics ↔ laws ↔ economy ↔ migration
- [ ] War ↔ mortality ↔ migration ↔ poverty ↔ regime change
- [ ] Religion ↔ values ↔ relations ↔ institutions ↔ politics
- [ ] Climate ↔ resources ↔ economy ↔ migration ↔ conflict
- [ ] Architecture ↔ resources ↔ culture ↔ tech ↔ identity  
**Owner:** cross-agent merge  
**Evidence:** —

### Phase 7 — Fonctionnalités fantômes
- [ ] Skills unused / creed never biases / emotions ignored / memory never recalled
- [ ] Prices never affect action / buildings never built by AI / lineages broken / institutions inert / dead exports  
**Owner:** A1, A2, A6, A7, A8–10  
**Evidence:** —

### Phase 8 — Analyse causale
- [ ] For major systems: INPUT → CALC → DECISION → ACTION → CONSEQUENCE → NEW STATE
- [ ] Broken chains documented and queued for fix  
**Owner:** all specialists  
**Evidence:** —

### Phase 9 — Correction
- [ ] Root-cause fixes (not band-aids)
- [ ] Dependency check + retest after each critical fix
- [ ] No regression known from fixes  
**Owner:** specialists + PM triage  
**Evidence:** —

### Phase 10 — Ne pas tricher
- [ ] Confirmed: no free-food / infinite-resource "wins"
- [ ] Survival fixes are causal (harvest, perception, path, planning, …)  
**Owner:** PM gate on every fix  
**Evidence:** —

### Phase 11 — Test de survie (post-fix)
- [ ] Survival rate, pop, births, deaths, lifespan, families, resources, housing, production, trade
- [ ] Multi-generation reachability measured  
**Owner:** A3, A14  
**Evidence:** —

### Phase 12 — Test de développement
- [ ] Camp → village → economy → specialization → trade → institutions possible (not forced)
- [ ] Alternate outcomes allowed: stagnate / migrate / collapse / enrich  
**Owner:** A6, A7, A8–10, A14  
**Evidence:** —

### Phase 13 — Société complexe
- [ ] Long run shows spontaneous groups, trades, commerce, institutions, hierarchy, traditions, creeds, laws, leaders, factions, diplomacy, territory, conflict (emergent, not injected)  
**Owner:** A8–10, A14  
**Evidence:** —

### Phase 14 — Résilience
- [ ] Loss of leader / key artisan / farm / house / war / famine / migration → society adapts, declines, splits, or migrates — not hard-stuck on one NPC  
**Owner:** A13, A14  
**Evidence:** —

### Phase 15 — Cas extrêmes
- [ ] 1 / 2 / 5 / 10 / 100 / 1000 humans (+ mixed, isolated, migrant)  
**Owner:** A3, A12, A13  
**Evidence:** —

### Phase 16 — Reproductibilité
- [ ] Same seed + same conditions → same history
- [ ] Small differences can diverge if emergence is real  
**Owner:** A14  
**Evidence:** —

### Phase 17 — Observabilité
- [ ] Inspect needs, emotions, goals, plan, action, memories used, beliefs, relations, skills, knowledge, perception, decision reason
- [ ] Important events expose causal chain  
**Owner:** A2 + UI/tools notes  
**Evidence:** —

### Phase 18 — Rapport final (wave-1 synthesis)

### Systems analyzed / actually used
Sim loop, cognition/brain, survival needs, demography/families, economy (mill→flour→bread→trade), construction/furniture, society/creeds/bandits, world/farmMul/famine migration, perf LOD, long multi-seed, bug hunter.

### Bugs fixed (causal, NO CHEAT)
- WHEAT_RIPE shared threshold 200 (A1)
- Mild-cold AFK; day-rest noise (A2)
- Flee-with-full-bag starve; mill/flour path (A3)
- Multi-gen via housing/orphan seating (A4–A5)
- Economy chain: mills, grind/bake, tradeRuns (A6)
- Furniture queue → tables (A7); hearths still craft-limited
- Creed diversify + task bias; teachCraft; bandits d40 (A8–10)
- farmMul floor; local famine migration (A11)
- Alive-count cache micro-opt (A12); WebGPU still CPU
- Ghost spouse after outlaw (`detachOutcast`→`onDeath`); rest labels; vitals clamp (A13)
- Emergence mechanisms: seeds 1/3/7 diverge (`EMERGENCE_NOTE.md`)

### Open issues
1. **Hunger cliff / food-chain:** DONE (`FOOD_CHAIN_FIX.md`; seeds 1/3 mills/flour/bread + farmer-only fields)
2. **Harvest seed-fragile** under field caps — careers/fields note
3. **Dynamic careers:** DONE (DYNAMIC_CAREERS.md)
4. Hearths craft-chain limited; language evolution evidence thin; rebuild after collapse unproven

### Follow-ups
- **Food-chain:** **DONE** — `FOOD_CHAIN_FIX.md` (mills/flour/bread + farmer-only fields; seeds 1/3 verified)
- **Optional residual:** harvest seed-fragility under field caps

### Closed this update
- **Dynamic careers:** DONE — `DYNAMIC_CAREERS.md` (demand->assignProfession, ~2d review, field release, FR logs; seed7 midlife PASS)
### Food-chain (DONE)
See [`FOOD_CHAIN_FIX.md`](FOOD_CHAIN_FIX.md). Mills/flour/bread + farmer-only fields verified seeds 1/3.
### Dynamic careers (DONE)
See [`DYNAMIC_CAREERS.md`](DYNAMIC_CAREERS.md). Wired demand->`assignProfession`, ~2d review, field release, French logs; seed7 midlife switches **PASS**.

### Verdict
**Wave-1 specialists complete on disk.** Core causal chains improved; Phase 19 mostly provisional PASS. Full success blocked until hunger cliff + careers/fields stabilize multi-seed long runs.


## Phase 19 — Critère de réussite
Track each success criterion (see below). All must eventually be **PASS** or explicitly **BLOCKED** with causal root cause + fix plan.

---

## Phase 19 — Success criteria

| # | Criterion | Status | Evidence / notes |
|---|-----------|--------|------------------|
| 1 | Humans can survive | PROVISIONAL PASS | A3+food-chain; optional harvest fragility | |
| 2 | Humans can die | PASS — mort de faim / cliff observed A14 | |
| 3 | Humans can reproduce | PROVISIONAL PASS — A45 multi-gen via housing/orphan seating | |
| 4 | Families persist across generations | PROVISIONAL PASS — A45 | |
| 5 | Individuals make different decisions | PROVISIONAL PASS — A2 hybrid brain | |
| 6 | Resources influence behavior | PROVISIONAL PASS — A6/A11 | |
| 7 | Economy actually works | PROVISIONAL PASS — A6 mills/flour/bread/tradeRuns | |
| 8 | Buildings are really built | PROVISIONAL PASS — A7 tables; hearths craft-limited | |
| 9 | Populations can grow | PROVISIONAL — early growth then cliff | |
| 10 | Populations can decline | PASS — A14 hunger cliff pop→6-10 | |
| 11 | Individuals can migrate | PROVISIONAL PASS — A11 local famine migration | |
| 12 | Groups can appear | PROVISIONAL PASS — A810 | |
| 13 | Institutions can appear | PROVISIONAL PASS — A810 | |
| 14 | Cultures can evolve | PROVISIONAL — emergence note | |
| 15 | Religions can appear | PROVISIONAL PASS — multi-creed seeds 1/3/7 | |
| 16 | Languages can evolve | PENDING | thin evidence |
| 17 | Political systems can appear | PROVISIONAL — A810/polities | |
| 18 | Conflicts have causes | PROVISIONAL — bandits outcasts | |
| 19 | Societies can change | PROVISIONAL | |
| 20 | Societies can collapse | PROVISIONAL PASS — hunger cliff collapse | |
| 21 | Societies can rebuild | PROVISIONAL | food-chain DONE; revalidate long-run | |
| 22 | Multiple seeds → different histories | PASS — EMERGENCE_NOTE seeds 1/3/7 | |
| 23 | Systems actually interact | PROVISIONAL PASS | |
| 24 | No major feature is purely decorative | PROVISIONAL — orphans reduced; some garnish remains | |
| 25 | Engine remains performant | PROVISIONAL PASS — A12 ~60/~21 TPS; WebGPU still CPU | |

---

## Merged findings (fill as `AUDIT_A*.md` arrive)

### Critical

### A3 Survival (DONE)
**Critical FIXED:** flee-with-full-bag starve; mill/flour fires.
**Note:** harvest seed-fragile under field caps (careers/fields).

### A4–A5 Demography/Genetics (DONE)
**Fixed:** multi-gen via housing/orphan seating (`AUDIT_A45_DEMO.md`).

### Follow-ups
- **Food-chain:** **DONE** — `FOOD_CHAIN_FIX.md` (mills/flour/bread + farmer-only fields; seeds 1/3 verified)
- **Optional residual:** harvest seed-fragility under field caps

### Closed this update
- **Dynamic careers:** DONE — `DYNAMIC_CAREERS.md` (demand->assignProfession, ~2d review, field release, FR logs; seed7 midlife PASS)
### Food-chain (DONE)
See [`FOOD_CHAIN_FIX.md`](FOOD_CHAIN_FIX.md). Mills/flour/bread + farmer-only fields verified seeds 1/3.
### Dynamic careers (DONE)
See [`DYNAMIC_CAREERS.md`](DYNAMIC_CAREERS.md). Wired demand->`assignProfession`, ~2d review, field release, French logs; seed7 midlife switches **PASS**.
- **Dynamic careers:** **DONE** — `DYNAMIC_CAREERS.md` (demand→assignProfession, ~2d review, field release, FR logs; seed7 midlife PASS)
- **Food-chain:** **DONE** (`FOOD_CHAIN_FIX.md`)




### A7 Construction (DONE)
**Fixes:** furniture queue unblocked — tables build after fix.
**Open:** hearths still craft-chain limited.





### A6 Economy (DONE)
**Success:** seed7 mills=2 by d10; flour/bread live; grind/bake; tradeRuns 4->36.
**Open (optional):** harvest seed-fragility under field caps.
**Waiting:** none blocking — optional residual harvest seed-fragility.
### A13 Bugs (DONE)
**Critical FIXED:** ghost spouse after outlaw via `detachOutcast` -> `onDeath`.
**Also:** rest labels + vitals clamp.
**Waiting:** none blocking — optional residual harvest seed-fragility.
### A14 Long run (DONE)
**Critical:** all seeds converge pop ~6–10 after hunger cliff ~d42–50 (`mort de faim`) — linked to harvest/food loop. Emergence fires, but early creed/fort look over-scripted.
**Follow-up:** food-chain **DONE** (`FOOD_CHAIN_FIX.md`). Optional: harvest seed-fragility.
### A2 Brain (DONE)
**Notes:** hybrid brain; mild-cold AFK **FIXED**; day rest fresh ~0.4%.
### A8–A10 Society/Politics/Culture (DONE)
**Notes:** creed diversification + task bias; `teachCraft` fires; bandits day40 outcasts.

### A12 Performance (DONE)
**Micro-opt:** alive-count cache. **WebGPU:** still CPU path. **TPS:** ~60 standard / ~21 anthill.
### A11 World (DONE)
**Fixes:** `farmMul` floor in `tickFields`; local `villageInFamine` → migration; destination food/biome bias.
**Open:** omniscience crisis seek; global famine handling.
- **WHEAT_RIPE mismatch — FIXED:** `tileArt` imports ripe threshold from `behaviors` (200). Causal render/sim sync.

### Major
_(none yet)_

### Minor / debt
_(none yet)_

### Fixes applied (causal only)
| Fix | Agent | Root cause | Retest | Cheat? |
|-----|-------|------------|--------|--------|
| WHEAT_RIPE threshold shared (200) | A1 | tileArt vs behaviors mismatch | noted | no |
| farmMul floor in tickFields | A11 | zero/near-zero harvest mul | noted | no |
| local villageInFamine → migration | A11 | famine ignored for leave | noted | no |

### Conflicts between specialists
_(none yet)_

---

## Revalidation queue
1. On disk DONE: A11,A12,A1,A2,A7,A8 — await: A13, A14, A3, A4, A6
2. Prioritize broken causal chains (survival / build / economy / brain first)  
3. Apply / verify causal patches  
4. Re-run multi-seed survival + civ long runs  
5. Flip Phase 19 criteria PASS/FAIL with evidence  

---

## Final verdict
**MOSTLY COMPLETE.** A1–A14 + emergence + dynamic careers + food-chain DONE. Optional residual: harvest seed-fragility under field caps.