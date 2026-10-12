# FlowPlan2 V2 — R1.3 — IN REVIEW

Implémentation autorisée par instruction utilisateur après audit indépendant
favorable du PLAN corrigé B1–B4. Baseline documentaire et préflight exact :
`6cce48f41afa015bba86fb428450b0dab9d861b8`, branche
`rewrite/portfolio-versioned`, fetch réussi, HEAD/origin identiques, arbre propre,
divergence 0/0. Le préflight a été répété lors de la reprise après une première
session sans modification. Aucun GO supplémentaire demandé.

**IN REVIEW exclusivement.** L'audit indépendant du code, des tests et des
mesures reste à faire ; aucune clôture utilisateur acquise. R1.4/R2/R4 non
commencés. R1.1/R1.2, leurs contrats et leurs preuves historiques sont inchangés.

## Architecture livrée

Modules dormants, aucun montage bootstrap/main/UI. Domain ne dépend que de
Domain ; Application utilise trois nouveaux ports abstraits ; adapters RAM
sans autorité de certification. Aucun moteur, stockage durable, IndexedDB,
CAS durable, recovery, import/export, bridge, snapshot automatique ni CRUD
exhaustif ajouté. Aucune modification VersionRegistry ni reprise P3-C.

| Couche et fichier sous src-v2 | Responsabilité |
| --- | --- |
| domain/portfolio/transitions/transition.ts | Analyse pure depuis graphe et H acquis ; schémas fermés unknown, préconditions, conséquences, obligations, comparaison structurée, validation des réponses et revues ETC |
| application/portfolio/transitions/session.ts | Admission complète, ledger, dossiers privés, prepare/execute/abandon, liaison des identités, VersionIds, predecessor figé, candidat séparé, certification réelle et publication |
| application/ports/currentRamPort.ts | Vue cohérente selection/registry/graph, exclusivité synchrone et source native RAM complète |
| application/ports/transitionAllocationPort.ts | Réservations synchrones techniques d'EntityId, VersionId et preparationId |
| application/ports/candidateAssemblyPort.ts | Assemblage synchrone, composition de test faultée ; aucune certification/publication dans ce port |
| adapters/memory/currentRamAdapter.ts | Source acquise/copiée/gelée, cellule unique, garde réentrance et allocateur à namespace/compteurs BigInt injectés |

Le dossier conserve la base entière, les propositions, bases exactes et slots.
Domain emploie des labels de templates privés pour exprimer les nouvelles
SubPeriods et cellules dépendantes avant réservation. Ces labels sont choisis
sans collision avec H, ne sont pas des identités métier réservées, ne sont jamais
publiés et ne consomment aucun VersionId de l'allocateur. Application les lie aux
EntityIds réservés. La vue publique montre les identités allouées ; les refs de
versions de templates ne sont pas présentées comme versions déjà créées.

## Admission historique et allocation — B2

`createNativeRamHistorySource(current, H, inventory, reservations)` relève de la
composition possédant l'ensemble du jeu natif. `admitRamHistory(source)` acquiert
les données, valide H par createVersionRegistry, confronte exactement l'inventaire
fermé (identity/owner/refs), contrôle réservations et collisions, extrait S et
certifie le Current avec la vraie factory. Il retourne une admission opaque.
Un flag unknown `complete:true` n'est pas une capacité d'admission.

Inventaire incomplet/ref attendue absente : SessionHistoryIncomplete. Collisions
H/mappings/filiation : diagnostic Domain conservé. Ledger contradictoire ou
second couple réservé : IdentityReservationConflict. Ni réparation, ni absence
historique déduite du seul S, ni deuxième identité de secours. Une table locale
Application accélère seulement la confrontation exacte de l'inventaire avec H ;
aucun contrat/algorithme de VersionRegistry n'est changé.

L'exhaustivité est une **précondition de la source de composition**, pas une
preuve magique : un passé omis à la fois de H et de l'inventaire est indétectable.
Portée : ce Portfolio et tout son passé annoncé dans cette session/source RAM.
Aucune unicité durable inter-processus/reconstruction depuis stockage revendiquée.

Les réservations sont distinctes du Current. `reservations()` rend une copie
immutable de leurs IDs et couples published/pending/burned, compatible avec
réadmission complète d'une source RAM transférée. Un abandon/stale/échec ne les
recycle pas. Un couple TA/PTEC réservé est bloqué pour une autre préparation,
même après abandon ; plusieurs SubPeriods d'un AP sont légitimes. Les slots
partiellement réservés lors d'un refus restent brûlés. Toute collision de sortie
d'allocateur est refusée, sans retry/fallback. VersionIds seulement après réponses
valides et changement effectif ; IDs non publiés conservés dans le ledger.

## Contrats publics

