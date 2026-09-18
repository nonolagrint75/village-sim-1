# PHASE6_NOTE

**Phase :** 6 — Consolidation causale + societe emergente  
**Owner :** AGENT 1 — ORCHESTRATEUR  
**Date :** 2026-09-17  
**Statut :** **PLAN READY** (STEP1 audit+plan) — **aucun code gameplay** ce tour

## Resume

- Baseline P5 figee : GLOBAL **NON DECLARE** ; PASS_RATE **5 %** (1/20 = §28) ; leaves **16** (regression vs CP5 **22**) ; `migration_camp` **npc UNDER 0/3** ; missionFloorsMet=**false**.
- Compteurs LIVE conserves (ne pas refaire) : CF mem/emo/pers, teachTrue, MF professions, help cats6, creed gen2, food chain, migrate stages.
- Mission P6 = **connecter** les systemes (user §§5–21), pas ajouter 50 mecaniques.
- Bevy `cargo …` = arbre parallele — **ne pas casser le TS**.

## Livrables ce tour

| Fichier | Role |
|---------|------|
| `PHASE6_CAUSALITY_MASTER.md` | Regles, baseline P5, stack P1–P14, WP1–WP16, locks, agents A–F |
| `PHASE6_NOTE.md` | Status (ce fichier) — **PLAN READY** |
| `PHASE6_MIGRATION_AUDIT.md` | Stub template Agent D/A (a remplir) |

## Next (ordre)

1. Agent D (+ A) : remplir `PHASE6_MIGRATION_AUDIT.md` / `ANALYSIS_PHASE6_MIGRATION.md` — bottleneck + leaves 22→16.
2. WP1–2 instrumentation migrate per-NPC — **sans** CREATE_CAMP / leave buff / raise clamp.
3. Puis WP3 fix connexion si trou non intentionnel ; WP4+ connexions mem/emo/… sous locks serial.
4. Soak compare P5 → `PHASE6_CAUSALITY_VALIDATION.md` → **STOP** (pas Phase 7).

## Interdits rapides

- Triche metriques / seuils / harness
- `CREATE_CAMP` pour floors
- Raise clamp 120
- Rewrite food chain / profession PASS
- GLOBAL PASS invente
- Phase 7 auto

---

*PHASE6_NOTE — PLAN READY — GLOBAL NON DECLARE.*