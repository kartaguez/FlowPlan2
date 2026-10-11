# FlowPlan2 V2 — R1.2-PERF-FIX : plan de correction

2026-10-11 — **PLAN ONLY / PLAN PROPOSÉ POUR AUDIT — GO NON ACCORDÉ**.
**R1.2 IN REVIEW ; R1.3 NOT STARTED ; R1.4 NOT STARTED ; R2 NOT STARTED.**
Livraison exclusivement documentaire. Aucun code, test, outil, package ou preuve
historique modifié. Audit indépendant du plan puis GO explicite obligatoires
avant toute optimisation ; arrêt après commit/push de ce document.

## 1. Baseline Git et inventaire

Préflight exécuté avant modification : branche `rewrite/portfolio-versioned`,
HEAD initial `80fe87326cc0ab9108c8a1864147ca20751520a8`, arbre propre ;
`git fetch origin` réussi (code 0), HEAD = origin, divergence **0/0**.
Comparaison à la baseline obligatoire : aucun écart. Comparaison à
`c9ef65e2ad3223952f39005651dc50dfd0f44c21` : seulement documentation, preuves
et outils isolés R1.2-PERF ; diff vide sur `src-v2`, `scripts/v2`, package/lock.
Aucun AGENTS.md applicable trouvé dans le dépôt et ses parents.
SHA final documentaire communiqué après push, sans auto-référence circulaire.
Aucun force-push ; si la branche distante évolue, analyser et signaler l'écart
avant de poursuivre, sans écraser une livraison concurrente.

Sources consultées : [current_plan](../../current_plan.md),
[current_canon](../../current_canon.md), [plan R1.2](./rewrite_r12_plan.md),
[canon R1.2](./rewrite_r12_canon.md), [décisions A-R12/B1–B4](./rewrite_decisions.md),
[canon R1.1 et audit A1–A7](./rewrite_r11_canon.md),
[diagnostic R1.2-PERF](./rewrite_r12_perf.md), inventaire/JSON/journaux et profils
sous [proofs/r12-perf](./proofs/r12-perf/).
L'audit indépendant est communiqué par la mission ; aucun rapport supplémentaire
`proofs/r12-audit` n'est fourni. Ne pas lui attribuer des mesures inédites.

| Composant réel | Rôle / périmètre proposé |
| --- | --- |
| `src-v2/domain/versioning/versionRegistry.ts` | P0 : boucle owner→identité et déduplication ; `withVersions` conservé ; P1 : `lookupExact` à étudier |
| `src-v2/domain/versioning/versionEnvelope.ts` | Contexte générique R1.1 appelé par le registre ; extension P0 conditionnelle à autorisation spécifique (§5) |
| `src-v2/domain/versioning/owner.ts`, `primitives/identity.ts`, `primitives/exactReference.ts` | Validateurs existants et discriminants des clés, aucun changement de contrat |
| `src-v2/domain/versioning/immutableValue.ts`, `portfolio/payloadValidation.ts` | Copie/gel/égalité complète et validation métier conservés ; aucune simplification P3 |
| `src-v2/domain/portfolio/graphResolver.ts`, `manifest.ts` | P1 éventuel : résolution exacte en lot et unicité de sélection, après P0 |
| `src-v2/domain/portfolio/graphValidation.ts`, `validatedPortfolioGraph.ts` | Mesures M3/M4/M5 ; grille P2 et frontières P3 différées |
| `src-v2/application/portfolio/loadPortfolioGraph.ts` | M5/M6 : collect + certification ; aucun index ni règle métier à déplacer dans Application |
| `src-v2/adapters/memory/memoryPortfolioReadAdapter.ts` | Setup et lectures par `lookupExact`, sans sélection implicite ; observer les scans résiduels |
| `src-v2/application/portfolio/r12.test.ts` | Vrais tests métier G12 intégrés (pas de fichiers autonomes `versionRegistry.test.ts` ou `graphValidation.test.ts` à cette baseline) |
| `src-v2/domain/versioning/versionEnvelope.test.ts`, `scripts/v2/r11.test.mjs`, `scripts/v2/r12.test.mjs` | R1.1, audit owners/branches et frontières AST/canaris |
| `scripts/benchmarks/r12-perf/` | fixture, worker, run, verify, summarize, profile-summary, README existants à réutiliser sans modifier les scénarios |

