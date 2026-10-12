# R1.3 PERF-EDIT — dégradation observée, qualification non favorable — IN REVIEW

Deux verdicts distincts : conformité fonctionnelle vérifiée par les gates R1.3 ;
**PERF-EDIT non favorable pour l'interaction mesurée sur Medium**, avec réserve
explicite. Les plusieurs secondes observées sur Current chargé ne démontrent
pas la réactivité critique demandée. Aucun SLA arbitraire et aucune requalification
LOAD. Audit indépendant et décision utilisateur restent requis ; pas DONE.

## Protocole réel et traçabilité

Campagne finale : **42 processus isolés séquentiels**, 24 officiels et 18
instrumentés, tous exit 0. Chaque processus : Current natif chargé/certifié,
source/inventaire/ledger complets ; cold, warmup puis **trois essais mesurés**.
Total principal 210 commandes Applied, aucun NoOp substitué. Bibliothèques
R1.2 et VersionRegistry inchangés, certification réelle complète sur chaque
candidat. Les commandes sont toujours effectives depuis une cellule fraîche
sur la même vue acquise immutable ; aucun cumul H accidentel entre répétitions.

[Tables complètes et pentes](./tables.md), [brut et environnement](./results.json),
[dispersion SD/MAD/min/max et sous-phases](./summary.json), JSONL nommés par cas.
Source compilée session SHA-256 dans results.json ; fixture seed 1202 et hashes
par cas, hash du graphe S contrôlé identique à toutes profondeurs d'un profil.
Les compteurs B et leur répartition par kind sont identiques à H variable.

Node v24.21.0, macOS arm64, CPU/mémoire détaillés dans results.json. Old-space
1024 Mio ; deadline parent 30 s par groupe setup/préparation/exécution : limite
de laboratoire, pas SLA. Génération/import/compilation, création registre/store,
admission/certification initiale et initialisation de session exclus du timing.
Le setup est rapporté, y compris **trialSetupMs** par cellule/session. Construction
des réponses exclue (harnessAnswers rapporté) ; execute les acquiert/revalide.
Pas d'attente humaine, simulation, moteur, planning, UI, stockage ou persistance.

Small dense 10 Projects / 5 Teams / 12 SP par propriétaire ; Medium dense
100 / 20 / 24 ; Medium sparse témoin 100 / 20 / 24 avec deux PT par Project.
Reservations du générateur R1.2 inchangé, mêmes capacités/catalogues/seed.
H ajouté : Small 0/10/100/1000 ; Medium 0/1000. Les profondeurs intermédiaires
Medium ne sont pas exécutées : points d'extrémité croisés et expérience Small
intermédiaire, aucune interpolation présentée comme mesure.

H synthétique : versions Settings d'une branche non sélectionnée, enregistrables
et inventoriées explicitement. S reste exactement la même sélection (y compris
payloads, refs, contexte du certificat et partition). Ce laboratoire ne prétend
pas rejouer un historique utilisateur ni prouver une origine durable ; l'admission
RAM porte sur tout ce jeu natif annoncé.

Instrumentation séparée sur une copie de session.js, créée uniquement dans
.test-dist-v2 : E1 préparation hors règles ; E2 règles/validation réponses ;
E3 binding/stale/orchestration ; E4 allocation/factories finales ; E5 registre,
manifeste/mappings, extraction ; E6 vraie certification ; E7 vue/swap/terminaison.
Horloge seulement dans harness/copie instrumentée, jamais Domain/production.
Segments disjoints, sous-phases E5 détaillées. Les médianes de segments ne sont
pas additives ; le total extérieur officiel fait autorité.

## Résultats principaux

Médianes en ms, min–max des trois essais entre parenthèses :

