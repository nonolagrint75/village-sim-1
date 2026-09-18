import fs from 'fs'

function patch(path, replacer) {
  let t = fs.readFileSync(path, 'utf8')
  const before = t
  t = replacer(t)
  if (t === before) throw new Error('No change in ' + path)
  fs.writeFileSync(path, t)
  console.log('patched', path)
}

patch('src/lib/sim/behaviors.ts', (t) => {
  if (!t.includes('const PROFESSION_REVIEW = TICKS_PER_SEASON * 2')) {
    console.log('PROFESSION_REVIEW already patched?')
  } else {
    t = t.replace(
      'const PROFESSION_REVIEW = TICKS_PER_SEASON * 2',
      '/** Revisit craft every ~5 days so practice can re-specialize (was 2 seasons — stalled). */\r\nconst PROFESSION_REVIEW = TICKS_PER_DAY * 5',
    )
  }

  if (t.includes('const REPRO_COOLDOWN = 420')) {
    t = t.replace(
      'const REPRO_HUNGER_THRESHOLD = 3\r\nconst REPRO_FOOD_STOCK = 2\r\nconst REPRO_COOLDOWN = 420',
      'const REPRO_HUNGER_THRESHOLD = 2.6\r\nconst REPRO_FOOD_STOCK = 1\r\nconst REPRO_COOLDOWN = 280',
    )
  }

  const oldRepro = `  // Pass 1: bonded couples preferred
  for (const a of state.villagers) {
    if (!ready(a) || a.spouseId === null) continue
    const spouse = bondedPartner(state, a)
    if (!spouse || spouse.id < a.id) continue
    if (tryCouple(a, spouse)) return
  }

  // Pass 2: rare opportunistic among unmarried
  if (rng() > 0.35) return
  for (const a of state.villagers) {
    if (!ready(a) || a.spouseId !== null) continue
    for (const b of state.villagers) {
      if (b.id <= a.id || !ready(b) || b.spouseId !== null) continue
      if (tryCouple(a, b)) return
    }
  }
}`

  const newRepro = `  // Pass 1: bonded couples — allow a few births/tick so families grow.
  let birthsThisPass = 0
  const birthBudget = 3
  for (const a of state.villagers) {
    if (birthsThisPass >= birthBudget) break
    if (!ready(a) || a.spouseId === null) continue
    const spouse = bondedPartner(state, a)
    if (!spouse || spouse.id < a.id) continue
    if (tryCouple(a, spouse)) birthsThisPass++
  }

  // Pass 2: rare opportunistic among unmarried
  if (birthsThisPass === 0 && rng() > 0.35) return
  if (birthsThisPass >= birthBudget) return
  for (const a of state.villagers) {
    if (birthsThisPass >= birthBudget) break
    if (!ready(a) || a.spouseId !== null) continue
    for (const b of state.villagers) {
      if (b.id <= a.id || !ready(b) || b.spouseId !== null) continue
      if (tryCouple(a, b)) {
        birthsThisPass++
        break
      }
    }
  }
}`

  const oldReproCr = oldRepro.replace(/\n/g, '\r\n')
  const newReproCr = newRepro.replace(/\n/g, '\r\n')
  if (t.includes(oldReproCr)) t = t.replace(oldReproCr, newReproCr)
  else if (t.includes(oldRepro)) t = t.replace(oldRepro, newRepro)
  else console.log('WARN: repro block not found')

  t = t.replace(
    '  if (rng() > 0.35 && wealth < 12 && hh <= (v.house.bedSlots ?? 1)) return false',
    '  if (rng() > 0.55 && wealth < 6 && hh <= (v.house.bedSlots ?? 1) && (v.house.roomKinds?.length ?? 0) >= 3) return false',
  )
  t = t.replace(
    '    if ((state.tick + v.id * 13) % 47 === 0) maybeExpandHome(state, v, rng)',
    '    if ((state.tick + v.id * 13) % 23 === 0) maybeExpandHome(state, v, rng)',
  )

  const oldThresh = `      const threshold = 0.38 + v.personality.curiosity * 0.22 - Math.min(0.2, liveMix * 0.002)
      if (lock < threshold) {
        const prev = v.profession
        v.profession = next
        if (prev !== 'none' && next !== prev) {
          logEvent(state, \`\${v.name} oriente son labeur vers un autre craft (\${prev} → \${next})\`)
        }
      }
    }`
  const newThresh = `      const liveTitle = (() => {
        try {
          return mindOf(v).livelihood?.roleTag ?? null
        } catch {
          return null
        }
      })()
      const specialized = !!(liveTitle && !String(liveTitle).startsWith('legacy_'))
      const threshold =
        0.22 +
        v.personality.curiosity * 0.18 -
        Math.min(0.22, liveMix * 0.002) -
        (specialized ? 0.12 : 0)
      if (lock < threshold) {
        const prev = v.profession
        v.profession = next
        if (prev !== 'none' && next !== prev) {
          logEvent(state, \`\${v.name} oriente son labeur vers un autre craft (\${prev} → \${next})\`)
        }
      }
    }`
  const oldThreshCr = oldThresh.replace(/\n/g, '\r\n')
  const newThreshCr = newThresh.replace(/\n/g, '\r\n')
  if (t.includes(oldThreshCr)) t = t.replace(oldThreshCr, newThreshCr)
  else if (t.includes(oldThresh)) t = t.replace(oldThresh, newThresh)
  else console.log('WARN: threshold block not found')

  if (!t.includes('noteRecognition(v, 0.012')) {
    const oldNote = '    if (!failed) noteActivityPractice(v, active.kind, 1)\r\n    else if (active.work > 0 || active.ageTicks > 12) noteActivityPractice(v, active.kind, 0.35)'
    const newNote = `    if (!failed) {
      noteActivityPractice(v, active.kind, 1)
      const k = active.kind
      if (
        k.startsWith('craft') ||
        k.startsWith('build') ||
        k === 'tradeRun' ||
        k === 'mintCoins' ||
        k === 'teachCraft' ||
        k === 'harvestWheat' ||
        k === 'mineGold'
      ) {
        noteRecognition(v, 0.012 + Math.min(0.03, mindOf(v).skills.craft * 0.04))
      }
    } else if (active.work > 0 || active.ageTicks > 12) noteActivityPractice(v, active.kind, 0.35)`
    if (t.includes(oldNote)) t = t.replace(oldNote, newNote)
    else {
      const oldNoteLf = oldNote.replace(/\r\n/g, '\n')
      if (t.includes(oldNoteLf)) t = t.replace(oldNoteLf, newNote.replace(/\r\n/g, '\n'))
      else console.log('WARN: noteActivityPractice block not found')
    }
  }

  if (t.includes('noteActivityPractice,') && !/noteRecognition,/.test(t)) {
    t = t.replace(
      '  noteActivityPractice,\r\n  tickLivelihood,',
      '  noteActivityPractice,\r\n  noteRecognition,\r\n  tickLivelihood,',
    )
    if (!/noteRecognition,/.test(t)) {
      t = t.replace(
        '  noteActivityPractice,\n  tickLivelihood,',
        '  noteActivityPractice,\n  noteRecognition,\n  tickLivelihood,',
      )
    }
  }

  return t
})
console.log('behaviors ok')
