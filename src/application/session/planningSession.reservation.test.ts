import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  createCivilDate,
  createReservationId,
  createReservationRatio,
  createTeamId,
  serializeQuantity,
  type DomainResult,
} from "../../domain/index.js";
import { createDemoPlanningScenario } from "../../main/demo/createDemoPlanningScenario.js";
import {
  createPlanningSession,
  type ReplaceTeamReservationsCommand,
} from "./planningSession.js";

function must<T>(result: DomainResult<T>): T {
  if (!result.ok) throw new Error(JSON.stringify(result.errors));
  return result.value;
}

function replacement(
  teamId: ReturnType<typeof createDemoPlanningScenario>["portfolio"]["teams"][number]["id"],
  ratios: readonly string[],
): ReplaceTeamReservationsCommand {
  return {
    kind: "replace-team-reservations",
    teamId,
    reservations: ratios.map((ratio, index) => ({
      reservationId: must(createReservationId(`replacement-${index}`)),
      startDate: must(createCivilDate("2025-01-01")),
      endDate: must(createCivilDate("2025-01-31")),
      ratio: must(createReservationRatio(ratio)),
    })),
  };
}

describe("PlanningSession firm reservation editing", () => {
  it("atomically adds, edits, and removes a complete team reservation set", () => {
    const initial = createDemoPlanningScenario();
    const team = initial.portfolio.teams[1]!;
    const otherReservations = initial.portfolio.reservations.filter(
      (item) => item.teamId !== team.id,
    );
    const existing = initial.portfolio.reservations.find(
      (item) => item.teamId === team.id,
    )!;
    const session = createPlanningSession(initial);
    const addedId = must(createReservationId("new-team-reservation"));
    const result = session.dispatch({
      kind: "replace-team-reservations",
      teamId: team.id,
      reservations: [
        {
          reservationId: existing.id,
          startDate: existing.start,
          endDate: must(createCivilDate("2025-02-20")),
          ratio: must(createReservationRatio("0.5")),
        },
        {
          reservationId: addedId,
          startDate: must(createCivilDate("2025-03-01")),
          endDate: must(createCivilDate("2025-03-05")),
          ratio: must(createReservationRatio("0")),
        },
      ],
    });
    assert.equal(result.ok, true);
    if (!result.ok) return;
    const edited = result.state.portfolio.reservations.filter(
      (item) => item.teamId === team.id,
    );
    assert.deepEqual(edited.map((item) => item.id), [existing.id, addedId]);
    assert.equal(edited[0]!.label, existing.label);
    assert.equal(serializeQuantity(edited[0]!.ratio), "1/2");
    assert.equal(serializeQuantity(edited[1]!.ratio), "0/1");
    assert.ok(
      otherReservations.every((item) =>
        result.state.portfolio.reservations.includes(item),
      ),
    );
    assert.ok(
      result.state.portfolio.teams.every(
        (item, index) => item === initial.portfolio.teams[index],
      ),
    );
    assert.ok(
      result.state.portfolio.projects.every(
        (item, index) => item === initial.portfolio.projects[index],
      ),
    );
    assert.deepEqual(
      result.state.portfolio.priorityOrder,
      initial.portfolio.priorityOrder,
    );
    assert.equal(result.state.planning, initial.planning);
  });

  it("accepts overlapping reservations whose exact total exceeds one", () => {
    const initial = createDemoPlanningScenario();
    const teamId = initial.portfolio.teams[0]!.id;
    const session = createPlanningSession(initial);
    const result = session.dispatch(replacement(teamId, ["0.75", "0.5"]));
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.deepEqual(
      result.state.portfolio.reservations
        .filter((item) => item.teamId === teamId)
        .map((item) => serializeQuantity(item.ratio)),
      ["3/4", "1/2"],
    );
  });

  it("rejects duplicate IDs, cross-team collisions, unknown teams, and reversed dates", () => {
    const initial = createDemoPlanningScenario();
    const teamId = initial.portfolio.teams[0]!.id;
    const otherReservation = initial.portfolio.reservations.find(
      (item) => item.teamId !== teamId,
    )!;
    const valid = replacement(teamId, ["0.25"]);
    const cases: ReplaceTeamReservationsCommand[] = [
      { ...valid, reservations: [valid.reservations[0]!, valid.reservations[0]!] },
      {
        ...valid,
        reservations: [
          { ...valid.reservations[0]!, reservationId: otherReservation.id },
        ],
      },
      { ...valid, teamId: must(createTeamId("unknown-team")) },
      {
        ...valid,
        reservations: [
          {
            ...valid.reservations[0]!,
            startDate: must(createCivilDate("2025-02-01")),
            endDate: must(createCivilDate("2025-01-01")),
          },
        ],
      },
    ];
    for (const command of cases) {
      const session = createPlanningSession(initial);
      const before = session.getState();
      assert.equal(session.dispatch(command).ok, false);
      assert.equal(session.getState(), before);
    }
  });
});
