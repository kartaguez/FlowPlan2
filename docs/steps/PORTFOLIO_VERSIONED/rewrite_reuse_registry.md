# FlowPlan2 V2 — registre vivant des extractions

Matrice patrimoniale issue de R0 ; **aucune extraction métier réalisée**.
R0.1 IN REVIEW : adaptations techniques et exclusions enregistrées ci-dessous.
La classification initiale est conservée ; un composant livré neuf n'est pas
une extraction du modèle ancien. Audit d'implémentation non encore reçu.
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
| Convertisseurs/repair legacy | src/application/backup/flowplanBackupV*.ts , src/application/backup/planningInputCodec.ts ; src/adapters/flowplan1/ ; src/infrastructure/flowplan1/ ; src/infrastructure/backup/localPlanningBackup.ts ; src/application/persistence/repositoryTransfer.ts (repair legacy) | DROP | R0.1/R2 | R0.1 EXCLUS ; R2 NOT STARTED | 1c2b08c727af9fb8002b7678bd7403fcc0d39c27 (source inspectée) | aucune, hors graphes V2 | T12-R ; [R0](./rewrite_r0_plan.md) | G06–G10/G13/G14 PASS | NON SOUMISE |
| Capture/identités/validation | src/domain/portfolioSnapshots/ ; src/application/portfolioSnapshots/ | REFERENCE | R2/R4 | NOT STARTED | — | — | T04/T09 ; I19/I23 ; [R0](./rewrite_r0_plan.md) | À établir ; points d’appui R0 §4 | NON SOUMISE |
| Résultats/profils capturés et préfixes via Current | src/domain/portfolioSnapshots/ ; src/application/portfolioSnapshots/ | DROP | R2/R4 | NOT STARTED | — | — | T04/T12-R ; I19 ; [R0](./rewrite_r0_plan.md) | À établir ; points d’appui R0 §4 | NON SOUMISE |
| Oracles replay G1 | src/proof/lot11d2/ | ADAPT | R1/R3/R6 | NOT STARTED | — | — | I19/I20 ; fixtures natives neuves ; [R0](./rewrite_r0_plan.md) | À établir ; points d’appui R0 §4 | NON SOUMISE |
| Cartes/styles/Portfolio | src/ui/renderApp.ts ; src/ui/portfolio/ ; public/styles.css | ADAPT | R5 | NOT STARTED | — | — | Continuité visuelle ; T06–T08 ; [R0](./rewrite_r0_plan.md) | À établir ; points d’appui R0 §4 | NON SOUMISE |
| Structure shell/coordinator | src/ui/renderApp.ts ; src/ui/timeline/createTimelineUiCoordinator.ts | REFERENCE | R5 | NOT STARTED | — | — | Frontières Application/UI ; [R0](./rewrite_r0_plan.md) | À établir ; points d’appui R0 §4 | NON SOUMISE |
| Axe/géométrie nombres/curseur | src/adapters/temporal/temporalGeometry.ts ; src/adapters/timeline/geometry/geometryNumbers.ts , src/adapters/timeline/geometry/timelineCursorGeometry.ts | REUSE | R5 | NOT STARTED | — | — | Axe unique ; floats présentation ; [R0](./rewrite_r0_plan.md) | À établir ; points d’appui R0 §4 | NON SOUMISE |
| VM/frises/segments | src/adapters/timeline/buildTimelineViewModel.ts , src/adapters/timeline/buildReservationNavigationItems.ts , src/adapters/timeline/geometry/buildTimelineGeometry.ts | ADAPT | R5 | NOT STARTED | — | — | Résultat → VM → geometry ; [R0](./rewrite_r0_plan.md) | À établir ; points d’appui R0 §4 | NON SOUMISE |
| SVG/zoom/pan/tooltips/métriques | src/ui/timeline/ hors structure coordinator | ADAPT | R5 | NOT STARTED | — | — | Axe unique ; no-run cursor/zoom ; [R0](./rewrite_r0_plan.md) | À établir ; points d’appui R0 §4 | NON SOUMISE |
| Modales/accessibilité/responsive | src/ui/renderApp.ts , src/ui/createWorkspaceModeController.ts ; public/styles.css | ADAPT | R5/R6 | NOT STARTED | — | — | Focus/clavier/mobile ; drafts ; [R0](./rewrite_r0_plan.md) | À établir ; points d’appui R0 §4 | NON SOUMISE |
| Composition root neuve | src/main/createPersistentPlanningApplication.ts , src/main/demo/ | REFERENCE | R0.1/R2/R5 | R0.1 NEUF LIVRÉ ; R2/R5 NOT STARTED | 1c2b08c727af9fb8002b7678bd7403fcc0d39c27 (source inspectée) | src-v2/main/main.ts , src-v2/main/createV2Application.ts | Entrée native vide sûre ; [R0](./rewrite_r0_plan.md) | G03/G04/G13/G14 PASS | NON SOUMISE |
| Auto-import/demo initial/ack legacy | src/main/createPersistentPlanningApplication.ts , src/main/demo/ | DROP | R0.1/R2/R5 | R0.1 EXCLUS ; R2/R5 NOT STARTED | 1c2b08c727af9fb8002b7678bd7403fcc0d39c27 (source inspectée) | aucune reprise demo ; bootstrap V2 neuf | T12-R ; aucune ouverture legacy ; [R0](./rewrite_r0_plan.md) | G04–G06/G09–G11 PASS | NON SOUMISE |
| Outillage build/test/portable | scripts/ ; tsconfig.json , tsconfig.app.json , tsconfig.test.json , package.json | ADAPT | R0.1 | R0.1 ADAPTÉ / IN REVIEW | 1c2b08c727af9fb8002b7678bd7403fcc0d39c27 (source inspectée) | scripts/v2/ , tsconfig.v2.* , package aliases | Périmètre V2 sans framework neuf ; [R0](./rewrite_r0_plan.md) | G01/G02/G12–G14 PASS ; G16 Windows manquant | NON SOUMISE |

