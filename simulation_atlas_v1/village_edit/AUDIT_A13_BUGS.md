# AUDIT_A13_BUGS — Bug hunter (Agent 13)

**Workspace:** `village_edit`  
**Date:** 2026-09-16  
**Scope:** NaN · negative impossible · stuck tasks · ghost refs · AFK · camp TP · rest-label lies  
**Method:** multi-seed probes + diagnose; fix only critical causal runtime bugs

## Probes run

| Probe | Seeds / days | Result |
|---|---|---|
| `scripts/_probe_bug_hunter.ts` | 1,7,42 / 20d | NaN=0, campTP=0, restLies=0, stuck mild (max≤9) |
| `scripts/_probe_bug_hunter2.ts` | 1,7,42 / 35d; 7 / 65d | **GHOST spouse** before fix; clean vitals once thresholds corrected |
| `scripts/_probe_ghost_desert.ts` | 7,1 / 65d; 42 / 60d | **before:** spouseGhost≈3041 (s7); **after:** 0 / 0 / 0 |
| `scripts/_probe_bandits.ts` | 7 / 60–72d | **PASS** campTP=0, campInside=0, bands form @ startDay |
| `scripts/probe-afk.ts` | 1,7,42 / 8–10d | day rest ~5–26%, day work ~65–89%, night rest ~93–96% |
| `scripts/diagnose-survival.ts` | 7 / 70d | alive mid-run OK then bandit/deserter pressure; harvest USED |

## Findings

### [A13-1] CRITICAL — Ghost spouse refs after outlaw desertion — FIXED
- **Cause:** `detachOutcast` set `v.alive = false` without `onDeath` / `inheritOnDeath`. Surviving partners kept `spouseId` → dead deserter (and later compacted-away id).
- **Proof:** seed7 d65 — `spouseGhost=3041` samples (e.g. `Ivos(6)→8`, `Elana(7)→20` from day 40). Hunter d65: `ghost=1521` all spouse.
- **Fix:**
  1. `bandits.ts` `detachOutcast` → clear task, `alive=false`, call `onDeath(state, v, null)` (widow + home/gear heir), then drop village membership. Still **no** `deaths++` (desertion ≠ death).
  2. `engine.ts` compact sweep (every 200 ticks): clear residual ghost `spouseId` / `homeOwnerId` / `grudgeTarget` / horse / boat / social task targets.
- **Verify after:** seeds 1,7,42 → `spouseGhost=0`, `homeGhost=0`, `campTp=0`.

### [A13-2] Rest-label / gameplay mismatch hole — FIXED (preventive)
- **Cause:** `restTaskLabel` returned « Se repose chez lui » whenever `atHome`, even if rest target was outdoor collapse (`!homeBound`). Gameplay bonuses require `atHomeForRest && restTargetIsHomeBound`.
- **Proof:** causal code read (`labels.ts` vs `behaviors.ts` rest case); multi-seed hunter never observed live lies (anti-AFK already retargets), but the label hole was real.
- **Fix:** `labels.ts` — « chez lui » only if `atHome && homeBound`; else commute / dehors.

### [A13-3] Negative / absurd vitals after combat — HARDENED
- **Cause:** fight/exposure could leave `health < 0` for a tick before death handling; no upper clamp on the tick path.
- **Fix:** `behaviors.ts` after finite guards — clamp hunger/stamina/health to `[0, MAX]`.
- **Note:** first hunter false-flagged `health=6` / world coords >512 (WORLD_SIZE≈1000). Refined checks: NaN=0, no true negative inventory.

### [A13-4] Camp TP — already fixed (re-confirmed PASS)
- Prior hotfix (`BANDIT_FIX_NOTE.md`): `endRaidToCamp` no longer recenters camp on raiders.
- Re-probe seed7 d60/d72: `camp TP jumps (>8)=0`, `camp-inside-village ticks=0`, PASS.

### [A13-5] AFK daytime rest — no critical regression
- Soft AFK streak + daytime re-softmax without idle/rest already in `chooseTask`.
- Outdoor/day rest caps in `executeTask` rest case; daytime wake when stamina ≥ tired.
- AFK probe: day work ≈67% (s1/s7 d10); outdoor day-rest share ~3–7% of day samples — not stuck plaza AFK.

### [A13-6] Stuck tasks — no critical lock
- `STUCK_LIMIT=10`; hunter maxStuck 7–9; long≥14 = 0 across seeds.
- Occasional brief stuck on experiment/sowField only.

### [A13-7] NaN — none observed
- Multi-seed hunter NaN=0 on vitals, coords, inventory, bandit health.

## Fixed list (this agent)

1. **Ghost spouse/home after desertion** — `detachOutcast` → `onDeath` cleanup (+ engine ghost sweep).
2. **Rest label « chez lui » without home-bound target** — `restTaskLabel` aligned with sheltered rest.
3. **Vitals clamp** — no live negative/overflow hunger/stamina/health after damage.

## Still not bugs in this hunt (observed, not fixed here)

- Mid-run pop collapse under brigand/deserter pressure (~d40–70) — systems working as designed for outlaw conversion; deathsByBandit often 0 because desertion removes villagers without `deaths++`. Worth a balance pass elsewhere, not a ghost/TP/NaN defect.
- Flour/bread/craftGear still rare/unused in 70d diagnose — economy priority, not A13 runtime class.

## Commands to re-check

```bash
npx tsx scripts/_probe_ghost_desert.ts 7 65
npx tsx scripts/_probe_bandits.ts 7 60
npx tsx scripts/probe-afk.ts 7 10
npx tsx scripts/diagnose-survival.ts 7 40 10
```

Expect: spouseGhost=0, campTP PASS, day work dominant, NaN-free.
