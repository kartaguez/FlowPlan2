# P0 — Catalogue des invariants et des preuves de fermeture

Date : **2026-10-13**. Baseline :
`c1ae876ef85276ff3c13d236b7617c3410140d10`.
Référence normative : [addendum P0](./rewrite_simplification_p0_addendum.md).
Sources métier : [plan R1.2](./rewrite_r12_plan.md) §4–6,
[canon R1.2](./rewrite_r12_canon.md) §Architecture/§Décisions,
[décisions A-R12-01–09/B1–B4](./rewrite_decisions.md),
[canon R1.1](./rewrite_r11_canon.md) §Invariants,
[plan R1.3](./rewrite_r13_plan.md) §6–16.
Le code livré a été lu pour confronter champs et diagnostics à ces sources ;
il n'est pas modifié et aucun validateur ciblé n'est implémenté ici.

## 1. Notation et portée

`M` est le manifeste ; `S` ses enveloppes exactes ; `H` les archives publiées ;
`B` les nouvelles enveloppes candidates. Les ensembles avant/après sont suffixés
0/1. Une identité est `(kind, EntityId)` ; une ref ajoute `VersionId`. AP =
ActualPeriod, SP = ActualSubPeriod, TA = TeamActual. Les racines Project,
Reservation et Team sont les owners des Settings sélectionnées, tombstones inclus.
Une identité sans version ne sélectionne jamais un payload : seule M le fait.

Les familles C01–C16 du plan P0 sont conservées ; leurs suffixes ci-dessous
décomposent les règles. Le chemin **complet** évalue toutes les lignes sur les
données acquises, avec les limites contextuelles R1.1. Pour le chemin **ciblé**,
chaque ligne doit recevoir soit un témoin **U** d'égalité de tous ses opérandes
et de son ensemble quantifié, soit une preuve **A** de fermeture et son évaluation
sur le candidat. Les tables donnent le périmètre A lorsqu'il est requis ; U est
toujours possible seulement si l'égalité intégrale est démontrée. Les preuves
de complétude E0–E8 et relations R01–R12 sont définies aux §6–7.

`L(v)` : validation de l'enveloppe et de **tout** le payload d'une version
nouvelle ou acquise unknown, pas seulement du champ modifié. `K` : contexte
explicitement acquis pour contrôles R1.1/registre ; ce n'est pas H complet par
définition. `I` : autorité d'unicité de portée attestée ; K ou S ne remplace pas I.

## 2. Forme, références, identité et sélection

