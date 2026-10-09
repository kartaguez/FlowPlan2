# 11D.2 — Historical Inputs Contract & Replay Feasibility

**11D.2 — DONE — G1 uniquement, clôture documentaire du 2026-10-09.**
La reconstruction des inputs historiques et leur simulation par la chaîne
courante sont faisables sur les cas exécutés. Aucun input moteur manquant ni
substitution de configuration Current n'a été observé. Cette conclusion reste
limitée aux fixtures et dimensions ci-dessous ; elle ne certifie pas tous les
états historiques imaginables. L'audit indépendant est favorable et l'utilisateur
a explicitement autorisé la clôture DONE. Les lots 11D.3, 11D.4 et 11D.5
restent **NOT STARTED**. L'architecture inputs-only de production n'est pas déployée.

## Baseline et frontières

Dépôt `kartaguez/FlowPlan2`, branche `codex/lot11a-portfolio-snapshots`.
Baseline obligatoire et HEAD de toutes les exécutions de preuve :
`633dfc9459c7398f800abfb47439e1251e7bd7aa` (modifications G1 non commitées).
Avant toute modification : fetch réussi, status vide, branche correcte,
HEAD exact, origin/HEAD **0/0**. Aucun `AGENTS.md` applicable dans le dépôt
ou ses parents. Aucun reset. Le SHA de livraison est le commit contenant ce
rapport ; il est communiqué avec le contrôle de synchronisation après push.

Seuls tests/fixtures isolés, scripts de laboratoire, résultats et suivi sont
modifiés. Les fichiers `.fixture.ts` sont exclus du build applicatif existant ;
aucun import entrant de production vers `src/proof/lot11d2`. Aucun changement
moteur, modèle, codec, Actuals/RAF, repository, IDB, format V1–V8, interface,
Save, service définitif, worker ou cache. Aucun canon modifié.

Le [plan normatif](./lot11d2_plan.md) reste la référence. Les futurs variants
inputs-only et les axes service/persistance/intégration ne sont pas livrés ici.

## Clôture après audit indépendant

L'implémentation de preuve livrée est
`ee66a72cb6073c753681af95acae5122f93f13d3` ; ce SHA est la baseline vérifiée
de la présente clôture, sur la branche attendue, arbre propre et origin **0/0**
après fetch. La baseline `633dfc9459c7398f800abfb47439e1251e7bd7aa` ci-dessus
est celle de l'exécution G1 avant son commit.

L'audit favorable et l'autorisation explicite de l'utilisateur acceptent G1
avec les limites consignées dans ce rapport. La clôture ne modifie que les
trois documents Markdown de suivi ; aucun code, test, fixture, script, résultat
JSON, format ou dépendance n'est modifié. Les gates et mesures ci-dessous sont
les résultats de la livraison auditée, sans nouvelle exécution lors de la clôture.
Le diff documentaire et `git diff --check` sont vérifiés avant commit/push normal.

## Contrat exécuté et représentation exacte

Le noyau [replay.fixture.ts](../../../src/proof/lot11d2/replay.fixture.ts)
importe les fonctions existantes :
`hydrateHistoricalInputs` → `reconstructActuals` →
`actualOccupationFromReconstruction` + `projectActualsKnowledgeFromPortfolio`
→ `PlanningInput` entier → `recomputePlanning` → résultat canonique.
Il ne reçoit que l'état historique résolu. Current n'est passé qu'au resolver,
pour les tuples Actuals V5 ; legacy inline et none ne lisent aucune connaissance
Current. La résolution actuelle encode encore tout le conteneur Current :
c'est un coût et un couplage technique, sans substitution métier démontrée.

Référence de parité : `buildPlanningSessionProjection` sur le même état Current,
avec ses résultats moteur/reconstruction publiables. La capture vient de cette
référence réelle. Le replay indépendant n'appelle ni ce builder, ni Timeline/
History VM, ni Geometry. Le test du getter `forecast` qui lève une exception
prouve qu'aucun résultat capturé n'est lu par le replay. Les anciens artefacts
restent validés à leur frontière avec les validateurs fermés existants.

