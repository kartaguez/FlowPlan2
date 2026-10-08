# Lot 11C — Séparation temporelle Actuals / Forecast

**Statut : PLANNED / NOT STARTED — plan uniquement, à auditer.**
Aucune implémentation n'est autorisée par ce document. Attendre l'audit du plan
et l'autorisation explicite avant tout changement de production ou de tests.
11A et 11A.2 restent DONE ; **11B reste IN REVIEW**, en attente d'audit
indépendant et de validation humaine. Ce lot ne clôture pas 11B.

## 1. Baseline, références et portée de cette livraison

Étude du 2026-10-08 sur `kartaguez/FlowPlan2`, branche existante
`codex/lot11a-portfolio-snapshots`. SHA de départ et baseline demandée :
`4d39ad40053a70ed51c5b18bce8c8a683fb920fb`. Arbre initial propre ; après
`git fetch origin`, HEAD/upstream synchronisés, avance/retard **0/0**.
Aucun changement de branche, reset, merge ou modification de données.

Références examinées intégralement : [canon durable](../../canon.md),
[canon courant](../../current_canon.md), [roadmap](../../current_plan.md),
les canons/plans [10A](../ACTUALS/step_canon.md),
[10A plan](../ACTUALS/step_plan.md), [10B](../ACTUALS/lot10b_plan.md),
[10C](../ACTUALS/lot10c_plan.md), [10C.1 canon](../ACTUALS/lot10c1_canon.md),
[10C.1 plan](../ACTUALS/lot10c1_plan.md), [10C.2](../ACTUALS/lot10c2_plan.md),
[11A canon](../PORTFOLIO_SNAPSHOTS/lot11a_canon.md),
[11A plan](../PORTFOLIO_SNAPSHOTS/lot11a_plan.md),
[11A.1 étude différée](../PORTFOLIO_SNAPSHOTS/lot11a1_plan.md),
[11A.2 / 11B plan](./lot11a2_11b_plan.md), [11A.2 canon](./lot11a2_canon.md),
[11B canon et corrections](./lot11b_canon.md), ainsi que les références
spécialisées de `docs/arch/`. Les statuts historiques de ces comptes rendus
ne remplacent pas la roadmap courante. Les anciennes exclusions « cutoff »
du canon moteur de reconstruction ne justifient pas d'ignorer l'invariant
expressément demandé ici : proposer un amendement ciblé, sans réintroduire
seeds, dates exclues par Team ou histoire dans le moteur.

La livraison présente crée ce plan et actualise **uniquement**
`docs/current_plan.md`. Les fichiers ci-dessous sont des cibles futures,
pas des modifications réalisées. Pas de code, test, format, fixture, snapshot
ou canon implémenté modifié. Vérifications documentaires/Git seulement ;
les résultats de tests 11B déjà consignés ne sont pas des tests exécutés pour 11C.

## 2. Décisions acquises et propositions à auditer

**Acquis par la mission :** pour chaque Project, toute allocation Forecast doit
être strictement postérieure à la fin inclusive de sa période Actuals connue.
La borne est commune à toutes ses Teams, même sans consommation historique.
Ni Actuals ni RAF ne sont corrigés pour satisfaire cette règle. Priorité,
capacité, daily caps, échéances, exactitude rationnelle et terminaison restent
obligatoires. Aucun déplacement/troncature au Save ; aucune transformation des
captures existantes, modification V5/V6/V7 ou reconstruction dans History.

**Contrats existants conservés :** source Actuals exclusive par objet ; V5
courant seul, sinon legacy V4 pending seul ; absence de connaissance distincte
de zéro connu ; `isActive` ne filtre que Forecast ; RAF des requirements utilisé
sans nouvelle soustraction Actuals ; slots figés chaque jour et priorité globale
unique ; faisabilité Mandatory conditionnelle sans prédiction des slots futurs ;
Save/Delete sans recalcul ; History lit les valeurs capturées.

**Propositions de ce plan, pas décisions métier déjà validées :**

| Réf. | Proposition | Validation attendue |
| --- | --- | --- |
| P1 | Borne = `coverage.actualsThrough` de la source V5 courante ; jamais `knowledgeDate`, date de Save ou dernier jour positif. | Audit du plan : traduction de « fin de période Actuals connue ». |
| P2 | Sans V5, borne = dernier `actualsThroughDate` legacy de l'objet, pour toutes ses Teams ; conserver une borne future V4 sans la rabattre à aujourd'hui. | Audit métier des données legacy, sans conversion implicite. |
| P3 | Couverture absente / RAF seul : aucune borne ; érosion : borne courante plus ancienne, ou aucune après érosion totale. Ne pas prendre le maximum des versions passées. | Arbitrage explicite sur la connaissance rectifiée, §4. |
| P4 | Représentation dérivée totale `{projectId, actualsThrough: CivilDate \| null}`, obligatoire dans l'entrée moteur ; garde commun admission/accessibilité. | Audit technique ; aucun nouveau champ persisté. |
| P5 | Garder les diagnostics/automate existants ; pas de nouveau diagnostic de blocage ni faisabilité pré-admission. | Audit fonctionnel des cas Mandatory, §6. |
| P6 | Reservations : conserver leur demande indépendante dans 11C ; aucune borne Reservation ajoutée. | Arbitrage métier séparé, §8 ; ne pas présenter ce choix comme déjà validé. |
| P7 | Incrémenter seulement l'identifiant du contrat moteur des nouvelles captures à `planning-engine-v1/actuals-aware/2`. | Audit technique de traçabilité ; schémas inchangés. |

L'approbation du plan doit consigner ces choix ; elle ne vaut pas automatiquement
autorisation de coder. Un choix différent sur P2/P3/P6 impose une révision ciblée
avant implémentation, sans élargissement silencieux du lot.

