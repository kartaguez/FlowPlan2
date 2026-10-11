# R1.2-PERF-P1 — rapport de réalisation

P1 est techniquement conforme aux décisions A-P1-01 B / A-P1-02–04.
La performance globale reste **C** : M5 dense prend 24,49 s de médiane et
M3 dense 20,79 s. Le moyen sparse progresse nettement (M5 4,08→1,47 s), mais
la compatibilité de chargement avec R1.3 n’est pas établie. Audit indépendant
requis ; R1.2 IN REVIEW, R1.3/R1.4/R2 NOT STARTED. Aucun P2/P3 réalisé.

## Baseline, périmètre et API

SHA initial obligatoire : `f9440517d176d93e3089a8b7cf34da86f36f5f18`.
Branche `rewrite/portfolio-versioned`, HEAD/origin exacts après fetch, divergence
0/0 et arbre propre avant production. Aucun concurrent détecté. SHA final dans
le compte rendu de livraison (pas d’auto-référence dans un fichier committé).
Les anciens SHAs du plan documentaire ne sont pas l’oracle de cette mission.

Fichiers de production modifiés uniquement :
`domain/versioning/versionRegistry.ts`, `domain/portfolio/graphResolver.ts`,
`domain/portfolio/manifest.ts`, `application/portfolio/loadPortfolioGraph.ts`,
`adapters/memory/memoryPortfolioReadAdapter.ts`, sous src-v2.
Suite pérenne : `application/portfolio/r12.test.ts`. Documents : plan P1,
canon R1.2, current_plan/current_canon et nouvelles preuves sous ce répertoire.
Les preuves antérieures, scripts de benchmark/gardes, configs/packages, ports,
R1.1/factories de validation, grille TA et certificat opaque restent inchangés.

```ts
lookupExactBatch(registry: VersionRegistry, inputs: readonly unknown[]):
  Readonly<{ result: DomainResult<readonly BusinessVersion[]>;
             failedIndex: number | null }>
```

Une table temporaire native par opération, projections structurées validées de
localVersionTables, aucune concaténation de clé. Ordre et répétitions conservés,
validation individuelle avant recherche, arrêt au premier échec avec diagnostic
lookupExact inchangé et ordinal séparé. Wrapper/liste gelés ; versions déjà
copiées et profondément gelées par factory. lookupExact unitaire inchangé.
VersionRegistry reste structurel, aucune autorité runtime/brand/WeakMap.

Resolver : factory manifeste avant factory registre, lot exact puis inventaires
Settings et contexte not-established ; remapping `manifest.references.i`.
Collect : erreurs port puis registre complet prioritaires ; lot sur références
requises, missing avant cardinalité/extras, READ_REFERENCE_MISMATCH inchangé ;
répétitions identiques acceptées après déduplication registre et réponse **originale**
transmise à certification. Aucun mapping owner/collision déplacé en Application.
Adapter : factory au setup, un lot/table par lecture, ordre/multiplicité/ref
malformée ou absente conservés, Snapshot indépendant de Current, aucun index retenu.
Manifeste : tables locales d’identité, distinctes par table et après kind/ref
validés ; même format/12 tables/globals/copies/gel/ordre/index/messages, aucun tri
ni déduplication automatique. Coûts ciblés attendus O(V+R), unicité O(R), sans
promesse de pipeline entier linéaire ni optimisation des validations/copies.

## Oracle et vérifications

[Protocole/commandes](./README.md), [différentiel complet](./differential.log),
[oracle initial figé](./oracle-freeze.log), [oracle isolé](./isolated-oracle.log).
563 cas P0 puis 896 cas figés **avant production**. Extension ultérieure :
941 cas, zéro divergence en clones/processus isolés sur vrais modules.
Le helper est comparé aux vrais lookupExact séquentiels P0 arrêtés au premier
échec. Toutes réponses publiques complètes sont archivées : codes/paths/messages/
ordre, versions/owners/payloads/liens/provenance/missing, inventaires/contexte,
resolver/certification/readers et Snapshot autonome/Current divergent.
Transport BigInt typé exact, records sans ordre significatif, listes ordonnées.
Tests runtime de copie/gel/mutation indépendants du transport JSON.

