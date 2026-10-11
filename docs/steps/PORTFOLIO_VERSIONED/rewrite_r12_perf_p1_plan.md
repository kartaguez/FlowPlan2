# FlowPlan2 V2 — R1.2-PERF-P1 : optimisation des lookups exacts

2026-10-11 — **P1 AUTORISÉ ET IMPLÉMENTÉ ; AUDIT INDÉPENDANT REQUIS**.
Baseline de réalisation obligatoire : `f9440517d176d93e3089a8b7cf34da86f36f5f18`.
A-P1-01 B, A-P1-02–04 approuvés explicitement par la mission utilisateur ;
A-P1-05 évalué sur mesures, performance globale encore C. Résultats en §13.
R1.2 IN REVIEW ; R1.3/R1.4/R2 NOT STARTED. Aucun GO P2/P3.
Les §§1–12 conservent le plan audité et ses conditions **historiques avant GO** ;
leurs mentions « non autorisé », ancien SHA et arrêt documentaire ne décrivent
pas la présente réalisation. Le SHA imposé par la mission prime pour l’oracle.

État historique du plan :
2026-10-11 — **PLAN ONLY / PROPOSÉ POUR AUDIT ; GO P1 NON ACCORDÉ**.
Baseline P0 auditée imposée : `8ec0c7318c782ca407063f3c3d44dc8ff7f4df53`.
**R1.2 IN REVIEW ; R1.3/R1.4/R2 NOT STARTED. Classification C maintenue.**
L'audit favorable P0 est communiqué par la mission utilisateur ; les mentions
« audit requis » de la livraison P0 restent des faits historiques. Ce plan
ne constitue ni audit indépendant, ni autorisation d'optimiser, ni clôture R1.2.
Livraison documentaire seulement ; arrêt après commit/push. Implémentation
soumise à audit indépendant de ce plan et nouveau GO explicite, arbitrages §11 inclus.

## 1. Baseline et inventaire exact

Préflight avant rédaction : dépôt `kartaguez/FlowPlan2`, origin
`https://github.com/kartaguez/FlowPlan2.git`, branche `rewrite/portfolio-versioned`.
HEAD initial et origin après `git fetch origin` réussi :
`8ec0c7318c782ca407063f3c3d44dc8ff7f4df53` ; divergence **0/0**, arbre propre.
Baseline présente et égale à HEAD, aucun commit intercalaire ni modification
concurrente inexpliquée. Aucun AGENTS.md applicable dans le dépôt ou ses parents.
SHA final communiqué après livraison, sans auto-référence dans ce document.

Sources normatives consultées : [current_plan](../../current_plan.md),
[current_canon](../../current_canon.md), [plan R1.2 et B1–B4](./rewrite_r12_plan.md),
[canon R1.2](./rewrite_r12_canon.md), [diagnostic PERF](./rewrite_r12_perf.md),
[plan et réalisation P0](./rewrite_r12_perf_fix_plan.md),
[décisions A-R12-01–09](./rewrite_decisions.md), [canon R1.1](./rewrite_r11_canon.md).
Sections actives des trackers distinguées des archives patrimoniales.
Preuves examinées sous [r12-perf](./proofs/r12-perf/) et
[r12-perf-fix](./proofs/r12-perf-fix/) : inventaires, rapports, JSON statistiques,
attributions CPU, métadonnées de livraison et protocole/oracle P0.
Aucune preuve historique modifiée ou réattribuée à cette session.

La campagne P0 utilise un commit de laboratoire `d92f455e9a1288a347d3c288b190fbbe4354dbb6`,
pas le SHA de livraison. Son `productionTree` dans `p0-measures.json` est
`d7ee25c2ba4f33e454ffdc166eac9dfbf880e189`, identique à `HEAD:src-v2`
de la baseline imposée ; `productionDiff` vide. Cela rattache les mesures P0 au
code étudié sans prendre le commit de laboratoire pour baseline normative.

| Module réellement lu, sous `src-v2/` | Situation à la baseline / traitement futur proposé |
| --- | --- |
| `domain/versioning/versionRegistry.ts` | Registre P0 validant/copiant, mappings et déduplication indexés ; `lookupExact` linéaire ; contrat existant conservé |
| `domain/versioning/localVersionTables.ts` | Trie temporaire `LocalVersionTable`, `referenceParts`, `identityParts`, `ownerParts` ; réutiliser les projections validées |
| `domain/versioning/versionEnvelope.ts` | P0-B : collisions/owners/parents indexés ; phases, copies, rapports et parcours de filiations conservés, aucun changement proposé |
| `domain/portfolio/manifest.ts` | 12 tables + deux globals, sélection ordonnée ; unicité des identités encore par `seen.some` |
| `domain/portfolio/graphResolver.ts` | Factory manifeste, factory registre, un `lookupExact` par ref, inventaires dérivés |
| `domain/portfolio/graphValidation.ts` | Appelle le resolver puis vérifie structure/grille ; uniquement observation, aucune optimisation P2 |
| `domain/portfolio/validatedPortfolioGraph.ts` | Unique factory unknown validante, opaque ; aucune réduction de copie/validation P3 |
| `application/portfolio/loadPortfolioGraph.ts` | `collect` valide toute réponse, membership exact puis cardinalité, certification complète |
| `adapters/memory/memoryPortfolioReadAdapter.ts` | Registre immutable au setup, lookup séquentiel par ref à chaque lecture ; Snapshot par ID séparé |
| `application/ports/portfolioReadPort.ts` | Trois lecteurs abstraits async, réponses unknown ; signatures inchangées |

