# AUDIT_A14 — Long duration + emergence + seed divergence

**Agent:** 14  
**Scope:** `audit-civilization` seeds **1, 3, 5, 7, 9** × **90 days** × world **600×600**  
**Runtime:** ~94 s/seed (total ~8 min)  
**Artifacts:** `scripts/_civ_audit_report_d90_w600.txt`, `scripts/_civ_audit_report_d90_w600.json`, `scripts/_probe_a14_gens.json`, `scripts/_probe_a14_famine.ts`  
**Code fixes this pass:** none (no total-extinction wipe; mid-run famine is systemic / known food-loop failure — not nerfed)

---

## Verdict

Emergence **fires** (creeds, forts, polities, bandits, guilds, roads, clearing). Histories are **not clones**, but **early beats are over-scripted** and **late outcomes converge** on a thin survivor band (pop 6–10) after a shared ~day 42–50 hunger cliff. Generations barely appear in a 90-day window (sim year = 360 days).

---

## Method

```text
npx tsx scripts/audit-civilization.ts --seeds 1,3,5,7,9 --days 90 --world 600
```

Extra probes: generation depth via `parentIds`; famine/food cliff day 40–50 on seed 5.

---

## Population trajectory

| Seed | Start | d30 | d60 | d90 | Births (end) | Deaths (end note) | Δpop |
|-----:|------:|----:|----:|----:|---------------:|------------------:|-----:|
| 1 | 26 | 24 | 24 | 7 | 8 | −14 cum. at d90 snap | −19 |
| 3 | 26 | 28 | 21 | 7 | 5 | −13 | −19 |
| 5 | 26 | 28 | 32 | 7 | 11 | −12 | −19 |
| 7 | 26 | 27 | 23 | 10 | 4 | −12 | −16 |
| 9 | 26 | 31 | 27 | 6 | 18 | −22 | −20 |
| **Mean** | 26 | 27.6 | 25.4 | **7.4** | 9.2 | — | **−18.6** |

**Read:** Mid-run health diverges (seed 5 peaks at 32; seed 3 already bleeding by d60). By d90 every seed collapses into the same thin band. Not a day-1 wipe; not total extinction.

---

## Villages

| Seed | d30 | d60 | d90 | Notes |
|-----:|----:|----:|----:|-------|
| 1 | 4 | 4 | 2 | Lost 2 villages late |
| 3 | 4 | 4 | 2 | Same pattern |
| 5 | 4 | 4 | 4 | Only seed keeping all four |
| 7 | 4 | 4 | 3 | |
| 9 | 4 | 4 | 3 | |
| **Mean end** | | | **2.8** | |

Founding is fixed early (4 camps → villages by ~d3). Late attrition of villages tracks the pop cliff.

---

## Creeds / religion

| Seed | Creed holders d30 | d60 | d90 | Creed IDs (end) | Faith circles end | Shrines end |
|-----:|------------------:|----:|----:|-----------------|------------------:|------------:|
| 1 | 11 | 21 | 7 | `piete` only | 1 | 2 |
| 3 | 19 | 18 | 6 | `piete` only | 2 | 2 |
| 5 | 14 | 19 | 6 | `piete` only | 1 | 4 |
| 7 | 18 | 19 | 9 | `piete` only | 2 | 3 |
| 9 | 16 | 16 | 5 | `piete` only | 2 | 3 |

**Over-scripted:** every seed logs first creed **« honorer le sacré »** by ~j3 (different carriers: Modan / Tavic / Sawen / Bralin…). Monoculture creed — matches shared finding A8. Rituals/shrines **do** fire (chronicle creed events 145–178 / seed).

---

## Kingdoms / polities / chiefdoms

