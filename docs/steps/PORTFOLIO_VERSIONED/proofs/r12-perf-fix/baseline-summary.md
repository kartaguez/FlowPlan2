| Scenario | API | cold ms | median ms [min–max] | SD ms | heap endpoints MiB | RSS lifetime MiB | status |
|---|---|---:|---:|---:|---:|---:|---|
| small/dense | M1 | 244.2 | 240.0 [235.6–241.2] | 2.4 | 17.1 | 100.1 | COMPLETED |
| small/dense | M2 | 265.4 | 255.8 [255.1–259.6] | 2.0 | 23.5 | 102.9 | COMPLETED |
| small/dense | M3 | 275.1 | 266.7 [263.3–269.2] | 2.4 | 20.3 | 102.6 | COMPLETED |
| small/dense | M4 | 279.2 | 269.0 [268.7–274.0] | 2.4 | 16.5 | 101.6 | COMPLETED |
| small/dense | M5 | 531.6 | 527.3 [525.4–531.7] | 2.6 | 32.3 | 136.4 | COMPLETED |
| small/dense | M6 | 525.0 | 523.1 [520.4–524.9] | 1.8 | 28.7 | 137.0 | COMPLETED |
| small/sparse | M1 | 68.7 | 62.9 [62.5–63.8] | 0.5 | 20.7 | 97.3 | COMPLETED |
| small/sparse | M2 | 75.4 | 69.0 [69.0–71.0] | 0.9 | 13.5 | 96.2 | COMPLETED |
| small/sparse | M3 | 78.0 | 73.7 [72.6–75.9] | 1.4 | 14.6 | 96.4 | COMPLETED |
| small/sparse | M4 | 81.7 | 74.9 [74.4–75.6] | 0.5 | 16.4 | 96.1 | COMPLETED |
| small/sparse | M5 | 141.7 | 138.0 [137.7–139.1] | 0.6 | 22.1 | 99.3 | COMPLETED |
| small/sparse | M6 | 138.8 | 133.0 [132.9–135.2] | 1.0 | 23.0 | 99.4 | COMPLETED |
| small/history | M1 | 64.7 | 61.9 [61.8–70.6] | 4.1 | 15.1 | 81.1 | COMPLETED |
| small/history | M2 | 72.4 | 66.2 [65.1–66.8] | 0.7 | 15.0 | 96.3 | COMPLETED |
| small/history | M3 | 75.4 | 68.7 [68.6–69.8] | 0.6 | 22.9 | 97.0 | COMPLETED |
| small/history | M4 | 78.4 | 75.0 [72.8–75.6] | 1.2 | 13.7 | 96.1 | COMPLETED |
| small/history | M5 | 136.6 | 133.4 [132.3–134.1] | 0.7 | 23.5 | 98.2 | COMPLETED |
| small/history | M6 | — | — | — | — | — | NOT_EXECUTED |
| medium/sparse | M1 | 13370.9 | 12582.4 [12564.5–12611.0] | 19.1 | 86.8 | 228.7 | COMPLETED |
| medium/sparse | M2 | 14395.6 | 13700.6 [13688.8–13953.0] | 121.9 | 103.9 | 239.3 | COMPLETED |
| medium/sparse | M3 | 15072.2 | 14119.4 [14083.1–14179.5] | 39.7 | 89.6 | 239.5 | COMPLETED |
| medium/sparse | M4 | 14866.4 | 14266.1 [14264.5–14328.1] | 29.6 | 107.5 | 248.9 | COMPLETED |
| medium/sparse | M5 | 28025.0 | 28113.7 [28093.0–28144.3] | 21.1 | 136.4 | 273.5 | COMPLETED |
| medium/sparse | M6 | 28039.1 | 28091.0 [28048.5–28107.0] | 24.7 | 133.1 | 268.4 | COMPLETED |
| medium/dense | M1 | — | — | — | — | — | INTERRUPTED_TIMEOUT (cold ≥30003.0 ms) |
| medium/dense | M2 | — | — | — | — | — | INTERRUPTED_TIMEOUT (cold ≥30002.0 ms) |
| medium/dense | M3 | — | — | — | — | — | INTERRUPTED_TIMEOUT (cold ≥30003.0 ms) |
| medium/dense | M4 | — | — | — | — | — | INTERRUPTED_TIMEOUT (cold ≥30002.0 ms) |
| medium/dense | M5 | — | — | — | — | — | INTERRUPTED_TIMEOUT (adapter-setup ≥30002.0 ms) |
| medium/dense | M6 | — | — | — | — | — | INTERRUPTED_TIMEOUT (adapter-setup ≥30002.0 ms) |
