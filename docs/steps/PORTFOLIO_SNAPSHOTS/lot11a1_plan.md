# 11A.1 — Merge historical backups into Portfolio Snapshots

Statut : **11A.1 PLAN: BLOCKED** — plan documentaire, aucune implémentation.
Inspection le 2026-10-08 sur `codex/lot11a-portfolio-snapshots`, HEAD
`f477dd6e1a31f3be7be949dad9fea4cae9667770`, arbre initial propre.
11A core est implémenté et audité positivement à ce SHA selon la validation
utilisateur. Ce sous-lot ne clôture pas globalement 11A. 11B reste bloqué
jusqu'à décision/clôture de 11A.1 si cette extension est adoptée.

## 1. Contrat et périmètre

Une action distincte **Merge historical backups** reçoit N fichiers, N ≥ 1.
Chaque fichier est une photographie complète de la connaissance disponible à
son `exportedAt`. Après validation intégrale, l'état courant est celui du
fichier le plus récent ; une capture est créée pour chaque source unique,
y compris ce dernier fichier. Chaque capture utilise les paramètres, capacités,
Actuals, RAF, priorité, associations et objets de sa propre source.
Les Actuals de fichiers différents ne sont jamais additionnés.

Résultat idéal : T1 `[A1]`, T2 `[A1,A2]`, T3 `[A1,A2,A3]` donnent
current = T3, histoire canonique courante `[A1,A2,A3]`, captures S1 → A1,
S2 → A2, S3 → A3. La capture S3 demeure figée quand le courant évolue.
Les rational strings exactes, les sources exclusives Actuals et la sémantique
11A restent inchangées. Ni graphes, comparaison, attribution causale,
navigation historique, restauration de capture ni gestionnaire ETL.
L'opération remplace le document local après confirmation ; elle n'ajoute pas
implicitement les données de la session ouverte aux sources sélectionnées.

## 2. Inspection vérifiée et points de réutilisation

| Fichier existant | Fait vérifié / conséquence |
| --- | --- |
| `src/application/backup/planningInputCodec.ts` | Frontière commune V1–V5, `encodePlanningInputs` / `decodePlanningInputs`, factories Domain et quantités canoniques. Le décodeur de backup retourne l'état et abandonne les métadonnées d'enveloppe. |
| `src/application/backup/flowplanBackupV6.ts` | Dispatch V1–V6 ; V6 strict, collection obligatoire, IDs uniques et validation de chaque capture. Les champs d'enveloppe/data sont fermés. |
| `src/application/portfolioSnapshots/capturePortfolioSnapshot.ts` | `capturePortfolioSnapshot(state, result, actuals, snapshotId, createdAt)` est réutilisable hors DOM. `captureHistoricalInputs` retire les histoires V5 des inputs et conserve les références ; `hydrateHistoricalInputs` réinjecte le préfixe depuis un propriétaire **courant**. |
| `src/domain/portfolioSnapshots/portfolioSnapshot.ts` | Totaux Project exacts, deep copy/freeze, validation, dates/reasons et ordre `(createdAt, snapshotId)`. Versions inputs/forecast = 1 ; engine version fournie par le helper. |
| `src/main/planning/buildPlanningSessionProjection.ts` | Accepte un état arbitraire ; horizon → `reconstructActuals` → occupation → `recomputePlanning`, puis adapters Timeline/geometry. Aucun besoin de charger l'état dans la session active. |
| `src/domain/actuals/snapshots.ts` | IDs `kind:ownerId:vN`, versions consécutives depuis 1, knowledge dates non décroissantes, règles de participation/retrait/partition et identité des périodes. |
| `src/application/session/planningSession.ts` | Protection de suppression des propriétaires avec Actuals/legacy et Teams référencées ; réservation des cinq kinds historiques via les inputs des captures dès chargement et après transaction. |
| `src/main/planning/planningBackupOperations.ts` | Import actuel : decode, preflight, confirmation, encodage V6, une écriture, reload. L'erreur retournée est générique ; insuffisante pour présenter un conflit historique détaillé. |
| `src/infrastructure/backup/localPlanningBackup.ts` | Une clé `flowplan.backup.v1`, une écriture `setItem`. Aucun format de stockage secondaire. |
| `src/ui/planning-settings/createPlanningSettingsController.ts` | Import actuel lit seulement `files[0]` ; une action multi-fichiers séparée est nécessaire. |

