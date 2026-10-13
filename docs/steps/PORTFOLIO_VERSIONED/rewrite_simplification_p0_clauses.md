# P0 — Matrice normative et traçabilité des clauses R1.1–R1.3

Date : **2026-10-13**. Baseline de lecture :
`c1ae876ef85276ff3c13d236b7617c3410140d10`.
Exécution documentaire autorisée par le GO utilisateur sur le
[plan P0](./rewrite_simplification_p0_plan.md). Cette matrice accompagne
l'[addendum daté](./rewrite_simplification_p0_addendum.md). Elle ne décrit pas
une implémentation de la simplification.

## 1. Lecture et portée des traitements

Les indications de lignes ci-dessous désignent les fichiers **à la baseline**.
Les courts extraits sont littéraux ; le reste de chaque ligne est une synthèse
qui doit être lue avec la section citée. Les sources restent intégralement
consultables. Le traitement normatif prend effet documentairement le
2026-10-13 pour la cible de simplification, suivant l'addendum §1 ; aucun
mécanisme livré n'est réputé modifié à cette date.

- **G — conservée** : garantie métier ou de frontière toujours exigée.
- **T — moyen remplacé dans la cible** : prescription technique limitée à son
  périmètre explicitement cité ; son comportement livré reste un fait historique.
- **N — contrat ajouté** : condition de preuve nécessaire à la cible.
- **H — fait historique conservé** : statut, résultat, limite ou décision datée.

## 2. Matrice des clauses

