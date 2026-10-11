# FlowPlan2 V2 — R1.2-PERF-P3-B : réutilisation locale du payload validé

## Réalisation autorisée P3-B — 2026-10-11

La mission utilisateur explicite « IMPLÉMENTATION AUTORISÉE » approuve
A-P3B-01–09 dans son périmètre et remplace l'état préalable PLAN ONLY.
Baseline de livraison : `6b1d65f15f6479b14be721417a5a9bc036257d36` ; baseline
oracle/mesures A1 réelle : `1d1c66b2b38a6599f1ab0950c4dd1fdffd1e6e74`.
**Architecture B2 avec acquisition validante B1 réalisée** : orchestrateur privé,
deux branches unknown acquises intégralement, captures const, un checker lexical
sans paramètre, les 14 schémas textuellement préservés. Copie autonome conservée ;
seule copie de contrôle métier du chemin version supprimée. Trois exports
inchangés ; pas de capacité échappée, bypass, validation conditionnée à un type,
callback ou await. Deux assertions terminales préexistantes conservées uniquement
pour les types dépendants. Registres/certification/ports inchangés.

[Rapport de réalisation, architecture, tests, oracle, benchmarks, profils,
allocations, rollback et deux verdicts](./proofs/r12-perf-p3-b/report.md).
245 tests PASS (32 nouveaux), R1.1 51 / R1.2 155 PASS, G12-01–13 et régressions
acquises ; 2 259 réponses différentielles sans divergence, sceau vérifié.
Frontières/typecheck/build PASS. Conformité technique PASS ; performance globale
**C**. R1.2 **IN REVIEW**, R1.3/R1.4/R2 **NOT STARTED** ; aucun P3-C.

Les sections 1–13 suivantes conservent l'étude de faisabilité préalable et ses
résultats historiques/non exécutés à cette date. Les mentions « non autorisé »
ou « futurs » y sont historiques ; les résultats réellement exécutés du correctif
sont ceux du rapport de réalisation, distincts des anciens PASS.

2026-10-11 — **PLAN ONLY / ÉTUDE DE FAISABILITÉ À AUDITER**.
Baseline obligatoire et futur oracle P3-A1 réel :
`1d1c66b2b38a6599f1ab0950c4dd1fdffd1e6e74`.
Branche : `rewrite/portfolio-versioned`.

**Recommandation proposée : B2 avec acquisition et contrôle lexicaux de B1**,
strictement dans `payloadValidation.ts`. La copie intermédiaire paraît
supprimable par construction du flux, sous réserve de l'audit indépendant et
des preuves futures d'équivalence. A reste le fonctionnement livré ; C impose
son maintien si la preuve échoue. Aucune décision B ni implémentation autorisée.

P0/P1/P2/P3-A1 **techniquement acceptés selon la mission utilisateur** ; les
rapports historiques conservent leurs statuts de livraison. **R1.2 IN REVIEW ;
performance globale C ; R1.3/R1.4/R2 NOT STARTED.** Ni clôture ni GO implicite.
Aucun code, test, script, benchmark, configuration ou preuve historique modifié.
Aucun test/build, oracle, benchmark, profil ou instrumentation exécuté ici.

## 1. Préflight et sources consultées

Avant rédaction : branche attendue ; arbre propre ; HEAD exact à la baseline.
`git fetch origin` a d'abord rencontré la restriction d'écriture de
`.git/FETCH_HEAD`, puis a réussi après élévation autorisée. Après fetch : HEAD
et `origin/rewrite/portfolio-versioned` = baseline, divergence **0/0**. Aucun
commit intercalaire ni changement concurrent inexpliqué. Remote :
`https://github.com/kartaguez/FlowPlan2.git`. Aucun AGENTS.md applicable trouvé
sur le chemin du dépôt ou dans ses sous-répertoires. Aucun force-push.

Sources normatives lues : [current_plan](../../current_plan.md),
[current_canon](../../current_canon.md), [canon R1.1](./rewrite_r11_canon.md),
[canon R1.2](./rewrite_r12_canon.md), [plan P3 et réalisation A1](./rewrite_r12_perf_p3_plan.md),
[décisions et amendements A-R12-01–09/B1–B4](./rewrite_decisions.md).
Les statuts de préparation des anciens documents restent historiques ; la
mission fixe les statuts actuels, sans réécrire les canons ni décisions.

Preuves examinées en lecture seule : [rapport P2](./proofs/r12-perf-p2/report.md)
et ses comparaisons/profils décrits ; [rapport A1](./proofs/r12-perf-p3-a1/report.md),
[protocole](./proofs/r12-perf-p3-a1/README.md),
[comparaison A1](./proofs/r12-perf-p3-a1/comparison.json),
[analyse CPU](./proofs/r12-perf-p3-a1/profiles-analysis.json), profil brut A1 M5
dense et [oracle différentiel](./proofs/r12-perf-p3-a1/differential.json).
Lecture des archives `a1-oracle`, `a1-supplement`, `a1-copy` JSONL gzip et de
leurs métadonnées : **1 245 + 9 + 34 = 1 288 réponses**. Cette lecture ne
constitue ni un rejeu ni une nouvelle preuve PASS.

Code réel analysé à la baseline :

- `src-v2/domain/portfolio/payloadValidation.ts` et `payloads.ts` ;
- `src-v2/domain/versioning/{versionEnvelope,versionRegistry,immutableValue,owner}.ts` ;
- `src-v2/domain/primitives/{data,result,identity,exactReference,civilDate,quantity,rational}.ts` ;
- resolver, validation et certificat de graphe, Application `loadPortfolioGraph`,
  adapter mémoire, ports et appels identifiés par recherche ;
- tests existants R1.2 et commandes du dépôt, uniquement lus.

La livraison documentaire comprend ce fichier et les deux points d'entrée.
SHA final et état Git distant seront rapportés après commit/push, sans
inscrire dans le document son propre SHA.

## 2. Cartographie du flux actuel et des responsabilités

