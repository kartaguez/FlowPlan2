# FlowPlan2 V2 — R0 : plan normatif de reconstruction

Date : 2026-10-10. **PLAN ONLY livré pour audit ; aucune implémentation autorisée.**
Point d'entrée unique : [docs/current_plan.md](../../current_plan.md).
Dépôt `kartaguez/FlowPlan2` ; branche de livraison documentaire
`codex/lot11a-portfolio-snapshots` ; baseline auditée
`98737b1521e2877031b7cb0dd2624c268823d51e`.
Branche future proposée : `rewrite/portfolio-versioned`, **non créée par R0 PLAN**.

## 1. Autorité, état et ordre de lecture

Ce document est autonome pour les décisions et contrats nécessaires au lancement.
Il distingue exigences définitives, propositions techniques auditables et preuves
encore attendues. Un plan ne certifie pas une implémentation.

Ordre de lecture obligatoire depuis le point d'entrée :

1. [current_plan](../../current_plan.md), section active : état, prochaine action et arrêt.
2. Le présent plan, intégralement : cible normative V2 et dossier de reprise.
3. [current_canon](../../current_canon.md), section active puis acquis : état du code livré.
4. [architecture_plan](./architecture_plan.md), §3–§6 pour approfondir les contrats et contre-exemples ; appliquer les remplacements ci-dessous.
5. [canon livré](../../canon.md), puis les sources spécialisées §2, uniquement comme patrimoine fonctionnel/visuel et preuve des anciens contrats.

Précédence pour **V2** : décisions définitives du présent plan → contrats conservés
T01–T11/T13–T15 et I01–I23 applicables du plan précédent → acquis livrés compatibles.
Les mentions T12, I22 migration, V1–V7, switch legacy et M01–M04 bloqueurs dans les
archives sont **supplantées pour V2**. Les canons DONE demeurent vrais pour
l'ancienne application ; ils ne sont pas rétroactivement des canons V2.
Toute contradiction nouvelle doit être consignée et auditée avant le lot concerné.

État réel : 11A/11A.2/11B/11C, 11D.0, 11D.1 RAF et UX, 11D.2 **G1 seulement**
sont livrés selon le suivi courant. G1 est une preuve isolée sur fixtures, pas un
service historique de production. V1–V7 ne sont pas commencés ; leur trajectoire
est remplacée par R0–R6. 11D.3–11D.5 ne commencent pas. R1–R6 sont NOT STARTED.
R0 PLAN livre la documentation ; le futur R0 d'initialisation désigne la création
et le squelette après audit/autorisation, et n'est pas réalisé ici.
Prochaine étape : **audit indépendant de ce plan et de sa reprise stateless**,
puis autorisation explicite désignant le SHA et le périmètre à lancer.

Contrôles initiaux effectués avant rédaction : branche exacte, fetch origin
réussi, HEAD identique à la baseline, arbre propre, upstream origin 0/0.
Aucun AGENTS.md dans le dépôt ni dans les parents applicables vérifiés.
Aucun reset, changement de branche ou force-push. Aucun code, format actif,
donnée utilisateur, dépendance ou test modifié. SHA final : commit de livraison
accessible dans Git, communiqué après push ; pas d'auto-référence circulaire.

## 2. Nouvelle trajectoire et décisions définitives

**Option B : reconstruction depuis les contrats avec extraction sélective.**
La branche ancienne reste la référence fonctionnelle, technique, algorithmique,
visuelle et documentaire. Historique Git partagé, aucun merge automatique.
Chaque reprise a une justification, une provenance Git, des imports audités et
une preuve sur les contrats V2. Une classification REUSE n'autorise pas encore
à copier. Aucun adaptateur permanent vers l'ancien modèle pour économiser une
extraction ; ne pas refaire un algorithme correct et indépendant sans motif.

**T12-R remplace T12 : aucune migration automatique V4–V8.** Nouveau dépôt,
Portfolio initial vide, nouveau format exclusivement. Pas de convertisseurs
historiques, workflows de réconciliation legacy, captures legacy, résultats de
simulation persistés dans les PortfolioSnapshots, mode hybride ou autorité
ancienne parallèle. M01–M04 sortent du chemin critique. Ancien Portfolio sauvegardé
séparément, reconstruction manuelle possible. Un outil ponctuel de récupération
éventuel est hors produit et hors dépendances R0–R6, à étudier séparément.
CAS, atomicité, recovery, sauvegarde et import/export natifs restent obligatoires.
L'abandon de migration ne justifie aucune réduction de règles métier.

| Décision | Contrat V2 définitif ; portée conservée ou remplacée |
| --- | --- |
| T01 | IDs opaques stables, versions immuables, propriétaires et filiation explicites, collision divergente refusée. Current seul sélectionne le courant ; terminal/timestamp/latest ne sélectionnent rien. |
| T02 | PlanningSettings et PortfolioOrder séparés/versionnés ; dailyCap PT ; ETC et open/completed PTEC. |
| T03 | Ajustement de dates : même SubPeriodId, nouvelle version. Consommation : nouveau TeamActual versionné. Split : nouveaux IDs ; merge : nouvel ID, toutes sources explicites. |
| T04 | Manifestes de refs exactes, une version par identité requise, fermeture validée ; aucun payload copié, fallback ou index autoritaire. |
| T05 | Restore Project/Reservation sous même identité, nouvelle version existing, revue/confirmation PT/RT et ETC/demandes/catalogues, publication atomique ; histoire intacte. |
| T06 | Hide Team réversible, identifiable et purement visuel, quelle que soit la charge ; calculs/agrégats intacts. |
| T07 | Program/Pas usage-driven ; dernière référence existing retirée → auto-deleted dans la même transaction. Inactive compte ; restore explicite ; noms existing normalisés uniques sans fusion d'identités. |
| T08 | Ordre structurel garde tous Projects inactive/deleted ; filtre seulement en projection, restore au même rang sans déplacer autrui ni réactiver de charge. |
| T09 | knowledgeDate PortfolioSnapshot déclarative obligatoire, ≥ dernière couverture sélectionnée ; distincte de createdAt, égalités et recul entre captures permis. La clause ancienne date inconnue reste une règle d'archive hors V2 neuf. |
| T10 | Nouvelle version AP → tous PTEC rebondés ; completed garde ETC zéro explicitement reconfirmé. Reprise uniquement par reopen explicite. |
| T11 | Raccourcissement : bornes présentées, chaque consommation reconfirmée ; préremplissage uniquement mapping univoque, jamais preuve ; zéro corrigé permis, aucun prorata. |
| T12-R | Dépôt neuf natif exclusivement ; aucune migration/import automatique ni accès en écriture legacy ; robustesse du nouveau stockage maintenue. |
| T13 | Project possède toujours AP stable/version immuable, vide sans dates/SubPeriods/TA ; tous PTEC pointent dessus. Première saisie, zéro compris, nouvelle version couverte. |
| T14 | Décision originale « tous PTEC migrés open, ETC conservé, jamais statut moteur inféré » conservée avec portée migration **inapplicable** sous T12-R. Aucun PTEC migré V2. Création native : open, ETC explicite exact, zéro n'implique pas completed. |
| T15 | Deleted non éditable : restore explicite puis édition ; suppression de nouveau possible ; aucune charge réactivée automatiquement. |

T14 n'est pas remplacée par une migration déguisée. Son invariant de non-inférence
est actif dès R1. La représentation active/suspendu des associations est une
**proposition technique** reprise du plan précédent : R1 doit fixer et prouver
son encodage avant R3/R4 ; effets métier T05/I03 non négociables.

