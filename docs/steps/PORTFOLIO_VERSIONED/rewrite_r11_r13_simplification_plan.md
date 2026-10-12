# FlowPlan2 V2 — PLAN de simplification architecturale R1.1–R1.3

**Statut : PLAN ONLY, favorable sous corrections C1–C3, à soumettre à un nouvel audit indépendant.** Base de la présente correction :
`d376858b2686cdeb4356c9ad3224a0efa2f0a388`, branche
`rewrite/portfolio-versioned`. Préflight : HEAD = origin, divergence 0/0,
arbre propre. R0/R0.1/R1.1/R1.2 restent DONE ; R1.3 reste IN REVIEW ;
R1.4/R2 ne commencent pas. Aucun contrat ci-dessous n'est déclaré livré.

## 1. Synthèse exécutive et portée normative

Conserver la validation complète **du courant sélectionné** à toute acquisition
externe/non certifiée. Ensuite, représenter le courant, ses index de dépendances
et sa révision par une seule capacité de session non forgeable. Une transition
pure calcule son delta et une fermeture des dépendances ; le Domain contrôle les
invariants de cette fermeture, l'Application orchestre obligations, allocations
et publication unique. Si la fermeture ne peut être prouvée, refus par défaut ;
un cas de validation complète doit être explicitement qualifié selon §9. Les
versions archivées, sélectionnées ou non, restent
immuables et résolubles exactement ; leur validation exhaustive ne conditionne
plus toute édition. La réserve d'identités exige toutefois une **autorité
d'unicité complète pour l'opération qui la requiert et pour sa portée déclarée**,
y compris si les archives sont hors RAM. Cette autorité est distincte du
répertoire des enveloppes historiques.

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
   inverses** ; fournir au validateur les ensembles avant/après complets et leur
   preuve d'exhaustivité. Index absent, périmé ou non prouvable : refus par
   défaut ; seul un cas de repli qualifié selon §9 peut appeler l'oracle complet.
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

