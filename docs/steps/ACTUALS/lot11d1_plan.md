# Lot 11D.1 — UX Actuals & RAF

**Statut : PLANNED / NOT STARTED.** Plan documentaire du 2026-10-09.
**11D.0 reste DONE.** Audit indépendant ChatGPT puis autorisation explicite
requis avant toute implémentation. Ce document ne livre aucun code ni test,
ne constitue pas un canon d'implémentation et n'ouvre ni 11D.2 ni 11D.3.

## 1. Baseline Git vérifiée

Avant toute modification documentaire, `git fetch origin` a réussi.

| Vérification | Résultat |
| --- | --- |
| Dépôt local | `/Users/Kartaguez/FlowPlan2` ; dépôt demandé `kartaguez/FlowPlan2` |
| Branche active et cible | `codex/lot11a-portfolio-snapshots` |
| `git status --short` initial | Vide : arbre propre |
| HEAD réel | `05115e4df6ec59c1a045801389e310529634bb9c` |
| HEAD de référence demandé | `05115e4df6ec59c1a045801389e310529634bb9c` |
| `origin/codex/lot11a-portfolio-snapshots` après fetch | Même SHA |
| `git rev-list --left-right --count HEAD...origin/codex/lot11a-portfolio-snapshots` | `0 / 0` |
| Écart à examiner | Aucun : HEAD identique à la référence |

La baseline **d'implémentation validée** 11D.0 reste
`8d95f7406ff40a6d2d041b41784a3915173989c8`, citée dans les canons.
Elle est distincte du HEAD documentaire de départ ci-dessus. Aucun reset,
écrasement de modifications ou force-push n'est prévu. Aucun `AGENTS.md`
n'a été trouvé dans le dépôt ; aucun document 11D.1 préexistant n'a été trouvé.

## 2. Sources normatives consultées et priorité

- [Canon durable](../../canon.md), [canon courant](../../current_canon.md),
  [roadmap courante](../../current_plan.md).
- [10C.1 plan](./lot10c1_plan.md), [10C.1 canon](./lot10c1_canon.md),
  [10C.2 plan et compte rendu](./lot10c2_plan.md).
  Aucun canon séparé 10C.2 n'existe : le plan contient sa réalisation ; le
  canon courant atteste sa clôture DONE.
- [11A plan](../PORTFOLIO_SNAPSHOTS/lot11a_plan.md),
  [11A canon](../PORTFOLIO_SNAPSHOTS/lot11a_canon.md).
- [11A.2 / 11B plan](../HISTORY/lot11a2_11b_plan.md),
  [11A.2 canon](../HISTORY/lot11a2_canon.md), [11B canon](../HISTORY/lot11b_canon.md).
- [11C plan](../HISTORY/lot11c_plan.md), [11C canon](../HISTORY/lot11c_canon.md).
- [11D.0 plan, corrections et clôture](../STORAGE/lot11d0_plan.md),
  [11D.0 canon](../STORAGE/lot11d0_canon.md).

Les anciennes mentions IN REVIEW, les transactions localStorage/V5/V6 et les
intentions de refonte des anciens plans sont des traces historiques. Le canon
courant, les clôtures explicites et le code réel priment : 10C.2, 11A, 11A.2,
11B, 11C, 11D.0 sont DONE ; la production utilise le dispatcher repository
asynchrone, IndexedDB/CAS et V7. La stratégie de validation systématique 11D.0
remplace l'ancienne proposition de certificat. Aucun contrat historique n'est
réécrit par le présent lot. FlowPlan1 est une intention de continuité visuelle,
pas une source technique inspectée ni une architecture à recopier.

## 3. Cartographie réelle des composants

Les chemins ci-dessous ont été inspectés en lecture seule, avec recherche des
appels réels ; les tests résident auprès des modules dans `src/`.

