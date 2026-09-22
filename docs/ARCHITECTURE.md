# Architecture technique

FlowPlan conserve des frontières simples et explicites. La plateforme repose
uniquement sur TypeScript, Node.js 24, npm et les standards natifs du navigateur.

```text
main -> ui
main -> future application / infrastructure
ui -> future application / presentation adapters
application -> domain
infrastructure -> application ports
```

- `domain/` contient le modèle métier pur. Il ne dépend ni du navigateur, ni du
  stockage, ni de l'interface utilisateur.
- `application/` accueillera les futurs cas d'usage et ports.
- `adapters/` accueillera les futurs view models et adaptations de présentation.
- `infrastructure/` implémentera les futurs adapters techniques.
- `ui/` utilise uniquement le DOM et SVG natifs. Elle ne dépend jamais de
  `main/`.
- `main/` est le composition root et le point d'entrée navigateur. Aucun autre
  dossier ne doit importer depuis `main/`.

Une UI vanilla ne signifie pas une UI monolithique. Le découpage par
responsabilité reste obligatoire même sans framework : `main` assemble, `ui`
rend le DOM/SVG, et le domaine reste indépendant.

## Chaîne d'outillage

- TypeScript strict est compilé par `tsc` en modules ES natifs.
- Les imports relatifs TypeScript utilisent des suffixes `.js` afin que les
  fichiers émis soient directement résolus par le navigateur et Node.
- `node:test` et `node:assert/strict` exécutent les tests compilés séparément
  dans `.test-dist/`.
- `scripts/build.mjs` nettoie `dist/`, compile `src/` vers `dist/js/`, puis
  copie les sources statiques de `public/`.
- `scripts/dev.mjs` effectue un build initial, démarre `tsc --watch` et sert
  `dist/` avec `node:http` sur `http://127.0.0.1:4173`.

Les seules dépendances de développement sont `typescript` et `@types/node`.
Aucun bundler, framework UI, runner de tests, linter ou formatter tiers n'est
utilisé.

## Artefact statique

```text
public/                  sources statiques maintenues à la main
  index.html
  styles.css

dist/                    artefact généré, complet et jetable
  index.html
  styles.css
  js/
    domain/
    application/
    adapters/
    infrastructure/
    ui/
    main/
```

Le navigateur charge `dist/js/main/main.js` avec un script `type="module"`.
Le CSS est chargé directement par `index.html`; aucun import CSS n'est effectué
depuis TypeScript.

## Commandes de référence

```text
npm install
npm run typecheck
npm test
npm run build
npm run dev
```

La vérification navigateur minimale consiste à lancer `npm run dev`, ouvrir
`http://127.0.0.1:4173`, puis vérifier la présence de `FlowPlan` et de
`Planning workspace`.

## Planning Engine V1 — Final semantics

Pour chaque équipe,
l'admission est entièrement recalculée chaque jour dans l'ordre global de
priorité, sans droit à la continuité, jusqu'à `maxParallelProjects`. L'ensemble
admis est ensuite figé pour la journée : terminer un RAF ou ne recevoir aucune
allocation ne libère pas de place et aucun autre projet ne peut entrer en
remplacement.

Le partage normal concerne uniquement les projets admis. Un quantum normal vaut
exactement `0.5` j.h. (`1/2` rationnel) et la distribution s'effectue par tours
dans l'ordre de priorité. La priorité tranche ainsi les quanta indivisibles.

Lorsqu'un projet atteint son RAF ou son plafond quotidien cumulé, les tours
suivants redistribuent la capacité uniquement au sein de l'ensemble admis. Un
reliquat final de RAF inférieur à `0.5` peut être alloué exactement pour achever
le projet. Une fraction de capacité inférieure à `0.5` reste inutilisée si elle
ne permet pas de terminer exactement un RAF.

Les deadlines impératives sont traitées avant ce partage normal, sans modifier
l'admission : une deadline ne change ni la priorité, ni le nombre de
slots, ni l'ensemble admis figé. Un projet non admis reste `PENDING`, puis peut
devenir `MISSED` après sa deadline sans avoir jamais été admis.

