import { memo, useMemo, useState } from 'react'
import {
  DEFAULT_SIM_CONFIG,
  MAP_SIZE_OPTIONS,
  SIM_PRESETS,
  randomSeed,
  resolveSimConfig,
  type MapSizePreset,
  type SimConfig,
  type SimPresetId,
} from '@/lib/sim/simConfig'

const PRESET_ORDER: SimPresetId[] = ['standard', 'vast', 'anthill', 'harsh', 'observe']

export const StartMenu = memo(function StartMenu({
  initial,
  busy,
  onLaunch,
}: {
  initial?: Partial<SimConfig>
  busy?: boolean
  onLaunch: (config: SimConfig) => void
}) {
  const [preset, setPreset] = useState<SimPresetId>(initial?.preset ?? 'standard')
  const [worldSize, setWorldSize] = useState<MapSizePreset>(
    initial?.worldSize ?? SIM_PRESETS.standard.config.worldSize,
  )
  const [initialVillagers, setInitialVillagers] = useState(
    initial?.initialVillagers ?? SIM_PRESETS.standard.config.initialVillagers,
  )
  const [maxPopulation, setMaxPopulation] = useState(
    initial?.maxPopulation ?? SIM_PRESETS.standard.config.maxPopulation,
  )
  const [sheepCount, setSheepCount] = useState(initial?.sheepCount ?? SIM_PRESETS.standard.config.sheepCount)
  const [horseCount, setHorseCount] = useState(initial?.horseCount ?? SIM_PRESETS.standard.config.horseCount)
  const [wolfCount, setWolfCount] = useState(initial?.wolfCount ?? SIM_PRESETS.standard.config.wolfCount)
  const [seed, setSeed] = useState(String(initial?.seed ?? 1))
  const [startPaused, setStartPaused] = useState(initial?.startPaused ?? false)

  const applyPreset = (id: SimPresetId) => {
    const p = SIM_PRESETS[id]
    setPreset(id)
    setWorldSize(p.config.worldSize)
    setInitialVillagers(p.config.initialVillagers)
    setMaxPopulation(p.config.maxPopulation)
    setSheepCount(p.config.sheepCount)
    setHorseCount(p.config.horseCount)
    setWolfCount(p.config.wolfCount)
    setStartPaused(p.config.startPaused)
  }

  const preview = useMemo(
    () =>
      resolveSimConfig({
        preset,
        worldSize,
        initialVillagers,
        maxPopulation,
        sheepCount,
        horseCount,
        wolfCount,
        startPaused,
        seed: Number(seed) || 1,
      }),
    [preset, worldSize, initialVillagers, maxPopulation, sheepCount, horseCount, wolfCount, startPaused, seed],
  )

  const launch = () => {
    if (busy) return
    onLaunch(preview)
  }

  return (
    <div className="sim-start" role="dialog" aria-labelledby="sim-start-title">
      <div className="sim-start-card">
        <header className="sim-start-hero">
          <p className="sim-start-kicker">Simulation Atlas v1 · nono_simu_2d</p>
          <h1 id="sim-start-title">Civilisation vivante</h1>
          <p className="sim-start-lead">
            Émergence + causalité + interconnexion — nature packs + sim câblée. Choisissez le monde, puis lancez.
          </p>
        </header>

        <section className="sim-start-section" aria-label="Presets">
          <h2>Type de simulation</h2>
          <div className="sim-start-presets">
            {PRESET_ORDER.map((id) => {
              const p = SIM_PRESETS[id]
              const on = preset === id
              return (
                <button
                  key={id}
                  type="button"
                  className={on ? 'sim-start-preset is-on' : 'sim-start-preset'}
                  onClick={() => applyPreset(id)}
                  aria-pressed={on}
                >
                  <strong>{p.label}</strong>
                  <span>{p.blurb}</span>
                </button>
              )
            })}
          </div>
        </section>

        <section className="sim-start-section" aria-label="Carte et population">
          <h2>Carte & peuple</h2>
          <div className="sim-start-grid">
            <label className="sim-start-field">
              <span>Taille de carte</span>
              <select
                value={worldSize}
                onChange={(e) => {
                  setWorldSize(Number(e.target.value) as MapSizePreset)
                }}
              >
                {MAP_SIZE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label} — {o.hint}
                  </option>
                ))}
              </select>
            </label>

            <label className="sim-start-field">
              <span>Population de départ</span>
              <input
                type="number"
                min={4}
                max={120}
                value={initialVillagers}
                onChange={(e) => {
                  setInitialVillagers(Number(e.target.value))
                }}
              />
            </label>

            <label className="sim-start-field">
              <span>Plafond de population</span>
              <input
                type="number"
                min={4}
                max={500}
                value={maxPopulation}
                onChange={(e) => {
                  setMaxPopulation(Number(e.target.value))
                }}
              />
            </label>

            <label className="sim-start-field">
              <span>Graine (seed)</span>
              <div className="sim-start-seed-row">
                <input
                  type="number"
                  min={1}
                  value={seed}
                  onChange={(e) => setSeed(e.target.value)}
                />
                <button type="button" className="sim-start-ghost" onClick={() => setSeed(String(randomSeed()))}>
                  Aléatoire
                </button>
              </div>
            </label>
          </div>
        </section>

        <section className="sim-start-section" aria-label="Faune">
          <h2>Densités animales</h2>
          <div className="sim-start-grid sim-start-grid-3">
            <label className="sim-start-field">
              <span>Moutons</span>
              <input
                type="number"
                min={0}
                max={120}
                value={sheepCount}
                onChange={(e) => {
                  setSheepCount(Number(e.target.value))
                }}
              />
            </label>
            <label className="sim-start-field">
              <span>Chevaux</span>
              <input
                type="number"
                min={0}
                max={60}
                value={horseCount}
                onChange={(e) => {
                  setHorseCount(Number(e.target.value))
                }}
              />
            </label>
            <label className="sim-start-field">
              <span>Loups</span>
              <input
                type="number"
                min={0}
                max={20}
                value={wolfCount}
                onChange={(e) => {
                  setWolfCount(Number(e.target.value))
                }}
              />
            </label>
          </div>
          <label className="sim-start-check">
            <input type="checkbox" checked={startPaused} onChange={(e) => setStartPaused(e.target.checked)} />
            <span>Démarrer en pause (observation)</span>
          </label>
        </section>

        <footer className="sim-start-foot">
          <p className="sim-start-summary">
            {preview.worldSize}×{preview.worldSize} · {preview.initialVillagers} habitants · plafond{' '}
            {preview.maxPopulation} · seed {preview.seed}
            {preview.startPaused ? ' · pause' : ''}
          </p>
          <button type="button" className="sim-start-launch" onClick={launch} disabled={busy}>
            {busy ? 'Génération…' : 'Lancer la simulation'}
          </button>
        </footer>
      </div>
    </div>
  )
})

export { DEFAULT_SIM_CONFIG }
