# FlowPlan2 V2 — PLAN d'exécution documentaire P0 de la simplification R1.1–R1.3

## Clôture P0 — DONE — 2026-10-13

L'exécution documentaire P0 livrée à
`1f831f12eec35c74f93892c4a9b939cdfc6f1cf6` a reçu un **audit
documentaire indépendant favorable et un GO explicite de clôture** : P0 est
**DONE**. Le [plan directeur approuvé](./rewrite_r11_r13_simplification_plan.md)
et les quatre livrables — [addendum](./rewrite_simplification_p0_addendum.md),
[invariants](./rewrite_simplification_p0_invariants.md),
[clauses](./rewrite_simplification_p0_clauses.md),
[frontières](./rewrite_simplification_p0_boundaries.md) — constituent la trace
normative. Les passages « PLAN ONLY » et prospectifs ci-dessous conservent leur
sens historique à la date de préparation ; cette clôture fixe le statut actuel.

| Élément | Statut actuel |
| --- | --- |
| R0 / R0.1 / R1.1 / R1.2 | DONE |
| R1.3 | IN REVIEW |
| P0 — Simplification | DONE |
| P1–P7 — Simplification | NOT STARTED |
| R1.4 / R2 | NOT STARTED |

L'audit valide : clauses historiques conservées ou explicitement remplacées ;
catalogue détaillé des champs, invariants et ensembles quantifiés ; relations
directes/inverses et preuves d'exhaustivité ; distinction Current, Snapshot et
archives avec autorité d'unicité ; contrats d'atomicité et de réentrance ;
responsabilités hexagonales ; aucun code ni test modifié pendant P0. Les preuves
sont **documentaires et contractuelles, non exécutables**. La cible normative
reste distincte du code existant, dont R1.3 demeure IN REVIEW. P0 n'établit
aucun gain de performance.

Les tests de validation ciblée, fermeture effective, unicité, réentrance et
publication atomique restent obligatoires dans les futurs lots techniques, de
même que la levée des réserves techniques de l'addendum. P1 nécessite un
cadrage architectural et un GO distincts ; aucun lot P1–P7 ne commence ici.
Aucune garantie métier ni preuve historique n'est supprimée ou requalifiée.

**Statut : PLAN ONLY — soumis à audit indépendant, sans GO d'exécution de P0.**
Date : 2026-10-12. Branche : `rewrite/portfolio-versioned`. Baseline vérifiée
après `git fetch origin` : HEAD = origin =
`2c39e66950134c9b5f2e7e6d06a4ef60976c7513`, arbre propre, divergence 0/0.
Seul le présent plan est livré. R1.1 et R1.2 restent DONE ; R1.3 reste IN REVIEW ;
R1.4 et R2 restent NOT STARTED. P1–P7 ne sont pas autorisés.

## 1. Objet et autorité documentaire

Préparer, sans le promulguer, l'addendum qui formalisera : **contrôler
intégralement le courant lors de son acquisition, préserver ses invariants par
validation ciblée à chaque transition, publier atomiquement et conserver toutes
les versions historiques immuables**. Le
[plan général approuvé](./rewrite_r11_r13_simplification_plan.md) fixe la cible
et ses corrections C1–C3. Le présent document fixe le travail documentaire P0,
ses clauses à traiter et ses critères de revue ; il ne remplace aujourd'hui
aucune norme, aucun canon et aucun mécanisme livré.

L'ordre de lecture pour l'exécution future est : décisions consolidées
[R1.2](./rewrite_decisions.md), plans et canons
[R1.1](./rewrite_r11_plan.md) / [canon](./rewrite_r11_canon.md),
[R1.2](./rewrite_r12_plan.md) / [canon](./rewrite_r12_canon.md),
[R1.3](./rewrite_r13_plan.md) / [canon](./rewrite_r13_canon.md),
puis [current_plan](../../current_plan.md) et
[current_canon](../../current_canon.md) pour les états et renvois actuels.
Les passages de préparation, clôture et résultats anciens restent traçables à
leur date ; les bandeaux récents déterminent les statuts présents.

## 2. Matrice préparatoire des clauses normatives

« Conserver » signifie reprendre la garantie dans le futur addendum sans changer
la règle métier. « Remplacer » désigne uniquement le moyen technique après GO.
« Ajouter » demande un contrat nouveau et sa preuve. Les références de section
seront vérifiées ligne à ligne pendant l'exécution documentaire P0.

