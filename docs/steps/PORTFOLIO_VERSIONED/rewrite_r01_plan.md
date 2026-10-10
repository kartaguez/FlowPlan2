# FlowPlan2 V2 — PLAN R0.1 : Rewrite Initialization

**État courant : R0.1 DONE**, clôture documentaire utilisateur du 2026-10-10
après audit indépendant favorable au SHA `d5bb1a89c847604f2f80aaaa3270e4125f4a3fef`.
Le critère initial SEA Windows est amendé exclusivement par [§13](#13-amendement-de-clôture-du-2026-10-10) :
Windows DEFERRED / NOT EXECUTED, obligatoire avant qualification/distribution,
non bloquant pour la clôture. Résultats conservés dans le [canon](./rewrite_r01_canon.md).
Les états PLANNED et checklist §12 ci-dessous sont le dossier historique de
préparation, pas l’état courant ; aucune autorisation R1/R2 n’en découle.

Date : 2026-10-10. **PLANNED / NOT STARTED**. Préparation documentaire autorisée ;
aucune implémentation, branche rewrite ou extraction réalisée. R0 reste clôturé.
Conclusion de préparation : **READY FOR IMPLEMENTATION**, sous réserve du propre
audit du plan et de l'autorisation explicite de lancement exigés par R0 §12.
READY qualifie la précision du plan, pas un GO ni une preuve d'implémentation.

Point d'entrée : [current_plan](../../current_plan.md). Autorités :
[registre des décisions](./rewrite_decisions.md), [R0](./rewrite_r0_plan.md),
[registre de reprise](./rewrite_reuse_registry.md), [current_canon](../../current_canon.md).
Le présent plan précise l'infrastructure R0.1 dans ces contrats ; il ne remplace
aucun T/I métier. Aucune conversation antérieure n'est utilisée comme norme.

## 1. Baseline, préconditions et arrêt

Dépôt `kartaguez/FlowPlan2`, branche documentaire actuelle
`codex/lot11a-portfolio-snapshots`. Baseline exacte inspectée :
`3e4b8a8e02c8cc8803d38021ea4606694495dea1` ; HEAD et origin identiques après
fetch, `git status --short` vide, `rev-list --left-right --count` = `0 0`.
Lecture initiale exclusive de `docs/current_plan.md`, puis décisions, dossier R0,
registre de reprise et section active du canon. Aucun AGENTS.md applicable trouvé
dans le dépôt ou ses parents. Pas d'autre trajectoire active ni contradiction
nécessitant de rouvrir R0 ; les anciens trackers sont explicitement archives.

La présente mission ne change que six Markdown : ce plan, les deux trackers,
les deux registres et le statut de reprise du dossier R0. Aucun test applicatif
exécuté ; inspection du code et contrôle documentaire seulement. Les gates
ci-dessous sont **futures**, aucune n'est déclarée PASS par cette préparation.
Le SHA de livraison est donné après commit/push ; pas de SHA auto-référent.

Avant implémentation, auditer le commit documentaire final exact, puis obtenir
l'autorisation distincte de créer `rewrite/portfolio-versioned` et de lancer R0.1.
Depuis la branche de référence, refaire fetch/status/divergence/HEAD/origin.
HEAD doit être le SHA audité explicitement désigné, arbre propre et origin 0/0.
Vérifier l'absence locale et distante de la branche future. Écart, contradiction
normative ou besoin de métier anticipé : **STOP**, aucun reset, réparation ou
substitution de latest. Création future depuis ce SHA par
`git switch -c rewrite/portfolio-versioned <SHA_AUDITE>` ; aucun orphan/merge.
Ne modifier ni pousser de code sur la branche historique pendant R0.1.

L'export/restauration vérifié de l'ancien Portfolio (R0 §6) reste obligatoire
**avant bascule opérationnelle avec des données réelles**. Il n'est ni effectué
ni prétendu acquis ici. Les preuves R0.1 utilisent uniquement des profils jetables.

## 2. Inventaire factuel confronté au code

Tous les chemins suivants sont relatifs à la racine, constatés à la baseline §1.

| Surface inspectée | Comportement réel et couplage | Conséquence R0.1 |
| --- | --- | --- |
| `public/index.html`, `src/main/main.ts` | HTML charge `./js/main/main.js` ; appelle `createPersistentPlanningApplication(root)` | Nouvelle page et nouvel entrypoint, aucun asset HTML legacy copié |
| `src/main/createPersistentPlanningApplication.ts` | Imports Domain via barrel, session, dispatcher, projection, UI, History, IDB, backup, demo ; création du channel avant ouverture DB | Composition root nouvelle ; transformer cette fonction est exclu |
| Même composition root | `readLegacy` lit `window.localStorage.getItem(PLANNING_BACKUP_KEY)` ; listeners `storage` et `focus` recontrôlent l'ancien backup ; exports legacy/source migration, acknowledgment, recovery/import | Aucun de ces listeners, commandes ou ports dans le shell V2 |
| Même composition root | `openPlanningRepository({ fallback: createDemoPlanningScenario(), ... })` : demo construite même si Current existe, par évaluation de l'argument | Une suppression de l'affichage demo ne suffirait pas ; aucun import/call/transitif demo |
| `src/application/persistence/repositoryTransfer.ts` | Current existant : fingerprint backup puis readCurrent ; sinon lecture backup, inspection V1–V8 ou fallback, preflight, staging `migration-*`, relecture fingerprint, activation, readCurrent | Ne réutiliser ni opener ni recovery ni un repository renommé |
| `src/infrastructure/persistence/indexedDbRepositoryStorage.ts` | DB `flowplan-planning`, ouverture version 2 ; upgrade crée stores/index receipt, modifie stages v1 et identityCount ; imports codecs/capture/repository | Aucun opener ou upgrade en R0.1, même avec un autre nom de DB |
| `src/application/persistence/repositoryStorage.ts`, `createPlanningRepository.ts` | Huit stores anciens ; Current, générations, jobs, receipts, migration-source et acknowledgeLegacy couplés à l'ancien modèle | Conservation comme référence R2 ; aucun port métier provisoire |
| `snapshotValidationWorker.ts`, `planningStorageWorker.ts` | `new Worker(new URL('./planningStorageWorker.js', import.meta.url))` ; worker importe codec, legacyRepairs, validation/capture et ouvre IDB selon request.database | Interdire aussi les chemins Worker/URL/dynamic import ; graphe statique seul incomplet |
| `indexedDbHistoryScratch.ts` | DB fixe `flowplan-history-workspace` v1, store chunks ; namespace UUID concerne les clés, pas le nom de DB ; dispose supprime ces clés | Réserver nouveau nom ; aucun scratch ni cleanup V2 R0.1 |
| `localPlanningBackup.ts` | Clé réelle `flowplan.backup.v1`, wrapper read/write Storage | Aucun accès même readonly, aucun wrapper extrait |
| Composition root | `new BroadcastChannel('flowplan-planning-revisions')`, notification post-commit et contrôle multi-tab | Aucune création de channel en R0.1 ; nouveau nom réservé seulement |
| `buildPlanningSessionProjection.ts`, `mountPlanningApplication.ts`, `main/demo/createDemoPlanningScenario.ts` | Projection reconstruit Actuals et exécute moteur ; mount entraîne controllers/geometry/barrels ; demo crée Teams/Projects/Reservations et PlanningSettings inline | Aucun render/mount/projection historique ; UI vide neuve sans simulation |
| `package.json`, `tsconfig*.json` | Node >=24, TypeScript 5.9.3, @types/node 26.6.2 ; NodeNext ES2024 strict ; app inclut `src/**/*.ts`, exclut tests/fixtures ; test inclut tout src ; tsconfig.json étend app | Configs V2 indépendantes, inclure V2 seulement ; pas simple exclude legacy |
| `scripts/build.mjs` | Nettoie dist, compile config app, copie public entier, crée dossiers des six anciennes couches | Nouveau build dist-v2/public-v2 uniquement ; aucune invocation de build legacy |
| `scripts/dev.mjs` | Appelle build legacy, watch config legacy, sert dist ; host 127.0.0.1, PORT env sinon 4174 ; mirror public à chaud | Nouveau dev fixe avec Host validé, watch borné ; PORT ne doit pas déplacer l'origine |
| `scripts/test.mjs` | Nettoie .test-dist, compile tout ancien src et découvre récursivement tous .test.js | Nouveau runner .test-dist-v2 ; aucune suite/fixture historique incluse |
| `scripts/build-sea.mjs` | Appelle build legacy ; collecte tout dist ; exige index/main/styles ; Windows x64 Node 26, embeds portable-server.cjs | Nouvelle collecte allowlist dist-v2 ; serveur portable V2 indépendant |
| `scripts/portable-server.cjs`, `.test.cjs`, `smoke-sea.ps1` | Portable 127.0.0.1:4175 fixe, Host exact, allowlist assets, no-store ; SEA lance navigateur sauf --no-browser ; smoke vise 4175 | Adapter mécanismes techniques vers 4275 ; ne pas lancer l'ancien exécutable |
| `scripts/storageBrowserHarness.mjs` | Chromium/CDP sans dépendance, profil mkdtemp, port HTTP aléatoire, dist hardcodé ; APIs evaluate et workers | Référence technique, adaptation autonome vers dist-v2 et ports fixes ; pas import direct du harness |
| `.gitignore`, scripts audit/benchmark storage/history | Ignore dist/.test-dist seulement ; benchmarks importent demo/codecs/IDB depuis dist | Ajouter sorties V2 aux ignores ; aucun alias V2 vers ces benchmarks |

Recherche complémentaire hors tests/fixtures : pas de produit ServiceWorker,
CacheStorage ou sessionStorage identifié ; la recherche ne vaut pas permission
d'en ajouter. Aucun import automatique vers flowplan1/codecs/backups autorisé.
Les barrels `domain/index.ts`, `application/index.ts`, `adapters/index.ts` et les
workers sont des chemins transitifs vers l'ancienne architecture ; tous sont
inaccessibles par la règle de fermeture physique §6, types compris.

## 3. Cible et Portfolio vide borné à R0.1

Isolation physique forte retenue : **`src-v2/`**, `public-v2/`, `scripts/v2/`,
`dist-v2/`, `.test-dist-v2/`. L'ancien `src/`, `public/` et les scripts historiques
restent au tip comme patrimoine consultable, hors graphes V2. Leur suppression
physique n'est pas requise en R0.1. Ce choix applique la séparation R0 §7 sans
conversion incrémentale de l'ancien runtime. Aucune extraction métier R0.1.

Entrée HTML → `main/main.ts` V2 → contrôle d'origine →
`createV2Application(root)` → `createEmptyPortfolioShellState()` → `renderV2Shell`.
La composition est synchrone, neuve, sans repository, codec, worker, canal,
import/recovery, engine, History, horloge métier ou ancienne UI. Aucun paramètre
`databaseName`, legacy port, callback de fallback ou module externe injecté.
Le root DOM absent donne une erreur explicite ; l'origine refusée ne monte rien.
Une erreur de montage est un échec de démarrage, jamais un fallback legacy/demo.

Le Portfolio vide est un état RAM légitime du shell : discriminant `empty`,
champs readonly `teams`, `projects`, `reservations`, `snapshots`, chacun tableau
vide, structure et
collections gelées. Ce DTO technique n'est ni une entité Domain V2 ni un
Current/manifeste métier provisoire. Pas d'IDs, Rational, Date, PlanningSettings,
PortfolioOrder, AP/PT/RT/PTEC, versions, default horizon/weekdays/N. R1 définit
ces contrats ; R2 matérialise le premier dépôt durable sous R0 §6.
R0.1 prouve l'absence d'entités et de source ancienne, pas la fermeture d'un
graphe métier inexistant à ce stade. Aucun état métier existant n'est lu puis
remplacé silencieusement par vide : **aucun dépôt n'est ouvert**.

UI minimale : titre « FlowPlan2 V2 », section « Portfolio », statut accessible
« Portfolio vide », quatre compteurs zéro, marqueur DOM `data-flowplan-runtime="v2"`
et `data-portfolio-state="empty"`. Après montage réussi uniquement,
`data-flowplan-ready="true"` identifie la disponibilité ; aucun ready sur refus. Aucun formulaire métier, Import, Save, History,
Timeline ou bouton démo. CSS minimal propre ; aucune copie de styles/controllers
R5. Retour du montage : état readonly + destroy idempotent retirant le shell.
Deux montages/destroy testés sans listeners résiduels ni effet browser.
Reload, nouvelle tab, focus/blur, événement storage et messages legacy conservent
le vide. Aucune commande de mutation n'est nécessaire pour « utiliser » ce shell.

### Arborescence exacte proposée

```text
src-v2/
  main/main.ts
  main/createV2Application.ts
  main/createV2Application.test.ts
  bootstrap/emptyPortfolioShellState.ts
  bootstrap/emptyPortfolioShellState.test.ts
  environment/browserIsolation.ts
  environment/browserIsolation.test.ts
  ui/renderV2Shell.ts
public-v2/
  index.html
  styles.css
scripts/v2/
  boundaries.mjs
  boundaries.test.mjs
  build.mjs
  dev.mjs
  test.mjs
  request-handler.cjs
  servers.test.cjs
  portable-server.cjs
  build-sea.mjs
  smoke-sea.ps1
  browser-harness.mjs
  browser-isolation-test.mjs
  smoke.mjs
tsconfig.v2.app.json
tsconfig.v2.test.json
```

`domain/`, `application/`, `planning-engine/`, `persistence/` et
`historical-simulation/` seront ajoutés à src-v2 dans leurs lots propriétaires ;
pas de .gitkeep, interface métier ou implémentation anticipée. Les tests TS
adjacents appartiennent exclusivement à src-v2. Pas de fixture métier R0.1.

## 4. Build, typecheck, tests et portable

Conserver Node >=24, TypeScript verrouillé et modules natifs, aucune nouvelle
dépendance/framework. Config app V2 autonome (n'étend pas tsconfig.app.json) :
reprendre explicitement ses options strictes/ES2024/DOM/NodeNext, rootDir src-v2,
outDir dist-v2/js, include src-v2/**/*.ts, exclude *.test.ts et *.fixture.ts,
`types: []` pour ne pas injecter Node dans le runtime browser. Config test V2
étend **la config V2**, rootDir src-v2, outDir .test-dist-v2, types [node],
include src-v2/**/*.ts, exclude vide. tsconfig.json pointe vers V2 sur le rewrite ;
anciens tsconfig.app/test restent références non invoquées par commandes V2.
`exclude` seul n'empêche pas les imports ; garde indépendante §6 obligatoire.

Commandes futures dans package.json du rewrite :

| Commande | Destination exacte |
| --- | --- |
| `check:boundaries:v2` | `node scripts/v2/boundaries.mjs` |
| `typecheck:v2` | garde source puis tsc -p tsconfig.v2.app.json --noEmit |
| `build:v2` | `node scripts/v2/build.mjs` : garde, nettoyage dist-v2, tsc config V2, copie allowlist public-v2, garde artefacts |
| `test:v2` | `node scripts/v2/test.mjs` : garde, nettoyage .test-dist-v2, compile config test V2, liste compilée contrôlée, node --test uniquement tests V2 et scripts/v2/*.test.* explicites |
| `dev:v2` | `node scripts/v2/dev.mjs`, build V2 puis watch config V2 et public-v2 uniquement |
| `test:browser:v2` | build V2 puis `node scripts/v2/browser-isolation-test.mjs` |
| `test:portable:v2` | `node --test scripts/v2/servers.test.cjs` |
| `build:sea:v2` | `node scripts/v2/build-sea.mjs` |
| `test:sea:v2` | PowerShell scripts/v2/smoke-sea.ps1 |
| `smoke:v2` | `node scripts/v2/smoke.mjs` orchestre garde/typecheck/build/test/portable/browser et exige tous PASS |

Les commandes courantes dev/build/typecheck/test/build:sea/test:portable/test:sea
sont des aliases vers leurs homologues V2 sur le rewrite. `test:storage` pointe
explicitement vers `test:browser:v2` avec description « isolation, sans persistence
métier ». Les commandes benchmark:storage et autres éventuels lanceurs legacy
sont retirés du package rewrite ; aucun benchmark ancien n'est une gate V2.
README documente commandes/ports/scope ; historique consultable dans son checkout.
Aucun alias V2 ne peut appeler scripts/build.mjs, dev.mjs, test.mjs, build-sea.mjs
ou portable-server.cjs historiques. package-lock inchangé si seuls scripts changent.

Build indépendant : nettoyer uniquement dist-v2, jamais dist ; public-v2 ne
contient ni js/ ni ancien HTML. Sorties app excluent tests/fixtures/proof. Garde
contrôle liste des sources tsc réellement résolues et artefacts (pas seulement
rootDir/include). Les déclarations standard TypeScript et @types/node des tests
sont des dépendances techniques distinguées des sources app ; aucune déclaration
issue de src legacy n'est admise. G01 ajoute une corruption syntaxique sentinelle dans ancien src
en copie temporaire : build/typecheck/tests V2 restent PASS, preuve qu'il n'est
pas compilé même s'il reste physiquement présent. Typecheck et tests ne compilent aucun fichier sous src/.
Runner échoue si zéro tests, skip/todo/failure/cancellation ou découverte hors
périmètre. Tests techniques Node contrôlent boundary/server ; tests TS contrôlent
état/origines/composition sans mocks prétendus preuve native du stockage.
Node teste état gelé et refus d'origine avant toute opération DOM/storage ; les
assertions de montage DOM/destroy heureux sont natives dans G03/G04, sans
ajout de jsdom. Les canaris du garde sont des fixtures techniques temporaires.

Serveur HTTP technique commun **V2 seulement** dans request-handler.cjs :
allowlist issue des artefacts validés, pas un file server sur racine repo,
GET/HEAD, Host exact, traversées/encodages invalides refusés, no-store/nosniff,
pas CORS permissif ni proxy de fallback. Dev sert dist-v2 uniquement et portable
les mêmes assets validés. Tests de watch vérifient qu'un changement public-v2
ne réintroduit pas un ancien index ni ne supprime js compilé. Échec watch/compiler
arrête le serveur ; ancien runtime jamais servi pour assurer disponibilité.

SEA R0.1 est packaging technique, distinct du format import/export métier R2.
build-sea V2 exige Windows x64 Node 26 comme l'ancien outil ; appelle uniquement
build V2, collecte allowlist dist-v2 avant création de .sea/config.json, exclut
.exe/.sea/tests et embarque scripts/v2/portable-server.cjs. Sortie
`dist-v2/FlowPlan2-V2.exe` ; nom différent évite confusion avec FlowPlan2.exe.
Critère initial de clôture (historique, remplacé par §13) : smoke Windows
obligatoire avant clôture, sinon R0.1 IN REVIEW jusqu’à preuve Windows.
**Critère amendé actif :** Windows DEFERRED / NOT EXECUTED, non bloquant pour
DONE R0.1 ; smoke natif toujours obligatoire avant qualification/distribution
Windows : lancement --no-browser, navigation 4275, assets/graphe vide, sentinelles,
arrêt et port libéré. Aucun skip/non-exécuté assimilé à PASS. Le browser smoke
teste aussi le serveur portable hors
SEA avec readAsset sur dist-v2 ; cela ne certifie pas l'exécutable Windows.

## 5. Origines fixes et frontières browser

Proposition exacte : **dev `http://127.0.0.1:4274`**, **portable
`http://127.0.0.1:4275`**. Le décalage +100 conserve les suffixes connus 74/75,
tout en séparant des origines historiques constatées 4174/4175. Ce n'est pas une
preuve de disponibilité permanente des ports : collision → échec explicite,
aucun port alternatif. Pas de localhost, wildcard host, HTTPS ou file:// admis
par ce shell local. Dev refuse PORT si sa valeur diffère de 4274 ; portable ne
lit aucun port configurable. Host exact validé dans chaque mode, lancement sur
127.0.0.1 ; pas de redirection vers legacy. Contrôle runtime location.origin
limité à ces deux origines avant montage, sans lire browser storage.
Une copie des artefacts sur 4174/4175 ou port quelconque doit afficher un refus
d'origine et ne pas créer l'état ready/vide. Aucun override query/env/DB-name.

Dev et portable sont deux origines V2 différentes ; ils ne partageront pas
implicitement leurs données en R2. Un futur changement d'origine ou bridge sera
une décision documentée hors R0.1. Le port éphémère de débogage CDP du harness
est technique et n'est jamais une origine applicative autorisée.

| Surface | Legacy vérifié | Réservation V2 non configurable | Activation R0.1 |
| --- | --- | --- | --- |
| IndexedDB métier | flowplan-planning (v2) | flowplan2-v2-portfolio-versioned | Aucune DB, version ou store créé |
| IndexedDB scratch | flowplan-history-workspace (v1) | flowplan2-v2-history-scratch | Aucune ouverture/cleanup |
| localStorage | flowplan.backup.v1 | flowplan2.v2.ui.* pour éventuelles préférences seulement | Aucun accès ni préférence persistée |
| BroadcastChannel | flowplan-planning-revisions | flowplan2-v2-portfolio-revisions | Aucun channel créé |
| SW/cache/sessionStorage | Aucun mécanisme produit identifié | Aucun mécanisme R0.1 ; éventuel préfixe flowplan2-v2- futur | Aucun accès/enregistrement |

browserIsolation.ts expose constantes readonly des origines/namespaces réservés
et assertion d'origine. Ce n'est pas un adaptateur persistence. Aucun paramètre
ne peut les remplacer par le legacy. Des tests imposent différences exactes et
valeurs attendues. Le shell n'appelle **aucune** API storage, même sous namespace
V2 ; cette preuve plus forte couvre les lectures, écritures, migrations et
fallback. Il n'existe pas de demande storage.persist/estimate, listener storage
métier, détection de DB, clear(), deleteDatabase() ou cleanup global.

## 6. Interdiction mécanique des imports et contournements

`boundaries.mjs` utilise l'API parser/resolver TypeScript déjà installée et
realpath, pas seulement une regex. Trois contrôles, tous bloquants :

1. **Source** : parcourir tout src-v2, même fichiers non atteignables. Résoudre
   import/export-from/import type/import-equals/import() et références TS
   triple-slash. Types compris, tout chemin doit rester sous realpath src-v2 ;
   aucun src/, .test-dist historique, dist/, public/, scripts/, symlink sortant,
   alias/barrel transitoire ou package runtime. Relative imports .js autorisés
   après résolution .ts interne ; le runtime ne peut importer *.test.ts ou
   *.fixture.ts. node:* uniquement dans *.test.ts et liste
   explicite node:test/node:assert/strict. Aucun paths/baseUrl/references vers
   legacy ; examiner liste complète des sources des deux programmes TS.
2. **Chargement runtime** : importer dynamiquement à expression non littérale,
   require, eval/Function, importScripts, Worker/SharedWorker, URL de module,
   création/injection script/iframe, fetch/XHR/WebSocket/EventSource, SW, APIs
   storage/canal sont interdits dans le runtime R0.1. Contrôle AST et interdiction
   des accès indirects aux mêmes capacités via globalThis/window/document,
   alias/destructuration/accès calculé ; permettre seulement les accès DOM de
   render explicitement audités. La règle reste volontairement restrictive
   pour ce shell ; tout élargissement exige preuve dans le lot propriétaire.
3. **Artefacts** : parser les imports JS émis depuis index et tous fichiers servis,
   vérifier fermeture dans dist-v2/js, même contrôle des capacités ; vérifier
   scripts/liens HTML et URLs CSS locales contre allowlist. Aucun second script,
   inline JS, HTML alternatif legacy, sourcemap pointant src/, test/proof/fixture
   ou asset opaque/remote. Entrée unique js/main/main.js correspond au nouveau
   fichier src-v2/main/main.ts (même nom relatif ne prouve pas même code).

Scripts/v2 peuvent importer node:* et typescript pour tooling, ainsi que leurs
helpers locaux V2 ; jamais un script historique à effets de bord ni les modèles
src/. Le harness contient les noms legacy pour sentinelles exclusivement :
exception nommée test, pas exclusion générale des règles runtime. Le garde
vérifie aussi configs/scripts package et racines build/serve/SEA ; l'allowlist
production initiale contient seulement index, styles et les modules émis V2.

Tests négatifs du garde dans répertoire temporaire jetable : import ../src,
import type legacy, re-export barrel, import dynamique calculé, symlink/alias,
triple-slash, Worker/new URL legacy, HTML pointant dist legacy, fetch module,
asset legacy ajouté, config test incluant src et alias npm appelant ancien build.
Chacun doit provoquer sortie non zéro ; un graphe minimal V2 valide doit passer.
Les mutations de test ne touchent pas le dépôt. Aucun contrôle n'est désactivé
pour faire passer un build. Audit des capacités + observation native §7 se
complètent ; absence d'une chaîne de caractères ne vaut pas absence de lecture.

## 7. Smoke gates et preuves négatives

Gates à exécuter pendant **l'implémentation future**. Harness Chromium réel via
CDP, sans nouvelle dépendance, binaire via FLOWPLAN_BROWSER ou détection locale,
profil temporaire distinct de tout profil utilisateur, teardown garanti, timeout
explicite et fail si navigateur indisponible. Aucune suite historique ne remplace
ces preuves. Les ports applicatifs testés sont exactement 4274 et 4275.

Protocole natif par origine, avec journal attribuable au contexte applicatif :

- Série A profil propre : vérifier inventaire DB vide avant navigation ; installer
  instrumentation **avant tout module** via Page.addScriptToEvaluateOnNewDocument,
  ouvrir la vraie page index, attendre marqueur ready borné ; lire compteurs et
  état vide, reload, seconde tab, focus/blur, resize 1440/390, destroy/remount.
- Série B profil jetable contaminé : avant app, un contexte de fixture même origine
  prépare flowplan-planning v2 avec stores anciens et rows sentinelles dont
  control/Current/jobs migration-source, flowplan-history-workspace v1 chunks,
  backup legacy identifiable, autres clés et DB témoins. Les sentinelles sont des
  données de laboratoire, pas une fixture métier ni un import productif. Inclure
  variante backup JSON invalide pour prouver absence de parse/repair.
- Photographier version, stores/indexes, clés et valeurs par sérialisation
  canonique/hash, backup exact et liste de DB avant ; fermer les connexions de
  fixture. Garder un peer BroadcastChannel legacy dans contexte témoin pour
  envoyer des messages pendant usage V2 et observer d'éventuelles émissions.
- Dans le contexte app, wrappers journalisent puis lèvent sur IDBFactory.open,
  deleteDatabase, databases, accès aux getters localStorage/sessionStorage et
  méthodes Storage getItem/setItem/removeItem/clear/key ; couvrir lecture par
  propriété car le getter est instrumenté. Remplacer constructeurs
  BroadcastChannel/Worker/SharedWorker et interdire enregistrement SW/cache et
  network programmatique. L'instrumentation doit compter les tentatives même
  attrapées par l'app ; journal zéro obligatoire. Les requêtes normales HTML/JS/CSS
  sont suivies séparément via CDP Network et doivent rester dans l'allowlist.
- Conserver les journaux par navigation/contexte ; CDP Runtime binding remonte
  chaque appel au harness, aucune lecture Storage nécessaire pour les récupérer.
  Installer avant reload/seconde tab, contrôler absence workers/iframes/service
  workers, aucune requête vers 4174/4175, aucune exception browser inattendue.
- Après usage, un contexte témoin non instrumenté, sans charger l'app, relit
  uniquement pour vérifier sentinelles et inventaire DB : égalité intégrale,
  aucune DB ajoutée ni upgrade/versionchange. Ces accès fixture/verifier sont
  séparés du journal app. Pas de route helper dans artefact/serveur production ;
  CDP crée le contexte de préparation sur une page même origine sans exécuter
  les scripts app (chargement intercepté), puis ferme ce contexte avant le smoke.
- Autotest du harness avant chaque série : tentatives interdites délibérées dans
  contexte canari séparé produisent journal/erreur attendus ; le canari n'ouvre
  pas réellement les DB. Échec d'installation du wrapper → FAIL, jamais zéro
  interprété comme absence d'appels. Séries A et B exécutées sur les deux origines.

La contamination **à l'origine V2** est indispensable : les seules sentinelles
sur 4174/4175 ne prouveraient que l'isolation d'origine. Un scénario complémentaire
place des témoins sur les origines historiques, utilise V2, puis compare leurs
bytes sans ouvrir l'application historique (qui pourrait modifier ses données).
Toutes ces origines sont testées dans un profil jetable ; aucun profil réel.

| Gate | Preuve attendue | Refus / limite explicite |
| --- | --- | --- |
| G01 Build/typecheck seuls | Liste sources config app sous src-v2, build dist-v2 contrôlé, old src volontairement indisponible dans copie temporaire et build reste PASS | Aucun fichier compilé legacy ni asset public ancien |
| G02 Tests seuls | Liste config test/découverte uniquement V2, nouveaux tests état/composition/origines/garde/serveurs PASS | Zéro suite, skips ou ancienne suite comme preuve → FAIL |
| G03 Démarrage browser | Index/module/CSS 200, ready V2, aucun pageerror, contrôle 1440/390 | Refus origine ou shell manquant → FAIL |
| G04 Sans données → vide | Quatre collections/compteurs zéro, statut Portfolio vide, reload/deuxième tab stable, aucune DB créée | Ne certifie pas Current métier R1/R2 |
| G05 Aucun bootstrap demo | Garde imports/artefacts + collections zéro ; main/demo absent et aucune requête module demo | Un demo construit sans affichage est aussi interdit |
| G06 Aucun import/migration | Aucun codec/repository/worker au graphe, journaux API zéro avec backup valide/invalide et jobs témoins | Pas de staging/repair/activation, même confirmé par UI |
| G07 Sentinelles préexistantes sans effet | Série B démarre identiquement à A sous 4274 et 4275 | Données legacy ne changent ni statut ni état |
| G08 Sentinelles intactes | Hash/versions/stores/indexes/clés/valeurs/backup et témoins égaux après tous parcours | Observation par verifier séparé seulement |
| G09 Aucune ouverture/création legacy | Compteur open/deleteDatabase/databases app = 0, inventaire inchangé, aucune versionchange | Conserver bytes ne suffit pas à prouver aucune lecture |
| G10 Aucune lecture backup | Getter Storage et méthodes/propriétés instrumentés, zéro accès incluant flowplan.backup.v1 | Journaliser aussi tentatives attrapées |
| G11 Aucun canal legacy | Compteur construction BC app = 0 ; peer peut envoyer, zéro message émis par app et état inchangé | Peer et canari exclus du journal app |
| G12 Origines séparées fixes | location.origin exact pour chaque mode ; Host localhost/autre port refusé, PORT=4174 refusé, port occupé échoue | Aucun fallback auto vers port libre ; copies sur origine interdite non ready |
| G13 Aucun import V2 → src | Garde source/types/transitifs/realpath/AST et canaris négatifs PASS | Include/exclude TS seuls insuffisants |
| G14 Aucun runtime ancien exécuté | Fermeture JS/HTML/assets + Network et absence workers/iframe/SW ; /src/ et /js/domain/index.js historiques renvoient 404 | Vérifier code/provenance, pas seulement nom main.js |
| G15 Ancien runtime indépendant | Checkout jetable du SHA historique exact, npm ci/typecheck/build/tests portable historiques puis démarrage dev 4174 ; portable 4175 sur environnement Windows dédié, lecture Current/History de données de laboratoire | Aucun chargement V2, source historique inchangé ; n'autorise pas mutation données réelles |
| G16 Portable/SEA et rollback | Serveurs GET/HEAD/Host/path tested, SEA Windows 4275 ; arrêt libère ports, témoins toujours intacts ; abandon/revert dans copie jetable | Hors SEA n'est pas preuve SEA ; aucune conversion inverse |

G15 utilise un répertoire distinct de celui V2 (pas de partage dist/node_modules),
HEAD detached ou checkout isolé sans changer la branche de travail historique.
Comparer les chemins legacy conservés au SHA d'entrée : src/public/scripts et
configs app/test inchangés ; seuls package/tsconfig.json/README/ignore du rewrite
orientent le nouveau lancement. Le checkout historique garde ses fichiers et
origines propres. La suite historique est preuve de consultabilité indépendante,
jamais gate suffisante du rewrite. R0.1 n'ouvre pas de backup utilisateur pour
satisfaire G15 ; la sauvegarde opérationnelle reste une action distincte R0 §6.

Preuves à archiver dans `rewrite_r01_canon.md` à la livraison : SHA d'entrée/code,
versions Node/TS/browser/OS, commandes et résultats, sources/artefacts/graphe,
origines, journaux API avec zéro explicite, comparaison sentinelles avant/après,
captures shell et refus, preuve Windows et consultabilité historique, limites.
Artefacts bruts volumineux sous chemin de preuve documenté ; aucun profil ou
backup utilisateur committé. Toute gate absente/FAIL → IN REVIEW / non clôturable,
à la seule exception du report Windows explicitement autorisé en §13. Les
résultats Windows non exécutés restent tels quels, sans PASS ajouté.

## 8. Séquence d'implémentation future

Chaque étape produit un commit borné sur rewrite ; aucun lancement browser avant
build/garde/serveur sûrs. Les fichiers cités sont futurs, pas des modifications
réalisées dans cette mission. Pas d'étape partiellement PASS débloquant la suivante.

| Étape et fichiers créés/modifiés | Objectif et invariants protégés | Preuves et condition de passage |
| --- | --- | --- |
| P0 Git/état ; aucun source | Vérifier §1, audit/autorisation, créer future branche au SHA exact, conserver checkout historique | Arbre propre, origin 0/0, branche absente puis créée au SHA ; sinon STOP |
| P1 `scripts/v2/boundaries.mjs`, `.test.mjs`, `tsconfig.v2.app/test.json`, package scripts techniques et tsconfig.json, .gitignore | Poser frontières source/test/config, sorties V2 ; aucune extraction ni stockage | G13 canaris, configs fermées ; ne pas lancer app/build vide comme preuve ; prochaine étape quand garde fiable |
| P2 `scripts/v2/build.mjs`, `test.mjs`, `src-v2/bootstrap/*`, `environment/*`, tests adjacents | Build/test seuls, état shell vide et namespaces fixes sans Domain | Pré-gates G01/G02/G05 : garde source, typecheck et tests unitaires ; pas de build app déclaré PASS avant P3 (HTML/composition encore absents) |
| P3 `src-v2/main/*`, `ui/renderV2Shell.ts`, `public-v2/index.html`, styles.css | Composition root indépendante et UI minimale accessible, refus origine avant montage | G03/G04/G05/G06 structurels, test refus composition, build complet et garde artefacts PASS ; DOM/destroy natifs réservés P5 ; aucun browser legacy chargé |
| P4 `scripts/v2/request-handler.cjs`, `dev.mjs`, `portable-server.cjs`, `servers.test.cjs`, `build-sea.mjs`, smoke-sea.ps1 ; aliases package finaux | Servir seulement V2 sur 4274/4275, watch/payload/SEA séparés | G12/G14/G16 serveur, no fallback, package aucun lanceur legacy, compilation/artefacts PASS avant smoke browser |
| P5 `scripts/v2/browser-harness.mjs`, `browser-isolation-test.mjs`, `smoke.mjs` | Observations natives positives/négatives, contamination même origine, preuves attribuables | G01–G14/G16 sur les deux modes, canari harness ; SEA Windows séparément requis avant qualification/distribution (§13), report non bloquant pour clôture ; aucune suite substituée |
| P6 README.md, documents actifs, `rewrite_r01_canon.md`, registres ; preuves G15 et rollback | Enregistrer comportement réel, provenance technique et limites, ancien environnement indépendant | G15/G16 et autres gates, avec seule exception Windows DEFERRED §13 ; diff borné/revue sans R1/R2 ; audit indépendant et clôture explicite requis |

Ne pas créer d'interface Domain pour rendre P2 compilable : modules R0.1 ne
consomment que DTO shell technique. Une capacité manquante ne justifie pas de
copier renderApp ou le repository. Besoin non couvert : documenter et STOP.

## 9. Registres et documentation

La présente préparation enregistre I-R01-A/B comme décisions d'isolation
validées par cadrage utilisateur ; ports/structure/gates détaillés sont les
propositions précises de ce plan à auditer. Les trackers indiquent PLANNED /
NOT STARTED, prochain acte audit puis autorisation, et maintien des interdictions.
R0 reste clos ; seul son état de reprise est actualisé, contrats/matrice inchangés.
Aucun canon applicatif historique réécrit, aucune extraction marquée réalisée.

Pendant implémentation : compléter les opérations R0.1 dans le registre vivant
sans écraser ses 37 lignes patrimoniales. Décomposer outillage build/tests/dev/
portable/SEA/harness (ADAPT), composition/entrypoint (REFERENCE, construction
neuve), persistence/demo/import/worker historiques (DROP du chemin V2), ancien
code conservé (REFERENCE). Bootstrap vide neuf n'est pas extraction de demo.
Pour exclusion sans copie : destination « aucune, exclu du runtime V2 », SHA
source inspecté, dépendances coupées, gate et audit ; pour tooling adapté :
source/symboles et SHA exact, destination scripts/v2, imports/effets supprimés,
contrats, résultats V2 et décision reviewer. Ne pas mettre SHA effectif ou PASS
pour une simple intention. Toute extraction future R1+ garde source exacte,
SHA source, destination V2, dépendances supprimées, contrats, preuves V2 et audit.
Aucun merge/cherry-pick automatique du runtime historique.

## 10. Acceptation, risques et rollback

Acceptation R0.1 : branche dédiée créée après GO, sources/build/tests/artefacts
fermés, nouvelle composition root, Portfolio vide RAM sans donnée externe,
origines fixes vérifiées, réservations sans storage actif, gates G01–G16 satisfaites
hors validations Windows reportées selon §13 (DEFERRED / NOT EXECUTED, pas PASS),
ancien runtime indépendant, documentaire stateless et registre à jour. Audit
indépendant + clôture utilisateur requis avant DONE. R1 ne démarre pas à la
simple réussite de smoke:v2 ; il nécessite son plan et autorisation propres.

| Risque concret | Mitigation / preuve |
| --- | --- |
| Ancien build/copie public/main chargé par un alias | Defaults package V2, garde config et artefacts/HTML/SEA, G01/G14 |
| Import indirect par types/barrels/symlink/dynamic/Worker | Fermeture realpath+TS et restrictions capacités, canaris G13, absence workers G14 |
| Fausse isolation par port seul | Namespaces distincts réservés + sentinelles même origine + interdiction de toute API storage |
| Journal zéro parce que hooks installés trop tard/inopérants | Before-script CDP, canari harness, journal externe par contexte, FAIL si hook manquant |
| Test port aléatoire masque port legacy | Serveurs app fixes, Host/runtime check, collision fail ; CDP seulement éphémère |
| Confusion Portfolio vide et Domain/Current provisoire | DTO shell sans IDs/Settings/Order/manifestes ; R1/R2 propriétaires explicites |
| Shell « utile » introduit métier/persistence | Aucun formulaire métier/import/History ; diff borné au manifeste R0.1 |
| Exécutable Windows non vérifié depuis Mac | Critère initial remplacé §13 : Windows DEFERRED / NOT EXECUTED ; validation obligatoire avant qualification/distribution Windows |
| Test legacy ou fixture altère données réelles | Profil/checkout jetables, aucune DB/profil utilisateur, journaux fixture séparés |
| Watch/stale dist ou packaging réintroduit assets | Nettoyage sorties V2 seul, allowlist fermée et no-store, garde après build/watch/SEA |

Rollback simple seulement si : aucun dépôt créé (legacy **ou** V2 métier), aucun
import/migration, aucun nettoyage global, aucun bridge runtime, aucun déploiement
remplaçant l'ancien environnement, branche historique non modifiée et origines
séparées respectées. Ces préconditions sont observées par G07–G16, pas supposées.

Arrêter serveurs V2/SEA et fermer tabs/profils de tests ; conserver les preuves.
Abandonner le checkout rewrite, ou revert ses commits R0.1 en ordre inverse sans
reset/force-push partagé. Supprimer seulement ses sorties générées dist-v2 et
.test-dist-v2 dans ce checkout si nécessaire ; ne supprimer aucune DB réelle ni
profil utilisateur. Retour à la consultation du checkout/exécutable historique
sur 4174/4175, sans conversion inverse. Le revert peut rétablir les anciens
aliases du checkout rewrite : **ne pas relancer ce checkout comme V2** ; utiliser
l'environnement historique distinct. La branche historique et ses données n'ont
pas changé. Prouver le rollback dans copie jetable et comparer les sentinelles.
Une mutation storage ou activation R1/R2 invaliderait ce rollback R0.1 ; STOP et
nouveau plan de lot avant de modifier cette propriété.

## 11. Reports explicites

**R1 seulement** : Rational/Date/IDs/brands, primitives métier et premières
extractions, entités/version refs, Settings/Order, AP/SubPeriod/TA/PT/RT/PTEC,
validation graphe/référentiels, lifecycle/proofs minimaux, choix defaults
horizon/weekdays/N, port mémoire métier, fixture native et première verticale
moteur mémoire. Aucun de ces choix ne bloque le DTO shell vide R0.1.

**R2+ seulement** : repository IndexedDB métier et schéma/version/stores/indexes,
codec/format natif complet, CAS/receipts/staging/recovery, persistence et premier
Current durable, import/export natif, ports multi-tab actifs et vrais usages des
namespaces réservés, moteur complet R3, commandes R4, UI métier R5, History/
comparaisons/cache/scratch R6. L'arbitrage Reservation ratio + exception sans
période reste ouvert pour R3, sans extraction de cette fonction en R0.1.
Réservations et packaging technique R0.1 ne certifient rien de ces mécanismes.

Contrôles de cette livraison documentaire : diff relu, six Markdown uniquement,
161 liens locaux dont 26 ancres vérifiés, archives des deux trackers inchangées,
sections normatives R0 §2–§10 inchangées, 37 opérations patrimoniales toujours
NOT STARTED, G01–G16 présentes. `git diff --check` sans erreur ; aucun test,
build ou browser applicatif exécuté pour cette mission de plan. État Git final
et synchronisation origin vérifiés après commit/push et rapportés à la livraison.

## 12. Checklist READY FOR IMPLEMENTATION / NOT READY

Checklist historique de préparation du plan, conservée ; état courant et
amendement de clôture en §13, preuves d’implémentation au canon.

- [x] Baseline exacte, arbre initial propre et origin 0/0 vérifiés après fetch.
- [x] Reprise stateless ordonnée ; R0 clôturé, trajectoire V2 confirmée.
- [x] Inventaire confronté à bootstrap, transitive imports, workers, storage et scripts réels.
- [x] Isolation physique src-v2/public-v2/dist-v2/tests et garde mécanique définis.
- [x] Origines fixes 4274/4275 proposées, Host/runtime/collision/smokes définis.
- [x] Portfolio vide technique précis, aucune extraction métier ni stockage anticipé.
- [x] Gates positives/négatives, sentinelles même origine et canaris d'observation définis.
- [x] Consultabilité historique, packaging Windows, séquence, registres et rollback définis.
- [x] Aucune décision architecturale nécessaire laissée cachée ; propositions explicites auditables.
- [x] Reports R1/R2+ et critère de STOP pour toute exception documentés.
- [ ] Audit indépendant du présent plan : à obtenir.
- [ ] Autorisation explicite de créer la branche et d'implémenter R0.1 : à obtenir.
- [ ] Gates d'implémentation G01–G16 : NOT STARTED, aucune preuve d'exécution V2.

**READY FOR IMPLEMENTATION pour la préparation du plan ; lancement non autorisé.**
Aucune question architecturale bloquante R0.1 subsiste. En cas de rejet des
propositions techniques par l'audit, amender le plan puis réauditer avant GO.
R0.1 demeure PLANNED / NOT STARTED. Arrêt après livraison documentaire ; aucun
code, nouvelle branche, squelette, migration ou début R1/R2 dans cette mission.

## 13. Amendement de clôture du 2026-10-10

Historique de décision : plan initial audité à
`1c2b08c727af9fb8002b7678bd7403fcc0d39c27`, puis implémentation et preuves à
`d5bb1a89c847604f2f80aaaa3270e4125f4a3fef` auditées favorablement par un audit
indépendant sur architecture, frontières d’isolation et preuves disponibles.
L’utilisateur autorise explicitement la clôture **R0.1 DONE** malgré les preuves
Windows non exécutées. Décision durable [I-R01-C](./rewrite_decisions.md#amendement-de-clôture-r01--report-windows).

**Portée ciblée :** les critères initiaux Windows avant clôture (§4, §7, P5/P6
§8, acceptation/risque §10) sont remplacés uniquement quant à leur effet bloquant.
La capacité packaging Windows est périphérique : elle ne conditionne pas le
socle technique V2, son isolation runtime, les graphes fermés, le Portfolio vide
ou le démarrage browser dont les preuves ont été exécutées. Toutes les autres
gates/exigences restent inchangées ; aucune réduction de preuve native browser.

Demeurent **DEFERRED / NOT EXECUTED** : construction et exécution réelles de
FlowPlan2-V2.exe sur Windows x64 ; validation du portable historique indépendant ;
vérification native ports/assets/sentinelles/arrêt des exécutables. Les parties
Windows de G15/G16 ne deviennent pas PASS, et les preuves brutes ne sont pas
réécrites. Le smoke portable hors SEA ne certifie aucun exécutable Windows.

**Condition de levée :** validation réelle sur Windows x64 compatible, Node 26
pour construction, avant toute déclaration de compatibilité/disponibilité,
qualification ou distribution Windows ; résultats et preuves archivés, limites
explicitement levées dans le canon et registre de décision. Cette clôture ne
prononce aucune disponibilité Windows.

R0 reste clôturé. R1 prochain lot **NOT STARTED**, R2 **NOT STARTED** ; aucun
cadrage/implémentation R1 ou R2 dans cette mission. Rendre la main pour plan,
audit et autorisation indépendants du prochain lot. La présente clôture ne change
que la documentation ; aucun code, test, script, configuration ou donnée browser.
