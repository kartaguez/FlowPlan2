import { describe, expect, it } from "vitest";
import { createApplicationShell } from "./bootstrap";

describe("createApplicationShell", () => {
  it("provides the minimal shell content", () => {
    expect(createApplicationShell()).toEqual({
      title: "FlowPlan",
      workspaceLabel: "Planning workspace",
    });
  });
});