`prepare(unknown)` : Prepared / NoOp / Rejected. Une lecture de vue cohérente,
analyse Domain, admission historique/bases puis réservations. Aucun changement
Current. Plusieurs dossiers pending peuvent coexister. Le handle nominal gelé
porte preparationId, baseRevision et obligations gelées, chacune liée à sa
preparationId avec obligationId, reason et contexte exact. Un Map privé lie
l'objet original à cette session : copie/objet forgé/autre session refusés.

`execute(handle, {preparationId, preparation: handle, answers})` : Applied / NoOp / Rejected / Stale,
avec CandidateCertificationFailure et InternalTransitionFailure distincts.
Answers : liste fermée de Confirm (accept) ou ReviewETC (accept et keep/replace,
ETC exact si replace). Binding de la liste au handle opaque exact, pas seulement au texte preparationId
(une réémission dans une nouvelle session ne permet aucun rejeu), doublons,
inconnues, manquantes, mauvaise union et refus détectés. Entrées unknown copiées,
accessors rejetés sans invocation. Réponses Rejected corrigibles tant que pending.
Les réponses ne changent jamais partition, portée, cellules ou paramètres figés.

Une cellule accepte exactement une liaison de service de transitions ; une
seconde liaison est refusée RamSessionAlreadyBound. Cette garde RAM technique
empêche deux ledgers/compteurs indépendants sur le même Current. Elle ne verrouille
pas une préparation ni le métier et ne remplace aucun CAS durable. Pour une
nouvelle session, réadmettre entièrement source/inventaire/ledger dans une nouvelle
cellule ; les anciens handles ne sont pas transférables.

Exécution synchrone exclusive : stale global avant lecture/validation des réponses,
validation Domain, changement effectif, allocation VersionIds, matérialisation
par createBusinessVersion, registre H+B via withVersions, manifeste/selection et
extraction S, **certifyPortfolioGraph réelle sur le candidat final exact**, swap.
Vue publiée unique immutable : CurrentSelection + VersionRegistry +
ValidatedPortfolioGraph concordants. Aucun await, notification ou simulation.
Ports de composition synchrones de confiance ; les tests tentent une réentrance
par l'allocateur et démontrent qu'aucune autre exécution ne s'interpose.

Applied/NoOp/Stale et erreurs internes terminent le dossier ; handles terminés
non rejouables. NoOp n'alloue aucune version, ne certifie aucun candidat et ne
publie rien. Révision candidate à compteur BigInt, namespace construit à partir
de la révision initiale : absence de réemploi/ABA dans la session, pas CAS durable.
Refus avant publication : ancienne vue intégralement conservée. Pas de rollback
métier. Les limites physiques d'exhaustion runtime ne sont pas une garantie
universelle de récupération.

## Commandes et sélectivité

| Commande livrée | Comportement |
| --- | --- |
| RenameProject | Project existing ; nom seulement, une Settings ou NoOp |
| ReorderProjects | Liste totale ProjectId inactive/deleted inclus ; PortfolioOrder seule ou NoOp |
| DeleteLifecycle | Project/Reservation/Team/PT/RT ; cascades PT/RT exactes, retrait sélections TA/PTEC, tombstones, capacité/AP/SP/TA archivés intacts ; positifs historiques autorisés |
| RestoreRoot | Settings explicitement revus, endpoints/catalogues cohérents, rang conservé ; aucune association restaurée |
| RestoreAssociation | PT/RT deleted, endpoints existing, paramètres explicites, grille courante entièrement confirmée ; zéro proposé, nonzero exclusivement explicite ; PT avec ETC/PTEC valides |
| CorrectActuals | Cellules de l'AP existing ; consommation ciblée, confirmation, revue ETC positive ciblée ; cellule identique NoOp |
| EditActualPartition | extend/reduce/adjust/split/merge explicitement discriminés ; partition inclusive contiguë, earliest, identités conservées sur ajustements, neuves sur split/merge ; aucune redistribution |
| CoverActualPeriod / EmptyActualPeriod | empty↔covered ; grille complète, confirmations de nouvelles cellules/retrait global, frontière ETC through/null |
| SetPTETC | PTEC seule ; zéro→positif confirmé, ETC précédent positif revu ; keep explicite peut conclure execute NoOp |
| DeleteUsedCatalog | Program/Pas utilisés ou inutilisés ; réaffectation/retrait explicite de tous owners existing, couleur Program explicite, Settings deleted inchangées, tombstone catalogue et Settings atomiques |

Les confirmations/revues ne sont jamais persistées dans des versions. Retrait TA :
globale unique zéros inclus ; Team toujours confirmée. Correction/bornes : cellules
et contextes affectés, mêmes valeurs comprises. Grille restaurée : couverture
complète par une obligation contenant chaque cellule et ses paramètres exacts.
ETC précédent zéro maintenu sans revue supplémentaire ; positif revu, jamais
recalculé depuis Actuals. Through identique : aucune version PTEC pour rebinding.

