# FlowPlan2 V2 — Addendum normatif P0 de simplification R1.1–R1.3

Date d'effet documentaire : **2026-10-13**.
**Livraison documentaire P0 pour audit indépendant. Aucune implémentation de la
simplification n'est livrée.** R1.1/R1.2 restent DONE ; R1.3 reste IN REVIEW ;
R1.4/R2 restent NOT STARTED. P1–P7 ne sont pas autorisés par cette livraison.

## 1. Autorisation, baseline et portée normative

Le GO utilisateur « Go pour exécuter ce plan » autorise l'exécution
**documentaire P0** du [plan livré](./rewrite_simplification_p0_plan.md), après
le [plan général de simplification](./rewrite_r11_r13_simplification_plan.md)
approuvé, corrections C1–C3 incluses. Le préflight du 2026-10-13 a exécuté
`git fetch origin`, `git status --short`, `git branch --show-current`,
`git rev-parse HEAD`, `git rev-parse origin/rewrite/portfolio-versioned` et
`git rev-list --left-right --count origin/rewrite/portfolio-versioned...HEAD`.
Résultat : branche exacte `rewrite/portfolio-versioned`, HEAD = origin =
`c1ae876ef85276ff3c13d236b7617c3410140d10`, arbre propre, divergence 0/0.

Cet addendum fixe la prescription de la **cible** :

> Contrôler intégralement le courant lors de son acquisition, préserver ses
> invariants par validation ciblée à chaque transition, publier atomiquement et
> conserver toutes les versions historiques immuables.

Il amende prospectivement les moyens techniques précisément cités dans la
[matrice des clauses](./rewrite_simplification_p0_clauses.md), et conserve
toutes les règles métier R1.1–R1.3. Les canons clôturés, décisions datées,
preuves et limites historiques restent consultables sans réécriture. Les
mentions « sans GO » du plan P0 décrivent sa préparation du 2026-10-12 ; le GO
présent autorise ses quatre documents et la vérification de §10. Aucun verdict
d'audit indépendant nouveau n'est inventé ici.

Les bandeaux de [current_plan](../../current_plan.md),
[current_canon](../../current_canon.md) et le
[canon R1.3](./rewrite_r13_canon.md) continuent à décrire l'implémentation
livrée en revue. Leur admission H et certification complète par édition restent
des faits livrés ; les clauses T01–T06 de la matrice les remplacent uniquement
dans la spécification de la cible. Leur présence n'autorise ni contournement du
code actuel ni activation anticipée de validation ciblée. La norme documentaire
P0 et sa réalisation technique sont ainsi datées distinctement.

## 2. Corpus métier conservé

Les primitives, identités, refs exactes, owners, filiation/provenance, copie/gel
et égalité structurée R1.1 restent applicables. Les quatorze payloads, mappings,
manifeste, fermeture sélectionnée, lifecycle, AP/partition/grille TA/PTEC,
Capacity, Program/Pas, Order et Snapshot R1.2 restent tous applicables selon
les décisions A-R12-01–09 et corrections B1–B4 R1.2.

Le [catalogue exhaustif](./rewrite_simplification_p0_invariants.md) définit
champs, ensembles quantifiés, dépendances directes/inverses, voies complète et
ciblée, diagnostics pertinents et preuves d'exhaustivité. Ses IDs C01–C16
désignent les garanties du plan P0 ; leurs suffixes précisent les prédicats.
Les obligations de transition R1.3 s'ajoutent à ces invariants structurels,
sans devenir champs de payload ni attestations historiques.

Les commandes et résultats R1.3, confirmations liées au handle exact, stale
global, versions sélectives, règle B1 restore, règle B3 predecessor/base, ETC et
composites restent applicables. Une certification structurelle ne prouve pas
la légitimité d'une transition ou sa confirmation. B4 R1.3 conserve l'obligation
de qualification PERF-EDIT ; aucun gain, seuil ou SLA n'est établi par P0.

## 3. Acquisition intégrale et capacité de courant fiable

