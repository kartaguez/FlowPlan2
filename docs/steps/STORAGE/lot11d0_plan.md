# Lot 11D.0 — Storage Architecture & Scalability

**Statut du plan : 11D.0 READY FOR IMPLEMENTATION — pending explicit authorization and prerequisite gates.**
Implémentation **NOT STARTED**. Audit et durcissement documentaire uniquement,
2026-10-08. L’orientation générale a été validée par l’audit indépendant ; les
cinq décisions demandées sont verrouillées ci-dessous. READY qualifie le plan,
pas une autorisation de mise en œuvre ni la clôture des prérequis.
Aucun code, test, dépendance, format de backup, moteur ou donnée persistée
n’est modifié par cette livraison. Aucun benchmark ni migration
n'a été exécuté pendant cette session. 11D.1, 11D.2 et 11D.3 ne commencent pas.

## 1. État initial vérifié et dépendances

Repository `kartaguez/FlowPlan2`, branche `codex/lot11a-portfolio-snapshots`.
Baseline code de l’audit initial : **`944d79ef07f704c849d9669c70e3f70dc567165a`**.
Baseline effective du présent durcissement :
**`47a92b1a8ef2b7c091c5984eb2baad10409397c3`**, commit du plan initial,
sans changement de code depuis la baseline d’audit. HEAD attendu et observé
identiques. Les contrôles fetch/status/HEAD/divergence ont été refaits : fetch
réussi, arbre propre, branche attendue, origin **0/0**. Les contrôles suivants
décrivent la passe initiale et restent sa trace historique.
Contrôles initiaux, dans l'ordre demandé : `git fetch origin` réussi ;
`git status --short` vide ; `git rev-parse HEAD` donnait le SHA initial `944d79e` ;
`git rev-list --left-right --count origin/codex/lot11a-portfolio-snapshots...HEAD`
donne **0/0**. Branche confirmée, aucune remise à zéro ni réécriture d'historique.
Aucun AGENTS.md applicable trouvé dans le repository ou les répertoires parents.

Cette baseline contient l'implémentation **11C IN REVIEW**, pas DONE.
La baseline documentaire validée reste `507e85d5af8ed3158f9ce449e2e354609212e7b5`
(clôture 11A.2), distincte du HEAD effectivement inspecté. 11A et 11A.2 sont
DONE selon les canons courants ; les anciens comptes rendus 11A gardent des
statuts historiques. **11B reste IN REVIEW**. Ce plan ne clôture aucun lot.

Sources normatives : [canon durable](../../canon.md),
[canon courant](../../current_canon.md), [roadmap](../../current_plan.md),
[11A plan](../PORTFOLIO_SNAPSHOTS/lot11a_plan.md),
[11A canon](../PORTFOLIO_SNAPSHOTS/lot11a_canon.md),
[11A.2 / 11B plan](../HISTORY/lot11a2_11b_plan.md),
[11A.2 canon](../HISTORY/lot11a2_canon.md),
[11B canon et mesures](../HISTORY/lot11b_canon.md),
[11C plan](../HISTORY/lot11c_plan.md), [11C canon](../HISTORY/lot11c_canon.md).
Les références au code sont relatives à la racine du repository et correspondent
à la baseline effective, sauf lorsqu'elles sont expressément désignées futures.

**Gate préalable obligatoire avant implémentation transversale :**
audit/validation explicite de 11C et
fixation d'un nouveau SHA de référence. Une correction 11C peut changer la
projection courante et l'engineVersion des nouvelles captures ; elle ne doit
jamais entraîner une réécriture historique. 11D.0 peut être audité dès maintenant.
Les travaux techniques de stockage n'ont pas besoin d'un nouveau calcul métier,
mais leur preuve de non-régression dépend d'une baseline moteur stabilisée.
La refonte du chargement History devra aussi figer le contrat 11B après son
audit, ou recevoir une autorisation explicite de travailler sur ce contrat
encore IN REVIEW. Aucun statut de clôture n'est supposé ici.

## 2. Faits observés : cartographie du système actuel

### 2.1 Chargement, écritures et publication

| Question | Fonction/fichier réel et fait observé |
| --- | --- |
| Point d'entrée | `src/main/main.ts` crée la démo, puis `createPlanningDemoApplication`, avec une façade sur `window.localStorage.getItem/setItem`. |
| Frontière de stockage | `src/infrastructure/backup/localPlanningBackup.ts` : `PlanningBackupStore.read(): string|null`, `write(document): void`. Une seule clé : **`flowplan.backup.v1`**, même pour V7. Aucun IndexedDB, transaction multi-enregistrements ou contrôle de révision dans cet adaptateur. |
| Startup | `src/main/planning/planningBackupOperations.ts::loadPlanningBackup` lit tout le texte, appelle `decodeFlowplanBackup`, puis le preflight de projection courante. Absent → démo ; exception de lecture/codec/projection → démo et `invalid: true`. Aucun rewrite au startup. Le document invalide reste stocké. |
| Composition | `src/main/createPlanningDemoApplication.ts` préflight via `buildPlanningSessionProjection`, crée ensuite la session et le dispatcher. Celui-ci construit sa projection initiale : un startup valide persistant produit donc un preflight puis une nouvelle projection initiale. |
| Mutation ordinaire | `createPlanningProjectionDispatcher.dispatch` : commande candidate → projection candidate → `encodeFlowplanBackupV7` → `backupStore.write` dans le callback synchrone `beforeCommit` → publication session → publication projection. Rejet/no-op : aucune nouvelle projection publiée ; no-op sans write. |
| Save Portfolio | `savePortfolioSnapshot` vérifie dirty live et identité état/projection, lit clock/ID, appelle `capturePortfolioSnapshot` sur le run publié. `commitHistory` passe par `session.commitPortfolioSnapshots`, encode/écrit tout V7 avant publication ; projection réutilisée, zéro moteur. |
| Delete Portfolio | Vérifie l'ID, filtre une seule capture, même transaction complète. Aucun Actuals purgé ; projection réutilisée. |
| Transaction session | `src/application/session/planningSession.ts::dispatch` et `commitPortfolioSnapshots` n'assignent `state` qu'après retour sans exception de `beforeCommit`; échec → `COMMIT_FAILED`. Le stale historique est une comparaison de références dans **la même session**, pas une révision persistée entre onglets. |
| Import | `importPlanningBackup` décode intégralement, préflight courant, confirmation de remplacement, encodage V7, une écriture, puis reload. Échec avant écriture : ancien document/session ; aucune fusion. |
| Export | Composition : `encodeFlowplanBackupV7(session.getState())`. `createPlanningSettingsController` crée Blob/URL, télécharge puis révoque l'URL. Import : `await file.text()` puis callback synchrone. |

La cohérence actuelle est une unité logique « projection candidate + remplacement
d'une valeur + publication RAM ». Il n'y a pas de transaction distribuée entre
RAM, fichier exporté et navigateur. La garantie de remplacement de la valeur
ne fournit ni compare-and-swap multi-onglets ni protection d'un onglet obsolète.
Les tests existants injectent les échecs d'écriture et vérifient l'absence de
publication ; ils ne démontrent pas une durabilité absolue après panne matérielle.

### 2.2 Format exact et migrations logiques existantes

Writer effectif : `src/application/backup/flowplanBackupV7.ts`.
JSON compact, enveloppe fermée :

```text
{format:"flowplan", version:7, exportedAt:UTC-ISO-canonique,
 data:{planning, portfolio, portfolioSnapshots:[...]}}
```

`planningInputCodec.ts::encodePlanningInputs` est la frontière non récursive
commune (inputs V5 par défaut). `planning` contient `startDate`, `endDate`,
`workingWeekdays`, `maxParallelProjects`. `portfolio` contient `teams`,
`projects`, `programs`, `priorityFamilies`, `priorityOrder`, `reservations`.
Les DTO conservent capacity periods/exceptions, contraintes/dailyCap, activation,
associations/couleurs et allocations ratio/fixed-daily. Quantités via
`serializeQuantity` : **strings rationnelles exactes**, jamais doubles métier.
Dates civiles en strings ; IDs inchangés ; tableaux métier ordonnés.

Project/Reservation V5 : `migrationStatus`, éventuel `legacyV4Actuals`, éventuel
`snapshots`. Chaque Actuals snapshot a `snapshotId`, `version`, `knowledgeDate`,
`participation`, `retiredZeroTeams`, couverture optionnelle avec bornes et
périodes `{periodId,from,through,consumed:[{teamId,amount}]}` ; Project ajoute
`raf:[{teamId,amount}]`. Legacy Project conserve aussi `rafAuthorityByTeam`.
Les histoires Actuals complètes appartiennent aux objets courants, une seule
fois dans le backup ; elles sont différentes des captures Portfolio.

Portfolio snapshot fermé : `snapshotId`, `createdAt`, `inputsSchemaVersion:1`,
`inputs`, `actualsSources`, `forecast`. Inputs complets historiques privés de
leurs tableaux Actuals V5 ; source explicite `{kind,objectId,source,snapshotId?}`.
Pending V4 : evidence figée exclusive, jamais conversion automatique V5.
Forecast schema 1/2 : engineVersion et lignes Project avec Actuals/RAF/EAC exacts,
knowledge, priorité 1-based, dates/reasons ; schema 2 ajoute obligatoirement
`dailyProfile = {actualsRange|null,forecastRange,days}`. Jours sparse triés,
uniques, strings `actualsWorkload`/`forecastWorkload`, double-zéro omis.
Ce sont des totaux **Project, toutes Teams agrégées**, pas les contributions
complètes Team/Project/Reservation attendues en 11D.2.

