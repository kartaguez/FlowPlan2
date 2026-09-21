import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "../ui/App";
import { createApplicationShell } from "./bootstrap";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("FlowPlan root element is missing");
}

createRoot(rootElement).render(
  <StrictMode>
    <App shell={createApplicationShell()} />
  </StrictMode>,
);
