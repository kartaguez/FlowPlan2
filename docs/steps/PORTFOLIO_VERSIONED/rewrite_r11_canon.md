# FlowPlan2 V2 — livraison R1.1 : primitives et versionnement natif

Date : 2026-10-10. **R1 — CADRAGE VALIDÉ**.
**R1.1 — IN REVIEW — CORRECTIONS À AUDITER**.
R1.2–R1.4 et R2–R6 NOT STARTED. Aucun DONE, aucune clôture automatique.
Point d'entrée : [current_plan](../../current_plan.md).
Autorité : [PLAN R1.1 approuvé](./rewrite_r11_plan.md), R0 §3/§13 et décisions.

## Autorisation et baseline

GO utilisateur explicite pour P0–P6 du seul R1.1 après approbation du PLAN corrigé.
Baseline documentaire et SHA initial : `5950ed079ffa8132742301922765e955d1af9274`.
`git fetch origin` réussi ; branche `rewrite/portfolio-versioned`, arbre propre,
HEAD = origin = baseline, divergence 0/0. Commit initial :
`docs(v2): correct R1.1 plan after independent audit`. Aucune évolution concurrente
constatée avant modification. Les mentions de GO non accordé dans les dossiers de
préparation sont historiques ; ni les décisions normatives ni le PLAN ne sont réécrits.
Le SHA exact de livraison est le commit Git contenant ce canon et ses preuves,
communiqué après push et vérification du SHA distant ; pas d'auto-référence circulaire.

P1 Rational/résultats, P2 quantités, P3 civil, P4 identités/owners/refs, P5 enveloppes
et P6 intégration/preuves sont réalisés. Aucun montage Domain dans le shell.
Aucun modèle métier complet, registre, manifeste, Current/PortfolioSnapshot,
resolver, transition, preuve TA, ever-nonzero, moteur, stockage, codec ou UI métier.
Aucun changement du runtime legacy, du garde R0.1, des configs, des dépendances,
du lockfile ou des commandes npm. Les onze nouveaux modules Domain sont compilés
comme assets V2 dormants ; le graphe de démarrage browser conserve le shell vide.

## Modules et interfaces publiques

Tous chemins suivants sont relatifs à `src-v2/domain/` ; imports internes Domain
uniquement, aucune dépendance runtime externe.

| Module | Interfaces / fonctions livrées |
| --- | --- |
| primitives/result.ts | DomainError(code/path/message), DomainResult<T>, success/error/failure/invalid ; résultats et copies des diagnostics gelés |
| primitives/data.ts | dataRecord/field/hasKeys : inspection des propriétés propres de données, rejet des getters/symboles/exotiques ; helpers de validation |
| primitives/rational.ts | Rational nominal, createRational/validateRational/parseRational, add/subtract/multiply/divideRationals, compare/equalRationals, rationalToCanonicalString ; toutes frontières retournent DomainResult |
| primitives/quantity.ts | QuantityFamily/QuantityUnit/Quantity<F>, createQuantity/validateQuantity ; OptionalQuantity absent/present et createOptionalQuantity |
| primitives/civilDate.ts | CivilDate nominal, createCivilDate, compareCivilDates, addDays, civilDayDifference(next,previous), isoWeekday ; DomainResult à chaque frontière |
| primitives/civilInterval.ts | CivilInterval, createCivilInterval, intervalDayCount/intervalContains |
| primitives/identity.ts | OpaqueId<F>, EntityId/VersionId/ProjectId/ReservationId/TeamId/PortfolioId ; createId/validateId |
| primitives/exactReference.ts | VersionKind/versionKinds, EntityIdentity<K>, ExactReference<K>, validateKind, createEntityIdentity/createExactReference/validateExactReference, sameIdentity/sameReference (sur valeurs typées validées) |
| versioning/owner.ts | OwnerByKind/VersionOwner<K>, owners discriminés et createOwner ; matrice exhaustive du PLAN |
| versioning/immutableValue.ts | ImmutableValue/DeepReadonly<T>, copyImmutableValue, equalImmutableValues sur données validées |
| versioning/versionEnvelope.ts | VersionEnvelope<K,P>, VersionEnvelopeInput<K,P>, createVersionEnvelope (entrée inconnue), createTypedVersionEnvelope (préserve le type du payload), validateVersionContext/ContextReport, validateActualPeriodOwner |

