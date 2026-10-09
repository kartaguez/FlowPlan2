import { decodeCurrentPlanningInputs } from "../backup/planningInputCodec.js";
import { validateHistoricalSnapshot } from "../portfolioSnapshots/capturePortfolioSnapshot.js";
import type { StoredContent } from "./createPlanningRepository.js";
import { PersistenceError } from "./planningRepository.js";
/** A digest proves byte integrity only. Even legacy validationVersion metadata is untrusted. */
export async function validateStoredSnapshotContent(snapshot: StoredContent, current: StoredContent, digest: (text: string) => Promise<string>) {
  try {
    if (await digest(snapshot.text) !== snapshot.digest || await digest(current.text) !== current.digest) throw Error("Stored content checksum mismatch.");
    return validateHistoricalSnapshot(JSON.parse(snapshot.text), decodeCurrentPlanningInputs(JSON.parse(current.text)));
  } catch (cause) {
    throw new PersistenceError("CORRUPT", `Invalid stored snapshot. ${cause instanceof Error ? cause.message : "Validation failed."}`, { cause });
  }
}
