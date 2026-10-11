# FlowPlan2 V2 — R1.2-PERF-FIX : plan de correction

2026-10-11 — **P0-A/P0-B AUTORISÉS ET IMPLÉMENTÉS, audit du correctif requis**.
Baseline de réalisation `4effcfce23bb1e835201c9fe0c8f06967ce67339`.
Audit indépendant favorable du plan et GO explicite P0-A/P0-B communiqués par
la mission utilisateur. Contrats publics R1.1/R1.2 inchangés ; P1 reste soumis
à décision distincte, P2/P3 hors périmètre. Résultats et verdicts séparés au §11.
**R1.2 IN REVIEW ; R1.3/R1.4/R2 NOT STARTED.**

Les sections 1–10 ci-dessous conservent le plan audité **avant GO** et ses
conditions historiques ; l'état de réalisation du §11 prévaut sur leurs mentions
PLAN ONLY/GO non accordé. Aucune requalification rétroactive de R1.1.

État historique du plan :

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

## 11. Réalisation P0-A/P0-B — 2026-10-11

### Autorisation, baseline et séquence

Mission utilisateur : audit indépendant favorable du présent plan, GO explicite
P0-A et extension P0-B strictement algorithmique. Baseline obligatoire
`4effcfce23bb1e835201c9fe0c8f06967ce67339`, branche active
`rewrite/portfolio-versioned`, HEAD exact, arbre propre avant code ; fetch origin
code 0, origin exact, divergence 0/0. Aucun AGENTS.md applicable ni modification
concurrente constatée au préflight. Les conditions historiques « GO non accordé »
des sections précédentes sont levées **seulement pour P0-A/P0-B**.

A : clone isolé réel de la baseline, compilation TypeScript existante, oracle
initial 325 cas et hashes/réponses enregistrés **avant production**. B : registre
seul optimisé, 154 tests existants puis 174 avec régressions, oracle 325 puis
563 cas (extension adversariale rejouée sur baseline), campagne intermédiaire
M1–M6 petit dense/moyen sparse et profil M3, avant toute modification R1.1.
C : P0-B appliqué, 174 tests, ciblés R1.1/R1.2 et oracle complet. D : campagne
complète sur les cinq scénarios puis profils séparés. E : rapport et verdicts.
Les clones de laboratoire portent des commits locaux isolés pour satisfaire
le contrôle `productionDiff` du lanceur inchangé ; ils ne sont jamais poussés.
[SHAs, patches, commandes et protocole](./proofs/r12-perf-fix/README.md).

### Changements réalisés et invariants

- **P0-A** : `versionRegistry.ts` utilise des tables temporaires owner→EntityId
  pour les 11 mappings et une table de références pour la déduplication finale.
  La liste distincte conserve le premier exemplaire et son ordre ; le rapport
  conserve chaque répétition. Validation métier complète, contexte R1.1 puis
  mapping restent trois phases séparées. Tombstones/non selected restent inclus.
  `withVersions` demeure une reconstruction atomique copiée/gelée, sans publication
  partielle. `lookupExact` reste inchangé et linéaire : P1 n'est pas anticipé.
- **P0-B interne R1.1** : `validateVersionContext` indexe les enveloppes exactes,
  puis les premiers owners par identité dans une phase séparée. L'égalité complète
  reste obligatoire pour collision exacte ; l'égalité structurée existante reste
  utilisée pour l'owner immuable. Le même parcours des racines/prédécesseurs utilise
  le lookup indexé ; les ensembles locaux visited/missing remplacent seulement
  les recherches de membership. `visited` contient les enveloppes canoniques
  uniques issues de la table exacte, jamais des objets ID utilisés comme clés
  d'identité mémoire. Listes et diagnostics restent dans l'ordre de rencontre.
  Aucun suffixe mémorisé, aucune fermeture historique chargée ou provenance traversée.
- **Helper Domain interne** : `localVersionTables.ts`, trie de Maps natives par
  composants primitifs. Références : kind, famille/valeur EntityId, famille/valeur
  VersionId ; owners : kind/type et tous composants famille/kind/valeur validés.
  Aucun séparateur, hash, JSON, trim, normalisation ou propriété magique de dictionnaire.
  Projection exhaustive des dix formes d'owners, PT/RT et Project/Reservation
  discriminés. Même composants ⇔ égalité structurée des owners validés ; l'ordre
  des clés record n'intervient pas. Tables locales abandonnées après l'opération,
  jamais exposées dans registre/graphe/certificat ni persistées.