Sources patrimoniales consultées (plans et livraisons à lire ensemble car leurs
anciens statuts intermédiaires peuvent différer du suivi courant) :
[10C.1 plan](../ACTUALS/lot10c1_plan.md) et [canon](../ACTUALS/lot10c1_canon.md),
[11A plan](../PORTFOLIO_SNAPSHOTS/lot11a_plan.md) et [canon](../PORTFOLIO_SNAPSHOTS/lot11a_canon.md),
[11A.2/11B plan](../HISTORY/lot11a2_11b_plan.md), [11A.2 canon](../HISTORY/lot11a2_canon.md),
[11B canon](../HISTORY/lot11b_canon.md), [11C plan](../HISTORY/lot11c_plan.md) et [canon](../HISTORY/lot11c_canon.md),
[11D.0 plan](../STORAGE/lot11d0_plan.md) et [canon](../STORAGE/lot11d0_canon.md),
[11D.1 RAF plan](../ACTUALS/lot11d1_raf_model_plan.md) et [canon](../ACTUALS/lot11d1_raf_model_canon.md),
[11D.1 UX plan](../ACTUALS/lot11d1_plan.md) et [canon](../ACTUALS/lot11d1_ux_canon.md),
[11D.2 plan](../STORAGE/lot11d2_plan.md) et [faisabilité/mesures](../STORAGE/lot11d2_feasibility.md).

## 3. Contrats fondamentaux autonomes

### 3.1 Graphe versionné

Référence logique proposée : `(kind, entityId, versionId)` opaque et exacte.
Chaque version contient uniquement son payload métier, propriétaire immutable et
provenance explicite. IDs réservés à vie ; anciennes versions, même non référencées,
conservées. Hash d'intégrité ≠ preuve métier. Aucun garbage collection métier
prévu dans ces lots. Séquence numérique locale éventuelle = index technique.

| Entité | Propriétaire et payload ; sélection par manifeste |
| --- | --- |
| ProjectSettings | ProjectId ; nom, earliest/objective/mandatory, activation Forecast, existing/deleted, Program/Pas optionnels, ownColor sans Program. |
| ReservationSettings | ReservationId ; nom, bornes inclusives, activation, lifecycle, groupements/couleur. Demandes dans RT. |
| TeamSettings | TeamId ; nom, lifecycle, visibilité indépendante du calcul. |
| TeamCapacity | Identité 1:1 Team ; calendrier entier, périodes, indisponibilités et exceptions, hors horizon inclus. |
| Program / Pas | IDs indépendants ; nom normalisé, lifecycle ; couleur Program. Une ref optionnelle de chaque catalogue par Project/Reservation. |
| PT | Unique couple Project/Team à vie ; extrémités immuables, lifecycle, usage Forecast confirmé/suspendu, dailyCap optionnel exact. |
| RT | Unique couple Reservation/Team à vie ; mêmes garanties, demande ratio OU fixed-daily exacte. Aucun ETC Reservation. |
| ActualPeriod (AP) | Une identité par propriétaire typé Project/Reservation ; absence de couverture explicite ou bornes + refs ordonnées SubPeriods ; knowledgeDate Actuals et provenance. |
| ActualSubPeriod | Propriétaire identité AP ; dates inclusives versionnées ; ajustement conserve ID, split/merge créent IDs/provenance. |
| TeamActual (TA) | Unique couple PT/RT + SubPeriodId ; consommation exacte non négative versionnée ; jamais propriété d'une Team seule. |
| PTEC | Unique par PT, associations exclues conservées incluses ; ETC exact non négatif, ref exacte AP du Project, open/completed ; completed ⇒ zéro. |
| PlanningSettings | Identité globale ; horizon inclusif, weekdays et maxParallelProjects. |
| PortfolioOrder | Identité globale ; tous ProjectId une fois, inactive/deleted inclus. |

Current et PortfolioSnapshot sélectionnent PlanningSettings/PortfolioOrder et les
tables exactes Settings/catalogues/capacités/PT/RT/AP/SubPeriods/TA/PTEC, une version
par identité requise. Liste SubPeriods de AP et table manifeste concordent.
Current a une révision CAS. Snapshot a ID stable distinct à chaque Save,
createdAt ISO UTC réel et knowledgeDate civile déclarative obligatoire.
Pas de déduplication par date/hash. Save réutilise les refs validées, sans moteur
ni versions métier artificielles. Aucun résultat/profil quotidien dans un Snapshot.
Les anciens manifestes Current publiés sont proposés comme provenance technique,
distincts des captures utilisateur ; encodage fixé en R2.

Validation avant publication et après lecture : références présentes et typées,
propriétaires concordants, payloads/schema/intégrité valides, aucun cycle interdit,
doublon ou couple dupliqué ; partition contiguë complète ; grille requise complète
zéro compris ; PTEC/AP alignés ; catalogues existing des propriétaires existing ;
ordre complet ; fermeture de toutes dimensions du calcul, Teams masquées incluses.
La provenance cite d'autres versions sans les substituer à la sélection.
Les indexes (fermeture, usage, ever-nonzero) sont dérivés et reconstructibles.

### 3.2 Transitions et preuves

No-op : aucune version, écriture ou simulation. ETC seul : PTEC nouveau, pas AP/TA.
Consommation seule : TA concernés et PTEC des Teams Project confirmé même si ETC
inchangé ; Reservation sans PTEC. Nouvelle version AP : tous PTEC sélectionnés
rebondés atomiquement, completed et associations exclues inclus.
Preuve liée à identité, refs de base et période candidate ; texte inchangé ou
ancien clic ne vaut pas reconfirmation. Split/merge ambigu impose saisie explicite.
Raccourcissement conserve les portions exclues seulement dans l'archive, aucun
prorata. Extension explicitement demandée saisit toutes nouvelles cellules, zéro
compris ; earliest reculé seul ne crée aucune couverture. earliest incompatible
avec Actuals : commande composite confirmée ou refus. objective/mandatory ne
coupent ni n'étendent les Actuals.

AP vide Project : aucune date fictive, SubPeriod ou TA. Racine sans connaissance
n'impose pas de comparaison artificielle. Couverture ⇒ through ≤ knowledgeDate
Actuals ; dates de connaissance connues non décroissantes sur filiation Actuals.
Snapshot knowledgeDate ≥ max through de tous AP couverts sélectionnés, y compris
inactive/deleted et Teams masquées ; sans couverture aucune borne Actuals mais
date déclarative toujours exigée. Aucun ordre imposé par createdAt ou entre captures.

open + ETC zéro reste open ; complete exige action et zéro confirmé ; completed
+ ETC positif sans reopen est refusé ; reopen explicite choisit ETC ≥ zéro (zéro
permis). Nouvelle AP ne rouvre jamais. Complétion du run ≠ complétion métier.

Une ancienne consommation non nulle interdit tombstone PT/RT/Team même après
correction à zéro : preuve sur **tout** registre, pas seulement captures/Current.
Hide Team permis indépendamment des charges, calculs inchangés. Team historique
tout zéro peut être tombstonée sous validation des références courantes ; aucun
effacement physique. Deleted Project/Reservation exclut Actuals et Forecast
Current sans supprimer en cascade les associations protégées. Restore conserve
ID et rang, revoit chaque association et ETC/demande/catalogue ; aucun Forecast
réactivé par défaut. Les Actuals sélectionnés conservés suivent le lifecycle du
propriétaire ; ils ne sont ni ressaisis ni dupliqués. Restore Team n'active aucun
PT/RT. Réassociation reprend ID couple et complète toute partition actuelle.

Program/Pas : dernier usage existing retiré → tombstone dans même transaction ;
inactive compte. Nom : trim, espaces réduits, clé minuscules locale fr. Unicité
par catalogue existing, deleted ne réserve pas le nom ; créer nom identique crée
un autre ID, restore en conflit exige résolution explicite, jamais fusion.
Couleur effective = Program sélectionné ou ownColor ; pastel dérivé, preview
local, pas de deuxième couleur métier. Program/Pas n'influencent pas priorité.

### 3.3 Calculs conservés et amendements obligatoires

Quantités rationnelles canoniques exactes ; flottants seulement coordonnées et
arrondi de présentation, jamais retour dans Domain. Input fraction/décimal exact,
Apply intact conserve valeur originale malgré affichage arrondi. Dates civiles
sans dépendance DST. Absence ≠ zéro, non couvert ≠ covered-zero.