| Source | Clause actuelle | Garantie métier associée | Traitement P0 | Justification |
| --- | --- | --- | --- | --- |
| R1.1 plan §4.1–4.4, canon §Invariants | Rational/Quantity exacts, CivilDate, identité typée, ref exacte, owner stable, enveloppe et filiation/provenance | Valeurs, dates, identités et versions non ambiguës | Conserver ; citer dans l'addendum sans retoucher le canon | La validation ciblée contrôle aussi chaque nouvelle enveloppe ; elle ne change aucune primitive. |
| R1.2 décisions A-R12-01–09 et B1–B4, plan §4–6, canon §Architecture/§Décisions | Les 14 kinds, payloads, manifeste fermé, mapping owner→identité, résolution exacte et validation structurelle | Même graphe valide pour tout Current et Snapshot certifié | Conserver ; catalogue §3 ci-dessous à rendre exhaustif | Seul le mode de démonstration d'une succession fiable change. |
| R1.2 plan §5.1–5.3/§6.5, canon §Architecture | Registre passif fini, aucune sélection `latest`, entrée `unknown` copiée/validée, certificat opaque après validation complète | Aucune entrée inconnue ou ref substituée ne devient fiable | Conserver pour acquisition/import/réhydratation/Snapshot ; ajouter une voie interne de succession prouvée | Une marque TypeScript ou un index ne certifie pas un graphe inconnu. |
| R1.2 plan §6.4, décisions B2 Settings/A-R12-08–09 | Unicités et mappings sur contexte fourni ; unicité à vie historiquement renvoyée à R2 | Pas de réemploi d'identité/couple/version dans la portée déclarée | Ajouter autorité d'unicité P0 §5A ; garder la limite de portée R2 | Un registre partiel ne prouve jamais l'absence historique. |
| R1.3 plan §15.1/§25 B2, canon §Admission, décisions B2 R1.3 | Admission RAM par H entier, inventaire et ledger exhaustifs avant toute édition ; refus d'incomplétude | Collisions historiques refusées, réservations non recyclées | Remplacer **la condition générale de lecture/validation exhaustive H**, conserver l'unicité requise par opération et les réservations | L'autorité des identités peut être exhaustive sans charger les enveloppes archivées. |
| R1.3 plan §11.1/§15.1, décisions B1/B3, canon §Admission/§Commandes | Restore TA/PTEC historique : identité conservée et nouvelle VersionId même payload égal ; predecessor courant exact ou base historique désignée | Aucun replay implicite, owner/couple/base exacts | Conserver ; exiger résolution exacte des seules bases utiles | Une archive non chargée reste historique et ne devient pas « absente ». |
| R1.2 plan §5.1 (registre), R1.3 plan §7/§15 et canon §Contrats publics | Reconstruction `withVersions(H+B)` et validation du contexte entier à l'édition | Append sans collision, owner/filiation cohérents, H immuable | Remplacer le parcours H+B par append contrôlé contre autorité et témoins pertinents | Le coût H ne doit pas être une condition générale de l'édition ; aucune garantie de collision ne disparaît. |
| R1.3 plan §7/§15, canon §Contrats publics, current_plan/current_canon bandeaux R1.3 | Certification R1.2 complète du candidat final à chaque Applied | Courant publié intégralement valide | Remplacer ce moyen par induction sur base complètement certifiée et preuve de fermeture par invariant ; garder oracle complet sur entrée inconnue | L'état final doit conserver exactement les mêmes prédicats. |
| R1.3 plan §6–10/§25, décisions A-R12-02/03/06/07 | Commandes, obligations, confirmations, stale, suppressions/restores, versions sélectives, ETC | Aucune transition métier implicite ni confirmation contournée | Conserver ; intégrer les obligations au dossier de preuve avant commit | La validation structurelle seule ne démontre pas les obligations de transition. |
| R1.3 plan §9–10, canon §Contrats publics, décisions D-R1-03/A-R12-09 | `exclusive`/`publish`, candidat séparé, révision RAM et swap cohérent | Pas de Current partiel, NoOp sans publication, refus sans mutation | Ajouter contrat explicite de propriétaire, génération, révision, point de commit et réentrance | Le port injectable actuel ne prouve pas à lui seul l'irréversibilité du swap. |
| R1.2 plan §6.5, décisions A-R12-09 | Snapshot autonome, refs exactes, `knowledgeDate` bornée ; Save explicite seulement | Historique consultable sans Current et sans snapshot automatique | Conserver ; distinguer répertoire des archives et Current/Snapshot | L'optimisation d'édition ne peut perdre une version sortie du courant. |
| current_plan/current_canon bandeaux R1.2/R1.3 ; canons R1.1/R1.2/R1.3 | Résultats, limites PERF-LOAD/PERF-EDIT et statuts datés | Traçabilité des décisions et audits | Citer les clauses remplacées dans l'addendum futur ; ne modifier aucun canon clos ni statut ici | Un changement prospectif ne réécrit pas ce qui a été livré et audité. |

