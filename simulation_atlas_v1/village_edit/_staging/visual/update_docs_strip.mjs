import fs from "fs"

const boardPath = "_staging/COLLAB_BOARD.md"
let board = fs.readFileSync(boardPath, "utf8")
const stamp = `**Updated:** 2026-09-18 ~21:40 HARD`
board = board.replace(/\*\*Updated:\*\*[^\n]+/, stamp)
if (!board.includes("shared viewport dirt/shore strips")) {
  board = board.replace(
    /\*\*VISUAL HARD ground \(21:22\):[^\n]+/,
    `**VISUAL HARD shorePaint (21:40):** revived shared viewport dirt/shore ImageData strips (r=2/3, ppc~10-16); dirtSdf warp*2.85 edge-only blob; per-cell organic skipped. eye-QA still FAIL dirt/shore stairs — Visuel **69.5 HOLD**. Next: world-buffer naturePixel32 dirt/shore match strip + stronger field carve.`,
  )
}
fs.writeFileSync(boardPath, board, "utf8")

const rc = `# Shore / dirt root-cause (Visuel 69.5)

## Eye-QA (2026-09-18 ~21:38) — FAIL

Refs: Stardew continuous water, Puny organic dirt, Factorio soft body, RimWorld meadow blobs.
Proof: \`_staging/visual/eyeqa_dirt_strip_expand_pre.png\` (+ latest browser strip_expand3).
**Visuel stays 69.5 HOLD. No raise. No soft LIVE.**

## Shipped (shorePaint owner — this pass)

| Lever | Status |
|-------|--------|
| dirtSdf warp *2.85 + edge-only blob (no swiss-cheese) | live |
| dirtField opaque bias smoothstep(-1.05, 0.55) | live |
| Shared \`paintViewportDirtStrip\` / \`paintViewportShoreStrip\` ImageData AABB | live |
| Strip radius dirt r=2 / shore r=3; ppc max 16 | live |
| Per-cell organic dirt/shore skipped (FPS + double-stairs) | live |
| Vite must be hard-restarted — HMR often served stale shorePaint | note |

## Still fails vs refs

- Dirt/sand coast still reads **stair/rect** at z14 (beige Manhattan rim).
- Water edge still blocky vs Stardew/Puny continuous.
- ~2–3 i/s at Max zoom with dense strip — keep FPS in budget on next densify.

## Next lever

1. Align \`naturePixel32\` world-buffer dirt/shore field with strip (far zoom + hole fill).
2. Or paint strip at screen resolution for edge band only (1–2 cells) with full SDF.
3. Stronger domain-warp on field isocontour until silhouette leaves tile grid.

## Raise rule

Raise Visuel above 69.5 only on eye-QA PASS. Continuous to Visuel 100.
`
fs.writeFileSync("_staging/visual/SHORE_DIRT_ROOTCAUSE.md", rc, "utf8")
console.log("docs_updated")
