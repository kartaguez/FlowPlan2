import { createV2Application } from "./createV2Application.js";
const root = document.getElementById("app");
if (!root) throw new Error("FlowPlan2 V2 root element is missing.");
try {
  createV2Application(root);
} catch (cause) {
  const error = document.createElement("p");
  error.setAttribute("role", "alert");
  error.textContent = cause instanceof Error ? cause.message : "Échec du démarrage FlowPlan2 V2.";
  root.replaceChildren(error);
  throw cause;
}
