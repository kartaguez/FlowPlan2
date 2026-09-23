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
  readonly destroy: () => void;
}

export interface CreateTeamEditControllerInput {
  readonly controls: TeamEditControls;
  readonly errorContainer: HTMLElement;
  readonly onApplyName: (command: UpdateTeamNameCommand) => TeamEditApplyResult;
  readonly onApplyPeriods: (
    command: UpdateTeamCapacityPeriodsCommand,
  ) => TeamEditApplyResult;
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
  const hydrate = (nextModel: TeamEditViewModel | undefined): void => {
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
    clearError();
  };
  const onPeriodsSubmit = (event: SubmitEvent): void => {
    event.preventDefault();
    if (model === undefined) return;
    const parsed = parseTeamEditCommand(periodValues());
    if (!parsed.ok) return showErrors(parsed.errors);
    const result = input.onApplyPeriods(parsed.command);
    if (!result.ok) return showErrors(result.errors);
    clearError();
  };
  const onCancelPeriods = (): void => {
    hydrate(model);
    clearError();
  };
  const onClose = (): void => {
    input.controls.container.hidden = true;
    clearError();
  };

  input.controls.nameForm.addEventListener("submit", onNameSubmit);
  input.controls.capacityForm.addEventListener("submit", onPeriodsSubmit);
  input.controls.capacityCancel.addEventListener("click", onCancelPeriods);
  input.controls.close.addEventListener("click", onClose);
  hydrate(undefined);
  return Object.freeze({
    setTeam: (team: TeamEditViewModel | undefined) => { hydrate(team); clearError(); },
    getTeamId: () => model?.teamId,
    destroy: () => {
      input.controls.nameForm.removeEventListener("submit", onNameSubmit);
      input.controls.capacityForm.removeEventListener("submit", onPeriodsSubmit);
      input.controls.capacityCancel.removeEventListener("click", onCancelPeriods);
      input.controls.close.removeEventListener("click", onClose);
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
