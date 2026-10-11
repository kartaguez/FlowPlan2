# FlowPlan2 V2 — R1.2-PERF-P2 : validation structurelle et grille TeamActual

2026-10-11 — **PLAN ONLY / PROPOSÉ POUR AUDIT ; GO P2 NON ACCORDÉ**.
**R1.2 IN REVIEW ; R1.3/R1.4/R2 NOT STARTED. Performance globale C maintenue.**
P0-A/P0-B et P1 techniquement acceptés après audit indépendant selon la mission
utilisateur. Leurs contrats et optimisations sont acquis. Ce document prépare
un correctif ; il ne réalise ni optimisation, ni nouvelle campagne, ni clôture.
Audit indépendant de ce plan puis **GO explicite sur un périmètre nommé** requis
avant implémentation. Arrêt après livraison documentaire, commit/push sans force.

## 1. Baseline Git, documents et composants

Dépôt `kartaguez/FlowPlan2`, origin `https://github.com/kartaguez/FlowPlan2.git`,
branche `rewrite/portfolio-versioned`. Préflight avant toute écriture :

- HEAD initial = baseline P1 auditée obligatoire =
  `ee6e26fe9b056fbbd62ffb72be9989385a962e5f`.
- Arbre propre ; `git fetch origin` exécuté avec code 0 ; origin sur le même SHA.
- `git rev-list --left-right --count HEAD...origin/rewrite/portfolio-versioned` :
  **0/0** ; `git cat-file -t` confirme la baseline comme commit présent.
- Aucun commit intercalaire, aucune modification concurrente inexpliquée,
  aucun AGENTS.md applicable dans le dépôt ou ses parents.
- Recontrôler HEAD/arbre/origin avant commit et synchronisation après push ;
  tout travail concurrent doit être conservé, jamais écrasé. SHA final fourni
  dans le compte rendu, sans auto-référence circulaire dans ce fichier.

Documents consultés : [current_plan](../../current_plan.md),
[current_canon](../../current_canon.md), [plan R1.2](./rewrite_r12_plan.md),
[canon R1.2](./rewrite_r12_canon.md), [PERF](./rewrite_r12_perf.md),
[PERF-FIX P0](./rewrite_r12_perf_fix_plan.md), [plan P1](./rewrite_r12_perf_p1_plan.md),
[décisions A-R12-01–09/B1–B4](./rewrite_decisions.md).
Les mentions historiques « audit requis » des livraisons P0/P1 ne contredisent
pas leur acceptation communiquée pour cette mission ; leurs archives restent intactes.

Les chemins `proofs/r12-perf/`, `proofs/r12-perf-fix/`, `proofs/r12-perf-p1/`
sont **relatifs à `docs/steps/PORTFOLIO_VERSIONED/`**, et non à la racine du dépôt.
Examen des inventaires, rapports, statistiques, profils, protocoles/oracles :
[PERF](./proofs/r12-perf/), [P0](./proofs/r12-perf-fix/README.md),
[P1](./proofs/r12-perf-p1/report.md), [fixtures P1](./proofs/r12-perf-p1/fixtures.json),
[attribution CPU P1](./proofs/r12-perf-p1/profile-posts.json).
Aucune preuve historique modifiée ni résultat historique présenté comme exécuté ici.

| Composant examiné sous `src-v2/` | Acquis / périmètre futur |
| --- | --- |
| `domain/portfolio/graphValidation.ts` | `validateResolved` privé, unique cible de production de l'option A ; structure puis grille puis ordre |
| `domain/portfolio/graphResolver.ts` | Manifeste → registre complet → lookup exact batch → inventaires ; P1 conservé |
| `domain/portfolio/manifest.ts` | Copies, 12 tables, unicité selected par identité et ordre des références ; inchangé |
| `domain/versioning/localVersionTables.ts` | Trie de Maps par composants primitifs, projections d'identité/référence/owner ; réutilisable sans nouvelle API publique |
| `domain/versioning/versionRegistry.ts` | P0 unicité contextuelle/historique sur toutes versions fournies, P1 batch ; aucun changement |
| `domain/portfolio/validatedPortfolioGraph.ts` | Factory opaque unique unknown, aucune entrée trusted ; inchangée |
| `application/portfolio/loadPortfolioGraph.ts` | Collect, contrôles ports, revalidation et certification ; inchangé, aucune anticipation P3 |
| `application/portfolio/r12.test.ts` | G12-01–13, P0/P1, lifecycle/partitions/grille/copie/gel ; ajouts futurs seulement après GO |

## 2. Diagnostic mesuré de référence

Médianes P1 en secondes, conservées sans remesure dans cette session :

| Opération complète | Moyen sparse | Moyen dense |
| --- | ---: | ---: |
| M1 — Registre | 0,444 | 2,832 |
| M2 — Résolution | 0,519 | 3,318 |
| M3 — Validation | 0,915 | 20,792 |
| M4 — Certification Snapshot | 0,945 | 21,128 |
| M5 — Chargement Snapshot | 1,472 | 24,489 |
| M6 — Chargement Current | 1,433 | 23,853 |

