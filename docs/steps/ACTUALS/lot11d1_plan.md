# Lot 11D.1 — UX Actuals & RAF

**Statut : 11D.1 UX — IN REVIEW.**
Audit indépendant favorable avec trois réserves mineures, intégrées ci-dessous
le 2026-10-09. Autorisation utilisateur : amendement committé/poussé avant A → E,
implémentation et validations complètes, livraison **IN REVIEW** sans clôture.
**11D.0 DONE ; 11D.1 RAF Model DONE**, corrections V1/V2/R1 normatives.
A → E implémentées et validées : [livraison pour audit](./lot11d1_ux_review.md).
Aucune clôture DONE ; arrêt pour audit indépendant ChatGPT.

## 1. Baseline Git vérifiée

Avant toute modification : `git fetch origin` réussi, puis vérification de la
branche, du HEAD, de `git status --short` et de la divergence.

| Contrôle | Résultat |
| --- | --- |
| Dépôt | `/Users/Kartaguez/FlowPlan2`, `kartaguez/FlowPlan2` |
| Branche active/cible | `codex/lot11a-portfolio-snapshots` |
| HEAD attendu et réel | `075b2a6c18175eabdcbdb401556a81591f32635f` |
| Status initial | Vide, arbre propre |
| Origin après fetch | Même SHA ; avance/retard `0/0` |
| Écart baseline | Aucun |
| Instructions locales | Aucun `AGENTS.md` trouvé dans le dépôt |

La baseline de clôture 11D.0 `8d95f7406ff40a6d2d041b41784a3915173989c8`
est une référence historique distincte. Aucun reset, écrasement ou force-push.
Le SHA de livraison documentaire sera fourni après commit, sans auto-référence.

## 2. Sources consultées et priorité

- [Canon durable](../../canon.md), [canon courant](../../current_canon.md),
  [roadmap](../../current_plan.md) et version antérieure du présent plan.
- [RAF Model : plan audité](./lot11d1_raf_model_plan.md) et
  [livraison/clôture avec corrections finales V1/V2/R1](./lot11d1_raf_model_canon.md).
- [10C.1 canon](./lot10c1_canon.md), [10C.2 plan et réalisation](./lot10c2_plan.md).
  Il n'existe pas de canon séparé 10C.2 : réalisation et canon courant documentent
  sa clôture. Les anciennes règles de RAF sont historiques, supersédées par 11D.1.
- [11C canon](../HISTORY/lot11c_canon.md) et
  [11D.0 canon, corrections et clôture](../STORAGE/lot11d0_canon.md).

**EXISTANT prioritaire** : RAF Model livré, y compris ses corrections finales,
prime sur les hypothèses antérieures UX et les mentions historiques IN REVIEW.
Production : repository asynchrone, IndexedDB/CAS, V8, Current RAF model2,
captures inputs1/inputs2 mixtes, moteur `/2`. Les résultats de clôture (1009
Node + 3 portable, 22 + 11 scénarios natifs) sont des preuves historiques ;
aucune suite d'implémentation n'est exécutée dans cette mission documentaire.
Les seules mesures nouvelles sont les sondes numériques du §5, sans build.

**À MODIFIER** : présentation et interactions Actuals/RAF dans les chemins
existants. **À AJOUTER** : rendu exact ciblé, labels/provenance et tests UX.
**HORS PÉRIMÈTRE** : nouveau modèle/transaction, Domain, moteur, stockage,
formats, replay, inputs-only, 11D.2/11D.3. Ne pas copier une architecture FlowPlan1.

## 3. Cartographie réelle et portée future

Fichiers inspectés en lecture seule, appels et tests voisins confrontés aux
canons. Les noms existants `forecastRaf` et `rafAuthority` ne changent pas
l'autorité : le premier contient le RAF des requirements ; le second garde
une provenance historique, jamais un verrou courant ni un choix de routage.

| Fichiers réels | EXISTANT à conserver | À MODIFIER / À AJOUTER après autorisation |
| --- | --- | --- |
| `src/domain/model/rational.ts`, `scalars.ts` | BigInt réduit, parse exact, rendu fini sans précision et erreur `DECIMAL_PRECISION_REQUIRED` | Aucun changement Domain |
| `src/application/session/editableQuantity.ts` | Parse point/fraction exact ; rendu historique à 3 chiffres ; pourcentages partagés | Helper exact ciblé Actuals/RAF et acceptation virgule à la frontière Application ; caractériser tous les consommateurs si parse partagé adapté |
| `src/application/session/projectEditViewModel.ts`, `snapshotActualsViewModel.ts` | `remainingWorkloadExact`, `currentRafEditable`, `forecastRaf` issu requirements, `currentBase`, snapshots typés | Rendu RAF exact ; agrégation compacte dérivée seulement si utile pour tests, aucune autorité nouvelle |
| `src/application/session/projectCurrentRaf.ts`, `planningSession.ts` | Base RAM immutable ; A patch ciblé ; B base complète, identités puis R2 ; R1 ; no-op exact | Références/test oracles seulement, contrats hors modification |
| `src/ui/actuals/snapshotActualsDraftStore.ts` | Owners RAM par objet, `baseModel` distinct du modèle récent, branche modale, rebase/review exact, preuves sélectives | Initialisation lisible exacte sans réécriture d'un draft ; adapter comparaisons à la virgule, conserver toute base/provenance |
| `src/ui/actuals/parseSnapshotActualsCommand.ts` | Candidat whole-object/base/evidence ; restauration IDs par connaissance complète exacte après split/merge annulé | Parse ciblé/messages ; aucun choix A/B UI, aucune modification des obligations |
| `src/ui/actuals/createSnapshotActualsCardController.ts` | Cumuls exacts `addRationals`, quick A, modale R2, confirmations explicites, frise/history, focus/Escape | Bloc compact/période unique, rendu exact, distinction publié/draft/à confirmer, labels erreurs/review |
| `src/ui/project-edit/createProjectEditController.ts`, `projectDraftStore.ts`, `parseProjectEditCommand.ts` | Membership, caps exacts cachés, intention RAF untouched explicite, callbacks RAF courant | Supprimer le doublon pour les membres édités dans le tableau ; collecter depuis store/modèle, pas depuis présence du champ DOM ; égalité RAF exacte |
| `src/ui/project-edit/createProjectCreateController.ts` | Création et RAF initial explicite, aucun snapshot | Parse/rendu exact du RAF ; aucun changement création/membership |
| `src/application/session/teamReservationsEditViewModel.ts`, `src/ui/reservation-edit/createReservationEditController.ts`, `reservationDraftStore.ts`, `parseReservationEditCommand.ts`, `createReservationCreateController.ts` | Allocations ratio/fixed-daily, unités et exact untouched | Non-régression des consommateurs partagés ; aucune colonne RAF, aucun déplacement allocations |
| `src/ui/timeline/createTimelineUiCoordinator.ts`, `src/ui/actuals/actualsForecastConflict.ts` | Quatre stores, dirty global, A, handoff B unique, gardes de séquencement, nettoyage après succès | Wiring du tableau unique, erreurs de concurrence parlant de RAF/Current même version Actuals ; ownership inchangé |
| `src/ui/portfolio/createPortfolioEditControls.ts`, `src/ui/renderApp.ts` | Formulaires réels, Apply/Cancel, alert/Delete | Hôte stable et placement local des actions ; pas de formulaire imbriqué |
| `src/ui/timeline/renderTimelineShellNavigation.ts`, `src/ui/portfolio/createTeamSubcard.ts` | Identités, tabs, expansion, activation, reorder ; toggle membership unique | Préserver ; ajuster uniquement si besoin DOM démontré |
| `public/styles.css` | Matrice modale à scroll interne, focus/media 420 px | Styles propres au tableau compact, dates/erreurs/quantités longues et responsive |
| `src/main/planning/createRepositoryPlanningDispatcher.ts`, `src/application/persistence/createPlanningRepository.ts`, `planningRepository.ts`, infrastructure IndexedDB/worker | Prepare → projection privée → CAS → publish ; receipts/recovery | Hors modification, espions et tests d'intégration existants |
| `src/application/backup/planningInputCodec.ts`, `flowplanBackupV1.ts`, `flowplanBackupV6.ts`, `flowplanBackupV7.ts`, `flowplanBackupV8.ts`, `portableBackupParts.ts` | Validation versionnée V1–V8, inputs1/2 ; vieux Current non réécrit | Hors modification, matrices compatibilité conservées |

