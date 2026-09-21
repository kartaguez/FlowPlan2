# FlowPlan — audit historique et reconstruction clean-room

## 1. Executive summary

**OBSERVED.** Le dépôt historique de référence est `kartaguez/FlowPlan`, étudié
à la révision `621bb6e`. C'est une application web locale TypeScript native,
sans framework ni bundler : Node 24 sert les modules ES et retire les types à
l'exécution. Son expérience centrale est une timeline SVG où le temps avance de
gauche à droite et où l'aire colorée d'un projet est proportionnelle à sa charge
([`README.md`], [`app/index.html`], [`src/visualization/gantt-svg.ts`]).

**OBSERVED.** La géométrie SVG est raisonnablement isolée et testée, mais le
reste de l'orchestration est concentré dans [`app/app.ts`]. Ce fichier détient
l'état UI, le draft, les affectations, les contraintes manuelles, le consommé,
la persistence, le calcul du planning, le HTML et les événements. Le moteur
historique n'est pas conforme au canon métier : il garde deux stratégies,
utilise `latestEndDate` comme borne dure, mélange consommé et RAF, et élimine
des affectations partielles en cas d'échec ([`src/domain/portfolio.ts`],
[`src/domain/monthly-consumption.ts`]).

**TARGET.** La reconstruction ne refactore ni ne copie cette application. Elle
utilise deux canons indépendants :

```text
PLANNING_ENGINE_CANONICAL.md             Historical UX invariants (ce document)
              |                                      |
              v                                      v
PlanningInput -> PlanningEngine -> PlanningResult -> TimelineViewModel
                                                    -> TimelineGeometry
                                                    -> React / SVG
```

Le canon métier est prioritaire sur le comportement legacy. Le catalogue UX ne
préserve que les propriétés explicitement retenues ci-dessous.

## 2. Architecture historique

| Élément | Constat | Sources | Décision cible |
|---|---|---|---|
| Stack | TypeScript ESM, Node >=24, serveur local maison, aucun package externe | `package.json`, `scripts/dev-server.mjs` | REIMPLEMENT avec TypeScript strict, React, Vite, pnpm |
| Entrée | `app/index.html` charge `app/app.ts`; ce dernier appelle `render()` | `app/index.html`, `app/app.ts` | REIMPLEMENT avec bootstrap React |
| Domaine | Fonctions et objets immuables légers dans `src/domain` | `src/domain/*.ts` | KEEP AS CONCEPT, nouveau modèle |
| Draft | Texte éditable converti atomiquement par `buildPlanningModel()` | `src/application/planning-draft.ts` | REIMPLEMENT comme frontière de formulaire/application |
| Planning | `planPortfolio()` équipe par équipe, stratégies legacy | `src/domain/portfolio.ts` | DISCARD algorithme, reconstruire depuis le canon |
| Rendu | Géométrie pure partielle puis chaîne SVG | `src/visualization/gantt-svg.ts` | ADAPTABLE, scinder view model/géométrie/renderer |
| Persistence | JSON versionné, validation et migrations; `localStorage` | `src/application/planning-persistence.ts`, `app/app.ts` | REIMPLEMENT plus tard derrière port |
| Tests | `node:test`, tests domaine/SVG et smoke test fake DOM | `test/*.test.ts`, `scripts/ui-runtime-smoke.mjs` | KEEP AS CONCEPT, remplacer outillage |

### Flux réellement observés

```text
interaction DOM
  -> mutation d'état global dans app.ts
  -> buildPlanningModel(draft)
  -> planPortfolio(..., contraintes, seed/exclusions consommé)
  -> buildGanttGeometry / renderGanttSvg
  -> innerHTML + overlays + délégation d'événements
```

Le chargement suit le chemin inverse : `localStorage` ou import JSON →
`decodePlanning()` / migration → `PlanningDraft` + état runtime → `render()`.
Cette persistance contient à la fois données configurables et états de calcul/
interaction (`assignedProjectIdsByTeam`, limites, dates cibles, exceptions
mensuelles, curseur), ce qui est un couplage à ne pas reprendre.

## 3. Domaine et moteur historiques vs canon métier

