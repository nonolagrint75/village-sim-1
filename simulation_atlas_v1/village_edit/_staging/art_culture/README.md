# Staging: `art_culture`

**Life type:** Lysa (distinctive style founder)  
**Status:** isolated pack — integrator wires; no core imports.

## Causal chain

distinctive style → slow patronage → imitators → art circle → cross-discipline intellectuals → elite funding → public architecture style → multi-gen culture component

## Exports

| Module | Role |
|--------|------|
| `types.ts` | Style, scene, patrons, events |
| `style.ts` | Birth / imitate / distance |
| `scene.ts` | Phase machine + tick |
| `index.ts` | Public surface |

## Integrator hook points

### 1. Seed style (Lysa)

- **Where:** `livelihood.tickLivelihood` / craft practice when `recognition` rising and originality high (map from curiosity + craft mix).
- **Build** `ArtistProfile` with `lifeTag: 'Lysa'` when distinctive; call `trySeedArtScene`.
- Store scenes on integrator-owned `state` bag.

### 2. Slow patronage

- **Where:** `notePatronage` / elite `payForService` / entertain interactions (`interactions.ts`).
- Each soft payment pulse: `applyPatronagePulse(scene, patrons, tick, roll)`.
- Intentionally slow — many pulses before `patronized`.

### 3. Imitators → art circle

- **Where:** nearby craft NPCs with lower originality observe founder (relation / same village).
- `tryAddImitator` → when ≥2 imitators + patronage: `tryFormArtCircle` + create politics `Circle` (`kind: 'craft'`, later art-specific if extended); set `scene.circleId`.

### 4. Cross-discipline salon

- **Where:** teachers, creed speakers, traders with high intellectPull meet artists.
- `tryOpenSalon(scene, intellectuals, tick, roll)`.

### 5. Elite funding

- **Where:** wealthy villagers / firm owners / polity leaders with prestigeNeed.
- `applyEliteFunding` when salon active.

### 6. Public architecture

- **Where:** `build/culture.ts` `imitateStyleBias` / planner `StyleWeights`; keep / shrine / market / hall completion.
- On public build: `onPublicBuild(scene, hint, roll)`.
- Blend `architectureStyleWeights(scene)` into `reinforceStyle` / roof ornament (share-weighted).

### 7. Multi-gen culture component

- **Where:** birth / teach child / ethnos culture features.
- `applyInheritance` on parent→child; set ethnos feature slot or `cultureComponentId` tag so vernacular locks to Lysa motifs across generations.
- `tickArtScene` on culture/village tick.

## Probe tips

- Assert patronage rises slowly (no single-tick jump to elite_funding).
- Multi-gen: `generationDepth >= 2` and `cultureComponentId` set after inheritance.
- Architecture share only moves on `BuildStyleHint` with funding phase.

## Out of scope

- No `src/` edits, no day scripts, no UI.