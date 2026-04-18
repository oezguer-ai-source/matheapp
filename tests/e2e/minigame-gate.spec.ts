import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { buildSyntheticEmail, padPin } from "../../lib/supabase/pin-email";

// Isolated admin client for minigame E2E tests
function mgAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

// Unique test data — must not collide with other E2E suites
const MG_E2E_SCHOOL = "Testschule Minigame-E2E";
const MG_E2E_CLASS = "Klasse Minigame-E2E";
const MG_E2E_TEACHER = {
  email: "teacher.minigame-e2e@matheapp.test",
  password: "TestPass123!",
  name: "Minigame E2E Teacher",
};

// Child with >= 500 points (will have 600)
const RICH_CHILD = {
  username: "rico.minigame",
  pin: "1234",
  grade: 2,
};

// Child with < 500 points (will have 100)
const POOR_CHILD = {
  username: "arno.minigame",
  pin: "5678",
  grade: 2,
};

let classId: string;
let richChildId: string;
let poorChildId: string;

async function mgCleanup() {
  const admin = mgAdminClient();

  const { data: allUsers } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 500,
  });
  if (allUsers?.users) {
    for (const u of allUsers.users) {
      if (
        u.email === MG_E2E_TEACHER.email ||
        (u.email?.endsWith("@matheapp.internal") &&
          (u.email.startsWith(`${RICH_CHILD.username}.`) ||
            u.email.startsWith(`${POOR_CHILD.username}.`)))
      ) {
        await admin.auth.admin.deleteUser(u.id);
      }
    }
  }

  await admin.from("classes").delete().eq("name", MG_E2E_CLASS);
  await admin.from("schools").delete().eq("name", MG_E2E_SCHOOL);
}

test.beforeAll(async () => {
  const admin = mgAdminClient();
  await mgCleanup();

  // Create teacher
  const { data: teacherSignup, error: teacherErr } =
    await admin.auth.admin.createUser({
      email: MG_E2E_TEACHER.email,
      password: MG_E2E_TEACHER.password,
      email_confirm: true,
      app_metadata: { role: "teacher" },
      user_metadata: { name: MG_E2E_TEACHER.name },
    });
  if (teacherErr || !teacherSignup.user)
    throw teacherErr ?? new Error("teacher create failed");
  const teacherId = teacherSignup.user.id;

  await admin.from("profiles").upsert({
    user_id: teacherId,
    role: "teacher",
    display_name: MG_E2E_TEACHER.name,
    grade_level: null,
    class_id: null,
  });

  // Create school + class
  const { data: school, error: schoolErr } = await admin
    .from("schools")
    .insert({ name: MG_E2E_SCHOOL, subscription_tier: "free" })
    .select("id")
    .single();
  if (schoolErr || !school) throw schoolErr;

  const { data: cls, error: classErr } = await admin
    .from("classes")
    .insert({
      name: MG_E2E_CLASS,
      school_id: school.id,
      teacher_id: teacherId,
    })
    .select("id")
    .single();
  if (classErr || !cls) throw classErr;
  classId = cls.id;

  await admin
    .from("profiles")
    .update({ class_id: classId })
    .eq("user_id", teacherId);

  // Create rich child (600 points)
  const richEmail = buildSyntheticEmail(RICH_CHILD.username, classId);
  const richPassword = padPin(RICH_CHILD.pin, classId);
  const { data: richSignup, error: richErr } =
    await admin.auth.admin.createUser({
      email: richEmail,
      password: richPassword,
      email_confirm: true,
      app_metadata: { role: "child" },
    });
  if (richErr || !richSignup.user)
    throw richErr ?? new Error("rich child create failed");
  richChildId = richSignup.user.id;

  await admin.from("profiles").upsert({
    user_id: richChildId,
    role: "child",
    display_name: RICH_CHILD.username,
    grade_level: RICH_CHILD.grade,
    class_id: classId,
  });

  // Seed 600 points for rich child
  const richEntries = Array.from({ length: 6 }, () => ({
    child_id: richChildId,
    operation_type: "addition",
    grade: RICH_CHILD.grade,
    correct: true,
    points_earned: 100,
  }));
  const { error: richInsertErr } = await admin
    .from("progress_entries")
    .insert(richEntries);
  if (richInsertErr) throw richInsertErr;

  // Create poor child (100 points)
  const poorEmail = buildSyntheticEmail(POOR_CHILD.username, classId);
  const poorPassword = padPin(POOR_CHILD.pin, classId);
  const { data: poorSignup, error: poorErr } =
    await admin.auth.admin.createUser({
      email: poorEmail,
      password: poorPassword,
      email_confirm: true,
      app_metadata: { role: "child" },
    });
  if (poorErr || !poorSignup.user)
    throw poorErr ?? new Error("poor child create failed");
  poorChildId = poorSignup.user.id;

  await admin.from("profiles").upsert({
    user_id: poorChildId,
    role: "child",
    display_name: POOR_CHILD.username,
    grade_level: POOR_CHILD.grade,
    class_id: classId,
  });

  // Seed 100 points for poor child
  const { error: poorInsertErr } = await admin
    .from("progress_entries")
    .insert({
      child_id: poorChildId,
      operation_type: "addition",
      grade: POOR_CHILD.grade,
      correct: true,
      points_earned: 100,
    });
  if (poorInsertErr) throw poorInsertErr;
});

