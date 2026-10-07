# Lot 11A — Portfolio Snapshots & Forecast History Capture

**Status: PLANNING.** Plan documentaire établi le 2026-10-07.
Cette passe ne réalise aucune implémentation, aucun test et aucune modification
de données métier. La visualisation de dérive est réservée à 11B.

## Baseline et roadmap

Inspection initiale : branche `main`, HEAD
`843cb966b9cda0b13d1695f73aa005847e8fbb8a`, working tree propre,
remote `https://github.com/kartaguez/FlowPlan2.git`.
La baseline **validée** documentaire reste
`17094b03cbf4c34c8424d6fa1847e0ceebd55410` : le HEAD contient les correctifs
10C.2, toujours IN REVIEW. Cette passe ne vaut pas validation de 10C.2.

Documents examinés : `docs/canon.md`, `docs/current_canon.md`,
`docs/current_plan.md` et les documents de `docs/steps/ACTUALS/` :
`step_plan`, `step_canon`, `lot10b_plan`, `lot10c_plan`, `lot10c1_plan`,
`lot10c1_canon`, `lot10c2_plan`. Les anciens 10D/10E recouvrent partiellement
le nouveau besoin. 11A devient la prochaine étape en planification pour la
capture globale ; 11B porte la visualisation. Ne pas déclarer 10D/10E DONE :
leur périmètre résiduel doit être réconcilié avec ces lots. L'audit de 10C.2
reste une dépendance de lancement de l'implémentation.

## Sources vérifiées dans le code actuel

| Question | Source et constat au HEAD |
| --- | --- |
| État métier complet | `src/application/session/planningSession.ts` : `PlanningSessionState = {portfolio, planning}`, sans Portfolio Snapshots. |
| Inputs du moteur | `src/main/planning/buildPlanningSessionProjection.ts` construit horizon, reconstruction Actuals et `actualOccupation`, puis appelle `recomputePlanning`. `src/domain/planning/contracts.ts` définit `PlanningInput = {portfolio, horizon, workingPattern, maxParallelProjects, actualOccupation}`. Toutes les sources sont dans la session. |
| Sérialisation | `src/application/backup/flowplanBackupV1.ts` contient les codecs V1–V5 : enveloppe `format/version/exportedAt/data`, puis `data.planning` et `data.portfolio`. Capacités, exceptions et rationnels canoniques sont déjà sérialisés. |
| Priorité | `Portfolio.priorityOrder`, dans `src/domain/model/entities.ts`, contient exactement une fois chaque Project, actif ou inactif. `reorder-project` déplace cette liste. `priorityIndex` Timeline est zéro-based, commandes/badges 1-based. Program/Pas n'apportent aucune priorité concurrente. |
| Actuals courants | `src/domain/actuals/reconstruction.ts` sélectionne `snapshots.at(-1)` si présent, sinon `legacyV4Actuals ?? actuals`, sinon aucune source. L'activation ne filtre pas les Actuals. Ne jamais additionner les versions de l'historique. |
| RAF courant | `Project.requirements[].remainingWorkload`, interface effective du moteur. Pour V5, `createPortfolio` vérifie l'égalité avec `raf` du snapshot courant et son membership. `requirements.ts` protège les changements directs. Le legacy conserve sa provenance RAF. |
| Fin estimée | `src/adapters/timeline/buildTimelineViewModel.ts` : pour un Project actif, toutes ses `projectStates` doivent être complètes ; prendre le maximum des `projectedEndDate` définies. `engine.ts` produit une fin Team seulement après complétion avec dernière allocation. |
| Début estimé | Aucun `estimatedStartDate` dans `PlanningResult` ou `TimelineProject`. `earliestStartDate` est une contrainte, pas une estimation. Les allocations positives contiennent les dates nécessaires. |
| Dirty cartes | `projectDraftStore.ts`, `reservationDraftStore.ts` et les deux instances Project/Reservation de `snapshotActualsDraftStore.ts`, possédés par `createTimelineUiCoordinator.ts`. `ids()`/`isDirty()` couvrent les cartes repliées. Actuals inclut RAF rapide et branche modale, avec ouverture initiale vierge non dirty. |
| Autres dirty | `createTeamEditController.ts` expose `hasUnappliedChanges`. Les trois contrôleurs Create ont un `isDirty` privé. `createPlanningSettingsController.ts` n'expose aucun dirty. Aucune garde globale n'existe. |
| Transaction | `createPlanningProjectionDispatcher.ts` : candidat → projection → encodage V5/écriture → publication par `PlanningSession.dispatch`. `freezeState` et beaucoup de commandes reconstruisent explicitement les deux champs ; ajouter une collection sans corriger ces chemins la perdrait. |
| Import/export | `src/main/planning/planningBackupOperations.ts`, `src/main/createPlanningDemoApplication.ts`, `src/infrastructure/backup/localPlanningBackup.ts`. Clé `flowplan.backup.v1` indépendante du payload. Import complet validé/projeté avant confirmation/écriture. Startup invalide : document conservé, erreur, démo en mémoire. |
| Identités/versions | Actuals : `snapshotId(kind, objectId, version)`, versions consécutives par objet, périodes stables si inchangées (`snapshots.ts`). Horloge injectée `today()`, actuellement date UTC. Générateurs Project/Reservation/Team : collisions évitées avec IDs courants, compteur réinitialisé au reload. Aucun identifiant moteur attaché aux résultats ; « Planning Engine V1 » du canon et package 0.1.0 ne suffisent pas. |

