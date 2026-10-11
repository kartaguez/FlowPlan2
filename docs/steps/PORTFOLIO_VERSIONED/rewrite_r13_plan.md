# FlowPlan2 V2 — PLAN R1.3 : transitions métier versionnées en RAM

Date : 2026-10-11. **R1.3 — PLAN PROPOSED FOR AUDIT / NOT STARTED.**
**PLAN ONLY ; aucun GO d'implémentation.** Les règles consolidées sont obligatoires ;
les noms d'API, découpages et politiques techniques proposés ici sont à auditer.
Prochain acte : audit indépendant ChatGPT du SHA documentaire livré, puis éventuel
GO explicite utilisateur. Commit/push ne vaut ni audit ni GO.

## 1. Baseline et préflight

Dépôt `kartaguez/FlowPlan2`, branche `rewrite/portfolio-versioned`.
Baseline initiale obligatoire : `12f835263547cc9bc94b9199562da782f09bb3d6`.
Avant toute modification documentaire : `git fetch origin` réussi,
`git status --short` vide, branche exacte, `git rev-parse HEAD` et
`git rev-parse origin/rewrite/portfolio-versioned` égaux à la baseline,
`git rev-list --left-right --count origin/rewrite/portfolio-versioned...HEAD`
= **0 0**. Aucun AGENTS.md applicable trouvé. Aucun reset, rebase ou force-push.
Ces contrôles Git sont réalisés ; toutes les gates d'implémentation ci-dessous
sont **NOT EXECUTED**. Inspection statique uniquement, aucun test/build/benchmark.
SHA final communiqué après push, sans auto-référence dans ce document.

| Élément | État conservé |
| --- | --- |
| R0 / R0.1 / R1.1 / R1.2 | DONE |
| R1.3 | PLAN PROPOSED FOR AUDIT / NOT STARTED |
| R1.4 / R2 | NOT STARTED |
| PERF-LOAD | Acceptée avec réserve documentée, classification historique C intacte |
| PERF-EDIT | À qualifier dans R1.3 |
| PERF-TRENDS | Hors périmètre R1.3 |
| P3-C | Étudié, non implémenté, abandonné dans le cadre actuel |

## 2. Autorité normative et inspection

Lecture de départ : [current_plan](../../current_plan.md),
[current_canon](../../current_canon.md), [canon patrimonial](../../canon.md),
[R0](./rewrite_r0_plan.md), [canon R1.1](./rewrite_r11_canon.md),
[PLAN R1.2](./rewrite_r12_plan.md), [canon R1.2](./rewrite_r12_canon.md),
[décisions](./rewrite_decisions.md).
A-R12-01–09, B1–B4 et la clôture R1.2 priment sur les clauses historiques
remplacées. Le patrimoine n'ajoute aucune norme V2 par simple renvoi.
La présente mission consolide la frontière R1.3 ; aucune décision proposée
n'est déclarée implémentée, aucun canon/preuve historique R1.1/R1.2 modifié.

| Contrat inspecté, chemin depuis racine | Conséquence réelle pour R1.3 |
| --- | --- |
| `src-v2/domain/primitives/result.ts`, `identity.ts`, `exactReference.ts`, `quantity.ts`, `civilDate.ts` | DomainResult contient diagnostics code/path/message ; IDs records family/value, refs kind/entityId/versionId ; AP/PT/RT/SP/TA/PTEC utilisent EntityIdentity, pas de nouvelles familles métier ; quantités exactes et dates civiles sans horloge |
| `domain/versioning/owner.ts`, `versionEnvelope.ts`, `immutableValue.ts` sous src-v2 | Owners immuables ; predecessor optionnel de même identité ; provenance multiple distincte ; copies/gel profonds, égalité structurée ; factory générique ne valide pas le schéma métier |
| `src-v2/domain/portfolio/payloads.ts`, `payloadValidation.ts` | 14 schémas fermés et createBusinessVersion ; champs obligatoires, null explicite, dailyCap absent/present ; mandatory booléen/objectiveEndDate ; aucune connaissance AP ni statut PTEC |
| `src-v2/domain/portfolio/manifest.ts` | CurrentSelection = manifest + SelectionRevision chaîne opaque ; 12 tables exactes et deux globals ; pas CurrentRevision exporté ni historique Current |
| `graphResolver.ts`, `graphValidation.ts`, `validatedPortfolioGraph.ts` dans ce même dossier | Resolver pur ; inventaires dérivés Settings ; factory certifyPortfolioGraph unique depuis unknown ; marque privée ; validation complète et rapport contextuel réel |
| `src-v2/domain/versioning/versionRegistry.ts` | withVersions recopie batch puis reconstruit createVersionRegistry sur toutes anciennes versions + batch ; lookupExactBatch construit une table locale sur tout registre fourni ; registre structurel, pas certificat |
| `src-v2/application/ports/portfolioReadPort.ts`, `portfolio/loadPortfolioGraph.ts` | Trois ports async unknown séparables ; collecte exacte, revalidation Application puis certification indépendante Domain ; pas de port de publication |
| `src-v2/adapters/memory/memoryPortfolioReadAdapter.ts` | Jeu immutable injecté, lecture uniquement ; Current null permis pour Snapshot ; aucune publication/CAS/commande |
| `src-v2/bootstrap/emptyPortfolioShellState.ts`, `main/createV2Application.ts` | DTO shell vide, pas Current métier certifié ; modules R1.3 proposés dormants sans montage UI/bootstrap |
| `scripts/v2/boundaries.mjs`, `r11.test.mjs`, `r12.test.mjs`, `package.json` | Frontières V2 existantes à conserver ; garde interdit accès calculés runtime, stockage, imports hors root ; tests hexagonaux à étendre sans affaiblir les précédents |
| `scripts/benchmarks/r12-perf/README.md`, `fixture.mjs`, `run.mjs`, `worker.mjs` | Harness LOAD M1–M6, aucune mesure EDIT existante ; profils natifs et protocole réutilisables, outils/preuves historiques intacts |

Les chemins abrégés du tableau sont tous sous `src-v2/domain/` sauf mention
contraire. Cette inspection n'est pas une preuve d'exécution des contrats.

## 3. Objectif, non-objectifs et frontières

Transformer un Current certifié en un autre Current certifié par une transition
métier légitime : prepare, conséquences autorisées, confirmations/revues exactes,
stale global, versions sélectives, candidat séparé, certification complète,
swap RAM unique. Un refus laisse l'état publié intact.

R1.2 certifie l'état structurel final ; R1.3 prouve la transition entre états ;
R1.4 simule/plannifie sur graphe certifié ; R2 apporte durabilité/CAS/transactions/
recovery. R4 généralise les commandes. Ni la révision RAM ni l'atomicité synchrone
ne prouvent une concurrence multi-tab, une transaction native ou une durabilité.

