# R1.2-PERF-P3-B — preuves de réalisation

Autorisation utilisateur B2 avec acquisition validante B1, baseline de livraison
`6b1d65f15f6479b14be721417a5a9bc036257d36`, oracle et performance A1 réel
`1d1c66b2b38a6599f1ab0950c4dd1fdffd1e6e74`. Branche
`rewrite/portfolio-versioned`. R1.2 IN REVIEW ; R1.3/R1.4/R2 NOT STARTED.
Rapport et verdicts : [report.md](./report.md).

Deux clones `git clone --no-hardlinks` indépendants, sans alternates :
`/tmp/flowplan-p3b-a1` et `/tmp/flowplan-p3b-b`. Seules les dépendances existantes
node_modules sont liées ; sources et compilations ne le sont pas. A1 détaché
au SHA exact ; candidat committé dans son clone pour respecter productionDiff
vide des outils historiques. Aucun outil ni fixture historique édité.

## Oracle avant production

Depuis la racine, `P=docs/steps/PORTFOLIO_VERSIONED/proofs/r12-perf-p3-b` :

```sh
node docs/steps/PORTFOLIO_VERSIONED/proofs/r12-perf-p2/oracle.mjs ROOT "$P/LABEL-oracle"
node docs/steps/PORTFOLIO_VERSIONED/proofs/r12-perf-p2/supplement.mjs ROOT "$P/LABEL-supplement"
node docs/steps/PORTFOLIO_VERSIONED/proofs/r12-perf-p3-a1/copy-oracle.mjs ROOT "$P/LABEL-copy"
node "$P/business-oracle.mjs" ROOT "$P/LABEL-business"
node "$P/compare.mjs" "$P" seal
node "$P/compare.mjs" "$P"
```

LABEL=a1 avant modification production, LABEL=b après. Le sceau vérifie les
1 288 réponses rejouées contre les archives A1 intactes et fige les réponses
ainsi que le harness des 971 extensions avant le patch. Comparaison complète
par assert.deepEqual, ordre des arrays intact, transport BigInt exact ; -0
explicitement encodé dans les extensions et le corpus copy. Le transport du
corpus historique reste strictement inchangé. Runtime séparé : gel récursif,
détachement, mutation rejetée, exports JS effectifs. 2 259 réponses, zéro divergence.

## Campagnes et limites

[campaign.sh](./campaign.sh) contient les commandes réellement exécutées.
A1 puis B : verify, petits M1–M6, moyens M1–M6, profils moyens M1/M3/M5.
Aucun test, compilation indépendante, oracle ou laboratoire concurrent avec les
mesures. Compilation préalable intégrée au runner. Pas de réservation OS ;
applications externes non contrôlées. Seed 1202, timeout 30 s par phase,
old-space 1024 Mio, cold, un warm-up, trois répétitions ordinaires. Inspector
1 ms et une répétition profilée distincte. Setup adapter hors latence API et
inclus dans RSS lifetime. M6 historique absent ; grands non exécutés.

Les JSON bruts conservent CPU user/system, cold/warm-up, mesures heap avant/après,
avec résultat et après libération/GC, RSS et setup séparés. Résumés : min,
médiane, max, SD population et IQR. Heap endpoint n'est pas un pic ; RSS lifetime
inclut fixture/setup ; GC n'établit pas l'absence de fuite. Les inclusifs CPU se
recouvrent : ne pas les additionner ou les convertir en durée exclusive de copie.
Contrôles inversés, s'ils sont exécutés, archivés séparément des campagnes principales.

## Laboratoire et rollback

[allocations.mjs](./allocations.mjs) instrumente seulement le JS émis de clones
jetables distincts, avec hashes source avant/après. Les compteurs de copies,
nœuds visités et conteneurs de sortie sont exacts pour l'exécution instrumentée.
Temps de copie (inspection incluse) : mesure instrumentée, avec overhead des
compteurs/timers. Allocation sampling à 32 Kio, objets collectés inclus : estimation,
pas octets exacts cumulés. Heap avec/sans résultat et GC observés séparément.
Aucune instrumentation Domain livrée ni changement aux outils officiels.
Rollback par git revert normal du commit candidat dans un autre clone ; tree
restauré comparé à la baseline de livraison, tests/typecheck/build réexécutés.

[audit.mjs](./audit.mjs) compare textuellement le corps métier (indentation
ignorée uniquement) et inspecte source/JS compilé plus exports runtime. Les deux
assertions terminales de type dépendant préexistantes restent ; elles ne prouvent
pas la provenance. La provenance dépend uniquement des deux acquisitions effectives
et des captures constantes dans le flux lexical synchrone.