| Entrée / site | Acquisition et contrôles, dans l'ordre | Sortie / durée de vie |
| --- | --- | --- |
| `validateBusinessPayload(kind, unknown, path)` public | Copie complète `copyImmutableValue` ; `dataRecord` racine ; schéma fermé du kind ; règles complémentaires | Retourne la copie profonde gelée ; contrat autonome complet |
| `createBusinessVersion(unknown, path)` public | `dataRecord` entrée ; `validateExactReference(ref)` ; `createVersionEnvelope(ref.kind,input,path)` ; `validateBusinessPayload(ref.kind,envelope.payload,path.payload)` | Retourne l'enveloppe initiale, abandonne le payload de contrôle recopié |
| `createVersionEnvelope(kind, unknown)` R1.1 | Record/clés ; ref ; owner ; copie complète payload ; predecessor ; copie provenance, liste et refs/self/doublons ; gel enveloppe | Possède une nouvelle copie payload détachée, pas encore validée métier |
| `createVersionRegistry(unknown)` | Copie complète de toute la liste ; factory métier par occurrence ; contexte R1.1 ; mapping owners ; déduplication | Enveloppes métier distinctes gelées et rapport contextuel |
| `validateVersionContext(unknown)` R1.1 | Copie complète liste ; enveloppes génériques/collisions séquentielles ; owners par identité ; filiations/missing | Rapport `established` ou `not-established`, répétitions conservées |
| `withVersions(registry,batch unknown)` | Copie batch puis factory registre complet | Nouveau registre ; aucun sous-lot publié |
| Resolver / validation / certification | Factory manifeste puis registre ; exact lookup ; structure ; borne Snapshot après structure | Certificat par factory unique ; aucune validation trusted nouvelle |
| Application collect / chargement | Port unknown ; premier registre complet ; demandes manquantes avant extras ; retour de la réponse originale ; certification, donc second registre | Pas de nouvelle autorité Application ; réponse port revalidée à certification |
| Adapter mémoire | Factory registre au setup, copies Current/Snapshots ; exact lookup à lecture | Fournit des données, aucun certificat ; coût setup séparé |

Dans le code de production, `createBusinessVersion` est appelé par le registre ;
`validateBusinessPayload` est appelé par `createBusinessVersion`. Les tests les
appellent aussi directement ; leurs exports imposent de considérer tous les
appels extérieurs inconnus, même sans autre caller de production actuel.
Le registre est consommé par resolver, collect, adapter et `withVersions`.

La cible B ne concerne que le lien synchrone **enveloppe réussie → schéma métier**.
Le schéma ne remplace ni ref/owner/predecessor/provenance, ni contexte, ni
fermeture/partition/grille/certification. Les enveloppes génériques R1.1
continuent à accepter des payloads admissibles sans schéma métier R1.2.

## 3. Ce que prouve la copie initiale — et ce qu'elle ne prouve pas

`copyImmutableValue` conserve null, booléens, chaînes, BigInt et entiers sûrs
(y compris -0). Toute autre primitive refuse `INVALID_PAYLOAD_VALUE` ; nombre
fractionnaire, NaN, infini ou entier non sûr refuse `INVALID_PAYLOAD_NUMBER`.
BigInt n'est pas une preuve de quantité : aucune famille/unité/canonicalité
rationnelle/signe/borne ratio n'est vérifiée par la copie.

Pour un objet, recherche dans les ancêtres avant inspection ; cycle →
`CYCLIC_PAYLOAD`. La pile A1 est locale et restaurée par finally. Un DAG est
recopié séparément à chaque branche ; aucun alias mutable d'entrée ne survit.
Un record doit avoir prototype Object.prototype ou null, sans symboles ;
`dataRecord` inspecte **tous** les descripteurs propres avant la récursion des
valeurs. Accessor/non-enumerable → `INVALID_DATA_PROPERTY` au chemin de la clé ;
objet exotique → `INVALID_RECORD`. Les copies de records sont de nouveaux
records ordinaires issus de `Object.fromEntries`, gelés, même si l'entrée avait
prototype null ou une clé propre `__proto__`.

Pour un array : prototype Array.prototype, aucun symbole ; descripteurs dans
l'ordre, index exactement égal au compteur, donnée énumérable, récursion de
l'élément avant le descripteur suivant ; vérification finale count=length.
Propriété extra, getter, trou ou prototype interdit → `INVALID_PAYLOAD_ARRAY`.
Un array ne possède donc pas la priorité globale des descripteurs du record :
ne pas déplacer ses contrôles. Les sorties sont des arrays neufs denses gelés.

Sur succès, la copie propre contient seulement ce langage de données et aucun
Proxy source conservé. Les opérations de réflexion sur une entrée Proxy peuvent
exécuter des traps ou lever ; B garde l'acquisition initiale et ne prétend pas
ajouter une garantie d'interception. Getters de propriétés rejetés non invoqués.
Les intrinsics JS standards sont supposés, comme pour le comportement livré.

**Argument de redondance local à vérifier par l'audit :** sur cette copie
fraîche, ordonnée et gelée, un second `copyImmutableValue` ne peut découvrir un
nouveau défaut de données sous ces hypothèses. Il recrée des données égales,
avec mêmes clés/positions/primitives et -0, sans ajouter de règle métier. Le
checker actuel lit des valeurs et non l'identité des records copiés ; mêmeIdentity
compare kind/entityId, les doublons ProjectId/weekdays comparent des primitives.
Il ne conserve pas les reconstructions de quantités/refs comme payload final.

Supprimer le second passage retire des **répétitions de contrôles**, pas leur
couverture : chacun reste réalisé sur l'intégralité de l'entrée par la copie
initiale. On ne peut pas généraliser cette conclusion à un objet extérieur gelé,
une brand ou une sortie présumée. Les inspections superficielles `dataRecord`
du schéma et les factories primitives restent toutes présentes.

## 4. Analyse exhaustive des 14 schémas et de leurs priorités

Notation : `p` est exactement le path fourni au checker (`payload` par défaut
public ; `${path}.payload` pour une version). Dans chaque record métier :
`dataRecord`, puis ensemble de clés exact `INVALID_PAYLOAD_KEYS` à son path,
puis checks dans **l'ordre écrit ci-dessous**, arrêt au premier refus. Tous les
champs listés sont obligatoires ; aucune clé optionnelle dans ces payloads.
Les options métier sont null ou un record OptionalQuantity, jamais omission.
Chaque liste garde ordre et multiplicité ; élément à `p.champ.i`.

Contrôles communs gardés :

