import type { HistoryProjectionReader } from "../application/history/historyCaptureProjection.js";
import { renderApp } from "../ui/renderApp.js";
import type { TimelineUiCoordinator } from "../ui/timeline/createTimelineUiCoordinator.js";
import { createProjectHistoryCoordinator } from "../ui/history/createProjectHistoryCoordinator.js";
import { createRepositoryHistoryReader } from "../application/history/repositoryHistoryReader.js";
import { createPlanningSession } from "../application/session/planningSession.js";
import { createCivilDate } from "../domain/index.js";
import { PersistenceError, sameToken, type PlanningRepository, type SnapshotMetadata } from "../application/persistence/planningRepository.js";
import { assertLegacyUnchanged, openPlanningRepository, exportRepositoryBackup, importRepositoryBackup } from "../application/persistence/repositoryTransfer.js";
import { openIndexedDbPlanningRepository } from "../infrastructure/persistence/indexedDbRepositoryStorage.js";
import { createIndexedDbHistoryScratch } from "../infrastructure/persistence/indexedDbHistoryScratch.js";
import { PLANNING_BACKUP_KEY } from "../infrastructure/backup/localPlanningBackup.js";
import { createDemoPlanningScenario } from "./demo/createDemoPlanningScenario.js";
import { createRepositoryPlanningDispatcher } from "./planning/createRepositoryPlanningDispatcher.js";
import { buildPlanningSessionProjection } from "./planning/buildPlanningSessionProjection.js";
import { mountPlanningApplication, PLANNING_GEOMETRY_VIEWPORT } from "./mountPlanningApplication.js";

