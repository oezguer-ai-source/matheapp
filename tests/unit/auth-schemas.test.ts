import { describe, it, expect } from "vitest";

describe("Auth Zod schemas", () => {
  it.todo("childLoginSchema requires 4-digit PIN");
  it.todo("childLoginSchema rejects usernames with special chars");
  it.todo("teacherLoginSchema requires valid email");
  it.todo("teacherSignupSchema requires password >= 8 chars");
});
