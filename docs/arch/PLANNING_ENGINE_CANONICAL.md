# Moteur de planification — conception canonique

## Purpose

Ce document définit le contrat fonctionnel cible du moteur de planification de
FlowPlan. Il sert de référence pour un futur refactoring : toute évolution du
moteur doit respecter ses invariants ou documenter explicitement un amendement.

L'objectif est de projeter, jour par jour et équipe par équipe, le RAF courant
des projets. Le résultat doit pouvoir alimenter le rendu FlowPlan existant via
un adaptateur, sans que le moteur connaisse l'interface graphique.

## Scope

Le moteur couvre la capacité effective, les réservations fermes, l'admission
quotidienne des projets, la répartition de capacité, les plafonds, les dates et
la production de projections partielles dans un horizon donné.

## Non-goals

Ne font pas partie du moteur : calculer le RAF depuis le consommé ou des
snapshots, persister des données, synchroniser des équipes, optimiser un
portefeuille global, arbitrer des priorités dynamiques, ni rendre une UI.
Il ne garantit pas qu'une date objectif soit tenue ; une deadline impérative
peut également être manquée tout en laissant le projet planifié.

## Terminology

- **Jour** : date civile (`CivilDate`), jamais un instant horodaté.
- **j.h** : charge/capacité exprimée en jours-homme.
- **RAF** : reste à faire courant, strictement positif tant que le projet n'est
  pas terminé pour l'équipe concernée.
- **Capacité effective** : `effectiveCapacity(team, date)`, capacité brute
  utilisable ce jour, après règles de calendrier et de capacité.
- **Capacité projet** : capacité effective moins réservations fermes, bornée à
  zéro.
- **Candidat** : projet éligible examiné dans l'ordre de priorité pour une
  journée donnée.
- **Projet admis** : candidat auquel l'algorithme attribue l'un des `N` slots
  de la journée. L'ensemble admis est figé jusqu'au lendemain.
- **Projet actif** : projet admis qui reçoit finalement une allocation
  strictement positive pendant la journée.
- **Slot occupé** : slot attribué à un projet admis. Un projet admis mais
  inactif conserve son slot pour la journée ; il n'est pas réattribué.
- **Date objectif** : cible descriptive, sans effet d'interdiction.
- **Deadline impérative** : contrainte évaluée et signalée, mais qui ne change
  jamais l'admission par priorité.
- **Statut de deadline** : `PENDING`, `FEASIBLE`, `UNFEASIBLE` ou `MISSED` ;
  son automate est défini dans la section *Deadline feasibility*.
- **Horizon** : intervalle inclus de simulation ; sa fin est la seule borne
  supérieure dure commune.

## Capacity model

Le planner consomme uniquement l'abstraction suivante :

```text
effectiveCapacity(team, date) -> non-negative j.h
```

Elle encapsule jours ouvrés/non ouvrés, FTE, indisponibilités, périodes de
capacité, exceptions et trous entre périodes. Le planner ne réimplémente aucune
de ces règles. Une capacité absente ou non positive vaut zéro.

Pour une équipe `t` et un jour `d` :

```text
projectCapacity(t, d) = max(0, effectiveCapacity(t, d) - firmReserved(t, d))
```

Une surcharge de réservation est conservée comme diagnostic ; elle ne crée
jamais une capacité projet négative.

## Firm capacity reservations

Une réservation ferme est associée à une équipe, une période et un ratio de sa
capacité effective. RUN, support, maintenance, formation et activité transverse
en sont des exemples. Elle est retirée avant tout projet, sans priorité métier
ni slot de parallélisme.

Pour V1, les ratios applicables le jour `d` s'additionnent :

```text
firmReserved(team, d)
  = effectiveCapacity(team, d) × applicableReservationRatio(team, d)
```

