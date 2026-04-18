import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createClient } from "@supabase/supabase-js";
import {
  adminClient,
  seedTestData,
  cleanupTestData,
  TEST_TEACHER,
  TEST_CHILD,
  type SeedResult,
} from "../fixtures/supabase";
import { buildSyntheticEmail, padPin } from "@/lib/supabase/pin-email";
import { fetchClassOverview, fetchOperationAccuracy } from "@/lib/teacher/queries";
import type { Database } from "@/types/database.types";

/**
 * Integration-Tests fuer das Lehrer-Dashboard.
 *
 * Testet:
 * - Korrekte Aggregation von Schueler-Daten (exerciseCount, accuracy, totalPoints)
 * - Operation-Genauigkeit pro Rechenart
 * - RLS-Isolation: Lehrer sieht nur Schueler der eigenen Klasse
 * - RLS-Isolation: Lehrer kann keine fremden Schueler-Details abfragen
 */

// Zweite Schule/Klasse fuer RLS-Isolation-Tests
const SECOND_SCHOOL = "Testschule Beta Dashboard";
const SECOND_CLASS = "Klasse Test-2b Dashboard";
const SECOND_TEACHER = {
  email: "teacher2.dashboard@matheapp.test",
  password: "TestPass456!",
  name: "Dashboard Test Teacher 2",
};
const SECOND_CHILD = {
  username: "leon.dashboard",
  pin: "5678",
  grade: 3,
};