| Concept canonique | Comportement historique observé | Statut | Conséquence clean-room |
|---|---|---|---|
| `effectiveCapacity` | Calendrier, périodes, FTE, ratio d'indisponibilité et overrides sont centralisés dans `effectiveCapacity()` | PARTIAL | Conserver l'abstraction, remplacer indisponibilité legacy par réservations au ratio |
| Réservation ferme au ratio | `unavailableCapacityRatio` est incorporé à la capacité; pas d'entité/période de réservation explicite | PARTIAL | Introduire `FirmCapacityReservation` et ratios cumulés |
| Éligibilité / début au plus tôt | `earliestStartDate` borne les allocations | MATCH | Conserver comme règle dure |
| Priorité stable | Ordre du tableau `projects` | MATCH | Conserver, avec départage déterministe |
| Slots | `MAX_PARALLEL` limite les projets alloués positivement à la journée | PARTIAL | Passer à l'ensemble **admis** figé, qui peut contenir un inactif |
| Admission | Deux algorithmes, candidats conditionnés par allocations et contraintes legacy | CONFLICT | Implémenter admission quotidienne canonique unique |
| Partage normal | Partage/redistribution dans `planTeamInParallel()` avec unités configurables | PARTIAL | Conserver le concept, normaliser à 0,5 et appliquer la sémantique admis/actif |
| Réallocation intra-journée | Algorithme legacy redistribue aux projets éligibles | PARTIAL | Limiter strictement à l'ensemble admis |
| Date objectif | `latestEndDate` borne l'allocation et les erreurs | CONFLICT | Objectif descriptif, horizon seule borne supérieure |
| Deadline impérative | Dates cibles UI et `manualTargetEndDates`, sans statuts canoniques | CONFLICT | Deadline canonique PENDING/FEASIBLE/UNFEASIBLE/MISSED |
| Deadlines séquentielles | Cibles traitées dans la stratégie parallèle mais avec modèle différent | PARTIAL | Refaire selon l'ordre des deadlines admises |
| Caps quotidiens | `manualDailyLimits`, surtout issus du resize vertical | PARTIAL | `DailyCap` métier explicite |
| Planning partiel | Échec `INSUFFICIENT_CAPACITY` exclut l'affectation réussie du `TeamPlan` | CONFLICT | Conserver allocations et RAF non planifié |
| Indépendance équipes | `planPortfolio()` planifie chaque équipe séparément | MATCH | Conserver |
| Déterminisme | Itérations et ordre de tableau déterministes; arrondis ad hoc | PARTIAL | Règles d'arrondi canoniques explicites |
| Consommé / RAF | Le consommé mensuel réduit le workload et injecte seeds, exclusions, exceptions de capacité | CONFLICT | Hors `PlanningInput`; future couche Actuals → RAF |

**UNKNOWN.** Aucune entité historique ne représente une réservation ferme
métier distincte; la proximité fonctionnelle entre indisponibilité de période et
réservation explicite n'autorise pas à assimiler les deux concepts dans V1.

## 4. Cartographie UX et signature

### Historical UX invariants

| ID | Nom / statut | Description | Sources historiques | Cible / testabilité |
|---|---|---|---|---|
| UX-001 | Direction temporelle — OBSERVED | Jours en colonnes, gauche→droite; axes mois/années | `gantt-svg.ts`, `app/index.html` | KEEP; geometry + renderer |
| UX-002 | Lane d'équipe — OBSERVED | Chaque équipe est une ligne/tube de capacité avec libellé et timeline | `app/app.ts`, `gantt-svg.ts` | KEEP; VM + screenshot/E2E |
| UX-003 | Aire = charge — OBSERVED | Largeur de jour × hauteur j.h; `pixelArea` est proportionnel au workload | `gantt-svg.ts`, `gantt-svg.test.ts` | KEEP; geometry |
| UX-004 | Empilement — OBSERVED | Les allocations sont cumulées verticalement et la capacité est validée | `gantt-svg.ts`, `gantt-svg.test.ts` | KEEP; geometry |
| UX-005 | Capacité visible — OBSERVED | Tube gris et courbe en escalier suivent la capacité journalière | `gantt-svg.ts`, `styles.css` | KEEP; geometry/render |
| UX-006 | Jours non travaillés — OBSERVED | Bandes dédiées; weekends étroits, congés de largeur normale | `gantt-svg.ts`, `gantt-svg.test.ts` | KEEP; geometry |
| UX-007 | Indisponibilité équipe — OBSERVED | Périodes absentes affichées avec bande dédiée | `gantt-svg.ts`, `team.ts` | KEEP; renderer |
| UX-008 | Identité projet — OBSERVED | Couleurs, formes colorées, palette et tooltip de synthèse | `app/app.ts`, `gantt-svg.ts` | KEEP; adapter + renderer |
| UX-009 | Curseur temporel — OBSERVED | Curseur bleu partagé, drag et clavier ←/→; synthèses recalculées | `app/app.ts`, `gantt-svg.ts` | KEEP; interaction/E2E |
| UX-010 | Axe global — OBSERVED | Axe compact mois/années reste sur l'horizon complet | `gantt-svg.ts`, `app/index.html` | KEEP; geometry/render |
| UX-011 | Zoom neutre — OBSERVED | Maj+drag sélectionne une période visible sans modifier allocations | `app/app.ts`, `gantt-svg.ts` | KEEP; VM/geometry/E2E |
| UX-012 | Affectation équipe — OBSERVED | Drag/drop et boutons `+`; croix au centre d'une aire | `app/app.ts`, `gantt-svg.ts` | MODIFY; use case/E2E |
| UX-013 | Réordonnancement — OBSERVED | Drag/drop et flèches modifient ordre de priorité | `app/app.ts`, `styles.css` | KEEP; inbound adapter/E2E |
| UX-014 | Édition contraintes — OBSERVED | Handle horizontal=fin cible, vertical=cap quotidien; frontières rouges | `app/app.ts`, `gantt-svg.ts` | MODIFY; décision UI préalable |
| UX-015 | Feedback — OBSERVED | Feedback, badges, erreurs, annuler/rétablir et apply/cancel | `app/app.ts`, `index.html` | KEEP AS CONCEPT; UI tests |
| UX-016 | Hover/tooltip — OBSERVED | Tooltip projet placé près du pointeur | `app/app.ts`, `styles.css` | KEEP; interaction |
| UX-017 | Accessibilité SVG — OBSERVED | `role=slider`, tabIndex, aria labels et contrôles clavier | `gantt-svg.ts`, `app/app.ts` | KEEP; DOM/a11y |
| UX-018 | Responsive — OBSERVED | CSS grid devient colonne et sidebar s'adapte | `styles.css` | KEEP; viewport |
| UX-019 | Consommé/cutoff — OBSERVED | Overlay orange et ligne cutoff violette | `app/app.ts`, `gantt-svg.ts` | DISCARD V1; futur Actuals |