## 3. Causes et chemins de calcul constatés

### Reconstruction et perte de connaissance à la frontière

`src/domain/actuals/reconstruction.ts::reconstructActuals` sélectionne
`snapshots.at(-1)` si l'objet a un V5, sinon `legacyV4Actuals ?? actuals`.
`processSnapshot` distribue chaque période du snapshot courant par Team ;
`process` distribue les deltas V4 dans les intervalles des records de l'objet.
`distribute` conserve exactement les quantités par pondération de capacité,
fallback calendrier/exceptions, puis fallback toutes dates. Les contributions
incluent les zéros, les identités et les dates hors horizon, indépendamment
de l'activation.

`actualOccupationFromReconstruction` agrège par Team/date, sépare Project et
Reservation, vérifie l'égalité avec `teamDayTotals`, puis **omet les lignes dont
le total est nul**. Ce résultat perd l'identité Project et la couverture connue.
Il exprime une occupation de capacité, aucune interdiction temporelle. Même
une contribution positive ne sature pas nécessairement la capacité du jour.
Une couverture jusqu'au 30 septembre peut donc laisser du Forecast en septembre.
Reconstituer la borne depuis ces lignes, les seuls jours positifs ou la dernière
consommation de chaque Team serait incorrect, notamment pour une Team nouvelle.

### Entrées, capacité, admission et allocations

`src/domain/planning/contracts.ts::PlanningInput` contient Portfolio, horizon,
working pattern, parallélisme et `actualOccupation`, sans borne Project.
`src/application/planning/recomputePlanning.ts::RecomputePlanningRequest` et
`recomputePlanning` transmettent exactement ces champs.
`src/main/planning/buildPlanningSessionProjection.ts` reconstruit les Actuals,
construit l'occupation, appelle le moteur, puis les adaptateurs Timeline et
Geometry ; il publie ensemble Portfolio, horizon, résultat et reconstruction.

Dans `src/domain/planning/engine.ts` :

- `projectsForTeam` produit un état pour **chaque requirement actif**, RAF zéro
  ou positif, même s'il ne sera jamais admis. Il n'y a pas de borne Actuals.
- `planTeam::snapshotForDate` cache la capacité Team/jour ;
  `baseCapacityForDate` est commun à l'horizon et aux lookaheads.
  `dailyCapacitySnapshot` dans `src/domain/capacity/calculations.ts` applique
  `B = max(0, effective - ProjectActual - ReservationActual - ReservationForecast)`.
  Ce calcul réduit la capacité de tous les Projects ; il ne suffit pas à rendre
  un Project particulier inéligible.
- `selectAdmittedProjects` ignore RAF nul, `earliestStartDate` future et cap
  nul, puis prend les premiers N en priorité si B est positif. Un Project
  couvert par Actuals peut aujourd'hui prendre un slot et recevoir du Forecast.
- `allocateFairlyToAdmittedProjects`, `allocateCompleteRounds` et
  `normalAllocationIncrement` partagent exactement par quanta de `1/2`,
  avec achèvement final sous-quantum et caps. Leur ensemble admis est figé.
- `allocateDeadlineProjects`, `sumDeadlineAccessibility` et
  `deadlineAccessibleCapacity` constituent l'autre chemin à protéger : RAF,
  potentiel exact jusqu'à deadline, caps, résidu laissé par les deadlines
  admises plus prioritaires, éventuellement au-delà de l'horizon.
- `commitDailyAllocations` écrit les allocations positives ; `projectResult`
  expose planifié, RAF non planifié, complétion et dernière allocation comme
  fin Team lorsque complète. Filtrer après ce point casserait ces égalités.

### Adaptateurs, capture et History

`src/adapters/timeline/buildTimelineViewModel.ts` projette les allocations du
run et les contributions Actuals clippées à l'horizon, avec vérification de
parité des demandes Reservation nommées. `buildTimelineGeometry.ts` et les
renderers dessinent ces décisions ; ils ne doivent ni décaler ni masquer une
allocation pour réparer le moteur.

`src/adapters/metrics/cursorMetrics.ts::calculateCursorMetrics` somme le run
sur l'intervalle inclusif horizon → curseur. Les progressions Projects utilisent
Forecast / RAF initial ; `calculateReservationProgressQuantities` calcule
séparément la demande Reservation pour Program/Pas. Ces formules ne doivent
pas devenir Actuals / EAC à l'occasion de 11C.

`src/domain/portfolioSnapshots/historicalDailyProfile.ts::projectActualsRange`
sait déjà sélectionner exactement la couverture Project : V5 courant, sinon
début legacy → dernier record, sinon null. Ce helper doit rester cohérent avec
la future borne moteur. `captureDailyProfiles` agrège les contributions et
allocations **publiées** ; `capturePortfolioSnapshot` utilise les helpers de
dates et la constante `PLANNING_ENGINE_VERSION`.
`createPlanningProjectionDispatcher` reconstruit une fois les commandes
ordinaires avant écriture V7, mais Save/Delete réutilisent la projection.
`validateHistoricalSnapshot` hydrate les références pour validation sans
moteur ; `validateHistoricalDailyProfile` accepte aujourd'hui un chevauchement
et ne doit pas recevoir une interdiction universelle rétroactive.

11B (`buildProjectHistoryViewModel`, Geometry et UI History) affiche les profils
capturés, dont leurs empilements Actuals/Forecast et marqueurs de couverture.
La promesse historique de restitution des chevauchements reste valide.

## 4. Invariant et règles aux frontières proposées

