# FlowPlan2 V2 — registre durable des décisions

Statut : décisions R0 validées par audit indépendant favorable à
`62bfdb9f36b406a0196ba7ceee45884217c68365` ; aucune implémentation autorisée.
Point d'entrée : [current_plan](../../current_plan.md).
Option B extraction sélective, verticales R1 mémoire/R2 durable, architecture à
six modules, stockage neuf isolé et matrice de reprise sont validés.

Ce registre est l'index compact des décisions normatives, pas un second plan.
Contrats détaillés : [dossier normatif R0 §2–§3](./rewrite_r0_plan.md#2-nouvelle-trajectoire-et-décisions-définitives).
Hiérarchie et autonomie : [R0 §1](./rewrite_r0_plan.md#1-autorité-état-et-ordre-de-lecture).
Les conversations et les renvois patrimoniaux n'ajoutent aucune norme V2.
Toute décision future est inscrite ici avant clôture du lot qui l'introduit,
avec statut/portée/remplacement et référence au contrat détaillé approuvé.

| ID | Statut | Décision synthétique et portée | Remplace | Référence détaillée normative |
| --- | --- | --- | --- | --- |
| T01 | VALIDÉE | IDs opaques stables, versions immuables, propriétaires et filiation explicites, collision divergente refusée. Current seul sélectionne le courant ; terminal/timestamp/latest ne sélectionnent rien. | — | [R0 §2–§3](./rewrite_r0_plan.md#2-nouvelle-trajectoire-et-décisions-définitives) |
| T02 | VALIDÉE | PlanningSettings et PortfolioOrder séparés/versionnés ; dailyCap PT ; ETC et open/completed PTEC. | — | [R0 §2–§3](./rewrite_r0_plan.md#2-nouvelle-trajectoire-et-décisions-définitives) |
| T03 | VALIDÉE | Ajustement de dates : même SubPeriodId, nouvelle version. Consommation : nouveau TeamActual versionné. Split : nouveaux IDs ; merge : nouvel ID, toutes sources explicites. | — | [R0 §2–§3](./rewrite_r0_plan.md#2-nouvelle-trajectoire-et-décisions-définitives) |
| T04 | VALIDÉE | Manifestes de refs exactes, une version par identité requise, fermeture validée ; aucun payload copié, fallback ou index autoritaire. | — | [R0 §2–§3](./rewrite_r0_plan.md#2-nouvelle-trajectoire-et-décisions-définitives) |
| T05 | VALIDÉE | Restore Project/Reservation sous même identité, nouvelle version existing, revue/confirmation PT/RT et ETC/demandes/catalogues, publication atomique ; histoire intacte. | — | [R0 §2–§3](./rewrite_r0_plan.md#2-nouvelle-trajectoire-et-décisions-définitives) |
| T06 | VALIDÉE | Hide Team réversible, identifiable et purement visuel, quelle que soit la charge ; calculs/agrégats intacts. | — | [R0 §2–§3](./rewrite_r0_plan.md#2-nouvelle-trajectoire-et-décisions-définitives) |
| T07 | VALIDÉE | Program/Pas usage-driven ; dernière référence existing retirée → auto-deleted dans la même transaction. Inactive compte ; restore explicite ; noms existing normalisés uniques sans fusion d'identités. | — | [R0 §2–§3](./rewrite_r0_plan.md#2-nouvelle-trajectoire-et-décisions-définitives) |
| T08 | VALIDÉE | Ordre structurel garde tous Projects inactive/deleted ; filtre seulement en projection, restore au même rang sans déplacer autrui ni réactiver de charge. | — | [R0 §2–§3](./rewrite_r0_plan.md#2-nouvelle-trajectoire-et-décisions-définitives) |
| T09 | VALIDÉE | knowledgeDate PortfolioSnapshot déclarative obligatoire, ≥ dernière couverture sélectionnée ; distincte de createdAt, égalités et recul entre captures permis. La clause ancienne date inconnue reste une règle d'archive hors V2 neuf. | — | [R0 §2–§3](./rewrite_r0_plan.md#2-nouvelle-trajectoire-et-décisions-définitives) |
| T10 | VALIDÉE | Nouvelle version AP → tous PTEC rebondés ; completed garde ETC zéro explicitement reconfirmé. Reprise uniquement par reopen explicite. | — | [R0 §2–§3](./rewrite_r0_plan.md#2-nouvelle-trajectoire-et-décisions-définitives) |
| T11 | VALIDÉE | Raccourcissement : bornes présentées, chaque consommation reconfirmée ; préremplissage uniquement mapping univoque, jamais preuve ; zéro corrigé permis, aucun prorata. | — | [R0 §2–§3](./rewrite_r0_plan.md#2-nouvelle-trajectoire-et-décisions-définitives) |
| T12-R | VALIDÉE | Dépôt neuf natif exclusivement ; aucune migration/import automatique ni accès en écriture legacy ; robustesse du nouveau stockage maintenue. | T12 historique | [R0 §2–§3](./rewrite_r0_plan.md#2-nouvelle-trajectoire-et-décisions-définitives) |
| T13 | VALIDÉE | Project possède toujours AP stable/version immuable, vide sans dates/SubPeriods/TA ; tous PTEC pointent dessus. Première saisie, zéro compris, nouvelle version couverte. | — | [R0 §2–§3](./rewrite_r0_plan.md#2-nouvelle-trajectoire-et-décisions-définitives) |
| T14 | VALIDÉE ; migration inapplicable | Décision originale « tous PTEC migrés open, ETC conservé, jamais statut moteur inféré » conservée avec portée migration **inapplicable** sous T12-R. Aucun PTEC migré V2. Création native : open, ETC explicite exact, zéro n'implique pas completed. | — | [R0 §2–§3](./rewrite_r0_plan.md#2-nouvelle-trajectoire-et-décisions-définitives) |
| T15 | VALIDÉE | Deleted non éditable : restore explicite puis édition ; suppression de nouveau possible ; aucune charge réactivée automatiquement. | — | [R0 §2–§3](./rewrite_r0_plan.md#2-nouvelle-trajectoire-et-décisions-définitives) |
| T12 historique | REMPLACÉE ; hors cible V2 | Conversion obligatoire de toutes captures V4–V8 : plus applicable ; trace patrimoniale conservée. | Remplacée par T12-R | [R0 §2](./rewrite_r0_plan.md#2-nouvelle-trajectoire-et-décisions-définitives) |

T14 : partie migration inapplicable sous T12-R ; invariant natif conservé :
**création open, ETC explicite exact, ETC zéro n'implique jamais completed**.
Seule action complete explicite avec zéro confirmé donne completed ; jamais
inférence du résultat moteur. Aucune nouvelle décision créée par ce registre.

Point métier volontairement **OUVERT** : Reservation ratio + exception sans
période ; arbitrage documenté avant reprise complète R3, sans rouvrir les
conclusions R0. Voir [R0 §3.3](./rewrite_r0_plan.md#33-calculs-conservés-et-amendements-obligatoires).
Les détails techniques ouverts et leurs lots restent dans [R0 §8](./rewrite_r0_plan.md#8-séquencement-recommandé-et-validations-verticales).
