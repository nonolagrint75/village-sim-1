# Simulation run logs

Les **3 dernières** parties lancées depuis l’UI (ou archivées) sont écrites ici quand le serveur Vite tourne.

| Fichier | Contenu |
|---------|---------|
| `index.json` | Liste des 3 archives (résumés + séries) |
| `latest.json` | Dernière run complète |
| `run_*.json` | Une archive par run |

Chaque archive contient : seed, durée, pop max/finale, morts/naissances, causes de mort (heuristique chronique), série journalière (population, faim, infra…).

L’agent peut lire ces fichiers pour diagnostiquer un wipe / bug après une partie GUI.
