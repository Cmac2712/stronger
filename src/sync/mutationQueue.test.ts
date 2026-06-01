import AsyncStorage from "@react-native-async-storage/async-storage";
import { createMutationQueue } from "./mutationQueue";
import { Mutation } from "./types";

function mutation(id: string): Mutation {
  return {
    id,
    table: "user_settings",
    row: { user_id: "u1", rest_duration_ms: 90000 },
    enqueuedAt: "2026-05-31T00:00:00.000Z",
  };
}

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe("mutationQueue", () => {
  it("enqueue then drain invokes handler in FIFO order", async () => {
    const q = createMutationQueue({ delay: () => Promise.resolve() });
    await q.enqueue(mutation("a"));
    await q.enqueue(mutation("b"));
    await q.enqueue(mutation("c"));

    const seen: string[] = [];
    await q.drain(async (m) => {
      seen.push(m.id);
    });

    expect(seen).toEqual(["a", "b", "c"]);
  });

  it("a drained mutation does not re-fire on subsequent drain", async () => {
    const q = createMutationQueue({ delay: () => Promise.resolve() });
    await q.enqueue(mutation("a"));

    const seen: string[] = [];
    const handler = async (m: Mutation) => {
      seen.push(m.id);
    };
    await q.drain(handler);
    await q.drain(handler);

    expect(seen).toEqual(["a"]);
  });

  it("transient error causes retry; drain completes when handler stops throwing", async () => {
    const q = createMutationQueue({ delay: () => Promise.resolve() });
    await q.enqueue(mutation("a"));

    let attempts = 0;
    await q.drain(async () => {
      attempts++;
      if (attempts < 3) {
        throw Object.assign(new Error("network"), { status: 500 });
      }
    });

    expect(attempts).toBe(3);
    expect(await q.peek()).toBeNull();
  });

  it("4xx error pauses the queue and fires onPause", async () => {
    const pauses: unknown[] = [];
    const q = createMutationQueue({
      delay: () => Promise.resolve(),
      onPause: (err) => pauses.push(err),
    });
    await q.enqueue(mutation("a"));
    await q.enqueue(mutation("b"));

    await q.drain(async () => {
      throw Object.assign(new Error("unauthorized"), { status: 401 });
    });

    expect(q.isPaused()).toBe(true);
    expect(pauses).toHaveLength(1);
    // Both mutations still in the queue (none drained)
    expect(await q.peek()).toMatchObject({ id: "a" });
  });

  it("after pause, enqueue adds but drain is a no-op; resume + drain processes all", async () => {
    const q = createMutationQueue({ delay: () => Promise.resolve() });
    await q.enqueue(mutation("a"));

    await q.drain(async () => {
      throw Object.assign(new Error("unauthorized"), { status: 401 });
    });
    expect(q.isPaused()).toBe(true);

    await q.enqueue(mutation("b"));
    const seen: string[] = [];
    await q.drain(async (m) => {
      seen.push(m.id);
    });
    // drain was a no-op because paused
    expect(seen).toEqual([]);

    q.resume();
    await q.drain(async (m) => {
      seen.push(m.id);
    });
    expect(seen).toEqual(["a", "b"]);
  });

  it("queue survives simulated restart (new instance, same storage key)", async () => {
    const key = "test/queue";
    const q1 = createMutationQueue({ storageKey: key, delay: () => Promise.resolve() });
    await q1.enqueue(mutation("a"));
    await q1.enqueue(mutation("b"));

    // Simulate restart: new queue instance with same key
    const q2 = createMutationQueue({ storageKey: key, delay: () => Promise.resolve() });
    expect(await q2.peek()).toMatchObject({ id: "a" });

    const seen: string[] = [];
    await q2.drain(async (m) => {
      seen.push(m.id);
    });
    expect(seen).toEqual(["a", "b"]);
  });

  it("drain is idempotent: concurrent drain calls don't double-fire", async () => {
    const q = createMutationQueue({ delay: () => Promise.resolve() });
    await q.enqueue(mutation("a"));

    let callCount = 0;
    const handler = async () => {
      callCount++;
      // Simulate some async work
      await Promise.resolve();
    };

    // Fire two drains concurrently
    await Promise.all([q.drain(handler), q.drain(handler)]);

    expect(callCount).toBe(1);
  });

  it("peek returns null on empty queue", async () => {
    const q = createMutationQueue({ delay: () => Promise.resolve() });
    expect(await q.peek()).toBeNull();
  });

  it("exponential backoff increases delay on repeated transient failures", async () => {
    const delays: number[] = [];
    const q = createMutationQueue({
      delay: (ms) => {
        delays.push(ms);
        return Promise.resolve();
      },
    });
    await q.enqueue(mutation("a"));

    let attempts = 0;
    await q.drain(async () => {
      attempts++;
      if (attempts <= 4) {
        throw Object.assign(new Error("network"), { status: 500 });
      }
    });

    expect(delays).toEqual([1000, 2000, 4000, 8000]);
  });
});
