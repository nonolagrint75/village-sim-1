# Construction contract (shared)

**World model:** 2D top-down tile grid (`TILE_PX = 16`). Not full Minecraft 3D.
Blocks sit on the grid with optional layer Z (0 floor · 1 wall/prop · 2+ upper).
Render: **dirty-chunk remesh only** (`BuildChunkRenderer`, 16×16) — never per-frame
house flood-fill. See `BUILD_BOTTLENECKS.md`.

Specialists follow this file + `buildTypes.ts`. **No House01 / fixed template dwellings.**

---

## Roles

| Specialist | Owns | Must not |
|---|---|---|
| Data / voxels | `blockWorld.ts`, `chunk.ts`, `defs.ts`, `bridge.ts` | Per-block JS objects in hot paths |
| Construction AI | `planner.ts`, `tasks.ts`, `culture.ts` | Template footprints as sole geometry |
| Meshing / render | `src/lib/render/buildChunkMesher.ts`, `buildAtlas.ts` | Per-frame organic flood of all houses |
| Integrator | `behaviors` home path, `engine`, this contract | Fight sibling modules — adapt |

---

## Chunk / perf (mandatory)

- **Horizontal chunk:** `CHUNK_SIZE = 16` (align `resourceIndex.CELL` + `BUILD_CHUNK_TILES`)
- **Height:** `DEFAULT_WORLD_HEIGHT = 16` (soft layers; not dense 256)
- **Remesh:** dirty chunks only, budgeted per frame (`BuildChunkRenderer.remeshDirty`)
- **GPU terrain dirty:** coalesce (`patchDirty` — full tex if `n≥64`, else row/bbox; never stamp storms of 1×1)
- **DON'T:** per-block Three.js, full remesh every frame, structured-clone dense 3D grids, organic house BFS every RAF

---

## Block model

- Registry: `BLOCK_DEFS` / `defId` ↔ legacy terrain codes (`HOUSE`, `PLANK`, `WALL_*`, furniture)
- Sparse SoA chunks: `ChunkStore` (`Uint16` defId + state/durability/owner/…)
- API: `placeBlock` / `removeBlock` / `getBlock` / `markChunkDirty` / `takeDirty`

Migration: **terrain remains live render source**; `state.blocks` mirrors structure layers + dirty keys.

---

## Plan structure (AI)

```
Needs → HomePlannerBrief → planHomeSpatial → SpatialHomePlan
     → emitBuildQueue → BuildBlock[] → placeBuildBlock (terrain + blocks)
     → unique per family; expand via planHomeSpatial(mode:'expand')
```

Soft culture: `observeNeighborHomes` / `imitateStyleBias` / `rememberBuiltShape` — morphology weights, not catalog stamps.

---

## Render hookup

1. `placeBuildBlock` → `setTerrain` → `grid.dirty`
2. Worker transfers dirty → `BuildChunkRenderer.markDirtyIndices`
3. Draw: remesh dirty 16×16 chunks (greedy + atlas) + furniture after blit
4. `organicCloseup` = vegetation / mills only
