import type { GuildEvent, GuildPad } from './types'

export function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v))
}

export function pushEvent(p: GuildPad, ev: GuildEvent, cap = 48): void {
  p.events.push(ev)
  while (p.events.length > cap) p.events.shift()
}

export function suggestedGuildName(kind: GuildPad['kind']): string {
  if (kind === 'textile') return 'guilde des tisserands'
  if (kind === 'art') return 'guilde des arts'
  if (kind === 'trade') return 'guilde des marchands'
  return 'guilde des artisans'
}