Une réservation de 20 % vaut donc 1 j.h avec une capacité effective de 5,
0,6 avec une capacité de 3 et 0 avec une capacité nulle. Les réservations sont
calculées exactement : une capacité de 3,2 avec 20 % réservé donne 0,64 réservé
et 2,56 de capacité projet. La granularité de 0,5 ne s'applique pas à cette
primitive interne, seulement aux allocations normales de projet.

Le résultat expose les réservations appliquées et les conflits où le ratio
cumulé dépasse 100 %. Dans ce cas, la capacité projet vaut zéro et ne devient
jamais négative. Une réservation fixe en j.h/jour n'est pas incluse dans V1.

## Project model

Un projet est fourni, pour chaque équipe qui le porte, avec : `projectId`, RAF,
priorité globale stable, `earliestStartDate` facultative, date objectif
facultative, deadline impérative facultative et plafond quotidien facultatif.

Le même `projectId` peut figurer pour plusieurs équipes avec un RAF propre à
chacune. Les champs de date exacts du modèle TypeScript restent à décider.

## Eligibility

À chaque jour, un projet est éligible si et seulement si son RAF restant est
strictement positif et que `date >= earliestStartDate` lorsqu'elle existe. Sans
date de début, il est éligible dès le début de l'horizon.

La date de début est une borne dure : un projet non éligible ne reçoit rien, ne
consomme aucun slot et ne réduit pas la capacité des autres.

L'éligibilité ne constitue pas une admission : elle rend seulement un projet
candidat pour la journée.

## Priority and daily admission

La priorité est l'ordre global des projets et demeure identique pendant toute
la simulation. Chaque jour, le moteur parcourt les candidats dans cet ordre et
admet au plus `N` projets. L'ensemble des projets admis est alors figé pour la
journée. Le moteur n'a pas à connaître l'allocation finale concurrente avant
d'attribuer un slot.

Un candidat est ignoré sans consommer de slot uniquement lorsqu'une contrainte
dure établit déjà qu'il ne peut recevoir aucune capacité : RAF restant nul ou
négatif, plafond quotidien nul, capacité projet du jour nulle, ou inéligibilité.
Un projet entamé n'a aucun droit acquis : l'arrivée d'un projet plus prioritaire
peut l'écarter dès le lendemain.

La priorité règle **l'admission** ; elle ne garantit pas une part de capacité
supérieure une fois les projets admis. Les égalités éventuelles doivent être
résolues avec une clé stable explicite (par exemple `projectId`) pour préserver
le déterminisme.

En formule : **la priorité détermine l'accès à la capacité ; une deadline
impérative peut déterminer la consommation de capacité une fois cet accès
accordé.** Une deadline ne permet jamais de passer devant un projet plus
prioritaire pour obtenir un slot.

## Parallel slots

Chaque équipe fournit `maxParallelProjectsPerTeam = N`. Après l'examen ordonné
des candidats, il y a au plus `N` projets admis. L'ensemble admis, et non
l'ensemble des projets finalement actifs, est figé pour le jour.

Un projet admis peut exceptionnellement finir avec une allocation nulle si les
consommations contraintes d'autres projets admis absorbent toute la capacité.
Il reste alors admis mais inactif ; son slot n'est pas réattribué et aucun
nouveau candidat n'entre avant le lendemain. Si un projet admis termine,
atteint son plafond ou ne peut absorber toute sa part, son reliquat peut
seulement être redistribué parmi les projets admis. Le comportement pour
`N <= 0` doit être validé en entrée (rejet recommandé) plutôt que déduit
implicitement.

## Normal daily allocation

Après le traitement des consommations éventuellement imposées par les deadlines,
répartir la capacité restante entre les projets admis :

1. répartir équitablement la capacité projet disponible entre les projets qui
   peuvent encore en recevoir ;
2. borner chaque part par le RAF restant et le plafond quotidien éventuel ;
3. redistribuer le reliquat aux autres projets admis de l'ensemble figé ;
4. arrêter lorsque la capacité est épuisée ou qu'aucun projet admis ne peut
   absorber davantage.

