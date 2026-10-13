# FlowPlan2 V2 — Lot A (P1–P3) — Plan d'exécution

**État : PLAN ONLY — À AUDITER.** Date : 2026-10-13.
Aucune implémentation, aucun prototype, test ou benchmark nouveau exécuté.
P0 est DONE après audit indépendant selon l'instruction utilisateur ; ses
contrats sont la cible normative. Ce document ne change aucun statut P1–P7.
Un seul GO explicite d'implémentation est requis pour tout le lot A après audit
indépendant ChatGPT du plan ; A.1–A.4 sont des jalons internes, pas des GO ou
clôtures séparés. Une seule clôture finale du lot A, après qualification et audit.
Lot B (P4–P6), lot C (P7), R1.4 et R2 restent hors mission.

## 1. Baseline et corpus normatif

### 1.1 Préflight avant rédaction

Les commandes obligatoires ont été exécutées dans cet ordre, avant création du
présent fichier :

| Commande | Résultat |
| --- | --- |
| `git fetch origin` | Succès, code 0 |
| `git status --short` | Vide : arbre propre |
| `git branch --show-current` | `rewrite/portfolio-versioned` |
| `git rev-parse HEAD` | `b9db2ee28528e387f67c8277d0978066cc9d07e6` |
| `git rev-parse origin/rewrite/portfolio-versioned` | Même SHA |
| `git rev-list --left-right --count origin/rewrite/portfolio-versioned...HEAD` | `0 0` |

SHA initial = baseline documentaire validée = HEAD = origin. Aucun commit
postérieur : `git log baseline..HEAD` vide. Aucune modification existante à
écraser, aucun blocage de synchronisation ou changement normatif constaté.
La recherche dans le dépôt ne trouve aucun `AGENTS.md` applicable. Avant le
commit et le push, répéter fetch/statut/comparaison ; si origin avance, analyser
le diff normatif et documenter le blocage en cas de divergence ou changement
important, sans reset, écrasement ni force-push.

### 1.2 Sources lues et précédence

Lecture intégrale des cinq documents obligatoires :
[plan général](./rewrite_r11_r13_simplification_plan.md),
[addendum P0](./rewrite_simplification_p0_addendum.md),
[invariants P0](./rewrite_simplification_p0_invariants.md),
[clauses P0](./rewrite_simplification_p0_clauses.md),
[frontières P0](./rewrite_simplification_p0_boundaries.md).
Lecture intégrale des [canons R1.1](./rewrite_r11_canon.md),
[R1.2](./rewrite_r12_canon.md), [R1.3](./rewrite_r13_canon.md) et du
[registre des décisions](./rewrite_decisions.md). Lecture du
[rapport PERF-EDIT](./proofs/r13/perf/report.md) et des harnesses associés.

Les décisions D-R1-01/02, D-R11-01, A-R12-01–09, B1–B4 R1.2 et B1/B3
R1.3 conservent leurs garanties métier. P0 amende les moyens T01–T06 sans
réécrire les clôtures historiques. Les mentions anciennes de statuts décrivent
leur date ; la réception P0 fournie par l'utilisateur ne sera pas réinscrite
dans les canons. R1.3 reste IN REVIEW. D-R12-P3C n'est pas réactivée : le
chargement unknown garde ses constructions validantes indépendantes.

**Limite propre au lot A :** T05 (succession par validation ciblée) n'est pas
réalisée. Tout candidat accepté passe réellement par
`certifyPortfolioGraph({source:'current', manifest, versions:S1})` après son
assemblage final. Il s'agit du chemin complet conservé, pas d'un repli nouveau
pour fermeture indémontrable. Aucun certificat hérité ne remplace cette étape,
aucun validateur ciblé, catalogue exécutable de fermetures ou optimisation de
l'oracle n'est prévu ici. Les index stables préparés pour B n'autorisent rien.

## 2. Cartographie du code et des ports

Tous chemins de cette section sont relatifs à la racine. Les constats sont
issus de la lecture des sources à la baseline, pas d'une exécution nouvelle.

### 2.1 Domain et Application

| Fichier / symboles | Dépendances, consommateurs et constat prouvé | Traitement prévu |
| --- | --- | --- |
| `src-v2/domain/versioning/versionRegistry.ts` : createVersionRegistry, withVersions, lookupExact, lookupExactBatch | Factory copie toute entrée, createBusinessVersion par enveloppe, validateVersionContext puis mappings owner→identité pour 11 kinds. withVersions copie B puis appelle la factory sur `[...registry.versions,...B]`. lookupExact parcourt la liste ; batch reconstruit une table exacte depuis toute la liste. Appelé par resolver, load/collect, reader mémoire, admission et execute ; tests R1.2 et harness PERF-LOAD. | Conserver import unknown et APIs R1.2 ; ajouter append pur avec contexte attesté. Retirer withVersions et batch sur H du chemin normal R1.3. Ne pas changer silencieusement le contrat du registre fini. |
| `src-v2/domain/versioning/versionEnvelope.ts` | Factories de refs/owners, copie/gel payload, predecessor même identité, provenance ; validateVersionContext recopie/acquiert le contexte et parcourt les ancêtres de chaque version. Tables temporaires de `localVersionTables.ts`. Consommé par payloadValidation/registry et tests R1.1. | Conserver règles/diagnostics ; contrôles d'append Domain utilisent ces règles locales et témoins pertinents, sans relancer contexte H. |
| `src-v2/domain/versioning/immutableValue.ts`, `localVersionTables.ts`, `owner.ts` | Détachement/égalité structurée ; trie Map temporaire mutable non exposé ; clés composantes owner/ref. | Réutiliser clés/règles ; ne jamais promouvoir le trie temporaire en archive persistante mutable partagée. |
| `src-v2/domain/portfolio/payloadValidation.ts`, `payloads.ts`, `manifest.ts` | 14 schémas métier, createBusinessVersion ; wrappers fermés, refs selected, 12 tables et deux globals. | Conservés ; nouvelles B toujours acquises par factory, aucune marque already-valid exportée. |
| `src-v2/domain/portfolio/graphResolver.ts` : resolvePortfolioManifest | createPortfolioManifest puis createVersionRegistry sur fourni ; batch exact ; inventaires roots dérivés des Settings. Appelé par graphValidation et PERF-LOAD. | Conserver chemin unknown complet. Pour candidat A, fournir uniquement S1 exact, jamais H+B. |
| `src-v2/domain/portfolio/graphValidation.ts` | validateResolved privée : scans par kind, endpoints, Capacity/AP, catalogues, partitions, produit attendu TA, comptage cellules, PTEC, ordre ; validateSnapshotGraph ajoute borne knowledgeDate. | Inchangé fonctionnellement, aucune extraction de validateur ciblé durant A. |
| `src-v2/domain/portfolio/validatedPortfolioGraph.ts` | Marque TS déclarée, factory unique unknown via validation complète. Appelée par loadCurrentGraph/loadSnapshotGraph, admission et execute. Pas de registre runtime de certificats. | Factory complète préservée. La capacité privée Application est distincte de cette marque TS et ne devient pas une seconde certification métier. |
| `src-v2/domain/portfolio/transitions/transition.ts` : analyseTransition, resolveObligations, businessEqual | Analyse reçoit graphe et H entier. desired copie S ; fresh cherche labels dans H ; historic filtre H par owner, parseBases vérifie toutes bases exactes dans H. Les scans S et copies de businessEqual restent coûteux. Consommé par session et transition.test.ts. | Remplacer H par faits historiques acquis et demandes pures ; préserver commandes, ordre des obligations, propositions et réponses. Garder scans S nécessaires et certification complète ; pas de fermeture ciblée. |
| `src-v2/application/portfolio/loadPortfolioGraph.ts` | Lecteurs async unknown ; collect construit registre de réponse, contrôle missing avant extra, puis vraie certification reconstruit son registre. Snapshot n'utilise aucun lecteur Current. | Réutiliser collecte exacte pour acquisition ; conserver APIs de lecture et double frontière validante R1.2. Capture cohérente native supplémentaire, sans ajouter write au lecteur. |
| `src-v2/application/portfolio/transitions/session.ts` : admitRamHistory | Source complète H/inventory/reservations ; confrontation des refs, ledger TA/PTEC/SP, extraction S et certification complète. AdmittedRamHistory porte symbole runtime. | Remplacer admission universelle H par acquisition Current + raccordement autorité/répertoire de portée attestée. Ne pas accepter un symbole recopié comme capacité de session. |
| Même fichier : createTransitionSession, prepare/execute/abandon | Compare profondément trois vues à l'ouverture ; recopie sets/ledger en Application. prepare teste active sans le poser avant reservePreparation/reserveEntity. execute pose active puis exclusive, valide réponses, alloue Versions, matérialise B, withVersions(H+B), assembly, batch H, certification S, publish puis burn. catch peut retourner InternalTransitionFailure après publish injecté ayant muté puis levé. | Dossiers privés et garde totale ; unique propriétaire des réservations en adapter, token privé, append puis commit conditionnel. Suppression des copies de ledger faisant autorité dans la session. |

