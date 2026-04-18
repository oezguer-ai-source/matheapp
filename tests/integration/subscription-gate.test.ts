import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createClient } from "@supabase/supabase-js";
import { buildSyntheticEmail, padPin } from "@/lib/supabase/pin-email";
import {
  getSchoolSubscriptionTier,
  isGated,
  type SubscriptionTier,
} from "@/lib/subscription/queries";
import type { Database } from "@/types/database.types";

// Isolated admin client for subscription gate tests
function subAdminClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

// Unique test data to avoid collision with other integration tests (T-60-05)
const SUB_TEST_SCHOOL = "Sub-Gate Testschule";
const SUB_TEST_CLASS = "Sub-Gate Klasse 4a";
const SUB_TEST_TEACHER = {
  email: "teacher.subgate@matheapp.test",
  password: "TestPass123!",
  name: "Sub-Gate Test Teacher",
};
const SUB_TEST_CHILD = {
  username: "kai.subgate",
  pin: "7654",
  grade: 4,
};

// Second school for RLS isolation test
const SUB_TEST_SCHOOL_OTHER = "Sub-Gate Andere Schule";

type SeedResult = {
  schoolId: string;
  classId: string;
  teacherId: string;
  childId: string;
  otherSchoolId: string;
};

async function subCleanup(): Promise<void> {
  const admin = subAdminClient();

  const { data: allUsers } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 500,
  });
  if (allUsers?.users) {
    for (const u of allUsers.users) {
      if (
        u.email === SUB_TEST_TEACHER.email ||
        (u.email?.endsWith("@matheapp.internal") &&
          u.email.startsWith(`${SUB_TEST_CHILD.username}.`))
      ) {
        await admin.auth.admin.deleteUser(u.id);
      }
    }
  }

  await admin.from("classes").delete().eq("name", SUB_TEST_CLASS);
  await admin.from("schools").delete().eq("name", SUB_TEST_SCHOOL);
  await admin.from("schools").delete().eq("name", SUB_TEST_SCHOOL_OTHER);
}

async function subSeed(): Promise<SeedResult> {
  const admin = subAdminClient();
  await subCleanup();

  // 1. Create teacher
  const { data: teacherSignup, error: teacherErr } =
    await admin.auth.admin.createUser({
      email: SUB_TEST_TEACHER.email,
      password: SUB_TEST_TEACHER.password,
      email_confirm: true,
      app_metadata: { role: "teacher" },
      user_metadata: { name: SUB_TEST_TEACHER.name },
    });
  if (teacherErr || !teacherSignup.user)
    throw teacherErr ?? new Error("teacher create failed");
  const teacherId = teacherSignup.user.id;

  await admin.from("profiles").upsert({
    user_id: teacherId,
    role: "teacher",
    display_name: SUB_TEST_TEACHER.name,
    grade_level: null,
    class_id: null,
  });

  // 2. Create school (tier='free') + class
  const { data: school, error: schoolErr } = await admin
    .from("schools")
    .insert({ name: SUB_TEST_SCHOOL, subscription_tier: "free" })
    .select("id")
    .single();
  if (schoolErr || !school) throw schoolErr;
  const schoolId = school.id;

  const { data: cls, error: classErr } = await admin
    .from("classes")
    .insert({
      name: SUB_TEST_CLASS,
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

  // 3. Create child (grade 4)
  const childEmail = buildSyntheticEmail(SUB_TEST_CHILD.username, classId);
  const childPassword = padPin(SUB_TEST_CHILD.pin, classId);
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
    display_name: SUB_TEST_CHILD.username,
    grade_level: SUB_TEST_CHILD.grade,
    class_id: classId,
  });

  // 4. Create a second school for RLS isolation test
  const { data: otherSchool, error: otherSchoolErr } = await admin
    .from("schools")
    .insert({ name: SUB_TEST_SCHOOL_OTHER, subscription_tier: "free" })
    .select("id")
    .single();
  if (otherSchoolErr || !otherSchool) throw otherSchoolErr;
  const otherSchoolId = otherSchool.id;

  return { schoolId, classId, teacherId, childId, otherSchoolId };
}

