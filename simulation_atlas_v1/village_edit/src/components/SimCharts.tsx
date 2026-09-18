import { memo, useId, useMemo } from 'react'
import type { TelemetryPoint } from '@/lib/sim/runTelemetry'

type SeriesDef = {
  key: keyof TelemetryPoint
  label: string
  color: string
}

type ChartCardProps = {
  title: string
  hint?: string
  points: TelemetryPoint[]
  series: SeriesDef[]
  height?: number
}

function extent(vals: number[]): { min: number; max: number } {
  let min = Infinity
  let max = -Infinity
  for (const v of vals) {
    if (!Number.isFinite(v)) continue
    if (v < min) min = v
    if (v > max) max = v
  }
  if (!Number.isFinite(min) || !Number.isFinite(max)) return { min: 0, max: 1 }
  if (min === max) return { min: min - 1, max: max + 1 }
  const pad = (max - min) * 0.08
  return { min: min - pad, max: max + pad }
}

function pathFor(
  points: TelemetryPoint[],
  key: keyof TelemetryPoint,
  w: number,
  h: number,
  xMin: number,
  xMax: number,
  yMin: number,
  yMax: number,
): string {
  if (points.length === 0) return ''
  const xSpan = Math.max(1e-6, xMax - xMin)
  const ySpan = Math.max(1e-6, yMax - yMin)
  let d = ''
  for (let i = 0; i < points.length; i++) {
    const p = points[i]!
    const raw = p[key]
    const yv = typeof raw === 'number' ? raw : 0
    const x = ((p.day - xMin) / xSpan) * w
    const y = h - ((yv - yMin) / ySpan) * h
    d += `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`
  }
  return d
}

