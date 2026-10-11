# FlowPlan2 V2 — R1.2-PERF-P3-C : étude architecturale et plan

2026-10-11 — **PLAN ONLY, PROPOSÉ À AUDIT ; AUCUN GO D’IMPLÉMENTATION**.
Baseline obligatoire, référence fonctionnelle et futur oracle P3-B :
`4b98501a99a94a92c64e6b4a9390766a2915b6e6`.
Branche : `rewrite/portfolio-versioned`, dépôt `kartaguez/FlowPlan2`.
**R1.2 IN REVIEW ; performance globale C ; R1.3/R1.4/R2 NOT STARTED.**
P3-B techniquement accepté selon la mission ; ses preuves historiques restent intactes.

**Recommandation proposée : conserver A.** Aucun flux à un registre examiné ne
prouve simultanément l’équivalence avec la seconde acquisition P3-B, la priorité
des diagnostics de lecture et la séparation Application/Domain. B est une piste
conditionnelle exigeant des concessions explicites, C est à rejeter dans ce cadre.
D est faisable sans partage d’autorité mais aucun gain sensible sur le dense
n’est démontré. Un diagnostic de coût isolé, après audit et GO propre, peut
sélectionner D ; il ne constitue pas une autorisation d’optimiser maintenant.
La suppression d’un registre reste une hypothèse, pas une décision.

## 1. Préflight et références

Avant rédaction : branche active attendue, `git fetch origin` réussi (code 0),
HEAD local et `origin/rewrite/portfolio-versioned` égaux à la baseline obligatoire,
`git rev-list --left-right --count HEAD...origin/rewrite/portfolio-versioned` =
**0/0**, `git status --porcelain` vide. Origin est
`https://github.com/kartaguez/FlowPlan2.git`. Aucun travail concurrent constaté,
aucun AGENTS.md applicable trouvé dans le dépôt ou ses parents. Aucun écrasement
ni force-push. Le SHA final documentaire sera fourni après publication, sans
auto-référence dans ce document.

Références normatives consultées : [current_plan](../../current_plan.md),
[current_canon](../../current_canon.md), [canon R1.1](./rewrite_r11_canon.md),
[plan R1.2](./rewrite_r12_plan.md), [canon R1.2](./rewrite_r12_canon.md),
[plan P3/A1](./rewrite_r12_perf_p3_plan.md),
[plan P3-B](./rewrite_r12_perf_p3b_plan.md),
[décisions A-R12-01–09 et corrections B1–B4](./rewrite_decisions.md).
Les mentions de statuts/permissions antérieurs dans les archives sont historiques.
Les onze arbitrages ci-dessous ne modifient pas ce registre normatif.

Preuves examinées en lecture seule : [rapport P2](./proofs/r12-perf-p2/report.md),
[rapport P3-A1](./proofs/r12-perf-p3-a1/report.md),
[rapport P3-B](./proofs/r12-perf-p3-b/report.md),
[comparaison M1–M6 P3-B](./proofs/r12-perf-p3-b/comparison.md),
métadonnées oracle B et harness `business-oracle.mjs`.
Lecture de preuves ≠ nouvelle exécution. Les 2 259 réponses sont un résultat
historique à rejouer sur la véritable baseline B, jamais sur une A1 reconstruite.

Sources analysées à HEAD, sous `src-v2/` :
`domain/versioning/{versionRegistry,versionEnvelope,immutableValue}.ts`,
`domain/portfolio/{manifest,graphResolver,graphValidation,validatedPortfolioGraph}.ts`,
`application/portfolio/loadPortfolioGraph.ts`,
`application/ports/portfolioReadPort.ts`,
`adapters/memory/memoryPortfolioReadAdapter.ts`, helpers `data/result` et tests
R1.2, notamment le test P3-B de seconde acquisition (ligne 593 à cette baseline).
Aucune modification de ces fichiers. Aucun test, compilation, gate, oracle,
benchmark, profil, laboratoire ou instrumentation exécuté pendant cette mission.

## 2. Contrats effectifs : types, runtime et autorité

| API réelle | Contrat et limite |
| --- | --- |
| `createVersionRegistry(input: unknown, path = 'versions'): DomainResult<VersionRegistry>` | Acquisition complète, schémas métier, contexte, mapping owners puis déduplication ; registre passif gelé |
| `validateVersionContext(input: unknown, path = 'context'): DomainResult<ContextReport>` | Copie complète et enveloppes génériques ; collisions, owners, cycles, missing predecessor ; ne valide pas les 14 schémas métier |
| `lookupExactBatch(registry: VersionRegistry, inputs: readonly unknown[])` | Retour gelé `{result: DomainResult<readonly BusinessVersion[]>, failedIndex: number|null}` ; table locale, ref validée par demande, arrêt premier échec ; ne certifie pas le registre |
| `resolvePortfolioManifest(input: unknown, supplied: unknown): DomainResult<PortfolioGraph>` | Manifeste avant registre, résolution exacte, inventaires et contexte ; supplied non selected admis mais validé |
| `validatePortfolioGraph(manifest: unknown, supplied: unknown): DomainResult<PortfolioGraph>` | Resolver puis `validateResolved` privé |
| `validateSnapshotGraph(snapshot: unknown, supplied: unknown): DomainResult<PortfolioGraph>` | Snapshot puis validation graphe puis borne knowledgeDate |
| `certifyPortfolioGraph(input: unknown): DomainResult<ValidatedPortfolioGraph>` | Seule factory publique ; wrapper fermé puis validations complètes ; aucune entrée « trusted » |
| `collect(manifest: PortfolioManifest, reader: ExactVersionsReader): Promise<DomainResult<unknown>>` | Privé Application ; réponse complète validée, missing avant extras ; retourne la réponse port originale |
| `loadCurrentGraph(selectionReader: CurrentSelectionReader, versionsReader: ExactVersionsReader)` | `Promise<DomainResult<ValidatedPortfolioGraph>>`, lecteurs Current et versions seulement |
| `loadSnapshotGraph(snapshotReader: SnapshotReader, versionsReader: ExactVersionsReader, snapshotId: unknown)` | Même résultat ; aucun lecteur Current ni lecture transitive de lignée |
| `createMemoryPortfolioReadAdapter(versions: unknown, current: unknown, snapshots: unknown): DomainResult<MemoryPortfolioReader>` | Setup validant, readers gelés ; fournit des données, aucun certificat |

`VersionRegistry` est une interface structurelle TS, pas une preuve runtime.
La précondition de `lookupExactBatch` repose sur le flux des appelants, pas sur
une reconnaissance de provenance. L’importer directement et lui passer un faux
registre peut produire un lookup arbitraire ; cela ne crée aucun certificat.
Le resolver public et la factory ne l’utilisent qu’après acquisition complète.

`VersionEnvelope` et `ValidatedPortfolioGraph` ont des marques `declare unique
symbol` privées, absentes au runtime. `readonly`/`DeepReadonly`, unions corrélées
et casts protègent le code correctement typé ; JS/any/cast peuvent les contourner.
Le certificat n’a ni marque runtime ni table d’appartenance. Sa garantie effective
vient de l’exécution de la factory et des copies profondément gelées. Un faux
graphe, même gelé ou désérialisé, doit repasser par cette factory à une frontière
unknown. B4 ne promet pas de reconnaître tous les faux objets chez les consommateurs
internes et ne permet pas de créer une nouvelle autorité intermédiaire.

Les ports sont trois interfaces async distinctes :
`readExactVersions(refs: readonly ExactReference<VersionKind>[]): Promise<DomainResult<unknown>>`,
`readCurrentSelection(): Promise<DomainResult<unknown>>`,
`readSnapshot(id: SnapshotId): Promise<DomainResult<unknown>>`.
Le type du wrapper DomainResult est un contrat du port ; les loaders propagent
son refus, sans valider à nouveau les erreurs ni intercepter les throws/rejections.
Un wrapper JS malformé/Proxy qui lève n’acquiert pas un nouveau diagnostic garanti.
Ne pas ajouter implicitement de validation de wrapper ou de catch en P3-C.

