import { renderApp } from "../ui/renderApp.js";
import { createPlanningDemoApplication } from "./createPlanningDemoApplication.js";
import { createDemoPlanningScenario } from "./demo/createDemoPlanningScenario.js";

const root = document.getElementById("app");

if (!root) {
  throw new Error("FlowPlan root element is missing");
}

const scenario = createDemoPlanningScenario();
createPlanningDemoApplication(renderApp(root), scenario);