Moyen dense : 55 404 versions selected, 2 000 PT + 20 RT, 2 640 SubPeriods,
**48 480 TA = 48 000 Project + 480 Reservation**. Moyen sparse : 8 604 versions,
200 PT + 20 RT et 5 280 TA. Les fixtures ne sont pas des historiques exhaustifs.

Profil dense : callback de grille (TS ligne 87, JS historique ligne 120),
**75,01 % inclusifs de M3, 63,12 % de M5**. Goulet majeur établi.
Lecture supplémentaire ici, en mémoire seulement, des profils bruts P1 : pour
chaque sample, remonter les parents et compter une fois chaque frame Domain
par `(functionName, lineNumber)`, pondérée par `timeDeltas`, rapportée au total.
`validateResolved` : **83,68 % M3 / 70,40 % M5** ; `ofKind` : **1,11 % / 0,92 %** ;
`equal` : **0,28 % / 0,26 %**. Les callbacks structurels visibles hors grille
sont chacun ≤0,21 % / ≤0,15 % dans ces profils. Ces postes se recouvrent ;
frames inlinées/JIT, GC et code self non attribué limitent cette lecture.
Elle ne fournit aucune durée exclusive ni preuve que les autres scans coûtent zéro.
Sources : `proofs/r12-perf-p1/p1-cpu/medium-dense-M3.cpuprofile` et `...M5.cpuprofile`.

La grille est le dominant **démontré** ; les autres recherches sont des coûts
algorithmiques réels mais sans dominance séparée établie. Le sparse conserve un
registre inclusif important (M3 46,40 %, M5 56,42 %), hors périmètre P2.
Ne pas multiplier les pourcentages par les médianes, soustraire M2 de M3 comme
mesure de sous-phase, ni convertir les timeouts P0 en durées/gains.

## 3. Cartographie ordonnée des boucles et complexités

Notations : N versions selected ; P Projects, R Reservations, T Teams,
K Capacities, A AP, S SubPeriods selected, Q somme des références de partitions,
L PT, H RT, E PTEC, C TA observées, F cellules attendues ; G/D Program/Pas,
O entrées PortfolioOrder. F = somme, par AP, de ses associations existing ×
sa partition. Sur graphe valide Q=S, C=F ; ce n'est pas une précondition d'entrée.
Facteurs additionnels : longueur des chaînes/records pour égalité et allocation,
coût civil des dates ; Maps amorties attendues, aucun pire cas constant promis.

Les phases ci-dessous suivent **exactement** `validateResolved` à la baseline.

| Ordre | Boucles / recherches | Temps maximal du parcours ciblé | Temporaires / observation |
| --- | --- | --- | --- |
| 0 | Dix `ofKind` initiaux (`filter` sur N) | O(10N) | Dix tableaux, somme ≤N ; aucun tri |
| 1 | Toutes versions : owner Portfolio comparé au manifeste | O(N) | Égalité structurée, premier FOREIGN_PORTFOLIO |
| 2 | Chaque Team filtre K capacités ; puis chaque Capacity cherche une Team | O(TK + KT) | Tableau par Team, même deleted ; count puis owner étranger |
| 3 | Projects puis Reservations : filtre A AP ; Program puis Pas : `ofKind` puis `find` | O((P+R)A + (P+R)N + PG + RG + PD + RD) | Copies `[...projects,...reservations]`, filtres AP/catalogues ; null sauté ; AP requis avant catalogue du même owner |
| 4 | Program puis Pas : filtre N, filtre existing, map clés et Set | O(N+G+D), hors normalisation noms | Tableaux et Set par kind ; uniquement noms existing |
| 5 | Chaque PT : find Project, Team ; filtre E PTEC ; pour PTEC retenus find AP | O(L(P+T+E) + EA) | Tableau PTEC par PT ; endpoints, cardinalité puis owner AP/frontière |
| 6 | Chaque RT : find Reservation et Team | O(H(R+T)) | Endpoints existing/deleted conservés |
| 7 | Chaque PTEC : some PT | O(EL) | Owner étranger après tous PT/RT |
| 8a | Chaque AP : find root ; pour Project, nouveau find identité | O(A(P+R)) | AP propriétaire puis earliest, ordre AP selected |
| 8b | Chaque ref de partition : find S par référence **exacte** | O(QS) | Partition courante et `partitionRefs` cumulée O(Q) |
| 8c | Premier/dernier puis adjacency dans ordre déclaré | O(Q) | Dates contiguës ; aucun tri ni réparation |
| 8d | Chaque AP filtre tous PT ou RT par owner ; existing × partition | O(A(L+H)+F) | Tableau associations par AP, `expectedCells` de F couples |
| 9 | Longueurs Q/S puis chaque sub cherche une ref dans Q | O(SQ) | Short-circuit cardinalité, puis membership exact |
| 10 | Longueurs C/F puis chaque attendu filtre **toutes C TA** | O(FC), donc O(C²) sur grille valide | F tableaux filtrés, comparaisons association puis SubPeriod |
| 11 | `ofKind` PortfolioOrder, longueurs puis chaque Project cherche son ID | O(N+PO) | Après grille, inactive/deleted inclus |

