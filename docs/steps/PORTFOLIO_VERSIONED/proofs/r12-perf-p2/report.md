# R1.2-PERF-P2 — réalisation de l’option A

**Verdict A : P2 techniquement conforme. Verdict B : performance globale C réévaluée.**
R1.2 **IN REVIEW**, audit indépendant requis ; R1.3/R1.4/R2 **NOT STARTED**.
Le contrôle ciblé quadratique disparaît, mais la compatibilité de chargement
avec la poursuite de R1.3 n’est pas établie. Aucun GO du lot suivant.

## Baseline, autorisation et périmètre

SHA initial obligatoire `fae4929af58c3ecd0aaa8026e51687e41c51cc7c`.
Oracle réel P1 exact `ee6e26fe9b056fbbd62ffb72be9989385a962e5f`.
Préflight : branche rewrite/portfolio-versioned, HEAD/origin exacts, fetch code 0,
arbre propre, divergence 0/0, aucune modification concurrente inexpliquée.
Les sources de production de ces deux baselines sont identiques. Les décisions
normatives A-R12-01–09/B1–B4, canons R1.1/R1.2 et plans/preuves P0/P1 sont
consultés et conservés. A-P2-01–04 explicitement approuvés par la mission.

Un seul fichier de production modifié : src-v2/domain/portfolio/graphValidation.ts.
Tests : src-v2/application/portfolio/r12.test.ts, cinq ajouts sans retrait.
Documentation : plan P2, canon R1.2, current_plan/current_canon et ce dossier de preuves.
Sept outils/fixtures de benchmark intacts, aucune dépendance/config/contrat/API changé.
Option B, P3, certification, autres scans, R1.3/R1.4/R2, UI/IDB/legacy exclus.
Sources mesurées committées dans clone local 94ae3c9 (SHA complet dans source-hashes.json),
productionDiff vide ; hashes comparés à la livraison, aucun commit de laboratoire poussé.

## Algorithme et équivalence

Après toutes les validations historiques, notamment EXTRA_SUBPERIOD, conserver
le refus immédiat actuals.length !== expectedCells.length, même diagnostic.
Créer alors un LocalVersionTable<number> local. Projecteur privé typé
EntityIdentity<PT|RT> et EntityIdentity<ActualSubPeriod> : six composants
association.kind / entityId.family / entityId.value et subPeriod.kind /
entityId.family / entityId.value. Aucune concaténation, normalisation, cast
incompatible, versionId ou identité TA comme clé. Compter les TA selected dans
leur ordre ; vérifier les attendus dans leur ordre, compte exactement égal à un.
Retourner INCOMPLETE_OR_FOREIGN_ACTUAL_GRID / teamActuals, message identique.
PortfolioOrder puis borne Snapshot restent après la grille.

Les F attendus distincts sont établis par les contrôles antérieurs. C=F et
chacun compté une fois excluent manquants, étrangers/substitutions et doublons.
Le registre conserve ses unicités historiques prioritaires ; aucune erreur
anticipée émise par l’index. Zéro explicitement présent conservé, aucun zéro
implicite. Deleted PT/RT sans TA, AP de propriétaires deleted et Capacity des
Teams deleted, inactive/hidden, références exactes de partition, PTEC, historique
non selected, provenance/contexte et copie/gel restent inchangés.

Grille seule : O(C+F) attendu, espace O(U) couples distincts ≤ C, en plus des
O(F) attendus existants ; tailles des chaînes/clés et comportement amorti des
Maps s’ajoutent. C écritures, C lectures d’incrémentation et F lectures de
vérification, sans scan C pour chaque attendu. Pipeline complet non linéaire.
Aucune Map ne sort du Domain ni ne s’ajoute au graphe/registre/inventaires/certificat.

## Oracle et validation réellement exécutés

