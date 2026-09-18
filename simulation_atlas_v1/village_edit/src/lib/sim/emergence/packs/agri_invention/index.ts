/**
 * Staging pack: agri_invention (Lio)
 * Isolated — integrator wires into fields yield, diffusion, firm hire.
 */

export type ActorId = number
export type VillageId = number
export type FirmId = number
export type InventionId = string

export type AgriLifeTag = 'Lio' | 'generic'

export type AgriPhase =
  | 'latent'
  | 'invented'
  | 'local_boost'
  | 'diffused'
  | 'regional'
  | 'firm'

export type AgriEventKind =
  | 'farm_tool_invent'
  | 'agri_boost'
  | 'diffusion'
  | 'regional_enrich'
  | 'firm_hire'

export interface AgriEvent {
  kind: AgriEventKind
  tick: number
  inventionId: InventionId
  actorId?: ActorId
  villageId?: VillageId
  amount?: number
  note?: string
}

export interface InventorProfile {
  actorId: ActorId
  villageId: VillageId
  lifeTag: AgriLifeTag
  curiosity: number
  farmSkill: number
  toolPractice: number
}

export interface AgriInvention {
  id: InventionId
  phase: AgriPhase
  inventorId: ActorId
  originVillageId: VillageId
  toolTag: string
  inventedTick: number
  localBoost: number
  adoptedVillageIds: VillageId[]
  regionalEnrich: number
  firmId: FirmId | null
  hiredCount: number
  events: AgriEvent[]
}

export interface AgriTickContext {
  tick: number
  roll: number
  neighborVillageIds?: VillageId[]
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v))
}

function pushEvent(inv: AgriInvention, ev: AgriEvent, cap = 48): void {
  inv.events.push(ev)
  while (inv.events.length > cap) inv.events.shift()
}

export function createInventionId(actorId: ActorId, tick: number): InventionId {
  return `agri:${actorId}:${tick}`
}

export function tryInventFarmTool(
  p: InventorProfile,
  tick: number,
  roll: number,
): AgriInvention | null {
  const score = p.curiosity * 0.4 + p.farmSkill * 0.3 + p.toolPractice * 0.3
  if (score < 0.45) return null
  if (roll > 0.45 + score * 0.4) return null
  const toolTag = `tool_${p.actorId % 17}`
  const inv: AgriInvention = {
    id: createInventionId(p.actorId, tick),
    phase: 'invented',
    inventorId: p.actorId,
    originVillageId: p.villageId,
    toolTag,
    inventedTick: tick,
    localBoost: 0,
    adoptedVillageIds: [p.villageId],
    regionalEnrich: 0,
    firmId: null,
    hiredCount: 0,
    events: [],
  }
  pushEvent(inv, {
    kind: 'farm_tool_invent',
    tick,
    inventionId: inv.id,
    actorId: p.actorId,
    villageId: p.villageId,
    note: toolTag,
  })
  return inv
}

export function applyLocalAgriBoost(inv: AgriInvention, tick: number): number {
  if (inv.phase === 'latent') return 0
  inv.localBoost = clamp01(Math.max(inv.localBoost, 0.12 + (tick - inv.inventedTick) * 0.0005))
  if (inv.phase === 'invented') inv.phase = 'local_boost'
  pushEvent(inv, {
    kind: 'agri_boost',
    tick,
    inventionId: inv.id,
    villageId: inv.originVillageId,
    amount: inv.localBoost,
  })
  return inv.localBoost
}

export function tryDiffuseInvention(
  inv: AgriInvention,
  neighborIds: VillageId[],
  tick: number,
  roll: number,
): number {
  if (inv.localBoost < 0.1) return 0
  let gained = 0
  for (const id of neighborIds) {
    if (inv.adoptedVillageIds.includes(id)) continue
    if (roll + inv.localBoost < 0.5) continue
    inv.adoptedVillageIds.push(id)
    gained++
  }
  if (gained > 0) {
    inv.phase = 'diffused'
    pushEvent(inv, {
      kind: 'diffusion',
      tick,
      inventionId: inv.id,
      amount: gained,
    })
  }
  return gained
}

export function tryRegionalEnrich(inv: AgriInvention, wealthHints: number[], tick: number): number {
  if (inv.adoptedVillageIds.length < 2) return inv.regionalEnrich
  const avg = wealthHints.reduce((a, b) => a + b, 0) / Math.max(1, wealthHints.length)
  inv.regionalEnrich = clamp01(inv.regionalEnrich + avg * 0.05 + inv.adoptedVillageIds.length * 0.03)
  inv.phase = 'regional'
  pushEvent(inv, {
    kind: 'regional_enrich',
    tick,
    inventionId: inv.id,
    amount: inv.regionalEnrich,
  })
  return inv.regionalEnrich
}

export function tryInventionFirmHire(
  inv: AgriInvention,
  firmId: FirmId,
  hires: number,
  tick: number,
): boolean {
  if (inv.phase !== 'diffused' && inv.phase !== 'regional' && inv.phase !== 'firm') return false
  if (hires <= 0) return false
  inv.firmId = firmId
  inv.hiredCount += hires
  inv.phase = 'firm'
  pushEvent(inv, {
    kind: 'firm_hire',
    tick,
    inventionId: inv.id,
    amount: hires,
    note: `firm ${firmId}`,
  })
  return true
}

export function tickAgriInvention(inv: AgriInvention, ctx: AgriTickContext): AgriInvention {
  const next: AgriInvention = {
    ...inv,
    adoptedVillageIds: [...inv.adoptedVillageIds],
    events: [...inv.events],
  }
  if (next.phase === 'invented' || next.phase === 'local_boost') {
    applyLocalAgriBoost(next, ctx.tick)
  }
  if (ctx.neighborVillageIds?.length) {
    tryDiffuseInvention(next, ctx.neighborVillageIds, ctx.tick, ctx.roll)
  }
  return next
}

export function agriInventionStats(inv: AgriInvention): {
  phase: AgriPhase
  localBoost: number
  adopted: number
  regionalEnrich: number
  hired: number
  events: number
} {
  return {
    phase: inv.phase,
    localBoost: inv.localBoost,
    adopted: inv.adoptedVillageIds.length,
    regionalEnrich: inv.regionalEnrich,
    hired: inv.hiredCount,
    events: inv.events.length,
  }
}