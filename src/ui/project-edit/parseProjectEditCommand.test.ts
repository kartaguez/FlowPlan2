import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, it } from "node:test";
import {
  createProjectId,
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
    priorityPosition: "2",
    earliestStartDate: "2025-01-02",
    objectiveEndDate: "2025-02-03",
    mandatoryDeadline: "2025-03-04",
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
  it("maps all strings to one typed update-project command with exact quantities", () => {
    const result = parseProjectEditCommand(values());
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.command.kind, "update-project");
    assert.equal(result.command.priorityPosition, 2);
    assert.equal(result.command.earliestStartDate, "2025-01-02");
    assert.equal(result.command.objectiveEndDate, "2025-02-03");
    assert.equal(result.command.mandatoryDeadline, "2025-03-04");
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
      values({ earliestStartDate: "", objectiveEndDate: " ", mandatoryDeadline: "" }),
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
      "mandatoryDeadline",
    ] as const) {
      const invalid = parseProjectEditCommand(values({ [key]: "2025-02-30" }));
      assert.equal(invalid.ok, false);
      if (!invalid.ok) assert.ok(invalid.errors.some((entry) => entry.path === `project.${key}`));
    }
    const reversed = parseProjectEditCommand(
      values({
        earliestStartDate: "2025-03-20",
        objectiveEndDate: "2025-01-01",
        mandatoryDeadline: "2025-01-02",
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
