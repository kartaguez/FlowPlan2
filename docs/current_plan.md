# FlowPlan2 current plan — point d'entrée unique

## Clôture documentaire R1.2 — DONE — 2026-10-11

Décision utilisateur sur les résultats audités : **R1.2 — DONE, avec limite de
performance LOAD documentée et non bloquante**. Baseline obligatoire de clôture :
`5eb3f4320fa995c730be3090f0a4a284247efdfc`, branche
`rewrite/portfolio-versioned`. Avant modification : fetch origin réussi,
HEAD local/distant identiques à cette baseline, divergence 0/0, arbre propre.

Les invariants fonctionnels et architecturaux R1.2, l'équivalence différentielle
des optimisations, les frontières hexagonales et la certification opaque sont
validés. Chaque correctif P0, P1, P2, P3-A1 et P3-B a fait l'objet de tests,
d'oracles différentiels et d'un audit indépendant, selon les résultats audités
communiqués par la mission de clôture ; aucun nouveau rapport d'audit n'est inventé.
Les campagnes caractérisent le chargement initial, qui n'est pas le cas d'usage
critique retenu. La classification historique **C** reste le résultat LOAD et
une limite actuelle ; elle n'est pas reclassée en A/B et ne bloque plus R1.2.

- **PERF-LOAD — acceptée avec réserve documentée** : un portfolio volumineux peut
  prendre plusieurs secondes à charger. Après P3-B, Snapshot moyen dense M5
  ≈ **7,23 s**, Current moyen dense M6 ≈ **7,00 s**. Mesures propres aux fixtures
  et à l'environnement ; aucune garantie universelle ni SLA arbitraire.
- **PERF-EDIT — à qualifier** : priorité critique sur portfolio déjà chargé,
  réactivité adaptée à l'interaction. Les lots concernés mesureront commande,
  validation de transition, reconstruction éventuelle du candidat, simulation
  ou recalcul du planning et mise à disposition du résultat ; publication et
  persistance seront mesurées séparément. Aucun moteur incrémental imposé,
  aucune dérogation à la certification, aucune performance d'édition validée.
- **PERF-TRENDS — à qualifier** : au maximum **100 projets sélectionnés** dans
  l'onglet, indépendamment du total du portfolio (100 projets : tous analysables ;
  2 000 projets : analyse sur 100 sélectionnés). Aucune limite totale sur le
  portfolio, ni limite de 100 sur le moteur ou le modèle Domain ; aucun plafond
  arbitraire de snapshots. Qualification distincte de l'acquisition/validation
  des snapshots nécessaires, du calcul des indicateurs historiques, du chargement
  des données de Trends, puis du rendu et des interactions. Les résultats des
  projets sélectionnés peuvent dépendre de tout le portfolio : priorités,
  réservations, capacités des Teams et autres projets. Un sous-portfolio de
  100 projets n'est donc pas présumé équivalent. La sélection limite présentation
  et analyse demandée, pas automatiquement les dépendances nécessaires au calcul.
  Aucun cache, projection partielle ou agrégation préalable autorisé ici.

**P3-C étudié, non implémenté et abandonné dans le cadre actuel.** Maintien des
deux constructions indépendantes de registre dans le chargement, des frontières
Application/Domain et de la seconde acquisition lors de la certification.
Aucune nouvelle autorité de confiance ni certification intermédiaire ; aucune
optimisation supplémentaire sans nouveau besoin mesuré. L'étude P3-C n'est pas
un correctif implémenté et ne donne aucun GO de laboratoire ou d'implémentation.

Domain reste propriétaire des validations métier ; Application orchestre ; ports
indépendants des adaptateurs, adaptateurs sans autorité de certification.
Les données unknown sont revalidées aux frontières appropriées ; copies, gel
profond, détachement, versions et références exactes, snapshots historiques
autonomes et certification opaque unique sont préservés. Aucune dérogation
architecturale n'est créée par la clôture.

| Élément | Statut actuel |
| --- | --- |
| R0 / R0.1 | DONE |
| R1.1 | DONE |
| R1.2 | DONE |
| PERF-LOAD | Acceptée avec réserve documentée |
| PERF-EDIT | À qualifier |
| PERF-TRENDS | À qualifier |
| P3-C | Étude terminée, non implémentée |
| R1.3 | NOT STARTED |
| R1.4 | NOT STARTED |
| R2 | NOT STARTED |