| ID | Invariant | Entités et champs | Ensemble quantifié | Dépendances directes/inverses | Validation complète | Validation ciblée |
| --- | --- | --- | --- | --- | --- | --- |
| C01-DATA | Données de forme fermée, champs obligatoires, records simples/listes denses, sans getter invoqué, symboles, objets exotiques, cycles ni alias mutable ; absence explicite null ou OptionalQuantity | Tous payloads, refs, owners, enveloppes, M et wrappers | Toute entrée inconnue et tous descendants | Conteneur→champs/éléments ; champ→conteneur | Acquérir, copier, valider et geler intégralement | L(B) et nouvelles structures ; partage seulement des objets déjà acquis immuables, preuve d'absence d'alias. |
| C01-PRIM | Rational canonique BigInt (dénominateur positif, PGCD=1, zéro 0/1), familles/unités Quantity exactes et bornes ; CivilDate ISO grégorienne 0000–9999 ; IDs typés non blancs sans altérer octets | Toutes quantités/dates/IDs | Toutes valeurs primitives acquises | Champ→primitive ; primitive→prédicats qui la lisent | Factories/validateurs R1.1 sur chaque valeur | Valider nouvelles valeurs ; U pour toutes valeurs immuables réutilisées ; aucune conversion implicite. |
| C01-REF | Ref = kind fermé + EntityId + VersionId ; résout exactement l'enveloppe demandée, jamais latest, défaut ou substitution | M et enveloppes S, bases historiques requises | Toutes refs demandées et réponse exacte | M/base→ref→enveloppe ; ref→sélections | Correspondance requête/réponse et resolver ; aucune ref demandée manquante, aucune ref non demandée admise par le lecteur | Résolution des refs nouvelles/bases et identité des refs conservées ; E0/E1 ; toute base requise indisponible refuse. |
| C02-OWNER | Owner de bon discriminant/kind ; même owner entre versions d'une identité, même à branches/racines indépendantes | Enveloppe.owner/ref | Toutes identités et leurs versions K ; B contre I et témoins pertinents | identité↔versions/owner ; owners↔racines | R1.1/registre sur K entier | L(B), owner attesté dans I, comparaison avec base ; owner divergent interdit, même si la sélection finale seule serait valide. |
| C02-LINK | predecessor facultatif unique exact, même identité et version différente ; aucun cycle fourni ; provenance liste exacte distincte sans auto-source ni doublon | predecessor, provenance et refs de B/K | Toutes enveloppes K et liens fournis | enfant→parent ; parent→enfants ; source↔utilisateurs si consultée | Contrôles R1.1, missingPredecessors/not-established fidèlement conservés | Nouveaux liens et témoins pertinents ; aucune contradiction connue ignorée ; si la sûreté d'append n'est pas démontrable, refus ; pas de fermeture/cycles de provenance inventés. |
| C02-COLL | Même ref exacte répétée seulement si enveloppe structurellement identique ; divergence owner/payload/predecessor/provenance refusée | Enveloppes de K/B, répertoire exact | Toutes répétitions dans K ; append contre ref existante | ref↔enveloppe | R1.1 compare données structurées, sans hash/JSON/float | Contrôler B en interne et contre répertoire/I ; répétition import idempotente possible selon R1.1, mais édition avec VersionIds neufs obligatoires. |
| C02-MAP | Mapping owner→identité par kind et couple unique dans le contexte fourni, non sélectionné inclus ; pas d'égalité artificielle Settings EntityId/owner | Settings, Capacity, AP, PT, RT, TA, PTEC, globals | Classes d'owners K pour les 11 kinds concernés | owner/couple↔identité↔versions | Registre valide toutes classes K ; plusieurs versions même identité admises | B contre mapping attesté I et classe sélectionnée affectée ; réemploi historique compatible, jamais allocation sur simple absence de K. |
| C03-SHAPE | M contient exactement portfolioId, deux globals et douze tables du kind prévu ; liste dense, une version par identité | Tous champs M | Toutes tables M et leurs refs | M.table↔kind/ref | Factory Manifest sur M entier | Contrôler nouvelles structures, refs/identités modifiées et membres avant/après ; E1. |
| C03-RESOLVE | Chaque membre de M résolu exactement ; S ne gagne aucune version par fallback depuis archives ; racines dérivées des Settings, sans table parallèle | M, S, inventories | Union exacte des refs M et S | M↔S ; Settings↔racines | Resolver et correspondance lecture exacte | M1/S1/index1 construits par même delta ; E1/E2 ; aucun nouveau root déduit de H. |
| C03-PORTFOLIO | Tous owners Portfolio des globals/Program/Pas égalent M.portfolioId | PlanningSettings, PortfolioOrder, Program, Pas | Tous membres de ces quatre kinds S | Portfolio↔globals/catalogues | Contrôler chaque owner Portfolio | L(B) et comparaison portfolioId ; modification externe du Portfolio impose nouvelle génération/acquisition, pas succession interne présumée. |

## 3. Payloads : tous les champs des 14 kinds

Chaque ligne est quantifiée sur **toutes** les versions du kind fournies au
chemin complet. Le ciblé valide par L tous les membres B du kind et utilise U
pour les autres ; les dépendances listées déclenchent en plus les invariants
inter-entités du §4 lorsqu'un opérande ou l'ensemble change. Les prédicats locaux
ne déduisent pas de règle Forecast, de plafond de charge ou de confirmation.