| Zone / fichiers réels | EXISTANT — à préserver | À MODIFIER / À AJOUTER |
| --- | --- | --- |
| `src/domain/model/rational.ts`, `scalars.ts` | Rationnels réduits BigInt ; parse décimal point, fraction ; factories non négatives ; sérialisation canonique ; rendu fini sans précision possible | Aucun changement Domain prévu |
| `src/application/session/editableQuantity.ts` | Parse exact partagé, pourcentages exacts ; `EDITING_DECIMAL_PRECISION = 3` | Ajouter un rendu exact ciblé Actuals/RAF ; adapter le parse Application à la virgule ; contrôler ses consommateurs |
| `src/application/session/snapshotActualsViewModel.ts` | Snapshots et legacy typés, Teams Portfolio, participation, daily caps, RAF Forecast et allocations exacts | Projection de présentation compacte, dérivée seulement, si utile ; pas de nouvelle autorité |
| `src/application/session/projectEditViewModel.ts` | Texte RAF + `remainingWorkloadExact`, autorité `latest-actuals` / `current-configuration`, daily cap exact | Utiliser le rendu exact ciblé pour le RAF Forecast et Actuals |
| `src/application/session/teamReservationsEditViewModel.ts` | `buildReservationEditViewModel` ; ratio en pourcentage et fixed-daily, valeur exacte séparée | Préserver l'éditeur et ses unités ; caractériser l'effet du parse partagé |
| `src/ui/actuals/snapshotActualsDraftStore.ts` | Map RAM par objet ; baseVersion/ID ; textes canoniques copiés du modèle ; branche modale ; dirty canonique ; rebase/review à trois voies | Initialisation lisible exacte, sans reformater les textes déjà saisis ; conserver provenance et états de confirmation |
| `src/ui/actuals/parseSnapshotActualsCommand.ts` | Candidat complet, factories typées, intents, IDs conservés si inchangés, evidence sélective, refus stale | Appliquer le contrat de saisie commun ; messages précis, aucun allégement de preuve |
| `src/ui/actuals/createSnapshotActualsCardController.ts` | Synthèse cumulée exacte ; RAF rapide ; modal 2/3 étapes ; histoires V4/V5 readonly ; focus/trap/Escape | Période globale, trois/deux colonnes, rendu exact, historique compact et détails ; ajustements locaux de champs/erreurs |
| `src/ui/project-edit/createProjectEditController.ts`, `projectDraftStore.ts`, `parseProjectEditCommand.ts` | Sous-cartes Teams, membership, RAF Forecast ; latest-Actuals synchronisé via callbacks ; exact original préservé si champ untouched | Réduire le doublon RAF sous autorité snapshot ; comparer le RAF métier canonique pour dirty/rebase/parse, garder les textes invalides |
| `src/ui/project-edit/createProjectCreateController.ts` | Création sans snapshot, parser partagé `parseProjectFields` | Vérifier contrat décimal du RAF de création ; aucun changement de création métier |
| `src/ui/reservation-edit/createReservationEditController.ts`, `reservationDraftStore.ts`, `parseReservationEditCommand.ts`, `createReservationCreateController.ts` | Membership Forecast, allocations ratio/fixed, drafts indépendants | Aucune colonne RAF ni déplacement des allocations ; non-régression du parse partagé |
| `src/ui/timeline/renderTimelineShellNavigation.ts` | Cartes Project/Reservation, hôtes `.portfolio-card-content`, tabs, expansion, activation et reorder | Préserver navigation et identité des cartes |
| `src/ui/portfolio/createPortfolioEditControls.ts`, `createTeamSubcard.ts`, `src/ui/renderApp.ts` | Vrais formulaires, Apply/Cancel de carte, erreurs alert, Delete ; Team OFF sans détails | Composition locale pour placer les actions de carte après Actuals/history ; labels et associations de formulaire conservés |
| `src/ui/timeline/createTimelineUiCoordinator.ts`, `src/ui/actuals/actualsForecastConflict.ts` | Propriétaire des quatre stores ; dirty global ; handoff, nettoyage ciblé après succès, suspend/resume et remount | Adapter seulement wiring/présentation RAF et égalité exacte ; garder gardes de séquencement |
| `public/styles.css` | `.card-actuals-*`, matrice scroll interne, modal bornée, focus visible, frise wrap, styles cartes/Teams et media 420 px | Styles compacts spécifiques à la synthèse, sans comprimer la matrice éditoriale de modale |
| `src/application/session/planningSession.ts`, `src/domain/actuals/transition.ts`, `snapshots.ts`, `requirements.ts` | Commandes whole-object, exact no-op, evidence, bornes, versions et miroir RAF | HORS PÉRIMÈTRE de modification ; références de validation et de non-régression |
| `src/main/planning/createRepositoryPlanningDispatcher.ts`, `src/application/persistence/createPlanningRepository.ts`, `planningRepository.ts`, infrastructure IndexedDB | prepare → projection privée → writeCurrent CAS → publish ; recovery ; History séparé | HORS PÉRIMÈTRE de modification ; assertions d'intégration |
| `src/application/backup/planningInputCodec.ts`, codecs V5/V6/V7 et `flowplanBackupV1.ts` | `serializeQuantity` canonique, sources et histoires exactes | HORS PÉRIMÈTRE de modification ; round-trip V7 à vérifier |

### Structure UI constatée

Le shell crée les cartes et leur hôte. Le coordinateur ajoute d'abord le
formulaire Forecast créé par `createPortfolioEditControls`, puis une section
Actuals sœur. Les Apply/Cancel sont actuellement dans le formulaire Forecast,
avant la section Actuals. Les sous-cartes Team sont créées par les contrôleurs
Forecast ; leur toggle reste l'unique UI de membership. Les champs Actuals ne
sont pas les champs Forecast, même lorsque deux RAF sont synchronisés.

La synthèse actuelle répète `Actuals from` et `Actuals through` par Team ;
Project a cinq colonnes, Reservation quatre. Les cumuls sont déjà faits par
`addRationals`, jamais par float, mais affichés en fraction canonique (`25/2`).
Le statut principal contient version et knowledgeDate. Les détails V5 et V4
sont déjà des `<details>` sans `open`, donc repliés par défaut. Le code actuel
montre version/date/périodes/RAF, mais pas explicitement tous les snapshot IDs,
period IDs et marqueurs : leur accessibilité complète sera un ajout UI local.

La modale est montée sur `document.body`, hors du formulaire de carte. Elle
utilise des champs texte pour consommés/RAF, une matrice distincte, des champs
date validés au blur, une frise avec sélection contiguë, Back/Next, Apply final,
Cancel/Escape et une garde focus. Le coordinateur inclut la modale dans ses
gardes de navigation/raccourcis. Remount recrée les contrôles depuis les stores ;
suspend/resume conserve le DOM Planning. Aucune réécriture globale de l'éditeur
n'est nécessaire ni proposée.

## 4. Chemins de données et transformations à surveiller

### Actuals consommés et RAF sous autorité snapshot

```text
Domain quantity (WeakMap → Rational BigInt réduit)
→ SnapshotActualsViewModel (quantités typées, snapshot courant)
→ synthèse : addRationals des périodes ; aujourd'hui fraction canonique
→ draft fromModel : serializeQuantity exact, texte fraction
→ input DOM type=text ; événement input copie le texte brut dans le store RAM
→ branche modale / draft rapide (provenance, confirmations, base)
→ parseExactQuantityInput → consumedWorkloadFromSerialized / remainingWorkloadFromSerialized
→ parseSnapshotActualsCommand (intent, périodes, evidence, membership/daily caps/allocations)
→ replace-project-actuals / replace-reservation-actuals
→ PlanningSession.prepare → Domain transition/snapshot/Portfolio validation
→ projection candidate privée → encodePlanningInputs (rationnels canoniques)
→ repository.writeCurrent attendu CAS → commit confirmé → session.publish
→ rebase/rendu et nettoyage des seuls drafts concernés après succès
```