Exclus : persistance, IndexedDB/storage, CAS durable, receipts/idempotence durable,
recovery, import/export, simulation/planning, UI, bridge legacy, Save/snapshot
automatique, moteur incrémental, cache autoritaire et nouvelle certification.
Pas de CRUD exhaustif : renommage Project et reorder suffisent pour Settings et
global ; aucune édition générale Capacity/PlanningSettings/catalogue/couleur,
aucun éditeur ni création générale de racines. Les fixtures fournissent des
états initiaux complets explicitement certifiés. Les commandes difficiles
ci-dessous sont des preuves verticales réutilisables, pas une API temporaire jetable.

## 4. Architecture cible proposée

| Couche / chemins futurs indicatifs | Responsabilité / dépendances |
| --- | --- |
| Domain `domain/portfolio/transitions/` | Intentions métier normalisées, préconditions pures old/new, conséquences structurelles, obligations typées, comparaison de payloads et règles lifecycle/Actuals/ETC ; Domain uniquement |
| Application `application/portfolio/transitions/` | Catalogue borné de commandes, prepare/execute, PreparedTransition, réponses, baseRevision, allocation via port, assemblage, appel des factories Domain et orchestration du swap |
| Application `application/ports/transitionAllocationPort.ts`, `currentRamPort.ts` | Contrats abstraits d'allocation et de cellule RAM publiée ; aucun adapter concret importé |
| Adapter `adapters/memory/` | Cellule RAM, disponibilité des anciennes versions, allocateur déterministe en session ; aucune décision métier ni autorité de certification |
| Tests de composition dédiés | Injection explicite ; bootstrap/main/UI shell non montés et inchangés |

Domain ne connaît ni Current store, préparation applicative, révision technique,
port, adapter, horloge/random, Application, UI, moteur ou legacy. Il reçoit un
graphe de base et une intention explicite, produit des données de transition
sans certificat intermédiaire. Application ne redéfinit aucune règle métier.
Les obligations et la validation pure des réponses appartiennent au Domain ;
Application lie ces réponses à la préparation exacte et orchestre les étapes.

## 5. Commandes représentatives et contrat d'entrée

Union fermée proposée, cibles par IDs/identités validés, valeurs exactes natives.
Entrées inconnues copiées/validées via primitives/factories Domain, jamais de cast
pour admettre commande, payload ou certificat. Pas de patch libre de manifeste
ni de batch CRUD arbitraire. Une commande composite a une intention dédiée.

| Famille proposée | Intention explicite minimale | Preuve fermée |
| --- | --- | --- |
| RenameProject | ProjectId, nom candidat | 1 Settings ou no-op ; autres refs inchangées |
| ReorderProjects | Liste complète ProjectId, deleted/inactive inclus | 1 PortfolioOrder ou no-op ; aucune autre version |
| DeleteLifecycle | Target Project/Reservation/Team/PT/RT | Tombstones et cascades exactes ; retrait TA/PTEC, confirmations |
| RestoreRoot | Project/Reservation/Team et données nécessaires explicitement revues | Identité/rang conservés ; aucune association restaurée automatiquement |
| RestoreAssociation | PT ou RT deleted, dailyCap ou demand explicitement validés, grille et ETC PT | Reconstruire Current sous partition actuelle sans replay historique |
| CorrectActuals | AP propriétaire, cellules ciblées et Consumption candidates | Confirmation ciblée ; revue ETC positive des PT affectés |
| EditActualPartition | Extension/réduction/ajustement/split/merge explicitement discriminés, bornes/partition et cellules candidates | Identités conservées ou neuves selon opération ; ni prorata ni redistribution |
| CoverActualPeriod / EmptyActualPeriod | Intention dédiée, bornes/partition pour cover ; retrait complet pour empty | empty↔covered, confirmations TA et revue ETC |
| SetPTETC | Identité PT existing, ETC exact | PTEC seul ; 0→positif confirmé, aucun AP/TA |
| DeleteUsedCatalog | Program ou Pas, réaffectations/retraits explicites par Project/Reservation | Composite Settings + catalogue ; couleur explicite si retrait Program |

Les variantes AP et restore partagent les règles pures, pas un moteur générique
permettant de contourner les confirmations. Aucune création générale PT/RT n'est
nécessaire pour prouver restore : identités et états deleted préexistent dans les
fixtures. Le contrat décrit néanmoins le PTEC obligatoire pour toute future
création PT ; sa généralisation relève de R4.

## 6. prepare et PreparedTransition

`prepare(command, current)` conceptuel retourne **Prepared | NoOp | Rejected**,
jamais Stale. Application capture une seule vue publiée cohérente, source current,
avec sa révision et son graphe certifié ; pas de paire selection/graph issue de
lectures indépendantes. Toute validation déterminable à partir de cette base et
de la commande est faite ici : lifecycle, ownership, endpoints, cibles/cellules,
partition, dates, quantités, références catalogue et plan composite complet.
Une réponse future peut renseigner un champ explicitement déclaré à revoir,
mais ne peut changer la portée/partition/intention : nouveau prepare requis.

PreparedTransition proposée = handle applicatif opaque, scope d'une session RAM,
avec vue immutable destinée à l'appelant et dossier privé détenu par le service :

- identifiant de préparation non réutilisé, session et baseRevision ;
- base certifiée et refs exactes touchées, intention copiée/gelée ;
- conséquences calculées : objets à changer, sélections à retirer/conserver,
  tombstones, cellules affectées avec bornes anciennes/candidates ;
