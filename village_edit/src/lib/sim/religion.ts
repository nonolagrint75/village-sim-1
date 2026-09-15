/**
 * Religions / creeds émergents — mécanismes soft uniquement.
 * Branche politics (creeds, cercles pieux), cognition (lieux sacrés),
 * livelihood (gourou) et construction (autels). Pas de religion prédéfinie.
 */

import { mindOf, peekMind } from './cognition/mindPool'
import type { CognitiveState } from './cognition/types'
import { noteActivityPractice } from './livelihood'
import {
  CREED_FR,
  creedLabel,
  circlesOf,
  logCause,
  politicsOf,
  trySpreadCreed,
  type CreedId,
  villageOf,
} from './politics'
import { logEvent } from './social'
import type { SimState, Village, Villager } from './types'
import { distance } from './world'
import { enqueueBuildProject, intentFromReasons } from './construction'

const SHRINE_RITE_COOLDOWN = 160
const CREED_FROM_PIETY = 0.52

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v))
}

/** Lignes de chronique liées à la foi / creed / rite (preuve headless). */
export const RELIGION_CHRONICLE_RE =
  /creed|foi|rite|rituel|autel|sanctuaire|sacré|recueillement|gourou|prêtre|conversion|convertit|voie |culte|honorer le sacré|cercle pieux|enseigne la voie|se répand|piété|pieux/i

export function isReligionChronicleLine(line: string): boolean {
  return RELIGION_CHRONICLE_RE.test(line)
}

export function ensureVillageShrine(vg: Village): void {
  if (vg.hasShrine === undefined) vg.hasShrine = false
  if (vg.shrineX === undefined) vg.shrineX = -1
  if (vg.shrineY === undefined) vg.shrineY = -1
  if (vg.shrineLabel === undefined) vg.shrineLabel = null
  if (vg.shrineCreed === undefined) vg.shrineCreed = null
  if (vg.lastShrineRiteTick === undefined) vg.lastShrineRiteTick = 0
}

function shrineNameFr(creed: CreedId | null, cultureTag: string | null): string {
  const voie = creed ? CREED_FR[creed] : 'le recueillement'
  const tag = cultureTag && cultureTag.length > 1 ? cultureTag : 'pierre'
  return `autel de ${tag} (« ${voie} »)`
}

/** Soft: piété monte par deuil, âge, cercle pieux — sans script de religion. */
function tickPietyDrift(state: SimState, v: Villager): void {
  const pol = politicsOf(v)
  let bump = 0
  for (const m of v.memories) {
    if (state.tick - m.tick > 500) continue
    if (m.kind === 'grief' || m.kind === 'harmed' || m.kind === 'saved') bump += 0.006
  }
  if (v.age > 700) bump += 0.004
  const faith = circlesOf(state, v).some((c) => c.kind === 'faith' || c.creed === 'piete')
  if (faith) bump += 0.008
  const mind = peekMind(v.id)
  if (mind && mind.sacredConf > 0.25) bump += 0.005
  if (bump > 0) {
    pol.beliefs.piety = clamp01(pol.beliefs.piety + bump)
    if (pol.beliefs.piety > 0.45) {
      pol.creedWeight = clamp01(pol.creedWeight + 0.012 + pol.beliefs.piety * 0.01)
    }
  }
}

/**
 * Crystallise un creed depuis la piété / le lieu sacré (pas seulement grief).
 * Retourne true si un nouveau creed apparaît.
 */
export function maybeCrystallizeFaithCreed(state: SimState, v: Villager): boolean {
  const pol = politicsOf(v)
  const mind = peekMind(v.id)
  const sacred = mind?.sacredConf ?? 0
  const ready =
    pol.beliefs.piety >= CREED_FROM_PIETY &&
    (pol.creedWeight >= 0.28 || sacred >= 0.32 || circlesOf(state, v).some((c) => c.kind === 'faith'))
  if (!ready) return false

  let next: CreedId | null = null
  if (pol.beliefs.piety >= 0.55 || sacred >= 0.4) next = 'piete'
  else if (pol.beliefs.tradition > 0.6) next = 'tradition'
  else if (pol.beliefs.fairness > 0.6) next = 'partage'
  else if (pol.grievance > 0.45) next = 'ordre'
  else if (pol.beliefs.piety >= CREED_FROM_PIETY) next = 'piete'

  if (!next || next === pol.creed) {
    if (pol.creed) pol.creedWeight = clamp01(pol.creedWeight + 0.015)
    return false
  }

  const prev = pol.creed
  pol.creed = next
  pol.creedWeight = Math.max(pol.creedWeight, 0.42)
  const label = CREED_FR[next]
  if (!prev) {
    logCause(state, `piété croissante de ${v.name}`, `creed : « ${label} »`)
    if (!state.milestones.firstCreed) {
      state.milestones.firstCreed = true
      logEvent(state, `Première voie de foi : « ${label} » (portée par ${v.name})`)
    }
  } else {
    logCause(state, `${v.name} change de conviction`, `creed : « ${label} »`)
  }
  return true
}

