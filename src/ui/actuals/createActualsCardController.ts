import type { ActualsViewModel } from "../../application/index.js";
import type { DomainError, TeamId } from "../../domain/index.js";
import { parseActualsCommand, type ParsedActualsCommand } from "./parseActualsCommand.js";
import { updateConsumedSuggestion, type ActualsDraftStore, type ActualsTeamDraft } from "./actualsDraftStore.js";

export interface ActualsCardController {
  readonly destroy: () => void;
}
export interface ActualsCardControllerInput {
  readonly host: HTMLElement;
  readonly model: ActualsViewModel;
  readonly store: ActualsDraftStore;
  readonly proposedDate: string;
  readonly onDraftChange: () => void;
  readonly conflict: () => string | undefined;
  readonly onApply: (command: Extract<ParsedActualsCommand, { ok: true }>["command"]) =>
    { readonly ok: true } | { readonly ok: false; readonly errors: readonly DomainError[] };
}

export function createActualsCardController(input: ActualsCardControllerInput): ActualsCardController {
  const document = input.host.ownerDocument;
  const model = input.model;
  const section = document.createElement("section");
  section.className = "card-actuals";
  section.setAttribute("aria-label", `${model.kind === "project" ? "Project" : "Reservation"} Actuals`);
  const heading = document.createElement("h3");
  heading.textContent = "Recorded Actuals";
  const history = document.createElement("ol");
  history.className = "card-actuals-history";
  if (model.records.length === 0) {
    const empty = document.createElement("p");
    empty.textContent = "No Actuals recorded yet.";
    section.append(heading, empty);
  } else {
    model.records.forEach((record, index) => {
      const item = document.createElement("li");
      const start = index === 0 ? model.actualsFromDate : model.records[index - 1]!.actualsThroughDate;
      const period = document.createElement("strong");
      period.textContent = `${index === 0 ? "[" : "("}${start}, ${record.actualsThroughDate}]`;
      item.append(period);
      const list = document.createElement("ul");
      for (const team of record.teams) {
        const row = document.createElement("li");
        row.textContent = `${team.label}: cumulative consumed ${team.cumulativeConsumedExact}${team.remainingWorkloadExact === undefined ? "" : `; RAF ${team.remainingWorkloadExact}`}`;
        list.append(row);
      }
      if (record.teams.length === 0) {
        const row = document.createElement("li");
        row.textContent = "No Teams in this photo.";
        list.append(row);
      }
      item.append(list);
      history.append(item);
    });
    section.append(heading, history);
  }
  const toggle = document.createElement("button");
  toggle.type = "button";
  toggle.textContent = "New Actuals photo";
  const form = document.createElement("form");
  form.className = "card-actuals-form";
  form.setAttribute("aria-label", "New Actuals photo");
  const fields = document.createElement("div");
  const error = document.createElement("p");
  error.className = "application-error";
  error.setAttribute("role", "alert");
  error.hidden = true;
  const apply = document.createElement("button");
  apply.type = "submit";
  apply.textContent = "Apply Actuals";
  const cancel = document.createElement("button");
  cancel.type = "button";
  cancel.textContent = "Cancel Actuals";
  form.append(fields, error, apply, cancel);
  section.append(toggle, form);
  input.host.append(section);
  input.store.initialize(model, input.proposedDate);
  const fieldTargets = new Map<string, HTMLInputElement>();

  const showErrors = (messages: readonly string[], paths: readonly string[] = []): void => {
    error.textContent = messages.join(" ");
    error.hidden = messages.length === 0;
    for (const field of fieldTargets.values()) field.removeAttribute?.("aria-invalid");
    let first: HTMLInputElement | undefined;
    for (const path of paths) {
      const teamIndex = /teams\[(\d+)\]/.exec(path)?.[1];
      const key = teamIndex === undefined
        ? path.includes("actualsFromDate") ? "from" : path.includes("actualsThroughDate") ? "through" : undefined
        : `team-${teamIndex}-${path.includes("remainingWorkload") ? "raf" : "consumed"}`;
      const field = key === undefined ? undefined : fieldTargets.get(key);
      if (field) { field.setAttribute("aria-invalid", "true"); first ??= field; }
    }
    first?.focus();
    const draft = input.store.get(model.id);
    if (draft) input.store.update(model.id, { ...draft, errors: messages });
  };
  const render = (): void => {
    const draft = input.store.get(model.id)!;
    form.hidden = !draft.open;
    toggle.hidden = draft.open;
    fields.replaceChildren();
    fieldTargets.clear();
    if (!draft.open) return;
    const addInput = (parent: HTMLElement, labelText: string, type: string, value: string): HTMLInputElement => {
      const label = document.createElement("label");
      label.textContent = labelText;
      const field = document.createElement("input");
      field.type = type;
      field.value = value;
      label.append(field);
      parent.append(label);
      return field;
    };
    if (model.records.length === 0) {
      const from = addInput(fields, "Actuals from date", "date", draft.from);
      fieldTargets.set("from", from);
      from.addEventListener("input", () => {
        input.store.update(model.id, { ...input.store.get(model.id)!, from: from.value });
        input.onDraftChange();
      });
    }
    const through = addInput(fields, "Actuals through date", "date", draft.through);
    fieldTargets.set("through", through);
    through.addEventListener("input", () => {
      input.store.update(model.id, { ...input.store.get(model.id)!, through: through.value });
      input.onDraftChange();
    });
    for (const team of model.teams) {
      const row = draft.teams.find((item) => item.teamId === team.teamId)!;
      const group = document.createElement("fieldset");
      const legend = document.createElement("legend");
      legend.textContent = team.label;
      group.append(legend);
      const consumed = addInput(group, "Cumulative consumed", "text", row.consumed);
      const raf = model.kind === "project" ? addInput(group, "New RAF (editable suggestion)", "text", row.raf ?? "") : undefined;
      fieldTargets.set(`team-${model.teams.indexOf(team)}-consumed`, consumed);
      if (raf) fieldTargets.set(`team-${model.teams.indexOf(team)}-raf`, raf);
      const updateRow = (teamId: TeamId, update: (row: ActualsTeamDraft) => ActualsTeamDraft): void => {
        const current = input.store.get(model.id)!;
        input.store.update(model.id, { ...current, teams: current.teams.map((item) => item.teamId === teamId ? update(item) : item) });
        input.onDraftChange();
      };
      consumed.addEventListener("input", () => updateRow(team.teamId, (current) => {
        const next = updateConsumedSuggestion(current, team, consumed.value);
        if (raf && !current.rafEdited) raf.value = next.raf ?? "";
        return next;
      }));
      raf?.addEventListener("input", () => updateRow(team.teamId, (current) => ({ ...current, raf: raf.value, rafEdited: true, unresolved: false })));
      fields.append(group);
    }
    error.textContent = draft.errors.join(" ");
    error.hidden = draft.errors.length === 0;
  };
  const onOpen = (): void => {
    const draft = input.store.get(model.id)!;
    input.store.update(model.id, { ...draft, open: true });
    render(); input.onDraftChange();
    (fields.querySelector?.("input") as HTMLInputElement | null)?.focus();
  };
  const onCancel = (): void => {
    input.store.cancel(model.id);
    input.store.initialize(model, input.proposedDate);
    render(); input.onDraftChange(); toggle.focus();
  };
  const onSubmit = (event: SubmitEvent): void => {
    event.preventDefault();
    const conflict = input.conflict();
    if (conflict) { showErrors([conflict]); return; }
    const draft = input.store.get(model.id)!;
    const parsed = parseActualsCommand(model, draft);
    if (!parsed.ok) { showErrors(parsed.errors.map((entry) => `${entry.path}: ${entry.message}`),
      parsed.errors.map((entry) => entry.path)); return; }
    const result = input.onApply(parsed.command);
    if (!result.ok) showErrors(result.errors.map((entry) => `${entry.path}: ${entry.message}`),
      result.errors.map((entry) => entry.path));
  };
  toggle.addEventListener("click", onOpen);
  cancel.addEventListener("click", onCancel);
  form.addEventListener("submit", onSubmit);
  render();
  return { destroy: () => {
    toggle.removeEventListener("click", onOpen);
    cancel.removeEventListener("click", onCancel);
    form.removeEventListener("submit", onSubmit);
  } };
}
