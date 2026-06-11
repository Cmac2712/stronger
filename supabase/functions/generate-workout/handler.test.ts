import { getAll } from "../../../src/features/exercises/exerciseLibrary";
import {
  buildWorkoutRequest,
  HistorySummaryEntry,
  WorkoutRequest,
} from "../../../src/features/templates/buildWorkoutRequest";
import {
  handleGenerateWorkout,
  GenerateWorkoutDeps,
  ModelMessage,
} from "./handler";

const summary: HistorySummaryEntry[] = [
  { exerciseId: "deadlift", count: 3, lastPerformedAt: 1_700_000_000_000 },
];

const validBody = { split: "pull", summary };

const generatedIds = ["deadlift", "barbell-row", "lat-pulldown", "barbell-curl"];

function modelResponse(payload: unknown) {
  return { content: [{ type: "text", text: JSON.stringify(payload) }] };
}

function deps(overrides: Partial<GenerateWorkoutDeps> = {}): GenerateWorkoutDeps {
  return {
    getUser: jest.fn(async () => ({ id: "user-1" })),
    createMessage: jest.fn(async () => modelResponse({ exerciseIds: generatedIds })),
    ...overrides,
  };
}

describe("handleGenerateWorkout", () => {
  describe("auth", () => {
    it("returns 401 when the Authorization header is missing", async () => {
      const d = deps();
      const result = await handleGenerateWorkout(
        { authHeader: null, body: validBody },
        d
      );
      expect(result.status).toBe(401);
      expect(d.createMessage).not.toHaveBeenCalled();
    });

    it("returns 401 when the Authorization header is not a bearer token", async () => {
      const result = await handleGenerateWorkout(
        { authHeader: "Basic abc", body: validBody },
        deps()
      );
      expect(result.status).toBe(401);
    });

    it("returns 401 when the JWT is rejected, passing the token through", async () => {
      const getUser = jest.fn(async () => null);
      const d = deps({ getUser });
      const result = await handleGenerateWorkout(
        { authHeader: "Bearer bad-jwt", body: validBody },
        d
      );
      expect(result.status).toBe(401);
      expect(getUser).toHaveBeenCalledWith("bad-jwt");
      expect(d.createMessage).not.toHaveBeenCalled();
    });
  });

  describe("request validation", () => {
    it.each([
      { name: "non-object body", body: "push" },
      { name: "null body", body: null },
      { name: "unknown split", body: { split: "cardio", summary } },
      { name: "missing split", body: { summary } },
      { name: "missing summary", body: { split: "push" } },
      { name: "non-array summary", body: { split: "push", summary: {} } },
      {
        name: "malformed summary entry",
        body: { split: "push", summary: [{ exerciseId: 7 }] },
      },
    ])("returns 400 for $name", async ({ body }) => {
      const d = deps();
      const result = await handleGenerateWorkout(
        { authHeader: "Bearer jwt", body },
        d
      );
      expect(result.status).toBe(400);
      expect(d.createMessage).not.toHaveBeenCalled();
    });
  });

  describe("generation", () => {
    it("calls the model with exactly the request buildWorkoutRequest produces", async () => {
      const createMessage = jest.fn<Promise<ModelMessage>, [WorkoutRequest]>(
        async () => modelResponse({ exerciseIds: generatedIds })
      );
      await handleGenerateWorkout(
        { authHeader: "Bearer jwt", body: validBody },
        deps({ createMessage })
      );
      expect(createMessage).toHaveBeenCalledTimes(1);
      const request = createMessage.mock.calls[0][0];
      expect(request).toEqual(
        buildWorkoutRequest({ split: "pull", summary })
      );
      expect(request.model).toBe("claude-haiku-4-5");
      expect(
        request.output_config.format.schema.properties.exerciseIds.items.enum
      ).toEqual(getAll().map((e) => e.id));
    });

    it("returns 200 with the model's exerciseIds", async () => {
      const result = await handleGenerateWorkout(
        { authHeader: "Bearer jwt", body: validBody },
        deps()
      );
      expect(result).toEqual({
        status: 200,
        body: { exerciseIds: generatedIds },
      });
    });

    it("returns 502 when the model call fails", async () => {
      const result = await handleGenerateWorkout(
        { authHeader: "Bearer jwt", body: validBody },
        deps({
          createMessage: jest.fn(async () => {
            throw new Error("overloaded");
          }),
        })
      );
      expect(result.status).toBe(502);
    });

    it.each([
      { name: "no text block", response: { content: [] } },
      {
        name: "non-JSON text",
        response: { content: [{ type: "text", text: "sorry, no" }] },
      },
      { name: "missing exerciseIds", response: modelResponse({ ids: [] }) },
      {
        name: "non-string ids",
        response: modelResponse({ exerciseIds: [1, 2] }),
      },
    ])("returns 502 for a malformed model response: $name", async ({ response }) => {
      const result = await handleGenerateWorkout(
        { authHeader: "Bearer jwt", body: validBody },
        deps({ createMessage: jest.fn(async () => response) })
      );
      expect(result.status).toBe(502);
    });
  });
});