Le shell crée un hôte de carte ; le coordinateur monte le formulaire Forecast
puis la section Actuals sœur. Les actions sont aujourd'hui avant Actuals.
La synthèse répète from/through par Team (Project 5 colonnes, Reservation 4).
Les `<details>` historiques sont déjà repliés. La modale vit sur `document.body`,
hors formulaire carte ; ses champs quantité sont `type=text`, ses dates sont
validées au blur, son workflow 2/3 étapes et son focus sont gérés localement.
Remount repart des stores ; suspend/resume conserve les owners/DOM Planning.
La future composition doit conserver ces garanties sans refonte globale.

## 4. Autorités, commandes et données publiées

### RAF courant et RAF historique

**EXISTANT** : `Project.requirements[].remainingWorkload` est l'unique RAF courant,
avant et après snapshot, legacy ou réconciliation, Project actif ou inactif.
Les RAF des snapshots restent historiques immuables. B effectif aligne
requirements et RAF du nouveau snapshot atomiquement ; cette égalité est une
postcondition de publication, pas un invariant permanent. Aucun consommé n'est
soustrait de nouveau au RAF. Aucun fallback vers `snapshot.raf` pour éditer Current.

```text
requirements → VM.forecastRaf + currentBase → draft carte RAM → tableau RAF
→ Apply carte → update-project-current-raf (A)
→ prepare → projection privée → writeCurrent CAS → commit confirmé → publish

snapshot courant → périodes/consommés publiés → branche modale + RAF requirements
→ parseSnapshotActualsCommand : replace-project-actuals (B, parcours de validation)
→ Application : bases + structure/identités + comparaison exacte → routage R2
→ au maximum un candidat/projection/write/publish
```

Une synthèse Consumed somme seulement les périodes du snapshot courant, jamais
les versions historiques. Un récapitulatif de branche additionne des valeurs
exactes valides ; incomplet/invalide rend le total incomplet, jamais zéro implicite.
La carte montre le consommé publié et le RAF draft clairement identifié ; la
modale distingue valeur publiée récente, vraie base d'ouverture, saisie locale
et preuve à renouveler. Afficher récent ne remplace jamais `baseModel`.

### R2 livré, à conserver sans adaptation métier

Bases source/version/ID, membership, RAF complet et paramètres transportés
validés **avant** routage, même si target semble identique. Les identités de
périodes restent validées avant no-op. Connaissance Actuals = participation,
retired markers, couverture/partition et consommés exacts ; RAF et IDs techniques
ne sont pas un changement de connaissance, mais restent validés séparément.

| Changement Actuals réel | Changement RAF courant réel | Résultat R2 |
| --- | --- | --- |
| Non | Non | Même state/projection/token ; zéro snapshot/projection/write |
| Non | Oui | A effectif, RAF requirements seuls ; zéro snapshot, 1 projection/1 write |
| Oui | Non | B effectif, 1 nouveau snapshot, 1 projection/1 write ; R1 requis |
| Oui | Oui | B effectif, 1 nouveau snapshot, 1 projection/1 write ; union R1 |

Le parser peut conserver un intent historique `raf-only` pour un candidat
inchangé : il ne décide pas de publier un snapshot. Application refuse cet
intent pour une connaissance réellement changée. Aucun dispatch A puis B,
nouvelle transaction ou nouvelle autorité RAF. Caps seuls suivent `update-project` ;
caps + RAF sans Actuals doivent être séquencés selon la garde existante.

A vérifie identité/source/membership et RAF ciblés contre sa base RAM ; préserve
caps, provenance, histories, source et champs non ciblés. Patch non vide, unique,
membres connus, valeurs exactes non négatives. B contrôle la base **complète**,
y compris RAF non ciblé, avant réduction éventuelle vers A. Une base périmée
n'est jamais blanchie par un target égal à Current.

Avant premier snapshot : création/ajout autonome fournit le RAF initial explicite
dans requirements, révision d'un membre publié suit A, sans V5 ni reconciliation.
La première connaissance native ou reconciliation explicite exige une couverture
validée, même entièrement zéro. Les anciens snapshots RAF-only restent valides,
référençables et non renumérotés ; A n'en ajoute pas. Érosion totale ultérieure
peut supprimer la couverture via B ; absence, uncovered et covered-zero restent distincts.

## 5. Contrat de saisie numérique exact

**Décisions utilisateur acquises** : entiers, point et virgule ; décimales finies
sans plafond de précision UX ; fractions exactes ; non négatif ; aucun séparateur
de milliers ; drafts incomplets ; aucune approximation ; contrats V1–V8 et inputs1/inputs2 inchangés.

### Normalisation et validation Application proposées

1. Stocker le texte saisi tel quel, y compris vide, `1,`, `1.`, `1/`, `-`, erreur
   ou collage. Ne jamais le nettoyer sur `input`, blur, Back ou remount.
2. Pour la lecture métier uniquement : trim extérieur comme aujourd'hui ; un
   unique point **ou** une unique virgule décimale, entre partie entière et
   chiffres fractionnaires ; virgule → point, puis parse Domain exact. La
   fraction conserve la syntaxe entière/entière positive existante et sa réduction.
3. Contrat minimal complet : `0`, `12`, `0.125`, `0,125`, `5/4`, `1/3`.
   `1,25`, `1.25`, `5/4` produisent exactement `5/4`. `1.2500` est équivalent.
   `1,234` vaut **1.234**, jamais 1234 : une virgule unique est décimale, on ne
   peut pas deviner une intention de groupement. Aide de champ explicite.
4. Rejeter mélanges (`1,234.5`, `1.234,5`), groupements (`1 234`, espace insécable,
   apostrophe), séparateurs répétés, exposant, plus, fraction malformée/denominateur
   zéro. Les zéros initiaux et `.5`/`,5` restent soumis à la syntaxe complète
   existante (utiliser `0.5`/`0,5`) ; pas de nouvelle notation requise ici.
5. Actuals et RAF refusent un résultat négatif via factories Domain. La fonction
   générique reste capable de parser un rationnel signé ; ne pas changer sa
   sémantique pour tous les consommateurs. Le cas `-0` se normalise déjà à zéro
   (quantité non négative), à caractériser sans inventer un invariant Domain.
6. Incomplet = texte conservé, non applicable, sans zéro implicite. L'exception
   existante de propagation Domain-zero sur une zone déjà connue entièrement
   nulle reste inchangée : elle ne vaut jamais pour un nouveau participant.
7. À Apply, afficher le refus avec Team/période/champ et garder tout le draft.
   Pendant frappe, aide discrète ; au blur/Apply, validation accessible. Une
   confirmation d'une suggestion devenue ambiguë reste obligatoire même si son
   texte est exactement équivalent à la valeur antérieure.

### Formatage proposé et justification sans modification Domain