La synthèse de carte lit le snapshot **publié**, pas la somme de toutes les
versions ; elle ne prétend pas que les saisies de la modale sont publiées.
Le récapitulatif de modale peut calculer les totaux de sa branche exactement,
mais une cellule invalide/incomplète rend le total « incomplete », jamais zéro.
Le RAF visible de carte lit le draft RAM ; son origine/suggestion reste explicite.

### RAF Forecast, création, et deuxième champ de carte

```text
Project.requirements.remainingWorkload exact
→ ProjectEditViewModel : formatQuantityForEditing (3 chiffres) + serializedExact
→ projectValuesFromModel : latest-actuals prend l'exact ; sinon texte formaté
→ sous-carte Team type=text
→ Forecast projectDraftStore (comparaisons actuellement textuelles)
→ formValues : dirty textuel ; parse garde serializedExact si untouched
→ update-project / create-project si RAF Forecast autonome
  OU callback getActualsRaf / onActualsRafInput vers snapshot store si latest-actuals
→ coordinateur : RAF seul → applyCardRaf → replace-project-actuals
  OU membership dépendant → handoff unique → commande Actuals complète
→ même prepare/validation/projection/CAS/commit/publish
```

Le tableau rapide possède aussi un RAF même avant le premier snapshot ; le
store l'initialise depuis `forecastRaf` comme suggestion. Modifier ce champ
crée une intention de connaissance `initial` sans couverture ; modifier le
RAF Forecast pré-snapshot suit la commande Forecast. Ce sont deux intentions
existantes à rendre explicites, sans les fusionner par un nouveau service.
La modale possède encore son propre champ RAF **dans sa branche**, ce qui est
nécessaire au Cancel : il n'est pas un doublon d'autorité persistée.

Reservation : `teamReservationsEditViewModel` conserve `value` et `exact` ;
ratio → pourcentage à trois chiffres et `parseExactPercentageInput` (/100 exact),
fixed-daily → quantité et `parseExactQuantityInput`. Le parse Actuals transporte
l'allocation canonique du modèle ou du handoff, pas un nouveau champ RAF.
Ni unités, ni allocations Forecast ne sont simplifiées par 11D.1.

| Transformation actuelle | Risque précis | Traitement futur |
| --- | --- | --- |
| `formatQuantityForEditing(..., 3)` | **Troncature**, pas arrondi : `1/3 → 0.333`, `1/10000 → 0` ; un champ re-saisi peut changer la vérité | Rendu exact ciblé ; conserver l'exact original des champs untouched |
| `formatPercentageForEditing` | Même troncature mais hors Actuals/RAF ; effet partagé à contrôler | Ne pas changer la politique des pourcentages dans ce lot |
| Parse décimal Domain | Point seulement, syntaxe stricte, BigInt exact ; virgule invalide | Normalisation Application ciblée avant parse, aucun float |
| Dirty/rebase Actuals `values`, `mergeExact`, `review` | Équivalence déjà canonique ; virgule ne l'est pas encore ; parse répété pendant frappe | Étendre normalisation, préserver textes bruts, réduire calculs redondants |
| Dirty/rebase Forecast Project + `remainingWorkloadDirty` | Égalité textuelle peut faire diverger `1.25`, `5/4`, rendu point/virgule | Égalité exacte pour RAF valide ; fallback texte pour invalide/incomplet ; conserver structure/membership dirty |
| renderQuick | Valide immédiatement et affiche une erreur générique pour `1,`/vide ; ne détruit pas le texte ; ne réécrit pas le champ focus | Distinguer édition en cours de refus à Apply, éviter annonce d'erreur intrusive par frappe |
| Rendu/remount | fromModel fractions, hydrate ou synchronisation peut remplacer un texte par un autre ; focus DOM perdu au rebuild | Formater seulement une initialisation propre ; texte/selection de draft restaurés ; focus logique par objet/Team/champ |
| Evidence | Changer le format ne doit pas valoir confirmation ni perdre copied/needs-confirmation | Convertir la présentation sans toucher provenance/rafConfirmed ; confirmation reste geste explicite |
| No-op | Domain compare les rationnels et la partition ; dispatcher évite projection/write si même état | Tester ouverture/Apply inchangé et équivalences ; préserver IDs et exacts |
| Number | Pas de conversion quantité métier constatée dans ces chemins ; Number/Math pour index, étapes et dates | Interdire parseFloat/Number/toFixed dans conversion de quantité ; pixels et compteurs restent hors vérité métier |

## 5. Contrat de saisie numérique exact

**Décisions utilisateur acquises** : entiers, point et virgule ; décimales finies
sans plafond de précision UX ; fractions exactes ; non négatif ; aucun séparateur
de milliers ; drafts incomplets ; aucune approximation ; V7 inchangé.

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
bornée avec défilement, sans découper sa valeur. Mesurer après autorisation des
longueurs croissantes (16, 100, 1 000, 10 000 chiffres comme échantillons, **pas
comme limites**), fractions à grand dénominateur et matrice multi-Team.
Comparer parsing, dirty, rendu et Apply, avec moteur/navigateur et tailles notés.