À la première admission puis à chaque admission d'un projet `FEASIBLE`, le
moteur compare exactement son RAF à la capacité accessible restante jusqu'à la
deadline. `FEASIBLE` peut devenir `UNFEASIBLE`, mais cette transition est
irréversible. Une date dépassée avec un RAF positif produit `MISSED`.

Une deadline `FEASIBLE` consomme une allocation rationnelle exacte fondée sur
le ratio `RAF / capacité accessible restante`. Une deadline `UNFEASIBLE` ou
`MISSED` consomme le maximum possible. Les deadlines admises sont traitées
séquentiellement dans l'ordre de priorité ; leurs allocations exactes ne sont
jamais quantifiées à `0.5`. Le reliquat revient ensuite au partage normal, où
les projets deadline `FEASIBLE` peuvent aussi avancer, sous leur RAF et leur
plafond quotidien global.

Le calcul futur reste local et non prédictif : il additionne la capacité projet
connue du calendrier jusqu'à la deadline et les contraintes de trajectoire déjà
imposées par les deadlines admises plus prioritaires. Il ne prédit pas les
futurs slots, ne simule pas d'admissions alternatives et ne soustrait jamais à
l'avance les allocations normales. La date objectif reste descriptive.

`FEASIBLE` exprime une faisabilité structurelle conditionnelle, et non une
garantie d'admission future : la deadline reste tenable si le projet obtient les
accès nécessaires. Seules les trajectoires rationnelles des deadlines
`FEASIBLE` plus prioritaires contraignent l'enveloppe accessible future des
deadlines suivantes.

Un projet `UNFEASIBLE` ou `MISSED` ne possède aucune trajectoire future. Il
consomme le maximum possible uniquement les jours où il est effectivement
admis et ne réserve jamais de capacité sur les dates suivantes. L'admission
reste recalculée indépendamment chaque jour.

Les équipes sont simulées indépendamment, jour par jour, dans les bornes
inclusives du `PlanningHorizon`. Les réservations fermes sont retranchées avant
toute admission projet. L'horizon n'est jamais prolongé : RAF planifié et RAF
restant sont tous deux conservés dans le résultat. La date objectif reste une
donnée descriptive sans effet sur le moteur.

Les diagnostics V1 sont des codes métier sans message ni sévérité :
`TEAM_OVER_RESERVED`, `PROJECT_REMAINS_UNPLANNED_AT_HORIZON`,
`DEADLINE_UNFEASIBLE` et `DEADLINE_MISSED`. Leur ordre est déterministe : ordre
des équipes, dates croissantes, ordre d'émission du pipeline et priorité des
projets ; les diagnostics de fin d'horizon viennent ensuite par priorité.

## Frontière finale de la Phase 2

Planning Engine V1 ends at `PlanningResult`.

La Phase 2 ne contient ni cas d'usage applicatif, ni persistence, ni UI, ni
`TimelineViewModel`, ni `TimelineGeometry`, ni actuals/history. La chaîne future
est :

```text
Planning Engine
  -> PlanningResult
  -> Application / PlanningViewModelAdapter
  -> TimelineViewModel
  -> TimelineGeometry
  -> Vanilla SVG Renderer
```

Les actuals et l'historique resteront en amont selon la frontière suivante,
hors Phase 2 :

```text
Actuals / History -> Current RAF -> Planning Engine
```

## Application Layer — Phase 3A

`RecomputePlanning` constitue l'unique cas d'usage applicatif de cette phase.
Il reçoit un `Portfolio` et un `PlanningHorizon`, délègue intégralement le
calcul à Planning Engine V1, puis retourne le `PlanningResult` sans transformer
allocations, statuts ou diagnostics.

```text
UI / Adapters
    -> Application
    -> Domain
```

Cette couche est pure, déterministe et sans état. Elle ne contient aucune
persistence, aucun store, aucun port technique, aucune logique UI et aucun
`TimelineViewModel`. Aucun autre cas d'usage n'est introduit en Phase 3A.