### Signature UX

**CORE UX.** L'utilisateur voit des tubes d'équipes, le temps horizontal, la
capacité en hauteur et des surfaces de projets dont l'aire matérialise la charge.
Le curseur et le zoom relient lecture portfolio et lecture détaillée.

**USEFUL UX.** Repères mois/années, non-travaillé visible, palette de statut,
tooltips, accès clavier, drag de priorité et feedback de recalcul.

**LEGACY BEHAVIOR.** Handles qui changent une stratégie legacy, limites
manuelles stockées hors projet, et affectation explicite séparée du workload.

**ACCIDENTAL IMPLEMENTATION DETAIL.** `innerHTML`, délégation imposée par les
rebuilds DOM, coordonnées stockées dans `data-*`, calculs de curseur via DOM et
clés `localStorage` `2d-gantt`.

## 5. Audit du moteur graphique

| Groupe historique | Pur / dépendances | Tests | Couche cible / décision |
|---|---|---|---|
| `buildGanttGeometry` | PURE vis-à-vis DOM; dépend de `PlanningCalendar`, `Team`, `Assignment`, `effectiveCapacity` | TESTED largement | TimelineGeometry; ADAPTABLE ALGORITHM |
| Boucle jour/date→x | Pure; dépend calendrier et paramètres de largeur | TESTED jours, weekends, congés | Geometry; REUSABLE CONCEPT |
| Capacité→y/tube/courbe | Pure; dépend `Team` et capacité historique | TESTED tube et ligne | Geometry; ADAPTABLE, alimenter par VM |
| Empilement/surfaces | Pure; dépend allocations et contrôle de capacité | TESTED aire, overlap, overflow | Geometry; ADAPTABLE ALGORITHM |
| `rectanglePath`, paths | Pure, domaine indépendant | Couvert indirectement | Geometry; REWRITE petit utilitaire |
| `renderGanttSvg` | Sans DOM runtime mais génère markup, classes et `data-*` legacy | TESTED partiellement par assertions chaînes | React renderer; REWRITE |
| `renderTimeAxisSvg` | Même profil; encode rendu SVG directement | TESTED axes/curseur | Geometry + React renderer; REWRITE |
| Labels HTML d'équipe | DOM dans `app.ts` (`renderTeamDateLabels`) | Smoke seulement | React renderer; REWRITE |
| Zoom/viewport | État et gestes dans `app.ts`; geometry reçoit dates visibles | Partiellement testé SVG | VM viewport + Geometry + UI; ADAPTABLE concept |
| Hit testing | Rectangles `.day-hit` dessinés; app relit leurs attributs DOM | Smoke seulement | Geometry retourne hit areas; renderer consomme; REWRITE |
| Curseur, resize, tooltip | DOM/pointer handlers dans `app.ts` | Smoke + tests markup | Inbound adapter/renderer; REWRITE |
| Exceptions mensuelles/cutoff | `computeMonthlyExceptionDailyShare`, options de rendu | Tests partiels | DISCARD V1 avec Actuals |

