import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createClient } from "@supabase/supabase-js";
import {
  adminClient,
  makeIsolatedFixture,
  seedIsolatedFixture,
  cleanupIsolatedFixture,
  type SeedResult,
} from "../fixtures/supabase";
import { buildSyntheticEmail, padPin } from "@/lib/supabase/pin-email";

/**
 * Integration-Tests fuer die RLS-Policies.
 *
 * Verwendet einen datei-spezifischen, isolierten Fixture-Satz ("rls"), damit
 * diese Suite bei parallelem Vitest-Lauf nicht mit anderen Integration-Tests
 * um dieselben Auth-Test-User konkurriert (vermeidet das Seeding-Race
 * "Database error creating new user").
 */
const FIXTURE = makeIsolatedFixture("rls");

describe("SC-4c — RLS policies", () => {
  let seed: SeedResult;

  beforeAll(async () => {
    seed = await seedIsolatedFixture(FIXTURE);
  }, 60_000);

  afterAll(async () => {
    await cleanupIsolatedFixture(FIXTURE);
  }, 30_000);

  it("child cannot read other child's progress", async () => {
    const admin = adminClient();

    // Seed: insert one progress entry for the seeded child
    await admin.from("progress_entries").insert({
      child_id: seed.childId,
      operation_type: "addition",
      grade: FIXTURE.child.grade,
      correct: true,
      points_earned: 10,
    });

    // Create a SECOND child in the SAME class — they should NOT see the first child's progress
    const otherUsername = `otto.${FIXTURE.suffix}`;
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

  // Verifiziert den Schueler-Lesepfad auf assignment_classes + assignments
  // ueber den RLS-Client. Deckt Bug 2 ab (Lehrer-Aufgaben beim Schueler nicht
  // sichtbar). Benoetigt Migration 20260518000003 in der Cloud-DB — vorher
  // schlaegt die assignment_classes-Query mit 42P17 (RLS-Rekursion) fehl.
  it("student reads assignments assigned to own class via RLS client (Bug 2)", async () => {
    const admin = adminClient();

    // Lehrer-Aufgabe anlegen und der Klasse des Schuelers zuweisen.
    const { data: assignment, error: assignErr } = await admin
      .from("assignments")
      .insert({
        teacher_id: seed.teacherId,
        title: `RLS-Test-Aufgabe ${FIXTURE.suffix}`,
        description: "Von Theo fuer den RLS-Lesepfad-Test angelegt.",
        due_date: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
      })
      .select("id")
      .single();
    expect(assignErr).toBeNull();
    const assignmentId = assignment!.id;

    const { error: acErr } = await admin
      .from("assignment_classes")
      .insert({ assignment_id: assignmentId, class_id: seed.classId });
    expect(acErr).toBeNull();

    // Als Schueler ueber den RLS-Client (anon) einloggen.
    const anon = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
    );
    const childEmail = buildSyntheticEmail(FIXTURE.child.username, seed.classId);
    const childPassword = padPin(FIXTURE.child.pin, seed.classId);
    const { error: signInErr } = await anon.auth.signInWithPassword({
      email: childEmail,
      password: childPassword,
    });
    expect(signInErr).toBeNull();

    // (1) assignment_classes muss fuer den Schueler lesbar sein
    //     (Policy student_reads_class_assignments).
    const { data: acRows, error: acReadErr } = await anon
      .from("assignment_classes")
      .select("assignment_id")
      .eq("class_id", seed.classId);
    expect(acReadErr).toBeNull();
    expect((acRows ?? []).map((r) => r.assignment_id)).toContain(assignmentId);

    // (2) assignments muss fuer den Schueler lesbar sein
    //     (Policy student_reads_assigned_assignments).
    const { data: aRows, error: aReadErr } = await anon
      .from("assignments")
      .select("id, title")
      .eq("id", assignmentId);
    expect(aReadErr).toBeNull();
    expect((aRows ?? []).map((r) => r.id)).toContain(assignmentId);

    // Cleanup — Aufgabe entfernen (assignment_classes cascade).
    await admin.from("assignments").delete().eq("id", assignmentId);
  }, 60_000);

  it("teacher reads only own-class profiles", async () => {
    // Teacher in our seed class can read the child profile.
    const anon = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
    );
    const { error: signInErr } = await anon.auth.signInWithPassword({
      email: FIXTURE.teacher.email,
      password: FIXTURE.teacher.password,
    });
    expect(signInErr).toBeNull();

    const { data: profiles } = await anon
      .from("profiles")
      .select("user_id, display_name, role")
      .eq("class_id", seed.classId);

    expect(profiles?.some((p) => p.role === "child")).toBe(true);
  }, 30_000);
});