| ID / Source | Clause actuelle | Garantie métier associée | Traitement P0 | Justification / clause de remplacement |
| --- | --- | --- | --- | --- |
| G01 — [plan R1.1](./rewrite_r11_plan.md) §4.1–4.2 ; [canon R1.1](./rewrite_r11_canon.md) L78–101 | Rational canonique BigInt, Quantity par famille/unité, absent distinct de zéro, CivilDate grégorienne et intervalles inclusifs | Calcul et temporalité exacts, sans float, timezone ni date implicite | G : conservée intégralement | Catalogue C01 ; toute nouvelle valeur est validée par Domain. |
| G02 — plan R1.1 §4.3–4.4 ; canon R1.1 L102–131 | Identité typée, ref exacte kind/EntityId/VersionId, owner immutable, predecessor de même identité, provenance distincte | Version non ambiguë, branches permises, absence de fusion et de base implicite | G : conservée intégralement | Catalogue C01/C02 et addendum §5 ; aucun choix latest/date/insertion. |
| G03 — canon R1.1 L123–143 ; [plan R1.2](./rewrite_r12_plan.md) §5.1 | Copies/gel, égalité structurée, collision divergente et cycles refusés ; « Parent absent signalé » avec not-established | Archives immuables ; aucun rapport contextuel promu sans preuve | G : conservée | Append contrôlé et témoins de contexte ; pas de fermeture transitive des lignées imposée à la lecture. |
| G04 — [décisions](./rewrite_decisions.md) A-R12-01 | PTEC sans open/completed ; ETC exact ≥0, sans complete/reopen | Zéro/positif ne deviennent pas un statut métier | G : conservée | C01-PTEC/C12 ; aucune règle moteur anticipée. |
| G05 — décisions A-R12-02 ; plan R1.2 §6.1 | existing/deleted, activation/visibilité séparées, tombstones ; suppression autorisée malgré Actuals historiques ; cascades Project/PT, Reservation/RT, Team/PT+RT | Suppression sans redistribution, aucune charge cachée par hide, résultat fermé | G : conservée | C09/C10/C11/C12 ; obligations et atomicité R1.3 conservées. |
| G06 — décisions A-R12-03 ; [plan R1.3](./rewrite_r13_plan.md) §12 | Restore réemploie identités, ne restaure aucune association implicitement ; association explicite, paramètres revus et grille courante confirmée | Pas d'undo implicite ni reprise automatique des valeurs historiques | G : conservée | Addendum §5.4 et §7 ; répertoire exact et autorité d'unicité distincts. |
| G07 — décisions A-R12-04 ; plan R1.2 §6.2 | Un AP stable par Project/Reservation, deleted inclus ; empty sans bornes/SP/TA, covered partition complète inclusive contiguë | Frontière Actuals et grille définies, pas de knowledgeDate AP ni monotonie | G : conservée | C06/C07/C11/C15. |
| G08 — décisions A-R12-05 ; plan R1.2 §6.3 | Une PTEC par PT existing, AP identité stable, lastActualsDate=through/null ; through identique sans rebinding | ETC exact, versions sélectives ; aucune version artificielle | G : conservée | C12 et obligations ETC R1.3, distinctes de la certification structurelle. |
| G09 — décisions A-R12-06 ; plan R1.3 §6–9/§13–14 | Confirmations liées à préparation exacte ; retrait global zéros compris, Team toujours confirmée, cellules/bornes affectées, revue ETC positif | Aucune obligation contournée par égalité de quantité ou certification du résultat | G : conservée | Addendum §7 ; réponses liées au handle exact, stale global prioritaire. |
| G10 — décisions A-R12-07 ; plan R1.3 §11–13 | Ajustement SP : même ID ; split/merge : nouveaux IDs ; provenance facultative distincte du predecessor | Pas de prorata, fusion d'identités ni source obligatoire inventée | G : conservée | C02/C07/C11 ; nouvelles cellules selon nouveaux couples, archives retirées conservées. |
| G11 — décisions A-R12-08 ; plan R1.3 §16 | Catalogues autonomes, noms existing uniques par kind ; pas d'auto-tombstone ; suppression utilisée composite explicite | Remplacements exhaustifs, aucune référence existing vers deleted | G : conservée | C08 ; usages inverses complets et Settings deleted laissées conformément à B3 R1.2. |
| G12 — décisions A-R12-09 ; plan R1.2 §4.3/§6.5 | Manifeste fermé, racines dérivées ; Snapshot autonome, knowledgeDate déclarative bornée ; Save explicite, Current manifeste+révision | Historique inputs-only, aucun ancien Current historisé automatiquement | G : conservée | C03/C13/C16 ; métadonnées privées de session ne deviennent pas payload Current. |
| G13 — décisions B1 R1.2 ; plan R1.2 §5.1–5.3/§6.5 | Fermeture métier complète, « ne charge ni n'exige transitivement predecessor ou sources historiques » | Snapshot certifiable sans lignée entière, contradictions fournies refusées | G : conservée | C02/C16 ; résolution des bases explicitement utilisées reste obligatoire. |
| G14 — décisions B2 R1.2 ; plan R1.2 §4.1/§5.1/§6.4 | Settings EntityId distinct de l'owner ; mapping 1:1 par kind sur tout contexte fourni ; plusieurs versions même identité permises | Aucun double Settings/AP/Capacity/PTEC/TA/global/couple pour le même owner métier | G : conservée | C02-MAP/C04/C05/C06/C09/C11/C12 et autorité §5 addendum. |
| G15 — décisions B3 R1.2 ; plan R1.2 §4.3/§6.1/§6.4 | Capacity obligatoire pour Team deleted ; références catalogue de Settings deleted résolubles | Tombstones fermés, capacité/références jamais effacées pour réparer l'état | G : conservée | C05/C08/C10. |
| G16/T04 — décisions B4 R1.2 ; plan R1.2 §5.3 ; [canon R1.2](./rewrite_r12_canon.md) L155–158 | « validation complète à chaque entrée inconnue/désérialisée » ; factory exportée unique, marque TS privée, pas already-valid/WeakSet | Une entrée inconnue ne peut obtenir un certificat par cast, cache ou flag | G : conserver l'API unknown complète ; T : amender uniquement l'exclusivité du chemin de construction pour une succession fiable interne | Addendum §3–4 ajoute la succession après preuve ; aucun raccourci public, aucune seconde autorité de certification. |
| T01/G17 — plan R1.3 §15.1 L502–573 ; [canon R1.3](./rewrite_r13_canon.md) L39–67 ; décisions B2 R1.3/O13-02 | « ensemble H de toutes versions métier publiées » et « createVersionRegistry(H) » ; sans origine exhaustive, « aucune session de commandes, aucune allocation/publication » | Absence historique prouvée avant allocation ; réservations pending/burned non recyclées ; collision refusée | T : remplacer l'exigence universelle d'inventaire/validation des enveloppes H et l'interdiction universelle de session sous autorité partielle ; G : conserver toutes unicités requises et réservations | Addendum §3/§5.1–5.3 : autorité complète par opération/portée, indépendamment des archives ; opérations sans création admissibles sous conditions ; refus de toute création non prouvée. |
| T02 — canon R1.3 L23/§Architecture ; plan R1.3 §15 ; [plan général](./rewrite_r11_r13_simplification_plan.md) §2/§11 | « Analyse pure depuis graphe et H acquis » ; dossier garde la base entière et recherche les bases dans H | Analyse pure et bases historiques déterministes | T : remplacer la transmission générale de H entier à analyseTransition | Addendum §4/§5.4 : fournir courant fiable et seules lectures exactes requises ; aucune omission des obligations. |
| T03/G18 — plan R1.2 §5.1 ; plan R1.3 §7/§15 L491–498 ; canon R1.3 L95–99 | « construire registre candidat H+B avec withVersions » puis extraction S | Append valide, collisions/owners/mappings/filiation contrôlés, archives anciennes inchangées | T : remplacer reconstruction/recopie/revalidation H+B à chaque édition ; G : conserver contrat du registre passif et contrôles d'enregistrement | Addendum §5.5 : append B contre autorité/index attestés et témoins contextuels ; unknown/import reste acquis intégralement. |
| T05/G19 — plan R1.3 §7 L217–220 ; canon R1.3 L95–100 ; décisions §Préparation R1.3 | « Appeler certifyPortfolioGraph » sur l'ensemble sélectionné ; « aucune réutilisation de certificat ancien » | Candidat final intégralement valide avant publication | T : remplacer certification complète systématique du candidat par succession prouvée ; G : conserver absence de publication d'un candidat invalide | Addendum §4 : chaque prédicat inchangé ou évalué sur fermeture complète ; base intégralement certifiée, refus par défaut et repli seulement qualifié. |
| G20 — décisions B1/B3 R1.3 ; plan R1.3 §11.1–12 ; canon R1.3 L134–140 | « nouvelle VersionId obligatoire » pour TA/PTEC historique restauré, « base désignée » exacte ; selected modifié predecessor courant | Aucune resélection historique, aucun latest, owner/couple exact | G : conservée | Addendum §5.4–5.5 ; une base nécessaire indisponible ne peut être remplacée par zéro ou une autre branche. |
| G21/T06 — plan R1.3 §9–10 L271–318 ; canon R1.3 §Contrats publics | Vue unique immutable, stale global, swap synchrone sous exclusive ; seconde liaison de service refusée | Un seul écrivain, pas de vue partielle ni d'Applied stale | G : conserver ; T : remplacer contrat publish/exclusive insuffisant par cellule propriétaire et commit conditionnel | Addendum §6 : génération+révision, point irréversible interne, aucun callback dans fenêtre de commit. |
| G22 — plan R1.3 §11.1 L387–395 ; canon R1.3 L60–67 | Ledger distinct de Current, « candidat non publié » absent du registre publié | Refus sans mutation du métier publié malgré IDs brûlés | G : conservée ; contrat N03 précise coordination réservations/commit | Addendum §5.3/§6 : ledger technique monotone séparé ; append visible seulement au swap du tuple publié. |
| G23 — décisions §Compléments d'architecture R1.2 ; plan R1.2 §3 ; canons R1.2/R1.3 §Architecture | Domain pur, Application orchestre, ports abstraits, adapters sans autorité de certification ; UI absente | Hexagone et source unique des règles | G : conservée | Matrice des responsabilités et addendum §8. |
| N01 — plan général §3.1/§3.2, C2 | Courant fiable, génération privée, delta typé, deux preuves par invariant | Validité préservée par récurrence et invalidation des capacités périmées | N : formaliser | Addendum §3–4 ; catalogue champs/relations/exhaustivité. |
| N02 — plan général §5, C1 | Autorité d'identités distincte du répertoire ; « ref absente du cache » ne signifie pas identité libre | Collision historique détectée sans scan H, lecture exacte autonome | N : formaliser | Addendum §5A/B ; indisponibilité distincte d'absence. |
| N03 — plan général §6 | Garde dès avant allocation et commit propriétaire non réentrant ; pas d'échec retourné après swap | Publication linéarisable et réservations non intercalées | N : formaliser | Addendum §6 ; vérifications futures A/B explicites, non exécutées en P0. |
| N04 — plan général §9, C3 | « fermeture non démontrable ⇒ refus par défaut » ; repli complet cas nommé, données et tests | Pas de bascule silencieuse ni d'oracle prétendant couvrir passé absent | N : formaliser | Addendum §4.5 : aucune exception de repli qualifiée par P0. |
| H01 — [current_plan](../../current_plan.md) et [current_canon](../../current_canon.md) L3–23 ; canons R1.1/R1.2 clôtures | R1.1/R1.2 DONE, R1.3 IN REVIEW ; R1.4/R2 non commencés, chiffres et réserves datés | Traçabilité des livraisons, limites et décisions | H : conservation intégrale | Les résumés d'admission complète/certification réelle décrivent l'implémentation en revue ; ils ne sont pas la spécification de la cible P0. Aucun statut changé. |
| H02 — décisions O13-05/B4 ; plan R1.3 §18.1/§19/§25 ; canon R1.3 §PERF-EDIT | Coût H/S/B mesuré, registre conservateur inchangé ; modification architecturale exige plan/audit/GO | Aucun gain ni SLA présumé ; pas d'optimisation sans qualification | H/G : conserver mesures et obligation de qualification ; ce GO porte seulement sur la documentation P0 | Les choix techniques futurs sont décrits, sans code, prototype, mesure nouvelle ni réactivation P3-C. |

