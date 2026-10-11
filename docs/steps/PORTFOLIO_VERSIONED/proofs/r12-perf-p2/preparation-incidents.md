# Incidents de préparation

Avant toute modification de production : le premier harness étendu conservait toutes les réponses encodées puis sérialisait le tableau global. Node a terminé avec code 134, `Reached heap limit Allocation failed - JavaScript heap out of memory` (heap proche de 4,5 Gio, dans JsonStringify). Aucun oracle étendu issu de cette tentative ne sert de référence. Les 941 cas historiques avaient terminé séparément, hashes identiques aux preuves P1.

Correction du seul transport de preuve : réponses complètes écrites une par une comme membres gzip JSONL, hashes canoniques calculés progressivement, comparaison structurelle par ligne. Les cas, appels publics et encodeur typé restent conservés. Le freeze réussi et ses métadonnées font foi. La limite old-space 1 Gio demeure inchangée pour les benchmarks ; cet incident concerne le harness de preuve, pas le pipeline mesuré.

Lecture initiale sysctl CPU refusée par sandbox ; indisponibilité consignée, environnement CPU/RAM obtenu par les outils Node des campagnes. Aucun garde ni outil de benchmark modifié.

La première exécution des 194 tests V2 a obtenu 193 PASS / 1 FAIL : la nouvelle fixture catalogue+grille conservait `ownColor` tout en ajoutant une référence Program, donc la factory retournait légitimement PROGRAM_COLOR_EXCLUSIVITY. Fixture corrigée en posant ownColor=null afin d'atteindre MISSING_CATALOG_REFERENCE ; assertion et production inchangées, nouvelle exécution 194/194 PASS. Journal initial conservé.

Le contrôle final indexé détectait les espaces du diagnostic TAP brut dans tests-initial.log. Journal préservé byte-for-byte en tests-initial.log.gz (SHA256 brut c558b34343e0058281b4a48a2cca63fd57d9b7c5c8043fdb346cca1dd2f1428d), sans modification des réponses ni du diagnostic. Correction documentaire dans un second commit normal avant push.