**Point de vérification A** : si ces mesures exigent une protection de budget
CPU/mémoire ou un déport de calcul Application, documenter le cas, le coût, la
valeur exacte conservée, l'erreur visible et la stratégie avant adoption. Ne
pas introduire maxlength, slice, precision=3 ou refus silencieux de longues
valeurs. Un garde de ressources est technique, distinct du nombre de décimales
acceptées ; un seuil chiffré refusant des entrées demanderait un arbitrage étayé
avant ce sous-travail. Aucun seuil ni nouveau worker n'est décidé par ce plan.

## 6. Présentation concrète des cartes

### Project

```text
Actuals & RAF
Actuals period: 01/09/2026 → 30/09/2026

Team          Consumed (j.h)      RAF (j.h)
Alpha         12,5                [ 8,25 ]
Beta           7,5                [ 5    ]

[Update actuals…]
History ▾
                         Apply   Cancel
```

**À MODIFIER** : une période globale au-dessus du tableau ; supprimer les
colonnes de dates répétées. Cumuls exacts du snapshot courant par Team, ordre
Portfolio, pas de quotidien ni de cumul des snapshots. RAF texte directement
éditable, sans ouvrir la Team. Labels visibles/associés incluant Team et unité.
Le titre, la période et les boutons restent lisibles à 390 px.

**EXISTANT** : sous-cartes Forecast pour membership et paramètres, activation,
Delete, reorder, dirty, Apply/Cancel de carte. **À MODIFIER** : sous autorité
snapshot, retirer le second champ RAF éditable du panneau Team et son texte
technique redondant ; le tableau devient l'entrée rapide unique pour ce RAF.
Conserver l'exact dans le modèle/commandes et le dailyCap caché ; ne pas retirer
un requirement parce que son champ est absent du DOM. Sans snapshot, le RAF
Forecast reste dans son éditeur existant ; le tableau indique distinctement
« RAF Forecast suggestion — not recorded » et son édition prépare un premier
RAF de connaissance. Cette coexistence garde le séquencement actuel au §7.

**À MODIFIER** : composition des sections/actions pour une lecture Forecast →
Actuals/RAF → Update actuals → History → Apply/Cancel de carte. Réutiliser les
boutons et handlers existants. Une solution locale possible est un hôte Actuals
stable dans le formulaire de carte, entre fields et actions ; la modale reste
hors formulaire. Ne pas imbriquer les formulaires, créer de submit parasite,
ni déplacer Actuals dans un conteneur `fields` effacé par hydrate. Le détail DOM
est une proposition à vérifier par les tests de composition, pas une obligation.

### Reservation

Même bloc compact, titre `Actuals`, même période globale et deux colonnes
`Team | Consumed (j.h)`. **Aucune colonne RAF** ; aucune commande RAF. Zéro,
une ou plusieurs Teams acceptées : état vide lisible si aucune participante,
sans ligne zéro fictive. Les allocations Forecast ratio/fixed-daily restent
dans leurs sous-cartes et gardent leurs unités, dates et éditeur.

### Historique et états spécifiques

**EXISTANT** : lecture seule et repli par défaut. **À MODIFIER** : entrée
`History` compacte, avec sections V5 et legacy V4 identifiées. **À AJOUTER** :
détails accessibles version, knowledgeDate, snapshotId, couverture/partition,
periodIds, participation/retiredZeroTeams, quantités et RAF Project exacts ;
legacy conserve ses dates/cumuls/RAF/provenance disponibles sans inventer d'ID
V5. Les détails techniques ne figurent plus dans le résumé principal.
L'historique est celui des objets dans Current ; il ne demande aucun chargement
de captures **Portfolio History**. Pas d'édition/restauration/suppression dedans.

| État | Présentation et comportement attendus |
| --- | --- |
| Aucun snapshot, aucun legacy | « No Actuals recorded » ; période inconnue, Consumed `—` ; RAF Forecast suggestion, jamais connaissance zéro |
| Snapshot RAF-only / sans couverture | « No Actuals coverage » ; période `—`, Consumed `—` ; RAF enregistré exact, même s'il vaut zéro |
| Snapshot couvert | Une période globale, cumuls exacts par Team ; RAF snapshot autoritaire |
| Couverture connue, consommation nulle | Dates présentes et `0`, jamais absence ; borne Project 11C toujours active |
| Legacy V4 pending | Message explicite de réconciliation ; historique readonly ; ne pas présenter des deltas legacy comme une partition V5 confirmée ; entrée « Reconcile legacy Actuals » conservée |
| Actuals/RAF draft | RAF saisi visible, carte dirty ; consommés publiés dans la carte et preview de branche dans la modale identifiés ; suggestion/confirmation sans ambiguïté |
| Stale / conflit objet | Message visible, Apply refusé ; textes conservés, revue explicite ou Cancel selon le contrat existant |
| Validation / persistance en échec | Erreur précise et drafts conservés ; abort prouvé distinct de recovery obligatoire ; pas d'annonce de succès ni de nettoyage prématuré |

## 7. Interaction carte/modale et ownership

