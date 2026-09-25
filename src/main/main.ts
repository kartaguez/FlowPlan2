import { renderApp } from "../ui/renderApp.js";
import { createPlanningDemoApplication } from "./createPlanningDemoApplication.js";
import { createDemoPlanningScenario } from "./demo/createDemoPlanningScenario.js";
import { createLocalPlanningBackupStore } from "../infrastructure/backup/localPlanningBackup.js";

const root = document.getElementById("app");

if (!root) {
  throw new Error("FlowPlan root element is missing");
}

const scenario = createDemoPlanningScenario();
createPlanningDemoApplication(renderApp(root), scenario, createLocalPlanningBackupStore({
  getItem: (key) => window.localStorage.getItem(key),
  setItem: (key, value) => window.localStorage.setItem(key, value),
}));
