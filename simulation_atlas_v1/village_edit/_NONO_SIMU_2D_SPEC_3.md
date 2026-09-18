tu ne dois en aucun cas t'arreter du moment que ces prompt ne sont pas atteint : # NONO_SIMU_2D

# SPÉCIFICATION VISUELLE COMPLÈTE

## 1. PHILOSOPHIE VISUELLE

La simulation doit visuellement ressembler à un **monde vivant observé d'en haut**, pas à une interface de gestion avec des icônes posées sur une carte.

Le joueur doit pouvoir regarder la carte sans ouvrir aucun panneau et comprendre progressivement :

* où vivent les gens ;
* où ils travaillent ;
* où ils cultivent ;
* où ils construisent ;
* où ils commercent ;
* où passent les routes ;
* où sont les forêts ;
* où sont les montagnes ;
* où sont les mines ;
* quelles zones sont riches ;
* quelles zones sont pauvres ;
* quelles régions sont développées ;
* quelles régions sont abandonnées ;
* quelles zones appartiennent à quels groupes ou royaumes.

Le monde doit donc être **lisible directement par le paysage**.

---

# 2. VUE DU MONDE

La vue principale doit rester une vue 2D / top-down.

Le joueur doit avoir une vision suffisamment large pour comprendre la géographie générale, tout en pouvant zoomer suffisamment pour observer la vie quotidienne.

Le niveau de zoom doit donc permettre plusieurs échelles :

### Très loin

On comprend :

* continents/régions ;
* montagnes ;
* forêts ;
* grands cours d'eau ;
* mers ;
* grands centres urbains ;
* territoires ;
* routes principales.

### Moyen

On voit :

* villages ;
* maisons ;
* fermes ;
* ateliers ;
* marchés ;
* routes secondaires ;
* groupes de PNJ ;
* champs ;
* troupeaux ;
* forêts exploitées.

### Proche

On voit :

* individus ;
* animaux ;
* objets ;
* portes ;
* murs ;
* mobilier ;
* activités ;
* constructions ;
* interactions.

Le monde doit rester cohérent à tous les niveaux de zoom.

---

# 3. LE TERRAIN

Le terrain doit être immédiatement compréhensible.

Il doit différencier naturellement :

* plaines ;
* collines ;
* montagnes ;
* vallées ;
* forêts ;
* rivières ;
* lacs ;
* côtes ;
* plages ;
* zones agricoles ;
* zones rocheuses.

Le terrain ne doit pas ressembler à une simple grille colorée.

Même avec des textures simples, la topographie doit être lisible.

---

# 4. RELIEF

Le relief doit être visible sans transformer le jeu en 3D.

Utiliser visuellement :

* variations de hauteur ;
* ombres ;
* contours ;
* falaises ;
* pentes ;
* formes naturelles ;
* différences de végétation.

Une montagne doit réellement ressembler à une montagne.

Une vallée doit être visuellement identifiable.

Une colline doit être différente d'une plaine.

---

# 5. MONTAGNES

Les montagnes doivent avoir une silhouette naturelle.

Éviter :

* montagnes carrées ;
* gros blocs ;
* répétition mécanique ;
* formes parfaitement symétriques ;
* textures identiques.

Les montagnes doivent former des ensembles géographiques cohérents.

Elles doivent aussi influencer visuellement :

* routes ;
* villages ;
* agriculture ;
* mines ;
* déplacements.

---

# 6. FORÊTS

Une forêt doit ressembler à une véritable zone forestière.

Elle doit être composée de nombreux éléments naturels :

* arbres ;
* buissons ;
* variations de densité ;
* clairières ;
* petits chemins ;
* zones exploitées.

La forêt doit également changer avec la simulation.

Si les habitants coupent énormément d'arbres :

la forêt doit visuellement se raréfier.

Si une zone est abandonnée :

la végétation peut progressivement revenir.

---

# 7. VÉGÉTATION

La végétation ne doit pas être uniformément répartie.

Il doit y avoir :

* densités différentes ;
* zones sauvages ;
* zones exploitées ;
* champs ;
* prairies ;
* forêts ;
* végétation proche de l'eau.

La végétation doit dépendre du terrain et de l'environnement.

---

# 8. EAU

Les rivières doivent être lisibles comme de véritables éléments géographiques.

Elles doivent :

* suivre le relief ;
* créer des vallées ;
* influencer les implantations ;
* permettre certains transports ;
* attirer l'agriculture ;
* attirer les villes.

Les fleuves importants doivent visuellement structurer le paysage.

---

# 9. ROUTES

Les routes sont extrêmement importantes visuellement.

Elles doivent apparaître comme une conséquence de la circulation.

Au début :

petits sentiers.

Puis :

chemins plus utilisés.

Puis :

routes importantes.

Puis :

grands axes commerciaux.

Leur largeur, qualité et importance peuvent refléter leur utilisation.

Une route peu utilisée doit être discrète.

Une route commerciale majeure doit être clairement visible.

---

# 10. ROUTES NON PARFAITES

Les routes ne doivent pas être des lignes parfaitement droites.

Elles doivent contourner :

* montagnes ;
* rivières ;
* bâtiments ;
* terrains difficiles ;
* zones dangereuses.

Elles doivent suivre les contraintes du terrain.

Cela donnera l'impression que les humains ont réellement construit ces réseaux au fil du temps.

---

# 11. VILLAGES

Un village ne doit pas apparaître comme un modèle préfabriqué.

Il doit être construit progressivement.

Au début :

quelques maisons dispersées.

Puis :

plus de maisons.

Puis :

chemins.

Puis :

bâtiments spécialisés.

Puis :

place / marché.

Puis :

structures communes.

Le village doit donc avoir une histoire visible.

---

# 12. FORME DES VILLAGES

Tous les villages ne doivent pas avoir la même forme.

Certains peuvent être :

* compacts ;
* linéaires ;
* dispersés ;
* construits autour d'une rivière ;
* construits autour d'une route ;
* construits autour d'une place ;
* construits autour d'un château ;
* construits autour d'un port.

La forme doit dépendre de la géographie et de l'histoire.

---

# 13. VILLES

Une ville doit donner visuellement l'impression d'une concentration humaine importante.

On doit voir :

* densité plus élevée ;
* rues ;
* bâtiments plus nombreux ;
* commerces ;
* ateliers ;
* marchés ;
* bâtiments publics ;
* zones résidentielles ;
* zones industrielles/artisanales ;
* éventuellement murailles.

Une ville riche doit pouvoir être visuellement différente d'une ville pauvre.

---

# 14. CROISSANCE URBAINE

La croissance doit être progressive.

Ne jamais faire :

> petit village → gros modèle de ville.

Il faut réellement construire les bâtiments progressivement.

Le joueur doit pouvoir observer la transformation.

Exemple :

```text id="u4v2qn"
3 maisons
↓
8 maisons
↓
chemin
↓
atelier
↓
marché
↓
20 maisons
↓
route commerciale
↓
mur
↓
ville
```

---

# 15. MAISONS

Les maisons doivent être variées.

Éviter le spam d'un seul modèle.

La forme doit dépendre de :

* culture ;
* richesse ;
* taille de famille ;
* matériaux ;
* environnement ;
* époque technologique ;
* statut social.

Une maison pauvre peut être petite.

Une maison riche peut être grande.

Une famille nombreuse peut avoir besoin de plusieurs pièces.

---

# 16. MAISONS ET PERSONNALITÉ

La personnalité doit également pouvoir se voir.

Un individu économe peut avoir :

* maison petite ;
* peu de décoration ;
* peu d'espace inutile.

Un individu riche et ambitieux peut avoir :

* maison plus grande ;
* matériaux coûteux ;
* décoration ;
* mobilier ;
* bâtiment destiné au prestige.

Le logement doit donc raconter quelque chose sur son propriétaire.

---

# 17. ARCHITECTURE CULTURELLE

Les différentes cultures doivent pouvoir avoir des styles visuels différents.

Par exemple :

Culture A :

* maisons rondes ;
* matériaux locaux ;
* toits particuliers.

Culture B :

* maisons rectangulaires ;
* pierre ;
* organisation compacte.

Culture C :

* bâtiments plus grands ;
* places centrales ;
* architecture monumentale.

Le style doit émerger et se transmettre.

---

# 18. MATÉRIAUX

Les matériaux disponibles doivent influencer l'apparence.

Une région riche en bois doit visuellement utiliser davantage de bois.

Une région riche en pierre doit pouvoir développer davantage de constructions en pierre.

Une région pauvre doit utiliser des matériaux plus simples.

Cela permet de comprendre l'économie simplement en regardant le monde.

---

# 19. BÂTIMENTS

Chaque bâtiment doit avoir une identité visuelle.

Par exemple :

### Ferme

* champ ;
* grange ;
* stockage ;
* animaux éventuels.

### Forge

* bâtiment adapté ;
* espace de travail ;
* stockage de matériaux.

### Boulangerie

* bâtiment spécifique ;
* stockage ;
* activité visible.

### Tannerie

* espace extérieur ;
* matériaux ;
* structures spécifiques.

### Mine

* entrée de mine ;
* chemins ;
* stockage ;
* travailleurs.

### Marché

* stands ;
* stockage ;
* forte circulation.

### Temple

* architecture différente ;
* espace religieux ;
* éventuellement décorations.

Le but est que le joueur puisse reconnaître la fonction d'un bâtiment sans ouvrir son panneau.

---

# 20. ACTIVITÉ VISIBLE

