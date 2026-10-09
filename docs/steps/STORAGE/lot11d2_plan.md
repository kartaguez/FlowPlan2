# Lot 11D.2 — Historical Inputs Contract & Replay Feasibility

**Statut : PLAN PROPOSÉ — audit architectural indépendant requis.**
2026-10-09. Livraison exclusivement documentaire. Ni 11D.2 ni ses suites ne
sont implémentés ou autorisés par ce document. 11D.0, 11D.1 RAF Model et UX
restent DONE. Les preuves de faisabilité et mesures décrites ici sont **à
exécuter après autorisation distincte** ; aucun résultat nouveau n'est annoncé.

## 1. Baseline, références et frontière de mission

Dépôt `kartaguez/FlowPlan2`, branche `codex/lot11a-portfolio-snapshots`.
SHA initial/référence réel : `8103f2e63c9df81621f0806ec711fa9b71c96194`.
Avant toute modification documentaire : `git fetch origin` réussi,
`git status --short` vide, branche attendue, `git rev-parse HEAD` identique à
la référence, `git rev-list --left-right --count
origin/codex/lot11a-portfolio-snapshots...HEAD` = **0/0**. Aucun commit
supplémentaire à analyser. Aucun `AGENTS.md` applicable trouvé dans le dépôt
ou ses parents. Aucun reset ni réécriture d'historique.

Références examinées : [canon](../../canon.md),
[current canon](../../current_canon.md), [current plan](../../current_plan.md),
[11D.0 plan](./lot11d0_plan.md) et [canon](./lot11d0_canon.md),
[11A plan](../PORTFOLIO_SNAPSHOTS/lot11a_plan.md) et
[canon](../PORTFOLIO_SNAPSHOTS/lot11a_canon.md),
[11A.2 / 11B plan](../HISTORY/lot11a2_11b_plan.md),
[11A.2 canon](../HISTORY/lot11a2_canon.md),
[11B canon](../HISTORY/lot11b_canon.md),
[11C plan](../HISTORY/lot11c_plan.md) et [canon](../HISTORY/lot11c_canon.md),
[11D.1 RAF Model plan](../ACTUALS/lot11d1_raf_model_plan.md) et
[canon](../ACTUALS/lot11d1_raf_model_canon.md),
[11D.1 UX plan](../ACTUALS/lot11d1_plan.md) et
[canon](../ACTUALS/lot11d1_ux_canon.md).
Les statuts intermédiaires des anciens comptes rendus ne remplacent pas les
clôtures explicites. Les canons décrivent l'implémentation existante ; ce plan
n'en modifie pas les règles comme si la cible était déjà livrée.

Cette mission modifie seulement ce document et `docs/current_plan.md`.
Pas de production, test, fixture, script, dépendance, migration ou persistance
modifiés ; pas de simulation exécutée, ni de nouveau benchmark. Les références
au code ci-dessous désignent la baseline et les futures frontières de travail.

## 2. Décisions fonctionnelles acquises et propositions techniques

### 2.1 Décisions validées par la mission

- Une nouvelle capture conserve les inputs métier historiques et leurs sources
  immuables ; les résultats calculés ne sont plus une obligation de stockage.
- **Toutes** les captures consultées, anciennes comprises, utilisent la chaîne
  de calcul courante. La reproduction exacte d'une prévision d'ancien Save
  est abandonnée. Aucun catalogue de moteurs historiques exécutables.
- Tous les inputs viennent de l'état capturé : aucune substitution par Current.
  Le RAF vient des requirements capturés, jamais du RAF d'une source Actuals
  plus récente, du RAF Current, ni même du RAF de la source V5 sélectionnée.
- Le moteur courant conserve 11C et 11D.1. Un ancien profil chevauchant peut
  rester valide comme artefact et donner un replay sans ce chevauchement.
- Recalcul impossible : **« Recalcul indisponible »**, diagnostic si possible,
  aucun ancien résultat en fallback, aucune donnée inventée ou réparation.
- Les anciennes captures gardent inputs, résultats, profils, versions, IDs et
  références. Consultation read-only. Conversion explicite ultérieure hors
  périmètre : validité, sauvegarde et consentement utilisateur seraient requis.
- Actuals partagés immuables : autonomie logique, pas copie physique de toute
  l'histoire dans chaque capture. Conservation forte des dépendances.
- Métadonnées rapides, calcul différé, cache RAM supprimable, aucun cache
  persistant initial et aucune simulation exhaustive systématique à l'ouverture.
- Service commun indépendant de l'UI, consommable par un planning unique ou
  une comparaison future. Current n'a pas à devenir un snapshot pour être simulé.

### 2.2 Propositions à auditer, non encore démontrées

Résolution via un port de dépendances immuables ; extraction d'un pipeline
métier Application commun ; union explicite de captures legacy et inputs-only ;
clé de cache sur inputs résolus + identité de chaîne ; scheduler borné ;
découpage en contrats, service, persistance, intégration et activation.
La suffisance des inputs existants est plausible pour **le moteur courant**,
pas certifiée par une preuve exécutée ni pour toute fonctionnalité future.
Les limites de métadonnées et de cap graphique (§8) sont des gaps réels.

La trajectoire ancienne de 11D.0 §5.4 proposait de persister des contributions
Team/Project/Reservation et des parts quotidiennes. Elle n'est **pas** retenue
comme cible par défaut : ces quantités seront recalculées. Partitionner des
inputs ou des archives peut rester une option mesurée ; créer un store par
jour/cellule ou capturer des résultats complets n'est plus l'objectif 11D.2.

## 3. État des lieux : code réel et invariants

Tous les chemins suivants sont relatifs à la racine du dépôt.

