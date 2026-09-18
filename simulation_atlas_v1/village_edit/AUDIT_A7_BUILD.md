# AUDIT A7 - Construction

Workspace: village_edit
Date: 2026-09-16

## Executive summary

Construction spans three tracks: personal homes (planHouse), civic BuildProject queue, and per-household furnitureQueue.

### Fixes applied (no free-material cheats)

| Issue | Fix |
|-------|-----|
| Tables never built | nextFurnitureJob: linen removed from GATHERABLE; prefer wood-only jobs before hearth |
| Wrong furniture marked done | markFurnitureDone matches by kind |
| Home lost on owner death | transferHomeState + spouse heir + orphan reset |
| Project gather stall | nearestResource fallback radius 96 |

## Verification

- Site selection: findBestHousePlot (scored), findBuildSite (radial), pioneer plots
- Materials: 1 wood/wall; furniture recipes spent via spendFurnitureRecipe
- Block-by-block: buildHouse / buildProject one cell per tick
- Furniture: planFurnitureJobs -> nextFurnitureJob -> build* tasks

## Scripts

- _construction_audit.ts: npx tsx _construction_audit.ts [seed] [ticks]
- scripts/_probe_fort.ts: fort progression probe
- scripts/audit-civilization.ts: civ milestones

## Before / after (seed 7)

Before: table=0, pending table=12 at 12000 ticks
After: table=1, builds.table=1, eat@table=2 at 3000 ticks (seed 7 and seed 1)

## Residual risks

- PIONEER_DESIGN: all founding cabins identical 2x2 (intentional)
- Hearths slow: clay from gatherStone bonus, tallow from hunt
- MAX_OPEN=12 and purpose dedupe can block second fort

## Verdict: PASS with documented residual risks