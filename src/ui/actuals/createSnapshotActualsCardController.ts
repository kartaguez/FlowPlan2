import type { SnapshotActualsViewModel, ReplaceProjectActualsCommand, ReplaceReservationActualsCommand } from "../../application/index.js";
import { serializeQuantity, type DomainError } from "../../domain/index.js";
import { parseSnapshotActualsCommand } from "./parseSnapshotActualsCommand.js";
import type { SnapshotActualsDraftStore, SnapshotPeriodDraft } from "./snapshotActualsDraftStore.js";

export interface SnapshotActualsCardControllerInput {
  readonly host: HTMLElement;
  readonly model: SnapshotActualsViewModel;
  readonly store: SnapshotActualsDraftStore;
  readonly onDraftChange: () => void;
  readonly conflict: () => string | undefined;
  readonly onApply: (command: ReplaceProjectActualsCommand | ReplaceReservationActualsCommand) =>
    { readonly ok: true } | { readonly ok: false; readonly errors: readonly DomainError[] };
}

export function createSnapshotActualsCardController(input: SnapshotActualsCardControllerInput): { destroy(): void } {
  const document = input.host.ownerDocument;
  const model = input.model;
  const section = document.createElement("section");
  section.className = "card-actuals card-actuals--snapshots";
  section.setAttribute("aria-label", `${model.kind === "project" ? "Project" : "Reservation"} Actuals`);
  const heading = document.createElement("h3");
  heading.textContent = "Actuals knowledge";
  section.append(heading);
  const current = model.snapshots.at(-1);
  const status = document.createElement("p");
  status.textContent = current ? `Current snapshot v${current.version}, known ${current.knowledgeDate}${current.coverage ? `, coverage ${current.coverage.actualsFrom} to ${current.coverage.actualsThrough}` : ", no Actuals coverage"}.`
    : model.legacyV4Actuals ? "Legacy V4 Actuals await explicit reconciliation." : "No Actuals snapshot yet.";
  section.append(status);
  if (model.legacyV4Actuals) {
    const legacy = document.createElement("details");
    const title = document.createElement("summary");
    title.textContent = "Legacy V4 history (read only)";
    legacy.append(title);
    const list = document.createElement("ol");
    model.legacyV4Actuals.records.forEach((record) => {
      const item = document.createElement("li");
      item.textContent = `Through ${record.actualsThroughDate}: ${record.teams.map((row) =>
        `${model.teams.find((team) => team.teamId === row.teamId)?.label ?? row.teamId} cumulative ${serializeQuantity(row.cumulativeConsumed)}`)
        .join("; ") || "no Teams"}`;
      list.append(item);
    });
    list.className = "card-actuals-history";
    legacy.append(list); section.append(legacy);
  }
  if (model.snapshots.length) {
    const history = document.createElement("details");
    const title = document.createElement("summary");
    title.textContent = "Snapshot history (read only)";
    history.append(title);
    const list = document.createElement("ol");
    model.snapshots.forEach((snapshot) => {
      const item = document.createElement("li");
      const periodText = snapshot.coverage?.periods.map((period) => `${period.periodId} [${period.from}, ${period.through}]: ${period.consumed.map((row) =>
        `${row.teamId} ${serializeQuantity(row.amount)}`).join(", ")}`).join("; ") ?? "no coverage";
      const rafText = "raf" in snapshot ? `; RAF ${snapshot.raf.map((row) => `${row.teamId} ${serializeQuantity(row.amount)}`).join(", ")}` : "";
      item.textContent = `v${snapshot.version} ${snapshot.knowledgeDate} — ${periodText}${rafText}`;
      list.append(item);
    });
    list.className = "card-actuals-history";
    history.append(list); section.append(history);
  }
  const toggle = document.createElement("button");
  toggle.type = "button";
  toggle.textContent = current ? "Edit current Actuals knowledge" : model.legacyV4Actuals ? "Reconcile legacy Actuals" : "Record Actuals knowledge";
  const form = document.createElement("form");
  form.className = "card-actuals-form card-actuals-form--snapshots";
  form.setAttribute("aria-label", "Current Actuals snapshot editor");
  const fields = document.createElement("div");
  const error = document.createElement("p");
  error.className = "application-error";
  error.setAttribute("role", "alert");
  const apply = document.createElement("button");
  apply.type = "submit"; apply.textContent = "Apply Actuals snapshot";
  const cancel = document.createElement("button");
  cancel.type = "button"; cancel.textContent = "Cancel Actuals";
  form.append(fields, error, apply, cancel);
  section.append(toggle, form);
  input.host.append(section);
  input.store.initialize(model);

  const update = (change: (draft: NonNullable<ReturnType<typeof input.store.get>>) => NonNullable<ReturnType<typeof input.store.get>>,
    rerender = false): void => {
    input.store.update(model.id, change(input.store.get(model.id)!));
    input.onDraftChange();
    if (rerender) render();
  };
  const textInput = (parent: HTMLElement, labelText: string, value: string, onInput: (value: string) => void,
    type = "text"): HTMLInputElement => {
    const label = document.createElement("label"); label.textContent = labelText;
    const field = document.createElement("input"); field.type = type; field.value = value;
    field.addEventListener("input", () => onInput(field.value));
    label.append(field); parent.append(label); return field;
  };
  const check = (parent: HTMLElement, labelText: string, checked: boolean, onChange: (value: boolean) => void): HTMLInputElement => {
    const label = document.createElement("label");
    label.className = "card-actuals-check";
    const field = document.createElement("input"); field.type = "checkbox"; field.checked = checked;
    field.addEventListener("change", () => onChange(field.checked));
    label.append(field, document.createTextNode(labelText)); parent.append(label); return field;
  };
  const blankPeriod = (): SnapshotPeriodDraft => ({ from: "", through: "", values: model.teams.map((team) => ({ teamId: team.teamId, text: "" })) });
  const render = (): void => {
    const draft = input.store.get(model.id)!;
    form.hidden = !draft.open; toggle.hidden = draft.open;
    fields.replaceChildren();
    error.textContent = draft.errors.join(" "); error.hidden = draft.errors.length === 0;
    if (!draft.open) return;
    const intro = document.createElement("p");
    intro.textContent = "Each row is an inclusive exact period. Add, remove or change rows to extend, split, merge, replace or erode coverage. Leave no rows for RAF-only Project knowledge or total erosion.";
    fields.append(intro);
    const membership = document.createElement("fieldset");
    const legend = document.createElement("legend"); legend.textContent = "Participating Teams and current Forecast membership";
    membership.append(legend);
    for (const team of model.teams) {
      const row = draft.teams.find((item) => item.teamId === team.teamId)!;
      const group = document.createElement("div");
      check(group, team.label, row.enabled, (enabled) => update((old) => ({ ...old,
        teams: old.teams.map((item) => item.teamId === team.teamId ? { ...item, enabled } : item),
        confirmed: false }), true));
      if (row.enabled && model.kind === "project") textInput(group, `${team.label} current RAF (exact)`, row.raf,
        (value) => update((old) => ({ ...old, teams: old.teams.map((item) => item.teamId === team.teamId ? { ...item, raf: value } : item), confirmed: false })));
      if (row.enabled && model.kind === "reservation") {
        const select = document.createElement("select");
        for (const kind of ["ratio", "fixed-daily"] as const) {
          const option = document.createElement("option"); option.value = kind; option.textContent = kind; select.append(option);
        }
        select.value = row.allocationKind;
        select.addEventListener("change", () => update((old) => ({ ...old, teams: old.teams.map((item) =>
          item.teamId === team.teamId ? { ...item, allocationKind: select.value as typeof item.allocationKind } : item), confirmed: false })));
        group.append(select);
        textInput(group, `${team.label} Forecast allocation (exact)`, row.allocationValue,
          (value) => update((old) => ({ ...old, teams: old.teams.map((item) => item.teamId === team.teamId ? { ...item, allocationValue: value } : item), confirmed: false })));
      }
      membership.append(group);
    }
    fields.append(membership);
    const table = document.createElement("table");
    const matrixHint = document.createElement("p");
    matrixHint.className = "card-actuals-matrix-hint";
    matrixHint.textContent = "Scroll the matrix sideways to review every Team value and period action.";
    fields.append(matrixHint);
    const caption = document.createElement("caption"); caption.textContent = "Current common Actuals partition"; table.append(caption);
    const header = document.createElement("tr");
    for (const title of ["From", "Through", ...draft.teams.filter((row) => row.enabled).map((row) => model.teams.find((team) => team.teamId === row.teamId)!.label), "Action"]) {
      const cell = document.createElement("th"); cell.textContent = title; header.append(cell);
    }
    table.append(header);
    draft.periods.forEach((period, index) => {
      const tr = document.createElement("tr");
      const dateCell = (label: string, value: string, field: "from" | "through") => {
        const cell = document.createElement("td");
        textInput(cell, label, value, (text) => update((old) => ({ ...old, periods: old.periods.map((item, i) =>
          i === index ? { ...item, [field]: text } : item), confirmed: false })), "date");
        tr.append(cell);
      };
      dateCell("From", period.from, "from"); dateCell("Through", period.through, "through");
      for (const team of draft.teams.filter((row) => row.enabled)) {
        const cell = document.createElement("td");
        textInput(cell, `${team.teamId} consumed`, period.values.find((value) => value.teamId === team.teamId)?.text ?? "",
          (text) => update((old) => ({ ...old, periods: old.periods.map((item, i) => i === index ? { ...item,
            values: [...item.values.filter((value) => value.teamId !== team.teamId), { teamId: team.teamId, text }] } : item), confirmed: false })));
        tr.append(cell);
      }
      const actions = document.createElement("td");
      const addAfter = document.createElement("button"); addAfter.type = "button"; addAfter.textContent = "Insert after";
      addAfter.addEventListener("click", () => update((old) => ({ ...old,
        periods: [...old.periods.slice(0, index + 1), blankPeriod(), ...old.periods.slice(index + 1)], confirmed: false }), true));
      const remove = document.createElement("button"); remove.type = "button"; remove.textContent = "Remove period";
      remove.addEventListener("click", () => update((old) => ({ ...old,
        periods: old.periods.filter((_, i) => i !== index), confirmed: false }), true));
      actions.append(addAfter, remove); tr.append(actions); table.append(tr);
    });
    const tableScroll = document.createElement("div");
    tableScroll.className = "card-actuals-matrix-scroll";
    tableScroll.setAttribute("role", "region");
    tableScroll.setAttribute("aria-label", "Actuals Team by period matrix");
    tableScroll.append(table);
    fields.append(tableScroll);
    const prepend = document.createElement("button"); prepend.type = "button"; prepend.textContent = "Prepend period";
    prepend.addEventListener("click", () => update((old) => ({ ...old, periods: [blankPeriod(), ...old.periods], confirmed: false }), true));
    const append = document.createElement("button"); append.type = "button"; append.textContent = "Append period";
    append.addEventListener("click", () => update((old) => ({ ...old, periods: [...old.periods, blankPeriod()], confirmed: false }), true));
    fields.append(prepend, append);
    check(fields, "I confirm every current period value and Project RAF shown above", draft.confirmed,
      (confirmed) => update((old) => ({ ...old, confirmed })));
    if (current?.participation.some((id) => !draft.teams.some((row) => row.teamId === id && row.enabled))) {
      check(fields, "I confirm retired Teams have current Actuals 0 and Project RAF 0", draft.retirementConfirmed,
        (retirementConfirmed) => update((old) => ({ ...old, retirementConfirmed })));
    }
    if (draft.stale) { error.textContent = "The base snapshot changed. Cancel and review the new current knowledge."; error.hidden = false; }
  };
  const onOpen = () => { update((old) => ({ ...old, open: true }), true); fields.querySelector?.("input")?.focus(); };
  const onCancel = () => { input.store.cancel(model.id); input.store.initialize(model); render(); input.onDraftChange(); toggle.focus(); };
  const onSubmit = (event: SubmitEvent) => {
    event.preventDefault();
    const conflict = input.conflict();
    if (conflict) { error.textContent = conflict; error.hidden = false; return; }
    const draft = input.store.get(model.id)!;
    const parsed = parseSnapshotActualsCommand(model, draft);
    if (!parsed.ok) { error.textContent = parsed.errors.map((item) => `${item.path}: ${item.message}`).join(" "); error.hidden = false; return; }
    const result = input.onApply(parsed.command);
    if (!result.ok) { error.textContent = result.errors.map((item) => `${item.path}: ${item.message}`).join(" "); error.hidden = false; }
  };
  toggle.addEventListener("click", onOpen); cancel.addEventListener("click", onCancel); form.addEventListener("submit", onSubmit);
  render();
  return { destroy: () => { toggle.removeEventListener("click", onOpen); cancel.removeEventListener("click", onCancel); form.removeEventListener("submit", onSubmit); } };
}