### 2.2 Ports, adapters et compositions

| Fichier / interface | Contrat actuel et consommateurs | Contrat cible |
| --- | --- | --- |
| `src-v2/application/ports/portfolioReadPort.ts` | ExactVersionsReader, CurrentSelectionReader, SnapshotReader : Promise DomainResult unknown ; load et reader mémoire. | Inchangés pour load/Snapshot. Ajouter lecture historique RAM exacte synchrone capturée pour session, erreurs distinctes et liaison à portée. |
| `src-v2/application/ports/currentRamPort.ts` | PublishedCurrent={selection,registry,graph} ; bindTransitionSession/read/exclusive(callback)/publish(view), CompleteRamHistorySource. Session/adapter/tests. | Cellule propriétaire read coherent + commit(expected,candidate) ; admission source native attestée et transfer, aucune publication par callback. |
| `src-v2/application/ports/transitionAllocationPort.ts` | reserveEntity(kind,owner), reserveVersion, reservePreparation ; session/allocateur déterministe/tests. | Réservation coordonnée avec autorité avant retour, receipts privés de dossier ; générateur technique optionnel derrière authority, sans ledger concurrent. |
| `src-v2/application/ports/candidateAssemblyPort.ts` | assemble(base,selected):unknown, défaut assembleCandidateManifest ; fault seam tests. | Garder assemblage avant certification ; sortie unknown intégralement validée. Aucun accès à commit ou capacité fiable. |
| `src-v2/adapters/memory/currentRamAdapter.ts` | current/entered/bound dans closure ; publish autorisé sous entered, gel superficiel view ; source copie tout jeu natif ; allocateur counters BigInt namespace. | Une closure propriétaire contient racines publiées, ledger, génération/révision, garde et writer. Les rôles peuvent rester dans ce fichier ; aucun deuxième store. |
| `src-v2/adapters/memory/memoryPortfolioReadAdapter.ts` | Factory registre de toutes versions au setup ; snapshots acquis ; exact batch reconstruit table à chaque requête. Lecture seule. | Garder lecteur autonome R1.2 ; pour propriétaire éditable, façade lecture sur la racine publiée capturée, sans copier un second H. |
| Composition native dans tests/harness ; bootstrap/shell V2 | Aucun répertoire `src-v2/composition/` à la baseline ; recherche des consommateurs : aucun montage métier R1.3 dans runtime shell, modules dormants. | Aucun montage UI/bootstrap/legacy nouveau. Qualification composition dans tests/harness uniquement. |

Les compositions concrètes identifiées sont `src-v2/application/portfolio/transitions/r13.test.ts`
(setup source→admission→store→session), `src-v2/domain/portfolio/transitions/transition.test.ts`,
et `scripts/benchmarks/r13-edit/worker.mjs`. Le harness
`scripts/benchmarks/r13-edit/run.mjs` instrumente les marqueurs E1–E7 du JS
compilé et écrit dans les preuves historiques : **ne pas le relancer tel quel**.
Les outils `scripts/benchmarks/r12-perf/{worker,verify}.mjs` consomment les APIs
R1.2 conservées ; leur oracle reste compatible.

Tests examinés : suites enveloppes/immutabilité R1.1,
`src-v2/application/portfolio/r12.test.ts` (registry, lookup, unknown, Snapshot,
PERF-P0/P1/P2/A1/B), suites transitions Domain/Application R1.3 ; audits AST
`scripts/v2/r12.test.mjs` et `scripts/v2/r13.test.mjs`. Ce dernier compte un
appel réel de certification et un publish : remplacer son assertion publish
par commit, conserver la garantie et ajouter des canaris de publication directe.
Aucun test actuel ne prouve la future garde du premier reserveEntity, l'ABA
par remplacement externe ou la collision avec archive non chargée sous authority
séparée ; leurs tests nouveaux sont spécifiés au §9.

### 2.3 Constats et hypothèses

Les reconstructions/copies ci-dessus, fenêtres de garde et ordre des appels
sont prouvés par source. Le risque mutate-then-throw est permis par le port
injectable actuel ; aucune corruption de l'adapter natif n'est alléguée.
L'exhaustivité d'une source native est une précondition de composition : le
code ne peut détecter un passé omis aussi de son inventaire. Les coûts mesurés
proviennent exclusivement du rapport historique ; le gain futur, le coût des
arbres persistants et les pentes résiduelles sont des hypothèses à mesurer.

## 3. Architecture cible recommandée

Une cellule RAM par Portfolio et portée, un écrivain lié, une seule autorité
d'unicité technique et un seul répertoire conservant les enveloppes. Les
index sélectionnés sont dérivés du graphe certifié ; ils ne sont ni archives,
ni preuve d'absence historique, ni nouvelle autorité métier.

- **Domain** possède les règles pures : forme de B, owner/mapping, clés métier,
  filiation/provenance, collisions, propositions/obligations/réponses et
  certification complète inconnus/candidats. Il reçoit des valeurs/témoins,
  jamais un port de stockage ni callback d'allocation.
- **Application** acquiert Current, lie la capacité privée, détient dossiers et
  handles originaux, orchestre requêtes exactes, vérifie disponibilité de scope,
  stale, réservations, candidat complet et résultat du commit.
- **Ports** décrivent capture cohérente, résolution exacte, authority de portée
  déclarée, réservation et commit conditionnel. Ils transportent les faits
  Domain ; aucun port ne certifie lui-même le métier.
- **Adapter RAM** possède physiquement racines persistantes, ledger monotone,
  tokens et swap. La composition atteste sa portée et qualifie son comportement.

### 3.1 Matérialisation minimale

Prévoir `application/portfolio/acquireCurrent.ts` pour le cas d'usage unique,
`application/ports/currentAuthorityPort.ts` pour scope/réservations/historique
RAM et `domain/versioning/versionAppend.ts` pour les règles d'append. Adapter
et cellule restent dans `currentRamAdapter.ts` ; session dans son fichier
actuel. Ajouter `domain/versioning/persistentVersionArchive.ts` pour une valeur
pure spécialisée de répertoire exact ; aucune bibliothèque générique de stores.
Un module `domain/portfolio/currentDependencyIndex.ts` peut regrouper R01–R11
pour les index dérivés de S certifié. R12 reste au chargement Snapshot.

Ces fichiers séparent frontières testables, pas des managers/classes par rôle.
Authority, archives et état publié sont des responsabilités logiques d'une même
closure RAM. Les arbres/index sont des représentations, pas des doubles stores
métier ; aucun payload historique dupliqué dans authority. Les types de ports
ne doivent pas importer `acquireCurrent.ts` ou `session.ts` (audit hexagonal).

