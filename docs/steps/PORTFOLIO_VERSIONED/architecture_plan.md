# Portfolio versionné — plan architectural et faisabilité

Statut : **PLAN ONLY — aucun lot nouveau commencé, implémenté ou DONE**.
Date de l'audit : 2026-10-09. Mission strictement documentaire ; ce document ne
constitue ni autorisation de coder, ni migration, ni certification du modèle cible.

## 1. Autorité, baseline et méthode

Dépôt `kartaguez/FlowPlan2`, branche `codex/lot11a-portfolio-snapshots`.
SHA initial réel et baseline documentaire demandée :
`1128246c101701b653569b62ca015d04366a2f79`.
Avant toute décision : branche exacte, HEAD exact, working tree propre ; fetch
origin réussi, HEAD et remote identiques, divergence **0/0**. Le premier fetch
sandboxé ne pouvait écrire FETCH_HEAD ; le fetch autorisé suivant a réussi.
Aucun AGENTS.md trouvé dans le dépôt ou les parents vérifiés. Aucun reset,
changement de branche, modification de code/test/codec/schéma/dépendance.
Le SHA final est communiqué après commit/push ; pas d'auto-référence dans le commit.

Les règles **cibles validées** sont les principes, entités et 23 invariants de la
mission utilisateur. Les contrats **livrés** restent ceux du
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

Proposition technique T01 : `EntityRef = (kind, entityId, versionId)` ; référence
exacte, jamais « latest ». Une version porte un payload complet de **son entité**,
un propriétaire immutable et une provenance. `entityId` est stable, réservé pour
la vie du référentiel ; `versionId` est unique dans cette identité, immutable et
attribué seulement à la publication. Séquence locale et parent de version sont
à spécifier en V1 ci-dessous ; ils ne prouvent pas une chronologie métier perdue.
Les IDs importés restent opaques, les collisions divergentes sont refusées.
Un hash vérifie les bytes, pas la validité métier ni l'identité.

| Entité | Identité / propriétaire | Payload versionné et références | Cardinalité / unicité cible |
| --- | --- | --- | --- |
| ProjectSettings | ProjectId stable | nom, earliest/objective/mandatory, activation Forecast, existing/deleted, ProgramId/PasId optionnels, ownColor selon Program | Une version sélectionnée par Project dans un manifeste ; noms Projects non imposés uniques. |
| ReservationSettings | ReservationId stable | nom, start/end, activation Forecast, existing/deleted, groupements/couleur | Une version sélectionnée ; demandes portées par RT, pas copiées ici. |
| TeamSettings | TeamId stable | nom, existing/deleted, état de masquage à arbitrer T06 | Une version sélectionnée ; masquage distinct de suppression. |
| TeamCapacity | Identité dédiée à une Team, relation 1:1 stable | calendrier complet : periods inclusifs, quantités, indisponibilités, exceptions | Une version sélectionnée par Team requise ; gaps permis, overlaps refusés. Aucun ID métier de capacityPeriod imposé. |
| Program | ProgramId stable | nom normalisé, couleur, existing/deleted | 0..1 référence par Project/Reservation ; une version sélectionnée par identité. |
| Pas | PriorityFamilyId stable (nom technique conservé) | nom normalisé, existing/deleted | 0..1 référence indépendante de Program. Unicité noms courants à arbitrer T07. |
| PT | identité stable du couple (ProjectId, TeamId) | extrémités immuables, existing/deleted, dailyCap exact optionnel proposé | Un seul PT pour un couple, même après retrait/réassociation. 0..N PT par Project et Team. |
| RT | identité stable du couple (ReservationId, TeamId) | extrémités immuables, existing/deleted, demande exacte ratio OU fixed-daily | Un seul RT par couple ; 0..N ; ratio dans [0,1], fixed non négatif. |
| ActualPeriod | Identité unique par propriétaire typé Project/Reservation | couverture ou absence explicite, knowledgeDate/provenance à préciser, liste ordonnée de refs ActualSubPeriod exactes | Un ActualPeriod sélectionné par propriétaire ; période commune à ses Teams, pas période commune à tout le Portfolio. |
| ActualSubPeriod | identité stable, propriétaire = ActualPeriod **identité**, donc objet métier | dates from/through inclusives | 0..N refs dans une version ActualPeriod ; aucune identité partagée entre propriétaires. |
| TeamActual | identité du couple (PT ou RT, ActualSubPeriodId) | consommation exacte non négative ; extrémités stables | Au plus une identité par couple et une version sélectionnée par cellule requise. Elle n'appartient pas à Team seule ni à une version de dates. |
| PTEC | identité unique par PT | ETC exact, référence **version exacte** ActualPeriod du Project, open/completed | Une version courante par PT existant ; completed ⇒ ETC zéro. Aucun PTEC Reservation. |
| PlanningSettings (complément nécessaire T02) | identité globale | horizon, working weekdays, maxParallelProjects | Une ref exacte par manifeste ; requise pour capacités/distribution/admission. |
| PortfolioOrder (complément T02) | identité globale | ordre Project stable, politique des deleted à arbitrer T08 | Une ref exacte par manifeste ; aucune priorité dérivée d'un Program/Pas. |

