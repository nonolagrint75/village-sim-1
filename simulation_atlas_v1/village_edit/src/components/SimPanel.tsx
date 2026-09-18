import {
  Component,
  memo,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ErrorInfo,
  type ReactNode,
} from 'react'
import type { HouseShape } from '@/lib/sim/architecture'
import {
  AMBITION_LABELS,
  BOAT_LABELS,
  MEMORY_LABELS,
  PROFESSION_LABELS,
  RESOURCE_LABELS_FR,
  ROOM_LABEL_FR,
  SEASON_COLORS,
  SEASON_LABELS,
  SHAPE_LABELS,
  restTaskLabel,
  TASK_LABELS,
  TOOL_LABELS,
} from '@/lib/sim/labels'
import { MONTH_LABELS_FR } from '@/lib/sim/calendar'
import type { CircleKind } from '@/lib/sim/politics'
import type {
  SelectedVillager,
  UiBandRow,
  UiCountRow,
  UiGroupRow,
  UiLineageRow,
  UiProjectRow,
  UiReligionSiteRow,
} from '@/lib/sim/snapshot'
import type { Profession, SimStats } from '@/lib/sim/types'
import { drawVillagerSprite } from '@/lib/sim/entityArt'
import { AtlasCharts } from '@/components/SimCharts'
import type { SimRunArchive, TelemetryPoint } from '@/lib/sim/runTelemetry'

function num(v: unknown, fallback = 0): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback
}

type LifeRow = { id: string; title: string; phase: string; detail: string; hot: boolean }
type CausalRow = { id: string; chain: string; detail: string }

function resourceLabel(type: unknown): string {
  if (typeof type !== 'string' || !type) return 'ressource'
  return RESOURCE_LABELS_FR[type] ?? type
}

type Tab = 'realm' | 'society' | 'market' | 'atlas' | 'log'
type GroupFilter = 'all' | 'circles' | 'institutions' | CircleKind
type LineageSort = 'wealth' | 'reputation' | 'living'
type SettlementSort = 'prosperity' | 'population' | 'crisis'

const TABS: { id: Tab; label: string }[] = [
  { id: 'realm', label: 'Royaume' },
  { id: 'society', label: 'Société' },
  { id: 'market', label: 'Économie' },
  { id: 'atlas', label: 'Atlas' },
  { id: 'log', label: 'Chronique' },
]

const BASE_GROUP_FILTERS: { id: GroupFilter; label: string }[] = [
  { id: 'all', label: 'Tous' },
  { id: 'circles', label: 'Cercles' },
  { id: 'institutions', label: 'Institutions' },
]

const PROFESSION_ORDER: Profession[] = [
  'farmer',
  'forager',
  'fisher',
  'miller',
  'lumberjack',
  'mason',
  'miner',
  'builder',
  'herder',
  'weaver',
  'blacksmith',
  'trader',
  'guard',
]

