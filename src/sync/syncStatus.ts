type SyncStatusListener = (paused: boolean) => void;

let paused = false;
const listeners = new Set<SyncStatusListener>();

export function setSyncPaused(value: boolean) {
  paused = value;
  listeners.forEach((l) => l(value));
}

export function isSyncPaused(): boolean {
  return paused;
}

export function onSyncStatusChange(
  listener: SyncStatusListener
): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
