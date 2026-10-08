# 11A.2 — Historical daily load profiles / 11B — Project History view

Statut : **PLAN ONLY — 11A.2 PLANNED, 11B PLANNED**. Inspection et décisions
proposées puis durcies le 2026-10-08. Ce document autorise uniquement la
préparation du plan ;
aucun code applicatif, test, backup ou donnée utilisateur n'est modifié.

## 1. Baseline réelle et périmètre

Branche inspectée : `codex/lot11a-portfolio-snapshots`.
HEAD de la première étude : `a51f08626c65c698037e919d44577ad39a5beafb`.
Baseline code 11A : `f477dd6e1a31f3be7be949dad9fea4cae9667770`.
HEAD de départ du durcissement documentaire :
`9f44d991702e62b60eaad56b5a88c62de7368ac7` (plan 11A.2 / 11B).
Working tree initial propre ; upstream `origin/codex/lot11a-portfolio-snapshots`,
remote `https://github.com/kartaguez/FlowPlan2.git`.

Les trois commits demandés existent et sont ancêtres du HEAD (contrôle
`git merge-base --is-ancestor`, sortie 0 pour chacun) :

- `2d5695848035462bf6e4fc70754ec4d3bc6d5c94` : plan initial 11A ;
- `da79f2c243bcba487f68c8ee441fe6efe1e65514` : contrat révisé 11A ;
- `f477dd6e1a31f3be7be949dad9fea4cae9667770` : implémentation 11A/V6.

Le HEAD de la première étude ajoute seulement le plan 11A.1 à l'implémentation
11A. Les docs
`canon.md`, `current_canon.md`, `current_plan.md`, les plans/canons 10C.1,
10C.2 et les trois documents de `PORTFOLIO_SNAPSHOTS/` ont été lus.
Le code livré a été inspecté directement. Les mentions IN REVIEW dans les
anciens comptes rendus 10C.2/11A ne remplacent pas cette baseline : la roadmap
et le plan 11A.1 attestent déjà la fermeture 10C.2 et l'audit positif utilisateur
11A au commit f477dd6 ; le cadrage présent confirme 11A validé.

Statuts opérationnels retenus : **11A DONE**, **11A.1 DEFERRED / not adopted
as product work**, **11A.2 PLANNED**, **11B PLANNED**. Le plan 11A.1 reste une
trace d'étude, sans dépendance de lancement pour ces lots et sans merge de
backups à implémenter. 10D reste superseded by 11A, pas DONE ; 10E largely
superseded by 11B, avec replay/navigation/analyses avancées différés.

### Sources et écarts concrets

| Frontière existante | Constat au HEAD et action future |
| --- | --- |
| `src/domain/portfolioSnapshots/portfolioSnapshot.ts` | Artefact JSON immutable, forecast schema 1, rationnels canoniques en strings, totaux exacts, dates/reasons et comparateur. Les champs sont fermés : ajout via nouveau schéma, pas via champ optionnel silencieux. |
| `src/application/portfolioSnapshots/capturePortfolioSnapshot.ts` | Save reçoit déjà `PlanningResult` et `ActualsReconstruction` publiés. Sources exclusives, inputs communs et hydration de préfixes V5. Ajouter seulement la projection quotidienne Project. |
| `src/main/planning/buildPlanningSessionProjection.ts` | Reconstruction complète avant horizon/engine, disponible dans la projection publiée ; aucune reconstruction nécessaire au Save. |
| `src/domain/actuals/reconstruction.ts` | `contributions` identifie Project/Reservation, owner, Team/date et quantité `ConsumedWorkload`. V5 courant seul, sinon V4 legacy seul. Des lignes zéro existent ; `teamDayTotals` perd l'identité Project et ne convient pas ici. |
| `src/domain/planning/contracts.ts` | `teamPlans[].projectPlans[].allocations[] = {date, workload: Capacity}`. Ne pas capturer `plannedWorkload`, admissions, capacités, états Team ou diagnostics. |
| `src/domain/planning/projectEstimatedDates.ts` | Helpers communs start/end déjà livrés ; conserver leurs règles. |
| `src/main/planning/createPlanningProjectionDispatcher.ts` | Garde dirty live et cohérence état/run ; Save/Delete persistent avant publication et gardent la projection. Réutiliser exactement cette transaction. |
| `src/application/backup/flowplanBackupV6.ts`, `planningInputCodec.ts`, `flowplanBackupV1.ts` | V6 strict et façade de dispatch ; inputs V5 partagés. Créer V7 et conserver les lecteurs anciens et leur politique. |
| `src/application/session/planningSession.ts` | Historique conservé dans les transitions et IDs réservés pour cinq kinds ; suppression de propriétaires avec Actuals/legacy interdite. Ne pas ouvrir une purge dans ce lot. |
| `src/ui/renderApp.ts`, `src/main/createPlanningDemoApplication.ts` | Shell et composition entièrement Planning aujourd'hui ; introduire shell de mode et dépendances read-only History. |
| `src/ui/timeline/createTimelineUiCoordinator.ts` | Possède drafts, contrôleurs, viewport/date/tab. `destroy()` détruit aussi les propriétaires d'édition : ne pas l'utiliser tel quel pour basculer de mode. |
| `src/ui/timeline/timelineViewport.ts`, `createTimelineViewportController.ts` | Math viewport réutilisable, zoom ×1.25, minimum 7 jours, pan Shift ; dépendances typées `TimelineGeometry`, notification sans cause. Généraliser une interface temporelle minimale et notifier la cause. |
| `src/ui/timeline/createTimelineCursorController.ts` | Range drag dans le contrôleur cursor (seuil 4 CSS px), clic date et raccourcis globaux mêlés. Extraire le geste commun, ne pas instancier un faux cursor Planning en History. |
| `src/adapters/timeline/geometry/buildTimelineGeometry.ts`, `timelineCursorGeometry.ts` | Dates/X, axe année/mois et conversion date/X mêlés à géométrie Team. Extraire primitives temporelles ; géométrie History dédiée sans capacités Team. |
| `src/ui/timeline/applyTimelineViewport.ts`, `timelineHitTesting.ts`, `createTimelineInteractionController.ts` | viewBox/typographie et conversion client→timeline réutilisables ; hits Planning spécifiques à remplacer par hits de lignes History. |

Toutes les extractions transversales proposées dans ce document sont soumises
au protocole de mutualisation minimale et de non-régression Planning du §7.

