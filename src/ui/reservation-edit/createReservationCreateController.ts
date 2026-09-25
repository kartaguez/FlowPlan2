import type { CreateReservationCommand } from "../../application/index.js";
import type { CivilDate, DomainError, Portfolio, TeamId } from "../../domain/index.js";
import type { ProjectCreateControls } from "../renderApp.js";
import { createTeamSubcard } from "../portfolio/createTeamSubcard.js";
import { parseReservationFields, type ReservationTeamAllocationFormValues } from "./parseReservationEditCommand.js";

interface TeamRow {
  readonly teamId: TeamId;
  readonly enabled: HTMLInputElement;
  readonly kind: HTMLSelectElement;
  readonly value: HTMLInputElement;
  readonly isExpanded: () => boolean;
}

interface Snapshot {
  readonly name: string;
  readonly startDate: string;
  readonly endDate: string;
  readonly teams: ReadonlyMap<TeamId, Readonly<{ enabled: boolean; kind: "ratio" | "fixed-daily";
    value: string; expanded: boolean }>>;
}

export function createReservationCreateController(input: {
  readonly controls: ProjectCreateControls;
  readonly portfolio: Portfolio;
  readonly horizon: Readonly<{ start: CivilDate; end: CivilDate }>;
  readonly onCreate: (command: CreateReservationCommand) =>
    Readonly<{ ok: true }> | Readonly<{ ok: false; errors: readonly DomainError[] }>;
  readonly confirmDiscard: (message: string) => boolean;
  readonly onClose: () => void;
}) {
  const { controls } = input;
  const document = controls.form.ownerDocument;
  let portfolio = input.portfolio;
  let horizon = input.horizon;
  let name: HTMLInputElement;
  let startDate: HTMLInputElement;
  let endDate: HTMLInputElement;
  let rows: readonly TeamRow[] = [];
  const field = (label: string, type: string): HTMLInputElement => {
    const wrapper = document.createElement("label");
    wrapper.textContent = label;
    const element = document.createElement("input");
    element.type = type;
    wrapper.append(element);
    controls.fields.append(wrapper);
    return element;
  };
  const snapshot = (): Snapshot => ({
    name: name.value, startDate: startDate.value, endDate: endDate.value,
    teams: new Map(rows.map((row) => [row.teamId, {
      enabled: row.enabled.checked, kind: row.kind.value as "ratio" | "fixed-daily",
      value: row.value.value, expanded: row.isExpanded(),
    }])),
  });
  const clearError = (): void => { controls.error.textContent = ""; controls.error.hidden = true; };
  const showErrors = (errors: readonly DomainError[]): void => {
    controls.error.textContent = errors.map((entry) => `${entry.path}: ${entry.message}`).join(" ");
    controls.error.hidden = false;
  };
  const render = (saved?: Snapshot): void => {
    controls.fields.replaceChildren();
    name = field("Reservation name", "text");
    startDate = field("Start date", "date");
    endDate = field("End date", "date");
    name.value = saved?.name ?? "";
    startDate.value = saved?.startDate ?? horizon.start;
    endDate.value = saved?.endDate ?? horizon.end;
    const teamList = document.createElement("div");
    if (portfolio.teams.length === 0) {
      const empty = document.createElement("p");
      empty.textContent = "No Teams. This Reservation can be created without allocations.";
      teamList.append(empty);
    }
    rows = portfolio.teams.map((team) => {
      const previous = saved?.teams.get(team.id);
      const details = document.createElement("fieldset");
      details.className = "timeline-reservation-team-allocation";
      const modeLabel = document.createElement("label");
      modeLabel.textContent = "Mode";
      const kind = document.createElement("select");
      kind.setAttribute("aria-label", `${team.name} allocation mode`);
      for (const [value, label] of [["ratio", "Percentage"], ["fixed-daily", "md/day"]] as const) {
        const option = document.createElement("option");
        option.value = value; option.textContent = label; kind.append(option);
      }
      kind.value = previous?.kind ?? "ratio";
      modeLabel.append(kind);
      const valueLabel = document.createElement("label");
      valueLabel.textContent = `${team.name} reservation value`;
      const value = document.createElement("input");
      value.type = "text";
      value.value = previous?.value ?? "";
      valueLabel.append(value);
      details.append(modeLabel, valueLabel);
      const subcard = createTeamSubcard(teamList, "Reservation", team.id, team.name,
        previous?.enabled ?? false, details, previous?.expanded ?? false);
      const enabled = subcard.enabled;
      const sync = (): void => { kind.disabled = !enabled.checked; value.disabled = !enabled.checked; };
      enabled.addEventListener("change", sync);
      kind.addEventListener("change", () => { value.value = ""; });
      sync();
      return { teamId: team.id, enabled, kind, value, isExpanded: subcard.isExpanded };
    });
    controls.fields.append(teamList);
  };
  const isDirty = (): boolean => {
    const values = snapshot();
    return values.name !== "" || values.startDate !== horizon.start ||
      values.endDate !== horizon.end || [...values.teams.values()].some((team) =>
        team.enabled || team.value !== "" || team.kind !== "ratio");
  };
  const close = (restoreFocus: boolean): void => {
    controls.container.hidden = true;
    render(); clearError();
    if (restoreFocus) input.onClose();
  };
  const requestClose = (): boolean => {
    if (controls.container.hidden) return true;
    if (isDirty() && !input.confirmDiscard("Discard unapplied Create Reservation changes?")) return false;
    close(true);
    return true;
  };
  const onCancel = (): void => { requestClose(); };
  const onSubmit = (event: SubmitEvent): void => {
    event.preventDefault();
    const allocations: ReservationTeamAllocationFormValues[] = rows.map((row) => ({
      teamId: row.teamId, enabled: row.enabled.checked,
      kind: row.kind.value as "ratio" | "fixed-daily", value: row.value.value, dirty: true,
    }));
    const parsed = parseReservationFields({ name: name.value,
      startDate: startDate.value, endDate: endDate.value, teamAllocations: allocations });
    if (!parsed.ok) return showErrors(parsed.errors);
    const result = input.onCreate({ kind: "create-reservation", ...parsed.fields });
    if (!result.ok) return showErrors(result.errors);
    close(false);
  };
  controls.cancel.addEventListener("click", onCancel);
  controls.form.addEventListener("submit", onSubmit);
  render();
  return Object.freeze({
    open: () => { render(); clearError(); controls.container.hidden = false; name.focus(); },
    requestClose,
    isOpen: () => !controls.container.hidden,
    isTeamEnabled: (teamId: TeamId) => !controls.container.hidden &&
      rows.some((row) => row.teamId === teamId && row.enabled.checked),
    setContext: (nextPortfolio: Portfolio, nextHorizon: Readonly<{ start: CivilDate; end: CivilDate }>) => {
      const saved = controls.container.hidden ? undefined : snapshot();
      portfolio = nextPortfolio; horizon = nextHorizon; render(saved);
    },
    destroy: () => {
      controls.cancel.removeEventListener("click", onCancel);
      controls.form.removeEventListener("submit", onSubmit);
    },
  });
}
