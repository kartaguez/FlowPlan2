import { decodeFlowplanBackup } from "./flowplanBackupV8.js";
import { InvalidFlowplanBackup } from "./planningInputCodec.js";
/** Retains the source text, but never parses all Portfolio payloads into one object graph. */
export function portableBackupParts(text: string) {
  const stack: { kind: "object" | "array"; path: readonly string[]; key?: string }[] = [];
  let start = -1, end = -1, dataKeys = 0, snapshotKeys = 0;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') {
      const from = i; let escaped = false;
      for (i++; i < text.length; i++) { if (escaped) { escaped = false; continue; } if (text[i] === "\\") { escaped = true; continue; } if (text[i] === '"') break; }
      if (i >= text.length) throw new InvalidFlowplanBackup("Unterminated JSON string.");
      let next = i + 1; while (/\s/.test(text[next] ?? "") && next < text.length) next++;
      const top = stack.at(-1);
      if (top?.kind === "object" && text[next] === ":") {
        top.key = JSON.parse(text.slice(from, i + 1)) as string;
        if (top.path.length === 0 && top.key === "data" && ++dataKeys > 1) throw new InvalidFlowplanBackup("Duplicate data field is ambiguous; original data was preserved.");
        if (top.path.length === 1 && top.path[0] === "data" && top.key === "portfolioSnapshots" && ++snapshotKeys > 1) throw new InvalidFlowplanBackup("Duplicate portfolioSnapshots field is ambiguous; original data was preserved.");
      }
      continue;
    }
    if (ch === "{" || ch === "[") {
      const parent = stack.at(-1), path = parent ? [...parent.path, ...(parent.key ? [parent.key] : [])] : [];
      if (ch === "[" && path.length === 2 && path[0] === "data" && path[1] === "portfolioSnapshots") start = i;
      stack.push({ kind: ch === "{" ? "object" : "array", path });
    } else if (ch === "}" || ch === "]") {
      const popped = stack.pop();
      if (!popped || popped.kind !== (ch === "}" ? "object" : "array")) throw new InvalidFlowplanBackup("Mismatched JSON container.");
      if (popped.kind === "array" && popped.path.length === 2 && popped.path[0] === "data" && popped.path[1] === "portfolioSnapshots") { end = i; }
    } else if (ch === ",") { const top = stack.at(-1); if (top) delete top.key; }
  }
  if (start < 0) return { current: decodeFlowplanBackup(text), version: (JSON.parse(text) as { version: number }).version, snapshots: function* (): Iterable<unknown> {} };
  if (end < 0) throw new InvalidFlowplanBackup("Unterminated Portfolio snapshot array.");
  const header = text.slice(0, start) + "[]" + text.slice(end + 1), current = decodeFlowplanBackup(header);
  const version = (JSON.parse(header) as { version: number }).version;
  function* snapshots(): Iterable<unknown> {
    let depth = 0, string = false, escaped = false, from = start + 1, afterComma = false;
    for (let i = from; i <= end; i++) {
      const ch = text[i];
      if (string) { if (escaped) escaped = false; else if (ch === "\\") escaped = true; else if (ch === '"') string = false; continue; }
      if (ch === '"') string = true;
      else if (ch === "{" || ch === "[") depth++;
      else if ((ch === "," && depth === 0) || i === end) {
        const value = text.slice(from, i).trim();
        if (!value && (i !== end || afterComma)) throw new InvalidFlowplanBackup("Missing Portfolio snapshot or trailing comma.");
        if (value) { try { yield JSON.parse(value); } catch { throw new InvalidFlowplanBackup("Invalid Portfolio snapshot JSON."); } }
        from = i + 1; afterComma = ch === ",";
      } else if (ch === "}" || ch === "]") depth--;
    }
  }
  return { current, version, snapshots };
}