## 3. Pipeline complet et matrice des frontières

Les responsabilités et garanties de chaque ligne sont cumulatives. « Fiable »
signifie acquis par le flux local décrit, jamais présumé fiable par son seul type.
Les chemins de modules sont relatifs à `src-v2/`.

| Frontière / responsable | Entrées fiables et validations obligatoires | Copie/gel, garantie transmise, réutilisation | Mutation/falsification et ordre observable |
| --- | --- | --- | --- |
| Setup — adapter mémoire | Trois unknown ; registre stock entier, Current sauf null, liste Snapshot puis chaque Snapshot et unicité ID | Registre et manifestes détachés ; closures readers les retiennent ; wrapper/ports gelés | Aucun certificat ; versions invalides avant Current avant Snapshots ; provenance de l’adapter n’autorise aucun bypass |
| ID Snapshot — Application → `manifest.createSnapshotId` | ID unknown ; forme/family/value avant I/O | ID neuf gelé, pour la demande exacte | Défaut ID avant erreur du port Snapshot |
| Lecture sélection — Application / ports | Aucun contenu fiable du port ; erreur propagée ; factories Current/Snapshot | Wrappers et manifestes détachés/gelés ; revision/createdAt primitifs | Port avant invalidité réponse sélection ; Snapshot valide avant mismatch ID |
| Demande exacte — Application `collect` | Manifeste factory locale ; `selectedReferences` globals puis douze tables | Nouveau tableau gelé de refs acquises ; contrat de lecture détenu par Application | Pas de latest, fallback, Current historique, lecture predecessor/source |
| Réponse versions — port → `collect` → Domain registre | Toute response.value unknown, y compris extras ; `copyImmutableValue` de toute la liste avant schémas | Première copie profonde indépendante ; aucune donnée métier fiable avant acquisition | Invalidité générique tardive peut précéder défaut métier précoce ; getters refusés, traps Proxy peuvent agir |
| Enveloppes/payloads — Domain `createBusinessVersion` | Chaque occurrence de la copie ; record/ref, enveloppe complète, checker B des 14 schémas | Enveloppe métier neuve gelée, payload acquis lexicalement ; aucune copie de contrôle payload B | Ref/owner/payload admissible/predecessor/provenance avant défaut schéma ; pas de checker exporté |
| Contexte — Domain `validateVersionContext` | Versions métier localement acquises, mais API publique unknown entièrement révalidée | Deuxième copie de liste dans chaque registre, enveloppes génériques ; rapport gelé | Collisions divergentes pendant parcours, puis owner immutable, puis cycles/missing ; type métier ne dispense pas l’API publique |
| Mapping / dédup — Domain registre | Contexte réussi, toutes enveloppes métier | Owners uniques puis premières occurrences distinctes ; liste/wrapper gelés | `OWNER_IDENTITY_CONFLICT` après contexte ; repetitions identiques signalées, non rejetées |
| Lot demandé — Application `collect` via lookup Domain | Registre issu de factory dans cet appel, refs du manifeste local | Lookup local sans copie profonde ; missing exact converti en diagnostic de lecture ; cardinalité distincte | Missing en ordre demande avant extras ; invalidité complète/collision/owner précèdent ces diagnostics |
| Passage à certification — Application | Sélection détachée fiable ; **versions encore response.value externe** | Le premier registre/lookup sont abandonnés, response brute reste aliasée jusqu’à acquisition finale | Await de collect et réflexion créent fenêtre ; cette entrée n’est pas certifiée |
| Wrapper certificat — Domain `validatedPortfolioGraph` | Input unknown ; record/source/clés obligatoires fermées | Inspection superficielle gelée seulement ; pas copie profonde du wrapper | Record puis source puis clés ; un cast n’obtient aucun succès anticipé |
| Snapshot/manifeste final — Domain `manifest` | Snapshot/manifeste inconnu des APIs publiques ; même copie Application revalidée | Snapshot nouveau et copie manifeste, puis resolver recopie le manifeste | Snapshot avant resolver ; resolver valide manifeste avant second registre |
| Registre final — Domain `graphResolver` | supplied unknown, réponse relue ; tous contrôles registre répétés | Nouveau jeu indépendant et contexte de la réponse à cette acquisition | Mutation invalidante refusée même si collect réussissait ; extras invalides jamais filtrés |
| Résolution — Domain resolver + lookup | Manifeste et registre factories de cet appel | Versions dans ordre selected ; inventaires dérivés owners Settings ; graphe/listes/inventaires gelés, contexte conservé | Missing exact avec path `manifest.references.i` ; aucun substitution par version/branche/source |
| Structure métier — Domain `graphValidation.validateResolved` privé | Graphe assemblé dans resolver public, pas graph casté | Même graphe ; filtres/partitions/expectedCells/compteur TA locaux abandonnés | Ordre structurel détaillé §4 ; aucun certificat partiel |
| Borne Snapshot — Domain `validateSnapshotGraph` | Graphe structurel réussi, metadata Snapshot acquise | Aucun Snapshot/revision ajouté au graphe | Tous AP selected, inactive/deleted compris, through après knowledgeDate refusé après structure |
| Certificat final — factory Domain unique | Uniquement succès complet du chemin choisi | `success(graph as ValidatedPortfolioGraph)` ; aucune copie/marque runtime supplémentaire | Le cast terminal ne remplace aucun contrôle ; aucun registre/token d’autorité retenu |

Graphe d’appels actuel (A), aucun appel caché de certification par adapter :

```text
loadCurrentGraph
  await CurrentSelectionReader.readCurrentSelection → refus port ou createCurrentSelection
loadSnapshotGraph
  createSnapshotId → await SnapshotReader.readSnapshot
  → refus port ou createPortfolioSnapshot → comparaison snapshotId
les deux
  await collect(manifest, ExactVersionsReader)
    selectedReferences → await readExactVersions → refus port
    createVersionRegistry(response.value) [registre 1]
      copyImmutableValue(liste entière)
      N × createBusinessVersion → acquisition enveloppe R1.1 → schéma B
      validateVersionContext → copie liste → enveloppes/collisions → owners → filiation
      mapping owner-identité → déduplication → registre gelé
    lookupExactBatch → missing READ_REFERENCE_MISMATCH → contrôle extras
    return response originale
  certifyPortfolioGraph({source, manifest|snapshot, versions: response.value})
    dataRecord → source → clés
    [Snapshot: createPortfolioSnapshot]
    validatePortfolioGraph → resolvePortfolioManifest
      createPortfolioManifest → createVersionRegistry(supplied) [registre 2]
      lookupExactBatch → inventaires → graphe gelé
    validateResolved
    [Snapshot: borne knowledgeDate]
    success(certificat opaque)
```

L’adapter mémoire construit un registre supplémentaire **au setup**, conservé
par sa closure. `readExactVersions` utilise `lookupExactBatch` sur ce stock et
retourne un tableau gelé de ses versions par référence, sans copie profonde à
la lecture. Current null produit `READ_CURRENT_MISSING/current` ; Snapshot absent
`READ_SNAPSHOT_MISSING/snapshotId`. La liste privée de Snapshots n’est pas gelée
mais ne s’échappe pas et n’est plus modifiée. Ni setup ni réponse mémoire ne
rendent un autre port fiable.

## 4. Diagnostics et invariants : ordre exact, pas une liste théorique globale

