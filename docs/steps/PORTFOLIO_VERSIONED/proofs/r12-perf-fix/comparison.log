| Scénario | API | Cold avant → après ms | Médiane avant → après ms | Après min–max / SD / IQR ms | CPU médiane après ms | Heap / RSS après MiB | État après |
|---|---|---:|---:|---:|---:|---:|---|
| small/dense | M1 | 244.2 → 54.7 | 240.0 → 48.9 | 48.3–51.4 / 1.3 / 1.5 | 60.3 | 24.5 / 100.0 | COMPLETED |
| small/dense | M2 | 265.4 → 74.6 | 255.8 → 69.1 | 67.8–70.2 / 1.0 / 1.2 | 82.9 | 38.6 / 116.5 | COMPLETED |
| small/dense | M3 | 275.1 → 81.7 | 266.7 → 73.3 | 73.2–75.9 / 1.3 / 1.4 | 89.6 | 26.3 / 133.5 | COMPLETED |
| small/dense | M4 | 279.2 → 86.7 | 269.0 → 78.9 | 78.7–80.4 / 0.8 / 0.9 | 93.4 | 37.5 / 132.4 | COMPLETED |
| small/dense | M5 | 531.6 → 156.6 | 527.3 → 150.8 | 149.5–151.4 / 0.8 / 0.9 | 180.1 | 21.5 / 137.6 | COMPLETED |
| small/dense | M6 | 525.0 → 148.5 | 523.1 → 145.2 | 144.2–147.2 / 1.3 / 1.5 | 175.8 | 39.2 / 137.1 | COMPLETED |
| small/sparse | M1 | 68.7 → 32.1 | 62.9 → 28.4 | 27.5–29.0 / 0.6 / 0.8 | 38.3 | 11.3 / 96.8 | COMPLETED |
| small/sparse | M2 | 75.4 → 41.1 | 69.0 → 35.5 | 34.8–35.5 / 0.3 / 0.3 | 48.6 | 22.7 / 97.1 | COMPLETED |
| small/sparse | M3 | 78.0 → 42.2 | 73.7 → 37.1 | 36.6–37.3 / 0.3 / 0.3 | 49.6 | 17.1 / 96.1 | COMPLETED |
| small/sparse | M4 | 81.7 → 45.6 | 74.9 → 40.0 | 39.9–40.4 / 0.2 / 0.3 | 54.0 | 15.7 / 96.3 | COMPLETED |
| small/sparse | M5 | 141.7 → 76.5 | 138.0 → 72.9 | 72.4–76.8 / 1.9 / 2.2 | 91.1 | 27.0 / 130.6 | COMPLETED |
| small/sparse | M6 | 138.8 → 72.0 | 133.0 → 69.3 | 68.7–70.2 / 0.6 / 0.7 | 85.3 | 35.2 / 110.7 | COMPLETED |
| small/history | M1 | 64.7 → 31.3 | 61.9 → 27.3 | 26.7–27.8 / 0.4 / 0.5 | 37.9 | 15.6 / 89.7 | COMPLETED |
| small/history | M2 | 72.4 → 38.7 | 66.2 → 34.2 | 33.3–34.5 / 0.5 / 0.6 | 46.0 | 19.8 / 97.4 | COMPLETED |
| small/history | M3 | 75.4 → 41.5 | 68.7 → 37.1 | 36.3–38.1 / 0.7 / 0.9 | 50.7 | 21.9 / 97.2 | COMPLETED |
| small/history | M4 | 78.4 → 49.1 | 75.0 → 39.0 | 38.6–39.0 / 0.2 / 0.2 | 52.8 | 20.7 / 97.1 | COMPLETED |
| small/history | M5 | 136.6 → 72.5 | 133.4 → 69.4 | 69.2–71.6 / 1.1 / 1.2 | 85.3 | 22.5 / 129.3 | COMPLETED |
| small/history | M6 | — → — | — → — | —–— / — / — | — | — / — | NOT_EXECUTED |
| medium/sparse | M1 | 13370.9 → 470.3 | 12582.4 → 441.4 | 440.4–441.6 / 0.5 / 0.6 | 496.6 | 67.0 / 258.2 | COMPLETED |
| medium/sparse | M2 | 14395.6 → 1497.3 | 13700.6 → 1434.1 | 1423.2–1439.9 / 6.9 / 8.3 | 1506.1 | 93.8 / 264.8 | COMPLETED |
| medium/sparse | M3 | 15072.2 → 1872.2 | 14119.4 → 1851.0 | 1847.1–1856.6 / 3.9 / 4.7 | 1940.1 | 97.3 / 268.1 | COMPLETED |
| medium/sparse | M4 | 14866.4 → 2014.6 | 14266.1 → 1987.4 | 1982.6–1989.0 / 2.7 / 3.2 | 2072.5 | 82.0 / 266.3 | COMPLETED |
| medium/sparse | M5 | 28025.0 → 4082.1 | 28113.7 → 4111.7 | 4104.9–4118.9 / 5.7 / 7.0 | 4262.7 | 63.0 / 295.8 | COMPLETED |
| medium/sparse | M6 | 28039.1 → 3937.5 | 28091.0 → 4006.6 | 3997.4–4010.8 / 5.6 / 6.7 | 4148.2 | 90.2 / 297.0 | COMPLETED |
| medium/dense | M1 | — → 2915.3 | >30 s (cold) → 2816.5 | 2800.0–2826.0 / 10.7 / 13.0 | 3176.0 | 332.0 / 498.9 | COMPLETED |
| medium/dense | M2 | — → — | >30 s (cold) → — | —–— / — / — | — | — / — | INTERRUPTED_TIMEOUT (cold) |
| medium/dense | M3 | — → — | >30 s (cold) → — | —–— / — / — | — | — / — | INTERRUPTED_TIMEOUT (cold) |
| medium/dense | M4 | — → — | >30 s (cold) → — | —–— / — / — | — | — / — | INTERRUPTED_TIMEOUT (cold) |
| medium/dense | M5 | — → — | >30 s (adapter-setup) → — | —–— / — / — | — | — / — | INTERRUPTED_TIMEOUT (cold) |
| medium/dense | M6 | — → — | >30 s (adapter-setup) → — | —–— / — / — | — | — / — | INTERRUPTED_TIMEOUT (cold) |
