import type { CreateProjectCommand } from "../../application/index.js";
import type { DomainError, Portfolio, TeamId } from "../../domain/index.js";
import type { ProjectCreateControls } from "../renderApp.js";
import { createTeamSubcard } from "../portfolio/createTeamSubcard.js";
import { parseProjectFields } from "./parseProjectEditCommand.js";

export interface ProjectCreateController {
  readonly open: () => void;
  readonly requestClose: () => boolean;
  readonly isOpen: () => boolean;
  readonly isTeamEnabled: (teamId: TeamId) => boolean;
  readonly setPortfolio: (portfolio: Portfolio) => void;
  readonly destroy: () => void;
}

interface FormSnapshot {
  readonly name: string;
  readonly programId: string;
  readonly priorityFamilyId: string;
  readonly earliestStartDate: string;
  readonly objectiveEndDate: string;
  readonly mandatory: boolean;
  readonly teams: ReadonlyMap<TeamId, Readonly<{ enabled: boolean; remainingWorkload: string; expanded: boolean }>>;
}

export function createProjectCreateController(input: {
  readonly controls: ProjectCreateControls;
  readonly portfolio: Portfolio;
  readonly onCreate: (command: CreateProjectCommand) =>
    Readonly<{ ok: true }> | Readonly<{ ok: false; errors: readonly DomainError[] }>;
  readonly confirmDiscard: (message: string) => boolean;
  readonly onClose: () => void;
}): ProjectCreateController {
  const { controls } = input;
  const document = controls.form.ownerDocument;
  let portfolio = input.portfolio;
  let name: HTMLInputElement;
  let program: HTMLSelectElement;
  let priorityFamily: HTMLSelectElement;
  let earliestStartDate: HTMLInputElement;
  let objectiveEndDate: HTMLInputElement;
  let mandatory: HTMLInputElement;
  let rows: readonly Readonly<{ teamId: TeamId; enabled: HTMLInputElement;
    remainingWorkload: HTMLInputElement; isExpanded: () => boolean }>[] = [];

  const field = (parent: HTMLElement, label: string, type: string, name: string): HTMLInputElement => {
    const wrapper = document.createElement("label");
    wrapper.textContent = label;
    const element = document.createElement("input");
    element.type = type;
    element.name = name;
    wrapper.append(element);
    parent.append(wrapper);
    return element;
  };
  const select = (parent: HTMLElement, label: string, name: string,
    items: readonly Readonly<{ id: string; name: string }>[]): HTMLSelectElement => {
    const wrapper = document.createElement("label");
    wrapper.textContent = label;
    const element = document.createElement("select");
    element.name = name;
    const none = document.createElement("option");
    none.value = "";
    none.textContent = "None";
    element.append(none);
    for (const item of items) {
      const option = document.createElement("option");
      option.value = item.id;
      option.textContent = item.name;
      element.append(option);
    }
    wrapper.append(element);
    parent.append(wrapper);
    return element;
  };
  const snapshot = (): FormSnapshot => ({
    name: name.value, programId: program.value, priorityFamilyId: priorityFamily.value,
    earliestStartDate: earliestStartDate.value, objectiveEndDate: objectiveEndDate.value,
    mandatory: mandatory.checked,
    teams: new Map(rows.map((row) => [row.teamId, {
      enabled: row.enabled.checked, remainingWorkload: row.remainingWorkload.value,
      expanded: row.isExpanded(),
    }])),
  });
  const clearError = (): void => { controls.error.textContent = ""; controls.error.hidden = true; };
  const showErrors = (errors: readonly DomainError[]): void => {
    controls.error.textContent = errors.map((entry) => `${entry.path}: ${entry.message}`).join(" ");
    controls.error.hidden = false;
  };
  const render = (saved?: FormSnapshot): void => {
    controls.fields.replaceChildren();
    const global = document.createElement("fieldset");
    global.className = "timeline-project-edit-global";
    const legend = document.createElement("legend");
    legend.textContent = "Project settings";
    global.append(legend);
    name = field(global, "Label", "text", "project.name");
    const grouping = document.createElement("div");
    grouping.className = "timeline-project-grouping-fields";
    program = select(grouping, "Program", "project.programId", portfolio.programs);
    priorityFamily = select(grouping, "PaS", "project.priorityFamilyId", portfolio.priorityFamilies);
    global.append(grouping);
    earliestStartDate = field(global, "Earliest start", "date", "project.earliestStartDate");
    objectiveEndDate = field(global, "Project objective end date", "date", "project.objectiveEndDate");
    mandatory = field(global, "Mandatory", "checkbox", "project.mandatory");
    const syncMandatory = (): void => {
      mandatory.disabled = objectiveEndDate.value === "";
      if (mandatory.disabled) mandatory.checked = false;
    };
    objectiveEndDate.addEventListener("input", syncMandatory);
    objectiveEndDate.addEventListener("change", syncMandatory);
    name.value = saved?.name ?? "";
    program.value = saved?.programId ?? "";
    priorityFamily.value = saved?.priorityFamilyId ?? "";
    earliestStartDate.value = saved?.earliestStartDate ?? "";
    objectiveEndDate.value = saved?.objectiveEndDate ?? "";
    mandatory.checked = saved?.mandatory ?? false;
    syncMandatory();
    controls.fields.append(global);
    const teamList = document.createElement("div");
    teamList.className = "timeline-project-create-teams";
    if (portfolio.teams.length === 0) {
      const empty = document.createElement("p");
      empty.textContent = "Create a Team first";
      teamList.append(empty);
    }
    rows = portfolio.teams.map((team) => {
      const previous = saved?.teams.get(team.id);
      const details = document.createElement("fieldset");
      details.className = "timeline-project-edit-requirement";
      const remainingWorkload = field(details, "Remaining workload", "text",
        `requirements.${team.id}.remainingWorkload`);
      remainingWorkload.value = previous?.remainingWorkload ?? "";
      const subcard = createTeamSubcard(teamList, "Project", team.id, team.name,
        previous?.enabled ?? false, details, previous?.expanded ?? false);
      return Object.freeze({ teamId: team.id, enabled: subcard.enabled,
        remainingWorkload, isExpanded: subcard.isExpanded });
    });
    controls.fields.append(teamList);
    controls.create.disabled = portfolio.teams.length === 0;
  };
  const isDirty = (): boolean => {
    const values = snapshot();
    return values.name !== "" || values.programId !== "" || values.priorityFamilyId !== "" ||
      values.earliestStartDate !== "" || values.objectiveEndDate !== "" || values.mandatory ||
      [...values.teams.values()].some((team) => team.enabled || team.remainingWorkload !== "");
  };
  const close = (restoreFocus: boolean): void => {
    controls.container.hidden = true;
    render();
    clearError();
    if (restoreFocus) input.onClose();
  };
  const requestClose = (): boolean => {
    if (controls.container.hidden) return true;
    if (isDirty() && !input.confirmDiscard("Discard unapplied Create Project changes?")) return false;
    close(true);
    return true;
  };
  const onCancel = (): void => { requestClose(); };
  const onSubmit = (event: SubmitEvent): void => {
    event.preventDefault();
    if (portfolio.teams.length === 0) return;
    const parsed = parseProjectFields({
      name: name.value, programId: program.value, priorityFamilyId: priorityFamily.value,
      earliestStartDate: earliestStartDate.value, objectiveEndDate: objectiveEndDate.value,
      mandatory: mandatory.checked,
      requirements: rows.map((row) => ({ teamId: row.teamId, enabled: row.enabled.checked,
        remainingWorkload: row.remainingWorkload.value, remainingWorkloadExact: "",
        remainingWorkloadDirty: true })),
    });
    if (!parsed.ok) return showErrors(parsed.errors);
    if (parsed.fields.teamRequirements.length === 0) {
      return showErrors([{ code: "EMPTY_PROJECT_REQUIREMENTS", path: "requirements",
        message: "Project must have at least one team requirement." }]);
    }
    const result = input.onCreate({ kind: "create-project", ...parsed.fields });
    if (!result.ok) return showErrors(result.errors);
    close(false);
  };
  controls.cancel.addEventListener("click", onCancel);
  controls.form.addEventListener("submit", onSubmit);
  render();
  return Object.freeze({
    open: () => { render(); clearError(); controls.container.hidden = false; name.focus(); },
    requestClose,
    isOpen: () => !controls.container.hidden,
    isTeamEnabled: (teamId: TeamId) => !controls.container.hidden &&
      rows.some((row) => row.teamId === teamId && row.enabled.checked),
    setPortfolio: (next: Portfolio) => {
      const saved = controls.container.hidden ? undefined : snapshot();
      portfolio = next;
      render(saved);
    },
    destroy: () => {
      controls.cancel.removeEventListener("click", onCancel);
      controls.form.removeEventListener("submit", onSubmit);
    },
  });
}
