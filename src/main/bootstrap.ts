export interface ApplicationShell {
  readonly title: string;
  readonly workspaceLabel: string;
}

export function createApplicationShell(): ApplicationShell {
  return {
    title: "FlowPlan",
    workspaceLabel: "Planning workspace",
  };
}