15 tests pérennes ajoutés, aucun retrait de couverture : lots 900 versions
permutés/répétés/adversariaux, missing/malformed/priorité, sortie profondément
immutable et mutations d’entrée, 12 tables longues/kinds/index, réponses port
répétées conservées jusqu’au contexte certifié, registre prioritaire et missing
avant extra. Autres scénarios requis (tombstones/TA/PTEC/unknown/désérialisé/
Snapshot historique/Current divergent/collisions/branches) réexécutés dans suites
existantes et/ou corpus différentiel final, sans remplacer leurs tests.

| Commande réellement réexécutée | Résultat |
| --- | --- |
| npm run test:v2 | 189/189, fail/skipped/todo/cancelled 0 |
| R1.1 primitives/enveloppes + scripts/v2/r11.test.mjs | 32/32, A01–03/P0 inclus |
| R1.2 r12.test + scripts/v2/r12.test.mjs | 118/118, G12-01–13/P0/P1/canaris inclus |
| CivilDate TZ=UTC / Europe/Paris / America/New_York, processus séparés | 4/4 chacun, 12 réexécutions supplémentaires |
| npm run check:boundaries:v2 | PASS |
| npm run typecheck:v2 | PASS |
| npm run build:v2 | PASS |
| scripts/benchmarks/r12-perf/verify.mjs | 3 variantes PASS, distinct des gates |

Résultats historiques R1.1/R1.2/P0 conservés et non présentés comme réexécutions.
Préparation : accès calculé refusé par garde puis remplacé par `.at`, erreurs de
typage et assertion incorrecte de test sur contexte répétition corrigées avant
PASS ; aucune divergence de production/oracle ni assouplissement des gardes.

## Campagne contemporaine P0/P1

Apple M4, 10 CPU, 16 Gio, Darwin 27 arm64, Node 24.21.0, npm 11.19.0,
TypeScript 5.9.3. Même matériel/environnement, clones séparés, un seul benchmark
actif ; pas de test/compilation/oracle simultané aux mesures. Charge OS non
réservée (load ≈2,34 au cours du rejeu P0), autres applications non contrôlées.
Outils/fixtures inchangés, seed 1202 ; hashes égaux P0 historique/rejeu/P1,
[fixtures/volumes/hashes](./fixtures.json), [hashes outils](./tools-hashes.txt).
P0 replay au SHA imposé ; P1 HEAD de laboratoire dans [candidate-git](./candidate-git.txt).
[source-hashes](./source-hashes.json) et [patch](./p1.patch) prouvent identité
avec sources de livraison ; productionDiff vide dans les deux JSON.

Petit sparse/dense/historique puis moyen sparse/dense, M1–M6, un enfant neuf
par scénario/API, cold + warm-up + 3 mesures, old-space 1024 Mio, 30 s par phase.
Setup adapter séparé/exclu API, cold M5/M6 bénéficie des chemins chauffés par setup.
29 API/scénarios exécutables ; M6 historique NOT_EXECUTED (Current null).
P0 : 24 terminés + 5 timeouts cold dense (M2–M6). P1 : 29 terminés,
aucune interruption ni erreur/DomainResult refusé. Grandes fixtures NOT_EXECUTED :
les latences denses restent élevées ; aucune activation automatique.
Les timeouts P0 ne donnent aucune durée réelle ni ratio extrapolé.

JSON bruts : [P0](./p0-replay.json), [P1](./p1-measures.json).
Statistiques complètes (médiane/min/max/SD/IQR, CPU, heap/deltas/GC, RSS,
setup/interruptions) : [P0 summary](./p0-summary.json), [P1 summary](./p1-summary.json),
[comparaison structurée](./comparison.json). Les tables suivantes donnent chaque
scénario/API ; tous temps en ms, mémoire en MiB.

### P0 rejoué