| ID | Invariant | Entités et champs | Ensemble quantifié | Dépendances directes/inverses | Validation complète | Validation ciblée |
| --- | --- | --- | --- | --- | --- | --- |
| C01-PS | Nom non vide après trim ; existing/deleted ; booléens stricts ; dates nullable ; mandatory=true exige objectiveEndDate ; Program/Pas identité correcte ou null ; ownColor canonique non null si Program null, null sinon | ProjectSettings.name/lifecycle/isActive/earliestStartDate/objectiveEndDate/mandatory/program/pas/ownColor | Toutes ProjectSettings K | R01/R02/R03/R07/R10 ; earliest→C15 ; lifecycle→C09/10 ; catalogue→C08 | Tous neuf champs et règles croisées | L(ProjectSettings nouvelles) ; U hors champs changés ; changement owner interdit ; fermeture des dépendances selon champs. |
| C01-RS | Même nom/lifecycle/booléens/groupements/couleur ; startDate≤endDate inclusifs | ReservationSettings.name/lifecycle/isActive/startDate/endDate/program/pas/ownColor | Toutes ReservationSettings K | R01/R02/R03/R07 ; lifecycle→C09/10 ; catalogue→C08 | Tous huit champs et intervalle | L(nouvelles Settings), dépendances de lifecycle/catalogue ; dates Forecast n'imposent pas de borne AP. |
| C01-TS | Nom non vide, lifecycle fermé, isVisible booléen ; aucune activation/charge dans payload | TeamSettings.name/lifecycle/isVisible | Toutes TeamSettings K | R01/R03/R04 ; lifecycle→C09/10 ; visibilité sans retrait de charge | Tous trois champs | L(nouvelles Settings), fermeture inverse PT+RT si lifecycle change ; U charges pour visibilité seule prouvée. |
| C01-CAP | Périodes chronologiques start≤end, sans overlap ; Capacity≥0, UnavailabilityRatio∈[0,1] ; exceptions chronologiques strictes/date unique et Capacity≥0 ; vide/gaps/hors horizon autorisés | TeamCapacity.periods[].start/end/dailyCapacity/unavailabilityRatio ; exceptions[].date/capacity | Toutes Capacity et leurs deux listes internes entières | R04 ; listes internes/date→C15 | Valider chaque item et ordre des listes entières, sans tri réparateur | L(Capacity nouvelles), listes entières du payload concerné ; mapping C05 si composition change. |
| C01-PROGRAM | Nom non vide déjà trimé et espaces réduits ; lifecycle fermé ; couleur #RRGGBB majuscules | Program.name/lifecycle/color | Tous Program K | R07/R08 ; lifecycle/name→C08 | Trois champs, forme canonique sans réparation | L(Program nouvelles), classe noms existing Program et usages si leurs opérandes changent. |
| C01-PAS | Nom canonique comme Program, lifecycle fermé ; pas de couleur implicite | Pas.name/lifecycle | Tous Pas K | R07/R08 | Deux champs | L(Pas nouveaux) et C08 si nom/lifecycle/composition change. |
| C01-PT | existing/deleted ; DailyCap absent ou present exact ≥0, zéro présent distinct d'absence | PT.lifecycle/dailyCap.kind/value, owner.ProjectTeam | Tous PT K | R03/R05/R09 ; lifecycle→C09/10/11/12 | Deux champs et OptionalQuantity du bon kind | L(PT nouveaux) ; composition/lifecycle ferme TA/PTEC ; DailyCap seul ne change pas grille par preuve. |
| C01-RT | existing/deleted ; demand union fermée ratio avec ReservationRatio∈[0,1] OU fixed-daily avec FixedDailyDemand≥0 ; zéro valide | RT.lifecycle/demand.mode/ratio OU daily, owner.ReservationTeam | Tous RT K | R03/R05 ; lifecycle→C09/10/11 | Mode et champs exclusifs, quantités exactes | L(RT nouveaux) ; demande seule n'autorise aucune disparition TA ni changement AP. |
| C01-AP | empty : from/through=null et subPeriods=[] ; covered : dates from≤through, liste non vide de refs exactes SP, identités SP non dupliquées | ActualPeriod.coverage/from/through/subPeriods[] | Tous AP K et leur liste entière | R02/R06/R09 ; C06/07/11/12/15 | Union de couverture et liste, sans knowledgeDate | L(AP nouveaux), ancienne/nouvelle partition et dépendances si coverage/bornes/liste change. |
| C01-SP | from≤through inclusifs, owner identité AP ; provenance facultative portée par enveloppe | ActualSubPeriod.from/through | Tous SP K | R06/R05 ; bornes→partition et contexte de cellule | Deux dates et intervalle | L(SP nouvelles), AP utilisateurs et TA associées ; conservation du couple TA si même SP EntityId. |
| C01-TA | consumed = Quantity Consumption exact ≥0, zéro explicite ; pas de sous-grille inline ni version SP dans owner | TeamActual.consumed ; owner.association/subPeriod | Toutes TA K | R05/R06 ; C11 et obligations ETC R1.3 | Quantité et owner de famille PTSubPeriod ou RTSubPeriod | L(TA nouvelles), cellule clé avant/après ; preuve de grille inchangée si seule consumed change. |
| C01-PTEC | actualPeriod identité AP, lastActualsDate date civile ou null, ETC exact ≥0 ; aucun status ni version AP | PTEC.actualPeriod/lastActualsDate/etc ; owner.pt | Toutes PTEC K | R09/R02 ; C12 | Trois champs | L(PTEC nouvelles), PT/AP et frontière ; revue ETC distincte de règle structurelle. |
| C01-PLAN | horizon start≤end inclusifs ; weekdays uniques entiers 1..7, liste vide valide ; maxParallelProjects entier sûr >0 | PlanningSettings.horizon.start/end/workingWeekdays[]/maxParallelProjects | Tous PlanningSettings K et listes internes | R11 ; C03-PORTFOLIO | Tous champs, aucune horloge/default dynamique | L(global nouveau), owner/mapping ; aucun clipping AP/Capacity/TA. |
| C01-ORDER | projectIds liste dense d'IDs Project uniques ; aucun ReservationId | PortfolioOrder.projectIds[] | Tous PortfolioOrder K et liste entière | R10/R11 ; C13 | Familles IDs et doublons | L(Order nouveau) et C13 sur tous Projects, inactive/deleted inclus. |

Pour toutes lignes locales : rejet des champs supprimés (AP.knowledgeDate,
status/complete/reopen PTEC, confirmed/suspended/isActive PT/RT), champs inconnus
et champs manquants. Couleur majuscule et nom catalogue déjà canonique sont
exigés à l'entrée ; le Domain ne les normalise pas pour réparer l'entrée.