**Conclusion.** Le noyau mathématique vaut étude et adaptation, pas copie : il
doit recevoir un `TimelineViewModel` plutôt que les entities historiques, et
retourner `TimelineGeometry` plutôt que du SVG. Le renderer React devient seul
propriétaire du markup, des refs et des événements.

## 6. Couplages historiques à rompre

| Couplage | Source / problème | Frontière cible |
|---|---|---|
| UI ↔ planner | `render()` appelle `planPortfolio()` puis en déduit tooltips, diagnostics, summaries | Use case `RecomputePlanning` → résultat présenté |
| UI ↔ domaine | `app.ts` appelle `buildPlanningModel`, métriques, calculs de dates et de consommé | Inbound adapter → use case |
| UI ↔ persistence | App encode/décode, importe/exporte et connaît clés storage | `PortfolioRepository` + import/export ports |
| planner ↔ actuals | Seeds, exclusions et RAF net issus du consommé | Future `CurrentRafProvider`; absent du moteur |
| geometry ↔ domaine | SVG appelle `effectiveCapacity` et reçoit `Assignment` | VM adapter fournit capacité/allocation sémantiques |
| geometry ↔ DOM | `data-*` et `day-hit` sont relus par les gestes | Geometry retourne hit areas; UI conserve ses propres refs |
| persistence ↔ modèle | Document sauvegardé contient contraintes UI/runtime | Persister seulement aggregate/commands nécessaires, pas géométrie |

## 7. Architecture DDD/hexagonale proposée

Le V1 forme un domaine cohérent avec modules internes, non plusieurs bounded
contexts artificiels.

- **Aggregate `Portfolio`** : équipes, projets, ordre de priorité et
  réservations; garantit identifiants et cohérence structurelle.
- **Entities** : `Team`, `Project`, `FirmCapacityReservation` si son identité
  est nécessaire à l'édition; pas de classe obligatoire pour une allocation.
- **Value objects** : `CivilDate`, `PlanningHorizon`, `CapacityPeriod`,
  `WorkingPattern`, `ReservationRatio`, `RemainingWorkload`, `DailyCap`, dates
  objectif/deadline et `ProjectPriority`.
- **Policies/services** : `effectiveCapacity`, règle de capacité réservée,
  admission, partage et policy de deadline.
- **Domain engine** : `PlanningEngine(PlanningInput): PlanningResult`, pur,
  déterministe, sans utilisateur, navigateur ou persistence.
- **Results** : `PlanningResult`, `TeamProjection`, `ProjectProjection`,
  diagnostics de réservation/deadline et planning partiel.

**Application.** Les use cases sont `CreateProject`, `UpdateProjectWorkload`,
`ChangeProjectPriority`, `ConfigureTeamCapacity`, `AddFirmReservation`,
`RecomputePlanning`, puis `LoadPortfolio`/`SavePortfolio`. Ils orchestrent le
domaine et les ports; ils ne contiennent pas l'algorithme.

**Ports justifiés.** `PortfolioRepository` isole stockage; `PlanningImportPort`
et `PlanningExportPort` isolent formats/fichiers. Aucun `Clock`, snapshot ou
API port avant besoin réel. Actuals/snapshots seront une frontière distincte.

## 8. Contrats conceptuels

| Contrat | Producteur → consommateur | Contient | Interdit / invariant |
|---|---|---|---|
| `PlanningInput` | Use case → engine | Horizon, capacités effectives, ratios de réservation, priorités, RAF par projet-équipe, dates/caps | DOM, React, actuals, snapshots, coordonnées |
| `PlanningResult` | Engine → application/adapters | Projections équipe/projet, capacités/réservations, allocations, RAF restant, diagnostics | Couleurs, SVG, viewport; conservation des partiels |
| `TimelineViewModel` | VM adapter → geometry/UI | Domaine temporel visible, lanes, capacités, allocations, identité visuelle, marqueurs/diagnostics/sélection sémantiques | Pixels, paths, hitboxes, DOM refs |
| `TimelineGeometry` | Geometry → renderer | Dimensions, paths/polygones, positions labels, clipping, hit areas | Décisions métier, mutation UI; déterministe pour mêmes entrées |

