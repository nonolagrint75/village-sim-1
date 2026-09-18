/**
 * Staging catalog + pure emit helpers for war/crisis scars.
 * Integrator calls these with hints filled from live sim — no SimState import here.
 */

import type {
  CrisisScarHint,
  FortifyScarHint,
  LiveRuinKind,
  RaidScarHint,
  ScarEvent,
  ScarEventKind,
  ScarExport,
  WarScarHint,
} from './types'

const TICKS_PER_DAY = 240

export const SCAR_KIND_TO_LIVE_RUIN: Partial<Record<ScarEventKind, LiveRuinKind>> = {
  battle_scar: 'battle',
  raid_scar: 'raid',
  house_ruined: 'ruin',
  clearing_scar: 'clearing',
  // field_burned / famine_stress / fortify_raised / refugee_depart → overlays, not ActorRuin
}

export const SCAR_CATALOG: Array<{
  kind: ScarEventKind
  source: ScarEvent['source']
  propId: string
  summary: string
}> = [
  { kind: 'battle_scar', source: 'war', propId: 'battle_ash_ring', summary: 'Capital combat scar after PolityWar battles' },
  { kind: 'raid_scar', source: 'bandit', propId: 'raid_scorch_wedge', summary: 'Band raid / camp pressure scar' },
  { kind: 'house_ruined', source: 'revolt', propId: 'house_rubble', summary: 'Collapsed or abandoned house silhouette' },
  { kind: 'field_burned', source: 'war', propId: 'burned_field_patch', summary: 'Trampled / burned FIELD+WHEAT patch' },
  { kind: 'clearing_scar', source: 'rebuild', propId: 'clearing_ash', summary: 'Empty clearing after collapse' },
  { kind: 'fortify_raised', source: 'war', propId: 'palisade_segment', summary: 'Emergency wood/stone wall after attack' },
  { kind: 'famine_stress', source: 'famine', propId: 'famine_haze_flag', summary: 'Soft visual stress — no rubble' },
  { kind: 'refugee_depart', source: 'bandit', propId: 'refugee_cart', summary: 'Cart on road edge from migrationUrge' },
]

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n))
}

function ageDays(tick: number, since: number): number {
  return Math.max(0, Math.floor((tick - since) / TICKS_PER_DAY))
}

function eid(prefix: string, a: number | string, b: number | string): string {
  return `${prefix}:${a}:${b}`
}

/** War battle / open war → battle scars + optional field burn on weaker capital. */
export function scarsFromWar(hint: WarScarHint, tick: number): ScarEvent[] {
  const recent =
    hint.status !== 'ended' ||
    (hint.lastBattleTick > 0 && tick - hint.lastBattleTick < TICKS_PER_DAY * 8)
  if (!recent && hint.battles < 1) return []
  if (hint.intensity < 0.15 && hint.battles < 1) return []

  const intens = clamp01(hint.intensity)
  const since = hint.lastBattleTick || hint.startedTick
  const age = ageDays(tick, since)
  const kind: ScarEventKind = hint.battles >= 1 ? 'battle_scar' : 'raid_scar'
  const out: ScarEvent[] = [
    {
      id: eid('warA', hint.warId, hint.aId),
      kind,
      tick,
      x: hint.capitalAX,
      y: hint.capitalAY,
      intensity: intens,
      ageDays: age,
      source: 'war',
      polityId: hint.aId,
      warId: hint.warId,
      note: hint.cause,
    },
    {
      id: eid('warB', hint.warId, hint.bId),
      kind,
      tick,
      x: hint.capitalBX,
      y: hint.capitalBY,
      intensity: intens,
      ageDays: age,
      source: 'war',
      polityId: hint.bId,
      warId: hint.warId,
      note: hint.cause,
    },
  ]

  if (hint.battles >= 1 && intens >= 0.35) {
    // Mirror applyBattleConsequences field trampling — place burn near capital A as default weak side cue;
    // integrator should prefer the weaker capital when known.
    out.push({
      id: eid('burn', hint.warId, 'fields'),
      kind: 'field_burned',
      tick,
      x: hint.capitalAX + 2,
      y: hint.capitalAY + 1,
      intensity: clamp01(intens * 0.85),
      ageDays: age,
      source: 'war',
      warId: hint.warId,
      note: 'recoltes detruites',
    })
  }
  return out
}

/** Band lastRaidTick window → raid scars at camp + target. */
export function scarsFromRaid(hint: RaidScarHint): ScarEvent[] {
  if (hint.lastRaidTick <= 0) return []
  if (hint.tick - hint.lastRaidTick > TICKS_PER_DAY * 8) return []
  const age = ageDays(hint.tick, hint.lastRaidTick)
  const out: ScarEvent[] = [
    {
      id: eid('raidCamp', hint.bandId, hint.lastRaidTick),
      kind: 'raid_scar',
      tick: hint.tick,
      x: hint.campX,
      y: hint.campY,
      intensity: 0.45,
      ageDays: age,
      source: 'bandit',
      bandId: hint.bandId,
    },
  ]
  if (hint.targetVillageId != null) {
    out.push({
      id: eid('raidTarget', hint.bandId, hint.targetVillageId),
      kind: 'raid_scar',
      tick: hint.tick,
      x: hint.targetX,
      y: hint.targetY,
      intensity: hint.phase === 'raid' ? 0.55 : 0.35,
      ageDays: age,
      source: 'bandit',
      bandId: hint.bandId,
      villageId: hint.targetVillageId,
    })
  }
  return out
}

