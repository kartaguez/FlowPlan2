# R1.2-PERF-P3-B — réalisation B2/B1

2026-10-11. Baseline de livraison / SHA initial :
`6b1d65f15f6479b14be721417a5a9bc036257d36`. Branche
`rewrite/portfolio-versioned`. Autorisation utilisateur explicite couvrant B2,
acquisition B1, tests/preuves, laboratoire isolé, commit et push normaux.
**R1.2 IN REVIEW ; R1.3/R1.4/R2 NOT STARTED**. P0/P1/P2/P3-A1 acceptés
techniquement selon mission. Aucun P3-C ou autre optimisation réalisé.

## Architecture et audit de confiance

Seul fichier de production modifié : `src-v2/domain/portfolio/payloadValidation.ts`.
Les signatures/contrats de `validateBusinessPayload` et `createBusinessVersion`
restent identiques ; `catalogNameKey` reste le troisième export.
Un orchestrateur privé reçoit une requête dont les données sont unknown :

1. Payload autonome : `copyImmutableValue(input,path)` intégral, propagation
   immédiate du diagnostic, capture de sa copie validée.
2. Version : même inspection `dataRecord`, même prévalidation ref, puis
   `createVersionEnvelope` intégral avec mêmes paramètres/priorités. Propagation
   immédiate du diagnostic ; capture de l'enveloppe réussie et de son payload.
3. Après acquisition, captures `const owned` et `const {kind,path,payload}`.
   Un unique checker lexical `checkBusinessSchema()` sans paramètre contrôle
   exclusivement ce payload. Invocation immédiate synchrone, aucun await ni
   callback extérieur. La closure ne sort jamais du flux.
4. Refus métier propagé intact. Succès autonome : copie initiale ; succès
   version : enveloppe initiale. Aucune lecture du payload unknown après acquisition.

Les deux branches acquièrent réellement une donnée détachée/gelée ; le mode
privé distingue les entrées publiques et ne propose aucun skip-copy. Pas d'API
acceptant une enveloppe présumée valide, de brand/flag trusted/cache/WeakMap/WeakSet
ou nouveau certificat. Les deux assertions terminales préexistantes de types
dépendants restent, sans établir de provenance. Les objets externes gelés et
flags forgés n'acquièrent aucune autorité.

[audit source/JavaScript](./encapsulation.json) : corps métier textuellement
identique à la baseline après retrait de l'indentation et substitution locale du
nom de payload acquis. Un seul switch, **14 branches**, mêmes helpers et ordre.
Trois exports effectifs vérifiés par import namespace JavaScript non typé.
Checker sans paramètres, sans accès à request/input, non exporté/non échappé,
un seul appel. Source et JS compilé hashés. Les copies des listes/contexte,
provenance et enveloppes R1.1 restent. Les **deux registres de chargement distincts**
et la **certification opaque comme unique autorité** sont démontrés par fichiers
inchangés et test de mutation du port à la deuxième acquisition.

## Tests et oracle exécutés ici

| Validation contemporaine | Résultat |
| --- | --- |
| `npm run test:v2` | 245 tests PASS, 0 fail/skipped/todo/cancelled |
| Nouveaux tests pérennes | 32 : 28 paramétrés sur 14 kinds + 4 frontières/priorités |
| Ciblé R1.1 primitives/enveloppes/copie + script r11 | 51 PASS |
| Ciblé R1.2 métier + script r12 | 155 PASS |
| G12-01 à G12-13, P0/P1/P2/A1 | inclus dans suites complètes/ciblées, garde-fous intacts |
| `npm run check:boundaries:v2` | PASS |
| `npm run typecheck:v2` | PASS |
| `npm run build:v2` | PASS |
| Audit source/JS et exports effectifs | PASS |
| `git diff --check` | PASS |

Les nouveaux tests passent les 14 payloads valides/invalides par acquisition
publique ; copie complète avant défaut métier, provenance/self/predecessor avant
métier, chemins/messages exacts, enveloppe externe gelée et métier invalide,
flag forgé, null-prototype, BigInt de 100 chiffres, copies indépendantes,
gel/détachement, absence d'alias mutable et mutation de port à certification.
Les suites préexistantes couvrent collisions/répétitions, withVersions atomique,
R1.1, DAG/cycles/arrays/descripteurs/prototypes/symboles/nombres et Snapshot
historique autonome après évolution de Current. Les cas spécifiques sont aussi
rejoués dans l'extension pérenne JavaScript de l'oracle (971 réponses).