Pour un Project P, T(P) est une date civile inclusive ou null. Pour toute Team
t requise et toute allocation Forecast positive F(P,t,d) du run :

```text
F(P,t,d) > 0  ⇒  d ∈ horizon
                 et (T(P) = null ou d > T(P))
                 et (earliestStartDate absente ou d >= earliestStartDate)
```

L'admission doit elle aussi exclure P si `d <= T(P)` : aucun slot occupé, aucune
trajectoire réservée. Les autres Projects conservent l'accès à la capacité
résiduelle et leur ordre relatif. Ce n'est ni une borne globale du Portfolio,
ni un zéro de capacité Team/jour, ni une borne différente selon la Team.
Les Actuals d'autres Projects/Reservations continuent d'occuper la capacité.

Le premier jour **éligible** est conceptuellement
`max(horizon.start, earliestStartDate, lendemain de T)` lorsque T existe ;
le premier jour **alloué** peut être ultérieur selon capacité, calendrier, cap
et admission. Implémenter `compareCivilDates(d,T) > 0`, sans construire T+1 :
une borne `9999-12-31` ferme tout Forecast représentable sans overflow.
Pas d'horloge système, de cursor, viewport ou fuseau horaire dans ce calcul.

| État source / frontière | T(P) et comportement cible (P1–P3) |
| --- | --- |
| V5 couvert, une ou plusieurs périodes | Fin globale `current.coverage.actualsThrough`, égale à la fin du dernier period validé. Ne pas examiner les anciennes versions. |
| Périodes avec consommés zéro, y compris dernière période zéro ou capacité zéro | Même borne : zéro est connaissance. La densité des contributions n'intervient pas. |
| « Période nulle » au sens couverture absente | T = null ; pas de frontière déduite. Une période de durée zéro/inversée n'est pas une couverture valide ; `[d,d]` est une période valide d'un jour et bloque ce jour inclus. |
| Aucun snapshot et aucune chronique | T = null, comportement Forecast existant. V1–V3 idem après migration existante. |
| V5 RAF seul, positif ou zéro, couverture absente | T = null même si `knowledgeDate` est récente. Le RAF positif est planifiable selon les autres contraintes ; RAF zéro n'est pas admis. |
| V4 pending, Teams intermittentes ou absentes du dernier record | T = dernier through de l'objet ; s'applique aussi aux requirements nouveaux/réintroduits et RAF de provenance configuration. Ne pas rechercher le dernier record par Team. |
| V5 présent + evidence V4 retenue | V5 seul, même sans couverture ; aucune reprise de la borne legacy ni maximum entre sources. |
| Coverage avant horizon (`T < start`) | Aucun blocage additionnel dans l'horizon. Reconstruction complète inchangée. |
| Coverage recouvrant le début / commençant après le début de l'horizon | Tout d ≤ T interdit, même avant `actualsFrom`. Le RAF est une estimation après T, pas une quantité à placer dans les trous antérieurs. |
| T = fin d'horizon ou T > fin | Aucune allocation ; chaque requirement actif positif garde un plan incomplet, RAF non planifié entier, diagnostic horizon. Capacité reste disponible pour d'autres Projects éligibles. |
| V4 through futur, accepté par les lecteurs existants | Garder cette date ; ne pas inventer `knowledgeDate`, réconcilier, rejeter l'import valide ou clipper à today. Peut bloquer tout l'horizon. |
| V5 coverage future relativement à la clock technique de lecture | Conserver la couverture validée. Garder les règles internes et celles du lecteur V5 ; ne pas ajouter une relation clock aux lecteurs V6/V7. |
| Project inactif | Dériver/conserver T sans Forecast, plan Project ni diagnostic Forecast ; Actuals restent dans l'occupation. Réactivation utilise la source et la borne courantes. |
| Ajout/retrait/réintroduction Team | Une même T sur toutes les Teams actuellement requises ; les marqueurs retired ne recréent pas de requirement. Respecter les transactions/evidence 10C.1/10C.2. |
| RAF-only sur couverture existante | La borne est inchangée malgré nouvelle version/knowledgeDate. |
| Extension/érosion/rectification validée | T suit la couverture courante ; total erosion → null. Anciennes versions et captures conservées. |

**Arbitrage P3 :** la fin de couverture peut reculer par une érosion déjà prévue
par 10C.1. Le plan recommande de permettre le Forecast après la nouvelle fin,
y compris dans des dates couvertes par une ancienne version. Sinon il faudrait
un nouveau concept « maximum de connaissance jamais atteinte » qui contredirait
la simulation par source courante et pourrait bloquer un RAF seul après érosion.
Cette autre politique n'est pas implicitement adoptée ; décider avant code.

Exemple d'acceptation : horizon 1 septembre–31 octobre, coverage jusqu'au
30 septembre inclus, RAF A = `1/3`, RAF B = `2/3`, B sans consommation legacy.
Avec capacité admissible le 1 octobre et slots disponibles, aucune des Teams
n'alloue en septembre ; première allocation possible le 1 octobre. Modifier
le consommé à zéro ou la répartition quotidienne ne change pas cette frontière.

## 5. Représentation minimale et transmission (P4)

Ajouter à `contracts.ts` un type d'entrée dérivé, readonly :

```typescript
interface ProjectActualsKnowledge {
  readonly projectId: ProjectId;
  readonly actualsThrough: CivilDate | null;
}
// PlanningInput et RecomputePlanningRequest :
readonly projectActualsKnowledge: readonly ProjectActualsKnowledge[];
```