Le DTO `lot11d2-business/1` couvre **tous les champs de PlanningResult** :
capacités effectives/réservées/restantes, occupation Project/Reservation,
les deux surcharges, admissions (ordre métier conservé), allocations datées,
planned/remaining/complete, projected end, deadline status et trajectoires,
diagnostics avec multiplicité. Il ajoute contributions et totaux Actuals,
provenance recordIndex/snapshotId/periodId, occupation, borne de connaissance,
priorité, totaux Actuals/RAF/EAC, noms et dates/reasons via helpers courants,
demandes Reservation nommées par Team/date. Les identités/catalogues/couleurs,
partitions et métadonnées complètes sont aussi contrôlées par égalité du **DTO
d'inputs résolus**, produit par le codec actuel, pas par JSON de Domain.

Quantités : `serializeQuantity` et opérations Rational/BigInt uniquement,
fractions réduites exactes, zéro `0/1`, aucune tolérance ni conversion flottante.
Absent et null sont représentés explicitement pour les champs optionnels.
Tri lexical `<`/`>` portable des ensembles Team/Project/date et des diagnostics ;
priorityOrder, admissions, versions, partitions et participation restent des
ordres métier. Les hashes SHA-256 accélèrent les répétitions/processus et tracent
les sorties ; les tests et le runner de preuve font aussi les comparaisons
structurelles exactes. Le manifest des fichiers du runner est une trace de
baseline, pas une proposition de clé de cache de production.

## Résultats de preuve et matrice des scénarios

[Suite exécutable](../../../src/proof/lot11d2/replay.test.ts),
[fixtures](../../../src/proof/lot11d2/inputs.fixture.ts),
[runner](../../../scripts/prove-lot11d2.mjs),
[résultats exacts](./lot11d2_proof_results.json).
Le runner conserve, pour chaque couple, les digests des inputs et du DTO métier,
les totaux rationnels, dates et diagnostics exacts ; les fixtures sont lisibles
et recréées par factories strictes, sans modifier les fixtures antérieures.

- **26 couples Current/historique**, inputs1/2 lorsque le contrat RAF le permet,
  parité structurelle exacte ; **10 répétitions** de chacun identiques.
- Oracle indépendant : un jour de `1/3` Actuals, requirements RAF `2/3`, RAF de
  la source V5 `99/1` : EAC **`1/1`**, allocation **`2/3` le 2025-01-02**,
  aucune allocation le jour couvert 2025-01-01 ; fin 2025-01-02.
- Trois processus frais, TZ UTC/Europe/Paris/Pacific/Honolulu : même digest
  `9844c9583a8e456314affa4a6e394347eec9d346f353cde0c7841f55b60926c2`.
- Permutations valides Teams, stockage Projects, Reservations, RAF et consumed
  par Team : identité canonique ; requirements/participation permutés ensemble
  aussi. PriorityOrder reste sémantique : son changement produit une différence.
- Exceptions non chronologiques et requirements permutés seuls : refus strict,
  pas de « permutation valide » obtenue en désactivant la validation.

