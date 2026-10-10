# FlowPlan2 V2 — livraison R0.1 Rewrite Initialization

Date : 2026-10-10. **R0.1 — IN REVIEW**. R0 reste clôturé ; R1 et R2–R6
NOT STARTED/non autorisés. Aucun DONE auto-déclaré. Point d'entrée :
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
| P6 | commit de livraison du présent canon, SHA rapporté après push | Documentation/registres/rollback livrés ; G15 browser bloqué par port occupé et preuve Windows manquante |

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
| G15 | PARTIEL / BLOQUÉ | Checkout historique exact : npm ci/typecheck/build et 3 tests portable ont passé lors tentative ; démarrage 4174 échoue EADDRINUSE (serveur utilisateur PID 31866). Consultation Current/History du checkout jetable non obtenue. Ancien SEA Windows 4175 également non exécuté |
| G16 | PARTIEL / WINDOWS MANQUANT | HTTP portable hors SEA PASS, ports V2 libérés ; rollback P1–P5 PASS. Véritable exe Windows V2 et ancien portable de référence non exécutés |

Preuves brutes : [gates techniques](./proofs/r01/technical-gates.json),
[isolation browser](./proofs/r01/browser-isolation.json),
[rollback](./proofs/r01/rollback.json),
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

Le processus existant `node scripts/dev.mjs`, PID 31866, cwd FlowPlan2, occupe
4174. Il n'a pas été lancé par cette mission. Une demande d'accord pour arrêt
temporaire/redémarrage a été envoyée ; aucune interruption sans accord.
Aucun autre port substitué silencieusement à G15. Le test reproductible
`scripts/v2/legacy-reference-test.mjs` crée son propre clone detached au SHA
historique, installe/build/typecheck/portable, consulte Current puis capture et
History via profil jetable, et vérifie le rollback. `--rollback-only` permet la
preuve de rollback sans arrêter ce processus ni ouvrir de données utilisateur.

Rollback effectivement testé sur code P1–P5 `f9a57eb` dans un clone jetable :
reverts des cinq commits en ordre inverse, tree identique à celui de baseline,
arbre propre, zéro conversion ; sentinelles de laboratoire aux quatre origines
4174/4175/4274/4275 conservées (hashes égaux). Aucun commit de preuve du clone
n'est poussé. Les futurs commits documentaires P6 n'affectent pas le runtime ;
revert/abandon du rewrite et arrêt de ses serveurs suffisent tant que R1/R2 n'ont
pas introduit de persistence. Ne relancer un checkout reverté qu'en environnement
historique séparé, pas comme V2. Aucun cleanup global ou inverse de données.

Restant avant audit complet/clôture :

1. Obtenir accès à 4174 pour exécuter G15 Current/History du checkout historique
   jetable selon le protocole, puis restaurer le serveur existant si interrompu.
2. Sur Windows x64 Node 26 : npm ci, build:sea:v2, test:sea:v2 ; obtenir la preuve
   native FlowPlan2-V2.exe sur 4275 (browser/sentinelles/arrêt/port) et celle de
   l'ancien portable historique indépendant sur 4175 dans son checkout/profil.
3. Auditer indépendamment l'implémentation/provenance/gates complètes, puis
   validation utilisateur. Aucune transition DONE automatique, R1/R2 restent interdits.

Le contrôle de disponibilité Windows retourne explicitement : « Real SEA build
requires Windows x64 with Node 26 ». Le smoke hors SEA n'en tient jamais lieu.
Le blocage du port est environnemental, pas un changement de cible architecturale.
Données réelles et bascule opérationnelle non traitées ; sauvegarde/restauration
utilisateur vérifiée de R0 §6 reste requise avant cette bascule.

Registre de reprise : opérations techniques/exclusions R0.1 enregistrées avec
source/SHA/destination/dépendances/contrats/preuves ; aucune extraction métier
R1+ réalisée. Contrats R0 inchangés ; trackers actifs actualisés et archives
historiques préservées. Diff/check/documentation/liens revus avant commit P6 ;
SHA final, arbre propre et synchronisation origin rapportés après push/fetch.
