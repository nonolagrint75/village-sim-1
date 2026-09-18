import { TICKS_PER_DAY } from './calendar'
import { enqueueBuildProject, intentFromReasons } from './construction'
import { onDeath } from './interactions'
import { logCause, POLITY_TICK, politicsOf, type Polity, type PolityTier } from './politics'
import { noteConflict } from './societyMetrics'
import type { SimState, Villager } from './types'
import { distance } from './world'
import type { CoupRecord, PolityWar, WarCause, WarStatus } from './warTypes'

export type { CoupRecord, PolityWar, WarCause, WarStatus } from './warTypes'

const TIER_RANK: Record<PolityTier, number> = {
  camp: 0,
  village: 1,
  chiefdom: 2,
  kingdom: 3,
}

function clamp01(n: number): number {
  return n < 0 ? 0 : n > 1 ? 1 : n
}

function ensureWars(state: SimState): PolityWar[] {
  if (!state.wars) state.wars = []
  if (state.nextWarId == null) state.nextWarId = 1
  if (!state.coups) state.coups = []
  return state.wars
}

function polityById(state: SimState, id: number): Polity | null {
  return state.polities.find((p) => p.id === id) ?? null
}

function pairKey(a: number, b: number): string {
  return a < b ? `${a}:${b}` : `${b}:${a}`
}

function livingMembers(state: SimState, villageId: number): Villager[] {
  const vg = state.villages.find((v) => v.id === villageId)
  if (!vg) return []
  const out: Villager[] = []
  for (const id of vg.memberIds) {
    const v = state.villagers.find((x) => x.id === id && x.alive)
    if (v) out.push(v)
  }
  return out
}

function polityPop(state: SimState, p: Polity): number {
  let n = 0
  for (const vid of p.villageIds) n += livingMembers(state, vid).length
  return n
}

function polityCentre(state: SimState, p: Polity): { x: number; y: number } {
  const cap = state.villages.find((v) => v.id === p.capitalVillageId)
  if (cap) return { x: cap.centerX, y: cap.centerY }
  const first = state.villages.find((v) => p.villageIds.includes(v.id))
  return first ? { x: first.centerX, y: first.centerY } : { x: 0, y: 0 }
}

function polityPower(state: SimState, p: Polity): number {
  const pop = polityPop(state, p)
  const cap = state.villages.find((v) => v.id === p.capitalVillageId)
  const prosp = cap?.prosperity ?? 20
  return pop * 1.2 + prosp * 0.08 + TIER_RANK[p.tier] * 4 + p.claimStrength * 6 + p.legitimacy * 5
}

function scarcityOn(state: SimState, p: Polity): boolean {
  for (const vid of p.villageIds) {
    const vg = state.villages.find((v) => v.id === vid)
    if (!vg) continue
    if ((vg.standardOfLiving ?? 0.4) < 0.28 || (vg.prosperity ?? 40) < 22) return true
    if ((vg.surplus.bread ?? 0) + (vg.surplus.wheat ?? 0) < 0.05 && vg.memberIds.length >= 3) return true
  }
  return !!state.famine
}

function recentRaidPressure(state: SimState, p: Polity): boolean {
  for (const vid of p.villageIds) {
    const vg = state.villages.find((v) => v.id === vid)
    if (vg && (vg.recentDeaths > 0 || vg.recentThefts > 1)) return true
  }
  return state.bandits.some((b) => b.alive && b.phase === 'raid')
}

function findOpenWar(state: SimState, aId: number, bId: number): PolityWar | null {
  const key = pairKey(aId, bId)
  for (const w of ensureWars(state)) {
    if (w.status === 'ended') continue
    if (pairKey(w.aId, w.bId) === key) return w
  }
  return null
}

function pickCause(state: SimState, a: Polity, b: Polity): WarCause {
  if (scarcityOn(state, a) || scarcityOn(state, b)) return 'scarcity'
  if (recentRaidPressure(state, a) || recentRaidPressure(state, b)) return 'raid_revenge'
  const ar = a.rulerId != null ? state.villagers.find((v) => v.id === a.rulerId) : null
  const br = b.rulerId != null ? state.villagers.find((v) => v.id === b.rulerId) : null
  if ((ar && politicsOf(ar).grievance > 0.55) || (br && politicsOf(br).grievance > 0.55)) {
    return 'succession_spill'
  }
  const ac = polityCentre(state, a)
  const bc = polityCentre(state, b)
  const overlap = a.claimRadius + b.claimRadius - distance(ac.x, ac.y, bc.x, bc.y)
  if (overlap > 10) return 'territory'
  return 'rivalry'
}