### 3.1 Toute entrée inconnue

Le Domain certifie intégralement le graphe **sélectionné** à chaque acquisition
externe/non certifiée : chargement initial, installation, remplacement externe,
réhydratation ou désérialisation. L'Application collecte M et chaque ref S
exacte via les ports appropriés ; absence, substitution et réponse non demandée
refusent l'acquisition. Tous champs, enveloppes, payloads, owners/mappings,
refs et prédicats R1.2 sont évalués ; aucune entrée inconnue ne reçoit de
certificat par cast, flag, index/cache ou nom `Validated`.

Une acquisition Snapshot reste intégrale, indépendante du Current, avec son
propre M, ses refs exactes et knowledgeDate≥tous AP.through sélectionnés,
inactive/deleted et covered-zero compris. Les prédécesseurs/provenances non
fournis ne deviennent pas fermeture structurelle requise ; les contradictions
contextuelles fournies sont refusées et not-established n'est jamais promu.
Un certificat Snapshot ne bootstrappe pas silencieusement un courant.

### 3.2 Capacité et génération

L'Application lie le courant certifié à une capacité privée de session,
non forgeable par l'appelant, non sérialisable, et au propriétaire unique de la
cellule. Elle lie sélection, graph, index dérivés, génération et révision à la
même vue. La certification R1.2 seule ne démontre pas l'exhaustivité historique
de l'autorité d'identités, ni les réservations ou l'atomicité du port.

Toute installation/remplacement externe/réhydratation ou changement de
propriétaire crée une nouvelle génération privée, invalide les capacités,
index et préparations antérieurs et impose nouvelle acquisition complète.
La génération ne peut revenir à un token réutilisable par un ancien handle.
Au commit, génération **et** révision sont comparées ; l'égalité du seul texte
de révision ne protège pas contre un remplacement/ABA. Les IDs et couples
réservés ne sont pas rendus disponibles par ce changement de génération.

## 4. Contrat de validation ciblée et preuve de fermeture

### 4.1 Dossier de transition

Le dossier opaque détenu par l'Application doit lier : capacité de base,
génération/révision, commande acquise et immuable, intentions et conséquences,
refs/owners/clés avant/après, nouvelles versions B, bases historiques exactes,
delta, lectures/dépendances nécessaires, obligations et réponses liées au
handle, réservations, preuves par invariant et vue candidate finale.
Les réponses ne changent pas la portée, partition ou paramètres figés par
prepare. Une réponse ETC autorisée qui change une valeur du delta déclenche la
fermeture et les prédicats correspondants avant matérialisation/commit.

Le delta décrit explicitement les quatre classes suivantes :

| Changement | Informations et preuve requises |
| --- | --- |
| Valeurs | Tous champs réellement changés ; égalité des autres champs et relations ; validation locale complète des nouvelles versions ; prédicats qui lisent ces valeurs. |
| Références | Ancienne/nouvelle ref exacte, enveloppes résolues et clés/owners ; comparaison des payloads pour établir relations identiques ou changées. Une ref nouvelle n'implique pas à elle seule nouvelle composition. |
| Composition | Inventaires avant/après complets des classes affectées, ajouts/retraits, membres/cardinalités ; unicités, bijections, ordre et produits concernés. |
| Suppressions/cascades | Anciennes refs et anciennes clés explicitement conservées dans le delta, absence selected après ; fermeture inverse jusqu'au point fixe et preuve d'absence d'orphelins. Les enveloppes retirées restent archivées. |

### 4.2 Deux preuves pour chaque invariant

Pour **chaque** prédicat du catalogue, Domain doit établir une des preuves :

1. **U — inchangé** : tous ses opérandes et **tout son ensemble quantifié**
   sont égaux avant/après ; la validité héritée du courant certifié s'applique.
2. **A — affecté** : la fermeture avant/après est complète, contient tous les
   opérandes qui peuvent changer son résultat et le prédicat reste satisfait
   sur le candidat. Les membres retirés et les liens inverses font partie de
   cette fermeture ; aucune dépendance n'est limitée aux seuls objets de la
   commande.

