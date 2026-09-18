# Visual staging — producer → integrator contract

Packs under `_staging/visual/<theme>/` stage **look + causal scar signals** before any live `src/` edit.

## Pipeline

```
logic agent          art agent
     │                    │
     ▼                    ▼
  logic/                art/
  (events, hooks,       (prop recipes, z-order,
   scar exports)         atlas composition)
     │                    │
     └────────┬───────────┘
              ▼
      visual integrator
              │
              ▼
   nature engine + snapshot actors
   (`src/lib/render/nature`, `snapshot` ruins/keeps,
    `settlementView` overlays — live write only by integrator)
```

## Roles

| Role | Writes | Never writes |
|------|--------|--------------|
| **Logic producer** | `_staging/visual/<theme>/logic/` — event kinds, causal chains, export shapes for the renderer | `src/lib/sim/**`, nature atlas |
| **Art producer** | `_staging/visual/<theme>/art/` — complete props, layer order, source tile recipes | live textures in `src/assets` without integrator OK |
| **Visual integrator** | maps staging exports → `ActorRuin` / keeps / nature keys / draw path | invents new sim timers; skips causal hooks |

## Contract rules

1. **No live `src/` edits from producers.** Staging only. Integrator owns the merge.
2. **Names only from live sim.** Peek `war`, `bandits`, `settlements`, `crisisPhase`, `ActorRuin` — re-declare local staging types (no core imports) so packs stay droppable.
3. **Events are the handoff.** Logic exports a typed event list (tick, kind, xy, intensity, age). Art binds each kind to a prop recipe + z-layer. Integrator wires emit → snapshot → draw.
4. **Complete objects.** Props are full silhouettes (rubble pile, palisade segment, cart). No grid-cut trees, no half-house stamps.
5. **Z-order stable.** Ground scars → field ash → rubble base → walls/palisades → carts/refugees → canopy/high props (see theme `art/z-order.md`).
6. **Causal, not calendar.** Scars follow war/raid/revolt/famine/rebuild — never "day 40 spawn burn".
7. **Nature engine is the target renderer.** Prefer composing from `src/assets/nature` + block pack tiles; new pixels only when composition cannot express the scar.

## Theme pack layout

```
_staging/visual/<theme>/
  README.md          # integrator hooks + live name map
  logic/
    types.ts         # local types + export events
    events.ts        # catalog / emit helpers (staging)
    README.md        # causal chains
  art/
    props.ts         # prop recipes (atlas keys + footprint)
    z-order.md       # layer contract
    README.md        # composition notes + references
```

## Current themes

| Pack | Focus |
|------|--------|
| [`war_scars/`](./war_scars/) | Burned fields, ruined houses, post-attack fortify, famine stress, rubble / palisades / refugee carts |
| [`mines_ore/`](./mines_ore/) | Mine mouths / ore richness visuals (sibling pack) |
| [`ground_items/`](./ground_items/) | §57 drop/pickup/decay (work/combat/trade) + nature prop recipes |
| [`activity_tools/`](./activity_tools/) | §20 work arcs: tool + target + progress; overlays / poses |

## Integrator checklist (per theme)

- [ ] Map each `ScarEventKind` → snapshot actor or nature overlay key
- [ ] Preserve intensity + ageDays for fade / moss (existing `ActorRuin` pattern)
- [ ] Fortify after attack → `ActorKeep` / `wallTier` scaffolds, not free-floating walls
- [ ] Famine stress = soft visual flag only (no fake food spawn)
- [ ] Smoke-test z-order on a crisis village + open war capital
- [ ] Compare vs Stardew / Factorio / RimWorld / Puny World overworld — refuse MC stamp / pond-U water / cut trees