Ces bornes décrivent des chemins complets/sans erreur ; `find`/`some` peuvent
s'arrêter plus tôt. `filter` parcourt toujours la collection entière. Pour la
grille valide dense, **F×C = 2 350 310 400 visites** ; sparse : 27 878 400.
Chaque visite compare l'identité d'association, puis la SubPeriod uniquement
si l'association correspond (court-circuit). `sameIdentity` compare kind et
valeur EntityId ; les familles ont été imposées par les factories. Ce ne sont
ni comparaisons de pointeurs ni références exactes de version.

Les tableaux filtrés de la grille ont généralement une entrée sur état valide,
mais subissent F allocations ; volume cumulé pouvant atteindre O(FC) sur des
entrées arbitraires, sans prétendre que toutes allocations vivent simultanément.
`expectedCells` garde O(F) couples. La détection manquante coûte jusqu'à O(FC),
parfois court-circuitée au premier manque ; absence et étrangère sont une erreur
commune. Cardinalité différente refuse immédiatement ; cardinalité égale exige
un compte exactement un pour chaque couple attendu et exclut donc extras/substitutions.
`filter.length !== 1` refuse doublons autant qu'absences. La quantité, zéro ou
positive, n'entre pas dans cette comparaison : elle est déjà validée en amont.
Les associations deleted ne génèrent aucun attendu ; une TA les visant rend
la grille incorrecte (ou déclenche une erreur antérieure, notamment PTEC).

Scans connexes, comptes illustratifs sans conversion en temps : QS et SQ
jusqu'à 6 969 600 comparaisons chacun pour S=Q=2640 ; LE et EL jusqu'à
4 000 000 chacun ; (P+R)A=12 100 ; TK=400 ; A(L+H)≤222 200 ; PO=10 000.
Les `ofKind` catalogues par owner rescannent N, même avec un seul Program/Pas
(≈12,2 millions de visites si les deux références sont non null pour 110 owners).
Ces scans pourront devenir visibles après A, mais leur poids actuel ne justifie
pas une extension automatique. Le payload AP déduplique aussi ses refs par
`some` (O(s_ap²)) **avant** `validateResolved`, dans `payloadValidation.ts` ;
il reste hors P2, comme toutes copies/validations/filiations P0/P1.

## 4. Conception proposée : clés stables et décision différée

### 4.1 Clé d'une cellule

Tuple de six composants primitifs, avec niveaux distincts de Maps/trie :

`(association.kind, association.entityId.family, association.entityId.value,
subPeriod.kind, subPeriod.entityId.family, subPeriod.entityId.value)`.

PT et RT textuellement identiques restent distincts ; ActualSubPeriod et les
familles restent explicites. Ni `versionId` d'association/SP ni identité TA
n'entrent dans cette clé : on vérifie le couple stable métier, sans changer
l'identité propre de la version TA. Modifier les dates sous la même SP ne change
pas la cellule ; split/merge de SP change les identités selon le contrat existant.

Réutiliser `LocalVersionTable<number>` ou Maps imbriquées natives, dans Domain,
avec petit projecteur privé recevant des **EntityIdentity validées**. Le helper
`identityParts` existant reçoit une ExactReference : ne pas inventer un versionId
ni forcer un cast pour y passer les owners TA. Un projecteur privé de six
composants évite une nouvelle API générique. Alternative à auditer : projection
`ownerParts('TeamActual', owner)` si le même owner typé est construit pour chaque
attendu ; garder PTSubPeriod/RTSubPeriod et tous composants, sans alias.
Recommandation : tuple direct, un seul projecteur pour attendu/observé.

Aucune concaténation, séparateur, JSON, hash de contenu, trim, normalisation,
ordre de propriétés ou comparaison d'objets en mémoire. Les familles fixes sur
les entrées valides assurent l'équivalence avec `sameIdentity` actuel ; toute
famille forgée est refusée par les factories avant construction. Tester les
composants adversariaux et les discriminants séparément.

### 4.2 Algorithme A minimal

Conserver l'intégralité des phases 0–9, `partitionRefs`, `expectedCells` et leur
ordre. Ne construire la table de grille **qu'après** succès de `EXTRA_SUBPERIOD`.

1. Conserver d'abord `actuals.length !== expectedCells.length` et son diagnostic
   actuel ; si différent, refuser sans créer l'index.
2. Parcourir les TA selected dans leur ordre et incrémenter le compte de leur clé.
   Ne jamais écraser par un booléen ni dédupliquer. Pas de diagnostic pendant
   cette préparation ; une répétition ne devance aucune validation historique.
