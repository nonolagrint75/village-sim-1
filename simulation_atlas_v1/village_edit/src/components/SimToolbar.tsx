import { memo } from 'react'
import { Button } from '@/components/ui/button'

const SPEED_OPTIONS = [1, 2, 4, 8, 0]

export type MapAnalysisMode =
  | 'off'
  | 'prosperity'
  | 'polity'
  | 'sacred'
  | 'credit'
  | 'bandit'
  | 'wool'
  | 'schism'
  | 'succession'

export const SimToolbar = memo(function SimToolbar({
  playing,
  speed,
  zoomLabel,
  fps,
  simTps,
  showDayNight,
  onShowDayNight,
  mapAnalysis,
  onMapAnalysis,
  onPlay,
  onSpeed,
  onZoomIn,
  onZoomOut,
  onRecenter,
  onReset,
}: {
  playing: boolean
  speed: number
  zoomLabel: number
  fps: number
  simTps: number
  showDayNight: boolean
  onShowDayNight: (v: boolean) => void
  mapAnalysis: MapAnalysisMode
  onMapAnalysis: (v: MapAnalysisMode) => void
  onPlay: () => void
  onSpeed: (n: number) => void
  onZoomIn: () => void
  onZoomOut: () => void
  onRecenter: () => void
  onReset: () => void
}) {
  const tpsOk = simTps >= 80
  const tpsWarn = simTps > 0 && simTps < 45
  return (
    <div className="sim-toolbar" role="toolbar" aria-label="Contrôles du monde">
      <span
        className="sim-atlas-badge"
        style={{
          fontSize: 11,
          fontWeight: 800,
          letterSpacing: 0.04,
          padding: '3px 10px',
          borderRadius: 4,
          background: '#0b2a4a',
          color: '#e8f3ff',
          border: '1px solid #5aa0e6',
          whiteSpace: 'nowrap',
          textTransform: 'uppercase',
        }}
        title="Simulation Atlas v1 — observation d’émergence causale (carte = état sim)"
      >
        Simulation Atlas v1
      </span>
      <Button size="sm" onClick={onPlay} aria-pressed={playing}>
        {playing ? 'Pause' : 'Lecture'}
      </Button>
      <div className="sim-speeds" aria-label="Vitesse du temps (accélère le calendrier)">
        {SPEED_OPTIONS.map((opt) => (
          <Button
            key={opt}
            size="sm"
            variant={speed === opt ? 'default' : 'outline'}
            onClick={() => onSpeed(opt)}
            title={
              opt === 0
                ? 'Max — cible ~100 ticks/s (LOD adaptatif, agents réels)'
                : `Accélère le temps ×${opt} (heures / jours plus rapides)`
            }
          >
            {opt === 0 ? 'Max≈100' : `×${opt}`}
          </Button>
        ))}
      </div>
      <Button size="sm" variant="outline" onClick={onZoomIn} title="Zoom avant — inspecter maisons / PNJ">
        Zoom +
      </Button>
      <Button size="sm" variant="outline" onClick={onZoomOut} title="Zoom arrière — lire le territoire">
        Zoom −
      </Button>
      <Button size="sm" variant="outline" onClick={onRecenter} title="Recentrer la carte">
        Recentrer
      </Button>
      <label
        className="sim-toolbar-check"
        title="Assombrissement de la carte selon l’heure. Le cycle sim (sommeil, température, activité) reste actif."
      >
        <input
          type="checkbox"
          checked={showDayNight}
          onChange={(e) => onShowDayNight(e.target.checked)}
        />
        <span>Afficher le cycle jour/nuit</span>
      </label>
      <label className="sim-toolbar-check" title="Overlays d’analyse (NONO §§59–63) — carte = vérité sim">
        <span>Analyse</span>
        <select
          value={mapAnalysis}
          onChange={(e) => onMapAnalysis(e.target.value as MapAnalysisMode)}
          style={{ marginLeft: 6, fontSize: 12, maxWidth: 110 }}
          aria-label="Overlay d’analyse carte"
        >
          <option value="off">off</option>
          <option value="prosperity">richesse</option>
          <option value="polity">politique</option>
          <option value="sacred">sacré</option>
          <option value="credit">crédit</option>
          <option value="bandit">brigands</option>
          <option value="wool">laine</option>
          <option value="schism">schisme</option>
          <option value="succession">succession</option>
        </select>
      </label>
      <span
        className="sim-perf"
        title="Zoom · images/s · ticks sim/s (cible Max ≈ 100). Cliquez un PNJ pour inspecter."
        style={{
          color: tpsOk ? '#9dcea8' : tpsWarn ? '#e0b060' : undefined,
          fontWeight: speed === 0 ? 700 : undefined,
        }}
      >
        ×{zoomLabel.toFixed(1)} · {fps} i/s · {simTps} ticks/s
        {speed === 0 ? ' /100' : ''}
      </span>
      <Button size="sm" variant="outline" onClick={onReset} title="Générer un nouveau monde">
        Nouveau monde
      </Button>
    </div>
  )
})
