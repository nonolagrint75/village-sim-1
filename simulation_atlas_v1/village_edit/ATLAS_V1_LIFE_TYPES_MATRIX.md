# Atlas v1 - Life Types Matrix (1-20)

**Date :** 2026-09-18T18:22:08.342Z
**Arbre :** `simulation_atlas_v1/village_edit`
**Probe :** `scripts/probe-atlas-v1-life-types.ts` - seeds=1,7 days=35
**Bareme HARD :** LIVE/PASS = >= passMin tags sur **chaque** seed (1+7) ; PARTIAL = un seed / seuil partiel ; FAIL = sinon.
**Regle :** pas de biographies day-timer ; tags observationnels state/log only. Sticky `lifeTagHits` = SOFT (OR-merge DISABLED). Pas d inflation.

## Score global HARD LIVE (causal dual-seed)

| Verdict | Count |
|--------|------:|
| HARD LIVE | 20 |
| PARTIAL | 0 |
| FAIL | 0 |
| **HARD LIVE** | **20/20** |
| **Taux LIVE+PARTIAL** | **100.0%** |

## Matrice

| # | Nom | Verdict | Hits (best) | Seuil PASS | Preuve |
|---|-----|---------|------------:|----------:|--------|
| 1 | Eren (eren) | **LIVE** | 7 | 5 | s1:6/5 [farmer_to_trader,horse_owned,grain_arbitrage,firm_hire] Â· s7:7/5 [farmer_to_trader,horse_owned,grain_arbitrage,firm_hire] |
| 2 | Arvid (arvid) | **LIVE** | 4 | 4 | s1:4/4 [bandit_trauma,militia_lead,war_faction,military_dynasty] Â· s7:4/4 [bandit_trauma,militia_lead,war_faction,military_dynasty] |
| 3 | Mira (mira) | **LIVE** | 5 | 3 | s1:5/3 [cloth_quality,weaver_apprentice,textile_guild,textile_dynasty] Â· s7:5/3 [cloth_quality,weaver_apprentice,textile_guild,textile_dynasty] |
| 4 | Tomas (tomas) | **LIVE** | 5 | 4 | s1:5/4 [heir_firm_risk,firm_bankrupt,labor_organize,political_influence] Â· s7:5/4 [heir_firm_risk,firm_bankrupt,labor_organize,political_influence] |
| 5 | Samir (samir) | **LIVE** | 4 | 3 | s1:4/3 [creed_reinterpret,faith_following,faith_schism,regional_creed] Â· s7:4/3 [creed_reinterpret,faith_following,faith_schism,regional_creed] |
| 6 | Alena (alena) | **LIVE** | 4 | 3 | s1:4/3 [contested_heir,civil_war,merchant_alliance,multigen_kin] Â· s7:4/3 [contested_heir,civil_war,merchant_alliance,multigen_kin] |
| 7 | Boran (boran) | **LIVE** | 5 | 3 | s1:5/3 [herder_caravan,horse_trade,route_blocked,new_trade_route] Â· s7:5/3 [herder_caravan,horse_trade,route_blocked,new_trade_route] |
| 8 | Kael (kael) | **LIVE** | 6 | 4 | s1:5/4 [debt_spiral,caravan_raid,band_organize,zone_control] Â· s7:6/4 [debt_spiral,petty_theft,caravan_raid,band_organize] |
| 9 | Lio (lio) | **LIVE** | 4 | 3 | s1:4/3 [farm_tool_invent,agri_boost,regional_enrich,firm_hire] Â· s7:4/3 [farm_tool_invent,agri_boost,regional_enrich,firm_hire] |
| 10 | Nara (nara) | **LIVE** | 5 | 4 | s1:4/4 [baker_carpenter_bond,spouse_death_hire,apprentice_marries_kin,multigen_kin] Â· s7:5/4 [baker_carpenter_bond,spouse_death_hire,apprentice_marries_kin,fused_firm] |
| 11 | Daren (daren) | **LIVE** | 7 | 5 | s1:6/5 [debt_spiral,city_migration,caravan_raid,gang_chief] Â· s7:7/5 [debt_spiral,city_migration,petty_theft,caravan_raid] |
| 12 | Elian (elian) | **LIVE** | 4 | 3 | s1:4/3 [orphan_migrate,ethnic_quarter,migrant_institution,multigen_kin] Â· s7:4/3 [orphan_migrate,ethnic_quarter,migrant_institution,multigen_kin] |
| 13 | Soren (soren) | **LIVE** | 3 | 3 | s1:3/3 [credit_loan,finance_caravan,trust_survives] Â· s7:3/3 [credit_loan,finance_caravan,credit_crisis] |
| 14 | Yara (yara) | **LIVE** | 4 | 4 | s1:4/4 [herd_expand,wool_boom,trade_town,firm_hire] Â· s7:4/4 [herd_expand,wool_boom,trade_town,firm_hire] |
| 15 | Malik (malik) | **LIVE** | 3 | 3 | s1:3/3 [rich_overspend,raise_rents,firm_bankrupt] Â· s7:3/3 [rich_overspend,raise_rents,firm_bankrupt] |
| 16 | Ema (ema) | **LIVE** | 6 | 4 | s1:6/4 [fisher_voyage,storm_divert,new_trade_route,foreign_goods] Â· s7:6/4 [fisher_voyage,storm_divert,new_trade_route,foreign_goods] |
| 17 | Rami (rami) | **LIVE** | 5 | 4 | s1:5/4 [worker_hostility,wage_cut_strike,labor_institution,repression] Â· s7:5/4 [worker_hostility,wage_cut_strike,labor_institution,repression] |
| 18 | Lysa (lysa) | **LIVE** | 4 | 3 | s1:4/3 [art_apprentice,art_circle,urban_culture,guild_form] Â· s7:3/3 [art_apprentice,urban_culture,guild_form] |
| 19 | Jonas (jonas) | **LIVE** | 5 | 4 | s1:5/4 [friend_dies_war,supply_grievance,refuse_repress,defect_faction] Â· s7:5/4 [friend_dies_war,supply_grievance,refuse_repress,defect_faction] |
| 20 | Ayan (ayan) | **LIVE** | 4 | 3 | s1:4/3 [banal_founder,branch_sectors,multigen_kin,descendants_reshape] Â· s7:4/3 [banal_founder,branch_sectors,multigen_kin,descendants_reshape] |

## FAIL (priorite fix)

_Aucun FAIL ce soak._

## PARTIAL (a durcir vers LIVE dual-seed)

_Aucun PARTIAL ce soak._

## Notes methode

- HARD merge = every seed PASS (refuse soft OR-merge / single-seed cherry-pick).
- Sticky `lifeTagHits` OR-merge DISABLED for HARD â€” bag is soft diagnostic only.
- Ne pas aligner ce taux sur le scorecard soft (~90) ni bulletin inflate.
- Scenarios hold: see `ATLAS_V1_SCENARIO_MATRIX.md` (target 50/0/0).
