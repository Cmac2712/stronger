import AsyncStorage from "@react-native-async-storage/async-storage";
import { Mutation } from "./types";

const DEFAULT_STORAGE_KEY = "workout/sync-queue/v1";
const INITIAL_BACKOFF_MS = 1000;
const MAX_BACKOFF_MS = 30_000;

type DelayFn = (ms: number) => Promise<void>;

const realDelay: DelayFn = (ms) =>
  new Promise((resolve) => setTimeout(resolve, ms));

function is4xx(error: unknown): boolean {
  if (error && typeof error === "object" && "status" in error) {
    const status = (error as { status: number }).status;
    return status >= 400 && status < 500;
  }
  return false;
}

export type MutationQueueOptions = {
  storageKey?: string;
  onPause?: (error: unknown) => void;
  delay?: DelayFn;
};

export function createMutationQueue(options?: MutationQueueOptions) {
  const storageKey = options?.storageKey ?? DEFAULT_STORAGE_KEY;
  const delay = options?.delay ?? realDelay;
  let queue: Mutation[] = [];
  let loaded = false;
  let paused = false;
  let draining = false;

  async function load() {
    if (loaded) return;
    try {
      const raw = await AsyncStorage.getItem(storageKey);
      if (raw) queue = JSON.parse(raw);
    } catch {
      // Start with empty queue on load failure.
    }
    loaded = true;
  }

  async function save() {
    await AsyncStorage.setItem(storageKey, JSON.stringify(queue));
  }

  return {
    async enqueue(mutation: Mutation) {
      await load();
      queue.push(mutation);
      await save();
    },

    async drain(handler: (mutation: Mutation) => Promise<void>) {
      if (draining || paused) return;
      draining = true;
      await load();
      let backoffMs = INITIAL_BACKOFF_MS;

      try {
        while (queue.length > 0 && !paused) {
          const head = queue[0];
          try {
            await handler(head);
            queue.shift();
            await save();
            backoffMs = INITIAL_BACKOFF_MS;
          } catch (error) {
            if (is4xx(error)) {
              paused = true;
              options?.onPause?.(error);
              break;
            }
            await delay(backoffMs);
            backoffMs = Math.min(backoffMs * 2, MAX_BACKOFF_MS);
          }
        }
      } finally {
        draining = false;
      }
    },

    pause() {
      paused = true;
    },

    resume() {
      paused = false;
    },

    async peek(): Promise<Mutation | null> {
      await load();
      return queue[0] ?? null;
    },

    isPaused() {
      return paused;
    },
  };
}