Les priorités dépendent du point d’entrée et de la phase ; il serait incorrect
de placer toutes les erreurs de port avant l’ID Snapshot ou tous les manifestes
après les registres. Le tableau §3 et les séquences suivantes font foi pour le plan.

1. Snapshot : ID demandé avant lecture ; refus Snapshot avant factory Snapshot ;
   dans factory : record/clés, ID, knowledgeDate, manifeste, createdAt ; puis
   `READ_SNAPSHOT_ID_MISMATCH/readSnapshot`. Current : refus lecture, record/clés,
   manifeste puis revision. Ces validations précèdent toute lecture de versions.
2. Refus `readExactVersions` propagé tel quel avant tout contenu. Sur succès :
   copie générique de **toute** liste avant toute validation métier. Les règles
   de descripteurs/cycles/nombres et l’ordre de récursion A1 sont conservés :
   record inspecté entièrement avant enfants, array descripteur/enfant intercalés.
3. Pour chaque occurrence en ordre réponse : record/ref propre, enveloppe
   (clés, ref, owner, copie payload, predecessor, provenance), puis schéma B.
   Un défaut métier ici précède une collision que le contexte détecterait ensuite.
4. Contexte : copie complète, parcours enveloppes/collisions. Première collision
   divergente → `DIVERGENT_VERSION_COLLISION/versions` (message identique au code).
   Un défaut précoce avorte ; un défaut d’enveloppe ultérieur n’est pas parcouru
   après une collision déjà trouvée. Après cette phase seulement :
   `IMMUTABLE_OWNER_MISMATCH`, puis cycles de lignée ; tous au path du contexte.
   Missing predecessor n’est **pas** un refus : ordre première découverte sans
   doublon, `not-established`, liens conservés. Sources provenance absentes
   n’entraînent ni chargement ni obligation de fermeture.
5. Mapping owners → `OWNER_IDENTITY_CONFLICT/versions`, puis déduplication.
   `identicalRepetitions` garde ordre et multiplicité des occurrences répétées,
   tandis que `registry.versions` garde la première occurrence de chaque ref.
   Les répétitions identiques ne sont pas une erreur de port.
6. Collect : premier missing dans l’ordre `selectedReferences` →
   `READ_REFERENCE_MISMATCH`, path `readExactVersions.i`, message
   `Expected kind/entityId/versionId`. Ensuite seulement cardinalité distincte
   différente → même code, path `readExactVersions`, message
   `Unexpected unrequested version`. N peut être supérieur à R par répétitions
   identiques sans refus. Ne pas remplacer ce test par response.length.
7. Certification directe : record `certification`, source
   `INVALID_GRAPH_SOURCE/certification.source`, clés
   `INVALID_CERTIFICATION_KEYS/certification`, puis Snapshot éventuel et manifeste,
   second registre, résolution. Resolver missing : `MISSING_EXACT_VERSION`,
   path remappé `manifest.references.i`, message `Missing kind/entityId/versionId`.
   Extras valides sont permis dans supplied Domain direct, leur contexte reste
   contrôlé ; seul collect a le contrat d’absence d’extras demandés.
8. Structure, en ordre du code : FOREIGN_PORTFOLIO ; TEAM_CAPACITY_REQUIRED ;
   FOREIGN_CAPACITY_OWNER ; par Project/Reservation ACTUAL_PERIOD_REQUIRED,
   MISSING_CATALOG_REFERENCE/DELETED_CATALOG_REFERENCE ; noms Program puis Pas
   DUPLICATE_CATALOG_NAME ; par PT endpoints, lifecycle, PTEC_SELECTION_MISMATCH,
   PTEC_AP_OWNER_MISMATCH, PTEC_ACTUALS_BOUNDARY_MISMATCH ; par RT endpoints et
   lifecycle ; FOREIGN_PTEC_OWNER ; par AP FOREIGN_AP_OWNER, AP_BEFORE_EARLIEST,
   partition refs/owner/bornes/contiguïté ; EXTRA_SUBPERIOD ; cardinalité puis
   compteur de grille INCOMPLETE_OR_FOREIGN_ACTUAL_GRID ; INCOMPLETE_PORTFOLIO_ORDER.
   Les paths/messages et ordre interne des boucles restent ceux du code,
   notamment `pts`, `rts`, `ptecs`, `actualPeriods`, `actualSubPeriods`, `teamActuals`.
9. Borne Snapshot après toute structure :
   `SNAPSHOT_BEFORE_ACTUALS/snapshot.knowledgeDate`, message identique au code.
   Current n’a pas cette borne. Seule factory publique produit le type opaque.

Aucun diagnostic nouveau de « token », « stale » ou « mutation » n’est autorisé
pour remplacer ceux de P3-B. Préserver les DomainResult complets, pas seulement
le premier code. Les permutions de données ont leur propre oracle : l’invariance
des faits ne signifie pas l’invariance de l’ordre des premiers défauts.

### Mutation entre collect et certification : contre-exemple discriminant

Le test pérenne P3-B `collect never replaces the independent certification
acquisition` utilise un Proxy sur le tableau réponse ; son trap
`getOwnPropertyDescriptor` modifie `ps.payload.name` en chaîne vide à la seconde
acquisition. Collect a validé un premier état ; la certification relit l’état
modifié et refuse `INVALID_NAME`. Supprimer la seconde lecture et certifier la
première copie ferait réussir ce cas. Ce n’est pas une simple différence
hypothétique de scheduling : elle est déjà testée à la baseline.

Une microtask peut aussi agir après la résolution de collect avant la reprise du
loader. Une suppression selected après collect produit un missing de résolution,
un ajout invalide peut produire un défaut de réponse complète. Un ajout **valide**
après collect n’est actuellement pas recontrôlé comme extra de lecture par la
factory : il peut être admis et modifier le rapport contextuel du certificat.
Une substitution valide sous les mêmes refs peut changer le graphe final, sous
réserve des invariants. La garantie actuelle est une acquisition finale valide,
pas l’égalité atomique entre les deux observations ni une détection universelle
de toute mutation. Ne pas « corriger » cette limite dans P3-C sans arbitrage.

Avec des objets ordinaires en exécution synchrone, la première copie détache
bien l’état observé. Déplacer tout dans un bloc sans await réduit la fenêtre
microtask, mais change le scheduling et ne supprime pas les effets de traps de
réflexion. Ni comparaison à une identité externe, ni hash, freeze de la source,
ni reread superficielle ne prouve l’équivalence de l’acquisition complète finale.

Extras invalides dès la première réponse : une enveloppe/payload invalide, une
collision ou un owner divergent non selected doit être diagnostiqué **avant**
READ_REFERENCE_MISMATCH. Filtrer vers les R sélectionnées avant validation est
un bypass interdit. Extras valides + selected manquante : missing avant extra.
Répétitions identiques : vérifier le contexte et garder le rapport, pas les jeter
avant validation. `withVersions` reste tout-ou-rien et laisse l’ancien registre
intact, y compris en cas de collision d’une dernière occurrence.

## 5. Comparaison architecturale A/B/C/D

| Option | Registres loading réussi | Lecture complète finale externe | Hexagonal / autorité | Équivalence et recommandation proposée |
| --- | ---: | --- | --- | --- |
| A — deux registres | 2 | Oui | Responsabilités actuelles, factory unique | Référence de sûreté ; conserver |
| B — flux Domain fermé | 1 dans la variante réellement mutualisée | Non | Contrôle du lot à placer ; callback privilégié interdit | Ne satisfait pas tous contrats ; conditionnelle à concessions non autorisées |
| C — préparation non forgeable | 1 seulement si token reconnu permet de sauter acquisition | Non | Autorité intermédiaire et cycle de vie nouveaux | Rejeter dans le cadre B4 et diagnostics stricts |
| D — réorganisation interne, sans partage | 2 | Oui | Frontières actuelles, temporaires internes | Faisable sous preuve ; potentiel dense sensible non établi, mesure préalable requise |

