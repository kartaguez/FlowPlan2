# FlowPlan2 V2 — registre vivant des extractions

État de clôture R0 : **toutes les opérations NOT STARTED**. Aucun code extrait.
Point d'entrée : [current_plan](../../current_plan.md).
Classification initiale validée à `62bfdb9f36b406a0196ba7ceee45884217c68365` ;
cette baseline d'inventaire n'est pas un SHA d'extraction effectuée.

Ce registre suit les opérations R0.1–R6 et reprend la classification de la
[matrice R0 §4](./rewrite_r0_plan.md#4-audit-et-matrice-de-reprise), qui conserve
responsabilités, dépendances, risques et points d'appui tests. Les groupes mixtes
sont séparés par périmètre ; aucune reclassification ou nouvelle décision métier.
**REUSE autorise l'étude et l'extraction contrôlée ; jamais copie massive ou
merge automatique de l'ancienne architecture.** Classé REUSE ≠ déjà réutilisé.
REFERENCE = étudier puis réimplémenter ; DROP = retirer du produit V2, pas effacer
la branche de référence. Une référence à un test ancien n'atteste aucun PASS V2.

À chaque opération : identifier symboles/périmètre, SHA source exact, destination
V2, dépendances supprimées, contrats détaillés, preuves exécutées et décision
d'audit. Si plusieurs extractions/versions, ajouter une ligne liée sans écraser
leur provenance. En cas de changement de classe, documenter motif et audit dans
le lot, garder la classe initiale. Statuts futurs doivent refléter la réalité
(étudié/en cours/extrait/validé/refusé/abandonné) ; ne jamais anticiper l'audit.
Le détail des contrats appartient au dossier normatif/canon V2, pas à ce tableau.

Les champs « — » restent à renseigner lors de l'opération ; le lot destinataire
est une proposition de séquencement, pas une autorisation. Tests/preuves ci-dessous
sont **à établir**, leurs points d'appui existants sont dans la matrice R0 §4.

| Composant / périmètre | Source ancienne (racine dépôt) | Classe initiale | Lot destinataire | Statut opération | SHA source effectif | Destination V2 | Contrats concernés | Tests/preuves V2 | Décision d'audit extraction |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Primitives exactes | src/domain/model/rational.ts , src/domain/model/date.ts , src/domain/model/color.ts , src/domain/model/horizon.ts | REUSE | R1 | NOT STARTED | — | — | T01–T02 ; exactitude ; [R0](./rewrite_r0_plan.md) | À établir ; points d’appui R0 §4 | NON SOUMISE |
| Entités inline | src/domain/model/entities.ts | REFERENCE | R1 | NOT STARTED | — | — | T01–T04 ; I01–I08 ; [R0](./rewrite_r0_plan.md) | À établir ; points d’appui R0 §4 | NON SOUMISE |
| Scalars/brands | src/domain/model/scalars.ts | ADAPT | R1 | NOT STARTED | — | — | Quantités exactes ; [R0](./rewrite_r0_plan.md) | À établir ; points d’appui R0 §4 | NON SOUMISE |
| Calendriers/capacités | src/domain/capacity/schedule.ts , src/domain/capacity/calculations.ts | ADAPT | R1/R3 | NOT STARTED | — | — | I10/I20 ; ratio ouvert R3 ; [R0](./rewrite_r0_plan.md) | À établir ; points d’appui R0 §4 | NON SOUMISE |
| Reservations ratio/fixed | src/domain/capacity/reservation.ts | ADAPT | R3 | NOT STARTED | — | — | I09–I10 ; RT ; [R0](./rewrite_r0_plan.md) | À établir ; points d’appui R0 §4 | NON SOUMISE |
| Allocation/Mandatory/diagnostics | src/domain/planning/engine.ts , src/domain/planning/contracts.ts | ADAPT | R1/R3 | NOT STARTED | — | — | T02/T08 ; I08/I10/I20 ; [R0](./rewrite_r0_plan.md) | À établir ; points d’appui R0 §4 | NON SOUMISE |
| Dates estimées | src/domain/planning/projectEstimatedDates.ts | ADAPT | R3 | NOT STARTED | — | — | Complétion run ≠ PTEC ; [R0](./rewrite_r0_plan.md) | À établir ; points d’appui R0 §4 | NON SOUMISE |
| Distribution Actuals/bornes | src/domain/actuals/reconstruction.ts , src/domain/actuals/projectActualsKnowledge.ts | ADAPT | R3 | NOT STARTED | — | — | I10/I19/I20 ; [R0](./rewrite_r0_plan.md) | À établir ; points d’appui R0 §4 | NON SOUMISE |
| Histoires/proofs Actuals | src/domain/actuals/snapshots.ts , src/domain/actuals/transition.ts , src/domain/actuals/records.ts , src/domain/actuals/requirements.ts | REFERENCE | R1/R4 | NOT STARTED | — | — | T03/T10/T11/T13 ; I01–I08 ; [R0](./rewrite_r0_plan.md) | À établir ; points d’appui R0 §4 | NON SOUMISE |
| Agrégations | src/adapters/metrics/cursorMetrics.ts (dont progression Reservation) | ADAPT | R3/R5 | NOT STARTED | — | — | I09/I10/I11 ; sommes exactes ; [R0](./rewrite_r0_plan.md) | À établir ; points d’appui R0 §4 | NON SOUMISE |
| Commandes/session/catalogues | src/application/session/planningSession.ts , src/application/session/projectCurrentRaf.ts , src/application/session/resolveGrouping.ts | REFERENCE | R4 | NOT STARTED | — | — | T05–T08/T15 ; I12–I18/I21 ; [R0](./rewrite_r0_plan.md) | À établir ; points d’appui R0 §4 | NON SOUMISE |
| Saisie/formatage exact | src/application/session/editableQuantity.ts , src/application/session/formatActualsQuantity.ts , src/application/session/exactPercentage.ts | REUSE | R5 | NOT STARTED | — | — | Exactitude Apply intact ; [R0](./rewrite_r0_plan.md) | À établir ; points d’appui R0 §4 | NON SOUMISE |
| ViewModels éditeurs | src/application/session/*ViewModel.ts | ADAPT | R4/R5 | NOT STARTED | — | — | Bases refs et proofs ; [R0](./rewrite_r0_plan.md) | À établir ; points d’appui R0 §4 | NON SOUMISE |
| Orchestration/projection | src/main/planning/createRepositoryPlanningDispatcher.ts , src/main/planning/buildPlanningSessionProjection.ts ; src/application/planning/recomputePlanning.ts | REFERENCE | R3/R4 | NOT STARTED | — | — | I19/I21 ; prepare/persist/publish ; [R0](./rewrite_r0_plan.md) | À établir ; points d’appui R0 §4 | NON SOUMISE |
| Contrôleurs/drafts visuels | src/ui/project-edit/ , src/ui/reservation-edit/ , src/ui/actuals/ , src/ui/planning-settings/ , src/ui/team-edit/ | ADAPT | R4/R5 | NOT STARTED | — | — | Apply/Cancel ; T10/T11 ; [R0](./rewrite_r0_plan.md) | À établir ; points d’appui R0 §4 | NON SOUMISE |
| Stores Actuals structurels | src/ui/actuals/snapshotActualsDraftStore.ts | REFERENCE | R4/R5 | NOT STARTED | — | — | AP/TA/PTEC et proofs par refs ; [R0](./rewrite_r0_plan.md) | À établir ; points d’appui R0 §4 | NON SOUMISE |
| Ports/repository natif | src/application/persistence/planningRepository.ts , src/application/persistence/createPlanningRepository.ts , src/application/persistence/repositoryStorage.ts | REFERENCE | R2/R4 | NOT STARTED | — | — | I19/I21/I22-R ; [R0](./rewrite_r0_plan.md) | À établir ; points d’appui R0 §4 | NON SOUMISE |
| Mécanismes CAS/receipt seuls | src/application/persistence/createPlanningRepository.ts | ADAPT | R2/R4 | NOT STARTED | — | — | I21 ; unknown/recovery ; [R0](./rewrite_r0_plan.md) | À établir ; points d’appui R0 §4 | NON SOUMISE |
| Transactions/hash/memory | src/infrastructure/persistence/indexedDbRepositoryStorage.ts , src/infrastructure/persistence/memoryRepositoryStorage.ts , src/infrastructure/persistence/fingerprint.ts | ADAPT | R2 | NOT STARTED | — | — | I21/I22-R ; namespace natif ; [R0](./rewrite_r0_plan.md) | À établir ; points d’appui R0 §4 | NON SOUMISE |
| Workers/transport | src/infrastructure/persistence/planningStorageWorker.ts , src/infrastructure/persistence/snapshotValidationWorker.ts | ADAPT | R2/R3/R6 | NOT STARTED | — | — | I19/I21 ; DTO exacts/epochs ; [R0](./rewrite_r0_plan.md) | À établir ; points d’appui R0 §4 | NON SOUMISE |
| Lecteurs/coordinator History | src/application/history/repositoryHistoryReader.ts , src/application/history/historyCaptureProjection.ts ; src/ui/history/createProjectHistoryCoordinator.ts | REFERENCE | R6 | NOT STARTED | — | — | I19/I20/I23 ; inputs-only ; [R0](./rewrite_r0_plan.md) | À établir ; points d’appui R0 §4 | NON SOUMISE |
| Cache/scratch History | src/ui/history/createProjectHistoryCache.ts ; src/infrastructure/persistence/indexedDbHistoryScratch.ts | ADAPT | R5/R6 | NOT STARTED | — | — | Budget/release/isolation ; [R0](./rewrite_r0_plan.md) | À établir ; points d’appui R0 §4 | NON SOUMISE |
| Lifecycle listeners | src/ui/interactionLifecycle.ts | REUSE | R5/R6 | NOT STARTED | — | — | Lifecycle sans autorité métier ; [R0](./rewrite_r0_plan.md) | À établir ; points d’appui R0 §4 | NON SOUMISE |
| Protocole import/export/recovery | src/application/backup/portableBackupParts.ts ; src/application/persistence/repositoryTransfer.ts ; src/main/planning/planningBackupOperations.ts | REFERENCE | R2 | NOT STARTED | — | — | I21/I22-R ; format neuf ; [R0](./rewrite_r0_plan.md) | À établir ; points d’appui R0 §4 | NON SOUMISE |
| Convertisseurs/repair legacy | src/application/backup/flowplanBackupV*.ts , src/application/backup/planningInputCodec.ts ; src/adapters/flowplan1/ ; src/infrastructure/flowplan1/ ; src/infrastructure/backup/localPlanningBackup.ts ; src/application/persistence/repositoryTransfer.ts (repair legacy) | DROP | R0.1/R2 | NOT STARTED | — | — | T12-R ; [R0](./rewrite_r0_plan.md) | À établir ; points d’appui R0 §4 | NON SOUMISE |
| Capture/identités/validation | src/domain/portfolioSnapshots/ ; src/application/portfolioSnapshots/ | REFERENCE | R2/R4 | NOT STARTED | — | — | T04/T09 ; I19/I23 ; [R0](./rewrite_r0_plan.md) | À établir ; points d’appui R0 §4 | NON SOUMISE |
| Résultats/profils capturés et préfixes via Current | src/domain/portfolioSnapshots/ ; src/application/portfolioSnapshots/ | DROP | R2/R4 | NOT STARTED | — | — | T04/T12-R ; I19 ; [R0](./rewrite_r0_plan.md) | À établir ; points d’appui R0 §4 | NON SOUMISE |
| Oracles replay G1 | src/proof/lot11d2/ | ADAPT | R1/R3/R6 | NOT STARTED | — | — | I19/I20 ; fixtures natives neuves ; [R0](./rewrite_r0_plan.md) | À établir ; points d’appui R0 §4 | NON SOUMISE |
| Cartes/styles/Portfolio | src/ui/renderApp.ts ; src/ui/portfolio/ ; public/styles.css | ADAPT | R5 | NOT STARTED | — | — | Continuité visuelle ; T06–T08 ; [R0](./rewrite_r0_plan.md) | À établir ; points d’appui R0 §4 | NON SOUMISE |
| Structure shell/coordinator | src/ui/renderApp.ts ; src/ui/timeline/createTimelineUiCoordinator.ts | REFERENCE | R5 | NOT STARTED | — | — | Frontières Application/UI ; [R0](./rewrite_r0_plan.md) | À établir ; points d’appui R0 §4 | NON SOUMISE |
| Axe/géométrie nombres/curseur | src/adapters/temporal/temporalGeometry.ts ; src/adapters/timeline/geometry/geometryNumbers.ts , src/adapters/timeline/geometry/timelineCursorGeometry.ts | REUSE | R5 | NOT STARTED | — | — | Axe unique ; floats présentation ; [R0](./rewrite_r0_plan.md) | À établir ; points d’appui R0 §4 | NON SOUMISE |
| VM/frises/segments | src/adapters/timeline/buildTimelineViewModel.ts , src/adapters/timeline/buildReservationNavigationItems.ts , src/adapters/timeline/geometry/buildTimelineGeometry.ts | ADAPT | R5 | NOT STARTED | — | — | Résultat → VM → geometry ; [R0](./rewrite_r0_plan.md) | À établir ; points d’appui R0 §4 | NON SOUMISE |
| SVG/zoom/pan/tooltips/métriques | src/ui/timeline/ hors structure coordinator | ADAPT | R5 | NOT STARTED | — | — | Axe unique ; no-run cursor/zoom ; [R0](./rewrite_r0_plan.md) | À établir ; points d’appui R0 §4 | NON SOUMISE |
| Modales/accessibilité/responsive | src/ui/renderApp.ts , src/ui/createWorkspaceModeController.ts ; public/styles.css | ADAPT | R5/R6 | NOT STARTED | — | — | Focus/clavier/mobile ; drafts ; [R0](./rewrite_r0_plan.md) | À établir ; points d’appui R0 §4 | NON SOUMISE |
| Composition root neuve | src/main/createPersistentPlanningApplication.ts , src/main/demo/ | REFERENCE | R0.1/R2/R5 | NOT STARTED | — | — | Entrée native vide sûre ; [R0](./rewrite_r0_plan.md) | À établir ; points d’appui R0 §4 | NON SOUMISE |
| Auto-import/demo initial/ack legacy | src/main/createPersistentPlanningApplication.ts , src/main/demo/ | DROP | R0.1/R2/R5 | NOT STARTED | — | — | T12-R ; aucune ouverture legacy ; [R0](./rewrite_r0_plan.md) | À établir ; points d’appui R0 §4 | NON SOUMISE |
| Outillage build/test/portable | scripts/ ; tsconfig.json , tsconfig.app.json , tsconfig.test.json , package.json | ADAPT | R0.1 | NOT STARTED | — | — | Périmètre V2 sans framework neuf ; [R0](./rewrite_r0_plan.md) | À établir ; points d’appui R0 §4 | NON SOUMISE |

Clôture d'un lot : mettre ce registre à jour pour toute extraction/abandon
réalisé, puis appliquer la [checklist stateless R0 §11](./rewrite_r0_plan.md#11-contrat-de-clôture-et-exercice-final-de-reprise-à-froid).
Aucun SHA/destination/test exécuté ou avis d'audit d'extraction n'est inventé
pour remplir un champ à la clôture documentaire R0.