La matrice définitive devra citer les paragraphes et formulations exacts, distinguer
« historique conservé comme fait » de « prescription applicable après addendum »,
et résoudre toute contradiction apparente par une clause de remplacement datée.
Elle doit couvrir explicitement `analyseTransition(H entier)`, B2, `withVersions`,
la certification complète du candidat et `publish`/`exclusive`, sans toucher aux
garanties métier ni aux décisions B1/B3/B4.

## 3. Catalogue préparatoire des invariants du courant R1.2

Notation : S = sélection exacte du manifeste ; H = archives ; AP = ActualPeriod ;
SP = ActualSubPeriod ; TA = TeamActual ; PTEC = PT ETC. « Complet » ci-dessous
signifie le contrôle R1.2 du graphe sélectionné entier. « Ciblé » désigne la
preuve future sur un successeur d'un courant déjà certifié, **pas une dispense de
validation**. Pour chaque ligne, l'ensemble quantifié et ses membres avant/après
devront être fixés ; toute classe globale exige son inventaire entier. Les
enveloppes H non sélectionnées ne sont pas membres de S, mais les bases
historiques désignées restent à résoudre exactement.

| ID | Invariant | Entités et champs | Ensemble quantifié | Dépendances directes/inverses | Validation complète | Validation ciblée à préparer |
| --- | --- | --- | --- | --- | --- | --- |
| C01 | Chaque ref sélectionnée a kind/EntityId/VersionId valides et résout une enveloppe exacte, de bon kind et payload local valide | 14 kinds, refs, enveloppes et champs R1.2/R1.1 | Toutes refs S ; aucune réponse manquante, extra ou substituée | Manifeste→enveloppe ; identité/version→refs | Résoudre et valider chaque membre S | Contrôler toutes nouvelles refs/enveloppes et témoigner que les autres refs/payloads immuables sont identiques. |
| C02 | Identité, owner, couple et filiation/provenance fournis cohérents ; aucune identité ne change d'owner | Tous kinds, owner, predecessor, sources, clés métier | Toutes enveloppes du contexte acquis ; liens historiques fournis pertinents | Identité→versions/owner ; predecessor/source→base | Valider contexte fourni et signaler lien non établi si absent | Vérifier append, owner et base exacte ; réserver identité/couple/VersionId contre autorité §5A. |
| C03 | Manifeste fermé : bonne table par kind, une seule version par identité, globals uniques, aucune racine redondante | PortfolioId, PlanningSettings, PortfolioOrder, 12 tables | Chaque table S et union S ; refs distinctes | Tables→refs ; ref→table ; Settings→racines | Comparer cardinalités, kinds, doublons, couverture | Comparer inventaires des tables avant/après au delta, puis les classes changées ; témoigner les autres inchangées. |
| C04 | Settings Project/Reservation/Team : un mapping owner→identité, noms/champs/dates/lifecycle valides, racines dérivées y compris deleted | ProjectSettings, ReservationSettings, TeamSettings | Tous Settings et owners de chaque kind | owner↔Settings ; racine→AP/associations/Order | Valider tous Settings et mappings | Revalider Settings changés ; si owner/composition change, fermer racines, AP, associations et Order ; mapping complet du kind. |
| C05 | Une Capacity par Team ; périodes ordonnées non chevauchantes, valeurs et exceptions valides ; gaps autorisés | TeamCapacity, TeamSettings | Toutes Teams S, Capacity S et listes internes de chaque Capacity | Team↔Capacity | Vérifier bijection et payloads | Capacity/Team touchées et bijection de classe Team complète si composition change. |
| C06 | AP unique et stable par Project/Reservation ; owner concordant, vide ou couvert valide ; earliest Project ≤ from couvert | AP, ProjectSettings, ReservationSettings | Toutes racines Project/Reservation et AP S | root↔AP ; Project.earliest→AP.from | Vérifier mapping total et bornes | AP/Settings touchés ; si racines changent, comparer ensemble complet racines↔AP avant/après. |
| C07 | Partition AP covered non vide, ordonnée, contiguë et exactement égale aux SP sélectionnées ; AP empty sans borne ni SP | AP.subPeriods, SP.from/through/owner | Tous AP, listes SP de chaque AP et table SP entière | AP↔SP ; SP↔AP ; SP→TA | Vérifier union exacte et chaque intervalle/adjacence | Fermer anciens et nouveaux SP des AP touchés ; prouver union et cardinalités avant/après, inclure retraits. |
| C08 | Catalogues Program/Pas : noms normalisés uniques parmi existing par kind, lifecycle/couleurs valides ; références Settings exactes ; existing ne pointe pas deleted | Program, Pas, Settings.program/pas/ownColor | Tous Program existing et tous Pas existing séparément ; tous Settings utilisateurs | catalogue↔Settings inverse ; noms↔catalogue | Valider listes globales, payloads et toutes refs | Inventaire complet des noms du kind et de tous utilisateurs inverses si nom/lifecycle/ref/composition change ; vérifier deleted Settings selon règle R1.2. |
| C09 | PT/RT uniques par couple owner, endpoints présents ; existing exige endpoints existing, deleted admet endpoints présents de tout lifecycle | PT, RT, Project/Reservation/Team Settings | Tous PT/RT S, couples et endpoints | root/Team↔PT/RT ; association→TA/PTEC | Vérifier couples, endpoints, payload/demande/cap | Fermer associations inverses des endpoints touchés, couples et anciennes/nouvelles clés ; classe complète des couples concernés. |
| C10 | Tombstones : PT deleted sans TA/PTEC ; RT deleted sans TA ; root/Team deleted sans association existing ; hide/isActive n'efface rien | Settings, PT/RT, TA, PTEC | Tous deleted et leurs associations/cellules ; toutes associations existing | endpoint↔associations↔TA/PTEC | Vérifier tous les liens sélectionnés | Cascade transitive complète avant/après ; prouver absence de cellules/PTEC orphelins ou sélectionnés sous deleted. |
| C11 | Grille TA = produit de toutes associations existing du root et de toutes SP de son AP ; une cellule par couple, zéro explicite valide | PT/RT, AP, SP, TA.owner/consumed | Pour chaque root, produit `associations existing × SP` et TA S correspondantes | root↔associations, AP↔SP, association/SP↔TA | Construire produit et comparer clés/cardinalités/valeurs | Pour tout root touché, reconstruire produits ancien/nouveau entiers et comparer TA, y compris absences, doublons et retraits. |
| C12 | Une PTEC par PT existing, aucune par PT deleted ni RT ; AP du Project exact, lastActualsDate = AP.through, ETC ≥0 | PTEC, PT, AP, Project | Tous PT S et PTEC S | PT↔PTEC ; PT→Project→AP | Vérifier mapping total et frontière | Fermer PT/PTEC/AP des Projects touchés ; si composition PT change, comparer classe complète PT↔PTEC. |
| C13 | PortfolioOrder est permutation exacte de tous ProjectIds sélectionnés, deleted/inactive compris | PortfolioOrder.projectIds, ProjectSettings | Tous Projects S et tous rangs Order | Project↔Order | Comparer ensembles et unicité des positions | Inventaire complet Projects et Order candidat si l'un change ; aucun contrôle sur un sous-ensemble. |
| C14 | PlanningSettings global unique et payload valide ; horizon, weekdays et maxParallelProjects conformes, sans règle de clipping ajoutée | PlanningSettings | Global unique et listes internes | Manifeste↔PlanningSettings | Valider global et champs | Nouvelle version validée ; preuve d'identité de l'unique global sinon. |
| C15 | Contraintes de dates et lifecycle transverses : intervalles civils, earliest/AP, AP/TA/PTEC et absence d'extension implicite | Settings, Capacity, AP, SP, PTEC, PT/RT | Tous intervalles et relations temporelles applicables | dates Settings↔AP ; AP↔SP/PTEC | Évaluer toutes les relations R1.2 | Fermer chaque dépendance temporelle directe/inverse touchée ; comparer bornes avant/après même si identités stables. |
| C16 | Snapshot autonome : manifeste/résolution exacts, `knowledgeDate` déclarative ≥ maximum des AP.through couverts, deleted/inactive inclus ; Current sans knowledgeDate | PortfolioSnapshot, AP, versions archivées | Toutes refs du Snapshot et tous AP sélectionnés par lui | Snapshot→refs→AP ; aucune dépendance au Current | Certification complète à chaque acquisition Snapshot | Une édition du Current ne recertifie pas Snapshot ; Save futur reste entrée à certifier selon son contrat, archives requises résolubles. |