| Frontière actuelle | Fichiers / fonctions | Contrat réel et conséquence |
| --- | --- | --- |
| Capture | `src/application/portfolioSnapshots/capturePortfolioSnapshot.ts` : `captureHistoricalInputs`, `capturePortfolioSnapshot` | Encode les inputs Current (modèle RAF2), retire `snapshots`, sélectionne une source par objet ; garde l'evidence V4 inline. Capture encore métriques et profils Project depuis le run publié, sans moteur au Save. |
| Artefact fermé | `src/domain/portfolioSnapshots/portfolioSnapshot.ts` : `PortfolioSnapshot`, `createPortfolioSnapshot`, `projectExactTotals` | Inputs1/2, `forecast` obligatoire schema1/2. Validator fermé, références/totaux/priorité/ranges contrôlés, copie immuable. Totaux = Actuals complets + requirements RAF ; EAC exact. Aucun full PlanningResult persisté. |
| Codec | `src/application/backup/planningInputCodec.ts` : `encodePlanningInputs`, `encodeCurrentPlanningInputs`, `decodePlanningInputs`, `assertLegacyRafContract` | Inputs1 décodés avec contrat V5 et égalités RAF historiques ; inputs2 avec V8/`rafModelVersion:2`. Strict round-trip rejette réparation/perte/normalisation non lossless. |
| Hydratation | `capturePortfolioSnapshot.ts` : `hydrateHistoricalInputs`, `validateHistoricalSnapshot` | Clone inputs ; tuple kind/objectId/snapshotId exact ; préfixe jusqu'à la version choisie. Encode actuellement **tout Current** pour copier ses sources, sans remplacer les configurations historiques. Current est ici conteneur technique des sources. |
| Actuals | `src/domain/actuals/reconstruction.ts` : `reconstructActuals`, `distribute`, `actualOccupationFromReconstruction` | V5 terminal du préfixe seul, sinon V4 pending ; pondération capacité, fallback calendrier/exceptions puis toutes dates ; conservation rationnelle. Contributions incluent provenance, zéros et hors horizon. Occupation agrège Project/Reservation et omet total zéro. |
| Connaissance | `src/domain/actuals/projectActualsKnowledge.ts` : `projectActualsRange`, `projectActualsKnowledgeFromPortfolio` | V5 coverage ou dernier through V4 ; uncovered → null. Zéro couvert reste connaissance. Tableau total sur tous Projects, même inactifs. |
| Historique Actuals | `src/domain/actuals/snapshots.ts` : `createSnapshotHistory`, factories ; `src/domain/model/entities.ts` : `createPortfolio` | Versions consécutives, IDs et dates, partitions contiguës, participation/retired markers, stabilité period IDs et présence Teams. Participation terminale égale membership capturé **dans son ordre**. |
| Chronologies / transitions | `src/domain/actuals/records.ts` : factories de chronologies ; `src/domain/actuals/requirements.ts` : `transitionProjectRequirements` ; `src/domain/actuals/transition.ts` : `canonicalActualsKnowledge`, transitions | V4 impose dates croissantes et cumuls monotones par Team, mais permet intermittence ; provenance RAF suit membership. Transitions Current exigent preuves ; aucune transition ni reconciliation appelée par replay. CanonicalActualsKnowledge compare une connaissance éditable, pas tout input replay. |
| Pipeline Current | `src/main/planning/buildPlanningSessionProjection.ts` : `buildPlanningSessionProjection` | Horizon → reconstruction → occupation/connaissance → recompute → Timeline VM → Geometry. Calcul métier actuellement composé avec les adaptateurs ; pas de service de replay autonome. |
| Moteur | `src/application/planning/recomputePlanning.ts` : `recomputePlanning` ; `src/domain/planning/engine.ts` : `planPortfolio`, `projectsForTeam`, `isProjectDateEligible`, `planTeam` | Portefeuille entier, priorityOrder sémantique, un plan par requirement actif, admission gelée par jour, partage exact par quantum 1/2, Mandatory et calendrier existants. Aucun changement proposé à ces règles. |
| Capacité | `src/domain/capacity/calculations.ts` : `effectiveCapacity`, `requestedReservationCapacity`, `dailyCapacitySnapshot` | Exceptions avant calendrier/période ; indisponibilité exacte ; Reserved active ; occupation Actuals, capacité restante bornée à zéro et deux overloads distincts. Lookahead utilise même calcul au-delà de l'horizon si nécessaire. |
| Dates / profils | `src/domain/planning/projectEstimatedDates.ts` : helpers start/end ; `src/application/portfolioSnapshots/captureDailyProfiles.ts` : `captureDailyProfiles` | Début = première activité positive Actuals/Forecast non clippée ; fin et raisons selon plans complets/inactifs. Agrégation Project multi-Team et sparse exact réutilisables comme projecteurs RAM, pas comme nouvelle capture calculée. |
| History métier | `src/application/history/historyCaptureProjection.ts` : `projectHistoryCapture` ; `buildProjectHistoryViewModel.ts` : `readHistoryMetadata`, `buildHistoryPresence`, `assembleProjectHistoryViewModel` | Summary/profiles/totals proviennent tous de `snapshot.forecast`. Comparaison par présence précédente, labels historiques, union ; type PresentRow impose encore métriques disponibles et seulement profile available/unavailable-legacy. |
| History loading | `src/application/history/repositoryHistoryReader.ts` : `refresh`, `ensureRows`, `dailyTotals` | Refresh lit summary de chaque capture ; profils visibles par snapshot ; FIFO/epoch/token et LRU 32 MiB estimés ; union 64 MiB estimés. dailyTotals parcourt toutes captures. Remplacer load par moteur seul serait incorrect pour le lazy. |
| UI / géométries | `src/ui/history/createProjectHistoryCoordinator.ts` : `loadLazyDataset`, `loadCap`, `suspend` ; `createProjectHistoryCache.ts` ; `src/adapters/history/geometry/buildProjectHistoryGeometry.ts`, `computeLazyHistoryVisualCap.ts` | loadCap sollicite dailyTotals global avant affichage, cap commun exact avec multiplicité, scratch externe ; pan conserve cap. Suspend libère modèle History. Pipeline ne doit pas dépendre de ces états. |
| Planning isolation | `src/ui/timeline/createTimelineUiCoordinator.ts`, `src/ui/createWorkspaceModeController.ts` | Propriétaires/drafts/DOM Planning conservés par suspend/resume ; modales bloquent navigation. Le replay ne doit appeler aucun Apply/Cancel/rebase ni dispatcher mutation. |
| Publication | `src/main/planning/createRepositoryPlanningDispatcher.ts` : `dispatch`, `savePortfolioSnapshot`, `deletePortfolioSnapshot`, `requireReload` | Candidate → projection privée → CAS → publication ; Save dirty/state/run guard ; retry operationId/capture conservés ; résultat incertain ou commit non réconcilié → recovery. Consultation ne peut publier un Current simulé. |
| Repository | `src/application/persistence/createPlanningRepository.ts` : `writeCurrent`, `readSnapshot`, `createSnapshot`, `stagePortableDocument`, `activateImport` | Préfixes owned/evidence immuables, CAS, receipts avant CAS, lectures validées systématiques et sérialisées ; staging complet puis activation. Pas de certificat de validation de confiance. |
| Persistance physique | `src/application/persistence/repositoryStorage.ts` ; `src/infrastructure/persistence/indexedDbRepositoryStorage.ts` | IDB schema2, storage data1. Stores control/current/snapshotMetadata/snapshotContent/snapshotIdentityRefs/identityReservations/jobs/receipts, index receipts revision. Clés par génération ; ordre metadata createdAt/ID. Pas de store Actuals autonome. |
| Worker / validation | `src/application/persistence/validateStoredSnapshot.ts` : `validateStoredSnapshotContent` ; `src/infrastructure/persistence/snapshotValidationWorker.ts`, `planningStorageWorker.ts` | Hash vérifie intégrité, pas sémantique ; validation complète avec Current. Queue appelante sérialise IO. Worker actuel stocke/valide/projette les captures, ne simule pas. |
| Portabilité | `src/application/backup/flowplanBackupV6.ts`, `flowplanBackupV7.ts`, `flowplanBackupV8.ts`, `portableBackupParts.ts` ; `src/application/persistence/repositoryTransfer.ts` | V6 inputs1/forecast1 ; V7 inputs1/forecast1 ou2 ; V8 inputs1/2 et forecast1/2. Sources partagées transportées avec Current complet ; staging/readback/exports token-bound. |

Les chemins de capture et de History sont donc **à changer ultérieurement**,
pas déjà conformes à inputs-only. Les métadonnées indexées exposent horizon et
versions, pas la présence/les labels de toutes les entités ou les sources.

## 4. Axe A — Matrice de complétude des inputs

Classification : **M** input métier ; **R** référence/donnée historique requise ;
**T** métadonnée technique ; **D** dérivé ; **X** redondance. « Capturée » distingue
inline d'une référence partagée : une référence valide fait partie des inputs.
Les chemins DTO renvoient à `planningInputCodec.ts::encodePlanningInputs`.