La preuve porte sur les données finales exactes qui seront publiées, après
liaison des identités/réponses et matérialisation des versions. Un contrôle de
proposition avant assemblage ne suffit pas si l'assemblage peut altérer refs,
owners ou payloads. Aucune autorité de certification n'est confiée au port
d'assemblage.

### 4.3 Complétude et récurrence

Les index dérivés sont construits depuis le manifeste certifié, confrontés à
ses membres/cardinalités et liés au même token. Le delta met à jour les liens
directs et inverses ensemble ; les ensembles old/new sont prouvés par E0–E8
du catalogue. Une table présente ou une absence de cache ne suffit jamais.
Les classes globales (noms, mappings, Order) doivent avoir une preuve de leur
ensemble entier ; les grilles doivent prouver les deux facteurs complets et
chaque clé de leur produit, pas seulement leur nombre.

Cette preuve n'impose pas un balayage S ou H à chaque édition : la construction
complète à l'acquisition et les mises à jour contrôlées peuvent donner des
témoins incrémentaux vérifiables. Le témoin de Rename établit l'égalité de tous
champs hors name et de tous ensembles/relations métier ; il ne nécessite aucun
parcours Actuals/H. Une modification de composition AP/SP impose en revanche
les produits complets avant/après du root concerné.

Base : C0 a été intégralement certifié. Pas : pour chaque prédicat P, U conserve
ses opérandes/ensemble et sa validité, ou A prouve fermeture et P(Cn+1). Les
obligations, bases et collisions sont contrôlées séparément ; le commit publie
un unique tuple cohérent. Donc Cn+1 reste valide. Un remplacement hors
transition rompt cette induction et impose une nouvelle base intégrale.

### 4.4 Couverture et refus par défaut

Tout champ, kind, relation ou invariant doit figurer dans le catalogue et les
deux chemins avant une transition ciblée qui l'utilise. Champ non classé,
opérande/témoin manquant, index absent/périmé, inverse incomplet ou ensemble
incertain ⇒ **refus avant publication**. Une incohérence de base impose
réacquisition/requalification, jamais réparation automatique. Aucune preuve
fondée uniquement sur une marque TypeScript, pointer equality, hash ou cache
n'est suffisante ; les objets partagés doivent déjà être acquis immuables.

### 4.5 Repli explicite vers l'oracle complet

Le refus est la règle pour fermeture indémontrable. Un repli ne sera admis
que par un cas précisément nommé dans le lot concerné, avec : données du
candidat entier disponibles, démonstration de couverture des invariants par
l'oracle, contrôles indépendants d'identités/bases/obligations/commit, tests du
cas valide/invalide et mesure du coût distincte. Il doit être observable comme
chemin explicitement choisi, sans bascule silencieuse ni nouveau mécanisme
temporaire par commande. **P0 ne qualifie et n'autorise aucun cas de repli.**
Un lot non qualifié reste désactivé ou revient à son chemin existant avant
publication. Une validation complète de S ne prouve jamais un passé absent de I.

## 5. Identité, historique et append : contrats distincts

### 5.1 A — Autorité d'unicité

L'autorité annonce explicitement son Portfolio, sa portée historique RAM,
ses namespaces d'EntityId/VersionId et les classes owner/couple couvertes.
Dans la portée déclarée, elle doit être complète pour les opérations qui
requièrent ses garanties, selected/non selected/deleted et IDs brûlés compris.
Cette exhaustivité est une précondition attestée de la composition native ou
du transfert complet de la source RAM ; un passé omis par sa propre source
n'est pas détectable par un booléen de validation. Si la portée ne peut être
attestée, aucune absence historique n'est prouvée.