| Profil / H ajouté | EDIT-local | EDIT-actuals | Frontière Actuals | B local / actuals / frontière |
| --- | --- | --- | --- | --- |
| Small dense / 0 | 103,55 (102,07–107,14) | 105,84 (104,84–113,46) | 115,14 (113,32–119,39) | 1 / 1 / 7 |
| Small dense / 1000 | 228,32 (224,14–230,52) | 231,80 (230,85–243,35) | 236,55 (231,14–239,43) | 1 / 1 / 7 |
| Medium dense / 0 | 7092,86 (7086,32–7095,52) | 9408,46 (9373,82–9442,72) | 10092,16 (10087,55–10113,68) | 1 / 1 / 22 |
| Medium dense / 1000 | 7220,07 (7208,55–7226,51) | 9578,54 (9536,10–9589,38) | 10192,08 (10173,67–10264,60) | 1 / 1 / 22 |
| Medium sparse / 0 | 1131,51 (1131,07–1145,16) | 1186,64 (1175,06–1189,67) | 1224,06 (1212,30–1225,91) | 1 / 1 / 4 |
| Medium sparse / 1000 | 1246,73 (1244,99–1257,82) | 1319,47 (1316,83–1331,83) | 1339,19 (1329,70–1339,88) | 1 / 1 / 4 |

EDIT-local : une Settings. EDIT-actuals : une TA, ETC positif explicitement keep,
aucune PTEC. Variante frontière : une SP, une AP, PTEC de chacun des PT du Project
(5/20/2 selon profil) ; TA constantes confirmées, **aucune TA réécrite**. Le batch
massif n'est jamais présenté comme une correction TA minuscule.

S : Small **894**, Medium dense **55404**, Medium sparse **8604**. À H non
sélectionné nul, croissance Small→dense : S ×61,97 ; total local ×68,5, actuals
×88,9 environ. C'est une comparaison de ces profils, pas une loi universelle.

## Attribution et pente historique — B4

Sur Medium dense / H ajouté 0, instrumentation médiane :

- Local : préparation ~2 ms ; E4 ~0,06 ms ; E5 **3498,67 ms**, E6 **3685,69 ms**, E7 ~0,01 ms.
- Actuals : E2 **2233,26 ms**, E5 **3479,40 ms**, E6 **3692,14 ms** ; une TA créée.
- Frontière : E2 **3019,24 ms**, E4 ~0,98 ms, E5 **3537,52 ms**, E6 **3682,08 ms** ; B=22.

La préparation Actuals ajoute un hotspot de parcours/recherches et acquisitions
comparatives des owners sur S ; ce constat est distinct du coût historique.
Sur Small H ajouté 0→1000 : E5 ~55→177 ms, E6 ~51→52 ms. Pente instrumentée
E5 registre ≈ **0,121–0,123 ms/version historique** ; extraction ≈0,0002–0,0003,
certification ≈0,0004–0,0009. Les essais officiels locaux montrent +124,77 ms,
intervalles disjoints : dégradation historique nettement supérieure à la dispersion.
Les points Small intermédiaires montrent des pentes locales variables ; aucune
pente constante imposée, aucun gain déduit d'un delta négatif dans la dispersion.

Medium dense officiel local : +127,21 ms pour 1000 versions supplémentaires,
actuals +170,08 ms, frontière +99,92 ms. Les sous-phases séparent le registre de
l'extraction et de la certification ; les fluctuations E6 à S constant ne prouvent
aucun effet historique causal sur cette certification. Détails bruts/SD/MAD dans
summary.json. Conserver les deux campagnes au lieu de substituer des timings
instrumentés aux officiels.

**Contrôle de profondeur à volume constant**, six processus supplémentaires,
30 Applied : même S/H/B, 1000 versions soit en chaîne de profondeur 1000 soit en
1000 branches sœurs de profondeur 1. [Comparaison](./breadth-summary.json) et
JSONL suffixés breadth. Small officiel : local **228,32→167,10 ms**, actuals
**231,80→168,93 ms**, frontière **236,55→174,28 ms**. Le surcoût historique ne
se résume donc pas au volume ; la forme de filiation contribue sur ce témoin.
L'instrumentation supplémentaire distingue registre/extraction/certification,
sans transformer cette observation Small en résultat Medium non exécuté.

## CPU, setup et mémoire

