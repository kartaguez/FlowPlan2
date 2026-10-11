# FlowPlan2 V2 — R1.2-PERF-P3 : copies et validations répétées

2026-10-11 — **PLAN ONLY / PROPOSÉ POUR AUDIT ; GO P3 NON ACCORDÉ**.
Baseline P2 auditée obligatoire : `d2ebb7142c563a43b620cd78fea63f2847d76c02`.
**R1.2 IN REVIEW ; R1.3/R1.4/R2 NOT STARTED ; performance globale C.**
P0, P1 et P2 techniquement acceptés selon la mission utilisateur. Les demandes
d'audit dans leurs livraisons décrivent leur chronologie historique ; aucun
résultat supplémentaire n'est attribué à cet audit. Cette session ne livre que
ce plan et les deux points d'entrée courants. Aucune instrumentation, suite,
compilation ou campagne exécutée ; aucune optimisation/refactorisation autorisée.
Arrêt après commit/push documentaire. Audit indépendant puis **nouveau GO
explicite** obligatoires avant toute implémentation P3.

## 1. Préflight et sources de vérité

Avant rédaction : branche `rewrite/portfolio-versioned`, HEAD initial exact
`d2ebb7142c563a43b620cd78fea63f2847d76c02`, arbre propre. `git fetch origin`
a réussi après autorisation de l'écriture Git hors sandbox ; origin reste au
même SHA, divergence **0/0**. Baseline présente comme commit, aucun commit
intercalaire ni modification concurrente inexpliquée. Origin :
`https://github.com/kartaguez/FlowPlan2.git`. Aucun AGENTS.md applicable trouvé
dans le dépôt, les chemins documentaires ou ses parents. Ne jamais écraser un
travail concurrent ; réexaminer toute évolution distante avant push normal.
SHA final documentaire communiqué après push, sans auto-référence circulaire.

Documents consultés : [current_plan](../../current_plan.md),
[current_canon](../../current_canon.md), [canon R1.1](./rewrite_r11_canon.md),
[plan R1.2/B1–B4](./rewrite_r12_plan.md), [canon R1.2](./rewrite_r12_canon.md),
[PERF](./rewrite_r12_perf.md), [PERF-FIX/P0](./rewrite_r12_perf_fix_plan.md),
[plan P1](./rewrite_r12_perf_p1_plan.md), [plan P2](./rewrite_r12_perf_p2_plan.md),
[décisions A-R12-01–09](./rewrite_decisions.md). Les archives conservent leurs
statuts historiques ; la mission et les sections actives fixent l'état actuel.

Les quatre dossiers `proofs/r12-perf*` sont sous
`docs/steps/PORTFOLIO_VERSIONED/`, pas à la racine. Inventaires/protocoles,
rapports, métadonnées et résultats consultés : [PERF](./proofs/r12-perf/),
[P0](./proofs/r12-perf-fix/README.md), [P1](./proofs/r12-perf-p1/report.md),
[P2](./proofs/r12-perf-p2/report.md), [oracle P2](./proofs/r12-perf-p2/README.md),
[comparaison](./proofs/r12-perf-p2/comparison.json),
[profils analysés](./proofs/r12-perf-p2/profiles-summary.json).
Preuves historiques immuables ; les comptes ci-dessous sont une lecture du code,
jamais de nouvelles mesures.

## 2. Diagnostic mesuré et limites

Médianes contemporaines P2 arrondies, secondes, opérations complètes :

| Opération | Moyen sparse | Moyen dense |
| --- | ---: | ---: |
| M1 — `createVersionRegistry` | 0,538 | 3,288 |
| M2 — `resolvePortfolioManifest` | 0,604 | 3,871 |
| M3 — `validatePortfolioGraph` | 0,749 | 4,438 |
| M4 — `certifyPortfolioGraph`, source Snapshot | 0,802 | 4,708 |
| M5 — `loadSnapshotGraph` | 1,418 | 8,728 |
| M6 — `loadCurrentGraph` | 1,380 | 8,594 |

M5 dense : registre **77,31 % inclusifs**, ImmutableValue **42,45 % inclusifs**,
`validateResolved` **5,83 % inclusifs** ; RSS maximal lifetime **789,9 Mio**.
Les inclusifs se recouvrent : ni addition, ni conversion en durées exclusives,
ni pourcentage de gain garanti. M1–M6 ne sont pas des phases indépendantes.
M5−M4 ou M3−M2 ne mesure pas une sous-phase. RSS inclut fixture/setup, V8 et
processus entier ; heap endpoints ne capturent pas tous les pics. Le coût
résiduel principal visible est le registre et ses copies/validations, sans
preuve qu'un contrôle métier particulier soit dispensable. **C maintenue**.

## 3. Pipeline réel : ownership, validation et confiance

Sources sous `src-v2/` : `domain/versioning/{immutableValue,versionEnvelope,
versionRegistry}.ts`, `domain/portfolio/{payloadValidation,manifest,graphResolver,
graphValidation,validatedPortfolioGraph}.ts`,
`application/portfolio/loadPortfolioGraph.ts`,
`adapters/memory/memoryPortfolioReadAdapter.ts`. Lectures complémentaires :
`primitives/data.ts`, `versioning/owner.ts`, `application/ports/portfolioReadPort.ts`
et `scripts/benchmarks/r12-perf/worker.mjs` ; garde existant examiné.

### 3.1 Setup mémoire : distinct du chargement

`createMemoryPortfolioReadAdapter(versions,current,snapshots)` reçoit trois
**unknown**. Ordre : registre complet des versions ; CurrentSelection sauf
current null ; copie profonde de la liste Snapshots ; chaque factory Snapshot,
puis doublon SnapshotId. Un défaut de versions précède donc un défaut Current,
qui précède un défaut de liste/Snapshot. Aucun graphe métier n'est certifié.

Le registre fournit des enveloppes métier détachées/gelées conservées par la
closure `readExactVersions`. La closure Current conserve la sélection copiée ;
la closure Snapshots conserve la liste privée des Snapshots recréés (la liste
privée elle-même n'est pas gelée, mais n'est jamais exposée ni modifiée après
construction). Les ports/wrapper sont gelés. Copie initiale de la liste Snapshots
abandonnée après setup ; manifestes des Snapshots sont recopiés par leurs factories.
Propriétaire de ces copies : l'adaptateur, pendant la vie du reader. La validation
au setup protège contre les mutations des entrées de construction ; elle ne
rend pas les réponses d'un port arbitraire fiables pour l'Application.
Setup exclu du temps M5/M6, mais inclus dans la vie mémoire du processus.

