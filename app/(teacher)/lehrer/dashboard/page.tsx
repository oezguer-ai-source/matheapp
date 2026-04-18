import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { logoutAction } from "@/app/login/actions";
import { fetchClassOverview, fetchOperationAccuracy } from "@/lib/teacher/queries";
import type { OperationAccuracy } from "@/types/teacher-dashboard";
import { isInactive } from "@/lib/utils/relative-date";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ClassTable } from "@/components/teacher/class-table";

export const metadata: Metadata = {
  title: "Matheapp \u2014 Lehrkr\u00e4fte-Bereich",
};

export default async function LehrerDashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/login");
  }

  const userId = user.id;

  // Profil laden (role-Check als Belt-and-Braces, Middleware prueft bereits)
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, role, class_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (!profile || profile.role !== "teacher") {
    redirect("/login");
  }

  // Klassen-Name laden
  let className: string | null = null;
  if (profile.class_id) {
    const { data: classData } = await supabase
      .from("classes")
      .select("name")
      .eq("id", profile.class_id)
      .maybeSingle();
    className = classData?.name ?? null;
  }

  // Schueler-Uebersicht laden
  const students = await fetchClassOverview(supabase);

  // Aktive Schueler zaehlen (letzte 7 Tage)
  const activeCount = students.filter((s) => !isInactive(s.lastActivity)).length;

  // Server Action fuer Operations-Details (erstellt eigenen Supabase-Client)
  async function getOperationAccuracy(childId: string): Promise<OperationAccuracy[]> {
    "use server";
    const supabaseAction = await createClient();
    return fetchOperationAccuracy(supabaseAction, childId);
  }

  return (
    <main className="min-h-dvh bg-white p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-2xl font-semibold text-slate-900">
          Willkommen, {profile.display_name}
        </h1>
        <form action={logoutAction}>
          <Button type="submit" variant="default">
            Abmelden
          </Button>
        </form>
      </div>

      {/* Klassen-Name */}
      {className && (
        <p className="text-lg text-slate-600 mb-6">{className}</p>
      )}

      {students.length === 0 ? (
        /* Leerer Zustand */
        <Card>
          <CardContent>
            <p className="text-base text-slate-700">
              Noch keine Sch&uuml;ler in Ihrer Klasse. Sch&uuml;ler werden
              &uuml;ber den PIN-Login automatisch zugeordnet.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Zusammenfassung */}
          <Card className="mb-6">
            <CardContent>
              <p className="text-base text-slate-700">
                {students.length}{" "}
                {students.length === 1 ? "Sch\u00fcler" : "Sch\u00fcler"} |{" "}
                {activeCount} aktiv in den letzten 7 Tagen
              </p>
            </CardContent>
          </Card>

          {/* Klassentabelle */}
          <ClassTable
            students={students}
            fetchOperationAccuracyAction={getOperationAccuracy}
          />
        </>
      )}
    </main>
  );
}
