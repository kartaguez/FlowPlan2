# Lot 11A — Portfolio Snapshots & Forecast History Capture

**Status: READY FOR IMPLEMENTATION (plan uniquement).** Plan établi et révisé le 2026-10-07.
Cette passe ne réalise aucune implémentation, aucun test et aucune modification
de données métier. La visualisation de dérive est réservée à 11B.
**L'implémentation 11A ne doit pas commencer tant que 10C.2 n'a pas été audité
et fermé.** READY qualifie le plan, pas la fermeture de cette dépendance.

## Baseline et roadmap

Inspection initiale : branche `main`, HEAD
`843cb966b9cda0b13d1695f73aa005847e8fbb8a`, working tree propre,
remote `https://github.com/kartaguez/FlowPlan2.git`.
La baseline **validée** documentaire reste
`17094b03cbf4c34c8424d6fa1847e0ceebd55410` : le HEAD contient les correctifs
10C.2, toujours IN REVIEW. Cette passe ne vaut pas validation de 10C.2.

Documents examinés : `docs/canon.md`, `docs/current_canon.md`,
`docs/current_plan.md` et les documents de `docs/steps/ACTUALS/` :
`step_plan`, `step_canon`, `lot10b_plan`, `lot10c_plan`, `lot10c1_plan`,
`lot10c1_canon`, `lot10c2_plan`.
Révision : branche `codex/plan-lot11a-portfolio-snapshots`, HEAD de départ
`2d5695848035462bf6e4fc70754ec4d3bc6d5c94`. Le code inspecté est toujours celui
de `843cb966b9cda0b13d1695f73aa005847e8fbb8a` ; le commit de plan ne modifie
que la documentation.

**10D — superseded by 11A.** Son besoin historique était de capturer la
connaissance cross-object/Forecast manquante après 10C.1 : capacités Team,
working pattern, configuration Forecast et tous les objets à un même instant
(`current_plan.md`, section 10D ; `ACTUALS/lot10c1_plan.md`, frontière 10D/10E).
Les inputs complets de 11A couvrent ce besoin et les résultats Project figés
complètent la capture. Aucun besoin concret de capture 10D ne subsiste.
Le rejeu effectif relève de l'ancien 10E, pas d'un reliquat 10D.

**10E — largely superseded by 11B.** La dérive EAC/dates/priorité et sa
visualisation passent à 11B. Restent éventuellement, hors promesse 11B :
rejeu complet d'un état historique, navigation historique complète,
comparaison/reconstruction avancée (notamment détails capacité/surcharge
ou autres résultats quotidiens au-delà de la dérive Project). Ces capacités
ne sont ni implémentées ni promises par 11A ; elles exigent un scope ultérieur.
Superseded ne signifie pas DONE. 10C.2 reste IN REVIEW : 11A dépend directement
de son modèle snapshots Actuals final, des sources RAF, des dirty stores,
Apply/Cancel et mécanismes UI. Cette révision ne les valide pas.

## Sources vérifiées dans le code actuel

| Question | Source et constat au HEAD |
| --- | --- |
| État métier complet | `src/application/session/planningSession.ts` : `PlanningSessionState = {portfolio, planning}`, sans Portfolio Snapshots. |
| Inputs du moteur | `src/main/planning/buildPlanningSessionProjection.ts` construit horizon, reconstruction Actuals et `actualOccupation`, puis appelle `recomputePlanning`. `src/domain/planning/contracts.ts` définit `PlanningInput = {portfolio, horizon, workingPattern, maxParallelProjects, actualOccupation}`. Toutes les sources sont dans la session. |
| Sérialisation | `src/application/backup/flowplanBackupV1.ts` contient les codecs V1–V5 : enveloppe `format/version/exportedAt/data`, puis `data.planning` et `data.portfolio`. Capacités, exceptions et rationnels canoniques sont déjà sérialisés. |
| Priorité | `Portfolio.priorityOrder`, dans `src/domain/model/entities.ts`, contient exactement une fois chaque Project, actif ou inactif. `reorder-project` déplace cette liste. `priorityIndex` Timeline est zéro-based, commandes/badges 1-based. Program/Pas n'apportent aucune priorité concurrente. |
| Actuals courants | `src/domain/actuals/reconstruction.ts` sélectionne `snapshots.at(-1)` si présent, sinon `legacyV4Actuals ?? actuals`, sinon aucune source. L'activation ne filtre pas les Actuals. Ne jamais additionner les versions de l'historique. |
| RAF courant | `Project.requirements[].remainingWorkload`, interface effective du moteur. Pour V5, `createPortfolio` vérifie l'égalité avec `raf` du snapshot courant et son membership. `requirements.ts` protège les changements directs. Le legacy conserve sa provenance RAF. |
| Fin estimée | `src/adapters/timeline/buildTimelineViewModel.ts` : pour un Project actif, toutes ses `projectStates` doivent être complètes ; prendre le maximum des `projectedEndDate` définies. `engine.ts` produit une fin Team seulement après complétion avec dernière allocation. |
| Début estimé | Aucun `estimatedStartDate` existant. `buildPlanningSessionProjection.ts` publie déjà `actualsReconstruction` sans clipping horizon ; `reconstructActuals` fournit `ActualsDailyContribution.amount` par Project/date. Les allocations positives du résultat publié fournissent la partie Forecast. `earliestStartDate` reste une contrainte. |
| Réconciliation V4 | `snapshotActualsDraftStore.ts::fromModel` ne convertit pas le legacy en partition : sans V5, périodes vides. `parseSnapshotActualsCommand.ts` construit `reconcile` à partir des valeurs/confirmations utilisateur. `transition.ts` valide une partition fournie, ne la dérive pas du V4. `snapshots.ts` et `entities.ts` imposent des contraintes incompatibles avec certains V4 valides ; détail et choix ci-dessous. |
| Dirty cartes | `projectDraftStore.ts`, `reservationDraftStore.ts` et les deux instances Project/Reservation de `snapshotActualsDraftStore.ts`, possédés par `createTimelineUiCoordinator.ts`. `ids()`/`isDirty()` couvrent les cartes repliées. Actuals inclut RAF rapide et branche modale, avec ouverture initiale vierge non dirty. |
| Autres dirty | `createTeamEditController.ts` expose `hasUnappliedChanges`. Les trois contrôleurs Create ont un `isDirty` privé. `createPlanningSettingsController.ts` n'expose aucun dirty. Aucune garde globale n'existe. |
| Transaction | `createPlanningProjectionDispatcher.ts` : candidat → projection → encodage V5/écriture → publication par `PlanningSession.dispatch`. `freezeState` et beaucoup de commandes reconstruisent explicitement les deux champs ; ajouter une collection sans corriger ces chemins la perdrait. |
| Import/export | `src/main/planning/planningBackupOperations.ts`, `src/main/createPlanningDemoApplication.ts`, `src/infrastructure/backup/localPlanningBackup.ts`. Clé `flowplan.backup.v1` indépendante du payload. Import complet validé/projeté avant confirmation/écriture. Startup invalide : document conservé, erreur, démo en mémoire. |
| Identités/versions | Actuals : `snapshotId(kind, objectId, version)`, versions consécutives par objet, périodes stables si inchangées (`snapshots.ts`). Horloge injectée `today()`, actuellement date UTC. Générateurs Project/Reservation/Team : collisions évitées avec IDs courants, compteur réinitialisé au reload. Aucun identifiant moteur attaché aux résultats ; « Planning Engine V1 » du canon et package 0.1.0 ne suffisent pas. |