Les tests existants pertinents sont `portfolioSnapshots.test.ts`,
`flowplanBackupV1.test.ts`, `flowplanBackupV3.test.ts`,
`flowplanBackupV5.test.ts`, `buildPlanningSessionProjection.test.ts` et
`planningBackupOperations.test.ts`. Ils servent de base de non-régression ;
cette passe ne prétend pas avoir exécuté les futurs tests du merge.

## 3. Dates et formats V1–V6

| Version | Date canonique obligatoire | État après décodage |
| --- | --- | --- |
| V1 | `exportedAt`, UTC ISO identique à `toISOString()` | Pas d'Actuals ; activation migrée à true, defaults historiques de couleur. |
| V2 | même champ et validation | Activation explicite ; pas d'Actuals. |
| V3 | même champ et validation | Associations/couleurs ; pas d'Actuals. |
| V4 | même champ et validation | Chronologies cumulatives, evidence legacy et provenance RAF conservées ; aucune réconciliation V5. |
| V5 | même champ et validation | Histoires object-scoped ; knowledgeDate ne dépasse pas la date civile UTC d'export. |
| V6 | `assertCanonicalTimestamp(exportedAt)` | Inputs stricts V5 et captures ; pas de borne technique exportedAt/knowledgeDate, conformément à 11A. |

Aucun format actuellement accepté n'est réellement sans date. Champ absent,
invalide, non canonique ou version inconnue : rejet intégral, avec identification
de la source. Ni date de fichier, ni nom, ni demande de date manuelle, ni
`now()` de substitution. `createdAt = exportedAt` exactement.
Un futur format sans date requerra une décision distincte ; il n'est pas accepté
par cette capacité. La date technique du nouvel export consolidé peut être celle
de sa persistance, sans modifier les `createdAt` historiques.

Prévoir un lecteur d'enveloppe validée retournant `{version, exportedAt, state}`
au-dessus des codecs existants, en partageant leurs validateurs. Ne pas maintenir
une deuxième définition permissive des versions ou des dates.

## 4. Décisions proposées et arrêtées pour le plan

### V6 contenant déjà une histoire : rejet explicite

Accepter un V6 avec `portfolioSnapshots: []`. Refuser une source V6 dont la
collection n'est pas vide, après validation du document, avec message :
« Ce fichier contient déjà un historique Portfolio. Sa fusion n'est pas prise
en charge par cette migration ; aucun historique n'a été supprimé. »

Importer seulement son courant perdrait silencieusement l'histoire ; fusionner
également les captures introduirait conflits d'IDs, nouvelles résolutions de
préfixes et doubles photographies (capture existante + export du courant).
Le rejet est la solution minimale et sûre pour 11A.1. Ne pas proposer un bouton
qui efface la collection avant merge, ni modifier le fichier source.
Une fusion d'histoires existantes serait un lot explicitement distinct.

### Même exportedAt maximal : résolution obligatoire du courant

Deux sources de même timestamp mais états différents donnent deux captures,
avec IDs différents. À la date maximale, si les états courants canoniques sont
identiques, utiliser cet état unique ; sinon retourner une ambiguïté bloquante
et demander de sélectionner explicitement le fichier faisant autorité pour le
courant. Aucune préférence lexicale, ordre de sélection ou filename implicite.

Le service accepte ensuite une option `currentSourceId` limitée aux candidats
de date maximale. Recalculer/valider le plan avec ce choix ; toute incompatibilité
Actuals reste un rejet, même si l'utilisateur a choisi son courant. Ce choix ne
permet jamais d'effacer une branche divergente. Les filenames servent uniquement
à reconnaître les sources dans l'aperçu ; le choix utilise leur identité canonique.