Pour ne laisser aucun kind implicite, la décomposition locale de C01 à vérifier
pendant P0 est la suivante (la validation du champ inclut types, présence,
bornes et règles croisées indiqués par R1.2 §4.2) :

| Kind | Champs à classer dans le catalogue définitif |
| --- | --- |
| ProjectSettings | `name`, `lifecycle`, `isActive`, `earliestStartDate`, `objectiveEndDate`, `mandatory`, `program`, `pas`, `ownColor` ; mandatory exige objectiveEndDate, Program exclut ownColor. |
| ReservationSettings | `name`, `lifecycle`, `isActive`, `startDate`, `endDate`, `program`, `pas`, `ownColor` ; intervalle inclusif, groupement/couleur. |
| TeamSettings | `name`, `lifecycle`, `isVisible` ; visibilité sans effet sur charge. |
| TeamCapacity | `periods` (`start`, `end`, `dailyCapacity`, `unavailabilityRatio`) et `exceptions` (`date`, `capacity`) ; ordre, non-chevauchement, dates uniques. |
| Program | `name`, `lifecycle`, `color` ; nom normalisé et couleur. |
| Pas | `name`, `lifecycle` ; nom normalisé dans son catalogue distinct. |
| PT | `lifecycle`, `dailyCap` optionnel ; owner ProjectTeam immutable. |
| RT | `lifecycle`, `demand` mode ratio ou fixed-daily exclusif ; owner ReservationTeam immutable. |
| ActualPeriod | `coverage`, `from`, `through`, `subPeriods` exactes ; owner Project ou Reservation. |
| ActualSubPeriod | `from`, `through` ; owner AP. |
| TeamActual | `consumed` exact non négatif ; owner couple association/SubPeriod stable. |
| PTEC | `actualPeriod` identité AP, `lastActualsDate`, `etc` exact non négatif ; owner PT. |
| PlanningSettings | `horizon.start/end`, `workingWeekdays`, `maxParallelProjects` ; owner Portfolio. |
| PortfolioOrder | `projectIds` uniques ; owner Portfolio et couverture C13. |

