# FlowPlan2 V2 — PLAN de simplification architecturale R1.1–R1.3

**Statut : PLAN ONLY, proposé à l'audit indépendant.** Base examinée :
`d88ef817f3bedd19d3fad809a5cc31673536d623`, branche
`rewrite/portfolio-versioned`. Préflight : HEAD = origin, divergence 0/0,
arbre propre. R0/R0.1/R1.1/R1.2 restent DONE ; R1.3 reste IN REVIEW ;
R1.4/R2 ne commencent pas. Aucun contrat ci-dessous n'est déclaré livré.

## 1. Synthèse exécutive et portée normative

Conserver la validation complète **du courant sélectionné** à toute acquisition
externe/non certifiée. Ensuite, représenter le courant, ses index de dépendances
et sa révision par une seule capacité de session non forgeable. Une transition
pure calcule son delta et une fermeture des dépendances ; le Domain contrôle les
invariants de cette fermeture, l'Application orchestre obligations, allocations
et publication unique. Si la fermeture ne peut être prouvée, refus ou validation
complète explicite. Les versions archivées, sélectionnées ou non, restent
immuables et résolubles exactement ; leur validation exhaustive ne conditionne
plus toute édition. La réserve d'identités exige toutefois une **autorité
d'unicité complète pour sa portée**, y compris si les archives sont hors RAM.

Cette proposition révise les moyens techniques B2 R1.3, `withVersions` et la
certification systématique du candidat. Elle préserve les règles métier des
[décisions R1.2](./rewrite_decisions.md), les primitives et la filiation du
[canon R1.1](./rewrite_r11_canon.md), la structure du
[canon R1.2](./rewrite_r12_canon.md) et les commandes/obligations du
[canon R1.3](./rewrite_r13_canon.md). Les textes historiques restent des preuves
de ce qui fut décidé et livré à leur date. Après audit et GO, un addendum
normatif daté devra désigner précisément les clauses techniques remplacées et
les clauses métier conservées ; il ne réécrira aucune clôture DONE.

## 2. Architecture actuelle et problèmes démontrés

Chemins ci-dessous vérifiés dans le dépôt ; `loadPortfolioGraph.ts` est le
chemin de lecture R1.2, distinct de l'admission R1.3.

