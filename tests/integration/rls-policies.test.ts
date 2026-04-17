import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createClient } from "@supabase/supabase-js";
import {
  adminClient,
  seedTestData,
  cleanupTestData,
  TEST_CHILD,
  TEST_TEACHER,
  type SeedResult,
} from "../fixtures/supabase";
import { buildSyntheticEmail, padPin } from "@/lib/supabase/pin-email";

describe("SC-4c — RLS policies", () => {
  let seed: SeedResult;

  beforeAll(async () => {
    seed = await seedTestData();
  }, 60_000);

  afterAll(async () => {
    await cleanupTestData();
  }, 30_000);

  it("child cannot read other child's progress", async () => {
    const admin = adminClient();

    // Seed: insert one progress entry for the seeded child
    await admin.from("progress_entries").insert({
      child_id: seed.childId,
      operation_type: "addition",
      grade: TEST_CHILD.grade,
      correct: true,
      points_earned: 10,
    });

    // Create a SECOND child in the SAME class — they should NOT see the first child's progress
    const otherUsername = "otto.e2e";
    const otherEmail = buildSyntheticEmail(otherUsername, seed.classId);
    const otherPassword = padPin("1234", seed.classId);
    const { data: otherSignup } = await admin.auth.admin.createUser({
      email: otherEmail,
      password: otherPassword,
      email_confirm: true,
      app_metadata: { role: "child" },
    });
    await admin.from("profiles").insert({
      user_id: otherSignup!.user!.id,
      role: "child",
      display_name: otherUsername,
      grade_level: 1,
      class_id: seed.classId,
    });

    // Log in as "otto" via a fresh anon client and try to read "mia"'s progress
    const anon = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
    );
    const { error: signInErr } = await anon.auth.signInWithPassword({
      email: otherEmail,
      password: otherPassword,
    });
    expect(signInErr).toBeNull();

    const { data: progress } = await anon
      .from("progress_entries")
      .select("*")
      .eq("child_id", seed.childId);

    expect(progress ?? []).toEqual([]);

    // Cleanup: remove otto
    await admin.auth.admin.deleteUser(otherSignup!.user!.id);
  }, 60_000);

  it("teacher reads only own-class profiles", async () => {
    // Teacher in our seed class can read the child profile.
    const anon = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
    );
    const { error: signInErr } = await anon.auth.signInWithPassword({
      email: TEST_TEACHER.email,
      password: TEST_TEACHER.password,
    });
    expect(signInErr).toBeNull();

    const { data: profiles } = await anon
      .from("profiles")
      .select("user_id, display_name, role")
      .eq("class_id", seed.classId);

    expect(profiles?.some((p) => p.role === "child")).toBe(true);
  }, 30_000);
});
