# R1.2-PERF-P3-A1 — réalisation de la pile locale d'ancêtres

Baseline de livraison : `4186efc065a8d75de58cc9a2a685c9ef40641bc5`.
Baseline réelle de comparaison : `d2ebb7142c563a43b620cd78fea63f2847d76c02`.
Production identique entre ces deux SHAs. Préflight propre, fetch réussi,
branche rewrite/portfolio-versioned, divergence initiale 0/0, aucun concurrent.
Mission explicite limitée à la première cible A. Aucun B/C, optimisation des
records/descripteurs, égalité, registre ou frontière de confiance.

## Algorithme livré

Seule production modifiée : `src-v2/domain/versioning/immutableValue.ts`.
Un tableau mutable d'ancêtres créé dans la closure de chaque appel public.
Primitives et nombres contrôlés comme avant ; objet déjà présent dans la branche
refusé avant ajout. `push(value)` à l'entrée de l'objet, corps du parcours dans
`try`, `pop()` dans `finally` pour succès, refus et exceptions de réflexion.
Le tableau n'est ni exposé ni retenu entre appels. La fonction récursive privée
ne transporte plus un tableau immuable nouvellement étendu à chaque niveau.
Signature publique et tous les autres contrôles inchangés.

`dataRecord` reste avant toute récursion de record : un descripteur interdit
même tardif est prioritaire sur un enfant invalide antérieur. Pour les tableaux,
inspection du descripteur de l'élément puis récursion restent intercalées : un
enfant invalide précoce conserve sa priorité sur le descripteur d'un élément tardif.
La liste entière de versions reste copiée avant les validations métier.
Les objets partagés dans un DAG sont recopiés indépendamment après sortie de
leur première branche. Aucune mémoïsation par identité, aucun cache/flag/marque.
`dataRecord`, `equalImmutableValues`, factories, collect/certification, chargements,
provenance et filiation ne changent pas. Les unknown sont toujours contrôlés.

Gain analytique limité : pour N visites d'objets avec profondeurs dᵢ, suppression
N matérialisations de tableaux et Σdᵢ écritures d'ancêtres dues aux spreads.
Un seul tableau local ; sa capacité interne peut encore croître. Ancêtres actifs
O(D), mais `includes` reste une recherche O(D), et les parcours/inspection/copies
profondes/gel demeurent. Pas de promesse O(1), de pipeline linéaire ou de latence
avant mesures. Limites physiques de pile JavaScript inchangées ; profondeur 256
qualifiée par les tests, pas une nouvelle borne métier ni garantie sans limite.

## Équivalence et validation

[baseline-seal.json](./baseline-seal.json) fige avant production les 1 254 réponses
P2 et les 34 extensions de copie. Baseline isolée exacte, module candidat dans
second clone committé `1752f6ed0a9e5101d2f153201ac448c443c4659b`, compilations
et processus séparés. Archives historiques P2 égales aux nouvelles réponses.
[differential.json](./differential.json) : **1 288 réponses, zéro divergence**.
Toutes réponses publiques complètes conservées, métadonnées et sceau vérifiés,
aucune normalisation des diagnostics. Transport historique inchangé ; -0 explicite
pour l'extension. Incident de mémoire du comparateur consigné, lecture par flux
corrigée sans changer le corpus ni les assertions.

19 nouveaux tests pérennes dans immutableValue.test.ts : DAG siblings, direct/
indirect/dernier cycle, sortie réussie suivie d'objet partagé, appel après refus,
exception de réflexion, tableaux partagés, clés adversariales, prototypes,
getter tardif prioritaire, hidden descriptor, sparse/symboles, priorité tableau,
prototype nul, BigInt/nombres/-0, profondeur, mutations input/output, copie globale
registre. Runtime indépendant du JSON : références distinctes, gel récursif,
détachement, absence de mutation à l'échec, refus de mutation des sorties.
Un refus avorte historiquement tout l'appel public ; aucune poursuite après
refus dans la même récursion n'a été introduite pour fabriquer un test.

| Commande exécutée | Résultat |
| --- | --- |
| npm run test:v2 | 213/213 PASS, fail/skip/todo/cancel 0 |
| R1.1 primitives/enveloppes + r11.test.mjs | 32/32 PASS, audit A1–A7/P0 |
| R1.2 + r12.test.mjs | 123/123 PASS, G12-01–13 et P0/P1/P2 |
| Copie P3-A1 ciblée | 19/19 PASS |
| check:boundaries:v2 | PASS |
| typecheck:v2 | PASS |
| build:v2 | PASS |

