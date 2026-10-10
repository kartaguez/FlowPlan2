# FlowPlan2 V2 — PLAN R1.1 : Primitives, identités et versionnement natif

Date : 2026-10-10. **R1 — CADRAGE VALIDÉ** par l'utilisateur.
**R1.1 — PLANNED / NOT STARTED — PLAN CORRIGÉ À RÉAUDITER**.
R0 et R0.1 DONE ; R1.2–R1.4 et R2–R6 NOT STARTED.
Cette préparation est exclusivement documentaire. Aucun type, fonction, classe,
test ou dépendance ajouté ; aucune extraction effectuée. Le prochain événement
est exclusivement l'audit différentiel du nouveau SHA par ChatGPT.
GO d'implémentation R1.1 : NON ACCORDÉ. Aucun lancement à l'issue de cette session.

Autorités : [current_plan](../../current_plan.md), [décisions](./rewrite_decisions.md),
[R0](./rewrite_r0_plan.md), [registre de reprise](./rewrite_reuse_registry.md),
[plan R0.1](./rewrite_r01_plan.md), [canon R0.1](./rewrite_r01_canon.md),
[current_canon](../../current_canon.md). Les amendements R1 explicites du dossier
R0 §13 priment uniquement sur les clauses qu'ils désignent. Le patrimoine
n'ajoute aucune norme par renvoi. Tous noms de fichiers, types et fonctions
proposés ci-dessous restent des choix de PLAN soumis à audit, pas des décisions
d'implémentation déjà adoptées. La plage CivilDate §4.2 est désormais une
décision technique explicite R1.1, distincte des propositions d'API.

Correction après audit indépendant du SHA `06d98971bf5e3ddb717e6ee87d7c295631fd6331`
le 2026-10-10 : cadrage, architecture, frontières, amendements et stratégie de
reprise validés ; quatre corrections documentaires demandées, sans GO.
Elles distinguent parsing/canonicalisation, bornent la garantie BigInt aux
limites physiques du runtime, fixent CivilDate et explicitent la validation
contextuelle locale. D-R1-01–06/A-R1-01/02 et les reports R1.3/R3/Windows
restent inchangés. Préflight : SHA audité = HEAD = origin, arbre propre, 0/0
après fetch sur la branche attendue ; aucun code/test/build exécuté ou modifié.

## 1. Objectif et périmètre

Préparer les fondations Domain natives durables : rationnels exacts, quantités
contraintes, dates civiles, IDs opaques, refs exactes typées, enveloppes immuables,
propriétaires, filiation et provenance distinctes. Ces primitives seront utilisables
par les futurs AP, SubPeriods, Settings et calendriers sans modèle jetable.
R1.1 ne construit ni entités métier complètes, ni registre, ni graphe résolu,
ni Current, ni Snapshot, ni transition ou simulation. Le shell technique R0.1
ne devient pas une autorité métier.

Découpage global stabilisé : R1.1 fondations → R1.2 graphe versionné → R1.3
transitions et preuves → R1.4 verticale mémoire. La validation du cadrage global
n'autorise l'implémentation d'aucun sous-lot ; chaque plan exige audit et GO propres.

## 2. Baseline et dépendances

Dépôt `kartaguez/FlowPlan2`, branche `rewrite/portfolio-versioned`.
Baseline inspectée et HEAD initial : `8926b1f1b73650c17114914a168c368d0331d87b`.
`git fetch origin` réussi avant lecture ; branche exacte, arbre propre, HEAD et
origin identiques, divergence 0/0, baseline présente dans l'histoire (HEAD même).
Aucun AGENTS.md applicable trouvé. Aucun changement de branche ni repair Git.

R0 fournit les contrats ; R0.1 fournit source root, compilation/tests isolés,
garde et shell sans stockage. Le code V2 inspecté comporte cinq modules runtime
et trois tests TS ; aucun Domain existant. Les preuves R0.1 sont historiques,
aucune n'atteste les futures primitives. Aucun test applicatif/build/browser
exécuté pendant cette préparation. SHA final documentaire communiqué après push.

