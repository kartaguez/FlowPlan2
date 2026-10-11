# R1.2-PERF-P3-A1 — preuves

Mission utilisateur : uniquement la première cible de l'option A, pile locale
ancêtres. Baseline de livraison `4186efc065a8d75de58cc9a2a685c9ef40641bc5` ;
vraie baseline P2 `d2ebb7142c563a43b620cd78fea63f2847d76c02`, production
identique entre ces deux SHAs (preflight.json). R1.2 IN REVIEW ; autres lots
R1.3/R1.4/R2 NOT STARTED. Rapport et deux verdicts : [report.md](./report.md).

## Oracle avant modification

Clone indépendant `git clone --no-hardlinks . /tmp/flowplan-p3-p2`, checkout
P2 détaché exact. Pas d'alternates ; sources et compilations séparées du candidat.
Dépendances existantes par lien node_modules, jamais sources ni sorties liées.
Aucune installation. Compilation : `node_modules/.bin/tsc -p
/tmp/flowplan-p3-p2/tsconfig.v2.test.json`.

Exécuter depuis la racine livrée, avec `P=docs/steps/PORTFOLIO_VERSIONED/proofs/r12-perf-p3-a1` :

```sh
node docs/steps/PORTFOLIO_VERSIONED/proofs/r12-perf-p2/oracle.mjs ROOT "$P/LABEL-oracle"
node docs/steps/PORTFOLIO_VERSIONED/proofs/r12-perf-p2/supplement.mjs ROOT "$P/LABEL-supplement"
node "$P/copy-oracle.mjs" ROOT "$P/LABEL-copy"
node "$P/compare.mjs" "$P"
```

LABEL=p2 sur clone P2, LABEL=a1 sur candidat isolé. 1245+9 cas historiques
inchangés, 34 cas de copie supplémentaires. Réponses publiques entières dans
JSONL gzip ; métadonnées/hashes archivés. Transport historique inchangé ; extension
encode en plus -0 explicitement. Comparaison assert.deepEqual par réponse et
métadonnées, sans normalisation des erreurs. baseline-seal.json produit après
comparaison aux archives P2 historiques et avant toute modification de production.
compare.mjs vérifie aussi que chaque hash scellé reste identique.

copy-oracle.mjs vérifie séparément au runtime : gel profond, indépendance des
copies DAG, détachement, refus de mutation de sortie, non-mutation d'entrée en
échec, appel neuf après refus et exception de réflexion, préservation de -0.
19 tests pérennes supplémentaires dans immutableValue.test.ts, intégrés test:v2.
Un refus est propagé jusqu'à la sortie de l'appel public : poursuivre la même
récursion après ce refus n'est pas un comportement exposé. Les branches réussies
suivies de réutilisation du même objet, les appels neufs après refus/exception,
et la restauration structurelle par finally couvrent cette limite sans modifier
la politique d'arrêt. Aucun getter testé n'est exécuté.

## Campagnes

P2 puis candidat : verify, petits M1–M6, moyens M1–M6, profils moyens M1/M3/M5.
Un seul processus benchmark actif ; aucun test/compilation/oracle simultané aux
mesures (compilation intégrée au runner avant ses mesures). Écriture documentaire
et lecture légère seulement pendant les campagnes. Machine OS non réservée ;
pas de tâche lourde concurrente connue, applications externes non contrôlées.
Commandes exactes, SHA/tree/productionDiff vide et environnement dans les JSON.
Seed 1202, outils historiques inchangés, hashes dans tools-hashes.json.
30 s par phase, old-space 1024 Mio, cold, warm-up, trois répétitions ordinaires.
Profils Inspector 1 ms séparés (une répétition), jamais mélangés aux médianes.
M6 historique absent, grands sans activation explicite donc non exécutés.
Setup mémoire hors temps API, consigné séparément, inclus dans RSS lifetime.

Les résumés donnent min/médiane/max/SD population/IQR, CPU user/system dans
échantillons bruts, heap endpoints/deltas, retenue avec résultat et après
relâchement+GC, RSS endpoints/lifetime. Endpoints ne sont pas des pics exacts ;
RSS lifetime inclut setup/fixture ; GC n'établit pas l'absence de fuite. Le polling
RSS externe, s'il est refusé, reste signalé dans les sorties brutes.

Les observations du laboratoire indépendant (ancestor-lab.json) sont distinctes
des métriques M1–M6 et des gains analytiques. Aucune instrumentation livrée dans
Domain, aucun changement des scripts de benchmark officiels.