1254 réponses publiques complètes identiques : 941 cas P1 inchangés + 304 cas
P2 dans le corpus principal, puis neuf cas complémentaires figés avant code.
Vrai P1 compilé dans clone isolé ; candidat dans autre clone/processus, aucune
ancienne implémentation reconstruite. freeze-seal.json prouve le gel préalable ;
original-verification.log compare les 941 réponses avec l’archive P1 historique.
corpus principal SHA256 20253671987b701d1c517d5a8e32392b5091fc7c5b77e7e38061ea4d648f1837,
sorties SHA256 b3d5831b531c1bf04845f1b7bd8b03714c3c0673b20e1255b750a383d4dbcccb.
Diagnostics code/path/message/ordre, versions/refs/owners/payloads/liens/provenance,
inventaires/contexte, résolution, certification et lectures Snapshot/Current
réelles comparés, BigInt exact, ordre/multiplicité des listes conservés.

Extensions : dense/sparse/historique, zéro/missing début-milieu-fin, extra,
substitution C=F, foreign SP/autre AP, doublons selected/cellule, deleted PT/RT,
Team deleted, inactive/hidden, versions non selected, partitions invalides,
familles/quantités forgées, multidéfauts, permutations et identifiants adversariaux.
Supplément : AP vide, couvert sans association, Project/Reservation/Team deleted
avec AP/Capacity. Immutabilité/copie/non-mutation testées séparément runtime,
absence de Map/Set dans les sorties. Les préemptions registry/manifeste sont
conservées plutôt que forcées jusqu’à la grille.

| Commande | Résultat exécuté |
| --- | --- |
| npm run test:v2 | 194/194 PASS ; fail/skip/todo/cancel 0 |
| Ciblés R1.1 primitives/enveloppes + scripts/v2/r11.test.mjs | 32/32 PASS |
| Ciblés R1.2 + scripts/v2/r12.test.mjs | 123/123 PASS ; G12-01–13, P0/P1/P2 |
| npm run check:boundaries:v2 | PASS |
| npm run typecheck:v2 | PASS |
| npm run build:v2 | PASS |
| verify.mjs dans P1 et P2 | 3 variantes PASS chacun, distinct des gates |
| git diff --check | PASS |

194 tests distincts ; ciblés 32+123 = réexécutions, jamais additionnés comme
nouveaux tests. Treize gates satisfaites, canaris hexagonaux conservés. Les
incidents harness heap et fixture couleur sont documentés, jamais présentés
comme PASS ni cachés par normalisation de réponses.

## Campagnes contemporaines et limites de mesure

Apple M4, 10 CPU, 16 Gio, Darwin 27 arm64, Node 24.21.0, npm 11.19.0,
TypeScript 5.9.3. Clones séparés, campagnes séquentielles P1 puis P2, un seul
benchmark actif ; aucun test/compilation/oracle concurrent. Machine OS non
réservée, charge/autres applications non contrôlées. L’analyse statistique légère
et l’écriture documentaire n’affectent pas les règles du runner. Environnements,
commandes absolues/SHAs/trees dans chaque JSON et campaign-commands.json.
Sept hashes outils identiques au P1, fixtures/hashes/volumes historiques égaux,
seed 1202. Cold + warm-up + trois mesures, 30 s par phase, old-space 1024 Mio.
Setup adapter exclu API et consigné ; cold M5/M6 bénéficie du setup chauffé.
29 opérations exécutables par version, toutes terminées dans les campagnes
ordinaires ; M6 historique NOT_EXECUTED (Current absent). Grands NOT_EXECUTED,
sans activation implicite.

p1-summary.json / p2-summary.json donnent médiane/min/max/SD population/IQR,
CPU user+system, heap observée/deltas/GC, RSS lifetime et setup. comparison.json
conserve toutes les lignes avant/après. Les médianes ordinaires ne sont pas
mélangées aux profils ni aux contrôles supplémentaires. Heap endpoints = bornes
basses des pics, RSS lifetime = fixture/setup inclus. Polling externe RSS refusé
EPERM, indisponibilité conservée dans les JSON. Aucun pic exclusif ni absence de
fuite déduit des seules bornes/GC.