ActualSubPeriod n'est pas détenue par TeamActual ; modifier ses dates publie une
nouvelle version sous la même identité pour un simple ajustement. Les TeamActual
conservent leurs identités et reçoivent les versions reconfirmées nécessaires.
Split/merge : créer des identités explicites, relier leur provenance aux anciennes,
ne jamais affecter arbitrairement une ancienne identité à deux morceaux. T03 à
ratifier : critères exacts distinguant ajustement de bornes et split/merge.
Toutes les anciennes identités/versions restent conservées.

Les statuts de lifecycle et l'activation Forecast sont deux dimensions. Un
Project inactive/existing garde ses Actuals ; deleted est absent des calculs
courants même s'il reste référencé dans le registre et les manifestes historiques.
Une quantité n'est jamais un nombre flottant : rationnels canoniques exacts,
optionnel/absence distinct de zéro, covered-zero distinct de non couvert.

### 3.2 Current et PortfolioSnapshot

Proposition T04 : un manifeste contient son ID/schema, les refs exactes de
PlanningSettings/PortfolioOrder et les tables explicites de sélection des
Settings/catalogues/capacités/PT/RT/ActualPeriod/PTEC/TeamActual. Il ne contient ni
copies de payloads ni résultat/calendrier quotidien dérivé. La liste des refs
ActualSubPeriod est portée par les versions ActualPeriod ; une table de fermeture
peut les indexer sans devenir une autre autorité.

Current possède une révision CAS et un manifeste cohérent sélectionné ; les anciens
manifestes Current publiés sont conservés comme provenance technique proposée,
sans prétendre constituer des captures utilisateur. PortfolioSnapshot possède
snapshotId stable, createdAt réel ISO UTC, knowledgeDate déclarative distincte
(T09), et le même type de graphe de références. Save répété est une nouvelle
identité, pas une déduplication par date ou hash. Une capture réutilise les refs
Current validées, n'appelle pas le moteur et ne crée pas de versions métier.

Un manifeste sélectionne au plus une version d'une identité dans son graphe
courant. Les dépendances de provenance peuvent citer des versions antérieures,
qui ne remplacent jamais cette sélection. L'archive conserve aussi les versions
non référencées ; elle n'est pas chargée intégralement pour construire Current.
Les tombstones Settings et associations retirées peuvent être présentes dans les
tables sans participer aux calculs. La fermeture utile à la reconstruction inclut
les capacités/Settings des Teams masquées et toute cellule Actuals requise.

Validation du graphe, avant publication et après lecture :

1. Refs existantes, kind/propriétaire concordants, bytes intègres, payloads valides sous leur schema.
2. Aucun dangling ref, cycle interdit, doublon de sélection ni couple PT/RT/TeamActual dupliqué ; versions immuables et IDs réservés.
3. Couverture ActualPeriod égale à l'union contiguë des refs de dates ; exactement une cellule par association existante et sous-période, zéro compris ; cellules des associations retirées traitées selon statut, pas doublées.
4. Chaque PTEC existant référence la version ActualPeriod courante du même Project ; ETC exact et completed cohérent ; dailyCap conservé.
5. Settings groupés résolvent le Program/Pas sélectionné ; effectiveColor dérivée suivant le contrat actuel. Priorités complètes et déterministes suivant T08.
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
nécessaires nouveaux, tous PTEC courants rebondés atomiquement avec preuves.

PT/RT/Team avec **une version historique** de consommation non nulle sont
non supprimables, même si leur dernière consommation est corrigée à zéro. Les
index « ever nonzero » doivent couvrir les versions non référencées, pas seulement
Current ou les captures conservées. Ils sont reconstructibles depuis le registre
et vérifiés ; ils ne remplacent pas les versions. Les références historiques
seules, toutes à zéro, ne doivent plus interdire un tombstone Team ; aucune
suppression physique de capacité, identité ou cellule n'en découle.

Supprimer logiquement Project/Reservation publie deleted, conserve tout l'historique
et retire Forecast **et Actuals** du calcul Current (règle utilisateur 11).
Cela ne supprime pas en cascade les PT/RT protégés ; comportement des associations
au restore à arbitrer T05. Restore publie existing sous le même ID, jamais une
mutation de version deleted. Restore Team ne réactive aucun ancien PT/RT ;
réassociation explicite retrouve le même ID de couple et complète les cellules
sur **toute** la partition actuelle, sans reprendre une ancienne grille partielle.

Masquer Team n'enlève pas ses occupations historiques ni sa capacité nécessaire
au graphe. Interdire si ETC positif ou demande future Reservation ; déterminer
« future » et l'effet de inactive/deleted avant d'implémenter (T06). Le masquage
est une visibilité, pas un moyen de réduire une surcharge métier.

## 4. Matrice des 23 invariants : code, écarts et validations