Le delta décrit séparément **valeurs** (champs changés, sans relation modifiée),
**références** (ref remplacée ou nouvelle version sélectionnée), **composition**
(membres ajoutés ou retirés d'un ensemble métier) et **suppressions/cascades**
(éléments désélectionnés et conséquences transitives). Pour chaque entrée,
il conserve les refs, relations et membres **avant et après**, même si une
enveloppe supprimée reste archivée. Un changement de ref ne signifie pas à lui
seul un changement de relation ; la comparaison porte sur les payloads et les
clés métier résolues.

La fermeture part des champs et relations réellement changés, puis applique
la table des prédicats et les relations directes/inverses jusqu'au point fixe.
Pour chaque invariant R1.2, elle fournit soit un témoin d'égalité de tous ses
opérandes **et de son ensemble de référence** avant/après, soit l'inventaire
complet de cet ensemble et ses opérandes candidats vérifiés. L'exhaustivité
provient de la construction des index à partir des refs sélectionnées du courant
certifié, de la confrontation de leurs membres/cardinalités avec ce manifeste,
de leur mise à jour contrôlée par le delta et des comparaisons avant/après sur
la classe affectée ; la seule présence d'une entrée d'index ne suffit pas.
Les éléments retirés sont représentés par leur ancienne
ref et leur ancienne clé métier, puis par leur absence sélectionnée après.
Chaque nouveau champ, kind, relation ou invariant doit être classé dans cette
table et dans les deux chemins de validation avant qu'une transition ciblée
l'utilise ; champ non classé, témoin manquant ou inventaire incomplet ⇒ refus.

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
| RenameProject | ProjectSettings, une ref du manifeste | Owner/identité Project, payload name ; AP/PT/catalogue inchangés par preuve de champs | Schéma nom, owner stable, prédécesseur/ref et unicité Settings | Nouvelle version + équivalence de tous champs hors name, ref unique ; pas de grille TA | Refus si preuve incomplète ; repli explicite seulement selon §9 |
| ReorderProjects | PortfolioOrder | Inventaire **total** ProjectSettings, deleted compris | Permutation exacte sans oubli/doublon, unique Order | Comparer ordre à l'ensemble ProjectId certifié | Refus si inventaire indisponible ; exception §9 |
| DeleteLifecycle | Settings Project/Reservation/Team ou PT/RT ; tombstones PT/RT en cascade ; désélection TA/PTEC | Toutes associations inverses de root/Team, cellules TA de chaque association, PTEC des PT ; AP/SP/Capacity/Order conservés | Endpoints, tombstones, zéro TA/PTEC selected sous association deleted, unicité/couverture restante, confirmation globale zéros inclus/Team toujours | Fermeture transitive endpoint→associations→TA/PTEC, comparer cardinalités avant/après et absence d'orphelins ; prédicats lifecycle concernés | Refus si index inverse incomplet ; exception §9 |
| RestoreRoot | Settings deleted→existing | AP du root, Program/Pas choisis, Order ; associations restent deleted | Payload explicite, catalogues existing, earliest≤AP.from, owner et rang stables, ConfirmRestoreGrid | Vérifier root/AP/catalogues et absence de réactivation implicite | Refus si liens catalogue/AP manquants ; exception §9 |
| RestoreAssociation | PT/RT deleted→existing ; grille TA neuve, PTEC PT | Deux endpoints, AP courant, **toutes** SP de sa partition, couple association×SP, bases historiques TA/PTEC explicites | Une TA par cellule, owners/bases exacts, PTEC PT aligné AP.through, valeurs zéro par défaut, non-zéro explicite, confirmation grille entière | Générer et comparer produit cartésien association restaurée×SP ; vérifier absence de cellule selected préexistante et références historiques ; revue/confirmation | Refus si partition/archives exigées indisponibles ; exception §9 |
| CorrectActuals | TA des cellules listées ; PTEC si revue ETC modifie valeur | Association/AP/SP de chaque cellule, PTEC du PT concerné | Quantité Consumption, cellule unique, confirmation par cellule, revue ETC positif | Contrôler chaque cellule et PTEC touché ; couverture identique car clés TA inchangées | Refus si association/AP indéterminée ; exception §9 |
| EditActualPartition | AP, SP ajustées ou nouvelles, TA nouvelles/remplacées/retirées, PTEC des PT selon through/revue | **Toutes** associations existing du root, ancien et nouveau ensemble SP, produit association×SP, AP↔root, chaque PTEC PT ; provenance split/merge | Partition contiguë/bornes/earliest, identité conservée sur ajustement, neuves split/merge, grille complète, pas de redistribution, confirmations de bornes/retraits et revues ETC | Construire ancien/nouveau produit complet ; comparer clés et quantités de toutes TA ; contrôler retrait, owner, PTEC et provenance exacte | Refus si fermeture du produit incertaine ; repli explicite seulement selon §9 |
| CoverActualPeriod | AP empty→covered, SP nouvelles, TA de toutes associations, PTEC si frontière change | Même fermeture AP/associations/SP/TA/PTEC que partition | Couverture complète, earliest, grille sans cellules implicites omises, confirmations/revues | Produit complet pour nouvelle partition, frontières et PTEC | Refus si association manque ; exception §9 |
| EmptyActualPeriod | AP covered→empty, retrait selected SP/TA, PTEC si frontière change | Ancienne partition, toutes associations et cellules, PT/PTEC | Aucune borne/SP/TA selected, confirmation de retrait même zéro, PTEC.lastActualsDate=null, revue positive | Comparer ancienne grille complète et après vide ; archives conservées | Refus si ancien produit incomplet ; exception §9 |
| SetPTETC | PTEC du PT, ou NoOp | PT, AP frontière du root, PTEC unique | ETC exact ≥0, owner PT, AP.through aligné, zéro→positif confirmé, positif revu | PTEC/association/AP ciblés, réponse liée au dossier ; keep peut NoOp | Refus si résolution PT/AP/PTEC incertaine ; exception §9 |
| DeleteUsedCatalog | Program/Pas tombstone ; Settings des owners existants utilisateurs | **Tous** Project/Reservation existing référant le catalogue, remplacements, noms existing du kind, ownColor Program | Assignments exhaustifs et uniques, remplacement existing ou null conforme, aucune référence existing vers deleted, nom catalogue unique, Settings deleted inchangées | Comparer ensemble inverse d'usages à assignments ; vérifier chaque remplacement et ensemble complet des noms | Refus si usages inverses/noms incomplets ; exception §9 |

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

**Témoin RenameProject.** Sur un courant certifié, la commande conserve
l'identité/owner du Project et de ses Settings. La
nouvelle enveloppe Settings porte cette même identité et cet owner, un
`predecessor` égal à la ref sélectionnée exacte, et une VersionId neuve garantie
par l'autorité d'unicité. Comparer le payload complet ancien/nouveau en excluant
uniquement `name` garantit que chaque autre champ métier et chaque relation
restent identiques ; contrôler le schéma du nouveau nom et remplacer une seule
ref du manifeste. L'ensemble des Settings par owner conserve sa clé et sa
cardinalité, et les autres sélections et ensembles sont égaux avant/après.
Les prédicats AP, associations, Actuals, allocations et catalogues ont donc
leurs opérandes et ensembles de référence inchangés. Ce témoin ne demande ni
parcours des Actuals ni lecture de l'historique ; si l'égalité complète des
champs ou la garantie de VersionId manque, refuser.

**Témoin EditActualPartition.** Partir de l'AP et de **toutes** les SP
sélectionnées de son root avant édition, puis construire la partition candidate
complète selon l'opération discriminée (extend/reduce/adjust/split/merge).
Énumérer depuis le courant certifié toutes les associations existing du root,
PT et RT, y compris celles absentes de la commande. Calculer les deux produits
`associations × SP avant` et `associations × SP après`, résoudre **toutes** les
TA sélectionnées de l'ancien produit et toutes les TA candidates du nouveau,
et comparer clés, quantités, owners et refs, y compris retraits et créations.
Vérifier une cellule par clé candidate, aucune cellule orpheline, la conservation
des quantités prescrite sans redistribution implicite, ainsi que l'identité
conservée pour adjust et les identités neuves/provenances exactes pour
split/merge. Résoudre chaque PTEC des PT du root, comparer la frontière
`through`, la valeur/date et les refs avant/après, puis appliquer les revues
ETC requises. Lier les confirmations aux changements de bornes, aux cellules
retirées même nulles, aux cellules affectées ou nouvelles et à leurs valeurs
selon R1.3 ; les cellules inchangées ne reçoivent aucune obligation inventée. Les refs
historiques réintroduites, si la commande le prévoit, exigent une base exacte
et l'enveloppe correspondante ; aucune archive étrangère au périmètre n'est
chargée. Une association, SP, TA, PTEC, réponse ou base nécessaire manquante
rend la fermeture incomplète et fait refuser la transition.

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

**Autorité d'unicité.** Pour sa portée déclarée, elle garantit l'unicité des
EntityId et VersionId, l'absence de réemploi des identités métier, l'unicité
des couples métier concernés et la conservation des réservations consommées ou
abandonnées (`pending`/`burned`). Elle détecte une collision même avec une
archive non chargée. Elle peut être un répertoire compact d'identités, owners,
couples et réservations, attesté à l'import ; elle n'a pas à charger, reconstruire
ni certifier toutes les enveloppes historiques. Un cache partiel de H ne prouve
jamais l'absence d'une identité ou d'un couple. En R1.3 RAM, sa garantie ne
dépasse pas la portée attestée de la cellule ; R2 devra traiter la durabilité
inter-session, import/recovery et concurrence multi-onglets.

**Répertoire des archives.** Il conserve toutes les versions historiques
immuables, y compris orphelines de Snapshot, et résout une ref exacte pour
consultation, restauration depuis une base explicitement choisie et vérification
de l'enveloppe historique utilisée. Un index persistant ou des segments
immuables permettent append B et partage de H sans `createVersionRegistry(H+B)`.
Une édition ordinaire ne charge pas toutes les archives ; elle charge les seules
enveloppes historiques explicitement requises et vérifie leur ref, identité,
owner, payload et lien pertinent. Le répertoire ne remplace pas l'autorité
d'unicité et une ref absente du cache ne signifie pas une identité libre.

**Disponibilité partielle.** Si l'autorité exhaustive des EntityId ou des
couples n'est pas disponible, une édition sans création d'identité métier ni
de nouveau couple reste permise si le courant est fiable, les dépendances sont
entièrement connues, les nouvelles VersionId sont garanties uniques, les bases
historiques explicitement nécessaires sont résolues et aucune autre règle
métier ne requiert l'autorité absente. Créer une nouvelle version sous une
identité existante ne crée pas une identité métier : contrôler cette identité,
son owner et sa base, puis réserver une VersionId neuve. Toute commande créant
une identité métier ou un couple dont l'absence historique ne peut être
attestée est refusée, même si le candidat sélectionné est valide.

Une restauration de root ou d'association réemploie l'identité historique
sélectionnée et son owner/couple attestés : aucune identité ni couple neuf n'est
alloué pour cette réactivation. Chaque base non sélectionnée utilisée pour TA
ou PTEC est désignée exactement, résolue et vérifiée ; B1 R1.3 impose une
nouvelle VersionId même si son payload est identique, B3 impose cette base
explicite, jamais `latest`. Une cellule de grille sans identité historique
réutilisable exige une identité/couple neuf et donc l'autorité correspondante ;
si elle manque, la restauration est refusée. Une identité historique réemployée
doit être liée à la même identité, au même owner et au même couple, sans
collision avec le courant ; si une autre unicité métier requise reste
indémontrable, refuser la restauration. Réservations pending/burned restent
indisponibles après échec et abandon.

**Révision de B2 R1.3 :** l'inventaire exhaustif des enveloppes de H et leur
validation ne sont plus une condition générale de `prepare`/`execute`.
L'autorité exhaustive **des identités émises et couples réservés pour la portée
RAM concernée** reste une précondition seulement des opérations qui créent ces
identités/couples ; l'unicité de toute nouvelle VersionId reste obligatoire.
La validation locale d'un append ne peut pas déduire l'absence historique
d'une archive non chargée.

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

## 9. Trois objectifs, étapes techniques et politique de repli

Chaque lot requiert audit et GO de l'ensemble du présent plan avant première
implémentation. Les retours arrière sont limités au code du lot, sans réécriture
des clôtures historiques ni suppression d'archives.

| Objectif / étape | Périmètre / prérequis | Critère d'acceptation vérifiable | Risque / retour arrière |
| --- | --- | --- | --- |
| A — Socle fiable / P0 | Addendum daté et inventaire des prédicats/relations, après audit/GO | Table R1.2/R1.3 relue, clauses techniques à amender citées explicitement ; aucun canon clos réécrit | Omission normative ; retirer l'addendum proposé avant tout code |
| A — Socle fiable / P1 | Courant certifié et génération, sans transition ciblée ; P0 | `loadPortfolioGraph.ts`, `validatedPortfolioGraph.ts`, ports/read adapters : inconnus valides/invalides, Snapshot et remplacement externe couverts ; aucune entrée non fiable n'atteint la session | Faux certificat ; conserver l'admission complète |
| A — Socle fiable / P2 | Autorité RAM d'identités distincte des archives, résolution exacte et append ; P1 | `versionRegistry.ts`, `versionEnvelope.ts`, ports/adapters : collisions avec archive non chargée, owners, branches, réservations brûlées, lookup exact et édition sans identité neuve sous autorité partielle vérifiés ; H immuable, append B sans H+B ; absence non prouvée ⇒ refus | Autorité incomplète ; refuser les créations concernées |
| A — Socle fiable / P3 | Publication unique et garde réentrance ; P1–P2 | `session.ts`, `currentRamPort.ts`, `currentRamAdapter.ts`, allocateur : tests A/B, exceptions avant/après swap, stale/ABA, écrivain unique ; jamais échec retourné avec courant changé | Port faux ou double écrivain ; revenir à l'exécution qualifiée avant publication |
| B — Transitions ciblées / P4 | Catalogue unique et fermeture pour Rename/Reorder/SetPTETC ; P1–P3 | `graphValidation.ts`, `transition.ts`, validateur Domain : témoins par invariant, différentiel complet, Rename sans scan H/Actuals, obligations ETC ; fermeture manquante ⇒ refus | Prédicat oublié ; désactiver la transition ciblée concernée |
| B — Transitions ciblées / P5 | Restaurations, cascades et catalogue ; P4 | `transition.ts`, `session.ts`, relations inverses : grilles restore, bases exactes, archives ramifiées, retraits et assignments complets ; différentiel et refus sur fermeture inconnue | Dépendance inverse omise ; désactiver la transition ciblée concernée |
| B — Transitions ciblées / P6 | AP/SP/TA, Cover/Empty/Correct ; P5 | Produit cartésien avant/après, split/merge, zéro/positif, through/PTEC, fixtures denses/sparse ; oracle identique sur séquences, refus si produit incomplet | Grille incomplète ; désactiver la transition ciblée concernée |
| C — Qualification / P7 | Régressions et PERF-EDIT, après P1–P6 | Suites existantes et différentielles, frontières hexagonales, typecheck/build, mesures S/H/B/D et audit indépendant passent ; R1.3 reste IN REVIEW jusqu'à validation de l'ensemble | Régression ou performance non qualifiée ; rollback ciblé du lot fautif, statut inchangé |

Ces étapes réutilisent un seul catalogue de prédicats, une seule capacité de
courant fiable et une seule cellule de publication ; elles n'introduisent ni
ports concurrents ni chemins de certification durables distincts. Les colonnes
« Repli éventuel » de §4 sont soumises à la politique suivante : **fermeture
non démontrable ⇒ refus par défaut**, sans repli automatique silencieux. Une
validation complète explicite n'est admise que pour un cas précisément nommé,
avec toutes les données nécessaires disponibles, une démonstration que l'oracle
complet suffit aux invariants concernés, des tests couvrant ce cas et aucun
contrôle d'unicité historique fondé sur un passé absent. L'oracle R1.2 du
candidat ne remplace jamais l'autorité des identités ni la vérification d'une
base historique exacte. Les étapes ne multiplient pas de mécanismes temporaires
de repli ; un lot non qualifié reste désactivé ou revient au chemin existant
avant publication. Les canons R1.1/R1.2 conservent leurs dates,
résultats et DONE ; l'addendum P0 cite les décisions qu'il amende sans faire
passer ce plan pour une implémentation. Le canon R1.3 continue de décrire
l'implémentation en revue jusqu'à un audit final distinct.

## 10. Décisions de mise en œuvre après audit

1. **Autorité RAM d'identités à l'ouverture :** ledger exhaustif attesté par
   source native, ou service de réservation exhaustif pour la portée RAM. Les
   deux doivent refuser les créations dont ils ne prouvent pas l'absence
   historique ; les éditions admissibles sous disponibilité partielle suivent §5.
2. **Repli de fermeture indéterminée — décidé :** refus par défaut ; seule
   l'exception explicite et qualifiée selon §9 peut utiliser l'oracle complet.
   Aucun repli ne prétend vérifier l'unicité d'un passé absent.
3. **Forme d'index/registre persistant :** copie sur chemin ou segments immuables ;
   choisir après prototype mesuré, sous mêmes contrats exacts/immuables.
4. **Compatibilité des API R1.3 expérimentales :** adapter temporaire ou
   remplacement direct des ports, à décider après inventaire des seuls appelants
   V2 et des tests. Aucun impact UI/legacy n'est autorisé par ce plan.

## 11. Cohérence normative et traçabilité des corrections

Les primitives `EntityId`/`VersionId`, refs exactes, owner stable, filiation et
provenance R1.1 restent la base des nouvelles enveloppes. Les invariants du
courant R1.2 restent tous exigés ; seule leur démonstration sur une succession
fiable devient ciblée. Les commandes, réponses, confirmations et revues R1.3
restent inchangées. B1 R1.3 impose une nouvelle version aux TA/PTEC historiques
réintroduits même à payload égal ; B3 exige une base exacte désignée. Toutes les
versions demeurent immuables. Domain décide des règles et de la preuve,
Application orchestre, les ports hexagonaux portent les capacités et la cellule
RAM publie atomiquement. Aucune règle métier n'est assouplie pour la validation
ciblée et aucun canon R1.1/R1.2 n'est réécrit rétroactivement.

L'addendum P0 devra amender explicitement les **clauses techniques** historiques
suivantes, sans modifier leurs garanties métier : admission B2 R1.3 exigeant
l'inventaire/validation exhaustifs de H pour toute édition ; passage de H entier
à `analyseTransition` ; reconstruction `withVersions(H+B)` ; certification
complète systématique du candidat dans `session.ts` ; interfaces de lecture,
allocation et `publish`/`exclusive` qui ne prouvent pas seules l'absence
historique, la fermeture ou le point unique de commit. L'admission de toute
entrée inconnue et la certification Snapshot R1.2 restent complètes.

| Correction | Section modifiée | Décision intégrée | Critère vérifiable |
| --- | --- | --- | --- |
| C1 | §1, §3.2, §5, §9 | Autorité des identités distincte des archives ; édition sans identité neuve possible sous disponibilité partielle | Collision avec archive non chargée refusée ; Rename avec VersionId unique admis sans inventaire des enveloppes H ; création d'identité/couple sans autorité refusée ; restore B1/B3 résout sa base exacte |
| C2 | §3.2, §4, §7, §9 | Preuve de fermeture explicite par delta typé, ensembles avant/après, relations inverses et témoins par invariant | Rename sans parcours Actuals/H ; EditActualPartition vérifie produit complet, retraits, PTEC et réponses ; champ/relation non classé ou fermeture incomplète refusé |
| C3 | §1, §3.2, §4, §9–10 | Trois objectifs A/B/C, critères P0–P7 et refus par défaut ; repli complet uniquement qualifié | Chaque étape a une gate vérifiable ; aucune bascule silencieuse vers l'oracle ; cas de repli nommé, données complètes et tests requis |

**Arrêt :** document soumis à audit indépendant ChatGPT puis GO explicite.
Aucun développement R1.1–R1.3, R1.4 ou R2 n'est autorisé par sa livraison.