| Plan | Cas exécutés / tests | Preuve et limite |
| --- | --- | --- |
| V01, V03 | Parités inputs1/2 ; test croisé inputs1/2 × forecast1/2 ; mismatch RAF inputs1 | Quatre contrats legacy existants valides ; ancien mismatch refusé. Future inputs-only hors G1. |
| V02 | independent-raf ; oracle ; complex-rationals-overload | RAF requirements différent du RAF source ; EAC exact sans double Actuals. |
| V04 | none, raf-only, zero ; zero-tail en v1 ; versions-erosion-correction | Absence, uncovered et covered-zero distincts ; borne issue de couverture, pas des seuls jours positifs. |
| V05, V07 | v1 après v2 ; terminal v2 après v3 ; retired-reintroduced ; fermeture par cellule | Préfixes, participation, retired, IDs, zéros, dates, RAF et provenance exacts. Transitions historiques représentatives, pas enumeration de tous memberships. |
| V06 | legacy intermittent avec participant non membre ; reconciled ; future-v4 ; legacy→Current reconciled | Evidence et autorité RAF inline préservées ; aucune réconciliation créée par replay. |
| V08 | inactifs Project/Reservation ; fixed-daily, ratio dans état riche ; demandes nommées | Actuals inactifs conservés ; Forecast absent ; demandes et occupation séparées. |
| V09–V10 | Mutation globale après H ; permutations | Capacité, exceptions, priorité, RAF, activation, Reservation, calendrier, horizon, parallélisme, noms/couleurs/dates/cap mutés : mêmes inputs H et même simulation ; latest Current différent. |
| V11–V12 | Mandatory multi-Team riche ; horizon court/lookahead ; date9999 ; zéro capacité/dailyCap ; knowledge future | Admission et allocations respectent 11C ; impossibilité d'allouer produit un résultat incomplet diagnostiqué, pas un refus de replay. |
| V13 | Sommes par Project, période/Team et Reservation ; fallback calendrier/all-date | Conservation rationnelle, contributions zéro incluses ; fallback exact `1/3,0/1` ou `1/6,1/6`. |
| V14 | Cas complets/incomplets/inactifs ; dates helpers ; complexe avec surcharge | planned+remaining=RAF exact ; EAC=Actuals+RAF ; surcharges Actuals et marginale Reservation distinctes. |
| V15–V16 | Répétitions, permutations, processus/TZ, Date.now interdit, viewport390/1440 | Aucun comportement non déterministe observé sur ces cas ; le noyau n'a aucune dépendance UI/horloge. Worker non testé. |
| V17 | Sources manquantes, ID absent, owner absent, préfixe tronqué, schema99, parallèle0, doublon source | Refus sans réparation, mutation ou fallback. État legacy valide extrême non exécuté pour risque ressources, voir registre. |
| V18–V19 | Ancienne fixture overlap `/1`, profils schema1 absents, bytes avant/après | Ancien artefact conservé ; nouvelle simulation applique 11C et peut différer de l'ancien Forecast. |
| V30 | Small/target/stress/adverse et trois variations contrôlées | CPU, observations heap/RSS, release après GC et tailles mesurés ; aucun budget worker/cache/UI certifié. |

La suite ne revendique pas V20–V29 (intégration, scheduler, nouveaux formats,
recovery futur et arbitrage cap). Les gates existants de storage restent des
vérifications de non-régression, pas une livraison de ces capacités.

## Complétude : matrice inputs → restauration → preuve

Pour chaque état de parité, **l'intégralité du DTO historique réhydraté est
égale au DTO Current de référence** ; la construction de PlanningInput ne prend
aucun paramètre autre que cet état et ses Actuals reconstruits. Les cinq
familles d'entrée directes du moteur sont donc explicitement liées aux sources.