| Donnée | Source dans le modèle courant | Capturée actuellement ? | Dépendance historique ? | Nécessaire au replay ? | Écart identifié |
| --- | --- | --- | --- | --- | --- |
| Horizon inclusif [M] | `state.planning.startDate/endDate` | Oui inline planning | Non | Oui | Ne pas prendre horizon référence/viewport History. |
| Working pattern [M] | `planning.workingPattern.workingWeekdays` | Oui inline | Non | Oui, Actuals et Forecast | Aucun calendrier système ; jours hors horizon également utiles. |
| MaxParallelProjects [M] | `planning.maxParallelProjects` | Oui inline | Non | Oui | Partagé mais appliqué par Team, pas depuis settings Current. |
| Teams IDs/noms [M/R] | `portfolio.teams` | Oui toutes | Teams des sources/prefixes | Oui IDs ; noms pour projection | Valider présence historique, y compris anciens participants/retired ; index metadata insuffisant. |
| Capacity periods [M] | `team.capacitySchedule.periods` | Oui, dates et exact dailyCapacity | Non | Oui | Ne pas clipper horizon : Actuals anciens/futurs et Mandatory lookahead. |
| Unavailability ratios [M] | `period.unavailabilityRatio` | Oui si présent | Non | Oui | Absence a sa sémantique actuelle ; aucun défaut Current. |
| Exceptions [M] | `schedule.exceptions` | Oui toutes date/capacity | Non | Oui | Une exception zéro est input ; ne pas la supprimer comme zéro dérivé. |
| Projects IDs/noms [M/R] | `portfolio.projects` | Oui tous | Identités retained | Oui | Présence indépendante de Current et du Forecast. |
| Project requirements / membership [M] | `project.requirements[].teamId` | Oui ordonnés | Participation sélectionnée | Oui | Ordre couplé au validateur participation ; ne pas trier isolément. |
| RAF [M] | `requirements[].remainingWorkload` | Oui exact | Non pour RAF lui-même | Oui | Inputs2 peut diverger du RAF V5/V4 : aucun réalignement. Inputs1 valide l'ancien contrat d'abord. |
| Daily caps [M] | `requirements[].dailyCap` | Oui si présent | Non | Oui | Absent / zéro sont distincts ; garder exactitude. |
| Earliest start [M] | `project.earliestStartDate` | Oui si présent | Non | Oui | Même garde que 11C/Mandatory, sans today. |
| Objective end [M] | `project.objectiveEndDate` | Oui | Non | Présentation ; pas échéance obligatoire à inventer | Conserver distinct de mandatoryDeadline, même divergence legacy valide. |
| Mandatory [M] | `project.mandatoryDeadline` | Oui date si présente | Non | Oui | Pas seulement booléen UI ; préserver la date véritable. |
| Reservations identité / dates [M/R] | `portfolio.reservations` | Oui toutes | Sources Reservation | Oui | Pas de frise Reservation dans 11B ne signifie pas inutile au replay. |
| Allocations Reservation [M] | `teamAllocations` | Oui ratio/fixed-daily exact et Team | Participation sélectionnée | Oui | Recalcul nommé par Team/date avec fonctions actuelles ; pas depuis reserved total. |
| Activation [M] | Project/Reservation `isActive` | Oui, inactifs inclus | Non | Oui | Inactif exclut Forecast, pas Actuals ni priorité ni présence. |
| Priorités [M] | `portfolio.priorityOrder` | Oui exhaustif, inactifs inclus | IDs Project | Oui ordre métier | Position dans forecast [X/D] ne remplace pas cet ordre. |
| Program/Pas [M/R] | catalogs, programId/priorityFamilyId | Oui catalogs utilisés et associations | IDs/noms historiques | Projection complète ; pas priorité moteur distincte | Aucun fallback labels Current ; aucune promesse future sur catalogs orphelins non conservés. |
| Couleurs [M présentation] | Program color / ownColor | Oui | Non | Projection, pas allocation | Séparer digest métier moteur et projection si optimisé ; clé conservatrice peut tout inclure. |
| Source Actuals [R] | V5 terminal, sinon V4, sinon none | Oui `actualsSources` par objet | Tuple exact V5 | Oui | Pas d'ID legacy partagé aujourd'hui ; none explicite n'est pas source manquante. |
| Actuals V5 sélectionnés [M/R] | `owner.snapshots[index]` | Référence, pas copie | Préfixe v1..v sélectionné conservé dans Current | Oui | Résolution encore couplée au conteneur Current ; pas d'archive autonome. |
| Couverture / partition V5 [M/R] | `coverage` / periods from/through/consumed | Via source | Oui | Oui même zéro | Bornes 11C ne proviennent jamais de jours positifs. |
| Participation / retiredZeroTeams [M/R] | snapshot base | Via préfixe | Oui | Validation + sémantique historique | Conserver toutes Teams requises par le préfixe, pas seulement terminal positif. |
| Version/knowledgeDate V5 [R/T] | snapshot base | Via préfixe | Oui | Validation/traçabilité, pas horloge Forecast | Dates internes restent validées ; pas borne Save/today. |
| snapshotId / periodId [R] | snapshots/coverage periods | Via préfixe | Oui | Provenance et validation | Pas IDs recyclés/renumérotés ; changed periods suivent contrat existant. |
| RAF de snapshots Actuals [M historique/X] | `snapshot.raf` | Via préfixe | Oui | Validation historique, pas RAF Forecast inputs2 | Conserver la divergence 11D.1 ; ne pas enlever comme redondance universelle. |
| V4 non réconciliés [M/R] | `legacyV4Actuals ?? actuals` | Evidence complète inline par capture | Pas recherche du legacy Current | Oui | Duplication existante intentionnelle ; intermittence/future-through ne se convertissent pas automatiquement en V5. |
| Provenance RAF legacy [R] | `legacyV4RafAuthority`, `rafAuthority` | Map dans evidence encodée | Inline | Validation de signification, surtout inputs1 | Pas de recompute depuis latest Current ; conservation intégrale après A/B. |
| Migration status [T/R] | source choisie / evidence | Oui dérivé encodé | Source | Dispatch/validation | Redondant mais contraint, ne pas accepter contradictions. |
| Actuals totaux [D/X] | source sélectionnée | Aussi dans forecast | Oui source | Niveau2 les recalcule | Ancien total conservé/validé mais jamais autorité de consultation normale. |
| EAC / priorité affichée [D/X] | Actuals + RAF / priorityOrder | Aussi dans forecast | Oui Actuals pour EAC | Niveau2 | Aucun total profil = EAC si RAF non alloué. |
| Contributions quotidiennes [D] | reconstruction / allocations | Project agrégé schema2 seulement | Source + paramètres | Recalcul niveau3 | Team/Reservation détail absent en capture ; recalcul faisable à démontrer, pas enrichissement du disque. |
| Capacités quotidiennes / diagnostics [D] | dailyCapacitySnapshot / PlanningResult | Non | Inputs ci-dessus | Recalcul niveau3 | Absence souhaitée, pas input manquant. |
| Estimated dates/reasons [D] | helpers Project + run | Oui forecast | Inputs/run | Niveau3 | Capturé ancien non utilisé ; helper courant appliqué. |
| createdAt / snapshotId Portfolio [T/R] | Save explicite | Oui | Identité historique | Métadonnées, pas calcul | Ordre `(createdAt, snapshotId)` ; clocks identiques/rétrogrades autorisées. |
| Inputs/forecast/engine versions [T] | capture / codec | Oui | Contrat legacy | Dispatch validation | Ancien engineVersion est provenance, jamais sélecteur de moteur replay. |
| Occupation / knowledge moteur [D] | reconstruction + source ranges | Non directement | Sources historiques | Oui dérivées | Ne pas injecter les données de la projection Current. |
| Implicites algorithmiques [algorithme] | quantum1/2, fallback distribute, slots/Mandatory, capacité hors calendrier | Non comme settings | Non | Chaîne courante | Ce sont des règles courantes, pas des inputs manquants à fabriquer. Audit doit rechercher tout autre implicite. |
| Curseur, viewport, drafts, tabs, hover [UI] | coordinators/stores | Non | Non | Non | Rien de cette liste ne doit influer sur replay/cache métier. |

**Conclusion limitée :** aucun input direct du PlanningInput courant n'est
identifié comme absent pour une capture valide **résolue**. La matrice ne
prouve ni validité de toutes données déjà stockées, ni coût, ni autonomie
physique. Les futures vues détaillées pourront utiliser noms/associations
conservés et résultats recalculés ; toute nouvelle règle exigeant un nouvel
input historique absent nécessiterait un contrat distinct ou indisponibilité,
pas une valeur Current injectée. Gate : revue champ par champ des factories,
codec, reconstruction et engine, avec test de parité de l'état riche.

## 5. Axe B — Dépendances Actuals immuables partagées

### 5.1 Garanties actuelles et limites

`captureHistoricalInputs` retire seulement les tableaux V5 et garde l'evidence
V4. `hydrateHistoricalInputs` résout le tuple exact dans l'objet owned, copie le
préfixe v1..v, puis décode selon inputs1/2. La validation des préfixes exige
versions consécutives et Teams historiques ; le terminal redevient la source
« courante » **de cet état historique reconstruit**. Les versions postérieures
ne participent ni aux Actuals ni aux contraintes ni au RAF.

`createPlanningRepository::writeCurrent` refuse toute modification d'un élément
owned, perte de préfixe, suppression du propriétaire avec V5/legacy et mutation
d'evidence **y compris sa map d'autorité RAF**. Vérification lourde avant
transaction ; CAS final empêche changement concurrent. Append conserve ancien
préfixe. `createPortfolio` et les commandes de suppression protègent les Teams
des chronologies/participations ; les générateurs Application réservent les
cinq kinds via `historicalIdentities.ts` et les index repository.
`deleteSnapshot` décrémente les réservations d'identités de cette capture,
mais ne collecte aucun Actuals. Ce sont des protections fortes de la trajectoire
normale, plus restrictives qu'un simple comptage de dépendances.

Limites : pas de port d'archive immuable, pas de compteurs de **versions Actuals**
partagées ; `identityReservations` compte les entités, pas les préfixes.
Les sources vivent dans un gros Current ; chaque lecture validée réencode/décode
ce conteneur et peut payer pour des données non pertinentes. Un import complet
remplace une génération, valide toutes ses références internes et ne fusionne
pas avec l'ancienne. La garantie ne couvre pas suppression hors ports,
corruption/quota/éviction du navigateur ni un futur merge/archive/GC non cadré.
Réservation d'identité et préservation de contenu sont deux propriétés distinctes.

### 5.2 Contrat cible de résolution et conservation

Proposer un port Application `HistoricalActualsResolver` sur un read-context
cohérent. Il fournit **un préfixe exact immuable** et son contenu canonique /
empreinte pour `(namespace de génération, kind, objectId, snapshotId)` ; jamais
« latest ». Adapter initial autorisé ultérieurement : conteneur owned actuel,
sans nouvelle archive, sans copy-all par capture. Legacy inline et none restent
explicitement discriminés. Un éventuel store partagé de préfixes serait une
évolution séparée mesurée ; il ne débloque pas implicitement suppression/GC.

Invariants à contractualiser et prouver :

1. Chaque capture retient la fermeture transitive nécessaire : versions v1..v,
   partitions, couvertures même zéro, participation/retired, RAF historique,
   provenance V4/V5, identités Team nécessaires à leur validation.
2. Tant qu'une capture existe, chaque source existe dans son namespace avec
   **même contenu**. Append ou mutation de configuration Current ne la modifie pas.
3. Suppression d'objet dépendant est refusée avec diagnostic ; détacher un owner
   vers une archive n'est permis que par futur contrat atomique explicitement
   approuvé. Aucun détachement/GC n'est nécessaire au premier replay.
