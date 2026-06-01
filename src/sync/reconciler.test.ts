import { reconcile } from "./reconciler";
import { SyncableRow } from "./types";

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