| Famille du §4 | Source restaurée | Validation / expérience |
| --- | --- | --- |
| Horizon, working pattern, maxParallelProjects | `snapshot.inputs.planning` | Codec strict + horizon factory ; mutation Current, viewport, timezone, horizon court/9999, parallèle0 refusé. |
| Teams IDs/noms, periods, unavailability, exceptions | `inputs.portfolio.teams` | Factories capacity strictes ; état riche variable `1/3`, `8/3`, exception zéro et positive ; égalité DTO ; mutation Current ; hors horizon et fallback. |
| Projects IDs/noms, activation, requirements/membership | `inputs.portfolio.projects` | Factory Portfolio et participation terminale ordonnée ; mono/multi-Team, inactive, retirement/reintroduction et permutations couplées. |
| RAF, daily caps absent/zéro/exacts | Requirements historiques | Inputs1 égalité ancienne obligatoire ; inputs2 indépendant ; oracle, complexe, cap0, impossible capacité0 ; planned+remaining=RAF. |
| Earliest, objectiveEnd, mandatoryDeadline | Champs historiques Project | État riche et mutation des trois dates Current ; Mandatory/lookahead/horizon court ; dates distinctes conservées par DTO. |
| Reservations identité/noms, dates, activation, allocations | `inputs.portfolio.reservations` | Factories strictes ; fixed-daily et ratio ; mutation configuration/activation Current ; demandes exactes nommées et contributions séparées. |
| priorityOrder complet, Program/Pas/associations, couleurs | Champs Portfolio historiques | DTO complet, aucune priorité tirée du forecast ; storage permutations inchangées ; priorité sémantique ; labels/couleurs Current mutés après H. |
| Sources none/V4/V5 et migration status | Manifest `actualsSources` + evidence inline ou tuple exact owned | Source manquante/inconnue/préfixe invalide refusés ; none n'est jamais remplacé par V5 Current. |
| V5 coverage/partitions, version/date, IDs, participation/retired, RAF historique | Préfixe exact v1..v sélectionné | Égalité DTO intégrale, conservation par cellule, zero-tail historique retenu, append stable et périodes corrigées distinctes. |
| V4 dates/cumuls, anciens participants, RAF authority | Legacy inline de H | V4 intermittent/non-member/future-through, reconciliation Current sans effet, protection repository de l'evidence et de sa map authority. |
| Occupation moteur et connaissance totale tous Projects | Reconstruction + `projectActualsKnowledgeFromPortfolio` historiques | Conservation, zéros couverts, inactifs, Actuals hors horizon et borne 11C ; jamais occupation Current injectée. |
| Capacités quotidiennes, dates, diagnostics, allocations, EAC | Dérivés de la chaîne courante | DTO métier complet et oracle ; aucun forecast persisté lu, aucun résultat fabriqué. |
| Portfolio ID/date Save/versions et états UI | Identité/provenance, hors inputs moteur | Clock/viewport/processus différents ; old engineVersion ne sélectionne jamais un moteur ancien. |

Aucune famille nécessaire au PlanningInput courant n'est trouvée manquante dans
ces captures valides résolues. Catalogue orphelin, nouveau paramètre métier futur,
identité de génération et conservation après corruption hors ports ne sont pas
prouvés par cette égalité. Aucune valeur métier par défaut n'est inventée.

## Fermeture Actuals et registre de refus

Les tests de repository utilisent le repository réel avec backend mémoire isolé.
Ils refusent mutation/troncature d'un préfixe owned, suppression du propriétaire,
mutation du legacy et de sa map RAF authority ; token et simulation H restent
identiques après les refus. Un append autorisé conserve le contenu de H et son
run après lecture validée. Les tests natifs IDB existants ont aussi été relancés.

Garanties actuelles : writeCurrent conserve contenu owned et evidence, CAS lie
la vérification au commit, Portfolio conserve Teams historiques, lectures de
captures validées, import génération fermée. Limites : Current reste le gros
conteneur de références ; aucun port archive/version-refcount/GC partagé ;
identities ne sont pas des compteurs de versions ; génération/import ne sont
pas une fusion. Une mutation hors ports ou une perte physique de storage n'est
pas couverte. 11D.3 devra maintenir ces garanties, pas les supposer grâce au cache.

| Cas | Résultat actuel observé | Réaction de la preuve |
| --- | --- | --- |
| Source absente | `Missing historical source…` | Refus ; inputs conservés. |
| ID choisi inconnu / owner absent | `Broken Actuals reference…` | Refus ; aucune résolution latest. |
| Préfixe commencé à v2 | Erreur versions consécutives / départ v1 | Refus du codec/factory. |
| Inputs1 RAF incompatible | `ACTUALS_RAF_MISMATCH` | Refus avant adaptation, pas de RAF réécrit. |
| Parallélisme0 / schema99 | Erreur scalar / `Unknown inputs schema` | Refus. |
| Sources doublées | `Missing Actuals source.` (compte incohérent) | Refus ; diagnostic actuel imprécis, à classifier ultérieurement. |
| Exceptions désordonnées | `Inputs are not losslessly canonical.` | Refus strict, pas de normalisation cachée. |
| Ancien artefact valide extrême | V4 through9999-12-31, **2 912 842 contributions** estimées, plus grand intervalle **2 912 837 jours** | `RESOURCE_RISK_NOT_EXECUTED`, laboratoire ; validation et résolution seules exécutées. |
| Capacité0 ou RAF non allouable | `PROJECT_REMAINS_UNPLANNED_AT_HORIZON`, deadlines selon cas | **Simulable** : résultat incomplet exact, distinct d'une incompatibilité technique. |

