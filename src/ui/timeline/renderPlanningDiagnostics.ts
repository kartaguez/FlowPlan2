import type {
  TimelineDiagnostic,
} from "../../adapters/index.js";

export type DiagnosticPresentationGroup = "red" | "grey";

export function diagnosticPresentationGroup(
  code: TimelineDiagnostic["code"],
): DiagnosticPresentationGroup {
  return code === "PROJECT_REMAINS_UNPLANNED_AT_HORIZON" ? "grey" : "red";
}

const DIAGNOSTIC_MESSAGES: Readonly<
  Record<TimelineDiagnostic["code"], string>
> = Object.freeze({
  TEAM_OVER_RESERVED: "Team capacity is over-reserved.",
  PROJECT_REMAINS_UNPLANNED_AT_HORIZON:
    "Project still has unplanned workload at the end of the horizon.",
  DEADLINE_UNFEASIBLE: "Mandatory deadline is currently unfeasible.",
  DEADLINE_MISSED: "Mandatory deadline has been missed.",
});

export interface RenderPlanningDiagnosticsInput {
  readonly container: HTMLElement;
  readonly diagnostics: readonly TimelineDiagnostic[];
}

export function renderPlanningDiagnostics(
  input: RenderPlanningDiagnosticsInput,
): void {
  const document = input.container.ownerDocument;
  const list = document.createElement("ul");
  list.className = "timeline-diagnostics-list";
  for (const diagnostic of input.diagnostics) {
    list.append(renderDiagnostic(document, diagnostic));
  }
  input.container.replaceChildren(list);
}

function renderDiagnostic(
  document: Document,
  diagnostic: TimelineDiagnostic,
): HTMLElement {
  const item = document.createElement("li");
  item.className = `timeline-diagnostic timeline-diagnostic--${diagnostic.code
    .toLowerCase()
    .replaceAll("_", "-")}`;
  item.setAttribute("data-diagnostic-code", diagnostic.code);

  const code = document.createElement("span");
  code.className = "timeline-diagnostic-code";
  code.textContent = diagnostic.code;

  const message = document.createElement("span");
  message.className = "timeline-diagnostic-message";
  message.textContent = diagnosticMessage(diagnostic);
  item.append(code, message);
  return item;
}

function diagnosticMessage(diagnostic: TimelineDiagnostic): string {
  const context = [
    diagnostic.projectLabel ?? diagnostic.projectId,
    diagnostic.teamLabel ?? diagnostic.teamId,
  ].filter((value): value is string => value !== undefined);
  const parts = [
    ...(context.length === 0 ? [] : [context.join(" / ")]),
    DIAGNOSTIC_MESSAGES[diagnostic.code],
    ...(diagnostic.date === undefined ? [] : [diagnostic.date]),
  ];
  return parts.join(" — ");
}
