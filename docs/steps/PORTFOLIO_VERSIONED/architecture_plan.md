# Portfolio versionné — plan architectural et faisabilité

Statut : **PLAN ONLY — aucun lot nouveau commencé, implémenté ou DONE**.
Consolidation après audit et 15 arbitrages définitifs : 2026-10-10. Mission strictement documentaire ; ce document ne
constitue ni autorisation de coder, ni migration, ni certification du modèle cible.

## 1. Autorité, baseline et méthode

Dépôt `kartaguez/FlowPlan2`, branche `codex/lot11a-portfolio-snapshots`.
SHA initial réel et baseline documentaire demandée :
`c2e32fd5560074aad8822e853c582512f49811a8`.
Branche exacte et HEAD vérifiés avant modification ; `git fetch origin` réussi,
working tree propre et divergence HEAD/origin **0/0** après fetch. Baseline inchangée.
Aucun AGENTS.md trouvé dans le dépôt ou les parents vérifiés. Aucun reset,
changement de branche, modification de code/test/codec/schéma/dépendance.
Seuls ce plan, current_plan et current_canon sont modifiés. Le SHA final est
communiqué après commit/push ; pas d'auto-référence dans le commit.

Les règles **cibles validées** sont les décisions T01–T15 de §5 et les
invariants I01–I23, amendés par ces décisions définitives. Les contrats **livrés** restent ceux du
[canon](../../canon.md) et du [current canon](../../current_canon.md).
Une recommandation ici n'est pas une décision utilisateur ni un invariant livré.
Le [current plan](../../current_plan.md) pointe cette nouvelle trajectoire.

Sources documentaires prioritaires examinées :

- [10C.1 canon](../ACTUALS/lot10c1_canon.md) et [plan](../ACTUALS/lot10c1_plan.md), avec les amendements ultérieurs ;
- [11A canon](../PORTFOLIO_SNAPSHOTS/lot11a_canon.md), [plan](../PORTFOLIO_SNAPSHOTS/lot11a_plan.md) et [11A.2](../HISTORY/lot11a2_canon.md) ;
- [11C canon](../HISTORY/lot11c_canon.md) et [plan](../HISTORY/lot11c_plan.md) ;
- [11D.0 canon](../STORAGE/lot11d0_canon.md) et [plan](../STORAGE/lot11d0_plan.md) ;
- [11D.1 RAF canon](../ACTUALS/lot11d1_raf_model_canon.md), [plan](../ACTUALS/lot11d1_raf_model_plan.md), [UX canon](../ACTUALS/lot11d1_ux_canon.md) et [plan UX](../ACTUALS/lot11d1_plan.md) ;
- [11D.2 plan](../STORAGE/lot11d2_plan.md), [faisabilité](../STORAGE/lot11d2_feasibility.md), résultats et mesures référencés dans ce rapport.

Lecture du code en consultation uniquement. Les tests cités ci-dessous sont des
points d'appui existants ou des validations **à écrire/exécuter ultérieurement**.
Aucun résultat d'implémentation ancien n'est présenté comme une exécution de cette
mission. Les gates de ce plan restent à démontrer.

## 2. État réel et changement de trajectoire

| Repère | Contrat réel à cette baseline | Conséquence cible |
| --- | --- | --- |
| C01 | `src/domain/model/entities.ts` : Portfolio contient les objets complets, requirements et capacitySchedule ; Program/Pas sont des catalogues sans versions. `src/domain/capacity/reservation.ts` contient les allocations. | Nouvelle identité/version séparée pour chaque entité ; ne pas renommer les structures en prétendant avoir normalisé. |
| C02 | `src/domain/actuals/snapshots.ts` : histoire complète object-scoped, versions consécutives, participation/retiredZeroTeams, coverage optionnelle, RAF historique Project. Un periodId réutilisé avec dates **ou consommation** différentes est refusé. | ActualPeriod/SubPeriod/TeamActual séparés ; nouveau contrat d'identité. |
| C03 | `src/domain/actuals/transition.ts` : preuve cellules/RAF, érosion/extension/remplacement, zéros propagés dans une zone déjà entièrement zéro ; retrait refuse le non-zéro courant. | Confirmation ciblée à conserver ; protection du non-zéro dans **toute** l'histoire à renforcer. |
| C04 | `src/application/session/planningSession.ts`, `projectCurrentRaf.ts` : requirements seuls propriétaires du RAF courant ; A indépendante, R2 no-op/RAF/publication Actuals ; base RAM immutable, R1 conditionnelle. | PTEC remplace cette autorité sans recopier un RAF vivant dans ActualPeriod ou TeamActual. |
| C05 | `src/domain/actuals/reconstruction.ts` : distribution par capacité effective, puis jours éligibles, puis jours civils ; source courante seule, somme exacte ; contributions quotidiennes dérivées. | Résoudre capacité et Planning depuis le même manifeste. Ne pas stocker les contributions. |
| C06 | `src/domain/actuals/projectActualsKnowledge.ts`, `src/domain/planning/engine.ts` : borne inclusive globale **par Project**, zéro couvert compris ; admission et Mandatory respectent `date > T`. Reservation reste additive Actuals + demande Forecast. | Ajouter la borne Reservation sans changer sa configuration future. |
| C07 | `src/application/portfolioSnapshots/capturePortfolioSnapshot.ts`, `src/domain/portfolioSnapshots/portfolioSnapshot.ts` : inputs copiés, ActualsSource none/V4/V5, résolution du préfixe via propriétaire Current ; Forecast métriques et profil calculés persistés. | Manifestes autonomes inputs-only pour les nouvelles captures ; resolver sans Current. |
| C08 | `src/application/backup/planningInputCodec.ts`, `flowplanBackupV6.ts`, `flowplanBackupV7.ts`, `flowplanBackupV8.ts` : dispatch fermé, V8/inputs2/RAF2, captures mixtes historiques, V5 borne exportedAt particulière. | Nouveau variant/version explicite ; ne pas élargir silencieusement V8. |
| C09 | `src/application/persistence/planningRepository.ts`, `createPlanningRepository.ts`, `repositoryStorage.ts` : token generation/revision/currentRevision/historyRevision, CAS, receipts avant CAS, staging/read-back/activation. | Transaction des nouvelles versions + manifeste + index + receipt ; conserver sémantique des issues incertaines. |
| C10 | `src/infrastructure/persistence/indexedDbRepositoryStorage.ts` : DB schema2/data1, huit stores, transaction complète avant résolution ; worker validation et `planningStorageWorker.ts`, transfer/import/export. | Extension physique future, distincte du portable ; pas de calcul/hash/dialogue dans une transaction IDB active. |
| C11 | `src/ui/actuals/createSnapshotActualsCardController.ts`, `src/ui/project-edit/createProjectEditController.ts`, `src/ui/reservation-edit/createReservationEditController.ts`, `src/ui/timeline/createTimelineUiCoordinator.ts` : drafts locaux, Apply/Cancel par owner, confirmations et modale, garde Cancel. | Adapter les bases aux refs exactes ; préserver R1/R2/V1/V2 et Cancel S1–S6. |
| C12 | `src/application/history/repositoryHistoryReader.ts`, `historyCaptureProjection.ts`, `src/ui/history/createProjectHistoryCoordinator.ts` : History lit les résultats capturés, cache borné/epoch/token, aucune simulation. | Service historique avant activation des nouvelles captures, comparaison ensuite. |
| C13 | `src/proof/lot11d2/replay.fixture.ts`, `replay.test.ts` : preuve isolée de replay par chaîne courante, sans lecture forecast ; pas de service production. | Réutiliser oracles et dimensions, refaire preuve sur le graphe normalisé et les nouvelles règles. |

11D.2 avait validé une cible **configurations copiées dans chaque capture**,
Actuals seuls partagés, normalisation complète hors périmètre. La présente mission
remplace cette partie de cible ; elle ne retire pas la clôture G1 ni ses preuves.
11D.0 (CAS, recovery, staging, lazy History) et 11D.1 (autorité RAF, preuves,
Apply/Cancel) restent les acquis à préserver. Les anciens documents restent des
archives fidèles ; aucun canon livré n'est réécrit pour simuler une livraison.

## 3. Schéma conceptuel cible

### 3.1 Identité, version et propriété

Décision T01 ; représentation technique proposée : `EntityRef = (kind, entityId, versionId)` ; référence
exacte, jamais « latest ». Une version porte un payload complet de **son entité**,
un propriétaire immutable et une provenance. `entityId` est stable, réservé pour
la vie du référentiel ; `versionId` est unique dans cette identité, immutable et
réservé dans le candidat et rendu autoritaire seulement à la publication.
Filiation explicite obligatoire ; encodage des parents à préciser en V1.
Une séquence locale éventuelle est un index technique, jamais un sélecteur.
Une version terminale peut ne pas être courante : seul le manifeste Current
sélectionne la version courante. Ni absence d'enfant, ni timestamp, numéro ou
« latest » ne choisissent une version. La migration ne crée pas de chronologie
métier perdue ; une racine de conversion indique seulement sa provenance source.
Les IDs importés restent opaques, les collisions divergentes sont refusées.
Un hash vérifie les bytes, pas la validité métier ni l'identité.