Clôture d'un lot : mettre ce registre à jour pour toute extraction/abandon
réalisé, puis appliquer la [checklist stateless R0 §11](./rewrite_r0_plan.md#11-contrat-de-clôture-et-exercice-final-de-reprise-à-froid).
Aucun SHA/destination/test exécuté ou avis d'audit d'extraction n'est inventé
pour remplir un champ à la clôture documentaire R0.

## Préparation R0.1 — décisions inspectées, aucune opération réalisée

[PLAN R0.1](./rewrite_r01_plan.md) préparé à la baseline exacte
`3e4b8a8e02c8cc8803d38021ea4606694495dea1`. Ce SHA est une **source inspectée**,
pas un SHA d'extraction effectuée. Cette section conserve les intentions au stade PLAN ; les opérations réalisées
sont actualisées dans la matrice et la section de livraison suivante. Aucune
extraction métier n’est déclarée réalisée.
Table ci-dessous : décisions d'intention PLANNED, destinations et preuves futures.

| Périmètre inspecté à cette baseline | Traitement prévu / classe | Destination future ou exclusion | Dépendances à couper / preuve attendue |
| --- | --- | --- | --- |
| package.json, tsconfig*.json, scripts/build.mjs | ADAPT outillage, options strictes reprises explicitement | Configs tsconfig.v2.*, scripts/v2/build.mjs, aliases package | src/public/dist legacy ; G01/G13/G14 |
| scripts/test.mjs et harness storageBrowserHarness.mjs | ADAPT découverte tests/CDP technique | scripts/v2/test.mjs, browser-harness.mjs ; .test-dist-v2 | Toute compilation/suite/fixture ancienne, dist et origine aléatoire app ; G02/G07–G13 |
| scripts/dev.mjs | ADAPT watcher/serveur | scripts/v2/dev.mjs, request-handler.cjs | build/config/public legacy et PORT arbitraire ; G12/G14 |
| scripts/build-sea.mjs, portable-server.cjs, portable-server.test.cjs, smoke-sea.ps1 | ADAPT packaging/HTTP/test technique | scripts/v2/build-sea.mjs, portable-server.cjs, servers.test.cjs, smoke-sea.ps1 | dist legacy, entrypoint/asset ancien, port 4175 ; G12/G14/G16, preuve Windows |
| src/main/main.ts, createPersistentPlanningApplication.ts ; public/index.html | REFERENCE ; entrée/composition neuves | src-v2/main/* et public-v2/index.html, aucun fichier ancien importé | Domain/Application/Engine/Persistence/History/UI legacy ; G03/G04/G13/G14 |
| src/main/demo/createDemoPlanningScenario.ts et appel fallback dans root | DROP du chemin V2 ; bootstrap vide neuf | Aucune extraction demo ; src-v2/bootstrap/emptyPortfolioShellState.ts neuf | Aucun fallback ni fixture métier ; G04/G05 |
| indexedDbRepositoryStorage.ts, createPlanningRepository.ts, repositoryTransfer.ts, localPlanningBackup.ts | DROP de l'initialisation V2 ; mécanismes restent références R2 selon lignes initiales | Aucune copie/opener/port métier R0.1 | DB/Current/codecs/legacy fingerprint/staging/recovery ; G06–G10 |
| indexedDbHistoryScratch.ts, snapshotValidationWorker.ts, planningStorageWorker.ts ; channel dans root | Exclus du runtime R0.1 ; reprise future conserve classes initiales | Aucun scratch/worker/channel actif ; noms réservés seulement | History/codec/DB legacy et URL worker ; G09/G11/G14 |
| src/main/mountPlanningApplication.ts, planning/buildPlanningSessionProjection.ts, src/ui/renderApp.ts, public/styles.css | REFERENCE pour frontières, conservation patrimoniale ; adaptations visuelles R5 non commencées | UI shell R0.1 neuve ; aucun ancien mount/render/style copié | Simulation/session/controllers/barrels ; G03/G05/G14 |
| src/, public/, scripts et configs historiques conservés | REFERENCE physique indépendante | Hors graphes V2, checkout historique au SHA exact | Aucun runtime partagé ; G15 |

Pendant l'implémentation, ajouter lignes liées par opération technique/exclusion
avec **source exacte et SHA source effectif**, destination réelle (ou « aucune,
exclu du runtime V2 »), dépendances retirées, contrats, résultats exécutés et
décision d'audit ; conserver la classification initiale et la provenance.
Bootstrap/composition neufs ne sont pas extraction métier. Le présent tableau
ne remplit pas les champs effectifs ni n'anticipe l'audit. Futures extractions
R1+ : même protocole source/SHA/destination/dépendances/contrats/preuves/audit.
Aucun merge automatique de l'ancien runtime vers rewrite.

## Livraison R0.1 — opérations effectives IN REVIEW

[Canon R0.1 et preuves](./rewrite_r01_canon.md). Source exacte de chaque ligne :
SHA `1c2b08c727af9fb8002b7678bd7403fcc0d39c27`, consulté par lecture ; aucun
merge/copier-coller automatique de runtime. Les cinq commits P1–P5 figurent au
canon ; P6 ajoute documentation et preuves de référence/rollback ; complément G15 exécuté après accord utilisateur d’arrêt/redémarrage temporaire du serveur historique. L'audit du
PLAN était favorable ; l'audit du code/extraction reste **NON SOUMIS**.

| Opération et classe initiale | Source / symboles inspectés au SHA ci-dessus | Destination effective | Dépendances supprimées / contrats | Preuves exécutées / état réel |
| --- | --- | --- | --- | --- |
| Build — ADAPT technique | scripts/build.mjs : build/runTypeScript ; tsconfig.app.json , tsconfig.test.json , tsconfig.json ; package.json | scripts/v2/build.mjs , tsconfig.v2.app.json , tsconfig.v2.test.json , tsconfig.json , package.json | src/public/dist legacy, dossiers couches implicites ; I-R01-A/B et R0.1 §4/§6 | G01/G13/G14 PASS, sources réelles bornées et compiler ignore même ancien src invalide ; implémenté IN REVIEW |
| Tests — ADAPT technique | scripts/test.mjs : collectTests/run/tsc | scripts/v2/test.mjs , scripts/v2/boundaries.mjs , scripts/v2/boundaries.test.mjs ; .test-dist-v2 | Découverte/compilation de toute suite/fixture ancienne ; I-R01-A, gates propres | 39/39 V2 dont 24 canaris frontière ; zéro skip/todo ; implémenté IN REVIEW |
| Dev — ADAPT technique | scripts/dev.mjs : serveur/watch/mirror public | scripts/v2/dev.mjs , scripts/v2/request-handler.cjs | PORT libre, dist/public/config legacy ; allowlist/mémoire avant service, I-R01-B | 4274/Host/collision/refus PORT PASS ; watcher CSS garde JS, ancien index fait arrêter ; IN REVIEW |
| Portable/SEA — ADAPT technique | scripts/portable-server.cjs : createRequestHandler/runPortableServer ; scripts/build-sea.mjs : collectAssets/buildSea ; scripts/portable-server.test.cjs ; smoke-sea.ps1 | scripts/v2/request-handler.cjs , scripts/v2/portable-server.cjs , scripts/v2/servers.test.cjs , scripts/v2/build-sea.mjs , scripts/v2/smoke-sea.ps1 | Ancien dist/HTML/entrypoint/port ; helper V2 incorporé sans require externe dans main SEA | 9 HTTP + browser hors SEA 4275 PASS ; vrai exe Windows NON EXÉCUTÉ, IN REVIEW |
| Harness — ADAPT technique | scripts/storageBrowserHarness.mjs : withStorageBrowser/CDP/profil mkdtemp | scripts/v2/browser-harness.mjs , scripts/v2/browser-isolation-test.mjs , scripts/v2/smoke.mjs | dist hardcodé ancien et port app aléatoire, aucune fixture métier copiée ; hooks avant modules, contextes distincts | 28 hooks, 13 canaris/série, 6 séries native ; zéro API app et sentinelles intactes ; IN REVIEW |
| Entrée/composition — REFERENCE, nouvelle construction | src/main/main.ts ; src/main/createPersistentPlanningApplication.ts ; public/index.html | src-v2/main/main.ts , src-v2/main/createV2Application.ts , public-v2/index.html | Tous Domain/Application/Engine/Persistence/History/UI/demo anciens ; T12-R/I-R01-A/B | G03–G06/G13/G14 PASS ; aucune extraction métier, IN REVIEW |
| Bootstrap demo/import/ack — DROP du chemin V2 | src/main/demo/createDemoPlanningScenario.ts ; src/main/createPersistentPlanningApplication.ts ; src/application/persistence/repositoryTransfer.ts : openPlanningRepository/legacyRepairs/assertLegacyUnchanged | Aucune reprise ; src-v2/bootstrap/emptyPortfolioShellState.ts neuf | Fallback demo, lecture Current/backup, staging/migration/repair/recovery/listeners/channel | G04–G11 PASS ; exclus runtime, code patrimonial conservé |
| Ancienne persistence/worker/scratch — exclusion R0.1, classes futures conservées | src/infrastructure/persistence/indexedDbRepositoryStorage.ts , src/infrastructure/persistence/indexedDbHistoryScratch.ts , src/infrastructure/persistence/snapshotValidationWorker.ts , src/infrastructure/persistence/planningStorageWorker.ts ; src/application/persistence/createPlanningRepository.ts ; src/infrastructure/backup/localPlanningBackup.ts | Aucune reprise R0.1 ; constantes réservées dans src-v2/environment/browserIsolation.ts | DB/codecs/ports/jobs legacy, Worker/URL, history chunks et Storage | G06–G11/G14 PASS ; R2+ NOT STARTED, aucun store/schema V2 |
| UI/projection legacy — REFERENCE de frontière, adaptation R5 reportée | src/main/mountPlanningApplication.ts , src/main/planning/buildPlanningSessionProjection.ts ; src/ui/renderApp.ts , public/styles.css | src-v2/ui/renderV2Shell.ts et public-v2/styles.css neufs | Session/projection/moteur/geometry/controllers/barrels supprimés du chemin V2 | Shell accessible vide 1440/390 PASS ; aucune extraction UI métier |
| Référence/rollback — REFERENCE/proof uniquement | Arbre complet baseline et outils Git ; scripts historiques exécutés seulement dans clone detached | scripts/v2/legacy-reference-test.mjs ; preuves r01/rollback.json et legacy-build.json | Aucun bridge, partage dist ou mutation branche de référence ; R0.1 §7/§10 | Legacy ci/typecheck/build/3 tests portable PASS ; G15 Current/capture/History 4174 PASS après accord, serveur restauré PID 19550 ; reverts P1–P6 tree baseline et 4 sentinelles égaux PASS ; Windows manquant |

Les opérations initiales R1+ restent NOT STARTED (Rational/Date/IDs, Domain,
Engine, métier mémoire/persistence, UI/History complète). Les quatre lignes
initiales impliquant R0.1 distinguent désormais exclusion/adaptation/neuf
livrés et les futurs lots non commencés ; aucun champ métier n'est anticipé.
Toute extraction future garde source exacte/SHA/destination/dépendances retirées/
contrats/preuves/décision d'audit et ajoute une ligne liée, jamais merge automatique.