### P1 rejoué — tous scénarios/API

| Scenario | API | cold ms | median ms [min–max] | SD ms | heap endpoints MiB | RSS lifetime MiB | status |
|---|---|---:|---:|---:|---:|---:|---|
| small/sparse | M1 | 32.3 | 27.5 [27.5–28.7] | 0.6 | 18.2 | 96.5 | COMPLETED |
| small/sparse | M2 | 37.3 | 32.3 [31.8–33.1] | 0.5 | 12.7 | 96.2 | COMPLETED |
| small/sparse | M3 | 40.3 | 34.8 [34.2–35.9] | 0.7 | 14.6 | 96.2 | COMPLETED |
| small/sparse | M4 | 42.6 | 36.4 [36.3–37.5] | 0.6 | 17.1 | 96.0 | COMPLETED |
| small/sparse | M5 | 68.6 | 66.8 [65.8–68.4] | 1.1 | 33.7 | 129.1 | COMPLETED |
| small/sparse | M6 | 75.5 | 64.3 [63.9–66.5] | 1.1 | 26.1 | 129.3 | COMPLETED |
| small/dense | M1 | 56.8 | 50.4 [50.2–52.0] | 0.8 | 24.5 | 100.3 | COMPLETED |
| small/dense | M2 | 65.6 | 57.0 [56.4–57.4] | 0.4 | 39.4 | 117.7 | COMPLETED |
| small/dense | M3 | 74.6 | 62.6 [62.6–64.7] | 1.0 | 27.0 | 133.9 | COMPLETED |
| small/dense | M4 | 76.5 | 70.6 [67.4–71.2] | 1.7 | 38.8 | 134.0 | COMPLETED |
| small/dense | M5 | 127.4 | 125.0 [123.4–126.1] | 1.1 | 62.8 | 188.5 | COMPLETED |
| small/dense | M6 | 121.7 | 117.2 [117.0–119.2] | 1.0 | 36.1 | 170.5 | COMPLETED |
| small/history | M1 | 31.6 | 27.6 [27.2–28.0] | 0.3 | 15.6 | 89.7 | COMPLETED |
| small/history | M2 | 36.4 | 32.0 [31.3–32.2] | 0.4 | 20.8 | 97.3 | COMPLETED |
| small/history | M3 | 39.7 | 33.5 [33.0–34.2] | 0.5 | 23.0 | 97.7 | COMPLETED |
| small/history | M4 | 42.3 | 36.0 [36.0–37.5] | 0.7 | 14.3 | 97.0 | COMPLETED |
| small/history | M5 | 67.2 | 64.0 [63.7–65.7] | 0.9 | 13.5 | 129.1 | COMPLETED |
| small/history | M6 | — | — | — | — | — | NOT_EXECUTED |
| medium/sparse | M1 | 470.1 | 440.9 [440.7–442.4] | 0.8 | 65.9 | 258.3 | COMPLETED |
| medium/sparse | M2 | 549.0 | 518.4 [510.2–528.9] | 7.7 | 104.1 | 263.3 | COMPLETED |
| medium/sparse | M3 | 950.9 | 913.7 [910.1–916.1] | 2.5 | 104.1 | 267.4 | COMPLETED |
| medium/sparse | M4 | 990.1 | 943.9 [938.2–946.7] | 3.5 | 94.2 | 268.8 | COMPLETED |
| medium/sparse | M5 | 1463.1 | 1466.0 [1461.1–1466.1] | 2.3 | 91.4 | 317.2 | COMPLETED |
| medium/sparse | M6 | 1422.4 | 1411.1 [1409.9–1417.2] | 3.2 | 132.7 | 316.7 | COMPLETED |
| medium/dense | M1 | 2902.6 | 2825.9 [2824.4–2833.2] | 3.9 | 326.8 | 644.5 | COMPLETED |
| medium/dense | M2 | 3361.3 | 3338.1 [3332.6–3349.6] | 7.1 | 343.5 | 695.4 | COMPLETED |
| medium/dense | M3 | 22005.8 | 20749.4 [20745.9–20750.9] | 2.1 | 339.4 | 661.1 | COMPLETED |
| medium/dense | M4 | 22273.9 | 20980.3 [20971.9–21009.0] | 15.9 | 368.3 | 696.7 | COMPLETED |
| medium/dense | M5 | 25251.7 | 24223.0 [24196.8–24582.3] | 175.9 | 433.2 | 801.5 | COMPLETED |
| medium/dense | M6 | 29730.3 | 28668.0 [28621.8–29616.8] | 458.6 | 423.6 | 788.0 | COMPLETED |