| Entité | Identité / propriétaire | Payload versionné et références | Cardinalité / unicité cible |
| --- | --- | --- | --- |
| ProjectSettings | ProjectId stable | nom, earliest/objective/mandatory, activation Forecast, existing/deleted, ProgramId/PasId optionnels, ownColor selon Program | Une version sélectionnée par Project dans un manifeste ; noms Projects non imposés uniques. |
| ReservationSettings | ReservationId stable | nom, start/end, activation Forecast, existing/deleted, groupements/couleur | Une version sélectionnée ; demandes portées par RT, pas copiées ici. |
| TeamSettings | TeamId stable | nom, existing/deleted, visibilité réversible (T06), sans effet de calcul | Une version sélectionnée ; masquage distinct de suppression. |
| TeamCapacity | Identité dédiée à une Team, relation 1:1 stable | calendrier complet : periods inclusifs, quantités, indisponibilités, exceptions | Une version sélectionnée par Team requise ; gaps permis, overlaps refusés. Aucun ID métier de capacityPeriod imposé. |
| Program | ProgramId stable | nom normalisé, couleur, existing/deleted | 0..1 référence par Project/Reservation ; une version sélectionnée par identité. |
| Pas | PriorityFamilyId stable (nom technique conservé) | nom normalisé, existing/deleted | 0..1 référence indépendante de Program. Unicité des noms normalisés existing par catalogue (T07). |
| PT | identité stable du couple (ProjectId, TeamId) | extrémités immuables, existing/deleted, usage Forecast actif/suspendu proposé, dailyCap exact optionnel (T02) | Un seul PT pour un couple, même après retrait/réassociation. 0..N PT par Project et Team. |
| RT | identité stable du couple (ReservationId, TeamId) | extrémités immuables, existing/deleted, usage Forecast actif/suspendu proposé, demande exacte ratio OU fixed-daily | Un seul RT par couple ; 0..N ; ratio dans [0,1], fixed non négatif. |
| ActualPeriod | Identité unique par propriétaire typé Project/Reservation | couverture ou absence explicite, knowledgeDate Actuals connue ou absence documentée à la racine vide ; provenance, liste ordonnée de refs ActualSubPeriod exactes | Un ActualPeriod sélectionné par propriétaire ; période commune à ses Teams, pas période commune à tout le Portfolio. |
| ActualSubPeriod | identité stable, propriétaire = ActualPeriod **identité**, donc objet métier | dates from/through inclusives | 0..N refs dans une version ActualPeriod ; aucune identité partagée entre propriétaires. |
| TeamActual | identité du couple (PT ou RT, ActualSubPeriodId) | consommation exacte non négative ; extrémités stables | Au plus une identité par couple et une version sélectionnée par cellule requise. Elle n'appartient pas à Team seule ni à une version de dates. |
| PTEC | identité unique par PT | ETC exact, référence **version exacte** ActualPeriod du Project, open/completed | Une version sélectionnée par PT requis, associations exclues conservées incluses ; completed ⇒ ETC zéro. Aucun PTEC Reservation. |
| PlanningSettings (T02) | identité globale | horizon, working weekdays, maxParallelProjects | Une ref exacte par manifeste ; requise pour capacités/distribution/admission. |
| PortfolioOrder (T02) | identité globale | ordre structurel de tous les ProjectId, inactive/deleted inclus (T08) | Une ref exacte par manifeste ; aucune priorité dérivée d'un Program/Pas. |

ActualSubPeriod n'est pas détenue par TeamActual ; modifier ses dates publie une
nouvelle version sous la même identité pour un simple ajustement. Les TeamActual
conservent leurs identités et reçoivent les versions reconfirmées nécessaires.
Split/merge : créer des identités explicites, relier leur provenance aux anciennes,
ne jamais affecter arbitrairement une ancienne identité à deux morceaux.
T03 validé : la commande explicite distingue ajustement de bornes, split et
merge ; aucune reconnaissance par ressemblance de dates ou quantités. Un merge
crée une identité et cite toutes les périodes sources ; un split crée une identité
par morceau et cite sa source. La consommation seule versionne les TeamActual
concernés, sans changer l'identité de sous-période.
Toutes les anciennes identités/versions restent conservées.

Les statuts de lifecycle et l'activation Forecast sont deux dimensions. Un
Project inactive/existing garde ses Actuals ; deleted est absent des calculs
courants même s'il reste référencé dans le registre et les manifestes historiques.
Une quantité n'est jamais un nombre flottant : rationnels canoniques exacts,
optionnel/absence distinct de zéro, covered-zero distinct de non couvert.

### 3.2 Current et PortfolioSnapshot

Décision T04 : un manifeste contient son ID/schema, les refs exactes de
PlanningSettings/PortfolioOrder et les tables explicites de sélection des
Settings/catalogues/capacités/PT/RT/ActualPeriod/ActualSubPeriod/PTEC/TeamActual. Il ne contient ni
copies de payloads ni résultat/calendrier quotidien dérivé. La liste ordonnée des refs
ActualSubPeriod portée par ActualPeriod doit concorder exactement avec la table
de sélection SubPeriods : aucun désaccord accepté, pas de deuxième autorité.
Les indexes physiques de fermeture sont dérivés de ces références validées.

Current possède une révision CAS et un manifeste cohérent sélectionné ; les anciens
manifestes Current publiés sont conservés comme provenance technique proposée,
sans prétendre constituer des captures utilisateur. PortfolioSnapshot possède
snapshotId stable, createdAt réel ISO UTC, knowledgeDate déclarative distincte
(T09), et le même type de graphe de références. Save répété est une nouvelle
identité, pas une déduplication par date ou hash. Une capture réutilise les refs
Current validées, n'appelle pas le moteur et ne crée pas de versions métier.

Un manifeste sélectionne exactement une version pour chaque identité requise ;
aucune identité ne possède deux versions sélectionnées dans ce graphe. Les dépendances de provenance peuvent citer des versions antérieures,
qui ne remplacent jamais cette sélection. L'archive conserve aussi les versions
non référencées ; elle n'est pas chargée intégralement pour construire Current.
Les tombstones Settings et associations retirées peuvent être présentes dans les
tables sans participer aux calculs. La fermeture utile à la reconstruction inclut
les capacités/Settings des Teams masquées et toute cellule Actuals requise.

Validation du graphe, avant publication et après lecture :

1. Refs existantes, kind/propriétaire concordants, bytes intègres, payloads valides sous leur schema.
2. Aucun dangling ref, cycle interdit, doublon de sélection ni couple PT/RT/TeamActual dupliqué ; versions immuables et IDs réservés.
3. Couverture ActualPeriod égale à l'union contiguë des refs de dates ; exactement une cellule par association existante et sous-période, zéro compris ; cellules des associations retirées traitées selon statut, pas doublées.
4. Chaque PTEC sélectionné référence la version ActualPeriod sélectionnée du même Project ; ETC exact et completed cohérent ; dailyCap conservé.
5. Settings groupés résolvent le Program/Pas sélectionné ; un propriétaire existing ne réutilise pas un catalogue deleted. Un propriétaire deleted peut conserver ses refs archivées. effectiveColor dérivée ; priorités complètes suivant T08.
6. WorkingPattern, calendrier entier (hors horizon inclus), exceptions, dates contraintes, activation et demandes RT résolus du manifeste ; aucun fallback Current ou « dernière capacité ».
7. Pour reconstruction historique, aucun appel à un propriétaire Current, même après suppression/restauration ou correction ultérieure.

### 3.3 Publication, suppression, restauration et masquage

Une commande prépare en privé versions + manifeste + projection Current
nécessaire ; compare la base immutable, rassemble les preuves, valide le graphe,
puis publie **une seule transaction CAS**. Projection/RAM après commit confirmé.
No-op métier : zéro nouvelle version, zéro moteur, zéro écriture. RAF seul :
PTEC nouveau, pas TeamActual/ActualPeriod nouveau. Consommation seule : TeamActual
nouveau et PTEC confirmé si Project, même si ETC identique ; statut completed ne
change pas implicitement. Partition : ActualSubPeriod/ActualPeriod et cellules
nécessaires nouveaux, tous PTEC sélectionnés rebondés atomiquement avec preuves.

PT/RT/Team avec **une version historique** de consommation non nulle sont
non supprimables, même si leur dernière consommation est corrigée à zéro. Les
index « ever nonzero » doivent couvrir les versions non référencées, pas seulement
Current ou les captures conservées. Ils sont reconstructibles depuis le registre
et vérifiés ; ils ne remplacent pas les versions. Les références historiques
seules, toutes à zéro, ne doivent plus interdire un tombstone Team ; aucune
suppression physique de capacité, identité ou cellule n'en découle.

Supprimer logiquement Project/Reservation publie deleted, conserve tout l'historique
et retire Forecast **et Actuals** du calcul Current (règle utilisateur 11).
Cela ne supprime pas en cascade les PT/RT protégés ; les associations conservées
restent hors projection tant que le propriétaire
est deleted. Restore (T05) publie existing sous le même ID, jamais une mutation
de version deleted. Le candidat présente chaque PT/RT historique et ses charges ;
aucune ancienne association, ETC ou demande n'est réactivée par défaut. Les
associations confirmées et leurs ETC/demandes explicites sont publiées avec les
Settings dans la même transaction ; les autres restent suspendues ou tombstones
si leur suppression logique est permise par I03.
Les associations protégées non-zéro ne sont pas supprimées par effet de cascade :
leur exclusion liée au propriétaire et leur confirmation de réactivation sont
explicites dans le candidat. Les Actuals historiques restent conservés et ne
sont jamais ressaisis ni dupliqués pour restaurer. Les cellules sélectionnées
conservées sont consultables ; toute réassociation valide la partition complète.
Un objet deleted est non éditable (T15) : restore préalable, édition normale,
puis nouvelle suppression logique possible. Rétablir le rang historique (T08)
n'accorde aucune confirmation de charges. Restore Team ne réactive aucun ancien
PT/RT ;
réassociation explicite retrouve le même ID de couple et complète les cellules
sur **toute** la partition actuelle, sans reprendre une ancienne grille partielle.

Représentation technique proposée pour T05/I03 à définir précisément en V1 :
PT/RT portent un état d'usage Forecast actif/suspendu, distinct de existing/deleted.
Delete du propriétaire suspend cet usage sans supprimer une association protégée ;
restore ne le réactive que pour les associations/charges explicitement confirmées.
PTEC conserve son ETC exact, RT sa demande configurée, mais une association
suspendue n'émet aucune charge Forecast. Cet état est versionné dans l'entité,
jamais un flag volatile ou une copie dans le manifeste. Les cellules Actuals
attestées restent dans le graphe ; leur calcul suit le lifecycle du propriétaire,
indépendamment de l'activation des charges futures. Une représentation équivalente
est décidable techniquement en V1 si elle prouve ces mêmes effets et les oracles.
Les catalogues du propriétaire restauré doivent aussi être revus : restore
explicite d'un Program/Pas deleted ou choix confirmé d'une autre référence ;
jamais réutilisation silencieuse d'une identité ou fusion sur le nom.

Masquer Team (T06) est exclusivement visuel, autorisé avec ETC positif et
Reservations futures. Team, capacité, Actuals, Forecast, PT/RT et agrégats globaux
restent inchangés dans les calculs. L'interface identifie les Teams masquées et
permet de les réafficher ; aucune condition de charge future. La visibilité est
portée par TeamSettings, selon le choix technique de §3.1 ; elle est distincte de
existing/deleted. Tombstone Team reste soumis à I04, jamais le masquage.

Program/Pas (T07) : la dernière référence d'un Project/Reservation **existing**
retirée, y compris par suppression de cet objet, publie automatiquement deleted
pour le catalogue dans la même transaction. Inactive/existing compte comme usage.
Une référence conservée par un objet deleted est historique, pas un usage courant.
Les sélections courantes excluent les catalogues deleted ; leurs versions restent
résolubles dans les archives. Réutiliser l'identité impose un restore explicite.
Un nom normalisé est unique parmi existing dans chaque catalogue, indépendamment
pour Program et Pas ; conserver la convention livrée : trim, espaces consécutifs
réduits à un, clé en minuscules locale fr (`normalizeCatalogName`/`catalogNameKey`
utilisées par C01). deleted ne réserve pas le nom courant. Créer le même nom
crée un autre ID ; restaurer l'ancien ID en conflit refuse jusqu'à renommage
explicite ou résolution de l'autre entité. Aucune fusion. Restore et réutilisation
peuvent être préparés atomiquement afin que le catalogue restored soit utilisé
dans l'état publié ; aucun état intermédiaire contournant la règle usage-driven.

