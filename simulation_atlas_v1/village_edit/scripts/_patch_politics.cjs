const fs = require("fs");
const p = "C:/Users/kamel/village-sim-1/_wt_rhythm/village_edit/src/lib/sim/politics.ts";
let s = fs.readFileSync(p, "utf8");
const start = s.indexOf("      const bonded = candidates.filter((a) =>");
if (start < 0) { console.log("start missing"); process.exit(1); }
// Find the profession-cluster bonded block specifically (first occurrence in trySpawnCircles)
const end = s.indexOf("      if (pool.length >= 2) {", start);
if (end < 0) { console.log("end missing"); process.exit(1); }
const after = end + "      if (pool.length >= 2) {".length;
const neu = `      // Phase B: craft/trade groups need observable social reason (not same-job alone).
      const bonded = candidates.filter((a) =>
        candidates.some((b) => {
          if (a.id === b.id) return false
          const r = a.relations.get(b.id)
          if (!r) return false
          const cooperated = r.history.some(
            (h) => h.kind === 'helped' || h.kind === 'gift' || h.kind === 'met' || h.kind === 'gossip',
          )
          return (
            r.trust > 0.22 ||
            r.affinity > 0.18 ||
            r.kinship > 0.35 ||
            cooperated ||
            (distance(a.x, a.y, b.x, b.y) < 14 && (r.affinity > 0.08 || r.trust > 0.12))
          )
        }),
      )
      // Threat circles may crystallize from proximity under danger; craft needs bonds.
      const pool =
        kind === 'threat'
          ? bonded.length >= 2
            ? bonded
            : candidates.length >= 2
              ? candidates
              : []
          : bonded.length >= 2
            ? bonded
            : []
      if (pool.length >= 2) {`;
s = s.slice(0, start) + neu + s.slice(after);
fs.writeFileSync(p, s, "utf8");
console.log("politics patched", start);