### 3.2 Tuple, lecture et représentation

Racine propriétaire privée :
`{published:{selection, graph, archiveRoot, selectedIndex, generation, revision}, ledgerRoot}`.
Une lecture capture cette racine une fois ; la vue publiée est immutable et
concordante : graph.manifest = selection.manifest en valeur, revision identique
au wrapper, chaque ref selected résout exactement dans archiveRoot ; index
construit depuis ce même graph et lié au même token. ledgerRoot est technique,
peut avancer sans changement métier, et ne devient aucun champ Current/Snapshot.

Recommander un index exact persistant spécialisé, arbre équilibré par tuples
composants `(kind,family,value,versionFamily,versionValue)`, comparaison lexicale
sans concaténation ambiguë ni hash d'autorité. Append copie uniquement les
chemins des B insertions, enveloppes H partagées, itération exhaustive explicite
réservée à export/qualification. Lookup visé O(log H), append O(B log(H+B))
structurel, sans parcours/copie de H ; ce sont objectifs algorithmiques à
qualifier, pas latences promises. Pas de liste `versions` H matérialisée à
chaque lecture. Pas de chaîne de segments parcourue O(nombre d'éditions).
Les index techniques d’émissions/mappings et le ledger utilisent également
une mise à jour persistante par chemins : aucune copie exhaustive de ledger
proportionnelle à H à chaque édition. Les états effective pending/burned sont
liés au token du dossier ; avancer le token invalide logiquement les anciennes
réservations sans balayer tous les dossiers. Inspection/export peut les énumérer
explicitement, hors chemin EDIT. Les Maps natives ne sont pas immuables par Object.freeze : ne pas les exposer
ou les partager mutables entre racines. Nœuds records/tuples gelés, aucune
méthode de mutation publique ; tests de persistance et d'alias obligatoires.

SelectedIndex contient refs exactes et inverses R01–R11, dérivés de S entier
après certification complète dans A, confrontés à ses membres et clés. Sa
construction peut encore coûter O(S+relations) ; la rendre incrémentale par
preuves de fermeture relève de B. Il n'est jamais consulté pour ignorer un
prédicat dans A. Pas de catalogue de règles dupliqué dans l'index.

## 4. Alternatives et migration

| Chemin | Avantages | Risques et décision |
| --- | --- | --- |
| 1. Modifier progressivement ports/session en activité | Peu de nouveaux noms, petits diffs | Admission H puis authority mixte, dossiers de formes incompatibles, publish/exclusive et commit concurrents, ledger double pendant étapes ; risque de conserver compatibilité temporaire. Rejeté comme chemin actif. |
| 2. Construire capacités internes finales, bascule unique puis retirer anciens chemins | Contrats qualifiables isolément, un seul pipeline actif au terme ; pas trois architectures intermédiaires | Coexistence de code dormant pendant commits, intégration finale plus large ; limiter strictement et tester avant bascule. **Recommandé.** |

A.1–A.3 bâtissent les primitives finales et leurs tests isolés ; ils ne montent
pas une seconde session active. Le chemin livré actuel reste seul actif jusqu'à
A.4 ; la garde commune et les contrats de commit sont conçus dès A.1. A.4
bascule toutes compositions R1.3 ensemble et supprime admission H universelle,
copies de ledger Application, transmission H entier et publication ancienne.
Les commits intermédiaires ne constituent pas livraison utilisable du lot A.
Aucun flag de choix de publication, wrapper qui traduit commit en publish,
manager de migration ou fallback durable conservé.

APIs affectées : CompleteRamHistorySource, AdmittedRamHistory/admitRamHistory,
createCurrentRamAdapter/createNativeRamHistorySource, paramètres de
createTransitionSession, CurrentRamPort/PublishedCurrent.registry et accès
`.registry.versions`, allocation liée à authority, analyseTransition(history).
Les consommateurs sont les tests/harness V2 inventoriés ; aucun appelant UI
ou legacy trouvé. Remplacement direct de ces APIs expérimentales, avec notes
avant/après dans livraison ; pas de couche de compatibilité publique non utile.
Prepare/execute/abandon, commandes, handles/answers et unions des résultats
restent compatibles en comportement. `Applied.current` devient vue en lecture
avec répertoire exact plutôt que liste H : changement de type explicite.
`reservations()` reste inspection immutable du ledger propriétaire capturé.

Les APIs R1.2 de load/certification/registre fini, withVersions et leur tests
restent disponibles pour leur contrat unknown/contexte fini ; **aucun appel
R1.3 d'édition normale** à withVersions. Leur présence n'est pas une deuxième
voie de publication. Rollback technique par revert normal du lot et compositions
ensemble, jamais en détruisant les archives d'une cellule ayant été utilisée.
Aucun protocole de conversion durable/rollback de données n'est promis ici.

## 5. Décisions d'interface et de responsabilité

Signatures ci-dessous sont contractuelles à auditer ; elles ne sont pas du code
livré. Ports définissent leurs types partagés localement et n'importent aucun
module d'orchestration. Les capacités privées restent hors sérialisation.

### 5.1 Acquisition unique et capacité fiable

`acquireCurrent(sourceCapture, exactReader, ownerBinding)` est le seul cas
d'usage autorisant une installation inconnue. Il capture M/révision et scope
ensemble, acquiert wrapper fermé, collecte toutes refs S exactes, contrôle
missing/substitution/extra avec priorités R1.2 et certifie tout S. Il confronte
scope/mappings connus et construit index dérivés depuis le certificat entier.
Une capture async doit fournir token stable puis recontrôle après lectures ;
changement ⇒ refus/recommencement explicite sans installation d'un mélange.
Native RAM synchrone évite cette attente dans la session ; lecteurs async
R1.2 restent utilisables hors session sans conversion arbitraire en sync.

Après succès, une liaison Application privée à l'écrivain propriétaire crée
la capacité : objet original stocké dans closure privée, owner original,
génération neuve opaque par identité runtime, révision privée monotone et vue
certifiée exacte. Ne pas exporter de factory acceptant un
`ValidatedPortfolioGraph` fourni par caller pour installer directement ; un
cast, flag, symbole copié, Spread ou certificat Snapshot ne passe pas cette voie.
Le propriétaire fournit un endpoint d'installation uniquement à ce service
lié ; pas de install/publish public prenant une vue arbitraire. Le certificat
Domain ne prouve pas authority, sa complétude ni l'atomicité de l'adapter.

Installation initiale, remplacement externe, réhydratation RAM et changement
de propriétaire utilisent **tous** cette acquisition. Échec laisse ancien
tuple intact et aucun token fiable nouveau. Succès crée génération nouvelle,
révoque anciennes capacités/index/dossiers. Même révision texte et même M
après A→B→A ne rendent jamais l'ancienne génération égale. Révision privée
BigInt ne se réemploie pas entre éditions ; le texte Current demeure opaque.
Remplacement sur même Portfolio conserve H et ledger, y ajoute les nouvelles
archives acquises ; tentative d'omission n'efface rien. Changement Portfolio
crée propriétaire/scope distinct, ne libère pas réservations de l'ancien.
Transfert propriétaire = ancien écrivain révoqué puis nouveau installé après
acquisition et transfert complet ; si intégralité non attestée, classes
concernées deviennent indisponibles et créations refusées. Aucun import/export
durable, codec ou recovery R2 ajouté.

### 5.2 Authority, archives, index et réservations

Contrat authority : `describeScope()` (Portfolio, owner, namespace EntityId et
VersionId, classes complètes, identifiant de transfert),
`inspectIdentity/inspectBusinessKey` → Existing(identity,owner) / AbsentAttested /
Unavailable / Incompatible ; `reserveEntity(key,owner,dossier)` et
`reserveVersion(dossier)` → receipt privé + ID acquis ou erreur.
Absence attestée exige classe complète dans scope et ledger, pas `complete:true`
désérialisé. Clés Domain reprises de P0 §5.1 : Settings par kind/owner,
Capacity/Team, AP/root, globals/Portfolio par kind, PT/RT endpoints, TA
(association kind+id, SP id), PTEC/PT ; SP n'est pas unique par AP.
EntityId émis bloque tout réemploi dans namespace annoncé, owner stable par
(kind,id) ; VersionId neuf globalement dans namespace, même autre kind/id.

Adapter tient mappings et émissions published/pending/burned, indépendamment
chargement des payloads. Une archive non chargée peut donc bloquer ID/couple.
Répertoire : `readExact(capturedArchive,refs)` → enveloppes exactes ou
AbsentAttested / Unavailable / Incompatible ; aucune requête par latest, date,
ordre ou identité seule pour choisir une version. Missing cache ⇒ Unavailable
ou tentative de lecture exacte, jamais autorisation de fresh. Native RAM
conserve tous payloads publiés. Les archives unknown effectivement importées
sont acquises/validées par la frontière R1.1/R1.2 de registre fini une fois,
y compris contexte fourni ; un raccordement d’authority sans payloads ne
prétend pas certifier ces archives absentes. Métadonnées de filiation attestées
ou témoins acquis pertinents sont nécessaires à l’append ; absence de preuve
refuse celui-ci, sans certification exhaustive H à chaque édition. Une fixture de répertoire partiellement chargé
qualifie la séparation, sans construire stockage hors RAM.

Une authority partielle permet uniquement les opérations dont toutes les
preuves nécessaires sont disponibles : identité/owner/base existants attestés,
VersionIds neufs garantis et S candidat complet. Rename/Reorder/ETC/correction
ne sont pas whitelistées par nom. Restore interroge chaque cellule/PTEC :
Existing ⇒ même identité et base explicitement désignée ; AbsentAttested ⇒
réservation fresh ; Unavailable ⇒ refus, même si grille certifiable. Si absence
VersionId neuve non garantie, aucune édition effective acceptée.

Le générateur déterministe reste moyen technique derrière réservation :
authority bloque clé avant appel externe, garde posée, valide sortie et
l'enregistre avant un autre appel externe ; exception/collision sans retry,
slots déjà émis burned. Receipt ne peut être recopié/réutilisé/autre scope.
ReservePreparation sous même garde, unique en session ; Versions seulement
après réponses valides et changement effectif. Pending concurrent sur même
clé interdit ; pas de deuxième identité de secours. Rejected answers corrigible
conserve pending ; abandon/stale/erreur termine dossier et brûle sorties non
publiées. Burn ne libère jamais clé/ID.

Transfert natif comprend mappings, émissions Entity/Version, receipts/statuts
pending/burned/published et compteurs/namespace ; H seul insuffisant. Handles
non transférables : pending de session quittée devient burned sans libération,
ancien écrivain révoqué. Authority transférée unique, pas clonée en deux
réservateurs actifs. Inspection ledger lit une racine cohérente et ne gèle pas
un tableau mutable vivant.

### 5.3 Demandes historiques Domain et append

Remplacer `analyseTransition(graph,H,unknown)` par acquisition pure commande,
calcul des besoins, puis analyse depuis graph et faits complets fournis.
Domain émet les clés TA/PTEC requises et refs bases explicites ; Application
interroge authority, lit exactement les bases demandées, valide réponse et
renvoie faits Existing/AbsentAttested. Validation des commandes avant lectures
et même ordre métier conservé ; pas d'allocation dans cette phase. Les labels
provisoires deviennent slots de plan par identité locale de slot, sans recherche
H ni collision avec les octets d'un EntityId opaque ; matérialisation lie slot→ID
et refs explicitement, pas remplacement récursif aveugle de chaînes métier.

`validateAppend(B, authorityWitnesses, exactBases, historicalLinkWitnesses)`
Domain → extension validée ou diagnostics. Adapter prépare nouvelle racine
archive depuis cette extension ; append ne sélectionne/publie rien.

Contrôles : L(B) sur enveloppe **et tout payload**, unicités internes B,
VersionIds receipts neufs ; owner immutable/mappings contre I ; selected
modifié predecessor=ref selected exacte ; non selected predecessor=base exacte
explicitement choisie et validée ; réellement neuf prouvé ⇒ aucun predecessor.
Branches permises et conservées ; une branche seule ne devient pas implicite.
Provenance R1.1 distincte, doublons/auto-source rejetés, pas de nouveau cycle
provenance ou fermeture transitive inventée. Restore B1 TA/PTEC force nouvelle
VersionId même valeur égale. Collisions divergentes et owner inconnu non prouvé
refusés avant extension.

**Filiation incomplète :** H importé peut référencer un predecessor absent.
La seule nouveauté du VersionId ne prouve donc pas l'absence de cycle H→B→H.
Conserver index compact des liens predecessor et cibles non résolues lors de
l'admission des archives. Pour append d'édition A, predecessor appartient à H
(base résolue) et aucun ancien lien non résolu ne cible une ref nouvelle B :
contrôle négatif exact par index, sinon refuser append et demander qualification
des témoins pertinents. Les IDs mentionnés par liens non résolus ne sont pas
considérés libres sans ce contrôle. H déjà acquis sans cycle fourni + liens B
seulement vers H + absence H→B implique aucun cycle nouveau ; jamais scan
lignée entière imposé. Ce refus technique ne transforme pas not-established
en established et ne rend pas un Snapshot invalide du fait d'ancêtres absents.
Un futur import complétant des liens exige validation contextuelle unknown,
non cette voie d'édition. Contradictions connues dans témoins toujours refusées.

Partage sûr : entrées unknown copiées/gelées avant indexation ; nouvelles B
acquises séparément ; aucun nœud H ni payload partagé mutable. Toute mutation
d'entrée/structure B après extension n'altère ni H0 ni H1. Retrait selected,
split/merge/delete/empty ne supprime aucune archive, même orpheline de Snapshot.
Résolution exacte accessible sur chaque racine publiée et anciens snapshots.

### 5.4 Commit propriétaire et réentrance

`read()` retourne une vue capturée ; l'écrivain lié seul détient
`commit(expectedGeneration, expectedRevision, preparedCandidate)` → Committed /
Stale / RefusedBeforePublication. Le candidat est interne et lié au dossier,
à base/receipts et aux données **finales** certifiées. Assembly ne reçoit ni
écrivain ni capacité. Aucun endpoint public prenant un certificat forgé ; ports
qualifiés à la composition, pas sécurité magique contre du JS malveillant.

Pipeline : garde → capture/stale → réponses → décision NoOp → réservations
Versions → factories B → append séparé → M1/S1 résolu depuis archive candidate
→ certification complète réelle → index1 dérivé → préparation résultat Applied,
terminaison dossier et changement ledger → dernier contrôle token → swap.
Les préparations techniques après certification ne changent aucune donnée
métier certifiée ; tuple compare exactement M1/S1/index1/archive candidate.

Le propriétaire prépare **avant** fenêtre finale la prochaine racine englobant
published1 et ledger1 (statuts published), le résultat immuable et les références
de terminaison. Point de linéarisation = une assignation interne `root=nextRoot`
après comparaison génération/révision et contrôle writer/receipts. Pas de copie,
factory, getter caller, allocation, I/O, await ou callback externe entre dernière
comparaison et swap. Aucune notification dans commit. Après swap : retour du
résultat déjà construit et suppression interne non faillible du handle ; pas
appel `burn` externe/map d'un gros ledger susceptible de lever. L'inspection
ledger infère published de cette même racine, jamais un statut en retard sur H.

Avant swap, toute exception/stale/refus garde published0 **identique par
référence et valeur**, B absent de H publié ; réservations peuvent brûler.
Après swap, résultat Applied, jamais catch général reconvertissant en
InternalTransitionFailure. Échec de notification séparée après retour Applied
ne requalifie rien. Pas de promesse de récupération universelle OOM/runtime.
NoOp conserve tuple/révision et n'alloue aucune VersionId.

Garde unique propriétaire/session posée avant toute lecture/analyse/allocation,
y compris reservePreparation. Elle couvre prepare/execute/abandon/remplacement
et toute fonction de mutation de la façade liée ; finally libère sur refus.
Entrée réentrante refuse avant effet, y compris depuis allocateur avant réponse.
Le guard ne couvre pas l'attente humaine entre prepares. Lire la vue immutable
reste autorisé : callbacks avant commit voient published0. Cellule commit a
son contrôle non réentrant/writer avant swap, aucun callback par construction
pendant fenêtre. Tests de tentatives passent via entrées réellement atteignables,
pas par ajout d'un hook de production dans swap. Remplacement externe utilise
même garde et acquisition ; une tentative réentrante est refusée.

Stale global compare owner/génération/révision **avant acquisition des réponses**
et au commit ; Applied rend stale tous dossiers précédents même disjoints.
Dossiers anciens peuvent être terminés paresseusement au prochain execute
(Stale prioritaire) ; leurs réservations ne sont jamais réallouables et leur
inspection indique burn après invalidation. Handle copié/étranger/terminé
Rejected, ABA même M/révision textuelle Stale. Aucun merge/rebase implicite.
`exclusive(callback)` et `publish(view)` sont supprimés des ports/cellule et
compositions R1.3 à la bascule : aucune compatibilité les conservant comme write.

## 6. Jalons internes A.1–A.4

Les tests référencés T01–T24 sont détaillés au §9. Tous sont futurs ; aucun
jalon technique n'est commencé. Fichiers nouveaux sont prévus, noms audités
avant GO ; source/test/canon historique ne sont pas modifiés par ce plan.

### A.1 — Acquisition et capacité fiable

- **Objectif :** cas d'usage unique unknown→Current intégralement certifié→liaison
  privée propriétaire et tokens ; installations/remplacements cohérents.
- **Fichiers :** acquireCurrent.ts nouveau ; loadPortfolioGraph.ts (collecte
  factorisée sans shortcut), currentRamPort.ts, currentAuthorityPort.ts nouveau,
  currentRamAdapter.ts ; tests acquireCurrent.test.ts et qualification adapter.
  validatedPortfolioGraph.ts/graphResolver.ts/graphValidation.ts conservés.
- **Contrats :** capture cohérente ; génération privée ; capability originale
  non sérialisable ; writer unique, mêmes garde/token pour futurs commit et
  réservations. Installation inconnue seulement après vraie certification.
- **Dépendances :** P0 et APIs R1.2 ; aucun append ni transition ciblée requis.
- **Tests +/− :** T01–T04, T20, T24 ; valid Current/invalid wrappers, refs,
  faux certificat, capture changeante, remplacement valide/invalide, ABA.
- **Acceptation :** certification intégrale observée sur unknown ; aucun
  certificat fourni ne peut installer ; remplacement échoué garde ancienne vue,
  réussi invalide token ; Snapshot reste indépendant.
- **Passage :** audit interne des frontières et tests de capacité passes ;
  définition scope/transfert concordante avant A.2.
- **Anciens mécanismes à supprimer à A.4 :** symbole d'admission comme seule
  garde runtime, comparaison profonde d'admission/store au service, installation
  par PublishedCurrent arbitraire. Pas d'adapter transitoire de confiance.

### A.2 — Autorité d'unicité et append incrémental

- **Objectif :** absence historique attestée indépendante de payloads, ledger
  propriétaire, extension B sans reconstruction H+B ni perte de branches.
- **Fichiers :** versionAppend.ts/persistentVersionArchive.ts nouveaux ;
  versionRegistry.ts/versionEnvelope.ts pour réutilisation bornée de contrôles,
  transitionAllocationPort.ts/currentAuthorityPort.ts/currentRamAdapter.ts ;
  tests append/authority/persistance dédiés. Préparer protocole faits historiques
  de transition.ts, sans basculer session active.
- **Contrats :** scope/classes/namespaces, Existing/AbsentAttested/Unavailable,
  receipts monotones ; répertoire exact capturé ; append purement validant ;
  index de liens non résolus ; aucune Map H partagée mutable.
- **Dépendances :** A.1 capacité/garde ; règles R1.1 et P0 §5 ; index d'identités
  attesté source native/transfert, pas déduction depuis S.
- **Tests +/− :** T05–T13, T21–T22 ; lectures exactes, collisions cachées,
  partiel, concurrence pending, erreurs/allocation, owner/filiation/branches.
- **Acceptation :** créations non prouvées refusées ; VersionId neuve toujours
  garantie ; aucun cache miss→fresh ; H0 résout toutes refs après append/échec ;
  compteurs de visite/copie prouvent aucun parcours H par édition normale.
- **Passage :** tests persistance et filiation incomplets passent, modèle ledger
  prêt à passer pending→published au même swap que archives pour A.3.
- **Suppression à bascule :** ledger/sets d'autorité copiés en session,
  withVersions(H+B) et tables exactes H par édition ; pas suppression de la
  factory unknown R1.2 ou de ses tests.

### A.3 — Publication atomique et réentrance

- **Objectif :** cellule finale et unique commit conditionnel sans callback,
  visibilité complète archives/index/selection/graph/ledger ; garde dès allocation.
- **Fichiers :** currentRamPort.ts/currentRamAdapter.ts, currentAuthorityPort.ts,
  currentDependencyIndex.ts nouveau ; tests cellule/commit/gardes et
  scripts/v2/r13.test.mjs (préparer assertions de bascule).
- **Contrats :** tuple §3.2, expected owner/generation/revision, result préconstruit,
  root swap unique ; pas d'erreur retournée après swap ; garde commune.
- **Dépendances :** A.1/A.2 ; candidat déjà entièrement certifié, extensions
  et statuts techniques prêts avant fenêtre irréversible.
- **Tests +/− :** T03–T04, T08–T10, T14–T17, T24 ; exceptions avant swap,
  read coherent, stale final, tentatives réentrantes/allocation et writer concurrent.
- **Acceptation :** source/JS commit sans callback/await/allocation dans fenêtre,
  trace uniquement old/new tuple ; ledger published concorde ; écriture directe
  impossible sur API finale ; aucun faux InternalTransitionFailure après swap.
- **Passage :** capacités de commit qualifiées indépendamment, résultat/stale
  conforme R1.3 ; bascule intégrée A.4 seulement avec certification complète.
- **Suppression à A.4 :** exclusive/publish, compteur de révision de session
  concurrent de propriétaire, callbacks de terminaison après publication.

### A.4 — Intégration des commandes et qualification du socle

- **Objectif :** bascule unique de toutes commandes existantes sur socle final,
  conservation contrats R1.3 et certification complète de chaque candidat.
- **Fichiers :** session.ts/transition.ts, candidateAssemblyPort.ts si types
  changent, r13.test.ts/transition.test.ts/r13.fixture.ts ; tests R1.2/R1.1
  uniquement adaptations indispensables d'API avec mêmes garanties ; audits
  scripts/v2/r12.test.mjs/r13.test.mjs ; harness nouveau
  `scripts/benchmarks/rewrite-lot-a/` et preuves nouvelles
  `docs/steps/PORTFOLIO_VERSIONED/proofs/rewrite-lot-a/` après GO technique.
- **Contrats :** dossiers liés capacité/base/réponses/receipts, lectures exactes
  orchestrées, B1/B3, Applied/NoOp/Rejected/Stale et diagnostics conservés ;
  port assembly unknown toujours avant oracle entier.
- **Dépendances :** A.1–A.3 qualifiés ; toutes familles R1.3 et fixtures.
- **Tests +/− :** T01–T24 intégrés et suites G12/G13 ; T18–T20 sur obligations,
  diagnostics, NoOp, archives/Snapshots et séquences ; mesures §10.
- **Acceptation :** aucun appel normal d'édition à H entier/withVersions/
  publish/exclusive, pas de deuxième ledger/store ; réelle certification finale
  sur chaque Applied ; pas de validation ciblée ; toutes gates fonctionnelles,
  architecturales et mesures du socle documentées.
- **Passage :** dossier unique de clôture lot A pour audit indépendant, puis
  décision utilisateur ; **aucun commencement automatique du lot B ou C**.
- **Suppression :** toutes anciennes voies identifiées A.1–A.3, wrappers
  temporaires et instruments de migration ; seuls imports inconnus R1.2 restent.

## 7. Traçabilité aux clauses P0

| Clauses P0 / invariants | Réalisation prévue A | Preuves |
| --- | --- | --- |
| G01–G03 ; C01/C02 | Factories locales conservées, immutabilité/append contextualisé | T01/T11–T13/T21 |
| G04–G11 ; C04–C15 | Règles locales/inter-entités et toutes commandes conservées ; oracle complet | T18/T19, suites G12/G13 |
| G12/G13/G15 ; C03/C16 | Manifeste fermé, résolution exacte, Snapshot autonome, tombstones | T01/T05/T20 |
| G14/G17 ; C02-MAP/C04–C06/C09/C11/C12 ; N02 | Authority de scope indépendante et refus partiel | T06–T10/T12 |
| G16/T04 ; E0/C16 | Unknown intégral ; capacité privée en plus, aucun nouveau constructeur graph | T01–T04 ; T04 succession ciblée différée B |
| T01/T02 | Suppression admission H universelle et passage H entier ; demandes exactes | T05–T07/T18/T22 |
| T03/G18 ; C02 ; addendum §5.5 | Append B contrôlé et persistant, import unknown maintenu | T11–T13/T21/T22 |
| T05/G19 ; addendum §4 | **T05 différée B**, candidat intégralement certifié dans A | T14/T19 et audit AST réel |
| G20 ; B1/B3 R1.3 | Bases choisies exactement, new VersionId restore même payload | T05/T11/T18 |
| G21/T06/G22/N03 ; addendum §6 | Unique cellule, token, root swap et garde allocations | T03/T04/T08–T10/T14–T17 |
| G23 ; frontières §1–3 | Domain pur, ports sans orchestration, adapter sans certification | T24, audits hexagonaux/canaris |
| N01 ; E1–E8/R01–R12 | Base fiable et index selected stables ; aucun moteur U/A implémenté | T17/T24 ; preuves de fermeture différées B |
| N04 | Aucun repli silencieux ni création sans I ; complet conservé dans A | T07/T19 ; aucune exception de repli autorisée |
| H01/H02 | Canons/statuts/preuves historiques inchangés, qualification par mesures | Vérification Git documentaire ; §10/§11 |

Toutes familles C01–C16 restent couvertes par l'oracle entier, pas par un
sous-ensemble d'index. E0/E1 servent acquisition et concordance selected ;
E2–E8 ne sont pas revendiquées comme preuves incrémentales en A.

## 8. Risques et contre-exemples à auditer

| Risque / contre-exemple | Réponse de conception et limite |
| --- | --- |
| Archive absente du cache mais couple TA déjà historique | Authority Existing bloque fresh ; base exacte indisponible refuse, jamais zéro ou seconde identité. |
| Source omet passé dans H et authority ensemble | Indétectable par validation interne ; scope attesté par composition, source non attestée ⇒ aucune preuve d'absence. |
| H a v1→v2 absent ; append v2→v1 | Index des liens non résolus rejette l'append d'édition ; test contradictoire T13. Nouveauté d'ID seule insuffisante. |
| Même owner mais autre identité ou autre kind avec VersionId réemployée | Mapping Domain + authority émission namespace ; scopes exacts, collisions avant append. |
| Object.freeze(Map) puis mutation via alias | Arbres purement persistants/nœuds gelés ; pas de Map exposée ; mutation des entrées et anciennes vues T21. |
| Certificat R1.2 casté/copied et raccordement owner étranger | Acquisition inconnue obligatoire et capacité originale privée ; second writer/port non qualifié refusé. |
| Applied puis remplacement A→B→A avec ancienne révision texte | Génération privée neuve + revision privée, stale avant réponses et au commit. |
| Allocateur entre prepare avant inscription couple | Garde posée avant premier appel, clé réservée par authority avant retour, aucun prepare réentrant ne lit/planifie. |
| Port mutates-then-throws ou callback de burn après swap | Ancien port supprimé ; root swap interne, résultat/ledger préparés, pas de callback ni traitement faillible après swap. |
| Candidate assembly omet PTEC hors objet modifié | Oracle réel entier refuse CandidateCertificationFailure avec diagnostic, même si append valide. |
| Refus non métier transformé en contrainte métier nouvelle | Unavailable séparé d'Absent, refus technique de capacité ; diagnostics/stages qualifiés, règles R1.2 inchangées. |
| Arbre persistant retient trop d'anciennes racines/dossiers | Handles terminés retirés, anciennes vues immuables conservées seulement par références réelles ; mesurer mémoire sur séquences. Aucune GC d'archives métier. |
| Certification et analyse Actuals dominent encore | Coûts S assumés/mesurés, aucune acceptabilité interactive globale annoncée par A. |

Cas métier autorisés explicitement conservés (tests T18/T19) : AP couvert zéro
association, AP empty et ETC positif/null, Capacity vide/gaps/hors horizon,
RT zéro, Team hidden chargée, tombstones avec Capacity/catalogues résolubles,
Actuals au-delà horizon/Forecast, pas objective≥earliest inventé, provenance
split/merge facultative, suppression malgré historique positif, dates Snapshot
égales ou reculant si leur borne propre est satisfaite.

## 9. Plan détaillé de tests et preuve réelle

Chaque test capture avant/après tuple et ledger séparément. Un assert de résultat
seul ne suffit pas : vérifier effet publié, compteurs d'allocation/lecture,
exactitude des refs/payloads et absence d'effet interdit. Fixtures négatives
construites à la main en complément du différentiel. Tests nouveaux dans modules
Domain/Application et adapter qualifié, même runner V2 ; aucune suite affaiblie.

| ID / jalon | Scénario et manière d'établir la propriété |
| --- | --- |
| T01 / A.1 | Unknown invalide : wrapper/ref/owner/payload/getter, manque/extras, grille/PTEC incohérents. Espion lecteurs compte refs exactes, getter jamais appelé, diagnostic code/path attendu, zéro install/token/session fiable. Positif couvrant les 14 kinds passe vrai oracle. |
| T02 / A.1 | Admission valide : examiner index construit depuis toutes refs du manifeste, certification réelle ; cast graph, spread capacité, symbole recopié, sérialisation et certificat Snapshot échouent à obtenir writer/capacité. Tests compile complètent runtime, ne le remplacent pas. |
| T03 / A.1/A.3 | Remplacement externe valide entre prepare/execute : génération change, ancien handle Stale avant réponses getter invalides (getter compteur zéro). Remplacement invalide : même ancienne racine et token, aucune révocation prématurée. |
| T04 / A.1/A.3 | ABA A→B→A avec même M et révision textuelle : ancienne capacité ne commit jamais ; autre propriétaire réutilisant texte idem. Token nouveau contrôlé par identité privée et writer ancien révoqué, pas seulement chaîne différente. |
| T05 / A.2/A.4 | Exact non selected : deux branches même identité, base explicitement choisie ; reader ne reçoit que refs demandées, predecessor de B égal branche choisie, payload conforme B1. Base manque/wrong/extra/incompatible refuse ; seule branche disponible sans choix refuse. |
| T06 / A.2 | Couple/EntityId/VersionId dans archive volontairement non chargée au reader mais inscrit authority : collision refusée sans lecture/certification H, aucun fresh de secours. Témoin correct complet permet allocation d'une autre clé. |
| T07 / A.2/A.4 | Authority Entity/couple partielle et Version exhaustive : édition existante avec owner/base attestés acceptée et oracle entier ; création et restore cellule inconnue refusées avant reserveEntity. Version authority indisponible ⇒ édition effective refusée. Même S valide ne change pas ce verdict. |
| T08 / A.2/A.3 | Deux prepares séquentiels même clé fresh : premier pending, second refusé sans deuxième émission ; clés disjointes pending permises. Deux services sur cellule/scope refusés avant allocation ; appels réentrants qualifient concurrence RAM, pas threads/durable. |
| T09 / A.2/A.3 | reservePreparation puis reserveEntity réentrants **avant retour de sortie** : tentative prepare/execute/abandon/remplacement, compteurs prouvent aucune lecture/analyse/réservation imbriquée. Refus réentrant et ledger une seule réservation. Ajouter reserveVersion réentrant et exception à chaque rang, guard libéré ensuite. |
| T10 / A.2/A.4 | Abandon/stale/exception/collision après réservations partielles : H/Current intacts, IDs/couples burned non réemployés, pas retry. Rejected answers conserve pending pour retry valide. Transfert garde published/pending/burned (pending quittés burned), ancien writer/handles inutilisables, namespace ne repart pas à zéro. |
| T11 / A.2 | Append H ramifié, insertion B ordre varié : toutes refs H se résolvent exactement et mêmes données, branches conservées, aucune sélection implicite. Import répétition exacte reste admis R1.1 ; édition VersionId répétée refuse même payload. |
| T12 / A.2 | Owner changé, deuxième mapping Settings/AP/Capacity/PT/TA/PTEC/global, predecessor foreign/self, provenance self/duplicate : diagnostics Domain attendus et extension absente. Positifs plusieurs SP même AP et versions multiples même identité passent. |
| T13 / A.2 | Cycle fourni B ; contre-exemple H v1→v2 manquant puis B v2→v1, et témoin incomplet : refus avant extension. Parent ancien manquant non lié à B conserve not-established ; base explicitement requise manque ⇒ refus, sans exiger toute lignée pour Snapshot. |
| T14 / A.3/A.4 | Injecter exception allocation/factory/assembly/index/préparation résultat juste avant fenêtre : published même objet, ancienne résolution exacte pour toutes refs, B non visible ; ledger brûlé. Fault assembly ptecs=[] passe vraie certification et conserve CandidateCertificationFailure/PTEC_SELECTION_MISMATCH, jamais internal allocation error. |
| T15 / A.3 | Absence publication partielle : observations capturées dans chaque callback précommit, puis read après retour ; chaque observation est entièrement old ou new, chaque selected ref résout, index/graph/token concordent ; ledger published et archives apparaissent ensemble. Revue source/JS identifie unique assignation interne. |
| T16 / A.3 | Réentrance commit : tentative depuis dernière composition précommit rejetée par garde ; entrée writer concurrent/stale refusée avant swap. Audit AST/runtime exports démontre absence callbacks externes/getters/await dans fenêtre et absence publish/exclusive ; canari d'ancien port arbitraire non qualifié refusé. Aucun hook externe ajouté au swap pour faire artificiellement le test. |
| T17 / A.3 | Capturer read0, publier, capturer read1 ; chacune résout ses refs et index complet de son manifeste, read0 intact. Modifier token attendu à contrôle final via seam de laboratoire avant entrée commit : Stale sans swap. Aucun mélange de propriétés lues séparément. |
| T18 / A.4 | Rejouer toutes commandes et séquences delete/restore/correct/partition/catalogue : même obligations ordonnées, contextes/confirmations, answers binding et revue ETC, B par kind, refs conservées et bases B1/B3. Anciens/new IDs comparés par bijection de sorties allocateur contrôlées, pas par suppression arbitraire des refs. |
| T19 / A.4 | Diagnostics : candidats négatifs indépendants et comparaison résultats complets code/path/stage/ordre avec baseline isolée ; stale avant invalid answers, erreurs certif distinctes de matérialisation. NoOp prepare/keep : zéro VersionId, certification candidat et swap, révision inchangée, dossier terminé. |
| T20 / A.1/A.4 | Snapshot avant édition puis correction/delete/restore : reader Snapshot+versions sans Current résout même refs/payloads, oracle Snapshot identique ; archives orphelines aussi accessibles. Aucun Snapshot/manifeste ancien auto-créé, retrait selected ne supprime rien. |
| T21 / A.2 | Muter input unknown, payload B, refs/owners/provenance, ancienne/nouvelle racine et nœuds : rejet mutation ou copie détachée, résolution H0/H1 inchangée ; DAG input détaché. Tests équilibrage/order adversarial de l'arbre, nombreuses éditions et anciens readers : pas mutation de chemin partagé. |
| T22 / A.2/A.4 | Compteurs en laboratoire sur H variable à S/B fixes : enveloppes H visitées/copiées par append = zéro, nœuds nouveaux bornés par chemins ; pas de materialize H ou factory registre H+B. Lookup ne reconstruit table H. Counters + revue source étayent propriété structurelle, timings seuls insuffisants. |
| T23 / A.4 | Séquences générées reproductibles et contre-exemples manuels : après chaque Applied vraie certification entière dans labo, toutes anciennes refs conservées ; après refus publiée identique. Ledger monotone, stale global sur cibles disjointes. Trace allocation/commit/lecture vérifiée contre modèle simple indépendant, pas juste comparaison deux validateurs partageant règles. |
| T24 / tous | Audit dépendances runtime/types/transitives avec canaris Domain→Application/adapter/UI/clock/legacy, Application→adapter, ports→session/acquire. Canaris de deuxième publisher/constructor graph privilégié, guard absent avant allocation. Quatre gates V2 et AST certif réelle avant commit maintenus ; ne pas affaiblir audit pour faire passer un nouveau module. |

Qualification finale future : `npm run check:boundaries:v2`,
`npm run typecheck:v2`, `npm run test:v2`, `npm run build:v2`, ciblés R1.1/R1.2/
R1.3 et nouveaux tests du socle. Suites historiques/preuves préservées ; résultats
nouveaux, skips/timeouts et limites explicitement documentés. Aucun de ces
commandes n'est exécuté dans cette livraison PLAN ONLY.

## 10. Stratégie de mesure

H désigne **tout** historique publié (S inclus) ; rapporter aussi H−S / « H
ajouté » du protocole historique. S = selected, B = nouvelles versions, D =
dépendances métier réellement touchées et cardinalités AP/SP/associations/TA/
PTEC ; distinguer D des éléments S parcourus par validation complète.

| Phase | Coût actuel prouvé / mesure historique | Mesure comparable future du lot A |
| --- | --- | --- |
| Acquisition/setup | Copie source H, registre H/inventaire/ledger, certification S, comparaison profonde des vues de session | Séparer capture/admission S, import initial archive H, authority/transfert I/ledger, construction index S, liaison privée. Pas de prétention coût admission indépendant H quand import H inconnu nécessaire. |
| Prepare/réponses E1–E3 | Scans S/H et businessEqual copies ; allocations Entity/Preparation ; stale/answers | Analyse S, requêtes authority, lecture bases exactes (nombre et octets), réponses, réservations ; aucun H entier envoyé. Scans S Actuals résiduels mesurés. |
| Matérialisation E4 | Versions neuves/factories B ; binding | Allocation Versions et L(B), receipts, binding slots séparés ; coûts par B/kind. |
| Append / ancien E5-registry | withVersions copie/revalide H+B et contexte lignées | Contrôle B/témoins/links et extension chemins ; compteur zéro copie/visite enveloppe H par édition normale, nœuds/bytes alloués et coût O(B log H) vérifié. |
| Candidat / E5-manifest/extraction | desired S, assembly, wrapper, batch construit table H puis extraction | M1/S1 depuis racine archive candidate, résolution exacte par arbre, index selected S ; latence, allocations et nombre refs résolues. Ne pas cacher construction index dans admission. |
| Certification E6 | Oracle R1.2 complet sur S, registre/copies compris | Même oracle réel final, coût isolé S ; aucune accélération ciblée déclarée, pas d'optimisation prématurée. |
| Publication E7 | Vue/publish puis ledger terminaison | Préparation root/ledger/résultat séparée du compare/swap ; retour Applied ; pas de mesures/profiler callbacks dans fenêtre production. |

Reprendre profils exactement : Small dense 10 Projects/5 Teams/12 SP, Medium
dense et sparse 100/20/24, seed 1202 ; S historiques 894/55404/8604 vérifiés
par manifeste/payloads contrôlés. Scénarios EDIT-local B=1, EDIT-actuals B=1
avec keep ETC, frontière B=7/22/4 ; ne pas remplacer une commande effective par
NoOp. H ajouté Small 0/10/100/1000, Medium 0/1000 ; témoins chaîne profondeur
1000 et 1000 branches sœurs sur Small à mêmes H/S/B. Varier séparément S, B et
D dans campagnes supplémentaires identifiées comme nouvelles, dont édition
répétée pour détecter lookup dégradant avec nombre de commits et rétention.

Baseline contemporaine isolée au SHA initial et version lot A, environnement
Node/TS/OS/CPU/RAM hashes fixtures/source compilée, même seed/limites ressources.
Processus séquentiels isolés, cold/warmup puis trois essais mesurés minimum
comme PERF-EDIT ; ordre alterné baseline/cible et contrôle inversé pour dérive.
Résultats officiels sans instrumentation, phases/CPU/allocation en campagnes
séparées ; médianes/min/max/SD/MAD, bruts, timeouts/non exécutés préservés.
Setup/admission/harnessAnswers/attente humaine exclus EDIT mais rapportés à part.
Pas de moteur/UI/durable ; aucune qualification PERF-TRENDS ou LOAD globale.

Mémoire : heap/RSS endpoints, maxRSS lifetime avec setup, heap retenue avec
résultat/racines anciennes et après libération dossiers, allocations échantillonnées
et nœuds copiés ; endpoint ≠ pic exclusif. CPU inclusifs non additionnés aux
self, médianes des phases non sommées comme total. Profiler sans horloge Domain.
Sorties dans proofs/rewrite-lot-a, aucune preuve r13/perf écrasée ; nouveau
harness utilise baseline compatible et cible sans modifier outils historiques.

Succès structurel à vérifier : pas de reconstruction/copie H par édition, coût
append/résolution stable logarithmique visé ; les latences doivent étayer ces
constats et publier toute régression. Aucun gain non mesuré, SLA ou verdict
PERF-EDIT favorable présumé. La certification complète peut encore dominer
Medium ; clôture du **socle A** ne vaut ni clôture R1.3 ni qualification P7.

## 11. Critères de GO et de clôture

### GO unique d'implémentation du lot A

Audit indépendant du plan favorable, arbitrages bloquants §12 explicitement
résolus/acceptés, puis **GO utilisateur explicite lot A (A.1–A.4)**. Préflight
technique origin/HEAD/branche/arbre relu, changements normatifs depuis ce plan
analysés ; aucune modification locale écrasée. La livraison de ce document,
sa vérification ou son push ne vaut pas GO technique.

### Clôture unique future du lot A

Toutes gates A.1–A.4 et T01–T24 satisfaites avec preuves nouvelles, suites
existantes non affaiblies, réelle certification complète de chaque candidat,
unknown/Snapshot inchangés, authority partielle/collisions/burn/transfert
qualifiés ; tuple atomique et garde prouvés, API ancienne de publication absente.
Revue source/JS des dépendances et fenêtre de swap, mesures H/S/B/D complètes
avec limites/régressions, inventaire APIs et suppression temporaires, diff-check,
commit/push normal et sync Git. Audit indépendant du code/tests/mesures puis
clôture explicitement autorisée ; pas d'auto-déclaration DONE, pas de démarrage B/C.
Plusieurs commits techniques possibles sous ce même GO ; pas de clôture partielle
présentée comme trois socles finaux.

### Livraison documentaire présente

Vérifier liens et chemins existants (fichiers nouveaux explicitement marqués
prévus), IDs clauses/tests/jalons, sections 1–12, cohérence certification
complète/hors B et absence de statut technique changé ; relire diff et exécuter
`git diff --check`. Uniquement ce fichier ajouté. Aucun code/test/canon historique
ni proof/trackers modifié. Commit documentaire normal puis push sur
rewrite/portfolio-versioned sans force ; communiquer SHA initial/final,
fichier modifié et résultats Git, vérifier arbre propre et divergence 0/0.
Cette revue interne n'est pas l'audit indépendant attendu.

## 12. Points ouverts nécessitant arbitrage architectural

Les recommandations ci-dessous rendent le plan exécutable après audit ; aucun
arbitrage ne doit être improvisé pendant implémentation pour contourner une
preuve manquante.

| Point / recommandation | Décision attendue avant GO ou limite |
| --- | --- |
| O-A01 — rupture APIs expérimentales | Valider remplacement direct des ports/admission/PublishedCurrent.registry et analyse H ; inventaire ne trouve que tests/harness. Pas de shim publish. Bloquant pour bascule si consommateur extérieur révélé. |
| O-A02 — représentation archive | Valider arbre exact persistant spécialisé avec partage de chemins, sans Map mutable exposée ; qualification balancing/coût T21/T22. Alternative segments seulement avec index exact et preuve coût non linéaire en nombre d'éditions ; pas décision opportuniste laissant deux représentations durables. |
| O-A03 — portée/transfert natif | Valider scope RAM attesté, authority unique, transfert complet ledger et révocation ancien writer ; pending non transférables deviennent burned. Sans attestation exhaustive classes concernées indisponibles, création refusée. Aucun contrat durable inter-processus. |
| O-A04 — filiation inconnue | Valider index compact liens/cibles non résolues et refus d'append A qui les complète sans témoins suffisants (§5.3), avec diagnostic/stage technique explicite préservant règles métier/context report. Bloquant si refus différent doit être exposé dans unions publiques. |
| O-A05 — erreurs capacité/availability | Conserver unions/stages R1.3 et diagnostics Domain ; préciser codes nouveaux de port pour Unavailable/scope/receipt dans plan approuvé avant code, priorité après validation commande et avant allocation. Ne pas masquer erreur certif comme indisponibilité. |
| O-A06 — coût index selected et réception performance | Valider reconstruction index S à chaque candidat certifié dans A et son coût visible, sans optimisation de fermeture ; A peut être conforme avec PERF-EDIT global encore non favorable, résultat à soumettre explicitement à l'audit et clôture. Aucun verdict de P7 implicite. |
| O-A07 — synchronisme RAM | Valider lecteur historique sync capturé pour conserver API session synchrone ; load lecteurs async conservés. Toute source async future exige façade stale après attente, hors implémentation A ; pas conversion Promise bloquante. |

Les arbitrages métier ratio RT/exception, defaults opérationnels/bootstrap,
simulation, durabilité/CAS multi-onglets, recovery et UI ne sont pas requis
pour ce socle et restent à leurs lots. Aucun point ouvert ne justifie de
commencer B, C, R1.4 ou R2.

**STOP après livraison du plan. Attendre audit indépendant ChatGPT et GO
explicite lot A avant toute implémentation.**
