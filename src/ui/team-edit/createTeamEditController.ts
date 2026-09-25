import type {
  TeamEditViewModel,
  UpdateTeamCapacityPeriodsCommand,
  UpdateTeamNameCommand,
} from "../../application/index.js";
import type { DomainError, TeamId } from "../../domain/index.js";
import type { TeamEditControls } from "../renderApp.js";
import {
  parseTeamEditCommand,
  type TeamEditFormValues,
} from "./parseTeamEditCommand.js";

export type TeamEditApplyResult =
  | Readonly<{ ok: true }>
  | Readonly<{ ok: false; errors: readonly DomainError[] }>;

export interface TeamEditController {
  readonly setTeam: (team: TeamEditViewModel | undefined) => void;
  readonly getTeamId: () => TeamId | undefined;
  readonly requestClose: () => boolean;
  readonly hasUnappliedChanges: () => boolean;
  readonly destroy: () => void;
}

export interface CreateTeamEditControllerInput {
  readonly controls: TeamEditControls;
  readonly errorContainer: HTMLElement;
  readonly onApplyName: (command: UpdateTeamNameCommand) => TeamEditApplyResult;
  readonly onApplyPeriods: (
    command: UpdateTeamCapacityPeriodsCommand,
  ) => TeamEditApplyResult;
  readonly onClose?: () => void;
  readonly confirmDiscard?: (message: string) => boolean;
  readonly onDelete?: (teamId: TeamId) =>
    | Readonly<{ ok: true }>
    | Readonly<{ ok: false; reason: "draft"; message: string }>
    | Readonly<{ ok: false; reason: "application"; errors: readonly DomainError[] }>;
}

interface PeriodInputs {
  readonly key: number;
  readonly referenceIndex?: number;
  readonly fieldset: HTMLElement;
  readonly startDate: HTMLInputElement;
  readonly endDate: HTMLInputElement;
  readonly capacity: HTMLInputElement;
  readonly capacityDisplay: string;
  readonly capacityExact: string;
  readonly unavailabilityPercent: HTMLInputElement;
  readonly unavailabilityDisplay: string;
  readonly unavailabilityExact: string;
}

