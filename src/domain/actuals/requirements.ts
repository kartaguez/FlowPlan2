import { createProjectTeamRequirement, type Project, type ProjectTeamRequirement } from "../model/entities.js";
import { error, failure, success, type DomainError, type DomainResult } from "../model/result.js";

/** Resolve RAF authority using the previous membership, which a stateless factory cannot recover. */
export function transitionProjectRequirements(
  previous: Project,
  candidates: readonly ProjectTeamRequirement[],
): DomainResult<readonly ProjectTeamRequirement[]> {
  const before = new Map(previous.requirements.map((requirement) => [requirement.teamId, requirement]));
  const errors: DomainError[] = [];
  const results = candidates.map((candidate, index) => {
    const current = before.get(candidate.teamId);
    const authority = current?.rafAuthority ?? "current-configuration";
    if (candidate.rafAuthority !== undefined && candidate.rafAuthority !== authority) {
      errors.push(error("RAF_AUTHORITY_CHANGE", `requirements[${index}].rafAuthority`, "RAF authority follows membership transitions and cannot be set by an edit."));
    }
    return createProjectTeamRequirement({
      teamId: candidate.teamId,
      remainingWorkload: candidate.remainingWorkload,
      ...(candidate.dailyCap === undefined ? {} : { dailyCap: candidate.dailyCap }),
      rafAuthority: authority,
    });
  });
  errors.push(...results.flatMap((result) => result.ok ? [] : result.errors));
  if (errors.length) return failure(errors);
  return success(Object.freeze(results.map((result) => {
    if (!result.ok) throw new TypeError("Validated requirement transition failed.");
    return result.value;
  })));
}
