import type {
  ReservationEditViewModel,
  UpdateReservationCommand,
} from "../../application/index.js";
import type { DomainError, ReservationId, TeamId } from "../../domain/index.js";
import type { ReservationEditControls } from "../renderApp.js";
import { createTeamSubcard } from "../portfolio/createTeamSubcard.js";
import { reservationValuesFromModel, type ReservationDraftStore, type ReservationDraftValues } from "./reservationDraftStore.js";
import {
  parseReservationEditCommand,
  type ReservationTeamAllocationFormValues,
} from "./parseReservationEditCommand.js";

export type ReservationEditApplyResult =
  | Readonly<{ ok: true }>
  | Readonly<{ ok: false; errors: readonly DomainError[] }>;

export interface ReservationEditController {
  readonly setReservation: (model: ReservationEditViewModel | undefined) => void;
  readonly getReservationId: () => ReservationId | undefined;
  readonly destroy: () => void;
}

export interface CreateReservationEditControllerInput {
  readonly controls: ReservationEditControls;
  readonly errorContainer: HTMLElement;
  readonly onApply: (command: UpdateReservationCommand) => ReservationEditApplyResult;
  readonly onCancel?: () => void;
  readonly draftStore?: ReservationDraftStore;
  readonly onDraftChange?: () => void;
}

interface RenderedAllocation {
  readonly teamId: TeamId;
  readonly enabled: HTMLInputElement;
  readonly isExpanded: () => boolean;
  readonly card: HTMLElement;
  readonly kind: HTMLSelectElement;
  readonly value: HTMLInputElement;
  readonly originalKind: "ratio" | "fixed-daily";
  readonly originalDisplay: string;
  readonly originalExact?: string;
}

