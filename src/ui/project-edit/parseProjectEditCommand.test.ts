import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, it } from "node:test";
import {
  createProjectId,
  createProgramId,
  createPriorityFamilyId,
  createTeamId,
  serializeQuantity,
  type DomainResult,
} from "../../domain/index.js";
import {
  parseProjectEditCommand,
  type ProjectEditFormValues,
} from "./parseProjectEditCommand.js";

function must<T>(result: DomainResult<T>): T {
  if (!result.ok) throw new Error(JSON.stringify(result.errors));
  return result.value;
}

const projectId = must(createProjectId("project-atlas"));
const alphaId = must(createTeamId("team-alpha"));
const betaId = must(createTeamId("team-beta"));

function values(
  overrides: Partial<ProjectEditFormValues> = {},
): ProjectEditFormValues {
  return {
    projectId,
    projectCount: 4,
    name: "Project Atlas",
    programId: "",
    priorityFamilyId: "",
    priorityPosition: "2",
    earliestStartDate: "2025-01-02",
    objectiveEndDate: "2025-02-03",
    mandatory: true,
    requirements: [
      {
        teamId: alphaId,
        remainingWorkload: "12.5",
        remainingWorkloadExact: "25/2",
        remainingWorkloadDirty: false,
        dailyCapExact: "3/2",
      },
      {
        teamId: betaId,
        remainingWorkload: "0",
        remainingWorkloadExact: "0/1",
        remainingWorkloadDirty: false,
      },
    ],
    ...overrides,
  };
}