Une ligne pour **chaque** Project, actif ou inactif, dans l'ordre de
`portfolio.projects`. Tableau et lignes gelés. Null signifie uniquement absence
de couverture de la source courante, jamais « consommé nul » ni « RAF inconnu ».
Deux champs suffisent ; pas de TeamId, range complet, knowledgeDate, snapshotId,
RAF ou consommé dupliqué, nouveau scalaire, nouvelle propriété Project persistée.
L'ordre n'est pas une deuxième priorité : seul `priorityOrder` décide admission.

Un projecteur pur amont `projectActualsKnowledgeFromPortfolio` près de la
reconstruction produit ces lignes **depuis les métadonnées source**, sans scan
quotidien ou historique. Réutiliser la sélection exacte de `projectActualsRange`.
Proposition de factorisation limitée : déplacer son corps et son type de range
neutre vers `src/domain/actuals/projectActualsKnowledge.ts`, puis conserver
l'API `projectActualsRange` et le type `HistoricalDateRange` existants via
réexport/alias dans `historicalDailyProfile.ts`. Les appelants historiques ne
changent pas de sémantique. Ce petit partage est motivé par la nécessité de
ne pas avoir deux sélections V5/legacy divergentes, pas par un refactoring
général des sources Actuals. `reconstruction.ts` peut exposer le projecteur
par réexport ; `ActualsReconstruction`, `distribute` et les contributions restent
inchangés. Aucun historique n'est transmis au moteur à travers cette extension.

`buildPlanningSessionProjection` calcule les deux entrées distinctes depuis le
même Portfolio candidat : occupation depuis la reconstruction complète ; borne
depuis la source courante. `recomputePlanning` transmet sans interprétation.
Tous les appels directs doivent fournir le champ ; pas de fallback implicite
`?? []` qui permettrait d'oublier la contrainte. Un Portfolio vide a `[]` ;
un Project sans Actuals a sa ligne avec null.

À l'entrée de `planPortfolio`, valider en une passe : tableau complet, un ID
connu unique par Project, date civile canonique ou null, aucune ligne manquante
ou surnuméraire ; signaler `TypeError` avec chemin/ID selon les guards existants.
La validation source ↔ date est la responsabilité du producteur pur et de ses
tests : le moteur ne relit pas partitions/histoires pour reconstituer la borne.
Indexer une Map ProjectId → date une fois par run, puis placer T dans chaque
`ProjectTeamState` construit par `projectsForTeam`. L'état demeure présent même
quand son éligibilité n'arrive jamais dans l'horizon.

## 6. Admission, Mandatory, lookahead et diagnostics (P5)

Créer un prédicat moteur commun de dates, par exemple
`isProjectDateEligible(state,date)` : respect de `earliestStartDate` inclusive
et de T exclusive. `selectAdmittedProjects` l'utilise avant de prendre un slot,
en conservant RAF/cap nul, capacité Team et priorité. L'allocation normale et
ses rounds batched restent alimentés par le seul ensemble admis figé.

`deadlineAccessibleCapacity` applique **le même prédicat**, retourne ZERO si
la date est interdite, avant lecture/création du résidu puis applique cap et
allocation du jour pour les dates autorisées. Ce zéro est **propre au Project** :
ne jamais écrire zéro dans `residualByDate` pour signifier son inéligibilité,
ni dans le cache Team `baseCapacityForDate`. Un autre Project peut utiliser
cette capacité. Les trajectoires ne soustraient que leurs increments exacts.

La garde couvre `sumDeadlineAccessibility`, le ratio faisable, l'allocation
immédiate optimisée sans lecteur ultérieur, la trajectoire complète lorsqu'une
autre deadline admise peut la lire, et l'allocation maximale des statuts
UNFEASIBLE/MISSED. Ne pas créer un second calcul de capacité et ne pas plafonner
le lookahead à l'horizon : les capacités/Actuals/Reservations connues au-delà
restent utilisées jusqu'à la deadline. Seules les allocations dans l'horizon
sont committées ; aucun lookahead ne devient une allocation capturée.

**Observation importante :** avec une borne constante et l'admission corrigée,
un Project admis aujourd'hui vérifie déjà today > T ; toutes ses dates futures
jusqu'à deadline vérifient aussi cette condition. Le garde lookahead est une
protection du contrat commun, pas un motif pour inventer un nouveau solveur
ou un scan passé. L'effet principal sur la faisabilité est de retarder la
première admission et donc de réduire la fenêtre today → deadline disponible.
Les tests ne doivent pas prétendre qu'un Project correctement admis rencontrerait
sa propre borne dans le futur. Tester le prédicat/accessibilité à leurs
frontières et le chemin complet avec première admission retardée.

| Situation avec RAF positif | Comportement proposé |
| --- | --- |
| Avant T+1, deadline non dépassée | Pas d'admission, pas de test de faisabilité anticipé : PENDING. Pas de diagnostic UNFEASIBLE artificiel. |
| Première admission après T, today ≤ deadline | Test exact sur les dates admissibles et résidus ; FEASIBLE ou UNFEASIBLE selon capacité/cap. Conserver le diagnostic existant au jour du constat. |
| Deadline = T ou antérieure à T | Aucune allocation jusqu'à T ; dès qu'une date d'horizon dépasse la deadline, MISSED, même sans admission. Après T, allocation maximale seulement si admis. |
| Deadline future hors horizon et T ≥ horizon.end | Aucune admission dans le run ; PENDING si la deadline n'est pas dépassée, horizon non planifié. Ne pas prédire de slots hors horizon. |
| Deadline déjà dépassée au début de l'horizon | MISSED dès ce premier jour si RAF reste, y compris si T bloque encore ; garde temporel prioritaire sur la consommation. |
| RAF zéro | Plan actif complet sans allocation ; pas de diagnostic RAF/deadline manquée, aucune division par zéro. |
| Project inactif | Aucun état/diagnostic Forecast ; Actuals restent chargés. |