| Composant | Aujourd'hui | Cible : contrôles conservés, déplacés ou retirés ; modification et risque |
| --- | --- | --- |
| `src-v2/domain/versioning/versionEnvelope.ts` | Factories de ref/owner/payload immuables ; contexte fini : collisions, owner constant, cycles, prédécesseurs absents signalés | Conserver validation locale et liens exacts ; exposer un contrôle d'append contre index certifié. Ne pas parcourir tout H à chaque append. Risque : accepter owner divergent ou cycle via branche chargée partiellement ; contrôler lien nouveau et témoins pertinents. |
| `src-v2/domain/versioning/versionRegistry.ts` | `createVersionRegistry` recopie et valide H ; `withVersions` rappelle la factory sur H+B ; lookups par liste/table temporaire | Registre persistant/index exact et append B avec contrôle de collisions, identité/owner/couple et filiation pertinents. Import externe reste validé ; append ne recopie ni ne revalide H. Risque : index périmé, référence ambiguë, ordre de diagnostic différent. |
| `src-v2/domain/portfolio/graphResolver.ts` | Manifeste fermé, registry construit depuis les versions fournies, résolution exacte, inventaires dérivés | Garder voie `unknown` complète pour load/snapshot ; fournir lecture exacte depuis état courant certifié pour transition, sans `createVersionRegistry(S)` redondant. Risque : réponse extra/missing ou fallback latest si voies confondues. |
| `src-v2/domain/portfolio/graphValidation.ts` | Validation complète des endpoints, AP/partition, grille TA, PTEC, capacité, catalogues et ordre | Garder oracle intégral et chargement. Extraire prédicats purs réutilisables par validateur de delta fermé, avec mêmes règles et diagnostics ; aucune copie de règles en Application. Risque : un prédicat global oublié dans la fermeture. |
| `src-v2/domain/portfolio/validatedPortfolioGraph.ts` | Unique factory `unknown` vers marque TS opaque après validation complète | Garder certification de toute entrée inconnue et Snapshot. Ajouter une voie interne de succession, uniquement appelée sur un état fiable + preuve de fermeture/contrôles réussis ; la marque TS seule n'autorise jamais cette voie. Risque : raccourci public ou certificat réutilisé après remplacement externe. |
| `src-v2/domain/portfolio/transitions/transition.ts` | Analyse pure, balayages de S/H, propositions et obligations ; restauration cherche bases dans H | Conserver commandes, préconditions et réponses. Retourner delta, lectures exactes requises, empreinte des dépendances et raisons de fermeture ; résoudre bases historiques explicitement par port avant ou pendant l'analyse sans charger tout H. Risque : divergence de comportement, obligations omises, balayages S persistants. |
| `src-v2/application/portfolio/transitions/session.ts` | Admission B2 de H/inventaire/ledger, préparation ; exécution `withVersions(H+B)`, extraction, certification S complète, `store.publish` | Orchestrer lecture fiable, delta, fermeture, obligations, append B, vue candidate et commit atomique. Déplacer unicité historique vers autorité de réservation ; retirer admission exhaustive H comme condition générale. Risque : admission trop faible, réentrance et publication partielle. |
| `src-v2/application/ports/` | Lecteurs exacts async ; RAM `read/exclusive/publish` ; allocateur sync ; assembly injectable | Conserver interfaces hexagonales. Séparer résolution historique exacte, autorité de réservation et cellule publication avec compare-revision/commit unique ; assembly n'a aucune autorité. Contrats d'absence d'effets réentrants ou garde par façade. Risque : faux port dit fiable. |
| `src-v2/adapters/memory/` | Lecteur copie l'entrée ; current RAM a `entered` autour du callback et `publish` autorisé dans l'exclusive ; allocateur compteurs ; source native copie H entier | Adapter RAM propriétaire exclusif du tuple courant+archives+index+révision ; préflight complet à import, append structurel, réservation monotone, commit par un swap interne. Risque : consommateurs gardant anciennes capacités ou mutation via alias. |

Le [rapport PERF-EDIT R1.3](./proofs/r13/perf/report.md) mesure, sur Medium
dense H ajouté 0, environ 3,50 s en E5 et 3,69 s en E6 pour EDIT-local ; il
attribue E5 à la reconstruction/assemblage et E6 à la certification complète.
Small H 0→1000 ajoute environ 125 ms à EDIT-local. Ces mesures sont propres aux
fixtures et à l'environnement documentés, sans SLA extrapolé. Le code confirme
`withVersions([...H,...B])`, `lookupExactBatch(registry, refs)` puis
`certifyPortfolioGraph(candidate)` ; `analyseTransition` reçoit H entier et
balaye souvent S. Dans `prepare`, `active` ne couvre pas l'appel à l'allocateur ;
une réservation réentrante peut intervenir avant l'inscription d'une nouvelle
identité. Dans `execute`, un port `publish` injecté est appelé dans une
`exclusive` dont le contrat ne rend pas irréversible l'assignation du courant :
une implémentation défectueuse ou réentrante peut modifier la cellule avant de
lever une erreur. Ces deux fenêtres demandent des contrats exécutables.

## 3. Architecture cible : chargement et transitions

### 3.1 Acquisition d'un courant fiable

`CurrentSelectionReader` livre une révision et un manifeste inconnus ;
`ExactVersionsReader` résout **chaque ref sélectionnée exacte**, refuse manque,
substitution et version supplémentaire. Domain valide types/enveloppes/payloads,
owners, unicités du contexte sélectionné, puis **tous** les invariants R1.2 par
`certifyPortfolioGraph` : fermeture endpoints, lifecycle, catalogues/couleurs/noms,
Capacity, AP et partitions, grille TA, PTEC, ordre et frontières. Les liens
historique fournis contradictoires sont refusés ; les prédécesseurs/provenances
non chargés restent `not-established`, comme B1 R1.2. Snapshot conserve son
propre chargement exact et sa borne knowledgeDate.

