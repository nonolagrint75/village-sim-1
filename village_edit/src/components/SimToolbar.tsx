import { memo } from 'react'
import { Button } from '@/components/ui/button'

const SPEED_OPTIONS = [1, 2, 4, 8, 0]

export const SimToolbar = memo(function SimToolbar({
  playing,
  speed,
  zoomLabel,
  fps,
  simTps,
  showDayNight,
  onShowDayNight,
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
  onPlay: () => void
  onSpeed: (n: number) => void
  onZoomIn: () => void
  onZoomOut: () => void
  onRecenter: () => void
  onReset: () => void
}) {
  return (
    <div className="sim-toolbar" role="toolbar" aria-label="Contrôles du monde">
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
                ? 'Accélère le temps au maximum (CPU)'
                : `Accélère le temps ×${opt} (heures / jours plus rapides)`
            }
          >
            {opt === 0 ? 'Max' : `×${opt}`}
          </Button>
        ))}
      </div>
      <Button size="sm" variant="outline" onClick={onZoomIn} title="Zoom avant">
        Zoom +
      </Button>
      <Button size="sm" variant="outline" onClick={onZoomOut} title="Zoom arrière">
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
      <span className="sim-perf" title="Zoom · images par seconde · ticks de simulation">
        ×{zoomLabel.toFixed(1)} · {fps} i/s · {simTps} ticks/s
      </span>
      <Button size="sm" variant="outline" onClick={onReset} title="Générer un nouveau monde">
        Nouveau monde
      </Button>
    </div>
  )
})