### P2 — tous scénarios/API

| Scenario | API | cold ms | median ms [min–max] | SD ms | heap endpoints MiB | RSS lifetime MiB | status |
|---|---|---:|---:|---:|---:|---:|---|
| small/sparse | M1 | 46.5 | 44.0 [40.3–44.6] | 1.9 | 11.1 | 97.7 | COMPLETED |
| small/sparse | M2 | 54.5 | 45.4 [44.5–46.7] | 0.9 | 12.7 | 96.1 | COMPLETED |
| small/sparse | M3 | 50.2 | 43.5 [42.9–45.4] | 1.1 | 15.1 | 96.6 | COMPLETED |
| small/sparse | M4 | 53.2 | 45.8 [45.1–46.8] | 0.7 | 17.4 | 96.1 | COMPLETED |
| small/sparse | M5 | 88.1 | 89.3 [86.5–90.9] | 1.8 | 34.1 | 129.2 | COMPLETED |
| small/sparse | M6 | 84.6 | 77.9 [76.3–78.3] | 0.9 | 20.6 | 129.0 | COMPLETED |
| small/dense | M1 | 66.8 | 59.0 [59.0–60.7] | 0.8 | 24.6 | 100.0 | COMPLETED |
| small/dense | M2 | 76.9 | 73.7 [70.7–75.1] | 1.8 | 39.3 | 116.9 | COMPLETED |
| small/dense | M3 | 86.6 | 73.8 [71.6–74.2] | 1.2 | 22.5 | 133.5 | COMPLETED |
| small/dense | M4 | 87.1 | 76.6 [76.4–78.3] | 0.9 | 25.4 | 132.6 | COMPLETED |
| small/dense | M5 | 149.1 | 146.6 [144.3–148.9] | 1.9 | 64.0 | 189.6 | COMPLETED |
| small/dense | M6 | 150.3 | 141.5 [139.6–142.0] | 1.0 | 37.0 | 170.6 | COMPLETED |
| small/history | M1 | 37.0 | 33.3 [32.7–34.3] | 0.7 | 15.5 | 96.2 | COMPLETED |
| small/history | M2 | 45.7 | 40.8 [39.7–41.8] | 0.8 | 20.8 | 96.4 | COMPLETED |
| small/history | M3 | 48.9 | 41.8 [41.2–43.5] | 1.0 | 23.7 | 96.8 | COMPLETED |
| small/history | M4 | 49.2 | 41.8 [41.1–44.5] | 1.5 | 14.7 | 97.0 | COMPLETED |
| small/history | M5 | 81.5 | 83.3 [82.9–87.7] | 2.2 | 27.5 | 129.1 | COMPLETED |
| small/history | M6 | — | — | — | — | — | NOT_EXECUTED |
| medium/sparse | M1 | 595.0 | 538.3 [535.2–572.4] | 16.9 | 66.0 | 258.5 | COMPLETED |
| medium/sparse | M2 | 642.2 | 604.1 [604.0–635.0] | 14.6 | 104.2 | 263.6 | COMPLETED |
| medium/sparse | M3 | 802.3 | 748.5 [748.1–773.8] | 12.0 | 113.2 | 267.7 | COMPLETED |
| medium/sparse | M4 | 831.6 | 802.4 [790.5–845.3] | 23.5 | 100.9 | 269.5 | COMPLETED |
| medium/sparse | M5 | 1546.4 | 1418.2 [1384.9–1458.4] | 30.1 | 95.6 | 325.4 | COMPLETED |
| medium/sparse | M6 | 1452.2 | 1380.2 [1364.9–1434.5] | 29.9 | 84.4 | 324.8 | COMPLETED |
| medium/dense | M1 | 3443.2 | 3287.7 [3221.0–3340.9] | 49.0 | 331.7 | 636.7 | COMPLETED |
| medium/dense | M2 | 3890.1 | 3871.3 [3848.4–3957.6] | 47.0 | 346.0 | 695.0 | COMPLETED |
| medium/dense | M3 | 4546.2 | 4437.7 [4429.3–4448.0] | 7.7 | 373.1 | 699.8 | COMPLETED |
| medium/dense | M4 | 4862.5 | 4708.1 [4693.1–4708.7] | 7.2 | 385.1 | 698.6 | COMPLETED |
| medium/dense | M5 | 8770.1 | 8727.7 [8694.4–8734.1] | 17.4 | 257.4 | 789.9 | COMPLETED |
| medium/dense | M6 | 8453.7 | 8594.1 [8432.3–8994.3] | 236.2 | 403.5 | 791.1 | COMPLETED |