| Abréviation | Contrôle métier et diagnostics possibles |
| --- | --- |
| Nom | string non vide après trim : `INVALID_NAME`. Canonicalité catalogue vérifiée seulement à la fin, `NON_CANONICAL_CATALOG_NAME` à `p.name` |
| L | existing/deleted : `INVALID_LIFECYCLE` ; aucun confirmed/suspended |
| Bool | typeof boolean : `INVALID_BOOLEAN` ; nul n'est pas faux |
| Couleur | string regex `#` + six caractères hex majuscules : `INVALID_CANONICAL_COLOR` |
| Date | `createCivilDate` strict YYYY-MM-DD grégorien 0000–9999, jours/bissextiles ; `INVALID_CIVIL_DATE` au champ |
| Intervalle | Inspecte record, revalide début puis fin, refuse début > fin : `INVERTED_INTERVAL` au record ; aucune relation de dates supplémentaire |
| Identité K | Clés kind/entityId, kind exact, EntityId validé : `INVALID_VERSION_KIND`, `IDENTITY_KIND_MISMATCH`, `ID_FAMILY_MISMATCH`, `INVALID_OPAQUE_ID`, diagnostics dataRecord |
| Ref exacte K | Clés kind/entityId/versionId ; kind puis EntityId puis VersionId : `REFERENCE_KIND_MISMATCH` et diagnostics IDs/record ; version obligatoire |
| Q(F) | Record family/unit/value exacts : `QUANTITY_FAMILY_MISMATCH` ; Rational numerator/denominator BigInt, d>0 et PGCD=1 : `INVALID_CANONICAL_RATIONAL` à champ.value ; non négatif : `NEGATIVE_QUANTITY` ; ratio ≤1 : `RATIO_OUT_OF_RANGE`. Factories conservent aussi `INVALID_QUANTITY_FAMILY` pour famille inconnue |
| Liste | Array exigé : `INVALID_LIST` ; chaque item contrôlé dans l'ordre ; densité/descripteurs/cycles déjà contrôlés par copie complète |

Les erreurs de type record restent `INVALID_RECORD` ; les codes de clés des
primitives ID/ref/quantité ne sont pas remplacés par `INVALID_PAYLOAD_KEYS`.
Les messages par défaut sont le code via `invalid`, les messages explicitement
propagés par d'autres étages restent inchangés. Aucun raccourcissement ni
normalisation de chemins/messages n'est proposé.

| VersionKind | Champs et checks locaux, ordre exact | Règles après les champs, priorité et portée |
| --- | --- | --- |
| ProjectSettings | name(Nom), lifecycle(L), isActive(Bool), program(null ou identité Program), pas(null ou identité Pas), ownColor(null ou Couleur), earliestStartDate(null ou Date), objectiveEndDate(null ou Date), mandatory(Bool) | Après tous champs : mandatory=true et objective=null → `MANDATORY_OBJECTIVE_REQUIRED` à p ; puis exclusivité Program/couleur → `PROGRAM_COLOR_EXCLUSIVITY` à p. Aucun objective≥earliest ajouté |
| ReservationSettings | name, lifecycle, isActive, program, pas, ownColor comme Project ; startDate(Date), endDate(Date) | Intervalle start/end après champs, avant exclusivité Program/couleur. Une inversion reste prioritaire sur exclusivité |
| TeamSettings | name(Nom), lifecycle(L), isVisible(Bool) | Aucun contrôle supplémentaire local ; visibilité purement visuelle |
| Program | name(Nom), lifecycle(L), color(Couleur) | Canonicalité du nom trim + réduction des espaces, après champs ; pas d'unicité des noms ici |
| Pas | name(Nom), lifecycle(L) | Même canonicalité finale que Program ; pas de couleur |
| PT | lifecycle(L), dailyCap(OptionalQuantity DailyCap) | `{kind:'absent'}` exact ou `{kind:'present',value:Q(DailyCap)}` exact ; `INVALID_OPTIONAL_QUANTITY` au champ, quantité présente à p.dailyCap.value ; absent distinct du zéro, aucun champ omissible |
| RT | lifecycle(L), demand(record) | Inspecte demand puis branche sur mode==='ratio' ; ratio : mode exact puis ratio Q(ReservationRatio) ; toute autre valeur : schéma fixed-daily, mode exact puis daily Q(FixedDailyDemand). Clés fermées AVANT `INVALID_DEMAND_MODE` ; pas de reformulation en switch qui changerait cette priorité |
| TeamActual | consumed Q(Consumption) | Exact, ≥0, zéro valide ; association/SP sont dans owner, pas payload |
| PTEC | actualPeriod(identité ActualPeriod), lastActualsDate(null ou Date), etc Q(ETC) | Identité sans version ; aucun statut, égalité de frontière AP contrôlée ensuite dans graphe, pas ici |
| ActualSubPeriod | from(Date), through(Date) | Intervalle inclusif from/through après champs ; appartenance, partition et owner AP ensuite dans graphe |
| ActualPeriod | coverage(empty/covered), from(null strict si empty sinon Date), through(même règle), subPeriods(liste refs exactes ActualSubPeriod) | `INVALID_COVERAGE` au champ ; empty impose null (`EMPTY_BOUND` au champ). Tous items d'abord ; puis longueur empty=0 / covered>0 (`INVALID_AP_PARTITION` à p). Revalide chaque ref à **p** et refuse même identité, même version ou autre version (`DUPLICATE_SUBPERIOD` à p) ; ensuite intervalle si covered. Partition contiguë/owners/fermeture ensuite dans graphe |
| PortfolioOrder | projectIds(liste validateId ProjectId) | Tous IDs d'abord aux chemins indexés ; revalidation des IDs à **p**, Set des chaînes `.value`, `DUPLICATE_PROJECT_ORDER` à p ; inventaire complet/order métier ensuite dans graphe |
| PlanningSettings | horizon(record start(Date), end(Date), puis intervalle), workingWeekdays(liste numbers entiers 1..7), maxParallelProjects(number entier sûr >0) | Horizon fermé prioritaire ; weekdays tous items `INVALID_WEEKDAY`, puis `DUPLICATE_WEEKDAY` au champ ; liste vide valide. Limite `INVALID_PARALLEL_LIMIT`. Nombres non sûrs refusés par copie AVANT ces checks |
| TeamCapacity | periods(liste records start(Date), end(Date), dailyCapacity Q(Capacity), unavailabilityRatio Q(UnavailabilityRatio), puis intervalle par item), exceptions(liste records date(Date), capacity Q(Capacity)) | Tous periods puis toutes exceptions validés avant ordre. Scan periods puis exceptions : start courant > end précédent, dates exception strictement croissantes ; `UNORDERED_OR_OVERLAPPING_CALENDAR` à p.periods/p.exceptions. Les dataRecord de ce scan ont path **p**. Vides/gaps/exceptions hors horizon acceptés ; aucun tri |

Pour Project/Reservation, la condition exacte maintenue est
`(program === null) !== (ownColor !== null)` → refus lorsque Program et couleur
propre sont tous deux présents ou tous deux null. Les deux formes valides sont
Program avec couleur propre null, ou sans Program avec couleur propre non nulle. Pas n'a pas cette
exclusivité. Pour Program/Pas, la canonicalité finale ne modifie pas le nom.

