import type { CreateTeamCommand } from "../../application/index.js";
import type { DomainError } from "../../domain/index.js";
import type { TeamCreateControls } from "../renderApp.js";
import { parseCreateTeamCommand } from "./parseCreateTeamCommand.js";

export interface TeamCreateController {
  readonly open: () => void;
  readonly requestClose: () => boolean;
  readonly isOpen: () => boolean;
  readonly destroy: () => void;
}

interface PeriodRow {
  readonly fieldset: HTMLFieldSetElement;
  readonly legend: HTMLLegendElement;
  readonly start: HTMLInputElement;
  readonly end: HTMLInputElement;
  readonly capacity: HTMLInputElement;
  readonly unavailability: HTMLInputElement;
  readonly remove: HTMLButtonElement;
}

export function createTeamCreateController(input: {
  readonly controls: TeamCreateControls;
  readonly onCreate: (command: CreateTeamCommand) =>
    Readonly<{ ok: true }> | Readonly<{ ok: false; errors: readonly DomainError[] }>;
  readonly confirmDiscard: (message: string) => boolean;
  readonly onClose?: () => void;
}): TeamCreateController {
  const { controls } = input;
  const document = controls.form.ownerDocument;
  let rows: PeriodRow[] = [];
  const clearErrors = (): void => { controls.error.textContent = ""; controls.error.hidden = true; };
  const showErrors = (errors: readonly DomainError[]): void => {
    controls.error.textContent = errors.map((entry) => `${entry.path}: ${entry.message}`).join(" ");
    controls.error.hidden = false;
  };
  const addRow = (): void => {
    const fieldset = document.createElement("fieldset");
    fieldset.className = "timeline-team-edit-period";
    const legend = document.createElement("legend");
    legend.textContent = `Capacity period ${rows.length + 1}`;
    fieldset.append(legend);
    const field = (label: string, type: string): HTMLInputElement => {
      const wrapper = document.createElement("label");
      wrapper.textContent = label;
      const element = document.createElement("input");
      element.type = type;
      wrapper.append(element);
      fieldset.append(wrapper);
      return element;
    };
    const start = field("Start date", "date");
    const end = field("End date", "date");
    const capacity = field("Capacity", "text");
    const unavailability = field("Unavailability %", "text");
    const actions = document.createElement("div");
    actions.className = "team-create-period-actions";
    const remove = document.createElement("button");
    remove.type = "button";
    remove.textContent = "Remove period";
    actions.append(remove);
    fieldset.append(actions);
    const row = { fieldset, legend, start, end, capacity, unavailability, remove };
    remove.addEventListener("click", () => {
      if (rows.length <= 1) return;
      rows = rows.filter((candidate) => candidate !== row);
      controls.periodFields.replaceChildren(...rows.map((candidate) => candidate.fieldset));
      rows.forEach((candidate, index) => {
        candidate.legend.textContent = `Capacity period ${index + 1}`;
        candidate.remove.disabled = rows.length <= 1;
      });
      clearErrors();
    });
    rows.push(row);
    controls.periodFields.append(fieldset);
    for (const candidate of rows) candidate.remove.disabled = rows.length <= 1;
  };
  const reset = (): void => {
    controls.name.value = "";
    rows = [];
    controls.periodFields.replaceChildren();
    addRow();
    clearErrors();
  };
  const isDirty = (): boolean => controls.name.value !== "" || rows.length > 1 ||
    rows.some((row) => row.start.value !== "" || row.end.value !== "" ||
      row.capacity.value !== "" || row.unavailability.value !== "");
  const close = (): void => {
    controls.container.hidden = true;
    reset();
    input.onClose?.();
  };
  const requestClose = (): boolean => {
    if (controls.container.hidden) return true;
    if (isDirty() && !input.confirmDiscard("Discard unapplied Create Team changes?")) return false;
    close();
    return true;
  };
  const onCancel = (): void => { requestClose(); };
  const onAdd = (): void => { addRow(); clearErrors(); };
  const onSubmit = (event: SubmitEvent): void => {
    event.preventDefault();
    const parsed = parseCreateTeamCommand({ name: controls.name.value,
      capacityPeriods: rows.map((row, index) => ({ index, startDate: row.start.value,
        endDate: row.end.value, capacity: row.capacity.value, capacityExact: "",
        capacityDirty: true, unavailabilityPercent: row.unavailability.value,
        unavailabilityExact: "", unavailabilityDirty: true })) });
    if (!parsed.ok) return showErrors(parsed.errors);
    const result = input.onCreate(parsed.command);
    if (!result.ok) return showErrors(result.errors);
    close();
  };
  controls.addPeriod.addEventListener("click", onAdd);
  controls.cancel.addEventListener("click", onCancel);
  controls.form.addEventListener("submit", onSubmit);
  reset();
  return Object.freeze({
    open: () => { reset(); controls.container.hidden = false; controls.name.focus(); },
    requestClose,
    isOpen: () => !controls.container.hidden,
    destroy: () => {
      controls.addPeriod.removeEventListener("click", onAdd);
      controls.cancel.removeEventListener("click", onCancel);
      controls.form.removeEventListener("submit", onSubmit);
    },
  });
}
