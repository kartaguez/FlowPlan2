| Scenario | API | cold ms | median ms [min–max] | SD ms | heap endpoints MiB | RSS lifetime MiB | status |
|---|---|---:|---:|---:|---:|---:|---|
| small/dense | M1 | 240.7 | 233.9 [233.1–246.5] | 6.1 | 17.4 | 100.0 | COMPLETED |
| small/dense | M2 | 261.2 | 252.3 [252.0–252.8] | 0.3 | 23.5 | 102.6 | COMPLETED |
| small/dense | M3 | 268.2 | 260.5 [259.0–261.2] | 0.9 | 20.1 | 103.1 | COMPLETED |
| small/dense | M4 | 275.6 | 271.0 [270.4–273.0] | 1.1 | 17.0 | 101.3 | COMPLETED |
| small/dense | M5 | 519.9 | 520.2 [516.8–521.7] | 2.0 | 32.3 | 136.3 | COMPLETED |
| small/dense | M6 | 519.2 | 523.1 [517.0–526.3] | 3.9 | 33.2 | 136.4 | COMPLETED |
| small/sparse | M1 | 68.2 | 61.8 [61.5–62.5] | 0.4 | 12.8 | 81.1 | COMPLETED |
| small/sparse | M2 | 76.0 | 70.8 [69.1–71.4] | 1.0 | 13.4 | 96.3 | COMPLETED |
| small/sparse | M3 | 78.4 | 72.3 [71.9–76.2] | 2.0 | 14.6 | 96.3 | COMPLETED |
| small/sparse | M4 | 80.3 | 74.7 [74.3–75.3] | 0.4 | 16.4 | 96.4 | COMPLETED |
| small/sparse | M5 | 142.7 | 138.2 [137.6–139.5] | 0.8 | 22.1 | 99.0 | COMPLETED |
| small/sparse | M6 | 138.6 | 132.3 [132.2–133.9] | 0.8 | 22.9 | 98.7 | COMPLETED |
| small/history | M1 | 67.5 | 60.4 [59.9–61.8] | 0.8 | 15.0 | 81.1 | COMPLETED |
| small/history | M2 | 72.0 | 66.2 [65.5–66.5] | 0.5 | 14.9 | 96.4 | COMPLETED |
| small/history | M3 | 74.5 | 69.4 [67.6–73.4] | 2.4 | 22.9 | 98.0 | COMPLETED |
| small/history | M4 | 77.0 | 72.5 [71.4–75.0] | 1.5 | 13.7 | 95.8 | COMPLETED |
| small/history | M5 | 139.9 | 131.1 [131.0–131.9] | 0.4 | 23.7 | 98.5 | COMPLETED |
| small/history | M6 | — | — | — | — | — | NOT_EXECUTED |
| medium/sparse | M1 | 13251.8 | 12604.1 [12598.0–12609.6] | 4.7 | 55.2 | 235.2 | COMPLETED |
| medium/sparse | M2 | 14280.2 | 13550.3 [13530.5–13601.3] | 29.8 | 104.3 | 239.3 | COMPLETED |
| medium/sparse | M3 | 14722.2 | 14035.9 [14012.5–14038.4] | 11.7 | 89.7 | 239.2 | COMPLETED |
| medium/sparse | M4 | 14874.3 | 14206.6 [14197.9–14251.9] | 23.7 | 107.5 | 248.3 | COMPLETED |
| medium/sparse | M5 | 28179.4 | 28179.2 [28175.7–28207.4] | 14.2 | 136.5 | 271.8 | COMPLETED |
| medium/sparse | M6 | 28005.3 | 27981.4 [27966.1–28028.6] | 26.6 | 132.6 | 272.9 | COMPLETED |
| medium/dense | M1 | — | — | — | — | — | INTERRUPTED_TIMEOUT (cold ≥30002.0 ms) |
| medium/dense | M2 | — | — | — | — | — | INTERRUPTED_TIMEOUT (cold ≥30003.0 ms) |
| medium/dense | M3 | — | — | — | — | — | INTERRUPTED_TIMEOUT (cold ≥30002.0 ms) |
| medium/dense | M4 | — | — | — | — | — | INTERRUPTED_TIMEOUT (cold ≥30002.0 ms) |
| medium/dense | M5 | — | — | — | — | — | INTERRUPTED_TIMEOUT (adapter-setup ≥30002.0 ms) |
| medium/dense | M6 | — | — | — | — | — | INTERRUPTED_TIMEOUT (adapter-setup ≥30003.0 ms) |
