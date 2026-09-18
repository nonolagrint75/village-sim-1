# ANALYSIS_AGENT7_INTERCONNECT

**Agent:** 7 — Interconnexions (analyse only — no gameplay changes)  
**Workspace:** `village_edit`  
**Date:** 2026-09-17  
**Sources:** `SECOND_AUDIT_INTERCONNECT.md`, `SECOND_AUDIT_REPORT.md`, `INTERCONNECT_MASTER.md`, `INTERCONNECT_VERIFY.md`, `BRAIN_CYCLE_REPORT.md`, Agents 2/3/9 residuals, code in ecology/careers/livelihood/commerce/social/politics/religion/cognition  

**Legend:** **[PROBE]** = dump-backed · **[CODE]** = static wiring this pass · **[STALE]** = older dump must not override fresher evidence.

---

## Verdict

**Farm / food chain: CLOSED on seed7** after harvest orphan + sow/clear parallel + profession↔livelihood sync.  
**Organism overall: PARTIAL** — hot causal loops (famine feel, professions, mind life-events) pass; dual-authority / unused / ungated links remain.

---

## SYSTEMS_ANALYZED

| Loop | Primary files | Status |
|------|---------------|--------|
| Sow → grow → ripe → harvest | `fields.ts`, `behaviors.tickFields` / chooseTask | **CLOSED** seed7 **[PROBE]** |
| Harvest → mill → flour → bread | behaviors grind/bake + mill | **LIVE** **[PROBE]** |
| Famine feel → career demand → métier | `ecology.feelFamine`, `careers.computeCareerDemand` | **LIVE** **[CODE]** |
| Profession ↔ livelihood ↔ fields | `applyProfessionChange`, `buildHouse` path | **PASS** (incl. house fix) |
| Mind epi vs legacy memories | `cognition/memory` helpers | **PASS** hot paths; gossip PARTIAL |
| Soft brain perceive→…→learn | `cognition/tick`, decide | **CONNECTED** hybrid |
| Food → price → job full close | commerce + trade/title | **PARTIAL** |
| Ambition / goals / livelihood intent | `ambitionBonus`, `mind.goal`, livelihood | **PARTIAL** dual |
| Beliefs / values | `pol.beliefs` vs `mind.values` | **PARTIAL** dual |
| Labor balance | `commerce.computeLaborBalance` | **UNUSED** by assignProfession |
| Practice softProfession | `livelihood.ts` | **LIVE** but **no demand gate** |
| Creed crystallisation | religion + politics + stubs | **DUAL writers** |

---

## CURRENT_ARCHITECTURE

```
engine.stepSimulation
  → tickFamine (sole famine writer)
  → tickVillager: needs / métier / livelihood → threats
      → tickCognition (soft) → chooseTask / pickTaskByPolicy → executeTask
  → commerce / politics / careers / ecology / fields / religion
```

**Authority rules (intended SoT):** famine consumers → `feelFamine`; profession apply → `applyProfessionChange`; life-event reads → mind-first helpers + legacy fallback; spots → mind-first.

---

## PROBLEMS (ordered residuals)

1. **Ambition vs goal** — `ambitionBonus` scores legacy `v.ambition`; deep goals via `mind.goal`. Sync exists but dual levers remain under LOD fast-path. **[CODE]**
2. **Beliefs vs values** — `pol.beliefs.*` and `mind.values.*` both bias tasks; no single SoT. **[CODE]**
3. **`gossip()` legacy-only** — reads/writes `v.memories` only; ignores mind episodic (import-cycle). **[CODE]**
4. **`laborBalance` unused by careers** — feeds attractiveness/migration; not `assignProfession` / demand. **[CODE]**
5. **`softProfession` no demand gate** — practice mix can flip métier without `computeCareerDemand`. **[CODE]**
6. **Dual creed writers** — `religion.maybeCrystallizeFaithCreed`, stubs `tickReligionDepth`, politics `crystallizeCreed`. **[CODE]**

Soft PARTIALs: trade barter vs caravans; giveFood under feelFamine window; food→price→job title nuance; LOD cold mind.

---

## ISOLATED_SYSTEMS

| Item | Severity | Note |
|------|----------|------|
| `gossip()` memory | PARTIAL | Legacy-only; not mind-safe |
| `careerDemandForProfession` export | Low | Dead / unused export |
| `laborBalance` → profession assign | MISSING | Attractiveness only |
| SoftProfession vs demand | PARTIAL | Same apply path, ungated |
| Ambition / goal / livelihood | PARTIAL | Triple intent |
| Creed crystallisers | PARTIAL | Multiple writers |
| Local `tickTrade` barter | PARTIAL | Ignores `state.prices` |

