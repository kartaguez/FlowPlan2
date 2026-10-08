import { createPersistentPlanningApplication } from "./createPersistentPlanningApplication.js";
const root = document.getElementById("app");
if (!root) throw new Error("FlowPlan root element is missing");
void createPersistentPlanningApplication(root);
