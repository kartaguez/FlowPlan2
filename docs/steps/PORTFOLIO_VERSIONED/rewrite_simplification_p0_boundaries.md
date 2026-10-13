# P0 — Responsabilités et capacités hexagonales

Date : **2026-10-13**. Baseline :
`c1ae876ef85276ff3c13d236b7617c3410140d10`.
Ce document fait partie de l'[addendum P0](./rewrite_simplification_p0_addendum.md).
Il applique les frontières des [décisions R1.2](./rewrite_decisions.md), du
[plan R1.2](./rewrite_r12_plan.md) §3 et du
[plan général](./rewrite_r11_r13_simplification_plan.md) §3/§5–6/§11.
Les noms de capacités désignent des responsabilités contractuelles ; les
signatures TypeScript, fichiers de production et migrations d'API seront
définis dans les lots techniques après leur propre GO.

## 1. Matrice des responsabilités

| Responsabilité | Domain | Application | Port | Adapter |
| --- | --- | --- | --- | --- |
| Primitives, schémas et invariants métier | Possède les règles pures R1.1/R1.2, payloads et catalogue unique ; rejette valeurs invalides | Demande validation, ne recopie aucune règle | Transporte données/résultats typés ; aucune règle métier de remplacement | Fournit les données, sans réparer les valeurs ni certifier le métier |
| Acquisition du Current inconnu | Résout les refs exactes et certifie le courant entier | Collecte depuis lecteurs abstraits, contrôle requête/réponse, associe résultat à génération/révision privées | Lecture du manifeste et versions exactes, erreurs explicites | Capture/livre données détachées ; install propriétaire après succès complet |
| Acquisition Snapshot | Certifie tout son graphe et la borne knowledgeDate | Utilise lecteurs Snapshot/versions, sans accès au Current | Capacités Snapshot et versions séparables | Résout toutes refs archivées exactes, même après retrait Current |
| Courant fiable et index dérivés | Vérifie cohérence des dépendances et témoins de fermeture | Détient la capacité de session et coordonne la génération ; n'admet aucun cast ou flag | Lecture d'une vue immutable cohérente du propriétaire | Détient physiquement la cellule/structures, ne transforme pas un index en preuve métier |
| Analyse des commandes | Préconditions, conséquences, delta typé, liens old/new et obligations R1.3, calcul pur | Acquiert la commande inconnue, orchestre lectures exactes nécessaires | Lecture des bases demandées explicitement | Résolution exacte ; aucun choix de base par latest/date/ordre |
| Fermeture des dépendances | Catalogue champs/prédicats/relations, vérification U ou A par invariant | Exige dossier complet, refuse preuve manquante avant allocation/publication | Expose lecture de classes/index attestés, sans décider leur suffisance métier | Maintient index issus du courant certifié et du même delta, avec témoins de complétude |
| Confirmations et revue ETC | Calcule obligations et valide réponses/valeurs | Lie handle, session, préparation, génération/révision et delta ; applique stale prioritaire et état du dossier | Aucun stockage de preuve de confirmation dans archives | Aucun jugement sur acceptation utilisateur ; UI ne peut marquer une version « confirmée » |
| Autorité d'unicité | Définit clés owner/couple et cohérence identité/base ; contrôle les données/témoins fournis | Demande absence/réemploi/réservations dans la portée exacte ; refuse disponibilité insuffisante | Une capacité d'autorité par namespace/portée, distincte du lecteur d'archives | Détient ledger/index exhaustif d'identités/couples/VersionIds, réserve monotoniquement et conserve pending/burned |
| Répertoire historique | Valide enveloppe/base utilisée et liens pertinents | Demande refs exactes, distingue cache miss, indisponibilité et absence attestée | Répertoire exact, sans autorité d'absence de couple/identité | Conserve toutes archives immuables ; cache et stockage éventuel restent moyens techniques |
| Append des versions | L(B), collisions, owner/filiation/provenance/mappings pertinents ; registre passif pur | Coordonne réservations, append candidat et sélection candidate | Capacités exactes et authority, aucune commande de sélection implicite | Prépare extension séparée ; H0 conservé et B visible dans publié seulement au commit |
| Construction de la vue candidate | Établit validité complète ou succession prouvée ; aucun effet | Assemble selection/graph/archive/index concordants après toutes obligations | L'assemblage injectable n'a pas autorité de certification/commit | Ne publie pas progressivement les membres du tuple |
| Génération, révision, stale et exclusivité | Aucun compteur/horloge métier ni CAS de stockage | Capture token de base, recontrôle stale et invalide dossiers ; garde intégral dès avant allocation | Contrat de cellule propriétaire et commit conditionnel | Génération privée/revision non réemployées dans leur portée, refus de réentrance/second écrivain |
| Point de commit | Aucun I/O ni mutation | Soumet candidat déjà validé et renvoie résultat conforme au commit | Opération propriétaire sans callback arbitraire de publication | Unique assignation interne de référence au tuple après comparaison génération/révision ; jamais moitié de vue |
| Notifications et affichage | Aucune dépendance UI | Délivre Applied avant éventuelles notifications séparées | Aucun callback de notification dans commit | Notification après retour n'altère pas résultat ni courant |
| Composition et qualification | Catalogue/règles indépendants des implémentations concrètes | N'utilise que capacités qualifiées pour leur contrat | Interfaces indépendantes d'IDB/browser/UI/legacy | Composition raccorde cellules/lecteurs/authority conformes, sans attribuer de certificat métier |