Tests de régression à réutiliser : `flowplanBackupV5.test.ts`,
`planningPersistenceTransaction.test.ts`, `lot10c1SnapshotProjection.test.ts`,
tests des stores/contrôleurs et `createTimelineUiCoordinator.multidraft.test.ts`.
Ils ne couvrent pas encore les nouveaux invariants 11A.

## Contrat et modèle normatif

Un Portfolio Snapshot sauvegarde explicitement **tout** le portefeuille
appliqué et les métriques Project du forecast réellement publié. Ni Apply
ordinaires, ni Actuals, ni changements de Projection date ne créent de Portfolio Snapshot.
Après création, seule la suppression entière est permise. Pas d'édition,
restauration, recalcul historique automatique ou navigation historique en 11A.

Ajouter `portfolioSnapshots: readonly PortfolioSnapshot[]` au niveau session,
à côté de `portfolio` et `planning`. Le Domain valide/freeze les constituants
et l'artefact ; l'Application assemble les inputs et résout les Actuals.
Le Domain n'importe ni `PlanningSessionState` ni un codec Application.
Les DTO d'entrée partagés restent à la frontière Application, avec validation
Domain des entités et du forecast.

| Partie distincte | Contenu |
| --- | --- |
| Identité | `snapshotId` opaque stable, générateur injecté (UUID par exemple), unicité contrôlée ; indépendant de l'index et de la date métier. |
| Instant | `createdAt` ISO UTC canonique au clic Save, horloge technique injectée. Date métier éventuelle dérivée, jamais saisie ni issue de Projection date. Affichage local avec précision suffisante. |
| Version des inputs | `inputsSchemaVersion`, version du contrat partagé, distincte de l'enveloppe globale. |
| Historical inputs | `planning` et `portfolio` complets sérialisables, sans récursion de Portfolio Snapshots ni duplication des historiques Actuals V5 ; sélection Actuals explicite par objet. |
| Références Actuals | Sélection `none` ou `snapshot` avec kind/objectId/snapshotId ; exception de migration `legacy-v4` strictement pour les objets pending dont la connaissance ne peut être transformée universellement sans perte/décision. Evidence exacte et justification ci-dessous ; une source exclusive par Project/Reservation, actifs et inactifs. |
| Historical forecast | Structure dédiée : `forecastSchemaVersion`, `engineVersion`, `projects[]` avec `projectId`, Actuals cumulés, RAF, EAC, `priorityPosition`, `estimatedStartDate`/motif et `estimatedEndDate`/motif. Valeurs exactes issues de la projection publiée. Aucun `PlanningResult` complet ni agrégat Forecast Reservation. |

