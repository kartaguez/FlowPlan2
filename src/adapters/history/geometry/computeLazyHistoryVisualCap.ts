import type { HistoryScratch } from "../../../application/history/historyScratch.js";
import { historyQuantity } from "../../../application/history/buildProjectHistoryViewModel.js";
import { compareRationals, rationalToCanonicalString, type Rational } from "../../../domain/model/rational.js";
import { historyCapFromRanks } from "./buildProjectHistoryGeometry.js";
const CHUNK_SIZE = 4096, FAN_IN = 8;
interface Sample { value: Rational; count: number }
function encode(sample: Sample): string { return `${rationalToCanonicalString(sample.value)}|${sample.count}`; }
function decode(text: string): Sample { const [value, count] = text.split("|"); return { value: historyQuantity(value!), count: Number(count) }; }
/** Exact multiplicities, external sort and coalescing: no sampling, at most eight input buffers. */
export async function computeLazyHistoryVisualCap(values: AsyncIterable<Rational | Sample>, scratch: HistoryScratch): Promise<Rational> {
  let count = 0, chunk: Sample[] = [], runs: number[] = [], level = 0;
  const flushInitial = async () => {
    if (!chunk.length) return;
    chunk.sort((a, b) => compareRationals(a.value, b.value));
    const grouped: Sample[] = [];
    for (const sample of chunk) { const previous = grouped.at(-1); if (previous && compareRationals(previous.value, sample.value) === 0) previous.count += sample.count; else grouped.push({ ...sample }); }
    await scratch.put(0, runs.length, 0, grouped.map(encode)); runs.push(1); chunk = [];
  };
  try {
    for await (const input of values) {
      const sample: Sample = "value" in input ? input : { value: input, count: 1 };
      if (sample.value.numerator <= 0n) continue;
      if (!Number.isSafeInteger(sample.count) || sample.count <= 0 || !Number.isSafeInteger(count + sample.count)) throw new TypeError("Invalid visual sample multiplicity.");
      count += sample.count; chunk.push(sample); if (chunk.length === CHUNK_SIZE) await flushInitial();
    }
    await flushInitial();
    while (runs.length > 1) {
      const next: number[] = [];
      for (let start = 0; start < runs.length; start += FAN_IN) {
        const entries = runs.slice(start, start + FAN_IN).map((parts, i) => ({ run: start + i, parts, part: 0, index: 0, chunk: [] as Sample[] }));
        for (const entry of entries) entry.chunk = (await scratch.get(level, entry.run, 0)).map(decode);
        let output: Sample[] = [], part = 0;
        while (true) {
          let selected: typeof entries[number] | undefined;
          for (const entry of entries) if (entry.index < entry.chunk.length && (!selected || compareRationals(entry.chunk[entry.index]!.value, selected.chunk[selected.index]!.value) < 0)) selected = entry;
          if (!selected) break;
          const sample = selected.chunk[selected.index++]!, previous = output.at(-1);
          if (previous && compareRationals(previous.value, sample.value) === 0) previous.count += sample.count; else output.push({ ...sample });
          if (selected.index === selected.chunk.length && selected.part + 1 < selected.parts) { selected.chunk = (await scratch.get(level, selected.run, ++selected.part)).map(decode); selected.index = 0; }
          if (output.length === CHUNK_SIZE) { await scratch.put(level + 1, next.length, part++, output.map(encode)); output = []; }
        }
        if (output.length) await scratch.put(level + 1, next.length, part++, output.map(encode));
        next.push(part); for (const entry of entries) await scratch.removeRun(level, entry.run);
      }
      level++; runs = next;
    }
    let q1: Rational | undefined, q3: Rational | undefined, median: Rational | undefined, max: Rational | undefined, index = 0;
    for (let part = 0; part < (runs[0] ?? 0); part++) for (const text of await scratch.get(level, 0, part)) {
      const sample = decode(text), end = index + sample.count;
      if (Math.ceil(count / 4) - 1 >= index && Math.ceil(count / 4) - 1 < end) q1 = sample.value;
      if (Math.ceil(3 * count / 4) - 1 >= index && Math.ceil(3 * count / 4) - 1 < end) q3 = sample.value;
      if (Math.floor((count - 1) / 2) >= index && Math.floor((count - 1) / 2) < end) median = sample.value;
      max = sample.value; index = end;
    }
    return historyCapFromRanks(count, max, q1, q3, median);
  } finally { await scratch.dispose(); }
}