Le catalogue définitif devra décomposer ces champs en table exhaustive `kind.champ →
prédicats → liens directs/inverses`, y compris chacun des champs de sélection du
manifeste. Il devra préciser les diagnostics R1.2 applicables, la règle de
complétude de chaque classe globale et les cas de `not-established` R1.1.

**Condition d'exhaustivité commune.** Un ensemble n'est complet que si sa source
est le manifeste certifié, que l'index dérivé en a la même génération et la même
révision, que membres et cardinalité sont confrontés à la table de sélection,
et que le delta contrôle additions, remplacements et retraits avec leurs clés
avant/après. Une relation inverse doit être réconciliée avec toutes ses relations
directes. Pour un produit cartésien, les deux facteurs sont complets et chaque
cellule attendue apparaît exactement une fois. Un index simplement présent ou
une entrée de cache manquante ne prouve ni complétude ni absence.

## 4. Contrat de preuve d'une transition ciblée à rédiger en P0

Le futur dossier de transition devra contenir la capacité privée du courant
certifié, génération/révision, commande et réponses liées, refs et clés métier
avant/après, delta typé, ensembles complets, témoins et résultat de chaque
prédicat C01–C16. La fermeture s'étend par liens directs et inverses jusqu'au
point fixe. Pour chaque invariant : **soit** tous ses opérandes et son ensemble
quantifié sont inchangés, avec témoin vérifiable, **soit** le périmètre affecté
est complet avant/après et le prédicat est évalué avec succès sur le candidat.