| Geste | Contrat EXISTANT à préserver ; adaptation uniquement de présentation |
| --- | --- |
| Frappe RAF rapide | Store snapshot RAM pour cette carte, aucune mutation session/projection/persistance ; désactivée quand sa modale est ouverte |
| Apply global, RAF seul | Même `applyCardRaf`, commande `replace-project-actuals` initial ou raf-only ; ancienne couverture/périodes/consommés copiés exactement |
| RAF et autres champs Forecast dirty | Le coordinateur refuse aujourd'hui si ces changements ne peuvent être publiés atomiquement ; garde les deux intentions et explique le séquencement. Ne pas ajouter de transaction combinée hors contrats existants |
| Ouverture modale | Copier le draft RAF de carte dans une branche modale, montrer sa provenance ; l'original, même invalide, reste conservé |
| Next/Back | Garder valeurs, sélection, provenance et confirmations ; aucun dispatch intermédiaire |
| Apply final modale | Validation complète des preuves ; une commande whole-object, une projection et un commit effectif ; nettoyage ciblé seulement après succès |
| Cancel/Escape modale | Supprimer uniquement la branche, restaurer exactement le draft de carte préalable et le Forecast ayant déclenché un handoff |
| Cancel global carte | Restaurer Forecast et Actuals/RAF publiés pour cet objet ; autres cartes inchangées |
| Handoff Forecast → Actuals | Membership cible + paramètres transportables + evidence/RAF dans un candidat unique ; pas de publication Forecast préalable |
| Échec | Conserver branches, textes, Forecast, bases, conflits et autres drafts ; pas de nouvelle version sur validation/refus/abort prouvé |
| No-op | Équivalence canonique et partition identique : pas de snapshot/version/write/projection. Exception existante : établissement explicite du premier snapshot (modale initial/reconcile) est une nouvelle connaissance même si RAF égale la suggestion Forecast |

Ne pas créer Apply RAF/Revert RAF. L'Apply modal demeure l'action finale de la
transaction Actuals ; il ne remplace pas l'Apply de carte des éditions directes.
Ne pas convertir le fait d'ouvrir, de reformater ou de fermer un champ en
établissement implicite de connaissance initiale.

## 8. Drafts, confirmations, conflits et stockage 11D.0

**EXISTANT** : deux instances du store Actuals (Project/Reservation) et deux
stores Forecast possédés par le coordinateur, plusieurs cartes dirty possibles.
Le Domain reste seul juge du candidat. Dirty compare la valeur exacte pour un
RAF complet ; les incomplets restent des différences textuelles récupérables.
Aucun résultat de parsing ne remplace le texte saisi dans le store.

Les marqueurs copied/user-entered/user-confirmed/domain-zero-propagated/
needs-confirmation et rafConfirmed sont indépendants du formatage. Une borne
modifiée, split, merge ou remplacement non nul ne proratisent jamais. Une
suggestion visible doit être explicitement confirmée ; un RAF rendu autrement
ne confirme rien. Changement d'actualsThrough exige confirmation de tous les
RAF participants ; participation nouvelle exige chaque cellule, même zéro.

Rebase automatique seulement si membership/partition compatibles et champs
sans conflit ; comparaison à trois voies sur exact canonique. Partition
concurrente ou même champ changé différemment → stale, textes gardés. Modale
ouverte : aucun rebase silencieux ; `review` explicite n'est possible que dans
les cas sûrs actuels. Le parse et le Domain revérifient la baseVersion ; le CAS
repository protège en plus contre une révision distante de Current. Ces deux
contrôles ne sont pas interchangeables.

**EXISTANT — 11D.0** : drafts uniquement RAM, non exportés comme données Current.
Le root devient inert durant le commit ; erreur/pending ne détruit pas les
owners. `writeCurrent` ne lit/réécrit aucune capture Portfolio History ; les
histoires Actuals détenues par l'objet restent dans Current et préfixes immuables.
Publication uniquement après validation, projection privée et commit confirmé.

Abort certain → erreur/retry avec draft gardé. Commit incertain, commit confirmé
mais réconciliation locale impossible, ou Current distant → recovery obligatoire,
mutations bloquées, draft visible/conservé, reload explicite avec confirmation
de perte des drafts RAM. Ne pas annoncer rollback si le commit est inconnu,
ne pas relancer automatiquement Apply ni créer une révision locale de secours.
Pas de modification IndexedDB, CAS, receipts, migrations ou récupération.

## 9. Architecture et fichiers potentiellement impactés

**À MODIFIER / À AJOUTER après autorisation seulement** :

- Application : helper exact dans `editableQuantity.ts` ou module voisin exporté
  par `src/application/index.ts` ; parse décimal localisé ; format RAF dans
  `projectEditViewModel.ts` ; projection compacte dans `snapshotActualsViewModel.ts`
  seulement si elle rend l'agrégation testable sans dépendance DOM.
- UI Actuals : les trois fichiers store/controller/parser et messages,
  récapitulatifs exacts, labels et historique.
- UI Forecast Project : contrôleur/store/parser pour égalité sémantique du RAF,
  retrait du doublon snapshot et conservation des commandes/fields exacts.
  Contrôleur Create seulement si un changement local de champ est nécessaire.
- Composition : `createTimelineUiCoordinator.ts`, `createPortfolioEditControls.ts`,
  types de contrôles dans `renderApp.ts` si un hôte stable est exposé.
  Shell/TeamSubcard seulement si un besoin précis est démontré ; pas de refonte.
- `public/styles.css` : séparer styles du tableau compact et de la matrice modale.
- Tests Application et UI listés au §12 ; intégration storage/backup uniquement
  pour renforcer les garanties existantes, sans modification de leurs contrats.

**HORS PÉRIMÈTRE** : moteur et reconstruction ; sémantique Forecast/History ;
Domain ; IndexedDB/CAS ; formats V5/V6/V7 ; captures Portfolio ; dépendances,
scripts ; daily contributions 11D.2, navigation/replay 11D.3.
Le partage du parseur ne constitue pas une autorisation de remodeler tous ses
consommateurs. Garder le formatage des capacités/pourcentages existant.

Si une impossibilité Domain apparaît, arrêter ce sous-travail et documenter
le candidat concret, l'invariant, pourquoi UI/Application ne suffit pas, le
changement minimal et impacts compatibilité/tests pour audit séparé. Une
simplification de code n'est pas une justification. Les API actuelles couvrent
le rendu décimal fini/fraction et les transactions nécessaires.

## 10. Invariants et risques

