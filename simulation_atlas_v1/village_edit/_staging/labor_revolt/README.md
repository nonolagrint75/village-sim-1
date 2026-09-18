# Staging: `labor_revolt`

**Life types:** Rami (organizer), Tomas (rank-and-file)  
**Status:** isolated pack — **do not import from World / canvas / index hubs until integrator wires it.**

## Causal chain

bad conditions → worker group → wage cut / strike → labor institution → repression → negotiate vs overthrow → food crisis → mass protest → army refuses → regime collapse → new polity → elite backlash

No day scripts. Phases advance from sim signals (hardship, wages, repression, food, army loyalty).

## Exports

| Module | Role |
|--------|------|
| `types.ts` | Movement, phases, hints, events |
| `conditions.ts` | Hardship score, wage cut, organizer pick |
| `movement.ts` | Phase machine + tick |
| `index.ts` | Public surface |

## Integrator hook points

Call from existing systems; map soft ids to core entities.

### 1. Economy / firms / livelihood (wage + hardship)

- **Where:** firm hire/pay tick, or village surplus inequality (`villageInequality`, firm wages).
- **Build** `WorkConditionsHint` + `WorkerProfile[]` from villagers with craft/labor activity (exclude elites).
- **Call:** `createLaborMovement(hint, workers, polityId)` when null for that village.
- **On wage drop:** `applyWageCut(movement, newIndex, tick)` then `tryBeginStrike`.
- Soft map: `lifeTag: 'Rami'` if high `organizePull` + sociability; `'Tomas'` for aggrieved laborers.

### 2. Politics / circles (group → institution)

- **Where:** `politics.ts` circle tick / `emergence/groups.ts`.
- **On** `phase === 'worker_group'`: create Circle `kind: 'craft'` (or extend kinds later) with `originStory` labor; store `movement.circleId`.
- **Call:** `tryFormLaborInstitution(m, tick, circleId)` when strike sustained → set `Circle.isInstitution = true`, bump `noteInstitutionFormed`.

### 3. Authority repression

- **Where:** polity enforcement / war garrison / `tryRecordCoup` adjacent.
- **Build** `RepressionHint` from polity legitimacy low + grief high + available soldiers.
- **Call:** `applyRepression(m, hint)` → if `'refuse'`, lower soldier task bias / desertion (`state.deserters` path); if `'obey'` and crushed, dissolve circle.

### 4. Fork: negotiate vs overthrow

- **Where:** after repression event, before next polity tick.
- **Call:** `resolveLaborFork(m, { movementId, prefer: 'auto' | from beliefs }, tick, roll)`.
- Negotiate path: raise wageIndex / fairness norms; overthrow: raise grievance, feed war module.

### 5. Food / ecology

- **Where:** famine feel (`feelFamine` / village food stress).
- **Call:** `applyFoodCrisis` → `tryMassProtest`.

### 6. Army refusal → collapse → polity

- **Where:** `war.ts` / polity leadership; soldier `beliefs.loyalty`.
- When `phase === 'army_refuses'` or mass protest + low army loyalty: `tryRegimeCollapse` → `formSuccessorPolity` with new `Polity` (integrator allocates id) → `applyEliteBacklash` from wealthy actors’ wealth/power scores.
- Chronicle: `logCause` / `logEvent` from `movement.events`.

### 7. Tick

- Each CIRCLE/POLITY tick: `tickLaborMovement(m, { tick, roll, cityStress })` for active movements on `state` bag (integrator-owned array; not wired yet).

## Probe tips

- Count movements by phase; assert no phase skip without matching event kinds.
- Multi-seed: same roll stream → same phase transitions given same hints.

## Out of scope (producer)

- No edits under `src/`.
- No UI panel (integrator may later surface strike / collapse in SimPanel).