4. Aucun tuple ne peut se résoudre vers une autre version ou un owner recyclé.
   Import à même snapshotId dans une autre génération n'est pas la même source.
5. Export autonome contient la fermeture complète une seule fois autant que le
   contrat le permet ; import valide cette fermeture avant activation atomique.
   Pas de dépendance au workspace d'origine ni à une RAM de cache.
6. Source manquante/incohérente : lecture diagnostiquée, données préservées,
   replay indisponible ; ni plus récente, ni dailyProfile comme secours.
7. Le cache ne retient pas juridiquement une dépendance : seul le repository
   autoritaire garantit sa conservation. Delete/import/recovery gardent 11D.0.

L'autonomie logique est satisfaite si lire Current sert seulement à accéder aux
blobs immuables référencés. Elle serait violée si sa capacité, membership, RAF,
working pattern ou dernière connaissance alimentait le replay historique.
Gate critique : capturer H, changer chacun de ces inputs Current et append V5,
puis démontrer mêmes inputs résolus H, même empreinte et même replay canonique.

## 6. Axe C — Contrat de replay et déterminisme exact

### 6.1 Chaîne courante unique

1. Décoder/valider l'artefact selon **son** contrat historique fermé.
2. Résoudre toutes ses sources dans un read-context cohérent, fin au tuple
   sélectionné ; conserver legacy/none explicitement.
3. Décoder les inputs historiques avec leur version, valider les anciennes
   égalités RAF pour inputs1 **avant** représentation Domain courante lossless.
4. `reconstructActuals(portfolioHistorique, workingPatternHistorique)` complet.
5. `actualOccupationFromReconstruction` exact et connaissance Project totale
   via `projectActualsKnowledgeFromPortfolio` sur ce portefeuille résolu.
6. Construire PlanningInput : portefeuille historique **entier**, horizon,
   calendrier, parallélisme, occupation et borne historique. Aucun Project
   filtering avant moteur même si une seule ligne est demandée.
7. `recomputePlanning` / `planPortfolio` de la version installée.
8. Projeter les dates, allocations, contributions nommées Reservation, capacities,
   profils et diagnostics selon helpers courants, avec labels historiques.

La connaissance est dérivée du terminal sélectionné, pas de la dernière version
Current. Coverage jusqu'à T implique tout Forecast Project strictement après T
sur toutes Teams ; garder les guards admission **et** Mandatory de 11C.
Reservations gardent leurs règles actuelles, sans nouvelle borne temporelle.
RAF Forecast = requirements historiques, EAC = Actuals totaux de la source + RAF.
Ne pas soustraire les Actuals une seconde fois. Inactifs gardent leurs Actuals.

### 6.2 Déterminisme à caractériser

Le code métier inspecté emploie Rational/BigInt, dates civiles et fonctions
pures ; aucun besoin d'horloge/viewport observé dans le moteur. Cela reste une
**hypothèse vérifiable pour toute la chaîne**, notamment codecs/ports/adaptateurs.
Horloge Save/export = métadonnée ; elle n'est pas seed ou borne de replay.
Pas de flottants, tolérance epsilon ni formatage décimal dans le calcul métier.

Les tableaux actuels ne sont pas tous canoniquement ordonnés : teams et
contributions/totaux suivent des itérations ; diagnostics suivent Teams et
priorités. Comparer un `JSON.stringify(PlanningResult)` brut n'est pas une
preuve suffisante (quantités opaques WeakMap). Ne pas modifier le moteur pour
rendre la comparaison plus facile.

Proposer un **DTO canonique de résultat métier**, versionné indépendamment de
la capture et non persisté initialement :

- Strings rationnelles réduites `numerator/denominator`, dénominateur positif,
  zéro `0/1`, via `serializeQuantity` / `rationalToCanonicalString` ; dates civiles.
- Schéma fermé avec tous champs PlanningResult : capacities (y compris les deux
  overloads), admissions, allocations, planned/remaining/completion, projected
  ends, deadline statuses/trajectoires et diagnostics ; absent vs null explicites.
- Teams triées lexicalement ID ; projectPlans par Project ID, dates par date ;
  admittedProjectIds **gardés dans l'ordre d'admission métier**. PriorityOrder
  conservé en entrée sans sorting, états de priorité conservés en projection.
- Contributions Actuals triées par kind/owner/Team/date/provenance (recordIndex
  ou snapshotId/periodId), sans perdre multiplicité ni périodes. Zéros peuvent
  être omis dans le profil sparse seulement, pas dans la connaissance/partition.
- Totaux occupation Team/date canoniques, demandes Reservation nommées par
  Reservation/Team/date, profils agrégés Project/date, ranges, totals/dates/reasons.
- Diagnostics triés par tuple code/Team/Project/date, multiplicité préservée.
  N'utiliser cette normalisation qu'après vérifier qu'ordre n'est pas métier.
- Ordre des champs fixe et encoding UTF-8 défini ; identité de chaîne jointe
  au résultat. Comparaison exacte du DTO ; hash seulement accélérateur, pas
  remplacement des assertions détaillées ni certificat de validité.

`canonicalActualsKnowledge` dans `actuals/transition.ts` n’est pas une clé
de replay : son usage normal exclut RAF et identités de périodes, et son tri
`localeCompare` ne définit pas un ordre lexical portable. La canonicalisation
replay doit utiliser un comparateur explicite indépendant de locale, inclure
requirements et provenance nécessaires et préserver ces données ; aucun changement
à cette fonction de transition Current n’est requis par le présent plan.

Ordres sans sens d'allocation à permuter en preuve : Teams, stockage Projects
avec priorityOrder inchangé, Reservations, exceptions uniques, lignes consommées
et RAF par Team lorsque le contrat les traite par ID. Ordres métier à conserver :
priorityOrder, chronologie V4, versions V5, partition contiguë, participation et
requirements/allocations couplés par validation. Permuter un ordre interdit par
le schéma doit produire le refus attendu, pas un nouveau planning silencieux.
Pour requirements/participation, tester une permutation cohérente autorisée et
séparer sa validité de l'absence d'effet sur allocations.

Même inputs résolus + même chaîne + même contrat de projection → DTO identique,
en processus frais, worker et exécution directe, répétitions/permutations valides.
Une nouvelle chaîne peut donner un autre résultat : **aucune gate d'égalité avec
un résultat capturé d'ancien moteur**. Parité avec Current du **même état et même
chaîne** obligatoire ; conservation des anciens bytes est une gate distincte.

## 7. Axe D — Service Application partagé et trois niveaux

### 7.1 Sources et frontières proposées

Noms d'API indicatifs à auditer, pas des fichiers livrés :

```text
PlanningSource = Current | PortfolioSnapshot(snapshotId)
  → SourceReader + HistoricalActualsResolver (read-context / sources immuables)
  → ResolvedPlanningState (inputs + versions + dependency manifest + digest)
  → PlanningBusinessFacts (niveau 2)
  → PlanningSimulation (niveau 3, portefeuille entier)
  → BusinessProjection (DTO immuable, chaîne courante)
  → adaptateurs Timeline ou History → VM → Geometry → UI
```

`Current` obtient un état engagé cohérent ou une candidate **privée** fournie par
le dispatcher Current, avec révision/identité de candidate. Consultation Current
lit le publié, jamais les drafts. Une simulation de candidate ne confère aucun
droit de publication ou de cache comme Current engagé avant son CAS.
`PortfolioSnapshot(id)` lie identité et namespace/read-context à l'ouverture ;
le service résout inputs immuables. Le consommateur ne choisit pas un moteur
historique et n'injecte pas une configuration Current.

Le read-context lie génération/token et tuples résolus. Vérifier son actualité
après les lectures et avant exposition d’un résultat ; changement pendant IO
→ requête obsolète ou nouvelle résolution cohérente, jamais assemblage de plusieurs
révisions. Après calcul sur inputs privés immuables, garder le run réutilisable
par sa clé, mais recontrôler la visibilité source avant publication à une vue.

Séparer `resolve(source, context)`, `readFacts(resolved)` et `simulate(resolved)`
avec outputs readonly et états de disponibilité par niveau. `simulate` peut
être partagé entre plusieurs consommateurs ; ses options de viewport/Project
ne doivent pas changer le run. Extraction d'une projection fine se fait après.

Extraire ultérieurement le noyau métier actuellement dans
`buildPlanningSessionProjection` vers Application, puis laisser Main composer
Timeline VM/Geometry. Domain garde types/règles/factories et ne connaît ni
repository, worker, cache, UI, ni codec portable. Infrastructure implémente
ports/workers ; Main assemble. Le service ne s'appelle pas « History replay »
et n'importe aucun ViewModel ou Geometry History/Planning.

Current conserve `prepare → projection privée → writeCurrent CAS → publish`.
Réutiliser le noyau métier ne remplace aucune garde dirty/run, preuve R1/R2,
receipt, readback token, atomicité ou recovery. Le service de consultation ne
peut appeler session.publish, writeCurrent, Save, Delete ou rebase.