`updateMissedDeadlineStatuses` reste appelé avant admission ; son événement
`DEADLINE_MISSED` reste émis une seule fois par Project/Team. `recordDeadlineStatuses`
reste quotidien. `PROJECT_REMAINS_UNPLANNED_AT_HORIZON` reste par requirement
positif non achevé ; `DEADLINE_UNFEASIBLE` reste réservé au constat sur admission.
Les codes d'overload Team et leur partition marginale ne changent pas.
Si le métier veut signaler immédiatement une deadline ≤ T sans attendre son
passage, ou afficher une cause « bloqué par Actuals », ce serait un arbitrage
additionnel sur diagnostics, pas une conséquence autorisée ici. Recommandation :
retenir l'automate existant et traiter cet enrichissement dans un lot séparé.

## 7. Effets attendus sur projections et captures

**Dates estimées :** conserver `projectEstimatedStartDate` (minimum de première
contribution Actuals positive et première allocation Forecast positive, toutes
Teams, sans clipping) et `projectEstimatedEndDate` (inactif ; incomplet ; maximum
des fins Team complètes définies ; no-allocation). Ne pas remplacer un début
par T+1 ou `earliestStartDate`. Des Actuals positifs gardent leur début ; des
Actuals couverts zéro peuvent conduire à un début Forecast ultérieur. Une
allocation retardée peut rendre la fin absente/incomplete-within-horizon.
RAF zéro n'invente pas une fin à la borne Actuals. Les fins d'autres Projects
peuvent aussi changer, par effet d'admission/capacité : ne pas promettre une
monotonie globale des dates.

**Planning :** les surfaces Forecast reflètent les allocations corrigées et
les fins/diagnostics du run ; Actuals, provenance, quantités et clipping restent
inchangés. Les marqueurs earliest/objective/mandatory continuent d'exprimer
leurs contraintes d'origine. Aucun nouveau marqueur de cutoff Planning requis
pour satisfaire l'invariant. Geometry/SVG/hit testing ne replanifient pas.
Préserver cursor, zoom/pan, drafts, activation, réordonnancement, suspend/resume.

**Métriques :** capacité effective, occupation Actuals, demande Reservation et
les deux overloads sont identiques à inputs égaux ; le Forecast alloué, Occupied,
Occupancy et les progressions peuvent changer. RAF initial et EAC ne changent
pas. À curseur ≤ T, le numérateur Forecast de P est zéro, y compris Team sans
historique. Sommes exactes globales avant division, ratios indéfinis à capacité
nulle et excès non compensants restent ceux de 10B. Program/Pas reflètent les
nouvelles allocations Projects avec leurs demandes Reservation inchangées.

**Futurs Saves :** `captureDailyProfiles` garde les dates/quantités exactes du
run publié, `actualsRange` de la source, `forecastRange` de l'horizon et jours
sparse. Si T existe, chaque jour de nouveau profil à Forecast positif vérifie
d > T. Un Project bloqué avec RAF positif conserve RAF/EAC, profil Forecast
vide et reason incomplete-within-horizon. Aucun travail inventé pour atteindre
EAC dans le profil. Conservation Actuals, Forecast ≤ RAF, égalité si complet.

P7 : modifier la constante de capture pour les **nouvelles** captures uniquement.
Le moteur change son résultat possible ; conserver `/1` ferait perdre cette
traçabilité. `engineVersion` est déjà une string libre non vide validée : `/2`
n'exige ni format nouveau, ni registre de moteurs, ni changement
`inputsSchemaVersion=1`, `forecastSchemaVersion=2` ou enveloppe V7. Les anciens
IDs, engineVersions et résultats ne sont jamais réécrits.

**History et validation :** conserver la validation structurelle actuelle des
profils et son acceptation des anciens chevauchements, même si `engineVersion`
est inconnu. Ne pas y injecter le nouvel invariant global ni un replay. Un
check éventuel de cohérence live appartient au producteur/run courant ; Save
ne filtre, déplace, tronque ou recalcule jamais. Une collection mixte montre
exactement anciens chevauchements et nouvelles séparations, avec ses profils
schema 1 explicitement indisponibles, marqueurs inclusifs et comparaisons exactes.

## 8. Reservations — décision recommandée et questions métier

Le contrat 10B prévoit explicitement l'addition des Actuals et de la demande
Forecast **d'une même Reservation sur une même date**. `ratio` demande une
part de capacité effective ; `fixed-daily` demande x md/jour selon les règles
calendrier/périodes/exceptions existantes. Une Reservation n'a pas de RAF et
n'est ni admise ni soumise aux slots/deadlines Project. Son intervalle est une
configuration de demande, pas une fenêtre de travail restant.

**Recommandation P6 : ne pas appliquer la borne Project aux Reservations en
11C.** Garder `requestedReservationCapacity`, `reservedCapacity`,
`dailyCapacitySnapshot`, leurs adaptateurs nommés et métriques inchangés.
Exemple : capacité 10, Reservation Actuals 3 et demande Forecast 4 le même
jour → charge 7 avant Projects ; cette valeur demeure même si la source
Reservation couvre ce jour. L'exclusion de Forecast Project dépend uniquement
de la borne de ce Project, pas de la couverture d'une Reservation associée à
la même Team/Programme/Pas. Inactive Reservation : Actuals conservés, demande
Forecast exclue comme aujourd'hui.

Motif : supprimer les demandes sur les dates couvertes changerait le contrat
indépendant 10B, la capacité disponible pour tous les Projects, l'over-reservation,
les progressions Program/Pas et les totaux affichés dans les cartes. Retrancher
le consommé d'une demande ratio/fixe ou déplacer celle-ci serait une troisième
sémantique, sans justification RAF. Aucune de ces décisions ne découle du brief.