### A — conservation : faisabilité et coûts incompressibles

Graphe §3. Toutes fonctions et signatures §2 sont réutilisées à l’identique ;
aucune nouvelle fonction nécessaire. Unknown entre par ports, registre et factory ;
aucun helper trusted. Imports directs resolver/validateurs/factory reprennent
leurs acquisitions ; import lookup ne permet pas de construire un certificat.

Pour l’équivalence actuelle : deux observations validantes complètes de la réponse,
contrôle exact de lecture Application avant structure, validation publique autonome
Domain et borne Snapshot sont obligatoires. Copies externes détachées et gel ne
peuvent être remplacés par readonly. Le contenu sélectionné peut avoir changé
à la seconde observation ; le certificat conserve seulement ce second jeu.
Cela n’impose pas que chaque allocation **interne** à une observation soit
éternellement incompressible : un autre plan pourrait démontrer une réorganisation
lexicale. P3-B n’a supprimé que la copie payload de contrôle, pas ces frontières.

Optimisations encore envisageables : travail algorithmique strictement local
aux contextes acquis (D ci-dessous). Aucun tableau trusted exporté, cache global,
fast path pour mémoire ou flag de désérialisation. Un gain éventuel ne supprime
aucun registre et ne permet pas d’ignorer les données invalides non sélectionnées.

### B — flux Domain fermé : emplacement du contrôle, signatures et limites

Forme conceptuelle examinée, **pas une nouvelle API autorisée** : dans
`domain/portfolio/validatedPortfolioGraph.ts`, un orchestrateur privé
`certifyOwned(input: unknown): DomainResult<ValidatedPortfolioGraph>` acquiert
le wrapper/manifeste et `createVersionRegistry(versions)` ; captures const locales
du registre, résolution et validation avant retour. Les helpers qui accepteraient
ces captures doivent être lexicaux et non exportés. La factory existante
`certifyPortfolioGraph(input: unknown)` resterait le seul export certifiant.

```text
Application : lecture/validation sélection → await lecture versions → refus port
  → factory publique unknown
Domain : acquisition complète → registre unique capturé
  → faits de correspondance exacte → admission du lot ?
  → résolution sur capture → validateResolved → borne Snapshot → certificat
```

Le « ? » n’est pas un helper manquant ; c’est la responsabilité à résoudre :

| Placement proposé | Signature envisagée / module | Conséquence |
| --- | --- | --- |
| Contrôle et diagnostic du lot dans Domain | Factory étendue `certifyPortfolioGraph(input: unknown, admission: unknown)` avec expected refs/politique | Domain devient juge du contrat de lecture et de READ_REFERENCE_MISMATCH ; modification de responsabilité, diagnostics et contrat public, non autorisée |
| Retour faits + certificat à Application | `DomainResult<{facts: BatchFacts; graph: ValidatedPortfolioGraph}>` par factory | Structure peut échouer avant que l’Application émette missing/extra ; priorités modifiées ; un certificat existe avant admission |
| Callback Application exécuté dans flux Domain | `certifyPortfolioGraph(input: unknown, admit: (facts: BatchFacts) => DomainResult<void>)` | Callback externe, réentrance/mutation/throw ; capacité de décider une admission et d’observer un état intermédiaire ; exclu par mission |
| Application contrôle avant entrée dans flux | Registre collect puis `certifyPortfolioGraph(input: unknown)` | Reconstitue A si factory revalide ; si factory saute acquisition sur registre structural, bypass JS |
| Closure Domain exportée pour reprendre après contrôle Application | `prepare(unknown) → {facts, finish(...)}` | Capacité privilégiée exportée, sélection/lifetime/rejeu à prouver ; devient C et contrevient à la contrainte de closure |

Un rapport purement descriptif ne déplace pas en soi une règle de lecture dans
Domain ; mais le remettre à l’Application **avant** validation structurelle
implique une reprise contrôlée, donc token/closure/callback. Le retourner
**après** certification ne conserve pas les priorités. Transformer « aucun extra
port » en invariant métier serait particulièrement faux : le resolver public
admet actuellement des versions non selected valides dans son contexte.

Même si cette répartition était arbitrée, l’acquisition unique certifierait la
première observation, donc divergerait du test mutation §4. Déplacer la seule
acquisition plus tard supprime le contrôle validant précoce nécessaire aux
priorités collect. Pas de preuve d’équivalence trouvée avec un seul passage.

Preuve d’encapsulation requise dans une variante future : aucun helper
`resolveFromRegistry`, `validateResolved` ou `certifyOwnedGraph` exporté dans un
module importable directement ; déplacer/exposer ces helpers entre modules
contournerait l’autorité actuelle. Un barrel qui cache un export ne suffit pas.
Une co-localisation de leurs corps dans la factory ou des closures internes
exigerait un déplacement de responsabilités modules et une stratégie de corps
uniques pour les APIs publiques existantes, explicitement à auditer. Un type
interne seul ne fournit aucune preuve. Aucune duplication des règles ni bypass
pour tests ne serait accepté. B n’est donc pas jugée viable sous les exigences
actuelles ; aucun graphe incomplet présenté comme solution réalisable.

Concessions à soumettre si B est redemandée : contrat d’acquisition immuable à
un instant, acceptation des divergences de mutation/scheduling, lieu et autorité
d’admission du lot, évolution publique ou co-localisation des validateurs.
La présente mission exige leur conservation exacte : **ne pas les appliquer**.

### C — préparation certifiée : examen runtime et rejet

Protocole conceptuel minimal, non autorisé :
`prepareVersions(input: unknown, selection: unknown): DomainResult<Prepared>` ;
`finishPrepared(prepared: unknown, selection: unknown): DomainResult<ValidatedPortfolioGraph>`.
Propriétaire envisagé : module Domain de certification, factory finale seule
certifiante, versions détachées conservées entre les deux appels ; Application
utiliserait un rapport de facts pour le contrat de lot entre préparation/fin.

```text
port unknown → prepareVersions → registre + facts + handle
Application : missing/extras → finishPrepared(handle, sélection)
Domain : preuve de provenance + consommation → résolution/structure/bornes
```

| Mécanisme de provenance | Preuve / limite runtime |
| --- | --- |
| Brand TS / cast / objet gelé / symbole exporté | Forgeable ou purement statique ; aucun lien garanti avec acquisition |
| Symbole privé dans objet remis au caller | Réflexion via own symbols, copie des propriétés ; ne suffit pas sans reconnaissance interne |
| Closure avec état consommé | Capture non forgeable mais fonction exportée/échappée donne capacité privilégiée ; invocation/réentrance et sélection à contrôler ; interdite ici |
| WeakMap/WeakSet module privé | Reconnaissance possible d’un handle émis par module, mais nouvel ensemble d’autorité intermédiaire ; B4 ne l’autorise pas ; même local non persistant, couplage prepare/finish à auditer |
| Session locale avec table non exportée | Sans accès externe aucun protocole intermodules ; si finish/callback s’échappe on revient à la closure interdite de B |
| État transporté par IDB/JSON | Provenance perdue ; doit redevenir unknown et revalider intégralement |

Une table d’autorité ne doit jamais être globale ou persistante. La durée de vie
idéale serait un seul chargement, état consommé **avant** reprise, invalidé sur
refus/exception et libéré en finally. Il faudrait lier source, manifeste exact,
Snapshot metadata, contexte et invocation, non une identité mutable externe,
pour empêcher la réutilisation entre sélections. Plusieurs ports/adaptateurs ne
peuvent ni émettre ni transporter cette autorité ; chaque réponse est unknown.
L’import direct des fonctions prepare/finish reste possible même si absent d’un
barrel : il faudrait prouver admission et consommation pour tous ces appels JS.
La factory finale doit encore assurer toutes validations ; un token ne doit pas
remplacer la structure/bornes ou auto-approuver une demande autre.