test.afterAll(async () => {
  const admin = mgAdminClient();
  if (richChildId) {
    await admin
      .from("progress_entries")
      .delete()
      .eq("child_id", richChildId);
  }
  if (poorChildId) {
    await admin
      .from("progress_entries")
      .delete()
      .eq("child_id", poorChildId);
  }
  await mgCleanup();
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

test.describe("Minigame Gate -- Dashboard and Access Control", () => {
  test("Dashboard zeigt aktiven 'Spiel starten'-Link bei >= 500 Punkten", async ({
    page,
  }) => {
    await loginAsChild(page, RICH_CHILD.username, RICH_CHILD.pin);

    // "Spiel starten" should be a clickable link (not a disabled div)
    const spielLink = page.getByRole("link", { name: "Spiel starten" });
    await expect(spielLink).toBeVisible();
    await expect(spielLink).toHaveAttribute("href", "/kind/spiel");
  });

  test("Dashboard zeigt deaktivierten 'Spiel starten' bei < 500 Punkten", async ({
    page,
  }) => {
    await loginAsChild(page, POOR_CHILD.username, POOR_CHILD.pin);

    // "Spiel starten" text should be visible but NOT as a link
    const spielText = page.getByText("Spiel starten");
    await expect(spielText).toBeVisible();

    // Should have cursor-not-allowed class (disabled state)
    const disabledDiv = page.locator(".cursor-not-allowed", {
      hasText: "Spiel starten",
    });
    await expect(disabledDiv).toBeVisible();

    // Should NOT have a link to /kind/spiel
    const spielLink = page.getByRole("link", { name: "Spiel starten" });
    await expect(spielLink).not.toBeVisible();
  });

  test("/kind/spiel redirectet zu /kind/dashboard bei < 500 Punkten", async ({
    page,
  }) => {
    await loginAsChild(page, POOR_CHILD.username, POOR_CHILD.pin);

    // Navigate directly to /kind/spiel
    await page.goto("/kind/spiel");

    // Should redirect to /kind/dashboard
    await page.waitForURL("**/kind/dashboard", { timeout: 15_000 });
    await expect(page).toHaveURL(/\/kind\/dashboard/);
  });

  test("/kind/spiel ist erreichbar bei >= 500 Punkten", async ({ page }) => {
    await loginAsChild(page, RICH_CHILD.username, RICH_CHILD.pin);

    // Navigate to /kind/spiel
    await page.goto("/kind/spiel");

    // Should NOT redirect — page loads with game content
    await expect(page).toHaveURL(/\/kind\/spiel/);

    // Should show "Ballonplatzen!" heading or "Spiel starten" button
    const heading = page.getByText("Ballonplatzen!");
    const startButton = page.getByRole("button", { name: "Spiel starten" });
    await expect(heading.or(startButton)).toBeVisible({ timeout: 10_000 });
  });
});