| Scenario | API | cold ms | median ms [min–max] | SD ms | heap endpoints MiB | RSS lifetime MiB | status |
|---|---|---:|---:|---:|---:|---:|---|
| small/sparse | M1 | 31.8 | 27.3 [26.9–28.3] | 0.6 | 18.2 | 96.2 | COMPLETED |
| small/sparse | M2 | 38.4 | 34.0 [33.9–35.0] | 0.5 | 22.8 | 97.2 | COMPLETED |
| small/sparse | M3 | 40.8 | 37.7 [37.5–38.6] | 0.5 | 17.2 | 96.4 | COMPLETED |
| small/sparse | M4 | 44.0 | 38.7 [38.4–39.8] | 0.6 | 23.2 | 97.3 | COMPLETED |
| small/sparse | M5 | 74.7 | 71.7 [71.2–74.0] | 1.2 | 20.0 | 129.9 | COMPLETED |
| small/sparse | M6 | 71.0 | 69.9 [68.5–71.1] | 1.1 | 35.3 | 130.1 | COMPLETED |
| small/dense | M1 | 55.0 | 48.6 [48.4–49.9] | 0.7 | 24.5 | 100.0 | COMPLETED |
| small/dense | M2 | 74.0 | 66.5 [65.8–67.1] | 0.5 | 38.6 | 116.3 | COMPLETED |
| small/dense | M3 | 80.5 | 74.2 [73.6–75.6] | 0.9 | 26.3 | 133.7 | COMPLETED |
| small/dense | M4 | 88.1 | 78.3 [78.2–80.1] | 0.9 | 37.6 | 132.7 | COMPLETED |
| small/dense | M5 | 151.1 | 149.6 [149.4–151.4] | 0.9 | 21.4 | 137.3 | COMPLETED |
| small/dense | M6 | 144.8 | 142.6 [142.5–144.3] | 0.8 | 37.4 | 136.9 | COMPLETED |
| small/history | M1 | 31.0 | 26.8 [26.7–28.0] | 0.6 | 15.7 | 89.6 | COMPLETED |
| small/history | M2 | 38.3 | 34.3 [34.3–35.0] | 0.4 | 19.8 | 97.4 | COMPLETED |
| small/history | M3 | 40.5 | 35.8 [35.2–35.9] | 0.3 | 21.9 | 97.5 | COMPLETED |
| small/history | M4 | 49.8 | 38.3 [37.8–38.4] | 0.3 | 12.4 | 96.2 | COMPLETED |
| small/history | M5 | 72.5 | 70.6 [70.1–73.9] | 1.7 | 21.5 | 114.5 | COMPLETED |
| small/history | M6 | — | — | — | — | — | NOT_EXECUTED |
| medium/sparse | M1 | 473.6 | 450.8 [447.3–456.2] | 3.7 | 65.9 | 258.2 | COMPLETED |
| medium/sparse | M2 | 1469.1 | 1440.4 [1419.2–1441.4] | 10.2 | 93.7 | 264.1 | COMPLETED |
| medium/sparse | M3 | 1868.9 | 1850.2 [1844.9–1855.7] | 4.4 | 97.1 | 267.7 | COMPLETED |
| medium/sparse | M4 | 2064.2 | 1997.8 [1988.5–2001.0] | 5.3 | 91.0 | 265.8 | COMPLETED |
| medium/sparse | M5 | 4015.5 | 4078.9 [4063.5–4081.2] | 7.8 | 74.2 | 296.9 | COMPLETED |
| medium/sparse | M6 | 3953.1 | 3970.7 [3951.4–4005.6] | 22.4 | 85.0 | 298.0 | COMPLETED |
| medium/dense | M1 | 2897.8 | 2811.6 [2807.6–2824.0] | 7.0 | 331.7 | 485.7 | COMPLETED |
| medium/dense | M2 | — | — | — | — | — | INTERRUPTED_TIMEOUT (cold ≥30003.0 ms) |
| medium/dense | M3 | — | — | — | — | — | INTERRUPTED_TIMEOUT (cold ≥30003.0 ms) |
| medium/dense | M4 | — | — | — | — | — | INTERRUPTED_TIMEOUT (cold ≥30001.0 ms) |
| medium/dense | M5 | — | — | — | — | — | INTERRUPTED_TIMEOUT (cold ≥30002.0 ms) |
| medium/dense | M6 | — | — | — | — | — | INTERRUPTED_TIMEOUT (cold ≥30002.0 ms) |