3. Parcourir les `expectedCells` dans leur ordre actuel et vérifier compte = 1.
   Une clé absente est un **compte absent de l'index**, jamais une Consumption zéro
   créée implicitement. Tout échec retourne l'erreur historique unique
   `INCOMPLETE_OR_FOREIGN_ACTUAL_GRID`, path `teamActuals`, message identique.
4. Continuer le PortfolioOrder seulement après réussite de la grille. Retourner
   le même graphe déjà copié/gelé, sans le trier ni l'augmenter.

Preuve : les partitions valides sont uniques/owned/exactes, les associations
selected uniques sont établies par manifeste/registre et endpoints. Les F couples
attendus sont donc distincts. C=F et chacun de ces F couples compté exactement
une fois impliquent aucune TA étrangère/restante/doublée. L'autre sens est immédiat.
Ainsi les prédicats ancien/nouveau sont équivalents ; ne pas ajouter une nouvelle
validation TA owner ailleurs dans le pipeline. Conserver les contrôles registre
sur deux identités TA de même cellule même **non selected** : ils restent prioritaires.

Temps de grille attendu O(C+F), plus chaînes/clés, espace supplémentaire O(U)
pour U couples observés distincts ≤C, en plus des O(F) attendus existants. Petit
tuple par lookup, nœuds du trie et compteurs : allocation réelle à mesurer.
Aucune affirmation que le pipeline M3/M5 devient entièrement linéaire.

Toutes structures sont opération-locales, dérivées du graphe sélectionné résolu
et validé en amont, abandonnées après appel. Ni versions historiques non selected,
ni cache de certificat, ni Map ajoutée au registre, au graphe, aux inventaires,
au contexte ou à `ValidatedPortfolioGraph`. Aucun format/API public changé.

## 5. Options et recommandation bornée

| Critère | A — grille seulement | B — grille et scans associés explicitement choisis |
| --- | --- | --- |
| Temps | O(FC) → O(C+F) ; tous autres termes §3 conservés | Même grille ; scans choisis remplacés par préparation + lookup amorti |
| Mémoire | +O(C) au plus ; O(F) couples gardés | +O(C+P+R+T+K+A+S+Q+L+H+E+G+D+O) si toute liste ci-dessous retenue |
| Code | Un bloc de `graphValidation.ts` et projecteur privé ; tests spécifiques futurs | Plusieurs phases du même fichier et projecteurs/buckets, tests par scan ; aucune refactorisation générale |
| Équivalence | Faible surface ; preuve C=F + comptes ; priorité par construction tardive | Risque `find` premier devenu dernier, count devenu présence, ordre des buckets, clé owner/kind et référence exacte |
| M3/M5 probable | Fort gain dense vraisemblable, gain sparse plus limité ; sans chiffre garanti | Gain additionnel possible, actuellement non démontré ; allocation et préparation peuvent coûter sur petits |
| Nouveau goulet | Partitions/PTEC/ofKind ou coûts registre/copie visibles | Registre/copies/filiations restent ; B ne permet pas P3 |
| Diagnostics | Une seule décision au point historique | Décisions maintenues à chaque point existant, aucun contrôle groupé déplacé |
| R1.3 futur | Certificat/contrats identiques, aucun index réutilisable par commandes | Même obligation ; aucune autorité de préparation/transition, aucune API d'index à R1.3 |

**Recommandation A.** La dominance de la grille est démontrée et sa suppression
quadratique peut vraisemblablement suffire à lever le principal blocage dense.
Cela ne démontre pas encore que Snapshot devient compatible avec R1.3 : coûts
nécessaires du registre, copies et scans résiduels devront être remesurés. Aucun
scan connexe n'est proposé comme inclusion obligatoire sans coût démontré.

**B est une alternative soumise à arbitrage, jamais automatiquement autorisée.**
Liste fermée de substitutions possibles, à nommer individuellement dans un GO :

- Capacity par Team (bucket/count) et membership Team : O(T+K).
- AP par owner Project/Reservation discriminé : O(P+R+A) préparation puis lookup.
- Settings/endpoints par famille/valeur root ID : O(P+R+T+L+H), premier élément.
- PTEC par identité PT, membership PT : O(L+E), buckets ordonnés et count.
- SP par **référence exacte** (`referenceParts`) pour partitions et membership
  partition exact : O(S+Q), conserver les longueurs Q/S et toutes décisions locales.
- Associations par owner Project/Reservation : O(L+H+A+F), buckets ordonnés,
  conserver les associations deleted pour les phases qui les contrôlent.
- Catalogues selected par identité, listes Program/Pas une fois ; noms existants
  inchangés : O(N+G+D+P+R), aucun changement de normalisation.
- Membership PortfolioOrder par famille/valeur ProjectId : O(O+P), contrôle final.