## 4. Invariants inter-entités et ensembles

| ID | Invariant | Entités et champs | Ensemble quantifié | Dépendances directes/inverses | Validation complète | Validation ciblée |
| --- | --- | --- | --- | --- | --- | --- |
| C04 | Settings owner→identité 1:1 par kind, une version selected ; root défini uniquement par owner | Trois Settings/ref/owner, tables M | Tous owners de chaque kind et leurs Settings K/S | R01, C02-MAP/C03 | Registre sur K, racines sur toutes Settings S | B contre I ; pour changement composition, E2 sur classe de racines affectée et liens AP/Capacity/associations/Order ; valeurs seules utilisent U du mapping. |
| C05 | Exactement une TeamCapacity par Team selected existing ou deleted ; aucun owner Capacity étranger | TeamSettings/TeamCapacity.owner/ref | Toutes Teams S et Capacity S | R04 | Vérifier bijection dans les deux sens | E2 sur Teams/Capacity si composition change ; sinon témoigner clés/cardinalités inchangées. |
| C06 | Exactement un AP par Project/Reservation selected existing ou deleted ; aucun AP owner étranger ; identité stable | Settings.owner, AP.owner/ref | Toutes racines Project/Reservation S et AP S | R02 | Bijection dans les deux sens et mapping contextuel | E2 sur roots/AP si composition change, B contre I pour stabilité ; AP remplacé sous même identité ne recrée pas un root. |
| C07-REF | Chaque ref de AP.subPeriods est selected exacte, owner SP même AP ; union des listes = table SP entière, aucune SP étrangère, dupliquée ou commune à deux AP | AP.subPeriods, SP.ref/owner, M.actualSubPeriods | Toutes listes AP et toutes SP S | R06 | Résolution exacte et union avec cardinalités | E3 pour tous AP affectés et anciennes/nouvelles SP ; vérifier non-usage par autre AP ; U autres listes et table hors delta. |
| C07-PART | Covered : first.from=AP.from, last.through=AP.through, next.from−previous.through=1 jour civil ; empty : aucune SP | AP.coverage/from/through, SP.from/through | Liste entière de chaque AP, endpoints et adjacences | R06/R05 | Chaque liste entière, différence civile sans ajout hors plage 9999-12-31 | E3 avant/après des AP touchés ; changements SP réouvrent le contrôle AP même si bornes AP identiques. |
| C08-REF | Toute ref Program/Pas d'un Settings selected se résout dans sélection ; root existing→catalogue existing ; deleted→existing/deleted permis ; même Portfolio | Settings.program/pas/lifecycle, Program/Pas.ref/lifecycle/owner | Tous Settings Project/Reservation et refs non nulles | R07 | Résolution de tous usages, tombstones compris | E5 sur tous utilisateurs d'un catalogue changé ou liens old/new d'un Settings changé ; références supprimées traitées, aucune réparation implicite. |
| C08-NAME | Noms existing uniques par catalogue via clé locale fr ; même nom Program/Pas permis, deleted ne réserve pas le nom, existing unused permis | Program/Pas.name/lifecycle | Ensemble entier des existing par kind | R08 | Comparer toutes clés d'un kind | E6 sur classe complète du kind affecté ; U si noms, lifecycle et composition identiques. |
| C09-COUPLE | PT unique par (ProjectId,TeamId), RT par (ReservationId,TeamId), deleted inclus ; aucun deuxième EntityId pour le même couple dans K | PT/RT.owner/ref | Toutes associations K, puis S | R03/R01, I | Registre sur toutes versions K | B contre I et classe sélectionnée ; suppression conserve couple réservé ; plusieurs versions même identité permises. |
| C09-END | Deux endpoints selected présents ; si association existing, tous deux existing ; si deleted, endpoints présents quel que soit lifecycle | PT/RT.owner/lifecycle, Settings.owner/lifecycle | Toutes associations S et endpoints | R03 | Résoudre chaque association | E5 inverses root/Team affectés ; valeurs DailyCap/demand seules peuvent utiliser U endpoints/lifecycle. |
| C10 | Project deleted sans PT existing, Reservation deleted sans RT existing, Team deleted sans PT/RT existing ; PT deleted sans TA/PTEC, RT deleted sans TA | Settings, associations, TA/PTEC S | Tous endpoints deleted et toutes associations deleted avec liens inverses | R03/R05/R09 | Contrôler toutes associations/cellules/PTEC S | E8 cascade avant/après ; absence complète prouvée via inverses exhaustifs, pas via cache vide. |
| C11-KEY | TA owner = association PT/RT selected existing et SP de l'AP de son root ; une identité TA par (association kind+EntityId, SP EntityId) | TA.owner, association.owner/lifecycle, SP.owner | Toutes TA S et clés attendues ; K pour mapping identité | R03/R05/R06 | Vérifier chaque cellule/mapping via grille entière | E4 si composition/lifecycle/partition change ; consumed seule : même clé, ref exacte sélectionnée et facteurs inchangés prouvés, L(TA). |
| C11-GRID | TA selected = exactement produit associations existing du root × SP de son AP ; aucune cellule absente, étrangère, dupliquée ou sous association deleted ; zéro est un membre | AP, SP, PT/RT, TA | Pour chaque root, tous facteurs et produit cartésien complet | R02/R03/R05/R06 | Égalité des clés, cardinalité totale et une TA par clé | E4 sur roots dont les facteurs/composition changent ; pour valeurs seules, U des facteurs et clés permet de ne vérifier que les valeurs touchées. |
| C12-SET | Une PTEC par PT existing, zéro par PT deleted ; owner PT selected, jamais RT, aucune PTEC étrangère | PT.lifecycle/ref, PTEC.owner/ref | Tous PT et toutes PTEC S | R09 | Bijection conditionnelle dans les deux sens | E2/E5 sur PT/PTEC affectés ; ajout/retrait PT ferme tout son ensemble PTEC, U pour simples valeurs. |
| C12-AP | PTEC.actualPeriod = AP identité du Project du PT ; lastActualsDate=AP.through (null si empty), sans VersionId AP | PTEC.actualPeriod/lastActualsDate, PT.owner, AP.ref/through | Tous PT existing et leur PTEC/AP | R09/R02 | Vérifier propriétaire/AP et frontière pour chaque PT | Fermer tous PTEC des PT existing du Project si AP identité/through change ; AP nouvelle version même through et identité peut avoir U. |
| C13 | Order est permutation totale des ProjectIds selected, inactive/deleted compris, sans oubli/inconnu/doublon | Order.projectIds, ProjectSettings.owner | Tous Projects S et liste Order entière | R10 | Comparer ensemble, cardinalité et unicité | E7 sur liste entière et tous Projects si l'un change ; Rename seul peut témoigner les IDs et Order inchangés. |
| C14 | Une PlanningSettings et une PortfolioOrder selected, owner Portfolio concordant et mapping unique | Globals M/ref/owner | Les deux globals M et contexte de leur owner | R11/C03 | Résolution des deux refs obligatoires et mapping | Nouvelle version L + I, refs old/new exactes ; U de l'autre global ; aucune suppression de global admissible. |
| C15 | Project earliestStartDate non null≤AP covered.from, quel que soit lifecycle/isActive ; contraintes locales inclusives restent valides | ProjectSettings.earliestStartDate, AP.from ; tous intervalles locaux | Tous Projects/AP et intervalles | R02/R06 ; C01-CAP/RS/SP/PLAN/AP | Évaluer tous liens earliest/AP et intervalles | AP ou earliest changé ⇒ relire root/AP exacts et évaluer ; changements de bornes SP déclenchent C07 et obligations de cellule. |
| C16-META | Snapshot fermé {snapshotId,knowledgeDate,createdAt,manifest}, ID opaque distinct non blanc, CivilDate requise, createdAt ISO UTC fixe date/heure valides ; Current fermé {manifest,revision}, révision opaque non blanche | PortfolioSnapshot, CurrentSelection | Chaque wrapper acquis et tout son M | wrapper→M ; R12 | Factories complètes sans Date/horloge ; snapshotId lu = demandé | Entrée inconnue toujours complète ; métadonnées privées génération/index ne sont pas ajoutées aux wrappers métier. |
| C16-DATE | knowledgeDate≥chaque AP.through couvert, owners deleted/inactive et covered-zero compris ; vide sans contribution mais date déclarative toujours requise | Snapshot.knowledgeDate, AP.through | Tous AP selected par ce Snapshot, même sans TA | R12/R02 | Certification Snapshot complète ; refuser si un seul AP dépasse | Pas de validation ciblée de Snapshot acquise ; édition Current sans modification Snapshot : U de son objet et archives qu'il référence conservées. |
| C16-AUTO | Snapshot se résout depuis son M/ref exactes sans Current ni lignée transitive ; aucune version historique perdue après retrait du courant | Snapshot.manifest, S snapshot, H | Toutes refs du Snapshot et dépendances structurelles ; toutes archives conservées | R12 | Lecteurs Snapshot/versions seuls, fermeture R1.2 complète ; not-established distinct | Aucun Save automatique ou nouveau Snapshot ; commit Current préserve répertoire historique et refs existantes ; Save futur garde son propre contrat à qualifier. |

