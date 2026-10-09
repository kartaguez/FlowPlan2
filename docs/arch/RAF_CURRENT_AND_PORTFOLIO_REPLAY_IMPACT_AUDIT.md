# Étude d’impact — RAF courant et rejeu des Portfolio Snapshots

**Statut : ÉTUDE POUR AUDIT INDÉPENDANT / AUCUNE IMPLÉMENTATION.**

Date : 2026-10-09. Dépôt : `kartaguez/FlowPlan2`.
Branche : `codex/lot11a-portfolio-snapshots`.
Référence documentaire et HEAD examinés :
`cdb022e91889749de7139a375998fe61edd12041`.
Baseline d’implémentation validée 11D.0 :
`8d95f7406ff40a6d2d041b41784a3915173989c8`.

L’analyse initiale a été réalisée strictement en lecture seule, arbre propre.
L’utilisateur a ensuite autorisé sa consignation documentaire, son commit et
son push. Cette autorisation ne démarre aucun développement, n’adopte aucun
contrat proposé et ne constitue pas un plan d’implémentation définitif.
11D.0 reste DONE ; 11D.1 reste PLANNED / NOT STARTED.
Les futurs lots ci-dessous sont indicatifs, sans attribution de numéro.

## 1. Conclusions et périmètre

- Le RAF courant existe déjà par Team dans `Project.requirements`, mais le
  Domain interdit sa divergence avec le dernier snapshot Actuals. La cible
  demande une évolution des invariants et commandes ; une nouvelle structure
  de RAF n’est pas démontrée nécessaire.
- Les Portfolio Snapshots valides contiennent les inputs nécessaires au replay
  avec le moteur actuel, sous réserve de résoudre leurs références Actuals.
  Les schémas de résultats 1 et 2 ne sont pas un obstacle intrinsèque au rejeu.
- Le replay doit recalculer avec la règle courante, sans moteur historique.
  Il ne promet pas l’égalité avec le résultat enregistré sous une ancienne règle.
- Inputs-only réduit le volume des captures mais déplace le coût vers History.
  La résolution Actuals, la simulation globale et les scans du cap doivent être
  évalués avant adoption. Aucune suppression ou migration destructive n’est proposée.

Sources : code à la référence ci-dessus, `docs/canon.md`, `current_canon.md`,
`current_plan.md`, plans/canons 10C.1/10C.2, 11A/11A.2/11B/11C/11D.0 et
`docs/steps/ACTUALS/lot11d1_plan.md`.
Cette dernière référence exclut Domain et stockage de son périmètre UX ; la
séparation fonctionnelle RAF étudiée ici dépasse ce périmètre. Elle ne doit
pas être présentée comme une simple correction de présentation 11D.1.

## 2. Cartographie RAF : autorités et chemins réels

Chemins relatifs à la racine du dépôt. Les fonctions internes sont nommées
explicitement ; les méthodes d’objets retournés sont indiquées comme telles.