## 3. Correspondance avec les décisions historiques

Les neuf A-R12 et les quatre corrections B1–B4 **R1.2** restent toutes
applicables. L'amendement de B4 R1.2 porte exclusivement sur le chemin interne
de succession T04, et conserve sa frontière unknown et ses limites de certificat.
**B1 et B3 R1.3** restent intégralement applicables. **B2 R1.3** change ses
moyens T01–T02, jamais l'obligation d'unicité ni de conservation du ledger.
**B4 R1.3** conserve sa gate de mesure ; ses mentions de certification complète
systématique et de registre conservateur sont replacées dans leur état livré,
et le nouvel objet à qualifier sera celui décrit par l'addendum. La présente
livraison n'accorde aucun verdict de performance.

Les clauses D-R1-03/04/05 antérieures sont lues avec les remplacements A-R12
déjà décidés : candidat cohérent, suppression/restauration explicites, aucune
nouvelle règle de protection historique, suspension ou complete/reopen. Ce
document n'annule aucune clôture et ne requalifie aucun résultat d'audit.

## 4. Vérification documentaire de la matrice

Toutes les sources nommées par le plan P0 sont représentées ; les cinq moyens
techniques B2/H entier/withVersions/certification du candidat/publication ont
leur ligne T01–T06, leur garantie conservée et une clause de remplacement.
Les lignes N01–N04 indiquent les obligations nouvelles. Les lignes H01–H02
maintiennent les décisions datées accessibles. Les fichiers cités sont conservés
à leur contenu de baseline ; l'addendum est le seul texte de remplacement daté.
