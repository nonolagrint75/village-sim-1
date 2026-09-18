const fs = require("fs");
const p = "C:/Users/kamel/village-sim-1/_wt_rhythm/village_edit/src/lib/sim/behaviors.ts";
let s = fs.readFileSync(p, "utf8");

// 1) Add imports
if (!s.includes("evaluateCareerChange")) {
  const famImp = "import { fullNameOf, recordHelp, registerBirth, sameFamily } from './family'";
  if (!s.includes(famImp)) { console.log("family import missing"); process.exit(1); }
  s = s.replace(
    famImp,
    "import { fullNameOf, getHouseholdNeeds, recordHelp, registerBirth, sameFamily } from './family'\n" +
      "import { evaluateCareerChange, getJobOpportunities } from './emergence/mobility'"
  );
}

// 2) Replace profession review block to use household + mobility evaluator for threshold
const start = s.indexOf("  } else if (v.hasHome && (state.tick + v.id * 17) % PROFESSION_REVIEW === 0) {");
if (start < 0) { console.log("review block missing"); process.exit(1); }
const end = s.indexOf("  // Métiers émergents — LOD stagger inside tickLivelihood.", start);
if (end < 0) { console.log("end of review missing"); process.exit(1); }

const neu = `  } else if (v.hasHome && (state.tick + v.id * 17) % PROFESSION_REVIEW === 0) {
    const choice = computeProfessionChoice(state, v)
    const next = choice.profession
    if (next !== v.profession && !(farmerLockedToField(state, v) && next !== 'farmer')) {
      const lock = professionLockInBonus(state, v, v.profession, next)
      // Soft stickiness — curiosity + chômage + practice title lower the bar (no forever lock).
      const liveMix = (() => {
        try {
          return mindOf(v).livelihood?.unemployedStreak ?? 0
        } catch {
          return 0
        }
      })()
      const liveTitle = (() => {
        try {
          return mindOf(v).livelihood?.roleTag ?? null
        } catch {
          return null
        }
      })()
      const specialized = !!(liveTitle && !String(liveTitle).startsWith('legacy_'))
      // Phase B: household pressure + job opportunity inertia (same stack, no second engine).
      const hh = getHouseholdNeeds(state, v)
      const opp =
        getJobOpportunities(state, v, 6).find((o) => o.jobType === next) ?? null
      const mobility = evaluateCareerChange(state, v, opp)
      let householdPull = mobility.householdPull
      if (hh.food > 0.45 && (next === 'farmer' || next === 'forager' || next === 'fisher' || next === 'miller')) {
        householdPull = Math.max(householdPull, 0.1 + hh.food * 0.1)
      }
      if (hh.size >= 3 && opp && opp.distance > 22) {
        householdPull -= 0.06
      }
      const threshold =
        0.28 +
        v.personality.curiosity * 0.22 -
        Math.min(0.28, liveMix * 0.0025) -
        (specialized ? 0.14 : 0) +
        v.personality.ambition * 0.06 -
        householdPull +
        (opp && opp.availability < 0.35 ? 0.1 : 0)
      // Leaving farmer releases the plot via applyProfessionChange → fields.ts.
      if (lock < threshold) {
        applyProfessionChange(state, v, next, {
          factors: choice.factors,
          foodNeed: choice.demand.foodNeed,
          source: 'review',
        })
      } else if (
        liveMix > 100 &&
        next !== 'none' &&
        (choice.scores[next] ?? 0) > (choice.scores[v.profession] ?? 0) + 6
      ) {
        // Long chômage: soft abandon so assignProfession can re-lock next review.
        applyProfessionChange(state, v, 'none', { factors: [], source: 'softAbandon' })
      }
    }
  }
`;

// Keep original softAbandon logic - need to check what was after lock threshold
s = s.slice(0, start) + neu + s.slice(end);
fs.writeFileSync(p, s, "utf8");
console.log("behaviors profession review patched");