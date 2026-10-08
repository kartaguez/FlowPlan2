# Lot 11C — Séparation temporelle Actuals / Forecast

Statut : **DONE**, clôture explicitement autorisée par l’utilisateur le 2026-10-08.
11A/11A.2 restent DONE ; **11B reste IN REVIEW**, sans clôture implicite.
Mission autorisée sur `codex/lot11a-portfolio-snapshots`, SHA initial et baseline
`9ac532f0451e25a4b53564b9fc6359d3f824f318`. Avant modification : fetch réussi,
branche correcte, baseline ancêtre (HEAD identique), arbre propre, origin 0/0.
Le [plan audité](./lot11c_plan.md) et les précisions de mission approuvent P1–P7.
Le SHA final est celui du commit de livraison contenant ce canon, consigné dans
le compte rendu Git final ; aucune auto-référence de commit n'est persistée.

## Contrat implémenté

`projectActualsKnowledgeFromPortfolio` produit un tableau readonly gelé de
lignes gelées `{projectId, actualsThrough}`, une pour chaque Project dans l'ordre
du Portfolio, actif ou inactif. Il ne lit que les métadonnées de la source :
V5 courant couvert → `coverage.actualsThrough` ; V5 sans couverture/RAF seul →
null ; sans V5 → dernier `actualsThroughDate` legacy V4 ; sans source → null.
Zéro consommé reste couvert. Extension, érosion ou rectification courante fait
immédiatement autorité, sans maximum historique, date positive, knowledgeDate,
Save, Projection date ou horloge. Une borne V4 future acceptée reste inchangée.

La sélection `projectActualsRange` est partagée avec les profils historiques
via réexport et alias de type. Sa sémantique reste identique. La reconstruction,
les occupations quotidiennes et leur omission des totaux nuls sont inchangées.
Aucun RAF, consommé, format V5/V6/V7 ou champ Project persisté n'est modifié.

`PlanningInput` et `RecomputePlanningRequest` imposent la nouvelle entrée.
`buildPlanningSessionProjection` dérive occupation et borne depuis le même
Portfolio candidat ; `recomputePlanning` transmet sans interprétation.
`planPortfolio` valide tableau, IDs connus/uniques, exhaustivité (inactifs inclus)
et date civile canonique ou null, avec `TypeError` contextualisé. Aucun fallback.
La Map est construite une fois par run, puis T rejoint chaque état Project/Team.
Dérivation/validation/index : O(P), sans reconstruction quotidienne supplémentaire.

Dans `engine.ts`, `isProjectDateEligible` compare les dates civiles : earliest
inclusive et T exclusive. Le même prédicat contrôle `selectAdmittedProjects`
et `deadlineAccessibleCapacity`, avant toute lecture/écriture du résidu.
Il protège les Mandatory optimisés, les trajectoires lues ultérieurement,
UNFEASIBLE/MISSED et le lookahead. Aucun filtrage après allocation.

```text
Pour toute allocation Forecast positive F(P,t,d) : T(P) = null ou d > T(P).
```

La borne est globale au Project sur toutes ses Teams. Une inéligibilité ne
prend aucun slot et n'écrit jamais zéro dans la capacité/résidu partagé.
Priorité, admission figée, quanta/rounds exacts, caps, partage, automate deadline,
diagnostics et plans incomplets restent inchangés. Comparer `d > T` évite
l'overflow pour `9999-12-31`. Le RAF entier reste non planifié si tout est bloqué.
Reservations : demande ratio/fixed-daily et addition Actuals/demande Forecast
conservées intégralement ; aucune borne Reservation, nouvelle règle ou diagnostic.

## Projections et compatibilité historique

Dates, metrics, Timeline et Geometry lisent le run corrigé sans déplacement.
Estimated start reste la première activité positive Actuals ou Forecast ; des
Actuals positifs en août conservent août même avec couverture jusqu'au 30/09 et
premier Forecast le 01/10. Estimated end conserve la complétion Forecast existante.
RAF/EAC et progressions Forecast gardent leurs définitions exactes.