[Décisions normatives de clôture](./steps/PORTFOLIO_VERSIONED/rewrite_decisions.md#clôture-r12-et-exigences-de-performance--2026-10-11),
[bilan des correctifs, SHAs et preuves](./steps/PORTFOLIO_VERSIONED/rewrite_r12_canon.md#bilan-audité-des-correctifs),
[mesures finales P3-B](./steps/PORTFOLIO_VERSIONED/proofs/r12-perf-p3-b/comparison.md).

Cette livraison est exclusivement documentaire : aucun test, build, oracle ou
benchmark relancé. **Aucun démarrage ni cadrage R1.3 ; R1.4 et R2 non commencés.**
Arrêt après commit/push documentaire normal, sans force.

## Historique conservé — états antérieurs à la clôture

Les sections suivantes conservent les états successifs, résultats et demandes
d'audit de chaque livraison. Leurs statuts IN REVIEW/PLAN ONLY, arbitrages ouverts
et prochaines actions sont historiques ; la clôture ci-dessus prime pour l'état
actuel, sans modifier les preuves ni les contrats fonctionnels applicables.

## Actualisation P3-C — cadrage architectural PLAN ONLY — 2026-10-11

[Étude et plan P3-C](./steps/PORTFOLIO_VERSIONED/rewrite_r12_perf_p3c_plan.md),
baseline obligatoire P3-B `4b98501a99a94a92c64e6b4a9390766a2915b6e6` :
préflight conforme, fetch réussi, HEAD/origin exacts, divergence 0/0, arbre propre.
P3-B techniquement accepté selon la mission utilisateur ; preuves conservées.
**Recommandation proposée : conserver A (deux registres).** B (flux fermé) ne
prouve pas l’équivalence de la seconde acquisition ni la séparation du contrôle
Application du lot ; C (préparation certifiée) introduit une autorité intermédiaire
à rejeter dans le cadre actuel. D (organisation locale sans partage) est faisable
sous preuve, mais la piste des suffixes de filiation est hors cible : les fixtures
moyennes n’ont aucun predecessor. Aucun gain dense sensible établi. Le test P3-B de
mutation à la seconde acquisition empêche d’en présumer la redondance.
Onze arbitrages **ouverts, non approuvés**, oracle futur vraie B 2 259 réponses
et extensions, gates et protocole M1–M6/laboratoire isolé définis dans le plan.
Aucune production/test/script/benchmark/configuration/preuve historique modifié ;
aucun test/build/oracle/benchmark/profil/instrumentation exécuté ici.
**PLAN ONLY ; aucun GO P3-C.** Audit indépendant et nouveau GO explicite requis ;
arrêt après commit/push documentaire normal. **R1.2 IN REVIEW ; performance
globale C ; R1.3/R1.4/R2 NOT STARTED.** Les états antérieurs restent historiques.

## Actualisation P3-B — 2026-10-11

R1.2-PERF-P3-B implémenté sur autorisation explicite utilisateur : **B2 avec
acquisition validante B1**, seul fichier de production `payloadValidation.ts`.
Les 14 schémas restent dans un corps lexical unique ; la copie publique autonome
reste complète, le chemin version réutilise exclusivement le payload acquis par
l'enveloppe. Aucun bypass, certificat intermédiaire ou modification de ports.
245 tests PASS (32 nouveaux), ciblés R1.1 51 et R1.2 155 PASS ; G12-01–13 et
régressions P0/P1/P2/A1 incluses. Oracle réel A1 scellé avant production :
**2 259 réponses, zéro divergence**. Frontières/typecheck/build PASS.
[Rapport, mesures A1/B et deux verdicts](./steps/PORTFOLIO_VERSIONED/proofs/r12-perf-p3-b/report.md).
**R1.2 IN REVIEW ; performance globale C ; R1.3/R1.4/R2 NOT STARTED.**
Audit indépendant requis ; arrêt après commit/push de ce correctif. Les passages
antérieurs « plan P3-B non autorisé » décrivent l'état historique précédent.

## Trajectoire active — FlowPlan2 V2 / R1.1 DONE, R1.2 IN REVIEW

**R0 clôturé. R0.1 — Rewrite Initialization : DONE**, clôture utilisateur
autorisée le 2026-10-10 après audit indépendant favorable de l’architecture,
des frontières d’isolation et des preuves disponibles à
`d5bb1a89c847604f2f80aaaa3270e4125f4a3fef`.
GO utilisateur après audit favorable du plan à
`1c2b08c727af9fb8002b7678bd7403fcc0d39c27`. P0 validé : HEAD/origin exacts,
arbre propre, divergence 0/0 et branche absente avant création exacte.
Branche active `rewrite/portfolio-versioned` ; référence indépendante
`codex/lot11a-portfolio-snapshots` préservée.
[Canon et preuves R0.1](./steps/PORTFOLIO_VERSIONED/rewrite_r01_canon.md).

P1–P5 implémentés et poussés ; P6 livre documentation, registre et rollback.
Shell neuf src-v2/public-v2/dist-v2/tests séparés, Portfolio vide technique,
origines fixes 4274/4275, aucun stockage ni runtime/bridge legacy. G01–G14 PASS,
39/39 tests V2, typecheck/build PASS, six séries browser natives avec zéro
tentative d'accès et sentinelles intactes. Rollback P1–P6 testé en clone jetable.

**G15 sur macOS complété après accord utilisateur** : checkout historique exact,
Current (3 Teams), capture (1) et History (4 lignes) consultés en profil jetable,
sans V2 chargé ni exception. Serveur utilisateur arrêté temporairement puis
redémarré sur 4174 (PID 19550, HTTP 200). Rollback des six commits : tree baseline
identique et sentinelles quatre origines intactes.

**Windows : DEFERRED / NOT EXECUTED.** Par décision utilisateur
[I-R01-C](./steps/PORTFOLIO_VERSIONED/rewrite_decisions.md#amendement-de-clôture-r01--report-windows),
les véritables exécutables Windows V2 et historique et leurs vérifications natives
ne bloquent plus la clôture R0.1. Ils restent obligatoires avant toute qualification
ou distribution Windows. Aucun résultat non exécuté n’est PASS ; aucune autre
gate n’est amendée. Détails et condition de levée dans le canon R0.1.

**R1 — CADRAGE VALIDÉ**. **R1.1 — DONE**, clôture documentaire autorisée
par l'utilisateur le 2026-10-10 après audit indépendant et audit différentiel
final : **GO CLÔTURE R1.1 — AUCUNE CORRECTION DE CODE REQUISE**.
PLAN approuvé : `5950ed079ffa8132742301922765e955d1af9274`.
Baseline d'implémentation finale validée : `168d9658621aa235bd3fe314cc74cfeebdfb28d0` ;
elle est distincte du commit documentaire de clôture. Préflight de clôture :
fetch réussi, branche attendue, HEAD = origin = baseline validée, arbre propre, 0/0.
[Canon R1.1, interfaces, 18 gates satisfaites et preuves](./steps/PORTFOLIO_VERSIONED/rewrite_r11_canon.md).
Résultats de la livraison Codex examinés dans l'audit indépendant : 68/68 tests
distincts, 12 exécutions supplémentaires multi-TZ, frontières/typecheck/build PASS.
Aucun test ou build relancé par ChatGPT pour cette clôture documentaire.
Preuves initiales `proofs/r11/` et complémentaires `proofs/r11-audit/` conservées
sous `docs/steps/PORTFOLIO_VERSIONED/`. Filiation ramifiée et cohérence des owners
validées ; sept tests contradictoires owner/prédécesseur et trois tests du contrat
payload typé lèvent les deux réserves, sans défaut de production reproduit.
`createTypedVersionEnvelope` valide la structure et les données admissibles,
sans valider le schéma métier du payload (R1.2). Limites physiques BigInt,
mémoire/pile, report Windows et procédure de rollback conservés dans le canon.
**R0 — DONE ; R0.1 — DONE ; R1.1 — DONE.** Baseline de clôture R1.1 :
`afa76016e4ab89f1e63c5bf23ce83ab0ab41be7d`.
**R0/R0.1/R1.1 DONE ; R1.2 — IN REVIEW**, 2026-10-11.
Implémentation autorisée après audit favorable du PLAN corrigé B1–B4, baseline
`4f4691d899206868160cc27eec62a50984a21dc4` ; préflight exact/propre,
fetch réussi, divergence 0/0. [PLAN et résultats R1.2](./steps/PORTFOLIO_VERSIONED/rewrite_r12_plan.md#12-résultats-dimplémentation-r12--in-review),
[canon R1.2 et preuves](./steps/PORTFOLIO_VERSIONED/rewrite_r12_canon.md).
14 payloads runtime, registre passif, manifestes exacts/inventaires dérivés,
resolver pur, ports async séparés/adapter mémoire et certificat opaque validant.
A-R12-01–09/B1–B4 appliqués ; aucun contrat générique R1.1 modifié.
G12-01–13 exécutées PASS, 154/154 tests V2 et 86/86 ciblés, frontières,
typecheck/build PASS ; rollback en clone jetable tree baseline identique et
68/68 tests du socle restauré PASS. Shell/runtime de démarrage inchangé.
Browser/multi-TZ non réexécutés pour ces modules dormants ; Windows reporté
selon I-R01-C. Le certificat n'atteste aucune transition/confirmation/durabilité.
**R1.3/R1.4/R2–R6 NOT STARTED**. Prochain acte : audit indépendant de la
livraison avant toute clôture R1.2 ; arrêt après commit/push.

Vérification complémentaire [R1.2-PERF : benchmark et diagnostic](./steps/PORTFOLIO_VERSIONED/rewrite_r12_perf.md)
sur la baseline auditée `c9ef65e2ad3223952f39005651dc50dfd0f44c21` :
classification **C**, dégradation manifeste du registre sur moyen sparse.
Correction à décider/auditer avant R1.3 ; aucune optimisation dans cette livraison.
**R1.2 IN REVIEW ; R1.3/R1.4/R2 NOT STARTED** inchangés.

[R1.2-PERF-FIX — réalisation P0-A/P0-B et preuves](./steps/PORTFOLIO_VERSIONED/rewrite_r12_perf_fix_plan.md#11-réalisation-p0-ap0-b--2026-10-11),
baseline `4effcfce23bb1e835201c9fe0c8f06967ce67339`, après audit favorable du
plan et autorisation explicite : tables temporaires locales pour les unicités du
registre et les contrôles internes `validateVersionContext`. Contrats publics,
priorités/ordre des diagnostics, copie/gel et certification inchangés ; aucun
chargement historique ni mémoïsation des chaînes. Équivalence stricte sur 563 cas,
174/174 tests V2, 32/32 ciblés R1.1 et 103/103 ciblés R1.2 (G12-01–13),
frontières/typecheck/build PASS. Les résultats historiques ci-dessus restent
historiques ; R1.1 demeure DONE, sans requalification.
Deux verdicts distincts : **P0 techniquement conforme**, mais **performance globale
encore C** : résolution moyen dense interrompue à 30 s malgré M1 dense ≈2,82 s.
M5 moyen sparse ≈4,11 s ; les coûts résiduels imposent une décision séparée avant
la poursuite de R1.3. À cette livraison P0, P1 non implémenté ; réalisation P1 ci-dessous.
P2/P3 hors périmètre ; grands non exécutés.
Audit indépendant du correctif requis. **R1.2 IN REVIEW ; R1.3/R1.4/R2 NOT STARTED**.

[R1.2-PERF-P1 — réalisation autorisée](./steps/PORTFOLIO_VERSIONED/rewrite_r12_perf_p1_plan.md#13-réalisation-p1),
2026-10-11, baseline `f9440517d176d93e3089a8b7cf34da86f36f5f18` :
A-P1-01 B et A-P1-02–04 approuvés par la mission utilisateur. Helper Domain
`lookupExactBatch`, trois usages après factories validantes (resolver, collect,
adapter mémoire), unicité locale des 12 tables du manifeste. Aucune nouvelle
autorité, aucun cache/index retenu, copies/validations/certification conservées.
Oracle figé avant production : 563 puis 896 cas ; extension finale **941 cas,
zéro divergence**, vrai P0 et candidat en clones/processus isolés. **189/189**
tests V2, **32/32** ciblés R1.1, **118/118** ciblés R1.2 (G12-01–13),
frontières/typecheck/build PASS, tests P0 conservés. Résultats historiques
ci-dessus distingués des nouvelles exécutions.
Deux verdicts : **P1 techniquement conforme**, **performance globale C**.
Rejeu P0/P1 sur mêmes fixtures/outils : M5 moyen sparse ≈4,08→1,47 s ;
M3 moyen dense ≈20,79 s, donc latence dense encore bloquante malgré résolution
M2 ≈3,32 s ; M5 dense ≈24,49 s. Mesures complètes, CPU, mémoire, profils et rollback dans les
[preuves P1](./steps/PORTFOLIO_VERSIONED/proofs/r12-perf-p1/report.md).
A-P1-05 : acceptabilité globale non établie ; diagnostic P2 à arbitrer séparément,
aucune optimisation P2/P3 réalisée. Grands NOT_EXECUTED.
**R1.2 IN REVIEW ; R1.3/R1.4/R2 NOT STARTED.** Audit indépendant requis,
aucun GO ni clôture automatique ; arrêt après commit/push de P1.

[R1.2-PERF-P2 — option A réalisée, IN REVIEW](./steps/PORTFOLIO_VERSIONED/rewrite_r12_perf_p2_plan.md),
2026-10-11, GO explicite A-P2-01–04, baseline
`fae4929af58c3ecd0aaa8026e51687e41c51cc7c`, oracle réel P1 isolé
`ee6e26fe9b056fbbd62ffb72be9989385a962e5f`. Grille TA seule remplacée par
compteur temporaire à six composants, après EXTRA_SUBPERIOD/cardinalité ; mêmes
diagnostics/priorités, grille O(C+F), autres scans/copies/contrats inchangés.
[Preuves et deux verdicts](./steps/PORTFOLIO_VERSIONED/proofs/r12-perf-p2/report.md) :
1254 réponses publiques complètes identiques ; 194/194 V2, 32/32 ciblés R1.1,
123/123 R1.2, G12-01–13/P0/P1, frontières/typecheck/build PASS.
M1–M6 sur cinq scénarios avant/après, médianes/dispersion/CPU/heap/RSS/setup publiés.
Snapshot moyen sparse 1,466→1,418 s, dense 24,223→8,728 s ; validation dense
20,749→4,438 s. Contrôles M1/M2 qualifient la dérive d'environnement.
Sept profils obtenus, P1 M5 dense limité par deux timeouts cold 30 s ; registre/
copies/validations dominants résiduels. Index dense ~14,6 Mio retenus dans
laboratoire séparé, aucune instrumentation en production. Outils/fixtures intacts,
M6 historique et grands non exécutés, option B/P3 non réalisés.
**P2 techniquement conforme ; performance globale C réévaluée**, acceptabilité
Snapshot dense pour R1.3 non établie. **R1.2 IN REVIEW ; R1.3/R1.4/R2 NOT STARTED.**
Audit indépendant requis ; rollback normal en clone jetable, commit/push sans force,
arrêt après livraison. Les passages P0/P1 ci-dessus décrivent leurs états historiques.

[R1.2-PERF-P3-A1 — pile locale implémentée, IN REVIEW](./steps/PORTFOLIO_VERSIONED/rewrite_r12_perf_p3_plan.md#13-réalisation-p3-a1-autorisée--pile-locale-seulement),
2026-10-11, GO utilisateur pour la première cible A exclusivement. Baseline
`4186efc065a8d75de58cc9a2a685c9ef40641bc5`, préflight propre/exact, fetch et 0/0.
Une seule production : immutableValue.ts. Pile ancêtres locale par appel, includes
avant push, pop par finally, ordre/diagnostics/copiage DAG/gel conservés ; recherche
ancêtre O(D), aucune mémoïsation ni frontière de confiance nouvelle.
[Rapport et deux verdicts](./steps/PORTFOLIO_VERSIONED/proofs/r12-perf-p3-a1/report.md).
Vraie P2 `d2ebb7142c563a43b620cd78fea63f2847d76c02` isolée et scellée avant
code : **1 288 réponses complètes identiques** (1 254+34), runtime de copie/gel
vérifié séparément. **19 tests ajoutés, 213/213 V2**, 32/32 R1.1, 123/123 R1.2,
19/19 copie, G12-01–13/P0/P1/P2, frontières/typecheck/build PASS. Rollback normal
restaure exactement l'arbre initial, 194 tests/typecheck/build PASS.
M1–M6 remesurés : 29 opérations par version, 12 profils séparés, 30 contrôles
inversés, fixtures/hashes/seed 1202 et outils inchangés. M6 historique/grands non
exécutés. Snapshot moyen dense **7 567,94→7 554,24 ms** (−0,18 %), contrôle
**7 523,99→7 477,19 ms** (−0,62 %) : effet global faible, dispersion conservée.
Mémoire retenue ~131,82 Mio stable ; heap endpoint 440,16→442,92 Mio et RSS
lifetime 827,94→799,95 Mio ne prouvent pas un gain exclusif d'A1. Petits variables.
Laboratoire indépendant : tableaux ancêtres 514→1 (chaîne), 1 202→1 (DAG),
mêmes visites et pile équilibrée après refus/exception ; observations instrumentées
séparées des métriques officielles. Registre/inspection/copies/validations restent
dominants. **Verdict technique A1 conforme ; verdict global C maintenu**,
acceptabilité R1.3 non établie. Aucune autre cible A/B/C implémentée/autorisée.
**R1.2 IN REVIEW ; R1.3/R1.4/R2 NOT STARTED.** Audit indépendant requis,
arrêt après commit/push sans force. Le plan initial reste historique pour les
options différées, aucune permission nouvelle n'en est déduite.

[R1.2-PERF-P3-B — cadrage et plan uniquement](./steps/PORTFOLIO_VERSIONED/rewrite_r12_perf_p3b_plan.md),
2026-10-11, baseline obligatoire P3-A1 réelle
`1d1c66b2b38a6599f1ab0950c4dd1fdffd1e6e74` : fetch réussi, branche attendue,
HEAD/origin exacts, 0/0, arbre propre et aucun concurrent inexpliqué.
P0/P1/P2/P3-A1 techniquement acceptés selon la mission utilisateur ; leurs
preuves et statuts historiques sont conservés. **B PLAN ONLY, non autorisé**.
Recommandation proposée **B2 avec capture lexicale B1** : orchestrateur privé
acquérant lui-même chaque unknown, checker lexical sans argument de données,
14 schémas uniques ; seule la copie payload de contrôle abandonnée dans le flux
version pourrait être retirée. APIs publiques, copie complète initiale,
diagnostics, R1.1, ports et pipeline collect/certification restent intégralement
préservés ; aucun helper trusted exporté/cache/certificat intermédiaire.
Cartographie des 14 schémas, preuve d'encapsulation proposée, arbitrages ouverts,
oracle futur **1 288 réponses A1 + extensions**, gates/runtime et campagne M1–M6
avec allocations séparées documentés. N copies/registre potentiellement évitées,
aucun pourcentage de latence garanti. Aucun code/test/script/benchmark/configuration
ni preuve historique modifié ; aucune exécution de test/build/mesure/instrumentation.
Audit indépendant et **nouveau GO explicite requis avant B** ; sinon conserver
la copie (A/C). **R1.2 IN REVIEW ; performance globale C ; R1.3/R1.4/R2 NOT STARTED**.
Arrêt après commit/push documentaire normal, sans force.

**Norme applicable consolidée — amendements du 2026-10-11 :**
[A-R12-01–09, correspondances anciennes→nouvelles](./steps/PORTFOLIO_VERSIONED/rewrite_decisions.md#amendements-normatifs-r12--2026-10-11).
Ces décisions fonctionnelles remplacent les clauses désignées R0/D-R1, et
annulent intégralement A-R1-01/02. Elles ne changent pas les primitives ni les
contrats génériques filiation/provenance livrés R1.1. Les canons DONE conservent
leur vérité historique. R0 §14 expose leur précédence ; son corps historique
n'est pas une norme actuelle lorsqu'une clause est remplacée.

- Project/Reservation/Team/PT/RT : existing/deleted ; isActive Project/Reservation
  séparé, visibilité Team purement visuelle ; plus confirmed/suspended.
- Toute suppression permise indépendamment des Actuals historiques ; cascades
  Project→PT, Reservation→RT, Team→PT/RT atomiques ; tombstones sélectionnés.
  PT deleted sans TA/PTEC, RT deleted sans TA ; aucun ever-nonzero/proof/index.
- Restore garde identités sans restauration implicite d'associations ou de
  Forecast/Actuals ; association explicitement revue, grille confirmée complète,
  PTEC valide pour PT. Préparation/confirmation/stale/atomicité : R1.3.
- AP stable pour chaque Project/Reservation, deleted inclus ; vide sans bornes/
  SubPeriods/TA ; couvert partition complète contiguë, même sans association.
  AP.knowledgeDate et monotonie supprimées ; through reste frontière Actuals.
- Grille TA exactement associations existing × SubPeriods, zéro explicite ;
  versions individuelles, ajustement dates même identité, split/merge nouveaux
  IDs avec provenance métier facultative. Aucune proratisation automatique.
- PTEC uniquement PT existing, identité AP stable, lastActualsDate=through/null,
  ETC exact ≥0 ; aucun open/completed/complete/reopen ni rebond par version AP.
  ETC zéro reste zéro par défaut ; zéro→positif confirmation, ETC positif revue
  ciblée ; confirmation sans payload modifié ne crée aucune version (R1.3).
- Program/Pas autonomes, existing inutilisé valide, aucun auto-tombstone ;
  propriétaire existing référence seulement catalogue existing.
- Manifeste fermé exact ; racines dérivées des Settings, aucune liste redondante.
  SnapshotId distinct, knowledgeDate déclarative ≥max through de tous AP,
  inactive/deleted compris ; vides sans borne, dates égales/recul autorisés.
  Snapshot inputs-only résoluble sans Current. Current = seul manifeste publié
  et CAS, aucun historique métier automatique complet ; Save explicite uniquement.

R1.2 : 14 payloads runtime, manifeste, registre passif, resolver pur, validateur
structurel et `ValidatedPortfolioGraph`. Ce certificat ne prouve aucune transition.
R1.3 : commandes/suppressions/restaurations, versions sélectives, conséquences,
confirmations transitoires (globale unique pour suppression TA, zéros compris ;
Team Portfolio toujours confirmée), stale/revue ETC/atomicité RAM.
R1.4 : simulation native certifiée sans sélection ; R2 : durable/CAS/transactions,
reçus techniques minimaux/idempotence/recovery/import-export/Snapshots autonomes.
R3 moteur complet, R4 généralisation commandes, R5 UI/consultation, R6 comparaison.
Architecture hexagonale : Domain types/invariants/validation/résolution pure ;
Application cas d'usage/transitions ; ports abstraits versions/manifests ; adapters
stockage/UI/intégrations ; composition root. Domain sans UI/IDB/moteur/legacy.

**Ordre de lecture normatif V2 :**

1. Cette section et [current_canon actif](./current_canon.md).
2. [Décisions et amendements A-R12](./steps/PORTFOLIO_VERSIONED/rewrite_decisions.md).
3. [PLAN R1.2](./steps/PORTFOLIO_VERSIONED/rewrite_r12_plan.md) : baseline, contradictions,
   ancien→nouveau, architecture/payloads, contrats/cas limites, G12-01–13,
   ordre futur, réception/risques, état des O12-01–08 et corrections B1–B4 (§11).
4. [R0 avec addendum §14](./steps/PORTFOLIO_VERSIONED/rewrite_r0_plan.md), puis
   [registre de reprise](./steps/PORTFOLIO_VERSIONED/rewrite_reuse_registry.md).
5. Plans/canons [R0.1](./steps/PORTFOLIO_VERSIONED/rewrite_r01_canon.md) et
   [R1.1](./steps/PORTFOLIO_VERSIONED/rewrite_r11_canon.md) : acquis, preuves et limites.

Corrections fixées : mappings Settings owner→identité opaque unique, versions
multiples sous cette identité admises ; une Capacity par Team selected même
deleted ; toutes refs Program/Pas résolubles, conservées sous propriétaire deleted,
existing→existing et deleted→existing/deleted ; catalogue existing inutilisé valide.
Snapshot certifié sur métier/structure sans parcours transitif de lignées/sources ;
statut contextuel R1.1 conservé, garanties d'enregistrement inchangées.
Certificat : factory validante unique/type opaque, données unknown/désérialisées
revalidées, aucun registre de certificats. Mandatory booléen confirmé, true exige
objectiveEndDate. A-R12-01–09 inchangés. Encodages, metadata et API ports réalisés dans le canon R1.2 ; aucune politique B1–B4 ouverte à l'implémenteur.
Unicité PT/RT historique à vie : R1.2 contrôle graph/contexte fourni, R2 garantit
toutes versions durables. Ratio RT + exception sans période reste ouvert pour R3,
ou avant scénario concerné R1.4. Defaults bootstrap à fixer avant usage natif.

Option B extraction sélective, T12-R sans migration V4–V8/bridge/autorité legacy,
origines fixes 4274/4275 et garde V2 conservés. REUSE ne signifie pas extraction
réalisée. Le [registre](./steps/PORTFOLIO_VERSIONED/rewrite_reuse_registry.md)
conserve opérations R0.1/R1.1, intentions historiques et opérations effectives R1.2 IN REVIEW.
Documents patrimoniaux : [architecture antérieure](./steps/PORTFOLIO_VERSIONED/architecture_plan.md),
[canon de référence](./canon.md), archives suivantes ; aucune norme V2
exclusivement déduite d'eux. Stateless : décisions nécessaires dans le dépôt,
checklist de clôture/reprise R0 §11 ; audit et GO propres par lot.

## Limite explicite des archives

Tout ce qui suit est **patrimonial, hors trajectoire active V2**. Les anciens
« current », statuts, gates V1–V7 ou 11D.3–11D.5 ne constituent aucune instruction
de lancement. Les canons DONE restent les acquis de l'ancienne application.
Déplacement éventuel vers un fichier d'archive : tâche documentaire future
non bloquante, avec contrôle des liens/ancres ; aucun déplacement risqué ici.

## Archives de suivi — application de référence

Current validated baseline:
`ee66a72cb6073c753681af95acae5122f93f13d3` (11D.2 G1 proof implementation validated by
favorable independent audit; documentary DONE closure authorized by the user on 2026-10-09)

This is the operational roadmap for the active trajectory. Durable product and
architecture rules live in [canon](./canon.md); current implementation facts
and temporary constraints live in [current canon](./current_canon.md).

The validated baseline includes the Program/Pas, Reservation progress, colors,
temporal zoom corrective lots, Lot 10A Actuals with V4 backup, Lot 10B
Actuals-aware planning projection, Lot 10C Actuals workflows and UI, and
Lot 10C.1 object-scoped knowledge snapshots with V5 persistence and
Lot 10C.2 Actuals/RAF workflow corrections, and Lot 11A Portfolio Snapshots
with immutable historical inputs, exact Project metrics and V6 persistence,
plus Lot 11A.2 exact daily profiles and V7 persistence.

## Completed

- Planning Engine V1 and exact rational domain quantities;
- `PlanningResult` → `TimelineViewModel` → `TimelineGeometry` projections;
- static SVG rendering, global time axis, diagnostics, and Project markers;
- shared cursor, viewport, zoom/pan, hit testing, and hover;
- atomic application editing pipeline;
- global Planning settings, Team settings, and Project editing;
- global multi-Team Reservations with ratio and fixed-daily requests;
- Portfolio tabs and stacked Team panel UI;
- 9A Program / PAS foundations (DONE);
- 9B Cursor metrics projection (DONE);
- 9C Cursor metrics UI (DONE);
- 9C.1 Planning UI cleanup (DONE);
- FlowPlan visual grammar adaptation and corrective pass (DONE);
- 9D Priority drag/drop (DONE);
- 9E Team structural CRUD (DONE);
- 9F Project structural CRUD and Team membership (DONE);
- 9G Reservation and capacity-period structural CRUD (DONE);
- 9H Complete planning backup and restore (DONE);
- 9I Project and Reservation forecast activation (DONE);
- separate Projection date presentation pass (DONE);
- anchored temporal zoom and range drag (DONE);
- usage-driven Program/Pas, Reservation progress, colors, and backup V3 (DONE).
- 10A Actuals model, reconstruction, and backup V4 (DONE).
- 10B Actuals-aware planning projection (DONE).
- 10C Actuals workflows and UI (DONE).
- 10C.1 Actuals knowledge snapshots and V5 migration (DONE).
- 10C.2 Actuals / RAF workflow UX (DONE).
- 11A Portfolio Snapshots & Forecast History Capture (DONE).
- 11A.2 Historical daily load profiles (DONE).
- 11B Project History (DONE — explicit user closure).
- 11C Actuals / Forecast separation (DONE — explicit user closure).
- 11D.0 Storage Architecture & Scalability (DONE — favorable independent audit and explicit user closure).
- 11D.2 Historical Inputs Contract & Replay Feasibility (DONE — G1 only, favorable independent audit and explicit user closure).

Current trajectory: **11D.2 — DONE (G1 proof only)**;
**11D.1 RAF Model — DONE; 11D.1 UX — DONE**;
**11D.0 — Storage Architecture & Scalability remains DONE**;
**11B — Project History view is DONE**, following validated DONE
11A.2. See the
[detailed implementation plan](./steps/HISTORY/lot11a2_11b_plan.md).
11A.2 is implemented, verified and closed. Final plan review concludes
**11B READY FOR IMPLEMENTATION** at baseline `7a3ea6b`; implementation is **DONE** by explicit user closure. See [11B delivery](./steps/HISTORY/lot11b_canon.md).

## Current objective and ordered sub-lots

```text
10A (DONE) → 10B (DONE) → 10C (DONE) → 10C.1 (DONE) → 10C.2 (DONE)
11A (DONE) → 11A.2 (DONE) → 11B (DONE)
11C: DONE — Actuals / Forecast temporal separation
11D.0: DONE — Storage Architecture & Scalability
11D.1 RAF Model: DONE — favorable independent audit and final V1/V2 verification
11D.1 UX: DONE — favorable independent audit, final Cancel S1–S6 gates pass
11D.2: DONE — G1 historical replay proof and direct CPU/RAM characterization
11D.3 / 11D.4 / 11D.5: ENVISAGED — NOT STARTED; independent audit and authorization required
11A.1: DEFERRED / not adopted as product work; no dependency for 11B
10D: superseded by 11A (not DONE)
10E: largely superseded by 11B; advanced replay/navigation/comparison deferred
```

Final 11B plan review (2026-10-08): branch `codex/lot11a-portfolio-snapshots`,
starting HEAD `507e85d5af8ed3158f9ce449e2e354609212e7b5`, clean and synchronized
with origin (0/0) after fetch. The 11A.2 canon records the completed capture and
755-test validation. That review was documentation-only. The subsequent authorized implementation
was then IN REVIEW; explicit user closure subsequently marked 11B DONE.

## 11D.2 — Inputs-only historical architecture and replay contract

**Status: 11D.2 — DONE — G1 proof only, 2026-10-09.**
Favorable independent audit and explicit user closure authorization received.
Audited implementation / documentary closure baseline
`ee66a72cb6073c753681af95acae5122f93f13d3`, branch
`codex/lot11a-portfolio-snapshots`, clean and origin 0/0 after fetch.
The [dedicated architectural plan](./steps/STORAGE/lot11d2_plan.md) confronts
existing contracts with the new user-validated trajectory. 11D.0 and both
11D.1 sub-lots remain DONE; durable canons continue to describe delivered code.

Validated target decisions: new Portfolio Snapshots retain historical inputs
and immutable shared Actuals references; no calculated results in new captures.
Team/Project/Reservation configurations are copied into each capture; only
Actuals knowledge is shared by immutable references. V5 versions remain
object-scoped, with common periods and exact per-Team consumption; V4 retains
its historical representation. Full entity normalization is outside scope.
Normal consultation of **all** snapshots will use the current calculation chain,
with no promise of exact reproduction of old forecasts. Historical requirements
remain the RAF authority; no Current input substitution. 11C temporal separation
and 11D.1 historical Actuals RAF remain intact. Unresolvable or unsimulable inputs
show “Recalcul indisponible” with diagnostics, without captured-result fallback,
automatic repair or snapshot rewrite. Old inputs/results/profiles/versions/IDs
and references remain preserved; explicit conversion is outside scope.

The [11D.2 feasibility report](./steps/STORAGE/lot11d2_feasibility.md) records
Current/historical exact parity, dependency closure, reconstruction conservation,
representative determinism, independent historical inputs and measured direct
CPU/RAM costs. Coverage is bounded by the fixtures; extreme valid legacy input
is diagnosed and left unexecuted for resource risk. It does not
certify future worker, cache, concurrency or UI performance; those and definitive
budgets belong to their implementation lots. An exploratory budget overrun
requires analysis and possible architectural adjustment, not automatic rejection
of inputs-only. The audited G1 implementation added only proof tests/fixtures, laboratory scripts
and tracking documents. This closure changes only three Markdown tracking documents.
No production code, format, engine, repository or UI is changed.

The future Application pipeline supports Current and historical snapshots,
independent of UI/ViewModels/geometries. Four stages distinguish indexed snapshot
listing, progressive entity discovery, Actuals resolution/business facts, and
simulated results. Unexamined presence remains unknown; the initial display does
not promise a complete historical catalogue. RAM cache limits do not bound
simulation peaks: prior cost estimation, temporary/worker copy characterization
and explicit refusal of unsustainable runs must preserve Current availability.
A published Current projection matching exact inputs and calculation chain may
be reused without duplicate simulation; CAS, atomic publication, dirty drafts
and recovery stay intact. Chain identity covers business transformations without
purely visual invalidations. Diagnostics distinguish non-resimulable valid
captures, missing dependencies, unsupported formats, corruption and transient
read/resource errors, with distinct repository reactions and no old-result fallback.

No initial persistent cache or systematic full-history calculation on opening.
The global exact cap at cold opening conflicts with progressive loading; scope
arbitration is deferred to History/Trends integration, without blocking 11D.2
feasibility or designing a new interaction. Functional Trends evolution remains
outside scope. G1 is accepted following the favorable independent audit and
explicit user authorization. 11D.2 is DONE; 11D.3, 11D.4 and 11D.5 remain
**NOT STARTED**. The inputs-only production architecture is not deployed.

Closure evidence: [49 new tests](../src/proof/lot11d2/replay.test.ts),
1,104/1,104 global tests in 96 suites with no skips; typecheck/build PASS,
portable 3/3 PASS, native storage PASS after the sandbox listen restriction
was resolved. Physical quota enforcement remains uncertified.
[Exact proof results](./steps/STORAGE/lot11d2_proof_results.json) record
26 Current/historical pairs, 260 repetitions and three fresh processes.
[CPU/RAM measurements](./steps/STORAGE/lot11d2_measurements.json) cover seven
cases, two warmups and ten samples per case; the
[feasibility report](./steps/STORAGE/lot11d2_feasibility.md) retains all gate
results, stage CPU process times and measurement qualifications. Total wall
median/max: target 363.06/370.20 ms, stress 2164.56/2270.21 ms, adverse
4598.46/4639.46 ms. Observed maximum heap growth / process RSS: target
152.43/442.72 MiB, stress 1136.61/2102.73 MiB, adverse 779.98/1750.42 MiB.
These observations are not absolute peaks or production budgets. No application
gate or benchmark is rerun for this documentary closure.

Residual limits are explicitly handed to **11D.4 (NOT STARTED)**: targeted
Actuals resolution instead of whole-Current encoding; exact rational DTO
transport; worker copies, scheduling, concurrency, cancellation and cache
release; estimation of off-horizon contributions, prefixes and lookahead before
admission; reduced dense extraction and simultaneous structures; stage/cause
diagnostics distinguishing incomplete results from unavailable replay. Universal
compatibility, the valid extreme legacy case left unexecuted, absolute memory
peaks and integrated CPU/RAM budgets remain unproven. UI cycles, cold global-cap
arbitration and integration remain for 11D.5; format/persistence closure remains
for 11D.3. This handoff starts none of these lots.

Envisaged lots: 11D.3 Inputs-Only Capture & Persistence; 11D.4 Historical
Simulation Service; 11D.5 Historical Views Integration. Recommended delivery
order puts the service and legacy-view integration before activating inputs-only
Save, or uses one gated activation after all are ready. A capture must never be
available in production without a working consultation service. Each stage
requires independent audit and explicit implementation authorization.

This target supersedes the earlier proposed persistence of full daily
Team/Project/Reservation results in 11D.0 §5.4; it does not alter the delivered
storage, CAS, receipts, atomicity or recovery guarantees. Existing 11A/11A.2/11B
captured-result contracts below remain historical implementation records until
an authorized integration changes consultation. Planning/Trends source boundaries
are anticipated only: no selection, navigation, rename, comparison-interaction
or visual redesign is planned or implemented here.

## 11D.1 — RAF Model

**Status: DONE — RAF Model only.** Conditional user closure follows the favorable
independent implementation audit and final V1/V2 checks from
`cc81b9901e1a617c5eddc2051ee9946aa70fb5af`: three demonstrated editor/draft
anomalies corrected, 1009 Node tests plus 3 portable tests, storage gate and
22 existing + 11 new native browser scenarios pass. See the final verification
section in the delivery canon. Original implementation authorization followed independent audit of
[the amended plan](./steps/ACTUALS/lot11d1_raf_model_plan.md) at
`6ce922e55621423c4e00e21e374ae53a6deb1efa`. The required branch was clean,
at that exact HEAD and origin 0/0 after fetch. P1–P6 implementation separates
current requirement RAF from immutable snapshot RAF, introduces command A,
Application R2 routing, conditional R1 evidence, immutable RAM bases, safe draft
rebase, V8/inputs2 compatibility and minimal existing UI wiring.
[Delivery, matrix and executed gates](./steps/ACTUALS/lot11d1_raf_model_canon.md).

11D.0 remains DONE; 11C and its engine version remain unchanged. IndexedDB
physical schema/stores/keys/CAS are unchanged. Historical documents and captures
retain their original contracts and values; old/new Current and mixed captures
are validated at the codecs, repository and worker boundaries.

The [amended UX plan](./steps/ACTUALS/lot11d1_plan.md) received favorable
independent audit with R1/R2/R3 reservations. Amendment committed/pushed before
implementation from `075b2a6c18175eabdcbdb401556a81591f32635f`.
**11D.1 UX — DONE** following the favorable independent implementation audit
reported by the user and authorized final verification from
`0d73ad950f0ee17f896e4e7d1d9b60258b23d229`.
S1–S6 pass: mixed Forecast/RAF Cancel, isolated owners, published reopening,
compatible/stale rebase, certain refusal and modal guard. Missing Cancel handler
guard reproduced before correction; minimal Project controller/coordinator fix.
Final gates: 1055/1055 Node + 3/3 portable, 80/80 targeted included in Node total,
22/22 native audit + 11/11 V1/V2/R1 + 4/4 mounted UX, native storage,
typecheck/build/diff check. No failures, cancellations, skips or todos.
[Final closure and limits](./steps/ACTUALS/lot11d1_ux_canon.md);
[historical IN REVIEW delivery](./steps/ACTUALS/lot11d1_ux_review.md) unchanged.
Requirements RAF, proofs/R2, V1/V2/R1, historical/persistence/11C invariants remain
normative. No replay, inputs-only or 11D.2/11D.3; mission ends after delivery.

## 11D.0 — Storage Architecture & Scalability

**Status: DONE — explicit user closure on 2026-10-09 after favorable independent audit.**
Validated corrective implementation: `8d95f7406ff40a6d2d041b41784a3915173989c8`. User-authorized implementation after
explicit 11B/11C DONE closure at baseline
`eb38a3df8fceab30d82253cac6bc5cd325625444`. The A → B → C → D → E sequence is
implemented; see [plan and implementation record](./steps/STORAGE/lot11d0_plan.md)
and [delivery, gates and measurements](./steps/STORAGE/lot11d0_canon.md).

Post-audit corrections from baseline `8086ddf14f609d0f1c9e16cd480bf17de3f13f6b`
coordinate concurrent History requests, require recovery after uncertain commits
or failed local reconciliation, and remove the validation-certificate shortcut.
The independent re-audit is favorable: all three MAJOR findings are corrected
and validated. The user authorized this strictly documentary closure.
Recorded implementation gates: typecheck/build PASS; 935/935 application Node
tests (96 suites), 3/3 portable-server tests, 938 unique Node tests total;
41/41 targeted tests included in the application total; native Edge suite and
11/11 added browser scenarios PASS. These are existing verification results,
not tests rerun during closure.

Current session no longer owns Portfolio captures. Async Application repository,
IndexedDB, separate Current/History/metadata/identity indexes, CAS/receipts,
resumable staging and atomic activation are implemented. Legacy is preserved and
tracked by migration fingerprint; normal Current edits do not conflict with it.
V1–V7 readers and autonomous V7 export remain, with no engine or backup bump.
Lazy worker projections, bounded row caches, external exact cap calculation and
History release on return Planning preserve historical metrics and Planning drafts.
Persistent summaries and the future full daily Team/Reservation capture model
remain absent. 11D.2/11D.3 are not implemented by this storage delivery.

Residual limits remain explicit: unapplied RAM-only drafts are lost after
confirmed reload; systematic snapshot validation adds read/summary/cap/export
cost. Other retained limits: large-file transient buffers, browser
storage quota/eviction, estimated cache budgets and current Planning projection
costs on large horizons/Reservations. Physical quota refusal was not forced by
Edge's accepted DevTools override; native rollback and visible QUOTA errors were
verified with injected native transaction refusal. The favorable independent audit
and explicit user instruction close this lot.
No code, test, script or dependency changes; no other lot starts.
**11B DONE; 11C DONE; 11D.0 DONE.**

## Corrective lot — anchored temporal zoom and range drag

**Status: DONE** — human validated implementation at
`08e47fc41ae4ba23c0c6a4db1720e43dffa4802a`. Zoom +/− anchors on the
Projection date when visible, or on the nearest viewport edge after pan,
without changing that date. A confirmed click changes the Projection date.
A horizontal drag of at least 4 CSS pixels previews an inclusive date range
with both dates and zooms to it on release; ranges shorter than seven days expand within the
horizon. Shift + drag remains pan. Tooltips resume after the range gesture;
timeline surfaces suppress native text selection. Viewport state and clamps
remain in the shared viewport controller and Geometry remains the only
temporal coordinate system. This lot changes no planning or simulation rule.

## Corrective lot — Program/Pas, Reservation progress, colors, backup V3

**Status: DONE** — human validated at
`80c7e65ba45c7763a49973c389e5f4ae2e905ff9`. Project and Reservation
cards manage optional Program and Pas values, including normalized creation,
case-insensitive reuse, and
automatic removal after the last reference disappears. Inactive references
retain catalog values, but inactive entities do not contribute to forecast
progress. Reservation progress uses exact requested demand inside the inclusive
planning horizon, with consumption stopping at the Projection date; Program/Pas
progress divides total consumed work by total charge across active Projects
and Reservations. Project progress remains Project-only.

Each Program owns a freely editable color; ungrouped Projects and Reservations
own their colors, with no hidden own color after joining a Program. Frises use
the exact effective color, while main card backgrounds derive a light pastel.
Independent drafts preview locally; Cancel is inert for shared state, and the
last Apply that actually edits Color wins. New Program color is suggested once
on selecting New and remains stable while naming it; Program to None suggests
a new own color, while None to None preserves the current color. The new-name
inputs appear only with New. The engine batches full 0.5-unit fair-allocation
rounds to avoid workload-sized iteration while preserving admission and exact
allocations. Backup V3 persists associations and colors, reads V1/V2, and
repairs the specified orphan/color cases at import.
Mathematical termination follows from a finite horizon and Project list,
finite deadline lookaheads, and exact fair sharing that advances or stops.
Practical complexity also matters. The real V3 backup
`FP2-DTO-2026.10.01.json` exposed a 46-second full projection when
`12178 - SDD` became Mandatory. Caching per-date base capacity, omitting
unobserved future trajectories, and cancelling rational factors before
large products reduced the same full projection to under 0.4 seconds locally.
The exact planning-result digest matches the pre-fix engine and the fixture
test guards both output and interaction-scale performance.
This corrective lot did not begin 10A.

## 9I — Activation of Projects and Reservations in the simulation

**Status: DONE** — human validated implementation at
`c77558c3e8b2912532afbb8113ac8183fe737c18`. Project and Reservation
activation is immediate and independent of Apply/Cancel drafts. Ordinary edits
preserve the current activation state. Inactive entities retain all Portfolio
data but leave the forecast. Inactive Projects retain their exact position in
`Portfolio.priorityOrder`; Project progress remains visibly Inactive without
forecast metrics. At 9I closure, backups were strict V2 documents with both activation
flags; at its closure the corrective lot wrote V3. V1 remained readable and migrated
both entity types as active. Typecheck, 511 automated tests across 77
suites, and build pass. A local Edge check at 1440 px and 390 px covered
closed-card toggles, timeline and metric changes, draft Apply after toggle,
reactivation, and narrow layout without horizontal document overflow.

At 9I closure, Lot 10 had not started.

## 9C.1 — Planning UI cleanup

**Status: DONE** — three corrective passes implemented and validated at
`d6ae53bd08442f5a391d2db68b29f0b0966c98e0`.

The Planning header places dated cumulative progress, compact
red/grey diagnostic counts, then viewport controls immediately before the
shared Timeline. Team headers are more compact. The former daily Team summary
is removed; cumulative Team and Projects / Programs / PAS metrics remain at the
shared cursor date. Ctrl+ArrowLeft/Right moves that date outside editable
fields and modals without planning recomputation. Every Timeline click moves
only the Projection date; Project allocation and named Reservation segments
retain business tooltips. Timeline selection and its summary have been removed.
The separate validated UI pass moves the Projection date display into a small
band above the global year/month axis and repeats it above every Team lane.
These bands and the other temporal surfaces share a pale blue background and
the same click-to-date pipeline. This pass is **DONE** following human
validation.

Portfolio Projects and Reservations use compact cards with independent inline
editors, Apply/Cancel, and Team subcards. Several cards and Teams may remain
expanded, including across tab changes. Local drafts and dirty borders survive
collapse and projection rerenders; an Apply cleans only its own card and rebases
other drafts on the new session. A Team OFF has no visible details control.
Project Objective end has one Mandatory toggle that maps to the existing Domain
deadline field; divergent historical deadlines require explicit resolution.
The Project update command adds/removes Team requirements atomically; 9F
subsequently completed Project entity CRUD. A Team lane hit never opens Team
Settings and leaves any editing context unchanged. Only the Team Settings
button opens that editor.

Human validation has closed 9C.1; 9D has since also closed.

## FlowPlan visual grammar — corrective lot

**Status: DONE** — visual adaptation `92cc5ee`, followed by the corrective
pass `8a8c7537f8b64327533223a4a5dfc864aa8eb3bd`.

The corrective pass displays four cumulative metrics in the same compact
cartouche for each Team and globally: Capacity, Occupied (requested
reservations plus allocations), Occupancy, and Over-reservation ratio. Global
values aggregate exact Team quantities before dividing; daily over-reservation
remains non-compensating. All values use the inclusive interval from the
horizon start through the selected Projection date.

The global year/month axis sits below the zoom controls. One blue Projection
date marker and date label use the shared temporal coordinate system across
the axis and Team lanes. Zoom, date changes, and rerenders retain alignment.
The visual changes preserve the Domain → Application → adapters → DOM/SVG
boundary and existing editing interactions.

Validation at closure: `npm run typecheck`, `npm test` (425 tests, 62 suites),
and `npm run build` passed. Desktop (1440 px) and narrow (390 px) browser checks
covered the metric cartouches, cursor, zoom/date changes, and horizontal
overflow; no overflow was observed. No corrective item remains open. This lot
adds no new Phase 9 feature.

## 9D — Priority drag/drop

**Status: DONE** — validated implementation at
`a85d4b569a458d811e03dccc314476e8a5fb2e47`.

Portfolio → Projects provides a dedicated pointer and keyboard reorder handle
on each card, derived `#N` badges, and a transient insertion preview. The
`reorder-project` command changes only `Portfolio.priorityOrder`; a real move
rebuilds Planning once, while a same-position move reuses the existing state
and projection. The Project editor no longer exposes priority. Independent
Project and Reservation drafts, open cards, Projection date, viewport, progress
view, and focus survive reordering. The implementation passed TypeScript
typecheck, 434 automated tests, and build before closure.

## 9E — Team structural CRUD

**Status: DONE** — validated implementation at
`29f67e65ebd384505c1abcf23570a7ce4467be2e` (lifecycle
`3ff540c7f4528c9cc8713b2d5eda1a706efe1445`, followed by the validated
UI placement correction).

Create Team accepts a name and 1..N exact initial capacity periods; the
Application validates the schedule atomically and generates a collision-safe
session Team ID. Delete Team is restrictive: persisted Project requirements
and Reservation allocations block removal, with no cascade. A separate UI
guard protects unapplied draft changes concerning the Team before dispatch;
unmodified Team options and unrelated dirty fields do not block removal.
Accepted operations reproject once, while refusals preserve state and
projection. Team Settings protects local edits across context changes and
rerenders. The global metrics cartouche has a title, and Create Team sits
between it and the first Team panel, aligned with the shared Timeline.

Validation before closure: TypeScript typecheck, 454 automated tests, build,
and desktop browser inspection passed. Reservation entity CRUD and structural
editing of existing capacity periods were subsequently completed in 9G.

## 9F — Project structural CRUD and Team membership

**Status: DONE** — validated implementation at
`87bc3c4f9f8a0c19c5e9fb8ba86c27e2344c730c`.
Project creation and confirmed removal are implemented.
Creation requires explicit Team activation and exact RAF, assigns a
collision-safe session ID, and appends the Project to `priorityOrder`.
Deletion removes the Project and its priority entry while preserving unrelated
drafts and projection controls. The 9E Team deletion UI guard now includes
enabled Teams in an unapplied Create Project draft. The existing
`update-project` membership path remains in use. The separate Projection date
presentation pass is DONE.

Implementation checks: TypeScript typecheck, 472 automated tests across 70
suites, and build passed. Edge browser checks at 1440 px and 390 px covered
empty Team selection, exact RAF creation, derived priority badge, dirty-draft
delete confirmation/cancel, successful removal, and narrow Portfolio layout.

## 9G — Reservation and capacity-period structural CRUD

**Status: DONE** — validated implementation at
`5700731671f0a6fa3ad5cba98ca81850ddb02d03`.

Create Reservation starts as a local draft with an empty name, horizon dates,
and no enabled Team. The Application validates it under a collision-safe
session ID; zero allocations and zero Teams are allowed. Delete Reservation
uses the validated Project dirty-draft and inline confirmation sequence.
Successful lifecycle operations preserve independent drafts and reproject once.

Reservation cards use a derived display order: start date, end date, exact
requested total descending over the entire inclusive interval, name, then ID
as a deterministic tie-break. The total uses Domain daily request semantics,
including Team capacity schedules and exceptions. Portfolio storage order is
unchanged.

Existing Teams may add or delete capacity periods, including the last one.
The UI keeps invalid and structural changes local until Apply; Cancel restores
the persisted schedule without recomputation. Apply preserves exact untouched
quantities and existing exceptions, rejects overlaps, allows gaps, and displays
the Domain-normalized chronological schedule. There is no manual reorder or
Domain period identity. Create Team still requires an initial period.

Implementation checks: TypeScript typecheck, 489 automated tests across 73
suites, and build passed. Local Edge checks at 1440 px and 390 px covered
Reservation creation/deletion and focus, the narrow Portfolio panel without
horizontal overflow, and Team period Add/Cancel/empty-schedule Apply.

No capacity-exception editor, recurrence, actuals/history,
snapshots, or new analytics are included. The separate Projection date pass
is DONE on its own track.

## 9H — Complete planning backup and restore

**Status: DONE** — validated implementation at
`ad087b75d9613830b712bd505423726ab6ac6065`. One versioned JSON document
contains the full current `PlanningSessionState`. The same document is stored
under one localStorage key; successful edits persist before the session commits.
Planning Settings provides
Import and Export. Import validates the full state and projection before asking
for confirmation, then replaces the key and reloads the page. Invalid startup
data is preserved and reported while the demo loads in memory. Actuals/history
were absent from the V2 schema at 9H closure.

Implementation checks: TypeScript typecheck, 498 automated tests across 76
suites, and build passed. Human validation closed the lot.

## 10A — Actuals model & deterministic reconstruction

**Status: DONE** — human validated implementation at
`ec431e527ce7fe6dacd20c5d7aa052845d80b480`.

Project and Reservation now own distinct immutable Actuals chronologies with
explicit first start dates and exact per-Team cumulative consumption. Project
records also carry RAF. Append validation uses current membership, while old
records retain historical Team IDs and cumuls. A removed and reintroduced
Project requirement receives a freely configured RAF; persisted RAF provenance
distinguishes that case from continuous membership. Protected histories prevent
deletion of their owners and referenced Teams.

Domain reconstruction distributes each delta exactly over its object interval
using effective capacity, normal-day/exception fallback, then all-date
fallback. Daily contributions and Team/day sums are disposable projections,
never persisted observations or ceilings on Actuals. V4 backup stores business
chronologies and RAF provenance, while V1–V3 remain readable. Append commands
use candidate state → projection → persistence → publication. Forecast
Reservations, metrics, and `PlanningInput` remain on their existing 10A
boundary; 10B now integrates calculated daily occupation into planning.
Current capacity schedules and working pattern can reshape reconstructed
historical days; whole-Portfolio knowledge capture is implemented in 11A and drift
visualization in 11B, with advanced historical replay/navigation deferred.

## 10B — Actuals-aware planning projection

**Status: DONE.** Human validated at
`be6c2adb922b4d86a4fdbc750ff9b1321add2c34`. The inspected implementation
contracts, capacity-source factorization, diagnostics, projections, and
acceptance tests are in the
[10B plan](./steps/ACTUALS/lot10b_plan.md). The 10A step documents remain the
separate validated record of that sub-lot.

Calculated daily Project and Reservation occupation now enters planning without
raw records. The engine uses a shared daily capacity snapshot for allocation
and lazy deadline lookahead. `TEAM_ACTUALS_OVER_CAPACITY` reports Actuals excess;
`TEAM_OVER_RESERVED` reports marginal Reservation forecast excess. Timeline
shows four distinct load categories without capacity clipping, and cursor
metrics expose their exact cumulative amounts and both overload causes.
Project/Program/Pas progress remains forecast-only.

## 10C — Actuals workflows & UI

**Status: DONE.** [10C plan and validated contract](./steps/ACTUALS/lot10c_plan.md).
At 10C completion, Project and Reservation cards exposed immutable, exact Actuals history and
independent New Actuals forms. A photo uses the currently committed Team
membership, first-only `actualsFromDate`, editable through date, exact cumulative
consumption, and Project RAF. The exact RAF suggestion is editable. A conflicting
local Forecast membership or Project RAF draft blocks Actuals Apply; successful
edits rebase other drafts by TeamId. Apply uses the existing append commands,
projection and V4 transaction. The existing 10B timeline, diagnostics and metrics
show the committed result. Actuals dirty reflects edits against the proposed
input baseline, never merely opening the form. Final validation: typecheck and
build OK, 596/596 tests passing, and desktop/narrow visual reviews validated
manually. Implementation and final dirty correction were audited at
`9dc857594db335864f740e6295b74716ce6917de` and
`18f1c20ac6343dc95654dc32bffc7032f9d5be52`.

## 10C.1 — Object-scoped Actuals knowledge snapshots

**Status: DONE.** [10C.1 implementation and migration plan](./steps/ACTUALS/lot10c1_plan.md). The validated model uses immutable, whole-Project or whole-Reservation snapshots of Actuals knowledge. Each object has one current exact partition, and a Project snapshot includes current Team RAF. Replacement, extension, erosion and membership actions commit one object candidate through projection and V5 persistence. V4 cumulative records remain lossless, read-only migration evidence. Before explicit reconciliation they alone supply that object's simulated Actuals; afterward only its current V5 snapshot does. The editor shows the Team × period matrix, current RAF, and read-only history. Stable snapshot and period IDs reach timeline hit testing and tooltips. The implementation at `76a07ce2d6b4f4ada76c845c24cd2029a460f95e` and the audited V5 future-knowledge-date correction at `17094b03cbf4c34c8424d6fa1847e0ceebd55410` are validated.

## 10C.2 — Actuals / RAF workflow UX

**Status: DONE — user-validated and closed for the 11A implementation pass.** [10C.2 plan and implementation record](./steps/ACTUALS/lot10c2_plan.md). The Project card now shows an exact Actuals summary with a quick RAF draft, Apply/Revert and an explicitly confirmed first RAF. Reservation has a summary without RAF. A single Actuals draft store owns the Project three-step or Reservation two-step modal, with contiguous zone selection, period operations, per-cell evidence and explicit stale review. Forecast remains the Team membership editor; dependent membership changes enter one atomic Actuals handoff, while autonomous Forecast changes retain the normal path. The implementation reuses the 10C.1 Domain, whole-object session command, projection and V5 transaction. Desktop and 390 px browser review and automated gates are recorded in the lot document. The user has closed 10C.2; its Actuals invariants remain unchanged by 11A.

## 10D — Knowledge snapshots

**10D — superseded by 11A.** No concrete residual capture capability remains.

The historical 10D need was to freeze cross-object/Forecast knowledge that
10C.1 object snapshots do not cover: Team capacity, working pattern, Forecast
configuration and all objects at one instant. 11A complete historical inputs
cover that need, with minimal exact Project forecast metrics. This is a scope
replacement, not a DONE claim. Executable replay belongs to the residual 10E
concern rather than a separate 10D capture lot.

## 10E — Historical reconstruction & drift comparison

**10E — largely superseded by 11B.** Project drift visualization/comparison
moves to 11B. Potential residual scope: full historical-state replay, full
historical navigation and advanced comparison/reconstruction beyond promised
Project drift (including daily capacity/overload and other detailed results).
These capabilities require later explicit planning and are not implemented or
promised by 11A/11B. Comparisons must distinguish historical inputs/results
from any new replay or current configuration.

The [current canon](./current_canon.md) records the validated 10C.1 contract.

## 11A — Portfolio Snapshots & Forecast History Capture

**Status: DONE** — validated implementation at
`f477dd6e1a31f3be7be949dad9fea4cae9667770` (user-provided positive audit,
recorded in the prior planning pass and confirmed by the current framing).
Implementation follows the validated plan at
`da79f2c243bcba487f68c8ee441fe6efe1e65514`, retaining initial plan commit
`2d5695848035462bf6e4fc70754ec4d3bc6d5c94` on this branch.
See [11A canon and verification](./steps/PORTFOLIO_SNAPSHOTS/lot11a_canon.md).
11A closure does not depend on adopting the separate 11A.1 merge study.

Explicit Save freezes complete shared-codec historical inputs, exact Actuals
source references (or frozen pending V4 evidence), and minimal exact Project
Actuals/RAF/EAC, priority and estimated dates. Identical timestamps and backward
technical clocks are accepted. Save checks every draft owner again at action
time and verifies the applied state against the published run. Save/Delete
persist V6 before publication and reuse the projection without recomputation.

V6 imports are self-contained and strict. Historical V5 sources resolve exact
IDs through consecutive prefixes with historical memberships and RAF; legacy
capture never reconciles current objects. V1–V5 readers remain and start with
empty Portfolio history; their encoders refuse history-bearing downgrades.
Historical Project/Reservation/Team/Program/Pas identities remain reserved for
as long as retained inputs reference them. No graphical drift, replay,
navigation or restore is added.

## 11A.1 — Merge historical backups into Portfolio Snapshots

**Status: DEFERRED / not adopted as product work.**
The [prior study](./steps/PORTFOLIO_SNAPSHOTS/lot11a1_plan.md) remains a
record of historical-backup merge constraints (detached V5 owners and lineage).
No merge, shared archive or lineage attestation is included in 11A.2/11B.
Those unresolved study decisions do not block the adopted Project History
trajectory. A future adoption requires separate scope/plan review.

## 11A.2 — Historical daily load profiles in Portfolio Snapshots

**Status: DONE — final verification and closure authorized by the user.**
See [11A.2 canon and verification](./steps/HISTORY/lot11a2_canon.md) and
[11A.2 / 11B plan](./steps/HISTORY/lot11a2_11b_plan.md).
Freeze exact Project-level daily Actuals and Forecast from the already-published
run at explicit Save, aggregated across Teams. Persist sparse positive daily
rows, exact rational strings and coverage semantics in forecast schema 2 under
V7; V6/schema 1 captures remain unchanged and explicitly lack a daily profile.
No engine/reconstruction during Save or future historical display, no full
PlanningResult and no artificial V4 reconciliation.
Domain/capture/persistence/tests/docs are complete. Final examination proves an
active Project cannot have zero published Team plans; no production correction
is necessary. Nine additional tests cover invalid inputs and unallocated/mixed
plans. Typecheck, 755/755 tests (89 suites), build and diff checks pass.
11A.2 is **DONE**. No 11B implementation is part of this mission.

## 11B — Project History view

**Status: DONE — explicit user closure on 2026-10-08.**
Implementation starts from mandatory baseline
`7a3ea6bf1c6c97e248075a75bc718279158ad0f5` on the existing branch.
11A.2 remains validated DONE. The [reviewed plan §§5–14](./steps/HISTORY/lot11a2_11b_plan.md)
was implemented without functional recadrage or scope extension.

The [11B canon and delivery record](./steps/HISTORY/lot11b_canon.md) describes
Planning characterization and explicit suspension, immutable historical DTO
projection, ordered-ID cache, independent viewport, exact daily stacked paths,
common pan-stable cap, clipping and inclusive knowledge marker, tooltip deltas,
colors, keyboard/touch/focus and read-only isolation. It records final gates
(initially 792/792; post-audit corrections 805/805 tests, 93 suites;
typecheck/build/diff checks), 1440/390 light/dark UI
review and small/target/stress performance measurements and residual limits.
No V6/V7 format, engine or business rule changed; no historical replay/restore,
Reservation frise, reference navigation or advanced analysis was added.

The acceptance matrix and review record remain the reference for non-regression.
11B was explicitly closed by the user on 2026-10-08; the closure is not inferred from tests alone.

## 11C — Actuals / Forecast temporal separation

**Status: DONE — explicit user closure on 2026-10-08.**
Implemented on `codex/lot11a-portfolio-snapshots` from the authorized mandatory
baseline `9ac532f0451e25a4b53564b9fc6359d3f824f318`, initially clean and origin 0/0.
The [audited plan](./steps/HISTORY/lot11c_plan.md) and mission approve P1–P7:
current V5 coverage or last pending V4 through, uncovered null, current erosion,
mandatory total derived input, common admission/Mandatory guard, unchanged
Reservations and `/2` for new captures only.

[11C implementation canon](./steps/HISTORY/lot11c_canon.md) records the source,
engine, integration/history tests, performance and 1440/390 light/dark review.
Project Forecast is strictly after its inclusive current Actuals end on every
Team; other admissible Projects retain slots/capacity. No Actuals/RAF, format,
persistence or History correction is introduced. Existing snapshots, including
old overlap and engine versions, remain exact and readable without replay.

11B and 11C were explicitly closed by the user on 2026-10-08;
11D.0 storage audit is the next action.

## Cross-cutting non-goals for Phase 9

- No raw Actuals records or historical replay inside Planning Engine V1.
- No second priority source for Program or PAS.
- No independent Team horizons, cursors, viewports, or time axes.
- No floating-point business quantities.
- No opportunistic synchronization or framework migration.

## Maintenance protocol

After implementing a lot, record **IN REVIEW** only when code, automated tests,
TypeScript build, and documentation are consistent. Keep the validated baseline
SHA and downstream dependency status unchanged until human validation.

After each validated lot:

1. update `current_canon.md` if current behavior changed;
2. update `canon.md` only if a durable invariant or architecture decision
   changed;
3. mark the lot completed in `current_plan.md`;
4. update the baseline SHA;
5. refine next lots only if new information requires it.

These documents are not an exhaustive history. Remove stale information; do
not append every commit, audit, fixed defect, or previous prompt.

## Storage implementation authorization — 2026-10-08

User instruction: close 11B and 11C and implement the hardened 11D.0 plan.
Both prerequisite lots are **DONE** by this explicit closure, at engine baseline
`eb38a3df8fceab30d82253cac6bc5cd325625444`; 879 tests/95 suites, typecheck and
build passed before storage changes. History contract changes required by the
plan are authorized. The roadmap sections above record the prior plan review;
implementation status is now **11D.0 IN REVIEW**, following A → B → C → D → E.
No future full daily capture model or backup version is authorized here.
