# R1.3 PERF-EDIT — IN REVIEW

## Mesures officielles

| Profil | H ajouté | Scénario | S / H | Préparation médiane ms | Exécution médiane ms | Total médian ms (min–max) | B |
| --- | ---: | --- | --- | ---: | ---: | --- | ---: |
| small dense | 0 | local | 894 / 894 | 0.11 | 103.44 | 103.55 (102.07–107.14) | 1 |
| small dense | 0 | actuals | 894 / 894 | 1.55 | 104.16 | 105.84 (104.84–113.46) | 1 |
| small dense | 0 | boundary | 894 / 894 | 6.12 | 108.98 | 115.14 (113.32–119.39) | 7 |
| small dense | 10 | local | 894 / 904 | 0.11 | 105.87 | 105.98 (105.68–111.55) | 1 |
| small dense | 10 | actuals | 894 / 904 | 1.61 | 106.24 | 107.90 (107.48–116.49) | 1 |
| small dense | 10 | boundary | 894 / 904 | 5.83 | 107.78 | 113.61 (113.53–119.31) | 7 |
| small dense | 100 | local | 894 / 994 | 0.11 | 112.52 | 112.63 (111.71–114.09) | 1 |
| small dense | 100 | actuals | 894 / 994 | 1.66 | 113.76 | 115.42 (115.12–120.65) | 1 |
| small dense | 100 | boundary | 894 / 994 | 6.16 | 114.53 | 120.44 (120.28–122.40) | 7 |
| small dense | 1000 | local | 894 / 1894 | 0.11 | 228.21 | 228.32 (224.14–230.52) | 1 |
| small dense | 1000 | actuals | 894 / 1894 | 1.63 | 230.17 | 231.80 (230.85–243.35) | 1 |
| small dense | 1000 | boundary | 894 / 1894 | 5.82 | 230.84 | 236.55 (231.14–239.43) | 7 |
| medium dense | 0 | local | 55404 / 55404 | 1.89 | 7090.97 | 7092.86 (7086.32–7095.52) | 1 |
| medium dense | 0 | actuals | 55404 / 55404 | 2221.39 | 7158.58 | 9408.46 (9373.82–9442.72) | 1 |
| medium dense | 0 | boundary | 55404 / 55404 | 2989.20 | 7118.80 | 10092.16 (10087.55–10113.68) | 22 |
| medium dense | 1000 | local | 55404 / 56404 | 1.93 | 7218.15 | 7220.07 (7208.55–7226.51) | 1 |
| medium dense | 1000 | actuals | 55404 / 56404 | 2219.35 | 7359.19 | 9578.54 (9536.10–9589.38) | 1 |
| medium dense | 1000 | boundary | 55404 / 56404 | 2994.01 | 7198.07 | 10192.08 (10173.67–10264.60) | 22 |
| medium sparse | 0 | local | 8604 / 8604 | 0.37 | 1131.10 | 1131.51 (1131.07–1145.16) | 1 |
| medium sparse | 0 | actuals | 8604 / 8604 | 51.08 | 1135.57 | 1186.64 (1175.06–1189.67) | 1 |
| medium sparse | 0 | boundary | 8604 / 8604 | 71.42 | 1152.63 | 1224.06 (1212.30–1225.91) | 4 |
| medium sparse | 1000 | local | 8604 / 9604 | 0.37 | 1246.31 | 1246.73 (1244.99–1257.82) | 1 |
| medium sparse | 1000 | actuals | 8604 / 9604 | 51.85 | 1267.38 | 1319.47 (1316.83–1331.83) | 1 |
| medium sparse | 1000 | boundary | 8604 / 9604 | 71.53 | 1267.66 | 1339.19 (1329.70–1339.88) | 4 |

## Instrumentation séparée

