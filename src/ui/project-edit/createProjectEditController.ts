import type {
  ProjectEditViewModel,
  UpdateProjectCommand,
} from "../../application/index.js";
import type { DomainError, ProjectId, TeamId } from "../../domain/index.js";
import type { ProjectEditControls } from "../renderApp.js";
import { createTeamSubcard } from "../portfolio/createTeamSubcard.js";
import {
  parseProjectEditCommand,
  type ProjectEditFormValues,
} from "./parseProjectEditCommand.js";

export type ProjectEditApplyResult =
  | Readonly<{ ok: true }>
  | Readonly<{ ok: false; errors: readonly DomainError[] }>;

export interface ProjectEditController {
  readonly setProject: (project: ProjectEditViewModel | undefined) => void;
  readonly getProjectId: () => ProjectId | undefined;
  readonly destroy: () => void;
}

export interface CreateProjectEditControllerInput {
  readonly controls: ProjectEditControls;
  readonly errorContainer: HTMLElement;
  readonly onApply: (command: UpdateProjectCommand) => ProjectEditApplyResult;
  readonly onCancel?: () => void;
}

interface GlobalInputs {
  readonly name: HTMLInputElement;
  readonly program: HTMLSelectElement;
  readonly priorityFamily: HTMLSelectElement;
  readonly priority: HTMLInputElement;
  readonly earliestStartDate: HTMLInputElement;
  readonly objectiveEndDate: HTMLInputElement;
  readonly mandatoryDeadline: HTMLInputElement;
}

interface RequirementInputs {
  readonly teamId: TeamId;
  readonly enabled: HTMLInputElement;
  readonly remainingWorkload: HTMLInputElement;
  readonly originalDisplay: string;
  readonly remainingWorkloadExact: string;
  readonly dailyCapExact?: string;
}