Avant tout futur lancement : fetch, branche, status, HEAD/origin et baseline,
audit du SHA documentaire exact et GO utilisateur limité à R1.1. Écart non expliqué,
arbre sale, mauvais checkout ou contradiction normative : STOP sans modification.
R1.1 n'a besoin d'aucun dépôt applicatif ouvert, sauvegarde réelle ou stockage V1.
La sauvegarde/restauration R0 §6 reste requise avant bascule opérationnelle réelle.

## 3. Contrats normatifs applicables et traçabilité

| Contrat | Fondation R1.1 | Validation ou réalisation reportée |
| --- | --- | --- |
| R0 §3.3 exactitude | Rationnels canoniques, absence distincte de zéro, dates civiles | Reconstruction/allocation R1.4 puis R3 |
| T01, T12-R, R0 §3.1, D-R1-01/02 | Identités natives, version immuable, owner typé, ref exacte, filiation ramifiée, provenance distincte | Registre/fermeture R1.2 ; conservation physique R2 |
| R0 §3.1 contraintes | Capacité/dailyCap/consommation/ETC ≥ 0 ; ratio et indisponibilité dans [0,1] | Payloads et cohérence des entités R1.2 ; completed ⇒ zéro hors primitive |
| T04, I19, D-R1-03 | Aucun latest/horloge/ordre pour sélectionner une version | Manifestes, resolver pur, validation structurelle R1.2 |
| T03/T05/T10/T11/T15, I02/I03/I07/I16, D-R1-04/05 | Refs/owner/provenance permettant ces contrats | Grille R1.2 ; protections, preuves et rebinding atomique R1.3 ; commandes complètes R4 |
| T09/I23 amendés A-R1-01 ; T13 précisé/amendé A-R1-02 | CivilDate déclarative utilisable sans horloge | AP/Snapshot et bornes R1.2 ; monotonie sur filiation R1.3 |
| D-R1-06, oracle R0 §8 | Arithmetic exact 1/3 + 2/3 = 1 | Véritable Actuals + ETC = EAC et Snapshot autonome R1.4 uniquement |
| I-R01-A/B | Aucun import src depuis src-v2, aucun runtime/storage legacy | Compilation/build/tests V2 futurs isolés |

Les nouveaux amendements ne sont pas des corrections éditoriales : voir R0 §13
et registre. R1.1 expose la date et la ref, sans tester comme acquises les règles
AP/Snapshot. Les états existing/deleted et confirmed/suspended ont des sens
distincts ; aucun enum métier complet n'est nécessaire à R1.1.

## 4. Architecture cible des primitives

Proposition : modules sous `src-v2/domain/primitives/` pour résultat/erreurs,
rational, quantity, civilDate/civilInterval, identity/exactReference ; enveloppe
sous `src-v2/domain/versioning/`. Tests V2 adjacents. Aucun barrel legacy,
Application, moteur, UI, navigateur, Node runtime, horloge, randomness ou stockage
dans Domain. Pas de nouvelle dépendance prévue.

### 4.1 Rationnels et quantités

Représentation proposée : deux BigInt readonly, dénominateur strictement positif,
PGCD des magnitudes égal à 1, zéro unique 0/1, signe au numérateur. Création et
normalisation refusent dénominateur nul ; dénominateur négatif fourni comme paire
est normalisé. Opérations +, −, ×, ÷ et comparaison exactes ; division par zéro
refusée. Pas de Number, parseFloat, arrondi, tolérance epsilon ou conversion
flottante pour une quantité métier, même transitoirement. Arithmétique rationnelle
exacte en BigInt dans les limites physiques du runtime : aucune limite métier
numérique arbitraire, saturation, overflow silencieux par conversion numérique
limitée, troncature ou approximation. Une exhaustion réelle des ressources du
runtime n'est pas nécessairement interceptable ; R1.1 ne garantit pas sa
traduction en erreur Domain contrôlée et ne fixe aucune taille maximale arbitraire.

