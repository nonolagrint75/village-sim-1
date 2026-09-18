# Staging: `religion_schism`

**Life type:** **Samir** (creed reinterpret -> following -> famine charity -> belief tension -> faith schism -> **moderates / radicals split** -> regional creed). Soft tag — not a day-timer biography.
**Status:** isolated pack READY — integrator wires; no core imports.
**Scenario:** S24 Religion schism

## Causal chain

creed reinterpret -> faith following -> famine charity -> belief tension -> faith schism -> wing split (moderates vs radicals) -> rival circles -> regional creed lock

## Exports

| Symbol | Role |
|--------|------|
| `tryReinterpretCreed` | Samir soft reinterpret of parent creed |
| `applyFaithFollowing` | Convert / deepen followers |
| `applyFamineCharity` | Charity during hunger raises following + tension |
| `raiseBeliefTension` | Tradition vs grievance gap |
| `tryFaithSchism` | Split when two creeds tense; returns moderate/radical ids |
| `tryRegionalCreed` | Lock dominant creed across villages |
| `tickReligionSchism` | Phase advance helper |
| `schismStats` | Probe snapshot |

## Integrator hook points

1. **Reinterpret** — after `maybeCrystallizeFaithCreed` / belief tick in `religion.ts`: if high piety + curiosity, `tryReinterpretCreed`.
2. **Following** — `trySpreadCreed` / counsel: `applyFaithFollowing`.
3. **Charity** — famine / hunger circle food share: `applyFamineCharity`.
4. **Schism** — wrap `maybeFaithSchism`: call `tryFaithSchism` then create second `Circle` kind `faith` + `noteConflict(state,'schism')`. Map radicals to reform creed, moderates to compromise creed.
5. **Regional** — multi-village polity tick: `tryRegionalCreed`.
6. Store bag on integrator state; `tickReligionSchism` beside `tickReligionWorld`.

## Files

- `types.ts`, `util.ts`, `creed.ts`, `charity.ts`, `schism.ts`, `tick.ts`, `index.ts`

## Name map (peek-only)

- `religion.ts` — `maybeFaithSchism`, `tickReligionWorld`, `noteSpiritualCounsel`
- `politics.ts` — faith circles, `creedWeight`, `noteConflict(..., 'schism')`

## Out of scope

No `src/` edits, no day scripts, no UI, no commit.