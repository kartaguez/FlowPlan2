# FlowPlan2 V2 — registre durable des décisions

Statut : décisions R0 validées par audit indépendant favorable à
`62bfdb9f36b406a0196ba7ceee45884217c68365`. GO R0.1 reçu après audit du plan
à `1c2b08c727af9fb8002b7678bd7403fcc0d39c27` ; R0.1 DONE après audit indépendant favorable et clôture utilisateur au SHA
`d5bb1a89c847604f2f80aaaa3270e4125f4a3fef`, avec amendement I-R01-C ; R1 — CADRAGE VALIDÉ, R1.1 — DONE après audit final favorable et clôture utilisateur ;
R1.2 — NOT STARTED / PLAN PROPOSED FOR AUDIT ; R1.3, R1.4 et R2–R6 NOT STARTED.
Préparation documentaire R1.2 autorisée uniquement ; aucune implémentation autorisée.
Point d'entrée : [current_plan](../../current_plan.md).
Option B extraction sélective, verticales R1 mémoire/R2 durable, architecture à
six modules, stockage neuf isolé et matrice de reprise sont validés.

**Précédence actuelle (2026-10-11)** : les amendements A-R12-01–09 de la
[section R1.2](#amendements-normatifs-r12--2026-10-11) remplacent les clauses
désignées des tables historiques ci-dessous et de R0 §2/§3/§6/§8/§9/§13.
Les mentions « VALIDÉE » des anciennes lignes décrivent leur adoption initiale,
pas la survie de leurs clauses remplacées. A-R1-01/02 sont entièrement remplacés.
D-R1-01/02 et D-R11-01, primitives livrées R1.1, restent inchangés.

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

Historique du cadrage (statuts de préparation, remplacés par l’état de clôture ci-dessous).
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

## État de livraison R1.1 — DONE, clôture autorisée

PLAN corrigé approuvé à `5950ed079ffa8132742301922765e955d1af9274` ; GO utilisateur explicite
reçu pour P0–P6 uniquement. **R1.1 — DONE** après audit indépendant final
favorable et autorisation utilisateur de clôture documentaire le 2026-10-10.
Baseline d'implémentation validée : `168d9658621aa235bd3fe314cc74cfeebdfb28d0`,
distincte du commit documentaire de clôture. Aucun changement normatif.
[Canon de livraison](./rewrite_r11_canon.md) : interfaces techniques adoptées,
18 gates exécutées, preuves et limites. D-R1-01/02 et D-R11-01 sont implémentés
au niveau des primitives ; aucune décision normative approuvée n'est amendée.
Kinds et matrice d'owners du PLAN conservés, IDs munis de discriminants runtime,
payloads data records/listes/primitives copiés et gelés ; compteurs civils sûrs.
Le contexte ne certifie que filiation/collisions/owners locaux, sans fermeture
métier ni résolution ; provenance multiple distincte. Aucun registre/Current.
R1 reste CADRAGE VALIDÉ ; R1.2–R1.4/R2–R6 NOT STARTED. Prochaine étape :
cadrage indépendant R1.2 avec ChatGPT ; aucun travail R1.2 dans cette session.
Les indications de GO non accordé des sections de préparation restent historiques.


## Amendements normatifs R1.2 — 2026-10-11

Décisions fonctionnelles et architecturales **CONSOLIDÉES PAR INSTRUCTION
UTILISATEUR** du 2026-10-11, enregistrées avant toute implémentation.
Leur adoption ne vaut ni audit ni GO du [PLAN R1.2](./rewrite_r12_plan.md).
**R1.2 — NOT STARTED / PLAN PROPOSED FOR AUDIT** ; R1.3/R1.4/R2 NOT STARTED.
Contrats détaillés applicables : PLAN §3–§7 ; propositions d'encodage/API et
questions ouvertes : §4–§6/§10. Les anciens textes restent traçables ci-dessus,
dans R0 et les plans/canons clôturés, sans réécriture de leur histoire.

| Amendement | Ancien contrat / emplacements remplacés | Nouveau contrat applicable | Portée / justification |
| --- | --- | --- | --- |
| A-R12-01 | T02/T10/T14/I08 ; R0 §2/§3.1/§3.2/§8 ; allusions statut PTEC dans plans/registres | PTEC sans open/completed ; aucune transition complete/reopen. ETC exact ≥0, zéro permis sans statut implicite. | Payload/structure R1.2 ; retrait des commandes correspondantes de la cible R1.3/R4 et du statut de l'UI R5. Complétion moteur demeure dérivée R1.4/R3. T14 migration reste inapplicable sous T12-R. |
| A-R12-02 | T05/I03/I04/I11–I14, D-R1-04 ; R0 §3.1/§3.2/§6/§9/§10 et contre-exemples §9 | Project/Reservation/Team/PT/RT : existing/deleted seuls ; isActive Project/Reservation séparé ; visibilité Team visuelle. confirmed/suspended et ever-nonzero supprimés, avec preuves et index associés. Toute suppression autorisée indépendamment des Actuals historiques. Tombstones sélectionnés. PT deleted sans TA/PTEC ; RT deleted sans TA. Project→tous PT deleted ; Reservation→tous RT deleted ; Team→tous PT/RT deleted, atomiquement. Association existing exige deux extrémités existing ; deleted admet extrémités existing/deleted. | R1.2 valide état final, jamais histoire positive ; cascades/atomicité logique R1.3, durable R2. Zéro demande RT existing valide, dans les deux modes. Aucune redistribution/réaffectation/proratisation ; anciennes versions conservées. Hide ne retire aucune charge. |
| A-R12-03 | T05/T15/I12–I14, D-R1-05 ; R0 §3.2 (Actuals conservés réactivés) | Restore sous mêmes identités ; restauration propriétaire/Team ne restaure aucun PT/RT. Chaque association restaurée explicitement, paramètres revus, grille TA complète confirmée selon partition courante ; PT avec PTEC valide. Aucun ancien Forecast/Actuals réactivé implicitement. | Transitions R1.3 ; R1.2 certifie seulement résultat fourni. Deleted non éditable reste règle de commande T15. Unicité à vie oblige réemploi de l'identité du couple, garantie durable R2. |
| A-R12-04 | T09/T13/I23, A-R1-01/02 intégralement ; R0 §3.1/§3.2/§13 et report R1.1 §11 | Un AP stable par Project ET Reservation sélectionné, deleted inclus. AP vide sans bornes/SubPeriods/TA ; couvert = bornes inclusives et partition complète contiguë. AP couvert avec zéro association existing valide, grille TA vide. AP.knowledgeDate, monotonie et attestations de connaissance supprimées. AP.through reste frontière Actuals. | R1.2 structure, R1.3 corrections ; annule le point ouvert « connaissance connue vers AP vide » du plan R1.1. Aucun changement de CivilDate R1.1. |
| A-R12-05 | T10/I07, D-R1-04/05 ; R0 §3.1/§3.2/§13 (PTEC deleted, ref version AP, rebond total) | PTEC obligatoire seulement PT existing ; aucun sélectionné PT deleted. Payload = identité AP stable, lastActualsDate nullable, ETC exact ≥0. lastActualsDate = AP.through ; AP vide ⇒ les deux null. Nouvelle version AP à through inchangé n'oblige aucun nouveau PTEC. Confirmation sans changement payload ne crée aucune version PTEC. | R1.2 égalité de frontière/owner ; versions sélectives R1.3. Ni ref exacte de version AP dans PTEC, ni rebind systématique. |
| A-R12-06 | T11/I05/I06/I16, D-R1-05 ; R0 §3.2 (preuves, renouvellements TA/PTEC) | Confirmations transitoires liées à préparation exacte. Suppression retirant cellules TA courantes : confirmation globale unique, zéros compris ; suppression Team Portfolio toujours confirmée. Corrections : cellules affectées confirmées, bornes modifiées incluses même quantité identique. ETC précédent zéro : maintien zéro par défaut sans confirmation supplémentaire ; zéro→positif explicitement confirmé ; ETC précédent positif : revue ciblée. Aucun recalcul ETC automatique. | Validation de préparation, conséquences, stale, revue ETC et transitions atomiques R1.3 ; aucun champ de confirmation ni système de preuves historiques R1.2/R2. Pas prorata ; création des seules versions effectivement modifiées. |
| A-R12-07 | T03 ; R0 §2/§3.1/§3.2 et négatif « split/merge sans provenance » §9 | Bornes SubPeriod modifiées : même ID/nouvelle version. Split/merge : nouveaux IDs, provenance métier facultative. Filiation/provenance génériques R1.1 inchangées (forme, doublons, auto-source, branches, owner). | Structure R1.2 ; politiques de correction R1.3. Ne pas exiger source métier pour accepter nouvelle identité. |
| A-R12-08 | T07 ; R0 §2/§3.2/§8, D-R1-05 pour catalogue lors restore | Program/Pas lifecycle autonome ; existing inutilisé valide, aucun auto-tombstone du dernier usage. Project/Reservation existing référence seulement catalogue existing. Suppression explicite catalogue utilisé doit préserver cette cohérence sans cascade automatique des références. | Structure R1.2 ; commande R1.3/R4. Noms existing normalisés uniques par catalogue et absence de fusion d'identités conservées. Mode de commande catalogue utilisé à auditer, aucun algorithme choisi implicitement. |
| A-R12-09 | T04/T09/I19/I23 ; R0 §3.1/§3.2/§6 et racines redondantes éventuelles | Manifeste exact fermé ; racines ProjectId/ReservationId/TeamId dérivées des Settings, aucune liste racine redondante. SnapshotId distinct stable, knowledgeDate déclarative obligatoire ≥max(AP.through) de tous AP sélectionnés (inactive/deleted inclus), AP vides sans borne ; createdAt technique distinct ; même date et recul permis. Snapshot résoluble sans Current ; inputs-only. Current = manifeste opérationnel publié + révision CAS uniquement, aucun historique métier automatique complet ; Snapshots sur Save explicite seulement. | R1.2 résolubilité avec données fournies ; R2 conservation/autonomie durable, CAS/receipts/idempotence/recovery minimaux sans deuxième histoire métier. Registre passif sans latest/date/ordre, versions archivées immuables. |

**Compléments d'architecture et de périmètre remplaçant R0 §5/§8 :**
Domain contient types, invariants, validation pure et résolution structurelle.
Application porte cas d'usage/commandes/transitions et collecte via ports.
Ports abstraits versions/manifests ; adapters mémoire puis stockage/UI/intégrations ;
composition root assemble. Aucune dépendance Domain vers Application, ports
concrets, IndexedDB, UI, moteur ou legacy. `ValidatedPortfolioGraph` ne certifie
que la validité structurelle du graphe sélectionné, jamais la légitimité d'une
transition, une confirmation, une publication CAS ou une histoire exhaustive.
R1.2 : 14 payloads, registre passif, manifestes, resolver et certification/gates.
R1.3 : commandes, suppressions/restaurations composites, versions sélectives,
préparations/confirmations/stale/ETC et atomicité RAM. R1.4 : simulation certifiée,
sans autorité de sélection. R2 : durable/CAS/transactions/recovery/import-export.
R4 généralise les commandes ; aucune commande anticipée dans R1.2.

Autres contradictions découvertes : matrice de réutilisation et risques R0
mentionnent encore protection historique/suspension ; B natifs sans provenance
ou retrait positif interdit ne sont plus négatifs ; R4 complete/reopen et R5
statut PTEC deviennent sans objet. Les tables patrimoniales sont conservées avec
cette correspondance, pas réutilisées comme norme active. Le test A02 R1.1
interdit les noms de futurs graphes : adaptation technique proposée au PLAN §8,
sans modification maintenant ni changement des garanties livrées R1.1.
Le point métier ratio RT + exception sans période reste ouvert pour R3 ; sa
résolution n'est pas requise pour valider une demande RT comme donnée en R1.2.


## Corrections du PLAN R1.2 après audit indépendant

Audit de la baseline documentaire `d16d9fbd004ec9e47ce229fbd44b2bc4c26e703b` :
**PLAN favorable sous corrections B1–B4 ; aucun GO d'implémentation**.
Correction uniquement documentaire, [PLAN corrigé §11](./rewrite_r12_plan.md#11-corrections-après-audit-indépendant).
**R1.2 — NOT STARTED / PLAN PROPOSED FOR AUDIT**, nouvel audit puis GO explicite
requis ; R1.3/R1.4/R2 NOT STARTED. A-R12-01–09 **intégralement inchangés**,
contrats et canons R1.1 conservés. Les précisions ci-dessous fixent/remplacent
les propositions techniques du PLAN audité, sans réviser les décisions métier.

| Correction / portée | Contrat fixé et remplacement de proposition | Référence / gates futures |
| --- | --- | --- |
| B1 — structure vs histoire | Fermeture métier selected obligatoire complète. Validation filiation/provenance selon R1.1 et contexte fourni, liens conservés, not-established jamais promu sans données. Supprime exigence transitive des predecessor/sources pour résoudre/certifier Snapshot ; pas de lecture exhaustive des lignées. Garanties d'intégrité à l'enregistrement maintenues, durable R2. | PLAN §5.1–5.3/§6.5 ; G12-04 longue filiation non chargée et structure absente discriminante, G12-02 contradictions fournies |
| B2 — mapping Settings | EntityId distinct opaque sans égalité artificielle avec owner ProjectId/ReservationId/TeamId. Mapping owner→identité unique par kind dans contexte R1.2 ; versions multiples même identité admises, deux identités même owner refusées. R2 unicité historique durable append/import/recovery. O12-01 fixé. | PLAN §4.1/§5.1/§6.4 ; G12-03/11 |
| B3 — fermeture tombstones | Une Team selected existing/deleted sélectionne exactement une Capacity ; Project/Reservation deleted conserve refs Program/Pas éventuelles. Toute ref catalogue de Settings selected résoluble ; existing owner→catalogue existing, deleted→existing/deleted ; existing unused valide. Aucune cascade catalogue. O12-02 fixé. | PLAN §4.3/§6.1/§6.4 ; G12-05/09 |
| B4 — certificat simplifié | Factory validante unique/type opaque, aucun raccourci de validation ; garantie TS distincte de runtime, casts non garantis ; unknown/désérialisé revalidé à frontière exposée. Pas WeakSet/registre d'autorité supplémentaire. Remplace proposition reconnaissance systématique runtime O12-05 ; détail API ports reste proposé. | PLAN §5.3 ; G12-12, aucune preuve de transition/durabilité |

Encodage mandatory confirmé : booléen obligatoire, true exige objectiveEndDate
civile non nulle ; false accepte date ou null ; aucune mandatoryDeadline séparée,
pas objective≥earliest ni effet automatique sur AP. PLAN §4.2/G12-01.
Aucune implémentation/test/build exécuté ; renvois G12-04/05/11 précisés.
Les autres propositions d'encodage/metadata et détail API ports restent à auditer ;
commandes catalogue utilisé/confirmations/revue ETC R1.3, ratio exception sans
période avant moteur concerné R1.4/R3, defaults avant bootstrap opérationnel.
Arrêt après commit/push documentaire ; aucun début R1.2 sans nouvel audit et GO.