Parsing exact et représentation interne canonique sont deux contrats distincts.
Grammaire Domain retenue : entier/décimal avec signe moins facultatif et chiffres
ASCII, zéros initiaux admis ; point décimal avec au moins un chiffre de chaque
côté. Fraction : entier signé / entier strictement positif, sans espaces, zéros
initiaux admis aussi au dénominateur. `01` représente 1/1,
`001.250` représente 5/4, `2/4` représente 1/2, `-0` et `0.00` représentent 0/1.
La canonicalité du texte n'est pas une condition de parsing. Les paires BigInt
acceptent les deux signes ; la grammaire textuelle conserve le dénominateur
positif. Chaîne vide, syntaxe ambiguë/mal formée, NaN/Infinity et dénominateur
nul sont refusés.
Exposant, signe plus et espaces restent hors de cette grammaire délibérément
bornée aux trois notations entier/décimal/fraction ; aucune approximation ou
conversion limitée n'est utilisée pour les interpréter. Virgule et trim éventuels
appartiennent à une future frontière de saisie explicite R5, sans autorité Domain.
Le texte canonique `n/d` sert comparaison/diagnostic ; il ne fixe aucun codec R2.

Quantité absente : représentation optionnelle explicite, jamais convertie en zéro
ou obtenue d'une chaîne vide invalide. Rational signé générique distinct des
quantités non négatives. Wrappers proposés : capacité, dailyCap, consommation,
ETC, demande fixed-daily ≥ 0 ; ratio Reservation/indisponibilité dans [0,1].
Pas de conversion implicite entre unités/familles. RemainingWorkload legacy n'est
pas le nom ni l'autorité de l'ETC natif. Statut PTEC et complétion restent métier.

### 4.2 CivilDate et intervalles

Décision technique R1.1 fixée après audit : calendrier grégorien proleptique,
forme ISO stricte YYYY-MM-DD, plage 0000-01-01 à 9999-12-31, bornes incluses.
Cette contrainte technique de la primitive V2 n'a pas de signification métier
particulière ; elle n'était pas une règle fixée par R0. L'année 0000 est admise
(et bissextile) dans le modèle proleptique retenu. Aucune date hors plage n'est
clampée silencieusement : elle est refusée. Une extension future de la plage
exige une évolution contractuelle explicite. Aucune horloge, timezone, DST ou
Date JavaScript ne participe à la sémantique de CivilDate.
Comparaison civile, ajout/retrait d'un nombre entier sûr de jours, différence
signée en jours et weekday ISO. Calcul intermédiaire entier sûr vérifié avant
conversion retour ; ne pas recopier l'addition legacy d'un offset extrême sans
ce contrôle. Années bissextiles : divisible par 4 sauf siècles non divisibles
par 400. Pas d'ajout mois/année avec clamp tacite ; cette API n'est pas nécessaire
aux fondations et nécessiterait un contrat audité séparé si un besoin apparaît.

Intervalle inclusif valide : start ≤ end ; égalité = un jour ; membership et
dénombrement inclusifs. Création inversée refusée (contrairement à l'énumération
legacy qui retourne []). Énumération éventuelle uniquement d'intervalle validé ;
aucune grande liste cachée nécessaire à la validation. Pas de faux intervalle
pour AP vide. CivilDate sert aussi knowledgeDate déclarative ; aucun défaut today.

### 4.3 Identités et refs exactes

Proposition : IDs nominalement typés, chaînes opaques non vides, égalité exacte
sans trim, casse modifiée, parsing sémantique, compteur ou ordre métier. Rejeter
vide/whitespace seul ; ne pas déduire propriétaire/date/version depuis les octets.
Generation injectée ultérieurement hors Domain ; aucune UUID/version séquentielle
imposée. Même chaîne dans des kinds différents ne crée pas une même identité.
VersionId opaque distinct de EntityId ; une sélection exige les trois composantes
(kind, entityId, versionId), jamais entityId seul ou versionId seul.

Vocabulary fermé proposé des familles versionnées R0 : ProjectSettings,
ReservationSettings, TeamSettings, TeamCapacity, Program, Pas, PT, RT, ActualPeriod,
ActualSubPeriod, TeamActual, PTEC, PlanningSettings, PortfolioOrder. Les lexèmes
techniques exacts restent à auditer. ProjectId/TeamId/ReservationId désignent des
identités de propriétaire, pas des versions Settings ; leur lien 1:1 avec Settings
sera défini en R1.2. SnapshotId et revision CAS ne sont pas VersionId métier.
Ref générique paramétrée par kind, vérifiée aussi au runtime : kind inconnu,
ID ou VersionId invalide, famille non attendue sont refusés. Aucune substitution
entre Project/Reservation, PT/RT, AP d'un autre owner ou families Settings/capacité.

