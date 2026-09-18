# Task / WorkOrder emergence audit (AGENT D — nono_simu_2d)

## Logs utilisateur

- **Live terminals**: aucun log de sim live trouvé dans les sessions Cursor de ce workspace.
- **Lot 3D evidence**: `_lot3d_emergence_report.json` (seed 7, 10k ticks) — source principale.
- Pas de `state.log` / `*_run_log*` collab récent hors ce rapport.

---

## Verdict

WorkOrders are **created and reserved**, but the collab pipeline almost never reaches a **counted completion**. Lot 3D shows `completedWorkOrders=0` while `expired=36`, `cancelled=32`, `materialsMoved=0`, `wagesPaidCoins=0`. Blocks placed (`blocksBuilt=44`) come from owner self-build (`buildHouse` / pipeline), not from a closed WO haul→help chain. Population extinction then cancels remaining sites.

---

## Lifecycle (intended)

```
need (active home site + material/labor gap)
  → syncWorkOrdersFromSites (every 30 ticks)
  → open WO on board
  → proposeCollabOptions → chooseTask
  → reserveWorkOrder (TTL)
  → activate on execute*
  → progress (lastProgressTick / progress)
  → complete | fail | cancel | expire→reopen
```

Kinds in play (3C): `helpBuild`, `haulForBuild`, `hireBuilder`, `assistCraftTools`.

---

## Lifecycle metrics (definitions)

| Metric | Definition | Source |
|--------|------------|--------|
| **WO created** | `noteWorkOrderCreated` on `pushOrder` | emergence |
| **WO reserved** | status→`reserved`, `assigneeId` set, `reservedUntil=tick+TTL` | board |
| **WO active** | `activateWorkOrder` on first execute tick | board |
| **WO completed** | terminal success + `noteWorkOrderCompleted` | emergence |
| **WO failed** | terminal fail + reason (`stalled`, `place_failed`, …) | emergence |
| **WO cancelled** | site/owner gone (`owner_dead`, `site_gone`) | emergence |
| **WO expired** | reservation TTL elapsed **without** committed assignee → reopen + note | emergence |
| **materialsMoved** | units delivered owner inventory via haul | emergence |
| **wagesPaidCoins** | coins transferred helper↔owner on pay/hire | emergence |
| **soft reopen** | status→`open` without fail/cancel (transient abort) | board `failReason` |
| **task switches** | any task kind change (survival interrupts collab) | emergence |
| **completion rate** | `completed / created` | derived |
| **churn rate** | `(expired + cancelled + failed) / created` | derived |

### Soft vs terminal reasons (`collabContracts.ts`)

- Soft reopen: `helper_missing_materials`, `no_source_nearby`, `source_empty`, `no_hire_candidate`, …
- Terminal fail: `stalled`, `site_inactive`, `owner_gone`, `place_failed`, …

---

## Lot 3D evidence (seed 7)

| Horizon | alive | open WO | assigned | completed | failed | cancelled | expired | blocks | materials | wages | npcsOnBuild |
|---------|------:|--------:|---------:|----------:|-------:|----------:|--------:|-------:|----------:|------:|------------:|
| t1000 | 37 | 20 | 4 | **0** | 5 | 0 | 2 | 33 | **0** | **0** | 0 |
| t5000 | 25 | 7 | 0 | **0** | 8 | 25 | **36** | 44 | **0** | **0** | 0 |
| t10000 | **0** | 0 | 0 | **0** | 8 | **32** | 36 | 44 | **0** | **0** | 0 |

Signals:

- Early: many open WOs, almost no assignment stickiness (`npcsOnBuildTasks=0` even with assigned=4 at t1000).
- Mid: expire spike + cancel spike; builders→0; foodCrisis; flee/rest dominate chains.
- End: extinction; `homesStarted/Completed=0` in counters despite blocks placed.
- Task mix: `rest`/`flee` dominate; `buildProject`/`buildMill` appear but collab kinds are drowned.
- `taskSwitches≈7000` vs tiny WO progress → reservation fragility.

---

## Bottlenecks (root causes)

1. **Completion metrics never wired on help/haul/tools**  
   `completeWorkOrder` ran without `noteWorkOrderCompleted` (except hire + site-done path). Lot 3D `completed=0` is both a real completion drought **and** under-counting when something did finish.

2. **Fragile reservations**  
   TTL 240; `setTask` in `behaviors.ts` does **not** call `releaseAssigneeOrders` on abandon. Assignee flips `buildHouse→rest` / `rest→flee` while WO stays reserved → expire counter + board churn.

3. **Hire handoff bug**  
   `executeHireBuilder` completed the hire WO then pointed the hiree at **that same completed id**. Helper progress could not activate/complete a live help/haul order → cooperation that produces nothing.

4. **Haul completes after one delivery**  
   Premature `completeWorkOrder` while `materialGap` still true; also **never** called `noteMaterialsMoved` / `noteWagePaid` (imports were dead). Explains `materialsMoved=0`, `wages=0`.