PortfolioOrder (T08) conserve tous les ProjectId créés, inactive/deleted inclus,
une seule fois. Création insère explicitement, réordonnancement est une commande ;
delete/inactive/restore ne déplacent personne. La projection métier filtre les
Projects exclus après résolution de l'ordre structurel, avant allocation.

## 4. Matrice des 23 invariants : code, écarts et validations

Légende : **C** compatible tel quel pour la règle métier citée (représentation
versionnée encore nouvelle) ; **A** adaptation requise ; **M** contradiction ou
règle manquante. V1–V7 désignent les lots futurs de §8, pas les formats backups.

| N° / décision utilisateur | État / repères existants | Écart ou règle cible à respecter | Validation proposée / lot |
| --- | --- | --- | --- |
| I01 partition contiguë | C : C02 validateBase | Même invariant, refs exactes au lieu de payload inline. | Trou/overlap/fin/début/bissextile, refs permutées : refus ; V1/V2. |
| I02 cellule complète zéro compris | A : C02 participation + consumed | Couverture alignée PT/RT existants, unicité stable TeamActual ; retired distinct. | Matrice N×S complète, doublon/absence/zero, réassociation B02 ; V1/V3. |
| I03 PT/RT historique non-zéro protégés | M : C03 protège non-zéro **courant** ; pas d'entité association | Scanner/indexer toute histoire, y compris corrigée/non référencée. | Positif→zéro→retrait refusé ; V1/V2/V3. |
| I04 Team protection/masquage | M : removeTeam C04 bloque toute référence, même zéro ; pas masquage | Tombstone zéro autorisé avec refs conservées ; non-zéro interdit ; hide purement visuel sans condition de charge (T06). | B05, zéro historique, ETC>0, ratio/fixed future ; V1/V3. |
| I05 correction TeamActual + ETC Team | A : C03/C04 R1 consommation ciblée | Stable ID/cellule versionnée ; Reservation sans ETC, preuve consommation seule. | Une Team changée, autre inchangée, preuve stale ; V1/V3. |
| I06 partition + confirmations | A : C03/C04 R1 toutes Teams | Nouveau AP et rebond de tous PTEC y compris completed, T10. | Split/merge/dates, confirmations distinctes du texte ; V1/V3. |
| I07 PTEC tous sur AP courant | M : pas PTEC, RAF requirements indépendant | Nouvelle égalité de référence, **pas** égalité numérique permanente avec RAF ancien. | PTEC oublié/période autre Project refusé ; V1/V3. |
| I08 completed zéro / reopen | M : engine complete dérivé, aucun statut persistant PTEC | Distinguer complétion métier de complétion du run ; réouverture explicite. | B07, completed + ETC positif refusé, action reopen ; V1/V3/V4. |
| I09 demandes Reservation indépendantes | C : C01/C03 allocations ≠ consommations | RT versionné reste inchangé lors de corrections Actuals. | Demande avant/après correction strictement égale ; V3/V4. |
| I10 Forecast après Actuals | M partiel : C06 Project C, Reservation contradiction | Borne par propriétaire commun à ses Teams ; exclure demande Forecast Reservation jusqu'à T. | Tous jours positifs, covered-zero, ratio/fixed, overload/deadline ; V4. |
| I11 inactive vs deleted | A : C01/C05 inactive déjà Forecast seul, pas deleted | Filtrer deleted avant occupation, facts et moteur ; jamais filtrer inactive des Actuals. | B04/B09, impacts capacity/metrics, historique indépendant ; V3/V4/V6. |
| I12 restore existing nouveau | M : C04 suppressions physiques ou refus | Restore contrôlé sous ID retenu, revue PT/RT et charges, aucune réactivation implicite (T05/T15). | Capture avant/après delete/restore, refs bytes intactes ; V1/V3. |
| I13 restore Team sans associations | M : pas restore | TeamSettings seule ; PT/RT restent tombstones. | Aucun RAF/demande revenant au restore Team ; V3. |
| I14 réassociation stable + couverture | A : C02 retired/reintroduced valeurs explicites | ID couple permanent, cellules sur nouvelles sous-périodes aussi. | B02 et unicité après plusieurs cycles ; V1/V3. |
| I15 earliest borne Actuals | M : C02/C04 Actuals peuvent être hors dates planning | Changement earliest incompatible doit être opération composite confirmée ou refusée ; objective/mandatory sans clipping. | B01, dates absentes/égales, limite impossible ; V1/V3. |
| I16 raccourcissement reconfirmé | A : C03 erosion conserve zones non changées | Pas prorata ni cellule courante attachée à portion exclue ; archive intacte, T11. | Quantités reconfirmées sur nouveau intervalle, orphan courant refusé ; V3. |
| I17 extension début saisie explicite | A : C03 extension preuves | earliest plus tôt n'invente pas d'Actuals ; extension de couverture si demandée exige cellules explicites, zéro autorisé. | B01, aucune propagation zéro sur zone nouvelle non confirmée ; V3. |
| I18 objective sans extension auto | C : C01/C04 objective descriptive | Settings nouveau seulement ; AP/TA inchangés. | Comparaison refs avant/après, aucun draft Actuals publié ; V3. |
| I19 graphes complets | M : C07 copies + préfixes via Current | Manifestes/ref closure autonome, toutes dimensions moteur. | Résolution sans Current, suppression capture/source, ref manquante ; V1/V2/V6. |
| I20 capacités versionnées sélectionnées | A : C05 capacité de Portfolio résolu, C07 copie historique | TeamCapacity + PlanningSettings exacts ; aucun latest fallback. | B06 conservation rationnelle/daily weights différents ; V4/V6. |
| I21 CAS/recovery publication atomique | A : C09/C10 acquis compatibles | Élargir write set ; mêmes garanties receipts/unknown/reload. | Abort/ack perdu/postcommit/RAM reconcile échoué/two tabs ; V2/V5. |
| I22 migration V4–V8 vérifiée atomique | M : C08/C09 staging déjà livré | Conversion de toutes captures obligatoire ; M01–M04 bloquants, activation tout ou rien, aucune exemption legacy-only. | §7 corpus, interruptions/quotas/concurrent writes ; V2/V5. |
| I23 knowledgeDate déclarative ≠ createdAt | M : C07 createdAt seul au niveau Portfolio | Date déclarative ≥ max fin des couvertures sélectionnées ; sans couverture, aucune borne Actuals. Legacy inconnue reste absente (T09). | B08, mêmes dates/horloge reculée/bornes legacy ; V1/V2/V7. |

## 5. Décisions utilisateur définitives T01–T15

Ces décisions remplacent les options du plan initial. Aucune ne reste à ratifier.
Les encodages, indexes et budgets sont des propositions techniques ; les cas
historiques impossibles sont des bloqueurs, jamais des exceptions tacites.

| ID | Décision validée | Application / preuve principale |
| --- | --- | --- |
| T01 | IDs opaques, identité stable, versions immuables, filiation explicite, collisions divergentes refusées ; Current seul sélecteur courant | §3.1–3.2 ; terminal ≠ courant, B13 ; V1/V2 |
| T02 | PlanningSettings et PortfolioOrder distincts versionnés ; dailyCap dans PT, ETC et open/completed dans PTEC | §3.1 ; manifestes refs seules ; V1/V4 |
| T03 | Ajustement dates même SubPeriodId ; consommation nouvelle TeamActual ; split nouvelles identités, merge nouvelle identité, sources explicites | §3.1 ; pas de filiation déduite ; B03/B22 ; V1/V3 |
| T04 | Tables de refs exactes, une version sélectionnée par identité, fermeture validée, sans payload ni fallback ; indexes dérivés | §3.2 ; I19/B12/B13 ; V1/V2/V6 |
| T05 | Restore Project/Reservation sous identité historique, version existing, revue/confirmation associations et ETC/demandes, historique intact, publication atomique | §3.3 ; I12/B04/B16 ; V3 |
| T06 | Masquage exclusivement visuel, réversible et identifiable, permis quelle que soit la charge ; calculs et agrégats intacts | §3.3 ; I04/B14 ; V3/V4/V7 |
| T07 | Program/Pas usage-driven : auto-deleted dans transaction de dernière référence existing ; historique intact, restore explicite, noms courants uniques sans fusion | §3.3 ; B15 ; V1/V3 |
| T08 | Ordre structurel garde inactive/deleted, filtre en projection, restore au rang historique sans charges implicites ni déplacement d'autrui | §3.3 ; B16 ; V1/V4 |
| T09 | Nouvelle capture : knowledgeDate déclarative ≥ dernière couverture Actuals ; distincte de createdAt, égalité entre captures et recul permis ; ancienne date inconnue non inventée | §5.1 ; I23/B08/B17 ; V1/V2/V7 |
| T10 | Nouvelle version AP : tous PTEC rebondés, completed conservé avec ETC zéro explicitement reconfirmé ; reprise uniquement via reopen | §5.2 ; I06–I08/B07/B18 ; V1/V3 |
| T11 | Raccourcissement : présenter période, préremplir seulement si correspondance non ambiguë, reconfirmer chaque consommation, correction à zéro permise, aucun prorata | §5.3 ; I15–I18/B01/B19 ; Settings/AP/TA/PTEC atomiques ; V3 |
| T12 | Conversion obligatoire de toutes captures V4–V8, validations d'origine, sans résultats calculés ni données inventées ; non-convertible bloque tout dépôt | §7.1 ; I22/B10/B20–B23 ; staging/recovery scellé distinct de l'autorité ; V2/V5 |
| T13 | Chaque Project a toujours AP stable/version immuable ; vide sans dates, sous-périodes ou TA, tous PTEC pointent dessus ; première saisie nouvelle version | §5.1 ; B17 ; V1/V2/V3 |
| T14 | Tous PTEC migrés V4–V8 open, ETC exactement conservé, zéro ne signifie pas completed ; aucun statut inféré du moteur | §7.1 ; B18 ; V1/V2 |
| T15 | Project/Reservation deleted non modifiable ; restore explicite puis édition normale, suppression de nouveau possible ; aucune charge réactivée automatiquement | §3.3 ; B09 ; V3 |

### 5.1 Couverture vide et deux temporalités

