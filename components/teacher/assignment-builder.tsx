"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { createAssignmentAction } from "@/app/(teacher)/lehrer/aufgaben/actions";

type ItemType = "text" | "choice";

interface AssignmentItem {
  id: string;
  type: ItemType;
  question: string;
  options: string[];       // nur bei choice
  correctOptions: number[]; // nur bei choice
}

export function AssignmentBuilder({
  classes,
}: {
  classes: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
  const [items, setItems] = useState<AssignmentItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function addItem(type: ItemType) {
    setItems([
      ...items,
      {
        id: crypto.randomUUID(),
        type,
        question: "",
        options: type === "choice" ? ["", ""] : [],
        correctOptions: [],
      },
    ]);
  }

  function updateItem(id: string, updates: Partial<AssignmentItem>) {
    setItems(items.map((i) => (i.id === id ? { ...i, ...updates } : i)));
  }

  function removeItem(id: string) {
    setItems(items.filter((i) => i.id !== id));
  }

  function addOption(itemId: string) {
    setItems(
      items.map((i) =>
        i.id === itemId ? { ...i, options: [...i.options, ""] } : i
      )
    );
  }

  function updateOption(itemId: string, optIndex: number, value: string) {
    setItems(
      items.map((i) =>
        i.id === itemId
          ? {
              ...i,
              options: i.options.map((o, idx) => (idx === optIndex ? value : o)),
            }
          : i
      )
    );
  }

  function toggleCorrectOption(itemId: string, optIndex: number) {
    setItems(
      items.map((i) => {
        if (i.id !== itemId) return i;
        const has = i.correctOptions.includes(optIndex);
        return {
          ...i,
          correctOptions: has
            ? i.correctOptions.filter((x) => x !== optIndex)
            : [...i.correctOptions, optIndex],
        };
      })
    );
  }

  function toggleClass(classId: string) {
    setSelectedClasses((prev) =>
      prev.includes(classId)
        ? prev.filter((id) => id !== classId)
        : [...prev, classId]
    );
  }

  async function handleSubmit() {
    setError(null);

    if (!title.trim()) {
      setError("Bitte geben Sie einen Titel ein.");
      return;
    }
    if (!dueDate) {
      setError("Bitte wählen Sie ein Fälligkeitsdatum.");
      return;
    }
    if (items.length === 0) {
      setError("Bitte fügen Sie mindestens eine Aufgabe hinzu.");
      return;
    }
    if (selectedClasses.length === 0) {
      setError("Bitte wählen Sie mindestens eine Klasse aus.");
      return;
    }
    for (const item of items) {
      if (!item.question.trim()) {
        setError("Alle Aufgaben müssen eine Fragestellung haben.");
        return;
      }
      if (item.type === "choice" && item.options.filter((o) => o.trim()).length < 2) {
        setError("Multiple-Choice-Aufgaben brauchen mindestens 2 Optionen.");
        return;
      }
    }

    setSubmitting(true);
    try {
      const result = await createAssignmentAction({
        title: title.trim(),
        description: description.trim(),
        dueDate,
        classIds: selectedClasses,
        items: items.map((i, idx) => ({
          sortOrder: idx,
          type: i.type,
          question: i.question.trim(),
          options: i.type === "choice" ? i.options.filter((o) => o.trim()) : undefined,
          correctOptions: i.type === "choice" ? i.correctOptions : undefined,
        })),
      });

      if (result.error) {
        setError(result.error);
      } else {
        router.push("/lehrer/aufgaben");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Titel & Beschreibung */}
      <Card>
        <CardContent className="pt-6 grid gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="a-title">Titel</Label>
            <Input
              id="a-title"
              placeholder="z. B. Wochenaufgabe Mathematik"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="a-desc">Beschreibung (optional)</Label>
            <textarea
              id="a-desc"
              rows={3}
              placeholder="Hinweise für die Schüler…"
              className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="a-due">Fällig bis</Label>
            <Input
              id="a-due"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Aufgaben-Items */}
      <div>
        <h2 className="text-lg font-semibold text-slate-900 mb-3">
          Aufgaben ({items.length})
        </h2>

        {items.map((item, idx) => (
          <Card key={item.id} className="mb-3">
            <CardContent className="pt-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-slate-500">
                  {idx + 1}. {item.type === "text" ? "Freitext" : "Multiple Choice"}
                </span>
                <button
                  type="button"
                  onClick={() => removeItem(item.id)}
                  className="text-xs text-red-500 hover:text-red-700"
                >
                  Entfernen
                </button>
              </div>

              <div className="grid gap-3">
                <div className="grid gap-1.5">
                  <Label>Fragestellung</Label>
                  <textarea
                    rows={2}
                    placeholder="Aufgabentext eingeben…"
                    className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                    value={item.question}
                    onChange={(e) =>
                      updateItem(item.id, { question: e.target.value })
                    }
                  />
                </div>

                {item.type === "choice" && (
                  <div className="grid gap-2">
                    <Label>Antwortmöglichkeiten</Label>
                    {item.options.map((opt, optIdx) => (
                      <div key={optIdx} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={item.correctOptions.includes(optIdx)}
                          onChange={() => toggleCorrectOption(item.id, optIdx)}
                          title="Als korrekt markieren"
                          className="w-4 h-4 rounded border-slate-300"
                        />
                        <Input
                          placeholder={`Option ${optIdx + 1}`}
                          value={opt}
                          onChange={(e) =>
                            updateOption(item.id, optIdx, e.target.value)
                          }
                        />
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => addOption(item.id)}
                      className="text-sm text-slate-500 hover:text-slate-700 text-left"
                    >
                      + Option hinzufügen
                    </button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}

        <div className="flex gap-2">
          <Button variant="outline" onClick={() => addItem("text")}>
            + Freitext-Aufgabe
          </Button>
          <Button variant="outline" onClick={() => addItem("choice")}>
            + Multiple Choice
          </Button>
        </div>
      </div>

      {/* Klassen-Auswahl */}
      <Card>
        <CardContent className="pt-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-3">
            An Klassen senden
          </h2>
          {classes.length === 0 ? (
            <p className="text-sm text-slate-500">
              Keine Klassen vorhanden. Erstellen Sie zuerst eine Klasse.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {classes.map((cls) => {
                const selected = selectedClasses.includes(cls.id);
                return (
                  <button
                    key={cls.id}
                    type="button"
                    onClick={() => toggleClass(cls.id)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                      selected
                        ? "bg-slate-900 text-white border-slate-900"
                        : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    {cls.name}
                  </button>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}

      <Button
        onClick={handleSubmit}
        disabled={submitting}
        className="w-full"
        size="lg"
      >
        {submitting ? "Wird erstellt…" : "Aufgabe erstellen & versenden"}
      </Button>
    </div>
  );
}