| Classe | Clé d'unicité et garantie |
| --- | --- |
| Identités et émissions EntityId | (kind,EntityId)→owner immutable ; aucune seconde émission d'un ID réservé dans son namespace déclaré, ni second mapping métier. |
| Settings | Par kind Settings, owner ProjectId/ReservationId/TeamId→une identité Settings distincte opaque. |
| Capacity / AP / globals | Team→Capacity ; root Project/Reservation→AP ; Portfolio→PlanningSettings et PortfolioOrder séparément par kind. Plusieurs SP par AP sont légitimes. |
| PT / RT | (ProjectId,TeamId)→PT ; (ReservationId,TeamId)→RT, tombstones inclus. |
| TA / PTEC | (association kind+EntityId, SP EntityId)→TA ; PT EntityId→PTEC. Aucune dépendance à la version SP/AP dans ces clés. |
| VersionId | Toute nouvelle VersionId émise est neuve dans la portée de l'autorité, y compris pending/burned ; elle ne peut désigner une autre enveloppe, même d'autre kind/EntityId. |

L'autorité peut être un répertoire compact d'identités, owners, couples et
réservations ou une capacité de réservation exhaustive. Elle doit détecter les
collisions avec une archive non chargée, sans lire/certifier les enveloppes H
entières. Le Domain valide les formes/owners/clés et la cohérence des témoins ;
l'Application demande les garanties nécessaires et refuse leurs absences.

### 5.2 Disponibilité partielle

| Disponibilité / opération | Décision exigée |
| --- | --- |
| Courant non fiable, fermeture non prouvée ou VersionId neuve non garantie | Refus de transition ; acquisition complète si nouvelle base nécessaire. |
| Autorité EntityId/couples partielle, aucune nouvelle identité/couple | Édition permise seulement si owner/identité/base connus, toutes dépendances complètes, VersionId neuve garantie, obligations satisfaites et aucune autre règle ne requiert la classe absente. Rename/Reorder/ETC/correction sont des exemples conditionnels, pas une permission par nom de commande. |
| Création d'identité/couple, absence historique indémontrable | Refus, même si le candidat serait structurellement valide ; ni retry d'ID ni seconde identité de secours. |
| Réemploi d'une identité historique attestée | Réutiliser même owner/couple ; base exacte nécessaire résolue et contrôlée, sans collision selected ; nouvelle VersionId. Une autre unicité requise non prouvée impose refus. |
| Restore avec cellule de grille dont absence/réemploi historique est inconnu | Refus de cette restauration ; une grille valide ne permet pas de déclarer la cellule neuve. |
| Base exacte nécessaire indisponible dans répertoire | Refus de l'opération ; aucune base alternative/latest/valeur implicite. |

La nouvelle version d'une identité existante ne crée pas d'identité métier.
La disponibilité des émissions VersionId peut donc être garantie séparément
de celle des nouvelles identités/couples. C'est le remplacement précis de la
condition B2 universelle, sans réduction des unicités requises.

### 5.3 Réservations et ledger

L'autorité réserve monotoniquement avant de rendre sa sortie. Le garde de
session couvre le premier appel d'allocation ; la sortie est validée et
enregistrée avant un autre appel externe. Une collision ou exception refuse
l'allocation ; les sorties déjà acquises restent indisponibles. Deux prepares
ne peuvent réserver deux identités sur le même nouveau couple.

Abandon/stale/erreur brûlent les réservations non publiées ; un refus de
réponses corrigible conserve les slots de son dossier pending. Aucun burn n'est
recyclé, même après nouvelle génération. Le ledger ne peut être reconstruit
depuis le seul H publié : son transfert inclut explicitement pending/burned.
Les VersionIds sont alloués seulement après réponses valides et décision de
changement effectif. preparationId reste unique dans sa session et lié au
handle original ; il n'est pas une identité métier historique.

Le ledger technique est distinct du tuple métier publié. Son évolution lors
d'un refus ne change pas Current, les archives publiées ou les Snapshots.
Le statut publié des réservations doit être cohérent avec la visibilité du
swap, sans callback après publication susceptible de transformer Applied en
échec. Une version candidate refusée n'entre pas dans H publié.

