import fs from 'fs'

const p = 'src/lib/sim/cognition/needs.ts'
let t = fs.readFileSync(p, 'utf8')
if (!t.includes("from './mindPool'")) {
  t = t.replace(
    "import type { NeedPressures, ValueWeights } from './types'",
    "import { mindOf } from './mindPool'\nimport type { NeedPressures, ValueWeights } from './types'",
  )
  fs.writeFileSync(p, t)
  console.log('added mindOf import')
} else {
  console.log('mindOf import already present')
}

// Boost assignProfession with livelihood mix scores
const b = 'src/lib/sim/behaviors.ts'
let bt = fs.readFileSync(b, 'utf8')
const needle = `  // DF-like: skill + labor preference drift the profession over time (keeps resource scores).
  const mind = mindOf(v)
  for (const key of Object.keys(scores) as Profession[]) {
    if (key === 'none') continue
    scores[key] += professionSkillPrefScore(mind.skills, mind.preferences, key)
  }`
const insert = `  // DF-like: skill + labor preference drift the profession over time (keeps resource scores).
  const mind = mindOf(v)
  for (const key of Object.keys(scores) as Profession[]) {
    if (key === 'none') continue
    scores[key] += professionSkillPrefScore(mind.skills, mind.preferences, key)
  }
  // Practice mix (livelihood) strongly pulls specialization once a craft crystallizes.
  const mix = mind.livelihood?.mix
  if (mix) {
    scores.lumberjack += mix.gather * 28 + mix.build * 8
    scores.farmer += mix.farm * 42
    scores.fisher += mix.fish * 42
    scores.builder += mix.build * 40 + mix.craft * 8
    scores.mason += mix.mine * 18 + mix.build * 22
    scores.miner += mix.mine * 45
    scores.blacksmith += mix.craft * 36 + mix.mine * 12
    scores.weaver += mix.craft * 28 + mix.farm * 10
    scores.trader += mix.trade * 48 + mix.social * 10
    scores.guard += mix.fight * 42
    scores.herder += mix.farm * 16 + mix.care * 18
    scores.miller += mix.farm * 14 + mix.craft * 10
    scores.forager += mix.gather * 12
  }`
if (bt.includes(insert.split('\n')[6])) {
  console.log('livelihood mix already in assignProfession')
} else if (bt.includes(needle.replace(/\n/g, '\r\n'))) {
  bt = bt.replace(needle.replace(/\n/g, '\r\n'), insert.replace(/\n/g, '\r\n'))
  fs.writeFileSync(b, bt)
  console.log('added mix scores CRLF')
} else if (bt.includes(needle)) {
  bt = bt.replace(needle, insert)
  fs.writeFileSync(b, bt)
  console.log('added mix scores LF')
} else {
  console.log('WARN assignProfession needle missing')
}

// Update probe to use state.projects
const probe = 'scripts/_probe_progression.ts'
let pt = fs.readFileSync(probe, 'utf8')
pt = pt.replace(
  "const buildProjects = (state as { buildProjects?: { phase: string }[] }).buildProjects ?? []",
  "const buildProjects = state.projects ?? []",
)
fs.writeFileSync(probe, pt)
console.log('probe updated')