### P1

| Scenario | API | cold ms | median ms [min–max] | SD ms | heap endpoints MiB | RSS lifetime MiB | status |
|---|---|---:|---:|---:|---:|---:|---|
| small/sparse | M1 | 31.8 | 27.5 [27.5–29.5] | 1.0 | 11.1 | 96.6 | COMPLETED |
| small/sparse | M2 | 36.8 | 32.4 [31.9–33.3] | 0.6 | 12.7 | 96.6 | COMPLETED |
| small/sparse | M3 | 39.8 | 37.6 [34.9–38.0] | 1.4 | 14.7 | 96.0 | COMPLETED |
| small/sparse | M4 | 42.5 | 36.4 [36.4–38.0] | 0.8 | 17.2 | 95.8 | COMPLETED |
| small/sparse | M5 | 69.2 | 67.5 [67.0–69.9] | 1.2 | 20.4 | 130.9 | COMPLETED |
| small/sparse | M6 | 67.6 | 66.9 [64.5–67.2] | 1.2 | 20.2 | 129.1 | COMPLETED |
| small/dense | M1 | 55.6 | 49.0 [48.7–50.7] | 0.9 | 24.6 | 99.8 | COMPLETED |
| small/dense | M2 | 65.2 | 56.9 [56.9–58.0] | 0.5 | 39.4 | 117.6 | COMPLETED |
| small/dense | M3 | 72.2 | 63.9 [63.7–66.5] | 1.3 | 27.1 | 133.5 | COMPLETED |
| small/dense | M4 | 78.5 | 68.9 [66.4–69.2] | 1.3 | 38.6 | 133.7 | COMPLETED |
| small/dense | M5 | 126.1 | 123.6 [121.6–126.3] | 1.9 | 62.9 | 188.7 | COMPLETED |
| small/dense | M6 | 121.4 | 117.3 [117.2–119.2] | 0.9 | 36.3 | 170.6 | COMPLETED |
| small/history | M1 | 31.3 | 27.3 [27.1–28.3] | 0.6 | 15.6 | 96.5 | COMPLETED |
| small/history | M2 | 36.2 | 32.2 [31.4–32.6] | 0.5 | 20.8 | 97.3 | COMPLETED |
| small/history | M3 | 40.3 | 33.7 [33.4–34.2] | 0.3 | 23.0 | 97.2 | COMPLETED |
| small/history | M4 | 41.9 | 35.9 [34.8–36.5] | 0.7 | 14.4 | 97.1 | COMPLETED |
| small/history | M5 | 66.7 | 63.7 [63.5–65.9] | 1.1 | 27.5 | 128.9 | COMPLETED |
| small/history | M6 | — | — | — | — | — | NOT_EXECUTED |
| medium/sparse | M1 | 481.7 | 443.6 [443.1–443.8] | 0.3 | 67.0 | 260.0 | COMPLETED |
| medium/sparse | M2 | 551.7 | 519.0 [515.0–521.1] | 2.5 | 103.9 | 262.9 | COMPLETED |
| medium/sparse | M3 | 952.8 | 915.1 [912.3–916.7] | 1.8 | 104.3 | 266.3 | COMPLETED |
| medium/sparse | M4 | 988.0 | 944.6 [943.3–951.7] | 3.7 | 94.0 | 267.3 | COMPLETED |
| medium/sparse | M5 | 1467.6 | 1471.7 [1469.8–1484.0] | 6.3 | 91.0 | 311.3 | COMPLETED |
| medium/sparse | M6 | 1443.3 | 1433.0 [1432.0–1435.7] | 1.6 | 130.9 | 311.1 | COMPLETED |
| medium/dense | M1 | 2917.3 | 2832.2 [2827.2–2840.5] | 5.5 | 331.6 | 519.4 | COMPLETED |
| medium/dense | M2 | 3348.0 | 3317.7 [3302.8–3318.9] | 7.3 | 340.4 | 533.3 | COMPLETED |
| medium/dense | M3 | 21963.6 | 20792.1 [20703.5–20907.4] | 83.5 | 387.9 | 550.9 | COMPLETED |
| medium/dense | M4 | 22386.0 | 21128.2 [21090.5–21223.0] | 55.7 | 412.9 | 568.0 | COMPLETED |
| medium/dense | M5 | 25296.9 | 24489.0 [24409.2–25530.1] | 510.6 | 426.5 | 647.4 | COMPLETED |
| medium/dense | M6 | 25080.7 | 23852.8 [23829.4–23894.7] | 27.0 | 394.6 | 650.5 | COMPLETED |

