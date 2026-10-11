# FlowPlan2 V2 — R1.2-PERF : benchmark et diagnostic

2026-10-11. **Diagnostic seulement ; R1.2 IN REVIEW ; R1.3/R1.4/R2 NOT STARTED.**
Aucune optimisation, modification de contrat ou clôture. Les catégories A/B/C
sont une appréciation technique des résultats, pas de nouveaux invariants.

## 1. Baseline et environnement

Baseline auditée, HEAD initial et origin après `git fetch origin` :
`c9ef65e2ad3223952f39005651dc50dfd0f44c21`, branche
`rewrite/portfolio-versioned`, divergence 0/0, arbre initial propre. Aucune
évolution depuis cette baseline, aucun changement concurrent constaté. Aucun
AGENTS.md applicable dans le dépôt ou ses parents. L'audit indépendant favorable
est communiqué par la mission ; ses preuves supplémentaires ne sont pas présentes
dans un répertoire `proofs/r12-audit` à cette baseline. Les preuves de livraison
G12-01–G12-13 ont été relues : canon, plan, amendements A-R12-01–09/B1–B4,
delivery.json et journal ciblé 86/86. Elles attestent la correction structurelle,
pas des performances acceptables. Les contrats R1.1/R1.2 restent intacts.

Exécution : Node **v24.21.0**, npm **11.19.0**, TypeScript **5.9.3**, macOS
Darwin **27.0.0 arm64**, **Apple M4, 10 CPU logiques**, RAM physique **16 Gio**.
Au début des campagnes, Node signale environ **3,2 Gio disponibles** ; la RAM
libre OS est plus faible (environ 374 Mio), sans équivalence avec la RAM utilisable
sur macOS. Pas de mesure de fréquence effective, consommation système ou pression
mémoire macOS. Un seul processus de benchmark actif à la fois, sans qualification
Windows. Chaque opération est exécutée dans un enfant neuf, heap old-space limitée
à **1024 Mio**, deadline parent **30 s par phase**. Il ne s'agit pas d'une limite
totale RSS. Les métadonnées exactes sont dans les JSON bruts.

## 2. Scénarios déterministes

Graine **1202**, PRNG LCG 32 bits pour les quantités, dates fixes débutant le
2024-01-01, SubPeriods d'un jour contigus. Dense = toutes Teams par Project ;
sparse = **deux Teams par Project**, décalage déterministe. Une Reservation pour
dix Projects, deux RT par Reservation (ratio zéro et fixed-daily), avec la même
taille de partition que les Projects. Capacités explicites, Program/Pas résolus,
PTEC par PT existing, ordre complet, cellules TA présentes même au zéro.
Certains Projects sont inactive et Teams hidden sans réduction de grille.
Chaque version est une identité différente sauf lien historique explicitement
absent ; aucun contexte exhaustif de lignée n'est généré/chargé.

| Fixture | Projects / Teams / Reservations | SP par owner / total | PT existing / deleted | RT existing / deleted | PTEC | TA Project / Reservation | Versions = refs selected |
|---|---|---|---|---|---:|---|---:|
| Petit dense | 10 / 5 / 1 | 12 / 132 | 50 / 0 | 2 / 0 | 50 | 600 / 24 | 894 |
| Petit sparse | 10 / 5 / 1 | 12 / 132 | 20 / 0 | 2 / 0 | 20 | 240 / 24 | 474 |
| Petit historique | 10 / 5 / 1 | 12 / 132 | 20 / 10 | 0 / 2 | 20 | 240 / 0 | 460 |
| Moyen sparse | 100 / 20 / 10 | 24 / 2640 | 200 / 0 | 20 / 0 | 200 | 4800 / 480 | 8604 |
| Moyen dense | 100 / 20 / 10 | 24 / 2640 | 2000 / 0 | 20 / 0 | 2000 | 48000 / 480 | 55404 |
| Grand sparse, prévu NON EXÉCUTÉ | 300 / 40 / 30 | 36 / 11880 | 600 / 0 | 60 / 0 | 600 | 21600 / 2160 | 37644 prévues |
| Grand dense, prévu NON EXÉCUTÉ | 300 / 40 / 30 | 36 / 11880 | 12000 / 0 | 60 / 0 | 12000 | 432000 / 2160 | 470844 prévues |