Légende : **C** compatible tel quel pour la règle métier citée (représentation
versionnée encore nouvelle) ; **A** adaptation requise ; **M** contradiction ou
règle manquante. V1–V7 désignent les lots futurs de §8, pas les formats backups.

| N° / décision utilisateur | État / repères existants | Écart ou règle cible à respecter | Validation proposée / lot |
| --- | --- | --- | --- |
| I01 partition contiguë | C : C02 validateBase | Même invariant, refs exactes au lieu de payload inline. | Trou/overlap/fin/début/bissextile, refs permutées : refus ; V1/V2. |
| I02 cellule complète zéro compris | A : C02 participation + consumed | Couverture alignée PT/RT existants, unicité stable TeamActual ; retired distinct. | Matrice N×S complète, doublon/absence/zero, réassociation B02 ; V1/V3. |
| I03 PT/RT historique non-zéro protégés | M : C03 protège non-zéro **courant** ; pas d'entité association | Scanner/indexer toute histoire, y compris corrigée/non référencée. | Positif→zéro→retrait refusé ; V1/V2/V3. |
| I04 Team protection/masquage | M : removeTeam C04 bloque toute référence, même zéro ; pas masquage | Tombstone zéro autorisé avec refs conservées ; non-zéro interdit ; conditions de hide T06. | B05, zéro historique, ETC>0, ratio/fixed future ; V1/V3. |
| I05 correction TeamActual + ETC Team | A : C03/C04 R1 consommation ciblée | Stable ID/cellule versionnée ; Reservation sans ETC, preuve consommation seule. | Une Team changée, autre inchangée, preuve stale ; V1/V3. |
| I06 partition + confirmations | A : C03/C04 R1 toutes Teams | Nouveau AP et rebond de tous PTEC y compris completed, T10. | Split/merge/dates, confirmations distinctes du texte ; V1/V3. |
| I07 PTEC tous sur AP courant | M : pas PTEC, RAF requirements indépendant | Nouvelle égalité de référence, **pas** égalité numérique permanente avec RAF ancien. | PTEC oublié/période autre Project refusé ; V1/V3. |
| I08 completed zéro / reopen | M : engine complete dérivé, aucun statut persistant PTEC | Distinguer complétion métier de complétion du run ; réouverture explicite. | B07, completed + ETC positif refusé, action reopen ; V1/V3/V4. |
| I09 demandes Reservation indépendantes | C : C01/C03 allocations ≠ consommations | RT versionné reste inchangé lors de corrections Actuals. | Demande avant/après correction strictement égale ; V3/V4. |
| I10 Forecast après Actuals | M partiel : C06 Project C, Reservation contradiction | Borne par propriétaire commun à ses Teams ; exclure demande Forecast Reservation jusqu'à T. | Tous jours positifs, covered-zero, ratio/fixed, overload/deadline ; V4. |
| I11 inactive vs deleted | A : C01/C05 inactive déjà Forecast seul, pas deleted | Filtrer deleted avant occupation, facts et moteur ; jamais filtrer inactive des Actuals. | B04/B09, impacts capacity/metrics, historique indépendant ; V3/V4/V6. |
| I12 restore existing nouveau | M : C04 suppressions physiques ou refus | Commande restore sous ID retenu et preuves adaptées. | Capture avant/après delete/restore, refs bytes intactes ; V1/V3. |
| I13 restore Team sans associations | M : pas restore | TeamSettings seule ; PT/RT restent tombstones. | Aucun RAF/demande revenant au restore Team ; V3. |
| I14 réassociation stable + couverture | A : C02 retired/reintroduced valeurs explicites | ID couple permanent, cellules sur nouvelles sous-périodes aussi. | B02 et unicité après plusieurs cycles ; V1/V3. |
| I15 earliest borne Actuals | M : C02/C04 Actuals peuvent être hors dates planning | Changement earliest incompatible doit être opération composite confirmée ou refusée ; objective/mandatory sans clipping. | B01, dates absentes/égales, limite impossible ; V1/V3. |
| I16 raccourcissement reconfirmé | A : C03 erosion conserve zones non changées | Pas prorata ni cellule courante attachée à portion exclue ; archive intacte, T11. | Quantités reconfirmées sur nouveau intervalle, orphan courant refusé ; V3. |
| I17 extension début saisie explicite | A : C03 extension preuves | earliest plus tôt n'invente pas d'Actuals ; extension de couverture si demandée exige cellules explicites, zéro autorisé. | B01, aucune propagation zéro sur zone nouvelle non confirmée ; V3. |
| I18 objective sans extension auto | C : C01/C04 objective descriptive | Settings nouveau seulement ; AP/TA inchangés. | Comparaison refs avant/après, aucun draft Actuals publié ; V3. |
| I19 graphes complets | M : C07 copies + préfixes via Current | Manifestes/ref closure autonome, toutes dimensions moteur. | Résolution sans Current, suppression capture/source, ref manquante ; V1/V2/V6. |
| I20 capacités versionnées sélectionnées | A : C05 capacité de Portfolio résolu, C07 copie historique | TeamCapacity + PlanningSettings exacts ; aucun latest fallback. | B06 conservation rationnelle/daily weights différents ; V4/V6. |
| I21 CAS/recovery publication atomique | A : C09/C10 acquis compatibles | Élargir write set ; mêmes garanties receipts/unknown/reload. | Abort/ack perdu/postcommit/RAM reconcile échoué/two tabs ; V2/V5. |
| I22 migration V4–V8 vérifiée atomique | A : C08/C09 staging déjà livré | Normalisation nouvelle et états non convertibles ; activation tout ou rien. | §7 corpus, interruptions/quotas/concurrent writes ; V2/V5. |
| I23 knowledgeDate déclarative ≠ createdAt | M : C07 createdAt seul au niveau Portfolio | Ne pas confondre knowledgeDate Actuals interne, exportedAt ou horloge système ; T09. | B08, mêmes dates/horloge reculée/bornes legacy ; V1/V2/V7. |