## 9. Structure cible et dépendances

```text
src/
  domain/{model,capacity,planning}/
  application/{use-cases,ports}/
  adapters/{planning-view-model}/
  infrastructure/{persistence,transfer}/
  ui/{timeline,portfolio,hooks}/
  main/
```

`domain` ne dépend de rien. `application` dépend de `domain`. Les adapters de
présentation dépendent de résultats application/domain. Infrastructure implémente
des ports application. UI dépend des use cases, adapters de présentation et de
React; elle ne dépend pas de l'engine. Le dossier `ui/controllers` n'est pas
imposé : les hooks sont les inbound adapters usuels.

## 10. Stratégie de tests

1. **Engine** : chaque exemple du canon devient `PlanningInput → PlanningResult`.
2. **Application** : use cases et faux `PortfolioRepository`.
3. **View model** : `PlanningResult → TimelineViewModel`, diagnostics et
   identités de projet.
4. **Geometry** : VM + viewport → geometry; UX-001 à UX-011, notamment aire,
   empilement, clipping, zoom, labels et hit areas, sans React.
5. **React/SVG** : markup, a11y, clavier, hover et émission des intentions.
6. **Playwright** : navigation/zoom/cursor, priorité, édition et recalcul.

## 11. Phases de reconstruction

| Phase | Goal / outputs | Dépendances, tests et sortie |
|---|---|---|
| 0 Tooling | Vite React, TS strict, pnpm, Vitest, Playwright, ESLint, Prettier | Aucun; commandes CI vertes |
| 1 Domain | Modèle minimal et invariants capacité/portfolio | Canon métier; tests purs |
| 2 Engine + result | Engine canonique et résultats partiels/diagnostics | Phase 1; exemples canoniques verts sans navigateur |
| 3 Application | Use cases et ports | Phase 2; tests orchestration |
| 4 VM adapter | `PlanningResult → TimelineViewModel` | Phase 3; tests sémantiques |
| 5 Geometry | VM + viewport → geometry pure | Phase 4; UX geometry verts sans React |
| 6 React SVG | Renderer accessible | Phase 5; UX-001..018 renderer |
| 7 Editing UI | Hooks/inbound adapters, formulaires/gestes retenus | Phase 6; interactions/E2E |
| 8 Persistence | Repository local, import/export derrière ports | Phase 3; migrations propres |
| 9 Integration | Régression contre UX canon | Phases 6–8; Playwright critique |
| 10 Actuals | Actuals/history → RAF courant | Hors V1; aucun impact `PlanningInput` |

## 12. Risques et décisions

| Risque | Probabilité / impact | Mitigation / moment |
|---|---|---|
| Signature UX perdue | Moyen / fort | UX-xxx validés avant Phase 5 |
| Géométrie mal comprise | Moyen / fort | Tests de caractérisation historiques puis geometry pure, Phase 5 |
| Accessibilité régressée | Moyen / fort | Préserver UX-017, tests DOM et Playwright, Phase 6 |
| Couplages `app.ts` cachés | Élevé / moyen | Auditer chaque gesture avant Phase 7 |
| Actuals contamine le moteur | Élevé / fort | RAF seule entrée, Phase 1–2 |
| Précision/arrondi | Moyen / fort | Politique canonique fixée avant Phase 2 |
| Performance SVG | Faible-moyen / moyen | Benchmark geometry/render avec portefeuilles historiques, Phase 6/9 |
| VM trop complexe | Moyen / moyen | Contrat sémantique minimal, pas de pixels, Phase 4 |

## 13. Open questions

1. Représentation TypeScript définitive de date objectif et deadline.
2. Champs de `PlanningResult` nécessaires hors moteur, au-delà de l'adapter.
3. Politique exacte d'arrondi à 0,5 j.h pour les allocations de deadline.
4. **NEEDS DECISION avant Phase 7 :** quelles interactions legacy de resize
   deviennent des commandes métier explicites dans le modèle canonique.
5. **NEEDS DECISION avant Phase 8 :** compatibilité/import des JSON historiques
   ou rupture assumée avec un outil de conversion séparé.

## Recommended next step

Le cadrage est suffisant pour démarrer les phases 0 puis 1. La phase 2 exige
la décision d'arrondi; les formes TypeScript de dates peuvent être fixées en
Phase 1. La décision sur handles/édition peut attendre Phase 7. Aucun bloqueur
ne justifie de consulter de nouveau le dépôt historique avant de commencer le
domaine : après validation de ce document, les deux canons deviennent les
sources de vérité et le dépôt historique reste seulement une référence de
caractérisation UX.
