import { reconcile } from "./reconciler";
import { SyncableRow, SessionRow } from "./types";

type TestRow = SyncableRow & { value: number };

function row(
  id: string,
  updated_at: string,
  deleted_at: string | null = null,
  value = 0
): TestRow {
  return { id, updated_at, deleted_at, value };
}

describe("reconciler", () => {
  it("seed: local has rows, remote is empty — every local row enqueued for upload", () => {
    const local = [row("a", "2026-05-01T00:00:00.000Z", null, 1)];
    const remote: TestRow[] = [];

    const result = reconcile(local, remote);

    expect(result.writes).toEqual([]);
    expect(result.enqueues).toEqual(local);
  });

  it("hydrate: local is empty, remote has rows — every remote row written to local", () => {
    const local: TestRow[] = [];
    const remote = [row("a", "2026-05-01T00:00:00.000Z", null, 1)];

    const result = reconcile(local, remote);

    expect(result.writes).toEqual(remote);
    expect(result.enqueues).toEqual([]);
  });

  it("local newer: same id, local updated_at > remote — enqueued for upload, no write", () => {
    const local = [row("a", "2026-05-02T00:00:00.000Z", null, 2)];
    const remote = [row("a", "2026-05-01T00:00:00.000Z", null, 1)];

    const result = reconcile(local, remote);

    expect(result.writes).toEqual([]);
    expect(result.enqueues).toEqual(local);
  });

  it("remote newer: same id, remote updated_at > local — written to local, no enqueue", () => {
    const local = [row("a", "2026-05-01T00:00:00.000Z", null, 1)];
    const remote = [row("a", "2026-05-02T00:00:00.000Z", null, 2)];

    const result = reconcile(local, remote);

    expect(result.writes).toEqual(remote);
    expect(result.enqueues).toEqual([]);
  });

  it("tombstone vs edit — tombstone newer: remote tombstone overwrites local edit", () => {
    const local = [row("a", "2026-05-01T00:00:00.000Z", null, 1)];
    const remote = [
      row("a", "2026-05-02T00:00:00.000Z", "2026-05-02T00:00:00.000Z", 1),
    ];

    const result = reconcile(local, remote);

    expect(result.writes).toEqual(remote);
    expect(result.enqueues).toEqual([]);
  });

  it("edit vs tombstone — edit newer: remote edit resurrects local tombstone", () => {
    const local = [
      row("a", "2026-05-01T00:00:00.000Z", "2026-05-01T00:00:00.000Z", 1),
    ];
    const remote = [row("a", "2026-05-02T00:00:00.000Z", null, 2)];

    const result = reconcile(local, remote);

    expect(result.writes).toEqual(remote);
    expect(result.enqueues).toEqual([]);
  });

  it("three-way merge: local [A, B], remote [B_newer, C]", () => {
    const localA = row("a", "2026-05-01T00:00:00.000Z", null, 1);
    const localB = row("b", "2026-05-01T00:00:00.000Z", null, 2);
    const remoteBNewer = row("b", "2026-05-02T00:00:00.000Z", null, 20);
    const remoteC = row("c", "2026-05-01T00:00:00.000Z", null, 3);

    const result = reconcile([localA, localB], [remoteBNewer, remoteC]);

    expect(result.writes).toEqual([remoteBNewer, remoteC]);
    expect(result.enqueues).toEqual([localA]);
  });

  it("equal updated_at tiebreak: remote wins", () => {
    const ts = "2026-05-01T00:00:00.000Z";
    const local = [row("a", ts, null, 1)];
    const remote = [row("a", ts, null, 2)];

    const result = reconcile(local, remote);

    expect(result.writes).toEqual(remote);
    expect(result.enqueues).toEqual([]);
  });

  it("both empty: no writes, no enqueues", () => {
    const result = reconcile<TestRow>([], []);
    expect(result.writes).toEqual([]);
    expect(result.enqueues).toEqual([]);
  });

  it("tombstone vs edit — tombstone is local and newer: enqueued for upload", () => {
    const local = [
      row("a", "2026-05-02T00:00:00.000Z", "2026-05-02T00:00:00.000Z", 1),
    ];
    const remote = [row("a", "2026-05-01T00:00:00.000Z", null, 1)];

    const result = reconcile(local, remote);

    expect(result.writes).toEqual([]);
    expect(result.enqueues).toEqual(local);
  });
});

