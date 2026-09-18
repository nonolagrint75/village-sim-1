/**
 * Player-panel truth packing - lean rows + causal readouts from live sim state.
 */
import { ensureBusinessBag, type BusinessKind } from './economy/business'
import { ensureCausalityCounters } from './causalityMetrics'
import { PROFESSION_LABELS, RESOURCE_LABELS_FR } from './labels'
import { politicsOf } from './politics'
import type { Profession, SimState, Villager } from './types'

export type UiFirmRow = {
  id: string
  kind: BusinessKind
  kindLabel: string
  ownerName: string
  workers: number
  failed: boolean
}

export type UiSettlementRow = {
  id: number
  label: string
  stage: string
  prosperity: number
  specialty: string
  specialtyLabel: string
  crisisPhase: 'stable' | 'crisis' | 'collapse' | 'rebuild'
  crisisLabel: string
  rebuildProgress: number
  laborBalance: number
  laborHint: string
  hasMine: boolean
  hasMill: boolean
  hasMarket: boolean
  hasPort: boolean
  population: number
}

export type UiCausalReadout = {
  id: string
  chain: string
  detail: string
}

const FIRM_KIND_FR: Record<BusinessKind, string> = {
  farm: 'ferme',
  mill: 'moulin',
  forge: 'forge / mine',
  bakery: 'fournil',
  workshop: 'atelier',
  trade: 'negoce',
  other: 'activite',
}

const SPECIALTY_FR: Record<string, string> = {
  forest: 'bois',
  grain: 'grain',
  shore: 'rivage',
  mine: 'mine',
  mixed: 'mixte',
}

const CRISIS_FR: Record<string, string> = {
  stable: 'stable',
  crisis: 'crise',
  collapse: 'effondrement',
  rebuild: 'reconstruction',
}

function villagerName(v: Villager | undefined, id: number): string {
  if (!v) return '#' + id
  const sur = v.surname?.trim()
  return sur ? v.name + ' ' + sur : v.name || '#' + id
}

export function packFirmRows(state: SimState, limit = 12): UiFirmRow[] {
  const bag = ensureBusinessBag(state)
  const byId = new Map(state.villagers.map((v) => [v.id, v]))
  const active = bag.filter((b) => !b.failed)
  const failed = bag.filter((b) => b.failed)
  const pick = [...active.slice(-limit), ...failed.slice(-Math.max(0, 4 - Math.min(4, active.length)))]
  return pick.slice(0, limit).map((b) => ({
    id: b.id,
    kind: b.kind,
    kindLabel: FIRM_KIND_FR[b.kind] ?? b.kind,
    ownerName: villagerName(byId.get(b.ownerId), b.ownerId),
    workers: b.workerIds?.length ?? 0,
    failed: !!b.failed,
  }))
}

export function packSettlementRows(state: SimState, limit = 14): UiSettlementRow[] {
  const popByVg = new Map<number, number>()
  for (const v of state.villagers) {
    if (!v.alive || v.villageId == null) continue
    popByVg.set(v.villageId, (popByVg.get(v.villageId) ?? 0) + 1)
  }
  const rows: UiSettlementRow[] = state.villages.map((vg) => {
    const labor = vg.laborBalance ?? 0
    const crisis = (vg.crisisPhase ?? 'stable') as UiSettlementRow['crisisPhase']
    let laborHint = 'equilibre'
    if (labor > 1.2) laborHint = 'penurie de bras -> attire migrants'
    else if (labor < -1.2) laborHint = 'mains oisives -> pression / travaux'
    return {
      id: vg.id,
      label: 'Habitat n' + String.fromCharCode(176) + vg.id,
      stage: vg.settlementStage ?? 'village',
      prosperity: Math.round(Number.isFinite(vg.prosperity) ? vg.prosperity : 40),
      specialty: vg.specialty ?? 'mixed',
      specialtyLabel: SPECIALTY_FR[vg.specialty ?? 'mixed'] ?? vg.specialty ?? 'mixte',
      crisisPhase: crisis,
      crisisLabel: CRISIS_FR[crisis] ?? crisis,
      rebuildProgress: Math.max(0, Math.min(1, vg.rebuildProgress ?? 0)),
      laborBalance: Math.round(labor * 10) / 10,
      laborHint,
      hasMine: !!vg.hasMine,
      hasMill: !!vg.hasMill,
      hasMarket: !!vg.hasMarket,
      hasPort: !!vg.hasPort,
      population: popByVg.get(vg.id) ?? 0,
    }
  })
  rows.sort((a, b) => b.prosperity - a.prosperity || b.population - a.population)
  return rows.slice(0, limit)
}