Le canon 11A exclut les profils quotidiens parce que 11A ne les promettait pas.
11A.2 est précisément l'extension versionnée autorisée de cette frontière ;
il ne remet pas en cause la capture minimale 11A ni ne persiste un résultat
moteur complet. Le canon temporel « un viewport » s'applique à chaque vue :
un viewport commun à tous les Projects History, distinct du viewport Planning.
Ces précisions seront intégrées aux canons lors des implémentations, pas ici.

## 2. Invariants conservés

Save explicite uniquement ; `createdAt` horloge réelle au clic, pas Projection
date ; ID opaque unique, timestamps identiques et horloge reculée acceptés ;
tri ascendant `(createdAt, snapshotId)` lexical, dernier = maximum de ce tri.
Copie profonde/freeze, suppression entière seulement, dirty global bloquant,
état et run cohérents, transaction complète avant publication, zéro recompute
au Save/Delete. Tous Projects et Reservations, actifs/inactifs, inputs complets
et sources V5 exactes ou evidence V4 pending exclusive restent conservés.

Actuals cumulés, RAF, EAC = Actuals + RAF, priorityPosition 1-based et raisons
existantes restent exacts. Start = minimum première contribution Actuals
positive / première allocation Forecast positive, sans clipping, sinon
`no-activity`. End garde le helper Timeline : inactive, incomplete-within-horizon,
no-allocation ou dernière fin Team complète. Rien n'est extrapolé à l'horizon.
Le daily profile est la forme **calculée et connue au Save**, pas une prétention
d'observations journalières. Aucune réconciliation ni distribution V4 nouvelle
au Save : on fige les contributions legacy déjà publiées.

## 3. 11A.2 : modèle Domain et capture quotidienne

### Contrat exact recommandé

Ajouter un module `src/domain/portfolioSnapshots/historicalDailyProfile.ts`
et faire évoluer le forecast vers une union discriminée : schema 1 inchangé
pour les captures anciennes ; schema 2 pour les nouvelles, chaque Project
ayant obligatoirement un `dailyProfile` (même sans activité).
`inputsSchemaVersion = 1` reste inchangé, car le contrat inputs ne change pas.
`engineVersion` reste la version de l'algorithme produisant le run ; augmenter
le schéma forecast n'implique pas changer l'algorithme moteur.

Modèle proposé, à transcrire en types readonly lors de l'implémentation :

| Type / champ | Contrat |
| --- | --- |
| `HistoricalProjectDailyProfile` | `actualsRange: HistoricalDateRange \| null`, `forecastRange: HistoricalDateRange`, `days: readonly HistoricalProjectDailyLoad[]`. |
| `HistoricalDateRange` | `{from: CivilDate, through: CivilDate}`, inclusif, valide et non inversé. |
| `HistoricalProjectDailyLoad` | `{date: CivilDate, actualsWorkload: string, forecastWorkload: string}`, strings rationnelles canoniques exactes non négatives, chaque composante obligatoire. |

Ce choix reste cohérent avec les strings exactes de `HistoricalProjectForecast`
et avec `immutableCopy` (qui copie des objets JSON, pas des scalars à BigInt).
Calcul interne via `rationalOf`, `addRationals`, ZERO ; validation/parsing avec
`consumedWorkloadFromSerialized` pour Actuals, scalar Capacity pour Forecast,
`serializeQuantity`/`rationalToCanonicalString`. Aucun nouveau scalaire métier
à inventer, aucune somme Number. La projection History décode une seule fois
vers les quantités/rationnels existants ; Number uniquement à la frontière pixels.

`forecastRange` = horizon inclusif du snapshot, y compris pour Project inactif.
`actualsRange` = coverage de la source V5 sélectionnée, ou `actualsFromDate` →
dernier `actualsThroughDate` de la source legacy pending ; null sans couverture
(V5 RAF-only/none/legacy sans record). Déterminer ces bornes depuis les inputs
sources au Save, pas depuis les seuls jours positifs. Préserver
`actualsKnowledge` et les inputs/periods : zéro reconstruit dans une couverture
n'est pas absence de connaissance ; legacy reste identifié comme legacy.

Persister uniquement l'union des jours où au moins une charge est positive,
triée par date, une entrée au plus par date, deux composantes exactes dont l'une
peut être zéro. **Omettre les journées dont les deux composantes sont zéro.**
Le contrat daily profile complet implique un débit simulé zéro sur tout jour
omis ; les ranges/actualsKnowledge disent séparément si une connaissance Actuals
couvre ce jour. Hors forecastRange : aucune allocation de ce run ; hors
actualsRange : aucune contribution de cette source, sans prétendre à un zéro
observé. Aucun champ daily null n'est nécessaire ; l'absence **du profil**
(schema 1) n'est jamais assimilée à une liste sparse vide (schema 2).

La plage stockée n'est pas tronquée au viewport, à `createdAt`, ni à l'horizon
pour Actuals : capturer toutes les contributions de la source complète, même
avant/après l'horizon. Forecast est exactement celui du run, dans son horizon ;
le lookahead de deadline ne devient pas une allocation. Les plages incluent
les jours nuls mais leur liste dense n'est pas stockée. Un profil sans aucune
activité a `days: []` avec ranges/knowledge explicites.

### Pipeline de capture

Ajouter un projecteur pur Application, voisin de `capturePortfolioSnapshot.ts` :

1. Indexer en une passe `actuals.contributions`, filtrer `sourceKind=project`,
   agréger `amount` par `(sourceId,date)` sur toutes Teams et périodes. Ne pas
   utiliser `teamDayTotals` ni sommer les versions V5. Garder les inactifs.
2. Indexer en une passe `result.teamPlans[].projectPlans[].allocations`, agréger
   `workload` par `(projectId,date)` sur toutes Teams. Vérifier les IDs, garder
   seulement la projection Project et aucun détail Team persistant.
3. Joindre les deux maps à l'union des dates ; compléter composante manquante
   par ZERO, retirer double zéro, trier dates. Ajouter les ranges de source et
   horizon pour chaque Project représenté, même zéro requirement/inactif.
4. Assembler schema 2 dans la capture existante ; valider les invariants,
   copier/freeze tout l'artefact, écrire V7 par la transaction existante avant
   publication. Aucune lecture de draft, reconstruction ou appel moteur ici.

