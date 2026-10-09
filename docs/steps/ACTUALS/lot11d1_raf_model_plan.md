# Lot 11D.1 — Plan de séparation RAF courant / RAF des snapshots Actuals

**Statut : PLAN POUR AUDIT INDÉPENDANT CHATGPT / PLANNED / NOT STARTED.**
Date : 2026-10-09. Aucune implémentation autorisée ou commencée.
**11D.0 reste DONE ; 11D.2 et 11D.3 restent NOT STARTED.**
Durcissement R1/R2 du 2026-10-09 : décisions utilisateur acquises, consignées
à la baseline `7ab7019397746c208c83f9e0d6900fdaafb326ec`, branche attendue,
arbre propre et origin 0/0 après fetch. Les contrôles du tableau §1 décrivent
la rédaction initiale ; ce durcissement ne modifie que le présent document.

Ce plan prépare le modèle, les commandes et leur compatibilité avant la nouvelle
carte Project et le replay. Il n'est pas READY FOR IMPLEMENTATION. Les décisions
ci-dessous sont des propositions à auditer, sauf les exigences fonctionnelles
explicitement fixées par le mandat. Audit puis autorisation explicite requis.

## 1. Baseline et sources vérifiées

| Contrôle initial, dans l'ordre demandé | Résultat constaté |
| --- | --- |
| `git fetch origin` | Succès |
| `git status --short` | Vide, aucune modification locale |
| `git rev-parse HEAD` | `4bfc8842cf0aeda30e7f72b19594d1db262df035`, référence attendue exacte |
| `git rev-list --left-right --count HEAD...origin/codex/lot11a-portfolio-snapshots` | `0 / 0` |
| Branche | `codex/lot11a-portfolio-snapshots` |
| Remote origin | `https://github.com/kartaguez/FlowPlan2.git` |
| Instructions locales | Aucun `AGENTS.md` trouvé dans le dépôt |

Baseline d'implémentation validée distincte :
`8d95f7406ff40a6d2d041b41784a3915173989c8` (11D.0 DONE).
Pas de reset, écrasement ou force-push. Seuls ce nouveau document et
`docs/current_plan.md` changent dans cette mission.

Sources lues et confrontées aux chemins de production et aux tests :

- [Canon durable](../../canon.md), [canon courant](../../current_canon.md),
  [trajectoire](../../current_plan.md).