Ces mécanismes ne résolvent pas la seconde observation P3-B : le handle possède
la première copie. Revalider la réponse à finish restaure deux registres et annule
le gain visé. Consommer un token une fois ne prouve ni l’absence de mutation de
la réponse externe ni l’admission exacte par Application. Diagnostics nouveaux
ou scopes incorrects seraient des modifications contractuelles. **Rejet de C** :
autorité intermédiaire difficile à auditer et non nécessaire au contrat actuel,
concession B4/closures non approuvée, équivalence mutation non démontrée.

### D — deux validations, autre organisation locale : faisabilité conditionnelle

Conserver exactement A et les signatures publiques §2 ; les deux unknown sont
acquis intégralement et indépendamment. Ne pas confondre avec les optimisations
livrées : P0 tables unicité/contexte, P1 lookup batch et manifeste, P2 grille TA,
A1 pile d’ancêtres, B checker payload lexical sont déjà présents.

Une piste algorithmique bornée est l’évitement des reparcours de **suffixes de
filiation du contexte acquis**. `validateVersionContext` parcourt actuellement
chaque départ avec un nouveau Set, pouvant répéter une longue chaîne O(V²).
Les profils B montrent contexte inclusif M1 dense 44,23 %, M5 dense 32,94 %,
mais incluent copies/enveloppes/owners : ils **ne mesurent pas le seul walk**.
La lecture de `scripts/benchmarks/r12-perf/fixture.mjs` apporte une limite plus
forte : les variantes moyennes sparse/dense n’ajoutent **aucun predecessor** ;
seule small/history donne à un Settings un parent absent v9999. Il n’y a donc
aucun suffixe fourni reparcouru à supprimer dans ces cinq fixtures. D-lineage
ne constitue **pas** un candidat répondant au gain dense recherché ; son gain
analytique ciblé y est nul, avec risque d’overhead. La forte part inclusive du
contexte vient d’autres travaux. Le protocole décrit sa faisabilité sur corpus
à chaînes fournies, sans proposer son implémentation pour cette campagne.
Aucun catalogue de micro-optimisations proposé.

Graphe de faisabilité précis pour un éventuel corpus distinct autorisé à chaînes fournies :

```text
A inchangé : collect registre 1 → admission Application → factory → registre 2
chaque registre → validateVersionContext(unknown, path) [API inchangée]
  copyImmutableValue → enveloppes/collisions complètes → owners complets
  closure privée traceLineage(start)
    tables exactes locales de l’appel : en-cours / terminé / terminal missing|null
    suit les predecessors du contexte, jamais un port
  pour chaque version distincte en ordre : traceLineage
    erreur cycle propagée ; terminal missing ajouté en ordre première découverte
  rapport ContextReport identique
mapping/déduplication → reste de A inchangé
```

Signature envisagée **lexicale dans `domain/versioning/versionEnvelope.ts`** :
`traceLineage(start: VersionEnvelope<VersionKind>): DomainResult<ExactReference<VersionKind> | null>`.
Pas d’export ni paramètre trusted public. Capture const des enveloppes que cet
appel vient de recréer, table références locale, path original ; états temporaires
indexés par tuples exacts, pas par objets externes. Le start provient seulement
de la boucle locale sur ces enveloppes. `validateVersionContext(unknown,path)`
reste l’unique entrée de ce module vers le rapport, autonome et entièrement
validante. Aucune modification `createVersionRegistry`, `withVersions`, ports,
lookup, resolver, structure ou certification n’est requise par cette piste.

Algorithme à prouver avant réalisation : pour chaque départ dans l’ordre historique,
construire un trail jusqu’à racine, missing, terminal déjà traité ou cycle en-cours.
Sur succès seulement, associer le même terminal à chaque ref du trail ; sur cycle,
refus immédiat au même path sans publier un rapport. Chaque version ayant au plus
un predecessor, un walk a un seul terminal absent possible. Une rencontre d’un
suffixe terminé n’introduit pas de nouveau missing différent ; le rapport déduplique
ses terminals dans l’ordre des départs comme aujourd’hui. Cycles/owners/collisions
restent séparés dans leurs phases. Forme et provenance des enveloppes inchangées.

Gains analytiques possibles O(V+E) de walk et O(V) état temporaire, au lieu des
reparcours sur chaînes ; E ≤ V pour les predecessors fournis. Il n’y a **aucun
registre, schéma, enveloppe ou copie profonde supprimé**, aucune résolution exacte
évitable, aucun contexte partagé entre les deux observations. Plusieurs petites
chaînes/aucun predecessor : overhead ou gain nul possible. Tables/trails ajoutent
des allocations ; il faut comparer avec les Sets historiques. Pas de cache d’autorité,
tout abandonné en sortie ; pas d’import direct possible du tracer lexical.

D est techniquement plausible sous oracle, audits runtime et mesure ; elle peut
améliorer un corpus à chaînes fournies, absent des fixtures officielles actuelles.
**Écarter D-lineage comme cible du moyen dense de P3-C.** Un besoin distinct de
chaînes fournies requerrait un autre cadrage mesuré ; ne pas créer ces fixtures
pour fabriquer un gain. Conserver A pour la campagne obligatoire actuelle.
Toute autre réorganisation (fusion copies contexte/enveloppe, inspection de records,
etc.) exige une étude propre mesurée ; aucune ne devient autorisée par cette liste.

## 6. Propriété, immutabilité et durée de vie par option

Notations : N occurrences avant déduplication, V refs distinctes, R selected ;
N ≥ V, collect réussi stable V=R. Les mesures fixtures mémoire ont N=V=R.
Une représentation = liste/enveloppes complètes, pas nombre d’octets V8.

| Option | Acquisition et propriétaire | Conservation / mutation | Représentations logiques et fin de vie |
| --- | --- | --- | --- |
| A | Chaque registre possède sa copie initiale puis enveloppes métier ; contexte possède sa copie/enveloppes génériques | Application détient temporairement registre 1 puis l’abandonne ; Domain détient registre 2 ; réponse externe mutable relue | Dans un registre : entrée + copie initiale + métier + copie contexte + enveloppes contexte = jusqu’à 5 représentations d’une occurrence ; déchets des deux registres peuvent coexister jusqu’au GC |
| B hypothétique | Une acquisition détachée, propriété exclusive closure Domain ; pas source externe conservée dans état partagé | Copie profonde gelée réutilisée localement ; aucune mutation possible de ses records/arrays ; mutation externe n’a plus d’effet, divergence §4 | Jusqu’à 5 dans le seul registre ; sortie selected partage ce registre ; gains de temporaires plausibles mais forme du flux rejetée sans concessions |
| C hypothétique | Copie initiale Domain, registre conservé par état entre préparation/fin | Handle/closure/tables prolongent la vie ; détachement obligatoire, consommation et sélection à lier ; externe mutable distinct | Jusqu’à 5 durant acquisition, puis registre retenu jusqu’à finish/abandon ; plusieurs préparations actives peuvent multiplier les jeux, fuite/réutilisation à exclure |
| D | Exactement A ; états lineage sur enveloppes localement acquises | Aucune nouvelle copie de versions ni conservation entre appels ; pas identité externe utilisée comme autorité | 5 comme A ; état O(V) supplémentaire temporaire, temporaires walk historiques réduits seulement si suffixes partagés |

Ces maxima sont logiques, pas des pics heap mesurés ; JIT/GC peuvent libérer tôt.
Les deux registres A/D sont séquentiels mais leurs déchets peuvent rester vivants
physiquement. N enveloppes sont produites avant déduplication même si V est petit.
Les copies payload/enveloppes génériques abandonnées peuvent occuper la heap
avant GC. Des refs de ces enveloppes survivent via le rapport contextuel.

