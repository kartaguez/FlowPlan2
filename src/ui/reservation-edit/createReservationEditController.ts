import type {
  ReservationEditViewModel,
  UpdateReservationCommand,
} from "../../application/index.js";
import type { DomainError, ReservationId, TeamId } from "../../domain/index.js";
import type { ReservationEditControls } from "../renderApp.js";
import { createTeamSubcard } from "../portfolio/createTeamSubcard.js";
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
}

interface RenderedAllocation {
  readonly teamId: TeamId;
  readonly enabled: HTMLInputElement;
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
  };
  const showErrors = (errors: readonly DomainError[]): void => {
    input.errorContainer.textContent = errors.map((entry) => `${entry.path}: ${entry.message}`).join(" ");
    input.errorContainer.hidden = false;
  };
  const hydrate = (next: ReservationEditViewModel | undefined): void => {
    model = next;
    input.controls.container.hidden = next === undefined;
    input.controls.fields.replaceChildren();
    allocations = Object.freeze([]);
    input.controls.apply.disabled = next === undefined;
    input.controls.cancel.disabled = next === undefined;
    if (next === undefined) {
      input.controls.status.textContent = "Select a reservation to edit.";
      return;
    }
    input.controls.title.textContent = `Reservation — ${next.name}`;
    input.controls.status.textContent = `Editing global reservation ${next.name}`;
    const document = input.controls.fields.ownerDocument;
    nameInput = createInput(document, input.controls.fields, "Reservation name", "text", next.name);
    startInput = createInput(document, input.controls.fields, "Start date", "date", next.startDate);
    endInput = createInput(document, input.controls.fields, "End date", "date", next.endDate);
    const rendered: RenderedAllocation[] = [];
    for (const allocation of next.teamAllocations) {
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
      kind.value = allocation.kind;
      modeLabel.append(kind);
      const value = createInput(
        document,
        fieldset,
        `${allocation.teamLabel} reservation value`,
        "text",
        allocation.value,
      );
      const updateEnabled = () => {
        kind.disabled = !enabled.checked;
        value.disabled = !enabled.checked;
      };
      kind.addEventListener("change", () => {
        value.value = "";
        value.dataset.modeChanged = "true";
      });
      fieldset.prepend(modeLabel);
      const subcard = createTeamSubcard(input.controls.fields, "Reservation", allocation.teamId,
        allocation.teamLabel, allocation.enabled, fieldset);
      const enabled = subcard.enabled;
      enabled.addEventListener("change", updateEnabled);
      updateEnabled();
      rendered.push(Object.freeze({
        teamId: allocation.teamId,
        enabled,
        kind,
        value,
        originalKind: allocation.kind,
        originalDisplay: allocation.value,
        ...(allocation.exact === undefined ? {} : { originalExact: allocation.exact }),
      }));
    }
    allocations = Object.freeze(rendered);
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
        row.value.dataset.modeChanged === "true" ||
        row.kind.value !== row.originalKind ||
        row.value.value !== row.originalDisplay,
    })));
  const onSubmit = (event: SubmitEvent): void => {
    event.preventDefault();
    if (model === undefined || nameInput === undefined || startInput === undefined || endInput === undefined) return;
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
    hydrate(model);
    clearError();
    input.onCancel?.();
  };
  input.controls.form.addEventListener("submit", onSubmit);
  input.controls.cancel.addEventListener("click", onCancel);
  hydrate(undefined);
  return Object.freeze({
    setReservation: (next: ReservationEditViewModel | undefined) => {
      hydrate(next);
      clearError();
    },
    getReservationId: () => model?.reservationId,
    destroy: () => {
      input.controls.form.removeEventListener("submit", onSubmit);
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