## 5. Arbitrages explicites et recommandations

Aucun choix ci-dessous n'est adopté silencieusement. Les règles utilisateur ne
sont pas à revalider ; leurs détails non spécifiés et leurs conflits historiques
nécessitent un contrat ratifié avant implémentation.

| ID | Contradiction / question | Options | Recommandation et gate bloquée |
| --- | --- | --- | --- |
| T01 | IDs/versions nouveaux, concurrence et imports | Séquences par identité sous CAS ; IDs opaques avec parent explicite ; dédup hash de contenu | IDs opaques + propriétaire immuable, séquence si utile sous CAS ; dédup seulement payload identique avec provenance préservée, jamais fusion de faits. V1 spécifie collision et retry. |
| T02 | Planning/order/dailyCap absents de la liste cible | Copier dans manifeste ; entités auxiliaires versionnées ; ranger dailyCap dans PTEC | Versionner PlanningSettings/PortfolioOrder ; dailyCap dans PT, ETC dans PTEC. Manifeste refs seul, fermeture complète. V1 bloqué sans choix. |
| T03 | periodId actuel = contenu immutable ; cible identité stable avec dates versionnées | Alias systématiques anciens ; lignée par provenance ; tentative de matching par dates/quantités | Provenance lossless des anciens IDs ; aucune lignée inter-versions déduite d'une ressemblance. Nouvelles éditions distinguent ajustement/split/merge explicitement. V1/V2. |
| T04 | Taille des manifestes / fermeture explicite | Toutes sélections plates ; racines + closure implicite ; listes refs + dépendances exactes | Tables explicites requises + validation fermeture des refs embarquées, index dérivé. Pas de « latest » pour économiser des bytes. V1/V2. |
| T05 | Restore Project/Reservation et statut associations | Réactiver toutes ; rétablir sélection dernière existing ; restore Settings seul puis revue | Restore sous ID stable, revue explicite des PT/RT/ETC avant publication ; pas cascade de suppression des associations à non-zéro. I13 pour Team reste distinct. V3. |
| T06 | Masquage et « demande future » ; suppression Team zéro encore active | Flag UI temporaire ou TeamSettings ; date knowledge ou today/horizon ; demandes configurées ou actives | Flag versionné proposé ; comparer dates civiles à une date de référence explicite, vérifier demandes réellement positives avec calendrier **hors horizon**. Contrat doit choisir inactive/RT/deleted et sort des associations zéro au delete Team. Aucun effacement implicite. V1/V3. |
| T07 | Catalogues usage-driven actuels vs conservation des identités | Garder auto-pruning physique ; auto-tombstone ; catalogue explicite existing/deleted | Conserver IDs/versions, éventuellement auto-tombstone atomique ; définir uniqueness noms existing et réutilisation/restauration sans fusionner IDs historiques. Conserver règle ownColor/Program. V1/V3. |
| T08 | PriorityOrder et deleted/restored | Retirer/reappend ; garder toutes positions ; conserver rang séparé | Garder ordre des identités incluant inactive/deleted puis projection filtrée, si ratifié ; restore retrouve rang, pas de modification implicite des priorités actives. V1/V4. |
| T09 | Dates de connaissance Portfolio : contraintes non présentes au niveau capture | Libre déclarative ; borne par toutes couvertures ; ordre métier monotone ; borne à createdAt | Pas de borne technique à createdAt/exportedAt pour les formats héritant 11A. Proposition pour nouvelles captures : date civile déclarative ≥ fin des Actuals sélectionnés ; captures même date permises. Monotonie entre captures et ordre d'affichage restent à arbitrer. Ne pas dériver les dates manquantes legacy de createdAt. V1/V2/V7. |
| T10 | completed lors d'un changement AP | Reopen automatique ; recopier sans preuve ; confirmer zéro en restant completed | Nouvelle version PTEC sur nouvel AP, preuve explicite du zéro, completed conservé ; toute valeur positive exige action reopen séparément exprimée. Aucun passage open automatique. V1/V3. |
| T11 | Érosion et portions exclues | Persist portion exclue actuelle ; prorata ; reconfirmation nouvelle zone avec ancienne version archivée | Reconfirmation sur nouvelle couverture, aucune portion exclue courante ; les anciennes TA restent des versions d'archive, non des orphelins du graphe Current. Définir rebase sur dates modifiées. V1/V3. |
| T12 | Anciennes captures incompatibles et obligation refs-only sans résultats | Conversion exhaustive destructive ; rejet entier ; archive legacy immutable + projection versionnée qualifiée | Conserver bytes/IDs/inputs/results/profiles legacy comme artefacts hérités, hors nouveaux manifestes, jamais fallback calculé. Conversion lossless des inputs possibles vers graphes qualifiés legacy ; sinon « Recalcul indisponible ». Nécessite ratifier l'exception de conservation legacy au principe sans résultats. V2/V5/V6. |
| T13 | ActualPeriod sans couverture ; PTEC référence obligatoire | Ref nullable ; AP vide explicite ; pseudo-période datée | AP vide explicite, aucune sous-période/cellule, aucune fausse date ; distinguer none et uncovered legacy par provenance. PTEC pointe sa version vide. Confirmation initiale/migration requise. V1/V2. |
| T14 | PTEC open/completed historique absent | Inférer completed de ETC=0 ; tous open ; demander utilisateur | Zéro ne prouve pas completed ; pour nouveau Current proposer open avec décision explicite de migration, archive ne revendique aucun statut ancien. V2/V3. |
| T15 | Correction deleted, supprimé des calculs | Autoriser correction sous tombstone ; imposer restore ; refuser définitivement | Restaurer explicitement avant édition cible ; anciennes corrections historiques intactes. Inactive reste éditable. À ratifier, V3. |