export function packCrisisCounts(state: SimState): Record<string, number> {
  const out: Record<string, number> = { stable: 0, crisis: 0, collapse: 0, rebuild: 0 }
  for (const vg of state.villages) {
    const p = vg.crisisPhase ?? 'stable'
    out[p] = (out[p] ?? 0) + 1
  }
  return out
}

export function packCausalReadouts(state: SimState): UiCausalReadout[] {
  const out: UiCausalReadout[] = []
  const c = ensureCausalityCounters(state)
  if (state.famine) {
    out.push({ id: 'famine-norms', chain: 'Famine -> societe', detail: 'Greniers vides - normes, rumeurs et rivalites sous pression.' })
  }
  if (c.foodHarvestProduces > 0 && (c.foodGrindConsumes > 0 || c.foodBakeConsumes > 0)) {
    out.push({
      id: 'food-chain',
      chain: 'Recolte -> pain',
      detail: 'Recoltes ' + c.foodHarvestProduces + ' · mouture ' + c.foodGrindConsumes + ' · four ' + c.foodBakeConsumes + ' · repas ' + c.foodEatConsequences + '.',
    })
  }
  if (c.priceDeltaEvents > 0 && (c.priceProfessionShifts > 0 || c.priceTaskShifts > 0)) {
    const samples = (c.priceChainSamples ?? [])
      .filter((s) => s.stage === 'professionShift' && s.prevProfession && s.nextProfession)
      .slice(-3)
    const sampleBits = samples
      .map((s) => {
        const prev = PROFESSION_LABELS[s.prevProfession as Profession] ?? s.prevProfession
        const next = PROFESSION_LABELS[s.nextProfession as Profession] ?? s.nextProfession
        const res = s.resource ? RESOURCE_LABELS_FR[s.resource] ?? s.resource : null
        return res ? prev + '->' + next + ' (' + res + ')' : prev + '->' + next
      })
      .filter(Boolean)
    out.push({
      id: 'price-jobs',
      chain: 'Prix -> metiers',
      detail:
        c.priceDeltaEvents +
        ' variations de cours · ' +
        c.priceProfessionShifts +
        ' changements de metier' +
        (c.priceTaskShifts > 0 ? ' · ' + c.priceTaskShifts + ' reorientations' : '') +
        (sampleBits.length ? ' - ' + sampleBits.join(' · ') : ''),
    })
  } else if (c.priceDeltaEvents > 0) {
    out.push({ id: 'price-delta', chain: 'Marche', detail: c.priceDeltaEvents + ' variations de prix observees.' })
  }
  if (c.teachEvents > 0 && c.teachTrueLaterUses > 0) {
    out.push({
      id: 'teach-practice',
      chain: 'Enseignement -> pratique',
      detail: c.teachEvents + ' enseignements · ' + c.teachTrueLaterUses + ' reprises productives.',
    })
  }
  if (c.migrateLeaves > 0 || c.migrateFoundCamps > 0) {
    const leaveCauses = state.migrationCounters?.leavesByCause ?? {}
    const topCause = Object.entries(leaveCauses).sort((a, b) => b[1] - a[1])[0]
    out.push({
      id: 'migrate',
      chain: 'Pression -> depart',
      detail:
        c.migrateLeaves +
        ' departs' +
        (c.migrateFoundCamps > 0 ? ' · ' + c.migrateFoundCamps + ' camps' : '') +
        (c.migrateRejoins > 0 ? ' · ' + c.migrateRejoins + ' retours' : '') +
        (topCause ? ' - ' + topCause[0] + ' (' + topCause[1] + ')' : ''),
    })
  }
  if (c.creedChanges > 0 && c.creedFollowups > 0) {
    out.push({
      id: 'creed-behavior',
      chain: 'Foi -> comportement',
      detail: c.creedChanges + ' conversions · ' + c.creedFollowups + ' suivis.',
    })
  }
  if (c.helpEvents > 0 && c.helpOutcomes > 0) {
    out.push({
      id: 'help',
      chain: 'Entraide -> effet',
      detail: c.helpEvents + " actes d'aide · " + c.helpOutcomes + ' aboutis.',
    })
  }
  if (c.familyDecisionUses > 0) {
    out.push({ id: 'kin-decision', chain: 'Parente -> decision', detail: c.familyDecisionUses + ' choix kin.' })
  }
  const married = state.marriageFormedCount ?? 0
  const alliances = state.familyAllianceCount ?? 0
  if (alliances > 0 || married > 0 || state.milestones?.firstMarriage) {
    out.push({
      id: 'marriage-alliance',
      chain: 'Mariage -> alliance',
      detail:
        married +
        ' unions formees · ' +
        alliances +
        ' alliances de familles' +
        (state.milestones?.firstMarriage ? ' · premier mariage' : ''),
    })
  }
  const alliance3 = Math.max(
    state.allianceVsThirdCount ?? 0,
    state.societyCounters?.conflictsByCause?.alliance_vs_third ?? 0,
  )
  const warBattles = (state.wars ?? []).reduce((n, w) => n + (w.battles ?? 0), 0)
  const costlyPeace =
    (state.costlyPeaceCount ?? 0) +
    (state.wars ?? []).filter(
      (w) => w.status === 'ended' && /trop couteuse|epuisement/i.test(String(w.endReason ?? '')),
    ).length
  if (alliance3 > 0) {
    out.push({
      id: 'alliance-vs-third',
      chain: 'Menace -> alliance',
      detail: alliance3 + ' alliances vs une menace commune (S34).',
    })
  }
  if ((state.deaths ?? 0) >= 1 && warBattles > 0) {
    out.push({
      id: 'war-deaths',
      chain: 'Guerre -> morts',
      detail: (state.deaths ?? 0) + ' morts · ' + warBattles + ' batailles (S37).',
    })
  }
  if (costlyPeace > 0) {
    out.push({
      id: 'costly-peace',
      chain: 'Guerre -> paix couteuse',
      detail: costlyPeace + ' paix trop couteuses / epuisements (S40).',
    })
  }
  for (const vg of state.villages) {
    const phase = vg.crisisPhase
    if (!phase || phase === 'stable') continue
    const label = CRISIS_FR[phase] ?? phase
    const rebuild =
      phase === 'rebuild' && (vg.rebuildProgress ?? 0) > 0
        ? ' · reconstr. ' + Math.round((vg.rebuildProgress ?? 0) * 100) + ' %'
        : ''
    out.push({
      id: 'crisis-' + vg.id,
      chain: 'Habitat n' + String.fromCharCode(176) + vg.id + ' -> ' + label,
      detail: 'Prosperite ' + Math.round(vg.prosperity ?? 0) + rebuild,
    })
    if (out.length >= 10) break
  }
  const wars = state.wars ?? []
  const open = wars.filter((w) => w.status === 'open' || w.status === 'skirmish')
  if (open.length > 0) {
    const w = open[0]
    out.push({
      id: 'war-' + w.id,
      chain: 'Rivalite -> guerre',
      detail: (w.cause || 'conflit') + ' · intensite ' + Math.round((w.intensity ?? 0) * 100) + ' % · ' + (w.battles ?? 0) + ' batailles',
    })
  }
  const firmFails = state.firmFailCount ?? 0
  const firmHires = state.firmHireCount ?? 0
  if (firmHires > 0 || firmFails > 0) {
    out.push({
      id: 'firms',
      chain: 'Firme -> emploi / faillite',
      detail: firmHires + ' embauches · ' + firmFails + ' faillites',
    })
  }
  return out.slice(0, 12)
}

export function countMines(state: SimState): number {
  let n = 0
  for (const vg of state.villages) if (vg.hasMine) n++
  return n
}

export function countTradeRoutes(state: SimState): number {
  return state.tradeRoutes?.size ?? 0
}

export function countKnownDeposits(state: SimState): number {
  return state.economyDeposits?.length ?? 0
}

export function countMigrating(state: SimState): number {
  let n = 0
  for (const v of state.villagers) {
    if (!v.alive) continue
    try {
      if (politicsOf(v).migrationUrge > 0.7) n++
    } catch {
      /* politics bag missing */
    }
  }
  return n
}