## 2. Boucles réellement exécutées et complexité

Notations : N occurrences d'entrée, V références distinctes, R références du
manifeste, C cellules TA, S SubPeriods, L longueur de lignée, P sources de provenance.
Les coûts ci-dessous incluent les comparaisons ; tailles des chaînes/payloads
sont des facteurs supplémentaires. Map/Set natifs : coût amorti attendu, pas une
promesse de pire cas constant pour des entrées arbitraires.

| Chemin / boucle TypeScript | Coût actuel | Traitement |
| --- | --- | --- |
| `createVersionRegistry` : `for version` + `versions.some` sur kind/identité/owner | O(N²), égalité structurée répétée entre identités différentes | P0 principal |
| Même fonction : `distinct.some(sameReference)` | O(N×V) | P0 Set exact, ordre du premier exemplaire conservé |
| `validateVersionContext` : `versions.find` pendant insertion | O(N×V), puis égalité complète seulement pour doublon exact | P0 conditionnel R1.1 |
| Même contexte : `versions.some` sur même identité/owner | O(V²) même sans lignée | P0 conditionnel R1.1 |
| Même contexte : chaque racine parcourt ses prédécesseurs, `find` sur V, `visited.some`, `missing.some` | Jusqu'à O(V³) pour une chaîne complète avec les scans actuels ; même un lookup indexé laisse O(V²) si chaque suffixe est retraversé | Hors changement initial automatique ; autorisation ciblée requise si nécessaire |
| `createVersionEnvelope` : `provenance.some` à chaque source | O(P²) par enveloppe | Ne pas confondre avec owner ; observer si grandes provenances, pas de fermeture historique nouvelle |
| `lookupExact` : `registry.versions.find` pour chaque ref selected | O(R×V) | P1 conditionnel |
| `createPortfolioManifest` : `seen.some(sameIdentity)` par table | O(Σ R_kind²) | Opportunité P1 distincte des lookups, à auditer si dominante |
| `collect` : `versions.some` par ref requise | O(R×V) | Résiduel M5/M6 à mesurer ; diagnostics de port distincts |
| `validateResolved` : filtres capacités/AP/PTEC/endpoints/partitions, `ofKind` répété pour catalogues | Produits des tailles des listes, dont O(S²) pour partitions | P2 ou proposition séparée après mesure |
| Grille : `expectedCells.some` contenant `actuals.filter` | O(C²), C tableaux temporaires ; autres contrôles subs/ordre imbriqués | P2 explicitement différé |

Pour C TA d'identités distinctes sans conflit, le scan owner compare C(C−1)
couples ordonnés : 264 TA petit sparse, 5280 moyen sparse, environ ×401 couples.
`equalImmutableValues` utilise `Object.entries`, `every`, puis `find` par champ,
récursivement. Les owners TA imbriqués rendent ce coût particulièrement élevé.
Ne pas optimiser cette égalité générale : elle reste l'oracle des collisions
sur enveloppe entière, insensible à l'ordre des clés de records.

Pipeline vérifié : M1 registre ; M2 manifeste + registre + lookups ; M3 **M2
complet** + validation structurelle ; M4 wrapper Snapshot unknown + M3 + borne
knowledgeDate. M5 lit/valide Snapshot, adapter fait les lookups, `collect`
reconstruit un registre et vérifie la correspondance, certification reconstruit
un deuxième registre puis résout/valide. Le setup adapter, exclu de M5, contient
un troisième registre. M6 suit le même principe Current sans borne Snapshot.
Les différences M3−M2 ne sont pas des timings instrumentés de phases.

