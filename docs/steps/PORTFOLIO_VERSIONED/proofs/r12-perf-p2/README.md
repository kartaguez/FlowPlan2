# R1.2-PERF-P2 — preuves de l'option A

Mission autorisée A-P2-01–04. Baseline de livraison :
`fae4929af58c3ecd0aaa8026e51687e41c51cc7c`, branche
`rewrite/portfolio-versioned`, fetch réussi, origin identique, divergence 0/0,
arbre propre avant toute écriture. Oracle réel :
`ee6e26fe9b056fbbd62ffb72be9989385a962e5f`. Le diff de production entre
ces deux commits est vide. Aucun AGENTS.md applicable, aucune évolution concurrente
inexpliquée. Les preuves P0/P1 et les sept fichiers de benchmark restent intacts.

Les clones `/private/tmp/flowplan-p2-p1` et
`/private/tmp/flowplan-p2-candidate` ont été créés par `git clone --no-hardlinks
--no-checkout . ROOT`, puis checkout détaché du SHA exact. node_modules existant
copié dans chacun, sans installation. Sources, sorties .test-dist-v2 et processus
Node séparés. Voir preflight.json et source-hashes.json. Les commits de laboratoire
ne sont pas poussés. La production mesurée est identique à la livraison.

## Oracle figé avant production

1. Compilation du vrai P1 : `node_modules/.bin/tsc -p
   /private/tmp/flowplan-p2-p1/tsconfig.v2.test.json`.
2. Rejeu du harness P1 historique intact, 941 cas :
   `node docs/steps/PORTFOLIO_VERSIONED/proofs/r12-perf-p1/oracle.mjs
   /private/tmp/flowplan-p2-p1 docs/steps/PORTFOLIO_VERSIONED/proofs/r12-perf-p2/p1-original`.
   Hashes corpus/sorties identiques au P1 historique.
3. `node .../r12-perf-p2/oracle.mjs ROOT PREFIX` : 1245 cas,
   comprenant les 941 P1 inchangés et 304 extensions P2 ;
   `node .../r12-perf-p2/supplement.mjs ROOT PREFIX` : neuf cas
   AP vide/couvert sans association/propriétaires deleted avec AP et Capacity.
4. Baseline figée et scellée dans freeze-seal.json avant modification de
   graphValidation.ts ; aucune ancienne implémentation reconstruite.
5. Même corpus sur candidat compilé dans l'autre clone. `compare.mjs BASE CAND`
   compare chaque réponse publique entière via assert.deepEqual, puis les
   métadonnées. `verify-original.mjs` vérifie les 941 premières réponses avec
   l'archive historique réelle. Zéro divergence sur 1254 cas.

Transport typé conservé de P1 : BigInt exact, records par clés, listes avec
ordre et multiplicité. Pour limiter la mémoire du harness, chaque réponse est
un membre gzip JSONL indépendant ; le hash canonique représente toujours un
unique tableau JSON. Le transport ne change aucune règle du Domain. Les réponses
contiennent diagnostics code/path/message/ordre, versions/owners/payloads/refs/
provenance, contextes, inventaires, résolution, validation, certification et
chargements réels Current/Snapshot. Copies/gel/absence de mutation sont prouvés
séparément par les suites runtime, pas par le JSON. Incidents de préparation
conservés dans preparation-incidents.md et tests-initial.log.gz.

## Validation et mesures

validation.json et les journaux enregistrent les commandes exactes et résultats.
194 tests V2, 32 ciblés R1.1 et 123 ciblés R1.2, G12-01–13, P0/P1 et cinq
nouveaux tests P2, frontières/typecheck/build/diff-check réussis.

campaign-commands.json et chaque JSON brut enregistrent commandes absolues,
SHAs, arbre de production, productionDiff vide, environnements et timings.
Campagnes séquentielles : P1 verify/petit/moyen/profils, puis P2 mêmes phases.
Aucun test, compilation ou oracle concurrent aux mesures ; compilation intégrée
au run.mjs avant les mesures. Machine OS non réservée. Sept fichiers d'outils
inchangés, hashes dans tools-hashes.json, fixtures seed 1202/hashes historiques.
Cold, warm-up, trois mesures ordinaires par scénario/API ; 30 s par phase,
old-space 1024 Mio ; setup adapter séparé. M6 historique non exécuté (Current absent).
Les grands scénarios ne sont pas activés.

Les profils M3/M5 moyens sparse/dense sont une campagne séparée, Inspector 1 ms,
une mesure profilée après cold/warm-up. profile-summary.mjs historique produit
les rangs self/inclusifs ; analyze-profiles.mjs ajoute une attribution P2 par
catégorie et timeDeltas, avec catégories comptées une fois par sample. Inclusifs
recouvrants, jamais additionnés ni convertis en durées exclusives. JIT/inlining
et échantillonnage limitent l'attribution des sous-phases.

index-lab.mjs instrumente uniquement du JS compilé dans un troisième clone
jetable `/private/tmp/flowplan-p2-index-lab`, après les campagnes de référence.
GC avant/après construction, durées construction/recherches, C/F/U/nœuds/Map,
heap retenu et appels get/set consignés séparément ; overhead et GC du laboratoire
exclus de M1–M6. L'index n'apparaît dans aucun contrat public. Heap endpoints sont
des bornes basses des pics ; RSS lifetime inclut fixture/setup. Aucun écart RSS
seul n'est attribué exclusivement à l'index. Le polling externe refusé est
consigné dans les sorties brutes. Rapport et deux verdicts : report.md.
