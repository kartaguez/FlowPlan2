# FlowPlan2 V2 — livraison R0.1 Rewrite Initialization

Date : 2026-10-10. **R0.1 — DONE**. R0 reste clôturé ; R1 et R2–R6
NOT STARTED/non autorisés. Clôture explicitement autorisée par l’utilisateur
après audit indépendant favorable de l’architecture, des frontières d’isolation
et des preuves disponibles au SHA `d5bb1a89c847604f2f80aaaa3270e4125f4a3fef`. Point d'entrée :
[current_plan](../../current_plan.md). [Plan audité](./rewrite_r01_plan.md).

## Autorisation, baseline et séquence

GO utilisateur explicite reçu après audit favorable du plan au SHA exact
`1c2b08c727af9fb8002b7678bd7403fcc0d39c27`. P0 : fetch réussi, HEAD et origin
référence identiques, arbre propre, divergence 0/0, branche rewrite absente locale
et distante. La première vérification ls-remote a rencontré une restriction DNS ;
la même vérification autorisée hors sandbox a réussi, sans réparation Git.
`rewrite/portfolio-versioned` créée exactement à ce SHA, contrôlé immédiatement.
Branche historique préservée, aucun reset/rebase/merge ni force-push.

| Étape | Commit livré | Résultat réel |
| --- | --- | --- |
| P0 | baseline `1c2b08c727af9fb8002b7678bd7403fcc0d39c27` | PASS préflight et création exacte |
| P1 | `55abb92` | Configs physiques V2, garde AST/realpath/compilation, 19 tests techniques PASS |
| P2 | `70a268e` | DTO shell immutable et environnement dédié ; typecheck + 23 tests V2 PASS |
| P3 | `a382539` | Composition/entrypoint/DOM/CSS neufs ; build fermé, typecheck + 25 tests PASS |
| P4 | `4d2e18f` | Serveurs fixes et packaging ; build et 29 tests techniques PASS, puis 35 tests V2 au total |
| P5 | `f9a57eb` | 39 tests V2, compilation sans ancien src et avec source invalide, watcher, six séries natives et preuves archivées PASS |
| P6 | commit de livraison du présent canon, SHA rapporté après push | Documentation/registres/rollback livrés à d505de7 ; complément G15 après accord utilisateur, preuve Windows manquante |

Les corrections de tests/harness pendant P1–P5 ont été vérifiées avant passage :
normalisation /var → /private/var des chemins macOS, type assertion readonly des
tests, requête Host brute (fetch ne transmet pas ce header comme demandé), cache
browser des pages de fixture désactivé, lecture de métadonnées d'index pendant
transaction active, snapshot mémoire des assets du portable de test. Aucune
architecture métier introduite pour résoudre ces écarts techniques. Un timeout
ou une tentative de gate échouée n'est jamais compté comme preuve positive.

## Runtime livré et frontières

`src-v2/` contient cinq modules production : bootstrap/emptyPortfolioShellState,
environment/browserIsolation, main/main, main/createV2Application, ui/renderV2Shell.
Trois fichiers de tests TS adjacents ; aucun Domain, Engine, repository ou History.
Composition synchrone : origine autorisée → DTO shell gelé → montage DOM neuf.
DTO exact : kind empty, teams/projects/reservations/snapshots tableaux vides readonly.
Aucun ID, dates, Settings/Order, manifeste Current ou default métier inventé.
Erreur d'origine : diagnostic alert explicite, aucun marqueur ready, erreur conservée.
Échec de root/contexte : erreur, jamais fallback. destroy est idempotent.

Build `dist-v2/` : sept assets exactement (index/styles et cinq modules).
Configs autonomes app/test, liste de compilation réellement vérifiée ; tests sous
`.test-dist-v2/`, découverte V2 exclusivement et refus des skips/todos/cancellations.
Outils TypeScript existants et Node natifs, dépendances/lockfile inchangés.
Toutes commandes npm normales ciblent V2 ; benchmark legacy retiré des aliases.
`test:storage` signifie isolation, aucune persistence métier. Ancien src/public/
scripts top-level et configs app/test conservés à l'identique comme référence.

Garde fermé R0.1 : imports et re-exports/types/dynamiques, realpath/symlinks,
références TS, dépendances compilées et déclarations approuvées, package aliases,
artefacts/HTML/CSS et capacités browser inutiles refusés. Aucun import runtime
externe ni Worker/module URL/script injecté. Ce checker est borné à R0.1 ; les
lots suivants devront documenter tout élargissement nécessaire.

Serveurs GET/HEAD/Host exacts, allowlist et no-store/nosniff, traversées refusées.
Dev 127.0.0.1:4274 ; portable 127.0.0.1:4275 ; PORT différent refusé et collision
EADDRINUSE explicite, aucun port alternatif. Watch sources/config V2 et public-v2 :
rebuild complet validé avant échange du handler en mémoire ; invalidité arrête
le serveur, jamais de page legacy servie en compensation. SEA collecte uniquement
assets V2, helper HTTP V2 incorporé dans main autonome ; sortie FlowPlan2-V2.exe.

