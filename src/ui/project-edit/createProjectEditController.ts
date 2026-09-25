import type {
  ProjectEditViewModel,
  UpdateProjectCommand,
} from "../../application/index.js";
import type { DomainError, ProjectId, TeamId } from "../../domain/index.js";
import type { ProjectEditControls } from "../renderApp.js";
import { createTeamSubcard } from "../portfolio/createTeamSubcard.js";
import { projectValuesFromModel, type ProjectDraftStore, type ProjectDraftValues } from "./projectDraftStore.js";
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
  readonly onDelete?: (projectId: ProjectId) => ProjectEditApplyResult;
  readonly confirmDiscard?: (message: string) => boolean;
  readonly onCancel?: () => void;
  readonly draftStore?: ProjectDraftStore;
  readonly onDraftChange?: () => void;
}

interface GlobalInputs {
  readonly name: HTMLInputElement;
  readonly program: HTMLSelectElement;
  readonly priorityFamily: HTMLSelectElement;
  readonly earliestStartDate: HTMLInputElement;
  readonly objectiveEndDate: HTMLInputElement;
  readonly mandatory: HTMLInputElement;
}

interface RequirementInputs {
  readonly teamId: TeamId;
  readonly enabled: HTMLInputElement;
  readonly remainingWorkload: HTMLInputElement;
  readonly isExpanded: () => boolean;
  readonly card: HTMLElement;
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
  let resolution: ProjectDraftValues["resolution"] = "remove";

  const clearError = (): void => {
    input.errorContainer.textContent = "";
    input.errorContainer.hidden = true;
    if (model) input.draftStore?.setErrors(model.projectId, []);
  };
  const showErrors = (errors: readonly DomainError[]): void => {
    input.errorContainer.textContent = errors
      .map((domainError) => `${domainError.path}: ${domainError.message}`)
      .join(" ");
    input.errorContainer.hidden = false;
    if (model) input.draftStore?.setErrors(model.projectId,
      errors.map((domainError) => `${domainError.path}: ${domainError.message}`));
  };

  const hydrate = (nextModel: ProjectEditViewModel | undefined): void => {
    model = nextModel;
    input.controls.fields.replaceChildren();
    const activeModel = nextModel;
    const draft = nextModel === undefined ? undefined : input.draftStore?.initialize(nextModel.projectId, nextModel);
    const values = draft?.values ?? (nextModel === undefined ? undefined : projectValuesFromModel(nextModel));
    const enabled = activeModel !== undefined;
    input.controls.container.hidden = !enabled;
    input.controls.apply.disabled = !enabled;
    input.controls.cancel.disabled = !enabled;
    input.controls.status.textContent = "";
    if (input.controls.deleteConfirmation) input.controls.deleteConfirmation.hidden = true;
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
    const grouping = document.createElement("div");
    grouping.className = "timeline-project-grouping-fields";
    const program = createLabeledSelect(document, grouping, "Program", "project.programId", activeModel.programs);
    const priorityFamily = createLabeledSelect(document, grouping, "PaS", "project.priorityFamilyId", activeModel.priorityFamilies);
    if (values!.programId && !activeModel.programs.some((item) => item.id === values!.programId)) {
      const missing = document.createElement("option");
      missing.value = values!.programId;
      missing.textContent = `Unavailable Program (${values!.programId})`;
      program.append(missing);
    }
    if (values!.priorityFamilyId && !activeModel.priorityFamilies.some((item) => item.id === values!.priorityFamilyId)) {
      const missing = document.createElement("option");
      missing.value = values!.priorityFamilyId;
      missing.textContent = `Unavailable PaS (${values!.priorityFamilyId})`;
      priorityFamily.append(missing);
    }
    global.append(grouping);
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
      "Project objective end date",
      "date",
      "project.objectiveEndDate",
    );
    const mandatory = createLabeledInput(document, global, "Mandatory", "checkbox", "project.mandatory");
    mandatory.addEventListener("change", () => { syncMandatory(); notifyDraftChange(); });
    objectiveEndDate.addEventListener("change", () => { syncMandatory(); notifyDraftChange(); });
    objectiveEndDate.addEventListener("input", () => { syncMandatory(); notifyDraftChange(); });
    global.prepend(legend);
    name.value = values!.name;
    program.value = values!.programId;
    priorityFamily.value = values!.priorityFamilyId;
    earliestStartDate.value = values!.earliestStartDate;
    objectiveEndDate.value = values!.objectiveEndDate;
    mandatory.checked = values!.mandatory;
    resolution = values!.resolution;
    const syncMandatory = (): void => {
      mandatory.disabled = objectiveEndDate.value === "";
      if (mandatory.disabled) mandatory.checked = false;
    };
    syncMandatory();
    if (draft?.invalidReference) {
      const warning = document.createElement("p");
      warning.textContent = "A referenced Team, Program or PaS no longer exists. Apply is unavailable.";
      global.append(warning);
      input.controls.apply.disabled = true;
    }
    if (activeModel.mandatoryDeadline !== undefined &&
      activeModel.mandatoryDeadline !== activeModel.objectiveEndDate && resolution === "unresolved") {
      const warning = document.createElement("p");
      warning.textContent = `Historical mandatory deadline: ${activeModel.mandatoryDeadline}. Resolve before Apply.`;
      const align = document.createElement("button");
      align.type = "button";
      align.textContent = "Align with objective";
      align.disabled = objectiveEndDate.value === "";
      align.hidden = align.disabled;
      objectiveEndDate.addEventListener("input", () => {
        align.disabled = objectiveEndDate.value === "";
        align.hidden = align.disabled;
      });
      align.addEventListener("click", () => { resolution = "align"; mandatory.checked = true; warning.hidden = true; align.hidden = true; remove.hidden = true; notifyDraftChange(); });
      const remove = document.createElement("button");
      remove.type = "button";
      remove.textContent = "Remove deadline";
      remove.addEventListener("click", () => { resolution = "remove"; mandatory.checked = false; warning.hidden = true; align.hidden = true; remove.hidden = true; notifyDraftChange(); });
      global.append(warning, align, remove);
    }
    globalInputs = Object.freeze({
      name,
      program,
      priorityFamily,
      earliestStartDate,
      objectiveEndDate,
      mandatory,
    });

