import type { TeamId } from "../../domain/index.js";

let nextId = 0;

export interface TeamSubcard {
  readonly enabled: HTMLInputElement;
  readonly details: HTMLElement;
}

export function createTeamSubcard(
  parent: HTMLElement,
  entity: "Project" | "Reservation",
  teamId: TeamId,
  teamLabel: string,
  initiallyEnabled: boolean,
  content: HTMLElement,
): TeamSubcard {
  const document = parent.ownerDocument;
  const card = document.createElement("section");
  card.className = "portfolio-team-card";
  card.dataset.teamId = teamId;
  const header = document.createElement("div");
  header.className = "portfolio-team-card-header";
  const label = document.createElement("label");
  label.className = "portfolio-team-toggle";
  const enabled = document.createElement("input");
  enabled.type = "checkbox";
  enabled.checked = initiallyEnabled;
  enabled.setAttribute("aria-label", `${entity} enabled for ${teamLabel}`);
  label.textContent = ` ${teamLabel}`;
  label.prepend(enabled);
  const expand = document.createElement("button");
  expand.type = "button";
  expand.className = "portfolio-team-expand";
  expand.textContent = "Details";
  expand.setAttribute("aria-label", `Show ${teamLabel} details`);
  const details = document.createElement("div");
  details.className = "portfolio-team-details";
  details.id = `portfolio-team-details-${++nextId}`;
  expand.setAttribute("aria-controls", details.id);
  let expanded = false;
  const sync = (): void => {
    details.hidden = !expanded;
    expand.disabled = !enabled.checked;
    expand.setAttribute("aria-expanded", String(expanded));
    expand.textContent = expanded ? "Hide details" : "Show details";
    expand.setAttribute("aria-label", `${expanded ? "Hide" : "Show"} ${teamLabel} details`);
  };
  enabled.addEventListener("change", () => {
    expanded = enabled.checked;
    sync();
  });
  expand.addEventListener("click", () => {
    if (!enabled.checked) return;
    expanded = !expanded;
    sync();
  });
  details.append(content);
  header.append(label, expand);
  card.append(header, details);
  parent.append(card);
  sync();
  return Object.freeze({ enabled, details });
}
