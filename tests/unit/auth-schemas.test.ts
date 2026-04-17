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

  describe("teacherSignupSchema", () => {
    const VALID = {
      name: "Anna Müller",
      email: "anna@schule.de",
      password: "12345678",
      schoolName: "Grundschule Musterweg",
      className: "3a",
    };

    it("accepts a fully-populated valid payload", () => {
      expect(teacherSignupSchema.safeParse(VALID).success).toBe(true);
    });

    it("requires non-empty name", () => {
      expect(
        teacherSignupSchema.safeParse({ ...VALID, name: "" }).success
      ).toBe(false);
    });

    it("requires valid email", () => {
      expect(
        teacherSignupSchema.safeParse({ ...VALID, email: "nope" }).success
      ).toBe(false);
    });

    it("requires password >= 8 chars", () => {
      expect(
        teacherSignupSchema.safeParse({ ...VALID, password: "short" }).success
      ).toBe(false);
    });

    it("requires schoolName >= 2 chars (D-13a)", () => {
      const r = teacherSignupSchema.safeParse({ ...VALID, schoolName: "A" });
      expect(r.success).toBe(false);
      if (!r.success) {
        expect(
          r.error.issues.some((i) => i.message.includes("Schule"))
        ).toBe(true);
      }
    });

    it("requires className >= 2 chars (D-13a)", () => {
      const r = teacherSignupSchema.safeParse({ ...VALID, className: "A" });
      expect(r.success).toBe(false);
      if (!r.success) {
        expect(
          r.error.issues.some((i) => i.message.includes("Klasse"))
        ).toBe(true);
      }
    });

    it("rejects schoolName longer than 100 chars", () => {
      expect(
        teacherSignupSchema.safeParse({
          ...VALID,
          schoolName: "x".repeat(101),
        }).success
      ).toBe(false);
    });

    it("rejects className longer than 100 chars", () => {
      expect(
        teacherSignupSchema.safeParse({
          ...VALID,
          className: "x".repeat(101),
        }).success
      ).toBe(false);
    });
  });
});