Ces termes remplacent uniquement les recherches, pas les validations de payload.
Construction différée avant la première phase concernée, ou préparation sans
émission d'erreur puis décision au point historique. Buckets gardent multiplicité
et ordre ; tables de `find` gardent le premier, sans présumer silencieusement une
unicité plus forte. AP owner ne peut être indexé naïvement avec
`ownerParts(kind, owner)` si kinds AP/Settings diffèrent : projection de même
owner discriminé explicitement. Toute substitution doit avoir son propre test
multidéfaut et justification mesurée (profil/laboratoire séparé après A ou attribution
P1 approfondie), ainsi qu'un GO qui la cite. Pas d'extension adaptative pendant
l'implémentation A ; si scans dominants résiduels, rapporter limite et demander
nouvelle décision après livraison du périmètre autorisé.

## 6. Garanties métier et priorité des diagnostics

Invariants inchangés : exactement une TA par association **existing** × SP
selected owned ; zéro explicite accepté au même titre que positif ; deleted
sans TA et PT deleted sans PTEC ; AP de tous propriétaires même deleted conservés,
partitions et owners respectés. Aucune réduction pour inactive/hidden/demande RT
zéro/ETC zéro. Tombstones et historiques non selected conservés. Aucun déplacement
de consommation, redistribution, prorata, fallback zéro ni règle ever-nonzero.
Le registre garde ses unicités historiques contextuelles et le contexte R1.1
reste exactement établi/not-established selon données fournies. Pas de prétention
à unicité durable exhaustive de R2 ou validation d'une transition R1.3.

Priorité externe inchangée : wrappers/ports selon point d'entrée ; Snapshot
factory avant validation de graphe ; resolver **manifeste avant registre complet
avant lookup exact**, puis `validateResolved`. Dans collect : réponse port,
registre complet, missing de lot avant extras de cardinalité, puis certification.
Une erreur de manifeste, registre, payload Capacity ou référence exacte ne peut
être remplacée par une erreur de grille. Les erreurs multiples du contexte R1.1
conservent leur liste et leur ordre ; `validateResolved` s'arrête au premier refus.

Ordre interne exact à conserver (message par défaut = code, sauf erreur civile
propagée ; conserver les objets publics complets, pas seulement les codes) :

| Phase | Diagnostics / paths dans ordre de décision |
| --- | --- |
| Portfolio | `FOREIGN_PORTFOLIO` / `versions.${version.ref.kind}` |
| Capacities | `TEAM_CAPACITY_REQUIRED`, `FOREIGN_CAPACITY_OWNER` / `teamCapacities` |
| Owners Projects puis Reservations | Pour **chaque owner** : `ACTUAL_PERIOD_REQUIRED` / `actualPeriods`, puis Program puis Pas : `MISSING_CATALOG_REFERENCE` ou `DELETED_CATALOG_REFERENCE` / `${owner.ref.kind}.${kind}` |
| Noms catalogues | Program puis Pas : `DUPLICATE_CATALOG_NAME` / kind |
| PT | Pour **chaque PT** : `MISSING_ASSOCIATION_ENDPOINT`, `DELETED_ASSOCIATION_ENDPOINT` / `pts`, puis `PTEC_SELECTION_MISMATCH`, puis par PTEC `PTEC_AP_OWNER_MISMATCH`, `PTEC_ACTUALS_BOUNDARY_MISMATCH` / `ptecs` |
| RT | Pour chaque RT : mêmes erreurs endpoints / `rts` |
| PTEC étrangers | `FOREIGN_PTEC_OWNER` / `ptecs` |
| AP et partitions | Pour **chaque AP** : `FOREIGN_AP_OWNER`, `AP_BEFORE_EARLIEST` / `actualPeriods` ; par ref : `MISSING_PARTITION_REFERENCE`, `SUBPERIOD_AP_OWNER_MISMATCH` / `actualSubPeriods` ; `PARTITION_BOUNDARY_MISMATCH` / `actualPeriods` ; erreur civile propagée ou `NON_CONTIGUOUS_PARTITION` / `actualSubPeriods` |
| Fermeture SP | `EXTRA_SUBPERIOD` / `actualSubPeriods` |
| Grille | `INCOMPLETE_OR_FOREIGN_ACTUAL_GRID` / `teamActuals` |
| Ordre | `INCOMPLETE_PORTFOLIO_ORDER` / `portfolioOrder` |
| Borne Snapshot finale | `SNAPSHOT_BEFORE_ACTUALS` / `snapshot.knowledgeDate` après validation entière |

Ne pas remplacer cet ordre par « toutes erreurs AP puis toutes erreurs catalogue »
ou « tous endpoints avant tous PTEC » : les contrôles sont entrelacés par owner/PT.
Un AP suivant invalide doit toujours devancer un défaut de grille d'un AP précédent.
Double identité TA du même couple peut déjà produire `OWNER_IDENTITY_CONFLICT` /
`versions` au registre ; même identité selected deux fois produit
`MULTIPLE_IDENTITY_SELECTION` dans le manifeste. Ne pas forcer ces cas jusqu'à
la grille ni ajouter une erreur anticipée de doublon dans l'index.

