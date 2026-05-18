import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { buildSyntheticEmail, padPin } from "@/lib/supabase/pin-email";
import type { Database } from "@/types/database.types";

// Admin client for seeding/cleanup during tests.
// Uses SUPABASE_SERVICE_ROLE_KEY — NEVER import this file in application code.
export function adminClient(): SupabaseClient<Database> {
  return createClient<Database>(
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

export type SeedResult = {
  schoolId: string;
  classId: string;
  teacherId: string;
  childId: string;
};

export async function cleanupTestData(): Promise<void> {
  const admin = adminClient();

  // Delete users first — profile rows cascade from auth.users deletion.
  const { data: allUsers } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 500,
  });
  if (allUsers?.users) {
    for (const u of allUsers.users) {
      if (
        u.email === TEST_TEACHER.email ||
        (u.email?.endsWith("@matheapp.internal") &&
          (u.email.startsWith(`${TEST_CHILD.username}.`) ||
            u.email.startsWith("otto.e2e.")))
      ) {
        await admin.auth.admin.deleteUser(u.id);
      }
    }
  }

  // Delete any lingering schools/classes with the test names (cascade removes classes/progress).
  await admin.from("classes").delete().eq("name", TEST_CLASS_NAME);
  await admin.from("schools").delete().eq("name", TEST_SCHOOL_NAME);
}

/**
 * Beschreibt einen vollstaendig isolierten Fixture-Satz (Schule, Klasse,
 * Lehrer, Kind) mit datei-spezifischen, eindeutigen Entity-Namen.
 *
 * Hintergrund: Vitest faehrt Integration-Test-Dateien parallel. Wenn mehrere
 * Suiten dieselben globalen Konstanten (TEST_TEACHER.email etc.) verwenden,
 * loeschen sich ihre `seedTestData()`-Aufrufe gegenseitig die Auth-User weg
 * ("Database error creating new user" / "Teacher login failed"). Mit einem
 * eindeutigen `suffix` bekommt jede Datei einen eigenen Namensraum und es
 * gibt keine Kollision mehr.
 */
export type IsolatedFixture = {
  suffix: string;
  schoolName: string;
  className: string;
  teacher: { email: string; password: string; name: string };
  child: { username: string; pin: string; grade: number };
};

/**
 * Baut einen isolierten Fixture-Satz fuer eine bestimmte Test-Datei.
 * `suffix` muss pro Datei eindeutig sein, z.B. "rls".
 */
export function makeIsolatedFixture(suffix: string): IsolatedFixture {
  return {
    suffix,
    schoolName: `Testschule ${suffix}`,
    className: `Klasse Test ${suffix}`,
    teacher: {
      email: `teacher.${suffix}@matheapp.test`,
      password: "TestPass123!",
      name: `Test Teacher ${suffix}`,
    },
    child: {
      username: `kind.${suffix}`,
      pin: "4711",
      grade: 2,
    },
  };
}

/**
 * Raeumt alle Daten eines isolierten Fixture-Satzes auf. Nur Entities mit den
 * datei-spezifischen Namen werden geloescht — andere parallel laufende Suiten
 * bleiben unberuehrt.
 */
export async function cleanupIsolatedFixture(
  fixture: IsolatedFixture
): Promise<void> {
  const admin = adminClient();

  const { data: allUsers } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 500,
  });
  if (allUsers?.users) {
    for (const u of allUsers.users) {
      if (
        u.email === fixture.teacher.email ||
        (u.email?.endsWith("@matheapp.internal") &&
          u.email.startsWith(`${fixture.child.username}.`))
      ) {
        await admin.auth.admin.deleteUser(u.id);
      }
    }
  }

  await admin.from("classes").delete().eq("name", fixture.className);
  await admin.from("schools").delete().eq("name", fixture.schoolName);
}

/**
 * Seeded einen vollstaendig isolierten Fixture-Satz (Schule, Klasse, Lehrer,
 * Kind). Anders als `seedTestData()` verwendet diese Funktion datei-spezifische
 * Namen und kollidiert daher nicht mit parallel laufenden Suiten.
 */
export async function seedIsolatedFixture(
  fixture: IsolatedFixture
): Promise<SeedResult> {
  const admin = adminClient();
  await cleanupIsolatedFixture(fixture);

  const { data: teacherSignup, error: teacherErr } =
    await admin.auth.admin.createUser({
      email: fixture.teacher.email,
      password: fixture.teacher.password,
      email_confirm: true,
      app_metadata: { role: "teacher" },
      user_metadata: { name: fixture.teacher.name },
    });
  if (teacherErr || !teacherSignup.user)
    throw teacherErr ?? new Error("teacher create failed");
  const teacherId = teacherSignup.user.id;

  await admin.from("profiles").upsert({
    user_id: teacherId,
    role: "teacher",
    display_name: fixture.teacher.name,
    grade_level: null,
    class_id: null,
  });

  const { data: school, error: schoolErr } = await admin
    .from("schools")
    .insert({ name: fixture.schoolName, subscription_tier: "free" })
    .select("id")
    .single();
  if (schoolErr || !school) throw schoolErr;
  const schoolId = school.id;

  const { data: cls, error: classErr } = await admin
    .from("classes")
    .insert({
      name: fixture.className,
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

  const childEmail = buildSyntheticEmail(fixture.child.username, classId);
  const childPassword = padPin(fixture.child.pin, classId);
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
    display_name: fixture.child.username,
    grade_level: fixture.child.grade,
    class_id: classId,
  });

  return { schoolId, classId, teacherId, childId };
}

export async function seedTestData(): Promise<SeedResult> {
  const admin = adminClient();
  await cleanupTestData();

  // 1. Create teacher via admin.createUser + app_metadata.role
  const { data: teacherSignup, error: teacherErr } =
    await admin.auth.admin.createUser({
      email: TEST_TEACHER.email,
      password: TEST_TEACHER.password,
      email_confirm: true,
      app_metadata: { role: "teacher" },
      user_metadata: { name: TEST_TEACHER.name },
    });
  if (teacherErr || !teacherSignup.user)
    throw teacherErr ?? new Error("teacher create failed");
  const teacherId = teacherSignup.user.id;

  // The teacher profile may have been created by the DB trigger; upsert to guarantee.
  await admin.from("profiles").upsert({
    user_id: teacherId,
    role: "teacher",
    display_name: TEST_TEACHER.name,
    grade_level: null,
    class_id: null,
  });

  // 2. Create school + class
  const { data: school, error: schoolErr } = await admin
    .from("schools")
    .insert({ name: TEST_SCHOOL_NAME, subscription_tier: "free" })
    .select("id")
    .single();
  if (schoolErr || !school) throw schoolErr;
  const schoolId = school.id;

  const { data: cls, error: classErr } = await admin
    .from("classes")
    .insert({
      name: TEST_CLASS_NAME,
      school_id: schoolId,
      teacher_id: teacherId,
    })
    .select("id")
    .single();
  if (classErr || !cls) throw classErr;
  const classId = cls.id;

  // Update teacher's profile with class_id so teacher_reads_class_profiles works.
  await admin
    .from("profiles")
    .update({ class_id: classId })
    .eq("user_id", teacherId);

  // 3. Create child via admin.createUser (same flow as Plan 06 Pattern 6)
  const childEmail = buildSyntheticEmail(TEST_CHILD.username, classId);
  const childPassword = padPin(TEST_CHILD.pin, classId);
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
    display_name: TEST_CHILD.username,
    grade_level: TEST_CHILD.grade,
    class_id: classId,
  });

  return { schoolId, classId, teacherId, childId };
}