| Seed | d30 pol / ch / k | d60 | d90 | Chronicle kingdom-ish | Succession |
|-----:|------------------|-----|-----|----------------------:|-----------:|
| 1 | 4 / 1 / 3 | 4 / 2 / 2 | 2 / 1 / **0** | 66 | 7 |
| 3 | 4 / 0 / 4 | 2 / 0 / 2 | 1 / 0 / **1** | 63 | 12 |
| 5 | 4 / 1 / 3 | 4 / 2 / 2 | 1 / 0 / **1** | 63 | 5 |
| 7 | 4 / 1 / 3 | 4 / 2 / 2 | 3 / 0 / **1** | 54 | 6 |
| 9 | 4 / 1 / 3 | 4 / 2 / 2 | 2 / 1 / **1** | 67 | 10 |

Early “instant kingdoms” (3–4 at d30) look **scripted / soft-tier inflation**, then mostly collapse with deaths. End-state kingdoms are rare/thin (0–1). Civil war: **NEVER** (deferred soft — catalog).

---

## Guilds

| Seed | Guilds d30 | d60 | d90 |
|-----:|-----------:|----:|----:|
| 1 | 1 | 1 | 0 |
| 3 | 2 | 1 | 0 |
| 5 | 3 | 3 | 0 |
| 7 | 2 | 2 | **1** |
| 9 | 1 | 2 | 0 |

Guilds **emerge mid-run** (catalog FIRES 5/5, total≈10) then **die with the pop cliff**. Seed 7 alone keeps a guild at d90.

---

## Bandits

| Seed | d30 bands/bandits | d60 | d90 | Raids (catalog) | deathsByBandit (snaps) |
|-----:|-------------------|-----|-----|----------------:|-----------------------:|
| 1 | 0/0 | 1/4 | 2/5 | | 0 |
| 3 | 0/0 | 1/3 | 2/7 | | 0 |
| 5 | 0/0 | 1/4 | 2/2 | | 0 |
| 7 | 0/0 | 1/4 | 2/3 | | 0 |
| 9 | 0/0 | 1/4 | 2/3 | | 0 |

Bandit **groups appear on schedule** (gate ~d40+). Catalog: raids 3/5 seeds. Snap `deathsByBandit` stayed **0** — late deaths are overwhelmingly **hunger**, not razzia kills.

---

## Forts / halls / landscape (end)

| Seed | Forts done | Notable labels | Halls done | Δtrees | path+road |
|-----:|-----------:|----------------|-----------:|-------:|----------:|
| 1 | 8 | mostly palissade; 1 stone fort | 0 | 420 | 10 |
| 3 | 5 | palissades | 1 | 134 | 3 |
| 5 | 6 | palissades | 0 | 249 | 41 |
| 7 | 5 | **3× fort de pierre** | 1 | 224 | 27 |
| 9 | 7 | palissades | 0 | 542 | 16 |

**Divergence here is real:** seed 7 builds stone forts; seed 9 clears the most forest; seed 5 builds the most path/road. Halls remain **RARE** (2/5).

---

## Generations

Sim calendar: **360 days / year**. A 90-day audit is **0.25 year** — multi-generation adulthood is structurally out of reach.

| Seed | Births | Max gen depth (alive/all)* | Born-with-parents (alive) | Mean age (years, survivors) |
|-----:|-------:|---------------------------:|--------------------------:|----------------------------:|
| 1 | 6† | 0 / 0 | 1 | ~0.25 |
| 3 | 4† | 0 / 0 | 2 | ~0.24 |
| 5 | 6† | 0 / 0 | 0 | ~0.27 |
| 7 | 3† | 0 / 0 | 1 | ~0.26 |
| 9 | 10† | **1** / 1 | 1 | — |

\*Depth via `parentIds`; dead parents often pruned from `state.villagers` → depth under-counts.  
†Probe run (non-identical RNG path vs audit counts; same qualitative picture).

**Conclusion:** births fire, but survivors after the famine cliff are mostly young / founder remnants; **no meaningful 2nd–3rd generation story** in 90 days. Need ≥1–2 sim years for generation audits.

---

## Seed divergence vs over-scripting

| Phase | Similarity | Evidence |
|-------|------------|----------|
| **d1–d5** | **Too identical** | Day-1 fort projects on all seeds; day-3 creed « honorer le sacré »; 4 villages crystallize together |
| **d30** | Medium | Pop 24–31; always 4 villages; kingdoms 3–4 everywhere; creed = `piete` |
| **d60** | **Best divergence** | Pop 21–32; guilds 1–3; halls 0–1; tree-clear 151–515; seed 5 still growing |
| **d90** | **Convergent collapse** | Pop 6–10; bands=2 everywhere; guilds≈0; kingdoms 0–1; creed monoculture |

