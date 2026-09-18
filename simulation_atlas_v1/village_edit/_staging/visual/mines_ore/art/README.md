# Mines / ore — visual art pack (staging only)

**Scope:** composition + atlas keys + draw pseudo-API for mine mouths, ore piles, dig scars.
**Write root:** `_staging/visual/mines_ore/art/` only.
**Do NOT** wire into `src/lib/render/nature` or `SimulationCanvas` yet.

Bank: NatureAtlas keys from `src/lib/render/nature` (+ optional PNGs under `src/assets/nature`).
Conventions: props after terrain, multi-cell overflow (Stardew / Factorio / RimWorld / Puny World), no Minecraft 16×16 stamps.

---

## Reject / accept

| Reject | Accept |
|---|---|
| One ore tint per cell (current GOLD/IRON shelf) | Soft mound prop overflowing 1.5–2 cells |
| Hard brown dig squares | Soft scar alpha over meadow grass |
| Flat ellipse + two posts + "mine" label | Timber mouth + rock cheeks + void, 2×2 footprint |
| Grid-cut trunks / half objects | Complete silhouettes sorted by anchor `gy` |

References: Stardew (props after ground), Factorio (scar + mouth readable), RimWorld (mounds not stamps), Puny World (timber + stone), RPG Maker overworld (void entrance).

---

## Preferred atlas keys (bank)

Ground / scar: `grass` family, `grass_grazed`, `grass_grazed_heavy`, `dirt_dark`, `pebbles`, `gravel`, `path_gravel`
Rock / face: `mountain_plateau`, `mountain_face` (16×32 via `blitRect`), `boulder` / `boulder_0..11`, `rock`, `cliff_dark`
Ore: `ore_gold`, `ore_iron` (flecks on mound — never full-cell fill alone)
Timber: `log_oak`, `plank_oak`, `fallen_log`, `tree_stump`
Helpers: `drawGroundShadow`, `drawSouthFace`, `drawNorthLit` from `fauxHeight.ts`

Pack sources (when present): `tiles/rock|pebbles|gravel|dirt*.png`, `block-texture-set/blocks/{gravel,cobblestone,oak_log_side,oak_planks,stone_generic}.png`.
Optional staging PNGs only if QA fails — see `assets/README.md`.

---

## Composition (complete multi-cell props)

### 1) Dig scar — footprint ~3×2

Anchor = mouth cell or dig site. Soft overlay **after** terrain grass, **before** mouth/ore.

```
  [grass][grass][grass]
  [scar ][scar ][scar ]   <- alpha 0.45-0.75 mottled gravel/dirt
  [scar ][scar ][     ]
```

Recipe: grass underlay -> `grass_grazed` / heavy at center -> `pebbles`/`gravel` speckles -> optional tiny `boulder_*` chips (scale 0.22-0.35). Never solid dirt slab.

### 2) Mine mouth — footprint 2×2 (anchor = TUNNEL entrance / `village.mineX,Y`)

```
     lintel (log_oak / plank_oak)
   +--------------+
   | rock | VOID | rock |   <- mountain_face cheeks + dark ellipse
   |cheek |      |cheek |
   +--posts--------posts-+
        dig scar under
```

Draw order inside prop: shadow -> cheeks (`mountain_face` blitRect) -> void ellipse -> posts -> lintel -> north lit on lintel.
Scale ~1.6-2.0 x `tileS` wide; void ~0.55x0.38. Face south when possible (mountain north of mouth).

### 3) Ore pile — footprint ~2×1

Near mouth (+/-1-2 cells) or GOLD/IRON clusters. One mound, not per-cell ore tile.

```
     [  ore flecks  ]
   [ boulder mound  ]-- overflow
   ~~~~ shadow ~~~~
```

Recipe: shadow -> `boulder_{hash%12}` scaled 0.85-1.35 -> tint blit `ore_gold`/`ore_iron` at ~0.55 size, alpha ~0.55 -> south face.
Variant by resource; jitter `ox/oy` +/-0.2 cell.

---

## Z-order (integrator)

```
0 terrain (grass / mountain / tunnel floor)
1 dig scar
2 small plants (skip under scar/mouth)
3 mine mouth
4 ore piles  (sort by gy + oy, same as nature props)
5 optional smoke (alpha ~0.12-0.22, above void)
6 NPCs / buildings
```

Matches nature: terrain -> ground objects -> taller props. Smoke is the only layer above piles.

---

## Draw pseudo-API

Types + full recipe: `composition.ts`, `drawApi.ts`. Sketch:

```ts
drawMineVisuals(ctx, atlas, sites, camX, camY, zoom, tilePx, opts?)
// per site, after nature ground, before NPC pass:
//   drawDigScar -> drawMineMouth -> drawOrePile(s) -> drawMineSmoke?
```

Reuse `NatureAtlas.blit` / `blitRect`, `hash2`, faux-height helpers. Sort piles with trees/bushes by `gy`.

**Do not:** fill GOLD/IRON cells with full-tile `ore_*` alone; draw mouth as UI label; clip props to one cell; add smoke under piles.

---

## Sim hooks (read-only for integrator)

| Signal | Use |
|---|---|
| `village.hasMine` + `mineX,Y` | Mouth + primary scar |
| `TUNNEL` + `amount >= TUNNEL_ENTRANCE_AMOUNT` | Extra mouths |
| Nearby `GOLD` / `IRON` | Pile tint + count |
| Dig activity (optional) | Fresh scar / smoke |

Replace crude ellipse/posts/`mine` text in `SimulationCanvas` (~visual section 28) when wiring — **not in this pack**.

---

## Checklist

- [ ] Scar soft over grass (no brown stamp)
- [ ] Mouth 2x2 complete, overflow OK
- [ ] Ore = mound + flecks, not cell fill
- [ ] Z-order: scar -> mouth -> pile -> smoke
- [ ] Sorted with other props by `gy`
- [ ] No live renderer edits in this pack
