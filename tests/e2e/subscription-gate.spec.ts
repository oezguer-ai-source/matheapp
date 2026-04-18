import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { buildSyntheticEmail, padPin } from "../../lib/supabase/pin-email";
import {
  seedTestData,
  cleanupTestData,
  TEST_CHILD,
} from "../fixtures/supabase";
import type { SeedResult } from "../fixtures/supabase";

// Isolated admin client for subscription E2E tests
function subE2eAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

// Unique test data — must not collide with other E2E suites (T-60-05)
const SUB_E2E_SCHOOL = "Sub-E2E Testschule";
const SUB_E2E_CLASS = "Sub-E2E Klasse 4a";
const SUB_E2E_TEACHER = {
  email: "teacher.sube2e@matheapp.test",
  password: "TestPass123!",
  name: "Sub-E2E Test Teacher",
};
const SUB_E2E_CHILD = { username: "sub.e2e", pin: "5823", grade: 4 };

let subE2eClassId: string;
let subE2eSchoolId: string;
let subE2eChildId: string;

// Also use shared TEST_CHILD (grade=2) from fixtures for "no gate" test
let sharedSeed: SeedResult;

async function subE2eCleanup() {
  const admin = subE2eAdminClient();

  const { data: allUsers } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 500,
  });
  if (allUsers?.users) {
    for (const u of allUsers.users) {
      if (
        u.email === SUB_E2E_TEACHER.email ||
        (u.email?.endsWith("@matheapp.internal") &&
          u.email.startsWith(`${SUB_E2E_CHILD.username}.`))
      ) {
        await admin.auth.admin.deleteUser(u.id);
      }
    }
  }

  await admin.from("classes").delete().eq("name", SUB_E2E_CLASS);
  await admin.from("schools").delete().eq("name", SUB_E2E_SCHOOL);
}

test.beforeAll(async () => {
  const admin = subE2eAdminClient();
  await subE2eCleanup();

  // 1. Seed shared test data (grade=2 child) for "no gate" test
  sharedSeed = await seedTestData();

  // 2. Create teacher for grade-4 child
  const { data: teacherSignup, error: teacherErr } =
    await admin.auth.admin.createUser({
      email: SUB_E2E_TEACHER.email,
      password: SUB_E2E_TEACHER.password,
      email_confirm: true,
      app_metadata: { role: "teacher" },
      user_metadata: { name: SUB_E2E_TEACHER.name },
    });
  if (teacherErr || !teacherSignup.user)
    throw teacherErr ?? new Error("teacher create failed");
  const teacherId = teacherSignup.user.id;

  await admin.from("profiles").upsert({
    user_id: teacherId,
    role: "teacher",
    display_name: SUB_E2E_TEACHER.name,
    grade_level: null,
    class_id: null,
  });

  // 3. Create school (tier='free') + class
  const { data: school, error: schoolErr } = await admin
    .from("schools")
    .insert({ name: SUB_E2E_SCHOOL, subscription_tier: "free" })
    .select("id")
    .single();
  if (schoolErr || !school) throw schoolErr;
  subE2eSchoolId = school.id;

  const { data: cls, error: classErr } = await admin
    .from("classes")
    .insert({
      name: SUB_E2E_CLASS,
      school_id: subE2eSchoolId,
      teacher_id: teacherId,
    })
    .select("id")
    .single();
  if (classErr || !cls) throw classErr;
  subE2eClassId = cls.id;

  await admin
    .from("profiles")
    .update({ class_id: subE2eClassId })
    .eq("user_id", teacherId);

  // 4. Create grade-4 child
  const childEmail = buildSyntheticEmail(SUB_E2E_CHILD.username, subE2eClassId);
  const childPassword = padPin(SUB_E2E_CHILD.pin, subE2eClassId);
  const { data: childSignup, error: childErr } =
    await admin.auth.admin.createUser({
      email: childEmail,
      password: childPassword,
      email_confirm: true,
      app_metadata: { role: "child" },
    });
  if (childErr || !childSignup.user)
    throw childErr ?? new Error("child create failed");
  subE2eChildId = childSignup.user.id;

  await admin.from("profiles").upsert({
    user_id: subE2eChildId,
    role: "child",
    display_name: SUB_E2E_CHILD.username,
    grade_level: SUB_E2E_CHILD.grade,
    class_id: subE2eClassId,
  });
});

test.afterAll(async () => {
  // Reset school tier to free (in case tests left it changed)
  const admin = subE2eAdminClient();
  await admin
    .from("schools")
    .update({ subscription_tier: "free" })
    .eq("id", subE2eSchoolId);

  await subE2eCleanup();
  await cleanupTestData();
});