**Cas autorisés à conserver.** AP covered sans association existing, AP empty
avec PT existing/PTEC ETC positif et date null ; Capacity vide/gaps/exceptions
hors horizon ; RT existing à demande zéro ; TA zéro, sans plafond Capacity ni
limite horizon ; Project sans PT, Reservation sans RT ; Teams hidden chargées ;
AP Reservation hors intervalle Forecast ; plusieurs SnapshotId à même
knowledgeDate ou recul de cette date, si la borne de chacun reste satisfaite ;
aucun rapport knowledgeDate/createdAt ni monotonie ; objectiveEndDate avant earliest si
valide séparément. Pas de règle objective≥earliest, extension/clipping AP,
Consumption→ETC, historique positif interdisant delete, ratio effectif décidé
par moteur ou nombre minimal de membres. Ces absences de règle doivent figurer
dans les contre-exemples futurs pour éviter un durcissement involontaire.

## 5. Couverture des champs de sélection, enveloppes et wrappers

Tout champ local de payload figure au §3 ; toutes relations qu'il porte sont
associées aux IDs ci-dessous. Changer une ref entraîne C01-REF/C02/C03 même si
le payload et les relations sont égaux. Changer owner d'une identité existante
est toujours interdit ; ce n'est pas une transition susceptible d'être validée
par fermeture. Des créations permises exigent I avant leur première version.