### 5.4 B — Répertoire historique et bases exactes

Toutes les versions publiées sont conservées immuables, selected ou non,
référencées par Snapshot ou orphelines de tout Snapshot. Le répertoire permet
leur résolution par `(kind,EntityId,VersionId)` pour consultation/restauration,
sans choix de sélection. Une ref absente du cache n'est pas absente de
l'historique. « Absent » suppose une réponse négative autorisée sur le
répertoire complet pertinent ; « indisponible/incomplètement chargé » et
« incompatible » restent distincts et ne deviennent jamais zéro/vide.

Une édition lit les seules enveloppes historiques explicitement nécessaires,
et valide leurs refs/owners/payloads/liens pertinents. L'autorité d'unicité
atteste identité/owner/couple ; elle ne remplace pas la lecture de la base.
B3 impose predecessor=current ref exacte pour identité selected modifiée,
base historique explicitement désignée pour identité non selected, absence
de predecessor seulement pour identité réellement neuve prouvée. Une seule
branche disponible ne devient jamais base implicite ; parent plus ancien
non fourni peut rester not-established, mais la base désignée doit être présente.

B1 impose TA/PTEC historique réintroduit par restore : même identité,
**nouvelle VersionId même payload identique**, aucune ancienne ref resélectionnée.
RestoreRoot/association n'introduit aucune réactivation implicite d'autres
associations/valeurs. Retrait de S, delete, split/merge, empty et abandon ne
suppriment aucune version historique publiée ; aucun snapshot automatique ni
ancien manifeste Current historique n'est créé.

### 5.5 Append contrôlé

Le registre demeure passif et le contrat d'import unknown demeure validant.
Pour une succession fiable, append prépare seulement B et ses contrôles contre
répertoire exact, I, owners/couples et témoins contextuels attestés. Chaque
nouvelle enveloppe/payload est validé, B en interne aussi ; aucune contradiction
connue d'owner, collision ou filiation n'est masquée. Cycles et nouveaux liens
doivent être contrôlés sur leur périmètre pertinent ou par preuve vérifiable ;
preuve insuffisante ⇒ refus. Pas de reconstruction/recopie/revalidation H+B
obligatoire à chaque édition.

Partage structurel seulement d'objets acquis immuables sans alias mutable ;
H0 reste exactement conservé et H1 publié contient seulement B validé en plus.
L'append ne sélectionne ni ne publie : M1, S1, index1 et graphe fiable1 sont
construits séparément puis rendus visibles au même commit. Une répétition exacte
admise à l'import selon R1.1 ne dispense jamais une édition d'IDs neufs.

## 6. C — Publication atomique, stale et réentrance

### 6.1 Propriétaire et tuple

Une cellule RAM est le propriétaire unique de la publication du tuple immutable
`{selection, graph fiable, archives/index, revision, generation}`. selection
contient M/révision ; graph est source current et concorde exactement avec M ;
chaque ref S se résout dans les archives publiées ; index dérivés concordent
avec la même sélection/génération/révision. Génération/index/capacité restent
privés et ne deviennent pas champs des wrappers Domain R1.2.

La cellule permet lecture cohérente et commit conditionnel conceptuel
`commit(expectedGeneration, expectedRevision, candidate)`. Cette expression
définit une capacité, pas une signature de code ajoutée par P0. La composition
ne raccorde qu'une cellule qualifiée pour ce contrat, un seul écrivain/service,
sans alias mutable ou publier arbitraire capable de modifier puis de lever.

### 6.2 Point irréversible et résultat

Tous callbacks de composition, copies, allocations, validations et assemblages
sont terminés avant la fenêtre finale. La cellule compare génération/révision
et réalise une **unique assignation interne de référence** au tuple candidate.
Cette assignation est le point de commit. Aucun callback externe, I/O ou await
ne peut intervenir entre la comparaison finale et l'assignation ; aucune
notification n'est exécutée dans cette fenêtre.

