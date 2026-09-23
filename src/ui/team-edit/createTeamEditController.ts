import type {
  TeamEditViewModel,
  UpdateTeamCommand,
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
  readonly onApply: (command: UpdateTeamCommand) => TeamEditApplyResult;
}

interface GlobalInputs {
  readonly name: HTMLInputElement;
  readonly maxParallelProjects: HTMLInputElement;
  readonly workingWeekdays: readonly HTMLInputElement[];
}

interface PeriodInputs {
  readonly index: number;
  readonly startDate: HTMLInputElement;
  readonly endDate: HTMLInputElement;
  readonly capacity: HTMLInputElement;
  readonly unavailabilityPercent: HTMLInputElement;
}

const WEEKDAYS = Object.freeze([
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
]);

export function createTeamEditController(
  input: CreateTeamEditControllerInput,
): TeamEditController {
  let model: TeamEditViewModel | undefined;
  let globalInputs: GlobalInputs | undefined;
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
    input.controls.fields.replaceChildren();
    input.controls.apply.disabled = nextModel === undefined;
    input.controls.cancel.disabled = nextModel === undefined;
    input.controls.status.textContent = nextModel
      ? `Editing ${nextModel.label}`
      : "Select a team lane to edit.";
    if (nextModel === undefined) {
      globalInputs = undefined;
      periodInputs = Object.freeze([]);
      return;
    }
    const document = input.controls.fields.ownerDocument;
    const settings = document.createElement("fieldset");
    settings.className = "timeline-team-edit-global";
    const legend = document.createElement("legend");
    legend.textContent = "Team settings";
    const name = createLabeledInput(document, settings, "Name", "text", "team.name");
    const maxParallelProjects = createLabeledInput(
      document,
      settings,
      "Max parallel projects",
      "number",
      "team.maxParallelProjects",
    );
    maxParallelProjects.min = "1";
    maxParallelProjects.step = "1";
    const weekdays = document.createElement("fieldset");
    weekdays.className = "timeline-team-edit-weekdays";
    const weekdaysLegend = document.createElement("legend");
    weekdaysLegend.textContent = "Working days";
    weekdays.append(weekdaysLegend);
    const workingWeekdays = WEEKDAYS.map((weekday, index) => {
      const label = document.createElement("label");
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.name = `team.workingPattern.${index + 1}`;
      checkbox.checked = nextModel.workingWeekdays.includes(
        (index + 1) as 1 | 2 | 3 | 4 | 5 | 6 | 7,
      );
      label.append(checkbox, weekday);
      weekdays.append(label);
      return checkbox;
    });
    settings.prepend(legend);
    settings.append(weekdays);
    name.value = nextModel.label;
    maxParallelProjects.value = String(nextModel.maxParallelProjects);
    globalInputs = Object.freeze({
      name,
      maxParallelProjects,
      workingWeekdays: Object.freeze(workingWeekdays),
    });
    input.controls.fields.append(settings);

    periodInputs = Object.freeze(
      nextModel.capacityPeriods.map((period) => {
        const fieldset = document.createElement("fieldset");
        fieldset.className = "timeline-team-edit-period";
        fieldset.dataset.periodIndex = String(period.index);
        const periodLegend = document.createElement("legend");
        periodLegend.textContent = `Capacity period ${period.index + 1}`;
        const startDate = createLabeledInput(
          document,
          fieldset,
          "Start",
          "date",
          `team.capacityPeriods[${period.index}].startDate`,
        );
        const endDate = createLabeledInput(
          document,
          fieldset,
          "End",
          "date",
          `team.capacityPeriods[${period.index}].endDate`,
        );
        const capacity = createLabeledInput(
          document,
          fieldset,
          "Capacity / FTE",
          "text",
          `team.capacityPeriods[${period.index}].capacity`,
        );
        const unavailabilityPercent = createLabeledInput(
          document,
          fieldset,
          "Unavailability %",
          "text",
          `team.capacityPeriods[${period.index}].unavailability`,
        );
        fieldset.prepend(periodLegend);
        startDate.value = period.startDate;
        endDate.value = period.endDate;
        capacity.value = period.capacity;
        unavailabilityPercent.value = period.unavailabilityPercent;
        input.controls.fields.append(fieldset);
        return Object.freeze({
          index: period.index,
          startDate,
          endDate,
          capacity,
          unavailabilityPercent,
        });
      }),
    );
  };

  const formValues = (): TeamEditFormValues => {
    if (model === undefined || globalInputs === undefined) {
      throw new TypeError("Team edit form has no selected team.");
    }
    return Object.freeze({
      teamId: model.teamId,
      name: globalInputs.name.value,
      maxParallelProjects: globalInputs.maxParallelProjects.value,
      workingWeekdays: Object.freeze(
        globalInputs.workingWeekdays.flatMap((checkbox, index) =>
          checkbox.checked ? [index + 1] : [],
        ),
      ),
      capacityPeriods: Object.freeze(
        periodInputs.map((period) =>
          Object.freeze({
            index: period.index,
            startDate: period.startDate.value,
            endDate: period.endDate.value,
            capacity: period.capacity.value,
            unavailabilityPercent: period.unavailabilityPercent.value,
          }),
        ),
      ),
    });
  };

  const onSubmit = (event: SubmitEvent): void => {
    event.preventDefault();
    if (model === undefined) return;
    const parsed = parseTeamEditCommand(formValues());
    if (!parsed.ok) {
      showErrors(parsed.errors);
      return;
    }
    const result = input.onApply(parsed.command);
    if (!result.ok) {
      showErrors(result.errors);
      return;
    }
    clearError();
  };
  const onCancel = (): void => {
    hydrate(model);
    clearError();
  };
  const setTeam = (team: TeamEditViewModel | undefined): void => {
    hydrate(team);
    clearError();
  };

  input.controls.form.addEventListener("submit", onSubmit);
  input.controls.cancel.addEventListener("click", onCancel);
  hydrate(undefined);
  return Object.freeze({
    setTeam,
    getTeamId: () => model?.teamId,
    destroy: () => {
      input.controls.form.removeEventListener("submit", onSubmit);
      input.controls.cancel.removeEventListener("click", onCancel);
    },
  });
}

function createLabeledInput(
  document: Document,
  parent: HTMLElement,
  text: string,
  type: string,
  name: string,
): HTMLInputElement {
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