| Zone | Fichiers et fonctions exacts | Autorité/comportement |
| --- | --- | --- |
| RAF courant | `src/domain/model/entities.ts` : `ProjectTeamRequirement`, `createProjectTeamRequirement`, `createProject`, `createPortfolio` | `remainingWorkload` par requirement identifié par `teamId`. |
| Protection Forecast | `src/domain/actuals/requirements.ts` : `transitionProjectRequirements` | Refuse l’édition RAF d’une Team déjà présente dès que le Project possède des snapshots ; protège aussi `latest-actuals` legacy. |
| Actuals V5 | `src/domain/actuals/snapshots.ts` : `createProjectActualsSnapshot`, `createSnapshotHistory`, `snapshotId` | Participation, retraits zéro, couverture éventuelle, RAF exact par participant, versions et IDs. |
| Transitions | `src/domain/actuals/transition.ts` : `replaceProjectSnapshot`, `replaceReservationSnapshot`, `replace`, `validateIntent`, `validateTransition`, `canonicalBusiness` | Base, confirmations, identités de périodes, no-op métier exact, historique append-only. |
| Actuals vers Forecast | `src/application/session/planningSession.ts` : `replaceProjectActuals` | Reconstruit les requirements avec le RAF du candidat Actuals. |
| Édition Forecast | Même fichier : `updateProject` | Transition des requirements puis validation Project/Portfolio. |
| Autorité UI | `src/application/session/projectEditViewModel.ts` : `buildProjectEditViewModel` | Présente `latest-actuals` dès qu’il existe des snapshots. |
| Projection Actuals/Forecast | `src/application/session/snapshotActualsViewModel.ts` : `buildProjectSnapshotActualsViewModel` | Expose historique et `forecastRaf` des requirements. |
| Draft Actuals | `src/ui/actuals/snapshotActualsDraftStore.ts` : `fromModel`, `createSnapshotActualsDraftStore`, méthodes `rebase`, `review` | Initialise le RAF depuis le dernier snapshot en priorité ; baseVersion/baseSnapshotId, provenance, branche modale RAM. |
| Parser | `src/ui/actuals/parseSnapshotActualsCommand.ts` : `parseSnapshotActualsCommand` | Intent, IDs inchangés, preuves sélectives, candidat complet. |
| RAF rapide | `src/ui/actuals/createSnapshotActualsCardController.ts` : `createSnapshotActualsCardController`, `applyCardRaf`, `setCardRaf`, `renderQuick` | Apply rapide produit une commande Actuals et confirme les RAF modifiés. |
| Ownership/handoff | `src/ui/timeline/createTimelineUiCoordinator.ts` : `createTimelineUiCoordinator`, `applyProjectUpdate`, `applyReservationUpdate` ; `src/ui/actuals/actualsForecastConflict.ts` : `actualsForecastConflict` | Synchronisation des champs, séquencement des autres éditions, handoff membership. |
| Draft Forecast | `src/ui/project-edit/projectDraftStore.ts`, `createProjectEditController.ts`, `parseProjectEditCommand.ts` | Draft distinct ; exact original des champs untouched ; wiring RAF vers Actuals sous autorité snapshot. |
| Codec | `src/application/backup/planningInputCodec.ts` : `encodePlanningInputs`, `decodePlanningInputs`, `encodeSnapshot`, `decodeSnapshot` | DTO V5, rationnels canoniques, migrationStatus, legacy et historiques. |
| Capture Portfolio | `src/application/portfolioSnapshots/capturePortfolioSnapshot.ts` : `captureHistoricalInputs`, `capturePortfolioSnapshot` ; `src/domain/portfolioSnapshots/portfolioSnapshot.ts` : `projectExactTotals` | RAF courant des requirements ; historiques V5 remplacés par références exactes dans les inputs capturés. |

`createPortfolio` vérifie `ACTUALS_RAF_MISMATCH` : chaque RAF courant doit
égaler le RAF du dernier snapshot Project. Il vérifie également que la
participation du dernier snapshot correspond aux requirements courants.

### Intents existants

- `initial` / `reconcile` : premier snapshot natif ou après legacy.
- `raf-only` : seul le RAF change ; couverture et membership identiques.
- `replace` : périodes hors zone éditée recopiées intégralement.
- `membership` : participation change, partition temporelle conservée.
- `extension` / `erosion` : croissance/réduction de couverture, protection des
  périodes conservées et confirmations sélectives.

Ces intents sont des variantes de remplacement de la connaissance complète,
pas des révisions autonomes du RAF courant.

### Effet exact d’une modification RAF seule aujourd’hui

1. Avant tout snapshot, par Forecast : `update-project` révise les requirements
   sans snapshot, sous réserve des règles legacy.
2. Avant tout snapshot, par RAF rapide Actuals : Apply crée un premier snapshot
   `initial`, éventuellement sans couverture. Il devient source courante,
   y compris face à un legacy conservé.
3. Après le premier snapshot : révision effective par `replace-project-actuals`
   avec intent `raf-only`, ajout d’une version, d’un snapshotId, d’une
   knowledgeDate ; copie de couverture/périodes/participation ; alignement des
   requirements ; recalcul puis publication après commit.

Une valeur exactement équivalente est un no-op : aucune nouvelle version,
projection ou écriture par le dispatcher. Une base périmée est refusée.
Une révision RAF effective accroît donc l’historique Actuals complet sans
nouveau consommé ni nouvelle couverture.