Les bâtiments ne doivent pas être statiques.

On doit pouvoir voir :

* PNJ entrer ;
* PNJ sortir ;
* marchandises arriver ;
* marchandises repartir ;
* travailleurs travailler ;
* animaux ;
* caravanes ;
* construction.

La simulation doit être visible.

---

# 21. CONSTRUCTION

La construction doit être progressive visuellement.

Exemple :

```text id="8e2vqh"
terrain vide
↓
fondations
↓
structure
↓
murs
↓
toit
↓
bâtiment terminé
```

Cela permet au joueur de voir la ville évoluer.

---

# 22. CHANTIERS

Un bâtiment en construction doit être identifiable.

On doit pouvoir voir :

* matériaux déposés ;
* travailleurs ;
* structure incomplète ;
* progression.

Un chantier abandonné doit pouvoir rester visible.

Cela raconte également une histoire économique.

---

# 23. RUINES ET ABANDON

Une ville ne doit pas redevenir propre instantanément lorsqu'elle décline.

Un bâtiment abandonné peut devenir :

* délabré ;
* partiellement détruit ;
* envahi par la végétation ;
* transformé ;
* réutilisé.

Les ruines sont importantes pour donner une mémoire visuelle au monde.

---

# 24. CHAMPS

Les champs doivent montrer leur état.

On doit pouvoir distinguer :

* terrain préparé ;
* semis ;
* culture en croissance ;
* culture mature ;
* récolte ;
* champ abandonné.

Une région agricole doit donc avoir un aspect différent selon sa situation économique.

---

# 25. ANIMAUX

Les animaux doivent être visibles dans le monde.

Selon les systèmes existants :

* moutons ;
* chevaux ;
* animaux d'élevage ;
* animaux sauvages.

Ils doivent réellement se déplacer et être liés à l'économie.

---

# 26. MOUTONS

Les moutons doivent notamment participer visuellement à la chaîne :

**élevage → laine → transformation → tissu → vêtements**

On doit donc pouvoir voir des troupeaux dans certaines zones.

---

# 27. CHEVAUX

Les chevaux peuvent être utilisés pour :

* transport ;
* agriculture ;
* commerce ;
* déplacement ;
* guerre.

Ils doivent donc apparaître dans différents contextes.

---

# 28. MINES

Une mine doit être visuellement identifiable.

On doit voir :

* entrée ;
* travailleurs ;
* stockage ;
* transport ;
* éventuellement structures associées.

Mais le minerai lui-même ne doit pas être simplement posé partout à la surface.

Le gisement est sous terre.

La mine révèle progressivement l'exploitation de cette ressource.

---

# 29. MARCHÉS

Un marché doit être vivant.

On doit voir :

* vendeurs ;
* acheteurs ;
* marchandises ;
* circulation ;
* stands ;
* animaux ;
* transporteurs.

Un marché très actif doit visuellement être beaucoup plus animé qu'un petit marché rural.

---

# 30. RICHESSE VISUELLE

Une ville riche doit pouvoir montrer sa richesse.

Par :

* bâtiments plus grands ;
* matériaux de meilleure qualité ;
* marchés actifs ;
* objets ;
* décorations ;
* infrastructures ;
* routes améliorées ;
* fortifications.

Mais il ne faut pas faire une simple jauge graphique.

La richesse doit être visible parce qu'elle produit réellement ces choses.

---

# 31. PAUVRETÉ VISUELLE

Une région pauvre peut montrer :

* maisons simples ;
* infrastructures limitées ;
* bâtiments dégradés ;
* faible densité commerciale ;
* routes peu développées ;
* champs plus simples.

La pauvreté doit être la conséquence de la simulation.

---

# 32. FORTIFICATIONS

Les défenses doivent évoluer visuellement.

Par exemple :

```text id="pxj5qs"
aucune défense
↓
barrière
↓
palissade
↓
mur
↓
tour
↓
fort
↓
château
```

Une communauté menacée doit pouvoir changer physiquement son paysage.

---

# 33. CHÂTEAUX

Les châteaux doivent être de véritables constructions.

Ils doivent comporter selon le niveau :

* murs ;
* tours ;
* bâtiments internes ;
* espaces de stockage ;
* zones résidentielles ;
* structures militaires.

Ils doivent refléter la puissance politique.

---

# 34. POLITIQUE VISIBLE

La politique ne doit pas être uniquement dans une fenêtre UI.

Elle doit être visible dans le monde.

Un territoire fortement organisé peut avoir :

* bâtiments administratifs ;
* fortifications ;
* routes ;
* centres politiques.

Un royaume faible peut avoir des frontières moins structurées.

---

# 35. FRONTIÈRES

Les frontières doivent être lisibles mais ne doivent pas forcément ressembler à des lignes artificielles permanentes.

Elles peuvent être montrées par :

* couleurs très discrètes ;
* zones d'influence ;
* drapeaux ;
* postes ;
* fortifications ;
* panneaux ;
* structures politiques.

La carte principale doit rester belle et lisible.

---

# 36. RELIGION VISUELLE

Les religions doivent également modifier l'apparence du monde.

Une communauté religieuse peut développer :

* temples ;
* sanctuaires ;
* autels ;
* lieux sacrés ;
* monuments ;
* décorations ;
* pèlerinages.

Les lieux religieux doivent être intégrés à la vie quotidienne.

---

# 37. CULTURE VISUELLE

La culture doit se voir dans :

* maisons ;
* vêtements ;
* bâtiments ;
* objets ;
* décorations ;
* organisation urbaine.

Deux cultures voisines doivent pouvoir être visuellement reconnaissables sans devenir caricaturales.

---

# 38. VÊTEMENTS

Les vêtements peuvent progressivement refléter :

* climat ;
* richesse ;
* profession ;
* culture ;
* statut.

Un mineur peut avoir une apparence fonctionnelle.

Un noble peut avoir des vêtements plus riches.

Un voyageur peut avoir un équipement adapté au déplacement.

---

# 39. PNJ VISIBLES

Les PNJ doivent être suffisamment lisibles pour que le joueur puisse comprendre leur rôle.

Sans tomber dans des personnages ultra détaillés.

Ils peuvent être différenciés par :

* vêtements ;
* couleurs ;
* équipement ;
* taille ;
* objets transportés ;
* profession ;
* statut.

---

# 40. PROFESSIONS VISIBLES

Le joueur doit pouvoir reconnaître certaines professions visuellement.

Exemples :

* agriculteur ;
* bûcheron ;
* mineur ;
* forgeron ;
* soldat ;
* marchand ;
* prêtre ;
* constructeur.

Le métier doit influencer l'apparence sans créer un système de skins artificiel.

---

# 41. GROUPES VISIBLES

Lorsqu'un groupe devient important, son existence doit pouvoir être perceptible.

Exemples :

### Guilde

* bâtiment ;
* symbole ;
* membres ;
* zone d'activité.

### Religion

* temple ;
* vêtements éventuels ;
* rassemblements.

### Milice

* équipements ;
* patrouilles.

### Royaume

* architecture ;
* fortifications ;
* drapeaux éventuels.

---

# 42. CARAVANES

Une caravane doit être reconnaissable immédiatement.

Elle peut avoir :

* plusieurs individus ;
* animaux ;
* charrettes ;
* marchandises.

Une route commerciale importante doit donc être visuellement animée.

---

# 43. TRANSPORT MARITIME

Les bateaux doivent apparaître lorsque les conditions le permettent.

Ils peuvent transporter :

* marchandises ;
* personnes ;
* matériaux.

Un port actif doit être visuellement vivant.

---

# 44. DENSITÉ

La densité est un indicateur visuel extrêmement important.

Une zone peu peuplée :

* bâtiments espacés ;
* beaucoup de nature ;
* peu de routes.

Une zone très peuplée :

* bâtiments rapprochés ;
* routes ;
* commerces ;
* forte circulation.

La densité doit donc émerger naturellement.

---

# 45. ZONES INDUSTRIELLES

Une ville développée peut progressivement créer des zones où certaines activités se concentrent.

Par exemple :

* forges ;
* ateliers ;
* entrepôts ;
* marchés.

Cette concentration doit être le résultat de la proximité économique.

---

# 46. CENTRES-VILLES

Les villes peuvent développer des centres naturellement.

Un marché très actif peut devenir un centre.

Les bâtiments importants peuvent progressivement se concentrer autour.

Puis les quartiers se développent autour de ce centre.

---

# 47. QUARTIERS

À très long terme, les villes peuvent développer :

* quartier résidentiel ;
* quartier marchand ;
* quartier artisanal ;
* quartier religieux ;
* quartier administratif ;
* quartier militaire.

Mais ces quartiers doivent être émergents.

Ne pas générer artificiellement une ville avec des zones prédéfinies.

---

# 48. L'ENVIRONNEMENT RACONTE L'HISTOIRE

Le monde doit permettre de voir son passé.

Exemples :

### Ancienne forêt

Aujourd'hui :

* clairière ;
* maisons ;
* champs.

On comprend qu'elle a été exploitée.

### Ancienne ville

Aujourd'hui :

* ruines ;
* végétation ;
* routes anciennes.

On comprend qu'une population a vécu ici.

### Ancienne zone minière

On voit :

* anciennes entrées ;
* bâtiments abandonnés ;
* chemins ;
* déchets/minerais selon le niveau de détail.

---

# 49. L'ABANDON DOIT ÊTRE BEAU ET LISBLE

Une région abandonnée ne doit pas simplement disparaître.

Elle doit progressivement devenir :

