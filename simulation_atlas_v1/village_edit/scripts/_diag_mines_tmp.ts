import { createSimulation, stepSimulation } from '../src/lib/sim/engine'
import { TICKS_PER_DAY } from '../src/lib/sim/calendar'
import { canMineRock } from '../src/lib/sim/mining'

const state = createSimulation(7)
let digAttempts=0, digOpens=0, mineClaims=0, stoneTools=0, miners=0, woodOnClaim=0
const days=35
for (let t=1;t<=days*TICKS_PER_DAY;t++){
  stepSimulation(state)
  if (t%TICKS_PER_DAY===0){
    const d=t/TICKS_PER_DAY
    miners = state.villagers.filter(v=>v.alive&&v.profession==='miner').length
    stoneTools = state.villagers.filter(v=>v.alive&&(v.toolTier==='stone'||v.toolTier==='iron')).length
    const claimed = state.villages.filter(vg=>vg.mineX>=0).length
    const mines = state.villages.filter(vg=>vg.hasMine).length
    const tunnels = state.grid.terrain.reduce((a,t)=>a+(t===10?1:0),0) // guess TUNNEL id
    console.log('d'+d+' pop='+state.villagers.filter(v=>v.alive).length+' miners='+miners+' stone+='+stoneTools+' claimed='+claimed+' hasMine='+mines+' tunnels~='+tunnels)
  }
}
console.log('TUNNEL const check', require('fs').existsSync('x'))