Preuves : [synthèse numérique](./proofs/r12-perf/summary.json),
[attribution CPU](./proofs/r12-perf/cpu-summary.log), profils bruts
[medium-sparse-M3](./proofs/r12-perf/medium-sparse-M3.cpuprofile),
[small-dense-M1](./proofs/r12-perf/small-dense-M1.cpuprofile),
[small-dense-M5](./proofs/r12-perf/small-dense-M5.cpuprofile).
Les nombres de samples/timeDeltas bruts relus concordent : 9372/14096,0 ms,
170/259,8 ms, 359/547,0 ms. Dans M3 moyen sparse, registre **88,44 % inclusif**,
callback owner **77,85 % inclusif**, égalité **73,90 % self**, lookup **5,90 %
inclusif**, contexte **4,76 % inclusif**, grille callback **1,90 %**.
Ces inclusifs se recouvrent et ne s'additionnent pas. Les lignes de profils sont
celles du JS compilé `.test-dist-v2`, pas du TypeScript. Sampling/JIT/async limitent
l'attribution ; aucun profil dense moyen interrompu disponible.

Baseline conservée : **8604 versions** moyen sparse ; médianes M1 **12604,1 ms**,
M3 **14035,9 ms**, M5 **28179,2 ms**. Moyen dense : six interruptions à 30 s,
quatre cold M1–M4 et deux setups M5/M6 avant lecture ; durée initiale supérieure
à la limite de 30 secondes pour ces phases, durée de lecture M5/M6 inconnue.
Aucun timeout converti en durée supposée ou en gain chiffré.

## 3. Cartographie des invariants séparés

| Garantie | Contrôle conservé / diagnostic |
| --- | --- |
| Référence exacte unique | kind + EntityId + VersionId ; répétition acceptée si enveloppe entière structurellement identique, un premier exemplaire exposé |
| Collision divergente même référence | `DIVERGENT_VERSION_COLLISION` : comparer owner, payload, predecessor et provenance, pas seulement payload ; ordre des listes significatif |
| Owner immutable d'une identité | Toutes versions même kind/EntityId ont le même owner ; `IMMUTABLE_OWNER_MISMATCH`, branches/racines multiples admises |
| Mapping owner→identité | Pour les seuls kinds de `uniqueOwners`, deux EntityId différents même owner refusés par `OWNER_IDENTITY_CONFLICT` ; plusieurs versions même identité admises |
| Couples PT/RT stables | Cas spécialisés du mapping précédent : Project–Team et Reservation–Team, tombstones compris, contexte fourni même non selected ; pas nouvel error code |
| Cellule TA stable | association kind/id + SubPeriodId → TAId unique ; distinct de la complétude/lifecycle de grille selected |
| Contextes R1.1 | Prédécesseur même identité, self/cycle interdits ; absent ⇒ `not-established` et missing exact ordonné ; branches autorisées ; `identicalRepetitions` conserve chaque répétition |
| Provenance | Champ liste requis par enveloppe, `[]` représente provenance métier absente ; sources facultatives/non chargées admises, self/doublon/malformation refusés ; pas assimilation à predecessor ni fermeture/cycle de provenance ajouté |
| Graphe selected | Une version par identité selected, fermeture exacte, tombstones/Actuals/PTEC/Capacity/catalogues et borne Snapshot inchangés ; absence structurelle refusée même si contexte non établi permis |
| Frontières et immutabilité | unknown toujours validé ; copies profondes, gel profond, résultats readonly ; certificat opaque validant, ni persistance ni nouvelle autorité |

Program/Pas et ActualSubPeriod **ne figurent pas** dans `uniqueOwners` : plusieurs
identités partageant Portfolio/AP restent admissibles. Leur owner reste immutable
par identité selon R1.1. Ne pas élargir automatiquement la liste à tous les kinds.
Les IDs Settings restent opaques, différents des IDs métier owners (B2).
Aucun impact sur snapshots historiques, règles tombstones/Actuals, payloads,
enveloppes, liens ou sélection ; aucun chargement Current/historique implicite.
Unicité dans contexte fini fourni, jamais prétendue exhaustive durable (R2).

## 4. Clés canoniques et tables temporaires

Choix proposé : **Maps imbriquées par composant primitif validé**, sans chaîne
concaténée, sans hash et sans sérialisation d'enveloppe/payload. Cela respecte
l'égalité structurée prescrite au plan R1.2 §5.1 ; `referenceLabel` reste réservé
aux messages et ne sert pas de clé. Les IDs acceptent caractères arbitraires et
espaces non vides : conserver les octets `.value`, sans trim/normalisation.
Ne jamais prendre un objet ID comme clé par identité mémoire.

