const fs=require('fs')
const p='C:/Users/kamel/village-sim-1/simulation_atlas_v1/village_edit/ATLAS_V1_SCENARIO_MATRIX.md'
let t=fs.readFileSync(p,'utf8')
const note='\n\n> **Note officielle :** le dual-seed 35j (1+7) a donne **42 PASS / 4 PARTIAL / 4 FAIL**. Un re-probe court 25j seed7 a ecrase le fichier avec 39/5/6 ? les scores bulletin utilisent la reference 42/4/4.\n'
if(!t.includes('Note officielle')) t=t+note
fs.writeFileSync(p,t.replace(/Atlas v1 .{0,3} Scenario/,'Atlas v1 ? Scenario'),'utf8')
console.log('matrix note ok')