L'Application associe le graphe certifié à la révision et à la **génération
privée** de la cellule propriétaire. La capacité n'est ni sérialisable ni
constructible par un appelant. Toute installation/import, remplacement externe,
réhydratation ou nouveau propriétaire incrémente la génération et invalide les
capacités, index et préparations antérieurs ; réacquisition complète obligatoire.
Le contrôle au commit compare génération **et** révision (et non un texte de
révision pouvant revenir à une ancienne valeur). Les archives hors sélection
restent immuables, conservées et adressables ; elles ne deviennent pas pour cela
un courant certifié. Un objet de registre partiel ne prouve jamais que le passé
manquant n'existe pas.

### 3.2 Pipeline d'une édition

1. Lire, sous autorité de session, le tuple courant fiable, génération, révision,
   index de dépendances et index d'identité cohérents avec cette génération.
2. Domain acquiert/valide la commande et analyse le delta : nouvelles versions,
   sélections ajoutées/remplacées/retirées, bases historiques exactes, obligations.
3. Calculer la fermeture des dépendances à partir des liens directs **et
   inverses** ; fournir au validateur la liste des ensembles complets et la preuve
   de leur exhaustivité. Index absent, périmé ou non prouvable : refus ou appel
   explicitement nommé à l'oracle complet.
4. Lier confirmations et revues au dossier opaque, à sa révision et au delta
   immuable ; valider les réponses avant allocation des VersionId. Les décisions
   ETC modifiant le delta relancent le calcul de fermeture concerné.