Les ciblés sont des réexécutions, pas des tests supplémentaires. Aucun test
existant ni garde assoupli, aucun package/config/benchmark historique changé.
Les résultats de mesure et les verdicts figurent ci-dessous après analyse.

## Mesures officielles P2/A1

Apple M4, 10 CPU, RAM 16 Gio, Darwin 27 arm64, Node 24.21.0,
npm 11.19.0, TypeScript 5.9.3. Sources mesurées committées dans chacun des
clones, productionDiff vide ; source-hashes.json confirme identité à la livraison.
Ordre : P2 verify/petits/moyens/profils, validation/oracle candidat, A1 mêmes
phases, contrôles inversés A1 puis P2 moyens, A1 puis P2 petits. Aucun test,
oracle ou autre benchmark simultané aux mesures officielles. OS non réservé ;
charge/pression disponibles dans environment.log et environnements de chaque JSON,
pas de tâche lourde concurrente connue. OOM du comparateur hors campagnes :
incident documenté, raison supplémentaire de conserver contrôles inversés séparés.

Outils/fixtures historiques inchangés, graine 1202 et cinq métadonnées/hashes
strictement égaux aux fixtures P2 historiques, vérifiés pour chaque opération.
30 s par phase, old-space 1 Gio, cold, warm-up et trois répétitions ordinaires.
29 opérations terminées par version (58 au total), zéro timeout/refus/crash.
M6 historique NOT_EXECUTED, Current absent ; grands NOT_EXECUTED faute d'activation.
12 profils CPU séparés, tous obtenus ; 30 opérations de contrôles supplémentaires,
toutes terminées, jamais mélangées aux médianes initiales.