Tests de régression à réutiliser : `flowplanBackupV5.test.ts`,
`planningPersistenceTransaction.test.ts`, `lot10c1SnapshotProjection.test.ts`,
tests des stores/contrôleurs et `createTimelineUiCoordinator.multidraft.test.ts`.
Ils ne couvrent pas encore les nouveaux invariants 11A.

## Contrat et modèle proposé

Un Portfolio Snapshot sauvegarde explicitement **tout** le portefeuille
appliqué et le forecast réellement affiché. Ni Apply ordinaires, ni Actuals,
ni changements de Projection date ne créent de Portfolio Snapshot.
Après création, seule la suppression entière est permise. Pas d'édition,
restauration, recalcul historique automatique ou navigation historique en 11A.

Ajouter `portfolioSnapshots: readonly PortfolioSnapshot[]` au niveau session,
à côté de `portfolio` et `planning`. Le Domain valide/freeze les constituants
et l'artefact ; l'Application assemble les inputs et résout les Actuals.
Le Domain n'importe ni `PlanningSessionState` ni un codec Application.
Les DTO d'entrée partagés restent à la frontière Application, avec validation
Domain des entités et du forecast.

| Partie distincte | Contenu |
| --- | --- |
| Identité | `snapshotId` opaque stable, générateur injecté (UUID par exemple), unicité contrôlée ; indépendant de l'index et de la date métier. |
| Instant | `createdAt` ISO UTC canonique au clic Save, horloge technique injectée. Date métier éventuelle dérivée, jamais saisie ni issue de Projection date. Affichage local avec précision suffisante. |
| Version des inputs | `inputsSchemaVersion`, version du contrat partagé, distincte de l'enveloppe globale. |
| Historical inputs | `planning` et `portfolio` complets sérialisables, sans récursion de Portfolio Snapshots ni duplication des historiques Actuals V5 ; sélection Actuals explicite par objet. |
| Références Actuals | Sélection `none`, `snapshot` avec kind/objectId/snapshotId, ou `legacy-v4` avec evidence figée décrite ci-dessous ; une entrée par Project/Reservation, actifs et inactifs. |
| Historical forecast | `forecastSchemaVersion`, `engineVersion`, copie exacte du `PlanningResult` publié et synthèse de tous les Projects : Actuals cumulés, RAF, EAC, priorité, dates optionnelles/motifs d'absence. Aucun agrégat de forecast Reservation spécifique. |