Seule la constante des nouvelles captures devient
`planning-engine-v1/actuals-aware/2`. Save fige les allocations publiées,
sans recompute, filtre ou correction. Aucune modification des formats,
transactions, codecs, UI History ou validation historique.

La fixture `lot11c-baseline-overlap.json` a été produite avec **l'engine exact de
9ac532f**, transpilé dans un module temporaire, sur les inputs du test 11A.2
chevauchant. Son engineVersion historique `/1` et ses profils sont conservés.
Le test existant de chevauchement garde ses assertions sur cette capture
historique ; seul son producteur courant incompatible avec le nouvel invariant
est remplacé. Une collection `/1` chevauchante + `/2` séparée round-trip V7
reste profondément égale et est lue par History sans replay ou correction.
Les tests schema 1/V6, engineVersion inconnu, startup sans rewrite, imports,
exports, Save/Delete et préservation des captures restent passants.

## Caractérisation et couverture de la matrice §10

Avant production : suite **805/805, 93 suites** (1687,164 ms), puis test du
chevauchement permis par l'occupation seule : **806/806** (1695,607 ms).
Inventaire : admission normale → fair allocation/complete rounds ; admission
Mandatory → accessibilité/ratio → allocation optimisée ou trajectoire future ;
UNFEASIBLE/MISSED → maximum journalier ; commit uniquement de l'ensemble admis.
Les lookaheads utilisent le même cache de capacité que l'horizon, sans allocation
hors horizon. Les tests deadline, slots, priorité et terminaison existants ont
été conservés, ainsi que le digest exact de la fixture réelle Mandatory.

La livraison ajoute **74 tests**, deux suites. Les nouveaux tests moteur et
intégration parcourent **toutes les allocations positives de toutes les Teams**
et toutes les admissions, vérifient horizon, borne et conservation RAF.

| Matrice du plan | Vérification exécutée |
| --- | --- |
| Source | V5 multi-period, tail zéro/tout zéro, absent/RAF-only, V5 après érosion totale, legacy intermittent/futur, V5 supersédant V4 retenu ; range partagé, ordre/immutabilité/déterminisme. |
| Frontière | Champ absent/null/non-array, ligne absente, ID inconnu/dupliqué, date invalide/noncanonique/absente, null valide, vide et inactifs inclus. |
| Dates/horizon | Avant/début/milieu/fin/après horizon, 30/09→01/10, earliest avant/égale/après T, année/bissextile, un jour et borne 9999 ; état incomplet et diagnostic horizon sans perdre RAF. |
| Normal | Deux Teams dont une sans Actuals positifs, priorité haute bloquée N=1, RAF tiers/deux tiers, caps zéro/tiers/positif, capacité et slots rendus aux autres Projects ; conservation et freeze existants. |
| Mandatory | Admission retardée, deadline avant/égale/après T, T+1, passée avant start, hors horizon ; PENDING puis états existants, MISSED unique ; deux Mandatory en concurrence et lecteur ultérieur/non lecteur, cap et fractions. |
| Capacité/Reservations | Nouveaux cas ratio/fixed couvert + Actuals excessifs : demande inchangée et overload marginal exact. Suite existante : gaps, exceptions, weekdays, capacités fractionnaires/nulles, inactifs et surcharge. |
| Application/transitions | Source → occupation/borne → run → métriques → capture ; extension/érosion/rectification/total erosion, RAF seul, ajout/retrait/réintroduction Team, activation, RAF zéro/partiel, absence capacité et cap. |
| Transactions | Erosion via commande et dispatcher, une projection par succès, échec projection/quota atomique, stale/no-op sans projection, Save/Delete zéro moteur ; suites préflight/import/drafts/Cancel existantes conservées. |
| Dates/adaptateurs/métriques | Août positif conserve début estimé, septembre couvert sans aucune occupation positive, premier Forecast octobre sur les deux Teams ; RAF et numérateur exact, end/reasons, parité Timeline/Geometry et métriques existantes. |
| Capture/migration/History | /2 nouveau, /1 ancien chevauchant exact, collection mixte profondément égale après V7 et VM History ; capture jour par jour, conservation, schemas et anciennes validations existants conservés. |
| Terminaison/performance | Horizon fini entièrement bloqué, 100×2×730, grand rationnel, Mandatory optimisé/trajectoire, lookahead hors horizon ; digest réel identique et gate <5 s inchangée. |