Conservation : `Σ actualsWorkload = actuals`, `Σ forecastWorkload <= RAF`,
`EAC = actuals + RAF`. La somme visible Actuals+Forecast n'est pas toujours EAC :
RAF hors allocation (inactive/incomplete/no-allocation) est une quantité
non représentée dans le profil, toujours disponible au tooltip. Un projet
complètement planifié a `Σ Forecast = RAF` ; contrôler cette égalité au Save
contre les états du run, sans stocker ces états. Ne jamais déduire RAF des jours.

### Validation sans réinterprétation historique

Factory Domain : schéma fermé, fields obligatoires, dates valides/canoniques,
ranges conformes aux inputs et à la source, ordre strict/unique des days,
rationnels canoniques non négatifs, pas de double zéro stocké, nonzero Actuals
uniquement dans actualsRange, Forecast dans horizon, aucun Forecast inactif,
sommes conservées et EAC cohérent. Valider que start est le premier jour positif
minimum du profil complet (ou null/no-activity). Date de fin présente doit
coïncider avec la dernière allocation Forecast positive ; garder les reasons
end existantes et vérifier les contraintes structurelles sans prouver une fin
par le moteur courant. Une fin absente n'interdit pas des allocations positives.

Au Save, prouver aussi l'égalité exacte jour par jour avec les maps du run.
À l'import, vérifier structure/conservation/références/totaux/ranges ; ne pas
redistribuer les anciennes périodes pour comparer une forme avec le nouvel
algorithme. L'authenticité d'un fichier externe n'est pas démontrable par un
contrôle de sommes : aucune signature ni moteur historique n'est ajouté.
Les erreurs portent le chemin capture/Project/jour ; un profil invalide au
milieu rejette tout le document, sans repair/filter ni remplacement.

## 4. V7, import/export et localStorage

**Recommandation ferme : V7.** V6 a des champs fermés et forecastSchemaVersion=1
exclusif. L'enrichir silencieusement créerait deux contrats V6 incompatibles.
Créer `flowplanBackupV7.ts` et faire pointer la façade `flowplanBackupV1.ts`
vers le dispatch V1–V7 ; garder le lecteur V6 strict d'origine.

| Source lue | État conservé / export courant |
| --- | --- |
| V1–V3 | Migration existante, aucune capture inventée ; export V7 avec collection vide. |
| V4 | Evidence et provenance lossless, source legacy exclusive avant reconciliation ; aucune capture rétroactive, export V7. |
| V5 | Histoires exactes et règle knowledgeDate/exportedAt du lecteur V5 inchangées ; zéro Portfolio Snapshot fabriqué. |
| V6 | Captures schema 1 inchangées, profils indisponibles explicitement dans le read model. Export V7 garde ces captures schema 1. |
| V7 | Collection obligatoire acceptant schema 1 hérité et schema 2 complet ; nouveau Save exclusivement schema 2. Schémas inconnus refusés. |

V7 garde l'enveloppe `format/version/exportedAt/data` et les champs data V6.
Version forecast discrimine chaque artefact : mélange ancien/nouveau dans
V7 intentionnel et sans ambiguïté, pas un dailyProfile optionnel en schema 1.
V6 ne lit/écrit jamais schema 2 ; encoder V6 refuse un état contenant schema 2,
V1–V5 gardent leur refus de tout historique. Aucun downgrade silencieux.
Une migration V6→V7 n'ajoute ni modifie profil/date/ID/métrique des captures.

Basculer dispatcher, `planningBackupOperations.ts`, composition, import,
export vers l'encodeur V7 ; même clé `flowplan.backup.v1`, une écriture complète.
Startup lit toutes versions ; ancien document non réécrit automatiquement au
simple chargement. Au prochain commit accepté/import, écrire V7. Preflight
moteur de l'état **courant** maintenu, jamais utilisé pour enrichir l'histoire.
Erreur JSON, validation ou quota : état/document précédents préservés,
invalid startup laissé intact et signalé selon l'existant.

Delete enlève une capture entière, pas ses seules journées ; pas de GC Actuals.
IDs historiques Team/Project/Reservation/Program/Pas restent réservés tant que
les inputs les référencent. Projects sans Actuals supprimés aujourd'hui restent
lisibles depuis leurs captures ; propriétaires avec V5/legacy restent protégés.
L'absence de propriétaire V5 dans current reste une référence cassée rejetée,
pas un besoin d'archive à ajouter : ce cas relève du merge 11A.1 différé et
n'est pas produit par la trajectoire normale protégée. Ne pas affaiblir les
Reservations ou leurs inputs dans V7, même si 11B ne les dessine pas.

## 5. 11B : frontière Application, mode et projection

Créer `src/application/history/buildProjectHistoryViewModel.ts` et ses types,
projection pure immutable sans DOM, pixels ni engine. Entrée : collection
validée de captures ; utiliser le codec historique partagé pour lire noms,
associations, état actif et horizon. Fournir une projection de métadonnées
historical inputs au-dessus du DTO partagé ; ne pas lancer reconstruction,
ne pas cloner/réhydrater toutes les chaînes V5 pour chaque pan/rerender.
La validation complète reste au chargement/Save, pas dans le renderer.

Sortir un modèle avec snapshots ordonnés et référence, horizon de référence,
groupes Project, et lignes discriminées `absent` / `present`. Chaque ligne
present porte métriques, dates/reasons, labels historiques, activité,
`profile: available | unavailable-legacy`, daily values et comparaison pure.
Ne jamais consulter le Project/Program/Pas courant pour combler un label
historique. Identité = ProjectId, pas nom. Conserver les IDs et labels de chaque
capture pour déceler aussi renommage ou association différente de même nom.

Un mode UI `Planning | History` est détenu par un shell/coordinator supérieur,
composé depuis `createPlanningDemoApplication.ts`, pas dans
`PlanningSessionState` ni dans le backup. Planning reste le défaut au reload.
History reçoit uniquement un getter de captures/modèles et des callbacks de
navigation/viewport : aucun dispatch métier, Save/Delete/Import ni contrôleur
Project/Team/Actuals. La bascule ne recompute ni ne persiste.

