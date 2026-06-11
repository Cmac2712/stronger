import { reconcile } from "./reconciler";
import { SyncableRow, SessionRow, SetRow, TemplateRow } from "./types";

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

describe("reconciler — templates integration", () => {
  function templateRow(
    id: string,
    updated_at: string,
    name: string,
    exercise_ids: string[],
    deleted_at: string | null = null
  ): TemplateRow {
    return { id, user_id: "u1", updated_at, deleted_at, name, exercise_ids };
  }

  it("seeds local templates to remote when remote is empty", () => {
    const local = [
      templateRow("t1", "2026-06-11T00:00:00.000Z", "Push", ["barbell-bench-press"]),
    ];
    const result = reconcile(local, []);

    expect(result.writes).toEqual([]);
    expect(result.enqueues).toEqual(local);
  });

  it("hydrates remote templates into empty local", () => {
    const remote = [
      templateRow("t1", "2026-06-11T00:00:00.000Z", "Pull", ["deadlift", "barbell-row"]),
    ];
    const result = reconcile([], remote);

    expect(result.writes).toEqual(remote);
    expect(result.enqueues).toEqual([]);
  });

  it("later updated_at wins whole-row: the newer replacement carries its exercise list wholesale", () => {
    const local = [
      templateRow("t1", "2026-06-11T00:00:00.000Z", "Push", ["barbell-bench-press"]),
    ];
    const remote = [
      templateRow("t1", "2026-06-11T01:00:00.000Z", "Push v2", ["overhead-press", "dip"]),
    ];

    const result = reconcile(local, remote);

    expect(result.writes).toEqual(remote);
    expect(result.enqueues).toEqual([]);
  });

  it("tombstone newer than edit: remote delete overwrites the local template", () => {
    const local = [templateRow("t1", "2026-06-11T00:00:00.000Z", "Push", ["dip"])];
    const remote = [
      templateRow("t1", "2026-06-11T01:00:00.000Z", "Push", ["dip"], "2026-06-11T01:00:00.000Z"),
    ];

    const result = reconcile(local, remote);

    expect(result.writes).toEqual(remote);
    expect(result.enqueues).toEqual([]);
  });

  it("local tombstone newer than remote edit: the delete is enqueued for upload", () => {
    const local = [
      templateRow("t1", "2026-06-11T02:00:00.000Z", "Push", ["dip"], "2026-06-11T02:00:00.000Z"),
    ];
    const remote = [templateRow("t1", "2026-06-11T01:00:00.000Z", "Push", ["dip"])];

    const result = reconcile(local, remote);

    expect(result.writes).toEqual([]);
    expect(result.enqueues).toEqual(local);
  });
});

describe("reconciler — sets integration", () => {
  function setRow(
    id: string,
    updated_at: string,
    session_exercise_id: string,
    set_number: number,
    reps: number,
    weight: number,
    deleted_at: string | null = null
  ): SetRow {
    return { id, user_id: "u1", updated_at, deleted_at, session_exercise_id, set_number, reps, weight };
  }

  it("seeds local sets to remote when remote is empty", () => {
    const local = [
      setRow("set1", "2026-06-01T00:00:00.000Z", "se1", 1, 8, 80),
      setRow("set2", "2026-06-01T00:01:00.000Z", "se1", 2, 6, 85),
    ];
    const result = reconcile(local, []);

    expect(result.writes).toEqual([]);
    expect(result.enqueues).toEqual(local);
  });

  it("hydrates remote sets into empty local", () => {
    const remote = [
      setRow("set1", "2026-06-01T00:00:00.000Z", "se1", 1, 8, 80),
    ];
    const result = reconcile([], remote);

    expect(result.writes).toEqual(remote);
    expect(result.enqueues).toEqual([]);
  });

  it("merges sets with mixed newer/older timestamps", () => {
    const localSet1 = setRow("set1", "2026-06-01T00:00:00.000Z", "se1", 1, 8, 80);
    const localSet2 = setRow("set2", "2026-06-01T02:00:00.000Z", "se1", 2, 6, 85);
    const remoteSet1 = setRow("set1", "2026-06-01T01:00:00.000Z", "se1", 1, 10, 80);
    const remoteSet3 = setRow("set3", "2026-06-01T00:00:00.000Z", "se1", 3, 5, 90);

    const result = reconcile([localSet1, localSet2], [remoteSet1, remoteSet3]);

    expect(result.writes).toEqual([remoteSet1, remoteSet3]);
    expect(result.enqueues).toEqual([localSet2]);
  });

  it("tombstone newer than edit: remote tombstone overwrites local edit", () => {
    const local = [setRow("set1", "2026-06-01T00:00:00.000Z", "se1", 1, 8, 80)];
    const remote = [
      setRow("set1", "2026-06-01T01:00:00.000Z", "se1", 1, 8, 80, "2026-06-01T01:00:00.000Z"),
    ];

    const result = reconcile(local, remote);

    expect(result.writes).toEqual(remote);
    expect(result.enqueues).toEqual([]);
  });

  it("edit newer than tombstone: remote edit resurrects local tombstone", () => {
    const local = [
      setRow("set1", "2026-06-01T00:00:00.000Z", "se1", 1, 8, 80, "2026-06-01T00:00:00.000Z"),
    ];
    const remote = [setRow("set1", "2026-06-01T01:00:00.000Z", "se1", 1, 10, 82.5)];

    const result = reconcile(local, remote);

    expect(result.writes).toEqual(remote);
    expect(result.enqueues).toEqual([]);
  });

  it("local tombstone newer than remote edit: local tombstone enqueued for upload", () => {
    const local = [
      setRow("set1", "2026-06-01T02:00:00.000Z", "se1", 1, 8, 80, "2026-06-01T02:00:00.000Z"),
    ];
    const remote = [setRow("set1", "2026-06-01T01:00:00.000Z", "se1", 1, 10, 82.5)];

    const result = reconcile(local, remote);

    expect(result.writes).toEqual([]);
    expect(result.enqueues).toEqual(local);
  });

  it("local edit newer than remote tombstone: local edit resurrects and enqueued for upload", () => {
    const local = [setRow("set1", "2026-06-01T02:00:00.000Z", "se1", 1, 10, 85)];
    const remote = [
      setRow("set1", "2026-06-01T01:00:00.000Z", "se1", 1, 8, 80, "2026-06-01T01:00:00.000Z"),
    ];

    const result = reconcile(local, remote);

    expect(result.writes).toEqual([]);
    expect(result.enqueues).toEqual(local);
  });
});
