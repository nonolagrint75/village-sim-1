/**
 * Atlas v1 life-type evidence - observational tag hits, not scripted biographies.
 * HARD grades: tags require pack bags and/or specific chronicle phrases. Weak proxies rejected.
 */
import { firmsSummary } from '../economy/business'
import { warsSummary } from '../war'
import type { SimState } from '../types'

export type LifeTypeId =
  | 'eren' | 'arvid' | 'mira' | 'tomas' | 'samir' | 'alena' | 'boran' | 'kael' | 'lio' | 'nara'
  | 'daren' | 'elian' | 'soren' | 'yara' | 'malik' | 'ema' | 'rami' | 'lysa' | 'jonas' | 'ayan'

export type LifeTypeVerdict = 'PASS' | 'PARTIAL' | 'FAIL'

export type LifeTypeDef = {
  id: LifeTypeId
  name: string
  index: number
  tags: string[]
  passMin: number
  partialMin: number
}

export const LIFE_TYPE_DEFS: LifeTypeDef[] = [
  { id: 'eren', name: 'Eren', index: 1, tags: ['farmer_to_trader','horse_owned','grain_arbitrage','firm_hire','merchant_marriage','firm_succession','guild_form','child_career_diverge'], passMin: 5, partialMin: 3 },
  { id: 'arvid', name: 'Arvid', index: 2, tags: ['farmer_to_guard','bandit_trauma','militia_lead','war_faction','land_inherit','military_dynasty'], passMin: 4, partialMin: 2 },
  { id: 'mira', name: 'Mira', index: 3, tags: ['cloth_quality','weaver_apprentice','textile_guild','textile_dynasty','firm_hire'], passMin: 3, partialMin: 2 },
  { id: 'tomas', name: 'Tomas', index: 4, tags: ['heir_firm_risk','firm_bankrupt','house_lost','labor_organize','political_influence','child_career_diverge'], passMin: 4, partialMin: 2 },
  { id: 'samir', name: 'Samir', index: 5, tags: ['creed_reinterpret','faith_following','famine_charity','faith_schism','regional_creed'], passMin: 3, partialMin: 2 },
  { id: 'alena', name: 'Alena', index: 6, tags: ['contested_heir','civil_war','merchant_alliance','political_reward','multigen_kin'], passMin: 3, partialMin: 2 },
  { id: 'boran', name: 'Boran', index: 7, tags: ['herder_caravan','horse_trade','route_blocked','new_trade_route','trade_town'], passMin: 3, partialMin: 2 },
  { id: 'kael', name: 'Kael', index: 8, tags: ['debt_spiral','petty_theft','caravan_raid','band_organize','zone_control','bandit_deal'], passMin: 4, partialMin: 2 },
  { id: 'lio', name: 'Lio', index: 9, tags: ['farm_tool_invent','agri_boost','regional_enrich','firm_hire'], passMin: 3, partialMin: 2 },
  { id: 'nara', name: 'Nara', index: 10, tags: ['baker_carpenter_bond','spouse_death_hire','apprentice_marries_kin','fused_firm','multigen_kin','kin_split_war'], passMin: 4, partialMin: 2 },
  { id: 'daren', name: 'Daren', index: 11, tags: ['debt_spiral','city_migration','unemployment','petty_theft','caravan_raid','gang_chief','bounty_hunt','parallel_force','bandit_deal'], passMin: 5, partialMin: 3 },
  { id: 'elian', name: 'Elian', index: 12, tags: ['orphan_migrate','carpenter_apprentice','ethnic_quarter','migrant_institution','multigen_kin'], passMin: 3, partialMin: 2 },
  { id: 'soren', name: 'Soren', index: 13, tags: ['credit_loan','deposits','finance_caravan','credit_crisis','trust_survives'], passMin: 3, partialMin: 2 },
  { id: 'yara', name: 'Yara', index: 14, tags: ['herd_expand','wool_boom','wool_bust','quality_specialize','trade_town','firm_hire'], passMin: 4, partialMin: 2 },
  { id: 'malik', name: 'Malik', index: 15, tags: ['rich_overspend','raise_rents','creditor_seize','dynasty_split','firm_bankrupt'], passMin: 3, partialMin: 2 },
  { id: 'ema', name: 'Ema', index: 16, tags: ['fisher_voyage','storm_divert','new_trade_route','foreign_goods','culture_copy','trade_network'], passMin: 4, partialMin: 2 },
  { id: 'rami', name: 'Rami', index: 17, tags: ['worker_hostility','wage_cut_strike','labor_institution','repression','army_refuses','gov_collapse'], passMin: 4, partialMin: 2 },
  { id: 'lysa', name: 'Lysa', index: 18, tags: ['art_apprentice','patron_buy','art_circle','urban_culture','guild_form'], passMin: 3, partialMin: 2 },
  { id: 'jonas', name: 'Jonas', index: 19, tags: ['soldier_loyal','friend_dies_war','supply_grievance','refuse_repress','defect_faction','civil_war_command'], passMin: 4, partialMin: 2 },
  { id: 'ayan', name: 'Ayan', index: 20, tags: ['banal_founder','branch_sectors','multigen_kin','kin_split_war','descendants_reshape'], passMin: 3, partialMin: 2 },
]