* vide ;
* délabrée ;
* envahie par la végétation ;
* partiellement détruite.

Cela permet de raconter visuellement l'effondrement d'une société.

---

# 50. GUERRE VISUELLE

Une guerre doit transformer le paysage.

Selon son intensité :

* soldats ;
* camps ;
* déplacements ;
* incendies si approprié ;
* bâtiments endommagés ;
* murs détruits ;
* routes perturbées ;
* populations déplacées.

Après la guerre :

* reconstruction ;
* ruines ;
* nouvelles frontières ;
* nouvelles fortifications.

---

# 51. MIGRATION VISUELLE

Les migrations doivent être perceptibles.

Un déplacement massif peut produire :

* groupes de voyageurs ;
* nouvelles maisons ;
* nouvelles cultures ;
* nouveaux quartiers ;
* routes davantage utilisées.

Une région qui perd sa population doit visuellement se vider.

---

# 52. TEMPS ET TRANSFORMATION VISUELLE

Le monde doit changer progressivement.

Pas de gros changements instantanés.

Une civilisation doit être reconnaissable à travers son évolution.

### Début

Nature dominante.

### Développement

Quelques villages.

### Développement moyen

Routes + agriculture + ateliers.

### Société avancée

Villes + commerce + institutions.

### Royaume puissant

Fortifications + routes + châteaux + centres urbains.

### Déclin

Bâtiments abandonnés + baisse de densité + routes moins utilisées.

---

# 53. SAISONS

Si le système climatique/saisonnier est présent, les changements doivent être visibles.

Les saisons peuvent influencer :

* végétation ;
* champs ;
* vêtements ;
* activités ;
* déplacements ;
* production.

La météo et le climat doivent avoir des conséquences réelles et pas seulement changer la couleur du terrain.

---

# 54. ÉCLAIRAGE ET ATMOSPHÈRE

Le monde doit avoir une atmosphère naturelle.

Différences possibles :

* matin ;
* journée ;
* soir ;
* nuit.

Mais l'atmosphère doit rester au service de la lisibilité.

Les PNJ et bâtiments importants doivent rester visibles.

---

# 55. ANIMATION

Les animations doivent communiquer la simulation.

Pas besoin d'animations extrêmement complexes.

Même de petites animations peuvent suffire :

* marcher ;
* travailler ;
* couper du bois ;
* cultiver ;
* construire ;
* combattre ;
* commercer ;
* transporter.

L'important est que les animations correspondent réellement à l'action simulée.

---

# 56. PAS DE FAUSSES ANIMATIONS

Si un PNJ est censé miner :

il doit réellement être en train d'effectuer une activité minière dans la simulation.

L'animation ne doit pas simplement jouer indépendamment de l'état du monde.

---

# 57. OBJETS AU SOL

Certains objets peuvent apparaître visuellement lorsqu'ils sont réellement présents :

* ressources ;
* marchandises ;
* matériaux ;
* objets abandonnés ;
* outils.

Mais éviter de saturer l'écran.

La représentation doit être adaptée au niveau de zoom.

---

# 58. ZOOM ET NIVEAUX DE DÉTAIL

À distance :

les objets individuels peuvent être agrégés.

À proximité :

ils peuvent apparaître individuellement.

Exemple :

100 arbres à distance = masse forestière.

À proximité = arbres individuels.

Même principe pour :

* maisons ;
* PNJ ;
* champs ;
* marchandises ;
* bâtiments.

---

# 59. LISIBILITÉ

Même avec beaucoup d'éléments, le joueur doit comprendre ce qui se passe.

Il faut éviter :

* surcharge visuelle ;
* couleurs trop agressives ;
* trop d'icônes ;
* UI permanente partout ;
* bâtiments impossibles à distinguer.

La carte doit rester lisible.

---

# 60. UI

L'interface doit compléter le monde, pas le remplacer.

La carte doit être la vue principale.

Les panneaux servent à approfondir.

Exemples :

Cliquer sur un PNJ :

* identité ;
* famille ;
* métier ;
* richesse ;
* relations ;
* mémoire ;
* objectifs ;
* historique.

Cliquer sur une maison :

* propriétaire ;
* occupants ;
* qualité ;
* matériaux ;
* valeur ;
* historique.

Cliquer sur une entreprise :

* propriétaire ;
* employés ;
* production ;
* stock ;
* revenus ;
* dépenses ;
* bénéfices.

Cliquer sur une ville :

* population ;
* économie ;
* métiers ;
* bâtiments ;
* culture ;
* groupes ;
* institutions ;
* histoire.

---

# 61. UI ET CAUSALITÉ

Les panneaux ne doivent pas seulement afficher des chiffres.

Ils doivent permettre de comprendre les relations.

Exemple :

> Prix du pain : élevé

Le joueur doit pouvoir comprendre :

> mauvaise récolte → moins de blé → moins de farine → baisse de production → prix élevé.

L'interface doit donc être un outil d'analyse de la simulation.

---

# 62. CHRONIQUE VISUELLE

Une interface de chronique doit montrer :

* événements récents ;
* événements importants ;
* guerres ;
* migrations ;
* créations ;
* destructions ;
* découvertes ;
* changements politiques.

Mais les événements affichés doivent provenir du moteur.

---

# 63. CARTES D'ANALYSE

Il peut exister différents overlays :

### Population

Montre la densité.

### Richesse

Montre les zones économiques.

### Ressources

Montre les ressources connues/exploitées.

### Commerce

Montre les flux.

### Routes

Montre les axes de circulation.

### Culture

Montre les zones culturelles.

### Religion

Montre les zones d'influence religieuse.

### Politique

Montre les territoires.

### Migration

Montre les flux de population.

### Environnement

Montre l'évolution des ressources naturelles.

Ces overlays sont des outils d'observation, pas des substituts au monde réel.

---

# 64. COULEURS

Les couleurs doivent être utilisées avec parcimonie.

Le terrain doit rester naturel.

Les overlays peuvent utiliser des couleurs plus fortes lorsque le joueur les active.

La carte normale ne doit pas ressembler à un graphique Excel.

---

# 65. TEXTURES

Les textures doivent donner de la richesse au monde sans masquer les informations.

Les textures doivent être :

* cohérentes ;
* lisibles ;
* suffisamment variées ;
* adaptées à la géographie.

Éviter les répétitions évidentes.

---

# 66. ASSETS

Les assets visuels doivent respecter la direction artistique générale.

Ils doivent pouvoir être combinés.

Une forêt doit pouvoir mélanger différents arbres.

Un village doit pouvoir avoir plusieurs modèles de maisons.

Un marché doit pouvoir avoir plusieurs configurations.

L'objectif est d'éviter l'effet :

> copier-coller du même sprite 100 fois.

---

# 67. GÉNÉRATION

La génération visuelle doit respecter les données simulées.

Si le monde dit :

> forêt dense

le rendu doit produire une forêt dense.

Si le monde dit :

> région agricole

le rendu doit produire des champs.

Si le monde dit :

> ville très peuplée

le rendu doit produire une forte densité.

Le rendu doit donc être une projection des données du monde.

---

# 68. PAS DE DÉCORATION DÉCONNECTÉE

Ne pas ajouter des bâtiments uniquement pour rendre la ville jolie si aucune fonction ne leur correspond.

Un moulin doit correspondre à une activité.

Un marché doit correspondre à du commerce.

Une mine doit correspondre à une exploitation.

Un temple doit correspondre à une religion.

La décoration doit venir de la simulation.

---

# 69. LE MONDE DOIT ÊTRE LISIBLE SANS UI

Test important :

désactiver tous les panneaux.

Regarder uniquement la carte.

Le joueur doit pouvoir déduire :

* où sont les populations ;
* où sont les ressources ;
* où sont les activités ;
* où sont les routes ;
* quelles zones sont développées.

C'est une priorité visuelle.

---

# 70. LE MONDE DOIT AUSSI ÊTRE BEAU SANS ÊTRE RÉALISTE À TOUT PRIX

Je ne cherche pas nécessairement un photoréalisme.

Je cherche un style :

* cohérent ;
* naturel ;
* lisible ;
* détaillé ;
* vivant ;
* chaleureux ;
* crédible.

L'objectif est de donner l'impression d'un **petit monde vivant observé depuis le ciel**.

---

# 71. ÉCHELLE MICRO → MACRO

Le joueur doit pouvoir passer naturellement de :

### Individu

à :

### Famille

à :

### Maison

à :

### Quartier

à :

### Village

à :

### Ville

à :

### Région

à :

### Royaume

sans perdre la cohérence.

Le même monde doit fonctionner à toutes ces échelles.

---

# 72. EXEMPLE VISUEL COMPLET

Imagine une région après 300 années de simulation.

À gauche :

une ancienne forêt.

Quelques arbres seulement subsistent.

Des chemins traversent l'ancienne forêt.

Plusieurs fermes occupent maintenant l'espace.

Au centre :

une ville.

Elle possède :

* maisons denses ;
* marché ;
* ateliers ;
* forge ;
* boulangerie ;
* routes.

Une rivière traverse la ville.

Un pont concentre les déplacements.

Des caravanes passent.

À côté :

une mine dans les montagnes.

On voit :

* entrée de mine ;
* travailleurs ;
* stockage ;
* route reliant la mine à la ville.

Plus loin :

un ancien village abandonné.

Quelques maisons sont en ruine.

La végétation revient.

Une ancienne route n'est presque plus utilisée.

Au nord :

un château.

Autour :