AP vide d'un Project : identité stable, version immuable, couverture absente,
refs SubPeriod et cellules TeamActual vides, aucun from/through fictif. Les PTEC
du Project, y compris ceux conservés pour les associations exclues, pointent
la version sélectionnée, vide ou couverte. Première consommation (zéro explicite
compris) publie une nouvelle version AP avec couverture, cellules et PTEC confirmés.
Une racine vide antérieure à toute connaissance ne prétend pas avoir une date
Actuals ; elle se distingue d'une ancienne version V5 uncovered dont la
knowledgeDate connue est préservée. Aucun AP antérieur artificiel n'est ajouté
à l'histoire d'un Project migré déjà couvert.

Pour une **nouvelle** PortfolioSnapshot, soit D l'ensemble des through des AP
sélectionnés ayant une couverture, y compris zéro couvert, propriétaires inactive
ou deleted sélectionnés et Teams masquées. knowledgeDate est une date civile
choisie explicitement : si D non vide, knowledgeDate ≥ max(D). Si D vide, aucune
borne issue des Actuals ; la date reste obligatoire et déclarative, jamais
préremplie comme un fait confirmé. Aucun lien d'ordre avec createdAt, aucune
monotonie entre captures, même date autorisée pour des IDs distincts. Une ancienne
capture convertie conserve l'absence explicite de knowledgeDate Portfolio :
c'est une absence historique T09, pas une nouvelle capture à date inventée.
Tri technique de consultation proposé `(createdAt,snapshotId)` ; une vue par
knowledgeDate doit conserver les égalités et distinguer les inconnues.

Contraintes Actuals **déjà validées** conservées : `through <= knowledgeDate`
pour chaque version couverte ; knowledgeDates connues non décroissantes sur la
filiation Actuals. La racine vide sans connaissance n'introduit pas de comparaison
fictive. Import V5 standalone conserve knowledgeDate ≤ date UTC exportedAt.
11A/V6–V8 ne bornent pas les dates Actuals par createdAt/exportedAt ; horloges
égales/rétrogrades et V4 futurs restent acceptés selon leur validation d'origine.
V4 n'a pas de knowledgeDate Actuals attestée : le cas est bloquant §7.1, pas une
permission d'en fabriquer une à partir de through.

### 5.2 Transitions PTEC autorisées

| État de départ | Commande / préconditions | État de sortie |
| --- | --- | --- |
| open | Modifier ETC avec preuve requise ; ETC exact ≥ 0 | open, même si ETC devient zéro |
| open | complete explicite et confirmation ETC zéro | completed, ETC zéro ; positive sans mise à zéro explicitement confirmée refusée |
| completed | Nouvelle version AP, confirmation explicite du zéro | completed, ETC zéro, ref nouvel AP ; tous PTEC concernés atomiques |
| completed | Modifier ETC à une valeur positive sans reopen | Refus ; aucun changement |
| completed | reopen explicite avec ETC choisi/confirmé ≥ 0 | open ; reopen à zéro possible, aucune ancienne charge restaurée |
| completed | complete répété sans changement d'AP/ETC | No-op ; aucune version artificielle |

Complétion calculée par le moteur ≠ statut métier. Une correction de consommation,
un restore, une extension/réduction ou une réassociation ne sont pas des reopen.
Une consommation seule publie les TA concernés et le PTEC confirmé de ces Teams ;
si AP change, tous les PTEC sélectionnés du Project sont rebondés, y compris
completed et les associations exclues conservées. Les preuves sont liées à
l'identité, aux refs de base et à la période candidate ; un ancien clic ne vaut
pas preuve du nouvel AP. Lifecycle PT exclu ne devient pas existing par ce rebond.

### 5.3 Dates Project et reconfirmations

Raccourcir la couverture présente les nouvelles bornes avant confirmation.
L'ancienne valeur peut être proposée uniquement pour une cellule à correspondance
explicite unique (même identité ajustée ou mapping de commande univoque). Chaque
consommation affectée doit être explicitement reconfirmée ou corrigée, zéro
compris. Split/merge ou mapping ambigu : nouvelle saisie, aucune valeur choisie
par défaut. Préremplissage, texte inchangé et confirmation globale non détaillée
ne prouvent rien. Aucun prorata/redistribution automatique ; portions exclues
uniquement historiques. Publication composite atomique Settings, AP, SubPeriods,
TA et tous PTEC concernés ; aucun AP raccourci intermédiaire.

earliest avancé au-delà des Actuals exige cette opération composite ou refus ;
earliest reculé ne crée pas de couverture. Extension au début explicitement
choisie exige nouvelle saisie/confirmation des consommations de la zone ajoutée,
zéro compris, et rebond des PTEC ; aucun zéro automatiquement confirmé.
objective/mandatory n'étendent ni ne coupent les Actuals. Une modification de
dates invalide les preuves dépendantes et requiert revue ; Apply/Cancel et bases
RAM 11D.1 sont conservés, avec obligations renforcées explicitement ici.

## 6. Contre-exemples et cas limites à démontrer

| Cas | Contre-exemple concret / contrat actuel | Comportement cible et preuve attendue |
| --- | --- | --- |
| B01 dates Project | Actuals 01–31/01 = 10 ; earliest passe au 15/01. C02 admet hors dates ; tronquer à 15 ne justifie pas 5 ou 10. | Apply Settings isolé refusé tant que candidat composite non confirmé. Nouveau AP 15–31, consommation explicitement reconfirmée, tous ETC requis ; ancien 10/31 jours conservé. earliest reculé au 01/12 ne crée rien automatiquement ; si couverture étendue, saisie des nouveaux jours, même zéro. objective et mandatory ne coupent jamais les Actuals. |
| B02 réassociation | Team retirée à zéro après S1 ; S2/S3 ajoutées ; réassociation avec ancienne grille S1 seule. | Même PT/RT ID ; saisie/confirmation des TA sur S1/S2/S3, pas absence assimilée à zéro. Si ancienne consommation historique positive, retrait désormais interdit I03. |
| B03 dates SubPeriod | S1 janvier, TA(A,S1)=7 ; S1 finit au 20/01 avec S2 ajustée. Actuellement periodId doit changer, même pour consommation seule. | Stable S1 ID, nouvelle version dates/AP ; TA ID(A,S1) reste, nouvelle consommation confirmée sur nouveaux jours ; aucune réutilisation d'une ancienne preuve datée. Split nécessite nouvelles identités et lignée explicite T03. |
| B04 delete/restore objet | Project avec 10 Actuals est actuellement non supprimable ; cible deleted retire ces 10 de l'occupation Current. | Un seul commit de tombstone et auto-deleted des catalogues sans autre usage, recalcul des occupations/surcharges, capture antérieure toujours à 10. Restore existing sans mutation ; revue/confirmation associations et charges T05, aucune réactivation implicite ni duplication de 10. Même scénario Reservation ratio/fixed et inactive. |
| B05 Team zéro historique | Capture ancienne cite Team, TA tous zéro, aucun ETC positif/demande ; removeTeam actuel refuse déjà participation/retired. | Tombstone permis après contrôle cible et sort explicite des associations ; refs historiques/capacité intactes, identité non réutilisable. Ajouter version non référencée TA=1 fait refuser delete. Restore Team laisse PT/RT supprimés. |
| B06 capacité après capture | Janvier TA=10, capacité concentrée semaine 1 ; capture M1 ; nouvelle capacité semaine 2. | M1 redistribue toujours semaine 1 avec ses refs Planning/Capacity ; M2 utilise semaine 2. Somme 10 exacte dans les deux ; pas de copies quotidiennes persistées. Tester exceptions et fallback capacité zéro. |
| B07 completed + AP évolué | PTEC completed=0 sur AP1 ; AP2 couvre un mois supplémentaire avec consommation changée. | PTEC version nouvelle, AP2, preuve zéro, toujours completed ; si ETC=3, reopen explicite. Pas de statut déduit de engine.complete ou RAF source historique. |
| B08 knowledgeDate égale | M1 knowledge=30/09 créé 02/10 ; M2 knowledge=30/09 créé 05/10, inputs différents ; horloge technique peut reculer. | Deux IDs, deux graphes, aucun écrasement. Ordre métier/technique défini T09, tie-break ID ; migration ne fabrique pas knowledge à partir des dates de création. |
| B09 correction inactive/deleted | Inactive garde Actuals et accepte édition ; deleted doit exclure ses Actuals, même conservés. | Inactive : nouvelle TA/proof/PTEC, toujours pas Forecast. Deleted : restore explicite obligatoire T15 ; aucune édition fantôme ni réactivation via correction. History seule ne possède aucune commande d'édition. |
| B10 capture ancienne invalide cible | Ancien Project Actuals avant earliest, Reservation Forecast chevauchant Actuals, V4 future/intermittent et capture avec RAF1. | Validation sous schema original puis examen exact de conversion ; validité ancienne ne garantit pas conversion cible. Capture non convertible bloque activation du dépôt T12 ; archive scellée inchangée, aucune capture legacy-only active ni nouveau Forecast persisté. |
| B11 positif puis zéro | TA v1=4, v2=0 ; dernière grille zéro. C03 permet retrait courant dans certaines conditions. | I03/I04 vérifient v1 y compris non référencée, refusent suppression ; masquer est permis sans condition de charge (T06). |
| B12 graphes et concurrence | Tab A corrige TA, tab B change AP depuis même token ; Save depuis ancien run, ack commit perdu. | Une seule publication gagne CAS ; pas mélange TA/AP/PTEC. Retry même operationId consulte receipt ; unknown bloque mutations et garde drafts jusqu'au reload confirmé. |
| B13 terminal ≠ courant | v1 → v2 ; Current sélectionne v1, capture H sélectionne v2 ; v2 n'a pas d'enfant. | Resolver Current donne v1, H donne v2 sans lire Current ; timestamps/numéros/absence d'enfant n'influencent rien. Même ID/version avec payload divergent refuse import. T01/T04. |
| B14 masquer chargé | Team A ETC=5, RT future fixed=2 ; Current avant/après hide. | Même capacité, Actuals, Forecast, associations, surcharges et totaux globaux ; seul rendu change. Réaffichage identifiable et réversible. Aucun refus lié à ETC/demande. T06/I04. |
| B15 dernier usage catalogue | P1 existing/inactive cite Program G ; P1 deleted, plus d'autre usage existing ; créer G2 même nom puis restore G. | Auto-deleted G dans CAS P1, G2 autre ID ; restore G refuse collision de nom normalisé tant que non résolue. Ancienne capture G conserve nom/couleur. Pas de fusion ; Pas même règle. T07. |
| B16 rang et restore contrôlé | Ordre [P1,P2,P3] ; delete P2 avec PT ETC=8, restore ensuite. | Ordre reste [P1,P2,P3] ; P1/P3 inchangés, projection sans P2 pendant delete ; restore P2 sans ETC=8 réactivé automatiquement. Confirmation explicite choisit les associations/charges ; aucun effet de rang sur activation. T05/T08/T15. |
| B17 AP vide et date Portfolio | Nouveau Project/PT ETC=4 sans Actuals ; capture knowledge=2025-01-01, créée 02/01 ; puis première cellule zéro couverte au 03/01. | AP vide stable sans dates ni TA, PTEC lié ; date capture déclarée libre sans borne Actuals. Première saisie zéro crée AP couvert/PTEC ; prochaine knowledge <03/01 refuse. Legacy capture sans knowledge demeure inconnue. T09/T13. |
| B18 zéro migré et reopen | Ancien requirements ETC=0, engine.complete=true ; migration ; complete explicite ultérieur puis AP changé. | Migré open, ETC zéro exact ; complete explicite donne completed ; AP nouveau exige preuve zéro sans reopen. ETC=1 refuse tant que reopen non exprimé. T10/T14. |
| B19 préremplissage ambigu | Ancienne cellule janvier=10 ; réduire à 15–31/01 ou merger deux périodes ; draft affiche 10. | Correspondance unique : proposer 10, preuve obligatoire, correction 0 possible ; merge ambigu : nouvelle saisie. Aucun prorata ni acceptation automatique du texte. Refus incomplet publie zéro Settings/AP/TA/PTEC. T11. |
| B20 earliest impossible | Capture ancienne earliest=02/01/2025, AP 01/01/2025, TA=1. | M01 : validation ancienne réussit, conversion exacte viole I15 ; déplacer/clipping n'est pas exact. Une seule capture bloque toute activation T12/I22. |
| B21 V4 information absente | Records intermittents A cumul=1 au 01/01, absent au 02/01, B cumul=1 au 02/01 ; pas de knowledgeDate. | M02 : zéro dense/date through comme knowledge inventent un fait. Diagnostic owner/Team/intervalle/date absente ; nouvelle décision Current ne répare pas la capture. T12/I02/I23 distinct de date Portfolio legacy inconnue autorisée. |
| B22 lignée non enregistrée | V5 X dates 01–02/01 TA=2, puis Y mêmes dates TA=3. | M03 : dates/quantités n'attestent pas le lien X→Y. Préserver IDs et préfixe AP connu, ne pas fabriquer de lignée SubPeriod ; blocage si contrat cible exige cette lignée historique. T03/T12. |
| B23 retrait ancien positif | V5 TA v1=1, v2=0, v3 retiredZeroTeams. | M04 : ancien contrat accepte, I03 cible interdit une nouvelle suppression ; ni PT existing substitué ni purge v1. Classification bloquée en l'absence de règle métier de racine historique auditée ; pas d'exception décidée ici. |