### 4.4 Enveloppe, owner, filiation, provenance

Proposition d'enveloppe : ref propre, owner typé par identité stable (sans version
sélectionnée), payload séparé, predecessor exact optionnel et provenance explicite
liste de refs sources. Matrice des owners prévue depuis R0 §3.1 : Settings par
Project/Reservation/Team ; capacité par Team ; AP par Project OU Reservation ;
SubPeriod par AP ; PT par couple Project/Team ; RT par Reservation/Team ; TA par
association PT OU RT + SubPeriod ; PTEC par PT ; Settings/Order globaux et
catalogues à portée Portfolio. Encodage de cette portée reste proposé ; R1.2
fixera identité et unicité des couples, sans owner mouvant.

Owner identique entre versions de même identité ; jamais réparé depuis Current.
Au plus un predecessor, même kind/entityId, version différente, même owner.
Deux enfants peuvent citer le même predecessor ; aucune recherche de terminal
ni fusion concurrente automatique. Racine sans predecessor valide. Provenance
métier distincte, éventuellement multiple et d'identités différentes selon une
politique métier explicite ultérieure (merge SubPeriods en R1.3). Elle ne sélectionne
rien et ne remplace pas la filiation ; pas de merge générique dans la primitive.

Immutabilité runtime et types : copier les entrées puis geler récursivement
le payload et les collections admises, ref/owner/predecessor/provenance inclus.
Proposition : payloads faits de primitives validées, records et listes ; rejeter
Map/Set/Date, fonctions, objets mutables exotiques et payload cyclique. Pas de
freeze superficiel ni alias externe restant modifiable. Chaque version archivée
reste intacte ; aucune API update/delete physique. Cette préparation ne fixe
pas le format de sérialisation ni des hashes.

La validation contextuelle R1.1 répond uniquement : « Les versions explicitement
fournies sont-elles localement cohérentes entre elles ? » Un contrôle pur sur
ces enveloppes vérifie, lorsque les éléments nécessaires sont fournis,
identité du predecessor, compatibilité owner, cohérence locale filiation/provenance,
cycles de filiation (self et longs) dans ce contexte et collisions de refs.
Collision divergente si owner, payload, predecessor
ou provenance diffère : rejet ; même ref et même contenu validé peut être reconnu
idempotent sans créer/sélectionner une nouvelle version. Égalité structurée sur
valeurs validées et BigInt, aucun JSON.stringify/hachage physique comme autorité.
Si un predecessor nécessaire manque, le résultat exprime « vérification
contextuelle non établie avec les éléments fournis », jamais une racine ni une
cohérence démontrée. Pas d'exigence de parents chronologiquement créés.

Le contrôle ne cherche, ne charge et ne résout aucune ref absente. Il reçoit
uniquement un contexte fini fourni par l'appelant : aucun registre, Current,
latest, parcours de manifeste, stockage, sélection par date ou reconstruction
de fermeture. Résolution des références, fermeture du graphe, registre passif,
manifestes et GraphResolver restent exclusivement R1.2. Les cycles de
dépendances/provenance métier et fermeture
complète exigent les politiques R1.2/R1.3 ; aucune prétention de les valider ici.
La primitive refuse l'auto-source ; les suites de contexte R1.1 ne certifient
que filiation et collisions, pas un graphe métier complet.

## 5. Inventaire factuel et écarts

Sources lues au SHA §2 : rational/date/scalars/horizon/result et suites voisines,
editableQuantity, entities et Actuals snapshots ; shell V2, package et garde.
Rational importe seulement result ; date importe seulement result ; horizon
importe date/result ; scalars importe rational/result mais mêle IDs, quantités,
WeakMap et sérialisation. Aucun import direct ni copie pendant cette session.

Écarts explicitement signalés : R0 disait AP vide « sans dates » et I23 « sans
borne » ; A-R1-01/02 les amendent pour connaissance déclarée. R0 présentait
active/suspendu comme encodage proposé : D-R1-04 stabilise confirmed/suspended
sans changer le lifecycle. Les vieux statuts « R1 prochain lot » dans les dossiers
clôturés sont historiques : la reprise courante et R0 §13 indiquent le cadrage
validé, aucun début d'implémentation. R0 n'est pas réécrit silencieusement.

