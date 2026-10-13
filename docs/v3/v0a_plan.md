# FlowPlan3 — V3 / V0-A — plan d'implémentation

**Statut : PROPOSED FOR AUDIT — NOT STARTED.** Ce document autorise uniquement l'audit du plan. Aucun code V3, test exécutable ou fichier de configuration V3 n'est livré avec lui. L'implémentation attend un GO explicite après audit indépendant.

## 1. Baseline Git et isolation

- Le 13 octobre 2026, `git fetch origin` a réussi. La branche de départ était `rewrite/portfolio-versioned` ; son HEAD local et `origin/rewrite/portfolio-versioned` valent tous deux `4a610c942e913a1676ec0001c057d842e096355d`. `git rev-list --left-right --count HEAD...origin/rewrite/portfolio-versioned` a donné `0 0`.
- Les modifications locales initialement présentes ont été annulées à la demande explicite de l'utilisateur. `git status --short` était ensuite vide. La branche nouvelle `v3/vertical-slices` a été créée depuis `origin/rewrite/portfolio-versioned` et sélectionnée, sans modifier la branche de départ.
- La seule modification de cette livraison est ce document. Le code historique reste conservé. V3 aura ses propres sources, tests, ressources et commandes ; aucun import de `src/` ou `src-v2/`, aucune migration ni compatibilité V2/V3.
- Constat technique limité : Node `v24.21.0`, TypeScript `5.9.3` installé localement, `package.json` avec `engines.node >=24` et `type: module`. Les commandes racine `dev`, `build`, `test` et `typecheck`, ainsi que le `tsconfig.json` racine, ciblent V2. Le `.gitignore` existant ne couvre pas les futurs produits de build V3. Aucune de ces configurations ne sera modifiée.

## 2. Objectif et parcours V0-A

Dans une seule session navigateur, l'utilisateur saisit le nom et les bornes inclusives d'un planning, une équipe et sa capacité quotidienne, puis exactement deux projets avec identifiant interne, nom, début au plus tôt, ETC et priorité. Il valide la saisie, obtient immédiatement la projection quotidienne et peut corriger les champs puis recalculer depuis le début global. Le dernier planning validé est le seul planning courant, conservé en mémoire tant que la page reste ouverte. Une erreur de validation laisse visible le dernier résultat valide et indique le champ à corriger.

L'écran présente un tableau de toutes les dates de l'horizon, week-ends compris, avec capacité disponible, allouée et inutilisée et les allocations positives de chaque projet dans l'ordre des priorités. Un second tableau montre ETC initial, planifié, non planifié, début estimé et fin estimée. Pour un ETC nul, l'état est indiqué comme « 100 % planifié ».

Le scénario de référence utilise trois jours ouvrés consécutifs, une capacité de `3` j.h, A de priorité `1` et ETC `4`, B de priorité `2` et ETC `5`, tous deux éligibles dès le début. Les allocations A/B attendues sont `3/0`, `1/2`, puis `0/3`. Les deux projets sont terminés le troisième jour ; A commence le premier et finit le deuxième, B commence le deuxième et finit le troisième.

## 3. Domain minimal et invariants

Le Domain est pur : aucune référence au navigateur, aux fichiers, au stockage, aux frameworks ou aux couches externes. Les objets métier sont des valeurs immuables :

| Objet | Données et responsabilité |
| --- | --- |
| `Planning` | Nom non vide après suppression des espaces en bordure, `startDate`, `endDate`, une `Team` et une paire de `Project`. Il représente le seul planning courant de V0-A. |
| `Team` | Identifiant interne, nom non vide et capacité quotidienne constante, positive ou nulle. |
| `Project` | Identifiant interne, nom non vide, date de début au plus tôt, ETC positif ou nul et rang de priorité. Les noms peuvent être identiques. |
| `DayProjection` | Date, capacité disponible, allouée et inutilisée ; allocations strictement positives et ordonnées. |
| `ProjectProjection` | Identifiant, ETC initial, quantité planifiée et non planifiée, début et fin estimés éventuels, état entièrement planifié. |

