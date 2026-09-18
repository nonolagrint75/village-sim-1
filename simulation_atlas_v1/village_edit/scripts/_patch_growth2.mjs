import fs from 'fs'

function patchFile(path, fn) {
  const before = fs.readFileSync(path, 'utf8')
  const after = fn(before)
  if (after === before) throw new Error('no change: ' + path)
  fs.writeFileSync(path, after)
  console.log('ok', path)
}

// livelihood.ts — faster EMA, lower minDominant for craft roles, recognition on title, sync soft profession helper
patchFile('src/lib/sim/livelihood.ts', (t) => {
  t = t.replace('const EMA = 0.08', 'const EMA = 0.12')
  t = t.replace('const TITLE_REVIEW = 180', 'const TITLE_REVIEW = 90')
  // Lower craft/trade/farm minDominant slightly so specialization crystallizes sooner
  t = t.replace(
    "id: 'forgeron_emerge',\r\n    titleFr: 'forgeron',\r\n    weights: { craft: 0.45, mine: 0.25, build: 0.1 },\r\n    minDominant: 0.28,",
    "id: 'forgeron_emerge',\r\n    titleFr: 'forgeron',\r\n    weights: { craft: 0.45, mine: 0.25, build: 0.1 },\r\n    minDominant: 0.22,",
  )
  t = t.replace(
    "id: 'tisserand_emerge',\r\n    titleFr: 'tisserand',\r\n    weights: { craft: 0.5, farm: 0.15, trade: 0.1 },\r\n    minDominant: 0.28,",
    "id: 'tisserand_emerge',\r\n    titleFr: 'tisserand',\r\n    weights: { craft: 0.5, farm: 0.15, trade: 0.1 },\r\n    minDominant: 0.22,",
  )
  t = t.replace(
    "id: 'fermier_emerge',\r\n    titleFr: 'fermier',\r\n    weights: { farm: 0.5, gather: 0.15, care: 0.05 },\r\n    minDominant: 0.3,",
    "id: 'fermier_emerge',\r\n    titleFr: 'fermier',\r\n    weights: { farm: 0.5, gather: 0.15, care: 0.05 },\r\n    minDominant: 0.24,",
  )
  t = t.replace(
    "id: 'marchand_emerge',\r\n    titleFr: 'marchand',\r\n    weights: { trade: 0.5, social: 0.2, smuggle: 0.05 },\r\n    minDominant: 0.28,",
    "id: 'marchand_emerge',\r\n    titleFr: 'marchand',\r\n    weights: { trade: 0.5, social: 0.2, smuggle: 0.05 },\r\n    minDominant: 0.22,",
  )
  t = t.replace(
    "id: 'batisseur_emerge',\r\n    titleFr: 'bâtisseur',\r\n    weights: { build: 0.5, craft: 0.15, mine: 0.1 },\r\n    minDominant: 0.28,",
    "id: 'batisseur_emerge',\r\n    titleFr: 'bâtisseur',\r\n    weights: { build: 0.5, craft: 0.15, mine: 0.1 },\r\n    minDominant: 0.22,",
  )
  t = t.replace(
    "id: 'pecheur_emerge',\r\n    titleFr: 'pêcheur',\r\n    weights: { fish: 0.55, trade: 0.1, gather: 0.1 },\r\n    minDominant: 0.3,",
    "id: 'pecheur_emerge',\r\n    titleFr: 'pêcheur',\r\n    weights: { fish: 0.55, trade: 0.1, gather: 0.1 },\r\n    minDominant: 0.24,",
  )
  t = t.replace(
    "id: 'mineur_emerge',\r\n    titleFr: 'mineur',\r\n    weights: { mine: 0.55, craft: 0.1, build: 0.1 },\r\n    minDominant: 0.3,",
    "id: 'mineur_emerge',\r\n    titleFr: 'mineur',\r\n    weights: { mine: 0.55, craft: 0.1, build: 0.1 },\r\n    minDominant: 0.24,",
  )

  // On title change: bump recognition + soft-sync profession from recipe
  const oldTitle = `    if (prev !== next.titleFr && prev !== 'sans métier clair') {
      logEvent(state, \`\${v.name} est désormais connu comme \${next.titleFr}\`)
    } else if (prev !== next.titleFr && next.titleFr !== 'sans métier clair') {
      logEvent(state, \`\${v.name} se forge une réputation de \${next.titleFr}\`)
    }
  }
}`
  const newTitle = `    if (prev !== next.titleFr && next.titleFr !== 'sans métier clair') {
      live.recognition = clamp01(live.recognition + 0.08)
      const recipe = OPEN_ROLE_RECIPES.find((r) => r.id === next.roleTag)
      if (recipe?.softProfession && (v.profession === 'none' || v.profession === 'forager')) {
        v.profession = recipe.softProfession
      }
      if (prev !== 'sans métier clair') {
        logEvent(state, \`\${v.name} est désormais connu comme \${next.titleFr}\`)
      } else {
        logEvent(state, \`\${v.name} se forge une réputation de \${next.titleFr}\`)
      }
    }
  }
}`
  const oldCr = oldTitle.replace(/\n/g, '\r\n')
  const newCr = newTitle.replace(/\n/g, '\r\n')
  if (t.includes(oldCr)) t = t.replace(oldCr, newCr)
  else if (t.includes(oldTitle)) t = t.replace(oldTitle, newTitle)
  else console.log('WARN title block')

  // Soft dampen gather dominance when craft/farm/build practiced (anti-bucheron lock)
  if (!t.includes('// Anti-monoculture')) {
    const practiceEnd = `  if (sum > 1.35) {
    for (const k of ACTIVITY_KEYS) live.mix[k] /= sum
  }
}`
    const practiceEndNew = `  if (sum > 1.35) {
    for (const k of ACTIVITY_KEYS) live.mix[k] /= sum
  }
  // Anti-monoculture: once a specialty appears, gather shouldn't forever dominate titles.
  const specialty = Math.max(live.mix.craft, live.mix.farm, live.mix.build, live.mix.fish, live.mix.mine, live.mix.trade)
  if (specialty > 0.18 && live.mix.gather > specialty + 0.08) {
    live.mix.gather = clamp01(live.mix.gather * 0.92)
  }
}`
    if (t.includes(practiceEnd.replace(/\n/g,'\r\n'))) t = t.replace(practiceEnd.replace(/\n/g,'\r\n'), practiceEndNew.replace(/\n/g,'\r\n'))
    else if (t.includes(practiceEnd)) t = t.replace(practiceEnd, practiceEndNew)
    else console.log('WARN practice dampen')
  }
  return t
})

