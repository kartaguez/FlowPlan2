import type {
  ReplaceTeamReservationsCommand,
  TeamReservationsEditViewModel,
} from "../../application/index.js";
import type {
  DomainError,
  ReservationId,
  TeamId,
} from "../../domain/index.js";
import type { ReservationEditControls } from "../renderApp.js";
import {
  parseReservationEditCommand,
  type ReservationEditRowValues,
} from "./parseReservationEditCommand.js";

export type ReservationEditApplyResult =
  | Readonly<{ ok: true }>
  | Readonly<{ ok: false; errors: readonly DomainError[] }>;

export interface ReservationEditController {
  readonly setTeam: (model: TeamReservationsEditViewModel | undefined) => void;
  readonly getTeamId: () => TeamId | undefined;
  readonly destroy: () => void;
}

export interface CreateReservationEditControllerInput {
  readonly controls: ReservationEditControls;
  readonly errorContainer: HTMLElement;
  readonly nextReservationId: () => ReservationId;
  readonly onApply: (
    command: ReplaceTeamReservationsCommand,
  ) => ReservationEditApplyResult;
}

interface LocalRow extends ReservationEditRowValues {}
interface RenderedRow {
  readonly reservationId: ReservationId;
  readonly startDate: HTMLInputElement;
  readonly endDate: HTMLInputElement;
  readonly ratioPercent: HTMLInputElement;
  readonly ratioDisplay: string;
  readonly ratioExact?: string;
}

export function createReservationEditController(
  input: CreateReservationEditControllerInput,
): ReservationEditController {
  let model: TeamReservationsEditViewModel | undefined;
  let rows: LocalRow[] = [];
  let renderedRows: readonly RenderedRow[] = Object.freeze([]);

  const clearError = (): void => {
    input.errorContainer.textContent = "";
    input.errorContainer.hidden = true;
  };
  const showErrors = (errors: readonly DomainError[]): void => {
    input.errorContainer.textContent = errors
      .map((entry) => `${entry.path}: ${entry.message}`)
      .join(" ");
    input.errorContainer.hidden = false;
  };
  const readRows = (): LocalRow[] =>
    renderedRows.map((row) => ({
      reservationId: row.reservationId,
      startDate: row.startDate.value,
      endDate: row.endDate.value,
      ratioPercent: row.ratioPercent.value,
      ratioOriginalDisplay: row.ratioDisplay,
      ratioDirty: row.ratioPercent.value !== row.ratioDisplay,
      ...(row.ratioExact === undefined ? {} : { ratioExact: row.ratioExact }),
    }));
  const renderRows = (): void => {
    const document = input.controls.rows.ownerDocument;
    input.controls.rows.replaceChildren();
    renderedRows = Object.freeze(rows.map((row, index) => {
      const fieldset = document.createElement("fieldset");
      fieldset.className = "timeline-reservation-edit-row";
      fieldset.dataset.reservationId = row.reservationId;
      const legend = document.createElement("legend");
      legend.textContent = `Reservation ${index + 1}`;
      const start = createInput(document, fieldset, "Start", "date");
      const end = createInput(document, fieldset, "End", "date");
      const ratio = createInput(document, fieldset, "Reservation %", "text");
      start.value = row.startDate;
      end.value = row.endDate;
      ratio.value = row.ratioPercent;
      const remove = document.createElement("button");
      remove.type = "button";
      remove.textContent = "Remove reservation";
      remove.dataset.removeReservationId = row.reservationId;
      remove.addEventListener("click", () => {
        rows = readRows().filter(
          (candidate) => candidate.reservationId !== row.reservationId,
        );
        renderRows();
      });
      fieldset.prepend(legend);
      fieldset.append(remove);
      input.controls.rows.append(fieldset);
      return Object.freeze({
        reservationId: row.reservationId,
        startDate: start,
        endDate: end,
        ratioPercent: ratio,
        ratioDisplay: row.ratioOriginalDisplay,
        ...(row.ratioExact === undefined ? {} : { ratioExact: row.ratioExact }),
      });
    }));
  };
  const hydrate = (next: TeamReservationsEditViewModel | undefined): void => {
    model = next;
    input.controls.container.hidden = next === undefined;
    rows = next
      ? next.reservations.map((reservation) => ({
          reservationId: reservation.reservationId,
          startDate: reservation.startDate,
          endDate: reservation.endDate,
          ratioPercent: reservation.ratioPercent,
          ratioOriginalDisplay: reservation.ratioPercent,
          ratioExact: reservation.ratioExact,
          ratioDirty: false,
        }))
      : [];
    input.controls.add.disabled = next === undefined;
    input.controls.apply.disabled = next === undefined;
    input.controls.cancel.disabled = next === undefined;
    input.controls.status.textContent = next
      ? `Editing reservations for ${next.teamLabel}`
      : "Select a team lane to edit reservations.";
    renderRows();
  };
  const onAdd = (): void => {
    if (model === undefined) return;
    rows = [
      ...readRows(),
      {
        reservationId: input.nextReservationId(),
        startDate: "",
        endDate: "",
        ratioPercent: "0",
        ratioOriginalDisplay: "0",
        ratioDirty: true,
      },
    ];
    renderRows();
  };
  const onSubmit = (event: SubmitEvent): void => {
    event.preventDefault();
    if (model === undefined) return;
    const parsed = parseReservationEditCommand({
      teamId: model.teamId,
      reservations: readRows(),
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
  };
  input.controls.add.addEventListener("click", onAdd);
  input.controls.form.addEventListener("submit", onSubmit);
  input.controls.cancel.addEventListener("click", onCancel);
  hydrate(undefined);
  return Object.freeze({
    setTeam: (next: TeamReservationsEditViewModel | undefined) => {
      hydrate(next);
      clearError();
    },
    getTeamId: () => model?.teamId,
    destroy: () => {
      input.controls.add.removeEventListener("click", onAdd);
      input.controls.form.removeEventListener("submit", onSubmit);
      input.controls.cancel.removeEventListener("click", onCancel);
    },
  });
}

function createInput(
  document: Document,
  parent: HTMLElement,
  text: string,
  type: string,
): HTMLInputElement {
  const label = document.createElement("label");
  label.textContent = text;
  const input = document.createElement("input");
  input.type = type;
  label.append(input);
  parent.append(label);
  return input;
}
