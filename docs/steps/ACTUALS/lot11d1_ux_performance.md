# 11D.1 UX performance gate — initial observation and candidate

Gate A measured in native isolated Edge 154.0.4258.53 (V8 15.4.11.7),
macOS arm64, 2026-10-09. Initial single cold sample (not a median):
16/100/1000/10000 repeated decimal digits: Domain full render
0/0.1/1.6/281.4 ms; parsing plus quantity construction 0.2/0.5/0.5/0.8 ms.

The 10k render cost warrants protection before adoption. Proposed exact
Application formatter: extract factors 2/5 using squared powers and descending
division, scale the numerator to denominator 10^k with BigInt, then place the
comma in the complete integer string. Other prime factors retain the canonical
fraction. Alternative unchanged Domain rendering costs one division per digit;
worker/CPU refusal would change architectural scope and is not adopted.
No Domain/command/storage change, numeric Number conversion, precision refusal,
rounding or truncation. Counters/indexes only represent string lengths.

Acceptance remains pending measured browser comparison, exact Domain oracle and
round-trip tests, multi-Team/dirty/rebase/frappe/frame/heap observations. If
blocking remains uncontrolled, stop the affected work for arbitration.

## Executed final gate — PASS within measured samples

[Final browser data](./lot11d1_ux_browser.json), reproducible after build with
`node scripts/browser-raf-final-test.mjs`. One warm-up, seven iterations and
median per operation, isolated native Edge 154 / V8 15.4.11.7, macOS arm64.
`performance.now()` resolution is about 0.1 ms; zero means below resolution.

| digits | parse ms | Domain render ms | exact cold render ms | cold 40 fields ms | dirty ms | changed rebase ms | typing ms |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 16 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.10 | 0.00 |
| 100 | 0.00 | 0.00 | 0.00 | 0.10 | 0.00 | 0.10 | 0.00 |
| 1000 | 0.10 | 1.10 | 0.00 | 1.60 | 0.00 | 1.90 | 0.10 |
| 10000 | 0.40 | 360.50 | 0.70 | 29.00 | 0.30 | 14.10 | 0.30 |

At 10k digits: finite compact `1/2^10000` renders in 0.2 ms, non-finite
`1/(3*2^10000)` in 0.1 ms, forty mixed contributions sum/render in 0.3 ms;
ten distinct prime denominators across forty contributions: 0.5 ms.
Warm forty-field render: 0.1 ms. Changed rebase preserves a local edit on Team 0
while revising remote Team 39 repeatedly; unchanged rebase is measured separately.
The 40-Team draft probe reuses a validated long quantity; cold rendering bypasses
its weak cache. It is a synthetic store/DOM stress sample, not 40 full app cards.

The first changed-rebase probe cost 297.1 ms. Final protections: one formatted
string per immutable Domain quantity in a WeakMap; initial draft projection per
immutable model in a WeakMap; one reading per live cell field; operation-local
canonical readings, seeded solely from validated opening/recent values. Merged
rows keep their exact readings. No global raw-text cache or second draft owner.
Parsing is lexical-first, catches allocation failures and keeps non-applicable raw
text visible. No reformatting at input; finite outputs are complete, otherwise
canonical fractions. Domain oracle/round-trip and all proof/rebase tests pass.

Mounted persistent application, two Project cards: actual 10000-digit RAF input 1.00 ms, next-frame delay 9.60 ms, Apply until persisted authority read 39.10 ms. Full input/output length 10002; one confirmed commit, zero snapshots.

CDP main-context heap before/after: 471876 / 37427316 bytes; delta 36955440 bytes (35.24 MiB). No forced GC or peak/RSS measurement; repeated Domain-oracle rendering allocates temporary buffers. This delta does not establish retained growth or a memory ceiling.

No uncontrolled blocking remained in these measured samples after protections.
Gate A is accepted, with E repeating it on the final build. No precision limit,
rounding, truncation, quantity Number conversion, worker, Domain/engine/storage
change or architectural arbitration was introduced. BigInt, native strings,
heap and CPU remain finite resources; unmeasured sizes/hardware can cost more.
Neither the samples nor timings promise unlimited precision throughput. Physical
mobile/assistive-reader performance and resource exhaustion were not measured.
