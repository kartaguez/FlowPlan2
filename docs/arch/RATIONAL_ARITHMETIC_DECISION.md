# Décision — arithmétique rationnelle exacte du domaine

Les quantités métier de Phase 1 suivent désormais ce flux :

```text
input decimal string
        ↓
exact rational bigint / bigint
        ↓
exact domain calculations
        ↓
explicit decimal rendering
```

Cette stratégie remplace le `number` normalisé à neuf décimales. Cette ancienne
représentation pouvait dépasser sa plage sûre pendant un calcul intermédiaire,
notamment parce qu'un ratio cumulé de réservation n'est pas borné. Les futurs
calculs de deadline pourront aussi produire des valeurs périodiques. Une
fraction exacte permet donc de reporter tout arrondi métier jusqu'à la policy
qui le définira, sans introduire cette policy en Phase 1.

## Entrées décimales

Les fabriques de capacité, RAF, plafond et ratio reçoivent exclusivement une
chaîne décimale. Le format accepté est :

```text
-?(0|[1-9][0-9]*)(\.[0-9]+)?
```

Il accepte par exemple `0`, `12`, `12.5`, `0.20` et `-1.25`. Le signe `+`, la
notation exponentielle, les séparateurs, les préfixes hexadécimaux, les espaces,
les décimales sans partie entière, les décimales sans chiffre après le point et
les zéros initiaux sont rejetés. Les invariants métier sont appliqués après le
parsing exact ; les quantités non négatives rejettent donc une valeur négative.

Le parsing n'utilise jamais `Number` ou `parseFloat`. Les chiffres deviennent
un numérateur `bigint` et la longueur de la partie fractionnaire détermine une
puissance de dix comme dénominateur.

## Canonicalisation et encapsulation

Une fraction interne est toujours réduite par le PGCD. Son dénominateur est
strictement positif, son signe est porté par le numérateur et zéro vaut toujours
`0/1`. Les objets rationnels et les jetons opaques représentant `Capacity`,
`RemainingWorkload`, `DailyCap`, `CapacityRatio` et `ReservationRatio` sont
gelés. La fraction interne n'appartient pas au contrat public du barrel
`src/domain/index.ts`.

La sérialisation exacte canonique est une chaîne `numerator/denominator`, par
exemple `16/25`. Le numérateur est signé, le dénominateur est positif et la
fraction est réduite. Les fonctions de désérialisation réappliquent également
l'invariant propre au type métier.

## Restitution décimale

`quantityToDecimalString` ne participe jamais aux calculs métier. Sans précision,
elle restitue exactement les fractions possédant un développement décimal fini
et refuse les fractions périodiques. Pour une fraction périodique, une précision
explicite est obligatoire ; la restitution conserve au plus ce nombre de
décimales, tronque vers zéro et retire les zéros finaux. Ainsi `1/3` à la
précision `6` devient `0.333333`. Cette chaîne de présentation n'est jamais
réinjectée automatiquement dans le domaine.