* murailles ;
* village ;
* champs ;
* routes ;
* soldats.

Et le joueur doit pouvoir comprendre que :

**la mine a enrichi la ville, la richesse a attiré des habitants, la croissance a créé le marché, le marché a créé les routes, les routes ont créé le royaume, tandis qu'une ancienne région a décliné après une migration.**

Tout cela simplement en regardant le monde.

---

# 73. LE VISUEL DOIT ÊTRE UNE TRACE DU TEMPS

Le plus important :

**le monde doit garder les cicatrices de son histoire.**

Une civilisation ne doit pas seulement avoir un état actuel.

Elle doit avoir un passé visible.

Les routes anciennes.

Les ruines.

Les villes abandonnées.

Les vieux murs.

Les temples.

Les quartiers anciens.

Les zones déboisées.

Les champs abandonnés.

Les nouvelles constructions.

Tout cela doit permettre de lire l'histoire du monde.

---

# 74. OBJECTIF VISUEL FINAL

Je veux pouvoir zoomer très loin et voir :

> une civilisation.

Puis zoomer :

> une ville.

Puis :

> un quartier.

Puis :

> une maison.

Puis :

> une famille.

Puis :

> un individu.

Et à chaque niveau :

**le visuel doit rester cohérent avec la simulation.**

---

# 75. RÈGLE ABSOLUE

Le rendu visuel ne doit jamais être une simulation parallèle.

Il doit être :

> **la représentation visuelle de l'état réel de la simulation.**

Si la simulation change :

le monde visuel change.

Si une ville grandit :

elle se construit.

Si une forêt disparaît :

elle disparaît.

Si une route devient importante :

elle s'améliore.

Si une région s'appauvrit :

son activité diminue.

Si une population migre :

les bâtiments se vident.

Si une guerre détruit une ville :

les traces restent.

Si une civilisation prospère pendant 500 ans :

le paysage doit porter les traces de ces 500 ans.

---

# 76. VISION VISUELLE FINALE

Le joueur doit pouvoir lancer la simulation.

Ne toucher à rien.

Accélérer le temps.

Et regarder progressivement :

**la nature → les premiers humains → les premiers foyers → les chemins → les villages → les métiers → les marchés → les routes → les villes → les institutions → les fortifications → les royaumes → les guerres → les migrations → les ruines → les nouvelles sociétés.**

Le monde doit donc donner l'impression qu'il **grandit, vit, vieillit, se transforme et se souvient.**

Le rendu visuel n'est pas simplement là pour rendre le jeu joli.

