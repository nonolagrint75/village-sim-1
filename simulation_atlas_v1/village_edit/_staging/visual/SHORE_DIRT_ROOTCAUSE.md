# Shore / dirt root-cause (Visuel 69.5)

## Eye-QA (2026-09-18 ~22:12) — FAIL
Refs: Stardew continuous water, Puny organic dirt.
Proof: `eyeqa_opaque_sdf_z14_FAIL.png`
**Visuel stays 69.5 HOLD.**

## Shipped this pass
| Lever | Status |
|-------|--------|
| Kill cyan mid-band color lerp (land↔water) | live — `shoreHardRgb` water/deep only |
| Soft alpha-over-grass banned (recreated cyan) | live — hard `f>=0.5` opaque |
| naturePixel32 hard pick (no cell-average mid) | live |
| Solid deep fill underlay (no atlas water light rim) | live |
| Dirt hard cover + mid-band carve | live |
| Chunked strips + exact `stripCanvas` size | live |
| Vite hard restart | done |

## Still fails
- Hard SDF isocontour still too grid-aligned at z10–14 (shape stairs, not just color).
- Beige sand/dirt island edges still Manhattan.
- Occasional horizontal tear (canvas reuse) — exact-size fix pending verify.

## Next
Stronger shoreSdf/dirtSdf domain warp until hard 0.5 contour snakes through cells (Stardew).
## Warp lever (~22:20)
- domainWarp amp up (low 1.85, mid 1.05, high 0.62)
- shoreSdf fine bil weight 0.55→0.28
- shoreField edgePush before smoothstep + stronger mid carve
- File was truncated by bad regex patch; restored head+tail