Avant assignation : erreur/refus/stale laisse l'ancien tuple observable
intégralement identique, B absent du publié et anciennes archives immuables.
Après assignation : résultat Applied, jamais InternalTransitionFailure ou refus
prétendant que Current n'a pas changé. Les notifications éventuelles viennent
séparément après retour Applied ; leur échec ne requalifie pas le commit.
NoOp n'alloue aucune version et ne modifie ni révision ni tuple. Aucune garantie
universelle de récupération d'épuisement physique runtime n'est inventée.

### 6.3 Stale global et garde

Le contrôle stale précède la validation des réponses ; il compare le token
global de la préparation à la vue propriétaire. Un Applied invalide toutes
préparations anciennes, cibles disjointes comprises. NoOp/Rejected/abandon ne
changent pas révision. Une façade async éventuelle vérifie stale à l'entrée de
la section propriétaire après attente, puis de nouveau au point de commit.
Pas de merge/rebase implicite ni coordination durable revendiquée.

Un garde de session unique couvre prepare **dès avant le premier appel
d'allocation**, execute, abandon et remplacement. Toute entrée réentrante est
refusée avant lecture/planification/effet. Plusieurs préparations séquentielles
pending restent permises ; le garde ne verrouille pas l'attente humaine.
Pendant commit, la cellule refuse réentrance/second écrivain avant swap ;
l'orchestrateur ne tient pas exclusive autour d'un callback externe publish.
Port arbitraire, façade exclusive ou marque de confiance ne constitue pas seul
une preuve d'atomicité : le point interne de swap doit être qualifié.

La génération doit rendre impossibles les réemplois de token à nouveau
propriétaire/remplacement et la révision les réemplois dans la session. Le
contrat RAM vaut dans une portée/propriétaire ; durable, multi-onglets,
transactions, receipts/idempotence/recovery demeurent R2.

## 7. Obligations et résultats R1.3 préservés

Les conséquences de delete/restore/catalogue/partition sont exhaustives avant
prepare. Retrait de TA : confirmation globale unique, zéros compris ; Team
Portfolio toujours confirmée. Correction ou bornes de cellule changées :
confirmation ciblée, même Consumption identique. RestoreAssociation confirme
toute grille sur partition courante et paramètres explicitement revus ; aucune
ancienne quantité non nulle n'est automatiquement réactivée.

Through change : revue de tous PT existing du Project selon ETC précédent,
et alignement PTEC ; correction/borne TA : revue des PT affectés. Zéro reste
zéro sans revue supplémentaire ; zéro→positif explicitement confirmé ; positif
requiert keep/replace explicite. Aucun recalcul ETC depuis consommation. Une
confirmation seule sans payload/sélection changé n'alloue pas de version ; B1
restore reste l'exception circonscrite. Split/merge crée nouvelles identités
SP/TA sans division/somme/prorata implicite ; adjust garde les identités.

prepare conserve Prepared/NoOp/Rejected ; execute Applied/NoOp/Rejected/Stale.
Réponses Rejected corrigibles tant que pending ; Applied/NoOp/Stale et erreurs
internes terminent le dossier, handles non rejouables. Un invariant refusé sur
un candidat que l'analyse estimait légal conserve la distinction d'échec interne
de certification avec diagnostic/stage ; assemblage/allocation incompatible
reste erreur interne distincte, aucune publication. P0 ne redéfinit pas les
unions publiques d'erreurs ni l'ordre des diagnostics existants ; l'équivalence
de leurs effets devra être qualifiée avant changement technique.

## 8. Frontières et source unique

La [matrice hexagonale](./rewrite_simplification_p0_boundaries.md) attribue
validation pure et preuves au Domain, orchestration/dossiers/obligations à
Application, capacités abstraites aux ports et stockage/ledger/swap aux adapters.
L'UI n'a aucune autorité métier. Un seul catalogue, une seule capacité de
courant fiable et une seule cellule de publication ; I distinct du répertoire
et index dérivés sans autorité concurrente. Aucune dépendance Domain vers
Application/ports/adapters/UI/IndexedDB/moteur/legacy n'est introduite.