describe("Teacher Dashboard Integration", () => {
  let seed: SeedResult;
  let admin: ReturnType<typeof adminClient>;

  // IDs fuer Cleanup der zweiten Schule/Klasse
  let secondSchoolId: string | null = null;
  let secondClassId: string | null = null;
  let secondTeacherId: string | null = null;
  let secondChildId: string | null = null;

  beforeAll(async () => {
    admin = adminClient();
    seed = await seedTestData();

    // 5 progress_entries fuer das Test-Kind einfuegen
    const entries = [
      { child_id: seed.childId, operation_type: "addition", grade: TEST_CHILD.grade, correct: true, points_earned: 10 },
      { child_id: seed.childId, operation_type: "addition", grade: TEST_CHILD.grade, correct: false, points_earned: 0 },
      { child_id: seed.childId, operation_type: "subtraktion", grade: TEST_CHILD.grade, correct: true, points_earned: 10 },
      { child_id: seed.childId, operation_type: "multiplikation", grade: TEST_CHILD.grade, correct: false, points_earned: 0 },
      { child_id: seed.childId, operation_type: "division", grade: TEST_CHILD.grade, correct: true, points_earned: 10 },
    ];

    for (const entry of entries) {
      const { error } = await admin.from("progress_entries").insert(entry);
      if (error) throw new Error(`Failed to insert entry: ${error.message}`);
    }

    // 1x minigame_redeem (muss aus Statistiken ausgeschlossen werden)
    const { error: redeemErr } = await admin.from("progress_entries").insert({
      child_id: seed.childId,
      operation_type: "minigame_redeem",
      grade: TEST_CHILD.grade,
      correct: true,
      points_earned: -30,
    });
    if (redeemErr) throw new Error(`Failed to insert redeem entry: ${redeemErr.message}`);
  }, 60_000);

  afterAll(async () => {
    // Cleanup progress_entries fuer Test-Kind
    await admin.from("progress_entries").delete().eq("child_id", seed.childId);

    // Cleanup zweite Schule/Klasse wenn erstellt
    if (secondChildId) {
      await admin.from("progress_entries").delete().eq("child_id", secondChildId);
      await admin.auth.admin.deleteUser(secondChildId);
    }
    if (secondTeacherId) {
      await admin.auth.admin.deleteUser(secondTeacherId);
    }
    if (secondClassId) {
      await admin.from("classes").delete().eq("id", secondClassId);
    }
    if (secondSchoolId) {
      await admin.from("schools").delete().eq("id", secondSchoolId);
    }

    await cleanupTestData();
  }, 30_000);

  /**
   * Erstellt einen authentifizierten Supabase-Client fuer den Test-Lehrer.
   */
  async function teacherClient() {
    const client = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );
    const { error } = await client.auth.signInWithPassword({
      email: TEST_TEACHER.email,
      password: TEST_TEACHER.password,
    });
    if (error) throw new Error(`Teacher login failed: ${error.message}`);
    return client;
  }

  /**
   * Erstellt die zweite Schule/Klasse/Lehrer/Kind fuer Isolation-Tests.
   */
  async function createSecondSchool() {
    // Lehrer erstellen
    const { data: teacher2, error: t2Err } = await admin.auth.admin.createUser({
      email: SECOND_TEACHER.email,
      password: SECOND_TEACHER.password,
      email_confirm: true,
      app_metadata: { role: "teacher" },
      user_metadata: { name: SECOND_TEACHER.name },
    });
    if (t2Err || !teacher2.user) throw t2Err ?? new Error("teacher2 create failed");
    secondTeacherId = teacher2.user.id;

    await admin.from("profiles").upsert({
      user_id: secondTeacherId,
      role: "teacher",
      display_name: SECOND_TEACHER.name,
      grade_level: null,
      class_id: null,
    });

    // Schule + Klasse
    const { data: school, error: sErr } = await admin
      .from("schools")
      .insert({ name: SECOND_SCHOOL, subscription_tier: "free" })
      .select("id")
      .single();
    if (sErr || !school) throw sErr;
    secondSchoolId = school.id;

    const { data: cls, error: cErr } = await admin
      .from("classes")
      .insert({ name: SECOND_CLASS, school_id: secondSchoolId, teacher_id: secondTeacherId })
      .select("id")
      .single();
    if (cErr || !cls) throw cErr;
    secondClassId = cls.id;

    await admin.from("profiles").update({ class_id: secondClassId }).eq("user_id", secondTeacherId);

    // Kind in zweiter Klasse
    const childEmail = buildSyntheticEmail(SECOND_CHILD.username, secondClassId);
    const childPassword = padPin(SECOND_CHILD.pin, secondClassId);
    const { data: child2, error: c2Err } = await admin.auth.admin.createUser({
      email: childEmail,
      password: childPassword,
      email_confirm: true,
      app_metadata: { role: "child" },
    });
    if (c2Err || !child2.user) throw c2Err ?? new Error("child2 create failed");
    secondChildId = child2.user.id;

    await admin.from("profiles").upsert({
      user_id: secondChildId,
      role: "child",
      display_name: SECOND_CHILD.username,
      grade_level: SECOND_CHILD.grade,
      class_id: secondClassId,
    });

    return { secondTeacherId, secondSchoolId, secondClassId, secondChildId };
  }

  it("Lehrer sieht Schueler der eigenen Klasse mit korrekter Aggregation (SC-1, SC-4)", async () => {
    const supabase = await teacherClient();
    const overview = await fetchClassOverview(supabase);

    expect(overview.length).toBe(1);
    const student = overview[0];

    expect(student.displayName).toBe(TEST_CHILD.username);
    // 5 Uebungen (minigame_redeem ausgeschlossen)
    expect(student.exerciseCount).toBe(5);
    // 3 richtig (addition, subtraktion, division)
    expect(student.correctCount).toBe(3);
    // 3/5 * 100 = 60%
    expect(student.accuracy).toBe(60);
    // 10 + 0 + 10 + 0 + 10 = 30 (ohne minigame_redeem -30)
    expect(student.totalPoints).toBe(30);
    // Letzte Aktivitaet sollte gesetzt sein
    expect(student.lastActivity).not.toBeNull();
  }, 60_000);

  it("Operation-Genauigkeit korrekt berechnet (SC-3)", async () => {
    const supabase = await teacherClient();
    const accuracy = await fetchOperationAccuracy(supabase, seed.childId);

    // Immer 4 Eintraege
    expect(accuracy.length).toBe(4);

    const addition = accuracy.find((a) => a.operation_type === "addition");
    expect(addition).toBeDefined();
    expect(addition!.total).toBe(2);
    expect(addition!.correct).toBe(1);
    expect(addition!.accuracy).toBe(50);

    const subtraktion = accuracy.find((a) => a.operation_type === "subtraktion");
    expect(subtraktion).toBeDefined();
    expect(subtraktion!.total).toBe(1);
    expect(subtraktion!.correct).toBe(1);
    expect(subtraktion!.accuracy).toBe(100);

    const multiplikation = accuracy.find((a) => a.operation_type === "multiplikation");
    expect(multiplikation).toBeDefined();
    expect(multiplikation!.total).toBe(1);
    expect(multiplikation!.correct).toBe(0);
    expect(multiplikation!.accuracy).toBe(0);

    const division = accuracy.find((a) => a.operation_type === "division");
    expect(division).toBeDefined();
    expect(division!.total).toBe(1);
    expect(division!.correct).toBe(1);
    expect(division!.accuracy).toBe(100);
  }, 60_000);

  it("Lehrer sieht KEINE Schueler anderer Klassen (SC-4)", async () => {
    await createSecondSchool();

    // Als erster Lehrer einloggen
    const supabase = await teacherClient();
    const overview = await fetchClassOverview(supabase);

    // Nur Schueler der eigenen Klasse
    const childIds = overview.map((s) => s.userId);
    expect(childIds).toContain(seed.childId);
    expect(childIds).not.toContain(secondChildId);
    expect(overview.length).toBe(1);
  }, 60_000);

  it("Lehrer kann keine fremden Schueler-Details abfragen (SC-4)", async () => {
    // Zweite Schule sollte schon von vorherigem Test erstellt sein
    if (!secondChildId) {
      await createSecondSchool();
    }

    // Als erster Lehrer einloggen
    const supabase = await teacherClient();
    const accuracy = await fetchOperationAccuracy(supabase, secondChildId!);

    // RLS blockiert -- leeres Array (alle 4 Operationstypen mit 0)
    expect(accuracy.length).toBe(4);
    for (const op of accuracy) {
      expect(op.total).toBe(0);
      expect(op.correct).toBe(0);
      expect(op.accuracy).toBe(0);
    }
  }, 60_000);
});