Il doit rendre **l'émergence visible**. NONO_SIMU_2D
SPÉCIFICATION GLOBALE — VISION COMPLÈTE DE LA SIMULATION
0. IDENTITÉ DU PROJET
Projet concerné :
nono_simu_2d
Stack actuelle :
- TypeScript
- React
- Vite
- simulation 2D
- projet village_edit
Ce document définit la vision globale du projet.
Il ne décrit pas une phase particulière.
Il ne décrit pas une feature isolée.
Il décrit ce que doit être la simulation dans son ensemble.
Toutes les futures fonctionnalités doivent respecter cette vision.
1. CE QUE JE VEUX RÉELLEMENT CONSTRUIRE
Je ne veux pas simplement construire un jeu de gestion de village.
Je veux construire un monde artificiel vivant, dans lequel des individus prennent des décisions, forment des relations, créent des familles, développent des activités économiques, construisent des habitations, créent des groupes, développent des cultures, des croyances et des institutions, puis transforment progressivement leur environnement.
Le joueur doit avoir l'impression d'observer une société qui existe indépendamment de lui.
Le monde ne doit pas attendre le joueur.
Les PNJ doivent :
- travailler ;
- manger ;
- dormir ;
- se déplacer ;
- construire ;
- commercer ;
- discuter ;
- former des relations ;
- avoir des enfants ;
- vieillir ;
- changer de métier ;
- accumuler ou perdre de la richesse ;
- rejoindre des groupes ;
- adopter ou rejeter des croyances ;
- migrer ;
- créer des entreprises ;
- devenir influents ;
- former des institutions ;
- entrer en conflit ;
- faire la guerre ;
- mourir ;
- transmettre leurs biens ;
- transmettre des connaissances ;
- transmettre des traditions.
Et toutes ces actions doivent modifier progressivement le monde.
2. LE CONCEPT CENTRAL : UNE SIMULATION CAUSALE
Le principe le plus important du projet est :
RIEN D'IMPORTANT NE DOIT ARRIVER "PARCE QUE LE JEU A DÉCIDÉ QUE C'ÉTAIT LE MOMENT".
Je ne veux pas :
jour 50 → village devient ville jour 100 → royaume apparaît jour 150 → guerre jour 200 → religion 
Je veux :
individus ↓ besoins ↓ décisions ↓ actions ↓ conséquences ↓ relations ↓ groupes ↓ institutions ↓ transformations du monde ↓ nouvelles contraintes ↓ nouvelles décisions 
Une société doit donc être le résultat de son histoire.
3. L'EFFET PAPILLON
La simulation doit permettre des divergences importantes à partir de petites différences.
Exemple :
Deux villages commencent presque identiques.
Dans le village A, un PNJ découvre une zone riche en minerai.
Il commence à exploiter cette ressource.
Cela crée :
- un métier de mineur ;
- une demande en outils ;
- une forge ;
- des transporteurs ;
- des marchands ;
- une augmentation des revenus ;
- des migrants ;
- de nouvelles maisons ;
- une augmentation de la population ;
- un marché ;
- une route commerciale ;
- une influence politique.
Le village devient progressivement une ville.
Dans le village B, cette découverte n'arrive jamais.
Il reste agricole.
Après plusieurs générations, les deux sociétés doivent pouvoir être radicalement différentes.
4. LE PNJ EST L'UNITÉ FONDAMENTALE
La société commence avec l'individu.
Un PNJ doit être un véritable agent simulé.
Il possède notamment :
- identité ;
- âge ;
- sexe ;
- famille ;
- parents ;
- enfants ;
- conjoint ;
- relations ;
- personnalité ;
- traits ;
- besoins ;
- émotions ;
- mémoire ;
- connaissances ;
- compétences ;
- profession ;
- expérience ;
- richesse ;
- argent ;
- inventaire ;
- logement ;
- possessions ;
- culture ;
- langue / identité culturelle ;
- croyances ;
- réputation ;
- statut social ;
- groupe d'appartenance ;
- objectifs ;
- préférences ;
- peurs ;
- ambitions ;
- habitudes ;
- historique.
Tous ces éléments doivent pouvoir évoluer.
5. LA PERSONNALITÉ DOIT AVOIR UN IMPACT RÉEL
La personnalité n'est pas une statistique décorative.
Elle doit influencer les décisions.
Par exemple :
Individu prudent
Privilégie :
- sécurité ;
- stabilité ;
- nourriture ;
- logement ;
- faible risque.
Individu ambitieux
Peut rechercher :
- richesse ;
- pouvoir ;
- statut ;
- influence ;
- responsabilités.
Individu aventureux
Peut :
- migrer ;
- explorer ;
- voyager ;
- prendre des métiers dangereux ;
- rejoindre des caravanes.
Individu religieux
Peut :
- donner davantage aux institutions religieuses ;
- participer aux cérémonies ;
- construire des lieux sacrés ;
- modifier ses décisions selon ses croyances.
Individu économe
Peut :
- consommer moins ;
- économiser ;
- acheter des biens durables ;
- préférer une petite maison.
Individu ostentatoire
Peut :
- vouloir une grande maison ;
- acheter des objets de prestige ;
- rechercher un statut élevé.
La personnalité doit donc produire des comportements différents.
6. COGNITION
La cognition doit fonctionner comme une boucle.
PERCEPTION
Le PNJ observe son environnement :
- ressources ;
- prix ;
- personnes ;
- bâtiments ;
- dangers ;
- opportunités ;
- besoins ;
- événements.
↓
MÉMOIRE
Il compare ce qu'il observe avec ce qu'il sait déjà.
↓
BESOINS
Exemples :
- faim ;
- soif ;
- sommeil ;
- sécurité ;
- logement ;
- argent ;
- relations ;
- statut ;
- religion ;
- famille.
↓
OBJECTIFS
Il détermine ce qui devient important.
↓
OPTIONS
Il identifie plusieurs actions possibles.
↓
ÉVALUATION
Les options sont évaluées selon :
- personnalité ;
- mémoire ;
- connaissances ;
- risques ;
- récompenses ;
- relations ;
- richesse ;
- distance ;
- compétences ;
- situation actuelle.
↓
DÉCISION
Le PNJ choisit.
↓
ACTION
Il agit réellement dans le monde.
↓
CONSÉQUENCE
Son action modifie :
- lui-même ;
- d'autres PNJ ;
- l'économie ;
- l'environnement ;
- les groupes ;
- les institutions ;
- la carte.
↓
MÉMOIRE
Le résultat est enregistré.
Cette nouvelle expérience influence ses décisions futures.
7. LA MÉMOIRE
La mémoire est essentielle.
Un PNJ doit pouvoir se souvenir de choses importantes :
- rencontre ;
- mariage ;
- naissance ;
- mort ;
- conflit ;
- dette ;
- transaction ;
- humiliation ;
- aide reçue ;
- attaque ;
- guerre ;
- migration ;
- découverte ;
- perte d'un proche ;
- réussite ;
- échec.
Une expérience doit pouvoir modifier durablement le comportement.
Exemple :
Un PNJ a été attaqué par des bandits sur une route.
Il peut ensuite :
- éviter cette route ;
- demander une escorte ;
- devenir hostile aux bandits ;
- rejoindre une milice ;
- déménager.
Cela crée une continuité historique.
8. LES RELATIONS
Les relations doivent être dynamiques.
Entre deux individus :
- connaissance ;
- amitié ;
- amour ;
- famille ;
- rivalité ;
- dette ;
- confiance ;
- haine ;
- respect ;
- influence.
Les relations doivent être asymétriques lorsque nécessaire.
A peut admirer B.
B peut détester A.
Les relations doivent évoluer selon les interactions.
9. LES INTERACTIONS SOCIALES
Les PNJ doivent réellement interagir.
Ils peuvent :
- parler ;
- commercer ;
- demander de l'aide ;
- offrir de l'aide ;
- négocier ;
- travailler ensemble ;
- apprendre ;
- se marier ;
- former une famille ;
- transmettre des informations ;
- rejoindre un groupe ;
- quitter un groupe ;
- créer des rivalités.
Les interactions sociales doivent produire des conséquences.
10. FAMILLES
Les familles constituent une couche fondamentale.
Une famille possède :
- membres ;
- ressources ;
- logement ;
- revenus ;
- besoins ;
- patrimoine ;
- relations ;
- histoire.
Les membres peuvent coopérer.
Exemple :
- père agriculteur ;
- mère tisserande ;
- fils apprenti forgeron ;
- fille commerçante.
La famille fonctionne comme une petite unité économique.
11. GÉNÉRATIONS
Le monde doit évoluer sur plusieurs générations.
Les enfants grandissent.
Ils deviennent adultes.
Ils acquièrent des compétences.
Ils choisissent leur profession.
Ils peuvent quitter leur famille.
Ils peuvent créer leur propre foyer.
Ils héritent éventuellement de biens.
Une famille peut donc devenir :
- pauvre ;
- riche ;
- influente ;
- noble ;
- commerçante ;
- politique ;
- religieuse.
Une dynastie peut apparaître progressivement.
12. LES MÉTIERS
Les professions doivent être dynamiques.
Il ne faut pas créer un monde où :
80 % des PNJ restent agriculteurs pour toujours.
Les métiers doivent dépendre de la structure économique.
Au début :
- agriculteurs ;
- chasseurs ;
- pêcheurs ;
- bûcherons ;
- constructeurs ;
- collecteurs.
Avec le développement :
- mineurs ;
- forgerons ;
- charpentiers ;
- maçons ;
- boulangers ;
- tanneurs ;
- tisserands ;
- bijoutiers ;
- marchands ;
- transporteurs ;
- artisans ;
- soldats ;
- prêtres ;
- administrateurs.
13. CHANGEMENT DE MÉTIER
Un PNJ doit pouvoir changer de métier.
Il peut changer parce que :
- son métier ne rapporte plus assez ;
- une nouvelle opportunité apparaît ;
- ses compétences évoluent ;
- son environnement change ;
- une ressource devient rare ;
- une entreprise recrute ;
- sa famille a besoin d'argent ;
- une guerre commence ;
- une nouvelle technologie apparaît ;
- une autre profession devient prestigieuse.
Un ancien agriculteur peut devenir mineur.
Un mineur peut devenir forgeron.
Un forgeron peut devenir marchand.
Un marchand peut devenir propriétaire d'une entreprise.
14. TIERS DE DÉVELOPPEMENT DES MÉTIERS
Les métiers doivent suivre le développement global de la société.
Une société très primitive doit privilégier les métiers qui permettent simplement de survivre.
Puis, lorsque :
- la nourriture devient suffisamment abondante ;
- la population augmente ;
- les besoins fondamentaux sont couverts ;
- les surplus apparaissent ;
la société peut soutenir des métiers plus spécialisés.
Donc :
survie → surplus → spécialisation → industrie → services → administration
Mais une crise peut inverser cette progression.
Une famine peut forcer des artisans à redevenir producteurs alimentaires.
Une guerre peut créer une demande massive de soldats et de forgerons.
Une catastrophe peut supprimer des métiers avancés.
15. ÉCONOMIE
L'économie doit être une chaîne.
RESSOURCE
↓
EXTRACTION
↓
INVENTAIRE
↓
TRANSFORMATION
↓
OBJET
↓
BESOIN
↓
CONSOMMATION
↓
DEMANDE
↓
MARCHÉ
↓
PRIX
↓
REVENUS
↓
RICHESSE
↓
DÉCISIONS
↓
NOUVELLE PRODUCTION
L'économie doit donc fonctionner comme un système fermé.
16. RESSOURCES
Le monde doit contenir différents types de ressources.
Ressources naturelles
- bois ;
- pierre ;
- argile ;
- fibres ;
- plantes ;
- eau ;
- minerais.
Ressources agricoles
- céréales ;
- légumes ;
- fruits ;
- laine ;
- lait ;
- viande.
Ressources minières
- fer ;
- cuivre ;
- or ;
- autres minerais selon la génération du monde.
Les ressources doivent avoir :
- localisation ;
- quantité ;
- renouvellement éventuel ;
- accessibilité ;
- coût d'exploitation.
17. MINES
Les minerais ne doivent pas être de simples objets posés visiblement sur la carte.
Les ressources minières doivent pouvoir être souterraines.
Une montagne peut contenir un gisement.
Les PNJ doivent découvrir et exploiter ce gisement.
Une mine nécessite :
- travailleurs ;
- outils ;
- infrastructure ;
- transport ;
- énergie/effort ;
- débouchés économiques.
Une mine peut donc provoquer le développement d'une région entière.
18. PRODUCTION
Les ressources doivent être transformées.
Exemples :
blé ↓ moulin ↓ farine ↓ boulangerie ↓ pain 
mouton ↓ laine ↓ tissage ↓ tissu ↓ vêtement 
animal ↓ cuir ↓ tannerie ↓ cuir travaillé ↓ chaussures / équipement 
minerai ↓ forge ↓ métal ↓ outil / arme 
bois ↓ charpentier ↓ planches / meubles / bâtiments 
Chaque étape crée des métiers et des besoins.
19. INVENTAIRES
Les objets et ressources doivent réellement exister.
Ils doivent pouvoir être :
- produits ;
- transportés ;
- stockés ;
- vendus ;
- achetés ;
- consommés ;
- utilisés ;
- détruits ;
- volés ;
- hérités.
Les inventaires doivent être connectés aux comportements.
20. MARCHÉS ET PRIX
Les prix doivent être dynamiques.
Ils dépendent de :
- offre ;
- demande ;
- stocks ;
- production ;
- transport ;
- distance ;
- richesse ;
- événements ;
- pénuries ;
- concurrence.
Une famine doit faire évoluer le marché alimentaire.
Une nouvelle mine doit modifier les marchés liés au métal.
Une guerre doit augmenter la demande en armes et réduire certaines productions.
21. COMMERCE
Le commerce doit pouvoir apparaître naturellement.
Un commerçant peut identifier :
produit moins cher à A, plus cher à B.
Il peut acheter à A.
Transporter vers B.
Revendre.
Cela crée :
- routes ;
- caravanes ;
- métiers commerciaux ;
- marchés ;
- centres économiques.
22. CARAVANES
Les caravanes doivent avoir :
- marchandises ;
- destination ;
- moyens de transport ;
- coût ;
- risque ;
- escorte éventuelle ;
- itinéraire.
Une caravane peut être :
- rentable ;
- attaquée ;
- retardée ;
- détruite ;
- détournée.
Les bandits peuvent donc avoir un véritable rôle économique.
23. BANDITS
Les bandits doivent être des acteurs du monde.
Ils peuvent émerger lorsque :
- pauvreté ;
- marginalisation ;
- territoire peu contrôlé ;
- guerre ;
- faiblesse politique.
Ils peuvent :
- voler ;
- attaquer des voyageurs ;
- attaquer des caravanes ;
- contrôler certaines routes.
Cela peut ensuite pousser les sociétés à :
- créer des gardes ;
- construire des fortifications ;
- sécuriser les routes ;
- créer des milices.
24. ENTREPRISES
Une entreprise doit être une véritable organisation économique.
Elle peut avoir :
- propriétaire ;
- employés ;
- stock ;
- production ;
- revenus ;
- dépenses ;
- salaire ;
- prix ;
- bénéfices ;
- dettes.
Elle peut :
- grandir ;
- recruter ;
- licencier ;
- investir ;
- concurrencer ;
- faire faillite.
Une faillite doit avoir des conséquences sociales.
25. RICHESSE
La richesse doit être distribuée.
Tous les PNJ ne doivent pas avoir le même niveau économique.
Il doit exister :
- pauvreté ;
- classe moyenne ;
- richesse ;
- grande richesse ;
- élites.
La richesse influence :
- logement ;
- nourriture ;
- consommation ;
- loisirs ;
- statut ;
- influence ;
- politique.
26. LOGEMENT
Le logement doit être généré selon les individus.
Une maison dépend de :
- taille du foyer ;
- richesse ;
- culture ;
- matériaux ;
- disponibilité ;
- statut ;
- personnalité ;
- besoins.
Une famille pauvre ne doit pas automatiquement recevoir la même maison qu'une famille riche.
27. ARCHITECTURE CULTURELLE
Les bâtiments doivent refléter la culture.
Différentes populations peuvent développer :
- formes différentes ;
- tailles différentes ;
- matériaux différents ;
- organisations différentes.
Par exemple, certaines cultures peuvent préférer des maisons rondes.
D'autres peuvent privilégier des bâtiments rectangulaires.
Le style doit se transmettre culturellement.
28. CONSTRUCTION
Construire doit nécessiter :
- matériaux ;
- travailleurs ;
- temps ;
- outils ;
- compétences.
La construction doit être un processus.
Les bâtiments peuvent être :
- commencés ;
- abandonnés ;
- terminés ;
- améliorés ;
- détruits ;
- réparés.
29. BÂTIMENTS SPÉCIALISÉS
Le monde doit pouvoir développer :
- maisons ;
- fermes ;
- greniers ;
- entrepôts ;
- ateliers ;
- forge ;
- boulangerie ;
- tannerie ;
- tissage ;
- bijouterie ;
- marché ;
- auberge ;
- temple ;
- mine ;
- port ;
- fort ;
- château.
Mais un bâtiment ne doit apparaître que lorsque les conditions économiques et sociales permettent son existence.
30. VILLAGES
Un village doit être le résultat d'une concentration humaine.
Plusieurs familles s'installent.
Les besoins augmentent.
Les chemins se développent.
Les commerces apparaissent.
Les bâtiments communs apparaissent.
Le village peut évoluer.
31. DÉVELOPPEMENT URBAIN
Une séquence possible :
campement ↓ petit hameau ↓ village ↓ bourg ↓ ville 
Mais cette évolution ne doit jamais être obligatoire.
Un village peut rester petit pendant des générations.
Un autre peut exploser démographiquement.
Un autre peut disparaître.
32. ROUTES
Les routes doivent émerger des flux de déplacement.
Si les individus utilisent constamment un trajet :
A → B 
alors ce trajet peut devenir progressivement une route.
Les routes réduisent :
- temps ;
- coût ;
- risque.
Elles augmentent :
- commerce ;
- migration ;
- communication ;
- développement.
33. TRANSPORT
Le transport doit évoluer.
Selon la société :
- marche ;
- cheval ;
- charrette ;
- caravane ;
- bateau.
Le transport doit influencer l'économie.
Une région difficile à atteindre doit être moins intégrée économiquement.
Une région bien connectée peut devenir riche.
34. PORTS ET TRANSPORT FLUVIAL/MARITIME
Les rivières et mers peuvent créer des axes économiques.
Les populations peuvent s'installer autour.
Des ports peuvent apparaître.
Des marchands peuvent utiliser les voies navigables.
Cela peut créer des villes commerciales.
35. CULTURE
La culture doit émerger et se transmettre.
Elle peut influencer :
- architecture ;
- vêtements ;
- alimentation ;
- noms ;
- traditions ;
- fêtes ;
- comportements ;
- valeurs ;
- relations sociales.
Deux populations qui évoluent séparément peuvent diverger culturellement.
Deux populations qui se mélangent peuvent fusionner certaines traditions.
36. RELIGION
Les croyances doivent émerger des individus et des groupes.
Elles peuvent concerner :
- divinités ;
- ancêtres ;
- nature ;
- lieux sacrés ;
- événements historiques ;
- doctrines ;
- pratiques.
Une croyance peut commencer avec quelques personnes.
Puis se diffuser.
Puis créer :
- cultes ;
- prêtres ;
- temples ;
- institutions religieuses ;
- fêtes ;
- pèlerinages.
37. ÉVOLUTION RELIGIEUSE
Les religions doivent pouvoir :
- se développer ;
- se diviser ;
- fusionner ;
- disparaître ;
- se radicaliser ;
- se réformer ;
- influencer la politique.
Les religions doivent aussi avoir une mémoire historique.
Une ancienne guerre religieuse peut continuer à influencer les relations entre populations.
38. GROUPES
Les individus doivent former naturellement des groupes.
Exemples :
- familles ;
- guildes ;
- groupes religieux ;
- marchands ;
- artisans ;
- militaires ;
- élites ;
- communautés locales.
Un groupe doit avoir :
- membres ;
- intérêts ;
- ressources ;
- influence ;
- objectifs ;
- relations avec d'autres groupes.
39. GUILDES
Les guildes peuvent émerger lorsqu'un métier devient suffisamment important.
Exemple :
Plusieurs forgerons se regroupent.
Ils peuvent :
- partager des connaissances ;
- défendre leurs intérêts ;
- contrôler certaines activités ;
- influencer les prix ;
- former des apprentis ;
- influencer la politique.
40. INSTITUTIONS
Les institutions sont une couche supérieure.
Elles peuvent apparaître lorsqu'une société devient suffisamment complexe.
Exemples :
- conseil ;
- administration ;
- tribunal ;
- guilde ;
- temple ;
- armée ;
- garde ;
- marché officiel.
Une institution doit avoir des membres, des ressources et des responsabilités.
41. POLITIQUE
La politique doit émerger des rapports de pouvoir.
Le pouvoir peut venir de :
- richesse ;
- réputation ;
- force ;
- famille ;
- religion ;
- contrôle des ressources ;
- contrôle militaire ;
- influence sociale.
Les dirigeants ne doivent pas être uniquement choisis par un script.
Leur position doit dépendre de la société.
42. SUCCESSION
Les dirigeants peuvent mourir.
Le pouvoir peut passer :
- à un héritier ;
- à un rival ;
- à un conseil ;
- à un autre groupe.
Cela peut provoquer :
- stabilité ;
- crise ;
- guerre civile ;
- changement de régime.
43. CHEFFERIES ET ROYAUMES
Une société peut évoluer :
communauté ↓ village organisé ↓ chefferie ↓ royaume 
Un royaume doit réellement contrôler un territoire.
Il possède :
- population ;
- institutions ;
- dirigeants ;
- ressources ;
- armée ;
- économie ;
- culture ;
- territoire.
44. TERRITOIRE
Le contrôle territorial doit dépendre de la présence réelle.
Un royaume doit avoir des zones :
- contrôlées ;
- contestées ;
- abandonnées ;
- périphériques.
Les frontières peuvent changer.
45. CONFLITS
Les conflits peuvent avoir plusieurs causes :
- territoire ;
- ressources ;
- religion ;
- commerce ;
- succession ;
- vengeance ;
- rivalités ;
- politique ;
- pauvreté ;
- pression démographique.
Les conflits peuvent commencer petits.
Une dispute peut devenir une rivalité.
Une rivalité peut devenir une guerre.
46. GUERRE
Une guerre doit être un événement complexe.
Elle implique :
- soldats ;
- ressources ;
- nourriture ;
- armes ;
- commandement ;
- déplacement ;
- territoires ;
- fortifications.
Elle doit modifier :
- population ;
- économie ;
- frontières ;
- infrastructures ;
- relations ;
- migration.
47. FORTIFICATIONS
Les communautés menacées peuvent construire :
palissade ↓ mur ↓ fort ↓ château 
Cela nécessite :
- matériaux ;
- richesse ;
- main-d'œuvre ;
- technologie ;
- motivation politique/militaire.
Les fortifications doivent être des investissements réels.
48. COUPS D'ÉTAT
Un groupe peut tenter de prendre le pouvoir.
Conditions possibles :
- dirigeant faible ;
- mécontentement ;
- groupe puissant ;
- crise économique ;
- conflit entre élites ;
- soutien militaire.
Le résultat doit dépendre des forces présentes.
49. RÉVOLTES ET RÉVOLUTIONS
Une population peut se révolter.
Cela peut être provoqué par :
- famine ;
- oppression ;
- impôts ;
- inégalités ;
- religion ;
- guerre ;
- perte de confiance.
Une révolte peut échouer.
Elle peut réussir.
Elle peut produire un nouveau régime.
50. MIGRATION
Les individus et familles peuvent migrer.
Motifs :
- nourriture ;
- travail ;
- richesse ;
- sécurité ;
- famille ;
- religion ;
- guerre ;
- environnement ;
- opportunités.
La migration doit être un vrai déplacement physique.
51. MIGRATION ET CULTURE
Les migrants apportent :
- compétences ;
- croyances ;
- traditions ;
- connaissances ;
- relations ;
- langues/cultures.
Une migration massive peut transformer une région.
52. TECHNOLOGIE
La technologie doit être liée aux besoins.
Une invention peut apparaître parce qu'un problème existe.
Exemple :
Un village a besoin de meilleurs outils.
Des artisans expérimentent.
Une nouvelle méthode apparaît.
Elle est adoptée.
Elle augmente la production.
Cela permet de nouveaux métiers.
Cela transforme l'économie.
53. DIFFUSION DES CONNAISSANCES
Une invention ne doit pas être instantanément connue par tout le monde.
Elle peut se diffuser par :
- commerce ;
- migration ;
- apprentissage ;
- conquête ;
- échanges culturels ;
- institutions.
Une région isolée peut rester technologiquement différente.
54. ENVIRONNEMENT
L'environnement doit être dynamique.
Les humains peuvent :
- couper des forêts ;
- cultiver ;
- exploiter des mines ;
- construire ;
- créer des routes ;
- modifier les sols.
Mais l'environnement influence aussi les humains.
Cela crée une boucle :
environnement ↓ comportement humain ↓ exploitation ↓ transformation environnementale ↓ nouvelles contraintes ↓ nouveaux comportements 
55. FORÊTS
Les forêts doivent être des ressources réelles.
Une exploitation excessive peut réduire :
- bois disponible ;
- biodiversité ;
- ressources locales.
Cela peut pousser les habitants à :
- chercher de nouvelles zones ;
- importer du bois ;
- replanter ;
- changer de matériaux.
56. AGRICULTURE
Les champs doivent dépendre de :
- terrain ;
- climat ;
- eau ;
- fertilité ;
- travail ;
- outils ;
- connaissances.
Une mauvaise année peut produire une pénurie.
Une bonne année peut créer un surplus.
57. ÉLEVAGE
Les animaux doivent avoir un rôle économique.
Exemple :
Mouton :
élevage ↓ mouton ↓ laine ↓ tissu ↓ vêtement 
ou :
élevage ↓ animal ↓ viande ↓ nourriture 
Les chevaux peuvent également être liés :
- transport ;
- commerce ;
- agriculture ;
- guerre.
58. OBJETS
Les objets doivent avoir une histoire.
Un objet peut posséder :
- propriétaire ;
- qualité ;
- matériau ;
- état ;
- âge ;
- valeur ;
- origine.
Une épée peut être fabriquée par un forgeron précis.
Elle peut appartenir à plusieurs générations.
Elle peut être volée.
Elle peut devenir un objet historique.
59. QUALITÉ ET DURABILITÉ
La qualité dépend de :
- compétence de l'artisan ;
- matériaux ;
- technologie ;
- outils ;
- temps investi.
La durabilité dépend de :
- qualité ;
- utilisation ;
- entretien ;
- âge.
Cela crée des différences économiques réelles.
60. STATUT SOCIAL
Le statut doit émerger.
Il peut dépendre de :
- richesse ;
- profession ;
- famille ;
- réputation ;
- pouvoir ;
- religion ;
- propriété ;
- rôle politique.
Le statut peut influencer :
- relations ;
- mariage ;
- logement ;
- politique ;
- opportunités.
61. NOBLESSE ET DYNASTIES
Si certaines familles accumulent :
- richesse ;
- terres ;
- influence ;
- pouvoir politique ;
elles peuvent devenir une élite.
Une famille influente peut rester importante pendant plusieurs générations.
Elle peut devenir une dynastie.
Mais elle peut aussi perdre son pouvoir.
62. CRISES
Le monde doit pouvoir entrer en crise.
Exemples :
- famine ;
- épidémie si le système est développé ;
- guerre ;
- pénurie ;
- catastrophe ;
- effondrement économique ;
- disparition d'une ressource ;
- crise politique.
Une crise doit propager ses effets.
63. EFFONDREMENT
Une société peut régresser.
Une ville peut perdre sa population.
Des bâtiments peuvent être abandonnés.
Des métiers peuvent disparaître.
Les habitants peuvent retourner vers :
- agriculture ;
- chasse ;
- collecte ;
- artisanat simple.
La simulation ne doit pas supposer que le progrès est toujours linéaire.
64. RECONSTRUCTION
Après une crise :
- migrants peuvent revenir ;
- bâtiments peuvent être réparés ;
- nouvelles entreprises peuvent apparaître ;
- nouvelles institutions peuvent être créées ;
- une nouvelle culture peut émerger.
Une société reconstruite ne doit pas forcément redevenir identique.
65. HISTOIRE
Chaque monde doit développer une histoire unique.
Il faut pouvoir enregistrer :
- naissance de villages ;
- création de groupes ;
- fondation de bâtiments ;
- découvertes ;
- guerres ;
- migrations ;
- famines ;
- mariages ;
- morts importantes ;
- changements politiques ;
- créations religieuses ;
- inventions ;
- catastrophes ;
- effondrements ;
- fondations de royaumes.
66. CHRONIQUE
La simulation doit pouvoir produire une chronique lisible.
Exemple :
An 34 : Une famille découvre un important gisement de fer.  An 37 : Une mine est construite.  An 42 : La population augmente fortement.  An 47 : Une forge ouvre.  An 53 : Des marchands étrangers arrivent.  An 61 : Le village devient un centre commercial.  An 68 : Une guilde de forgerons est créée.  An 74 : Un conseil municipal est formé.  An 81 : Une route commerciale relie la ville à une région voisine. 
L'histoire doit être générée par les événements réels.
67. ATTRIBUTION CAUSALE
Pour chaque transformation importante, il doit être possible de retrouver :
cause → événement → conséquence
Exemple :
Pénurie de bois ↓ augmentation du prix du bois ↓ baisse de construction ↓ mécontentement ↓ migration ↓ baisse de population ↓ fermeture de commerces 
Ce type de chaîne est essentiel.
68. PAS DE "FAUSSE ÉMERGENCE"
Il ne faut pas simplement donner des noms différents à des événements préprogrammés.
Exemple interdit :
if population > 100:     createTown() 
si cela signifie simplement que la ville apparaît automatiquement.
Il faut que :
- population ;
- besoins ;
- constructions ;
- économie ;
- institutions ;
- flux ;
aient réellement créé les conditions d'une ville.
Les seuils peuvent aider techniquement, mais ils ne doivent pas remplacer la causalité.
69. LES SYSTÈMES DOIVENT ÊTRE CONNECTÉS
Architecture logique :
INDIVIDUS     ↓ BESOINS     ↓ COGNITION     ↓ ACTIONS     ↓ RELATIONS     ↓ FAMILLES     ↓ MÉTIERS     ↓ ÉCONOMIE     ↓ GROUPES     ↓ INSTITUTIONS     ↓ POLITIQUE     ↓ TERRITOIRES     ↓ CONFLITS     ↓ MIGRATIONS     ↓ NOUVELLES POPULATIONS     ↓ NOUVELLES CULTURES     ↓ NOUVEAUX BESOINS     ↓ NOUVELLES ACTIONS 
Et en parallèle :
ENVIRONNEMENT ↕ ÉCONOMIE ↕ POPULATION ↕ TECHNOLOGIE ↕ POLITIQUE 
Tout doit pouvoir influencer tout ce qui est logiquement pertinent.
70. EXEMPLE COMPLET D'ÉMERGENCE
Voici le genre d'histoire que la simulation doit pouvoir générer naturellement.
Au départ :
20 personnes arrivent près d'une rivière.
Elles cultivent.
Quelques personnes chassent.
D'autres coupent du bois.
Les premières maisons sont construites.
La population augmente.
Un surplus de nourriture apparaît.
Une personne commence à échanger du surplus contre du bois.
D'autres personnes commencent à se spécialiser.
Un marché apparaît.
Un artisan fabrique des outils.
Les outils augmentent la production agricole.
La population augmente encore.
Une famille commence à devenir riche.
Elle construit une maison plus grande.
Elle emploie des travailleurs.
Un autre individu devient marchand.
Il découvre qu'une région voisine manque de nourriture.
Il commence à exporter.
Une route commerciale apparaît.
Des caravanes utilisent cette route.
Les bandits commencent à attaquer les caravanes.
Les marchands demandent davantage de sécurité.
Une garde locale apparaît.
Le chef de la communauté devient plus influent.
Un conseil se forme.
La ville commence à contrôler les routes environnantes.
Une mine est découverte.
Des migrants arrivent.
La ville devient riche.
Une guilde de marchands apparaît.
Une guilde de forgerons apparaît.
Une institution religieuse devient importante.
Une famille devient politiquement dominante.
Le territoire s'étend.
Une communauté voisine se sent menacée.
Les relations se détériorent.
Un conflit commercial apparaît.
Puis un conflit territorial.
Puis une guerre.
La guerre détruit des bâtiments.
Des habitants migrent.
La population diminue.
L'économie s'effondre.
Le royaume perd du territoire.
Plusieurs générations plus tard, une nouvelle société se développe sur les ruines.
Aucun de ces événements ne doit avoir besoin d'être écrit comme scénario.
71. LE JOUEUR
Le joueur ne doit pas être nécessaire pour que le monde fonctionne.
Le joueur doit pouvoir :
- observer ;
- accélérer ;
- ralentir ;
- inspecter ;
- comprendre ;
- suivre des individus ;
- suivre des familles ;
- suivre des entreprises ;
- suivre des groupes ;
- suivre des royaumes ;
- voir les ressources ;
- voir les flux ;
- voir les événements ;
- analyser l'histoire.
L'objectif principal est d'observer l'émergence.
72. OBSERVABILITÉ
Comme la simulation est complexe, elle doit être observable.
Il faut pouvoir comprendre :
- pourquoi un PNJ a choisi un métier ;
- pourquoi il a déménagé ;
- pourquoi une entreprise a fermé ;
- pourquoi une ville s'est développée ;
- pourquoi un groupe est apparu ;
- pourquoi une guerre a commencé.
Les systèmes de télémétrie, chroniques et métriques doivent servir à cela.
73. TÉLÉMÉTRIE
La simulation doit pouvoir enregistrer :
- décisions ;
- actions ;
- besoins ;
- professions ;
- migrations ;
- créations de groupes ;
- événements économiques ;
- événements politiques ;
- événements religieux ;
- événements militaires ;
- construction ;
- destruction.
Cela permet de tester que l'émergence est réelle.
74. DÉTERMINISME
Avec une même seed et les mêmes paramètres :
la simulation doit pouvoir produire un résultat reproductible autant que possible.
Cela permet :
- debugging ;
- tests ;
- comparaison ;
- analyse des différences ;
- détection des régressions.
Mais plusieurs seeds doivent également produire des histoires différentes.
75. MULTI-SEED
Une simulation qui fonctionne uniquement avec une seed ne suffit pas.
Il faut pouvoir tester plusieurs seeds.
Objectif :
- vérifier la survie ;
- vérifier l'économie ;
- vérifier les migrations ;
- vérifier les constructions ;
- vérifier l'émergence sociale ;
- vérifier la stabilité.
On cherche des comportements robustes, pas une démonstration unique.
76. PERFORMANCE
La simulation doit pouvoir évoluer vers beaucoup de PNJ.
Il faut donc utiliser intelligemment :
- workers ;
- calcul parallèle ;
- LOD ;
- spatial indexing ;
- cache ;
- simulation différée ;
- agrégation ;
- événements.
Mais attention :
l'optimisation ne doit jamais transformer les PNJ en simples statistiques.
Un PNJ important peut nécessiter une simulation détaillée.
Les zones éloignées peuvent être simulées à une résolution moindre, mais leurs conséquences doivent rester cohérentes.
77. NIVEAUX DE SIMULATION
Tous les individus n'ont pas besoin d'être recalculés de la même manière à chaque frame.
Possible :
Niveau détaillé
PNJ proches ou importants :
- cognition ;
- déplacements ;
- interactions ;
- actions détaillées.
Niveau intermédiaire
Groupes :
- déplacements agrégés ;
- économie ;
- production ;
- consommation.
Niveau éloigné
Régions :
- population ;
- ressources ;
- flux ;
- événements agrégés.
Mais lorsqu'une région redevient importante, elle doit pouvoir revenir à une simulation détaillée sans casser la causalité.
78. LE MONDE DOIT RESTER COHÉRENT
Une information affichée doit correspondre à la réalité.
Si l'interface dit :
15 forgerons
il doit exister une logique permettant d'expliquer ces 15 forgerons.
Si elle dit :
ville riche
cela doit correspondre à :
- production ;
- revenus ;
- stocks ;
- population ;
- commerce ;
- bâtiments.
Pas de statistiques décoratives.
79. LE VISUEL DOIT ÊTRE UNE CONSÉQUENCE DE LA SIMULATION
La carte ne doit pas seulement être jolie.
Elle doit raconter l'histoire.
On doit voir :
- forêts exploitées ;
- champs ;
- maisons ;
- ateliers ;
- routes ;
- marchés ;
- mines ;
- ports ;
- fortifications ;
- villes ;
- zones abandonnées ;
- territoires contrôlés.
Le visuel doit refléter les données simulées.
80. LE MONDE DOIT AVOIR UNE MÉMOIRE
Après 500 ou 1 000 jours, le monde ne doit pas avoir oublié ce qui s'est passé.
Il doit rester des traces :
- bâtiments anciens ;
- familles historiques ;
- routes ;
- frontières ;
- ruines ;
- traditions ;
- religions ;
- relations ;
- rivalités ;
- noms ;
- chroniques.
Le monde doit avoir une profondeur historique.
81. LA SOCIÉTÉ EST UN SYSTÈME ADAPTATIF
Une société doit constamment répondre aux problèmes qu'elle rencontre.
Problème :
manque de nourriture.
Réponses possibles :
- augmenter agriculture ;
- importer ;
- migrer ;
- changer de métier ;
- chasser ;
- conquérir ;
- rationner ;
- créer une institution.
Il ne faut pas imposer une seule réponse.
La société doit pouvoir choisir différentes solutions selon ses caractéristiques.
82. LES SOCIÉTÉS DOIVENT ÊTRE DIFFÉRENTES
Deux sociétés avec le même terrain peuvent évoluer différemment.
Une société peut privilégier :
- commerce ;
- agriculture ;
- guerre ;
- religion ;
- artisanat ;
- élevage ;
- exploitation minière.
Ces spécialisations doivent émerger des circonstances.
83. AUCUNE SOCIÉTÉ NE DOIT ÊTRE PARFAITEMENT OPTIMISÉE
Les PNJ ne doivent pas toujours prendre la meilleure décision mathématique.
Ils font des choix selon :
- informations disponibles ;
- personnalité ;
- habitudes ;
- biais ;
- mémoire ;
- peur ;
- relations ;
- croyances.
Cela permet des comportements humains plus naturels.
84. L'IGNORANCE EST IMPORTANTE
Un PNJ ne doit pas connaître toute la carte.
Il ne doit pas connaître instantanément :
- tous les prix ;
- toutes les ressources ;
- toutes les routes ;
- tous les royaumes.
Il doit apprendre progressivement.
Cela rend :
- exploration ;
- commerce ;
- espionnage ;
- migration ;
beaucoup plus intéressants.
85. INFORMATION ET RÉPUTATION
Les informations peuvent circuler par les individus.
Un commerçant apprend qu'une ville est riche.
Il transmet cette information.
D'autres marchands arrivent.
Cela peut réellement créer un flux migratoire.
Une réputation peut également modifier les comportements.
86. ÉMERGENCE DES CENTRES
Un endroit devient important parce que les flux s'y concentrent.
Plus de gens arrivent.
Plus de commerce.
Plus de bâtiments.
Plus de richesse.
Plus d'institutions.
Cela crée une boucle :
activité ↓ attractivité ↓ population ↓ demande ↓ commerce ↓ richesse ↓ infrastructure ↓ activité 
C'est ce qui doit permettre aux villes de devenir naturellement importantes.
87. ABANDON ET DÉCLIN
La même logique doit fonctionner à l'envers.
guerre ↓ départ de population ↓ moins de travailleurs ↓ baisse de production ↓ moins de commerce ↓ entreprises ferment ↓ nouveaux départs ↓ déclin 
Une ville peut donc mourir progressivement.
88. LE TEMPS
Le temps doit avoir un rôle central.
Court terme :
- faim ;
- sommeil ;
- travail ;
- déplacement.
Moyen terme :
- économie ;
- construction ;
- apprentissage ;
- migration.
Long terme :
- familles ;
- générations ;
- culture ;
- politique ;
- technologie ;
- royaumes.
Très long terme :
- civilisation ;
- effondrement ;
- renaissance ;
- changement culturel.
89. LE BUT ULTIME
Le résultat recherché est une simulation où je peux lancer le monde et simplement observer.
Je veux pouvoir me demander :
Pourquoi cette ville est ici ?
Pourquoi cette famille est riche ?
Pourquoi cette région est pauvre ?
Pourquoi cette religion domine ?
Pourquoi cette route existe ?
Pourquoi ce royaume s'est étendu ?
Pourquoi cette ville a disparu ?
Pourquoi cette famille possède autant de pouvoir ?
Pourquoi cette guerre a commencé ?
Pourquoi ces gens ont migré ?
Pourquoi cette culture est différente ?
Et pour chacune de ces questions, le jeu doit pouvoir fournir une histoire causale basée sur les événements réellement simulés.
90. PHILOSOPHIE DE DÉVELOPPEMENT
Lorsqu'une nouvelle fonctionnalité est proposée, il faut toujours se demander :
Est-ce qu'elle crée de l'émergence ?
Est-ce qu'elle interagit avec les systèmes existants ?
Est-ce qu'elle produit des conséquences ?
Est-ce que ces conséquences peuvent provoquer d'autres événements ?
Est-ce que les PNJ peuvent réellement utiliser cette fonctionnalité ?
Est-ce que le monde change à cause d'elle ?
Est-ce qu'elle peut fonctionner dans plusieurs contextes ?
Est-ce qu'elle peut produire plusieurs résultats ?
Si une feature ne fait qu'ajouter une donnée, un bouton ou une animation sans modifier réellement le comportement du monde, elle n'est pas prioritaire.
91. PRIORITÉ ABSOLUE
L'ordre de priorité conceptuel est :
1. ÉMERGENCE
Les événements doivent apparaître naturellement.
2. CAUSALITÉ
Chaque transformation importante doit avoir des causes.
3. INTERCONNEXION
Les systèmes doivent réellement communiquer.
4. COHÉRENCE
Les données doivent correspondre au monde réel simulé.
5. MÉMOIRE
Les événements passés doivent influencer le futur.
6. VARIATION
Les différentes simulations doivent produire des histoires différentes.
7. OBSERVABILITÉ
Le joueur doit pouvoir comprendre ce qui se passe.
8. PERFORMANCE
La simulation doit pouvoir fonctionner à grande échelle.
9. VISUEL
Le rendu doit représenter ce qui se passe réellement.
92. TEST ULTIME DU PROJET
Le test ultime n'est pas :
"Est-ce que le bouton fonctionne ?"
Le test ultime est :
"Si je laisse tourner la simulation suffisamment longtemps sans intervenir, est-ce qu'une histoire intéressante et cohérente apparaît ?"
Et surtout :
"Est-ce que cette histoire aurait pu être différente ?"
Si oui, l'émergence fonctionne.
93. VISION FINALE
Je veux arriver à un monde dans lequel :
un individu peut provoquer un changement social,
un changement social peut provoquer un changement économique,
un changement économique peut provoquer un changement politique,
un changement politique peut provoquer une guerre,
une guerre peut provoquer une migration,
une migration peut provoquer un changement culturel,
un changement culturel peut provoquer de nouvelles institutions,
ces institutions peuvent modifier l'économie,
et cette nouvelle économie peut changer complètement la génération suivante.
C'est cette boucle qui constitue le cœur de nono_simu_2d.
Le projet ne doit donc pas être pensé comme :
"un village avec beaucoup de fonctionnalités."
Il doit être pensé comme :
un système artificiel capable de générer des sociétés, des économies, des cultures et une histoire à partir d'individus et de leurs interactions.
La simulation doit produire des histoires que même le développeur n'a pas écrites.
Le monde doit être capable de surprendre son propre créateur.