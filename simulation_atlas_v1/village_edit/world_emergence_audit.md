# World Emergence Audit — AGENT B (World / Construction / Space)

**Scope:** `village_edit` / nono_simu_2d only  
**Date:** 2026-09-18  
**STATUS:** PARTIAL — progressive place works; completion → family → path consequence incomplete

---

## Logs utilisateur

| Source | What was read |
|--------|----------------|
| `terminals/444320.txt` | Lot3D emergence probe live JSON (seed 7) |
| `_lot3d_emergence_report.json` | Same run archived |
| `scripts/_civ_audit_run_log.txt` + `scripts/_civ_audit_report_d90_w600.txt` | Civ soak: roads present; no home-completion counters |
| `PHASE5_EVIDENCE_LOG.md` / `AUDIT_A7_BUILD.md` | Prior construction evidence (furniture/heir) |
| Live `npm run app` console | No active housing/homeDone stream for this pass |

**Key live numbers (seed 7, 10k ticks):** `blocksBuilt=44`, `homesStarted=0`, `homesCompleted=0`, `homeless` 27→3→0, `sitesOpen` 13→3→0, WO completed=0. Blocks place without metric completion; housing appears via legacy/kin paths.

---

## Chain map: need → project → task → construction → spatial consequence

```
need (shelter/sleep) 
  → planHouse / HomePlannerBrief (needFocus)
  → SpatialHomePlan + BuildBlock[] queue (Lot 3B)
  → task buildHouse | helpBuild | haulForBuild | BuildProject
  → placeBuildBlock / applyConstructionStep (terrain + claim)
  → hasHome + homeOwnerId + Family.homeOwnerId
  → movement: considerLane / linkToHub / plaza / densify plots
```

| Stage | Mechanism | Status |
|-------|-----------|--------|
| Need | `HomeNeedFocus`, shelter urges in behaviors | OK |
| Plan | `planHomeSpatial` / `formHomeBuild` / `attachHomeBuild` | OK |
| Queue | `emitBuildQueue` (shell→door→floor→window→partition) | OK |
| Task | `buildHouse` → progressive if queue; else legacy wall stamp | Dual-path |
| Place | `applyNextHomeBuildBlock` / `placeBuildBlock` | OK (44 blocks observed) |
| Complete | `hasHome` + metrics + family seat | Was broken → **patched** |
| Path | `linkToHub` only on **legacy** first-house close | GAP (propose) |
| Densify | `findBestHousePlot` + lane clear near home | Weak coupling |

Two parallel home closers (not replaced): **progressive BuildBlock queue** vs **legacy HOUSE wall loop** in `behaviors.ts`. Civic **BuildProject** remains separate (halls/forts).

---

## Bottlenecks

1. **Completion metrics disconnected from reality** — blocks place (`noteBlockBuilt`) while `homesCompleted` stayed 0; homeless fell via pioneers / legacy walls / `shelterHomelessKin`.
2. **`queue_complete` without ownership finalize** — when `nextBuildBlock` marks remaining cells done (terrain already satisfied), apply path returned without `hasHome` / `noteHomeCompleted`.
3. **Family link lag** — `Family.homeOwnerId` only refreshed every 240 ticks in `refreshHouseholds`; spouse not seated on progressive finish (kin shelter covers children only).
4. **Spatial consequence gated on legacy path** — `linkToHub(door→centre)`, plaza, village join, furniture seed run inside legacy `buildHouse` close, not progressive finalize.
5. **Work orders stall** — open/cancelled/expired WO with 0 completed; haul/materialsMoved=0 in Lot3D probe.
6. **`isActiveHomeSite`** can keep finished owners as sites if leftover queue unfinished after legacy `hasHome=true` (phantom sites).
7. **Persistence** — `homePlan` / `buildQueue` live on villager; `state.blocks` optional mirror; no separate save schema beyond sim state. Abandoned shells: `cleanup.ts` (orphan sweep only; mid-build protected).

---

