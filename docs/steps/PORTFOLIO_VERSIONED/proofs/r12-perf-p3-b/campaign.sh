#!/bin/zsh
set -e
P=/Users/Kartaguez/FlowPlan2/docs/steps/PORTFOLIO_VERSIONED/proofs/r12-perf-p3-b
for label in a1 b; do
  cd /tmp/flowplan-p3b-$label
  node scripts/benchmarks/r12-perf/verify.mjs > "$P/$label-verify.log" 2>&1
  node scripts/benchmarks/r12-perf/run.mjs --scenarios=small:sparse,small:dense,small:history --output="$P/$label-small.json" > "$P/$label-small.log" 2>&1
  node scripts/benchmarks/r12-perf/run.mjs --scenarios=medium:sparse,medium:dense --output="$P/$label-medium.json" > "$P/$label-medium.log" 2>&1
  mkdir -p "$P/$label-profile"
  node scripts/benchmarks/r12-perf/run.mjs --scenarios=medium:sparse,medium:dense --operations=M1,M3,M5 --repeats=1 --profile --output="$P/$label-profile/results.json" > "$P/$label-profile.log" 2>&1
  node scripts/benchmarks/r12-perf/summarize.mjs "$P/$label-summary.json" "$P/$label-small.json" "$P/$label-medium.json" > "$P/$label-summary.md"
  node scripts/benchmarks/r12-perf/profile-summary.mjs "$P/$label-profiles-summary.json" "$P/$label-profile/"*.cpuprofile > "$P/$label-profiles-summary.log"
done
