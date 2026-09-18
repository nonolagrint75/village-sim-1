/**
 * High-level causal tick API for life scenarios:
 * prospect → claim sticky mouth → extract → forge demand signal.
 */

import { refreshForgeDemand, type RefreshForgeOpts } from './forgeSignal'
import {
  claimMineMouth,
  knownMouthsFor,
  openMineMouth,
  villageMineFields,
  villageMouth,
  type ClaimMouthOpts,
} from './mouths'
import { extractAtMouth, type DigAtMouthOpts } from './extraction'
import { tryProspectVein, type ProspectOpts } from './richness'
import { drainEvents, peekEvents } from './events'
import type {
  DepositSample,
  ExtractionResult,
  ForgeDemandSignal,
  KnownMineMouth,
  MinesOreBag,
  MineVisualEvent,
  VeinKnowledge,
} from './types'
import { createMinesOreBag } from './types'

export interface MinesOreTickContext {
  tick: number
  samples: readonly DepositSample[]
  forge?: RefreshForgeOpts
}

export interface ProspectAndClaimOpts extends ProspectOpts {
  /** If discovery succeeds, immediately sticky-claim a mouth at the vein. */
  claimOnDiscover?: boolean
  padX?: number
  padY?: number
}

/**
 * Life-scenario helper: prospect; optionally claim sticky mouth on success.
 */
export function prospectAndMaybeClaim(
  bag: MinesOreBag,
  samples: readonly DepositSample[],
  opts: ProspectAndClaimOpts,
): { vein: VeinKnowledge | null; mouth: KnownMineMouth | null } {
  const vein = tryProspectVein(bag, samples, opts)
  if (!vein || !opts.claimOnDiscover) return { vein, mouth: null }
  const mouth = claimMineMouth(bag, {
    tick: opts.tick,
    actorId: opts.actorId,
    villageId: opts.villageId,
    x: opts.padX ?? vein.x,
    y: opts.padY ?? vein.y,
    mountainX: vein.x,
    mountainY: vein.y,
    samples,
    lifeTag: opts.lifeTag,
  })
  return { vein, mouth }
}

/**
 * Per-tick maintenance: refresh forge signals (does not dig).
 * Call after digs / economy tick; drain events for visual layer.
 */
export function tickMinesOre(
  bag: MinesOreBag,
  ctx: MinesOreTickContext,
): {
  forgeSignals: ForgeDemandSignal[]
  events: readonly MineVisualEvent[]
} {
  const forgeSignals = refreshForgeDemand(bag, {
    tick: ctx.tick,
    forges: ctx.forge?.forges,
    smithCountByVillage: ctx.forge?.smithCountByVillage,
  })
  return { forgeSignals, events: peekEvents(bag) }
}

export function digKnownMouth(
  bag: MinesOreBag,
  opts: DigAtMouthOpts,
): ExtractionResult | null {
  return extractAtMouth(bag, opts)
}

export function ensureBag(bag?: MinesOreBag | null): MinesOreBag {
  return bag ?? createMinesOreBag()
}

/** Bundle for life scenarios / tests. */
export const MinesOreLogic = {
  createBag: createMinesOreBag,
  ensureBag,
  prospect: tryProspectVein,
  prospectAndMaybeClaim,
  claim: claimMineMouth,
  open: openMineMouth,
  dig: extractAtMouth,
  digKnownMouth,
  tick: tickMinesOre,
  drainEvents,
  peekEvents,
  knownMouthsFor,
  villageMouth,
  villageMineFields,
} as const

export type { ClaimMouthOpts, DigAtMouthOpts, ProspectOpts, RefreshForgeOpts }