| Conteneur/champ | Prédicats et relations à rouvrir si l'opérande change |
| --- | --- |
| Enveloppe.ref.kind/entityId/versionId | C01-REF, C02-OWNER/LINK/COLL/MAP, C03 ; relation owner/couple concernée. |
| Enveloppe.owner et ses composants par kind | C02-OWNER/MAP ; R01–R11 suivant matrice owners R1.1 ; modification sur même identité refusée. |
| Enveloppe.predecessor/provenance[] | C02-LINK/COLL ; bases exactes B3 ; aucun changement de sélection implicite. |
| Enveloppe.payload | Ligne locale C01 du kind ; C04–C15 selon champs du §3. |
| M.portfolioId | C03-PORTFOLIO/C14/C16-META ; nouveau propriétaire/génération, acquisition complète. |
| M.planningSettings | C01-PLAN/C14/C03/C02 ; R11. |
| M.portfolioOrder | C01-ORDER/C13/C14/C03/C02 ; R10/R11. |
| M.projectSettings | C04/C06/C08/C09/C10/C13/C15 ; R01/R02/R03/R07/R10. |
| M.reservationSettings | C04/C06/C08/C09/C10 ; R01/R02/R03/R07. |
| M.teamSettings | C04/C05/C09/C10 ; R01/R03/R04. |
| M.teamCapacities | C05/C01-CAP ; R04. |
| M.programs | C03-PORTFOLIO/C08 ; R07/R08. |
| M.pas | C03-PORTFOLIO/C08 ; R07/R08. |
| M.pts | C09/C10/C11/C12 ; R03/R05/R09. |
| M.rts | C09/C10/C11 ; R03/R05. |
| M.actualPeriods | C06/C07/C11/C12/C15 ; R02/R06/R09 ; C16-DATE seulement lors d'acquisition Snapshot. |
| M.actualSubPeriods | C07/C11 ; R06/R05. |
| M.teamActuals | C11/C10 ; R05 ; obligations de revue/confirmation R1.3. |
| M.ptecs | C12/C10 ; R09 ; obligations ETC R1.3. |
| CurrentSelection.manifest/revision | C03/C16-META ; capacité/génération/révision §3/§6 addendum. |
| PortfolioSnapshot.snapshotId/knowledgeDate/createdAt/manifest | C16-META/DATE/AUTO et tout le catalogue pour son manifeste ; entrée acquise toujours complète. |

## 6. Relations directes et inverses complètes

| ID | Relation directe | Ensemble inverse requis et preuve |
| --- | --- | --- |
| R01 | Settings.ref→owner racine ; identité→owner/versions | Toutes identités du kind pour un owner K/I, et toutes Settings selected de sa classe ; E1/E2. |
| R02 | AP.owner→root ; PT→Project→AP ; PTEC.actualPeriod→AP | AP unique par root, tous PT du Project et tous PTEC utilisateurs de l'AP ; E2/E5. |
| R03 | PT→Project+Team ; RT→Reservation+Team | Toutes associations selected, existing et deleted, pour chaque endpoint ; E5. |
| R04 | Capacity.owner→Team | Capacity unique par Team, et Team exacte ; E2. |
| R05 | TA.owner→association+SP | Toutes TA par association, par SP et par couple ; E4/E5. |
| R06 | AP.subPeriods[]→SP.ref ; SP.owner→AP | Tous AP déclarants d'une SP, toutes SP owned et sélectionnées pour l'AP, refs/ordre exacts ; E3. |
| R07 | Settings.program/pas→catalogue | Tous Settings utilisateurs par kind, existing **et** deleted ; séparer la sous-classe existing des assignments R1.3 sans omettre deleted pour fermeture ; E5. |
| R08 | Catalogue existing→clé canonique de nom | Toute classe existing par kind et toutes identités de même clé ; E6. |
| R09 | PTEC.owner→PT ; PT.root→AP | Toutes PTEC par PT, toutes PTEC des PT existing d'un Project ; E2/E5. |
| R10 | Order→ProjectIds | Ensemble entier Projects selected et positions Order ; E7. |
| R11 | Globals/catalogues.owner→PortfolioId | Tous globals/catalogues selected du Portfolio ; E1/E2. |
| R12 | Snapshot→M→refs/AP | Toutes refs/AP du Snapshot indépendamment du Current ; acquisition complète, E0/E1. |

