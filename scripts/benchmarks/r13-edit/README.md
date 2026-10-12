# R1.3 PERF-EDIT

Après `npm run test:v2`, lancer `node scripts/benchmarks/r13-edit/run.mjs`.
Processus séquentiels isolés, old-space 1024 Mio, deadline parent de laboratoire
30 s pour setup, préparation et exécution groupées (pas un SLA). Cold, warmup,
3 essais mesurés ; nouvelles cellules/session depuis la même vue acquise
immutable, setup exclu. Réponses hors chronométrage, execute les revalide.

Small dense : H additionnel 0/10/100/1000 ; Medium dense et sparse : 0/1000.
EDIT-local, EDIT-actuals (TA locale, ETC positif keep), variante frontière
(B explicite, SP/AP et PTEC affected). Large conditionnel, pas lancé automatiquement.
Même S exact et hash à travers profondeurs ; H ajoute une chaîne de versions
Settings synthétiques d'une branche non sélectionnée, valide à l'enregistrement,
avec inventaire complet. Ce laboratoire ne prétend pas rejouer une histoire de
commandes utilisateur ni mesurer un stockage durable.

`official` mesure dehors prepare/execute. `instrumented` est une campagne distincte
sur une copie compilée ajoutant des lectures d'horloge aux commentaires R13-E*.
E1/E2/E3/E4/E5/E6/E7 disjoints ; E5 registre/manifeste/extraction séparés.
L'overhead de markers est expérimental ; les totaux officiels font autorité.
CPU processus et heap/RSS endpoints ne sont pas pics exclusifs ; maxRSS lifetime
inclut setup. Résultats et qualifications dans proofs/r13/perf, jamais dans les
preuves LOAD R1.2. Aucun bypass de certification et aucun registre optimisé.

Après la campagne principale : `node scripts/benchmarks/r13-edit/summarize.mjs`,
puis `node scripts/benchmarks/r13-edit/cpu.mjs` et
`node scripts/benchmarks/r13-edit/breadth.mjs`, séquentiellement. CPU et contrôle
breadth sont séparés des officiels ; breadth maintient S/H/B et varie la profondeur.
Le setup par session est rapporté en trialSetupMs, en plus du setup initial.
