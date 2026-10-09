# 11D.1 UX — DONE

Clôture du 2026-10-09, explicitement autorisée par l'utilisateur après audit
indépendant favorable et vérification finale du Cancel carte. Aucun autre lot
commencé ; 11D.0 et 11D.1 RAF Model restent DONE ; 11D.2/11D.3 restent NOT STARTED.
Le [rapport IN REVIEW](./lot11d1_ux_review.md) conserve ses résultats historiques.
Ce canon complète le [plan](./lot11d1_plan.md), le
[canon RAF Model](./lot11d1_raf_model_canon.md) et ses corrections V1/V2/R1.

## Baseline et Git

- Dépôt : `kartaguez/FlowPlan2`, branche `codex/lot11a-portfolio-snapshots`.
- SHA initial attendu/réel : `0d73ad950f0ee17f896e4e7d1d9b60258b23d229`.
- Avant modification : `git fetch origin` exit 0, status vide, branche attendue,
  HEAD identique à origin et divergence `0/0`. Aucun écart ni écrasement.
- Commit tests/correction : `0b70e4888e3c8e3b9881ed62ccc91654546a9590`
  (`fix(ui): guard card Cancel during modals and verify mixed draft discard`).
- Commit suivant : documentaire de clôture. Le SHA final est le commit Git
  contenant ce canon, fourni intégralement dans la livraison après commit/push.
  Un commit ne peut inclure son propre SHA dans son contenu.
- Livraison : push normal sur cette branche, sans force-push. Arbre propre et
  synchronisation origin contrôlés après push dans le compte rendu final.

## Vérification du code réel et correction limitée

Le contrôleur Project possède Forecast. Son handler Cancel supprime l'entrée
Project ciblée, réinitialise depuis son modèle publié courant, puis notifie
le coordinateur. Le callback du coordinateur appelle `cancelCardRaf()` pour ce
Project ; ce dernier supprime l'entrée Actuals/RAF, y compris base, erreurs,
confirmations et branche éventuelle, puis initialise un draft frais depuis le
modèle courant. Les stores suppriment par ID, sans parcourir les autres owners.
Les modèles de contrôleurs sont reconstruits lors du remount après publication ;
un draft stale conserve une ancienne `baseModel` distincte de son `model` courant.
Cancel supprime cette ancienne base : il ne l'utilise jamais pour restaurer RAF.

**Défaut S6 démontré avant correction.** Un événement Cancel carte délivré pendant
une modale passait par le handler Forecast sans consulter `isModalOpen()`.
Il abandonnait Forecast et RAF alors que la branche modale était ouverte.
Le test intégré avec les deux contrôleurs réels échouait : `Local Forecast`
était remplacé par `Project Atlas`, au lieu de conserver le même owner RAM.
Les deux cas mixtes ordinaires passaient déjà (2 PASS, 1 FAIL avant correction).
Cette reproduction teste la garde du handler, pas un clic physique à travers
l'overlay ; la navigation clavier native est vérifiée séparément.

Correction minimale : callback optionnel `canCancel` dans
`createProjectEditController.ts`, évalué **avant** tout nettoyage Forecast,
hydratation, effacement d'erreur ou notification. Le coordinateur le branche sur
sa garde globale existante `!isModalOpen()`. Cela couvre aussi la modale d'une
autre carte. Le défaut et sa correction sont reproduits dans le navigateur réel
avec un événement bouton délivré pendant la branche. Après fermeture modale,
Cancel carte conserve son comportement de suppression des deux drafts.

Aucun changement aux stores de production, à `cancelCardRaf()`, Apply, handoff,
review, R1/R2, commandes métier, Domain, moteur, codecs ou repository. L'Apply
séquencé, no-op répété, handoff membership, review V2 et preuves R1 restent verts.

## Résultats S1–S6

| Cas | Résultat et preuve exécutée |
| --- | --- |
| S1 Forecast puis RAF | PASS. Contrôleurs Project/Actuals réels et coordinateur : Forecast + RAF abandonnés, erreurs effacées, Forecast pristine, RAF publié exact après Cancel, réouverture et remount. Application persistante Edge : mêmes résultats et Current/token inchangés. |
| S2 RAF puis Forecast | PASS. Même résultat dans l'ordre inverse, en test intégré et application persistante Edge. |
| S3 deux cartes dirty | PASS. A nettoyée ; B garde son Forecast `Local B` / `Other Forecast` et RAF invalide `1/`, reste dirty après Cancel/remount. Référence de l'owner Forecast inchangée ; test contrôleur/store complémentaire vérifie l'identité du draft RAF B et de ses bases RAM. |
| S4 rebase concurrent | PASS, deux tests intégrés. RAF local `2/3` + Forecast local, RAF distant compatible sur B ou contradictoire sur A `3/7`, puis publication indépendante et rebase/remount réel. Cas stale montre le conflit avant Cancel. Cancel reprend tous les RAF du dernier Current publié exact, aucune ancienne base/conflit, zéro nouveau dispatch/rendu de projection, réouverture/remount pristine. |
| S5 refus de publication | PASS. Refus certain `ACTUALS_FORECAST_SEPARATION` dans les deux ordres ; drafts conservés et erreurs locales présentes avant Cancel, puis supprimés sans publication. Aucun commit incertain utilisé comme abort. Le gate stockage audit revalide séparément abort natif, notification incertaine et recovery. |
| S6 modale ouverte | PASS après correction. Le handler Cancel carte reçu pendant modale ne touche aucun owner ; RAF reste désactivé. Cancel modal/Escape enlève seulement la branche et garde les textes Forecast/RAF préexistants. Cancel carte après fermeture abandonne les deux drafts. Edge vérifie aussi refus de Cancel B pendant modale A et focus Tab/Escape natif. |

