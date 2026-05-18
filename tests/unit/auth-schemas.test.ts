import { describe, it, expect } from "vitest";
import {
  childLoginSchema,
  teacherLoginSchema,
  teacherSignupSchema,
} from "@/lib/schemas/auth";

describe("Auth Zod schemas", () => {
  describe("childLoginSchema", () => {
    it("accepts valid 4-digit PIN and username", () => {
      const result = childLoginSchema.safeParse({
        username: "mia.k",
        pin: "4711",
      });
      expect(result.success).toBe(true);
    });

    it("requires 4-digit PIN", () => {
      const r = childLoginSchema.safeParse({ username: "mia", pin: "47" });
      expect(r.success).toBe(false);
      if (!r.success) {
        expect(
          r.error.issues.some((i) => i.message.includes("4 Ziffern"))
        ).toBe(true);
      }
    });

    it("rejects empty username", () => {
      const r = childLoginSchema.safeParse({ username: "", pin: "4711" });
      expect(r.success).toBe(false);
      if (!r.success) {
        expect(
          r.error.issues.some((i) => i.message.includes("Benutzernamen"))
        ).toBe(true);
      }
    });

    it("rejects usernames with forbidden characters", () => {
      expect(
        childLoginSchema.safeParse({ username: "mia k", pin: "4711" }).success
      ).toBe(false);
      expect(
        childLoginSchema.safeParse({ username: "mia@home", pin: "4711" })
          .success
      ).toBe(false);
    });

    it("lowercases username on parse", () => {
      const r = childLoginSchema.safeParse({ username: "MIA", pin: "4711" });
      expect(r.success).toBe(true);
      if (r.success) expect(r.data.username).toBe("mia");
    });
  });

  describe("teacherLoginSchema", () => {
    it("requires valid email", () => {
      const r = teacherLoginSchema.safeParse({
        email: "not-an-email",
        password: "x",
      });
      expect(r.success).toBe(false);
      if (!r.success) {
        expect(
          r.error.issues.some((i) => i.message.includes("gültige E-Mail"))
        ).toBe(true);
      }
    });

    it("rejects empty password", () => {
      const r = teacherLoginSchema.safeParse({
        email: "a@b.de",
        password: "",
      });
      expect(r.success).toBe(false);
      if (!r.success) {
        expect(
          r.error.issues.some((i) => i.message.includes("Passwort ein"))
        ).toBe(true);
      }
    });
  });

  // Nach der vereinfachten Registrierung hat teacherSignupSchema nur noch die
  // Felder name, email und password (keine schoolName/className mehr).
  describe("teacherSignupSchema (vereinfachte Registrierung)", () => {
    const VALID = {
      name: "Anna Müller",
      email: "anna@schule.de",
      password: "12345678",
    };

    it("accepts a valid payload with only name, email and password", () => {
      expect(teacherSignupSchema.safeParse(VALID).success).toBe(true);
    });

    it("requires non-empty name", () => {
      const r = teacherSignupSchema.safeParse({ ...VALID, name: "" });
      expect(r.success).toBe(false);
      if (!r.success) {
        expect(
          r.error.issues.some((i) => i.message.includes("Namen"))
        ).toBe(true);
      }
    });

    it("rejects name longer than 100 chars", () => {
      expect(
        teacherSignupSchema.safeParse({ ...VALID, name: "x".repeat(101) })
          .success
      ).toBe(false);
    });

    it("requires valid email", () => {
      const r = teacherSignupSchema.safeParse({ ...VALID, email: "nope" });
      expect(r.success).toBe(false);
      if (!r.success) {
        expect(
          r.error.issues.some((i) => i.message.includes("gültige E-Mail"))
        ).toBe(true);
      }
    });

    it("requires password >= 8 chars", () => {
      const r = teacherSignupSchema.safeParse({ ...VALID, password: "short" });
      expect(r.success).toBe(false);
      if (!r.success) {
        expect(
          r.error.issues.some((i) => i.message.includes("8 Zeichen"))
        ).toBe(true);
      }
    });

    it("ignores unknown legacy fields like schoolName/className", () => {
      // z.object() entfernt unbekannte Keys standardmaessig (strip),
      // daher bleibt das Payload trotz Alt-Felder gueltig.
      const r = teacherSignupSchema.safeParse({
        ...VALID,
        schoolName: "Grundschule Musterweg",
        className: "3a",
      });
      expect(r.success).toBe(true);
      if (r.success) {
        expect(r.data).not.toHaveProperty("schoolName");
        expect(r.data).not.toHaveProperty("className");
      }
    });
  });
});