Deux clones réels `--no-hardlinks`, sans alternates, sources/compilations/processus
indépendants. Baseline oracle **A1 exacte**
`1d1c66b2b38a6599f1ab0950c4dd1fdffd1e6e74` ; candidat isolé committé
`c9bc416` pour benchmarks avec productionDiff vide, même source livrée.
**Avant modification production**, rejeu des 1 245+9+34 réponses historiques
et égalité complète contre les archives A1 ; extension des 14 schémas,
multidéfauts, cycles tardifs, descripteurs, prototypes, nombres, BigInt, objets
forgés/gelés, mutations et exports. Réponses A1 + harness extension scellés.

[Différentiel](./differential.json) : **1 288 historiques + 971 nouvelles =
2 259 réponses complètes, zéro divergence, sceau vérifié**. Pas de normalisation
des diagnostics ; ordre des listes intact ; transport BigInt exact et -0
explicite dans copy/extensions. Succès/refus, codes/path/messages/ordre,
payload/ref/owner/predecessor/provenance, registres/contextes, résolution,
inventaires/certification, Snapshot/Current, ports incorrects et atomicité
withVersions viennent des corpus historiques inchangés. Vérifications runtime
gel/détachement/mutation séparées de la sérialisation. Les résultats historiques
ne sont pas présentés comme tests exécutés ici ; ils ont été effectivement rejoués.

## Benchmarks contemporains A1 → B

Outils historiques et fixtures **inchangés** ; seed 1202, volumes/hashes conservés.
A1 puis B, environnements identiques, aucun test/oracle/labo/compilation concurrent
aux mesures. Cold, un warm-up, trois répétitions ordinaires, timeout 30 s par
phase, old-space 1 Gio. M1–M6 sur petits sparse/dense/historique et moyens
sparse/dense. Setup mémoire séparé. M6 historique absent, non exécuté ; grands
non exécutés. Aucun contrôle inversé exécuté, aucune correction de dérive appliquée.
Machine OS non réservée, applications externes non contrôlées ; pas de SLA ajouté.
Commandes/environnement/CPU user-system/heap/RSS dans les JSON bruts, dispersion
min/max/SD/IQR dans les résumés. [Tableau complet M1–M6](./comparison.md).

## Profils CPU et mémoire

Six profils par version, M1/M3/M5 sur moyens sparse/dense, séparés des médianes. Attribution inclusive en %, GC self. **Ne pas additionner les colonnes.**

| Scénario/API | Copy A1/B | dataRecord A1/B | Enveloppe A1/B | Payload A1 → checker B | Version A1/B | Registre A1/B | Contexte A1/B | GC self A1/B |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| medium-dense-M1 | 47.57/45.44 | 60.63/61.36 | 34.39/35.84 | 8.18 → 5.01 | 32.68/30.24 | 93.99/93.52 | 42.40/44.23 | 3.35/3.31 |
| medium-dense-M3 | 38.05/36.10 | 50.26/52.22 | 25.51/25.67 | 5.79 → 3.24 | 24.36/22.27 | 69.58/68.19 | 31.49/31.97 | 3.53/4.09 |
| medium-dense-M5 | 40.91/39.06 | 56.07/53.76 | 26.71/26.38 | 5.48 → 3.30 | 24.46/22.28 | 70.52/69.26 | 32.13/32.94 | 4.47/4.77 |
| medium-sparse-M1 | 45.72/44.79 | 61.16/56.23 | 31.52/34.84 | 9.14 → 5.14 | 34.28/30.62 | 91.53/92.68 | 39.36/43.06 | 3.99/2.76 |
| medium-sparse-M3 | 36.95/32.86 | 46.36/45.67 | 22.09/23.84 | 8.27 → 5.29 | 22.76/20.56 | 64.03/61.65 | 28.49/28.66 | 1.90/3.09 |
| medium-sparse-M5 | 38.56/37.09 | 55.69/52.86 | 24.36/23.37 | 7.75 → 5.75 | 25.44/23.17 | 67.33/67.23 | 28.94/30.60 | 3.45/3.16 |