Capacité : périodes inclusives, gaps zéro, overlap refusé ; weekdays globaux,
capacité effective = capacité × (1−indisponibilité), exception effective prioritaire.
Ratio RT dans [0,1], fixed-daily ≥ zéro = demande par jour, jamais total/ETC.
Sur weekday applicable, ratio utilise capacité effective, fixed exige période
même si capacité nulle à 100% indisponible ; hors weekday aucune demande.
Écart patrimonial à examiner par l'audit : le tableau d'applicabilité du canon
livré indique zéro sans période pour les deux modes, mais
`requestedReservationCapacity` peut produire un ratio positif avec exception sur
weekday sans période. Les tests Reservation examinés ne tranchent pas ce cas.
Aucune règle métier nouvelle n'est décidée par lecture du code : la reprise R3
exige une clarification normative consignée et un oracle exception/gap pour ce
cas avant extraction de la fonction ; ne pas recopier silencieusement l'écart.

Actuals : chaque TA réparti exactement par capacité effective sur **toute** sa
sous-période ; à défaut jours éligibles (weekday ou exception), puis jours civils.
Somme conservée, contributions dérivées, jamais observation quotidienne persistée.
Capacité et pattern issus exclusivement du manifeste choisi, pas de Current.
Forecast de chaque propriétaire commence strictement après son AP.through commun
à toutes ses Teams, covered-zero compris ; pas après knowledgeDate/cursor/horizon.
**Amendement nécessaire : Reservations aussi**, là où l'ancien moteur additionne
encore demande Forecast et Actuals pendant la couverture.

ActualLoad = ProjectActual + ReservationActual ; projectCapacity =
max(0, effective−ActualLoad−requestedReservations). Actuals et demandes non clampés.
actualOver = max(0, ActualLoad−effective) ; reservationOver =
max(0, ActualLoad+requestedReservations−effective)−actualOver.
Overload marginal non compensé entre Teams ; EAC = Actuals + ETC explicite,
pas ETC redéduit depuis profil/consommé.

Admission indépendante par Team/jour, ordre global filtré, N global appliqué par
Team, dailyCap zéro exclut PT, ensemble admis figé toute la journée. Complétion
ou cap ne libère pas de slot. Partage normal exact par tours 1/2 md en priorité,
RAF final inférieur possible, résidu subquantum sinon inutilisé. Redistribution
uniquement dans ensemble admis. Mandatory ne modifie pas admission : faisabilité
conditionnelle par PT avec capacités/caps et trajectoires prioritaires ;
PENDING→FEASIBLE ou UNFEASIBLE, puis MISSED si échéance passée et ETC restant.
UNFEASIBLE ne redevient pas FEASIBLE dans un run ; consommation prioritaire avant
partage normal pour admis. Lookahead peut dépasser horizon ; borne Actuals
appliquée aussi à toute capacité accessible Mandatory, avant calcul.
Diagnostics conservés : TEAM_ACTUALS_OVER_CAPACITY, TEAM_OVER_RESERVED,
PROJECT_REMAINS_UNPLANNED_AT_HORIZON, DEADLINE_UNFEASIBLE, DEADLINE_MISSED.
Erreur validation ≠ diagnostic métier ≠ erreur stockage/service.

UI : continuité FlowPlan1/2, cartes, pastel/couleurs, axe global, une date de
projection, un horizon/viewport/zoom/pan/curseur commun aux Teams. Position
temporelle ≠ taille des glyphes écran. Résultats → ViewModel → Geometry → SVG.
Curseur/zoom/hover ne simulent pas. Tooltip métier et métriques cumulées exactes ;
aucune sélection métier persistée par clic timeline. Zoom ancré à date (ou bord
visible), drag range inclusif, Shift-pan ; respecter le comportement livré.
Draft local par owner, multi-cartes conservées entre modes ; saisie ne dispatch
pas ; Apply ne publie que candidat validé/confirmé ; Cancel son seul owner ;
modal guard et rebase compatible/stale. Refus garde drafts ; reload confirmé
annonce perte des drafts RAM. Accessibilité et responsive doivent être revalidés,
pas supposés acquis par copie de CSS.

## 4. Audit et matrice de reprise

Audit de lecture à la baseline §1 : imports, contrats et suites voisines examinés.
Les chemins sont relatifs à la racine ; tests existants = points d'appui, **non
exécutés en R0 et non certifiés V2**. Aucun module ne reçoit GO de reprise sans
preuves du lot destinataire. REUSE = logique déjà autonome ; ADAPT = extraction
contrôlée ; REFERENCE = comportement/proof à conserver mais architecture neuve ;
DROP = hors nouveau produit. Les suites génériques citées couvrent un groupe,
pas chaque ligne de code. Les absences de preuve sont indiquées.