Plusieurs captures d'inputs identiques sont autorisées : Save est volontaire,
pas un no-op fondé sur égalité. Ne pas dédupliquer par jour. Deux captures
acceptées doivent avoir des timestamps distincts. Avec une horloge à la
milliseconde, proposition minimale : refuser visiblement une collision avec
un instant existant et inviter à réessayer, sans fabriquer une milliseconde
future ; refuser également un recul par rapport au dernier instant conservé.
Faire valider cette politique si deux Saves doivent être acceptés dans la
même milliseconde. Un échec ne publie aucune identité/date ni entrée de liste.

## Inputs historiques : une seule frontière de sérialisation

Extraire du codec existant des encodeurs/décodeurs typés partagés pour
PlanningSettings, Team/schedule, Project/requirements, Reservation/allocation,
Program et PriorityFamily, puis un payload d'entrée non récursif. Backup
courant et capture appellent ces mêmes fonctions. Ne pas imbriquer un backup
entier, sérialiser directement le Domain (BigInt), ni maintenir une seconde
liste manuelle de propriétés métier.

La seule variation explicite par objet est le mode « historique référencé »
au lieu du tableau complet `snapshots`. Réutiliser son DTO de configuration et
ses validateurs. Ajouter un test de parité capture/réhydratation sur un état
riche ; toute évolution des inputs doit mettre à jour version et test.
Une projection courante n'hydrate jamais les entrées historiques.

Le payload couvre exactement l'état actuel en amont de PlanningInput :

- planning : bornes inclusives, working weekdays, maxParallelProjects ;
- Teams : IDs, noms, tous les capacity periods, capacités exactes,
  unavailabilityRatio et exceptions, même hors horizon ;
- tous les Projects : IDs/noms/isActive, Program/Pas/couleur, contraintes
  earliestStart/objectiveEnd/mandatoryDeadline, requirements ordonnés,
  TeamId, RAF exact, dailyCap éventuel et information legacy nécessaire ;
- toutes les Reservations : IDs/noms/isActive, associations/couleur,
  bornes, allocations ratio/fixed-daily exactes, même sans Team ;
- référentiels Program/Pas alors existants, IDs/noms/couleurs,
  `priorityOrder` intégral inchangé ;
- sélection des sources Actuals et evidence legacy à cet instant.

Horizon est reconstruit par `createPlanningHorizon` ; occupation dérivée
par la reconstruction existante avec capacités/calendrier **historiques**.
Pas de persistance supplémentaire de contributions Actuals quotidiennes
calculées. Cursor, viewport, hover, onglets, cartes ouvertes et drafts sont
exclus : ils ne participent pas au moteur. Noms et couleurs restent capturés
pour permettre une future ancienne vue complète.

### Références Actuals, legacy et identités

Pour chaque objet V5, figer l'ID de `snapshots.at(-1)` **au Save**, jamais une
consigne « prendre le dernier à la lecture ». Résoudre le tuple
kind/objectId/snapshotId dans l'histoire partagée appartenant à l'objet.
Vérifier identité déterministe, version, unicité, coverage, exactitude,
participation, retired markers, RAF et Teams historiques. Un Project RAF-only
référence aussi son snapshot sans coverage.

Sans snapshot ni legacy : `none`, zéro Actuals simulé, mais connaissance
absente explicitement distinguée d'un zéro observé. Ni ID inventé ni snapshot
Actuals automatiquement créé.

**Cas legacy constaté, proposition à valider :** V4 pending n'a pas d'ID V5.
Conserver dans ses inputs historiques une copie exacte de `legacyV4Actuals`
et de la provenance RAF V5, avec source `legacy-v4`. Conserver l'evidence
read-only également si déjà reconciled, mais avec source effective `snapshot`
uniquement. Réutiliser les codecs legacy. Cette duplication limitée de
migration évite une réconciliation imposée au Save et ne duplique pas les
chronologies V5. Si refusée, décider explicitement d'un blocage Save avant
réconciliation ; ne jamais capturer pending comme `none` ni inventer un ID.

