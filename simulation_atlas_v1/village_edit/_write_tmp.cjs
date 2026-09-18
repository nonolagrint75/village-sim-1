const fs = require('fs');
const path = require('path');
const root = 'C:/Users/kamel/village-sim-1/simulation_atlas_v1/village_edit';
const readme = [
  '# Staging packs — Simulation Atlas v1 integrator',
  '',
  'Drop completed system packs here. Each pack needs README.md + TS exports + optional READY file.',
  '',
  'Expected: credit_bank, bandit_parallel, migrant_quarters, wool_industry, dynasty_mismanage,',
  'explore_routes, labor_revolt, art_culture, military_defection, kin_multigen',
  '',
  'Integrator wires into src/lib/sim + engine ticks. Causal only. Update life-type matrix after wire.',
  ''
].join('\n');
fs.writeFileSync(path.join(root, '_staging/README.md'), readme);
console.log('ok', fs.statSync(path.join(root, '_staging/README.md')).size);