Plusieurs captures d'inputs identiques sont autorisées : Save est volontaire,
pas un no-op fondé sur égalité. **L'identité est `snapshotId`, pas `createdAt`.**
Deux IDs différents peuvent avoir exactement `2026-10-07T10:00:00.123Z`.
Ne pas dédupliquer par jour ou timestamp, rejeter une collision temporelle,
inviter à réessayer ni ajouter artificiellement une milliseconde. Le recul de
l'horloge système entre captures est autorisé ; aucune monotonie imposée.
`createdAt` est lu à l'horloge au clic Save, canonique et persistant, indépendant
de Projection date et des Actuals knowledge dates. Ordre d'affichage
déterministe par `(createdAt, snapshotId)` avec sens constant et comparaison
lexicale des IDs. Seule une collision d'identité est une erreur d'intégrité.
Un échec ne publie aucune identité/date ni entrée de liste.

## Inputs historiques : une seule frontière de sérialisation

Extraire du codec existant des encodeurs/décodeurs typés partagés pour
PlanningSettings, Team/schedule, Project/requirements, Reservation/allocation,
Program et PriorityFamily, puis un payload d'entrée non récursif. Backup
courant et capture appellent ces mêmes fonctions. Ne pas imbriquer un backup
entier, sérialiser directement le Domain (BigInt), ni maintenir une seconde
liste manuelle de propriétés métier.

La seule variation explicite par objet est le mode « historique référencé »
au lieu du tableau complet `snapshots`. Réutiliser son DTO de configuration et
ses validateurs. Ajouter un test de parité capture/réhydratation sur un état
riche ; toute évolution des inputs doit mettre à jour version et test.
Une projection courante n'hydrate jamais les entrées historiques.

Le payload couvre exactement l'état actuel en amont de PlanningInput :

- planning : bornes inclusives, working weekdays, maxParallelProjects ;
- Teams : IDs, noms, tous les capacity periods, capacités exactes,
  unavailabilityRatio et exceptions, même hors horizon ;
- tous les Projects : IDs/noms/isActive, Program/Pas/couleur, contraintes
  earliestStart/objectiveEnd/mandatoryDeadline, requirements ordonnés,
  TeamId, RAF exact, dailyCap éventuel et information legacy nécessaire ;
- toutes les Reservations : IDs/noms/isActive, associations/couleur,
  bornes, allocations ratio/fixed-daily exactes, même sans Team ;
- référentiels Program/Pas alors existants, IDs/noms/couleurs,
  `priorityOrder` intégral inchangé ;
- sélection des sources Actuals et evidence legacy à cet instant.

Horizon est reconstruit par `createPlanningHorizon` ; occupation dérivée
par la reconstruction existante avec capacités/calendrier **historiques**.
Pas de persistance supplémentaire de contributions Actuals quotidiennes
calculées. Cursor, viewport, hover, onglets, cartes ouvertes et drafts sont
exclus : ils ne participent pas au moteur. Noms et couleurs restent capturés
pour permettre une future ancienne vue complète.

### Références Actuals, legacy et identités

Pour chaque objet V5, figer l'ID de `snapshots.at(-1)` **au Save**, jamais une
consigne « prendre le dernier à la lecture ». Résoudre le tuple
kind/objectId/snapshotId dans l'histoire partagée appartenant à l'objet.
Vérifier identité déterministe, version, unicité, coverage, exactitude,
participation, retired markers, RAF et Teams historiques. Un Project RAF-only
référence aussi son snapshot sans coverage.

Sans snapshot ni legacy : `none`, zéro Actuals simulé, mais connaissance
absente explicitement distinguée d'un zéro observé. Ni ID inventé ni snapshot
Actuals automatiquement créé.

### Décision V4 après inspection : exception de migration démontrée

La normalisation pure V5-compatible serait privilégiée si elle conservait
universellement la connaissance appliquée. **Ce prérequis n'est pas satisfait
par le modèle inspecté.** Il n'existe pas de fonction pure V4 → premier V5 à
extraire : `replaceProjectSnapshot`/`replaceReservationSnapshot` sont pures,
mais prennent un `current` complet et une `SnapshotEvidence` fournis par
l'appelant, pas une chronologie legacy. `reconcile` vérifie seulement l'absence
d'un snapshot précédent, puis impose les confirmations de transition.

Constats et contre-exemples précis :

- Les records V4 acceptent des Teams manquantes/intermittentes. La reconstruction
  canonique est déterministe : delta contre le dernier cumul connu de chaque
  Team, distribué seulement dans l'intervalle du record où elle réapparaît
  (`reconstruction.ts`, tests `main/planning/lot10a.test.ts`). On peut dériver
  purement ces deltas ; cela ne prouve pas que des cellules absentes étaient
  des zéros explicitement observés. V5 exige chaque Team participante sur toute
  la partition. Une réconciliation métier doit confirmer partition/cellules/RAF
  (`parseSnapshotActualsCommand.ts`, `transition.ts::validateTransition`).
- V4 autorise un historique positif d'une Team absente des requirements ou
  allocations actuels (`entities.ts`, validation legacy : existence Team seule).
  V5 impose que la dernière participation corresponde au membership courant,
  que son RAF ait exactement cette participation, et que les Teams retirées
  soient à zéro (`snapshots.ts`, `entities.ts`). Garder la Team positive
  modifierait le membership/RAF historique appliqué ; la retirer comme zéro
  perdrait ses Actuals. Réintégration ou rectification nécessite une décision
  utilisateur, interdite lors de Save Portfolio.
