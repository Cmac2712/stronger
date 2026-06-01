import { SyncableRow, ReconcileResult } from "./types";

export function reconcile<T extends SyncableRow>(
  localRows: T[],
  remoteRows: T[]
): ReconcileResult<T> {
  const writes: T[] = [];
  const enqueues: T[] = [];

  const localMap = new Map(localRows.map((r) => [r.id, r]));
  const remoteMap = new Map(remoteRows.map((r) => [r.id, r]));

  for (const remote of remoteRows) {
    const local = localMap.get(remote.id);
    if (!local || remote.updated_at >= local.updated_at) {
      writes.push(remote);
    }
  }

  for (const local of localRows) {
    const remote = remoteMap.get(local.id);
    if (!remote || local.updated_at > remote.updated_at) {
      enqueues.push(local);
    }
  }

  return { writes, enqueues };
}