5. Domain valide les enveloppes/payloads nouveaux, owner/prédécesseur/base,
   unicités et chaque prédicat R1.2 dont un opérande ou l'ensemble concerné change.
   Une dépendance retirée est aussi vérifiée (absence d'orphelins, couverture).
6. Construire manifeste, sélection, index et registre candidats par partage des
   objets déjà immuables et append B ; ne copier profondément que l'entrée
   inconnue, les payloads nouveaux et les nouvelles structures de chemin.
7. Recontrôler génération/révision, puis publier atomiquement le tuple entier.
   Échec à tout stade antérieur : courant publié identique.

Le Domain possède un **catalogue unique de prédicats** utilisé par validation
complète et ciblée. Une table déclarative `kind/champ → prédicats/relations
inverses` accompagne chaque commande ; elle est exhaustive sur les champs des
14 kinds et les sélections du manifeste. Les index sont dérivés d'un courant
certifié, mis à jour par le même delta, jamais pris pour une preuve métier. Chaque
prédicat global (par exemple unicité des noms de catalogue, cardinalité des
Settings par owner, ordre total) reçoit l'ensemble complet de sa classe via
index. La validation ciblée refuse si ce caractère complet est incertain.

**Preuve par récurrence.** Base : l'acquisition valide intégralement C0. Pas :
pour tout prédicat P du catalogue, le delta fournit soit (a) la preuve que ses
opérandes et l'ensemble quantifié sont inchangés, soit (b) sa fermeture complète
et l'évaluation de P sur le candidat. Les éléments supprimés participent au
calcul avant/après ; les index candidats sont comparés au manifeste candidat.
Les commandes, obligations, collisions et bases sont contrôlées avant commit.
Le commit ne change qu'une cellule cohérente Cn→Cn+1. Un remplacement hors
transition rompt l'hypothèse et impose une nouvelle base certifiée. Le partage
structurel est sûr uniquement pour objets déjà gelés et sans alias mutables.
Cette preuve exige couverture de la table, tests différentiels et audits des
nouveaux champs/relations ; TypeScript ou un nom `Validated` seuls ne suffisent
pas.

## 4. Matrice des invariants et transitions R1.3

Abréviations : S = versions sélectionnées ; H = archives ; B = nouvelles
versions ; AP = ActualPeriod ; SP = ActualSubPeriod ; TA = TeamActual ; PTEC =
PT ETC. `fermeture` signifie ensemble exact complet, y compris côtés supprimés.

| Commande | Éléments modifiés | Dépendances affectées | Invariants à préserver | Validation cible | Repli éventuel |
| --- | --- | --- | --- | --- | --- |
| RenameProject | ProjectSettings, une ref du manifeste | Owner/identité Project, payload name ; AP/PT/catalogue inchangés par preuve de champs | Schéma nom, owner stable, prédécesseur/ref et unicité Settings | Nouvelle version + équivalence de tous champs hors name, ref unique ; pas de grille TA | Complète si projection de champs ou index invalide |
| ReorderProjects | PortfolioOrder | Inventaire **total** ProjectSettings, deleted compris | Permutation exacte sans oubli/doublon, unique Order | Comparer ordre à l'ensemble ProjectId certifié | Complète si inventaire indisponible |
| DeleteLifecycle | Settings Project/Reservation/Team ou PT/RT ; tombstones PT/RT en cascade ; désélection TA/PTEC | Toutes associations inverses de root/Team, cellules TA de chaque association, PTEC des PT ; AP/SP/Capacity/Order conservés | Endpoints, tombstones, zéro TA/PTEC selected sous association deleted, unicité/couverture restante, confirmation globale zéros inclus/Team toujours | Fermeture transitive endpoint→associations→TA/PTEC, comparer cardinalités avant/après et absence d'orphelins ; prédicats lifecycle concernés | Complète ou refus si index inverse incomplet |
| RestoreRoot | Settings deleted→existing | AP du root, Program/Pas choisis, Order ; associations restent deleted | Payload explicite, catalogues existing, earliest≤AP.from, owner et rang stables, ConfirmRestoreGrid | Vérifier root/AP/catalogues et absence de réactivation implicite | Complète si liens catalogue/AP manquants |
| RestoreAssociation | PT/RT deleted→existing ; grille TA neuve, PTEC PT | Deux endpoints, AP courant, **toutes** SP de sa partition, couple association×SP, bases historiques TA/PTEC explicites | Une TA par cellule, owners/bases exacts, PTEC PT aligné AP.through, valeurs zéro par défaut, non-zéro explicite, confirmation grille entière | Générer et comparer produit cartésien association restaurée×SP ; vérifier absence de cellule selected préexistante et références historiques ; revue/confirmation | Complète ou refus si partition/archives exigées indisponibles |
| CorrectActuals | TA des cellules listées ; PTEC si revue ETC modifie valeur | Association/AP/SP de chaque cellule, PTEC du PT concerné | Quantité Consumption, cellule unique, confirmation par cellule, revue ETC positif | Contrôler chaque cellule et PTEC touché ; couverture identique car clés TA inchangées | Complète si association/AP indéterminée |
| EditActualPartition | AP, SP ajustées ou nouvelles, TA nouvelles/remplacées/retirées, PTEC des PT selon through/revue | **Toutes** associations existing du root, ancien et nouveau ensemble SP, produit association×SP, AP↔root, chaque PTEC PT ; provenance split/merge | Partition contiguë/bornes/earliest, identité conservée sur ajustement, neuves split/merge, grille complète, pas de redistribution, confirmations de bornes/retraits et revues ETC | Construire ancien/nouveau produit complet ; comparer clés et quantités de toutes TA ; contrôler retrait, owner, PTEC et provenance exacte | Complète ou refus si fermeture du produit incertaine |
| CoverActualPeriod | AP empty→covered, SP nouvelles, TA de toutes associations, PTEC si frontière change | Même fermeture AP/associations/SP/TA/PTEC que partition | Couverture complète, earliest, grille sans cellules implicites omises, confirmations/revues | Produit complet pour nouvelle partition, frontières et PTEC | Complète ou refus si association manque |
| EmptyActualPeriod | AP covered→empty, retrait selected SP/TA, PTEC si frontière change | Ancienne partition, toutes associations et cellules, PT/PTEC | Aucune borne/SP/TA selected, confirmation de retrait même zéro, PTEC.lastActualsDate=null, revue positive | Comparer ancienne grille complète et après vide ; archives conservées | Complète ou refus si ancien produit incomplet |
| SetPTETC | PTEC du PT, ou NoOp | PT, AP frontière du root, PTEC unique | ETC exact ≥0, owner PT, AP.through aligné, zéro→positif confirmé, positif revu | PTEC/association/AP ciblés, réponse liée au dossier ; keep peut NoOp | Complète si résolution PT/AP/PTEC incertaine |
| DeleteUsedCatalog | Program/Pas tombstone ; Settings des owners existants utilisateurs | **Tous** Project/Reservation existing référant le catalogue, remplacements, noms existing du kind, ownColor Program | Assignments exhaustifs et uniques, remplacement existing ou null conforme, aucune référence existing vers deleted, nom catalogue unique, Settings deleted inchangées | Comparer ensemble inverse d'usages à assignments ; vérifier chaque remplacement et ensemble complet des noms | Complète ou refus si usages inverses/noms incomplets |

La fermeture est vérifiable, pas présumée : les relations inverses indexées
incluent root→AP, root/Team→PT/RT, PT/RT→TA, PT→PTEC,
AP→SP, SP→TA, catalogue→Settings, owner→identités et
couple (association,SP)→TA. Pour une cascade, parcourir jusqu'au point fixe
avant de calculer les suppressions ; vérifier que chaque entrée de l'ensemble
avant figure exactement une fois dans le delta ou reste valide. Pour les
partitions, le produit cartésien de **toutes** associations existing et de
**toutes** SP après opération est la référence de couverture ; une recherche de
cellules fournies par la commande seule ne prouve rien. Les liens indirects
de PTEC vers AP passent par PT→root→AP, y compris si seul `through` change.
Une nouvelle sorte de référence doit enrichir la table de fermeture et ses
tests avant d'être admise dans une transition ciblée.

## 5. Versionnement, historique et unicité

La clé exacte `(kind, EntityId, VersionId)` identifie une enveloppe immuable ;
un même `VersionId` alloué ne peut jamais désigner une autre enveloppe, même
autre kind/EntityId. Une identité `(kind, EntityId)` conserve son owner ; les
contraintes de couples et mappings R1.2 s'appliquent sur l'autorité pertinente,
notamment Settings par owner, Capacity par Team, AP par root, PT/RT par couple,
PTEC par PT et TA par `(association,SP)` ; plusieurs SP d'un AP sont légitimes.
L'append vérifie B en interne et contre index exact, index d'identités, owners,
couples et IDs déjà émis/brûlés. Répétition exacte éventuellement admise à
l'import suivant R1.1 ; une commande d'édition doit recevoir des IDs neufs,
jamais une répétition. Prédécesseur choisi explicitement : ref sélectionnée
exacte pour édition du courant, base historique explicite pour restauration,
absence seulement pour identité neuve. Branche historique permise ; aucun
`latest`, horodatage ou ordre d'archive ne choisit une base. Provenance garde
sa sémantique distincte et ses contrôles R1.1.

Le répertoire des archives résout par ref exacte, y compris versions orphelines
de Snapshot. Un index persistant ou une suite de segments immuables permet
append B et partage de H ; il ne doit pas exiger `createVersionRegistry(H+B)`.
Une source peut charger la seule version historique demandée et les témoins de
son owner/base, avec validation de son enveloppe et de sa compatibilité avec le
courant ; elle n'a pas à valider le reste de H. Les identités/couples déjà
utilisés sont consultés auprès d'une **autorité exhaustive de réservation**
pour la portée déclarée. Un cache RAM de H partiel n'est jamais cette autorité.
En R1.3 RAM, la composition native peut maintenir un ledger/index complet des
IDs et couples émis depuis la création de la cellule, importé de manière
attestée à l'ouverture ; si elle ne peut attester cette portée, les commandes
nécessitant une nouvelle identité sont refusées. Une restauration exige de
résoudre sa base explicite ; un ID inconnu du cache est demandé au répertoire,
jamais interprété comme libre. Réservations pending/burned demeurent indisponibles
après échec et abandon. R2 devra donner une autorité durable inter-session,
append/import/recovery et concurrence multi-onglets ; aucune garantie durable
nouvelle n'est attribuée à ce plan R1.3.

**Révision de B2 R1.3 :** l'inventaire exhaustif des enveloppes de H et leur
validation ne sont plus une condition générale de `prepare`/`execute`.
L'inventaire exhaustif **des identités émises et couples réservés pour la portée
RAM** reste une précondition des nouvelles identités, ou est délégué à une
autorité de réservation qui répond de façon exhaustive. La validation locale
d'un append ne peut pas déduire l'absence historique d'une archive non chargée.

## 6. Atomicité, réentrance et contrats des ports

La cellule RAM est l'unique autorité de publication du tuple
`{selection, graph fiable, archive/index, revision, generation}`. Elle expose
lecture immutable et une opération `commit(expectedGeneration, expectedRevision,
candidate)` à résultat explicite. Le **point irréversible** est une unique
assignation interne de référence à ce tuple après tous contrôles, allocations,
copies, callbacks de composition et vérifications de stale. Il n'y a aucun
callback externe entre dernière vérification et assignation ; aucun callback
après assignation dont l'erreur pourrait être présentée comme échec de commit.
Notifications éventuelles se font séparément, après retour Applied, sans
autorité sur le résultat. Une exception avant assignation rend l'ancien tuple
observable intact ; après assignation, le résultat est Applied selon le contrat,
jamais un faux `InternalTransitionFailure` avec nouveau courant publié.

**A — réservation réentrante.** Un garde de session unique entoure l'intégralité
de `prepare`, dès avant le premier appel au port d'allocation, ainsi que
`execute`, `abandon` et remplacement du courant. Toute entrée réentrante est
refusée avant lecture/planification. L'allocateur doit réserver de façon
monotone avant de retourner ; la session vérifie la sortie contre ses sets
d'IDs/couples et l'enregistre avant tout autre appel externe. Une allocation
qui lève ou retourne une collision est refusée et les sorties déjà acquises
restent brûlées. Plusieurs préparations séquentielles restent permises ; le
garde ne verrouille pas l'attente humaine entre prepare et execute.

**B — publication réentrante.** Un port arbitraire doté de `publish` peut
violer l'atomicité malgré un `exclusive` externe. Le port injectable est donc
réduit à un contrat de cellule propriétaire : un seul écrivain, `commit`
synchrone non réentrant, vérification génération/révision, aucun callback dans
sa section critique, candidat immutable et absence d'alias mutable. La
composition n'accepte pas une implémentation `CurrentRamPort` non qualifiée
comme capacité de publication fiable. Si un port injecté tente d'appeler une
seconde transition ou de remplacer le courant pendant préparation, le garde
refuse ; s'il tente de le faire pendant commit, la cellule refuse avant tout
swap. Une publication concurrente/stale rend un résultat Stale sans modifier
la vue. Le code d'orchestration ne tient jamais l'exclusivité en exécutant un
callback externe de publication. Les garanties RAM valent dans une session et
un propriétaire ; transactions durables, multi-onglets et recovery restent R2.

## 7. Stratégie de preuve et de tests

Conserver toutes les suites métier R1.1/R1.2/R1.3. Construire pour chaque
famille de commande des cas valides/invalides, dépendances indirectes,
cascades, historiques ramifiés, collisions EntityId/couple/VersionId, échecs
avant commit, réentrance, courant initial altéré et restaurations incompatibles.
Pour chaque transition acceptée, appliquer le delta dans un laboratoire isolé
et faire passer le **candidat entier** dans `certifyPortfolioGraph` R1.2 ; comparer
acceptation, manifeste/refs, owners, payloads, archives ajoutées, obligations
et diagnostics utiles. Injecter une faute sur un élément hors fermeture annoncée
pour vérifier que la preuve de fermeture échoue ou que l'état initial est refusé.
Cas dédiés : catalogue à usage indirect, Team supprimée avec PT+RT et cellules
zéro/positives, AP split/merge avec grilles denses/sparse, PTEC quand through
change ou reste égal, deux préparations sur même couple, allocateur réentrant
avant sa réponse, port de commit réentrant/qui lève, remplacement externe entre
prepare/execute, collisions avec archive absente de RAM mais connue du ledger.
Un test de propriété parcourt des séquences de transitions : certification
complète de C0 puis de chaque Cn accepté, vues identiques après chaque refus.
La table des prédicats/champs doit avoir un test de couverture statique et des
mutations ciblées de chaque relation inverse.

L'oracle complet R1.2 est indépendant du **chemin ciblé**, mais peut partager
factories/prédicats et contenir le même défaut métier. Compléter par fixtures
contradictoires écrites à la main, contre-exemples G12/G13, revues de la table
des dépendances, tests d'absence/collision contre l'autorité d'identités et
tests de linéarisation du commit. Ne pas exécuter l'oracle complet en production
à chaque édition ; il demeure obligatoire sur entrée inconnue et en repli
explicite. Aucun test existant ne doit être supprimé ou affaibli.

## 8. Performance

Reprendre exactement les profils et scénarios
[PERF-EDIT](./proofs/r13/perf/report.md) : EDIT-local, EDIT-actuals et frontière,
Small/Medium dense/sparse, S fixe avec H variable et B documenté. Mesurer
séparément acquisition initiale, analyse/fermeture, validation ciblée, append,
construction candidat et commit, avec processus isolés, essais et dispersion.
Conserver la baseline avant refonte et l'environnement/fixtures publiés ; toute
nouvelle mesure sera explicitement comparée, sans gain annoncé ici.

Coût actuel : admission initiale dépend de H ; `withVersions` et copies dépendent
de H+B à chaque exécution ; extraction/certification dépendent de S, y compris
Actuals non concernés ; l'analyse peut balayer S/H selon la commande. Coût cible
après acquisition : append/index dépend de B et des collisions recherchées,
validation du nombre D de dépendances **réellement affectées**, plus coût de
mise à jour structurelle du manifeste/index ; une commande globale comme
ReorderProjects dépend nécessairement du nombre de Projects, une partition du
produit associations×SP. Les segments persistants et index doivent rendre
indépendant de H le cas EDIT-local, hors accès explicite à une base historique.
Vérifier empiriquement les pentes H à S constant et S à H constant, B constant
ou variable, allocations mémoire et latence, ainsi que l'absence de parcours
Actuals pour RenameProject. Si cette indépendance ou la preuve de sûreté échoue,
garder le chemin complet et qualifier la limite mesurée, sans inventer de seuil.

## 9. Sous-lots minimaux, gates et retour arrière

Chaque lot requiert audit et GO de l'ensemble du présent plan avant première
implémentation. Les retours arrière sont limités au code du lot, sans réécriture
des clôtures historiques ni suppression d'archives.

| Lot | Objectif / périmètre / prérequis | Invariants, fichiers pressentis, tests et acceptation | Risque / retour arrière |
| --- | --- | --- | --- |
| P0 | Addendum normatif daté et inventaire des prédicats/relations, après audit/GO | `rewrite_decisions.md` + nouvel addendum, table R1.2/R1.3 complète et clauses techniques remplacées explicitement ; revue sans modifier canon clos | Omission normative ; retirer addendum proposé avant tout code |
| P1 | Admission Current fiable et génération, sans transition ciblée ; P0 | `loadPortfolioGraph.ts`, `validatedPortfolioGraph.ts`, ports/read adapters ; unknown valide/invalide, Snapshot, remplacement externe ; aucune entrée non fiable n'atteint session | Faux certificat ; revenir à admission complète R1.3 et chargement R1.2 |
| P2 | Autorité RAM d'identités et append versionné local ; P1 | `versionRegistry.ts`, `versionEnvelope.ts`, nouveaux index/ports/adapters ; collisions archive absente RAM, owners, branches, burned, lookup exact ; H immutable et append B sans H+B, incapacité de prouver unicité ⇒ refus | Ledger incomplet ; garder B2 exhaustif R1.3 tant que non prouvé |
| P3 | Publication unique, garde réentrance prepare/execute ; P1–P2 | `session.ts`, `currentRamPort.ts`, `currentRamAdapter.ts`, allocateur ; tests A/B, exception avant/après point de swap, stale/ABA, un seul writer ; jamais résultat d'échec avec courant changé | Port faux ou double writer ; garder ancien port seulement dans branche non publiée et revenir à ancienne exécution |
| P4 | Catalogue pur de prédicats et fermeture de delta pour Rename/Reorder/SetPTETC ; P1–P3 | `graphValidation.ts`, `transition.ts`, validateur ciblé Domain ; différentiel complet, absence de scans H/Actuals pour Rename, obligations ETC ; candidat toujours certifié via repli si fermeture non établie | Règle dupliquée/oubliée ; commuter ces commandes vers oracle complet |
| P5 | Fermeture cascades/restore/catalogue ; P4 | `transition.ts`, `session.ts`, index inverses ; grilles restore, archive ramifiée, suppressions et assignments complets ; différentiel et refus inconnu | Dépendance inverse omise ; repli complet pour commandes du lot |
| P6 | Fermeture AP/SP/TA, Cover/Empty/Correct ; P5 | Mêmes modules ; produit cartésien, split/merge, zero/positive, through/PTEC, fixtures denses/sparse ; oracle identique sur séquences | Coût/erreur de grille ; repli complet pour commandes du lot |
| P7 | Qualification globale et PERF-EDIT, après P1–P6 | Suites existantes et différentielles, frontières hexagonales, typecheck/build, mesures S/H/B/D, audit indépendant ; R1.3 reste IN REVIEW jusqu'à validation de l'ensemble | Régression ou performance non qualifiée ; rollback ciblé du lot fautif, statut inchangé |

Chaque lot livre ses propres preuves et un mécanisme de repli activable avant
de retirer l'ancien chemin. Les canons R1.1/R1.2 conservent leurs dates,
résultats et DONE ; l'addendum P0 cite les décisions qu'il amende sans faire
passer ce plan pour une implémentation. Le canon R1.3 continue de décrire
l'implémentation en revue jusqu'à un audit final distinct.

## 10. Décisions ouvertes pour arbitrage utilisateur après audit

1. **Autorité RAM d'identités à l'ouverture :** ledger exhaustif attesté par
   source native, ou service de réservation exhaustif pour la portée RAM. Les
   deux doivent refuser une source incapable de prouver les IDs/couples anciens.
2. **Repli de fermeture indéterminée :** refus par défaut ou validation complète
   explicite pour les commandes où toutes les versions sélectionnées sont
   disponibles. Aucun repli ne prétend vérifier l'unicité d'un passé absent.
3. **Forme d'index/registre persistant :** copie sur chemin ou segments immuables ;
   choisir après prototype mesuré, sous mêmes contrats exacts/immuables.
4. **Compatibilité des API R1.3 expérimentales :** adapter temporaire ou
   remplacement direct des ports, à décider après inventaire des seuls appelants
   V2 et des tests. Aucun impact UI/legacy n'est autorisé par ce plan.

**Arrêt :** document soumis à audit indépendant ChatGPT puis GO explicite.
Aucun développement R1.1–R1.3, R1.4 ou R2 n'est autorisé par sa livraison.