describe("reconciler — session exercises integration", () => {
  type SessionExerciseRow = SyncableRow & {
    user_id: string;
    session_id: string;
    exercise_id: string;
    order: number;
  };

  function seRow(
    id: string,
    updated_at: string,
    session_id: string,
    exercise_id: string,
    order: number,
    deleted_at: string | null = null
  ): SessionExerciseRow {
    return { id, user_id: "u1", updated_at, deleted_at, session_id, exercise_id, order };
  }

  it("seeds local session exercises to remote when remote is empty", () => {
    const local = [
      seRow("se1", "2026-06-01T00:00:00.000Z", "s1", "bench-press", 0),
      seRow("se2", "2026-06-01T00:01:00.000Z", "s1", "squat", 1),
    ];
    const result = reconcile(local, []);

    expect(result.writes).toEqual([]);
    expect(result.enqueues).toEqual(local);
  });

  it("hydrates remote session exercises into empty local", () => {
    const remote = [
      seRow("se1", "2026-06-01T00:00:00.000Z", "s1", "bench-press", 0),
    ];
    const result = reconcile([], remote);

    expect(result.writes).toEqual(remote);
    expect(result.enqueues).toEqual([]);
  });

  it("merges session exercises with mixed newer/older timestamps", () => {
    const localSe1 = seRow("se1", "2026-06-01T00:00:00.000Z", "s1", "bench-press", 0);
    const localSe2 = seRow("se2", "2026-06-01T02:00:00.000Z", "s1", "squat", 1);
    const remoteSe1 = seRow("se1", "2026-06-01T01:00:00.000Z", "s1", "bench-press", 0);
    const remoteSe3 = seRow("se3", "2026-06-01T00:00:00.000Z", "s1", "deadlift", 2);

    const result = reconcile([localSe1, localSe2], [remoteSe1, remoteSe3]);

    expect(result.writes).toEqual([remoteSe1, remoteSe3]);
    expect(result.enqueues).toEqual([localSe2]);
  });

  it("handles tombstoned session exercises", () => {
    const local = [seRow("se1", "2026-06-01T00:00:00.000Z", "s1", "bench-press", 0)];
    const remote = [
      seRow("se1", "2026-06-01T01:00:00.000Z", "s1", "bench-press", 0, "2026-06-01T01:00:00.000Z"),
    ];

    const result = reconcile(local, remote);

    expect(result.writes).toEqual(remote);
    expect(result.enqueues).toEqual([]);
  });
});

describe("reconciler — sessions integration", () => {
  function sessionRow(
    id: string,
    updated_at: string,
    started_at: number,
    ended_at: number | null = null,
    deleted_at: string | null = null
  ): SessionRow {
    return { id, user_id: "u1", updated_at, deleted_at, started_at, ended_at };
  }

  it("seeds local sessions to remote when remote is empty", () => {
    const local = [
      sessionRow("s1", "2026-06-01T00:00:00.000Z", 1000, 2000),
      sessionRow("s2", "2026-06-01T00:01:00.000Z", 3000, null),
    ];
    const result = reconcile(local, []);

    expect(result.writes).toEqual([]);
    expect(result.enqueues).toEqual(local);
  });

  it("hydrates remote sessions into empty local", () => {
    const remote = [
      sessionRow("s1", "2026-06-01T00:00:00.000Z", 1000, 2000),
    ];
    const result = reconcile([], remote);

    expect(result.writes).toEqual(remote);
    expect(result.enqueues).toEqual([]);
  });

  it("merges sessions with mixed newer/older timestamps", () => {
    const localS1 = sessionRow("s1", "2026-06-01T00:00:00.000Z", 1000, null);
    const localS2 = sessionRow("s2", "2026-06-01T02:00:00.000Z", 3000, 4000);
    const remoteS1 = sessionRow("s1", "2026-06-01T01:00:00.000Z", 1000, 2000);
    const remoteS3 = sessionRow("s3", "2026-06-01T00:00:00.000Z", 5000, null);

    const result = reconcile([localS1, localS2], [remoteS1, remoteS3]);

    expect(result.writes).toEqual([remoteS1, remoteS3]);
    expect(result.enqueues).toEqual([localS2]);
  });

  it("handles tombstoned sessions", () => {
    const local = [sessionRow("s1", "2026-06-01T00:00:00.000Z", 1000, 2000)];
    const remote = [
      sessionRow("s1", "2026-06-01T01:00:00.000Z", 1000, 2000, "2026-06-01T01:00:00.000Z"),
    ];

    const result = reconcile(local, remote);

    expect(result.writes).toEqual(remote);
    expect(result.enqueues).toEqual([]);
  });
});
