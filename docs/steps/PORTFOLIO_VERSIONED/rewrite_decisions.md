# FlowPlan2 V2 — registre durable des décisions

Statut : décisions R0 validées par audit indépendant favorable à
`62bfdb9f36b406a0196ba7ceee45884217c68365`. GO R0.1 reçu après audit du plan
à `1c2b08c727af9fb8002b7678bd7403fcc0d39c27` ; R0.1 DONE après audit indépendant favorable et clôture utilisateur au SHA
`d5bb1a89c847604f2f80aaaa3270e4125f4a3fef`, avec amendement I-R01-C ; R1/R2 non autorisés.
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

## Décisions d'infrastructure R0.1

GO d’implémentation R0.1 reçu le 2026-10-10 après audit favorable ; état clôturé DONE le 2026-10-10 selon I-R01-C.
Ces décisions précisent T12-R et la frontière de reprise, sans changement métier.
Les choix techniques du [plan R0.1](./rewrite_r01_plan.md) sont adoptés par ce GO ;
résultats et limites dans le [canon R0.1](./rewrite_r01_canon.md), aucune extraction métier.

| ID | Statut / portée | Décision | Contrat détaillé |
| --- | --- | --- | --- |
| I-R01-A | VALIDÉE par cadrage utilisateur ; infrastructure R0.1 | Isolation physique forte : source root V2 distinct de src ; ancien src hors compilation/tests/exécution V2 ; imports V2 → legacy interdits mécaniquement. Aucune extraction métier avant R1. | [R0.1 §3–§6](./rewrite_r01_plan.md#3-cible-et-portfolio-vide-borné-à-r01) ; choix livré src-v2/public-v2/dist-v2/.test-dist-v2 |
| I-R01-B | VALIDÉE par cadrage utilisateur ; environnement R0.1 | Origines browser V2 dédiées et fixes, distinctes du legacy, vérifiées mécaniquement ; namespaces distincts, aucun bridge runtime. | [R0.1 §5](./rewrite_r01_plan.md#5-origines-fixes-et-frontières-browser) ; choix livré dev 127.0.0.1:4274 / portable 127.0.0.1:4275 |

Source root exact, ports, outillage, DTO shell, packaging et G01–G16 sont fixés
par le plan audité et GO utilisateur. Implémentation clôturée : G01–G14 PASS,
G15 consultation 4174 PASS ; G15/G16 partiels uniquement pour Windows réel manquant, voir canon.
Namespaces R0 §6 inchangés ; aucun stockage ouvert par R0.1 ; schéma/codec/
persistence métier restent R2. Audit indépendant favorable de l’implémentation
et clôture utilisateur reçus ; qualification Windows non acquise.

## Amendement de clôture R0.1 — report Windows

**I-R01-C — VALIDÉE par décision utilisateur le 2026-10-10.** Audit indépendant
favorable sur architecture, frontières d’isolation et preuves disponibles à
`d5bb1a89c847604f2f80aaaa3270e4125f4a3fef` ; clôture R0.1 explicitement autorisée.
Remplace uniquement le critère initial « Windows SEA obligatoire avant DONE »
du [plan R0.1 §4/§7/§8/§10](./rewrite_r01_plan.md) selon son
[historique d’amendement §13](./rewrite_r01_plan.md#13-amendement-de-clôture-du-2026-10-10).

R0.1 peut être DONE sans exécuter les véritables binaires Windows. Motif : le
packaging est périphérique au socle technique ; il ne conditionne ni isolation
runtime, fermeture des graphes, Portfolio vide ni démarrage browser déjà validés.
Aucune autre gate, responsabilité R1/R2 ou décision métier n’est modifiée.

Construction/exécution Windows x64 de FlowPlan2-V2.exe, portable historique
indépendant et vérifications natives ports/assets/sentinelles/arrêt :
**DEFERRED / NOT EXECUTED**, jamais PASS. Leur validation reste obligatoire sur
environnement Windows compatible avant toute déclaration de compatibilité,
disponibilité, qualification ou distribution Windows ; preuves et levée explicite
à enregistrer dans le [canon R0.1](./rewrite_r01_canon.md#limites-windows-résiduelles).
R1 prochain lot NOT STARTED ; R2 NOT STARTED, aucun GO implicite.