Questions à trancher explicitement :

1. La demande Reservation représente-t-elle toujours un engagement indépendant,
   ou les Actuals doivent-ils la remplacer sur les dates couvertes pour cet objet ?
2. Si remplacement voulu, est-il commun à toutes les Teams et à ratio/fixed-daily,
   y compris covered-zero, Team nouvelle, legacy intermittent/futur et érosion ?
3. Les totaux de carte sur l'intervalle complet et les progressions Program/Pas
   doivent-ils montrer la demande configurée ou seulement son futur non couvert ?

Un éventuel remplacement exige un lot séparé avec même règle dans capacité
moteur/lookahead, demandes nommées Timeline, totaux de carte et métriques ; pas
un filtre local du renderer. History 11B n'ajoute pas de frises Reservation.
Ces questions ne bloquent pas la rédaction du plan Project ; avant le code,
consigner l'accord de conserver la sémantique actuelle dans 11C, ou recadrer.

## 9. Modifications futures, fichier par fichier

| Fichier / frontière | Modification prévue après autorisation |
| --- | --- |
| `src/domain/actuals/projectActualsKnowledge.ts` (nouveau, ciblé) | Héberger la sélection pure de range courante partagée ; produire les lignes readonly de connaissance par Portfolio, sans reconstruction ni clock. |
| `src/domain/actuals/reconstruction.ts` | Exposer le projecteur amont ou son réexport ; documenter occupation ≠ connaissance. Conserver distribution, contributions/totaux et omission des zéros de l'occupation. |
| `src/domain/portfolioSnapshots/historicalDailyProfile.ts` | Réexport/alias du helper/type de range partagé ; aucune nouvelle interdiction de chevauchement historique, aucune modification des fields ou de la validation. |
| `src/domain/planning/contracts.ts` | Ajouter type et champ d'entrée obligatoires ; `PlanningResult`, allocations, capacités et codes inchangés. |
| `src/domain/index.ts` | Exporter le type/projecteur selon la frontière publique existante. |
| `src/application/planning/recomputePlanning.ts` | Champ obligatoire dans request et forwarding exact vers `planPortfolio`. |
| `src/main/planning/buildPlanningSessionProjection.ts` | Dériver borne et occupation du même Portfolio candidat avant moteur ; pas de source historique Portfolio Snapshot ni de clipping préalable. Pas de nouveau state persisté. |
| `src/domain/planning/engine.ts` | Validation/index une fois dans `planPortfolio`, T dans states, prédicat date commun pour admission/accessibilité ; conserver caches, priorité, rounds, automate et résultats partiels. |
| `src/application/portfolioSnapshots/capturePortfolioSnapshot.ts` | Incrément ciblé de `PLANNING_ENGINE_VERSION` pour les nouveaux Saves (P7), aucune correction de profil au Save. |
| Appels directs et fixtures de request dans les tests | Fournir les lignes dérivées, null pour les cas sans Actuals ; vérifier les oublis par typecheck et guards. Ne pas affaiblir les attentes sans Actuals. |
| `src/adapters/timeline/buildTimelineViewModel.ts`, `timelineViewModel.ts`, Geometry/SVG/tooltip Planning | Pas de changement de production prévu : consommer run corrigé ; tests de parité/absence de décalage. Ajustement seulement si défaut concret démontré. |
| `src/adapters/metrics/cursorMetrics.ts`, `projectEstimatedDates.ts` | Pas de formule nouvelle ; tests sur nouveaux runs et dates/reasons. |
| `captureDailyProfiles.ts`, dispatcher, session, backup operations, codecs V5/V6/V7 et localStorage | Pas de changement de format, mutation Actuals/RAF ni stratégie transactionnelle ; tests d'intégration/migration. |
| Application/adapters/UI History | Aucun recalcul ou correction de production prévu ; tests de restitution de collection mixte. |
| Canons/roadmap et canon de réalisation 11C | Après implémentation autorisée, documenter la borne dérivée et amendement limité du contrat moteur, résultats et limites ; IN REVIEW avant audit, jamais DONE automatiquement. Aucun de ces canons n'est modifié dans la présente passe. |

Inventaire des appels directs identifié : tests `domain/planning/engine`,
`engine.termination`, `domain/capacity/reservation`,
`application/planning/recomputePlanning`, `adapters/timeline/buildTimelineViewModel`,
`main/demo/createDemoPlanningScenario` et `main/planning/realBackupMandatory`.
Le chemin applicatif courant passe par `buildPlanningSessionProjection`.
Revérifier cet inventaire par `rg` lors de l'implémentation.

## 10. Séquence future et matrice de tests

Après audit des P1–P7 et autorisation explicite : (1) caractériser les cas
sans borne et le chevauchement courant ; (2) helper partagé et entrée typée ;
(3) forwarding/main et tous callers ; (4) garde admission/accessibilité ;
(5) version moteur ; (6) intégrations/captures/history ; (7) gates et revue
visuelle ; (8) canons/résultats IN REVIEW puis audit humain. Ne pas commencer
une refonte Reservations ou History pendant cette séquence.