### Doublons exacts : signaler et dédupliquer la migration

Même `exportedAt` + même document métier canonique migré = une source unique,
une capture. Signaler les fichiers doublons dans l'aperçu, avec compte des
fichiers reçus et des sources uniques. Comparer le contenu canonique complet,
y compris histoires Actuals et evidence/provenance legacy, pas les forecasts
seuls, les noms ou les timestamps. Les différences de whitespace/ordre des
clés JSON ne créent pas une photographie. Les versions d'enveloppe sont
conservées dans le rapport mais pas utilisées pour distinguer deux états
migrés exactement équivalents. Les defaults de migration font partie de l'état.
Même état à dates différentes : captures distinctes. Même date, états différents :
captures distinctes sous réserve de compatibilité historique.

### Portfolio snapshotId : SHA-256 du contenu canonique source

Proposer `historical-backup-v1:<sha256-hex-complet>` calculé sur UTF-8 d'un
objet à domaine/version explicite contenant `exportedAt` et les inputs métier
canoniques complets décodés (`encodePlanningInputs`, incluant les histoires V5).
Canonicalisation : clés d'objets triées, tableaux du DTO canonique conservés,
aucune conversion des rational strings vers Number. Versionner cette convention
pour qu'une future normalisation ne change pas rétroactivement ses identités.
Le hash n'inclut ni filename, ni ordre de sélection, ni clock, ni forecast recalculé.

SHA-256 asynchrone via Web Crypto est compatible navigateur et tests ; service
async pur au sens absence de DOM, stockage, session globale et effets métier.
Comparaison des octets canoniques en plus du digest lors de déduplication ;
même digest avec contenu différent → erreur de collision, jamais sélection
silencieuse ni suffixe aléatoire. Tester ce chemin avec un hasher injecté.
Les UUID aléatoires rendent les reprises non reproductibles ; un compteur après
tri change à l'ajout d'une source et n'identifie pas un import répété.
Cette identité reste opaque, indépendante du timestamp. Un merge relancé sur
les mêmes sources reconstruit les mêmes IDs et remplace un document, sans append
à la session existante. Un futur moteur ne garantit pas le même forecast ; le
forecast stocke sa propre version, les IDs identifient les photographies sources.

## 5. Validation individuelle, projection et capture

1. Copier/lire toutes les sources en mémoire. Vérifier N ≥ 1, enveloppe et codec
   applicable ; conserver leur index/sourceId pour diagnostics.
2. Ne pas assimiler « décodeur legacy tolérant » à « source historique intègre ».
   Les lecteurs V1–V5 peuvent réparer les couleurs et pruner des catalogues.
   Le merge ajoute un préflight de migration explicite : defaults absents
   autorisés par la version (activation V1, couleurs anciennes), signalés dans
   le résumé ; couleur fournie invalide, référence invalide, association invalide,
   catalogue orphelin qui serait perdu, champ métier discarded ou normalisation
   destructive → rejet. Préserver les normalisations Domain lossless (ex. tri
   des capacités), sans perdre de valeurs. Ne pas appeler aveuglément le mode
   strict V5 sur un DTO V1 brut. Valider le DTO migré en mode strict commun.
3. Construire la projection de **chaque** état décodé sans publier de session.
   Factoriser le noyau existant horizon/reconstruction/occupation/recompute dans
   Application, consommé par `buildPlanningSessionProjection` et par le merge.
   Ne pas importer Main/adapters/geometry depuis Application, ni dupliquer les
   règles Actuals-aware. La projection UI existante avec viewport fixe peut
   servir aux tests d'équivalence et au preflight final.
4. Appeler exactement `capturePortfolioSnapshot` avec cet état, ce result,
   cette reconstruction, l'ID source et son exportedAt. Capturer avant toute
   consolidation ; ne jamais construire la projection T1 à partir de T3.
   Captures issues d'un ancien backup = reconstruction avec le moteur 11A
   actuel, pas affirmation d'un résultat sauvegardé par un ancien exécutable.
