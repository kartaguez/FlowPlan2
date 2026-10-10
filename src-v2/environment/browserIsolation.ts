/** Reserved names only: R0.1 opens no storage and creates no channel. */
export const V2_ORIGINS = Object.freeze({
  dev: "http://127.0.0.1:4274",
  portable: "http://127.0.0.1:4275",
});
export const V2_NAMESPACES = Object.freeze({
  portfolio: "flowplan2-v2-portfolio-versioned",
  scratch: "flowplan2-v2-history-scratch",
  uiPrefix: "flowplan2.v2.ui.",
  revisions: "flowplan2-v2-portfolio-revisions",
});
export function assertV2Origin(origin: string): void {
  if (origin !== V2_ORIGINS.dev && origin !== V2_ORIGINS.portable) {
    throw new Error("Origine non autorisée pour FlowPlan2 V2.");
  }
}