Tests ajoutés : `primitives/rational.test.ts`, `primitives/civilDate.test.ts`,
`versioning/versionEnvelope.test.ts`, et `scripts/v2/r11.test.mjs` (A01–A03).
Documentation modifiée : current_plan/current_canon, registre des décisions,
registre de reprise ; ce canon et `proofs/r11/` sont créés. Inventaire exact Git
fourni dans le rapport de livraison. Aucun autre fichier existant modifié.

Exemple de frontière : `createQuantity('ETC', rationalValidé)` crée une famille
work non négative ; `validateQuantity('ETC', unknown)` refuse une Consumption
même de valeur identique. `createTypedVersionEnvelope(kind, input)` conserve le
schéma TS du payload et refuse les refs/owners d'autres familles à compilation ;
il applique aussi la validation runtime et la copie profonde. Le caller R1.2
validera le schéma métier avant assemblage : R1.1 ne certifie aucun payload AP/PT.

## Invariants et choix techniques réalisés

Rational : deux BigInt, PGCD 1, dénominateur > 0, zéro 0/1, signe au numérateur.
Paire à dénominateur négatif normalisée ; paire à zéro refusée. Grammaire ASCII
entier/décimal/fraction, zéros initiaux admis ; pas plus/exposant/espaces/virgule.
`01 → 1/1`, `001.250 → 5/4`, `02/04 → 1/2`, `-0` et `0.00 → 0/1`.
Aucun Number/parseFloat/parseInt dans la chaîne des quantités ; comparaison par
produits croisés BigInt. PGCD et cancellations avant les opérations conservés.
Le texte n/d est diagnostique, aucun codec physique. Les structures non canoniques
sont refusées par validateRational et les opérations, jamais corrigées silencieusement.
Aucune limite métier de taille ni garantie d'interception d'exhaustion physique.

Familles : Capacity/DailyCap/FixedDailyDemand en work/day ; Consumption/ETC en
work ; ReservationRatio/UnavailabilityRatio en ratio [0,1]. Toutes non négatives,
Rational générique signé distinct. Discriminants family/unit contrôlés runtime,
brands TS distincts ; conversion explicite par extraction et nouvelle factory
possible, aucune conversion implicite. Absence = `{kind:'absent'}`, zéro présent
= `{kind:'present',value:quantityZero}`. Aucun statut PTEC ni completed/open.

CivilDate : grégorien proleptique ISO strict, 0000-01-01–9999-12-31 inclus,
année 0000 bissextile. Conversions civiles entières indépendantes de Date/TZ/DST,
intermédiaire addDays sûr vérifié avant conversion ; résultat hors plage refusé.
Différence signée et weekday ISO lundi=1 ; intervalle inclusif, singleton cardinal 1,
inversé refusé, pas d'énumération pour valider. Aucune API mois/année ni clamp/today.

IDs : objets readonly `{family,value}` pour une séparation runtime EntityId,
VersionId et propriétaires, sans trim des octets conservés ni parsing sémantique.
Chaîne vide/whitespace seul refusée ; casse et espaces d'un ID non vide préservés.
Aucun générateur. Kinds fermés : ProjectSettings, ReservationSettings, TeamSettings,
TeamCapacity, Program, Pas, PT, RT, ActualPeriod, ActualSubPeriod, TeamActual, PTEC,
PlanningSettings, PortfolioOrder. Ref exacte = kind + EntityId + VersionId ;
identité owner = kind + EntityId sans version quand elle désigne AP/PT/RT/SubPeriod.
L'identité sans version ne sélectionne jamais une version.

Owners : Project/Reservation/Team pour leurs Settings ; Team pour Capacity ;
PortfolioId pour catalogues/globals ; ProjectTeam pour PT, ReservationTeam pour RT ;
Project OU Reservation pour AP ; identité AP pour SubPeriod ; association PT OU RT
+ identité SubPeriod pour TA ; identité PT pour PTEC. Pas d'unicité métier des
couples implémentée (R1.2). Owner immuable entre toutes versions de même identité
explicitement fournies, branches et racines indépendantes comprises.