5. Conserver tous les inputs historiques (y compris objets devenus absents),
   métriques exactes Actuals/RAF/EAC, actualsKnowledge, priorité, dates/reasons,
   versions engine/forecast/inputs et evidence V4 via le helper.

Un défaut de codec, Actuals, priorité, référence ou projection abort la totalité.
Des diagnostics ordinaires du moteur (overcapacity, horizon incomplet, etc.)
restent des résultats valides avec reasons ; ils ne sont pas des erreurs de
calcul. Aucun merge partiel ou tentative de « réparer pour continuer ».

## 6. Histoires V5 : comparaison canonique et chaînes

Indexer chaque snapshot Actuals par `(kind, objectId, snapshotId)` et aussi par
ID global pour vérifier que l'owner/kind n'a pas changé. Comparer tous les
contenus partagés, pas seulement le dernier snapshot ni l'égalité d'ID.
Canonicaliser depuis le DTO exact : version, knowledgeDate, participation,
retiredZeroTeams, presence/absence de coverage, bornes coverage, périodes
(IDs, dates, ordre chronologique), consumed par Team et rational string,
RAF Project par Team, owner/kind et snapshotId. Les listes qui sont des ensembles
ou des mappings (participation, retired, RAF, consumed) se comparent par TeamId,
les chronologies restent ordonnées. Un changement de periodId est un changement
canonique même si les totaux coïncident. Toute propriété métier future doit
entrer dans cette comparaison ; pas un digest des seules métriques.

Message de divergence :
`Historical Actuals snapshot project:P1:v1 differs between backups.`
Joindre sources concernées et chemin du premier écart ; même règle Reservation.

Après tri chronologique, chaque histoire présente pour un même owner doit être
un préfixe exact de la suivante (égalité autorisée). Le domaine vérifie aussi
versions depuis 1, trous, IDs dérivés, knowledgeDate non décroissante,
partition, transition de membership et périodes. Rejeter branche divergente,
ID recyclé, ordre différent ou rollback vers une histoire plus courte, même
si une autre source fournit une histoire plus longue. À timestamp égal, comparer
les histoires sans imposer un ordre arbitraire : elles doivent être imbriquées
par préfixe ; l'état choisi comme courant doit contenir la chaîne maximale.

Pour les propriétaires courants, l'histoire du dernier état doit déjà contenir
les préfixes nécessaires. Garder cette chaîne unique exactement ; ne pas
concaténer `[A1] + [A1,A2]`, ni enrichir son dernier snapshot à partir d'un
backup antérieur. Aucun changement du RAF/membership/Actuals courant de T3.
Une source V4 garde `legacy-v4` frozen evidence ; V5 n'efface pas cette evidence
historique et ne la convertit pas en snapshot synthétique. Le passage legacy →
V5 explicite est accepté. Le passage inverse pour un owner continu est rejeté
comme régression de connaissance ; ne pas confondre migrations et branches.
Les cumuls legacy peuvent évoluer entre sources et ne sont jamais sommés.

## 7. Objets, identités et limite bloquante du V6 actuel

Les catalogues ne doivent pas être égaux entre fichiers. P3 absent à T1 puis
présent T2/T3 est valide. P2 sans source V5, présent T1/T2 puis absent T3, garde
ses inputs/capture ; même principe pour Teams, Programs et Pas historiques.
Les inputs autonomes legacy peuvent préserver une evidence V4 sans propriétaire
courant. Ne pas réintroduire des objets historiques dans le current pour rendre
le document décodable. Les cinq ensembles d'IDs des captures réservent ensuite
les identités conformément à 11A, y compris après export/import et reload.

**Limite établie :** si P2 possède une référence V5 dans S1/S2 et n'existe plus
à T3, `hydrateHistoricalInputs` échoue : il recherche P2 exclusivement dans
`current.portfolio.projects`. Même problème pour Reservation. Le V6 ne comporte
aucun registre Actuals détaché. Les protections de suppression 11A rendent ce
cas impossible dans une trajectoire normale continue actuelle, mais des fichiers
externes valides pris séparément peuvent le présenter. La validation de chaque
fichier ne garantit pas que leur union soit représentable.