| Niveau / emplacement | Cas minimum | Assertions mesurables |
| --- | --- | --- |
| Unitaire source — module Actuals et helper range | V5 multi-period, tail zéro, tout zéro, absent/RAF-only, V5 sans coverage après coverage ancienne, V5+V4 retained, V4 intermittent/dernier record sans Team historique, nouvelle Team | T depuis source courante seule, toutes Teams même T, null distinct de covered-zero, égalité avec `projectActualsRange` ; output immuable/déterministe, pas de distribution. |
| Unitaire frontière moteur — `engine.test.ts` | Champ absent à runtime, doublon/ID inconnu/ligne manquante/date invalide/null valide, Portfolio vide, inactifs inclus | Rejet explicite des entrées incomplètes ; pas de fallback qui contourne la borne. |
| Unitaire dates/éligibilité | d = T−1/T/T+1, earliest avant/égale/après borne, `[d,d]`, 30/09→01/10, année/bissextile, `9999-12-31` | Inclusion Actuals/exclusion Forecast exacte ; aucune addition de jour overflow, aucune influence DST/clock. |
| Moteur normal — `engine.test.ts` | Deux Teams dont une sans historique, zéro occupation, priorité haute bloquée/N=1, deux Projects avec T distincts, RAF zéro, cap zéro, cap `1/3`, RAF `1/3`/`2/3`, capacité faible/nulle, exception non ouvrée | Zéro admission/allocation du bloqué ; le suivant éligible prend le slot ; ≤ N et freeze intra-jour ; toutes allocations respectent borne, cap, B et RAF ; exact quanta/final fraction. |
| Moteur horizon | T avant/début/milieu/fin/après horizon, coverage entièrement future, earliest hors horizon | Un plan par requirement actif, RAF positif jamais disparu ; planifié+non planifié=RAF ; absence end si incomplet ; diagnostic horizon par requirement. |
| Mandatory — `engine.test.ts` | Première admission retardée ; deadline avant/égale/après T, égale T+1, avant start, hors horizon ; refus de slot par priorité, RAF zéro, cap zéro/positif, B zéro | PENDING sans admission sauf MISSED après date ; pas de FEASIBLE/UNFEASIBLE anticipé ; date MISSED unique ; aucun statut n'autorise une allocation ≤ T ; ratio exact sans division par zéro. |
| Mandatory multiple/lookahead | Deux deadlines admises plus Project normal ; dernière deadline (chemin optimisé) et lecteur ultérieur (trajectoire complète), caps, Actuals/Reservations hors horizon | Même garde d'accessibilité ; résidu partagé jamais annulé à cause d'une borne propre ; priorité de consommation conservée ; aucune allocation hors horizon ; faisabilité sur capacité connue jusqu'à deadline. |
| Non-régression capacité / Reservations | Demandes ratio/fixed, mixtes, covered-zero et Actuals positifs, inactives, exceptions et gaps ; surcharge Actuals seule/Reservation marginale/both | À inputs identiques, exact P/Q/R/B et overloads identiques ; sémantique P6 indépendante ; pas de cutoff Team global. |
| Application / Main — `recomputePlanning.test.ts`, `buildPlanningSessionProjection.test.ts`, `lot10c1SnapshotProjection.test.ts` | Forwarding, état multi-Team V5/V4, apply RAF-only, extension/érosion/rectification, membership handoff, activation/reorder/capacity/calendar | Même source pour occupation/borne, une projection par changement accepté, zéro avant Apply/Cancel ; mutations autorisées existantes seules, pas de mutation Actuals/RAF induite par moteur ; borne recalculée après chaque état candidat. |
| Transactions — `planningPersistenceTransaction.test.ts` | Échec projection et écriture, no-op/invalid/stale, import preflight, Save/Delete | Avant publication tout reste atomique ; erreur laisse état/projection/document/drafts ; Save/Delete zéro moteur/reconstruction ; conservation de toutes captures antérieures. |
| Adaptateurs/dates — Timeline, Geometry, `projectEstimatedDates.test.ts` | Actuals positifs/covered-zero/RAF-only, complet/partiel/bloqué, multi-Team mixte, inactif, dates hors horizon, autres Projects libérés | VM/geometry ne décalent pas les dates du run ; begin = activité positive réelle, end/reasons exacts ; Actuals complets inchangés ; zoom/pan/cursor sans moteur. |
| Métriques — `cursorMetrics.test.ts` | Curseur avant/à/après T, tiers/grands rationnels, plusieurs Teams/groupes, capacité zéro et excès journaliers | Numérateur P Forecast nul jusqu'à T ; RAF baseline inchangé ; somme occupied et progress exactes ; Program/Pas incluent demandes Reservation intactes, pas de moyenne de ratios. |
| Capture — `dailyProfiles.test.ts`, `portfolioSnapshots.test.ts` | Nouveau Save V5/legacy couvert, RAF-only, inactif, zéro/partiel/complet/bloqué, out-of-horizon Actuals | Profil = run jour par jour toutes Teams, Forecast positif > T, sommes exactes, RAF/EAC inchangés ; nouvelle engineVersion, aucun filtre/recalcul/correction au Save. |
| Migration — backup V5/V6/V7 et opérations | V4 future/intermittent lossless, V5 règles knowledgeDate existantes, V6 schema 1 et V7 collection mixte contenant ancien chevauchement | Tous les anciens snapshots restent égaux profondément après decode/encode à timestamp fixe ; ancien engineVersion intact, aucun enrichissement schema 1 ; seul run courant corrigé. Startup sans rewrite ; import valide non rejeté pour chevauchement historique. |
| History — VM/Geometry/coordinator | Même Project : ancienne capture avec chevauchement (dont Forecast avant actualsFrom), nouvelle capture séparée ; covered-zero, schema 1, engineVersion inconnu | Deux formes restituées exactement, marqueur through indépendant, comparaisons exactes ; aucun moteur/reconstruction/écriture ; pan/cache et retour Planning inchangés. |
| Terminaison/performance — `engine.termination.test.ts`, `realBackupMandatory.test.ts` | Sans Actuals, grand RAF rationnel, horizon fini tout bloqué, grandes deadlines, plusieurs bornes et trajectoires observées/non observées | Aucune boucle supplémentaire sur workload ou attente du déblocage ; digest sans borne identique ; fixture réelle Mandatory garde son seuil existant < 5 s ; documenter mesures séparées. |