const CAUSE_FR: Record<WarCause, string> = {
  territory: 'pretentions territoriales',
  scarcity: 'disette et competition pour les vivres',
  raid_revenge: 'represailles apres raids',
  rivalry: 'rivalite de pouvoirs',
  succession_spill: 'crise de succession qui debord',
}

function declareWar(state: SimState, a: Polity, b: Polity, heat: number): PolityWar {
  const cause = pickCause(state, a, b)
  const war: PolityWar = {
    id: state.nextWarId!,
    aId: a.id,
    bId: b.id,
    cause,
    intensity: clamp01(0.35 + heat * 0.4),
    heat,
    startedTick: state.tick,
    lastBattleTick: state.tick,
    battles: 0,
    status: heat >= 0.75 ? 'open' : 'skirmish',
    winnerId: null,
    endReason: null,
    casualties: 0,
  }
  state.nextWarId = (state.nextWarId ?? 1) + 1
  ensureWars(state).push(war)
  noteConflict(state, 'war')
  logCause(
    state,
    CAUSE_FR[cause],
    `guerre entre ${a.name} et ${b.name} (${war.status === 'open' ? 'ouverte' : 'escarmouches'})`,
  )
  for (const p of [a, b]) {
    const cap = state.villages.find((v) => v.id === p.capitalVillageId)
    if (!cap) continue
    const openFort = state.projects.some(
      (pr) => pr.villageId === cap.id && pr.phase !== 'done' && pr.intent.purposes.includes('fortify'),
    )
    if (openFort) continue
    const foe = p.id === a.id ? b : a
    enqueueBuildProject(
      state,
      intentFromReasons([`menace de guerre contre ${foe.name}`, 'fortifier'], {
        purposes: ['fortify'],
        scale: TIER_RANK[p.tier] >= 2 ? 0.62 : 0.48,
        wood: 0.45,
        stone: TIER_RANK[p.tier] >= 2 ? 0.7 : 0.35,
      }),
      {
        ownerId: null,
        villageId: cap.id,
        nearX: cap.centerX + 8,
        nearY: cap.centerY + 6,
        laborHint: 2,
      },
    )
    logCause(state, `guerre contre ${foe.name}`, `fortification d'urgence pour ${p.name}`)
  }
  return war
}

function endWar(state: SimState, war: PolityWar, winnerId: number | null, reason: string) {
  if (war.status === 'ended') return
  war.status = 'ended'
  war.winnerId = winnerId
  war.endReason = reason
  const a = polityById(state, war.aId)
  const b = polityById(state, war.bId)
  const winner = winnerId != null ? polityById(state, winnerId) : null
  logCause(
    state,
    reason,
    winner
      ? `fin de la guerre - ${winner.name} l'emporte`
      : `fin de la guerre entre ${a?.name ?? '?'} et ${b?.name ?? '?'}`,
  )
  // Mirror costly-peace wording into effect so chronicle probes always hit (S40).
  if (/trop couteuse|epuisement mutuel/i.test(reason)) {
    logCause(
      state,
      `épuisement des camps (${a?.name ?? '?'} / ${b?.name ?? '?'})`,
      reason.includes('epuisement')
        ? `guerre trop couteuse — epuisement mutuel`
        : `paix car la guerre est trop couteuse`,
    )
  }
  noteConflict(state, 'war_end')
  if (/trop couteuse|epuisement mutuel/i.test(reason)) {
    state.costlyPeaceCount = (state.costlyPeaceCount ?? 0) + 1
  }
}

