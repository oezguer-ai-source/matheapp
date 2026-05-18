import { describe, it, expect } from "vitest";
import {
  assignmentItemSchema,
  createAssignmentSchema,
} from "@/lib/schemas/assignment";

/**
 * Unit-Tests fuer die server-seitige Aufgaben-Validierung (Audit A2 / G1).
 *
 * createAssignmentAction parst seinen gesamten Input per createAssignmentSchema,
 * bevor irgendetwas geschrieben wird. Diese Tests sichern die reine
 * Schema-Validierung ab — der A1-Fall ("fremde Klasse") ist DB-abhaengig und
 * wird hier bewusst nicht getestet, sondern nur die Form der classIds.
 */

// Ein gueltiges Freitext-Item als Basis fuer Varianten.
const VALID_TEXT_ITEM = {
  itemType: "text" as const,
  question: "Wie viel ist 7 + 5?",
  sortOrder: 0,
};

// Ein gueltiges Multiple-Choice-Item als Basis fuer Varianten.
const VALID_CHOICE_ITEM = {
  itemType: "choice" as const,
  question: "Welche Zahl ist gerade?",
  sortOrder: 1,
  options: ["3", "4", "5"],
  correctOptions: [1],
};

const VALID_UUID = "11111111-1111-4111-8111-111111111111";

// Ein vollstaendig gueltiger createAssignment-Input.
const VALID_ASSIGNMENT = {
  title: "Hausaufgabe Addition",
  description: "Loest die Aufgaben bis Freitag.",
  dueDate: "2026-06-01T12:00:00.000Z",
  classIds: [VALID_UUID],
  items: [VALID_TEXT_ITEM],
};

describe("assignmentItemSchema — Choice-Konsistenz (A2 / G1)", () => {
  it("akzeptiert ein gueltiges Freitext-Item", () => {
    expect(assignmentItemSchema.safeParse(VALID_TEXT_ITEM).success).toBe(true);
  });

  it("akzeptiert ein gueltiges Multiple-Choice-Item", () => {
    expect(assignmentItemSchema.safeParse(VALID_CHOICE_ITEM).success).toBe(true);
  });

  it("lehnt ein Item mit leerer Frage ab", () => {
    const r = assignmentItemSchema.safeParse({
      ...VALID_TEXT_ITEM,
      question: "",
    });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.issues.some((i) => i.message.includes("leer"))).toBe(true);
    }
  });

  it("lehnt ein Choice-Item mit nur einer Option ab", () => {
    const r = assignmentItemSchema.safeParse({
      ...VALID_CHOICE_ITEM,
      options: ["4"],
      correctOptions: [0],
    });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(
        r.error.issues.some((i) => i.message.includes("mindestens 2"))
      ).toBe(true);
    }
  });

  it("lehnt ein Choice-Item ohne markierte korrekte Option ab", () => {
    const r = assignmentItemSchema.safeParse({
      ...VALID_CHOICE_ITEM,
      correctOptions: [],
    });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(
        r.error.issues.some((i) => i.message.includes("mindestens eine korrekte"))
      ).toBe(true);
    }
  });

  it("lehnt ein Choice-Item ab, dessen correctOptions-Index auf keine Option zeigt", () => {
    const r = assignmentItemSchema.safeParse({
      ...VALID_CHOICE_ITEM,
      options: ["3", "4"],
      correctOptions: [5],
    });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(
        r.error.issues.some((i) => i.message.includes("keine vorhandene Option"))
      ).toBe(true);
    }
  });

  it("lehnt ein Choice-Item mit doppelten korrekten Indizes ab", () => {
    const r = assignmentItemSchema.safeParse({
      ...VALID_CHOICE_ITEM,
      options: ["3", "4", "5"],
      correctOptions: [1, 1],
    });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(
        r.error.issues.some((i) => i.message.includes("doppelt"))
      ).toBe(true);
    }
  });

  it("lehnt ein Freitext-Item mit Antwortoptionen ab", () => {
    const r = assignmentItemSchema.safeParse({
      ...VALID_TEXT_ITEM,
      options: ["a", "b"],
    });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(
        r.error.issues.some((i) => i.message.includes("keine Antwortoptionen"))
      ).toBe(true);
    }
  });

  it("lehnt ein Freitext-Item mit korrekten Optionen ab", () => {
    const r = assignmentItemSchema.safeParse({
      ...VALID_TEXT_ITEM,
      correctOptions: [0],
    });
    expect(r.success).toBe(false);
  });
});

