# Career demand - integration notes for assignProfession

**Owner:** Dynamic career agent (`src/lib/sim/behaviors.ts` -> `assignProfession`).
**Helpers:** `src/lib/sim/careers.ts` (implemented; not wired yet).

---

## Profession enum (`types.ts`)

```ts
export type Profession =
  | 'none'
  | 'forager'
  | 'farmer'
  | 'miller'
  | 'lumberjack'
  | 'mason'
  | 'guard'
  | 'builder'
  | 'herder'
  | 'trader'
  | 'fisher'
  | 'weaver'
  | 'blacksmith'
  | 'miner'
```

`none` = unassigned / soft-abandoned. Livelihood titles (troubadour, pretre, gourou) live in `livelihood.ts` and can retitle `profession` via `softProfession` - separate from this macro demand vector.

---

## When assignProfession runs

| Trigger | Location | Condition |
|---------|----------|-----------|
| First house / village join | `behaviors.ts` ~4761 | `v.profession === 'none'` after founding home |
| Initial assignment | `behaviors.ts` ~5420 | `v.profession === 'none' && v.hasHome` (each villager tick) |
| Periodic review | `behaviors.ts` ~5421-5457 | `v.hasHome && (state.tick + v.id * 17) % PROFESSION_REVIEW === 0` where `PROFESSION_REVIEW = TICKS_PER_DAY * 5` (~5 in-game days) |

Review path applies `professionLockInBonus` threshold before switching; demand helpers only affect the **score table**, not lock-in.

Existing score inputs (keep all):
- Local resource density (wood, stone, iron, water, climate)
- Village infra (`hasMill`, `hasPort`, `tradeRuns`, `hasMarket`, `prosperity`)
- Job saturation (`countJob`)
- Personality (courage, ambition, sociability, curiosity, generosity)
- `farmerProfessionPressure` from `fields.ts`
- `professionSkillPrefScore` (cognition/labor)
- Livelihood practice mix (`mind.livelihood.mix`)

---

## Demand vector (`careers.ts`)

| Axis | Signal sources | Professions nudged |
|------|----------------|-------------------|
| `foodNeed` | `village.surplus` food chain per capita, `state.famine`, `villageInFamine` | farmer, forager, fisher, herder, miller |
| `forgeNeed` | iron/wood/stone surplus vs `development`, `hasMine` | blacksmith, miner, lumberjack, mason |
| `tradeNeed` | port/market/tradeRuns/prosperity/SoL; x0.3 under famine | trader |
| `guardNeed` | `village.security` (or `villageSecurity`), nearby wolves/bandits, recentDeaths/thefts | guard |
| `cultureNeed` | SoL > ~0.38, shrine/rites, peaceTicks; **0** if famine or SoL < 0.28 | weaver, builder, mason (soft) |

All axes normalized **0-1**. Applied as additive score bumps (~30-46 pts at max), comparable to `farmerProfessionPressure` (28-55).

---

## Exact insertion points

### 1. Import (top of `behaviors.ts`, near `./fields`)

```ts
import { applyCareerDemandToScores, computeCareerDemand } from './careers'
```

### 2. Inside assignProfession - after scores object, before skill/mix loop

**File:** `src/lib/sim/behaviors.ts`
**After:** closing `}` of `const scores: Record<Profession, number> = { ... }` (~line 1745)
**Before:** `// DF-like: skill + labor preference drift` (~line 1747)

```ts
  const demand = computeCareerDemand(state, village)
  applyCareerDemandToScores(scores, demand)
```

**Rationale:** Macro village shortage/surplus first; individual skills + livelihood mix refine on top (same order as `farmerProfessionPressure`, which is already inside `scores.farmer`).

### 3. Optional debug probe

```ts
import { computeCareerDemand, careerDemandForProfession } from './careers'
const d = computeCareerDemand(state, village)
console.log(village?.id, d, careerDemandForProfession(d, 'farmer'))
```

---

## Livelihood coordination

- `tickLivelihood` (~5422+) runs **after** profession review on the same tick - no conflict.
- Livelihood `softProfession` retitle (~livelihood.ts 583+) uses practice mix, not demand vector - demand should **not** override crystallized `roleTag`.
- `professionLockInBonus` still gates switches - high `foodNeed` alone will not flip a locked smith to farmer unless score gap exceeds threshold.

---

## Related existing hooks (do not duplicate)

| Helper | Module | Used for |
|--------|--------|----------|
| `farmerProfessionPressure` | `fields.ts` | farmer gap vs pop/fields |
| `professionLockInBonus` | `politics.ts` | switch resistance |
| `professionSkillPrefScore` | `cognition/labor.ts` | skill/pref drift |
| Livelihood mix block | `behaviors.ts` ~1753 | practice-based pull |
| `computeLaborBalance` | `commerce.ts` | migration/unemployment (not profession pick) |

---

## Verification checklist

1. Famine village -> `foodNeed` >= 0.75, `cultureNeed` = 0, `tradeNeed` suppressed.
2. Ore-rich + low iron surplus + `hasMine` -> `forgeNeed` elevated.
3. Port + market + fair SoL, no famine -> `tradeNeed` > 0.4.
4. Low `security` + wolves nearby -> `guardNeed` > 0.5.
5. SoL boom + shrine + peace -> `cultureNeed` > 0.3.