Plus aucun scan de l'ensemble des versions **par version** pour les unicités
ciblées : références exactes, owner immuable, mappings owners/PT/RT/TA. Coût
amorti attendu O(N + taille des composants + égalité des répétitions), espace
O(V), hors validations/copies et filiations. Le parcours des suffixes de longues
chaînes reste potentiellement quadratique : aucune mémoïsation autorisée ici.
`createVersionEnvelope`/provenance, égalité générale, APIs, schémas unknown,
copies/gel, manifeste, resolver, graphValidation, Application et adapter inchangés.
R1.1 reste DONE ; ce changement ne requalifie pas sa livraison historique.

### Équivalence et validations réellement exécutées

[Oracle et réponses complètes compressées](./proofs/r12-perf-fix/README.md#oracle) :
**563/563 cas strictement équivalents**, P0-A et P0 complet contre les vrais modules
baseline isolés, aucun écart inexpliqué. Tous les 14 kinds et 11 mappings, owners
composites/discriminants, octets adversariaux, permutations, répétitions/collisions,
branches/parents manquants/cycles/provenance, malformations/multidéfauts, lots,
manifestes, tombstones, Snapshots et lectures/certifications/inventaires sont inclus.
Comparaison de toutes les valeurs et erreurs code/path/message/ordre, BigInt typés,
listes ordonnées ; pas un simple booléen. Corpus SHA256
`2e273951190897cef1fb7cea91600ebd2ddee53c9c2540c89fec00a02879c100`, réponses
`e745c1fe476a882a0d6f63e654dfcfe27c35c5d9940c35f15f934670c30255df`.
[Comparaison intégrale](./proofs/r12-perf-fix/differential.log).

| Vérification de cette session | Résultat / preuve |
| --- | --- |
| `npm run test:v2`, P0-A puis P0 complet | 174/174 PASS ; [P0-A](./proofs/r12-perf-fix/p0-a-tests.log), [P0](./proofs/r12-perf-fix/p0-tests.log) |
| R1.1 primitives/enveloppes + audit A1–A7 | 32/32 PASS, [journal ciblé](./proofs/r12-perf-fix/r11-targeted.log) |
| R1.2 métier et frontières, G12-01 à G12-13 | 103/103 PASS (92 métier + 11 frontières), [journal](./proofs/r12-perf-fix/r12-targeted.log) |
| Nouveaux tests pérennes | 20 : 14 kinds + 3 registre/composites/atomicité, 3 contexte/diagnostics/bytes |
| Copie, gel profond, absence de mutation, lot atomique | Tests séparés PERF-P0 et existants R1.1/R1.2 PASS, non déduits du transport JSON |
| `npm run typecheck:v2` | PASS, [journal](./proofs/r12-perf-fix/typecheck.log) |
| `npm run build:v2` | PASS, [journal](./proofs/r12-perf-fix/build.log) |
| `npm run check:boundaries:v2` | PASS, [journal](./proofs/r12-perf-fix/boundaries.log), gardes inchangés |
| `verify.mjs` des benchmarks | Trois variantes PASS, [journal](./proofs/r12-perf-fix/verify.log), distinct des gates |
| `git diff --check` et revue complète | PASS avant commit ; scope limité aux 5 sources/tests, 4 documents et nouvelles preuves |

174 est le nombre de tests distincts V2, pas la somme des réexécutions ciblées.
Aucun skip/todo/cancelled. Les anciens résultats 154/86 des canons restent
historiques. Windows, browser et multi-TZ non réexécutés : modules dormants,
bootstrap/runtime inchangés ; aucune nouvelle qualification de ces plateformes.

### Remesure M1–M6 et mémoire

Les sept outils/fixtures `scripts/benchmarks/r12-perf/` sont **inchangés** ; hashes
initiaux conservés, hashes de fixtures contrôlés avant/après pour chaque scénario.
Anciennes preuves `proofs/r12-perf/` intactes. Même Apple M4/10 CPU/16 Gio,
Darwin 27 arm64, Node 24.21.0/npm 11.19.0/TS 5.9.3. Environnement et commandes
absolues dans les JSON : un enfant neuf par scénario/API, heap 1024 Mio,
cold/warm-up puis trois mesures, deadline 30 s **par phase**, un benchmark actif.
Le rejeu baseline a coexisté avec quelques tests/compilations/oracles courts,
pas un autre benchmark ; machine non réservée, pression OS non instrumentée.

- [Rejeu initial complet](./proofs/r12-perf-fix/baseline-replay.json) : 23 expériences
  complètes, 6 timeouts denses, 1 M6 historique non exécuté.
- [P0-A seul](./proofs/r12-perf-fix/p0-a-comparison.md) : 12 expériences complètes
  (M1–M6 petit dense/moyen sparse), attribuées séparément.
- [P0 complet](./proofs/r12-perf-fix/p0-measures.json) : 24 expériences complètes,
  **5 timeouts denses M2–M6 cold**, M6 historique absent non exécuté ; 120 appels
  complets dont 72 mesures statistiques. Aucun refus DomainResult/crash présenté
  comme réussite. Grand non exécuté, moyens non maîtrisés.
- [Tableau intégral M1–M6](./proofs/r12-perf-fix/comparison.md) et
  [JSON statistique](./proofs/r12-perf-fix/p0-summary.json) : cold/warm-up, médiane,
  min/max/SD population/IQR, CPU user+system, heap endpoints/deltas/GC, RSS lifetime,
  setups et interruptions. [Comparaison aux mesures historiques](./proofs/r12-perf-fix/historical-comparison.md).

Médianes en millisecondes, **avant = rejeu contemporain** :

| Scénario | M1 avant → P0 | M3 avant → P0 | M5 avant → P0 |
| --- | ---: | ---: | ---: |
| Petit dense | 240,0 → 48,9 | 266,7 → 73,3 | 527,3 → 150,8 |
| Petit sparse | 62,9 → 28,4 | 73,7 → 37,1 | 138,0 → 72,9 |
| Petit historique | 61,9 → 27,3 | 68,7 → 37,1 | 133,4 → 69,4 |
| Moyen sparse | 12582,4 → 441,4 | 14119,4 → 1851,0 | 28113,7 → 4111,7 |
| Moyen dense | initial cold >30 s → 2816,5 | cold >30 s → cold >30 s | avant lecture non commencée (setup >30 s) → cold lecture >30 s |

Étape **P0-A seule**, moyen sparse : M1 939,4 ms ; M2 1920,6 ; M3 2377,6 ;
M4 2522,0 ; M5 5141,6 ; M6 4934,3. P0-B explique seulement la différence
supplémentaire vers les résultats P0 complets, pas le gain initial P0-A.
Moyen sparse P0 : cold M1 470,3/M5 4082,1 ; M5 mesuré 4104,9–4118,9,
SD 5,7/IQR 7,0 ms ; CPU médian M1 496,6/M5 4262,7 ms.
Moyen dense M1 : cold 2915,3, médiane 2816,5, plage 2800,0–2826,0,
SD 10,7/IQR 13,0, CPU médian 3176,0 ms. Aucun ratio/pourcentage à partir
des timeouts ; la durée initiale réelle dense demeure inconnue.
Les setups denses M5/M6 terminent en 13820,6/13722,1 ms, puis la lecture cold
est interrompue à 30 s ; ce n'est plus une interruption pendant le setup.

Mémoire : moyen sparse M1 heap endpoint 86,8→67,0 Mio, RSS lifetime
228,7→258,2 ; M5 heap 136,4→63,0, RSS 273,5→295,8 ; M6 RSS 268,4→297,0.
Le surcoût RSS d'environ 8–13 % sur ces expériences est documenté, avec des
endpoints heap variables selon GC et durée ; pas une taille exclusive des tables.
M1 dense P0 : heap endpoint **332,0 Mio**, RSS lifetime **498,9 Mio**, pas de
comparaison complète disponible avant. Aucun OOM/crash sur opérations terminées,
mais pas de qualification mémoire complète de M2–M6 dense interrompus ni du grand.
Les maps temporaires augmentent l'espace local O(V) ; aucune fuite démontrée ni
pic intra-appel prétendu. Polling externe `ps` indisponible (`spawn EPERM`), heap
endpoints = bornes basses, maxRSS = processus entier fixture/setup compris.

### Profils CPU et réponses aux sept questions

[Profils bruts P0](./proofs/r12-perf-fix/p0-cpu/),
[synthèse CPU](./proofs/r12-perf-fix/p0-cpu-summary.log),
[profil intermédiaire P0-A](./proofs/r12-perf-fix/p0-a-cpu-summary.log).
P0-A M3 moyen sparse : 1602 samples/2422,7 ms ; P0 M3 : 1256/1894,4 ms ;
P0 M5 moyen sparse : 2799/4210,5 ms ; M1 dense : 1891/2864,3 ms.
Petits M1/M5 denses, moyens M1/M3/M5 sparse et M1 dense profilés séparément,
une mesure profilée par opération (18 appels complets, plus 3 intermédiaires).
Pas de profil dense M5 achevé : cold échoue avant la phase profilée de l'outil ;
aucune attribution CPU directe inventée pour ces interruptions.
Les pourcentages inclusifs se recouvrent, ne s'additionnent pas ; petits profils
courts particulièrement sensibles à Inspector/JIT/GC. Lignes = JS compilé.

| Question de réception | Observation mesurée et portée |
| --- | --- |
| 1. Scan owner du registre disparu ? | Oui, inspection des tables et disparition du callback quadratique. Égalité structurée self M3 sparse : 73,90 % historique → 0,48 % P0 ; égalité générale conservée. |
| 2. Autre goulet dans validateVersionContext ? | Plus de find/some sur versions pour unicités. M3 sparse contexte inclusif 27,64 % P0-A → 9,86 % P0, self 0,08 %. Sur M1 dense inclusif 42,89 %, self 0,63 % : essentiellement validation/copie appelée, pas ancien scan. Longues chaînes fournies restent non qualifiées/potentiellement quadratiques, sans memo. |
| 3. Lookups exacts dominants ? | Oui : M3 sparse 44,84 % inclusif/30,61 % self ; M5 39,24 % inclusif/28,58 % self. Collect 49,68 % inclusif et 13,80 % self (recouvrement). Manifeste 7,50 % M3/8,99 % M5. P1 distinct à décider/auditer pour lookups et unicité de sélection ; aucune API de lot ajoutée ici. |
| 4. Grille TA prochain problème ? | Coût significatif : callback grille JS ligne 120 = 13,99 % M3 sparse/5,99 % M5. Pas encore dominant devant lookup sur ce scénario ; dense interrompu en amont ne permet pas d'isoler son coût. P2 reste interdit. |
| 5. M5 compatible avec poursuite R1.3 ? | Petit dense 150,8 ms, sparse 72,9 ms ; moyen sparse 4,11 s et dense cold >30 s. Pas de GO performance pour R1.3, aucun SLA arbitraire ajouté. |
| 6. Mémoire maîtrisée ? | Opérations terminées sous garde-fou sans OOM ; surcoût RSS explicité, M1 dense 332 Mio heap/499 Mio RSS. Qualification globale dense/grand non obtenue. |
| 7. Immuabilité/certification conservées ? | Oui : oracle complet, tests séparés de copie/gel/atomicité, G12-12/13 et architecture PASS, aucune frontière unknown/certification réduite. |

Sur M1 dense, `dataRecord` self 57,37 %, copie self 16,43 %, copie inclusif
47,63 %, GC 3,06 % : les coûts nécessaires de validation/copie deviennent visibles.
P3 reste interdit. Les seuls changements de production sont les algorithmes P0.

### Deux verdicts et livraison

**A — Correction P0 techniquement conforme : OUI**, sous réserve du nouvel audit
indépendant. Équivalence stricte observée, scans ciblés supprimés, 174 tests et
13 gates PASS, aucun contrat public ni architecture modifié. Cette lettre A est
le nom du verdict demandé, pas une classification de performance globale.

**B — Performance R1.2 redevenue acceptable : NON. Classification globale C
maintenue** (blocage observé au moyen dense). Les petits sont nettement améliorés ;
le moyen sparse termine mais M5 reste à plusieurs secondes ; M2–M6 dense restent
interrompus. Une appréciation A (absence de blocage mesuré) ou B (réserves compatibles
avec poursuite) ne serait pas étayée. Le correctif P0 ne résout donc pas à lui seul
R1.2-PERF. Prochaine décision : périmètre P1 indépendant à instruire sur les lookups
et le manifeste, puis remesure avant toute autre optimisation. Aucun GO implicite
P1/P2/P3, aucune grille/certification/revalidation contournée.

Fichiers : trois modules Domain (dont helper nouveau), deux tests pérennes,
ce plan, canon R1.2, current_plan/current_canon, nouvelles preuves uniquement
sous `proofs/r12-perf-fix/`. Registre de réutilisation inchangé : aucune reprise
legacy ou évolution de responsabilité. Sources benchmark/package/lock/config,
archives, R1.1 canon et lots ultérieurs inchangés. Revue complète et diff-check
avant commit normal/push sans force ; SHA final et correspondance local/distant
communiqués après livraison, sans auto-référence circulaire dans les fichiers.
**R1.2 reste IN REVIEW jusqu'à audit indépendant du correctif ; R1.3/R1.4/R2
NOT STARTED. Arrêt après commit/push.**