Les cinq fixtures exécutées ont chacune : P ProjectSettings, R
ReservationSettings, T TeamSettings, T TeamCapacity, P+R ActualPeriod, un Program,
un Pas, un PlanningSettings et un PortfolioOrder, plus les lignes ci-dessus.
Les JSON donnent les 14 comptes par kind et le hash SHA-256 de la fixture complète.
« Versions = refs selected » désigne les références exactes distinctes demandées.
Les occurrences syntaxiques de refs exactes dans **un manifeste + les versions**
(refs d'enveloppes et AP.subPeriods compris, wrappers Current/Snapshot exclus)
sont respectivement **1920 / 1080 / 1054 / 19848 / 113448**. Les occurrences
d'identités stables dans ces mêmes données sont **1501 / 721 / 673 / 13810 /
103810**. Les valeurs grand ci-dessus sont calculées depuis le générateur,
pas des fixtures construites ni certifiées en campagne.

Historique : Snapshot autonome avec Current **null**, dix PT tombstones sans
TA/PTEC et une Reservation deleted avec AP couvert et deux RT tombstones.
ProjectSettings ps0 sélectionne v10000 avec predecessor v9999 absent et source
de provenance absente ; aucun historique nécessaire à sa fermeture métier.
Le chargement réel conserve `not-established`. KnowledgeDate correspond au
dernier jour de toutes les partitions (2024-01-12 pour petit, 2024-01-24 pour
moyen). L'ancienneté est définie par cette sélection autonome et ses dates,
sans historique Current artificiel. Le compte n'inclut pas 9999 versions cachées.

## 3. Méthodologie et résultats

Commandes exactes et journaux : [README outils](../../../scripts/benchmarks/r12-perf/README.md),
[petit](./proofs/r12-perf/small.log), [moyen](./proofs/r12-perf/medium.log).
Le lanceur recompile les sources réelles avec la configuration existante puis
importe les API `.test-dist-v2`, sans réimplémentation de leur traitement.
Une génération par enfant, hors chronométrage, puis première invocation,
un warm-up et **trois répétitions mesurées** lorsque l'opération termine.
M1–M6 sont indépendants comme expériences, **pas comme phases de traitement**.
Le coût de création de l'adapter mémoire M5/M6 est enregistré séparément et
exclu du temps de lecture ; il valide déjà le registre. « Cold » est la première
invocation de l'API dans cet enfant ; pour M5/M6, le setup a déjà chauffé une
partie des chemins communs. Ni import, compilation ni démarrage Node inclus.

API mesurées : M1 `createVersionRegistry`; M2 `resolvePortfolioManifest` ;
M3 `validatePortfolioGraph` ; M4 `certifyPortfolioGraph` avec wrapper Snapshot
unknown ; M5 `loadSnapshotGraph` sur adapter mémoire ; M6 `loadCurrentGraph`
comparatif, absent volontairement dans historique. Appels complets et contrôle
du DomainResult ; aucune sortie invalide comptée comme réussite.

Les tableaux générés présentent médiane, min/max, écart-type population et
maximum heap observé aux points de mesure. Le JSON de synthèse ajoute IQR,
moyenne, CPU user+system, deltas heap et mémoires après GC. La première
invocation et le warm-up sont conservés séparément des statistiques.

[Données brutes petit](./proofs/r12-perf/small.json), [moyen](./proofs/r12-perf/medium.json), [synthèse numérique](./proofs/r12-perf/summary.json).

| Scenario | API | cold ms | median ms [min–max] | SD ms | heap endpoints MiB | RSS lifetime MiB | status |
|---|---|---:|---:|---:|---:|---:|---|
| small/dense | M1 | 240.7 | 233.9 [233.1–246.5] | 6.1 | 17.4 | 100.0 | COMPLETED |
| small/dense | M2 | 261.2 | 252.3 [252.0–252.8] | 0.3 | 23.5 | 102.6 | COMPLETED |
| small/dense | M3 | 268.2 | 260.5 [259.0–261.2] | 0.9 | 20.1 | 103.1 | COMPLETED |
| small/dense | M4 | 275.6 | 271.0 [270.4–273.0] | 1.1 | 17.0 | 101.3 | COMPLETED |
| small/dense | M5 | 519.9 | 520.2 [516.8–521.7] | 2.0 | 32.3 | 136.3 | COMPLETED |
| small/dense | M6 | 519.2 | 523.1 [517.0–526.3] | 3.9 | 33.2 | 136.4 | COMPLETED |
| small/sparse | M1 | 68.2 | 61.8 [61.5–62.5] | 0.4 | 12.8 | 81.1 | COMPLETED |
| small/sparse | M2 | 76.0 | 70.8 [69.1–71.4] | 1.0 | 13.4 | 96.3 | COMPLETED |
| small/sparse | M3 | 78.4 | 72.3 [71.9–76.2] | 2.0 | 14.6 | 96.3 | COMPLETED |
| small/sparse | M4 | 80.3 | 74.7 [74.3–75.3] | 0.4 | 16.4 | 96.4 | COMPLETED |
| small/sparse | M5 | 142.7 | 138.2 [137.6–139.5] | 0.8 | 22.1 | 99.0 | COMPLETED |
| small/sparse | M6 | 138.6 | 132.3 [132.2–133.9] | 0.8 | 22.9 | 98.7 | COMPLETED |
| small/history | M1 | 67.5 | 60.4 [59.9–61.8] | 0.8 | 15.0 | 81.1 | COMPLETED |
| small/history | M2 | 72.0 | 66.2 [65.5–66.5] | 0.5 | 14.9 | 96.4 | COMPLETED |
| small/history | M3 | 74.5 | 69.4 [67.6–73.4] | 2.4 | 22.9 | 98.0 | COMPLETED |
| small/history | M4 | 77.0 | 72.5 [71.4–75.0] | 1.5 | 13.7 | 95.8 | COMPLETED |
| small/history | M5 | 139.9 | 131.1 [131.0–131.9] | 0.4 | 23.7 | 98.5 | COMPLETED |
| small/history | M6 | — | — | — | — | — | NOT_EXECUTED |
| medium/sparse | M1 | 13251.8 | 12604.1 [12598.0–12609.6] | 4.7 | 55.2 | 235.2 | COMPLETED |
| medium/sparse | M2 | 14280.2 | 13550.3 [13530.5–13601.3] | 29.8 | 104.3 | 239.3 | COMPLETED |
| medium/sparse | M3 | 14722.2 | 14035.9 [14012.5–14038.4] | 11.7 | 89.7 | 239.2 | COMPLETED |
| medium/sparse | M4 | 14874.3 | 14206.6 [14197.9–14251.9] | 23.7 | 107.5 | 248.3 | COMPLETED |
| medium/sparse | M5 | 28179.4 | 28179.2 [28175.7–28207.4] | 14.2 | 136.5 | 271.8 | COMPLETED |
| medium/sparse | M6 | 28005.3 | 27981.4 [27966.1–28028.6] | 26.6 | 132.6 | 272.9 | COMPLETED |
| medium/dense | M1 | — | — | — | — | — | INTERRUPTED_TIMEOUT (cold ≥30002.0 ms) |
| medium/dense | M2 | — | — | — | — | — | INTERRUPTED_TIMEOUT (cold ≥30003.0 ms) |
| medium/dense | M3 | — | — | — | — | — | INTERRUPTED_TIMEOUT (cold ≥30002.0 ms) |
| medium/dense | M4 | — | — | — | — | — | INTERRUPTED_TIMEOUT (cold ≥30002.0 ms) |
| medium/dense | M5 | — | — | — | — | — | INTERRUPTED_TIMEOUT (adapter-setup ≥30002.0 ms) |
| medium/dense | M6 | — | — | — | — | — | INTERRUPTED_TIMEOUT (adapter-setup ≥30003.0 ms) |

| Moyen sparse | CPU médian ms (user+system) | heap après GC avec résultat Mio | RSS maximum aux points de mesure Mio |
|---|---:|---:|---:|
| M1 | 12653.6 | 15.6 | 234.7 |
| M2 | 13620.7 | 17.1 | 237.6 |
| M3 | 14114.1 | 17.4 | 238.8 |
| M4 | 14290.0 | 17.4 | 240.1 |
| M5 | 28292.3 | 25.3 | 266.3 |
| M6 | 28089.0 | 25.3 | 272.5 |

Pour moyen sparse, setup adapter M5 **13648,2 ms**, M6 **13695,4 ms**,
en sus de la lecture. CPU proche du temps écoulé (parfois supérieur avec les
threads internes de GC) : ces appels sont principalement un travail de calcul.
Les rapports médian moyen/petit sparse sont M1 **×204**, M2 **×191**, M3
**×194**, M4 **×190**, M5 **×204**, M6 **×211**. Les différences de temps entre
API sont indicatives : pas des chronométrages internes de sous-phases.

Campagne principale : **23 expériences complètes**, chacune première invocation,
warm-up et 3 mesures, soit **115 appels complets dont 69 mesures statistiques**.
**Six expériences interrompues** : quatre premiers appels API M1–M4 au deadline
30 s, et deux setups adapter M5/M6 au même deadline, avant démarrage de la lecture.
Aucun warm-up ni répétition mesurée sur dense moyen ; zéro PASS de ces opérations.
M6 historique NON EXÉCUTÉ (Current absent) ; grand dense/sparse NON EXÉCUTÉS.
Zéro erreur DomainResult ou crash dans les expériences de la campagne principale.
Les six arrêts sont conservés avec signal SIGTERM et code null. Le premier échec
de lanceur lié à `ps` et les profils séparés sont décomptés à part.


Mémoire : `heapUsed`, RSS et heap conservée après GC sont des observations
différentes. GC forcé avant l'appel, après avec résultat conservé, puis après
suppression de la référence locale. Ce dernier point **ne prouve pas** que V8
a relâché toute référence temporaire de l'expression `await` ; la baseline des
itérations suivantes peut encore inclure le résultat précédent. Les deltas ne
mesurent donc ni allocations cumulées ni taille exclusive du graphe ; aucune
conclusion de fuite n'en est tirée. Les maxima heap aux points de mesure sont
des **bornes basses**, pas des pics intra-appel. Node `maxRSS` est un maximum
**sur toute la vie du processus**, fixture/setup/GC inclus ; il ne peut être
attribué exclusivement à l'API. Les tentatives de polling RSS `ps` sont refusées
par le sandbox (`EPERM`), consignées dans les JSON. Aucun vrai pic heap ou RSS
intra-appel des opérations interrompues n'est disponible.

## 4. Principaux goulets

### Registre et copies

`createVersionRegistry` copie toute la liste, valide chaque enveloppe/payload,
puis `validateVersionContext` recopie la liste et reconstruit chaque enveloppe.
Pour chaque payload, au moins **cinq parcours de copie** dans un passage registre :
deux copies des listes complètes, copie de l'enveloppe métier, copie de validation
locale (ensuite abandonnée), copie d'enveloppe contextuelle. Le compte décrit
le code exécuté, pas cinq graphes conservés simultanément. Références/owners/
provenance et tableaux temporaires ajoutent des allocations.

Le contexte fait `find` de doublons pour chaque version puis `some` sur tous
les owners. Le registre refait `some` sur les mappings et un autre `some` pour
la liste distincte. Sans collision, ces recherches ont un coût **O(V²)**.
Le mapping TeamActual compare les owners structurés des cellules : beaucoup
de `Object.entries`, `every` et `find` dans `equalImmutableValues`. Sur C TA,
ce seul mapping examine C(C−1) couples d'identités distinctes ; petit sparse
C=264, moyen sparse C=5280, soit environ **×401** de couples. Le nombre total de versions
croît ×18,15, et le temps mesuré du registre environ **×204**. Les différences
de coûts par kind et les coûts fixes empêchent d'assimiler ce rapport à une
loi empirique exacte ; deux tailles ne suffisent pas à ajuster un modèle fiable.

### Résolution et validation structurelle

M2 revalide le manifeste (unicité par `seen.some`, donc quadratique par table)
et le registre, puis un `lookupExact` linéaire par référence selected, soit
O(R×V). M3 appelle **M2 complet**, puis 10 extractions initiales `filter`, des
`find/filter/some` pour capacités/AP/endpoints/PTEC et partitions. Les références
catalogue de chaque Settings provoquent aussi des `ofKind`/`filter` répétés sur
la liste entière, avant le `find` ciblé. Il alloue
`expectedCells` de taille C et `partitionRefs` de taille S. Vérifier la grille
fait `actuals.filter` **pour chacune des C cellules attendues**, donc C²
comparaisons et C tableaux filtrés temporaires ; il ne construit aucun index.
L'unicité des refs du manifeste, le registre et le lookup sont déjà coûteux
avant cette vérification. Aucun seuil métier ni nouvelle règle de grille ajouté.

M4 ne représente pas une phase incrémentale après M3 : elle exécute depuis
unknown Snapshot factory, M3 et borne de knowledgeDate. La marque opaque ne
fournit aucun bypass. Le coût dominant démontré doit donc être attribué au
pipeline de validation inclus, pas à une opération de branding indépendante.

### Lecture applicative

M5 valide le Snapshot fourni par le port ; l'adapter résout les refs par lookup
linéaire ; `collect` **reconstruit le registre** puis effectue un `some` par ref
pour la correspondance ; la certification reconstruit **encore** le registre,
résout et valide la grille. Le chargement chronométré contient donc deux
passages registre, plus deux parcours de correspondance/résolution O(R×V),
plus la grille. Le setup exclu contient un troisième registre. Snapshot est
revalidé par Application et certification en plus de sa validation au setup.
M6 suit le même principe avec CurrentSelection et sans borne Snapshot.
Il n'y a pas plusieurs appels directs à `resolvePortfolioManifest` dans un
chargement : les recherches successives adapter/collect/resolver sont distinctes.

**Profils CPU Node Inspector**, cible 1 ms, dans une campagne séparée après les
timings principaux : première invocation + warm-up + **une invocation profilée**
pour M3 moyen sparse et M1/M5 petit dense, soit neuf appels complets supplémentaires.
Les temps profilés ne sont pas mélangés aux 69 mesures statistiques précédentes.
Les profils bruts `.cpuprofile`, [synthèse CPU](./proofs/r12-perf/cpu-summary.json)
et [journal d'attribution](./proofs/r12-perf/cpu-summary.log) sont conservés.
Le profil s'arrête avant les GC forcés de mesure ; le GC naturel pendant l'API
reste inclus. Les poids sont les `timeDeltas` du sampler, pas des durées exclusives
exactes ; JIT/inlining, safepoints et overhead Inspector limitent leur précision.

| Profil | Échantillons / durée échantillonnée | Registre, inclusif | Égalité structurée, self | Copies, inclusif |
|---|---|---:|---:|---:|
| M3 moyen sparse | 9372 / 14096,0 ms | 88,44 % | 73,90 % | 1,68 % |
| M1 petit dense | 170 / 259,8 ms | 93,91 % | 60,93 % | 9,08 % |
| M5 petit dense | 359 / 547,0 ms | 85,03 % | 56,22 % | 8,27 % |

Dans M3 moyen sparse, callback d'unicité owner du registre **77,85 % inclusif**,
`lookupExact` **5,90 %**, `validateVersionContext` **4,76 %** (déjà inclus dans
registre). `validateResolved` **2,75 %**, dont callback de contrôle des cellules
**1,90 %**. Les pourcentages inclusifs **ne s'additionnent pas** lorsqu'ils se
recouvrent. Les frames/numéros de ligne de la synthèse sont ceux du JavaScript
compilé `.test-dist-v2`, pas des lignes TypeScript. Les parents async ne couvrent
pas nécessairement tout travail après `await` : on n'interprète pas leur inclusif
comme temps total d'un service async.

**Goulet mesuré : comparaisons des owners du registre**. La grille a un risque quadratique réel, mais un
poids secondaire ici. M5 profilé confirme deux passages registre dominants ;
aucune attribution intra-appel du dense interrompu n'est disponible. Les copies
sont une source d'allocations démontrée par le code et présente dans les profils,
sans estimation d'allocations cumulées ou promesse de gains de leur suppression.

## 5. Limites et ressources

Portefeuilles synthétiques en mémoire, pas de stockage/disque/réseau/UI ni
commande ou moteur. Sparse avec deux Teams ne prétend pas établir une distribution
statistique des portefeuilles réels. Les 14 kinds sont exercés, mais calendriers
simples et quantités petites n'explorent pas les très grands BigInt ni toutes
formes de filiation. Les données sont peu profondes : aucune saturation de pile
observée ou benchmarkée. La récursion de copie/égalité et une lignée très longue
restent des risques théoriques distincts de ce goulet mesuré ; aucune qualification
de lignée exhaustive de 10000 versions n'est déduite du Snapshot v10000.

Heap cap, deadline et arrêt sont des garde-fous de cette campagne, pas des SLA.
Les appels synchrones bloquent leur event loop jusqu'à retour. Le deadline vit
dans le parent : TERM puis KILL après une seconde, résultat INTERRUPTED conservé.
Les fixtures moyen dense sont générées mais leur certification peut ne pas
aboutir avant interruption ; leur conformité n'est pas déclarée PASS par simple
inspection du générateur. Le grand est **NON EXÉCUTÉ**, dans aucun processus,
après le problème déjà manifeste sur moyen. Les volumes prévus ne sont pas des
volumes atteints. Aucun temps total extrapolé ni gain hypothétique présenté
comme résultat mesuré.

Un premier essai petit a été interrompu par l'erreur non gérée de polling RSS
`spawn EPERM`, avant conservation d'une mesure complète. Corrigé seulement dans
l'outil isolé ; [journal initial](./proofs/r12-perf/initial-run-failure.log) conservé.
Il ne fait pas partie des répétitions réussies et n'est pas PASS.

Les outils étaient initialement sous `scripts/v2/perf` (chemins enregistrés
dans les commandes JSON et les profils). Les premières vérifications finales
tests/typecheck/build/frontières ont été refusées par le garde existant : les
scripts de cette racine ne peuvent importer les `.js` compilés hors de leur
arbre. Les quatre journaux `initial-*-failure.log` conservent ces erreurs.
Les outils ont été déplacés dans **`scripts/benchmarks/r12-perf`**, racine dédiée
hors tooling applicatif V2, sans modification du garde ni des imports relatifs
de production (même profondeur). Les commandes reproductibles du README utilisent
ce chemin final ; les journaux historiques restent fidèles à l'exécution initiale.
Ce déplacement et l'ajustement du polling ne modifient aucun chemin métier.

## 6. Risques R1.3/R1.4 et options non implémentées

R1.3 devra préparer/certifier des candidats : répéter ce pipeline synchrone peut
multiplier les latences constatées et bloquer un thread applicatif pendant de
nombreuses secondes, même avec une grille sparse. Aucun travail R1.3 commencé.
R1.4 consommera le graphe certifié ; ces mesures ne disent rien du coût du moteur
lui-même, mais sa lecture/reconstruction préalable peut déjà dominer l'expérience.
La consommation CPU et les allocations d'égalité/copie peuvent aussi réduire
la marge mémoire pour les candidats et les futures simulations concurrentes.

Options à soumettre à audit, **sans implémentation ni gain annoncé** :

- Tables locales d'unicité et de lookup par kind/EntityId/VersionId et owner
  canonique, y compris mapping cellule association×SubPeriod, gardant collision
  divergente, owner immutable et répétition identique. Coût architectural :
  gestion des clés composites sans ambiguïté, préservation de l'égalité exacte,
  ordre des diagnostics et tests négatifs ; valeurs dérivées du contexte fini,
  aucune autorité historique indépendante ni index ever-nonzero.
- Vérification de la grille par ensemble local des clés attendues/observées,
  avec détection des doubles/foreign/missing cells et tombstones. Coût : préserver
  toutes les garanties G12-05/07/11 ; le produit reste un invariant structurel.
- Réduire les revalidations/copies internes entre frontières déjà validées via
  fonctions internes typées, tout en conservant validation complète de chaque
  entrée publique unknown et immutabilité. Coût plus élevé : audit explicite de
  B4 et des frontières de confiance, tests mutation/ports forgés/G12-12 ; aucun
  raccourci public `already-valid`, WeakSet ou contrat nouveau proposé ici.

La première option cible le goulet démontré du registre ; réduire seulement
la grille ne traite pas le coût déjà présent dans M1. Même un index d'unicité
seul laisserait les scans exacts et copies : nécessité de remesurer après
une correction séparément autorisée et auditée. Les interfaces Domain/Application
peuvent rester identiques ; l'étendue réelle doit être décidée après audit.

## 7. Non-régression et réception

| Vérification finale | Résultat | Preuve |
|---|---|---|
| `npm run test:v2` | **154/154 PASS**, fail/cancel/skip/todo 0 ; tests existants G12 inclus | [tests.log](./proofs/r12-perf/tests.log) |
| `npm run typecheck:v2` | PASS, code 0 | [typecheck.log](./proofs/r12-perf/typecheck.log) |
| `npm run build:v2` | PASS, code 0 | [build.log](./proofs/r12-perf/build.log) |
| `npm run check:boundaries:v2` | PASS, code 0 ; garde inchangé | [boundaries.log](./proofs/r12-perf/boundaries.log) |
| Vérification explicite des outils, après déplacement | 3 variantes : déterminisme, comptages, certificat réel et cellule manquante rejetée ; Snapshot autonome | [tools-check.log](./proofs/r12-perf/tools-check.log) |
| Exécution depuis le chemin final | Petit sparse M1, 3 appels complets dont une mesure (62,3 ms), hors statistiques principales | [relocation-check.json](./proofs/r12-perf/relocation-check.json) |
| Revue diff et `git diff --check` | PASS ; modules métier/contrats/configs/gardes identiques à baseline | [review.log](./proofs/r12-perf/review.log) |

Les tests d'outils et le smoke de déplacement restent **séparés des gates R1.2**.
Le total de 154 tests ne les inclut pas ; aucune performance ne devient une gate
métier. Tests/typecheck/build/frontières ont été réexécutés après correction de
placement, distinctement de leur première tentative refusée.

Fichiers : sept fichiers dans `scripts/benchmarks/r12-perf` (générateur, worker,
lanceur, vérification, synthèse statistique, synthèse CPU, README), ce rapport,
preuves exclusivement sous `proofs/r12-perf`, deux ajouts de référence dans
`docs/current_plan.md` et `docs/current_canon.md`. [Inventaire complet](./proofs/r12-perf/files.txt),
[réception structurée](./proofs/r12-perf/delivery.json).
Tree production mesuré et conservé : `f39d3f286058345c646ddeb673fddf50ba54a3f4`.
Aucun fichier `src-v2`, script applicatif `scripts/v2`, package/lock/config,
contrat R1.1/R1.2 ou archive de preuve antérieure modifié. Commit normal et push
sur `origin/rewrite/portfolio-versioned`, vérification SHA local/distant et arbre
propre à la livraison ; SHA final communiqué dans le compte rendu, sans auto-référence
circulaire dans ce commit. Aucun force-push.

## 8. Classification et recommandation

**C — Bloqueur de performance sur scénario moyen**, y compris sparse à deux
Teams par Project : le registre seul occupe environ 12,6 s, et les lectures
répètent ce coût. C'est manifestement incompatible avec une interaction synchrone
raisonnable ; ce diagnostic n'invente pas de seuil métier définitif. Le petit
reste utilisable (lecture dense environ 0,52 s), ce qui n'annule pas le résultat
moyen. Aucune saturation heap/pile n'est nécessaire pour justifier C.

**Recommandation : corriger le goulet du registre avant R1.3**, après nouvel
audit/décision explicite, puis rejouer la campagne sur le même matériel et les
mêmes hashes de fixtures. Examiner ensuite la grille et les revalidations.
R1.2 reste **IN REVIEW**, R1.3/R1.4/R2 **NOT STARTED**. Arrêt à la livraison
de ce diagnostic ; aucune optimisation engagée ni clôture autorisée par ce rapport.
