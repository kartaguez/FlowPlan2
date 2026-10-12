# Preuves R1.3 — IN REVIEW

Baseline : 6cce48f41afa015bba86fb428450b0dab9d861b8. Préflight exact/propre,
fetch réussi, branche rewrite/portfolio-versioned, origin 0/0, répété à la reprise.
Le premier essai de mission n'avait modifié aucun fichier. Aucun rapport d'audit
indépendant inventé ; la livraison attend maintenant cet audit.

## Reproduction

Depuis la racine, Node 24+, dépendances présentes du dépôt, aucun ajout :

```sh
npm run check:boundaries:v2
npm run typecheck:v2
npm run test:v2
npm run build:v2
node --test --test-reporter=tap .test-dist-v2/domain/portfolio/transitions/transition.test.js .test-dist-v2/application/portfolio/transitions/r13.test.js scripts/v2/r13.test.mjs
node scripts/benchmarks/r13-edit/run.mjs
```

test:v2 compile des artefacts frais et exécute les assertions TS ainsi que toutes
les suites V2. Le benchmark requiert cette compilation ; son instrumentation
est générée dans .test-dist-v2 uniquement, hors production, sans modifier Domain.
Voir worker/run pour fixtures, cold/warmup/3 mesures, processus séquentiels et
limites de laboratoire. Ne pas exécuter d'autres suites CPU pendant les mesures.

## Journaux

- tests.log : 282 tests PASS, 37 nouveaux R13, zéro skip/todo/cancel/fail.
- r11-targeted.log : 51 PASS ; r12-targeted.log : 155 PASS ; r13-targeted.log : 37 PASS.
- boundaries.log/typecheck.log/build.log : dernières exécutions PASS.
- typecheck-initial.log/typecheck-second.log et tests-initial/second/third.log.gz (brut exact, hashes dans raw-log-hashes.json) et tests-fourth/fifth.log : développement, erreurs conservées, ne valent pas derniers gates.
- perf/ : campagne finale, brut JSONL, résultats, analyse et limites.
- perf-initial/, perf-pre-freeze/, perf-before-cell-binding/ et perf-before-answer-binding/ : séries préliminaires interrompues ; stricte ancienne deadline globale, code avant gel final, et premier démarrage concurrent de gates. Exclues de la qualification finale.
- rollback.log et review.log : exercice isolé et revue finale, générés pendant livraison.

Les canons/proofs historiques R1.1/R1.2 sont byte-identiques à la baseline.
Shell/bootstrap/runtime UI non montés ; browser et Windows non réexécutés, selon
le PLAN dormant et le report I-R01-C. Aucun test non exécuté n'est PASS.
