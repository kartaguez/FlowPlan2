# FlowPlan2 current canon

## Trajectoire active — V2 : R1.1 DONE, R1.2 IN REVIEW

Point d'entrée et ordre de lecture : [current_plan](./current_plan.md).
R0 clôturé ; contrats normatifs dans [R0](./steps/PORTFOLIO_VERSIONED/rewrite_r0_plan.md)
et [décisions](./steps/PORTFOLIO_VERSIONED/rewrite_decisions.md).
[Plan R0.1 audité](./steps/PORTFOLIO_VERSIONED/rewrite_r01_plan.md) et
[canon de livraison](./steps/PORTFOLIO_VERSIONED/rewrite_r01_canon.md).
GO utilisateur à `1c2b08c727af9fb8002b7678bd7403fcc0d39c27` ; P0 propre,
exact et origin 0/0, nouvelle branche `rewrite/portfolio-versioned` créée à ce SHA.
La branche historique `codex/lot11a-portfolio-snapshots` reste inchangée.

**R0.1 — DONE**, clôture utilisateur le 2026-10-10 après audit indépendant
favorable de l’architecture, des frontières et preuves disponibles au SHA
`d5bb1a89c847604f2f80aaaa3270e4125f4a3fef` : nouveau shell/DTO technique vide
immutable, aucun modèle
métier ni persistence, sources/tests/build physiques distincts et cinq modules
runtime fermés. Dev 127.0.0.1:4274, portable 127.0.0.1:4275 ; Host/origine stricts,
collision sans fallback. Namespaces neufs réservés, aucune API storage/canal active.
Ancien src/public/scripts/configs app/test conservés, hors graphes V2.
G01–G14 PASS ; 39/39 tests V2, typecheck/build PASS, six séries browser natives,
zéro tentative API app, comparaison intégrale/hash de sentinelles égaux.
Rollback P1–P6 en clone jetable : tree baseline identique et sentinelles intactes.

