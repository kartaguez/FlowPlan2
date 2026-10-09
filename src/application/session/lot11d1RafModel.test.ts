import assert from "node:assert/strict";
import { it } from "node:test";
import { createDemoPlanningScenario } from "../../main/demo/createDemoPlanningScenario.js";
import { createPlanningSession, type PlanningSessionState, type ReplaceProjectActualsCommand, type UpdateProjectCurrentRafCommand } from "./planningSession.js";
import { projectCurrentBase } from "./projectCurrentRaf.js";
import { decodePlanningInputs, encodePlanningInputs, encodeCurrentPlanningInputs, decodeCurrentPlanningInputs } from "../backup/planningInputCodec.js";
import { encodeFlowplanBackupV8, decodeFlowplanBackup } from "../backup/flowplanBackupV8.js";
import { encodeFlowplanBackupV5 } from "../backup/planningInputCodec.js";
import { encodeFlowplanBackupV7 } from "../backup/flowplanBackupV7.js";
import { createCivilDate, remainingWorkloadFromSerialized, serializeQuantity, createPortfolio, createProject, transitionProjectRequirements, snapshotId, type DomainResult, type Project } from "../../domain/index.js";
import { createRepositoryPlanningDispatcher } from "../../main/planning/createRepositoryPlanningDispatcher.js";
import { buildPlanningSessionProjection } from "../../main/planning/buildPlanningSessionProjection.js";
import { createMemoryPlanningRepository, createMemoryRepositoryStorage } from "../../infrastructure/persistence/memoryRepositoryStorage.js";
import { createPlanningRepository } from "../persistence/createPlanningRepository.js";
import { PersistenceError, type PlanningRepository } from "../persistence/planningRepository.js";
import { exportRepositoryBackup } from "../persistence/repositoryTransfer.js";
import { capturePortfolioSnapshot } from "../portfolioSnapshots/capturePortfolioSnapshot.js";
import { captureLegacyInputs } from "../portfolioSnapshots/legacyCapture.fixture.js";
import { createSnapshotActualsDraftStore } from "../../ui/actuals/snapshotActualsDraftStore.js";
import { buildProjectSnapshotActualsViewModel } from "./snapshotActualsViewModel.js";
import { createHash } from "node:crypto";
const viewport = { width: 1000, teamLaneHeight: 100, timeAxisHeight: 76 };
const instant = "2026-10-09T12:00:00.000Z";
function must<T>(value: DomainResult<T>): T { if (!value.ok) throw Error(JSON.stringify(value.errors)); return value.value; }
const date = (value: string) => must(createCivilDate(value));
const raf = (value: string) => must(remainingWorkloadFromSerialized(value));
function fixture(source: "none" | "covered" | "uncovered" | "legacy" | "reconciled" = "covered", inactive = false): PlanningSessionState {
  const dto = encodePlanningInputs(createDemoPlanningScenario());
  const p = dto.portfolio.projects[0]!; p.isActive = !inactive;
  for (const row of p.requirements) row.remainingWorkload = "1/3";
  if (source === "legacy" || source === "reconciled") {
    p.migrationStatus = "legacy-pending";
    p.legacyV4Actuals = { actualsFromDate: date("2025-01-01"), records: [{ actualsThroughDate: date("2025-01-02"), teams: p.requirements.map(row => ({ teamId: row.teamId, cumulativeConsumed: "0/1", remainingWorkload: row.remainingWorkload })) }], rafAuthorityByTeam: p.requirements.map(row => ({ teamId: row.teamId, authority: "latest-actuals" })) };
  }
  if (source === "covered" || source === "uncovered" || source === "reconciled") {
    p.migrationStatus = source === "reconciled" ? "reconciled" : "native";
    p.snapshots = [{ snapshotId: snapshotId("project", p.id as Project["id"], 1), version: 1, knowledgeDate: date("2025-01-06"), participation: p.requirements.map(row => row.teamId), retiredZeroTeams: [], raf: p.requirements.map(row => ({ teamId: row.teamId, amount: row.remainingWorkload })),
      ...(source === "uncovered" ? {} : { coverage: { actualsFrom: date("2025-01-01"), actualsThrough: date("2025-01-02"), periods: [{ periodId: "original", from: date("2025-01-01"), through: date("2025-01-02"), consumed: p.requirements.map(row => ({ teamId: row.teamId, amount: "0/1" })) }] } }) }];
  }
  return decodePlanningInputs(dto, 5, undefined, true);
}
const first = (state: PlanningSessionState) => state.portfolio.projects[0]!;
const commandA = (project: Project, amount = "2/3", index = 0): UpdateProjectCurrentRafCommand => ({ kind: "update-project-current-raf", projectId: project.id, base: projectCurrentBase(project), patch: [{ teamId: project.requirements[index]!.teamId, remainingWorkload: raf(amount) }] });
function commandB(project: Project, consumedChanged = false, rafChanged = false): ReplaceProjectActualsCommand {
  const latest = project.snapshots!.at(-1)!;
  const current = { participation: latest.participation, retiredZeroTeams: latest.retiredZeroTeams,
    raf: project.requirements.map((row, i) => ({ teamId: row.teamId, amount: rafChanged && i === 0 ? raf("2/3") : row.remainingWorkload })),
    ...(latest.coverage ? { coverage: { ...latest.coverage, periods: latest.coverage.periods.map(period => ({ ...period, periodId: consumedChanged ? "changed" : period.periodId, consumed: period.consumed.map((row, i) => ({ ...row, amount: consumedChanged && i === 0 ? must(importConsumed("1/3")) : row.amount })) })) } } : {}) };
  return { kind: "replace-project-actuals", projectId: project.id, base: projectCurrentBase(project), baseVersion: latest.version,
    teamRequirements: project.requirements.map(({ teamId, dailyCap }) => ({ teamId, ...(dailyCap === undefined ? {} : { dailyCap }) })), current,
    intent: latest.coverage && consumedChanged ? { kind: "replace", editedZone: { from: latest.coverage.actualsFrom, through: latest.coverage.actualsThrough } } : { kind: "raf-only" },
    evidence: { rafTeams: [project.requirements[0]!.teamId], consumedCells: consumedChanged ? [{ periodId: "changed", teamId: project.requirements[0]!.teamId }] : [] } };
}
import { consumedWorkloadFromSerialized as importConsumed } from "../../domain/index.js";
for (const source of ["none", "covered", "uncovered", "legacy", "reconciled"] as const) for (const inactive of [false, true]) it(`D1/D2/A1/F2 independent RAF: ${source}, inactive=${inactive}`, () => {
  const state = fixture(source, inactive), original = first(state), session = createPlanningSession(state);
  assert.ok(session.dispatch(commandA(original)).ok);
  const updated = first(session.getState());
  assert.equal(serializeQuantity(updated.requirements[0]!.remainingWorkload), "2/3");
  assert.deepEqual(updated.snapshots, original.snapshots); assert.deepEqual(updated.legacyV4Actuals, original.legacyV4Actuals); assert.deepEqual(updated.legacyV4RafAuthority, original.legacyV4RafAuthority);
  assert.deepEqual(updated.requirements.map(row => row.dailyCap), original.requirements.map(row => row.dailyCap));
  assert.equal(projectCurrentBase(updated).source, projectCurrentBase(original).source);
  assert.ok(createPortfolio(session.getState().portfolio).ok);
  assert.ok(transitionProjectRequirements(updated, updated.requirements.map(row => ({ ...row, remainingWorkload: raf("0/1") }))).ok);
  assert.equal(encodeFlowplanBackupV8(decodeFlowplanBackup(encodeFlowplanBackupV8({ ...session.getState(), portfolioSnapshots: [] }, instant)), instant), encodeFlowplanBackupV8({ ...session.getState(), portfolioSnapshots: [] }, instant));
  if (["covered", "uncovered", "legacy", "reconciled"].includes(source)) assert.throws(() => encodeFlowplanBackupV5({ ...session.getState(), portfolioSnapshots: [] }), /RAF_MISMATCH/);
});
for (const value of ["2/6", "0/1", "9007199254740993000000000000001/7"]) it(`A2 exact quantities and unchanged identity: ${value}`, () => {
  const session = createPlanningSession(fixture()), project = first(session.getState()), command = commandA(project, value);
  const before = session.getState(); assert.ok(session.dispatch(command).ok);
  if (value === "2/6") assert.strictEqual(session.getState(), before);
  const current = session.getState(); assert.ok(session.dispatch(commandA(first(current), value)).ok); assert.strictEqual(session.getState(), current);
});
for (const variant of ["missing", "duplicate", "unknown", "stale-raf", "stale-source", "stale-membership", "negative"] as const) it(`A2 invalid patch/base rejected atomically: ${variant}`, () => {
  const session = createPlanningSession(fixture()), project = first(session.getState());
  let command = commandA(project);
  if (variant === "missing") command = { ...command, base: undefined as never };
  if (variant === "duplicate") command = { ...command, patch: [...command.patch, ...command.patch] };
  if (variant === "unknown") command = { ...command, patch: [{ ...command.patch[0]!, teamId: "unknown" as never }] };
  if (variant === "stale-raf") { assert.ok(session.dispatch(command).ok); command = { ...command, patch: [{ ...command.patch[0]!, remainingWorkload: raf("2/3") }] }; }
  if (variant === "stale-source") command = { ...command, base: { ...command.base, source: "none" } };
  if (variant === "stale-membership") command = { ...command, base: { ...command.base, requirements: command.base.requirements.slice(1) } };
  if (variant === "negative") command = { ...command, patch: [{ ...command.patch[0]!, remainingWorkload: {} as never }] };
  const before = session.getState(); assert.equal(session.dispatch(command).ok, false); assert.strictEqual(session.getState(), before);
});
for (const actualsChanged of [false, true]) for (const rafChanged of [false, true]) it(`R2a/R1a/T1/S1 direct Application transaction Actuals=${actualsChanged} RAF=${rafChanged}`, async () => {
  const state = fixture(), calls: string[] = [], repository = createMemoryPlanningRepository({ observe: (op, store) => calls.push(`${op}:${store}`) });
  const stage = await repository.stageImport(state, "seed"); await repository.activateImport(stage, null, "activate");
  const current = await repository.readCurrent(), session = createPlanningSession(current.state, { today: () => date("2025-01-06") }); let builds = 0;
  const dispatcher = createRepositoryPlanningDispatcher({ repository, current, session, geometryViewport: viewport, hasUnappliedChanges: () => false,
    buildProjection: input => { builds++; return buildPlanningSessionProjection(input); }, operationId: () => "operation" });
  const before = session.getState(), projection = dispatcher.getProjection(); calls.length = 0; const count = builds;
  assert.ok((await dispatcher.dispatch(commandB(first(before), actualsChanged, rafChanged))).ok);
  assert.equal(builds - count, actualsChanged || rafChanged ? 1 : 0);
  assert.equal(calls.filter(call => call === "put:current").length, actualsChanged || rafChanged ? 1 : 0);
  assert.ok(!calls.some(call => /snapshotContent|snapshotMetadata/.test(call)));
  assert.equal(first(session.getState()).snapshots!.length, actualsChanged ? 2 : 1);
  if (!actualsChanged && !rafChanged) { assert.strictEqual(session.getState(), before); assert.strictEqual(dispatcher.getProjection(), projection); }
  assert.deepEqual(first(session.getState()).snapshots![0], first(before).snapshots![0]);
  if (actualsChanged) assert.deepEqual(first(session.getState()).snapshots!.at(-1)!.raf.map(row => serializeQuantity(row.amount)), first(session.getState()).requirements.map(row => serializeQuantity(row.remainingWorkload)));
  const actualsEnd = first(session.getState()).snapshots!.at(-1)!.coverage!.actualsThrough;
  for (const team of dispatcher.getProjection().planningResult.teamPlans) for (const plan of team.projectPlans.filter(row => row.projectId === first(before).id)) for (const allocation of plan.allocations) assert.ok(allocation.date > actualsEnd);
});
it("R1a/R2b consumption-only requires A confirmation, accepts unchanged RAF, leaves B unconfirmed", () => {
  const session = createPlanningSession(fixture(), { today: () => date("2025-01-06") }), project = first(session.getState()), command = commandB(project, true);
  assert.equal(session.dispatch({ ...command, evidence: { ...command.evidence, rafTeams: [] } }).ok, false);
  assert.ok(session.dispatch(command).ok); assert.equal(first(session.getState()).snapshots!.length, 2);
});
for (const change of ["split", "from", "through", "erosion-total"] as const) it(`R1b/D5 partition change confirms all participants: ${change}`, () => {
  const session = createPlanningSession(fixture(), { today: () => date("2025-01-06") }), project = first(session.getState());
  const command = commandB(project), old = command.current.coverage!, period = old.periods[0]!;
  let coverage: typeof command.current.coverage;
  if (change === "split") coverage = { ...old, periods: ["2025-01-01", "2025-01-02"].map((value, i) => ({ ...period, periodId: `split${i}`, from: date(value), through: date(value) })) };
  else if (change === "from") coverage = { ...old, actualsFrom: date("2025-01-02"), periods: [{ ...period, periodId: "trimmed", from: date("2025-01-02") }] };
  else if (change === "through") coverage = { ...old, actualsThrough: date("2025-01-01"), periods: [{ ...period, periodId: "trimmed", through: date("2025-01-01") }] };
  const { coverage: _coverage, ...rest } = command.current; void _coverage;
  const next: ReplaceProjectActualsCommand = { ...command, intent: change === "split" ? { kind: "replace", editedZone: { from: old.actualsFrom, through: old.actualsThrough } } : { kind: "erosion" }, current: { ...rest, ...(coverage ? { coverage } : {}) } };
  assert.equal(session.dispatch(next).ok, false);
  assert.ok(session.dispatch({ ...next, evidence: { ...next.evidence, rafTeams: project.requirements.map(row => row.teamId) } }).ok);
  assert.equal(first(session.getState()).snapshots!.length, 2);
});
it("A3/R1c no historical RAF restoration after several revisions", () => {
  const session = createPlanningSession(fixture(), { today: () => date("2025-01-06") });
  assert.ok(session.dispatch(commandA(first(session.getState()), "3/7", 1)).ok);
  assert.ok(session.dispatch(commandA(first(session.getState()), "5/9", 1)).ok);
  const command = commandB(first(session.getState()), true); assert.ok(session.dispatch(command).ok);
  assert.equal(serializeQuantity(first(session.getState()).requirements[1]!.remainingWorkload), "5/9");
  assert.equal(serializeQuantity(first(session.getState()).snapshots![0]!.raf[1]!.amount), "1/3");
});
for (const changed of [false, true]) it(`C2/R2b stale full RAF base blocks routing even target=current, Actuals changed=${changed}`, () => {
  const session = createPlanningSession(fixture(), { today: () => date("2025-01-06") }), command = commandB(first(session.getState()), changed);
  assert.ok(session.dispatch(commandA(first(session.getState()), "2/3", 1)).ok);
  const before = session.getState(), current = first(before);
  assert.equal(session.dispatch({ ...command, current: { ...command.current, raf: current.requirements.map(row => ({ teamId: row.teamId, amount: row.remainingWorkload })) } }).ok, false);
  assert.strictEqual(session.getState(), before); assert.equal(current.snapshots!.length, 1);
});
it("R2b equivalent rationals and confirmations are no-op; technical identity substitution refuses", () => {
  const session = createPlanningSession(fixture()), project = first(session.getState()), command = commandB(project);
  const before = session.getState(); assert.ok(session.dispatch({ ...command, current: { ...command.current, raf: command.current.raf.map(row => ({ ...row, amount: raf("2/6") })) } }).ok);
  assert.strictEqual(session.getState(), before);
  assert.equal(session.dispatch({ ...command, current: { ...command.current, coverage: { ...command.current.coverage!, periods: command.current.coverage!.periods.map(p => ({ ...p, periodId: "artificial" })) } } }).ok, false);
  assert.strictEqual(session.getState(), before);
});
it("A6 old Forecast draft preserves untouched RAF and refuses hidden numeric revision", () => {
  const session = createPlanningSession(fixture("none")), project = first(session.getState());
  assert.ok(session.dispatch(commandA(project)).ok);
  const fields = { kind: "update-project" as const, projectId: project.id, name: "renamed", programId: project.programId!, priorityFamilyId: project.priorityFamilyId!, teamRequirements: project.requirements };
  assert.equal(session.dispatch(fields).ok, false);
  assert.ok(session.dispatch({ ...fields, teamRequirements: project.requirements.map(row => ({ ...row, remainingWorkloadChanged: false })) }).ok);
  assert.equal(serializeQuantity(first(session.getState()).requirements[0]!.remainingWorkload), "2/3");
});
for (const modal of [false, true]) it(`C1/C2 drafts detect independent RAF at same Actuals version, preserve invalid text, modal=${modal}`, () => {
  const session = createPlanningSession(fixture()), project = first(session.getState()), store = createSnapshotActualsDraftStore(), base = store.initialize(buildProjectSnapshotActualsViewModel(session.getState(), project.id)!);
  const teams = base.teams.map(row => row.teamId === project.requirements[0]!.teamId ? { ...row, raf: "1/", rafConfirmed: true } : row);
  store.update(project.id, { ...base, teams, ...(modal ? { modal: { step: 3 as const, selection: "initial" as const, periods: base.periods, teams, confirmed: true, retirementConfirmed: false, anchor: 0 } } : {}) });
  assert.ok(session.dispatch(commandA(project, "2/3", 1)).ok);
  store.rebase(buildProjectSnapshotActualsViewModel(session.getState(), project.id)!);
  const rebased = store.get(project.id)!; assert.equal(rebased.baseVersion, 1); assert.equal(rebased.teams[0]!.raf, "1/");
  assert.equal(rebased.stale, modal);
  if (modal) { assert.ok(store.review(project.id)); assert.equal(store.get(project.id)!.modal!.teams[0]!.raf, "1/"); assert.equal(store.get(project.id)!.modal!.teams[0]!.rafConfirmed, false); }
});
for (const outcome of ["projection", "abort", "uncertain", "publish", "CAS"] as const) it(`T1/T2/T3 RAF transaction failure ${outcome} preserves RAM and requires appropriate recovery`, async () => {
  const state = fixture(), repository = createMemoryPlanningRepository(); const stage = await repository.stageImport(state, "seed"); await repository.activateImport(stage, null, "activate");
  const current = await repository.readCurrent(), live = createPlanningSession(current.state), session = outcome === "publish" ? { ...live, publish: () => ({ ok: false as const, errors: [] }) } : live;
  const repo: PlanningRepository = outcome === "abort" ? { ...repository, writeCurrent: async () => { throw new PersistenceError("QUOTA", "abort", { commitOutcome: "not-applied" }); } } : outcome === "uncertain" ? { ...repository, writeCurrent: async (...args) => { await repository.writeCurrent(...args); throw Error("ack lost"); } } : repository;
  const dispatcher = createRepositoryPlanningDispatcher({ repository: repo, current, session, geometryViewport: viewport, hasUnappliedChanges: () => false,
    buildProjection: input => { if (outcome === "projection" && input.state !== current.state && first(input.state).requirements[0] !== first(current.state).requirements[0] && serializeQuantity(first(input.state).requirements[0]!.remainingWorkload) === "2/3") throw Error("projection failed"); return buildPlanningSessionProjection(input); }, operationId: () => "local" });
  const before = session.getState(), projection = dispatcher.getProjection();
  if (outcome === "CAS") await repository.writeCurrent(encodeCurrentPlanningInputs(current.state), current.token, "foreign");
  assert.equal((await dispatcher.dispatch(commandA(first(before)))).ok, false); assert.strictEqual(session.getState(), before); assert.strictEqual(dispatcher.getProjection(), projection);
  assert.equal(dispatcher.isReloadRequired(), ["uncertain", "publish", "CAS"].includes(outcome));
  assert.deepEqual(first((await repository.readCurrent()).state).snapshots, first(before).snapshots);
  if (outcome === "uncertain" || outcome === "publish") assert.equal(serializeQuantity(first((await repository.readCurrent()).state).requirements[0]!.remainingWorkload), "2/3");
});
const hash = async (text: string) => createHash("sha256").update(text).digest("hex");
for (const oldCurrent of [false, true]) for (const mixed of [false, true]) it(`K3/K5/K6 mixed repository round trip, old Current=${oldCurrent}, mixed captures=${mixed}`, async () => {
  const state = fixture(), storage = createMemoryRepositoryStorage(), repository = createPlanningRepository(storage, hash);
  const stage = await repository.stageImport(state, "seed"), token = await repository.activateImport(stage, null, "activate");
  if (oldCurrent) {
    const text = JSON.stringify(encodePlanningInputs(state));
    await storage.transaction(["current"], "readwrite", async tx => { await tx.put("current", [token.generation], { text, digest: await hash(text) }); });
  }
  const rawBefore = await storage.transaction(["current"], "readonly", tx => tx.get("current", [token.generation]));
  const current = await repository.readCurrent(); const session = createPlanningSession(current.state);
  assert.ok(session.dispatch(commandA(first(session.getState()), "2/6")).ok);
  assert.deepEqual(await storage.transaction(["current"], "readonly", tx => tx.get("current", [token.generation])), rawBefore);
  const run = buildPlanningSessionProjection({ state: session.getState(), geometryViewport: viewport });
  let latest = token;
  const modern = capturePortfolioSnapshot(session.getState(), run.planningResult, run.actualsReconstruction, "new", instant);
  if (mixed) latest = await repository.createSnapshot(captureLegacyInputs(state, run.planningResult, run.actualsReconstruction, "old", instant), latest.currentRevision, latest, "save-old");
  latest = await repository.createSnapshot(modern, latest.currentRevision, latest, "save-new");
  assert.deepEqual(await storage.transaction(["current"], "readonly", tx => tx.get("current", [token.generation])), rawBefore);
  const apply = createPlanningSession((await repository.readCurrent()).state); assert.ok(apply.dispatch(commandA(first(apply.getState()))).ok);
  latest = await repository.writeCurrent(encodeCurrentPlanningInputs(apply.getState()), latest, "raf");
  const oldArtifact = mixed ? await repository.readSnapshot("old", latest) : null;
  const exported = (await exportRepositoryBackup(repository, instant)).join(""); assert.equal(JSON.parse(exported).version, 8);
  const decoded = decodeFlowplanBackup(exported); assert.equal(serializeQuantity(first(decoded).requirements[0]!.remainingWorkload), "2/3");
  const imported = createMemoryPlanningRepository(), next = await imported.stagePortableDocument(exported, "import"); await imported.activateImport(next, null, "activate");
  const reopened = await imported.readCurrent(); assert.deepEqual(encodeCurrentPlanningInputs(reopened.state), encodeCurrentPlanningInputs(apply.getState()));
  assert.deepEqual(await imported.readSnapshot("new", reopened.token), modern);
  if (mixed) assert.deepEqual(await imported.readSnapshot("old", reopened.token), oldArtifact);
  assert.throws(() => encodeFlowplanBackupV7(decoded), /RAF_MISMATCH|schema 1/);
  const invalid = JSON.parse(exported); invalid.data.portfolioSnapshots[0].forecast.projects[0].raf = "9/1";
  const before = await imported.readInfo(); await assert.rejects(imported.stagePortableDocument(JSON.stringify(invalid), "invalid")); assert.deepEqual(await imported.readInfo(), before);
});
it("D3 new model keeps membership and historical Team restrictions", () => {
  const state = fixture(), project = first(state);
  assert.equal(createPortfolio({ ...state.portfolio, projects: [must(createProject({ ...project, requirements: project.requirements.slice(1) })), ...state.portfolio.projects.slice(1)] }).ok, false);
  assert.equal(createPortfolio({ ...state.portfolio, teams: state.portfolio.teams.slice(1) }).ok, false);
  assert.equal(createProject({ ...project, requirements: [] }).ok, false);
});
it("K1/K2 schema discrimination rejects unknown model and historical numeric divergence", () => {
  const state = fixture(); const old = encodePlanningInputs(state); old.portfolio.projects[0]!.requirements[0]!.remainingWorkload = "2/3";
  assert.throws(() => decodePlanningInputs(old, 5, undefined, true), /RAF_MISMATCH/);
  assert.throws(() => decodeCurrentPlanningInputs({ ...old, rafModelVersion: 3 }), /RAF model/);
  assert.ok(decodeCurrentPlanningInputs({ ...old, rafModelVersion: 2 }));
});
for (const historicalZero of [false, true]) it(`D4 retirement requires confirmation with divergent RAF, historicalZero=${historicalZero}`, () => {
  const state = fixture(), original = first(state);
  const project = historicalZero ? must(createProject({ ...original, snapshots: original.snapshots!.map(s => ({ ...s, raf: s.raf.map((row, i) => i === 0 ? { ...row, amount: raf("0/1") } : row) })) })) : original;
  const session = createPlanningSession({ ...state, portfolio: must(createPortfolio({ ...state.portfolio, projects: [project, ...state.portfolio.projects.slice(1)] })) }, { today: () => date("2025-01-06") });
  assert.ok(session.dispatch(commandA(first(session.getState()), historicalZero ? "3/7" : "0/1")).ok);
  const current = first(session.getState()), teamId = current.requirements[0]!.teamId, base = commandB(current), oldPeriod = base.current.coverage!.periods[0]!;
  const command: ReplaceProjectActualsCommand = { ...base, intent: { kind: "membership" }, teamRequirements: base.teamRequirements.slice(1),
    current: { ...base.current, participation: base.current.participation.slice(1), retiredZeroTeams: [teamId], raf: base.current.raf.slice(1), coverage: { ...base.current.coverage!, periods: [{ ...oldPeriod, periodId: "retired", consumed: oldPeriod.consumed.slice(1) }] } }, evidence: { consumedCells: [] } };
  assert.equal(session.dispatch(command).ok, false);
  assert.ok(session.dispatch({ ...command, evidence: { consumedCells: [], retiredTeams: [teamId] } }).ok);
  const removed = first(session.getState()); assert.ok(!removed.requirements.some(row => row.teamId === teamId)); assert.deepEqual(removed.snapshots![0], current.snapshots![0]);
  const reintroduce: ReplaceProjectActualsCommand = { ...base, base: projectCurrentBase(removed), baseVersion: 2, intent: { kind: "membership" },
    current: { ...base.current, raf: [{ teamId, amount: raf("0/1") }, ...removed.snapshots!.at(-1)!.raf], coverage: { ...base.current.coverage!, periods: [{ ...oldPeriod, periodId: "reintroduced" }] } }, evidence: { consumedCells: [{ periodId: "reintroduced", teamId }], rafTeams: [teamId] } };
  assert.ok(session.dispatch(reintroduce).ok); assert.equal(serializeQuantity(first(session.getState()).requirements[0]!.remainingWorkload), "0/1");
});
it("C2/R1c remote consumption invalidates its RAF proof without losing a disjoint RAF draft", () => {
  const session = createPlanningSession(fixture(), { today: () => date("2025-01-06") }), project = first(session.getState()), store = createSnapshotActualsDraftStore(), base = store.initialize(buildProjectSnapshotActualsViewModel(session.getState(), project.id)!);
  store.update(project.id, { ...base, teams: base.teams.map((row, i) => ({ ...row, raf: i === 1 ? "2/3" : row.raf, rafConfirmed: true })) });
  assert.ok(session.dispatch(commandB(project, true)).ok);
  store.rebase(buildProjectSnapshotActualsViewModel(session.getState(), project.id)!);
  const rebased = store.get(project.id)!; assert.equal(rebased.stale, false); assert.equal(rebased.teams[0]!.rafConfirmed, false); assert.equal(rebased.teams[1]!.raf, "2/3");
});
for (const field of ["membership", "source", "caps"] as const) it(`C3/R2b full base checks ${field} before no-op`, () => {
  const session = createPlanningSession(fixture()), command = commandB(first(session.getState()));
  const base = field === "source" ? { ...command.base, source: "none" } : { ...command.base, requirements: field === "membership" ? command.base.requirements.slice(1) : command.base.requirements.map(row => ({ ...row, dailyCap: "99/1" })) };
  const before = session.getState(); assert.equal(session.dispatch({ ...command, base }).ok, false); assert.strictEqual(session.getState(), before);
});
it("A5 explicit first zero coverage after RAF revision switches pending legacy only on B", () => {
  const session = createPlanningSession(fixture("legacy"), { today: () => date("2025-01-06") });
  assert.ok(session.dispatch(commandA(first(session.getState()))).ok); const project = first(session.getState()), teamIds = project.requirements.map(row => row.teamId);
  const command: ReplaceProjectActualsCommand = { kind: "replace-project-actuals", projectId: project.id, base: projectCurrentBase(project), baseVersion: 0, intent: { kind: "reconcile" }, teamRequirements: project.requirements.map(row => ({ teamId: row.teamId })), current: { participation: teamIds, retiredZeroTeams: [], raf: project.requirements.map(row => ({ teamId: row.teamId, amount: row.remainingWorkload })), coverage: { actualsFrom: date("2025-01-01"), actualsThrough: date("2025-01-02"), periods: [{ periodId: "reconcile", from: date("2025-01-01"), through: date("2025-01-02"), consumed: teamIds.map(teamId => ({ teamId, amount: must(importConsumed("0/1")) })) }] } }, evidence: { consumedCells: teamIds.map(teamId => ({ periodId: "reconcile", teamId })), rafTeams: teamIds } };
  assert.ok(session.dispatch(command).ok); assert.equal(first(session.getState()).snapshots!.length, 1); assert.deepEqual(first(session.getState()).legacyV4Actuals, project.legacyV4Actuals);
  assert.equal(serializeQuantity(first(session.getState()).snapshots![0]!.raf[0]!.amount), "2/3");
});
for (const source of ["uncovered", "legacy", "reconciled"] as const) it(`K2/K4 captured divergent RAF preserves exact historical source after B: ${source}`, async () => {
  const session = createPlanningSession(fixture(source), { today: () => date("2025-01-06") });
  assert.ok(session.dispatch(commandA(first(session.getState()))).ok);
  const capturedState = session.getState(), project = first(capturedState), run = buildPlanningSessionProjection({ state: capturedState, geometryViewport: viewport });
  const capture = capturePortfolioSnapshot(capturedState, run.planningResult, run.actualsReconstruction, `capture-${source}`, instant);
  assert.equal(capture.inputsSchemaVersion, 2); assert.equal(capture.forecast.projects[0]!.raf, "1/1");
  const teams = project.requirements.map(row => row.teamId), old = project.snapshots?.at(-1);
  const command: ReplaceProjectActualsCommand = { kind: "replace-project-actuals", projectId: project.id, base: projectCurrentBase(project), baseVersion: old?.version ?? 0,
    teamRequirements: project.requirements.map(row => ({ teamId: row.teamId })), intent: old ? { kind: "replace", editedZone: { from: date("2025-01-01"), through: date("2025-01-03") } } : { kind: "reconcile" },
    current: { participation: teams, retiredZeroTeams: [], raf: project.requirements.map(row => ({ teamId: row.teamId, amount: row.remainingWorkload })), coverage: { actualsFrom: date("2025-01-01"), actualsThrough: date("2025-01-03"), periods: [{ periodId: "new-source", from: date("2025-01-01"), through: date("2025-01-03"), consumed: teams.map(teamId => ({ teamId, amount: must(importConsumed("0/1")) })) }] } }, evidence: { rafTeams: teams, consumedCells: teams.map(teamId => ({ periodId: "new-source", teamId })) } };
  assert.ok(session.dispatch(command).ok);
  const repository = createMemoryPlanningRepository(), stage = await repository.stageImport({ ...session.getState(), portfolioSnapshots: [capture] }, "mixed-source");
  await repository.activateImport(stage, null, "activate"); const current = await repository.readCurrent();
  assert.deepEqual(await repository.readSnapshot(capture.snapshotId, current.token), capture);
  assert.ok(current.identities.projects.includes(project.id)); assert.ok(teams.every(teamId => current.identities.teams.includes(teamId)));
  assert.deepEqual(decodeFlowplanBackup((await exportRepositoryBackup(repository, instant)).join("")).portfolioSnapshots, [capture]);
});
it("C1 safe rebase keeps an equivalent entered RAF text on a remotely unchanged Team", () => {
  const session = createPlanningSession(fixture()), project = first(session.getState()), store = createSnapshotActualsDraftStore(), base = store.initialize(buildProjectSnapshotActualsViewModel(session.getState(), project.id)!);
  store.update(project.id, { ...base, teams: base.teams.map((row, i) => i === 0 ? { ...row, raf: "2/6" } : row) });
  assert.ok(session.dispatch(commandA(project, "2/3", 1)).ok);
  store.rebase(buildProjectSnapshotActualsViewModel(session.getState(), project.id)!);
  assert.equal(store.get(project.id)!.teams[0]!.raf, "2/6"); assert.equal(store.get(project.id)!.teams[1]!.raf, "2/3"); assert.equal(store.get(project.id)!.stale, false);
});
it("A1 preserves every non-RAF field and optional provenance absence on native requirements", () => {
  const state = createDemoPlanningScenario(), project = first(state), session = createPlanningSession(state);
  assert.equal(project.requirements[0]!.rafAuthority, undefined);
  assert.ok(session.dispatch(commandA(project)).ok);
  const updated = first(session.getState());
  const withoutRaf = (row: Project["requirements"][number]) => { const { remainingWorkload: _raf, ...rest } = row; void _raf; return rest; };
  assert.deepEqual(updated.requirements.map(withoutRaf), project.requirements.map(withoutRaf));
  assert.deepEqual(updated.requirements[1], project.requirements[1]);
  const { requirements: _before, ...oldFields } = project, { requirements: _after, ...newFields } = updated; void _before; void _after;
  assert.deepEqual(newFields, oldFields);
});
