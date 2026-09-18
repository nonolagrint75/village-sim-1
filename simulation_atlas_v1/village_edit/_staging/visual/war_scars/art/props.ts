/**
 * War scar prop recipes — compose from nature / block atlas keys.
 * Staging only; integrator implements draw/blit. No live imports.
 */

import type { ScarEventKind } from '../logic/types'

export type ZLayer =
  | 'terrain'
  | 'scar_ground'
  | 'soft_plants'
  | 'rubble_base'
  | 'fortify_low'
  | 'carts'
  | 'fortify_high'
  | 'labels'
  | 'canopy'

export type AtlasKeyHint =
  | 'grass'
  | 'grass_dry'
  | 'farmland'
  | 'wheat_1'
  | 'dirt'
  | 'gravel'
  | 'oak_planks'
  | 'oak_log_side'
  | 'cobblestone'
  | 'cobblestone_mossy'
  | 'cobblestone_bricks'
  | 'hay_top'
  | 'hay_side'
  | 'tree_dead_0'

export interface PropPart {
  /** Atlas / procedural key hint (integrator resolves). */
  key: AtlasKeyHint
  /** Offset in cells from prop origin (foot of object). */
  dx: number
  dy: number
  /** Soft tint multiply 0–1 RGB factors (ash / scorch). */
  tint?: [number, number, number]
  alpha?: number
}

export interface ScarPropRecipe {
  id: string
  kind: ScarEventKind
  /** Cells occupied (complete object; may exceed 1×1). */
  footprintW: number
  footprintH: number
  z: ZLayer
  parts: PropPart[]
  /** Optional second layer for aged moss (ageDays > 8). */
  agedParts?: PropPart[]
  notes: string
}