## 7. Preuves d'exhaustivité attendues

| ID | Condition vérifiable |
| --- | --- |
| E0 — acquisition | Courant initial intégralement certifié depuis unknown ; toute sélection ou base demandée résolue exactement. Unknown flag, cast ou objet registry ne constitue pas une capacité fiable. |
| E1 — sélection | Index initial construit depuis chaque ref de M certifié et confronté à S, mêmes génération/révision ; index1 issu du même delta M0→M1, membres/cardinalités et absences contrôlés. Preuve constructive ou témoin incrémental admis ; pas de scan S complet imposé à chaque édition. |
| E2 — mapping | Comparaison dans les deux sens de la classe complète owners↔identités selected, et cohérence I pour les identités historiques. B vérifié contre clé exacte ; classes inchangées ont témoin U. |
| E3 — partition | Toutes refs SP/AP concernées avant/après, liens exacts et inverse des AP déclarants ; union sélectionnée, cardinalités, bornes et adjacences sans élément omis. |
| E4 — grille | Facteurs complets associations existing du root et SP de l'AP, produits avant/après ; toutes TA réelles et candidates de ces produits, une clé par cellule, aucune autre clé. Égalité du seul nombre de cellules insuffisante. Valeurs seules peuvent hériter de facteurs/clés prouvés inchangés. |
| E5 — inverse | Index dérivé de toutes les relations directes de S, génération/révision correctes ; inventaire complet des liens old/new de la cible, jamais borné aux membres listés par la commande ; mise à jour retire les anciens liens et ajoute les nouveaux. |
| E6 — classe globale | Tous membres existing du catalogue affecté, clés canoniques et transitions existing/deleted prises en compte ; aucun sous-ensemble des noms ne prouve l'unicité globale. |
| E7 — ordre | Liste totale Order et tous ProjectIds selected, inactive/deleted compris ; égalité des ensembles et cardinalités, sans ReservationId ni root inconnu. |
| E8 — cascade | Fermeture par R03/R05/R09 ou R07 jusqu'au point fixe, anciennes refs/keys incluses ; chaque élément supprimé est compté dans delta ou reste selected valide. Comparaison aux classes candidates E1–E7 ; H n'est pas effacé. |

Chaque preuve est attachée à la capacité fiable et au delta exact. Le Domain
vérifie le témoin ; il ne fait pas confiance à un booléen `complete` ou à la
simple présence d'un index. Un nouveau champ/kind/relation/prédicat doit être
classé dans ces tables et les deux chemins avant utilisation ciblée. Tout
défaut de classement, opérande manquant ou preuve absente impose le refus.

## 8. Diagnostics applicables et limites

Codes ci-dessous observés dans les exports livrés à la baseline : ils servent
la traçabilité de l'oracle complet et des erreurs pertinentes. Les codes de
primitives/copie sont propagés comme aujourd'hui ; leur liste complète reste
dans leurs factories R1.1. Aucun code ni ordre de priorité n'est modifié par P0.