## 3. Incompatibilités démontrées et contrat RAF proposé

| Cible | Existant | Conclusion |
| --- | --- | --- |
| RAF courant identifiable par Team | Requirements | Structure déjà disponible. |
| RAF historique conservé | RAF par version Actuals | À préserver. |
| Révision indépendante des Actuals | `ACTUALS_RAF_IMMUTABLE` puis `ACTUALS_RAF_MISMATCH` | Impossible actuellement. |
| Actuals + RAF remplaçant la connaissance courante | Dernière version et alignement des requirements | Largement existant. |
| Tableau unique cumul Actuals / RAF courant | Champs synchronisés, draft RAF prioritairement snapshot | Ownership/projection/UI à revoir. |
| Replay courant | History lit les résultats enregistrés | Nouveau chemin Application. |
| Inputs-only | `forecast` obligatoire | Nouveau contrat capture/stockage. |

La divergence a été éprouvée en mémoire : une modification de requirement
avec snapshot inchangé est refusée avec
`Current RAF must match the current Project snapshot.`

### Proposition, non adoptée

- `requirements[teamId].remainingWorkload` est l’autorité RAF courante utilisée
  par la simulation.
- `ProjectActualsSnapshot.raf[teamId]` est la connaissance RAF enregistrée avec
  ce snapshot historique.
- Une révision RAF courante modifie les requirements sans ajouter de snapshot
  Actuals ni changer couverture/source.
- Une publication Actuals + RAF ajoute une version et remplace atomiquement
  connaissance Actuals courante et RAF courant.
- L’égalité des RAF est une postcondition de publication Actuals, puis cesse
  d’être un invariant permanent.
- Quantités exactes non négatives, zéro explicite, aucun ancien RAF restauré
  implicitement après retrait/réintroduction.

Domain : revoir `transitionProjectRequirements` et `createPortfolio`.
Pas de nouveau champ RAF démontré nécessaire. Clarifier `rafAuthority` :
origine d’une valeur et interdiction permanente d’édition sont deux concepts
différents. La provenance legacy peut subsister sans verrou permanent.

Conserver séparément le contrat membership : la cible RAF ne justifie pas à
elle seule de supprimer l’égalité participation Actuals/requirements.

| Couche | Changements nécessaires |
| --- | --- |
| Domain | Autoriser divergence, transition Actuals + RAF atomique, retrait zéro et historique exact. |
| Application | Distinguer révision RAF/remplacement Actuals ; conserver prepare → projection → CAS → publish. |
| UI | Lire RAF courant depuis requirements ; tableau Team / Actuals cumulés / RAF courant ; RAF historiques en détails. |
| Drafts | Détecter révision RAF indépendamment de version Actuals ; adapter rebase/review/confirmations. |
| Stockage | Versionner la sémantique acceptant la divergence ; préserver historiques et identités. |

Le cumul de carte somme les périodes de la connaissance courante, jamais les
consommés de toutes les versions.

### Cas difficiles

| Cas | Constat et conséquence cible |
| --- | --- |
| Premier Actuals | Project accepte un snapshot sans couverture ; Reservation exige couverture. RAF seul devrait pouvoir rester sans snapshot. |
| Rectification | Nouvelle connaissance complète, nouveaux IDs pour périodes modifiées ; RAF associé remplace le courant à publication. |
| Érosion | Nouvelle borne utilisée par `/2` ; arbitrer la réaffirmation complète du RAF lors d’une érosion. |
| Membership | Handoff Actuals complet actuel ; indépendance du membership Forecast serait une évolution supplémentaire. |
| Retrait Team | Consommés courants non nuls bloquent ; marqueur retiredZeroTeams et confirmation requis ; vérifier le RAF courant potentiellement divergent. |
| Réintroduction | Pas de retour automatique à un RAF ancien ; confirmer RAF et consommés nécessaires à la partition courante. |
| Legacy V4 | Readonly, autorités persistées ; premier V5 exclusif même sans couverture. Une révision RAF seule ne doit pas déclencher involontairement cette bascule. |
| RAF zéro | Distinct d’absence de connaissance/couverture ; complet sans allocation peut ne pas avoir de date de fin. |
| Changements simultanés | Séquencement actuel RAF/autres champs ; membership via handoff ; définir transactions combinées souhaitées. |
| Concurrence | baseVersion Actuals ne détectera plus RAF indépendant ; CAS protège commit mais le draft doit détecter sa base RAF obsolète. |