export const SCAR_PROPS: ScarPropRecipe[] = [
  {
    id: 'burned_field_patch',
    kind: 'field_burned',
    footprintW: 2,
    footprintH: 2,
    z: 'scar_ground',
    parts: [
      { key: 'farmland', dx: 0, dy: 0, tint: [0.35, 0.28, 0.22], alpha: 0.95 },
      { key: 'farmland', dx: 1, dy: 0, tint: [0.32, 0.25, 0.2], alpha: 0.9 },
      { key: 'dirt', dx: 0, dy: 1, tint: [0.4, 0.3, 0.22], alpha: 0.85 },
      { key: 'wheat_1', dx: 1, dy: 1, tint: [0.25, 0.2, 0.15], alpha: 0.7 },
    ],
    notes: 'Trampled FIELD/WHEAT — continuous ash, not a fire emoji tile.',
  },
  {
    id: 'raid_scorch_wedge',
    kind: 'raid_scar',
    footprintW: 2,
    footprintH: 2,
    z: 'scar_ground',
    parts: [
      { key: 'dirt', dx: 0, dy: 1, tint: [0.28, 0.2, 0.16], alpha: 0.8 },
      { key: 'gravel', dx: 1, dy: 1, tint: [0.45, 0.35, 0.28], alpha: 0.55 },
      { key: 'oak_planks', dx: 0, dy: 0, tint: [0.4, 0.28, 0.18], alpha: 0.5 },
    ],
    notes: 'Matches settlementView raid wedge; keep soft edges.',
  },
  {
    id: 'battle_ash_ring',
    kind: 'battle_scar',
    footprintW: 3,
    footprintH: 3,
    z: 'scar_ground',
    parts: [
      { key: 'dirt', dx: 1, dy: 1, tint: [0.22, 0.12, 0.1], alpha: 0.85 },
      { key: 'gravel', dx: 0, dy: 2, tint: [0.4, 0.3, 0.25], alpha: 0.5 },
      { key: 'gravel', dx: 2, dy: 2, tint: [0.4, 0.3, 0.25], alpha: 0.5 },
      { key: 'hay_side', dx: 0, dy: 1, tint: [0.45, 0.35, 0.25], alpha: 0.45 },
      { key: 'hay_side', dx: 2, dy: 1, tint: [0.45, 0.35, 0.25], alpha: 0.4 },
    ],
    notes: 'Soft camp tents only at high intensity / zoom (logic intensity gate).',
  },
  {
    id: 'house_rubble',
    kind: 'house_ruined',
    footprintW: 2,
    footprintH: 2,
    z: 'rubble_base',
    parts: [
      { key: 'cobblestone', dx: 0, dy: 1, tint: [0.55, 0.5, 0.45], alpha: 0.9 },
      { key: 'cobblestone', dx: 1, dy: 1, tint: [0.5, 0.45, 0.4], alpha: 0.85 },
      { key: 'oak_planks', dx: 0, dy: 0, tint: [0.45, 0.35, 0.25], alpha: 0.75 },
      { key: 'oak_log_side', dx: 1, dy: 0, tint: [0.35, 0.28, 0.2], alpha: 0.7 },
    ],
    agedParts: [
      { key: 'cobblestone_mossy', dx: 0, dy: 1, tint: [0.45, 0.55, 0.4], alpha: 0.55 },
      { key: 'cobblestone_mossy', dx: 1, dy: 1, tint: [0.4, 0.5, 0.35], alpha: 0.45 },
    ],
    notes: 'ONE complete ruin silhouette — never two half-house cells.',
  },
  {
    id: 'clearing_ash',
    kind: 'clearing_scar',
    footprintW: 2,
    footprintH: 2,
    z: 'scar_ground',
    parts: [
      { key: 'dirt', dx: 0, dy: 0, tint: [0.5, 0.42, 0.32], alpha: 0.7 },
      { key: 'dirt', dx: 1, dy: 0, tint: [0.48, 0.4, 0.3], alpha: 0.65 },
      { key: 'gravel', dx: 0, dy: 1, alpha: 0.5 },
      { key: 'grass_dry', dx: 1, dy: 1, alpha: 0.4 },
    ],
    notes: 'Empty post-collapse clearing; no walls.',
  },
  {
    id: 'palisade_segment',
    kind: 'fortify_raised',
    footprintW: 1,
    footprintH: 2,
    z: 'fortify_low',
    parts: [
      { key: 'oak_log_side', dx: 0, dy: 1, alpha: 1 },
      { key: 'oak_log_side', dx: 0, dy: 0, tint: [0.85, 0.8, 0.7], alpha: 0.95 },
      { key: 'oak_planks', dx: 0, dy: 1, tint: [0.7, 0.6, 0.45], alpha: 0.5 },
    ],
    agedParts: [
      // stone upgrade path when wallTier === stone
      { key: 'cobblestone_bricks', dx: 0, dy: 1, alpha: 0.95 },
      { key: 'cobblestone_bricks', dx: 0, dy: 0, alpha: 0.9 },
    ],
    notes: 'Repeat along wall polyline from fortify footprint; keep posts whole.',
  },
  {
    id: 'refugee_cart',
    kind: 'refugee_depart',
    footprintW: 2,
    footprintH: 1,
    z: 'carts',
    parts: [
      { key: 'oak_planks', dx: 0, dy: 0, tint: [0.55, 0.42, 0.28], alpha: 0.95 },
      { key: 'oak_planks', dx: 1, dy: 0, tint: [0.5, 0.38, 0.25], alpha: 0.9 },
      { key: 'hay_top', dx: 0, dy: 0, tint: [0.7, 0.6, 0.35], alpha: 0.75 },
      { key: 'dirt', dx: 0, dy: 0, tint: [0.15, 0.12, 0.1], alpha: 0.5 },
      { key: 'dirt', dx: 1, dy: 0, tint: [0.15, 0.12, 0.1], alpha: 0.5 },
    ],
    notes: 'Complete 2×1 cart on road/trail edge; wheels = dark dirt discs in draw.',
  },
  {
    id: 'famine_haze_flag',
    kind: 'famine_stress',
    footprintW: 1,
    footprintH: 1,
    z: 'soft_plants',
    parts: [
      { key: 'wheat_1', dx: 0, dy: 0, tint: [0.65, 0.55, 0.35], alpha: 0.55 },
      { key: 'grass_dry', dx: 0, dy: 0, tint: [0.7, 0.65, 0.4], alpha: 0.35 },
    ],
    notes: 'Stress flag only — desaturate crops / soft haze. Never rubble.',
  },
]

export const PROP_BY_KIND: Record<ScarEventKind, string> = {
  field_burned: 'burned_field_patch',
  raid_scar: 'raid_scorch_wedge',
  battle_scar: 'battle_ash_ring',
  house_ruined: 'house_rubble',
  clearing_scar: 'clearing_ash',
  fortify_raised: 'palisade_segment',
  refugee_depart: 'refugee_cart',
  famine_stress: 'famine_haze_flag',
}

export function recipeForKind(kind: ScarEventKind): ScarPropRecipe | undefined {
  const id = PROP_BY_KIND[kind]
  return SCAR_PROPS.find((p) => p.id === id)
}