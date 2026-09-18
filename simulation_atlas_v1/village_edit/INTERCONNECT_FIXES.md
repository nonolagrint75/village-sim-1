 INTERCONNECT FIXES — FOOD SHORTAGE

Bidirectional famine consequences across careers, tasks, trade, prices, and conflict.
**No free-food cheats / yield buffs** — only score gates and demand wiring.

## Loop (intended)

```
local/global famine (feelFamine)
  ├─→ careers.foodNeed ≥ 0.75 → assignProfession (farmer/forager/fisher/herder/miller)
  ├─→ cultureNeed = 0; tradeNeed soft floor (food-relief traders)
  ├─→ giveFood ↑ ; leisure/luxury ↓
  ├─→ tradeRun food → starving villages (if surplus + routes)
  ├─→ priceUrge(wheat/flour/bread) → farmers sow/harvest + millers grind/bake
  ├─→ steal/confront slight ↑ when trust low
  └─→ migration (politics.migrationUrge via villageInFamine) [existing]
```

Reverse (surplus): high per-capita food + !famine raises `cultureNeed` (specialization pressure).

## Status

| Link | State |
|------|--------|
| `villageInFamine` / `feelFamine` → `computeCareerDemand.foodNeed` | **WIRED** — `careers.ts`; applied in `assignProfession` via `applyCareerDemandToScores` |
| Famine → higher `giveFood`, lower leisure/luxury | **FIXED** — share ×1.55 (+ `share_famine` stack); no longer damped by `survivalChat`; weave/experiment damp; leisure interrupt uses `villagerFeelsFamine` |
| Famine → `tradeRun` food toward starving villages | **FIXED** — removed hard `!famine` gate for food-chain deals; `findTradeOpportunity` boosts food→hungry dest |
| Food surplus → `cultureNeed` | **STRENGTHENED** — `perCapFood > 0.9` adds culture pressure; still 0 under famine |
| `priceUrge` farmers + millers | **FIXED** — `grainPriceUrge` on sow/harvest; millers already had grind/bake `priceUrge` |
| Conflict steal/confront under famine + low trust | **FIXED** — slight score bumps only (no massacre) |
| Migration under local famine | **EXISTING** — `politics.ts` |

## Gaps closed (this pass)

1. **`tradeRun` blocked by `!famine`** — Global/local famine zeroed all caravans. Now peace trade stays gated, but **food-chain relief** (`food`/`bread`/`wheat`/`flour`/`fish`/`meat`/`game`) can fire for traders/farmers/millers with a larder floor. Destinations in `villageInFamine` get extra score.
2. **`giveFood` damped by `survivalChat` under famine** — Sharing used the same chat muffler as plaza talk. Famine now uses a dedicated `shareMul` and a base ×1.55.
3. **Farmers ignored market prices** — Millers responded to flour/bread prices; sow/harvest now multiply by `grainPriceUrge` (wheat/flour/bread/food).
4. **`tradeNeed *= 0.3` wiped relief traders** — Floor at 0.2 under famine so a food-caravan métier can still crystallize.
5. **UTF-16 `careers.ts`** — Rewrote as UTF-8 (file had been UTF-16 LE and broke edits).

## Already correct (verified)

- `assignProfession` calls `computeCareerDemand` → `applyCareerDemandToScores` (food bucket → farmer/miller/…).
- `feelFamine(state, village)` at `chooseTask` entry (local OR global).
- Leisure / entertain / counsel hard-gated under famine.
- Steal already had `famine ? 45`; confront now adds low-trust spite.
- Politics migration + `share_famine` norms remain.

## Probe — seed 7 / 30d

```bash
npx tsx scripts/_probe_food_shortage.ts 7 30
```

- Runs natural path; if no famine by ~d20, **induces** pantry/hunger crisis (drain stocks + set `state.famine`, no yield buff).
- Expect: `foodNeed ≥ 0.7` under feel/induced famine; food professions stable or rising vs early snapshot.
- Document path in probe JSON: `"path": "natural" | "induced"`.

## Key files

- `src/lib/sim/ecology.ts` — `villageInFamine`, `feelFamine`, `villagerFeelsFamine`
- `src/lib/sim/careers.ts` — demand vector + assignProfession scores
- `src/lib/sim/behaviors.ts` — giveFood, tradeRun relief, grainPriceUrge, conflict, luxury damp
- `src/lib/sim/commerce.ts` — `findTradeOpportunity` food→hungry boost
- `src/lib/sim/politics.ts` — migration / share_famine (unchanged this pass)
- `scripts/_probe_food_shortage.ts`

## Do not

- Buff berry/wheat yields to “fix” famine.
- Spawn free food into inventories.
- Hard-script profession switches outside demand scores.

