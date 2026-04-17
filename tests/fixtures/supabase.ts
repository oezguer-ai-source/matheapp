import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Admin client for seeding/cleanup during tests.
// Uses SUPABASE_SERVICE_ROLE_KEY — NEVER import this file in application code.
export function adminClient(): SupabaseClient {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

// Fixture constants — used by e2e + integration tests.
export const TEST_SCHOOL_NAME = "Testschule Alpha";
export const TEST_CLASS_NAME = "Klasse Test-1a";

export const TEST_TEACHER = {
  email: "teacher.e2e@matheapp.test",
  password: "TestPass123!",
  name: "E2E Test Teacher",
};

export const TEST_CHILD = {
  username: "mia.e2e",
  pin: "4711",
  grade: 2,
};

// Helpers — implemented in Plan 10 (tests) after Plans 04-09 have shipped.
export async function seedTestData(): Promise<void> {
  throw new Error("seedTestData — implemented in Plan 10 (tests)");
}

export async function cleanupTestData(): Promise<void> {
  throw new Error("cleanupTestData — implemented in Plan 10 (tests)");
}