## 2. Sources de vérité et limites des capacités

La cellule propriétaire est la seule source de vérité du courant publié et de
son token génération/révision. Une lecture retourne une vue unique immutable,
jamais des propriétés lues séparément. Les anciennes vues demeurent immuables
mais ne peuvent autoriser un commit sur une génération périmée.

Le catalogue Domain est la seule source des règles et relations. Validations
complète et ciblée utilisent ces mêmes prédicats ; Application, ports, adapters
et UI n'en maintiennent aucune copie concurrente. Un index représente une
relation dérivée de la sélection ; le Domain contrôle sa preuve d'exhaustivité.

L'autorité d'unicité est unique dans chaque namespace et portée annoncés.
Le ledger technique contient les réservations pending/burned distinctes du
métier publié. Un index dérivé du seul H publié ne permet pas de reconstruire
ces réservations. Leur transfert doit être explicite et complet dans la portée
RAM ; une nouvelle génération ne remet pas les IDs/couples au pool.

Le répertoire exact reste responsable de la disponibilité des enveloppes
historiques. L'autorité détient les mappings d'identités/owners/couples et les
IDs émis ; elle ne fournit pas un payload historique de substitution. Les deux
capacités peuvent être servies par un même adapter, avec contrats et erreurs
distincts. Un identifiant retrouvé dans authority ne signifie pas qu'une base
est résolue ; une enveloppe retrouvée dans le cache ne prouve pas que le mapping
historique de son couple est exhaustif.

## 3. Cohérence entre capacités sans double écriture

Les capacités portent le même Portfolio et leur portée/version d'admission.
Les index selected sont liés au token de la cellule. Une réservation peut
avancer sans modifier le courant ; elle n'autorise pas l'append progressif B
dans les archives publiées. La vue candidate prépare l'extension historique et
ses index avant le commit ; leur visibilité publiée change au même swap que
selection et graph. Les sorties déjà réservées restent indisponibles en cas
d'échec, même si B n'est jamais publié.

La composition doit rejeter les raccordements qui créent deux cellules
écrivaines pour le même courant, deux authorities concurrentes sur le même
namespace, des index d'une autre génération ou un adapter de commit arbitraire
capable de muter puis de lever. Un port de publication qualifié fait de son
assignation interne le point de linéarisation. L'exclusivité de l'Application
ne répare pas un port qui a déjà modifié son courant.

Les wrappers Domain CurrentSelection/Snapshot restent ceux de R1.2. Génération,
capacité fiable, ledger et index sont des structures techniques privées ; ils
ne créent pas une seconde histoire métier, ni un certificat de confirmation
persisté. L'UI présente conséquences et réponses ; elle ne choisit pas une
sélection non certifiée, ne reconstitue pas une grille et ne réserve aucun ID
par une autorité indépendante.

## 4. Critères de vérification documentaire

Les responsabilités du catalogue, de l'orchestration, des lecteurs, des
réservations et du swap ont chacune un propriétaire. Aucune dépendance Domain
vers Application/ports/adapters/UI/moteur/legacy n'est ajoutée. La séparation
lecture R1.2 et publication RAM n'est pas transformée silencieusement en write
dans le lecteur existant. Aucun framework, bus d'événements, manager générique,
stockage durable, CAS multi-onglets ou UI métier n'est introduit par P0.

La qualification exécutable des capacités (reentrance, collision avec archive
non chargée, refus sans mutation, stale/ABA et lecture cohérente) reste un
prérequis des lots P1–P7 correspondants ; cette matrice n'en constitue pas une
preuve de tests. L'audit documentaire P0 et le GO explicite suivant restent
nécessaires avant tout travail technique P1.