// ─── Tests ───────────────────────────────────────────────────────────────

describe("Subscription Gate Integration", () => {
  let seed: SeedResult;

  beforeAll(async () => {
    seed = await subSeed();
  }, 30_000);

  afterAll(async () => {
    await subCleanup();
  }, 30_000);

  // ── 1. isGated pure function tests (no DB) ──────────────────────────

  describe("isGated pure function", () => {
    it("isGated(4, 'free') returns true — Klasse 4 free ist blockiert", () => {
      expect(isGated(4, "free")).toBe(true);
    });

    it("isGated(4, 'grundschule') returns false — bezahlt", () => {
      expect(isGated(4, "grundschule")).toBe(false);
    });

    it("isGated(4, 'foerderung') returns false — bezahlt", () => {
      expect(isGated(4, "foerderung")).toBe(false);
    });

    it("isGated(4, 'experte') returns false — bezahlt", () => {
      expect(isGated(4, "experte")).toBe(false);
    });

    it("isGated(4, 'demo') returns false — Demo-Bypass (D-12)", () => {
      expect(isGated(4, "demo")).toBe(false);
    });

    it("isGated(3, 'free') returns false — Klasse 1-3 nie blockiert (D-02)", () => {
      expect(isGated(3, "free")).toBe(false);
    });

    it("isGated(1, 'free') returns false — Klasse 1 nie blockiert", () => {
      expect(isGated(1, "free")).toBe(false);
    });

    it("isGated(2, 'free') returns false — Klasse 2 nie blockiert", () => {
      expect(isGated(2, "free")).toBe(false);
    });
  });

  // ── 2. getSchoolSubscriptionTier with DB ─────────────────────────────

  describe("getSchoolSubscriptionTier DB queries", () => {
    it("returns 'free' for newly created school", async () => {
      const admin = subAdminClient();
      const tier = await getSchoolSubscriptionTier(admin, seed.childId);
      expect(tier).toBe("free");
    });

    it("returns 'grundschule' after admin updates tier", async () => {
      const admin = subAdminClient();

      // Update school tier to 'grundschule'
      const { error } = await admin
        .from("schools")
        .update({ subscription_tier: "grundschule" })
        .eq("id", seed.schoolId);
      expect(error).toBeNull();

      const tier = await getSchoolSubscriptionTier(admin, seed.childId);
      expect(tier).toBe("grundschule");
    });

    it("returns 'demo' after admin updates tier to demo", async () => {
      const admin = subAdminClient();

      // Update school tier to 'demo'
      const { error } = await admin
        .from("schools")
        .update({ subscription_tier: "demo" })
        .eq("id", seed.schoolId);
      expect(error).toBeNull();

      const tier = await getSchoolSubscriptionTier(admin, seed.childId);
      expect(tier).toBe("demo");

      // Reset to 'free' for subsequent tests
      await admin
        .from("schools")
        .update({ subscription_tier: "free" })
        .eq("id", seed.schoolId);
    });
  });

  // ── 3. RLS tests ─────────────────────────────────────────────────────

  describe("RLS policies for subscription gate", () => {
    it("child can read subscription_tier of own school (child_reads_own_school)", async () => {
      // Login as child via anon client
      const childClient = createClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
      );
      const childEmail = buildSyntheticEmail(
        SUB_TEST_CHILD.username,
        seed.classId
      );
      const childPassword = padPin(SUB_TEST_CHILD.pin, seed.classId);
      const { error: signInErr } = await childClient.auth.signInWithPassword({
        email: childEmail,
        password: childPassword,
      });
      expect(signInErr).toBeNull();

      // Child should be able to read own school's subscription_tier
      const { data, error } = await childClient
        .from("schools")
        .select("subscription_tier")
        .eq("id", seed.schoolId)
        .single();

      expect(error).toBeNull();
      expect(data).toBeTruthy();
      expect(data!.subscription_tier).toBe("free");
    }, 15_000);

    it("child can update subscription_tier of own school (child_upgrades_own_school)", async () => {
      // Login as child
      const childClient = createClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
      );
      const childEmail = buildSyntheticEmail(
        SUB_TEST_CHILD.username,
        seed.classId
      );
      const childPassword = padPin(SUB_TEST_CHILD.pin, seed.classId);
      const { error: signInErr } = await childClient.auth.signInWithPassword({
        email: childEmail,
        password: childPassword,
      });
      expect(signInErr).toBeNull();

      // Child upgrades own school
      const { error } = await childClient
        .from("schools")
        .update({ subscription_tier: "grundschule" })
        .eq("id", seed.schoolId);
      expect(error).toBeNull();

      // Verify the update worked
      const admin = subAdminClient();
      const { data } = await admin
        .from("schools")
        .select("subscription_tier")
        .eq("id", seed.schoolId)
        .single();
      expect(data!.subscription_tier).toBe("grundschule");

      // Reset for subsequent tests
      await admin
        .from("schools")
        .update({ subscription_tier: "free" })
        .eq("id", seed.schoolId);
    }, 15_000);

    it("child cannot read a different school (RLS blocks)", async () => {
      // Login as child
      const childClient = createClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
      );
      const childEmail = buildSyntheticEmail(
        SUB_TEST_CHILD.username,
        seed.classId
      );
      const childPassword = padPin(SUB_TEST_CHILD.pin, seed.classId);
      const { error: signInErr } = await childClient.auth.signInWithPassword({
        email: childEmail,
        password: childPassword,
      });
      expect(signInErr).toBeNull();

      // Try to read the OTHER school — should return empty or error
      const { data, error } = await childClient
        .from("schools")
        .select("subscription_tier")
        .eq("id", seed.otherSchoolId);

      // RLS should block: either empty array or no match
      expect(error).toBeNull();
      expect(data ?? []).toEqual([]);
    }, 15_000);
  });

  // ── 4. Upgrade flow ──────────────────────────────────────────────────

  describe("Upgrade flow via DB", () => {
    it("child upgrades school from free to grundschule", async () => {
      const admin = subAdminClient();

      // Verify starting tier
      const { data: before } = await admin
        .from("schools")
        .select("subscription_tier")
        .eq("id", seed.schoolId)
        .single();
      expect(before!.subscription_tier).toBe("free");

      // Login as child and upgrade
      const childClient = createClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
      );
      const childEmail = buildSyntheticEmail(
        SUB_TEST_CHILD.username,
        seed.classId
      );
      const childPassword = padPin(SUB_TEST_CHILD.pin, seed.classId);
      await childClient.auth.signInWithPassword({
        email: childEmail,
        password: childPassword,
      });

      // Simulate what the Server Action does: update subscription_tier
      const { error } = await childClient
        .from("schools")
        .update({ subscription_tier: "grundschule" })
        .eq("id", seed.schoolId);
      expect(error).toBeNull();

      // Verify via admin
      const { data: after } = await admin
        .from("schools")
        .select("subscription_tier")
        .eq("id", seed.schoolId)
        .single();
      expect(after!.subscription_tier).toBe("grundschule");

      // Reset
      await admin
        .from("schools")
        .update({ subscription_tier: "free" })
        .eq("id", seed.schoolId);
    }, 15_000);

    it("invalid tier value is rejected by CHECK constraint", async () => {
      const admin = subAdminClient();

      // Try setting an invalid tier — CHECK constraint should reject
      const { error: paidError } = await admin
        .from("schools")
        .update({ subscription_tier: "paid" })
        .eq("id", seed.schoolId);
      expect(paidError).toBeTruthy();

      const { error: invalidError } = await admin
        .from("schools")
        .update({ subscription_tier: "invalid" })
        .eq("id", seed.schoolId);
      expect(invalidError).toBeTruthy();

      // Verify tier is still 'free' (unchanged)
      const { data } = await admin
        .from("schools")
        .select("subscription_tier")
        .eq("id", seed.schoolId)
        .single();
      expect(data!.subscription_tier).toBe("free");
    });
  });
});
