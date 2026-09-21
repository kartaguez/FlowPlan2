# Architecture cible — Phase 0

FlowPlan est reconstruit clean-room autour de frontières simples. Le domaine ne
dépend d'aucun détail technique.

```text
ui / infrastructure -> application -> domain
                    adapters -> domain/application results
main composes concrete dependencies
```

- `domain/` portera les invariants métier et le futur `PlanningEngine`. Il ne
  doit importer ni React, ni DOM, ni persistence.
- `application/` contiendra les use cases et les ports. Il peut dépendre du
  domaine, jamais de l'UI ou de l'infrastructure concrète.
- `adapters/` accueillera notamment l'adapter `PlanningResult` vers un view
  model de timeline. Il ne mettra aucun pixel ou SVG dans le domaine.
- `infrastructure/` implémentera les ports vers stockage et formats externes.
- `ui/` rendra React/SVG et traduira les intentions utilisateur en use cases;
  elle n'appellera jamais le `PlanningEngine` directement.
- `main/` est le composition root explicite. Il assemble les dépendances sans
  conteneur d'injection.

Les répertoires de frontière existent dès la Phase 0, mais les modules métier
ne sont volontairement pas créés : ils seront conçus à partir de leurs
invariants en Phase 1.