Contraintes temporelles **déjà validées** : V5 Actuals `through <= knowledgeDate`,
versions knowledgeDate non décroissantes ; import V5 standalone impose knowledgeDate
≤ date UTC exportedAt. 11A/V6–V8 n'imposent aucune relation technique entre
createdAt/exportedAt et les dates Actuals ; horloges égales/rétrogrades acceptées,
tri actuel `(createdAt,snapshotId)`. Ni les délais Project ni les bornes V4 futures
acceptées ne permettent de réécrire le passé. T09 ne peut rétroagir sur ces formats.
Si le produit exige autre relation pour les nouvelles captures, versionner la
règle et établir un exemple attendu ; « respecter les contraintes validées » ne
permet pas d'inventer une limite à today au niveau Portfolio.

## 6. Contre-exemples et cas limites à démontrer

| Cas | Contre-exemple concret / contrat actuel | Comportement cible et preuve attendue |
| --- | --- | --- |
| B01 dates Project | Actuals 01–31/01 = 10 ; earliest passe au 15/01. C02 admet hors dates ; tronquer à 15 ne justifie pas 5 ou 10. | Apply Settings isolé refusé tant que candidat composite non confirmé. Nouveau AP 15–31, consommation explicitement reconfirmée, tous ETC requis ; ancien 10/31 jours conservé. earliest reculé au 01/12 ne crée rien automatiquement ; si couverture étendue, saisie des nouveaux jours, même zéro. objective et mandatory ne coupent jamais les Actuals. |
| B02 réassociation | Team retirée à zéro après S1 ; S2/S3 ajoutées ; réassociation avec ancienne grille S1 seule. | Même PT/RT ID ; saisie/confirmation des TA sur S1/S2/S3, pas absence assimilée à zéro. Si ancienne consommation historique positive, retrait désormais interdit I03. |
| B03 dates SubPeriod | S1 janvier, TA(A,S1)=7 ; S1 finit au 20/01 avec S2 ajustée. Actuellement periodId doit changer, même pour consommation seule. | Stable S1 ID, nouvelle version dates/AP ; TA ID(A,S1) reste, nouvelle consommation confirmée sur nouveaux jours ; aucune réutilisation d'une ancienne preuve datée. Split nécessite nouvelles identités et lignée explicite T03. |
| B04 delete/restore objet | Project avec 10 Actuals est actuellement non supprimable ; cible deleted retire ces 10 de l'occupation Current. | Un seul commit de tombstone, recalcul des occupations/surcharges, capture antérieure toujours à 10. Restore existing sans mutation ; revue associations T05, aucune duplication de 10. Même scénario Reservation ratio/fixed et inactive. |
| B05 Team zéro historique | Capture ancienne cite Team, TA tous zéro, aucun ETC positif/demande ; removeTeam actuel refuse déjà participation/retired. | Tombstone permis après contrôle cible et sort explicite des associations ; refs historiques/capacité intactes, identité non réutilisable. Ajouter version non référencée TA=1 fait refuser delete. Restore Team laisse PT/RT supprimés. |
| B06 capacité après capture | Janvier TA=10, capacité concentrée semaine 1 ; capture M1 ; nouvelle capacité semaine 2. | M1 redistribue toujours semaine 1 avec ses refs Planning/Capacity ; M2 utilise semaine 2. Somme 10 exacte dans les deux ; pas de copies quotidiennes persistées. Tester exceptions et fallback capacité zéro. |
| B07 completed + AP évolué | PTEC completed=0 sur AP1 ; AP2 couvre un mois supplémentaire avec consommation changée. | PTEC version nouvelle, AP2, preuve zéro, toujours completed ; si ETC=3, reopen explicite. Pas de statut déduit de engine.complete ou RAF source historique. |
| B08 knowledgeDate égale | M1 knowledge=30/09 créé 02/10 ; M2 knowledge=30/09 créé 05/10, inputs différents ; horloge technique peut reculer. | Deux IDs, deux graphes, aucun écrasement. Ordre métier/technique défini T09, tie-break ID ; migration ne fabrique pas knowledge à partir des dates de création. |
| B09 correction inactive/deleted | Inactive garde Actuals et accepte édition ; deleted doit exclure ses Actuals, même conservés. | Inactive : nouvelle TA/proof/PTEC, toujours pas Forecast. Deleted : recommandation restore explicite T15 ; aucune édition fantôme ni réactivation via correction. History seule ne possède aucune commande d'édition. |
| B10 capture ancienne invalide cible | Ancien Project Actuals avant earliest, Reservation Forecast chevauchant Actuals, V4 future/intermittent et capture avec RAF1. | Validation sous schema original puis classification conversion/simulation ; pas refus rétroactif de capture valide, pas réparation ni nouveau Forecast persisté. Recalcul courant peut changer ou être indisponible, archive inchangée. |
| B11 positif puis zéro | TA v1=4, v2=0 ; dernière grille zéro. C03 permet retrait courant dans certaines conditions. | I03/I04 vérifient v1 y compris non référencée, refusent suppression ; masquer si conditions restantes satisfaites. |
| B12 graphes et concurrence | Tab A corrige TA, tab B change AP depuis même token ; Save depuis ancien run, ack commit perdu. | Une seule publication gagne CAS ; pas mélange TA/AP/PTEC. Retry même operationId consulte receipt ; unknown bloque mutations et garde drafts jusqu'au reload confirmé. |