Les identifiants des deux projets sont non vides et distincts ; l'identifiant de l'équipe est non vide. Les deux rangs de priorité sont des entiers positifs distincts. **Le rang `1` est le plus prioritaire** : l'ordre de calcul est donc `1`, puis `2`, conformément au scénario d'acceptation ; « priorité décroissante » désigne ici l'importance décroissante, et non la valeur numérique décroissante. Les rangs n'ont pas besoin d'être consécutifs. Le début global et la fin globale sont des dates civiles ISO `YYYY-MM-DD` réelles, avec fin supérieure ou égale au début. Le début au plus tôt de chaque projet est supérieur ou égal au début global et peut dépasser la fin globale. Les dates sont comparées et parcourues comme jours civils, sans dépendre du fuseau local.

Les quantités d'entrée sont des chaînes décimales non négatives en notation ordinaire, par exemple `0`, `0.125` ou `12.5`. Aucun pas n'est imposé. Les chaînes invalides, signes négatifs, exponentielles et valeurs non finies sont rejetés. Le calcul normalise les décimales sur une échelle commune et utilise des entiers `BigInt` ; il ne passe pas par l'arithmétique binaire flottante. La sortie est une chaîne décimale normalisée. Les champs d'entrée et leurs ETC ne sont jamais modifiés. Les erreurs de validation sont explicites et associées aux champs ; aucun résultat partiel n'est publié.

## 4. Allocation quotidienne

1. Valider et copier les valeurs d'entrée, puis normaliser les quantités décimales. Initialiser pour chaque projet un **reste de calcul** égal à son ETC, sans changer l'ETC d'entrée. Trier les deux projets par rang croissant.
2. Parcourir chaque date du début global à la fin globale, bornes incluses. La capacité disponible est celle de l'équipe du lundi au vendredi, et `0` le samedi et le dimanche. Aucun jour férié n'est traité.
3. Pour la date courante, repartir du premier rang. Un projet n'est éligible que si sa date de début au plus tôt est atteinte et son reste est positif. Lui attribuer le minimum du reste et de la capacité résiduelle, puis passer au rang suivant. Ainsi, le reliquat d'une journée sert au projet suivant et l'arrivée d'un projet plus prioritaire préempte dès ce jour le projet moins prioritaire.
4. Enregistrer seulement les allocations strictement positives. Calculer `allouée = somme des allocations` et `inutilisée = disponible - allouée`. Émettre une entrée même si ces valeurs sont nulles.
5. Après la dernière date, calculer pour chaque projet `planifiée = ETC initial - reste` et `non planifiée = reste`. Le début estimé est la première date d'allocation positive. La fin estimée est la date où le reste devient nul grâce à une allocation. Un ETC positif sans achèvement n'a pas de fin estimée ; sans allocation, il n'a ni début ni fin estimée. Pour un ETC nul, aucune allocation ni début estimé, fin estimée égale au début au plus tôt, et état entièrement planifié (`100 %`).

Chaque appel recalcule depuis le début global à partir des entrées validées. À chaque date, la somme allouée reste inférieure ou égale à la capacité disponible ; pour chaque projet, la somme allouée reste inférieure ou égale à l'ETC initial. Même entrée, même sortie, quel que soit l'ordre de saisie des projets ; aucun état caché ni horloge n'intervient.

## 5. Use Case, ports et composition

Un seul Use Case `createAndProjectPlanning` suffit pour V0-A : il reçoit la saisie complète, demande au Domain de la valider, calcule une projection complète et retourne soit le planning et la projection, soit les erreurs de champs. Le navigateur conserve le dernier résultat validé en mémoire et le remplace seulement après un succès. Cette opération couvre création, définition de l'équipe et des deux projets, correction et recalcul. Il n'y a pas de commandes génériques ni de gestion complexe de brouillons.

**Aucun port applicatif n'est nécessaire dans cette slice.** Le moteur est une fonction pure appelée directement par le Use Case. La saisie et l'affichage relèvent de l'adapter entrant ; la session en mémoire ne constitue pas une dépendance externe à abstraire. Il n'existe aucun adapter sortant V0-A. Un port de stockage ne sera envisagé qu'avec la sauvegarde locale de V0-D.

