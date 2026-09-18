/**
 * Activity tools (§20) — overlays / poses / progress cues from nature + character draw.
 * Prefer composing bank keys; held tools stay DF/RW readable silhouettes.
 */

export type ActivityZLayer = 'ground_cue' | 'agent_tool' | 'agent_pose' | 'progress_arc' | 'far_pip'

export interface ToolOverlayRecipe {
  family: string
  /** Nature keys for ground target cue (scar / produce). */
  targetCueKeys: string[]
  /** Held tool silhouette recipe (drawn in entity space, not atlas required). */
  held: {
    /** Color bias by toolTier. */
    wood: string
    stone: string
    iron: string
    /** Shape hint for integrator drawGearWeapon / drawTaskActivity. */
    shape: 'axe' | 'pick' | 'hoe' | 'hammer' | 'knife' | 'bundle'
  }
  /** Progress ring color. */
  arcColor: string
  zTool: ActivityZLayer
  zArc: ActivityZLayer
  notes: string
}

export const ACTIVITY_OVERLAYS: Record<string, ToolOverlayRecipe> = {
  farm: {
    family: 'farm',
    targetCueKeys: ['farmland_soft', 'wheat_2', 'wheat_4', 'hay'],
    held: { wood: '#6a5238', stone: '#8a8070', iron: '#b0b8c0', shape: 'hoe' },
    arcColor: 'rgba(200, 176, 80, 0.8)',
    zTool: 'agent_tool',
    zArc: 'progress_arc',
    notes: 'Target: farmland/wheat stage by progress; hoe swing toward field.',
  },
  smith: {
    family: 'smith',
    targetCueKeys: ['cobble', 'stone_block', 'ore_iron', 'plank_oak'],
    held: { wood: '#6a5238', stone: '#908878', iron: '#c0c8d0', shape: 'hammer' },
    arcColor: 'rgba(144, 104, 72, 0.85)',
    zTool: 'agent_tool',
    zArc: 'progress_arc',
    notes: 'Anvil cue = cobble+plank; sparks optional at target_hit intensity.',
  },
  chop: {
    family: 'chop',
    targetCueKeys: ['tree_stump', 'fallen_log', 'leaves_oak'],
    held: { wood: '#5a4030', stone: '#7a7060', iron: '#a8b0b8', shape: 'axe' },
    arcColor: 'rgba(74, 122, 56, 0.8)',
    zTool: 'agent_tool',
    zArc: 'progress_arc',
    notes: 'Progress→stump appears at target; wood chips = pebbles flecks.',
  },
  mine: {
    family: 'mine',
    targetCueKeys: ['mountain_face', 'pebbles', 'ore_iron', 'ore_gold', 'rock'],
    held: { wood: '#6a5238', stone: '#a0a090', iron: '#c87840', shape: 'pick' },
    arcColor: 'rgba(168, 160, 144, 0.85)',
    zTool: 'agent_tool',
    zArc: 'progress_arc',
    notes: 'Face scar scales with progress; align with mines_ore pack mouths.',
  },
  craft: {
    family: 'craft',
    targetCueKeys: ['plank_oak', 'hay', 'fallen_log'],
    held: { wood: '#6a5238', stone: '#8a8070', iron: '#b0b8c0', shape: 'knife' },
    arcColor: 'rgba(144, 104, 72, 0.8)',
    zTool: 'agent_tool',
    zArc: 'progress_arc',
    notes: 'Workbench underlay plank; knife/bundle by craftGoods vs weave.',
  },
  build: {
    family: 'build',
    targetCueKeys: ['plank_oak', 'plank_pine', 'cobble', 'brick_mud'],
    held: { wood: '#6a5238', stone: '#8a8070', iron: '#b0b8c0', shape: 'hammer' },
    arcColor: 'rgba(138, 104, 64, 0.8)',
    zTool: 'agent_tool',
    zArc: 'progress_arc',
    notes: 'Reuse ActorScaffold progress; tool matches buildWall vs furniture.',
  },
  haul: {
    family: 'haul',
    targetCueKeys: ['hay', 'fallen_log', 'dirt_dark'],
    held: { wood: '#7a6040', stone: '#7a6040', iron: '#7a6040', shape: 'bundle' },
    arcColor: 'rgba(122, 96, 64, 0.75)',
    zTool: 'agent_tool',
    zArc: 'progress_arc',
    notes: 'Bundle on back; thin arc only while moving to target.',
  },
}

/** Progress cue geometry for drawTaskActivity upgrade. */
export function progressArcAngles(progress: number): { start: number; end: number } {
  const start = Math.PI * 1.15
  const span = Math.PI * 0.7 * Math.max(0.08, Math.min(1, progress))
  return { start, end: start + span }
}

export const ACTIVITY_DRAW_PSEUDO = {
  farZoom: '1×1 tool fleck + activity pip (existing entityArt simple path)',
  midZoom: 'held overlay + partial progress arc from progressArcAngles',
  nearZoom: 'FR label + full arc + target cue blit at (targetX,targetY)',
  zOrder: 'agent body → held tool → progress_arc above head → target cue on ground_item layer',
}