---

## Society

Politics / circles / guilds / creeds wired into economy and construction. No garnish-only multipliers.

### Status

| Link | State |
|------|--------|
| Guild teach_apprentice -> profession skills | FIXED — drips metier skills (farm/mine/trade/build) via primarySkillsForProfession, not craft-only |
| Commerce SoL / development -> buildMill / buildPort | FIXED — urge x SoL + development (+ market / tradeRuns / prosperity for ports) |
| Commerce -> career cultureNeed | FIXED — development, market, tradeRuns, prosperity raise builder/weaver/mason demand |
| Relations trust -> trade willingness | FIXED — tradeRelationModifier scales with trust (cold partners damp hard) |
| Relations trust -> giveFood | FIXED — base share score, politicalTaskBias, and ToM factor all use rel.trust |
| Creed politicalTaskBias | LIVE — decide.fillFactorProduct -> politicalFactor -> politicalTaskBias |
| Merge orphans / broken calls | FIXED — combatStarveFood typo; SimPanel Profession/SimStats imports; restored isCulturalTitleOverlay |

### Orphan grep (not dead)

| Symbol | Verdict |
|--------|---------|
| computeCareerDemand | Used — behaviors.assignProfession |
| applyProfessionChange | Used — crystallize / soft abandon / livelihood softProfession |
| villageInFamine / feelFamine | Used — careers + politics; feelFamine wraps local/global |
| careerDemandForProfession | Exported helper; not required on hot path |
| isCulturalTitleOverlay | Restored — livelihood sacred overlay (pretre/gourou) |

### Root causes addressed

1. Guild teaching was craft-generic — tickGuildLife only bumped craft/social.
2. Infra urge ignored living standards — mill/port ignored SoL/development.
3. Trust was garnish — giveFood and tradeRelationModifier ignored trust.
4. Merge breakage — combatStarveBag undefined; SimPanel missing types; isCulturalTitleOverlay missing.

### Key files (Society)

- src/lib/sim/politics.ts — tickGuildLife, tradeRelationModifier, politicalTaskBias
- src/lib/sim/careers.ts — cultureNeed commerce terms + isCulturalTitleOverlay
- src/lib/sim/behaviors.ts — mill/port urge, giveFood trust, combatStarveFood
- src/lib/sim/cognition/labor.ts — primarySkillsForProfession
- src/lib/sim/cognition/decide.ts — ToM giveFood trust; politicalFactor wire
- src/components/SimPanel.tsx — Profession / SimStats imports

### Creed bias still applied

Creed multipliers (partage, commerce_libre, piete, tradition, changement, protection, ordre) remain inside politicalTaskBias.

## Probe result (seed 7 / 30d, this pass)

```
day8:  foodProfs=7  foodNeed≈0  (surplus villages; cultureNeed high)
day20: foodProfs=9  no natural famine → induced pantry crisis
       foodNeed→1.0  cultureNeed→0  tradeNeed floor≈0.2
day30: foodProfs=11 (foragers 3→7) after recovery; tradeRuns continued on several villages
```

- **Natural path:** seed 7 stays food-solvent through d20 (no global/local famine).
- **Induced path:** demand vector flips immediately (`foodNeed=1`, culture off, trade floor).
- Profession lock-in means midlife flips take more than 10 days; foodish count still rose 7→11 over the run (foragers under food pressure + existing farmers).


## Profession vs livelihood (single occupational identity)

**Authority:** v.profession drives jobBonus, personal field claim/sow/release, career switches, and default UI label.

| Path | Behavior |
|------|----------|
| applyProfessionChange (careers.ts) | Sets metier, releases field if leaving farmer, syncs livelihood titleFr/roleTag to legacy_<profession> |
| Career demand / assignProfession | Scores -> review -> only applyProfessionChange |
| Practice drift (livelihood.ts softProfession) | Strong mix -> same applyProfessionChange |
| Field claim (fields.ts) | Farmer profession (+ early none/forager recovery); harvest path unchanged |
| UI (livelihoodLabelForUi) | Profession label, unless cultural overlay |

### Cultural overlay exception — pretre / gourou

Livelihood soft-retitle for sacred roles may keep titleFr/roleTag without clearing metier. jobBonus and field rules stay on v.profession. Helper: isCulturalTitleOverlay.

### Ambition vs mind.goal

syncAmbitionAndGoal bidirectional; practice ambition drift runs before sync on deep ticks.

### Coordinate with harvest

Do not weaken canClaimNewField / canSowPersonalField / shouldReleaseField farmer gates when changing careers — field ownership stays profession-gated so the wheat-mill chain keeps working.