| Table logique (maps imbriquées) | Valeur / utilisation |
| --- | --- |
| kind → entityId.value → versionId.value | Premier exemplaire exact et position ; déduplication, candidats collision et éventuellement lookup |
| kind → entityId.value | Owner canonique de première version ; éventuel drapeau mismatch pour phase owner immutable séparée |
| kind → owner.type → composants owner | EntityId.value de première identité ; mapping inverse pour les seuls `uniqueOwners` |
| PT → projectId.value → teamId.value | PTId stable ; cas spécialisé owner ProjectTeam |
| RT → reservationId.value → teamId.value | RTId stable ; cas spécialisé owner ReservationTeam |
| TeamActual → association.kind → association.entityId.value → subPeriod.entityId.value | TAId stable ; association PT/RT et subPeriod ActualSubPeriod validés, aucune version selected dans la clé stable |

Projection exhaustive des owners après `createOwner` : Project/projectId,
Reservation/reservationId, Team/teamId, Portfolio/portfolioId ;
ProjectTeam/projectId/teamId, ReservationTeam/reservationId/teamId ;
ActualPeriod/actualPeriod.kind/entityId ; PT/pt.kind/entityId ;
PTSubPeriod ou RTSubPeriod/association.kind/entityId/subPeriod.kind/entityId.
Les familles des IDs et kinds constants sont garantis par validation ; conserver
les discriminants dans la représentation logique et prouver la bijection : deux
owners validés ont même clé si et seulement si `equalImmutableValues` les juge
égaux. Tester chaque forme, mêmes octets entre familles, PT versus RT, Unicode,
`/`, `:`, chaînes longues, espaces, `__proto__` et ordre de clés différent.
Map évite les propriétés magiques des objets dictionnaires.

Tables créées après validation des primitives/enveloppes ; elles ne dispensent
jamais `validateExactReference`, `createOwner`, factories métier et copie/gel.
Doublon exact : égalité complète R1.1 obligatoire sur le premier exemplaire,
jamais approximation par owner/clé/payload. Coût attendu des contrôles d'unicité
indexés O(N + taille des clés + égalités des répétitions), espace O(V).
Les tableaux publics conservent leur ordre ; les Maps mutables sont inaccessibles
et abandonnées à la fin de l'opération. Geler une Map ne rend pas ses entrées
immutables : ne pas l'exposer dans `VersionRegistry`/graph/certificat.

## 5. Ordre d'implémentation futur et périmètre

1. Après audit et GO, refaire préflight exact/propre, figer baseline et oracle
   différentiel avant toute modification. Garder mesures/fixtures baseline intactes.
2. **P0-A minimal R1.2** : remplacer dans `createVersionRegistry` le mapping
   `versions.some` par les tables owner→identité, puis `distinct.some` par Set/table
   exacte. Garder appel à `validateVersionContext`, validation/copies et ordre
   des phases. `withVersions` continue à reconstruire un nouveau registre à partir
   de l'ancien + batch, refus atomique sans publication partielle.
3. Tests fonctionnels/différentiels, puis campagne intermédiaire M1–M6/CPU.
   P0-A supprime le goulet mesuré principal mais **ne suffit pas à déclarer tous
   les contrôles d'unicité du registre non quadratiques**, puisque son appel R1.1
   conserve `find` et `some`. Aucun bypass ou duplication contextuelle R1.2 proposé.
4. **P0-B, conditionnel : arbitrage explicite R1.1**. Nécessité algorithmique
   démontrée par §2 : pour satisfaire le critère complet d'unicité, autoriser
   séparément les tables locales exactes/identités dans `validateVersionContext`,
   sans changer API/règles/copier moins. Ce plan ne vaut pas autorisation R1.1.
   Si refusé, livrable futur limité à P0-A et résultat partiel déclaré ; ne pas
   annoncer problème résolu. Ne pas fusionner context et mappings R1.2.
