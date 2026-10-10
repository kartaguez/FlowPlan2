# FlowPlan2 V2 — registre durable des décisions

Statut : décisions R0 validées par audit indépendant favorable à
`62bfdb9f36b406a0196ba7ceee45884217c68365`. GO R0.1 reçu après audit du plan
à `1c2b08c727af9fb8002b7678bd7403fcc0d39c27` ; R0.1 DONE après audit indépendant favorable et clôture utilisateur au SHA
`d5bb1a89c847604f2f80aaaa3270e4125f4a3fef`, avec amendement I-R01-C ; cadrage R1 validé, PLAN R1.1 à auditer,
implémentations R1/R2 non autorisées.
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

## Cadrage R1 validé — préparation R1.1 uniquement

Décisions reçues de l'utilisateur le 2026-10-10 ; enregistrées depuis
`8926b1f1b73650c17114914a168c368d0331d87b`. **R1 — CADRAGE VALIDÉ** ;
[R1.1 PLAN](./rewrite_r11_plan.md) **PLANNED / NOT STARTED — PLAN À AUDITER**.
R1.2–R1.4 et R2–R6 NOT STARTED. Aucune autorisation d'implémentation.
Les mentions précédentes « R1 prochain lot » décrivent la clôture R0.1.

| ID | Nature / portée | Décision validée et contrat détaillé |
| --- | --- | --- |
| D-R1-01 | Conforme R0 T01/T12-R ; R1.1 | Modèle autonome sans autorité legacy ; IDs stables opaques, ref exacte (kind, entityId, versionId), owner typé immuable, versions immuables ; aucune modification/suppression physique des archives ; collision divergente refusée. Aucun latest/timestamp/ordre de création pour Current. [PLAN §4/§7](./rewrite_r11_plan.md#4-architecture-cible-des-primitives) ; stockage physique R2. |
| D-R1-02 | Précision architecturale T01/T03 ; R1.1 | Filiation distincte de provenance : 0..1 predecessor exact de même identité/version différente ; branches autorisées, cycles refusés ; provenance métier multiple (merge SubPeriods notamment), aucune fusion concurrente automatique. [PLAN §4.4](./rewrite_r11_plan.md#44-enveloppe-owner-filiation-provenance). Politiques métier merge : R1.3. |
| D-R1-03 | Conforme T04/I19 + précision de séparation ; R1.2/R1.3 uniquement | Registre passif, manifestes explicites, resolver pur sans fallback Current. Validation structurelle distincte des préconditions historiques. Construire candidat complet avant publication logique ; aucun état incomplet publié. [R0 §13](./rewrite_r0_plan.md#13-addendum-normatif-r1-du-2026-10-10). |
| D-R1-04 | Précision R0 §3.1/T05/I02/I03/I07 ; R1.2/R1.3 uniquement | Lifecycle existing/deleted distinct usage Forecast confirmed/suspended ; grille TA complète pour associations structurellement présentes, suspendues incluses. PT deleted conserve PTEC sélectionné aligné AP courant, sans nouvelles cellules TA courantes requises. ever-nonzero sur toutes versions archivées. [R0 §13](./rewrite_r0_plan.md#13-addendum-normatif-r1-du-2026-10-10). |
| D-R1-05 | Conforme T05/T10/T11/T15 + précision preuves ; R1.3 uniquement | Restore sous ID stable avec revue paramètres et aucune réactivation automatique. Nouvelle version AP rebond tous PTEC atomiquement. Confirmation individualisée par TA concerné : refs base, valeur exacte, période candidate ; obligations selon opération, raccourcissement exige reconfirmations R0. [R0 §13](./rewrite_r0_plan.md#13-addendum-normatif-r1-du-2026-10-10). |
| A-R1-01 | AMENDEMENT NORMATIF NOUVEAU T09/I23 ; R1.2/R1.3 | Snapshot.knowledgeDate doit aussi être ≥ knowledgeDate explicitement présente de chaque AP sélectionné, inactive/deleted inclus ; through reste borne. Monotonie AP par chaque lien exact de filiation (précision R0), jamais ordre d'archives ni date de capture. Remplace seulement bornes insuffisantes T09/§3.2/I23. [R0 §13](./rewrite_r0_plan.md#13-addendum-normatif-r1-du-2026-10-10). |
| A-R1-02 | AMENDEMENT NORMATIF NOUVEAU AP vide, T13/I23 ; R1.2/R1.3 | AP vide peut déclarer knowledgeDate facultative ; pas de from/through/SubPeriod/TA/couverture/cutoff. S'il déclare connaissance, borne Snapshot A-R1-01 s'applique. Remplace « sans dates » et « sans couverture aucune borne » dans cette seule mesure. [R0 §13](./rewrite_r0_plan.md#13-addendum-normatif-r1-du-2026-10-10). |
| D-R1-06 | Conforme R0 §8 oracle + précision admission ; R1.4 uniquement | Simulation native réelle bornée, manifeste complet toujours validé ; admission selon contributions effectivement démontrées, refus explicite hors périmètre, aucune approximation ; oracle exact 1/3 Actuals + 2/3 ETC = 1 EAC. Snapshot résolu/simulé indépendamment de Current, sélection jamais par date. [R0 §13](./rewrite_r0_plan.md#13-addendum-normatif-r1-du-2026-10-10). |

A-R1-01 et A-R1-02 ne sont **pas** des règles déjà écrites dans R0, ni des
corrections éditoriales. Les lignes historiques T09/T13 et I23 sont conservées
comme origine ; leur portée actuelle est amendée par R0 §13. Dates civiles et
connaissance déclaratives restent distinctes des timestamps techniques.
Justification, emplacements remplacés, impact et lots de validation sont explicites
dans cet addendum. Aucun canon historique n'est modifié rétroactivement.

D-R1-01/02 fixent les fondations R1.1 ; les lexèmes, chemins, types, fonctions et
représentations de son PLAN restent proposés à audit. D-R1-03–06 et A-R1-01/02
sont enregistrés comme cadre global, aucune implémentation anticipée par R1.1.
Prochain événement : audit indépendant ChatGPT du PLAN, puis décision explicite
d'autorisation ou de correction. Aucun GO n'est déduit du cadrage validé.

## Corrections documentaires R1.1 après audit indépendant

Audit ChatGPT du SHA `06d98971bf5e3ddb717e6ee87d7c295631fd6331`, reçu le
2026-10-10 : cadrage, architecture, frontières, A-R1-01/02 et stratégie de reprise
validés ; quatre corrections bornées demandées. [PLAN corrigé](./rewrite_r11_plan.md)
PLANNED / NOT STARTED — PLAN CORRIGÉ À RÉAUDITER ; GO NON ACCORDÉ.
Parsing exact distinct de canonicalisation (zéros initiaux admis), exactitude
BigInt dans les limites physiques du runtime sans garantie de capture d'exhaustion,
validation contextuelle sur seules versions fournies sans résolution des absentes.

**D-R11-01 — décision technique explicite R1.1, fixée par correction utilisateur :**
CivilDate grégorien proleptique, plage 0000-01-01 à 9999-12-31 inclusive,
année 0000 admise ; aucune portée métier particulière, aucun clamp silencieux,
aucune horloge/timezone/DST/Date JavaScript ; extension par évolution contractuelle
explicite uniquement. [Contrat §4.2](./rewrite_r11_plan.md#42-civildate-et-intervalles).
Ce n'est pas une ancienne règle R0 ; aucune décision D-R1-01–06/A-R1-01/02
rouverte. Le prochain événement est exclusivement l'audit différentiel ChatGPT
du nouveau SHA. Aucune implémentation ne commence après le push.