describe("createAssignmentSchema — Aufgaben-Validierung (A2 / G1)", () => {
  it("akzeptiert einen vollstaendig gueltigen Input", () => {
    expect(createAssignmentSchema.safeParse(VALID_ASSIGNMENT).success).toBe(
      true
    );
  });

  it("lehnt einen leeren Titel ab", () => {
    const r = createAssignmentSchema.safeParse({
      ...VALID_ASSIGNMENT,
      title: "",
    });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(
        r.error.issues.some((i) => i.message.includes("Titel"))
      ).toBe(true);
    }
  });

  it("lehnt einen zu langen Titel ab (> 200 Zeichen)", () => {
    expect(
      createAssignmentSchema.safeParse({
        ...VALID_ASSIGNMENT,
        title: "x".repeat(201),
      }).success
    ).toBe(false);
  });

  it("lehnt ein ungueltiges dueDate ab (kein ISO-Datetime)", () => {
    const r = createAssignmentSchema.safeParse({
      ...VALID_ASSIGNMENT,
      dueDate: "01.06.2026",
    });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(
        r.error.issues.some((i) => i.message.includes("Faelligkeitsdatum"))
      ).toBe(true);
    }
  });

  it("lehnt einen Input ohne Items ab", () => {
    const r = createAssignmentSchema.safeParse({
      ...VALID_ASSIGNMENT,
      items: [],
    });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(
        r.error.issues.some((i) => i.message.includes("mindestens eine Frage"))
      ).toBe(true);
    }
  });

  it("lehnt einen Input ab, dessen Items ein inkonsistentes Choice-Item enthalten", () => {
    // Choice-Item mit Index, der auf keine Option zeigt — die Inkonsistenz
    // muss auch ueber createAssignmentSchema durchschlagen.
    const r = createAssignmentSchema.safeParse({
      ...VALID_ASSIGNMENT,
      items: [
        {
          itemType: "choice",
          question: "Welche Zahl ist gerade?",
          sortOrder: 0,
          options: ["3", "4"],
          correctOptions: [9],
        },
      ],
    });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(
        r.error.issues.some((i) => i.message.includes("keine vorhandene Option"))
      ).toBe(true);
    }
  });

  it("lehnt einen Input ohne classIds ab (mindestens eine Klasse noetig)", () => {
    const r = createAssignmentSchema.safeParse({
      ...VALID_ASSIGNMENT,
      classIds: [],
    });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(
        r.error.issues.some((i) => i.message.includes("mindestens einer Klasse"))
      ).toBe(true);
    }
  });

  it("lehnt classIds ab, die keine UUIDs sind", () => {
    // Schuetzt davor, dass beliebige Strings als Klassen-IDs durchgereicht
    // werden — die DB-seitige Ownership-Pruefung (A1) setzt valide UUIDs voraus.
    const r = createAssignmentSchema.safeParse({
      ...VALID_ASSIGNMENT,
      classIds: ["nicht-eine-uuid"],
    });
    expect(r.success).toBe(false);
  });

  it("setzt eine fehlende Beschreibung auf einen leeren String", () => {
    const { description, ...withoutDescription } = VALID_ASSIGNMENT;
    void description;
    const r = createAssignmentSchema.safeParse(withoutDescription);
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.description).toBe("");
    }
  });
});