Ces contre-exemples sont des **oracles à démontrer dans les futurs lots** ; aucune
fixture ni test nouveau n'est créé dans cette mission. B20 est un contre-exemple
minimal irréductible à une conversion universellement exacte sous I15 ; B21–B23
exposent aussi les limites d'information et les contrats de racine à auditer.

## 7. Migration, stockage et faisabilité

### 7.1 T12 — Conversion obligatoire : portée et limites démontrables

V4–V8 sont les **formats sources**, V1–V7 les lots futurs. Nouveau numéro portable
et schema physique à décider techniquement en V2, sans élargir V8 silencieusement.
La lecture compatible et la preuve G1 sur l'ancien modèle ne prouvent pas la
convertibilité normalisée. Toutes captures concernées **et Current** doivent
former une génération validée ; une capture impossible bloque l'activation entière.
Aucun catalogue de captures « legacy-only » ni « Recalcul indisponible » ne permet
de franchir cette gate. Une simulation indisponible pour ressources après une
conversion valide relève de V6, distinct de non-convertibilité des données.

« Exact » signifie égalité des données métier attestées, quantités rationnelles,
absence/zéro, partitions, références propriétaires et identités connues. Les
résultats futurs peuvent changer selon les règles moteur cibles ; cela n'autorise
pas à changer les inputs historiques. Les IDs techniques attribués à la conversion
sont tracés comme tels, sans prétendre qu'une identité ou relation causale absente
existait auparavant. Pas de version historique synthétique, ni matching de lignée
par timestamp, dates ou quantités. T14 impose open pour tous les PTEC migrés avec
ETC original exact ; ce statut initial de conversion ne prétend pas décrire une
ancienne décision completed. T09 conserve l'absence de date Portfolio ancienne.

| Format source | Conversion directement exacte (sous conditions explicites) | Réconciliation explicite possible | Impossible sans invention / blocage | Recovery scellé uniquement |
| --- | --- | --- | --- | --- |
| V4 | Settings, Planning, ordre, capacités présentes ; ETC selon rafAuthority d'origine ; absence totale Actuals → AP vide ; deltas cumulatifs exacts sur chaque intervalle attesté | Pour Current : saisie/confirmation d'une partition complète, membership et valeurs manquantes avec provenance de nouvelle décision ; earliest compatible confirmé ; ce nouvel état ne réécrit aucune capture | KnowledgeDates Actuals absentes, participation intermittente et cellules non attestées ; répartir un delta agrégé ou ajouter zéro n'est pas une conversion exacte. Une capture avec V4 inline reste concernée même en enveloppe V6–V8 | Bytes source, cumuls/RAF authority et résultats éventuels ; jamais moteur/fallback actif |
| V5 | Versions object-scoped connues, coverage/partition/cellules/retired et dates exactes ; IDs existants conservés, PT/TA créés comme identités techniques mappées ; AP vide pour none/uncovered, ETC d'origine exact puis open | Justificatif externe authentique de provenance manquante ou nouvelle décision Current datée, avec examen distinct des captures figées | periodId changés sans intention d'édition : filiation ajustement/split/merge non attestée ; non-zéro historique puis retrait pourtant permis par ancien contrat ; earliest incompatible ; configurations historiques non enregistrées non reconstructibles | Ancien RAF embarqué et evidence comme provenance technique, bytes originaux ; aucune seconde autorité ETC |
| V6 | Inputs1 copiés + préfixes V5 exacts résolus depuis la génération source avant conversion ; none/AP vide ; connaissances Portfolio absentes conservées ; mêmes snapshotId/createdAt | Les seuls écarts Current peuvent recevoir nouvelles commandes confirmées ; une capture ne reçoit pas une configuration actuelle substituée | Tout blocage V4/V5 sélectionné, graphe cible incompatible ou perte de provenance ; schema1 sans profil ne donne aucun fait Actuals supplémentaire | Métriques forecast1 et document original, aucun profil inventé |
| V7 | Inputs1, sources none/V4/V5 sous les mêmes conditions que V6 ; profils forecast1/2 exclus de conversion métier | Preuves source externes vérifiables ; réparation historique automatique interdite | Un profil calculé, même quotidien, ne permet pas de retrouver un fait absent ou une filiation ; tous blocages de source se propagent au dépôt | Métriques et profils forecast1/2, y compris overlap de l'ancien moteur |
| V8 | Inputs1/2 × forecast1/2 validés selon leur contrat ; requirements capturés autorité ETC, même si RAF source V5 différent ; Current RAF2 exact ; open imposé T14 | Réconciliation Current explicite sans recopie du RAF source dans requirements ; diagnostics par capture mixte | Les quatre combinaisons n'effacent aucun blocage V4/V5 ou earliest ; ETC zéro/completion moteur ne prouve pas completed | Résultats/profils anciens et RAF source comme pièces scellées ; aucune utilisation pour compléter un input |

Les enveloppes V4/V5 n'ont pas de PortfolioSnapshots natives : convertir Current
et l'histoire Actuals qu'elles portent ; les captures V6–V8 peuvent transporter
V4 inline ou référencer V5. Aucun « V8 donc convertible » global. Pour toutes les
lignes, une nouvelle version ne peut restaurer une ancienne capacité inconnue ;
seules les configurations réellement capturées sont mappées. La conservation
intégrale porte sur tous faits/versions existants, non sur un passé imaginé.

**BLOQUEUR M01 — earliest historique incompatible (I15/T12), contre-exemple B20.**
Un Project valide dans l'ancien modèle a earliest=2025-01-02, une unique
sous-période 2025-01-01 et TA=1. Le cible exige Actuals ≥ earliest. Conserver les
inputs viole I15 ; déplacer earliest ou la consommation modifie une donnée
capturée ; couper la période détruit 1 ; fabriquer une ancienne Settings/version
invente de l'histoire. Même une confirmation de nouvelle saisie pour Current
ne rend pas cette capture exactement convertible. T12 bloque le dépôt ; aucun
assouplissement I15 ou exclusion de capture n'est décidé ici.

**BLOQUEUR M02 — information V4 absente (I02/T12 et temporalité Actuals), B21.**
Deux records valides couvrent 01 puis 02/01 ; A a cumul=1 au premier, est absente
au second, B apparaît au second avec cumul=1. Le contrat V4 accepte des lignes
intermittentes. « A=0 le 02/01 » est une convention de replay, pas un fait de
consommation confirmée ; I02 exige une cellule explicite sur la partition commune.
De plus aucune knowledgeDate Actuals n'est enregistrée : through est une borne
de couverture, pas une date de connaissance déclarée. Une preuve externe peut
apporter l'information ; sans elle, ni dense-zero ni date technique ne satisfont
une conversion exacte. Cette preuve doit être qualifiée et auditée ; une
confirmation actuelle constitue une nouvelle décision, pas une ancienne date.

**BLOQUEUR M03 — filiation V5 non attestée (T03/T12), B22.**
v1 : periodId X, 01–02/01, TA=2 ; v2 : periodId Y, mêmes dates, TA=3. L'ancien
contrat impose un nouveau periodId pour consommation changée. Il ne conserve
pas l'intention « correction », « remplacement », ou une lignée. Rendre Y enfant
de X par ressemblance serait hypothétique ; le traiter comme nouvelle identité
sans filiation ne prouve pas T03. On peut préserver les IDs et l'ordre des versions
AP attestés, mais pas affirmer une lignée SubPeriod inconnue. Un mapping technique
sans relation métier ne suffit pas si T03 exige cette relation historique.
La solution ne consiste pas à inventer des versions intermédiaires. La portée
d'une racine historique à provenance inconnue est une **ambiguïté métier bloquante
pour V2**, à présenter à l'audit sans déclarer une exception à T03 acquise.

**BLOQUEUR M04 — retrait ancien d'un historique positif (I03/T12), B23.**
v1 TA=1, v2 TA=0, v3 Team retirée avec retiredZeroTeams : l'ancien validateur
refuse le non-zéro courant, pas tout le passé ; cette histoire est possible.
Migrer le retrait comme nouvelle suppression PT contredit I03. Conserver une
association existing change le membership de l'état capturé. Une simple liste
recovery ou un index ever-nonzero ne résout pas cette contradiction historique.
À diagnostiquer et bloquer, sans appliquer rétroactivement les règles cible à
la validation d'origine ni modifier le canon DONE.