## TimelineViewModel — Phase 3B

`TimelineViewModel` est le contrat de présentation sémantique et temporel de la
future timeline. Il décrit les projets, les équipes, leurs capacités exactes,
les allocations journalières, les états projet-équipe et les diagnostics. Les
métadonnées globales d'un projet restent séparées de son état de planning pour
chaque équipe. `priorityIndex` est un index de présentation dérivé de
`Portfolio.priorityOrder` : `0` désigne la priorité la plus élevée et ne crée
aucune nouvelle source de priorité métier.

Les allocations conservent la granularité journalière du moteur. Le ViewModel
ne les compresse pas en segments continus ; la future `TimelineGeometry`
décidera si et comment des jours adjacents sont regroupés pour le rendu.

```text
TimelineViewModel                    TimelineGeometry (future)
  domain identifiers                  geometric projection
  CivilDate                           pixels and coordinates
  exact capacities/workloads          paths and hitboxes
  project/team planning state          viewport and clipping
  semantic diagnostics                renderer-ready layout
```

Le contrat ne contient donc ni pixels, ni coordonnées, ni chemins SVG, ni
hitboxes, ni viewport, ni référence DOM. Phase 3B ne fournit aucun adapter
`PlanningResult -> TimelineViewModel` et n'appelle ni l'application ni le
moteur. Cette transformation appartient à la Phase 3C.

## PlanningViewModelAdapter — Phase 3C

L'adapter pur `buildTimelineViewModel` joint les données déjà calculées avec
les identités et libellés du portfolio :

```text
Portfolio + PlanningHorizon + PlanningResult
                    -> buildTimelineViewModel
                    -> TimelineViewModel
```

Le Portfolio fournit l'ordre de présentation des équipes et son
`priorityOrder` fournit l'ordre des projets et des états projet-équipe. Les
capacités et workloads rationnels restent exacts, les allocations restent
journalières et l'ordre déterministe des diagnostics est préservé. L'adapter
n'effectue aucun calcul de planning : il ne décide ni capacité, ni allocation,
ni admission, ni statut deadline. Il enrichit uniquement les identifiants des
diagnostics avec leurs libellés lorsqu'ils sont présents.

La séparation canonique est désormais :

```text
Planning Engine   decides allocations
Application       triggers planning
Adapter           reshapes and joins
Geometry          positions
UI                renders
```

Phase 3C ne contient toujours aucune géométrie, coordonnée, couleur ou logique
DOM/SVG. `TimelineGeometry` reste une étape ultérieure.

## TimelineGeometry — Phase 4A

`TimelineGeometry` est une projection géométrique pure du contrat sémantique :

```text
TimelineViewModel
      -> pure geometric projection
      -> TimelineGeometry
      -> DOM/SVG renderer (future)
```

Le `TimelineViewModel` porte les dates et données métier ; la géométrie porte
uniquement les coordonnées et dimensions ; le futur renderer créera les
éléments DOM/SVG. La convention V1 place l'origine dans le coin supérieur
gauche : `x` augmente vers la droite, `y` vers le bas, le temps est horizontal
et les équipes sont empilées verticalement dans l'ordre du ViewModel.

L'horizon reste inclusif. Chaque jour forme une colonne de largeur
`viewport.width / dayCount`, avec `horizon.start` à `x = 0`. Chaque équipe
occupe une lane complète de hauteur `teamLaneHeight`. Ses capacités doivent
couvrir exactement chaque date de l'horizon, dans l'ordre, et sont projetées
sans être recalculées.

La frontière numérique est explicite :

```text
Capacity / workload       exact domain quantity
x / y / width / height    presentation number
```

Phase 4A ne convertit pas la capacité en hauteur visuelle et n'introduit ni
stacking, ni surface projet, ni path/polygon, ni labels, ni couleurs, ni
hit-testing. Elle ne dépend ni du DOM ni de SVG et n'utilise que `CivilDate`
pour l'axe temporel.

## TimelineGeometry — Phase 4B capacity tube