- V4 accepte `actualsThroughDate` future ; V5 exige
  `actualsThrough <= knowledgeDate`. Le test
  `application/backup/flowplanBackupV5.test.ts` « future-through V4 history
  remains lossless but cannot reconcile before its coverage date » en établit
  le refus. V4 ne contient pas de knowledge date d'origine : la fabriquer dans
  le futur pour contourner le validateur inventerait une connaissance. L'utilisateur
  doit attendre la date ou corriger la couverture avant une réconciliation V5.
- Une partition V5 seule ne conserve pas les records/provenances RAF legacy :
  V5 conserve déjà l'evidence en plus des snapshots après réconciliation.
  L'égalité Actuals/RAF/EAC seule ne serait donc pas une conversion lossless
  de tous les inputs, même pour un cas simple dont les deltas sont dérivables.

**Choix 11A :** conserver `legacy-v4(frozen evidence)` comme exception de
migration pour les objets encore pending, pas comme nouveau modèle d'écriture
Actuals. Copier exactement la chronologie et, pour Project, la provenance RAF
avec la configuration effective. Réutiliser les codecs legacy et la reconstruction
canonique ; ne créer ni snapshotId V5 fictif, ni knowledge date synthétique,
ni seconde formule de distribution. Aucun blocage Save imposant une
réconciliation et aucune conversion en `none`. Le courant reste legacy,
aucun snapshot V5 courant n'est ajouté. Même pour le sous-ensemble simple,
11A n'affirme pas une réconciliation automatique sans confirmation : un
adaptateur universel lossless n'est pas établi et une normalisation partielle
ne supprime pas l'exception indispensable. Les V5 natifs/réconciliés utilisent
exclusivement la référence canonique `snapshot` ; l'evidence V4 réconciliée
reste read-only dans les inputs, sans contribution additionnelle.

Cette alternative est arrêtée sur les incompatibilités ci-dessus ; aucune
nouvelle décision utilisateur n'est requise au Save. Une normalisation future
universelle demanderait un contrat métier audité, hors 11A, et ne réécrirait
jamais les captures existantes.

La réhydratation privée pour validation/rejeu prend la configuration
historique et, pour V5, le **préfixe** de l'histoire partagée jusqu'à l'ID
référencé, sans versions ultérieures. Les factories exigent des versions
consécutives depuis 1 et vérifient la dernière participation/RAF contre la
configuration : injecter seulement `[version N]` serait invalide. Le préfixe
est temporaire, non stocké en doublon ; cette validation n'appelle pas le
moteur. Le rejeu futur est distinct.

Project/Reservation avec histoire Actuals/legacy sont déjà non supprimables,
Teams historiques protégées. Garder ces protections et ajouter une garde
référentielle à toute future purge Actuals. Supprimer un Portfolio Snapshot
ne supprime **aucun** Actuals partagé, ne libère pas les protections et ne
fait aucun garbage collection implicite.

Les objets sans Actuals restent supprimables du planning courant : leurs
inputs historiques sont autonomes. Le pruning Program/Pas courant reste
local au Portfolio courant. Ne pas exiger qu'une entité historique sans
Actuals existe encore aujourd'hui. Réserver cependant les IDs présents dans
tous les inputs historiques dans les générateurs Project/Reservation/Team
et les ensembles Program/Pas dès le chargement et après transaction. Sinon
delete puis reload/create peut recycler une identité et fausser 11B. Tester
les cinq kinds. La garantie concerne les histoires conservées ; pas de
registre éternel des IDs après suppression de toutes leurs traces en 11A.

## Forecast figé et définitions Project

Save lit la projection **déjà publiée**, sans nouveau calcul moteur, et en
extrait uniquement le forecast Project dédié ci-dessous. Il conserve exactement
les valeurs métier publiées au clic, pas chaque détail interne du moteur.
**Les inputs historiques complets permettent un futur rejeu. Le forecast figé
conserve exactement les résultats métier dont on veut observer la dérive,
même si le moteur change ensuite.**

Ne pas persister Team day capacities, admissions, allocations quotidiennes,
Project plans, remaining unplanned workload, diagnostics, deadline statuses ou
fins Team. Ces éléments servent au calcul des synthèses au Save, puis restent
dans la projection courante jetable. Aucun résultat supplémentaire n'est
indispensable au contrat 11A/11B inspecté : les métriques Project et les inputs
complets couvrent la dérive et sa future analyse ; une ancienne vue quotidienne
exacte n'est pas promise. Aucun DOM, Geometry ou ViewModel persisté.
Prévoir un codec exact/versionné de cette seule structure et ses validateurs ;
ne jamais valider l'histoire par égalité au moteur courant.

| Métrique | Source et règle à capturer |
| --- | --- |
| Actuals cumulés | V5 : somme rationnelle de tous les `coverage.periods[].consumed` de la source sélectionnée, tous Teams, sans clipping horizon/cursor/activation. Sans coverage : zéro simulé avec connaissance explicite. Legacy pending : somme du dernier cumul connu **par Team**, pas seulement des lignes du dernier record (Teams intermittentes), cohérente avec la reconstruction complète. Aucune source : zéro simulé et statut `none`. |
| RAF | Somme exacte des `requirements[].remainingWorkload` historiques. V5 : égalité avec `raf` du snapshot référencé ; pending : provenance et configuration effectivement planifiée conservées. |
| EAC | Addition rationnelle unique Actuals + RAF, valeur exacte conservée avec validation de l'identité arithmétique. Ni progress au cursor ni charge limitée à l'horizon. |
| priorityPosition | Index dans `inputs.portfolio.priorityOrder` + 1, sans retirer les inactifs. Valider l'égalité sur chaque ligne. |
| estimatedEndDate | Règle globale existante de `buildTimelineViewModel` : Project actif, toutes ses exigences complètes, maximum des fins Team définies. Extraire un helper sémantique partagé entre Timeline et synthèse historique. |
| estimatedStartDate | Première activité effective du Project entier : minimum entre première `ActualsDailyContribution` Project strictement positive et première allocation Forecast Project strictement positive, toutes Teams. Helper pur partagé ; utiliser les contributions canoniques déjà publiées, jamais une nouvelle distribution. Sans les deux, date absente. |