| Risque | Mitigation / preuve attendue |
| --- | --- |
| Perte des décimales longues ou de `1/3` lors du rendu | Rendu sans précision, fallback fraction exacte, round-trip canonique ; untouched garde original exact |
| Changement dirty/conflict dû à une virgule ou un rendu | Comparaison métier exacte du RAF, fallback brut incomplet ; pas de changement de membership masqué |
| Mise en forme prise pour confirmation | Provenance et evidence inchangées ; tests de suggestions ambiguës et confirmation RAF |
| Second owner RAF après retrait du champ Team | Tableau relié au store existant ; modèle/commandes toujours complets ; callbacks et drafts antérieurs caractérisés |
| Deux intentions pré-snapshot confondues | RAF Forecast vs suggestion de connaissance explicitement libellés ; séquencement/conflict actuel préservé |
| Apply soumis au mauvais formulaire | Hôte stable hors fields hydratés ; modale hors formulaire ; tests Enter, submit et un seul dispatch |
| Coût BigInt / développement fini gigantesque | Protections §5, mesures ciblées, cache temporaire ; aucun seuil de précision silencieux |
| Draft perdu au remount / recovery | Texte brut et branche dans store ; tests collapse/tabs/suspend/rebuild ; pas de cleanup sur failure |
| Confusion absence/covered-zero | Discriminants source/couverture, dates et `—`/`0` distincts ; ne pas déduire couverture d'occupation positive |
| Édition Current recharge Portfolio History | Espions repository : aucun readSnapshot/content/write History ; captures byte/structure identiques |
| 390 px, noms et chiffres longs | Colonnes réduites, min-width:0, taille de champ bornée, scroll interne ; boutons/erreurs visibles, document sans overflow |
| Test ancien contourné | Garder toutes les assertions métier ; changer seulement sélecteurs/libellés/layout nécessaires, ajouter les cas UX manquants |

Invariants supplémentaires : valeurs non négatives ; couverture contiguë incluse
avant knowledgeDate ; IDs copiés pour périodes unchanged ; pas de somme des
snapshots ; RAF indépendant des consommés ; dailyCap préservé ; exclusivité
legacy/V5 ; borne 11C globale au Project y compris consommation zéro ; activation
ne change pas Actuals ; aucun recalcul durant frappe/navigation ; V7 autonome
exact ; captures historiques immuables ; commit précède publication.

## 11. Découpage ordonné et points de vérification

Chaque étape reste future et contrôlée par audit/autorisation ; commencer par
caractériser les chemins réellement touchés, puis modifier localement.

| Étape | Travail futur | Gate avant suite |
| --- | --- | --- |
| A — conversion exacte | Helper rendu fini/fraction, normalisation virgule, égalité canonique et erreurs ressources ; mesures BigInt ciblées | Tableau numérique §12 passant ; round-trip, no-op et limites documentés ; arbitrage technique seulement si cas mesuré l'exige |
| B — carte compacte | Cumuls présentés exactement, une période, états absents/zero/legacy, historique détaillé replié, hôte/actions | Project/Reservation 0/1/N Teams ; aucun changement commande/session ; carte et formulaires accessibles |
| C — RAF Forecast/Actuals | Rendu exact de tous les RAF concernés ; retirer doublon snapshot, comparaison dirty/rebase exacte, wiring ciblé | RAF rapide et Forecast pré-snapshot, créations, équivalences, conflits et handoff ; aucune seconde autorité |
| D — modale/responsive | Appliquer le rendu aux champs/récapitulatifs et labels ; erreurs, focus/restoration/remount ; CSS spécifique | Toute capacité existante conservée, aucune evidence inventée ; clavier et 390 px/desktop |
| E — intégration et revue | Suite complète, V7, CAS/failures/recovery/History, revue navigateur et diff de portée | Critères §13 satisfaits ; livraison pour audit d'implémentation, sans auto-DONE |

L'ordre A → B → C → D → E reprend le séquencement indicatif. B inclut
l'historique car il appartient à la synthèse de carte ; D ne refond pas l'éditeur.
Les tests ciblés accompagnent chaque étape, E consolide les non-régressions.
Si B/C doivent être livrés ensemble pour éviter temporairement un doublon ou
un formulaire incomplet, garder leurs gates distincts et un commit cohérent.
Aucun sous-lot Domain/storage/engine n'est ajouté.

## 12. Matrice détaillée de tests futurs

Les suites existantes ont été inspectées ; aucun test n'est ajouté, modifié ou
exécuté dans cette passe documentaire. Les anciens fixtures synchrones
caractérisent le métier ; ils ne prouvent pas seuls le CAS asynchrone 11D.0.
Les résultats 935/935 + 3/3 de 11D.0 sont des résultats historiques, pas des
validations 11D.1.

