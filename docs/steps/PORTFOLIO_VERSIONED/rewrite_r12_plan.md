# FlowPlan2 V2 — PLAN R1.2 : graphe versionné et validation structurelle

Date : 2026-10-11. **R1.2 — NOT STARTED / PLAN PROPOSED FOR AUDIT**.
**PLAN ONLY** : livraison documentaire exclusivement, aucun code/test/script,
configuration ou dépendance modifié. R0/R0.1/R1.1 DONE ; R1 CADRAGE VALIDÉ ;
R1.3/R1.4 et R2–R6 NOT STARTED. Audit indépendant et validation explicite du
SHA du PLAN requis avant toute implémentation. Aucun GO déduit du commit/push.

Point d'entrée : [current_plan](../../current_plan.md).
Décisions fonctionnelles consolidées : [A-R12-01–09](./rewrite_decisions.md#amendements-normatifs-r12--2026-10-11),
qui priment sur les clauses contradictoires R0/R1 historiques.
[R0](./rewrite_r0_plan.md), [plan R0.1](./rewrite_r01_plan.md),
[canon R0.1](./rewrite_r01_canon.md), [plan R1.1](./rewrite_r11_plan.md),
[canon R1.1](./rewrite_r11_canon.md), [registre de reprise](./rewrite_reuse_registry.md)
et [current_canon](../../current_canon.md) sont les références de départ.
Les propositions d'encodage, APIs et chemins de ce PLAN restent soumises à audit ;
elles sont distinguées des règles consolidées. Aucun canon DONE réécrit.

## 1. Baseline Git et état documentaire initial

Dépôt `kartaguez/FlowPlan2`, branche locale `rewrite/portfolio-versioned`, upstream
`origin/rewrite/portfolio-versioned` ; URL origin `https://github.com/kartaguez/FlowPlan2.git`.
SHA initial et baseline de clôture R1.1 :
`afa76016e4ab89f1e63c5bf23ce83ab0ab41be7d`.
Vérifications réalisées avant rédaction : branche/HEAD exacts, `git status --short`
vide, `git fetch origin` réussi puis divergence `HEAD...origin/rewrite/portfolio-versioned`
0/0. Baseline non évoluée, aucun commit intercalaire à analyser. Premier fetch
refusé par sandbox sur `.git/FETCH_HEAD`, même fetch autorisé hors sandbox réussi.
Aucun changement de branche, reset/rebase/merge ni force-push. Aucun AGENTS.md
applicable trouvé dans dépôt/parents. SHA documentaire final communiqué après push.

| Lot | État constaté à l'entrée | État de cette livraison |
| --- | --- | --- |
| R0 | DONE / clôturé documentairement | DONE |
| R0.1 | DONE, Windows DEFERRED / NOT EXECUTED selon I-R01-C | DONE, report inchangé |
| R1.1 | DONE, clôture après audit final ; implémentation auditée `168d9658621aa235bd3fe314cc74cfeebdfb28d0` | DONE |
| R1.2 | NOT STARTED, cadrage indépendant annoncé | NOT STARTED / PLAN PROPOSED FOR AUDIT |
| R1.3 | NOT STARTED | NOT STARTED |
| R1.4 | NOT STARTED | NOT STARTED |
| R2 | NOT STARTED | NOT STARTED |

Lectures : sections actives des deux trackers ; R0 intégral avec §13 ; registre
décisions ; plans/canons R0.1 et R1.1 ; registre de réutilisation ; onze modules
Domain R1.1 et leurs trois suites TS, `scripts/v2/r11.test.mjs`, garde existant ;
références ciblées couleur/catalogue, entités et calendrier legacy pour préciser
les intentions de reprise. Aucun test/build applicatif exécuté ici.

Faits livrés : 14 `VersionKind` dans `primitives/exactReference.ts` ; six familles
ID runtime dans `identity.ts` ; matrice owners dans `versioning/owner.ts` ;
refs exactes, primitives rationnelles/civiles et copie/gel profonds. API
`createTypedVersionEnvelope` conserve le type statique, mais son paramètre `P`
est effacé au runtime : un payload métier forgé peut passer la factory R1.1.
R1.2 doit donc valider chaque schéma depuis `unknown` avant de l'accepter.
`validateVersionContext` est local et fini ; parent absent ⇒ `not-established`,
pas une preuve de fermeture. Ni registre, ni manifeste, ni graphe métier livrés.
Les 68 tests distincts et les 12 exécutions multi-TZ sont des preuves historiques
R1.1 ; aucune gate G12 n'est exécutée ou PASS par ce plan.

## 2. Inventaire des contradictions et remplacements

Les anciens contrats sont conservés comme trace. Les correspondances ci-dessous
sont explicitées dans le registre ; R0 reçoit un addendum de précédence, les
trackers actifs exposent la norme applicable. Plans/canons R0.1/R1.1 et archives
des trackers restent identiques. La fermeture R1.2 ne sera jamais inférée du
seul historique R0 ou d'une factory générique R1.1.

| Ancien contrat → emplacement | Nouveau contrat | Amendement / frontière |
| --- | --- | --- |
| T02/T10/T14/I08 : open/completed, complete/reopen ; R0 §2/§3/§8 | Aucun statut PTEC, ETC exact ≥0 ; ni complete ni reopen | A-R12-01 ; structure R1.2 |
| D-R1-04/R0 §3.1/§13 : confirmed/suspended distinct lifecycle | PT/RT uniquement existing/deleted ; participation selon propriétaire/charge, RT zéro autorisée | A-R12-02 ; simulation R1.4/R3 |
| I03/I04/I14, R0 §3.2/§6/§9/§10 : ever-nonzero, positif historique bloque tombstone/index | Suppression permise indépendamment de tout Actual historique ; aucun scan/index/proof ever-nonzero | A-R12-02 ; commandes R1.3, conservation R2 |
| T05/I11–I14, D-R1-04/05 : associations protégées conservées, ancien Actual réutilisé à restore | Cascades de tombstones atomiques ; TA retirés et PTEC retiré PT deleted ; restore associations explicite, grille confirmée et paramètres revus | A-R12-02/03 ; résultat R1.2, légitimité R1.3 |
| T09/T13/I23, A-R1-01/02 : AP.knowledgeDate, monotonie et AP vide avec connaissance | Aucun champ/date/attestation de connaissance AP ; AP vide sans bornes ; AP stable aussi Reservation/deleted ; couvert sans association valide | A-R12-04 ; annule intégralement A-R1-01/02 |
| T10/I07/D-R1-04/05 : PTEC même deleted, ref version AP et rebond tous à chaque AP | PTEC seulement PT existing ; identité AP stable ; lastActualsDate = through/null ; through inchangé n'impose pas de version PTEC | A-R12-05 ; versions sélectives R1.3 |
| T11/I05/I06/I16/R0 §3.2 : renouvellement PTEC/confirmation indistincte ou durable | Confirmations transitoires ciblées ; suppression TA = globale unique, zéro compris ; Team toujours confirmée ; revue ETC ciblée ; payload inchangé ⇒ pas nouvelle version | A-R12-06 ; R1.3 exclusivement |
| T03/R0 §3.1 et négatif §9 : toutes sources merge obligatoires | Identités split/merge neuves ; provenance facultative ; générique R1.1 inchangé | A-R12-07 |
| T07/R0 §2/§3.2 : dernière utilisation auto-tombstone Program/Pas | Catalogues autonomes ; existing inutilisé valide ; used-delete doit préserver cohérence sans cascade références | A-R12-08 |
| T04/R0 §3.1 : risque de listes racines supplémentaires | Inventaires Project/Reservation/Team dérivés des Settings exacts | A-R12-09 |
| T09/I23/R0 §13 : Snapshot ≥ connaissances AP et through | Snapshot ≥max through de tous AP, inactive/deleted inclus ; vides sans borne ; dates égales/recul permis | A-R12-04/09 |
| R0 §3.1/§6 : anciens Current proposés comme provenance/histoire | Current = seul manifeste publié + CAS ; Save explicite Snapshot uniquement ; reçus techniques R2 minimaux | A-R12-09 |
| R0 §5 : transitions/preuves Domain, résolution Application | Domain structure/résolution pure ; Application commandes/transitions et accès par ports | Complément architectural A-R12 |
| R0 §8/matrice/risques, registre reprise : protection/suspension/complete/reopen ; R5 ETC/status | Mentions remplacées pour cible future ; R1.3 transitions consolidées, R4 généralisation ; plus de statut PTEC UI | A-R12-01/02/06 ; tables patrimoniales traçables |
| R1.1 §11 : point ouvert AP connu→vide sans date | Sans objet après suppression knowledgeDate/monotonie | A-R12-04 ; ne devient pas un problème R1.3 |
| R1.1 A02 : GraphResolver/GraphValidator/PortfolioSnapshot noms interdits | Noms du nouveau lot admis dans test de frontière futur ; restrictions de dépendances conservées | Delta technique à auditer §8, aucun script changé ici |

Autres règles conservées : ordre de tous Projects inactive/deleted inclus,
unicité noms Program/Pas existing, aucune fusion d'identités, visibilité Team
sans effet métier, catalogue existing pour propriétaire existing, quantités
exactes, earliest borne dure des Actuals Project, objective non contraint à
être ≥earliest. T12-R sans migration/legacy, I20 sélection capacité exacte,
I21 CAS/recovery durable et I22-R robustesse import natif restent applicables.
La restriction historique supprimée n'est pas remplacée par une recherche de
consommation positive dans Current. Les anciens B « retrait historique positif »
et « split/merge sans provenance » deviennent des scénarios positifs appropriés.

## 3. Architecture hexagonale et frontières

| Couche / modules proposés (racine `src-v2/`) | Responsabilité R1.2 | Dépendances autorisées / exclusions |
| --- | --- | --- |
| Domain `domain/portfolio/payloads.ts`, `payloadValidation.ts`, `capacityValidation.ts`, `catalogValidation.ts` | 14 schémas, invariants locaux, couleurs et normalisation noms | Primitives/versioning R1.1 ; aucun port, Application, UI, moteur, browser/IDB, legacy |
| Domain `domain/portfolio/manifest.ts`, `graphResolver.ts` | Forme du manifeste, résolution pure sur ensemble de versions fourni explicitement | Domain seulement ; ni I/O ni callback qui charge des versions |
| Domain `domain/portfolio/graphValidation.ts`, `validatedPortfolioGraph.ts` | Invariants entre versions sélectionnées ; certification structurelle | Domain seulement ; pas commande, comparaison old/new ni validation de confirmation |
| Domain `domain/versioning/versionRegistry.ts` | Valeur immutable du registre fini passif, insertion pure et lookup exact | R1.1 + validateurs payload ; aucune sélection courante ou publication |
| Ports `application/ports/portfolioReadPort.ts` | Accès abstrait explicite aux versions et manifestes Current/Snapshot | Types Domain ; pas classes IDB, moteur ou UI |
| Application `application/portfolio/loadPortfolioGraph.ts` | Collecter refs exactes via port puis appeler resolver/validation ; choisir explicitement la source demandée | Domain + ports abstraits ; pas adapters, pas orchestration transition/simulation |
| Adapter `adapters/memory/memoryPortfolioReadAdapter.ts` | Lecture d'un jeu immutable fourni, sans persistance ; fixtures natives | Ports + Domain ; aucune commande, CAS réel, Current historique automatique, disque ou legacy |
| Composition root | Injecter adapter au service si nécessaire aux tests | Assemblage explicite ; shell/main R0.1 n'ont aucun besoin d'être modifiés/montés en R1.2 |

Le registre Domain est une valeur pure, pas un repository/manager générique.
Le port ne confère aucune autorité au Domain : celui-ci reçoit des données
finies ; l'Application seule effectue les lectures. Aucun framework/container,
bus d'événements, moteur, cache global ou index d'autorité supplémentaire.

Flux R1.2 : choix explicite Current ou Snapshot → Application collecte par
refs → Domain vérifie payloads/refs → resolver sélectionne exactement →
validation structurelle → `ValidatedPortfolioGraph` immutable.
Le service Snapshot ne possède aucune voie vers `readCurrent`. Le Domain ne
choisit jamais un manifeste ; le registre ne connaît pas « courant ».

R1.3 réservés : cas d'usage/commandes, suppressions composites, restaurations,
création des seules versions changées, préparation des conséquences/confirmations,
stale, revue ETC, publication atomique RAM. R1.4 : moteur natif sur graphe
certifié, sans autorité de sélection. R2 : stockage, CAS, transactions natives,
reçus/idempotence/recovery, import/export et autonomie durable Snapshot.
Définir la forme d'une révision CAS ici ne signifie pas implémenter le CAS.

## 4. Modèle proposé de payloads et manifestes

### 4.1 Conventions runtime et identités

Conserver exactement les 14 kinds/owners R1.1. `BusinessPayloadByKind` et union
discriminée de `VersionEnvelope<K, BusinessPayloadByKind[K]>` proposés ; chaque
entrée `unknown` est contrôlée (forme fermée, champs/types/familles, invariants)
par kind avant assemblage copié/gelé R1.1. `as`/brand statique ne valide rien.
Champs retirés (`knowledgeDate` AP, statuts PTEC/usage PT/RT) rejetés comme clés
inconnues ; aucun nettoyage/migration silencieux. Pas de default today/zéro.

Proposition technique : tous champs de payload listés ci-dessous obligatoires ;
absence optionnelle par `null`, sauf `dailyCap` avec `OptionalQuantity<'DailyCap'>`
R1.1 absent/present. Lifecycle fermé `existing | deleted`. Dates `CivilDate`,
quantités `Quantity<F>` natives/BigInt, nombres uniquement entiers sûrs pour
weekday/compteurs. Listes denses readonly, records simples ; pas Map/Set/Date,
accessors, fonctions, cycles, symbol keys ni prototypes exotiques dans les données.
Le payload ne duplique ni owner ni ref de sa propre enveloppe.

**Choix d'identités soumis à audit :** ProjectId/ReservationId/TeamId sont
les owners des Settings. EntityId des Settings est distinct et opaque ; lien
1:1 contrôlé par owner, sans égalité forcée des octets. Une identité Settings par
owner dans le graphe/registre fourni, durable à vie R2. Idem une capacité par
Team, un AP par Project/Reservation, un PTEC par PT, une TA par
(association kind+EntityId, SubPeriodId), globals par Portfolio. Catalogue/AP/PT/RT/
SubPeriod identifiés par `EntityIdentity<K>` R1.1 (pas nouvelles familles ajoutées).
`SnapshotId` proposé comme type opaque distinct hors VersionKind ; revision CAS
technique distincte EntityId/VersionId, sans signification temporelle.

### 4.2 Les 14 kinds : payload et contrôles locaux

Noms techniques proposés, soumis à audit sans pouvoir réintroduire les contrats
supprimés. Invariants inter-entités au §6. Les owners indiqués sont ceux livrés.

| Kind / owner R1.1 | Payload proposé | Validation runtime locale |
| --- | --- | --- |
| ProjectSettings / Project | `name`, `lifecycle`, `isActive`, `earliestStartDate`, `objectiveEndDate`, `mandatory`, `program`, `pas`, `ownColor` | Nom non vide après trim ; booléens stricts ; dates nullable ; mandatory vrai exige objectiveEndDate ; program/pas = identité stable du bon kind ou null ; couleur hex six chiffres si sans Program, null si Program ; pas de règle objective≥earliest |
| ReservationSettings / Reservation | `name`, `lifecycle`, `isActive`, `startDate`, `endDate`, `program`, `pas`, `ownColor` | Nom non vide ; intervalle inclusif valide ; mêmes groupements/couleur ; pas charge inline |
| TeamSettings / Team | `name`, `lifecycle`, `isVisible` | Nom non vide, booléen visibilité strict ; aucune activation/charge |
| TeamCapacity / Team | `periods[{start,end,dailyCapacity,unavailabilityRatio}]`, `exceptions[{date,capacity}]` | Périodes inclusives non inversées/non chevauchantes ; Capacity≥0 ; UnavailabilityRatio∈[0,1] ; exceptions dates uniques, Capacity≥0 ; calendrier vide/gaps/hors horizon permis |
| Program / Portfolio | `name`, `lifecycle`, `color` | Nom normalisé trim/espaces réduits ; clé comparaison minuscules locale fr ; couleur hex six chiffres ; existing inutilisé valide |
| Pas / Portfolio | `name`, `lifecycle` | Même règle de nom, catalogue séparé ; pas couleur/charge/priorité implicite |
| PT / ProjectTeam | `lifecycle`, `dailyCap` | OptionalQuantity DailyCap ; zéro présent valide ; extrémités dans owner immutable, pas confirmed/suspended/isActive |
| RT / ReservationTeam | `lifecycle`, `demand` | Union fermée `{mode:'ratio',ratio:Quantity<ReservationRatio>}` ou `{mode:'fixed-daily',daily:Quantity<FixedDailyDemand>}` ; [0,1] ou ≥0 ; zéro existing valide ; pas double mode ni ETC |
| ActualPeriod / Project OU Reservation | Vide `{coverage:'empty',from:null,through:null,subPeriods:[]}` ; couvert `{coverage:'covered',from,through,subPeriods:[ExactReference<ActualSubPeriod>]}` | Bornes présentes ensemble, inclusives ; couvert liste non vide/refs uniques ; aucune knowledgeDate ; identité stable dans enveloppe |
| ActualSubPeriod / ActualPeriod | `from`, `through` | Intervalle inclusif non inversé ; pas de sous-grille TA/copied AP ; provenance enveloppe facultative `[]` |
| TeamActual / PTSubPeriod OU RTSubPeriod | `consumed` | Quantity Consumption exact ≥0, zéro explicite ; identité cellule dans owner stable (pas version SubPeriod) |
| PTEC / PT | `actualPeriod:EntityIdentity<ActualPeriod>`, `lastActualsDate:CivilDate\|null`, `etc` | Famille AP exacte, ETC≥0 ; aucun status/open/completed ni versionId AP ; lastActualsDate civil ou null |
| PlanningSettings / Portfolio | `horizon:{start,end}`, `workingWeekdays`, `maxParallelProjects` | Horizon inclusif ; weekdays uniques entiers 1..7 (liste vide proposée valide) ; maxParallelProjects entier sûr >0 ; aucun default dynamique |
| PortfolioOrder / Portfolio | `projectIds` | Liste ProjectId uniques ; couverture de tous Projects selected au §6 ; inactive/deleted compris |

Propositions conservant les contrats métier : un seul objectiveEndDate avec
`mandatory` au lieu de deux échéances divergentes ; couleur stockée normalisée
majuscules, jamais suggestion générée par Domain ; Program ou ownColor exclusifs.
Proposition pour calendriers : listes déjà chronologiques à l'entrée, sans tri
réparateur (périodes par start, exceptions par date) ; liste désordonnée refusée.
L'audit doit valider ces encodages et la politique de noms/calendriers (§10). Aucune contrainte de
charge positive, ni au moins un PT/RT par propriétaire. Pas d'Actuals quotidien
persisté ; aucun forecast/result/profile dans les payloads.

### 4.3 Manifeste exact et inventaires dérivés

Proposition `PortfolioManifest` : `portfolioId`, deux refs obligatoires
`planningSettings`, `portfolioOrder`, douze tables de refs exactes :
`projectSettings`, `reservationSettings`, `teamSettings`, `teamCapacities`,
`programs`, `pas`, `pts`, `rts`, `actualPeriods`, `actualSubPeriods`, `teamActuals`,
`ptecs`. Chaque table = liste dense de refs du kind attendu, une seule version
par identité. Aucun payload copié, timestamp, rootIds, liste de Teams actives,
index de courant, hash de sélection, latest ou filtre calculé.

Les racines sont les ensembles des ProjectId/ReservationId/TeamId owners des
Settings résolus. Ni table racine parallèle ni liste dans Current/Snapshot.
Global Settings/Order et catalogues ont le même PortfolioId ; tous owners
référencés doivent appartenir aux racines. Settings deleted restent inclus.
Tables PT/RT gardent les tombstones sélectionnés. AP couvre exactement toutes
racines Project/Reservation, y compris deleted. AP.subPeriods déclare les refs
ordonnées sélectionnées ; union exacte avec table actualSubPeriods, sans ref
supplémentaire ni conflit de version. Une même SubPeriod n'appartient qu'à un AP.

Inventaire complet signifie complet **relativement au manifeste fourni** : R1.2
ne peut déduire qu'un Project archivé absent devait être dans Current. R1.3
préserve/inclut les tombstones à la construction des candidats ; R2 garantit
conservation des identités/versions durables. Le resolver ne consulte pas tout
le registre pour compléter un inventaire. Un catalogue inutilisé peut rester
sélectionné, ce n'est pas une erreur de fermeture.

Propositions de fermeture à auditer : exactement une capacité par Team
sélectionnée, deleted comprise ; catalogues sélectionnés peuvent inclure
existing inutilisés et deleted, mais pas étrangers au Portfolio. Références
catalogue conservées dans Settings deleted résolubles, catalogue existing ou
deleted accepté. Le minimum obligatoire sous Team deleted n'est pas fixé
explicitement par le cadrage : cette politique est un choix de PLAN §10,
pas une nouvelle décision fonctionnelle tacite.

`CurrentSelection` proposé = `{manifest, revision}` uniquement ; révision
opaque technique, pas VersionKind, aucun tableau history/predecessor Current.
`PortfolioSnapshot` proposé = `{snapshotId, knowledgeDate, createdAt, manifest}`,
copié/gelé ; SnapshotId distinct stable. `knowledgeDate` CivilDate obligatoire,
`createdAt` texte ISO UTC technique validé sans appel horloge/Date Domain ;
proposition format fixe `YYYY-MM-DDTHH:mm:ss.sssZ`, heures 00..23/minutes-secondes
00..59 et date civile valide. Aucun rapport knowledgeDate/createdAt exigé.
Horodatage/génération des IDs/Save ultérieurs hors R1.2.

## 5. Contrats du registre, des ports et du resolver

### 5.1 Registre passif fini en mémoire

API indicative : `createVersionRegistry(versions: unknown)` retourne un résultat
validé immutable ; `withVersions(registry,batch)` construit un nouveau registre
ou refuse tout le batch ; `lookupExact(registry,ref)` retourne trouvé/manquant.
Aucun update/delete/getCurrent/getLatest/getAtDate ; aucune génération d'ID ou
mutation des versions anciennes ; plusieurs versions/branches/racines admises.
Une insertion n'implique ni sélection, ni publication, ni transaction métier.

Contrôles sur tout le contexte explicitement fourni : schémas des 14 kinds,
enveloppes R1.1, refs, collisions divergentes (owner/payload/predecessor/provenance),
owners immuables par identité même avec racines indépendantes ; répétition
strictement identique idempotente. Égalité structurée R1.1 sur données validées,
jamais JSON.stringify/hash/timestamp. Mapping 1:1 owner→identité Settings/AP/
Capacity/PTEC/TA et couples PT/RT vérifié sur versions fournies, tombstones inclus,
même quand deux identités ne sont jamais sélectionnées ensemble. Copies/gel
profonds et aucun alias mutable à la sortie. Pas d'index ever-nonzero.

Proposition de fermeture générique : un registre peut être fourni partiellement
et reporter parents/sources manquants, sans inventer une preuve ; la résolution
d'un graphe certifiable exige la disponibilité exacte des predecessor/provenance
**déclarés** de ses versions (fermeture transitive explicite dans les données
fournies). Ces versions d'appui ne deviennent pas sélectionnées dans les tables
métier. La collecte par port demande seulement ces refs exactes, jamais d'autres
versions « pour voir ». Cycles de filiation refusés, sources absentes signalées,
cycles de provenance déclarée proposés refusés (§10) ; provenance vide split/merge
acceptée. Aucun parcours d'histoire pour savoir si supprimer est permis.

L'intégrité générique des liens déclarés et la validité du graphe sélectionné
sont deux contrôles ; les payloads d'appui sont validés localement, leurs anciens
manifestes ne sont ni reconstruits ni certifiés. La politique de fermeture des
sources doit être auditée explicitement ; aucune extension de l'API R1.1 ni
transformation de `not-established` en `established` silencieuse.

Un registre partiel qui ne contient qu'un PT d'un couple prouve seulement
l'unicité dans son contexte. R2 doit garantir la réservation à vie des couples
Project/Team et Reservation/Team sur **toutes** identités/versions durables,
non sélectionnées comprises, lors append/import/recovery atomiques. Un index
technique reconstructible pourra accélérer cela en R2, sans autorité indépendante.
Le certificat R1.2 n'atteste jamais cette exhaustivité durable.

### 5.2 Ports et Application de lecture

Port minimal proposé : `readExactVersions(refs)` (résultats par ref avec refus
explicite si manquante), `readCurrentSelection()` et
`readSnapshot(snapshotId)` sur deux capacités de lecture séparables. Pour charger
Snapshot, injecter seulement lecteur Snapshot + lecteur de versions ; aucun
accès Current requis/disponible. Pas listLatest/readLegacy/readByDate ni
commande de publication dans ce port R1.2. Signature sync/async à auditer :
Application asynchrone proposée pour adapter futur sans introduire IDB.

`loadCurrentGraph` reçoit sa sélection publiée du port ; `loadSnapshotGraph`
reçoit Snapshot exact. Tous deux collectent le manifeste et les appuis déclarés,
vérifient correspondance entre requête et réponse (wrong version refusée),
puis appellent le même pipeline Domain. Erreurs de lecture restent distinctes
des invalidités structurelles ; ni erreur, ni absent ne devient valeur zéro/vide.
L'adapter mémoire reçoit explicitement ses données immutable, n'invente pas
de Current par ordre d'insertion ; aucune API write/CAS/recovery/Save.

### 5.3 Resolver et certification

API proposée `resolvePortfolioManifest(manifest, suppliedVersions)` pure :
normaliser/valider entrée, résoudre chaque ref exacte, dériver inventaires et
assembler un graphe readonly conservant manifeste/refs/owners/payloads. Réponse
manquante, kind erroné, multiple sélection ou version substituée ⇒ diagnostic
code/path/ref attendu, aucun graphe partiel considéré valide. Les versions non
sélectionnées ne remplacent aucune table. Même ensemble de versions fourni
permuté donne mêmes faits ; ordre du manifeste ne choisit aucune « dernière ».
PortfolioOrder et liste AP.subPeriods gardent leur ordre métier explicite.

`validatePortfolioGraph` contrôle §6 ; `certifyPortfolioGraph` est l'unique
construction proposée de `ValidatedPortfolioGraph`, avec marque opaque privée
et reconnaissance runtime (par exemple WeakSet privé), copie/gel profonds.
Aucun constructeur/cast public « certify already valid », booléen `validated:true`
forgeable ou marque sérialisée comme preuve. Un objet désérialisé doit repasser
validation ; WeakSet éventuel mémorise uniquement certificats émis, jamais
versions sélectionnées/Current. Choix de marque runtime soumis à audit.

Certificat lié à cette sélection exacte immutable, pas à une révision courante
future. Il atteste payloads, refs/owners, fermeture structurelle et invariants
sélectionnés. Il n'atteste ni suppressions autorisées par commande, ni restore
revu, ni confirmations présentes/fraîches, ni création sélective des versions,
ni CAS/recovery/durabilité, ni calcul moteur. La certification de Snapshot ajoute
la borne de knowledgeDate ; un graphe Current sans knowledgeDate n'a aucune
obligation de date Snapshot. Ne pas inscrire metadata Snapshot dans le graphe
pour changer les contraintes Current.

## 6. Validation structurelle et cas limites

### 6.1 Lifecycle, tombstones et restaurations

Toute racine sélectionnée possède Settings valides existing/deleted.
Association existing : ses deux Settings existent et sont existing.
Association deleted : ses deux extrémités restent présentes, lifecycle quelconque.
Project deleted ne peut donc avoir aucun PT existing ; Reservation deleted aucun
RT existing ; Team deleted aucune association existing. Cela prouve la cohérence
du résultat d'une cascade, pas que toutes conséquences d'une commande ont été
préparées/confirmées. Tombstone jamais effacement de la version ancienne.

PT deleted n'a ni TA ni PTEC sélectionné ; RT deleted aucune TA. Ni legacy history,
ni charge passée/présente n'interdit cet état. Un AP couvert de propriétaire
deleted reste sélectionné avec partition, zéro TA. Team hidden existing garde
capacités, associations, cellules/PTEC ; la visibilité n'entre pas dans la
validation des charges. `isActive:false` ne supprime ni association, ni TA/PTEC,
ni borne Snapshot. `isActive` conservé sous tombstone n'autorise aucun Forecast.

Un propriétaire restauré peut être existing avec toutes ses associations deleted,
sans cellules réactivées. Une association restored existing n'est certifiable
qu'avec endpoints existing, grille complète et PTEC si PT. R1.2 ne compare pas
au graphe précédent et ne sait pas si les valeurs étaient explicitement revues.
Une restauration correcte et une restauration non confirmée peuvent produire
le même état structurel : seul R1.3 les distingue. Garder une ancienne TA/PTEC
non sélectionnée dans le registre est valide, jamais les rebrancher par fallback.

### 6.2 ActualPeriod, partition et grille

Exactement un AP pour chaque Project/Reservation sélectionné, propriétaire
concordant ; identité AP stable entre versions vérifiables dans contexte.
Vide : from/through null, aucune SubPeriod ni TA de cet owner. Couvert :
from≤through, liste SubPeriods non vide, même AP owner, premier.from=AP.from,
dernier.through=AP.through ; contiguïté inclusive `next.from = previous.through + 1`,
aucun gap/overlap/doublon. Vérifier adjacency par différence civile =1 plutôt
qu'ajouter hors plage au dernier jour 9999-12-31. Une partition singleton d'un
jour est valide. AP covered sans association existing est valide.

Pour chaque AP, associations requises = tous PT/RT existing de son propriétaire,
indépendamment d'isActive/visibilité/demande/ETC. Grille sélectionnée exactement
produit cartésien de ces associations et SubPeriods sélectionnées, une identité
TA unique par couple. Aucune cellule absente, étrangère, dupliquée ni cellule pour
association deleted. Zéro explicite reste une cellule, pas absence. TA exact
non négatif, pas plafond de capacité ni restriction à horizon/Forecast.
AP vide avec PT existing et PTEC ETC positif : grille vide, PTEC date null valide.

Project earliest présent : AP couvert.from ≥ earliest (I15 conservé), quelle
que soit activation/lifecycle ; pas clipping/saisie automatique. Objective ou
mandatory n'impose pas d'extension/coupe ni objective≥earliest. Pas de contrainte
nouvelle liant couverture AP Reservation à intervalle Forecast ; hors horizon
permis. Ces vérifications de dates ne calculent aucun quotidien/cutoff moteur.

Modifier bornes sous même SubPeriodId garde identité cellule TA ; payload TA
identique peut garder ref/version malgré changement de borne, confirmation R1.3
reste exigée car contexte cellule affecté. Split/merge nouvelles identités
SubPeriod ⇒ nouvelles identités TA correspondantes ; provenance vide autorisée.
AP version nouvelle à partition modifiée ne renouvelle pas les TA inchangées,
ni PTEC si through identique. R1.2 accepte ces sélections, ne les fabrique pas.

### 6.3 PTEC et frontière Actuals

Set PTEC sélectionné exactement PT existing : un par PT, aucun pour deleted,
aucun RT. Owner PT sélectionné exact par identité ; AP payload appartient au
Project du PT, pas à autre Project/Reservation. Pas de version AP dans PTEC :
la sélection AP est dans manifeste. `lastActualsDate = AP.through` (null si vide)
avec comparaison civile/égalité exacte, ETC exact ≥0 ; pas de statut complétion.
PTEC peut garder même version avec nouvelle AP de même through ; through change
avec ancien lastActualsDate devient structurellement invalide. ETC zéro et positif
sont valides sans confirmation visible dans le graphe.

Consommation changée et PTEC inchangé : état valide si frontière identique,
quel que soit ETC ; R1.3 imposera la revue ciblée sur ETC précédemment positif.
ETC zéro par défaut demeure zéro sans confirmation supplémentaire ; zéro→positif
confirmation explicite. Confirmation seule sans payload changé ne crée aucune
version. Aucune formule Actuals→ETC ; R1.2 ne lit pas les versions précédentes
pour appliquer ces obligations.

### 6.4 Capacités, catalogues, ordre et unicité

Capacités complètes sélectionnées selon politique §4.3 ; listes de périodes
valides sans chevauchement, exceptions date unique, gaps/schedule vide/hors horizon
valides. Pattern global connu, capacité non négative et indisponibilité bornée.
Demande RT zero ratio/fixed valide ; ratio>1, quantité négative ou mode double
refusés. Ni calcul capacité effective, ni ratio exception sans période décidé.

Noms Program/Pas existing uniques après normalisation par catalogue ; même nom
entre les deux catalogues valide, deleted ne réserve pas nom. Catalogue existing
sans utilisateur valide. Project/Reservation existing referencing catalogue
deleted invalide ; deleted owner peut conserver ref historique selected selon
proposition §4.3. Aucun auto-tombstone ni suppression implicite de groupement.
Commande suppression catalogue utilisé à fixer R1.3/R4 (refus ou composite
explicitement préparée), jamais déduite de la certification d'un état.

Order sélectionne exactement toutes racines Project une fois, inactive/deleted
compris, aucun ReservationId/Project inconnu. Restore garde le rang selon
commande R1.3 ; validateur ne compare pas deux ordres. PT/RT couples uniques
par owner immutable, tombstones inclus ; deux versions de même identité dans
registre permises, deux identités même couple refusées dans contexte fourni.
TA unique par association/SubPeriod ; PTEC unique par PT, AP par propriétaire,
Settings/Capacity/globals mappings 1:1. R2 couvre unicité historique exhaustive
et préservation à vie, ce que graphe fourni seul ne prouve pas.

### 6.5 Snapshot, Current et intégrité

Snapshot résout son manifeste complet et ses refs exactes depuis versions
fournies ; aucune lecture Current, même après suppression/restauration/changement
Current. Borne `knowledgeDate ≥ max(AP.through)` de **tous** AP sélectionnés,
y compris covered-zero et propriétaires inactive/deleted. AP vides ne contribuent
pas ; Portfolio sans AP exige encore date déclarative. Date requise mal formée
ou antérieure à un seul AP suffit à refuser. Aucun rapport createdAt, aucune
monotonie de créations, plusieurs SnapshotId à même date autorisés.

Current opérationnel n'a pas knowledgeDate ni historique métier automatique.
Ajouter version au registre ne change ni Current ni Snapshot. Archivage versions
n'est pas sauvegarde automatique des anciens manifestes. Save futur réutilise
refs certifiées, sans versions métier fictives/run/result/profile ; commande Save
et persistance ne sont pas implémentées R1.2. Si ancien AP/TA/PTEC est encore
sélectionné par Snapshot il reste résoluble malgré retrait de Current.
L'autonomie démontrée en mémoire sur données fournies ne certifie pas la
conservation durable/import/export R2.

## 7. Gates et stratégie de tests futurs

**Toutes G12 : NOT EXECUTED.** Modules/tests envisagés relatifs à `src-v2/` ;
fixtures TS natives adjacentes (aucun modèle legacy importé). Chaque négatif
part d'un positif complet et modifie une seule propriété discriminante ;
vérifier code/path/ref concernée et absence de certificat, pas seulement false.
Chaque test doit distinguer validation payload, résolution, structure et transition.

| Gate / invariant | Positif | Négatif discriminant | Module responsable / tests envisagés | Limites et responsabilités différées |
| --- | --- | --- | --- | --- |
| G12-01 — payload runtime 14 kinds | Une version valide pour chaque kind, null/options/quantités zéro et refs owners natifs | AP avec knowledgeDate ; PTEC status ; PT confirmed/suspended ; quantity mauvaise famille ; champs obligatoires manquants même sous cast mensonger | `domain/portfolio/payloadValidation.ts` ; `payloadValidation.test.ts`, table des 14 schémas + type assertions | Schéma métier obligatoire après factory R1.1 ; codecs/import R2, saisie UI R5 |
| G12-02 — registre passif immutable/owners/collisions | Deux branches même owner ; répétition ref et contenu identiques ; append garde anciennes copies et sélection indépendante | Même ref payload différent, owner changé sur autre racine, cycle filiation, tentative mutation profonde ; lookup ref absente avec autre version disponible | `domain/versioning/versionRegistry.ts` ; `versionRegistry.test.ts`, regressions V02–V06 | Contrôle contexte fini ; unicité/conservation durable/atomicité R2 ; pas latest/getCurrent |
| G12-03 — manifeste/inventaires exacts | Globals + tables, racines dérivées des owners Settings ; portefeuille vide explicite ; catalogue inutilisé inclus | Deux versions même identité, deux Settings même owner, table mauvais kind, rootIds supplémentaire, SubPeriod table en désaccord AP | `domain/portfolio/manifest.ts` + `graphValidation.ts` ; `manifest.test.ts`, `graphValidation.test.ts` | Ne prouve pas inventaire Current exhaustif à vie ; construction candidats R1.3, durable R2 |
| G12-04 — resolver pur sans fallback | Même graph malgré permutation registre ; snapshot résolu avec lecteur Current qui lève | Ref v1 absente avec v2 présente, port retourne mauvais versionId ; exact support declared absent, provenance utilisée comme substitution | `domain/portfolio/graphResolver.ts`, `application/portfolio/loadPortfolioGraph.ts` ; tests homonymes | I/O via ports seulement ; retry/streaming/recovery R2 ; provenance facultative n'autorise pas missing declared source (§10) |
| G12-05 — lifecycle/tombstones | Deleted Project/AP couvert + PT deleted sans TA/PTEC, ancienne TA positive dans registre ; Team hidden existing inchangée ; RT deleted endpoints deleted | PT existing vers Team deleted ; PT deleted encore PTEC/TA ; RT deleted avec TA ; deleted endpoint manquant | `domain/portfolio/graphValidation.ts` ; `lifecycleGraph.test.ts` | Acceptation état, jamais scan historique ; cascades/confirm suppression/restore R1.3, transactions R2 |
| G12-06 — AP/partition contiguë | Vide, singleton, bissextile, couvert sans association ; AP propriétaire deleted présent | AP vide avec SubPeriod/bornes ; couvert trou/overlap/borne manquante/ordre faux ; AP autre propriétaire ou AP racine absent | `payloadValidation.ts`, `graphValidation.ts` ; `actualPeriodGraph.test.ts` | Modifier/split/merge/confirm R1.3 ; pas provenance obligatoire ni date connaissance |
| G12-07 — TA grille exacte zéro compris | Deux associations existing d’un même AP × deux SubPeriods = quatre TA, owner inactive ou RT zéro permis ; zéro quantité gardée | Une TA zéro retirée, double identité cellule, cellule extra deleted/foreign AP ou missing colonne ; famille ETC à la place Consumption | `graphValidation.ts` ; `teamActualGrid.test.ts` | Confirmation des cellules/dates affectées et versions sélectives R1.3 ; reconstruction quotidienne R1.4/R3 hors validation |
| G12-08 — PTEC PT existing sans statut cohérent AP | AP vide/PTEC lastActualsDate null ; AP v2 même through/PTEC v1 gardé ; ETC zéro sans statut valide | PTEC absent existing, présent deleted, AP d'autre Project/Reservation, lastActualsDate≠through/null, ref version AP ajoutée/status | `payloadValidation.ts`, `graphValidation.ts` ; `ptecGraph.test.ts` | Revue ETC positif/zero→positif et confirmation sans nouvelle version R1.3 ; pas calcul auto |
| G12-09 — capacités/RT/catalogues/ordre | Schedule gaps/exceptions hors horizon ; RT zéro dans deux modes ; Program existing sans usage ; ordre inclut inactive/deleted | Capacités overlap, exceptions même date, ratio>1, propriétaire existing vers catalogue deleted ; ordre Project manquant/dupliqué ; deux noms existing normalisés égaux | `capacityValidation.ts`, `catalogValidation.ts`, `graphValidation.ts` ; tests homonymes + `orderGraph.test.ts` | Applicabilité ratio exception sans période R3 ; suppression catalogue utilisé R1.3/R4 ; aucun calcul/priorité Program |
| G12-10 — dates Snapshot/autonomie | knowledgeDate = max through dont AP deleted ; AP tous vides ; mêmes dates distinct IDs ; créations dates reculées ; Snapshot ancien après Current modifié | Date absente ou <through d'un AP inactive/deleted ; ref historique absente ne se remplace pas par Current ; résultat/profile ajouté | `manifest.ts`, `graphValidation.ts`, service lecture ; `snapshotGraph.test.ts` et port spy Current inaccessible | Résolubilité mémoire, jamais garantie durable ; Save/CAS/autonomie import-export R2 |
| G12-11 — unicité structurelle | Même identité PT versions existing/deleted dans registre, couple unique ; TA cellule même ID avec version modifiée | Deux PTId même couple, un deleted/un existing ; deux RTId même couple ; deux AP même owner, deux PTEC même PT, deux TA même cellule | `versionRegistry.ts`, `graphValidation.ts` ; `associationUniqueness.test.ts` | R1.2 : graph/contexte fourni uniquement ; R2 : unicité historique à vie toutes versions, races/import/recovery |
| G12-12 — certificat indépendant transitions | Deux états identiques issus de trajectoires différentes certifiés sans historique/confirm ; graph valablement deleted avec ancien consommé positif | Graphe incomplet refuse certificat ; objet cast/validated:true forgé refusé par frontière de consommation, mutation entrée/sortie ne change pas sélection certifiée | `validatedPortfolioGraph.ts` ; `validatedPortfolioGraph.test.ts` | Ne prouve confirmation, stale, revue ETC, cascade réellement préparée, CAS/durabilité, simulation ; R1.3/R2/R1.4 |
| G12-13 — V2 natif/hexagonal isolé | Runtime/types/transitifs Domain internes ; ports/adapters injectés ; compilation/test/build V2 seulement | Import Domain→Application/adapter/UI/moteur, import type legacy/barrel/symlink, horloge/storage/browser ou tests/fixtures dans runtime | tests AST `scripts/v2/r12.test.mjs` proposé, garde existant ; vérification de dépendances + canaris ciblés | Delta A02 §8 audité ; aucune permission générique d'élargir garde ; browser/storage/CAS métier pas gates R1.2 |

Corpus transversal : Portfolio vide avec Settings/Order explicites ; un Project,
une Reservation et deux Teams (une hidden), AP vide/couvert, PT dailyCap absent/zero,
RT ratio/fixed-daily zero, tombstones/catalogues unused, ordre stable. Snapshot
historique partageant versions avec Current puis Current divergent. Scénarios
supports predecessor/provenance exacts et manquants, branches, split/merge provenance
vide et sélection cohérente. Chaque fixture est native, aucune importation de
preuve G1/legacy ni réutilisation de ses résultats comme PASS.

Oracles : calcul indépendant des ensembles attendus de cellules/owners/ordre,
comparaison BigInt exacte ; dates aux bornes 0000-01-01/9999-12-31 et bissextiles
sans énumération dense ; invariance permutation du registre ; mutation input/output
et grille zéro/absence. Pas oracle moteur ni prorata. Séparation type/runtime :
`@ts-expect-error` familles et readonly, plus entrées JS/unknown/casts falsifiés.

Validation future minimum : `npm run check:boundaries:v2`, `npm run typecheck:v2`,
`npm run test:v2`, `npm run build:v2` et contrôles de scope Git ; aucune dépendance
ajoutée. Conserver résultats bruts/versions environnement et matrice contrat→module→test
au canon R1.2 futur après GO. Ni skip/todo ni test legacy ne remplace une gate.
Smoke natif si graphe de démarrage/capacités browser modifiés ; ce plan propose
modules dormants et shell inchangé. Windows demeure DEFERRED selon I-R01-C.

## 8. Ordre d'implémentation proposé pour une future session

| Étape | Travail futur borné | Gates / condition de passage |
| --- | --- | --- |
| P0 | Audit indépendant du SHA exact, réponses §10, validation explicite utilisateur R1.2 ; fetch/branche/HEAD/status/origin/baseline ; diff de toute évolution | STOP si delta inexpliqué ou choix nécessaire non fixé ; aucun reset/force-push |
| P1 | Schémas et validateurs des 14 kinds, helpers couleur/catalogue/calendrier, factory métier validante réutilisant R1.1 | G12-01, locaux G12-06/08/09 ; frontières G12-13 adaptées avant noms nouveaux |
| P2 | Registre valeur pure, lookup/insertion passive et rapports contextuels, unicité locale | G12-02/11 ; sans sélection/commande/index historique |
| P3 | Manifestes Current/Snapshot et inventaires dérivés ; types metadata exacts | G12-03 ; choix 1:1/fermeture §10 adoptés |
| P4 | Resolver sur données fournies + diagnostics ; ports/read adapter mémoire/service collecte | G12-04 et autonomie G12-10 ; Domain sans ports/I/O |
| P5 | Validateur inter-entités lifecycle/AP/TA/PTEC/capacités/catalogues/ordre + certificat | G12-05–12 complets ; état accepté ne vaut pas transition autorisée |
| P6 | Gates complètes/typecheck/test/build, revue scope/isolation, registre opérations effectives/canon/preuves ; rollback et audit livraison | G12-01–13 satisfaites avec limites ; aucun R1.3/R1.4/R2 commencé ; pas DONE sans audit et clôture explicite |

**Delta technique obligatoire à auditer avant P1 :** `scripts/v2/r11.test.mjs`
A02 prohibe actuellement les identifiants Current, PortfolioSnapshot, GraphResolver,
GraphValidator dans tout Domain. Sa restriction de périmètre R1.1 ne doit pas
bloquer les modèles R1.2. Proposition : borner le test historique de primitives
aux répertoires R1.1, maintenir les interdictions Date/horloge/browser pour **tout**
Domain dans nouvelle suite R12, et vérifier toutes dépendances Domain restent
Domain. Garde `boundaries.mjs`, canaris legacy/storage/Worker/dynamic/realpath,
configs/package inchangés. Ne pas désactiver A02 globalement ; conserver assertions
mathématiques anti-float et V01–V06. Tests techniques supplémentaires seuls,
aucun élargissement d'accès calculé/runtime/stockage nécessaire proposé. Si un
algorithme ne peut respecter le garde, soumettre un delta précis à audit avant
modification. Cette livraison ne modifie aucun script/test.

Registre de reprise §R1.2 : primitives R1.1 REUSE livré ; validations couleurs
REUSE ciblé (sans suggestColor), calendrier ADAPT contrôles sans calcul quotidien,
entités inline REFERENCE pour contrats, graphe/manifeste/registry/certificat natifs.
Aucun fichier legacy entier/import/barrel ni merge automatique. Future extraction
consigne source/SHA exact/symboles/destination/dépendances retirées/preuves/audit.

Rollback futur : modules dormants, aucun stockage ni donnée réelle ; revert normal
commits R1.2 en ordre inverse dans copie jetable, vérifier tree/runtime shell et
primitives restaurés, tests V2 et sentinelles si runtime touché. Préserver preuves ;
pas conversion/recovery/cleanup réel ni histoire Git réécrite. Cette preuve de
rollback n'est pas exécutée dans le PLAN.

## 9. Réception et livraison documentaire

Réception du PLAN pour audit : dix sections présentes, remplacements explicites
sans effacement historique, 14 kinds conservés, payloads/AP/TA/PTEC exacts,
frontières hexagonales, gates positives/négatives/modules/tests/limites, ouvertures
§10 identifiées, statut NOT STARTED / PLAN PROPOSED FOR AUDIT. Audit favorable
et validation explicite utilisateur requis avant implémentation ; acceptation
fonctionnelle des amendements ne vaut pas adoption des propositions techniques.

Réception future R1.2 : toutes G12 exécutées et satisfaites, scope conforme,
AP/TA/tombstones/RT zero/catalogues unused/Snapshot historical natifs démontrés,
certificat non forgeable et structure seule clairement attestée, aucun moteur/
commande/confirmation/durable ajouté. Provenance reprises et erreurs conservées,
R1.1/isolement non régressés ; revue indépendante et clôture utilisateur avant DONE.

Livraison présente : seuls six Markdown autorisés (PLAN, deux trackers, décisions,
addendum R0, intentions registre de reprise). Contrôle du diff complet, absence
de modification source/test/script/config/dépendance, `git diff --check`, liens
relatifs et ancres nouvelles, maintien des canons et archives byte-identiques,
statuts cohérents. Commit/push normal sur branche autorisée, fetch final puis
SHA local/distant/arbre propre/divergence 0/0. SHA final dans compte rendu,
pas auto-référence circulaire. Aucun test métier/build n'est requis pour Markdown.

Contrôles documentaires effectivement obtenus avant commit : diff complet des
cinq fichiers existants et du nouveau PLAN examiné ; six Markdown exclusivement ;
210 liens locaux dont 50 ancres contrôlés, tableaux bien formés, dix sections et
13 gates présentes, statuts cohérents. Archives des trackers, plans/canons R0.1/
R1.1 et corps historique R0 identiques à la baseline. `git diff --check` sans erreur.
Aucun test applicatif, build ou gate G12 exécuté. Contrôles Git finaux rapportés
après commit/push ; ces vérifications documentaires ne valent pas audit indépendant.

## 10. Risques, arbitrages ouverts et décisions d'audit nécessaires

Les règles fonctionnelles A-R12 sont fixées par le cadrage. Les choix suivants
sont **propositions ou questions**, aucune résolution silencieuse dans du code.

| ID / sujet | Proposition du PLAN / ambiguïté explicite | Décision attendue / effet |
| --- | --- | --- |
| O12-01 — identités Settings et mappings | EntityId opaque distinct de ProjectId/etc ; mapping par owner 1:1 ; racines dérivées des Settings | Valider choix et unicité locale/durable avant P1–P3 ; aucune égalité d'octets imposée par R1.1 |
| O12-02 — capacités/catalogues sous tombstone | Une capacité par Team deleted aussi ; refs catalogue conservées dans Settings deleted résolubles, catalogue deleted accepté ; catalogues selected inutilisés admis | Valider minimum de fermeture et politique avant P3/P5 ; cadrage ne précise pas obligation Capacity deleted ni inventaire exact de catalogues non référencés |
| O12-03 — fermeture lineage/provenance générique | Support exact des liens déclarés requis pour certifier, distinct sélection ; absence reportée, provenance vide valide ; cycles provenance proposés refusés | Valider portée de fermeture/cycle avant P2/P4 ; ne pas confondre source business facultative avec ref déclarée introuvable ni modifier contrats R1.1 |
| O12-04 — encodages locaux | Null explicite, dailyCap OptionalQuantity, mandatory+objective unique, couleur canonique, noms normalisés, listes périodes/exceptions chronologiques strictes, weekdays vide valide ; SnapshotId opaque distinct et createdAt format fixe §4 | Audit avant P1/P3 ; choix techniques de représentation non livrés R1.1, aucun parsing legacy repris implicitement |
| O12-05 — lecture/certificat | Ports async séparant capacité Current/Snapshot ; registre valeur pure sans mutation ; marque privée reconnue runtime | Audit API et anti-forge avant P2/P4/P5 ; pas nouveau service de preuve ou autorité de sélection |
| O12-06 — catalogue utilisé / revue ETC / confirmations | Structure interdit owner existing→catalogue deleted ; commande catalogue utilisée encore à définir ; ETC positif exige revue ciblée, étendue exacte/read-set à définir R1.3 | Ne bloque pas validation état R1.2 ; arbitrage commandes/preparation/stale obligatoire avant GO R1.3/R4 |
| O12-07 — ratio exception sans période | Divergence patrimoine déjà ouverte ; R1.2 valide shape/mode/quantité seulement | Arbitrage normatif R3 (ou avant scénario moteur concerné R1.4) ; ne pas choisir en validateur structurel |
| O12-08 — configuration bootstrap | Aucun default horizon/weekdays/N ni ID/révision générés ; fixtures fournissent tout explicitement | Defaults à fixer avant bootstrap natif opérationnel R1.3/R2 ; pas défaut horloge dans R1.2 |

Risques concrets : croire factory typée R1.1 ou certificat suffisants pour une
transition ; confondre unicité contextuelle et unicité à vie ; compléter des tables
manquantes depuis registre/latest ; réintroduire statuts/connaissance via payload
legacy ; garder négatifs historiques devenus positifs ; faire de l'archive Current
un second historique métier ; affaiblir A02 pour autoriser tous imports ; épuisement
mémoire/pile BigInt/copies/grandes grilles. Mesures : validation runtime unknown,
code/path discriminant, isolation native et comparaison refs exactes, limites
explicites et audit des O12, aucune énumération quotidienne, aucun index ever-nonzero.
Les limites physiques du runtime R1.1 subsistent, sans promesse d'intercepter
toute exhaustion ni plafond métier arbitraire. Budgets moteur/stockage R1.4/R2/R3.

Prochaine action : audit indépendant de ce PLAN au SHA documentaire livré,
corrections documentaires si nécessaires, puis validation explicite avant toute
implémentation. **Arrêt après commit/push documentaire.**
