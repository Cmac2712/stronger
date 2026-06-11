import { templateToRow, rowsToTemplates } from "./syncEngine";
import type { Template } from "@shared/types";
import type { TemplateRow } from "./types";

// Importing syncEngine is safe under jest: supabaseClient resolves to null
// without EXPO_PUBLIC_* env vars and AsyncStorage is mocked in jest.setup.

describe("template row mapping", () => {
  const templates: Template[] = [
    { id: "t1", name: "Chest & Back", exerciseIds: ["barbell-bench-press", "deadlift"] },
    { id: "t2", name: "Legs", exerciseIds: ["barbell-back-squat"] },
    { id: "t3", name: "Empty", exerciseIds: [] },
  ];

  it("templateToRow stamps sync bookkeeping around the template fields", () => {
    const row = templateToRow(templates[0], "u1", "2026-06-11T00:00:00.000Z");

    expect(row).toEqual({
      id: "t1",
      user_id: "u1",
      name: "Chest & Back",
      exercise_ids: ["barbell-bench-press", "deadlift"],
      updated_at: "2026-06-11T00:00:00.000Z",
      deleted_at: null,
    });
  });

  it("round-trips Template → row → Template losslessly, preserving exercise order", () => {
    const rows = templates.map((t) => templateToRow(t, "u1", "2026-06-11T00:00:00.000Z"));

    expect(rowsToTemplates(rows)).toEqual(templates);
  });

  it("rowsToTemplates drops sync bookkeeping, keeping only the domain shape", () => {
    const row: TemplateRow = {
      id: "t9",
      user_id: "u1",
      name: "Pull",
      exercise_ids: ["lat-pulldown", "barbell-row", "face-pull"],
      updated_at: "2026-06-11T01:00:00.000Z",
      deleted_at: null,
    };

    expect(rowsToTemplates([row])).toEqual([
      { id: "t9", name: "Pull", exerciseIds: ["lat-pulldown", "barbell-row", "face-pull"] },
    ]);
  });
});
