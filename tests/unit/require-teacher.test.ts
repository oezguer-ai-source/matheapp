import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Unit-Tests fuer requireTeacher() (Audit A3 — Rollen-Pruefung).
 *
 * requireTeacher() haengt von zwei Supabase-Clients ab:
 *   - createClient()       -> auth.getUser()  (angemeldeter User)
 *   - createAdminClient()  -> profiles-Lookup (Rolle)
 *
 * Beide werden hier gemockt, sodass das Verhalten ohne echte DB pruefbar ist:
 *   1. Kein User              -> { ok: false, "Nicht angemeldet." }
 *   2. User ohne Profil       -> { ok: false, "Kein Zugriff ..." }
 *   3. User mit Rolle 'child' -> { ok: false, "Kein Zugriff ..." }
 *   4. User mit Rolle 'teacher' -> { ok: true, userId }
 */

// --- Mock-Steuerung -------------------------------------------------------
let mockUser: { id: string } | null = null;
let mockProfile: { role: string } | null = null;

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: {
      getUser: vi.fn(async () => ({ data: { user: mockUser } })),
    },
  })),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn(async () => ({ data: mockProfile })),
        })),
      })),
    })),
  })),
}));

import { requireTeacher } from "@/lib/teacher/auth";

describe("requireTeacher() — Rollen-Pruefung (A3)", () => {
  beforeEach(() => {
    mockUser = null;
    mockProfile = null;
  });

  it("lehnt einen nicht angemeldeten Aufruf ab", async () => {
    mockUser = null;

    const result = await requireTeacher();

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe("Nicht angemeldet.");
    }
  });

  it("lehnt einen angemeldeten User ohne Profil ab", async () => {
    mockUser = { id: "user-1" };
    mockProfile = null;

    const result = await requireTeacher();

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("Kein Zugriff");
    }
  });

  it("lehnt einen angemeldeten User mit Rolle 'child' ab", async () => {
    mockUser = { id: "kind-1" };
    mockProfile = { role: "child" };

    const result = await requireTeacher();

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("Lehrkraeften vorbehalten");
    }
  });

  it("erlaubt einen angemeldeten User mit Rolle 'teacher' und liefert die userId", async () => {
    mockUser = { id: "lehrer-42" };
    mockProfile = { role: "teacher" };

    const result = await requireTeacher();

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.userId).toBe("lehrer-42");
    }
  });
});