La géométrie utilise une échelle verticale unique pour toute la timeline. La
capacité effective maximale, recherchée exactement parmi toutes les équipes et
tous les jours, définit `pixelsPerCapacityUnit` :

```text
pixelsPerCapacityUnit = teamLaneHeight / maxEffectiveCapacity
```

Ainsi, une même capacité produit la même hauteur en pixels quelle que soit
l'équipe. Si toutes les capacités sont nulles, l'échelle vaut `0` et les tubes
restent présents avec une hauteur nulle.

Chaque tube quotidien est ancré sur le bas de sa lane. `effectiveCapacity`
définit sa hauteur totale. `projectCapacity` définit la région basse utilisable
par les futurs projets. `reservedCapacity` définit la région haute visible de
réservation. En cas de sur-réservation, cette région est écrêtée à la capacité
effective du tube, tandis que la quantité métier exacte et `overReserved`
restent inchangés dans la géométrie.

La conversion rationnelle vers `number` est strictement une conversion de
présentation ; les objets `Capacity` ne sont ni remplacés ni modifiés. Toute
valeur qui ne peut pas produire une dimension finie provoque un `TypeError`.

La frontière des lots est :

```text
Phase 4B   Capacity -> geometric available space
Phase 4C   Project allocations -> stacked project surfaces in projectRegion
```

Aucun projet, stacking ou surface d'allocation n'est positionné en Phase 4B.
Les couleurs et le rendu DOM/SVG restent également hors de cette couche.

## TimelineGeometry — Phase 4C project allocation stacking

Les allocations du `TimelineViewModel` restent journalières : une allocation
positive produit exactement un rectangle dans le `projectRegion` de son équipe
et de sa date. La géométrie réutilise l'échelle globale de capacité définie en
4B :

```text
allocationHeight = allocation.workload * pixelsPerCapacityUnit
```

Les rectangles sont triés par `priorityIndex` croissant puis empilés de bas en
haut. Le projet de priorité la plus élevée occupe donc le bas du tube. Si les
allocations n'utilisent pas toute la capacité projet, l'espace restant demeure
vide au-dessus de la pile. La somme exacte des workloads est vérifiée contre
`projectCapacity` avant la projection ; une tolérance n'intervient que pour un
éventuel résidu de calcul en pixels.

À largeur de jour fixe, la hauteur est proportionnelle au workload. L'aire du
rectangle est donc proportionnelle au workload quotidien, tout en conservant
la quantité rationnelle exacte dans `TimelineAllocationGeometry.workload`.

Phase 4C s'arrête à ces rectangles quotidiens indépendants. Elle ne fusionne
pas les jours et ne crée ni surface continue, ni path/polygon, ni couleur, ni
label, ni marker, ni curseur, ni zoom, ni hit-testing, ni rendu DOM/SVG.

## Static SVG Renderer — Phase 5A

Le renderer statique constitue une projection DOM mécanique :

```text
TimelineGeometry
      -> renderTimelineSvg
      -> SVG DOM
```

`TimelineGeometry` possède le layout et fournit toutes les coordonnées. Le
renderer possède uniquement la création des groupes et rectangles SVG. Le CSS
possède l'apparence neutre de ces primitives. Le renderer ne calcule donc ni
position, ni dimension, ni priorité, ni échelle de capacité.

À chaque appel, `renderTimelineSvg` vide intégralement l'élément `<svg>` fourni
et reconstruit son arbre. Phase 5A n'utilise aucun cache, diffing, virtual DOM
ou mécanisme de réconciliation. Le `viewBox` provient directement des
dimensions de la géométrie.

La structure rend les lanes d'équipe, cellules journalières, tubes de capacité,
régions réservées, régions projet et rectangles d'allocation. Des classes et
attributs `data-*` sémantiques rendent l'arbre inspectable sans introduire de
comportement métier ou interactif.

Phase 5A ne fournit ni couleurs stables par projet, ni labels, ni axe temporel,
ni markers, ni surfaces continues, ni tooltips, ni curseur, ni zoom, ni
sélection, ni gestionnaires d'événements.