Aucun état valide raisonnablement borné de cette suite n'a échoué dans le
moteur courant. Le cas extrême est un artefact valide mais **non simulé ici** :
les millions de dates, poids, rationnels et contributions dépassent l'enveloppe
mesurée. Cela ne prouve pas qu'il échouerait sur toute machine, et ce n'est pas
un budget de production. Aucun résultat ni erreur moteur n'est inventé.
La catégorie « ancien état valide mais non resimulable par une chaîne future »
reste nécessaire ; aucune incompatibilité sémantique naturelle n'a été trouvée
sur l'échantillon. Les futures erreurs doivent garder étape/cause et distinguer
ressource, dépendance, contrat et corruption ; l'actuel wrapper storage CORRUPT
et les messages génériques ne fournissent pas encore cette taxonomie.

## Protocole CPU/RAM reproductible

Commandes depuis la racine (Node24, dépendances déjà installées) :

```sh
npm run typecheck
npm test
npm run build
npm run test:portable
npm run test:storage
node --test .test-dist/proof/lot11d2/replay.test.js
node scripts/prove-lot11d2.mjs --output=docs/steps/STORAGE/lot11d2_proof_results.json
node --expose-gc scripts/characterize-lot11d2.mjs --output=docs/steps/STORAGE/lot11d2_measurements.json
git diff --check
```

Pour compiler la preuve seule :
`node node_modules/typescript/bin/tsc -p tsconfig.test.json`.
Le harness accepte `--case=small`, `target`, `stress`, `adverse`,
`target-singleCapture`, `target-simpleRationals`, `target-manyPartitions`.
Le résultat brut conserve environnement, dimensions, dix samples de chaque
étape, CPU process, wall, heapUsed/heapTotal/RSS/external/arrayBuffers à chaque
frontière, tailles et digests. Deux warmups puis dix runs ; GC laboratoire avant
et **après retour de la frame de calcul**, release des objets avant mesure finale.
Le protocole final a été exécuté seul ; les premières mesures concurrentes et
la version avec temporaire JSON encore stack-rooted ne sont pas livrées.

Environnement : Apple M4, 10 CPU logiques, mémoire physique 16 GiB,
Darwin27.0.0, Node v24.21.0, `--expose-gc`. Seed structurelle fixe, aucune donnée
aléatoire. Captures préparées par moteur réel hors timing, pas de forecast
synthétique. Le corpus JSON temporaire est relu à chaque run, Current est décodé
strictement ; la capture est validée lors de sa préparation, puis ses inputs
résolus/décodés strictement à chaque run. Cette mesure ne reproduit pas
IO/checksum/validation complète d'une lecture repository native.

S représente le nombre de captures **lues/parsées** ensemble ; un état sélectionné
est simulé par run, sans préchauffage de S moteurs. Captures distinctes par ID,
inputs identiques pour isoler S ; ne pas assimiler cela à S histoires différentes.
K = Teams par Project. Les Actuals se terminent la veille de l'horizon, restent
non clippés et comportent des périodes couvertes zéro. Préfixes 2/3/4/6 versions,
RAF V5 volontairement distinct, capacités variables/exceptions, inactifs,
réservations ratio/fixed-daily et Mandatory. Rationnels complexes ont un
numérateur/dénominateur de plus de vingt chiffres.

[Samples bruts et tailles exactes](./lot11d2_measurements.json).

