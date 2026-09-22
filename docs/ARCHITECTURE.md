# Architecture technique

FlowPlan conserve des frontières simples et explicites. La plateforme repose
uniquement sur TypeScript, Node.js 24, npm et les standards natifs du navigateur.

```text
main -> ui
main -> future application / infrastructure
ui -> future application / presentation adapters
application -> domain
infrastructure -> application ports
```

- `domain/` contient le modèle métier pur. Il ne dépend ni du navigateur, ni du
  stockage, ni de l'interface utilisateur.
- `application/` accueillera les futurs cas d'usage et ports.
- `adapters/` accueillera les futurs view models et adaptations de présentation.
- `infrastructure/` implémentera les futurs adapters techniques.
- `ui/` utilise uniquement le DOM et SVG natifs. Elle ne dépend jamais de
  `main/`.
- `main/` est le composition root et le point d'entrée navigateur. Aucun autre
  dossier ne doit importer depuis `main/`.

Une UI vanilla ne signifie pas une UI monolithique. Le découpage par
responsabilité reste obligatoire même sans framework : `main` assemble, `ui`
rend le DOM/SVG, et le domaine reste indépendant.

## Chaîne d'outillage

- TypeScript strict est compilé par `tsc` en modules ES natifs.
- Les imports relatifs TypeScript utilisent des suffixes `.js` afin que les
  fichiers émis soient directement résolus par le navigateur et Node.
- `node:test` et `node:assert/strict` exécutent les tests compilés séparément
  dans `.test-dist/`.
- `scripts/build.mjs` nettoie `dist/`, compile `src/` vers `dist/js/`, puis
  copie les sources statiques de `public/`.
- `scripts/dev.mjs` effectue un build initial, démarre `tsc --watch` et sert
  `dist/` avec `node:http` sur `http://127.0.0.1:4173`.

Les seules dépendances de développement sont `typescript` et `@types/node`.
Aucun bundler, framework UI, runner de tests, linter ou formatter tiers n'est
utilisé.

## Artefact statique

```text
public/                  sources statiques maintenues à la main
  index.html
  styles.css

dist/                    artefact généré, complet et jetable
  index.html
  styles.css
  js/
    domain/
    application/
    adapters/
    infrastructure/
    ui/
    main/
```

Le navigateur charge `dist/js/main/main.js` avec un script `type="module"`.
Le CSS est chargé directement par `index.html`; aucun import CSS n'est effectué
depuis TypeScript.

## Commandes de référence

```text
npm install
npm run typecheck
npm test
npm run build
npm run dev
```

La vérification navigateur minimale consiste à lancer `npm run dev`, ouvrir
`http://127.0.0.1:4173`, puis vérifier la présence de `FlowPlan` et de
`Planning workspace`.

## Planning Engine — Phase 2C

La Phase 2B introduit l'admission quotidienne canonique. Pour chaque équipe,
l'admission est entièrement recalculée chaque jour dans l'ordre global de
priorité, sans droit à la continuité, jusqu'à `maxParallelProjects`. L'ensemble
admis est ensuite figé pour la journée : terminer un RAF ou ne recevoir aucune
allocation ne libère pas de place et aucun autre projet ne peut entrer en
remplacement.

La Phase 2C remplace la consommation séquentielle temporaire par le partage
normal canonique entre les seuls projets admis. Un quantum normal vaut
exactement `0.5` j.h. (`1/2` rationnel) et la distribution s'effectue par tours
dans l'ordre de priorité. La priorité tranche ainsi les quanta indivisibles.

Lorsqu'un projet atteint son RAF ou son plafond quotidien cumulé, les tours
suivants redistribuent la capacité uniquement au sein de l'ensemble admis. Un
reliquat final de RAF inférieur à `0.5` peut être alloué exactement pour achever
le projet. Une fraction de capacité inférieure à `0.5` reste inutilisée si elle
ne permet pas de terminer exactement un RAF.

La date objectif et la deadline impérative restent ignorées. En particulier,
une deadline n'influence jamais l'admission.
