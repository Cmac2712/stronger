// Deno entrypoint for the generate-workout edge function. This file is
// EXCLUDED from the app tsconfig (npm: specifiers and Deno globals don't
// resolve under tsc) and is checked by `deno check` / `supabase functions
// deploy` instead — deployment + live smoke happen in slice 6 (#45). All
// testable logic lives in handler.ts (jest) and buildWorkoutRequest.ts.
import Anthropic from "npm:@anthropic-ai/sdk";
import { createClient } from "npm:@supabase/supabase-js@2";
import { handleGenerateWorkout } from "./handler.ts";

// ANTHROPIC_API_KEY is a Supabase secret (set in slice 6); SUPABASE_URL and
// SUPABASE_ANON_KEY are injected by the platform.
const anthropic = new Anthropic({ apiKey: Deno.env.get("ANTHROPIC_API_KEY") });
const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_ANON_KEY") ?? ""
);

Deno.serve(async (req: Request): Promise<Response> => {
  let body: unknown = null;
  try {
    body = await req.json();
  } catch {
    // Leave body null — the handler responds 400.
  }

  const result = await handleGenerateWorkout(
    { authHeader: req.headers.get("Authorization"), body },
    {
      getUser: async (jwt) => {
        const { data, error } = await supabase.auth.getUser(jwt);
        return error || !data.user ? null : { id: data.user.id };
      },
      // The request is built by the shared buildWorkoutRequest and already
      // carries model claude-haiku-4-5 + the structured-output schema.
      createMessage: (request) => anthropic.messages.create(request),
    }
  );

  return new Response(JSON.stringify(result.body), {
    status: result.status,
    headers: { "Content-Type": "application/json" },
  });
});