## 7. Tests différentiels futurs : véritable oracle P1

**Non exécutés dans ce PLAN ONLY.** Après audit/GO, créer deux clones jetables
sans hardlinks, sorties `.test-dist-v2` distinctes et processus Node séparés :
baseline checkout exact `ee6e26fe9b056fbbd62ffb72be9989385a962e5f` (vérifier
HEAD/tree), candidat sur cette même baseline plus le seul patch P2 autorisé.
Dépendances existantes uniquement ; aucun module candidat importé par baseline.
Compiler avec la configuration existante dans chaque clone. Archiver SHAs/trees,
hashes sources/outils/corpus et commandes absolues. Aucun checkout simulant P1
par reconstitution de ses algorithmes, aucun oracle P0 à la place de P1.

Rejouer sans réécriture le corpus P1 final **941 cas** (incluant les 563 P0),
avec le vrai `lookupExactBatch` P1 dans les deux environnements. Étendre via
nouveau harness de preuve P2 uniquement après GO ; anciennes preuves immuables.
Figer toutes réponses baseline du corpus étendu avant code candidat ; les ajouts
ultérieurs sont rejoués sur les deux versions et distingués du sous-corpus figé.

Comparer toutes réponses publiques de factories/registre/résolution/certification/
chargements Snapshot et Current : acceptations/refus, erreurs **code/path/message/
ordre**, versions exactes/owners/payloads/links/provenance, inventaires ordonnés,
rapports contextuels et missing ; BigInt exact typé, clés records sans ordre
significatif, listes avec ordre/multiplicité. Archivage des réponses complètes
et diff zéro requis, pas seulement hashes/booleans. Lectures ports réelles exercées.

| Extension P2 | Attendu / priorité à comparer à P1 |
| --- | --- |
| Grilles dense/sparse complètes, AP vide, couvert sans association | Acceptations et sorties complètes, C/F exacts |
| Cellule absente ; supplémentaire ; substitution avec C=F | Refus grille sans réparation ; tester manque début/milieu/fin et égalité des longueurs |
| Deux TAId pour même couple ; même TAId répété/version selected multiple | Refus historique registre/manifeste prioritaire, non renommé en grille ; compte local testé séparément si utile |
| Zéro, positif, zéro manquant | Zéro présent accepté ; absent refusé ; payload famille négative/forgée prioritaire |
| TA sous PT/RT deleted | Retirer PTEC du PT deleted pour atteindre la grille ; avec PTEC conservé, diagnostic PTEC avant grille |
| PT/RT avec mêmes valeurs textuelles EntityId | Aucune collision de kind, SP de plusieurs AP et mêmes valeurs d'autres familles |
| TA foreign association/SP ; mauvaise association référencée | Grille ou erreur amont exacte selon mutation, SP owner AP respecté |
| Partition absente/ref exacte manquante, dupliquée, chevauchante/gap/inversée | Resolver/payload `DUPLICATE_SUBPERIOD` ou phase partition avant grille ; garder oracle réel |
| Project/Reservation deleted avec AP couvert, anciennes TA positives non selected | Acceptation sans règle ever-nonzero ; selected invalides refusées |
| Team deleted avec Capacity ; hidden/inactive | Capacity exigée ; aucune réduction de grille hidden/inactive |
| Versions historiques multiples de TA/association/SP | Identité stable de cellule, ref exacte SP partition et manifeste, rapports contextuels inchangés |
| Plusieurs défauts simultanés | Capacity+grille, AP requis+catalogue, catalogue+grille, PT/PTEC+RT, PTEC+partition, partition+grille, EXTRA_SUBPERIOD+grille, grille+ordre, ordre+borne Snapshot ; manifeste/registre/missing+grille |

Identifiants adversariaux : `__proto__`, `constructor`, séparateurs `/ : |`,
guillemets/backslashes, NUL, préfixes communs, espaces conservés, Unicode et
formes composées/décomposées distinctes, chaînes longues admissibles. Cas de
collision de concaténation entre composants ; familles/kinds erronés refusés
avant index. Permutations déterministes des versions fournies, tables selected,
TA, owners/AP/PT/RT, clés records ; ordre SP volontairement modifié est un cas
invalide, jamais trié. Comparer P1/candidat pour **chaque permutation**, pas
exiger que deux permutations invalides aient le même premier diagnostic.

Vérifier séparément copie/gel profonds runtime : mutation d'entrées imbriquées
après résultat, gel de versions/payloads/owners/refs/listes/inventaires/contexte,
absence de mutation en échec, batch P0/P1 atomique, marque forgée et donnée
sérialisée unknown revalidées. Le transport JSON ne démontre pas l'immutabilité.
Aucune Map/propriété d'index visible dans les réponses publiques.