Copier la chaîne dans chaque capture viole le contrat de préfixe partagé ;
remettre P2 en courant viole current = T3 ; fabriquer une evidence V4 ou un ID
viole la provenance. Aucun de ces contournements n'est acceptable.

### Décision métier/format requise avant READY

- **Option A, minimale avec V6 strict inchangé :** considérer l'absence d'un
  propriétaire historique V5 comme incompatibilité de trajectoire, rejet complet
  explicite. Supporter les créations/suppressions représentables et les protections
  11A existantes. Cette option réduit l'exigence générale « absent du courant ne
  doit pas invalider son existence historique » ; elle nécessite accord utilisateur.
- **Option B, couverture générale recommandée si cette exigence est impérative :**
  archive partagée d'Actuals pour les propriétaires historiques absents, séparée
  du Portfolio courant, indexée kind/owner et validée en préfixes. Étendre le
  résolveur commun, les codecs et la réservation d'identités. Un **V7** explicite
  est préférable car le lecteur V6 actuel refuse tout champ supplémentaire ;
  appeler cela V6 modifié créerait une incompatibilité avec 11A déjà audité.
  Cela nécessite accord de changement de format/scope, puisque le besoin demande V6.

Le plan recommande A seulement si les historiques attendus respectent les
protections existantes ; sinon B. Il ne choisit pas silencieusement une restriction
ou une évolution de format. Ce point suffit au verdict BLOCKED.

### Recyclage d'IDs et limites des preuves disponibles

Les backups ne portent ni lineageId ni identité immuable d'entité autre que
l'ID. Le nom, la couleur, la capacité, le RAF, les associations et l'activation
sont éditables ; leur égalité ne prouve pas une même identité et leur changement
ne prouve pas un recyclage. 11A réserve les IDs dans un document avec captures,
pas rétroactivement dans des backups exportés avant cette fonctionnalité.

Politique proposée : vérifier les kinds et signatures V5 communes, refuser une
réapparition observée d'un même ID après absence dans un backup intermédiaire
pour chacun des cinq kinds (recyclage potentiel), sans remappage automatique.
Accepter les évolutions métier d'un ID continûment présent sous une déclaration
explicite unique dans l'aperçu : « Ces sauvegardes proviennent du même planning
et les IDs communs désignent les mêmes objets. » Sans cette déclaration, ne pas
persister. Le service reçoit `sameLineageConfirmed`; l'UI explique la limite.
C'est une attestation de provenance, pas une preuve calculée ; même nom/ID seuls
ne sont jamais présentés comme une garantie. Une suppression/recréation entre
exports sans trace d'absence demeure indétectable. La review doit accepter ce
niveau de garantie ou demander une source externe de lineage ; un nouveau
lineageId ne peut pas réparer rétroactivement les fichiers legacy.

## 8. Frontière Application et déroulé atomique

Proposition conceptuelle (à préciser après arbitrage du §7) :

`prepareHistoricalBackupMerge(documents, options) -> Promise<MergePreparation>`

Sources `{document: string, label?: string}` ; options explicites de choix du
current et d'attestation de lineage, hasher injectable pour tests.
Résultat discriminé : `invalid` avec erreurs structurées, `needs-resolution`
avec candidats maximums, ou `ready` avec état immuable et résumé/provenance.
Les diagnostics portent source index/ID, code, owner/snapshot/path et message.
Labels informatifs exclus des hashes/choix automatiques. Une préparation sans
attestation peut produire l'aperçu, mais jamais un résultat persistant autorisé.
La fonction pure ne lit ni DOM, ni localStorage, ni clock globale, ni session.
Elle est réutilisable par d'autres clients, sans devenir un framework de migration.