Les quatre namespaces V2 prévus sont readonly et réservés, distincts du legacy.
**Aucune API storage/canal n'est appelée, même V2.** Pas de DB/version/store,
CAS/receipt/staging/import/export/recovery, cleanup, migration ou bridge runtime.

## Gates individuelles et preuves

Environnement observé : macOS (darwin), Node v24.21.0, TypeScript 5.9.3,
Edge `154.0.4258.53` / CDP 1.3. Tests V2 **39/39**, zéro skip/todo/failure/cancel.
Commands : npm run typecheck:v2, build:v2, test:v2 et smoke:v2.
Smoke indique explicitement « available platform gates », jamais PASS SEA.

| Gate | Résultat | Preuve / portée |
| --- | --- | --- |
| G01 | PASS | App : cinq sources V2 ; copies jetables sans src puis avec src syntaxiquement invalide : typecheck/build/test PASS |
| G02 | PASS | 6 tests TS + 24 tests de frontière + 9 HTTP = 39 ; compiler/découverte V2 seuls |
| G03 | PASS | Vrais HTML/JS/CSS 200, marqueur ready et aucun pageerror ; 1440/390, aucun overflow |
| G04 | PASS | Profils propres, quatre compteurs zéro, reload/deux tabs/destroy/remount, zéro DB créée |
| G05 | PASS | Fermeture source/artefacts ; aucun module/demo chargé ou construit |
| G06 | PASS | Pas de codec/repository/worker ni API storage, y compris backup laboratoire valide et JSON invalide |
| G07 | PASS | Six séries : absent/valide/invalide sur 4274 et 4275 ; même état vide |
| G08 | PASS | Égalité intégrale schéma/version/stores/indexes/clés/valeurs/Storage ; hashes avant/après égaux |
| G09 | PASS | Journal app IDBFactory open/deleteDatabase/databases = zéro ; inventaires témoins inchangés |
| G10 | PASS | Hooks Storage getters/méthodes ; aucun accès backup, même tenté puis attrapé |
| G11 | PASS | Zéro constructeur channel app ; peer legacy envoie sans effet et ne reçoit aucune émission app |
| G12 | PASS | Deux origines exactes ; Host localhost refusé, PORT=4174 refusé, collision fail, copie sur 4276 refusée sans ready |
| G13 | PASS | AST/resolver/realpath/programmes TS + canaris types/barrels/dynamic/Worker/URL/symlink/alias/package |
| G14 | PASS | Sept assets fermés, requêtes mêmes origines, aucun worker/iframe/SW produit ; chemins legacy 404 |
| G15 | PASS sur macOS / WINDOWS MANQUANT | Checkout historique exact : npm ci/typecheck/build et 3 tests portable PASS ; Current (3 Teams), une capture et History (4 lignes) consultés sur 4174, sans V2 ni exception. Ancien SEA Windows 4175 non exécuté |
| G16 | PARTIEL / WINDOWS MANQUANT | HTTP portable hors SEA PASS, ports V2 libérés ; rollback P1–P6 PASS. Véritable exe Windows V2 et ancien portable de référence non exécutés |

Preuves brutes : [gates techniques](./proofs/r01/technical-gates.json),
[isolation browser](./proofs/r01/browser-isolation.json),
[rollback initial P1–P5](./proofs/r01/rollback.json),
[consultation historique et rollback P1–P6](./proofs/r01/legacy-and-rollback.json),
[serveur legacy restauré](./proofs/r01/legacy-server-restored.json),
[capture History legacy](./proofs/r01/legacy-history-4174.png),
[build historique indépendant](./proofs/r01/legacy-build.json),
[capture dev 390](./proofs/r01/dev-390.png),
[capture dev 1440](./proofs/r01/dev-1440.png),
[capture portable 390](./proofs/r01/portable-390.png),
[capture portable 1440](./proofs/r01/portable-1440.png).
Les journaux restent des données de laboratoire, aucun profil/backup utilisateur.

28 hooks installés avant chaque contexte applicatif ; canaris indépendants
produisent 13 tentatives/erreurs attendues par série. Bindings CDP remontent les
appels au harness, même catchés. Contextes fixture/verifier/peer distincts de
l'app ; leurs accès nécessaires ne sont pas comptés comme appels applicatifs.
Deux DB legacy exactes (principal v2, huit stores et index receipt ; scratch v1),
DB/key témoins et backup sur **l'origine V2**. Témoins complémentaires 4174/4175
inchangés sur les trois profils. Aucun worker de produit ; workers internes
chrome-extension d'Edge éventuels identifiés séparément dans les preuves.
Pas de port applicatif éphémère ; seul le debugging CDP est éphémère.

## Ancienne application, rollback et preuves restantes

Le blocage initial de 4174 a été levé après accord explicite de l'utilisateur
pour l'arrêt temporaire du processus `node scripts/dev.mjs` PID 31866 et son
redémarrage. Identité revérifiée avant SIGTERM ; aucun autre processus interrompu.
Le test reproductible `scripts/v2/legacy-reference-test.mjs` a exécuté le clone
detached au SHA historique exact, npm ci/typecheck/build/3 tests portable, puis
Current (3 Teams), Save d'une capture et consultation History (4 lignes), dans un
profil jetable Chromium. Aucun runtime V2 chargé et aucune exception browser.
Capture native inspectée et preuves brutes archivées. Aucun profil réel utilisé.