| Patrimoine / responsabilité (chemins racine) | Dépendances et contrats actuels | Tests existants / preuves | Décision, compatibilité, risque et lot |
| --- | --- | --- | --- |
| `src/domain/model/rational.ts`, `date.ts`, `color.ts`, `horizon.ts` : exactitude/primitives | Domain pur, BigInt/date civile ; aucune UI/IDB | `rational.test.ts`, `date.test.ts`, `scalars.test.ts` ; couleur via entities/visual identity | **REUSE** fonctions pures compatibles ; auditer brands/scalars et dates extrêmes, aucun barrel ancien entraîné ; R1. |
| `src/domain/model/entities.ts`, `scalars.ts` : Portfolio inline/factories | requirements RAF, schedules/catalogues inline, ancien lifecycle | `entities.test.ts`, `scalars.test.ts` | **REFERENCE** pour validations, refaire entités/refs versionnées ; scalars purs extractibles ADAPT ; risque autorité double ; R1. |
| `src/domain/capacity/schedule.ts`, `calculations.ts` : calendriers/capacités | Team ancien + pattern, reservations inline | `schedule.test.ts`, `reservation.test.ts`, engine tests | **ADAPT** fonctions mathématiques à TeamCapacity/RT résolus ; exceptions/applicabilité ne pas simplifier ; R1 spike/R3. |
| `src/domain/capacity/reservation.ts` : ratio/fixed | teamAllocations et ancienne Reservation | `reservation.test.ts` | **ADAPT** validations/maths, nouveau RT et borne propriétaire ; R3. |
| `src/domain/planning/engine.ts`, `contracts.ts` : allocation/ordre/temporalité/Mandatory/diagnostics | Portfolio/ProjectTeamRequirement, RAF et ProjectActualsKnowledge, occupation quotidienne | `engine.test.ts`, `engine.termination.test.ts`, `projectEstimatedDates.test.ts` | **ADAPT** noyau algorithme après nouveau contrat d'entrée pur ; aucune façade Portfolio legacy ; priorité, caps/lookahead et terminaison à reprouver ; R1 vertical/R3. |
| `src/domain/planning/projectEstimatedDates.ts` : dates agrégées | ancien Project/result | `projectEstimatedDates.test.ts` | **ADAPT** garder règle de complétion de toutes Teams, distincte statut PTEC ; R3. |
| `src/domain/actuals/reconstruction.ts`, `projectActualsKnowledge.ts` : distribution/borne | sources V4/V5 via Portfolio, snapshot/recordIndex | `occupation.test.ts`, `snapshots.test.ts`, `src/main/planning/lot11cTemporalSeparation.test.ts` | **ADAPT** extraire distribution exacte ; refaire resolver/provenance TA et bornes Project+Reservation ; risque capacité Current implicite ; R3. |
| `src/domain/actuals/snapshots.ts`, `transition.ts`, `records.ts`, `requirements.ts` : histoires/confirmations | versions consécutives object-scoped, RAF inline, retiredZeroTeams | `snapshots.test.ts`, tests session Actuals et `src/ui/actuals/actualsWorkflow.test.ts` | **REFERENCE** reconstruire AP/SubPeriod/TA/PTEC et preuves par refs ; protection toute histoire et pas zéro automatique ; R1/R4. |
| `src/adapters/metrics/cursorMetrics.ts`, `reservationProgress.ts` : agrégations | Portfolio/result inline, anciennes demandes sur intervalle | `cursorMetrics.test.ts`, `reservationProgress.test.ts` | **ADAPT** sommes/rations exacts, nouveau graph/result et cutoff RT ; cacher Team ne retire pas global ; R3/R5. |
| `src/application/session/planningSession.ts`, `projectCurrentRaf.ts`, `resolveGrouping.ts` : commandes/validations/catalogues | session inline, RAF requirements, générateurs locaux, base RAM | `planningSession*.test.ts`, `lot11d1RafModel.test.ts`, `src/main/planning/realBackupMandatory.test.ts` | **REFERENCE** nouvelles commandes/write sets atomiques, PTEC seule autorité ; préserver no-op/R1/R2 sémantiques ; R4. |
| `src/application/session/editableQuantity.ts`, `formatActualsQuantity.ts`, `exactPercentage.ts` : saisie/formatage | rational/scalars, caches locaux de quantité | `editableQuantity.test.ts`, `formatActualsQuantity.test.ts`, viewmodel tests | **REUSE** logique exacte autonome après vérification imports ; strings arrondies jamais autorité ; R5. |
| `src/application/session/*ViewModel.ts` : éditeurs | DTO du modèle/session ancien | `projectEditViewModel.test.ts`, `teamEditViewModel.test.ts`, `teamReservationsEditViewModel.test.ts` | **ADAPT** DTO natifs refs/bases, aucune reconstruction métier dans UI ; R4/R5. |
| `src/main/planning/createRepositoryPlanningDispatcher.ts`, `buildPlanningSessionProjection.ts`, `src/application/planning/recomputePlanning.ts` : orchestration/simulation | session/repository/capture/projections UI mêlés au composition root | tests homonymes, `planningPersistenceTransaction.test.ts`, `planningBackupOperations.test.ts` | **REFERENCE** pipeline Application indépendant UI, preuve prepare/persist/publish et no-op conservée ; R3/R4. |
| `src/ui/project-edit/`, `reservation-edit/`, `actuals/`, `planning-settings/`, `team-edit/` : drafts/Apply/Cancel/confirms | ViewModels/commands anciens, coordinator/modal shared | `projectDraftStore.test.ts`, `reservationDraftStore.test.ts`, contrôleurs homonymes, workflow Actuals ; canon UX S1–S6 | **ADAPT** lifecycle/formes visuelles, bases refs exactes et preuves invalidées ; stores Actuals structurels **REFERENCE** ; risque stale/cancel inter-owner ; R4/R5. |
| `src/application/persistence/planningRepository.ts`, `createPlanningRepository.ts`, `repositoryStorage.ts` : CAS/receipts/staging | ports typés ancien Current/captures/codecs/legacyRepairs, huit stores | `planningRepository.test.ts`, `repositoryTransfer.test.ts`, tests dispatcher transactions | **REFERENCE** nouveaux ports/read sets/write sets ; **ADAPT** mécanismes CAS/receipt après extraction ; risque publier RAM avant commit/receipt expiré ; R2/R4. |
| `src/infrastructure/persistence/indexedDbRepositoryStorage.ts`, `memoryRepositoryStorage.ts`, `fingerprint.ts` : transactions/hash | schema/stores anciens ; haut fichier IDB couplé validation capture + codecs | repository tests via memory ; `scripts/browser-storage-test.mjs` native, preuves 11D.0 | **ADAPT** primitive transaction/abort/hash, nouveau namespace et schéma ; pas recopier opener complet/upgrade legacy ; résultat inconnu reste recovery ; R2. |
| `src/infrastructure/persistence/planningStorageWorker.ts`, `snapshotValidationWorker.ts` : transport/validation | ancien portable/captures/codecs ; browser Worker | native storage et preuves 11D.0 ; G1 n'est pas preuve worker | **ADAPT** lifecycle/transport, DTO exacts natifs et token/epoch ; copies mémoire/admission à mesurer ; R2/R3/R6. |
| `src/application/history/repositoryHistoryReader.ts`, `historyCaptureProjection.ts`, `src/ui/history/createProjectHistoryCoordinator.ts` : lecture historique | résultats/profile capturés, Current pour sources ancien replay | tests homonymes, canon 11B/11D.0 | **REFERENCE** nouveau service graphe fermé inputs-only ; réutiliser pagination/epochs après extraction ; R6 minimum antérieur. |
| `src/ui/history/createProjectHistoryCache.ts`, `src/infrastructure/persistence/indexedDbHistoryScratch.ts`, `src/ui/interactionLifecycle.ts` : cache/release/listeners | modèles/keys/scratch anciens ; lifecycle générique sans métier | `createProjectHistoryCache.test.ts`, native storage/history, controller tests ; pas suite dédiée lifecycle | Cache/scratch **ADAPT**, lifecycle **REUSE** sous tests intégrés ; budget borne copies/peaks séparément, namespace scratch neuf ; R5/R6. |
| `src/application/backup/portableBackupParts.ts`, `repositoryTransfer.ts`, `src/main/planning/planningBackupOperations.ts` : import/export/recovery | formats V1–V8, legacyRepairs, staging ancien | `portableBackupParts.test.ts`, `repositoryTransfer.test.ts`, backup operations tests, native storage | **REFERENCE** pour protocole autonome streaming/staging/read-back, nouveau codec strict à écrire ; **DROP** convertisseurs/repair legacy ; R2. |
| `src/application/backup/flowplanBackupV*.ts`, `planningInputCodec.ts`, `src/adapters/flowplan1/`, `src/infrastructure/flowplan1/`, `src/infrastructure/backup/localPlanningBackup.ts` | anciens formats/clefs/imports | suites backups V1–V8 et session imports | **DROP** du produit V2 ; restent branche référence, pas de lecture/écriture automatique ; R0 initialisation/R2. |
| `src/domain/portfolioSnapshots/`, `src/application/portfolioSnapshots/` : captures/profils calculés | copies inputs, résultats Forecast, préfixes via Current | `portfolioSnapshots.test.ts`, `dailyProfiles.test.ts`, `snapshots.test.ts` | **REFERENCE** Save/identités/validation, **DROP** profils/résultats persistés et dépendance Current historique ; R2/R4. |
| `src/proof/lot11d2/` : oracles replay/conservation/déterminisme | fixtures V4/V5 et anciennes projections | `replay.test.ts`, mesures/faisabilité 11D.2 | **ADAPT** oracles indépendants et dimensions, fixtures natives neuves, pas import production depuis proof ; R1/R3/R6. |
| `src/ui/renderApp.ts`, `src/ui/portfolio/`, `public/styles.css` : Portfolio/cartes responsive | shell DOM et controllers anciens, IDs/data attributs | `renderApp.test.ts`, grouping/subcard/reorder tests, captures 1440/390 des canons | **ADAPT** langue visuelle/cartes/styles ; shell/coordinator structurels **REFERENCE** ; pas copier demo/startup ; R5. |
| `src/adapters/temporal/temporalGeometry.ts`, `src/adapters/timeline/geometry/geometryNumbers.ts`, `timelineCursorGeometry.ts` : axe/nombres/curseur | données géométriques, dates/rationnels ; pas storage | `geometryNumbers.test.ts`, `timelineCursorGeometry.test.ts`, tests viewport | **REUSE** fonctions pures après audit des types entrants ; aucun float retour Domain ; R5. |
| `src/adapters/timeline/buildTimelineViewModel.ts`, `buildReservationNavigationItems.ts`, `geometry/buildTimelineGeometry.ts` : frises/segments | Portfolio/result/VM anciens | tests homonymes, `allocationGeometry.test.ts`, `capacityTubeGeometry.test.ts`, `markerGeometry.test.ts` | **ADAPT** projection du résultat natif, conserver axe unique et glyphes écran ; R5. |
| `src/ui/timeline/` : SVG, zoom/pan, range/cursor, tooltips/métriques/diagnostics | controllers/VM/geometry/session coordinateur, identities Program/Pas | render/viewport/controller/hitTesting/visualIdentity/cursorMetricsUi tests | **ADAPT** contrôleurs autonomes/renderer ; coordinator géant **REFERENCE** ; revalider dates/tooltips/axes masqués ; R5. |
| `src/ui/renderApp.ts` modales/ARIA, `createWorkspaceModeController.ts`, CSS responsive | DOM/focus/dialog/drafts/modes | renderApp/workspace/controller tests + captures canons ; pas audit accessibilité complet certifié | **ADAPT** focus/keyboard/labels/gates ; navigation clavier/mobile, focus retour et lisibilité nouveaux états à prouver ; R5/R6. |
| `src/main/createPersistentPlanningApplication.ts`, demo, bootstrap | démarre legacy/demo, ancien BroadcastChannel/recovery | tests demo/main/storage natifs | **REFERENCE** composition root neuve vide ; **DROP** auto-import/demo initial/ack legacy ; R0 initialisation/R2/R5. |
| scripts build/test/portable, tsconfig/package | TypeScript strict, Node 24+, DOM/SVG, modules natifs | `scripts/portable-server.test.cjs`, gates anciens | **ADAPT** périmètre sources/artefacts et origine de lancement distincte ; garder outils sans framework ajouté ; R0 initialisation. |

