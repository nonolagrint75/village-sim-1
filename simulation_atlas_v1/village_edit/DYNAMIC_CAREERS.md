# Dynamic careers

Occupations emerge from **village demand + individual ability/willingness**. There is **no unlock tree** and no permanent job-for-life.

## Model

1. **Demand** (`careers.ts` → `computeCareerDemand`) — food gap/famine, forge/ore vs development, trade/port/market/SoL, security/threats, culture when SoL is high and not starving.
2. **Scores** (`behaviors.assignProfession`) — local resources, personality, job saturation, `farmerProfessionPressure`, skill/pref, livelihood practice mix, then `applyCareerDemandToScores`.
3. **Review** — every ~2 days (`PROFESSION_REVIEW = TICKS_PER_DAY * 2`). Soft stickiness via `professionLockInBonus` (capped, curiosity/unemployment lower the bar).
4. **Apply** (`applyProfessionChange`) — French log (`X devient forgeron`), sets `lastCareerChangeTick`, syncs livelihood soft title/`roleTag` (unless cultural overlay), and if leaving farmer calls `shouldReleaseField` / `releaseFieldClaim` (`fields.ts`: only farmers keep personal plots).
5. **Practice drift** (`livelihood.ts`) — strong activity mix with `softProfession` calls the same `applyProfessionChange` path. Cultural overlays (`pretre` / `gourou`) may retitle without fighting métier — see INTERCONNECT_FIXES.md.

## Evolution (emergent, not gated)

survival food bias → surplus → specialization (smith/miner/trader/guard) → diversification → cultural/luxury when SoL/peace allow.

Early food pressure without locking forever foragers. Crisis (famine) kills culture demand and eases exit from luxury crafts.

## Files

- `src/lib/sim/careers.ts`
- `src/lib/sim/behaviors.ts` (`assignProfession` + review)
- `src/lib/sim/politics.ts` (`professionLockInBonus`)
- `src/lib/sim/livelihood.ts` / `fields.ts`
- `CAREER_DEMAND_NOTES.md` (hook detail)