export function createProjectEditController(
  input: CreateProjectEditControllerInput,
): ProjectEditController {
  let model: ProjectEditViewModel | undefined;
  let globalInputs: GlobalInputs | undefined;
  let requirementInputs: readonly RequirementInputs[] = Object.freeze([]);

  const clearError = (): void => {
    input.errorContainer.textContent = "";
    input.errorContainer.hidden = true;
  };
  const showErrors = (errors: readonly DomainError[]): void => {
    input.errorContainer.textContent = errors
      .map((domainError) => `${domainError.path}: ${domainError.message}`)
      .join(" ");
    input.errorContainer.hidden = false;
  };

  const hydrate = (nextModel: ProjectEditViewModel | undefined): void => {
    model = nextModel;
    input.controls.fields.replaceChildren();
    const activeModel = nextModel;
    const enabled = activeModel !== undefined;
    input.controls.container.hidden = !enabled;
    input.controls.apply.disabled = !enabled;
    input.controls.cancel.disabled = !enabled;
    input.controls.status.textContent = enabled
      ? `Editing ${activeModel.label}`
      : "Select a project allocation or marker to edit.";
    if (activeModel === undefined) {
      globalInputs = undefined;
      requirementInputs = Object.freeze([]);
      return;
    }

    const document = input.controls.fields.ownerDocument;
    const global = document.createElement("fieldset");
    global.className = "timeline-project-edit-global";
    const legend = document.createElement("legend");
    legend.textContent = "Project settings";
    const name = createLabeledInput(document, global, "Label", "text", "project.name");
    const program = createLabeledSelect(document, global, "Program", "project.programId", activeModel.programs);
    const priorityFamily = createLabeledSelect(document, global, "PAS", "project.priorityFamilyId", activeModel.priorityFamilies);
    const priority = createLabeledInput(
      document,
      global,
      "Priority position",
      "number",
      "project.priority",
    );
    priority.min = "1";
    priority.max = String(activeModel.projectCount);
    priority.step = "1";
    const earliestStartDate = createLabeledInput(
      document,
      global,
      "Earliest start",
      "date",
      "project.earliestStartDate",
    );
    const objectiveEndDate = createLabeledInput(
      document,
      global,
      "Objective end",
      "date",
      "project.objectiveEndDate",
    );
    const mandatoryDeadline = createLabeledInput(
      document,
      global,
      "Mandatory deadline",
      "date",
      "project.mandatoryDeadline",
    );
    global.prepend(legend);
    name.value = activeModel.label;
    program.value = activeModel.programId ?? "";
    priorityFamily.value = activeModel.priorityFamilyId ?? "";
    priority.value = String(activeModel.priorityPosition);
    earliestStartDate.value = activeModel.earliestStartDate ?? "";
    objectiveEndDate.value = activeModel.objectiveEndDate ?? "";
    mandatoryDeadline.value = activeModel.mandatoryDeadline ?? "";
    globalInputs = Object.freeze({
      name,
      program,
      priorityFamily,
      priority,
      earliestStartDate,
      objectiveEndDate,
      mandatoryDeadline,
    });

    requirementInputs = Object.freeze(
      activeModel.requirements.map((requirement) => {
        const fieldset = document.createElement("fieldset");
        fieldset.className = "timeline-project-edit-requirement";
        fieldset.dataset.teamId = requirement.teamId;
        const remainingWorkload = createLabeledInput(
          document,
          fieldset,
          "Remaining workload",
          "text",
          `requirements.${requirement.teamId}.remainingWorkload`,
        );
        remainingWorkload.value = requirement.remainingWorkload;
        const subcard = createTeamSubcard(input.controls.fields, "Project", requirement.teamId,
          requirement.teamLabel, requirement.enabled, fieldset);
        return Object.freeze({
          teamId: requirement.teamId,
          enabled: subcard.enabled,
          remainingWorkload,
          originalDisplay: requirement.remainingWorkload,
          remainingWorkloadExact: requirement.remainingWorkloadExact,
          ...(requirement.dailyCapExact === undefined
            ? {}
            : { dailyCapExact: requirement.dailyCapExact }),
        });
      }),
    );
    input.controls.fields.prepend(global);
  };

  const formValues = (): ProjectEditFormValues => {
    if (model === undefined || globalInputs === undefined) {
      throw new TypeError("Project edit form has no selected project.");
    }
    return Object.freeze({
      projectId: model.projectId,
      projectCount: model.projectCount,
      name: globalInputs.name.value,
      programId: globalInputs.program.value,
      priorityFamilyId: globalInputs.priorityFamily.value,
      priorityPosition: globalInputs.priority.value,
      earliestStartDate: globalInputs.earliestStartDate.value,
      objectiveEndDate: globalInputs.objectiveEndDate.value,
      mandatoryDeadline: globalInputs.mandatoryDeadline.value,
      requirements: Object.freeze(
        requirementInputs.map((requirement) =>
          Object.freeze({
            teamId: requirement.teamId,
            enabled: requirement.enabled.checked,
            remainingWorkload: requirement.remainingWorkload.value,
            remainingWorkloadExact: requirement.remainingWorkloadExact,
            remainingWorkloadDirty:
              requirement.remainingWorkload.value !== requirement.originalDisplay,
            ...(requirement.dailyCapExact === undefined
              ? {}
              : { dailyCapExact: requirement.dailyCapExact }),
          }),
        ),
      ),
    });
  };

  const onSubmit = (event: SubmitEvent): void => {
    event.preventDefault();
    if (model === undefined) return;
    const parsed = parseProjectEditCommand(formValues());
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
    input.onCancel?.();
  };
  const setProject = (project: ProjectEditViewModel | undefined): void => {
    hydrate(project);
    clearError();
  };

  input.controls.form.addEventListener("submit", onSubmit);
  input.controls.cancel.addEventListener("click", onCancel);
  hydrate(undefined);

  return Object.freeze({
    setProject,
    getProjectId: () => model?.projectId,
    destroy: () => {
      input.controls.form.removeEventListener("submit", onSubmit);
      input.controls.cancel.removeEventListener("click", onCancel);
    },
  });
}

function createLabeledSelect(
  document: Document,
  parent: HTMLElement,
  text: string,
  name: string,
  options: readonly Readonly<{ id: string; name: string }>[],
): HTMLSelectElement {
  const label = document.createElement("label");
  label.textContent = text;
  const field = document.createElement("select");
  field.name = name;
  field.dataset.fieldPath = name;
  const none = document.createElement("option");
  none.value = "";
  none.textContent = "None";
  field.append(none);
  for (const item of options) {
    const option = document.createElement("option");
    option.value = item.id;
    option.textContent = item.name;
    field.append(option);
  }
  label.append(field);
  parent.append(label);
  return field;
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
