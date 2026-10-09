# 11D.1 UX — IN REVIEW

Livraison du 2026-10-09 pour audit indépendant ChatGPT. **Pas de clôture DONE.**
11D.0 et RAF Model restent DONE ; aucun autre lot commencé.

## Références et ordre des travaux

- Branche : `codex/lot11a-portfolio-snapshots`, dépôt `kartaguez/FlowPlan2`.
- SHA initial : `075b2a6c18175eabdcbdb401556a81591f32635f`.
- Fetch initial réussi, branche/HEAD attendus, arbre propre, origin `0/0`.
- Amendement documentaire : `e9fe269287474dd9f152fc3d35c7a059a272f6b0`,
  committé et poussé **avant** tout code. R1 propriétaire unique, R2 gate
  performance bloquant, R3 Apply/Cancel explicites intégrés au plan existant.
- Implémentation : commit distinct suivant l'amendement ; SHA final fourni dans
  la livraison Git, sans auto-référence dans ce commit. Push normal, sans reset
  ni force-push. Vérification finale arbre/origin dans le compte rendu.

Sources : canon durable/courant, roadmap, plan UX amendé, plan et canon RAF Model,
corrections V1/V2 et confirmations R1 finales. Ces contrats restent normatifs.

## Résultat A → E

**A.** Parser Application lexical-first : point, virgule, fractions exactes,
rejets complets, exceptions BigInt non applicables, raw conservé. Helper ciblé
Actuals/RAF : décomposition exacte 2/5, mise à l'échelle BigInt et virgule complète,
sinon fraction réduite. Aucun Number métier, arrondi, plafond ou troncature.
L'ancien helper trois chiffres reste pour ses autres consommateurs. Le helper
exact optimisé est confronté au rendu Domain sans précision et au round-trip.

**B.** Project `Team | Consumed (j.h) | RAF (j.h)`, Reservation deux colonnes,
période publiée commune. Consumed cumule uniquement le snapshot courant ; absence
`—`, zéro `0`, legacy readonly. History replié contient snapshotId/version/date,
partition/periodIds, participants/retraits, consommés/RAF historiques exacts et
provenance V4. Hôte stable hors fields hydratés, avant actions ; modal sur body.

**C.** Un seul RAF éditable pour chaque membre publié, avant/après snapshot.
Le Forecast transporte requirements et caps depuis modèle/store sans dépendre
d'un input absent. Nouveau membre garde son RAF initial explicite, puis rejoint
le tableau après commit. Gardes RAF/Forecast et handoff inchangés ; aucun composite.
Les deux ordres de frappe/refus conservent les intentions, plusieurs cartes et
leurs bases RAM. Rebase/review restent à trois voies avec invalidation sélective.

Le scénario natif ajouté a révélé une écriture Forecast inutile après un Apply
RAF puis un deuxième Apply propre. Correction UX : uniquement si **commande et
Forecast sont effectivement inchangés**, Apply utilise la validation de base/no-op
A existante. Membership, champs, groupes/couleur et caps différents conservent
le parcours Forecast. Aucune règle métier de commande modifiée. Régression Node
et native vérifie état/projection et zéro commit répété.

**D.** Labels `Apply card` / `Cancel card`, `Apply modal` / `Cancel modal` et
portée accessible. Preview modale distincte du publié, Review mentionne Current
Actuals/RAF. Ouverture, initialisation, focus/blur, frappe, navigation, Back,
Cancel/Escape et remount ne créent pas de preuve. Cancel modal préserve les drafts
préalables ; Cancel carte ne nettoie que sa carte. Champs désactivés pendant la
branche, focus trap/restoration conservés, longues valeurs scrollables intégrales.

**E.** Toutes les suites existantes restent actives. Seuls selectors/libellés et
attentes de texte formaté obsolètes sont adaptés ; les assertions métier/identité/
preuve/atomicité restent. **40 nouveaux tests Node** : 34 numériques, six UX.

## Gates exécutés

[Rapport brut complet](./lot11d1_ux_validation.txt),
[preuves natives et mesures](./lot11d1_ux_browser.json).

| Gate | Résultat |
| --- | --- |
| `npm run typecheck` | PASS, exit 0 |
| `npm test` | PASS, **1049/1049**, 96 suites, zéro fail/cancel/skip/todo |
| `npm run build` | PASS, exit 0 |
| `npm run test:portable` | PASS, **3/3**, zéro fail/cancel/skip/todo |
| `npm run test:storage` | PASS, Edge 154, **15 assertions repository** + UI/upgrade/layout/quota injectée |
| `node scripts/browser-storage-audit-test.mjs` | PASS, **22/22** scénarios, zéro fail/skip |
| `node scripts/browser-raf-final-test.mjs` | PASS, **11/11 V1/V2/R1 + 4/4 UX**, gate performance et clavier natif |
| `git diff --check` | PASS, exit 0, aucun output |

**1052 tests Node uniques** (tests ciblés inclus, pas additionnés une deuxième
fois). **37 scénarios navigateur** distincts, séparés du total Node et des
15 assertions repository. Les gates stockage ne sont pas remplacés par mocks.
Origines/profils isolés ; aucune base utilisateur ouverte/modifiée.

Matrices N1–N8/C1–C6 : exact entier/point/virgule/fraction, malformed/incomplet,
longues décimales, Domain oracle, dirty/rebase, colonnes et absence zéro fictif,
legacy, initial RAF, deux ordres Forecast/RAF, drafts indépendants et no-op répété.
A/R2/R1/V1/V2/M/I/K/T/U : suites existantes Application/Domain/transaction/codec,
workflow/controller/coordinator et natives conservées. Les quatre couples R2,
IDs restaurés après split/merge, consommation locale et RAF distant A/B, preuve
renouvelée sélectivement, CAS/abort/ack perdu/recovery, worker, V1–V8 et collections
mixtes sont exécutés. Les invariants 11C et History sont vérifiés par leurs suites.