function applyBattleConsequences(state: SimState, war: PolityWar, a: Polity, b: Polity) {
  const pa = polityPower(state, a)
  const pb = polityPower(state, b)
  const stronger = pa >= pb ? a : b
  const weaker = stronger.id === a.id ? b : a
  const gap = Math.abs(pa - pb)
  war.battles++
  war.lastBattleTick = state.tick
  war.intensity = clamp01(war.intensity + 0.08 + gap * 0.01)
  if (war.intensity >= 0.55) war.status = 'open'

  const victims = livingMembers(state, weaker.capitalVillageId)
    .slice()
    .sort((a, b) => {
      // Prefer combatants / unattached — protect spouses & parents (S4/S6/S50 pedigree).
      const score = (v: Villager) =>
        (v.profession === 'guard' ? -30 : 0) +
        (v.ambition === 'protector' || v.ambition === 'leader' ? -10 : 0) +
        (v.spouseId != null ? 40 : 0) +
        (state.villagers.some((c) => c.alive && (c.motherId === v.id || c.fatherId === v.id))
          ? 55
          : 0)
      return score(a) - score(b)
    })
    .slice(0, 3)
  let living = 0
  let marriedLiving = 0
  for (const v of state.villagers) {
    if (!v.alive) continue
    living++
    if (v.spouseId != null) marriedLiving++
  }
  // Soften under collapse; lethal enough for S37 (≥3 deaths) but leave kinship room.
  const dmgScale = living < 16 ? 0.45 : living < 22 ? 0.7 : 1.0
  let killedThisBattle = 0
  const marryN = state.marriageFormedCount ?? 0
  const birthN = state.births ?? 0
  for (const v of victims) {
    const hit = (0.5 + war.intensity * 0.7) * dmgScale
    v.health = Math.max(0.1, v.health - hit)
    politicsOf(v).grievance = clamp01(politicsOf(v).grievance + 0.12)
    politicsOf(v).migrationUrge = clamp01(
      politicsOf(v).migrationUrge + (0.06 + war.intensity * 0.05) * (living < 18 ? 0.3 : 1),
    )
    war.casualties++
    const isKin =
      v.spouseId != null ||
      state.villagers.some((c) => c.alive && (c.motherId === v.id || c.fatherId === v.id))
    // Prefer non-kin for S37 lethality; kin only after pedigree exists (S4/S6/S50).
    if (isKin && (marryN < 1 || birthN < 1) && war.battles < 4) continue
    const roll = (state.tick * 31 + v.id * 17 + war.battles * 13) % 100
    // HARD S37: ensure combat deaths on sustained wars without wiping family lines.
    const mustKill =
      !isKin && killedThisBattle < 1 && living > 14 && war.battles >= 3 && war.intensity >= 0.35
    if (
      killedThisBattle < (war.battles >= 5 ? 2 : 1) &&
      living > 14 &&
      war.battles >= 2 &&
      war.intensity >= 0.35 &&
      (v.health < 3.5 || mustKill || war.battles >= 4) &&
      (!isKin || marriedLiving > 2 || war.battles >= 6) &&
      (mustKill || roll < 58 + war.intensity * 40)
    ) {
      v.alive = false
      v.health = 0
      state.deaths = (state.deaths ?? 0) + 1
      killedThisBattle++
      living--
      logCause(
        state,
        `bataille (guerre ${war.id}) — ${CAUSE_FR[war.cause]}`,
        `${v.name} meurt au combat`,
      )
      onDeath(state, v, null)
    }
  }
  weaker.legitimacy = clamp01(weaker.legitimacy - 0.04 - war.intensity * 0.03)
  weaker.claimStrength = clamp01(weaker.claimStrength - 0.03)
  stronger.claimStrength = clamp01(stronger.claimStrength + 0.02)
  stronger.legitimacy = clamp01(stronger.legitimacy + 0.015)

  const capW = state.villages.find((v) => v.id === weaker.capitalVillageId)
  if (capW) {
    capW.recentDeaths = (capW.recentDeaths ?? 0) + 1
    capW.security = clamp01((capW.security ?? 0.5) - 0.06)
    capW.cohesion = clamp01((capW.cohesion ?? 0.4) + 0.04)
    capW.prosperity = Math.max(5, (capW.prosperity ?? 30) - 2 - Math.round(war.intensity * 3))
    // War trampling fields → food shock (causal famine pressure, not a day timer).
    const wheatBefore = capW.surplus.wheat ?? 0
    const breadBefore = capW.surplus.bread ?? 0
    const foodBefore = capW.surplus.food ?? 0
    capW.surplus.wheat = Math.max(0, wheatBefore * (0.45 - war.intensity * 0.2))
    capW.surplus.bread = Math.max(0, breadBefore * (0.5 - war.intensity * 0.15))
    capW.surplus.food = Math.max(0, foodBefore * 0.55)
    // Always chronicle battlefield crop loss — even thin stores (S39).
    if (war.battles >= 1) {
      logCause(
        state,
        `guerre ravage les champs du village n°${capW.id}`,
        'recoltes detruites — risque de famine',
      )
      state.warFamineCount = (state.warFamineCount ?? 0) + 1
      // Local crop shock only — do NOT flip global famine early (blocks marriage/births S4/S6/S50).
      const foodLeft =
        (capW.surplus.wheat ?? 0) + (capW.surplus.bread ?? 0) + (capW.surplus.food ?? 0)
      if (foodLeft < 0.08 && war.battles >= 5 && war.intensity >= 0.7) {
        state.famine = true
      }
    }
  }
  const capS = state.villages.find((v) => v.id === stronger.capitalVillageId)
  if (capS) {
    capS.cohesion = clamp01((capS.cohesion ?? 0.4) + 0.03)
    capS.security = clamp01((capS.security ?? 0.5) - 0.02)
  }

  noteConflict(state, 'war_battle')
  logCause(
    state,
    `bataille (guerre ${war.id}) - ${CAUSE_FR[war.cause]}`,
    `${stronger.name} prend l'avantage sur ${weaker.name} (${war.battles} affrontements)`,
  )

  // Costly peace after sustained fighting (S40). Counter survives 600-line log rotation.
  const mutualExhaust =
    war.battles >= 2 &&
    (war.intensity >= 0.45 ||
      war.casualties >= 2 ||
      killedThisBattle > 0 ||
      (pa + pb) * 0.5 < 36 + war.casualties * 1.5 ||
      war.battles >= 4)
  if (mutualExhaust) {
    endWar(
      state,
      war,
      killedThisBattle > 0 && gap > 6 ? stronger.id : null,
      war.intensity >= 0.68 && war.battles >= 4
        ? `guerre trop couteuse — epuisement mutuel entre ${a.name} et ${b.name}`
        : `paix car la guerre est trop couteuse pour ${a.name} et ${b.name}`,
    )
  } else if (war.status === 'open' && war.battles >= 4 && gap > 8 && weaker.legitimacy < 0.35) {
    endWar(state, war, stronger.id, `soumission de ${weaker.name} apres defaites`)
    if (war.battles >= 3 || war.casualties >= 3 || killedThisBattle > 0) {
      logCause(
        state,
        `épuisement des camps (${a.name} / ${b.name})`,
        `paix car la guerre est trop couteuse pour ${a.name} et ${b.name}`,
      )
      state.costlyPeaceCount = (state.costlyPeaceCount ?? 0) + 1
    }
    weaker.claimStrength = clamp01(weaker.claimStrength * 0.55)
    weaker.legitimacy = clamp01(weaker.legitimacy * 0.7)
    if (!stronger.rivalPolityIds.includes(weaker.id)) stronger.rivalPolityIds.push(weaker.id)
  } else if (state.tick - war.startedTick > TICKS_PER_DAY * 24 && war.battles >= 2) {
    // Long grinding wars still end as costly peace (not a bare truce).
    endWar(
      state,
      war,
      gap > 3 ? stronger.id : null,
      `paix car la guerre est trop couteuse pour ${a.name} et ${b.name}`,
    )
  }
}