    requirementInputs = Object.freeze(
      activeModel.requirements.map((requirement) => {
        const saved = values!.teams.find((team) => team.teamId === requirement.teamId);
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
        remainingWorkload.value = saved?.remainingWorkload ?? requirement.remainingWorkload;
        const subcard = createTeamSubcard(input.controls.fields, "Project", requirement.teamId,
          requirement.teamLabel, saved?.enabled ?? requirement.enabled, fieldset,
          saved?.expanded ?? false, notifyDraftChange);
        subcard.card.classList?.toggle("portfolio-card--dirty",
          input.draftStore?.isTeamDirty(activeModel.projectId, requirement.teamId) ?? false);
        return Object.freeze({
          teamId: requirement.teamId,
          enabled: subcard.enabled,
          remainingWorkload,
          isExpanded: subcard.isExpanded,
          card: subcard.card,
          originalDisplay: draft?.reference.teams.find((team) => team.teamId === requirement.teamId)?.remainingWorkload ?? requirement.remainingWorkload,
          remainingWorkloadExact: draft?.reference.teams.find((team) => team.teamId === requirement.teamId)?.remainingWorkloadExact
            ?? requirement.remainingWorkloadExact,
          ...(requirement.dailyCapExact === undefined
            ? {}
            : { dailyCapExact: requirement.dailyCapExact }),
        });
      }),
    );
    input.controls.fields.prepend(global);
    if (draft?.errors.length) {
      input.errorContainer.textContent = draft.errors.join(" ");
      input.errorContainer.hidden = false;
    }
  };

  const readDraftValues = (): ProjectDraftValues => {
    if (!model || !globalInputs) throw new TypeError("Project edit form has no selected project.");
    const previous = input.draftStore?.get(model.projectId)?.values ?? projectValuesFromModel(model);
    return { name: globalInputs.name.value, programId: globalInputs.program.value,
      priorityFamilyId: globalInputs.priorityFamily.value,
      earliestStartDate: globalInputs.earliestStartDate.value,
      objectiveEndDate: globalInputs.objectiveEndDate.value, mandatory: globalInputs.mandatory.checked,
      resolution, teams: requirementInputs.map((row) => ({
        teamId: row.teamId, enabled: row.enabled.checked,
        remainingWorkload: row.remainingWorkload.value,
        remainingWorkloadExact: row.remainingWorkloadExact,
        ...(row.dailyCapExact === undefined ? {} : { dailyCapExact: row.dailyCapExact }),
        expanded: row.isExpanded(),
      })).concat(previous.teams.filter((team) => !requirementInputs.some((row) => row.teamId === team.teamId))) };
  };
  const notifyDraftChange = (): void => {
    if (!model || !globalInputs || !input.draftStore) return;
    input.draftStore.update(model.projectId, readDraftValues());
    for (const row of requirementInputs) row.card.classList?.toggle("portfolio-card--dirty",
      input.draftStore.isTeamDirty(model.projectId, row.teamId));
    input.onDraftChange?.();
  };

  const formValues = (): ProjectEditFormValues => {
    if (model === undefined || globalInputs === undefined) {
      throw new TypeError("Project edit form has no selected project.");
    }
    return Object.freeze({
      projectId: model.projectId,
      name: globalInputs.name.value,
      programId: globalInputs.program.value,
      priorityFamilyId: globalInputs.priorityFamily.value,
      earliestStartDate: globalInputs.earliestStartDate.value,
      objectiveEndDate: globalInputs.objectiveEndDate.value,
      mandatory: globalInputs.mandatory.checked,
      legacyDeadlineResolution: resolution,
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
    notifyDraftChange();
    if (input.draftStore?.get(model.projectId)?.invalidReference) {
      showErrors([{ code: "INVALID_DRAFT_REFERENCE", path: "project", message: "A referenced Team, Program or PaS no longer exists." }]);
      return;
    }
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
    if (model && input.draftStore) {
      const expanded = input.draftStore.get(model.projectId)?.expanded ?? true;
      input.draftStore.cancel(model.projectId);
      input.draftStore.initialize(model.projectId, model);
      input.draftStore.setExpanded(model.projectId, expanded);
    }
    hydrate(model);
    clearError();
    input.onDraftChange?.();
    input.onCancel?.();
  };
  const onDeleteClick = (): void => {
    if (!model) return;
    notifyDraftChange();
    if (input.draftStore?.isDirty(model.projectId)) {
      if (!input.confirmDiscard?.("Discard unapplied Project changes before deletion?")) return;
      const id = model.projectId;
      const expanded = input.draftStore.get(id)?.expanded ?? true;
      input.draftStore.cancel(id);
      input.draftStore.initialize(id, model);
      input.draftStore.setExpanded(id, expanded);
      hydrate(model);
      clearError();
      input.onDraftChange?.();
    }
    input.controls.deleteConfirmation.hidden = false;
    input.controls.deleteConfirm.focus();
  };
  const onDeleteCancel = (): void => {
    input.controls.deleteConfirmation.hidden = true;
    input.controls.deleteButton.focus();
  };
  const onDeleteConfirm = (): void => {
    if (!model || !input.onDelete) return;
    const result = input.onDelete(model.projectId);
    if (!result.ok) {
      showErrors(result.errors);
      input.controls.deleteConfirmation.hidden = true;
      input.controls.deleteButton.focus();
    }
  };
  const setProject = (project: ProjectEditViewModel | undefined): void => {
    hydrate(project);
  };

  input.controls.form.addEventListener("submit", onSubmit);
  input.controls.form.addEventListener("input", notifyDraftChange);
  input.controls.form.addEventListener("change", notifyDraftChange);
  input.controls.cancel.addEventListener("click", onCancel);
  input.controls.deleteButton?.addEventListener("click", onDeleteClick);
  input.controls.deleteCancel?.addEventListener("click", onDeleteCancel);
  input.controls.deleteConfirm?.addEventListener("click", onDeleteConfirm);
  hydrate(undefined);

  return Object.freeze({
    setProject,
    getProjectId: () => model?.projectId,
    destroy: () => {
      input.controls.form.removeEventListener("submit", onSubmit);
      input.controls.form.removeEventListener("input", notifyDraftChange);
      input.controls.form.removeEventListener("change", notifyDraftChange);
      input.controls.cancel.removeEventListener("click", onCancel);
      input.controls.deleteButton?.removeEventListener("click", onDeleteClick);
      input.controls.deleteCancel?.removeEventListener("click", onDeleteCancel);
      input.controls.deleteConfirm?.removeEventListener("click", onDeleteConfirm);
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