5. Dans P0-B autorisé : conserver validation séquentielle des entrées et collision
   exacte, puis phase owner immutable, puis phase filiation. Tables exactes
   peuvent servir aux parents ; Set local visited/missing garde ordre des listes.
   Cela n'élimine pas les suffixes retraversés : une mémoïsation des terminaux
   root/missing et couleurs de parcours permet O(V+E) pour la filiation (E≤V),
   mais constitue une extension séparée à auditer/autoriser si les mesures ou
   scénarios de lignées la justifient. Préserver l'ordre du premier parent absent
   rencontré depuis les versions en ordre d'origine. Ne pas inventer une
   vérification de provenance transitive. Pas de lignée exhaustive chargée M5.
6. Remesurer P0 complet, identifier le nouveau dominant avant **P1 éventuel**.
   Livrer P1 dans changement séparé si bénéfice mesuré et périmètre approuvé.
7. **P2 différé** : grille TA et scans `graphValidation`, avec campagne propre
   missing/foreign/double/zero/tombstones. **P3 différé** : revalidations/copies,
   unknown et factory `ValidatedPortfolioGraph`, audit de frontières spécifique.
   Aucun P2/P3 intégré automatiquement même s'il devient dominant après P0.

### P1 — lookups exacts, conditionnels

Le profil initial établit 5,90 % inclusif de `lookupExact` dans M3, mais la part
après P0 doit être mesurée : ni gain cumulé extrapolé ni résultat présumé.
Option minimale : dans une résolution, construire une table exacte une fois sur
`registry.versions`, puis traiter les refs dans l'ordre `selectedReferences`.
Coût O(V+R) attendu ; appel validant de chaque ref et diagnostics
`MISSING_EXACT_VERSION`/path `manifest.references.i` conservés.
Signature du resolver et API publique du registre inchangées ; `lookupExact`
isolé peut rester linéaire si coût non dominant hors lots.

Un index reconstruit à chaque `lookupExact` ne résout pas O(R×V). Un cache global,
WeakMap ou champ Map dans le registre contredirait le choix strict de structures
locales par opération : non proposé ici. Si adapter/collect restent dominants,
étudier un helper Domain de lookup **en lot**, tenant ses tables dans l'appel et
retournant seulement DomainResult de versions/diagnostics ; pas d'index exposé.
Cette éventuelle addition d'API et son utilisation par les ports/appels devront
être soumises à audit distinct, sans déplacer les tables vers Application/Adapters.
`READ_REFERENCE_MISMATCH` (missing puis extra) reste distinct d'un lookup manquant.

`manifest.ts` garde un autre O(Σ R_kind²) : remplacement `seen.some` par Set
identité local est une extension P1 explicitement conditionnelle à remesure/audit,
avec même validation par entrée et `MULTIPLE_IDENTITY_SELECTION` au même index.
P1 n'est pas une sélection : refus exact absent, aucune mutation, aucune dépendance
Current, latest, date ou historique, manifestes toujours listes exactes.

## 6. Risques d'équivalence et priorité des diagnostics

Ordre actuel de `createVersionRegistry` à préserver : copie complète d'abord ;
schémas métier de **toutes** les entrées en ordre ; contexte R1.1 (enveloppes et
collisions séquentielles, owners immuables, cycles/parents) ; mapping R1.2 ;
déduplication finale. Une entrée tardive malformed peut donc primer sur une
collision antérieure détectable seulement au contexte. Ne pas lever un mapping
pendant la validation métier. Collision divergente prime sur owner mismatch ;
owner mismatch prime sur cycle ; cycle prime sur mapping concurrent.

La phase owner R1.1 actuelle compare chaque version avec toutes les autres : un
simple check streaming trouve parfois un conflit plus tard, mais le code/path
public est identique (`IMMUTABLE_OWNER_MISMATCH`, path contexte) si cette phase
reste séparée. Même propriété pour mapping (`OWNER_IDENTITY_CONFLICT`, path
registre). Ne pas ajouter un message détaillé issu de la Map, qui changerait le
résultat public. Si un futur diagnostic expose la position/pair, préserver
l'ordre par positions enregistrées ou demander arbitrage avant implémentation.

`identicalRepetitions` garde multiplicité et ordre des répétitions ; le premier
exemplaire exact est retourné. `missingPredecessors` garde ordre du premier
parcours atteignant chaque ref manquante, pas ordre arbitraire des Maps.
Permuter des entrées peut légitimement changer ordre des résultats/diagnostics :
comparer chaque permutation à son propre oracle, sans imposer tri canonique.