### 7.2 Niveaux et disponibilité

| Niveau | Données | Coût / contrat |
| --- | --- | --- |
| 1 — Metadata | Identité/createdAt, horizon, présence/labels/activation, sources/version | Sans moteur ni reconstruction Actuals. Liste indexée rapide d'abord ; présence détaillée peut nécessiter décodage contrôlé inputs. |
| 2 — Facts | RAF/priorité/contraintes depuis inputs ; Actuals totaux et connaissance depuis source ; EAC exact | Résolution source nécessaire pour Actuals/EAC, pas distribution journalière ni moteur Forecast. Ne pas lire ancien forecast pour ces valeurs. |
| 3 — Simulation | Dates et raisons, allocations Projects/Teams, Reservation demand, contributions Actuals/Forecast, capacities/profils/diagnostics | Reconstruction + moteur courant sur portefeuille entier ; extraction fine et cache RAM. |

Proposer `not-requested`, `queued`, `loading`, `ready`, `unavailable(diagnostic)`
par niveau, et `cancelled/obsolete` comme résultat de requête **sans publication**.
Absence d'entité est distincte de chargement/source manquante/aucune allocation.
Un fait indépendant disponible (RAF/priorité) peut rester affiché si résolution
Actuals échoue, mais pas EAC/Actuals/dates inventés ni comparaison incomplète.
Échec Forecast n'efface pas facts valides. Diagnostic contient étape, capture,
owner/tuple/path et code missing-reference/invalid-input/unsupported-schema/
calculation-failure/resource-unavailable ; conflit de token déclenche relire le
contexte, pas « corruption » ni adaptation des données.

**Gap niveau1 actuel :** SnapshotMetadata n'a pas presence/source manifest ;
refresh lit déjà chaque contenu/summary. Premier jalon : liste/horizon immédiats,
scan décodage inputs sans moteur pour union historique progressif en RAM.
Une extension d'index lightweight entity/source metadata peut être évaluée
après mesures, avec validation/cohérence au Save et staging atomiques, reconstruite
sans réécrire captures anciennes. Pas de summary calculé autoritaire. Ne pas
promettre union complète gratuite ou validation complète depuis un header seul.
Un header reste affichable comme tel si payload/dépendance est invalide.

## 8. Axes E et F — Cache, chargement progressif et Project History

### 8.1 Cache RAM et scheduler

Identité sémantique proposée :
`hash(canonicalResolvedInputs + dependencyContentManifest + calculationChainId
+ businessProjectionContractVersion)`. Inclure tous les paramètres réellement
consommés, sources none/legacy/V5, préfixes nécessaires, RAF requirements,
calendrier/capacité/horizon/priorités/constraints. Première version conservatrice
peut inclure tout DTO résolu (labels/couleurs compris) ; séparer cache moteur et
projection seulement si dépendances exactes prouvées. Aucun snapshotId seul.

`calculationChainId` identifie codecs/adaptation sémantique, reconstruction,
occupation/connaissance, moteur et projecteurs métier. La constante moteur
`PLANNING_ENGINE_VERSION` actuelle ne couvre pas à elle seule tous ces modules.
Proposer manifest de versions + identifiant build fiable ; changements de ces
modules obligent nouvel identifiant et cache miss. Pas de multi-engine replay.