function livingMembers(state: SimState, ids: number[]): Villager[] {
  const out: Villager[] = []
  for (const id of ids) {
    const v = state.villagers.find((o) => o.id === id && o.alive)
    if (v) out.push(v)
  }
  return out
}

/** Autel villageois : point de rencontre sacré émergent. */
function maybeFoundShrine(state: SimState, vg: Village): void {
  ensureVillageShrine(vg)
  if (vg.hasShrine) return

  const faith = state.circles.filter(
    (c) => c.villageId === vg.id && (c.kind === 'faith' || c.creed === 'piete') && c.memberIds.length >= 2,
  )
  if (faith.length === 0) return

  const members = villageMembers(state, vg.id)
  let best: Villager | null = null
  let bestScore = 0
  for (const v of members) {
    const pol = politicsOf(v)
    const mind = peekMind(v.id)
    const score = pol.beliefs.piety * 0.5 + (mind?.sacredConf ?? 0) * 0.5 + (pol.creed === 'piete' ? 0.2 : 0)
    if (score > bestScore) {
      bestScore = score
      best = v
    }
  }
  if (!best || bestScore < 0.42) return

  const mind = mindOf(best)
  const sx = mind.sacredConf > 0.2 ? mind.sacredX : Math.round(vg.centerX + (best.x - vg.centerX) * 0.3)
  const sy = mind.sacredConf > 0.2 ? mind.sacredY : Math.round(vg.centerY + (best.y - vg.centerY) * 0.3)
  const creed = (politicsOf(best).creed ?? faith[0]!.creed ?? 'piete') as CreedId | null
  const label = shrineNameFr(creed === 'piete' || creed ? creed : 'piete', mind.cultureTag)

  vg.hasShrine = true
  vg.shrineX = sx
  vg.shrineY = sy
  vg.shrineLabel = label
  vg.shrineCreed = creed ?? 'piete'
  vg.lastShrineRiteTick = state.tick

  for (const v of members) {
    const m = peekMind(v.id)
    if (!m) continue
    m.sacredX = sx
    m.sacredY = sy
    m.sacredConf = clamp01(m.sacredConf + 0.12)
  }

  logCause(state, `recueillement partagé au village n°${vg.id}`, `${label} s'élève`)
  if (!state.milestones.firstShrine) {
    state.milestones.firstShrine = true
    logEvent(state, `Premier sanctuaire : ${label}`)
  }

  // Soft build project so the autel becomes a visible chantier.
  const leader = faith[0]!.leaderId !== null
    ? members.find((m) => m.id === faith[0]!.leaderId) ?? best
    : best
  const project = enqueueBuildProject(
    state,
    intentFromReasons([`foi du ${faith[0]!.name}`, 'autel', 'sanctuaire', 'recueillement'], {
      purposes: ['shrine'],
      scale: 0.4 + faith[0]!.legitimacy * 0.2,
      wood: 0.55,
      stone: 0.65,
    }),
    {
      ownerId: leader.id,
      villageId: vg.id,
      nearX: sx,
      nearY: sy,
      laborHint: 1.1,
      sponsorCircleId: faith[0]!.id,
    },
  )
  if (project) {
    for (const m of livingMembers(state, faith[0]!.memberIds).slice(0, 3)) {
      if (m.activeProjectId === null) m.activeProjectId = project.id
    }
  }
}

function villageMembers(state: SimState, villageId: number): Villager[] {
  const out: Villager[] = []
  for (const v of state.villagers) {
    if (v.alive && v.villageId === villageId) out.push(v)
  }
  return out
}