Captures visuellement inspectées :
[Planning 1440](./lot11d1-ux-ui/planning-1440.png),
[Planning 390](./lot11d1-ux-ui/planning-390.png),
[longue valeur 1440](./lot11d1-ux-ui/long-card-1440.png),
[longue valeur 390](./lot11d1-ux-ui/long-card-390.png),
[modal 1440](./lot11d1-ux-ui/modal-1440.png),
[modal 390](./lot11d1-ux-ui/modal-390.png).
`document.scrollWidth == innerWidth` aux deux largeurs, carte et modal ; scroll
matrice interne, aucun formulaire imbriqué. Tab/Escape via CDP natif : focus dans
la modal, Escape restaure Update actuals et le RAF raw de 10002 caractères.

## Gate performance et limites pour l'audit

[Analyse et mesures complètes](./lot11d1_ux_performance.md),
[sonde initiale](./lot11d1_ux_performance_initial.json).
10 000 chiffres : rendu Domain médian **360,5 ms**, rendu exact Application froid
**0,7 ms**, 40 rendus froids **29 ms**, parsing **0,4 ms**, rebase distant protégé
**14,1 ms** (première sonde non protégée **297,1 ms**), frappe store **0,3 ms**.
Fractions finies/non finies et cumuls multi-Team/dénominateurs distincts mesurés.
Caches weak par quantité/modèle/cellule et lecteurs locaux à l'opération ; aucune
autorité ou preuve dérivée du cache. Textes invalides restent dirty/non applicables.
La frappe et l'Apply d'un RAF long sont également mesurés dans l'application
persistante, avec un seul commit confirmé et zéro snapshot. Gate PASS dans ces
échantillons après protections ; aucun arbitrage architectural engagé.

Les tailles sondées ne sont pas des limites. Les ressources BigInt/strings/CPU
et RAM restent finies ; aucun débit illimité n'est promis. Heap CDP avant/après,
sans GC forcé ni pic/RSS, ne prouve pas une fuite ou un plafond. Edge headless
sur macOS, pas audit physique mobile/lecteur d'écran/multi-appareil. Quota réel
non forcé par override ; rollback sous quota natif injecté démontré. Les limites
11D.0 de gros Current/import et de recovery explicite restent : reload confirmé
perd les drafts RAM ; Cancel reload les garde. Merges structurels incompatibles
refusés, draft conservé jusqu'au choix explicite. Ce sont les réserves de mesure
et d'audit, pas une clôture indépendante.

## Invariants conservés

Requirements seuls possèdent RAF courant ; A n'invente aucun snapshot et ne
réconcilie pas legacy. Application valide bases/identités avant R2 no-op/A/B ; B
seul aligne le nouveau snapshot. R1 explicite et sélectif, corrections V1/V2
conservées. Historiques immuables ; drafts/bases RAM et autres cartes conservés.
Publication après commit persistant confirmé ; aucun moteur/write à la frappe,
navigation ou focus. V1–V8/inputs1–2/forecast1–2 mixtes, anciens Current sans
rewrite au read/Save/no-op, et 11C date Forecast positive > T inchangés.
**Aucun fichier Domain, commande métier, moteur, codec, repository ou infrastructure
stockage modifié**. Aucun replay, inputs-only, nouveau format, worker ou autre lot.

## Fichiers modifiés

- `docs/canon.md`
- `docs/current_canon.md`
- `docs/current_plan.md`
- `docs/steps/ACTUALS/lot11d1-ux-ui/long-card-1440.png`
- `docs/steps/ACTUALS/lot11d1-ux-ui/long-card-390.png`
- `docs/steps/ACTUALS/lot11d1-ux-ui/modal-1440.png`
- `docs/steps/ACTUALS/lot11d1-ux-ui/modal-390.png`
- `docs/steps/ACTUALS/lot11d1-ux-ui/planning-1440.png`
- `docs/steps/ACTUALS/lot11d1-ux-ui/planning-390.png`
- `docs/steps/ACTUALS/lot11d1_plan.md`
- `docs/steps/ACTUALS/lot11d1_ux_browser.json`
- `docs/steps/ACTUALS/lot11d1_ux_performance.md`
- `docs/steps/ACTUALS/lot11d1_ux_performance_initial.json`
- `docs/steps/ACTUALS/lot11d1_ux_review.md`
- `docs/steps/ACTUALS/lot11d1_ux_validation.txt`
- `public/styles.css`
- `scripts/browser-raf-final-test.mjs`
- `src/application/index.ts`
- `src/application/session/editableQuantity.ts`
- `src/application/session/formatActualsQuantity.test.ts`
- `src/application/session/formatActualsQuantity.ts`
- `src/application/session/projectEditViewModel.ts`
- `src/application/session/snapshotActualsViewModel.ts`
- `src/ui/actuals/actualsWorkflow.test.ts`
- `src/ui/actuals/createSnapshotActualsCardController.test.ts`
- `src/ui/actuals/createSnapshotActualsCardController.ts`
- `src/ui/actuals/snapshotActualsDraftStore.ts`
- `src/ui/portfolio/createPortfolioEditControls.ts`
- `src/ui/project-edit/createProjectEditController.test.ts`
- `src/ui/project-edit/createProjectEditController.ts`
- `src/ui/renderApp.ts`
- `src/ui/timeline/createTimelineUiCoordinator.multidraft.test.ts`
- `src/ui/timeline/createTimelineUiCoordinator.ts`

**11D.1 UX — IN REVIEW. Arrêt après commit/push pour audit indépendant ChatGPT.**