Le wrapper public `validateBusinessPayload` n’est plus appelé par la factory version B : attribution nommée 0 dans ces profils. Le contrôle métier se trouve dans `checkBusinessSchema` ; `acquireAndValidate` recouvre le même flux que `createBusinessVersion`, ses inclusifs ne sont pas additionnables. JIT/inlining peuvent attribuer du travail de schéma aux callers/helpers ; ces frames ne constituent pas une mesure exhaustive de sa durée. [Profils bruts et analyse complète](./profiles-analysis.json) conservent self/inclusifs de chaque fonction demandée.

Copie et dataRecord restent des coûts importants. Registre/contexte R1.1, enveloppes, inspections métier et les deux acquisitions du chargement restent les goulets. M5 dense : CPU médian 8 588,8 → 8 466,8 ms ; heap endpoint 416,8 → 411,9 Mio, RSS lifetime **818,7 → 822,9 Mio**. La rétention des résultats et les endpoints après libération sont dans les résumés ; aucune baisse structurelle de mémoire retenue n’est revendiquée. Le gain de latence ne garantit pas un gain RSS/GC. Le polling RSS externe a été refusé par le sandbox (`spawn EPERM`) ; les endpoints et maxRSS lifetime internes sont conservés, pas de pic loading exclusif établi.

## Laboratoire d’allocations isolé

Deux clones supplémentaires jetables, aucun fichier instrumenté dans le Domain livré. Sources JS avant/après hashées, instrumentation identifiée par [allocations.mjs](./allocations.mjs). Appels directs de toutes les versions des mêmes fixtures moyennes, setup hors mesure. La copie de contrôle A1 est marquée uniquement autour de son appel historique dans le clone laboratoire ; cette instrumentation est absente des campagnes officielles.

| Mesure par campagne directe | Sparse A1/B | Dense A1/B |
| --- | ---: | ---: |
| Versions | 8604/8604 | 55404/55404 |
| Copies profondes totales (payloads + provenance) | 25812/17208 | 166212/110808 |
| Copies de contrôle | 8604/0 | 55404/0 |
| Nœuds contrôle visités | 72840/0 | 405840/0 |
| Conteneurs contrôle créés | 28917/0 | 171117/0 |
| Temps contrôle instrumenté ms (inspection incluse) | 28.161/0 | 135.546/0 |
| Allocation sampling cumulée estimée Mio | 505.23/442.36 | 3010.38/2653.53 |
| Heap retenue avec résultat, delta Mio | 5.51/5.43 | 34.23/34.17 |
| Heap après libération/GC, delta Mio | 1.21/1.04 | 4.58/4.02 |
| GC observés (forcés inclus) | 56/49 | 50/44 |
| Durée GC observée ms (forcés inclus) | 17.14/13.72 | 47.39/48.72 |

Comptages exacts de l’exécution instrumentée : **8 604 / 55 404 copies de contrôle**, **72 840 / 405 840 visites**, **28 917 / 171 117 conteneurs** supprimés, sparse/dense. Les visites comptent les branches DAG à chaque occurrence. M1 devrait économiser N copies et M5/M6 stables 2N hors setup : conséquence du flux intact des deux registres, pas nouvelle mesure instrumentée de ces opérations. Les contrôles métier ne changent pas.

Les timers isolent le site historique de copie contrôle, inspection comprise ; overhead des compteurs/timers et sampling inclus. Ce ne sont pas des durées exclusives de copie non instrumentée, ni des soustractions M1–M6. Sampling à 32 Kio incluant les objets collectés : estimations d’allocation cumulée, pas octets exacts. Les closures/routage ajoutent des objets/captures au code source ; leur coût exclusif n’est pas isolé par V8. Il est inclus dans les campagnes complètes, qui ne montrent pas de régression de latence médiane. La mémoire/CPU peuvent varier même lorsque la médiane baisse.

Premier essai laboratoire : callbacks GC non encore livrés après un seul setImmediate (fichiers `*-allocations-initial.json`, GC indisponible, pas absence de GC). Rejeu séparé avec attente 20 ms **hors temps mesuré** pour recevoir les événements ; tableaux issus du rejeu. GC observés incluent les collections forcées rétention/libération et l’overhead sampling. GC dense ne diminue pas en durée malgré moins de copies ; aucune promesse de pression GC uniforme.