Pipeline : decode/preflight tous → identité canonique/doublons → choix courant
→ compatibilité complète → captures propres à chaque source → assembly depuis
clone du courant retenu + captures triées via `comparePortfolioSnapshots` →
validation de chaque capture contre l'état final → encode/decode V6 exact et
preflight de projection final → résumé ready. Les résultats intermédiaires
restent privés ; seules les sources uniques produisent une capture.

Le writer Main réutilise le store et le reload de l'import actuel. Factoriser
au besoin son chemin « état validé → confirmation → encode → store.write →
reload », sans affaiblir le simple Import. Préparer tous les octets validés avant
l'unique `write`. Une erreur sur N, un conflit, Cancel ou quota/error de stockage
ne modifie ni session ni clé, et ne reload pas. `setItem` constitue l'unique commit
local ; après son succès, reload une seule fois. Un échec de reload est signalé
comme document sauvegardé nécessitant rechargement, pas comme rollback fictif.

Aucun fichier source sur disque n'est écrasé. Geler le candidat et son résumé,
invalider l'aperçu après changement de sélection/résolution ; une confirmation
porte sur ce candidat exact. Recontrôler le document local ou la révision depuis
le début de la préparation pour éviter d'écraser une édition concurrente ; si
elle a changé, reprendre la préparation/confirmation. Ne pas modifier la session
avant la réussite de persistance. Bloquer les soumissions concurrentes.

## 9. UX minimale

Planning Settings : bouton séparé **Merge historical backups**, input JSON
`multiple`, statut lecture/validation puis panneau de résumé/confirmation.
Ne pas réutiliser l'intitulé Import planning pour cette action.

Exemple : « 3 fichiers / 3 sources uniques — 2026-06-01, 2026-07-01,
2026-08-01. Current after merge: 2026-08-01. Portfolio snapshots to create: 3. »
Afficher date/heure précise et timezone de présentation, noms informatifs,
doublons et defaults legacy appliqués. Même maximum ambigu : sélectionner le
current parmi les sources concernées, revalider et actualiser le résumé.
Afficher tous les conflits détectés avec source/owner/ID ; aucun bouton Confirm
actif tant qu'une erreur/ambiguïté/attestation requise reste ouverte.

Confirmation explicite : remplacement de toutes les données courantes et de
l'histoire de la session locale par le document consolidé ; brouillons abandonnés
au reload. Les drafts existants ne participent pas au calcul. Cancel laisse tout
intact. Après succès, statut puis reload selon l'import ; export normal fournit
ensuite le backup consolidé. Pas de preview de graphes ni comparaison détaillée.

## 10. Matrice de tests et critères d'acceptation