La granularité canonique normale est 0,5 j.h. Le dernier reliquat de RAF peut
être inférieur à 0,5 j.h afin de l'épuiser exactement. Lorsqu'une demi-journée
indivisible doit être départagée, elle revient au projet le plus prioritaire.
La règle d'arrondi exacte pour les quantités de deadline reste ouverte.

## Objective dates

Une date objectif mesure avance, retard ou dérive dans le résultat. Elle ne
rend jamais un projet inéligible et n'interdit aucune allocation après sa date.
La fin de l'horizon est la seule borne supérieure de projection.

## Mandatory deadlines

Une deadline impérative n'élève pas un projet dans l'ordre d'admission. Une
fois le projet admis, elle peut en revanche lui faire consommer plus que sa part
normale pour préserver une trajectoire réalisable. Un projet moins prioritaire
peut ainsi recevoir plus qu'un projet normal mieux prioritaire, s'ils sont tous
deux admis. Projet à deadline et réservation ferme restent deux concepts
distincts : la réservation est prélevée avant le planning, n'a pas de priorité
et ne consomme pas de slot ; le projet à deadline conserve RAF, priorité et
obligation d'obtenir un slot.

## Daily simulation philosophy

Le moteur canonique V1 est un simulateur quotidien, pas un solveur prédictif
global. Il ne réserve pas aujourd'hui des slots futurs et ne simule pas
récursivement les admissions futures afin de garantir une deadline. Il prend
ses décisions à partir de l'état de la simulation du jour.

Cette simplicité volontaire préserve compréhension, déterminisme,
explicabilité et facilité de test. Une optimisation prédictive pourra être
étudiée ultérieurement si un besoin métier explicite apparaît.

## Deadline processing order

Une fois l'ensemble admis figé, les projets admis portant une deadline sont
traités séquentiellement par priorité, sans optimisation globale :

```text
projets admis
  -> deadlines triées par priorité
  -> consommation contrainte de P1
  -> capacité restante
  -> consommation contrainte de P2
  -> capacité restante
  -> ...
  -> partage normal du reliquat
```

Cette séquence inclut les projets `FEASIBLE`, mais aussi les projets
`UNFEASIBLE` ou `MISSED`, qui cherchent à finir au plus tôt. La consommation
d'une deadline plus prioritaire réduit la capacité accessible des deadlines
moins prioritaires. Une deadline moins prioritaire peut donc rester admise mais
finir inactive si toute capacité est absorbée avant son traitement.

## Deadline feasibility

Pour tout projet possédant une deadline, le statut est obligatoirement
`PENDING` avant sa première admission effective dans un slot. Un candidat non
admis reste `PENDING`. Aucun test de faisabilité n'est alors effectué, même si
la deadline paraît intuitivement difficile à tenir : le moteur ne prédit pas
les futurs slots disponibles.

Lors de la première journée où le projet est admis, puis à chaque journée
ultérieure où il est admis tant que son statut n'est ni `UNFEASIBLE` ni
`MISSED`, le moteur réalise le test suivant.

Pour un projet admis `P`, `accessibleCapacity(P, d)` représente la
capacité maximale qu'il peut effectivement absorber au jour `d` s'il doit
préserver sa deadline. Elle tient compte de la capacité projet après
réservations fermes, du calendrier, du plafond quotidien de `P`, des
contraintes ou consommations déjà imposées, dans l'ordre de traitement, par les
projets admis à deadline plus prioritaires et de toute autre contrainte dure
déjà engagée.

Les allocations **normales** des autres projets admis, y compris plus
prioritaires, ne sont pas soustraites à l'avance de ce potentiel : elles sont
calculées seulement après la séquence des deadlines. Les projets moins
prioritaires ne réduisent pas ce potentiel.

```text
remainingAccessibleCapacity(P, today..deadline)
  = somme(accessibleCapacity(P, d)) pour chaque d de today à deadline
```