// needs.ts — status from recognition + prestige + relative poverty
patchFile('src/lib/sim/cognition/needs.ts', (t) => {
  // ensure gearPrestige / livelihood imports if needed — use mind livelihood recognition inline
  if (!t.includes("from '../livelihood'") && !t.includes("from '../equipment'")) {
    // add soft imports near top
    if (t.includes("from '../inventory'")) {
      t = t.replace(
        "from '../inventory'",
        "from '../inventory'\nimport { ensureLivelihood } from '../livelihood'\nimport { gearPrestige01 } from '../equipment'",
      )
    }
  } else {
    if (!t.includes('ensureLivelihood')) {
      t = t.replace(
        "from '../inventory'",
        "from '../inventory'\nimport { ensureLivelihood } from '../livelihood'",
      )
    }
    if (!t.includes('gearPrestige01')) {
      t = t.replace(
        "from '../livelihood'",
        "from '../livelihood'\nimport { gearPrestige01 } from '../equipment'",
      )
    }
  }

  const oldStatus = `  const coins = countOf(v.inventory, 'coin')
  needs.status = clamp01(
    (v.ambition === 'leader' || v.ambition === 'builder' ? 0.35 : 0.1) +
      (coins < 2 ? 0.2 : -0.05) +
      pol.grievance * 0.25,
  )`
  const newStatus = `  const coins = countOf(v.inventory, 'coin')
  const live = ensureLivelihood(mindOf(v))
  const prestige = gearPrestige01(v)
  // Aspiration: low recognition / thin purse / ambitious roles raise status hunger.
  needs.status = clamp01(
    (v.ambition === 'leader' || v.ambition === 'builder' || v.ambition === 'wealth' ? 0.32 : 0.1) +
      (coins < 2 ? 0.22 : coins < 6 ? 0.08 : -0.06) +
      (1 - live.recognition) * 0.22 +
      (1 - Math.min(1, prestige)) * 0.12 +
      pol.grievance * 0.2 -
      live.recognition * 0.15,
  )`
  if (t.includes(oldStatus.replace(/\n/g,'\r\n'))) t = t.replace(oldStatus.replace(/\n/g,'\r\n'), newStatus.replace(/\n/g,'\r\n'))
  else if (t.includes(oldStatus)) t = t.replace(oldStatus, newStatus)
  else console.log('WARN status')

  // ensure mindOf import
  if (!t.includes('mindOf')) {
    if (t.includes("from './mindPool'")) {
      // ok
    } else if (t.includes("from '../politics'")) {
      t = t.replace("from '../politics'", "from '../politics'\nimport { mindOf } from './mindPool'")
    }
  }
  return t
})