**Not over-scripted end-to-end** — mid histories fork — but **opening choreography + creed monoculture + synchronized hunger cliff** flatten the long-run story.

---

## Hunger cliff (causal, not patched)

Probe seed **5**, days 40–50 (spring — not winter):

| Day | Pop | famine | hungry | starving | deaths |
|----:|----:|:------:|-------:|---------:|-------:|
| 40 | 28 | no | 0 | 0 | 0 |
| 42 | 27 | **yes** | 17 | 0 | 0 |
| 44 | 27 | yes | 19 | 16 | 0 |
| 46 | 24 | yes | 16 | 3 | 1 |
| 50 | 12 | no | 4 | 3 | 10 |

Chronicle lines: `… est mort de faim` clustered ~j46–47 across seeds 1/3/5/7. Aligns with shared **A1** (harvestWheat never starts) / **A3** (mid-run mortality).  

**Why no fix here:** survivors remain (no total wipe to 0). Patching would mean restoring the farm/harvest loop (causal) or buffing food (difficulty cheat). Harvest repair is the correct causal fix but is a systems change owned by the survival/food audits — **out of scope for A14 wipe-only**.

---

## Systems fire table (90d, 5 seeds)

| Status | System | Seeds hit |
|--------|--------|-----------|
| FIRES | institutions, circles, creeds, faith, shrines, rituals | 5/5 |
| FIRES | bandit groups; fortify; walls; clearing; roads | 5/5 |
| FIRES | guilds; births; multi-village; succession | 5/5 |
| FIRES | bandit raids | 3/5 |
| RARE | halls | 2/5 |
| RARE | chiefdoms (end) | 2/5 |
| RARE | kingdoms (end) | 4/5 (thin) |
| NEVER | civil war (deferred soft) | 0/5 |

---

## Findings (A14)

### [A14-1] Synchronized mid-run hunger cliff (~d42–50)
- Domaine: fonctionnel / émergence
- Sévérité: majeur (collapse, not total wipe)
- Preuve: audit d60→d90 pop crash all seeds; probe `_probe_a14_gens` / `_probe_a14_famine`; logs `mort de faim`; famine flag in spring
- Observé: shared starvation cascade; bandit *presence* without bandit kill credit
- Attendu: seed-divergent survival pressure, not a calendar-aligned cliff
- Fix: **not applied** (would require harvest/food-loop repair — see A1 — not a difficulty nerf)

### [A14-2] Opening script + creed monoculture
- Sévérité: mineur–majeur (feel / divergence)
- Preuve: identical day-1 fort spam; day-3 « honorer le sacré »; end `creedIds` always `{"piete":N}`
- Observé: histories rhyme too hard in week 1; religion never branches
- Fix: none (design / content diversity — not wipe)

### [A14-3] Generation depth invisible in 90d
- Sévérité: mineur (audit metric)
- Preuve: max gen ≤1; year=360d; parents pruned from array
- Observé: births exist but dynasty story does not
- Fix: none; recommend **360–720d** runs for generation audits

### [A14-4] No catastrophic total wipe
- Sévérité: info
- Preuve: end pop ∈ [6,10] on all five seeds in primary audit
- Observé: civilization thins but continues
- Fix: none required under wipe-only rule

---

## Recommendations (no cheats)

1. **Repair harvest/food loop (A1)** so mid-run famine is earned scarcity, not a broken farm cliff.  
2. **Diversify creed seeds** beyond `piete` / « honorer le sacré ».  
3. Soften or stagger **day-1 fort auto-projects** if opening should feel less identical.  
4. For generation/emergence longevity, re-run audit at **≥360 days** on ≥3 seeds.  
5. Keep bandit lethality honest — do not buff food or nerf hunger to “pass” long audits.

---

*End A14.*