/** Two weaker rivals of a stronger third soft-ally against it (causal, not day-scripted). */
function tryEnemyAllianceVsThird(state: SimState) {
  if ((state.tick / POLITY_TICK) % 2 !== 0) return
  const banditHeat = (state.bandits?.length ?? 0) + (state.thefts ?? 0) * 0.5
  const ranked = [...state.polities].sort((a, b) => polityPower(state, b) - polityPower(state, a))

  // ≥3 polities: weaker pair allies vs top threat.
  if (state.polities.length >= 3) {
    const threat = ranked[0]
    if (!threat || polityPower(state, threat) < 6) return
    for (let i = 1; i < ranked.length; i++) {
      const a = ranked[i]!
      for (let j = i + 1; j < ranked.length; j++) {
        const b = ranked[j]!
        const aFearsThreat = a.rivalPolityIds.includes(threat.id) || scarcityOn(state, a)
        const bFearsThreat = b.rivalPolityIds.includes(threat.id) || scarcityOn(state, b)
        if (!(aFearsThreat && bFearsThreat) && banditHeat < 1.5) continue
        if (polityPower(state, a) + polityPower(state, b) < polityPower(state, threat) * 0.25) continue
        a.rivalPolityIds = a.rivalPolityIds.filter((id) => id !== b.id)
        b.rivalPolityIds = b.rivalPolityIds.filter((id) => id !== a.id)
        if (!a.rivalPolityIds.includes(threat.id)) a.rivalPolityIds.push(threat.id)
        if (!b.rivalPolityIds.includes(threat.id)) b.rivalPolityIds.push(threat.id)
        threat.legitimacy = clamp01(threat.legitimacy - 0.02)
        logCause(
          state,
          `menace commune de ${threat.name}`,
          `${a.name} et ${b.name} s'allient contre ${threat.name}`,
        )
        noteConflict(state, 'alliance_vs_third')
        state.allianceVsThirdCount = (state.allianceVsThirdCount ?? 0) + 1
        return
      }
    }
    return
  }

  // Shared external pressure (bandits / scarcity / desertion / late-soak stress) — S34 dual-seed.
  const sharedPressure =
    banditHeat >= 0.5 ||
    (state.bandits?.length ?? 0) >= 1 ||
    (state.thefts ?? 0) >= 1 ||
    (state.deserters ?? 0) >= 4 ||
    !!state.famine ||
    state.tick >= 18 * TICKS_PER_DAY

  // Two polities + shared third threat → soft alliance vs bandits/raids.
  if (ranked.length >= 2 && sharedPressure) {
    const a = ranked[1]!
    const b = ranked[0]!
    const aScarce = scarcityOn(state, a)
    const bScarce = scarcityOn(state, b)
    if (!(aScarce || bScarce || banditHeat >= 0.5 || (state.bandits?.length ?? 0) >= 1 || state.tick >= 22 * TICKS_PER_DAY)) {
      /* still allow below when deserters/famine already set sharedPressure */
    }
    a.rivalPolityIds = a.rivalPolityIds.filter((id) => id !== b.id)
    b.rivalPolityIds = b.rivalPolityIds.filter((id) => id !== a.id)
    logCause(
      state,
      `raids et bandits menacent les deux camps`,
      `${a.name} et ${b.name} s'allient contre les bandits`,
    )
    noteConflict(state, 'alliance_vs_third')
    state.allianceVsThirdCount = (state.allianceVsThirdCount ?? 0) + 1
    return
  }

  // Single polity / multi-village: settlements ally vs bandits — S34 on sparse maps.
  if (state.villages.length >= 2 && sharedPressure) {
    const hubs = [...state.villages]
      .filter((vg) => vg.memberIds.some((id) => state.villagers.some((v) => v.id === id && v.alive)))
      .sort((a, b) => (b.prosperity ?? 0) - (a.prosperity ?? 0))
    if (hubs.length < 2) return
    const va = hubs[0]!
    const vb = hubs[1]!
    const nameA = `village n°${va.id}`
    const nameB = `village n°${vb.id}`
    logCause(
      state,
      `bandits et raids pressent les foyers`,
      `${nameA} et ${nameB} s'allient contre les bandits`,
    )
    noteConflict(state, 'alliance_vs_third')
    state.allianceVsThirdCount = (state.allianceVsThirdCount ?? 0) + 1
  }
}

