# R1.2-PERF-P1 — preuves de réalisation

Baseline obligatoire : `f9440517d176d93e3089a8b7cf34da86f36f5f18`.
Branche `rewrite/portfolio-versioned`, arbre initial propre, fetch réussi,
HEAD/origin identiques, divergence 0/0 ; aucun travail concurrent détecté.
A-P1-01 B et A-P1-02–04 approuvés explicitement par la mission utilisateur.
A-P1-05 reçoit deux verdicts séparés dans le rapport ; aucun GO P2/P3.

## Oracle figé avant production

Deux clones locaux jetables indépendants : `/private/tmp/flowplan-p1-baseline`
et `/private/tmp/flowplan-p1-candidate`. Compilation réelle avec la configuration
existante, symlink des dépendances déjà installées, aucun paquet ajouté.
La baseline est exactement le SHA imposé, contenant le code P0 validé.
Le candidat de laboratoire est committé seulement dans son clone, jamais poussé.
`candidate-git.txt`, `baseline-git.txt` et `p1.patch` identifient les arbres.
Les sources de livraison doivent être identiques à cet arbre candidat mesuré.

`p0-oracle` : 563 cas P0 réexécutés avant modification de production.
`oracle-initial.mjs` reprend intégralement ce corpus et ajoute 333 cas P1 : 896 cas.
`oracle.mjs` ajoute ensuite 45 cas supplémentaires : 941 cas (lots adversariaux
avec filiations ramifiées sur les 14 kinds, Snapshot/Current divergent et certification
désérialisée). Les réponses initiales restent conservées séparément et intactes.
`p0-extended-oracle` figé avant modification de production ; `oracle-freeze.log`.
Le helper absent de P0 est remplacé **uniquement dans le laboratoire** par une
succession de vrais `lookupExact` baseline, arrêt au premier échec avec ordinal.
Sur le candidat, le vrai `lookupExactBatch` est appelé. Aucun clone de règle
métier ajouté à la production. Transport typé P0 inchangé : BigInt exact,
clés de records triées, ordre et répétitions de listes conservés.
Toutes les réponses publiques sont conservées dans les `.json.gz`.
Les tests runtime de copie/gel/mutation sont distincts du transport.

```sh
node_modules/.bin/tsc -p /private/tmp/flowplan-p1-baseline/tsconfig.v2.test.json
node docs/steps/PORTFOLIO_VERSIONED/proofs/r12-perf-fix/oracle.mjs /private/tmp/flowplan-p1-baseline docs/steps/PORTFOLIO_VERSIONED/proofs/r12-perf-p1/p0-oracle
node docs/steps/PORTFOLIO_VERSIONED/proofs/r12-perf-p1/oracle-initial.mjs /private/tmp/flowplan-p1-baseline docs/steps/PORTFOLIO_VERSIONED/proofs/r12-perf-p1/p0-extended-oracle
node docs/steps/PORTFOLIO_VERSIONED/proofs/r12-perf-p1/oracle-initial.mjs /private/tmp/flowplan-p1-candidate docs/steps/PORTFOLIO_VERSIONED/proofs/r12-perf-p1/p1-isolated-oracle
node docs/steps/PORTFOLIO_VERSIONED/proofs/r12-perf-fix/compare-oracle.mjs docs/steps/PORTFOLIO_VERSIONED/proofs/r12-perf-p1/p0-extended-oracle docs/steps/PORTFOLIO_VERSIONED/proofs/r12-perf-p1/p1-isolated-oracle
```

`differential.log` : 563 réponses identiques et 896 réponses étendues identiques.
`isolated-oracle.log` : 896 réponses identiques en clone/processus séparé.
`full-oracle.log`, `candidate-full-oracle.log`, `differential.log` : extension finale
941 réponses identiques sur les deux clones, après production ; la congélation
initiale de 896 cas avant production n’est pas réattribuée aux 45 ajouts ultérieurs.
Les 563 et 896 cas sont inclus dans les 941 ; ne pas additionner comme cas distincts.
Copies et gel profond, répétitions, permutation, premier missing/malformé,
12 tables longues avec IDs adversariaux/kind/index, réponses dupliquées et priorité
registre/missing/extra : 15 tests pérennes nouveaux, aucun test supprimé.

