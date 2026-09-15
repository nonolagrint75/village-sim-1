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

function num(v: unknown, fallback = 0): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback
}

function resourceLabel(type: unknown): string {
  if (typeof type !== 'string' || !type) return 'ressource'
  return RESOURCE_LABELS_FR[type] ?? type
}

type Tab = 'realm' | 'society' | 'market' | 'log'
type GroupFilter = 'all' | 'circles' | 'institutions' | CircleKind

const TABS: { id: Tab; label: string }[] = [
  { id: 'realm', label: 'Royaume' },
  { id: 'society', label: 'Société' },
  { id: 'market', label: 'Marché' },
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
  groups,
  lineages,
  cultures,
  creeds,
  projects,
  bands,
  religionSites,
  selectedId,
  selected,
  nameOf,
  following,
  onFollow,
  onCloseSelected,
}: {
  stats: SimStats
  chronicle: string[]
  groups: UiGroupRow[]
  lineages: UiLineageRow[]
  cultures: UiCountRow[]
  creeds: UiCountRow[]
  projects: UiProjectRow[]
  bands: UiBandRow[]
  religionSites: UiReligionSiteRow[]
  /** Local click id — show pending portrait even if worker pack is still null. */
  selectedId: number | null
  selected: SelectedVillager | null
  nameOf: (id: number) => string
  following: boolean
  onFollow: () => void
  onCloseSelected: () => void
}) {
  const [tab, setTab] = useState<Tab>('realm')
  const [groupsOpen, setGroupsOpen] = useState(false)
  const [genealogyOpen, setGenealogyOpen] = useState(false)
  const [groupFilter, setGroupFilter] = useState<GroupFilter>('all')
  const [expandedGroupId, setExpandedGroupId] = useState<number | null>(null)
  const [expandedLineageId, setExpandedLineageId] = useState<number | null>(null)
  const seasonColor = SEASON_COLORS[stats.season]
  const marketRows = useMemo(() => {
    const rows = Object.entries(stats.prices).filter(([, p]) => typeof p === 'number') as [string, number][]
    rows.sort((a, b) => b[1] - a[1])
    const max = Math.max(1, ...rows.map(([, p]) => p))
    return rows.map(([res, price]) => ({ res, price, t: price / max }))
  }, [stats.prices])
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
          <p className="sim-kicker">Civilisation vivante</p>
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
                      ['Institutions', stats.institutions ?? 0],
                    ]}
                  />
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
            <Section title="Peuple">
              <StatGrid
                items={[
                  ['Naissances', stats.births],
                  ['Morts', stats.deaths],
                  ['Morts (loups)', stats.deathsByWolf],
                  ['Morts (brigands)', stats.deathsByBandit ?? 0],
                  ['Loups', stats.wolves],
                  ['Brigands', stats.bandits ?? 0],
                  ['Bandes', stats.bands ?? 0],
                  ['Moutons', stats.sheep],
                ]}
              />
            </Section>
            <Section title="Brigands">
              {(stats.bandits ?? 0) === 0 && bands.length === 0 ? (
                <p className="sim-empty">
                  Aucune bande encore — la misère et l’errance en feront naître hors des villages.
                </p>
              ) : (
                <>
                  <StatGrid
                    items={[
                      ['Brigands vivants', stats.bandits ?? 0],
                      ['Bandes', Math.max(stats.bands ?? 0, bands.length)],
                      ['Morts causées', stats.deathsByBandit ?? 0],
                    ]}
                  />
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
                              {b.raids} razzia{b.raids === 1 ? '' : 's'} · {b.campLabel}
                            </p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              )}
            </Section>
            <Section title="Religions & voies">
              {creeds.length === 0 && religionSites.length === 0 ? (
                <p className="sim-empty">
                  Pas encore de voie de foi — piété, rites et autels émergent avec le temps.
                </p>
              ) : (
                <>
                  {creeds.length > 0 && (
                    <StatGrid items={creeds.slice(0, 8).map((c) => [c.label, c.count])} />
                  )}
                  {religionSites.length > 0 && (
                    <ul className="sim-groups" style={{ marginTop: '0.55rem' }}>
                      {religionSites.map((s) => (
                        <li key={s.villageId}>
                          <div className="sim-group-card">
                            <div className="sim-group-top">
                              <strong>{s.label}</strong>
                              {s.hasShrine && <span className="sim-group-badge">Autel</span>}
                            </div>
                            <p className="sim-group-meta">
                              Village n°{s.villageId}
                              {s.creedLabel ? ` · « ${s.creedLabel} »` : ''}
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
              {projects.length === 0 ? (
                <p className="sim-empty">
                  Aucun chantier collectif — remparts, donjons et autels apparaîtront sous menace ou ambition.
                </p>
              ) : (
                <ul className="sim-groups">
                  {projects.map((p) => (
                    <li key={p.id}>
                      <div className="sim-group-card">
                        <div className="sim-group-top">
                          <strong>{p.label}</strong>
                          {p.isFort && <span className="sim-group-badge">Fort</span>}
                          {p.isShrine && <span className="sim-group-badge">Autel</span>}
                          {p.phase === 'done' && !p.isFort && !p.isShrine && (
                            <span className="sim-group-badge">Achevé</span>
                          )}
                        </div>
                        <p className="sim-group-meta">
                          {p.phaseLabel}
                          {p.purposes.length > 0 ? ` · ${p.purposes.join(', ')}` : ''}
                          {p.villageLabel ? ` · ${p.villageLabel}` : ''}
                        </p>
                        <p className="sim-group-stats">{p.progressNote}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Section>
            <Section title="Habitats & travail">
              <StatGrid
                items={[
                  ['Maisons', stats.houses],
                  ['Champs', stats.fields],
                  ['Enclos', stats.pens],
                  ['Moulins', stats.mills],
                  ['Ports', stats.ports],
                  ['Marchés', stats.markets ?? 0],
                  ['Bateaux', stats.boats],
                ]}
              />
            </Section>
            <Section title="Réseau & défense">
              <StatGrid
                items={[
                  ['Sentiers / routes', stats.roadTiles],
                  ['Ponts', stats.bridges],
                  ['Enceinte', stats.wallTiles],
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
                    ['Rumeurs', stats.rumors ?? 0],
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
              <button type="button" className="sim-action" onClick={openGroups}>
                Voir les groupes
              </button>
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
                        Autels & lieux sacrés
                      </p>
                      <StatGrid
                        items={religionSites.map((s) => [
                          s.label,
                          s.hasShrine ? 1 : 0,
                        ])}
                      />
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
                          {g.isInstitution && <span className="sim-group-badge">Institution</span>}
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
              <ul className="sim-groups">
                {lineages.map((L) => {
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
            )}
          </div>
        )}

        {tab === 'market' && (
          <div className="sim-stack">
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
            <Section title="Stocks visibles">
              <StatGrid
                items={[
                  ['Pain', stats.totalBread],
                  ['Pièces', stats.totalCoins],
                ]}
              />
            </Section>
          </div>
        )}

        {tab === 'log' && (
          <div className="sim-stack">
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
        {selected.task ? TASK_LABELS[selected.task.kind] ?? selected.task.kind : 'Réfléchit'}
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