## 4. Planning → résultat publié : cartographie complète

| Étape | Fichiers et fonctions exacts |
| --- | --- |
| État | `src/application/session/planningSession.ts` : `PlanningSessionState`, méthodes `prepare`, `publish` |
| Orchestration | `src/main/planning/buildPlanningSessionProjection.ts` : `buildPlanningSessionProjection` |
| Actuals | `src/domain/actuals/reconstruction.ts` : `reconstructActuals`, `distribute`, `actualOccupationFromReconstruction` |
| Borne Project | `src/domain/actuals/projectActualsKnowledge.ts` : `projectActualsRange`, `projectActualsKnowledgeFromPortfolio` |
| Capacités | `src/domain/capacity/calculations.ts` : `effectiveCapacity`, `requestedReservationCapacity`, `reservedCapacity`, `dailyCapacitySnapshot` |
| Simulation | `src/application/planning/recomputePlanning.ts` : `recomputePlanning` ; `src/domain/planning/engine.ts` : `planPortfolio`, `planTeam` |
| Admission/allocation | Moteur : `projectsForTeam`, `isProjectDateEligible`, `selectAdmittedProjects`, `allocateDeadlineProjects`, `allocateFairlyToAdmittedProjects`, `allocateCompleteRounds` |
| Deadlines | Moteur : `deadlineAccessibleCapacity`, `sumDeadlineAccessibility`, `updateMissedDeadlineStatuses`, `recordDeadlineStatuses` |
| Résultats | Moteur : `commitDailyAllocations`, `projectResult` ; `src/domain/planning/contracts.ts` |
| Dates | `src/domain/planning/projectEstimatedDates.ts` : `projectEstimatedStartDate`, `projectEstimatedEndDate` |
| Métriques | `src/adapters/metrics/cursorMetrics.ts` : `calculateCursorMetrics`, `calculateReservationProgressQuantities` |
| Timeline | `src/adapters/timeline/buildTimelineViewModel.ts` : `buildTimelineViewModel` ; `geometry/buildTimelineGeometry.ts` : `buildTimelineGeometry` |
| Profils | `src/application/portfolioSnapshots/captureDailyProfiles.ts` : `captureDailyProfiles` |
| Publication/CAS | `src/main/planning/createRepositoryPlanningDispatcher.ts` : `createRepositoryPlanningDispatcher`, méthodes `dispatch`, `savePortfolioSnapshot` |

- V5 : seul le dernier snapshot sélectionné est reconstruit ; aucune somme des
  versions anciennes. V4 : cumuls transformés en deltas par intervalle.
- Distribution exacte selon capacité effective ; si capacité totale nulle,
  fallback jours ouvrés/exceptions, puis jours civils.
- Actuals des objets inactifs contribuent à l’occupation.
- Disponible = capacité effective − Actuals Project − Actuals Reservation −
  Reservations Forecast, borné à zéro ; surcharges distinguées.
- Reservations Actuals/Forecast additives ; pas de verrou temporel Project
  dérivé de leur couverture.
- Admission selon priorité, maximum par Team, RAF positif, daily cap et date
  éligible ; admission quotidienne figée.
- Allocation Mandatory puis partage normal exact par quantum 1/2, avec
  complétion finale sous quantum.
- `/2` interdit allocation Project à date <= actualsThrough, même consommé zéro.
- Dates/profils dérivés des contributions et allocations ; profils Project
  agrégés et sparse sur jours positifs.

Ne pas tronquer les capacités à l’horizon : reconstruction Actuals et lookahead
Mandatory peuvent requérir des dates extérieures, jusqu’à la deadline.

## 5. Contrat minimal de replay proposé

### Frontière moteur actuelle

`PlanningInput` : portfolio, horizon, workingPattern, maxParallelProjects,
projectActualsKnowledge complet pour tous les Projects, actualOccupation
Team/date séparant Project et Reservation.
Suffisant pour le moteur ; insuffisant seul pour toute la restitution historique,
notamment contributions Actuals par Project et provenance.

