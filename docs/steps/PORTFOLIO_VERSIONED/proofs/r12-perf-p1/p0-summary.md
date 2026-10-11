| Scenario | API | cold ms | median ms [min–max] | SD ms | heap endpoints MiB | RSS lifetime MiB | status |
|---|---|---:|---:|---:|---:|---:|---|
| small/sparse | M1 | 31.8 | 27.3 [26.9–28.3] | 0.6 | 18.2 | 96.2 | COMPLETED |
| small/sparse | M2 | 38.4 | 34.0 [33.9–35.0] | 0.5 | 22.8 | 97.2 | COMPLETED |
| small/sparse | M3 | 40.8 | 37.7 [37.5–38.6] | 0.5 | 17.2 | 96.4 | COMPLETED |
| small/sparse | M4 | 44.0 | 38.7 [38.4–39.8] | 0.6 | 23.2 | 97.3 | COMPLETED |
| small/sparse | M5 | 74.7 | 71.7 [71.2–74.0] | 1.2 | 20.0 | 129.9 | COMPLETED |
| small/sparse | M6 | 71.0 | 69.9 [68.5–71.1] | 1.1 | 35.3 | 130.1 | COMPLETED |
| small/dense | M1 | 55.0 | 48.6 [48.4–49.9] | 0.7 | 24.5 | 100.0 | COMPLETED |
| small/dense | M2 | 74.0 | 66.5 [65.8–67.1] | 0.5 | 38.6 | 116.3 | COMPLETED |
| small/dense | M3 | 80.5 | 74.2 [73.6–75.6] | 0.9 | 26.3 | 133.7 | COMPLETED |
| small/dense | M4 | 88.1 | 78.3 [78.2–80.1] | 0.9 | 37.6 | 132.7 | COMPLETED |
| small/dense | M5 | 151.1 | 149.6 [149.4–151.4] | 0.9 | 21.4 | 137.3 | COMPLETED |
| small/dense | M6 | 144.8 | 142.6 [142.5–144.3] | 0.8 | 37.4 | 136.9 | COMPLETED |
| small/history | M1 | 31.0 | 26.8 [26.7–28.0] | 0.6 | 15.7 | 89.6 | COMPLETED |
| small/history | M2 | 38.3 | 34.3 [34.3–35.0] | 0.4 | 19.8 | 97.4 | COMPLETED |
| small/history | M3 | 40.5 | 35.8 [35.2–35.9] | 0.3 | 21.9 | 97.5 | COMPLETED |
| small/history | M4 | 49.8 | 38.3 [37.8–38.4] | 0.3 | 12.4 | 96.2 | COMPLETED |
| small/history | M5 | 72.5 | 70.6 [70.1–73.9] | 1.7 | 21.5 | 114.5 | COMPLETED |
| small/history | M6 | — | — | — | — | — | NOT_EXECUTED |
| medium/sparse | M1 | 473.6 | 450.8 [447.3–456.2] | 3.7 | 65.9 | 258.2 | COMPLETED |
| medium/sparse | M2 | 1469.1 | 1440.4 [1419.2–1441.4] | 10.2 | 93.7 | 264.1 | COMPLETED |
| medium/sparse | M3 | 1868.9 | 1850.2 [1844.9–1855.7] | 4.4 | 97.1 | 267.7 | COMPLETED |
| medium/sparse | M4 | 2064.2 | 1997.8 [1988.5–2001.0] | 5.3 | 91.0 | 265.8 | COMPLETED |
| medium/sparse | M5 | 4015.5 | 4078.9 [4063.5–4081.2] | 7.8 | 74.2 | 296.9 | COMPLETED |
| medium/sparse | M6 | 3953.1 | 3970.7 [3951.4–4005.6] | 22.4 | 85.0 | 298.0 | COMPLETED |
| medium/dense | M1 | 2897.8 | 2811.6 [2807.6–2824.0] | 7.0 | 331.7 | 485.7 | COMPLETED |
| medium/dense | M2 | — | — | — | — | — | INTERRUPTED_TIMEOUT (cold ≥30003.0 ms) |
| medium/dense | M3 | — | — | — | — | — | INTERRUPTED_TIMEOUT (cold ≥30003.0 ms) |
| medium/dense | M4 | — | — | — | — | — | INTERRUPTED_TIMEOUT (cold ≥30001.0 ms) |
| medium/dense | M5 | — | — | — | — | — | INTERRUPTED_TIMEOUT (cold ≥30002.0 ms) |
| medium/dense | M6 | — | — | — | — | — | INTERRUPTED_TIMEOUT (cold ≥30002.0 ms) |
