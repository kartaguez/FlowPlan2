# FlowPlan2 V2 — R1.2 : graphe versionné et validation structurelle

## Clôture R1.2 — DONE — 2026-10-11

Clôture documentaire autorisée par la mission utilisateur sur les résultats
audités, baseline obligatoire `5eb3f4320fa995c730be3090f0a4a284247efdfc`.
Préflight branche `rewrite/portfolio-versioned`, fetch réussi, HEAD/origin exacts,
divergence 0/0 et arbre propre. **R1.2 DONE avec limite LOAD non bloquante** :
invariants fonctionnels/architecturaux, équivalence différentielle, frontières
hexagonales et certification opaque validés. Le chargement initial volumineux
n'est pas le cas d'usage critique retenu ; **C reste la classification historique
LOAD**, jamais réécrite en A/B. EDIT et TRENDS ne sont pas validées.

[Contrats PERF-LOAD / PERF-EDIT / PERF-TRENDS et décision P3-C](./rewrite_decisions.md#clôture-r12-et-exigences-de-performance--2026-10-11)
applicables sans dérogation : Domain valide, Application orchestre, ports
indépendants des adaptateurs sans autorité de certification, unknown revalidé,
copies/gel/détachement, références exactes, snapshots autonomes, certificat opaque
unique. A-R12-01–09 et B1–B4 restent inchangés.

| Élément | Statut actuel |
| --- | --- |
| R0 / R0.1 | DONE |
| R1.1 | DONE |
| R1.2 | DONE |
| PERF-LOAD | Acceptée avec réserve documentée |
| PERF-EDIT | À qualifier |
| PERF-TRENDS | À qualifier |
| P3-C | Étude terminée, non implémentée |
| R1.3 | NOT STARTED |
| R1.4 | NOT STARTED |
| R2 | NOT STARTED |

## Bilan audité des correctifs

Les audits indépendants favorables de chaque correctif sont les résultats
communiqués par la mission de clôture. Les preuves contemporaines ci-dessous
conservent leurs statuts historiques ; aucun rapport d'audit absent n'est créé.

| Correctif | Réalisation et SHA livré sur la branche | Preuves et oracle différentiel sans divergence |
| --- | --- | --- |
| P0 | Corrections initiales des parcours et structures de registre ; tables temporaires d'unicité et contrôles internes du contexte. `8ec0c7318c782ca407063f3c3d44dc8ff7f4df53` | [Preuves P0](./proofs/r12-perf-fix/README.md), [comparaison](./proofs/r12-perf-fix/comparison.md) ; 563 cas ; 174 tests V2 PASS |
| P1 | Optimisations des recherches exactes par lot et contrôles associés, unicités du manifeste. `ee6e26fe9b056fbbd62ffb72be9989385a962e5f` | [Rapport P1](./proofs/r12-perf-p1/report.md) ; 941 réponses ; 189 tests V2 PASS |
| P2 | Suppression du contrôle quadratique de la grille TeamActual, compteur local des couples. `9490d32eb9ec671ed335b4fa3b7f8debc0dbfe94` | [Rapport P2](./proofs/r12-perf-p2/report.md) ; 1 254 réponses ; 194 tests V2 PASS |
| P3-A1 | Pile locale des ancêtres lors des copies profondes ; copie/gel et détection de cycles conservés. `1d1c66b2b38a6599f1ab0950c4dd1fdffd1e6e74` | [Rapport A1](./proofs/r12-perf-p3-a1/report.md) ; 1 288 réponses ; 213 tests V2 PASS |
| P3-B | Suppression de la copie intermédiaire de contrôle du payload, acquisition lexicale B1/B2 et 14 schémas uniques. `4b98501a99a94a92c64e6b4a9390766a2915b6e6` | [Rapport B](./proofs/r12-perf-p3-b/report.md) ; 2 259 réponses ; 245 tests V2 PASS |

Chaque correctif a fait l'objet de tests, d'oracles différentiels et d'un audit
indépendant. Les comptes sont ceux des suites de chaque campagne, non additifs :
les tests ciblés/rejoués ne sont pas de nouveaux tests distincts, les corpus
successifs incluent les cas précédents. Aucun test ou benchmark relancé ici.

PERF-LOAD accepte plusieurs secondes sur portfolio volumineux avec réserve :
[après P3-B](./proofs/r12-perf-p3-b/comparison.md), médianes Snapshot moyen dense
M5 ≈7,23 s et Current moyen dense M6 ≈7,00 s, propres aux fixtures/environnement,
setup mémoire séparé/exclu, sans SLA ni garantie universelle. Grands non exécutés,
M6 historique non exécuté, limites CPU/mémoire/dispersion conservées.
PERF-EDIT reste priorité critique à qualifier sur portfolio chargé ; PERF-TRENDS
reste à qualifier, maximum 100 projets sélectionnés sans limite totale portfolio
ni plafond arbitraire de snapshots. Les dépendances historiques peuvent couvrir
l'ensemble du portfolio ; aucun sous-portfolio présumé équivalent.

P3-C : **étudié, non implémenté et abandonné dans le cadre actuel**. Deux registres
indépendants, frontières Application/Domain et seconde acquisition de certification
maintenus ; aucune autorité de confiance/certification intermédiaire, aucune
optimisation supplémentaire sans nouveau besoin mesuré. Ce n'est pas un correctif.
Aucun cache, projection partielle ou agrégation préalable introduit/autorisé.

Clôture uniquement documentaire ; aucun démarrage ou cadrage R1.3/R1.4/R2.
Arrêt après commit/push normal. Le corps ci-dessous conserve les livraisons
historiques : ses statuts et prochaines actions antérieurs ne remplacent pas
cette clôture ; ses preuves et contrats non amendés restent intacts.

## Historique des livraisons R1.2

## Addendum R1.2-PERF-P3-B — 2026-10-11

B2 avec acquisition B1 livré sur autorisation utilisateur, baseline exacte
`6b1d65f15f6479b14be721417a5a9bc036257d36`. Seul fichier production modifié :
`domain/portfolio/payloadValidation.ts`. L'orchestrateur privé reçoit l'entrée
unknown ; branche autonome : copie complète ; branche version : inspection/ref
puis enveloppe complète, diagnostics immédiatement propagés. La sortie acquise
est capturée par const ; un checker lexical sans paramètres reprend textuellement
les 14 schémas. Invocation immédiate ; retour de la copie autonome ou de
l'enveloppe initiale, sans relire le payload source. Aucun export privilégié,
callback/await, brand, cache ou type faisant autorité sur la provenance.
Les deux assertions terminales de types dépendants préexistantes sont conservées.

245 tests PASS dont 32 nouveaux ; ciblés R1.1 51 / R1.2 155 PASS ; G12-01–13,
P0/P1/P2/A1 restent couverts. Oracle A1 réel isolé : 1 288 réponses historiques
rejouées puis 971 extensions scellées avant production ; **2 259 réponses,
zéro divergence**. Audit source/JS et exports runtime PASS ; schémas uniques,
gel/détachement et frontières conservés. Deux registres et certification opaque
inchangés. Frontières/typecheck/build PASS.
[Rapport et preuves contemporaines A1/B](./proofs/r12-perf-p3-b/report.md).
Conformité technique PASS ; performance globale **C** : le gain local ne démontre
pas l'acceptabilité globale. **R1.2 IN REVIEW ; R1.3/R1.4/R2 NOT STARTED**.
Aucun commencement P3-C ; audit indépendant nécessaire avant clôture.

**R1.2 — IN REVIEW**, 2026-10-11. Implémentation autorisée explicitement par
l'utilisateur après audit favorable du PLAN corrigé B1–B4. Baseline obligatoire
`4f4691d899206868160cc27eec62a50984a21dc4`, branche
`rewrite/portfolio-versioned`. Préflight effectué avant modification : arbre
propre, HEAD exact, fetch réussi, origin exact et divergence 0/0. Aucun AGENTS.md
applicable. [PLAN normatif et résultats](./rewrite_r12_plan.md#12-résultats-dimplémentation-r12--in-review),
[amendements A-R12-01–09](./rewrite_decisions.md#amendements-normatifs-r12--2026-10-11).
R0/R0.1/R1.1 restent DONE ; **R1.3/R1.4/R2–R6 NOT STARTED**.
Audit indépendant de cette implémentation puis autorisation de clôture requis
avant DONE. Ce canon décrit la livraison, sans constituer cet audit.

## Architecture et API livrées

Les modules restent dormants : bootstrap, composition root, UI, origines fixes,
stockage, moteur et runtime shell inchangés. Domain ne dépend que de Domain.
Application lit par ports injectés et demande un certificat ; adapter mémoire
ne fait aucune sélection métier ni publication. La livraison initiale R1.2 ne changeait ni code ni
contrat générique R1.1. Le correctif P0-B ultérieur optimise uniquement ses
algorithmes internes (voir addendum PERF-FIX), sans changement de contrat.
Aucun package/config/lockfile changé.

| Couche / fichiers sous src-v2 | API et responsabilité |
| --- | --- |
| domain/portfolio/payloads.ts | `BusinessPayloadByKind`, union corrélée `BusinessVersion` des 14 kinds, readonly/familles exactes |
| domain/portfolio/payloadValidation.ts | `validateBusinessPayload`, `createBusinessVersion`, `catalogNameKey` : schémas fermés unknown, règles locales, copie/gel via R1.1 |
| domain/versioning/versionRegistry.ts | `createVersionRegistry`, `withVersions`, `lookupExact` : contexte fini passif, collisions/owners/mappings, répétitions identiques ; rapport R1.1 distinct |
| domain/portfolio/manifest.ts | Factories Manifest/CurrentSelection/PortfolioSnapshot/SnapshotId, `selectedReferences` : 12 tables + globals, aucune liste racine redondante |
| domain/portfolio/graphResolver.ts | `resolvePortfolioManifest` : exact lookup seulement, inventaires dérivés des owners Settings, contexte conservé ; aucune lecture historique |
| domain/portfolio/graphValidation.ts | `validatePortfolioGraph`, `validateSnapshotGraph` : fermeture, lifecycle, AP/partition, grille TA, PTEC, capacités, catalogues, ordre et borne Snapshot |
| domain/portfolio/validatedPortfolioGraph.ts | `certifyPortfolioGraph(unknown)` : factory unique, type opaque `ValidatedPortfolioGraph`, wrappers fermés current/snapshot, aucun registre de certificats |
| application/ports/portfolioReadPort.ts | `ExactVersionsReader`, `CurrentSelectionReader`, `SnapshotReader` séparés ; Promise de DomainResult unknown |
| application/portfolio/loadPortfolioGraph.ts | `loadCurrentGraph`, `loadSnapshotGraph` : réponses inconnues revalidées, correspondance requête/réponse, erreurs de lecture distinctes |
| adapters/memory/memoryPortfolioReadAdapter.ts | `createMemoryPortfolioReadAdapter(versions,current,snapshots)` : copies immutables fournies explicitement ; current null autorise lecteur Snapshot seul ; lecture Current absente diagnostiquée |

Snapshot requiert uniquement lecteurs Snapshot et versions ; le service ne possède
aucun lecteur Current. La fermeture métier doit figurer dans les tables exactes du
manifeste ; rien n'est ajouté depuis les versions non sélectionnées. Les liens
predecessor/provenance restent inchangés. Une contradiction fournie est refusée,
mais leur absence historique n'interdit pas la certification structurelle.
Le statut `not-established` est conservé dans `graph.context`, jamais promu.

## Décisions techniques réalisées

- Champs obligatoires ; absence métier par null, sauf OptionalQuantity DailyCap
  absent/present R1.1. Quantités canoniques BigInt avec familles/unités, zéro
  explicite. Aucun défaut ou réparation d'une entrée invalide.
- Couleurs strictement `#RRGGBB` majuscules à l'entrée ; noms Program/Pas déjà
  trimés et espaces réduits. Les formes non canoniques sont refusées. Clé de nom
  lower-case locale fr ; unicité seulement existing et par catalogue. Project,
  Reservation et Team exigent seulement un nom non vide après trim.
- Périodes/exceptions chronologiques strictes, sans tri réparateur, sans overlap
  ou doublon ; calendriers vides/gaps/exceptions hors horizon valides. Weekdays
  uniques 1..7, liste vide valide ; maxParallelProjects entier sûr strictement positif.
- Mandatory booléen obligatoire, true exige objectiveEndDate ; false autorise date
  ou null, aucune contrainte objective/earliest. RT ratio ou fixed-daily, zéro valide.
- SnapshotId record opaque `{family:'SnapshotId',value}` distinct des familles R1.1 ;
  revision chaîne opaque non vide sans sémantique temporelle. createdAt ISO UTC
  fixe `YYYY-MM-DDTHH:mm:ss.sssZ`, date civile et heures/minutes/secondes validées
  sans Date/horloge. knowledgeDate indépendante, ≥ tous through selected.
- Registre valeur readonly, stockage par liste finie, égalité structurée R1.1,
  aucune autorité latest/date/Current, aucun index ever-nonzero. Owners uniques
  par kind et identité dans tout contexte fourni, y compris non sélectionné.
- Certification reçoit `{source:'current',manifest,versions}` ou
  `{source:'snapshot',snapshot,versions}` depuis unknown ; schéma du wrapper fermé,
  validation complète à chaque entrée inconnue/désérialisée. Marque TS privée,
  copie/gel profonds ; pas constructeur ni raccourci already-valid/WeakSet.
- API de ports async avec DomainResult ; réponses unknown, erreurs explicites,
  mauvaise version/id ou version non demandée refusée. Adapter mémoire sans write.
- Helpers capacité/catalogue regroupés dans payloadValidation ; tests métier
  intégrés dans application/portfolio/r12.test.ts pour exercer le pipeline complet,
  sans fixtures runtime ni duplication de règles entre couches.
- A02 R1.1 : restriction des quatre noms de futurs lots bornée aux modules R1.1
  explicitement livrés ; pureté/horloge, dépendances Domain internes et anti-float
  maintenus sur leur périmètre. Garde boundaries.mjs inchangé, nouveaux tests AST
  hexagonaux et canaris dans scripts/v2/r12.test.mjs.

## Gates réellement exécutées

Commande ciblée :
`node --test --test-reporter=tap .test-dist-v2/application/portfolio/r12.test.js scripts/v2/r12.test.mjs`.
**86/86 PASS**, dont 75 tests métier et 11 frontières R1.2. Les assertions de
compilation (`@ts-expect-error`) sont effectivement contrôlées par la compilation
préalable de `npm run test:v2`, et ne sont pas des tests Node supplémentaires.
Les scénarios positifs et négatifs ci-dessous sont exécutés, sans skip/todo.
Le [journal ciblé](./proofs/r12/targeted.log) contient les noms G12 de chaque test.

| Gate | Tests exécutés, préfixes dans le journal ciblé | Résultat |
| --- | --- | --- |
| G12-01 | 14 kinds valid/extra/missing ; mandatory/date/null/bool ; familles/options/ref/couleur ; statuts retirés ; unknown/accessors/cycles/sparse | PASS |
| G12-02 | Répétitions/branches/append/copies/gel/lookup absent ; collision divergente, owner changé, cycle fourni | PASS |
| G12-03 | Portfolio vide explicite, inventaires opaque-owner, racines redondantes/history refusés ; sélection double/mauvais kind | PASS |
| G12-04 | Permutation, exact refs sans substitution, réponses wrong/extra/id/read failure ; B1 v10000 + predecessor v9999/provenance non chargés, stockage témoin 10000 versions, zéro lecture historique/Current ; dépendance métier absente refusée | PASS |
| G12-05 | Covered AP tombstone + ancienne TA positive archivée ; hidden/inactive/restored owner ; endpoints deleted et TA/PTEC interdits ; Team deleted garde Capacity, absence/double identité refusées | PASS |
| G12-06 | AP empty/covered, leap day, singleton et 0000–9999 sans grille quotidienne ; gaps/overlap/ordre/bornes/owners/table/earliest ; ajustement bornes et split provenance vide | PASS |
| G12-07 | 2×2 PT et RT, zéro explicite ; cellule absente, foreign association/AP, mauvaise famille Consumption ; unicité cellule G12-11 | PASS |
| G12-08 | AP vide/PTEC null ; AP v2 même through garde PTEC v1 ; absence/foreign AP/version-ref/frontière/status/orphan ; split G12-06/08 garde PTEC | PASS |
| G12-09 | Calendar gaps/exceptions hors horizon, RT zéro deux modes ; overlap/doublon/ratio/weekdays/limit/horizon ; matrice B3 Project/Reservation × Program/Pas × existing/deleted (16 tests et missing refs) ; unused catalogues/noms/ordre/foreign Portfolio | PASS |
| G12-10 | Dates égales/recul, AP vide/deleted/inactive, borne knowledgeDate ; metadata manquante/résultat/date invalide ; Snapshot ancien après Current divergent, copies adapter, historique manquant sans fallback | PASS |
| G12-11 | 10 mappings owner (dont 3 Settings), mêmes identités plusieurs versions ; double identité non selected refusée ; TA cellule et PT existing/deleted même identité ; B3 double Capacity deleted | PASS |
| G12-12 | Unknown/désérialisation valide recertifiée et invalide refusée, faux validated/cast ; wrapper/source/accessor ; mutation input/output ; type opaque/familles/readonly à compilation ; états sans preuve de transition | PASS |
| G12-13 | Audit AST dépendances runtime/types Domain/Application/ports/adapter ; 10 canaris dédiés ; A01–A03 et 24 canaris garde général exécutés dans suite complète | PASS |

## Validation générale et preuves

Environnement : macOS Darwin arm64, Node v24.21.0, npm 11.19.0, TypeScript 5.9.3.
Aucune dépendance installée. Résultats exacts dans [delivery.json](./proofs/r12/delivery.json)
et [liste des fichiers](./proofs/r12/files.txt).

| Commande | Exécution réelle | Preuve |
| --- | --- | --- |
| npm run test:v2 | PASS 154/154 : 68 acquis + 86 nouveaux, fail/skip/todo/cancel 0 | [tests.log](./proofs/r12/tests.log) |
| tests ciblés ci-dessus | PASS 86/86, nouvelle exécution des mêmes tests | [targeted.log](./proofs/r12/targeted.log) |
| npm run check:boundaries:v2 | PASS code 0, isolation/configs/types/transitifs | [boundaries.log](./proofs/r12/boundaries.log) |
| npm run typecheck:v2 | PASS code 0 | [typecheck.log](./proofs/r12/typecheck.log) |
| npm run build:v2 | PASS code 0, assets V2 seulement | [build.log](./proofs/r12/build.log) |
| rollback en clone jetable | Commit technique temporaire puis revert normal ; tree baseline identique ; frontières/typecheck/68 tests/build du socle restauré PASS | [rollback.json](./proofs/r12/rollback.json), [rollback.log](./proofs/r12/rollback.log) |
| git diff --check et revue documentaire/scope | PASS, aucun fichier legacy ni contrat R1.1 changé | [review.log](./proofs/r12/review.log) |

154 tests distincts réussis ; ciblés = 86 exécutions supplémentaires, rollback =
68 exécutions du socle restauré. Aucun résultat historique présenté comme nouveau
PASS. Une première compilation de développement a relevé un import inutilisé,
corrigé avant exécution. Un premier essai de fixture a fourni toute la lignée au
validateur contextuel R1.1 et a été interrompu sans conclusion : fixture corrigée
pour conserver la lignée exclusivement dans le témoin, conformément à B1.
Cet essai interrompu n'est pas une gate PASS ni une preuve de performance.

## Limites et réception

Le certificat atteste uniquement l'état structurel sélectionné. Il ne démontre
aucune confirmation, transition autorisée, CAS, transaction/durabilité, inventaire
historique exhaustif, simulation ou conservation à vie. L'unicité est relative à
tout contexte fourni ; R2 garantit l'intégrité exhaustive durable. Les lecteurs
retournent leurs erreurs structurées par le contrat DomainResult.

Limites physiques R1.1 BigInt/mémoire/pile et coûts de parcours du contexte fini
conservés ; aucun benchmark de validation d'une lignée exhaustive de 10000
versions n'est attesté. Le test B1 atteste précisément qu'elle n'est pas chargée.
Ratio RT avec exception sans période reste ouvert pour R3/avant moteur concerné
R1.4 ; aucun default bootstrap opérationnel introduit. Le shell n'assemble pas
encore le métier. Smoke browser/storage/multi-TZ non réexécutés pour ces modules
dormants et primitives inchangées ; aucune gate métier browser requise par R1.2.
**Windows DEFERRED / NOT EXECUTED** selon I-R01-C, aucune qualification SEA.

Preuves et archives DONE conservées. Prochain acte : audit indépendant du SHA
livré avant toute clôture documentaire R1.2. **R1.2 IN REVIEW ; R1.3/R1.4/R2
NOT STARTED.** Arrêt après commit/push, sans démarrage du lot suivant.

## Addendum R1.2-PERF-FIX — P0-A/P0-B, IN REVIEW

2026-10-11, baseline `4effcfce23bb1e835201c9fe0c8f06967ce67339`, après audit
favorable du plan et GO utilisateur P0-A/P0-B. [Réalisation, décisions, mesures
et deux verdicts](./rewrite_r12_perf_fix_plan.md#11-réalisation-p0-ap0-b--2026-10-11).
Registre : mappings owner→identité et déduplication par tables natives temporaires.
R1.1 : recherches exactes/owners internes à `validateVersionContext` indexées ;
parcours des filiations conservé, membership local indexé, sans mémoïsation,
chargement transitif ni modification des signatures/contrats. Helper Domain
`localVersionTables.ts` : Maps par composants typés/discriminés, sans concaténation,
jamais exposées ou persistées. Égalité structurée, validation unknown, copie/gel,
ordre/priorité des diagnostics et certification inchangés. R1.1 reste DONE.

Preuves actuelles : **563 cas différentiels complets identiques**, **174/174 V2**,
**32/32 R1.1 ciblés**, **103/103 R1.2 ciblés**, **G12-01–G12-13 PASS**,
20 tests pérennes supplémentaires ; typecheck/build/frontières/diff-check PASS.
[Oracle, commandes, patches, hashes et journaux](./proofs/r12-perf-fix/README.md).
Ces résultats sont réexécutés, distincts des preuves historiques ci-dessus.
Fixtures/outils R1.2-PERF et anciennes preuves inchangés.

**P0 conforme techniquement ; performance globale encore C.**
Moyen sparse médian M1 12582,4→441,4 ms, M3 14119,4→1851,0 ms,
M5 28113,7→4111,7 ms (rejeu contemporain). Moyen dense M1 médian 2816,5 ms,
M2–M6 cold interrompus à 30 s ; les anciens timeouts ne sont jamais convertis
en gains chiffrés. [Comparaison M1–M6, dispersion/CPU/mémoire](./proofs/r12-perf-fix/comparison.md).
M3 sparse : lookup 44,84 % inclusif, grille 13,99 % ; M5 lookup 39,24 %.
M1 dense : 332,0 Mio heap endpoint/498,9 Mio RSS lifetime, validation/copies
dominantes ; mémoire des opérations denses interrompues non qualifiée.
[Profils CPU](./proofs/r12-perf-fix/p0-cpu-summary.log).
P1 nécessite une décision distincte ; aucun changement P1/P2/P3.
Grands non exécutés, longues chaînes non qualifiées, limites Inspector/GC/sandbox
explicitées au rapport. **R1.2 IN REVIEW**, audit indépendant du correctif requis ;
**R1.3/R1.4/R2 NOT STARTED**. Arrêt à la livraison commit/push.


## Addendum R1.2-PERF-P1 — réalisation autorisée, IN REVIEW

Baseline `f9440517d176d93e3089a8b7cf34da86f36f5f18`, A-P1-01 B et
A-P1-02–04 approuvés explicitement par l’utilisateur après audit du plan.
[Plan et réalisation](./rewrite_r12_perf_p1_plan.md#13-réalisation-p1),
[rapport/preuves](./proofs/r12-perf-p1/report.md).
`lookupExactBatch(VersionRegistry, readonly unknown[])` retourne un wrapper
readonly `{result: DomainResult<readonly BusinessVersion[]>, failedIndex: number|null}`.
Table exacte construite une fois par lot, temporaire, versions demandées dans
l’ordre avec répétitions ; validation individuelle et arrêt au premier échec.
lookupExact unitaire et diagnostics publics inchangés, ordinal hors DomainError.
Factory registre obligatoire chez les trois appelants : resolver, collect,
adapter mémoire (setup). VersionRegistry n’est pas un certificat runtime.
Aucune autorité/certification nouvelle, Map exposée, table retenue ou cache.
Unicité du manifeste par tables locales d’identités après validation kind/ref,
12 tables/globals, format, copies/gel et refus au même index conservés.
Collect revalide toute réponse puis missing avant extras, déduplication des
répétitions identiques pour cardinalité seulement ; réponse originale certifiée.
Inventaires owners Settings, filiation/provenance/not-established et Snapshot
historique autonome avec Current divergent inchangés.
Oracle réel P0 : 563 puis 896 cas figés avant code ; corpus final 941 réponses
complètes identiques en clones/processus isolés. 189/189 V2, 32/32 ciblés R1.1,
118/118 ciblés R1.2 dont G12-01–13, frontières/typecheck/build PASS réellement
réexécutés ; preuves historiques conservées intactes.
Verdict technique P1 conforme, verdict global C : M5 sparse ≈4,08→1,47 s,
M3 dense ≈20,79 s ; poursuite R1.3 non autorisée. Profils et mémoire qualifiés
dans le rapport, diagnostic P2 soumis à arbitrage distinct, aucun P2/P3 réalisé.
Grands non exécutés. R1.2 reste IN REVIEW jusqu’à audit indépendant ;
R1.3/R1.4/R2 NOT STARTED. Arrêt après commit/push sans force.


## Addendum R1.2-PERF-P2 — option A réalisée, IN REVIEW

GO utilisateur A-P2-01–04, baseline `fae4929af58c3ecd0aaa8026e51687e41c51cc7c`,
oracle P1 exact `ee6e26fe9b056fbbd62ffb72be9989385a962e5f` en clone isolé.
[Rapport P2](./proofs/r12-perf-p2/report.md),
[plan et résultats](./rewrite_r12_perf_p2_plan.md#12-réalisation-autorisée--option-a-exclusivement-in-review).
Production limitée à graphValidation.ts : compteur local de cellules TA, six
composants association/SP kind/family/value, cardinalité avant construction,
après EXTRA_SUBPERIOD. Diagnostic historique intact, attendus et validations dans
leur ordre, PortfolioOrder/borne Snapshot après grille. LocalVersionTable<number>
temporaire, aucun index public/persistant ; grille seule O(C+F), reste du pipeline
inchangé. Option B/P3 et autres scans non réalisés.

1254 réponses publiques complètes identiques (941 P1 + 304 P2 + neuf compléments),
baseline figée avant code, zéro divergence, copies/gel/non-mutation indépendants.
194 tests V2, ciblés R1.1 32/R1.2 123, G12-01–13/P0/P1, frontières/typecheck/build
PASS. Cinq tests pérennes ajoutés, suites/gardes/outils/fixtures/packages inchangés.
Campagnes P1/P2 cinq scénarios M1–M6, 29 opérations terminées chacune,
M6 historique non exécuté, grands non exécutés ; statistiques/CPU/mémoire/setup
complets dans les preuves. M5 moyen sparse 1,466→1,418 s, dense 24,223→8,728 s ;
M3 dense 20,749→4,438 s. Dérive M1/M2 contrôlée séparément et conservée.
Sept profils contemporains, P1 M5 dense non obtenu après deux timeouts cold 30 s.
Laboratoire séparé index dense ~12,8 ms construction/~7,4 ms vérification,
~14,6 Mio retenus pendant construction ; mesures expérimentales exclues M1–M6.
Registre/copies/validations dominants résiduels, aucun B/P3 appliqué.

**Verdict technique P2 : conforme. Performance globale : C réévaluée**,
acceptabilité Snapshot dense pour R1.3 non établie, malgré gain majeur de grille.
Audit indépendant requis ; **R1.2 IN REVIEW ; R1.3/R1.4/R2 NOT STARTED**.
Rollback normal en clone jetable, livraison par commit/push sans force, arrêt.

## Addendum R1.2-PERF-P3-A1 — pile locale, IN REVIEW

GO explicite utilisateur, baseline `4186efc065a8d75de58cc9a2a685c9ef40641bc5`.
Préflight exact/propre, fetch réussi, divergence 0/0, aucun concurrent.
[Rapport, mesures et deux verdicts](./proofs/r12-perf-p3-a1/report.md),
[preuves reproductibles](./proofs/r12-perf-p3-a1/README.md).
Seul fichier production modifié : domain/versioning/immutableValue.ts sous src-v2.
Tableau ancêtres local par appel public ; includes avant push, pop dans finally
sur succès/refus/exception. Ordre des inspections/récursions et priorité des
records/tableaux inchangés, copies indépendantes DAG et gel profond conservés.
Recherche ancêtre toujours O(D) ; N spreads et Σdᵢ écritures supprimés, pas de
promesse de pipeline linéaire ni de latence garantie.

Vraie P2 `d2ebb7142c563a43b620cd78fea63f2847d76c02` isolée et scellée avant
production : 1 254 réponses historiques + 34 extensions, **1 288 identiques**,
zéro divergence. Runtime de détachement/gel/mutation séparé. 19 tests ajoutés,
**213/213 V2**, **32/32 R1.1**, **123/123 R1.2**, **19/19 copie ciblée**,
G12-01–13/P0/P1/P2, frontières/typecheck/build PASS, aucun test affaibli.
Rollback normal en clone jetable : tree baseline identique, 194 tests restaurés,
typecheck/build PASS. Sources/outils/fixtures historiques hashés et préservés.

Campagnes contemporaines P2/A1, cinq scénarios M1–M6, 29 opérations par version,
cold/warm-up/trois mesures, timeout 30 s/phase, old-space 1 Gio/seed 1202.
12 profils CPU séparés, 30 opérations de contrôles inversés conservées à part.
M6 historique et grands non exécutés. M5 moyen dense **7 567,94→7 554,24 ms**
(−0,18 %), contrôle inversé **7 523,99→7 477,19 ms** (−0,62 %), intervalles
se recouvrent ; moyen sparse **1 215,05→1 214,07 ms**, contrôle +0,75 %.
M1 petit sparse +4,34 % ordinaire, −3,50 % contrôle : variation non stable.
M5 dense heap endpoint 440,16→442,92 Mio, RSS lifetime 827,94→799,95 Mio,
heap retenue avec résultat ~131,82 Mio inchangée. CPU/M1–M6/dispersion/setup/
mémoire complets dans les preuves, aucune baisse uniforme ni pic exclusif déduit.

Laboratoire indépendant : chaîne profondeur 513, 514→1 tableaux ancêtres ; DAG
1 202→1, mêmes objets visités, push/pop équilibrés même après refus/exception.
Masse d'allocations échantillonnée et timings instrumentés séparés des métriques
officielles. Gestion des ancêtres et tableaux temporaires sans frame CPU fiable individuelle ;
M5 dense registre 78,24→77,47 % inclusifs, copy 41,95→40,65 %, dataRecord
56,22→56,69 %. Inclusifs recouvrants jamais convertis en temps exclusifs.

**Verdict A : P3-A1 techniquement conforme, à auditer indépendamment.**
**Verdict B : classification globale C maintenue** : gain M5 faible, ~7,55 s
reste sans acceptabilité démontrée pour R1.3 ; registre/inspection/copies/
validations dominants résiduels, mémoire retenue stable, petits variables.
Aucun B/C ni autre optimisation A ; aucun flag/cache/WeakMap/WeakSet trusted,
aucune frontière modifiée ni nouvelle preuve/certification. Les arbitrages du
plan initial restent non autorisés pour toute cible autre que la pile A1.
**R1.2 IN REVIEW ; R1.3/R1.4/R2 NOT STARTED.** Arrêt après commit/push normal,
sans force ; aucun nouveau lot avant audit/arbitrage indépendant.