| Cas | Assertion requise |
| --- | --- |
| N = 0 / 1 / N > 3, permutations | 0 rejeté ; 1 crée une capture + courant identique ; aucune borne à 3 ; résultat/IDs/ordre indépendants de la sélection. |
| Happy path V5 T1/T2/T3 | Current T3 exact, chaîne `[A1,A2,A3]` unique, sources S1→A1/S2→A2/S3→A3, aucune somme entre fichiers. |
| Forecast drift | RAF/priorités/capacités/working pattern/Reservations différents : chaque capture égale une capture isolée de sa source et diverge quand attendu. |
| V1–V6 dates | Date exacte du champ ; absent/invalide/non canonique rejeté ; V5 borne knowledgeDate préservée, V6 sans borne technique. |
| V4 → V5 mix | S1 legacy frozen evidence/provenance, S2/S3 V5 prefix, aucun ID synthétique ni réconciliation ni double comptage. |
| Conflits Project et Reservation | Même ID différent pour chacun des champs canoniques → message précis, rejet intégral ; mêmes totaux mais partition/RAF différent rejetés. |
| Chaînes | Trous, owner/kind changé, snapshotId/periodId recyclé, knowledge chronology inverse, rollback/préfixe divergent rejetés ; égalité et extensions valides. |
| P3 créé plus tard | Absent des inputs/forecast S1, présent dans S2/S3 et courant. |
| P2 supprimé sans V5 | Présent S1/S2, absent courant ; identities historical réservées. |
| P2/Reservation supprimé avec V5 | Sous A : rejet atomique documenté ; sous B : archive partagée, références exactes et current inchangé (tests/format à finaliser après décision). |
| Teams/Programs/Pas historiques | Listes différentes autorisées quand références valides ; cinq kinds protégés après reload et création d'entités. |
| Recyclage | ID absent puis réapparu rejeté ; évolution d'un nom continu autorisée sous attestation ; refus de persister sans attestation. |
| Same exportedAt | États compatibles différents → deux captures/IDs ; maximum différent exige choix ; choix incorrect/hors candidats rejeté ; préfixes incompatibles rejetés malgré choix. |
| Exact duplicate | Whitespace/key order ignorés ; mêmes inputs/date → signalement + une capture ; timestamp seul ne déduplique pas ; date différente conserve deux captures. |
| Collision hash | Digest simulé égal/contenu différent → erreur ; zéro fallback aléatoire ; IDs reproductibles. |
| Invalid middle backup | T1/T3 valides, T2 invalide pour codec/projection/Actuals/priorité/reference/association → pas de ready, aucune écriture/reload/publication. |
| Sources V6 | Histoire vide acceptée ; non vide valide rejetée explicitement sans perte ; V6 invalide rejeté comme invalide. |
| Exact rationals | Fractions non décimales et grands entiers restent exacts dans inputs/Actuals/RAF/EAC et canonicalisation. |
| Immutabilité | Modifier buffers/DTOs sources après préparation n'altère aucune capture/current ; deep freeze, pas d'alias entre sources. |
| Round-trip final | encode V6 → decode → encode à exportedAt fixe : égalité exacte du document consolidé et de chaque préfixe/métrique. |
| Atomicité UI/store | Cancel, erreur tardive, quota, stale session, double click : aucun changement avant commit ; succès une écriture/un reload ; reload failure distinct. |
| Non-régression 11A/import | Save conserve son chemin sans recompute ; capture même définition ; import simple inchangé ; downgrade/history protections et tri inchangés. |

Tests Application sans DOM pour calcul/compatibilité ; tests Main avec store,
confirmation et reload injectés ; tests UI ciblés sur multi-file, résumé,
résolution et refus/confirmation. Après implémentation autorisée : typecheck,
suite complète, build, diff check et review visuelle desktop/narrow du flux.
Pas de test supplémentaire ni exécution de build nécessaire pour cette passe
documentaire ; la validation présente consiste à inspecter sources et diff.

## 11. Séquence future et documentation

1. Décider §7 : restriction explicite V6 (A) ou archive/format évolué (B), et
   accepter la politique de lineage historique ; réviser le plan avant code.
2. Ajouter lecture des métadonnées validées et préflight lossless legacy ;
   factoriser la projection Application sans changement de règles.
3. Implémenter canonicalisation, déduplication/IDs et compatibilité des préfixes.
4. Assembler et valider un candidat immutable avec le helper de capture 11A.
5. Ajouter le flux minimal Main/UI et l'unique commit de stockage.
6. Couvrir la matrice, vérifier gates et documenter l'implémentation avant audit.

Cette passe ajoute `docs/steps/PORTFOLIO_SNAPSHOTS/lot11a1_plan.md` et met à jour
`docs/current_plan.md` uniquement. Elle ne modifie pas le canon 11A audité,
les codecs, tests, schémas, UI ou session. Le statut ancien IN REVIEW dans le
canon 11A est un compte rendu au moment de l'implémentation ; la roadmap
actualisée reconnaît l'audit positif fourni par l'utilisateur.

**Verdict : 11A.1 PLAN: BLOCKED.** Les politiques V6 source, timestamp maximal,
doublons et snapshotId sont proposées explicitement. L'arbitrage bloquant est
la représentation des propriétaires historiques V5 absents du current tout en
exigeant V6 strict et current = dernier état. L'acceptation de l'attestation de
lineage constitue également un point de review métier. Aucun code ne doit être
commencé avant cette décision et la révision correspondante du plan.