| Profil / H ajouté / scénario | E1 | E2 | E3 | E4 versions | E5 candidat | E6 certification | E7 publication |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| small dense / 0 / local | 0.01 | 0.11 | 0.01 | 0.05 | 55.36 | 51.17 | 0.01 |
| small dense / 0 / actuals | 0.04 | 1.62 | 0.01 | 0.04 | 54.18 | 51.35 | 0.01 |
| small dense / 0 / boundary | 0.14 | 5.93 | 0.02 | 0.35 | 55.28 | 51.76 | 0.01 |
| small dense / 1000 / local | 0.01 | 0.12 | 0.01 | 0.05 | 176.98 | 52.09 | 0.01 |
| small dense / 1000 / actuals | 0.05 | 1.65 | 0.01 | 0.04 | 177.86 | 52.22 | 0.01 |
| small dense / 1000 / boundary | 0.16 | 5.95 | 0.03 | 0.36 | 177.64 | 52.17 | 0.01 |
| medium dense / 0 / local | 0.02 | 1.99 | 0.01 | 0.06 | 3498.67 | 3685.69 | 0.01 |
| medium dense / 0 / actuals | 0.06 | 2233.26 | 0.02 | 0.06 | 3479.40 | 3692.14 | 0.01 |
| medium dense / 0 / boundary | 0.53 | 3019.24 | 0.07 | 0.98 | 3537.52 | 3682.08 | 0.01 |
| medium dense / 1000 / local | 0.02 | 1.98 | 0.02 | 0.06 | 3565.81 | 3658.43 | 0.01 |
| medium dense / 1000 / actuals | 0.06 | 2252.57 | 0.02 | 0.05 | 3630.40 | 3637.94 | 0.01 |
| medium dense / 1000 / boundary | 0.54 | 3015.95 | 0.07 | 1.02 | 3627.08 | 3691.92 | 0.01 |
| medium sparse / 0 / local | 0.01 | 0.37 | 0.01 | 0.05 | 516.88 | 610.28 | 0.01 |
| medium sparse / 0 / actuals | 0.05 | 51.00 | 0.01 | 0.04 | 523.51 | 610.13 | 0.01 |
| medium sparse / 0 / boundary | 0.08 | 71.52 | 0.02 | 0.43 | 529.52 | 620.60 | 0.01 |
| medium sparse / 1000 / local | 0.01 | 0.39 | 0.01 | 0.05 | 664.80 | 605.84 | 0.01 |
| medium sparse / 1000 / actuals | 0.05 | 51.40 | 0.01 | 0.04 | 652.73 | 597.57 | 0.01 |
| medium sparse / 1000 / boundary | 0.08 | 71.54 | 0.02 | 0.43 | 662.76 | 609.79 | 0.01 |

## Pentes locales observées — ms par version historique supplémentaire

| Profil / scénario / mode | Intervalle H ajouté | Total | E5 registre | E5 extraction | E6 certification |
| --- | --- | ---: | ---: | ---: | ---: |
| small dense / local / official | 0–10 | 0.24 | — | — | — |
| small dense / local / official | 10–100 | 0.07 | — | — | — |
| small dense / local / official | 100–1000 | 0.13 | — | — | — |
| small dense / actuals / official | 0–10 | 0.21 | — | — | — |
| small dense / actuals / official | 10–100 | 0.08 | — | — | — |
| small dense / actuals / official | 100–1000 | 0.13 | — | — | — |
| small dense / boundary / official | 0–10 | -0.15 | — | — | — |
| small dense / boundary / official | 10–100 | 0.08 | — | — | — |
| small dense / boundary / official | 100–1000 | 0.13 | — | — | — |
| medium dense / local / official | 0–1000 | 0.13 | — | — | — |
| medium dense / actuals / official | 0–1000 | 0.17 | — | — | — |
| medium dense / boundary / official | 0–1000 | 0.10 | — | — | — |
| medium sparse / local / official | 0–1000 | 0.12 | — | — | — |
| medium sparse / actuals / official | 0–1000 | 0.13 | — | — | — |
| medium sparse / boundary / official | 0–1000 | 0.12 | — | — | — |
| small dense / local / instrumented | 0–1000 | 0.12 | 0.1213 | 0.0003 | 0.0009 |
| small dense / actuals / instrumented | 0–1000 | 0.12 | 0.1231 | 0.0003 | 0.0009 |
| small dense / boundary / instrumented | 0–1000 | 0.12 | 0.1217 | 0.0002 | 0.0004 |
| medium dense / local / instrumented | 0–1000 | 0.05 | 0.0740 | -0.0028 | -0.0273 |
| medium dense / actuals / instrumented | 0–1000 | 0.14 | 0.1649 | 0.0020 | -0.0542 |
| medium dense / boundary / instrumented | 0–1000 | 0.11 | 0.0744 | 0.0001 | 0.0098 |
| medium sparse / local / instrumented | 0–1000 | 0.14 | 0.1424 | 0.0013 | -0.0044 |
| medium sparse / actuals / instrumented | 0–1000 | 0.12 | 0.1170 | 0.0001 | -0.0126 |
| medium sparse / boundary / instrumented | 0–1000 | 0.12 | 0.1235 | 0.0003 | -0.0108 |

Données complètes, min/max/SD/MAD, sous-phases E5, CPU, endpoints mémoire, setup et hashes : [summary.json](./summary.json), [results.json](./results.json) et JSONL par processus. Médianes de trois essais mesurés après cold/warmup ; les médianes de segments ne sont pas additives. Pentes = différence des médianes divisée par ΔH, observations locales et non taux universels.