## 9. Preuves techniques futures et limites de cette livraison

P1–P7 devront préserver suites/gates existantes et qualifier capacités, append,
succession, refus, obligations et performance. Les preuves attendues comprennent
oracle complet sur chaque candidat accepté en laboratoire et séquences,
contre-exemples manuels indépendants, couverture champs/prédicats, mutations des
liens inverses, collision avec archive non chargée, authority partielle,
historique ramifié, grilles dense/sparse, refus sans mutation, gardes réentrants
avant réponse d'allocateur et pendant commit, stale/ABA/remplacement externe.

L'oracle et le ciblé peuvent partager un défaut de prédicat : le différentiel
seul ne suffit pas. Les nouveaux champs/relations exigent revue des deux voies.
Les mesures S/H/B/D et phases acquisition/fermeture/validation/append/candidat/
commit seront distinctes ; une commande globale garde son coût d'ensemble
nécessaire. P0 n'exécute aucun test, script de production, benchmark ou prototype
et ne choisit aucune représentation persistante ni compatibilité d'API future.

## 10. Vérification documentaire avant toute autorisation P1

| Critère | Preuve documentaire livrée / constat |
| --- | --- |
| Toutes garanties R1.1–R1.3 conservées | Matrice G01–G23, décisions A-R12-01–09/B1–B4 et corpus §2/§7 ; règles non ajoutées listées dans catalogue §4. |
| Clauses techniques précisément amendées et histoire accessible | Matrice T01–T06 : citations/sections/lignes de baseline, garantie conservée et remplacement daté ; canons/décisions/source plans conservés. |
| Invariants et champs exhaustifs pour préparer P4–P6 | Catalogue §2–5 : tous champs des 14 kinds, enveloppes, 15 champs M, wrappers Current/Snapshot, IDs C01–C16 et diagnostics pertinents. |
| Aucune validation ciblée sans fermeture | §4 et catalogue E0–E8/R01–R12 : U ou A pour chaque prédicat, old/new, inverses/classes/produits complets, refus par défaut. |
| Inconnus et Snapshot certifiés intégralement | §3.1 et catalogue C16 ; aucun constructeur public already-valid ni autorité de cast/index. |
| H conservé sans scan/certification exhaustifs par édition | §5.4–5.5, catalogue C02/C16 ; append B et bases exactes, aucune suppression d'archive. |
| Unicité distincte du répertoire, disponibilité partielle définie | §5.1–5.3 et matrice hexagonale §2–3 ; VersionId toujours neuve, création non prouvée refusée. |
| Atomicité explicite, réentrance/ABA couverts contractuellement | §6 et matrice hexagonale ; génération+révision, propriétaire unique, point de commit, résultats avant/après. |
| Repli complet explicite/qualifié/testable | §4.5 : aucun cas autorisé aujourd'hui, qualification future requise ; aucune unicité passée déduite de S. |
| Périmètre documentaire et cohérence de livraison | Quatre fichiers P0 de cette livraison, liens/source citations/IDs relus ; contrôles Git diff/check/périmètre avant commit normal et push sans force. |
| Statuts et autorisation suivante | R1.3 IN REVIEW, R1.4/R2 NOT STARTED ; aucun statut historique modifié. Audit indépendant de ces documents et GO explicite P1 restent nécessaires. |

La vérification est une revue documentaire interne, **pas** un audit indépendant
ni la qualification exécutable des contrats. Les chemins techniques restent
ceux de la baseline ; aucun test/build/benchmark ne prouve aujourd'hui une
implémentation de la cible. Le SHA final de livraison sera communiqué après
commit/push et contrôle de l'arbre propre/origin 0/0, sans auto-référence dans
ce fichier.

**STOP après livraison documentaire P0. Attendre l'audit indépendant ChatGPT
et le GO explicite de l'utilisateur avant P1.**