Ces cas prouvent que T12 n'est **pas universellement réalisable** sous les invariants
actuels. Ils ne prouvent pas que le dépôt utilisateur réel les contient ; cette
mission ne migre ni n'inspecte une base utilisateur. Les sources sans conflit et
avec faits/provenances suffisants ont une conversion exacte candidate, à prouver
V2 par corpus et oracles. Une réconciliation de Current peut rendre les prochaines
écritures compatibles, mais n'est pas une permission de réécrire les captures.

#### Diagnostics, confirmations et gate d'activation

Inventaire exhaustif source/schema/chemin/snapshotId/owner/Team/period/version,
empreinte de bytes et mapping vers refs cibles. Statuts distincts : EXACT,
RECONCILIATION_REQUIRED, IMPOSSIBLE_WITHOUT_INVENTION, INVALID_SOURCE,
RESOURCE_OR_QUOTA_BLOCKED. Le diagnostic indique invariant violé, valeurs exactes,
preuve disponible/manquante et actions possibles : apporter pièce authentique,
préparer nouvelle décision Current, exporter l'ancien dépôt pour recovery,
corriger une corruption à partir d'une source fiable. Aucun bouton « ignorer la
capture » pour activer. Une pièce contradictoire ou une confirmation ne certifie
pas à elle seule une conversion historique ; refus si l'égalité métier échoue.

Valider **chaque format selon son contrat d'origine**, y compris ses politiques
historiques de réparation déjà livrées, tracées et confirmées ; puis vérifier la
conversion cible séparément. Toute transformation qui change un input capturé
ne peut être étiquetée EXACT. Contrat fermé, duplicate JSON ambigu/schema inconnu,
référence source perdue : recovery et blocage, aucune normalisation opportuniste.

Confirmations futures : valeurs Current réellement réconciliées par Team/période,
associations/charges à réactiver, différences présentées, export recovery vérifié,
et activation de l'unique génération complète. Pas de question sur T14 déjà
fixé open, ni nouvelle date demandée pour donner un faux passé à une capture.
L'activation exige : inventaire complet (aucune capture omise), zéro impossible,
zéro reconciliation pendante, inputs exacts sous les deux validations, fermeture,
index/rebuild/counts/read-back, quotas admissibles, source/token inchangés,
consultation V6/V7 minimale prête, audit puis confirmation finale du switch.
Une confirmation n'outrepasse jamais un bloqueur d'invariants.

Résultats historiques : métriques, profils et contributions calculés sont absents
de **toutes captures converties et du nouveau modèle actif** ; les simulations
sont dérivées en RAM. Le document brut ancien peut rester temporairement scellé
pour recovery/export, y compris ces résultats, sans sélection dans les manifestes,
lecture comme input, fallback de consultation ni dual-write. Il n'est pas une
seconde autorité métier. Sa durée de rétention/effacement technique reste à fixer
V2/V5 en fonction du rollback et des quotas ; jamais supprimer des versions métier
normalisées pour récupérer cette place. Les faits legacy attestés convertibles
restent conservés ; les résultats ne deviennent jamais des TeamActual.

Reprise : journal privé fingerprint/schema/converter/policy/mappings/progrès ;
batches idempotents, revalidation source et batches déjà écrits, aucun index
incrémenté deux fois. Source changée ou politique/converter changés invalident le
seal et exigent nouvel examen ; interruption avant switch laisse l'ancien dépôt
intact/autoritaire. Préflight quota mesure source + ancien scellé + staging complet
+ indexes + export/transients ; admission indicative, refus physique toujours
possible. Quota insuffisant bloque ; cleanup uniquement générations privées ou
recovery dont abandon explicitement confirmé, jamais purge automatique d'histoire.
Le rollback avant et après activation est détaillé §7.3 : pas de retour sans perte
promis après nouvelles écritures. Les issues unknown suivent 11D.0, sans supposer
un rollback sur simple erreur d'accusé de réception.

### 7.2 Registre et transactions proposés

Proposition à chiffrer V2 : stores logiques identities, entityVersions,
currentManifest, snapshotManifests, metadata/ref indexes, control/jobs/receipts et
archiveLegacy. Clés incluant generation/kind/ID/version ; exact physical schema
non fixé dans cette mission. Pas un store quotidien, ni summaries autoritaires.
Registre de versions complet, y compris non référencées, exporté ; export fermé
sur les seuls manifestes perdrait ces versions et violerait la mission.

Write Current : préparer/valider/hash hors transaction ; CAS + add des versions
manquantes (never put pour remplacer une version), mise à jour atomique refs/index
et manifeste/control/receipt. Les collisions identiques doivent être prouvées,
les divergentes refusées. Save : add manifeste/métadonnées/refs/receipt avec token
et currentRevision exacts ; pas lecture de toute History ni projection. Delete
capture : retire ce manifeste seulement, conserve toutes versions et identités.
L'index ever-nonzero et la réservation des IDs/couples ne peuvent oublier le passé.
L'index de noms courants est distinct : il suit seulement existing, libère la clé
au tombstone et contrôle restore/création dans le même CAS (T07).

Staging migration/import : batches privés par génération ; source fingerprint,
progress/counters/mappings ; reprise idempotente, vérification de chaque batch
repris, read-back bytes et fermeture/index/counts, validation Current/projection,
job scellé. Activation transaction courte compare token/génération source,
source fingerprint, policy/client version ; switch de génération + receipt.
Aucun traitement lourd en onupgradeneeded ; changement physique prépare les stores,
le contenu est migré en staging puis activé. Les anciennes générations sont
retenues pour recovery, pas maintenues par dual-write.

Atomicité : staging partiellement écrit n'est pas Current partiellement publié.
Interruption/quota/cancel avant activation laisse l'ancien actif ; crash au switch
récupère via authority/receipt ; unknown et échec reconciliation locale exigent
recovery, pas incrément local ni rollback supposé. Receipt avant CAS, signature
identique et operationId stable ; borne 1024 receipts et impossibilité replay après
expiry/stale token conservées. Multi-tab sérialisé par control/CAS même sans
BroadcastChannel ; versionchange ferme, blocked exige résolution explicite.
Ancien client localStorage non coopératif ne peut être verrouillé transactionnellement
avec IDB : conserver fingerprint/recheck/events/focus et exports distincts de 11D.0.

Imports : dispatch source/version fermé, collisions refs contrôlées, archive
originale conservée ; whole import refusé si corruption ou schema inconnu. Imports
normalisés incluent versions non référencées. Export métier autonome contient registre,
manifestes, provenance factuelle et schemas ; export recovery des originaux
scellés distinct. Aucune dépendance à Current distant.
Downgrade V4–V8 doit refuser si perte de statuts/versions/identités ou graphes
inreprésentables ; export recovery des originaux reste disponible. La suppression
d'un staging échoué ne peut purger des versions d'une génération activée.

### 7.3 Rollback sans deux modèles actifs