### Contrat durable recommandé, non adopté

| Groupe | Informations nécessaires |
| --- | --- |
| Planning | Horizon, jours ouvrés, maxParallelProjects. |
| Teams | IDs, périodes, exceptions, indisponibilités sur tous les intervalles utiles. |
| Projects | IDs, activation, requirements RAF courant/daily caps, priorité, earliestStartDate, mandatoryDeadline. |
| Reservations | IDs, activation, dates, allocations ratio/fixed-daily. |
| Actuals | Source exclusive par objet : none, legacy embarqué, référence V5 exacte résoluble vers connaissance sélectionnée. |
| Restitution | Noms, associations, identités ; objectiveEndDate/couleurs pour les vues correspondantes. |
| Technique | Identité/date capture, version inputs ; version d’exécution dans résultat dérivé. |

Les éléments purement visuels ne sont pas nécessaires au calcul moteur mais
servent à la restitution. Conserver les sources Actuals et refaire reconstruction
et simulation avec le code courant, sans utiliser les profils sauvegardés comme
inputs ni figer les règles de reconstruction.

Résultat distinct :
`captureId + identité inputs/sources + version moteur courant → résultat dérivé`.
engineVersion historique explique l’origine du résultat sauvegardé ; il ne
sélectionne aucun ancien moteur. Exact = mêmes inputs complets et même moteur
courant donnent le même résultat métier exact, pas nécessairement l’ancien résultat.

## 6. Compatibilité des captures anciennes

`hydrateHistoricalInputs` dans `capturePortfolioSnapshot.ts` clone les inputs,
résout kind/objectId/snapshotId, réinjecte le préfixe consécutif, décode strictement
V5. Le préfixe sert aux validations actuelles ; la reconstruction utilise sa
dernière version. Aucun membership courant de substitution.

`src/application/backup/flowplanBackupV6.ts` : V6 accepte forecast schema 1.
`flowplanBackupV7.ts` : V7 accepte forecast schemas 1 et 2. Tous utilisent
inputs V5. inputsSchemaVersion 1 et forecastSchemaVersion sont distincts.

| Catégorie | Captures | Traitement |
| --- | --- | --- |
| 1. Directement rejouables | Inputs conformes actuels, forecast 1/2, références résolubles | Hydratation existante, reconstruction, moteur courant ; profils anciens inutiles au calcul. |
| 2. Adaptation déterministe | Inputs complets à convertir vers futur contrat RAF/replay ; legacy complet ; schéma 1 à enrichir en profils dérivés | Adaptateur versionné, dérivation/recalcul exact ; ne pas prétendre retrouver le profil ancien. |
| 3. Information supplémentaire | Référence/owner absent sans archive, source inconnue, capacités/bornes/allocations manquantes | Diagnostic précis ; aucun zéro/calendrier/snapshot courant inventé. |

Schémas 1/2 ne permettent pas de reconstruire des inputs manquants à partir des
totaux, dates et profils agrégés : ils ne déterminent pas univoquement RAF par
Team, daily caps, capacités, priorités ou occupation Reservation.

### Scénario démontré 11C

Fixture `src/main/planning/fixtures/lot11c-baseline-overlap.json`, source connue
restaurée explicitement comme dans `lot11cTemporalSeparation.test.ts`, puis
hydratation de ses inputs et exécution `/2` :

| Atlas | Résultat enregistré `/1` | Replay `/2` |
| --- | --- | --- |
| Actuals | 2/3 | 2/3 |
| RAF | 4/3 | 4/3 |
| EAC | 2/1 | 2/1 |
| Forecast positif | 2025-01-01 | 2025-01-02 |
| Fin estimée | 2025-01-01 | 2025-01-02 |

La fixture seule ne contient pas l’historique référencé. Sans la source,
hydratation refusée avec `Broken Actuals reference`. La restauration du test
est une donnée connue du scénario, pas une règle d’import autorisant invention.

Stratégie proposée : conserver captures/résultats anciens ; ajouter consultation
recalculée identifiée ; adaptateurs d’inputs explicites ; ne jamais écraser
silencieusement forecast `/1` par `/2`.

