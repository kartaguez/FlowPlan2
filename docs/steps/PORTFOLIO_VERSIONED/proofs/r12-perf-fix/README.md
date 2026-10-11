# R1.2-PERF-FIX — preuves reproductibles

Baseline réelle : `4effcfce23bb1e835201c9fe0c8f06967ce67339`, branche
`rewrite/portfolio-versioned`, préflight propre, fetch code 0, origin identique,
divergence 0/0. Aucun AGENTS.md applicable. Audit favorable du plan et GO P0-A/P0-B
communiqués par la mission utilisateur ; aucun rapport d'audit supplémentaire inventé.

Les snapshots Git de laboratoire sont des clones jetables locaux, jamais poussés.
`baseline-git.txt`, `p0-a-git.txt`, puis `p0-git.txt` identifient leurs HEAD/trees.
Les patches et hashes permettent de comparer le candidat mesuré au code livré.
Les outils de benchmark exigent un HEAD sans diff de production : chaque candidat
est donc committé **uniquement dans son clone de laboratoire** avant mesure.
Le dépôt de livraison ne reçoit son commit qu'après toutes les vérifications.
Dépendances existantes partagées par symlink `node_modules`, sources et sorties
compilées distinctes. Aucun accès réseau ni dépendance ajoutée à l'oracle.

## Oracle

`oracle.mjs ROOT PREFIX` importe les vrais modules compilés de ROOT et le générateur
inchangé. Exécution Node séparée pour baseline, P0-A puis P0 complet. Corpus
initial 325 cas figé avant modification de production, puis étendu à 563 cas
avant P0-B (réexécution baseline/P0-A). Les fichiers sans `initial` contiennent le corpus
étendu. `oracle-initial.mjs` conserve exactement le script initial (SHA256
`bc971a68b5aa85aef60febb8e576963313b35b0011abb7d13d2d4d95f4694909`).
Les réponses 325 cas ont été reproduites après extension et vérifiées contre
les hashes enregistrés avant code : corpus `c46f8d31841c5553afe9cb3d2e08016ca57aa1f9a1999a7b5b3548f85e08bb0b`,
sorties `f602d6ce7b0af83d1665b737931532c21875dc8868b9ebb95bc69f8d2c455d3f`.
Elles sont conservées séparément sous `baseline-initial-oracle` et
`p0-a-initial-oracle`, sans leur attribuer de nouvelles mesures de performance. Graine des fixtures 1202 ; permutations et mutations déterministes.
Les 14 kinds, les 11 mappings, tous types d'owners, collisions/répétitions,
branches/missing/cycles/provenance, données malformées et multidéfauts,
manifestes, tombstones, lectures historiques et lots sont exercés.

Transport structurel typé : chaque valeur porte son type, BigInt decimal exact,
records par clés triées, listes avec ordre et multiplicité conservés. Le transport
n'est utilisé que pour les preuves, jamais pour l'égalité de production.
Les `.json.gz` contiennent **toutes les réponses publiques comparées**, pas seulement
leurs hashes : DomainResult, diagnostics code/path/message/ordre, versions/owners/
payloads/liens, contextes, inventories, résolution/certification et lectures.
`compare-oracle.mjs` fait `assert.deepEqual` sur l'ensemble des réponses décodées et
vérifie les métadonnées du corpus. Les fonctions de ports de l'adapter ne sont pas
transportables ; leurs résultats publics sont exercés par les lectures réelles.
Les garanties runtime de copie/gel/atomicité sont vérifiées séparément par les tests
PERF-P0 et les tests R1.1/R1.2 existants, pas inférées des JSON.

```sh
# Clone isolé sur la baseline exacte ; node_modules existant partagé.
git clone --no-hardlinks --single-branch --branch rewrite/portfolio-versioned . /private/tmp/flowplan-r12-baseline
ln -s /Users/Kartaguez/FlowPlan2/node_modules /private/tmp/flowplan-r12-baseline/node_modules
node_modules/.bin/tsc -p /private/tmp/flowplan-r12-baseline/tsconfig.v2.test.json
node docs/steps/PORTFOLIO_VERSIONED/proofs/r12-perf-fix/oracle.mjs /private/tmp/flowplan-r12-baseline docs/steps/PORTFOLIO_VERSIONED/proofs/r12-perf-fix/baseline-oracle
npm run test:v2
node docs/steps/PORTFOLIO_VERSIONED/proofs/r12-perf-fix/oracle.mjs . docs/steps/PORTFOLIO_VERSIONED/proofs/r12-perf-fix/p0-oracle
node docs/steps/PORTFOLIO_VERSIONED/proofs/r12-perf-fix/compare-oracle.mjs docs/steps/PORTFOLIO_VERSIONED/proofs/r12-perf-fix/baseline-oracle docs/steps/PORTFOLIO_VERSIONED/proofs/r12-perf-fix/p0-a-oracle docs/steps/PORTFOLIO_VERSIONED/proofs/r12-perf-fix/p0-oracle
```

À reproduire après livraison : checkout explicite de la baseline, puis appliquer
le patch de l'étape désirée dans un autre clone ; ne pas supposer que HEAD reste
la baseline. Les hashes des outils et des sources initiales sont archivés.

## Mesures

Un seul benchmark actif à la fois. README et sept outils `scripts/benchmarks/r12-perf/`
réutilisés sans modification ; seed 1202, deadline 30 s **par phase**, heap 1024 Mio,
une cold, une warm-up, trois mesures par API/scénario. Profils séparés avec une
mesure profilée. Les commandes absolues effectives et l'environnement figurent
dans chaque JSON brut ; les journaux montrent les phases réellement terminées.
M6 historique reste NOT_EXECUTED, Current absent. Grand non exécuté.

Le rejeu initial a coexisté avec des compilations/tests/oracles courts pendant
la préparation P0-A ; pas d'autre benchmark concurrent. L'environnement OS peut
varier et n'est pas une machine réservée. Les statistiques avant/après ne sont
pas un SLA ni une preuve asymptotique. Les six interruptions denses historiques
sont des bornes >30 s pour M1–M4 et setups M5/M6, jamais des durées de lecture.
Aucun gain en pourcentage calculé à partir d'une interruption.

Heap endpoints = bornes basses des pics ; maxRSS = vie entière du processus,
fixture/setup inclus. GC après relâchement ne prouve pas l'absence de références
V8 temporaires. Les indisponibilités du polling RSS sont consignées par l'outil.
L'attribution CPU inclusif se recouvre : ne pas additionner ses pourcentages.