Une reprise future enregistre : fichier/symboles, SHA source, dépendances retirées,
contrat cible, tests adaptés/indépendants et décision de reviewer. Pas de reprise
massive de répertoire ni de cherry-pick de lot mélangeant code et anciens contrats.

## 5. Architecture cible simple et dépendances

Les noms ci-dessous sont des frontières, pas une obligation de packages nouveaux.
Garder TypeScript strict, Node 24+, DOM/SVG/CSS, IndexedDB et workers natifs.
Aucun besoin démontré de framework ou dépendance supplémentaire.

| Module | Responsabilité et contrats exposés | Dépendances autorisées |
| --- | --- | --- |
| Domain | Identités/versions, quantités/dates, graph validation, transitions/preuves métier, lifecycle, invariants ; fonctions pures | Primitives internes seulement ; aucun Application, DOM, browser, IDB, worker. |
| Planning Engine | Input natif résolu immutable, reconstruction exacte Actuals, capacité/admission/Mandatory/allocation/diagnostics ; résultat dérivé | Domain uniquement ; aucune lecture de repo, UI, Current ou horloge. |
| Application | Résolution du manifeste explicitement choisi, commandes/candidat/preuves, no-op, orchestrateur Current, publications CAS, capture et projections sémantiques | Domain + Engine + ports repository/worker qu'il définit ; aucun import de Persistence/UI. |
| Persistence | Implémente ports Application : versions/manifests/index/receipts, memory/IDB, codec natif, staging/export/recovery, intégrité | Domain + types/ports Application ; aucun Engine/calcul métier, DOM ou UI. Validation métier appelée avant transaction. |
| Historical Simulation | Service Application dédié : graph Snapshot fermé, facts/reconstruction/run, identité de chaîne, scheduler/admission/cache/annulation | Domain + Engine + ports Application ; jamais session/Current implicite ni résultat legacy. Pas nouvelle couche générique. |
| UI | Drafts/forms/confirms, ViewModels/geometry/SVG, dates/viewport, History/comparaisons, diagnostics et états loading/refusal | API Application + DTO/primitives de présentation ; aucun repository IDB direct, moteur direct ou autorité métier propre. |
| Composition root | Injecte adaptateurs, worker et modules, choisit namespace/origine ; startup vide/recovery | Assemble les modules ; seule place connaissant UI et Persistence. |

Flux unique : sélection manifeste → fermeture ciblée → validation → input natif
résolu → reconstruction/facts → simulation → DTO exact → VM → geometry → render.
Input moteur ne ressemble pas à un Portfolio legacy en façade : nouveaux champs
PT/RT/PTEC résolus, dates/lifecycle/demandes explicites, provenance du graphe.
Le resolver pur consomme des versions fournies par le port ; le service demande
uniquement les refs du manifeste, pas le registre entier.

Commande : base immutable (refs + expected token) → candidat et preuve → validation
et projection préparées hors transaction → CAS atomique versions/manifeste/index/
receipt → confirmation durable → publication RAM/UI puis rebase des autres drafts.
Aucun parsing, hash, moteur, dialogue ou await non-IDB dans transaction native.
Read-set/write-set et conflits de partage (Program couleur, AP/PTEC) sont explicites.
Conflit n'autorise pas overwrite ; rebase doit refaire validation/proofs affectées.

Une simulation Snapshot reçoit snapshotId + manifeste/refs exactes ; même avec
Current modifié/supprimé/indisponible, résultat identique pour même chaîne. Tests
avec toute lecture Current qui lève. Cache RAM dérivé, clé sélection exacte +
chaîne métier + portée ; token/epoch/requestId empêchent réponse stale publiée.
Pas cache persistant initial, pas simulation de toute l'histoire à ouverture.
Résultats non exportés. Les diagnostics distinguent absent/unknown, graphe cassé,
corrupt/unsupported, transient, ressources insuffisantes et run incomplet.
Budget d'admission estime hors-horizon, lookahead, copies/structures temporaires ;
mesurer CPU/RAM et libération, Current reste disponible pendant History.

## 6. Stockage neuf et protection de l'ancien environnement

**Proposition normative de sécurité : origine V2 dédiée et namespace réservé.**
Une branche Git ne sépare pas les données browser. Même `localhost`/port/URL peut
rouvrir l'ancien dépôt. Préférer origine stable différente (port local/host dédié,
à fixer en R0 initialisation), ancien environnement sur son origine de référence.
Même si origine distincte, les noms V2 restent distincts. Ne pas rendre configurable
un nom de DB pouvant désigner le legacy dans le produit normal.

| Surface | Ancienne autorité constatée | Namespace V2 proposé, à verrouiller en R2 |
| --- | --- | --- |
| IndexedDB principal | `flowplan-planning` schema 2 | `flowplan2-v2-portfolio-versioned` ; schéma physique natif indépendant |
| Scratch IDB | `flowplan-history-workspace` | `flowplan2-v2-history-scratch` ; disposable, jamais autorité |
| localStorage | `flowplan.backup.v1` | Aucun stockage métier localStorage ; préférences éventuelles `flowplan2.v2.ui.*` |
| BroadcastChannel | `flowplan-planning-revisions` | `flowplan2-v2-portfolio-revisions` |
| CacheStorage / SW / autres | Pas mécanisme de produit identifié dans les modules audités | Aucun SW/cache persistant introduit ; si besoin prouvé, prefix `flowplan2-v2-`, scope/origine dédiés ; jamais nettoyage global |
| Fixtures/browser tests | noms configurables legacy et profil browser | DB/profil/origine de test V2 dédiés ; aucun test destructif sur profil réel |

Startup V2 ne détecte, n'ouvre, ne lit, ne migre, n'importe ni n'écrit l'ancienne
DB/localStorage. Aucun `clear()`, `deleteDatabase()` ou cleanup global. Port native
sans readLegacySource/acknowledgeLegacy/fingerprint migration. Si nouveau dépôt
absent, création atomique de versions PlanningSettings/PortfolioOrder vide et
Current vide cohérent, zéro Team/Project/Reservation/Snapshot ; pas de demo injectée.
Valeurs initiales de horizon/weekdays/N = choix de configuration à fixer dans le
contrat R1, explicites et éditables, **pas inférées d'anciennes données**.
Dépôt invalide/inaccessible : conserver bytes, diagnostics/recovery, jamais
remplacer par vide silencieusement. Ouverture concurrente vide protégée par CAS.

Portable autonome proposé : identifiant de format natif distinct de V8, schema
portable séparé du schema IDB, registre de toutes versions/identités/provenances,
Current, tous Snapshots et refs, quantités exactes/absences, checksums ; indexes
reconstructibles, zéro résultat calculé/cache/scratch. Le numéro/encodage/stores
sont livrables R2 auditables, pas reuse de dispatch V4–V8. Import exclusivement
natif, explicite, validation stricte et collisions divergentes refusées ; staging
isolé, read-back fermeture/intégrité, activation génération par CAS tout ou rien.
Interruption/quota laisse autorité publiée intacte, reprise/discard stage contrôlée.
Aucun auto-repair et aucune perte de versions historiques en export/restore.

Recovery : receipt operationId et token consultés avant retry ; `not-applied`
seulement après abort/refus certain, sinon issue unknown bloque nouvelles écritures
jusqu'à réconciliation durable/reload. Receipt expiré ne prouve pas absence de
commit. Deux tabs, postcommit ack perdu et échec publication RAM doivent être
couverts. Recovery natif/export diagnostique restent possibles si simulation
indisponible. Protection ever-nonzero reconstruite/vérifiée lors import/recovery.

