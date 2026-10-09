import { projectHistoryCapture, type HistoryReadRequest } from "../../application/history/historyCaptureProjection.js";
import type { RepositoryToken } from "../../application/persistence/planningRepository.js";
import { encodePlanningInputs } from "../../application/backup/planningInputCodec.js";
import { portableBackupParts } from "../../application/backup/portableBackupParts.js";
import { legacyRepairs } from "../../application/persistence/repositoryTransfer.js";
import { createPlanningRepository } from "../../application/persistence/createPlanningRepository.js";
import { validateStoredSnapshotContent } from "../../application/persistence/validateStoredSnapshot.js";
import { openIndexedDbRepositoryStorage } from "./indexedDbRepositoryStorage.js";
import { sha256 } from "./fingerprint.js";
interface Content { text: string; digest: string; validationVersion?: 1 }
type Request = { id: number } & (
  { type: "snapshot"; snapshot: Content; current: Content } |
  { type: "header"; document: string | Blob } |
  { type: "stage"; document: string | Blob; stageId: string; database: string } |
  { type: "history"; database: string; snapshotId: string; token: RepositoryToken; view: HistoryReadRequest });
const scope = globalThis as unknown as { onmessage: ((event: MessageEvent<Request>) => void) | null; postMessage(value: unknown): void };
scope.onmessage = event => {
  const request = event.data;
  void (async () => {
    try {
      let value: unknown;
      if (request.type === "snapshot") {
        const { snapshot, current } = request;
        value = await validateStoredSnapshotContent(snapshot, current, sha256);
      } else if (request.type === "header") {
        const text = typeof request.document === "string" ? request.document : await request.document.text();
        const current = portableBackupParts(text).current;
        value = { current: encodePlanningInputs(current), repairs: legacyRepairs(text, current) };
      } else {
        const backend = await openIndexedDbRepositoryStorage({ factory: indexedDB, name: request.database });
        try { const repository = createPlanningRepository(backend, sha256, (snapshot, current) => validateStoredSnapshotContent(snapshot, current, sha256));
          value = request.type === "stage" ? await repository.stagePortableDocument(typeof request.document === "string" ? request.document : await request.document.text(), request.stageId) : projectHistoryCapture(await repository.readSnapshot(request.snapshotId, request.token), request.view);
        }
        finally { backend.close(); }
      }
      scope.postMessage({ id: request.id, value });
    } catch (cause) { scope.postMessage({ id: request.id, error: cause instanceof Error ? cause.message : "Invalid stored data.", code: typeof (cause as { code?: unknown })?.code === "string" ? (cause as { code: string }).code : request.type === "snapshot" ? "CORRUPT" : "INVALID" }); }
  })();
};