La réhydratation privée pour validation/rejeu prend la configuration
historique et, pour V5, le **préfixe** de l'histoire partagée jusqu'à l'ID
référencé, sans versions ultérieures. Les factories exigent des versions
consécutives depuis 1 et vérifient la dernière participation/RAF contre la
configuration : injecter seulement `[version N]` serait invalide. Le préfixe
est temporaire, non stocké en doublon ; cette validation n'appelle pas le
moteur. Le rejeu futur est distinct.

Project/Reservation avec histoire Actuals/legacy sont déjà non supprimables,
Teams historiques protégées. Garder ces protections et ajouter une garde
référentielle à toute future purge Actuals. Supprimer un Portfolio Snapshot
ne supprime **aucun** Actuals partagé, ne libère pas les protections et ne
fait aucun garbage collection implicite.

Les objets sans Actuals restent supprimables du planning courant : leurs
inputs historiques sont autonomes. Le pruning Program/Pas courant reste
local au Portfolio courant. Ne pas exiger qu'une entité historique sans
Actuals existe encore aujourd'hui. Réserver cependant les IDs présents dans
tous les inputs historiques dans les générateurs Project/Reservation/Team
et les ensembles Program/Pas dès le chargement et après transaction. Sinon
delete puis reload/create peut recycler une identité et fausser 11B. Tester
les cinq kinds. La garantie concerne les histoires conservées ; pas de
registre éternel des IDs après suppression de toutes leurs traces en 11A.

## Forecast figé et définitions Project

Save copie le `PlanningResult` **déjà publié**, sans nouveau calcul. Conserver
tout son contrat : Team day capacities, admissions, Project plans/allocations,
quantités planifiées/restant non planifiées, completion, fins Team, deadline
statuses éventuels et diagnostics. Ce résultat suffit à préserver le forecast
réel et préparer une ancienne vue ; aucun DOM, Geometry ou ViewModel persisté.
C'est un artefact historique immuable séparé de la projection jetable actuelle.
Prévoir un codec exact/versionné et des validateurs structurels ; ne jamais
valider l'histoire par égalité au moteur courant.

| Métrique | Source et règle à capturer |
| --- | --- |
| Actuals cumulés | V5 : somme rationnelle de tous les `coverage.periods[].consumed` de la source sélectionnée, tous Teams, sans clipping horizon/cursor/activation. Sans coverage : zéro simulé avec connaissance explicite. Legacy pending : somme du dernier cumul connu **par Team**, pas seulement des lignes du dernier record (Teams intermittentes), cohérente avec la reconstruction complète. Aucune source : zéro simulé et statut `none`. |
| RAF | Somme exacte des `requirements[].remainingWorkload` historiques. V5 : égalité avec `raf` du snapshot référencé ; pending : provenance et configuration effectivement planifiée conservées. |
| EAC | Addition rationnelle unique Actuals + RAF, valeur exacte conservée avec validation de l'identité arithmétique. Ni progress au cursor ni charge limitée à l'horizon. |
| priorityPosition | Index dans `inputs.portfolio.priorityOrder` + 1, sans retirer les inactifs. Valider l'égalité sur chaque ligne. |
| estimatedEndDate | Règle globale existante de `buildTimelineViewModel` : Project actif, toutes ses exigences complètes, maximum des fins Team définies. Extraire un helper sémantique partagé entre Timeline et synthèse historique. |
| estimatedStartDate | **Proposition à valider avant code** : minimum des dates d'allocations Project strictement positives sur toutes ses Teams. Même helper partagé ; ne copier ni `earliestStartDate` ni première admission sans consommation. |

