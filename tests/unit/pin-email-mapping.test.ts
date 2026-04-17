import { describe, it, expect } from "vitest";
import { buildSyntheticEmail, padPin } from "@/lib/supabase/pin-email";

const VALID_CLASS_ID = "2c3d4e5f-1234-4a5b-9c8d-7e6f5a4b3c2d";

describe("PIN-to-email mapping", () => {
  describe("buildSyntheticEmail", () => {
    it("builds synthetic email from username + class_id prefix", () => {
      expect(buildSyntheticEmail("mia.k", VALID_CLASS_ID)).toBe(
        "mia.k.2c3d4e5f@matheapp.internal"
      );
    });

    it("lowercases username", () => {
      expect(buildSyntheticEmail("MIA", VALID_CLASS_ID)).toBe(
        "mia.2c3d4e5f@matheapp.internal"
      );
    });

    it("rejects usernames with spaces or forbidden characters", () => {
      expect(() => buildSyntheticEmail("mia k", VALID_CLASS_ID)).toThrow();
      expect(() => buildSyntheticEmail("mia@home", VALID_CLASS_ID)).toThrow();
    });

    it("rejects non-UUID class_id", () => {
      expect(() => buildSyntheticEmail("mia", "short")).toThrow();
    });
  });

  describe("padPin", () => {
    it("pads 4-digit PIN to >= 6 chars with class_id prefix", () => {
      const padded = padPin("4711", VALID_CLASS_ID);
      expect(padded).toBe("4711-2c3d4e5f");
      expect(padded.length).toBeGreaterThanOrEqual(6);
    });

    it("rejects PINs that are not exactly 4 digits", () => {
      expect(() => padPin("47", VALID_CLASS_ID)).toThrow();
      expect(() => padPin("47110", VALID_CLASS_ID)).toThrow();
      expect(() => padPin("abcd", VALID_CLASS_ID)).toThrow();
    });

    it("rejects non-UUID class_id", () => {
      expect(() => padPin("4711", "short")).toThrow();
    });
  });
});