Certificat final, toutes options qui préserveraient le contrat : manifeste exact,
versions **selected** profondément copiées/gelées, inventaires Projects/Reservations/
Teams et ContextReport de tout supplied final. Pas registry wrapper, table lookup,
index TA, jeton, source externe, revision Current, SnapshotId/createdAt/knowledgeDate
stockés dans le graphe. La borne Snapshot est validée mais sa metadata n’est pas
retenue. Aucun registre ne peut être réutilisé comme certificat d’une autre sélection.

Avec adapter mémoire et certificat retenus, restent deux jeux sélectionnés
indépendants : stock reader (plus éventuelles versions non selected), versions
certificat. L’éventuelle suppression d’un registre collect ne supprimerait pas
ces deux jeux finaux. Fixture originale peut aussi rester retenue par harness.
Toute option doit abandonner copies intermédiaires, lookup/inventaires de contrôle,
partitions/grille et états locaux après retour ; les types readonly ne remplacent
jamais copie/gel et aucun alias mutable vers réponse externe ne doit être retenu.

## 7. Conséquences R1.3/R2 — lots non commencés

| Situation future | A / D | B / C si arbitrage futur |
| --- | --- | --- |
| Nouvelle sélection Current | Nouveau chargement, nouveau manifeste/registre/certificat ; revision ne donne pas autorité métier | Ne jamais reprendre la capture/handle d’une autre sélection ; inclure globals, tables et contexte exacts |
| Snapshot historique autonome | Aucun lecteur Current ; predecessor/source absents restent liens + not-established, structure fermée exigée | Préparation ne doit ni importer contexte Current ni charger transitivement la lignée ; metadata spécifique à cette certification |
| Évolution de branche | Ref exacte, owner invariant, collisions/cycles sur contexte fourni ; certificat précédent stable | État lié à la branche/contexte réellement acquis, aucune substitution de version ou cache latest |
| Changement contexte/provenance | Tout supplied revalidé, rapport éventuellement différent même à selected identiques | Réutilisation par selected seulement serait incorrecte : contexte supplémentaire influe collisions/owners/rapport |
| Commande métier R1.3 | Certificat structurel n’atteste pas transition, confirmation, stale, publication ou atomicité RAM | Ne pas confondre Prepared technique C avec préparation/confirmation métier ; nouvel état candidat revalidé |
| IndexedDB R2 | Réponse désérialisée unknown ; adapter non fiable ; transaction/CAS/durabilité hors certificat | Aucun token transportable IDB ni trust par provenance d’adapter ; revalidation complète nouvelle lecture |
| Réponse mutable / plusieurs ports | Acquisitions locales indépendantes ; aucune reconnaissance adapter/objet | L’ownership peut isoler une observation mais ne préserve pas diagnostics de mutation entre observations ; invalidation/consommation nécessaires sans être suffisantes |

D ne doit pas conserver des états lineage entre contextes : un terminal missing
peut être fourni au prochain appel, une branche supplémentaire peut révéler un
owner divergent/cycle. Pas de cache global, pas d’autorité dépendant de l’identité
d’objet externe. R1.3/R1.4/R2 restent NOT STARTED ; aucune de leurs commandes,
transactions, codecs ou politiques n’est conçue pour implémentation dans ce lot.

## 8. Travaux évitables et gain potentiel : comptabilité P3-B

Médianes historiques B, moyen dense : M1 2,678 s ; M2 3,185 s ; M3 3,650 s ;
M4 3,920 s ; M5 7,229 s ; M6 7,003 s. M5 CPU médian 8 466,8 ms, heap endpoint
411,9 Mio, RSS maximum lifetime 822,9 Mio. RSS inclut setup/fixture ; endpoint
heap n’est pas un pic. Les profils B M5 dense donnent registre 69,26 %, copie
39,06 %, dataRecord 53,76 %, contexte 32,94 % **inclusifs recouvrants**.
Aucun coût exclusif du registre collect versus certification n’est isolé.

P2 a retiré la grille quadratique (dans sa campagne M5 dense 24,223→8,728 s).
A1 a prouvé moins de tableaux ancêtres mais M5 dense ~−0,18 % dans sa campagne.
B a supprimé N copies payload de contrôle par registre, M5 dense 7,425→7,229 s
(~−2,6 %) dans sa comparaison contemporaine ; RSS n’a pas baissé uniformément.
Les écarts entre campagnes ne sont pas une attribution causale inter-lots.
Ne pas reproposer ces optimisations ou assimiler moins d’allocations à un gain global.

Chemin stable entièrement réussi, hors setup ; counts issus du code B, pas
nouvelle instrumentation. Pour mutable, remplacer 2N par Nc+Nf ; sur refus,
préfixes visités variables, copie globale reste préalable aux schémas.

| Travail | P3-B par registre | A/D loading | B/C un registre hypothétique | Économie conditionnelle B/C |
| --- | ---: | ---: | ---: | ---: |
| Registres construits | 1 | 2 | 1 | 1 |
| Copies listes entières de versions | 2 (entrée/contexte) | 4 | 2 | 2 |
| Assemblages enveloppes R1.1 | 2N | 4N | 2N | 2N |
| Validations schémas métier | N | 2N | N | N |
| Copies profondes payload seules | 2N | 4N | 2N | 2N |
| Copies profondes provenance seules | 2N | 4N | 2N | 2N |
| Traversées équivalentes de tous payloads, listes incluses | 4N | 8N | 4N | 4N |
| Passages contexte / mapping / déduplication | 1 chacun | 2 chacun | 1 chacun | 1 chacun |
| Lookups exacts Application+Domain | 0 dans factory | 2 | 1 ou 2 suivant report/admission | 0 ou 1, non acquis |
| Lookup adapter mémoire | 0 dans setup | 1 | 1 | 0 |
| Résolutions manifestes / structures | — | 1 / 1 | 1 / 1 | 0 |
| Manifestes validés/copiés | — | M5 : 3 ; M6 : 2 | À conserver par contrat public | Aucun gain acquis |
| Copies finales retenues selected, avec reader | — | 2 jeux indépendants | 2 jeux indépendants | 0 |

Les copies listes contiennent déjà payloads/provenance ; ne pas additionner ces
lignes comme volumes indépendants. Les deux copies payload seules B sont celles
de l’enveloppe métier et de l’enveloppe contexte. B n’a pas retiré leurs validations
refs/owners/predecessor/provenance. Chaque schéma ajoute aussi ses propres contrôles
quantités/IDs/refs, et structure inventaires/partitions/grille reste à effectuer.

Sur fixtures historiques N=R=8 604 sparse / 55 404 dense, suppression hypothétique
un registre : 17 208 / 110 808 assemblages enveloppes, 8 604 / 55 404 schémas,
17 208 / 110 808 copies payload seules, 34 416 / 221 616 traversées équivalentes
payload évitées, plus temporaires de tables/descripteurs/enveloppes/provenance.
Ce sont des occurrences de travail, pas nœuds, octets ou secondes. Les comptes
B du laboratoire historique des factories directes ne mesurent pas cette suppression.

A : aucune économie par simple conservation. D : aucun registre/copie/schéma
supprimé, mais nombre de visites de suffixes et Sets peut baisser suivant filiation.
B/C : les économies ci-dessus ne sont réalisables qu’en changeant des contrats
non autorisés ; avec revalidation finale conservée, elles retombent à zéro pour
la suppression visée. Réutiliser la première copie puis la recopier/valider à la
factory conserve deux registres tout en ajoutant une copie éventuelle.