### CPU et setup séparé — moyens

| Scénario | API | CPU médiane P1→P2 ms | Setup adapter P1→P2 ms |
| --- | --- | ---: | ---: |
| sparse | M1 | 493.4→597.6 | — |
| sparse | M2 | 586.8→688.7 | — |
| sparse | M3 | 996.9→847.3 | — |
| sparse | M4 | 1028.3→902.6 | — |
| sparse | M5 | 1629.3→1600.5 | 582.7→663.3 |
| sparse | M6 | 1574.6→1553.7 | 581.9→700.6 |
| dense | M1 | 3180.4→3669.8 | — |
| dense | M2 | 3839.3→4442.8 | — |
| dense | M3 | 21261.4→4988.0 | — |
| dense | M4 | 21541.2→5276.4 | — |
| dense | M5 | 25476.6→10016.6 | 3563.4→4175.6 |
| dense | M6 | 29930.3→9803.3 | 3668.0→4233.5 |

### Contrôles de dérive — campagne supplémentaire distincte

Dans la campagne principale, M1/M2 sans changement de code montrent +22/+17 %
sparse et +16/+16 % dense côté P2. Rejeu séparé avec mêmes outils et trois
mesures, ordre P2 puis P1 :

| Scenario | API | cold ms | median ms [min–max] | SD ms | heap endpoints MiB | RSS lifetime MiB | status |
|---|---|---:|---:|---:|---:|---:|---|
| medium/sparse | M1 | 614.0 | 544.1 [518.6–573.2] | 22.3 | 66.8 | 258.3 | COMPLETED |
| medium/sparse | M2 | 628.3 | 618.5 [594.5–623.2] | 12.6 | 104.1 | 263.5 | COMPLETED |
| medium/dense | M1 | 3818.5 | 3278.5 [3229.4–3307.6] | 32.3 | 331.8 | 633.5 | COMPLETED |
| medium/dense | M2 | 4019.5 | 3933.4 [3858.8–3936.1] | 35.8 | 344.3 | 694.9 | COMPLETED |
| medium/sparse | M1 | 464.8 | 441.3 [441.1–443.4] | 1.1 | 66.8 | 258.2 | COMPLETED |
| medium/sparse | M2 | 549.9 | 580.0 [570.2–601.5] | 13.1 | 104.1 | 263.7 | COMPLETED |
| medium/dense | M1 | 3470.7 | 3255.7 [3202.5–3284.6] | 34.0 | 333.8 | 635.9 | COMPLETED |
| medium/dense | M2 | 3970.0 | 3805.6 [3796.9–3842.9] | 20.0 | 339.4 | 695.2 | COMPLETED |