## 7. Migration, stockage et faisabilité

### 7.1 Conversion exacte versus histoire inconnue

« Migration V4–V8 » signifie lecteurs des données sources V4 à V8 vers un
**nouveau format normalisé à numéro ratifié**, pas renommer V8 ni rejouer une
séquence historique de mutations qui n'a jamais été enregistrée.

| Source | Convertible exactement | Impossible à prétendre reconstruire / décision nécessaire |
| --- | --- | --- |
| V4 Current | Configurations présentes, calendriers/Planning/order, cumulés/deltas exacts et RAF/provenance ; préserver raw V4 | Dates de connaissance initiales, ancienne capacité au moment d'un record, membership complet intermittent, versions Settings absentes. Pas de vraies AP historiques inventées. Reconciliation explicite des périodes/cellules et borne earliest ; source legacy reste exclusive avant reconciliation. |
| V5 Current | Toutes versions object-scoped, coverage/partition, participation, retired, consommations/RAF exacts, knowledge et IDs | Pas d'identité TA/PT/RT historique déclarée, ni stable SubPeriod traversant les periodId remplacés. Projection de migration avec mapping/provenance, pas preuve que ces IDs existaient à l'époque. Capacités anciennes hors captures inconnues. |
| V6 captures | Inputs1 copiés, refs V5 résolues par préfixe, V4 inline, métriques schema1 | Aucun profil quotidien ; aucune knowledgeDate Portfolio ; pas enrichissement de profil, pas dates synthétiques. |
| V7 captures | Inputs1, profils forecast1/2 et inputs historiques exacts | Résultats calculés ne sont pas de l'input ; conserver legacy original, ne pas les transformer en TA observés. Chevauchements anciens restent anciens. |
| V8 Current/captures | RAF requirements indépendant, inputs2/RAF2, sources et mixed inputs1/2 × forecast1/2 | RAF snapshot ne remplace jamais le RAF Current ; completed non connu ; nouvelles règles earliest/Reservation non attestées. |
| Configurations historiques répétées | Payloads copiés exactement dans les captures, TeamCapacity/Settings sélectionnables par capture | Ordre causal des changements entre captures, deleted/restored non observés et versions disparues non récupérables. createdAt ne prouve pas la date d'un changement métier. |

Pour chaque unité convertie, journal source hash/schema/chemin/ID → nouveaux IDs
et refs, classification exact/reconciliation/legacy-only/unavailable ; égalité
structurelle et rationnelle des inputs représentables, inventaire des bytes/IDs
legacy préservés. Aucun statut completed, knowledgeDate Portfolio, zéro manquant
V4 ou capacité historique non présente n'est créé comme fait connu. Les métadonnées
« créé par migration » décrivent la transformation réelle, pas le passé métier.

