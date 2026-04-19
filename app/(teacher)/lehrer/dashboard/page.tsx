import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Matheapp \u2014 Lehrkr\u00e4fte-Bereich",
};

export default async function LehrerDashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Profil laden
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("user_id", user!.id)
    .maybeSingle();

  // Klassen zählen
  const { count: classCount } = await supabase
    .from("classes")
    .select("id", { count: "exact", head: true })
    .eq("teacher_id", user!.id);

  // Schüler zählen (über alle Klassen)
  const { data: teacherClasses } = await supabase
    .from("classes")
    .select("id")
    .eq("teacher_id", user!.id);

  const classIds = teacherClasses?.map((c) => c.id) ?? [];
  let studentCount = 0;
  if (classIds.length > 0) {
    const { count } = await supabase
      .from("profiles")
      .select("user_id", { count: "exact", head: true })
      .eq("role", "child")
      .in("class_id", classIds);
    studentCount = count ?? 0;
  }

  // Aufgaben zählen
  const { count: assignmentCount } = await supabase
    .from("assignments")
    .select("id", { count: "exact", head: true })
    .eq("teacher_id", user!.id);

  const firstName = profile?.display_name?.split(" ")[0] ?? "Lehrkraft";

  return (
    <div className="p-8 lg:p-12 max-w-5xl">
      {/* Begrüßung */}
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-slate-900">
          Guten Tag, {firstName}!
        </h1>
        <p className="text-base text-slate-500 mt-1">
          Hier ist Ihre Übersicht für heute.
        </p>
      </div>

      {/* Stat-Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-10">
        {/* Klassen */}
        <div className="stat-card-indigo rounded-2xl p-6 shadow-lg shadow-indigo-500/20 animate-fade-in">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-white/80">Klassen</span>
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.62 48.62 0 0 1 12 20.904a48.62 48.62 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a50.636 50.636 0 0 0-2.658-.813A59.906 59.906 0 0 1 12 3.493a59.903 59.903 0 0 1 10.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0 1 12 13.489a50.702 50.702 0 0 1 7.74-3.342" />
              </svg>
            </div>
          </div>
          <p className="text-4xl font-bold text-white">{classCount ?? 0}</p>
        </div>

        {/* Schüler */}
        <div className="stat-card-cyan rounded-2xl p-6 shadow-lg shadow-cyan-500/20 animate-fade-in animation-delay-1">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-white/80">Schüler</span>
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
              </svg>
            </div>
          </div>
          <p className="text-4xl font-bold text-white">{studentCount}</p>
        </div>

        {/* Aufgaben */}
        <div className="stat-card-emerald rounded-2xl p-6 shadow-lg shadow-emerald-500/20 animate-fade-in animation-delay-2">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-white/80">Aufgaben</span>
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25Z" />
              </svg>
            </div>
          </div>
          <p className="text-4xl font-bold text-white">{assignmentCount ?? 0}</p>
        </div>
      </div>

      {/* Willkommen / Leerer Zustand */}
      {(classCount ?? 0) === 0 && (
        <div className="rounded-2xl bg-gradient-to-br from-indigo-50 to-violet-50 border border-indigo-100 p-8 animate-fade-in animation-delay-3">
          <h2 className="text-xl font-bold text-slate-900 mb-2">
            Willkommen bei Matheapp!
          </h2>
          <p className="text-base text-slate-600 leading-relaxed">
            Erstellen Sie Ihre erste Klasse über das{" "}
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-lg bg-indigo-100 text-indigo-600 font-bold text-xs">+</span>{" "}
            in der Seitenleiste. Danach können Sie Schüler hinzufügen und
            Aufgaben erstellen.
          </p>
        </div>
      )}
    </div>
  );
}
