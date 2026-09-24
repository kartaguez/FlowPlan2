import type { FlowPlan1Transfer } from "../../adapters/index.js";

export async function loadFlowPlan1Transfer(
    url: string,
): Promise<FlowPlan1Transfer> {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Unable to load planning data: ${response.status}`);
    }
    return (await response.json()) as FlowPlan1Transfer;
}