`rational.ts` ne propose pas un parseur unifié de saisie ; `editableQuantity`
importe le barrel legacy et accepte virgule/trim côté Application. `date.ts`
accepte année 0000 et intervalle inversé → [] ; garde offset extrême à renforcer.
`scalars.ts` contient une capacityRatio seulement non négative : ne pas assimiler
aveuglément ce type aux ratios métier bornés de R0. `snapshots.ts` construit IDs
depuis kind/objectId/version numérique et valide histoire consécutive : incompatible
avec refs opaques/filiation ramifiée V2. Le code legacy ne prévaut pas sur R0.

## 6. Tableau REUSE / ADAPT / REFERENCE

Toutes lignes : intentions **PLANNED / NOT STARTED**, stratégie validée par
l’audit du PLAN initial ; aucun audit d’extraction ni test exécuté.
Détails source/commit/symboles/transitifs/destination au
[registre R1.1](./rewrite_reuse_registry.md#intentions-r11--aucune-extraction).

| Candidat | Classe retenue pour le périmètre | Autonomie et preuve future |
| --- | --- | --- |
| rational : PGCD, normalisation, opérations, comparaison | REUSE logique pure | result natif ; canonicalisation et oracles indépendants Q01–Q04 |
| rational : parseurs entier/décimal/fraction | ADAPT assemblage API | grammaire explicite, aucun format backup hérité ; Q01/Q05 |
| date : comparaison, conversion civile, weekday, différence | REUSE logique pure | result natif et bornes contrôlées ; D01–D04 |
| date addDays et horizon | ADAPT bornes/intervalle générique | sûreté intermédiaires, refus intervalle inversé ; D02/D03 |
| scalars quantités et result | ADAPT | wrappers exacts autonomes, aucune sérialisation R2/WeakMap imposée ; Q04/Q05 |
| scalars IDs, entities, snapshots | REFERENCE | nouvelles identités/enveloppes ; pas modèle Portfolio/histoire numérique ; V01–V06 |
| editableQuantity parsing | REFERENCE pour lexique | supprimer barrel/présentation ; grammar Domain §4.1 ; Q01/Q05 |
| shell/outillage V2 | REUSE socle livré, sans extraction | tester frontières réelles ; A01–A03 |

La matrice R0 groupait les primitives REUSE ; les sous-périmètres ADAPT précisent
les adaptations d'API et contrôles, sans abandonner l'algorithme exact autonome.
Couleurs, UI, capacités, moteur, formats backup et proof G1 ne sont pas extraits
par R1.1 ; référence de futurs lots seulement.

## 7. Interfaces et invariants à exposer

Noms indicatifs, aucune signature implémentée : résultat discriminé/errors avec
code/path ; factories validantes Rational/Quantity/CivilDate/Interval/ID/Ref ;
opérations exactes et prédicats ; création d'enveloppe immutable ; validation
locale puis contextuelle de filiation/collision. Les entrées runtime inconnues
sont validées, les brands TypeScript ne suffisent pas et aucun cast public ne
constitue une preuve. Une erreur garde la cause, jamais valeur zéro par défaut.

Chaque factory expose ses préconditions et postconditions (§4). Les API ne
publient, ne sélectionnent, ne chargent, ne suppriment et ne génèrent aucune
version. Elles n'infèrent aucune transition, connaissance, état completed ou
confirmation. Le contexte fourni n'est pas un registre métier caché.

## 8. Séquence d'implémentation future, uniquement après GO

| Étape future | Travail borné | Preuve de passage |
| --- | --- | --- |
| P0 | Audit différentiel du SHA PLAN, GO R1.1 distinct, préflight Git, vérifier contrats §4 ; plage CivilDate fixée, aucun choix laissé à l’implémenteur | Aucun écart non expliqué, scope autorisé |
| P1 | Résultat/erreurs natifs, Rational et parsing | Q01–Q03/Q05 ; aucune ancienne importation |
| P2 | Quantités contraintes et optionnalité | Q04 ; absence ≠ zéro, unités non substituables |
| P3 | CivilDate/intervalle/arithmetic | D01–D04 ; respect de la plage CivilDate fixée §4.2 |
| P4 | IDs/kinds/refs exactes et owners | V01/V02 ; tests de type et runtime |
| P5 | Enveloppe immutable, predecessor/provenance, contrôles contextuels purs | V03–V06 ; aucun registre/manifest/service |
| P6 | Vérifier isolation/build/tests et rollback ; documenter livraison et provenance | A01–A03, matrice contrat→code→test, audit indépendant |

Le garde R0.1 interdit notamment l'accès calculé aux propriétés runtime ; les
algorithmes legacy utilisent tableaux/indexation. Privilégier une expression
compatible. Si adaptation du garde indispensable, la proposer précisément et
faire auditer/autoriser ce delta technique avant de modifier scripts/configs,
sans affaiblir interdictions legacy/storage. Ce PLAN ne donne aucun GO à ce delta.
Aucune correction du build, extension UI ou moteur pour faire passer les gates.

## 9. Tests futurs positifs et négatifs obligatoires

Aucune ligne suivante n'est exécutée ni PASS. Fixtures natives sans import legacy,
oracles mathématiques/civils indépendants et tests runtime d'entrées inconnues.

| Gate | Cas positifs | Cas négatifs / preuves |
| --- | --- | --- |
| Q01 parsing exact / canonicalisation | 42, -7, 0.1=1/10, 01=1/1, 001.250=5/4, 1/3, 2/4 et 02/04=1/2, -0 et 0.00=0/1 ; textes acceptés non canoniques équivalents, grands entiers et longue décimale | vide, espaces, plus, exposant non supporté, NaN/Infinity, .5, 1., virgule Domain, syntaxe ambiguë/mal formée, dénominateur nul ; aucun fallback zéro ni perte de précision |
| Q02 canonicalisation/signes | 2/-4=-1/2 en paire, -2/-4=1/2, tous zéros=0/1 ; normalisation idempotente | dénominateur nul ; rationnel forgé/non canonique refusé aux frontières |
| Q03 arithmetic sans float | 1/3+2/3=1, 0.1+0.2=3/10, ×/÷ avec annulation, comparaison grands produits, inverses et conservation | ÷0 ; revue absence Number/float dans chaîne des quantités ; résultat immuable |
| Q04 absence/unités | absent distinct de 0 ; borne ratio 0 et 1 ; capacité/ETC/TA/dailyCap nuls valides | négatifs et ratio >1 ; familles substituées compile/runtime ; open zéro n'est pas inféré completed (aucun statut dans primitive) |
| Q05 erreurs | résultat/code/path stables, entrée invalide identifiée | mauvais type runtime ; aucune saturation, troncature, approximation ou fallback ; aucune garantie d’interception d’exhaustion runtime |
| D01 validation | 2000-02-29, 2024-02-29, 0000-02-29 ; bornes 0000-01-01 et 9999-12-31 admises | 1900/2100-02-29, 2023-02-29, mois/jours invalides, format court, timestamp/TZ, -0001-12-31 et 10000-01-01 hors plage sans clamp |
| D02 inclusivité | intervalle même jour cardinal 1, deux bornes comprises, adjacent et passage année/mois | intervalle inversé refusé ; AP vide jamais encodé par date fictive |
| D03 arithmetic | ±jour, différence/weekday ISO, frontière bissextile, aller-retour dans plage | offset fractionnaire/unsafe, calcul intermédiaire non sûr, sortie 0000–9999 refusés |
| D04 TZ/DST | mêmes vecteurs en processus TZ UTC, Europe/Paris et America/New_York, passages DST mars/octobre/novembre | revue aucun Date/horloge ; preuves séparées processus, pas timezone simulée par commentaire |
| V01 identités/refs | même entityId dans plusieurs versions, même texte différents kinds distinct, ref exacte stable | ID/VersionId intervertis, unknown kind, vide, ref incomplète, aucune sélection automatique après ajout de branche/ordre inversé/timestamp |
| V02 owners | owner stable et typé conforme famille, refs attendues | Project ↔ Reservation, PT ↔ RT, famille différente, changement d'owner entre versions, ref AP autre owner ; pas fallback |
| V03 immutabilité | ref/payload/nested lists/owner/provenance gelés et détachés de l'entrée | mutation entrée et sortie ne change pas archive ; Map/Set/Date/payload cyclique refusés |
| V04 filiation | racine, chaîne, deux enfants du même parent, ordre fourni non chronologique | self-cycle, cycle long, parent autre identité/kind/owner, plusieurs predecessors ; parent manquant ⇒ vérification non établie, sans recherche/chargement/résolution ; aucune fusion auto |
| V05 collision | même ref/contenu reconnu identique, versions différentes coexistantes | même ref et payload/owner/predecessor/provenance divergents refusés, archives intactes ; aucune overwrite |
| V06 provenance | plusieurs sources exactes distinctes du predecessor, nouveau ID pour sources métier | provenance utilisée comme sélection/filiation refusée ; auto-source ; pas de merge générique ; aucune certification split/merge métier |
| A01 autonomie | graphe sources/types/transitifs/realpath exclusivement V2 | tout import src, barrel, fixture legacy, runtime/stockage V1, autorité parallèle refusés |
| A02 Domain pur durable | API primitives seules, aucun modèle provisoire, aucun couplage Engine/UI/storage | appel Current/latest/clock, consultation registre/stockage, parcours manifeste, résolution ref absente ou reconstruction fermeture, création registre/manifest/transition hors scope → NO-GO |
| A03 outils isolés | check:boundaries:v2, typecheck:v2, test:v2, build:v2 futurs PASS, sans skip ; sources/artefacts/découverte vérifiés | garde affaibli ou ancien src compilé → NO-GO ; aucune ancienne suite comme preuve V2 |

Ces tests ne valident pas graphe complet, grille TA, transitions, ever-nonzero,
CAS, receipts, transactions, Planning Engine ou simulation Snapshot. L'oracle Q03
est arithmetic seulement ; la preuve métier end-to-end appartient à R1.4.

## 10. Critères GO / NO-GO

GO d'implémentation uniquement après audit indépendant favorable du PLAN au SHA
exact puis autorisation utilisateur explicite. Respecter la plage CivilDate
fixée §4.2 ; les propositions restantes de lexique, owners et payloads relèvent
de l'audit du PLAN, pas d'une modification discrétionnaire à P0.
Toutes gates du périmètre doivent être vérifiables sans anticiper R1.2.
NO-GO : contradiction normative non résolue, APIs insuffisamment précisées,
prérequis Git incorrects, besoin de registre/moteur/storage ou adaptation non
approuvée du garde. Aucun test vert ne remplace l'autorisation.

Acceptation future : Q01–Q05, D01–D04, V01–V06, A01–A03 exécutés et conformes,
aucun skip/non-exécuté PASS, diff borné, provenance effective et rollback prouvé
ou limite explicitement soumise à audit. Audit de livraison et clôture utilisateur
distinctes avant DONE ; aucun GO R1.2 implicite.

## 11. Risques et réduction

| Risque | Mesure |
| --- | --- |
| BigInt volumineux, grandes plages | Exactitude BigInt dans les limites physiques du runtime, aucune taille métier arbitraire ni promesse d’interception d’exhaustion ; pas énumération pour valider ; budgets moteur reportés |
| Faux brands et freeze superficiel | Validation runtime, copies profondes, tests d'alias et familles |
| R0 « sans dates » masque amendement | Addendum normatif A-R1-01/02 et index des décisions, avant modèle AP |
| Histoire legacy consécutive copiée | REFERENCE seulement ; branches et opacité testées |
| Collision basée sur JSON/hash | Égalité structurée des valeurs validées ; codec/hash physique R2 |
| Primitive devenue registre/resolver | Contexte pur fourni, aucune conservation interne/sélection ; revue de scope |
| Garde shell incompatible avec algorithmes | Inspection et solution compatible, sinon delta séparé audité avant changement |
| Année 0000 et lexique perçus comme règles R0 | Plage technique fixée en R1.1 §4.2, aucune portée métier ni ancienne règle R0 ; lexique restant soumis à audit |

Question métier préexistante Reservation ratio + exception sans période : reste
ouverte pour R3, aucun arbitrage ni extraction de requestedReservationCapacity.
Point de contrat reporté explicitement à R1.3 (R0 §13) : transition d'un AP
avec connaissance connue vers un AP vide sans date, sans contournement de la
monotonie. Ce PLAN ne tranche aucune transition ; ce point ne bloque pas les
primitives R1.1, mais doit être fixé avant GO des transitions concernées.
Qualification Windows reste différée I-R01-C ; aucune preuve nouvelle.

## 12. Rollback

Livraison documentaire présente : revert normal du seul commit de préparation,
après coordination si partagé, sans reset/force-push ; aucun storage à restaurer.
Cela retire explicitement les décisions/addendum introduits, pas des corrections
éditoriales ; conserver leur trace Git et remettre trackers cohérents.

Futur R1.1 : commits bornés dormants, aucun montage UI ni données persistées.
Dans copie jetable, reverts en ordre inverse des seuls commits R1.1 autorisés,
retour au shell R0.1, comparaison des chemins hors périmètre et frontières/build/
tests V2. Conserver les preuves ; ne supprimer aucun dépôt/profil ni changer la
branche historique. Aucun rollback exécuté pendant ce PLAN. Si effets storage
ou R1.2 introduits, cette procédure n'est plus suffisante : STOP et nouveau plan.

## 13. Frontières et exclusions explicites

| Lot | Responsabilité exclusive ultérieure |
| --- | --- |
| R1.2 | Entités/payloads complets, registres passifs, graphes, manifestes, resolver pur sans Current fallback, fermeture/grille/PTEC et bornes Snapshot |
| R1.3 | Transitions, confirmations individuelles, ever-nonzero toutes archives, restoration et rebinding, préconditions historiques/monotonie AP |
| R1.4 | Entrée moteur native, admission contributions démontrées, simulation mémoire réelle bornée, Snapshot indépendant de Current |
| R2 | Sérialisation physique, codecs, stockage, CAS, transactions, receipts, import/export/recovery |
| R3 | Planning Engine complet et arbitrage ratio/exception |
| R4 | Commandes complètes et orchestration métier |
| R5/R6 | UI/consultation et History/comparaisons complètes |

Interdictions de cette session : toucher src/, src-v2/, public-v2/, scripts/,
tests, dépendances/configs ; copier du code, implémenter, créer branche, ouvrir
ou modifier stockage, commencer R1.2–R1.4/R2, déclarer R1.1 DONE. Aucun modèle
legacy façade, latest, sélection par date, fusion concurrente ou approximation.

## 14. Clôture documentaire et preuves futures

Préparation : contrôle diff documentaire, git diff --check, liens/statuts/amendements,
commit/push normal et vérification SHA distant/arbre propre/origin 0/0. Ne fournir
que les preuves réellement obtenues. Cette clôture documentaire maintient
R1.1 PLANNED / NOT STARTED — PLAN CORRIGÉ À RÉAUDITER.

Contrôles de la préparation initiale effectivement obtenus avant son commit :
six Markdown exclusivement, 192 liens locaux dont 42 ancres vérifiés ; 14 sections et 18 gates
futures présentes ; archives des trackers et corps historique R0 inchangés.
`git diff --check` sans erreur. Aucun test/build/runtime applicatif exécuté.
Ces contrôles ne sont pas des preuves d'implémentation ni un audit indépendant.

Livraison future : SHA entrée/implémentation, source/SHA/symboles/destination/imports
pour chaque reprise, matrice contrat→code→test, commandes/environnement/résultats
bruts, preuve zéro perte/float, TZ/DST, immutabilité/cycles/collisions, compilation
isolée, rollback, limites, audit et décision utilisateur. Canon R1.1 à créer
seulement pour la livraison autorisée, aucune preuve fictive aujourd'hui.

Reprise à froid : lire current_plan puis décisions/R0 §13 et ce PLAN ; identifier
le SHA à auditer, les propositions et gates, attendre exclusivement l’audit
différentiel ChatGPT du nouveau SHA puis décision explicite. R1 — CADRAGE VALIDÉ ; R1.1 — PLANNED / NOT STARTED — PLAN CORRIGÉ À RÉAUDITER ;
R1.2–R1.4 et R2–R6 — NOT STARTED. Aucune implémentation ne commence après ce PLAN.