Les bornes métier, owners croisés, refs résolubles, lifecycle des catalogues,
partition AP contiguë, grille TA exacte, PTEC et Snapshot restent dans
`graphValidation`/registre/contexte. Rien n'est transféré au copier générique.
**B ne supprime aucun des checks de cette matrice**, y compris validations
répétées AP/Order/intervalle et objets temporaires de primitives.

## 5. Comparaison A / B1 / B2 / C

| Stratégie | Faisabilité / preuve | Coût / risque / recommandation |
| --- | --- | --- |
| A — garder le code livré | Toutes copies et APIs actuelles, preuve historique A1 | Référence sûre, M1 dense ~2,82 s/M5 ~7,55 s ; seconde copie temporaire par version. Choix si B non prouvé |
| B1 — contrôle lexical capturé | Closure privée sans paramètre de payload après enveloppe réussie ; aucune donnée substituable | Sûr localement si corps métier unique. Copier le switch dans la closure et garder un autre switch public créerait une divergence : forme rejetée. Seul B1 ne résout pas cette mutualisation |
| B2 — réorganisation locale | Un orchestrateur privé acquiert lui-même les données de chacun des deux chemins publics ; un seul checker lexical sans argument de données contient les 14 schémas | **Recommandé sous audit/GO**, avec garanties B1. Réorganisation limitée à un module ; routage/retours à examiner ; aucune fonction trusted exportée ou capacité retournée |
| C — abandon de B | Conserver A si provenance, unicité ou diagnostics non établis | Recommandation obligatoire en présence d'une divergence ou d'une architecture qui exige un bypass ; aucune concession de validation pour performance |

Une simple extraction `checkTrustedPayload(kind,payload)` privée au niveau module
ne serait pas une preuve de provenance par elle-même : son paramètre reste
forgeable par un futur caller interne. L'encapsulation ESM empêche un import
externe, mais ne garantit pas l'origine de ce paramètre. Elle n'est donc pas
la forme recommandée. Une extraction dans un fichier « internal » avec export
serait directement importable et est exclue.

## 6. Proposition concrète d'encapsulation B2, non implémentée

Un seul module propriétaire : `domain/portfolio/payloadValidation.ts`, déjà
propriétaire des deux APIs publiques. Aucun déplacement de règles R1.1, aucun
nouvel import runtime ou export. Les trois exports actuels (`catalogNameKey`,
`validateBusinessPayload`, `createBusinessVersion`) conservent leurs contrats.

Proposition de flux, descriptions algorithmiques uniquement :