- [Étude d'impact RAF/replay](../../arch/RAF_CURRENT_AND_PORTFOLIO_REPLAY_IMPACT_AUDIT.md) :
  analyse utile, aucune autorisation d'implémentation.
- [10C.1 canon](./lot10c1_canon.md), [10C.2 plan et réalisation](./lot10c2_plan.md),
  [11D.1 UX plan](./lot11d1_plan.md).
- [11D.0 canon](../STORAGE/lot11d0_canon.md),
  [11A canon](../PORTFOLIO_SNAPSHOTS/lot11a_canon.md),
  [11A.2 canon](../HISTORY/lot11a2_canon.md),
  [11B canon](../HISTORY/lot11b_canon.md), [11C canon](../HISTORY/lot11c_canon.md).

Les anciennes mentions IN REVIEW et localStorage décrivent les livraisons
historiques. Les clôtures explicites et la production 11D.0 prévalent :
11A/11A.2/11B/11C/11D.0 sont DONE. Les résultats historiques 935 tests Application
et 3 tests portable ne sont pas une validation du modèle proposé. Aucun test
métier n'a été exécuté, créé ou modifié pour cette mission documentaire.

### Constats dans le code réel

| Fichier / contrat existant | Constat et évolution nécessaire |
| --- | --- |
| `src/domain/model/entities.ts` : `createProjectTeamRequirement`, `createProject`, `createPortfolio` | Requirements possèdent le RAF. `createPortfolio` impose `ACTUALS_RAF_MISMATCH` contre le dernier V5 ou le dernier record V4 sous `latest-actuals`. Il impose séparément la participation V5 dans l'ordre des requirements et protège les Teams historiques. |
| `src/domain/actuals/requirements.ts` : `transitionProjectRequirements` | Refuse `ACTUALS_RAF_IMMUTABLE` pour une Team déjà présente si snapshots ou autorité legacy ; contrôle distinct `RAF_AUTHORITY_CHANGE`. |
| `src/domain/actuals/snapshots.ts` : factories et `createSnapshotHistory` | RAF exact pour exactement les participants ; versions consécutives ; périodes/IDs, retrait non nul et marqueurs historiques contrôlés. Aucune comparaison RAF avec requirements ici. |
| `src/domain/actuals/transition.ts` : `replaceProjectSnapshot` | `baseVersion`, horloge, intents, preuves, normalisation et no-op canonique incluant RAF. Confirmation de retrait fondée aujourd'hui sur le RAF historique précédent, insuffisante si RAF courant diverge. |
| `src/application/session/planningSession.ts` : `replaceProjectActuals` | Ajoute une histoire puis reconstruit requirements depuis `command.current.raf`. Retourne trop tôt si histoire identique ; nouveau contrat doit empêcher qu'un candidat ancien restaure le RAF courant. `updateProject` reçoit actuellement des requirements entiers. |
| `src/application/session/projectEditViewModel.ts` | Affiche `latest-actuals` dès qu'un snapshot existe : ce discriminant pilote le wiring, pas seulement un texte. |
| `src/application/session/snapshotActualsViewModel.ts` | Expose déjà `forecastRaf` provenant des requirements. Réutilisable comme RAF publié. |
| `src/ui/actuals/snapshotActualsDraftStore.ts` : `fromModel`, `rebase`, `review` | Priorité au RAF du snapshot ; rebase déclenché par version/membership seulement ; `review` reconstruit la base depuis un préfixe et le modèle récent. Cette reconstruction ne pourra pas restituer un ancien RAF courant. |
| `src/ui/actuals/parseSnapshotActualsCommand.ts`, `createSnapshotActualsCardController.ts` | RAF rapide produit `initial` ou `raf-only` par la commande Actuals. À rerouter vers A ; sortie modale évaluée par Application selon R2, handoff membership vers B. |
| `src/ui/timeline/createTimelineUiCoordinator.ts`, `actualsForecastConflict.ts`, éditeurs Project | Owners indépendants et handoff existants ; gardes RAF/Forecast, nettoyage ciblé après succès. Adapter la sémantique, conserver composition et disposition. |
| `src/main/planning/createRepositoryPlanningDispatcher.ts` | `prepare` → projection privée → `writeCurrent` CAS → `publish` ; no-op par identité ; recovery et receipts déjà implémentés. |
| `src/application/persistence/createPlanningRepository.ts` | Decode strict V5 des inputs Current ; comparaison des préfixes Actuals et records legacy hors transaction ; CAS final. Métadonnées History imposent inputsSchemaVersion 1. |
| `src/application/backup/planningInputCodec.ts`, V6/V7, `portableBackupParts.ts` | Inputs V5, shapes fermées, strict round-trip. V5 encode/decode est dans `planningInputCodec.ts`, pas un module `flowplanBackupV5.ts`. |
| `src/application/portfolioSnapshots/capturePortfolioSnapshot.ts`, Domain `portfolioSnapshot.ts` | Capture RAF depuis requirements ; sources par ID exact ; hydrate le préfixe puis decode V5 strict ; inputsSchemaVersion 1 obligatoire. Totaux déjà compatibles avec deux RAF distincts. |
| `src/domain/actuals/projectActualsKnowledge.ts`, `src/domain/planning/engine.ts` | Borne issue de la source Actuals exclusive ; moteur utilise requirements et prédicat global `date > T`. Aucun changement d'algorithme nécessaire. |

L'ancien plan UX 11D.1 excluait Domain et formats et conservait RAF rapide →
snapshot. Ces trois hypothèses doivent être remplacées **pour ce préalable**.
Ses propositions de tableau, rendu et modale restent futures ; leur autorisation
n'est pas acquise. Les canons ne sont pas modifiés par la présente mission.

## 2. Invariants actuels et invariants cibles

### Exigences acquises

- Autorité persistante unique du RAF courant :
  `Project.requirements[teamId].remainingWorkload` (le code utilise un tableau
  de requirements identifiés par Team). Quantités réduites exactes, non négatives,
  zéro explicite ; jamais Number pour le métier.
- `ProjectActualsSnapshot.raf` conserve le RAF connu à sa publication, immutable.
  Une révision indépendante ne change aucun snapshot, ID, période, version,
  knowledgeDate, source Actuals, marqueur ou preuve legacy.
- Lors d'une publication effective de nouvelle connaissance Actuals, tous les
  requirements participants égaux au RAF du **nouveau** snapshot, dans le même
  candidat et commit. Cette égalité est une postcondition, jamais un invariant
  permanent. Le RAF n'est pas diminué de nouveau par les consommés.
- Participation requirements / dernier snapshot V5 reste égale et ordonnée.
  Pas de membership Forecast indépendant après V5. Les retrait/réintroduction
  restent des transitions de connaissance explicites.
- Histoires append-only ; anciennes versions raf-only conservées sans
  renumérotation. Préfixes, IDs Project/Team/période/snapshot et legacy protégés.
- Une source Actuals exclusive : dernier V5, sinon legacy pending, sinon none.
  Couverture zéro reste couverture ; aucune couverture signifie T=null.
- Forecast positif strictement après T sur toutes les Teams ; sinon contraintes
  earliestStartDate et horizon. Révision RAF ne fixe aucune date d'application.
- Drafts RAM indépendants, saisie inert, no-op exact, validation/projection privée,
  CAS et publication seulement après commit confirmé ; recovery 11D.0 conservé.

### Changements Domain indispensables proposés

1. `transitionProjectRequirements` : retirer l'interdiction de changement
   **numérique** `ACTUALS_RAF_IMMUTABLE`, pour V5 et legacy. Continuer à valider
   quantités, caps, IDs et provenance ; ne pas accepter une autorité arbitraire.
   Le membership reste contrôlé par le Portfolio et le chemin de commande.
2. `createPortfolio` : retirer l'égalité **numérique** `ACTUALS_RAF_MISMATCH` en
   modèle courant. Garder membership V5, références historiques, provenance
   legacy valide et existence des entrées legacy lorsqu'elle est exigée.
   Ne pas retirer tout le bloc sous prétexte que l'erreur combine existence et
   égalité : isoler les contrôles de présence/identité du contrôle numérique.
3. `rafAuthority` et `legacyV4RafAuthority` : conserver les valeurs anciennes
   comme provenance de migration, pas comme seconde autorité RAF ni verrou.
   Ne pas réécrire les preuves legacy lors d'une révision. Dans les ViewModels,
   exposer explicitement « RAF courant éditable » plutôt que déduire le routage
   de `latest-actuals`. Pas de nouveau champ persistant RAF/source courante.
4. `createProjectActualsSnapshot` et `createSnapshotHistory` : conserver leurs
   contrats de données, y compris snapshots sans couverture et raf-only anciens.
   Ne pas ajouter l'égalité requirements à ces factories. Tests renforcés pour
   démontrer immutabilité et exactitude ; pas de migration des histories.
5. `replaceProjectSnapshot` : séparation entre validation de données historiques
   et validation d'une **nouvelle publication**. Ajouter un contexte Project
   contenant le RAF courant de référence, validé par Application ; confirmer le
   retrait selon ce RAF et les consommés courants, jamais le seul RAF précédent.
   Maintenir les preuves consommées, intents, hors-zone, IDs et horloge.
6. Nouveaux appels métier Project : changement seulement RAF → A ; B ne fabrique
   plus `raf-only`, ni un premier V5 sans couverture pour une simple saisie RAF.
   Conserver la possibilité de lire/valider les anciennes versions. Une érosion
   totale ou un membership sur un ancien V5 sans couverture peut toujours
   publier une nouvelle version sans couverture : connaissance réellement changée.

### R1 — Confirmation RAF conditionnelle (décision acquise)

Dans Update Actuals, l'ensemble des confirmations RAF requises est l'union de :

- toutes les Teams participantes si la couverture **ou la partition temporelle**
  change : présence/absence de couverture, bornes, ajout/retrait/split/merge ou
  changement des intervalles, même si actualsThrough reste identique ;
- à périodes identiques, les seules Teams dont au moins une consommation exacte
  change ; si seule Team A change, aucun RAF de Team B à confirmer en plus ;
- les Teams dont le RAF numérique change par rapport au RAF **courant publié**,
  et les confirmations propres aux ajouts, retraits et réintroductions existants.

Ces obligations sont cumulatives. Une valeur RAF inchangée peut nécessiter une
confirmation, par exemple après consommation modifiée. Le RAF courant différent
du dernier RAF historique n'est pas à lui seul une modification candidate et
n'étend pas les confirmations à une Team non concernée. Le contexte Domain de
publication utilise la connaissance sélectionnée et le RAF courant de référence
pour évaluer R1 ; ne pas réintroduire une comparaison globale au RAF historique.
Les preuves de consommation restent sélectives avec l'exception Domain-zero
existante ; les confirmations de membership/retrait du §4 restent obligatoires.
Une modification concurrente invalide les confirmations dépendant de l'ancienne
base, puis impose stale/review selon §5. Confirmation, changement numérique et
formatage sont distincts : ni représentation équivalente ni ouverture de champ
ne confirment une valeur. A valide ses seules valeurs RAF modifiées par Apply.

## 3. Décisions d'architecture proposées

### Commande RAF explicite ; pas de seconde autorité

Ajouter `update-project-current-raf`. Un patch limité aux Teams déjà membres
rend l'intention claire et empêche de transporter involontairement couverture,
membership, caps ou noms périmés. Réutiliser la session et le dispatcher normal ;
aucun repository RAF, journal de versions individuel ou nouveau store physique.

`update-project` reste la commande Forecast : nom, dates, associations, couleur,
daily caps et membership autonome avant connaissance dépendante. Les RAF de
Teams déjà membres ne doivent plus être pris dans une vieille copie intégrale :
le parser transmet leur intention explicite, la session préserve les RAF publiés
pour les champs untouched et refuse une révision cachée par ce chemin. Pour
création/ajout autonome avant V5, RAF initial de la nouvelle Team explicite,
avec contrôle de base du membership. Toute révision d'un membre existant suit A.

Pas de séquence « appliquer Forecast puis RAF » dans un seul Apply supposé
atomique. Conserver la garde existante si RAF et autres champs non transportables
sont dirty : résoudre/séquencer explicitement, drafts gardés. Le handoff membership
vers B porte uniquement les paramètres déjà transportables, dont daily caps.
Un élargissement à une commande composite de tous les champs n'est pas requis.

### Ownership minimal sans refonte UI

Conserver les stores existants et les deux vues RAF de carte synchronisées,
avec une seule intention RAF par objet et une branche modale. Les relier au RAF
**courant** ; RAF historique uniquement en lecture de History objet. Changer
routing/parser/bases/messages nécessaires, sans tableau compact, rendu numérique
nouveau, boutons RAF dédiés ou refonte de modale. Plusieurs cartes peuvent être
dirty ; une opération nettoie uniquement son owner après succès confirmé.

## 4. Contrats des commandes et transactions

### A — `update-project-current-raf`

Contrat typé proposé (noms définitifs à arrêter à l'implémentation) :

- `projectId` ; patch unique `{teamId, remainingWorkload}` pour 1..N membres ;
- base RAM structurée : identité du Project, source Actuals (kind/ID/version ou
  comparaison canonique complète legacy), membership publié complet, RAF canoniques des
  Teams ciblées ; aucune date métier nouvelle ;
- pas de `dailyCap`, coverage, snapshot candidate ou `rafAuthority` éditable. La base source remplit le rôle
  de version de référence ; elle ne s'ajoute pas à la persistence.

Prepare, sans effets :

1. Refuser Project absent, payload malformé, duplicates, inconnus, membre absent,
   quantité invalide/négative et base manquante. Ne pas convertir absence en zéro.
2. Vérifier identité/source/membership et RAF de référence contre Current RAM.
   Un changement Actuals depuis la base nécessite revue, même RAF identique.
3. Après contrôle de base, comparer patch canonique au RAF publié. Équivalence
   complète → même référence de state, aucune horloge/version/projection/écriture.
   Une base obsolète n'est pas blanchie par un target égal au Current ; revue
   explicite peut rebaser puis produire ce no-op.
4. Reconstruire seulement les requirements ciblés, garder caps et provenance,
   Actuals/legacy/histories et tous les autres champs identiques ; factories
   requirement/Project/Portfolio dans le modèle séparé.
5. Dispatcher : exactement une projection privée et un `writeCurrent` sous token
   attendu pour changement effectif ; aucun accès payload Portfolio History.
6. Commit confirmé → `session.publish(previous,candidate,command)`, projection
   et token cohérents, rebase des autres owners. Échec → aucune publication.

Deux patches de Teams différentes peuvent se rebaser si source/membership restent
identiques ; la commande contrôle toujours ses propres valeurs de référence.
Deux patches contradictoires du même RAF sont refusés avant projection.

### R2 — Validation du parcours Update Actuals et sélection Application

Conserver le candidat whole-object, `baseVersion`, intent, evidence, membership
Forecast et caps transportables. Ajouter une **base Current Project explicite** :
source sélectionnée, membership, map RAF publiée complète et caps pertinents au
handoff. Base RAM, sérialisations exactes, aucun nouveau champ Domain persisté.

La validation du parcours est un use case Application, testable sans UI. Elle
sélectionne l'opération effective A/B ou no-op ; aucun nouveau type de commande
composite n'est introduit. Le payload de validation peut réutiliser le contrat
candidat existant, mais son origine modale ne signifie pas automatiquement B.
Le parser UI transmet l'intention complète et ses preuves, sans décider A/B.
La sélection et la préparation appartiennent à une même opération privée contre
la même référence Current ; les appels directs Application passent par les mêmes
contrôles. Aucun dispatch imbriqué ni boucle de publication.

Ordre obligatoire :

1. Initialiser les périodes depuis la connaissance Actuals sélectionnée et les
   RAF depuis requirements réellement publiés. Copier les RAF dirty de carte
   dans la branche avec leur provenance ; aucun fallback RAF historique.
2. Vérifier payload, Project, `baseVersion`/snapshotId/source, base RAF complète,
   membership et caps contre Current publié. Toute base périmée bloque avant
   routage, même si le candidat paraît identique. Garder draft et preuves à revoir.
3. Valider structure, quantités et identités de périodes ; comparer exactement
   connaissance Actuals candidate/publiée et RAF candidats/courants publiés.
   Connaissance = participation, retiredZeroTeams, couverture, intervalles et
   consommés exacts ; une consommation seule est un changement Actuals. RAF,
   confirmations et metadata techniques sont exclus du comparateur Actuals.
   Un changement artificiel d'ID ne vaut pas changement métier et reste soumis
   aux validations d'identité. Fractions réduites équivalentes ne changent rien.
4. Appliquer la table R2 et les preuves requises pour l'opération retenue ;
   préparer au maximum un candidat session. Ne pas appeler d'abord A puis B.

| Actuals candidates / publiées | RAF candidats / courants publiés | Opération effective |
| --- | --- | --- |
| Inchangés | Inchangés | No-op complet, même state/projection/token ; aucun snapshot ni write |
| Inchangés | Modifiés | A `update-project-current-raf`, patch des seuls RAF modifiés ; zéro snapshot Actuals |
| Modifiés | Inchangés | B `replace-project-actuals`, un snapshot Actuals + RAF ; confirmations R1 même si RAF numérique inchangé |
| Modifiés | Modifiés | B `replace-project-actuals`, un snapshot Actuals + RAF ; union des obligations R1 |

Pour la branche A issue du parcours, conserver les contrôles de la **base complète**
réalisés avant routage : ne pas perdre la détection d'une révision concurrente de
RAF non ciblé en réduisant le candidat en patch. Les bases A habituelles restent
celles du §4.A. Pour no-op, confirmations seules ne créent rien. Un candidat
reprenant délibérément un ancien RAF différent peut produire A seulement après
validation de base et geste explicite ; jamais restauration par fallback.

### B — `replace-project-actuals` (publication Actuals + RAF)

B est retenue uniquement si la connaissance Actuals change selon R2. Valider
intent, horloge et preuves de consommation existantes, puis confirmations RAF
conditionnelles R1 et membership. Première connaissance native/reconcile explicite
exige couverture confirmée, éventuellement toute zéro ; RAF seul avant snapshot
est A et ne change ni migrationStatus ni source legacy. Un payload sans périodes
ne supprime pas implicitement la source legacy pending : distinguer connaissance
inchangée et réconciliation/érosion explicitement demandée.

`replaceProjectSnapshot` ajoute exactement une version validée, préserve le préfixe
et reçoit le contexte RAF courant pour preuves/retrait. Reconstruire requirements
depuis le RAF du **nouveau snapshot validé**, non une deuxième interprétation du
payload ; vérifier l'égalité post-publication. Un RAF repris depuis Current reste
repris, même divergent du dernier snapshot historique : confirmation R1 seulement
pour les Teams concernées, valeurs explicites conservées, aucun réalignement ancien.

Une validation effective A ou B prépare une seule projection et un seul
`writeCurrent` CAS ; publication unique après commit confirmé. Aucun état
intermédiaire, aucune séquence A→B. Refus/stale/no-op : zéro projection/commit et
aucune version consommée. Les confirmations ne modifient ni version ni knowledgeDate
à elles seules. B initial/reconcile/membership/extension/erosion/replace conserve
son sens ; `raf-only` ancien reste historique, aucun nouveau snapshot par RAF seul.
Le helper historique peut servir aux fixtures/validations anciennes mais pas à un
chemin de mutation production raf-only. Reservation : contrat inchangé, aucun RAF.

La table R2 suppose les paramètres Forecast transportés inchangés ou valides dans
un handoff B de membership. Si seules les daily caps changent, utiliser explicitement
`update-project`, sans snapshot. Si caps et RAF changent sans nouvelle connaissance,
conserver la garde/séquencement des champs Forecast : ne pas absorber les caps
dans A ni annoncer un no-op qui les perdrait. Aucune commande composite supplémentaire.

### Retrait, réintroduction et legacy

Retrait V5 : consommés **courants** tous nuls requis, pas seulement somme nulle ;
RAF de la Team retirée absent des nouveaux requirements et nouveau snapshot.
Marqueur retiredZeroTeams conservé. Si RAF courant avant retrait >0, confirmation
explicite de mise à zéro/retrait nécessaire même si RAF historique =0. Garder
également les anciennes confirmations nécessaires lorsque RAF historique >0.
Le contexte Domain impose au minimum l'union des obligations anciennes et nouvelles.
Une révision A à zéro préalable ne retire pas la Team et ne contourne pas les
consommés non nuls. Un RAF dirty sur une Team ciblée par retrait exige résolution,
jamais abandon silencieux dans le handoff.

Réintroduction : nouveau RAF et toutes cellules participantes explicites, y
compris zéro ; aucun ancien RAF automatiquement restauré. Supprimer le marqueur
courant de retrait pour cette Team, préserver tous les snapshots précédents.

Legacy pending : A autorisé en gardant records/autorités/provenance, aucune
réconciliation automatique. Membership dépendant du legacy passe par reconcile
explicite comme le handoff actuel ; ne pas élargir l'autonomie du membership
pending dans ce lot. Après reconcile, V5 exclusif et V4 conservé en preuve.

## 5. Concurrence : trois niveaux distincts

### 5.1 Base métier des drafts en RAM

Conserver **la vraie base d'ouverture**, immutable et séparée du modèle récent :
source Actuals exacte, membership, map des RAF courants canoniques, caps concernés,
partition/valeurs et IDs. `old.model` rafraîchi ou un préfixe snapshots ne peut
plus reconstruire cette base. Saisies invalides restent textes, inapplicables.
Bases de la carte, branche modale et handoff restent explicites ; Cancel modal
restaure la carte, pas le dernier historique.

Comparaison à trois voies par Team : B=base publiée, L=intention locale,
R=Current publié récent. IDs triés canoniquement pour la comparaison, ordre
Portfolio maintenu dans le candidat. Quantités réduites via serializeQuantity,
pas JSON de scalars WeakMap (qui ne représente pas les quantités).

| Comparaison | Résolution proposée |
| --- | --- |
| L=B, R=B | Garder base et texte |
| L=B, R≠B | Adopter R seulement dans rebase sûr de carte ; invalider preuve RAF concernée |
| L≠B, R=B | Garder L et texte, base à jour |
| L≠B, R≠B, L=R exactement | Convergence possible après revue/rebase ; pas de conflit numérique ni écriture supplémentaire A |
| L≠B, R≠B, L≠R | Conflit ciblé, conserver L et R, Apply bloqué jusqu'à résolution explicite |
| Partition/membership/source incompatible | Stale structurel ; pas de merge forcé ni copie ancienne ; revue/reconstruction ou Cancel |

Une base modifiée déclenche rebase même si version Actuals inchangée. Comparer
par IDs, pas indices seuls ; nouvelle Team/liste réordonnée est détectée.
Modale ouverte : aucun rebase silencieux, stale et revue explicite. RAF repris
ou fusionnés invalident les confirmations dépendantes ; renouveler celles requises
par R1 et membership après revue, sans confirmation globale automatique. Ne pas
fabriquer evidence pour une valeur distante nouvellement adoptée. Changement Actuals concurrent :
conserver le rebase sûr existant pour champs disjoints et partition identique,
mais avancer baseVersion seulement après merge validé. Partition modifiée par
une branche ou membership divergent → stale ; aucun changement de date masqué.

### 5.2 Concurrence sur Current publié

`PlanningSession.prepare` revérifie la base au moment de l'opération contre son
state publié ; A vérifie RAF ciblés plus source/membership, B tous les RAF/membership
et paramètres transportés. Une projection récente n'est pas une preuve de base.
`session.publish` exige toujours la référence previous exacte. Le dispatcher
sérialise les opérations de cette session ; root inert durant async commit.

Ne pas persister compteur RAF par Team. Current possède déjà currentRevision.
La map canonique fournit la concurrence métier, le token complet la concurrence
persistante. Un changement A→B détecté par map même baseVersion identique ;
B→A et B→B détectés par source/version ; membership→A/B par membership/source.
L'aller-retour RAF X→Y→X entre ouverture et Apply est équivalent au niveau métier
si source/membership inchangés : pas de conflit artificiel par compteur individuel.
Le CAS final protège néanmoins la révision de stockage attendue.

### 5.3 CAS repository et recovery 11D.0

Autre onglet : notification/focus peuvent révéler un changement, mais ni
BroadcastChannel ni un rebase RAM n'autorisent à écrire avec un ancien token.
Garder comportement existant : CAS distant perdu → recovery/reload explicite,
sans retry automatique ou merge distant silencieux. Même un changement distant
sur un autre Project peut invalider le token complet. Après reload confirmé les
drafts RAM sont perdus, comme 11D.0 ; ne pas promettre restauration automatique.

| Événement | Résultat requis |
| --- | --- |
| Deux A mêmes Team/base, cibles différentes dans une session | Deuxième refus métier ou conflit de rebase, zéro projection/write pour refus |
| A puis B ancien sur même Project | Base RAF différente malgré version identique ; B bloque/revue, garde consommés saisis |
| Deux B concurrentes | Version/source stale ; merge sûr seulement avant nouvelle prepare, jamais écrasement complet |
| Membership et RAF concurrents | Stale structurel ; revalidation retrait/ajout, aucune Team omise silencieusement |
| RAF modifié dans une autre carte de la session | Trois voies + prepare ; preuves invalidées si branche ouverte |
| RAF modifié autre onglet, notification absente | CAS complet bloque ; recovery, aucun publish local |
| Validation ou projection en échec | État/projection/token et drafts identiques, aucun writeCurrent ; édition reste utilisable |
| Abort prouvé `not-applied` | Pas de publication ; draft conservé et retry explicite, même operationId pour même requête |
| Ack perdu / outcome inconnu | Latch commit-uncertain ; mutations Current/Save/Delete/import bloquées ; reload explicite |
| Commit confirmé, publish/reconciliation locale échoue | committed-unreconciled ; ne pas prétendre rollback ; reload pour relire l'autorité |

Conserver signatures de requête, receipt lookup avant CAS et operationId stable
pour retry identique. Candidat rebâti différent → nouvelle requête/opération. Les erreurs métier
`STALE_CURRENT_RAF`, `STALE_PROJECT_MEMBERSHIP` ou `STALE_PROJECT_SOURCE` proposées
restent des résultats Application de prepare ; ne pas les transformer en
PersistenceError CONFLICT et déclencher recovery pour un simple conflit RAM.
Aucun incrément synthétique local pour remplacer un commit/reload. History revision
ne sert pas de version RAF mais reste dans le token complet existant.

## 6. Compatibilité et conversion non destructive

### Décision proposée : versionner explicitement la sémantique

Élargir silencieusement V5/V6/V7 permettrait de produire des fichiers que les
anciens lecteurs refusent tout en portant les mêmes versions. Proposer :

- nouvelle enveloppe portable **V8**, shapes fermées et timestamps canoniques ;
- nouveau **inputsSchemaVersion 2**, mêmes données métier + discriminant racine
  `rafModelVersion: 2` sur le payload `{planning, portfolio, rafModelVersion}` ;
- captures nouvelles inputs schema 2, forecast schema **2 conservé**, engine `/2`
  conservé (aucun algorithme moteur changé) ; les captures schema 1 et forecast
  1/2 restent inchangées, ensemble mixte possible dans V8 ;
- Actuals gardent la structure V5 sans champ de version RAF indépendant ;
- Current nouveau payload porte le même discriminant. Absence = ancien contrat
  V5 à valider selon règles anciennes ; valeur inconnue = refus explicite.

IndexedDB : **aucune modification de format physique**, stores, clés, indices,
DB schema 2 ni control.storageDataVersion 1. Le JSON opaque de Current et des
captures évolue à sa frontière codec ; les métadonnées existantes acceptent
inputsSchemaVersion 1 ou 2 dans leur champ déjà présent. C'est une évolution
logique de validation, à ne pas présenter comme une migration physique.
Un ancien binaire échoue sur le discriminant inconnu plutôt que d'écrire une
fausse égalité ; il ne doit pas être réutilisé pour éditer le nouveau dépôt.

### Matrice ancien format / nouveau Domain

| Entrée | Validation/conversion dans nouveau logiciel | Sortie et garanties |
| --- | --- | --- |
| V1–V3 valide | Readers/defaults/repairs actuels conservés, aucun Actuals inventé | Current séparé en RAM ; nouvel export V8 ; aucun premier V5 implicite |
| V4 valide, latest-actuals ou current-configuration | Valider ancien contrat/provenance avant conversion ; records exacts conservés | RAF initial = requirements importés ; A peut ensuite diverger ; legacy pending inchangé |
| V5 valide | Ancien contrat dont égalité et borne knowledgeDate≤UTC exportedAt ; histories exacts | Conversion sémantique RAM déterministe, mêmes valeurs/IDs ; V8 après action explicite |
| V6 valide | Inputs anciens + forecast schema 1 ; sources/préfixes/totaux validés sans moteur | Captures schema 1 identiques, absence de dailyProfile conservée |
| V7 valide | Inputs anciens + forecast schema 1/2 ; aucune relation clocks ajoutée | Captures identiques, profils et engineVersion historiques conservés |
| Ancien payload Current sans discriminant | Validation V5 stricte ancienne, sans borne exportedAt inexistante | Aucun rewrite au startup ; prochain changement accepté écrit Current schema 2 sous CAS |
| V8 / Current schema 2 | Nouveau Domain : divergence RAF permise, membership et tous autres invariants obligatoires | Round-trip exact divergence + histories + legacy ; aucune repair silencieuse |
| Capture inputs schema 1 dans V8 | Hydratation exacte puis ancien contrat numérique, même si Current propriétaire diverge | Référence résolue au préfixe historique ; RAF de la capture, jamais RAF du propriétaire actuel |
| Capture inputs schema 2 dans V8 | Hydratation exacte puis nouveau contrat ; RAF capturé peut diverger du RAF sélectionné Actuals | Totaux RAF/EAC calculés sur requirements capturés ; références/IDs toujours protégés |
| V5/V6/V7 divergent ou schema inconnu | Refus selon version déclarée ; ne pas deviner une migration depuis un fichier ancien invalide | Source conservée, import atomiquement refusé |
| Downgrade V8→V5/V6/V7 | Encodeurs anciens gardés, ajout d'un contrôle de représentabilité numérique + garanties historiques existantes | Refuser divergence/schemas 2 nouveaux, jamais réaligner ou perdre captures pour exporter |

Conversion ancienne→nouvelle : valider d'abord selon le contrat ancien, puis
projeter sans changement des valeurs dans le Domain séparé. Aucun alignement
numérique durant conversion. Le validateur d'égalité ancien doit rester partagé
et testable (V5/V6/V7 et inputs schema 1), sans remettre ce verrou dans le Domain
courant. Les métadonnées provenance legacy sont conservées et validées ; elles
ne redeviennent pas une autorité d'estimation.

Le strict round-trip compare à l'encodeur du **schéma d'entrée**, pas toujours
à l'encodeur moderne par défaut. Sinon ajouter le discriminant casserait toute
lecture ancienne. Distinguer API version d'enveloppe, version de payload et
options historiques ; pas un booléen ambigu « relax RAF » propagé partout.

### Chemins à traiter ensemble

Reader principal V8 délègue V1–V7 aux readers anciens. `portableBackupParts`,
staging/reprise, export repository, backup/import UI et worker doivent dispatch
les versions explicitement ; remplacer les constructions V7 hardcodées, pas
uniquement l'export de la carte. ReadCurrent/writeCurrent, validation capture,
métadonnées, jobs et read-back utilisent les mêmes codecs versionnés.

Imports : validation complète privée, projection Current, toutes captures,
read-back/indexes puis activation atomique inchangés. Un import ancien valide
peut être encodé en Current schema 2 lors de l'activation autorisée, sans convertir
les captures. Legacy localStorage et archives source/fingerprint jamais réécrits.
Startup ancien : lire et normaliser en RAM seulement. No-op RAF après startup ne
force pas la conversion persistée. Save peut ajouter une capture schema 2 à côté
d'un Current ancien encore physiquement intact : résolution accepte les deux
payloads, et les histories sont identiques. Delete ne réécrit pas Current.

Prefixes owned : conserver snapshots à l'identique et contrôle append-only,
records et **autorités legacy** inchangés. Comparer à une représentation canonique
neutre du schéma pour les données protégées, sans inclure le discriminant Current
comme mutation d'histoire. Ne pas recalculer digest/metadata des captures anciennes.
Validation systématique sur chaque lecture 11D.0 maintenue, aucune certification
ou bypass par version connue. Une erreur de capture refuse le document entier.

### Contrat permettant le replay futur, sans service de replay

Hydratation reçoit explicitement le schéma de la capture, garde ses requirements
RAF/caps/membership/capacités/planning et résout kind/objectId/snapshotId exact
vers le préfixe conservé. Elle ne remplace jamais requirements par `source.raf`,
ni source par latest, ni RAF capturé par Current. Source none/legacy reste exclusive.
Après validation versionnée, l'adaptateur pourra fournir au moteur courant RAF
capturé + reconstruction sélectionnée + borne 11C + inputs complets. Cela rend
rejouable un RAF divergent sans modifier le moteur. Référence absente = erreur,
pas reconstruction depuis dailyProfile. Résultat sauvegardé et futur résultat
dérivé restent distincts. Aucun moteur appelé à import/History pour ce lot.

## 7. Cas limites : effets précis

Convention : « 1/1 » = une projection privée et un writeCurrent effectif, suivis
d'un publish confirmé. « 0/0 » = ni projection ni persistence. History Portfolio
n'est jamais modifiée par A/B ; Save demeure séparé et dirty-guarded.

| Cas | Modèle et snapshots | Projection / persistance |
| --- | --- | --- |
| 1. Sans Actuals, premier RAF courant | create-project fixe requirements sans snapshot ; A révise un membre existant, aucun V5 | Création/A effectif 1/1 ; T=null, earliest/horizon applicables |
| 2. Première connaissance Actuals | B initial, couverture zéro ou positive explicitement confirmée, RAF courant comme base puis RAF confirmé ; exactement v1 | 1/1, alignement atomique, T=through |
| 3. Ancien RAF-only | Snapshot/ID/version restent valides ; A ne crée ni v+1 ni couverture ; prochaine connaissance couverte via B | A effectif 1/1, T=null si source sans couverture ; historiques inchangés |
| 4. Révision après Actuals | Requirements seuls changent, divergence valide avec snapshot courant | 1/1 ; T et reconstruction identiques ; nouveau RAF utilisé après T |
| 5. Nouvelle connaissance après plusieurs A | Base = dernier RAF publié, jamais RAF du dernier snapshot ; Application retient B, confirmations R1 conditionnelles | Un seul snapshot en plus et 1/1 ; aucun historique des A inventé |
| 6. Rectification/érosion après A | B reprend RAF courant ; consommation seule à périodes identiques confirme RAF des seules Teams affectées ; couverture/partition modifiée confirme tous ; preuves/IDs préservés | 1/1, equality nouveau snapshot/requirements ; nouvelle T ou null, aucun maximum historique |
| 7. RAF courant zéro | Requirement membre conservé ; ancienne valeur historique reste ; zéro ne vaut pas retrait ni absence de couverture | A effectif 1/1, aucun Forecast de cette Team ; actualOccupation/T conservés |
| 8. Team ajoutée | Avant source dépendante : update-project membership/RAF initial explicite, pas V5 ; après V5 ou legacy dépendant : handoff B, cellules toutes explicites | 1/1 ; B un snapshot et égalité ; source none ne devient pas V5 par ajout autonome |
| 9. Retrait consommés tous zéro | Après V5 : B membership + marqueur + confirmation RAF courant/ancien, requirement absent ; nonzero refusé | Succès 1/1 et un snapshot ; refus 0/0 ; Team historique non supprimable |
| 10. Réintroduction | B après V5, valeurs/RAF explicites, retired marker courant retiré ; aucune ancienne quantité restaurée | 1/1 et un snapshot, préfixe inchangé |
| 11. Legacy V4 pending | A change RAF requirement, records/autorités conservés, pas premier V5 ; handoff dépendant impose reconcile explicite | A 1/1, source/T V4 inchangés ; invalidité legacy refuse 0/0 |
| 12. V4 réconcilié, V5 conservé | A diverge de V5 ; B prend ce RAF courant, V4 reste preuve ; pas de cumul double | 1/1, borne/reconstruction V5 seulement |
| 13. Project inactif | A/B permis avec validations identiques ; snapshots/RAF enregistrés, position priorité conservée | 1/1 ; aucune allocation Forecast ni progress actif ; Actuals contribue toujours à occupation |
| 14. Plusieurs cartes dirty | Bases séparées ; succès nettoie cible seule ; autres rebase/stale ; Save bloqué tant que dirty | Une opération effectue 1/1 ; saisie/autres cartes 0/0 ; failure garde toutes les branches |
| 15. Validation identique publié | R2 no-op après contrôle bases, y compris texte équivalent et RAF historique divergent ; confirmations seules inertes ; base stale refusée | 0/0, mêmes state/projection/token/history/IDs ; aucun passage implicite à V5/schema 2 |

Cas additionnel Update Actuals : connaissance strictement inchangée + RAF modifié
→ Application choisit A, requirements seuls, zéro nouveau snapshot, 1/1. Une
consommation modifiée avec RAF numérique inchangé mais confirmé selon R1 → B,
un snapshot et 1/1 ; aucune confirmation supplémentaire de Team non concernée
à partition identique, sauf membership. La table R2 s'applique aussi aux Projects
inactifs et aux anciens RAF-only, sans changement des invariants de projection.

Une réaffirmation du seul RAF historique différent est une intention A explicite,
jamais un effet secondaire de Cancel, import, érosion ou ouverture de modale.
Un Project doit toujours avoir au moins un requirement, même tous RAF zéro.
Retirer le dernier membre reste invalide ; ne pas contourner EMPTY_PROJECT_REQUIREMENTS.

## 8. Fichiers à modifier lors de la future implémentation

Inventaire prévisionnel, pas autorisation actuelle. Les tests restent près des modules.

| Zone | Modifications futures précises |
| --- | --- |
| Domain `model/entities.ts`, `actuals/requirements.ts`, `actuals/transition.ts`, `domain/index.ts` | Lever verrous numériques courants, isoler contrôles legacy, contexte retrait RAF courant, comparateur connaissance, contrat publication nouvelle ; exports minimaux |
| Domain `actuals/snapshots.ts` | Contrats historiques conservés ; seulement ajustement documentaire/type si indispensable, pas nouveau champ RAF |
| Application `session/planningSession.ts`, `application/index.ts` | Commande A, bases A/B obligatoires, patch requirements, contrôle direct, sélection R2 privée A/B/no-op indépendante UI, preuves R1, alignement postcondition ; update-project préserve RAF untouched |
| Application `session/projectEditViewModel.ts`, `snapshotActualsViewModel.ts` | RAF courant et base exacte explicites ; supprimer routage gouverné par latest-actuals |
| UI `actuals/snapshotActualsDraftStore.ts`, `parseSnapshotActualsCommand.ts`, `createSnapshotActualsCardController.ts`, `actualsForecastConflict.ts` | Base immutable RAM, rebase RAF sans version nouvelle, preuves R1, quick A, candidat modal vers routage Application R2 ; pas refonte visuelle |
| UI `project-edit/projectDraftStore.ts`, `parseProjectEditCommand.ts`, `createProjectEditController.ts`, `timeline/createTimelineUiCoordinator.ts` | Base/patch RAF, champs untouched préservés, sync owners, séquencement et handoff ; création garde RAF initial explicite |
| Backup `planningInputCodec.ts`, `flowplanBackupV6.ts`, `flowplanBackupV7.ts`, nouveau `flowplanBackupV8.ts`, `flowplanBackupV1.ts`, `portableBackupParts.ts`, `planningBackupDataset.ts` | Dispatch de schéma/version, ancienne validation numérique, encodeur moderne, downgrade guards, strict round-trip schéma adapté |
| Domain `portfolioSnapshots/portfolioSnapshot.ts` et Application `capturePortfolioSnapshot.ts` | Inputs 1/2, hydrate versionné, sources exactes ; forecast schémas/totaux/moteur inchangés |
| Application `persistence/planningRepository.ts`, `createPlanningRepository.ts`, `repositoryTransfer.ts`, `validateStoredSnapshot.ts`, `repositoryStorage.ts`, `historicalIdentities.ts` | Types inputs/metadata 1/2 ; validation commune, export/stage V8 ; vérifier identity extraction et préfixes sans changement de stores |
| Main `createPersistentPlanningApplication.ts`, `planning/planningBackupOperations.ts`, `buildPlanningSessionProjection.ts`, `createRepositoryPlanningDispatcher.ts` | Wiring codec/exports, mêmes transactions ; projecteur/dispatcher à caractériser, modifier seulement si type nouveau le nécessite |
| Infrastructure `planningStorageWorker.ts`, `snapshotValidationWorker.ts`, backup `localPlanningBackup.ts` | Dispatch des nouveaux codecs hors transaction ; anciennes données/recovery toujours lisibles |
| Infrastructure `indexedDbRepositoryStorage.ts`, `memoryRepositoryStorage.ts` | Vérification native/memory et types éventuels seulement ; aucun changement de schema/stores/keys/CAS |
| Documentation future | Amendements ciblés canons durable/courant/10C.1 et trajectoire, plan UX 11D.1 : décrire résultat après audit, sans réécrire historique |

Tests touchés : Domain entities/snapshots ; session projectCrud/lot10c1 ; UI
Actuals/Project/coordinator multidraft ; backup V4/V5 et Portfolio/dailyProfiles ;
repository/transfer/validateStoredSnapshot ; Main projection/transactions/11C ;
History VM/reader ; browser storage existant. Les fixtures synchrones ne remplacent
pas la preuve async/native. Aucun CSS, dépendance ou nouveau script nécessaire.

## 9. Séquencement détaillé après audit et autorisation

| Étape | Travail et dépendances | Gate pour poursuivre |
| --- | --- | --- |
| P0 — contrat audité | Intégrer décisions acquises R1/R2 ; auditer versionnement et payloads ; identifier assertions anciennes ; caractériser baseline sans production | Audit ChatGPT favorable et autorisation explicite ; aucun développement avant |
| P1 — compatibilité en premier | Isoler validation numérique ancienne, codec inputs 1/2 et V8, strict round-trip par schéma, downgrade ; lire tous les anciens fixtures | Anciennes données inchangées, anciennes divergences toujours rejetées ; nouveau discriminant inconnu refuse proprement |
| P2 — Domain séparé | Lever les deux verrous numériques, garder membership/provenance/IDs ; contexte RAF courant retrait et comparateur connaissance | Factories acceptent divergence cible, refusent violations restantes ; anciens snapshots raf-only toujours valides |
| P3 — commandes A/B | Base métier obligatoire et prepare ; A patch, sélection Application R2, B new knowledge/égalité, confirmations R1, première connaissance, handoff | Quatre branches R2 sans UI, preuves R1, stale avant routage ; au maximum un candidat/projection/CAS, aucun état intermédiaire |
| P4 — repository/captures | Current opaque schema 2, sources/prefixes schema 1/2, metadata, worker/import/export ; CAS/receipts/recovery conservés | Round-trip mixte, import invalide atomique, 11D.0 rollback/recovery ; aucun rewrite History/format physique |
| P5 — wiring et drafts minimaux | quick RAF→A, modale→validation Application R2, base RAF réelle, trois voies, preuves/review, update-project untouched | Deux A, A→B, B→B, membership, multidrafts et onglet ; saisie zéro moteur/write, aucune refonte de carte |
| P6 — intégration et documentation | Validation complète, storage navigateur isolé, ancienne History et 11C, examen final de portée ; canons ciblés futurs | Tous critères §10 ; livraison IN REVIEW pour audit, jamais auto-DONE ; aucun replay/11D.2/11D.3 |

P1–P4 peuvent être préparés successivement mais leur activation en production
est indivisible : ne pas publier une commande A avant que persistance, export,
lecture de captures et UI soient compatibles. Chaque étape garde tests ciblés ;
un seul ensemble cohérent livrable si commits intermédiaires non déployables.
Pas de replay ni capture inputs-only cachés dans P4. Mesurer le coût de comparaison
sur histories existantes sans ajouter de scan History à chaque A.

## 10. Matrice de tests et critères d'acceptation

Toutes les assertions sont futures. Équivalence = rationnel réduit exact ;
compteurs projection/write/snapshot vérifiés, pas seulement résultat visuel.

| ID / couche | Scénarios | Oracle précis / suites principales |
| --- | --- | --- |
| D1 Domain | RAF V5 courant divergent positif, zéro, fractions ; legacy latest-actuals divergent | createPortfolio/transition acceptent valeurs valides ; unknown/duplicate/négatif/provenance invalide refusés ; `entities.test.ts`, `snapshots.test.ts` |
| D2 Domain | RAF snapshot historique après A et B | Préfixe profondément identique, IDs/dates/quantités gelés ; ancien raf-only et sans coverage valides, pas renumérotation |
| D3 Domain | Membership non conforme, Team historiquement référencée supprimée, dernier requirement retiré | Refus membership/unknown historical/empty ; aucune tolérance due à divergence RAF |
| D4 Domain | Retrait zéro consommé : historique RAF0/courant>0 et historique>0/courant0 ; nonzero ; réintroduction | Union confirmations, retired markers ; nonzero refusé ; nouvelles cellules/RAF zéro explicitement validés ; aucune restauration ancienne |
| D5 Domain | Extension/rectification/split/merge/érosion/totale après révision RAF | Intent, hors-zone, identités, exact zero propagation, coverage≤knowledgeDate préservés ; contexte courant pour confirmations |
| A1 Application | A avant/après Actuals, legacy, inactive, multi-Team | Requirements ciblés seuls changent, histories/legacy/source/caps inchangés ; aucun snapshot, une projection/write effectifs ; session + dispatcher |
| A2 Application | A target équivalent (`2/6` vs `1/3`), zéro, gros rationnels ; base stale même target=current | No-op exact même state/projection/token, zéro clock/write ; stale refus avant projection ; pas premier V5 |
| A3 Application | Nouvelle connaissance après plusieurs A ; RAF courant divergent du dernier historique ; extension/rectification/érosion | B reprend les RAF courants explicitement validés selon R1, sans restauration historique ; exactement une version, requirements égaux nouveau snapshot, 1 projection/1 write |
| A4 Application | Update Actuals strictement inchangés ; RAF modifié ou inchangé, historique divergent ou non | R2 choisit A si RAF modifié : zéro snapshot, 1 projection/1 write ; sinon no-op complet ; bases vérifiées avant routage, aucune restauration implicite |
| A5 Application | Premier V5 natif/reconcile explicite, RAF seul initial, membership source none/V5/legacy | Première couverture validée crée v1 ; simple RAF ne crée pas v1 et ne réconcilie pas ; handoff contrôlé |
| A6 Application | update-project ancien draft untouched RAF ; révision cachée ; caps/date/name changé | RAF publié préservé pour untouched ; révision cachée refuse ; membre ajouté RAF explicite ; pas écrasement par whole-object |
| R1a Domain/Application | Consommation Team A modifiée, périodes identiques, RAF numérique inchangé ; Team B inchangée | B et confirmation RAF A uniquement, sauf membership ; manque de preuve A refuse ; absence de confirmation B n'empêche pas publication ; preuves consommées conservées |
| R1b Domain/Application | Bornes from/through, couverture ou partition split/merge modifiées ; through éventuellement identique | Confirmation de tous les RAF participants, même valeurs inchangées ; absence de toute preuve requise refuse sans mutation |
| R1c Domain/Application | RAF numérique modifié, membership ajout/retrait/réintroduction, confirmations après concurrence | Union obligations R1/membership ; formatage ne confirme pas ; preuve fondée sur ancienne base invalidée et revue nécessaire |
| R2a Application sans UI | Quatre couples Actuals/RAF identiques ou différents ; consommation seule compte comme Actuals | Respectivement no-op, A, B, B ; snapshots 0/0/1/1, projections et commits 0/1/1/1 ; aucun enchaînement A→B |
| R2b Application sans UI | RAF texte `2/6` vs `1/3`, consommés équivalents, confirmations seules ; bases RAF/Actuals/membership périmées avec target apparent identique | No-op complet seulement bases valides ; équivalence exacte sans faux changement ; stale avant sélection, zéro projection/commit |
| C1 Drafts | Deux A même Team contradictoires, disjoints, mêmes valeurs équivalentes | Conflit ciblé ou merge sûr, convergence no-op après revue ; textes/bases préservés, pas compteur persistant |
| C2 Drafts/Application | Révision RAF concurrente pendant Update Actuals, baseVersion identique ; nouvelle Actuals puis A ; deux Actuals | Stale/review avant routage R2 même no-op apparent, preuves dépendantes invalidées ; contrôle direct Application sans UI ; textes/consommés/branches conservés, aucune perte de draft |
| C3 Drafts | Changement membership/RAF, ajout/retrait Team, modale ouverte, rafConfirmed auparavant | Stale structurel ; review explicite et preuves invalidées ; Team dirty retirée jamais ignorée |
| C4 UI intégration | Plusieurs cartes dirty, carte différente appliquée, RAF carte et branche modal, Cancel/Escape/remount/History suspend | Nettoyage cible seul, branche restaurée exactement, dirty/Save cohérents ; pas recalcul durant saisie/tab/collapse/review ; coordinator multidraft |
| T1 Main/repository | Validation invalide, projection qui lève, encode/refus avant commit | Même state/projection/token, aucune write ; drafts présents ; dispatcher async/transactions |
| T2 Repository natif | Deux connexions/onglets, CAS perdu après projection privée, notification absente | Aucun publish local, recovery stale ; commit gagnant conservé, token complet contrôlé ; browser storage |
| T3 Main/natif | Abort prouvé/quota puis retry, ack perdu après commit, notification error, publish échoue après commit | not-applied utilisable ; unknown/committed-unreconciled bloque Current/Save/Delete/import ; receipt/opId stable, aucune double version ; reload explicite |
| K1 Compatibilité | Fixtures V1–V7, V4 intermittence/future/provenance, V5 exportedAt, anciens invalides RAF | Même acceptation/rejet ancien ; conversion exacte sans snapshot fabriqué ni mutation source ; backup tests et portable parts |
| K2 Compatibilité | V8 divergent, V4 pending/réconcilié, anciens raf-only, zéro/fractions longues | encode/decode profondément égal ; strict par schéma, unknown/fields en trop refusés ; downgrade refuse perte |
| K3 Portfolio | Anciennes captures inputs1 forecast1/2 `/1` overlap et `/2`, nouvelles inputs2 divergentes, collection mixte | Anciennes captures/metadata/digests inchangés, pas enrichissement/replay ; totaux sur RAF capturé, pas snapshot.raf ; Portfolio/dailyProfiles/History tests |
| K4 Références | Capture référence ancien snapshot après A et B, membership ultérieur, owner absent/prefix modifié | Résolution ID/préfixe exacts ; broken references/refus immutable owned ; identité historique réservée ; validateStoredSnapshot/repository |
| K5 Repository/import | Startup ancien sans rewrite, no-op A ancien, staged V8/ancien/invalid middle, export/reimport | Zéro conversion persistée startup/no-op ; activation entière seulement après preflight, source/raw/fingerprint préservés |
| K6 Repository/import/export — bloquant | Current ancien sans discriminant + nouvelles captures inputs2 ; Current nouveau inputs2 + anciennes captures inputs1 forecast1/2 ; collections mixtes | ReadCurrent/readSnapshot/validation worker/export V8/import staged/read-back/activation/reopen réussissent ; RAF et sources exacts, préfixes/IDs/profils/digests anciens conservés ; Save History seul ne réécrit pas Current ancien, A ne réécrit pas captures anciennes ; aucune normalisation destructive ni replay |
| F1 11C moteur/intégration | RAF indépendant après covered-zero, borne fin horizon/9999, earliest avant/après T, Mandatory, érosion totale/partielle | Pour chaque allocation positive de toutes Teams date>T ; aucune borne modifiée par A ; aucun Forecast historique corrigé ; `lot11cTemporalSeparation.test.ts` et moteur existants |
| F2 Projection/metrics | Inactive, RAF0, horizon bloqué, grande fraction, reconstruction actuelle après A | Actuals/occupation identiques ; RAF/EAC/progress nouveau run exact ; Forecast jamais réduit de nouveau par consommé |
| S1 Storage/portée | A/B avec nombreuses captures ; simple saisie ; Save/Delete | Aucun read/write payload History pour Current ; History revision/content inchangés ; Save/Delete zéro moteur et pas rewrite Current ; gates 11D.0 |

### Adaptation des tests de l'ancienne égalité permanente

Ne supprimer, désactiver ou skipper aucun test. Identifier les assertions de
`ACTUALS_RAF_IMMUTABLE`/`ACTUALS_RAF_MISMATCH` dans Domain/session et les attentes
UI quick `raf-only`/`initial`. Transformer leur scénario en preuve positive du
nouveau contrat (divergence valide, aucun snapshot) **et** conserver leur contrôle
négatif d'intégrité dans les tests de codecs anciens. Garder leurs checks de
membership, caps, horloge, preuves, état/projection/drafts et atomicité.

Les tests Domain historiques de `replaceProjectSnapshot` raf-only restent des
preuves de validité historique ; ajouter les interdictions de production A/B
sans les supprimer. Les fixtures V5/V6/V7 ne sont pas modernisées pour masquer
une régression ; ajouter des fixtures V8 distinctes. Les assertions de projection
Forecast 11C, legacy read-only, owned-prefix, CAS/recovery et Save dirty restent.
Adapter les compteurs de versions seulement pour **les révisions RAF seules** ;
B effectif conserve l'attente d'une version. Garder preuves avant/après de toute
adaptation dans le compte rendu futur.

### Gates et acceptation

Après autorisation : `npm run typecheck`, `npm test`, `npm run build`,
`npm run test:storage`, `npm run test:portable`, `git diff --check` ; scénarios
navigateur natifs avec deux connexions et UI dans origine/profil isolés. Aucun
nouveau framework/script/dépendance. Tests failures/recovery avec interleavings
contrôlés, pas uniquement fixture synchrone. Consigner tests nouveaux et total
sans double compter les suites ciblées. N'annoncer aucun gate ici comme exécuté.

Acceptation bloquante : D1–S1 passants ; RAF unique requirements, snapshots anciens
inchangés, égalité post-publication B, divergence A valide ; A/saisie sans snapshot,
R1 conditionnel et quatre branches R2 prouvées sans UI ; B une seule version si
connaissance change, consommation seule comprise ; chaque validation au maximum
une mutation/projection/commit CAS ; no-op zéro travail après contrôle bases ;
aucun ancien RAF recopié ; bases/RAM/CAS distincts ; failures/recovery 11D.0 inchangés ; toute
donnée ancienne valide acceptée sans réécriture destructive ; nouveaux formats
explicites ; K6 mixte Current/captures bloquant en repository/import/export ;
identités/sources exactes ; Forecast strictement après couverture.
Le diff futur ne contient ni replay ni formats inputs-only ni travail UX hors
wiring nécessaire. Livraison pour audit d'implémentation, pas fermeture autonome.

## 11. Risques résiduels et arbitrages pour l'audit

| Risque / décision proposée à auditer | Réponse et limite |
| --- | --- |
| Confirmation RAF trop large ou manquante | Décision R1 acquise : couverture/partition → tous ; consommation seule → Teams affectées ; union RAF numérique/membership, aucune confirmation automatique par formatage |
| Routage lié à la modale plutôt qu'au métier | Décision R2 acquise : Application contrôle bases puis compare exactement et choisit no-op/A/B ; quatre branches testées sans UI, une seule transaction effective |
| Première connaissance native/reconcile couverte | Proposition de commande : RAF seul reste A ; les données historiques sans couverture et érosions totales restent valides ; auditer cette restriction des nouveaux appels |
| V8 + inputs2 + discriminant Current | Choix recommandé pour rupture sémantique ; accepter en audit la portée logique codecs/worker/metadata tout en gardant physique IDB inchangé |
| Ancien logiciel sur dépôt nouveau | Discriminant ferme bloque lecture/édition ; ancien raw localStorage reste disponible et conflit legacy conservé ; ne pas promettre compatibilité d'écriture descendante |
| Comparateur ancien dupliquant Domain | Isoler uniquement contraintes numériques anciennes, partager tous autres validateurs ; fixtures ancien/nouveau empêchent drift de règles |
| Base reconstruite après rebase | Stocker vraie base immutable RAM ; ne pas dériver du dernier modèle/préfixe ; coût O(nombre Teams et cellules draft), pas scan Portfolio History |
| Atomicité de RAF + tous champs Forecast dirty | Garder séquencement/garde existants et handoff minimal ; commande composite globale reportée, aucune double publication dans un Apply |
| RAF courant divergent sans journal propre | Pas d'audit individuel des A ajouté ; Portfolio Save explicite capture l'état appliqué ; historique autonome RAF serait autre périmètre |
| Coût Current réécrit avec histories | Déjà 11D.0, A évite croissance Actuals mais ne résout pas volume Current ; externalisation/optimisations restent exclues |
| Commit incertain et perte drafts après reload confirmé | Limite 11D.0 conservée, pas nouveau système persistant de drafts |
| Replay futur de captures complètes | Contrats préparés seulement ; pas preuve de rejouabilité de toutes données utilisateur, pas inventaire de leur IndexedDB |

Aucun arbitrage supplémentaire n'est nécessaire pour l'autorité requirements,
l'immuabilité historique, l'alignement atomique de B ou la conservation des raf-only :
ils sont fixés par le mandat, comme les décisions R1/R2 de ce durcissement. Les
autres choix ci-dessus restent concrets et soumis à audit,
sans démarrer l'implémentation. Hors périmètre : tableau compact, nouveau rendu
numérique, refonte modale, service replay, inputs-only, cache History, optimisations
IndexedDB et lots 11D.2/11D.3.

## 12. Livraison documentaire et arrêt

Avant commit : deux paths autorisés seulement, diff/stat et `git diff --check`,
absence de code/tests/scripts/dépendances ; 11D.0 DONE et 11D.1 NOT STARTED.
Commit documentaire puis push normal sur la branche attendue ; arbre propre,
fetch et divergence finale 0/0. SHA final dans le compte rendu Git, sans
auto-référence dans le document. Arrêt après commit/push.

**Prochaine étape : audit indépendant ChatGPT de ce plan. Aucune implémentation
commencée, aucun statut READY FOR IMPLEMENTATION.**