Gates finales : `npm run typecheck` **PASS (exit 0)** ; `npm test`
**879/879 tests, 95 suites, fail/cancelled/skipped/todo = 0** (1741,243 ms) ;
`npm run build` **PASS (exit 0)** ; `git diff --check` **PASS**.
Aucun test supprimé, désactivé ou affaibli. Les helpers de fixtures moteur
acceptent maintenant les sérialisations de fractions exactes des nouveaux cas.

## Mesures de performance

Node v24.21.0, Darwin, même machine ; deux warmups puis médiane de cinq runs.
[Relevé brut](./lot11c_measurements.json), harness
`scripts/benchmark-lot11c.mjs` après `npm test`.
Les mesures initiales sont antérieures à toute production : cas réel sans
Actuals engine 2,942→2,935 ms, projection 25,042→25,695 ms (+2,6 %) ; réel
Mandatory 308,476→317,074 ms (+2,8 %), projection 349,130→356,553 ms (+2,1 %).

Le comparatif contrôlé supplémentaire utilise une copie temporaire des modules
compilés avec seulement `engine.js` remplacé par l'engine de baseline transpilé
via TypeScript ; même préparation/source/harness pour isoler le moteur. Le
projecteur courant est commun aux deux runs, donc son très faible coût apparaît
séparément, sans prétendre remplacer la baseline initiale de projection.
`LOT11C_MODULE_ROOT=file:///tmp/lot11c-baseline-modules/` sélectionne cette copie.
Le cas borne extrême est engine-only ; la vraie couverture zéro mesure la
projection complète et sa reconstruction existante de 146 000 contributions.

| Cas | Engine avant → après ms | Projection avant → après ms |
| --- | ---: | ---: |
| Réel sans Actuals | 3,084 → 3,109 (+0,8 %) | 24,823 → 25,702 (+3,5 %) |
| Réel un Project couvert zéro | 2,447 → 2,526 (+3,2 %) | 25,064 → 26,533 (+5,9 %) |
| Réel Mandatory | 308,402 → 316,887 (+2,8 %) | 350,466 → 355,964 (+1,6 %) |
| 100 Projects × 2 Teams × 730, sans Actuals | 5,981 → 5,895 | 123,250 → 125,331 (+1,7 %) |
| Même volume, entièrement couvert zéro | 5,818 → 5,528 | 463,073 → 489,955 (+5,8 %) |
| Plusieurs Mandatory, fractions longues, deadline au-delà de l'horizon | 0,431 → 0,399 | 0,593 → 0,574 |
| Borne extrême tout bloqué | 6,545 → 5,713 | — |

Tous les écarts défavorables sont <20 %. Les petits temps varient avec JIT/GC ;
aucun gain absolu n'est promis. Dérivation : quelques microsecondes pour 100
Projects (samples exacts dans le JSON). Aucun scan de jours ajouté à celle-ci.
L'horizon reste parcouru pour capacités/statuts/diagnostics même sans admission.
Les coûts de reconstruction restent ceux du contrat existant ; aucun jour
lookahead n'est persisté ou capturé. Le cas fractions hors horizon configure
14 jours d'horizon, capacité connue jusqu'au 01/03 (60 jours inclusifs) ; la
garde n'ajoute aucune boucle workload ni attente du déblocage.

## Revue visuelle et limitations