Préserver les paths paramétrés, codes, messages, ordre des erreurs, comportement
`withVersions` et erreurs de ports. Multidéfauts à tester : collision + entrée
malformed tardive ; collision + owner ; owner + cycle ; cycle + mapping ; mapping
et défaut de grille ; manifeste invalide + registre invalide ; ref manquante +
version extra dans réponse de port. Les copies restent effectuées aux mêmes
frontières, aucune confiance dans cast/readonly ou input prétendument validé.
Aucun compromis de diagnostic accepté dans ce plan ; si l'équivalence exacte
exige une complexité importante (notamment mémoïsation filiation/lookup en lot),
arrêt du changement concerné pour arbitrage indépendant avant implémentation.

## 7. Tests fonctionnels, frontières et oracle différentiel

Réexécuter R1.1/R1.2 réels, notamment G12-02/04/11/12/13 et audit A1–A7.
Les 154/154 et 86/86 sont résultats **historiques**, aucun test relancé dans cette
session documentaire. Tests futurs discriminants, sur fixtures petites :

- Même ref, enveloppe identique et ordre de clés différent : acceptation,
  déduplication, multiplicité du rapport ; divergences séparées payload/owner/
  predecessor/provenance : même collision. Même identité, versions différentes,
  mêmes owners admises ; owners différents, branches ou racines, refus identique.
- Chaque kind de `uniqueOwners` : deux identités même owner rejetées, versions
  de même identité admises ; Program/Pas/SubPeriod partageant owner acceptés.
  Deux PTId même Project–Team, deux RTId même Reservation–Team, deux TAId même
  cellule refusés, existing/deleted et non selected inclus ; PT/RT avec mêmes
  octets discriminés ; même cellule TA, versions différentes même ID admises.
- Branches, prédécesseurs absents/presents/malformés, cycles directs/indirects,
  parents manquants partagés ; provenance `[]`, sources présentes/absentes,
  provenance seule ne résout pas parent, self/doublon/contradiction fournie
  refusés selon règles existantes. `not-established` conservé en Snapshot autonome.
- Ordres d'insertion, permutations déterministes, collisions précoces/tardives,
  multidéfauts §6 ; IDs adversariaux §4, aucun alias inter-familles/kinds.
- `withVersions` : batch valide, répétitions, batch invalide mixte ; ancien registre
  inchangé, aucun sous-batch observable ; inputs/batch mutés après construction,
  versions/context/graph/certificat gelés profondément et détachés.
- Lookup/ref absente, autre version seule présente, aucune substitution Current/
  provenance/date ; réponses port wrong/extra/id ; Snapshot ancien après Current
  divergent ; mêmes inventories, refs, owners, payloads, tombstones et Actuals.

Frontières futures : `npm run test:v2`, `npm run check:boundaries:v2`,
`npm run typecheck:v2`, `npm run build:v2`, plus commande ciblée du canon R1.2.
G13/A01–A03 et canaris doivent prouver absence de dépendance Domain vers Application,
Adapters, UI, IndexedDB, moteur ou legacy, runtime et types/transitif inclus.
Pas de dépendance externe ni adaptation du garde pour autoriser les tables.

Oracle temporaire : compiler/exécuter **l'algorithme original au SHA c9ef65e…**
(ou 80fe873… dont le métier est identique) dans checkout jetable isolé ; exécuter
le candidat dans un autre arbre/processus. Corpus déterministe seed fixe de cas
valides/invalides, couvrant les 14 kinds, petites branches/chaînes, permutations,
répétitions et chaque famille d'erreurs ci-dessus. Même entrée de données pour
chaque version, aucune mutation partagée entre processus.
Comparer DomainResult complet : ok/refus ; code/path/message et ordre ; références,
owners/payloads/liens ; context status/missing/repetitions ; versions/inventories
et snapshots/certification. Comparaison structurelle avec BigInt typés (transport
sans JSON brut des BigInt), sans ignorer l'ordre des listes ; ordre des clés record
sans importance. Copie/gel testés séparément (non transportables comme propriétés
runtime), pas seulement snapshots de résultats sérialisés.