Réorganiser le cycle de vie du coordinateur Planning en **suspend/resume** :
sauvegarder viewport, Projection date, tabs, expanded cards, drafts RAF/modal,
Create/Team/Settings et focus ; suspendre listeners/raccourcis/pointer gestures,
fermer tooltip. Garder les propriétaires/stores de drafts vivants hors de la
surface, sans Apply, Cancel ni rebase artificiel. Son `destroy()` actuel est
réservé à la destruction finale. Sous modale ouverte, le toggle extérieur est
inaccessible par modalité existante ; après fermeture, bascule autorisée même
dirty. History affiche seulement les captures committées. Retour Planning
restaure les brouillons, y compris invalides et cachés ; la garde Save reste
active. Aucun listener Planning global ne continue à modifier une vue cachée.

En History, le panneau Portfolio **entier** Projects/Reservations disparaît de
l'affichage et du focus/accessibility tree ; pas un panneau Projects vide.
La vue occupe l'espace principal avec son propre header ; ni progress/diagnostic
courants, ni Create Team/Settings/édition. Pas de modal d'édition survivante.

### Axe et header uniques

Header : toggle Planning/History, +, −, Reset, indications range drag/Shift pan,
légende globale snapshots, « Reference snapshot: [date] ». Chaque entrée de
légende porte swatch et date locale ; heure complète (secondes/millisecondes,
zone) uniquement dans tooltip accessible, ID pour lever ambiguïté de dates
égales. Même format dans tooltips de lignes. Marquer visuellement la référence.

Référence = dernier selon `(createdAt,snapshotId)`, même si horloge reculée.
Axe global = `inputs.planning.startDate/endDate` **de cette capture** ; jamais
union des horizons ni dates min/max d'activité, jamais un axe par Project.
Clipping strict des anciennes charges et marqueurs hors bornes. Les métriques
et comparaisons restent entières, même hors axe. Sans snapshot : état vide
« Save a portfolio snapshot in Planning », controls zoom désactivés, aucun
horizon courant substitué. Référence sans Projects : conserver axe/légende et
éventuels groupes historiques ; sans Projects dans toute l'union : état vide.

### Organisation verticale

Union des ProjectIds présents dans au moins une capture. D'abord ceux du dernier
snapshot, priorityPosition de ce snapshot croissante ; ensuite disparus,
priorityPosition de leur dernière présence croissante. Tie-break déterministe
ProjectId lexical (puisque les disparus peuvent partager une ancienne priorité).
Nom, Programme et Pas affichés une seule fois dans le header de groupe, depuis
la dernière capture contenant le Project ; absence d'association = « None ».

Chaque groupe a exactement S lignes, même ordre global ascendant, sans collapse
ni filtre initial. Garder lignes serrées (cible 28–32 CSS px, zone de dessin
commune 20–24 px), header et séparation entre Projects plus ample (12–16 px).
Mêmes dimensions et baseline partout ; priorité `#N` dans une gouttière hors
axe qui ne se déforme pas avec le zoom. Aucun Actuals/RAF/EAC imprimé sur la frise.

| État d'une ligne | Restitution explicite |
| --- | --- |
| Project absent | Ligne vraiment vide, sans priorité/trait/marker/tooltip métier. Emplacement conservé ; état accessible « absent from snapshot » sans glyph visible. |
| Present, profil disponible, aucun débit positif global | Trait horizontal fin neutre sur toute largeur temporelle, priorité visible ; tooltip « present in this snapshot, no activity ». RAF positif non alloué n'est pas une activité. |
| Present, ancien schema 1 sans profil | Priorité et métriques/raisons au tooltip, petite indication non métrique dans la gouttière « Daily profile unavailable ». Aucune forme approximée, aucun rectangle start/end, aucun replay. Si start null/no-activity prouve déjà zéro activité, autoriser le trait sémantique sans prétendre un profil disponible ; conserver l'indication legacy. |
| Present avec activité, toutes charges hors fenêtre/axe | Aucune forme visible mais priorité et tooltip indiquant activité hors fenêtre ; ne pas dessiner le trait no-activity. |
| Inactive / Actuals seuls | Actuals affichés si positifs ; pas de Forecast, reason inactive ou autre affichée au tooltip. |

Ce rendu des anciens snapshots est le moins ambigu : métriques historiques
conservées, forme explicitement indisponible, aucune histoire reconstruite.

## 6. Géométrie History et forme de débit

Créer `src/adapters/history/geometry/buildProjectHistoryGeometry.ts`, types et
renderer `src/ui/history/renderProjectHistorySvg.ts`. Extraire dates/dayWidth,
axe année/mois et conversions date/X de la géométrie Timeline dans une interface
`TemporalGeometry` (`width,height,dayWidth,dates,timeAxis`), utilisée par les deux
vues. History n'a pas de fake Team/capacité ni de PlanningResult adapter.

Dessiner des surfaces en escalier par cellules journalières, largeur = un jour
civil. Formaliser la quantité exacte :

`dailyTotalWorkload = actualsWorkload + forecastWorkload`.

La hauteur totale de la cellule/journée est proportionnelle à ce total, avec
un facteur **commun** à tous Projects et snapshots. Dans cette hauteur,
Actuals est la partie foncée/saturée depuis la baseline et Forecast la partie
pastel empilée au-dessus. Si les deux sont présents le même jour, aucun
recouvrement graphique ne peut cacher une composante. Sous le plafond visuel :
`surface Actuals ∝ Σ Actuals`, `surface Forecast ∝ Σ Forecast`, et
`surface totale ∝ Σ Actuals + Σ Forecast`. Pas de normalisation par ligne/Project,
même après scroll vertical, ni d'interpolation lisse inventant du débit pendant
les zéros. La conversion en pixels appartient exclusivement à Geometry/UI,
jamais au Domain.

Le marqueur principal matérialise la **fin de la période de connaissance
Actuals du snapshot**, à `actualsRange.through` quand cette plage existe.
Le positionner sur la borne de fin de ce jour inclusif, avec tooltip explicitant
la date et « Actuals knowledge through ». Il ne dépend pas des jours positifs :
une couverture connue avec uniquement des zéros conserve ce marqueur.
Si `actualsRange` est null, aucun marqueur de fin d'Actuals ; schema 1 sans
profil ne reçoit aucune borne inventée.

Distinguer explicitement trois concepts dans le modèle de lecture/rendu :

- borne de connaissance Actuals : `actualsRange.through` ;
- premier jour Forecast positif : `firstForecastPositiveDate`, dérivé du profil
  disponible (null sans Forecast positif), information distincte au tooltip ;