5. **Hard fail on unrealizable momentary states**  
   Missing helper materials / no nearby tree → `failWorkOrder` burned the slot instead of reopening for a later hauler.

6. **Survival overrides collab** (expected, not forced-build)  
   Hunger/flee dominate; propose gate `hunger < 1.6` returns []. Extinction drives `cancelled` via `owner_dead` / `site_gone`.

7. **behaviors.ts integration gap (propose-only)**  
   `proposeCollabOptions` returns `workOrderId`, but `add(...)` drops it; reserve always called with `workOrderId=null`. Still finds by kind+owner, but wrong-order risk when multiple kinds exist.

---

## Minimal code fixes applied (no forced builds)

### `workOrders.ts`

- `RESERVE_TTL` 240→420; `STALL_TICKS` 1800→2400.
- Expire **extends** reservation if assignee still committed (`task.workOrderId` or matching collab task).
- Active+committed refreshes TTL.
- `completeWorkOrder(state, order)` idempotent + always notes completion.
- `reopenWorkOrder` for soft abort; `ensureOpenSiteOrder` for hire handoff.
- Owner hunger site gate aligned with collab list (0.85 / starveTimer 8).

### `npcBuildBehaviors.ts`

- Soft reopen instead of fail on transient haul/help/hire/tool misses.
- Haul: `noteMaterialsMoved`; multi-trip until `siteStillNeedsMaterials` clears; then complete.
- `payHelper` / hire retainer: `noteWagePaid`.
- Hire: create/reserve **fresh** help or haul WO for hiree; complete hire WO separately.
- Help missing materials → reopen (do not burn).
- Slightly lower score floor (10) so viable open WOs surface without overriding survival.

### `collabContracts.ts`

- `siteStillNeedsMaterials`, soft/terminal reason catalogs.
- Slightly softer owner listing gate so haul can still target hungry sites (helpers remain gated).

---

## FILES modified

| File | Role |
|------|------|
| `src/lib/sim/build/workOrders.ts` | TTL stickiness, complete+note, reopen, ensureOpenSiteOrder |
| `src/lib/sim/build/npcBuildBehaviors.ts` | haul multi-trip, metrics, soft reopen, hire handoff |
| `src/lib/sim/build/collabContracts.ts` | material-gap helper, reason taxonomy, site gates |
| `src/lib/sim/build/index.ts` | re-exports |
| `task_emergence_audit.md` | this report |

**Not modified**: `behaviors.ts` (propose only), `decide.ts`, `construction.ts`, `economy/**`, `emergenceMetrics.ts`.

---

## behaviors.ts proposals (do not apply here)

1. Pass `c.workOrderId` through `Option` / `add(...)`.
2. `tryReserveCollabTask(..., best.workOrderId ?? null)` instead of always `null`.
3. On `setTask`, if previous task had `workOrderId` and new kind is non-collab, call `releaseAssigneeOrders(state, v.id)` (or reopen that one WO) so rest/eat does not sit on a dead reservation until TTL.
4. Optional: when help aborts for materials, bias next option toward `haulForBuild` for same `siteOwnerId`.

---

## Integration points

| Hook | Where |
|------|--------|
| Board sync / tick | `engine.ts` → `tickWorkOrders` |
| Options | `behaviors.ts` chooseTask → `proposeCollabOptions` |
| Reserve | `behaviors.ts` post-pick → `tryReserveCollabTask` |
| Execute | `behaviors.ts` cases → `executeHelpBuild` / `Haul` / `Hire` / `AssistCraftTools` |
| Metrics | `emergenceMetrics.note*` (create/complete/fail/cancel/expire/materials/wages) |
| Death cleanup | `interactions` / `onBuilderDeathCleanup` → `releaseAssigneeOrders` |
| Wages | `economy/wages` (`reservationWage`, `wageWouldClear`) — unchanged, now actually noted when paid |

---

## Limitations

- Does **not** force builds or raise collab above flee/eat.
- Extinction / food crisis still cancels sites; WO fixes cannot save a dead village.
- Soft reopen can re-queue the same unrealizable order if no wood/stone exists map-wide (FAIL_NO_WOOD_SOURCE still applies).
- Expire counter still increments on true abandon (TTL without commitment); only committed assignees are protected.
- `homesStarted=0` in Lot 3D may be a separate counter wiring issue outside this lot's WO path.
- Full validation needs a re-run of the Lot 3D probe; not executed in this agent pass.

---

## Success criteria for a follow-up probe

- `completedWorkOrders > 0` when collab actually finishes a help/haul/hire/tools act.
- `materialsMoved > 0` after successful haul deliveries.
- `wagesPaidCoins > 0` when coin retainer/pay clears.
- `expired` grows much slower relative to assigned ticks (stickiness).
- `cancelled` still rises on death (expected); should not dominate while population alive.
- No increase in forced `buildHouse` without materials / against hunger gates.