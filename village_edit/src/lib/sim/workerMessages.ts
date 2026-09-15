/**
 * Worker messages for sim control — shared types (main ↔ worker).
 */
import type { SimConfig, SimConfigInput } from './simConfig'

export type WorkerInMsg =
  | { type: 'start'; seed: number; config?: SimConfigInput }
  | { type: 'play'; playing: boolean }
  | { type: 'speed'; speed: number }
  | { type: 'reset'; seed: number; config?: SimConfigInput }
  | { type: 'select'; id: number | null }

export type { SimConfig, SimConfigInput }