Enveloppe séparée du payload, ref propre exacte, owner, 0..1 predecessor exact,
provenance liste de refs distinctes. Prédécesseur de même kind/entityId, version
différente ; parent partagé par plusieurs enfants permis. Source métier de nouvelle
identité autorisée, ne remplace ni parent ni sélection. Auto-source et doublons
refusés ; aucune fusion ni validation des politiques split/merge métier.

Données copiées puis gelées récursivement : primitives, records simples à
propriétés propres énumérables et listes denses. BigInt exact ; nombres de payload
uniquement entiers sûrs pour compteurs/dates civiles, aucune quantité flottante.
Map/Set/Date/fonctions/accessors/symbol keys/prototypes exotiques/listes trouées
et cycles refusés ; DAG partagé copié en branches détachées. Le parcours normal
utilise Object.entries/descripteurs/itération, compatible avec le garde ; aucun
accès calculé runtime ou élargissement dissimulé du garde. Pas de JSON.stringify
ou hash pour l'égalité d'autorité : records comparés par clés/valeurs, listes dans
leur ordre, BigInt par égalité. Aucune mutation/overwrite/delete d'archive exposée.

Contexte : tableau fini explicitement fourni, copié/validé ; collisions sur ref
exacte refusées si owner/payload/predecessor/provenance divergent. Répétition
strictement identique signalée dans identicalRepetitions, sans nouvelle version.
Cycles de filiation self/longs refusés. Parent absent signalé dans
missingPredecessors avec status `not-established` ; jamais racine implicite.
Aucun callback de lookup, accès stockage ou conservation du contexte. Status
`established` certifie seulement les contrôles locaux R1.1, pas la fermeture des
refs métier/provenance. validateActualPeriodOwner compare seulement un AP exact
explicitement fourni au propriétaire attendu ; absent → not-established.

## Matrice contrat → module → test → résultat

Les tests intitulés Q/D/V se trouvent dans les suites TS ci-dessus ; A dans
scripts/v2/r11.test.mjs. Le PLAN §9 fournit les cas positifs/négatifs normatifs.

| Gate / contrat normatif | Module V2 | Test / preuve exécutée | Résultat |
| --- | --- | --- | --- |
| Q01 — R0 §3.3 / PLAN §4.1 parsing | rational | Q01 : syntaxe, grands entiers, 401 décimales, leading zeroes, invalides | PASS |
| Q02 — canonicalisation/validation runtime | rational | Q02 : signes, zéro, idempotence et structures forgées refusées | PASS |
| Q03 — exactitude sans float | rational | Q03 : 1/3+2/3=1, 0.1+0.2=3/10, cancellation, comparaison, 300 paires/inverses | PASS |
| Q04 — R0 §3.1 quantités/absence | quantity | Q04 : toutes familles zéro/négatif, bornes ratios, absence distincte, substitutions compile/runtime | PASS |
| Q05 — résultat/erreurs natifs | result/data/rational/quantity | Q05 : code/path, copies des diagnostics, erreurs de type/getters sans fallback | PASS |
| D01 — D-R11-01 / PLAN §4.2 | civilDate | D01 : siècles, année 0000, bornes, formats invalides/hors plage | PASS |
| D02 — inclusivité/refus inversion | civilInterval | D02 : singleton, 62 jours, membership aux bornes, adjacent/inversé | PASS |
| D03 — arithmétique civile sûre | civilDate | D03 : bornes ±3652424 jours, offsets unsafe/fractionnels, weekday, oracle 400 ans | PASS |
| D04 — aucune sémantique TZ/DST | civilDate | D04 + D01–D03, trois processus TZ distincts ; revue AST A02 aucun Date/horloge | PASS |
| V01 — T01 / D-R1-01 refs exactes | identity/exactReference | V01 : mêmes octets/kinds distincts, ID/VersionId, incomplète/unknown, ordre/branches sans sélection | PASS |
| V02 — R0 §3.1 owners | owner/versionEnvelope | V02 : matrice entière, Project/Reservation et PT/RT, AP autre owner, changement owner même identité | PASS |
| V03 — immutabilité profonde | immutableValue/versionEnvelope | V03 : mutation entrée/sortie, refs/owners/listes, DAG/cycle/exotiques ; test payload typé readonly | PASS |
| V04 — D-R1-02 filiation | versionEnvelope | V04 : racine/chaîne/deux enfants/ordre inversé, self/long cycle, parents invalides/absents/multiples | PASS |
| V05 — T01 collisions | versionEnvelope | V05 : idempotence structurée, divergences des quatre composants, coexistence sans overwrite | PASS |
| V06 — provenance ≠ filiation | versionEnvelope | V06 : sources multiples/nouvelle identité, auto-source/doublon/ref sélection refusée, pas résolution | PASS |
| A01 — I-R01-A autonomie | garde R0.1 + r11.test.mjs | graphe réel source/type/transitif/realpath V2, canaris legacy, chaque edge Domain interne | PASS |
| A02 — Domain pur / PLAN exclusions | modules Domain + r11.test.mjs | AST sans Date/clock/Current/storage/latest, APIs bornées ; revue du diff et données legacy intactes | PASS |
| A03 — outils isolés / I-R01-A/B | outils R0.1 inchangés | quatre commandes exactes, 58/58 sans skip, compilation/découverte/assets V2 seuls | PASS |