| Prédicats | Diagnostics livrés pertinents |
| --- | --- |
| C01/C02 | INVALID_VERSION_ENVELOPE, INVALID_VERSION_CONTEXT, INVALID_VERSION_LIST, PREDECESSOR_IDENTITY_MISMATCH, LINEAGE_CYCLE, INVALID_PROVENANCE, SELF_PROVENANCE, DUPLICATE_PROVENANCE, DIVERGENT_VERSION_COLLISION, IMMUTABLE_OWNER_MISMATCH, OWNER_IDENTITY_CONFLICT. |
| Payloads C01 | INVALID_PAYLOAD_KEYS, INVALID_BOOLEAN, INVALID_NAME, INVALID_LIFECYCLE, INVALID_CANONICAL_COLOR, NON_CANONICAL_CATALOG_NAME, PROGRAM_COLOR_EXCLUSIVITY, MANDATORY_OBJECTIVE_REQUIRED, INVERTED_INTERVAL, INVALID_LIST, INVALID_DEMAND_MODE, INVALID_COVERAGE, EMPTY_BOUND, INVALID_AP_PARTITION, DUPLICATE_SUBPERIOD, UNORDERED_OR_OVERLAPPING_CALENDAR, INVALID_WEEKDAY, DUPLICATE_WEEKDAY, INVALID_PARALLEL_LIMIT, DUPLICATE_PROJECT_ORDER ; erreurs Quantity/OptionalQuantity/CivilDate/ID propagées. |
| C01-REF/C03 | READ_REFERENCE_MISMATCH, MISSING_EXACT_VERSION, INVALID_MANIFEST_KEYS, INVALID_MANIFEST_TABLE, MULTIPLE_IDENTITY_SELECTION, FOREIGN_PORTFOLIO. |
| C05/C06 | TEAM_CAPACITY_REQUIRED, FOREIGN_CAPACITY_OWNER, ACTUAL_PERIOD_REQUIRED, FOREIGN_AP_OWNER. |
| C07/C15 | MISSING_PARTITION_REFERENCE, SUBPERIOD_AP_OWNER_MISMATCH, PARTITION_BOUNDARY_MISMATCH, NON_CONTIGUOUS_PARTITION, EXTRA_SUBPERIOD, AP_BEFORE_EARLIEST. |
| C08 | MISSING_CATALOG_REFERENCE, DELETED_CATALOG_REFERENCE, DUPLICATE_CATALOG_NAME. |
| C09/C10 | MISSING_ASSOCIATION_ENDPOINT, DELETED_ASSOCIATION_ENDPOINT ; absence TA/PTEC vérifiée aussi par C11/C12. |
| C11/C12 | INCOMPLETE_OR_FOREIGN_ACTUAL_GRID, PTEC_SELECTION_MISMATCH, FOREIGN_PTEC_OWNER, PTEC_AP_OWNER_MISMATCH, PTEC_ACTUALS_BOUNDARY_MISMATCH. |
| C13/C16 | INCOMPLETE_PORTFOLIO_ORDER, INVALID_CURRENT_KEYS, INVALID_REVISION, INVALID_SNAPSHOT_KEYS, INVALID_SNAPSHOT_ID, INVALID_CREATED_AT, READ_SNAPSHOT_ID_MISMATCH, SNAPSHOT_BEFORE_ACTUALS. |

Un certificat structurel ne prouve jamais une transition/confirmation,
l'exhaustivité d'un passé absent, la disponibilité de I, ni un commit atomique.
Les réservations, VersionIds alloués globalement dans leur namespace, bases B3,
obligations et effets de publication sont contrôlés en plus par l'addendum.
`not-established` rapporte réellement le contexte R1.1 incomplet ; il n'autorise
jamais une base historique désignée manquante ni une contradiction déjà connue.

## 9. Dossiers de preuve à préparer pour P4–P6 ultérieurs

Cette table spécifie des obligations futures ; aucune transition ciblée n'est
activée par P0. Pour chaque ligne, tous autres prédicats reçoivent un témoin U.

| Commande | Fermeture A et témoins particuliers |
| --- | --- |
| RenameProject | L(ProjectSettings) et C01-REF/C02/C03/C04 ; tous champs sauf name, owner, clés/membres/Order et relations égaux. Aucun parcours Actuals/H requis pour ce témoin ; VersionId neuve prouvée. |
| ReorderProjects | C01-ORDER/C02/C03/C13/C14, E7 entier ; aucune grille touchée. |
| SetPTETC | C01-PTEC/C02/C03/C12, PT/AP exacts et E2 ; valeurs/refs autres inchangées, obligations ETC. |
| DeleteLifecycle | E8 sur root/Team/association et toutes TA/PTEC inverses ; C09/C10/C11/C12 ; AP/SP/Capacity/Order conservés et confirmation globale complète. |
| RestoreRoot | L(Settings), C08/C09/C15, AP/catalogues et rang exacts ; toutes associations restent deleted ; aucune ancienne grille réactivée. |
| RestoreAssociation | E4 grille entière de l'association sur partition courante, endpoints et C12 si PT ; réemploi couple/I, bases exactes B1/B3 pour TA/PTEC, toutes valeurs confirmées. |
| DeleteUsedCatalog | E5 tous utilisateurs existing pour assignments, deleted conservés et résolus ; E6 tous noms du kind ; C08 et couleurs ; publication composite unique. |
| CorrectActuals | Cellules exactes et L(TA), U facteurs/clés de grille ; PT/PTEC impactés pour revue ETC, même through ; chaque correction confirmée, quantités identiques/contexte identique peuvent NoOp. |
| EditActualPartition | E3/E4/E5 avant/après du root entier : tous SP, toutes associations existing de ce root (PT pour Project ou RT pour Reservation), toutes TA des deux produits ; PTEC des PT, through et ETC ; ajustement/split/merge et retraits inclus. |
| CoverActualPeriod / EmptyActualPeriod | Même fermeture partition/grille ; avant ou après vide explicitement prouvé ; PTEC frontière date/null ; confirmations nouvelles cellules/retrait même zéro, aucune cellule fictive si aucun facteur association. |

Les dossiers futurs doivent comparer acceptation, sélection, payloads, refs,
archives ajoutées, obligations et diagnostics avec l'oracle entier, et couvrir
contre-exemples écrits à la main et relations inverses manquantes. Ces tests
seront produits uniquement dans les lots techniques autorisés ultérieurement.
