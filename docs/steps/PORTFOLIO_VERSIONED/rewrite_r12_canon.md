# FlowPlan2 V2 — R1.2 : graphe versionné et validation structurelle

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
ne fait aucune sélection métier ni publication. Aucun changement du code ou
contrat générique R1.1, aucun package/config/lockfile changé.

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
