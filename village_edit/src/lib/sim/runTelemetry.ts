/**
 * Live telemetry + archived run logs (last 3 sims).
 * Series feed the Atlas charts; archives go to localStorage + /__sim_archive (dev).
 */

import type { SimStats } from './types'

export type TelemetryPoint = {
  /** Sim day index (year-1)*360 + dayOfYear, approx. */
  day: number
  tick: number
  year: number
  villagers: number
  births: number
  deaths: number
  houses: number
  fields: number
  mills: number
  wells: number
  plazaFires: number
  roadTiles: number
  bridges: number
  ports: number
  totalCoins: number
  totalBread: number
  wolves: number
  sheep: number
  circles: number
  institutions: number
  friendships: number
  feuds: number
  famine: number
  avgHunger: number
  avgThirst: number
  avgEdible: number
  homeless: number
  foodPrice: number
  woodPrice: number
}

export type RunCauseBucket = Record<string, number>

export type SimRunArchive = {
  id: string
  seed: number
  startedAt: string
  endedAt: string
  endReason: 'reset' | 'relaunch' | 'unload'
  summary: {
    days: number
    years: number
    maxPop: number
    finalPop: number
    births: number
    deaths: number
    houses: number
    wells: number
    mills: number
    plazaFires: number
    famineDays: number
    causes: RunCauseBucket
  }
  series: TelemetryPoint[]
  chronicleTail: string[]
}

const STORAGE_KEY = 'village-sim-run-archives-v1'
const MAX_ARCHIVES = 3
const MAX_SERIES = 480
const MAX_CHRONICLE_TAIL = 100

/** In-flight run sampler (main thread). */
export type LiveRunRecorder = {
  seed: number
  startedAt: string
  series: TelemetryPoint[]
  chronicleTail: string[]
  lastDay: number
  maxPop: number
  famineDays: number
}

export function createLiveRecorder(seed: number): LiveRunRecorder {
  return {
    seed,
    startedAt: new Date().toISOString(),
    series: [],
    chronicleTail: [],
    lastDay: -1,
    maxPop: 0,
    famineDays: 0,
  }
}

export function dayIndexOf(stats: SimStats): number {
  const y = Math.max(1, stats.calendar?.year ?? stats.year ?? 1)
  const d = Math.max(1, stats.calendar?.dayOfYear ?? 1)
  return (y - 1) * 360 + d
}

export function samplePoint(stats: SimStats): TelemetryPoint {
  return {
    day: dayIndexOf(stats),
    tick: stats.tick,
    year: stats.calendar?.year ?? stats.year,
    villagers: stats.villagers,
    births: stats.births,
    deaths: stats.deaths,
    houses: stats.houses,
    fields: stats.fields,
    mills: stats.mills,
    wells: stats.wells ?? 0,
    plazaFires: stats.plazaFires ?? 0,
    roadTiles: stats.roadTiles,
    bridges: stats.bridges,
    ports: stats.ports,
    totalCoins: stats.totalCoins,
    totalBread: stats.totalBread,
    wolves: stats.wolves,
    sheep: stats.sheep,
    circles: stats.circles,
    institutions: stats.institutions,
    friendships: stats.friendships,
    feuds: stats.feuds,
    famine: stats.famine ? 1 : 0,
    avgHunger: stats.avgHunger ?? 0,
    avgThirst: stats.avgThirst ?? 0,
    avgEdible: stats.avgEdible ?? 0,
    homeless: stats.homeless ?? 0,
    foodPrice: num(stats.prices?.food ?? stats.prices?.bread ?? 0),
    woodPrice: num(stats.prices?.wood ?? 0),
  }
}

function num(v: unknown): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : 0
}

/** Sample at most once per sim-day (keeps charts readable at high speed). */
export function pushSample(rec: LiveRunRecorder, stats: SimStats, chronicle: string[]): void {
  const day = dayIndexOf(stats)
  if (day === rec.lastDay && rec.series.length > 0) {
    // Still refresh chronicle tail while same day.
    if (chronicle.length) rec.chronicleTail = chronicle.slice(0, MAX_CHRONICLE_TAIL)
    return
  }
  rec.lastDay = day
  const pt = samplePoint(stats)
  rec.series.push(pt)
  if (rec.series.length > MAX_SERIES) rec.series.splice(0, rec.series.length - MAX_SERIES)
  rec.maxPop = Math.max(rec.maxPop, pt.villagers)
  if (pt.famine) rec.famineDays += 1
  if (chronicle.length) rec.chronicleTail = chronicle.slice(0, MAX_CHRONICLE_TAIL)
}