/** Rite près de l'autel — cohésion, piété, chronicle FR. */
function tickShrineRitual(state: SimState, vg: Village): void {
  ensureVillageShrine(vg)
  if (!vg.hasShrine || vg.shrineX < 0) return
  if (state.tick - vg.lastShrineRiteTick < SHRINE_RITE_COOLDOWN) return

  const members = villageMembers(state, vg.id)
  let near = 0
  const attendees: Villager[] = []
  for (const m of members) {
    if (distance(m.x, m.y, vg.shrineX, vg.shrineY) < 14) {
      near++
      attendees.push(m)
    }
  }
  if (near < 2) return

  vg.lastShrineRiteTick = state.tick
  vg.lastRitualTick = state.tick
  vg.cohesion = clamp01(vg.cohesion + 0.04)

  let guide: Villager | null = null
  let guideScore = 0
  for (const m of attendees) {
    const pol = politicsOf(m)
    const live = peekMind(m.id)?.livelihood
    const score =
      pol.beliefs.piety +
      (live?.roleTag === 'gourou' || live?.roleTag === 'guerisseur' ? 0.35 : 0) +
      (pol.creed ? 0.15 : 0)
    if (score > guideScore) {
      guideScore = score
      guide = m
    }
  }

  for (const m of attendees) {
    const pol = politicsOf(m)
    pol.beliefs.piety = clamp01(pol.beliefs.piety + 0.02)
    pol.beliefs.loyalty = clamp01(pol.beliefs.loyalty + 0.012)
    pol.normInternalization = clamp01(pol.normInternalization + 0.01)
    pol.grievance = clamp01(pol.grievance - 0.025)
    if (vg.shrineCreed && (!pol.creed || pol.creedWeight < 0.35)) {
      if (!pol.creed) {
        pol.creed = vg.shrineCreed as CreedId
        pol.creedWeight = 0.3
      } else {
        pol.creedWeight = clamp01(pol.creedWeight + 0.04)
      }
    }
    const mind = peekMind(m.id)
    if (mind) {
      mind.sacredX = vg.shrineX
      mind.sacredY = vg.shrineY
      mind.sacredConf = clamp01(mind.sacredConf + 0.05)
      mind.emotions.stress = clamp01(mind.emotions.stress - 0.05)
      mind.needs.piety = clamp01(mind.needs.piety - 0.12)
      mind.needs.belonging = clamp01(mind.needs.belonging - 0.08)
    }
  }

  // Soft conversion among attendees toward shrine creed / guide.
  if (guide) {
    for (const m of attendees) {
      if (m.id === guide.id) continue
      trySpreadCreed(state, guide, m)
    }
    noteActivityPractice(guide, 'counsel', 0.8)
    const live = mindOf(guide).livelihood
    if (live && (live.roleTag === null || live.mix.ritual + live.mix.counsel > 0.15)) {
      live.mix.ritual = clamp01(live.mix.ritual + 0.04)
      live.mix.counsel = clamp01(live.mix.counsel + 0.03)
      live.recognition = clamp01(live.recognition + 0.03)
    }
  }

  const place = vg.shrineLabel ?? 'l\'autel'
  const who = guide ? `sous la conduite de ${guide.name}` : `avec ${near} fidèles`
  logCause(state, `rite au ${place}`, `le recueillement renforce la foi ${who}`)
  if (!state.milestones.firstRitual) {
    state.milestones.firstRitual = true
    logEvent(state, `Premier rituel : ${place}`)
  }
  if (guide && (peekMind(guide.id)?.livelihood.roleTag === 'gourou' || politicsOf(guide).beliefs.piety > 0.65)) {
    if ((state.tick + guide.id) % 220 < 20) {
      logEvent(state, `${guide.name} guide le rite comme gourou près de ${place}`)
    }
  }
}

/** Gourou / guide spirituel émergent parmi les pieux. */
function maybeRecognizePriest(state: SimState, v: Villager): void {
  const pol = politicsOf(v)
  const mind = peekMind(v.id)
  if (!mind) return
  const live = mind.livelihood
  if (!live) return
  if (live.roleTag === 'gourou') return
  const faithMember = circlesOf(state, v).some((c) => c.kind === 'faith')
  const ready =
    (pol.beliefs.piety > 0.58 && mind.sacredConf > 0.35 && (pol.creed !== null || faithMember)) ||
    (faithMember && pol.beliefs.piety > 0.55 && live.mix.counsel + live.mix.ritual > 0.2)
  if (!ready) return
  if ((state.tick + v.id * 11) % 180 !== 0) return

  live.mix.counsel = clamp01(Math.max(live.mix.counsel, 0.28))
  live.mix.ritual = clamp01(Math.max(live.mix.ritual, 0.22))
  live.roleTag = 'gourou'
  live.titleFr = 'gourou'
  live.recognition = clamp01(live.recognition + 0.08)
  live.lastTitleTick = state.tick
  logCause(state, `piété et écoute autour de ${v.name}`, `${v.name} est reconnu comme gourou`)
}