// memory.ts — faster skill learning
patchFile('src/lib/sim/cognition/memory.ts', (t) => {
  return t.replace(
    '  const delta = success ? 0.014 : 0.004',
    '  const delta = success ? 0.02 : 0.006',
  )
})

// buildHooks — lower prestige gates, homestead when beds tight, easier RNG
patchFile('src/lib/sim/cognition/buildHooks.ts', (t) => {
  const oldPrestige = `  if (
    v.hasHome &&
    (coins >= 4 || mind.needs.status > 0.45) &&
    (v.personality.ambition > 0.55 || v.ambition === 'leader' || v.ambition === 'builder') &&
    mind.values.status > 0.4
  ) {
    return intentFromReasons(['richesse et ambition', 'grande demeure'], {
      purposes: ['prestige', 'shelter'],
      scale: coins >= 8 ? 0.75 : 0.5,
      wood: 0.65,
      stone: 0.4,
    })
  }

  return null
}`
  const newPrestige = `  if (
    v.hasHome &&
    (coins >= 3 || mind.needs.status > 0.35 || (mind.livelihood?.recognition ?? 0) > 0.2) &&
    (v.personality.ambition > 0.4 || v.ambition === 'leader' || v.ambition === 'builder' || v.ambition === 'wealth')
  ) {
    return intentFromReasons(['richesse et ambition', 'grande demeure'], {
      purposes: ['prestige', 'shelter'],
      scale: coins >= 8 ? 0.75 : 0.5,
      wood: 0.65,
      stone: 0.4,
    })
  }

  // Family pressure → annex / store even without prestige ambition.
  if (v.hasHome && v.house) {
    let hh = 1
    for (const o of state.villagers) {
      if (!o.alive || o.id === v.id) continue
      if (o.homeOwnerId === v.id || o.parentIds.includes(v.id)) hh++
    }
    const beds = v.house.bedSlots ?? 1
    if (hh > beds || (v.spouseId !== null && beds < 2)) {
      return intentFromReasons(['foyer trop étroit', 'agrandir la maison'], {
        purposes: ['shelter', 'homestead'],
        scale: 0.35 + Math.min(0.35, (hh - beds) * 0.12),
        wood: 0.7,
        stone: 0.25,
      })
    }
  }

  return null
}`
  if (t.includes(oldPrestige.replace(/\n/g,'\r\n'))) t = t.replace(oldPrestige.replace(/\n/g,'\r\n'), newPrestige.replace(/\n/g,'\r\n'))
  else if (t.includes(oldPrestige)) t = t.replace(oldPrestige, newPrestige)
  else console.log('WARN prestige')

  t = t.replace(
    '  if (rng() > 0.82 && !safetyPush && !statusPush && mind.needs.safety < 0.55 && mind.needs.status < 0.5) {',
    '  if (rng() > 0.7 && !safetyPush && !statusPush && mind.needs.safety < 0.55 && mind.needs.status < 0.45) {',
  )
  return t
})

console.log('all secondary patches done')
