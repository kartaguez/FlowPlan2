export const PLANNING_BACKUP_KEY = "flowplan.backup.v1";

export interface PlanningBackupStore {
  readonly read: () => string | null;
  readonly write: (document: string) => void;
}

export function createLocalPlanningBackupStore(storage: Pick<Storage, "getItem" | "setItem">): PlanningBackupStore {
  return Object.freeze({
    read: () => storage.getItem(PLANNING_BACKUP_KEY),
    write: (document: string) => storage.setItem(PLANNING_BACKUP_KEY, document),
  });
}