| Type de changement | Preuve exigée avant publication |
| --- | --- |
| Valeurs | Champs réellement modifiés et égalité des autres champs ; prédicats locaux et dépendances temporelles/catalogue/ETC affectés, même si la ref seule change. |
| Références | Ancienne/nouvelle ref exacte, résolution, owner et base ; comparaison des payloads et clés métier pour décider quelles relations changent ; aucune hypothèse fondée sur `latest`. |
| Composition | Membres ajoutés/retirés et inventaire entier des classes avant/après : mappings, noms, Order, AP/SP, associations ou grilles ; unicité et couverture vérifiées. |
| Suppressions et cascades | Anciennes refs et clés conservées dans le delta ; fermeture inverse transitive endpoint→association→TA/PTEC, AP→SP→TA, catalogue→utilisateurs ; prouver absence d'orphelins et confirmations R1.3. |

Le futur addendum devra distinguer la preuve structurelle R1.2 des obligations
R1.3 (confirmations, revues ETC, stale, versions sélectives, restore, allocation).
Une réponse ETC qui change le delta relance sa fermeture. Tout champ, kind,
relation, index ou prédicat non classé ; tout témoin absent ; toute classe ou
base historique non résolue ; toute incohérence de génération/révision impose le
**refus par défaut** avant publication. Un recours à la validation complète du
candidat sera seulement un cas nommé et documenté avec données intégrales,
preuve qu'elle couvre les prédicats concernés et tests dédiés. Elle ne remplace
ni l'autorité d'unicité ni la résolution d'une base historique exacte. Aucun
repli silencieux et aucune dispense pour une entrée inconnue.

## 5. Trois contrats distincts à spécifier dans l'addendum

### A. Autorité d'unicité

Déclarer la portée de l'autorité (portfolio et passé annoncé de la source RAM,
sans promesse durable inter-processus R2), les namespaces EntityId, VersionId,
owner→identité et couples PT/RT/TA/PTEC/AP/Settings/Capacity requis. Elle doit
attester l'absence historique pour toute création d'identité/couple dans cette
portée et réserver monotoniquement les IDs, couples et VersionIds, états
published/pending/burned inclus. Collision ou absence non prouvée ⇒ refus sans
nouvelle identité de secours. Une nouvelle version d'identité connue peut être
admise sous autorité partielle des identités/couples si owner, base et VersionId
neuve sont prouvés et si aucune autre règle ne requiert l'autorité manquante.
Les réservations ne sont pas recyclées après abandon, stale ou échec.

### B. Répertoire historique

Déclarer la conservation immuable de **toutes** les enveloppes, sélectionnées ou
non, leur résolution par ref exacte, les erreurs « absent », « indisponible » et
« incompatible » distinctes, ainsi que la validation des seules bases
historiques consultées lors d'une édition. Le répertoire peut être cache ou
stockage accessible par port ; cache miss ≠ absence historique. Append B ne
revalide pas H entier. Retrait de S ne détruit ni H ni les refs de Snapshot ;
Snapshot reste résoluble sans Current. Le répertoire ne décide pas l'unicité.

### C. Publication atomique

Déclarer une cellule propriétaire unique du tuple immutable
`{selection, graph fiable, archives/index, revision, generation}`. Toute entrée
externe/remplacement/réhydratation change la génération et exige une nouvelle
certification complète du courant ; le commit compare génération **et**
révision. Le point irréversible est une assignation interne unique du tuple
après tous contrôles et callbacks ; aucun callback externe entre la dernière
comparaison et le swap, ni erreur après swap rapportée comme échec. Échec avant
swap laisse l'ancienne vue identique ; NoOp ne publie rien. Un garde couvre
prepare dès avant allocation, execute, abandon et remplacement ; une réentrance
est refusée avant effet. Un commit concurrent/stale ne publie rien. Le contrat
de port doit empêcher un second écrivain, un alias mutable ou un `publish`
injecté capable de muter puis lever. Ce contrat est RAM ; durabilité, CAS
multi-processus et recovery appartiennent à R2.

## 6. Matrice des responsabilités hexagonales à valider en P0

| Responsabilité | Domain | Application | Port | Adapter |
| --- | --- | --- | --- | --- |
| Schémas, règles R1.1/R1.2, prédicats et fermeture | Autorité pure ; validation complète et ciblée partagent un catalogue | Appelle et exige les témoins | Aucun jugement métier | Aucun jugement métier |
| Commandes R1.3 et obligations | Analyse pure, préconditions, conséquences et validation des réponses | Orchestre prepare/execute, dossiers opaques, stale et ordre des contrôles | Expose capacités nécessaires | Sert les capacités techniques |
| Acquisition du courant/Snapshot inconnus | Résolution exacte et certification complète | Acquiert, lie certificat à génération/révision | Lecture de sélection/versions exactes | Copie, détache et livre les données |
| Identités et archives | Valide owner, ref, base et collisions vues | Demande réservations et lectures exactes ; refuse indisponibilité | Autorité d'unicité distincte du répertoire exact | Tient ledger et archives immuables dans la portée annoncée |
| Publication | Valide le candidat et sa preuve, sans effet | Soumet le tuple après obligations et contrôle stale | Une seule capacité de commit conditionnel | Cellule propriétaire, swap interne non réentrant |
| UI et composition | Aucune dépendance | Expose résultats/obligations | Interfaces indépendantes de l'UI | Composition raccorde sans autorité de certification |