**Avant toute bascule opérationnelle (pas exécuté en R0)** : export ancien via
application de référence, conserver original et copie indépendante avec hash,
version/date/source ; exporter séparément localStorage legacy original si présent.
Vérifier décodage complet sous codec d'origine, nombre d'entités/captures, IDs,
valeurs rationnelles et refs ; restaurer dans profil/origine **jetable ancien**, puis
consulter échantillons Current/History et comparer au source. Archiver preuve de
restauration et hash ; un fichier téléchargé seul ne vaut pas sauvegarde vérifiée.
Aucune sauvegarde utilisateur consultée ni vérifiée dans cette mission. Pas de
bascule tant que cet export vérifié n'existe pas. Conservation application ancienne
sur checkout/profil/origine séparés, consultation indépendante ; aucun pont runtime.
Rollback V2 n'importe pas ses données dans l'ancien format.

## 7. Stratégie Git — procédure future, non exécutée

1. Après audit indépendant favorable **et autorisation explicite** : noter SHA
   audité final exact, revérifier branche, fetch, HEAD, arbre propre et origin 0/0.
   Si HEAD a évolué, expliquer le diff et réauditer ce qui affecte la cible ; ne
   jamais substituer silencieusement « latest ». Arrêt si arbre sale/divergence.
2. Depuis dernier commit audité de `codex/lot11a-portfolio-snapshots`, vérifier
   absence locale/remote de `rewrite/portfolio-versioned`. Création future :
   `git switch -c rewrite/portfolio-versioned <SHA_AUDITE>` ; push normal avec
   upstream après commit autorisé. Aucun orphan, reset, force-push ou rewrite.
3. Futur R0 initialisation : remplacer progressivement points d'entrée/build par
   squelette V2 ; désactiver entièrement bootstrap legacy avant exécution browser.
   Une étape intermédiaire peut garder des fichiers anciens pour extraction,
   mais aucun ancien runtime/authority chargé dans V2. Retirer les anciens fichiers
   du build puis du tip par commits reviewables, jamais simplement renommer modèles.
4. Préserver ce plan, trackers et documents normatifs sources avec scope explicite.
   La branche référence et son SHA permettent de retrouver le code et les archives.
   Tenir registre de reprises et contrat→code→test dans chaque livraison.
5. Comparer explicitement `git diff <SHA_REFERENCE>...HEAD -- <chemins>` pour la
   divergence depuis ancêtre ; `git diff <SHA_REFERENCE> HEAD -- <chemins>` pour
   comparer les arbres exacts. Consulter `git show <SHA_REFERENCE>:<chemin>`.
   Extraire symboles après audit ; reprise de fichier entier possible via
   `git restore --source=<SHA_REFERENCE> -- <chemin>` seulement dans lot autorisé,
   après revue des changements locaux/imports, suivie d'adaptation/tests/diff.
   Éviter cherry-pick mélangeant contrats ; aucun merge automatique de référence.

« Branche neuve » signifie nouveau développement, **pas arbre vide** : elle partage
l'historique et commence avec tout l'ancien code. Git ne fournit ni nouvelle DB,
ni séparation builds/origines, ni backup des données browser. Avantages : provenance,
bisect/comparaison, rollback de code ; risques : imports accidentels, confusion
canons/build, outil déployant encore ancien bootstrap, données persistantes partagées,
anciens assets/caches, merges ultérieurs. Les gates R0/R2 contrôlent ces points.
La branche de référence est préservée ; chaque changement ultérieur y reste autonome.
Rollback Git par revert de commits V2 reviewés, jamais reset partagé ; rollback
produit par build V2 compatible et export natif, ancien environnement inchangé.

## 8. Séquencement recommandé et validations verticales

Les numéros restent R0–R6, mais le contenu est fractionné pour éviter les silos :
**R0 PLAN → audit/autorisation → R0 initialisation → R1 tranche verticale mémoire
→ R2 tranche native durable → R3 moteur complet → R4 commandes complètes →
R5 UI complète → R6 History/comparaisons**. R1 n'est pas un Domain exhaustif
attendant tout Storage : petit run réel sur graphe natif avec sélection Snapshot
explicite en mémoire. R2 reprend ce run après commit/reload/export/import IDB.
Minimum capture/consultation par service dès R2/R3 et consultation UI avant
activation Save utilisateur en R5 ; R6 n'est pas un prérequis caché au premier Save.
R1/R2 livrent seulement les commandes nécessaires à leurs preuves verticales,
puis R4 les généralise ; pas des implementations provisoires jetables.

| Lot | Objectif, périmètre et dépendances | Reprises/livrables/tests | GO/NO-GO, risques et rollback |
| --- | --- | --- | --- |
| R0 PLAN (présent) | Cadrage, inventaire, contrats, Git/stockage, reprise stateless ; baseline §1 | Ce document + deux trackers, contrôles documentaires et exercice §11 ; aucun test applicatif | Livrable pour audit, aucun GO implicite d'implémentation. Rollback revert documentaire ; canons anciens intacts. |
| R0 initialisation (futur) | Après GO §12, créer branche/squelette/build et entrée sûre sans legacy ; préserver normes/provenance | ADAPT build, REUSE primitives si périmètre autorisé ; graphe imports et namespace/origine documentés ; smoke squelette et interdiction bootstrap legacy | GO arbre/build séparés, aucune ouverture legacy. NO-GO runtime ancien accessible par défaut. Risque ancienne app au tip/cache ; revert squelette sur branche V2, référence intacte. |
| R1 Domain versionné + vertical mémoire | Après R0 initialisation : types/refs/lifecycle/validators/proofs minimaux mais modèle complet spécifié ; AP/PT/RT/PTEC, Settings/Order ; port read et memory ; un run + une capture sélectionnée natifs | REUSE rational/date ; extraction minimum capacity/allocation ; fixture indépendante une Team, Project, Reservation ratio/fixed, AP vide/couvert, ETC ; contrat entrée moteur natif, registre + Current/Snapshot mémoire, test fin-à-fin exact | GO graphe fermé sans Current implicite, oracle 1/3 Actual + 2/3 ETC = 1 EAC, cutoffs, références immuables, I01–I20/I23 formalisés, I21 pré/postconditions. NO-GO ancienne entité autorité ou suspension incohérente. Risque trop construire Domain ; rollback commits dormants sans donnée utilisateur. |
| R2 Storage natif + vertical durable | R1 ; schémas natifs/codec/IDB/CAS/receipt/staging/recovery/import-export ; commande minimale et Save/lecture service de la petite fixture, pas toute UI | ADAPT transaction/hash/memory/transport ; nouveaux ports/stores/indexes ; run→publish→reload→run→export→import isolated→run ; preuve fermeture/versions archivées, namespaces, two tabs, abort/quota/ack perdu/receipt expiré | GO exactitude et atomicité native, export autonome sans legacy, ancien stockage sentinelle intact, I21/I22-R ; pas PASS hérité memory. NO-GO corruption masquée/unknown traité rollback. Risque quota/copies ; discard staging, garder génération active, recovery/export avant revert compatible. |
| R3 Engine complet + simulation courante/historique minimale | R1/R2, généralisation algorithmique à multi-Team/projets, Mandatory, contraintes, RT cutoff, facts/agrégats, service sélectionné et worker si coût le justifie | ADAPT engine/calendriers/distribution/diagnostics et oracles G1 ; corpus natif exact, fin-à-fin avant/après reload, termination, lookahead/overload, Current getter qui lève pour Snapshot, déterminisme/TZ/process, CPU/RAM/admission/cancellation/release | GO mêmes règles exactes et amendements V2, budgets mesurés fixés avant usage large, résultats complets ou diagnostic qualifié. NO-GO fallback Current/stockage résultats. Risque pics hors horizon ; revert service/engine compatible, repo natif exportable, jamais réécrire captures. |
| R4 Application/commandes atomiques complètes | R1–R3 ; CRUD versionné, dates/partition/Actuals/ETC/complete/reopen, associations/protection, catalogues/ordre/hide/delete/restore, no-op, drafts/confirms/rebase | REFERENCE session/dispatcher, ADAPT éditeurs/bases ; catalogue commandes/read/write sets, preuves typées, tests tous I/transitions, conflits de partage, multi-owner et S1–S6 adaptés, failed commit/RAM | GO tous changements publiés atomiques avec preuves revalidées, aucune charge restore implicite ; NO-GO cascade PT protégé ou hidden numeric edit. Risque périmètre dense ; sous-lots auditables commandes, revert UI/commande en conservant versions écrites et lecture/export. |
| R5 UI et consultation minimale | R3/R4/R2 ; shell Portfolio/cartes/modales, timeline/metrics, AP/ETC/status et nouveaux lifecycle, Save + consultation Snapshot minimale, export/import/recovery visibles | REUSE geometry/lifecycle/format exact, ADAPT render/controllers/CSS ; captures 1440/390, clavier/focus/touch, one-axis, masquées visibles au contrôle, no-run typing/cursor/zoom, dirty multiowner et refused/stale tests natifs | GO continuité visuelle et nouvelles règles compréhensibles, capture immédiatement consultable par service, mobile/keyboard/drafts ; NO-GO bouton Save sans consultation ou résultat ancien. Risque régression UI couplée ; rollback build V2 vers consultation minimale, préserver/exporter repo ; pas retour autorité legacy. |
| R6 History/comparaisons | R2–R5 ; pagination/discovery/facts/results et comparaison stable ID, présence unknown≠absent, sources/chaines/indisponibilité, cap exact pour portée annoncée | REFERENCE reader/history, ADAPT cache/scratch/epochs/geometries ; tests graphes indépendants, mêmes dates distinctes, delete/restore, précédentes présences, cold/warm/cancel/navigation/release et disponibilité Current | GO comparaisons exactes et budgets intégrés, pas full-history simulation opening. NO-GO cap global exhaustif prétendu après chargement partiel. Risque coût/quota et sens comparaisons ; désactiver vues avancées, garder consultation minimale de tous Snapshots. |