| Reader logique | Comportement observé, à préserver |
| --- | --- |
| V1 | Actifs par défaut, sans Actuals ni Portfolio captures. |
| V2 | Flags d'activation ; pas de capture inventée. |
| V3 | Couleurs et associations Reservation ; politique ancienne de réparation de couleurs/catalogues conservée. |
| V4 | Records cumulés legacy, migration vers evidence read-only sans réconciliation ; provenance RAF conservée. Dates through futures restent admises selon le contrat existant. |
| V5 | Histoires Actuals natives/réconciliées ; statut cohérent, versions consécutives et factories Domain. Le lecteur impose knowledgeDate ≤ date UTC exportedAt. Portfolio history vide. |
| V6 | Inputs V5 stricts, références historiques validées, forecast schema 1 uniquement ; aucune borne de clock technique sur knowledgeDate. |
| V7 | V6 + mélange schema 1/schema 2 ; pas d'enrichissement V6→V7. Strict, aucune réparation/pruning des inputs courants ou historiques. |

Façade `flowplanBackupV1.ts` → V7 → V6 → `planningInputCodec.ts` V1–V5.
Les readers V1–V5 gardent réparation couleur/pruning orphelins historiques ;
les autres invalidités sont rejetées. `decodePlanningInputs(strict=true)`
compare aussi le JSON stable des inputs au round-trip encodé : pertes, sorting
ou normalisation destructive sont refusés. V1–V5 encoders refusent Portfolio
history ; V1–V4 refusent Actuals snapshots ; V6 refuse schema 2.
Ce sont des conversions **en mémoire**, pas une migration physique du store.

`encodeFlowplanBackupV7` fait `JSON.stringify`, puis **redécode tout le texte**
pour validation. V7 décode chaque capture via `validateHistoricalSnapshot`.
`hydrateHistoricalInputs` fait `structuredClone(inputs)`, résout les owners et
injecte le préfixe consécutif V5 jusqu'à l'ID sélectionné ; il peut réencoder
le Portfolio courant pendant chaque validation de capture. La factory Domain
`createPortfolioSnapshot` valide puis `immutableCopy` copie/gèle l'artefact.
Aucun moteur historique n'est appelé ; validation ≠ recalcul des métriques.

### 2.3 RAM, scans, caches, hypothèses synchrones et drafts

| Mécanisme | Coût et durée de vie observés |
| --- | --- |
| `PlanningSessionState.portfolioSnapshots` | Collection complète dans la session ; `createPlanningSession` la copie profondément via `immutableCopy`. Les références courantes Actuals restent aussi dans `portfolio`. |
| `freezeState` | Nouveau tableau superficiel des Portfolio captures à chaque état ; Save/Delete `commitPortfolioSnapshots` recopient profondément la collection conservée. |
| `historicalIds` / `refreshCatalogIds` | Parcourent tous les inputs historiques pour réserver Team/Project/Reservation/Program/Pas. Les générateurs et chaque transaction utilisent ces protections. Retirer ces scans sans index ferait recycler des IDs. |
| Backup | Texte complet, DTO parsés, Domain, copies/freeze et préfixes temporaires peuvent coexister. Toute mutation ordinaire réencode/revalide l'histoire entière. |
| `buildProjectHistoryViewModel` | Trie toutes les captures, lit labels historiques, décode tous les jours rationnels, construit union Projects × snapshots, comparaisons avec présence précédente, copie/gèle le VM. |
| `createProjectHistoryCache` | Cache VM/temporal/viewport/cap, identité = séquence triée d'IDs. Conserve le VM après `suspend`; pas de TTL/LRU ni budget RAM. Rebuild sur changement de dataset/référence ; pan garde cap, zoom effectif le recalcule. |
| `createProjectHistoryCoordinator` | Existe durant la vie de l'application ; `resume` refresh depuis collection entière. Géométrie fenêtrée X/Y, mais VM global et gouttières clavier complètes. Suspend débranche interactions/observer ; ne libère pas le cache. Destroy enlève DOM/listeners ; les objets deviennent collectables quand les références à l'application disparaissent. |
| Planning | Projection publiée retient Portfolio, reconstruction complète, PlanningResult, VM et Geometry ; maps des contrôleurs/draft stores vivent avec le coordinator, suspend/resume préserve owners et DOM. |
| Caches moteur | `engine.ts::planTeam` : Map occupation et cache capacité par date, résidus Mandatory ; locaux à un run, pas un cache historique persistant. Reconstruction : maps locales ; aucune éviction historique dédiée. |
| Sync supposé | Store read/write, session beforeCommit, dispatcher return, Save/Delete, callbacks contrôleurs, composition initiale, export string et import result. Mettre une Promise dans beforeCommit publierait trop tôt : adaptation explicite obligatoire. |

`createTimelineUiCoordinator.hasUnappliedChanges` agrège les stores Forecast
Project/Reservation, les stores Actuals/RAF des deux kinds et Team/Create/Settings,
y compris invalides/cachés. Save recontrôle cette garde. Saisie = draft local,
aucun write ni moteur. Apply accepté publie seulement après projection/persistance
et rebase les autres drafts selon les règles existantes ; échec laisse drafts
intacts. `createWorkspaceModeController` garde DOM/owners Planning, modales
bloquantes, suspend/resume idempotents. History ne reçoit aucun dispatch,
Save/Delete/Import ni moteur. Transition Planning/History = zéro write/recompute.
Ces faits constituent les contraintes de la cible, pas des détails à supprimer.

## 3. Risques constatés et conséquences

1. Coût d'une petite modification proportionnel à l'histoire entière : copies,
   stringify, parse, validation et hydratations ; thread principal bloqué.
2. RAM du startup proportionnelle aux profils de toutes les captures, puis VM
   global supplémentaire à l'ouverture History. Virtualiser le SVG ne suffit pas.
3. Quota localStorage et absence de révision persistée : volume élevé et
   écrasement possible entre onglets malgré l'atomicité locale de la session.
4. Couplages réels session/histoire : réservation d'IDs et ownership Actuals.
   Une séparation naïve détruirait la cohérence ou la compatibilité V7.
5. Introduire async déplace la fenêtre entre garde dirty, run capturé, write et
   publication ; double clics, fermeture/navigation et drafts en cours doivent
   être spécifiés. Promesses non attendues dans les API synchrones sont interdites.
6. Documents legacy réparables et données divergentes : copie technique ≠
   autorisation de choisir un état ou de réparer silencieusement l'historique.
7. IndexedDB reste soumis à quota/éviction/pannes ; le passage à IDB ne règle
   pas à lui seul copies, VM global, validation ou export volumineux.

## 4. Architecture cible proposée : frontières

**Orientation acquise de la mission :** IndexedDB principal, localStorage legacy,
chargement à la demande, mémoire maîtrisée, abstraction distante possible,
export portable. **Les cinq décisions du durcissement sont les contrats de
conception retenus pour l’implémentation future ; les paramètres et gates
restants sont explicités au §11. Aucun code n’est autorisé par ce plan.**

```text
UI : drafts / navigation / état pending / erreurs
  → services Application : préparer, valider, projeter, committer, publier
      → PlanningRepository (port asynchrone Application)
          → adaptateur Infrastructure IndexedDB
Domain + engine : entités exactes et fonctions pures, aucun stockage
Backup codec Application : contrat portable V1–V7, aucun object store
Main : composition, ouverture async et injection de l'adaptateur
```

Le port appartient à `application/persistence/` envisagé, ni UI ni Domain.
Il transporte DTO métier versionnés/exacts et jetons de révision opaques,
aucun `IDBDatabase`, `Storage`, curseur IDB ou réponse HTTP. Adaptateur en
`infrastructure/persistence/` envisagé. Un adaptateur en mémoire permettra
les tests ; un futur distant pourra respecter cohérence/erreurs sans adopter
les clés physiques IDB. Aucun serveur ni synchronisation distante ajoutés.

**Invariant d’ownership cible après l’implémentation de l’architecture planifiée
par 11D.0 : `PlanningSessionState` ne possède plus la collection complète des
Portfolio Snapshots.** Sa session vivante conserve Planning courant, Portfolio
courant, histoires Actuals owned dans ce Current, et uniquement les informations
historiques minimales nécessaires aux invariants applicatifs (réservations
d’identités exactes, contexte de révision). Elle ne retient aucun ensemble de
payloads historiques pour satisfaire une ancienne API. Le repository historique
est l’autorité des captures immuables ; seuls lecteurs et caches bornés
peuvent retenir les captures nécessaires à une consultation en cours.

`PlanningSession` reste responsable des transitions métier pures. Les contraintes
historiques d’identité sont injectées depuis un index exact versionné, mis à
jour après commit History sans recopier les captures ou reprojeter le moteur.
Une commande prépare son candidat avec les contraintes correspondant au token
de base ; CAS rejette toute base devenue obsolète. Retirer le champ de session
exige des signatures explicites, jamais `portfolioSnapshots: []` pour contourner
les anciennes protections. Mêmes inputs appliqués, même résultat Domain/moteur.

### APIs actuelles dépendantes de la collection : remplacement prévu

