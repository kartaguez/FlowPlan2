import type { ProjectEditControls, ReservationEditControls } from "../renderApp.js";

export function createProjectCardControls(document: Document, id: string): {
  controls: ProjectEditControls; error: HTMLElement;
} {
  const container = document.createElement("section");
  container.className = "timeline-project-edit";
  container.setAttribute("aria-label", "Project editor");
  const form = document.createElement("form");
  form.className = "timeline-project-edit-form";
  const fields = document.createElement("div");
  fields.className = "timeline-project-edit-fields";
  const status = document.createElement("p");
  status.hidden = true;
  const error = document.createElement("p");
  error.id = `project-edit-error-${id}`;
  error.className = "application-error";
  error.setAttribute("role", "alert");
  error.hidden = true;
  form.setAttribute("aria-describedby", error.id);
  const cancel = document.createElement("button");
  cancel.type = "button";
  cancel.textContent = "Cancel";
  const apply = document.createElement("button");
  apply.type = "submit";
  apply.textContent = "Apply";
  const actions = document.createElement("div");
  actions.className = "timeline-project-edit-actions";
  actions.append(cancel, apply);
  form.append(fields, error, actions);
  container.append(form);
  return { controls: { container, form, fields, status, apply, cancel }, error };
}

export function createReservationCardControls(document: Document, id: string): {
  controls: ReservationEditControls; error: HTMLElement;
} {
  const container = document.createElement("section");
  container.className = "timeline-reservation-edit";
  container.setAttribute("aria-label", "Reservation editor");
  const form = document.createElement("form");
  form.className = "timeline-reservation-edit-form";
  const fields = document.createElement("div");
  fields.className = "timeline-reservation-edit-fields";
  const status = document.createElement("p");
  status.hidden = true;
  const title = document.createElement("h3");
  title.hidden = true;
  const error = document.createElement("p");
  error.id = `reservation-edit-error-${id}`;
  error.className = "reservation-edit-error";
  error.setAttribute("role", "alert");
  error.hidden = true;
  form.setAttribute("aria-describedby", error.id);
  const cancel = document.createElement("button");
  cancel.type = "button";
  cancel.textContent = "Cancel";
  const apply = document.createElement("button");
  apply.type = "submit";
  apply.textContent = "Apply";
  const actions = document.createElement("div");
  actions.className = "timeline-reservation-edit-actions";
  actions.append(cancel, apply);
  form.append(fields, error, actions);
  container.append(form);
  return { controls: { container, title, form, fields, status, apply, cancel }, error };
}
