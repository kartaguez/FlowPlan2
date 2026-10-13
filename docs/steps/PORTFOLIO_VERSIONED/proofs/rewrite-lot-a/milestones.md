# Lot A — journal technique

Baseline validée : `4eb23515478872b22ba8de93a3f9dcaf4cd862f6`.
État global : implémentation en cours ; aucune réception ni clôture.

## A.1 — acquisition Current inconnue

- La collecte exacte R1.2 est partagée avec le nouveau service d'acquisition. La réponse inconnue originale est conservée pour la certification indépendante complète ; le premier essai qui normalisait les doublons a été corrigé avant commit.
- Le service capture Current et sa portée, acquiert les refs sélectionnées exactement, contrôle la stabilité du marqueur après lecture asynchrone, certifie le graphe entier, puis active une génération et un token privés dans la cellule RAM. Une acquisition refusée ne remplace pas la racine. Une requête concurrente terminant tard est refusée.
- Les tests nouveaux couvrent un Current valide avec les 14 kinds, wrapper invalide, getter, réponse exacte incomplète, candidat incohérent, portée étrangère, capture changeante, remplacement à même révision métier et ABA de token. Ils contrôlent aussi l'absence d'installation après refus.
- Les contrats Snapshot et les tests historiques R1.2 restent inchangés. La cellule finale est encore une primitive inactive : l'intégration des commandes et la suppression du propriétaire R1.3 existant appartiennent à A.4.
- Qualification locale : `check:boundaries:v2` succès ; `typecheck:v2` succès ; `test:v2` 287/287 ; `build:v2` succès ; `git diff --check` succès.

Les vérifications de transfert C1, du commit C2 entre prepare/execute et des index R01–R11 restent attachées aux jalons A.2–A.4. Aucun résultat T01–T27 complet ou verdict de performance n'est revendiqué ici.
