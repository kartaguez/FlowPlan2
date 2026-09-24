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
  readonly index: number;
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
    nameInput?.value !== model.label || periodInputs.some((period) => {
      const reference = model!.capacityPeriods[period.index];
      return !reference || period.startDate.value !== reference.startDate ||
        period.endDate.value !== reference.endDate ||
        period.capacity.value !== reference.capacity ||
        period.unavailabilityPercent.value !== reference.unavailabilityPercent;
    }));
  const hydrate = (nextModel: TeamEditViewModel | undefined, preserve = true): void => {
    const sameTeam = preserve && nextModel !== undefined && model?.teamId === nextModel.teamId &&
      !input.controls.container.hidden;
    const oldName = sameTeam && nameInput?.value !== model?.label ? nameInput?.value : undefined;
    const oldPeriods = sameTeam ? periodInputs.map((period) => {
      const reference = model!.capacityPeriods[period.index];
      return reference ? {
        startDate: period.startDate.value !== reference.startDate ? period.startDate.value : undefined,
        endDate: period.endDate.value !== reference.endDate ? period.endDate.value : undefined,
        capacity: period.capacity.value !== reference.capacity ? period.capacity.value : undefined,
        unavailability: period.unavailabilityPercent.value !== reference.unavailabilityPercent
          ? period.unavailabilityPercent.value : undefined,
      } : undefined;
    }) : [];
    model = nextModel;
    input.controls.container.hidden = nextModel === undefined;
    input.controls.nameFields.replaceChildren();
    input.controls.capacityFields.replaceChildren();
    input.controls.nameApply.disabled = nextModel === undefined;
    input.controls.capacityApply.disabled = nextModel === undefined;
    input.controls.capacityCancel.disabled = nextModel === undefined;
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
    periodInputs = Object.freeze(
      nextModel.capacityPeriods.map((period) => {
        const fieldset = document.createElement("fieldset");
        fieldset.className = "timeline-team-edit-period";
        const legend = document.createElement("legend");
        legend.textContent = `${period.startDate} → ${period.endDate}`;
        const startDate = createLabeledInput(document, fieldset, "Start", "date", `team.capacityPeriods[${period.index}].startDate`);
        const endDate = createLabeledInput(document, fieldset, "End", "date", `team.capacityPeriods[${period.index}].endDate`);
        const capacity = createLabeledInput(document, fieldset, "Capacity", "text", `team.capacityPeriods[${period.index}].capacity`);
        const unavailabilityPercent = createLabeledInput(document, fieldset, "Unavailability %", "text", `team.capacityPeriods[${period.index}].unavailability`);
        fieldset.prepend(legend);
        startDate.value = period.startDate;
        endDate.value = period.endDate;
        capacity.value = period.capacity;
        unavailabilityPercent.value = period.unavailabilityPercent;
        const old = oldPeriods[period.index];
        if (old?.startDate !== undefined) startDate.value = old.startDate;
        if (old?.endDate !== undefined) endDate.value = old.endDate;
        if (old?.capacity !== undefined) capacity.value = old.capacity;
        if (old?.unavailability !== undefined) unavailabilityPercent.value = old.unavailability;
        input.controls.capacityFields.append(fieldset);
        return Object.freeze({
          index: period.index,
          startDate,
          endDate,
          capacity,
          capacityDisplay: period.capacity,
          capacityExact: period.capacityExact,
          unavailabilityPercent,
          unavailabilityDisplay: period.unavailabilityPercent,
          unavailabilityExact: period.unavailabilityExact,
        });
      }),
    );
  };

  const periodValues = (): TeamEditFormValues => {
    if (model === undefined) throw new TypeError("Team edit form has no selected team.");
    return Object.freeze({
      teamId: model.teamId,
      name: model.label,
      capacityPeriods: Object.freeze(
        periodInputs.map((period) => Object.freeze({
          index: period.index,
          startDate: period.startDate.value,
          endDate: period.endDate.value,
          capacity: period.capacity.value,
          capacityExact: period.capacityExact,
          capacityDirty: period.capacity.value !== period.capacityDisplay,
          unavailabilityPercent: period.unavailabilityPercent.value,
          unavailabilityExact: period.unavailabilityExact,
          unavailabilityDirty: period.unavailabilityPercent.value !== period.unavailabilityDisplay,
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
