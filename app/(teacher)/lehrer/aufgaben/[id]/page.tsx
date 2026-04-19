import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { createAdminClient } from "@/lib/supabase/admin";

function formatDuration(seconds: number | null): string {
  if (!seconds) return "--";
  const min = Math.floor(seconds / 60);
  const sec = seconds % 60;
  return min > 0 ? `${min} Min ${sec} Sek` : `${sec} Sek`;
}

export default async function AufgabeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) notFound();

  // Aufgabe laden
  const admin = createAdminClient();
  const { data: assignment } = await admin
    .from("assignments")
    .select("id, title, description, due_date, created_at")
    .eq("id", id)
    .eq("teacher_id", user.id)
    .maybeSingle();

  if (!assignment) notFound();

  // Items laden
  const { data: items } = await admin
    .from("assignment_items")
    .select("id, sort_order, item_type, question, options, correct_options")
    .eq("assignment_id", id)
    .order("sort_order");

  // Zugewiesene Klassen laden
  const { data: assignedClasses } = await admin
    .from("assignment_classes")
    .select("class_id, classes(name)")
    .eq("assignment_id", id);

  // Alle Schüler der zugewiesenen Klassen laden
  const classIds = assignedClasses?.map((ac) => ac.class_id) ?? [];
  let allStudents: { user_id: string; display_name: string; class_id: string | null }[] = [];
  if (classIds.length > 0) {
    const { data: students } = await admin
      .from("profiles")
      .select("user_id, display_name, class_id")
      .eq("role", "child")
      .in("class_id", classIds)
      .order("display_name");
    allStudents = students ?? [];
  }

  // Abgaben laden
  const { data: submissions } = await admin
    .from("assignment_submissions")
    .select("id, student_id, status, started_at, submitted_at, duration_seconds")
    .eq("assignment_id", id);

  const submissionByStudent = new Map(
    (submissions ?? []).map((s) => [s.student_id, s])
  );

  const dueDate = new Date(assignment.due_date);
  const isOverdue = dueDate < new Date();

  return (
    <div className="p-8 max-w-4xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900">
          {assignment.title}
        </h1>
        {assignment.description && (
          <p className="text-base text-slate-600 mt-1">{assignment.description}</p>
        )}
        <div className="flex items-center gap-4 mt-3">
          <span
            className={`text-sm font-medium px-3 py-1 rounded-full ${
              isOverdue
                ? "bg-red-50 text-red-600"
                : "bg-green-50 text-green-600"
            }`}
          >
            Fällig: {dueDate.toLocaleDateString("de-DE")}
          </span>
          <span className="text-sm text-slate-500">
            Klassen:{" "}
            {assignedClasses
              ?.map((ac) => (ac.classes as { name: string })?.name)
              .join(", ")}
          </span>
        </div>
      </div>

      {/* Aufgaben-Items */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-slate-900 mb-3">
          Aufgaben ({items?.length ?? 0})
        </h2>
        <div className="grid gap-2">
          {items?.map((item, idx) => (
            <Card key={item.id}>
              <CardContent className="pt-4 pb-4">
                <p className="text-sm text-slate-500 mb-1">
                  {idx + 1}. {item.item_type === "text" ? "Freitext" : "Multiple Choice"}
                </p>
                <p className="text-sm font-medium text-slate-900">{item.question}</p>
                {item.item_type === "choice" && item.options && (
                  <ul className="mt-2 space-y-1">
                    {(item.options as string[]).map((opt, optIdx) => (
                      <li
                        key={optIdx}
                        className={`text-sm px-2 py-1 rounded ${
                          (item.correct_options as number[])?.includes(optIdx)
                            ? "bg-green-50 text-green-700 font-medium"
                            : "text-slate-600"
                        }`}
                      >
                        {opt}
                        {(item.correct_options as number[])?.includes(optIdx) && " ✓"}
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Schüler-Fortschritt */}
      <div>
        <h2 className="text-lg font-semibold text-slate-900 mb-3">
          Schüler-Fortschritt ({allStudents.length} Schüler)
        </h2>

        {allStudents.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-slate-500">
                Keine Schüler in den zugewiesenen Klassen.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">
                    Schüler
                  </th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">
                    Status
                  </th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">
                    Dauer
                  </th>
                </tr>
              </thead>
              <tbody>
                {allStudents.map((student) => {
                  const sub = submissionByStudent.get(student.user_id);
                  const statusLabel = !sub
                    ? "Nicht begonnen"
                    : sub.status === "submitted"
                      ? "Abgegeben"
                      : "In Bearbeitung";
                  const statusColor = !sub
                    ? "bg-slate-100 text-slate-500"
                    : sub.status === "submitted"
                      ? "bg-green-50 text-green-600"
                      : "bg-amber-50 text-amber-600";

                  return (
                    <tr
                      key={student.user_id}
                      className="border-b border-slate-100 last:border-0"
                    >
                      <td className="px-4 py-3 text-sm font-medium text-slate-900">
                        {student.display_name
                          .split(".")
                          .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
                          .join(" ")}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`text-xs font-medium px-2 py-1 rounded-full ${statusColor}`}
                        >
                          {statusLabel}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">
                        {formatDuration(sub?.duration_seconds ?? null)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