1. Les deux APIs délègueraient à un **orchestrateur privé** du même module,
   avec une requête d'entrée unknown et son path. Deux modes privés distinguent
   *payload public* (kind fourni comme aujourd'hui) et *version publique*.
   Ce discriminant ne signifie jamais « validé » : **les deux branches valident**.
2. Branche payload : appeler `copyImmutableValue(input,path)` et propager son
   refus avant tout schéma, y compris avant refus kind inconnu comme actuellement.
   Capturer cette copie comme payload ; capturer le kind/path de cet appel.
3. Branche version : garder exactement inspection record et pré-validation ref,
   puis `createVersionEnvelope(ref.kind,input,path)` ; propager tout refus.
   Capturer **cette sortie réussie** dans une liaison locale constante, puis son
   payload, le kind issu de la pré-ref validée et `${path}.payload`. Aucun objet
   enveloppe fourni comme argument « already-valid » à l'orchestrateur.
4. Seulement après cette acquisition, une **closure privée lexicale**, sans
   argument de payload, contrôlerait la donnée capturée. Son corps unique reprend
   à l'identique `dataRecord` racine, les helpers actuels, le switch des 14 kinds
   et les règles finales. Aucun schéma dupliqué dans les branches d'acquisition.
5. Invocation immédiate synchrone, une seule fois, sans await/callback extérieur.
   Refus propagé intact. Succès : chemin payload retourne sa copie capturée ;
   chemin version retourne l'enveloppe capturée, pas un nouvel assemblage.
   Le checker peut rendre un résultat de contrôle privé ; il ne rend aucune
   capacité réutilisable ou certificat intermédiaire aux callers.

Le checker serait défini une seule fois lexicalement dans l'orchestrateur, après
les branches d'acquisition ; son code est partagé entre tous les appels. Les
variables requises seraient constantes après acquisition. Les détails de types
retours privés (union corrélée/overloads) resteraient à auditer, sans signature
trusted, paramètre callback d'acquisition externe, factory de closures publique
ni argument mutable de substitution. Les assertions TS terminales établissent
seulement le type dépendant comme aujourd'hui ; elles ne prouvent rien au runtime.

| Question d'encapsulation | Réponse proposée / preuve attendue |
| --- | --- |
| Qui possède la copie validée ? | L'appel synchrone de l'orchestrateur privé ; branche version : enveloppe fraîche renvoyée par factory R1.1 réussie, retenue localement |
| Quelle fonction contrôle cette copie ? | Checker lexical sans argument de donnée ; schémas uniques capturant payload/kind/path de l'acquisition réussie |
| Est-elle exportée/importable directement ? | Non ; aucun export direct, barrel, objet de méthodes ou closure retournée ; vérifier namespace ESM et graphe des exports émis |
| Peut-elle recevoir un payload forgé ? | Pas de paramètre de payload. Aucun handle extérieur ne permet de l'appeler ; l'orchestrateur reçoit unknown et exécute une acquisition complète dans chaque branche |
| Peut-on substituer une donnée mutable ? | Pas de variable réassignable ni pointeur venant du caller après acquisition ; aucun callback fourni par le caller ; jamais relire input.payload pour le schéma |
| Mutation entre les étapes ? | Flux synchrone sans yield ; records/arrays du payload profondément neufs et gelés, primitives immuables. Muter une entrée externe après acquisition ne touche pas la capture |
| Schémas uniques ? | Un seul switch et mêmes helpers, communs aux deux branches ; aucun second catalogue, codegen, wrapper de règles ou validation partielle |
| Sorties détachées/gelées ? | Payload public issu de sa propre copie ; version issue de l'enveloppe profonde ; refs/owner/provenance/predecessor restent ceux reconstruits et gelés par R1.1 |
| Unknown contourne-t-il les contrôles ? | Les deux seules entrées publiques acquièrent/copient intégralement ; faux kind reste diagnostiqué dans le même ordre ; enveloppe forgée/frozen/désérialisée repasse par factory |

ES modules masquent les liaisons non exportées ; un import namespace ne donne
pas accès à leur environnement lexical. Les closures ferment sur des **liaisons**,
pas sur une preuve intrinsèque : const, aucune fuite et acquisition effective
sont indispensables. TypeScript readonly/brand est effacé ; un cast, symbole,
booléen « validé », cache WeakMap/WeakSet ou annotation trusted ne prouve pas
la provenance. Le mode privé ci-dessus choisit une validation complète, jamais
une dispense. Aucune API intermédiaire de certification n'est introduite.

Cette preuve porte sur le module réel et ses chemins publics sous runtime JS
normal ; elle ne protège pas contre un module réécrit, loader malveillant,
débogueur ou intrinsics compromis. Revue/gardes des exports et appels contrôlent
la maintenance, sans être traitées comme certificats runtime. Si une nouvelle
exigence impose transport/authentification d'un payload entre modules, **C** :
revalider, ne pas étendre cette optimisation locale.

## 7. Diagnostics : ordre strict et cas bloquants

Ordre version conservé : record d'entrée → pré-ref validée → record/clés
enveloppe → ref attendue → owner → **copie complète du payload** → predecessor
(exact, même identité, non-self) → **copie complète provenance** → liste/refs,
self puis doublons par source → gel enveloppe → schéma métier. Pas de validation
métier avancée entre payload et predecessor/provenance.

Ordre registre conservé : copie de **toute** la liste avant premier schéma ;
chaque occurrence métier dans son ordre ; copie contexte puis enveloppes et
collisions séquentielles ; owners ; filiations ; mapping owner→identité ;
déduplication. Les répétitions identiques/divergentes et rapports du contexte
ne sont pas supprimés. Aucun changement dans collect/certification ni l'ordre
structurel AP/grille/Order/borne Snapshot. R1.1 APIs et comportements intacts.

| Multidéfaut futur, à figer sur A1 réelle | Premier diagnostic à préserver / erreur d'architecture à éviter |
| --- | --- |
| Record payload avec enfant unsafe et accessor tardif | `INVALID_DATA_PROPERTY` tardif inspecté avant récursion de l'enfant ; ne pas valider les champs au fil de la copie |
| Array avec premier item nombre non sûr et propriété interdite ultérieure | `INVALID_PAYLOAD_NUMBER` au premier item avant descripteur ultérieur ; garder ordre spécifique array |
| Champ métier invalide tôt et cycle/nombre invalide dans champ extra tardif | Refus copie, pas `INVALID_PAYLOAD_KEYS` ni erreur métier précoce |
| Schéma invalide et predecessor incohérent / source self | Refus enveloppe (`PREDECESSOR_IDENTITY_MISMATCH` / `SELF_PROVENANCE`) avant métier |
| Owner invalide et payload invalide | Owner avant copie payload ; ne pas extraire payload avant enveloppe |
| Liste : premier payload métier invalide, dernière version cyclique | Copie entière refuse cycle avant premier schéma |
| Public kind inconnu avec payload cyclique/non-record | Copie puis dataRecord avant default `INVALID_VERSION_KIND`, comme aujourd'hui |
| RT mode invalide et clés inattendues | `INVALID_PAYLOAD_KEYS` avant `INVALID_DEMAND_MODE` selon branche fixed-daily actuelle |
| AP répétition précoce et référence malformée tardive / intervalle inversé | Tous items avant doublons ; doublon avant intervalle après items valides |
| Order doublon précoce + ID malformé tardif | Erreur ID indexée avant doublon à p |
| Capacity périodes non ordonnées + exception invalide tardive | Tous schémas d'exceptions avant ordre des périodes |
| Project mandatory sans objective + exclusivité couleur invalide | `MANDATORY_OBJECTIVE_REQUIRED` avant `PROGRAM_COLOR_EXCLUSIVITY` après champs valides |
| Collision divergente + owner contradictoire / cycle filiation | Collision avant owner avant cycle ; payload métier tardif peut précéder la phase collisions |
| Missing demandé + extra malformé / répétition divergente | Refus registre complet avant `READ_REFERENCE_MISMATCH` ; aucun filtrage anticipé |
| Contexte parent absent | `not-established` et listes/multiplicité intactes, aucune promotion |

Les codes cités sont des priorités connues du code ; chaque permutation du
corpus futur aura **sa propre réponse A1 scellée**, sans inventer de sortie.
Les refus de copie impossibles sur la capture saine n'autorisent pas à retirer
la copie publique ni à commencer les règles avant la copie intégrale initiale.
Une autre identité d'objet interne est acceptable seulement si elle n'est pas
observable dans le contrat ; l'identité conservée de l'enveloppe finale et le
copiage séparé des DAG doivent être prouvés au runtime. Toute différence
code/path/message/ordre/premier défaut est **bloquante**, sauf arbitrage explicite
ultérieur ; aucune exception accordée par ce plan.

## 8. Frontières hexagonales et portée inchangée

Domain conserve validation, versions, identité, invariants, résolution et unique
certification du graphe. Application orchestre les ports unknown et les factories,
sans certificat local ni connaissance de la capture. Adapters fournissent les
données et copies de setup, sans autorité métier. Ports/formats/enveloppes,
manifestes, contextes, collect/certification, snapshots historiques autonomes et
validation R1.1 restent inchangés.

Pas d'API trusted/certification intermédiaire, helper exporté de payload validé,
cache, partage entre appels, nouveau certificat, bypass setup→port ou
collect→certification. La réponse mutable d'un port peut changer entre awaits :
le second registre de certification reste obligatoire. B ne réduit pas ce risque.
Aucune preuve de transition, confirmation, publication ou durabilité n'est ajoutée.
Aucune suite R1.3/R1.4/R2 commencée.

## 9. Bénéfice analytique et limites des preuves existantes

Mesures historiques A1, opérations complètes, médianes ordinaires :

| Mesure A1 moyen dense | Observation |
| --- | ---: |
| M1 registre | 2 822,3 ms (~2,82 s) |
| M3 validation graphe | 3 764,5 ms |
| M4 certification Snapshot | 4 015,6 ms |
| M5 chargement Snapshot | 7 554,24 ms (~7,55 s) |
| M5 heap endpoint / RSS lifetime | ~442,92 / 799,95 Mio |
| M5 heap retenue avec résultat | ~131,82 Mio |

A1 M5 dense inclusifs : registre 77,47 %, copy 40,65 %, dataRecord 56,69 %,
enveloppe 25,52 %, payload 24,49 % ; GC self 4,28 %. A1 M1 dense : registre
93,20 %, copy 47,14 %, dataRecord 58,45 %, payload 32,05 %. Les inclusifs
recouvrent copie, schémas et sous-factories : **aucun coût exclusif de la seconde
copie n'est isolé**. Le profil brut confirme des frames payload/copie/inspection,
mais ne fournit pas une attribution par site fiable de toutes allocations.

P2 avait retiré les scans quadratiques de grille (M5 dense ~24,22→8,73 s dans
sa campagne) ; A1 n'a donné qu'un effet M5 faible (~7,568→7,554 s dans une
campagne différente). Ne pas attribuer la différence 8,73→7,55 à A1 :
environnement/JIT/charge diffèrent ; contrôles inversés A1 conservés séparément.
L'expérience confirme que retirer des allocations ne garantit pas un gain global.

Soit N le nombre d'occurrences du registre avant déduplication. Soit W(P_i)
le nombre de visites de la copie du payload i, **branches DAG comptées chacune**,
C(P_i) son nombre d'occurrences records/arrays. En cas de succès B envisagé :

| Périmètre | Actuel A1 | B proposé | Économie analytique |
| --- | ---: | ---: | ---: |
| Factory version : copies payload profondes | 2 | 1 | 1 traversée W(P_i) et C(P_i) conteneurs profonds + temporaires de copie |
| Registre : passages équivalents de tous payloads | 5 | 4 | Σ W(P_i), **20 % de ce volume de copie**, aucun % de latence |
| Registre : appels copies payload seules (hors copies globales) | 3N | 2N | N copies de contrôle abandonnées |
| M5/M6 stable : deux registres hors setup | 10 passages / 6N copies seules | 8 passages / 4N copies seules | 2N copies de contrôle, 2Σ W(P_i) visites |
| Setup mémoire sur S occurrences | 5 passages / 3S copies seules | 4 passages / 2S copies seules | S copies, gain setup séparé de latence API |
| Schémas métier / enveloppes / owners par registre | N / 2N / 2N | mêmes comptes | Aucun contrôle supprimé |

Les cinq passages actuels sont : liste initiale, payload enveloppe métier,
payload contrôle métier, liste contexte, payload enveloppe contexte. Les copies
globales incluent déjà tous payloads : ne pas additionner deux fois les volumes.
Pour port mutable : économie Nc+Nf copies, pas 2N supposé, les deux acquisitions
restent indépendantes. En échec : économie seulement pour les occurrences qui
atteignent le checker après une enveloppe réussie ; les autres copies initiales
ne sont pas économisées.

Fixtures historiques N=R : moyen sparse **8 604**, dense **55 404**. Une M1
réussie pourrait éviter respectivement 8 604 / 55 404 copies de contrôle ;
M5/M6 hors setup 17 208 / 110 808. Dense : 554 040→443 232 passages équivalents
par occurrence de payload en chargement ; ce ne sont pas des nombres de nœuds
ni octets. DAG internes, tailles et proportion TeamActual/Capacity/AP varient.

| Poste | Effet plausible et limite |
| --- | --- |
| Payload générique | Moins de parcours DFS, inspections/descripteurs, conteneurs, gel et temporaires abandonnés ; primitives/BigInt ne sont pas dupliqués en nouveaux objets comme les records |
| Schémas métier | Même travail, y compris reconstructions refs/quantités/records d'inspection et scans/doublons ; coût dépend BigInt/tailles, non supprimé |
| Enveloppes / owners | Mêmes deux assemblages par occurrence registre, mêmes refs/provenance/predecessor ; pas de gain revendiqué |
| Contexte R1.1 | Même liste copiée, collisions/égalité, owners, parcours de filiation et missing ; longues chaînes toujours potentiellement quadratiques |
| Certification complète | Deux registres M5/M6, manifestes, exact lookup, inventaires, structure et borne Snapshot restent ; coût non assimilable à M1 seul |
| Allocation cumulée | Conteneurs et temporaires de N payloads en moins par registre ; une closure/routage local éventuels ajoutent un coût à observer ; pas d'octets exacts établis |
| Heap retenue | Payload de contrôle déjà abandonné actuellement ; mêmes sorties/reader retenus attendus, pas de réduction structurale retenue promise |
| Heap endpoint / RSS | GC, setup, allocator et OS influencent résultats ; endpoint ≠ pic, RSS lifetime ≠ pic loading exclusif ; baisse non garantie |

Gains plausibles : réduction locale de CPU/allocation et éventuellement pression
GC, plus visible sur gros payloads ; faible/null voire régression sur petits
payloads si routage/closure/JIT compensent. **Aucune fourchette de secondes ou
pourcentage de latence fiable** ne se déduit des preuves actuelles. Une phase
future isolée est nécessaire pour estimer le coût exclusif, sans convertir les
inclusifs recouvrants en plafond de gain.

## 10. Oracle différentiel et tests futurs — NON EXÉCUTÉS

Après audit indépendant et GO B explicite seulement : deux clones sans hardlinks,
compilations et processus isolés. Baseline checkout exact
`1d1c66b2b38a6599f1ab0950c4dd1fdffd1e6e74`, jamais P2/P1 ni algorithme
reconstruit. Candidat dérivé de cette baseline avec seulement patch autorisé ;
SHAs/trees/sources/imports vérifiés, aucune compilation baseline liée au candidat.
Sceller sorties et corpus avant modification de production.

Réutiliser les harness historiques **sans les modifier** :
`proofs/r12-perf-p2/oracle.mjs` (1 245), `supplement.mjs` (9),
`proofs/r12-perf-p3-a1/copy-oracle.mjs` (34). Rejouer sur la vraie A1, comparer
ses 1 288 nouvelles réponses aux archives **a1-***, puis au candidat. Les
anciennes sorties **p2-*** ne deviennent pas un substitut d'oracle A1, même si
les archives sont historiquement identiques. Les comparateurs A1 ont des labels
et un seal P2 historiques : ne pas les détourner ; nouveau comparateur/extension
isolé après GO, nouvelles preuves `proofs/r12-perf-p3-b/`, aucun ancien fichier édité.

Hashes des sorties archives A1 consultées, points de vérification futurs :

| Corpus | Réponses | SHA256 sortie |
| --- | ---: | --- |
| oracle | 1 245 | `b3d5831b531c1bf04845f1b7bd8b03714c3c0673b20e1255b750a383d4dbcccb` |
| supplement | 9 | `297c21794b0dae1b99a0fc4689d8abc25608c16e3a4ae804e44ac333d72af213` |
| copy | 34 | `93bc094454090fe2e03bf543f7908fd8d117dc61b9a6d7529f30e1ffb6a0357d` |

Comparer DomainResult **complets**, pas uniquement ok/code/hash : erreurs
code/path/message/ordre ; payload/enveloppe/owners/refs/predecessor/provenance ;
registre/withVersions/contexte/missing/répétitions ; manifestes, inventaires,
résolution, certification et vrais chargements/ports. BigInt typé exact,
-0 conservé, ordre/multiplicité arrays ; égalité records indépendante de l'ordre
de clés sans normaliser les erreurs. Échecs de réflexion/throws examinés à part.

Extensions futures scellées avant candidat :

- Les 14 schémas de §4 : positifs, missing/extra, types, null/options, dates,
  intervals, familles/BigInt canoniques/non canoniques/grands, ratios/signes,
  listes vides/doublons/ordre ; kinds forgés JS et chemins personnalisés.
- Tous multidéfauts de §7, permutations comparées à leur propre réponse A1,
  provenance/filiation/collisions/owners contradictoires, répétitions identiques
  et divergentes et withVersions atomique avec ancien registre intact.
- Payload partagé entre versions/branches, DAG profonds, cycles tardifs/croisés,
  arrays troués/extra keys, prototypes/symboles/getters/non-enumerables ;
  getter jamais appelé, `__proto__`/constructor et null-prototype ; Proxy/traps
  de réflexion selon comportement historique, aucun nouvel engagement runtime.
- Nombres NaN/±Infinity/fractionnaires/non sûrs/-0 ; BigInt exact, payload
  métier invalide gelé, faux envelope/brand/cast/flag, objet désérialisé inconnu.
- Entrées modifiées après acquisition/retour ; champs imbriqués et listes
  partagés ; retained readers/certificat après mutation du jeu initial ;
  mutation de réponse port entre collect et certification toujours revalidée.
- Contexte incomplet, established/not-established, branches indépendantes,
  références/propriétaires incohérents ; Snapshot ancien autonome après Current
  divergent, lecteur Current qui lève, zéro appel Current ou histoire transitive.

Vérifications **runtime séparées du JSON** : gel récursif de chaque record/array
payload/ref/owner/provenance/enveloppe ; détachement entrées/sorties ; refus de
mutation sortie ; indépendance des branches DAG et des sorties de deux appels ;
non-mutation des entrées à l'échec. Vérifier aussi que l'API payload retourne
sa copie et que la factory version retourne l'enveloppe contrôlée, sans objet
supplémentaire ni réutilisation d'une enveloppe externe gelée.

Audit d'encapsulation futur : exports source et JS émis, import namespace et
imports directs ; aucun checker/closure exporté ou échappé, seuls deux chemins
d'acquisition complets ; checker sans argument de données, aucun callback/await,
aucune réaffectation/capture depuis unknown. Assertions TS ne remplacent pas
ces tests JS sans types. Un test ou mock ne doit pas exposer la closure privée
pour la rendre testable ; la tester par les chemins publics.

Gates futures : `npm run test:v2`, ciblés R1.1 (primitives/enveloppes +
`scripts/v2/r11.test.mjs`, A1–A7/P0), R1.2 (suite métier +
`scripts/v2/r12.test.mjs`, G12-01–13/P0/P1/P2), copie A1 (19 acquis), nouvelles
régressions B ; `npm run check:boundaries:v2`, `npm run typecheck:v2`,
`npm run build:v2`. Aucune garde/canari ni test existant assoupli.
Les **213/32/123/19 PASS A1 sont historiques**, aucun nouveau PASS ici.
Toute divergence inexpliquée bloque la livraison B ; conserver le contre-exemple,
ne pas corriger l'oracle pour accepter le candidat.

## 11. Protocole de mesure futur — NON EXÉCUTÉ

Comparaison contemporaine **A1 exacte / B autorisé**, candidat mesuré committé,
productionDiff vide, mêmes fixtures/hashes/seed 1202 et sept outils historiques
`scripts/benchmarks/r12-perf/` inchangés. Nouveau dossier de preuves uniquement.
Documenter SHAs/trees/hashes/commandes, versions Node/npm/TS, OS/CPU/RAM,
charge/pression mémoire et limitations. Aucun benchmark/test/oracle/compilation
concurrent pendant mesures ; compiler au préalable comme prévu par runner.

M1–M6 : petits sparse/dense/historique, moyens sparse/dense présents dans les
fixtures historiques. **Pas de fixture medium/history ajoutée** dans ce lot :
si souhaitée, autre cadrage de fixtures ; ne pas prétendre l'avoir mesurée.
M6 petit historique **NOT_EXECUTED** car Current null, aucune création Current
pour obtenir un résultat. Grands NOT_EXECUTED ici et non autorisés implicitement.

Enfant neuf par scénario/API, cold + un warm-up + trois répétitions, timeout
**30 s par phase**, old-space **1024 Mio**. Setup adapter hors temps M5/M6,
rapporté séparément, son réchauffement du runtime explicité. Ordre A1/B puis
contrôles inversés contemporains si dérive, archivés séparément sans correction
numérique ni remplacement de médianes principales. Réutiliser `verify.mjs`,
`run.mjs` et `summarize.mjs` sans modification.

Publier min/médiane/max, SD population/IQR, cold/warm-up, CPU user/system,
heap endpoints/deltas, retained avec résultat puis après libération/GC, RSS
endpoints et maximum lifetime, setup/compilation/fixtures séparés ; refus,
interruptions/OOM/timeouts jamais PASS. Ratios seulement sur résultats complets
comparables ; aucune estimation depuis un timeout. Résumer chaque M1–M6,
petits et moyens, pas uniquement la meilleure M1 dense.

Profils CPU distincts M1/M3/M5 sparse/dense, Inspector 1 ms, même cold/warm-up,
une répétition profilée hors médianes ordinaires. Mapping JS B mis à jour dans
nouvelle analyse, pas anciens outils. Attribution registre, copie, dataRecord,
schéma, enveloppe/owner, contexte, manifeste, collect, validateResolved, GC ;
self/inclusifs identifiés sans addition de catégories recouvrantes. Pas de
soustraction M5−M4 ou M3−M2 comme coût exclusif. Sampling/JIT/inlining explicités.

**Laboratoire d'allocations séparé**, seulement après autorisation couvrant cette
phase : troisième clone avec instrumentation identifiée/hashée, jamais Domain
livré ni outils historiques. Compter invocations/nœuds par site payload
initial/contrôle/contexte, provenance, inspections/refs/owners, schémas, setup,
collect et certification ; confirmer économie N et unchanged checks. Spans
self seulement avec comptabilité entrée/sortie démontrée, overhead documenté.
Allocation sampling incluant objets collectés et fréquence connue ; masse
échantillonnée ≠ exact cumul. Heap snapshots séparés pour rétention/ownership ;
GC avant/après et après libération, temporal sampling de mémoire avec limites.
Pas de pic exact ni absence de fuite déduit d'endpoints/GC. Résultats labo
non mélangés aux médianes officielles ; estimations révisées à partir de ces preuves.

Deux verdicts indépendants attendus :

| Verdict | Conditions |
| --- | --- |
| Conformité fonctionnelle et architecturale B | Provenance lexicale prouvée, zéro bypass/export/certificat nouveau, schémas uniques et complets, 1 288+extensions identiques, gel/détachement runtime, R1.1/R1.2/frontières/typecheck/build PASS, diff borné |
| Performance globale A/B/C | M1–M6/dispersion/CPU/mémoire/setup/profils publiés ; A : absence de blocage démontrée ; B : réserves explicitement compatibles avec poursuite ; C : blocage/acceptabilité non établie. Aucun seuil/SLA nouveau inventé |

Une suppression conforme de copie ne rend pas R1.2 acceptable par elle-même.
M5 dense, coût contexte/certification/mémoire et goulets résiduels doivent être
jugés explicitement ; global C peut rester après conformité B. Aucun GO R1.3.

## 12. Arbitrages ouverts et conditions d'abandon

Tous **PROPOSÉS / NON AUTORISÉS**. Ils ne modifient pas le registre normatif.

| ID | Arbitrage à soumettre à audit puis GO | Recommandation / critère |
| --- | --- | --- |
| A-P3B-01 | A/B1/B2/C | B2 avec capture B1 de §6 ; A livré reste référence, C si faisabilité rejetée |
| A-P3B-02 | Niveau de preuve provenance/encapsulation | Orchestrateur privé acquire unknown dans chaque branche, checker lexical sans données en argument ; ni helper trusted exporté, ni provenance par type |
| A-P3B-03 | Mutualisation des 14 schémas | Un seul corps, helpers/checks/ordre exacts ; détails des retours privés à auditer, aucune duplication même temporairement dans livraison |
| A-P3B-04 | Copie supprimable | Uniquement copie payload de contrôle dans flux version ; copie publique payload, enveloppes, listes registre/contexte, provenance et certification conservées |
| A-P3B-05 | Frontières | Un module Domain, aucune modification R1.1/ports/Application/adapters/collect/certification/formats |
| A-P3B-06 | Diagnostics | Équivalence stricte ; aucune concession de premier défaut/code/path/message/ordre. Différence bloque sauf futur arbitrage explicite |
| A-P3B-07 | Maintenance | Interdiction de fuite/export, argument trusted, branche skip-copy, async/callback extérieur ou nouvelle lecture source ; contrôle mécanique source/JS et revue des chemins publics |
| A-P3B-08 | Gain et mesure | N copies/registre, coût exclusif inconnu ; laboratoire séparé si autorisé, benchmarks A1/B complets ; pas de promesse de latence/RSS |
| A-P3B-09 | Réception/abandon | Deux verdicts ; C si preuve/équivalence échoue, ou régression non expliquée rend B sans bénéfice acceptable ; pas d'extension opportuniste à autre cible |

Risques de maintenance : ajout d'un troisième mode qui saute l'acquisition,
extraction du checker dans un module exporté, variable capture réassignable,
closure rendue accessible pour tests, retour anticipé avant schéma, changement
d'ordre d'un check pendant refactor, validation conditionnée au brand, règles
publiques/privées divergentes, allocation closure neutralisant gain. Mitigation :
patch minimal, acquisition intégrale dans chaque branche, corps unique repris
sans réécriture des règles, revue exports/calls/runtime et oracle multidéfauts.

**Abandonner B et conserver la copie** si la forme réalisable exige un paramètre
trusted accessible entre modules, une certification intermédiaire/cache,
duplication des schémas, changement d'ordre/diagnostic, suppression d'un contrôle,
mutation/alias externe, modification de frontière R1.1/port/certification, ou si
l'audit ne démontre pas la provenance. Un résultat performance insuffisant
n'autorise aucune de ces concessions ; garder A/C et soumettre un autre cadrage.

## 13. Découpage futur et arrêt de cette mission

1. Audit indépendant de ce plan documentaire et arbitrages A-P3B-01–09 ; nouveau
   GO explicite B avec portée/phase laboratoire éventuelle. Aucun commencement
   d'implémentation à partir de ce document seul.
2. Nouveau préflight, baseline A1 exacte, clones isolés ; sceller 1 288 réponses
   réelles A1 et extensions, exports/gates acquis, hashes outils/fixtures.
3. Si autorisé, laboratoire de coût séparé ; décider maintien B sans transformer
   mesure instrumentée en gain garanti. Conserver historiques inchangés.
4. Réorganisation de `payloadValidation.ts` seule pour acquisition/closure et
   corps unique, suppression de la seule copie de contrôle ; pas d'autre
   optimisation, refonte de helpers ou déplacement R1.1. Nouvelles preuves/tests
   B dans leur périmètre futur explicitement autorisé.
5. Différentiel complet, runtime gel/détachement, audit encapsulation/exports,
   gates R1.1/R1.2 et frontières/typecheck/build. Toute divergence bloque.
6. Campagnes A1/B puis profils et allocations distincts, deux verdicts,
   limites et coûts résiduels ; rollback normal en clone jetable, comparaison
   arbre A1 et checks restaurés, aucun reset/force-push.
7. Rapport de réalisation et audit indépendant avant tout acte suivant.
   Si global C persiste, arrêt et arbitrage séparé ; R1.2 reste IN REVIEW.

**Livraison présente documentaire seulement** : ce nouveau plan,
`docs/current_plan.md`, `docs/current_canon.md`. Revue du diff complet, contrôle
scope/liens/statuts, `git diff --check`, commit normal, push sur
`origin/rewrite/portfolio-versioned`, vérification HEAD local/distant, 0/0 et
arbre propre. Toute évolution concurrente requiert examen, jamais écrasement.

**Arrêt impératif après le plan documentaire. Aucune implémentation B sans
audit indépendant et nouveau GO explicite. R1.2 IN REVIEW ; performance globale
C ; R1.3/R1.4/R2 NOT STARTED.**