Ajouter dans Application une fonction exacte ciblée de présentation (nom à
fixer lors de l'implémentation), utilisant `quantityToDecimalString` **sans
précision**, déjà exportée par `domain/index.ts`. Pour un cumul `Rational`,
`consumedWorkloadFromRational` permet de le typer avant ce rendu ; aucun nouvel
export Domain n'est nécessaire. `rationalToDecimalString` est l'implémentation
interne appelée par le wrapper, mais n'est pas exportée dans le barrel Domain.
Si le résultat est `DECIMAL_PRECISION_REQUIRED`, utiliser `serializeQuantity`
ou `rationalToCanonicalString` pour le cumul exact. Les autres erreurs ne
deviennent pas silencieusement zéro.
Le Domain teste déjà les facteurs 2 et 5 du dénominateur réduit ; le rendu fini
s'arrête au reste nul. `1/8 → 0,125`, `1/3 → 1/3`, `1/10000 → 0,0001`.

Proposition de présentation pour ces surfaces : virgule dans les décimales
finies (cohérente avec la cible utilisateur), fraction sans localisation ;
aucun groupement, pas d'exposant. Le point reste accepté. Ne pas utiliser
`Intl.NumberFormat` avec conversion Number. Un draft existant garde son choix
point/virgule et ses zéros finaux pendant l'édition ; après commit et nouvelle
initialisation propre, le format exact normalisé peut être utilisé.

**À AJOUTER** : helper exact ; **À MODIFIER** : ses seuls consommateurs
Actuals/RAF, et normalisation du parser Application partagé avec tests de ses
appels. **EXISTANT** : garder l'original exact et la sérialisation canonique.
**HORS PÉRIMÈTRE** : changer globalement tous les champs capacité/pourcentage,
supprimer la constante `EDITING_DECIMAL_PRECISION`, ou modifier le Domain.
La constante reste possible pour d'autres présentations mais ne participe plus
au rendu/reparse Actuals/RAF. Aucun cas d'impossibilité Domain n'a été trouvé.

### Limites techniques réelles et protections à évaluer

Le parseur n'a **aucun plafond explicite** de longueur de numérateur,
dénominateur ou partie fractionnaire. `BigInt(text)`, `10n ** BigInt(n)` et le
PGCD allouent/calculent proportionnellement aux tailles (coût arithmétique non
constant). Le formatage exact teste les facteurs 2/5 puis réalise une division
par chiffre décimal. Une fraction compacte `1/2^k` peut développer beaucoup de
chiffres ; le coût ne dépend donc pas seulement de la longueur du champ source.
Les additions sur beaucoup de dénominateurs distincts peuvent grossir les cumuls.
Les conversions BigInt peuvent lever une exception de ressources. Les limites
réelles dépendent du moteur JS, RAM et temps disponible ; aucun maximum portable
n'a été démontré et aucune capacité « infinie » n'est promise.

Le store reparse pour dirty/rebase et renderQuick revalide à chaque frappe ;
les récapitulatifs peuvent sommer plusieurs cellules. Le défaut de trois
chiffres masque certains coûts mais ne protège pas le parsing. La limite
512 MiB d'import fichier de 11D.0 est une limite de fichier, **pas** de décimales.

Protections proposées, sans seuil de précision inventé : vérification lexicale
avant BigInt ; intercepter les exceptions à la frontière Application, erreur
visible et texte conservé ; mémoriser la canonicalisation par texte inchangé
avec durée/cache bornés au draft, coalescer les calculs de synthèse, ne pas
reformater sur chaque frappe ; afficher les textes longs dans un champ de taille
bornée avec défilement, sans découper sa valeur. Compléter après autorisation les mesures locales ci-dessous avec des
longueurs croissantes (16, 100, 1 000, 10 000 chiffres comme échantillons, **pas
comme limites**), fractions à grand dénominateur et matrice multi-Team.
Comparer parsing, dirty, rendu et Apply, avec moteur/navigateur et tailles notés.

**Gate bloquant A — R2 performance en navigateur réel** : si ces mesures exigent une protection de budget
CPU/mémoire ou un déport de calcul Application, documenter le cas, le coût, la
valeur exacte conservée, l'erreur visible et la stratégie avant adoption. Ne
pas introduire maxlength, slice, precision=3 ou refus silencieux de longues
valeurs. Un garde de ressources est technique, distinct du nombre de décimales
acceptées ; un seuil chiffré refusant des entrées demanderait un arbitrage étayé
avant ce sous-travail. Aucun seuil ni nouveau worker n'est décidé par ce plan.

### Mesure locale exploratoire effectuée pendant cette révision

2026-10-09, Node v24.21.0, macOS arm64. Sources `rational.ts`/`result.ts` de la
baseline transpilées en modules dans un répertoire temporaire puis supprimé ;
aucun build, fichier source, script ou dépendance modifié. Une chauffe et sept
itérations par opération, médiane en ms. Entrée décimale `0.` suivie de n fois
`1` ; rendu sans précision du rationnel parsé ; sonde séparée `1/(2^n)`.

| n (échantillon) | Parse décimal ms | Rendu décimal fini ms | 40 parses ms | Chiffres du dénominateur 2^n | Longueur rendue 1/(2^n) | Rendu 1/(2^n) ms |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 16 | 0,0022 | 0,0026 | 0,0233 | 5 | 18 | 0,0019 |
| 100 | 0,0010 | 0,0346 | 0,0386 | 31 | 102 | 0,0193 |
| 1 000 | 0,0045 | 1,1995 | 0,1173 | 302 | 1 002 | 0,2891 |
| 10 000 | 0,0924 | 265,1148 | 3,8168 | 3 011 | 10 002 | 36,6669 |

Ces sondes mesurent les helpers existants, pas une future UI ni son Apply.
Les compteurs/temps sont des nombres de diagnostic, les quantités restent BigInt.
Le rendu fini long est un risque concret de blocage du thread ; les 40 parses
simulent une répétition et ne constituent pas une mesure de matrice DOM.
Pas de plafond déduit, pas de garantie de latence/RAM, pas de pic mémoire mesuré.
Étape A doit compléter en navigateur, avec PGCD défavorable, grandes fractions
non finies, cumuls de dénominateurs distincts, nombreuses cellules, heap observé
et durée de frappe/dirty/rendu/Apply. Mémorisation bornée au draft et absence de
rendu répété sont les premières protections ; tout budget refusant une valeur
exacte doit être documenté et audité avant adoption. Un nouveau worker n'est pas
implicitement autorisé. Aucune limite arbitraire de décimales n'est introduite.

## 6. Cartes compactes et historique

### Project

```text
Actuals & RAF
Actuals period: 01/09/2026 → 30/09/2026
Team          Consumed (j.h)      RAF (j.h)
Alpha         12,5                [ 8,25 ]
Beta           7,5                [ 5    ]
[Update actuals…]
History ▸
                         Apply   Cancel
```

**À MODIFIER** : une période globale mutualisée entre Teams, trois colonnes,
cumuls exacts du snapshot courant, RAF courant exclusivement requirements,
ordre Portfolio, labels associés Team/unité. RAF directement éditable dans le
tableau ; aucun bouton RAF dédié. Apply/Cancel carte conservent leur rôle.
Les valeurs saisies mais non publiées portent un indicateur de draft sans
présenter le consommé de branche comme déjà publié.

**À MODIFIER** : retirer le doublon RAF des sous-cartes Forecast pour chaque
membre dont le tableau est le point de saisie, **y compris avant premier snapshot**.
Ne retirer aucun requirement, intention untouched, cap caché ou toggle membership.
La collecte formulaire doit lire le store/modèle, sans supposer un input RAF
présent. Les callbacks existants deviennent des raccords internes au tableau,
pas deux champs éditables. Pas de second owner ni de store RAF supplémentaire.

**EXISTANT à préserver avant snapshot** : le tableau affiche les membres publiés,
Consumed `—`, période inconnue et RAF courant déjà enregistré dans requirements,
jamais une suggestion non enregistrée. A est utilisable directement. Create
Project et Team nouvellement activée mais non publiée conservent leur saisie
RAF initiale explicite dans le draft Forecast : ce requirement n'existe pas
encore dans le tableau publié. Conserver ce champ tant qu'il n'a pas un point
de saisie unique dans le tableau ; ce n'est pas un doublon de membre publié.
Ne pas supprimer sa valeur par absence DOM. Après Apply autonome le nouveau
membre rejoint le tableau. Si le garde existant impose un handoff (notamment
RAF carte dirty + membership), garder ce chemin, sans contourner ses preuves.
Ne pas forcer un snapshot pour une simple révision A ou un ajout Forecast autonome.

**À MODIFIER** : lecture Forecast → Actuals/RAF → Update actuals → History →
Apply/Cancel. Hôte stable hors `fields` effacés au hydrate, éventuellement dans
le formulaire avant actions ; modale toujours hors formulaire. Buttons de
navigation/History type button, aucune soumission imbriquée ou croisée.
Activation/Delete/reorder et plusieurs cartes ouvertes restent fonctionnels.

### Reservation

Titre `Actuals`, même période globale et tableau `Team | Consumed (j.h)`.
**Aucune colonne RAF, aucun routage A**. Zéro/une/plusieurs Teams ; état vide
lisible, aucune ligne zéro fictive. Les allocations Forecast restent dans les
sous-cartes, ratio en pourcentage et fixed-daily en demande quotidienne, avec
leurs unités et valeurs exactes untouched ; jamais converties en RAF/total.

### History et états

**EXISTANT** : readonly et replié par défaut. **À MODIFIER** : entrée compacte
`History`, détails V5 et legacy identifiés. **À AJOUTER** : accès complet version,
knowledgeDate, snapshotId, periodIds, couverture/partition, participants,
retiredZeroTeams, consommés et RAF historiques exacts, provenance legacy disponible.
Aucun ID V5 inventé pour V4. Les données techniques détaillées restent dans History.
Pas d'édition/restauration/suppression ; histoires objet dans Current seulement,
aucune lecture de captures Portfolio History pour éditer Current.

| État | Présentation et contrat |
| --- | --- |
| Aucun snapshot/legacy | No Actuals recorded ; période `—`, Consumed `—`, RAF courant éditable requirements ; A sans premier V5 |
| Ancien snapshot sans couverture / érosion totale | Période/Consumed `—`, RAF courant requirements ; RAF historique dans History uniquement |
| Snapshot couvert positif ou zéro | Dates communes, exacts par Team ; zéro rendu `0`, borne 11C conservée même sans occupation positive |
| Legacy pending | Message reconciliation explicite, données V4 readonly ; ne pas inventer une partition V5/cumul courant V5 ; RAF requirements éditable, A ne réconcilie pas |
| Draft carte/modale | Publié vs saisie distincts ; preview de branche nommée ; besoins de confirmation visibles par Team/cellule |
| Stale/conflit | Base/récent/local accessibles, Apply bloqué, textes gardés ; Review explicite seulement si sûr, sinon Cancel/réouverture |
| Échec/pending/recovery | Pas de succès prématuré ; texte conservé ; abort prouvé distinct de commit incertain ; recovery bloque mutations |

## 7. Ownership, R1 et corrections finales obligatoires

### Interactions

| Geste | EXISTANT à préserver / adaptation ciblée |
| --- | --- |
| Frappe tableau RAF | Store RAM existant, aucun dispatch, projection ou write ; désactivée durant branche modale |
| Apply carte RAF seul | `applyCardRaf` → A ; zéro snapshot quelle que soit la source ; équivalence vraie zéro projection/write |
| RAF + autres champs Forecast non transportables | Garde/séquencement explicite, toutes intentions conservées ; aucune transaction composite inventée |
| Update actuals | Copie du draft carte dans branche unique, même invalide ; RAF base requirements ; ouverture ne confirme rien |
| Next/Back/sélection | Étapes, textes, provenance/preuves conservés selon leurs invalidations existantes ; zéro publication intermédiaire |
| Apply modal | Candidat B + preuves vers Application R2 ; résultat no-op/A/B réel ; nettoyage cible après résultat confirmé seulement |
| Cancel/Escape modal | Détruire branche uniquement, restaurer draft carte/Forecast préalable textuellement ; autres cartes conservées |
| Cancel carte | Restaurer état publié de cet objet uniquement, sans write ni restauration historique |
| Handoff membership | Forecast propriétaire des Teams/caps/allocations ; Actuals readonly membership cible, un seul candidat B, aucune publication préalable |
| Échec | Owners/bases/branches/textes/erreurs conservés ; refus/abort prouvé ne consomme aucune version |

### R1 livré : changements réels et preuves délibérées

**EXISTANT** : confirmations RAF requises = union de :

- tous les participants si présence de couverture, bornes ou partition changent
  (from seul, through, prepend/append, split/merge, érosion comprise) ;
- à partition identique, seules Teams dont une consommation exacte change ;
- Teams dont le RAF numérique change contre requirements publiés, plus obligations
  d'ajout/retrait/réintroduction existantes.

Divergence RAF courant/historique seule n'ajoute aucune obligation. Une valeur
RAF inchangée peut néanmoins nécessiter une confirmation après consommation.
Cellules copied/user-entered/user-confirmed/domain-zero-propagated/
needs-confirmation et preuves RAF restent distinctes du formatage.
Nouveau participant : consommés de chaque période et RAF explicitement fournis,
y compris zéro. Aucun prorata non nul ; propagation zéro seulement zone déjà
connue entièrement zéro selon Domain. Retrait : consommés courants tous nuls,
confirmation union RAF historique/courant et marqueur ; A vers zéro ne retire pas
la Team et ne contourne pas un consommé non nul. Réintroduction fournit de
nouvelles cellules/RAF, jamais restauration depuis History. Dernier requirement
non retirable. Les dates restent civiles fixes, inclusives/contiguës, sans
synchronisation avec dates Forecast/horizon ; coverage≤knowledgeDate inchangé.

**V1 — restitution IDs** : parser retrouve l'ID publié par intervalle et toutes
consommations exactes quand une période est restaurée, même si split/merge a
perdu `originalPeriodId`. Ouvrir/Apply inchangé, bornes ou consommation restaurées,
split puis merge annulé, merge puis split annulé doivent garder tous les IDs et
être des no-ops. Un changement d'ID artificiel reste refusé par Application/Domain.
Ne pas remplacer ce contrôle par une comparaison ignorant les identités.

**V2 — review concurrent RAF autorisée** : conserver périodes/consommations
locales et leurs provenances quand Actuals distants n'ont pas changé. Après
Review explicite, fusion RAF à trois voies contre vraie base et Current récent,
actualisation de la base RAM, invalidation **sélective** des confirmations dont
le RAF base a changé. Consommation locale A + RAF distant A exige renouvellement
A ; consommation locale A + RAF distant B garde la preuve A non affectée, B
invalidée mais non requise si B inchangée pour R1. Une couverture locale modifiée
reste conservée et exige tous les RAF. RAF local invalide ne garde aucune preuve.
Actuals/partition/membership/paramètres distants incompatibles ou RAF contradictoire
refusent review, gardent le draft, demandent Cancel/réouverture ; pas de merge forcé.

**R1 — frappe indépendante** : `1,25`, `1.25`, `1.2500`, `5/4` ne créent aucune
confirmation. Un changement numérique invalide la preuve précédente ; texte
équivalent ne conserve que la preuve **déjà explicite**. Checkbox de confirmation
ou geste explicite existant est nécessaire ; ni focus, blur, rendu, initialisation,
frappe, adoption distante ou ouverture ne fabrique de preuve. `onOpen` remet
les confirmations RAF de branche à false : le marqueur quick interne n'est pas
une preuve R1 transmissible. Ne pas convertir Apply A en confirmation modal B.

## 8. Concurrence, no-op et transaction 11D.0

**EXISTANT** : quatre stores coordonnés, plusieurs cartes dirty simultanées,
RAM uniquement, non exportée. Base carte/branche/handoff immutable ; modèle récent
séparé ; comparison exacte avec fallback texte pour incomplet/invalide. Source,
membership, caps/allocations et RAF doivent détecter changement à version Actuals
inchangée. Ne reconstruire aucune base depuis dernier snapshot/`old.model` rafraîchi.

Rebase automatique carte seulement si structure/paramètres compatibles et
champs non contradictoires ; textes invalides et équivalents conservés. Modale
ouverte toujours stale/review explicite, aucun rebase silencieux. Les cas sûrs
et refus V2 du §7 ne sont ni élargis ni réduits pour simplifier l'écran.
Review ne publie rien ; revalider toutes preuves nécessaires à Apply.
Les contrôles parser/session base métier ne remplacent pas CAS repository.

Prepare → projection privée → `writeCurrent` sous token → commit confirmé →
publish ; zéro état intermédiaire. No-op vrai, après contrôles de base/identités :
zéro horloge snapshot/version/projection/write/conversion persistée. A effectif
et B effectif : chacun une seule projection/write ; B seulement un nouveau
snapshot. Plusieurs A avant B n'inventent pas de journal RAF.

Abort certain : aucune publication, draft gardé et retry explicite existant.
Commit incertain, commit confirmé mais reconciliation locale impossible ou CAS
distant perdu : recovery obligatoire, mutations Current/Save/Delete/import
bloquées, owners conservés et reload explicite. Confirmation de reload informe
la perte des drafts RAM ; Cancel reload les garde. Aucun rollback annoncé pour
outcome inconnu, retry automatique ou incrément local de secours. Root inert
durant commit ; pas de nettoyage d'owner sur pending/erreur.

## 9. Invariants et risques de portée

| Invariant / risque | Protection et preuve attendue |
| --- | --- |
| Autorité RAF | Requirements seuls Current ; History immutable ; A zéro snapshot et B égalité post-publication seulement |
| Numérique | Aucun Number/parseFloat/toFixed pour quantités ; fini complet/fraction exacte ; raw draft, équivalence et round-trip ; coûts §5 |
| Domain/moteur | Aucun changement ; reconstruction, caps, membership, activation et engine `/2` inchangés |
| 11C | T source exclusive courant, couvert zéro conserve T ; Forecast positif date>T sur toutes Teams ; A ne change pas T |
| IndexedDB/CAS | Schema2/storage data1/stores/keys/indices/receipts inchangés ; aucune modification de modèle ou recovery |
| Compatibilité | V1–V8 et inputs1/2/forecast1/2 mixtes, ancien contrat numérique strict ; vieux Current read/Save/no-op sans rewrite ; V8 export exact |
| Identités/provenance | IDs/preuves/hors-zone et préfixes append-only ; V1 ; legacy records et autorité de provenance conservés ; aucune histoire réécrite |
| Dirty indépendant | Plusieurs cartes, tabs/collapse/remount/History suspend ; nettoyage owner cible après commit confirmé ; draft incomplet toujours récupérable |
| Doublon retiré | Requirements/caps/intention untouched collectés depuis store ; ajout initial explicite conservé, aucun membership déduit d'input absent |
| Concurrence | Base RAM réelle, rebase trois voies, V2, preuves sélectives ; stale avant R2 même target=current ; CAS final distinct |
| Pas de travail à la frappe | Aucun dispatch/recalcul moteur/write ; parsing local exact permis, cache borné si utile ; aucun rendu qui change la valeur |
| History | Aucun readSnapshot/payload/content/metadata capture inutile pour Current ; historiques objet accessibles sans Portfolio History |
| Publication/recovery | Privé avant commit ; abort/unknown distingués, recovery obligatoire après incertain/unreconciled, drafts gardés |
| Formulaires/responsive | Hôte stable, modale body, un seul submit, focus/restoration, scroll interne ; document sans overflow à 390 px |
| Tests | Assertions existantes conservées ; changer seulement selectors/layout nécessaires ; aucun skip ou affaiblissement métier |

**HORS PÉRIMÈTRE** : Domain, engine/reconstruction, sémantique Forecast/History,
commandes/R1/R2, formats V1–V8/inputs, stockage, scripts/dépendances, replay,
daily contributions 11D.2 et navigation 11D.3. Pas de réécriture globale du
parseur ou formatage des capacités/pourcentages. Si une impossibilité apparaît,
documenter candidat minimal, invariant violé, preuve issue du code/tests,
pourquoi UI/Application ne suffit pas et alternatives avant audit séparé ;
ne pas modifier le métier pour contourner le blocage.

## 10. Plan d'exécution A → B → C → D → E

Les étapes A → E sont autorisées après commit et push du présent amendement.
Les fichiers tests cités au §11 sont les tests voisins réellement présents.
Chaque étape conserve ses critères même si B/C sont livrées ensemble pour
éviter une composition temporairement incohérente.

### A — Saisie, parsing et affichage numériques exacts

- **Fichiers** : `editableQuantity.ts` ou helper Application voisin à ajouter,
  `src/application/index.ts`, `projectEditViewModel.ts`, store/parser/controller
  Actuals et parsers Project/Create consommateurs ; tests N1–N8. Ne pas changer Domain.
- **Conservé** : sérialisation canonique, exact untouched, non-négativité,
  preuves, incomplets RAM, contrats ratio/fixed et syntaxe de dates.
- **À MODIFIER / AJOUTER** : helper fini complet/fraction, virgule à la lecture
  métier seule, comparaison RAF exacte, messages ciblés/ressources ; formater
  uniquement les initialisations propres, jamais le texte en cours.
- **Dépendances** : APIs Domain existantes ; inventaire des callers du parse partagé
  avant adaptation, aucune nouvelle dépendance. B/C/D utilisent ce contrat.
- **Risques** : coût BigInt/rendu mesuré, exceptions, cache non borné, preuve
  inventée ou faux dirty ; mitigation §5 et §7, aucun plafond implicite.
- **Tests** : N1–N8, V1/R1, parsers Project/Actuals et Reservation/capacité
  affectés si parse partagé ; mesures browser parsing/dirty/rendu/Apply et mémoire.
- **Acceptation** : tous exacts round-trip ; équivalences sans write/confirmation,
  raw incomplet gardé mais non publiable ; résultats ressources documentés,
  absence de limite silencieuse et de float métier. Si budget bloquant démontré,
  alternatives auditées avant adoption, sans engager Domain/worker.

### B — Cartes compactes Project/Reservation et historique

- **Fichiers** : `createSnapshotActualsCardController.ts`, éventuellement
  `snapshotActualsViewModel.ts` pour projection testable, `createPortfolioEditControls.ts`,
  `renderApp.ts`, composition `createTimelineUiCoordinator.ts`, `public/styles.css`.
- **Conservé** : valeurs publiées, source/absence/zero/legacy, ordre Teams,
  form handlers Apply/Cancel, historique readonly, expansion/activation/Delete.
- **À MODIFIER / AJOUTER** : période commune 3/2 colonnes, rendu A, History compact
  replié et détails exacts complets ; hôte/actions stables, labels d'unité/provenance.
- **Dépendances** : A ; C assure le point RAF unique. UI compacte ne modifie pas commandes.
- **Risques** : faux zéro, double cumul, historique RAF pris pour Current,
  submit croisé, longueurs/overflow ; oracles C1–C3/U1–U2.
- **Tests** : VM/controller Project/Reservation, 0/1/N Teams et tous états §6,
  cumuls multi-périodes, hôte hydrate/remount, readonly sans read Portfolio History.
- **Acceptation** : dates mutualisées, colonnes demandées, RAF requirements
  y compris sans snapshot, historique replié ; aucun payload historique muté,
  aucune allocation Reservation/unité affectée, aucun formulaire imbriqué.

### C — RAF courant, suppression doublon, dirty et rebase

- **Fichiers** : `createProjectEditController.ts`, `projectDraftStore.ts`,
  `parseProjectEditCommand.ts`, `createProjectCreateController.ts` si nécessaire,
  trois modules Actuals, `createTimelineUiCoordinator.ts`, `actualsForecastConflict.ts`.
- **Conservé** : A/B/R2 livrés, bases RAM, garde Forecast/RAF, handoff membership,
  caps/allocations, Apply/Cancel/owners et ajouts pré-snapshot explicites.
- **À MODIFIER** : suppression du champ membre publié doublon, accès store au
  lieu d'input absent, dirty/rebase exact point/virgule/fraction et messages
  Current/RAF même sans nouvelle version ; aucune seconde intention persistante.
- **Dépendances** : A/B ; caractériser les collectes et callbacks actuels avant
  retrait DOM. D utilise les mêmes preuves/branches.
- **Risques** : faux retrait requirement, perte RAF initial d'ajout, reset raw,
  confusion version Actuals/CAS et régression V2 ; garder refus structurels.
- **Tests** : A1–A4, R2a–R2c, C4–C6, M6–M7, V1/V2/R1 et multidraft/coordinator ;
  spy counts no-op/A/B et absence read History ; parsers untouched/caps.
- **Acceptation** : point RAF unique pour membre publié avant/après snapshot,
  A seul aucun snapshot, nouveaux membres/création fonctionnels, R2 Application
  intact, plusieurs dirty préservés ; rebase/review sûr sans perte de consommés/preuves.

### D — Modale, confirmations, erreurs, focus et responsive

- **Fichiers** : controller/store/parser Actuals, coordinateur pour guards/focus,
  `public/styles.css` ; aucune refonte frise/transaction ou nouvelle autorité.
- **Conservé** : prepend/append, sélection contiguë, replacement/split/merge,
  érosion et reconcile legacy, dates fixes/hors-zone, evidence sélective et IDs,
  Back/Next/Cancel, deux étapes Reservation/troisième RAF Project.
- **À MODIFIER / AJOUTER** : rendu exact A dans champs/cumuls/suggestions/history,
  publié vs branche vs besoins explicites, raisons R1, erreur par Team/période,
  Review parlant de Current, focus logique/restoration, styles compact/responsive.
- **Dépendances** : A/C, bases et contrats existants ; pas de preuve générée par rendu.
- **Risques** : blur/init confirment, renouvellement trop large/manquant,
  remount perd texte/caret, frise inaccessible ; contrôles V1/V2/R1/U2.
- **Tests** : M1–M7, V1/V2/R1, refus couverture/date/evidence, Enter/Escape/trap,
  focus après erreur/succès/Cancel/Review/remount, desktop/390 px et longues valeurs.
- **Acceptation** : toutes opérations conservées, R1 exactement conditionnel,
  aucun RAF confirmé par frappe équivalente, V2 conserve branches/provenance,
  aucune perte d'ID restauré V1 ; erreurs/actions accessibles sans overflow document.

### E — Validation complète et revue navigateur

- **Fichiers** : suites existantes §11, tests UI/Application voisins renforcés
  seulement selon delta ; rapports de validation futurs dans livraison. Domain,
  codecs/repository/worker sont oracles conservés, pas implémentations à modifier.
- **Conservé** : toutes assertions métier/compatibilité/atomicité et fixtures
  anciennes, scopes de tests synchrones vs async/native ; aucun skip ni nouvel E2E.
- **À AJOUTER** : preuves intégration pour UI finale, compteurs write/projection/version,
  mesures A complétées, revue réelle des captures et compte rendu des limites.
- **Dépendances** : A–D gates ciblées passantes ; production complète construite
  pour tests natifs, origine/profil isolés, aucune donnée utilisateur manipulée.
- **Risques** : suite verte masquant anciennes assertions, benchmark pris pour
  garantie, simple DOM pris pour CAS ; revue diff/assertions et natif obligatoire.
- **Tests/gates** : `npm run typecheck`, `npm test`, `npm run build`,
  `npm run test:storage`, `npm run test:portable`,
  `node scripts/browser-storage-audit-test.mjs`,
  `node scripts/browser-raf-final-test.mjs`, `git diff --check` ; scripts existants
  lancés sans nouvelle stack. Cas UX additionnels via outils navigateur existants.
- **Acceptation** : §12 intégral, V1/V2/R1 natifs répétés avec layout final,
  R2 quatre branches avec counts, vieux Current et mixed captures V8 round-trip,
  failures/CAS/recovery, 1440/390 px et clavier ; livraison IN REVIEW pour audit
  d'implémentation, jamais auto-DONE. Ne pas démarrer E dans cette mission de plan.

## 11. Matrice complète de validation future

Les cas ci-dessous sont futurs ; les résultats RAF Model cités §2 ne sont pas
une validation UX. Suites réellement présentes :

- **NUM** : `src/application/session/editableQuantity.test.ts`,
  `projectEditViewModel.test.ts`, `teamReservationsEditViewModel.test.ts`,
  `src/ui/project-edit/parseProjectEditCommand.test.ts`,
  `src/ui/reservation-edit/parseReservationEditCommand.test.ts` et leurs stores/controllers.
- **UX** : `src/ui/actuals/createSnapshotActualsCardController.test.ts`,
  `actualsWorkflow.test.ts`, `src/ui/project-edit/createProjectEditController.test.ts`,
  `createProjectCreateController.test.ts`, `projectDraftStore.test.ts`,
  Reservation equivalents, `src/ui/timeline/createTimelineUiCoordinator.test.ts`
  et `createTimelineUiCoordinator.multidraft.test.ts`.
- **MODEL** : `src/application/session/lot11d1RafModel.test.ts`,
  `planningSession.lot10c1.test.ts`, `planningSession.test.ts`,
  `src/domain/actuals/snapshots.test.ts`, entities et membership existants.
- **TX** : `src/main/planning/createRepositoryPlanningDispatcher.test.ts`,
  `planningPersistenceTransaction.test.ts`, `createPlanningProjectionDispatcher.test.ts`,
  `src/application/persistence/planningRepository.test.ts`,
  `validateStoredSnapshot.test.ts`, `repositoryTransfer.test.ts`.
- **COMPAT** : `src/application/backup/flowplanBackupV1.test.ts`,
  `flowplanBackupV5.test.ts`, `portableBackupParts.test.ts`,
  `src/application/portfolioSnapshots/portfolioSnapshots.test.ts`, `dailyProfiles.test.ts`,
  TX/worker/native gates. Les cas V4 sont notamment dans `flowplanBackupV1.test.ts` ;
  aucun fichier `flowplanBackupV4.test.ts` n'existe. Il n'existe pas nécessairement un test éponyme par codec.
- **TEMP** : `src/main/planning/lot11cTemporalSeparation.test.ts`,
  `lot10c1SnapshotProjection.test.ts`, `buildPlanningSessionProjection.test.ts`,
  moteur/metrics et History existants conservés.

| ID | Scénarios | Oracle et suites |
| --- | --- | --- |
| N1 | `0`, entiers, point/virgule, `1.2500`, `5/4`, longues décimales | Canonique exact, tous 1,25 équivalents ; NUM/UX |
| N2 | `1/3`, `2/7`, `1/8`, `10/8` | Non fini fraction, fini décimal intégral ; parse(format(q))=q ; NUM |
| N3 | Négatifs entier/décimal/fraction, `-0`, dénominateur zéro | Factories non négatives inchangées ; -0 selon contrat actuel ; état publié intact ; NUM/MODEL |
| N4 | Vide, `1,`, `1.`, `1/`, `-`, texte ; séparateurs mixtes/groupements/exposants/plus/`01`/`.5` | Raw après blur/remount, incomplet/invalide non publiable, pas zéro implicite hors Domain-zero ; NUM/UX |
| N5 | >2^53, <0,001, grandes fractions/BigInt, 2^n/5^n, cumuls dénominateurs distincts | Exact sans scientifique/troncature ; coûts/erreurs ressources mesurés, texte conservé ; NUM et §5 |
| N6 | Domain→VM→draft→parse→commande ; ouverture/Apply inchangé/Cancel | Exact et IDs identiques, no-op zéro clock/version/projection/write ; NUM/UX/MODEL/TX |
| N7 | `1,25`/`1.25`/`1.2500`/`5/4` en dirty/rebase/conflit | Pas faux dirty/conflit, pas confirmation créée ; invalide reste dirty ; stores/UX |
| N8 | Virgule partagée et champs untouched capacité/ratio/fixed-daily | Unités/exacts antérieurs préservés ; pas refonte pourcentages/capacités ; NUM/Reservation/Team parsers |
| C1 | Project 1/N, Reservation 0/1/N Teams, noms/valeurs longs | 3/2 colonnes, période unique, somme snapshot courant seulement, ordre Portfolio ; UX |
| C2 | Aucun snapshot, ancien RAF-only positif/zéro, couvert zéro/positif, érosion totale | `—` vs `0`, RAF requirements partout, aucun premier V5 par A ; UX/MODEL/TEMP |
| C3 | Legacy pending/réconcilié, History replié | V4 readonly/provenance/RAF historiques exacts, pas partition inventée/double cumul/reconcile par A ; UX/COMPAT |
| C4 | Retrait doublon sous-carte, création et nouveau membre non publié avant snapshot | Membership/caps/exact untouched complets sans input DOM, RAF initial explicite conservé, un point membre publié ; Project parser/controller/coordinator |
| C5 | RAF + autre champ dirty, caps seuls, caps+RAF, plusieurs cartes dirty | Garde/séquencement inchangé, pas nettoyage silencieux/composite ; caps seuls update-project sans snapshot ; UX/MODEL |
| C6 | Apply A puis B, Cancel modal/carte, tab/collapse/remount/suspend History | Owners indépendants, draft raw invalides préservés, Save dirty-guarded, aucun rendu historique→Current ; UX |
| A1 | A sans snapshot/ancien RAF-only/couvert/legacy/réconcilié/inactif, 1/N Teams | Requirements patch seuls, caps/legacy/source/histories identiques, 0 snapshot, 1 projection/write si effectif ; MODEL/TX/native |
| A2 | A exact équivalent/zéro/grande valeur ; patch absent/vide/duplicate/unknown/nonmembre/négatif | Valide équivalent no-op 0/0, invalide refus 0/0 ; pas clock/version/convert vieux Current ; MODEL/TX |
| A3 | A base source/membership/RAF ciblé stale, target=current ; patches disjoints | Stale avant equality, conflit ciblé ou rebase sûr, pas overwrite ; MODEL/UX |
| A4 | update-project untouched après A ; révision cachée ; nouveau membre RAF initial | RAF publié conservé, hidden numeric revision refusée, caps exacts, initial explicite ; MODEL/Project parser |
| R2a | Quatre couples changements Actuals/RAF avec historique divergent | no-op/A/B/B ; snapshots 0/0/1/1, projections/write 0/1/1/1, alignement B seulement ; MODEL/TX et modal native |
| R2b | Confirmations seules, rationnels équivalents, base complète stale non ciblée malgré target=current | No-op uniquement après bases/identités ; stale avant routing, zéro write ; MODEL/UX |
| R2c | Plusieurs A puis B consommation/extension/érosion ; no-op startup ancien | B base dernier RAF courant, pas restauration historique ni journal A, ancien Current non réécrit au no-op ; MODEL/TX/COMPAT |
| R1a | Consommation A seule, partition fixe, RAF numérique inchangé, B non confirmée | B requiert RAF A et preuve consumed ; B non requise si non concernée, absence A refuse ; MODEL/UX |
| R1b | from/through/présence coverage/partition split/merge/érosion, through identique possible | Tous participants RAF confirmés, union numérique/membership ; sans preuve zéro publication ; MODEL/UX |
| R1c | RAF numérique modifié, ajout/retrait/réintroduction ; courant0/historique>0 et inverse | Union obligations, nonzero consommé interdit retrait, new zero explicite, préfixes/markers protégés ; MODEL/UX |
| R1d | Frappe équivalente puis différente, init/rendu/focus/blur/open/Review | Zéro preuve inventée, équivalent conserve preuve explicite existante seulement, changement invalide ; onOpen false ; UX/native |
| V1 | Open unchanged, dates/consommés changés puis restaurés, split→merge annulé, merge→split annulé ; fractions équivalentes | IDs originaux retrouvés, snapshot/version/state/projection/token identiques, 0 write/projection ; artificial ID substitution toujours refusée ; parser/MODEL/UX/native final |
| V2a | Consommé local A + RAF distant A, même version Actuals ; Review puis Apply sans/avec renouvellement A | Local consommation/provenance gardée, base actualisée seulement Review, sans preuve refus, avec preuve B unique 1/1 ; UX/MODEL/native final |
| V2b | Consommé local A + RAF distant B ; RAF équivalent/disjoint, invalid local, deux cartes dirty | Preuve A gardée si non affectée, B invalidée et requise seulement selon R1, raw autre carte gardé ; invalid ne garde preuve ; UX/native final |
| V2c | Couverture locale modifiée + RAF distant seul ; Actuals/membership/caps/partition distant ou RAF contradictoire | Cas sûr garde branche/all-Team R1 ; cas incompatibles Review refuse/draft conservé/Cancel explicite, aucune fusion forcée ; UX/MODEL |
| M1 | Première couverture Project/Reservation, RAF modifié avant entrée, covered-zero/reconcile | Étape sélection absente sans coverage, 2/3 étapes, couverture explicite v1, jamais RAF seul premier V5 ; UX/MODEL |
| M2 | Prepend/append/sélection contiguë 1/N périodes/remplacement/hors-zone | Dates fixes sans trou/overlap, hors-zone exact/copied IDs, intent/editedZone réels ; UX/Domain existant |
| M3 | Split/merge/bornes/retrait périodes/érosion partielle/totale | Nonzero jamais proratisé, needs-confirmation/evidence sélective ; zero propagation seulement permis ; refus conservés ; UX/MODEL |
| M4 | from seul/through, RAF courant divergent historique, partition fixe/consommé seul | R1 selon réel, aucune confirmation globale ou fallback historique ; UX/MODEL |
| M5 | Back/Cancel/Escape à chaque étape, RAF invalide/long préexistant | Branche seule annulée, drafts initiaux restaurés raw, étape/focus remount ; UX |
| M6 | Concurrence A→B, B→A, B→B, disjoint/convergent/contradiction, membership/source | Base métier et full B vs targeted A contrôlées, version identique détectée ; V2/refus/review explicites ; stores/MODEL |
| M7 | Handoff Project/Reservation ajout/retrait/réintroduction, RAF dirty retiré, autre Forecast dirty ; success/failure/Cancel | Une commande/evidence complète, aucun préalable publié, retrait impossible refusé, Forecast/RAF préalables gardés ; succès owner seul ; UX/MODEL |
| I1 | Input, tabs/collapse/suspend/remount/review, plusieurs cartes dirty | Zéro dispatch moteur/write, raw/dirty/ownership indépendants ; UX/coordinator spies |
| I2 | Validation/Domain/projection/encode failure, abort certain/quota et retry | État/projection/token inchangés et drafts visibles, erreur spécifique ; TX/native |
| I3 | CAS deux connexions/notification absente, ack perdu après A/B, publish local échoue après commit | Recovery blocage mutations, draft gardé jusqu'au reload confirmé, aucun rollback fictif/retry auto ; TX/native |
| I4 | Actions effectives vs no-op, confirmation seule, restored knowledge | Counts exacts §4, state identity et préfixes/IDs/preuves ; MODEL/TX/UX |
| I5 | Export/import après saisies UX de longues décimales/1/3, source V4/V5 sélectionnée après A/B et collection mixte | Anciens validators stricts, V8 exact export/stage/read-back/reimport/reopen, sources/IDs/profils historiques identiques ; COMPAT/TX/worker/native |
| K1 | Readers V1–V7, V4 intermittent/futur/provenance, V5 knowledgeDate≤UTC exportedAt, anciens invalides RAF | Acceptation/rejet historique identiques, conversion RAM exacte sans snapshot inventé ; COMPAT |
| K2 | V8 RAF divergent, pending/réconcilié, anciens uncovered/RAF-only ; discriminant inconnu/extra fields/downgrade | Round-trip exact ; inconnu refuse ; downgrade refuse perte/divergence, jamais réalignement ; COMPAT |
| K3 | Anciennes captures inputs1 forecast1/2 engine /1 chevauchant et /2 ; nouvelles inputs2 divergentes | Captures/metadata/digests/profils inchangés, RAF/EAC requirements capturés et non owner Current/source.raf ; Portfolio/History |
| K4 | Capture sélectionne ancien snapshot après A/B/membership ultérieur ; source none/legacy exclusive, owner/référence/préfixe invalide | Résolution ID/préfixe historique exact, invalides refusés, IDs réservés et legacy authority map protégée ; TX/COMPAT |
| K5 | Read/Save/no-op vieux Current sans discriminant, import ancien/V8 invalide au milieu/interrompu | Pas rewrite vieux Current par read/Save/no-op ; staging/read-back/activation entière uniquement, raw/fingerprint inchangé ; TX/native |
| K6 | Vieux Current + nouvelles captures inputs2 ; nouveau Current inputs2 + captures inputs1 forecast1/2 ; collection mixte | ReadCurrent/readSnapshot/worker/export V8/stage/read-back/import/reopen exacts ; A ne réécrit aucune capture, Save ne convertit pas vieux Current, sources/IDs/digests conservés ; TX/native bloquant |
| I6 | A/B/édition Current avec nombreuses captures ; Save/Delete séparés | Aucun read/write payload/content/metadata capture pour Current, History revision inchangée ; Save/Delete sans moteur/rewrite Current ; TX/native |
| I7 | B/RAF après couvert zéro, érosion, earliest/Mandatory/horizon/borne extrême, Project inactif | 11C positif date>T toutes Teams, A T et occupation inchangés, activation Actuals intacte, aucune correction capture ancienne ; TEMP/MODEL |
| U1 | 1440/390 px, 0/1/N, longues valeurs/noms, History et modale scroll | document.scrollWidth=innerWidth ; scroll interne seulement, boutons/dates/erreurs accessibles, champ garde valeur entière ; browser |
| U2 | Tab/Shift+Tab/Enter/Escape/arrows, focus erreur/succès/Cancel/Review/remount | Labels Team/unité, trap/restoration, focus visible, un submit, raccourcis frise bloqués en modale ; UX/browser |

Les regressions V1/V2/R1 finales sont obligatoires et s'ajoutent aux capacités
10C.1/10C.2, pas à leur remplacement. Les suites Domain historiques raf-only
restent des validations des données anciennes, sans légitimer une nouvelle
publication RAF-only production. Garder les fixtures anciennes et leurs
assertions négatives numériques ; ne pas les convertir en inputs2 pour masquer
une régression. Les suites synchronous fixtures ne prouvent pas seules CAS/recovery.

`formatQuantityForEditing(1/3)=0.333` peut rester testé pour l'ancien helper
hors surfaces Actuals/RAF ; tester le nouveau helper ciblé séparément. Adapter
seulement selectors/libellés/layout devenus obsolètes, conserver les assertions
métier, dates, IDs, evidence, atomicité, drafts et focus. Aucun test retiré,
skippé ou assertion affaiblie pour une suite verte. Compter les tests ciblés
dans le total complet, scénarios natifs séparément, résultats/limites réels consignés.

## 12. Critères d'acceptation et décisions acquises

1. N1–N8 : exact point/virgule/fraction, fini intégral/non fini fraction, raw
   incomplet conservé/non publiable, aucun float ni plafond précision implicite.
2. Project trois colonnes/Reservation deux, une période commune, current consumed
   exact ; RAF requirements seul, historique readonly replié sans fallback.
3. Avant snapshot, A et RAF courant éditable fonctionnent sans V5 ; création/ajout
   initial explicites conservés, membership/caps/allocations/unités intacts.
4. Apply/Cancel carte sans boutons RAF dédiés, doublon supprimé pour membre du
   tableau ; plusieurs dirty/branches/handoff restent indépendants et récupérables.
5. A et quatre branches R2 exactes avec counts ; zéro snapshot RAF seul ; vrai
   no-op zéro write/projection, ID substitution invalide toujours refusée.
6. V1/V2/R1 passent en tests et navigateur réel : IDs restaurés, consommés
   locaux conservés en review autorisée, preuve séparée de frappe équivalente.
7. Toutes opérations modales et dates fixes conservées, R1 union exacte,
   preuves/IDs/hors-zone/provenance intactes, pas prorata non nul ni confirmation implicite.
8. V1–V8/mixed captures valides exacts ; anciennes données invalides refusées ;
   histoire immutable et aucun accès Portfolio History inutile pour Current.
9. Saisie/navigation/review zéro calcul moteur/write ; publication après commit
   confirmé seulement ; CAS/abort/uncertain/recovery démontrés sans perte silencieuse.
10. Domain/moteur/11C/IndexedDB/CAS/versions métier inchangés ; gates E passantes,
    desktop/390 px/clavier/focus accessibles ; diff futur ciblé UI/Application/CSS/tests.

Les choix utilisateur sont définitifs : aucune question sur virgule/fractions,
précision, RAF requirements, A/B/R1/R2 ou ownership n'est rouverte. Les détails
DOM/helper/cache sont des choix d'implémentation à vérifier par tests, pas de
nouveaux arbitrages métier. Aucun blocage Domain identifié à cette baseline.
Risque concret restant : coût du rendu fini long §5, à mesurer sur UI finale et
traiter sans plafond silencieux. RAM drafts perdus au reload confirmé et refus
des merges structurels incompatibles restent les limites existantes 11D.0/RAF Model.
Toute protection de ressources refusant des valeurs doit fournir mesures,
comportement visible, texte exact gardé et alternatives pour audit avant adoption.

## 13. Amendement post-audit obligatoire — R1 / R2 / R3

### R1 — Propriétaire éditable unique

« Pour chaque Team membre publiée d'un Project, le RAF courant possède un seul
point de saisie éditable. Une intention RAF ne peut être perdue, écrasée
silencieusement, appliquée deux fois ni implicitement confirmée par une autre
opération Forecast. » Le store Actuals existant reste son propriétaire ; le
Forecast lit les requirements publiés pour les membres existants et conserve
le RAF initial explicite des nouveaux membres. Aucun owner supplémentaire.

Tests bloquants C/E : RAF puis autre champ Forecast, ordre inverse, Apply/Cancel
carte et modal dans différents ordres, plusieurs cartes dirty, remount, onglet,
suspend/resume et rebase, ajout Team avec RAF initial explicite. Les gardes de
séquencement restent actives : refus explicite avec les deux intentions conservées,
sans transaction composite, nettoyage ciblé après commit confirmé seulement.

### R2 — Gate performance explicite A puis UI finale E

Mesurer dans le navigateur natif réel : parsing/rendu de décimales longues,
fractions finies/non finies, cumuls multi-Team, dirty/rebase, frappe et réactivité
(animation frame / durée des interactions), mémoire lorsque disponible. Consigner
moteur, échantillons, répétitions, coûts et limites dans la livraison. Les tailles
16/100/1000/10000 sont des sondes, jamais des limites acceptées.

Appliquer les protections §5 restant UX/Application (lexical, exceptions visibles,
texte préservé, cache borné au draft, coalescence, absence de reformatage à la
frappe, défilement). Si un risque de blocage reste non maîtrisé, documenter mesures,
alternatives et impact architectural puis **arrêter ce sous-travail pour arbitrage**.
Aucun plafond arbitraire, arrondi, troncature, conversion Number ou nouveau worker.
Une optimisation exacte Application devra être comparée au rendu Domain et testée
par round-trip, sans modifier Domain ni les commandes.

### R3 — Apply/Cancel explicites

- **Apply carte** : soumission des modifications admissibles de cette carte,
  selon gardes existantes ; ne confirme jamais la branche modale.
- **Apply modal** : soumission de la branche Actuals/RAF avec ses preuves et
  confirmations obligatoires ; Application seule décide no-op/A/B (R2 métier).
- **Cancel modal** : abandon de la branche modale uniquement ; restaure les
  drafts préalables raw sans publication.
- **Cancel carte** : abandon des drafts de la carte concernée uniquement.

Tests UX bloquants : fermeture/Escape, navigation, initialisation, frappe,
focus/blur et remount ne confirment aucun Actuals/RAF. Open/Back/Review ne créent
pas de preuve ; conserver V1/V2/R1 et les tests de focus/Cancel existants.
Labels/aide rendent la portée visible, sans bouton RAF dédié supplémentaire.

## 14. Livraison et arrêt

Amendement documentaire distinct committé et poussé avant tout code. Puis A → E,
gates complets §10/11, livraison avec SHA initial/final, commits distincts,
fichiers, counts exacts, scénarios natifs, mesures et limites, invariants,
réserves audit, status Git/origin. Commit et push normaux sur la branche existante.

**Statut attendu : 11D.1 UX — IN REVIEW**, arrêt pour audit indépendant ChatGPT.
Aucun DONE automatique, aucun autre lot commencé.