## 7. Stockage et performances

### Mesures nouvelles en lecture seule

Node 24.21.0, TypeScript transpilé et exécuté en mémoire via registerHooks,
aucun fichier généré. Un échauffement puis cinq mesures, médiane. Fixtures :
3 Teams, 2 requirements/Project, aucune Reservation, un snapshot Actuals sur
janvier avec 1/3 par Team, RAF 20, sans deadline ni earliestStartDate/objective.
S/P/D = captures/Projects/jours. Une capture mesurée ; totaux S extrapolés par
multiplication identique, pas une génération/lecture de S captures distinctes.

Octets UTF-8 JSON, hors enveloppes/index/digests/overhead physique IndexedDB :

| S×P×D | Inputs/capture | Références/capture | Historiques Actuals une fois | Résumés forecast/capture | Profils/capture |
| --- | ---: | ---: | ---: | ---: | ---: |
| 5×20×365 | 6 296 | 1 901 | 9 661 | 4 682 | 64 161 |
| 25×100×730 | 28 136 | 9 581 | 48 381 | 24 263 | 249 659 |
| 100×200×1095 | 55 736 | 19 381 | 96 981 | 49 043 | 465 521 |

| Cas | Captures actuelles cumulées | Inputs + références cumulés |
| --- | ---: | ---: |
| 5×20×365 | 387 780 | 40 985 |
| 25×100×730 | 7 833 875 | 942 925 |
| 100×200×1095 | 59 289 700 | 7 511 700 |

Réduction potentielle de 87–89 % du volume de ces captures. Ce n’est pas un
gain universel IndexedDB ; historiques Actuals toujours nécessaires et coût
sensible à activité, fractions et taille des inputs.

Coûts par capture, ms :

| P/D | Hydratation | Reconstruction | Simulation | Capture + validation | Résumé History | VM History |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 20/365 | 0,761 | 1,480 | 2,776 | 2,852 | 0,065 | 1,226 |
| 100/730 | 2,639 | 5,720 | 4,886 | 12,548 | 0,241 | 4,746 |
| 200/1095 | 5,638 | 12,369 | 8,684 | 25,609 | 0,405 | 8,522 |

Projection de quatre profils déjà sauvegardés : 0,087 / 0,083 / 0,111 ms.
Géométrie History scénario 11C, quatre Projects/deux captures : médiane
0,077 ms sur dix mesures. Projection/VM/géométrie excluent DOM, peinture,
I/O, validation repository. Aucun nouveau benchmark navigateur.

Méthode de reproduction sans build : charger les modules TS en mémoire ;
partir de `encodePlanningInputs(createDemoPlanningScenario())` ; cloner le premier
Project avec IDs `audit-i`, garder ses seuls catalogues utilisés, retirer
Reservations, définir start 2025-01-01 et end = start + D−1 ; conserver les
3 Teams du demo avec capacité 2/jour, indisponibilité 0, exceptions vides ;
2 requirements RAF 20, un snapshot natif version 1 daté 2025-02-01,
couverture 2025-01-01/31, consommé 1/3 pour chaque requirement ; décoder strictement.
Mesurer séparément hydrateHistoricalInputs, reconstructActuals, planPortfolio,
capturePortfolioSnapshot, projectHistoryCapture et buildProjectHistoryViewModel.
Taille = Buffer.byteLength(JSON.stringify(composant)). Résumés = forecast rows
sans dailyProfile ; profils = tableau des dailyProfile ; historiques = tableau
des snapshots de tous les Projects. Les scripts ad hoc n’ont pas été persistés.

### Mesures navigateur antérieures, non relancées

Source : [11D.0 canon, mesures correctives](../steps/STORAGE/lot11d0_canon.md),
[rapport JSON](../steps/STORAGE/lot11d0_audit_measurements.json).
Fixtures navigateur plus riches et distinctes des mesures Node ci-dessus.

| S×P×D | Ouverture validée/capture | Write Current | Résumés History | Cap global |
| --- | ---: | ---: | ---: | ---: |
| 5×20×365 | 3,5 ms | 1,9 ms | 17,5 ms | 16,8 ms |
| 25×100×730 | 34,8 ms | 5,1 ms | 730,2 ms | 771,4 ms |
| 100×200×1095 | 110,6 ms | 14,1 ms | 8 581,5 ms | 9 349,6 ms |

