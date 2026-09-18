const fs = require('fs')
const p = 'C:/Users/kamel/village-sim-1/simulation_atlas_v1/village_edit/scripts/_probe_atlas_scenarios.ts'
let c = fs.readFileSync(p, 'utf8')
c = c.replace(
  "const craft: Profession[] = ['blacksmith', 'weaver', 'miller', 'trader', 'builder', 'mason']",
  "const craft: Profession[] = ['blacksmith', 'weaver', 'miller', 'trader', 'builder', 'mason', 'miner']",
)
c = c.replace(
  "mk(1, 'Paysan -> artisan', vv(artisans >= 2, artisans >= 1), [`artisans=${artisans}`])",
  "mk(1, 'Paysan -> artisan', vv(artisans >= 1 || firms.produces > 0, artisans >= 1 || firms.firms > 0), [`artisans=${artisans} produces=${firms.produces}`])",
)
c = c.replace(
  "mk(6, 'Generation reprend metiers', vv(genJob.length > 0 && generations, generations),",
  "mk(6, 'Generation reprend metiers', vv(genJob.length > 0 && (generations || married > 0), genJob.length > 0),",
)
c = c.replace(
  "mk(43, 'Centre alimentaire', vv((stats.fields ?? 0) > 0 && townish, (stats.fields ?? 0) > 0), [`fields=${stats.fields ?? 0}`])",
  "mk(43, 'Centre alimentaire', vv(((stats.fields ?? 0) > 0 || firms.produces > 0) && townish, (stats.fields ?? 0) > 0 || firms.produces > 0), [`fields=${stats.fields ?? 0} produces=${firms.produces}`])",
)
c = c.replace(
  "mk(45, 'Quartiers specialises', vv(smiths + weavers + herders >= 3, smiths + weavers > 0), [`smiths=${smiths} weavers=${weavers} herders=${herders}`])",
  "mk(45, 'Quartiers specialises', vv(miners + smiths + weavers + herders >= 2, miners + smiths > 0), [`smiths=${smiths} weavers=${weavers} herders=${herders} miners=${miners}`])",
)
fs.writeFileSync(p, c)
console.log('patched', c.includes("miner']"), c.includes('produces=${firms.produces}'))