/** crisisPhase + famine → ruin / stress / clearing. */
export function scarsFromCrisis(hint: CrisisScarHint): ScarEvent[] {
  const age = ageDays(hint.tick, hint.lastCrisisTick || hint.tick)
  const out: ScarEvent[] = []

  if (hint.crisisPhase === 'collapse') {
    out.push({
      id: eid('collapse', hint.villageId, hint.lastCrisisTick),
      kind: 'house_ruined',
      tick: hint.tick,
      x: hint.x,
      y: hint.y,
      intensity: 0.7,
      ageDays: age,
      source: 'revolt',
      villageId: hint.villageId,
    })
    out.push({
      id: eid('clear', hint.villageId, age),
      kind: 'clearing_scar',
      tick: hint.tick,
      x: hint.x + 1,
      y: hint.y - 1,
      intensity: 0.4,
      ageDays: age,
      source: 'rebuild',
      villageId: hint.villageId,
    })
  } else if (hint.crisisPhase === 'crisis') {
    out.push({
      id: eid('crisis', hint.villageId, hint.lastCrisisTick),
      kind: 'raid_scar',
      tick: hint.tick,
      x: hint.x + 1.5,
      y: hint.y - 1,
      intensity: 0.4,
      ageDays: age,
      source: 'bandit',
      villageId: hint.villageId,
    })
  }

  if (hint.famine || hint.crisisPhase === 'crisis' || hint.crisisPhase === 'collapse') {
    out.push({
      id: eid('famine', hint.villageId, hint.tick),
      kind: 'famine_stress',
      tick: hint.tick,
      x: hint.x,
      y: hint.y,
      intensity: clamp01(
        (hint.famine ? 0.55 : 0.25) +
          (hint.crisisPhase === 'collapse' ? 0.25 : 0) +
          (hint.prosperity < 18 ? 0.15 : 0),
      ),
      ageDays: age,
      source: 'famine',
      villageId: hint.villageId,
    })
  }

  if (hint.crisisPhase === 'rebuild' && hint.rebuildProgress < 0.85) {
    // Keep rubble visible while rebuilding; fade intensity with progress.
    out.push({
      id: eid('rebuildRubble', hint.villageId, hint.lastCrisisTick),
      kind: 'house_ruined',
      tick: hint.tick,
      x: hint.x,
      y: hint.y,
      intensity: clamp01(0.55 * (1 - hint.rebuildProgress)),
      ageDays: age,
      source: 'rebuild',
      villageId: hint.villageId,
    })
  }

  return out
}

/** Post-attack fortify → palisade / keep cue (not a ruin). */
export function scarsFromFortify(hint: FortifyScarHint): ScarEvent[] {
  if (!hint.fortifyActive && !hint.fortifyDone && hint.wallTier === 'none') return []
  return [
    {
      id: eid('fortify', hint.villageId, hint.tick),
      kind: 'fortify_raised',
      tick: hint.tick,
      x: hint.x,
      y: hint.y,
      intensity: hint.fortifyDone ? 0.9 : clamp01(0.25 + hint.progress * 0.7),
      ageDays: 0,
      source: 'war',
      villageId: hint.villageId,
      note: hint.reason ?? (hint.wallTier === 'stone' ? 'rempart pierre' : 'palissade'),
    },
  ]
}

/** Refugee cart when migration / deserters pressure is high (integrator supplies gate). */
export function scarRefugeeCart(
  villageId: number,
  x: number,
  y: number,
  tick: number,
  intensity = 0.4,
): ScarEvent {
  return {
    id: eid('refugee', villageId, tick),
    kind: 'refugee_depart',
    tick,
    x,
    y,
    intensity: clamp01(intensity),
    ageDays: 0,
    source: 'bandit',
    villageId,
    note: 'fuite',
  }
}

/** Merge + cap (mirror snapshot ruins slice ~28). */
export function buildScarExport(
  tick: number,
  events: ScarEvent[],
  stressFrom: CrisisScarHint[] = [],
  maxEvents = 28,
): ScarExport {
  const seen = new Set<string>()
  const merged: ScarEvent[] = []
  for (const e of events) {
    if (seen.has(e.id)) continue
    seen.add(e.id)
    merged.push(e)
    if (merged.length >= maxEvents) break
  }
  return {
    tick,
    events: merged,
    stressFlags: stressFrom
      .filter((h) => h.famine || h.crisisPhase === 'crisis' || h.crisisPhase === 'collapse')
      .map((h) => ({
        villageId: h.villageId,
        x: h.x,
        y: h.y,
        famine: h.famine,
        crisisPhase: h.crisisPhase,
        intensity: clamp01((h.famine ? 0.5 : 0.3) + (h.prosperity < 20 ? 0.2 : 0)),
      })),
  }
}