### Warm-up, CPU et setup séparé

| Scénario | API | warm-up P0/P1 | CPU médian P0/P1 | setup P0/P1 | IQR P0/P1 |
| --- | --- | --- | --- | --- | --- |
| small/sparse | M1 | 28.5/28.8 | 38.0/38.3 | —/— | 0.7/1.0 |
| small/sparse | M2 | 35.9/33.3 | 46.3/43.3 | —/— | 0.5/0.7 |
| small/sparse | M3 | 38.1/37.1 | 52.2/51.8 | —/— | 0.5/1.5 |
| small/sparse | M4 | 39.9/38.0 | 52.5/48.8 | —/— | 0.7/0.8 |
| small/sparse | M5 | 73.0/67.6 | 88.3/84.5 | 41.2/38.7 | 1.4/1.4 |
| small/sparse | M6 | 73.7/66.9 | 85.9/82.8 | 38.8/39.2 | 1.3/1.3 |
| small/dense | M1 | 49.1/49.6 | 59.7/60.5 | —/— | 0.8/1.0 |
| small/dense | M2 | 67.6/59.5 | 80.4/70.4 | —/— | 0.6/0.6 |
| small/dense | M3 | 75.3/67.1 | 89.6/80.0 | —/— | 1.0/1.4 |
| small/dense | M4 | 81.6/73.6 | 93.5/85.1 | —/— | 0.9/1.4 |
| small/dense | M5 | 151.7/125.5 | 178.7/144.2 | 69.3/67.2 | 1.0/2.4 |
| small/dense | M6 | 146.1/120.8 | 172.8/138.6 | 69.3/68.4 | 0.9/1.0 |
| small/history | M1 | 27.5/28.4 | 37.4/38.1 | —/— | 0.7/0.6 |
| small/history | M2 | 36.0/33.3 | 47.7/43.0 | —/— | 0.4/0.6 |
| small/history | M3 | 36.9/35.0 | 48.0/45.9 | —/— | 0.3/0.4 |
| small/history | M4 | 40.4/36.8 | 52.0/48.2 | —/— | 0.3/0.9 |
| small/history | M5 | 71.4/65.8 | 86.2/77.7 | 35.7/36.6 | 1.9/1.2 |
| small/history | M6 | —/— | —/— | —/— | —/— |
| medium/sparse | M1 | 456.3/448.2 | 500.5/494.4 | —/— | 4.5/0.3 |
| medium/sparse | M2 | 1453.1/521.2 | 1504.3/591.5 | —/— | 11.1/3.1 |
| medium/sparse | M3 | 1847.9/925.0 | 1940.2/1002.8 | —/— | 5.4/2.2 |
| medium/sparse | M4 | 1989.1/953.6 | 2078.4/1031.5 | —/— | 6.3/4.2 |
| medium/sparse | M5 | 4115.7/1471.2 | 4230.7/1633.3 | 760.8/586.9 | 8.8/7.1 |
| medium/sparse | M6 | 3952.2/1433.9 | 4120.6/1599.2 | 761.8/578.6 | 27.1/1.9 |
| medium/dense | M1 | 2807.0/2842.6 | 3163.0/3189.6 | —/— | 8.2/6.6 |
| medium/dense | M2 | —/3319.1 | —/3807.3 | —/— | —/8.1 |
| medium/dense | M3 | —/20747.1 | —/21328.2 | —/— | —/101.9 |
| medium/dense | M4 | —/21118.1 | —/21686.6 | —/— | —/66.2 |
| medium/dense | M5 | —/24563.5 | —/25704.7 | 13706.7/3563.2 | —/560.5 |
| medium/dense | M6 | —/23867.7 | —/25024.7 | 13800.7/3582.4 | —/32.6 |