export function inferDeathCauses(lines: string[]): RunCauseBucket {
  const causes: RunCauseBucket = {}
  const bump = (k: string) => {
    causes[k] = (causes[k] ?? 0) + 1
  }
  for (const line of lines) {
    const t = line.toLowerCase()
    if (/meurt de soif|mort de soif/.test(t)) bump('soif')
    else if (/meurt de froid|hypotherm/.test(t)) bump('froid')
    else if (/est mort de faim|meurt de faim|mort de faim/.test(t)) bump('faim')
    else if (/loup|dévor/.test(t)) bump('loup')
    else if (/vieillesse/.test(t)) bump('vieillesse')
    else if (/chaleur|succombe à la chaleur/.test(t)) bump('chaleur')
    else if (/maladie|succombe à la maladie/.test(t)) bump('maladie')
    else if (/mort|meurt/.test(t)) bump('autre')
  }
  return causes
}

export function finalizeArchive(
  rec: LiveRunRecorder,
  endReason: SimRunArchive['endReason'],
  lastStats?: SimStats | null,
): SimRunArchive {
  const last = lastStats ? samplePoint(lastStats) : rec.series[rec.series.length - 1]
  const days = last?.day ?? 0
  return {
    id: `run_${rec.seed}_${Date.now().toString(36)}`,
    seed: rec.seed,
    startedAt: rec.startedAt,
    endedAt: new Date().toISOString(),
    endReason,
    summary: {
      days,
      years: Math.max(0, days / 360),
      maxPop: rec.maxPop,
      finalPop: last?.villagers ?? 0,
      births: last?.births ?? 0,
      deaths: last?.deaths ?? 0,
      houses: last?.houses ?? 0,
      wells: last?.wells ?? 0,
      mills: last?.mills ?? 0,
      plazaFires: last?.plazaFires ?? 0,
      famineDays: rec.famineDays,
      causes: inferDeathCauses(rec.chronicleTail),
    },
    series: rec.series.slice(),
    chronicleTail: rec.chronicleTail.slice(0, MAX_CHRONICLE_TAIL),
  }
}

export function loadArchives(): SimRunArchive[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as SimRunArchive[]
    return Array.isArray(parsed) ? parsed.slice(0, MAX_ARCHIVES) : []
  } catch {
    return []
  }
}

export function saveArchives(list: SimRunArchive[]): void {
  const trimmed = list.slice(0, MAX_ARCHIVES)
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed))
  } catch {
    /* quota */
  }
}

/** Push newest archive, keep 3, persist + POST to vite middleware for disk. */
export function commitArchive(archive: SimRunArchive): SimRunArchive[] {
  const next = [archive, ...loadArchives().filter((a) => a.id !== archive.id)].slice(0, MAX_ARCHIVES)
  saveArchives(next)
  void postArchiveToDisk(archive, next)
  return next
}

async function postArchiveToDisk(archive: SimRunArchive, index: SimRunArchive[]): Promise<void> {
  try {
    await fetch('/__sim_archive', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ archive, index }),
    })
  } catch {
    /* preview / electron packaged — localStorage still holds data */
  }
}

export function archivesSummaryText(list: SimRunArchive[]): string {
  if (!list.length) return 'Aucune simulation archivée.'
  return list
    .map((a, i) => {
      const s = a.summary
      const causes = Object.entries(s.causes)
        .sort((x, y) => y[1] - x[1])
        .map(([k, n]) => `${k}:${n}`)
        .join(' ')
      return `#${i + 1} seed=${a.seed} j${s.days} pop ${s.finalPop}/${s.maxPop} †${s.deaths} nés${s.births} maisons${s.houses} [${causes || '—'}]`
    })
    .join('\n')
}
