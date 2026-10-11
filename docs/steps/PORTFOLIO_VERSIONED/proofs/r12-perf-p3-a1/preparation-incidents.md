# Incidents de préparation

- Le premier fetch sandbox a échoué à ouvrir `.git/FETCH_HEAD`. Relancé avec
  escalade autorisée, réussi ; divergence 0/0, aucune modification concurrente.
- Une tentative de clone a fourni `--shared=never`, option invalide ; aucun clone
  créé. Corrigé en `git clone --no-hardlinks`, sans alternates ni partage de sources.
- Une première tentative de scellement a constaté que le processus oracle était
  encore actif : métadonnées absentes et assertion d'archive incomplète refusée.
  Aucun sceau écrit et aucune production modifiée. Scellement réussi uniquement
  après achèvement réel des 1 254 réponses et comparaison complète aux archives.
- Le shell login des clones émet des diagnostics `compinit` sans effet sur les
  commandes ; les exécutions suivantes utilisent `login: false`.
- Le premier comparateur P3 a chargé toutes les réponses désérialisées en mémoire,
  provoquant un OOM Node à la limite par défaut (~4 Gio). Les trois générateurs
  candidat avaient terminé avec hashes identiques à P2. Correction du transport
  du comparateur en lecture gzip JSONL par flux comme compare.mjs P2 historique ;
  assertions deepEqual complètes, métadonnées et sceau inchangés. Corpus/sorties
  non modifiés, aucune erreur normalisée, aucune divergence de production.
- Première exécution du laboratoire de comptage simultanée aux vérifications
  du clone rollback (hors campagnes officielles, toutes terminées). Compteurs
  valides mais latences/mémoire non utilisées ; sortie conservée en
  ancestor-lab-initial.json. Laboratoire réexécuté seul après fin du rollback,
  résultat définitif ancestor-lab.json ; aucun test/benchmark simultané.
