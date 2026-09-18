/** Causal war module - stub entry; full impl follows. */
export type WarStatus = 'skirmish' | 'open' | 'ended'
export type WarCause = 'territory' | 'scarcity' | 'raid_revenge' | 'rivalry' | 'succession_spill'

export interface PolityWar {
  id: number
  aId: number
  bId: number
  cause: WarCause
  intensity: number
  heat: number
  startedTick: number
  lastBattleTick: number
  battles: number
  status: WarStatus
  winnerId: number | null
  endReason: string | null
  casualties: number
}

export type CoupRecord = {
  tick: number
  polityId: number
  polityName: string
  challengerName: string
  oustedName: string | null
  cause: string
}