`earliestStartDate` = contrainte métier ; `actualsFrom` = borne de période
Actuals ; `estimatedStartDate` = première activité effective connue/prévue.
Ne remplacer cette dernière ni par une borne, ni par une admission sans charge.
Le helper filtre `sourceKind = project`, `sourceId = projectId`, `amount > 0`
dans `actualsReconstruction.contributions`, **sans clipping horizon/cursor**,
et `workload > 0` dans les allocations publiées. Prendre le minimum des deux
ensembles ; zéro explicite/partition présente ne constitue pas une activité.
Un Project inactif avec Actuals positifs a donc un début présent ; activation
ne filtre pas les Actuals. Sans activité des deux kinds : début `null`, motif
`no-activity`, que le Project soit actif ou inactif. Pas de motif `inactive`
pour le début dès lors qu'une activité historique existe.

Fin : Project inactif → `null`/`inactive`. Actif dont au moins une exigence
Team n'est pas complète dans l'horizon → `null`/`incomplete-within-horizon`,
même si une autre Team finit. Toutes complètes et au moins une fin Team définie
→ maximum de ces fins. Toutes complètes mais aucune fin Team (notamment RAF
entièrement zéro ou zéro requirement) → `null`/`no-allocation`. Des Actuals
positifs peuvent alors donner un début, sans inventer de fin. Ne pas extrapoler
hors horizon depuis le deadline lookahead. Extraire cette règle de Timeline
vers **un seul helper sémantique** consommé par Timeline et capture ; aucune
formule concurrente. Dates présentes : motif `null` ; dates absentes : motif
obligatoire, champs explicitement sérialisés.

Extraire/réutiliser aussi un projecteur de totaux exacts partagé avec le read
model Actuals si nécessaire ; aucune formule concurrente dans l'UI et aucune
duplication de la sélection de source. Le calcul initial des synthèses est
pur sur le run publié ; après Save, elles sont uniquement lues, jamais dérivées
à nouveau lors d'un import, d'un changement moteur ou d'une lecture historique.

Introduire un identifiant explicite minimal de contrat moteur (par exemple
`planning-engine-v1/actuals-aware/1`), incrémenté quand un changement peut
modifier les résultats, et `forecastSchemaVersion = 1` initial. Versions
moteur, inputs et forecast ont des rôles distincts. Pas de registre de moteurs
historiques ni SHA injecté dans le build en 11A. Une autre version moteur
n'empêche pas la lecture du résultat enregistré ; schéma inconnu rejeté.
Un futur rejeu avec un moteur disponible n'écrase jamais ce forecast.

## Dirty global et transaction de capture

Introduire un agrégateur UI fondé sur les propriétaires des drafts, jamais
sur les bordures ou les seuls champs visibles :

1. Parcourir tous les IDs des quatre stores Forecast/Actuals et leurs
   `isDirty`, y compris cartes fermées/autres onglets, RAF rapide, branche
   modale et handoff Forecast → Actuals non appliqué.
2. Inclure `TeamEditController.hasUnappliedChanges` et exposer les dirty privés
   des trois Create : Project, Reservation, Team.
3. Ajouter un dirty explicite à Planning Settings, comparé au modèle publié :
   bornes, weekdays, parallélisme, saisies invalides.
4. Notifier après input/change, ajout/retrait de ligne, membership, opérations
   de partition, Apply réussi, Cancel, rebase, ouverture/fermeture et remount.
   Garder les baselines/égalités exactes existantes ; ouverture vierge seule
   ne signifie pas dirty.

Ne pas confondre erreur/stale, modal ouverte, sélection de zone et différence
métier. Un handoff avec membership cible différent est dirty même avant
saisie de consommés ; une confirmation n'est pas Apply. Une modal peut
rendre Save inaccessible par modalité indépendamment du dirty. L'arrondi
d'affichage d'une quantité exacte inchangée ne crée pas de dirty.

Save est disabled avec explication courte si dirty global. Refaire la garde
dans le handler au clic et dans le point d'entrée Application/Main de capture
via une fonction de précondition UI injectée, vérifiée immédiatement (ou
contexte synchrone équivalent). Pas de booléen persisté ni confiance dans un
disabled antérieur. Le Domain n'importe pas les stores UI ; la commande
interne Save n'est pas exposée dans un dispatch générique contournant ce service.

Séquence dédiée dans le dispatcher, sans async entre garde et capture :

1. Lire ensemble état appliqué et projection publiée. Conserver la référence
   d'état ayant construit la projection ou une révision d'inputs ; vérifier
   leur correspondance et le dirty, lire l'horloge au clic. Aucun input lu
   depuis les champs de formulaires.