## Setup mémoire séparé

Les outils historiques consignent la durée setup séparément mais ne capturent pas ses endpoints mémoire. Mesures supplémentaires **non instrumentées**, un setup cold par processus neuf/scénario, même fixture/factory, imports et génération hors temps. Limite old-space 1 Gio, timeout parent 30 s. Ces observations complémentaires ne remplacent pas les médianes officielles. [A1](./a1-setup-memory.json), [B](./b-setup-memory.json).

| Scénario | Setup A1/B ms | Delta heap après setup A1/B Mio | Delta heap avec adapter après GC A1/B Mio |
| --- | ---: | ---: | ---: |
| small/sparse | 35.5/36.0 | 3.8/6.0 | 0.9/0.9 |
| small/dense | 61.5/62.1 | 7.8/9.3 | 1.3/1.4 |
| small/history | 32.5/32.6 | 3.2/5.7 | 0.8/0.8 |
| medium/sparse | 545.2/538.7 | 48.8/56.3 | 8.5/8.4 |
| medium/dense | 3476.0/3426.3 | 127.5/125.4 | 51.3/51.3 |

## Deux verdicts et limites

**A — Conformité technique : PASS.** Provenance lexicale effectivement acquise, pas de bypass/export/certificat nouveau ; 14 schémas uniques inchangés ; une seule copie payload profonde initiale dans le chemin version ; validation complète, diagnostics identiques sur 2 259 réponses, détachement/gel runtime et contrats R1.1/R1.2 conservés. Frontières hexagonales respectées. Rollback normal restaure exactement le tree initial ; 213 tests, typecheck/build restaurés PASS.

**B — Performance globale : C.** Médianes améliorées de 0,3 à 5,7 % sur les petits scénarios, de 0,5 à 5,4 % sur les moyens dans cette campagne. M5 dense reste **7,229 s** ; M5 sparse n’améliore que de 0,5 % et son CPU total médian augmente légèrement. RSS dense M5/M6 augmente légèrement. Les copies restantes, dataRecord et le contexte/certification dominent encore. La suppression sûre apporte un gain local mesurable, insuffisant pour démontrer l’acceptabilité globale. Aucun SLA/seuil métier inventé, aucune significativité statistique revendiquée sur trois répétitions. Aucun coût exclusif des closures déterminé.

Risque résiduel : futur ajout d’un mode bypass, extraction/export du checker, capture réassignable ou réécriture de schéma romprait la garantie. Les audits/test/oracle doivent rester. Intrinsics JS standards supposés comme baseline ; exceptions de réflexion/Proxy n’acquièrent pas de contrat nouveau. Endpoints/sampling ne prouvent ni pic exact ni absence de fuite. Machine non réservée, pas de contrôle inversé exécuté. Grands et M6 historique non exécutés ; autres lots non commencés. **R1.2 IN REVIEW** jusqu’à audit indépendant ; performance C ; aucune clôture implicite.

## Rollback et livraison Git

Préflight : branche/HEAD exacts, fetch PASS, distant identique, 0/0, arbre propre ; aucune modification concurrente observée. [Préflight](./preflight.json). Candidat benchmark committé uniquement dans un clone isolé ; productionDiff vide, source identique au fichier livré. Revert normal `c9bc416` dans `/tmp/flowplan-p3b-rollback` : commit `a7c3ae6`, tree **0e03096424dfdf96d229d1e862dafb24ebbbcf89** exactement celui de `6b1d65f`. Seul lien de dépendances node_modules non suivi dans le clone, aucun reset/force-push/opération destructive sur dépôt partagé. [Git rollback](./rollback-git.log), [tests](./rollback-tests.log), [typecheck](./rollback-typecheck.log), [build](./rollback-build.log).

Périmètre : un fichier production, un fichier test, quatre documents normatifs/points d’entrée et nouveau dossier preuves. Preuves historiques, outils/fixtures et tous autres fichiers production intacts. Diff complet revu, `git diff --check` PASS. Commit/push normaux sur origin/rewrite/portfolio-versioned, SHA final communiqué après publication ; aucune réécriture du propre SHA dans ce rapport. Vérification local/distant et arbre propre communiquée après push. **Arrêt impératif après commit/push ; aucun P3-C/R1.3/R1.4/R2.**
