import assert from "node:assert/strict";
import { it } from "node:test";
import type { HistoryScratch } from "../../../application/history/historyScratch.js";
import { computeLazyHistoryVisualCap } from "./computeLazyHistoryVisualCap.js";
import { historyCapFromRanks } from "./buildProjectHistoryGeometry.js";
import { compareRationals, createRational, rationalToCanonicalString } from "../../../domain/model/rational.js";
for (const n of [0, 1, 7, 8, 4097, 40000]) it(`external cap matches exact ranks for ${n} samples with bounded buffers`, async () => {
  const chunks = new Map<string, readonly string[]>(); let maximum = 0, disposed = false;
  const scratch: HistoryScratch = {
    put: async (level, run, part, values) => { maximum = Math.max(maximum, values.length); chunks.set(JSON.stringify([level, run, part]), [...values]); },
    get: async (level, run, part) => chunks.get(JSON.stringify([level, run, part])) ?? [],
    removeRun: async (level, run) => { for (const key of chunks.keys()) { const tuple = JSON.parse(key); if (tuple[0] === level && tuple[1] === run) chunks.delete(key); } },
    dispose: async () => { chunks.clear(); disposed = true; },
  };
  const values = Array.from({ length: n }, (_, i) => { const rational = createRational(BigInt(i % 53 + 1), 3n); if (!rational.ok) throw new Error(); return rational.value; });
  async function* source() { yield* values; }
  const actual = await computeLazyHistoryVisualCap(source(), scratch);
  const sorted = [...values].sort(compareRationals);
  const expected = historyCapFromRanks(n, sorted.at(-1), sorted[Math.ceil(n / 4) - 1], sorted[Math.ceil(3 * n / 4) - 1], sorted[Math.floor((n - 1) / 2)]);
  assert.equal(rationalToCanonicalString(actual), rationalToCanonicalString(expected)); assert.ok(maximum <= 4096); assert.equal(disposed, true);
});
it("weighted equal values preserve their exact sample multiplicities", async () => {
  const data = new Map<string, readonly string[]>();
  const scratch: HistoryScratch = {
    put: async (l, r, p, values) => { data.set(JSON.stringify([l, r, p]), values); },
    get: async (l, r, p) => data.get(JSON.stringify([l, r, p])) ?? [],
    removeRun: async () => {}, dispose: async () => { data.clear(); },
  };
  const low = createRational(1n, 3n), high = createRational(100n, 3n); if (!low.ok || !high.ok) throw new Error();
  const lowValue = low.value, highValue = high.value;
  async function* source() { yield { value: lowValue, count: 10000 }; yield { value: highValue, count: 1 }; }
  assert.equal(rationalToCanonicalString(await computeLazyHistoryVisualCap(source(), scratch)), "1/3");
});