Dense : P2 M1 3255,7 ms contre P1 3278,5 ; M2 3805,6 contre 3933,4.
Sparse : P2 441,3/580,0 contre P1 544,1/618,5. La dérive est visible même à
source inchangée ; elle soutient une explication environnementale sans prouver
sa cause (OS/JIT/pression mémoire/charge). Aucune régression algorithmique
introduite dans M1/M2 : ces chemins n’appellent pas la grille. Pas de correction
numérique des gains ciblés, pas de remplacement des résultats principaux, ni
affirmation d’absence universelle de régression. Les petites latences plus
élevées côté P2 demeurent publiées et ne sont pas attribuables avec certitude.

## Profils CPU et nouveaux coûts dominants

Sept profils contemporains obtenus : P1 M3 sparse/dense + M5 sparse ;
P2 M3/M5 sparse/dense. **P1 M5 dense non obtenu** : deux tentatives via outils
intacts, interrompues en cold à 30003 ms, sans phase profilée. Journaux/JSON
p1-cpu et p1-cpu-retry conservés, aucun relèvement de timeout. Le lecteur
historique P1 indiquait 63,12 % inclusifs de grille dans M5 dense, mais ce chiffre
reste une preuve historique, pas une remesure ici. Ce manque limite le verdict
performance ; aucune durée/gain calculé depuis les interruptions.

Attribution timeDeltas et pile par sample, catégories comptées une fois par
sample, mapping JS P1 grille ligne 120 / P2 nouvelles lignes 129–136. Profils
bruts, profiles-summary.json et profile-posts.json conservés. Les inclusifs se
recouvrent, ne s’additionnent pas et ne deviennent pas des durées exclusives.
JIT/inlining/échantillonnage empêchent de traiter l’absence de frame comme coût nul.

| Poste inclusif | P1 M3 sparse | P2 M3 sparse | P1 M3 dense | P2 M3 dense | P2 M5 dense |
| --- | ---: | ---: | ---: | ---: | ---: |
| validateResolved | 43,09 % | 19,00 % | 84,09 % | 12,75 % | 5,83 % |
| Callback grille historique | 29,67 % | retiré du code | 75,25 % | retiré du code | retiré du code |
| Registre | 47,88 % | 67,01 % | 13,53 % | 74,13 % | 77,31 % |
| ImmutableValue | 28,37 % | 38,91 % | 7,46 % | 41,67 % | 42,45 % |
| ofKind | 4,30 % | 5,00 % | 1,08 % | 6,34 % | 2,99 % |
| LocalVersionTables toutes phases | 0,99 % | 1,22 % | 0,26 % | 1,47 % | 1,76 % |

P2 M5 sparse : registre 75,26 %, validateResolved 9,61 %. P2 dense M3/M5 :
GC inclusif 3,83/4,25 %. Les tables incluent les index P0/P1 et ne mesurent pas
exclusivement la nouvelle grille. Les compteurs/lectures du laboratoire ci-dessous
confirment le retrait effectif de F scans C, au-delà de la seule disparition de frame.

Callbacks structurels inchangés P2 dense M3/M5 : PTEC selected JS59
0,98/0,37 %, recherche AP PTEC JS63 0,78/0,32 %, partition exacte JS94
0,84/0,30 %, fermeture SP JS124 0,81/0,44 %, associations par AP JS118
0,72/0,39 %, endpoint Project JS53 0,33/0,17 %, PTEC foreign JS79
0,33/0,15 %. Ils restent des termes potentiellement quadratiques, avec coût
sampling limité et inlining possible ; aucun n’a été optimisé. Le registre,
les enveloppes/payloads/copies et revalidations sont les dominants résiduels
visibles. Aucune suppression de copies ou revalidation P3 réalisée.

## Laboratoire de l’index — exclusivement clone jetable