**Aucune estimation crédible en secondes ou pourcentage de M5/M6 n’est possible.**
M1 est une opération entière indépendante, avec setup/JIT/GC/contexte propres ;
2,678 s ne devient ni gain garanti, ni plafond fiable à soustraire de 7,229 s.
M5−M4 n’isole pas collect ; M3−M2 n’isole pas structure. Coût analytique évité,
coût exclusif instrumenté et bénéfice global contemporain doivent rester distincts.
Le plan ne démontre pas encore une architecture compatible offrant un gain dense
sensible ; l’exigence de performances reste ouverte, classification C maintenue.

## 9. Oracle et validations futurs — NON EXÉCUTÉS

Après audit indépendant et GO explicite de la seule phase concernée : clones
sans hardlinks/alternates, sources/compilations/processus séparés. Baseline
checkout exacte **4b98501a99a94a92c64e6b4a9390766a2915b6e6**, jamais A1/P2
ou implémentation reconstruite. Sceller les réponses de cette B avant candidat.
Vérifier SHAs/trees/imports/hashes ; garder toutes preuves historiques inchangées.

Réutiliser les harness historiques : P2 `oracle.mjs` (1 245), `supplement.mjs` (9),
A1 `copy-oracle.mjs` (34), B `business-oracle.mjs` (971), soit **2 259 réponses
complètes**. Rejouer sur vraie B, comparer aux archives B correspondantes puis
au candidat. Les anciennes sorties A1 ne remplacent pas les résultats B même
si égalité historique. Nouveau comparateur/extension/dossier de preuves isolés
seulement après GO ; ne pas détourner les labels/seals historiques.

Comparer réponses publiques complètes : ok/value ou errors, code/path/message/
ordre, ref/owner/payload/predecessor/provenance, versions distinctes/répétitions,
status/missing, manifestes/inventaires/graphe et résultats des vrais loaders.
BigInt exact, -0, ordre/multiplicité des arrays ; ne pas trier les erreurs ni
normaliser les défauts pour accepter un candidat. Throws/reflection JS examinés
séparément selon comportement B ; aucun nouveau contrat d’interception.

Extensions spécifiques à sceller **avant** candidat :

- Mutation au trap historique seconde acquisition et microtasks entre await ;
  payload/owner/ref/provenance modifiés, version selected retirée/remplacée,
  extra valide/invalide ajouté, array réordonné/vidé après lecture. Oracle B
  attendu, y compris ses limites sur extra valide tardif, pas une règle inventée.
- Selected missing début/milieu/fin ; autre version même identité ; extras valides
  et schémas invalides non selected ; défaut générique tardif versus schéma
  précoce ; missing + extras ; collision + owner + missing + structure simultanés.
- Collisions divergentes dans les quatre composants, répétitions identiques
  multiples/permutées, contexte/branche indépendants, owners contradictoires,
  liens manquants/multiples branches/cycles, provenance incomplète admissible.
- Snapshot autonome après Current divergent, lecteur Current qui lève, zéro
  lecture transitive/historique ; borne avec AP deleted/inactive, tous AP vides.
- Gel récursif et détachement de chaque copie, sortie inchangée après mutations
  input ; DAG branches distinctes, getter refusé sans invocation, cycles, trous,
  symboles/prototypes/Proxy/objets gelés forgés/null-prototype, BigInt/nombres.
- Entrées arbitraires JS/casts/validated:true ; imports namespace et directs des
  modules JS émis ; aucun export trusted, helper lexical inaccessible, aucun
  chemin non public certifiant, aucun contournement depuis faux VersionRegistry.
- Pour variantes B/C discutées, tentatives de fake/rejeu/consommation double,
  changement sélection/source/Snapshot/context/provenance, plusieurs readers,
  échec puis reprise/reentrance/abandon. Ces tests ne légitiment pas un token
  interdit ; un besoin d’exposer une capacité pour les écrire est motif d’abandon.
- `withVersions` atomicité : collision tardive/owner/cycle/extra invalide, ancien
  registre intègre après échec, toutes copies nouvelles après succès.
- D éventuelle : longues chaînes fournies, suffixes partagés, ordre inverse,
  branches indépendantes et convergentes, premiers terminals missing en différents
  ordres, cycle après suffixe traité, état local vidé après refus/exception,
  deux contextes successifs donnant des reports différents.

Vérifications runtime séparées des résultats JSON : Object.isFrozen récursif,
références détachées, aucune Map/Set/handle dans certificat, refus de mutation,
entrées inchangées après refus, sorties de deux acquisitions indépendantes.
Audit source **et JS émis**, imports directs sans types et exports effectifs ;
un checker/tracer privé n’est pas exposé pour le tester. Factory opaque unique.

Gates futures : `npm run test:v2`, ciblés R1.1 primitives/enveloppes/copie et
`scripts/v2/r11.test.mjs` (A1–A7/P0), ciblés R1.2 et `scripts/v2/r12.test.mjs`
(G12-01–13, P0/P1/P2/A1/B), nouvelles régressions, `npm run check:boundaries:v2`,
`npm run typecheck:v2`, `npm run build:v2`. Gardes/canaris/contrats/types existants
non assouplis. Les 245 tests, 51 ciblés R1.1, 155 R1.2 PASS B sont historiques,
aucun PASS nouveau revendiqué. Toute divergence inexpliquée bloque la réception.
Si B nécessite concession, le corpus doit exposer ses divergences à arbitrage,
pas être réécrit sous couvert d’optimisation équivalente.

## 10. Benchmark et laboratoire futurs — NON EXÉCUTÉS

Comparaison contemporaine vraie P3-B / candidat autorisé et committé,
productionDiff vide, outils/fixtures historiques `scripts/benchmarks/r12-perf/`
intacts (README, fixture, worker, run, verify, summarize, profile-summary), seed
1202, mêmes hashes et volumes. Versions Node/npm/TS/OS/CPU/RAM, charge et pression
mémoire, SHAs/trees/commandes archivés dans nouveau dossier, aucun historique édité.
Aucune autre compilation/oracle/test/campagne/laboratoire concurrent.

M1–M6 sur petits sparse/dense/historique et moyens sparse/dense existants :
29 opérations exécutables par version. **Medium/history n’existe pas dans les
fixtures historiques** ; ne pas annoncer sa mesure ni créer un scénario dans ce
lot. Une future couverture moyen historique réclame autorisation de fixture
complémentaire et comparaison B/candidat identique séparée. M6 petit historique
reste NOT_EXECUTED car Current null ; ne pas inventer Current pour le mesurer.
Grands uniquement après autorisation explicite distincte.

Enfant neuf par scénario/API, **30 secondes par phase, old-space 1 Gio (1024 Mio)**,
cold, un warm-up, trois mesures ordinaires. Setup adapter séparé du temps API,
rapporté avec ses effets de réchauffement. Compiler avant campagne. Min/médiane/
max, SD population/IQR, CPU user/system, heap endpoints/deltas/rétention avec
résultat puis après libération/GC, RSS endpoints/max lifetime, setup séparés.
Timeout/OOM/refus/crash non convertis en gains ni résultats PASS.

Ordre B/candidat, contrôles inversés si dérive des M1/M2 ou environnement ;
contrôles archivés séparément sans correction numérique des médianes principales.
Trois répétitions ne prouvent pas une significativité statistique ni un SLA.
B historique n’a pas fait de contrôles inversés ; ne pas considérer son temps
archivé comme mesure contemporaine de contrôle.

Profils CPU **distincts** M1/M3/M5 moyens sparse/dense, Inspector 1 ms, mêmes
phases mais répétition profilée hors médianes. Attributions self/inclusives et
limites JIT/inlining : registre collect vs registre factory, copies initiales /
contexte / payload, enveloppes, schémas, lookup, manifeste, structure, GC.
Pas d’addition des inclusifs recouvrants ni soustraction des opérations M1–M6.