- profil de charge effectivement présent : les deux composantes quotidiennes.

Ces dates peuvent différer. Ne jamais redéfinir la frontière métier
Actuals/Forecast comme le premier jour d'une allocation Forecast positive.
En cas de chevauchement valide, le même jour ou sur des périodes : ne déplacer
ni tronquer aucune charge, afficher les deux composantes réelles empilées et
conserver le marqueur à `actualsRange.through`. Le tooltip peut signaler le
chevauchement pour expliquer le rendu ; aucune frise séquentielle artificielle.
Marqueur hors axe/fenêtre simplement clippé, sans marqueur fabriqué au bord du
viewport. End absent ne supprime pas les allocations réelles disponibles :
dessiner leur profil et rien après leur dernier jour, ni flèche ni hachure.

### Échelle commune et plafond robuste

Définir une fonction pure de présentation `computeHistoryVisualCap` sur les
**totaux journaliers positifs Actuals+Forecast** de toutes les lignes disponibles
et de tous les Projects, dans la fenêtre X visible (jours intersectés), clippée
à l'axe de référence. Les lignes absent/legacy et zéros ne participent pas à
la distribution ; le scroll vertical ne change pas le cap commun.

**Contrat stable de présentation 11B** : plafond déterministe, dérivé des
données affichées, commun à toutes les lignes, robuste aux outliers, recalculé
lorsqu'un zoom change la fenêtre/le niveau temporel selon §7 et stable pendant
un simple pan. Dépassements explicitement signalés, vraie valeur toujours
accessible au tooltip. Ce contrat n'est ni un invariant métier ni un contrat
de persistance.

**Initial presentation strategy / tunable rendering policy** : trier les
valeurs exactes ; pour n ≥ 8, quartiles
nearest-rank Q1/Q3, plafond `min(max, Q3 + 1.5 × (Q3−Q1))`. Pour 1 ≤ n < 8,
`min(max, 3 × médiane inférieure)` ; n=0, référence d'affichage 1 md/jour sans
activité. Facteurs rationnels, comparaisons exactes ; aucune interpolation
flottante dans le quantile. Positivité garantie ; IQR nul donne Q3 positif.
Le fence ignore un spike isolé, conserve la majorité des débits et est plus
robuste qu'un max. Si les gros débits sont fréquents, ils relèvent naturellement
le cap. Toute la formule IQR et son fallback sont une politique de rendu initiale
ajustable après revue visuelle documentée. Ils peuvent évoluer sans migration
de backup, changement Domain ou du contrat Portfolio Snapshot, ni rupture de
compatibilité. Aucun paramètre de cette formule n'est persisté dans le snapshot.
Les tests privilégient les propriétés du contrat stable ; des tests unitaires
de la stratégie choisie (bimodalité, singleton, IQR nul notamment) restent
souhaitables, sans ériger cette formule en canon produit.

Hauteur pleine commune = cap. Si total dépasse cap, réduire les deux composantes
proportionnellement `cap/total` (préserve leur ratio sans cacher Forecast),
indicator discret de dépassement sur la cellule/zone avec libellé accessible.
Tooltip garde vraies valeurs daily et total, composantes et cap ; l'indicateur
ne ressemble pas à une flèche de fin. Header/légende précise que les hauteurs
sont plafonnées. L'aire est fidèle sous le cap ; au-delà, perte visuelle signalée,
jamais quantité tronquée en Domain ou métriques. Convertir ratio borné en Number
pour pixels avec helper robuste, éviter overflow de grands BigInt en Number.

## 7. Viewport, zoom/pan et stabilité du cap

**Décision : state History indépendant**, un viewport pour toute la vue,
restauré à son retour, aucun changement du viewport/selectedDate Planning.
`HistoryUiState` contient viewport, referenceSnapshotId, zoomRevision,
cap et fenêtre d'échantillonnage de ce cap, hover/transient range. Ne rien persister.

### Mutualisation minimale, sans changement de comportement Planning

**Invariant : aucun comportement Planning existant ne peut changer pour
satisfaire History.** Les extractions `TemporalGeometry`, range gesture,
notifications viewport enrichies et primitives zoom/pan/date→X doivent rester
minimales. History conserve son état séparé et n'impose pas ses concepts au
Planning. Aucun cleanup architectural opportuniste ni refactoring général de
la Timeline Planning dans 11B.

