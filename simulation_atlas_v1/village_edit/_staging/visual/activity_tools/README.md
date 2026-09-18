# Pack: activity_tools (scorecard §20)

**Goal:** visible work arcs — agent has **tool + target + progress** for farm / smith / chop / mine / craft.

| Side | Path | Role |
|------|------|------|
| Logic | `logic/` | WorkArc bag + sync events |
| Art | `art/` | overlays, target cues, progress arc |

## Integrator hooks

1. **Sim tick** — `syncWorkArcs` from villagers with active `Task` + `laborWorkNeeded`.
2. **Snapshot** — attach `progress`, `family`, `targetX/Y` on villager actors (or parallel `activityArcs[]`).
3. **Draw** — upgrade `entityArt.drawTaskActivity` with real progress; optional nature blit at target.
4. **Cross-pack** — mine arcs should agree with `mines_ore` mouth activity; chop leftovers feed `ground_items`.

## Live files (integrator only)

- `src/lib/sim/behaviors.ts` — `laborWorkNeeded`, task.work increments
- `src/lib/sim/snapshot.ts` — villager actor fields
- `src/lib/sim/entityArt.ts` — `drawTaskActivity`
- `src/components/SimulationCanvas.tsx` — draw order

Producers do **not** edit live `src/`.