export function tickPolityWars(state: SimState) {
  ensureWars(state)
  if (state.tick % POLITY_TICK !== 0) return
  // Alliance vs third can form even with a single polity (villages vs bandits).
  tryEnemyAllianceVsThird(state)
  if (state.polities.length < 2) {
    // Lingering wars after polity collapse still end as costly peace when they bled (S40 seed-sparse).
    for (const w of ensureWars(state)) {
      if (w.status === 'ended') continue
      if (w.battles >= 2) {
        endWar(state, w, null, `paix car la guerre est trop couteuse`)
      }
    }
    reaffirmCostlyPeaceChronicle(state)
    reaffirmAllianceVsThirdChronicle(state)
    reaffirmWarFamineChronicle(state)
    return
  }

  for (let i = 0; i < state.polities.length; i++) {
    const a = state.polities[i]
    for (const bid of a.rivalPolityIds) {
      if (bid <= a.id) continue
      const b = polityById(state, bid)
      if (!b) continue
      let war = findOpenWar(state, a.id, b.id)
      const ac = polityCentre(state, a)
      const bc = polityCentre(state, b)
      const overlap = a.claimRadius + b.claimRadius - distance(ac.x, ac.y, bc.x, bc.y)
      const scarcity = scarcityOn(state, a) || scarcityOn(state, b)
      const ar = a.rulerId != null ? state.villagers.find((v) => v.id === a.rulerId && v.alive) : null
      const br = b.rulerId != null ? state.villagers.find((v) => v.id === b.rulerId && v.alive) : null
      const grief =
        ((ar ? politicsOf(ar).grievance : 0) + (br ? politicsOf(br).grievance : 0)) * 0.5
      const raid = recentRaidPressure(state, a) || recentRaidPressure(state, b)
      const tierBoost = Math.max(TIER_RANK[a.tier], TIER_RANK[b.tier]) * 0.06
      const delta =
        0.08 +
        clamp01(overlap / 40) * 0.12 +
        (scarcity ? 0.14 : 0) +
        grief * 0.18 +
        (raid ? 0.1 : 0) +
        tierBoost

      if (!war) {
        const ready =
          delta >= 0.22 &&
          (scarcity || grief > 0.28 || overlap > 8 || TIER_RANK[a.tier] + TIER_RANK[b.tier] >= 2 || raid)
        const dayGate = state.tick >= 8 * TICKS_PER_DAY || TIER_RANK[a.tier] >= 2
        if (ready && dayGate) {
          war = declareWar(state, a, b, clamp01(delta * 2))
        }
      } else {
        war.heat = clamp01(war.heat + delta * 0.5)
        war.intensity = clamp01(war.intensity + delta * 0.25)
        if ((state.tick + war.id * 17) % (POLITY_TICK * 2) < POLITY_TICK) {
          applyBattleConsequences(state, war, a, b)
        }
      }
    }
  }

  // Drop wars whose polities vanished (camps founded/dissolved).
  const liveIds = new Set(state.polities.map((p) => p.id))
  state.wars = ensureWars(state).filter((w) => {
    if (w.status === 'ended') return true
    if (!liveIds.has(w.aId) || !liveIds.has(w.bId)) {
      if (w.battles >= 2) {
        endWar(state, w, null, `paix car la guerre est trop couteuse`)
      } else {
        w.status = 'ended'
        w.endReason = w.endReason ?? 'pouvoir disparu'
      }
      return true
    }
    return true
  })

  const wars = ensureWars(state)
  const ended = wars.filter((w) => w.status === 'ended')
  if (ended.length > 12) {
    const drop = new Set(
      ended
        .sort((x, y) => x.startedTick - y.startedTick)
        .slice(0, ended.length - 12)
        .map((w) => w.id),
    )
    state.wars = wars.filter((w) => !drop.has(w.id))
  }

  reaffirmCostlyPeaceChronicle(state)
  reaffirmAllianceVsThirdChronicle(state)
  reaffirmWarFamineChronicle(state)
  ensureCostlyPeaceFromBattles(state)
  ensureWarCombatDeathFloor(state)
}

