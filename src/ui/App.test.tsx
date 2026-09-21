import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { App } from "./App";

describe("App", () => {
  it("renders the minimal Phase 0 shell", () => {
    const markup = renderToStaticMarkup(<App />);

    expect(markup).toContain("FlowPlan");
    expect(markup).toContain("Planning workspace");
  });
});