## Mémoire et limites

M5 sparse P1 : heap endpoints 91,0 MiB, maxRSS vie entière 311,3 MiB
(P0 74,2 / 296,9). M5 dense P1 : 426,5 / 647,4 MiB.
Setup M5 sparse 586,9 ms (P0 760,8), dense 3563,2 ms (P0 13706,7),
exclus des temps API. CPU médian M5 sparse 1633,3 ms, dense 25704,7 ms ;
CPU processus user+system, pouvant inclure threads runtime/GC. Heap après
relâchement et GC, médiane M5 sparse 24,2 MiB et dense 131,8 MiB (non preuve
de libération exhaustive). M6 dense maxRSS
650,5 MiB. Aucune OOM ni protection mémoire déclenchée. Allocations locales
supplémentaires visibles possibles ; les différences endpoints/JIT/GC ne sont
pas la taille exclusive des tables. Mémoire compatible avec cette campagne
synthétique sur 16 Gio, sans qualification petits matériels/Windows/UI/persistance.
Les endpoints sont bornes basses du pic heap ; maxRSS comprend fixture/setup.
Le GC après relâchement ne prouve pas l’absence de fuite ou de références
transitoires. Le polling externe RSS est indisponible (EPERM consigné dans
les JSON) ; aucun pic intra-appel fiable ni métrique mémoire API P0 interrompue
n’est inventé. CPU user+system et mémoires après GC/deltas dans les summaries.

## Profils CPU et postes séparés

Profils réexécutés en campagnes séparées : P0 M3/M5 sparse, P1 M3/M5
sparse puis dense ; cold/warm-up/une mesure profilée, Inspector cible 1 ms,
même limite 30 s/phase et 1024 Mio. Tous terminés, aucun profil interrompu.
Temps profilés exclus des médianes précédentes.
[P0 CPU](./p0-cpu-summary.json), [P1 CPU](./p1-cpu-summary.json),
[attribution par poste](./profile-posts.json), [script de lecture](./profile-posts.mjs),
profils bruts dans `p0-cpu/` et `p1-cpu/`.

Six postes distingués par stacks échantillonnées. Les helper calls sont séparés
selon ancêtre resolver/collect/reader mémoire. Pour P0, correspondance comprend
callback de membership ou self de collect lorsque JIT inline ; cela inclut son
faible overhead propre, pas une durée exclusive instrumentée. Registry/manifest
sont inclusifs et peuvent se recouvrir avec d’autres postes/constructions.
Sampling/JIT/GC et parents async limitent l’attribution, zéro sample ne prouve
pas zéro coût. Les colonnes ne s’additionnent pas et ne sont pas des timings de
sous-phases déduits par soustraction M3−M2 ou M5−M4.

| Profil | durée échantillonnée ms | registre % | manifeste % | lookup resolver % | correspondance port % | lookup mémoire % | grille TA % |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p0-cpu/medium-sparse-M3 | 1874.8 | 23.14 | 7.56 | 44.35 | 0.00 | 0.00 | 14.29 |
| p0-cpu/medium-sparse-M5 | 4156.8 | 20.41 | 9.19 | 18.33 | 18.72 | 20.60 | 5.87 |
| p1-cpu/medium-dense-M3 | 20858.8 | 12.91 | 1.23 | 0.89 | 0.00 | 0.00 | 75.01 |
| p1-cpu/medium-dense-M5 | 24624.3 | 21.99 | 3.05 | 0.74 | 0.74 | 0.75 | 63.12 |
| p1-cpu/medium-sparse-M3 | 920.0 | 46.40 | 4.43 | 3.09 | 0.00 | 0.00 | 28.92 |
| p1-cpu/medium-sparse-M5 | 1488.5 | 56.42 | 7.68 | 1.92 | 1.92 | 2.02 | 17.08 |