### 3.2 Chargements, dans l'ordre réellement exécuté

| Étape | Fonction / entrée | Contrôles et frontière | Copies, références, ownership et garantie |
| --- | --- | --- | --- |
| 1S | `loadSnapshotGraph` → `createSnapshotId(snapshotId: unknown)` | ID avant tout I/O | Nouvel ID gelé, détenu par l'appel ; jamais sélection par date |
| 2S | port `readSnapshot(id)` ; mémoire revalide ID puis `list.find` | Erreur du port propagée ; Snapshot demandé explicitement | Mémoire retourne son Snapshot gelé par référence ; autre port retourne unknown |
| 3S | `createPortfolioSnapshot(response.value)` puis comparaison ID | Frontière port → Application : wrapper fermé, ID/date/manifest/createdAt ; `READ_SNAPSHOT_ID_MISMATCH` après factory | Nouveau wrapper/ID, manifeste profondément copié/gelé ; réponse détachée |
| 1C | port `readCurrentSelection()` → `createCurrentSelection(response.value)` | Erreur port puis wrapper/manifest/revision validés | Nouveau wrapper et manifeste copié ; revision primitive conservée ; nul mémoire = `READ_CURRENT_MISSING` |
| 4 | `collect` → `selectedReferences(manifest)` → port `readExactVersions(refs)` | Un seul lot exact, globals puis 12 tables ; aucune lecture de predecessor/provenance/Current historique | Nouveau tableau de références gelé, refs du manifeste validé conservées ; Application possède la demande |
| 5 | mémoire : `lookupExactBatch(registryDuSetup, refs)` | Chaque ref unknown revalidée ; missing exact, aucun latest | Table locale sur Vstock, nouvelles refs validées temporaires, tableau résultat gelé contenant les versions du setup par référence ; aucune copie profonde des versions à la lecture |
| 6 | `collect` : `createVersionRegistry(response.value)` | Réponse port toujours unknown ; toute la réponse métier/contexte validée avant membership | Registre Domain détaché/gelé et tables temporaires ; Application n'implémente aucune règle métier |
| 7 | `lookupExactBatch(registry, refs)` puis cardinalité distincte | Missing en ordre avant extras ; `READ_REFERENCE_MISMATCH` avec paths/messages de lecture | Table/temporaire et tableau sélectionné abandonnés ; **collect renvoie response brute**, pas le registre ni la sélection dédupliquée |
| 8 | `certifyPortfolioGraph({source,...,versions:response.value})` | Unique autorité ; `dataRecord` du wrapper, source puis clés fermées | Copie superficielle d'inspection du wrapper ; elle ne détache pas encore ses données imbriquées |
| 9S | `validateSnapshotGraph` → `createPortfolioSnapshot(snapshot)` | Nouvelle validation de metadata/manifeste à la frontière publique de certification | Nouveau Snapshot et copie profonde manifeste temporaires |
| 9C/10S | `validatePortfolioGraph` → `resolvePortfolioManifest` | Factory manifeste **avant** factory registre de supplied unknown | Nouvelle copie profonde manifeste ; **deuxième registre du temps de chargement** ; aucun usage du registre collect |
| 11 | resolver : `lookupExactBatch` puis inventaires | Exactes dans l'ordre sélectionné ; missing remappé `manifest.references.i` | Table locale, selectedReferences temporaire, liste de versions partageant celles du nouveau registre ; inventaires dérivés des owners Settings, listes/wrapper gelés ; contexte du registre conservé |
| 12 | `validateResolved(graph)` privé | Structure métier complète, ordre §7 ; aucune entrée publique de graphe trusted | Pas de copie profonde ; dix filtres initiaux, autres filtres/find, partitions, partitionRefs, expectedCells, compteur TA P2 temporaires ; retourne le même graphe |
| 13S | `ofKind(ActualPeriod)` et borne knowledgeDate | Après toute structure, tous AP, inactive/deleted inclus | Tableau filtré temporaire ; aucune metadata Snapshot ajoutée au graphe |
| 14 | `certifyPortfolioGraph` → `success(graph as ValidatedPortfolioGraph)` | Brand TS seulement, après succès de toutes les étapes | Pas de nouvelle copie/gel/marque runtime ici ; le graphe déjà profondément détaché/gelé devient sortie certifiée |

Snapshot ne reçoit aucun lecteur Current ; Current ne vérifie aucune borne
Snapshot. Le résultat ne conserve ni registre collect, ni tables de lookup,
ni index TA, ni Snapshot metadata, ni revision Current. Il conserve manifeste,
versions selected, inventaires et rapport contextuel. Le contexte porte sur
**tout supplied** ; résolution Domain directe permet des versions supplémentaires,
contrairement au contrat de réponse port. Aucun filtrage anticipé autorisé.

### 3.3 Anatomie d'une construction de registre réussie

1. `copyImmutableValue(input,path)` : toute liste copiée/gelée, rejet des valeurs,
   cycles, listes trouées/prototypes/symboles/descripteurs ; inspection complète
   avant schémas. Records d'inspection `dataRecord` superficiels temporaires.
2. Pour chaque occurrence : `createBusinessVersion` inspecte record/ref ;
   `createVersionEnvelope` contrôle clés/ref/owner, copie/gel payload,
   predecessor (même identité/non-self), copie provenance puis refs/self/doublons.
   Enveloppe nouvelle gelée et détachée ; refs/owners/IDs reconstruits.
3. `validateBusinessPayload` **recopie** payload puis valide le schéma fermé
   et les règles du kind. `createBusinessVersion` retourne **l'enveloppe de 2**,
   pas ce payload recopié : copie de contrôle abandonnée. Nécessité du schéma
   indiscutable ; nécessité de cette copie locale à étudier séparément.
4. `validateVersionContext(versions,path)` recopie la liste entière puis recrée
   chaque enveloppe générique, sans schéma métier. Collision séquentielle sur
   enveloppe entière ; phase owners par identité ; phase filiations, visites
   par version distincte, missing exacts. Contexte fini, sans stockage/transitivité
   de provenance ; `not-established` permis et conservé.
5. Registre : mapping owner→identité pour les onze kinds de `uniqueOwners`,
   puis déduplication exacte, premier exemplaire. Program/Pas/SubPeriod ne sont
   pas dans ce mapping inverse. Tables privées jetables, ordre intact.
6. Sortie : tableau distinct gelé des enveloppes métier de 2 et contexte de 4.
   Enveloppes recréées en 4 abandonnées ; seules leurs références présentes dans
   le rapport peuvent survivre. Pas de Map/Set exposée ni autorité latest.