L'adapter entrant est une page HTML et un contrôleur navigateur TypeScript : formulaire explicite, erreurs de champs, bouton de calcul et deux tableaux accessibles. Il transmet les chaînes de saisie au Use Case et affiche uniquement la projection retournée. `main` compose le contrôleur et le Use Case au chargement de la page ; il ne charge aucune ressource V1/V2. Le serveur de développement ne sert que les ressources produites pour V3.

## 6. Fichiers prévus pour l'implémentation après GO

La liste ci-dessous est une cible minimale et non une création effectuée par cette mission. Un fichier supplémentaire ne sera ajouté que si une responsabilité concrète apparaît pendant l'implémentation auditée.

| Fichier nouveau prévu | Responsabilité concrète |
| --- | --- |
| `src-v3/domain/decimal.ts` | Valider, normaliser, comparer, additionner et soustraire les décimales exactes via `BigInt`. |
| `src-v3/domain/planning.ts` | Définir et valider les valeurs immuables `Planning`, `Team`, `Project` et les dates civiles. |
| `src-v3/domain/allocate.ts` | Produire les projections quotidiennes et par projet selon l'algorithme ci-dessus. |
| `src-v3/application/usecases/createAndProjectPlanning.ts` | Orchestrer validation et projection, retourner un résultat typé ou des erreurs de champs. |
| `src-v3/adapters/inbound/browser.ts` | Lire le formulaire, déclencher le Use Case et rendre erreurs et tableaux ; garder le dernier résultat valide en mémoire. |
| `src-v3/main/index.ts` | Composer l'adapter navigateur avec le Use Case. |
| `public-v3/index.html` | Fournir le formulaire et les conteneurs de résultats avec libellés accessibles ; charger uniquement l'entrée compilée V3. |
| `public-v3/styles.css` | Mise en page simple et responsive des champs et tableaux, sans frise graphique. |
| `tsconfig.v3.app.json` | Compiler uniquement `src-v3/` vers la sortie V3, en modules ES stricts ; exclure les tests. |
| `tsconfig.v3.test.json` | Compiler `src-v3/` et `tests-v3/` pour les tests Node, sans inclure `src/` ni `src-v2/`. |
| `scripts/v3/.gitignore` | Ignorer la seule sortie générée `scripts/v3/.generated/` sans modifier le `.gitignore` racine. |
| `scripts/v3/build.mjs` | Exécuter le compilateur TypeScript local, copier `public-v3/` et produire `scripts/v3/.generated/app/`. |
| `scripts/v3/dev.mjs` | Construire puis servir uniquement la sortie V3 sur une adresse locale ; ne pas lancer V1/V2. |
| `scripts/v3/boundaries.mjs` | Vérifier les imports par couche, interdire tout chemin vers V1/V2 et vérifier que la sortie HTML charge V3. |
| `scripts/v3/test.mjs` | Compiler les tests, lancer les tests Node et le contrôle de frontières ; lancer aussi le parcours navigateur lorsque le binaire requis est fourni. |
| `tests-v3/domain.test.ts` | Démontrer séparément les règles de validation, décimales, dates et allocation. |
| `tests-v3/application.test.ts` | Vérifier le résultat du Use Case, les erreurs de champs et le recalcul depuis les entrées. |
| `tests-v3/browser.e2e.mjs` | Construire et servir V3 localement, piloter un navigateur réel, saisir le scénario principal et vérifier les deux tableaux et les dates estimées. |

Les chemins `scripts/v3/.generated/` sont des sorties temporaires de commandes V3, ignorées par le nouveau fichier local. Aucun autre fichier historique, aucun `package.json` racine et aucun script existant n'est modifié.

## 7. Tests et commandes indépendantes

Les tests Domain couvrent chacun une règle observable : scénario principal ; capacité résiduelle le même jour ; inversion des rangs ; éligibilité différée avec préemption ; samedi/dimanche ; horizon insuffisant ; ETC nul ; capacité nulle ; décimales exactes ; absence d'allocation ; projet éligible après la fin ; déterminisme ; absence de mutation des entrées ; conservation de la capacité quotidienne et de chaque ETC. Des cas invalides ciblent dates, noms, identifiants, rangs et quantités. Chaque test vérifie des valeurs et dates précises, sans volume arbitraire.