| API/fichier actuel | Frontière de remplacement, sans collection complète dans la session |
| --- | --- |
| `PlanningSessionState.portfolioSnapshots`, `createPlanningSession`, `freezeState` (`application/session/planningSession.ts`) | État Current uniquement ; type de dataset backup distinct pour Current + History. Plus de copie/freeze de collection dans la session ou les transitions courantes. |
| `historicalIds`, `refreshCatalogIds`, générateurs Team/Project/Reservation et ensembles Program/Pas | Contraintes d’IDs de cinq kinds fournies par l’index d’intégrité ; lecture de l’index au startup, mises à jour ciblées après History commit. Aucun scan de payloads sur une édition. |
| `PlanningSession.commitPortfolioSnapshots(expected, snapshots, beforeCommit)` | Supprimé au profit des services Application `createSnapshot`/`deleteSnapshot` du repository ; publier résultat History/index/token après commit, conserver Current et projection. |
| Dispatcher `commitHistory`, `savePortfolioSnapshot`, `deletePortfolioSnapshot`, `getPortfolioSnapshots` (`main/planning/createPlanningProjectionDispatcher.ts`) | Save capture un seul artefact depuis Current/run publié ; repository vérifie unicité et révision ; Delete opère par ID ; getter global remplacé par liste metadata paginée/lectures ciblées. Plus de spread/filter de collection ni encodeur V7 pour ces mutations. |
| Dispatcher `dispatch` et `backupStore.write(encodeFlowplanBackupV7(candidate))` | `writeCurrent` n’encode que le Current ; orchestration préparée puis commit avant publication, aucune lecture/écriture History. |
| Composition `createPlanningDemoApplication`, callbacks Timeline et `createPortfolioSnapshotsController.getSnapshots` | Injection de services restreints : metadata/count/Save/Delete, résultat pending en phase async ; liste sans contenu. Aucun shim reconstruisant le getter de toutes les captures. |
| `createProjectHistoryCoordinator.getSnapshots`, `createProjectHistoryCache.refresh(collection)`, `buildProjectHistoryViewModel(collection)` | Service History de lecture paginée, projections de lignes/union et profils demandés (§7.2) ; cache borné. Le VM global reste seulement oracle de tests sur petits jeux, pas adaptateur de production masquant un `getAll` de l’histoire. |
| Readers/writers V6/V7, garde downgrade V1–V5 (`application/backup/`) | Type Application de dataset portable distinct de la session : Current + itérateur/batches de captures. Readers conservent leur contrat logique, orientent History vers staging/repository ; export assemble V7 complet depuis le dépôt, pas `session.getState()`. Le contrôle downgrade utilise count/manifeste History, jamais une fausse liste vide. |
| `loadPlanningBackup`, `importPlanningBackup`, export de composition | Services d’ouverture/reprise/staging/export depuis le repository. Décodeur legacy intégral autorisé exceptionnellement pour migration/import, ses buffers libérés ; aucune réinjection des captures dans la session. |
| `captureHistoricalInputs`, `capturePortfolioSnapshot`, `hydrateHistoricalInputs`, `validateHistoricalSnapshot` | Signatures restreintes au Current/resolveur des préfixes owned nécessaires : ces fonctions n’ont pas besoin des autres Portfolio captures. Validation exacte conservée, pas de dépendance à la collection session. |

**Gate anti-lazy fictif :** instrumenter aussi composition, codecs, services,
cache et UI ; aucune couche ne peut charger/retenir indirectement toute
l’histoire derrière un adaptateur dit lazy. Une ouverture ordinaire, mutation
Current ou liste metadata ne construit ni dataset backup complet ni VM global.
Export/import et scans History globaux justifiés travaillent par batches bornés ;
aucun tableau intégral de payloads n’est conservé en session ou cache de façade.

Pour la première étape, conserver **les historiques Actuals owned complets dans
le DTO courant** et toutes leurs protections. On évite de les déplacer en même
temps que Portfolio history ; le startup ne charge plus les captures Portfolio.
Limite assumée : la RAM courante reste proportionnelle aux histoires Actuals
owned. Leur partitionnement futur devra préserver les préfixes, transitions
et export ; à mesurer séparément, pas promettre une RAM constante absolue.

Les IDs historiques sont un index d'intégrité (cinq kinds), pas un cache de
présentation : références exactes par capture et compteurs agrégés, mis à jour
atomiquement. Réservation = références courantes ou captures encore retenues,
pas un registre éternel. Delete retire uniquement les réservations imputables
à sa capture ; les protections Actuals restent inchangées. Au startup, charger
ce petit index, jamais scanner les payloads. Sa taille dépend des IDs uniques,
à instrumenter même si bien moindre que celle des jours.

### 4.1 Contrat de repository envisagé (sémantique, pas code livré)

Toutes les opérations sont attendues ; succès d'écriture seulement après commit.
`Token = {generation, revision, currentRevision, historyRevision}` conceptuellement ;
valeurs opaques au client. `revision` ordonne tous les commits métier du dépôt ;
`currentRevision` identifie les inputs Current auxquels appartient le run ;
`historyRevision` identifie le dataset History. Détails et scopes CAS au §5.2.

| Opération du port | Contrat recommandé |
| --- | --- |
| `readCurrent()` | DTO courant + token + version de données + contraintes d'IDs ; aucune lecture de contenu Portfolio historique. |
| `writeCurrent(candidate, expectedToken, operationId)` | Valider DTO courant ; compare-and-swap ; remplacer seulement courant, incrémenter revision/currentRevision et écrire receipt. Aucun encodeur full backup, scan ou write des captures. |
| `listSnapshotMetadata(page, expectedGeneration)` | Page triée `(createdAt,snapshotId)`, count/révision collection, cursor opaque ; IDs, date, schémas, horizon, compteurs/tailles. Aucun inputs/days. |
| `readSnapshot(id, generation)` | Une capture complète exacte avec validation et résolution des seules références Actuals nécessaires. NotFound/corruption explicites ; aucune projection courante modifiée. |
| `createSnapshot(artifact, capturedCurrentRevision, expectedToken, operationId)` | Artefact déjà capturé du run cohérent/clean ; validation complète ; CAS du token et de currentRevision du run ; add unique, métadonnées, réservations d’IDs, historyRevision et receipt atomiques. Current non réécrit, aucun autre snapshot chargé, aucun moteur. |
| `deleteSnapshot(id, expectedToken, operationId)` | Capture entière, ses index/partitions seulement, transaction unique ; CAS, mise à jour réservations/historyRevision/receipt ; aucun write Current, purge Actuals ni autre capture ; NotFound explicitement traité. |
| `openExportView()` / `readExportBatch(view)` / `closeExportView(view)` | Vue cohérente du courant et de toute l'histoire, assembleur portable au-dessus du port ; aucun détail IDB exposé. Token stable ou conflit explicite, ressources libérées. |
| `stageImport(validatedDataset)` / `activateImport(stage, expectedToken, operationId)` | Dataset invisible jusqu’à validation complète ; activation CAS de generation/control/revisions/receipt uniquement. Parsing, projection et dialogue hors transaction. Remplacement confirmé, jamais merge implicite. |
| `readPersistenceInfo()` / reprise | Versions physiques/logiques séparées, état migration/import, capacités, erreur contextualisée ; pas de pseudo-backup IDB. |

Read-only History reçoit un service de lecture restreint (metadata, projections
de lecture et profils ; summaries persistées facultatives), jamais l’ensemble
du repository mutable. Erreurs typées : validation
avec chemin, conflict/stale, quota, unavailable, blocked-upgrade, corrupt,
cancelled ; distinction succès/échec/pending dans UI. Les `operationId` et reçus
permettent de résoudre un commit dont l'accusé est perdu sans doubler un Save.
ID et createdAt capturés une seule fois au clic ; même timestamp/recul acceptés.
Un retry n'invente pas une nouvelle capture.
`capturedCurrentRevision` appartient au contexte Application du run publié,
transmis séparément à createSnapshot ; ce n’est pas un champ ajouté à l’artefact
historique ou au backup V7. Le token generation lie ce contexte au dépôt actif.

### 4.2 Publication asynchrone sans perte de drafts

Préparation pure du candidat et projection avant transaction ; figer ensemble
base session/token/run. File Application **sérialisée** des commandes, au plus
une mutation en vol ; bloquer actions conflictuelles et doubles Apply/Save.
Les champs peuvent conserver leurs drafts ; désactiver leur édition pendant
la courte phase de commit est la recommandation simple à auditer. Ne jamais
rebase/nettoyer avant succès. Save contrôle dirty et cohérence au clic et avant
soumission, sans intercaler un await dans la capture du run.

Le commit IDB ne contient aucun moteur, hash async ou dialogue. En cas de succès,
publication session/projection synchronisée dans la continuation, puis rebase
normal ; un write échoué conserve ancienne session/projection/drafts. Save/Delete
réutilisent le run. Une notification distante pendant une commande marque la
base stale, ne remplace pas silencieusement un état avec drafts. Un commit
réussi suivi d'une fermeture avant publication RAM se récupère au startup par
lecture du token et du reçu. La RAM n'est jamais annoncée durable avant commit.
Navigation seule n'entraîne aucune commande ; une mutation en vol peut bloquer
la bascule brièvement, sans destruction des owners ni Cancel implicite.

## 5. Modèle physique IndexedDB envisagé

Une database par origine/application ; nom/version finale à arbitrer. **Version
IDB**, version des DTO persistés, version du backup V7, inputsSchemaVersion,
forecastSchemaVersion et engineVersion sont distinctes. Aucun bump backup dans
11D.0 ; IDB n'est pas une nouvelle version de sauvegarde portable.

| Store proposé | Clé/index et contenu |
| --- | --- |
| `control` | Singleton : activeGeneration, revision monotone, currentRevision, historyRevision, storageDataVersion, manifest validation, legacySourceFingerprintAtMigration et statut reprise. Point de publication unique. |
| `current` | generation → DTO inputs V5 complet (histoires Actuals owned comprises), digest/version. Une édition ne touche que cette ligne et control/reçu. |
| `snapshotMetadata` | `[generation,snapshotId]`; index `[generation,createdAt,snapshotId]`. Identité, schémas, horizon, taille, digest/manifeste et statut validé ; pas de jours. |
| `snapshotContent` | `[generation,snapshotId]` → artefact exact existant schema 1/2, document JSON DTO initialement. Add seulement, jamais update d'une capture existante. |
| `snapshotIdentityRefs` | `[generation,snapshotId,kind,id]`; index par snapshot. Références des inputs pour suppression ciblée. |
| `identityReservations` | `[generation,kind,id]` → nombre de captures référençant l'ID ; index d'intégrité chargé sans profiles. |
| `historySummaries` (facultatif, après preuve de besoin) | `[generation,snapshotId,projectId]` + projectionVersion explicite et sourceDigest. Cache dérivé supprimable/reconstructible (§5.3), jamais autorité ni condition de validité d’un snapshot. Pas de store obligatoire dans le premier adaptateur. |
| `jobs` / `receipts` | Migration/import : source legacy brute archivée et fingerprint, version, génération staging, checkpoints/validation, reçu operationId et commitToken. Le suivi source est durable, distinct des reçus opérationnels à retention bornée. |
| `snapshotParts` (option ultérieure) | `[generation,snapshotId,dataset,partition]`, manifest count/digests ; préparation 11D.2, pas requis pour le premier adaptateur. |