Mac verrouillé : l'utilisateur a explicitement autorisé Chromium headless
installé, profil et CDP temporaires locaux, sans dépendance/stack E2E ajoutée.
Captures inspectées à 1440 et 390 px sous préférences clair/sombre :
[Planning desktop](./lot11c-ui/september-light-1440.png),
[Planning mobile](./lot11c-ui/september-light-390.png),
[History desktop clair](./lot11c-ui/mixed-light-1440.png),
[History desktop sombre](./lot11c-ui/mixed-dark-1440.png),
[History mobile clair](./lot11c-ui/mixed-light-390.png),
[History mobile sombre](./lot11c-ui/mixed-dark-390.png),
[chevauchement ancien/séparation nouvelle au zoom](./lot11c-ui/mixed-zoom-1440.png).
Les captures Planning sous préférence sombre sont également conservées ; le
Planning existant conserve son thème clair, seul History a un style sombre.
Aucun changement CSS hors lot.

Le scénario septembre/octobre a RAF positif sur deux Teams ; l'une a Actuals
positifs, l'autre zéro, tail couvert zéro au 30/09. Toutes les 14 formes Forecast
Atlas commencent le 01/10 ou après, sur Alpha/Beta, aux quatre configurations.
Atlas progress est zéro en septembre, dates/diagnostics rendus ; les autres
Projects occupent normalement septembre. Le profil historique orange empile
Actuals/Forecast le 01/01, le nouveau rouge sépare le Forecast au 02/01 ; marker
through indépendant, zoom explicite vérifié. Focus de ligne ouvre les détails,
retour Planning garde la date et le backup strictement identique. Relevés DOM
et profils/path capturés dans [review.json](./lot11c-ui/review.json).
`documentElement.scrollWidth === innerWidth` (1440/390) dans les huit cas.
Les métriques mobiles gardent leur scroll interne existant, sans overflow du
document. Aucune correction de renderer/History pour masquer le moteur.

Les limites de mémoire/quota, palette et audit accessibilité/physique de 11B
restent inchangées ; cette revue utilise un navigateur headless et des scénarios
reproductibles, pas un appareil mobile physique. Audit indépendant/humain reste
requis. Aucun risque fonctionnel résiduel identifié dans le périmètre testé.

## Fichiers et portée

Production créée : `src/domain/actuals/projectActualsKnowledge.ts`.
Production modifiée : Domain `planning/contracts.ts`, `planning/engine.ts`,
`index.ts`, `portfolioSnapshots/historicalDailyProfile.ts` ; Application
`planning/recomputePlanning.ts`, `portfolioSnapshots/capturePortfolioSnapshot.ts` ;
Main `planning/buildPlanningSessionProjection.ts`.

Tests créés : `src/main/planning/lot11cTemporalSeparation.test.ts`, fixture
`src/main/planning/fixtures/lot11c-baseline-overlap.json`.
Tests modifiés : Domain `planning/engine.test.ts`, `engine.termination.test.ts`,
`capacity/reservation.test.ts` ; Application `planning/recomputePlanning.test.ts`,
`portfolioSnapshots/dailyProfiles.test.ts` ; adapter
`timeline/buildTimelineViewModel.test.ts` ; Main
`demo/createDemoPlanningScenario.test.ts`, `planning/realBackupMandatory.test.ts`.
Les callers sans Actuals fournissent explicitement une ligne null par Project.

Documentation : ce canon, plan 11C/statuts, durable/current canons/current plan,
amendement ciblé du canon moteur, canons 10C.1 et 11A.2, relevé perf et dossier
UI (9 PNG + JSON). Harness benchmark ajouté, aucune dépendance.
Aucune migration, nouvelle persistance, replay, modification de snapshot ancien,
règle Reservation, diagnostic ou refonte Planning. **Aucun travail hors 11C.**

## Explicit user closure — 2026-10-08

The user explicitly closed 11B and 11C and authorized the storage architecture
implementation. Closure baseline: `eb38a3df8fceab30d82253cac6bc5cd325625444`, clean,
origin 0/0 after fetch. Before storage changes: typecheck PASS, **879/879 tests
across 95 suites PASS**, build PASS. Earlier IN REVIEW mentions describe the
delivery history, not the current status. Engine baseline is fixed at this SHA;
11C engine `/2`, V7 schema 1/2 and the validated History contract are unchanged.
**11B DONE; 11C DONE.** Storage implementation will be reviewed separately.
