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

  // Klassen-Name und Abo-Status laden
  let className: string | null = null;
  let schoolTier: string | null = null;
  if (profile.class_id) {
    const { data: classData } = await supabase
      .from("classes")
      .select("name, school_id")
      .eq("id", profile.class_id)
      .maybeSingle();
    className = classData?.name ?? null;

    if (classData?.school_id) {
      const { data: schoolData } = await supabase
        .from("schools")
        .select("subscription_tier")
        .eq("id", classData.school_id)
        .maybeSingle();
      schoolTier = schoolData?.subscription_tier ?? null;
    }
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

      {/* Klassen-Name + Abo-Badge */}
      {className && (
        <div className="flex items-center gap-3 mb-6">
          <p className="text-lg text-slate-600">{className}</p>
          {schoolTier && (
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              schoolTier === "free"
                ? "bg-slate-100 text-slate-600"
                : "bg-green-100 text-green-700"
            }`}>
              Abo: {schoolTier === "free" ? "Kostenlos" : schoolTier.charAt(0).toUpperCase() + schoolTier.slice(1)}
            </span>
          )}
        </div>
      )}

      {students.length === 0 ? (
        /* Leerer Zustand */
        <Card>
          <CardContent>
            <p className="text-base text-slate-700">
              Noch keine Sch{"\u00fc"}ler in Ihrer Klasse. Sch{"\u00fc"}ler werden
              {"\u00fc"}ber den PIN-Login automatisch zugeordnet.
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