| ID | Scénarios minimum | Oracle / couche et suites à utiliser |
| --- | --- | --- |
| N1 | `0`, `12`, `1.25`, `1,25`, `5/4`, `1.2500`, `0,0001`, nombreux chiffres fractionnaires | Sérialisation canonique exacte attendue, aucun Number ; `editableQuantity.test.ts` et parser Project/Actuals |
| N2 | `1/3`, `2/7`, fini `1/8`, fraction équivalente `10/8` | Fraction infinie préservée ; fini entièrement décimal ; parse(format(q)) = serialize(q) |
| N3 | `-1`, `-0.1`, `-1/3`, denominateur zéro ; caractériser `-0` | Négatifs rejetés par factories, état publié intact ; zéro signé conforme au contrat §5 |
| N4 | Vide, `1,`, `1.`, `1/`, `-`, texte ; mix point/virgule, espaces/groupements, exposants, `01`, `.5` | Texte présent dans draft après input/blur/remount ; incomplet/invalide inapplicable, message ciblé ; pas de zéro implicite hors règle Domain-zero |
| N5 | Entier > 2^53, très grand numérateur/dénominateur ; petites valeurs < 0.001 ; longue partie finie et développement de puissance 2/5 | Exact attendu BigInt, jamais scientifique/tronqué ; mesures et erreurs ressources visibles sans perte de draft ; longueurs échantillons §5 |
| N6 | Domain → VM → champ → draft → parse → commande → Domain ; ouverture, Apply unchanged, Cancel | Exact identique, period IDs/partition inchangés ; aucun snapshot/projection/write pour no-op existant ; helper/Application et UI |
| N7 | `1,25` vs `1.25` vs `5/4` en dirty, rebase et conflit des RAF Forecast/Actuals | Même métier, pas de faux conflit/version ; invalide différent reste dirty ; `projectDraftStore.test.ts`, `actualsWorkflow.test.ts`, parser Project |
| C1 | Project 1/N Teams ; Reservation 0/1/N Teams ; noms longs | 3/2 colonnes, une période globale seulement, ordre Portfolio, cumuls exacts multi-périodes ; `createSnapshotActualsCardController.test.ts` |
| C2 | Aucun snapshot, RAF-only positif/zéro, covered zéro, covered positif, total erosion | `—` vs `0`, suggestion vs RAF enregistré, borne non positive toujours connue ; tests VM/controller et session existants |
| C3 | Legacy V4 pending puis V5 réconcilié avec legacy retenu | Action reconcile explicite, histoires repliées readonly, détails accessibles ; aucune somme double/partition inventée |
| C4 | RAF rapide, autre champ Forecast dirty, création Project RAF décimal/fraction, plusieurs cartes dirty | Simulation inert ; Apply/Cancel global, gardes existantes, nettoyage ciblé ; contrôleurs Project/Create et coordinator multidraft |
| C5 | RAF pré-snapshot Forecast édité et suggestion Actuals éditée, équivalente ou contradictoire | Deux intentions distinguées, conflit/séquencement sans perte ; premier snapshot seulement par validation explicite de connaissance |
| M1 | Première saisie Project/Reservation ; RAF-only → première couverture | Ouverture directe aux périodes ; 3/2 étapes adaptées ; candidate complet et explicit zero validé |
| M2 | Prepend/append, zone centrale 1/N périodes, remplacement partitions | Hors-zone copié exact et mêmes IDs, dates contiguës, bon intent/editedZone ; controller, `actualsWorkflow.test.ts` et suites Domain existantes |
| M3 | Split/merge/bornes déplacées/retrait de périodes/érosion | Aucun prorata non nul ; suggestions needs-confirmation, evidence sélective ; zero propagation seulement connue ; tests de refus conservés |
| M4 | Changement through, RAF inchangé/modifié, changement from seul | Confirmation RAF quand nécessaire ; format équivalent ne remplace pas la preuve ; consommation ambiguë explicitement confirmée |
| M5 | Back, Cancel à chaque étape, Escape ; RAF invalide/long avant ouverture | Branche supprimée uniquement, RAF carte/Forecast originaux restaurés textuellement ; remount garde étape et données ; focus Update actuals ou carte |
| M6 | Snapshot concurrent, RAF disjoints/identiques/conflictuels, partition/membership concurrent | Rebase sûr seulement ; modal stale jusqu'à review ; base ID/version cohérents, erreurs et textes gardés |
| M7 | Handoff Project et Reservation : ajout/retrait/réintroduction, RAF rapide préalable, autre champ dirty | Une commande/evidence complète ; aucune publication préalable ; retrait impossible refusé ; Cancel/failure garde Forecast ; success nettoie cet objet seulement ; coordinator multidraft |
| I1 | Frappe numérique, changement de tab/collapse, suspend/resume et remount | Zéro dispatch/projection/write ; texte/dirty indépendants ; `createTimelineUiCoordinator.multidraft.test.ts`, stores/controllers |
| I2 | Validation/refus Domain/projection failure, abort de persistance prouvé | Session/projection/token inchangés, draft/modal/erreurs conservés ; `actualsWorkflow.test.ts`, `planningSession.lot10c1.test.ts`, dispatcher async |
| I3 | CAS concurrent, ack perdu/commit incertain, publication locale impossible après commit | Recovery bloque mutations, garde drafts jusqu'au reload explicitement confirmé ; pas de faux rollback ni retry automatique ; `createRepositoryPlanningDispatcher.test.ts`, UI recovery existante |
| I4 | Apply métier effectif / no-op équivalent | Respectivement une projection et un writeCurrent effectif / zéro ; un snapshot effectif ou zéro version ; repository spies et session |
| I5 | Export/import V7 après décimales longues et `1/3`, legacy retenu, captures schemas 1/2 existantes | Canonical rationals exacts, captures/IDs/valeurs historiques inchangés ; suites backup V5/V6/V7, `portableBackupParts.test.ts`, `repositoryTransfer.test.ts` |
| I6 | Simple édition Current avec nombreuses captures Portfolio | Aucun chargement/readSnapshot de payload History, aucune mutation History/content/metadata/indices de capture ; `planningRepository.test.ts` et dispatcher async |
| U1 | 390 px et desktop 1440 px, 0/1/N Teams, noms et quantités longues ; modale scroll | scrollWidth document = innerWidth ; scroll interne seulement si nécessaire, dates/boutons/erreurs accessibles, aucune valeur DOM coupée |
| U2 | Tab/Shift+Tab, Enter, Escape, frise arrows, focus après succès/Cancel/review/remount | Labels Team/unité, focus visible/trap/restoration, alert sans annonce intrusive à chaque frappe, aucune soumission croisée ; contrôleurs et revue navigateur |

