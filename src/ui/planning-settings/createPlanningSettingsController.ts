import type {
  PlanningSettingsViewModel,
  UpdatePlanningSettingsCommand,
} from "../../application/index.js";
import type { DomainError } from "../../domain/index.js";
import type { PlanningSettingsControls } from "../renderApp.js";
import { parsePlanningSettingsCommand } from "./parsePlanningSettingsCommand.js";

const WEEKDAYS = Object.freeze(["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]);

export interface PlanningSettingsController {
  readonly setModel: (model: PlanningSettingsViewModel) => void;
  readonly showStartupError: () => void;
  readonly destroy: () => void;
}

export function createPlanningSettingsController(input: {
  readonly trigger: HTMLButtonElement;
  readonly controls: PlanningSettingsControls;
  readonly initialModel: PlanningSettingsViewModel;
  readonly onApply: (
    command: UpdatePlanningSettingsCommand,
  ) => Readonly<{ ok: true }> | Readonly<{ ok: false; errors: readonly DomainError[] }>;
  readonly onImport?: (document: string) => "imported" | "cancelled" | "failed";
  readonly onExport?: () => string;
}): PlanningSettingsController {
  let model = input.initialModel;
  let startDate: HTMLInputElement;
  let endDate: HTMLInputElement;
  let weekdays: readonly HTMLInputElement[];
  let maxParallel: HTMLInputElement;

  const showErrors = (errors: readonly DomainError[]): void => {
    input.controls.error.textContent = errors.map((item) => item.path ? `${item.path}: ${item.message}` : item.message).join(" ");
    input.controls.error.hidden = false;
  };
  const clearError = (): void => {
    input.controls.error.textContent = "";
    input.controls.error.hidden = true;
  };
  const hydrate = (): void => {
    const document = input.controls.fields.ownerDocument;
    input.controls.fields.replaceChildren();
    startDate = labeledInput(document, input.controls.fields, "Start date", "date", "planning.startDate");
    endDate = labeledInput(document, input.controls.fields, "End date", "date", "planning.endDate");
    startDate.value = model.startDate;
    endDate.value = model.endDate;
    const weekdayGroup = document.createElement("fieldset");
    weekdayGroup.className = "planning-working-weekdays";
    const legend = document.createElement("legend");
    legend.textContent = "Working days";
    weekdayGroup.append(legend);
    weekdays = Object.freeze(WEEKDAYS.map((day, index) => {
      const label = document.createElement("label");
      label.textContent = day;
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.name = `planning.workingWeekdays.${index + 1}`;
      checkbox.checked = model.workingWeekdays.includes((index + 1) as 1 | 2 | 3 | 4 | 5 | 6 | 7);
      label.append(checkbox);
      weekdayGroup.append(label);
      return checkbox;
    }));
    input.controls.fields.append(weekdayGroup);
    maxParallel = labeledInput(document, input.controls.fields, "Max parallel projects", "number", "planning.maxParallelProjects");
    maxParallel.min = "1";
    maxParallel.step = "1";
    maxParallel.value = String(model.maxParallelProjects);
  };
  const open = (): void => {
    hydrate();
    clearError();
    input.controls.container.hidden = false;
  };
  const cancel = (): void => {
    input.controls.container.hidden = true;
    clearError();
  };
  const submit = (event: SubmitEvent): void => {
    event.preventDefault();
    const parsed = parsePlanningSettingsCommand({
      startDate: startDate.value,
      endDate: endDate.value,
      workingWeekdays: Object.freeze(weekdays.flatMap((field, index) => field.checked ? [index + 1] : [])),
      maxParallelProjects: maxParallel.value,
    });
    if (!parsed.ok) return showErrors(parsed.errors);
    const result = input.onApply(parsed.command);
    if (!result.ok) return showErrors(result.errors);
    clearError();
    input.controls.container.hidden = true;
  };
  const startImport = (): void => { input.controls.fileInput.value = ""; input.controls.fileInput.click(); };
  const importFile = async (): Promise<void> => {
    const file = input.controls.fileInput.files?.[0];
    if (!file || !input.onImport) return;
    try {
      const result = input.onImport(await file.text());
      if (result === "failed") showErrors([{ code: "IMPORT_FAILED", path: "", message: "Import failed." }]);
    } catch {
      showErrors([{ code: "IMPORT_FAILED", path: "", message: "Import failed." }]);
    }
  };
  const exportFile = (): void => {
    try {
      if (!input.onExport) throw new Error("Export unavailable.");
      const document = input.controls.fields.ownerDocument;
      const blob = new Blob([input.onExport()], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      try {
        const link = document.createElement("a");
        link.href = url;
        link.download = `flowplan-${new Date().toISOString().slice(0, 10)}.json`;
        link.click();
      } finally { URL.revokeObjectURL(url); }
    } catch {
      showErrors([{ code: "EXPORT_FAILED", path: "", message: "Export failed." }]);
    }
  };

  input.trigger.addEventListener("click", open);
  input.controls.cancel.addEventListener("click", cancel);
  input.controls.form.addEventListener("submit", submit);
  input.controls.importButton?.addEventListener("click", startImport);
  input.controls.fileInput?.addEventListener("change", importFile);
  input.controls.exportButton?.addEventListener("click", exportFile);
  hydrate();
  return Object.freeze({
    setModel: (next: PlanningSettingsViewModel) => { model = next; if (!input.controls.container.hidden) hydrate(); },
    showStartupError: () => { open(); showErrors([{ code: "INVALID_LOCAL_BACKUP", path: "", message: "Saved planning data is invalid. Demo loaded; the saved data was preserved." }]); },
    destroy: () => {
      input.trigger.removeEventListener("click", open);
      input.controls.cancel.removeEventListener("click", cancel);
      input.controls.form.removeEventListener("submit", submit);
      input.controls.importButton?.removeEventListener("click", startImport);
      input.controls.fileInput?.removeEventListener("change", importFile);
      input.controls.exportButton?.removeEventListener("click", exportFile);
    },
  });
}

function labeledInput(document: Document, parent: HTMLElement, labelText: string, type: string, name: string): HTMLInputElement {
  const label = document.createElement("label");
  label.textContent = labelText;
  const field = document.createElement("input");
  field.type = type;
  field.name = name;
  label.append(field);
  parent.append(label);
  return field;
}
