import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createClient } from "@supabase/supabase-js";
import { buildSyntheticEmail, padPin } from "@/lib/supabase/pin-email";
import type { Database } from "@/types/database.types";

// Legacy-Konstante: Spiel-Threshold wurde durch GAMES-Registry ersetzt (lib/config/games.ts).
// Dieser Integration-Test prüfte den abgeschafften startGameAction-Flow (Punkteabzug beim Spielstart).
// Er bleibt als Referenz erhalten, wird aber komplett übersprungen (describe.skip unten).
const MINIGAME_THRESHOLD = 500;

// Isolated admin client for minigame tests
function minigameAdminClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

// Unique test data to avoid collision with other integration tests
const MG_TEST_SCHOOL = "Testschule Minigame";
const MG_TEST_CLASS = "Klasse Minigame-1a";
const MG_TEST_TEACHER = {
  email: "teacher.minigame@matheapp.test",
  password: "TestPass123!",
  name: "Minigame Test Teacher",
};
const MG_TEST_CHILD = {
  username: "lena.minigame",
  pin: "5432",
  grade: 2,
};

type SeedResult = {
  schoolId: string;
  classId: string;
  teacherId: string;
  childId: string;
};

async function minigameCleanup(): Promise<void> {
  const admin = minigameAdminClient();

  const { data: allUsers } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 500,
  });
  if (allUsers?.users) {
    for (const u of allUsers.users) {
      if (
        u.email === MG_TEST_TEACHER.email ||
        (u.email?.endsWith("@matheapp.internal") &&
          u.email.startsWith(`${MG_TEST_CHILD.username}.`))
      ) {
        await admin.auth.admin.deleteUser(u.id);
      }
    }
  }

  await admin.from("classes").delete().eq("name", MG_TEST_CLASS);
  await admin.from("schools").delete().eq("name", MG_TEST_SCHOOL);
}

async function minigameSeed(): Promise<SeedResult> {
  const admin = minigameAdminClient();
  await minigameCleanup();

  // 1. Create teacher
  const { data: teacherSignup, error: teacherErr } =
    await admin.auth.admin.createUser({
      email: MG_TEST_TEACHER.email,
      password: MG_TEST_TEACHER.password,
      email_confirm: true,
      app_metadata: { role: "teacher" },
      user_metadata: { name: MG_TEST_TEACHER.name },
    });
  if (teacherErr || !teacherSignup.user)
    throw teacherErr ?? new Error("teacher create failed");
  const teacherId = teacherSignup.user.id;

  await admin.from("profiles").upsert({
    user_id: teacherId,
    role: "teacher",
    display_name: MG_TEST_TEACHER.name,
    grade_level: null,
    class_id: null,
  });

  // 2. Create school + class
  const { data: school, error: schoolErr } = await admin
    .from("schools")
    .insert({ name: MG_TEST_SCHOOL, subscription_tier: "free" })
    .select("id")
    .single();
  if (schoolErr || !school) throw schoolErr;
  const schoolId = school.id;

  const { data: cls, error: classErr } = await admin
    .from("classes")
    .insert({
      name: MG_TEST_CLASS,
      school_id: schoolId,
      teacher_id: teacherId,
    })
    .select("id")
    .single();
  if (classErr || !cls) throw classErr;
  const classId = cls.id;

  await admin
    .from("profiles")
    .update({ class_id: classId })
    .eq("user_id", teacherId);

  // 3. Create child
  const childEmail = buildSyntheticEmail(MG_TEST_CHILD.username, classId);
  const childPassword = padPin(MG_TEST_CHILD.pin, classId);
  const { data: childSignup, error: childErr } =
    await admin.auth.admin.createUser({
      email: childEmail,
      password: childPassword,
      email_confirm: true,
      app_metadata: { role: "child" },
    });
  if (childErr || !childSignup.user)
    throw childErr ?? new Error("child create failed");
  const childId = childSignup.user.id;

  await admin.from("profiles").upsert({
    user_id: childId,
    role: "child",
    display_name: MG_TEST_CHILD.username,
    grade_level: MG_TEST_CHILD.grade,
    class_id: classId,
  });

  return { schoolId, classId, teacherId, childId };
}