- obligations de confirmation/revue, valeurs proposées exactes (zéro lorsqu'autorisé),
  champs encore à fournir et raisons ;
- slots d'identités neuves alloués si nécessaires, mappings d'identités historiques
  à réutiliser et plan de matérialisation déterministe ;
- état technique pending/terminated/abandoned, jamais payload Portfolio.

Le caller ne fournit pas un dossier modifiable à execute : handle connu et
appartenance session contrôlés. Handle inconnu/terminé = Rejected applicatif
`InvalidPreparation`, sans réexécution. Pas de certificat de transition,
WeakSet de graphes de confiance, sérialisation/restauration de préparation,
TTL, horloge ou verrou Current. Plusieurs préparations pending coexistent.
Abandon retire le dossier pending ; aucune transition métier et aucun recyclage
d'IDs réservés. Les confirmations ne sont jamais ajoutées aux versions.

NoOp prepare est autorisé seulement si aucune différence métier/sélection ni
obligation réelle ne reste. L'intention restore/delete ne devient pas no-op par
simple égalité de quantités : lifecycle et sélections comptent. Une cible déjà
dans le lifecycle demandé peut être no-op si aucune conséquence n'est nécessaire.

## 7. execute, résultats et erreurs internes

`execute(prepared, answers)` normal : **Applied | NoOp | Rejected | Stale**.
Ordre obligatoire, sous exécution exclusive de la cellule RAM :

1. Comparer baseRevision à la révision publiée ; stale prime sur réponse invalide.
2. Valider binding des réponses et toutes obligations ; valider les valeurs
   nouvellement fournies par les règles Domain. Réponses insuffisantes/refusées
   → Rejected, dossier pending conservé tant que non stale.
3. Comparer les payloads/sélections effectifs puis matérialiser uniquement les
   versions changées, allouer leurs VersionIds, valider createBusinessVersion.
4. Construire manifeste candidat exact et registre enrichi séparés ; contrôles
   d'enregistrement historiques, puis CurrentSelection candidate validée.
5. Appeler **certifyPortfolioGraph({source:'current', manifest, versions})**
   avec l'ensemble exact sélectionné ; aucune réutilisation de certificat ancien.
6. Publier par un swap unique la sélection, le registre et le certificat concordants.

Comparaison effective avant allocation : si réponses ne produisent aucune
différence et toutes obligations sont satisfaites, execute retourne NoOp,
termine préparation, sans version/révision/certification de candidat/publication.
Un no-op ne requiert pas de simulation. Applied termine préparation et retourne
au minimum nouvelle révision (SelectionRevision existante) et nouveau
ValidatedPortfolioGraph. Stale termine/invalide préparation ; nouveau prepare
obligatoire, sans merge/rebase. Réutilisation après Applied/NoOp/Stale refusée
comme handle terminé, pas de receipt durable ni promesse de rejeu Applied.

Extension explicite hors résultats métier normaux : **CandidateCertificationFailure**,
erreur interne discriminée contenant stage, diagnostics Domain et identifiant
technique de préparation, sans exposer un graphe non certifié comme utilisable.
Si R1.3 estime légal son candidat et la certification le refuse, jamais Rejected
métier, jamais auto-réparation ni publication. Incohérence d'assemblage/factory/
registre = `InternalTransitionFailure` avec stage, distincte également. Préparation
terminée sur erreur interne proposée ; investigation/correction puis nouveau
prepare. IDs déjà réservés brûlés ; candidat absent de l'historique publié.
Exceptions récupérables avant swap : même absence de publication, diagnostic
technique ; aucune garantie d'interception d'épuisement physique runtime.

Test du refus interne : injecter en composition de test un défaut dans le candidat
(matérialisation/assemblage) puis appeler la **vraie** factory qui refuse. Ne pas
injecter une deuxième factory ni un certificat fake dans la production. Observer
la trace certification-before-swap ; un succès normal doit utiliser l'export réel.

## 8. Confirmations et revues typées

Chaque obligation porte preparationId, obligationId, raison, refs de base,
identités cibles, valeur exacte et contexte candidat nécessaire. IDs applicatifs
locaux stables dans cette préparation ; aucune comparaison par timestamp/hash.
Réponses fermées discriminées, binding exact, doublon/inconnue/manquante refusés.
Un booléen global accepté ne couvre pas des obligations ciblées sans correspondance.

| Obligation | Contenu visible figé | Réponse minimale |
| --- | --- | --- |
| ConfirmRemoval | Ensemble exact de TA retirées (zéros inclus), causes et Team supprimée éventuelle | Acceptation globale unique de ce retrait ; refus → Rejected |
| ConfirmTeamDeletion | Team cible même sans TA | Acceptation explicite ; fusion avec ConfirmRemoval si même suppression Team, une seule confirmation globale |
| ConfirmCell | Association/SubPeriod, ref TA de base ou absence, anciennes/nouvelles bornes, Consumption candidate | Acceptation de cette cellule et de son contexte exact |
| ReviewETC | PT/PTEC base, ETC précédent, nouvelle frontière et cause de revue | Choix explicite keep(value) ou replace(Quantity ETC), confirmé ; aucun calcul automatique |
| ConfirmPositiveETC | PT, zéro précédent ou nouvelle/restaurée association, ETC positif proposé | Acceptation explicite du positif ; peut être portée par réponse ReviewETC explicite |
| ConfirmRestoreGrid | Grille complète candidate avec zéro proposé par cellule et paramètres association | Toutes cellules/valeurs confirmées, pas couverture implicite par une ancienne réponse |

Une suppression multi-objets retire des TA : une seule ConfirmRemoval pour
l'ensemble retiré. Corrections/bornes modifiées : ConfirmCell pour cellules
conservées affectées, même valeur numérique identique. Une réduction peut donc
requérir confirmation globale du retrait **et** confirmations des cellules dont
les bornes changent. Grille restore entièrement confirmée, positive explicitement
fournie/confirmée ; les confirmations peuvent être structurées en liste unique,
chaque cellule garde sa couverture auditable. Aucune preuve historique persistée.
Une réponse d'une autre préparation, même revision/valeur, n'est jamais réutilisable.

## 9. Stale et révision RAM

Réutiliser SelectionRevision, alias Application CurrentRevision possible sans
nouveau type Domain incompatible. Comparaison exacte globale stricte, aucune
version locale par objet. Plusieurs prepares R7 n'empêchent pas une publication :
le premier Applied produit R8 ; tous les autres prepares R7 sont stale, même si
leurs cibles sont disjointes. NoOp/Rejected/abandon ne changent pas R7.

Proposition : compteur technique BigInt monotone de session, encodé en chaîne
opaque admissible par createCurrentSelection, avec namespace disjoint de la
révision initiale injectée ; aucun timestamp. L'algorithme garantit absence de
réemploi/ABA dans la session ; les octets ne deviennent pas une règle métier.
Handle session interdit de réutiliser une préparation après réinitialisation.
Allocation de révision candidate tardive, changement visible uniquement au swap.
Ce compteur n'est ni VersionId ni CAS durable, pas de coordination multi-process.

## 10. Atomicité RAM et store

Contrat proposé CurrentRamPort : lire une vue immutable cohérente et remplacer
une vue complète sous orchestration exclusive. Vue publiée =
`{selection: CurrentSelection, registry: VersionRegistry, graph: ValidatedPortfolioGraph}`.
Graphe source current et manifeste exactement concordant avec selection ; toutes
refs sélectionnées présentes dans registry. Adapter ne certifie ni ne choisit.
Admission d'une vue inconnue initiale revalide par les factories et certification
R1.2 ; un graphe snapshot ne bootstrappe pas silencieusement Current.

Copy-on-write logique : ancienne vue intacte → batch séparé → registre séparé
→ manifeste séparé → certificat → vue complète → assignation unique. Pas de
mutation d'un tableau partagé, ajout progressif dans le store, rollback métier,
notification/callback permettant de lire une moitié de vue. Lecteurs capturent
une même vue ; aucune propriété mutable séparée pour registre et selection.
Swap synchrone sans I/O/await/callback utilisateur entre stale check et publication.
Si façade async nécessaire, file Application sérialise execute ; stale se vérifie
à l'entrée de la section exclusive, pas avant attente. Allocation proposée synchrone.
Préparations peuvent lire la vue précédente mais ne publient pas.

Port existant de lecture R1.2 conservé ; nouveau store/adapter distinct plutôt
que changement silencieux du lecteur immutable. Un façade read peut capturer la
vue cohérente pour une lecture ; le loader R1.2 multi-await ne devient pas preuve
d'atomicité de session. Aucun snapshot ajouté/modifié au swap, aucune callback
après swap dont l'échec serait présenté comme refus sans mutation.

## 11. Versions sélectives et allocation

Égalité métier structurée sur données validées, quantités canoniques BigInt,
listes ordonnées lorsqu'elles portent une signification. Pas JSON/hash/float ni
identité objet JS comme égalité métier. Pour chaque kind/identité, comparer
payload et sélection réellement requis. Confirmation seule ne change pas payload.
Une ref inchangée reste exactement égale ; les factories R1.2 peuvent recopier
les objets JS, aucune exigence de pointer equality entre certificats.

| Modification | Nouvelles versions attendues |
| --- | --- |
| Nom Project | ProjectSettings seulement |
| Reorder effectif | PortfolioOrder seulement |
| ETC seul | PTEC seulement |
| Une Consumption TA | Cette TA seulement, PTEC uniquement si ETC change |
| Borne SP changée, même ID et Consumption | SP et AP (référence SP changée) ; TA confirmées mais refs conservées |
| AP/partition changé, through identique | AP/SP/TA réellement changés ; pas PTEC pour rebinding |
| through changé | PTEC de chaque PT existing pour lastActualsDate, ETC selon réponses ; jamais PT deleted |
| Delete | Settings/associations lifecycle réellement changés ; retrait sélections TA/PTEC ; AP/SP/TA payloads intacts |
| NoOp ou confirmation seule sans effet | Zéro version ; zéro révision/publication/simulation |

Contrat minimal AllocationPort proposé : réserver un EntityId neuf pour un slot
(kind/owner), réserver un VersionId neuf, réserver un preparationId ; résultats
explicites validés par primitives Domain. Aucune horloge/random dans Domain.
Adapter RAM à namespace injecté + compteur, fake déterministe fournit séquence
connue aux tests. Namespace/collisions vérifiés contre les IDs initiaux et le
ledger session ; port ne peut réémettre un ID déjà réservé, même non publié.
Les IDs business owners existants ne sont pas inventés à partir des EntityIds.

Identités neuves SP/TA réservées à prepare si la conséquence est déjà déterminée,
VersionIds seulement après réponses valides et différence effective à execute.
Predecessor : ref courante base exacte pour identité modifiée ; pour TA/PTEC
réintroduits sans sélection courante, dernière ref **publiée par cette session**
explicitement tenue dans son mapping, ou ref de départ explicitement fournie
(§15). Jamais choisir terminal/latest/plus grand VersionId dans registre.
Nouvelle identité : aucun predecessor. Split/merge : provenance facultative,
si fournie uniquement refs exactes sources explicites distinctes ; filiation
R1.1 intacte, pas de fusion d'identités ni de merge de prepares.

Ledger d'allocation séparé de l'historique métier : jamais recycler après abandon,
stale, refus interne, non-publication. Réponse Rejected avant matérialisation
n'alloue pas VersionIds ; une resoumission du même prepare conserve ses slots.
Allocateur peut donc évoluer sans que le Current/registre publié change ;
« refus sans mutation » porte sur l'état métier publié, pas sur recyclage d'IDs.
Une version candidate non publiée ne figure jamais dans registry publié.

## 12. Lifecycle, delete et restore

Project/Reservation/Team/PT/RT : existing/deleted seulement. isActive et isVisible
indépendants, conservés dans tombstones. Delete permis avec Actuals historiques
non nuls ; aucun ever-nonzero ni blocage lié à charge. Project→tous PT selected
existing deleted ; Reservation→tous RT ; Team→tous PT/RT concernés. Associations
déjà deleted gardent refs. Tombstones sélectionnés préservés, endpoints présents.
PT deleted sans TA/PTEC, RT deleted sans TA. AP stable/partition sélectionnés
inchangés ; TeamCapacity maintenue même Team deleted ; Settings gardent Program/Pas
résolubles. Aucun prorata, redistribution/réaffectation ou tombstone catalogue implicite.

RestoreRoot conserve identité et rang Project, ne restaure aucun PT/RT. Revue des
Settings explicite ; si référence catalogue deleted, candidat existing requiert
réaffectation/retrait explicite cohérent (couleur fournie si Program retiré),
sinon Rejected à prepare. Aucune couleur/isActive suggérée depuis defaults cachés.

RestoreAssociation : endpoints existing, identité couple inchangée, paramètres
PT dailyCap / RT demand explicitement soumis. Grille sur **partition courante**,
chaque cellule zéro proposée puis confirmée, aucune ancienne valeur non nulle
réactivée. Identité TA déjà existante pour couple association/SP réutilisée ;
payload zéro différent de dernière version publiée crée nouvelle version.
Si payload identique et ref publiée admissible, re-sélection possible après
confirmation complète sans version artificielle (proposition §22) ; sélection
changée ⇒ Applied même si batch vide. PTEC PT valide obligatoire, AP stable et
lastActualsDate courants, ETC fourni/revu explicitement sans reprise automatique.
RT sans PTEC. RestoreRoot ne revient jamais à un ancien manifeste.

## 13. ActualPeriod, SubPeriod et TeamActual

AP stable par Project/Reservation, même deleted. Empty : bornes null, aucun SP/TA.
Covered : partition inclusive complète contiguë ; zéro association existing ⇒
grille vide valide. Conservation de refs des portions strictement inchangées.
Earliest Project reste borne de from, inactive/deleted inclus ; objective/mandatory
n'étend/coupe jamais AP. Pas de lien inventé entre bornes Reservation Forecast/AP.

Extension : nouvelles portions explicitement définies, nouveaux SP si portions
ajoutées ; compléter produit associations existing × SP, Consumption zéro proposée
et confirmée pour nouvelles cellules. Réduction : portions hors période retirées
Current, confirmation globale même zéros ; partie conservée sans redistribution.
SP partiellement conservé avec borne modifiée garde EntityId, nouvelle version ;
cellules correspondantes affectées/confirmées même si Consumption identique,
TA ne versionne pas uniquement pour changement de borne owner SP.

Split/merge : nouveaux IDs SP, owner AP stable ; nouvelles identités TA nécessaires
pour nouveaux couples, quantités explicitement fournies/confirmées, jamais division,
somme ou prorata automatiques. Sources métier facultatives, invariants génériques
predecessor/provenance R1.1 appliqués. Anciennes SP/TA quittent sélection, restent
archives ; confirmation globale des cellules retirées et confirmation des nouvelles.

empty→covered : bornes/partition explicites, cellules nécessaires zéro proposées
et confirmées. covered→empty : commande dédiée explicitement demandée, retrait
SP/TA courants, confirmation globale du retrait s'il y a cellules ; AP vide ne
détruit pas versions anciennes. Revue ETC et alignement null obligatoires PT.
Covered sans association : pas de confirmation de TA fictive.

CorrectActuals ne modifie pas partition implicitement. Cellules visées existent
pour associations existing, quantités exactes ≥0, confirmations ciblées.
Correction numérique identique et contexte inchangé = NoOp. Composite partition
et correction : union calculée sans obligations contradictoires, une seule publication.

## 14. ETC et PTEC

PTEC seulement PT existing, identité AP stable, lastActualsDate = through ou null,
ETC exact ≥0 ; aucune conversion Consumption→ETC, aucun complete/reopen.

Revue ciblée requise si through change pour **tous PT existing** du Project,
ou si correction/contextes TA affectent un PT (Consumption ou bornes de ses SP).
Cette étendue reprend PLAN R1.2 §6.3 et A-R12-06, pas seulement le cas through
explicitement détaillé dans la mission. Aucun ETC Reservation.
ETC précédent zéro : maintien zéro proposé sans revue supplémentaire ; changement
0→positif explicitement confirmé. ETC précédent positif : ReviewETC obligatoire,
keep explicite autorisé, aucun nouveau nombre calculé. Même payload PTEC après
keep ⇒ aucune nouvelle version ; lastActualsDate changé ⇒ version nécessaire
même ETC identique. Correction TA seule, through identique, keep positif confirmé
⇒ TA seule nouvelle version. PT restauré : ETC explicite et PTEC valide, jamais
fallback historique. ETC seul ne crée aucune AP/SP/TA.

## 15. Historique RAM, mappings et certification

Deux ensembles distincts : **H** = versions métier publiées accumulées en RAM,
**S** = versions exactes sélectionnées par manifeste candidat et dépendances
structurelles déjà incluses dans ses tables. Batch B nouveau. H conserve toutes
anciennes versions ; S ne charge ni predecessor ni sources de provenance par
fermeture transitive. B1 maintient not-established dans contexte de S si nécessaire.
Cela ne signifie pas que les contradictions connues dans H peuvent être ignorées.

Proposition initiale conservatrice : construire registre candidat H+B avec
withVersions, qui vérifie mappings/collisions/owners/filiation sur contexte fourni,
puis extraire S par lookupExactBatch et appeler certification complète indépendante
sur S. Domain reprend ses acquisitions/copies/validations habituelles. Pas de
certification H exhaustive imposée comme fermeture métier de Current ; pourtant
construction H+B et extraction coûtent actuellement en H, à mesurer §18.

L'Application doit savoir réutiliser les identités historiques TA/PTEC/PT/RT et
Settings/AP/Capacity/globals : mapping calculé depuis versions initiales valides,
puis maintenu avec chaque batch **publié** dans la même vue RAM, reconstructible
pour identités/couples. Le mapping ne délivre pas de certificat et ne remplace
aucun contrôle Domain. Lookup historique nécessaire lors restore distinct de S.
Si plusieurs versions non sélectionnées d'une identité existent au démarrage,
aucune branche ne peut être choisie par latest/ordre. Pour predecessor hors
sélection : ref publiée de base explicitement fournie par l'initialiseur ou
commande restore, validée et cohérente avec l'identité ; sinon préparation
Rejected `HistoricalBaseRequired`. Historique absent peut être signalé comme
contexte incomplet : aucun ID concurrent TA créé « faute de voir » l'existant.
Admission de session R1.3 exige inventaire RAM d'identités complet dans sa portée
ou manifeste explicite de réservation fourni ; R1.2 ne prouve pas cette exhaustivité.
Les garanties durablement exhaustives restent R2.

**Tension mesurable, pas autorisation d'optimisation :** withVersions revalide H
et lookupExactBatch parcourt H ; impossible de promettre aujourd'hui un coût
indépendant de H. Première mesure fidèle obligatoire. Si pente artificielle
historique observée, gate PERF-EDIT reste à arbitrer : plan correctif séparé,
audit/GO avant toute modification du registre, append sélectif ou représentation
historique. Aucune structure partagée trusted, factory privilégiée, certificat
intermédiaire, cache/index autoritaire ou reprise P3-C préautorisée.
Une optimisation devrait conserver contrôles d'enregistrement sur contradictions
connues, copies/gel, diagnostics, mappings à vie, contexte R1.1 et factory unique,
avec oracle différentiel ; l'intégrité ne se réduit pas au seul S.

Snapshots existants restent immuables et lisibles par lecteurs séparés avec refs
historiques exactes après correction/delete/restore Current. Aucun ancien manifeste
Current historisé automatiquement, aucun nouveau Snapshot produit.

## 16. Program/Pas et composite explicite

Catalogue autonome : existing inutilisé valide, dernier usage retiré ne supprime
rien. DeleteUsedCatalog fournit liste complète des owners existing utilisateurs,
avec remplacement existing du même kind ou retrait null. Réaffectation Program
⇒ ownColor null ; retrait ⇒ couleur canonique explicite, aucune suggestion Domain.
Pas n'affecte pas couleur. Settings deleted conservent leurs refs vers catalogue
qui devient deleted, conformément B3 ; elles restent résolubles.
Liste manquante, owner étranger, cible deleted ou référence restante d'owner
existing ⇒ Rejected à prepare. Une option utilisateur de modifier un owner
deleted hors restore n'est pas introduite. Toute sélection catalogue conservée
et tombstone exact. Nouvelle version catalogue + seules Settings réellement
changées ; AP/TA/PTEC/Order intacts. Pas de cascade choisissant remplacement,
normalisation réparatrice, fusion de noms/IDs ou CRUD catalogue généralisé.
Ce cas et delete Team/partition démontrent les composites multi-objets avec
une préparation, union d'obligations et une certification/publication uniques.

## 17. Stratégie de tests et couverture des familles

Futures fixtures natives adjacentes aux tests, explicites/certifiées par vraie
factory ; pas d'import legacy ni de production depuis tests. Base : deux Projects,
une Reservation, deux Teams dont hidden, PT/RT existing et deleted, AP empty/covered,
TA zéro/positive, ETC zéro/positif, Program/Pas existing unused/used/deleted,
ordre inactive/deleted, Snapshot partageant versions puis Current divergent.
Oracles indépendants : ensembles refs/owners/cellules et nombres de versions
attendus, quantités BigInt, preuve de non-mutation par ancienne vue gelée et refs.

| Familles exigées par mission | Scénarios futurs discriminants / résultat attendu | Gate |
| --- | --- | --- |
| 1, 2, 19 local/no-op/sélectivité | Rename et reorder changés/identiques ; ETC seul ; compteur allocator/batch/revision/swap = zéro pour no-op ; refs exactes inchangées | G13-04/05 |
| 3, 4, 5 delete/cascades Project/Reservation | Delete PT et RT ; root cascade avec TA historiques positives ; AP/SP/TA versions intactes, TA/PTEC retirés, tombstones complets | G13-06 |
| 6 Team→PT/RT | Team hidden et positive deleted ; toutes associations ciblées, capacité conservée ; toujours confirmation, globale unique TA zéros inclus | G13-06/03 |
| 7 restore PT/RT | Partition changée depuis delete ; zéro proposé, ancienne TA positive non réactivée ; ID couple/TA réutilisé, grille complète confirmée, PTEC PT courant | G13-07 |
| 8 correction Actuals | TA 1/3→2/3 ; autre cellule inchangée ; ETC positif keep/replacement requis, zéro sans revue ; valeur identique no-op | G13-08/09 |
| 9 extension/réduction | Nouvelle zone zéro confirmée ; retrait global ; borne SP change même quantité exige confirmation sans version TA | G13-08/03 |
| 10 split/merge | IDs SP/TA neufs ; quantités explicites, provenance vide et sources explicites valides ; pas prorata ; anciennes refs historiques disponibles | G13-08/05 |
| 11 empty↔covered | Bornes/partition explicites ; clear dédié et global ; zéro association covered accepté ; PTEC date null/through alignée | G13-08/09 |
| 12 revue ETC | Positif omis rejeté/keep accepté ; 0→positif non confirmé rejeté ; AP through identique ne force aucun PTEC | G13-09 |
| 13, 14 catalogue/composite | Program et Pas utilisés par Project/Reservation : réaffectation/retrait complet, couleur explicite ; owner manquant refusé, deleted refs gardées | G13-10 |
| 15 coexistence/stale | Deux prepares R7 ; premier Applied R8, autre Stale avant validation answers ; no-op R7 ne rend pas stale ; pas rebase | G13-02 |
| 16 refus intact | Chaque négatif commande/confirmation : selection/revision/registry/graph/Snapshots inchangés ; réponses corrigées resoumises réussissent | G13-03/11 |
| 17 incohérence certification | Candidat faulté par test, vraie factory refuse → CandidateCertificationFailure ; zero swap, old H/Current intacts | G13-12 |
| 18 certification obligatoire | Trace vraie certification complète avant chaque swap effectif ; unknown/cast ne fournit pas certificat, input mutation sans effet | G13-12/13 |

Cas fermant des invariants réels : restoreRoot sans associations/rang stable ;
TA historique de même couple non sélectionné et branche ambiguë ; revision ABA,
préparation étrangère/terminée/abandonnée ; réponses mutées après prepare ;
cycle/collision/owner connu contradictoire même hors S ; Snapshot immuable après
Current divergent ; earliest et dates extrêmes sans arithmetic hors plage.
Tests compile @ts-expect-error : certificat opaque, familles ID/Quantity, readonly,
réponses discriminées ; tests runtime unknown/accessors/mauvaises clés séparés.

## 18. PERF-EDIT — protocole futur et décision

**NOT EXECUTED.** Le portfolio est déjà chargé et certifié avant t0. Imports,
compilation, génération fixture, initialisation registre/store/certification
initiale/mappings/ledger et construction de réponses de harness sont setup séparé.
Aucune API loadCurrentGraph/loadSnapshotGraph dans la mesure EDIT. Mesurer temps
machine actif ; attente humaine entre prepare et execute exclue et signalée.
Temps total actif = prepare + execute jusqu'au résultat disponible ; également
rapporter latence execute seule après réponses prêtes. Pas de simulation/UI/R2.

| Segment distinct, sans double comptage | Mesure |
| --- | --- |
| E1 commande/prepare hors règles pures | Admission/copieuse/binding et construction du dossier/obligations |
| E2 validation pure transition | Appels Domain dans prepare et validation valeurs réponses, ventilés |
| E3 réponses/execution hors segments suivants | Binding/confirmations/stale et orchestration |
| E4 versions sélectives | Comparaison, allocation et factories business/enveloppes ; nombre par kind |
| E5 candidat | Construction manifeste/CurrentSelection, withVersions H+B, extraction S, copies et mappings candidats sous-phases séparées |
| E6 certification | Vraie certifyPortfolioGraph, acquisitions Domain complètes, sans chronométrer LOAD |
| E7 publication | Construction terminale/vue et swap, comptage 1 |
| E8 résultat disponible | Temps total extérieur prepare+execute, coût non attribué/overhead de mesure explicité |

Horloge de performance uniquement dans harness hors Domain, instrumentation
séparée des campagnes officielles ; pas de logger/horloge métier. Appels inclusifs
recouvrants ne sont pas additionnés ; les sous-phases sans séparation fiable
restent regroupées et leur limite déclarée. Total extérieur fait autorité de mesure.

Réutiliser générateur/seed 1202 et mêmes dimensions : Small 10 Projects/5 Teams/
12 SP par Project et Reservation, Medium dense 100/20/24 ; Medium sparse témoin
utile. Large 300/40/36 existant : campagne séparée, seulement si résultats Medium
et ressources rendent raisonnable, arrêt/NOT_EXECUTED motivé sinon ; jamais
automatiquement lancé ni requis d'être PASS par invention.

EDIT-local : renommage Project, exactement un Settings nouveau. EDIT-actuals :
correction locale TA avec ETC positif explicitement keep, puis variante changement
de borne/through avec revue ciblée PTEC ; rapporter ampleur (TA/SP/PT/B), éviter de
faire passer un batch massif pour correction minuscule. Réponses préfabriquées
par harness après prepare ne remplacent pas validations execute mesurées.

Expérience factorielle : pour même Current S, varier H non sélectionné par lots
historiques publiés valides (profondeurs proposées 0, 10, 100, 1000 éditions, selon
ressources ; valeurs expérimentales, aucun seuil métier). S final rigoureusement
identique et chaînes valides ; bootstrap de chaque cellule hors timing. Croiser
taille Small/Medium avec profondeurs et scénarios, rapporter |S|, |H|, profondeur,
refs/batch/hash fixture ; séparer nombre de versions historique et profondeur de
filiation si possible. Les petits witnesses small:history existants ont Current
null, ne sont pas utilisés tels quels pour EDIT ; fixtures dérivées nouvelles
explicites dédiées R1.3 sans modifier les fixtures/preuves R1.2.

Chaque essai indépendant part de la même cellule chargée ou état équivalent
préconstruit hors timing ; commande toujours effective, pas première édition
suivie de no-ops. Préparer ces cellules une par une évite empilement mémoire ;
ancien résultat relâché après observation. Campagne de longues éditions cumulées
séparée pour diagnostiquer croissance, jamais confondue avec comparaison S fixe.

Protocole initial aligné LOAD : premier appel, un warm-up, trois répétitions
mesurées minimum, processus isolés, deadline parent 30 s/phase et old-space
1 Gio comme limites de laboratoire déclarées, pas SLA. Conserver brut, médiane,
min/max/dispersion, CPU, heap/RSS et limites de mesure (endpoint ≠ pic exclusif,
maxRSS lifetime inclut setup), environnement/versions/hashes et échecs/timeouts.
Profils CPU séparés des timings non instrumentés, ordre inverse témoin si dérive.
Stale/no-op/rejected diagnostics secondaires à counts zéro, jamais benchmarks
principaux remplaçant Applied.

Deux verdicts : conformité fonctionnelle/architecturale ; qualification EDIT
mesurée et acceptabilité interactive à arbitrer **après mesure**, sans seuil
arbitraire. Le rapport expose pente S versus H et coûts de registre/certification.
Un hotspot ne vaut pas GO optimisation : point de décision séparé §15/§22.
Aucune requalification LOAD, aucune reprise P3-C ou moteur incrémental.

## 19. Gates d'implémentation futures

**Toutes NOT EXECUTED.** Une gate nécessite positif, négatif discriminant et
preuve brute, pas simplement une suite verte. Diagnostics stage/code/path vérifiés.

| Gate | Condition d'acceptation future / propriétaire |
| --- | --- |
| G13-01 Domain / hexagonal | Règles pures tests dédiés ; Domain→Domain seulement, Application via ports, adapters sans certification ; canaris AST/type/transitifs legacy/storage/horloge/random/Engine interdits |
| G13-02 prepare/execute/stale | Préparation complète/immutable, jamais Stale prepare ; R7 concurrent, stale avant réponses, no-op ne change pas revision ; aucun await/reentrance entre check et swap ; handles session/terminés contrôlés |
| G13-03 confirmations | Global retrait unique zéros inclus, Team toujours, cellules/contextes exacts, resoumission Rejected non stale ; réponses wrong binding/duplicate/missing/unknown/decline refusées |
| G13-04 NoOp | Deux voies prepare et execute ; zéro version/révision/swap/simulation, aucune réservation VersionId ; pas no-op confondu avec sélection modifiée |
| G13-05 versions/IDs | Matrice §11 exacte, refs inchangées conservées, predecessor exact/owners, split/merge nouveaux IDs ; aucun recyclage même candidat refusé/abandon/stale ; collisions/allocation défectueuse refusées |
| G13-06 lifecycle/cascades | 5 kinds existing/deleted, cascades complètes ; AP/SP/TA/Capacity/catalogues/Order inchangés selon règles ; suppression positive historique acceptée, isActive/visibility distincts |
| G13-07 restore | Root sans associations, rang/identités ; PT/RT grille courante complète zéro confirmée, nonzero explicite, ID TA à vie réutilisé et PTEC valide ; historique ambigu/absent déclaré |
| G13-08 Actuals | Correction, bornes, extension/réduction, split/merge, empty↔covered ; partition/grille exactes, earliest, dates bornes, zéro association ; aucun prorata/replay |
| G13-09 ETC | Positif revue ciblée, zéro maintien, 0→positif confirmé ; through identique pas rebinding, through change/null alignement ; PT only et aucun statut/calcul auto |
| G13-10 catalogue/composite | Program et Pas autonomes, used-delete explicite complet, ownColor fourni/reassign null, deleted refs résolubles ; une certification et un swap multi-objets |
| G13-11 atomicité/refus | Vue publiée identique après chaque Rejected/Stale/erreur interne ; observation vieille/nouvelle vue uniquement ; H conserve anciennes versions, B refusé absent ; Snapshots indépendants immuables |
| G13-12 certification | Appel unique autoritaire réel, complet avant swap ; défaut candidat → CandidateCertificationFailure distinct ; aucune autre factory/cast trusted/cache bypass |
| G13-13 non-régression/outillage | npm run check:boundaries:v2, npm run typecheck:v2, npm run test:v2, npm run build:v2 ; R1.1/R1.2 G12/P0/P1/P2/A1/B et tests AST/canaris existants conservés, aucun changement historique de preuves |
| G13-14 PERF-EDIT | Protocole §18, brut/segments/sizes/history, total Applied effectif ; coûts H explicités, verdict distinct et décision après mesure ; réserves non masquées, aucune optimisation implicite |
| G13-15 livraison/rollback | Diff scope R1.3, canon/preuves/registres futurs stateless, rollback isolé normal vérifié ; audit indépendant et clôture utilisateur requis pour DONE |

Les commandes npm sont futures uniquement. Ciblés : suites Domain transitions,
Application R13, adapter RAM, puis `r12.test.ts` et `scripts/v2/r11.test.mjs`/
`r12.test.mjs` via runner existant ; ne pas lancer un ciblé compilé périmé.
Ajouts de tests de frontières bornés possibles après GO ; garde général et
restrictions existantes conservés, toute incompatibilité de garde soumise à
un delta explicite audité. Smoke browser seulement si graphe de démarrage changé,
ce qui est hors cible proposée ; Windows reste DEFERRED selon I-R01-C.

## 20. Séquence d'implémentation proposée, après audit et GO

| Étape | Livraison bornée | Passage |
| --- | --- | --- |
| P0 | Audit indépendant de ce plan, arbitrages nécessaires §22, GO explicite, nouveau préflight SHA exact/propre/0 0 | STOP si delta/arbitrage bloquant non résolu, pas de correction automatique |
| P1 | Types/règles Domain pures, obligations et égalité sélective ; tests indépendants sans store | G13-01/03/05, invariants R1.1/R1.2 conservés |
| P2 | Allocation, dossiers pending, révision et vue RAM cohérente ; prepare/execute pipeline minimal Rename/reorder/ETC | G13-02/04/11/12 ; certification réelle et swap unique |
| P3 | Première qualification EDIT-local S/H sur pipeline conservateur | Mesure registre/historique, point de décision ; aucun correctif architectural automatique |
| P4 | Delete/cascades et restore, réutilisation historique identities/base refs | G13-06/07, confirmations et intact refus |
| P5 | Actuals partition/correction/empty/ETC, composites catalogue | G13-08/09/10 + matrice complète §17 |
| P6 | Qualification finale EDIT-local et EDIT-actuals, régressions/outillage, rollback isolé, canon/preuves et registre reprises | G13-01–15 ; limites/mesures réelles, audit livraison avant DONE |

Tout changement requis après P3 est un plan séparé avec preuve/audit/GO, ne
rallonge pas silencieusement le périmètre. R1.4/R2/R4 non préparés automatiquement.
Les reprises éventuelles sont sélectives et consignées avec source/SHA/symboles/
imports/preuves ; pas de copie d'une ancienne session/autorité ou merge legacy.

## 21. Risques et contradictions recherchées

| Constat réel | Traitement, limite et gate |
| --- | --- |
| R0/T/I historiques protègent charge passée, réactivent historique, rebondent PTEC/ref version AP, auto-prunent catalogue et portent complete/reopen/connaissance AP | A-R12-01–09/B1–B4 remplacent explicitement ; jamais repris comme normes R1.3 ; documents historiques inchangés |
| canon.md décrit ancien modèle inline/catalogue usage-driven et CAS/projection legacy | Patrimoine seulement selon R0 autonomie V2 ; aucun import ou règle implicite repris |
| Clôture dit « aucun cadrage R1.3 » dans ses sections | État de cette livraison passée ; nouveau bandeau des points d'entrée prime pour la présente préparation PLAN ONLY, R1.2 reste DONE |
| CurrentRevision demandé conceptuellement mais type existant SelectionRevision | Réutiliser type existant, alias Application possible ; pas nouveau champ Domain ni CAS durable |
| Adapter RAM existant est read-only | Nouveau port/cellule dédié, pas prétention qu'il sait publier aujourd'hui |
| Charge EDIT ne devrait pas dépendre artificiellement de H, mais withVersions/lookupExactBatch coûtent H | Tension technique ouverte, mesure obligatoire P3/G13-14 ; aucune garantie d'indépendance inventée ni optimisation préautorisée |
| Certificat R1.2/context partial ne prouve pas inventaire historique ou transition | Admission/mappings explicitent portée RAM ; règles old/new Domain + préparations, intégrité historique distincte, durable R2 |
| Revue ETC sur correction sans through changé est plus précise dans R1.2 §6.3 que l'exemple détaillé mission | Appliquer revue positive des PT affectés, conserver PTEC si payload identique ; §14/G13-09 ferme ce cas |
| TA owner contient identité SP, pas version SP | Borne modifiée exige confirmation mais pas nouvelle TA si payload constant ; §11/13, aucun rebinding artificiel |
| Restore « nouvelle version TA » vs règle générale « payload identique ⇒ aucune version » | Branche zéro déjà publié à réutiliser après confirmation proposée §12 ; arbitrage explicite O13-04 avant GO, pas masqué |
| Branches R1.1 autorisées sans notion de latest historique | Base ref non sélectionnée explicitement fournie ou dernière publication connue de session ; ambiguïté refusée, pas de sélection par ordre |
| Garde runtime interdit accès calculés/constructor/stockage ; Domain sans port/clock | Algorithmes doivent rester compatibles ; tests futures, aucun élargissement implicite de garde |
| Bootstrap shell vide ≠ Current avec globals ; defaults non normés | Injection états complets pour verticale dormante ; pas de default horizon/weekdays/N/couleur ; opérationnel bloqué jusqu'arbitrage |
| Ratio RT exception sans période encore ouvert | Sans calcul en R1.3, différé avant scénario moteur concerné R1.4/R3, pas arbitrage caché |

Autres risques : fuite de confirmations comme histoire, mauvaise détection no-op,
publication réentrante, coût copies H/S et mémoire de prepares multiples, collision
allocateur, états historiques incomplets et candidate failure traité Rejected.
Mitigations §§6–19 ; limites physiques runtime et report Windows inchangés.
Aucune contradiction n'autorise à rouvrir R1.1/R1.2 ou poursuivre P3-C.

## 22. Arbitrages proposés pour audit, non approuvés

| ID | Proposition concrète / question | Condition avant GO |
| --- | --- | --- |
| O13-01 API/section exclusive | Handle session opaque + dossier privé ; execute synchrone sans await, façade sérialisée si besoin ; SelectionRevision réutilisée | Auditer opacité applicative, admission unknown, absence de réentrance et compteur anti-ABA |
| O13-02 allocation/historique | Namespace injecté, ledger non recyclé ; mapping identité reconstructible ; base exacte hors sélection explicite si ambiguë | Fixer admission inventaire complet RAM et signature minimale des ports avant P2/P4 ; aucune promesse exhaustive durable |
| O13-03 Failure | CandidateCertificationFailure distinct des quatre résultats métier ; préparation terminée sur interne | Auditer union publique/stages, vraie factory testée, aucune publication et investigation requise |
| O13-04 Restore payload inchangé | Re-sélection de ref TA/PTEC publiée admissible, confirmée, sans version identique artificielle ; nouvelle version si payload change | Tension avec formulation « réutiliser identité avec nouvelle version » à trancher explicitement avant GO restore ; pas d'ancien nonzero implicite dans les deux options |
| O13-05 EDIT historique | Baseline fidèle withVersions H+B ; mesure S/H puis plan correctif séparé si dépendance artificielle | Aucune amélioration promise ; gate ne se ferme pas par seul PASS fonctionnel ; acceptabilité après données et décision utilisateur |
| O13-06 defaults/bootstrap | Hors montage opérationnel ; tests injectent globals/IDs/révision/catalogues/couleurs explicites | Si montage opérationnel demandé : blocage précis horizon/weekdays/N/identités initiales/defaults métier à normer, ne pas inventer |

Les règles métier consolidées ne sont pas remises au vote. L'étendue ETC positive
§14 et la suppression composite catalogue §16 sont explicitement détaillées pour
auditer O12-06, pas marquées « réalisées ». O12-07 demeure hors R1.3 ; O12-08
n'est pas clos par des valeurs de fixture. Toutes propositions doivent être
adoptées/corrigées par audit puis GO, pas par simple début d'implémentation.

## 23. Critères de DONE futurs et auto-audit du PLAN

DONE futur : toutes gates G13-01–15 réellement satisfaites ou réserve explicite
arbitrée et tracée ; matrice 19 familles, refus et erreur interne intact, versions
sélectives, certificat unique, autonomie Snapshot et frontières démontrés ; EDIT
mesuré/qualifié avec verdict accepté après mesure, pas SLA inventé ; canon/preuves
brutes/limites et décisions réalisées enregistrés, aucune dépendance à conversation ;
audit indépendant favorable et clôture utilisateur explicite. Pas DONE automatique
par tests verts. R1.4/R2/R4 restent hors cette livraison.

Auto-audit documentaire de cette mission : A frontière R4 §3/5 ; B allocation
§11 ; C préparation §6 ; D incohérence interne §7 ; E révision §9 ; F histoire
§15/18 ; G defaults §22 ; H contradictions §21. Les 24 rubriques requises sont
présentes, 19 familles mappées §17, gates uniquement futures, arbitrages visibles.
Ce contrôle n'est pas un audit indépendant ni une gate d'implémentation exécutée.

Livrable présent : ce plan et bandeaux minimaux current_plan/current_canon/registre
décisions ; aucune décision comme implémentée, aucune preuve historique touchée.
Contrôles documentaires : diff/scope Markdown uniquement, liens locaux nouveaux,
statut et git diff --check ; aucun test/script/build/fixture/benchmark lancé ou
modifié. SHA/arbre/origin finaux rapportés après commit/push normal.

## 24. Rollback

Mission PLAN ONLY : revert normal du commit documentaire livré après coordination,
sans reset/force ; restitue les bandeaux/plan antérieurs sans toucher runtime ou
données. Aucun exercice de rollback exécuté ici.

Implémentation future : commits bornés R1.3 dormants, revert inverse dans clone
jetable ; comparer arbre socle attendu et relancer vérifications V2 pertinentes,
préserver preuves et rapporter limites. Sessions RAM jetables seulement ; absence
de durable ne vaut pas garantie de conservation après fermeture processus.
Aucun effacement d'archives publiées dans une session encore active sous couvert
de rollback métier ; refus ne nécessite jamais rollback du Current.
Aucune DB/namespace utilisateur/legacy à restaurer/nettoyer. Pas de conversion
historique ou reset partagé. **STOP après livraison documentaire ; prochain acte
exclusif : audit indépendant du PLAN R1.3, puis éventuel GO explicite.**