Suites supplémentaires à préserver : `projectEditViewModel.test.ts`,
`teamReservationsEditViewModel.test.ts`, parsers/contrôleurs/stores Reservation,
`createTimelineUiCoordinator.test.ts`, navigation/TeamSubcard,
`planningSession.lot10c1.test.ts`, `src/domain/actuals/snapshots.test.ts`,
projections 10C.1/11C, persistence/backup/Portfolio captures et History existants.
Le test actuel qui vérifie `formatQuantityForEditing(1/3) = 0.333` peut rester
pour la fonction historique hors RAF ; ajouter le contrat exact ciblé plutôt
que supprimer sa protection. Les tests de layout devenus obsolètes changent
seulement leurs attentes de structure ; conserver les assertions métier,
transactions, evidence et focus. Aucun skip ni affaiblissement pour faire passer
la nouvelle disposition.

Les tests V6/V7 se trouvent notamment dans
`src/application/portfolioSnapshots/portfolioSnapshots.test.ts` et
`dailyProfiles.test.ts` ; les codecs n'ont pas chacun une suite éponyme.

Gates futures : `npm run typecheck`, `npm test`, `npm run build` ; suites storage
natives et portable existantes adaptées au risque, dont `npm run test:storage`
et `npm run test:portable` pour intégration 11D.0/V7. Pas de nouvelle dépendance,
script ou stack E2E. Revue réelle navigateur en stockage isolé, desktop et 390 px,
avec captures et résultats consignés après autorisation d'implémentation.

## 13. Critères d'acceptation vérifiables

1. Tous N1–N7 passent : point/virgule/fractions, aucune perte exacte, aucune
   limite artificielle de décimales ; erreurs ressources distinctes documentées.
2. Le rendu Actuals/RAF ne passe jamais par precision=3 ni Number ; fini complet
   ou fraction exacte, y compris cumuls et suggestions. Les drafts bruts survivent.
3. Période globale unique ; Project trois colonnes, Reservation deux ; toutes
   les distinctions de source/couverture/zero du §6 vérifiées.
4. RAF rapide intégré aux Apply/Cancel de carte, aucun bouton RAF spécialisé ;
   champ snapshot redondant supprimé sans perte de membership/dailyCap/exact.
5. Toutes les capacités modales M1–M7 conservées ; preuve explicite requise,
   aucun prorata non nul et aucun changement de borne transformant une suggestion
   en consommation confirmée.
6. Plusieurs cartes dirty restent indépendantes à travers commit, tab, collapse,
   remount et navigation ; Cancel modal vs global respectent leurs owners.
7. Frappe = aucun recalcul/write ; action effective = un commit ; no-op = aucun
   snapshot ni commit. Échec garde les textes ; outcome incertain impose recovery.
8. V7 et captures historiques restent exacts et identiques ; simple édition
   Current n'accède pas aux payloads Portfolio History et ne contourne pas CAS.
9. Desktop/390 px, clavier/focus/labels/erreurs réussissent sans overflow document,
   sans boutons inaccessibles ni texte métier tronqué dans la valeur d'un champ.
10. Gates complètes réussies, tests existants préservés ; diff de production futur
    limité à UI/Application présentation/CSS nécessaires. Tout élargissement
    démontré revient en audit avant implémentation concernée.

## 14. Questions, propositions et blocages

Aucune impossibilité Domain ni blocage métier identifié à cette baseline.
Les décisions fonctionnelles du mandat ne sont pas rouvertes.

Propositions à auditer : helper exact **ciblé**, virgule de présentation sans
localiser la sérialisation ; tableau unique pour le RAF sous snapshot ; garde
existante pour RAF + autres champs Forecast ; hôte de composition stable plutôt
qu'une refonte de la modale. Les noms de helpers et la structure DOM exacte
seront choisis avec les tests après autorisation.

Seul arbitrage technique conditionnel : si des mesures A prouvent qu'une entrée
ou un rendu exact dépassent les ressources utilisables, valider une protection
explicite et son comportement, sans limite de précision métier silencieuse.
Aucun chiffre de limite ou promesse de performance n'est acquis sans mesure.
La revue FlowPlan1 n'est pas nécessaire pour ces critères ; aucun accès à son
code n'est présumé.

## 15. Livraison documentaire et arrêt

Seuls ce fichier et `docs/current_plan.md` sont autorisés à changer.
Avant commit : vérifier diff/stat/paths, `git diff --check`, 11D.0 DONE et
11D.1 PLANNED / NOT STARTED. Commit documentaire puis push normal sur
`origin/codex/lot11a-portfolio-snapshots`, vérifier arbre propre et avance/retard
0/0. Le SHA documentaire et le résultat Git sont fournis dans le rapport final,
pas par auto-référence dans ce fichier.

**Aucune implémentation commencée. 11D.1 PLANNED / NOT STARTED.**
Arrêt après commit/push documentaire. Prochaine étape : audit indépendant du
plan par ChatGPT ; seule une autorisation explicite après cet audit peut ouvrir
l'implémentation. 11D.2 et 11D.3 restent hors périmètre et non commencés.

## Downstream RAF model amendment — 11D.1 (IN REVIEW)

The historical release described above is preserved. The separately authorized
[11D.1 RAF Model delivery](./lot11d1_raf_model_canon.md) supersedes permanent
RAF equality and quick RAF-only snapshot publication in the current application.
Requirements own current RAF; snapshot RAF is immutable historical knowledge.
Actuals publication aligns them atomically, with Application R2 and conditional
R1 confirmations. V8/inputs2 version this semantics while V1–V7/inputs1 retain
historical validation. No presentation redesign, replay or inputs-only work is
included. The future UX plan must use this model before any implementation.