Avant activation : annuler/discard staging, ancienne autorité inchangée. À
activation : conserver génération ancienne scellée et export recovery vérifié.
Après nouvelles écritures normalisées : retour binaire à l'ancien client ne peut
représenter toutes les données ; interdire downgrade silencieux. Options : forward
fix sur nouvelle authority ; restauration explicite de génération ancienne avec
nouveau token et export de la nouvelle (perte d'éditions annoncée/confirmée), ou
nouveau migrateur inverse **si** démontré lossless. Ne jamais annoncer rollback
sans perte une fois des faits nouveaux créés. Aucun double Current synchronisé
ni synchronisation durable des deux modèles. La génération scellée se lit uniquement pour recovery/export explicite ;
aucune consultation métier active ne lit ses résultats ni ne complète un graphe.

### 7.4 Coût et limites de faisabilité

Soit V nombre total de versions, R refs des manifestes, S cellules nouvelles,
C taille des calendriers complets révisés, A archives legacy. Stockage au moins
O(payloads(V) + R + A + indexes), croissance monotone ; chaque édition de capacité
coûte un calendrier complet, chaque repartition dense jusqu'à Teams×sous-périodes
cellules et refs. Pas de GC des versions non référencées, même après Delete capture.
Normalisation partage les gros payloads entre captures mais multiplie petites
rows/clé/index/requêtes ; bénéfice réel non mesuré. Préflight/admission quota
nécessaires ; estimation navigateur indicative, jamais promesse d'illimité.

Validation d'un graphe O(entités sélectionnées + refs + cellules), plus validation
history/protection index au build/rebuild. Ne pas lire tout V à chaque Apply ;
index ever-nonzero audité dans transaction. Resolver batché + cache de refs borné,
aucune N+1 quotidienne par TeamActual. Reconstruction dense actuelle peut produire
O(jours × participations × propriétaires), même hors horizon ; BigInt longs,
lookahead Mandatory, matrices/copies simultanées sont les principaux pics.
Coût migration = lecture/conversion/validation/hash/read-back de toute source,
plus mapping et staging ; RAM doit rester batchée, les buffers de texte ne sont
pas magiquement streaming.

Acquis 11D.0 : row LRU 32 MiB et metadata 64 MiB **estimés**, cap exact external
sorting 4096/fan-in 8, release History/epoch/token, worker sérialisé, fichier limite
512 MiB avec texte encore en RAM. Ne pas réutiliser ces budgets pour garantir le
pic de simulation ou la taille du nouveau registre.
Acquis 11D.2 : parité exacte sur 26 couples, 260 répétitions et trois processus ;
mesures directes target/stress/adverse, maxima observés heap growth ~152/1137/780
MiB, RSS ~443/2103/1750 MiB ; pas pics absolus, pas budgets navigateur. Legacy
extrême valide laissé non exécuté pour risque ressource. Ces preuves ne certifient
ni universalité, ni worker/copies/concurrence/UI nouvelle architecture.

Protocole futur : small/target/stress/adverse + tailles V/R/S/C croissantes, grosses
fractions, partitions longues, dates hors horizon, imports répétés, 10k captures,
versions jamais référencées. Deux warmups, au moins dix mesures, médiane/p95/max,
main/worker CPU/heap/RSS (si disponible), pics transitoires copies/text/Blob,
retained après release/GC qualifié, bytes IDB/index/source/staging/ancienne
génération. Mesurer cold/warm, annulation/retry, Apply Current pendant lectures.
Budgets absolus et matériel de référence à ratifier **avant** GO V2/V6/V7 ; proposer
alerte regression médiane >20 % à dimensions comparables, investigation avant
GO, jamais censure automatique de l'inputs-only. Quota réel navigateur reste non
certifié ; test injecté ne vaut pas dépassement physique démontré.

## 8. Séquencement progressif et gates par lot

Tous les lots ci-dessous : **PROPOSÉS, NOT STARTED, non prêts pour implémentation
sans audit et autorisation distincte**. V1…V7 sont des étiquettes de
plan, pas des numéros de format. Les sorties préparées avant V5 restent dormantes
et non autoritaires ; activation unique. Aucun nouveau Save refs-only ne doit
être visible sans consultation fonctionnelle V6 et présentation minimale V7.

Ordre de préparation : V1 → V2 → V3 → V4 → V6 → V7 consultation minimale → V5
bascule atomique → V7 comparaisons avancées. V5 reste le lot de bascule, même si
sa préparation commence après V2. Les dépendances empêchent une fenêtre de
captures inutilisables ; comparaison avancée n'est pas précondition de stockage,
mais consultation accessible et export/recovery le sont.

| Lot | Entrées / préconditions | Sorties attendues | Invariants et tests unitaires/intégration | Persistance / navigateur / migration | CPU/RAM, GO/NO-GO et rollback |
| --- | --- | --- | --- | --- | --- |
| V1 Domain et contrats | C01–C08, I01–I23 ; T01–T15 définitifs ; dossier §8.1 et bloqueurs §7.1 explicités | Schéma logique fermé, identity/ref factories, graph validators, commandes conceptuelles, contrats legacy vs cible | Unicité/propriétaires/refs, rationnels, statuses, partitions, dates/reopen ; I01–I20/I23 ; B01–B23 ; oracles de fermeture indépendants | Fixtures malformed/dangling/unknown, contrat transport exact ; conception workflows revue clavier/Apply/Cancel, migration mappings et absence explicite | Complexité linéaire graphe/index, pas whole archive au Current ; GO si ambiguïtés bloquantes levées et tests contractuels exacts ; NO-GO lignée/date synthétique ; rollback retirer composants dormants sans aucune donnée modifiée. |
| V2 Persistence, migration, imports/exports | V1 ratifié, T12/13/14 appliqués, bloqueurs §7.1 résolus pour le corpus et budgets initiaux, contrats 11D.0 | Registre immutable/manifestes, nouveau portable dispatch, staging/mappings/archive, index ever-nonzero et refs, read-back | Memory adapter CAS/receipt avant CAS, duplicate divergent, graph closures/index rebuild ; export inclut orphan versions ; round-trip inputs cible exact et export recovery original byte-identique | IDB natif transaction abort/quota injecté/crash ; V4–V8 corpus §7, source changée, reprise plusieurs fois, captures mixtes/incompatibles ; navigateur blocked/versionchange/two tabs ; aucune activation utilisateur | Bytes et pic staging/export/import, batches bornés ; GO si zéro perte/dangling/activation partielle et diagnostics distincts ; NO-GO non-convertible accepté, corruption acceptée ou quota caché ; rollback ancien actif, discard génération privée. |
| V3 Application, commandes, édition | V1/V2 préparés, T05/06/15 appliqués, bases et preuves 11D.1 | Préparation candidate versionnée, refs dans bases RAM, Apply atomique, tombstone/restore/hide/reassociate/reopen explicites | R1/R2 A/no-op/RAF/publish, stale/ref et rebase disjoint, I02–I09/I11–I18 ; B01–B05/B07/B09/B11/B14–B19 | Dispatch persisté versions+manifest ; abort conserve drafts ; native UI 1440/390 px, clavier/modales, Cancel S1–S6 et V1/V2/R1 anciens ; legacy reconciliation sans activation | Une projection par opération effective, zéro frappe/no-op ; GO si proofs ciblés et aucune mutation avant commit ; NO-GO completed implicitement rouvert/texte=confirmation ; rollback adapters dormants/flag off, ancien Current autoritaire. |
| V4 Moteur inputs versionnés | V1/V3, schema résolu pur, T08 définitif et borne Reservation spécifiée | Resolver→inputs exacts→reconstruction→moteur/projections ; filtre deleted et borne Reservation ; chain identity nouvelle | Garder priorité/slots/caps/deadlines/quanta/overloads ; I09–I11/I15/I20 ; Project 11C inchangé, ratio/fixed Request config indépendante ; all-positive-days oracle | Intégration Current candidate + capacities/Planning même manifeste ; export/read puis même run ; navigateur Project/Reservation Actuals/forecast zero/inactive/deleted ; migrated legacy qualifié séparément | Target/stress/fractions/lookahead, off-horizon estimation ; GO parité ancienne là où règles identiques et différences intentionnelles documentées ; NO-GO filtrage après allocation/fallback Current ; rollback noyau dormant avant activation. |
| V5 Bascule atomique | V2–V4 + V6 + V7 consultation minimale validés, confirmation migration, client version gate, export recovery vérifié | Une authority versionnée active, Save refs-only, reprise startup et portabilité ; ancienne génération scellée | I19–I23, CAS complet, bytes/index/read-back, hash/policy source ; aucun dual-write | E2E upgrade/startup deux onglets, interruption avant/pendant/après switch, ack perdu, anciens clients, import/export/reload ; migration exacte de chaque capture, reconciliation Current approuvée sans altération historique ; nouvelle capture consultable immédiatement | Pic coexistence staging/ancien/nouveau + quota ; GO uniquement toutes gates dépendantes et audit positif ; NO-GO consultation minimale absente ou toute capture non convertible, même explicitée ; rollback pré-switch inchangé, post-switch §7.3 avec export/confirmation si perte. |
| V6 Service simulation historique | V1/V2/V4, G1 11D.2 et T12 ; nouvelle authority encore dormante avant V5 | Pipeline Application indépendant UI pour Current/Snapshot, résolution ciblée sans Current, facts puis simulation, DTO exact/worker/scheduler/cache | I19/I20, B04/B06/B08/B10/B12 ; oracles G1 portés, getters Current/forecast qui lèvent, isolation graphs, déterminisme process/TZ, conservation et résultats complets | Worker actual refs/rationnels, expected token/epoch/cancellation, missing/corrupt/unsupported/resource/transient distincts ; native annuler/refresh/release, Current disponible sous History ; legacy export toujours intact | Admission avant calcul dense, off-horizon/prefix/lookahead compris, caches bornés/release, copies mesurées ; GO exactitude + budgets intégrés, NO-GO fallback anciens résultats/exhaustivité supposée ; rollback service dormant avant V5, ensuite forward fix ou consultation indisponible explicite sans réécriture. |
| V7 History et reprise comparaisons | V6, T09 définitif ; cap scope à définir en intégration ; minimum consultation avant V5, avancé après | Liste indexée, découverte progressive, facts, résultats simulés et comparaisons par stable ID ; source/chaîne/indisponible visibles | I19/I23, union historique présence unknown≠absence ; même knowledgeDate distincte ; comparaison précédent présence/semantique décidée ; labels/couleurs issus du manifeste | Native cold/warm/navigation/keyboard/mobile, drafts Planning et modales conservés, stale reads ne publient pas ; captures converties sans profil stocké, simulation dérivée explicitement ; import/delete/restore ne mélangent pas sources | First page/facts/first sim/cap/release mesurés ; GO cap exact pour portée annoncée et aucune simulation historique systématique à ouverture ; NO-GO cap global promettant exhaustivité avec chargement progressif ; rollback UI avancée vers consultation minimale, jamais capture inaccessible. |

Gates distinctes de V7, sans ajouter de lot :

- **V7 consultation minimale (avant V5)** : liste indexée, sélection d'une capture,
  facts exacts/absence connue, simulation demandée via V6, source et diagnostic
  explicites si ressources indisponibles, aucune lecture de résultats anciens.
  Entrées V2/V6 dormantes ; sortie lecteur utilisable dès activation, I19/I23,
  B06/B08/B13/B17. Mesurer première page/facts/premier run et release, clavier et
  drafts intacts. GO lecteur + export/recovery prêts ; NO-GO fallback ou capture
  non convertible. Rollback pré-bascule : lecteur dormant désactivable.
- **V7 comparaisons avancées (après V5)** : entrée autorité activée et consultation
  minimale validée ; sortie deltas par identité stable sur graphes/chaînes résolus,
  union présence/unknown qualifiée et portée/cap décidé. Tests exactitude des deltas,
  mêmes knowledgeDates, masquage sans effet sur agrégats et historique supprimé ;
  mesurer cold/warm, ensemble parcouru/cap exact et cycles release. GO sans
  exhaustivité implicite ; NO-GO mélange Current/historique ou sampling silencieux.
  Rollback vers consultation minimale sans modifier les captures/versionnées.

V5 ne requiert pas toutes les comparaisons ni une simulation extrême en mémoire :
une capture convertie valide peut exposer facts et refus de ressources explicite.
Cette indisponibilité de simulation n'autorise jamais une conversion incomplète.

### 8.1 Préparation du prochain lot V1 — contrat, sans implémentation

Entrées : baseline livrée §2, T01–T15 définitifs, I01–I23 et B01–B23,
contrats historiques fermés V4–V8, garanties 11D.0/11D.1, preuves G1 limitées.
Le travail futur V1 formalise le **Domain**, sans activer stockage, migration,
moteur ou UI. Le présent dossier est une spécification à auditer, pas une
factory, un codec ou une commande exécutable.

| Dossier V1 | Contrat à définir / sortie requise | Oracle ou refus indispensable |
| --- | --- | --- |
| Types exacts | EntityId/VersionId opaques typés, EntityRef(kind,id,version), propriétaire typé ; rationnels canoniques, dates civiles, absence explicite ; lifecycle existing/deleted, Forecast active/inactive, visibility, PTEC open/completed indépendants | Mauvais kind/owner, quantité négative/flottante, absent assimilé à zéro, deleted éditable, hide assimilé à deleted refusés |
| Entités | ProjectSettings, ReservationSettings, TeamSettings, TeamCapacity, Program, Pas, PT, RT, ActualPeriod, ActualSubPeriod, TeamActual, PTEC, PlanningSettings, PortfolioOrder | dailyCap ailleurs que PT, ETC ailleurs que PTEC, données globales copiées dans manifeste refusés |
| Identité/version | ID stable d'objet ; couples PT/RT/TA et 1:1 AP/Capacity/PTEC réservés ; versions immuables avec parents explicites ; racine de création/conversion qualifiée ; sources split/merge | Collision divergente, mutation payload/owner, duplication couple, cycle de parents, filiation par matching refusés ; terminal non courant B13 |
| Graphes | Current et Snapshot : tables de sélections exactes, AP→SubPeriod, TA→association+SubPeriod identité, PTEC→AP version, Settings→catalogue ; capacité et Planning sélectionnés ; provenance hors sélection active | Fermeture hand-built indépendante, dangling/cross-owner/deux versions même ID/fallback latest/Current refusés ; anciennes refs de provenance ne doublent pas la sélection |
| Lifecycle et projection | Restore contrôlé sous même ID, exclure charges non confirmées, historique intact ; deleted hors calcul ; inactive garde Actuals ; hide sans effet ; auto-deleted Program/Pas et unicité existing ; ordre structurel intact | B04/B09/B14–B16, non-zéro historique interdit retrait association/Team ; restore rang ne confirme rien |
| Actuals et PTEC | AP vide T13, matrice explicite sur partition ; ajustement/split/merge, confirmations exactes candidate ; tous PTEC rebondés si AP nouveau ; completed zéro/reopen explicite | B01–B03/B07/B17–B19 ; preuve périmée, préremplissage pris comme preuve, PTEC oublié/ref autre AP refusés |
| Dates | Deux contrats knowledgeDate séparés ; ancienne Portfolio knowledge inconnue, nouvelle déclarative bornée par couverture sélectionnée ; Actuals dates historiques conservées | Date Portfolio synthétique/monotonie imposée, AP vide daté, recul de connaissance Actuals connue, clipping hors earliest refusés |
| Migration conceptuelle | Validation source puis classification cible ; mapping attesté, absence vs données manquantes ; statut open imposé sans modifier ETC ; M01–M04 explicites | B10/B20–B23 ; « source readable donc exacte », profil transformé en input, preuve externe non vérifiée, capture ignorée pour activer refusés |

**Commandes conceptuelles** à spécifier avec base immutable, intention, write-set,
preuves, effets et résultat no-op/candidate/refus : create/edit Project/Reservation,
logicalDelete/restore contrôlé, create/delete/restore Team, hide/show Team,
associate/reassociate/retire PT ou RT, setDailyCap, setETC, complete/reopen,
adjustActualDates, splitSubPeriod, mergeSubPeriods, correctConsumption,
shorten/extendActualCoverage, changeProjectDates, setPlanningSettings,
setTeamCapacity, reorderProjects, create/rename/restore Program/Pas,
createPortfolioSnapshot avec knowledgeDate déclarative. Auto-deleted catalogue
est un effet atomique, pas une commande asynchrone post-commit. Capture crée un
manifeste sans version métier ni moteur ; commandes de migration sont V2/V5,
avec un contrat Domain de validation/classification préparé V1.

**Validateurs** séparés : payload local, identité/propriété/parents, quantités,
partition/AP vide, cellules/membership, PTEC/AP/status, dates, lifecycle/protection
ever-nonzero, noms/catalogues, ordre, graphe fermé, snapshot temporalité.
Définir des diagnostics structurés par invariant et chemin ; les ports d'index
sont des optimisations vérifiables, jamais une seconde autorité. Protection
historique se prouve contre tout registre, non seulement captures sélectionnées.
Formalisables : I01–I20/I23 directement Domain ; I21/I22 définissent les
pré/postconditions Domain mais nécessitent V2/V5 pour la preuve transactionnelle.
Pas de prétention que des tests unitaires V1 prouvent IndexedDB/CAS/quota/recovery.

Tests négatifs futurs : toutes lignes ci-dessus, B01–B23, graphes arbitraires
construits à la main et mutations ciblées d'un graphe valide ; oracles rationnels
sans tolérance, égalité des refs avant/après no-op, obligations de preuves
indépendantes des textes. Mesures V1 : coût validation selon entités/refs/cellules,
cycles/provenance longs et index ever-nonzero ; ne pas scanner toute archive lors
de chaque résolution Current. Budgets navigateur fixés par lots intégrés suivants.

**Détails techniques décidables pendant V1** : syntaxe opaque et sérialisation
logique des refs, liste de parents, représentation tagged union des absences,
interfaces des validateurs/diagnostics/proofs, conventions de normalisation des
noms compatibles au contrat existant. Numéros portable/stores/indexes/batching
restent V2, transport/cache/worker V6, restitution/cap V7, mécanisme switch V5.
Ils ne permettent de changer ni identité métier ni les décisions T01–T15.

**Ambiguïtés métier réelles à faire examiner par l'audit** : portée de filiation
SubPeriod non enregistrée à la racine de conversion (M03), représentation d'un
retrait ancien autorisé devenu interdit (M04), preuves externes admissibles pour
les faits V4 absents (M02). M01 reste incompatible tant que tous inputs capturés
et I15 doivent être conservés. Aucune de ces questions ne rouvre T01–T15 et aucune
solution dérogatoire n'est adoptée. Les contraintes restore/protection doivent
être prouvées sans supprimer PT/RT non-zéro en cascade : l'exclusion par owner
et la réactivation explicitement confirmée sont les effets définis §3.3.

Dépendances de sortie : V2 consomme types/graphes/classification et ne sélectionne que des inputs
attestés ; l'égalité se prouve par corpus indépendants, pas par ancien Forecast ; V3 consomme
commandes/transitions/proofs ; V4 les inputs résolus/projections ; V6 la fermeture
indépendante Current et identités ; V7 les dates/présence/status/visibilité ; V5
les préconditions de publication et les preuves de tous lots précédents.
GO V1 seulement après audit indépendant puis autorisation explicite, sans
contradiction cachée dans son contrat. Il peut formaliser un refus de migration
et les nouveaux graphes, mais ne déclarera pas T12 résolu par cette formalisation.
NO-GO V2/V5 tant que la stratégie exacte pour les sources concernées est bloquée.
Rollback V1 : composants futurs dormants retirables, zéro donnée utilisateur
modifiée ; aucun nouveau format actif. Aucun lot commencé ici.

Remplacement des anciens lots :

- **11D.3** (copie configurations / inputs-only capture) est remplacé par V1/V2/V5 ; hypothèse Actuals seuls normalisés obsolète. Ancienne production V8 reste lisible.
- **11D.4** est rebasé et élargi en V4/V6 ; G1 reste acquis, résolution ciblée/DTO rationnel/worker/cost admission/cache/cancellation/diagnostics restent à prouver.
- **11D.5** est décalé en V7 après nouveau resolver/service ; consultation minimale précède activation, comparaisons avancées suivent. Arbitrage cap froid exact vs progressivité conservé, Trends/restitution complète non autorisés par ce plan.

## 9. Dossier de preuve et critères transverses

Chaque futur lot livre : commit baseline, diff de portée, table décision→code→test,
fixtures originales et provenance/mapping, sorties exactes et limites, preuves
transactionnelles et UI, mesures brutes/matériel, rollback exécuté ou limitation
explicite. Audit indépendant et autorisation implémentation distincts de ce plan.
Aucune gate « PASS » ne peut être héritée d'une suite jamais exécutée sur le lot.

Corpus migration minimal : V4 intermittent/zero/nonmember/future ; V5
none/uncovered/covered-zero/retired-reintroduced/erosion/split-merge ; V6 schema1 ;
V7 schema1/2 ancien overlap ; V8 inputs1/2 × forecast1/2 avec RAF divergent,
Projects/Reservations inactive, captures mêmes createdAt et capacités différentes,
unknown schema/ref cassée/collision IDs, corruption bytes/index, versions sans
manifest, deleted cible et completed réouvert cible. Vérifier tous les formats
historiques sous leur validation d'origine avant conversion ; corpus non convertible
ne peut être écarté pour obtenir un taux de succès artificiel.

Unitaires : invariants I01–I23 et négatifs, graphes hand-built indépendants du
resolver, métamorphismes (capacity change/ActualPeriod change/non-zero→zero),
conservation rationnelle et dates extrêmes. Intégration : candidate→persist→read
→resolver→facts/occupation/engine→DTO exact, EAC=Actuals+ETC, absence et zéro,
aucune re-déduction du RAF depuis Actuals/profil. Persistance : memory + native
IDB, interruption/quota/CAS/stale retry/receipt expiry/recovery/rollback.
Navigateur : deux tabs, current/history worker/release, card/modale Apply/Cancel,
RAM drafts préservés sur refus et perte après **reload confirmé** annoncée.

Commandes existantes à utiliser seulement lors de futures implémentations :
`npm run typecheck`, `npm test`, `npm run build`, `npm run test:portable`,
`npm run test:storage`, plus scénarios natifs ciblés et mesures de chaque lot.
Aucun nouveau framework/dépendance prescrit. Pour la présente mission documentaire :
`git diff --check`, contrôle liens relatifs ajoutés, existence des chemins code
cités, couverture I01–I23/B01–B23/T01–T15/V1–V7 et portée Markdown uniquement.
Contrôles documentaires exécutés : `git diff --check` sans erreur ; 68 liens vers
fichiers et 20 chemins source uniques existants ; matrices complètes et uniques
T01–T15/I01–I23/B01–B23 ; lots V1–V7 présents ; sections archivées des trackers
inchangées octet pour octet ; diff limité aux trois Markdown autorisés.
La revue sémantique a vérifié les interactions §3–§8, sans présenter la couverture
textuelle comme une preuve d'implémentation. Aucun test applicatif, build,
benchmark, scénario navigateur ni migration exécuté. SHA final et état Git sont
communiqués après livraison, hors contenu du commit.

## 10. Conclusion de faisabilité et conditions de lancement

**Décisions validées** : T01–T15 intégrées dans le schéma, workflows, matrice
I01–I23, contre-exemples B01–B23 et gates V1–V7. Elles ne sont plus des options.
Les acquis livrés 11D.0/11D.1/11D.2 G1 restent inchangés ; cible copiée ancienne
remplacée, aucun contrat DONE modifié rétroactivement.

**Contradictions résolues dans le plan** : hide limité par charges, restore
implicite, priorité supprimée/reappend, catalogues physiquement oubliés, completed
inféré/rouvert automatiquement, AP absent/date fictive, raccourcissement par
prorata, et alternative migration legacy-only active. Les écarts du code sont
identifiés pour les futurs lots ; rien n'est implémenté ici.

**Bloqueurs persistants** : M01–M04 de §7.1 montrent pourquoi T12 ne peut être
certifié universellement. Une ancienne capture valide mais incompatible cible
bloque tout le switch ; recovery scellé n'est pas une échappatoire. L'audit doit
examiner ces contradictions et les preuves possibles, sans changer T12 ni
inventer de faits. Les budgets CPU/RAM/quota et le contrat physique restent des
gates techniques futures, distinctes des décisions métier.

**Préparation** : V1 dispose du dossier §8.1, sans code ni nouveau format actif.
Il est prêt à être audité, pas autorisé à être lancé ; l'analyse des racines de
migration et des interactions restore/protection doit faire partie de cet audit.
V2/V5 restent NO-GO sur toute source non convertible. Audit indépendant du plan
consolidé puis autorisation explicite requis avant V1 ou tout autre lot.
Aucun lot V1–V7 commencé, implémenté ou DONE. Arrêt après livraison Git du plan.