Les 18 résultats sont obtenus sur les nouvelles primitives, aucune gate remplacée
par une suite legacy. Typecheck compile aussi les @ts-expect-error de familles
et readonly pendant test:v2 ; ces assertions doivent produire les erreurs attendues.
R1.4 Actuals+ETC=EAC reste NOT STARTED : Q03 est exclusivement mathématique.

## Commandes exactes, environnement et preuves

macOS Darwin 27.0.0 arm64 ; Node v24.21.0 ; TypeScript 5.9.3 ; npm existant,
sans installation de dépendance. Edge 154.0.4258.53 / CDP 1.3 pour le smoke natif.
[Synthèse machine](./proofs/r11/delivery.json), [inventaire exact des fichiers](./proofs/r11/files.txt).
Commandes présentes dans le dépôt, aucune différence :

| Commande | Résultat réel | Journal |
| --- | --- | --- |
| npm run check:boundaries:v2 | PASS, code 0 ; garde/configs/types/transitifs | [boundaries.log](./proofs/r11/boundaries.log) |
| npm run typecheck:v2 | PASS, code 0 | [typecheck.log](./proofs/r11/typecheck.log) |
| npm run test:v2 | PASS, 58/58, failure/skip/todo/cancel 0 | [tests.log](./proofs/r11/tests.log) |
| npm run build:v2 | PASS, code 0, 16 modules / 18 assets allowlist V2 | [build.log](./proofs/r11/build.log) |
| TZ=UTC node --test --test-reporter=tap .test-dist-v2/domain/primitives/civilDate.test.js | PASS 4/4, processus distinct | [tz-utc.log](./proofs/r11/tz-utc.log) |
| TZ=Europe/Paris node --test --test-reporter=tap .test-dist-v2/domain/primitives/civilDate.test.js | PASS 4/4, processus distinct | [tz-paris.log](./proofs/r11/tz-paris.log) |
| TZ=America/New_York node --test --test-reporter=tap .test-dist-v2/domain/primitives/civilDate.test.js | PASS 4/4, processus distinct | [tz-new-york.log](./proofs/r11/tz-new-york.log) |

58 tests = 6 TS shell + 15 Q/D/V + 1 typage payload + 3 A + 24 canaris frontière
+ 9 serveurs. D03 parcourt 146097 dates attendues, 292194 additions ±1, indépendamment
du convertisseur civil repris. Q03 vérifie 300 couples signés par produits croisés.
Aucun test skipped/todo/non exécuté présenté comme PASS.

