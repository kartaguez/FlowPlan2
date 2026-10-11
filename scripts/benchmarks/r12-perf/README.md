# R1.2-PERF (diagnostic only)

These scripts import the real R1.2 modules compiled by the existing TypeScript
configuration into `.test-dist-v2`. No production source, contract, dependency or
package script is changed. Run from the repository root with Node >=24 and the
existing dependencies installed.

This dedicated benchmark tree stays outside the application tooling guard rooted
at `scripts/v2`, without changing that guard. Initial evidence records the former
`scripts/v2/perf` location; relocation keeps the same depth and production imports.

```sh
npm run test:v2
node scripts/benchmarks/r12-perf/verify.mjs
node scripts/benchmarks/r12-perf/run.mjs --scenarios=small:dense,small:sparse,small:history --output=docs/steps/PORTFOLIO_VERSIONED/proofs/r12-perf/small.json
node scripts/benchmarks/r12-perf/run.mjs --scenarios=medium:sparse,medium:dense --output=docs/steps/PORTFOLIO_VERSIONED/proofs/r12-perf/medium.json
node scripts/benchmarks/r12-perf/summarize.mjs docs/steps/PORTFOLIO_VERSIONED/proofs/r12-perf/summary.json docs/steps/PORTFOLIO_VERSIONED/proofs/r12-perf/small.json docs/steps/PORTFOLIO_VERSIONED/proofs/r12-perf/medium.json
```

Default: seed 1202, one first call, one warm-up, three measured calls, 30 seconds
per fixture/setup/API phase, one child per scenario/API, 1024 MiB old-space limit.
Fixture generation, imports, compilation and memory adapter construction are
outside API timing. Setup duration is recorded separately. M1 registry; M2
resolver; M3 graph validation; M4 Snapshot certification from unknown; M5
Snapshot load; M6 Current load. History intentionally has no Current.

`--operations=M1,M3,M5`, `--repeats=1`, `--timeout-ms=30000`, `--heap-mib=1024`
and `--output=...` customize a run. `--profile` captures the first measured API
call using Node's Inspector CPU sampler (1 ms target); profiling runs must be
kept separate from unprofiled timings. Use `profile-summary.mjs output.json
profile.cpuprofile ...` for self/inclusive sampling attribution.

The large fixture is implemented (300 Projects, 40 Teams, 36 SubPeriods per
Project and Reservation). It is never automatically launched. An exploratory
invocation requires `--scenarios=large:sparse` or `large:dense` **and** explicit
`--allow-large`, in a separate campaign after inspecting medium results. The
delivered campaign deliberately does not run it after medium degradation.
Ctrl-C/TERM terminates the active child and writes accumulated results. The
deadline lives in the parent, so synchronous production loops cannot block it;
timeout sends TERM then KILL after one second. An interruption is never PASS.

Memory: forced GC before each API, snapshots immediately after execution,
after GC with result retained, and after releasing result and GC. Heap deltas
are approximate net changes, not cumulative allocations or a true heap peak.
Dropping the local result reference does not guarantee that V8 has released
temporary references from `await`; these deltas are not exclusive graph sizes.
Endpoint observed maxima are lower bounds. Node's process maxRSS is a lifetime
high-water mark, including fixtures/setup. Optional external RSS polling every
250 ms is best effort; sandbox denial is recorded and does not abort a run.
No completed API memory/CPU values are fabricated for timeout phases.

`verify.mjs` checks deterministic fixture hashes/counts, real certification,
missing-cell rejection and independent historical Snapshot reading. It is
explicitly separate from the existing test runner and G12 gates.

See the [diagnostic report](../../../docs/steps/PORTFOLIO_VERSIONED/rewrite_r12_perf.md)
for environment, exact counts, measured results, limitations and decision.