## Spatial emergence gaps

| Gap | Effect |
|-----|--------|
| Progressive complete ≠ road stamp | Homes without door→hub trail unless legacy path or later `considerLane` clearLand |
| Plot densification soft | Sociability scoring in `findBestHousePlot` (behaviors); no traffic-wear field |
| Door facing cultural | Planner doorSide OK; hub link ignores door when progressive-only |
| Expansion mode | `mode:'expand'` plans prestige rooms; path/traffic unchanged |
| Dual stamp risk | Progressive + legacy can both write HOUSE on same plot |

---

## Minimal fix proposals

### Done (this agent — build only)

- **`finalizeHomeCompletion(state, owner)`** in `homeBuildPipeline.ts`:
  - Requires queue rem===0 (or empty)
  - Sets `hasHome` / `homeOwnerId`
  - Syncs `Family.homeOwnerId`
  - Seats spouse + foyer members who lack another nest
  - `noteHomeCompleted` only on new transition
- Call from `applyNextHomeBuildBlock` on last place **and** on `queue_complete`
- `noteHomeStarted` on first placed block (`done0===0`) so metrics track sites that skip `planHouse` note
- UTF-16 → UTF-8 hygiene on `homeBuildPipeline.ts`
- Export from `build/index.ts`

### Propose only (read-only files)

| File | Proposal |
|------|----------|
| `npcBuildBehaviors.ts` | Replace duplicate `hasHome=` with `finalizeHomeCompletion` |
| `behaviors.ts` | On legacy first-house close, also call `finalizeHomeCompletion`; keep `linkToHub` |
| `behaviors.ts` | After progressive finalize, call `linkToHub(door, village.center)` once |
| `collabContracts.ts` | `isActiveHomeSite`: if `hasHome && homeOwnerId===id && structuralBlocksRemaining===0 && mode!=='expand'` → inactive |
| `workOrders.ts` | Do not complete hire WO until helpBuild progresses (false WO✓) |

---

## FILES MODIFIED / ADDED

| Path | Change |
|------|--------|
| `src/lib/sim/build/homeBuildPipeline.ts` | finalize + family seat + start/complete metrics; UTF-8 |
| `src/lib/sim/build/index.ts` | export `finalizeHomeCompletion` |
| `world_emergence_audit.md` | **ADDED** (this file) |

No changes to `construction.ts`. No commit/merge.

---

## Interfaces

```ts
finalizeHomeCompletion(state: SimState, owner: Villager): boolean
// true iff owner newly gained hasHome

applyNextHomeBuildBlock → may call finalize when rem===0 or queue_complete
```

Consumers (propose): `executeProgressiveBuildHouse`, `executeHelpBuild`, legacy `buildHouse` close.

---

## Limitations

- Does **not** stamp roads/plazas (would require behaviors).
- Does **not** seed furniture queue on progressive complete.
- Does **not** fix WO hire false-complete or haul=0.
- Family seat skips members who already own another home.
- Completion still requires full queue rem===0 (not shell-only livability).
- `noteHomeStarted` per first place can under-count if queue rebuilt mid-site.

---

## Integration points

| System | Hook |
|--------|------|
| Behaviors | `ensureProgressiveHomePlan`, `executeProgressiveBuildHouse`, legacy `buildHouse` |
| Family | `findFamily`, `shelterHomelessKin`, `refreshHouseholds` |
| Metrics | `emergenceMetrics` (`homesStarted`/`homesCompleted`/`blocksBuilt`) |
| Civic | `BuildProject` / `tickBuildProjects` — unchanged |
| Voxel | `ensureBlockWorld` + `mirrorBlocks` opt-in |
| Cleanup | `abandonIncompleteHome`, `tickStrayConstructionCleanup` |

---

## Verdict

**PARTIAL.** Need→plan→queue→place is wired and observable. Completion linkage and family seat are now centralized in build. Path densification and legacy/progressive hub unification remain the next spatial emergence work (behaviors-side, propose-only here).