| Cas | S/P/D ; T/R/K | Périodes/versions ; jours Actuals | Contributions | Résultat canonique MiB |
| --- | --- | --- | ---: | ---: |
| small | 5/20/365 ; 3/8/2 | 2/2 ; 31 | 1240 | 1.50 |
| target | 25/100/730 ; 5/30/3 | 8/3 ; 120 | 36000 | 19.24 |
| stress | 100/200/1095 ; 8/80/4 | 12/4 ; 180 | 144000 | 99.44 |
| adverse | 1/100/365 ; 8/30/8 | 24/6 ; 730 | 584000 | 129.62 |
| target-singleCapture | 1/100/730 ; 5/30/3 | 8/3 ; 120 | 36000 | 19.24 |
| target-simpleRationals | 25/100/730 ; 5/30/3 | 8/3 ; 120 | 36000 | 18.50 |
| target-manyPartitions | 25/100/730 ; 5/30/3 | 32/3 ; 120 | 36000 | 19.32 |

Temps wall **médiane / p95** en ms (CPU process médian entre parenthèses).

| Cas | Lecture/decode | Résolution | Actuals | PlanningInput | Moteur | Canon/extraction |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| small | 3.75/4.15 (4.91) | 1.57/2.49 (1.67) | 1.41/1.63 (1.86) | 0.30/0.33 (0.31) | 5.99/6.69 (9.59) | 5.63/7.00 (6.49) |
| target | 72.75/79.20 (100.99) | 26.33/26.89 (29.98) | 67.86/68.62 (85.18) | 19.70/19.88 (22.78) | 30.01/30.90 (40.84) | 145.95/149.03 (165.37) |
| stress | 629.61/658.51 (864.62) | 130.19/137.31 (165.37) | 289.36/299.02 (331.61) | 86.41/90.02 (90.89) | 100.85/101.77 (153.95) | 918.12/1019.76 (1004.98) |
| adverse | 348.74/360.79 (428.45) | 345.91/357.40 (465.77) | 1328.86/1339.51 (1443.15) | 412.74/423.01 (420.27) | 26.30/28.23 (39.51) | 2135.18/2168.46 (2226.01) |
| target-singleCapture | 37.12/37.49 (49.22) | 27.99/28.80 (34.03) | 76.43/78.50 (93.84) | 21.30/22.21 (24.40) | 33.06/33.75 (50.96) | 156.84/162.24 (176.19) |
| target-simpleRationals | 62.01/63.22 (79.41) | 25.22/26.95 (38.20) | 55.56/55.81 (71.22) | 10.73/11.73 (13.85) | 35.68/36.65 (56.65) | 140.37/148.98 (162.52) |
| target-manyPartitions | 140.14/144.32 (182.78) | 95.25/100.04 (119.30) | 81.47/85.44 (100.28) | 23.42/24.44 (26.73) | 32.93/33.67 (51.43) | 189.85/195.87 (211.41) |

Mémoire MiB : croissance maximale heap observée par run ; delta heap médian/max
après retour et GC ; RSS maximal du processus aux points observés. Total wall =
somme des six étapes par sample, puis médiane/max (hors digest/JSON/release).

| Cas | Total wall médiane/max ms | Heap croissance max | Heap après release médiane/max | RSS max observé |
| --- | ---: | ---: | ---: | ---: |
| small | 18.48/21.40 | 34.62 | 0.068/0.095 | 125.80 |
| target | 363.06/370.20 | 152.43 | 0.129/0.192 | 442.72 |
| stress | 2164.56/2270.21 | 1136.61 | 0.012/0.037 | 2102.73 |
| adverse | 4598.46/4639.46 | 779.98 | 0.049/0.112 | 1750.42 |
| target-singleCapture | 353.53/358.89 | 120.24 | 0.138/0.189 | 1242.70 |
| target-simpleRationals | 330.95/337.07 | 98.05 | 0.123/0.181 | 1048.94 |
| target-manyPartitions | 563.95/577.32 | 174.45 | 0.145/0.163 | 1074.80 |