Chaque lot : plan précis audité et autorisation distincte, SHA entrée, diff borné,
registre extraction, table contrat→code→test, oracles indépendants et mesures
brutes, limites, rollback testé ou limite déclarée. Suites adaptées à exécuter
seulement lors implémentations : typecheck/test/build, portable/storage selon lot,
scénarios natifs nouveaux. Aucune suite passée ancienne ne certifie V2.
Choix de détails encore ouverts : encodage opaque/parents/suspension et defaults
R1 ; numéros/stores/indexes/export R2 ; budgets/DTO/scheduler R3 ; cap scope et
restitution comparaison R6. L’écart métier code/canon exception sans période (§3.3)
nécessite clarification normative avant la reprise R3, sans arbitrage silencieux. Ces choix techniques ne rouvrent pas T ni les I.

## 9. Traçabilité des invariants conservés

Tous sont confirmés selon portée ci-dessous. I22 historique n'est pas applicable
au nouveau produit ; sa robustesse est reprise sous **I22-R**, pas déclarée
« migration réussie ». T12-R est la cause explicite de cette exception de portée.
Propriétaire primaire + collaborations et preuves futures, jamais résultat R0.

| ID et maintien | Propriétaire cible / lots | Tests et contradiction de séquencement résolue |
| --- | --- | --- |
| I01 partition contiguë maintenu | Domain R1 ; Application R4 | Gaps/overlap/bornes/bissextile/refs permutées refusés ; contraintes dès graphe minimum. |
| I02 cellule complète zéro compris maintenu | Domain R1 ; Application R4 | Matrice associations×SubPeriods, absence/doublon/zéro et réassociation ; pas grille partielle dans spike. |
| I03 PT/RT historique non-zéro protégés maintenu | Domain R1, Persistence index R2, Application R4 | Positif→zéro→retrait refusé, versions non référencées et captures supprimées ; jamais scan captures seules. |
| I04 Team protection/hide maintenu | Domain R1/R4 ; UI R5 | Historique positif interdit tombstone, tout zéro et refs valides autorise ; hide avec ETC/RT positif garde agrégats/run ; visibilité distincte. |
| I05 correction TA + ETC Team maintenu | Domain/Application R1/R4 | Team ciblée et PTEC confirmé, autre inchangée ; proof stale refusée ; Reservation pas ETC. |
| I06 partition + confirmations maintenu | Domain R1 / Application R4 | Split/merge/dates, toutes confirmations y compris completed et PT exclu ; contrat défini avant UI. |
| I07 PTEC tous AP courant maintenu | Domain R1 / Application R4 | AP autre propriétaire/version/PTEC oublié refusés ; tous refs atomiques R2 ; pas égalité RAF legacy. |
| I08 completed zéro/reopen maintenu | Domain R1 ; Engine R3 ; Application R4 | ETC positif completed refusé, open zéro reste open, reopen explicite zéro/positif, AP rebond sans reopen ; statut run séparé. |
| I09 demandes Reservation indépendantes maintenu | Domain R1 / Application R4 / Engine R3 | Correction consommé conserve demande RT exacte ; aucun ETC ou recalcul config implicite. |
| I10 Forecast après Actuals maintenu | Engine R1 minimum/R3 complet | T exclusive Project ET Reservation, covered-zero, toutes Teams, Mandatory/lookahead/deadline ; dès vertical R1, pas différé R6. |
| I11 inactive vs deleted maintenu | Domain/Application R1/R4 ; Engine R3 | inactive garde Actuals, deleted exclut facts/occupation/forecast ; Snapshot ancien inchangé ; pas filter UI seul. |
| I12 restore existing nouveau maintenu | Domain R1 / Application R4 | Même ID/rang, version nouvelle, revue PT/RT/charges/catalogues, refs bytes anciens intactes ; aucun restore auto. |
| I13 restore Team sans associations maintenu | Application R4 | Settings seule, PT/RT non réactivés, aucune demande/ETC revenant ; UI après commandes. |
| I14 réassociation stable/couverture maintenu | Domain R1 / Application R4 | Cycles retrait/reassociation : même ID couple et cellules sur toute nouvelle partition ; I03 bloque retrait positif. |
| I15 earliest borne Actuals maintenu | Domain R1 / Application R4 | earliest absent/égal/au-delà, composite ou refus, objective/mandatory sans clipping ; cas M01 devient négatif natif. |
| I16 raccourcissement reconfirmé maintenu | Domain R1 / Application R4 | Pas prorata, chaque TA reconfirmé même zéro, portion exclue archive seule, atomique AP/PTEC/Settings. |
| I17 extension début saisie explicite maintenu | Domain R1 / Application R4 | earliest reculé seul ne crée rien ; nouvelle zone exige cellules confirmées, aucun zéro propagé automatiquement. |
| I18 objective sans extension auto maintenu | Application R4 | Seule ref Settings change, AP/TA inchangés, aucune publication draft Actuals ; preuve comparaison refs/no-run injustifié. |
| I19 graphes complets maintenu | Domain resolver R1, Persistence R2, Historical Simulation R3/R6 | Refs manquantes/kind/collision/cycle, résolution Snapshot avec Current inaccessible, suppression/restauration Current ne modifie résultat ; service minimum avant Save UI. |
| I20 capacités versionnées sélectionnées maintenu | Domain/Engine R1/R3, Historical Simulation R6 | Même TA avec capacités/pattern différents : conservation exacte mais distribution différente ; aucun latest fallback, exceptions hors horizon. |
| I21 CAS/recovery atomique maintenu | Application protocole R1/R4, Persistence R2 | Deux tabs, abort, quota, ack perdu/postcommit/RAM failure/receipt expiré ; R1 memory ne certifie pas native. |
| I22 migration V4–V8 hors portée → I22-R natif robuste | Persistence/Application R2 | Rejet format legacy, staging/import natif tout-ou-rien, interruptions/quota/CAS, read-back et export/restauration autonome ; ancien bytes sentinelles intacts. Pas bloqueurs M01–M04. |
| I23 knowledgeDate déclarative ≠ createdAt maintenu | Domain R1 ; Persistence R2 ; UI R5/R6 | max coverage y compris zéro/deleted, AP vide sans borne, captures même date/horloge reculée/IDs distincts ; aucune date legacy inventée car pas migration. |