Ne pas réécrire des attentes anciennes pour masquer une régression : seuls les
cas courants présentant le chevauchement désormais interdit doivent évoluer.
Conserver explicitement les fixtures historiques chevauchantes valides.
Gates futures : `npm run typecheck`, `npm test`, `npm run build`,
`git diff --check`, aucun test skipped/cancelled/todo ajouté. Baseline documentaire
11B : 805 tests/93 suites consignés ; nombre final dépend des ajouts 11C.
Revue desktop 1440 et narrow 390 light/dark : séparation réelle Planning,
ancien chevauchement History, tooltips/dates/diagnostics/progress, activation,
retour avec drafts/focus/viewport intacts et absence d'overflow.

## 11. Performance, exactitude et terminaison

Dérivation/validation/index de borne : **O(P)** temps/espace sur Projects et
accès à la dernière source, sans scan des jours ni cumul des snapshots.
Lookup O(1) par état à sa construction ; comparaison civile constante par
test de date. Ne pas rescanner toutes les contributions par Project/Team/jour,
ni matérialiser des dates supplémentaires jusqu'à la borne. Les coûts de
reconstruction Actuals et de capture existants ne sont pas élargis.

L'horizon reste fini et parcouru chaque jour, même si tout est bloqué : il faut
conserver capacités, admissions vides et diagnostics temporels. Les lookaheads
restent finis today→deadline, paresseux pour capacité et avec suppression des
trajectoires futures non lues. Ne pas remplacer les boucles batched de rounds
par une boucle par demi-journée ni perdre la simplification des facteurs
rationnels. Aucune boucle « tant que Project bloqué » et aucune extension de
l'horizon pour finir le RAF.

Les guards n'ajoutent que des exclusions ; les allocations positives diminuent
exactement RAF/capacité, les passes sans allocation s'arrêtent. Les preuves de
terminaison existantes restent valides. Pas de conversion Number des quantités ;
ZERO et autres calculs restent rationnels. La comparaison de dates ne crée
aucun grand dénominateur. Le retard d'admission peut cependant modifier quels
Mandatory sont simultanément admis et le coût des trajectoires : mesurer plutôt
que supposer toute projection plus rapide.

Mesures proposées après implémentation : fixture réelle V3 sans borne (digest
strict inchangé), même scénario avec couverture d'un Project, scénario 100
Projects × 2 Teams × 730 jours avec couverture zéro, cas tout bloqué et cas
plusieurs Mandatory/fractions longues. Relever médianes de 5 runs après warmup,
temps dérivation/engine/full projection et jours lookahead effectivement lus.
Comparer sur même machine/runtime : cible de non-régression sans borne ≤ 20 %
au-delà de la médiane baseline lorsque mesurable ; au-delà, investiguer et
documenter avant clôture, sans arrondir les rationnels ni affaiblir le seuil
réel < 5 s. Ces chiffres sont des gates proposés, pas des mesures déjà obtenues.

## 12. Migration et critères d'acceptation

**Aucune transformation des snapshots enregistrés.** Le déploiement futur
reconstruit seulement la projection **courante** au chargement ou par les
transitions normales. Ses Forecast/dates/diagnostics peuvent changer sans
modification des Actuals ni du RAF. Un import conserve toutes les captures,
y compris les chevauchements, et projette le courant avec la nouvelle règle.
Startup ne réécrit pas le backup ; la prochaine commande acceptée suit l'écriture
V7 actuelle. Pas de batch de migration, correction d'anciennes dates, capture
rétroactive, archive, nouveau store ou relation de clock.

Acceptation mesurable après autorisation et implémentation :

1. Pour **100 %** des allocations Project positives du run, date > T si T
   existe ; zéro admission aux dates ≤ T, pour toutes Teams présentes.
2. À inputs métier égaux, Actuals reconstruits et RAF/EAC exacts identiques ;
   `plannedWorkload + remainingUnplannedWorkload = RAF` par requirement,
   allocations ≤ cap et capacité disponible ; toutes priorités/slots respectés.
3. Toute exigence active a son plan, même entièrement bloquée ; RAF positif
   non alloué produit incomplete-within-horizon et le diagnostic horizon.
   MISSED reste observé après deadline sans déroger à la borne.
4. Toutes les demandes/capacités/overloads Reservation suivent P6 approuvé,
   sans adoption automatique de la règle Project.
5. Nouveaux profils capturés égaux au run et séparés ; engineVersion nouvelle,
   V5/V6/V7, inputs schema 1 et forecast schema 1/2 inchangés ; zéro recalcul
   à Save/Delete et zéro troncature/déplacement.
6. Anciennes captures profondément égales après commandes et round trips,
   dates/IDs/ranges/quantités/versions conservés, ancien chevauchement lisible.
   History n'appelle jamais moteur/reconstruction pour réparer les profils.
7. Gates techniques et matrice pertinentes passent, digest réel sans Actuals
   inchangé, terminaison/performance vérifiées, revue UI documentée.
8. Livraison d'implémentation future IN REVIEW seulement ; audit et validation
   humaine requis pour DONE. **La présente livraison reste PLANNED / NOT STARTED.**

Arbitrages restants : P1–P5 à confirmer par l'audit (notamment coverage courante
après érosion et future-through V4), P6 à consigner explicitement pour les
Reservations, P7 à valider pour la traçabilité. Aucun changement d'architecture
plus large ou de formats n'est nécessaire dans le scénario recommandé.