G15 consultation historique sur 4174 PASS après accord utilisateur : clone
exact, Current (3 Teams), une capture puis History (4 lignes), aucun runtime V2
ni exception. Serveur existant arrêté temporairement puis restauré sur 4174,
PID 19550 / HTTP 200. Reverts des six commits : même tree baseline, mêmes
sentinelles aux quatre origines. Typecheck/build/3 tests portable historiques PASS.
Les véritables exécutables Windows V2 sur 4275 et historique sur 4175 ainsi que
leurs vérifications natives restent **DEFERRED / NOT EXECUTED**. L’amendement
utilisateur [I-R01-C](./steps/PORTFOLIO_VERSIONED/rewrite_decisions.md#amendement-de-clôture-r01--report-windows)
retire uniquement leur caractère bloquant pour la clôture R0.1 : le packaging est
périphérique au socle/runtime/browser validé. Aucune compatibilité ou disponibilité
Windows n’est attestée. Levée : validation sur Windows x64 compatible (Node 26
pour construction) avant qualification ou distribution Windows, preuves archivées.
Les résultats partiels G15/G16 restent inchangés ; hors SEA n’est pas PASS SEA.
**R1 — CADRAGE VALIDÉ ; R1.1 — DONE** le 2026-10-10, après audit
indépendant final favorable et autorisation explicite de clôture documentaire.
PLAN approuvé : `5950ed079ffa8132742301922765e955d1af9274`.
Baseline d'implémentation validée : `168d9658621aa235bd3fe314cc74cfeebdfb28d0`,
distincte du SHA documentaire de clôture.
[Canon R1.1](./steps/PORTFOLIO_VERSIONED/rewrite_r11_canon.md) : Rational BigInt,
quantités contraintes, CivilDate/intervalle, IDs et owners typés, refs exactes,
enveloppes profondément copiées/gelées, filiation ramifiée et contexte pur.
18 gates satisfaites ; livraison Codex : 68/68 tests distincts et 12 exécutions
supplémentaires multi-TZ, frontières/typecheck/build PASS, examinés dans l'audit
indépendant. Aucun test ni build réexécuté par ChatGPT pour cette clôture.
Preuves initiales `proofs/r11/` et complémentaires `proofs/r11-audit/` inchangées
sous `docs/steps/PORTFOLIO_VERSIONED/`. Cohérence owner/prédécesseur validée,
aucun défaut de production reproduit. `createTypedVersionEnvelope` contrôle la
structure, sans validation du schéma métier (R1.2). BigInt, mémoire/pile,
Windows DEFERRED / NOT EXECUTED et rollback conservent leurs limites documentées.
Shell R0.1 et garde inchangés, aucun registre/Current/métier complet/storage.
Baseline documentaire de clôture R1.1 :
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

[R1.2-PERF-P3 — plan documentaire proposé pour audit](./steps/PORTFOLIO_VERSIONED/rewrite_r12_perf_p3_plan.md),
2026-10-11, baseline P2 auditée `d2ebb7142c563a43b620cd78fea63f2847d76c02`.
P0/P1/P2 techniquement acceptés selon la mission ; **classification C maintenue**.
Pipeline réel cartographié : setup adapter distinct ; réponse port unknown,
registre collect puis réponse brute, nouveau registre en certification, résolution,
structure et certificat opaque. Comptes analytiques : deux registres par lecture,
quatre assemblages d'enveloppes et deux schémas métier par occurrence, dix
traversées équivalentes payload ; M5 trois validations manifeste, M6 deux,
hors setup, sur réponse mémoire stable. Comptes de code, aucune remesure.
Recommandation **A bornée d'abord**, allocations locales sans changement de
frontières ; B payload locale conditionnelle à preuve lexicale et audit distinct ;
C mutualisation collect/certification ajournée faute de preuve suffisante sous
contrats inchangés. Aucun trusted export, marque TS/symbole/cache/WeakSet comme
preuve runtime ; factory validante unique, copie/gel et diagnostics conservés.
Arbitrages A-P3-01–08 à soumettre ; différentiel futur contre vraie P2 sur
1 254 réponses puis extensions, campagne M1–M6 et deux verdicts indépendants.
**PLAN ONLY : aucune implémentation, instrumentation, suite ou campagne exécutée.**
Seuls plan P3 et deux trackers modifiés ; preuves historiques intactes.
**R1.2 IN REVIEW ; R1.3/R1.4/R2 NOT STARTED.** Arrêt après commit/push du plan ;
audit indépendant et nouveau GO explicite requis avant toute implémentation P3.

**Cible applicable amendée**, distincte de la livraison :
[A-R12-01–09](./steps/PORTFOLIO_VERSIONED/rewrite_decisions.md#amendements-normatifs-r12--2026-10-11)
remplacent les anciennes clauses désignées R0/D-R1, annulent A-R1-01/02 ;
[R0 §14](./steps/PORTFOLIO_VERSIONED/rewrite_r0_plan.md#14-précédence-normative-r12-du-2026-10-11).
Project/Reservation/Team/PT/RT existing/deleted seuls, isActive Project/Reservation
séparé, visibilité Team visuelle. Suppressions permises avec Actuals historiques,
cascades tombstones atomiques et retrait TA/PTEC Current concernés ; aucun
confirmed/suspended ni ever-nonzero/proof/index. Restore garde IDs sans réactiver
associations/Forecast/Actuals implicitement ; revue/grille confirmée/PTEC valide.

AP stable pour tous Project/Reservation selected, deleted inclus ; vide sans
bornes/SubPeriods/TA ou couvert avec partition contiguë complète, sans association
existing permis. Aucun AP.knowledgeDate/monotonie/attestation ; through borne Actuals.
TA = grille exacte existing associations × SubPeriods, zéros explicites ;
versions individuelles, dates modifiées même ID, split/merge nouveaux IDs,
provenance métier facultative sans changement générique R1.1. Aucun prorata.
PTEC seulement PT existing : identité AP stable, lastActualsDate=through/null,
ETC exact ≥0, sans statut/complete/reopen ni rebond automatique par version AP.
Confirmations transitoires ciblées, ETC zéro maintenu par défaut sans confirmation
supplémentaire, zéro→positif confirmé, positif revu ; payload identique sans nouvelle
version. Suppression TA confirmation globale unique zéro compris, Team Portfolio
toujours confirmée. Ces obligations de transition appartiennent à R1.3.

Program/Pas lifecycle autonome, existing inutilisé valide ; existing owner
référence seulement catalogue existing. Manifeste exact, racines dérivées des
Settings sans liste redondante. SnapshotId stable distinct, knowledgeDate obligatoire
≥max(AP.through), inactive/deleted inclus, AP vides sans borne ; createdAt technique,
dates égales et recul permis ; inputs-only, résoluble sans Current.
Current = manifeste opérationnel publié + CAS, sans histoire métier automatique
complète ; Snapshots sur Save explicite. Versions archivées immuables.

Domain : types/invariants/validation/résolution pure ; Application commandes/
transitions ; ports abstraits versions/manifests, adapters et composition root.
Aucune dépendance Domain UI/IDB/moteur/legacy. R1.2 certifie la structure seulement ;
R1.3 préparations/confirmations/stale/ETC/transitions RAM, R1.4 simulation certifiée,
R2 durable/CAS/transactions/reçus minimaux/recovery/import-export/autonomie Snapshots.
`ValidatedPortfolioGraph` ne prouve ni transition légitime ni conservation durable.
Unicité historique à vie des couples garantie R2, contrôle local graph/registre
fourni en R1.2. Corrections fixées dans le PLAN : mapping Settings owner→identité
opaque unique (versions multiples admises, double identité refusée), Capacity
obligatoire pour chaque Team existing/deleted, refs catalogues conservées sous
owner deleted et toutes résolubles (existing→existing ; deleted→existing/deleted).
Snapshot sans chargement transitif des lignées/sources, validation contextuelle
R1.1 distincte avec statut réel et garanties d'enregistrement conservées.
Factory de certificat validante unique/type opaque, revalidation unknown/désérialisation,
aucun registre runtime supplémentaire. Mandatory booléen confirmé, true exige
objectiveEndDate. A-R12-01–09 inchangés ; encodages/metadata/API ports réalisés dans le canon R1.2, décisions B1–B4 appliquées.

Primitives/enveloppes/filiation/provenance R1.1, Option B/T12-R/isolation et report
Windows I-R01-C conservés. Ratio RT + exception sans période ouvert pour R3 (ou
avant scénario moteur concerné R1.4). Aucun nouveau modèle métier monté dans shell.
Registre de reprise complété par opérations effectives R1.2 IN REVIEW. Canons DONE/archives ci-dessous identiques : faits historiques, jamais
preuve d'une règle R1.2. Sauvegarde/restauration utilisateur R0 §6 avant bascule
opérationnelle reste requise ; aucune donnée réelle utilisée par R1.2.

## Archives de canon — application de référence

Les sections suivantes et [canon.md](./canon.md) décrivent les contrats livrés de
l'ancienne application ; elles ne sont pas réécrites rétroactivement. En cas de
différence de cible, R0 prévaut pour V2, les canons livrés restent vrais pour
l'ancien produit. Le [plan antérieur](./steps/PORTFOLIO_VERSIONED/architecture_plan.md)
a la même portée documentaire historique pour migration/switch/séquence ancienne.

## 11D.1 UX — DONE

Authorized implementation from `075b2a6c18175eabdcbdb401556a81591f32635f`, after
favorable independent plan audit and separate R1/R2/R3 documentary commit/push.
[Delivery for independent audit](./steps/ACTUALS/lot11d1_ux_review.md),
[performance gate](./steps/ACTUALS/lot11d1_ux_performance.md).
A–E implement exact point/comma/fraction parsing and complete finite rendering,
compact three/two-column cards, one common period, folded readonly History,
one published-member RAF editor, preserved initial RAF for new Teams, scoped
Apply/Cancel and stable form composition with the modal outside the card form.
Weak quantity/model/cell caches and operation-local readings protect measured
long decimal/rebase costs without changing precision, proof or authority.
A pristine Project Apply uses existing A base validation/no-op, avoiding a
redundant Forecast write; any Forecast change retains its existing command path.

Final gates: typecheck/build/diff check, 1055/1055 Node tests (96 suites), 3/3 portable,
native storage (15 repository assertions plus UI/upgrade/layout/injected quota),
22/22 storage audit, 11/11 V1/V2/R1 and 4/4 mounted UX scenarios. No skip/failure.
Screenshots and native keyboard reviewed at 1440/390 px. Requirements authority,
A/B/R2 and R1 proofs, V1/V2, RAM bases, confirmed publication, immutable snapshots,
V1–V8 mixed captures and 11C remain intact. Domain, commands, engine and storage
formats/CAS unchanged. This supersedes the unimplemented exact UX statements in
historical prerequisite deliveries below.
Following the favorable independent implementation audit reported by the user,
the authorized final mixed Forecast/RAF Cancel verification passes S1–S6.
A delivered Cancel card event during an open modal exposed a missing handler
guard: the Project controller now checks the coordinator's existing modal gate
before cleaning either owner. Six added Node regressions and strengthened native
S1/S2 cover scoped discard, pristine reopening/remount, compatible/stale rebase,
certain command refusal, proof/error cleanup and modal branch preservation.
[Final closure, evidence and limits](./steps/ACTUALS/lot11d1_ux_canon.md).
Baseline `0d73ad950f0ee17f896e4e7d1d9b60258b23d229`;
implementation `0b70e4888e3c8e3b9881ed62ccc91654546a9590`.
11D.1 UX is DONE by the user's conditional closure; no following lot started.

## 11D.1 RAF Model — DONE

Implemented from `6ce922e55621423c4e00e21e374ae53a6deb1efa` on the required
branch, following the independently audited amended R1/R2 plan and explicit
user authorization. [Delivery and verification](./steps/ACTUALS/lot11d1_raf_model_canon.md).
Requirements own current RAF; snapshots keep immutable historical RAF.
`update-project-current-raf` applies a validated patch without any snapshot or
legacy reconciliation. `replace-project-actuals` validates a full immutable RAM
base, then routes no-op / independent RAF / one Actuals publication in Application.
Only publication of changed Actuals aligns requirements with the new snapshot.
R1 confirms all Teams for coverage/partition changes, affected Teams for
consumption-only changes, plus numerical RAF and membership obligations.
Drafts initialize from requirements, detect RAF concurrency at unchanged
Actuals version, preserve texts/modal branches and invalidate dependent proofs.
The existing card Apply/Cancel, modal and membership handoff remain usable.

Current codecs, workers, repository, portable import/export and captures use
V8 / inputs2 / RAF model2 together. Forecast schema2 and engine `/2` are unchanged.
V1–V7 and inputs1 captures remain readable under their historical numeric
validation; mixed collections and old Current with new captures are supported.
Reads/Save/no-ops do not rewrite old Current; Current mutations never read History
payloads. Physical IndexedDB/CAS/recovery are unchanged. 11C remains enforced.
This supersedes the permanent numerical equality and quick RAF-only publication
rules described in the historical lot sections below. New UX, exact decimal
presentation, replay and inputs-only remain outside this delivery.
11D.0 remains DONE; no subsequent lot is started. Following the favorable
independent audit reported by the user, final V1/V2 verification satisfies the
explicit conditional closure: restored split/merge IDs, safe modal RAF-only
review with retained consumption and selective proof invalidation, and explicit
R1 confirmation separate from text entry. Final gates: 1009/1009 Node tests,
3/3 portable, typecheck/build/storage, 22 existing and 11 new native browser
scenarios, diff check. RAF Model is DONE; UX was not started at that prerequisite closure.
[Final evidence and limits](./steps/ACTUALS/lot11d1_raf_model_canon.md#final-v1v2-verification-and-conditional-closure--2026-10-09).

## Validated implementation baseline

Validated prerequisite baseline: `eb38a3df8fceab30d82253cac6bc5cd325625444`.
11A/11A.2 remain DONE; their historical code baseline was
`06e7fbb94d71fe73a35e244d4cee6626b65777c2`.
11B and 11C are **DONE** by explicit user closure on 2026-10-08 at
`eb38a3df8fceab30d82253cac6bc5cd325625444` (879/879 tests, typecheck and build).
11D.0 storage implementation is **DONE**, explicitly closed by the user on
2026-10-09 after favorable independent audit of `8d95f7406ff40a6d2d041b41784a3915173989c8`.
All three MAJOR findings are corrected and validated. This commit is the current
validated implementation baseline. The closure changes documentation only and
starts no other lot. Recorded gates: typecheck/build PASS, 935/935 application
Node tests (96 suites) plus 3/3 portable-server tests (938 unique total),
41/41 targeted tests included in the application total, native Edge suite and
11/11 added browser scenarios PASS; these checks were not rerun for closure.
See [11D.0 delivery, gates and closure](./steps/STORAGE/lot11d0_canon.md).

The active application implements a pure planning projection over an editable
session, restored from a local backup when available and otherwise initialized
from the demo. The following capabilities are complete and active:

- global Planning settings: horizon, working weekdays, and one
  `maxParallelProjects` value applied independently per Team;
- one shared timeline with stacked Team panels;
- Team creation with one or more initial capacity periods, restrictive Team
  deletion, and Team Settings for name and structural capacity-period editing;
- Project creation and confirmed deletion, plus editing of name, dates, and
  Team requirements; Project priority is reordered from Portfolio Projects;
- global multi-Team Reservations with ratio and fixed-daily modes, created,
  edited, and deleted in inline Portfolio cards;
- immutable Project and Reservation Actuals snapshot histories, exact daily
  reconstruction, Actuals-aware planning projection, and transactional V8 persistence;
- whole-object Actuals partition/RAF editing and read-only V4/snapshot history in Portfolio cards;
- immediate Project and Reservation activation controls; inactive entities
  remain in the Portfolio and do not participate in the forecast;
- Projects / Reservations tabs in the Portfolio sidebar;
- shared viewport, zoom, pan, selected date, cursor, semantic hit testing,
  and hover;
- exact rational parsing and untouched exact-value preservation;
- compact accessible settings icon buttons for Planning and Teams;
- planning diagnostics, cumulative Team and global exact Actual/forecast load,
  occupancy and both overload causes, and Project / Program / Pas progress at
  the shared cursor date.

The implementation follows the state, atomicity, engine, and projection
invariants in [canon](./canon.md).

Lot 9H is validated **DONE**. Its single-localStorage persistence has been
superseded by the authorized 11D.0 architecture (**DONE**). IndexedDB is
primary. Current, immutable captures, light metadata, identity reference indexes,
control/revisions, staging jobs and bounded receipts are stored separately.
The live session owns Current and minimal identity constraints, not the Portfolio
Snapshot collection. Owned Actuals histories remain in Current. Domain/engine
remain storage-free. Current changes persist only Current before RAM publication;
Save/Delete atomically affect History only and keep the published run.

V1–V8 remain readable through their versioned contracts; compact autonomous V8
export/import is independent of physical stores. Complete imports validate each
capture, Current projection and read-back/index counts in private staging before
confirmation and atomic activation. Unknown/bad captures reject the whole import.
Legacy raw localStorage is never rewritten/deleted and is archived with its
migration fingerprint. Later Current changes are normal; changed legacy indicates
an older client, with explicit resolution and separate recovery exports.
Invalid startup data is preserved and editing blocked behind recovery actions,
not silently replaced by a writable demo. An empty new depot starts from the demo.

The physical DB schema is version 2 and logical storage data version 1, separate
from the portable envelope. SHA-256 proves byte integrity only. Every snapshot read runs complete
business validation against the persisted Current, including historical Actuals
prefix resolution. Legacy validationVersion metadata is ignored; new content is
not certified. No historical engine replay.

A proven transaction abort leaves the local state usable. Unknown commit outcomes
and confirmed commits with failed local reconciliation require recovery: all
Current/History mutations are blocked, drafts remain in their owners, and a visible
message offers explicit reload. Unapplied drafts are RAM-only and are lost after
confirmation of reload; cancelling reload preserves them. Reload rebuilds
the session/projection/token from persisted authority. No local revision increment
substitutes for reconciliation. Receipt retries keep operationId stable and consult
the receipt before CAS. Post-commit notification errors are uncertain, not rollback.

History loads metadata/projections without retaining all capture payloads.
Summary projections are ephemeral, versioned and rebuildable; no persistent
historySummaries store was introduced. Worker requests and snapshot reads are
serialized. Concurrent ensureRows calls re-evaluate missing rows in FIFO order;
release/refresh invalidate obsolete work by epoch and complete repository token.
Invalidated reads cannot publish or clear newer cached rows. Decoded row LRU budget is 32 MiB estimated; compact metadata index
budget is 64 MiB estimated. Exact global cap uses date/value multiplicities and
bounded external sorting (4096 entries, fan-in eight), without changing quartiles
or metrics. Closing History releases rows, model/gutters and buffers, retaining
viewport/reference/cap state only. All Planning draft owners/DOM remain alive.

File imports pass Blob/File to the worker (512 MiB explicit parsing limit),
parse/validate one capture at a time and resume incomplete staging by source hash.
The worker still retains the file text; this is not a streaming UTF-8 importer.
Export buffers a complete portable file as chunks/Blob; large files have real
transient RAM costs. Storage estimates/persist requests are indicative/refusable,
quota failures are visible and recoverable, and storage is never unlimited.
No physical quota-exceedance test succeeded: Edge did not enforce the attempted
override; only injected native quota refusal/rollback is verified. Memory budgets
remain estimates, and systematic snapshot validation adds read/summary/cap/export
cost despite worker execution. These residual limits remain accepted at closure.
See [storage delivery, closure and measurements](./steps/STORAGE/lot11d0_canon.md).

Lot 9I Project and Reservation forecast activation is validated and **DONE** at
`c77558c3e8b2912532afbb8113ac8183fe737c18`. Both entity types default
to active. Portfolio cards expose immediate Active/Inactive controls outside
their Apply/Cancel drafts; ordinary Apply preserves the current activation
state. Inactive Projects retain their global priority position exactly in
`Portfolio.priorityOrder` but have no Team plan, allocations, markers, forecast
diagnostics, or projected progress metrics. Inactive Reservations retain their
configured request and 9G display order but contribute no forecast demand,
timeline segment, or Team/global occupancy. `TEAM_OVER_RESERVED` remains a Team
aggregate of all active Reservation requests. Independent drafts and UI context
survive a successful toggle. The existing localStorage key is unchanged.

Lot 9A is validated and **DONE** as the original Program/PriorityFamily
foundation. The validated corrective lot extends both optional associations to
Reservations and makes catalogs usage-driven across both entity types. An
inactive reference retains its catalog entry; only active members contribute
to forecast progress. Cards offer None, an existing value, or a new normalized
value directly, without separate catalog management. The UI calls
PriorityFamily « Pas »; the technical name remains. Associations still have no
effect on planning priority or admission.

The corrective lot is validated and **DONE**. Programs own a color; an ungrouped
Project or Reservation owns its color; a Program member has no hidden own
color. Cards preview their derived pastel locally until Apply, and frises use
the exact effective color while keeping their Project/Reservation distinction.
Only an Apply that actually edits Color can replace a Program color changed by
another draft. A new Program gets one suggested color at the transition to New;
typing its name leaves the draft color stable. Program to None suggests a new
own color, while None to None preserves the existing color. New name inputs
appear only while New is selected. Suggested colors remain freely editable.
Reservation progress counts exact demand in the
inclusive planning horizon as its total charge, and demand through the
Projection date in that same horizon as consumed work. Group progress divides
sums of consumed work by sums of charges, without averaging percentages.

The corrective Mandatory performance fix keeps exact allocations and the
existing deadline semantics. The engine caches each Team's base Project
capacity by civil date, skips future residual trajectory materialization when
no later admitted mandatory Project can read it, and cancels rational factors
before multiplying large numerators and denominators. The real V3 backup
`FP2-DTO-2026.10.01.json`, with `12178 - SDD` changed to Mandatory at its
2027-02-28 objective, produces the same exact planning-result digest as the
pre-fix engine. It separates the finite-loop termination guarantee from
practical cost: on this case the full projection fell from about 46 seconds
to under 0.4 seconds in a local Node measurement.

Lot 9B is validated and **DONE**. A pure adapter projects exact
cumulative Team utilization and Project, Program, and PAS progress for an
inclusive selected-date interval. The current-run RAF baseline comes from the
same Portfolio used to plan; Portfolio and horizon references travel with the
PlanningResult in the disposable session projection. Lot 9C is validated and
**DONE**. It adds exact daily non-compensating over-reservation and its ratio,
and renders cumulative Team metrics plus an exclusive Projects / Programs / Pas
progress view at the shared cursor date. Lot 9C.1 is validated and **DONE**.
The subsequent FlowPlan visual adaptation and corrective pass are also
validated and **DONE**. Lot 9D priority drag/drop is validated and **DONE**.
It adds pointer and keyboard handles, derived `#N` badges, and a temporary
insertion preview to Portfolio Projects. Reordering preserves Project and
Reservation drafts and the current projection controls.

Lot 9E Team structural CRUD is validated and **DONE**. Create Team accepts a
name and one or more exact initial capacity periods, validated as one schedule
under a session-generated ID. Confirmed deletion is refused while a persisted
Project requirement or Reservation allocation references the Team. The UI
separately protects unapplied Project and Reservation draft changes concerning
that Team before dispatch. Successful lifecycle changes follow the existing
single-reprojection pipeline. The global metrics cartouche is titled, and
Create Team appears between it and the first Team panel.

Lot 9F Project structural CRUD is validated and **DONE**. Create Project starts
with no Team enabled and requires at least one explicit Team requirement with
exact RAF. A session-generated Project ID is collision-safe; creation appends the
Project once at the end of `Portfolio.priorityOrder`, where 9D can then reorder
it. Delete Project follows the Team deletion pattern: dirty local edits are
discarded only after confirmation, followed by an inline deletion
confirmation. The deleted Project's card and draft disappear; other Project
and Reservation drafts, temporal controls, and the progress view survive the
reprojection. The Delete Team UI guard also protects a Team enabled in an
unapplied Create Project draft. Persisted Project requirements continue to
block Team deletion restrictively.

The Projection date presentation pass is validated and **DONE**. Its implementation
places the date in the global and Team timeline bands and in the projected
progress heading, while preserving one selected date and one temporal X
coordinate.

Lot 9G Reservation and capacity-period structural CRUD is validated and
**DONE**.
Create Reservation begins with a local empty-name draft at the planning horizon
and no enabled Team; a validated Reservation may have zero allocations even
when no Team exists. Session-generated IDs skip collisions. Confirmed deletion
discards only the target Reservation draft and preserves independent drafts.
Cards use a derived start/end/exact-requested-total/name display order, with ID
only as a deterministic tie-break; Portfolio order is not changed. The total
uses canonical daily Reservation request calculations across the full inclusive
interval and Team schedules and exceptions, including dates outside the
planning horizon. Delete Team also protects a Team enabled in a local Create
Reservation draft.

Team Settings now adds and removes capacity periods, including the last one.
Unapplied rows may be invalid; Apply validates and sorts the final schedule
chronologically while preserving exact untouched quantities and all existing
capacity exceptions. Cancel restores the persisted schedule without a session
mutation or planning recomputation. Create Team still requires at least one
initial period. There is no manual period reorder or Domain period ID.

## Current objective — Lot 10: Actuals & History

10A through 10C.2 are validated **DONE** lots (10C.2 closed by the user
for the 11A pass). 10D is **superseded by 11A**, not DONE. 10E is
**largely superseded by 11B**, with advanced replay/navigation/comparison deferred. The current RAF amendment is [11D.1 RAF Model](./steps/ACTUALS/lot11d1_raf_model_canon.md),
complementing the historical [10C.1 snapshot canon](./steps/ACTUALS/lot10c1_canon.md);
the 10A–10C documents describe their historical releases.

### Current object knowledge

Each Project and Reservation can own consecutive immutable whole-object
Actuals snapshots with a stable ID, version and application-clock knowledge
date. A snapshot lists current Team participants and a separate set of
retired zero Teams. Its optional Actuals coverage is a common inclusive range
partitioned into contiguous periods, each with exact nonnegative consumed
values for every participating Team. Project snapshots additionally contain
exact historical RAF for every current Team. Current requirements may diverge
after an independent RAF revision. A
snapshot without coverage can still carry Project RAF. Absent knowledge is
distinct from explicitly zero values. The end of coverage cannot exceed the
snapshot knowledge date, but Actuals may lie outside Forecast and planning
bounds.

The full-object transaction can add, replace, split, merge, extend or erode
coverage or change Team membership. RAF alone revises requirements without
a snapshot. Changed nonzero cells
need explicit values; an all-zero prior zone can propagate zero through a
repartition. A coverage or partition change requires explicit validation of all current
Project RAF; consumption-only changes require the affected Teams, united with
RAF numeric changes and membership obligations. Removing a Team requires zero current consumed values
and confirms current RAF zero; historical snapshots retain prior values.
Reintroduction requires explicit current values and RAF. An effective publication
of changed Actuals increments the object's version; independent RAF revisions
leave it unchanged. No-op, invalid, stale and failed projection
or persistence actions publish nothing.

### Legacy V4 and V5 persistence

V5 remains the object Actuals structure; V8 is the live portable export envelope. V1–V3 import without Actuals
snapshots. Imported V4 cumulative records remain lossless, read-only
`legacyV4Actuals` migration evidence. Until an object is explicitly
reconciled, only the legacy adapter reconstructs its Actuals. Reconciliation
requires a complete validated current partition and Project RAF, then creates
its first V5 snapshot at the application clock date. Afterward only its
current V5 snapshot reconstructs simulated Actuals; the V4 payload remains
exportable but never combines with it. V4 append commands are disabled.
Historical object and Team identities remain protected while referenced.
V5 import rejects any snapshot whose knowledge date is later than the UTC
civil date of the backup's canonical `exportedAt`, across both object types
and the full history. This legacy V5-reader rule is unchanged. V6/V7 impose no
technical-clock relation between exportedAt, createdAt and knowledgeDate, so
clock rollback remains round-trippable; internal Actuals invariants still apply.

### Daily reconstruction, planning and UI

Each current snapshot period's exact amount is distributed across its own
civil dates using effective Team capacity weights. If all weights are zero,
working weekdays and capacity-exception dates share the amount equally; if
none exist, all civil dates share it. The sum is exact. This daily occupation
is a calculated projection, never a claim of daily observation. Capacity is a
weight, not a ceiling. Project and Reservation Actuals may overlap and exceed
capacity. Source kind, object, snapshot, period, Team and day flow to timeline
hit testing and tooltips. Metrics and overload diagnostics use only the active
source mode for each object and the current projected run.

The planning engine receives current RAF, exact daily occupation and mandatory
derived Project Actuals boundaries, not snapshot histories. Actual Project and Reservation occupation is applied
before Reservation forecast and Project forecast. `isActive` affects only
forecast participation. Project, Program and Pas progress stays forecast
based, so Actuals occupation is not subtracted from RAF a second time.

Project and Reservation cards show the current Team × period matrix, Team
participation, current Project RAF or Reservation allocation, and read-only
snapshot and V4 history. Drafts remain local until Apply; Cancel clears only
the Actuals draft. The card submits one atomic whole-object command. Disjoint
field edits can rebase on a newer snapshot; concurrent partition changes and
conflicting fields become stale. A local Forecast membership or RAF draft must
be sequenced and rebased before a dependent Actuals Apply. The matrix scrolls
horizontally in narrow cards while labels and action controls retain keyboard
focus styling.

11A captures the cross-object, Forecast and capacity knowledge formerly scoped
by 10D. Its immutable Portfolio artifact is distinct from object Actuals and
from the disposable planning projection. Project drift is implemented in read-only 11B (DONE);
advanced replay/navigation/comparison remain deferred beyond that promise.

## Portfolio Snapshots — Lot 11A

Status: **DONE** at `f477dd6e1a31f3be7be949dad9fea4cae9667770`,
validated baseline supplied for the 11A.2 pass.

Implementation and final gate record: [11A canon](./steps/PORTFOLIO_SNAPSHOTS/lot11a_canon.md).
The Planning header offers Save portfolio snapshot and a local-time list ordered
by `(createdAt, snapshotId)` ascending. Save is clean-only with a live global
dirty precondition; Delete confirms one entire snapshot. All inputs and exact
minimal Project metrics are deeply copied and frozen. The published run supplies
estimated dates without recomputation. Shared helpers implement first positive
Actuals/Forecast activity and the Timeline completion/end rule.

Complete V7 documents retain current-owned Actuals histories once. Each capture
selects a fixed V5 ID or exclusive frozen legacy evidence, never a latest-at-read
rule. Historical validation hydrates prefixes privately, without invoking the
engine. None, uncovered RAF-only and covered zero knowledge stay distinct.
Save/Delete leave the cursor, viewport, tabs, open cards, drafts and planning
projection intact. Ordinary commands retain the collection and reproject once.
Historical IDs remain reserved for all five entity kinds while a retained
snapshot references them; removing history does no implicit Actuals collection.


## Historical daily load profiles — Lot 11A.2

Status: **DONE**. [Contract and verification](./steps/HISTORY/lot11a2_canon.md).
New Saves use forecast schema 2 with an obligatory Project `dailyProfile`:
`actualsRange` (nullable source knowledge coverage), `forecastRange` (complete
planning horizon), and sorted unique `days` with canonical exact rational
`actualsWorkload` and `forecastWorkload`. Only days with at least one positive
component are stored. Covered zero and missing coverage remain distinct, as do
legacy schema 1 without a profile and schema 2 with an empty list.

Actuals come from the published reconstruction contributions, Forecast from
published Project allocations, aggregated across all Teams without clipping
Actuals to the horizon. Exact conservation, source ranges, activity dates and
deep immutability are validated. Every active Project has at least one Team
requirement, all referenced Teams exist, and the priority order covers every
Project exactly once. The engine publishes one plan per active requirement even
without admission/allocation; positive unallocated RAF produces incomplete plans,
not an empty plan list. Save verifies fully allocated run equality;
partial/unallocated RAF stays in the independent RAF total. No new Actuals
snapshot, legacy reconciliation, engine run or historical redistribution occurs.

V7 accepts schema 1 and 2 together. V6 remains schema 1 only; import preserves
its captures unchanged and never manufactures daily profiles. V6 encoding
rejects schema 2. Save/Delete and ordinary accepted commands write V7 before
publication using the same storage key. Quota/codec errors preserve previous
state and document without purge. 11A.2 itself introduced no UI mode, view, renderer or Timeline
refactoring; the separate 11B implementation follows below. Final edge-case verification found no production defect;
755/755 tests, typecheck, build and diff checks pass. The user-authorized closure
is complete. The separate 11B implementation is **DONE**; the 11A.2 release itself introduced no History UI.


## Project History — Lot 11B

Status: **DONE**. [Implementation, acceptance coverage and measurements](./steps/HISTORY/lot11b_canon.md).
The workspace selector defaults to Planning and opens read-only Project History
in the main space. Planning DOM/editor owners survive idempotent suspend/resume;
modals explicitly block switching. Drafts, dirty, viewport/date, cards/tabs and
focus return unchanged, without projection rebuilding or persistence.

History reads validated captured DTOs only, with no current-label fallback,
V5 hydration or engine replay. It displays the historical Project union, S rows
per group, exact sparse daily Actuals/Forecast stacks, inclusive knowledge markers,
legacy-profile unavailability and previous-presence comparisons. The reference
snapshot owns one horizon; History has an independent viewport and a common
exact visual cap, resampled on effective zoom/dataset changes and stable at pan.
The cache compares canonical ordered snapshot IDs rather than collection copies.
Forecast details distinguish fully/partially allocated and unallocated positive
RAF by exact rational comparison. Activity outside the visible window is determined
from captured days intersecting the reference horizon and temporal viewport,
independently of vertical virtualization.

Rows support hover, focus, daily keyboard navigation and touch. Exact metrics,
coverage/status, timestamps/IDs, dates/reasons and deltas remain in accessible
details; Escape closes them. ID-derived snapshot colors are Programme-independent.
Heavy surfaces are windowed by date and visible Project groups; full gutter rows
retain sequential keyboard access. No Reservations frise, edit, restore, replay,
reference selection or advanced analysis is included. Post-audit suite: 805 tests /
93 suites; typecheck/build/diff checks pass. Desktop/narrow and light/dark review,
benchmark data and known memory/storage/color limits are recorded in the canon.

## Actuals / Forecast temporal separation — Lot 11C

Status: **DONE**, explicitly closed by the user on 2026-10-08.
[Implementation, matrix, measurements and UI review](./steps/HISTORY/lot11c_canon.md).
Current Project V5 coverage supplies an inclusive Actuals end; without V5, the
last pending V4 through applies. Uncovered/RAF-only knowledge has no bound.
Zero consumption retains coverage; erosion and rectification immediately use
the current source. One immutable derived line exists for every Project,
including inactive Projects, and the engine rejects incomplete/invalid inputs.
The common admission/Mandatory predicate requires every Forecast date > this
end across all Teams, preserving priority, slots, caps and shared capacity for
other eligible Projects. Dates/metrics/Timeline consume the corrected run.
Actuals distribution, quantities, RAF and Reservations are unchanged.
New Saves use engine version `/2`; existing captures keep exact profiles and
versions, including old overlap. V5/V6/V7 and History validation/rendering remain
unchanged. 11B is **DONE** by explicit user closure.

## Current UI structure

```text
Planning
├── global Settings icon, Save portfolio snapshot and snapshot list/Delete
├── cumulative Projects / Programs / Pas progress, titled with the Projection date
├── compact diagnostics counts → details modal
├── viewport controls
├── global Projection date band, then year/month rows with the shared marker
├── titled global cumulative Capacity / Occupied / Occupancy / Over-reservation
├── Create Team control for the Team panel collection
├── Team panel
│   ├── Team header + Settings icon + the same four cumulative metrics
│   └── Projection date band above the Project/Reservation lane
├── Team panel...
└── Project and Reservation hover tooltips

Portfolio sidebar
├── Projects → Create Project; reorder handles and #N badges; expandable cards with inline editor, Team subcards and Delete Project
└── Reservations → Create Reservation; expandable cards with inline editor, Team subcards and Delete Reservation
```

The Team panels are aligned with lanes in one SVG/Geometry and one temporal
coordinate system. The date marker crosses the year/month axis and Team lanes;
the global metrics row and Team headers share the SVG's vertical layout. Team
panels are not independent timelines. The pale blue axis rows, Projection date
bands, Team collection row outside its Create Team button, and Team lanes are
clickable temporal surfaces. The Team collection row shows the blue marker
segment without a date label. Each Projection date band repeats the
formatted date beside the same blue marker. The Timeline itself accepts
Left/Right, Home/End keyboard navigation; Ctrl+Left/Right remains global outside
editable fields and modals. The four cumulative metrics use the
inclusive horizon-start-to-selected-date interval. Occupied is requested
reservations plus allocations. The global cartouche sums exact Team quantities
before calculating its ratios; over-reservation remains non-compensating.

The temporal zoom interaction is validated and **DONE**. Zoom +/− uses the
Projection date as its visual anchor while it is in view, or the nearest
visible edge after a pan places it out of view. The date itself does not
change. A primary-pointer click moves that date only when confirmed on pointer
release. Horizontal drag of at least 4 CSS pixels selects an inclusive date
range, shows its two dates
and a translucent preview, and changes the shared viewport on release. A
shorter range expands symmetrically to the seven-day minimum, then clamps to
the horizon. Shift + drag remains pan. The range preview is transient UI
state; Project and Reservation segments remain unselected, and their tooltips
are hidden only while a range drag is active. Native text selection is
disabled on timeline surfaces, not on editable controls.

## Current editing behavior

Project and Reservation cards open independently from the Portfolio lists.
Several cards can stay open and dirty across tab changes. Each card has a
local UI draft; input and change events never dispatch Planning commands.
Apply updates only its entity and rebases other drafts against the new session;
Cancel abandons only its own draft. Dirty borders reflect actual differences
from the current session reference, including Team subcards. Collapsing a card
or Team leaves its draft intact. Team Settings remains a separate modal opened
only from its Settings button.

Every confirmed Timeline click moves only the Projection date according to its
temporal X coordinate. The Timeline has no selected entity or selection summary. The
reserved Timeline region remains one aggregate capacity surface subdivided
visually into identifiable Reservation contributions. Only allocation and
Reservation-segment hits show a business tooltip. The Project tooltip uses the
Team requirement's initial RAF, a global Project estimated end date when all
requirements complete within the horizon, and exact whole-Project progress at
the shared Projection date.

Project Objective end and Mandatory are presented as one date and a toggle.
Mandatory maps to the same date in the existing deadline field; historical
divergent deadlines must be explicitly aligned or removed before Apply.

## Current application commands

The editable session currently accepts:

- `update-planning-settings`: replaces horizon, global working pattern, and
  global parallelism setting;
- `update-project-current-raf`: revises explicit current member RAF patches
  against an immutable RAM base, without snapshot creation;
- `replace-project-actuals`: validates full bases and routes R2 to no-op, RAF
  revision or atomic publication of changed Actuals plus RAF;
- `update-project`: replaces editable fields and the final set of Team
  requirements, preserving explicitly untouched existing RAF and refusing hidden
  numeric revisions, including optional Program/Pas associations, without changing
  Project priority;
- `create-project`: creates one Project with explicitly supplied Team
  requirements and appends it to global priority;
- `remove-project`: removes one Project and its priority entry atomically;
- `reorder-project`: moves one existing Project to a 1-based position in
  `portfolio.priorityOrder`, leaving every Project field unchanged;
- `create-team`: creates a Team with one or more initial capacity periods and a
  collision-safe session ID;
- `remove-team`: removes only an unreferenced Team, without cascade;
- `update-team-name`: renames one existing Team;
- `update-team-capacity-periods`: atomically replaces a Team's capacity periods
  with a validated schedule, including an empty schedule;
- `create-reservation`: creates one validated global Reservation with a
  collision-safe session ID and optionally zero Team allocations;
- `update-reservation`: replaces one existing global Reservation and all its
  enabled Team allocations;
- `remove-reservation`: removes one existing global Reservation.

Every ordinary accepted input change immutably replaces session state and triggers one
projection rebuild. Dedicated Portfolio Snapshot Save/Delete persist first and
reuse the projection with zero recomputation. A same-position reorder retains the existing state and
projection. Rejected commands do neither.

## Active temporary constraints

These are current implementation facts, not durable product rules:

- the browser starts from the hard-coded demo when no valid local backup is
  available; an invalid stored document is preserved and reported;
- existing Project Team requirement membership continues to use
  `update-project`;
- capacity periods can be added or removed for an existing Team, but have no
  manual reorder control;
- capacity exceptions exist in the domain but have no editor;
- Project `dailyCap` remains active in domain/planner but is hidden and
  preserved exactly by unrelated Project Apply;
- Project priority is reordered through Portfolio Projects handles; card
  badges show derived positions;
- Program/Pas catalogs are derived from Project and Reservation references;
  they have no separate management or global rename UI;
- the former daily Team summary is removed; cumulative metrics remain in Team
  headers and the Projects / Programs / Pas surface;
- Ctrl+ArrowLeft/Right moves the Projection date outside editable fields and
  modals without recomputing planning;
- Reservation allocation rows may be enabled/disabled for existing Teams;
- no dedicated automated browser/E2E stack is present; coverage is primarily
  domain, application, adapter, geometry, controller, and DOM unit tests.

## Not part of the current implemented canon

- separate Program / PriorityFamily management screens or global rename;
- undo/redo;
- advanced historical replay/navigation/comparison and restoration (deferred).

These omissions are ordered as future work in the
[current plan](./current_plan.md); they must not be inferred from visual
placeholders or implemented incidentally in unrelated lots.