Suites futures : `npm run test:v2`, ciblés R1.1/R1.2/gates G12-01–13 et
régressions P0/P1, `npm run check:boundaries:v2`, `npm run typecheck:v2`,
`npm run build:v2` ; ne supprimer ni affaiblir de test/garde. Les 189/32/118
PASS P1 sont historiques, jamais un résultat P2 exécuté dans cette livraison.

## 8. Protocole de benchmark futur, sans changer les outils

Comparer **P1 exact imposé contre candidat P2**, campagnes contemporaines sur
même matériel/environnement, séquentielles, un seul benchmark actif, aucun test/
compilation/oracle simultané. Documenter Node/npm/TS/OS/CPU/RAM/charge non réservée,
SHAs/trees/diff de production et hashes des sept fichiers/outils inchangés de
`scripts/benchmarks/r12-perf/`. Candidat mesuré committé dans son clone local
pour contrôle productionDiff, jamais poussé comme branche de laboratoire.
Source mesurée identique à la livraison finale. Aucun benchmark lancé ici.

Réutiliser `verify.mjs`, `run.mjs`, `summarize.mjs`, `profile-summary.mjs` et
`fixture.mjs` **sans modification** ; mêmes seed **1202**, volumes et hashes
[fixtures P1](./proofs/r12-perf-p1/fixtures.json). Rapport/preuves P2 nouveaux
après GO seulement ; ne jamais remplacer les sorties P1/P0/PERF historiques.

- Cinq scénarios : petit sparse, petit dense, petit historique, moyen sparse,
  moyen dense ; M1–M6 complets, M6 historique NOT_EXECUTED (Current null).
- Chaque scénario/API dans enfant neuf, **30 s par phase**, old-space **1024 Mio**,
  cold + un warm-up + **trois répétitions** ; fixture/import/compilation et setup
  adapter hors timing API, setup consigné. Cold M5/M6 bénéficie du setup chauffé.
- Médianes/min/max/SD population/IQR, CPU user+system, heap observée/endpoints/deltas
  et GC, RSS/maxRSS lifetime, interruptions et refus/crashes documentés ; jamais PASS
  pour timeout/refus. Pas de gain extrapolé depuis timeouts antérieurs.
- Grands sparse/dense seulement si les deux moyens sont maîtrisés et ressources
  disponibles, campagne séparée avec `--allow-large` explicite ; pas d'activation
  automatique ni qualification à partir de volumes théoriques.

Commandes indicatives, à exécuter dans chacun des deux clones après compilation
avec sorties distinctes (PREFIX désigne un répertoire de preuve nouveau) :

```sh
node scripts/benchmarks/r12-perf/verify.mjs
node scripts/benchmarks/r12-perf/run.mjs --scenarios=small:sparse,small:dense,small:history --output=PREFIX/small.json
node scripts/benchmarks/r12-perf/run.mjs --scenarios=medium:sparse,medium:dense --output=PREFIX/medium.json
node scripts/benchmarks/r12-perf/summarize.mjs PREFIX/summary.json PREFIX/small.json PREFIX/medium.json
node scripts/benchmarks/r12-perf/run.mjs --scenarios=medium:sparse,medium:dense --operations=M3,M5 --repeats=1 --profile --output=PREFIX/cpu.json
```

Profils Inspector cible 1 ms, cold/warm-up puis mesure profilée, séparés des
statistiques ordinaires ; relancer **M3 et M5 sparse/dense P1 et P2**. Rapporter
parts self/inclusives de `validateResolved`, callback/phase grille, construction
index, partitions/PTEC/endpoints/ofKind, registre, copie/validation, GC ; adapter
le mapping de lignes candidat dans **nouvelle analyse de preuve**, jamais modifier
le lecteur historique. Une disparition de callback ne prouve pas seule le gain.
Les inclusifs se recouvrent et ne sont ni additifs ni durées exclusives.

Coûts spécifiques des index : compter C observées, F attendues, U clés/nœuds et
recherches (C insertions + F lookups maximum) via lecture/inspection et, si besoin,
instrumentation dans une **copie de laboratoire jetable séparée**. Pour timings
construction/vérification et mémoire temporaires, mesure locale séparée avec
mêmes données et source instrumentée identifiée ; **exclue** des M1–M6 de référence.
Ne changer aucun outil/fixture de référence ni source livrée pour instrumenter.
Les mesures de laboratoire incluent leur overhead et ne sont pas un pic exclusif
fiable sans instrumentation appropriée. M1/M2 inchangés servent aussi de contrôle
sur dispersion/environnement ; aucun gain P2 attendu de leurs algorithmes.

Heap endpoints = bornes basses des pics, maxRSS = processus entier fixture/setup
inclus. Polling externe best effort déjà EPERM dans P1 : consigner indisponibilité
si répétée. GC après relâchement ne prouve pas absence de fuite. Documenter coût
mémoire des nœuds Maps et nombre de chaînes/composants, pas le déduire du seul
écart RSS. Tester répétitions sans retenir index, sans promettre petit matériel,
Windows, UI ou persistance. Identifier tout nouveau dominant sans l'optimiser
hors GO ; ne pas extrapoler à partir de deux tailles comme loi expérimentale.