Tests existants : `application/portfolio/r12.test.ts`, suites primitives/enveloppes
R1.1, gardes/canaris `scripts/v2/r11.test.mjs`, `r12.test.mjs` et frontières V2.
Outils de référence : sept fichiers de `scripts/benchmarks/r12-perf/` décrits au
[README](../../../scripts/benchmarks/r12-perf/README.md). Aucun source, test,
script, benchmark, package, configuration ou preuve créé/modifié par ce plan.

## 2. Diagnostic détaillé des recherches

Notations : N occurrences de versions fournies, V versions exactes distinctes
après registre, R références demandées, U versions distinctes retournées par un
port, Vstock versions du jeu mémoire ; r_k taille d'une table de manifeste,
C cellules TA. Coûts de tables amortis attendus, avec taille des chaînes/composants
et payloads en facteurs supplémentaires ; aucune garantie de pire cas constant.
K(N) désigne le coût complet du registre P0, copies/validations/filiations incluses.

### A. Registre

`lookupExact` valide l'entrée avec `validateExactReference(input)` au path `ref`,
puis `registry.versions.find(sameReference)`. Un appel coûte O(V), sans cache.
Le registre ne l'appelle pas lors de sa construction. `withVersions` reconstruit
un registre complet, sans nouvelle sélection. Les tables internes P0 sont
abandonnées après construction : elles ne sont pas réutilisables par le resolver.
Le contexte P0 garde un possible O(V²) sur longues chaînes entièrement fournies
par reparcours des suffixes ; ce coût ne fait pas partie du lookup selected P1.

| Opération complète réussie | Appels effectifs `lookupExact` | Autres scans exacts / registres |
| --- | ---: | --- |
| M1 registre | 0 | Un registre P0 |
| M2 résolution | R | Un registre + un manifeste |
| M3 validation | R via M2 | M2 complet puis structure/grille |
| M4 certification Snapshot | R via M3/M2 | Factory Snapshot puis M3 puis borne de date |
| M5 chargement Snapshot | 2R : R adapter + R resolver | R `some` dans collect ; deux registres chronométrés, un registre au setup exclu |
| M6 chargement Current | 2R : mêmes deux chemins | Même collect/certification ; pas de borne Snapshot |

Ces comptes décrivent le chemin mémoire valide ; sur erreur, les boucles s'arrêtent
au premier échec. Un port externe n'appelle pas nécessairement `lookupExact` :
seule la moitié resolver est garantie dans le service, l'autre dépend de l'adapter.
Une seule résolution Domain par chargement, pas deux. Les appels internes P0 aux
prédécesseurs utilisent leur table locale, pas cette API.

### B. Resolver