async function loginAsChild(
  page: import("@playwright/test").Page,
  username: string,
  pin: string
) {
  await page.goto("/login");
  await page.getByRole("tab", { name: "Kind" }).click();
  await page.getByLabel("Benutzername").fill(username);

  const digits = pin.split("");
  for (let i = 0; i < 4; i++) {
    await page.getByLabel(`PIN-Ziffer ${i + 1} von 4`).fill(digits[i]);
  }

  await page.getByRole("button", { name: "Einloggen" }).click();
  await page.waitForURL("**/kind/dashboard", { timeout: 15_000 });
}

test.describe("Subscription Gate -- E2E Flow", () => {
  test("Gate-Redirect: Klasse-4-Kind (free) wird zu /kind/upgrade umgeleitet", async ({
    page,
  }) => {
    await loginAsChild(page, SUB_E2E_CHILD.username, SUB_E2E_CHILD.pin);

    // Navigate to /kind/ueben — should redirect to /kind/upgrade
    await page.goto("/kind/ueben");
    await page.waitForURL("**/kind/upgrade", { timeout: 15_000 });
    await expect(page).toHaveURL(/\/kind\/upgrade/);

    // Verify upgrade page shows packages with prices
    await expect(page.getByText("9,99 Euro/Monat", { exact: true })).toBeVisible();
    await expect(page.getByText("14,99 Euro/Monat")).toBeVisible();
    await expect(page.getByText("19,99 Euro/Monat")).toBeVisible();

    // Verify "Jetzt freischalten" buttons are visible
    const buttons = page.getByRole("button", { name: "Jetzt freischalten" });
    await expect(buttons.first()).toBeVisible();
  });

  test("Upgrade-Flow: Klick auf Paket schaltet frei und leitet zu /kind/ueben", async ({
    page,
  }) => {
    await loginAsChild(page, SUB_E2E_CHILD.username, SUB_E2E_CHILD.pin);

    // Navigate to upgrade page
    await page.goto("/kind/upgrade");
    await page.waitForURL("**/kind/upgrade", { timeout: 15_000 });

    // Click "Jetzt freischalten" on the first package (Grundschulniveau)
    const buttons = page.getByRole("button", { name: "Jetzt freischalten" });
    await buttons.first().click();

    // Should redirect to /kind/ueben after upgrade
    await page.waitForURL("**/kind/ueben", { timeout: 15_000 });
    await expect(page).toHaveURL(/\/kind\/ueben/);

    // Verify ExerciseSession is now visible (exercise text pattern)
    const exerciseDisplay = page.locator("div.text-5xl");
    await expect(exerciseDisplay).toBeVisible({ timeout: 10_000 });

    // Reset school tier to free for next tests
    const admin = subE2eAdminClient();
    await admin
      .from("schools")
      .update({ subscription_tier: "free" })
      .eq("id", subE2eSchoolId);
  });

  test("Kein Gate fuer Klasse 1-3: Kind (grade=2) sieht Aufgaben direkt", async ({
    page,
  }) => {
    // Use shared TEST_CHILD (grade=2)
    await loginAsChild(page, TEST_CHILD.username, TEST_CHILD.pin);

    // Navigate directly to /kind/ueben
    await page.goto("/kind/ueben");

    // Should NOT redirect to upgrade — exercise session loads directly
    await expect(page).toHaveURL(/\/kind\/ueben/);

    // ExerciseSession should be visible
    const exerciseDisplay = page.locator("div.text-5xl");
    await expect(exerciseDisplay).toBeVisible({ timeout: 10_000 });
  });

  test("Demo-Bypass: Klasse-4-Kind an Demo-Schule sieht Aufgaben direkt", async ({
    page,
  }) => {
    // Set school to demo tier BEFORE login
    const admin = subE2eAdminClient();
    const { error: updateErr } = await admin
      .from("schools")
      .update({ subscription_tier: "demo" })
      .eq("id", subE2eSchoolId);
    expect(updateErr).toBeNull();

    // Verify the update took effect
    const { data: check } = await admin
      .from("schools")
      .select("subscription_tier")
      .eq("id", subE2eSchoolId)
      .single();
    expect(check!.subscription_tier).toBe("demo");

    await loginAsChild(page, SUB_E2E_CHILD.username, SUB_E2E_CHILD.pin);

    // Navigate to /kind/ueben — should NOT redirect (demo bypasses gate)
    await page.goto("/kind/ueben");

    // Wait for either /kind/ueben to stay or exercise to appear
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveURL(/\/kind\/ueben/, { timeout: 10_000 });

    // ExerciseSession should be visible
    const exerciseDisplay = page.locator("div.text-5xl");
    await expect(exerciseDisplay).toBeVisible({ timeout: 10_000 });

    // Reset to free
    await admin
      .from("schools")
      .update({ subscription_tier: "free" })
      .eq("id", subE2eSchoolId);
  });
});