Le stress lit un corpus de **264,33 MiB** (100 captures) et observe plus de
**1,1 GiB de croissance heap**, avec RSS dépassant **2 GiB**. Le cas adverse
produit 584 000 contributions hors horizon et un DTO de 129,62 MiB : son moteur
médian coûte 26,30 ms, contre 1 328,86 ms pour reconstruction et 2 135,18 ms
pour extraction. L’augmentation est surtout en amont/aval du moteur.
Les deltas heap après release restent faibles sur ces dix samples, sans
certification des cycles UI futurs. Les variations sont exécutées dans l’ordre
du fichier ; le RSS des cas tardifs hérite du high-water runtime des stress.
Les différences modestes entre variations ne sont pas des budgets garanties.

Limites : wall et CPU diffèrent (GC et travail runtime multithread inclus dans
CPU process). La médiane est celle des dix runs, p95 nearest-rank = max pour
n=10. Les distributions brutes sont conservées. Le heap aux frontières et au
point live est un **maximum observé inférieur au pic absolu**, les opérations
synchrones ne permettent pas un sampling JS interne. RSS est une observation
de processus, non l'attribution exacte de chaque objet ; sa rétention inclut
les arenas V8, pas seulement des objets accessibles. Un GC n'oblige pas V8 à
rendre les pages à l'OS. Delta heap après retour/GC peut être négatif et ne
constitue pas une preuve de fuite ni d'absence de fuite sous UI répétée.
Le corpus strings, les résultats statistiques et le runtime restent retenus
volontairement ; ils sont inclus dans la baseline mémoire de chaque itération.

Étapes : `readDecode` inclut IO filesystem/parse corpus et strict decode
Current ; `resolveValidateCopy` inclut copie inputs, encodage Current et strict
decode historique (non séparables dans la fonction existante) ; reconstruction
Actuals seule ; PlanningInput avec occupation/connaissance ; moteur seul ;
canonicalisation/extraction. Cette dernière reconstruit occupation/connaissance
pour l'extraction et produit des demandes denses R×T×D. Les strings de digest/
JSON final sont hors timings d'étapes mais incluses dans la mesure live mémoire.
Le DTO de preuve exhaustif n'est pas un futur payload UI optimal.

Les coûts augmentent avec P×K×jours Actuals pour les contributions, T×D pour
capacités, et R×T×D pour demandes nommées denses ; les versions×partitions×K
augmentent surtout decode/résolution. Les tailles small/target/stress changent
plusieurs axes ensemble : ce sont des enveloppes, pas une attribution causale
isolée à Teams ou Projects. Les variations à target contrôlent S et la complexité
rationnelle à structure identique (les valeurs de consommation changent aussi) ; partitions32 conserve jours/participants mais change la subdivision
et les sommes par période, donc ne représente pas le même état métier.

Aucun budget définitif CPU/RAM n'est fixé. Le coût de copie du Current entier,
les résultats denses et les Actuals hors horizon sont des risques concrets de
pic mémoire. Un dépassement exploratoire appelle réduction des coexistences,
extraction ciblée et admission mesurée ; il ne rejette pas automatiquement
inputs-only. Ni cache, worker, copies inter-processus ni UI ne sont certifiés.

## Gates exécutés et suivi

| Gate | Résultat de cette livraison |
| --- | --- |
| `npm run typecheck` | PASS, exit0. |
| `npm test` | PASS, compte final indiqué ci-dessous, aucun skip. |
| `npm run build` | PASS, exit0 ; aucun module de preuve livré dans dist. |
| `npm run test:portable` | PASS, 3/3 tests. |
| `npm run test:storage` | Première tentative exit1 : sandbox `listen EPERM 127.0.0.1`. Relance autorisée PASS exit0, Edge154.0.4258.53, 15 assertions repository, UI/History/cycles, blocked upgrade, desktop/narrow light/dark. |
| Limite storage quota | Override accepté mais quota physique non imposé par Chromium (`physicalQuotaEnforced:false`) ; injection native QuotaExceededError atomique PASS. Pas de certification physique quota. |
| Suite G1 ciblée | PASS, compte final indiqué ci-dessous. |
| Runner de preuve | PASS, 26 couples, 260 répétitions et 3 processus frais. |
| Harness CPU/RAM | PASS, 7 cas, 2 warmups + 10 samples/cas ; déterminisme de chaque run. |
| `git diff --check` | PASS avant commit. |