Confirmations utilisateur futures : réconciliation V4, consommations hors nouvelle
borne earliest, cellules manquantes, statut PTEC initial, restauration/retombstone
catalogue si nécessaire, policy T09 et choix Current à activer. Préflight affiche
les différences exactes, aucune confirmation globale vague ne remplace la preuve
par Team/période. Pas de migration partielle active pour passer une erreur.
Source anciennement valide mais non simulable reste exportable ; corruption/schema
inconnu/dangling original déclenchent recovery, pas « indisponible » bénin.

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
Les indexes ever-nonzero/uniqueness ne doivent pas décrémenter en oubliant le passé.

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
normalisés incluent versions non référencées. Export autonome contient registre,
manifestes, provenance, legacy et schemas ; aucune dépendance à Current distant.
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
ni synchronisation durable des deux modèles. Un adaptateur readonly legacy ou
une génération scellée de recovery ne sont pas une seconde autorité editable.

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
sans arbitrages, audit et autorisation distincte**. V1…V7 sont des étiquettes de
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
| V1 Domain et contrats | C01–C08, I01–I23 ; ratifier T01–T15 pertinents, surtout temporalité/absence/lifecycle | Schéma logique fermé, identity/ref factories, graph validators, commandes conceptuelles, contrats legacy vs cible | Unicité/propriétaires/refs, rationnels, statuses, partitions, dates/reopen ; I01–I20/I23 ; B01–B11 ; oracles de fermeture indépendants | Fixtures malformed/dangling/unknown, contrat transport exact ; conception workflows revue clavier/Apply/Cancel, migration mappings et absence explicite | Complexité linéaire graphe/index, pas whole archive au Current ; GO si ambiguïtés bloquantes levées et tests contractuels exacts ; NO-GO lignée/date synthétique ; rollback retirer composants dormants sans aucune donnée modifiée. |
| V2 Persistence, migration, imports/exports | V1 ratifié, T12/13/14 et budgets initiaux, contrats 11D.0 | Registre immutable/manifestes, nouveau portable dispatch, staging/mappings/archive, index ever-nonzero et refs, read-back | Memory adapter CAS/receipt avant CAS, duplicate divergent, graph closures/index rebuild ; export inclut orphan versions ; round-trip exact sous schema original | IDB natif transaction abort/quota injecté/crash ; V4–V8 corpus §7, source changée, reprise plusieurs fois, captures mixtes/incompatibles ; navigateur blocked/versionchange/two tabs ; aucune activation utilisateur | Bytes et pic staging/export/import, batches bornés ; GO si zéro perte/dangling/activation partielle et diagnostics distincts ; NO-GO corruption acceptée ou quota cachée ; rollback ancien actif, discard génération privée. |
| V3 Application, commandes, édition | V1/V2 préparés, T05/06/15 ratifiés, bases et preuves 11D.1 | Préparation candidate versionnée, refs dans bases RAM, Apply atomique, tombstone/restore/hide/reassociate/reopen explicites | R1/R2 A/no-op/RAF/publish, stale/ref et rebase disjoint, I02–I09/I11–I18 ; B01–B05/B07/B09/B11 | Dispatch persisté versions+manifest ; abort conserve drafts ; native UI 1440/390 px, clavier/modales, Cancel S1–S6 et V1/V2/R1 anciens ; legacy reconciliation sans activation | Une projection par opération effective, zéro frappe/no-op ; GO si proofs ciblés et aucune mutation avant commit ; NO-GO completed implicitement rouvert/texte=confirmation ; rollback adapters dormants/flag off, ancien Current autoritaire. |
| V4 Moteur inputs versionnés | V1/V3, schema résolu pur, T08 et borne Reservation ratifiés | Resolver→inputs exacts→reconstruction→moteur/projections ; filtre deleted et borne Reservation ; chain identity nouvelle | Garder priorité/slots/caps/deadlines/quanta/overloads ; I09–I11/I15/I20 ; Project 11C inchangé, ratio/fixed Request config indépendante ; all-positive-days oracle | Intégration Current candidate + capacities/Planning même manifeste ; export/read puis même run ; navigateur Project/Reservation Actuals/forecast zero/inactive/deleted ; migrated legacy qualifié séparément | Target/stress/fractions/lookahead, off-horizon estimation ; GO parité ancienne là où règles identiques et différences intentionnelles documentées ; NO-GO filtrage après allocation/fallback Current ; rollback noyau dormant avant activation. |
| V5 Bascule atomique | V2–V4 + V6 + V7 consultation minimale validés, confirmation migration, client version gate, export recovery vérifié | Une authority versionnée active, Save refs-only, reprise startup et portabilité ; ancienne génération scellée | I19–I23, CAS complet, bytes/index/read-back, hash/policy source ; aucun dual-write | E2E upgrade/startup deux onglets, interruption avant/pendant/après switch, ack perdu, anciens clients, import/export/reload ; migration exacte ou reconciliation approuvée ; nouvelle capture consultable immédiatement | Pic coexistence staging/ancien/nouveau + quota ; GO uniquement toutes gates dépendantes et audit positif ; NO-GO capture inaccessible/nonconvertible non explicitée ; rollback pré-switch inchangé, post-switch §7.3 avec export/confirmation si perte. |
| V6 Service simulation historique | V1/V2/V4, G1 11D.2 et T12 ; nouvelle authority encore dormante avant V5 | Pipeline Application indépendant UI pour Current/Snapshot, résolution ciblée sans Current, facts puis simulation, DTO exact/worker/scheduler/cache | I19/I20, B04/B06/B08/B10/B12 ; oracles G1 portés, getters Current/forecast qui lèvent, isolation graphs, déterminisme process/TZ, conservation et résultats complets | Worker actual refs/rationnels, expected token/epoch/cancellation, missing/corrupt/unsupported/resource/transient distincts ; native annuler/refresh/release, Current disponible sous History ; legacy export toujours intact | Admission avant calcul dense, off-horizon/prefix/lookahead compris, caches bornés/release, copies mesurées ; GO exactitude + budgets intégrés, NO-GO fallback anciens résultats/exhaustivité supposée ; rollback service dormant avant V5, ensuite forward fix ou consultation indisponible explicite sans réécriture. |
| V7 History et reprise comparaisons | V6, T09 et cap scope ratifiés ; minimum consultation avant V5, avancé après | Liste indexée, découverte progressive, facts, résultats simulés et comparaisons par stable ID ; source/chaîne/indisponible visibles | I19/I23, union historique présence unknown≠absence ; même knowledgeDate distincte ; comparaison précédent présence/semantique décidée ; labels/couleurs issus du manifeste | Native cold/warm/navigation/keyboard/mobile, drafts Planning et modales conservés, stale reads ne publient pas ; legacy sans profil non enrichi ; import/delete/restore ne mélangent pas sources | First page/facts/first sim/cap/release mesurés ; GO cap exact pour portée annoncée et aucune simulation historique systématique à ouverture ; NO-GO cap global promettant exhaustivité avec chargement progressif ; rollback UI avancée vers consultation minimale, jamais capture inaccessible. |

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
cités, couverture I01–I23/B01–B12/T01–T15/V1–V7 et portée Markdown uniquement.
Les résultats de ces contrôles figurent au compte rendu final.