La ligne JS compilée 120 de graphValidation (TS ligne 87) correspond exactement
à `expectedCells.some` contenant `actuals.filter(sameIdentity...)`, inchangée.
Grille P1 dense : M3 **75,01 %**, M5 **63,12 %** inclusifs ; c’est le goulet
dominant observé. Lookup lot M3 dense 0,89 % ; M5 dense, environ 0,74–0,75 %
par contexte. Sparse : le registre reste le poste inclusif principal (46,40 %
M3 / 56,42 % M5), avec copies/validation/context existants. Ces coûts ne sont
pas autorisés à être réduits en P3 pendant cette livraison.

**Diagnostic P2 proposé, sans réalisation :** auditer le membership/unicité de
la grille TA et les scans structurels dans un lot distinct, en conservant
fermeture des cellules, owners PT/RT/SubPeriod, tombstones, priorité/ordre/path
des erreurs et immutabilité. Reprendre le même oracle P0/P1, ajouter multidéfauts
grille et comparer les profils avant toute décision. Aucun design ni GO P2
considéré acquis ; aucune modification de graphValidation livrée.


## Deux verdicts indépendants

**Conformité technique P1 : PASS pour cette livraison, sous audit indépendant.**
Contrats existants inchangés (seule addition helper approuvée), oracle complet
identique, quatre scans quadratiques ciblés éliminés, tests/gates/frontières
PASS, tables locales temporaires, aucune autorité/certification/cache ajouté.
Précondition factory conservée à chacun des trois usages de production.

**Performance globale : C maintenue, acceptabilité non établie.**
Moyen sparse désormais nettement plus exploitable dans le laboratoire : M3
≈0,915 s, M5 ≈1,472 s ; pas de SLA ni qualification UI. Moyen dense termine
mais n’est pas raisonnablement maîtrisé pour chargement interactif : M3 ≈20,79 s,
M5 ≈24,49 s, CPU processus de même ordre que les temps elapsed (threads runtime/GC inclus). Snapshot sparse est encourageant,
Snapshot dense ne permet pas de déclarer compatibilité avec poursuite R1.3.
Même le succès sous 30 s ne suffit pas. Mémoire observée sous protections,
sans qualification générale. A/B non retenus : un goulet important reste.
A-P1-05 demeure à apprécier par audit puis décision utilisateur ; aucun GO déduit.
Diagnostic P2 proposé seulement, jamais réalisé ; P3 inchangé/interdit.
R1.2 reste IN REVIEW ; R1.3/R1.4/R2 NOT STARTED.

## Rollback et livraison Git

[Rollback réel](./rollback.log) : clone jetable du candidat, snapshot documentation/
preuves, puis trois reverts normaux (snapshot, ajout tests, implémentation).
Tree restauré `40faccee4fb5ba51eaf3ac698a03f047be751ccd`, identique au tree
complet de la baseline imposée ; diff baseline→HEAD vide. 174/174 tests baseline,
frontières/typecheck/build PASS. Symlink de dépendances supprimé après checks,
arbre du clone propre. Ce snapshot exclut son propre journal et les mises à jour
finales de restitution ; il teste le retour des sources/documents/preuves au
tree baseline sans reset/force ni modification du dépôt de livraison.
Diff complet et périmètre contrôlés, diff-check, commit/push normaux sans force,
HEAD local/distant et arbre propre contrôlés après livraison et rapportés dans le compte rendu final. Aucun travail
concurrent écrasé ; arrêt impératif après vérification du commit/push.