Inactif : quantités/priorité capturées, dates absentes (`inactive`). Actif sans
allocation positive : début absent (`no-allocation`). Actif inachevé dans
l'horizon : fin absente (`incomplete-within-horizon`), même si une Team finit ;
début peut être présent. RAF entièrement zéro : completion possible sans fin
Team ; dates absentes (`no-allocation`), pas de borne artificielle du planning.
Encoder les absences explicitement (`null` et motif), pas des champs perdus.
Ne pas extrapoler une fin hors horizon depuis le deadline lookahead.

Le début proposé concerne le **forecast restant**. Un début de vie du Project
incluant `actualsFrom` serait une autre sémantique ; ce point est une ambiguïté
métier réelle, pas une décision déjà validée. Extraire un projecteur de totaux
exacts partagé avec le read model Actuals actuel si nécessaire ; aucune
formule concurrente dans l'UI ou duplication de la sélection de source.

Introduire un identifiant explicite minimal de contrat moteur (par exemple
`planning-engine-v1/actuals-aware/1`), incrémenté quand un changement peut
modifier les résultats, et `forecastSchemaVersion = 1` initial. Versions
moteur, inputs et forecast ont des rôles distincts. Pas de registre de moteurs
historiques ni SHA injecté dans le build en 11A. Une autre version moteur
n'empêche pas la lecture du résultat enregistré ; schéma inconnu rejeté.
Un futur rejeu avec un moteur disponible n'écrase jamais ce forecast.

## Dirty global et transaction de capture

Introduire un agrégateur UI fondé sur les propriétaires des drafts, jamais
sur les bordures ou les seuls champs visibles :

1. Parcourir tous les IDs des quatre stores Forecast/Actuals et leurs
   `isDirty`, y compris cartes fermées/autres onglets, RAF rapide, branche
   modale et handoff Forecast → Actuals non appliqué.
2. Inclure `TeamEditController.hasUnappliedChanges` et exposer les dirty privés
   des trois Create : Project, Reservation, Team.
3. Ajouter un dirty explicite à Planning Settings, comparé au modèle publié :
   bornes, weekdays, parallélisme, saisies invalides.
4. Notifier après input/change, ajout/retrait de ligne, membership, opérations
   de partition, Apply réussi, Cancel, rebase, ouverture/fermeture et remount.
   Garder les baselines/égalités exactes existantes ; ouverture vierge seule
   ne signifie pas dirty.

Ne pas confondre erreur/stale, modal ouverte, sélection de zone et différence
métier. Un handoff avec membership cible différent est dirty même avant
saisie de consommés ; une confirmation n'est pas Apply. Une modal peut
rendre Save inaccessible par modalité indépendamment du dirty. L'arrondi
d'affichage d'une quantité exacte inchangée ne crée pas de dirty.

Save est disabled avec explication courte si dirty global. Refaire la garde
dans le handler au clic et dans le point d'entrée Application/Main de capture
via une fonction de précondition UI injectée, vérifiée immédiatement (ou
contexte synchrone équivalent). Pas de booléen persisté ni confiance dans un
disabled antérieur. Le Domain n'importe pas les stores UI ; la commande
interne Save n'est pas exposée dans un dispatch générique contournant ce service.

Séquence dédiée dans le dispatcher, sans async entre garde et capture :

1. Lire ensemble état appliqué et projection publiée. Conserver la référence
   d'état ayant construit la projection ou une révision d'inputs ; vérifier
   leur correspondance et le dirty, lire l'horloge au clic. Aucun input lu
   depuis les champs de formulaires.
2. Capture par codec commun, sélection Actuals, copie/freeze du résultat
   publié et synthèses par helper partagé ; valider candidat et références.
3. Construire l'état session candidat, écrire **tout V6** par le beforeCommit
   transactionnel, publier seulement après succès. Échec : ancien état,
   projection, document et drafts inchangés.
