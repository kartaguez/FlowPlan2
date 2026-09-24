export interface FlowPlan1Transfer {
    readonly flowPlanTransfer: true;
    readonly schemaVersion: number;
    readonly kind: "FULL";
    readonly payload: FlowPlan1Payload;
}

export interface FlowPlan1Payload {
    readonly schemaVersion: number;
    readonly planning: FlowPlan1Planning;
    readonly teamIds: readonly string [];
    readonly teamSettings: Readonly<Record<string, FlowPlan1TeamSettings>>;
    readonly projects: Readonly<Record<string, FlowPlan1Project>>;
    readonly projectPriorities: readonly string [];
}

export interface FlowPlan1Planning {
    readonly startDate: string;
    readonly endDate: string;
    readonly workingDaysOfWeek: readonly number[];
    readonly holidaysText: string;
    readonly maxParallelProjectsPerTeam: number;
}

export interface FlowPlan1TeamSettings {
    readonly name: string;
    readonly periods: readonly FlowPlan1CapacityPeriod[];
}

export interface FlowPlan1CapacityPeriod {
    readonly startDate: string;
    readonly endDate: string;
    readonly fte: number;
    readonly unavailableCapacityRatio: number;
}

export interface FlowPlan1Project {
    readonly name: string;
    readonly earliestStartDate?: string;
    readonly latestEndDate?: string;
    readonly workloads: Readonly<Record<string, number>>;
}