Les tests Application vérifient la validation puis la projection et un recalcul complet après correction. Le test navigateur de bout en bout saisit le scénario A/B via l'interface, déclenche le calcul et vérifie les trois lignes ouvrées, les lignes de week-end si l'horizon en contient, les totaux, l'état entièrement planifié et les dates estimées. Il vérifie qu'une saisie invalide conserve le dernier résultat valide, puis modifie une priorité et vérifie le nouveau tableau. Le contrôle de frontières parcourt les imports et les ressources de V3 : `domain` ne dépend que de lui-même, `application` dépend du `domain`, `adapters` et `main` assemblent les couches, et aucune référence à `src/`, `src-v2/`, `public/` ou `public-v2/` n'existe dans les artefacts V3.

Commandes prévues, exécutées depuis la racine après implémentation et installation existante de TypeScript :

```sh
node scripts/v3/build.mjs
node scripts/v3/dev.mjs
node scripts/v3/test.mjs
V3_BROWSER_BIN=/chemin/vers/un-navigateur-chromium node --test tests-v3/browser.e2e.mjs
```

Le test navigateur utilise un Chromium local en mode headless via son protocole de débogage, piloté par les API natives de Node 24 ; il ne requiert pas de dépendance ajoutée au `package.json` racine. `V3_BROWSER_BIN` est un prérequis explicite pour ce test. La commande `test.mjs` exécute les tests Node et de frontières ; avec `V3_BROWSER_BIN` défini, elle inclut aussi le test navigateur. Le gate DONE exige ce dernier, même s'il doit être exécuté dans un environnement équipé de Chromium.

## 8. Risques et arbitrages pour l'audit

- **Priorité :** le texte « priorité décroissante » pourrait désigner un tri numérique descendant, mais le scénario A=`1` avant B=`2` tranche le sens métier. Le plan fixe `1` comme rang le plus prioritaire. L'audit doit confirmer cette lecture avant le GO.
- **Grand horizon :** une ligne par jour et un calcul complet peuvent coûter du temps et de la mémoire pour des dates très éloignées. V0-A n'ajoute aucun plafond métier non demandé ni moteur incrémental. L'audit peut décider si une limite de saisie explicite est nécessaire ; elle devra être motivée et documentée avant implémentation.
- **Navigateur de test :** aucun binaire Chromium n'a été trouvé dans les chemins courants de l'environnement inspecté. Le gate navigateur demandera `V3_BROWSER_BIN` ou un environnement CI équipé. Aucun téléchargement ni dépendance V2 n'est prévu.
- **Décimales :** la précision exacte par `BigInt` évite les erreurs de flottants mais nécessite une normalisation commune. Les pourcentages positifs ne sont pas une donnée métier exigée ; seuls les quantités exactes et l'indication `100 %` pour un ETC nul sont contractuels.

## 9. Séquence après audit et critères de DONE

1. **Domain :** implémenter décimales, modèle et moteur purs ; faire passer les tests métier ciblés.
2. **Use Case :** assembler validation et calcul sans port fictif ; faire passer les tests Application.
3. **Adapters :** construire formulaire et tableaux, puis les scripts V3 de build et de serveur isolé.
4. **Intégration :** relier l'entrée `main`, vérifier la sortie compilée et les frontières hexagonales.
5. **Bout en bout :** exécuter le parcours utilisateur dans un navigateur réel et vérifier le scénario d'acceptation.

V0-A sera DONE seulement si la saisie des deux projets produit les allocations et dates attendues, que toutes les règles métier et cas limites ci-dessus ont une preuve de test identifiable, que les frontières et l'absence de dépendance V1/V2 passent, que build/lancement/tests V3 se font sans les commandes V2, et que les fichiers historiques et le `package.json` racine restent intacts. Aucune persistance, Actuals, réservation, équipe multiple, Programme/Pas, snapshot, historique, versionnement métier, import/export, frise définitive, zoom, commande générique ou calcul incrémental n'entre dans cette slice.