4. Save/Delete ne changent aucun input moteur : réutiliser la projection et
   rafraîchir seulement la liste, préserver focus, drafts, cursor, viewport,
   tabs et cartes. Mettre à jour la référence d'état associée à la projection
   pour la prochaine capture.

Commandes ordinaires : projection avant écriture comme aujourd'hui. Corriger
tous les chemins `freezeState({portfolio, planning})` pour préserver l'histoire.
Delete valide l'ID, retire une entrée, persiste avant publication, sans cascade
ni recalcul ; erreur garde la liste. Toute mutation profonde est interdite.

## V6, migration et export/import auto-suffisant

**Choix argumenté : nouvelle version V6.** Les décodeurs V5 rejettent les
champs inconnus de `data`/objets et n'acceptent que les versions 1–5. Étendre
V5 ferait varier son contrat strict sans signaler le nouveau besoin ; les
lecteurs anciens ne comprendraient pas l'histoire. V6 rend ce refus explicite.
Garder les lecteurs V1–V5 : collection `portfolioSnapshots: []` à migration,
sans capture rétroactive ni forecast inventé. Pas de réconciliation V4 implicite.

V6 conserve le Portfolio courant et ses **historiques Actuals complets** une
seule fois, dans leurs propriétaires. `data.portfolioSnapshots` obligatoire,
même vide, contient les inputs référencés et forecasts de toutes les captures.
Les références ne dépendent ni d'ancien localStorage ni d'autre fichier.
Les propriétaires Actuals sont maintenus par les protections existantes ;
une future suppression exige d'abord un dépôt partagé durable.

Dispatcher, export, import, startup et composition passent à V6 en gardant
la clé locale. Tous les encodeurs V1–V5 doivent **refuser** un état avec
Portfolio Snapshots, même un appel direct à V5 : aucun downgrade silencieux.
Conserver les protections Actuals V5 et l'evidence V4 lossless.

Import atomique :

1. Enveloppe/date/version, état courant et historiques Actuals via factories
   existantes et migrations documentées.
2. Chaque capture : ID/timestamp canoniques/uniques, schémas connus,
   createdAt <= exportedAt ; tuple Actuals résolu sans substitution par une
   version courante ; knowledgeDate <= date UTC du createdAt historique.
3. Réhydrater inputs avec préfixes sélectionnés/evidence figée ; valider
   associations, Teams, participation/RAF et priorité dans ce **Portfolio
   historique**, pas par membership courant.
4. Valider forecast stocké : IDs historiques, dates, champs, tableaux,
   diagnostics et quantités exactes, structure des résultats, une synthèse
   par Project, position/EAC cohérents. Contrôler dates de synthèse contre
   allocations/fins stockées selon le schéma ; **aucun** appel moteur pour
   recalculer ou remplacer un forecast historique.
5. Preflight de la seule projection courante, confirmation existante,
   écriture complète puis reload. Toute erreur rejette l'import entier,
   préserve l'ancien document et rapporte un chemin fautif.

Le codec courant répare certaines couleurs/associations et filtre les
catalogues orphelins. Le mode historique doit être **strict** : ni réparation,
filter, deduplication ni normalisation destructive. Une capture/référence/
ligne inconnue ou incomplète fait échouer le document entier. Les migrations
des anciennes enveloppes restent leurs règles séparées.

Au startup, une histoire V6 invalide conserve le document et montre l'erreur
selon le mécanisme existant ; ne pas charger/réécrire seulement le planning
courant amputé. Le fallback ne doit provoquer aucune écriture automatique.

## UX minimale et exclusions

En-tête Planning près de Settings : **Save portfolio snapshot** et accès à
une liste simple, date/heure locale au minimum (secondes/millisecondes si
nécessaires), ordre déterministe createdAt puis ID, Delete accessible avec
confirmation ciblée. Succès visible ; erreur dirty/intégrité/quota conserve
planning et liste. Pas d'édition ou restauration.

