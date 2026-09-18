const fs = require("fs");
const p = "C:/Users/kamel/village-sim-1/_wt_rhythm/village_edit/scripts/_probe_phase_b.ts";
let s = fs.readFileSync(p, "utf8");
s = s.replace(
  "import { createSimulation } from '../src/lib/sim/engine'",
  "import { createSimulation, stepSimulation } from '../src/lib/sim/engine'\nimport type { SimState } from '../src/lib/sim/types'",
);
s = s.replace(/ReturnType<typeof createSimulation>\['state'\]/g, "SimState");
s = s.replace(
  `function runSeed(seed: number, horizon: number) {
  const sim = createSimulation({ ...baseConfig, seed })
  const t0 = Date.now()
  while (sim.state.tick < horizon) sim.step()
  const state = sim.state`,
  `function runSeed(seed: number, horizon: number) {
  const state = createSimulation(seed, baseConfig)
  const t0 = Date.now()
  while (state.tick < horizon) stepSimulation(state)`,
);
fs.writeFileSync(p, s, "utf8");
console.log("probe fixed");
console.log(s.includes("stepSimulation(state)"));