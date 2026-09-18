const fs = require("fs");
const p = "C:/Users/kamel/village-sim-1/_wt_rhythm/village_edit/scripts/_probe_phase_b.ts";
const content = `/**
 * Phase B smoke — careers/mobility/groups over live Circles + professionFactors.
 *   npx tsx scripts/_probe_phase_b.ts
 *   npx tsx scripts/_probe_phase_b.ts --repro --seed=7 --ticks=800
 *   npx tsx scripts/_probe_phase_b.ts --seeds=7,42,100,999 --ticks=1500
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createSimulation } from '../src/lib/sim/engine'
import { ensureAttributionCounters } from '../src/lib/sim/attributionMetrics'
import { ensureSocietyCounters } from '../src/lib/sim/societyMetrics'
import {
  careerMetricsSnapshot,
  evaluateCareerChange,
  getCurrentOccupation,
  getGroups,
  getJobOpportunities,
  groupMetricsSnapshot,
} from '../src/lib/sim/emergence'

const ROOT = path.dirname(fileURLToPath(import.meta.url)) + '/..'
const OUT = path.join(ROOT, '_phase_b_smoke.json')

function arg(name: string, fallback: string): string {
  const hit = process.argv.find((a) => a.startsWith(\`--\${name}=\`))
  return hit ? hit.slice(name.length + 3) : fallback
}
function has(flag: string): boolean {
  return process.argv.includes(\`--\${flag}\`)
}

const ticks = Number(arg('ticks', '1200'))
const seeds = arg('seeds', '7,42,100,999')
  .split(',')
  .map((s) => Number(s.trim()))
  .filter((n) => Number.isFinite(n))
const repro = has('repro')
const reproSeed = Number(arg('seed', '7'))

const baseConfig = {
  initialVillagers: 36,
  maxPopulation: 80,
  worldSize: 600,
  preset: 'standard' as const,
  wolfCount: 3,
}

function fingerprint(state: ReturnType<typeof createSimulation>['state']): string {
  const alive = state.villagers.filter((v) => v.alive)
  const prof: Record<string, number> = {}
  for (const v of alive) {
    const p = v.profession || 'none'
    prof[p] = (prof[p] ?? 0) + 1
  }
  const attr = ensureAttributionCounters(state)
  const soc = ensureSocietyCounters(state)
  const keys = Object.keys(prof).sort()
  return [
    \`t\${state.tick}\`,
    \`a\${alive.length}\`,
    \`c\${state.circles.length}\`,
    \`pc\${attr.professionChanges}\`,
    \`cf\${soc.circlesFormed}\`,
    keys.map((k) => \`\${k}:\${prof[k]}\`).join(','),
  ].join('|')
}

function sampleApis(state: ReturnType<typeof createSimulation>['state']) {
  const npc = state.villagers.find((v) => v.alive && v.hasHome) ?? state.villagers.find((v) => v.alive)
  if (!npc) return null
  const opps = getJobOpportunities(state, npc, 8)
  const evalc = evaluateCareerChange(state, npc, opps[0] ?? null)
  return {
    npcId: npc.id,
    occupation: getCurrentOccupation(npc),
    opportunities: opps.length,
    topJob: opps[0]?.jobType ?? null,
    topDelta: opps[0]?.deltaVsCurrent ?? null,
    shouldChange: evalc.shouldChange,
    groups: getGroups(state, npc).length,
  }
}

function runSeed(seed: number, horizon: number) {
  const sim = createSimulation({ ...baseConfig, seed })
  const t0 = Date.now()
  while (sim.state.tick < horizon) sim.step()
  const state = sim.state
  const alive = state.villagers.filter((v) => v.alive)
  const prof: Record<string, number> = {}
  for (const v of alive) {
    const p = v.profession || 'none'
    prof[p] = (prof[p] ?? 0) + 1
  }
  const career = careerMetricsSnapshot(state)
  const groups = groupMetricsSnapshot(state)
  return {
    seed,
    tick: state.tick,
    elapsedMs: Date.now() - t0,
    alive: alive.length,
    professions: prof,
    career_changes: career.career_changes,
    profession_multi_factor: career.profession_multi_factor,
    group_created: groups.group_created,
    group_join: groups.group_join,
    group_leave: groups.group_leave,
    average_group_size: Math.round(groups.average_group_size * 100) / 100,
    circle_count: groups.circle_count,
    guild_count: groups.guild_count,
    fingerprint: fingerprint(state),
    apiSample: sampleApis(state),
  }
}

if (repro) {
  const a = runSeed(reproSeed, ticks)
  const b = runSeed(reproSeed, ticks)
  const report = {
    mode: 'repro',
    seed: reproSeed,
    ticks,
    repro_match: a.fingerprint === b.fingerprint,
    a,
    b,
  }
  fs.writeFileSync(OUT, JSON.stringify(report, null, 2), 'utf8')
  console.log(JSON.stringify({ repro_match: report.repro_match, fingerprint: a.fingerprint }, null, 2))
  process.exit(report.repro_match ? 0 : 1)
}

const runs = seeds.map((seed) => runSeed(seed, ticks))
const report = { mode: 'multi', ticks, seeds, baseConfig, runs }
fs.writeFileSync(OUT, JSON.stringify(report, null, 2), 'utf8')
console.log(
  runs
    .map(
      (r) =>
        \`seed\${r.seed} alive=\${r.alive} career=\${r.career_changes} circles=\${r.circle_count} guilds=\${r.guild_count} top=\${r.apiSample?.topJob ?? '-'} fp=\${r.fingerprint}\`,
    )
    .join('\\n'),
)
console.log('Wrote', OUT)
`;
fs.writeFileSync(p, content, "utf8");
console.log("probe written", Buffer.from(content.slice(0,4)).toString("hex"));