export const SimPanel = memo(function SimPanel({
  stats,
  chronicle,
  groups = [],
  lineages = [],
  cultures = [],
  creeds = [],
  projects = [],
  bands = [],
  religionSites = [],
  selectedId,
  selected,
  nameOf,
  following,
  onFollow,
  onCloseSelected,
  liveSeries,
  archives,
}: {
  stats: SimStats
  chronicle: string[]
  groups?: UiGroupRow[]
  lineages?: UiLineageRow[]
  cultures?: UiCountRow[]
  creeds?: UiCountRow[]
  projects?: UiProjectRow[]
  bands?: UiBandRow[]
  religionSites?: UiReligionSiteRow[]
  /** Local click id — show pending portrait even if worker pack is still null. */
  selectedId: number | null
  selected: SelectedVillager | null
  nameOf: (id: number) => string
  following: boolean
  onFollow: () => void
  onCloseSelected: () => void
  liveSeries: TelemetryPoint[]
  archives: SimRunArchive[]
}) {
  const [tab, setTab] = useState<Tab>('realm')
  const [groupsOpen, setGroupsOpen] = useState(false)
  const [genealogyOpen, setGenealogyOpen] = useState(false)
  const [groupFilter, setGroupFilter] = useState<GroupFilter>('all')
  const [expandedGroupId, setExpandedGroupId] = useState<number | null>(null)
  const [expandedLineageId, setExpandedLineageId] = useState<number | null>(null)
  const [lineageSort, setLineageSort] = useState<LineageSort>('wealth')
  const [settlementSort, setSettlementSort] = useState<SettlementSort>('prosperity')
  const [lifeHotOnly, setLifeHotOnly] = useState(false)
  const seasonColor = SEASON_COLORS[stats.season]
  const marketRows = useMemo(() => {
    const rows = Object.entries(stats.prices).filter(([, p]) => typeof p === 'number') as [string, number][]
    rows.sort((a, b) => b[1] - a[1])
    const max = Math.max(1, ...rows.map(([, p]) => p))
    return rows.map(([res, price]) => ({ res, price, t: price / max }))
  }, [stats.prices])
  /** Visible market stocks: bag totals + village surplus (not market prices). */
  const marketStockItems = useMemo(() => {
    const items: [string, number][] = [
      ['Pain (sacs)', num(stats.totalBread)],
      ['Pièces (sacs)', num(stats.totalCoins)],
    ]
    const stocks = stats.marketStocks ?? {}
    for (const [res, stock] of Object.entries(stocks)) {
      if (typeof stock !== 'number' || !Number.isFinite(stock)) continue
      const label = RESOURCE_LABELS_FR[res as keyof typeof RESOURCE_LABELS_FR] ?? res
      items.push([`${label} (surplus)`, Math.round(stock * 10) / 10])
    }
    return items
  }, [stats.totalBread, stats.totalCoins, stats.marketStocks])
  const topShapes = useMemo(
    () =>
      Object.entries(stats.shapes)
        .filter(([, n]) => n > 0)
        .sort((a, b) => b[1] - a[1]),
    [stats.shapes],
  )
  const activeProfessions = useMemo(
    () =>
      PROFESSION_ORDER.map((id) => [PROFESSION_LABELS[id], stats.professions[id] ?? 0] as [string, number]).filter(
        ([, n]) => n > 0,
      ),
    [stats.professions],
  )
  const unassigned = stats.professions.none ?? 0

  const kindFilters = useMemo(() => {
    const seen = new Map<CircleKind, string>()
    for (const g of groups) {
      if (!seen.has(g.kind)) seen.set(g.kind, g.kindLabel)
    }
    return [...seen.entries()]
      .sort((a, b) => a[1].localeCompare(b[1], 'fr'))
      .map(([id, label]) => ({ id, label }))
  }, [groups])

  const filteredGroups = useMemo(() => {
    if (groupFilter === 'all') return groups
    if (groupFilter === 'circles') return groups.filter((g) => !g.isInstitution)
    if (groupFilter === 'institutions') return groups.filter((g) => g.isInstitution)
    return groups.filter((g) => g.kind === groupFilter)
  }, [groups, groupFilter])

  const sortedLineages = useMemo(() => {
    const rows = [...lineages]
    if (lineageSort === 'wealth') rows.sort((a, b) => b.wealthEstimate - a.wealthEstimate)
    else if (lineageSort === 'reputation') rows.sort((a, b) => b.reputation - a.reputation)
    else rows.sort((a, b) => b.livingCount - a.livingCount)
    return rows
  }, [lineages, lineageSort])

  const sortedSettlements = useMemo(() => {
    const rows = [...(stats.settlementRows ?? [])]
    if (settlementSort === 'prosperity') rows.sort((a, b) => b.prosperity - a.prosperity)
    else if (settlementSort === 'population') rows.sort((a, b) => b.population - a.population)
    else {
      const rank: Record<string, number> = { collapse: 0, crisis: 1, rebuild: 2, stable: 3 }
      rows.sort((a, b) => (rank[a.crisisPhase] ?? 9) - (rank[b.crisisPhase] ?? 9))
    }
    return rows
  }, [stats.settlementRows, settlementSort])

  const causalReadouts = stats.causalReadouts ?? []
  const creditRows = stats.creditRows ?? []
  const parallelGangRows = stats.parallelGangRows ?? []
  const firmRows = stats.firmRows ?? []
  const priceHistoryRows = stats.priceHistoryRows ?? []
  const laborRows = stats.laborRows ?? []
  const migrantRows = stats.migrantRows ?? []
  const woolRows = stats.woolRows ?? []
  const kinDynastyRows = stats.kinDynastyRows ?? []
  const faithSchismRows = stats.faithSchismRows ?? []
  const successionRows = stats.successionRows ?? []
  const guildEmergenceRows = stats.guildEmergenceRows ?? []
  const merchantRows = stats.merchantRows ?? []
  const agriRows = stats.agriRows ?? []
  const militaryDynastyRows = stats.militaryDynastyRows ?? []
  const marriageAllianceRows = stats.marriageAllianceRows ?? []
  const warDiplomacyRows = stats.warDiplomacyRows ?? []
  const emergenceProofs = stats.emergenceProofs ?? []
  // PARTIAL gaps first on the proof strip (HARD rubric toward 100).
  const proofPriority = ['s39', 's34', 's37', 's40', 's12', 's23', 's47', 's4']
  const orderedProofs = [...emergenceProofs].sort((a, b) => {
    // Not-ready gaps first (HARD toward 100), then priority order, then ready clears last.
    if (a.ready !== b.ready) return Number(a.ready) - Number(b.ready)
    const ia = proofPriority.indexOf(a.id)
    const ib = proofPriority.indexOf(b.id)
    if (ia === -1 && ib === -1) return 0
    if (ia === -1) return 1
    if (ib === -1) return -1
    return ia - ib
  })
  const gapProofs = orderedProofs.filter((p) => !p.ready)
  const shownProofs = lifeHotOnly ? orderedProofs.filter((p) => !p.ready || proofPriority.includes(p.id)) : orderedProofs
  // When filtering "Actifs", prefer unresolved gaps; else full ordered strip (cap 10).
  const proofStrip = (lifeHotOnly ? gapProofs.concat(orderedProofs.filter((p) => p.ready).slice(0, 2)) : shownProofs).slice(
    0,
    10,
  )

  const filterLife = (rows: LifeRow[]) => (lifeHotOnly ? rows.filter((r) => r.hot) : rows)

  const openGroups = () => {
    setTab('society')
    setGroupsOpen(true)
    setGenealogyOpen(false)
    setGroupFilter('all')
    setExpandedGroupId(null)
  }

  const openGenealogy = () => {
    setTab('society')
    setGenealogyOpen(true)
    setGroupsOpen(false)
    setExpandedLineageId(null)
  }

  const selectTab = (id: Tab) => {
    setTab(id)
    if (id !== 'society') {
      setGroupsOpen(false)
      setGenealogyOpen(false)
    }
  }

  return (
    <aside className="sim-panel">
      <header className="sim-hero">
        <div className="sim-hero-top">
          <p className="sim-kicker">Simulation Atlas v1 · nono_simu_2d</p>
          <div className="sim-year-row">
            <h2>An {stats.calendar.year}</h2>
            <span className="sim-season" style={{ '--season': seasonColor } as CSSProperties}>
              {SEASON_LABELS[stats.calendar.season]}
            </span>
          </div>
          <p className="sim-date" title={stats.calendar.dateLabel}>
            {stats.calendar.dayOfMonth} {MONTH_LABELS_FR[stats.calendar.monthIndex]} · jour{' '}
            {stats.calendar.dayOfYear} · {stats.calendar.hour} h
          </p>
        </div>
        <div className="sim-season-track">
          <div className="sim-season-fill" style={{ transform: `scaleX(${stats.seasonProgress})`, background: seasonColor }} />
        </div>
        {stats.famine && <p className="sim-famine">Famine — les greniers se vident</p>}
        <div className="sim-hero-stats">
          <HeroStat label="Peuple" value={stats.villagers} />
          <HeroStat label="Villages" value={stats.villages} />
          <HeroStat label="Voies" value={stats.roadTiles} />
        </div>
      </header>

      {selectedId !== null && (
        <PortraitBoundary selectedId={selectedId} onClose={onCloseSelected}>
          {selected ? (
            <Portrait
              selected={selected}
              nameOf={nameOf}
              following={following}
              onFollow={onFollow}
              onClose={onCloseSelected}
            />
          ) : (
            <article className="sim-portrait sim-portrait-pending" aria-live="polite">
              <div className="sim-portrait-head">
                <div className="sim-avatar" style={{ background: 'hsl(40, 20%, 28%)' }} />
                <div className="sim-portrait-id">
                  <h3>Villageois #{selectedId}</h3>
                  <p>Chargement du portrait…</p>
                </div>
                <button type="button" className="sim-ghost" onClick={onCloseSelected} aria-label="Fermer">
                  ×
                </button>
              </div>
            </article>
          )}
        </PortraitBoundary>
      )}

      <nav className="sim-tabs" aria-label="Sections du panneau">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            className={tab === item.id ? 'is-on' : ''}
            onClick={() => selectTab(item.id)}
          >
            {item.label}
          </button>
        ))}
      </nav>

      <div className="sim-panel-body">
        {tab === 'realm' && (
          <div className="sim-stack">
            <Section title="Preuves d’émergence">
              {proofStrip.length === 0 ? (
                <p className="sim-empty">Aucun écart scénario — critères HARD en cours.</p>
              ) : (
                <ul className="sim-groups">
                  {proofStrip.map((p) => (
                    <li key={p.id}>
                      <div className={['sim-group-card', p.ready ? 'sim-proof-ready' : 'sim-proof-gap'].filter(Boolean).join(' ')}>
                        <div className="sim-group-top">
                          <strong>
                            {p.scenario} · {p.label}
                          </strong>
                          <span className="sim-group-badge">{p.ready ? 'visible' : 'écart'}</span>
                        </div>
                        <p className="sim-group-stats">{p.value}</p>
                        <p className="sim-group-summary">{p.detail}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Section>
            <Section title="Chaînes causales">
              <CausalList rows={causalReadouts} empty="Pas encore de chaîne prouvée — famine, crédit, schisme, guildes apparaîtront ici." />
            </Section>
            <div className="sim-filter-row" role="group" aria-label="Filtrer les lectures">
              <button type="button" className={!lifeHotOnly ? 'is-on' : ''} onClick={() => setLifeHotOnly(false)}>
                Tout
              </button>
              <button type="button" className={lifeHotOnly ? 'is-on' : ''} onClick={() => setLifeHotOnly(true)}>
                Actifs
              </button>
            </div>
            <Section title="Succession · conflit">
              {filterLife(successionRows).length === 0 ? (
                <p className="sim-empty">Pas de crise de succession encore.</p>
              ) : (
                <LifeRowsList rows={filterLife(successionRows)} />
              )}
            </Section>
            <Section title="Guerre · diplomatie">
              {filterLife(warDiplomacyRows).length === 0 ? (
                <p className="sim-empty">S34/S37/S40 — alliances vs 3e, morts de guerre, paix coûteuse.</p>
              ) : (
                <LifeRowsList rows={filterLife(warDiplomacyRows)} />
              )}
            </Section>
            <Section title="Schisme · foi">
              {filterLife(faithSchismRows).length === 0 ? (
                <p className="sim-empty">Une seule voie ou aucune — un schisme émergera ici.</p>
              ) : (
                <LifeRowsList rows={filterLife(faithSchismRows)} />
              )}
            </Section>
            <Section title="Pouvoirs & territoires">
              {(stats.polities ?? 0) === 0 ? (
                <p className="sim-empty">Pas encore de pouvoirs émergents — les villages forgeront chefs et prétentions.</p>
              ) : (
                <>
                  <StatGrid
                    items={[
                      ['Pouvoirs', stats.polities ?? 0],
                      ['Chefferies', stats.chiefdoms ?? 0],
                      ['Royaumes', stats.kingdoms ?? 0],
                      ['Châteaux', stats.castles ?? 0],
                      ['Institutions', stats.institutions ?? 0],
                      ['Guerres actives', stats.activeWars ?? 0],
                      ['Guerres ouvertes', stats.openWars ?? 0],
                      ['Batailles', stats.warBattles ?? 0],
                      ['Coups', stats.coups ?? 0],
                      ['Firmes', stats.firms ?? 0],
                      ['Embauches', stats.firmHires ?? 0],
                      ['Faillites', stats.firmFailures ?? 0],
                    ]}
                  />
                  {(stats.warRows ?? []).length > 0 && (
                    <ul className="sim-groups" style={{ marginTop: '0.45rem' }}>
                      {(stats.warRows ?? []).slice(0, 6).map((w) => (
                        <li key={w.id}>
                          <div className="sim-group-card">
                            <div className="sim-group-top">
                              <strong>
                                {w.aName} vs {w.bName}
                              </strong>
                              <span className="sim-group-badge">{w.status}</span>
                            </div>
                            <p className="sim-group-meta">{w.cause}</p>
                            <p className="sim-group-stats">
                              intensité {Math.round(w.intensity * 100)} % · {w.battles} bataille
                              {w.battles > 1 ? 's' : ''}
                            </p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                  {stats.settlementStages && (
                    <p className="sim-kit" style={{ marginTop: '0.45rem' }}>
                      Habitats :{' '}
                      {Object.entries(stats.settlementStages)
                        .filter(([, n]) => (n as number) > 0)
                        .map(([k, n]) => `${k} ${n}`)
                        .join(' · ') || '—'}
                    </p>
                  )}
                  {stats.leadingCircle ? (
                    <p className="sim-lead" style={{ marginTop: '0.45rem' }}>
                      Ascendant : {stats.leadingCircle}
                      {(stats.leadingLegitimacy ?? 0) > 0
                        ? ` · légitimité ${Math.round((stats.leadingLegitimacy ?? 0) * 100)} %`
                        : ''}
                    </p>
                  ) : null}
                  {(stats.polityRows ?? []).length > 0 && (
                    <ul className="sim-groups" style={{ marginTop: '0.55rem' }}>
                      {(stats.polityRows ?? []).slice(0, 8).map((p) => (
                        <li key={p.id}>
                          <div className="sim-group-card">
                            <div className="sim-group-top">
                              <strong>{p.name}</strong>
                              <span className="sim-group-badge">{p.tierLabel}</span>
                            </div>
                            <p className="sim-group-meta">
                              {p.rulerName ? `${p.titleLabel} ${p.rulerName}` : 'sans chef'}
                            </p>
                            <p className="sim-group-stats">
                              légitimité {Math.round(p.legitimacy * 100)} % · {p.villages} village
                              {p.villages > 1 ? 's' : ''} · revendication {p.claimRadius}
                              {p.rivals > 0 ? ` · ${p.rivals} rival${p.rivals > 1 ? 's' : ''}` : ''}
                            </p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              )}
            </Section>
            <Section title="Techniques">
              {(stats.techKnown ?? 0) === 0 ? (
                <p className="sim-empty">
                  Aucune technique partagée encore — inventions et enseignement peupleront les savoirs villageois.
                </p>
              ) : (
                <>
                  <StatGrid items={[['Savoirs distincts', stats.techKnown ?? 0]]} />
                  {(stats.techLabels ?? []).length > 0 && (
                    <p className="sim-kit" style={{ marginTop: '0.45rem' }}>
                      {(stats.techLabels ?? []).join(' · ')}
                    </p>
                  )}
                </>
              )}
            </Section>
            <Section title="Peuple">
              <StatGrid
                items={[
                  ['Naissances', stats.births],
                  ['Morts', stats.deaths],
                  ['Morts (loups)', stats.deathsByWolf],
                  ['Morts (brigands)', stats.deathsByBandit ?? 0],
                  ['Désertions', stats.deserters ?? 0],
                  ['Loups', stats.wolves],
                  ['Brigands', stats.bandits ?? 0],
                  ['Bandes', stats.bands ?? 0],
                  ['Moutons', stats.sheep],
                ]}
              />
            </Section>
            <Section title="Brigands">
              {(stats.bandits ?? 0) === 0 && bands.length === 0 && parallelGangRows.length === 0 ? (
                <p className="sim-empty">
                  Aucune bande encore — la misère et l’errance en feront naître hors des villages.
                </p>
              ) : (
                <>
                  <StatGrid
                    items={[
                      ['Brigands vivants', stats.bandits ?? 0],
                      ['Bandes (cœur)', Math.max(stats.bands ?? 0, bands.length)],
                      ['Bandes parallèles', stats.parallelGangs ?? 0],
                      ['Primes actives', stats.parallelBounties ?? 0],
                      ['En négociation', stats.parallelNegotiating ?? 0],
                      ['Morts causées', stats.deathsByBandit ?? 0],
                    ]}
                  />
                  {!stats.parallelWired && parallelGangRows.length === 0 ? (
                    <p className="sim-muted" style={{ marginTop: '0.45rem' }}>
                      Aucune bande encore — misère / désertion en feront naître.
                    </p>
                  ) : null}
                  {parallelGangRows.length > 0 && (
                    <ul className="sim-groups" style={{ marginTop: '0.55rem' }}>
                      {parallelGangRows.map((g) => (
                        <li key={g.id}>
                          <div className="sim-group-card">
                            <div className="sim-group-top">
                              <strong>{g.name}</strong>
                              <span className="sim-group-badge">{g.phaseLabel}</span>
                            </div>
                            <p className="sim-group-meta">
                              {g.members} membre{g.members === 1 ? '' : 's'} · notoriété{' '}
                              {Math.round(g.notoriety * 100)} %
                              {g.negotiating ? ' · négocie' : ''}
                            </p>
                            <p className="sim-group-stats">
                              {g.raids} razzia{g.raids === 1 ? '' : 's'}
                              {g.activeBounties > 0
                                ? ` · ${g.activeBounties} prime${g.activeBounties === 1 ? '' : 's'} (${g.bountyTotal})`
                                : ''}
                              {g.deals > 0 ? ` · ${g.deals} accord${g.deals === 1 ? '' : 's'}` : ''}
                              {g.parallelCoin > 0 ? ` · marché parallèle ${g.parallelCoin}` : ''}
                            </p>
                            {g.lastEvent ? <p className="sim-group-summary">{g.lastEvent}</p> : null}
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                  {bands.length > 0 && (
                    <ul className="sim-groups" style={{ marginTop: '0.55rem' }}>
                      {bands.map((b) => (
                        <li key={b.id}>
                          <div className="sim-group-card">
                            <div className="sim-group-top">
                              <strong>{b.name}</strong>
                              <span className="sim-group-badge">{b.originLabel}</span>
                            </div>
                            <p className="sim-group-meta">
                              {b.members} membre{b.members === 1 ? '' : 's'} · {b.phaseHint}
                            </p>
                            <p className="sim-group-stats">
                              {b.raids} razzia{b.raids === 1 ? '' : 's'}
                              {(b.tradeAmbushes ?? 0) > 0
                                ? ` · ${b.tradeAmbushes} embuscade${b.tradeAmbushes === 1 ? '' : 's'}`
                                : ''}{' '}
                              · {b.campLabel}
                            </p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              )}
            </Section>
            <Section title="Religions & cultes">
              {creeds.length === 0 && religionSites.length === 0 ? (
                <p className="sim-empty">
                  Pas encore de voie de foi — piété, rites et autels émergent avec le temps.
                </p>
              ) : (
                <>
                  <StatGrid
                    items={[
                      ['Voies de foi', creeds.length],
                      [
                        'Autels',
                        religionSites.filter((s) => (s.sacredTier ?? 'none') === 'shrine' || (s.hasShrine && !s.sacredTier)).length,
                      ],
                      [
                        'Chapelles',
                        religionSites.filter((s) => s.sacredTier === 'chapel').length,
                      ],
                      [
                        'Temples',
                        religionSites.filter((s) => s.sacredTier === 'temple').length,
                      ],
                    ]}
                  />
                  {creeds.length > 0 && (
                    <StatGrid
                      items={creeds.slice(0, 8).map((c) => [c.label, c.count])}
                    />
                  )}
                  {religionSites.length > 0 && (
                    <ul className="sim-groups" style={{ marginTop: '0.55rem' }}>
                      {religionSites.map((s) => (
                        <li key={s.villageId}>
                          <div className="sim-group-card">
                            <div className="sim-group-top">
                              <strong>{s.label}</strong>
                              <span className="sim-group-badge">
                                {s.tierLabel ||
                                  (s.sacredTier === 'temple'
                                    ? 'Temple'
                                    : s.sacredTier === 'chapel'
                                      ? 'Chapelle'
                                      : 'Autel')}
                              </span>
                            </div>
                            <p className="sim-group-meta">
                              Village n°{s.villageId}
                              {s.creedLabel ? ` · « ${s.creedLabel} »` : ''}
                              {s.sacredTier && s.sacredTier !== 'none'
                                ? ` · ${s.sacredTier === 'temple' ? 'sanctuaire élevé' : s.sacredTier === 'chapel' ? 'édifice de culte' : 'lieu de rite'}`
                                : ''}
                            </p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              )}
            </Section>
            <Section title="Châteaux & projets">
              {(stats.castles ?? 0) === 0 && projects.length === 0 ? (
                <p className="sim-empty">
                  Aucun chantier collectif — remparts, donjons et autels apparaîtront sous menace ou ambition.
                </p>
              ) : (
                <>
                  {(stats.castles ?? 0) > 0 && (
                    <StatGrid items={[['Donjons / keeps achevés', stats.castles ?? 0]]} />
                  )}
                  {projects.length > 0 ? (
                    <ul className="sim-groups" style={{ marginTop: (stats.castles ?? 0) > 0 ? '0.55rem' : 0 }}>
                      {projects.map((p) => (
                        <li key={p.id}>
                          <div className="sim-group-card">
                            <div className="sim-group-top">
                              <strong>{p.label}</strong>
                          {p.isKeep && <span className="sim-group-badge">Donjon</span>}
                          {p.isFort && !p.isKeep && <span className="sim-group-badge">Fort</span>}
                          {p.isShrine && <span className="sim-group-badge">Autel</span>}
                          {p.phase === 'done' && !p.isFort && !p.isShrine && (
                            <span className="sim-group-badge">Achevé</span>
                          )}
                            </div>
                            <p className="sim-group-meta">
                              {p.phaseLabel}
                              {(p.purposes?.length ?? 0) > 0 ? ` · ${p.purposes!.join(', ')}` : ''}
                              {p.villageLabel ? ` · ${p.villageLabel}` : ''}
                            </p>
                            <p className="sim-group-stats">{p.progressNote}</p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="sim-muted" style={{ marginTop: '0.45rem' }}>
                      Aucun chantier en cours.
                    </p>
                  )}
                </>
              )}
            </Section>
            <Section title="Défrichement & habitats">
              <StatGrid
                items={[
                  ['Champs ouverts', stats.fields],
                  ['Maisons', stats.houses],
                  ['Sentiers / routes', stats.roadTiles],
                  ['Enclos', stats.pens],
                  ['Moulins', stats.mills],
                  ['Ports', stats.ports],
                  ['Marchés', stats.markets ?? 0],
                  ['Bateaux', stats.boats],
                ]}
              />
              <p className="sim-muted" style={{ marginTop: '0.45rem' }}>
                Les anneaux pâles autour des villages indiquent l’enceinte ou la zone d’expansion
                (périmètre défensif s’il existe, sinon rayon d’habitat approximatif).
              </p>
            </Section>
            <Section title="Réseau & défense">
              <StatGrid
                items={[
                  ['Sentiers / routes', stats.roadTiles],
                  ['Ponts', stats.bridges],
                  ['Enceinte', stats.wallTiles],
                  ['Châteaux / donjons', stats.castles ?? 0],
                  ['Couvert d’eau', stats.naturalCover],
                ]}
              />
            </Section>
            <Section title="Déplacement">
              <StatGrid
                items={[
                  ['Chevaux dressés', stats.horsesTamed],
                  ['Chevaux sauvages', stats.horsesWild],
                  ['Cavaliers', stats.riders],
                  ['Charrettes', stats.carts],
                  ['Voyages marchands', stats.tradeRunsTotal],
                ]}
              />
            </Section>
            <Section title="Métiers">
              {activeProfessions.length === 0 && unassigned === 0 ? (
                <p className="sim-empty">Aucun métier encore établi.</p>
              ) : (
                <StatGrid
                  items={[
                    ...activeProfessions,
                    ...(unassigned > 0 ? ([['Sans métier', unassigned]] as [string, number][]) : []),
                  ]}
                />
              )}
            </Section>
            {topShapes.length > 0 && (
              <Section title="Formes de maisons">
                <StatGrid items={topShapes.map(([shape, n]) => [SHAPE_LABELS[shape as HouseShape] ?? shape, n])} />
              </Section>
            )}
          </div>
        )}

        {tab === 'society' && !groupsOpen && !genealogyOpen && (
          <div className="sim-stack">
            <Section title="Politique émergente">
              {(stats.circles ?? 0) === 0 && (stats.institutions ?? 0) === 0 ? (
                <p className="sim-empty">Pas encore de cercles ni d’institutions — les affinités naîtront.</p>
              ) : (
                <StatGrid
                  items={[
                    ['Cercles', stats.circles ?? 0],
                    ['Institutions', stats.institutions ?? 0],
                    ['Guildes', stats.guilds ?? 0],
                    ['Conseils', stats.councils ?? 0],
                    ['Rumeurs', stats.rumors ?? 0],
                    ['Campements', stats.camps ?? 0],
                    ['Chefferies', stats.chiefdoms ?? 0],
                  ]}
                />
              )}
              {stats.leadingCircle ? (
                <p className="sim-lead">
                  Ascendant : {stats.leadingCircle}
                  {(stats.leadingLegitimacy ?? 0) > 0
                    ? ` · légitimité ${Math.round((stats.leadingLegitimacy ?? 0) * 100)} %`
                    : ''}
                </p>
              ) : (
                <p className="sim-empty" style={{ marginTop: '0.5rem' }}>
                  Aucun chef clairement légitime pour l’instant.
                </p>
              )}
              {(stats.laws ?? []).length > 0 && (
                <>
                  <p className="sim-muted" style={{ margin: '0.55rem 0 0.35rem' }}>
                    Lois & normes
                  </p>
                  <StatGrid items={(stats.laws ?? []).slice(0, 6).map((l) => [l.label, l.count])} />
                </>
              )}
              <button type="button" className="sim-action" onClick={openGroups}>
                Voir les groupes
              </button>
            </Section>
            <div className="sim-filter-row" role="group" aria-label="Filtrer les lectures">
              <button type="button" className={!lifeHotOnly ? 'is-on' : ''} onClick={() => setLifeHotOnly(false)}>
                Tout
              </button>
              <button type="button" className={lifeHotOnly ? 'is-on' : ''} onClick={() => setLifeHotOnly(true)}>
                Actifs
              </button>
            </div>
            <Section title="Mariages · alliances">
              {filterLife(marriageAllianceRows).length === 0 ? (
                <p className="sim-empty">Pas encore d’union — S4 s’écrira ici (mariage → alliance de familles).</p>
              ) : (
                <LifeRowsList rows={filterLife(marriageAllianceRows)} />
              )}
            </Section>
            <Section title="Travail · révolte">
              {filterLife(laborRows).length === 0 ? (
                <p className="sim-empty">Pas de mouvement ouvrier encore.</p>
              ) : (
                <LifeRowsList rows={filterLife(laborRows)} />
              )}
            </Section>
            <Section title="Quartiers migrants">
              {filterLife(migrantRows).length === 0 ? (
                <p className="sim-empty">Aucun quartier migrant cristallisé.</p>
              ) : (
                <LifeRowsList rows={filterLife(migrantRows)} />
              )}
            </Section>
            <Section title="Guildes émergentes">
              {filterLife(guildEmergenceRows).length === 0 ? (
                <p className="sim-empty">Pas encore de guilde métier (S21).</p>
              ) : (
                <LifeRowsList rows={filterLife(guildEmergenceRows)} />
              )}
            </Section>
            <Section title="Réseaux marchands">
              {filterLife(merchantRows).length === 0 ? (
                <p className="sim-empty">Pas de réseau marchand encore.</p>
              ) : (
                <LifeRowsList rows={filterLife(merchantRows)} />
              )}
            </Section>
            <Section title="Parenté · dynastie">
              {filterLife(kinDynastyRows).length === 0 ? (
                <p className="sim-empty">Graphe de parenté encore vide.</p>
              ) : (
                <LifeRowsList rows={filterLife(kinDynastyRows)} />
              )}
            </Section>
            <Section title="Dynasties militaires">
              {filterLife(militaryDynastyRows).length === 0 ? (
                <p className="sim-empty">Pas de dynastie militaire encore.</p>
              ) : (
                <LifeRowsList rows={filterLife(militaryDynastyRows)} />
              )}
            </Section>
            <Section title="Lignées">
              {lineages.length === 0 ? (
                <p className="sim-empty">Pas encore de lignées nommées — les naissances les forgeront.</p>
              ) : (
                <StatGrid
                  items={[
                    ['Lignées actives', lineages.filter((l) => !l.faded).length],
                    ['Vivants rattachés', lineages.reduce((s, l) => s + l.livingCount, 0)],
                  ]}
                />
              )}
              <button type="button" className="sim-action" onClick={openGenealogy}>
                Généalogie
              </button>
            </Section>
            <Section title="Religions & cultures">
              {cultures.length === 0 && creeds.length === 0 && religionSites.length === 0 ? (
                <p className="sim-empty">Pas encore d’identités émergentes — imitation et voies de foi viendront.</p>
              ) : (
                <>
                  {creeds.length > 0 && (
                    <>
                      <p className="sim-muted" style={{ marginBottom: '0.35rem' }}>
                        Voies de foi (creeds)
                      </p>
                      <StatGrid items={creeds.slice(0, 8).map((c) => [c.label, c.count])} />
                    </>
                  )}
                  {religionSites.length > 0 && (
                    <>
                      <p className="sim-muted" style={{ margin: '0.55rem 0 0.35rem' }}>
                        Autels, chapelles & temples
                      </p>
                      <ul className="sim-groups">
                        {religionSites.map((s) => (
                          <li key={s.villageId}>
                            <div className="sim-group-card">
                              <div className="sim-group-top">
                                <strong>{s.label}</strong>
                                <span className="sim-group-badge">
                                  {s.tierLabel ||
                                    (s.sacredTier === 'temple'
                                      ? 'Temple'
                                      : s.sacredTier === 'chapel'
                                        ? 'Chapelle'
                                        : 'Autel')}
                                </span>
                              </div>
                              <p className="sim-group-meta">
                                Village n°{s.villageId}
                                {s.creedLabel ? ` · « ${s.creedLabel} »` : ''}
                              </p>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                  {cultures.length > 0 && (
                    <>
                      <p className="sim-muted" style={{ margin: '0.55rem 0 0.35rem' }}>
                        Cultures (tags émergents)
                      </p>
                      <StatGrid items={cultures.slice(0, 8).map((c) => [c.label, c.count])} />
                    </>
                  )}
                </>
              )}
            </Section>
            <Section title="Liens sociaux">
              <StatGrid
                items={[
                  ['Amitiés', stats.friendships],
                  ['Inimitiés', stats.feuds],
                  ['Vols', stats.thefts],
                  ['Rixes', stats.brawls],
                ]}
              />
            </Section>
            <Section title="Survie collective">
              <StatGrid
                items={[
                  ['Pain en réserve', stats.totalBread],
                  ['Pièces en circulation', stats.totalCoins],
                ]}
              />
              {stats.famine ? (
                <p className="sim-famine" style={{ marginTop: '0.5rem' }}>
                  La famine pèse sur les normes et les rumeurs.
                </p>
              ) : (
                <p className="sim-muted">Les greniers tiennent — pour le moment.</p>
              )}
            </Section>
          </div>
        )}

        {tab === 'society' && groupsOpen && (
          <div className="sim-stack">
            <div className="sim-groups-head">
              <button type="button" className="sim-back" onClick={() => setGroupsOpen(false)}>
                ← Société
              </button>
              <h3 className="sim-groups-title">Groupes sociaux</h3>
            </div>
            <div className="sim-chips" role="toolbar" aria-label="Filtres des groupes">
              {BASE_GROUP_FILTERS.map((chip) => (
                <button
                  key={chip.id}
                  type="button"
                  className={groupFilter === chip.id ? 'is-on' : ''}
                  onClick={() => setGroupFilter(chip.id)}
                >
                  {chip.label}
                </button>
              ))}
              {kindFilters.map((chip) => (
                <button
                  key={chip.id}
                  type="button"
                  className={groupFilter === chip.id ? 'is-on' : ''}
                  onClick={() => setGroupFilter(chip.id)}
                  title={chip.label}
                >
                  {chip.label.replace(/^cercle (de |des |du )?/, '')}
                </button>
              ))}
            </div>
            {filteredGroups.length === 0 ? (
              <p className="sim-empty">
                {groups.length === 0
                  ? 'Aucun groupe social pour l’instant — les affinités naîtront avec le temps.'
                  : 'Aucun groupe ne correspond à ce filtre.'}
              </p>
            ) : (
              <ul className="sim-groups">
                {filteredGroups.map((g) => {
                  const open = expandedGroupId === g.id
                  return (
                    <li key={g.id} className={open ? 'is-open' : ''}>
                      <button
                        type="button"
                        className="sim-group-card"
                        onClick={() => setExpandedGroupId(open ? null : g.id)}
                        aria-expanded={open}
                      >
                        <div className="sim-group-top">
                          <strong>{g.name}</strong>
                          {g.isGuild && <span className="sim-group-badge">Guilde</span>}
                          {g.isCouncil && !g.isGuild && <span className="sim-group-badge">Conseil</span>}
                          {g.isInstitution && !g.isGuild && !g.isCouncil && (
                            <span className="sim-group-badge">Institution</span>
                          )}
                        </div>
                        <p className="sim-group-meta">
                          {g.kindLabel}
                          {' · '}
                          {g.memberCount} membre{g.memberCount === 1 ? '' : 's'}
                          {g.leaderName ? ` · chef : ${g.leaderName}` : ' · sans chef'}
                        </p>
                        <p className="sim-group-stats">
                          Légitimité {Math.round(g.legitimacy * 100)} %
                          {' · '}
                          réputation {Math.round(g.reputation * 100)} %
                          {g.villageLabel ? ` · ${g.villageLabel}` : ''}
                        </p>
                        <p className="sim-group-summary">{g.summary}</p>
                      </button>
                      {open && (
                        <div className="sim-group-members">
                          <h4>Membres</h4>
                          {g.memberNames.length === 0 ? (
                            <p className="sim-empty">Aucun membre vivant listé.</p>
                          ) : (
                            <p className="sim-kit">
                              {g.memberNames.join(', ')}
                              {g.moreMembers > 0 ? ` · +${g.moreMembers} autre${g.moreMembers > 1 ? 's' : ''}` : ''}
                            </p>
                          )}
                        </div>
                      )}
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        )}

        {tab === 'society' && genealogyOpen && (
          <div className="sim-stack">
            <div className="sim-groups-head">
              <button type="button" className="sim-back" onClick={() => setGenealogyOpen(false)}>
                ← Société
              </button>
              <h3 className="sim-groups-title">Généalogie</h3>
            </div>
            {lineages.length === 0 ? (
              <p className="sim-empty">
                Aucune lignée encore — sélectionnez un villageois pour sa famille, ou attendez les naissances.
              </p>
            ) : (
              <>
                <div className="sim-chips" role="toolbar" aria-label="Tri des lignées">
                  {(
                    [
                      ['wealth', 'Fortune'],
                      ['reputation', 'Réputation'],
                      ['living', 'Vivants'],
                    ] as [LineageSort, string][]
                  ).map(([id, label]) => (
                    <button
                      key={id}
                      type="button"
                      className={lineageSort === id ? 'is-on' : ''}
                      onClick={() => setLineageSort(id)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              <ul className="sim-groups">
                {sortedLineages.map((L) => {
                  const open = expandedLineageId === L.id
                  return (
                    <li key={L.id} className={open ? 'is-open' : ''}>
                      <button
                        type="button"
                        className="sim-group-card"
                        onClick={() => setExpandedLineageId(open ? null : L.id)}
                        aria-expanded={open}
                      >
                        <div className="sim-group-top">
                          <strong>{L.surname}</strong>
                          {L.faded && <span className="sim-group-badge">Mémoire</span>}
                        </div>
                        <p className="sim-group-meta">
                          {L.livingCount} vivant{L.livingCount === 1 ? '' : 's'}
                          {L.deadCount > 0 ? ` · ${L.deadCount} disparu${L.deadCount > 1 ? 's' : ''}` : ''}
                          {L.renamedFrom ? ` · ex-${L.renamedFrom}` : ''}
                        </p>
                        <p className="sim-group-stats">
                          Réputation {Math.round(L.reputation * 100)} %
                          {' · '}
                          fortune ~{Math.round(L.wealthEstimate)}
                        </p>
                        <p className="sim-group-summary">{L.summary}</p>
                      </button>
                      {open && (
                        <div className="sim-group-members">
                          <h4>Membres</h4>
                          {L.memberNames.length === 0 ? (
                            <p className="sim-empty">Aucun vivant listé.</p>
                          ) : (
                            <p className="sim-kit">
                              {L.memberNames.join(', ')}
                              {L.moreMembers > 0 ? ` · +${L.moreMembers} autre${L.moreMembers > 1 ? 's' : ''}` : ''}
                            </p>
                          )}
                          {L.traditions.length > 0 && (
                            <p className="sim-kit" style={{ marginTop: '0.35rem' }}>
                              Traditions : {L.traditions.join(' · ')}
                            </p>
                          )}
                        </div>
                      )}
                    </li>
                  )
                })}
              </ul>
              </>
            )}
          </div>
        )}

        {tab === 'market' && (
          <div className="sim-stack">
            <Section title="Chaînes économiques">
              <CausalList
                rows={causalReadouts.filter((r) =>
                  /prix|credit|firme|pain|marche|pret|confiance|argent|laine|textile|mouton|negoce|reseau|outil/i.test(
                    r.chain + r.detail,
                  ),
                )}
                empty="Les cours et le crédit écriront ici les raisons des changements."
              />
            </Section>
            <Section title="Historique des prix">
              {priceHistoryRows.length === 0 ? (
                <p className="sim-empty">Pas encore d’historique — les cours se rempliront après les premiers clearing.</p>
              ) : (
                <ul className="sim-market">
                  {priceHistoryRows.map((row) => (
                    <li key={row.res}>
                      <div className="sim-market-row">
                        <span>{RESOURCE_LABELS_FR[row.res as keyof typeof RESOURCE_LABELS_FR] ?? row.res}</span>
                        <strong>
                          {row.price.toFixed(1)}
                          <span
                            className={
                              row.deltaPct > 0.5 ? 'sim-delta-up' : row.deltaPct < -0.5 ? 'sim-delta-down' : 'sim-delta-flat'
                            }
                          >
                            {' '}
                            {row.deltaPct > 0 ? '+' : ''}
                            {row.deltaPct}%
                          </span>
                        </strong>
                      </div>
                      <Sparkline values={row.spark} />
                    </li>
                  ))}
                </ul>
              )}
            </Section>
            <Section title="Crédit · confiance · crise">
              <StatGrid
                items={[
                  ['Prêts informels', stats.informalLends ?? 0],
                  ['Livres de crédit', stats.creditBooks ?? 0],
                  ['Confiance moy.', Math.round((stats.creditTrustAvg ?? 0) * 100)],
                  ['Crises crédit', stats.creditCrises ?? 0],
                  ['Institutions crédit', stats.creditInstitutions ?? 0],
                ]}
              />
              {!stats.creditWired && creditRows.length === 0 ? (
                <p className="sim-muted" style={{ marginTop: '0.45rem' }}>
                  Pas encore de crédit — les prêts informels (confiance → pièce) apparaîtront ici.
                </p>
              ) : creditRows.length === 0 ? (
                <p className="sim-empty" style={{ marginTop: '0.45rem' }}>
                  Sac crédit branché, aucun livre encore — un prêteur émergera (Soren).
                </p>
              ) : (
                <ul className="sim-groups" style={{ marginTop: '0.55rem' }}>
                  {creditRows.map((b) => (
                    <li key={b.id}>
                      <div className="sim-group-card">
                        <div className="sim-group-top">
                          <strong>{b.ownerLabel}</strong>
                          <span className="sim-group-badge">{b.phaseLabel}</span>
                        </div>
                        <p className="sim-group-meta">
                          confiance {Math.round(b.publicTrust * 100)} % · souscription{' '}
                          {Math.round(b.underwritingSkill * 100)} %
                          {b.inCrisis ? ' · en crise' : ''}
                          {b.institution ? ' · institution' : ''}
                        </p>
                        <p className="sim-group-stats">
                          prêts {b.activeLoans} · défauts {b.defaults} · dépôts {b.openDeposits} ·
                          réserves {b.reserves} · volume {b.volumeLent}
                        </p>
                        {b.lastEvent ? <p className="sim-group-summary">{b.lastEvent}</p> : null}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Section>
            <Section title="Cours">
              {marketRows.length === 0 ? (
                <p className="sim-empty">Le marché n’a pas encore de cours.</p>
              ) : (
                <ul className="sim-market">
                  {marketRows.map((row) => (
                    <li key={row.res}>
                      <div className="sim-market-row">
                        <span>{RESOURCE_LABELS_FR[row.res] ?? row.res}</span>
                        <strong>{row.price.toFixed(1)}</strong>
                      </div>
                      <div className="sim-bar">
                        <i style={{ transform: `scaleX(${row.t})` }} />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Section>
            <Section title="Filière laine">
              {filterLife(woolRows).length === 0 ? (
                <p className="sim-empty">Pas encore de filière laine.</p>
              ) : (
                <LifeRowsList rows={filterLife(woolRows)} />
              )}
            </Section>
            <Section title="Inventions agricoles">
              {filterLife(agriRows).length === 0 ? (
                <p className="sim-empty">Pas d’outil inventé encore.</p>
              ) : (
                <LifeRowsList rows={filterLife(agriRows)} />
              )}
            </Section>
            <Section title="Stocks visibles">
              <StatGrid items={marketStockItems} />
            </Section>
            <Section title="Firmes · mines · routes">
              <StatGrid
                items={[
                  ['Firmes', stats.firms ?? 0],
                  ['Embauches', stats.firmHires ?? 0],
                  ['Faillites', stats.firmFailures ?? 0],
                  ['Mines', stats.mines ?? 0],
                  ['Routes commerciales', stats.tradeRoutes ?? 0],
                  ['Gisements connus', stats.depositsKnown ?? 0],
                  ['Voyages marchands', stats.tradeRunsTotal ?? 0],
                ]}
              />
              {firmRows.length > 0 && (
                <ul className="sim-groups" style={{ marginTop: '0.55rem' }}>
                  {firmRows.map((f) => (
                    <li key={f.id}>
                      <div className="sim-group-card">
                        <div className="sim-group-top">
                          <strong>{f.kindLabel}</strong>
                          {f.failed ? <span className="sim-group-badge">Faillite</span> : null}
                        </div>
                        <p className="sim-group-meta">
                          {f.ownerName} · {f.workers} ouvrier{f.workers === 1 ? '' : 's'}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Section>
            <Section title="Habitats (tri)">
              <div className="sim-chips" role="toolbar" aria-label="Tri des habitats">
                {(
                  [
                    ['prosperity', 'Prospérité'],
                    ['population', 'Population'],
                    ['crisis', 'Crise'],
                  ] as [SettlementSort, string][]
                ).map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    className={settlementSort === id ? 'is-on' : ''}
                    onClick={() => setSettlementSort(id)}
                  >
                    {label}
                  </button>
                ))}
              </div>
              {sortedSettlements.length === 0 ? (
                <p className="sim-empty">Aucun habitat encore.</p>
              ) : (
                <ul className="sim-groups" style={{ marginTop: '0.45rem' }}>
                  {sortedSettlements.map((s) => (
                    <li key={s.id}>
                      <div className="sim-group-card">
                        <div className="sim-group-top">
                          <strong>{s.label}</strong>
                          <span className="sim-group-badge">{s.crisisLabel}</span>
                        </div>
                        <p className="sim-group-meta">
                          {s.stage} · {s.specialtyLabel} · prosp. {s.prosperity} · {s.population} hab.
                        </p>
                        <p className="sim-group-stats">
                          {s.laborHint}
                          {s.hasMine ? ' · mine' : ''}
                          {s.hasMill ? ' · moulin' : ''}
                          {s.hasMarket ? ' · marché' : ''}
                          {s.hasPort ? ' · port' : ''}
                          {s.crisisPhase === 'rebuild'
                            ? ` · reconstr. ${Math.round(s.rebuildProgress * 100)} %`
                            : ''}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Section>
          </div>
        )}

        {tab === 'atlas' && (
          <div className="sim-stack">
            <Section title="Atlas du royaume">
              <p className="sim-atlas-lead">
                Courbes live — population, survie, prospérité, développement (vérité sim).
              </p>
              <AtlasCharts points={liveSeries} />
            </Section>
            <Section title="Lecture causale">
              <CausalList rows={causalReadouts} empty="Aucune chaîne encore observable." />
            </Section>
            <Section title="Preuves (écarts HARD)">
              {proofStrip.length === 0 ? (
                <p className="sim-empty">—</p>
              ) : (
                <ul className="sim-groups">
                  {proofStrip.map((p) => (
                    <li key={`atlas-${p.id}`}>
                      <div className={['sim-group-card', p.ready ? 'sim-proof-ready' : 'sim-proof-gap'].filter(Boolean).join(' ')}>
                        <div className="sim-group-top">
                          <strong>
                            {p.scenario} · {p.label}
                          </strong>
                          <span className="sim-group-badge">{p.ready ? 'visible' : 'écart'}</span>
                        </div>
                        <p className="sim-group-stats">{p.value}</p>
                        <p className="sim-group-summary">{p.detail}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Section>
            <Section title="Migrants & travail">
              <StatGrid items={[['Envie de partir forte', stats.migrating ?? 0]]} />
              {filterLife(migrantRows).length > 0 && (
                <div style={{ marginTop: '0.55rem' }}>
                  <LifeRowsList rows={filterLife(migrantRows)} />
                </div>
              )}
              {filterLife(laborRows).length > 0 && (
                <div style={{ marginTop: '0.55rem' }}>
                  <LifeRowsList rows={filterLife(laborRows)} />
                </div>
              )}
            </Section>
          </div>
        )}

        {tab === 'log' && (
          <div className="sim-stack">
            <Section title="Archives (3 dernières)">
              {archives.length === 0 ? (
                <p className="sim-empty">Aucune partie archivée — relancer depuis le menu enregistre la run.</p>
              ) : (
                <ul className="sim-archives">
                  {archives.map((a, i) => (
                    <li key={a.id}>
                      <header>
                        <strong>
                          #{i + 1} seed {a.seed}
                        </strong>
                        <span>
                          j{a.summary.days} · pop {a.summary.finalPop}/{a.summary.maxPop}
                        </span>
                      </header>
                      <p>
                        †{a.summary.deaths} · nés {a.summary.births} · maisons {a.summary.houses} · puits{' '}
                        {a.summary.wells} · moulins {a.summary.mills}
                      </p>
                      <p className="sim-archive-causes">
                        {Object.entries(a.summary.causes)
                          .sort((x, y) => y[1] - x[1])
                          .map(([k, n]) => `${k} ${n}`)
                          .join(' · ') || 'causes —'}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </Section>
            <Section title="Chronique de civilisation">
              {chronicle.length === 0 ? (
                <p className="sim-empty">Rien ne s’est encore produit.</p>
              ) : (
                <>
                  <p className="sim-muted" style={{ marginBottom: '0.45rem' }}>
                    Foi, pouvoirs, brigands, chantiers et faits marquants.
                  </p>
                  <ol className="sim-log">
                    {chronicle.map((entry, i) => (
                      <li
                        key={`${i}-${entry.slice(0, 28)}`}
                        className={[i === 0 ? 'is-new' : '', entry.includes(' → ') ? 'is-causal' : ''].filter(Boolean).join(' ')}
                      >
                        {entry}
                      </li>
                    ))}
                  </ol>
                </>
              )}
            </Section>
          </div>
        )}
      </div>
    </aside>
  )
})

function HeroStat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <b>{value}</b>
      <span>{label}</span>
    </div>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="sim-section">
      <h3>{title}</h3>
      {children}
    </section>
  )
}

function CausalList({ rows, empty }: { rows: CausalRow[]; empty: string }) {
  if (rows.length === 0) return <p className="sim-empty">{empty}</p>
  return (
    <ul className="sim-groups">
      {rows.slice(0, 10).map((r) => {
        const parts = r.chain.split(/\s*→\s*|\s*->\s*/)
        return (
          <li key={r.id}>
            <div className="sim-group-card sim-causal-card">
              <div className="sim-causal-chain" aria-label={r.chain}>
                {parts.map((part, i) => (
                  <span key={`${r.id}-${i}`} className="sim-causal-step">
                    {i > 0 ? <span className="sim-causal-arrow">→</span> : null}
                    <strong>{part.trim()}</strong>
                  </span>
                ))}
              </div>
              <p className="sim-group-summary">{r.detail}</p>
            </div>
          </li>
        )
      })}
    </ul>
  )
}

function LifeRowsList({ rows }: { rows: LifeRow[] }) {
  return (
    <ul className="sim-groups">
      {rows.map((r) => (
        <li key={r.id}>
          <div className={['sim-group-card', r.hot ? 'sim-life-hot' : ''].filter(Boolean).join(' ')}>
            <div className="sim-group-top">
              <strong>{r.title}</strong>
              <span className="sim-group-badge">{r.phase}</span>
            </div>
            <p className="sim-group-summary">{r.detail}</p>
          </div>
        </li>
      ))}
    </ul>
  )
}

function Sparkline({ values }: { values: number[] }) {
  if (!values.length) return null
  const max = Math.max(1, ...values)
  const min = Math.min(...values)
  const span = Math.max(0.01, max - min)
  return (
    <div className="sim-spark" aria-hidden>
      {values.map((v, i) => (
        <i key={i} style={{ height: `${18 + ((v - min) / span) * 82}%` }} />
      ))}
    </div>
  )
}

function StatGrid({ items }: { items: [string, number][] }) {
  return (
    <div className="sim-stats">
      {items.map(([label, value]) => (
        <div key={label} className="sim-stat">
          <span>{label}</span>
          <strong>{value}</strong>
        </div>
      ))}
    </div>
  )
}

const Portrait = memo(function Portrait({
  selected,
  nameOf,
  following,
  onFollow,
  onClose,
}: {
  selected: SelectedVillager
  nameOf: (id: number) => string
  following: boolean
  onFollow: () => void
  onClose: () => void
}) {
  const rootRef = useRef<HTMLElement | null>(null)
  useEffect(() => {
    rootRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [selected.id])

  const personality = selected.personality
  const bonds = [...(selected.relations ?? [])]
    .filter((row) => Array.isArray(row) && row.length >= 2 && row[1])
    .sort((a, b) => {
      const sa =
        Math.abs(num(a[1].affinity)) * 1.2 +
        num(a[1].respect) +
        num(a[1].grudge) * 0.9 +
        num(a[1].kinship) * 0.5
      const sb =
        Math.abs(num(b[1].affinity)) * 1.2 +
        num(b[1].respect) +
        num(b[1].grudge) * 0.9 +
        num(b[1].kinship) * 0.5
      return sb - sa
    })
    .slice(0, 6)
  const recalled = [...(selected.memories ?? [])]
    .filter((m) => m && typeof m === 'object')
    .sort((a, b) => num(b.weight) - num(a.weight))
    .slice(0, 4)
  const staminaMax = num(selected.staminaMax, 4) || 4
  const loadCap = Math.max(0.01, num(selected.loadCap, 1))
  const loadMass = num(selected.loadMass)
  const equipment = Array.isArray(selected.equipment) ? selected.equipment.filter(Boolean) : []
  const inventory = Array.isArray(selected.inventory) ? selected.inventory.filter((l) => l && l.type) : []
  const travelBits: string[] = []
  if (selected.embarked) {
    travelBits.push(
      selected.boatKind && BOAT_LABELS[selected.boatKind]
        ? `à bord (${BOAT_LABELS[selected.boatKind]})`
        : 'à bord',
    )
  } else if (selected.mounted) travelBits.push('à cheval')
  if (selected.hasCart) travelBits.push('charrette')
  if (!selected.embarked && selected.boatId !== null && selected.boatKind && BOAT_LABELS[selected.boatKind]) {
    travelBits.push(BOAT_LABELS[selected.boatKind])
  }

  const displayName = selected.fullName || selected.name || `#${selected.id}`
  const alive = selected.alive !== false

  return (
    <article className="sim-portrait" ref={rootRef}>
      <div className="sim-portrait-head">
        <div className="sim-avatar" style={{ background: `hsl(${num(selected.hue, 40)}, 46%, 36%)` }} />
        <div className="sim-portrait-id">
          <h3>{displayName}</h3>
          <p>
            {!alive ? 'Décédé · ' : ''}
            {selected.livelihoodTitle ?? PROFESSION_LABELS[selected.profession] ?? 'sans métier'}
            {selected.unemployed ? ' · sans activité stable' : ''}
            {selected.surname ? ` · ${selected.surname}` : ''}
          </p>
          {(selected.guildName || selected.livelihoodActivities?.length || selected.profession !== 'none') && (
            <p className="sim-kit" style={{ opacity: 0.85, fontSize: '0.85em' }}>
              {selected.guildName ? `${selected.guildName}` : ''}
              {selected.guildName && selected.livelihoodActivities?.length ? ' · ' : ''}
              {selected.livelihoodActivities?.length ? selected.livelihoodActivities.join(' · ') : ''}
              {selected.profession !== 'none' && selected.livelihoodTitle !== PROFESSION_LABELS[selected.profession]
                ? `${selected.guildName || selected.livelihoodActivities?.length ? ' · ' : ''}hint ${PROFESSION_LABELS[selected.profession] ?? selected.profession}`
                : ''}
            </p>
          )}
        </div>
        <button type="button" className="sim-ghost" onClick={onClose} aria-label="Fermer">
          ×
        </button>
      </div>

      <p className="sim-task">
        {selected.task
          ? selected.task.kind === 'rest'
            ? restTaskLabel(selected)
            : (TASK_LABELS[selected.task.kind] ?? selected.task.kind)
          : 'Réfléchit'}
        {travelBits.length > 0 ? ` · ${travelBits.join(' · ')}` : ''}
      </p>
      <p className="sim-ambition">
        Veut {AMBITION_LABELS[selected.ambition] ?? selected.ambition ?? 'survivre'}
        {selected.grudgeTarget !== null && selected.grudgeTarget !== undefined
          ? ` · en veut à ${nameOf(selected.grudgeTarget)}`
          : ''}
      </p>

      <div className="sim-meters">
        <Meter label="Santé" value={num(selected.health)} max={6} color="#e05650" />
        <Meter label="Faim" value={num(selected.hunger)} max={6} color="#e0a045" />
        <Meter label="Endurance" value={num(selected.stamina, staminaMax)} max={staminaMax} color="#7eb8a2" />
        <Meter label="Charge" value={loadMass} max={loadCap} color="#c4a574" decimals={1} />
      </div>
      {selected.biomeLabel ? <p className="sim-kit">Biome : {selected.biomeLabel}</p> : null}

      <div className="sim-portrait-block">
        <h4>Apparence</h4>
        {selected.phenotype?.lines?.length ? (
          <p className="sim-kit">{selected.phenotype.lines.join(' · ')}</p>
        ) : (
          <p className="sim-empty">Traits physiques pas encore exprimés.</p>
        )}
      </div>

      <div className="sim-portrait-block">
        <h4>Personnalité</h4>
        <div className="sim-traits">
          <Trait label="Courage" value={num(personality?.courage, 0.5)} />
          <Trait label="Sociabilité" value={num(personality?.sociability, 0.5)} />
          <Trait label="Ambition" value={num(personality?.ambition, 0.5)} />
          <Trait label="Générosité" value={num(personality?.generosity, 0.5)} />
          <Trait label="Curiosité" value={num(personality?.curiosity, 0.5)} />
        </div>
      </div>

      <div className="sim-portrait-block">
        <h4>Techniques</h4>
        {(selected.knowledgeCount ?? 0) > 0 ? (
          <p className="sim-kit">
            {selected.knowledgeCount} technique{(selected.knowledgeCount ?? 0) > 1 ? 's' : ''}
            {(selected.villageKnowledgeCount ?? 0) > 0
              ? ` · village ${selected.villageKnowledgeCount}`
              : ''}
            {selected.knowledgeLabels?.length
              ? ` — ${selected.knowledgeLabels.join(', ')}`
              : ''}
          </p>
        ) : (
          <p className="sim-empty">
            Aucune technique inventée
            {(selected.villageKnowledgeCount ?? 0) > 0
              ? ` · le village en connaît ${selected.villageKnowledgeCount}`
              : ''}
            .
          </p>
        )}
        {selected.livelihoodRole ? (
          <p className="sim-kit">Rôle émergent : {selected.livelihoodRole.replace(/^legacy_/, 'hint·').replace(/^gen_/, 'pratique·')}</p>
        ) : null}
      </div>

      <div className="sim-portrait-block">
        <h4>Appartenance</h4>
        {(selected.creed ||
          (selected.circleNames?.length ?? 0) > 0 ||
          num(selected.legitimacy) > 0.05 ||
          selected.identity?.cultureTag) ? (
          <p className="sim-kit">
            {selected.creed ? `Creed : ${selected.creedLabel ?? selected.creed}` : 'Sans creed'}
            {num(selected.legitimacy) > 0.05 ? ` · légitimité ${Math.round(num(selected.legitimacy) * 100)} %` : ''}
            {num(selected.grievance) > 0.25 ? ` · grief ${Math.round(num(selected.grievance) * 100)} %` : ''}
            {(selected.circleNames?.length ?? 0) > 0 ? ` · ${selected.circleNames!.join(', ')}` : ''}
          </p>
        ) : (
          <p className="sim-empty">Pas encore de cercle ni de creed.</p>
        )}
        {selected.religionNote ? <p className="sim-kit">{selected.religionNote}</p> : null}
        {selected.identity?.cultureTag && (
          <p className="sim-kit">
            Culture : {selected.identity.cultureTag}
            {num(selected.identity.cultureWeight) > 0.05
              ? ` (${Math.round(num(selected.identity.cultureWeight) * 100)} %)`
              : ''}
          </p>
        )}
        {selected.identity?.diasporaNote && (
          <p className="sim-kit">{selected.identity.diasporaNote}</p>
        )}
        {selected.identity?.birthPlace && (
          <p className="sim-kit">Lieu : {selected.identity.birthPlace}</p>
        )}
      </div>

      {selected.family ? (
        <div className="sim-portrait-block">
          <h4>Famille & lignée</h4>
          <p className="sim-kit">
            {selected.family.lineageName
              ? `Lignée ${selected.family.lineageName}`
              : selected.family.surname
                ? `Nom ${selected.family.surname}`
                : 'Sans lignée nommée'}
            {num(selected.family.lineageReputation) > 0.05
              ? ` · réputation ${Math.round(num(selected.family.lineageReputation) * 100)} %`
              : ''}
            {selected.lineageWealth !== null && num(selected.lineageWealth) > 0.5
              ? ` · fortune ~${Math.round(num(selected.lineageWealth))}`
              : ''}
            {num(selected.descendantCount) > 0
              ? ` · ${selected.descendantCount} descendant${num(selected.descendantCount) > 1 ? 's' : ''}`
              : ''}
            {num(selected.family.livingKin) > 0 ? ` · ${selected.family.livingKin} proches` : ''}
            {num(selected.family.ancestorMemory) > 0.08
              ? ` · mémoire ancestrale ${Math.round(num(selected.family.ancestorMemory) * 100)} %`
              : ''}
          </p>
          {(selected.family.parents?.length ?? 0) > 0 && (
            <p className="sim-kit">Parents : {selected.family.parents.map((p) => p.name).join(', ')}</p>
          )}
          {selected.family.spouse && <p className="sim-kit">Compagnon·ne : {selected.family.spouse.name}</p>}
          {(selected.family.children?.length ?? 0) > 0 && (
            <p className="sim-kit">
              Enfants : {selected.family.children.map((c) => c.name).join(', ')}
              {selected.family.children.length >= 8 ? '…' : ''}
            </p>
          )}
          {(selected.family.siblings?.length ?? 0) > 0 && (
            <p className="sim-kit">Fratrie : {selected.family.siblings.map((s) => s.name).join(', ')}</p>
          )}
          {(selected.family.famousAncestors?.length ?? 0) > 0 && (
            <p className="sim-kit">
              Ancêtres connus :{' '}
              {selected.family.famousAncestors
                .map((a) => {
                  const why =
                    a.reason === 'leader'
                      ? 'chef'
                      : a.reason === 'rich'
                        ? 'fortune'
                        : a.reason === 'chronicled'
                          ? 'chronique'
                          : 'fondateur'
                  return `${a.name} (${why})`
                })
                .join(' · ')}
            </p>
          )}
          {(selected.family.traditions?.length ?? 0) > 0 && (
            <p className="sim-kit">Traditions : {selected.family.traditions.join(' · ')}</p>
          )}
          {(selected.family.pedigree?.length ?? 0) > 1 && (
            <div style={{ marginTop: '0.4rem' }}>
              <h4 style={{ margin: '0 0 0.25rem', fontSize: '0.72rem', letterSpacing: '0.06em', textTransform: 'uppercase', color: '#9aa58d' }}>
                Arbre (profondeur limitée)
              </h4>
              <ul className="sim-inv">
                {selected.family.pedigree
                  .slice()
                  .sort((a, b) => a.depth - b.depth || a.givenName.localeCompare(b.givenName, 'fr'))
                  .slice(0, 12)
                  .map((node) => (
                    <li key={`${node.id}-${node.depth}`}>
                      <span style={{ paddingLeft: `${node.depth * 0.55}rem` }}>
                        {node.depth === 0 ? '● ' : `${'· '.repeat(Math.min(node.depth, 4))}`}
                        {node.surname ? `${node.givenName} ${node.surname}` : node.givenName}
                        {!node.alive ? ' †' : ''}
                      </span>
                      <strong>{node.depth === 0 ? 'soi' : `G+${node.depth}`}</strong>
                    </li>
                  ))}
              </ul>
            </div>
          )}
        </div>
      ) : (
        <div className="sim-portrait-block">
          <h4>Famille & lignée</h4>
          <p className="sim-empty">Module famille pas encore prêt — parenté à venir.</p>
        </div>
      )}

      <div className="sim-portrait-block">
        <h4>Équipement porté</h4>
        {equipment.length === 0 ? (
          <p className="sim-empty">Aucun emplacement corporel.</p>
        ) : (
          <ul className="sim-equip">
            {equipment.map((slot, i) => (
              <li key={slot.slot ?? `slot-${i}`} title={slot.hint ?? undefined}>
                <span className="sim-equip-slot">{slot.slotLabel ?? slot.slot ?? 'slot'}</span>
                <strong className={slot.label ? undefined : 'sim-equip-empty'}>
                  {slot.label ?? '—'}
                </strong>
              </li>
            ))}
          </ul>
        )}
        <p className="sim-kit">
          Prestige {Math.round(num(selected.gearPrestige01) * 100)}%
          {selected.equipmentEffects
            ? ` · chaleur ${num(selected.equipmentEffects.clo).toFixed(1)} clo · protection ${Math.round(num(selected.equipmentEffects.protect) * 100)}% · charge +${Math.round(num(selected.equipmentEffects.carryKg))} kg`
            : ''}
          {num(selected.purseCoins) > 0
            ? ` · bourse ${selected.purseCoins} pièce${num(selected.purseCoins) > 1 ? 's' : ''}`
            : ''}
        </p>
      </div>

      <div className="sim-portrait-block">
        <h4>Foyer & sac</h4>
        <p className="sim-kit">
          {selected.house
            ? `Maison ${SHAPE_LABELS[selected.house.shape] ?? selected.house.shape} ${num(selected.house.rx) * 2 + 1}×${num(selected.house.ry) * 2 + 1}`
            : 'Pas encore de maison'}
          {selected.house?.roomKinds && selected.house.roomKinds.length > 0
            ? ` · ${selected.house.roomKinds.map((k) => ROOM_LABEL_FR[k] ?? k).join(', ')}`
            : ''}
          {' · outils '}
          {TOOL_LABELS[selected.toolTier] ?? selected.toolTier ?? 'aucun'}
          {selected.horseId !== null && selected.horseId !== undefined ? ' · cheval' : ''}
        </p>
        {inventory.length === 0 ? (
          <p className="sim-empty">Sac vide.</p>
        ) : (
          <ul className="sim-inv">
            {inventory.slice(0, 8).map((line, i) => (
              <li key={`${String(line.type)}-${i}`}>
                <span>{resourceLabel(line.type)}</span>
                <strong>×{num(line.count)}</strong>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="sim-split">
        <div>
          <h4>Relations</h4>
          {bonds.length === 0 ? (
            <p className="sim-empty">Personne encore.</p>
          ) : (
            <ul>
              {bonds.map(([id, rel]) => {
                const respect = num(rel.respect)
                const grudge = num(rel.grudge)
                const kin = num(rel.kinship)
                const affinity = num(rel.affinity)
                let label = 'neutre'
                let color = '#a8a29a'
                if (respect > 0.55 && affinity >= 0) {
                  label = 'admiré'
                  color = '#c9a227'
                } else if (grudge > 0.45 || affinity <= -0.55) {
                  label = grudge > 0.55 ? 'rival' : 'ennemi'
                  color = '#e05650'
                } else if (kin > 0.5 || selected.family?.spouse?.id === id) {
                  label = 'famille'
                  color = '#7eb8a2'
                } else if (affinity > 0.6) {
                  label = 'très proche'
                  color = '#6ecf8a'
                } else if (affinity > 0.2) {
                  label = 'ami'
                  color = '#8ecf6a'
                } else if (affinity > -0.2) {
                  label = 'neutre'
                  color = '#a8a29a'
                } else if (affinity > -0.6) {
                  label = 'hostile'
                  color = '#e08850'
                } else {
                  label = 'ennemi'
                  color = '#e05650'
                }
                const bits: string[] = []
                if (respect > 0.4 && label !== 'admiré') bits.push('respect')
                if (grudge > 0.3 && label !== 'rival' && label !== 'ennemi') bits.push('rancune')
                return (
                  <li key={id}>
                    <span>{nameOf(id)}</span>
                    <em style={{ color }}>
                      {label}
                      {bits.length > 0 ? ` · ${bits.join(' · ')}` : ''}
                    </em>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
        <div>
          <h4>Souvenirs</h4>
          {recalled.length === 0 ? (
            <p className="sim-empty">Rien de marquant.</p>
          ) : (
            <ul>
              {recalled.map((m, i) => (
                <li key={i}>
                  {m.subjectId !== null && m.subjectId !== undefined ? `${nameOf(m.subjectId)} — ` : ''}
                  {MEMORY_LABELS[m.kind] ?? m.kind}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="sim-portrait-block sim-cognition">
        <h4>Cognition</h4>
        {selected.cognition ? (
          <>
            <p className="sim-ambition">
              {selected.cognition.processMode ? `${selected.cognition.processMode} · ` : ''}
              But : {selected.cognition.goal ?? '—'}
              {selected.cognition.plan ? ` · plan ${selected.cognition.plan}` : ''}
            </p>
            {selected.cognition.selfModel ? (
              <p className="sim-kit">Soi : {selected.cognition.selfModel}</p>
            ) : null}
            {selected.cognition.conscience ? (
              <div className="sim-conscience">
                <h5>Conscience</h5>
                <p className="sim-kit">
                  {selected.cognition.conscience.mode}
                  {selected.cognition.conscience.process
                    ? ` · ${selected.cognition.conscience.process}`
                    : ''}
                  {typeof selected.cognition.conscience.clarity === 'number'
                    ? ` · clarté ${Math.round(selected.cognition.conscience.clarity * 100)}%`
                    : ''}
                  {typeof selected.cognition.conscience.accessGain === 'number'
                    ? ` · accès ${Math.round(selected.cognition.conscience.accessGain * 100)}%`
                    : ''}
                </p>
                {selected.cognition.conscience.narrativeJe ? (
                  <p className="sim-ambition">{selected.cognition.conscience.narrativeJe}</p>
                ) : null}
                {selected.cognition.conscience.goalAwareness ? (
                  <p className="sim-kit">{selected.cognition.conscience.goalAwareness}</p>
                ) : null}
                {selected.cognition.conscience.feltAffect ? (
                  <p className="sim-kit">Affect ressenti : {selected.cognition.conscience.feltAffect}</p>
                ) : null}
                {(selected.cognition.conscience.awareOf?.length ?? 0) > 0 && (
                  <p className="sim-kit">Conscient de : {selected.cognition.conscience.awareOf!.join(' · ')}</p>
                )}
                {(selected.cognition.conscience.innerSpeech?.length ?? 0) > 0 && (
                  <p className="sim-kit">Parole intérieure : « {selected.cognition.conscience.innerSpeech!.join(' » · « ')} »</p>
                )}
              </div>
            ) : null}
            {(selected.cognition.factorWhy?.length ?? 0) > 0 && (
              <p className="sim-kit">Facteurs : {selected.cognition.factorWhy!.join(' · ')}</p>
            )}
            {(selected.cognition.reasons?.length ?? 0) > 0 && (
              <ul className="sim-why">
                {selected.cognition.reasons!.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            )}
            {(selected.cognition.needs?.length ?? 0) > 0 && (
              <p className="sim-kit">
                Besoins :{' '}
                {selected.cognition.needs!
                  .filter((n) => n)
                  .map((n) => `${n.key ?? '?'} ${Math.round(num(n.value) * 100)}%`)
                  .join(' · ')}
              </p>
            )}
            {(selected.cognition.predictionErrors?.length ?? 0) > 0 && (
              <p className="sim-kit">Erreurs de prédiction : {selected.cognition.predictionErrors!.join(' · ')}</p>
            )}
            {(selected.cognition.emotions?.length ?? 0) > 0 && (
              <p className="sim-kit">
                Émotions :{' '}
                {selected.cognition.emotions!
                  .filter((e) => e)
                  .map((e) => `${e.key ?? '?'} ${Math.round(num(e.value) * 100)}%`)
                  .join(' · ')}
              </p>
            )}
            {(selected.cognition.workspace?.length ?? 0) > 0 && (
              <p className="sim-kit">Espace de travail : {selected.cognition.workspace!.join(' · ')}</p>
            )}
            {(selected.cognition.working?.length ?? 0) > 0 && (
              <p className="sim-kit">Mémoire de travail : {selected.cognition.working!.join(' · ')}</p>
            )}
            {typeof selected.cognition.executive === 'number' ? (
              <p className="sim-kit">Contrôle exécutif : {Math.round(selected.cognition.executive * 100)}%</p>
            ) : null}
            {(selected.cognition.memories?.length ?? 0) > 0 && (
              <p className="sim-kit">Épisodes : {selected.cognition.memories!.join(' · ')}</p>
            )}
            {(selected.cognition.beliefs?.length ?? 0) > 0 && (
              <p className="sim-kit">Croyances : {selected.cognition.beliefs!.join(' · ')}</p>
            )}
            {(selected.cognition.skills?.length ?? 0) > 0 && (
              <p className="sim-kit">Savoir-faire : {selected.cognition.skills!.join(' · ')}</p>
            )}
            {(selected.cognition.preferences?.length ?? 0) > 0 && (
              <p className="sim-kit">Goûts de travail : {selected.cognition.preferences!.join(' · ')}</p>
            )}
            {(selected.cognition.laborThoughts?.length ?? 0) > 0 && (
              <p className="sim-kit">Pensées de labeur : {selected.cognition.laborThoughts!.join(' · ')}</p>
            )}
            {(selected.cognition.thoughts?.length ?? 0) > 0 && (
              <p className="sim-kit">Pensées : {selected.cognition.thoughts!.join(' · ')}</p>
            )}
            {typeof selected.cognition.stress === 'number' && selected.cognition.stress > 0.08 ? (
              <p className="sim-kit">Stress : {Math.round(selected.cognition.stress * 100)}%</p>
            ) : null}
            {selected.cognition.depthHint ? (
              <p className={selected.cognition.depthHint.includes('formation') ? 'sim-empty' : 'sim-kit'}>
                {selected.cognition.depthHint}
              </p>
            ) : null}
          </>
        ) : (
          <p className="sim-empty">Esprit pas encore initialisé.</p>
        )}
      </div>

      <button type="button" className={following ? 'sim-follow is-on' : 'sim-follow'} onClick={onFollow}>
        {following ? 'Ne plus suivre' : `Suivre ${selected.name || displayName}`}
      </button>
    </article>
  )
})

class PortraitBoundary extends Component<
  { selectedId: number; onClose: () => void; children: ReactNode },
  { error: string | null }
> {
  state: { error: string | null } = { error: null }

  static getDerivedStateFromError(err: unknown) {
    return { error: err instanceof Error ? err.message : 'erreur de rendu' }
  }

  componentDidCatch(_err: unknown, _info: ErrorInfo) {
    /* keep panel alive — silent click was caused by an uncaught Portrait throw */
  }

  componentDidUpdate(prev: { selectedId: number }) {
    if (prev.selectedId !== this.props.selectedId && this.state.error) {
      this.setState({ error: null })
    }
  }

  render() {
    if (this.state.error) {
      return (
        <article className="sim-portrait sim-portrait-error">
          <div className="sim-portrait-head">
            <div className="sim-portrait-id">
              <h3>Villageois #{this.props.selectedId}</h3>
              <p className="sim-empty">Portrait indisponible ({this.state.error}).</p>
            </div>
            <button type="button" className="sim-ghost" onClick={this.props.onClose} aria-label="Fermer">
              ×
            </button>
          </div>
        </article>
      )
    }
    return this.props.children
  }
}

function Meter({
  label,
  value,
  max,
  color,
  decimals = 1,
}: {
  label: string
  value: number
  max: number
  color: string
  decimals?: number
}) {
  const safeValue = num(value)
  const safeMax = Math.max(0.01, num(max, 1))
  const t = Math.max(0, Math.min(1, safeValue / safeMax))
  return (
    <div className="sim-meter">
      <div className="sim-meter-label">
        <span>{label}</span>
        <span>
          {safeValue.toFixed(decimals)}/{safeMax.toFixed(decimals === 0 ? 0 : 1)}
        </span>
      </div>
      <div className="sim-bar">
        <i style={{ transform: `scaleX(${t})`, background: color }} />
      </div>
    </div>
  )
}

function Trait({ label, value }: { label: string; value: number }) {
  const v = Math.max(0, Math.min(1, num(value)))
  return (
    <div className="sim-meter">
      <div className="sim-meter-label">
        <span>{label}</span>
        <span>{Math.round(v * 100)}%</span>
      </div>
      <div className="sim-bar">
        <i style={{ transform: `scaleX(${v})` }} />
      </div>
    </div>
  )
}