export function createReservationEditController(
  input: CreateReservationEditControllerInput,
): ReservationEditController {
  let model: ReservationEditViewModel | undefined;
  let nameInput: HTMLInputElement | undefined;
  let startInput: HTMLInputElement | undefined;
  let endInput: HTMLInputElement | undefined;
  let allocations: readonly RenderedAllocation[] = Object.freeze([]);

  const clearError = (): void => {
    input.errorContainer.textContent = "";
    input.errorContainer.hidden = true;
    if (model) input.draftStore?.setErrors(model.reservationId, []);
  };
  const showErrors = (errors: readonly DomainError[]): void => {
    input.errorContainer.textContent = errors.map((entry) => `${entry.path}: ${entry.message}`).join(" ");
    input.errorContainer.hidden = false;
    if (model) input.draftStore?.setErrors(model.reservationId,
      errors.map((entry) => `${entry.path}: ${entry.message}`));
  };
  const hydrate = (next: ReservationEditViewModel | undefined): void => {
    model = next;
    const draft = next === undefined ? undefined : input.draftStore?.initialize(next.reservationId, next);
    const values = draft?.values ?? (next === undefined ? undefined : reservationValuesFromModel(next));
    input.controls.container.hidden = next === undefined;
    input.controls.fields.replaceChildren();
    allocations = Object.freeze([]);
    input.controls.apply.disabled = next === undefined;
    input.controls.cancel.disabled = next === undefined;
    if (next === undefined) {
      input.controls.status.textContent = "Select a reservation to edit.";
      return;
    }
    input.controls.title.textContent = "";
    input.controls.status.textContent = "";
    const document = input.controls.fields.ownerDocument;
    nameInput = createInput(document, input.controls.fields, "Reservation name", "text", values!.name);
    startInput = createInput(document, input.controls.fields, "Start date", "date", values!.startDate);
    endInput = createInput(document, input.controls.fields, "End date", "date", values!.endDate);
    const rendered: RenderedAllocation[] = [];
    for (const allocation of next.teamAllocations) {
      const saved = values!.teams.find((team) => team.teamId === allocation.teamId);
      const fieldset = document.createElement("fieldset");
      fieldset.className = "timeline-reservation-team-allocation";
      const modeLabel = document.createElement("label");
      modeLabel.textContent = "Mode";
      const kind = document.createElement("select");
      kind.setAttribute("aria-label", `${allocation.teamLabel} allocation mode`);
      const ratio = document.createElement("option");
      ratio.value = "ratio";
      ratio.textContent = "Percentage";
      const fixed = document.createElement("option");
      fixed.value = "fixed-daily";
      fixed.textContent = "md/day";
      kind.append(ratio, fixed);
      kind.value = saved?.kind ?? allocation.kind;
      modeLabel.append(kind);
      const value = createInput(
        document,
        fieldset,
        `${allocation.teamLabel} reservation value`,
        "text",
        saved?.value ?? allocation.value,
      );
      const updateEnabled = () => {
        kind.disabled = !enabled.checked;
        value.disabled = !enabled.checked;
      };
      kind.addEventListener("change", () => {
        value.value = "";
        notifyDraftChange();
      });
      fieldset.prepend(modeLabel);
      const subcard = createTeamSubcard(input.controls.fields, "Reservation", allocation.teamId,
        allocation.teamLabel, saved?.enabled ?? allocation.enabled, fieldset,
        saved?.expanded ?? false, notifyDraftChange);
      subcard.card.classList?.toggle("portfolio-card--dirty",
        input.draftStore?.isTeamDirty(next.reservationId, allocation.teamId) ?? false);
      const enabled = subcard.enabled;
      enabled.addEventListener("change", updateEnabled);
      updateEnabled();
      rendered.push(Object.freeze({
        teamId: allocation.teamId,
        enabled,
        isExpanded: subcard.isExpanded,
        card: subcard.card,
        kind,
        value,
        originalKind: draft?.reference.teams.find((team) => team.teamId === allocation.teamId)?.kind ?? allocation.kind,
        originalDisplay: draft?.reference.teams.find((team) => team.teamId === allocation.teamId)?.value ?? allocation.value,
        ...((draft?.reference.teams.find((team) => team.teamId === allocation.teamId)?.exact
          ?? allocation.exact) === undefined ? {} : {
          originalExact: draft?.reference.teams.find((team) => team.teamId === allocation.teamId)?.exact
            ?? allocation.exact!,
        }),
      }));
    }
    allocations = Object.freeze(rendered);
    if (draft?.invalidReference) {
      const warning = document.createElement("p");
      warning.textContent = "A referenced Team no longer exists. Apply is unavailable.";
      input.controls.fields.append(warning);
      input.controls.apply.disabled = true;
    }
    if (draft?.errors.length) {
      input.errorContainer.textContent = draft.errors.join(" ");
      input.errorContainer.hidden = false;
    }
  };
  const readDraftValues = (): ReservationDraftValues => {
    if (!model || !nameInput || !startInput || !endInput) throw new TypeError("Reservation form has no model.");
    const previous = input.draftStore?.get(model.reservationId)?.values ?? reservationValuesFromModel(model);
    return { name: nameInput.value, startDate: startInput.value, endDate: endInput.value,
      teams: allocations.map((row) => ({ teamId: row.teamId, enabled: row.enabled.checked,
        kind: row.kind.value as "ratio" | "fixed-daily", value: row.value.value,
        ...(row.originalExact === undefined ? {} : { exact: row.originalExact }),
        expanded: row.isExpanded(),
      })).concat(previous.teams.filter((team) => !allocations.some((row) => row.teamId === team.teamId))) };
  };
  const notifyDraftChange = (): void => {
    if (!model || !nameInput || !input.draftStore) return;
    input.draftStore.update(model.reservationId, readDraftValues());
    for (const row of allocations) row.card.classList?.toggle("portfolio-card--dirty",
      input.draftStore.isTeamDirty(model.reservationId, row.teamId));
    input.onDraftChange?.();
  };
  const readAllocations = (): readonly ReservationTeamAllocationFormValues[] =>
    Object.freeze(allocations.map((row) => Object.freeze({
      teamId: row.teamId,
      enabled: row.enabled.checked,
      kind: row.kind.value as "ratio" | "fixed-daily",
      value: row.value.value,
      originalKind: row.originalKind,
      originalDisplay: row.originalDisplay,
      ...(row.originalExact === undefined ? {} : { originalExact: row.originalExact }),
      dirty:
        row.kind.value !== row.originalKind ||
        row.value.value !== row.originalDisplay,
    })));
  const onSubmit = (event: SubmitEvent): void => {
    event.preventDefault();
    if (model === undefined || nameInput === undefined || startInput === undefined || endInput === undefined) return;
    notifyDraftChange();
    if (input.draftStore?.get(model.reservationId)?.invalidReference) {
      showErrors([{ code: "INVALID_DRAFT_REFERENCE", path: "reservation", message: "A referenced Team no longer exists." }]);
      return;
    }
    const parsed = parseReservationEditCommand({
      reservationId: model.reservationId,
      name: nameInput.value,
      startDate: startInput.value,
      endDate: endInput.value,
      teamAllocations: readAllocations(),
    });
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
      const expanded = input.draftStore.get(model.reservationId)?.expanded ?? true;
      input.draftStore.cancel(model.reservationId);
      input.draftStore.initialize(model.reservationId, model);
      input.draftStore.setExpanded(model.reservationId, expanded);
    }
    hydrate(model);
    clearError();
    input.onDraftChange?.();
    input.onCancel?.();
  };
  input.controls.form.addEventListener("submit", onSubmit);
  input.controls.form.addEventListener("input", notifyDraftChange);
  input.controls.form.addEventListener("change", notifyDraftChange);
  input.controls.cancel.addEventListener("click", onCancel);
  hydrate(undefined);
  return Object.freeze({
    setReservation: (next: ReservationEditViewModel | undefined) => {
      hydrate(next);
    },
    getReservationId: () => model?.reservationId,
    destroy: () => {
      input.controls.form.removeEventListener("submit", onSubmit);
      input.controls.form.removeEventListener("input", notifyDraftChange);
      input.controls.form.removeEventListener("change", notifyDraftChange);
      input.controls.cancel.removeEventListener("click", onCancel);
    },
  });
}

function createInput(
  document: Document,
  parent: HTMLElement,
  labelText: string,
  type: string,
  value: string,
): HTMLInputElement {
  const label = document.createElement("label");
  label.textContent = labelText;
  const input = document.createElement("input");
  input.type = type;
  input.value = value;
  label.append(input);
  parent.append(label);
  return input;
}