Au début de toute journée, si `currentDate > mandatoryDeadline` et
`remainingRAF > 0`, le statut devient immédiatement et définitivement
`MISSED`, que le projet soit admis ce jour ou non. Aucun test de faisabilité
postérieur à la deadline n'est effectué ; le projet continue à être planifié
selon les règles usuelles.

Sinon, lorsqu'un projet à deadline est admis et n'est pas déjà définitivement
`UNFEASIBLE`, le moteur évalue :

```text
FEASIBLE <=> remainingRAF(P, today)
            <= remainingAccessibleCapacity(P, today..deadline)
```

Si l'inégalité est fausse avant ou à la deadline, le statut devient
définitivement `UNFEASIBLE` pour cette simulation ; il ne redevient jamais
`FEASIBLE`. Si elle est vraie, le statut est `FEASIBLE`. `FEASIBLE` n'est pas
une garantie : il signifie seulement que, lors de la dernière évaluation où le
projet était admis, la deadline restait mathématiquement atteignable avec la
capacité accessible à cet instant. Une interruption ultérieure peut faire
passer `FEASIBLE` à `UNFEASIBLE` lors de la prochaine admission.

L'automate conceptuel est :

```text
PENDING -- première admission, test OK --> FEASIBLE
PENDING -- première admission, test KO --> UNFEASIBLE
PENDING -- date dépassée avec RAF restant --> MISSED
FEASIBLE -- test lors d'une admission ultérieure KO --> UNFEASIBLE
FEASIBLE / UNFEASIBLE -- date dépassée avec RAF restant --> MISSED
```

Lorsqu'un RAF atteint zéro avant ou à sa deadline, le résultat expose au moins
`complete = true` et `projectedEndDate <= mandatoryDeadline`. Aucun état
terminal supplémentaire n'est imposé à cet automate de suivi.

## Deadline allocation semantics

Le calcul suivant n'existe que pour un projet à la fois admis et `FEASIBLE`.
Pour une deadline encore faisable, recalculer quotidiennement, sans jamais
figer le ratio :

```text
requiredRatio(P, today)
  = remainingRAF(P, today)
    / remainingAccessibleCapacity(P, today..deadline)

deadlineAllocation(P, today)
  = accessibleCapacity(P, today) × requiredRatio(P, today)
```

Un projet `PENDING` n'a aucune réservation de capacité dérivée de sa deadline.
L'allocation est bornée par le RAF, le plafond quotidien et la capacité encore
disponible après les contraintes de deadline plus prioritaires. Le ratio est
recalculé à partir du RAF et des capacités accessibles restants chaque jour. La
capacité résiduelle est ensuite répartie selon la règle normale entre les autres
projets admis qui peuvent encore absorber de la capacité. Cette allocation est
une consommation nécessaire, non une
nouvelle règle d'admission.

## Deadline failure semantics

Un projet `UNFEASIBLE` ou `MISSED` n'est ni abandonné ni tronqué à sa deadline.
Il reste soumis à l'éligibilité, à la priorité pour obtenir un slot, au plafond
quotidien, aux réservations fermes et aux contraintes de deadline plus
prioritaires. Une fois admis, il consomme la capacité maximale qu'il peut
effectivement absorber afin de finir au plus tôt ; il ne revient donc pas au
simple partage équitable normal et n'utilise plus de ratio de trajectoire. Ces
statuts ne donnent toutefois aucun slot supplémentaire ni aucune priorité
d'admission. Le projet finit à la première date réaliste si l'horizon le
permet. Le résultat expose par exemple `mandatoryDeadline: 2026-06-30`,
`projectedEndDate: 2026-07-08`, `deadlineStatus: MISSED`.

## Daily caps

Un plafond quotidien limite toute allocation d'un projet : partage normal,
calcul de faisabilité, allocation nécessaire à deadline et redistribution. Un
plafond nul implique qu'un candidat est ignoré avant admission. La validation de
ce cas d'entrée doit être explicite.

## Horizon exhaustion and partial planning