Laboratoire isolé seulement avec GO couvrant cette phase : clone tiers hashé,
instrumentation absente de production et des campagnes officielles. Compter
registre par site setup/collect/certification, occurrences N, copies listes /
payload / provenance / enveloppes, visites/nœuds/containers, passages contexte,
walk lineage, lookups exacts, allocations tables et états temporaires. Vérifier
Nc/Nf dans cas mutations ; en D deux registres et mêmes copies restent attendus.
Timers avec overhead et nesting documentés ; spans exclusifs seulement si
comptabilité démontrée. Allocation sampling incluant objets collectés donne une
estimation, pas octets exacts. Heap snapshots/rétention/GC et sampling temporel
séparés ; endpoints et maxRSS lifetime ne prouvent ni pic loading exact ni absence
de fuite. Ne pas attribuer temps de schéma au seul nom wrapper effacé par JIT.

Avant éventuel choix d’une autre réorganisation D, isoler les postes du contexte
qui dominent réellement **les fixtures moyennes dense/sparse**. Les reparcours
lineage sont déjà écartés par lecture des fixtures ; ne pas les instrumenter pour
justifier leur optimisation sur ce dense. Si un besoin séparé de chaînes fournies
est autorisé, mesurer ce corpus séparément sans mélanger ses résultats à M1–M6.
Avant éventuel B réarbitré, mesurer la frontière complète,
sans transformer M1 en gain prévu. Deux verdicts indépendants à recevoir :
conformité stricte architecture/fonctionnelle, puis performance globale A/B/C.
Aucun seuil inventé dans ce plan ; l’audit doit fixer le bénéfice et les régressions
acceptables **avant** réception, considérer M5/M6 denses, petits, CPU/mémoire/setup.
Même conformité technique avec léger gain ne suffit pas à lever global C ni
à donner GO R1.3.

## 11. Onze arbitrages ouverts — tous PROPOSÉS, NON APPROUVÉS

| ID | Décision à soumettre à audit et GO | Proposition motivée / condition |
| --- | --- | --- |
| A-P3C-01 Architecture retenue ou rejet | A/B/C/D | Conserver A ; rejeter B/C sous contrats stricts ; D faisable mais conditionnée à mesure du coût réel ; D-lineage hors cible dense |
| A-P3C-02 Frontières de confiance | Autoriser ou non déplacement / instant d’acquisition | Aucun déplacement proposé pour réception équivalente ; B nécessite arbitrage explicite sur lot et seconde observation, incompatible avec exigences actuelles |
| A-P3C-03 Diagnostics port | Propagation, missing/extras, priorités et scheduling | Conserver exactement §4 ; aucune erreur générique stale/mutation/token, aucune admission après structure |
| A-P3C-04 Provenance de l’état validé | Captures internes ou protocole runtime | Captures exclusivement lexicales après unknown acquis ; pas registre structural trusted, token/WeakSet/closure exportée ; C rejetée |
| A-P3C-05 Copies/registres supprimables | Acquis versus hypothétique | Aucun registre complet supprimable prouvé ; B déjà livrée ne doit pas être recomptée ; D garde tous comptes de copies, étudie seulement suffixes |
| A-P3C-06 Propriété et durée de vie | Conservation et libération | Propriété locale de chaque acquisition, aucune source aliasée dans certificat, aucun cache inter-appels ; §6 ; état D temporaire lié au contexte acquis |
| A-P3C-07 Certification opaque | Autorité publique et imports directs | Factory unique unknown entièrement validante ; pas export de résolution/validation trusted ou certification interne ; B4 conservé |
| A-P3C-08 Compatibilité R1.3/R2 | Sélection/contexte/branche/stockage | Nouveau certificat à chaque sélection/contexte, Snapshot autonome ; aucune provenance transportée par adapter/IDB, aucun commencement des lots |
| A-P3C-09 Maintenance et risques résiduels | Complexité tolérable / review | A moins risquée ; D-lineage hors cible dense, états à auditer ; B/C autorité/scheduling/co-localisation coûteux ; pas duplication de règles ni helper privé exposé |
| A-P3C-10 Abandon | Critères bloquants | Toute divergence non arbitrée, bypass, alias mutable, déplacement lot, autorité persistante, doute provenance ou coût cible négligeable : conserver A |
| A-P3C-11 Gains et réception | Bénéfice mesurable et verdict global | Comptes analytiques ≠ temps ; oracle 2 259+extensions, runtime/gates complets, campagne B/candidat M1–M6 ; critères fixés indépendamment, C maintenue tant qu’acceptabilité non établie |

Risques résiduels A : redondance de travail et réponse non atomique entre deux
observations ; limites physiques pile/mémoire/BigInt et Proxy conservées. D :
ordre missing ou première détection cycle altéré, états laissés en-cours après
refus, coûts Map/trail supérieurs sur petits contextes, gain historique sans
gain dense. B/C : déplacement caché du lot au Domain, factory supposant un type
fiable, exports directs trusted, callback qui fuit, consommation sélection incorrecte,
token confondu avec préparation métier, abandon non libéré et autorité nouvelle.

Abandon de la suppression d’un registre si équivalence mutation/diagnostics ne
peut être établie, même si un benchmark hypothétique est plus rapide. Un gain
insuffisant ne permet jamais une concession implicite. En cas de réarbitrage,
décrire séparément l’évolution de contrat, ses contre-exemples et un nouveau
plan : le présent document n’autorise aucune de ces concessions.

## 12. Étapes futures et livraison présente

1. Audit indépendant de cette étude et A-P3C-01–11. Décider explicitement si le
   maintien A suffit ou si une phase de coût isolé D doit être autorisée. Aucun
   code P3-C n’est lancé à partir de ce plan ; B/C ne sont pas des solutions prêtes.
2. Si GO de laboratoire seulement : nouveau préflight/baseline B exacte, clones
   isolés, sceaux/hashes/corpus 2 259 et extensions ; mesure de coûts par site.
   Arrêt documentaire sur les résultats, choisir/rejeter une cible à partir des preuves.
3. Nouveau GO d’implémentation **distinct** après audit du résultat et du plan
   détaillé retenu. D-lineage écartée des fixtures actuelles ; autre cible D à justifier. Toute
   B exige d’abord arbitrage explicite de concessions, nouveau cadrage et audit.
4. Si autorisée : réalisation bornée, tests d’équivalence/runtime/exports, gates
   R1.1/R1.2/frontières/typecheck/build, aucune preuve/fixture historique modifiée.
5. Mesures officielles B/candidat, profils/laboratoire séparés, deux verdicts,
   régressions/coûts résiduels publiés. Rollback normal en clone jetable et
   comparaison tree baseline, jamais reset/force-push sur dépôt partagé.
6. Rapport de réalisation puis audit indépendant avant tout acte suivant.
   Aucune clôture R1.2 ni GO R1.3/R1.4/R2 déduit de performance locale.

Livraison présente exclusivement : ce plan, `docs/current_plan.md` et
`docs/current_canon.md`. Revue du diff complet et périmètre documentaire,
`git diff --check`, commit normal et push sur `origin/rewrite/portfolio-versioned`,
puis fetch/HEAD local-distant/divergence 0/0/arbre propre. Réexaminer toute
évolution concurrente sans l’écraser ; aucun force-push. Les SHA initial/final
et contrôles de livraison sont rapportés après Git, sans auto-référence circulaire.

**Arrêt impératif après livraison documentaire. Aucun refactoring, instrumentation
ou implémentation P3-C sans audit indépendant et nouveau GO explicite.
R1.2 reste IN REVIEW, performance globale C ; R1.3/R1.4/R2 NOT STARTED.**