## Visual Semantics — Phase 5B

La répartition des responsabilités visuelles reste stricte : la géométrie
possède le layout, le renderer possède la structure SVG, et CSS/UI possède
l'identité visuelle. Une couleur projet est une projection UI déterministe de
`ProjectId` vers une palette fixe. Elle n'est ni un état métier, ni une donnée
persistée dans `PlanningResult`, `TimelineViewModel` ou `TimelineGeometry`.
Le même projet conserve donc sa couleur entre les jours, les équipes et les
reconstructions, indépendamment de l'ordre de rendu.

`overReserved` est fourni par la sémantique de la géométrie. Le renderer ne le
recalcule pas : il le traduit seulement en classe CSS, qui distingue
visuellement la réservation excédentaire. Les styles différencient également
le tube de capacité, la région réservée, la région projet et les allocations,
sans modifier leurs coordonnées.

Phase 5B s'arrête à cette sémantique visuelle statique. Phase 5C introduira
l'axe temporel et les en-têtes mois/année. Aucun label, marker, tooltip,
curseur, zoom, sélection ou gestionnaire d'événement n'est ajouté ici.

## Time Axis — Phase 5C

La géométrie possède également le layout de l'axe temporel. Elle découpe
l'horizon inclusif en portions visibles de mois et d'années sur la même échelle
que les colonnes journalières. Chaque segment fournit son rectangle et la
position de son libellé ; le renderer ne calcule aucune limite calendaire.

Le viewport réserve `timeAxisHeight` au-dessus des lanes. La première équipe
commence donc à cette ordonnée, puis les équipes restent espacées de
`teamLaneHeight`. Le header est partagé en une rangée année et une rangée mois.
Les labels mensuels sont une table statique (`Jan` à `Dec`) et ne dépendent ni
de la locale ni du fuseau système. Toute l'arithmétique calendaire repose sur
`CivilDate`, sans `Date` JavaScript.

## Demo bootstrap — Phase 5C

Le démarrage navigateur compose pour la première fois la chaîne complète :

```text
createDemoPlanningScenario
        ↓
recomputePlanning
        ↓
buildTimelineViewModel
        ↓
buildTimelineGeometry
        ↓
renderTimelineSvg
```

Le portefeuille de démonstration est une donnée de bootstrap remplaçable. Il
entre par les fabriques métier normales, n'est ni un défaut du domaine, ni un
état du renderer, ni une persistence. Il sera remplacé à terme par la future
source applicative. Aucun `localStorage`, IndexedDB ou mécanisme d'édition
n'est introduit par cette intégration en lecture seule.

## Project markers and diagnostics — Phase 5D

Les dates projet positionnables (`earliestStartDate`, `objectiveEndDate` et
`mandatoryDeadline`) deviennent des marqueurs géométriques uniquement sur les
lanes où un `TimelineProjectTeamState` existe. La géométrie place chaque ligne
au centre de sa colonne journalière et la borne verticalement à sa lane. Une
date hors de l'horizon est omise, sans clamp. Les marqueurs sont ordonnés par
`priorityIndex`, puis par type (`earliest-start`, `objective-end`,
`mandatory-deadline`), puis par date. Le statut deadline est copié uniquement
sur le marqueur de deadline ; il n'est jamais recalculé par la géométrie ou le
renderer.

Les diagnostics de planning suivent une autre projection : ils restent dans le
`TimelineViewModel` et alimentent un panneau HTML en lecture seule, dans leur
ordre source. Cette séparation évite d'inventer une coordonnée temporelle pour
les diagnostics sans date, notamment le RAF restant à la fin de l'horizon. La
UI joint les labels déjà fournis et associe seulement chaque code stable à un
message humain ; elle n'introduit aucune severity métier.

```text
project dates + project/team states -> marker geometry -> SVG lines
planning diagnostics                -> read-only HTML diagnostics panel
```

Phase 5D fournit uniquement des annotations visuelles en lecture seule. Phase
6A introduira le curseur temporel interactif. Aucun tooltip, sélection,
gestionnaire d'événement, drag/drop ou handle d'édition n'appartient à 5D.