B01–B19 du plan précédent restent contre-exemples utiles sous contrats ci-dessus.
B10/B20–B23 et M01–M04 restent archives migration, **pas gates V2** : dériver tests
natifs earliest invalide, connaissance requise absente, split/merge sans provenance,
retrait historique positif interdit. Ne pas injecter fixtures legacy dans produit
pour préserver un ancien comportement. Une nouvelle capture invalide doit être
refusée ; import ne peut inventer preuves/dates/lignées.

## 10. Risques et dépendances résiduels

| Risque | Mitigation / gate propriétaire |
| --- | --- |
| Confusion cible/livré, canons archives contradictoires | Point d'entrée et précédence §1 ; trackers anciens explicitement archives ; audit stateless §11. |
| Copie ancienne autorité via barrel/DTO/worker | Registre extraction/import graph R0/R1 ; pas facade legacy, fonctions isolées et tests V2. |
| Protection toute histoire coûteuse | Index ever-nonzero reconstructible, jamais autorité alternative, vérifié import/recovery R2 ; coût validation mesuré. |
| Restore protégé vs réactivation implicite | R1 fixe encoding actif/suspendu avec I03/T05 ; R4 prouve pas cascade et confirmations ciblées. |
| Applicabilité ratio avec exception sans période : code/canon divergent | Audit normatif avant extraction R3, oracle explicite §3.3 ; pas de règle inférée du code. |
| Divergence engine/metrics Reservation cutoff | Entrée propriétaire commune, oracle quotidien R1/R3 et agrégations exactes R5. |
| CAS résultat inconnu / UI désynchronisée | Receipts/read-back/recovery, RAM publication après confirmé, refus garde drafts R2/R4. |
| CPU/RAM/quotas, archives conservées | Admission avant dense/lookahead, copies mesurées, pagination/cache borné/release R3/R6 ; quota physique/eviction restent à caractériser, export obligatoire. |
| Démarrage branch partageant code et stockage browser | Bootstrap natif seul, origine/namespace distincts, sentinelles legacy et build audit R0/R2. |
| Perte ancien Portfolio à bascule | Export original + restoration vérifiée indépendant, profil/origine ancien conservés §6 ; aucune sauvegarde prétendue faite ici. |
| Snapshot créé avant service consultable | Service minimum R2/R3, gate Save UI R5 ; R6 avancé seulement ensuite. |
| Continuité visuelle sans accessibilité | Captures anciennes référence, tests clavier/focus/mobile et drafts nouveaux R5, pas framework requis. |
| Travail Domain/Storage trop long sans feedback | Vertical exacte mémoire R1, durable R2 ; sous-lots courts avec contrats stables, aucune autorité provisoire parallèle. |

## 11. Exercice de reprise à froid et contrôles documentaires

Prompt minimal à donner à un agent sans conversation :

> Dans le dépôt kartaguez/FlowPlan2, lis docs/current_plan.md et suis son ordre de lecture pour reprendre FlowPlan2 V2. Vérifie l'état Git ; rapporte la cible, les invariants, le patrimoine, les gates et la prochaine étape. PLAN ONLY : aucun code ni branche sans autorisation explicite ultérieure.

Exercice réalisé comme **revue documentaire sans contexte conversationnel** :
le prompt ci-dessus est la seule entrée supposée, chaque réponse nécessaire a
été recherchée depuis current_plan dans les fichiers liés. Ce n'est ni une
exécution par un agent indépendant ni une preuve d'implémentation. L'audit externe
doit reproduire l'exercice ; aucun sous-agent n'a été sollicité dans cette mission.

| Question de reprise | Réponse trouvable dans le dépôt / contrôle |
| --- | --- |
| Où commencer et quoi lire ensuite ? | current_plan section active → §1 ordre de lecture et hiérarchie ; tous chemins relatifs vérifiés. |
| Quel repo/SHA/branche/état ; puis-je coder ? | §1 et trackers actifs ; baseline exacte, référence préservée, PLAN livré pour audit, R1–R6 NOT STARTED, aucune autorisation. |
| Quelle décision remplace migration et pourquoi ? | §2 T12-R définitif ; §6 nouveau format, M01–M04 hors gates ; archives conservées. |
| Quel modèle, autorités, dates et transitions ? | §2 table T, §3 schéma/manifestes/proofs/lifecycle/calculs ; aucune obligation de retrouver une conversation. |
| T14/I22 sont-ils oubliés ou changés implicitement ? | §2 T14 portée migrée inapplicable/non-inférence native ; §9 I22→I22-R explicite par T12-R. |
| Que reprendre, adapter, refaire, retirer ; sur quelles preuves ? | §4 matrice chemins/dépendances/contrats/tests/risques/lots ; SHA source §1 ; résultats anciens non réexécutés. |
| Quels imports/frontières autorisés et simulation historique ? | §5 ports/flux ; graph sélectionné sans Current, worker/cache exacts ; §9 I19/I20. |
| Comment protéger anciennes données et recovery ? | §6 noms constatés/proposés, origine distincte, interdictions, export vérifié préalable et protocole natif. |
| Comment créer branche et extraire sans merge ? | §7 procédure conditionnelle, SHA audité, diff/show/restore explicites ; pas branche orphan ni bascule DB par Git. |
| Quand démontrer la simulation ; quels tests/gates/rollback ? | §8 vertical R1/R2 et matrice R0–R6 ; §9 tests par invariant, §10 risques. |
| Quelles décisions techniques restent à prendre et qui les prend ? | Fin §8 : encoding/defaults R1, physique/portable R2, budgets R3, cap R6 ; pas arbitrage métier implicite. |
| Quelle prochaine action et arrêt ? | trackers actifs et §12 : audit indépendant, autorisation explicite par SHA ; aucun lancement dans R0 PLAN. |
| Comment retrouver livraison sans SHA auto-référent ? | Git log du présent fichier depuis baseline §1 ; SHA final transmis après push, commit contient état autonome. |

L'exercice a fait compléter ici la portée T14/I22, les defaults natifs encore
ouverts, la garantie Save/consultation avant R6, la différence branche/origine,
l'ordre de lecture et la précédence sur les archives. Ces informations ne restent
pas dans une conversation. Réponse attendue de l'agent froid : audit suivant,
**pas création immédiate de branche**.

Contrôles de livraison : diff limité au présent plan et aux sections actives des
deux trackers ; archives et canons DONE inchangés ; chemins sources/tests et liens
locaux vérifiés ; couverture T01–T11/T12-R/T13–T15, I01–I21/I22-R/I23, R0–R6,
principaux modules et exercice stateless ; revue sémantique et `git diff --check`.
Contrôles exécutés : 27 liens locaux actifs et 45 références de chemins/globs
sans manquant ; matrices T/I/R présentes ; sections archivées des deux trackers
identiques à la baseline ; `git diff --check` sans erreur. Les matrices sont
relues sémantiquement (dont T14/I22-R et dépendance Save/consultation).
Aucun test applicatif, build, benchmark ou scénario browser exécuté en R0 PLAN.
Vérification finale Git propre et origin 0/0 après commit/push consignée dans le
compte rendu de livraison. Couverture documentaire ≠ preuve de validité du code.

## 12. Conditions du GO et arrêt obligatoire

GO futur de création branche/R0 initialisation uniquement après :

- audit indépendant favorable de ce dossier, invariants, séparation legacy et reprise à froid ; réserves bloquantes traitées dans le dépôt ;
- SHA de départ audité exact et état Git propre/origin 0/0 revérifiés ;
- autorisation explicite de l'utilisateur de créer `rewrite/portfolio-versioned` et lancer le périmètre R0 initialisation ou R1 désigné ;
- plan d'initialisation borné : entrée V2 sûre, build/imports, namespace/origine et registre reprises ; aucune ouverture legacy automatique ;
- export/restauration vérifié ancien Portfolio **avant bascule opérationnelle** (pas prérequis aux seuls contrats mémoire sans données réelles) ;
- gates du lot suivant satisfaites, détails techniques nécessaires fixés dans son plan ; aucune exemption métier pour réutilisation.

À la livraison présente : **arrêt obligatoire après commit/push du PLAN**.
Ne pas créer la branche, coder, migrer/importer, basculer l'application ou lancer
R0 initialisation/R1. Attendre audit indépendant et autorisation explicite.
