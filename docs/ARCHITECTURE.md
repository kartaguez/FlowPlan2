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