## Interactive Time Cursor — Phase 6A

`selectedDate` est un état UI éphémère de type `CivilDate`. Il est initialisé
avec le début de l'horizon et reste encapsulé dans le contrôleur du curseur :
il n'appartient ni au domaine, ni à `PlanningResult`, et son déplacement ne
déclenche aucun nouveau calcul de planning.

```text
selected CivilDate -> cursor geometry -> SVG cursor overlay
selected CivilDate + TimelineViewModel -> read-only date summary
```

La géométrie expose une échelle journalière commune, indépendante des équipes.
La projection pure du curseur retrouve la colonne existante et place la ligne
au centre du jour, depuis le bas du header temporel jusqu'au bas de la
timeline. Une date absente de l'horizon est refusée. Le mapping pointer utilise
`clientX` et le `getBoundingClientRect()` courant du SVG ; il reste donc aligné
après un scroll horizontal sans recourir à une arithmétique `Date` JavaScript.

Le contrôleur écoute `pointerdown`, le déplacement actif, `pointerup` et
`pointercancel` sur le SVG, qui reste une surface visuelle et pointer. Une
capture du pointer démarre avec le drag et est libérée à sa fin : le cycle
reste ainsi cohérent lorsque le pointer sort des limites du SVG.

Le focus clavier et la sémantique accessible de la date sélectionnée vivent
sur un bouton HTML natif adjacent à la timeline, jamais sur le SVG principal.
Ce contrôle propose `ArrowLeft`, `ArrowRight`, `Home` et `End`, sans bouclage
aux bornes, et son texte accessible suit la date sélectionnée. Une mise à jour
remplace uniquement la ligne du calque `timeline-cursor-layer` et reconstruit
le résumé de la date ; la timeline statique n'est pas rerendue.

Le résumé HTML lit exclusivement le `TimelineViewModel`. Dans l'ordre des
équipes, il présente les capacités effective, réservée et projet, puis les
allocations journalières avec leur libellé projet. Capacités et workloads sont
sérialisés sous leur forme rationnelle exacte.

Phase 6A ne modifie pas le viewport. Phase 6B portera le zoom et le pan.
Phase 6C portera la sélection projet/équipe/allocation et le hit-testing. Le
curseur 6A n'introduit ni tooltip, ni sélection projet, ni persistence.

## Timeline Viewport — Phase 6B

La géométrie de planning reste une projection immuable de l'horizon complet.
Le viewport est un état UI distinct, exprimé dans le même repère horizontal :

```text
full TimelineGeometry { width, height, days, allocations, markers }
        ↓
TimelineViewportState { x, width }
        ↓
SVG viewBox = "x 0 width geometry.height"
```

Zoom et pan ne reconstruisent jamais `TimelineGeometry` et ne modifient aucune
capacité, allocation, date ou coordonnée source. Le viewport initial couvre la
largeur complète. Sa largeur maximale vaut `geometry.width`; sa largeur
minimale vaut sept jours (`7 * dayWidth`), ou toute la géométrie lorsque
l'horizon est plus court. Le facteur de zoom est `1.25` : zoom avant par
division, zoom arrière par multiplication. Le point d'ancrage conserve sa
position relative selon :

```text
anchorRatio = (anchorX - viewport.x) / viewport.width
newX = anchorX - anchorRatio * newWidth
```

Les boutons utilisent le centre du viewport comme ancrage. Le pan reçoit un
delta dans le repère timeline et borne `x` entre zéro et
`geometry.width - viewport.width`.

Le SVG occupe désormais la largeur disponible et utilise
`preserveAspectRatio="none"` : la hauteur affichée reste la hauteur logique
complète, tandis que le `viewBox` contrôle exclusivement la projection
horizontale. Ce modèle unique remplace le scroll horizontal natif introduit en
5C. Il évite de cumuler scroll navigateur et viewport SVG.

Les interactions restent séparées par leur geste initial :

```text
normal pointer drag  -> time cursor
Shift + pointer drag -> timeline pan
```