Exclus de 11A : graphes EAC/fin/priorité, comparaison graphique, attribution
causale (EAC, priorité, capacity, Reservations, autres Projects), navigation
complète dans un portefeuille historique, restauration et moteur historique
sélectionnable. Pas de métriques dérivées propres aux Reservations ; le
résultat Team contient naturellement leurs effets déjà calculés.

## Séquence d'implémentation et gates

1. **Décisions/audit.** Valider 10C.2 séparément ; trancher les ambiguïtés
   ci-dessous. Spécifier DTO inputs/forecast et fixtures riches avant capture.
2. **Codec commun.** Extraire codecs de `application/backup/flowplanBackupV1.ts`
   vers modules dédiés voisins, sans changer V1–V5 ; mode référencé strict et
   réhydratation privée. Gate : parité riche et migrations existantes.
3. **Artefact immutable.** Types/factories dans un module
   `domain/portfolioSnapshots/`, assemblage/résolution dans Application,
   deep-copy/freeze complet, horloge/générateur injectés. Gate : sources
   exclusives, intégrité V5/legacy, aucun appel moteur.
4. **Forecast/Project.** Helper sémantique partagé dans adapters (ou projecteur
   pur conforme aux dépendances) utilisé par `buildTimelineViewModel.ts` et
   capture orchestrée par Main. Codec exact PlanningResult et version moteur.
   Gate : mêmes fins Timeline, absences définies et aucune formule UI.
5. **Session/transactions.** `planningSession.ts` : collection conservée dans
   toutes commandes, IDs historiques réservés. Dispatcher : Save/Delete
   sans recalcul. Gate : échecs atomiques, pas de perte sur commande ordinaire.
6. **V6.** Codec, backup operations, composition/export/startup/import,
   lecteurs anciens conservés et downgrade protégé. Gate : import vierge et
   round-trip complets, broken refs refusées, zéro perte.
7. **Dirty/UI.** Interfaces des contrôleurs, notifications/agrégateur dans
   coordinator, guard du service, contrôles `renderApp.ts` et contrôleur
   `ui/portfolio-snapshots/`. Gate : toutes surfaces, drafts invisibles,
   Apply/Cancel/remount, clavier et écran étroit.
8. **Canon/clôture.** Actualiser `canon.md` (explicite, immutable, suppression,
   same-day, clean-only, portefeuille complet, références Actuals, forecast
   figé, export/import et frontière 11B), `current_canon.md`, canon dédié 11A
   et roadmap. Formaliser l'artefact historique distinct des projections
   jetables et l'exception Save/Delete sans recompute. Réconcilier 10D/10E.
   IN REVIEW seulement après implémentation cohérente ; baseline validée
   seulement après validation humaine. Cette passe écrit uniquement ce plan
   et son lien dans `current_plan.md`.

## Matrice de tests attendue