2. Capture par codec commun, sélection Actuals exclusive (exception legacy
   documentée), extraction/freeze des seules synthèses Project depuis le run
   publié par helpers partagés ; valider candidat et références.
3. Construire l'état session candidat, écrire **tout V6** par le beforeCommit
   transactionnel, publier seulement après succès. Échec : ancien état,
   projection, document et drafts inchangés.
4. Save/Delete ne changent aucun input moteur : réutiliser la projection et
   rafraîchir seulement la liste, préserver focus, drafts, cursor, viewport,
   tabs et cartes. Mettre à jour la référence d'état associée à la projection
   pour la prochaine capture.

Commandes ordinaires : projection avant écriture comme aujourd'hui. Corriger
tous les chemins `freezeState({portfolio, planning})` pour préserver l'histoire.
Delete valide l'ID, retire une entrée, persiste avant publication, sans cascade
ni recalcul ; erreur garde la liste. Toute mutation profonde est interdite.

## V6, migration et export/import auto-suffisant

**Choix argumenté : nouvelle version V6.** Les décodeurs V5 rejettent les
champs inconnus de `data`/objets et n'acceptent que les versions 1–5. Étendre
V5 ferait varier son contrat strict sans signaler le nouveau besoin ; les
lecteurs anciens ne comprendraient pas l'histoire. V6 rend ce refus explicite.
Garder les lecteurs V1–V5 : collection `portfolioSnapshots: []` à migration,
sans capture rétroactive ni forecast inventé. Pas de réconciliation V4 implicite.

V6 conserve le Portfolio courant et ses **historiques Actuals complets** une
seule fois, dans leurs propriétaires. `data.portfolioSnapshots` obligatoire,
même vide, contient les inputs référencés et forecasts de toutes les captures.
Les références ne dépendent ni d'ancien localStorage ni d'autre fichier.
Les propriétaires Actuals sont maintenus par les protections existantes ;
une future suppression exige d'abord un dépôt partagé durable.

Dispatcher, export, import, startup et composition passent à V6 en gardant
la clé locale. Tous les encodeurs V1–V5 doivent **refuser** un état avec
Portfolio Snapshots, même un appel direct à V5 : aucun downgrade silencieux.
Conserver les protections Actuals V5 et l'evidence V4 lossless.

Import atomique :

1. Enveloppe/date/version, état courant et historiques Actuals via factories
   existantes et migrations documentées.