La réponse brute d'un port externe peut rester mutable : le retour async de
collect et son await laissent une occasion de mutation avant certification.
La revalidation finale protège donc aussi cette séparation temporelle. Une
liste gelée superficiellement ou un type readonly ne supprime pas ce risque.
L'adaptateur mémoire retourne des versions profondément propres et gelées,
mais ce fait ne peut pas être généralisé aux autres implémentations du port.

Répéter une opération ne démontre pas sa redondance. Setup/port/certification
protègent des propriétaires et frontières différents. En revanche copie du
payload de contrôle abandonnée et reconstruction d'enveloppes du contexte dans
le même appel sont des **candidats** locaux, pas des suppressions acquises.
Les APIs publiques `validateBusinessPayload` et `validateVersionContext` doivent
toujours accepter unknown, copier/geler et contrôler intégralement.

## 4. Comptabilité analytique, distincte des mesures

Notations : N occurrences de la réponse port (répétitions comprises), V refs
exactes distinctes après déduplication, R refs selected, Sstock occurrences au
setup, Vstock refs distinctes du stockage mémoire, H Snapshots du setup,
P somme des longueurs provenance, D nombre d'occurrences avec predecessor.
Pour une réponse stable valide : V=R, N≥R ; mémoire normale N=R. La table
suppose la même réponse stable pour collect et certification, garantie par les
copies profondes mémoire. Pour un port mutable, distinguer Nc (collect) et Nf
(certification) : deux registres restent, mais enveloppes = 2(Nc+Nf), schémas
métier = Nc+Nf, copies payload seules = 3(Nc+Nf), traversées équivalentes payload
= 5(Nc+Nf). Ne pas présumer Nf=Nc ; les mutations adversariales sont testées.
Compte sur chemin complet réussi ; en échec les passages sont préfixes,
sauf copie globale préalable. Les validations refs sont comptées par site de
contrôle, sans compter à nouveau les appels imbriqués du même validateur.

