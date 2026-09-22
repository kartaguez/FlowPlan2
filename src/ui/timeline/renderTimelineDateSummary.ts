import type {
  TimelineProject,
  TimelineViewModel,
} from "../../adapters/index.js";
import {
  serializeQuantity,
  type CivilDate,
  type ProjectId,
} from "../../domain/index.js";

export interface RenderTimelineDateSummaryInput {
  readonly container: HTMLElement;
  readonly viewModel: TimelineViewModel;
  readonly selectedDate: CivilDate;
}

export function renderTimelineDateSummary(
  input: RenderTimelineDateSummaryInput,
): void {
  const document = input.container.ownerDocument;
  const projectsById = indexProjects(input.viewModel.projects);
  const heading = document.createElement("h3");
  heading.className = "timeline-date-summary-heading";
  heading.textContent = `Selected date: ${input.selectedDate}`;

  const teams = document.createElement("div");
  teams.className = "timeline-date-summary-teams";
  for (const team of input.viewModel.teams) {
    const capacity = team.capacities.find(
      (candidate) => candidate.date === input.selectedDate,
    );
    if (capacity === undefined) {
      throw new TypeError(
        `Team ${team.id} has no capacity for ${input.selectedDate}.`,
      );
    }

    const teamElement = document.createElement("section");
    teamElement.className = "timeline-date-summary-team";
    teamElement.setAttribute("data-team-id", team.id);
    const teamHeading = document.createElement("h4");
    teamHeading.className = "timeline-date-summary-team-label";
    teamHeading.textContent = team.label;
    const capacities = document.createElement("p");
    capacities.className = "timeline-date-summary-capacities";
    capacities.textContent = [
      `Effective ${serializeQuantity(capacity.effectiveCapacity)}`,
      `Reserved ${serializeQuantity(capacity.reservedCapacity)}`,
      `Project ${serializeQuantity(capacity.projectCapacity)}`,
    ].join(" · ");
    const allocations = document.createElement("ul");
    allocations.className = "timeline-date-summary-allocations";
    const allocationsForDate = team.allocations.filter(
      (allocation) => allocation.date === input.selectedDate,
    );
    if (allocationsForDate.length === 0) {
      const empty = document.createElement("li");
      empty.className = "timeline-date-summary-allocation-empty";
      empty.textContent = "No project allocation.";
      allocations.append(empty);
    } else {
      for (const allocation of allocationsForDate) {
        const project = projectsById.get(allocation.projectId);
        if (project === undefined) {
          throw new TypeError(`Unknown timeline project ${allocation.projectId}.`);
        }
        const item = document.createElement("li");
        item.className = "timeline-date-summary-allocation";
        item.setAttribute("data-project-id", allocation.projectId);
        item.textContent = `${project.label}: ${serializeQuantity(allocation.workload)}`;
        allocations.append(item);
      }
    }
    teamElement.append(teamHeading, capacities, allocations);
    teams.append(teamElement);
  }

  input.container.replaceChildren(heading, teams);
}

function indexProjects(
  projects: readonly TimelineProject[],
): ReadonlyMap<ProjectId, TimelineProject> {
  const indexed = new Map<ProjectId, TimelineProject>();
  for (const project of projects) {
    if (indexed.has(project.id)) {
      throw new TypeError(`Duplicate timeline project ${project.id}.`);
    }
    indexed.set(project.id, project);
  }
  return indexed;
}