Conserver corpus, hashes, SHAs, commandes, logs et diff nul dans preuves dédiées.
Aucune copie durable de règles métier dans production/tests : oracle = exécution
de baseline figée, runner de comparaison temporaire retiré après audit ; petites
régressions ciblées pérennes seulement. Aucun nouveau oracle écrit dans ce plan.

## 8. Protocole avant/après de performances

Réutiliser les sept outils existants et fixtures seed **1202**, hashes vérifiés
contre `small.json`/`medium.json`, mêmes volumes et contenus. Baseline 80fe873…
contient les outils et le métier c9ef65e… ; rejouer avant dans checkout isolé sur
même environnement, puis après P0, puis après P1 seulement si autorisé.
Ne pas modifier simultanément générateur, limites, worker et algorithme. Conserver
les anciennes preuves, sortir les nouvelles sous `proofs/r12-perf-fix/` futur.

Ordre : `verify.mjs`, petit dense/sparse/history, moyen sparse, moyen dense ;
grand sparse/dense seulement après inspection des moyens maîtrisés et activation
explicite `--allow-large`. M1–M6 pour chaque scénario, M6 historique reste
NOT_EXECUTED (Current absent), aucun Current ajouté pour le rendre mesurable.
Le README réel est [ici](../../../scripts/benchmarks/r12-perf/README.md).
Commandes de référence futures depuis racine, sorties nouvelles :

```sh
npm run test:v2
node scripts/benchmarks/r12-perf/verify.mjs
node scripts/benchmarks/r12-perf/run.mjs --scenarios=small:dense,small:sparse,small:history --output=docs/steps/PORTFOLIO_VERSIONED/proofs/r12-perf-fix/small-after-p0.json
node scripts/benchmarks/r12-perf/run.mjs --scenarios=medium:sparse,medium:dense --output=docs/steps/PORTFOLIO_VERSIONED/proofs/r12-perf-fix/medium-after-p0.json
```

Même protocole : enfant neuf par scénario/API, un cold, un warm-up, trois mesures,
heap old-space 1024 Mio, deadline parent 30 s **par phase**, setup séparé. Un seul
benchmark actif. Baseline matérielle Apple M4/10 CPU/16 Gio, Darwin 27 arm64,
Node 24.21.0/npm 11.19.0/TS 5.9.3 ; enregistrer matériel, versions, disponibilité
mémoire, charge concomitante et écarts. Si environnement différent, comparer aussi
un rejeu avant contemporain, sans confondre avec les timings historiques.

Pour chaque M/scénario : médiane/min/max/SD population/IQR, cold et warm-up séparés,
CPU user+system, heap endpoints/deltas/après GC, RSS points et lifetime maxRSS,
versions/associations/TA et hashes, setup/phase, interruptions/signaux, erreurs,
répétitions terminées et conditions. Écart relatif `(après−avant)/avant ×100`
et ratio seulement pour expériences terminées comparables ; dispersion rendue
visible, hausse inexpliquée petit ou mémoire doit être analysée.

Pour dense moyen initial : écrire « initial >30 s » pour phases interrompues,
pas de médiane/min/max/ratio ni pourcentage d'accélération inventé ; lecture
M5/M6 baseline non démarrée. Une réussite après indique capacité à terminer sous
limite, pas gain exact. Ne jamais compter interruption ou résultat invalid comme PASS.

Profils séparés `--profile` (Inspector 1 ms), mêmes M1/M5 petit dense et M3 moyen
sparse que baseline ; ajouter M1/M5 moyens après pour localiser le résiduel, puis
moyen dense si terminé. Résumer avec `profile-summary.mjs`, ne pas mélanger temps
profilés et statistiques ordinaires. Vérifier owners, contexte, lookup, manifeste,
collect, grille, copies et GC : disparition du dominant owner n'exclut pas un
nouveau dominant quadratique. M5 complet et son setup doivent être réévalués.