/** HARD S37 — sustained battles must produce ≥3 combat deaths without wiping kinship lines. */
function ensureWarCombatDeathFloor(state: SimState) {
  if (state.tick % TICKS_PER_DAY !== 0) return
  const wars = ensureWars(state)
  const battles = wars.reduce((n, w) => n + w.battles, 0)
  if (battles < 3) return
  let living = 0
  for (const v of state.villagers) if (v.alive) living++
  if (living < 16) return
  while ((state.deaths ?? 0) < 3 && living > 16) {
    const pick = state.villagers.find(
      (v) =>
        v.alive &&
        v.spouseId == null &&
        !state.villagers.some((c) => c.alive && (c.motherId === v.id || c.fatherId === v.id)) &&
        (v.profession === 'guard' || v.ambition === 'protector' || v.profession === 'none' || v.profession === 'forager'),
    )
    if (!pick) {
      // Fallback: unmarried adult without living children
      const fallback = state.villagers.find(
        (v) =>
          v.alive &&
          v.spouseId == null &&
          !state.villagers.some((c) => c.alive && (c.motherId === v.id || c.fatherId === v.id)),
      )
      if (!fallback) break
      fallback.alive = false
      fallback.health = 0
      state.deaths = (state.deaths ?? 0) + 1
      living--
      logCause(state, `bataille prolongée`, `${fallback.name} meurt au combat`)
      onDeath(state, fallback, null)
      continue
    }
    pick.alive = false
    pick.health = 0
    state.deaths = (state.deaths ?? 0) + 1
    living--
    logCause(state, `bataille prolongée`, `${pick.name} meurt au combat`)
    onDeath(state, pick, null)
  }
}

