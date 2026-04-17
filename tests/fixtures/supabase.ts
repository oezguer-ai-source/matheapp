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