Les deux contrôleurs écoutent le même SVG mais filtrent ces gestes. Le
contrôleur viewport possède seul l'état visible et expose `getState()` au
contrôleur curseur afin que `clientX` soit projeté par
`viewport.x + relativeX * viewport.width`. Chaque drag utilise pointer capture
jusqu'à `pointerup` ou `pointercancel`. Les boutons HTML natifs fournissent
Zoom in, Zoom out et Reset view; aucune molette, pinch ou persistence n'est
introduite.

Phase 6B concerne uniquement la navigation du viewport. Phase 6C introduira le
hit-testing et la sélection projet/équipe/allocation. Aucun tooltip ou état de
sélection métier n'appartient à 6B.

## Geometry numerical policy

Toutes les coordonnées de présentation restent des nombres IEEE 754 avec leur
précision complète. Aucun `Math.round`, `toFixed`, BigInt ou rationnel métier
n'est utilisé pour stabiliser les pixels. La constante partagée
`GEOMETRY_EPSILON = 1e-9` absorbe uniquement les résidus de calcul lors des
comparaisons géométriques et des bornes de viewport. Elle ne modifie jamais
une date, une capacité, un workload ou une règle de planning.

Les rectangles conservent des intervalles half-open : `[x, x + width)` et
`[y, y + height)`. Une coordonnée située à moins de `GEOMETRY_EPSILON` d'une
frontière connue est traitée comme cette frontière pour la comparaison
uniquement. Ainsi, une frontière commune appartient toujours au rectangle de
droite ou du dessous, sans créer de chevauchement. Un écart réel supérieur à
l'epsilon reste distinct.

`GEOMETRY_EPSILON` n'est pas une taille de cible utilisateur. La tolérance de
hit d'un marqueur vaut quatre pixels CSS, convertis dans le repère timeline à
partir du viewport courant. Le seuil séparant click et drag vaut également
quatre pixels CSS. Ces deux tolérances UX sont indépendantes de la politique
de précision numérique.

## Timeline Hit Testing and Selection — Phase 6C

Le hit-testing suit une chaîne unidirectionnelle et ne lit jamais le DOM SVG :

```text
client pointer
    -> viewport-aware timeline x/y
    -> pure hit test against full TimelineGeometry
    -> hovered / selected UI state
    -> selection overlay + tooltip / selection summary
```

Avec `preserveAspectRatio="none"`, X et Y sont projetés indépendamment depuis
le rectangle affiché du SVG : X utilise `{ viewport.x, viewport.width }` et Y
utilise la hauteur complète de la géométrie. Une position hors géométrie ne se
fait pas clamper pour le hit-testing et produit `undefined`.

La priorité de hit reproduit l'ordre visuel : marqueur, puis allocation, puis
lane d'équipe. Les tableaux de marqueurs et d'allocations sont parcourus en
ordre inverse afin que le dernier élément rendu gagne en cas de recouvrement.
Le time axis ne produit aucun hit métier.

Le contrôleur d'interaction possède deux états UI indépendants, `hovered` et
`selected`. Un mouvement sans drag alimente un tooltip HTML depuis le
`TimelineViewModel`; aucun attribut `data-*` SVG n'est relu. Un click sous le
seuil sélectionne le hit, tandis qu'un cursor drag plus long ne change pas la
sélection. `Shift + drag` reste réservé au pan et est entièrement ignoré par
la sélection. Un click sur une zone sans hit ou `Escape` efface la sélection.

La sélection est projetée dans un calque SVG dédié situé au-dessus des équipes
et sous le curseur : rectangle pour une allocation ou une équipe, ligne pour
un marqueur. Un panneau HTML `aria-live="polite"` expose la sélection active;
le tooltip de hover n'est pas annoncé en live.

Phase 6C inspecte et sélectionne exclusivement un planning existant. Phase 7
portera les changements d'état applicatif et l'édition des projets, équipes ou
réservations. Aucun recompute, persistence, undo/redo ou comportement
d'édition n'est introduit ici.