describe.skip("startGameAction Integration (legacy — Flow durch GAMES-Registry ersetzt)", () => {
  let seed: SeedResult;

  beforeAll(async () => {
    seed = await minigameSeed();

    // Seed 600 points (6 x 100 points, various operation types)
    const admin = minigameAdminClient();
    const entries = [
      { child_id: seed.childId, operation_type: "addition", grade: MG_TEST_CHILD.grade, correct: true, points_earned: 100 },
      { child_id: seed.childId, operation_type: "subtraktion", grade: MG_TEST_CHILD.grade, correct: true, points_earned: 100 },
      { child_id: seed.childId, operation_type: "multiplikation", grade: MG_TEST_CHILD.grade, correct: true, points_earned: 100 },
      { child_id: seed.childId, operation_type: "division", grade: MG_TEST_CHILD.grade, correct: true, points_earned: 100 },
      { child_id: seed.childId, operation_type: "addition", grade: MG_TEST_CHILD.grade, correct: true, points_earned: 100 },
      { child_id: seed.childId, operation_type: "subtraktion", grade: MG_TEST_CHILD.grade, correct: true, points_earned: 100 },
    ];

    const { error } = await admin.from("progress_entries").insert(entries);
    if (error) throw error;
  }, 30_000);

  afterAll(async () => {
    const admin = minigameAdminClient();
    if (seed?.childId) {
      await admin
        .from("progress_entries")
        .delete()
        .eq("child_id", seed.childId);
    }
    await minigameCleanup();
  }, 30_000);

  it("progress_entries akzeptiert operation_type 'minigame_redeem'", async () => {
    const admin = minigameAdminClient();
    const { error } = await admin.from("progress_entries").insert({
      child_id: seed.childId,
      operation_type: "minigame_redeem",
      grade: MG_TEST_CHILD.grade,
      correct: true,
      points_earned: -500,
    });
    expect(error).toBeNull();

    // Verify entry was stored correctly
    const { data, error: readError } = await admin
      .from("progress_entries")
      .select("*")
      .eq("child_id", seed.childId)
      .eq("operation_type", "minigame_redeem")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    expect(readError).toBeNull();
    expect(data).toBeTruthy();
    expect(data!.operation_type).toBe("minigame_redeem");
  });

  it("negative points_earned Werte werden akzeptiert", async () => {
    const admin = minigameAdminClient();

    // Read the minigame_redeem entry from previous test
    const { data, error } = await admin
      .from("progress_entries")
      .select("points_earned")
      .eq("child_id", seed.childId)
      .eq("operation_type", "minigame_redeem")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    expect(error).toBeNull();
    expect(data).toBeTruthy();
    expect(data!.points_earned).toBe(-500);
  });

  it("Punkt-Summe berechnet korrekt mit negativem Eintrag", async () => {
    const admin = minigameAdminClient();

    // Fetch all entries and compute sum (same reduce pattern as the app)
    const { data: entries, error } = await admin
      .from("progress_entries")
      .select("points_earned")
      .eq("child_id", seed.childId);

    expect(error).toBeNull();
    expect(entries).toBeTruthy();

    const totalPoints = (entries ?? []).reduce(
      (sum, e) => sum + (e.points_earned ?? 0),
      0
    );

    // 600 (seeded) - 500 (minigame_redeem) = 100
    expect(totalPoints).toBe(100);
  });

  it("Zweite Einloesung bei nur 100 Punkten nicht moeglich", async () => {
    const admin = minigameAdminClient();

    // Fetch current total points
    const { data: entries } = await admin
      .from("progress_entries")
      .select("points_earned")
      .eq("child_id", seed.childId);

    const totalPoints = (entries ?? []).reduce(
      (sum, e) => sum + (e.points_earned ?? 0),
      0
    );

    // 100 < 500 (MINIGAME_THRESHOLD) — should not be able to redeem
    expect(totalPoints).toBeLessThan(MINIGAME_THRESHOLD);
    expect(totalPoints).toBe(100);
  });
});