## 9. Réception : deux verdicts indépendants

| Verdict | Conditions de réception futures |
| --- | --- |
| **P2 techniquement conforme** | Oracle vrai P1 zéro divergence, réponses/diagnostics identiques ; scans FC ciblés disparus par inspection et compte d'opérations ; aucune régression R1.1/R1.2/P0/P1 ; copies/gel séparément prouvés ; index temporaires internes Domain seuls ; frontières/tests/typecheck/build PASS ; patch strictement dans option autorisée |
| **Performance globale A/B/C** | M1–M6 remesurés sur cinq scénarios, dispersion/CPU/mémoire/setup/profils publiés ; moyen sparse et dense maîtrisés, Snapshot compatible avec poursuite R1.3 selon appréciation indépendante explicite ; nouveaux goulets et limites documentés |

A : absence de blocage mesuré ; B : réserves documentées compatibles avec la
poursuite ; C : blocage ou acceptabilité non établie. Pas de SLA chiffré inventé.
Terminer sous 30 s ne suffit pas ; jugement Snapshot sur latence/dispersion et
ressources, à auditer. Réussite technique P2 **ne vaut ni A/B automatique, ni
clôture R1.2, ni GO R1.3**. Si critères globaux non satisfaits, C demeure et
nouvelle décision nécessaire, sans P3 implicite.

## 10. Risques et arbitrages ouverts avant GO

| ID | Décision à auditer / risque |
| --- | --- |
| A-P2-01 | Approuver A recommandé, ou B avec liste explicite de scans choisis et coûts démontrés ; aucun B par défaut |
| A-P2-02 | Valider tuple six composants et réutilisation trie existant ; coûts de nœuds/allocations à mesurer, aucun changement identité TA |
| A-P2-03 | Valider construction de grille après EXTRA_SUBPERIOD et cardinalité avant index ; priorité exacte non négociable, aucune divergence silencieuse |
| A-P2-04 | Réception globale après mesures, sans seuil arbitraire ; si Snapshot reste trop lent, livrer limite puis nouvelle instruction |

Risques : écrasement de doublon dans table, confusion PT/RT, SP d'autre AP,
référence stable utilisée à la place d'exacte pour partition, count remplacé par
présence, changement d'ordre `find`/erreurs, allocation temporaire dense, faible
gain sparse, JIT/GC/OS biaisant profils. Réduire par comptes, clés structurées,
construction tardive, oracle multidéfauts, campagnes séparées et bornes mémoire.
Les O(F) couples existants restent volontairement pour limiter la surface A ;
leur suppression/streaming n'est pas inclus implicitement dans ce plan.

Interdits : P3 validations/copies répétées, refactorisation générale pipelines,
cache/autorité persistante, mémoïsation générale filiations, changement contrat
R1.1/R1.2, identité TA ou format manifeste, métier Actuals/PTEC, commandes R1.3,
moteur R1.4, persistance R2, UI, migration legacy, dépendance externe.
Toute autre cible que la liste approuvée requiert une décision séparée.

## 11. Découpage futur d'implémentation et livraison documentaire

1. Audit indépendant du plan puis GO explicite avec A-P2-01–04 et option/scans.
2. Nouveau préflight, baseline P1 exacte confirmée, clones isolés ; figer oracle
   précédent et extension P2 sur P1 avant production ; hashes outils/proofs.
3. Implémenter **uniquement** option autorisée : A bloc grille/projecteur privé,
   aucun déplacement de phase ; régressions locales et copie/gel séparés.
4. Différentiel intégral, suites/gates/frontières/typecheck/build ; écart de
   diagnostic = défaut à corriger, jamais normalisation de l'oracle.
5. Campagnes P1/P2 M1–M6, profils M3/M5 et laboratoire index séparé ; aucun B/P3
   ajouté face à un goulet nouveau. Rapports et deux verdicts indépendants.
6. Revue diff complet, exclusivité du scope, diff-check ; rollback dans clone
   jetable vers tree baseline sans action destructive sur dépôt partagé ;
   commit normal/push sans force après vérifications, audit de réalisation requis.

**Livraison de cette session : documentaire uniquement.** Nouveau présent plan,
liens/état ajouté seulement dans `docs/current_plan.md` et `docs/current_canon.md`.
Canons historiques, décisions métier, sources, tests, scripts, fixtures et preuves
inchangés. Aucun test/typecheck/build/benchmark lancé pour ce plan ; les seuls
contrôles exécutés ici sont lecture/analyse, Git et revue documentaire/diff-check.
Après revue complète et `git diff --check`, commit/push normaux sur la branche
active, vérifier HEAD local/distant et arbre propre. Arrêt impératif ; aucune
implémentation sans audit indépendant et GO explicite.
**R1.2 IN REVIEW ; R1.3/R1.4/R2 NOT STARTED ; classification C maintenue.**
