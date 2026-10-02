import type { SnapshotActualsViewModel, ReplaceProjectActualsCommand, ReplaceReservationActualsCommand,
  UpdateProjectCommand, UpdateReservationCommand } from "../../application/index.js";
import { addDays, addRationals, createCivilDate, parseSerializedRational, rationalFromInteger, rationalOf,
  rationalToCanonicalString, serializeQuantity, type DomainError } from "../../domain/index.js";
import { parseExactQuantityInput } from "../../application/index.js";
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

export function createSnapshotActualsCardController(input: SnapshotActualsCardControllerInput): {
  destroy(): void;
  openHandoff(command: UpdateProjectCommand | UpdateReservationCommand): void;
} {
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
    : model.legacyV4Actuals ? "Legacy V4 Actuals await explicit reconciliation." +
      (model.kind === "project" ? " RAF values are Forecast suggestions." : "") :
      "No Actuals snapshot yet." + (model.kind === "project" ?
        " RAF values are Forecast suggestions, not recorded knowledge." : "");
  section.append(status);
  const summaryHint = document.createElement("p");
  summaryHint.className = "card-actuals-matrix-hint";
  summaryHint.textContent = model.kind === "project" ? "Scroll this table sideways to edit RAF." :
    "Scroll this table sideways to review every column.";
  section.append(summaryHint);
  const summary = document.createElement("div");
  summary.className = "card-actuals-matrix-scroll";
  summary.setAttribute("role", "region");
  summary.setAttribute("aria-label", "Current Actuals summary; scroll sideways for all columns");
  const summaryTable = document.createElement("table");
  const quickFields: { field: HTMLInputElement; teamId: string }[] = [];
  const summaryHead = document.createElement("tr");
  for (const label of ["Team", "Actuals from", "Consumed", "Actuals through", ...(model.kind === "project" ? ["RAF"] : [])]) {
    const th = document.createElement("th"); th.textContent = label; summaryHead.append(th);
  }
  summaryTable.append(summaryHead);
  for (const team of model.teams.filter((row) => row.participating)) {
    const tr = document.createElement("tr");
    const consumed = current?.coverage?.periods.reduce((total, period) => {
      const amount = period.consumed.find((row) => row.teamId === team.teamId)?.amount;
      return amount ? addRationals(total, rationalOf(amount)) : total;
    }, rationalFromInteger(0n)) ?? rationalFromInteger(0n);
    for (const value of [team.label, current?.coverage?.actualsFrom ?? "—", current?.coverage ? rationalToCanonicalString(consumed) : "—", current?.coverage?.actualsThrough ?? "—"]) {
      const td = document.createElement("td"); td.textContent = value; tr.append(td);
    }
    if (model.kind === "project") {
      const td = document.createElement("td");
      const label = document.createElement("label"); label.textContent = team.label + " RAF";
      const field = document.createElement("input"); field.type = "text"; field.setAttribute("data-raf-team", team.teamId);
      quickFields.push({ field, teamId: team.teamId });
      field.setAttribute("aria-label", team.label + " RAF (exact)");
      field.addEventListener("input", () => {
        const draft = input.store.get(model.id)!;
        input.store.update(model.id, { ...draft, errors: [], teams: draft.teams.map((row) => row.teamId === team.teamId ?
          { ...row, raf: field.value, rafConfirmed: true } : row) });
        input.onDraftChange(); renderQuick();
      });
      label.append(field); td.append(label); tr.append(td);
    }
    summaryTable.append(tr);
  }
  summary.append(summaryTable); section.append(summary);
  const quickActions = document.createElement("div"); quickActions.className = "card-actuals-actions";
  const applyRaf = document.createElement("button"); applyRaf.type = "button"; applyRaf.textContent = current ? "Apply RAF" : "Record initial RAF";
  const revertRaf = document.createElement("button"); revertRaf.type = "button"; revertRaf.textContent = "Revert RAF";
  const quickError = document.createElement("p"); quickError.className = "application-error"; quickError.setAttribute("role", "alert");
  if (model.kind === "project") { quickActions.append(applyRaf, revertRaf); section.append(quickActions, quickError); }
  const historyPanels: HTMLElement[] = [];
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
    legacy.append(list); historyPanels.push(legacy);
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
    history.append(list); historyPanels.push(history);
  }
  const toggle = document.createElement("button");
  toggle.type = "button";
  toggle.textContent = model.legacyV4Actuals && !current ? "Reconcile legacy Actuals" : "Update actuals";
  const form = document.createElement("form");
  form.className = "card-actuals-form card-actuals-form--snapshots";
  form.setAttribute("aria-label", "Current Actuals snapshot editor");
  const modalTitle = document.createElement("h2");
  modalTitle.textContent = model.kind === "project" ? "Update Project actuals" : "Update Reservation actuals";
  const fields = document.createElement("div");
  const error = document.createElement("p");
  error.className = "application-error";
  error.setAttribute("role", "alert");
  const apply = document.createElement("button");
  apply.type = "submit"; apply.textContent = "Apply Actuals snapshot";
  const next = document.createElement("button"); next.type = "button"; next.textContent = "Next";
  const back = document.createElement("button"); back.type = "button"; back.textContent = "Back";
  const review = document.createElement("button"); review.type = "button"; review.textContent = "Review new snapshot";
  const cancel = document.createElement("button");
  cancel.type = "button"; cancel.textContent = "Cancel Actuals";
  form.append(modalTitle, fields, error, review, back, next, apply, cancel);
  const modal = document.createElement("div");
  modal.className = "card-actuals-modal";
  modal.setAttribute("role", "dialog"); modal.setAttribute("aria-modal", "true");
  modal.setAttribute("aria-label", model.kind === "project" ? "Update Project actuals" : "Update Reservation actuals");
  modal.append(form);
  section.append(toggle, ...historyPanels);
  if (document.body) document.body.append(modal);
  else section.append(modal);
  input.host.append(section);
  input.store.initialize(model);

  const renderQuick = (): void => {
    if (model.kind !== "project") return;
    const draft = input.store.get(model.id)!;
    let changed = false;
    let valid = true;
    for (const { field, teamId } of quickFields) {
      const row = draft.teams.find((item) => item.teamId === teamId)!;
      if (document.activeElement !== field) field.value = row.raf;
      field.disabled = draft.modal !== undefined;
      const exact = parseExactQuantityInput(row.raf);
      if (exact === undefined || exact.startsWith("-")) valid = false;
      const committed = current && "raf" in current ? current.raf.find((item) => item.teamId === row.teamId) : undefined;
      if (exact !== undefined && (committed === undefined || exact !== serializeQuantity(committed.amount))) changed = true;
    }
    applyRaf.disabled = !valid || !changed || draft.modal !== undefined || draft.stale;
    revertRaf.disabled = draft.modal !== undefined || !draft.stale && !draft.teams.some((row) => row.enabled && row.raf !==
      (current && "raf" in current ? serializeQuantity(current.raf.find((item) => item.teamId === row.teamId)!.amount) :
        model.teams.find((team) => team.teamId === row.teamId)?.forecastRaf ?
          serializeQuantity(model.teams.find((team) => team.teamId === row.teamId)!.forecastRaf!) : ""));
    quickError.textContent = draft.stale ? "The Actuals snapshot changed. Review the open dialog or Revert RAF to use current values." :
      !valid ? "Enter an exact nonnegative RAF for each participating Team." : draft.errors.join(" ");
    quickError.hidden = valid && !draft.stale && !draft.errors.length;
  };
  applyRaf.addEventListener("click", () => {
    if (!current) { onOpen(); setModal((old) => ({ ...old, step: 3 })); return; }
    const draft = input.store.get(model.id)!;
    const parsed = parseSnapshotActualsCommand(model, { ...draft,
      teams: draft.teams.map((row) => ({ ...row, rafConfirmed: row.enabled &&
        (!current || (parseExactQuantityInput(row.raf) !== serializeQuantity((current as Extract<NonNullable<typeof current>, { raf: unknown }>).raf.find((item) => item.teamId === row.teamId)!.amount))) })) });
    if (!parsed.ok) { quickError.textContent = parsed.errors.map((item) => item.message).join(" "); quickError.hidden = false;
      input.store.update(model.id, { ...draft, errors: [quickError.textContent] }); return; }
    const result = input.onApply(parsed.command);
    if (!result.ok) { quickError.textContent = result.errors.map((item) => item.message).join(" "); quickError.hidden = false;
      input.store.update(model.id, { ...draft, errors: [quickError.textContent] }); }
  });
  revertRaf.addEventListener("click", () => {
    input.store.cancel(model.id);
    input.store.initialize(model);
    input.onDraftChange(); renderQuick();
  });

  const update = (change: (draft: NonNullable<ReturnType<typeof input.store.get>>) => NonNullable<ReturnType<typeof input.store.get>>,
    rerender = false): void => {
    const old = input.store.get(model.id)!;
    const working = old.modal ? { ...old, ...old.modal } : old;
    const changed = change(working);
    const errors = changed.errors === old.errors ? [] : changed.errors;
    const teams = working.periods.at(-1)?.through !== changed.periods.at(-1)?.through ?
      changed.teams.map((row) => ({ ...row, rafConfirmed: false })) : changed.teams;
    let selection = old.modal?.selection;
    if (selection && typeof selection === "object" && changed.periods.length !== working.periods.length) {
      const delta = changed.periods.length - working.periods.length;
      if (delta > 0 && changed.periods[1] === working.periods[0]) selection = { from: 0, through: 0 };
      else if (delta > 0 && changed.periods.at(-2) === working.periods.at(-1)) {
        selection = { from: changed.periods.length - 1, through: changed.periods.length - 1 };
      } else selection = { from: Math.min(selection.from, Math.max(0, changed.periods.length - 1)),
        through: Math.min(Math.max(selection.from, selection.through + delta), Math.max(0, changed.periods.length - 1)) };
    }
    input.store.update(model.id, old.modal ? { ...old, errors, modal: { ...old.modal,
      ...(selection === undefined ? {} : { selection }), periods: changed.periods, teams, confirmed: changed.confirmed,
      retirementConfirmed: changed.retirementConfirmed } } : { ...changed, errors });
    input.onDraftChange();
    if (rerender) render();
  };
  const setModal = (change: (modal: NonNullable<NonNullable<ReturnType<typeof input.store.get>>["modal"]>) =>
    NonNullable<NonNullable<ReturnType<typeof input.store.get>>["modal"]>): void => {
    const old = input.store.get(model.id)!;
    if (!old.modal) return;
    input.store.update(model.id, { ...old, modal: change(old.modal) });
    input.onDraftChange(); render();
    fields.querySelector?.<HTMLElement>("button, input")?.focus();
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
  const domainZero = (teamId: string, from: string, through: string): boolean => {
    const coverage = current?.coverage;
    if (!coverage || !current.participation.some((id) => id === teamId) ||
      from < coverage.actualsFrom || through > coverage.actualsThrough) return false;
    const overlapping = coverage.periods.filter((period) => period.from <= through && period.through >= from);
    return overlapping.length > 0 && overlapping.every((period) =>
      serializeQuantity(period.consumed.find((row) => row.teamId === teamId)!.amount) === "0/1");
  };
  const totals = (periods: readonly SnapshotPeriodDraft[], teams: readonly { teamId: string; enabled: boolean }[]): string =>
    teams.filter((team) => team.enabled).map((team) => {
      let sum = rationalFromInteger(0n);
      let valid = true;
      for (const period of periods) {
        const exact = parseExactQuantityInput(period.values.find((row) => row.teamId === team.teamId)?.text ?? "");
        const amount = exact === undefined ? undefined : parseSerializedRational(exact, "consumed");
        if (!amount?.ok) { valid = false; break; }
        sum = addRationals(sum, amount.value);
      }
      return (model.teams.find((row) => row.teamId === team.teamId)?.label ?? team.teamId) + ": " +
        (valid ? rationalToCanonicalString(sum) : "incomplete");
    }).join("; ");
  const render = (): void => {
    const base = input.store.get(model.id)!;
    const branch = base.modal;
    const draft = branch ? { ...base, ...branch } : base;
    modal.hidden = !branch; toggle.hidden = Boolean(branch);
    back.hidden = !branch || branch.step === 1;
    review.hidden = !branch || !draft.stale;
    next.hidden = !branch || branch.step === (model.kind === "project" ? 3 : 2);
    apply.hidden = !branch || branch.step !== (model.kind === "project" ? 3 : 2);
    renderQuick();
    fields.replaceChildren();
    error.textContent = draft.errors.join(" "); error.hidden = draft.errors.length === 0;
    if (!branch) return;
    const step = document.createElement("p");
    step.textContent = "Step " + branch.step + " of " + (model.kind === "project" ? "3" : "2");
    fields.append(step);
    if (branch.step === 1) {
      const hint = document.createElement("p");
      hint.textContent = "Choose a contiguous period range. Shift click or Shift plus arrow keys extends the selection.";
      fields.append(hint);
      const timeline = document.createElement("div"); timeline.className = "card-actuals-frieze";
      const tiles = draft.periods.length ? ["before", ...draft.periods.map((_, index) => String(index)), "after"] : ["initial"];
      const choose = (index: number, extend: boolean) => {
        if (!draft.periods.length) setModal((old) => ({ ...old, selection: "initial" }));
        else if (index === -1) setModal((old) => ({ ...old, selection: "before" }));
        else if (index === draft.periods.length) setModal((old) => ({ ...old, selection: "after" }));
        else setModal((old) => ({ ...old, anchor: extend ? old.anchor : index,
          selection: { from: Math.min(extend ? old.anchor : index, index), through: Math.max(extend ? old.anchor : index, index) } }));
        fields.querySelectorAll?.<HTMLButtonElement>(".card-actuals-frieze-tile")[index + 1]?.focus();
      };
      tiles.forEach((tile, position) => {
        const index = position - 1;
        const button = document.createElement("button"); button.type = "button";
        button.className = "card-actuals-frieze-tile";
        button.textContent = tile === "initial" ? "Create first Actuals period" :
          tile === "before" ? "+ before" : tile === "after" ? "+ after" :
          draft.periods[index]!.from + " → " + draft.periods[index]!.through;
        button.setAttribute("aria-pressed", String(typeof branch.selection === "object" && index >= branch.selection.from && index <= branch.selection.through || branch.selection === tile));
        button.addEventListener("click", (event) => choose(index, event.shiftKey));
        button.addEventListener("keydown", (event) => {
          if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
            event.preventDefault();
            const next = Math.max(0, Math.min(tiles.length - 1, position + (event.key === "ArrowRight" ? 1 : -1)));
            if (event.shiftKey) choose(next - 1, true);
            else timeline.querySelectorAll<HTMLButtonElement>(".card-actuals-frieze-tile")[next]?.focus();
          }
        });
        timeline.append(button);
        if (index >= 0 && index < draft.periods.length) {
          const extend = document.createElement("button"); extend.type = "button";
          extend.textContent = "Select through here";
          extend.setAttribute("aria-label", "Extend selection through " + draft.periods[index]!.through);
          extend.addEventListener("click", () => choose(index, true));
          timeline.append(extend);
        }
      });
      fields.append(timeline);
      const selected = document.createElement("p"); selected.setAttribute("aria-live", "polite");
      selected.textContent = typeof branch.selection === "object" ?
        "Selected: " + draft.periods[branch.selection.from]?.from + " to " + draft.periods[branch.selection.through]?.through :
        "Selected: " + branch.selection;
      fields.append(selected);
      return;
    }
    const intro = document.createElement("p");
    intro.textContent = "Edit inclusive dates and exact consumed amounts. Confirm suggested values after changing a period.";
    fields.append(intro);
    if (model.kind === "project" && branch.step === 3) {
      const title = document.createElement("h4"); title.textContent = "RAF and review"; fields.append(title);
      const coverage = document.createElement("p");
      coverage.textContent = "Coverage: " + (draft.periods[0]?.from ?? "—") + " to " + (draft.periods.at(-1)?.through ?? "—") +
        "; periods: " + draft.periods.length + "; consumed: " + totals(draft.periods, draft.teams);
      fields.append(coverage);
      for (const team of draft.teams.filter((row) => row.enabled)) {
        const label = model.teams.find((row) => row.teamId === team.teamId)?.label ?? team.teamId;
        const previous = current && "raf" in current ? current.raf.find((row) => row.teamId === team.teamId) : undefined;
        const required = !previous || current?.coverage?.actualsThrough !== draft.periods.at(-1)?.through ||
          parseExactQuantityInput(team.raf) !== serializeQuantity(previous.amount);
        const quick = base.teams.find((row) => row.teamId === team.teamId);
        if (quick && previous && parseExactQuantityInput(quick.raf) !== serializeQuantity(previous.amount)) {
          const provenance = document.createElement("p"); provenance.textContent = label + ": RAF from card draft.";
          fields.append(provenance);
        }
        textInput(fields, label + " RAF (exact)", team.raf, (value) => update((old) => ({ ...old,
          teams: old.teams.map((row) => row.teamId === team.teamId ? { ...row, raf: value, rafConfirmed: true } : row) })));
        check(fields, "Confirm " + label + " RAF" + (required ? " (required)" : ""), Boolean(team.rafConfirmed), (rafConfirmed) => update((old) => ({ ...old,
          teams: old.teams.map((row) => row.teamId === team.teamId ? { ...row, rafConfirmed } : row) })));
      }
      return;
    }
    const membership = document.createElement("fieldset");
    const legend = document.createElement("legend"); legend.textContent = "Participating Teams from Forecast (read only)";
    membership.append(legend);
    for (const team of model.teams) {
      const row = draft.teams.find((item) => item.teamId === team.teamId)!;
      const group = document.createElement("div");
      if (row.enabled) group.textContent = team.label;
      else continue;
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
      const editable = typeof branch.selection !== "object" ||
        index >= branch.selection.from && index <= branch.selection.through;
      const dateCell = (label: string, value: string, field: "from" | "through") => {
        const cell = document.createElement("td");
        const control = textInput(cell, label, value, (text) => update((old) => {
          const changed = [...old.periods];
          const currentPeriod = changed[index]!;
          if (text === currentPeriod[field]) return old;
          const date = createCivilDate(text);
          if (date.ok && index === 0 && field === "from" && currentPeriod.from === current?.coverage?.actualsFrom &&
            date.value < currentPeriod.from) {
            const original = createCivilDate(currentPeriod.from);
            if (!original.ok) return old;
            const through = addDays(original.value, -1);
            return through.ok ? { ...old, periods: [{ ...blankPeriod(), from: date.value, through: through.value }, ...old.periods] } : old;
          }
          if (date.ok && index === changed.length - 1 && field === "through" &&
            currentPeriod.through === current?.coverage?.actualsThrough && date.value > currentPeriod.through) {
            const original = createCivilDate(currentPeriod.through);
            if (!original.ok) return old;
            const from = addDays(original.value, 1);
            return from.ok ? { ...old, periods: [...old.periods, { ...blankPeriod(), from: from.value, through: date.value }] } : old;
          }
          const neighborIndex = field === "from" ? index - 1 : index + 1;
          const neighbor = changed[neighborIndex];
          if (date.ok && (field === "from" && currentPeriod.through && date.value > currentPeriod.through ||
            field === "through" && currentPeriod.from && date.value < currentPeriod.from)) {
            return { ...old, errors: ["A period cannot end before it starts. Use Merge or Remove for that change."] };
          }
          if (date.ok && neighbor && (!editable || typeof branch.selection === "object" &&
            (neighborIndex < branch.selection.from || neighborIndex > branch.selection.through))) {
            return { ...old, errors: ["Select the adjacent period before moving this boundary."] };
          }
          if (date.ok && neighbor) {
            const shifted = addDays(date.value, field === "from" ? -1 : 1);
            if (shifted.ok && (field === "from" && shifted.value < neighbor.from ||
              field === "through" && shifted.value > neighbor.through)) {
              return { ...old, errors: ["This boundary would remove the adjacent period. Use Merge or Remove."] };
            }
            if (shifted.ok) changed[neighborIndex] = { ...neighbor,
              [field === "from" ? "through" : "from"]: shifted.value,
              values: neighbor.values.map((row) => ({ ...row,
                provenance: row.provenance === "domain-zero-propagated" ? row.provenance : "needs-confirmation" as const })) };
          }
          changed[index] = { ...currentPeriod, [field]: text,
            values: currentPeriod.values.map((row) => ({ ...row,
              provenance: row.provenance === "domain-zero-propagated" ? row.provenance : "needs-confirmation" as const })) };
          return { ...old, periods: changed, errors: [], confirmed: false };
        }, true), "date");
        control.disabled = !editable;
        tr.append(cell);
      };
      dateCell("From", period.from, "from"); dateCell("Through", period.through, "through");
      for (const team of draft.teams.filter((row) => row.enabled)) {
        const cell = document.createElement("td");
        const draftCell = period.values.find((value) => value.teamId === team.teamId);
        const control = textInput(cell, `${team.teamId} consumed`, draftCell?.text ?? "",
          (text) => update((old) => ({ ...old, periods: old.periods.map((item, i) => i === index ? { ...item,
            values: [...item.values.filter((value) => value.teamId !== team.teamId), { teamId: team.teamId, text,
              provenance: "user-entered" as const }] } : item), confirmed: false })));
        control.disabled = !editable;
        if (draftCell?.provenance === "needs-confirmation") check(cell, "Confirm suggested value", false,
          (confirmed) => update((old) => ({ ...old, periods: old.periods.map((item, i) => i === index ? { ...item,
            values: item.values.map((value) => value.teamId === team.teamId ? { ...value,
              provenance: confirmed ? "user-confirmed" as const : "needs-confirmation" as const } : value) } : item) }), true));
        tr.append(cell);
      }
      const actions = document.createElement("td");
      const splitDate = document.createElement("input"); splitDate.type = "date";
      splitDate.setAttribute("aria-label", "Split " + period.from + " to " + period.through + " at date");
      const split = document.createElement("button"); split.type = "button"; split.textContent = "Split at date";
      split.disabled = !editable;
      split.addEventListener("click", () => {
        const date = createCivilDate(splitDate.value);
        if (!date.ok || date.value <= period.from || date.value > period.through) {
          error.textContent = "Choose a split date inside this period, after its start."; error.hidden = false; return;
        }
        const previous = addDays(date.value, -1);
        if (!previous.ok) return;
        update((old) => {
          const source = old.periods[index]!;
          const { originalPeriodId: _originalPeriodId, ...withoutId } = source;
          void _originalPeriodId;
          const leftValues = source.values.map((row) => ({ ...row,
            provenance: parseExactQuantityInput(row.text) === "0/1" && domainZero(row.teamId, source.from, previous.value) ?
              "domain-zero-propagated" as const : "needs-confirmation" as const }));
          const rightValues = source.values.map((row) => ({ ...row,
            provenance: parseExactQuantityInput(row.text) === "0/1" && domainZero(row.teamId, date.value, source.through) ?
              "domain-zero-propagated" as const : "needs-confirmation" as const }));
          return { ...old, periods: [...old.periods.slice(0, index),
            { ...withoutId, through: previous.value, values: leftValues },
            { ...withoutId, from: date.value, values: rightValues },
            ...old.periods.slice(index + 1)] };
        }, true);
      });
      const merge = document.createElement("button"); merge.type = "button"; merge.textContent = "Merge with next";
      merge.disabled = !editable || index === draft.periods.length - 1 ||
        typeof branch.selection === "object" && index + 1 > branch.selection.through;
      merge.addEventListener("click", () => update((old) => {
        const first = old.periods[index]!; const second = old.periods[index + 1]!;
        const values = first.values.map((row) => {
          const other = second.values.find((item) => item.teamId === row.teamId);
          const zero = parseExactQuantityInput(row.text) === "0/1" &&
            parseExactQuantityInput(other?.text ?? "") === "0/1" && domainZero(row.teamId, first.from, second.through);
          return { teamId: row.teamId, text: zero ? "0" : "", provenance: zero ?
            "domain-zero-propagated" as const : "needs-confirmation" as const };
        });
        return { ...old, periods: [...old.periods.slice(0, index),
          { from: first.from, through: second.through, values }, ...old.periods.slice(index + 2)] };
      }, true));
      const remove = document.createElement("button"); remove.type = "button"; remove.textContent = "Remove period";
      remove.disabled = !editable || index !== 0 && index !== draft.periods.length - 1;
      remove.addEventListener("click", () => update((old) => ({ ...old,
        periods: old.periods.filter((_, i) => i !== index), confirmed: false }), true));
      actions.append(splitDate, split, merge, remove); tr.append(actions); table.append(tr);
    });
    const tableScroll = document.createElement("div");
    tableScroll.className = "card-actuals-matrix-scroll";
    tableScroll.setAttribute("role", "region");
    tableScroll.setAttribute("aria-label", "Actuals Team by period matrix");
    tableScroll.append(table);
    fields.append(tableScroll);
    const consumedReview = document.createElement("p"); consumedReview.textContent = "Consumed totals: " + totals(draft.periods, draft.teams);
    fields.append(consumedReview);
    if (current?.participation.some((id) => !draft.teams.some((row) => row.teamId === id && row.enabled))) {
      check(fields, "I confirm retired Teams have current Actuals 0 and Project RAF 0", draft.retirementConfirmed,
        (retirementConfirmed) => update((old) => ({ ...old, retirementConfirmed })));
    }
    if (draft.stale) { error.textContent = "The base snapshot changed. Cancel and review the new current knowledge."; error.hidden = false; }
  };
  const onOpen = (handoff?: UpdateProjectCommand | UpdateReservationCommand) => {
    const old = input.store.get(model.id)!;
    const target = handoff ? new Set(handoff.kind === "update-project" ?
      handoff.teamRequirements.map((row) => row.teamId) : handoff.teamAllocations.map((row) => row.teamId)) : undefined;
    const teams = old.teams.map((row) => {
      const requirement = handoff?.kind === "update-project" ?
        handoff.teamRequirements.find((item) => item.teamId === row.teamId) : undefined;
      const priorRaf = current && "raf" in current ? current.raf.find((item) => item.teamId === row.teamId) : undefined;
      const quickDirty = priorRaf && parseExactQuantityInput(row.raf) !== serializeQuantity(priorRaf.amount);
      return { ...row, enabled: target ? target.has(row.teamId) : row.enabled,
        raf: requirement && (!priorRaf || !quickDirty) ? serializeQuantity(requirement.remainingWorkload) : row.raf,
        rafConfirmed: false };
    });
    const periods = old.periods.map((period) => ({ ...period, values: teams.filter((row) => row.enabled).map((row) =>
      period.values.find((cell) => cell.teamId === row.teamId) ?? { teamId: row.teamId, text: "", provenance: "needs-confirmation" as const }) }));
    input.store.update(model.id, { ...old, modal: { step: 1,
      selection: periods.length ? { from: 0, through: periods.length - 1 } : "initial",
      periods, teams, confirmed: false, retirementConfirmed: false, anchor: 0,
      ...(handoff ? { handoff } : {}) } });
    input.onDraftChange(); render();
    fields.querySelector?.("button")?.focus();
  };
  const onCancel = () => {
    const old = input.store.get(model.id)!;
    const { modal: _modal, ...rest } = old;
    void _modal;
    input.store.update(model.id, rest);
    render(); input.onDraftChange(); toggle.focus();
  };
  back.addEventListener("click", () => setModal((old) => ({ ...old, step: Math.max(1, old.step - 1) as 1 | 2 | 3 })));
  review.addEventListener("click", () => {
    if (!input.store.review(model.id)) {
      error.textContent = "The partition, membership or same RAF changed concurrently. Cancel and start from the current snapshot.";
      error.hidden = false; return;
    }
    input.onDraftChange(); render();
    fields.querySelector?.<HTMLElement>("button, input")?.focus();
  });
  next.addEventListener("click", () => setModal((old) => {
    if (old.step !== 1 || old.prepared) return { ...old, step: Math.min(model.kind === "project" ? 3 : 2, old.step + 1) as 1 | 2 | 3 };
    let periods = old.periods;
    if (old.selection === "initial" && !periods.length) periods = [blankPeriod()];
    if (old.selection === "before" && periods.length) {
      const date = createCivilDate(periods[0]!.from);
      const through = date.ok ? addDays(date.value, -1) : undefined;
      periods = [{ ...blankPeriod(), through: through?.ok ? through.value : "" }, ...periods];
    }
    if (old.selection === "after" && periods.length) {
      const date = createCivilDate(periods.at(-1)!.through);
      const from = date.ok ? addDays(date.value, 1) : undefined;
      periods = [...periods, { ...blankPeriod(), from: from?.ok ? from.value : "" }];
    }
    return { ...old, step: 2, periods, prepared: true };
  }));
  const onKeyDown = (event: KeyboardEvent) => {
    if (modal.hidden) return;
    if (event.key === "Escape") { event.preventDefault(); onCancel(); return; }
    if (event.key !== "Tab") return;
    const focusable = [...modal.querySelectorAll<HTMLElement>("button:not([hidden]):not([disabled]), input:not([disabled]), select:not([disabled])")]
      .filter((item) => item.getClientRects().length > 0);
    if (!focusable.length) return;
    const first = focusable[0]!; const last = focusable.at(-1)!;
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  };
  modal.addEventListener("keydown", onKeyDown);
  const onFocusIn = (event: FocusEvent) => {
    if (!modal.hidden && event.target instanceof Node && !modal.contains(event.target)) {
      modal.querySelector<HTMLElement>("button:not([hidden]):not([disabled])")?.focus();
    }
  };
  document.addEventListener?.("focusin", onFocusIn);
  const onSubmit = (event: SubmitEvent) => {
    event.preventDefault();
    const base = input.store.get(model.id)!;
    if (!base.modal || base.modal.step !== (model.kind === "project" ? 3 : 2)) {
      error.textContent = "Complete the remaining steps before Apply."; error.hidden = false; next.focus(); return;
    }
    const conflict = input.conflict();
    if (conflict) { error.textContent = conflict; error.hidden = false; return; }
    const draft = base.modal ? { ...base, ...base.modal } : base;
    const parsed = parseSnapshotActualsCommand(model, draft);
    if (!parsed.ok) { error.textContent = parsed.errors.map((item) => `${item.path}: ${item.message}`).join(" "); error.hidden = false;
      input.store.update(model.id, { ...base, errors: [error.textContent] });
      modal.querySelector?.<HTMLInputElement>("input:not([disabled])")?.focus(); return; }
    const result = input.onApply(parsed.command);
    if (!result.ok) { error.textContent = result.errors.map((item) => `${item.path}: ${item.message}`).join(" "); error.hidden = false;
      input.store.update(model.id, { ...base, errors: [error.textContent] }); }
  };
  const onOpenClick = () => onOpen();
  toggle.addEventListener("click", onOpenClick); cancel.addEventListener("click", onCancel); form.addEventListener("submit", onSubmit);
  render();
  if (input.store.get(model.id)?.modal) {
    document.defaultView?.queueMicrotask(() => fields.querySelector?.<HTMLElement>("button, input")?.focus());
  }
  return { openHandoff: (command) => onOpen(command),
    destroy: () => { toggle.removeEventListener("click", onOpenClick); cancel.removeEventListener("click", onCancel); form.removeEventListener("submit", onSubmit);
      modal.removeEventListener("keydown", onKeyDown); document.removeEventListener?.("focusin", onFocusIn);
      modal.remove?.(); } };
}