Contrôles documentaires de cette livraison : liens relatifs du plan (18) et
chemins code qualifiés cités (20) existants ; matrices I01–I23, B01–B12,
T01–T15 et V1–V7 complètes ; liens de suivi ajoutés résolus. Diff limité aux
trois fichiers Markdown de cette livraison. Aucun test applicatif, build,
benchmark, scénario navigateur ni migration exécuté pour ce plan. Le contrôle
final `git diff --check`, le commit/push, le SHA et le status/synchronisation
sont consignés dans la réponse de livraison.

## 10. Conclusion de faisabilité et état des décisions

**Décisions validées utilisateur** : entités à identités stables et versions
immuables ; Current/captures manifestes refs exactes, sans nouvelles copies ni
résultats ; publication atomique et conservation intégrale ; 23 invariants de la
mission. Acquis 11D.0/11D.1/11D.2 préservés avec leurs limites. La cible copiée
11D.2 est dépassée par cette nouvelle mission, pas son acquis de preuve G1.

**Propositions techniques à arbitrer** : T01–T15, notamment compléments
Planning/order/dailyCap, AP vide, identité split/merge et mapping legacy, hide/future,
restore objet/associations, priority deleted, catalogues, dates déclaratives,
completed en migration et exception archive legacy. Numéros portable/physique,
budgets et contrat de service restent à fixer dans les lots.

**Contradictions/bloqueurs** : ancienne identité période liée au contenu ;
Reservation additive sans borne ; Actuals hors earliest auparavant valides ;
suppressions physiques/restrictives ; resolver préfixe dépendant Current ; absence
PTEC/completed/knowledgeDate Portfolio ; conservation des anciens résultats face
au principe cible sans résultats. Aucun de ces écarts n'est réparé dans ce commit.
Les invariants cibles sont cohérents pour de nouveaux graphes si les arbitrages
ci-dessus sont explicites ; une conversion automatique universelle V4–V8 n'est
pas démontrée et serait trompeuse pour les informations absentes.

**Risques migration** : invention de lignée/dates/status/zéros/capacités anciennes,
amputation/prorata, perte de versions non référencées, collision imports, quota
et pics texte/copies/dense simulation, stale CAS/ack, ancien client et downgrade
avec perte. Staging/archives/provenance/reconciliation et gate unique les traitent,
sans prétendre restaurer un historique jamais enregistré.

**Lots prêts ou non** : aucun V1–V7 prêt à implémenter dans cette mission ; V1
prêt pour arbitrage/audit de contrat, les suivants conditionnés par ses sorties.
11D.3/4/5 anciens non commencés et remplacés/rebasés selon §8. Aucun nouveau lot
implémenté ou DONE. Fin après livraison documentaire du PLAN ; aucune implémentation
ni migration autorisée.
