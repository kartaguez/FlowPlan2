import { comparePortfolioSnapshots, type PortfolioSnapshot } from "../../domain/portfolioSnapshots/portfolioSnapshot.js";
import type { PortfolioSnapshotControls } from "../renderApp.js";

export function createPortfolioSnapshotsController(input: {
  controls: PortfolioSnapshotControls;
  isDirty: () => boolean;
  getSnapshots: () => readonly PortfolioSnapshot[];
  save: () => Readonly<{ ok: boolean; errors?: readonly { message: string }[] }>;
  remove: (id: string) => Readonly<{ ok: boolean; errors?: readonly { message: string }[] }>;
  confirm: (message: string) => boolean;
}) {
  const { controls } = input;
  const refreshDirty = () => {
    controls.save.disabled = input.isDirty();
    controls.reason.textContent = controls.save.disabled ? "Apply or cancel all unapplied changes before saving." : "";
  };
  const showResult = (result: ReturnType<typeof input.save>, success: string) => {
    controls.status.textContent = result.ok ? success : result.errors?.map((e) => e.message).join(" ") ?? "Snapshot could not be saved.";
  };
  const renderList = () => {
    const document = controls.list.ownerDocument;
    controls.list.replaceChildren();
    for (const snapshot of [...input.getSnapshots()].sort(comparePortfolioSnapshots)) {
      const row = document.createElement("li");
      const time = document.createElement("time");
      time.dateTime = snapshot.createdAt;
      time.title = snapshot.snapshotId;
      time.textContent = new Intl.DateTimeFormat(undefined, { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", fractionalSecondDigits: 3 }).format(new Date(snapshot.createdAt));
      const remove = document.createElement("button");
      remove.type = "button"; remove.textContent = "Delete";
      remove.setAttribute("aria-label", `Delete snapshot ${time.textContent} (${snapshot.snapshotId})`);
      remove.addEventListener("click", () => {
        if (!input.confirm(`Delete portfolio snapshot ${time.textContent}?`)) return;
        const result = input.remove(snapshot.snapshotId);
        showResult(result, "Snapshot deleted.");
        if (result.ok) { renderList(); controls.count.focus(); }
      });
      row.append(time, remove); controls.list.append(row);
    }
    controls.count.textContent = `Portfolio snapshots (${input.getSnapshots().length})`;
    refreshDirty();
  };
  const save = () => {
    refreshDirty();
    if (input.isDirty()) { controls.status.textContent = "Apply or cancel all unapplied changes before saving."; return; }
    const result = input.save(); showResult(result, "Portfolio snapshot saved.");
    if (result.ok) renderList();
  };
  controls.save.addEventListener("click", save);
  renderList();
  return { refresh: renderList, refreshDirty, destroy: () => controls.save.removeEventListener("click", save) };
}