Préserver exactement Projection date, ancrage du zoom Planning, boutons +/−/Reset,
sélection de plage, seuil de drag 4 CSS px, minimum 7 jours (horizon plus court
selon l'existant), Shift+drag pan, click-to-date Planning, Ctrl+Left/Ctrl+Right,
tooltips et hit testing actuels, suppression de sélection native de texte,
pointer cancel/capture, conservation des drafts et viewport Planning.

Avant **toute** extraction transversale :

1. caractériser le comportement Planning existant par tests sur la baseline ;
2. extraire seulement la primitive minimale nécessaire à 11B ;
3. vérifier que les tests Planning restent identiques et passent sans adapter
   leurs attentes à History ;
4. poursuivre une généralisation supplémentaire uniquement si un besoin réel
   de 11B la rend nécessaire, avec la même vérification de non-régression.

Les propositions ci-dessous sont subordonnées à cet invariant ; enrichir un
callback ou une interface ne doit changer ni les effets ni le cycle de vie
observable du Planning.

Adapter au minimum le contrôleur existant sur `TemporalGeometry` et callback
d'ancre
`getZoomAnchorX`. Planning conserve exactement son ancre Projection date/clamp ;
History utilise le centre visible (pas de Projection date métier nouvelle).
Réutiliser clamp, zoom, pan, date-range, minimum 7 jours ou horizon plus court,
Zoom factor 1.25, Reset plein horizon. Extraire de cursor le geste range commun
avec clic optionnel : Planning garde clic/keyboard cursor ; History clic ouvre
ou maintient tooltip de ligne et range release appelle le même viewport.
Primary pointer, seuil 4 CSS px, pointer capture/cancel, preview dates et
`user-select:none` sur surfaces, Shift+drag pan exclusif restent inchangés.
Ne pas copier ces algorithmes dans un second contrôleur arbitraire.

Remplacer notification nue par `{cause, previous, next}` : `initial`,
`zoom-button`, `range-zoom`, `reset`, `pan`, `restore`, `reference-change`.
Comparer la largeur effective après clamp (epsilon existant) pour identifier
un changement de niveau. À zoom/range/reset **avec largeur changée**, recalculer
cap une fois sur la nouvelle fenêtre et incrémenter zoomRevision ; un bouton
clampé sans effet ne le change pas. Un range de même largeur déplacé ou Reset
de même largeur est une translation, cap stable. Pan ne change jamais le cap,
même si de nouveaux spikes apparaissent (indicateurs assurent leur visibilité).
Preview range ne recalcule pas. Initial/reference-change initialise cap ; restore
et rerender/resize gardent cap/revision si référence et fenêtre temporelle
restaurées identiques. Aucun callback initial de mount ne doit effacer ce cache.

Pan = transform viewport + projection du sous-ensemble visible si nécessaire,
pas reconstruction du History VM. Changement de zoom = reprojection géométrique
avec nouvelle échelle Y commune, sans moteur. Back/forth de mode conserve cap
et fenêtre source. Référence supprimée/changée depuis Planning : reset History
sur nouvel horizon, reconstituer ordre/union/comparaisons et cap explicitement.
Suppression d'une capture non référence : invalider modèle/distribution et
initialiser le cap au prochain accès (changement de données, pas pan).
Suppression du dernier snapshot = état vide. Zoom + puis − retrouve les mêmes
bornes selon les clamps/ancre existants ; pas d'historique d'undo supplémentaire.

## 8. Tooltip, comparaisons et hits

Application calcule les comparaisons pures avec la **présence précédente du
même Project**, pas la ligne globale précédente s'il était absent. Même timestamp :
ordre snapshotId tranche. Première présence : aucune comparaison. Delete d'une
capture recalcule le prédécesseur parmi celles retenues, sans mutation des captures.

Tooltip de chaque present : date/heure complète/timezone/ID de Portfolio Snapshot,
priorité, Actuals, RAF, EAC, start/end et reasons explicites. Les reasons end
existantes expliquent inactive/incomplete/no-allocation ; ajouter dans le VM
un statut Forecast « allocated / inactive / no remaining workload / no allocation
within horizon » à partir des inputs et profil, sans diagnostiquer une cause
moteur inexistante. Pour schema 1 : préciser « daily allocations unavailable »,
et ne pas déduire absence de Forecast uniquement d'une fin absente.

| Comparaison | Comportement |
| --- | --- |
| Priority | `#2 → #5`, valeurs anciennes/nouvelles ; aucune priorité actuelle substituée. |
| EAC | `120 → 135 (+15)`, soustraction rationnelle signée, décimal de présentation avec exact fraction accessible si arrondi. Delta zéro permis. |
| End deux dates | Ancienne → nouvelle, delta signé en jours calendaires (pas jours ouvrés). Factoriser différence epoch-day dans `domain/model/date.ts`, dont helper interne existe ; pas de timezone/DST ni division de millisecondes locales. |
| End date → null | Date → unavailable avec nouvelle reason ; delta « not comparable », pas 0. |
| End null → date | Unavailable (ancienne reason) → date ; delta non comparable. |
| End null → null | Reasons des deux côtés, indiquer changement éventuel ; aucun delta numérique inventé. |
| Programme / Pas | Comparer ID et label historique ; afficher transition uniquement si changé, y compris None, renommage ou IDs distincts avec noms identiques (ID en détail). |
| Activation | `Active → Inactive` ou inversement si changé. |

Actuals et RAF restent valeurs courantes de la ligne, sans deltas demandés.
Le jour survolé ajoute Actuals/Forecast daily exacts, total et dépassement cap.
Pour legacy, aucun daily amount inventé. Pas de deuxième graph métrique dans 11B :
forme compare masses et placement, tooltips portent dérive EAC/end, priorité sur ligne.

Hits sur Geometry : `(projectId,snapshotId,date,part)` ; range/cap marker > daily
surface > present row. La bande complète d'une ligne present est hit-testable,
même gap zéro/no-activity/legacy ; absent n'a pas de tooltip Project. Résoudre
row par index Y, date par temporal X, lookup daily par index/map, sans scan DOM.
Tooltip hors SVG pour largeur lisible, focus/keyboard et tap en plus de hover,
Escape/dismiss, pas d'ouverture d'édition. Masquer pendant gestes range/pan et
reprendre après release ; ne pas conserver de hit vers capture supprimée.

## 9. Couleurs et accessibilité

Une couleur stable de base par snapshotId, commune à tous Projects/légende et
indépendante du Programme. Compromis proposé : fonction pure versionnée de
`snapshotId` vers un espace perceptuel (par exemple OKLCH), avec gamut et
contraste vérifiés dans les deux thèmes. Utiliser plusieurs dimensions
perceptuelles (teinte, chroma, luminance), une distribution déterministe bien
répartie issue du hash et une palette qualitative de référence ; éviter un
simple modulo sur une petite palette qui multiplie les couleurs identiques.
Dériver Actuals foncé/saturé et Forecast pastel avec contour adapté au light/dark.

Pour les collections usuelles, environ 8–12 snapshots simultanément affichés,
viser une distance perceptuelle suffisante entre couleurs de base et éviter
autant que possible les couleurs identiques ou quasi identiques. Évaluer les
distances et le rendu sur des jeux représentatifs de 1, 8 et 12 IDs ; ajuster
la politique avant validation visuelle. Une fonction de l'ID seul ne peut
garantir l'absence de toute proximité pour des IDs arbitraires : compromis
explicite entre bonne discrimination usuelle et stabilité absolue.

Ni index de collection, ni date seule, ni Math.random au render, ni résolution
de collision recalculée selon la collection. Ajout/suppression d'autres snapshots,
import, rerender, pan et zoom ne recolorent aucune capture existante. La fonction
validée reste stable ; aucune nouvelle donnée métier ou migration de snapshot
pour gérer les couleurs. Pour de très grands nombres, les couleurs seules
peuvent ne plus suffire : légende, ordre des lignes et dates restent les autres
canaux d'identification. Revue complémentaire à 24 et 50 snapshots dans les deux
thèmes, sans promettre une infinité de couleurs perceptuellement uniques.

Légende globale wrap/scroll interne si longue ; heure accessible au focus/tap,
date visible répétée pour captures même jour, ID en tooltip. Labels/gouttière
et markers en espace écran, aspect ratio non déformé ; réutiliser préservation
typographie. Focus visible, ordre de navigation logique, tooltip descriptible,
texte de cap/no-profile/no-activity ; couleur seule n'est jamais un état métier.

## 10. Volume, coûts et limites pratiques

Coût brut dense : O(S × P × Dstockés). Nombre sparse K ≤ S×P×D ; capture
O(contributions Actuals + allocations Forecast + K log D) avec index par Project,
pas `flatMap/filter` rescannant tout le run pour chaque Project. JSON/parse/
validation : O(inputs historiques + K) hors coût rationnel BigInt et tris ;
préfixes V5 existants restent ceux de 11A, aucune duplication nouvelle.

Ordres de grandeur illustratifs, non mesures : S=24, P=100, D=730 donne
1 752 000 jours denses. Objet daily compact ≈80–120 octets avec petites fractions,
soit 140–210 MB additionnels ; à 20 % de jours positifs, ≈28–42 MB. Indentation
2 espaces actuelle augmente ces tailles, fractions à grands dénominateurs aussi.
Enveloppe/input snapshots ajoutent leur coût. UTF-16 localStorage et objets JS
peuvent multiplier l'empreinte mémoire, parsing coexistence string/DTO/Domain.
Ne pas présumer que cela rentre dans le quota navigateur.

Garder le contrat sparse à champs nommés pour lisibilité/validation, sérialiser
le nouveau writer V7 en JSON compact (mêmes valeurs, whitespace non contractuel).
Mesurer réellement export, encode/decode, mémoire, durée Save et write avant
clôture 11A.2. Conserver erreur quota atomique et export complet ; ne pas purger
automatiquement des captures ni limiter silencieusement les journées. Export
possible indépendamment d'une écriture ratée, sans annoncer un Save réussi.
Une éventuelle archive/IndexedDB/compression requiert un lot ultérieur explicite,
pas une promesse de capacité illimitée dans ce plan.

History VM : O(S×Punion + K) pour N lignes exactes par groupe, maps de labels et
présence/prédécesseurs ; cache sur référence immutable de collection, quantités
décodées une fois, pas de parsing au pan. Construire les sous-ensembles temporels
par recherche binaire dans les listes triées, sans matérialiser D zéros par ligne.
Cap : O(M log M) sur M jours positifs de la fenêtre au zoom, pas à chaque pan.
Geometry/dessin : O(S×P×Dvisible) borne dense, effectif O(lignes visibles + Kvisible).

SVG : paths en escalier par run de jours, 2 surfaces/ligne plutôt qu'un DOM node
par jour ; trous restent des sous-paths, points journaliers non fusionnés en moyennes.
Gouttière/header DOM alignés avec une zone temporelle commune. Fenêtrer en X lors
des pans en gardant coordonnées absolues/clipping et cap stable. Prévoir
virtualisation verticale par groupes avec espace réservé pour S lignes, axe
unique sticky et overscan ; cap calculé sur tous Projects de la fenêtre X,
jamais seulement ceux montés. Introduire la virtualisation si les mesures sur
volume cible la justifient, sans changer le VM logique N×S. Hit testing indexé
O(1)/O(log D), events pointermove via animation frame ; pas un listener par jour.

Benchmarks futurs : petit 3×5×30, cible 24×100×730 sparse et stress 50×200×1095,
avec spikes/fractions longues ; relever JSON UTF-8 et mémoire, decode/VM/Save,
DOM nodes, temps zoom et frames pan. Cible pan proche d'une frame 16 ms desktop,
absence de long task récurrente ; si storage dépasse quota, documenter taille
supportée constatée et refus non destructif. Pas d'optimisation d'engine ou de
format tuple/delta encoding avant preuve de besoin.

## 11. Séquencement : deux lots/commits successifs

**Oui : deux commits d'implémentation reviewables, 11A.2 avant 11B**, avec
clôture/gates de 11A.2 avant consommation par 11B. Des sous-commits techniques
peuvent faciliter review, sans mélanger feature persistence et UI historique.
Cette passe ne produit que le commit documentaire.

### 11A.2

1. Types/factory daily profile et union forecast schema 1/2, validation exacte.
2. Projecteur d'agrégation du run publié et intégration Save clean-only.
3. V7, dispatch versions, guards downgrade et wiring persistence/import/export.
4. Tests capture, conservation, validation/migration/transaction et volume.
5. Docs : canon durable/courant, canon 11A.2, statut IN REVIEW puis DONE seulement
   après tests, build, audit, corrections éventuelles et validation humaine ;
   conserver le contrat historique schema 1.

**Gate bloquant : clôturer entièrement 11A.2 avant de commencer 11B.**
Séquence obligatoire : implémentation 11A.2 → tests → build → audit → corrections
éventuelles et revalidation → validation humaine → statut **DONE**. Profils
réellement capturés et round-trippés V7, anciens profils explicitement
indisponibles ; aucun fallback par moteur. IN REVIEW ou des tests passants
seuls ne permettent pas de démarrer 11B. Aucune implémentation 11B en parallèle
pour contourner un contrat 11A.2 encore instable.

Étape 2 : seulement après cette clôture, commencer 11B.

### 11B

1. History projection/VM et comparaisons pures sur artefacts validés.
2. Shell de mode, suspend/resume Planning, header/légende History et read-only.
3. Caractérisation Planning par tests avant extraction minimale de primitives
   TemporalGeometry ; tests Planning inchangés, géométrie/renderer History daily.
4. Mutualisation minimale viewport/range selon le protocole §7, state indépendant
   et cap zoom/pan ; aucune généralisation sans nécessité démontrée pour 11B.
5. Tooltips, hits, priorités, couleurs/thèmes/accessibilité.
6. Tests par frontière et mesures de performance ciblées.
7. Review manuelle desktop 1440 px et narrow/mobile 390 px, light/dark : espaces,
   alignement axe/lignes, plots chevauchants, gaps, anciens profils, no-activity,
   outliers et clipping, longue légende, zoom/range/pan, touch/clavier/focus,
   retour Planning avec drafts intacts et aucun overflow du document.
8. Docs canons, compte rendu validation, IN REVIEW avant audit/DONE. Pas de
   causal attribution/replay/restore ni de frise Reservation.

## 12. Matrice d'acceptation future

| Frontière | Cas minimum / assertions |
| --- | --- |
| Domain/capture Actuals | Distribution V5 publiée exacte (tiers, grands rationnels, capacité/fallback), V4 pending intermittent/future/Team hors membership, V5 réconcilié exclusif ; profils complets hors horizon ; zéro explicite vs none/RAF-only/covered ; aucun reconstructActuals ni création V5 pendant Save. |
| Domain/capture Forecast | Égalité day-by-day allocations, plusieurs Teams/mêmes dates, gaps/weekends, jours zéro omis/restitués ; sans Actuals, Actuals seuls, inactive Forecast zéro, RAF zéro, incomplete partiellement alloué, no-allocation et horizon court. |
| Conservation/artefact | ΣActuals = cumul, ΣForecast ≤ RAF, complet = RAF, EAC=Actuals+RAF (pas somme du seul profil), start/end/reasons, deep freeze/no alias, capture déterministe à clock/ID fixes, changements capacity/engine ultérieurs n'altèrent pas les jours. |
| Validation | Champs/schémas inconnus, missing profile schema 2, extra profile schema 1, dates/ordre/duplicates/ranges invalides, double zéro non canonique, fractions invalides/négatives, somme incohérente, Forecast inactif refusés ; import n'appelle pas engine/reconstruction historique même si leur comportement est modifié. |
| Persistence | V7 round-trip mixtes schema 1/2, V6 lecture inchangée/profil indisponible, V1–V3 sans capture, V5 borne connaissance existante et V4 lossless/exclusivité, refus downgrade V6/V1–V5 ; equal timestamps et recul horloge, IDs historiques cinq kinds, broken refs rejetées ; une mauvaise capture rejette tout. |
| Transaction/local | Save/Delete zéro recompute, dirty caché/invalid/handoff, mismatch run, quota échec avant publication ; startup invalide conservé, import Cancel/preflight fail intact, export V7 complet, suppression ciblée sans Actuals GC, ordinary commands conservent tous profils. |
| History projection | Union incluant supprimés/inactifs ; ordre latest priority puis last-known et tie ProjectId ; S lignes pour S snapshots ; absent/present/no-activity/legacy/activité hors fenêtre ; metadata latest-known ; current absent n'invalide pas inputs autonomes. |
| Comparaisons | Prédécesseur même Project en sautant absences, same timestamp tri ID, première présence, suppression prédécesseur ; priority/EAC delta exact signé ; Programme/Pas changement ID/nom/None ; active transitions ; drift dates positif/négatif/zéro, null×date/null×null/reasons, année bissextile et DST sans influence. |
| Geometry/render | Axe unique référence (dernier V6 possible), clipping ancien horizon, dailyTotalWorkload = actualsWorkload + forecastWorkload, hauteur totale proportionnelle et surfaces de chaque composante proportionnelles sous cap, pixels uniquement Geometry/UI, gaps sans interpolation, échelle commune, empilement jour chevauchant, cap total proportional, indicator et vraie valeur ; Actuals foncé/Forecast pastel, marqueur actualsRange.through même si couverture zéro, aucun si range null ; firstForecastPositiveDate distincte, chevauchement sans déplacement/troncature, absent réellement vide, no-activity full-width, legacy sans forme. |
| Cap/viewport | Propriétés du contrat stable : déterminisme, données affichées, cap commun robuste aux outliers, dépassement signalé/vraie valeur au tooltip ; stratégie initiale testée séparément sur skewed/bimodales/IQR zéro/1–7 jours/empty et gros rationnels sans canoniser la formule ; zoom +/−/Reset/range après pan recalculent si niveau changé, pan et same-width déplacement stables, no-op clamp stable, restore/rerender stable, référence/dataset changement explicite ; cap ne dépend pas du scroll Y. |
| Non-régression Planning / extraction | Tests de caractérisation avant chaque extraction minimale ; attentes inchangées pour Projection date, ancre, +/−/Reset, range, seuil 4 px, minimum 7 jours, Shift pan, click-to-date, Ctrl+Left/Right, tooltips, hits, sélection native supprimée, pointercancel/capture, drafts et viewport ; généralisation supplémentaire seulement nécessaire à 11B. |
| Interaction/mode | Toggle réversible, aucun dispatch/write/engine en History, panneau Portfolio absent et non focusable, listener Planning suspendu ; drafts RAF/Actuals/Forecast/Create/Settings invalides conservés, dirty Save au retour ; 7-day minimum, 4px range, reverse drag, pointercancel, Shift pan, texte non sélectionnable, hover/click/tap/focus et tooltip no-activity/legacy. |
| Couleurs/UI/performance | ID color stable ajout/import/delete/rerender/pan/zoom, indépendant Programme ; distance perceptuelle et revue 8–12 snapshots usuels, collisions sans recoloration des autres, dates/légende/ordre pour nombreux snapshots, thèmes, focus/touch, labels non déformés, responsive sans overflow ; paths et hit testing sans nœud/jour, mesures Save/JSON/decode/VM/zoom/pan, quota sans purge. |

Après chacun des lots autorisés : `npm run typecheck`, `npm test`,
`npm run build`, `git diff --check`, régressions backup/mandatory existantes.
Aucun test ni build exécuté dans cette passe de documents : checks présents =
baseline/lecture code, cohérence du plan, liens, diff et périmètre documents.

## 13. Blockers, décisions et exclusions

Aucun blocker de branche/ascendance ni décision produit manquante pour préparer
ce plan. 11B dépend réellement de l'implémentation 11A.2, encore PLANNED.
Les risques identifiés deviennent des critères de validation, pas des motifs
pour rejouer l'histoire : volume/quota, lifecycle suspend/resume des drafts,
extraction du range controller et lisibilité d'une palette nombreuse.

Deux ambiguïtés métier résolues explicitement : un chevauchement daily n'est
pas une frontière séquentielle unique (marqueur de connaissance à
actualsRange.through, distinct de firstForecastPositiveDate), et une somme de
Forecast alloué peut être inférieure au RAF/EAC (aucune charge inventée).
Les anciens profils restent indisponibles, même si les inputs pourraient être
rejoués aujourd'hui. Le cap est commun, robuste, stable au pan et informatif.

11A.1 reste différé ; son archive/lineage/merge n'est pas débloqué par V7 daily.
Reservations conservent tout l'historique sans nouvelles frises. Aucun replay
complet, restore, comparaison avancée de capacités/surcharge, filtre causal,
édition historique, engine registry, stack framework/E2E nouvelle ou mutation
applicative n'appartient à cette livraison documentaire.