Deux profils CPU isolés supplémentaires Medium dense / H ajouté 0, local/actuals,
exit 0, cinq commandes chacun. [Synthèse](./cpu/summary.json), profils bruts
compressés .cpuprofile.gz et JSONL sous cpu/. **Exclus des latences officielles**.
Sampling inclut setup et cinq commandes ; descendants execute classés séparément.
Local : ~12,89 s échantillonnées sous withVersions, ~17,40 s certification sur
l'ensemble des cinq appels ; actuals ~12,83 / 17,13 s, ~10,95 s analyse Domain.
Frames self et inclusifs ne s'additionnent pas et ne deviennent pas des temps
exclusifs précis. Copies/inspection/validation dominent les chemins enregistrés.

Un hotspot de setup est visible : comparaison structurée des vues initiales dans
createTransitionSession, acquisitions puis equalImmutableValues sur grosses
listes. **Non masqué** : setup initial local observé par processus ~161,85 ms Small,
~10029,91 ms Medium dense ; initialisation supplémentaire de session par essai
médiane **47,69 ms / 19097,44 ms** respectivement. Le profil local classe ~106,13 s
dans setup/other (startup, admission et cinq initialisations). Ces coûts sont
exclus d'EDIT conformément au protocole Current/session déjà chargés, sans être
présentés comme gratuits ni comme requalification PERF-LOAD.

Endpoints local : Small H0 heap max observée 62,68 Mio, RSS lifetime max 222,92 Mio ;
Small H1000 105,31 / 275,45 ; Medium dense H0 709,47 / 950,81 ; H1000 674,84 /
951,02. Autres cas et CPU processus dans results.json. **Endpoint ≠ pic exclusif**,
maxRSS lifetime inclut setup, valeurs sensibles à GC ; pas de mémoire retenue
universelle ou budget intégré déduit de ces chiffres.

## Limites, écarts expérimentaux et options non implémentées

- Trois échantillons par cas : dispersion réelle, mais pas intervalle de confiance universel ni enquête multi-machines. Instrumentation/profiler perturbent leurs propres campagnes.
- H synthétique et S contrôlé ; histoire de commandes cumulées non mesurée. Aucune acquisition durable, simulation, rendu ou réactivité browser qualifiés.
- Medium : profondeurs 0/1000 ; profondeur vs volume distingués séparément sur Small seulement. Contrôle complet d'ordre inverse non exécuté ; témoins supplémentaires et campagnes séparées conservés, sans nier toute dérive machine.
- **Large NOT EXECUTED** : 300/40/36 conditionnel ; Medium demande déjà ~7–10 s et ~951 Mio RSS lifetime sous budget old-space 1 Gio. Une campagne plus grande n'est pas raisonnable dans ce laboratoire sans qualification des ressources. Aucun résultat Large inventé.
- Séries préliminaires arrêtées avant gel final, anciennes deadlines globales et premières gates concurrentes : dossiers perf-initial/pre-freeze/before-cell-binding/before-answer-binding conservés, exclus des verdicts finaux.

**Réserve explicite** : EDIT critique n'est pas favorable sur Medium. Les gains
ou bypass ne sont pas implémentés pour rendre le rapport artificiellement vert.
Options à proposer dans un **plan distinct puis audit et GO** : analyser les
comparaisons/acquisitions du setup, les recherches locales de l'analyse Actuals,
et les copies/contrôles du candidat H+B ; étudier une représentation permettant
l'enregistrement historique sans reconstruire systématiquement tout H, avec
oracles différentiels et toutes garanties d'intégrité/immutabilité ; caractériser
la certification complète à S variable et la mémoire transitoire. Aucun cache
trusted, seconde autorité, abandon de certification, moteur incrémental, append
spéculatif ou reprise P3-C. VersionRegistry reste byte-identique à la baseline.

G13-14 : **mesurée et documentée avec réserve/non favorable**, jamais PASS de
performance. R1.3 **IN REVIEW** pour audit indépendant ; acceptabilité/correctif
à arbitrer ensuite, aucune clôture automatique ni GO futur implicite.