Après validation complète du manifeste puis du registre, R appels linéaires :
O(R×V), en plus de K(N) et O(Σ r_k²) du manifeste. Les versions sélectionnées
suivent `selectedReferences` (globals d'abord, puis les 12 tables dans leur ordre).
Une version non sélectionnée peut rester dans le contexte Domain ; elle ne doit
jamais remplacer une ref absente. Le resolver pur ne refuse pas toute version
supplémentaire fournie : cette restriction concerne la réponse du port dans collect.

Quand V=R et chaque version est demandée une fois, une permutation valide impose
V(V+1)/2 visites au total dans cette recherche linéaire : **37 018 710** à 8604,
**1 534 829 310** à 55404. Ce sont des comptes dérivés du code, pas des durées
mesurées. Les fixtures de référence ont respectivement ces volumes selected.

### C. Application

`collect` appelle une fois le port avec les refs du manifeste. Erreur du port
propagée directement ; sinon `createVersionRegistry(response.value)` valide
**toute** la réponse avant le contrôle de transport. Un `some(sameReference)` par
ref coûte O(R×U). La vérification finale `U !== R` coûte O(1).
Avec un manifeste validé (refs exactes distinctes), inclusion de toutes les refs
et égalité des cardinalités garantit absence de version non demandée. Inutile
aujourd'hui de chercher chaque version supplémentaire dans les refs.

Une mauvaise version d'une identité connue est une absence de la ref exacte
attendue ; le premier missing prime sur extra. Une réponse partielle ou une
réponse mélangeant missing et extra garde ce même ordre. Une réponse contenant
chaque ref demandée plus une répétition strictement identique est **acceptée** :
le registre valide puis déduplique ; il ne faut pas imposer la longueur brute
égale à R. Répétition divergente : diagnostic de collision du registre avant
membership. Le retour de collect reste la réponse originale pour certification,
pas le tableau dédupliqué ni le graphe déjà résolu : ne pas anticiper P3.

### D. Adaptateur mémoire

Initialisation : `createVersionRegistry(versions)` fournit Vstock copies immutables.
Lecture : R appels exacts, O(R×Vstock), résultat gelé dans l'ordre demandé ;
répétition d'une ref demandée répétée dans le résultat. Aucun choix latest/date/owner.
Les validations Current/Snapshot du setup restent intactes. Le scan par SnapshotId
(`list.find`) et son contrôle de doublons (`list.some`) ne sont pas les recherches
exactes de versions : observés, exclus du correctif P1 proposé.

Un index privé au setup pourrait donner O(R) par lecture après O(Vstock), sur
le jeu immutable explicite, sans sélectionner métier. Mais il serait conservé
entre opérations pendant la vie du reader : ce plan préfère **O(Vstock+R) par
lecture**, avec table abandonnée à la fin, conformément à la localisation P0.
Aucun index partagé entre readers ni invalidation/cache/mise à jour à définir.

### E. Manifeste

Pour chaque table, validation séquentielle du kind et de la ref, puis
`seen.some(sameIdentity)` : O(Σ r_k²). TeamActual atteint 5280 refs en moyen
sparse et 48480 en dense ; sans doublon, respectivement **13 936 560** et
**1 175 130 960** comparaisons d'identités pour cette seule table.
À chaque invocation complète, M2/M3 vérifient un manifeste ; M4 Snapshot en
vérifie deux ; M5 en vérifie trois dans le temps API et M6 deux. Le setup adapter
vérifie aussi Current/Snapshots fournis, hors timing de lecture. Il ne s'agit
pas d'autoriser la suppression de ces validations répétées.

### Mesuré versus théorique

[Comparaison P0](./proofs/r12-perf-fix/comparison.md), médianes ms :

| API | Moyen sparse | Moyen dense |
| --- | ---: | --- |
| M1 | 441,4 | 2816,5 |
| M2 | 1434,1 | Timeout cold 30 s |
| M3 | 1851,0 | Timeout cold 30 s |
| M4 | 1987,4 | Timeout cold 30 s |
| M5 | 4111,7 | Timeout cold 30 s |
| M6 | 4006,6 | Timeout cold 30 s |

[Profil P0](./proofs/r12-perf-fix/p0-cpu-summary.log) : lookup inclusif M3 sparse
**44,84 %**, M5 sparse **39,24 %** ; collect M5 **49,68 % inclusif** ; manifeste
M3 **7,50 %**, M5 **8,99 %** ; callback grille TA M3 **13,99 %**.
Les pourcentages inclusifs se recouvrent et **ne s'additionnent pas**. Collect
inclut des sous-appels ; ses 49,68 % ne sont pas le temps exclusif du membership.
Sampling/JIT/GC et parents async limitent l'attribution ; lignes = JS compilé.
Les comptes/complexités précédents sont analytiques. Aucune durée exclusive
instrumentée du manifeste/lookup/membership ni profil achevé M3/M5 dense ne
permet d'attribuer les timeouts à une seule boucle. Aucun gain P1 mesuré ici.

## 3. Comparaison des options A et B

**A, cœur minimal** : table locale dans le resolver après ses deux factories,
sans nouvelle API. Adaptateur et Application gardent leurs contrats existants.
Si leurs implémentations restent intactes, deux scans quadratiques persistent
sur M5/M6. **A étendue** pourrait indexer aussi leur code localement avec les
primitives existantes, signatures inchangées ; elle déplace néanmoins les tables
hors Domain, contrairement à la restriction formulée dans le plan PERF-FIX §5.
Cette variante doit être arbitrée, pas considérée comme déjà approuvée.

**B** : helper Domain de lookup en lot sur registre validé, construit une table
par invocation, retourne uniquement résultats immutables et localisation du
premier échec ; pas de Map exposée. Resolver, adapter et collect l'utilisent aux
points où une factory registre vient de réussir. API supplémentaire à approuver
explicitement ; aucune autorisation déduite de son étude.

| Critère | A minimal / variante étendue | B proposé |
| --- | --- | --- |
| Complexité lookup | Resolver O(V+R) ; adapter/collect inchangés O(R×Vstock)/O(R×U). Étendue : mêmes coûts linéaires que B | O(V+R) resolver, O(Vstock+R) lecture, O(U+R) correspondance |
| Constructions exactes ajoutées | Une par M2/M3/M4 ; une par M5/M6 minimal, trois si étendue | Une par M2/M3/M4 ; trois par M5/M6 mémoire, sur trois ensembles/opérations séparés |
| Duplications | Petit code resolver ; étendue duplique assemblage/validation/diagnostics à trois sites | Boucle exacte et validation des refs centralisées ; politiques de diagnostic restent chez leurs responsables |
| Contrats | Aucune API supplémentaire ; étendue nécessite décision de localisation | Petit contrat nouveau, résultat d'échec indexé à auditer ; ports et signatures existantes inchangés |
| Mutation | Tables privées jetables ; pas de champ public | Identique ; helper ne retourne ni closure d'index, ni Map, ni registre modifiable |
| Validation | Factories actuelles obligatoires ; étendue ne doit pas implémenter unicité métier dans collect | Factory obligatoire chez chaque appelant ; helper valide chaque ref ; aucun trusted-graph/unknown bypass |
| R1.3/R2 | Aucun état retenu ; étendue risque duplication des projections dans autres couches | Réutilisable sur contextes explicites ; ne prouve ni sélection, ni intégrité exhaustive durable |
| Diagnostics | Réimplémentation locale exacte à chaque site étendu | Erreurs de lookup inchangées, ordinal séparé pour remapping resolver/collect |

**Recommandation : B avec table par opération**, plus unicité manifeste indexée.
Elle supprime les trois scans du chemin mémoire sans exposer de table ni déplacer
les règles métier. A minimal est une livraison partielle recevable comme telle,
mais ne satisfait pas l'élimination complète des scans ciblés du chargement.
A étendue est possible techniquement ; le bénéfice d'éviter une API doit être
pesé contre duplication et localisation. Décision bloquante A-P1-01 (§11).
La marque de certificat, les formats et les contrats existants ne changent pas.

## 4. Architecture proposée et contrat du helper à auditer

Helper proposé dans `domain/versioning/versionRegistry.ts`, ou module Domain
interne adjacent si l'audit préfère séparer la boucle. Nom indicatif
`lookupExactBatch` ; **addition d'API non autorisée à ce jour**.
Contrat proposé à fixer avant GO : reçoit `VersionRegistry` et liste readonly
de refs traitées comme unknown individuellement ; retourne un wrapper readonly
`{ result: DomainResult<readonly BusinessVersion[]>, failedIndex: number | null }`.
Succès : `failedIndex=null` et versions gelées dans l'ordre des demandes ; échec :
ordinal de la première ref invalide/manquante et DomainResult avec les diagnostics
existants de `lookupExact`, sans ajouter l'ordinal dans DomainError.
Aucun nouveau code/message public aux API existantes. Ce wrapper technique n'est
ni certificat, ni nouveau statut métier. Une autre forme nécessite audit avant code.

Le type `VersionRegistry` actuel est structurel, **pas un certificat opaque de
validation runtime**. Ne pas prétendre qu'une signature TS bloque un cast.
Le helper n'est pas une frontière unknown-registry : tous usages proposés passent
par la factory existante, sans cast, aux mêmes endroits qu'aujourd'hui. Un port
retourne toujours unknown ; collect revalide sa réponse entière. Aucun service
n'accepte un registre externe prétendument validé par le helper. Ce dernier
ne certifie pas un graphe et ne fournit aucun raccourci à la factory opaque.
Tests/garde de dépendances et revue des appels doivent vérifier cette précondition.
Si l'audit exige une preuve runtime opaque du registre pour exposer ce helper,
**bloquer B** et arbitrer A ou un contrat distinct : pas de brand/cache/WeakMap
ni suppression de validation introduits en réponse implicite.

Domain garde factories, unicités/owners/collisions et résolution pure. Application
appelle le helper après validation et traduit une absence en erreur de réponse
port ; elle ne vérifie ni ne décide les mappings owner→identité. Adapter lit
exactement les refs demandées sur ses copies explicites. Ports n'importent que
les types abstraits existants ; aucune connaissance IDB ni index dans leur réponse.
`VersionRegistry`, `PortfolioGraph`, `ValidatedPortfolioGraph` restent identiques.

## 5. Algorithmes et complexités attendues

### 5.1 Table exacte et traitement en lot (B proposé)

1. Partir du tableau `registry.versions` de la factory réussie. Construire un
   `LocalVersionTable<BusinessVersion>` par `referenceParts(version.ref)`.
   Garder le premier exemplaire par prudence ; aucune déduplication/collision
   métier nouvelle : le registre a déjà traité ces règles.
2. Parcourir les demandes **dans leur ordre**, une seule fois. Pour chaque ref,
   exécuter `validateExactReference(input)` avec path `ref` comme `lookupExact`.
   Ne pas prévalider toutes les demandes avant de chercher la première : un
   absent précoce doit primer sur une ref invalide ultérieure dans l'adapter.
3. Chercher tous les composants exacts ; absence → même `invalid` et même message
   `Missing kind/entityId/versionId`, arrêt immédiat, ordinal séparé. Aucun
   fallback par identité, branche, provenance, owner, version récente ou date.
4. Accumuler les versions trouvées, répétitions demandées comprises, geler la
   liste de sortie et le wrapper ; abandonner la table à la fin de l'appel.

O(V+R) attendu, espace auxiliaire O(V+R), hors validation des données et tailles
de clés. La table mutable n'est accessible que pendant la fonction. On ne
reconstruit pas une table par ref. `lookupExact` isolé peut rester linéaire,
API/comportement inchangés ; aucun cache pour accélérer artificiellement cet appel.

Clé exacte : `[kind, entityId.family, entityId.value, versionId.family,
versionId.value]`. Clé identité : `[kind, entityId.family, entityId.value]`.
Même clé ⇔ `sameReference`/`sameIdentity` **sur valeurs validées** : les familles
sont alors garanties. Ne pas élargir cette équivalence aux records malformés.
Octets conservés, sans concaténation, sérialisation, hash, trim/normalisation,
clé par objet ID ou utilisation de `referenceLabel` comme clé.

### 5.2 Resolver, collect et adapter

Resolver : manifeste validé en premier ; registre validé ensuite ; appel du lot,
remapping de tous diagnostics de l'échec vers `manifest.references.i`, puis
assemblage des mêmes versions/inventaires/contextes. Table temporaire ne change
ni le contexte fourni ni les règles d'inventaire. Coût : K(N)+O(R)+O(V+R),
puis assemblage O(R), hors tailles des copies/validations.

Collect : erreur port inchangée ; registre complet inchangé ; helper sur U
versions validées et les R demandes validées par manifeste. Premier échec exact
→ même `READ_REFERENCE_MISMATCH`, `readExactVersions.i`,
`Expected kind/entityId/versionId`. Puis seulement comparer U à R et retourner
`READ_REFERENCE_MISMATCH`, `readExactVersions`, `Unexpected unrequested version`.
Ce check de cardinalité conserve le refus des extras sans scan inverse nouveau.
Succès retourne **la réponse originale**, avec ses répétitions ; helper n'applique
aucune unicité de sélection. Coût K(Nréponse)+O(U+R). Ne pas remapper une erreur
initiale du port ou de la factory en erreur de membership.

Adapter : après toutes validations initiales existantes, aucun index retenu.
Chaque lecture appelle le helper sur le registre privé immutable ; renvoie
uniquement son DomainResult, sans failedIndex dans le contrat du port. Demandes
dupliquées, permutations et première erreur restent celles de la boucle baseline.
Coût par lecture O(Vstock+R), espace O(Vstock+R), setup inchangé.

M5/M6 mémoire : trois nouvelles constructions exactes (adapter, collect,
resolver), **en plus** des tables P0 et sans les fusionner. Coût des recherches
ciblées O(Vstock+U+V+R), et non O(R×Vstock+R×U+R×V). Les deux registres API,
celui du setup et la certification complète restent nécessaires. Pas de promesse
O(V+R) pour tout M3/M5 : grille et autres validations demeurent.

### 5.3 Unicité du manifeste

Pour chaque table, remplacer uniquement `seen`/`some` par une table locale
`LocalVersionTable<true>` utilisant `identityParts`. Après `createExactReference`
réussi à l'index i : membership ; présent → même `MULTIPLE_IDENTITY_SELECTION`
à `${path}.${table}.${i}` ; absent → insertion. Table distincte par table de
manifeste, abandonnée après contrôle ; aucune règle owner dans ce contrôle.
O(Σ r_k)=O(R) attendu, espace O(max r_k) si tables libérées successivement.

Conserver copie complète d'abord, record fermé, PortfolioId, validation des deux
globals dans l'ordre, puis `manifestTables` et les entrées dans l'ordre. Kind
incorrect prime sur doublon à la même entrée ; un doublon précoce prime sur une
ref invalide plus tard. `MULTIPLE_IDENTITY_SELECTION` refuse aussi une répétition
exacte dans le manifeste, contrairement aux répétitions de versions du registre.
Conserver les 12 tables et deux globals, refs exactes et format ; pas de tri,
déduplication, réparation ou listes racines redondantes. Retourner la même copie
immutable fournie, pas un manifeste recomposé depuis les Maps.

## 6. Frontières de validation, immutabilité et équivalence

Copies/gel profonds aux mêmes frontières ; validation unknown des payloads,
owners, enveloppes, listes et manifests conservée. Map gelée n'est pas immutable :
ne jamais l'exposer. Aucune table dans graph/registre/certificat, aucun cache global,
WeakMap, table de certificats, sélection implicite ni état réutilisé entre lectures.
Tables dérivées exclusivement de versions validées explicitement fournies.

P0 intouché : égalité complète des collisions divergentes ; premier exemplaire
exact retenu ; multiplicité/ordre des répétitions identiques ; mappings owners,
Settings opaques, PT/RT/TA et tombstones non selected ; phases de validation,
branches, filiations, sources de provenance et rapports `established`/
`not-established` conservés. Pas de chargement transitif de parents/sources.

Même manifeste, mêmes refs/owners/payloads/links, inventaires et contexte ; mêmes
grilles TA/PTEC/catalogues/capacités/ordre ; mêmes dates/bornes Snapshot, autonomie
historique sans Current. Pas de changement aux statuts ni aux règles R1.1/R1.2.
Factory `certifyPortfolioGraph` reste unique, unknown/désérialisé revalidé et
copié/gelé ; aucune certification par membership de table ou assertion de type.
L'Application conserve uniquement sa responsabilité de correspondance de lecture.
Mutation des inputs après lecture/construction ne modifie jamais les copies
validées ; la certification de la réponse originale reste complète, sans confiance
ajoutée dans les données initialement inspectées par collect.

## 7. Diagnostics, chemins et priorités

| Entrée / défaut | Résultat baseline à conserver |
| --- | --- |
| Lookup ou adapter : exact absent, même identité autre version présente | `MISSING_EXACT_VERSION`, path `ref`, message `Missing kind/entityId/versionId` |
| Resolver : exact absent à ordinal i | Même code/message, path `manifest.references.i` |
| Collect : ref i non retournée, partiel/wrong/missing+extra | `READ_REFERENCE_MISMATCH`, path `readExactVersions.i`, message `Expected kind/entityId/versionId` |
| Collect : toutes refs présentes mais version distincte extra | `READ_REFERENCE_MISMATCH`, path `readExactVersions`, message `Unexpected unrequested version` |
| Manifeste : deuxième occurrence même identité | `MULTIPLE_IDENTITY_SELECTION`, path paramétré `path.table.i`, message par défaut inchangé |
| Manifeste : kind incorrect dans table ou global | `REFERENCE_KIND_MISMATCH`, au path exact de la ref, avant membership |

Préserver aussi erreurs de primitives/familles, erreurs port, SnapshotId,
collisions/owners/cycles et diagnostics structurels existants. Pas d'erreur
agrégée nouvelle : premier refus au même point, listes de diagnostics mêmes
code/path/message/ordre. L'ordinal interne de B ne se glisse pas dans DomainError.

Priorités à éprouver : manifeste invalide avant registre invalide ; copie/validation
métier complète du registre avant ses phases contextuelles et mappings ; réponse
port invalide avant missing/extra ; missing avant extra ; résolution exacte avant
grille/bornes Snapshot. Les diagnostics paramétrés et plusieurs erreurs simultanées
sont comparés à l'oracle. Tout compromis d'équivalence est **bloquant**, à soumettre
à décision indépendante, jamais corrigé silencieusement en nouveau comportement.

## 8. Tests et oracle différentiel futurs

**NON EXÉCUTÉS dans cette livraison.** Réutiliser la méthode P0, pas son ancienne
baseline pré-P0 comme oracle de P1. Créer avant code deux checkouts/processus
isolés : oracle réel au SHA **8ec0c7318c782ca407063f3c3d44dc8ff7f4df53**, candidat
séparé. Compiler avec configuration existante, sans réécriture de règles. Rejouer
le corpus P0 563 cas sur cette baseline P0, puis l'étendre aux cas P1 ; les anciens
hashes de résultats pré-P0 ne remplacent pas cette exécution.

Comparer réponses publiques complètes : DomainResult et erreurs code/path/message/
ordre, versions/références/owners/payloads/predecessor/provenance, inventaires,
manifestes/context status/missing/repetitions, snapshots et résultats de lecteurs,
résolution/validation/certification. Transport typé P0 conservant BigInt exact,
ordre/multiplicité des listes, record key order sans signification. Copies/gel
et mutations vérifiés séparément au runtime, pas déduits des JSON.
Si B accepté, le helper nouveau n'a pas d'homologue direct à la baseline :
comparer son `result` à la boucle séquentielle de vrais `lookupExact` baseline,
arrêtée au premier échec, et son ordinal au premier appel échoué. Comparer
séparément toutes les API existantes sans modifier leur forme de réponse.

| Famille de cas à ajouter / réexécuter | Vérifications discriminantes |
| --- | --- |
| Nombreuses refs, permutations du manifeste/demandes/versions | Ordre demandé conservé, chaque permutation comparée à son propre oracle ; aucune sélection par insertion |
| Mauvaise version d'identité connue ; absent ; branches coexistantes | Exact missing, jamais substitution ; contexte et branche sélectionnée inchangés |
| Port extra, partiel, wrong, vide, réponse permutée | Missing ordinal/messaging avant extra ; extra seul root path ; réponses invalides factory prioritaires |
| Réponse dupliquée | Ensemble complet + répétition identique accepté ; répétitions seules avec missing refusées ; collision divergente prioritaire |
| Demande adapter répétée, invalide, absente | Multiplicité conservée ; absent précoce avant invalide tardif ; validation ref et paths baseline |
| Manifeste deux versions ou deux refs identiques d'une identité | Même diagnostic au deuxième index, tables longues et paths personnalisés |
| Référence mauvaise table/global | Kind mismatch avant doublon ; 12 tables et deux globals, format inchangé |
| IDs adversariaux/familles distinctes | `/`, `:`, séparateurs, Unicode, espaces, `__proto__`, octets égaux PT/RT et familles ; malformations refusées avant clés |
| Snapshot autonome historique, Current divergent/null | Zéro lecture Current/histoire ; liens et not-established conservés ; tombstones/TA/PTEC/catalogues/date identiques |
| Inputs mutés après lecture, refs/owners/payloads partagés | Copies détachées, gel profond ; appels ultérieurs indépendants ; sortie lot immutable |
| Plusieurs erreurs simultanées | Manifeste+registre ; malformed+collision ; owner+cycle ; missing+extra ; doublon+bad kind ; exact missing+grille+date |

Conserver R1.1/R1.2 et régressions P0 ; tests pérennes ciblés dans suites existantes,
plus tests helper si B accepté, assertions TS readonly/opacité/familles compilées.
Minimum futur : `npm run test:v2`, ciblés R1.1/R1.2 du canon,
`npm run check:boundaries:v2`, `npm run typecheck:v2`, `npm run build:v2`.
G12-01–13 et A01–A03/canaris conservés ; aucun garde assoupli pour le helper.

Conserver SHAs/trees, corpus et réponses complètes, hashes, commandes/environnement,
journaux et comparaison nulle sous un nouveau `proofs/r12-perf-p1/` pendant
l'implémentation seulement. Oracle de laboratoire temporaire, aucun clone de
règles durable dans production ; tests pérennes discriminants. Les résultats P0
174/32/103 restent historiques, pas des PASS de P1.

## 9. Protocole de benchmarking futur

Référence de comparaison : P0 livré au SHA imposé et ses mesures P0, jamais les
mesures initiales pré-P0 pour attribuer un gain P1. Rejouer P0 dans un checkout
exact sur le même environnement que P1 si environnement/charge diffèrent ; un
rejeu contemporain avant/après est préférable. Oracle, tests et compilations
terminés avant campagne, un seul benchmark actif, charge OS consignée.

Fixtures/outils inchangés, seed **1202**, hashes comparés à preuves PERF et P0.
Apple M4/10 CPU/16 Gio, Darwin 27 arm64, Node 24.21.0/npm 11.19.0/TS 5.9.3
comme référence ; enregistrer toutes versions, matériel, mémoire et écarts réels.
Enfant neuf par scénario/API, old-space **1024 Mio**, délai **30 s par phase**,
cold puis un warm-up puis **trois mesures**. Setup mémoire séparé et exclu du
timing API M5/M6 ; noter que leur cold suit un setup ayant déjà chauffé des chemins.

Ordre : petit sparse/dense/historique, moyen sparse, moyen dense. M1–M6 ; M6
historique **NOT_EXECUTED**, Current null conservé. Grands sparse/dense uniquement
si les moyens terminent et ressources sont maîtrisées, avec `--allow-large`,
campagne séparée ; ni lancement automatique ni extrapolation de résultat.

Commandes prévues depuis chaque checkout, sorties neuves (jamais exécutées ici) :

```sh
node scripts/benchmarks/r12-perf/verify.mjs
node scripts/benchmarks/r12-perf/run.mjs --scenarios=small:sparse,small:dense,small:history --output=docs/steps/PORTFOLIO_VERSIONED/proofs/r12-perf-p1/small.json
node scripts/benchmarks/r12-perf/run.mjs --scenarios=medium:sparse,medium:dense --output=docs/steps/PORTFOLIO_VERSIONED/proofs/r12-perf-p1/medium.json
node scripts/benchmarks/r12-perf/summarize.mjs docs/steps/PORTFOLIO_VERSIONED/proofs/r12-perf-p1/summary.json docs/steps/PORTFOLIO_VERSIONED/proofs/r12-perf-p1/small.json docs/steps/PORTFOLIO_VERSIONED/proofs/r12-perf-p1/medium.json
node scripts/benchmarks/r12-perf/run.mjs --scenarios=medium:sparse --operations=M3,M5 --profile --repeats=1 --output=docs/steps/PORTFOLIO_VERSIONED/proofs/r12-perf-p1/cpu-sparse.json
```

Rejeu P0 : même protocole, préfixes `p0-replay` distincts. Outil exige HEAD sans
diff de production : candidat committé dans clone de laboratoire seulement, puis
hash/tree rapprochés de la livraison comme P0. Aucun changement des outils/fixtures
pendant comparaison ; correction indispensable nécessite justification explicite,
patch/hash/versionnement et rejeu des deux côtés, anciennes preuves conservées.

Chaque expérience : cold, warm-up, médiane/min/max/SD population/IQR, CPU
user+system, heap endpoints/deltas/après GC, RSS points/maxRSS lifetime, setup,
volume/hashes, nombre de mesures terminées, erreurs/signaux/timeouts. Pas de ratio
sur timeout P0 dense : « cold interrompu à 30 s », durée réelle inconnue.
Aucun refus DomainResult, crash ou interruption compté comme PASS.

Profils séparés M3/M5 moyen sparse puis moyen dense **s'ils sont exécutables**,
Inspector cible 1 ms, `profile-summary.mjs` sur profils obtenus. Ne pas mêler
temps profilés et statistiques non profilées ; inclusifs non additionnés.

Vérifier séparément six postes : registre, manifeste, résolution exacte,
correspondance réponse port, lecture mémoire, grille TA. Les outils existants
chronomètrent API complètes : M3−M2 ou M5−M4 ne sont pas des phases mesurées.
Utiliser leurs profils self/inclusif et inspection des appels ; si timings
exclusifs/comptages nécessaires, instrumentation temporaire **dans clone de
laboratoire distinct**, hors campagne officielle et sans modifier les outils
référence. Documenter patch/overhead/SHAs, mesurer mêmes phases P0/P1, retirer
avant livraison ; aucune modification de grille. Ne pas déclarer un poste
isolé mesuré si seul son coût théorique ou inclusif est disponible.

Heap endpoints = bornes basses de pics, maxRSS = vie du process fixture/setup
compris, GC après await ne prouve pas libération de tous temporaires ; polling
`ps` historiquement indisponible EPERM. Signaler limites sans prétendre taille
exclusive de tables, absence de fuite ou pics intra-appel des opérations interrompues.

## 10. Critères de réception futurs : deux verdicts indépendants

| Verdict | Preuves nécessaires |
| --- | --- |
| **P1 techniquement conforme** | Option/périmètre explicitement autorisés ; contrats existants inchangés ; oracle complet zéro divergence ; copie/gel et diagnostics exacts ; scans répétés resolver/collect/adapter éliminés dans périmètre autorisé, unicité manifeste linéaire ; tests/gardes/typecheck/build réussis ; aucun état/cache/index d'autorité |
| **Performance globale acceptable** | M1–M6 remesurés et comparés à P0 ; moyens sparse/dense maîtrisés ; cold/setup/dispersion/CPU/mémoire qualifiés ; M5 compatible avec besoins futurs explicités ; aucun autre goulet significatif empêchant R1.3 ; classification A/B/C réévaluée avec limites |

A minimal seul doit être déclaré partiel pour le chargement. Un helper rapide
ne prouve pas tout le pipeline linéaire. Pas de SLA/gain minimum inventé ;
les limites de campagne ne sont pas une exigence produit. Les besoins M5 futurs
et marges de mémoire/latence doivent être appréciés à l'audit, puis décision
utilisateur ; terminer sous 30 s ne suffit pas à démontrer leur compatibilité.

Classification C conservée jusqu'aux preuves nouvelles. A = absence de blocage
mesuré, B = réserves compatibles avec poursuite, C = blocage conservé ; justifier
le verdict au vu des moyens et de M5, pas du seul M1. P1 conforme ne vaut jamais
DONE R1.2 ou GO R1.3. Si TA/scans structurels dominent ensuite, documenter ce fait
et demander **arbitrage P2 séparé**, sans coder ni considérer P2 comme acquis.

## 11. Risques et arbitrages ouverts avant implémentation

| ID | Décision requise / risque |
| --- | --- |
| A-P1-01 — A/B et localisation | Recommandation B ; autoriser explicitement addition du helper Domain, forme du résultat/ordinal et ses trois usages. Alternative A minimal = partiel ; A étendue requiert arbitrage de la restriction historique tables Domain uniquement. Aucune option déjà autorisée |
| A-P1-02 — frontière registre | Confirmer précondition factory aux appels B, limitation du type structurel et absence de raccourci de certification. Si preuve runtime supplémentaire exigée, nouveau contrat à auditer ou choix A ; ne pas ajouter brand/cache tacite |
| A-P1-03 — unicité manifeste | Inclure explicitement le remplacement local de `seen.some` ; même format/ordre/erreur, aucune déduplication de sélection |
| A-P1-04 — diagnostic | Zéro compromis accepté. Toute divergence code/path/message/ordre/priorité ou acceptation de répétitions du port bloque le changement concerné avant livraison |
| A-P1-05 — réception globale | Décider acceptabilité M5/moyens sur preuves réelles et besoins futurs ; goulet TA résiduel ⇒ dossier/arbitrage P2 séparé, sans GO automatique |

Risques techniques : allocation O(V) du trie par opération et RSS/GC supplémentaires,
coût de construction pour petit R/grand Vstock (mesurer lectures partielles hors
fixtures de référence), duplications de tableaux de sortie B dans collect,
index inutilisé après premier missing. Ne pas optimiser ces copies en P3 implicite.
Chaînes exhaustives, grandes provenances/BigInt/pile non qualifiés ; campagnes
synthétiques mémoire, aucune qualification UI/Windows/stockage durable.

Interdits : P2 grille/scans graphValidation ; P3 copies/revalidations ; memo générale
des filiations ; modèle version/manifeste/politique de sélection ; caches persistants
graphes/certificats ; IndexedDB ; commandes R1.3 ; simulation R1.4 ; persistance R2 ;
migration/bridge legacy ; changement de contrat public existant sans accord explicite.
B lui-même attend cet accord d'addition d'API. Aucun lot suivant planifié comme acquis.

## 12. Découpage d'implémentation conditionnel et livraison du plan

| Étape future | Travail borné / condition de passage |
| --- | --- |
| I1 | Audit indépendant du SHA documentaire, décisions A-P1-01–03 et GO explicite ; préflight Git neuf, comparer toute évolution à baseline P0, arrêter si delta inexpliqué |
| I2 | Figer oracle réel baseline P0/corpus/réponses/hashes avant code ; préparer clones isolés et rejeu P0 comparable |
| I3 | Après accord B : helper local et usages resolver/adapter/collect ; ou A dans seul périmètre décidé ; régressions ordre/missing/extra/répétitions/mutations, zéro compromis de diagnostic |
| I4 | Unicité manifeste locale après accord A-P1-03 ; tests 12 tables/globals/kinds/identités/paths/priorités ; aucune optimisation graphValidation |
| I5 | Oracle étendu complet, tests R1.1/R1.2/P0, frontières/typecheck/build, revue scope/API/immutabilité ; échec bloque remesure qualifiante |
| I6 | Campagne P0/P1 M1–M6 et profils, postes séparés, classification/deux verdicts ; grand uniquement conditionnel, aucune extension P2/P3 |
| I7 | Rapports/preuves neuves, audit de diff, rollback par revert normal dans clone jetable (tree baseline restauré et checks), livraison commit/push puis arrêt pour audit indépendant |

Livraison actuelle : ce plan et les deux trackers actifs uniquement. Revue du diff
complet, contrôle des liens/scope et `git diff --check` ; aucun test applicatif,
build, oracle ou benchmark exécuté, aucune nouvelle preuve de performance créée.
Fetch/HEAD/status revérifiés avant commit pour détecter concurrence ; commit/push
normal sans force, fetch final, HEAD local/distant identiques, divergence 0/0 et
arbre propre à vérifier et rapporter. Si remote évolue, analyser sans écraser.
SHA final dans compte rendu, pas dans ce fichier pour éviter auto-référence.

**Arrêt impératif après livraison du plan. R1.2 IN REVIEW ; R1.3/R1.4/R2
NOT STARTED. Aucune optimisation avant audit indépendant et nouveau GO explicite.**


## 13. Réalisation P1

Autorisation explicite de l’utilisateur après audit du plan : option B,
frontière factory existante, unicité manifeste et équivalence publique stricte.
Baseline réelle `f9440517d176d93e3089a8b7cf34da86f36f5f18`, branche attendue,
arbre propre, fetch réussi, origin identique/divergence 0/0, aucun delta concurrent.
Le SHA historique de préparation du plan n’est pas l’oracle de cette réalisation.

API effectivement ajoutée dans `domain/versioning/versionRegistry.ts` :

```ts
lookupExactBatch(registry: VersionRegistry, inputs: readonly unknown[]):
  Readonly<{
    result: DomainResult<readonly BusinessVersion[]>;
    failedIndex: number | null;
  }>
```

Table locale `LocalVersionTable<BusinessVersion>`/`referenceParts`, une seule
construction par lot ; premier exemplaire conservé. Validation de chaque demande
avant son lookup, arrêt au premier échec, messages/paths de lookupExact identiques,
ordinal séparé. Liste et wrapper gelés, versions déjà copiées/gelées par factory.
Aucune Map exposée/retournée, aucun index conservé ; lookupExact unitaire inchangé.
VersionRegistry reste structurel, sans certification runtime, marque ou WeakMap.

Resolver : manifeste puis registre validés, un lot exact, remapping vers
`manifest.references.i`, inventaires Settings et contexte R1.1 inchangés.
Collect : erreurs du port puis validation complète du registre prioritaires,
lot exact puis cardinalité des versions dédupliquées, premier missing avant extras,
`READ_REFERENCE_MISMATCH` aux mêmes chemins/messages. Retour de réponse originale
pour certification complète : répétitions identiques et contexte conservés.
Adapter : registre privé validé au setup ; table temporaire à chaque lecture,
ordre/multiplicité/premier échec, Snapshot indépendant de Current, aucun cache.
Manifeste : table `LocalVersionTable<true>`/`identityParts` distincte par table,
après validation du kind/ref. 12 tables et globals, format, copies/gel,
ordre/priorités/index de refus préservés ; aucun tri ou dédoublonnage automatique.

Oracle P0 figé avant production (563 puis 896 cas), extension finale 941 cas,
zéro divergence de réponses publiques complètes sur vrais modules en clones
isolés. Helper comparé aux vrais appels lookupExact P0 arrêtés au premier échec.
Copie/gel/mutations vérifiés séparément. 15 tests pérennes ajoutés ; 189/189 tests
V2, 32/32 R1.1 ciblés, 118/118 R1.2 ciblés dont G12-01–13 et P0 PASS.
Frontières/typecheck/build et vérification des trois fixtures PASS.
Les résultats antérieurs restent historiques ; aucune gate assouplie.

[Rapport complet et preuves](./proofs/r12-perf-p1/report.md) : campagne P0/P1
contemporaine M1–M6, outils/fixtures inchangés, seed 1202, cold/warm-up/3 mesures,
CPU/mémoire/setup séparé, deadline 30 s, profils séparés. Aucun ratio sur timeout.
P1 techniquement conforme ; performance globale encore C (M3 dense ≈20,79 s),
M5 sparse ≈1,47 s encourageant, M5 dense ≈24,49 s ; compatibilité R1.3 non établie.
Diagnostic P2 proposé seulement, sans implémentation ; P3 interdit/inchangé.
Rollback normal en clone jetable, diff complet/périmètre et diff-check contrôlés.
Livraison commit/push normal puis arrêt ; SHA final communiqué après livraison.
**R1.2 IN REVIEW ; R1.3/R1.4/R2 NOT STARTED**, audit indépendant requis.
