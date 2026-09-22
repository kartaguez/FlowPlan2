import { renderApp } from "../ui/renderApp.js";

const root = document.getElementById("app");

if (!root) {
  throw new Error("FlowPlan root element is missing");
}

renderApp(root);
