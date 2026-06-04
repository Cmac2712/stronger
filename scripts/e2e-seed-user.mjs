#!/usr/bin/env node
/**
 * Seed (or reset) a pre-confirmed test user in the E2E Supabase project, so
 * sign-in flows don't need a real inbox.
 *
 * Uses the Supabase Admin API, which requires the SERVICE ROLE key — NEVER the
 * anon key, and NEVER your production project. Point this at the dedicated test
 * project only.
 *
 * Env:
 *   E2E_SUPABASE_URL          test project URL (e.g. https://abc.supabase.co)
 *   E2E_SUPABASE_SERVICE_KEY  test project service_role key
 *   TEST_EMAIL                user to create (default: e2e@example.com)
 *   TEST_PASSWORD             password to set (default: test123456)
 *
 * Usage:
 *   TEST_EMAIL=e2e@example.com TEST_PASSWORD=test123456 \
 *   E2E_SUPABASE_URL=... E2E_SUPABASE_SERVICE_KEY=... \
 *   node scripts/e2e-seed-user.mjs
 */
import { createClient } from "@supabase/supabase-js";

const url = process.env.E2E_SUPABASE_URL;
const serviceKey = process.env.E2E_SUPABASE_SERVICE_KEY;
const email = process.env.TEST_EMAIL ?? "e2e@example.com";
const password = process.env.TEST_PASSWORD ?? "test123456";

if (!url || !serviceKey) {
  console.error(
    "Missing E2E_SUPABASE_URL or E2E_SUPABASE_SERVICE_KEY. Refusing to run."
  );
  process.exit(1);
}
if (/supabase\.co/.test(url) && process.env.E2E_ALLOW_PROD !== "1") {
  // Cheap guardrail; rename/remove if your test project also lives on supabase.co.
  console.warn(`Seeding ${email} into ${url}`);
}

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Look for an existing user so re-runs are idempotent.
const { data: list, error: listErr } = await admin.auth.admin.listUsers();
if (listErr) {
  console.error("listUsers failed:", listErr.message);
  process.exit(1);
}
const existing = list.users.find((u) => u.email === email);

if (existing) {
  const { error } = await admin.auth.admin.updateUserById(existing.id, {
    password,
    email_confirm: true,
  });
  if (error) {
    console.error("updateUserById failed:", error.message);
    process.exit(1);
  }
  console.log(`✅ Updated existing test user ${email} (confirmed, password reset)`);
} else {
  const { error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true, // pre-confirmed → skips the verify-email step
  });
  if (error) {
    console.error("createUser failed:", error.message);
    process.exit(1);
  }
  console.log(`✅ Created pre-confirmed test user ${email}`);
}