**49 tests ajoutés et passants**, 1 104/1 104 tests globaux, 96 suites, zéro skip.
La baseline comptait 1 055 tests ; aucune suite existante modifiée.

Les échecs intermédiaires de nouvelles assertions ont été corrigés dans la
preuve : permutation d'exceptions non canonique classée comme refus ; message
réel du doublon documenté ; fixture surcharge placée un jour ouvré (Reservations
ne demandent rien un jour hors working pattern, même avec exception capacité).
Aucun validateur ou moteur n'a été modifié pour faire passer ces cas.

## Risques et contrats transmis aux lots suivants

**11D.4 — NOT STARTED, transfert des limites résiduelles, après autorisation** : extraire le pipeline commun sans VM, maintenir
occupation et knowledge historiques totales, résultat canonique complet et
identité de chaîne sémantique. Resolver ciblé sur contexte/génération cohérente,
préfixe exact et manifest contenu ; éviter encode-all Current quand possible.
Transporter DTO rationnels (Domain opaque/WeakMap ne se clone pas naïvement).
Mesurer copies, queue/concurrence et release worker ; estimer contributions
hors horizon/préfixes/lookahead avant allocation. Réduire extraction dense et
structures coexistantes ; aucune admission chiffrée définitive déduite de ce
seul laboratoire. Distinguer résultat incomplet et recalcul indisponible.

**11D.3 — NOT STARTED, après autorisation** : union legacy/inputs-only fermée, anciens bytes
préservés, sources V5 exactes et evidence V4 authority conservées ; pas de
« latest », downgrade lossless ou refus. Consolider fermeture dans génération,
CAS/receipts/import-export/readback et diagnostics étape/cause ; ne pas supprimer
les protections owned ou introduire GC sans contrat. Un nouveau format n'est
ni numéroté ni activé par ce rapport.

**11D.5 — NOT STARTED, après autorisation** : Planning présentera un seul planning Current ou
historique ; Trends comparera des états, Current inclus. Les résultats métier
sont indépendants de l'interface. Découverte/facts/runs progressive et états
indisponibles explicites ; arbitrer le cap global avant intégration. Mesurer UI,
réactivité Current et 100 cycles release ; aucune sélection Planning, renommage
History, comparaison avancée ou ViewModel historique n'est livrée ici.

G1 est accepté après audit favorable et autorisation explicite avec ses limites : compatibilité universelle,
pic absolu, ressources extrêmes, performance intégrée et taxonomy production
restent non certifiés. Aucun gap d'input moteur bloquant n'est observé sur les
cas exécutés. **Statut final : 11D.2 DONE, G1 seulement.**
G2–G5 restent à démontrer ; ce transfert ne commence pas 11D.4 ni les autres
lots suivants. Les limites ne sont pas levées par la clôture documentaire.


## Inventaire de livraison

- `src/proof/lot11d2/inputs.fixture.ts`
- `src/proof/lot11d2/replay.fixture.ts`
- `src/proof/lot11d2/resourceRisk.fixture.ts`
- `src/proof/lot11d2/replay.test.ts`
- `scripts/prove-lot11d2.mjs`
- `scripts/characterize-lot11d2.mjs`
- `docs/steps/STORAGE/lot11d2_proof_results.json`
- `docs/steps/STORAGE/lot11d2_measurements.json`
- `docs/steps/STORAGE/lot11d2_feasibility.md`
- `docs/steps/STORAGE/lot11d2_plan.md`
- `docs/current_plan.md`

Aucun écart de périmètre. Déviations de mesure explicites : lecture filesystem
au lieu d'IDB, pic absolu non observable, extraction exhaustive de preuve,
cas hostile estimé non exécuté, aucune classification d'erreur de production
ajoutée. Le service définitif devra être évalué séparément.