Vérification supplémentaire R0.1 : `npm run test:browser:v2` dans une copie
technique temporaire indépendante, profils jetables et ports 4274/4275 fixes.
Six séries absent/backup valide/invalide, zéro tentative API applicative,
sentinelles mêmes origines V2 et témoins 4174/4175 intacts ; refus PORT/origine,
collision de port et assets legacy 404. [Journal](./proofs/r11/browser/command.log),
[rapport natif](./proofs/r11/browser/browser-isolation.json) et quatre PNG sous
proofs/r11/browser. Les preuves historiques proofs/r01 restent inchangées.
Le premier lancement browser a échoué sur `listen EPERM` du sandbox :
[journal conservé](./proofs/r11/browser-initial-failure.log). Même commande relancée
après autorisation automatique hors sandbox, PASS ; aucun affaiblissement du test.
Une première compilation de nouveaux tests avait échoué sur une branche devenue
`never` après assert.equal : helper corrigé, puis compilation/tests réellement
exécutés. Ces échecs de développement ne sont pas des résultats PASS.

## Provenance, non-régression et rollback

[Registre des reprises effectives](./rewrite_reuse_registry.md#opérations-effectives-r11--in-review-audit-indépendant-attendu)
conserve source legacy/SHA/symboles/destination/classe/dépendances supprimées et
preuves indépendantes. Source inspectée pour chaque extraction : baseline
`5950ed079ffa8132742301922765e955d1af9274`, fichiers legacy inchangés.
REUSE : PGCD/normalisation/cancellations/comparaison exactes, conversions civiles
et weekday/différence. ADAPT : parsing, résultats validants/copiés, quantités natives,
bornes sûres/intervalle inversé. REFERENCE : modèles/IDs/snapshots numériques et
editableQuantity ; aucune copie de ces modèles ni import legacy.
Audit indépendant de ces reprises encore attendu ; aucun avis inventé.

Non-régression R0.1 : tests shell/canaris/serveurs PASS ; native browser ci-dessus ;
aucune modification de src/public/scripts historiques, des fichiers shell V2,
du garde ou des configs. Toutes sorties app/test sont mécaniquement V2. La
qualification Windows reste DEFERRED / NOT EXECUTED selon I-R01-C, aucune nouvelle
qualification ; R1.1 ne nécessite pas de SEA ni de bascule/données utilisateur.

Rollback : dans une copie Git locale jetable à la baseline, appliquer uniquement
les fichiers R1.1, commit de laboratoire puis revert normal ; comparer tree au
SHA initial, contrôler arbre propre et exécuter les quatre commandes V2 du shell
restauré. [Preuve rollback](./proofs/r11/rollback.json) et journal associé.
Le premier contrôle final de propreté du clone a détecté le symlink node_modules
technique (le pattern node_modules/ ignore un dossier, pas ce symlink). Les quatre
commandes restaurées étaient PASS ; le symlink a ensuite été retiré avant le
contrôle final dans une nouvelle exécution du protocole. Le journal initial est
conservé dans proofs/r11/rollback-initial-failure.log, jamais qualifié PASS.
Le commit de laboratoire n'est pas poussé. La preuve porte sur le snapshot de
livraison hors son propre journal de rollback, sans prétendre à auto-référence.
Procédure produit : revert normal du commit R1.1 effectivement poussé après
coordination, sans reset/force-push ; aucun stockage à restaurer/convertir.
Les fichiers de preuve/trackers introduits sont retirés par le même revert ;
la baseline restaure les trackers de préparation et le shell R0.1.

## Limites, écarts et prochaine action

Aucun écart au contrat approuvé ; pas de changement du garde ni décision métier
réinterprétée. API lexicale native proposée par le PLAN adoptée ; factories
validantes, kinds/owners du PLAN, nombres payload limités aux entiers sûrs.
Payloads métier, unicité des associations, fermeture et cycles de provenance,
connaissance AP/monotonie, politiques split/merge, sélection et protection
historique sont volontairement laissés aux lots autorisables correspondants.

Exactitude sous limites physiques BigInt/runtime ; copie/validation récursive
peut épuiser pile/mémoire sur données extrêmes. Aucune promesse de capturer toute
exhaustion ni limite métier arbitraire ajoutée. Contexte pur à parcours simples
sur tableau fini : optimisation/index durable éventuels sont ultérieurs, aucune
performance universelle revendiquée. La validation des records ne valide pas les
schémas métier ; une erreur de contexte absent ne doit pas être transformée en
preuve de fermeture par un caller futur.

Contrôle final : diff complet et absence de hors périmètre, `git diff --check`,
gates revérifiées, commit/push normal, SHA distant exact, arbre propre et origin
0/0 sont rapportés à l'issue de la livraison Git. Audit indépendant ChatGPT du code
sur ce SHA poussé est le prochain événement ; audit puis autorisation utilisateur
nécessaires pour toute clôture ou suite.

## Compléments ciblés après audit du code — 2026-10-10

Baseline de cette session : `c8e707637df1ca60d5740a6d2a8246771f53c380`.
Préflight avant modification : `git fetch origin` réussi, branche exacte
`rewrite/portfolio-versioned`, arbre propre, HEAD = origin = baseline, 0/0,
SHA de référence présent dans l'histoire ; aucune modification concurrente.
PLAN R1.1, présent canon, décisions, R0 notamment §13 et current_plan relus.
Ce complément ne modifie aucune décision normative ni R0/R0.1.
Les preuves initiales ci-dessus et sous `proofs/r11/` sont conservées intégralement.
Le SHA final est celui du commit contenant ce complément, communiqué après push.

### Point A : garantie existante démontrée

Sept nouveaux tests `audit A1` à `audit A7` dans
`src-v2/domain/versioning/versionEnvelope.test.ts`, tous PASS. Les fixtures
owner/prédécesseur sont créées par la factory publique, sans remplacement
ultérieur de l'owner. Aucun défaut fonctionnel reproduit, aucune correction
de production ni contrôle redondant ajouté.

| Test contradictoire | Résultat |
| --- | --- |
| A1 racine/enfant même identité, même owner | `established`, aucune référence manquante |
| A2 racine/enfant même identité, owners différents | refus `IMMUTABLE_OWNER_MISMATCH` |
| A3 prédécesseur exact absent | `not-established`, ref exacte signalée ; autre version, provenance et contexte d'un appel précédent ne le résolvent pas |
| A4 prédécesseur autre identité ou kind | refus dès création ; autre entityId : `PREDECESSOR_IDENTITY_MISMATCH` |
| A5 deux branches avec owner identique | ensemble `established` |
| A6 une branche avec owner divergent | ensemble refusé `IMMUTABLE_OWNER_MISMATCH` |
| A7 contextes inversés | résultats complets identiques pour acceptation, refus et parent manquant partagé |

La preuve combine deux contrôles existants : la création exige le même
kind/entityId pour le predecessor ; le contexte impose le même owner à toutes
versions fournies de cette identité. Ainsi un parent exact fourni ne peut avoir
un owner différent de l'enfant. Sans parent fourni, aucune compatibilité avec
un owner inconnu n'est prétendue : la vérification reste non établie.
Validation pure et locale conservée, aucun registre/resolver/sélection/stockage.

### Point B : limite contractuelle documentée

`createTypedVersionEnvelope<K,P>` conserve le type statique `P` fourni ou inféré
par TypeScript ; sa sortie expose `DeepReadonly<P>`. Avec un appel correctement
typé, un payload incompatible avec un `P` explicite est refusé à compilation.
Au runtime, la fonction délègue à `createVersionEnvelope` : structure de
l'enveloppe, refs, owner et filiation locale sont vérifiés ; le payload doit
être une donnée admissible, copiée puis gelée récursivement. Les données publiées
sont détachées des entrées ; les mutations des records/listes publiés sont refusées.

`P` est effacé au runtime. Aucun schéma métier associé à `P` n'est automatiquement
validé, aucune marque de validation métier n'est produite par l'assertion interne.
Un `as`, `any`, `@ts-expect-error` ou une entrée JavaScript peut mentir sur `P` :
un record admissible mais incompatible avec le type annoncé peut alors être
accepté. L'assertion TypeScript n'est donc jamais une preuve de validation métier.
Tout consommateur doit faire valider le payload par la frontière métier R1.2
avant de considérer une enveloppe comme entité métier validée ; la seule réussite
de cette factory R1.1 est insuffisante. Aucun schéma métier R1.2 implémenté ici.

Trois nouveaux tests PASS, sur une forme synthétique sans payload métier :

- B1 : champs et types inférés/explicites conservés, readonly des records et
  collections à compilation, copie détachée et gel profond effectifs au runtime.
- B2 : la factory typée refuse Map/Set/Date/cycle/fonction/undefined/float,
  malgré la possibilité statique de les fournir comme `P`.
- B3 : incompatibilité de forme refusée à compilation ; suppression volontaire
  de l'erreur ou cast forcé démontre l'absence de validation du schéma au runtime.

Décision : limite prévue par le PLAN et déjà indiquée dans le commentaire de
l'API, désormais prouvée explicitement. Recherche des usages : aucun consommateur
de production actuel de la factory typée, uniquement sa définition et ses tests.
Aucun défaut concret justifiant un changement d'API ; aucune évolution normative.
Le risque d'une interprétation erronée reste une obligation de la frontière R1.2,
sans prétendre que R1.1 protège contre les casts mensongers de l'appelant.

### Vérifications de ce complément

Environnement : macOS Darwin arm64, Node v24.21.0, npm 11.19.0, TypeScript 5.9.3.
Journaux nouveaux sous `proofs/r11-audit/`, indépendants des preuves initiales.

| Commande | Résultat | Preuve |
| --- | --- | --- |
| `npm run check:boundaries:v2` | PASS, code 0 | [boundaries.log](./proofs/r11-audit/boundaries.log) |
| `npm run typecheck:v2` | PASS, code 0 | [typecheck.log](./proofs/r11-audit/typecheck.log) |
| `npm run test:v2` | PASS, 68/68, fail/cancel/skip/todo 0 | [tests.log](./proofs/r11-audit/tests.log) |
| `npm run build:v2` | PASS, code 0, 16 modules / 18 assets V2 | [build.log](./proofs/r11-audit/build.log) |
| CivilDate, processus `TZ=UTC` | PASS 4/4 | [tz-utc.log](./proofs/r11-audit/tz-utc.log) |
| CivilDate, processus `TZ=Europe/Paris` | PASS 4/4 | [tz-paris.log](./proofs/r11-audit/tz-paris.log) |
| CivilDate, processus `TZ=America/New_York` | PASS 4/4 | [tz-new-york.log](./proofs/r11-audit/tz-new-york.log) |
| `git diff --check` | PASS, code 0 | contrôle avant commit |

68 tests = 58 existants + 7 owner/prédécesseur + 3 contrat payload.
Les trois processus TZ réexécutent 12 tests en plus : 80 exécutions de tests
au total, 68 tests distincts, aucun échec. Les assertions `@ts-expect-error`
sont vérifiées par la compilation de la suite dans `test:v2`.
Les 18 gates restent PASS : Q01–Q05, D01–D04, V01–V06 et A01–A03 sont
réexécutées, V02/V03/V04 complétées par ces preuves. Aucun test existant retiré ;
le titre du test payload initial distingue désormais type statique et schéma.
Inspection du diff : seulement tests, canon, entrée du plan courant et nouveaux
journaux. Production/API, dépendances, legacy, garde, stockage, R0/R0.1 inchangés.
Smoke browser et rollback historiques non réexécutés pour ce complément sans
changement de production ; leurs preuves initiales ne sont pas réattribuées.

Défaut reproduit puis corrigé : aucun. Garantie existante démontrée : point A
et immutabilité/type statique du point B. Limite contractuelle documentée :
absence de validation automatique du schéma métier. Limites runtime et report
Windows précédents inchangés. R1.1 reste IN REVIEW, aucune clôture automatique.
Le prochain événement est exclusivement l'audit différentiel par ChatGPT
du SHA poussé ; aucun démarrage de R1.2.

R1 — CADRAGE VALIDÉ

R1.1 — IN REVIEW — CORRECTIONS À AUDITER

R1.2–R1.4 — NOT STARTED

R2–R6 — NOT STARTED