À la fin de l'horizon, les allocations déjà faites sont immuables. Pour chaque
projet, le résultat fournit `plannedWorkload`, `remainingUnplannedWorkload`,
`complete` et `projectedEndDate` (absente si le RAF n'est pas épuisé dans
l'horizon). L'échec à terminer n'annule jamais les allocations partielles.

## Multi-team independence

Le moteur s'exécute indépendamment par équipe. Il n'existe ni synchronisation
inter-équipe ni date projet globale calculée implicitement. Un besoin d'activité
simultanée est modélisé par des réservations fermes dans chaque équipe concernée.

## Determinism

À entrées identiques, y compris ordre de priorité et règles d'arrondi, le
résultat est identique. Les boucles sont datées, les tris ont un départage
stable, les calculs n'utilisent ni horloge ni état UI. Les valeurs numériques
doivent être normalisées de façon explicitement définie afin d'éviter les effets
de précision flottante.

## Planner inputs

Le contrat conceptuel d'entrée contient : horizon, équipes, capacité effective
accessible par équipe/date, `maxParallelProjectsPerTeam`, réservations fermes,
ordre global stable et RAF courant par couple projet-équipe, ainsi que les dates
et plafonds ci-dessus. Il ne contient pas de DOM, consommé, snapshots, cutoff,
`seedAssignmentsByTeam`, ni `excludedDatesByTeamProject`.

## Planner outputs

Le contrat conceptuel de sortie est un `PlanningResult` composé de
`TeamProjection` :

```text
TeamProjection
  teamId
  dailyEffectiveCapacity
  capacityReservations
  reservationConflicts
  projectAllocations
  planningStatus

ProjectAllocation
  projectId
  dailyAllocations
  plannedWorkload
  remainingUnplannedWorkload
  complete
  projectedEndDate?
  objectiveEndDate?
  mandatoryDeadline?
  deadlineStatus? // PENDING | FEASIBLE | UNFEASIBLE | MISSED
```

Les allocations journalières permettent au renderer de conserver sa forme de
représentation actuelle sans connaître les choix internes du planner.

## Separation from actual consumption / history

Le moteur reçoit le RAF courant comme fait d'entrée. Une couche amont distincte
calculera ultérieurement ce RAF depuis consommé réel, consommation mensuelle,
nouvelles estimations, snapshots et corrections. C'est un invariant
d'architecture : l'historique ne doit pas contaminer le contrat du planner.

## Separation from rendering

L'architecture cible est :

```text
Planning Engine -> Planning Result -> Adapter / View Model -> FlowPlan Renderer
```

Le moteur ignore DOM, zoom, souris, formulaires et composants visuels. Le
renderer consomme une projection explicite et l'adaptateur préserve autant que
possible le rendu graphique existant.

## Canonical V1 allocation policy

Le moteur canonique V1 possède une seule politique quotidienne organisée selon
trois phases distinctes, qui constituent un invariant :

```text
CAPACITY
effectiveCapacity -> firm reservation ratios -> projectCapacity

ADMISSION
eligibility -> priority -> up to N admitted projects -> admitted set frozen

CONSUMPTION
deadline-constrained admitted projects, processed by priority
  -> remaining capacity -> normal fair sharing
  -> redistribution only within admitted set
```

Les stratégies historiques ne font pas partie de cette définition V1. Une
stratégie alternative ne pourra être réintroduite que si un besoin métier
explicite la justifie, avec ses invariants propres.

## Current implementation gaps

Les écarts suivants sont les divergences à vérifier et traiter dans le futur
refactoring, pas dans ce lot documentaire :

- `app.ts` mélange UI, orchestration et logique métier ;
- `portfolio.ts` dépend de notions liées au consommé et
  `monthly-consumption.ts` influence le RAF transmis au planner ;
- `seedAssignmentsByTeam` et `excludedDatesByTeamProject` contaminent le
  contrat de planification ;
- `latestEndDate` est employée comme borne dure à certains endroits, alors que
  la date objectif ne l'est pas dans ce modèle ;
- les allocations partielles peuvent disparaître lorsqu'un projet ne termine
  pas ;
- les stratégies legacy `MAX_PARALLEL` et `EARLIEST_FINISH` n'ont pas toutes
  les mêmes invariants que la politique quotidienne V1, et certains chemins
  graphiques appellent des calculs différents ;
- `allocationUnit` est configurable (0,25 / 0,5 / 1), contrairement à la
  granularité normale cible de 0,5 j.h.

Ces constats décrivent le repository FlowPlan indiqué dans le brief ; ils sont
à confirmer contre sa révision source avant de planifier le chantier, car la
copie de travail fournie pour ce document ne contient pas le code applicatif.

## Concepts to preserve

Préserver autant que possible `CivilDate`, `PlanningCalendar`, `Team`,
`effectiveCapacity()`, l'ordre global comme priorité, l'indépendance des
équipes, les allocations quotidiennes, le déterminisme, les tests utiles et le
rendu graphique FlowPlan.

## Target architecture

Une couche de préparation construit les entrées pures depuis le domaine. Le
planner pur produit le `PlanningResult`. Un adaptateur le convertit en modèle de
vue consommé par le renderer. Une couche de diagnostic expose surcharge de
réservations, deadlines manquées et RAF hors horizon sans les masquer.

## Canonical worked examples

Les exemples utilisent une capacité projet de 2 j.h/jour, sauf indication
contraire, et une priorité numérique croissante où 1 est la plus prioritaire.

1. **Partage normal.** Capacité 2 j.h/jour, deux slots, P1 RAF 4 et P2 RAF 4 :
   J1, J2, J3 et J4 attribuent chacun P1 = 1 et P2 = 1. Les deux projets
   terminent à la fin de J4.
2. **Fin en cours de journée.** Avec P1 RAF 0,5, P2 RAF 4, P3 RAF 4 et deux
   slots, P1 et P2 sont admis et actifs. P1 reçoit 0,5 ; P2 reçoit sa part puis
   le reliquat redistribuable, soit 1,5 au total. P3 n'est pas admis et n'entre
   pas ce jour-là.
3. **Interruption par éligibilité tardive.** Avec un slot, P1 (priorité 2) est
   éligible le 1er juin et P2 (priorité 1) le 10 juin. P1 travaille du 1er au
   9 ; P2 prend le slot le 10 ; P1 attend un jour où un slot se libère.
4. **Réservation ferme.** Capacité effective 3 et ratio RUN de 50 % donnent
   1,5 réservé et au plus 1,5 aux projets. Des ratios cumulés de 140 % donnent
   capacité projet 0 et un conflit de surcharge visible.
5. **Deadline faisable.** Lors de sa première admission, P a RAF 2 et une
   capacité accessible cumulée de 4 jusqu'à sa deadline : il devient
   `FEASIBLE`, avec ratio 0,5. Avec 2 accessibles aujourd'hui, P consomme 1 ;
   le ratio est recalculé demain sur le RAF et la capacité restants.
6. **Deadline non tenable.** Lors de son admission, P a RAF 5 et une capacité
   accessible cumulée de 3 avant ou à la deadline : son statut devient
   `UNFEASIBLE`. Il consomme alors autant que possible lorsqu'il est actif ; si
   la date passe avec RAF restant, il devient `MISSED` et continue à être
   planifié.
7. **Deadline moins prioritaire.** Capacité 2, deux slots : P1 normal
   (priorité 1) et P2 à deadline impérative (priorité 2) sont tous deux actifs.
   Si P2 doit prendre 1,5 pour rester faisable, P2 reçoit 1,5 et P1 0,5.
   La priorité a déterminé l'accès aux slots ; la deadline détermine ici la
   consommation après admission.
8. **Plafond quotidien.** Un projet avec RAF 5 et plafond 0,5 ne reçoit jamais
   plus de 0,5 dans la journée, y compris s'il a une deadline ; l'excédent est
   redistribué aux autres projets admis.
9. **Horizon insuffisant.** RAF 4, seulement 2 planifiés avant fin d'horizon :
   `plannedWorkload=2`, `remainingUnplannedWorkload=2`, `complete=false` et
   aucune date de fin projetée.
10. **Même projet, deux équipes.** X a RAF 2 en équipe A et 3 en B. Chaque
    projection est calculée avec sa capacité, slots et réservations propres ;
    aucune allocation de A ne contraint B.
11. **Pas de prédiction des slots futurs.** Capacité 1 j.h/jour, un slot : P1
    (priorité 1) a RAF 5 ; P2 (priorité 2) a RAF 2 et une deadline à J4. Tant
    que P1 occupe le slot à partir de J1, P2 est `PENDING` : le moteur ne tente
    pas de prédire quand P1 finira. Si P2 obtient son premier slot à J4 alors
    qu'il ne reste qu'1 j.h accessible avant ou à la deadline, P2 devient
    `UNFEASIBLE`, absorbe autant que possible et devient `MISSED` après la date
    si son RAF reste positif.
12. **Interruption après faisabilité.** Avec un slot, P2 à deadline est admis
    et actif à J1, et son test est `FEASIBLE`. P1, plus prioritaire, devient éligible à J2
    et prend le slot ; P2 n'a aucun slot réservé pendant son interruption.
    Lorsque P2 redevient actif, sa faisabilité est recalculée ; si le temps
    perdu suffit, son statut passe de `FEASIBLE` à `UNFEASIBLE`.
13. **Admis mais inactif.** Capacité 2, deux slots : P1 deadline
    `UNFEASIBLE` (priorité 1), P2 normal (priorité 2) et P3 normal (priorité 3).
    P1 et P2 sont admis. Si P1 peut absorber les 2 j.h, P1 est admis et actif,
    P2 est admis mais inactif (allocation 0), et P3 n'est pas admis. Le slot de
    P2 n'est pas réattribué en cours de journée.
14. **Deadlines séquentielles.** P1 à deadline (priorité 1), P2 à deadline
    (priorité 2) et P3 normal (priorité 3) sont admis si les slots le permettent.
    Le moteur traite la contrainte de P1, puis évalue P2 sur la capacité restante,
    puis partage le reliquat entre les projets admis encore capables d'en
    absorber. Il ne recherche pas une optimisation simultanée de P1 et P2.

## Acceptance criteria for a future implementation

- Toutes les allocations respectent capacité effective moins réservations,
  RAF, plafond, éligibilité et horizon.
- Aucune capacité projet n'est négative ; toute surcharge de réservation est
  diagnostiquée.
- L'admission est recalculée chaque jour, stable et limitée par les slots ;
  l'ensemble admis est figé et aucun nouveau projet n'entre après le début des
  calculs de consommation, y compris lorsqu'un admis reste inactif.
- Partage, priorité et arrondi sont reproductibles ; les fractions finales de
  RAF sont exactes.
- Deadline faisable, manquée et date objectif sont exposées conformément aux
  sémantiques ci-dessus, sans modifier l'admission.
- Les transitions `PENDING`, `FEASIBLE`, `UNFEASIBLE` et `MISSED` respectent
  l'automate quotidien ; aucune disponibilité future de slot n'est prédite.
- Une simulation incomplète conserve toutes ses allocations et son RAF restant.
- Le moteur peut être appelé sans UI, consommé ni historique, et son résultat
  suffit à un adaptateur de rendu.

## Open questions

1. Quelle représentation précise adopter dans `Project` pour deadline et date
   objectif ?
2. Quels champs exacts de `PlanningResult` sont nécessaires à l'adaptateur du
   renderer actuel ?
3. Quelle politique d'arrondi à 0,5 appliquer lorsque le calcul d'une deadline
   produit une quantité fractionnaire ?

Ces questions ne doivent pas recevoir de décision implicite lors de la première
implémentation.
