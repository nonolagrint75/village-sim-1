/**
 * Global workspace (Baars / Dehaene-lite): few items compete for broadcast.
 * Only broadcast contents strongly bias action selection — not every concern.
 * Competition is per-agent (personality/seed bias) — never a shared hive mind.
 */

import type { WorkingConcern, WorkingConcernKind } from './types'
import { MAX_WORKING, WORKSPACE_CAPACITY } from './types'

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v))
}

/**
 * Competition: urgency × novelty × affective gain × attentionBias → workspace.
 * attentionBias(kind) is agent-specific so two minds diverge in the same place.
 */
export function competeForWorkspace(
  concerns: WorkingConcern[],
  prevBroadcast: WorkingConcernKind[],
  attentionBias?: (kind: WorkingConcernKind) => number,
): WorkingConcern[] {
  if (concerns.length === 0) return []
  const scored = concerns.map((c) => {
    const novelty = prevBroadcast.includes(c.kind) ? 0.72 : 1
    const gain = 0.55 + c.urgency * 0.45
    const attn = attentionBias ? attentionBias(c.kind) : 1
    return { c, score: c.urgency * novelty * gain * attn }
  })
  scored.sort((a, b) => b.score - a.score)
  return scored.slice(0, WORKSPACE_CAPACITY).map((s) => s.c)
}

/** Cap working memory; drop weakest after competition. */
export function trimWorkingToCapacity(list: WorkingConcern[]): void {
  if (list.length <= MAX_WORKING) return
  list.sort((a, b) => a.urgency - b.urgency)
  while (list.length > MAX_WORKING) list.shift()
}

/**
 * Broadcast gain: only items currently in the global workspace amplify decisions.
 * Non-broadcast concerns contribute weakly (preconscious).
 */
export function workspaceBias(
  broadcast: WorkingConcern[],
  kind: WorkingConcernKind,
  subjectId: number | null = null,
): number {
  let best = 0
  for (const c of broadcast) {
    if (c.kind !== kind) continue
    if (subjectId !== null && c.subjectId !== null && c.subjectId !== subjectId) continue
    if (c.urgency > best) best = c.urgency
  }
  return best
}

/** Soft attention load 0–1 from how full / urgent the workspace is. */
export function workspaceLoad(broadcast: WorkingConcern[]): number {
  if (broadcast.length === 0) return 0
  let sum = 0
  for (const c of broadcast) sum += c.urgency
  return clamp01(sum / WORKSPACE_CAPACITY)
}
