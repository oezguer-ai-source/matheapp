import { describe, it, expect, beforeAll } from "vitest";
import {
  seedTestData,
  cleanupTestData,
  TEST_CHILD,
  TEST_TEACHER,
  type SeedResult,
} from "../fixtures/supabase";
import { createClient } from "@supabase/supabase-js";
import { buildSyntheticEmail, padPin } from "@/lib/supabase/pin-email";

const BASE = process.env.MATHEAPP_TEST_URL ?? "http://localhost:3000";

async function isServerUp(): Promise<boolean> {
  try {
    const r = await fetch(`${BASE}/login`, { redirect: "manual" });
    return r.status < 500;
  } catch {
    return false;
  }
}

async function loginAndGetCookies(
  email: string,
  password: string
): Promise<string> {
  const anon = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  );
  const { data, error } = await anon.auth.signInWithPassword({
    email,
    password,
  });
  if (error || !data.session) throw error ?? new Error("login failed");
  // Supabase sets two cookies (access + refresh). Reconstruct as a Cookie header:
  const refresh = data.session.refresh_token;
  const access = data.session.access_token;
  const projectRef = process.env.SUPABASE_PROJECT_REF!;
  return `sb-${projectRef}-auth-token=${encodeURIComponent(
    JSON.stringify({ access_token: access, refresh_token: refresh })
  )}`;
}

describe("SC-4 — Middleware role routing", () => {
  let up = false;
  let seed: SeedResult;

  beforeAll(async () => {
    up = await isServerUp();
    if (!up) return;
    seed = await seedTestData();
  }, 60_000);

  it("child cannot access teacher routes", async () => {
    if (!up) return; // skip when dev server isn't running (e.g., CI without webServer)

    const childEmail = buildSyntheticEmail(TEST_CHILD.username, seed.classId);
    const childPassword = padPin(TEST_CHILD.pin, seed.classId);
    const cookie = await loginAndGetCookies(childEmail, childPassword);

    const res = await fetch(`${BASE}/lehrer/dashboard`, {
      redirect: "manual",
      headers: { Cookie: cookie },
    });
    // Middleware should redirect child away from teacher routes
    expect([302, 307]).toContain(res.status);
  }, 30_000);

  it("teacher cannot access child routes", async () => {
    if (!up) return;
    const cookie = await loginAndGetCookies(
      TEST_TEACHER.email,
      TEST_TEACHER.password
    );

    const res = await fetch(`${BASE}/kind/dashboard`, {
      redirect: "manual",
      headers: { Cookie: cookie },
    });
    // Middleware should redirect teacher away from child routes
    expect([302, 307]).toContain(res.status);
  }, 30_000);
});