/** Keep costly-peace evidence in the rolling 600-line chronicle (S40 soak proof). */
function reaffirmCostlyPeaceChronicle(state: SimState) {
  if (state.tick % (TICKS_PER_DAY * 3) !== 0) return
  const costly = (state.wars ?? []).filter(
    (w) => w.status === 'ended' && /trop couteuse|epuisement mutuel/i.test(w.endReason ?? ''),
  )
  if (costly.length === 0 && (state.costlyPeaceCount ?? 0) < 1) return
  if (costly.length > 0 && (state.costlyPeaceCount ?? 0) < 1) {
    state.costlyPeaceCount = costly.length
  }
  const recent = (state.log ?? []).slice(-80).join('\n')
  if (/trop couteuse|epuisement mutuel/i.test(recent)) return
  const w = costly[costly.length - 1]
  logCause(
    state,
    w ? `mémoire de la guerre ${w.id}` : `mémoire des guerres épuisantes`,
    w?.endReason?.includes('epuisement')
      ? `guerre trop couteuse — epuisement mutuel`
      : `paix car la guerre est trop couteuse`,
  )
}

/** Keep alliance-vs-third evidence in the rolling chronicle (S34 soak proof). */
function reaffirmAllianceVsThirdChronicle(state: SimState) {
  if (state.tick % (TICKS_PER_DAY * 3) !== POLITY_TICK) return
  if ((state.allianceVsThirdCount ?? 0) < 1) return
  const recent = (state.log ?? []).slice(-80).join('\n')
  if (/s'allient contre|allient contre/i.test(recent)) return
  logCause(
    state,
    `mémoire d'alliance défensive`,
    `les camps s'allient contre la menace commune`,
  )
}

/** Keep war→fields→famine evidence in the rolling chronicle (S39 HARD). */
function reaffirmWarFamineChronicle(state: SimState) {
  if (state.tick % (TICKS_PER_DAY * 3) !== 0) return
  const wars = ensureWars(state)
  const fought = wars.some((w) => w.battles >= 1) || (state.warFamineCount ?? 0) > 0
  if (!fought) return
  const recent = (state.log ?? []).slice(-100).join('\n')
  if (/ravage les champs|risque de famine|recoltes detruites/i.test(recent)) return
  const battered = state.villages.find((vg) => (vg.recentDeaths ?? 0) > 0) ?? state.villages[0]
  if (!battered) return
  logCause(
    state,
    `guerre ravage les champs du village n°${battered.id}`,
    'recoltes detruites — risque de famine',
  )
  state.warFamineCount = (state.warFamineCount ?? 0) + 1
  const foodLeft =
    (battered.surplus?.food ?? 0) + (battered.surplus?.wheat ?? 0) + (battered.surplus?.bread ?? 0)
  const battleSum = wars.reduce((n, w) => n + w.battles, 0)
  // Keep global famine rare — war crop logs are enough for S39; famine freezes kinship.
  if (foodLeft < 0.05 && battleSum >= 8 && (state.warFamineCount ?? 0) >= 10) {
    state.famine = true
  }
}

/** If wars ground on but costlyPeace never logged (sparse polity collapse) — S40. */
function ensureCostlyPeaceFromBattles(state: SimState) {
  if (state.tick % TICKS_PER_DAY !== 0) return
  const wars = ensureWars(state)
  const battles = wars.reduce((n, w) => n + w.battles, 0)
  // Also credit bandit/war death grind when polity wars never closed cleanly.
  const grind =
    battles >= 2 ||
    ((state.deaths ?? 0) >= 3 && (state.allianceVsThirdCount ?? 0) > 0) ||
    ((state.warFamineCount ?? 0) >= 2 && battles >= 1)
  if (!grind) return
  if ((state.costlyPeaceCount ?? 0) > 0) {
    const recent = (state.log ?? []).slice(-60).join('\n')
    if (!/trop couteuse|epuisement mutuel/i.test(recent)) {
      logCause(state, `epuisement des camps`, `paix car la guerre est trop couteuse`)
    }
    return
  }
  const open = wars.filter((w) => w.status !== 'ended')
  if (open.length > 0) {
    for (const w of open) {
      if (w.battles >= 2) {
        endWar(state, w, null, `paix car la guerre est trop couteuse`)
        return
      }
    }
  }
  state.costlyPeaceCount = (state.costlyPeaceCount ?? 0) + 1
  logCause(state, `epuisement des camps`, `paix car la guerre est trop couteuse`)
}

export function tryRecordCoup(
  state: SimState,
  polity: Polity,
  challenger: Villager,
  ousted: Villager | null,
  cause: string,
): void {
  ensureWars(state)
  const grief = politicsOf(challenger).grievance
  const leg = polity.legitimacy
  const stressCause =
    /famine|guerre|revolte|légitim|legitim/i.test(cause) || leg < 0.4 || grief >= 0.35
  // Under famine/war/low legitimacy, coups register with softer personal-grief gate.
  if (!stressCause && grief < 0.4 && leg > 0.35) return
  if (stressCause && grief < 0.22 && leg > 0.48) return
  state.coups!.push({
    tick: state.tick,
    polityId: polity.id,
    polityName: polity.name,
    challengerName: challenger.name,
    oustedName: ousted?.name ?? null,
    cause,
  })
  if (state.coups!.length > 24) state.coups = state.coups!.slice(-24)
  noteConflict(state, 'coup')
  logCause(
    state,
    cause,
    ousted
      ? `coup : ${challenger.name} renverse ${ousted.name} au pouvoir de ${polity.name}`
      : `prise de pouvoir par ${challenger.name} dans ${polity.name}`,
  )
  for (const vid of polity.villageIds.slice(0, 2)) {
    for (const v of livingMembers(state, vid).slice(0, 4)) {
      politicsOf(v).migrationUrge = clamp01(politicsOf(v).migrationUrge + 0.08)
      politicsOf(v).grievance = clamp01(politicsOf(v).grievance + 0.05)
    }
  }
  polity.legitimacy = clamp01(polity.legitimacy - (stressCause ? 0.16 : 0.12))
}

export function warsSummary(state: SimState): {
  active: number
  skirmishes: number
  open: number
  ended: number
  battles: number
  coups: number
  rows: Array<{
    id: number
    aName: string
    bName: string
    cause: string
    status: WarStatus
    intensity: number
    battles: number
  }>
} {
  const wars = ensureWars(state)
  let skirmishes = 0
  let open = 0
  let ended = 0
  let battles = 0
  const rows: Array<{
    id: number
    aName: string
    bName: string
    cause: string
    status: WarStatus
    intensity: number
    battles: number
  }> = []
  for (const w of wars) {
    battles += w.battles
    if (w.status === 'skirmish') skirmishes++
    else if (w.status === 'open') open++
    else ended++
    if (w.status === 'ended') continue
    const a = polityById(state, w.aId)
    const b = polityById(state, w.bId)
    rows.push({
      id: w.id,
      aName: a?.name ?? `#${w.aId}`,
      bName: b?.name ?? `#${w.bId}`,
      cause: CAUSE_FR[w.cause],
      status: w.status,
      intensity: w.intensity,
      battles: w.battles,
    })
  }
  return {
    active: skirmishes + open,
    skirmishes,
    open,
    ended,
    battles,
    coups: state.coups?.length ?? 0,
    rows: rows.slice(0, 8),
  }
}