## Vérifications réellement réexécutées

`tests.log` : npm run test:v2, 189/189, zéro fail/skipped/todo/cancelled.
`r11-targeted.log` : 32/32 (primitives/enveloppes, régressions contexte P0, A01–03).
`r12-targeted.log` : 118/118 (G12-01–13, P0, P1, canaris hexagonaux).
`boundaries.log`, `typecheck.log`, `build.log` : commandes npm prescrites PASS.
`verify.log` : trois variantes, hashes déterministes/certification/missing-cell
et Snapshot historique autonome PASS, distinct de G12.
`tests-initial.log` conserve le premier refus du garde d'accès calculé : correction
par `refs.at(i)`, garde inchangé. Pendant préparation, erreurs de typage et une
assertion de test incorrecte sur le contexte des répétitions ont été corrigées ;
aucune divergence de production constatée. Seuls les journaux finaux sont PASS.
Résultats P0/R1.1/R1.2 plus anciens : historiques, non réattribués à cette session.

## Mesures et limites

Outils et fixtures `scripts/benchmarks/r12-perf/` inchangés (`tools-hashes.txt`).
Campagnes séquentielles sur le même matériel, seed 1202, tailles historiques,
30 s par phase, old-space 1024 Mio, cold/warm-up/3 mesures par API.
Setup adapter séparé et exclu des temps API M5/M6. Chaque processus neuf ; le
cold de M5/M6 bénéficie néanmoins des chemins chauffés par le setup.
Un seul benchmark actif ; aucune compilation/test/oracle simultané aux mesures.
L'environnement OS et les autres applications ne sont pas réservés.
M6 historique NOT_EXECUTED, Current absent ; aucun grand lancé automatiquement.
JSON bruts : CPU user/system, heap endpoints/deltas/GC, RSS/maxRSS, setup,
interruptions, stderr et ressources. Profils séparés, non mélangés aux médianes.
Heap endpoints : bornes basses du pic ; maxRSS : vie entière du processus,
fixture/setup compris. Le GC ne démontre pas l'absence de fuite. Les timings
complets ne sont pas des mesures exclusives de sous-phases ; inclusifs CPU
recouvrants, non additionnables. Aucun ratio calculé sur timeout baseline.

Rapport final : [report.md](./report.md). R1.2 IN REVIEW ;
R1.3/R1.4/R2 NOT STARTED. Audit indépendant requis, aucune clôture automatique.

Profils contemporains terminés : P0 M3/M5 medium sparse ; P1 M3/M5 medium
sparse et dense, Inspector 1 ms/repeats=1. Six postes dérivés des stacks avec
`profile-posts.mjs`, limites/inclusifs explicités dans le rapport, aucune
instrumentation de production. Aucun benchmark grand ou optimisation P2/P3.

Corpus final reproductible : exécuter `oracle.mjs ROOT PREFIX` avec les deux
clones, prefixes `p0-full-oracle`/`p1-full-oracle`, puis compare-oracle.mjs.
`frozen-subsets.log` vérifie que les 563 et 896 réponses figées restent exactement
les préfixes du corpus final ; aucune réécriture de l’oracle initial.

`rollback.log` : trois reverts normaux en clone jetable, tree complet baseline
restauré exactement, 174/174 tests baseline et frontières/typecheck/build PASS.
Le snapshot documentaire inclut les preuves alors présentes, hors son propre
log et mises à jour de restitution finales. Symlink node_modules retiré ensuite,
arbre clone propre ; aucune action destructive sur le dépôt de livraison.

`tz-utc.log`, `tz-paris.log`, `tz-new-york.log` : CivilDate R1.1, 4/4 chacun,
12 réexécutions supplémentaires sous fuseaux distincts.
