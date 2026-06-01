type SyncStatusListener = (paused: boolean) => void;

const listeners = new Set<SyncStatusListener>();

export function setSyncPaused(value: boolean) {
  listeners.forEach((l) => l(value));
}

export function onSyncStatusChange(
  listener: SyncStatusListener
): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