| Opération | Par registre sur N | M5/M6 hors setup | Setup mémoire |
| --- | ---: | ---: | ---: |
| Constructions registre | 1 | **2** | 1 sur Sstock |
| Passages `createVersionEnvelope` | 2N | **4N** | 2Sstock |
| Schémas payload métier | N | **2N** | Sstock |
| Copies profondes de listes de versions complètes | 2 (entrée + contexte) | **4**, chacune N occurrences | 2 sur Sstock |
| Copies profondes payload seules | 3N (enveloppe métier, contrôle métier, enveloppe contexte) | **6N** | 3Sstock |
| Copies profondes provenance seules | 2N listes (puis refs reconstruites) | **4N** listes | 2Sstock listes |
| `createOwner` | 2N | **4N** | 2Sstock |
| Validation ref propre | 4N (pré-ref et ref d'enveloppe, deux fois) | **8N** | 4Sstock |
| Validation predecessor / provenance | 2D / 2P refs | **4D / 4P** refs | mêmes formules sur stock |
| Passages contexte, mapping, déduplication | 1 chacun | **2 chacun** | 1 chacun |
| Lookup batch | Aucun dans factory | **3** mémoire : adapter/collect/resolver ; 2 côté Application+Domain pour port externe | Aucun |
| Ref validée par lookup | Aucun | **3R** mémoire, en plus des refs ci-dessus | Aucun |
| Manifestes validés/copiés | Aucun | **M5 : 3 ; M6 : 2** | Current non-null : 1 ; Snapshots : H |
| `selectedReferences` | Aucun | **2** : collect/resolver | Aucun |
| Résolution / structure / borne Snapshot | Aucun | **1 / 1 / M5 : 1, M6 : 0** | Aucune |

Les copies globales incluent déjà payload/provenance : ne pas additionner les
lignes comme volumes indépendants. En unités « traversée de tous les payloads » :
**5 par registre**, soit **10 par chargement**, +5 au setup si même jeu selected.
En unités « représentation d'enveloppes complète » : deux listes profondément
copiées + deux assemblages d'enveloppes = quatre représentations par registre,
dont seule la métier distincte survit comme versions ; ce ne sont pas quatre
appels d'une même fonction de copie. Les copies de payload de contrôle ajoutent
N représentations partielles abandonnées. Primitives/BigInt ne sont pas des
objets nouvellement dupliqués à chaque occurrence.

Exemple fixtures P2 (N=V=R) :

| Compte hors setup | Moyen sparse 8 604 | Moyen dense 55 404 |
| --- | ---: | ---: |
| Assemblages enveloppes | 34 416 | 221 616 |
| Validations schéma métier | 17 208 | 110 808 |
| Copies payload seules | 51 624 | 332 424 |
| Ref propre validée | 68 832 | 443 232 |
| Ref validée dans trois lookups | 25 812 | 166 212 |
| Traversées équivalentes payload (globales incluses) | 86 040 | 554 040 |

Owners/références ont aussi des contrôles par schéma (identités catalogue, PTEC,
AP.subPeriods, quantités/familles) et par structure : les comptes ci-dessus ne
les cachent pas dans une promesse de total exact de toutes primitives. Pour
les refs du manifeste, chaque factory valide R refs, donc 3R en M5, 2R en M6,
plus PortfolioId ; allocations de ces refs de contrôle sont abandonnées, la
factory conserve les refs de sa copie. AP valide les refs partition deux fois
par schéma ; quantités/IDs produisent aussi des objets de contrôle temporaires.

Par registre : validation métier parcourt N ; contexte insertion/collisions N,
owner et filiation V ; mapping N, déduplication N. La filiation parcourt les
suffixes fournis (jusqu'à quadratique sur longues chaînes), pas seulement V
visites totales. Chaque lookup bâtit sa table en Vstock, V ou V, puis R demandes.
Resolver parcourt R pour inventaires. Structure : dix `ofKind` initiaux sur R,
scan Portfolio R, filtres/recherches par familles/owner/AP/PT/RT/PTEC, union des
partitions, grille O(C+F) P2, filtre Order et filtre AP supplémentaire Snapshot.
`ofKind` supplémentaire par catalogue non-null et par catalogue de noms :
nombre variable, pas un nombre fixe de traversées R. Rien ne devient O(R) pour
le pipeline entier par réduction des copies.

### Copies vivantes et mémoire

Pour mémoire valide : à fin de chargement, **deux jeux sélectionnés indépendants**
sont logiquement retenus si reader et résultat restent vivants : enveloppes du
setup et celles du certificat (plus éventuel stock non selected). Les listes de
lecture sélectionnée ne dupliquent pas les versions. Le registre collect ne
survit pas dans le résultat. Pendant un registre, entrée, copie initiale,
enveloppes métier, copie contexte et enveloppes contexte peuvent coexister :
jusqu'à **cinq représentations** d'une occurrence, entrée comprise, hors copies
payload ponctuelles et diagnostics. Ce maximum logique n'est pas une mesure
V8 de cinq heaps complètes : portée/JIT/GC peuvent relâcher tôt certaines valeurs.
Les répétitions produisent N copies avant déduplication, même si V est petit.

Par registre, copies globales initiale/contexte et assemblages contexte sont
abandonnés (hors refs du rapport), ainsi que N payloads de contrôle ; répétitions
métier non retenues aussi. Pour collect, même le registre métier et ses rapports
sont abandonnés après vérification. Une valeur devenue inaccessible peut rester
en heap jusqu'au GC. Les deux registres sont séquentiels, leurs déchets peuvent
coexister physiquement ; ne pas multiplier un pic isolé par deux.

Pour le manifeste concerné, copies adapter + lecture Application + Snapshot
interne certification + resolver : **quatre** représentations peuvent coexister
en M5 (trois en M6 sans Snapshot interne), hors fixture. À fin d'appel restent
celle du reader et celle du graphe ; deux copies intermédiaires de manifeste
abandonnées en M5, une en M6. Les wrappers d'inspection et refs de contrôle
ajoutent des allocations temporaires, pas des jeux complets de versions.

Le benchmark conserve aussi la fixture originale, le reader et ses manifestes,
les résultats pendant la mesure, les temporaires de copie/descripteurs/ancêtres,
Maps/Sets et structures TA. **Allocations cumulées** = somme des objets créés ;
**heap retenue** = objets encore accessibles après phase/GC documentée ;
**pic heap/RSS** = maximum temporel de périmètre explicite. Aucun nombre d'octets
par copie ni durée exclusive n'est établi par cette inspection.

## 5. Invariants et preuve de confiance

Domain pur, sans port/stockage/horloge, global d'autorité, sélection implicite ou
mutation ; registre passif, refs exactes, règles R1.1/R1.2 intégrales. Application
orchestre ports et factories Domain, conserve validation des réponses et erreurs
de transport. Adapters fournissent seulement les données ; aucune certification,
règle identité/lifecycle/filiation déplacée. Factory `certifyPortfolioGraph`
reste seule autorité du certificat. Copie profonde/détachement et gel profond
des sorties préservés ; une Map gelée superficiellement n'est pas immutable.

| Mécanisme examiné | Garantie réelle / limite | Décision proposée |
| --- | --- | --- |
| Sortie d'une factory | Donnée vérifiée/copiée/gelée si l'appel réussi est observé dans le flux ; type seul ne prouve pas l'appel | Nécessaire ; aucune admission d'objet externe prétendant être une sortie |
| Interface structurelle / marque nominale TS `declare unique symbol` | Vérification statique, effacée en JS ; cast/any/désérialisation contournent | Rejetée comme preuve runtime ; brand du certificat reste son contrat statique actuel |
| Symbole privé attaché à objet exporté | `Object.getOwnPropertySymbols` permet découverte/copie ; sans identité/capacité privée, marque forgeable ; symbol keys refusées par les données existantes | Rejeté pour supprimer des validations ; pas de propriété certificat ajoutée |
| Symbole secret passé à helper exporté | Secret inaccessible si jamais exposé, mais caller doit le recevoir pour appeler ; transmission augmente surface et ne prouve pas la donnée jointe | Rejeté comme protocole Application/Domain P3 |
| WeakSet/WeakMap/cache d'appartenance | Nouvelle autorité par identité et durée de vie ; interdit, ne certifie pas une autre sélection | Rejeté explicitement, même localement utilisé comme registre de certificats |
| Helper exporté `validateResolvedTrusted(registry)` | Import direct possible, faux registry gelé accepté si contrôle absent ; nom internal/barrel/import policy ne suffit pas | Rejeté, même avec brand TS ou convention documentaire |
| Helper non exporté module-level avec argument trusted | Inaccessible par import ESM normal, mais appels internes peuvent mentir ; encapsulation modulaire, pas authentification runtime de l'argument | Insuffisant seul pour une réutilisation entre frontières ; revue/garde ne remplacent pas une validation |
| Closure non exportée capturant une sortie locale de factory réussie, sans argument de donnée | Pas d'entrée arbitraire à injecter ; origine fixée par flux runtime, copies gelées ; aucun handle ne sort | Candidat B local seulement, sous conditions ci-dessous et audit ; aucune preuve transportable |
| Closure/capacité exportée | Vraie capacité difficile à forger par identité JS, mais si factory/capacité reçoit supplied unknown elle doit tout valider ; callbacks/arguments peuvent ouvrir un autre bypass | Non recommandée pour C ; nouveau protocole et surface publique, audit architectural distinct nécessaire |

La sûreté d'une closure locale repose sur trois faits vérifiables : capture
**uniquement après succès** du validateur runtime ; graphe de données propre
profondément copié/gelé, aucun alias mutable/Proxy source conservé ; consommation
synchrone dans le même appel, sans callback fourni par l'appelant, sans await ni
capacité exportée. Pas de paramètre « déjà validé », ni remplacement du capturé.
Une fonction lexicale non exportée n'est pas appelable par import direct ESM.
Un fichier nommé internal contenant un export le serait : rejet immédiat.

Cela fournit une provenance par construction et encapsulation, **pas une sandbox
contre modification du module, débogueur ou runtime JS compromis**. Les intrinsics
standards sont supposés comme pour P2 ; aucun protocole ne protège du code qui
réécrit les factories. Garde imports et revue des call sites renforcent l'encapsulation,
mais sont une discipline mécanique, pas un certificat runtime. Si l'audit exige
une authentification runtime d'un objet franchissant un module, les contraintes
sans cache/propriété/cast ne sont pas levées : **revalider ou abandonner B/C**.

Les sorties `VersionRegistry`/`PortfolioGraph` ne deviennent pas des certificats.
Le helper P1 `lookupExactBatch` ne garantit pas une provenance runtime de son
registry : ses trois usages actuels sont après factory ; la certification ne
l'utilise jamais pour accepter un registry extérieur sans factory.

## 6. Comparaison A/B/C et recommandation

### A — conservatrice, frontières et validations conservées

Première cible bornée : `copyImmutableValue`, allocations d'ancêtres à chaque
objet (`next=[...ancestors,value]`) ; étudier pile locale push/pop avec restitution
sur tous les retours, sans état hors appel, même DFS/paths/priorités. Garder
membership et politique des DAG : copier chaque branche, refuser seulement cycle
d'ancêtres ; ne pas memoïser par objet. Une pile locale peut ramener les copies
cumulées d'ancêtres de O(somme des profondeurs) à O(nombre d'objets), sans rendre
le contrôle `includes` constant ni supprimer des validations.

Seconde cible possible, distinctement approuvée : matérialisations temporaires
**dans cette même fonction** (descripteurs, listes d'entries, records d'inspection).
Conserver la phase complète de contrôle des descripteurs d'un record **avant**
copie récursive de ses enfants. Toute fusion qui fait remonter une erreur enfant
avant un accessor tardif est refusée. Pas de changement global de `field`,
`dataRecord`, égalité, schémas ni garde ; accès calculé runtime reste interdit.
Si aucune variante locale compatible ne retire ces allocations, garder le code.

Toutes les deux copies globales, deux validations d'enveloppes, schéma métier,
contextes/mappings et deux registres de chargement restent. Gains plausibles :
moins de tableaux courts et pression GC, bénéfice possible M1 puis M2–M6/setup ;
pas de suppression d'un terme métier ni de promesse de facteur d'accélération.
Sur payloads peu profonds, gain possiblement faible ou nul. Aucun intervalle
chiffré honnête avant laboratoire ; coût dominant des descripteurs, factories,
BigInt/règles et parcours doit encore être payé.

### B — réutilisation interne Domain strictement contrôlée

Candidat le plus étroit : dans `createBusinessVersion`, contrôler le schéma sur
le payload déjà copié/gelé par `createVersionEnvelope`, puis conserver cette
même enveloppe, en supprimant **seulement la copie de contrôle abandonnée**.
`validateBusinessPayload(unknown)` public conserve sa copie/validation complète.
Aucune règle métier supprimée, aucun résultat partagé entre appels/frontières.

La forme d'implémentation reste à prouver par l'audit : contrôle lexical qui
capture le payload de l'appel réussi, ne reçoit pas d'objet trusted et ne sort
pas du module. Une extraction vers un module exportant un checker trusted est
**refusée**. Une simple extraction privée avec argument nécessite de documenter
qu'elle assure uniquement l'encapsulation, pas une provenance runtime ; elle ne
satisfait pas à elle seule le niveau de preuve recommandé. Mutualiser les 14
schémas sans duplication et sans nouvel accès trusted public peut imposer une
réorganisation locale plus large : pas implicitement autorisée par A.

Durée de vie : un appel synchrone ; accessibilité : aucune hors flux lexical ;
immutabilité : sortie envelope profonde ; garantie finale : schéma métier encore
obligatoire avant retour BusinessVersion. Diagnostic payload conserve path,
code/message et ordre interne. La suppression de la recopie ne doit masquer
aucun contrôle data/descriptor/number/cycle : établir qu'il a déjà été effectué
sur **cette copie propre**, et comparer objets adversariaux/multidéfauts.

Gain analytique de B local : une traversée/copie payload par occurrence du
registre, **5→4** traversées équivalentes payload (−20 % de ce volume de copies,
**pas −20 % de latence**) ; **2N** copies payload de contrôle retirées par
chargement, M1 peut progresser. Les deux registres, enveloppes/contexte et schémas
métier restent. Aucun gain d'octets ou secondes mesuré.

B plus large : réutiliser enveloppes métier pour contexte, ou manifeste validé
pour resolver dans un unique flux Domain. Cela pourrait retirer la copie liste
contexte et ses enveloppes recréées, ou la deuxième copie manifeste Snapshot.
Mais les APIs publiques sont dans des modules séparés ; il faudrait une frontière
interne non forgeable/co-localisation contrôlée et conservation de toutes les
phases de collisions/owners/filiation. **Non recommandé dans P3 initial** :
risque de refonte, mélange R1.1/R1.2, erreurs prioritaires et maintenance des APIs.
Aucune factory publique simplifiée, aucune suppression du contexte complet.

### C — réorganisation minimale du chargement applicatif

C1 : collect transmet sa liste dédupliquée à certification unknown. Toujours
deux registres ; copies de réponse encore payées. Diagnostics contextuels
`identicalRepetitions` perdus : **rejeté**. C2 : collect transmet toute sa liste
métier (répétitions comprises) mais certification revalide : conserve au mieux
les faits, change les références d'entrée et ajoute rétention ; aucune économie
de registre démontrée. Sa provenance ne devient pas une preuve publique.

C3 : partager un résultat préparé entre collect et certification pour passer
**deux registres à un** dans M5/M6. Une API `certifyFromRegistry(registry)`
exportée serait forgeable : rejetée. Il faudrait un flux Domain unique qui
valide manifest/versions unknown, produit et consomme un état privé fermé,
permet les diagnostics de correspondance port **avant** la structure, puis
certifie exclusivement via l'autorité finale. Application ne détient ni ne
fabrique ce certificat préparé ; elle ne fixe pas la validation métier.

Difficulté concrète : Application doit vérifier le lot après validation métier,
avant structure, et entre deux appels aujourd'hui publics. Un callback
Application admis par Domain peut ignorer les diagnostics de port et introduit
réentrance/capacité ; transférer au Domain les politiques READ_* change la
répartition ; fournir un handle exporté avec contrôles incomplets ouvre un
protocole trusted public. Une mutualisation mutable entre await est exclue.
Aucune de ces variations n'est réputée minimale/sûre par défaut. **C3 ajourné** :
aucune solution assez démontrée sous contrats inchangés pour autoriser sa mise en
œuvre. Une éventuelle étude complémentaire doit fixer APIs/provenance/lifetime,
ordre des validations et sécurité runtime avant un nouveau plan/GO spécifique.

Économie théorique maximale C3 ciblée : un registre sur deux dans le chargement,
soit N schémas métier, 2N assemblages enveloppes et cinq traversées payload
équivalentes évités ; **M1 ne gagne rien de ce seul changement**. La médiane M1
3,288 s dense ne devient pas automatiquement une réduction de 3,288 s de M5.
Mutualisation peut augmenter rétention de collect/manifest/rapports ; adapter
reste indépendant et setup ne doit jamais servir de certificat du port.
Snapshot historique ne lit toujours pas Current ; R1.3 doit certifier chaque
nouvelle sélection candidate, R2 chaque donnée désérialisée, sans cache hérité.

| Critère | A bornée | B local payload | C3 préparé partagé |
| --- | --- | --- | --- |
| Frontières publiques | Identiques | Identiques seulement si flux lexical prouvé | Coordination interne à redéfinir |
| Validations métier | Toutes identiques | Toutes, copie préalable réutilisée localement | Un passage au lieu de deux seulement avec provenance suffisante |
| Preuve de confiance | Validation actuelle, pas de nouvelle confiance | Copie propre capturée, aucune entrée trusted | Non établie dans proposition minimale |
| Gain plausible | Allocations courtes/GC ; amplitude inconnue | 2N copies payload abandonnées retirées/load | Un registre/load théorique ; pas M1 |
| Risque | DFS/descripteurs/priorités, R1.1 partagé | Bypass checker/duplication schémas/priorités | Port/structure, contexte répétitions, nouvelle surface publique |
| Mémoire | Temporaires réduits, rétention finale identique | Temporaires réduits, rétention finale identique | Rétention intermédiaire potentiellement accrue |
| Recommandation | **Première phase à auditer** | Option distincte conditionnelle, pas GO implicite | **Ajourné**, aucune implémentation proposée sûre |

**Recommandation : A seule en première livraison future**, priorité pile locale
ancêtres ; seconde cible seulement si démontrée et approuvée séparément. B local
payload peut faire l'objet d'une phase séparée si preuve lexicale, diagnostics et
schémas uniques sont audités. Ne pas adopter C pour atteindre un gain espéré.
Si A est insuffisante et B/C ne fournissent pas une preuve suffisante, conserver
le pipeline P2 plus lent et C ; ne pas affaiblir la certification.

## 7. Diagnostics et tests multidéfauts

Ordre public à préserver : erreurs port → factory Selection/Snapshot (ID mismatch
après factory Snapshot) → registre collect complet → membership demandé dans
l'ordre → extras → wrapper certification → Snapshot factory éventuelle →
manifest resolver → registre certification → lookup resolver → structure → borne.
Source certification invalide précède clés invalides ; manifeste resolver invalide
précède registre invalide. Registre : copie **entière** avant schémas métier de
chaque entrée, puis contexte (collision avant owner avant cycle indirect), mapping puis
déduplication. Dans enveloppe : ref/owner avant payload avant predecessor avant
provenance ; schéma métier après enveloppe complète. Les cycles self sont
refusés dès l'enveloppe, distinctement des cycles indirects contextuels.

Structure : Portfolio ; Capacity requise puis foreign ; par Project puis
Reservation, AP requis puis Program/Pas ; noms Program/Pas ; par PT endpoints
puis sélection/cohérence PTEC ; RT endpoints ; PTEC étrangers ; par AP owner,
earliest, refs/owner SP, bornes et contiguïté ; EXTRA_SUBPERIOD ; grille TA ;
PortfolioOrder ; borne Snapshot. Ne pas regrouper toutes erreurs AP ou endpoints
si cela change l'entrelacement par owner/PT. Garder messages civils propagés,
paths paramétrés et ordre/multiplicité du contexte, pas seulement code/ok.

| Exemple multidéfaut construit depuis positif | Observation P2 à figer / priorité |
| --- | --- |
| Record payload premier enfant unsafe number, propriété tardive accessor | Inspection `dataRecord` du record refuse `INVALID_DATA_PROPERTY` avant récursion enfant ; fusion naïve interdite |
| Liste versions : premier schéma métier invalide, dernière occurrence cycle de données | Copie entière refuse `CYCLIC_PAYLOAD` tardif avant schéma précoce |
| Collision ref divergente précoce et payload métier tardif invalide | Schéma tardif avant collision contextuelle |
| Owner changé et collision exacte divergente | `DIVERGENT_VERSION_COLLISION` avant `IMMUTABLE_OWNER_MISMATCH` |
| Owner mismatch, cycle de filiation et double identité même owner | Owner avant cycle avant mapping ; chaque paire à isoler aussi |
| Provenance self + schéma payload invalide | `SELF_PROVENANCE` envelope avant erreur métier payload |
| Port répond ref manquante + version extra valide | `READ_REFERENCE_MISMATCH` sur première demande absente, pas extras |
| Port toutes refs + répétition identique ; puis répétition divergente + missing | Identique accepté, identicalRepetitions conservé en certification ; divergente refuse registre avant missing |
| Port version supplémentaire malformée + missing | Erreur complète registre avant mismatch port ; ne pas filtrer extras |
| Snapshot ID divergent + createdAt invalide | Factory Snapshot refuse createdAt avant `READ_SNAPSHOT_ID_MISMATCH` |
| Manifest duplicate selection + registre invalide, appel Domain direct | `MULTIPLE_IDENTITY_SELECTION` avant registre ; dans chargement factory initiale avant port |
| Capacity absente + AP absent + TA manquante | `TEAM_CAPACITY_REQUIRED` avant AP/grille |
| Owner 1 catalogue invalide + owner 2 AP absent | Catalogue owner 1 avant AP owner 2, pas regroupement de phases |
| PT 1 PTEC mismatch + PT 2 endpoints invalides + RT invalide | PTEC du premier PT avant endpoints suivants/RT |
| Partition AP tardif invalide + grille AP précoce absente | Partition avant toute erreur grille |
| EXTRA_SUBPERIOD + grille ; grille + ordre ; ordre + borne Snapshot | Dans cet ordre, diagnostics inchangés |

Comparer chaque permutation à son propre oracle : permutations invalides peuvent
légitimement changer le premier défaut. Aucune normalisation/renommage/messages
raccourcis, réparation, tri de listes ou compromis diagnostics n'est acquis.

## 8. Équivalence future contre la vraie baseline P2

**NON EXÉCUTÉE ici.** Après audit/GO : deux clones jetables sans hardlinks,
baseline checkout exact `d2ebb7142c563a43b620cd78fea63f2847d76c02`, candidat
sur cette baseline plus seulement patch autorisé ; HEAD/tree et productionDiff
vérifiés. Dépendances existantes, sorties `.test-dist-v2` et processus Node
séparés ; baseline n'importe aucun module candidat. Pas d'oracle P1/P0 substitué,
pas de reconstruction artificielle des algorithmes P2.

Rejouer corpus P2 inchangé : `proofs/r12-perf-p2/oracle.mjs` **1 245 réponses**
+ `supplement.mjs` **9**, total **1 254** ; baseline P2 réelle produit des sorties
nouvelles dans `proofs/r12-perf-p3/` futur, comparées aussi aux archives
`p2-candidate.jsonl.gz` et `p2-supplement.jsonl.gz`. Sceller corpus/sorties/hashes
avant code candidat. Les anciens harness/preuves ne sont pas édités ; extensions
P3 dans nouveau harness après GO, rejouées sur les deux arbres.

Comparer **DomainResult complets**, factories primitives/enveloppes/payloads,
registres/withVersions, contexte, manifestes, résolution, validation,
certification, chargements/ports réels : code/path/message/ordre ; versions/
owners/payloads/refs/predecessor/provenance, inventories/contextes/missing/
répétitions. Transport BigInt typé exact, clés records non ordonnées, listes avec
ordre/multiplicité. Réponses complètes archivées, pas seulement hashes/booleans.

Extensions obligatoires : §7 ; 14 schémas et toutes familles/owners ; shared DAG
et cycles à plusieurs profondeurs, cycle dans dernier élément, sparse array,
prototypes/symboles/non-enumerable/accessors (getter jamais appelé), null-prototype,
`__proto__`/`constructor`, NUL/séparateurs/Unicode/IDs longs ; préservation du
copiage séparé des branches DAG. A ne doit pas accepter un cycle croisé ni laisser
un ancêtre de la branche précédente. Tests erreurs/retours anticipés pour pile.

Tests **runtime séparés** du transport : gel récursif de tous tableaux/records,
détachement nested payload/owner/ref/provenance/manifest/context ; mutation des
entrées après validation, mutations des sorties, échec sans mutation d'entrées,
retained reader et certificat après mutation du jeu d'origine ; mutation contrôlée de réponse port entre collect et certification, marque/cast/faux
registry/faux graphe gelé/objet désérialisé invalides jamais admis comme certificat.
Si B étudié, aucun export/capacité trusted accessible par import direct et preuve
de chaque chemin vers checker/certificat ; tests JS sans types, export namespace
et gardes de call sites. Le JSON ne prouve pas ces garanties.

Branches indépendantes/changes de branche selected sous même owner ; owner
contradictoire ; contextes incomplets conservent `not-established` sans fallback ;
Snapshot ancien après Current divergent, lecteur Current qui lève, zéro demande
historique ; borne tous AP deleted/inactive ; ports partial/extra/wrong/ref répétée,
erreurs et Snapshot ID ; withVersions batch valide/identique/divergent/malformé,
ancien registre intact et aucun sous-batch publié. Domain resolver avec supplied
supplémentaire conserve contrôles/rapport de tout contexte ; aucune déduplication
avant contexte qui efface identicalRepetitions.

Suites futures : `npm run test:v2`, ciblés R1.1/R1.2, audit A1–A7, G12-01–13,
régressions P0/P1/P2, `npm run check:boundaries:v2`, `npm run typecheck:v2`,
`npm run build:v2`. Gardes/canaris inchangés ; pas d'assouplissement pour accès
calculé/propriété/closure. Les **194/32/123 PASS P2** sont historiques, pas P3.
**Toute divergence inexpliquée bloque l'implémentation/livraison future** ;
conserver et expliquer le contre-exemple, pas corriger l'oracle pour l'accepter.

## 9. Campagne de performance future et laboratoire distinct

Aucun lancement ici. Comparaison contemporaine **P2 exacte / candidat P3**,
mêmes fixtures et sept outils `scripts/benchmarks/r12-perf/` **sans modification**.
Seed 1202, hashes/volumes de [fixtures P2](./proofs/r12-perf-p2/fixtures.json).
Candidat mesuré committé dans son clone, productionDiff vide ; sources mesurées
identiques à celles livrées. Documenter SHAs/trees/hashes/commandes, Node/npm/TS,
OS/CPU/RAM/charge/pression mémoire, limites et disponibilité des observations.
Un benchmark actif, aucune compilation/test/oracle simultané ; séquences P2/P3
et, si dérive, contrôles contemporains inversés séparés (pas correction numérique).

Petit sparse, petit dense, petit historique puis moyen sparse et moyen dense :
M1–M6, **M6 historique NOT_EXECUTED** puisque Current null ; aucun Current ajouté.
Grand uniquement après maîtrise explicite des deux moyens et ressources adaptées,
campagne séparée `--allow-large`, pas qualification extrapolée.
Enfant neuf par scénario/API, cold, un warm-up, trois répétitions ordinaires,
30 s par phase et old-space 1024 Mio conservés ; setup adapter hors temps API,
consigné séparément, cold M5/M6 partiellement chauffé par setup.

Publier médiane/min/max/SD population/IQR, CPU user+system, heap endpoints/deltas,
retainedWithResult/après relâchement/GC, RSS endpoints et maximum lifetime,
setup/compilation/fixtures séparés, interruptions/refus/crashes. Pas PASS pour
refus/timeout ; ratio/gain seulement pour opérations terminées comparables.
RSS lifetime ≠ pic exclusif loading ; endpoint heap ≠ pic ; GC ≠ preuve sans fuite.

Commandes indicatives futures dans chacun des clones (PREFIX nouveau) :

```sh
node scripts/benchmarks/r12-perf/verify.mjs
node scripts/benchmarks/r12-perf/run.mjs --scenarios=small:sparse,small:dense,small:history --output=PREFIX/small.json
node scripts/benchmarks/r12-perf/run.mjs --scenarios=medium:sparse,medium:dense --output=PREFIX/medium.json
node scripts/benchmarks/r12-perf/summarize.mjs PREFIX/summary.json PREFIX/small.json PREFIX/medium.json
node scripts/benchmarks/r12-perf/run.mjs --scenarios=medium:sparse,medium:dense --operations=M1,M3,M5 --repeats=1 --profile --output=PREFIX/cpu.json
```

Profils séparés Inspector 1 ms, cold/warm-up puis mesure profilée, aucun mélange
avec médianes ordinaires ; M1/M3/M5 sparse/dense, M6 si différence de chemin
inexpliquée. Attribution self/inclusive/timeDeltas registre, copyImmutableValue,
dataRecord, payload, envelope, context, manifest, collect, validateResolved,
GC ; mapping JS candidat explicitement documenté dans nouvelle analyse de preuve.
Inclusifs recouvrants, inlining/JIT/sampling : absence de frame ≠ coût nul.

Laboratoire **isolé seulement après GO**, troisième clone/source instrumentée
identifiée par hash, jamais source livrée/outils historiques. Compter invocations
et nœuds copiés par phase (setup, collect, certification), payload/provenance,
inspections/descripteurs/ancêtres, schémas/refs/owners, contextes et tables ;
chronométrer spans imbriqués avec self seulement si instrumentation entrée/sortie
et accounting démontrés. Phase boundaries et objets retained/released enregistrés ;
GC/memory samples avant/après avec/sans résultat ; allocations cumulées via
profil d'allocations si possible, snapshots heap séparés pour ownership/retention,
pic par sampling avec fréquence/limites explicites. Overhead instrumentation/GC
rapporté ; ne pas présenter samples comme pic exact. Réponses refusées/petits
multidéfauts instrumentés séparément. Aucun calcul exclusif depuis inclusifs P2.

Séparer quatre résultats : gain **factory M1**, gain **certification M4**, gain
**chargement M5/M6**, variation **mémoire/setup**. A/B local peuvent améliorer
M1 ; C seul pourrait améliorer M5 sans toucher M1. Réduction analytique de copies
ne prouve ni latence acceptable, ni heap/RSS réduite : rétention et GC à observer.

## 10. Arbitrages distincts avant implémentation

Tous **OUVERTS / À SOUMETTRE**, aucune approbation déduite de ce plan.

| ID | Décision attendue | Recommandation / limite |
| --- | --- | --- |
| A-P3-01 — stratégie | A, B, C ou combinaison explicitement bornée | A pile ancêtres d'abord ; matérialisations locales séparément ; B payload en phase distincte conditionnelle ; C ajourné |
| A-P3-02 — frontières | Identifier celles pouvant être modifiées | A : aucune ; pas setup→port ou collect→certification trusted. B uniquement flux synchrone lexical dans une factory ; tout passage modulaire trusted exige autre preuve/plan |
| A-P3-03 — niveau de preuve | Runtime validation de la copie capturée, encapsulation et limitations JS | A ne crée aucune preuve nouvelle ; B sans argument trusted/export/capacité, aucun TS/symbole/cache comme certificat. Si preuve insuffisante, refus B/C |
| A-P3-04 — copies supprimables | Liste exacte par cible, durée de vie/diagnostics | A tableaux d'ancêtres/temporaires seulement ; B éventuel payload de contrôle abandonné. Garder copies publiques/détachement, listes registre/contexte et enveloppes dans A |
| A-P3-05 — diagnostics | Équivalence totale, ordre d'inspection et premier défaut | Aucune concession ; oracle §7/§8 et contre-exemples descripteurs obligatoires, divergence bloque |
| A-P3-06 — certification opaque | Unique factory et aucune API trusted publique | Brand TS actuelle inchangée, unknown toujours validé, aucun certificat forgé admis. Aucun impact fonctionnel acquis pour B/C |
| A-P3-07 — R1.3/R2 | Absence de preuve de transition/durabilité et partage inter-candidats | Nouvelle sélection/branche/contexte revalidés ; Snapshot autonome ; données R2 désérialisées unknown. A/B local compatibles conceptuellement, aucune commande/storage implémentée |
| A-P3-08 — coûts résiduels | Quelles limites accepter après remesure ? | Deux registres/load dans A/B local ; schémas/descripteurs, longues filiations, scans structurels et stock/fixture mémoire subsistent. Si global C persiste, décision séparée, aucun GO R1.3 automatique |

Risques A : pile mal restaurée après erreur, DAG pris pour cycle, ordre descripteur
déplacé, mutation/gel oubliés, bénéfice faible ; B : checker exporté/argument
forgeable, schéma dupliqué ou ignoré, mauvaise priorité ; C : pertes de répétitions,
contexte réduit, ports contournés, rétention/callbacks, responsabilité Application.
Mesures : cible minimale, preuve flux/ownership, differential multidéfauts,
immutabilité séparée, guards et profils, aucune extension face à un nouveau goulet.

## 11. Réception : deux verdicts indépendants

| Verdict futur | Conditions |
| --- | --- |
| **P3 techniquement conforme** | Aucune frontière affaiblie ; chaque unknown contrôlé ; aucun résultat forgeable pris pour certificat ; factories/contrats/diagnostics complets préservés ; oracle P2+extensions identique ; copies/gel/détachement et withVersions atomique ; tests/gates/frontières/typecheck/build réussis ; scope/exports revus et preuves de provenance si B |
| **Performance globale A/B/C** | M1–M6 remesurés sur mêmes fixtures, CPU/heap/RSS/setup/profils/dispersion publiés ; latence Snapshot dense jugée explicitement, moyens maîtrisés ; pas de goulet résiduel bloquant ou acceptabilité non établie ; coût mémoire et limites documentés |

A : absence de blocage mesuré ; B : réserves documentées compatibles avec
poursuite ; C : blocage/acceptabilité non établie. Aucun nouveau SLA/seuil métier,
aucun A/B acquis par disparition d'une copie, ni par fin sous 30 s. Conformité
technique distincte du verdict global, aucune clôture R1.2/autorisation R1.3.
Si stratégie sûre insuffisante, le plan accepte explicitement de conserver P2/C.

## 12. Découpage futur et livraison de cette session

1. Audit indépendant de ce SHA documentaire, arbitrages A-P3-01–08, GO explicite
   avec cibles/fichiers et phases autorisés. Aucune B/C implicite.
2. Nouveau préflight Git, baseline vraie P2, clones isolés, hashes/scellement
   des 1 254 réponses et extensions avant code ; preuves historiques conservées.
3. Laboratoire séparé si nécessaire pour allouer/prioriser A et établir coûts
   exclusifs sans extrapolation inclusive. Pas d'instrumentation livrée en Domain.
4. A bornée, une cible à la fois ; équivalence runtime/diagnostics, guards puis
   campagnes M1–M6. Ni schémas/égalité/dataRecord global ni pipeline refondu.
5. B locale seulement si audit/GO distinct et forme lexicale sûre finalisée ;
   nouvelle oracle/validation/campagne pour isoler son effet, sinon abandon.
   C nécessite cadrage supplémentaire, aucune étape de mise en œuvre implicite.
6. Rapport de réalisation, deux verdicts, limites/coûts résiduels, revue scope,
   rollback normal en clone jetable, commit/push sans force ; audit indépendant
   de réalisation avant autre décision. Si global C, arrêt et arbitrage séparé.

**Livrables présents exclusivement documentaires** : ce fichier,
`docs/current_plan.md`, `docs/current_canon.md`. Aucun code de production/test,
script/benchmark/configuration/dépendance ou preuve historique modifié ; aucun
instrument de laboratoire exécuté, aucun test/build/benchmark relancé. Lecture
et analyse statique uniquement ; Git et contrôles documentaires/diff-check.
Revue diff complet (nouveau document compris), liens locaux/statuts/scope,
`git diff --check`, commit normal et push sur `origin/rewrite/portfolio-versioned`,
vérification SHA local/distant, divergence 0/0 et arbre propre au compte rendu.

**Arrêt impératif après livraison du plan. Aucune implémentation P3 sans audit
indépendant et nouveau GO explicite. R1.2 IN REVIEW ; R1.3/R1.4/R2 NOT STARTED ;
classification C maintenue.**