function logHas(log: string[], re: RegExp): boolean {
  for (let i = log.length - 1; i >= 0; i--) if (re.test(log[i]!)) return true
  return false
}

function softBag<T>(state: SimState, key: string): T | undefined {
  return (state as SimState & Record<string, T | undefined>)[key]
}

/** Strict observational tags - no broad substring traps (e.g. /art/ in quartier). */
export function collectLifeTypeTagHits(state: SimState): Record<string, boolean> {
  const log = state.log ?? []
  const firms = firmsSummary(state)
  const wars = warsSummary(state)
  const weavers = state.villagers.filter((v) => v.alive && v.profession === 'weaver').length
  const herders = state.villagers.filter((v) => v.alive && v.profession === 'herder').length
  const traders = state.villagers.filter((v) => v.alive && v.profession === 'trader').length
  const guards = state.villagers.filter((v) => v.alive && v.profession === 'guard').length
  const builders = state.villagers.filter(
    (v) => v.alive && (v.profession === 'builder' || v.profession === 'mason'),
  ).length
  const sheep = state.sheep?.filter((s) => s.alive).length ?? 0
  const guilds = state.circles.filter((c) => c.isGuild).length
  const faith = state.circles.filter((c) => c.kind === 'faith').length
  const institutions = state.circles.filter((c) => c.isInstitution).length
  const married = state.villagers.filter((v) => v.alive && v.spouseId != null).length
  const formed = state.marriageFormedCount ?? 0
  const births = state.births ?? 0
  const kids = state.villagers.filter((v) => v.alive && v.parentIds.length > 0).length
  const bandits = state.bandits?.length ?? 0
  const thefts = state.thefts ?? 0
  const deserters = state.deserters ?? 0
  const ports = state.villages.filter((v) => v.hasPort).length
  const merchantNets = softBag<unknown[]>(state, 'merchantNetworks')?.length ?? 0
  const wool = softBag<{ phase?: string }>(state, 'woolIndustry')
  const creditBooks = softBag<{ loans?: unknown[]; phase?: string }[]>(state, 'creditBooks') ?? []
  const labor = softBag<unknown[]>(state, 'laborMovements')?.length ?? 0
  const migrants = softBag<{ quarters?: unknown[]; phase?: string }>(state, 'migrantQuarters')
  const agri = softBag<unknown[]>(state, 'agriInventions')?.length ?? 0
  const milDyn = softBag<unknown[]>(state, 'militaryDynasties')?.length ?? 0
  const succession = softBag<unknown[]>(state, 'successionCrises')?.length ?? 0
  const guildPads = softBag<unknown[]>(state, 'guildPads')?.length ?? 0
  const artScenes = softBag<{ phase?: string }[]>(state, 'artScenes') ?? []
  const milFac = softBag<{ phase?: string }[]>(state, 'militaryFactions') ?? []
  const exploreRoutes = softBag<{ routes?: { status?: string; discoveryKind?: string | null; volume?: number; shockGoods?: string[] }[]; towns?: unknown[] }>(state, 'exploreRoutes')
  const parallelGangs = softBag<{ phase?: string; zoneControl?: number; raids?: number; deals?: unknown[] }[]>(state, 'parallelGangs') ?? []
  const dynastyHouses = softBag<{ phase?: string; rentMultiplier?: number; prestigeSink?: number; mansion?: boolean; claims?: { seized?: boolean }[]; branches?: unknown[] }[]>(state, 'dynastyHouses') ?? []
  const kin = softBag<{ people?: Map<unknown, unknown> | Record<string, unknown> }>(state, 'kinGraph')
  const kinPeople =
    kin?.people instanceof Map
      ? kin.people.size
      : kin?.people
        ? Object.keys(kin.people).length
        : 0
  const tiers = new Set(state.polities?.map((p) => p.tier) ?? [])
  const townish = [...tiers].some((t) => t === 'chiefdom' || t === 'kingdom')
  const richHomes = state.villagers.filter((v) => v.alive && (v.bedCount ?? 0) >= 4).length
  const activeLoans = creditBooks.reduce((n, b) => n + (b.loans?.length ?? 0), 0)

  const hits: Record<string, boolean> = {
    // Eren - need merchant pack / trader career, not mere sells
    farmer_to_trader: traders > 0 || merchantNets > 0 || logHas(log, /paysan.*commer|devient.*marchand|farmer.?to.?trader|r[eé]seau marchand/i),
    horse_owned: logHas(log, /\bcheval\b|horse.?own/i) || (merchantNets > 0 && logHas(log, /cheval|monture/i)),
    grain_arbitrage: logHas(log, /arbitrage|c[eé]r[eé]ales?.*(prix|vend)|grain.?arbitrage/i),
    firm_hire: firms.hires > 0,
    merchant_marriage: (formed > 0 || married > 0) && (traders > 0 || merchantNets > 0) && logHas(log, /alliance de deux familles|mariage/i),
    firm_succession: logHas(log, /succession.*(firme|atelier)|h[eé]rit.*firme|firme.*succ/i),
    guild_form: guilds > 0 || guildPads > 0 || logHas(log, /\bguilde\b/i),
    child_career_diverge: kids > 0 && logHas(log, /enseigne|apprend|forme .* dans/i),

    // Arvid
    farmer_to_guard: guards > 0 || logHas(log, /devient.*garde|paysan.*milice|farmer.?to.?guard/i),
    bandit_trauma: logHas(log, /trauma.*bandit|atterr[eé].*bandit|attaque de bandits/i) || (bandits > 0 && milDyn > 0),
    militia_lead: milDyn > 0 || logHas(log, /milice|chef de garde|capitaine/i),
    war_faction: wars.active > 0 || (wars.battles >= 3 && wars.coups > 0),
    land_inherit: logHas(log, /h[eé]rite?(r| )?(la |des )?terre|transmission.*terre|land.?inherit/i),
    military_dynasty: milDyn > 0 || logHas(log, /dynastie militaire/i),

    // Mira
    cloth_quality: weavers > 0 && logHas(log, /laine|tisser|cloth|qualit[eé].*tissu/i),
    weaver_apprentice: weavers > 0,
    textile_guild: guilds > 0 && weavers > 0,
    textile_dynasty: weavers > 0 && kids > 0 && births > 0,

    // Tomas
    heir_firm_risk: firms.firms > 0 && activeLoans > 0 && logHas(log, /risque|dette|h[eé]rit/i),
    firm_bankrupt: firms.failures > 0 || logHas(log, /faillite/i),
    house_lost: logHas(log, /perd(t)? (sa |la )?maison|saisie.*maison|sans abri/i),
    labor_organize: labor > 0 || logHas(log, /gr[eè]ve|mouvement ouvrier|organise.*travail/i),
    political_influence: wars.coups > 0 && institutions > 0,

    // Samir
    creed_reinterpret: logHas(log, /change de conviction|r[eé]interpr[eé]t|nouvelle voie/i),
    faith_following: faith > 0 && logHas(log, /foi|creed|conviction|enseigne la voie/i),
    famine_charity: logHas(log, /charit[eé]|donne.*nourriture|secours.*faim/i) || (!!state.famine && logHas(log, /charit|secours/i)),
    faith_schism: logHas(log, /schisme religieux|faith_schism|schisme/i),
    regional_creed: faith >= 2,

    // Alena
    contested_heir: succession > 0 || logHas(log, /succession contest|h[eé]ritier contest/i),
    civil_war: logHas(log, /guerre civile|renverse|coup d.[eé]tat/i) || (wars.coups >= 2 && wars.battles >= 2),
    merchant_alliance: logHas(log, /s.allient contre|alliance.*marchand|alliance de deux familles/i) && traders + merchantNets > 0,
    political_reward: logHas(log, /r[eé]compense politique|titre|l[eé]gitimit[eé].*renfor/i),
    multigen_kin: kinPeople >= 6 || (births >= 3 && kids >= 2 && formed > 0),

    // Boran
    herder_caravan: herders > 0 && (sheep > 8 || (exploreRoutes?.towns?.length ?? 0) > 0 || logHas(log, /caravane|troupeau/i)),
    horse_trade: logHas(log, /commerce.*cheval|vend.*cheval|horse.?trade/i),
    route_blocked: (exploreRoutes?.routes?.some((r) => r.status === 'blocked_war' || r.status === 'rerouted') ?? false) || logHas(log, /route.*(bloqu|coup)|sentier coup/i),
    new_trade_route: (exploreRoutes?.routes?.some((r) => r.status === 'open' || r.status === 'discovered' || r.status === 'rerouted') ?? false) || logHas(log, /nouvelle route|ouvre.*route|route commerciale/i),
    trade_town: (exploreRoutes?.towns?.length ?? 0) > 0 || (townish && firms.sells >= 8),

    // Kael / Daren crime path - need real crime signals
    debt_spiral: activeLoans >= 2 || logHas(log, /spirale.*dette|surendettement|debt.?spiral/i),
    petty_theft: thefts > 0 || logHas(log, /\bvol\b|larcin|d[eé]robe/i),
    caravan_raid: parallelGangs.some((g) => (g.raids ?? 0) > 0) || logHas(log, /embuscade|attaque.*caravane|raid.*caravane/i),
    band_organize: parallelGangs.length > 0 || bandits >= 2 || logHas(log, /bande de|gang|organise.*bandit/i),
    zone_control: parallelGangs.some((g) => (g.zoneControl ?? 0) > 0.1) || (bandits > 0 && logHas(log, /contr[oô]le.*zone|territoire.*bandit|parallel/i)),
    bandit_deal: parallelGangs.some((g) => (g.deals?.length ?? 0) > 0 || g.phase === 'allied' || g.phase === 'negotiating') || logHas(log, /n[eé]gocie.*bandit|traite avec|rachat.*bandit|bandit.?deal/i),
    gang_chief: logHas(log, /chef de bande|chef.*bandit|gang.?chief/i) || bandits >= 3,
    bounty_hunt: logHas(log, /\bprime\b|chasse.*bandit|mandat/i),
    parallel_force: bandits > 0 && wars.battles > 0 && logHas(log, /force parall[eè]le|milice ill[eé]gale|clandestin/i),
    city_migration: logHas(log, /s.installe|rejoint le village|attir[eé] par|migration/i),
    unemployment: logHas(log, /sans travail|ch[oô]mage|mis[eè]re|mal pay[eé]/i),

    // Elian
    orphan_migrate: !!migrants || logHas(log, /orphelin|migrant|quartiers? migr/i),
    carpenter_apprentice: builders > 0 && logHas(log, /apprenti|charpent|builder/i),
    ethnic_quarter: !!migrants && logHas(log, /quartier|ethnos|culture/i),
    migrant_institution: !!migrants && institutions > 0,

    // Soren
    credit_loan: activeLoans > 0 || logHas(log, /pr[eê]te de l.argent|loan_accepted/i),
    deposits: creditBooks.length > 0 && logHas(log, /d[eé]p[oô]t|livre de cr[eé]dit|r[eé]serves/i),
    finance_caravan: activeLoans > 0 && firms.sells > 5 && logHas(log, /caravane|finance|pr[eê]t/i),
    credit_crisis: creditBooks.some((b) => b.phase === 'crisis' || b.phase === 'bankrupt') ||
      logHas(log, /crise.*cr[eé]dit|d[eé]faut de paiement/i),
    trust_survives: activeLoans > 0 && firms.sells > 0 && !creditBooks.some((b) => b.phase === 'bankrupt'),

    // Yara
    herd_expand: herders > 0 && sheep >= 20,
    wool_boom: weavers > 0 && sheep >= 15 && firms.sells > 5,
    wool_bust: wool?.phase === 'bust' || logHas(log, /surproduction|crash.*laine|wool.?bust/i),
    quality_specialize: weavers > 0 && guilds > 0 && logHas(log, /qualit[eé]|sp[eé]cialis/i),

    // Malik
    rich_overspend: dynastyHouses.some((h) => h.mansion || (h.prestigeSink ?? 0) > 0.2) || (richHomes > 0 && logHas(log, /d[eé]penses|luxe|prestige|mansion|demeure/i)),
    raise_rents: dynastyHouses.some((h) => (h.rentMultiplier ?? 1) > 1.05) || logHas(log, /loyer|rente|raise.?rent/i),
    creditor_seize: dynastyHouses.some((h) => h.phase === 'creditor_seize' || (h.claims ?? []).some((c) => c.seized)) || logHas(log, /saisie|cr[eé]ancier|creditor.?seize/i),
    dynasty_split: dynastyHouses.some((h) => h.phase === 'branch_split' || (h.branches?.length ?? 0) > 0) || logHas(log, /scission.*lign|branche.*s[eé]pare|dynasty.?split/i) || (kinPeople >= 10 && wars.coups > 0),

    // Ema
    fisher_voyage: ports > 0 || logHas(log, /p[eê]che|barque|port|voyage maritime/i),
    storm_divert: (exploreRoutes?.routes?.some((r) => r.discoveryKind === 'storm_divert') ?? false) || logHas(log, /temp[eê]te|orage|d[eé]tourn.*route/i),
    foreign_goods: (exploreRoutes?.routes?.some((r) => (r.shockGoods?.length ?? 0) > 0) ?? false) || logHas(log, /import|[eé]tranger|exotique|foreign/i),
    culture_copy: logHas(log, /imite|copie.*culture|culture.?copy|syncr[eé]/i),
    trade_network: merchantNets > 0 || (firms.sells >= 15 && townish),

    // Rami
    worker_hostility: labor > 0 || logHas(log, /hostilit[eé].*ouvri|col[eè]re.*salaire/i),
    wage_cut_strike: labor > 0 || logHas(log, /gr[eè]ve|baisse.*salaire|wage.?cut/i),
    labor_institution: labor > 0 && institutions > 0,
    repression: logHas(log, /r[eé]pression|r[eé]prime|force l.ordre/i),
    army_refuses: logHas(log, /arm[eé]e refuse|refuse de r[eé]primer|d[eé]sob[eé]it/i),
    gov_collapse: logHas(log, /effondre|gouvernement.*chute|gov.?collapse/i) || (wars.coups >= 3 && institutions === 0),

    // Lysa - NEVER match bare /art/
    art_apprentice: artScenes.length > 0 || logHas(log, /apprenti.*art|peintre|sculpteur|atelier d.art|art.?apprentice/i),
    patron_buy: artScenes.some((s) => s.phase === 'patronized' || s.phase === 'art_circle' || s.phase === 'elite_funding') || logHas(log, /m[eé]c[eè]ne|patron.*ach[eè]te|commande.*[oœ]uvre/i),
    art_circle: artScenes.some((s) => s.phase === 'art_circle' || s.phase === 'salon') || logHas(log, /cercle d.art|cercle artistique|art.?circle/i),
    urban_culture: (townish && artScenes.length > 0) || logHas(log, /culture urbaine|architecture publique/i),

    // Jonas
    soldier_loyal: milFac.some((f) => f.phase === 'loyal' || f.phase === 'grieving') || (guards > 0 && milDyn > 0),
    friend_dies_war: milFac.some((f) => f.phase === 'grieving' || f.phase === 'officer_discontent') || ((state.deaths ?? 0) >= 2 && wars.battles >= 3 && logHas(log, /ami tomb|deuil militaire|meurt|mort/i)),
    supply_grievance: milFac.some((f) => f.phase === 'supply_stress' || f.phase === 'officer_discontent') || logHas(log, /ravitaillement|supply|vivres.*manque/i),
    refuse_repress: milFac.some((f) => f.phase === 'refuse_repress') || logHas(log, /refuse.*r[eé]press|refuse d.ob[eé]ir/i),
    defect_faction: milFac.some((f) => f.phase === 'defected' || f.phase === 'civil_war_command') || logHas(log, /defect|change de camp|trahison/i),
    civil_war_command: milFac.some((f) => f.phase === 'civil_war_command') || (wars.coups > 0 && wars.battles >= 3 && logHas(log, /commande|prend le commandement|civil.?war/i)),

    // Ayan
    banal_founder: births >= 2 && kids >= 2,
    branch_sectors: firms.firms >= 3 && ((weavers > 0 ? 1 : 0) + (herders > 0 ? 1 : 0) + (traders > 0 ? 1 : 0)) >= 2,
    kin_split_war: kinPeople >= 4 && wars.battles >= 2 && logHas(log, /guerre|bataille|conflit/i),
    descendants_reshape: kids >= 4 && (institutions > 0 || guilds > 0) && townish,

    // Lio
    farm_tool_invent: agri > 0 || logHas(log, /invention|nouvel outil|charrue|farm.?tool/i),
    agri_boost: agri > 0 || logHas(log, /rendement|agri.*boost|r[eé]colte.*am[eé]lior/i),
    regional_enrich: townish && firms.sells >= 12,

    // Nara
    baker_carpenter_bond: (formed > 0 || logHas(log, /alliance de deux familles/i)) && builders + weavers >= 0,
    spouse_death_hire: (state.deaths ?? 0) > 0 && firms.hires > 0 && logHas(log, /veuf|veuve|mort.*conjoint|spouse/i),
    apprentice_marries_kin: formed > 0 && kids > 0 && logHas(log, /apprenti|marie/i),
    fused_firm: firms.firms > 0 && formed > 0 && logHas(log, /fusion|firme.*unie|fused/i),
  }

  // baker_carpenter_bond: require actual inter-craft marriage signal OR alliance + craft professions
  hits.baker_carpenter_bond =
    (formed > 0 || logHas(log, /alliance de deux familles/i)) &&
    (builders > 0 || state.villagers.some((v) => v.alive && (v.profession === 'miller' || v.profession === 'weaver')))

  // Sticky lifeTagHits = SOFT only (log-rotate convenience). DISABLED for HARD grade -
  // LIVE requires causal dual-seed state/chronicle evidence per tag, not bag OR-merge.
  // void state.lifeTagHits

  return hits
}

export type LifeTypeRow = {
  index: number
  id: LifeTypeId
  name: string
  verdict: LifeTypeVerdict
  hitCount: number
  passMin: number
  partialMin: number
  hitTags: string[]
  missTags: string[]
}

export function evaluateLifeTypeEvidence(state: SimState): LifeTypeRow[] {
  const tagHits = collectLifeTypeTagHits(state)
  return LIFE_TYPE_DEFS.map((def) => {
    const hitTags = def.tags.filter((t) => tagHits[t])
    const missTags = def.tags.filter((t) => !tagHits[t])
    const hitCount = hitTags.length
    let verdict: LifeTypeVerdict = 'FAIL'
    if (hitCount >= def.passMin) verdict = 'PASS'
    else if (hitCount >= def.partialMin) verdict = 'PARTIAL'
    return {
      index: def.index,
      id: def.id,
      name: def.name,
      verdict,
      hitCount,
      passMin: def.passMin,
      partialMin: def.partialMin,
      hitTags,
      missTags,
    }
  })
}