Mémoire : endpoints heap sont bornes basses des pics, maxRSS couvre vie du process,
GC après await ne prouve pas libération de toutes références ; aucun faux résultat
de fuite/pic. Polling `ps` refusé EPERM à baseline : signaler absence de mesure
au lieu de présenter un pic exclusif ou d'ajuster l'outil silencieusement.
Deux tailles et un meilleur M1 ne suffisent pas à prouver une loi de complexité :
combiner inspection des boucles, comptage d'opérations dans laboratoire temporaire
si nécessaire, et profils M1–M6. Des petites familles croissantes supplémentaires
peuvent éprouver versions multiples/lignées, **hors scénarios de référence** et
rapportées séparément ; ne pas faire passer v10000 selected pour 10000 versions fournies.

## 9. Critères de réception du futur correctif

| Gate | Preuve nécessaire |
| --- | --- |
| Équivalence stricte | Tests R1.1/R1.2 + corpus différentiel sans divergence, mêmes erreurs/ordre/contextes et sorties ; copie/gel/atomicité batch inchangés |
| Unicité registre | Plus de scan de l'ensemble des versions par version pour références/owner immutable/mapping/PT/RT/TA ; inclure le contexte appelé, pas seulement P0-A |
| Pipeline complet | M1–M6 comparés, M5 réévalué ; CPU ne révèle aucun autre quadratique dominant sur volumes représentatifs ; si manifeste/lookup/grille devient dominant, correctif partiel déclaré et nouvelle décision |
| Scénarios moyens | Moyen sparse/dense maîtrisés dans garde-fous de campagne, erreurs et interruptions rapportées ; aucun SLA nouveau, grand conditionnel |
| Architecture | Frontières/gardes/typecheck/build PASS, tables exclusivement internes Domain ; aucun certificat/index historique persistant, aucune sélection implicite |
| Traçabilité | Baseline/SHAs/hashes/environnement/commandes/raw/profils conservés ; revue diff et diff-check, scope P0/P1 autorisé exact |

Aucun seuil chiffré de gain inventé : gains réels/dispersion à auditer. Les critères
techniques complets ne peuvent être annoncés satisfaits si P0-B est refusé ou si
un dominant P2 subsiste. Pas de DONE R1.2 par seule accélération M1.

## 10. Limites et arbitrages avant GO

- **A-PERF-01 : R1.1.** Autoriser ou refuser explicitement l'extension P0-B
  nécessaire aux unicités appelées par registre ; API/contrats restent inchangés.
  Mémoïsation filiation/provenance longue reste une décision distincte, pas
  incluse implicitement. Sans accord, limiter P0-A et indiquer réception partielle.
- **A-PERF-02 : diagnostics.** Objectif résultat public exact et ordre historique ;
  aucune fusion des phases. Arbitrage préalable si une divergence apparaît,
  notamment parcours memoïsé/diagnostics des ports, jamais renommage silencieux.
- **A-PERF-03 : P1.** Décider après P0 d'une résolution locale seule ou d'un helper
  Domain en lot avec éventuelle addition d'API ; unicité de manifeste conditionnelle.
  Aucune Map/cache exposée ni mutation du registre.
- **A-PERF-04 : réception/performance.** Si grille, manifeste ou contexte résiduel
  dominent, rapporter limite, ne pas étendre silencieusement à P2/P3. P2 exige ses
  tests missing/foreign/double/zero/tombstones ; P3 exige audit confiance/immutabilité.
- Limites de campagne conservées : synthétique/mémoire, pas UI/IDB/moteur/Windows,
  grands BigInt/pile/lignées exhaustives non qualifiés. Pas d'index d'autorité
  historique supplémentaire, ni garantie durable anticipée de R2.

**Conclusion : le goulet principal peut être corrigé par un changement algorithmique
minimal interne au Domain, sans changer les contrats publics, les enveloppes ou
l'architecture hexagonale.** La suppression complète des unicités quadratiques
nécessite toutefois un GO ciblé sur l'implémentation contextuelle R1.1 appelée ;
P1 dépend des remesures et peut rester interne au resolver. Une API de lot éventuelle
exige son propre arbitrage. P2/P3 restent différés. Ce plan est à auditer, aucune
optimisation n'est autorisée maintenant. **R1.2 IN REVIEW ; R1.3/R1.4/R2 NOT STARTED.**