Une seule source de vérité pour le courant et sa génération, un seul catalogue
de prédicats, une seule autorité déclarée par namespace d'identité et un seul
point de commit. Des index dérivés accélèrent les lectures mais ne deviennent
pas autorités métier. Aucun changement de règle ne doit être caché dans un
adapter, un port ou l'UI.

## 7. Livrables de l'exécution documentaire ultérieure de P0

Après audit indépendant du présent plan et GO explicite, l'exécution P0 devra
produire les fichiers suivants, sans code ni lancement de P1–P7. Les chemins
sont proposés ; tout ajustement devra rester dans `docs/steps/PORTFOLIO_VERSIONED/`
et être justifié avant modification.

| Livrable futur | Chemin proposé | Critère d'acceptation documentaire |
| --- | --- | --- |
| Addendum normatif daté | `docs/steps/PORTFOLIO_VERSIONED/rewrite_simplification_p0_addendum.md` | Identifie précisément clauses conservées/remplacées, date d'effet, portée RAM, contrat de refus/repli et statuts sans modifier canons clos. |
| Catalogue exhaustif des invariants | `docs/steps/PORTFOLIO_VERSIONED/rewrite_simplification_p0_invariants.md` | C01–C16 affinés en tous champs des 14 kinds et sélections ; ensembles, liens inverses, témoins, diagnostics et exhaustivité relus contre R1.2. |
| Matrice des clauses historiques | `docs/steps/PORTFOLIO_VERSIONED/rewrite_simplification_p0_clauses.md` | Chaque remplacement B2/H/`withVersions`/certification/atomicité cite source et garantie conservée ; faits historiques restent consultables. |
| Matrice des responsabilités | `docs/steps/PORTFOLIO_VERSIONED/rewrite_simplification_p0_boundaries.md` | Domain/Application/ports/adapters et propriétaire unique vérifiés ; aucun contrat concurrent, aucune autorité UI. |
| Vérification documentaire avant P1 | Section de clôture de l'addendum P0, sans fichier de preuve généré automatiquement | Revue croisée de toutes les garanties R1.1–R1.3, entrées inconnues/Snapshot complets, refus sans fermeture, archives immuables, unicité distincte, commit et traçabilité ; audit indépendant et GO P1 ultérieurs requis. |

Ordre d'exécution documentaire proposé : (1) relever les citations exactes et
geler la matrice historique ; (2) compléter le catalogue champs/prédicats et les
preuves de classes ; (3) formaliser A/B/C et la matrice hexagonale ; (4) rédiger
l'addendum avec renvois ; (5) contrôler cohérence, liens, statuts et périmètre.
Les clauses non résolues bloquent la clôture P0, sans être traitées comme une
permission implicite d'implémenter.

## 8. Critères d'acceptation du présent plan et arrêt

La revue indépendante doit pouvoir vérifier que toutes les garanties métier
R1.1–R1.3 et les décisions A-R12/B1–B4 restent applicables ; que chaque
invariant R1.2 a son ensemble, ses dépendances et ses deux modes de preuve ;
qu'aucune validation ciblée ne passe sans fermeture démontrée ; que toute entrée
inconnue et tout Snapshot acquis sont certifiés intégralement ; que H est
conservé sans certification exhaustive par édition ; que l'autorité des
identités n'est ni le cache ni le répertoire d'archives ; que le propriétaire
et le point de commit sont définis ; et que les textes historiques restent
consultables. Les critères incluent refus par défaut, repli complet nommé et
testable, absence de double source de vérité et absence d'anticipation P1–P7.

**STOP après livraison de ce plan.** L'addendum définitif et les quatre autres
livrables de §7 attendent l'audit indépendant ChatGPT et le GO explicite de
l'utilisateur pour l'exécution documentaire de P0. Aucun statut de lot ne change.