/** Browser composition only. Business layers receive ports and exact Current state. */
export async function createPersistentPlanningApplication(root: HTMLElement, configuration: Readonly<{ databaseName?: string }> = {}): Promise<TimelineUiCoordinator | undefined> {
  const document = root.ownerDocument, window = document.defaultView!;
  const bar = document.createElement("section"); bar.className = "storage-status"; bar.setAttribute("aria-label", "Local planning storage");
  const message = document.createElement("span"); message.setAttribute("role", "status"); bar.append(message); root.before(bar);
  const action = (text: string, click: () => void) => { const button = document.createElement("button"); button.type = "button"; button.textContent = text; button.addEventListener("click", click); bar.append(button); return button; };
  let storageError = false;
  const report = (cause: unknown) => { storageError = true; message.textContent = cause instanceof Error ? cause.message : "Local data unavailable. Existing data was preserved."; };
  const download = (data: Blob | string, name: string) => {
    const blob = typeof data === "string" ? new Blob([data], { type: "application/json" }) : data, url = URL.createObjectURL(blob);
    const link = document.createElement("a"); link.href = url; link.download = name; link.click(); setTimeout(() => URL.revokeObjectURL(url), 0);
  };
  const readLegacy = () => window.localStorage.getItem(PLANNING_BACKUP_KEY);
  let repository: PlanningRepository | undefined, coordinator: TimelineUiCoordinator | undefined;
  let readHistoryProjection: HistoryProjectionReader | undefined;
  let ready = false, pending = 0, legacyNeedsCheck = false;
  const busy = (value: boolean) => { pending += value ? 1 : -1; root.inert = !ready || pending > 0; root.setAttribute("aria-busy", String(pending > 0)); if (pending) { storageError = false; message.textContent = "Saving local planning…"; } else if (ready && !storageError) message.textContent = ""; };
  root.inert = true; message.textContent = "Opening local planning…";
  const channel = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel("flowplan-planning-revisions") : undefined;
  const onStorage = (event: StorageEvent) => { if (event.key === PLANNING_BACKUP_KEY || event.key === null) { legacyNeedsCheck = true; void checkForChanges(); } };
  const onFocus = () => { legacyNeedsCheck = true; void checkForChanges(); };
  let checkForChanges = async () => {};
  window.addEventListener("storage", onStorage); window.addEventListener("focus", onFocus);
  const reload = action("Reload planning", () => {
    if (pending) { message.textContent = "Wait for the current operation before reloading."; return; }
    if (!coordinator?.hasUnappliedChanges() || window.confirm("Reloading will discard your unapplied drafts. Continue?")) window.location.reload();
  }); reload.hidden = true;
  action("Export legacy backup", () => { try { const raw = readLegacy(); if (raw === null) message.textContent = "No legacy backup is present."; else download(raw, "flowplan-legacy-original.json"); } catch (cause) { report(cause); } });
  const keep = action("Keep current local planning", () => {
    void (async () => {
      if (!repository) return;
      const info = await repository.readInfo(); if (!info.token) throw new PersistenceError("INVALID", "No active local planning is available.");
      if (!window.confirm("Keep the IndexedDB planning and leave the legacy backup untouched? Export both sources first if needed.")) return;
      const raw = readLegacy(); await repository.acknowledgeLegacy(await repository.fingerprint(raw), raw, info.token); window.location.reload();
    })().catch(report);
  }); keep.hidden = true;
  action("Export migration source", () => { void (async () => { const raw = await repository?.readLegacySource();
    if (raw) download(raw, "flowplan-migration-original.json"); else message.textContent = "No legacy migration source is archived.";
  })().catch(report); });
  action("Export committed planning", () => {
    if (!repository) return;
    void exportRepositoryBackup(repository).then(chunks => download(new Blob([...chunks], { type: "application/json" }), "flowplan-recovery.json")).catch(report);
  });
  action("Storage usage", () => {
    void (async () => { if (!navigator.storage?.estimate) { message.textContent = "Storage estimates are unavailable in this browser."; return; }
      const info = await navigator.storage.estimate(); const persistent = await navigator.storage.persisted();
      message.textContent = `Estimated local usage ${((info.usage ?? 0) / 1048576).toFixed(1)} MiB / ${((info.quota ?? 0) / 1048576).toFixed(1)} MiB. ${persistent ? "Persistent storage granted." : "Storage may be evicted; keep portable exports."}`;
    })().catch(report);
  });
  action("Request persistent storage", () => {
    void (async () => { message.textContent = navigator.storage?.persist && await navigator.storage.persist() ? "Persistent storage granted. Portable exports are still recommended." : "Persistent storage was not granted. Available space is still limited."; })().catch(report);
  });
  action("Clean unfinished imports", () => { void (async () => {
    if (!repository || pending) return;
    const stages = await repository.listUnfinishedStages();
    if (!stages.length) { message.textContent = "No unfinished import data to clean."; return; }
    if (!window.confirm(`Remove temporary data from ${stages.length} unfinished imports? Active planning, historical captures and original legacy data remain unchanged.`)) return;
    for (const stage of stages) await repository.discardStage(stage); message.textContent = "Temporary import data removed.";
  })().catch(report); });
  const recoveryFile = document.createElement("input"); recoveryFile.type = "file"; recoveryFile.accept = ".json,application/json"; recoveryFile.hidden = true; bar.append(recoveryFile);
  const recoveryImport = action("Import recovery file", () => recoveryFile.click()); recoveryImport.hidden = true;
  recoveryFile.addEventListener("change", () => { void (async () => {
    const file = recoveryFile.files?.[0]; if (!file || !repository) return;
    if (pending) return;
    busy(true);
    try {
      const info = await repository.readInfo(), text = await file.text(), dataset = (await repository.inspectPortableDocument(text)).current;
      preflight(dataset);
      const id = crypto.randomUUID(), stage = await repository.stagePortableDocument(text, id);
      if (!window.confirm("Replace local planning with this fully validated file? Existing legacy data will remain untouched.")) { await repository.discardStage(stage); return; }
      const raw = readLegacy();
      await repository.activateImport(stage, info.token, id, info.token ? undefined : { fingerprint: await repository.fingerprint(raw), document: raw });
      window.location.reload();
    } finally { busy(false); }
  })().catch(report); });
  const preflight = (state: Parameters<typeof buildPlanningSessionProjection>[0]["state"]) => { buildPlanningSessionProjection({ state, geometryViewport: PLANNING_GEOMETRY_VIEWPORT }); };
  try {
    const opened = await openIndexedDbPlanningRepository({ factory: window.indexedDB, ...(configuration.databaseName ? { name: configuration.databaseName } : {}),
      onBlocked: () => report(new PersistenceError("BLOCKED", "Close older tabs to finish the storage upgrade.")),
      onVersionChange: () => { message.textContent = "Local storage was upgraded in another tab. Reload before editing."; reload.hidden = false; },
      onCommit: () => channel?.postMessage({ type: "committed" }),
    });
    repository = opened; readHistoryProjection = opened.readHistoryProjection;
    const repo = opened;
    const current = await openPlanningRepository({ repository: repo, readLegacy, fallback: createDemoPlanningScenario(), preflight,
      confirmRepairs: notes => window.confirm(`The legacy reader requires these normalizations:\n${notes.join("\n")}\nThe original document will be preserved. Continue migration?`) });
    const session = createPlanningSession(current.state, { today: () => { const day = createCivilDate(new Date().toISOString().slice(0, 10)); if (!day.ok) throw new Error("Invalid application clock."); return day.value; } });
    let metadata: readonly SnapshotMetadata[] = [];
    const dispatcher = createRepositoryPlanningDispatcher({ repository: repo, current, session, geometryViewport: PLANNING_GEOMETRY_VIEWPORT,
      hasUnappliedChanges: () => coordinator?.hasUnappliedChanges() ?? true, pending: busy,
      beforeMutation: async () => { if (legacyNeedsCheck) { await assertLegacyUnchanged(repo, readLegacy); legacyNeedsCheck = false; }
        if (!sameToken((await repo.readInfo()).token, dispatcher.getToken())) throw new PersistenceError("CONFLICT", "Another tab changed planning. Your drafts were preserved; export or reload before editing."); },
    });
    checkForChanges = async () => {
      if (pending) return;
      try {
        if (legacyNeedsCheck) { await assertLegacyUnchanged(repo, readLegacy); legacyNeedsCheck = false; }
        if (!sameToken((await repo.readInfo()).token, dispatcher.getToken())) { message.textContent = "Another tab changed planning. Your drafts were preserved; reload explicitly before editing."; reload.hidden = false; }
      } catch (cause) { report(cause); keep.hidden = false; reload.hidden = false; }
    };
    if (channel) channel.onmessage = () => { void checkForChanges(); };
    const refreshMetadata = async () => { const items: SnapshotMetadata[] = []; let after = null;
      do { const page = await repo.listSnapshotMetadata(dispatcher.getToken(), after); items.push(...page.items); after = page.next; } while (after); metadata = Object.freeze(items); };
    await refreshMetadata();
    const history = createRepositoryHistoryReader(repo, dispatcher.getToken, 32 * 1024 * 1024, readHistoryProjection);
    const historyMutation = async (operation: () => ReturnType<typeof dispatcher.savePortfolioSnapshot>) => {
      busy(true); try { const result = await operation(); if (result.ok) await refreshMetadata(); return result; }
      catch (cause) { return { ok: false as const, errors: [{ code: "COMMIT_FAILED", path: "history", message: `History may have committed; reload to verify. ${cause instanceof Error ? cause.message : "Metadata unavailable."}` }] }; }
      finally { busy(false); }
    };
    const importFile = async (file: File): Promise<"imported" | "cancelled" | "failed"> => {
      if (file.size > 512 * 1024 * 1024) { report(new PersistenceError("INVALID", "This file exceeds the current import limit (512 MiB). Existing data was preserved.")); return "failed"; }
      if (pending) return "failed";
      busy(true); const expected = dispatcher.getToken();
      try { await assertLegacyUnchanged(repo, readLegacy); const header = await opened.inspectPortableFile(file); preflight(header.current);
        const id = crypto.randomUUID(), stage = await opened.stagePortableFile(file, id);
        if (!window.confirm("Importing this fully validated file will replace all current planning and history. Continue?")) { await repo.discardStage(stage); return "cancelled"; }
        await repo.activateImport(stage, expected, id); window.location.reload(); return "imported";
      } catch (cause) { report(cause); return "failed"; } finally { busy(false); }
    };
    const mounted = mountPlanningApplication({ elements: renderApp(root), session, state: current.state,
      dispatcher: { ...dispatcher, getSnapshotMetadata: () => metadata,
        savePortfolioSnapshot: () => historyMutation(dispatcher.savePortfolioSnapshot), deletePortfolioSnapshot: id => historyMutation(() => dispatcher.deletePortfolioSnapshot(id)) },
      onExport: async () => new Blob([...(await exportRepositoryBackup(repo))], { type: "application/json" }),
      onImportFile: importFile,
      onImport: async document => { busy(true); try { if (dispatcher.isPending()) throw new PersistenceError("CONFLICT", "Wait for the planning operation before importing."); await assertLegacyUnchanged(repo, readLegacy);
          const result = await importRepositoryBackup({ repository: repo, document, expected: dispatcher.getToken(), operationId: crypto.randomUUID(), preflight,
            confirm: () => window.confirm("Importing this validated file will replace all current planning and history. Continue?") });
          if (result === "imported") window.location.reload(); return result;
        } catch (cause) { report(cause); return "failed"; } finally { busy(false); } },
      createHistory: container => createProjectHistoryCoordinator({ container, reader: history, scratch: () => createIndexedDbHistoryScratch(window.indexedDB) }),
      onMounted: next => { coordinator = next; },
    });
    ready = true; root.inert = false; message.textContent = "";
    return { ...mounted, destroy: () => { mounted.destroy(); history.releaseAll(); repo.close(); channel?.close(); window.removeEventListener("storage", onStorage); window.removeEventListener("focus", onFocus); bar.remove(); } };
  } catch (cause) { report(cause); recoveryImport.hidden = false; keep.hidden = !repository; reload.hidden = false; return undefined; }
}