export function createTeamEditController(
  input: CreateTeamEditControllerInput,
): TeamEditController {
  let model: TeamEditViewModel | undefined;
  let nameInput: HTMLInputElement | undefined;
  let periodInputs: readonly PeriodInputs[] = Object.freeze([]);
  let nextRowKey = 0;

  const clearError = (): void => {
    input.errorContainer.textContent = "";
    input.errorContainer.hidden = true;
  };
  const showErrors = (errors: readonly DomainError[]): void => {
    input.errorContainer.textContent = errors
      .map((entry) => `${entry.path}: ${entry.message}`)
      .join(" ");
    input.errorContainer.hidden = false;
  };
  const showLocalMessage = (message: string): void => {
    input.errorContainer.textContent = message;
    input.errorContainer.hidden = false;
  };
  const hasUnappliedChanges = (): boolean => model !== undefined && (
    nameInput?.value !== model.label ||
    periodInputs.length !== model.capacityPeriods.length ||
    periodInputs.some((period, index) => {
      const reference = model!.capacityPeriods[index];
      return !reference || period.referenceIndex !== index ||
        period.startDate.value !== reference.startDate ||
        period.endDate.value !== reference.endDate ||
        period.capacity.value !== reference.capacity ||
        period.unavailabilityPercent.value !== reference.unavailabilityPercent;
    }));
  const renderPeriod = (row: {
    readonly key: number; readonly referenceIndex?: number;
    readonly startDate: string; readonly endDate: string;
    readonly capacity: string; readonly capacityDisplay: string; readonly capacityExact: string;
    readonly unavailabilityPercent: string; readonly unavailabilityDisplay: string;
    readonly unavailabilityExact: string;
  }): PeriodInputs => {
    const document = input.controls.capacityFields.ownerDocument;
    const fieldset = document.createElement("fieldset");
    fieldset.className = "timeline-team-edit-period";
    const legend = document.createElement("legend");
    legend.textContent = row.startDate && row.endDate
      ? `${row.startDate} → ${row.endDate}` : "New capacity period";
    const path = `team.capacityPeriods[${row.key}]`;
    const startDate = createLabeledInput(document, fieldset, "Start", "date", `${path}.startDate`);
    const endDate = createLabeledInput(document, fieldset, "End", "date", `${path}.endDate`);
    const capacity = createLabeledInput(document, fieldset, "Capacity", "text", `${path}.capacity`);
    const unavailabilityPercent = createLabeledInput(document, fieldset, "Unavailability %", "text", `${path}.unavailability`);
    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "timeline-team-period-action";
    remove.textContent = "Delete period";
    remove.setAttribute?.("aria-label", `Delete capacity period ${row.key + 1}`);
    remove.addEventListener("click", () => {
      periodInputs = Object.freeze(periodInputs.filter((period) => period.key !== row.key));
      input.controls.capacityFields.replaceChildren(...periodInputs.map((period) => period.fieldset));
      clearError();
    });
    fieldset.prepend(legend);
    fieldset.append(remove);
    startDate.value = row.startDate;
    endDate.value = row.endDate;
    capacity.value = row.capacity;
    unavailabilityPercent.value = row.unavailabilityPercent;
    input.controls.capacityFields.append(fieldset);
    return Object.freeze({ key: row.key, ...(row.referenceIndex === undefined ? {} : { referenceIndex: row.referenceIndex }),
      fieldset, startDate, endDate, capacity, capacityDisplay: row.capacityDisplay,
      capacityExact: row.capacityExact, unavailabilityPercent,
      unavailabilityDisplay: row.unavailabilityDisplay,
      unavailabilityExact: row.unavailabilityExact });
  };
  const hydrate = (nextModel: TeamEditViewModel | undefined, preserve = true): void => {
    const sameTeam = preserve && nextModel !== undefined && model?.teamId === nextModel.teamId &&
      !input.controls.container.hidden;
    const oldName = sameTeam && nameInput?.value !== model?.label ? nameInput?.value : undefined;
    const oldPeriods = sameTeam ? periodInputs.map((period) => ({
      key: period.key, ...(period.referenceIndex === undefined ? {} : { referenceIndex: period.referenceIndex }),
      startDate: period.startDate.value, endDate: period.endDate.value,
      capacity: period.capacity.value, capacityDisplay: period.capacityDisplay,
      capacityExact: period.capacityExact,
      unavailabilityPercent: period.unavailabilityPercent.value,
      unavailabilityDisplay: period.unavailabilityDisplay,
      unavailabilityExact: period.unavailabilityExact,
    })) : undefined;
    if (!sameTeam) nextRowKey = 0;
    model = nextModel;
    input.controls.container.hidden = nextModel === undefined;
    input.controls.nameFields.replaceChildren();
    input.controls.capacityFields.replaceChildren();
    input.controls.nameApply.disabled = nextModel === undefined;
    input.controls.capacityApply.disabled = nextModel === undefined;
    input.controls.capacityCancel.disabled = nextModel === undefined;
    if (input.controls.capacityAdd) input.controls.capacityAdd.disabled = nextModel === undefined;
    input.controls.status.textContent = nextModel
      ? `Editing ${nextModel.label}`
      : "Select a team to edit.";
    input.controls.title.textContent = nextModel
      ? `Team settings — ${nextModel.label}`
      : "Team settings";
    input.controls.deleteButton.disabled = nextModel === undefined;
    input.controls.discard.disabled = nextModel === undefined;
    input.controls.deleteConfirmation.hidden = true;
    if (nextModel === undefined) {
      nameInput = undefined;
      periodInputs = Object.freeze([]);
      return;
    }
    const document = input.controls.nameFields.ownerDocument;
    nameInput = createLabeledInput(
      document,
      input.controls.nameFields,
      "Name",
      "text",
      "team.name",
    );
    nameInput.value = nextModel.label;
    if (oldName !== undefined) nameInput.value = oldName;
    const rows = oldPeriods ?? nextModel.capacityPeriods.map((period) => ({
      key: nextRowKey++, referenceIndex: period.index,
      startDate: period.startDate, endDate: period.endDate,
      capacity: period.capacity, capacityDisplay: period.capacity, capacityExact: period.capacityExact,
      unavailabilityPercent: period.unavailabilityPercent,
      unavailabilityDisplay: period.unavailabilityPercent,
      unavailabilityExact: period.unavailabilityExact,
    }));
    periodInputs = Object.freeze(rows.map(renderPeriod));
  };

  const periodValues = (): TeamEditFormValues => {
    if (model === undefined) throw new TypeError("Team edit form has no selected team.");
    return Object.freeze({
      teamId: model.teamId,
      name: model.label,
      capacityPeriods: Object.freeze(
        periodInputs.map((period) => Object.freeze({
          index: period.key,
          startDate: period.startDate.value,
          endDate: period.endDate.value,
          capacity: period.capacity.value,
          capacityExact: period.capacityExact,
          capacityDirty: period.referenceIndex === undefined || period.capacity.value !== period.capacityDisplay,
          unavailabilityPercent: period.unavailabilityPercent.value,
          unavailabilityExact: period.unavailabilityExact,
          unavailabilityDirty: period.referenceIndex === undefined ||
            period.unavailabilityPercent.value !== period.unavailabilityDisplay,
        })),
      ),
    });
  };

  const onNameSubmit = (event: SubmitEvent): void => {
    event.preventDefault();
    if (model === undefined || nameInput === undefined) return;
    const name = nameInput.value.trim();
    if (name.length === 0) {
      showErrors([Object.freeze({ code: "EMPTY_TEAM_NAME", path: "team.name", message: "Team name must not be empty." })]);
      return;
    }
    const result = input.onApplyName(Object.freeze({ kind: "update-team-name", teamId: model.teamId, name }));
    if (!result.ok) return showErrors(result.errors);
    if (nameInput && model) nameInput.value = model.label;
    clearError();
  };
  const onPeriodsSubmit = (event: SubmitEvent): void => {
    event.preventDefault();
    if (model === undefined) return;
    const parsed = parseTeamEditCommand(periodValues());
    if (!parsed.ok) return showErrors(parsed.errors);
    const result = input.onApplyPeriods(parsed.command);
    if (!result.ok) return showErrors(result.errors);
    const currentName = nameInput?.value;
    hydrate(model, false);
    if (nameInput && currentName !== undefined) nameInput.value = currentName;
    clearError();
  };
  const onCancelPeriods = (): void => {
    const currentName = nameInput?.value;
    hydrate(model, false);
    if (nameInput && currentName !== undefined) nameInput.value = currentName;
    clearError();
  };
  const onAddPeriod = (): void => {
    if (!model) return;
    const row = renderPeriod({ key: nextRowKey++, startDate: "", endDate: "",
      capacity: "", capacityDisplay: "", capacityExact: "",
      unavailabilityPercent: "0", unavailabilityDisplay: "0", unavailabilityExact: "0/1" });
    periodInputs = Object.freeze([...periodInputs, row]);
    row.startDate.focus();
    clearError();
  };
  const onDiscard = (): void => { hydrate(model, false); clearError(); };
  const requestClose = (): boolean => {
    if (input.controls.container.hidden) return true;
    if (hasUnappliedChanges() && !input.confirmDiscard?.("Discard unapplied Team settings changes?")) return false;
    hydrate(undefined, false);
    clearError();
    input.onClose?.();
    return true;
  };
  const onClose = (): void => { requestClose(); };
  const onDeleteClick = (): void => {
    if (!model) return;
    if (hasUnappliedChanges()) {
      if (!input.confirmDiscard?.("Discard unapplied Team settings changes before deletion?")) return;
      onDiscard();
    }
    input.controls.deleteConfirmation.hidden = false;
    input.controls.deleteConfirm.focus();
  };
  const onDeleteCancel = (): void => { input.controls.deleteConfirmation.hidden = true; };
  const onDeleteConfirm = (): void => {
    if (!model || !input.onDelete) return;
    const result = input.onDelete(model.teamId);
    if (!result.ok) {
      if (result.reason === "application") showErrors(result.errors);
      else showLocalMessage(result.message);
      input.controls.deleteConfirmation.hidden = true;
    }
  };

  input.controls.nameForm.addEventListener("submit", onNameSubmit);
  input.controls.capacityForm.addEventListener("submit", onPeriodsSubmit);
  input.controls.capacityCancel.addEventListener("click", onCancelPeriods);
  input.controls.capacityAdd?.addEventListener("click", onAddPeriod);
  input.controls.close.addEventListener("click", onClose);
  input.controls.discard.addEventListener("click", onDiscard);
  input.controls.deleteButton.addEventListener("click", onDeleteClick);
  input.controls.deleteCancel.addEventListener("click", onDeleteCancel);
  input.controls.deleteConfirm.addEventListener("click", onDeleteConfirm);
  hydrate(undefined);
  return Object.freeze({
    setTeam: (team: TeamEditViewModel | undefined) => {
      const entering = team !== undefined && (model?.teamId !== team.teamId || input.controls.container.hidden);
      hydrate(team);
      clearError();
      if (entering) nameInput?.focus();
    },
    getTeamId: () => model?.teamId,
    requestClose,
    hasUnappliedChanges,
    destroy: () => {
      input.controls.nameForm.removeEventListener("submit", onNameSubmit);
      input.controls.capacityForm.removeEventListener("submit", onPeriodsSubmit);
      input.controls.capacityCancel.removeEventListener("click", onCancelPeriods);
      input.controls.capacityAdd?.removeEventListener("click", onAddPeriod);
      input.controls.close.removeEventListener("click", onClose);
      input.controls.discard.removeEventListener("click", onDiscard);
      input.controls.deleteButton.removeEventListener("click", onDeleteClick);
      input.controls.deleteCancel.removeEventListener("click", onDeleteCancel);
      input.controls.deleteConfirm.removeEventListener("click", onDeleteConfirm);
    },
  });
}

function createLabeledInput(document: Document, parent: HTMLElement, text: string, type: string, name: string): HTMLInputElement {
  const label = document.createElement("label");
  label.textContent = text;
  const field = document.createElement("input");
  field.type = type;
  field.name = name;
  field.dataset.fieldPath = name;
  label.append(field);
  parent.append(label);
  return field;
}