Mesures historiques locales, pas des garanties de latence.

### Comparaison actuelle / inputs-only

Actuel : inputs + références + résumés + profils ; aucun moteur dans History,
coûts lecture/validation/décodage. Inputs-only : moins d’écriture/stockage de
captures, mais hydratation/reconstruction/simulation à la consultation.
Un Project ne peut pas être rejoué seul : tous les autres Projects/Reservations
peuvent modifier capacité, admission et allocation.

`src/application/history/repositoryHistoryReader.ts` :
`createRepositoryHistoryReader`, méthodes refresh/ensureRows/dailyTotals.
Profils lazy, mais refresh lit les résumés de toutes les captures et dailyTotals
balaie les captures pour le cap. Avec replay, ces scans peuvent devenir séries
de simulations globales. `historyCaptureProjection.ts` : projectHistoryCapture
est aujourd’hui une projection de résultat enregistré ;
`buildProjectHistoryViewModel.ts` : readHistoryMetadata/buildHistoryPresence
ne rejouent pas. Rendu : `src/ui/history/renderProjectHistorySvg.ts` et
`src/adapters/history/geometry/buildProjectHistoryGeometry.ts`.

Cache borné de résultats dérivés à arbitrer, clé inputs/sources/version moteur/
contrat projection. Replay en lecture, sans incrémenter les révisions Current.

### IndexedDB, CAS, V7, identités et lazy History

- `src/infrastructure/persistence/indexedDbRepositoryStorage.ts` :
  openIndexedDbRepositoryStorage/openIndexedDbPlanningRepository, version physique 2.
- `src/application/persistence/repositoryStorage.ts` : huit stores ; Actuals
  détenus dans Current, pas un store d’archives indépendant.
- `createPlanningRepository.ts` : writeCurrent vérifie les préfixes Actuals
  immuables hors transaction, puis CAS final ; readSnapshotContent lit capture
  et Current ; prepareSnapshot produit metadata/digests/références d’identités.
- `validateStoredSnapshot.ts` : validateStoredSnapshotContent contrôle digest
  puis validation métier systématique ; digest seul ne prouve pas métier.
- RAF indépendant éviterait l’ajout Actuals mais réécrirait encore Current
  complet avec historiques. Résolution/validation restent sensibles à leur profondeur.
- `historicalIdentities.ts` : snapshotIdentities/historicalIdentities ;
  identityReservations protège les IDs historiques depuis les inputs, toujours
  nécessaire en inputs-only.
- Backup V7 autonome au niveau document complet : Current contient les
  historiques référencés. Une capture isolée n’est pas toujours autonome.
- `portableBackupParts.ts` : portableBackupParts ; import par captures mais
  texte source conservé, pas un tokenizer UTF-8 totalement streaming.
- Budgets actuels estimés : LRU lignes 32 MiB, index compact 64 MiB ; prévoir
  budget propre pour résultats de replay complets.

## 8. Ruptures nécessitant versionnement ou migration

1. **RAF indépendant : rupture sémantique.** Les lecteurs V5/V6/V7 actuels
   refusent une divergence RAF. Version explicite ou mécanisme de compatibilité
   requis. Les données anciennes peuvent conserver leurs valeurs sans réécriture
   destructive ; migration sémantique à définir.
2. **Inputs-only : rupture structurelle.** forecast obligatoire dans
   PortfolioSnapshot, validateurs et metadata repository. Le retirer sous la
   même version casse les lecteurs : nouveau contrat nécessaire.
3. **Actuals externalisés ou préfixes remplacés par sources sélectionnées :
   migration de stockage**, si retenue. Non nécessaire au premier service de replay.
4. **Membership indépendant : rupture Domain supplémentaire**, distincte du RAF.
5. **History recalculée : rupture fonctionnelle visible.** Dates, profils,
   cap/comparaisons peuvent changer après mise à jour moteur sans changement des captures.

Aucune suppression, conversion persistée ou migration destructive proposée ici.
Ne pas renuméroter/supprimer les anciennes versions RAF-only : elles peuvent
être référencées par des captures et leur intent d’origine n’est pas persisté.