**B1** : historique TA/PTEC réintroduit par restore, même identité mais nouvelle
VersionId obligatoire, zéro→zéro et positif→zéro compris. Aucune ancienne ref
resélectionnée. Selected inchangé garde sa ref exacte ; objet neuf première version.
**B3** : selected modifié → predecessor courant exact ; historique → base désignée
présente et de la bonne identité/owner ; neuf → aucun predecessor. Branches sans
choix refusées, même une seule version ne devient jamais base implicite. Sources
split/merge distinctes, facultatives et inchangées comme provenance.

Toutes anciennes versions publiées restent dans H. Des Snapshots indépendants
conservent leurs refs et restent certifiables après correction/delete/restore.
Aucun ancien Current historisé automatiquement, aucun Snapshot créé/modifié.

## Gates et preuves exécutées

[Preuves, journaux et commandes](./proofs/r13/README.md).
Suite complète **282/282 PASS**, failure/cancel/skip/todo 0 ; ciblés R1.1 **51/51**,
R1.2 **155/155**, R1.3 **37/37** (réexécutions de tests inclus dans le total).
Frontières, typecheck et build PASS. Les @ts-expect-error sont réellement compilés.
Garde général et suites R1.1/R1.2/P0/P1/P2/A1/B conservés.

| Gate | Preuve réelle |
| --- | --- |
| G13-01 | Test Domain pur, entrées unknown/getters, canaris et audit hexagonal R12 étendus aux nouveaux modules, AST R13 |
| G13-02 | R7 prepares disjoints, Applied puis Stale avant réponses invalides, objets étrangers/terminés, réentrance, liaison unique de cellule empêchant ledgers concurrents/ABA, exclusivité RAM et AST sans await |
| G13-03 | ConfirmRemoval unique, zéros, Team sans cellule, wrong/missing/duplicate/unknown/decline, retry et réponse ETC remplacée |
| G13-04 | prepare NoOp et execute NoOp après keep ; vue/révision/ledger versions inchangés, dossier terminé |
| G13-05 | Sélectivité/nombres exacts, inventaire/ref absent, collisions H/VersionIds, réservations concurrentes et brûlées, transfert complet, IDs opaques et provenance |
| G13-06 | 5 cibles lifecycle, 3 cascades, positifs historiques, AP/SP/TA/Capacity/catalogues/Order préservés |
| G13-07 | PT/RT restore positif→zéro et zéro→zéro, PTEC identique nouveau, base historique ramifiée explicitement choisie, nonzero explicite, root sans associations |
| G13-08 | Correction 1/3→2/3, extension/réduction/bornes, split/merge provenance vide/explicite, empty↔covered, earliest/gap/foreign refusés, zéro association |
| G13-09 | Zéro maintien/positif confirmé, famille/négatif refusés, keep/remplacement, through inchangé sans PTEC, through/null alignés |
| G13-10 | Program ET Pas composite complet ; owner manquant refusé, inutilisé existing conservé |
| G13-11 | Refus/stale/incohérence intact, H ancien disponible, vues gelées, Snapshot autonome après Current divergent |
| G13-12 | Composition assemblage ptecs=[] ; vraie factory → CandidateCertificationFailure/PTEC_SELECTION_MISMATCH, zéro swap, VersionId brûlé ; AST vrai appel unique avant publish |
| G13-13 | Quatre commandes npm et suites ciblées réellement exécutées, aucune preuve historique modifiée |
| G13-14 | Voir rapport PERF-EDIT dédié : mesure/qualification distinctes de la conformité fonctionnelle |
| G13-15 | Diff/scope/diff-check et rollback isolé : preuves de livraison sous r13 ; audit indépendant et clôture restent requis |

Échecs de développement conservés : typecheck initial (corrélations TS/narrowing),
diagnostic BigInt dans tests, fixture incompatible avec le garde, inspection du
ledger gelant le tableau vivant. Corrections locales ; derniers gates réexécutés.
Aucun résultat de ces premières exécutions n'est annoncé PASS.

## PERF-EDIT — B4 et réserves

Le rapport séparé [PERF-EDIT](./proofs/r13/perf/report.md) fait autorité pour les
mesures, dispersion, source mesurée, croissance S/H, versions B et sous-phases.
Current déjà chargé/certifié, setup et réponse humaine exclus ; pas de LOAD,
simulation, UI ou durable dans EDIT. Timings officiels et instrumentation séparés.
Les premières campagnes interrompues avant gel final sont conservées à part et
ne qualifient pas la livraison. Aucun SLA arbitraire ni performance non mesurée.

Aucun gain architectural ni modification du registre autorisé par un hotspot.
Toute option future requiert plan, audit indépendant et GO distincts. P3-C reste
abandonné. L'acceptabilité interactive et les réserves mesurées sont à examiner
lors de l'audit ; ce canon ne crée aucun GO correctif ni passage à DONE.