Après les campagnes, clone /private/tmp/flowplan-p2-index-lab du candidat mesuré,
compilation distincte puis instrumentation du JS compilé via index-lab.mjs.
Commande : node --expose-gc --max-old-space-size=1024
index-lab.mjs ROOT index-lab.json. Source instrumentée archivée, hashes source
original/instrumentée, commandes et notes dans index-lab.json. Elle introduit
performance/process/global.gc seulement dans cette copie, jamais Domain livré.
Une warm-up et trois mesures par fixture moyen sparse/dense. GC avant table,
après construction ; mémoire retenue comparée dans la même invocation.

| Fixture | C=F=U | Nœuds/Maps | set / get | Construction médiane ms | Vérification médiane ms | Heap retenu additionnel médian Mio |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| sparse | 5280 | 5945 | 5280 / 10560 | 2.01 | 0.91 | 1.58 |
| dense | 48480 | 54545 | 48480 / 96960 | 12.77 | 7.38 | 14.65 |

Dense : 48480 insertions, 96960 get (dont 48480 d’incrémentation), contre
2350310400 visites de TA auparavant. Sparse : 5280 insertions et 10560 get,
contre 27878400 visites. Chaque clé a six composants conservés par niveaux
Map ; strings existantes référencées, tuples temporaires, nodes/maps/compteurs
nouveaux. Aucun stockage de versions dans cette table. Le delta retenu inclut
incidents locaux/JIT/GC éventuels, pas un pic exclusif garanti ; overhead et GC
instrumentés hors M1–M6 de référence. Construire/vérifier la table ne domine pas
les pipelines. O(F) expectedCells et tous autres temporaires restent conservés.

Dans la campagne ordinaire dense M3, heap observée 339,4→373,1 Mio et RSS lifetime
661,1→699,8 Mio ; M5 heap 433,2→257,4 Mio et RSS 801,5→789,9 Mio. Ces écarts
ne permettent pas d’attribuer tout le delta à l’index : phases/GC/OS et maxima
observés diffèrent. L’index est abandonné après chaque appel, aucun ajout aux
valeurs publiques ; répétitions ordinaires et tests runtime indépendants.

## Deux verdicts, classification et limites

**A — Conformité technique P2 : PASS.** Diff strict option A, équivalence complète
1254 cas, diagnostics et invariant TA conservés ; scan FC retiré par inspection
et comptage, table temporaire Domain invisible ; R1.1/R1.2/P0/P1/G12/tests,
typecheck/build/frontières PASS. Aucun autre scan ni contrat modifié.

**B — Performance globale : C réévaluée (acceptabilité non établie).** Gain dense
majeur : M3 20,75→4,44 s et M5 Snapshot 24,22→8,73 s (environ 4,68× et 2,78×
sur ces médianes observées, sans ajustement d’environnement). Moyen sparse M5
1,466→1,418 s, gain limité dans cette campagne ; M3 0,914→0,749 s. Dense Snapshot
cold 8,77 s, répétitions 8,694–8,734 s, CPU et mémoire restent substantiels.
Le registre/copies/revalidations dominent, contrôles d’environnement variables,
profil P1 M5 dense contemporain manquant après deux timeouts. Le dossier ne
démontre pas une compatibilité acceptable du chargement avec R1.3, et aucun SLA
arbitraire n’est inventé. A (absence de blocage) et B (réserves compatibles avec
poursuite) ne sont donc pas attribués automatiquement depuis le seul gain ou
le passage sous 30 s. Audit indépendant et nouvelle décision nécessaires.

Pas de qualification grands scénarios, Windows/petit matériel/UI/persistance ;
fixtures selected synthétiques, non historiques exhaustifs. Pas de promesse
pipeline linéaire, mémoire exclusive ou scalabilité extrapolée. Tout goulet
résiduel est documenté, sans optimisation B/P3 ni GO R1.3/R1.4/R2.

Rollback normal dans clone jetable et Git de livraison : rollback.json et
rapport final après commit/push normal, aucune action destructive sur dépôt partagé,
aucun force-push. SHA final communiqué après push pour éviter auto-référence.
R1.2 reste **IN REVIEW** jusqu’à audit indépendant ; arrêt après commit/push.
