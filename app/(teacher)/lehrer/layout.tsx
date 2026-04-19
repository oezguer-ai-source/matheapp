import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Sidebar } from "@/components/teacher/sidebar";
import { logoutAction } from "@/app/login/actions";

export default async function LehrerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Lehrer-Profil via Admin-Client (RLS-agnostisch) laden, damit fehlende
  // Policies das Dashboard nicht unsichtbar kaputt machen.
  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("display_name, role")
    .eq("user_id", user.id)
    .maybeSingle();

  // Wenn kein Profil existiert, NICHT zu /login redirecten — das würde mit
  // dem Middleware-Redirect für authentifizierte Nutzer eine Schleife bauen
  // (weiße Seite / ERR_TOO_MANY_REDIRECTS). Stattdessen inline informieren.
  if (!profile || profile.role !== "teacher") {
    return (
      <main className="min-h-dvh grid place-items-center bg-slate-50 p-6">
        <div className="max-w-md bg-white border border-slate-200 rounded-2xl p-8 text-center shadow-sm">
          <h1 className="text-xl font-bold text-slate-900 mb-2">
            Kein Lehrer-Profil
          </h1>
          <p className="text-sm text-slate-600 mb-6">
            Für diesen Account wurde noch kein Lehrer-Profil angelegt. Bitte
            registrieren Sie sich erneut oder kontaktieren Sie den Support.
          </p>
          <div className="flex gap-2 justify-center">
            <Link
              href="/registrieren"
              className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium"
            >
              Registrieren
            </Link>
            <form action={logoutAction}>
              <button
                type="submit"
                className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 text-sm font-medium"
              >
                Abmelden
              </button>
            </form>
          </div>
        </div>
      </main>
    );
  }

  // Klassen des Lehrers laden
  const { data: classes } = await admin
    .from("classes")
    .select("id, name")
    .eq("teacher_id", user.id)
    .order("created_at", { ascending: true });

  return (
    <div className="flex min-h-dvh">
      <Sidebar
        teacherName={profile.display_name}
        classes={classes ?? []}
      />
      <main className="flex-1 bg-slate-50 overflow-auto">
        {children}
      </main>
    </div>
  );
}