## 9. Arbitrages et futurs lots indicatifs

Décisions métier nécessaires :

- History : enregistré, replay courant, ou deux modes ?
- Confirmation de tous les RAF lors d’une nouvelle connaissance, même inchangés ?
- Rectification/érosion remplacent-elles toujours le RAF courant ?
- Team retirée : absence de requirement ou zéro conservé séparément ?
- Atomicité RAF/membership/autres champs ?
- Audit propre des révisions RAF indépendantes, au-delà des captures Portfolio ?
- Budgets de latence/RAM pour History et cap global ?
- Restitution des captures non rejouables avec résultats historiques disponibles ?

Découpage recommandé non définitif, aucun lot ouvert :

1. Contrats/compatibilité RAF : autorités, legacy, membership, concurrence, versions.
2. Révision RAF indépendante : Domain/Application, atomicité et CAS.
3. Carte Project unifiée : cumuls, ownership drafts, rebase/confirmations.
4. Service replay en lecture : résolution exacte, adaptateurs, 11C, diagnostics.
5. History replay : modes métier, worker, annulation/cache borné, mesures navigateur.
6. Évaluation inputs-only : format futur, export/import, coexistence non destructive.

Le service de replay peut être étudié indépendamment de la refonte physique.

## 10. Vérifications, hypothèses, limites

### Vérifié pendant l’analyse initiale

- Branche/HEAD exacts, arbre propre avant/après analyse.
- Verrous Domain ; version Actuals lors d’une révision RAF effective.
- Sources exclusives et résolution par référence/préfixe.
- Replay 11C `/1` vers `/2`, déplacement Forecast démontré.
- Échec explicite sur référence Actuals absente.
- Volumes/calculs en mémoire séparés ci-dessus.
- **173 tests ciblés PASS, zéro échec**, modules chargés en mémoire sans build disque :
  `src/domain/actuals/snapshots.test.ts`,
  `src/application/session/planningSession.lot10c1.test.ts`,
  `src/application/portfolioSnapshots/portfolioSnapshots.test.ts`,
  `src/application/portfolioSnapshots/dailyProfiles.test.ts`,
  `src/main/planning/lot11cTemporalSeparation.test.ts`,
  `src/application/persistence/validateStoredSnapshot.test.ts`,
  `src/ui/actuals/actualsWorkflow.test.ts`.

Ces vérifications ont précédé cette consignation ; pas de nouveau test ni
implémentation. Les tests ne constituent pas une validation du futur modèle.

### Hypothèses proposées, non adoptées

- Requirements comme unique autorité RAF courant ; RAF snapshots historiques.
- Replay dérivé par seul moteur courant.
- Conservation des captures pendant évaluation inputs-only.

### Non démontré

- Rejouabilité de toutes les données utilisateur : IndexedDB utilisateur non inventorié.
- Performances navigateur de History entièrement recalculée et gain physique IndexedDB.
- Concurrence complète d’une commande RAF indépendante inexistante.
- Parité exhaustive toutes capacités/deadlines/memberships.
- Nécessité d’externaliser les historiques Actuals.
- Adoption métier des contrats, modes History et découpage proposés.

## 11. Synthèse destinée à l’audit indépendant ChatGPT

La séparation RAF est une évolution métier nécessitant une modification Domain
démontrée, probablement sans nouvelle structure persistée de RAF. Requirements
doit rester courant, RAF snapshots historique ; publication Actuals + RAF doit
aligner les deux atomiquement, sans imposer ensuite leur égalité permanente.

Le replay courant est possible pour les captures complètes à sources résolubles.
11C prouve que mêmes inputs donnent volontairement un résultat différent sous
`/2`. Préserver identité/provenance des anciens résultats ; aucune donnée
manquante ne doit être déduite des profils ni remplacée par l’état courant.

Inputs-only apporte un gain mesuré sur fixtures, mais transforme les scans
History en calculs potentiellement coûteux. Priorités d’audit : versionnement,
bases RAF périmées, conservation des sources, distinction enregistré/replay,
et performance du cap global. **Aucune implémentation ni migration commencée.**