/** Conversion soft lors d'un conseil spirituel. */
export function noteSpiritualCounsel(state: SimState, guide: Villager, seeker: Villager): void {
  const gp = politicsOf(guide)
  const sp = politicsOf(seeker)
  sp.beliefs.piety = clamp01(sp.beliefs.piety + 0.02)
  const gm = peekMind(guide.id)
  if (gm) {
    gm.sacredConf = clamp01(gm.sacredConf + 0.02)
  }
  noteActivityPractice(guide, 'counsel', 1)
  const sm = peekMind(seeker.id)
  if (sm && gm) {
    sm.sacredX = gm.sacredX
    sm.sacredY = gm.sacredY
    sm.sacredConf = clamp01(sm.sacredConf + 0.03)
  }

  if (gp.creed && gp.creedWeight >= 0.3) {
    const before = sp.creed
    trySpreadCreed(state, guide, seeker)
    if (sp.creed === gp.creed && before !== gp.creed) {
      logCause(
        state,
        `${guide.name} enseigne la voie à ${seeker.name}`,
        `conversion : « ${CREED_FR[gp.creed]} »`,
      )
    } else if (sp.creed === gp.creed) {
      sp.creedWeight = clamp01(sp.creedWeight + 0.06)
    }
  } else if (gp.beliefs.piety > 0.55 && !gp.creed) {
    gp.creedWeight = clamp01(gp.creedWeight + 0.04)
  }
}

export function religionPortraitFr(state: SimState, v: Villager, mind: CognitiveState | null): string | null {
  const pol = politicsOf(v)
  const bits: string[] = []
  if (pol.creed) bits.push(`voie « ${creedLabel(pol.creed)} »`)
  if (mind && mind.sacredConf > 0.2) {
    bits.push(`lieu sacré ${Math.round(mind.sacredConf * 100)} %`)
  }
  const vg = villageOf(state, v.villageId)
  if (vg) {
    ensureVillageShrine(vg)
    if (vg.hasShrine && vg.shrineLabel) bits.push(vg.shrineLabel)
  }
  const role = mind?.livelihood?.roleTag
  if (role === 'gourou' || role === 'guerisseur') bits.push(role === 'gourou' ? 'gourou' : 'guérisseur')
  return bits.length ? bits.join(' · ') : null
}

/**
 * Tick monde — appelé depuis tickPolitics (cadence cercles).
 * Forme creeds, autels, rites et gourous de façon visible.
 */
export function tickReligionWorld(state: SimState): void {
  // Individual soft faith path (staggered).
  for (const v of state.villagers) {
    if (!v.alive) continue
    if ((state.tick + v.id * 7) % 36 !== 0) continue
    tickPietyDrift(state, v)
    maybeCrystallizeFaithCreed(state, v)
    maybeRecognizePriest(state, v)
  }

  for (const vg of state.villages) {
    ensureVillageShrine(vg)
    maybeFoundShrine(state, vg)
    tickShrineRitual(state, vg)
  }

  // Align sacred points of faith-circle members on shrine / centroid.
  for (const c of state.circles) {
    if (c.kind !== 'faith' && c.creed !== 'piete') continue
    const members = livingMembers(state, c.memberIds)
    if (members.length < 2) continue
    const vg = villageOf(state, c.villageId)
    if (vg) ensureVillageShrine(vg)
    let sx = 0
    let sy = 0
    if (vg?.hasShrine && vg.shrineX >= 0) {
      sx = vg.shrineX
      sy = vg.shrineY
    } else {
      for (const m of members) {
        sx += m.x
        sy += m.y
      }
      sx = Math.round(sx / members.length)
      sy = Math.round(sy / members.length)
    }
    for (const m of members) {
      const mind = peekMind(m.id)
      if (!mind) continue
      mind.sacredX = sx
      mind.sacredY = sy
      if (distance(m.x, m.y, sx, sy) < 16) {
        mind.sacredConf = clamp01(mind.sacredConf + 0.02)
      }
    }
  }
}