2. Chaque capture : `snapshotId` canonique/unique, `createdAt` canonique,
   timestamps égaux ou décroissants autorisés, schémas connus ; tuple Actuals
   résolu sans substitution par une version courante. Ne pas imposer de lien
   chronologique entre `createdAt`, knowledge dates et `exportedAt` : une horloge
   technique peut reculer. Les contraintes métier V5 internes
   (`actualsThrough <= knowledgeDate`, versions/knowledge dates de l'histoire)
   restent validées. Les règles des readers V1–V5 restent inchangées ; V6 doit
   pouvoir réimporter son propre export malgré un recul de l'horloge.
3. Réhydrater inputs avec préfixes sélectionnés/evidence figée ; valider
   associations, Teams, participation/RAF et priorité dans ce **Portfolio
   historique**, pas par membership courant.
4. Valider le forecast minimal stocké : versions, une ligne par Project
   historique, IDs, rationnels exacts/non négatifs, position/EAC cohérents,
   dates civiles et cohérence présence/motif. Les totaux Actuals/RAF sont
   contrôlables contre les sources/inputs exacts via les helpers partagés.
   Ne pas stocker allocations/fins Team pour revérifier les dates et ne pas
   tenter de les prouver contre le moteur courant : la preuve sémantique est
   dans les tests de capture. **Aucun** appel moteur pour reconstruire,
   recalculer ou remplacer un forecast historique lors de l'import.
5. Preflight de la seule projection courante, confirmation existante,
   écriture complète puis reload. Toute erreur rejette l'import entier,
   préserve l'ancien document et rapporte un chemin fautif.

Le codec courant répare certaines couleurs/associations et filtre les
catalogues orphelins. Le mode historique doit être **strict** : ni réparation,
filter, deduplication ni normalisation destructive. Une capture/référence/
ligne inconnue ou incomplète fait échouer le document entier. Les migrations
des anciennes enveloppes restent leurs règles séparées.

Au startup, une histoire V6 invalide conserve le document et montre l'erreur
selon le mécanisme existant ; ne pas charger/réécrire seulement le planning
courant amputé. Le fallback ne doit provoquer aucune écriture automatique.

## UX minimale et exclusions

En-tête Planning près de Settings : **Save portfolio snapshot** et accès à
une liste simple, date/heure locale au minimum (secondes/millisecondes si
nécessaires), ordre déterministe createdAt puis ID, Delete accessible avec
confirmation ciblée. Succès visible ; erreur dirty/intégrité/quota conserve
planning et liste. Pas d'édition ou restauration.

Exclus de 11A : graphes EAC/fin/priorité, comparaison graphique, attribution
causale (EAC, priorité, capacity, Reservations, autres Projects), navigation
complète dans un portefeuille historique, restauration et moteur historique
sélectionnable. Pas de métriques dérivées propres aux Reservations ; leurs
effets sont présents dans les métriques Project publiées et leurs inputs sont conservés.

## Séquence d'implémentation et gates

1. **Gate préalable impérative.** Auditer et fermer 10C.2 séparément **avant
   tout code 11A** ; cette passe ne le valide pas. Ensuite spécifier les DTO
   inputs/forecast minimal et fixtures riches selon les décisions normatives
   de ce plan ; aucune décision métier ouverte à trancher en 11A.
2. **Codec commun.** Extraire codecs de `application/backup/flowplanBackupV1.ts`
   vers modules dédiés voisins, sans changer V1–V5 ; mode référencé strict et
   réhydratation privée. Gate : parité riche et migrations existantes.
3. **Artefact immutable.** Types/factories dans un module
   `domain/portfolioSnapshots/`, assemblage/résolution dans Application,
   deep-copy/freeze complet, horloge/générateur injectés. Gate : sources
   exclusives, intégrité V5/legacy, aucun appel moteur.
4. **Forecast/Project.** Helper sémantique partagé dans adapters (ou projecteur
   pur conforme aux dépendances) utilisé par `buildTimelineViewModel.ts` et
   capture orchestrée par Main. Codec exact des métriques Project et version
   moteur ; début via reconstruction Actuals canonique + allocations positives.
   Gate : mêmes fins Timeline, début Project entier, absences et aucune formule UI.
5. **Session/transactions.** `planningSession.ts` : collection conservée dans
   toutes commandes, IDs historiques réservés. Dispatcher : Save/Delete
   sans recalcul. Gate : échecs atomiques, pas de perte sur commande ordinaire.
6. **V6.** Codec, backup operations, composition/export/startup/import,
   lecteurs anciens conservés et downgrade protégé. Gate : import vierge et
   round-trip complets, broken refs refusées, zéro perte.
7. **Dirty/UI.** Interfaces des contrôleurs, notifications/agrégateur dans
   coordinator, guard du service, contrôles `renderApp.ts` et contrôleur
   `ui/portfolio-snapshots/`. Gate : toutes surfaces, drafts invisibles,
   Apply/Cancel/remount, clavier et écran étroit.
8. **Canon/clôture.** Actualiser `canon.md` (explicite, immutable, suppression,
   same-day, clean-only, portefeuille complet, références Actuals, forecast
   figé, export/import et frontière 11B), `current_canon.md`, canon dédié 11A
   et roadmap. Formaliser l'artefact historique distinct des projections
   jetables et l'exception Save/Delete sans recompute. Reporter 10D superseded
   by 11A et 10E largely superseded by 11B avec son scope résiduel explicite.
   IN REVIEW seulement après implémentation cohérente ; baseline validée
   seulement après validation humaine. Cette passe modifie uniquement ce plan
   et la roadmap correspondante dans `current_plan.md`.

## Matrice de tests attendue

| Axe | Cas et assertions minimales |
| --- | --- |
| Création/date | Save explicite vide/riche ; répétition des mêmes inputs autorisée ; plusieurs captures le même jour ; deux IDs différents avec `createdAt` exactement égal autorisés ; tri `(createdAt, snapshotId)` déterministe ; horloge reculée acceptée, y compris round-trip V6 avec exportedAt antérieur à createdAt/knowledgeDate ; aucune milliseconde artificielle ni invitation à réessayer pour le temps ; ID dupliqué refusé ; indépendance cursor/Actuals ; aucune capture automatique. |
| Dirty | Forecast des deux kinds, RAF rapide, Actuals modal/handoff, Team nom/periods, trois Create, Settings ; invalides, cartes fermées/autres tabs ; service appelé directement bloqué ; ouverture vierge non dirty ; Apply nettoie seulement sa carte ; Cancel/rebase/remount actualisent disabled. |
| Inputs | Tous actifs/inactifs, exceptions/capacités hors horizon, fractions/dailyCap caché, ratio/fixed, Reservation zéro Team, référentiels/couleurs/contraintes/calendar/horizon/parallélisme ; réhydratation égale aux inputs et priorité complète. |
| Actuals | none vs RAF-only vs covered zéro ; ID courant au Save ; référence ancienne après rectification/membership ; préfixe valide ; mauvais kind/owner/ID/version/Team/RAF refusé ; legacy intermittent/pending/reconciled sans double comptage ; Save ne crée aucun V5. |
| Forecast minimal | Valeurs Project du run publié capturées exactement ; tiers rationnels, Actuals hors horizon/inactifs, RAF/EAC exacts, position 1-based ; codec exclut capacities/admissions/allocations/plans/diagnostics/remaining unplanned ; aucun agrégat Reservation spécifique. |
| estimatedStartDate | Actuals positifs + Forecast : première contribution Actuals positive quand antérieure (et minimum si Forecast antérieur) ; partitions toutes zéro + Forecast : première allocation positive ; aucun Actuals + Forecast : première allocation positive ; Actuals positifs sans Forecast : première contribution positive ; aucune activité : `null`/`no-activity` ; `earliestStartDate` antérieure/postérieure et `actualsFrom` ne remplacent jamais une activité. Tester inactif avec Actuals positifs, hors horizon, multi-Team et allocations zéro ignorées. Une contrainte peut modifier le Forecast lui-même ; la règle de minimum reste identique. |
| estimatedEndDate | Parité avec Timeline via helper unique : actif et toutes exigences complètes → max des fins définies ; inactif/incomplet → absence explicite ; RAF zéro/zéro requirement sans fin → `no-allocation` ; une Team incomplète interdit la fin globale même si une autre finit. |
| V4 historique | Deltas déterministes via reconstruction canonique, Teams intermittentes/absentes et positives hors membership, future-through ; Actuals/RAF/EAC identiques avant/après capture et round-trip V6, evidence/provenance lossless ; aucune mutation du Project/Reservation courant ni ajout V5 au Save ; aucun ID/knowledge date inventé ; V5 réconcilié reste source exclusive. Pas de prétendu test de conversion V5 universelle : elle est impossible dans les cas documentés. |
| Immutabilité | Mutation des arrays/configurations sources sans effet ; edit profond rejeté ; anciennes captures inchangées après tous types de commandes, rectifications Actuals et nouveaux Saves. |
| Suppression/identité | Une capture retirée, Actuals partagés/projection conservés ; unknown ID/write failure sans effet ; objet sans Actuals supprimable avec copie historique intacte ; IDs réservés delete/reload/import pour cinq kinds ; guards Actuals/Team inchangés. |
| Transaction | Save/Delete zéro recompute (spies), état/projection du même run, mismatch refusé ; quota failure préserve document/état/liste/drafts ; mutations ordinaires conservent histoire avec une projection. |
| Export/import | V6 exact round-trip multi-captures/refs partagées vers stockage vierge ; V1–V5 migrent à collection vide avec legacy intact ; downgrade refusé ; champs/schémas inconnus, dates non canoniques, missing refs, IDs dupliqués (timestamps égaux valides), incohérences métier V5, rationnels non canoniques et catalogue historique orphelin rejettent tout. |
| Zéro perte silencieuse | Une référence/capture invalide au milieu rejette tout ; aucune réparation/filter historique ; mauvais startup reste stocké/signalé, fallback sans write automatique ; failed/cancelled import préserve état ; anciens encodeurs ne retirent jamais l'histoire. |
| Indépendance | Modifier priorité, RAF/Actuals, capacity/calendar, concurrence, activation, contraintes/bornes laisse inputs/forecast historiques identiques ; injecter un moteur produisant un autre résultat : changement explicite de `engineVersion` conserve toutes les valeurs stockées ; lecture/import n'appellent pas ce moteur pour reconstruire l'histoire, preflight courant peut diverger sans toucher aux captures. |
| UX | Save/liste/Delete, disabled expliqué, erreur non destructive, dates locales précises, ordre déterministe, clavier/focus et desktop/390 px sans overflow ; cursor/viewport/drafts préservés. |

Après implémentation : `npm run typecheck`, `npm test`, `npm run build`,
régression réelle backup/mandatory et review visuelle desktop/étroite.
Pour cette passe documentaire : inspection du plan entier puis des sources,
contrôle des liens/diff et absence de code, tests ou données modifiés ; aucun
build ni test exécuté ; commit/push des deux documents seulement.
Slices de vérification : documentation 11A/roadmap et lecture ciblée FlowPlan2,
aucune slice Maven Pocoma applicable, aucun franchissement de slice, gate
architecture globale non requise, full reactor non exécuté (aucun code changé).

## Décisions closes et condition de lancement

Aucune décision métier ouverte dans ce plan : forecast Project exact/minimal,
début Project entier, fin canonique Timeline, identité par snapshotId et temps
non unique sont normatifs. L'exception V4 est motivée par les incompatibilités
constatées ; elle conserve la connaissance sans imposer de décision au Save.
10D est superseded by 11A sans reliquat concret ; 10E est largely superseded
by 11B avec les capacités avancées explicitement différées.

**11A PLAN: READY FOR IMPLEMENTATION.** Ce verdict documentaire ne constitue
ni autorisation de démarrer le code maintenant, ni audit/fermeture de 10C.2.
**L'implémentation 11A ne doit pas commencer tant que 10C.2 n'a pas été audité
et fermé** : dépendances directes modèle Actuals final, sources RAF, dirty
stores, Apply/Cancel et mécanismes UI. 10C.2 reste IN REVIEW et la baseline
validée ne change pas.

Perte potentielle par `freezeState`, dirty dispersé, réparations du codec,
recyclage d'IDs et extraction des helpers sont des travaux techniques
identifiés. Documenter la frontière forecast historique/projection jetable
et Save/Delete sans recompute pendant l'implémentation. Aucun de ces travaux
n'est réalisé ou déclaré validé dans cette révision documentaire.

## Implementation record — 2026-10-08

The normative READY plan above is retained unchanged. The user closed 10C.2
before authorizing this implementation. The implementation follows validated
revision `da79f2c243bcba487f68c8ee441fe6efe1e65514` on
`codex/lot11a-portfolio-snapshots`; its current contract and verification are
recorded in [lot11a_canon](./lot11a_canon.md). Typecheck, **696/696 tests (87
suites)**, build and **119/119 targeted regression tests** pass. Edge visual
review completed at 1440 px and 390 px, including Save/liste/Delete, dirty,
keyboard/focus and equal document/viewport widths. No 11B work is included.

**11A IMPLEMENTATION: IN REVIEW.** Human audit is still required before DONE.
