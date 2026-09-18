# Emergence Master — Orchestration (Phase 0)

Canon: village_edit (nono_simu_2d / nolan-work). Forbidden: nono_simu_3d / Bevy / Rust.

## Shared (ORCHESTRATOR write-only)
- src/lib/sim/behaviors.ts
- src/lib/sim/types.ts
- src/lib/sim/engine.ts
- src/lib/sim/construction.ts (do not replace)

## Agent A — Cognition
Write: src/lib/sim/cognition/**
Deliverable: decision_audit.md

## Agent B — World / build space
Write: architecture.ts, rooms.ts, build/{home*,planner,chunks,tasks,cleanup,culture,stateBridge,block*,bridge,chunk,defs,buildTypes}*
Deliverable: world_emergence_audit.md
Do NOT overwrite construction.ts

## Agent C — Economy
Write: economy/**, careers.ts, livelihood.ts, commerce.ts
Deliverable: economic_emergence_audit.md
No second economy/inventory/currency

## Agent D — Tasks / collab
Write: build/workOrders.ts, npcBuildBehaviors.ts, collabContracts.ts
Deliverable: task_emergence_audit.md

## Agent E — Metrics / long-run
Write: build/emergenceMetrics.ts, scripts/_probe*
Deliverable: emergence_protocol.md

## Baseline
Reuse _lot3d_emergence_report.json (seed 7, 10k) as seed-7 baseline.