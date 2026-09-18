# Emergence protocol (nono_simu_2d / Lot 3D)

Objective measurement of **construction / work-order emergence**. Scope is `village_edit` (2D). Do not use this for `nono_simu_3d`.

Prior single-seed baseline: [`_lot3d_emergence_report.json`](_lot3d_emergence_report.json) — seed **7**, horizons 1k / 5k / 10k, same sim footprint as below.

---

## What counts as a real action

Counters live in `src/lib/sim/build/emergenceMetrics.ts` and bump **only** via `note*` hooks on successful gameplay events. Probes must **never** invent increments.

| Counter | Real action (hook) | Not counted |
|---------|-------------------|-------------|
| `workOrdersCreated` | WO spawned (`noteWorkOrderCreated`) | Proposals / options lists |
| `workOrdersCompleted` | WO terminal success (`noteWorkOrderCompleted`) | Status polls |
| `workOrdersFailed` | WO fail path (`noteWorkOrderFailed`) | Soft stalls without fail |
| `workOrdersCancelled` | Cancel path (`noteWorkOrderCancelled`) | — |
| `workOrdersExpired` | Expiry (`noteWorkOrderExpired`) | — |
| `blocksBuilt` | Block placed on home queue (`noteBlockBuilt`) | Planning / queue attach alone |
| `materialsMoved` | Successful haul transfer (`noteMaterialsMoved`) | Pathing without deposit |
| `wagesPaidCoins` | Wage coins paid (`noteWagePaid`) | Hire attempt without pay |
| `homesStarted` | Home build site started (`noteHomeStarted`) | — |
| `homesCompleted` | Queue done / home finished (`noteHomeCompleted`) | — |
| `taskSwitches` | `setTask` kind change (`noteTaskSwitch` / bound) | Same-kind refresh |

**Chains** (`emergence.chains`): ring buffer of short strings for those same events (capped). Observational only.

**Snapshot extras** (`snapshotEmergence`): live state (alive, hunger, open WOs, etc.) — context, not “fake progress.”

Honesty note: `materialsMoved` / `wagesPaidCoins` stay **0** until call sites in build behaviors invoke the hooks. Do not patch counters from the harness.

---

## Sim footprint (baseline-comparable)

Matches `_probe_lot3d_emergence.ts` / master harness:

```ts
createSimulation(seed, {
  initialVillagers: 36,
  maxPopulation: 80,
  worldSize: 600,
  preset: 'standard',
  wolfCount: 3, // explicit; diverge mode changes this only
})
```

---

## How to run

### Single seed (legacy Lot 3D probe)

```bash
npx tsx scripts/_probe_lot3d_emergence.ts [seed=7]
```

Writes `_lot3d_emergence_report.json`.

### Multi-seed master harness (preferred)

Default seeds **7, 42, 100, 999** and horizons **1000, 5000, 10000**:

```bash
npx tsx scripts/_probe_emergence_master.ts
```

CI / short smoke:

```bash
npx tsx scripts/_probe_emergence_master.ts --horizons=200,500 --seeds=7,42
```

Custom output path:

```bash
npx tsx scripts/_probe_emergence_master.ts --horizons=1000 --seeds=7 --out=_tmp_emergence.json
```

Writes `_emergence_master_report.json` (or `--out=…`) plus markdown baseline tables to stdout.

### Reproducibility mode

Same seed, two independent runs in **isolated Node processes** (avoids module-global bleed) — fingerprints must match:

```bash
npx tsx scripts/_probe_emergence_master.ts --repro --seed=7 --horizons=500
```

Exit code `0` = match, `1` = mismatch. Fingerprint covers core counters + alive / deaths / villages / coinTotal at the final horizon. If isolated repro still fails, the sim has true non-determinism (not just in-process state).

### Divergence mode (one causal knob)

**Knob:** `wolfCount` (SimConfig only).

| Mode | `wolfCount` | Intent |
|------|-------------|--------|
| Baseline | `3` | Same as lot3d / standard-ish pressure |
| Diverge | `7` | Higher predator pressure → more flee/death risk → less build throughput expected |

No behavior / economy / construction edits — only the config field.

```bash
npx tsx scripts/_probe_emergence_master.ts --diverge --seeds=7,42 --horizons=500
```

Compare baseline vs alternate tables; `sameFingerprint` false indicates the knob moved outcomes.

---

## Baseline table format

Produced by `formatEmergenceBaselineTable` (also printed by the master harness):

| seed | tick | alive | deaths | villages | blocks | homes✓ | WO+ | WO✓ | WO✗ | WO⊘ | WO⏱ | haul | wages | switches | fingerprint |
|------|------|-------|--------|----------|--------|--------|-----|-----|-----|-----|-----|------|-------|----------|-------------|
| 7 | … | … | … | … | … | … | … | … | … | … | … | … | … | … | e:… |

Columns map to real-action counters + survival context. Use one table **per horizon** when comparing seeds.

---

## Prior baseline (seed 7 @ 10k)

From `_lot3d_emergence_report.json` (reference — re-runs may differ if gameplay changed):

| horizon | alive | blocks | homes✓ | WO✓ | WO✗ | WO⊘ | WO⏱ | haul | wages | switches |
|---------|-------|--------|--------|-----|-----|-----|-----|------|-------|----------|
| t1000 | 37 | 33 | 0 | 0 | 5 | 0 | 2 | 0 | 0 | 972 |
| t5000 | 25 | 44 | 0 | 0 | 8 | 25 | 36 | 0 | 0 | 6636 |
| t10000 | 0 | 44 | 0 | 0 | 8 | 32 | 36 | 0 | 0 | 7000 |

Interpretation: blocks placed without completed homes / WO✓; population collapse by 10k; haul/wage hooks not firing (0). Master multi-seed runs should cite this file when judging regressions on seed 7.

---

## Library API (exports)

From `src/lib/sim/build` / `emergenceMetrics`:

- `snapshotEmergence(state)` — live + cumulative metrics
- `coreEmergenceCounters(m)` — real-action fields only
- `fingerprintEmergence(snap)` — reproducibility string
- `baselineRowFromSnap(seed, snap, { deaths, villages })`
- `formatEmergenceBaselineTable(rows)`
- `compareEmergenceRepro(a, b)`

---

## Rules for agents / CI

1. Import `createSimulation` / `stepSimulation` only — no gameplay rewrites from this harness.
2. Do not increment emergence counters in scripts.
3. Prefer shorter `--horizons` in CI; keep full 1k/5k/10k for long-run audits.
4. When claiming “emergence improved,” show multi-seed baseline tables + seed-7 delta vs `_lot3d_emergence_report.json`.