Six nouvelles régressions Node : deux cas mixtes, deux rebases, une garde modale,
une régression contrôleur/store d'effacement des preuves/erreurs et isolation
stricte des bases. Les tests existants restent actifs, sans retrait ni skip.
Les tests intégrés utilisent les contrôleurs Project et Actuals réels avec
stores/coordinator et dispatcher synchrone existants ; ils ne prétendent pas
prouver seuls la persistance. Le navigateur utilise l'application persistante,
worker/repository et IndexedDB natif sur origine/profil temporaires isolés.

**Critères techniques :** Cancel ne dispatch aucune commande Planning et ne
construit aucune projection ; les spies et identités état/projection/rendu le
vérifient. Aucun write Current, création de snapshot ou changement historique :
Current/token persistent identiques avant/après dans les cas natifs S1/S2.
Les owners abandonnés sont réinitialisés sans confirmations, erreurs ou stale ;
les autres owners et bases restent intacts. Aucun nettoyage par un Apply refusé,
aucune preuve implicite ni bypass modal/R1/R2. Aucun draft abandonné réintroduit
au remount. Les scénarios S4 ont bien deux publications explicites de préparation
(RAF distant puis activation) ; seul l'intervalle Cancel est à zéro dispatch.

## Gates finaux

[Rapport final et sorties navigateur](./lot11d1_ux_final_validation.txt).
Les tentatives navigateur sandboxées ont d'abord échoué à ouvrir localhost
(`listen EPERM`), puis les trois mêmes commandes ont été exécutées avec
l'autorisation d'exécution locale requise ; elles finissent toutes exit 0.
Aucun test ou gate n'a été remplacé, désactivé ou affaibli.

| Commande | Résultat |
| --- | --- |
| Tests ciblés controllers/stores/workflow/coordinator | Exit 0, **80/80**, 4 suites, zéro fail/cancel/skip/todo ; inclus dans npm test |
| `npm run typecheck` | Exit 0 |
| `npm test` | Exit 0, **1055/1055**, 96 suites, zéro fail/cancel/skip/todo |
| `npm run build` | Exit 0 |
| `npm run test:portable` | Exit 0, **3/3**, zéro fail/cancel/skip/todo |
| `npm run test:storage` | Exit 0, Edge 154.0.4258.53 ; **15 assertions repository** + migration/UI/History/upgrade bloqué/layout/quota native injectée |
| `node scripts/browser-storage-audit-test.mjs` | Exit 0, **22/22**, zéro fail/skip ; A/B/R2, abort/CAS/ack perdu/recovery et multidraft monté |
| `node scripts/browser-raf-final-test.mjs` | Exit 0, **11/11 V1/V2/R1 + 4/4 UX** ; S1/S2 renforcés, zéro write Cancel, publié exact à la réouverture, garde modale ; performance et clavier natifs |
| `git diff --check` | Exit 0, aucun output |

**1058 tests Node uniques**, tests ciblés non additionnés une deuxième fois.
37 scénarios navigateur distincts, séparés des tests Node et des 15 assertions
repository. Aucun défaut non résolu ni gate en échec au terme de la mission.

## Fichiers de cette mission

Commit tests/correction :

- `src/ui/project-edit/createProjectEditController.ts`
- `src/ui/timeline/createTimelineUiCoordinator.ts`
- `src/ui/timeline/createTimelineUiCoordinator.multidraft.test.ts`
- `src/ui/actuals/createSnapshotActualsCardController.test.ts`
- `scripts/browser-raf-final-test.mjs`

Commit documentaire :

- `docs/current_plan.md`
- `docs/current_canon.md`
- `docs/steps/ACTUALS/lot11d1_plan.md`
- `docs/steps/ACTUALS/lot11d1_ux_canon.md`
- `docs/steps/ACTUALS/lot11d1_ux_final_validation.txt`

## Limites résiduelles conservées

Les [limites UX et performance](./lot11d1_ux_review.md#gate-performance-et-limites-pour-laudit)
et [limites 11D.0](../STORAGE/lot11d0_canon.md) restent applicables.
BigInt/strings/CPU/RAM sont finis ; les tailles mesurées ne sont pas des plafonds
contractuels. Les mesures headless Edge/macOS, heap sans GC forcé/pic/RSS, et
1440/390 px ne sont pas un audit physique mobile, lecteur d'écran ou multi-appareil.
Le quota physique n'est toujours pas imposé par override ; seul le rollback
sous quota natif injecté est démontré. Gros Current/import/export ont les coûts
RAM documentés. Merges structurels incompatibles restent refusés avec draft
conservé jusqu'au choix explicite. Commit incertain ou réconciliation échouée
impose recovery 11D.0 : reload confirmé perd les drafts RAM, Cancel reload les
garde. Cette mission ne change ni n'assouplit ce contrat.

**Décision : 11D.1 UX — DONE. Arrêt après livraison Git.**
