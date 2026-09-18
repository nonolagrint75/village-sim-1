# EMERGENCE MASTER REPORT — nono_simu_2d

**Date:** 2026-09-18  
**Canon:** `village_edit` / `nolan-work`  
**Forbidden:** `nono_simu_3d` / Bevy / Rust  
**STOP:** no Lot 4, no commit, no merge

---

## Logs utilisateur

| Source | Finding |
|--------|---------|
| Terminals | Pas de sim live Chronique pour ce pass; harness smoke ci-dessous |
| `_lot3d_emergence_report.json` | Baseline seed7 @10k: WO✓=0, haul=0, wages=0, blocks=44, alive→0 |
| `_tmp_emergence_smoke.json` | Post-intégration smoke seeds 7,42 @200/500 |

---

## Agent deliverables

| Agent | Report | Status |
|-------|--------|--------|
| A Cognition | `decision_audit.md` | Catalogue baseScore dominates; local stretches shipped |
| B World | `world_emergence_audit.md` | finalizeHomeCompletion + metrics |
| C Economy | `economic_emergence_audit.md` | Wage polarity; personal demand nudge ready→wired |
| D Tasks | `task_emergence_audit.md` | Sticky WO / multi-trip haul / hire handoff |
| E Metrics | `emergence_protocol.md` | Multi-seed harness + fingerprints |

---

## Orchestrator integration (shared files)

| Patch | File | From |
|-------|------|------|
| workOrderId through Option/add/reserve | `behaviors.ts` | D |
| releaseAssigneeOrders on non-collab setTask | `behaviors.ts` | D |
| B1 log1p catalogue + B2 rest/harvest damp | `behaviors.ts` | A |
| Progressive first-home → linkToHub | `behaviors.ts` | B |
| applyPersonalDemandNudge in score layers | `professionFactors.ts` | C |

Agent-owned fixes already landed: D (`workOrders`/`npcBuildBehaviors`/`collabContracts`), B (`homeBuildPipeline`), C (`wages`/`careers`/`livelihood`), E (`emergenceMetrics` + probe).

---

## Smoke evidence (post-integration)

```
npx tsx scripts/_probe_emergence_master.ts --horizons=200,500 --seeds=7,42
```

| seed | tick | alive | blocks | homes✓ | WO✓ | haul | wages |
|------|------|-------|--------|--------|-----|------|-------|
| 7 | 200 | 36 | 32 | 0 | **1** | **1** | **3** |
| 7 | 500 | 36 | 40 | 0 | **1** | **2** | **7** |
| 42 | 200 | 36 | 28 | 0 | 0 | 0 | 18 |
| 42 | 500 | 36 | 66 | 0 | **1** | **1** | **26** |

Versus Lot3D seed7 @10k: WO✓/haul/wages were **all 0**. Smoke shows **real** completion + haul + wage counters firing without forced builds.

**Still open:** homes✓=0 at 500 ticks; full 1k/5k/10k multi-seed not re-run this pass; extinction risk at long horizon unproven fixed.

---

## Verdict

**PARTIAL EMERGENCE — IMPROVED.** Collab WorkOrder path is now causally countable (WO✓, materialsMoved, wagesPaidCoins > 0 on short horizons). Catalogue compress + WO stickiness address A/D bottlenecks. Home completion / long-run survival remain unproven at Lot3D scale.

**STOP.** No Lot 4. No commit.