Séparer clé résultat de l'identité requête `(source, namespace, requestEpoch,
publicationToken)`. Le token global protège une lecture CAS cohérente, mais
**n'entre pas aveuglément** dans clé snapshot : une modification Current sans
changement d'une dépendance historique conserve son run. Sur token change,
réacquérir un contexte cohérent, vérifier présence/content manifest, puis
réutiliser la clé existante. Append après la version sélectionnée conserve
empreinte du préfixe. Import/generation/delete change visibilité et namespace ;
aucune réponse d'ancien namespace ne peut publier dans le nouveau.
Current modifié utilise une nouvelle clé si inputs changent ; requête Current
ancienne devient obsolète. No-op engagé peut réutiliser résultat.

Cache dérivé immuable, refcount des consommateurs et déduplication in-flight
par clé ; annuler A ne supprime pas le run attendu par B. Priorité aux snapshots
visibles/focus et à leurs références de comparaison demandées ; autres metadata
ou facts peuvent progresser indépendamment. Pas de préchauffage complet.

Proposer initialement **un worker simulation dédié** avec une exécution active,
queue bornée et déduplication ; ne pas bloquer derrière simulation les opérations
storage validation/import/recovery. Mesurer avant d'augmenter workers : chaque
worker duplique inputs/reconstruction/PlanningResult et BigInt. Queue spéculative
maximum proposé 8 clés, remplacement des demandes obsolètes ; pas de limite
silencieuse sur le nombre de captures stockées. Paramètres à confirmer par gate.

Cancellation logique : retirer tâche non commencée ; marquer requête active
obsolete et ignorer résultats/erreurs à chaque frontière await/publication.
`planPortfolio` est synchrone, donc AbortSignal n'interrompt pas son CPU sans
modification. Ne pas promettre arrêt physique immédiat. Terminer/recréer worker
sur dernier consommateur peut être évalué pour longues tâches, mais seulement
si worker isolé de la persistance et sans résultat partagé encore demandé.

Transport worker : les scalars métier actuels sont opaques/WeakMap-backed,
structuredClone de Domain ne préserve pas automatiquement leur valeur.
Transférer DTO rationnels canoniques et réhydrater via codecs/factories, ou garder
le run dans worker et envoyer des extractions exactes. Vérifier BigInt/Rational
et freeze après transfert ; éviter aller-retour simultané full run + profiles.

Budgets : LRU résultat + projections + in-flight **ensemble** ; coût dépend de
Teams × jours × requirements, trajectoires Mandatory, contributions hors horizon
et longueur BigInt. 32/64 MiB 11D.0 sont budgets estimés de rows/index, pas des
budgets crédibles de PlanningResult sans mesure. Proposer au plus deux full runs
retenus initialement, sous budget mesuré ; privilégier profils/facts exacts
compacts pour History, full run à demande détail. Éviction avant insertion,
pinning limité, erreur explicite si un run dépasse budget ; cache froid reste
calculable selon capacité temporaire, sans prétendre mémoire constante.
Aucun résultat ne devient authority, n'est exporté ni écrit dans capture.

### 8.2 Intégration minimale History existant

Conserver groupes Projects, lignes captures, ordre `(createdAt,id)`, labels et
couleurs historiques, axe et viewport History, clavier/focus/tooltips et
suspend/resume Planning. Pas de renommage Trends, sélection snapshot Planning,
navigation temporelle, refonte ou nouvelle interaction de comparaison.

Adapter les types History pour metadata/facts/simulation séparés : pending
ne signifie pas profile vide ni « legacy sans profil ». Schema1 pourra avoir un
profil **recalculé en RAM** ; le fichier schema1 reste sans profil.
`projectHistoryCapture` devra cesser de lire forecast pour summary/profiles/totals
normaux ; projection métier courante alimentera ces usages. Garder validation
historique de forecast à la frontière d'intégrité, jamais comme résultat affiché.

Actuals journaliers viennent de la reconstruction historique courante ; Forecast
de toutes allocations Project du run ; aggregate multi-Team après simulation.
Totaux sans clipping, coverage indépendante des zéros ; EAC = Actuals+RAF,
jamais somme des seules journées affichées. Inactive conserve Actuals/RAF/EAC
et zéro Forecast. Start/end/reasons et allocation status selon helpers courants.

Comparer présence précédente selon structure 11B : facts quand les deux facts
sont prêts, dates/profils quand les deux simulations de **même chaîne** sont
prêtes. Une précédente présence indisponible reste la référence : ne pas la
sauter comme absente pour fabriquer un autre delta. Aucun mélange ancien calcul
capturé / nouveau calcul. Tant qu'une moitié attend : comparaison pending ;
unavailable → comparaison indisponible avec explication.

### 8.3 Blocage explicite : cap global exact contre lazy

Aujourd'hui `loadCap → dailyTotals → toutes captures` établit le cap commun
sur tous Projects/jours positifs dans la fenêtre X, y compris lignes non visibles.
Avec inputs-only, son exactitude exige simuler chaque état concerné : impossible
de garantir simultanément ce scan exhaustif froid et aucun recalcul exhaustif
systématique à l'ouverture. Un cache RAM chaud ne résout pas la première ouverture.
Le cap ne se déduit pas exactement des seuls RAF/totaux, ni d'anciens profils.

**Gate bloquante avant 11D.5 :** choisir explicitement la portée progressive de
l'échelle, sans simuler tous les snapshots pour afficher la première ligne.
Proposition à arbitrer : une échelle unique commune aux lignes recalculées d'une
cohorte demandée (visible/focus + références de comparaison), valeurs exactes et
policy quantile actuelle, signal « échelle en cours de calcul » pour incomplet,
installation atomique cap + géométries de la cohorte. Une extension de la cohorte impose
recalcul commun explicite ; aucun cap différent par ligne, aucune utilisation
capturée, aucun faux « cap global complet ». Pan garde le cap de la cohorte installée ;
zoom effectif peut demander sa mise à jour. Ce changement de portée du cap
existant nécessite audit et arbitrage utilisateur avant intégration ; la mission
n'autorise pas à le dissimuler comme simple branchement technique.

Alternative gardant cap global complet : metadata/facts rapides et résultats
bloqués jusqu'à calcul global **explicitement demandé**, pas à chaque ouverture.
Cela exige aussi une décision de consultation ; aucune nouvelle interaction
n'est conçue ici. Pas de cache persistant ou échantillonnage approximatif pour
contourner le choix. La structure History reste conservée dans les deux cas.

## 9. Axe G — Captures, compatibilité et 11D.0

### 9.1 Nouveau contrat discriminé proposé

Garder le wire legacy strict, sans lui ajouter un champ. L'adaptateur RAM
représente une union `LegacyCaptured` / `InputsOnly`. Nouvelle capture wire
indicative (versions numériques **non décidées**) :

```text
captureKind: "inputs-only"
captureSchemaVersion: <version de ce nouveau contrat>
snapshotId, createdAt
inputsSchemaVersion: <contrat inputs explicite>
inputs: <DTO métier historique>
actualsSources: <sélection complète, closure résoluble>
```

Pas de `forecast`, pas de `forecast:null`, pas de profil vide artificiel ou de
engineVersion « du Save » obligatoire : aucun moteur n'est source de la capture.
Le résultat RAM porte son calculationChainId. Validation inputs-only exige
structure fermée, exactitude, horizon/identités/catalogs/priorité/membership,
sources complètes uniques, préfixes/evidence et règles du schéma inputs.
Save vérifie dirty/published state et currentRevision comme aujourd'hui ;
réutilise projection Current sans nouveau moteur, mais ne sérialise aucun run.
Retry garde capture/createdAt/operationId. Nouvelle capture visible uniquement
après transaction complète content + metadata + refs + reservations + receipt.

Absent `captureKind` est accepté **seulement** pour l'ancien contrat fermé
reconnu. Présence inconnue/incohérente est refusée ; pas une heuristique
« forecast absent = inputs-only » pour un fichier legacy tronqué.
Inputs2 suffit peut-être pour payload initial avec sources actuelles ; enlever
forecast change contrat de capture, pas nécessairement sémantique d'inputs.
Ne pas incrémenter tous les axes de versions par réflexe.

### 9.2 Compatibilité et indisponibilités

| Format / capture | Validation de l'artefact | Consultation cible |
| --- | --- | --- |
| V1–V5 | Lecteurs et defaults historiques inchangés, V4 sans réconciliation forcée ; pas de capture inventée | Current via chaîne commune ; aucune histoire reconstruite rétroactivement. |
| V6 | Inputs1 + forecast1 fermé et sources exactes, anciennes égalités RAF | Recalcul moteur courant si inputs résolubles ; aucun secours forecast1. |
| V7 | Inputs1 + forecast1/2, dailyProfile2 strict selon ancien contrat | Profils recalculés ; ancien overlap préservé sur disque. |
| V8 | RAF2 Current ; mix inputs1/2 × forecast1/2 autorisé par contrats actuels | RAF capturé independent inputs2 ; mêmes règles de recalcul pour tous. |
| Nouveau inputs-only | Contrat discriminé propre, sans forecast, closure valide | Facts/replay commun obligatoires avant activation de capture en production. |
| Schéma inconnu / missing dependency | Refus import strict/activation ; données stockées préservées et diagnostic lecture | « Recalcul indisponible », metadata encore accessibles quand sûres ; aucune correction automatique. |

Aucune validation de consultation ne doit modifier le payload pour passer une
factory courante. Adapter en RAM uniquement si la signification est inchangée ;
le refus diagnostic est préférable à une conversion qui change cette signification.

Deux validations distinctes : **validité historique de l'artefact** (métriques et
profils anciens restent strictement validés selon leur contrat) et **faisabilité
replay courant** (résolution/reconstruction/simulation). Ne pas appliquer les
nouvelles distributions ou 11C aux profils legacy pour les invalider ; ne pas
relâcher le validateur legacy pour accepter un fichier incomplet. Une capture
valide historiquement peut être non simulable par la chaîne courante : résultat
indisponible, sans mutation. Un échec moteur courant ne doit pas devenir une
réécriture ni, à lui seul, une nouvelle interdiction de conservation legacy.

### 9.3 Repository, index, transferts et transactions

Évolutions futures à couvrir ensemble : `PortfolioSnapshot`/factory,
`validateHistoricalSnapshot`, `validateStoredSnapshotContent`,
`prepareSnapshot`/SnapshotMetadata (captureKind plutôt que forecast obligatoire),
workers validation/storage, `snapshotIdentities`, `portableBackupParts`, codecs,
`repositoryTransfer`, staging/readback/seal, dispatcher Save, readers History.
Maintenir interfaces sans types IDB/UI. Envisager `readResolvedSnapshotInputs`
avec read-context/dépendances exactes plutôt que retourner tout Current à chaque
vue ; validation systématique ne peut être évitée par un cache-certificate.

Clés physiques existantes peuvent contenir un nouvel artefact discriminé sans
nouveau store. Besoin d'évolution metadata/control/compatibilité anciens clients
à prouver ; un nouvel index presence/sources ou archive exigerait schema physique
et plan d'upgrade non destructif séparés. Aucun numéro portable/physique décidé.
**Une enveloppe portable nouvelle est vraisemblablement nécessaire** car V8 et
ses captures ont des champs fermés et les anciens lecteurs n'acceptent pas
inputs-only. Justifier numéro/dispatch/downgrade lors du contrat 11D.3, jamais
élargir silencieusement V8. Refuser export downgrade non représentable.

Imports/exports mixtes transportent anciennes captures **inchangées** et nouvelles
inputs-only avec closure sources ; validation par variant, activation uniquement
après checksums, business validation, readback/indexes/refcounts et job sealed.
Aucun replay exhaustif demandé par import/export normal. Préflight Current
existant et règles de réparation des seuls formats legacy restent distincts des
captures historiques strictes. Même ID dans une autre génération ne redirige
aucune source. Export lie un token cohérent sur toute l'opération.

Conserver CAS complet, receipts lookup avant CAS, atomicité ciblée et publication
post-commit, transactions ne contenant que awaits adapter. Résolution/validation/
hash/calcul hors write transaction ; CAS/recheck final lie candidate au read.
Unknown commit ou commit confirmé non réconcilié latch recovery ; consultation
ne le contourne pas. Versionchange/import/recovery invalident requêtes obsolètes,
pas les données. Aucune purge ni migration destructive ni conversion implicite.

## 10. Axe H — Preuve de faisabilité et caractérisation future

### 10.1 Preuve minimale après audit et autorisation

Construire un harness isolé de la production et des fixtures existantes, selon
l'autorisation alors accordée ; cette mission n'en écrit/exécute aucun.
Utiliser captures valides existantes, inputs riches et schémas mixtes. Résoudre
par fonctions actuelles, séparer noyau du builder dans le harness, comparer au
Current du même état et canoniser via quantities exactes. Un sample non simulable
est un finding documenté, jamais corrigé silencieusement. Livrable : rapport
traçable (SHA/chaîne, cas, sorties exactes, diagnostics, limites), audit des gaps.
Preuve n'est ni déploiement ni autorisation d'activer inputs-only.

### 10.2 Mesures à comparer sur mêmes données et environnement

| Mesure | Isolation requise |
| --- | --- |
| Lecture résultat capturé legacy | IO/checksum/validation historique puis extraction ; coût baseline, pas autorité cible. |
| Résolution inputs | Lecture capture + sources, decode, validation, copie préfixes ; séparer overhead du conteneur Current entier. |
| Reconstruction Actuals | Distribution complète, conservation exacte, occupation et knowledge chronométrées séparément. |
| Simulation complète | CPU moteur pur, sans VM/Geometry ; inclure lookahead Mandatory et trajectories. |
| Extraction d'une vue | Project sparse, demandes Reservation, metrics/facts/dates et caps ; transport/clone et UI distincts. |
| Cache froid | Démarrage frais worker/service, aucun input/result cache ; IO jusqu'à première ligne visible. |
| Cache chaud | Même clé vérifiée, déduplication et extraction ; compter nombre de vrais appels moteur. |

Réutiliser scénarios/dimensions de `scripts/benchmark-storage.mjs` :
S×P×D = 5×20×365, 25×100×730, 100×200×1095, Teams3/5/8 et
Reservations8/30/80. Étendre, dans le futur harness autorisé, P/Teams par Project,
S indépendamment de P/D, horizons1/365/730/1095 et longs, capacités variables,
exceptions, Reservations staggered et full horizon, plusieurs priorités/Mandatory,
activation mixte, sources V4 intermittentes/V5 avec partitions nombreuses,
covered-zero/uncovered, RAF divergent, rationnels 1/3 et longs dénominateurs.
Ajouter petit cas exact oracle et stress hostile, bornes de dates civiles.

`benchmark-history.mjs` mesure présentation de captures synthétiques et ses
quantités complexes ; `benchmark-storage.mjs` utilise aussi des runs synthétiques
pour les captures : **leurs profils ne sont pas des oracles de replay**.
`benchmark-lot11c.mjs` fournit characterization moteur ; réutiliser
`src/main/planning/fixtures/FP2-DTO-2026.10.01.json`,
`lot11c-baseline-overlap.json`, `legacyCapture.fixture.ts`,
`historyTestFixture.ts` et suites reconstruction/capture/RAF/11C comme références
sans les modifier dans cette mission. Le harness doit effectivement appeler
le moteur pour les nouvelles mesures de replay.

Protocole proposé : version OS/navigateur/Node/build/CPU et SHA, seed/cas/horizon,
2 warmups + 10 runs mesurés pour CPU/cache, médiane/p95/max et samples bruts ;
IO/first render à froid en profil/base isolés, taille et schema de chaque cas.
Évaluer main/worker heaps et backing buffers, retained après release/GC laboratoire,
allocations temporaires/clone, queue active/queued, time-to-metadata/facts/profile,
long tasks et latence d'input/pan/Cancel pendant replay. RSS si disponible distingué
des heaps échantillonnés, pas de prétention pic absolu. Même quantité de données
pour comparer ; pas de moyenne masquant rationnels complexes ou erreurs.

Gates performance proposées (seuils de conception, **aucun PASS annoncé**) :

- À l'ouverture, compteur moteur = 0 jusqu'à demande de simulation ; quantité de
  runs liée aux clés demandées, jamais automatiquement S pour produire metadata.
- Sur cas small/target : premier header/liste p95 ≤ 200 ms ; UI main-thread sans
  tâche de calcul métier > 50 ms ; interaction p95 ≤ 100 ms pendant worker actif.
- Cache chaud même clé : 0 run supplémentaire ; transport/extraction mesurés.
  File simulation : 1 active, ≤ 8 clés spéculatives initiales, obsolete non publiés.
- 100 cycles open/request/cancel/close : aucune croissance de tâches/listeners ;
  cache vidé à release sans consommateur, counts/estimated retained = 0 ; mémoire
  retenue après GC laboratoire revient dans tolérance documentée à fixer sur baseline.
- Aucune allocation retenue au-delà des budgets estimés à chaque insertion ;
  rapport des buffers temporaires hors budget. Gros run refusé explicitement si
  non soutenable, pas troncature. Chiffrer budget full run après mesures.
- Simulation cold : publier durées et distributions par dimension ; pas de seuil
  absolu inventé sans mesure. Gate bloquante de 11D.2 : définir ensuite un budget
  accepté de temps/RAM pour target/stress avant service/capture en production.
  Un dépassement ne justifie aucune nouvelle règle d'allocation/approximation.

## 11. Matrice de validation et gates de livraison

Tous les tests ci-dessous sont **futurs**, après autorisation du lot concerné.
Pas de modification des tests/fixtures historiques pour convertir les résultats
capturés en oracles du moteur courant. Ajouter assertions replay séparées ;
conservation anciennes données et nouvelle consultation doivent coexister.

| ID | Cas et variations | Critère mesurable / preuve | Gate |
| --- | --- | --- | --- |
| V01 | Inputs1/2 × forecast1/2 existants, future inputs-only | Dispatch exact contrat ; unknown/extra fields refusés ; aucune obligation forecast nouvelle capture | Contrat/11D.3 |
| V02 | RAF inputs2 différent source V5 et Current, y compris zéro | RAF/EAC/replay suivent requirements capturés ; snapshot Actuals RAF inchangé | Faisabilité/service |
| V03 | Inputs1 ancien RAF lié, legacy authorities | Ancien mismatch refusé avant conversion lossless ; valid capture reste identique | Contrat/persistence |
| V04 | None, old RAF-only V5, covered all-zero/tail-zero, erosion | Facts distinguent none/uncovered/covered ; T exact même sans occupation positive | Faisabilité/service |
| V05 | V5 v1/v2/terminal ancien après append, partitions et retired | Fin exacte du préfixe ; toutes versions/provenances conservées ; 0 source future consommée | Résolution |
| V06 | V4 pending intermittent/positive non-member/future-through puis reconciliation Current | Replay reste V4 figé ; pas V5 créé, aucune double consommation ; dernier through historique | Résolution/11C |
| V07 | Projects multi-Team, ajout/retrait/réintroduction, RAF/caps exacts | Sommes per Team/Project égales totaux ; participation validée avec ordre capturé | Faisabilité/service |
| V08 | Projects inactifs et Reservations active/inactive/zero/no Teams | Forecast absent inactif, Actuals conservés ; occupation Reservation séparée et demandes exactes | Service |
| V09 | Priorités historiques avec inactifs et changement Current | PriorityOrder complet utilisé ; permuter priorité peut changer run attendu, storage Project permutation sans effet canonique | Déterminisme |
| V10 | Capacité/working pattern/exceptions modifiés Current, hors horizon | Replay H inchangé ; poids/résidus/Mandatory issus schedules H exclusivement | Résolution/service |
| V11 | Mandatory multi-Team, earliest, horizon borne9999, capacité/cap zéro | Guards 11C admission/accessibilité ; pas de déplacement post-moteur ; allocations exactes/termination existante | Service |
| V12 | Coverage T autour horizon, zéro/futur/érosion, autre Project admissible | Tout F(P,t,d)>0 ⇒ d>T et d dans horizon ; autres Projects gardent slots/capacité | 11C |
| V13 | Reconstruction/occupation/contributions Reservation et Project | Somme distributions = chaque delta/période ; team totals = occupation ; aucun arrondi ou clipping métier | Déterminisme |
| V14 | Run complet/partiel/inactif, dates/reasons/EAC | ΣForecast ≤ RAF, égalité si tous plans actifs complets ; EAC = Actuals+RAF ; dates helpers exactes | Projection |
| V15 | Même inputs/chaîne, répétitions/processus/worker/permutations valides | DTO canonique intégral strictement identique, pas epsilon ; ordres métier conservés/refus schéma | Déterminisme |
| V16 | Horloge/timezone/cursor/viewport/drafts différents | Même DTO/empreinte métier, aucun accès UI/clock dans noyau | Isolation |
| V17 | Source/Team/version/period absent, payload invalide ou moteur échoue | « Recalcul indisponible » et diagnostic ; 0 fallback, 0 réparation, 0 write ; facts indépendants qualifiés | Service/UI |
| V18 | Ancienne capture overlap / engine différent / schema1 sans profile | Artefact ancien validé selon contrat et inchangé ; nouveau résultat courant peut différer, profile RAM possible | Compatibilité |
| V19 | Consultation metadata/facts/replay/export ; open/close répétés | Captures content/digest/IDs/versions/old results identiques ; aucune mutation repository hors scratch dérivé | Read-only |
| V20 | Comparaison snapshots mixtes, précédente présence pending/unavailable | Même chaîne pour chaque valeur dérivée ; delta dates seulement deux ready ; pas de saut d'indisponible | History |
| V21 | Cache chaud/froid, append V5, Current RAF/capacity change, chain change | Counts moteur exacts ; H reuse après mutation sans dependency change ; Current/chain changed miss ; hash contenu sources inclus | Cache |
| V22 | Requêtes A/B simultanées, focus/scroll/zoom, cancel d'un seul consommateur | Une simulation par clé ; B conservé ; obsolete success/error ne publie ni n'efface nouvel état | Scheduler |
| V23 | LRU oversized/pinned, worker failure/closed | Budget insertion respecté, erreur visible, pas boucle/refus silencieux ; pas résultat partiel présenté ready | RAM |
| V24 | Import/export mix ancien/nouveau V4/V5, mêmes IDs autre génération | Fermeture autonome et ancienne capture lossless ; aucune redirection de source ; downgrade refuse perte | Persistence |
| V25 | Save concurrent Current, double clic/retry, abort/quota/receipt | CAS refuse stale ; receipt même capture avant CAS ; content/meta/refs atomiques ; publish après commit | 11D.0 |
| V26 | Import interrompu/resume/seal/activation, checksum/metadata/index corruption | Pas activation partielle, révalidation systématique, ancienne génération/source préservée | Recovery |
| V27 | Commit uncertain/confirmed unreconciled, versionchange | Latch recovery maintenu ; mutations bloquées ; stale replay ne publie pas ; reload explicite et drafts selon 11D.0 | Recovery |
| V28 | Planning multidrafts invalid/hidden/modal, History pending et retour | Même owner/valeurs/bases/date/viewport/cartes/focus ; aucun Apply/Cancel/rebase/write/recompute Current dû à consultation | UI |
| V29 | Cap commun progressif, empty/zero/long rationnels, pan/zoom | Toutes lignes de la cohorte même échelle installée atomiquement ; aucune valeur capturée/approximative ; portée visible approuvée | Arbitrage/History |
| V30 | Small/target/stress, horizons/partitions/BigInt croissants | Rapport reproductible CPU/retained/temp/UI cold/warm ; seuils §10 et budgets ratifiés respectés ou lot bloqué | Performance |

Gates ordonnées :

- **G0 — audit du présent plan** : matrice/contrats sans substitution ni fallback,
  blockers et séquencement approuvés ; aucune autorisation implicite de coder.
- **G1 — sortie 11D.2 après autorisation de preuve** : V02–V16 démontrés sur cas
  représentatifs, registre complet des formats/cas refusés, transport exact et
  coût sources caractérisés ; rapports performances et budgets ratifiés ; aucun
  gap de source non résolu masqué. Audit indépendant du contrat avant suite.
- **G2 — service** : pipeline partagé, isolation Current/historique, diagnostics,
  déduplication/cancellation/cache/worker et parité Current mêmes inputs ; tests
  existants complets, typecheck/build et gates storage natifs pertinents passent.
- **G3 — persistance** : validation legacy inchangée, nouveau variant fermé,
  mixed portable/IDB, transactions/receipts/recovery prouvés ; capture inactive
  en production tant que G4 manque.
- **G4 — intégration** : affichage legacy uniquement recalculé, tous états,
  comparaison homogène, arbitrage cap exécuté, isolation drafts et navigateur
  1440/390 light/dark ; performance/lazy vérifiés ; indépendamment audité.
- **G5 — activation** : G1–G4 acceptés, clients/formats compatibles et consultation
  inputs-only testée bout en bout avant premier Save utilisateur activé.
  Aucune livraison intermédiaire ne crée une capture sans lecteur opérationnel.

La future campagne utilise `npm run typecheck`, `npm test`, `npm run build`,
`npm run test:portable`, `npm run test:storage` et scénarios audit natifs
appropriés ; nouveaux tests ciblés sont inclus dans total, pas comptés deux fois.
Ces commandes applicatives n'ont **pas** été exécutées pour cette livraison
sans code. Les anciennes preuves citées ne deviennent pas des résultats 11D.2.

## 12. Risques, blockers et arbitrages restants

| Risque / limite | Traitement ou décision requise |
| --- | --- |
| Capture valide mais replay non faisable | Diagnostic explicite ; cartographier cas G1, ne jamais réparer/fallback. |
| Source owned perdue après future suppression/GC | Conservation forte actuelle restrictive ; toute archive/GC ultérieure est séparée et atomique. |
| Current entier rechargé pour un petit historique | Port resolver, mesures prefix/clone ; pas nouveau store avant preuve du besoin. |
| Implicite nouveau input moteur à l'avenir | Versionner le contrat/replay support ; absence = indisponible, aucune valeur Current. |
| Scalar opaque transféré sans valeur | DTO canonique exact + test round-trip worker obligatoire. |
| Version moteur seule insuffisante pour cache | Chain ID couvre reconstruction/codecs/projecteurs ; test d'évolution/invalidation. |
| Tous snapshots recalculés par refresh/cap | Séparer niveaux ; **arbitrage cap bloquant** avant branchement History. |
| Full PlanningResult + reconstruction + VM dupliqués | Worker isolé, extraction, budgets mesurés, LRU et concurrency bornés. |
| Cancellation annoncée comme physique | Marquer obsolete et ignorer ; ne pas toucher moteur pour polling arbitraire. |
| Évolution de format dans V8 fermé | Nouveau discriminant/contrat portable justifié ; anciens readers stricts et préservation. |
| Clients anciens sur nouvelle base | Gate déploiement/compatibilité/recovery ; aucun downgrade silencieux. |
| Capture livrée avant consultation | Gate activation commune, possibilité déployer service legacy d'abord. |

Questions exigeant encore arbitrage **avant les étapes concernées**, aucune
confirmation nécessaire pour préparer/committer ce plan :

1. Échelle History : valider proposition cohorte progressive commune, ou conserver
   global exact sur demande explicite ? Les exigences actuelles ne permettent
   pas les deux garanties froides simultanément (§8.3). Bloque 11D.5.
2. Après mesures G1, accepter quels budgets cold simulation/RAM target/stress et
   seuil de refus explicite ? Seuils provisoires §10 ne sont pas des mesures.
3. Si G1 révèle des anciens inputs historiquement valides non supportés par
   reconstruction courante, confirmer la liste diagnostiquée et la politique
   d'information ; le principe « indisponible, aucun fallback » est déjà acquis.
   Toute extension de sémantique nécessiterait un autre arbitrage, pas une repair.

Choix purement techniques restant à démontrer par audit/mesures (pas arbitrages
métier à redemander) : version portable/physique, index presence, budgets cache,
worker count, extraction DTO/full run, stockage shared archive éventuel.
Planning/Trends : abstraction commune anticipée seulement. Sélection, navigation,
comparaison détaillée, renommage et refonte restent entièrement hors périmètre.

## 13. Découpage proposé et dépendances de livraison

Deux lots ne suffisent pas pour auditer séparément la conservation des formats,
le pipeline/cache et l'intégration progressive. Retenir les noms indicatifs de
la mission, mais **ne pas confondre numérotation et ordre d'activation**.

| Lot envisagé | Travaux détaillés / livrables | Dépendances et sortie |
| --- | --- | --- |
| 11D.2 — Historical Inputs Contract & Replay Feasibility | A inventaire/champ-parité et contrats ; B audit closure V4/V5 et conservation ; C preuve isolée replay courant/canonicalisation/transport ; D cold/warm/CPU/RAM/UI characterization ; E rapport gaps/budgets/contrats proposés et audit | Actuellement plan documentaire seulement ; preuve requiert autorisation distincte. G1 sans modifications de production/persistance/règles. |
| 11D.4 — Historical Simulation Service | A port sources Current/Snapshot résolues ; B extraire noyau commun en préservant Current publication ; C facts/reconstruction/engine/projecteurs exacts ; D worker/scheduler/cache/diagnostics ; E suite exactitude/concurrency/performance | Recommandé **avant activation 11D.3**, après G1 ; peut être livré sur captures legacy uniquement, sans nouvelle capture ni UI sélection. G2. |
| 11D.3 — Inputs-Only Capture & Persistence | A fixer nouveau variant/versions ; B validation/capture dirty/run/revision guards ; C repository metadata/refs/CAS/receipts ; D worker/import/export mixed/staging/recovery ; E tests preservation/atomicité/portable | Contrats G1 ; travail possible en parallèle conceptuel du service, mais activation Save inputs-only bloquée jusqu'à G2 et G4. Pas production inaccessible. G3. |
| 11D.5 — Historical Views Integration | A metadata/facts progressive et row states ; B simulations Project/compares courants ; C arbitrage échelle puis cap/geometries communs ; D focus/loading/unavailable/cancellation ; E drafts isolation et UI/performance audit | Service G2 ; ancien History intégrable avant Save nouveau. Structure existante ; pas Trends. G4. |
| Activation finale (gate de livraison, pas forcément nouveau lot) | E2E Save inputs-only → export/import/recovery → consultation ; vérifier versions clients et autorisation après audit | G1–G4 ; G5 avant tout accès utilisateur au nouveau Save. Si déploiements indépendants impossibles, livrer 11D.3/4/5 ensemble derrière gate. |

Ordre recommandé : **11D.2 → 11D.4 → 11D.5 legacy → 11D.3 activation intégrée**,
ou 11D.3 préparé mais dormant et activation finale groupée. Si maintenir les
numéros dans cet ordre déroute la roadmap, les renommer lors de l'autorisation
future ; le fond est la dépendance lecteur avant auteur, pas le numéro.
Ne pas ajouter un lot fonctionnel Planning/Trends à cette trajectoire.
Pas de conversion d'anciennes captures ni archive merge 11A.1 réactivée.

## 14. Contrôles et livraison documentaire

Contrôles de cette mission : baseline Git ci-dessus, confrontation documents/code,
revue des liens/fonctions et du diff, `git diff --check`, inventaire limité aux
deux Markdown. Aucun test applicatif/benchmark revendiqué. Commit documentaire
et push normal sur la branche demandée, puis vérifier origin 0/0 et working tree
propre. SHA final fourni dans le compte rendu Git, pas auto-inséré dans ce commit.

**Fin de mission : plan soumis à audit ; aucune implémentation 11D.2 ou suivante.**