export const LiveChart = memo(function LiveChart({ title, hint, points, series, height = 112 }: ChartCardProps) {
  const gid = useId().replace(/:/g, '')
  const { paths, yMin, yMax, xMin, xMax, latest } = useMemo(() => {
    const xs = points.map((p) => p.day)
    const xE = extent(xs.length ? xs : [0, 1])
    const allY: number[] = []
    for (const s of series) {
      for (const p of points) {
        const v = p[s.key]
        if (typeof v === 'number') allY.push(v)
      }
    }
    const yE = extent(allY.length ? allY : [0, 1])
    const w = 280
    const h = height - 8
    const paths = series.map((s) => ({
      ...s,
      d: pathFor(points, s.key, w, h, xE.min, xE.max, yE.min, yE.max),
    }))
    const last = points[points.length - 1]
    const latest = series.map((s) => {
      const v = last ? last[s.key] : 0
      return { label: s.label, color: s.color, value: typeof v === 'number' ? v : 0 }
    })
    return { paths, yMin: yE.min, yMax: yE.max, xMin: xE.min, xMax: xE.max, latest }
  }, [points, series, height])

  const w = 280
  const h = height - 8

  return (
    <article className="sim-chart">
      <header className="sim-chart-head">
        <h4>{title}</h4>
        {hint ? <p>{hint}</p> : null}
      </header>
      <svg className="sim-chart-svg" viewBox={`0 0 ${w} ${height}`} role="img" aria-label={title}>
        <defs>
          <linearGradient id={`g-${gid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(214,196,140,0.14)" />
            <stop offset="100%" stopColor="rgba(214,196,140,0)" />
          </linearGradient>
        </defs>
        <rect x="0" y="0" width={w} height={h} fill={`url(#g-${gid})`} rx="4" />
        {[0.25, 0.5, 0.75].map((t) => (
          <line
            key={t}
            x1="0"
            x2={w}
            y1={h * t}
            y2={h * t}
            stroke="rgba(236,231,214,0.08)"
            strokeWidth="1"
          />
        ))}
        {paths.map((p) =>
          p.d ? (
            <path key={p.key} d={p.d} fill="none" stroke={p.color} strokeWidth="1.75" strokeLinejoin="round" strokeLinecap="round" />
          ) : null,
        )}
        <text x="4" y={h - 2} className="sim-chart-axis">
          j{Math.round(xMin)}
        </text>
        <text x={w - 4} y={h - 2} textAnchor="end" className="sim-chart-axis">
          j{Math.round(xMax)}
        </text>
        <text x="4" y="10" className="sim-chart-axis">
          {formatVal(yMax)}
        </text>
        <text x="4" y={h - 12} className="sim-chart-axis">
          {formatVal(yMin)}
        </text>
      </svg>
      <ul className="sim-chart-legend">
        {latest.map((row) => (
          <li key={row.label}>
            <i style={{ background: row.color }} />
            <span>{row.label}</span>
            <strong>{formatVal(row.value)}</strong>
          </li>
        ))}
      </ul>
    </article>
  )
})

function formatVal(v: number): string {
  if (!Number.isFinite(v)) return '—'
  if (Math.abs(v) >= 100) return String(Math.round(v))
  if (Math.abs(v) >= 10) return v.toFixed(1)
  return v.toFixed(2)
}

export const AtlasCharts = memo(function AtlasCharts({ points }: { points: TelemetryPoint[] }) {
  if (points.length < 2) {
    return <p className="sim-empty">Les courbes s’animent dès que la simulation avance d’un jour.</p>
  }
  return (
    <div className="sim-atlas">
      <LiveChart
        title="Population"
        hint="Peuple vivant, naissances et morts cumulées"
        points={points}
        series={[
          { key: 'villagers', label: 'Vivants', color: '#c4d6a0' },
          { key: 'births', label: 'Naissances', color: '#7eb8a0' },
          { key: 'deaths', label: 'Morts', color: '#c47a6a' },
        ]}
      />
      <LiveChart
        title="Survie"
        hint="Faim / soif moyennes et réserve comestible"
        points={points}
        series={[
          { key: 'avgHunger', label: 'Faim ⌀', color: '#d4a574' },
          { key: 'avgThirst', label: 'Soif ⌀', color: '#7aa7c4' },
          { key: 'avgEdible', label: 'Réserve ⌀', color: '#a8c47a' },
          { key: 'homeless', label: 'Sans abri', color: '#b09070' },
        ]}
      />
      <LiveChart
        title="Prospérité"
        hint="Pain, pièces, famine (0/1)"
        points={points}
        series={[
          { key: 'totalBread', label: 'Pain', color: '#d6c48c' },
          { key: 'totalCoins', label: 'Pièces', color: '#e0c060' },
          { key: 'famine', label: 'Famine', color: '#a05040' },
        ]}
      />
      <LiveChart
        title="Développement"
        hint="Maisons, champs, moulins, puits, feux"
        points={points}
        series={[
          { key: 'houses', label: 'Maisons', color: '#c4b27a' },
          { key: 'fields', label: 'Champs', color: '#8fa86a' },
          { key: 'mills', label: 'Moulins', color: '#9a8a6a' },
          { key: 'wells', label: 'Puits', color: '#6a9ab0' },
          { key: 'plazaFires', label: 'Feux', color: '#d08050' },
        ]}
      />
      <LiveChart
        title="Infrastructures"
        hint="Routes, ponts, ports"
        points={points}
        series={[
          { key: 'roadTiles', label: 'Routes', color: '#8a8070' },
          { key: 'bridges', label: 'Ponts', color: '#706858' },
          { key: 'ports', label: 'Ports', color: '#5a7a90' },
        ]}
      />
      <LiveChart
        title="Société & menace"
        hint="Cercles, institutions, amitiés / rancunes, loups"
        points={points}
        series={[
          { key: 'circles', label: 'Cercles', color: '#a090c0' },
          { key: 'institutions', label: 'Institutions', color: '#8090b0' },
          { key: 'friendships', label: 'Amitiés', color: '#70a888' },
          { key: 'feuds', label: 'Rancunes', color: '#b07070' },
          { key: 'wolves', label: 'Loups', color: '#606870' },
        ]}
      />
      <LiveChart
        title="Marché"
        hint="Prix alimentaires / bois"
        points={points}
        series={[
          { key: 'foodPrice', label: 'Nourriture', color: '#c4a060' },
          { key: 'woodPrice', label: 'Bois', color: '#8a7050' },
        ]}
      />
    </div>
  )
})