| Axe | Cas et assertions minimales |
| --- | --- |
| Création/date | Save explicite vide/riche ; répétition des mêmes inputs autorisée ; plusieurs captures le même jour avec IDs/timestamps distincts ; collision/horloge reculée rejetée sans date inventée ; indépendance cursor/Actuals ; aucune capture automatique. |
| Dirty | Forecast des deux kinds, RAF rapide, Actuals modal/handoff, Team nom/periods, trois Create, Settings ; invalides, cartes fermées/autres tabs ; service appelé directement bloqué ; ouverture vierge non dirty ; Apply nettoie seulement sa carte ; Cancel/rebase/remount actualisent disabled. |
| Inputs | Tous actifs/inactifs, exceptions/capacités hors horizon, fractions/dailyCap caché, ratio/fixed, Reservation zéro Team, référentiels/couleurs/contraintes/calendar/horizon/parallélisme ; réhydratation égale aux inputs et priorité complète. |
| Actuals | none vs RAF-only vs covered zéro ; ID courant au Save ; référence ancienne après rectification/membership ; préfixe valide ; mauvais kind/owner/ID/version/Team/RAF refusé ; legacy intermittent/pending/reconciled sans double comptage ; Save ne crée aucun V5. |
| Forecast | PlanningResult affiché copié exactement ; tiers rationnels, Actuals hors horizon/inactifs, RAF/EAC exacts, position 1-based ; multi-Team, début allocation positive, fins absentes sur inactif/zéro/incomplet/non planifié ; aucun agrégat Reservation spécifique. |
| Immutabilité | Mutation des arrays/configurations sources sans effet ; edit profond rejeté ; anciennes captures inchangées après tous types de commandes, rectifications Actuals et nouveaux Saves. |
| Suppression/identité | Une capture retirée, Actuals partagés/projection conservés ; unknown ID/write failure sans effet ; objet sans Actuals supprimable avec copie historique intacte ; IDs réservés delete/reload/import pour cinq kinds ; guards Actuals/Team inchangés. |
| Transaction | Save/Delete zéro recompute (spies), état/projection du même run, mismatch refusé ; quota failure préserve document/état/liste/drafts ; mutations ordinaires conservent histoire avec une projection. |
| Export/import | V6 exact round-trip multi-captures/refs partagées vers stockage vierge ; V1–V5 migrent à collection vide avec legacy intact ; downgrade refusé ; champs/schémas inconnus, dates invalides/futures, missing refs, doublons, rationnels non canoniques et catalogue historique orphelin rejettent tout. |
| Zéro perte silencieuse | Une référence/capture invalide au milieu rejette tout ; aucune réparation/filter historique ; mauvais startup reste stocké/signalé, fallback sans write automatique ; failed/cancelled import préserve état ; anciens encodeurs ne retirent jamais l'histoire. |
| Indépendance | Modifier priorité, RAF/Actuals, capacity/calendar, concurrence, activation, contraintes/bornes laisse inputs/forecast historiques identiques ; injecter un moteur produisant un autre résultat : lecture/import n'appellent pas ce moteur pour l'histoire, preflight courant peut diverger sans toucher aux captures. |
| UX | Save/liste/Delete, disabled expliqué, erreur non destructive, dates locales précises, ordre déterministe, clavier/focus et desktop/390 px sans overflow ; cursor/viewport/drafts préservés. |

Après implémentation : `npm run typecheck`, `npm test`, `npm run build`,
régression réelle backup/mandatory et review visuelle desktop/étroite.
Pour cette passe documentaire : contrôle des liens/diff et absence de code,
tests ou données modifiés ; aucun build ni test généré ; commit/push des deux
documents seulement.

## Ambiguïtés et conflits à résoudre explicitement

- **Début estimé absent du modèle.** Valider « première allocation du forecast
  restant » ; un début de vie avec Actuals n'est pas équivalent. Le code de
  ce champ attend cette décision.
- **Pending V4 sans ID V5.** Valider l'exception evidence legacy figée ou
  décider d'un blocage Save avant réconciliation ; aucune perte/ID inventé.
- **Précision temporelle.** Valider le refus de deux clics dans la même
  milliseconde si nécessaire ; l'acceptation inconditionnelle demanderait
  une source temporelle plus précise ou une autre politique explicite.
- **Roadmap.** 10C.2 IN REVIEW au HEAD malgré le contexte « lot 10 accompli » ;
  aucune validation implicite. Périmètres résiduels 10D/10E à réconcilier.
- **Projections jetables.** Le résultat historique persistant est une
  nouvelle frontière requise ; le ViewModel ne devient pas source de vérité.
  Save/Delete sans recompute exigent une exception documentée à la pipeline.

Perte potentielle par `freezeState`, dirty dispersé, réparations du codec et
recyclage d'IDs sont des travaux techniques identifiés, pas des raisons de
changer silencieusement le contrat métier. Aucune implémentation 11A n'est
réalisée ou déclarée validée dans ce document.