Les tableaux suivants reprennent les médianes ordinaires. min/max/SD/IQR, cold,
warm-up, CPU, heap et RSS pour chaque scénario : p2-summary.json/a1-summary.json,
p2-summary.md/a1-summary.md et JSON bruts. CPU user et system séparés avec
min/médiane/max/SD : cpu-user-system.json. Comparaison complète : comparison.json.
RSS polling 250 ms disponible dans cette campagne (pas d'EPERM constaté).
Heap endpoints ne sont pas des pics ; RSS lifetime inclut setup/fixture.

| Scénario | API | P2 médiane ms | A1 médiane ms | Variation | P2/A1 CPU ms | P2/A1 heap endpoint Mio | P2/A1 RSS lifetime Mio |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| small/sparse | M1 | 27.7 | 28.9 | 4.3 % | 38.4/41.1 | 11.1/22.5 | 96.6/89.0 |
| small/sparse | M2 | 31.9 | 31.9 | 0.1 % | 43.3/43.5 | 12.8/20.1 | 96.3/96.2 |
| small/sparse | M3 | 33.5 | 33.0 | -1.6 % | 45.2/44.6 | 15.0/22.3 | 96.1/96.5 |
| small/sparse | M4 | 35.6 | 35.0 | -1.6 % | 47.2/46.7 | 17.5/13.4 | 96.0/96.3 |
| small/sparse | M5 | 65.9 | 66.0 | 0.2 % | 78.6/78.8 | 20.4/17.2 | 129.3/130.5 |
| small/sparse | M6 | 62.6 | 61.9 | -1.1 % | 75.7/75.3 | 26.8/34.3 | 129.0/129.0 |
| small/dense | M1 | 49.2 | 49.2 | -0.0 % | 61.4/60.5 | 24.7/25.7 | 100.0/103.3 |
| small/dense | M2 | 57.2 | 57.0 | -0.2 % | 70.2/73.4 | 39.4/18.3 | 117.7/133.5 |
| small/dense | M3 | 60.1 | 61.2 | 1.8 % | 74.3/74.8 | 15.3/23.6 | 133.5/133.2 |
| small/dense | M4 | 65.1 | 63.6 | -2.3 % | 80.1/78.7 | 40.9/33.2 | 132.5/133.7 |
| small/dense | M5 | 122.0 | 122.3 | 0.2 % | 145.8/150.5 | 63.9/47.0 | 189.9/200.3 |
| small/dense | M6 | 113.0 | 113.2 | 0.1 % | 134.2/138.8 | 37.4/66.3 | 170.7/192.3 |
| small/history | M1 | 27.6 | 26.9 | -2.6 % | 38.6/37.7 | 15.6/19.8 | 89.3/93.1 |
| small/history | M2 | 32.3 | 31.6 | -2.3 % | 44.3/43.9 | 20.8/17.0 | 97.2/96.6 |
| small/history | M3 | 32.7 | 33.6 | 2.9 % | 44.9/46.7 | 23.7/19.4 | 96.3/96.0 |
| small/history | M4 | 34.5 | 34.4 | -0.2 % | 46.1/46.1 | 14.6/18.0 | 97.1/97.5 |
| small/history | M5 | 63.5 | 62.8 | -1.0 % | 76.8/76.7 | 27.7/34.9 | 129.4/130.3 |
| small/history | M6 | — | — | — % | —/— | —/— | —/— |
| medium/sparse | M1 | 445.7 | 437.5 | -1.8 % | 500.6/493.0 | 66.9/63.2 | 258.1/258.5 |
| medium/sparse | M2 | 511.7 | 507.4 | -0.8 % | 580.5/584.0 | 104.0/96.4 | 263.9/264.9 |
| medium/sparse | M3 | 629.8 | 637.2 | 1.2 % | 732.2/726.6 | 111.7/107.0 | 267.2/270.8 |
| medium/sparse | M4 | 676.6 | 679.6 | 0.4 % | 762.9/775.7 | 100.4/107.0 | 269.3/284.3 |
| medium/sparse | M5 | 1215.0 | 1214.1 | -0.1 % | 1384.7/1379.0 | 94.7/127.6 | 324.3/324.7 |
| medium/sparse | M6 | 1193.1 | 1179.1 | -1.2 % | 1355.6/1348.6 | 118.9/117.3 | 324.3/325.2 |
| medium/dense | M1 | 2836.0 | 2822.3 | -0.5 % | 3174.7/3158.1 | 324.7/314.5 | 648.6/641.7 |
| medium/dense | M2 | 3301.7 | 3322.2 | 0.6 % | 3774.8/3811.6 | 332.3/349.5 | 680.3/680.9 |
| medium/dense | M3 | 3809.1 | 3764.5 | -1.2 % | 4333.6/4275.7 | 372.7/377.2 | 703.1/685.6 |
| medium/dense | M4 | 4030.4 | 4015.6 | -0.4 % | 4574.7/4553.3 | 390.2/387.2 | 715.8/697.6 |
| medium/dense | M5 | 7567.9 | 7554.2 | -0.2 % | 8786.2/8727.1 | 440.2/442.9 | 827.9/800.0 |
| medium/dense | M6 | 7249.7 | 7145.9 | -1.4 % | 8413.1/8268.3 | 431.1/423.4 | 807.3/798.0 |

### Dispersion, contrôles et petits scénarios

Contrôles inversés, médianes P2/A1 ms (ordre d'exécution A1 puis P2) :

| Scénario | API | P2 | A1 | Variation A1 |
| --- | --- | ---: | ---: | ---: |
| medium/sparse | M1 | 440.94 | 434.93 | -1.36 % |
| medium/sparse | M3 | 642.82 | 633.54 | -1.44 % |
| medium/sparse | M5 | 1209.14 | 1218.16 | 0.75 % |
| medium/dense | M1 | 2819.35 | 2782.21 | -1.32 % |
| medium/dense | M3 | 3785.77 | 3755.54 | -0.80 % |
| medium/dense | M5 | 7523.99 | 7477.19 | -0.62 % |
| small/sparse | M1 | 28.01 | 27.03 | -3.50 % |
| small/sparse | M3 | 33.45 | 32.60 | -2.55 % |
| small/sparse | M5 | 65.56 | 65.94 | 0.57 % |
| small/dense | M1 | 48.94 | 49.51 | 1.16 % |
| small/dense | M3 | 61.52 | 58.67 | -4.64 % |
| small/dense | M5 | 117.77 | 120.75 | 2.53 % |
| small/history | M1 | 26.96 | 26.67 | -1.06 % |
| small/history | M3 | 33.68 | 32.30 | -4.12 % |
| small/history | M5 | 63.37 | 63.55 | 0.29 % |

M5 dense ordinaire −0,18 %, contrôle −0,62 % ; intervalles des trois mesures
se recouvrent (détail min/max/SD dans les résumés). Gain réel faible observé,
aucune preuve statistique de gain robuste ou de chargement acceptable pour R1.3.
M5 sparse ordinaire −0,08 %, contrôle +0,75 %. Les petits varient dans les deux
sens : M1 sparse +4,34 % ordinaire mais −3,50 % contrôle, donc régression stable
non établie ; M5 dense +0,24 % ordinaire et +2,53 % contrôle à documenter.
Pas de correction numérique liée à l'environnement ni sélection du meilleur rejeu.

### CPU et mémoire

M5 sparse : CPU user+system médian 1384.75→1378.98 ms ; heap retenue avec résultat 24.30→24.30 Mio ; après relâchement+GC 24.24→24.24 Mio. Setup adapter séparé 599.76→576.95 ms, exclu de latence API.

M5 dense : CPU user+system médian 8786.16→8727.05 ms ; heap retenue avec résultat 131.82→131.82 Mio ; après relâchement+GC 131.81→131.81 Mio. Setup adapter séparé 3575.80→3589.27 ms, exclu de latence API.

M5 dense heap endpoint 440,16→442,92 Mio ; RSS lifetime 827,94→799,95 Mio.
M5 sparse heap endpoint 94,66→127,63 Mio ; RSS 324,31→324,72 Mio. Pas de baisse
uniforme de heap observée ; mémoire retenue après copie/libération quasi identique.
RSS dense inférieur ne prouve pas un gain mémoire exclusif d'A1 : génération GC,
setup et comportement V8/OS interviennent. Endpoints, lifetime et retained ne
mesurent pas les allocations cumulées. Aucun pic exclusif loading ni absence de
fuite déduit du GC. Cold M5/M6 bénéficie déjà du setup mémoire validant.

## Profils CPU

Inspector 1 ms, un appel mesuré après cold/warm-up, campagnes séparées.
profiles-analysis.json compte chaque catégorie une fois par sample pour les
inclusifs et utilise directement la frame feuille pour self. Pourcentages
inclusifs recouvrants, jamais additionnés ni convertis en durées exclusives.
Mapping JS P2 : copyImmutableValue ligne 4, copy ligne 5, spread ligne 14,
dataRecord appel ligne 35. A1 : public 4, copy 6, includes 13, push 15,
dataRecord 37, pop 50. Sources instrumentées du lab ont un autre mapping,
jamais mêlé aux profils officiels. profile-summary.mjs historique inchangé.

| Profil | Copie inclusif % | dataRecord inclusif % | Enveloppe inclusif % | Payload inclusif % | Registre inclusif % | GC self % |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| p2/medium-dense-M1 | 48.84 | 61.29 | 32.96 | 32.46 | 94.12 | 3.13 |
| p2/medium-dense-M3 | 39.26 | 50.17 | 24.96 | 24.29 | 74.16 | 3.82 |
| p2/medium-dense-M5 | 41.95 | 56.22 | 25.46 | 24.58 | 78.24 | 3.94 |
| p2/medium-sparse-M1 | 50.45 | 57.41 | 35.63 | 32.76 | 91.57 | 2.93 |
| p2/medium-sparse-M3 | 35.31 | 43.86 | 22.34 | 22.57 | 66.56 | 3.00 |
| p2/medium-sparse-M5 | 39.03 | 53.33 | 22.04 | 24.90 | 74.31 | 3.30 |
| a1/medium-dense-M1 | 47.14 | 58.45 | 33.05 | 32.05 | 93.20 | 3.68 |
| a1/medium-dense-M3 | 39.62 | 53.13 | 26.21 | 24.45 | 74.74 | 3.75 |
| a1/medium-dense-M5 | 40.65 | 56.69 | 25.52 | 24.49 | 77.47 | 4.28 |
| a1/medium-sparse-M1 | 43.82 | 55.43 | 29.86 | 33.18 | 90.73 | 3.30 |
| a1/medium-sparse-M3 | 36.10 | 46.80 | 22.06 | 23.19 | 68.17 | 2.22 |
| a1/medium-sparse-M5 | 38.17 | 51.23 | 23.62 | 24.76 | 73.02 | 3.57 |

M5 dense : registre 78,24→77,47 % inclusifs, copie 41,95→40,65 %,
dataRecord 56,22→56,69 %, GC 3,94→4,28 % (échantillonnés).
Aucun nouveau goulet dominant établi : registre, inspection des descripteurs,
copies et validations restent dominants. Les créations de tableaux et la gestion
d'ancêtres n'ont pas de frames indépendantes fiables ; les anonymous dans
immutableValue ne permettent pas d'isoler les spreads d'ancêtres des autres
temporaires. Leur absence ne signifie pas coût nul. Leur réduction est prouvée
par instrumentation séparée, pas en soustrayant les inclusifs CPU.

## Laboratoire indépendant et gain analytique

Troisième clone jetable P2 /tmp/flowplan-p3-ancestor-lab. ancestor-lab.mjs
crée deux fichiers JS instrumentés additionnels dans sa compilation isolée,
à partir des vrais modules compilés P2/A1. Hashes source et instrumentée dans
ancestor-lab.json. Aucun source Domain ni outil officiel modifié. Compteurs aux
sites de matérialisation, objets visités, profondeur, push/pop/live ; assertions
live=0 après succès/cycle/refus/exception et push=pop en A1. Première tentative
simultanée au rollback conservée en ancestor-lab-initial.json, timings non utilisés ;
rejeu définitif seul après fin du rollback.

Une observation instrumentée par cas, HeapProfiler allocation sampling 1024
bytes incluant objets collectés, GC avant/après copie, puis après relâchement.
Overhead des compteurs, sampling, GC ; modules P2 puis A1 dans le même processus
avec évolution JIT/runtime. Chronométrage global de parcours seulement, pas de
durée exclusive d'une instruction. Allocation cumulée exacte non mesurée ; masse
échantillonnée indicative, capacité/backing-store de la pile non comptés.
Heap retenue non exclusive au graphe, endpoints non pics.

| Cas | Version | Objets | Profondeur max | Tableaux ancêtres (appel inclus) | Écritures par spread | Temps instrumenté ms | Masse allocations échantillonnée octets | Heap avec résultat / après libération Mio |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| depth512 | p2 | 513 | 513 | 514 | 131841 | 18.45 | 3753952 | 5.11/5.08 |
| dag400 | p2 | 1201 | 4 | 1202 | 3601 | 3.69 | 3069144 | 5.09/4.97 |
| depth512 | a1 | 513 | 513 | 1 | 0 | 9.16 | 1084696 | 4.16/4.13 |
| dag400 | a1 | 1201 | 4 | 1 | 0 | 3.09 | 2698072 | 4.15/4.03 |

Compteurs exacts aux sites : chaîne 514→1 tableaux, 131 841 écritures de spread
supprimées ; DAG 1 202→1 tableaux, 3 601 écritures supprimées ; mêmes visites.
Une pile reste allouée par appel et peut agrandir son stockage interne. Ces
résultats prouvent l'objectif local ; les latences expérimentales ne sont pas un
gain M1–M6 ni une garantie pour toute profondeur. Structures de profondeur 513
traitées dans ce laboratoire, pile récursive physique non éliminée.

## Réception : deux verdicts indépendants

**Verdict A — conformité technique P3-A1 : CONFORME, à auditer indépendamment.**
Équivalence stricte P2 sur 1 288 réponses, pile restaurée par finally et comptage,
DAG/cycles identiques, copie/gel/détachement/diagnostics/priorités conservés.
Unknown intégralement contrôlé, aucune nouvelle frontière de confiance, périmètre
strict. 213/213 tests, ciblés/gates, frontières/typecheck/build réussis.

**Verdict B — performance globale : classification C maintenue.**
Suppression des allocations d'ancêtres prouvée, mais M5 moyen dense reste
~7,55 s (contrôle ~7,48 s), gain ordinaire ~0,18 % seulement. CPU/mémoire et petits
scénarios varient, mémoire retenue stable ; acceptabilité globale pour la suite
non établie sans nouveau seuil/SLA inventé. Les coûts registre/inspection/
validations/copies subsistent ; aucun B/C ou autre goulet corrigé. Aucune clôture
R1.2 ni autorisation des prochains lots déduite de la conformité locale.

R1.2 **IN REVIEW** jusqu'à audit indépendant. R1.3/R1.4/R2 **NOT STARTED**.
Limites : machine non réservée, trois répétitions, sampling/inlining/JIT, heap
endpoints, RSS lifetime, profondeur physique et BigInt/mémoire R1.1 inchangés,
grands non activés. Aucun gain latence robuste promis.

## Rollback et revue de livraison

Clone jetable du candidat mesuré : revert normal du commit local A1, sans reset
ni force. rollback.json : tree identique à 4186efc, arbre propre ; suite restaurée
194/194, frontières incluses dans typecheck PASS, build PASS. Rollback teste le
patch de production et les nouveaux tests ; documents/preuves n'altèrent pas
le runtime. Revert normal du commit livré pourra retirer aussi ces documents.

Diff revu : une seule production immutableValue.ts ; nouveau test uniquement ;
quatre documents demandés et nouvelles preuves dans ce dossier. Tests/gardes,
anciens proofs, outils/fixtures/configs/packages et autres sources inchangés.
files.txt donne l'inventaire exact, review.json les hashes/scope, diff-check PASS.
SHA final et vérifications distantes communiqués après commit/push sans force,
pour éviter toute auto-référence circulaire. Arrêt après livraison Git.
