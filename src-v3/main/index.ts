import { createAndProjectPlanning } from "../application/usecases/createAndProjectPlanning.js";
import { mountPlanningForm } from "../adapters/inbound/browser.js";

mountPlanningForm(document, createAndProjectPlanning);