describe("parseProjectEditCommand", () => {
  it("maps Mandatory to Objective end and requires explicit legacy resolution", () => {
    const optional = parseProjectEditCommand(values({ mandatory: false }));
    assert.equal(optional.ok, true);
    if (optional.ok) assert.equal(optional.command.mandatoryDeadline, undefined);
    const required = parseProjectEditCommand(values({ mandatory: true }));
    assert.equal(required.ok, true);
    if (required.ok) assert.equal(required.command.mandatoryDeadline, required.command.objectiveEndDate);
    const absent = parseProjectEditCommand(values({ objectiveEndDate: "", mandatory: true }));
    assert.equal(absent.ok, false);
    const divergent = parseProjectEditCommand(values({ legacyDeadlineResolution: "unresolved" }));
    assert.equal(divergent.ok, false);
    if (!divergent.ok) assert.ok(divergent.errors.some((entry) => entry.code === "UNRESOLVED_LEGACY_DEADLINE"));
    const removed = parseProjectEditCommand(values({ objectiveEndDate: "", mandatory: false,
      legacyDeadlineResolution: "remove" }));
    assert.equal(removed.ok, true);
  });
  it("ignores disabled Team rows and requires RAF for a newly enabled row", () => {
    const disabled = { teamId: betaId, enabled: false, remainingWorkload: "invalid",
      remainingWorkloadExact: "", remainingWorkloadDirty: true };
    const skipped = parseProjectEditCommand(values({ requirements: [values().requirements[0]!, disabled] }));
    assert.equal(skipped.ok, true);
    if (skipped.ok) assert.deepEqual(skipped.command.teamRequirements.map((item) => item.teamId), [alphaId]);
    const blank = parseProjectEditCommand(values({ requirements: [values().requirements[0]!, { ...disabled, enabled: true,
      remainingWorkload: "", remainingWorkloadDirty: false }] }));
    assert.equal(blank.ok, false);
    const entered = parseProjectEditCommand(values({ requirements: [values().requirements[0]!, { ...disabled, enabled: true,
      remainingWorkload: "7.5", remainingWorkloadDirty: true }] }));
    assert.equal(entered.ok, true);
    if (entered.ok) assert.equal(serializeQuantity(entered.command.teamRequirements[1]!.remainingWorkload), "15/2");
  });
  it("parses catalog identities and an explicit empty choice", () => {
    const programId = must(createProgramId("program-phoenix"));
    const priorityFamilyId = must(createPriorityFamilyId("pas-strategic"));
    const selected = parseProjectEditCommand(values({ programId, priorityFamilyId }));
    assert.equal(selected.ok, true);
    if (selected.ok) {
      assert.equal(selected.command.programId, programId);
      assert.equal(selected.command.priorityFamilyId, priorityFamilyId);
    }
    const empty = parseProjectEditCommand(values());
    assert.equal(empty.ok, true);
    if (empty.ok) {
      assert.equal(Object.hasOwn(empty.command, "programId"), false);
      assert.equal(Object.hasOwn(empty.command, "priorityFamilyId"), false);
    }
    assert.equal(parseProjectEditCommand(values({ programId: "   " })).ok, false);
  });
  it("maps all strings to one typed update-project command with exact quantities", () => {
    const result = parseProjectEditCommand(values());
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.command.kind, "update-project");
    assert.equal(result.command.priorityPosition, 2);
    assert.equal(result.command.earliestStartDate, "2025-01-02");
    assert.equal(result.command.objectiveEndDate, "2025-02-03");
    assert.equal(result.command.mandatoryDeadline, "2025-02-03");
    assert.equal(
      serializeQuantity(result.command.teamRequirements[0]!.remainingWorkload),
      "25/2",
    );
    assert.equal(
      serializeQuantity(result.command.teamRequirements[0]!.dailyCap!),
      "3/2",
    );
    assert.equal(
      serializeQuantity(result.command.teamRequirements[1]!.remainingWorkload),
      "0/1",
    );
    assert.equal(result.command.teamRequirements[1]!.dailyCap, undefined);
  });

  it("accepts empty optional global dates and keeps them off requirements", () => {
    const result = parseProjectEditCommand(
      values({ earliestStartDate: "", objectiveEndDate: " ", mandatory: false }),
    );
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.command.earliestStartDate, undefined);
    assert.equal(result.command.objectiveEndDate, undefined);
    assert.equal(result.command.mandatoryDeadline, undefined);
    assert.ok(
      result.command.teamRequirements.every(
        (requirement) =>
          !("earliestStartDate" in requirement) &&
          !("objectiveEndDate" in requirement) &&
          !("mandatoryDeadline" in requirement),
      ),
    );
  });

  it("rejects zero, negative, fractional, and out-of-range priority strings", () => {
    for (const priorityPosition of ["0", "-1", "1.5", "5", "nope"]) {
      const result = parseProjectEditCommand(values({ priorityPosition }));
      assert.equal(result.ok, false);
      if (!result.ok) assert.equal(result.errors[0]?.path, "project.priority");
    }
  });

  it("accepts finite decimal or rational RAF edits and rejects invalid input", () => {
    for (const remainingWorkload of ["0", "1.25", "5/3"]) {
      assert.equal(
        parseProjectEditCommand(
          values({
            requirements: [
              {
                teamId: alphaId,
                remainingWorkload,
                remainingWorkloadExact: "1/3",
                remainingWorkloadDirty: true,
              },
            ],
          }),
        ).ok,
        true,
      );
    }
    for (const remainingWorkload of ["-1", "1/0", "/3", "1/", "1/2/3", "invalid"]) {
      assert.equal(
        parseProjectEditCommand(
          values({
            requirements: [
              {
                teamId: alphaId,
                remainingWorkload,
                remainingWorkloadExact: "1/3",
                remainingWorkloadDirty: true,
              },
            ],
          }),
        ).ok,
        false,
      );
    }
  });

  it("preserves hidden daily cap and untouched non-terminating exact RAF", () => {
    const result = parseProjectEditCommand(
      values({
        requirements: [{
          teamId: alphaId,
          remainingWorkload: "0.333",
          remainingWorkloadExact: "1/3",
          remainingWorkloadDirty: false,
          dailyCapExact: "2/3",
        }],
      }),
    );
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(serializeQuantity(result.command.teamRequirements[0]!.remainingWorkload), "1/3");
    assert.equal(serializeQuantity(result.command.teamRequirements[0]!.dailyCap!), "2/3");
  });

  it("turns an edited decimal into a new exact rational", () => {
    const result = parseProjectEditCommand(
      values({
        requirements: [{
          teamId: alphaId,
          remainingWorkload: "0.25",
          remainingWorkloadExact: "1/3",
          remainingWorkloadDirty: true,
        }],
      }),
    );
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(serializeQuantity(result.command.teamRequirements[0]!.remainingWorkload), "1/4");
    }
  });

  it("rejects invalid global dates independently without cross-field policy", () => {
    for (const key of [
      "earliestStartDate",
      "objectiveEndDate",
    ] as const) {
      const invalid = parseProjectEditCommand(values({ [key]: "2025-02-30" }));
      assert.equal(invalid.ok, false);
      if (!invalid.ok) assert.ok(invalid.errors.some((entry) => entry.path === `project.${key}`));
    }
    const reversed = parseProjectEditCommand(
      values({
        earliestStartDate: "2025-03-20",
        objectiveEndDate: "2025-01-01",
        mandatory: true,
      }),
    );
    assert.equal(reversed.ok, true);
  });

  it("aggregates field errors and uses no JavaScript Date or silent coercion", async () => {
    const result = parseProjectEditCommand(
      values({
        name: " ",
        priorityPosition: "x",
        earliestStartDate: "bad",
        requirements: [
          {
            teamId: alphaId,
            remainingWorkload: "bad",
            remainingWorkloadExact: "1/1",
            remainingWorkloadDirty: true,
          },
        ],
      }),
    );
    assert.equal(result.ok, false);
    if (!result.ok) assert.ok(result.errors.length >= 4);

    const source = await readFile(
      resolve(process.cwd(), "src/ui/project-edit/parseProjectEditCommand.ts"),
      "utf8",
    );
    assert.doesNotMatch(source, /new Date|Date\.parse|Date\.now/);
    assert.doesNotMatch(source, /Number\(value\)\s*\|\|\s*0/);
  });
});