Métadonnées minimales O(S), summaries O(S×P) et IDs O(identités) distingués :
ne pas appeler « légère » une liste contenant toutes les lignes/jours. Le service
History lit des projections paginées dérivées à la demande ; un cache
persisté de summaries n’est ajouté qu’après preuve de besoin (§5.3).
Caches reconstructibles supprimables seulement sans supprimer l'artefact.
Défaillance d'un index d'intégrité : bloquer les mutations, reconstruire en
maintenance depuis captures validées ; pas d'IDs libérés par défaut.

Transactions readwrite incluant `control` sérialisent les mutations même entre
onglets. Vérifier expectedToken **dans** cette transaction, puis écrire toutes
les lignes concernées et le reçu. Résoudre seulement sur `transaction.complete`,
pas au succès d'une requête individuelle. Erreur/abort : aucune publication.
Préparer validation, hashes et projections avant transaction pour éviter
auto-commit/inactivité liée aux awaits externes. La suppression du document et
de toutes ses partitions/index est une seule transaction ciblée ; jamais clear
sur un store global. L'import volumineux utilise staging, pas une transaction
maintenue pendant le parsing ou une confirmation humaine.

L'API garantit des transactions atomiques ; sa durabilité configurable est un
**indice donné au navigateur**. Demander `strict` pour les écritures critiques
si disponible, tester les navigateurs retenus, sans promettre survie universelle
au crash disque. Fermer les connexions sur `versionchange`, afficher `blocked`
pour upgrade empêché par un autre onglet ; aucune suppression automatique de DB.
Source vérifiée le 2026-10-08 : [Indexed Database API 3.0](https://www.w3.org/TR/IndexedDB/).

### 5.1 Noyau initial et périmètre des transactions

Le premier adaptateur privilégie `snapshotMetadata`, `snapshotContent` et index
d’identités/intégrité, avec Current/control/jobs/receipts pour la cohérence.
`historySummaries` n’est pas une dépendance du modèle initial ni une obligation
de migration/import. Il n’est ajouté qu’au gate E si 11B ou les benchmarks
démontrent qu’une projection persistée est nécessaire.

### 5.2 Frontières transactionnelles opération par opération

Les validations métier, capture, projection Current, hashes externes et dialogues
sont **hors transaction**. Dans celle-ci, seules lectures CAS/control/reçus et
écritures/contrôles d’intégrité ciblés sont autorisés. Attendre complete avant
publication RAM. `operationId` est lié au type d’opération et à son digest :
un reçu déjà committé du même appel retourne son résultat sans mutation ni
incrément ; un ID réutilisé pour un autre appel est une erreur. Vérifier ce reçu
avant le CAS d’un retry dont la réponse initiale a été perdue.

| Opération | Contenu atomique / stores concernés | Lectures et écritures interdites |
| --- | --- | --- |
| `writeCurrent` | CAS expectedToken/generation dans control ; écrire Current candidat ; incrémenter revision et currentRevision ; receipt avec token résultant. Stores : control/current/receipts. | Aucun payload, metadata, part ou summary historique lu/encodé/écrit ; historyRevision inchangée. Les contraintes d’identité de base viennent de l’index déjà chargé et le CAS protège leur fraîcheur. |
| `createSnapshot` | CAS expectedToken et currentRevision du run capturé, lié à generation ; add unique du snapshot immutable et metadata ; add références d’IDs et ajuster compteurs ; incrémenter revision/historyRevision ; receipt. Stores : control/snapshotContent/snapshotMetadata/snapshotIdentityRefs/identityReservations/receipts, parts ciblées si activées ultérieurement. | Aucun write Current ; aucune lecture d’autres snapshots ; aucune relance moteur. Un run dont Current est stale fait échouer Save explicitement, aucun artefact publié. |
| `deleteSnapshot` | CAS expectedToken ; vérifier cible par clé ; retirer son content/metadata/parts/projections dérivées seulement ; décrémenter compteurs d’IDs depuis ses références ciblées ; incrémenter revision/historyRevision ; receipt. | Aucun write Current ni autre snapshot ; aucune purge Actuals owned. Invalider les caches de comparaisons, ne pas réécrire d’autres artefacts pour maintenir un prédécesseur dérivé. |
| `activateImport` (et activation migration initiale) | CAS token/base attendu ; vérifier manifest/job scellé complet et validé de staging ; basculer activeGeneration ; mettre à jour revisions/control et receipt. Stores : control/jobs/receipts ; contenu staging déjà validé. | Aucun parsing, validation complète, moteur, hash externe ou dialogue dans transaction ; aucun recopiage global au moment de la bascule. Stage partiel/invalide : activation refusée. |

| Opération réussie | revision (ordre global) | currentRevision (inputs du run) | historyRevision (dataset historique) | generation |
| --- | --- | --- | --- | --- |
| `writeCurrent` | +1 | +1 | inchangée | inchangée |
| `createSnapshot` / `deleteSnapshot` | +1 | inchangée | +1 | inchangée |
| `activateImport` / activation migration | +1 | +1 | +1, même si collection vide | nouvelle generation staging activée |
| Lire / staging invisible / cache summary refresh / rejet / no-op / retry reçu | inchangée | inchangée | inchangée | aucune bascule active |

Les compteurs sont monotones au dépôt, indépendants des clocks, jamais remis à
zéro à l’import ; generation change empêche toute confusion d’identité. Le
premier dépôt initialise control avec une base définie, puis applique les mêmes
règles. Toutes mutations comparent le token complet : une modification History
concurrente peut donc provoquer conflict même si Current n’a pas changé, ce
choix conservateur protège les contraintes d’IDs et la cohérence du dataset.
Un Save/Delete local réussi actualise le token et les contraintes de session
sans modifier les inputs ; le run conserve currentRevision et est réutilisé
sans recalcul. Un Save exige à la fois ce lien run/Current et le CAS du dépôt.

Un cache dérivé éventuellement présent est invalidé/retiré pour la cible sans
faire dépendre validité ou succès métier de sa reconstruction. Sa reconstruction
se fait hors transaction critique, par CAS de generation/sourceDigest/version
dérivée ; elle ne change aucune révision métier. Le manifest métier de staging
ne contient aucune obligation de summary à jour.

### 5.3 Summaries facultatives : autorité historique unique

Un summary éventuel est une **projection strictement dérivée** du snapshot
immutable validé, avec `projectionVersion` explicite et `sourceDigest`. Il peut
être supprimé puis entièrement reconstruit depuis le repository. Absence,
version périmée ou digest non correspondant → cache miss/reconstruction ou
lazy refresh, jamais perte du snapshot ni rejet métier de ce dernier.

Il ne participe jamais à la validité métier d’un snapshot, aux preuves de
migration/import ou à l’export portable. Il ne constitue jamais une autorité
pour les métriques historiques : seul `snapshotContent` et ses parts immuables
le sont. Les valeurs affichées sont des projections de cette autorité, avec
lien source/version vérifié ; une divergence détectée invalide le summary et
reconstruit depuis le contenu, sans modifier, réparer ou recalculer le snapshot.
Tester explicitement summary altéré, absent et périmé. Une erreur de cache
reste une erreur de projection/récupération, pas une corruption du snapshot.

Éviter de persister les prédécesseurs comme données par capture : ils changent
sur Delete et se dérivent des présences retenues à historyRevision donnée. Un
cache de comparaison peut être invalidé avec cette révision ; son existence
reste facultative. Les pages metadata restent sans métriques/jours (§7.2).

### 5.4 Document unique ou datasets multiples pour 11D.2

Recommandation initiale : un document **par capture**, déjà suffisant pour ne
plus réécrire les autres captures. Facile à valider/exporter, peu de requêtes,
préserve l'artefact V7. Limites : structured clone/parse/copie d'un document
entier et pic RAM même pour un seul Project.

Option à préparer : header/inputs/metrics + profils Project + contributions
quotidiennes partitionnées par type de dataset puis Team/période ou Project.
Manifest immutable lie les parts, versions, counts et checksums. Une capture
n'est visible qu'une fois toutes les parts validées, avec conservation exacte
et commit du manifest. Pour de gros ensembles : parts staging puis activation
atomique, nettoyage de staging interrompu récupérable. Delete entier inclut
parts ciblées ; aucune édition individuelle publique des journées.

11D.2 définira les contributions exactes `(date,Team,Project ou Reservation,
type de charge,quantité rationnelle)` et leur conservation depuis le run publié.
Ne pas reconstruire ce détail depuis les totaux Project schema 2 existants :
l'information Team/Reservation manque. Aucune capture ancienne enrichie, aucun
moteur historique exécuté. L'adaptateur peut assembler un artefact logique
indépendant des partitions. Le futur schéma portable de 11D.2 exige un contrat
et une autorisation séparés ; **V7 fermé ne peut pas recevoir ces champs en
silence**. Aucune version future n'est choisie ou créée ici.

Benchmark tranchera document vs parts avant production 11D.2 : taille unitaire,
pic RAM, accès courants, amplification de lecture, coût validation/conservation,
nombre de requêtes et complexité reprise/export. Ne pas créer une ligne IDB
par cellule/jour par défaut : cardinalité, index et coût transactionnel élevés.

## 6. Migration physique sans perte, coexistence et reprise

### 6.1 Protocole proposé

1. Ouvrir IDB, vérifier versions/manifest et absence de divergence connue.
   Lire la clé legacy en lecture seule, garder le texte brut et son empreinte
   exacte ; absence n'autorise pas à substituer une démo à une DB invalide.
   Aucune donnée réelle n'est copiée pendant la présente mission.
2. Décoder avec le reader de la **version source**, ses contrats et erreurs.
   Validation complète des inputs/Actuals/captures/références/métriques, preflight
   du planning courant seulement. Ne pas utiliser un encodeur ancien pour
   tronquer l'histoire ; aucune réconciliation ni conversion des profils.
3. Comparer source et DTO normalisé. Pour V6/V7 stricts : égalité des valeurs
   métier et des captures exacte ; pour V1–V5 : les defaults/réparations
   contractuels sont explicitement répertoriés (activation, couleur/catalogue,
   représentation legacy). Garder le brut intact et un rapport de migration.
   Si réparation de couleur présente invalide/pruning ferait perdre une valeur,
   **arrêter l'activation automatique**, présenter la réparation prévue pour
   décision explicite ; les lecteurs legacy restent disponibles. Une couleur
   valide et toutes quantités/IDs/dates/priorités restent strictement égales.
   Ne pas présenter une réparation autorisée par un ancien reader comme une
   préservation byte-à-byte. Toute perte non prévue → erreur bloquante.
4. Créer une génération staging et un job identifié par empreinte de source +
   version de migrateur. Écrire courant, captures, métadonnées et index
   d’intégrité par batches atomiques bornés ; summaries exclues des prérequis
   métier de staging. Un cache dérivé pourra être reconstruit après activation.
   `add`/digest empêche un retry de doubler
   une capture ou un compteur. Aucun changement activeGeneration à ce stade.
5. Relire **toutes** les données staging et les valider complètement : counts,
   IDs, références, préfixes V5, schémas, rationnels, conservation, manifeste et
   index. Comparer le DTO métier complet à la source décodée et chaque capture
   profondément, sans se contenter d'un hash ou d'une égalité des seuls totaux.
   Les empreintes détectent altérations, ne remplacent pas les validateurs.
   Sceller la génération/job validé : aucun batch ne peut ensuite modifier son
   contenu métier ; activation vérifie ce sceau. Une modification de staging
   exige une nouvelle validation complète avant un nouveau sceau.
   Libérer les batches au fur et à mesure ; l'ancien decoder complet reste
   coûteux pour la première migration, ce coût exceptionnel doit être mesuré.
6. Relire la source legacy avant activation. Si texte/empreinte a changé :
   arrêter, nouvelle source à auditer ; ne pas publier l'ancien staging.
   Dans une transaction IDB unique, vérifier token attendu/job validé/digests,
   publier activeGeneration, les révisions du §5.2,
   legacySourceFingerprintAtMigration et reçu de migration. Après complete,
   le startup peut charger courant/index seulement. Conserver le texte legacy
   **sans modification ni suppression**. Ne pas installer de dual-write.
7. Relire le manifeste actif et le reçu au redémarrage. Aucun succès annoncé
   sur un simple request success. Un job incomplet reste invisible et peut
   reprendre au dernier batch validé ; un digest différent bloque la reprise.
   Une migration déjà committée de la même source est un no-op, pas un import
   qui écrase les nouvelles éditions IDB. Libérer les copies RAM temporaires.

Une fermeture avant activation laisse ancien état actif ; après activation,
la nouvelle génération complète fait autorité. Une erreur quota/write/validation
n'active rien. Reprise proposée : retry après libération volontaire d'espace,
export du legacy/actif, ou abandon du staging seulement. Aucun nettoyage des
captures actives/legacy pour faire rentrer la migration. Le coût temporaire
ancien store + staging + copie brute source + ancien actif peut dépasser le quota : échec visible
et récupérable, pas promesse de migration sans espace supplémentaire.

Le manifeste atteste une validation complète **à l'entrée**. Startup IDB valide
courant, control et index structurel, sans redécoder toutes les captures ; chaque
capture/part est vérifiée à la lecture. Audit intégral/export/import peuvent
revérifier le dataset entier. Une corruption découverte bloque la lecture et
les mutations qui en dépendent, conserve la donnée pour récupération, aucune
amputation de l'histoire ni fallback écrit. Ce déplacement de la validation
historique du startup vers entrée + lecture doit être audité explicitement ;
il ne diminue jamais la validation d'un import ou de la migration.

### 6.2 Source legacy, empreinte figée et coexistence

Distinguer durablement trois objets : **document legacy source** (texte brut
archivé sans altération dans le job de migration avant activation, en plus
de conserver la clé localStorage), **`legacySourceFingerprintAtMigration`**
(empreinte exacte de ce texte, figée avec le reçu/job lors de l’activation), et
**Current IDB actif** (évolue à chaque édition normale). L’empreinte porte sur
le texte exact, avant parse/normalisation/exportedAt généré ; algorithme et
encodage déterministes versionnés, absence de clé distincte d’un texte vide.
Sa vérification ne peut pas se baser sur le hash du DTO Current normalisé.
Une édition IDB ou un import ultérieur ne rafraîchit pas cette empreinte pour
masquer une écriture legacy ; garder le document source et son suivi dans les
informations durables du dépôt/job, indépendamment du remplacement de generation
importée et du nettoyage des reçus opérationnels. La source archivée permet de
conserver la branche migrée même si un ancien client écrase la clé legacy.

**Cas normal :** legacy identique à sa source migrée / empreinte figée, mais
Current IDB différent du legacy après édition : **aucun conflit**. Interdiction
de comparer naïvement `Current IDB == localStorage` au startup, focus ou avant
write. Le test de suspicion compare uniquement le texte legacy relu à
`legacySourceFingerprintAtMigration`.

**Cas suspect :** contenu de la clé changé ou supprimé par rapport à cette
empreinte après activation : possible écriture d’un ancien client. Préserver
IDB et le legacy nouvellement observé (export brut/copie de récupération si
écriture possible), signaler et suspendre les écritures automatiques jusqu’à
qualification/résolution. Aucun merge ni import automatique. Un changement
seulement de whitespace/enveloppe reste détecté, puis peut être qualifié sans
conflit métier après validation explicite. Le suivi/accusé de résolution ne
réécrit pas l’empreinte de migration originale ; consigner séparément le choix
et l’empreinte reconnue pour ne pas réouvrir sans fin un événement déjà résolu.

### Matrice de coexistence

| Situation observée à l'ouverture | Comportement recommandé |
| --- | --- |
| IDB absent, legacy absent | Démo en mémoire ; première création de dépôt explicite par workflow normal, pas faux historique. |
| IDB absent/incomplet, legacy valide | Migration proposée ; staging ne fait pas autorité. Legacy accessible pour export/retry. |
| Legacy invalide ou version inconnue | Préserver brut et signaler ; pas de migration partielle ni overwrite par démo. Mode démo éventuel explicitement non durable tant que récupération non décidée. |
| IDB valide, legacy == source migrée (empreinte figée), Current IDB != legacy | Cas normal sans conflit : IDB fait autorité ; aucune comparaison métier entre Current évolué et copie legacy ancienne. |
| IDB valide, empreinte legacy différente, dataset sémantiquement égal à la source archivée | Cas suspect détecté ; qualification explicite d’une différence enveloppe/whitespace ; aucune réécriture automatique de l’empreinte originale ni comparaison avec le Current évolué. |
| IDB valide, empreinte legacy changée et métier divergent de la source migrée, ou source sans reçu reconnu | **Conflit bloquant pour les écritures automatiques** ; exports distincts des deux sources, choix explicite conserver IDB ou importer/remplacer après validation. Aucun merge, priorité au timestamp ou « dernier lu gagne ». |
| IDB corrompu/non supporté, legacy disponible | Préserver IDB, proposer récupération legacy confirmée dans nouvelle génération ; ne pas restaurer automatiquement une copie ancienne. |
| Job validé mais activation/accusé incertain | Lire reçu/control ; actif → terminé, inactif → reprendre/activer avec CAS. |

**Limite structurante :** localStorage et IDB n'ont pas de transaction commune.
Un onglet de l'ancienne version peut écrire la clé **après** sa dernière relecture,
ignore nos locks et ne peut pas être rendu coopératif par le nouveau code.
Le plan ne promet donc pas une exclusivité parfaite face à cet onglet.
Prévoir fermeture/rechargement de tous les anciens onglets avant bascule,
message de transition et détection `storage` + relecture au focus/startup/avant
mutations. Un changement legacy par rapport à l’empreinte migrée, et non une édition
normale Current IDB, gèle les écritures automatiques du nouveau client,
préserve les deux branches de données et demande résolution explicite. Le
legacy n'est jamais réécrit par le nouveau client ; l'état IDB antérieur est
conservé. Garantir capture de **chaque état intermédiaire** écrasé par plusieurs
anciens onglets est impossible sans modifier ces anciens clients ; décision
de déploiement nécessaire (§11), pas une garantie fictive du repository.

### 6.3 Nouveaux onglets et écritures concurrentes

Chaque lecture retourne un token ; toute écriture, création/suppression/import
compare ce token dans la même transaction que sa mutation. Révisions monotones
au dépôt selon §5.2, indépendantes de l’horloge et de snapshotId. Deux onglets
sur le même token R : un seul commit R+1 ; l’autre obtient conflict, garde sa
session/drafts et ne publie
aucun succès. Pas d'écrasement silencieux, ni retry automatique d'une commande
sur une nouvelle base pouvant changer son sens métier.

BroadcastChannel proposé pour notifier `{generation,revision,historyRevision}`
après commit ; `storage` observe legacy. Notifications = optimisation, jamais
preuve d'exclusion. CAS protège aussi si message perdu. `focus`/`visibilitychange`
relisent le token. Onglet clean : proposition de reload contrôlé ; dirty :
garder drafts et signaler stale, rebase uniquement par les règles existantes
et action explicite. Import active une nouvelle generation ; toute requête UI
portant l'ancienne generation est rejetée/invalidate, même si IDs réutilisés.
Web Locks éventuels réduisent contention/duplicate migration, sans être la
seule protection ni une condition supposée de disponibilité. Upgrades blocked
et connexions versionchange ont un message/action de fermeture, aucun clear DB.

## 7. Chargement à la demande et maîtrise RAM

### 7.1 Parcours courant, liste et ouverture

Startup normal IDB : control/manifest, DTO courant, index d'IDs. Pas de
`getAll(snapshotContent)`, pas de `encodeFlowplanBackupV7` ni VM History pour
sauver courant. Liste Save/Delete : metadata paginées uniquement, index trié
canonique ; supprimer une capture lit ses références/index ciblés, pas toutes
les captures. Création lit le run courant publié et les sources owned nécessaires,
valide la **nouvelle** capture, écrit seulement cette capture et ses index.

`readSnapshot` charge une seule capture complète dans la première itération.
Un futur lecteur de parts peut charger Project/Team/type/date demandés, avec
manifest et validation du dataset complet à sa création. Validation d'une
capture legacy nécessite toujours son inputs complet et les préfixes Actuals
référencés : ne pas confondre détail visuel partiel avec validation complète.
Ne pas revalider tous les autres snapshots lors de cette ouverture.

### 7.2 History/Evolution : préserver le contrat 11B

Le code nomme la vue **History**, correspondant ici à la consultation Evolution.
Le VM global 11B n'est pas un lecteur lazy ; modifier uniquement le store ne
suffit pas. Service Application de History paginée : projections de lecture
pour union/ordre/prédécesseurs/labels/métriques, profils quotidiens pour groupes
consultés, overscan borné. **Sans historySummaries persisté**, parcourir les
contenus validés un par un/par batches bornés, extraire les champs nécessaires
et libérer immédiatement inputs/jours de chaque capture. Ne pas retenir une
référence au DTO complet derrière une ligne légère. Une première ouverture peut
ainsi parcourir toute l’histoire en stockage, mais ne charge jamais toutes les
captures complètes simultanément.

L’union/ordre/prédécesseurs exacts requièrent des informations globales de
présence/priorité, absentes de la seule liste metadata ; conserver un index de
lecture compact borné/paginé (temporaire avec stockage de travail si nécessaire),
et générer les lignes/absences à la demande, sans VM Projects × captures complet
décodant tous les jours. Mesurer séparément ce coût global des lectures de
profils visibles. Si scans/relectures deviennent trop chers pour 11B, le gate E
peut justifier un cache persisté historySummaries sous §5.3, projectionVersion
et sourceDigest obligatoires. Son absence/péremption déclenche reconstruction,
jamais perte de capture ou valeurs métier de secours. Aucun label ni métrique
n’est complété depuis le Portfolio ou moteur courant. Une ligne en cours de
lecture est `loading`, jamais `absent`, `no-activity` ou `unavailable-legacy`
par défaut.
Focus clavier charge la ligne ciblée, y compris non dessinée ; garde l'accès
séquentiel complet et les états explicites schema 1/schema 2.

**Point bloquant d'intégration :** le cap visuel commun 11B se calcule sur les
jours positifs de **tous** les Projects/captures dans la fenêtre X, pas seulement
les lignes montées. Préserver ce calcul exact via scan progressif des profils
stockés par batches (worker recommandé), projection/quantile avec budget,
et cache de cap par génération/dataset/fenêtre source. L'algorithme exact de
quantile peut nécessiter tri externe/stockage temporaire si trop de valeurs ;
une liste complète de rationnels en RAM masquerait le problème. Prototype et
mesures requis. Afficher attente/progrès, puis publier un cap global cohérent,
pas des caps provisoires divergents par ligne. Au pan, cap déjà choisi conservé,
aucun rescan ; zoom effectif/dataset change le réévalue comme 11B. Les valeurs
et comparaisons ne sont jamais tronquées pour respecter le budget.

Ce scan exceptionnel History/zoom peut parcourir toute l'histoire en stockage,
mais ne charge pas tous les documents/profils simultanément et n'exécute aucun
moteur. Si cette voie ne satisfait pas les performances, une politique visuelle
ou un index additionnel doit être **arbitré séparément**, pas changé implicitement.
Ne pas annoncer un History fully lazy et instantané sur la seule base du LRU.

### 7.3 Politique de cache proposée

- Distinguer metadata (faible), projections de lecture paginées (summaries
  persistées seulement si justifiées), DTO de captures, rationnels
  décodés, géométrie et buffers worker. Une copie immutable possédée par entrée,
  pas `immutableCopy` de la collection à chaque Save/Delete ni parse au pan.
- Cache contenu/profils LRU borné **en octets estimés et nombre d'entrées**,
  avec pin des lectures/ligne focus actives. Budget initial à arbitrer, instrumenté
  sur tailles sérialisées et amplification RAM observée, pas présenté comme
  mesure exacte des objets JS. Un document > budget est lisible seul puis libéré.
- Clé `{generation,snapshotId,digest,schema,projectionVersion}` ; summaries/cap
  ajoutent historyRevision/fenêtre. Ne pas conserver le cache par seul ID au-delà
  d'un import. Mutation courante ne l'invalide pas ; Save/Delete invalident les
  comparaisons/dataset/cap et les seules données supprimées. La référence change
  selon le comparateur existant, pas selon le temps du dernier write.
- Fermeture détail/retour Planning : annuler lectures via jeton de demande,
  désépingler et évincer profils/VM lourds ; garder petit état viewport, cap,
  fenêtre source, focus et référence pour restituer 11B. Détruire buffers/worker
  inutiles ; Planning garde ses propres drafts/DOM/projection.
- Aucun résultat async ancien ne peut repeupler une vue suspendue, une capture
  supprimée ou une ancienne generation. Cancellation peut ignorer une réponse,
  elle ne signifie pas rollback d'une écriture déjà committée.
- TTL facultatif de cache inactif, jamais TTL des captures métier. Mesurer RAM
  après 10–30 transitions, après fermeture et après GC de laboratoire ; GC
  navigateur non forcé en production, ne pas promettre libération immédiate.

IndexedDB est async mais structured clone, JSON parsing, validation BigInt,
tri et deep freeze restent coûteux. Worker pour codec/validation/History lourds
à étudier ; porter DTO strings et limiter copies/transferts, pas sérialiser les
classes Domain directement. Chunks bornés et yields pour maintenir UI réactive,
long tasks relevées. Ne pas déplacer moteur/reconstruction pour « réparer »
les performances de consultation historique. Le startup garde une projection
courante normale ; le double preflight/build observé pourra être évité par
réutilisation du résultat validé dans une étape ciblée, avec preuve de parité.

## 8. Export/import et compatibilité indépendante d'IDB

**Export portable autonome :** conserver l'enveloppe logique V7 actuelle,
inputs complets owned et toutes captures schema 1/2 exactes. Aucune clé DB,
generation, chunk ID ou référence à une autre origine/fichier requise. Assembleur
Application lit une vue cohérente ; encodeur/validateurs réutilisés avec une
voie batch future évitant d'hydrater tout le dépôt en RAM. La sortie doit être
sémantiquement identique au codec V7, validée par fixtures/round-trips.

Cohérence export : pin du token/dataset ; première version peut collecter
batches puis vérifier token final et rejeter/retry explicitement si modifié,
en ne publiant aucun fichier mélangé. Batches déjà copiés sont indépendants des
mutations suivantes. Optimisation ultérieure : conserver versions lues avec
lease de lecture bornée et nettoyage différé ; ne pas garder une transaction
IDB ouverte pendant téléchargement/await UI. Fixer cette stratégie avant
implémentation, sans exposer ses mécanismes dans le backup.

Gros fichiers : chunks JSON ou worker produisant Blob/stream, progression et
cancel, navigateur avec download Blob en fallback. **`File.text()` + JSON.parse
actuels chargent tout** ; `Blob(chunks)` peut encore retenir l'export entier,
à mesurer. Un streaming d'import réel nécessite tokenizer JSON/validation
incrémentale, pas `file.stream()` suivi d'un join complet. Pas de nouvelle
librairie/format choisi ici. Limites mesurées publiées ; fichier au-delà de la
capacité testée refusé clairement avant remplacer, pas tronqué ou freeze caché.

Imports complets : mêmes readers V1–V7, rapport des normalisations legacy,
validation intégrale et projection du seul courant. Staging dans une nouvelle
generation ; une capture invalide au milieu/fin rejette **tout**, aucun état
partiellement publié. Confirmation de remplacement après preflight, token de
base conservé ; si conflit pendant dialogue/staging, activation rejetée et
nouvelle décision nécessaire. Quota/cancel/interruption : actif inchangé,
staging récupérable/supprimable, drafts non nettoyés. Activation atomic control,
puis reload selon le workflow actuel. Aucun merge/11A.1 archive/lineage ajouté.

Legacy documents : source préservée ; V1–V5 history vide, V4 evidence exacte,
V5 règle clock originale, V6 captures schema 1 intactes, V7 mixtes. Schéma
inconnu = erreur explicite ; engineVersion inconnu lisible tant que schéma
connu, aucun replay. Des captures de formats différents ne sont pas homogénéisées.
Les nouvelles données complètes de 11D.2 attendent leur propre contrat versionné.

Export de récupération disponible même si la prochaine écriture échoue. Il
porte l'état **appliqué/committé**, pas des drafts ni un candidat refusé annoncé
comme sauvegardé. Conflit legacy/IDB : proposer exports distincts identifiés.
Le brut legacy doit aussi pouvoir être extrait sans dépendre de son décodage.

## 9. Quota et benchmarks reproductibles proposés

### 9.1 Mesures déjà exécutées dans les lots précédents

Source : [JSON brut 11B](../HISTORY/lot11b_measurements.json),
[canon 11B](../HISTORY/lot11b_canon.md), harness existant
`scripts/benchmark-history.mjs`. **Mesures historiques, non relancées en 11D.0.**
Node 24 local / Chromium headless, captures synthétiques sparse, pas un replay
historique. Le harness retire les Reservations, emploie deux Teams et positif
chaque cinquième jour : il n'est pas suffisant pour le nouveau dimensionnement.

| Cas historique S×P×D | UTF-8 bytes | encode / decode / VM ms | heap fin / RSS MiB |
| --- | ---: | ---: | ---: |
| 3×5×30 | 22 447 | 1,15 / 0,84 / 0,81 | 5,84 / 59,16 |
| 24×100×730 | 26 631 198 | 500,15 / 470,56 / 432,29 | 480,44 / 665,80 |
| 50×200×1 095 | 162 683 010 | 3 166,39 / 3 160,64 / 2 780,53 | 2 276,37 / 2 534,48 |

Cible fractions longues/spikes : 27 520 798 bytes, decode 523,65 ms,
VM 474,53 ms. Chromium cible : decode 460,1 ms, mount History 480,7 ms,
frames pan médiane 16,7/P95 17,8 ms ; 7 776 DOM nodes, 48 paths.
Ces heap incluent plusieurs sources/textes/projections concurrents ; **ni pic
isolé, ni mémoire après fermeture**. Aucun write localStorage réel mesuré.
11A.2 mesure aussi Save de la 25e capture 615 ms, write en mémoire 0,002 ms,
quota injecté 644 ms ; ce n'est pas une mesure d'écriture navigateur.
Aucune taille maximale IDB ni startup lazy prouvés par ces résultats.

### 9.2 Jeux de dimensionnement à construire après autorisation

| Jeu requis | Teams / Reservations proposées | Profils Project schema 2, sparse 20 % / dense (lignes théoriques) |
| --- | --- | ---: |
| 5 snapshots / 20 Projects / 365 jours | 3 Teams, 8 Reservations dont ratio/fixed mixtes | 7 300 / 36 500 |
| 25 snapshots / 100 Projects / 730 jours | 5 Teams, 30 Reservations | 365 000 / 1 825 000 |
| 100 snapshots / 200 Projects / 1 095 jours | 8 Teams, 80 Reservations | 4 380 000 / 21 900 000 |

Comptages théoriques, **pas des tailles mesurées ni des limites produit**.
Hypothèse 20 % avec positif chaque cinquième jour ; répéter dense, fractions
longues (40 digits), spikes, captures schema 1/2 mixtes, timestamps identiques
et recul, Projects disparus/inactifs et histories Actuals croissantes/legacy.
Plusieurs Teams par Project, Reservations sur plusieurs Teams, capacité gaps/
exceptions et zéros couverts. Pour 11D.2 seulement, un volet synthétique des
contributions par Team/type/owner mesurera l'amplification selon occupation et
partitionnement, sans modifier le schéma actuel ni prétendre avoir capturé
ces futures contributions. 21,9 millions de lignes Project denses peuvent
encore être multipliées par Teams/types ; pas d'extrapolation linéaire garantie.

Protocole futur : seed/version générateur fixés, start civil fixe et D jours
inclusifs ; clock/IDs déterministes ; digest DTO exact et captures archivés
avec SHA code, navigateur/version, OS/machine, origine et profil isolés.
Générateur issu des helpers existants mais fixtures cohérentes/validées, pas
accès au dépôt utilisateur. Comparer document-per-snapshot et parts sur mêmes
datasets. Deux warmups puis ≥10 runs, médiane/P95/max ; ≥5 startups froids
(profils contrôlés) séparés des runs chauds ; mesurer préparation hors chrono.
Ne jamais mélanger Node et navigateur comme un même gate matériel.

| Mesure future | Début/fin et méthode proposée |
| --- | --- |
| Taille persistée / par capture | UTF-8 logique par artefact, sum inputs/metadata/content/parts ; delta usage IDB estimé, index/staging compris, overhead physique distingué. |
| Démarrage | Navigation/open repository → Planning utilisable/projection publiée ; isoler open/current validation/engine/UI, tracer nombre de records/bytes historiques lus : zéro payload. |
| Liste metadata | Première page et pagination complète séparées, bytes/requests/count ; asserts aucune lecture contents/parts/Actuals. |
| Ouverture capture | Action → contenu validé puis détail dessiné, froid/chaud séparés ; bytes lus, parse/validation/copie/VM et long tasks. |
| Sauvegarde | Commande → transaction complete → publication ; édition courante et Save Portfolio séparés ; tracer amplification bytes écrits, zéro autre payload historique. |
| Import/export | File sélectionné → validation/preflight/staging/activation ; export vue → fichier complet. CPU, débit, copies, espace temporaire et concurrent writes. |
| Pic mémoire | Instrumentation navigateur/profiler heap, worker inclus, samples par phase ; Node heap/RSS séparés. Support d'API mémoire feature-detected, absence signalée, pas estimation comme vérité. |
| Mémoire après fermeture | Après détail/retour Planning, à 5 et 30 s et après 10–30 cycles ; profils/VM/buffers retenus, comparaison après GC laboratoire ; baseline Planning/drafts déduite. |
| Robustesse/quota | Quota artificiel plus vrai profil isolé ; crash aux checkpoints, abort, double onglet et upgrades ; actif/reçu/digests vérifiés après reprise. |

Gates fonctionnels immédiats : zéro payload historique au startup/sauvegarde
courante/liste ; lectures d'un détail bornées à sa capture et ses références ;
aucune dérive moteur/valeurs ; cache mesurable et borné. Gates de latence/RAM
à fixer après baseline sur machines retenues (§11), pas promettre ici une durée
absolue. À investiguer systématiquement : long tasks >50 ms, croissance de RAM
après cycles, amplification des copies, coût cap exact et écriture p95 qui
augmente avec S pour une simple édition. Ces benchmarks nécessiteront du code
et des tests futurs, aucun harness ajouté pendant 11D.0.

### 9.3 Storage API et erreurs

Les quotas sont définis par le navigateur/origine et l'espace disponible.
`navigator.storage.estimate()` donne usage/quota estimés, pas une réservation ;
`persist()` peut être refusé. La persistance réduit le risque d'éviction sous
pression ; elle ne crée pas un stockage illimité ni une sauvegarde externe.
Source vérifiée le 2026-10-08 : [Storage Standard](https://storage.spec.whatwg.org/).
Ne pas coder un quota universel ni des seuils valables sur tous les navigateurs.

Feature-detect Storage API/contexte sécurisé ; afficher usage/quota indicatifs
et état persistent si disponible. Envisager demande persist après action explicite
lors de l'adoption du stockage ou d'une grosse importation ; refus non bloquant
si write possible, statut visible. Estimate avant grosses opérations et après
commit, marge incluant coexistence/staging/index ; estimate insuffisant ou périmé
ne remplace pas le traitement `QuotaExceededError`/transaction abort.

Erreur quota : aucun succès/publication, ancien actif et drafts conservés,
message clair + retry/export/libération d'espace volontaire ou suppression
ciblée confirmée via workflow habituel. Aucun purge/compression/troncature
automatique ; seul staging abandonné peut être nettoyé selon protocole explicite.
IDB indisponible/private mode/security/open failure : mode récupération avec
exports, aucun fallback silencieux en write localStorage. Retenir des origines
stables pour installations portable/dev ; changer host/port/profil signifie
un autre dépôt navigateur, à expliquer/tester lors du déploiement.

## 10. Tests futurs et critères d'acceptation traçables

Réutiliser sans affaiblir les suites existantes `flowplanBackupV1/V3/V5`,
`portfolioSnapshots`, `dailyProfiles`, `planningBackupOperations`,
`planningPersistenceTransaction`, `lot10c1SnapshotProjection`,
`lot11cTemporalSeparation`, `realBackupMandatory`, History VM/cache/coordinator,
multidraft et lifecycle. Leur existence n'est pas une exécution nouvelle.

| # / garantie demandée | Tests futurs / preuve attendue |
| --- | --- |
| 1. Anciens plannings lisibles | Fixtures V1–V7 dans adaptateurs mémoire/IDB ; règles repair/clock spécifiques inchangées, V4 intermittent/futur/RAF provenance, schemas mixtes/inconnus. |
| 2. Migration identique métier | Deep equality DTO normalisés avant/après relecture complète, exact rationals grands/tiers, dates, IDs, priorités, couleurs valides, Actuals owned et Portfolio. Rapport explicite des defaults/réparations legacy ; brut intact. |
| 3. Immutabilité | Add-only/duplicate ID conflict ; mutation sources sans alias ; artefacts profondément égaux après Apply/Actuals/Save/Delete/import round-trip ; aucun update historique. |
| 4. Moteur inchangé | Digest du PlanningResult exact avant/après stockage sur même baseline validée ; matrice 10/11C et fixture Mandatory ; spies zéro moteur historique et Save/Delete zéro recompute. |
| 5. Startup lazy | Adaptateur instrumenté refuse accès contents/parts au startup normal ; current/index seuls, liste metadata sans days, coût startup comparé pour S variable. Première migration explicitement distincte. |
| 6. Lecture sans mutation courante | Détail puis History/back, focus/clavier et lectures retardées : session/projection/drafts/current DTO/token inchangés, zéro write. |
| 7. Panne sans publication partielle | Fault injection après chaque batch/request, avant/après activation/complete/accusé, fermeture/reload, job récupérable, manifest complet ou ancienne generation seulement. Validation fail interdit activation. |
| 8. Delete ciblé | Comparer digests de toutes autres captures/parts et Actuals owned ; index compteurs exacts pour cinq kinds ; abort/quota conserve tout, aucun clear/GC owned. |
| 9. Conflits sans perte silencieuse | Deux connexions/onglets même revision, edit/edit, Save/Delete, import/edit, retry operationId ; un succès un conflict ; notifications perdues et ancien onglet legacy divergent préservé/signalé. |
| 10. Quota récupérable | Quota injecté sur current/capture/staging/activation puis quota navigateur isolé ; ancien actif exact, drafts retenus, export/retry accessibles, aucune purge. |
| 11. Backup indépendant | Même export portable depuis mémoire/IDB, restore dépôt vierge sans DB source ; mixed schema/unknown engine, refs exactes, import invalide milieu/fin sans publication ; token export stable ou rejet complet. |
| 12. Perf/mémoire reproductibles | Trois jeux §9 et variations denses/fractions, logs bytes/requests/copies/heap/long tasks, cold/warm, cache hits/evictions, absence fuite après cycles. |

Gates supplémentaires du durcissement, d’abord sur repository mémoire puis
IDB : session sans champ collection et interdiction de getters globaux en
production ; spy de lecture/encodage de payloads historique sur writeCurrent ;
spy de write Current et de moteur sur Save/Delete ; run currentRevision stale
rejeté avant add ; matrice revision/currentRevision/historyRevision/generation
exacte pour chaque succès/rejet/no-op/retry. Deux éditions IDB normales avec
legacy inchangé produisent **zéro conflit** ; modifier legacy après activation
produit suspicion même si Current IDB a depuis beaucoup évolué. Summary absent,
périmé, altéré ou supprimé : reconstruction depuis capture, export et validité
snapshot inchangés, aucune écriture de réparation dans snapshotContent.

Unitaire : services préparation/commit/publication avec faux repository async,
réponses retardées, rejection, stale, idempotence, pagination/ordre, index,
cache budget et cancellation. Integration : **vrai IndexedDB navigateur**, pas
seulement mocks, vérification transactions multi-stores et restart. Migration :
chaque version, checkpoint, données corrompues et coexistence matrice §6.
Robustesse : two-tabs, blocked/versionchange, abort, quota, fermeture et reçu
incertain. Performance : harness isolé décrit ci-dessus et profiling de RAM.
La stack navigateur de tests est à décider (native headless existant ou outil
explicitement approuvé), aucune dépendance ajoutée ici.

Après chaque étape future autorisée : typecheck, tests pertinents puis suite
complète/build aux gates d'intégration ; caractérisations UI 1440/390 et modes
avec drafts invalides/cachés, dirty live et erreurs async. Documenter résultats,
limitations par navigateur et régression non résolue ; aucune fermeture DONE
automatique. Cette livraison documentaire vérifie uniquement liens, portée,
`git diff --check`, état Git et commit/push des deux documents.

## 11. Séquence future réversible et décisions bloquantes

### Étapes proposées après audit et autorisation

Pré-gate : clôture explicite 11C/baseline moteur fixée, contrat 11B stabilisé
ou changements autorisés explicitement, autorisation de code séparée.
Caractériser le comportement et relever baseline perf sur jeux isolés.

**Ordre verrouillé : ownership → async/CAS → IndexedDB → migration → lazy History.**
Aucune déviation motivée par le code actuel n’a été identifiée. Une dépendance
réelle découverte impose justification documentée et revue de séquence avant
changement ; ne pas combiner implicitement les quatre ruptures architecturales.

| Étape | Travail futur et backend | Gate avant l’étape suivante |
| --- | --- | --- |
| **A — Séparer Current et History** | Repository mémoire/test d’abord ; session sans portfolioSnapshots, services History dédiés, contraintes d’IDs exactes. Remplacer les APIs du §4, adapter le type dataset backup distinct, sans introduire async, IDB ou nouvelle stratégie transactionnelle. La persistance legacy éventuelle est isolée dans l’adaptateur transitoire : pas de collection réinjectée en session. | Même comportement, moteur et backup portable ; identité cinq kinds, Save/Delete et History indépendants de la collection session. Dépôt mémoire seul propriétaire de ses fixtures History. |
| **B — Orchestration async/CAS** | Toujours repository mémoire/test. Tokens, CAS, operationId, receipts, file de mutations, préparation/commit/publication RAM, stale/conflict, drafts retenus ; faire varier délais/échecs sans IDB. | Vérifier matrice §5.2, Save du run exact, no-op/retry, guards dirty et conservation drafts ; aucune nouvelle dépendance backend. |
| **C — Adaptateur IndexedDB** | Stores/control/current/metadata/content/index d’identités/revisions/receipts, transactions multi-store et tests navigateur réels ; uniquement datasets/profils isolés. A+B définissent déjà le comportement métier. | Parité adaptateur mémoire/IDB, CAS entre connexions, atomicité/complete, blocked/versionchange, quota et reads/writes ciblés ; summaries persistées non requises. |
| **D — Migration / reprise / import-export** | localStorage source/fingerprint figé, staging scellé, activation, coexistence, reprise et backup portable complet depuis repository ; aucun dual-write. Déploiement utilisateur après gates seulement. | Validation intégrale/source intacte, cas normal Current évolué sans conflit, ancien client détecté, interruption/partial import sans publication, export autonome. |
| **E — Lazy History / mémoire** | Metadata paging, détails ciblés, service Evolution/11B paginé, caches bornés, cap global exact par batches, éventuels summaries versionnés **si justifiés**, workers seulement après mesure. | Aucun chargement global implicite dans une couche ; même contrat History/drafts, accès clavier, cap pan/zoom et profil schema 1/2 ; benchmarks §9 et mémoire mesurée. |

Dès A, les APIs History changent de frontière ; un lecteur transitoire en mémoire
peut utiliser les fixtures déjà possédées par ce repository pour prouver la
parité 11B sans prétendre avoir livré le lazy History de E. Aucun pont `getAll`
vers une session ou cache global ne demeure dans la cible de production.
Au gate C, startup Current, writeCurrent et liste metadata sont déjà sans lecture
de contents ; les optimisations globales de consultation History restent isolées
en E. Les étapes n’imposent pas une bascule utilisateur prématurée : C teste
IDB isolé, D valide migration/export avant activation utilisateur ; E n’annonce
la scalabilité History qu’après ses mesures.

Après E : dimensionnement/robustesse/review sur les trois jeux, quota réel,
compatibilité navigateurs/portable et résultats IN REVIEW ; clôture humaine
séparée. Préparer seulement les frontières extensibles 11D.2 ; contributions
quotidiennes complètes attendent leur contrat et autorisation propres.

Ces étapes ne définissent pas implicitement les scopes numérotés 11D.1/2/3 :
leur découpage final devra être approuvé ; aucune étape n'est lancée ici.
Chaque changement futur doit être reviewable avec adaptateurs/fixtures isolés.
Avant bascule, retour legacy possible sans toucher au brut. **Après première
édition IDB**, revenir à l'ancienne app sur le legacy donnerait un état périmé :
rollback sûr par export V7 de la generation active, validation puis import
confirmé vers ancien writer compatible, espace quota suffisant. Si quota legacy
insuffisant, conserver IDB et utiliser version de récupération/export ; aucun
rollback automatique. Aucun dual-write ni suppression legacy pour faciliter
un rollback. Jobs staging nettoyés séparément ; anciennes générations d'import
peuvent être conservées provisoirement pour reprise, durée/espace à arbitrer,
sans supprimer de captures actives non ciblées.

### Arbitrages nécessitant décision avant les étapes concernées

| Décision | Recommandation / raison / gate bloquant |
| --- | --- |
| Baseline de lancement | Clôturer 11C explicitement et confirmer contrat 11B avant mutations transversales ; audit 11D.0 possible sans cette clôture. Nouvelle autorisation de code obligatoire. |
| Transition vieux onglets | Exiger fermeture/reload des anciennes versions avant bascule ; détection/quarantaine des divergences. Impossibilité de verrouiller atomiquement les anciens clients à accepter explicitement. |
| Legacy réparé | Rapport + accord si réparation retire/modifie une valeur source ; préserver brut. Arbitrer UX de résolution, jamais silently normalize un format historique. |
| Summaries | Absents du noyau initial ; preuve 11B/benchmarks avant ajout en E, projectionVersion/sourceDigest, suppression/reconstruction, snapshot seul autoritaire. |
| Granularité physique | Document par capture pour premier adaptateur, seams parts ; choisir parts 11D.2 après benchmarks, sans inventer son modèle/version de backup. |
| Validation lazy (gate D/E) | Validation intégrale à entrée, certificat manifest et validation à lecture ; startup sans scan global. Valider explicitement évolution du chemin startup historique. |
| Async/drafts | File unique, actions conflictuelles bloquées, édition temporairement désactivée pendant commit ; préciser fermeture/navigation et messages sans Cancel implicite. |
| History cap global (gate E) | Exact scan batch/worker et éventuel tri externe, comportement pan/zoom 11B conservé. Prototype mesuré bloquant avant annonce de scalabilité History. |
| Export cohérent (gate D) | Token final avec rejet/retry pour première version ; lease/version retention seulement si contention le justifie. Fixer budget fichiers/buffers/fallback Blob. |
| Budget RAM / latences | Choisir matériels/navigateurs supportés, budgets LRU/octets/in-flight et seuils P95 à partir des trois benchmarks, sans limite métier silencieuse. |
| Durabilité / Storage API | strict si supporté, persist opt-in et état refus visible ; politique de récupération et origins portable testées. Aucune capacité illimitée. |
| Retention staging/reçus/generations | Durée/budget et processus abandon/récupération explicites ; préserver idempotence et exports en cours, aucune GC Actuals induite. |
| Tests navigateur | Choisir harness vrai IDB compatible stack actuelle avant éventuelle dépendance ; mocks seuls insuffisants pour ACID/restart/quota. |

Aucune incompatibilité avec les contrats réels ni nouveau blocage de conception
n’a été découvert pendant ce durcissement. Les cinq demandes de l’audit sont
intégrées ; les paramètres de dimensionnement/prototypes sont des gates de
validation des étapes concernées, pas des décisions d’ownership ou de
transaction encore ambiguës. Aucun blocage Git à la rédaction du plan observé.
Les gates ci-dessus bloquent les décisions/implémentations futures concernées ;
elles ne sont pas
résolues implicitement par ce commit documentaire. Le stockage distant, moteur
historique, restauration de capture, fusion 11A.1, archive/purge Actuals,
compression et changement de règles métier restent hors périmètre.

Revue de cohérence documentaire : plan intégral relu, APIs actuelles distinguées
des remplacements futurs, aucune history vide de contournement ni cache global
de payloads dans la cible, aucune comparaison Current/legacy, summary facultatif
sans autorité, transactions ciblées, staging complet avant activation, calculs
hors transaction et export V7 autonome. Aucun test, benchmark ou migration
n’a été exécuté dans cette passe ; code, backup et moteur inchangés.
11B et 11C restent **IN REVIEW**. L’implémentation reste **NOT STARTED**.

**11D.0 READY FOR IMPLEMENTATION — pending explicit authorization and prerequisite gates**