Le serveur du clone a été arrêté avant rollback, puis le serveur utilisateur
legacy a été restauré dans FlowPlan2 via `node scripts/dev.mjs`, PORT=4174,
PID 19550. HTTP 200 et titre historique FlowPlan vérifiés ; journal de lancement
`/private/tmp/flowplan-legacy-restored.log`. Le redémarrage figurait dans un finally
pour garantir la restauration également en cas d'échec de preuve. Aucune commande
npm dev V2 substituée à son serveur legacy. Les origines V2 restent libres.

Rollback testé sur `d505de7d45e2fb1126305160eb6b551fc86ed1b3` (P1–P6) dans ce clone
jetable : six reverts en ordre inverse, tree `9ed29c9d4fc1ad0a5c927034a3eba675f14f73ab`
identique à la baseline, arbre propre, zéro conversion ; sentinelles laboratoire
aux quatre origines 4174/4175/4274/4275 conservées, hashes égaux. Aucun commit de
preuve du clone poussé. La preuve initiale P1–P5 reste conservée séparément.
Les ajouts documentaires de ce complément n'affectent pas le runtime. Revert/
abandon du rewrite et arrêt de ses serveurs suffisent tant que R1/R2 n'introduisent
pas de persistence. Ne relancer un checkout reverté qu'en environnement historique
séparé ; aucun cleanup global ou conversion inverse.

## Limites Windows résiduelles

Décision utilisateur du 2026-10-10 : [I-R01-C](./rewrite_decisions.md#amendement-de-clôture-r01--report-windows),
amendement ciblé du [plan §13](./rewrite_r01_plan.md#13-amendement-de-clôture-du-2026-10-10).
Le packaging Windows est périphérique au socle technique ; son absence de
validation ne bloque plus DONE R0.1. Aucune autre gate n’est modifiée et les
résultats historiques G01–G16 ci-dessus sont conservés sans requalification.

| Limite résiduelle | Statut réel | Condition de levée |
| --- | --- | --- |
| Construction et exécution réelles de FlowPlan2-V2.exe sur Windows x64 | DEFERRED / NOT EXECUTED | Environnement Windows x64 compatible, Node 26 pour construction ; build:sea:v2 puis test:sea:v2 sur véritable exécutable, preuves archivées |
| Portable historique Windows indépendant | DEFERRED / NOT EXECUTED | Checkout/profil historique séparé ; construire/exécuter le vrai portable sur Windows, origine 4175 ; preuves archivées |
| Ports, assets, sentinelles et arrêt natifs des exécutables | DEFERRED / NOT EXECUTED | Vérifier origines 4275/4175, assets attendus, sentinelles intactes, arrêt/libération des ports sur Windows compatible |

Ces validations restent **obligatoires avant toute déclaration de compatibilité
ou disponibilité, qualification ou distribution Windows**. Aucun non-exécuté
n’est PASS. Le socle V2/browser validé est disponible ; le packaging Windows
n’est pas qualifié. La levée doit être explicite dans ce canon et le registre de
décision, avec résultats et preuves Windows réelles. Elle n’est pas exécutée
pendant la clôture documentaire.

## Clôture et prochaine étape

Le 2026-10-10 : audit indépendant favorable sur l’implémentation/provenance et
preuves disponibles à `d5bb1a89c847604f2f80aaaa3270e4125f4a3fef`, puis validation
utilisateur explicite avec report Windows I-R01-C. **R0.1 DONE** sous ce critère
amendé ; aucun DONE inféré d’un test non exécuté. Préflight documentaire : branche
rewrite exacte, HEAD/origin au SHA audité, arbre propre et origin 0/0 après fetch.
Cette mission conserve tous commits, journaux, captures et limites historiques ;
aucun nouveau test ni exécution applicative. Seuls statuts/décision/limites de
clôture documentaire sont mis à jour.

**Prochain lot R1 — NOT STARTED ; R2 — NOT STARTED.** Rendre la main pour cadrage,
plan, audit et autorisation propres de R1 ; aucun début R1/R2 ou extraction métier.

Le contrôle de disponibilité Windows retourne explicitement : « Real SEA build
requires Windows x64 with Node 26 ». Le smoke hors SEA n'en tient jamais lieu.
Le blocage initial du port a été résolu avec accord utilisateur, sans changement de cible architecturale.
Données réelles et bascule opérationnelle non traitées ; sauvegarde/restauration
utilisateur vérifiée de R0 §6 reste requise avant cette bascule.

Registre de reprise : opérations techniques/exclusions R0.1 enregistrées avec
source/SHA/destination/dépendances/contrats/preuves ; aucune extraction métier
R1+ réalisée. Contrats R0 inchangés ; trackers actifs actualisés et archives
historiques préservées. Diff/check/documentation/liens revus avant commit P6 ;
SHA final, arbre propre et synchronisation origin rapportés après push/fetch.
