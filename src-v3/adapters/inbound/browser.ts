import type { ProjectPlanningResult } from "../../application/usecases/createAndProjectPlanning.js";
import type { PlanningInput, ProjectInput } from "../../domain/planning.js";

type ProjectPlanning = (input: PlanningInput) => ProjectPlanningResult;

function requiredElement<T extends Element>(root: ParentNode, selector: string): T {
  const element = root.querySelector<T>(selector);
  if (!element) throw new Error(`Missing V3 element: ${selector}`);
  return element;
}

function cell(row: HTMLTableRowElement, value: string): void {
  const element = document.createElement("td");
  element.textContent = value;
  row.append(element);
}

export function mountPlanningForm(root: Document, projectPlanning: ProjectPlanning): void {
  const form = requiredElement<HTMLFormElement>(root, "#planning-form");
  const status = requiredElement<HTMLElement>(root, "#form-status");
  const result = requiredElement<HTMLElement>(root, "#result");
  const title = requiredElement<HTMLElement>(root, "#result-title");
  const dayRows = requiredElement<HTMLTableSectionElement>(root, "#day-rows");
  const projectRows = requiredElement<HTMLTableSectionElement>(root, "#project-rows");
  let current: Extract<ProjectPlanningResult, { ok: true }> | null = null;

  const read = (field: string): string => requiredElement<HTMLInputElement>(form, `[data-field="${field}"]`).value;
  const readProject = (index: number): ProjectInput => ({
    id: read(`projects.${index}.id`),
    name: read(`projects.${index}.name`),
    earliestStart: read(`projects.${index}.earliestStart`),
    etc: read(`projects.${index}.etc`),
    priority: read(`projects.${index}.priority`),
  });
  const readPlanning = (): PlanningInput => ({
    name: read("name"),
    startDate: read("startDate"),
    endDate: read("endDate"),
    team: {
      id: read("team.id"),
      name: read("team.name"),
      dailyCapacity: read("team.dailyCapacity"),
    },
    projects: [readProject(0), readProject(1)],
  });

  const clearErrors = (): void => {
    form.querySelectorAll<HTMLElement>("[data-error-for]").forEach(element => { element.textContent = ""; });
    form.querySelectorAll<HTMLInputElement>("[data-field]").forEach(element => element.removeAttribute("aria-invalid"));
  };

  const render = (value: Extract<ProjectPlanningResult, { ok: true }>): void => {
    title.textContent = `${value.planning.name} — ${value.planning.startDate} au ${value.planning.endDate}`;
    const names = new Map(value.planning.projects.map(project => [project.id, project.name]));
    const days = document.createDocumentFragment();
    for (const day of value.projection.days) {
      const row = document.createElement("tr");
      row.dataset.date = day.date;
      cell(row, day.date);
      cell(row, day.available);
      cell(row, day.allocated);
      cell(row, day.unused);
      cell(row, day.allocations.map(allocation => `${names.get(allocation.projectId)} (${allocation.projectId}) : ${allocation.quantity}`).join(" ; ") || "—");
      days.append(row);
    }
    dayRows.replaceChildren(days);

    const projects = document.createDocumentFragment();
    for (const projection of value.projection.projects) {
      const row = document.createElement("tr");
      row.dataset.projectId = projection.projectId;
      cell(row, `${names.get(projection.projectId)} (${projection.projectId})`);
      cell(row, projection.initialEtc);
      cell(row, projection.planned);
      cell(row, projection.unplanned);
      cell(row, projection.estimatedStart ?? "—");
      cell(row, projection.estimatedFinish ?? "—");
      cell(row, projection.fullyPlanned ? "100 % planifié" : "Incomplet");
      projects.append(row);
    }
    projectRows.replaceChildren(projects);
    result.hidden = false;
  };

  form.addEventListener("submit", event => {
    event.preventDefault();
    clearErrors();
    const next = projectPlanning(readPlanning());
    if (!next.ok) {
      for (const error of next.errors) {
        const message = form.querySelector<HTMLElement>(`[data-error-for="${error.field}"]`);
        if (message) message.textContent = error.message;
        const input = form.querySelector<HTMLInputElement>(`[data-field="${error.field}"]`);
        input?.setAttribute("aria-invalid", "true");
      }
      status.textContent = "Corrigez les champs indiqués. Le dernier résultat valide reste affiché.";
      return;
    }
    current = next;
    render(current);
    status.textContent = "Planning calculé.";
  });
}