---

## MISSING_CONNECTIONS

| Desired link | Status |
|--------------|--------|
| Farm harvest ↔ farmer lock / orphan reclaim | **CLOSED** seed7 |
| buildHouse → applyProfessionChange | **CLOSED** |
| Life-events → politics/religion/bandits | **CLOSED** hot |
| Gossip → mind episodic | **MISSING** |
| laborBalance → assignProfession / demand | **MISSING** |
| softProfession → demand veto / damp | **MISSING** |
| Single creed crystalliser | **MISSING** |
| Single intent SoT (ambition≡goal) | **PARTIAL** sync only |
| Beliefs ↔ values bridge | **MISSING** |
| Food→price→job + trade/title | **PARTIAL** |

---

## DUPLICATES

| Pair | Risk |
|------|------|
| `v.ambition` ↔ `mind.goal` | Divergent task pull under LOD |
| `pol.beliefs` ↔ `mind.values` | Parallel soft multipliers |
| `v.memories` ↔ mind epi/sem | Gossip + leftover readers |
| Creed: religion / politics / stubs | Double crystallise |
| softProfession ↔ career demand | Competing métier writers |
| `tickTrade` ↔ caravan / giveFood | Three food redistrib paths |

---

## EVIDENCE

| Claim | Source |
|-------|--------|
| Harvest CLOSED seed7 | `_food_chain_s7_harvest_fix.txt`, SECOND_AUDIT_INTERCONNECT |
| Sow/clear parallel fixed seed1 | SECOND_AUDIT_EMERGENCE / REPORT |
| buildHouse → applyProfessionChange | behaviors.ts **[CODE]** |
| Mind life-event helpers | cognition/memory.ts + hot readers |
| gossip legacy-only | `social.ts` `gossip()` **[CODE]** |
| laborBalance not in assignProfession | commerce.ts + careers **[CODE]** |
| softProfession ungated apply | livelihood.ts **[CODE]** |
| Dual creed | religion.ts + politics.ts + stubs.ts **[CODE]** |
| Overall PARTIAL | INTERCONNECT_MASTER / SECOND_AUDIT_REPORT |

---

## PROPOSED_FIXES (analysis only — do not implement here)

1. Mind-safe gossip (helper without import cycle) or route tellables through mind first.
2. Prefer `mind.goal` in catalogue scoring; `ambitionBonus` as alias post-sync.
3. Bridge or document beliefs→values before new society gates.
4. Optionally fold `laborBalance` into demand scores or drop unused claims.
5. Gate softProfession behind demand / foodNeed damp.
6. Single creed ownership (prefer religion.ts; politics read-only).

---

## FILES_TO_MODIFY (if later orchestrated)

| File | Why |
|------|-----|
| `social.ts` / cognition memory | gossip mind-safe |
| `behaviors.ts` / `decide.ts` | ambition vs goal scoring |
| `livelihood.ts` | softProfession × demand |
| `careers.ts` / `commerce.ts` | laborBalance optional wire |
| `religion.ts` / `politics.ts` / `stubs.ts` | creed SoT |

---

## DEPENDENCIES

- Agent 2 (ambition/goal, dual mem, HARD whyFactors)
- Agent 3 (laborBalance, softProfession, trade dual)
- Agent 5 (creed dual)
- Agent 4 adjacent (giveFood / familyId)
- Agent 8/10 for re-proof after any wire — not this pass

---

## POSSIBLE_CONFLICTS

| Conflict | With | Mitigation |
|----------|------|------------|
| SoftProfession demand gate | Career famine farmer lock | Damp, do not unlock farmer lock |
| Unify ambition/goal | Personality / ethnos | Personality → values; goal = runtime SoT |
| Mind gossip | Import cycles | Helper module / callback |
| Single creed writer | Politics bias / shrine | Politics read after religion write |
| laborBalance → assign | softProfession practice | One métier writer policy |
| Parallel A2–A9 edits | Same hot files | Serialise via GLOBAL plan when gated |

---

## Scorecard (brief)

| Track | Verdict |
|-------|---------|
| Farm / food seed7 | **CLOSED / PASS** |
| Profession ↔ livelihood | **PASS** |
| Mind hot life-events | **PASS** |
| Soft brain cycle | **CONNECTED** (hybrid) |
| Organism (all loops) | **PARTIAL** |
| Residuals above | Open notes — not P0 farm blockers |

*Analysis only. No simulation code changed in this pass.*