# Simulation Atlas v1 - Collab Board (CONDUCTOR)

**Tree:** `C:\Users\kamel\village-sim-1\simulation_atlas_v1\village_edit`
**Updated:** 2026-09-19 ~00:30 HARD
**Absolute target:** **100/100** — continuous.

| Artifact | Status |
|----------|--------|
| Bulletin | **77.1 / 100 HARD** |
| Visuel matiere | **69.5 HOLD** — eye-QA FAIL (no raise) |
| Perf @500 | PASS stable |
| **Eye-QA Vite** | **`http://127.0.0.1:5191`** only (atlas tree) |

**Refuse:** raise Visuel above 69.5 until ocean rim PASSes vs Stardew/Puny/Factorio/RimWorld.
**Vite:** `watch.ignored:**` + `hmr:false` → hard restart `--force` after shorePaint edits. Never trust :5188 for Visuel.

## Visuel 69.5 — WARP_V8C_BLUR_WARP (HOLD / FAIL)

- **Status**: HOLD 69.5 FAIL — z12–z14 ocean rim still reads multi-cell Manhattan vs Stardew/Puny.
- **LIVE :5191**: `SHORE_WARP_BUILD=WARP_V8C_BLUR_WARP`
  - dirt→shore order kept; short land↔water AA only (no sand/cyan mid-band)
  - **Occupancy blur shipped**: `blurredWaterOcc` 7×7 Gaussian (~r=2.5) + mild domain warp `amp=0.4+near*0.95`
  - dirt also uses `blurredDirtOcc` (5×5) so beige parcels leave mid-edges
  - strip overspill expanded (touch r=5, pad ±4) so rounded corners not clipped
- **Probes**: fieldMidFrac ~0.16–0.26 (was ~0.77 binary); deepLandFrac≈0 (no land-over-deep)
- **Still wrong**: painted silhouette still stair/rect at eye-QA; blur rounds math isocontours but land mass still reads grid vs Stardew continuous coast
- **Next lever**: skip per-cell grass blit on shore-adjacent cells (strip owns full rim), or morphological open/close + coast SDF distance paint; not thicker color mid-band

**VISUAL HARD (~00:30):** WARP_V8C_BLUR_WARP live on **:5191**. Occupancy blur live. Eye-QA **FAIL**. Visuel **69.5**. Continuous HARD.